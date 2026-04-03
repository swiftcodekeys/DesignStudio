# Split 02: FenceRenderer.js — Core 3D Fence Rendering

## Objective
Build a working 3D fence renderer that displays UAF-200 Flat Top at all heights, colors, and
camera views. This is the foundation that all other styles build on.

## Architecture

### New Files to Create
| File | Purpose |
|------|---------|
| `FenceRenderer.js` | Pure Three.js fence renderer (no React), mirrors GateRenderer pattern |
| `fenceConfigData.js` | Fence styles, colors, model path resolution |
| `fenceSpatialConstants.js` | poArr, pcPo, clipping values, height offsets, camera positions |
| `FENCE_SPATIAL_TRUTH.json` | Verified ground truth for all fence spatial values |

### Files to Modify
| File | Change |
|------|--------|
| `UnifiedCanvas.js` | Add fence scene routing (detect when TopNav fence tab active) |
| `app.js` | Add fence config state alongside gate config |

### Files NOT Modified (gate tool untouched)
- `GateRenderer.js` — no changes
- `spatialConstants.js` — no changes
- `configData.js` — no changes (fence has its own)

## FenceRenderer.js — Detailed Design

### Constructor: `FenceRenderer(container)`
```
1. Create THREE.Scene
2. Create PerspectiveCamera (fov=40, zoom=1.788, near=1, far=100)
   - Default to front yard: position(-7.05, 1.42, -1.85), rotation.y=-120°, order=YXZ
3. Create WebGLRenderer (antialias, alpha, localClippingEnabled=true)
4. Create AmbientLight(0xffffff, 0.5)
5. Create clipping planes:
   - postTop: normal(0, 0.9144, 0), constant=-0.9144
   - postBot: normal(0, -0.9144, 0), constant=0.9144
   - picketTop: normal(0, 0.9144, 0), constant=-0.9144
   - picketBot: normal(0, -0.9144, 0), constant=0.9144
6. Create fence root Group
7. Load HDR env map (hdr_fr/ for front, hdr_ba/ for back)
8. Load bump map
9. Start render loop
```

### Method: `buildFence(config)`
```
config = {
  styleId: 'uaf_200',
  height: '48',        // '48'|'54'|'60'|'72'
  color: { ... },      // PBR color object
  view: 'fr',          // 'fr'|'ba' (front/back yard)
  finial: null,        // finial type ID
  postCap: 'pcf',      // post cap ID
  accessories: {},      // {cir, but, scr, pup, pupType}
}

Steps:
1. Clear fence group children
2. Look up tY from height (y48=-0.6096, y54=-0.4572, y60=-0.3048, y72=0)
3. Set camera position for view (front/back)
4. Set clipping: if height=='72' disable, else enable
5. Load and place components using poArr repetition:

   For each component type:
   a. Load model JSON
   b. For each position in poArr:
      - Create mesh
      - Set position(pos.x, pos.y, pos.z)
      - Set rotation.y = pos.r * PI/180
      - Apply material
      - Add to component group
   c. Load gate section variant (gs prefix)
      - Position at (0, 0, gZ=3.7465)
      - Rotation.y = gRot=-90 * PI/180
      - Add to same group
   d. Set group.position.y = tY (for top groups) or 0 (for bottom groups)
   e. Add group to fence root
```

### Component Loading Order (matches Ultra's fseq)
```
1. dpo()  — Posts: pot.json (top group at tY), pob.json (bottom group at 0)
2. dpc()  — Post caps: pcf.json at pcPo positions (7 caps), group at tY
3. drt()  — Top rails: rtf2.json at poArr + gsrtf2.json at gZ, group at tY
4. drb()  — Bottom rails: rbs.json at poArr + grbs.json at gZ, group at 0 (or -0.099 for back)
5. dpb()  — Picket bottoms: pbs.json at poArr + gpbs.json at gZ, group at 0, clipped
6. dpt()  — Picket tops: ptf200.json at poArr + gsptf200.json at gZ, group at tY, clipped
```

### Materials (7 slots matching Ultra)
| Material | Clipping | Used For |
|----------|----------|----------|
| matPot | postTop clip | Post top halves |
| matPob | postBot clip | Post bottom halves |
| mat_1 | none | Rails (unclipped) |
| mat_1t | picketTop clip | Picket top halves |
| mat_1b | picketBot clip | Picket bottom halves |
| mat_3 | none | Post caps, finials |
| mat_act | none | Accents (circles, butterflies) |

All materials: MeshStandardMaterial with PBR values from fence color array.

### Height Positioning (from Ultra's mvY function)
```javascript
// Top groups move with tY:
grpot.position.y = tY;   // post tops
grpc.position.y = tY;    // post caps
grrt.position.y = tY;    // top rails
grpt.position.y = tY;    // picket tops

// Bottom groups stay at ground:
grpob.position.y = 0;    // post bottoms
grpb.position.y = 0;     // picket bottoms
grrb.position.y = (view=='ba' || style=='b2') ? -0.099 : 0;  // bottom rails

// 72" height: disable clipping entirely
if (height == '72') renderer.localClippingEnabled = false;
else renderer.localClippingEnabled = true;
```

