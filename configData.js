// ============================================================
// configData.js — Single source of truth for all gate configuration
// Extracted from legacy ultra_dsg_minbak.js
// ============================================================

var MODEL_BASE = 'gate_tool/m/';

export var COLORS = [
  { id: 0, name: 'Textured Khaki',   displayName: 'Beige',        hex: '#cdbeaf', threeHex: 0xcdbeaf, metalness: 0.2, roughness: 0.4, envMapIntensity: 2.6, bumpScale: 0.002,  ao: 0.8 },
  { id: 1, name: 'Gloss Bronze',     displayName: 'Bronze',       hex: '#42382c', threeHex: 0x42382c, metalness: 0.3, roughness: 0.1, envMapIntensity: 4.0, bumpScale: 0.0001, ao: 0.8 },
  { id: 2, name: 'Textured Bronze',  displayName: 'Satin Bronze', hex: '#42382c', threeHex: 0x42382c, metalness: 0.3, roughness: 0.4, envMapIntensity: 5.5, bumpScale: 0.0015, ao: 0.8 },
  { id: 3, name: 'Gloss White',      displayName: 'White',        hex: '#f4f4f4', threeHex: 0xF8F5F6, metalness: 0.2, roughness: 0.2, envMapIntensity: 2.5, bumpScale: 0.0001, ao: 0.5 },
  { id: 4, name: 'Textured White',   displayName: 'Satin White',  hex: '#f2f2f2', threeHex: 0xF8F5F6, metalness: 0.1, roughness: 0.2, envMapIntensity: 2.5, bumpScale: 0.002,  ao: 0.3 },
  { id: 5, name: 'Gloss Black',      displayName: 'Black',        hex: '#090909', threeHex: 0x080808, metalness: 0.2, roughness: 0.2, envMapIntensity: 8.0, bumpScale: 0.0001, ao: 1.0 },
  { id: 6, name: 'Textured Black',   displayName: 'Satin Black',  hex: '#0c0c0c', threeHex: 0x0c0c0c, metalness: 0.2, roughness: 0.4, envMapIntensity: 9.0, bumpScale: 0.0015, ao: 1.0 },
  { id: 7, name: 'Silver',           displayName: 'Silver',       hex: '#c8c8c8', threeHex: 0xFEF8F2, metalness: 0.8, roughness: 0.2, envMapIntensity: 5.5, bumpScale: 0.0002, ao: 0.6 },
];

export var HEIGHTS = [
  { id: '48', label: '48"' },
  { id: '60', label: '60"' },
  { id: '72', label: '72"' },
];

