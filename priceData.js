// priceData.js — Ultra Fence Pricebook (March 2026)
// DATA ONLY. No logic. Replace this file when new pricebook arrives.

// Gate widths available for auto-pricing
export var WALK_WIDTHS = [36, 42, 48, 60, 72];
export var DRIVE_WIDTHS_RES = [72, 84, 96, 120, 144];
export var DRIVE_WIDTHS_COMM = [72, 84, 96, 120, 144, 192];
export var DRIVE_WIDTHS_IND = [72, 84, 96, 120, 144, 192, 240];

// Gate hardware pricing
export var HARDWARE_PRICING = {
  hinges: {
    'standard':        33.50,   // per pair
    'truclose':        95.50,   // per pair, self-closing, pool code
    'ultra-adjustable': 333.50, // per pair, requires 4" posts
  },
  latches: {
    'lokklatch':          58.50,
    'magna-latch':       186.50,  // pool code approved
    'lokklatch-deluxe':  175.00,
    'lokklatch-magnetic': 227.00,
  },
  accessories: {
    'drop-rod':           39.25,  // auto-included for double gates
    'external-access':    33.50,
  },
};

// Surcharges
export var GATE_SURCHARGES = {
  arch: 43.25,          // per linear foot of gate width
  estate: 49.00,        // per linear foot
  uFrame: 19.00,        // per LF, required for singles >6', doubles >12'
};

// Puppy picket surcharges per panel
export var PUPPY_SURCHARGES = {
  residential: 57.00,
  commercial:  62.25,
  industrial:  72.50,
};

// Double punch for racking — per post
export var DOUBLE_PUNCH_PER_POST = 4.75;

// Silver premium multiplier
export var SILVER_PREMIUM = 0.25; // +25% on panels

// Decorative accessory pricing (per piece)
export var DECORATIVE_PRICING = {
  finials: { spear: 8.75, tri: 8.75, quad: 8.75, plug: 1.25 },
  accents: { circles: 11.00, butterflies: 17.00, scrolls: 79.25 },
  caps: {
    '2-flat': 7.75, '2-ball': 22.00,
    '2.5-flat': 10.25, '2.5-ball': 29.00,
    '3-flat': 12.75, '3-ball': 31.75,
    '4-flat': 18.50, '4-ball': 45.75,
  },
  flange: {
    '2': 21.50, '2.5': 27.00, '3': 34.50, '4': 45.75,
  },
};

// Finials per 6' panel section (one per picket, ~15 pickets per 6' panel)
export var FINIALS_PER_PANEL = 15;
// Accent sets per 6' panel section — scrolls/circles/butterflies ship as a pair per panel
// TODO: verify exact qty against Ultra price book; 2 per panel is conservative estimate
export var ACCENTS_PER_PANEL = 2;

// Panel length by grade
export var PANEL_LENGTH_FT = { residential: 6, commercial: 6, industrial: 8 };
