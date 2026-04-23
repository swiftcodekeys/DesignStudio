# Renderer Bugs Verification Report

**Date:** 2026-03-18
**Status:** DONE
**Tested against:** localhost:3000 (dev server) and Ultra live tool (ultrafence.com/design-studio/gates/index.html)

---

## BUG-1: Charleston center gap

**Verdict: PASS**

**What was tested:** Selected Charleston style (UAS-100) with double-leaf gate, estate arch. Inspected the center seam where the two gate panels meet.

**Evidence:**
- `screenshots/bug1-charleston-double-center-seam.png` — Local Charleston double-leaf gate. Center seam is clean with no abnormal gap between the inner stiles.
- `screenshots/ultra-charleston-uas100.png` — Ultra's UAS-100 for comparison. Center seam appearance matches.
- Code verified: `GateRenderer.js` line 312 confirms the CENTER_GAP vertex shift has been removed from the po23 loader. The comment reads: "Ultra does NOT vertex-shift po23. Previous CENTER_GAP code was wrong and has been removed."
- The po23 model is now loaded as-is with `snap(mesh, M_IDENTITY)` — no geometry mutation.

---

## BUG-2: Center seam post caps

**Verdict: PASS**

**What was tested:** Viewed Horizon (UAF-200) double-leaf gate with estate arch. Inspected center post caps (pc4/pc5) alignment relative to the center stiles.

**Evidence:**
- `screenshots/bug2-horizon-postcaps-local.png` — Center post caps sit directly above the center stiles at the seam. No visible offset.
- `screenshots/bug1-horizon-double-default.png` — Additional angle showing the same alignment.
- Code verified: `GateRenderer.js` lines 325-326 confirm inner caps (indices 4,5) use base X of +/-0.044 with no CENTER_GAP push. The arch-aware Y adjustment (`CAP_INNER_Y`) is applied correctly at line 329.

---

## BUG-3: Pro spacing Y position

**Verdict: PASS**

**What was tested:**
1. Selected Horizon Pro (UAF-201) — extra pickets between main pickets should be positioned lower than main pickets.
2. Selected Charleston Pro (UAS-101) — extra pickets should align with normal picket tops.
3. Compared both against Ultra's live tool.

**Evidence:**
- `screenshots/bug3-horizon-pro-local.png` — Horizon Pro local rendering shows extra (res) pickets positioned lower than the main pickets, matching expected Y = -0.4957.
- `screenshots/ultra-horizon-pro-uaf201.png` — Ultra's UAF-201 shows the same pattern: extra pickets stop well below the top rail while main pickets extend higher. Local matches Ultra.
- `screenshots/bug3-charleston-pro-local.png` — Charleston Pro local rendering shows extra pickets aligned to the same height as normal pickets (with spear tops).
- `screenshots/ultra-charleston-pro-uas101.png` — Ultra's UAS-101 shows the same pattern: extra pickets at same height as normal pickets. Local matches Ultra.
- Code verified: `GateRenderer.js` line 421 uses `PTRES_Y_UAF201` (a transform matrix with Y = -0.4957) for UAF-201, and `picketTop` (same as normal pickets) for UAS-101. The constant is defined in `spatialConstants.js` line 274.

---

## Screenshots Taken

| File | Description |
|------|-------------|
| `bug1-horizon-double-default.png` | Local: Horizon double-leaf, estate arch (default) |
| `bug1-charleston-double-center-seam.png` | Local: Charleston double-leaf, center seam check |
| `bug2-horizon-postcaps-local.png` | Local: Horizon double-leaf, post cap alignment |
| `bug3-horizon-pro-local.png` | Local: Horizon Pro (UAF-201), extra picket Y position |
| `bug3-charleston-pro-local.png` | Local: Charleston Pro (UAS-101), extra picket Y position |
| `ultra-default-horizon.png` | Ultra: Default Horizon for reference |
| `ultra-horizon-pro-uaf201.png` | Ultra: Horizon Pro (UAF-201) comparison |
| `ultra-charleston-pro-uas101.png` | Ultra: Charleston Pro (UAS-101) comparison |
| `ultra-charleston-uas100.png` | Ultra: Charleston (UAS-100) center seam comparison |

## Summary

All three renderer bugs are confirmed fixed. The code changes match the specifications from SPATIAL_TRUTH.json and CLAUDE.md, and the visual output matches Ultra's live tool for all tested styles.
