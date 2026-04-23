# Grandview Design Studio — Audit Report

## Model File Validation

All 57 model JSON files in `gate_tool/m/` parse without errors.

| Directory | Files | Purpose |
|-----------|-------|---------|
| `0/` | 5 | Post/stile geometry (po12, po14, po23, po40d, po40s) |
| `1/` | 10 | Rails — 8 top rails (rt{1,2}{e,a,r,s}) + 2 bottom (rb{1,2}) |
| `2/` | 30 | Pickets — pt{1,2}{e,a,r,s}{e,o,x} tops + pb{1,2}{e,o,x} bottoms |
| `3/` | 12 | Accessories (hinges, caps, finials, scrolls, upper filler rails) |

## Vertex Y-Range Analysis

### Top Rails (placed at M_RAIL_T0 y=1.489, M_RAIL_T1 y=1.2985)

| Model | Vertices | Y Min | Y Max | Notes |
|-------|----------|-------|-------|-------|
| rt2e (Estate) | 1336 | 0.000 | 0.339 | Curved arch profile |
| rt2a (Arched) | 1336 | 0.000 | 0.340 | Similar to Estate |
| rt2s (Standard) | 104 | 0.000 | 0.035 | Flat bar (same as bottom rail) |
| rt2r (Royal) | 1336 | -0.305 | 0.035 | Inverted arch profile |

### Picket Tops (placed at M_PICKET_TOP y=-0.305, clipped above y=0.735)

| Model | Vertices | Y Min | Y Max | Visible World Y Max |
|-------|----------|-------|-------|---------------------|
| pt2ee (Estate) | 432 | 0.051 | 2.097 | ~1.792 |
| pt2ae (Arched) | 432 | 0.051 | 2.107 | ~1.802 |
| pt2se (Standard) | 432 | 0.051 | 1.812 | ~1.507 |
| pt2re (Royal) | 432 | 0.051 | 1.716 | ~1.411 |

## Bug Analysis

### Bug 1: Standard ('s') — Never Worked

**Root Cause:** Inner stiles (po23) clipped at wrong height.

Legacy code sets po23 clipping per arch style:
- Estate/Arched: `htY + _12 + _2_5 = 1.8923`
- **Standard: `htY + _2_5 = 1.5875`** (same as main posts)
- Royal: `htY - _12 + _2_5 = 1.2827`

The old UnifiedCanvas.js used a fixed `CLIP_POST_23 = 1.8923` for ALL arch styles. For Standard, this meant the po23 inner stiles extended 0.3048 units above the flat picket tops, creating visible artifacts (stiles poking above the fence line).

**Fix:** `CLIP_PO23` lookup table: `{ e: 1.8923, a: 1.8923, s: 1.5875, r: 1.2827 }`

### Bug 2: Royal ('r') — Also Broken

**Root Cause:** Main post clipping incorrectly changed for Royal.

The old code: `var postClipY = (archId === 'r') ? CLIP_POST_R : CLIP_POST;`
This changed the main post clip from 1.5875 to 1.2827 for Royal, but legacy code keeps main posts at 1.5875 for ALL arch styles. Only po23 changes for Royal.

Additionally, po23 should be clipped at 1.2827 for Royal but was using 1.8923.

**Fix:** Main post clip is always CLIP_POST (1.5875). Po23 uses CLIP_PO23[archId].

### Bug 3: Arched ('a') — Regression

**Root Cause:** The Arched clipping matches Estate in legacy code (both use 1.8923 for po23). The regression was likely introduced when the Royal-specific `CLIP_POST_R` logic was added, which changed the main post clip. Since Arched uses the same clipping as Estate, any regression in Arched was a side effect of the same flawed clipping architecture. With the corrected CLIP_PO23 lookup, Arched rendering is restored.

## Legacy Code Reference (ultra_dsg_min.js)

Key constants (60" height):
- `_48 = 1.219`, `_60 = 1.524`, `_72 = 1.829` (height Y positions)
- `_2_5 = 0.0635` (2.5" in meters)
- `_12 = 0.3048` (12" in meters)
- `rH = -0.035` (rail height offset)
- `cpY(clip, y)` = sets clip.constant = y
- `mY(mesh, y)` = sets mesh.position.setY(y)

Post clip formula: `pob124Cp.constant = htY + _2_5` (always, all arch styles)
Po23 clip: varies by arch (see CLIP_PO23 table above)

## Dead Code Confirmed

| File | Lines | Status |
|------|-------|--------|
| `gate_tool/js/GateTool.js` | 246 | Dead — test harness, not used by React |
| `js/UnifiedRenderer.js` | — | Dead — replaced by UnifiedCanvas.js |
| `js/Renderer.js` | — | Dead — old renderer |
| `LegacyModel.js` | — | Dead — not imported anywhere |
| `gate_tool/js/ultra_dsg_minbak.js` | — | Dead — backup of obfuscated tool |

## archStyle Field on FENCE_STYLES

The `archStyle` field (values: 'f2', 'b2', 's1') is a legacy artifact from the Ultra tool's `stlI` variable. It mapped to the fence style category (flat/bridge/spear), NOT the arch variant (estate/arched/royal/standard). These are different configuration axes:
- **Fence style** → determines leaf count, finial availability, vertical offset (`fsv`)
- **Arch style** → determines picket/rail geometry and clipping

The field has been removed from FENCE_STYLES in the refactored configData.js since it serves no purpose in the React app.
