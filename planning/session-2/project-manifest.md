<!-- SPLIT_MANIFEST
01-size-tab
02-renderer-bugs
03-ui-fixes
END_MANIFEST -->

# Session 2 — Project Manifest

## Overview

3 splits to fix the remaining critical bugs and UI polish items in the Grandview Design Studio. Ordered to maximize Playwright/Ultra validation workflow reuse.

---

## Split Structure

### 01-size-tab
**Goal:** Fix the completely broken Size tab — height selection, single/double gate toggle, and direct mount.

**Scope:**
- Playwright scrape Ultra's gate configurator for all dimension data per style
- Playwright scrape iFence's configurator for cross-reference
- Document all findings in a validation file before writing code
- Fix height selection → 3D model update (clipping planes)
- Fix single ↔ double gate toggle → model loading + transforms
- Fix direct mount toggle → post visibility
- Post-implementation visual comparison against both tools

**Files touched:** SizeTab.js, GateRenderer.js, configData.js, app.js (state wiring)

**Dependencies:** None — this is the foundation and establishes the Playwright validation workflow.

**Complexity:** High — requires live tool scraping, dimension constraint discovery, and renderer math changes.

---

### 02-renderer-bugs
**Goal:** Fix 3 known rendering bugs using the Playwright infra established in 01.

**Scope:**
- **BUG-1: Charleston center gap** — Remove CENTER_GAP vertex shift from po23 loader. Gap is baked into po23.json geometry; Ultra does NOT vertex-shift po23.
- **BUG-2: Center seam post caps** — pc4/pc5 should be at x=±0.044, no CENTER_GAP push. Arch-aware Y is correct.
- **BUG-3: Pro spacing Y position** — ptRes needs own Y offset per style:
  - UAF-201: Y = tY + 0.3048 + fsv - 0.1905 = -0.4957
  - UAS-101: Y = tY + 0.3048 + fsv = lt.picketTop
- Each bug validated against Ultra before and after fix

**Files touched:** GateRenderer.js, spatialConstants.js

**Dependencies:** 01-size-tab (reuses Playwright scraping workflow and Ultra validation patterns)

**Complexity:** Medium — specific math fixes with known target values, but each needs Ultra verification.

---

### 03-ui-fixes
**Goal:** Fix color hover popup and polish nav button styling.

**Scope:**
- **Color hover popup (RISK ITEM):** Debug why ImagePopup component doesn't render on hover despite being wired in with state. Likely z-index or portal/layering issue with the frosted glass panel (backdrop-filter + overflow). May need portal rendering or z-index restructuring.
- **Fence button:** Convert from styled button to simple text link with → arrow. Arrow animates right on hover (translateX 3-4px, ease). White text, no background/border. Links to grandviewfence.com.
- **Next button:** Solid orange fill (not just on hover). White text. Primary action appearance.
- **Back button:** Keep current subtle/readable style.

**Files touched:** ColorTab.js, ImagePopup.js, TopNav.js, styles.css

**Dependencies:** None — fully self-contained UI work, no Playwright needed.

**Complexity:** Medium — nav tweaks are simple CSS, but color popup debug is the risk item (z-index/portal issues can cascade).

---

## Dependency Graph

```
01-size-tab  ─────→  02-renderer-bugs  ─────→  03-ui-fixes
 (Playwright          (reuses Playwright        (self-contained,
  validation           infra, same domain)       no Playwright)
  established)
```

- 01 → 02: Sequential. Playwright workflow and Ultra validation context carry forward.
- 02 → 03: No real dependency, but ordered last because it's self-contained and doesn't benefit from warm renderer context.
- 03 could theoretically run in parallel with 02, but user prefers sequential single-thread execution.

---

## Cross-Cutting Concerns

1. **Validation-first:** All renderer changes require Playwright scrape → document → implement → compare workflow.
2. **One fix = one commit:** Atomic changes, verified individually.
3. **Three.js r86:** Legacy API constraints apply throughout.
4. **Don't guess specs:** If a value can't be found in Ultra's tool or iFence, flag it — don't infer.
5. **Revert on break:** If a change breaks something, revert immediately. Don't fix forward.

---

## Execution Commands

```bash
/deep-plan @planning/session-2/01-size-tab/spec.md
/deep-plan @planning/session-2/02-renderer-bugs/spec.md
/deep-plan @planning/session-2/03-ui-fixes/spec.md
```
