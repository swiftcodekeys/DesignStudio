# Deep Project Interview — Grandview Design Studio

## Date: 2026-03-17

---

## Context

Sarah owns Grandview Fence LLC (grandviewfence.com) and is rebuilding a 3D gate/fence configurator that white-labels Ultra Aluminum's design tools. The app is React + Webpack + Three.js r86.

## Requirements Source

Full requirements provided inline in session, saved to `deep-project-requirements.md`. Also references CLAUDE.md in repo root.

---

## Interview

### Q1: Split Structure

**Claude's proposal:** 4 splits mapping to the phased plan:
1. **Rendering Quality** — PBR materials, lighting, env map, camera, ground plane
2. **Renderer Features** — All missing options (arch, mount, leaf, puppy pickets, etc.)
3. **UI Redesign** — Top nav + bottom strip + flyout panels + brand
4. **Polish & Ship** — URL state, quote flow, loading states, performance

**Sarah's answer:** Confirmed 4-split structure.

### Q2: Priority

**Options:** Visual wow first, feature parity first, or interleave both.

**Sarah's answer:** **Interleave both** — rendering quality → UI shell → features → UI wiring → polish. Steady progress on both fronts.

---

## Codebase Findings (Post-Interview Discovery)

The exploration revealed the project is **further along than the requirements doc suggested**:

### Already Built (Not Acknowledged in Requirements)
1. **PBR materials already exist** — configData.js has metalness (0.1–0.8) and roughness (0.1–0.4) per color, GateRenderer.js applies MeshStandardMaterial
2. **Arch styles working** — Estate, Arched, Standard, Royal all render with correct clipping
3. **Finials working** — Exact XYZ positions from Ultra's arrays, placed correctly (needs visual verification)
4. **Post caps working** — Flat & ball with arch-aware Y adjustment
5. **Accessories working** — Circles, butterflies, scrolls at verified positions
6. **Options working** — Mid rail, extra rail, upper filler rail, puppy panel toggles exist
7. **Color swatches in Sidebar** — 8 colors with PBR values displayed as clickable circles
8. **Height selection** — 5 options (36–72") with clipping plane adjustment
9. **Feature gating** — STYLE_FEATURE_GATE hides unavailable options per style

### Actually Missing
1. **Lighting is minimal** — Only ambient (0.6) + 1 directional (0.8). Missing fill, rim lights.
2. **No environment map** — Metals have nothing to reflect, causing flat appearance
3. **No tone mapping** — No ACES filmic, no gamma correction
4. **Camera FOV mismatch** — Code uses 40° but Ultra uses 28°
5. **No ground plane/shadows** — Gate floats in space
6. **Leaf selector missing from UI** — Config supports leaf='1'/'2' but no Sidebar control
7. **Mount type missing** — No post vs direct mount selector
8. **Puppy picket variant selector missing** — Toggle exists but no type picker (std, flush, plug, etc.)
9. **Thumbnail-based selectors missing** — All UI is text dropdowns/chips, not image thumbnails
10. **UI is dark sidebar** — Needs complete redesign to bottom strip + flyout
11. **No "Get Quote" flow** — Button exists but does nothing
12. **3 rendering bugs pending** — po23 gap, pro spacing Y verification, finial visual verification

### Impact on Splits
- **Split 1 (Rendering Quality)** is smaller than expected — materials exist, just need lighting/env/tone mapping/camera fix
- **Split 2 (Renderer Features)** is also smaller — most features exist, mainly need leaf selector, mount type, puppy variant picker
- **Split 3 (UI Redesign)** is the largest piece — complete layout overhaul from sidebar to bottom strip
- **Split 4 (Polish)** stays the same

---

## Key Decisions

1. **Interleaved execution:** Do rendering quality → UI shell → remaining features → wire UI → polish
2. **One repo:** Only work in `Testing-VS code/designstudio/designstudio/designstudioworkingmvp`
3. **Branding rules:** ProCoat (not Powercoat), Grandview Fence LLC, Limited Lifetime Warranty
4. **Three.js r86:** Legacy version loaded from CDN, some modern APIs may not be available (e.g., outputEncoding → gammaOutput)
5. **Validate against Ultra:** Always compare rendering output with https://www.ultrafence.com/design-studio/gates/index.html
