import { describe, it, expect } from 'vitest';
import { calculateZoneQuote } from '../priceCalculator.js';

// Shared baseline: 60 linear feet residential Horizon (UAF-200) at 48" high.
// 60 / 6 panels = 10 panels, so totalPosts = 11.
function baseConfig(overrides) {
  return Object.assign({
    grade: 'residential',
    style: 'horizon',
    height: 48,
    color: 'textured-black',
    linearFeet: 60,
    ends: 2,
    corners: 0,
    gates: [],
  }, overrides || {});
}

function findRackLine(items) {
  return items.find(function (it) { return /Double-Punch/i.test(it.label); });
}

describe('calculateZoneQuote — racking surcharge', () => {
  it('Test A: rackable tier with slopedPostCount=11 prices rack line at qty=11 @ 4.75', () => {
    var config = baseConfig({ rackingTier: 'rackable', slopedPostCount: 11 });
    var result = calculateZoneQuote(config);
    var rack = findRackLine(result.items);
    expect(rack).toBeTruthy();
    expect(rack.qty).toBe(11);
    expect(rack.unitPrice).toBe(4.75);
    expect(rack.total).toBeCloseTo(11 * 4.75, 4);
  });

  it('Test B: respects explicit slopedPostCount=5 even though totalPosts=11', () => {
    var config = baseConfig({ rackingTier: 'rackable', slopedPostCount: 5 });
    var result = calculateZoneQuote(config);
    var rack = findRackLine(result.items);
    expect(rack).toBeTruthy();
    expect(rack.qty).toBe(5);
    expect(rack.total).toBeCloseTo(5 * 4.75, 4);
  });

  it('Test C: slopedPostCount=0 emits either no rack line or a zero-qty rack line (?? not ||)', () => {
    var config = baseConfig({ rackingTier: 'rackable', slopedPostCount: 0 });
    var result = calculateZoneQuote(config);
    var rack = findRackLine(result.items);
    // Either no rack line at all, or an explicit zero — NOT a fallback to totalPosts (11).
    if (rack) {
      expect(rack.qty).toBe(0);
      expect(rack.total).toBe(0);
    } else {
      expect(rack).toBeUndefined();
    }
  });

  it('Test D: missing slopedPostCount falls back to totalPosts (manual-entry callers)', () => {
    var config = baseConfig({ rackingTier: 'rackable' }); // no slopedPostCount field
    var result = calculateZoneQuote(config);
    var rack = findRackLine(result.items);
    expect(rack).toBeTruthy();
    expect(rack.qty).toBe(11); // fallback to totalPosts = panelCount + 1 = 11
  });

  it('Test E: standard tier never emits a rack line, regardless of slopedPostCount', () => {
    var config = baseConfig({ rackingTier: 'standard', slopedPostCount: 11 });
    var result = calculateZoneQuote(config);
    var rack = findRackLine(result.items);
    expect(rack).toBeUndefined();
  });

  it('clamps slopedPostCount to totalPosts', function() {
    var config = {
      grade: 'residential', style: 'uaf_200', height: 48, linearFeet: 60,
      rackingTier: 'rackable',
      slopedPostCount: 100, // absurdly high
      ends: 2, corners: 0, gates: [],
    };
    var r = calculateZoneQuote(config);
    var rack = r.items.find(function(i) { return /double-punch|racking/i.test(i.label); });
    // totalPosts = 11 (10 panels + 1); rack qty must not exceed that
    expect(rack.qty).toBe(11);
  });

  it('pads footage by 5% when source is auto', () => {
    const config = {
      grade: 'residential', style: 'horizon', height: 48,
      linearFeet: 100,
      _source: 'auto',
      rackingTier: 'standard', ends: 2, corners: 0, gates: [],
    };
    const r = calculateZoneQuote(config);
    const panelLine = r.items.find(i => /panels/i.test(i.label));
    // 105 ft / 6 ft = 17.5 → ceil = 18 panels
    expect(panelLine.qty).toBe(18);
  });

  it('does NOT pad footage when source is manual', () => {
    const config = {
      grade: 'residential', style: 'horizon', height: 48,
      linearFeet: 100,
      _source: 'manual',
      rackingTier: 'standard', ends: 2, corners: 0, gates: [],
    };
    const r = calculateZoneQuote(config);
    const panelLine = r.items.find(i => /panels/i.test(i.label));
    // 100 ft / 6 ft = 16.67 → ceil = 17 panels
    expect(panelLine.qty).toBe(17);
  });
});
