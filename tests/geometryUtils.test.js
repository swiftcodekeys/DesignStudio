import { describe, it, expect } from 'vitest';
import { simplifyRDP, angleBetween, splitPolygonIntoSides, compassBearing, densifyPath, computeSampleStepCount, aggregateClassificationsForUserSegments, computeSlopedPostCount } from '../geometryUtils.js';

describe('simplifyRDP', () => {
  it('passes through points below threshold', () => {
    const pts = [[0,0],[1,0],[2,0]];
    expect(simplifyRDP(pts, 0.1)).toEqual([[0,0],[2,0]]);
  });

  it('preserves distinct corners', () => {
    const pts = [[0,0],[1,0],[1,1],[0,1],[0,0]];
    const r = simplifyRDP(pts, 0.0001);
    expect(r.length).toBe(5);
  });
});

describe('angleBetween', () => {
  it('returns 90 for right angle', () => {
    expect(Math.abs(angleBetween([0,0],[1,0],[1,1]) - 90)).toBeLessThan(1);
  });
  it('returns 0 for colinear points', () => {
    expect(Math.abs(angleBetween([0,0],[1,0],[2,0]) - 0)).toBeLessThan(1);
  });
});

describe('splitPolygonIntoSides', () => {
  it('splits a square into 4 sides', () => {
    const poly = [[-83.9,42.6],[-83.89,42.6],[-83.89,42.61],[-83.9,42.61],[-83.9,42.6]];
    const sides = splitPolygonIntoSides(poly);
    expect(sides.length).toBe(4);
    expect(sides[0].start).toEqual([-83.9,42.6]);
    expect(sides[0].compassLabel).toBeTruthy();
  });
});

describe('compassBearing', () => {
  it('returns North for due north', () => {
    expect(compassBearing([0,0],[0,1])).toBe('North');
  });
  it('returns East for due east', () => {
    expect(compassBearing([0,0],[1,0])).toBe('East');
  });
});

describe('densifyPath', () => {
  it('inserts intermediate points', () => {
    const r = densifyPath([[0,0],[0.001,0]], 6);
    expect(r.length).toBeGreaterThan(2);
  });
});

describe('computeSampleStepCount', () => {
  it('returns at least 1 step for any segment', () => {
    expect(computeSampleStepCount([0,0], [0,0], 6)).toBe(1);
    expect(computeSampleStepCount([0,0], [0.0000001,0], 6)).toBe(1);
  });
  it('returns proportionally more steps for longer segments', () => {
    var short = computeSampleStepCount([0,42.5], [0.0001,42.5], 6);
    var long = computeSampleStepCount([0,42.5], [0.001,42.5], 6);
    expect(long).toBeGreaterThan(short);
  });
});

describe('aggregateClassificationsForUserSegments', () => {
  it('maps per-sample classifications to per-user-segment summaries', () => {
    // Two user-segments: short (~6ft) and long (~30ft) along same latitude
    var userSegments = [
      { start: [0, 42.5], end: [0.0000160, 42.5] },        // ~4.4ft → 1 step
      { start: [0.0000160, 42.5], end: [0.0001280, 42.5] } // ~30ft → 5 steps
    ];
    // 6 total samples — first belongs to user-seg 0, last 5 belong to user-seg 1
    var classifications = [
      { classification: 'flat',    deltaInches: 1 },
      { classification: 'sloped',  deltaInches: 7 },
      { classification: 'steep',   deltaInches: 22 },
      { classification: 'flat',    deltaInches: 0 },
      { classification: 'flat',    deltaInches: 1 },
      { classification: 'sloped',  deltaInches: 8 }
    ];
    var result = aggregateClassificationsForUserSegments(userSegments, classifications, 6);
    expect(result.length).toBe(2);
    // user-seg 0 gets only sample[0] = flat
    expect(result[0].classification).toBe('flat');
    // user-seg 1 gets samples [1..5] — worst is 'steep' (sample[2])
    expect(result[1].classification).toBe('steep');
    expect(result[1].maxAbsDelta).toBeCloseTo(22);
  });

  it('returns "flat" with zero delta when classifications are empty/unavailable for a segment', () => {
    var userSegments = [{ start: [0, 42.5], end: [0.0001, 42.5] }];
    var result = aggregateClassificationsForUserSegments(userSegments, [], 6);
    expect(result.length).toBe(1);
    expect(result[0].classification).toBe('flat');
    expect(result[0].maxAbsDelta).toBe(0);
  });
});

describe('computeSlopedPostCount', () => {
  it('returns 0 for empty segments', () => {
    expect(computeSlopedPostCount([], 6)).toBe(0);
  });

  it('returns 0 when all segments are standard', () => {
    var segs = [
      { lengthFeet: 60, rackingTier: 'standard' },
      { lengthFeet: 30, rackingTier: 'standard' },
    ];
    expect(computeSlopedPostCount(segs, 6)).toBe(0);
  });

  it('counts panelCount + 1 posts for a single rackable segment', () => {
    var segs = [{ lengthFeet: 60, rackingTier: 'rackable' }];
    // 60 / 6 = 10 panels -> 11 posts
    expect(computeSlopedPostCount(segs, 6)).toBe(11);
  });

  it('counts sloped posts on middle-only-rackable run with shared boundaries', () => {
    // Three 60ft segments: middle is rackable, neighbors are standard.
    // Middle has 11 posts (10 panels + 1); both of its endpoints are shared with
    // standard neighbors, but the either-adjacent rule keeps those boundary
    // posts "sloped" because middle is sloped.
    var segs = [
      { lengthFeet: 60, rackingTier: 'standard' },
      { lengthFeet: 60, rackingTier: 'rackable' },
      { lengthFeet: 60, rackingTier: 'standard' },
    ];
    expect(computeSlopedPostCount(segs, 6)).toBe(11);
  });

  it('does not double-count the shared boundary post when both segments are sloped', () => {
    // Two 60ft segments both rackable: 11 + 11 - 1 (shared) = 21.
    var segs = [
      { lengthFeet: 60, rackingTier: 'rackable' },
      { lengthFeet: 60, rackingTier: 'rackable' },
    ];
    expect(computeSlopedPostCount(segs, 6)).toBe(21);
  });

  it('treats heavy-rackable the same as rackable (both are sloped)', () => {
    var segs = [
      { lengthFeet: 60, rackingTier: 'heavy-rackable' },
      { lengthFeet: 60, rackingTier: 'rackable' },
    ];
    expect(computeSlopedPostCount(segs, 6)).toBe(21);
  });

  it('treats stair-step tier as not-sloped (same as standard)', () => {
    var segs = [
      { lengthFeet: 60, rackingTier: 'stair-step' },
      { lengthFeet: 60, rackingTier: 'stair-step' },
    ];
    expect(computeSlopedPostCount(segs, 6)).toBe(0);
  });

  it('never exceeds totalPosts for fully-sloped runs', () => {
    // Three 60ft segments all rackable: 3 * 11 - 2 shared = 31.
    var segs = [
      { lengthFeet: 60, rackingTier: 'rackable' },
      { lengthFeet: 60, rackingTier: 'rackable' },
      { lengthFeet: 60, rackingTier: 'rackable' },
    ];
    var totalLf = segs.reduce(function (a, s) { return a + s.lengthFeet; }, 0);
    var totalPosts = Math.ceil(totalLf / 6) + 1;
    var sloped = computeSlopedPostCount(segs, 6);
    expect(sloped).toBe(31);
    expect(sloped).toBeLessThanOrEqual(totalPosts);
  });
});
