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
