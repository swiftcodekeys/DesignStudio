// ============================================================================
// pricingEngine.js — Quote Calculator
// Imports ONLY from retailPricing.js. Nothing else. Ever.
//
// No dealer costs, no margins, no multipliers.
// ============================================================================

import {
  STYLES, PANEL_PRICING, POST_PRICING, GATE_PRICING,
  POST_LENGTH_MAP, DEFAULT_POST_SPEC, GATE_POST_SPEC,
  STYLE_TO_GATE_MODEL, GRADE_GATE_SUFFIX,
  GATE_COMPATIBLE_WIDTHS, GATE_SURCHARGES,
  PUPPY_SURCHARGES, ACCESSORY_PRICING, DOUBLE_PUNCH_PER_POST,
  PANEL_LENGTH_FT,
} from './retailPricing';

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

function getPanelModel(style, grade) {
  var s = STYLES[style];
  if (!s) return null;
  var base = s.ultraModel;
  if (grade === 'commercial') return base + '-C';
  if (grade === 'industrial') return base + '-I';
  return base;
}

function getPanelPrice(style, height, grade) {
  var model = getPanelModel(style, grade);
  if (!model || !PANEL_PRICING[model]) return null;
  return PANEL_PRICING[model][height] || null;
}

function getPostPrice(grade, height) {
  var spec = DEFAULT_POST_SPEC[grade];
  if (!spec) return null;
  var postLength = POST_LENGTH_MAP[height];
  if (!postLength) return null;
  var sizeTable = POST_PRICING[spec.size];
  if (!sizeTable || !sizeTable[spec.wall]) return null;
  return sizeTable[spec.wall][postLength] || null;
}

function getGatePostPrice(height) {
  var postLength = POST_LENGTH_MAP[height];
  if (!postLength) return null;
  var sizeTable = POST_PRICING[GATE_POST_SPEC.size];
  if (!sizeTable || !sizeTable[GATE_POST_SPEC.wall]) return null;
  return sizeTable[GATE_POST_SPEC.wall][postLength] || null;
}

function getGatePrice(style, height, widthInches, gateType, grade) {
  var models = STYLE_TO_GATE_MODEL[style];
  if (!models) return null;
  var baseModel = models[gateType];
  if (!baseModel) return null;
  var suffix = GRADE_GATE_SUFFIX[grade] || '';
  var model = baseModel + suffix;
  if (!GATE_PRICING[model]) return null;
  var heightTable = GATE_PRICING[model][height];
  if (!heightTable) return null;
  return heightTable[widthInches] || null;
}

function getHardwarePrice(hw) {
  if (!hw) return 0;
  var total = 0;
  if (hw.hinge && ACCESSORY_PRICING.hardware[hw.hinge]) {
    total += ACCESSORY_PRICING.hardware[hw.hinge];
  }
  if (hw.latch && ACCESSORY_PRICING.hardware[hw.latch]) {
    total += ACCESSORY_PRICING.hardware[hw.latch];
  }
  if (hw.dropRod) {
    total += ACCESSORY_PRICING.hardware['drop-rod'];
  }
  return total;
}

function getCapUpgrade(grade, postCap) {
  var spec = DEFAULT_POST_SPEC[grade];
  if (!spec || postCap === 'flat') return 0;
  var sizePrefix = spec.size.split('x')[0];
  var flatKey = sizePrefix + '-flat';
  var ballKey = sizePrefix + '-ball';
  var flatPrice = ACCESSORY_PRICING.caps[flatKey] || 0;
  var ballPrice = ACCESSORY_PRICING.caps[ballKey] || 0;
  if (postCap === 'ball') return ballPrice - flatPrice;
  if (postCap === 'solar') return ACCESSORY_PRICING.caps.solar - flatPrice;
  return 0;
}

// ---------------------------------------------------------------------------
// calculateQuote(config) — main entry point
// ---------------------------------------------------------------------------

