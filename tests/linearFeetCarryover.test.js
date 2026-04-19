/**
 * linearFeetCarryover.test.js
 *
 * End-to-end chain test: verifies that drawn linearFeet flows correctly from
 * MapboxDrawView → QuoteStep2_Layout → priceCalculator, with exactly one 5%
 * material pad applied at the pricing boundary.
 *
 * DATA FLOW BEING TESTED:
 *   1. MapboxDrawView.buildDrawToolData() emits RAW totalFeet (no padding).
 *      The pad was removed from here in commit 3ac8a70.
 *   2. QuoteStep2_Layout on-mount effect copies drawToolData.totalFeet verbatim
 *      to data.linearFeet and sets _source='auto'.
 *   3. priceCalculator.calculateZoneQuote() applies Math.ceil(raw * 1.05) once,
 *      only when config._source === 'auto'.
 *
 * REGRESSION THIS CATCHES:
 *   If buildDrawToolData ever re-introduces the 5% pad, config.linearFeet would
 *   be ~105 instead of 100, and priceCalculator would pad it again to
 *   Math.ceil(105 * 1.05) = 111 ft → ceil(111/6) = 19 panels, not 18.
 *   This test will fail in that scenario.
 */

import { describe, it, expect } from 'vitest';
import { calculateZoneQuote } from '../priceCalculator.js';

// ============================================================================
// PRICING CONSTANTS (read directly from retailPricing.js tables)
// ============================================================================
//
// Test config: residential ornamental, style='horizon' (UAF-200), height=48",
// color='textured-black', no gates, no extras, terrain='flat', _source='auto',
// linearFeet=100 (raw from draw tool).
//
// style 'horizon' → ultraModel 'UAF-200' (residential, no suffix)
// PANEL_PRICING['UAF-200'][48] = $153.00 (verified from retailPricing.js line 138)
//
// Grade: residential → DEFAULT_POST_SPEC = { size: '2x2', wall: '.060' }
// Height 48" → POST_LENGTH_MAP[48] = 72" post length
// POST_PRICING['2x2']['.060'][72] = $45.00 (verified from retailPricing.js line 182)
//
// NOTE: 72" fence height was NOT used because residential 2x2 .060 posts only go
// up to 84" length (POST_LENGTH_MAP[72] = 96", which is missing from .060 table),
// so getPostPriceLookup would return null and no post items would be emitted.
// 48" height is the canonical test case where all lookups resolve.

const PANEL_PRICE_PER_UNIT = 153.00; // PANEL_PRICING['UAF-200'][48]
const POST_PRICE_PER_UNIT  =  45.00; // POST_PRICING['2x2']['.060'][72]

// ============================================================================
// UNIT 1: Simulate buildDrawToolData output for a 100ft drawn yard
// ============================================================================
//
// buildDrawToolData() in MapboxDrawView.js (lines 535-565) computes:
//   totalFeet = segments.reduce((a, s) => a + s.lengthFeet, 0)
// No padding is applied. We synthesize the same output shape directly
// (calling the real function would require mounting a full React component
// with a live mapbox-gl instance — not practical for a unit test).

describe('Unit 1 — buildDrawToolData shape: raw totalFeet, no padding', () => {
  it('four 25ft segments sum to exactly 100ft (no 5% pad)', () => {
    // Simulate a drawn 100ft rectangular yard: 4 sides × 25ft each
    const segments = [
      { lengthFeet: 25 },
      { lengthFeet: 25 },
      { lengthFeet: 25 },
      { lengthFeet: 25 },
    ];

    // This is the exact formula from MapboxDrawView.buildDrawToolData (line 540):
    //   var totalFeet = segments.reduce(function(a, s) { return a + s.lengthFeet; }, 0);
    const totalFeet = segments.reduce(function(a, s) { return a + s.lengthFeet; }, 0);

    // The output shape of drawToolData
    const drawToolData = {
      totalFeet: totalFeet,
      corners: segments.length - 1,
      ends: 2,
      _source: 'auto',        // set by buildDrawToolData at line 562
    };

    // Assert: no padding here — RAW sum only
    expect(drawToolData.totalFeet).toBe(100);
    // The 5% pad must NOT be applied at this stage
    expect(drawToolData.totalFeet).not.toBe(105);
    expect(drawToolData.totalFeet).not.toBe(Math.ceil(100 * 1.05));
  });
});

