import { describe, it, expect } from 'vitest';
import { computeFinalTier, allSegmentsConfirmed, computeSegmentPostCounts } from '../SegmentWizardCards.js';

describe('computeFinalTier', () => {
  it('returns userTierOverride when set', () => {
    expect(computeFinalTier('rackable', 'heavy')).toBe('heavy');
  });
  it('returns recommendedTier when override is null', () => {
    expect(computeFinalTier('rackable', null)).toBe('rackable');
  });
  it('returns unknown when both null', () => {
    expect(computeFinalTier(null, null)).toBe('unknown');
  });
});

describe('allSegmentsConfirmed', () => {
  it('returns true when all segments have userTierConfirmed=true', () => {
    var segs = [{ userTierConfirmed: true }, { userTierConfirmed: true }];
    expect(allSegmentsConfirmed(segs)).toBe(true);
  });
  it('returns false when any segment not confirmed', () => {
    var segs = [{ userTierConfirmed: true }, { userTierConfirmed: false }];
    expect(allSegmentsConfirmed(segs)).toBe(false);
  });
  it('returns false for empty array', () => {
    expect(allSegmentsConfirmed([])).toBe(false);
  });
});

describe('computeSegmentPostCounts', () => {
  it('counts corner posts from vertex classification', () => {
    var pts = [[-83.1, 42.4], [-83.05, 42.4], [-83.0, 42.45]];
    var counts = computeSegmentPostCounts(pts, 6);
    expect(counts.corners).toBe(1);
    expect(counts.ends).toBe(2);
  });
  it('returns an object with linePosts key', () => {
    var pts = [[-83.1, 42.4], [-83.0997, 42.4]];
    var counts = computeSegmentPostCounts(pts, 6);
    expect(typeof counts.linePosts).toBe('number');
  });
});