## FENCE_SPATIAL_TRUTH.json — Key Values

All values extracted via Playwright from Ultra's live fence tool on 2026-03-31.

```json
{
  "poArr": [
    {"r": 0,   "x": 1.8288, "y": 0, "z": 0},
    {"r": 0,   "x": 0,      "y": 0, "z": 0},
    {"r": -90, "x": 0,      "y": 0, "z": 0},
    {"r": -90, "x": 0,      "y": 0, "z": 1.8288},
    {"r": -90, "x": 0,      "y": 0, "z": 4.9911}
  ],
  "pcPo": [
    {"r": 0,   "x": 1.8288, "y": 0, "z": 0},
    {"r": 0,   "x": 0,      "y": 0, "z": 0},
    {"r": -90, "x": 0,      "y": 0, "z": 1.8288},
    {"r": -90, "x": 0,      "y": 0, "z": 3.6576},
    {"r": -90, "x": 0,      "y": 0, "z": 3.7465},
    {"r": -90, "x": 0,      "y": 0, "z": 4.9022},
    {"r": -90, "x": 0,      "y": 0, "z": 4.9911}
  ],
  "gate_section": {
    "z": 3.7465,
    "rotation_deg": -90,
    "prefix": "gs"
  },
  "clipping_normal": 0.9144,
  "heights": {
    "48": -0.6096,
    "54": -0.4572,
    "60": -0.3048,
    "72": 0
  },
  "cameras": {
    "front": {"x": -7.05, "y": 1.42, "z": -1.85, "ry_deg": -120},
    "back":  {"x": 7.7,   "y": 1.5,  "z": 10,    "ry_deg": 45}
  },
  "bottom_rail_y": {
    "front_default": 0,
    "back_or_flush": -0.099
  }
}
```

## Fence Color Array (PBR values differ from gate)

```javascript
export var FENCE_COLORS = [
  { id: 0, name: 'Textured Khaki',  displayName: 'Beige',        hex: '#b8ac9f', threeHex: 0xB8AC9F, metalness: 0.2, roughness: 0.05, envMapIntensity: 2,   bumpScale: 0.002 },
  { id: 1, name: 'Gloss Bronze',    displayName: 'Bronze',       hex: '#382f25', threeHex: 0x382F25, metalness: 0.3, roughness: 0.1,  envMapIntensity: 3.5, bumpScale: 0.0002 },
  { id: 2, name: 'Textured Bronze', displayName: 'Satin Bronze', hex: '#382f25', threeHex: 0x382F25, metalness: 0.2, roughness: 0.05, envMapIntensity: 3.5, bumpScale: 0.002 },
  { id: 3, name: 'Gloss White',     displayName: 'White',        hex: '#e4e4e4', threeHex: 0xE4E4E4, metalness: 0.2, roughness: 0.1,  envMapIntensity: 1.5, bumpScale: 0.0001 },
  { id: 4, name: 'Textured White',  displayName: 'Satin White',  hex: '#f2f2f2', threeHex: 0xF2F2F2, metalness: 0.2, roughness: 0.1,  envMapIntensity: 1.5, bumpScale: 0.002 },
  { id: 5, name: 'Gloss Black',     displayName: 'Black',        hex: '#020202', threeHex: 0x020202, metalness: 0.05,roughness: 0.02, envMapIntensity: 12,  bumpScale: 0.0001 },
  { id: 6, name: 'Textured Black',  displayName: 'Satin Black',  hex: '#0c0c0c', threeHex: 0x0C0C0C, metalness: 0.05,roughness: 0.06, envMapIntensity: 6,   bumpScale: 0.0003 },
  { id: 7, name: 'Silver',          displayName: 'Silver',       hex: '#ffffff', threeHex: 0xFFFFFF, metalness: 0.7, roughness: 0.2,  envMapIntensity: 3.2, bumpScale: 0.001 },
];
```

## Validation Checklist (Sequential — stop at first failure)

1. **Posts render** — 5 posts visible, 2 front-facing + 3 side-facing at -90°
   - Compare post X/Z positions against Ultra's scene dump

2. **Rails render** — 2 rails per panel section + gate section rail
   - Top rails at tY, bottom rails at 0
   - Gate section rail at Z=3.7465 rotated -90°

3. **Pickets render** — Top/bottom picket halves clip correctly
   - At 48": top pickets clipped, visible portion matches Ultra
   - At 72": no clipping, full pickets visible

4. **Height works** — Switch between 48/54/60/72
   - tY values match: -0.6096, -0.4572, -0.3048, 0
   - 72" disables localClippingEnabled

5. **Colors work** — Switch between 8 colors
   - PBR values applied correctly to all 7 materials
   - Env map reflections visible

6. **Camera works** — Switch front/back yard
   - Front: position(-7.05, 1.42, -1.85), rotation.y=-120°
   - Back: position(7.7, 1.5, 10), rotation.y=45°

7. **Post caps render** — 7 caps at pcPo positions, at tY height
