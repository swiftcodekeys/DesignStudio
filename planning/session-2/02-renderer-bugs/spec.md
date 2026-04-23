# Split 02: Renderer Bugs (BUG-1, BUG-2, BUG-3)

## Goal

Fix 3 known rendering bugs in GateRenderer.js, reusing the Playwright validation infrastructure established in Split 01.

## Context

- **Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- **Full project context:** See `CLAUDE.md` in repo root
- **Primary file:** `GateRenderer.js`
- **Reference:** `spatialConstants.js`, `gate_tool/js/ultra_dsg_min.js` (DO NOT MODIFY)

## Bugs

### BUG-1: Charleston Center Gap

**Problem:** There is a visible gap at the center seam of Charleston style gates.

**Root cause:** The code applies a CENTER_GAP vertex shift to the po23 model. But the gap is already baked into the po23.json geometry. Ultra does NOT vertex-shift po23.

**Fix:** Remove the CENTER_GAP vertex shift from the po23 loader in GateRenderer.js.

**Validation:** Compare Charleston style gate rendering against Ultra's live tool before and after fix.

### BUG-2: Center Seam Post Caps

**Problem:** Post caps pc4/pc5 at the center seam are incorrectly positioned.

**Fix:** pc4/pc5 should be at x=±0.044, with no CENTER_GAP push applied. The arch-aware Y positioning is already correct — don't touch it.

**Validation:** Verify cap positions match Ultra's placement for double-leaf gates with various arch types.

### BUG-3: Pro Spacing Y Position

**Problem:** The ptRes (pro spacing / res pickets) group has incorrect Y positioning for Pro styles.

**Fix:** ptRes needs its own Y offset per style:
- UAF-201 (Horizon Pro): Y = tY + 0.3048 + fsv - 0.1905 = -0.4957
- UAS-101 (Charleston Pro): Y = tY + 0.3048 + fsv = lt.picketTop

**Validation:** Compare Pro style gate rendering (Horizon Pro + Charleston Pro) against Ultra, specifically checking the vertical position of the extra picket spacing elements.

## Workflow

For each bug:
1. Scrape Ultra's live tool to confirm expected behavior (Playwright infra from Split 01)
2. Read the relevant section of GateRenderer.js
3. Make the fix
4. Run dev server, confirm visually
5. Compare against Ultra via Playwright
6. Commit individually: `fix(BUG-N): description`

## Dependencies

- **Split 01 (Size Tab):** Reuses Playwright scraping workflow and Ultra validation patterns
- The Playwright browser context / scripts should already be established

## Constraints

- One bug = one commit
- Do NOT modify `gate_tool/js/ultra_dsg_min.js`
- Verify against `SPATIAL_TRUTH.json` and Ultra's live tool
- If fix introduces visual regression in other styles, revert immediately
