# COMPREHENSIVE TODO — Grandview Design Studio
## Updated 2026-04-01 | Pick up from any session
## Stable checkpoint: `stable-checkpoint-apr1-v2` (tag)
## Current branch: `feat/fence-quiz`

---

## STATUS: WHAT'S WORKING
- Gate configurator (Driveway Gates tab) — 3D rendering, all styles, colors, heights
- Fence configurator (Front Yard / Back Yard tabs) — 3D rendering, style switching
- Finials on fence — NOW WORKING (fixed ID mismatch s/t/q vs fs/ft/fq)
- Accent mutual exclusivity — circle/butterfly exclusive, scroll independent
- Config panel — scrollable all-sections layout with tab navigation
- Trust bar — rotating promos, #78AFCF, 10s rotation
- Bottom bar — dynamic style links, both phone numbers, email, trust signals
- Orange hover states on all interactive elements
- OPTIONS tab hidden on fence views
- Quote tab — compact redesign with dual CTAs
- Responsive CSS — hamburger nav, breakpoints

---

## BUG 1: Puppy Pickets Only Render "Standard" on Fence Tool
**Priority: HIGH**
**Symptoms:** Only `pupst` (Standard) renders correctly. Classic (`pupcl`) and all variants look wrong or don't render.
**Root cause: NEEDS INVESTIGATION with Ultra source code.**

### What Ultra's code does (from ultra_scrape):
- Fence puppy models live in `fence_tool/m/6/`
- `pupst.json` = standard puppy picket panel
- `pupcl.json` = classic puppy picket panel  
- `gpupst.json` = gate section standard puppy
- `gpupcl.json` = gate section classic puppy
- Ultra's `dpup()` function handles puppy rendering — need to extract the exact logic

### What our code does (FenceRenderer.js lines 468-481):
```
var hasPup = config.accessories && config.accessories.pup && config.pupType;
if (hasPup) {
    loader.load(getFenceModelPath('puppy', config), function(geo) {
        placeMeshes(geo, mat1, poArr, grpu);
    });
}
```
- `getFenceModelPath('puppy', config)` → `fence_tool/m/6/{config.pupType}.json`
- For `pupst`: loads `fence_tool/m/6/pupst.json` ✓
- For `pupcl`: loads `fence_tool/m/6/pupcl.json` — file exists but may need different positioning

### Investigation needed:
1. **USE PLAYWRIGHT** to scrape Ultra's live fence tool at https://www.ultrafence.com/design-studio/fence/index.html
2. Extract the `dpup()` function from Ultra's minified JS
3. Check if classic puppy needs different Y position, clip plane, or rail offset
4. Compare `pupfl` (flush), `pupst` (standard), `pupcl` (classic) rendering math
5. Check if classic puppy needs the puppy FINIAL models from `fence_tool/m/7/`

### Ultra's puppy behavior (from CLAUDE.md research):
- `pupfl` (flush): rail at bY+0.4064, bY=0.0508
- `pupst` (standard): rail at bY+0.3048
- `pupcl` (classic): rail at bY+0.1905, finials at r3y+0.076
- Classic variants need puppy finial models: `m/7/{fp|fs|ft|fq}.json`

### Action items:
- [ ] Scrape Ultra's dpup() function with Playwright
- [ ] Extract puppy rail Y positions per type
- [ ] Extract puppy clip plane constants
- [ ] Check if classic needs finial placement logic from dpfin()
- [ ] Compare our FenceRenderer puppy code to Ultra's exact implementation
- [ ] Fix rendering to match Ultra

---

## BUG 2: Google Maps Address Search Broken
**Priority: HIGH**
**Symptoms:** `RefererNotAllowedMapError` in console. Addresses not found.

### Console errors:
```
Google Maps JavaScript API error: RefererNotAllowedMapError
Your site URL to be authorized: http://localhost:3000/
AutocompleteService is not available to new customers (deprecated March 2025)
```

