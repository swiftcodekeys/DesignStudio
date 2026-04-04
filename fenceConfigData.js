// ============================================================
// fenceConfigData.js — Fence product configuration
// Extracted from Ultra's fence tool stlArr + cArr via Playwright
// ============================================================

var MODEL_BASE = 'fence_tool/m/';

// ---- FENCE COLORS (PBR values differ from gate) ----
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

// ---- FENCE HEIGHTS ----
export var FENCE_HEIGHTS = [
    { id: '48', label: '48"' },
    { id: '54', label: '54"' },
    { id: '60', label: '60"' },
    { id: '72', label: '72"' },
];

// ---- FENCE STYLES ----
export var FENCE_STYLES = [
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
        forcedHeight: '48',
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
        // Privacy has independent post/rail and panel color pickers
        // Overlay images at fence_tool/overlays/{front|back}/{post}-{panel}.png
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

// ---- FINIAL TYPES (no plug on fence — only s/t/q) ----
export var FENCE_FINIALS = [
    { id: 's', name: 'Spear' },
    { id: 't', name: 'Triangle' },
    { id: 'q', name: 'Quad' },
];

// ---- MODEL PATH RESOLUTION ----
export function getFenceModelPath(type, config) {
    var styleDef = FENCE_STYLES.find(function(s) { return s.id === config.styleId; });
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
        // Posts
        case 'postTop':     return MODEL_BASE + '0/pot.json';
        case 'postBot':     return MODEL_BASE + '0/pob.json';

        // Top rails
        case 'railTop':     return MODEL_BASE + '1/rt' + stlI + (hasCir ? 'c' : '') + '.json';
        case 'gsRailTop':   return MODEL_BASE + '1/gsrt' + stlI + (hasCir ? 'c' : '') + '.json';

        // Bottom rails
        case 'railBot':     return MODEL_BASE + '2/rbs.json';
        case 'gsRailBot':   return MODEL_BASE + '2/grbs.json';

        // Picket tops
        case 'picketTop':
            var ptI = 'pt' + cat + pi;
            if (hasCir && pi === '201') ptI += 'c';
            return MODEL_BASE + '3/' + ptI + '.json';
        case 'gsPicketTop':
            var gsPtI = 'gspt' + cat + pi;
            if (hasCir && pi === '201') gsPtI = 'gspt' + cat + pi + 'c';
            return MODEL_BASE + '3/' + gsPtI + '.json';

        // Picket bottoms
        case 'picketBot':
            return MODEL_BASE + '4/' + ((pi === '201' || pi === '101') ? 'pbd' : 'pbs') + '.json';
        case 'gsPicketBot':
            return MODEL_BASE + '4/' + ((pi === '201' || pi === '101') ? 'gpbd' : 'gpbs') + '.json';

        // Post caps
        case 'postCap':     return MODEL_BASE + '8/' + (config.postCap || 'pcf') + '.json';

        // Finials
        case 'finial':      return MODEL_BASE + '5/fn' + mod + finT + '.json';
        case 'gsFinial':
            // Staggered/concave/convex gate section finials use fn100 base
            var gsMod = (mod === '150' || mod === '300' || mod === '350') ? '100' : mod;
            return MODEL_BASE + '5/gsfn' + gsMod + finT + '.json';

        // Puppy pickets
        case 'puppy':       return MODEL_BASE + '6/' + (config.pupType || 'pupcl') + '.json';
        case 'gsPuppy':     return MODEL_BASE + '6/g' + (config.pupType || 'pupcl') + '.json';

        // Accents
        case 'circle':      return MODEL_BASE + '8/accir.json';
        case 'gsCircle':    return MODEL_BASE + '8/gsaccir.json';
        case 'butterfly':   return MODEL_BASE + '8/acbut.json';
        case 'gsButterfly': return MODEL_BASE + '8/gsacbut.json';
        case 'scroll':      return MODEL_BASE + '8/acscr.json';

        default: return null;
    }
}
