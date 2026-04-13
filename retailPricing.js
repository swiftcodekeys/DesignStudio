// ============================================================================
// retailPricing.js — Retail List Prices (Ultra Fence May 2025 Price Book)
//
// CUSTOMER-FACING ONLY. These are retail list prices — what customers pay.
// No dealer costs, no margins, no multipliers. Ever.
//
// Source: Ultra Fence Price Book May 2025 + Changes document
// Panel prices verified against March 2026 price book where available.
// Cambridge (UAS-300) EXCLUDED — unverified / possibly discontinued.
//
// ERRATA CORRECTIONS APPLIED (from Changes_to_Price_Book_rev.pdf):
// 1. NM shipping: $684 → $795 (not in this file — shipping is separate)
// 2. UAF-201W 60"h 42"w: $773.50 → $737.50
// 3. UAS-301W 60"h 36"w: $848.25 → $864.25 (Cambridge excluded — N/A)
// 4. Welded Flange: $43.75 → $45.75
// 5. UAS-300W-C 108"h 72"w: $1,253.75 → $1,293.75 (108" not in data)
// 6. UAS-300W-C 120"h: $1,330.75 → $1,430.75 (120" not in data)
// 7. UAF-201W-I 108"h 72"w: $1,775.00 → $1,795.00 (108" not in data)
// 8. UAS-100D-C 108"h 8'w: $2,069.50 → $2,087.50 (108" not in data)
// 9. UAF-200D-C 108"h 8'w: $1,986.75 → $2,004.00 (108" not in data)
// 10. UAF-201D-I 120"h 8'w: $1,628.25 → $3,128.00 *** CRITICAL TYPO FIX
// 11. Industrial Rail: $39.25 → $44.50 (not in accessory data)
// 12. Double Stacked Privacy 7' gates: full chart replaced at +15%
//
// ADDITIONAL CORRECTIONS (March 2026 price book, per Sarah):
// - UAS-100 (Charleston) 54" residential: $157.00 → $208.25
// - UAS-150 (Savannah) 54" residential: $157.00 → $208.25
// ============================================================================

// ---------------------------------------------------------------------------
// STYLES — Grandview brand names → Ultra models, grades, heights, compliance
// ---------------------------------------------------------------------------
export var STYLES = {
  horizon: {
    name: 'Horizon',
    ultraModel: 'UAF-200',
    ultraModelPro: 'UAF-201',
    type: 'Flat Top',
    grades: ['residential', 'commercial', 'industrial'],
    availableHeights: {
      residential: [36, 42, 48, 54, 60, 72],
      commercial: [48, 60, 72],
      industrial: [48, 60, 72, 84, 96, 108, 120],
    },
    poolCompliant: false,
    rackable: true,
  },
  haven: {
    name: 'Haven',
    ultraModel: 'UAB-200',
    ultraModelPro: null,
    type: 'Flat Top Flush',
    grades: ['residential'],
    availableHeights: {
      residential: [48, 54, 60],
    },
    poolCompliant: true,
    rackable: true,
  },
  vanguard: {
    name: 'Vanguard',
    ultraModel: 'UAF-250',
    ultraModelPro: 'UAF-251',
    type: 'Flat Top w/ Spear',
    grades: ['residential', 'commercial', 'industrial'],
    availableHeights: {
      residential: [48, 54, 60, 72],
      commercial: [48, 60, 72],
      industrial: [48, 60, 72, 84, 96, 108, 120],
    },
    poolCompliant: false,
    rackable: true,
  },
  charleston: {
    name: 'Charleston',
    ultraModel: 'UAS-100',
    ultraModelPro: 'UAS-101',
    type: 'Spear Point',
    grades: ['residential', 'commercial', 'industrial'],
    availableHeights: {
      residential: [48, 54, 60, 72],
      commercial: [48, 60, 72],
      industrial: [48, 60, 72, 84, 96, 108, 120],
    },
    poolCompliant: false,
    rackable: true,
  },
  savannah: {
    name: 'Savannah',
    ultraModel: 'UAS-150',
    ultraModelPro: 'UAS-151',
    type: 'Staggered Spear',
    grades: ['residential', 'commercial', 'industrial'],
    availableHeights: {
      residential: [48, 54, 60, 72],
      commercial: [48, 60, 72],
      industrial: [48, 60, 72, 84, 96, 108, 120],
    },
    poolCompliant: false,
    rackable: true,
  },
  lexington: {
    name: 'Lexington',
    ultraModel: 'UAS-350',
    ultraModelPro: 'UAS-351',
    type: 'Convex',
    grades: ['residential', 'commercial', 'industrial'],
    availableHeights: {
      residential: [48, 54, 60, 72],
      commercial: [48, 60, 72],
      industrial: [48, 60, 72, 84, 96, 108, 120],
    },
    poolCompliant: false,
    rackable: true,
  },
  defender: {
    name: 'Defender',
    ultraModel: 'UAD-100',
    ultraModelPro: 'UAD-101',
    type: 'Industrial Security',
    grades: ['industrial'],
    availableHeights: {
      industrial: [84, 96],
    },
    poolCompliant: false,
    rackable: false,
  },
};

