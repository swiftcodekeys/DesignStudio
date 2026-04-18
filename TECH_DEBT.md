# Technical Debt Register

Documented debt to tackle after the Mapbox upgrade ships. Not blocking.

## High-priority
- **Two pricing engines** — `priceCalculator.js` (new) and `pricingEngine.js` (legacy) coexist. Audit which `QuoteStep6_Review → calculateZoneQuote` actually invokes; delete the other. Blocked on Phase 1.9 audit result.
- **`DrawYardView.js` monolith (1,869 lines)** — scheduled for deletion at end of Phase 1 once `USE_MAPBOX_DRAW` flips permanently on.

## Medium-priority
- **Mixed `var` / `let` / `const`** — codebase uses `var` in older files, `const`/`let` in newer. Lint rule + sweep.
- **`React.createElement` vs JSX inconsistency** — some files use `el()` helper and `React.createElement`, some use JSX. Pick one per style guide.
- **No ESLint / Prettier** — add before the next major refactor.

## Low-priority
- **Dead code paths** — `slopedPostCount` in `priceCalculator.js:164` removed during Phase 1.9. Sweep for other dead paths after.
- **Unified snapshot + capture logic** — `captureSnapshot` in `WizardShell.js:330` could be split into its own module.
- **Hardcoded Ultra colors** — live in multiple places (`configData.js`, `retailPricing.js`). Source of truth consolidation.

## Deferred (by design)
- Native mobile app.
- AR / photo simulation / WebXR.
- Corner post differentiation (VFP doesn't do it either; addressed in Phase 3+ if real orders need it).

## EPQS confidence fallback may be over-optimistic — Task 1.5.1

**Discovered:** 2026-04-17 during code review of `epqsClient.js`.

**Issue:** `queryElevation` falls back to `dataSource: '3DEP 1m'` when the USGS EPQS API omits the field (which it does, per smoke test against Howell MI coords). The `classifyDrawnLine` regex `/1m|lidar|3DEP/i` matches that fallback string, so every successful response gets `confidence: 'high'` regardless of actual provenance. The `'low'` branch only fires on network/timeout failure, never on missing-metadata.

**Why deferred:** Implementation matches plan verbatim; plan author appears to have chosen the optimistic default deliberately (the fallback string contains both regex tokens). 3DEP 1m coverage is widespread across CONUS, so the optimistic default may be product-correct for Grandview's Michigan-centric market. But the `confidence` field as exposed to UI is currently a constant `'high'` for all real successful queries — the `'low'` indicator may never display.

**Options when revisited:**
1. Accept as product-intent (optimistic default) — document in user-facing copy.
2. Change fallback to `'unknown'`, accept that `confidence: 'high'` becomes rare/unreachable.
3. Anchor regex (`/\b(1m|lidar|3DEP)\b/i`) AND make fallback honest — only "high" when EPQS explicitly says so.
4. Add a real provenance check (separate USGS coverage API or hardcoded CONUS bbox).

**Files:** `epqsClient.js` lines 18, 36; `tests/epqsClient.test.js` (current tests assume optimistic semantics).

## Live pricing engine — Task 1.9.1

**Audited:** 2026-04-17 via static import-graph analysis.

**Finding:** The live pricing engine called from the production quote flow is `priceCalculator.js`.

**Method:** Traced imports from `QuoteStep6_Review.js` (the review/total step of the wizard). `QuoteStep6_Review.js:6` contains the only inbound import of either engine: `import { calculateZoneQuote } from './priceCalculator'`, and calls it at line 60. No wizard or quote step file imports `pricingEngine.js`.

**Status of the OTHER engine:** DEAD CODE — `pricingEngine.js` exports `calculateQuote` (different function name from `calculateZoneQuote`) and has zero inbound imports from any user-facing file. It contains a self-test harness (`runTests()` at line 384) and was the original pre-redesign engine. Should be removed in a follow-up cleanup task.

**Files that import the live engine (`priceCalculator.js`):**
- `QuoteStep6_Review.js` (sole consumer — imports `calculateZoneQuote`, calls it to render the displayed quote total)

**Files that import the dead/dormant engine (`pricingEngine.js`):**
- None — zero inbound imports from any source file or test file

**Why this matters:** Tasks 1.9.2 (delete dead `slopedPostCount`) and 1.9.3 (5% footage pad) target the LIVE engine. This audit confirms both tasks must edit `priceCalculator.js`, not `pricingEngine.js`. Editing the dead engine would ship no-op changes.
