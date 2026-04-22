import { describe, it, expect } from 'vitest';
import { simplifyRDP, angleBetween, splitPolygonIntoSides, compassBearing, densifyPath, computeSampleStepCount, aggregateClassificationsForUserSegments, computeSlopedPostCount, classifyPostsPerVertex, computeLinePostPositions } from '../geometryUtils.js';

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

describe('classifyPostsPerVertex (Pass 4 Task 5)', () => {
  it('returns empty array for zero or one point', () => {
    expect(classifyPostsPerVertex([], 15)).toEqual([]);
    expect(classifyPostsPerVertex([[-83.9, 42.6]], 15)).toEqual([]);
  });

  it('classifies a 2-point straight line as two end posts', () => {
    var r = classifyPostsPerVertex([[-83.9, 42.6], [-83.9, 42.601]], 15);
    expect(r.length).toBe(2);
    expect(r[0].type).toBe('end');
    expect(r[1].type).toBe('end');
    expect(r[0].index).toBe(0);
    expect(r[1].index).toBe(1);
  });

  it('classifies a sharp 90-degree elbow as end + corner + end', () => {
    // L shape: [0,0] -> [0, 0.001] -> [0.001, 0.001]
    var r = classifyPostsPerVertex([[0, 0], [0, 0.001], [0.001, 0.001]], 15);
    expect(r.length).toBe(3);
    expect(r[0].type).toBe('end');
    expect(r[1].type).toBe('corner');
    expect(r[2].type).toBe('end');
  });

  it('classifies a gentle bend under 15 degrees as line post, not corner', () => {
    // Two nearly-colinear segments with only ~3 degrees of deflection.
    // The helper should treat the interior vertex as a line post (panels
    // flex through) and only the endpoints as structural posts.
    var r = classifyPostsPerVertex([[0, 0], [0, 0.001], [0.00005, 0.002]], 15);
    expect(r.length).toBe(3);
    expect(r[0].type).toBe('end');
    expect(r[1].type).toBe('line'); // under threshold
    expect(r[2].type).toBe('end');
  });

  it('classifies a closed polygon (first === last) with no end posts', () => {
    // Square: 5 points, first === last. The wrap-around vertex is dropped
    // so we emit exactly 4 vertices, all corners.
    var square = [[-83.9, 42.6], [-83.89, 42.6], [-83.89, 42.61], [-83.9, 42.61], [-83.9, 42.6]];
    var r = classifyPostsPerVertex(square, 15);
    expect(r.length).toBe(4);
    r.forEach(function(p) { expect(p.type).toBe('corner'); });
  });

  it('respects a custom minCornerDeg threshold', () => {
    // ~3 degree bend: counts as corner at threshold 1, line at threshold 15.
    var pts = [[0, 0], [0, 0.001], [0.00005, 0.002]];
    var strict = classifyPostsPerVertex(pts, 1);
    expect(strict[1].type).toBe('corner');
    var loose = classifyPostsPerVertex(pts, 15);
    expect(loose[1].type).toBe('line');
  });
});

describe('computeLinePostPositions (Pass 4 Task 5)', () => {
  it('returns empty array for zero or one point', () => {
    expect(computeLinePostPositions([], 6)).toEqual([]);
    expect(computeLinePostPositions([[-83.9, 42.6]], 6)).toEqual([]);
  });

  it('returns empty array for a sub-panel-length segment', () => {
    // 2 points ~4 ft apart along same latitude at 42.5 N: 0.0000144 deg ≈ 4 ft.
    // Shorter than one panel -> no line posts between the two end posts.
    var r = computeLinePostPositions([[0, 42.5], [0.0000144, 42.5]], 6);
    expect(r).toEqual([]);
  });

  it('interpolates line posts along a straight ~27 ft run at 6 ft spacing', () => {
    // ~27 ft along same latitude at 42.5 N. 27 / 6 = 4.5, so we get line
    // posts at 6, 12, 18, 24 ft marks (4 interior posts). Using a length
    // that is NOT a clean multiple of the panel length avoids floating-
    // point edge cases at the endpoint.
    var lenFt = 27;
    var FEET_PER_DEG_LAT = 364567.2;
    var dLng = lenFt / FEET_PER_DEG_LAT; // at 42.5 lat, lng scale ~ cos(42.5)
    // Use along-latitude so dLng is scaled by cos(42.5).
    dLng = lenFt / (FEET_PER_DEG_LAT * Math.cos(42.5 * Math.PI / 180));
    var a = [0, 42.5];
    var b = [dLng, 42.5];
    var r = computeLinePostPositions([a, b], 6);
    expect(r.length).toBe(4);
    r.forEach(function(lp) { expect(lp.segmentIndex).toBe(0); });
    expect(r.map(function(lp) { return lp.index; })).toEqual([1, 2, 3, 4]);
    // First post sits at 6 ft of a ~27 ft run, so ~2/9 of the way from a
    // to b. Allow a small tolerance for the flat-earth vs. haversine
    // rounding inherent to lat/lng interpolation at residential scale.
    expect(r[0].lng).toBeCloseTo(a[0] + (b[0] - a[0]) * (6 / 27), 5);
    expect(r[0].lat).toBeCloseTo(a[1], 8);
  });

  it('skips the downstream structural-post coincidence on an exact multiple run', () => {
    // A run of exactly panelLength * N produces N-1 interior line posts,
    // because the N-th panel break coincides with the end structural post.
    var lenFt = 30;
    var FEET_PER_DEG_LAT = 364567.2;
    var dLng = lenFt / (FEET_PER_DEG_LAT * Math.cos(42.5 * Math.PI / 180));
    var r = computeLinePostPositions([[0, 42.5], [dLng, 42.5]], 6);
    expect(r.length).toBe(4);
  });

  it('assigns segmentIndex 0, 1, ... across a multi-segment line', () => {
    // Two ~30 ft segments in an L. Only caring about segmentIndex tagging.
    var FEET_PER_DEG_LAT = 364567.2;
    var dLng = 30 / (FEET_PER_DEG_LAT * Math.cos(42.5 * Math.PI / 180));
    var dLat = 30 / FEET_PER_DEG_LAT;
    var pts = [
      [0, 42.5],
      [dLng, 42.5],
      [dLng, 42.5 + dLat],
    ];
    var r = computeLinePostPositions(pts, 6);
    var seg0 = r.filter(function(lp) { return lp.segmentIndex === 0; });
    var seg1 = r.filter(function(lp) { return lp.segmentIndex === 1; });
    expect(seg0.length).toBeGreaterThan(0);
    expect(seg1.length).toBeGreaterThan(0);
  });

  it('respects a custom panelLengthFt (industrial 8 ft panels)', () => {
    // ~40 ft run with 8 ft panels: breaks at 8, 16, 24, 32 (the 40 mark
    // is the end post and is skipped). 4 interior line posts.
    var lenFt = 40;
    var FEET_PER_DEG_LAT = 364567.2;
    var dLng = lenFt / (FEET_PER_DEG_LAT * Math.cos(42.5 * Math.PI / 180));
    var r = computeLinePostPositions([[0, 42.5], [dLng, 42.5]], 8);
    expect(r.length).toBe(4);
  });
});