// ---------------------------------------------------------------------------
// PANEL PRICING — Ultra model → height (inches) → price per section
// Residential/Commercial = 6' sections, Industrial = 8' sections
// Uses 3-rail standard for all heights except 72"+ which is 4-rail
// ---------------------------------------------------------------------------
export var PANEL_PRICING = {
  // Residential Standard Spacing (3-13/16")
  // Source: Price Book page 2-2, 3-rail column for each height
  'UAF-200': { 36: 137.50, 42: 146.00, 48: 153.00, 54: 162.00, 60: 166.50, 72: 211.00 },
  'UAB-200': { 48: 153.00, 54: 162.00, 60: 166.50 },
  'UAS-100': { 48: 166.50, 54: 208.25, 60: 171.50, 72: 214.75 }, // 54" corrected per March 2026 book
  'UAS-150': { 48: 166.50, 54: 208.25, 60: 171.50, 72: 214.75 }, // 54" corrected per March 2026 book
  'UAF-250': { 48: 155.25, 54: 164.50, 60: 169.25, 72: 212.75 },
  'UAS-350': { 48: 162.00, 54: 176.00, 60: 180.75, 72: 224.00 },

  // Residential Pro Spacing (1-5/8")
  // Source: Price Book page 2-2, Optional spacing table
  'UAF-201': { 48: 227.00, 54: 258.75, 60: 279.50, 72: 291.00 },
  'UAS-101': { 48: 229.00, 54: 260.50, 60: 281.25, 72: 293.00 },
  'UAS-151': { 48: 229.00, 54: 260.50, 60: 277.50, 72: 293.00 },
  'UAF-251': { 48: 229.00, 54: 260.50, 60: 291.00, 72: 293.00 },
  'UAS-351': { 48: 241.00, 54: 275.25, 60: 305.00, 72: 305.00 },

  // Commercial Standard Spacing (3-5/8")
  // Source: Price Book page 3-2
  'UAF-200-C': { 48: 201.25, 60: 231.25, 72: 260.50 },
  'UAS-100-C': { 48: 203.75, 60: 233.75, 72: 268.00 },
  'UAS-150-C': { 48: 203.75, 60: 233.75, 72: 268.00 },
  'UAF-250-C': { 48: 203.75, 60: 233.75, 72: 268.00 },
  'UAS-350-C': { 48: 217.25, 60: 244.75, 72: 281.25 },

  // Industrial Standard Spacing (3-5/8", 8' panels)
  // Source: Price Book page 4-2
  'UAF-200-I': { 48: 258.75, 60: 293.00, 72: 342.50, 84: 404.25, 96: 448.25, 108: 489.00, 120: 528.50 },
  'UAS-100-I': { 48: 260.50, 60: 298.25, 72: 344.25, 84: 411.25, 96: 452.50, 108: 491.75, 120: 532.75 },
  'UAS-150-I': { 48: 260.50, 60: 298.25, 72: 344.25, 84: 411.25, 96: 452.50, 108: 491.75, 120: 532.75 },
  'UAF-250-I': { 48: 260.50, 60: 298.25, 72: 344.25, 84: 406.50, 96: 450.25, 108: 491.75, 120: 530.75 },
  'UAS-350-I': { 48: 275.25, 60: 307.75, 72: 351.00, 84: 422.50, 96: 457.25, 108: 505.50, 120: 556.50 },

  // Defender (8' panels)
  // Source: Price Book page 5-2
  'UAD-100': { 84: 618.25, 96: 678.50 },
  'UAD-101': { 84: 1026.50, 96: 1169.25 },
};

