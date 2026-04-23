<!-- SPLIT_MANIFEST
01-rendering-quality
02-renderer-features
03-ui-redesign
04-polish-and-ship
END_MANIFEST -->

# Grandview Design Studio — Project Manifest

## Overview

4 splits to transform the Grandview Design Studio from a functional-but-flat 3D configurator into a polished, brand-aligned web experience with full Ultra feature parity.

**Execution strategy:** Interleaved — rendering quality → UI shell → remaining features → UI wiring → polish.

---

## Split Structure

### 01-rendering-quality
**Goal:** Make the 3D gate look realistic — fix the "looks 2D" problem.

**Scope:**
- Add fill + rim lights (ambient + key already exist)
- Add environment map for metallic reflections
- Add tone mapping (ACES filmic) + gamma correction (gammaOutput for r86)
- Fix camera FOV from 40° → 28° to match Ultra
- Add ground shadow plane with ShadowMaterial
- Enable shadow maps on renderer (PCFSoftShadowMap)
- Verify PBR material values match Ultra's exact definitions
- Visual verification side-by-side with Ultra's live tool

**Files touched:** GateRenderer.js (primary), possibly gate_tool/js/ for env map assets

**Dependencies:** None — this is the foundation.

**Estimated complexity:** Medium — well-defined changes, known target values.

---

### 02-renderer-features
**Goal:** Complete feature parity — every Ultra option works in the 3D renderer.

**Scope:**
- Add leaf count selector and rendering (single/double gate model loading)
- Add mount type rendering (post vs direct mount model swap)
- Add puppy picket variant rendering (10 types: std, flush, plug, etc.)
- Fix flush bottom rail (`res` flag → bottom rail Y = 0.0508)
- Fix camera FOV if not done in 01
- Verify finial positions visually (Charleston + Estate arch)
- Verify po23 center gap (should be baked into model, no vertex shift)
- Add width adjustment rendering
- Verify all 7 gate styles load and render correctly with all option combinations

**Files touched:** GateRenderer.js, configData.js, spatialConstants.js

**Dependencies:** 01-rendering-quality (needs proper lighting/materials to visually verify)

**Estimated complexity:** High — many discrete features, each needs Ultra validation.

---

### 03-ui-redesign
**Goal:** Replace dark sidebar UI with clean bottom-strip + flyout panel design matching Grandview brand.

**Scope:**
- New top navigation bar (Logo + Driveway Gates | Yard Fencing | Visualize | Quote)
- New bottom config strip with 6 tab categories (Style, Color, Size, Options, Details, Get Quote)
- Flyout panel system (slides up from bottom strip, variable height)
- Style tab: thumbnail grid using gate_tool/th/th_st_*.jpg with active state
- Color tab: swatch picker with color names, Gloss/Satin grouping, PBR hookup
- Size tab: height buttons, width input, leaf count (single/double) with thumbnails
- Options tab: mount type, arch style, mid rail, flush bottom, upper finial rail — all with thumbnails
- Details tab: puppy pickets (10 types), post caps (2), finials (4), accessories (5) — all thumbnail pickers
- Get Quote tab: configuration summary + "Request a Quote" CTA
- Grandview brand styling: white/blue (#1a5276), clean sans-serif, professional
- Remove all Ultra branding, apply "ProCoat" terminology
- Responsive breakpoints (desktop, tablet, mobile)
- Wire ALL UI controls to GateRenderer via existing config → buildGate/updateMaterials pipeline

**Files touched:** NEW components (BottomStrip.js, FlyoutPanel.js, StyleTab.js, ColorTab.js, SizeTab.js, OptionsTab.js, DetailsTab.js, QuoteTab.js), app.js, Nav.js, styles.css (major rewrite), Sidebar.js (deprecated/removed)

**Dependencies:** 02-renderer-features (needs all renderer hooks to wire up UI controls)

**Estimated complexity:** Very High — largest split. New component architecture, full visual redesign, responsive layout, and complete UI-to-renderer wiring.

---

### 04-polish-and-ship
**Goal:** Production-ready polish — loading states, shareability, quote flow, performance.

**Scope:**
- Loading states and smooth transitions (model loading spinner, tab transition animations)
- URL state management (encode full config in URL hash for shareable links)
- "Get Quote" form integration (prefill grandviewfence.com contact form with config summary)
- "Share Configuration" feature (generate shareable URL or copy-to-clipboard summary)
- Performance optimization (model caching via Map, lazy-load thumbnails, debounce rapid config changes)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile testing and touch interaction polish
- Grandview phone number + email in quote panel

**Files touched:** app.js, UnifiedCanvas.js, QuoteTab.js, new utility files

**Dependencies:** 03-ui-redesign (needs final UI to polish)

**Estimated complexity:** Medium — many small features, no major architectural decisions.

---

## Dependency Graph

```
01-rendering-quality  ─────→  02-renderer-features  ─────→  03-ui-redesign  ─────→  04-polish-and-ship
     (foundation)              (feature parity)            (UX overhaul)            (ship it)
```

All splits are sequential — each builds on the previous. No parallel execution possible because:
- 02 needs 01's lighting/materials to visually verify features
- 03 needs 02's renderer hooks to wire up UI controls
- 04 needs 03's final UI to add polish

**However, within the interleaved strategy:**
- Start 03's component scaffolding (layout shell, tab structure) alongside 01/02
- Wire up controls incrementally as renderer features land

---

## Cross-Cutting Concerns

1. **Three.js r86 compatibility** — Some modern Three.js APIs don't exist. Use `gammaOutput` not `outputEncoding`, check for `MathUtils` vs `Math`.
2. **Ultra validation** — Every rendering change MUST be compared with Ultra's live tool.
3. **Branding** — "ProCoat (powder coat finish)", "Grandview Fence LLC", "Limited Lifetime Warranty" — enforced in all UI text.
4. **One fix = one commit** — Keep commits atomic and focused.
5. **configData.js is the single source of truth** — All product definitions, feature gates, and model paths resolve through this file.

---

## Execution Commands

```bash
# After approval, run /deep-plan for each split:
/deep-plan @planning/01-rendering-quality/spec.md
/deep-plan @planning/02-renderer-features/spec.md
/deep-plan @planning/03-ui-redesign/spec.md
/deep-plan @planning/04-polish-and-ship/spec.md
```
