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

  it('applies exactly one 5% pad on auto source (regression: previously double-padded)', function() {
    // Regression guard for the double-pad bug fixed by removing the pre-pad
    // in MapboxDrawView.buildDrawToolData(). Previously buildDrawToolData
    // emitted already-padded 105ft for a 100ft draw, then priceCalculator
    // padded again to ceil(105*1.05)=111ft, yielding 19 panels instead of 18.
    // This test locks in the contract: config.linearFeet is RAW, and the
    // pricing boundary is the single place the pad is applied.
    var config = {
      grade: 'residential', style: 'horizon', height: 48,
      linearFeet: 100,
      _source: 'auto',
      rackingTier: 'standard', ends: 2, corners: 0, gates: [],
    };
    var r = calculateZoneQuote(config);
    var panelLine = r.items.find(function(i) { return /panels/i.test(i.label); });
    // Intended behavior: 100 * 1.05 = 105; ceil(105/6) = 18 panels.
    // Regression check: previously buildDrawToolData emitted already-padded 105,
    // then priceCalculator padded again to 111, giving 19 panels.
    expect(panelLine.qty).toBe(18);
    expect(panelLine.qty).not.toBe(19);
  });

  it('adds flange cover line item when flangeCovers is true', function() {
    var config = baseConfig({
      flangeCovers: true,
      ends: 2,
      corners: 1,
      gates: [{ type: 'walk', widthInches: 48 }],
    });
    var r = calculateZoneQuote(config);
    var line = r.items.find(function(i) { return /Flange Covers/i.test(i.label); });
    expect(line).toBeTruthy();
    expect(line.total).toBeCloseTo(line.unitPrice * line.qty, 4);
  });
});

describe('calculateZoneQuote — accent/scroll pricing (ACCENTS_PER_PANEL=2)', () => {
  it('scrolls on 60ft fence = 10 panels × 2 = 20 scrolls at $79.25 each', function() {
    var r = calculateZoneQuote(baseConfig({ scrolls: true }));
    var scrollLine = r.items.find(function(i) { return /scroll/i.test(i.label); });
    expect(scrollLine).toBeTruthy();
    expect(scrollLine.qty).toBe(20);
    expect(scrollLine.unitPrice).toBe(79.25);
    expect(scrollLine.total).toBeCloseTo(20 * 79.25, 1);
  });

  it('scrolls total is NOT $49k+ (regression: was ACCENTS_PER_PANEL=16)', function() {
    var r = calculateZoneQuote(baseConfig({ linearFeet: 221, scrolls: true }));
    var scrollLine = r.items.find(function(i) { return /scroll/i.test(i.label); });
    expect(scrollLine.total).toBeLessThan(10000); // was $49,452 with ACCENTS_PER_PANEL=16
  });

  it('butterflies: qty = panelCount × 2', function() {
    var r = calculateZoneQuote(baseConfig({ butterflies: true }));
    var line = r.items.find(function(i) { return /butter/i.test(i.label); });
    expect(line).toBeTruthy();
    expect(line.qty).toBe(20); // 10 panels × 2
  });

  it('no accents = no accent line items', function() {
    var r = calculateZoneQuote(baseConfig());
    var scrollLine = r.items.find(function(i) { return /scroll/i.test(i.label); });
    expect(scrollLine).toBeFalsy();
  });
});

describe('calculateZoneQuote — gate post pricing', () => {
  it('1 walk gate adds 2 gate posts', function() {
    var r = calculateZoneQuote(baseConfig({
      gates: [{ type: 'walk', widthInches: 48, top: 'flat', swing: 'left', hinge: 'standard', latch: 'lokklatch' }],
    }));
    var gatePosts = r.items.find(function(i) { return /gate post/i.test(i.label); });
    expect(gatePosts).toBeTruthy();
    expect(gatePosts.qty).toBe(2);
  });

  it('2 gates = 4 gate posts', function() {
    var gate = { type: 'walk', widthInches: 48, top: 'flat', swing: 'left', hinge: 'standard', latch: 'lokklatch' };
    var r = calculateZoneQuote(baseConfig({ gates: [gate, gate] }));
    var gatePosts = r.items.find(function(i) { return /gate post/i.test(i.label); });
    expect(gatePosts.qty).toBe(4);
  });

  it('subtotal increases with gates vs no gates', function() {
    var base = calculateZoneQuote(baseConfig());
    var withGate = calculateZoneQuote(baseConfig({
      gates: [{ type: 'walk', widthInches: 48, top: 'flat', swing: 'left', hinge: 'standard', latch: 'lokklatch' }],
    }));
    expect(withGate.subtotal).toBeGreaterThan(base.subtotal);
  });
});

describe('calculateZoneQuote — style combos (no crash)', () => {
  // haven tops out at 60"; all others go to 72"
  var COMBOS = [
    ['horizon', 48], ['horizon', 60], ['horizon', 72],
    ['haven', 48], ['haven', 60],
    ['charleston', 48], ['charleston', 60], ['charleston', 72],
    ['vanguard', 48], ['vanguard', 60],
    ['savannah', 48], ['savannah', 60],
  ];
  COMBOS.forEach(function(combo) {
    var style = combo[0], height = combo[1];
    it('style=' + style + ' height=' + height + ' returns positive subtotal', function() {
      var r = calculateZoneQuote(baseConfig({ style: style, height: height }));
      expect(r.subtotal).toBeGreaterThan(0);
      expect(isNaN(r.subtotal)).toBe(false);
    });
  });
});
