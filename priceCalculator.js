// priceCalculator.js — Pure pricing calculator
// Takes a zone config object, returns { items[], subtotal, warnings[] }
// Imports ONLY from priceData.js

import {
  HARDWARE_PRICING, GATE_SURCHARGES, PUPPY_SURCHARGES,
  DOUBLE_PUNCH_PER_POST, SILVER_PREMIUM, DECORATIVE_PRICING,
  FINIALS_PER_PANEL, ACCENTS_PER_PANEL, PANEL_LENGTH_FT,
  WALK_WIDTHS, DRIVE_WIDTHS_RES,
} from './priceData';

// Use existing retailPricing for panel/post/gate base prices
import {
  STYLES, PANEL_PRICING, POST_PRICING, GATE_PRICING,
  POST_LENGTH_MAP, DEFAULT_POST_SPEC, GATE_POST_SPEC,
  STYLE_TO_GATE_MODEL, GRADE_GATE_SUFFIX,
  PRIVACY_PANEL_PRICING, PRIVACY_GATE_SURCHARGE,
} from './retailPricing';

import { PRIVACY_STYLES } from './configData';

function calculateGateHardwareCost(gate) {
  var cost = 0;
  if (gate.hinge && HARDWARE_PRICING.hinges[gate.hinge]) {
    cost += HARDWARE_PRICING.hinges[gate.hinge];
  }
  if (gate.latch && HARDWARE_PRICING.latches[gate.latch]) {
    cost += HARDWARE_PRICING.latches[gate.latch];
  }
  if (gate.type === 'double') {
    cost += HARDWARE_PRICING.accessories['drop-rod'];
  }
  return cost;
}

function calculateGateSurcharges(gate) {
  var widthFt = (gate.widthInches || 36) / 12;
  var surcharge = 0;
  if (gate.top === 'arch') surcharge += GATE_SURCHARGES.arch * widthFt;
  if (gate.top === 'estate') surcharge += GATE_SURCHARGES.estate * widthFt;
  // U-frame required for wide gates
  if ((gate.type === 'walk' && gate.widthInches > 72) ||
      (gate.type !== 'walk' && gate.widthInches > 144)) {
    surcharge += GATE_SURCHARGES.uFrame * widthFt;
  }
  return surcharge;
}

