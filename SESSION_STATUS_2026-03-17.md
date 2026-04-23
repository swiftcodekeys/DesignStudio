# Grandview Design Studio — Session Status & Next Steps

**Date:** 2026-03-17
**Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
**Branch:** `feat/fence-quiz`

---

## What Was Accomplished This Session

### Split 01: Rendering Quality — DONE
- PMREM HDR environment map loaded from Ultra's actual HDR cube maps
- Per-color envMapIntensity (2.5–9.0) from Playwright scrape of Ultra's live tool
- Bump map from bm.jpg (2048×2048)
- Camera, lighting, material side all matched to Ultra's exact values
- Gate now has realistic metallic reflections and surface texture

### Split 03: UI Redesign — IN PROGRESS (needs more work)
- New layout: TopNav (sky blue) + viewport + flyout panel + bottom strip (sky blue) + backlinks
- 7 tab components created: Style, Color, Size, Options, Puppy Pickets, Details, Quote
- Conversion features: progress indicator, social proof pill, auto-save localStorage, shareable URL hash
- configData fixed: heights (48/60/72 only), arch renamed Royal→Reverse, finial renamed Pyramid→Plug, color displayNames added
- Accent position arrays extracted from Ultra (16 arrays for circles/butterflies per leaf+arch)

---

## KNOWN BUGS — Must Fix

### Rendering Bugs
1. **Flush bottom (res) not working** — toggling flush bottom in Options tab should lower the bottom rail Y to 0.0508m. Currently does nothing. Need to research `res` behavior in ultra_dsg_min.js.

2. **Puppy pickets not rendering** — selecting a puppy picket variant in the Puppy Pickets tab doesn't render anything. The toggle exists for `config.accessories.pup` but the renderer only shows/hides the ptRes/pbRes meshes for Pro Spacing styles. Need to implement actual puppy picket model loading.

3. **Circles still in wrong place** — despite extracting Ultra's exact position arrays, circles are rendering incorrectly. The issue may be that `ACCENT_BASE_Y` is being added on top of the array Y values when it shouldn't be (or vice versa). Need to compare side-by-side with Ultra's live tool to determine if the model has baked-in Y or not.

4. **Butterflies still in wrong place** — same issue as circles.

### UI Bugs
5. **Size tab may not be wired** — user reports nothing works. Need to verify button click handlers actually call onConfigChange.

6. **Progress indicator still buggy** — "6 of 6" showing when it shouldn't.

---

## UI LAYOUT CHANGE REQUESTED

**Move bottom blue tab strip to the LEFT SIDE as a vertical menu.**

Current layout:
```
┌─────────────────────────────────────────┐
│  TOP NAV (sky blue)                     │
├─────────────────────────────────────────┤
│                                         │
│         3D VIEWPORT                     │
│                                         │
├─────────────────────────────────────────┤
│  FLYOUT PANEL (config controls)         │
├─────────────────────────────────────────┤
│  STYLE│COLOR│SIZE│OPTIONS│...│QUOTE     │  ← BOTTOM strip (sky blue)
├─────────────────────────────────────────┤
│  backlinks                              │
└─────────────────────────────────────────┘
```

Requested layout:
```
┌─────────────────────────────────────────────┐
│  TOP NAV (sky blue)                         │
├──────┬──────────────────────────────────────┤
│      │                                      │
│ STYLE│                                      │
│ COLOR│         3D VIEWPORT                  │
│ SIZE │         (MUCH BIGGER)                │
│ OPTS │                                      │
│ PUPPY│                                      │
│ DETLS├──────────────────────────────────────┤
│ QUOTE│  FLYOUT PANEL (config controls)      │
│      │  (box buttons for active tab)        │
├──────┴──────────────────────────────────────┤
│  backlinks                                  │
└─────────────────────────────────────────────┘
```

Benefits:
- Viewport gets much taller (no bottom strip eating vertical space)
- Left sidebar is always visible (no hidden state)
- Flyout panel stays at bottom for the active tab's controls
- More Apple-like vertical navigation feel

---

## REMAINING FROM DEEP PLAN