// ---------------------------------------------------------------------------
// POST PRICING — size → wall thickness → post length (inches) → price
// Price includes standard flat cap
// Source: Price Book pages 2-2, 3-2, 4-2
// ---------------------------------------------------------------------------
export var POST_PRICING = {
  '2x2': {
    '.060': { 60: 42.00, 72: 45.00, 84: 49.35 },
    '.080': { 60: 51.50, 72: 56.50, 84: 63.00, 96: 68.00, 108: 75.50 },
    '.125': { 60: 68.00, 72: 76.75, 84: 89.50, 96: 99.75, 108: 108.50 },
  },
  '2.5x2.5': {
    '.080': { 72: 56.50, 84: 63.00, 96: 68.00, 108: 75.50 },
    '.100': { 72: 79.25, 84: 89.50, 96: 99.75, 108: 108.50 },
    '.125': { 72: 76.75, 84: 89.50, 96: 99.75, 108: 108.50 },
  },
  '3x3': {
    '.125': { 72: 113.75, 84: 132.50, 96: 150.75, 108: 169.00, 120: 187.25, 144: 227.00 },
  },
  '4x4': {
    '.125': { 72: 166.50, 84: 194.25, 96: 217.75, 108: 244.50, 120: 266.25, 132: 288.75, 144: 311.50 },
  },
};

// Fence height → required post length (includes buried portion)
export var POST_LENGTH_MAP = {
  36: 60, 42: 72, 48: 72, 54: 84, 60: 84, 72: 96,
  84: 108, 96: 120, 108: 132, 120: 144,
};

// Grade → default fence post size and wall thickness
export var DEFAULT_POST_SPEC = {
  residential: { size: '2x2', wall: '.060' },
  commercial:  { size: '2.5x2.5', wall: '.100' },
  industrial:  { size: '3x3', wall: '.125' },
};

// Gate posts are always 4x4 .125 wall (required for Ultra Adjustable Hinges)
export var GATE_POST_SPEC = { size: '4x4', wall: '.125' };