export function calculateQuote(config) {
  var errors = [];
  var warnings = [];
  var items = [];

  var style    = config.style;
  var height   = config.height;
  var grade    = config.grade || 'residential';
  var linearFt = config.linearFeet || 0;
  var corners  = config.corners || 0;
  var endCount = config.endCount || 2;
  var gates    = config.gates || [];
  var postCap  = config.postCap || 'flat';
  var puppy    = config.puppyPickets || false;
  var finials  = config.finials || null;
  var circles  = config.circles || false;
  var terrain  = config.terrain || 'flat';

  // ── Validation ──

  var emptyResult = {
    items: [], subtotal: 0, panelCount: 0, fencePostCount: 0,
    gatePostCount: 0, totalPostCount: 0, gateCount: 0,
    hasSlope: false, doublePunchSurcharge: 0, errors: [], warnings: [],
  };

  // 1. Style exists
  if (!STYLES[style]) {
    emptyResult.error = 'STYLE_UNAVAILABLE';
    emptyResult.message = 'Style "' + style + '" is not recognized.';
    emptyResult.errors = ['STYLE_UNAVAILABLE'];
    return emptyResult;
  }

  // 2. Height available for this style + grade
  var availableHeights = STYLES[style].availableHeights[grade] || [];
  if (availableHeights.indexOf(height) === -1) {
    emptyResult.error = 'HEIGHT_UNAVAILABLE';
    emptyResult.message = height + '" is not available for ' + style + ' in ' + grade + ' grade.';
    emptyResult.errors = ['HEIGHT_UNAVAILABLE'];
    return emptyResult;
  }

  // 3. Panel price exists
  var panelPrice = getPanelPrice(style, height, grade);
  if (panelPrice == null) {
    emptyResult.error = 'PRICE_UNAVAILABLE';
    emptyResult.message = 'Pricing unavailable for this combination. Please contact us at (855) FENCE-30.';
    emptyResult.errors = ['PRICE_UNAVAILABLE'];
    return emptyResult;
  }

  // 4. Gate width validation
  for (var gi = 0; gi < gates.length; gi++) {
    var gv = gates[gi];
    var validWidths = (GATE_COMPATIBLE_WIDTHS[grade] && GATE_COMPATIBLE_WIDTHS[grade][gv.type]) || [];
    if (validWidths.indexOf(gv.widthInches) === -1) {
      errors.push('INVALID_GATE_WIDTH');
      warnings.push(
        gv.widthInches + '" is not a standard ' + gv.type +
        ' gate width for ' + grade + ' grade. Valid: ' +
        validWidths.join(', ') + '".'
      );
    }
  }

  // ── Calculations ──

  var panelLengthFt = PANEL_LENGTH_FT[grade] || 6;
  var panelCount = Math.ceil(linearFt / panelLengthFt);
  var fencePostCount = panelCount + 1;
  var gatePostCount = gates.length * 2;
  var totalPostCount = fencePostCount + gatePostCount;

  // Post breakdown for note
  var linePosts = Math.max(0, fencePostCount - corners - endCount);
  var postNote =
    'Includes ' + linePosts + ' line post' + (linePosts !== 1 ? 's' : '') +
    ', ' + corners + ' corner post' + (corners !== 1 ? 's' : '') +
    ', ' + endCount + ' end post' + (endCount !== 1 ? 's' : '') +
    ', calculated from your layout';

  // ── Line items ──

  // Panels
  items.push({
    label: 'Fence Panels',
    qty: panelCount,
    unitPrice: panelPrice,
    total: panelCount * panelPrice,
    note: linearFt + ' linear feet of ' + STYLES[style].name + ' at ' + height + '"',
  });

  // Fence posts
  var postPrice = getPostPrice(grade, height);
  if (postPrice != null) {
    items.push({
      label: 'Fence Posts',
      qty: fencePostCount,
      unitPrice: postPrice,
      total: fencePostCount * postPrice,
      note: postNote,
    });
  } else {
    warnings.push('Post pricing unavailable for ' + grade + ' grade at ' + height + '". Contact us for a quote.');
  }

  // Gate posts (4x4)
  if (gatePostCount > 0) {
    var gatePostPrice = getGatePostPrice(height);
    if (gatePostPrice != null) {
      items.push({
        label: 'Gate Posts (4" heavy duty)',
        qty: gatePostCount,
        unitPrice: gatePostPrice,
        total: gatePostCount * gatePostPrice,
        note: '2 per gate, required for adjustable hinges',
      });
    }
  }

  // Gates + hardware
  for (var i = 0; i < gates.length; i++) {
    var g = gates[i];
    var gLabel = (g.type === 'walk' ? 'Walk' : 'Drive') + ' Gate | ' + g.widthInches + '" wide';
    var gPrice = getGatePrice(style, height, g.widthInches, g.type, grade);
    var surcharges = 0;
    var widthFt = g.widthInches / 12;

    if (g.top === 'arch') surcharges += GATE_SURCHARGES.arch * widthFt;
    if (g.top === 'estate') surcharges += GATE_SURCHARGES.estate * widthFt;
    var uFrameThreshold = (g.type === 'walk') ? 72 : 144;
    if (g.widthInches > uFrameThreshold) surcharges += GATE_SURCHARGES.uFrame * widthFt;

    if (gPrice != null) {
      items.push({
        label: gLabel + (g.top && g.top !== 'straight' ? ', ' + g.top + ' top' : ''),
        qty: 1,
        unitPrice: gPrice + surcharges,
        total: gPrice + surcharges,
        note: surcharges > 0 ? 'Includes $' + surcharges.toFixed(2) + ' in surcharges' : '',
      });
    } else {
      warnings.push(
        'Gate pricing unavailable for ' + style + ' ' + height + '" ' +
        g.type + ' gate at ' + g.widthInches + '". Contact us.'
      );
    }

    // Hardware per gate
    var hwTotal = getHardwarePrice(g.hardware);
    if (hwTotal > 0) {
      items.push({
        label: 'Gate Hardware',
        qty: 1,
        unitPrice: hwTotal,
        total: hwTotal,
        note: 'Hinges + latch' + (g.hardware && g.hardware.dropRod ? ' + drop rod' : '') + ', sold separately',
      });
    }
  }

  // Puppy pickets
  if (puppy) {
    var puppySurcharge = PUPPY_SURCHARGES[grade] || 0;
    if (puppySurcharge > 0) {
      items.push({
        label: 'Puppy Pickets (short picket add-on)',
        qty: panelCount,
        unitPrice: puppySurcharge,
        total: panelCount * puppySurcharge,
        note: '16" pickets added below second rail',
      });
    }
  }

  // Post cap upgrade
  if (postCap !== 'flat') {
    var capUpgrade = getCapUpgrade(grade, postCap);
    if (capUpgrade > 0) {
      items.push({
        label: 'Post Cap Upgrade (' + postCap + ')',
        qty: totalPostCount,
        unitPrice: capUpgrade,
        total: totalPostCount * capUpgrade,
        note: 'Upgrade from standard flat cap',
      });
    }
  }

  // Finials
  if (finials) {
    var finialsPerSection = 15;
    var finialPrice = ACCESSORY_PRICING.finials[finials] || 8.75;
    items.push({
      label: 'Finials (' + finials + ')',
      qty: panelCount * finialsPerSection,
      unitPrice: finialPrice,
      total: panelCount * finialsPerSection * finialPrice,
      note: finialsPerSection + ' per section',
    });
  }

  // Circles
  if (circles) {
    var circlesPerSection = 16;
    var circlePrice = ACCESSORY_PRICING.decorative.circles;
    items.push({
      label: 'Decorative Circles',
      qty: panelCount * circlesPerSection,
      unitPrice: circlePrice,
      total: panelCount * circlesPerSection * circlePrice,
      note: circlesPerSection + ' per section',
    });
  }

  // Slope / terrain — supports segment-based racking when segments data is available
  var segments = config.segments || []; // [{ lengthFt, slope }] per segment from draw tool
  var hasSlope = terrain !== 'flat';
  var doublePunchSurcharge = 0;

  if (segments.length > 0) {
    // Segment-based: only charge racking posts in sloped segments
    var slopedFt = 0;
    var hasStairStep = false;
    segments.forEach(function(seg) {
      if (seg.slope && seg.slope !== 'flat') {
        slopedFt += (seg.lengthFt || 0);
        if (seg.slope === 'steps') hasStairStep = true;
      }
    });
    if (slopedFt > 0) {
      hasSlope = true;
      // Racking posts = posts in sloped segments (1 post per panel + 1)
      var slopedPanels = Math.ceil(slopedFt / PANEL_LENGTH_FT);
      var slopedPosts = slopedPanels + 1;
      doublePunchSurcharge = slopedPosts * DOUBLE_PUNCH_PER_POST;
      items.push({
        label: 'Racking Posts (sloped sections)',
        qty: slopedPosts,
        unitPrice: DOUBLE_PUNCH_PER_POST,
        total: doublePunchSurcharge,
        note: Math.round(slopedFt) + ' ft of sloped fence requires racked posts',
      });
    }
    if (hasStairStep) {
      warnings.push('Stair-step sections cannot be racked. We recommend a free consultation to determine the best approach.');
    }
  } else if (hasSlope) {
    // Fallback: whole-yard slope (legacy behavior)
    doublePunchSurcharge = totalPostCount * DOUBLE_PUNCH_PER_POST;
    items.push({
      label: 'Double Punch Posts (slope/racking)',
      qty: totalPostCount,
      unitPrice: DOUBLE_PUNCH_PER_POST,
      total: doublePunchSurcharge,
      note: 'Required for racked panels on sloped terrain',
    });
    if (terrain === 'steep' || terrain === 'mixed') {
      warnings.push('Steep or mixed terrain may require stair-stepped sections. We recommend a free consultation to confirm quantities.');
    }
  }

  // Subtotal
  var subtotal = 0;
  for (var si = 0; si < items.length; si++) {
    subtotal += items[si].total;
  }

  return {
    items: items,
    subtotal: Math.round(subtotal * 100) / 100,
    panelCount: panelCount,
    fencePostCount: fencePostCount,
    gatePostCount: gatePostCount,
    totalPostCount: totalPostCount,
    gateCount: gates.length,
    hasSlope: hasSlope,
    doublePunchSurcharge: doublePunchSurcharge,
    errors: errors,
    warnings: warnings,
  };
}