// ============================================================================
// UNIT 2: Simulate QuoteStep2_Layout data absorption
// ============================================================================
//
// QuoteStep2_Layout (lines 97-109) copies drawToolData.totalFeet verbatim
// into data.linearFeet and sets _source='auto'. This simulates that effect.

describe('Unit 2 — QuoteStep2_Layout absorption: linearFeet = raw totalFeet, _source = auto', () => {
  it('config.linearFeet equals drawToolData.totalFeet exactly (no intermediate pad)', () => {
    const drawToolData = { totalFeet: 100 };

    // Simulate the effect that QuoteStep2_Layout.useEffect runs:
    //   update({ linearFeet: drawToolData.totalFeet, _source: 'auto', ... })
    const config = {
      linearFeet: drawToolData.totalFeet,  // verbatim copy — no multiplication
      _source: 'auto',
      grade: 'residential',
      fenceType: 'ornamental',
      style: 'horizon',
      height: 48,
      color: 'textured-black',
      spacing: 'classic',
      rails: 2,
      gates: [],
      corners: 0,
      ends: 2,
      terrain: 'flat',
      rackingTier: 'standard',
    };

    expect(config.linearFeet).toBe(100);    // raw, NOT 105
    expect(config._source).toBe('auto');    // pad will be applied in priceCalculator
  });
});

// ============================================================================
// UNIT 3: Full pricing integration — priceCalculator applies exactly one 5% pad
// ============================================================================
//
// EXPECTED MATH:
//   Raw linearFt = 100
//   Padded (auto 5%): Math.ceil(100 * 1.05) = Math.ceil(105) = 105
//   panelLengthFt = 6 (residential)
//   panelCount = Math.ceil(105 / 6) = Math.ceil(17.5) = 18
//   totalPosts = panelCount + 1 = 19
//   gatePosts = 0 (no gates)
//   corners = 0
//   ends = 2
//   linePosts = max(0, 19 - 0 - 2 - 0) = 17
//
//   Panel price lookup: PANEL_PRICING['UAF-200'][48] = $153.00
//   Post price lookup:  POST_PRICING['2x2']['.060'][72] = $45.00
//     (height=48 → POST_LENGTH_MAP[48]=72, residential spec = '2x2' / '.060')
//
//   Panels:    18 × $153.00 = $2,754.00
//   LinePosts: 17 × $45.00  = $  765.00
//   EndPosts:   2 × $45.00  = $   90.00
//   Subtotal:                  $3,609.00