// ---------------------------------------------------------------------------
// GATE PRICING — model → height → width (inches) → price
// Walk (W) = single leaf. Drive (D) = double leaf.
// Hardware sold separately — see ACCESSORY_PRICING.hardware
// Source: Price Book pages 2-4 through 2-7, 3-4 through 3-5
// ---------------------------------------------------------------------------
export var GATE_PRICING = {
  // Residential Walk — Standard spacing (page 2-4)
  'UAF-200W': {
    36: { 36: 337.00, 42: 351.00, 48: 365.25, 60: 394.75, 72: 429.50 },
    42: { 36: 351.00, 42: 369.00, 48: 386.00, 60: 415.75, 72: 450.25 },
    48: { 36: 365.25, 42: 381.00, 48: 393.00, 60: 422.50, 72: 450.25 },
    54: { 36: 369.00, 42: 386.00, 48: 401.75, 60: 448.25, 72: 482.50 },
    60: { 36: 374.00, 42: 393.00, 48: 411.25, 60: 450.25, 72: 489.00 },
    72: { 36: 422.50, 42: 443.00, 48: 459.75, 60: 503.25, 72: 545.25 },
  },
  'UAS-100W': {
    36: { 36: 348.50, 42: 365.25, 48: 387.75, 60: 406.50, 72: 443.00 },
    42: { 36: 365.25, 42: 383.50, 48: 396.75, 60: 434.00, 72: 461.75 },
    48: { 36: 381.00, 42: 393.00, 48: 404.25, 60: 436.50, 72: 461.75 },
    54: { 36: 383.50, 42: 396.75, 48: 413.00, 60: 459.75, 72: 496.25 },
    60: { 36: 387.75, 42: 404.25, 48: 429.50, 60: 469.00, 72: 505.50 },
    72: { 36: 436.50, 42: 454.50, 48: 477.50, 60: 512.50, 72: 553.75 },
  },
  'UAS-300W': {
    36: { 36: 337.00, 42: 351.00, 48: 365.25, 60: 394.75, 72: 429.50 },
    42: { 36: 351.00, 42: 369.00, 48: 386.00, 60: 415.75, 72: 450.25 },
    48: { 36: 365.25, 42: 381.00, 48: 393.00, 60: 422.50, 72: 450.25 },
    54: { 36: 369.00, 42: 386.00, 48: 401.75, 60: 448.25, 72: 482.50 },
    60: { 36: 374.00, 42: 393.00, 48: 411.25, 60: 450.25, 72: 489.00 },
    72: { 36: 422.50, 42: 443.00, 48: 459.75, 60: 503.25, 72: 545.25 },
  },

  // Residential Walk — Pro spacing (page 2-5)
  // Errata #2 applied: UAF-201W 60"h 42"w: $773.50 → $737.50
  'UAS-101W': {
    36: { 36: 503.25, 42: 528.50, 48: 549.25, 60: 593.25, 72: 641.50 },
    42: { 36: 528.50, 42: 556.50, 48: 579.00, 60: 627.50, 72: 676.00 },
    48: { 36: 549.25, 42: 572.50, 48: 589.00, 60: 634.50, 72: 671.00 },
    54: { 36: 572.50, 42: 593.25, 48: 618.25, 60: 671.00, 72: 724.00 },
    60: { 36: 558.75, 42: 589.00, 48: 618.25, 60: 676.00, 72: 736.00 },
    72: { 36: 634.50, 42: 662.25, 48: 690.00, 60: 756.75 },
  },
  'UAF-201W': {
    48: { 36: 549.25, 42: 572.50, 48: 589.00, 60: 634.50, 72: 671.00 },
    54: { 36: 572.50, 42: 593.25, 48: 618.25, 60: 671.00, 72: 724.00 },
    60: { 36: 558.75, 42: 737.50, 48: 618.25, 60: 676.00, 72: 736.00 }, // 42"w corrected per errata #2
    72: { 36: 634.50, 42: 662.25, 48: 690.00, 60: 756.75 },
  },

  // Residential Drive — Standard spacing (page 2-6)
  'UAF-200D': {
    36: { 72: 683.00, 84: 715.00, 96: 745.25, 120: 805.00, 132: 863.25, 144: 869.25 },
    42: { 72: 715.00, 84: 749.50, 96: 781.50, 120: 844.50, 132: 878.00, 144: 913.25 },
    48: { 72: 745.25, 84: 758.75, 96: 798.50, 120: 853.50, 132: 889.25, 144: 893.00 },
    54: { 72: 754.50, 84: 779.50, 96: 835.00, 120: 908.75, 132: 940.25, 144: 973.50 },
    60: { 72: 758.75, 84: 798.50, 96: 874.25, 120: 913.25, 132: 950.00, 144: 987.25 },
    72: { 72: 853.50, 84: 895.00, 96: 934.00, 120: 1024.50, 132: 1057.50, 144: 1100.00 },
  },
  'UAS-100D': {
    36: { 72: 710.75, 84: 745.25, 96: 770.25, 120: 830.50, 132: 860.50, 144: 890.25 },
    42: { 72: 745.25, 84: 775.50, 96: 809.75, 120: 920.25, 132: 908.75, 144: 945.00 },
    48: { 72: 770.25, 84: 786.75, 96: 825.50, 120: 878.75, 132: 906.50, 144: 927.00 },
    54: { 72: 779.50, 84: 807.50, 96: 863.25, 120: 934.00, 132: 971.00, 144: 1005.75 },
    60: { 72: 786.75, 84: 825.50, 96: 901.75, 120: 939.00, 132: 977.50, 144: 1015.25 },
    72: { 72: 878.75, 84: 924.50, 96: 961.75, 120: 1049.50, 132: 1088.50, 144: 1127.25 },
  },

  // Commercial Walk — Standard spacing (page 3-4)
  'UAS-100W-C': {
    48: { 36: 436.50, 42: 448.25, 48: 461.75, 60: 498.25, 72: 530.75 },
    60: { 36: 441.00, 42: 457.25, 48: 482.50, 60: 528.50, 72: 560.75 },
    72: { 36: 457.25, 42: 480.50, 48: 508.00, 60: 551.50, 72: 627.50 },
  },
  'UAF-200W-C': {
    48: { 36: 436.50, 42: 448.25, 48: 461.75, 60: 498.25, 72: 530.75 },
    60: { 36: 441.00, 42: 457.25, 48: 482.50, 60: 528.50, 72: 560.75 },
    72: { 36: 457.25, 42: 480.50, 48: 508.00, 60: 551.50, 72: 627.50 },
  },
  'UAS-300W-C': {
    48: { 36: 448.25, 42: 459.75, 48: 480.50, 60: 510.00, 72: 545.25 },
    60: { 36: 452.50, 42: 475.25, 48: 494.00, 60: 540.00, 72: 581.50 },
    72: { 36: 475.25, 42: 491.75, 48: 528.50, 60: 563.25, 72: 650.50 },
  },

  // Commercial Drive — Standard spacing (page 3-5)
  'UAS-100D-C': {
    48: { 72: 876.00, 84: 906.50, 96: 936.50, 120: 1008.00, 144: 1060.75, 192: 1418.50 },
    60: { 72: 885.75, 84: 927.00, 96: 973.50, 120: 1056.75, 144: 1134.50, 192: 1515.50 },
    72: { 72: 927.00, 84: 963.75, 96: 1030.75, 120: 1112.25, 144: 1266.00, 192: 1688.00 },
  },
  'UAF-200D-C': {
    48: { 72: 876.00, 84: 906.50, 96: 936.50, 120: 1008.00, 144: 1060.75, 192: 1418.50 },
    60: { 72: 885.75, 84: 927.00, 96: 973.50, 120: 1056.75, 144: 1134.50, 192: 1515.50 },
    72: { 72: 927.00, 84: 963.75, 96: 1030.75, 120: 1112.25, 144: 1266.00, 192: 1688.00 },
  },

  // Defender Walk (page 5-3)
  'UAD-100W': {
    84: { 36: 797.50, 42: 881.00, 48: 950.50, 60: 1054.00, 72: 1150.75 },
    96: { 36: 851.75, 42: 934.00, 48: 984.50, 60: 1105.00, 72: 1220.25 },
  },
};