export var FENCE_STYLES = [
  {
    id: 'uaf_200', code: 'UAF-200', name: 'Horizon', subtitle: 'Flat Top',
    category: 'flat', series: '200', hasFinials: false,
    supports3D: true, renderMode: '3d', meshCount: 27,
    options: ['pcf','pcb','res','ufr','mdr','xlr','pup'],
    accessories: ['tcr','tbu','scr','bcr','bbu'],
    leafDefault: '2', postDefault: 'po14',
  },
  {
    id: 'uaf_201', code: 'UAF-201', name: 'Horizon Pro', subtitle: 'Flat Top · 1½" Spacing',
    category: 'flat', series: '201', hasFinials: false,
    supports3D: true, renderMode: '3d', meshCount: 27,
    options: ['pcf','pcb','res','ufr','mdr','xlr'],
    accessories: ['tcr','tbu','bcr','bbu'],
    leafDefault: '2', postDefault: 'po14',
  },
  {
    id: 'uaf_250', code: 'UAF-250', name: 'Vanguard', subtitle: 'Flat Top w/ Spears',
    category: 'flat', series: '250', hasFinials: true,
    supports3D: true, renderMode: '3d', meshCount: 41,
    options: ['pcf','pcb','fs','ft','fq','fp','res','ufr','mdr','xlr','pup'],
    accessories: ['scr','bcr','bbu'],
    leafDefault: '2', postDefault: 'po14',
  },
  {
    id: 'uab_200', code: 'UAB-200', name: 'Haven', subtitle: 'Flat Top Flush',
    category: 'flush', series: '200', hasFinials: false,
    supports3D: true, renderMode: '3d', meshCount: 27,
    options: ['pcf','pcb','res','ufr','mdr','xlr','pup'],
    accessories: ['scr','bcr','bbu'],
    leafDefault: '2', postDefault: 'po14',
  },
  {
    id: 'uas_100', code: 'UAS-100', name: 'Charleston', subtitle: 'Spear Top',
    category: 'spear', series: '100', hasFinials: true,
    supports3D: true, renderMode: '3d', meshCount: 53,
    options: ['pcf','pcb','fs','ft','fq','fp','res','ufr','mdr','xlr','pup'],
    accessories: ['tcr','tbu','scr','bcr','bbu'],
    leafDefault: '2', postDefault: 'po14',
  },
  {
    id: 'uas_101', code: 'UAS-101', name: 'Charleston Pro', subtitle: 'Spear Top · 1½" Spacing',
    category: 'spear', series: '100', hasFinials: true,
    supports3D: true, renderMode: '3d', meshCount: 53,
    options: ['pcf','pcb','fs','ft','fq','fp','res','ufr','mdr','xlr'],
    accessories: ['tcr','tbu','bcr','bbu'],
    leafDefault: '2', postDefault: 'po14',
  },
  {
    id: 'uas_150', code: 'UAS-150', name: 'Savannah', subtitle: 'Staggered Spear',
    category: 'spear', series: '100', hasFinials: true, isStaggered: true,
    supports3D: true, renderMode: '3d', meshCount: 53,
    options: ['pcf','pcb','fs','ft','fq','fp','res','ufr','mdr','xlr','pup'],
    accessories: ['tcr','tbu','scr','bcr','bbu'],
    leafDefault: '2', postDefault: 'po14',
  },
  // --- Unsupported styles (no proven 3D scene data) ---
  {
    id: 'uas_300', code: 'UAS-300', name: 'Eclipse', subtitle: 'Concave',
    category: 'spear', series: '300', hasFinials: true,
    supports3D: false, renderMode: 'preview', meshCount: null,
    options: [],
    accessories: [],
    leafDefault: '1', postDefault: 'po14',
  },
  {
    id: 'uas_350', code: 'UAS-350', name: 'Lexington', subtitle: 'Convex',
    category: 'spear', series: '350', hasFinials: true,
    supports3D: false, renderMode: 'preview', meshCount: null,
    options: [],
    accessories: [],
    leafDefault: '1', postDefault: 'po14',
  },
  {
    id: 'ual_100', code: 'UAL-100', name: 'Cambridge', subtitle: 'Lattice Top',
    category: 'lattice', series: '100', hasFinials: false,
    supports3D: false, renderMode: 'preview', meshCount: null,
    options: [],
    accessories: [],
    leafDefault: '2', postDefault: 'po14',
  },
  {
    id: 'uad_100', code: 'UAD-100', name: 'Defender', subtitle: 'Commercial Grade',
    category: 'commercial', series: '100', hasFinials: false,
    supports3D: false, renderMode: 'preview', meshCount: null,
    options: [],
    accessories: [],
    leafDefault: '2', postDefault: 'po14',
  },
  // --- Privacy (overlay-only by product decision) ---
  {
    id: 'privacy', code: 'UAP-100', name: 'Privacy', subtitle: 'Aluminum Privacy',
    category: 'privacy', series: '100', hasFinials: false,
    supports3D: false, renderMode: 'overlay', meshCount: null,
    options: [],
    accessories: [],
    leafDefault: '2', postDefault: 'po14',
  },
];

export var POST_CAPS = [
  { id: 'pcf', name: 'Flat Cap', model: 'pcf' },
  { id: 'pcb', name: 'Ball Cap', model: 'pcb' },
];