### Root causes:
1. **API key referer restriction** — `http://localhost:3000` not in allowed referers
2. **Deprecated API** — `google.maps.places.AutocompleteService` deprecated March 2025. Google recommends `AutocompleteSuggestion` instead.
3. **APIs may not be enabled** — Need Geocoding API + Places API (New) enabled in Google Cloud Console

### Fix steps:
- [ ] In Google Cloud Console → Credentials → find the API key
- [ ] Add `http://localhost:3000/*` AND `http://localhost:3000` to HTTP referer restrictions
- [ ] Also add production domain when ready
- [ ] Enable "Geocoding API" in APIs & Services
- [ ] Enable "Places API (New)" in APIs & Services
- [ ] In code: migrate from `AutocompleteService` to `AutocompleteSuggestion` (new API)
- [ ] OR: switch to Geocoder-only approach (no autocomplete, just geocode on submit)

### API key location:
- `.env` in repo root: `VITE_GOOGLE_MAPS_API_KEY=AIzaSyDw3Yj6uGXjOZWwh8fb5wvE0TQj3NzHwWU`
- Injected via webpack DefinePlugin as `process.env.GOOGLE_MAPS_API_KEY`

---

## BUG 3: Haven & Charleston Pro Missing Accessories
**Priority: MEDIUM**
**Symptoms:** No accent options shown for these styles on fence views.

### Ultra allows:
| Style | Ultra accessories |
|-------|-----------------|
| UAB-200 Haven | scr, bcr, bbu |
| UAS-101 Charleston Pro | tcr, tbu, bcr, bbu |

### Our fenceConfigData.js has:
| Style | Our acc array |
|-------|--------------|
| UAB-200 Haven | `[]` (empty!) |
| UAS-101 Charleston Pro | `[]` (empty!) |

### Fix:
- [ ] Update fenceConfigData.js Haven: `acc: ['cir', 'but', 'scr']`
- [ ] Update fenceConfigData.js Charleston Pro: `acc: ['cir', 'but', 'scr']`
- [ ] Note: our fence IDs are cir/but/scr, not Ultra's tcr/tbu/bcr/bbu

---

## BUG 4: Fence Render Glitch (Intermittent)
**Priority: MEDIUM**
**Symptoms:** Front Yard fence sometimes doesn't render properly on tab switch.
**Root cause:** Race condition — HDR environment map loads async, buildFence() can fire before HDR is ready.

### FenceRenderer._loadEnvMap() (lines 112-145):
- Async HDR loader with no completion guarantee
- buildFence() may be called before env map callback fires
- Multiple rapid view switches can race multiple HDR loads

### Fix approach:
- [ ] Add loading flag (`this._envMapLoading = true`)
- [ ] Queue buildFence() calls during HDR load
- [ ] On HDR load complete, execute queued build
- [ ] Cancel in-flight HDR loads when switching views
- **DO NOT modify spatial math, positions, or material values**

---

## BUG 5: Puppy Pickets Variants 3-9 Look Same as Classic
**Priority: LOW (known limitation)**
**Explanation:** All classic variants (Classic Spear, Staggered Spear, Classic Tri, etc.) use the same `pupcl.json` model. The visual difference requires puppy finial models from `fence_tool/m/7/` which exist but need the `dpfin()` puppy finial placement logic implemented.

### Models available in fence_tool/m/7/:
- `pfs.json` — puppy spear finial
- `pft.json` — puppy tri finial
- `pfq.json` — puppy quad finial
- `pfp.json` — puppy plug finial
- Gate section variants: `gspfs.json`, `gspft.json`, etc.

### Ultra's position arrays (from ultra_scrape):
- `pf1` / `pf2` — classic puppy finial positions (non-staggered)
- `pf1s` / `pf2s` — staggered puppy finial positions

### Action:
- [ ] Implement dpfin() equivalent in FenceRenderer
- [ ] Use PUPPY_FINIAL_POSITIONS from ultra_scrape/config/position_arrays.json
- [ ] Place puppy finials at pf1/pf2 positions with PUPPY_FINIAL_GROUP_Y offset
- [ ] Map variant IDs to finial models: pupcl_spe→pfs, pupcl_tri→pft, pupcl_qua→pfq, pupcl_pls→pfp

