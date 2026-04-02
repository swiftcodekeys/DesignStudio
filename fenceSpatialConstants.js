// ============================================================
// fenceSpatialConstants.js — Fence spatial data from Ultra
// Extracted via Playwright from Ultra's live fence tool 2026-03-31
// Source of truth: FENCE_SPATIAL_TRUTH.json
// ============================================================

// ---- POST POSITIONS (poArr from Ultra) ----
// 5 positions: 2 front-facing (r=0) + 3 side-facing (r=-90)
export var PO_ARR = [
    { r: 0,   x: 1.8288, y: 0, z: 0 },
    { r: 0,   x: 0,      y: 0, z: 0 },
    { r: -90, x: 0,      y: 0, z: 0 },
    { r: -90, x: 0,      y: 0, z: 1.8288 },
    { r: -90, x: 0,      y: 0, z: 4.9911 },
];

// ---- POST CAP POSITIONS (pcPo from Ultra) ----
// 7 positions: includes both sides of gate section gap
export var PC_PO = [
    { r: 0,   x: 1.8288, y: 0, z: 0 },
    { r: 0,   x: 0,      y: 0, z: 0 },
    { r: -90, x: 0,      y: 0, z: 1.8288 },
    { r: -90, x: 0,      y: 0, z: 3.6576 },
    { r: -90, x: 0,      y: 0, z: 3.7465 },
    { r: -90, x: 0,      y: 0, z: 4.9022 },
    { r: -90, x: 0,      y: 0, z: 4.9911 },
];

// ---- GATE SECTION ----
export var GATE_Z = 3.7465;
export var GATE_ROT = -90;  // degrees

// ---- HEIGHT OFFSETS (tY values) ----
export var HEIGHT_TY = {
    '48': -0.6096,
    '54': -0.4572,
    '60': -0.3048,
    '72': 0,
};

// ---- CLIPPING PLANES ----
// Fence uses non-normalized normals of ±0.9144 (36 inches)
// Gate uses ±0.735 — these are DIFFERENT
export var CLIP_NORMAL = 0.9144;

// ---- CAMERA POSITIONS ----
export var CAMERA_FRONT = {
    x: -7.05, y: 1.42, z: -1.85,
    ry: -120,  // degrees
};
export var CAMERA_BACK = {
    x: 7.7, y: 1.5, z: 10,
    ry: 45,  // degrees
};
export var CAMERA_FOV = 40;
export var CAMERA_ZOOM = 1.788;

// ---- BOTTOM RAIL Y ----
export var BOTTOM_RAIL_Y_DEFAULT = 0;
export var BOTTOM_RAIL_Y_BACK = -0.099;

// ---- ACCENT Y OFFSETS (from mvY function) ----
export var ACCENT_Y = {
    flat_default: 0,           // gract.position.y = tY + 0 (circles/butterflies)
    spear_offset: -0.1524,     // gract.position.y = tY - 0.1524
};

export var SCROLL_Y = {
    flat_front_no_circles:   -0.035,   // gracs.y = (tY/2) + this
    flat_front_with_circles: -0.015,
    spear_front_no_circles:  -0.125,
    spear_front_with_circles:-0.100,
    back_additional:         -0.030,   // added when view=back
};

// ---- FINIAL Y ----
export var FINIAL_Y = 0.025;         // all styles except Vanguard
export var FINIAL_Y_VANGUARD = 0;    // UAF-250 has no Y offset
export var PUPPY_FINIAL_GROUP_Y = 0.025;

// ---- FENCE PUPPY FINIAL POSITIONS ----
// Per-panel relative X positions extracted from Ultra's pupcl.json vertex data.
// 16 finial-eligible picket centers within a single 1.8288m fence panel.
// Spacing: ~0.111m (4.37") center-to-center, matching gate tool picket spacing.
// Edge pickets (0.031m, 1.797m) excluded — those are rail-end geometry, not full pickets.
// Format: [x, y, z] relative to panel origin. Y=0 for non-staggered, -0.038 alternating for staggered.
export var FENCE_PUPPY_FINIAL_POSITIONS = {
    standard: [
        [0.0815,0,0],[0.1925,0,0],[0.3035,0,0],[0.4145,0,0],
        [0.5255,0,0],[0.6365,0,0],[0.7485,0,0],[0.8595,0,0],
        [0.9705,0,0],[1.0815,0,0],[1.1925,0,0],[1.3035,0,0],
        [1.4145,0,0],[1.5255,0,0],[1.6375,0,0],[1.7485,0,0],
    ],
    staggered: [
        [0.0815,0,0],[0.1925,-0.038,0],[0.3035,0,0],[0.4145,-0.038,0],
        [0.5255,0,0],[0.6365,-0.038,0],[0.7485,0,0],[0.8595,-0.038,0],
        [0.9705,0,0],[1.0815,-0.038,0],[1.1925,0,0],[1.3035,-0.038,0],
        [1.4145,0,0],[1.5255,-0.038,0],[1.6375,0,0],[1.7485,-0.038,0],
    ],
};
// Puppy finial Y offset above rail (Ultra: r3y + 0.076)
export var FENCE_PUPPY_FINIAL_OFFSET_Y = 0.076;

// ---- SCROLL GATE SECTION Z OFFSET ----
export var SCROLL_GATE_Z_OFFSET = -0.340;  // gate scroll at gZ - 0.340

// ---- BACK YARD LAYOUT (different panel arrangement) ----
// Back yard: long run left of gate, 1 panel right of gate, corner turn toward pool
// Offset baked in: x=-0.20, z=-3.20 (from debug positioning session 2026-03-31)
var BK_OX = -0.20;
var BK_OZ = -3.20;

// Panel width = 1.8288m. Gate at Z=3.7465 local → Z=0.55 world (aligns with walkway)
export var PO_ARR_BACK = [
    // Side panels (r=-90) running left-to-right along Z
    { r: -90, x: 0 + BK_OX, y: 0, z: -1.8288 + BK_OZ },  // far left
    { r: -90, x: 0 + BK_OX, y: 0, z: 0 + BK_OZ },
    { r: -90, x: 0 + BK_OX, y: 0, z: 1.8288 + BK_OZ },
    { r: -90, x: 0 + BK_OX, y: 0, z: 4.9911 + BK_OZ },   // 1 panel right of gate
    // Corner turn: front-facing panels (r=0) going toward camera
    { r: 0,   x: 0 + BK_OX, y: 0, z: 4.9911 + BK_OZ },   // corner post (shared)
    { r: 0,   x: 1.8288 + BK_OX, y: 0, z: 4.9911 + BK_OZ }, // pool-side panel end
];

export var PC_PO_BACK = [
    // Post caps for back yard layout
    { r: -90, x: 0 + BK_OX, y: 0, z: -1.8288 + BK_OZ },  // far left
    { r: -90, x: 0 + BK_OX, y: 0, z: 0 + BK_OZ },
    { r: -90, x: 0 + BK_OX, y: 0, z: 1.8288 + BK_OZ },
    { r: -90, x: 0 + BK_OX, y: 0, z: 3.6576 + BK_OZ },   // left of gate
    { r: -90, x: 0 + BK_OX, y: 0, z: 3.7465 + BK_OZ },   // right of gate
    { r: -90, x: 0 + BK_OX, y: 0, z: 4.9911 + BK_OZ },   // corner
    { r: 0,   x: 1.8288 + BK_OX, y: 0, z: 4.9911 + BK_OZ }, // pool-side end
];

export var GATE_Z_BACK = 3.7465 + BK_OZ;
export var GATE_ROT_BACK = -90;
