import { describe, it, expect } from 'vitest';
import { epqsBadgeLabel } from '../MapboxDrawView.js';

// Unit tests for the pure epqsBadgeLabel helper (issue #18).
// Precedence: confidence-low > flat-threshold (< 0.5") > numeric default.

describe('epqsBadgeLabel', () => {
  it('returns "Flat ✓" when maxAbsDelta is below the 0.5" threshold', () => {
    expect(epqsBadgeLabel({ maxAbsDelta: 0.2, signedDelta: 0.2, confidence: 'high' }))
      .toBe('Flat \u2713');
  });

  it('returns "Flat ✓" at exactly 0.0 (sub-threshold edge)', () => {
    expect(epqsBadgeLabel({ maxAbsDelta: 0.0, signedDelta: 0.0, confidence: 'high' }))
      .toBe('Flat \u2713');
  });

  it('returns up-arrow + delta when maxAbsDelta >= 0.5 and signedDelta is positive', () => {
    expect(epqsBadgeLabel({ maxAbsDelta: 2.3, signedDelta: 2.3, confidence: 'high' }))
      .toBe('\u2197 2.3"');
  });

  it('returns down-arrow + delta when maxAbsDelta >= 0.5 and signedDelta is negative', () => {
    expect(epqsBadgeLabel({ maxAbsDelta: 2.3, signedDelta: -2.3, confidence: 'high' }))
      .toBe('\u2198 2.3"');
  });

  it('returns "— unknown —" (em dashes) when confidence is "low", regardless of maxAbsDelta', () => {
    expect(epqsBadgeLabel({ maxAbsDelta: 2.3, signedDelta: 2.3, confidence: 'low' }))
      .toBe('\u2014 unknown \u2014');
  });

  it('returns "— unknown —" when confidence is "low" AND maxAbsDelta is sub-threshold (low wins over flat)', () => {
    expect(epqsBadgeLabel({ maxAbsDelta: 0.2, signedDelta: 0.1, confidence: 'low' }))
      .toBe('\u2014 unknown \u2014');
  });

  it('returns numeric label at exactly 0.5" boundary (not flat)', () => {
    expect(epqsBadgeLabel({ maxAbsDelta: 0.5, signedDelta: 0.5, confidence: 'high' }))
      .toBe('\u2197 0.5"');
  });
});
