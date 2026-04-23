# Ultra Design Studio — Scrape Reconnaissance

**Date:** 2026-03-19
**Scraped by:** Playwright MCP via Claude Code

---

## Tools Discovered

Ultra has **3 separate design studio tools**, each at its own URL with its own JS bundle:

| Tool | URL | JS Bundle | Camera | Styles |
|------|-----|-----------|--------|--------|
| **Gate** | /design-studio/gates/index.html | ultra_dsg_min.js (75KB) | Perspective (fov=40) | 8 styles |
| **Fence** | /design-studio/fence/index.html | ultra_dsf_min.js | Perspective (fov=40) | 16 styles (11 aluminum + 2 privacy + 3 dividers) |
| **Fence Image** | /design-studio/fence-image/index.html | ultra_ds_fids.js + ultra_ds_ubj_fids.js | **Orthographic** | 17 styles |

All three use **Three.js r86**, same HDR/PMREM pipeline, same model format (JSON via JSONLoader).

---

## Asset Domains & CDN

All assets served from the **same domain**: `www.ultrafence.com/design-studio/{tool}/`
- No CDN, no S3 bucket — everything on their main server
- No authentication required
- No rate limiting detected during scrape
- Cache headers: standard browser caching

---

## Architecture Summary

### Gate Tool
- **Models:** 57 JSON files in m/{0,1,2,3}/ — posts, rails, pickets, finials, accents
- **Textures:** 64 files — HDR cubemap, bump map, AO, rail shadows, driveway shadows, foregrounds
- **Thumbnails:** 44 preloaded images for UI
- **Loading:** All thumbnails + textures preloaded upfront. Models loaded on-demand per style/option
- **Renderer:** WebGLRenderer with alpha, antialias, local clipping enabled
- **Scene:** 21 children (camera, light, 9 meshes, 10 groups)
- **UI:** jQuery + jQuery Mobile + iScroll

### Fence Tool
- **Models:** 11 JSON files — different naming from gate tool (pot, pob, rtf2, rbs, pbs, ptf200 + gs- variants)
- **Textures:** 22 files — separate HDR cubemaps for front/back yard, background images, overlays
- **Views:** Front Yard + Back Yard (camera position swap, different HDR/background)
- **Extra styles:** UAS-300 Concave (Cambridge), UAS-350 Convex (Lexington), 3 Privacy styles

### Fence Image Tool
- **Orthographic camera** — for compositing onto user photos
- **12 canvases** — multiple render targets
- **Extra models:** msk.json (mask), shd.json (shadow) for photo compositing
- **noUiSlider** — user-adjustable fence position/scale
- **2 JS bundles** vs 1 for the other tools

---

## What We Already Have Locally

Our repo at `gate_tool/` contains **ALL 57 gate model files** — confirmed 1:1 match with Ultra's server.

| Category | Ultra Count | Local Count | Status |
|----------|-------------|-------------|--------|
| Gate models (m/) | 57 | 57 | ✅ Complete |
| Gate textures (t/) | 64 | Present | ✅ Present |
| Gate thumbnails (th/) | 44 | Present | ✅ Present |
| Fence models | 11+ | Not present | ❌ Need to copy |
| Fence textures | 22 | Not present | ❌ Need to copy |
| Fence-image models | 13 | Not present | ❌ Need to copy |

---

## Key Findings

### 1. NO New Gate Model Files Needed
Style changes don't load new model files — they toggle visibility and apply transforms. Only 3 model SETS exist (f2, s1, b2), shared across all 8 styles. Switching between styles within the same set is purely a visibility/position operation.

### 2. Colors Are Material-Only (No Texture Swaps)
All 8 colors are applied via `dClr()` which sets hex, roughness, metalness, envMapIntensity, bumpScale on 9 materials. NO texture file swaps happen on color change. This means our renderer just needs the PBR values (now extracted).

### 3. Heights Are Clipping-Only (No Model Swaps)
Height changes use clipping planes and Y-position transforms. NO different model files per height. The clipping plane normals use non-normalized (0, ±0.735, 0) values — critical detail.

### 4. Finial Position Arrays Are the Source of Truth
24 finial arrays + 8 accent arrays + 4 puppy finial arrays + 1 scroll array = 37 position arrays total. These encode EXACT XYZ positions for every picket in every leaf/arch combination. No math needed — just parse and place.

### 5. Fence Tool Has Cambridge & Lexington
The gate tool is MISSING Concave (UAS-300) and Convex (UAS-350), but the fence tool HAS them as st=s1 styles. This means we could potentially render them in the gate tool using the same s1 model set with appropriate rail modifications.

### 6. Privacy Styles Use Completely Different Models
Privacy fence panels use texture-based rendering (m/9/*.jpg) rather than 3D geometry. They're in a separate `p` category.

### 7. The movY() Function Is the Heart of the Renderer
This single function (~150 lines) handles ALL vertical positioning: rails, posts, caps, hinges, pickets, accents, finials, puppy pickets. It's the most critical function to get right. Full source extracted.

---

## Extracted Data Files

| File | Contents |
|------|----------|
| `config/stlArr.json` | 8 gate styles with full option/accent gating |
| `config/clrs.json` | 8 colors with complete PBR values |
| `config/constants.json` | All height, dimension, camera, hinge, post cap constants |
| `config/position_arrays.json` | 37 position arrays for finials, accents, puppy finials |
| `config/fence_tool_data.json` | Fence tool styles, models, textures, camera positions |
| `manifest.json` | Complete asset inventory |
| `style_asset_map.md` | Per-style asset mapping to Grandview names |
| `analysis.md` | Deep analysis of JS logic, all function sources |
| `screenshots/` | Reference screenshots of all 3 tools |
| `network_initial_load.md` | Full network capture from gate tool initial load |
| `network_fence_load.md` | Full network capture from fence tool |

---

## Recommendations for Next Session

1. **Gate renderer bugs** — Use the extracted `movY()` source and position arrays to fix BUG-1 (Charleston center gap), BUG-2 (center seam post caps), BUG-3 (Pro spacing Y)
2. **Missing accent position arrays** — The `c{leaf}{arch}` arrays (circles/butterflies) are now extracted and can be integrated into `spatialConstants.js`
3. **Fence tool Phase 2** — The fence tool uses different model files. These need to be downloaded and a fence-specific renderer variant created.
4. **Cambridge/Lexington** — Could be added to gate tool using s1 model set + new rail geometry (concave/convex variants need custom models)
5. **Color popup fix** — PBR values now confirmed; use exact `clrs` array values
