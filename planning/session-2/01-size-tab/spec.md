# Split 01: Size Tab — Complete Fix

## Goal

Fix the completely broken Size tab so that height selection, single/double gate toggle, and direct mount all work correctly and update the 3D model.

## Context

- **Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- **Full project context:** See `CLAUDE.md` in repo root and `SESSION_REQUIREMENTS.md`
- **Architecture:** React app → `app.js` (state) → `FloatingPanel.js` → `tabs/SizeTab.js` (UI) → `GateRenderer.js` (Three.js r86 renderer)
- **Key files:** `SizeTab.js`, `GateRenderer.js`, `configData.js`, `spatialConstants.js`, `app.js`

## Requirements

### 1. Playwright Validation (BEFORE any code changes)

**Scrape Ultra Aluminum's gate configurator:**
- URL: `https://www.ultrafence.com/design-studio/gates/index.html`
- For each gate style, capture:
  - Available heights and how selection changes the 3D model
  - Available widths for single vs double gate
  - Direct mount vs post mount behavior (what elements hide/show)
  - Any dimension constraints or rules per style

**Scrape iFence's configurator:**
- URL: `https://ifenceusa.com` (find gate studio)
- Cross-reference: height/width options, single vs double rendering, post behavior in direct mount

**Document findings** in a validation file within this split directory before writing any code.

### 2. Height Selection Fix

- Changing between heights (48" / 54" / 60" / 72") must update the 3D model
- Height uses clipping planes (`renderer.localClippingEnabled`)
- Known constants from CLAUDE.md:
  - 48" = -0.6096m, 54" = -0.4572m, 60" = -0.3048m, 72" = 0
- Must verify these values against Ultra's live tool
- Available heights may differ per style — check configData.js feature gating

### 3. Single ↔ Double Gate Toggle

- Switching between single and double gate must update the 3D model
- Single = 1 panel, Double = 2 panels with correct proportions
- Config already supports `leaf: '1'|'2'` but SizeTab may not expose it
- Model paths key on `config.leaf` — verify correct models load
- Ultra uses variables `lfI = '1'` or `'2'`

### 4. Direct Mount Option

- When direct mount is selected, posts should not render (gate mounts to structure)
- Ultra uses `mntI = 'p'` (post mount) or `'d'` (direct mount)
- Post mount: po40d + po14 visible, hinges at x=±1.823
- Direct mount: posts hidden, caps hidden, hinges at x=±1.778
- Thumbnails exist: `gate_tool/th/th_so_sngpl.jpg`, `th_so_sngpo.jpg`, `th_so_dblpl.jpg`, `th_so_dblpo.jpg`

### 5. Post-Implementation Verification

- Run Playwright again to visually compare our output against Ultra
- Each size option should produce matching results
- Do not call it done until it matches

## Known State

- `SizeTab.js` exists but nothing in it works
- `GateRenderer.js` has height clipping code (hardcoded constants, verified)
- `configData.js` has height options and feature gating
- Mount type rendering exists in GateRenderer (direct mount hides posts/hinges/caps) per CLAUDE.md "What's Done" section — but may not be wired to UI

## Dependencies

- None — this is the first split to execute
- Establishes the Playwright validation workflow reused by Split 02

## Constraints

- Three.js r86 (legacy API)
- One fix = one commit
- Never guess dimension values — scrape from Ultra
- If a value can't be found, flag it — don't infer