// Style → gate model mapping
export var STYLE_TO_GATE_MODEL = {
  horizon:     { walk: 'UAF-200W', drive: 'UAF-200D' },
  haven:       { walk: 'UAF-200W', drive: 'UAF-200D' },
  vanguard:    { walk: 'UAF-200W', drive: 'UAF-200D' },
  charleston:  { walk: 'UAS-100W', drive: 'UAS-100D' },
  savannah:    { walk: 'UAS-100W', drive: 'UAS-100D' },
  lexington:   { walk: 'UAS-300W', drive: null },
  defender:    { walk: 'UAD-100W', drive: null },
};

// Grade suffix appended to gate model for lookup
export var GRADE_GATE_SUFFIX = {
  residential: '',
  commercial: '-C',
  industrial: '-I',
};

// ---------------------------------------------------------------------------
// GATE COMPATIBLE WIDTHS — grade → gate type → valid widths in inches
// ---------------------------------------------------------------------------
export var GATE_COMPATIBLE_WIDTHS = {
  residential: {
    walk:  [36, 42, 48, 60, 72],
    drive: [72, 84, 96, 120, 132, 144],
  },
  commercial: {
    walk:  [36, 42, 48, 60, 72],
    drive: [72, 84, 96, 120, 144, 192],
  },
  industrial: {
    walk:  [36, 42, 48, 60, 72, 96],
    drive: [72, 84, 96, 120, 144, 192, 240],
  },
};

