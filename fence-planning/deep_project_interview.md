# Deep Project Interview — Fence Tool 3D Configurator

## Date: 2026-03-31

---

## Context
User owns grandviewfence.com and has a working 3D gate configurator (React + Three.js r86).
The fence tool currently does static PNG overlays — needs to be rebuilt as a real 3D rendered tool.

Gate tool repo copied to `C:\Users\sarah\Desktop\App Repos\fence-tool` (GitHub: fence-tool-march).
All code changes go in this fence-tool repo — NEVER touch the gate tool repo.

## Research Completed
Full research in designstudioworkingmvp/FENCE_TOOL_RESEARCH.md covering:
- Complete gate tool architecture (GateRenderer.js, spatialConstants.js, configData.js)
- Playwright extraction of Ultra's live fence tool (all functions, scene graph, positions, materials)
- Gap analysis: ~70% of gate code reusable, ~30% needs new fence-specific code

## User Decisions

### Q1: Model files
**A: Download via Playwright** — Script the download of all ~30 fence model JSON files, HDR textures,
backgrounds, and overlay images from Ultra's live fence tool as the first build step.

### Q2: UI approach
**A: Match gate tool UI** — Same FloatingPanel, same design tokens (sky blue, frosted glass).
The TopNav tabs (Driveway Gates | Yard Fencing | etc.) switch between gate and fence scenes.
Front yard / back yard is a view toggle within the "View Options" tab of the FloatingPanel.

### Q3: Privacy styles
**A: Defer to later phase** — Focus on the 9 aluminum fence styles. Privacy vinyl panels use a
completely separate texture-based rendering engine — out of scope for this project.

### Q4: Canvas texture maps (rail groove shadows)
**A: Skip for MVP** — Use solid PBR materials like the gate tool does. Can add groove textures later.

## Key Constraints
- Three.js r86 (legacy, must match gate tool)
- Ultra is source of truth — validate ALL rendering values against Ultra's live tool via Playwright
- Never guess at visual output — always verify math against extracted data
- Fix one thing at a time, have user validate before moving on
- One fix = one commit
- GitHub repo: fence-tool-march
- Working directory: C:\Users\sarah\Desktop\App Repos\fence-tool

## Architectural Differences: Fence vs Gate

### Gate Tool Pattern
- Single gate rendered with Matrix4 snap transforms
- Models at fixed positions (hinges, posts, rails, pickets)
- Arch variants via different model files (rt2e, rt2a, rt2r, rt2s)
- Single/double leaf via different model files
- Post/direct mount via visibility toggling

### Fence Tool Pattern (from Playwright extraction)
- Multiple panels repeated via `poArr` (post position array)
- 5 post positions: 2 front-facing + 3 side-facing at -90° rotation
- Each component loaded once, cloned to each position
- Gate section at Z=3.7465 with -90° rotation, `gs` prefix models
- Posts split into top/bottom halves (clipped at height plane)
- Clipping normals: ±0.9144 (vs gate's ±0.735)
- Height includes 54" option (gate doesn't have this)
- No arch system (fences are straight-topped)
- No leaf/mount system
- Front/back yard camera positions
- Bottom rail drops -0.099 for back yard view
- 72" height disables clipping entirely
