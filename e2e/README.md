# E2E Tests -- Grandview Design Studio

## Stack

- Playwright (`@playwright/test ^1.59.1`, already a devDependency)
- Webpack dev server on port 3033 (`USE_MAPBOX_DRAW=true`)
- Config: `playwright.config.js` at the repo root

## Run all E2E tests

```bash
npm run e2e
```

## Run the full-order audit spec only

```bash
npx playwright test e2e/full-order-audit.spec.js
```

## Run with the Playwright UI (step-through debugger)

```bash
npm run e2e:ui
```

## Run against the Cloudflare Pages preview

```bash
BASE_URL=https://feat-quote-redesign.designstudio-csy.pages.dev npx playwright test
```

The `playwright.config.js` reads `process.env.BASE_URL` if set; otherwise
it defaults to `http://localhost:3033` and auto-starts the webpack dev server.
(The `webServer` block in the config handles that.)

## Specs

| File | Purpose |
|------|---------|
| `smoke.spec.js` | Landing page loads |
| `draw-flat-yard.spec.js` | Flat yard draw flow + pricing math chain |
| `draw-sloped-yard.spec.js` | Sloped yard hook injection + math comparison |
| `order-now-path.spec.js` | Order Now CTA fires with `intent=order` |
| `full-order-audit.spec.js` | **Regression guard** -- every secondary option survives to Review + CRM payload |

## full-order-audit.spec.js -- what it guards

This is the permanent regression harness added after Task 5 field-drop fixes.
It seeds `gv_saved_design`, `gv_fence_config`, and `gv_slope_answer` with a
known configuration (Vanguard, Textured Bronze, Ball Cap, Tri-Finial,
Circles + Butterflies, Pro spacing) before the page loads, then asserts:

1. `window.__DRAW_TOOL_DATA__` has 2 lines with per-segment racking tiers.
2. `annotatedSnapshotUrl` is a PNG data URI.
3. QuoteBuilder sidebar spec list shows all 8 option rows.
4. Review step (step 5) shows every field with the correct value.
5. CRM payload object contains all manufacturing fields.
6. No `gv_*` state bleeds between test runs.

Mapbox GL canvas clicks are not used -- Playwright cannot fire vertex events
in headless mode. The draw math chain is tested via `window.__DRAW_TOOL_DATA__`
injection (same strategy as `draw-flat-yard.spec.js` and `draw-sloped-yard.spec.js`).

Regrid parcel calls and EPQS elevation calls are intercepted via `page.route()`
and return canned responses -- no live API keys required.

## CI

There is no GitHub Actions workflow in this repo yet. The recommended next
step is to add `.github/workflows/e2e.yml` with:

```yaml
name: E2E
on: [push, pull_request]
jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          USE_MAPBOX_DRAW: "true"
          MAPBOX_TOKEN: ${{ secrets.MAPBOX_TOKEN }}
```

Until that workflow is added, run `npm run e2e` locally before merging any
branch that touches QuoteBuilder, QuoteStep[1-6], wizardState, or
MapboxDrawView. The full-order-audit spec is the minimum bar.