export var FINIALS = [
  { id: 'fs', name: 'Spear',   model: 'fs' },
  { id: 'ft', name: 'Triangle', model: 'ft' },
  { id: 'fq', name: 'Quad',    model: 'fq' },
  { id: 'fp', name: 'Plug',    model: 'fp' },
];

export var POSTS = [
  { id: 'po12', name: '1.25" Post' },
  { id: 'po14', name: '1.5" Post' },
  { id: 'po23', name: '2.5" Post' },
  { id: 'po40s', name: '4" Single Post' },
  { id: 'po40d', name: '4" Double Post' },
];

export var ARCH_STYLES = [
  { id: 'e', name: 'Estate' },
  { id: 'a', name: 'Arched' },
  { id: 'r', name: 'Reverse' },
  { id: 's', name: 'Standard' },
];

export var ACCESSORIES = {
  tcr: { name: 'Circle', model: 'acc' },
  tbu: { name: 'Butterfly', model: 'acb' },
  scr: { name: 'Scroll', model: 'acs' },
  bcr: { name: 'Circles at Base', model: 'acc' },
  bbu: { name: 'Butterflies at Base', model: 'acb' },
  pup: { name: 'Puppy Panel' },
  mdr: { name: 'Mid Rail' },
  ufr: { name: 'Upper Finial Rail' },
  xlr: { name: 'Extra Rail' },
  res: { name: 'Pro Spacing' },
};

export var OPTION_LABELS = {
  pcf: 'Flat Post Cap',
  pcb: 'Ball Post Cap',
  fs:  'Spear Finial',
  ft:  'Triangle Finial',
  fq:  'Quad Finial',
  fp:  'Pyramid Finial',
  res: 'Pro Spacing',
  ufr: 'Upper Finial Rail',
  mdr: 'Mid Rail',
  xlr: 'Extra Rail',
  pup: 'Puppy Panel',
};

// ============================================================
// Style-aware feature gating — derived from extraction bundle
// gate_discovery_features.json, gate_discovery_accents.json,
// fence_accessories_discovery.json
//
// Each entry lists the IDs that are PROVEN to work for that style.
// If a feature/option/accessory is not listed, the UI must hide it.
// ============================================================

export var STYLE_FEATURE_GATE = {
  // --- Flat Top family ---
  uaf_200: {
    finials: [],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr', 'pup'],
    accessories: ['cir', 'but', 'scr', 'bcr', 'bbu'],
  },
  uaf_201: {
    finials: [],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr'],
    accessories: ['cir', 'but', 'bcr', 'bbu'],
  },
  uaf_250: {
    finials: ['fs', 'ft', 'fq', 'fp'],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr', 'pup'],
    accessories: ['scr', 'bcr', 'bbu'],
  },

  // --- Flush family ---
  uab_200: {
    finials: [],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr', 'pup'],
    accessories: ['scr', 'bcr', 'bbu'],
  },

  // --- Spear Top family ---
  uas_100: {
    finials: ['fs', 'ft', 'fq', 'fp'],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr', 'pup'],
    accessories: ['cir', 'but', 'scr', 'bcr', 'bbu'],
  },
  uas_101: {
    finials: ['fs', 'ft', 'fq', 'fp'],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr'],
    accessories: ['cir', 'but', 'bcr', 'bbu'],
  },
  uas_150: {
    finials: ['fs', 'ft', 'fq', 'fp'],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr', 'pup'],
    accessories: ['cir', 'but', 'scr', 'bcr', 'bbu'],
  },

  // --- Unsupported 3D but feature-gated for preview mode ---
  uas_300: {
    finials: ['fs', 'ft', 'fq', 'fp'],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr', 'pup'],
    accessories: ['cir', 'but', 'scr', 'bcr', 'bbu'],
  },
  uas_350: {
    finials: ['fs', 'ft', 'fq', 'fp'],
    archStyles: ['e', 'a', 'r', 's'],
    postCaps: ['pcf', 'pcb'],
    options: ['res', 'ufr', 'mdr', 'xlr', 'pup'],
    accessories: ['cir', 'but', 'scr', 'bcr', 'bbu'],
  },
};