// ---------------------------------------------------------------------------
// UNIT TESTS — run with: node -e "require('./pricingEngine').runTests();"
// ---------------------------------------------------------------------------

function testExampleA() {
  // 150LF, 4 corners, Horizon 48", 1 walk gate 48", residential, standard
  // Verified output: $5,793.75 (25 panels, 26 fence posts, 2 gate posts)
  var result = calculateQuote({
    style: 'horizon', height: 48, grade: 'residential',
    linearFeet: 150, corners: 4, endCount: 2,
    gates: [{ type: 'walk', widthInches: 48, top: 'straight',
              hardware: { hinge: 'standard-hinge', latch: 'lokklatch' } }],
    postCap: 'flat', puppyPickets: false, finials: null, circles: false,
    terrain: 'flat',
  });
  console.log('Test A — Horizon 48" Residential, 150LF');
  console.log('  Subtotal: $' + result.subtotal);
  console.log('  Panels: ' + result.panelCount);
  console.log('  Fence Posts: ' + result.fencePostCount);
  console.log('  Gate Posts: ' + result.gatePostCount);
  console.log('  Errors: ' + result.errors.length);
  console.log('  Warnings: ' + result.warnings.length);
  result.items.forEach(function(item) {
    console.log('    ' + item.label + ': ' + item.qty + ' x $' + item.unitPrice.toFixed(2) + ' = $' + item.total.toFixed(2));
  });
  return result;
}