export function calculateZoneQuote(config) {
  var items = [];
  var warnings = [];
  var grade = config.grade || 'residential';
  var panelLengthFt = PANEL_LENGTH_FT[grade] || 6;

  // Privacy fence flag
  var isPrivacy = config.fenceType === 'privacy';

  // Panels
  var rawLinearFt = config.linearFeet || 0;
  var linearFt = (config._source === 'auto') ? Math.ceil(rawLinearFt * 1.05) : rawLinearFt;
  var panelCount = Math.ceil(linearFt / panelLengthFt);
  var panelPrice = isPrivacy
    ? getPrivacyPanelPriceLookup(config.privacyType, config.height, grade)
    : getPanelPriceLookup(config.style, config.height, grade);
  if (panelPrice && panelCount > 0) {
    var panelTotal = panelCount * panelPrice;
    // Silver premium (ornamental only — privacy uses different color system)
    if (!isPrivacy && (config.color === 'silver' || config.color === 'SI')) {
      panelTotal *= (1 + SILVER_PREMIUM);
    }
    items.push({ label: panelLengthFt + "' " + (isPrivacy ? 'Privacy ' : '') + "Panels", qty: panelCount, unitPrice: panelPrice, total: panelTotal });
  }

  // Posts
  var corners = config.corners || 0;
  var ends = config.ends || 2;
  var gateCount = (config.gates || []).length;
  var gatePosts = gateCount * 2;
  var totalPosts = panelCount + 1;
  var linePosts = Math.max(0, totalPosts - corners - ends - gatePosts);

  var postSpec = DEFAULT_POST_SPEC[grade];
  var postLength = POST_LENGTH_MAP[config.height];
  var postPrice = getPostPriceLookup(postSpec, postLength);

  if (postPrice) {
    if (linePosts > 0) items.push({ label: 'Line Posts (' + postSpec.size + '")', qty: linePosts, unitPrice: postPrice, total: linePosts * postPrice });
    if (corners > 0) items.push({ label: 'Corner Posts', qty: corners, unitPrice: postPrice, total: corners * postPrice });
    if (ends > 0) items.push({ label: 'End Posts', qty: ends, unitPrice: postPrice, total: ends * postPrice });
  }

  // Gate posts (always 4x4)
  if (gatePosts > 0) {
    var gatePostPrice = getGatePostPriceLookup(postLength);
    if (gatePostPrice) {
      items.push({ label: 'Gate Posts (4"x4")', qty: gatePosts, unitPrice: gatePostPrice, total: gatePosts * gatePostPrice });
    }
  }

  // Gates
  (config.gates || []).forEach(function(gate, i) {
    var gateLabel = (gate.type === 'walk' ? 'Walk' : gate.type === 'double' ? 'Double Drive' : 'Drive') + ' Gate (' + gate.widthInches + '")';
    var basePrice = getGatePriceLookup(config.style, config.height, gate.widthInches, gate.type, grade);
    var surcharges = calculateGateSurcharges(gate);
    var hwCost = calculateGateHardwareCost(gate);

    if (basePrice) {
      var gateTotal = basePrice + surcharges;
      // Privacy gate surcharge: double-stacked 7' gates at +15%
      if (isPrivacy) {
        gateTotal *= (1 + PRIVACY_GATE_SURCHARGE);
      }
      items.push({ label: gateLabel, qty: 1, unitPrice: gateTotal, total: gateTotal });
    } else {
      warnings.push('Gate ' + (i + 1) + ': price not available — custom quote required');
    }
    if (hwCost > 0) {
      items.push({ label: 'Hardware — Gate ' + (i + 1), qty: 1, unitPrice: hwCost, total: hwCost });
    }
  });

  // Post caps upgrade
  if (config.postCap === 'ball' && totalPosts > 0) {
    var capSize = postSpec.size.split('x')[0];
    var ballKey = capSize + '-ball';
    var flatKey = capSize + '-flat';
    var ballPrice = DECORATIVE_PRICING.caps[ballKey] || 0;
    var flatPrice = DECORATIVE_PRICING.caps[flatKey] || 0;
    var upgrade = ballPrice - flatPrice;
    if (upgrade > 0) {
      items.push({ label: 'Ball Cap Upgrade', qty: totalPosts, unitPrice: upgrade, total: totalPosts * upgrade });
    }
  }

  // Puppy pickets
  if (config.puppyPickets && panelCount > 0) {
    var puppyPrice = PUPPY_SURCHARGES[grade] || 0;
    if (puppyPrice > 0) {
      items.push({ label: 'Puppy Pickets', qty: panelCount, unitPrice: puppyPrice, total: panelCount * puppyPrice });
    }
  }

  // Finials
  if (config.finialType && config.finialType !== 'none') {
    var finialPrice = DECORATIVE_PRICING.finials[config.finialType] || 0;
    var finialQty = panelCount * FINIALS_PER_PANEL;
    if (finialPrice > 0) {
      items.push({ label: 'Finials (' + config.finialType + ')', qty: finialQty, unitPrice: finialPrice, total: finialQty * finialPrice });
    }
  }

  // Decorative accents
  ['circles', 'butterflies', 'scrolls'].forEach(function(accent) {
    if (config[accent]) {
      var accentPrice = DECORATIVE_PRICING.accents[accent] || 0;
      var accentQty = panelCount * ACCENTS_PER_PANEL;
      if (accentPrice > 0) {
        items.push({ label: accent.charAt(0).toUpperCase() + accent.slice(1), qty: accentQty, unitPrice: accentPrice, total: accentQty * accentPrice });
      }
    }
  });

  // Double punch (racking) — privacy panels cannot rack, skip surcharge
  if (!isPrivacy && config.rackingTier && config.rackingTier !== 'standard' && config.rackingTier !== 'stair-step') {
    // Prefer explicit slopedPostCount (computed from per-segment rackingTier)
    // when present. Use ?? (not ||) so an explicit 0 is honored. Clamp against
    // totalPosts to preserve the invariant that sloped posts ≤ total posts —
    // protects against grade-panel-length mismatches in the draw-time helper
    // (e.g. helper uses panelLengthFt=6 while industrial grade computes
    // totalPosts with panelLength=8).
    var slopedPosts = Math.min(config.slopedPostCount ?? totalPosts, totalPosts);
    items.push({ label: 'Double-Punch Posts (racking)', qty: slopedPosts, unitPrice: DOUBLE_PUNCH_PER_POST, total: slopedPosts * DOUBLE_PUNCH_PER_POST });
  }

  // Flange covers
  if (config.flangCovers && totalPosts > 0) {
    var flangeSize = postSpec.size.split('x')[0];
    var flangePrice = DECORATIVE_PRICING.flange[flangeSize] || 0;
    if (flangePrice > 0) {
      items.push({ label: 'Flange Covers', qty: totalPosts, unitPrice: flangePrice, total: totalPosts * flangePrice });
    }
  }

  var subtotal = items.reduce(function(sum, item) { return sum + (item.total || 0); }, 0);

  return { items: items, subtotal: Math.round(subtotal * 100) / 100, warnings: warnings };
}

// Internal lookup wrappers (same logic as pricingEngine.js but self-contained)
function getPanelPriceLookup(style, height, grade) {
  var s = STYLES[style];
  if (!s) return null;
  var model = s.ultraModel;
  if (grade === 'commercial') model += '-C';
  if (grade === 'industrial') model += '-I';
  if (!PANEL_PRICING[model]) return null;
  return PANEL_PRICING[model][height] || null;
}

function getPostPriceLookup(spec, postLength) {
  if (!spec || !postLength) return null;
  var table = POST_PRICING[spec.size];
  if (!table || !table[spec.wall]) return null;
  return table[spec.wall][postLength] || null;
}

function getGatePostPriceLookup(postLength) {
  if (!postLength) return null;
  var table = POST_PRICING[GATE_POST_SPEC.size];
  if (!table || !table[GATE_POST_SPEC.wall]) return null;
  return table[GATE_POST_SPEC.wall][postLength] || null;
}

function getGatePriceLookup(style, height, widthInches, type, grade) {
  var s = STYLES[style];
  if (!s) return null;
  var gateModel = STYLE_TO_GATE_MODEL[style];
  if (!gateModel) return null;
  var suffix = GRADE_GATE_SUFFIX[grade] || '';
  var fullModel = gateModel + suffix;
  var gateType = (type === 'walk') ? 'walk' : 'drive';
  if (!GATE_PRICING[fullModel] || !GATE_PRICING[fullModel][gateType]) return null;
  var heightTable = GATE_PRICING[fullModel][gateType][height];
  if (!heightTable) return null;
  return heightTable[widthInches] || null;
}

function getPrivacyPanelPriceLookup(privacyType, height, grade) {
  var ps = PRIVACY_STYLES.find(function(s) { return s.id === privacyType; });
  if (!ps) return null;
  var model = ps.ultraModel;
  if (grade === 'commercial') model += '-C';
  if (!PRIVACY_PANEL_PRICING[model]) return null;
  return PRIVACY_PANEL_PRICING[model][height] || null;
}
