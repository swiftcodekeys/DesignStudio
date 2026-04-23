# Fence Tool 3D Configurator — Project Manifest

## Project Overview
Convert the static PNG fence overlay tool into a real 3D rendered configurator matching the
existing gate tool quality. Uses the same React + Three.js r86 stack and UI design system.

Working repo: `C:\Users\sarah\Desktop\App Repos\fence-tool` (GitHub: fence-tool-march)

---

## Execution Order & Dependencies

```
01-asset-download ──┐
                    ├──> 02-fence-renderer ──> 03-styles-and-options ──> 04-ui-and-integration
                    │
(no code deps, just files needed by 02)
```

- **01** has no dependencies — pure asset acquisition
- **02** depends on 01 (needs model/texture files)
- **03** depends on 02 (needs working renderer to add styles)
- **04** depends on 03 (needs all styles working to wire UI)

---

## SPLIT_MANIFEST

### 01-asset-download
**Goal:** Download all fence model files, HDR textures, backgrounds, and overlay images from Ultra's
live fence tool using Playwright. Organize into `fence_tool/` directory structure matching Ultra's paths.

**Scope:**
- ~11 JSON model files (posts, rails, pickets, gate-section variants) from m/0 through m/4
- Post cap model from m/8
- Finial models from m/5 (~10 files for all style/finial type combos)
- Puppy models from m/6 (~6 files)
- Puppy finial models from m/7 (~6 files)
- Accent models from m/8 (accir, acbut, acscr + gs variants)
- HDR cubemaps for front yard (6 files) and back yard (6 files)
- Background images: fb.jpg (front), bb.jpg (back)
- Foreground overlay PNGs: ffs, ffd, fff, ffp, ffplt (front), bfp, bff (back)
- Fence style thumbnails for UI
- Verify every downloaded file loads correctly in Three.js r86

**Deliverable:** `fence_tool/` directory with all assets, plus MANIFEST.json listing every file.

**Validation:** User confirms files exist and basic Three.js JSONLoader test passes.

---

### 02-fence-renderer
**Goal:** Build FenceRenderer.js — a working 3D fence renderer that displays UAF-200 Flat Top
(the simplest style) with posts, rails, pickets, post caps, height control, and color switching.

**Scope:**
- Create `FenceRenderer.js` (new file, based on GateRenderer.js patterns but fence-specific)
- Panel repetition system using poArr (5 positions with rotation)
- Gate section integration (gs prefix models at Z=3.7465, rotation -90°)
- Post top/bottom split loading (pot.json / pob.json)
- Rail loading: top (rtf2.json + gsrtf2.json) and bottom (rbs.json + grbs.json)
- Picket loading: top (ptf200.json + gsptf200.json) and bottom (pbs.json + gpbs.json)
- Post cap loading (pcf.json at pcPo positions)
- Clipping system with ±0.9144 normals
- 4 heights: 48", 54", 60", 72" (72" disables clipping)
- mvY() positioning: top groups at tY, bottom groups at 0
- Front/back yard camera switching
- HDR environment map loading (front + back yard variants)
- Bump map loading
- 8 aluminum fence colors with fence-specific PBR values
- Background image (fb.jpg / bb.jpg behind canvas)
- Create `fenceConfigData.js` with fence styles, colors, model path resolution
- Create `fenceSpatialConstants.js` with poArr, pcPo, clipping values, height offsets
- Create `FENCE_SPATIAL_TRUTH.json` with all verified fence spatial values
- Update `UnifiedCanvas.js` to route to FenceRenderer when scene=fence

**NOT in scope:** Finials, accents, puppy pickets, pro spacing, staggered styles, foreground overlays.

**Validation checkpoints (one at a time):**
1. Posts render at correct positions (5 posts in L-shape)
2. Rails render at all post positions + gate section
3. Pickets render with correct clipping (top/bottom split)
4. Height switching works (48/54/60/72)
5. Color switching works with fence PBR values
6. Front/back yard camera switch works
7. Post caps render at all 7 pcPo positions

**Deliverable:** UAF-200 Flat Top fence rendering correctly at all heights and colors, both views.

---

### 03-styles-and-options
**Goal:** Add all 8 remaining aluminum fence styles and all accessories/options.

**Scope (build order — one style at a time, validate each before next):**

**Phase A — Spear styles:**
1. UAS-100 Charleston (spear top) — adds finials (fn100{s/t/q/p}.json at Y=0.025),
   spear accent offset (tY - 0.1524), fsv concept doesn't apply same way as gate
2. UAS-150 Savannah (staggered spear) — staggered finial Y positions
3. UAS-101 Charleston Pro — pro spacing (pbd.json bottom pickets)

**Phase B — Remaining flat styles:**
4. UAF-250 Vanguard (flat w/ spears) — finials with f250 offset, alternating picket heights
5. UAF-201 Horizon Pro — pro spacing pickets
6. UAB-200 Haven (flush) — forced 48" height, bottom rail at -0.099

**Phase C — Fence-only styles:**
7. UAS-300 Concave (Cambridge) — concave picket top model, fence-only
8. UAS-350 Convex (Lexington) — convex picket top model, fence-only

**Phase D — Accessories (across all applicable styles):**
9. Circle accents (accir.json + gsaccir.json)
10. Butterfly accents (acbut.json + gsacbut.json)
11. Scroll accents (acscr.json) with fence-specific Y formulas
12. Puppy pickets (m/6/ models) — standard, flush, classic
13. Puppy finials (m/7/ models) — for classic puppy variants

**Validation:** Each style/accessory validated against Ultra's live fence tool before moving to next.

**Deliverable:** All 9 aluminum styles rendering correctly with all accessories.

---

### 04-ui-and-integration
**Goal:** Wire the fence renderer into the full UI with FloatingPanel tabs, TopNav scene switching,
and all user controls.

**Scope:**
- TopNav: Add "Yard Fencing" tab that switches to fence scene (alongside existing "Driveway Gates")
- FloatingPanel tabs for fence:
  - Style tab (9 aluminum styles with thumbnail cards)
  - Color tab (8 colors with swatches)
  - Size tab (48/54/60/72" height selector)
  - Options tab (finial type, post cap, puppy pickets, accents)
  - View Options tab (front yard / back yard toggle)
  - Details tab (current configuration summary)
  - Quote tab (Get Quote form)
- URL hash persistence for fence configuration
- localStorage persistence
- Save Image button (screenshot canvas)
- Foreground overlay system (grass/sidewalk PNG overlays)
- Background image switching (front/back)
- Backlinks footer updated for fence product pages
- Social proof pill (same as gate tool)
- Style feature gating (hide unavailable options per style)

**NOT in scope:** Privacy styles, canvas texture maps, mobile responsive, PDF download.

**Validation:** Full end-to-end testing of all styles × heights × colors × options × views.

**Deliverable:** Complete fence configurator tool integrated with existing gate tool under shared nav.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Fence models not downloadable from Ultra | Blocks everything | Download in split 01, verify early |
| UAS-300/350 models may need special geometry | Delays split 03 | Test these models first in isolation |
| Clipping normal difference (0.9144 vs 0.735) causes rendering artifacts | Visual bugs | Validate against Ultra at each checkpoint |
| Three.js r86 limitations | Unexpected blockers | Same version as working gate tool — proven stack |
| Fence PBR values look different than expected | Visual quality | Compare screenshots vs Ultra at each color |

## Estimated Effort
- Split 01: Small (scripted download + verification)
- Split 02: Large (new renderer, most complex code)
- Split 03: Medium-Large (9 styles but pattern is established from 02)
- Split 04: Medium (UI wiring, mostly adapting existing gate UI code)
