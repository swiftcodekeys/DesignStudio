# Deep Project Interview — Session 2 Fixes

## Date: 2026-03-18

---

## Context

This is the SECOND deep-project decomposition for the Grandview Design Studio. The first (planning/) covered the full project arc (rendering quality → features → UI → polish). Splits 01-03 from that arc are now largely complete. This session targets remaining critical bugs and UI polish.

**Previous session accomplished:** UI overhaul (floating panel, nav bar, backlinks, social proof), iFence image scrape + swap, renderer fixes (height math revert, stale closure fix, finial persistence).

---

## Interview

Interview abbreviated — extensive project context available in CLAUDE.md, memory files, and SESSION_REQUIREMENTS.md. User prefers autonomous execution.

### Split Proposal

**Claude proposed 3 splits:**
1. **Size Tab Fix** — Height selection, single/double gate toggle, direct mount. All broken. Requires Playwright validation against Ultra + iFence before any code changes.
2. **UI Fixes** — Color hover popup debug + nav button tweaks (Fence link, Next button orange, Back button).
3. **Renderer Bugs** — BUG-1 (Charleston center gap), BUG-2 (center seam post caps), BUG-3 (Pro spacing Y).

### User Feedback

**Reorder:** Split 1 → Split 3 → Split 2. Reasoning: Playwright scraping infra and Ultra validation workflow are "warm" after Size Tab work — reuse for BUG-1/2/3 is more efficient than context-switching to UI then back to renderer math.

**Risk flag for Split 2:** Color popup is NOT a wiring issue. ImagePopup component exists, state is being set, but nothing shows visually. User suspects z-index or portal/layering conflict with the frosted glass panel (`backdrop-filter: blur(20px)`). This is the risk item in Split 2.

### Decisions

1. **Execution order:** 01-size-tab → 02-renderer-bugs → 03-ui-fixes
2. **Validation-first workflow:** Playwright scrape Ultra + iFence → document findings → implement → visual comparison
3. **Renderer bugs reuse Playwright infra** from Size Tab work
4. **Color popup flagged as risk** — likely z-index/portal issue, not missing wiring
5. **Out of scope:** Dynamic height standalone commit, puppy finials, mobile, Get Quote form, PDF, Phase 2/3