// ============================================================
// Model path resolution — single source of truth
// Eliminates string concatenation in renderer
// ============================================================

export function getModelPath(type, config) {
  var leaf = config.leaf || '2';
  var arch = config.arch || 'e';

  switch (type) {
    // Posts (directory 0)
    case 'po40d':   return MODEL_BASE + '0/po40d.json';
    case 'po40s':   return MODEL_BASE + '0/po40s.json';
    case 'po14':    return MODEL_BASE + '0/po14.json';
    case 'po12':    return MODEL_BASE + '0/po12.json';
    case 'po23':    return MODEL_BASE + '0/po23.json';

    // Top rails (directory 1) — arch-specific geometry
    case 'railTop':  return MODEL_BASE + '1/rt' + leaf + arch + '.json';

    // Bottom rails (directory 1) — no arch variant
    case 'railBot':  return MODEL_BASE + '1/rb' + leaf + '.json';

    // Picket tops (directory 2) — arch-specific geometry
    case 'ptEven':   return MODEL_BASE + '2/pt' + leaf + arch + 'e.json';
    case 'ptOdd':    return MODEL_BASE + '2/pt' + leaf + arch + 'o.json';
    case 'ptRes':    return MODEL_BASE + '2/pt' + leaf + arch + 'x.json';

    // Picket bottoms (directory 2) — no arch variant
    case 'pbEven':   return MODEL_BASE + '2/pb' + leaf + 'e.json';
    case 'pbOdd':    return MODEL_BASE + '2/pb' + leaf + 'o.json';
    case 'pbRes':    return MODEL_BASE + '2/pb' + leaf + 'x.json';

    // Accessories (directory 3) — static models
    case 'hinge':    return MODEL_BASE + '3/hng.json';
    case 'postCap':  return MODEL_BASE + '3/' + (config.postCap || 'pcf') + '.json';
    case 'finial':   return MODEL_BASE + '3/' + (config.finial || 'fs') + '.json';
    case 'ufr':      return MODEL_BASE + '3/ufr' + leaf + '.json';
    case 'circle':    return MODEL_BASE + '3/acc.json';
    case 'scroll':   return MODEL_BASE + '3/acs.json';
    case 'butterfly': return MODEL_BASE + '3/acb.json';

    default:
      return null;
  }
}

// ============================================================
// Style render-mode helpers
// ============================================================

/**
 * Returns the renderMode for a style. Defaults to 'preview' if not found.
 * @param {string} styleId
 * @returns {'3d' | 'preview' | 'overlay'}
 */
export function getStyleRenderMode(styleId) {
    var style = FENCE_STYLES.find(function(s) { return s.id === styleId; });
    return style ? style.renderMode : 'preview';
}

/**
 * Returns true if the style supports full 3D rendering.
 * @param {string} styleId
 * @returns {boolean}
 */
export function styleSupports3D(styleId) {
    var style = FENCE_STYLES.find(function(s) { return s.id === styleId; });
    return style ? style.supports3D : false;
}

// ============================================================
// GRADE_DEFINITIONS — picket/rail/post specs per grade
// ============================================================
export var GRADE_DEFINITIONS = {
  residential: {
    label: 'Residential',
    picketSize: '5/8"',
    railSize: '1" x 1-1/2"',
    postSizeDefault: '2" x 2"',
    postWallDefault: '.060',
    panelLength: 6,
    description: 'Standard home fencing. Lightweight, elegant.',
  },
  commercial: {
    label: 'Commercial',
    picketSize: '3/4"',
    railSize: '1-1/4" x 1-3/4"',
    postSizeDefault: '2.5" x 2.5"',
    postWallDefault: '.100',
    panelLength: 6,
    description: 'Schools, businesses, HOA. Heavier pickets and rails.',
  },
  industrial: {
    label: 'Industrial',
    picketSize: '1"',
    railSize: '1-1/2" x 2"',
    postSizeDefault: '3" x 3"',
    postWallDefault: '.125',
    panelLength: 8,
    description: 'Maximum security. 8-foot panels, heavy-duty.',
  },
};