---

## FEATURE 1: Solace/Privacy Fence Styles
**Priority: MEDIUM**
**Request:** Privacy fence styles (Solace, Solace Air, Solace Screen, Solace Hybrid) should appear in Front/Back Yard views.
**Blocker:** No 3D models or renders exist for privacy styles. These use a completely different panel system (tongue-and-groove solid panels, not pickets).
**Action:** Need to determine if Ultra has privacy fence 3D models or if this is preview-image only.

---

## FEATURE 2: Custom Quote Builder Polish
**Priority: MEDIUM**  
**Status:** QuoteBuilder now loads (fixed Phosphor import). Needs:
- [ ] Test all 8 steps navigate correctly
- [ ] Verify GPS draw tool data pre-fills layout step
- [ ] Style the form to match the premium design system
- [ ] Test on mobile

---

## FEATURE 3: Draw Your Yard Redesign
**Priority: LOW (blocked by Google Maps)**
**Needs:**
- [ ] Fix Google Maps API (see Bug 2)
- [ ] Migrate to new Places API (AutocompleteSuggestion)
- [ ] Layout: address input on right side, config preview on left
- [ ] Get Instant Quote button must navigate to quote builder with data

---

## ULTRA AUDIT REFERENCE

### What exists per tool:

**GATE TOOL (Driveway Gates tab):**
- 7 renderable styles (Horizon, Horizon Pro, Vanguard, Haven, Charleston, Charleston Pro, Savannah)
- Heights: 48, 54, 60, 72 (Defender: 84, 96)
- Colors: 8 (Gloss/Textured Black, White, Bronze, Khaki, Silver)
- Arches: Standard, Arched, Estate, Reverse
- Finials: Spear, Tri, Quad, Plug (per hasFinials flag)
- Post caps: Flat, Ball
- Accents: Circle, Butterfly, Scroll (gate IDs: tcr, tbu, scr)
- Puppy pickets: Standard, Classic (+ finial variants)
- Mount: Post, Direct
- Leaf: Single, Double

**FENCE TOOL (Front/Back Yard tabs):**
- 9 styles (same as gate + Cambridge, Lexington)
- Heights: 48, 54, 60, 72
- Colors: 8 (same)
- Finials: Spear(s), Tri(t), Quad(q) — NO plug on fence
- Post caps: Flat, Ball
- Accents: Circle(cir), Butterfly(but), Scroll(scr)
- Puppy: Standard(pupst), Classic(pupcl)
- Combo rules: circle/butterfly exclusive, scroll independent

**FENCE TOOL MODELS (fence_tool/m/):**
```
m/1/ — Fence panels (main geometry per style)
m/2/ — Post/rail models
m/3/ — Gate section models
m/4/ — Post cap models
m/5/ — Finial models (fn{mod}{type}.json, 21 files)
m/6/ — Puppy picket panels (pupst, pupcl, gpupst, gpupcl)
m/7/ — Puppy finial models (pfs, pft, pfq, pfp + gate variants)
m/8/ — Accent models (accir, acbut, acscr + gate variants)
```

---

## HOW TO PICK THIS UP IN ANOTHER SESSION

1. Read this file first
2. Read CLAUDE.md for rendering rules (never guess, use Ultra math)
3. Read FIX_PLAN.md for detailed root cause analysis
4. Check `git log --oneline -20` for recent changes
5. Stable checkpoint: `git reset --hard stable-checkpoint-apr1-v2` to revert if needed
6. Dev server: `cd fence-tool && npm start` (localhost:3000)
7. **For rendering bugs: USE PLAYWRIGHT to scrape Ultra's live tool before making changes**
   - Gate tool: https://www.ultrafence.com/design-studio/gates/index.html
   - Fence tool: https://www.ultrafence.com/design-studio/fence/index.html
8. Ultra scrape data: `ultra_scrape/config/` has all position arrays, style configs, constants