function testExampleB() {
  // 300LF, 6 corners, Charleston 60" commercial,
  // 1 walk 48" + 1 drive 10' (120"), puppy picket, ball caps
  // Verified output: $23,468.25 (50 panels, 51 fence posts, 4 gate posts)
  // Note: uses 2.5x2.5 .100 posts (commercial default). Spec's worked
  // example used 3x3 .125 ($132.50/post) — that would be a customer upgrade.
  var result = calculateQuote({
    style: 'charleston', height: 60, grade: 'commercial',
    linearFeet: 300, corners: 6, endCount: 2,
    gates: [
      { type: 'walk', widthInches: 48, top: 'straight',
        hardware: { hinge: 'ultra-adjustable', latch: 'lokklatch-deluxe' } },
      { type: 'drive', widthInches: 120, top: 'straight',
        hardware: { hinge: 'ultra-adjustable', latch: 'lokklatch-deluxe', dropRod: true } },
    ],
    postCap: 'ball', puppyPickets: true, finials: null, circles: false,
    terrain: 'flat',
  });
  console.log('\nTest B — Charleston 60" Commercial, 300LF');
  console.log('  Subtotal: $' + result.subtotal);
  console.log('  Panels: ' + result.panelCount);
  console.log('  Fence Posts: ' + result.fencePostCount);
  console.log('  Gate Posts: ' + result.gatePostCount);
  console.log('  Errors: ' + result.errors.length);
  console.log('  Warnings: ' + result.warnings.length);
  result.items.forEach(function(item) {
    console.log('    ' + item.label + ': ' + item.qty + ' x $' + item.unitPrice.toFixed(2) + ' = $' + item.total.toFixed(2));
  });
  return result;
}

export function runTests() {
  console.log('=== Pricing Engine Unit Tests ===\n');
  testExampleA();
  testExampleB();
  console.log('\n=== Tests Complete ===');
}