// ============================================================
// WALK_WIDTHS / DRIVE_WIDTHS — standard gate widths in inches
// ============================================================
export var WALK_WIDTHS  = [36, 42, 48, 60, 72];
export var DRIVE_WIDTHS = [72, 84, 96, 120, 144];

// ============================================================
// PRIVACY_STYLES — stub for future Privacy Fence feature
// ============================================================
export var PRIVACY_STYLES = [
  { id: 'solace',   name: 'Solace',         type: 'Aluminum T&G',     ultraModel: 'UAP-100' },
  { id: 'louvered', name: 'Louvered',       type: 'Airflow Screening', ultraModel: 'UAP-200' },
  { id: 'vinyl',    name: 'Vinyl Privacy',  type: 'Solid/Variegated',  ultraModel: 'UVP-100' },
];

// ============================================================
// HEIGHTS_BY_GRADE — available fence heights (inches) per grade
// ============================================================
export var HEIGHTS_BY_GRADE = {
  residential: [36, 42, 48, 54, 60, 72],
  commercial:  [48, 60, 72],
  industrial:  [48, 60, 72, 84, 96, 108, 120],
};

// ============================================================
// FENCE PANEL CONFIG — merged from fenceConfigData.js
// Extracted from Ultra's fence tool stlArr + cArr via Playwright
// ============================================================

var FENCE_MODEL_BASE = 'fence_tool/m/';

export var FENCE_COLORS = [
    { id: 5, name: 'Gloss Black',     displayName: 'Gloss Black',     hex: '#0a0a0a', threeHex: 0x020202, metalness: 0.05, roughness: 0.02, envMapIntensity: 12,  bumpScale: 0.0001 },
    { id: 6, name: 'Textured Black',  displayName: 'Textured Black',  hex: '#1a1a1a', threeHex: 0x0C0C0C, metalness: 0.05, roughness: 0.06, envMapIntensity: 6,   bumpScale: 0.0003 },
    { id: 3, name: 'Gloss White',     displayName: 'Gloss White',     hex: '#f0f0f0', threeHex: 0xE4E4E4, metalness: 0.2,  roughness: 0.1,  envMapIntensity: 1.5, bumpScale: 0.0001 },
    { id: 4, name: 'Textured White',  displayName: 'Textured White',  hex: '#e8e8e8', threeHex: 0xF2F2F2, metalness: 0.2,  roughness: 0.1,  envMapIntensity: 1.5, bumpScale: 0.002 },
    { id: 1, name: 'Gloss Bronze',    displayName: 'Gloss Bronze',    hex: '#4a3d2e', threeHex: 0x382F25, metalness: 0.3,  roughness: 0.1,  envMapIntensity: 3.5, bumpScale: 0.0002 },
    { id: 2, name: 'Textured Bronze', displayName: 'Textured Bronze', hex: '#5a4d3e', threeHex: 0x382F25, metalness: 0.2,  roughness: 0.05, envMapIntensity: 3.5, bumpScale: 0.002 },
    { id: 0, name: 'Textured Khaki',  displayName: 'Textured Khaki',  hex: '#b8ac9f', threeHex: 0xB8AC9F, metalness: 0.2,  roughness: 0.05, envMapIntensity: 2,   bumpScale: 0.002 },
    { id: 7, name: 'Silver',          displayName: 'Silver',          hex: '#a8adb5', threeHex: 0xFFFFFF, metalness: 0.7,  roughness: 0.2,  envMapIntensity: 3.2, bumpScale: 0.001 },
];