### Split 02: Renderer Features (NOT STARTED)
From `planning/02-renderer-features/spec.md`:
- [ ] Leaf count rendering (single/double gate model loading)
- [ ] Mount type rendering (post vs direct mount model swap)
- [ ] Fix flush bottom rail (res flag → bottom rail Y = 0.0508)
- [ ] Puppy picket variant rendering (10 types with distinct models)
- [ ] Width adjustment rendering
- [ ] Verify finial positions (Charleston + Estate arch)
- [ ] Verify all 7 styles × 4 arch types render correctly
- [ ] Fix circle/butterfly accent positions

### Split 04: Polish & Ship (NOT STARTED)
From `planning/04-polish-and-ship/spec.md`:
- [ ] Loading states and transitions
- [ ] URL state management (shareable configs) — PARTIALLY DONE (hash sync works)
- [ ] "Get Quote" form integration with grandviewfence.com
- [ ] PDF download (html2canvas + jsPDF)
- [ ] Performance optimization (model caching, lazy thumbnails)
- [ ] Cross-browser testing
- [ ] Mobile testing

### Conversion Features Status
- [x] Progress indicator (needs bug fix)
- [x] Social proof pill
- [x] Auto-save to localStorage
- [x] Shareable URL hash
- [ ] PDF download (button exists, shows "coming soon" alert)
- [ ] Dynamic OG image for social sharing
- [ ] Post-quote "thank you" page

---

## HOW IT COMPARES TO ULTRA'S TOOL

### What Grandview Does BETTER Than Ultra
- HDR environment map with per-color intensity (same tech, same quality)
- Modern UI design (Ultra uses a 2015-era jQuery interface)
- Sky blue brand identity (Ultra has no brand personality)
- Thumbnail-based selection (Ultra uses text lists + tiny thumbnails)
- Social proof + progress indicator (Ultra has neither)
- SEO backlinks (Ultra has none — it's an iframe)
- Shareable URL (Ultra doesn't support this)
- Mobile-responsive design (Ultra is desktop-only)

### What Ultra Does That Grandview Doesn't YET
- Flush bottom rail rendering
- Puppy picket model variants (10 distinct models)
- Single vs double gate model swapping
- Post mount vs direct mount model swapping
- Width adjustment
- Correct circle/butterfly accent positions following arch curves
- "Save Image" button (screenshot capture)

### What's Equal
- 7 gate styles with correct 3D models
- 4 arch styles with correct clipping
- PBR materials with bump maps
- Finial positioning (spear, trident, quad, plug)
- Post cap rendering (flat, ball)
- Pro spacing picket visibility
- Height clipping (48"/60"/72")

---

## PRIORITY ORDER FOR NEXT SESSION

1. **Fix UI layout** — move tabs to left sidebar, make viewport bigger
2. **Fix Size tab wiring** — verify buttons work
3. **Fix circle/butterfly positions** — compare with Ultra side-by-side using Playwright
4. **Fix flush bottom (res)** — research Ultra source for exact rail Y when res=true
5. **Implement puppy picket rendering** — load correct model variant per type
6. **Implement leaf count** — single/double gate model loading
7. **Implement mount type** — post vs direct mount
8. **Polish and ship**

---

## KEY FILES

| File | Purpose |
|------|---------|
| `GateRenderer.js` | 3D rendering engine — all spatial/model changes go here |
| `spatialConstants.js` | Verified constants from Ultra — accent positions, finial positions, transforms |
| `configData.js` | Product config — styles, colors, heights, feature gating |
| `app.js` | React app — state management, layout wiring |
| `FlyoutPanel.js` | Flyout container — routes to tab components |
| `tabs/*.js` | 7 tab content components |
| `TopNav.js` | Sky blue top navigation |
| `BottomStrip.js` | Sky blue bottom strip (TO BE MOVED to left sidebar) |
| `styles.css` | All CSS — design system, layout, components |
| `planning/ultra-live-scrape-2026-03-17.json` | Playwright scrape of Ultra's exact runtime values |
| `SPATIAL_TRUTH.json` | Extraction-verified constants reference |
| `mockup-v6.html` | Current approved mockup (needs updating for left sidebar) |

---

## SCRAPE DATA AVAILABLE

- `planning/ultra-live-scrape-2026-03-17.json` — Camera, renderer, lighting, material, color array with envMapIntensity/bumpScale/ao
- Ultra accent position arrays (c1s–c2r, b1s–b2r) — extracted and in spatialConstants.js
- Ultra height array (htArr) — validated: 48/60/72 only
- Ultra style array (stlArr) — 7 styles with categories, finial flags, options