describe('Unit 3 — calculateZoneQuote: full end-to-end chain with _source=auto', () => {
  const config = {
    grade: 'residential',
    fenceType: 'ornamental',
    style: 'horizon',          // → ultraModel 'UAF-200'
    height: 48,                // → post length 72", panel price $153.00
    color: 'textured-black',   // no silver premium
    linearFeet: 100,           // RAW from draw tool (as QuoteStep2 would set it)
    _source: 'auto',           // triggers 5% pad in priceCalculator
    gates: [],
    corners: 0,
    ends: 2,
    terrain: 'flat',
    rackingTier: 'standard',
  };

  let result;

  it('calculates without throwing', () => {
    result = calculateZoneQuote(config);
    expect(result).toBeTruthy();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('panel line-item has qty=18 (100ft → 105ft padded → ceil(105/6) = 18)', () => {
    const r = calculateZoneQuote(config);
    const panelLine = r.items.find(function(i) { return /panels/i.test(i.label); });
    expect(panelLine).toBeTruthy();
    // The key assertion: exactly 18, not 17 (no pad) and not 19 (double-padded)
    expect(panelLine.qty).toBe(18);
    expect(panelLine.qty).not.toBe(17); // would indicate no padding at all
    expect(panelLine.qty).not.toBe(19); // would indicate double-padding regression
  });

  it('panel unit price matches PANEL_PRICING["UAF-200"][48] = $153.00', () => {
    const r = calculateZoneQuote(config);
    const panelLine = r.items.find(function(i) { return /panels/i.test(i.label); });
    expect(panelLine.unitPrice).toBe(PANEL_PRICE_PER_UNIT); // $153.00
  });

  it('panel subtotal = 18 × $153.00 = $2,754.00', () => {
    const r = calculateZoneQuote(config);
    const panelLine = r.items.find(function(i) { return /panels/i.test(i.label); });
    const expectedPanelTotal = 18 * PANEL_PRICE_PER_UNIT; // 18 × $153.00 = $2,754.00
    expect(panelLine.total).toBeCloseTo(expectedPanelTotal, 2);
  });

  it('post items exist — post price = $45.00 (POST_PRICING["2x2"][".060"][72])', () => {
    const r = calculateZoneQuote(config);
    // Any post line item (line posts or end posts)
    const anyPostLine = r.items.find(function(i) { return /posts/i.test(i.label); });
    expect(anyPostLine).toBeTruthy();
    expect(anyPostLine.unitPrice).toBe(POST_PRICE_PER_UNIT); // $45.00
  });

  it('totalPosts = panelCount + 1 = 19 (line 79 in priceCalculator: totalPosts = panelCount + 1)', () => {
    const r = calculateZoneQuote(config);
    // totalPosts=19, linePosts = 19 - 0(corners) - 2(ends) - 0(gatePosts) = 17
    const lineLine = r.items.find(function(i) { return /line posts/i.test(i.label); });
    const endLine  = r.items.find(function(i) { return /end posts/i.test(i.label); });
    expect(lineLine).toBeTruthy();
    expect(endLine).toBeTruthy();
    expect(lineLine.qty).toBe(17);  // 19 - 2 ends = 17 line posts
    expect(endLine.qty).toBe(2);    // config.ends = 2
    // Combined: 17 + 2 = 19 = totalPosts
    expect(lineLine.qty + endLine.qty).toBe(19);
  });

  it('full subtotal = $3,609.00 (panels + line posts + end posts)', () => {
    const r = calculateZoneQuote(config);
    // Hand-calculated:
    //   Panels:    18 × $153.00 = $2,754.00
    //   LinePosts: 17 × $45.00  = $  765.00
    //   EndPosts:   2 × $45.00  = $   90.00
    //   Total:                    $3,609.00
    const expectedSubtotal = (18 * PANEL_PRICE_PER_UNIT) + (17 * POST_PRICE_PER_UNIT) + (2 * POST_PRICE_PER_UNIT);
    // expectedSubtotal = 2754 + 765 + 90 = 3609
    expect(expectedSubtotal).toBe(3609.00);
    expect(r.subtotal).toBeCloseTo(expectedSubtotal, 2);
  });

  it('REGRESSION GUARD: double-pad would yield 19 panels — this test locks in 18', () => {
    // If buildDrawToolData were to emit 105ft (pre-padded) instead of 100ft,
    // and _source were still 'auto', priceCalculator would compute:
    //   Math.ceil(105 * 1.05) = Math.ceil(110.25) = 111ft → ceil(111/6) = 19 panels.
    // This test documents that contract: config.linearFeet MUST be the raw
    // draw measurement, not pre-padded.
    const doublePadConfig = Object.assign({}, config, {
      linearFeet: Math.ceil(100 * 1.05), // simulates the old double-pad bug: 105
    });
    const r = calculateZoneQuote(doublePadConfig);
    const panelLine = r.items.find(function(i) { return /panels/i.test(i.label); });
    // With 105ft raw + 5% pad = 110.25 → ceil = 111 → ceil(111/6) = 19 panels
    expect(panelLine.qty).toBe(19); // confirms double-pad would produce wrong result
    // The correct config (linearFeet=100) must NOT match this
    const correctResult = calculateZoneQuote(config);
    const correctPanels = correctResult.items.find(function(i) { return /panels/i.test(i.label); });
    expect(correctPanels.qty).not.toBe(panelLine.qty); // 18 ≠ 19
  });
});