export var FENCE_HEIGHTS = [
    { id: '48', label: '48"' },
    { id: '54', label: '54"' },
    { id: '60', label: '60"' },
    { id: '72', label: '72"' },
];

export var FENCE_TOOL_STYLES = [
    {
        id: 'uaf_200', code: 'UAF-200', name: 'Horizon', subtitle: 'Flat Top',
        stlI: 'f2', cat: 'f', mod: '200', pi: '200',
        hasFinials: false, isSpear: false, isFlush: false,
        supports3D: true,
        acc: ['cir', 'but', 'scr', 'pup'],
    },
    {
        id: 'uaf_250', code: 'UAF-250', name: 'Vanguard', subtitle: 'Flat Top w/ Spears',
        stlI: 'f2', cat: 'f', mod: '250', pi: '250',
        hasFinials: true, isSpear: false, isFlush: false, isVanguard: true,
        supports3D: true,
        acc: ['cir', 'but', 'scr', 'pup'],
    },
    {
        id: 'uaf_201', code: 'UAF-201', name: 'Horizon Pro', subtitle: 'Flat Top 1-1/2" Spacing',
        stlI: 'f2', cat: 'f', mod: '201', pi: '201',
        hasFinials: false, isSpear: false, isFlush: false, isPro: true,
        supports3D: true,
        acc: ['cir', 'but'],
    },
    {
        id: 'uab_200', code: 'UAB-200', name: 'Haven', subtitle: 'Flat Top Flush',
        stlI: 'b2', cat: 'b', mod: '200', pi: '200',
        hasFinials: false, isSpear: false, isFlush: true,
        supports3D: true,
        acc: ['cir', 'but', 'scr', 'pup'],
    },
    {
        id: 'uas_100', code: 'UAS-100', name: 'Charleston', subtitle: 'Spear Top',
        stlI: 's1', cat: 's', mod: '100', pi: '100',
        hasFinials: true, isSpear: true, isFlush: false,
        supports3D: true,
        acc: ['cir', 'but', 'scr', 'pup'],
    },
    {
        id: 'uas_150', code: 'UAS-150', name: 'Savannah', subtitle: 'Staggered Spear',
        stlI: 's1', cat: 's', mod: '150', pi: '100',
        hasFinials: true, isSpear: true, isFlush: false, isStaggered: true,
        supports3D: true,
        acc: ['cir', 'but', 'scr', 'pup'],
    },
    {
        id: 'uas_101', code: 'UAS-101', name: 'Charleston Pro', subtitle: 'Spear Top 1-1/2" Spacing',
        stlI: 's1', cat: 's', mod: '100', pi: '101',
        hasFinials: true, isSpear: true, isFlush: false, isPro: true,
        supports3D: true,
        acc: [],
    },
    {
        id: 'uas_300', code: 'UAS-300', name: 'Cambridge', subtitle: 'Concave',
        stlI: 's1', cat: 's', mod: '300', pi: '100',
        hasFinials: true, isSpear: true, isFlush: false,
        supports3D: true,
        acc: ['cir', 'but', 'scr', 'pup'],
    },
    {
        id: 'uas_350', code: 'UAS-350', name: 'Lexington', subtitle: 'Convex',
        stlI: 's1', cat: 's', mod: '350', pi: '100',
        hasFinials: true, isSpear: true, isFlush: false,
        supports3D: true,
        acc: ['cir', 'but', 'scr', 'pup'],
    },
    {
        id: 'uap_100', code: 'UAP-100', name: 'Solace', subtitle: 'Aluminum Privacy',
        stlI: 'p', cat: 'p', mod: 'p', pi: 'p',
        hasFinials: false, isSpear: false, isFlush: false, isPrivacy: true,
        supports3D: false, renderMode: 'overlay',
        acc: [],
        privacyPostColors: [
            { id: 'black',   name: 'Textured Black',  hex: '#0a0a0a' },
            { id: 'white',   name: 'Textured White',  hex: '#f0f0f0' },
            { id: 'bronze',  name: 'Textured Bronze', hex: '#5a4d3e' },
            { id: 'khaki',   name: 'Textured Khaki',  hex: '#b8ac9f' },
            { id: 'silver',  name: 'Silver',          hex: '#a8adb5' },
        ],
        privacyPanelColors: [
            { id: 'white',   name: 'Textured White',  hex: '#f0f0f0' },
            { id: 'khaki',   name: 'Textured Khaki',  hex: '#b8ac9f' },
        ],
    },
];