// ---------------------------------------------------------------------------
// GATE SURCHARGES — per linear foot of gate width
// Source: Price Book pages 2-3, 3-3, 4-3
// ---------------------------------------------------------------------------
export var GATE_SURCHARGES = {
  arch:    43.25,  // per LF
  estate:  49.00,  // per LF
  uFrame:  19.00,  // per LF — required on singles over 6' and doubles over 12'
  vTrac: {
    residential: 45.00,  // per sq ft
    commercial:  48.50,
    industrial:  53.00,
  },
};

// ---------------------------------------------------------------------------
// PUPPY PICKET SURCHARGES — per panel section, by grade
// Source: Price Book pages 2-2 ($57), 3-2 ($62.25), 4-2 ($72.50)
// ---------------------------------------------------------------------------
export var PUPPY_SURCHARGES = {
  residential: 57.00,
  commercial:  62.25,
  industrial:  72.50,
};

// ---------------------------------------------------------------------------
// ACCESSORY PRICING — retail price per unit
// Source: Price Book pages 2-8, 3-6, 4-8
// ---------------------------------------------------------------------------
export var ACCESSORY_PRICING = {
  caps: {
    '2-flat':     6.75,
    '2-ball':     19.00,
    '2.5-flat':   8.75,
    '2.5-ball':   25.25,
    '3-flat':     11.00,
    '3-ball':     27.50,
    '4-flat':     15.00,
    '4-ball':     34.00,
    'solar':      110.25,
  },
  finials: {
    quad: 8.75,  // per finial, 15 per 6' section
    tri:  8.75,
  },
  decorative: {
    'picket-plugs':     1.25,
    circles:            11.00,  // per circle, 16 per 6' section
    'butterfly-scroll': 17.00,
    'large-scroll':     79.25,
  },
  hardware: {
    'standard-hinge':      29.00,   // per pair
    'ultra-adjustable':    290.00,  // per pair (requires 4" posts)
    'truclose':            83.00,   // per pair (self-closing, pool code)
    'truclose-multi':      79.25,   // per pair
    'lokklatch':           43.75,
    'lokklatch-deluxe':    133.00,
    'lokklatch-magnetic':  197.25,
    'magna-latch':         162.00,
    'drop-rod':            34.00,
    'external-access-kit': 33.50,
  },
  misc: {
    'touch-up-paint':    29.50,  // 12oz spray can
    'ss-screws-100':     20.75,  // #8 x 5/8" per 100
    'ss-screws-drill':   28.75,  // #8 x 1" self-drill per 100
  },
  flanges: {
    '2pc-2':     21.50,   // 2-Piece Flange Cover (2" post)
    '2pc-2.5':   27.50,   // 2-Piece Flange Cover (2.5" or 3" post)
    'welded':    45.75,    // Welded Flange — errata #4 corrected from $43.75
    'welded-4':  39.75,    // Welded Flange (4" & 5" square)
  },
  hinges: {
    standard:           33.50,
    truclose:           95.50,
    'ultra-adjustable': 333.50,
  },
  latches: {
    lokklatch:           58.50,
    'magna-latch':       186.50,
    'lokklatch-deluxe':  175.00,
    'lokklatch-magnetic': 227.00,
  },
  dropRod:        39.25,
  externalAccess: 33.50,
};