export var FENCE_FINIALS = [
    { id: 's', name: 'Spear' },
    { id: 't', name: 'Triangle' },
    { id: 'q', name: 'Quad' },
];

export function getFenceModelPath(type, config) {
    var styleDef = FENCE_TOOL_STYLES.find(function(s) { return s.id === config.styleId; });
    if (!styleDef) return null;

    var stlI = styleDef.stlI;
    var cat = styleDef.cat;
    var pi = styleDef.pi;
    var mod = styleDef.mod;
    var rawFin = config.finialType || 'fs';
    var finT = rawFin.length > 1 ? rawFin.slice(1) : rawFin;
    if (finT === 'p') finT = 's';
    var hasCir = config.accessories && config.accessories.cir;

    switch (type) {
        case 'postTop':     return FENCE_MODEL_BASE + '0/pot.json';
        case 'postBot':     return FENCE_MODEL_BASE + '0/pob.json';
        case 'railTop':     return FENCE_MODEL_BASE + '1/rt' + stlI + (hasCir ? 'c' : '') + '.json';
        case 'gsRailTop':   return FENCE_MODEL_BASE + '1/gsrt' + stlI + (hasCir ? 'c' : '') + '.json';
        case 'railBot':     return FENCE_MODEL_BASE + '2/rbs.json';
        case 'gsRailBot':   return FENCE_MODEL_BASE + '2/grbs.json';
        case 'picketTop':
            var ptI = 'pt' + cat + pi;
            if (hasCir && pi === '201') ptI += 'c';
            return FENCE_MODEL_BASE + '3/' + ptI + '.json';
        case 'gsPicketTop':
            var gsPtI = 'gspt' + cat + pi;
            if (hasCir && pi === '201') gsPtI = 'gspt' + cat + pi + 'c';
            return FENCE_MODEL_BASE + '3/' + gsPtI + '.json';
        case 'picketBot':
            return FENCE_MODEL_BASE + '4/' + ((pi === '201' || pi === '101') ? 'pbd' : 'pbs') + '.json';
        case 'gsPicketBot':
            return FENCE_MODEL_BASE + '4/' + ((pi === '201' || pi === '101') ? 'gpbd' : 'gpbs') + '.json';
        case 'postCap':     return FENCE_MODEL_BASE + '8/' + (config.postCap || 'pcf') + '.json';
        case 'finial':      return FENCE_MODEL_BASE + '5/fn' + mod + finT + '.json';
        case 'gsFinial':
            var gsMod = (mod === '150' || mod === '300' || mod === '350') ? '100' : mod;
            return FENCE_MODEL_BASE + '5/gsfn' + gsMod + finT + '.json';
        case 'puppy':       return FENCE_MODEL_BASE + '6/' + (config.pupType || 'pupcl') + '.json';
        case 'gsPuppy':     return FENCE_MODEL_BASE + '6/g' + (config.pupType || 'pupcl') + '.json';
        case 'circle':      return FENCE_MODEL_BASE + '8/accir.json';
        case 'gsCircle':    return FENCE_MODEL_BASE + '8/gsaccir.json';
        case 'butterfly':   return FENCE_MODEL_BASE + '8/acbut.json';
        case 'gsButterfly': return FENCE_MODEL_BASE + '8/gsacbut.json';
        case 'scroll':      return FENCE_MODEL_BASE + '8/acscr.json';
        default: return null;
    }
}