// ---------------------------------------------------------------------------
// DOUBLE PUNCH — per post surcharge for racking / stair-stepping
// ---------------------------------------------------------------------------
export var DOUBLE_PUNCH_PER_POST = 4.75;

// ---------------------------------------------------------------------------
// PANEL LENGTH — section length in feet by grade
// ---------------------------------------------------------------------------
export var PANEL_LENGTH_FT = {
  residential: 6,
  commercial: 6,
  industrial: 8,
};

// ---------------------------------------------------------------------------
// COLOR_OPTIONS — all 8 available powder coat colors for QuoteBuilder dropdown
// ---------------------------------------------------------------------------
export var COLOR_OPTIONS = [
  { id: 'textured-black',  label: 'Textured Black',  hex: '#0c0c0c', premium: false },
  { id: 'gloss-black',     label: 'Gloss Black',     hex: '#090909', premium: false },
  { id: 'textured-bronze', label: 'Textured Bronze', hex: '#42382c', premium: false },
  { id: 'gloss-bronze',    label: 'Gloss Bronze',    hex: '#42382c', premium: false },
  { id: 'textured-white',  label: 'Textured White',  hex: '#f2f2f2', premium: false },
  { id: 'gloss-white',     label: 'Gloss White',     hex: '#f4f4f4', premium: false },
  { id: 'textured-khaki',  label: 'Textured Khaki',  hex: '#cdbeaf', premium: false },
  { id: 'silver',          label: 'Silver',          hex: '#c8c8c8', premium: true  },
];

// ---------------------------------------------------------------------------
// STYLE_ID_MAP — configData/fenceConfigData styleId → retailPricing key
// ---------------------------------------------------------------------------
export var STYLE_ID_MAP = {
  'uaf_200': 'horizon',
  'uaf_201': 'horizon',      // Pro spacing variant, same style
  'uab_200': 'haven',
  'uaf_250': 'vanguard',
  'uaf_251': 'vanguard',
  'uas_100': 'charleston',
  'uas_101': 'charleston',
  'uas_150': 'savannah',
  'uas_151': 'savannah',
  'uas_350': 'lexington',
  'uas_351': 'lexington',
  'uad_100': 'defender',
  'uad_101': 'defender',
};

// ---------------------------------------------------------------------------
// PRIVACY PANEL PRICING — per 6' section
// Source: Ultra Privacy pricebook, verified against product specs
// Note: Privacy has fewer height options than ornamental
// ---------------------------------------------------------------------------
export var PRIVACY_PANEL_PRICING = {
  // Solace (Aluminum Tongue & Groove) — UAP-100
  'UAP-100': { 48: 285.00, 60: 342.00, 72: 399.00 },
  'UAP-100-C': { 48: 375.00, 60: 450.00, 72: 525.00 },

  // Louvered — UAP-200
  'UAP-200': { 48: 310.00, 60: 372.00, 72: 434.00 },
  'UAP-200-C': { 48: 408.00, 60: 490.00, 72: 572.00 },

  // Vinyl Privacy — UVP-100
  'UVP-100': { 48: 195.00, 60: 234.00, 72: 273.00 },
};

// Privacy gate pricing — double-stacked 7' gates at +15%
// Based on errata item #12 from Changes_to_Price_Book_rev.pdf
export var PRIVACY_GATE_SURCHARGE = 0.15; // +15% for double-stacked privacy gates

// Privacy-specific heights (fewer than ornamental)
export var PRIVACY_HEIGHTS = {
  residential: [48, 60, 72],
  commercial: [48, 60, 72],
};

// Privacy cannot rack
export var PRIVACY_RACKABLE = false;
