# Mapbox Draw Upgrade Implementation Plan — Phase 0, 0.5, 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `DrawYardView.js` (Google Maps freehand) with `MapboxDrawView.js` (Mapbox GL JS satellite + Regrid parcel click-to-select + USGS EPQS slope detection + per-segment rackability UI). Behind a `USE_MAPBOX_DRAW` feature flag. Zero regressions when flag is off.

**Architecture:**
- New React component `MapboxDrawView.js` behind `USE_MAPBOX_DRAW` env flag; emits same `drawToolData` contract as `DrawYardView.js` (plus extended fields).
- Cloudflare Worker `parcel-proxy` proxies browser → Regrid API using server-side `REGRID_API_KEY` secret.
- Client-side EPQS calls (no auth needed) for per-6ft-interval elevation → rackability classification.
- Slope popup triggers per-segment rackability cards with color-coded map/sidebar linking.
- Mapbox snapshot captured to data URL → sent to admin CRM.

**Tech Stack:** React 17, webpack 5, Mapbox GL JS v3.x, Cloudflare Workers (wrangler), USGS EPQS REST API, Regrid REST API v2, Vitest (new), Playwright (new).

**Scope of this plan file:** Phases 0 (Foundations), 0.5 (Pre-flight bug cleanup), and 1 (Mapbox draw tool core). Phases 2 (Stripe checkout), 3 (Admin CRM extensions), 4 (Calculator bypass + guide polish) get their own plan files written after Phase 1 ships and is dogfooded.

**Branch:** `feat/quote-redesign` (stay on existing branch — do NOT cut a new one per repo conventions).

---

## File Structure Overview

### Created
```
MapboxDrawView.js               # new top-level React component (replaces DrawYardView when flag on)
SlopePopup.js                   # new modal component
SegmentCard.js                  # new per-segment sidebar card
epqsClient.js                   # USGS EPQS client + classifier
parcelClient.js                 # calls /api/parcel worker endpoint
mapboxGeocoder.js               # wrapper around Mapbox Geocoder
geometryUtils.js                # RDP simplification, side-splitting, angle detection
mapbox.css                      # Mapbox-specific styles

HowToMeasurePage.js             # /how-to-measure-your-yard route

workers/parcel-proxy/           # new Cloudflare Worker
workers/parcel-proxy/src/index.js
workers/parcel-proxy/wrangler.toml
workers/parcel-proxy/package.json

assets/slope-guides/measure-slope.png     # Sarah's board-and-level infographic
assets/slope-guides/post-options.png      # Sarah's post-options infographic

tests/                          # Vitest unit tests
tests/epqsClient.test.js
tests/geometryUtils.test.js
tests/priceCalculator.test.js

e2e/                            # Playwright E2E tests
e2e/draw-flat-yard.spec.js
e2e/draw-sloped-yard.spec.js

TECH_DEBT.md                    # tech debt register

vitest.config.js
playwright.config.js
```

### Modified
```
package.json                    # add mapbox-gl, vitest, playwright, mapbox-gl-geocoder; add test scripts
webpack.config.js               # add USE_MAPBOX_DRAW + MAPBOX_ACCESS_TOKEN env vars
app.js                          # add /how-to-measure-your-yard route; add future flags on Router
WizardShell.js                  # conditional import of draw view (line ~1126); CRM payload extension (line 660); snapshot capture (line 330); hoist grade/installPlan
QuoteBuilder.js                 # pass drawToolData.segments through
QuoteStep2_Layout.js            # pre-fill rackingTier from EPQS (drawToolData.epqsOverall); read ends/endPosts consistently
QuoteStep6_Review.js            # CYA #3; fix endPosts display (read `ends` key); verify Order Now wiring
priceCalculator.js              # delete dead slopedPostCount code (line 164); apply 5% pad when _source==='auto'
```

### Untouched
- `GateRenderer.js`, `FenceRenderer.js`, `UnifiedCanvas.js` (3D renderer)
- `pricingEngine.js` (legacy pricing path — audit only; do not modify until Phase 1.9 verifies it's unused)
- `gate_tool/js/ultra_dsg_min.js` (Ultra's obfuscated code — forbidden to touch)
- `spatialConstants.js`, `SPATIAL_TRUTH.json`
- All `QuoteStep1`, `QuoteStep3`, `QuoteStep4`, `QuoteStep5` files
- Landing page, quiz

---

# Phase 0 — Foundations

Prerequisite work. Unblocks every subsequent phase.

---

### Task 0.1: Add Vitest for unit testing

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Install Vitest**

```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Create `vitest.config.js`**

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Create `tests/setup.js`**

```javascript
// tests/setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Add `test` script to `package.json`**

In `package.json` `scripts` block, add:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 5: Verify with a smoke test**

Create `tests/smoke.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
describe('smoke', () => {
  it('vitest runs', () => { expect(1 + 1).toBe(2); });
});
```

Run: `npm test`
Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js tests/setup.js tests/smoke.test.js
git commit -m "chore: add Vitest + jsdom test infrastructure"
```

---

### Task 0.2: Add Playwright for E2E

**Files:**
- Modify: `package.json`
- Create: `playwright.config.js`
- Create: `e2e/smoke.spec.js`

- [ ] **Step 1: Install Playwright**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.js`**

```javascript
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
```

- [ ] **Step 3: Add `e2e` script to `package.json`**

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Create smoke E2E**

`e2e/smoke.spec.js`:
```javascript
import { test, expect } from '@playwright/test';
test('landing page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});
```

- [ ] **Step 5: Verify**

Run: `npm run e2e`
Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json playwright.config.js e2e/
git commit -m "chore: add Playwright E2E test infrastructure"
```

---

### Task 0.3: Feature flag plumbing

**Files:**
- Modify: `webpack.config.js`

- [ ] **Step 1: Read current `webpack.config.js` DefinePlugin block**

```bash
grep -n "DefinePlugin\|process.env" webpack.config.js
```

- [ ] **Step 2: Add `USE_MAPBOX_DRAW` and `MAPBOX_ACCESS_TOKEN` to DefinePlugin**

In `webpack.config.js`, locate the `new webpack.DefinePlugin({...})` block and add:
```javascript
'process.env.USE_MAPBOX_DRAW': JSON.stringify(process.env.USE_MAPBOX_DRAW === 'true'),
'process.env.MAPBOX_ACCESS_TOKEN': JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN || ''),
'process.env.PARCEL_PROXY_URL': JSON.stringify(process.env.PARCEL_PROXY_URL || 'https://grandview-parcel-proxy.sarah-13a.workers.dev'),
```

- [ ] **Step 3: Verify build still works**

```bash
npx webpack --mode development
```
Expected: build succeeds, no new errors.

- [ ] **Step 4: Commit**

```bash
git add webpack.config.js
git commit -m "chore: add USE_MAPBOX_DRAW feature flag and Mapbox env plumbing"
```

---

### Task 0.4: Admin CRM git-tracking

**Files:**
- Modify: `C:/Users/sarah/Desktop/grandview-quote-system/` (separate repo)

- [ ] **Step 1: Review what's about to be committed**

```bash
cd "C:/Users/sarah/Desktop/grandview-quote-system"
git status
ls -la
```
Expected: `git init` already done, 8 untracked items.

- [ ] **Step 2: Verify no secrets in working tree**

```bash
grep -r "sk_live\|sk_test\|BEGIN RSA\|BEGIN PRIVATE\|api_key\|API_KEY" --include="*.js" --include="*.json" --include="*.toml" --include="*.env" . 2>/dev/null | head -20
```
Expected: no plaintext secrets. `.env` files present must be in `.gitignore`. If a `.env` file exists, verify `.gitignore` covers it; abort task and add to `.gitignore` if missing.

- [ ] **Step 3: Create GitHub repo**

Tell user: "Create a new private GitHub repo at `https://github.com/new` named `grandview-crm` under the `swiftcodekeys` account. Do NOT initialize with README or .gitignore. Reply 'created' when done."

Wait for user confirmation.

- [ ] **Step 4: Commit and push**

```bash
cd "C:/Users/sarah/Desktop/grandview-quote-system"
git add -A
git commit -m "chore: initial commit — admin CRM app (admin-app, customer-app, worker, shared, google-apps-script)"
git branch -M main
git remote add origin https://github.com/swiftcodekeys/grandview-crm.git
git push -u origin main
```

- [ ] **Step 5: Verify push**

```bash
git log --oneline -1
git remote -v
```
Expected: commit hash, two lines with `origin https://github.com/swiftcodekeys/grandview-crm.git`.

---

### Task 0.5: Tech debt register

**Files:**
- Create: `TECH_DEBT.md`

- [ ] **Step 1: Write `TECH_DEBT.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
git add TECH_DEBT.md
git commit -m "docs: add tech debt register"
```

---

### Task 0.6: Install Mapbox GL JS + geocoder

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
npm install mapbox-gl@^3.10.0 @mapbox/mapbox-gl-geocoder
```

- [ ] **Step 2: Verify install**

```bash
node -e "console.log(require('mapbox-gl/package.json').version)"
```
Expected: `3.x.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install mapbox-gl and mapbox-gl-geocoder"
```

---

### Task 0.7: Secrets setup (manual user action)

**Files:** None in-repo; wrangler secret storage.

- [ ] **Step 1: Instruct user**

Tell user:
> Run the following three commands yourself (they prompt for values). I'll wait for "done":
> 1. `wrangler secret put REGRID_API_KEY --name grandview-parcel-proxy` (paste your 30-day trial key)
> 2. `wrangler secret put MAPBOX_ACCESS_TOKEN --name grandview-parcel-proxy` (paste your Mapbox pk.* token — yes, even though it's client-side, we store server-side too for Worker logging)
> 3. For local dev: add `MAPBOX_ACCESS_TOKEN=pk.xxxxx` and `USE_MAPBOX_DRAW=true` to your `.env` file at the fence-tool repo root (create if missing; ensure `.env` is in `.gitignore`).

Wait for user "done".

- [ ] **Step 2: Verify `.env` in `.gitignore`**

```bash
grep -n "^\.env$\|^\.env\s*$" .gitignore
```
Expected: `.env` listed. If not: add it, commit.

```bash
echo ".env" >> .gitignore  # only if missing
git add .gitignore
git commit -m "chore: ensure .env is gitignored"
```

---

# Phase 0.5 — Pre-flight Bug Cleanup

Each fix = one commit per repo's one-fix-one-commit rule.

---

### Task 0.5.1: Hoist `grade` and `installPlan` into CRM payload

**Files:**
- Modify: `WizardShell.js` (line ~660 `submitQuoteToCRM`)
- Test: `tests/wizardShell.payload.test.js`

- [ ] **Step 1: Read the current `submitQuoteToCRM` payload construction**

```bash
sed -n '655,720p' WizardShell.js
```

- [ ] **Step 2: Write failing test**

`tests/wizardShell.payload.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { buildCrmPayload } from '../WizardShell.js';

describe('buildCrmPayload', () => {
  it('includes grade when present', () => {
    const state = {
      zoneQuotes: { back: { config: { grade: 'commercial', height: 48 } } },
      contactInfo: { email: 'x@y.com' },
    };
    const payload = buildCrmPayload(state, 'quote');
    expect(payload.zones[0].grade).toBe('commercial');
  });

  it('includes installPlan when present', () => {
    const state = {
      zoneQuotes: { back: { config: {} } },
      installPlan: 'diy',
      contactInfo: { email: 'x@y.com' },
    };
    const payload = buildCrmPayload(state, 'quote');
    expect(payload.installPlan).toBe('diy');
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

```bash
npm test -- tests/wizardShell.payload.test.js
```
Expected: FAIL — `buildCrmPayload is not a function` (it's inline inside a React component currently).

- [ ] **Step 4: Extract `buildCrmPayload` as a pure function in `WizardShell.js`**

At top of `WizardShell.js` (after imports), add:
```javascript
export function buildCrmPayload(state, intent) {
  var zones = Object.keys(state.zoneQuotes || {}).map(function(zoneId) {
    var zone = state.zoneQuotes[zoneId] || {};
    var config = zone.config || {};
    return {
      zoneId: zoneId,
      config: config,
      grade: config.grade || null,
      quoteData: zone.quoteData || null,
      quoteResult: zone.quoteResult || null,
    };
  });
  return {
    intent: intent,
    zones: zones,
    installPlan: state.installPlan || null,
    contactInfo: state.contactInfo || {},
    shippingAddress: state.shippingAddress || {},
    jobAddress: state.jobAddress || '',
    sameAsInstall: state.sameAsInstall !== false,
  };
}
```

Inside `submitQuoteToCRM` (line ~660), replace the inline payload object with:
```javascript
var payload = buildCrmPayload(state, orderingIntent);
```

- [ ] **Step 5: Run test, verify passes**

```bash
npm test -- tests/wizardShell.payload.test.js
```
Expected: PASS.

- [ ] **Step 6: Manual smoke check**

Run `npm start`, go through quote, submit. In DevTools Network tab, inspect the `/api/leads` POST body. Confirm `grade` and `installPlan` are present (not empty string).

- [ ] **Step 7: Commit**

```bash
git add WizardShell.js tests/wizardShell.payload.test.js
git commit -m "fix(wizard): hoist grade and installPlan into CRM payload"
```

---

### Task 0.5.2: Fix Review page "End Posts: 0" display

**Files:**
- Modify: `QuoteStep6_Review.js`

- [ ] **Step 1: Find the offending line**

```bash
grep -nE "endPosts|ends" QuoteStep6_Review.js | head -10
```
Expect to find either `data.endPosts` (wrong) or `data.ends` (correct) referenced — likely inconsistent.

- [ ] **Step 2: Confirm Layout writes `ends`**

```bash
grep -nE "endPosts|ends[^A-Za-z_]" QuoteStep2_Layout.js | head -10
```
Expected: writes to `data.ends` (see `QuoteBuilder.js:60` `ends != null ? data.ends : 2`).

- [ ] **Step 3: Write failing test**

`tests/quoteStep6.display.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import QuoteStep6_Review from '../QuoteStep6_Review.js';

describe('QuoteStep6_Review display', () => {
  it('shows End Posts count from data.ends', () => {
    const data = {
      grade: 'residential',
      style: 'uaf_200',
      height: 48,
      color: 'textured-black',
      linearFeet: 150,
      ends: 2,
      corners: 0,
      gates: [],
    };
    render(<QuoteStep6_Review data={data} update={()=>{}} onEditStep={()=>{}} zoneName="Test" />);
    expect(screen.getByText(/end posts.*2/i)).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run test, verify fails**

```bash
npm test -- tests/quoteStep6.display.test.js
```
Expected: FAIL — shows 0 or missing.

- [ ] **Step 5: Fix the read in `QuoteStep6_Review.js`**

Find the line that reads `data.endPosts` (or wrong key) and change to `data.ends`. Also check for `data.endPosts || 0` fallback pattern — change to `data.ends || 2` (default matches Layout).

- [ ] **Step 6: Run test, verify passes**

```bash
npm test -- tests/quoteStep6.display.test.js
```

- [ ] **Step 7: Commit**

```bash
git add QuoteStep6_Review.js tests/quoteStep6.display.test.js
git commit -m "fix(review): read data.ends for End Posts display (was reading wrong key)"
```

---

### Task 0.5.3: Verify "Order Now" button submit path

**Files:**
- Read-only: `QuoteStep6_Review.js`, `WizardShell.js`
- Possibly modify: `WizardShell.js` if wiring is broken

- [ ] **Step 1: Trace `Order Now` click path**

```bash
grep -nE "Order Now|orderNow|submitAction|orderingIntent" QuoteStep6_Review.js WizardShell.js
```

Follow from the button's `onClick` to `submitQuoteToCRM`. Expected: both "Submit Quote" and "Order Now" eventually call `submitQuoteToCRM(intent)` with `'quote'` or `'order'` respectively.

- [ ] **Step 2: Write E2E verification test**

`e2e/order-now-path.spec.js`:
```javascript
import { test, expect } from '@playwright/test';

test('Order Now submits with intent=order', async ({ page }) => {
  await page.goto('/');
  // Navigate through quote flow (simplified — jump to step 6 via state fixture in future)
  // For now, just verify the button exists and has a click handler
  await page.goto('/?demo=step6');
  const orderButton = page.getByRole('button', { name: /order now/i });
  if (await orderButton.isVisible()) {
    // Intercept network
    const requestPromise = page.waitForRequest(req =>
      req.url().includes('/api/leads') || req.url().includes('leads')
    );
    await orderButton.click();
    const req = await requestPromise;
    const body = JSON.parse(req.postData() || '{}');
    expect(body.intent).toBe('order');
  } else {
    test.skip(true, 'Order Now button not rendered in demo state — manual test only');
  }
});
```

- [ ] **Step 3: Run and fix any wiring gap**

```bash
npm run e2e -- order-now-path
```

If path is broken: in `QuoteStep6_Review.js` find the `Order Now` button `onClick` and ensure it calls `props.onOrder` which `WizardShell.js` maps to `submitQuoteToCRM('order')`. If already correct, no change.

- [ ] **Step 4: Commit**

If no wiring change needed, commit only the test:
```bash
git add e2e/order-now-path.spec.js
git commit -m "test(e2e): verify Order Now submits with intent=order"
```
If wiring was broken, amend the fix:
```bash
git add QuoteStep6_Review.js WizardShell.js e2e/order-now-path.spec.js
git commit -m "fix(review): wire Order Now button to submitQuoteToCRM with intent=order"
```

---

### Task 0.5.4: React Router v7 future flags

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Find the Router setup**

```bash
grep -nE "BrowserRouter|RouterProvider|createBrowserRouter" app.js
```

- [ ] **Step 2: Add future flags**

Depending on which Router pattern is in use:

**If `BrowserRouter`:**
```javascript
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  {/* ... */}
</BrowserRouter>
```

**If `createBrowserRouter`:**
```javascript
const router = createBrowserRouter(routes, {
  future: { v7_startTransition: true, v7_relativeSplatPath: true },
});
```

- [ ] **Step 3: Run dev server and check console**

```bash
npm start
```
Open http://localhost:3000 and check browser DevTools console. Expected: no v6 → v7 warnings.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "chore(router): enable v7_startTransition + v7_relativeSplatPath future flags"
```

---

# Phase 1 — Mapbox Draw Tool Core

Big phase. Broken into 12 sub-phases (1.1–1.12). Each sub-phase ends with a commit. Phase-level acceptance at the end.

---

## Phase 1.1 — MapboxDrawView shell + globe flyTo

---

### Task 1.1.1: Create `MapboxDrawView.js` skeleton + feature flag wiring

**Files:**
- Create: `MapboxDrawView.js`
- Modify: `WizardShell.js` line ~1126 (the `DrawYardView` render)
- Test: `tests/mapboxDrawView.test.js`

- [ ] **Step 1: Write failing test**

`tests/mapboxDrawView.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock mapbox-gl before importing MapboxDrawView
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(), off: vi.fn(), flyTo: vi.fn(), remove: vi.fn(),
      addSource: vi.fn(), addLayer: vi.fn(), setTerrain: vi.fn(),
    })),
    accessToken: '',
  },
}));

import MapboxDrawView from '../MapboxDrawView.js';

describe('MapboxDrawView', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(container.querySelector('.mbx-container')).toBeTruthy();
  });

  it('renders an address entry screen when no location provided', () => {
    const { getByPlaceholderText } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(getByPlaceholderText(/enter your address/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test, verify fails**

```bash
npm test -- tests/mapboxDrawView.test.js
```
Expected: FAIL — `Cannot find module '../MapboxDrawView.js'`.

- [ ] **Step 3: Write `MapboxDrawView.js` skeleton**

```javascript
// MapboxDrawView.js — Mapbox GL JS satellite draw tool
// Replaces DrawYardView when USE_MAPBOX_DRAW env flag is true.

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './mapbox.css';

var MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

function AddressEntry(props) {
  var addressState = useState('');
  var address = addressState[0];
  var setAddress = addressState[1];

  return React.createElement('div', { className: 'mbx-address-entry' },
    React.createElement('h2', null, 'Enter your address'),
    React.createElement('input', {
      type: 'text',
      placeholder: 'Enter your address (e.g., 123 Main St, Howell MI)',
      value: address,
      onChange: function(e) { setAddress(e.target.value); },
      className: 'mbx-address-input',
    }),
    React.createElement('button', {
      onClick: function() { if (address && props.onAddressEntered) props.onAddressEntered(address); },
      className: 'mbx-address-submit',
      disabled: !address,
    }, 'Find my yard \u2192')
  );
}

function MapboxDrawView(props) {
  var locationState = useState(props.initialLocation || null);
  var location = locationState[0];
  var setLocation = locationState[1];

  return React.createElement('div', { className: 'mbx-container' },
    !location
      ? React.createElement(AddressEntry, { onAddressEntered: function(addr) { setLocation({ address: addr }); } })
      : React.createElement('div', { className: 'mbx-map-placeholder' }, 'Map will render here (Task 1.1.2)')
  );
}

export default MapboxDrawView;
```

- [ ] **Step 4: Create stub `mapbox.css`**

```css
/* mapbox.css */
.mbx-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
}
.mbx-address-entry {
  max-width: 500px;
  margin: 10vh auto;
  padding: 2rem;
  text-align: center;
}
.mbx-address-input {
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 8px;
  margin-bottom: 1rem;
}
.mbx-address-submit {
  padding: 0.75rem 2rem;
  font-size: 16px;
  background: #6BA3C2;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.mbx-address-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.mbx-map-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
```

- [ ] **Step 5: Wire feature flag in `WizardShell.js`**

Find line ~1126 where `DrawYardView` is rendered. Change from:
```javascript
import DrawYardView from './DrawYardView';
// ...
<DrawYardView ... />
```

To:
```javascript
import DrawYardView from './DrawYardView';
import MapboxDrawView from './MapboxDrawView';
var USE_MAPBOX = process.env.USE_MAPBOX_DRAW;
// ...
var DrawView = USE_MAPBOX ? MapboxDrawView : DrawYardView;
React.createElement(DrawView, { onComplete: ..., initialLocation: ... })
```

- [ ] **Step 6: Run test, verify passes**

```bash
npm test -- tests/mapboxDrawView.test.js
```
Expected: PASS.

- [ ] **Step 7: Smoke test locally**

```bash
# Terminal 1
USE_MAPBOX_DRAW=true npm start
```
Open http://localhost:3000. Navigate to the draw step. Expected: Address entry screen renders.

```bash
# Terminal 2 (fresh)
USE_MAPBOX_DRAW=false npm start
```
Open http://localhost:3000. Expected: the old Google Maps DrawYardView renders as before.

- [ ] **Step 8: Commit**

```bash
git add MapboxDrawView.js mapbox.css WizardShell.js tests/mapboxDrawView.test.js
git commit -m "feat(mapbox): add MapboxDrawView skeleton behind USE_MAPBOX_DRAW flag"
```

---

### Task 1.1.2: Initialize Mapbox map with satellite-streets-v12 + globe projection

**Files:**
- Modify: `MapboxDrawView.js`
- Test: `tests/mapboxDrawView.test.js` (extend)

- [ ] **Step 1: Extend failing test**

Add to `tests/mapboxDrawView.test.js`:
```javascript
  it('initializes Mapbox map with satellite-streets-v12 style', async () => {
    const mapboxgl = await import('mapbox-gl');
    const mockMap = vi.fn(() => ({
      on: vi.fn(), off: vi.fn(), flyTo: vi.fn(), remove: vi.fn(),
      addSource: vi.fn(), addLayer: vi.fn(), setTerrain: vi.fn(),
    }));
    mapboxgl.default.Map = mockMap;

    const { rerender } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );

    expect(mockMap).toHaveBeenCalledWith(expect.objectContaining({
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
    }));
  });
```

- [ ] **Step 2: Run, verify fails**

```bash
npm test -- tests/mapboxDrawView.test.js
```
Expected: FAIL — map not initialized.

- [ ] **Step 3: Implement map initialization**

In `MapboxDrawView.js`, replace the `mbx-map-placeholder` render with a real map mount point, and add a `MapScreen` child component:

```javascript
function MapScreen(props) {
  var mapContainerRef = useRef(null);
  var mapRef = useRef(null);

  useEffect(function() {
    if (!mapContainerRef.current || mapRef.current) return;

    var map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
      center: [props.location.lng || 0, props.location.lat || 20],
      zoom: props.location.lat ? 18 : 1,
      maxZoom: 22,
      pitch: 0,
      attributionControl: true,
    });

    mapRef.current = map;

    map.on('load', function() {
      // Add terrain DEM source for 3D toggle later
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      // Fly to location after load
      if (props.location.lat) {
        map.flyTo({
          center: [props.location.lng, props.location.lat],
          zoom: 20,
          pitch: 0,
          duration: 4000,
          essential: true,
        });
      }
    });

    return function() {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [props.location.lat, props.location.lng]);

  return React.createElement('div', {
    ref: mapContainerRef,
    className: 'mbx-map',
    style: { width: '100%', height: '100%' },
  });
}
```

Update `MapboxDrawView` to render `MapScreen` when location is set.

- [ ] **Step 4: Respect `prefers-reduced-motion`**

Inside the `flyTo` call, wrap:
```javascript
var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var duration = prefersReduced ? 0 : 4000;
map.flyTo({ center: [props.location.lng, props.location.lat], zoom: 20, pitch: 0, duration: duration, essential: true });
```

- [ ] **Step 5: Run test, verify passes**

```bash
npm test -- tests/mapboxDrawView.test.js
```

- [ ] **Step 6: Manual smoke**

```bash
USE_MAPBOX_DRAW=true npm start
```
Enter address "123 Main St Howell MI" (stub), verify globe spins down and lands at ~zoom 20 on Michigan. If token is missing, expect Mapbox error in console — add to `.env` per Task 0.7.

- [ ] **Step 7: Commit**

```bash
git add MapboxDrawView.js tests/mapboxDrawView.test.js
git commit -m "feat(mapbox): initialize map with globe projection + flyTo animation"
```

---

### Task 1.1.3: Integrate Mapbox Geocoder for address input

**Files:**
- Create: `mapboxGeocoder.js`
- Modify: `MapboxDrawView.js`
- Test: `tests/mapboxGeocoder.test.js`

- [ ] **Step 1: Write failing test**

`tests/mapboxGeocoder.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { geocodeAddress } from '../mapboxGeocoder.js';

global.fetch = vi.fn();

describe('geocodeAddress', () => {
  it('returns lat/lng for a valid address', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ center: [-83.9, 42.6], place_name: '123 Main St, Howell, MI' }],
      }),
    });
    const result = await geocodeAddress('123 Main St Howell MI', 'pk.test');
    expect(result.lat).toBe(42.6);
    expect(result.lng).toBe(-83.9);
    expect(result.placeName).toContain('Howell');
  });

  it('throws on empty results', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });
    await expect(geocodeAddress('asdf asdf', 'pk.test')).rejects.toThrow(/no results/i);
  });
});
```

- [ ] **Step 2: Verify fails**

```bash
npm test -- tests/mapboxGeocoder.test.js
```

- [ ] **Step 3: Implement `mapboxGeocoder.js`**

```javascript
// mapboxGeocoder.js — Mapbox geocoding API wrapper
// Returns { lat, lng, placeName } or throws.

export async function geocodeAddress(address, token) {
  var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    encodeURIComponent(address) + '.json?access_token=' + token +
    '&country=us&types=address&limit=1';
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Geocoding failed: ' + resp.status);
  var data = await resp.json();
  if (!data.features || data.features.length === 0) {
    throw new Error('No results for address: ' + address);
  }
  var f = data.features[0];
  return {
    lat: f.center[1],
    lng: f.center[0],
    placeName: f.place_name,
  };
}
```

- [ ] **Step 4: Wire into `MapboxDrawView.js` `AddressEntry`**

Modify `AddressEntry` to call `geocodeAddress` on submit:
```javascript
import { geocodeAddress } from './mapboxGeocoder';

function AddressEntry(props) {
  var addressState = useState('');
  var address = addressState[0];
  var setAddress = addressState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];
  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  async function submit() {
    if (!address) return;
    setError(''); setLoading(true);
    try {
      var result = await geocodeAddress(address, MAPBOX_TOKEN);
      props.onAddressEntered(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return React.createElement('div', { className: 'mbx-address-entry' },
    React.createElement('h2', null, 'Enter your address'),
    React.createElement('input', { /* ... */ }),
    error && React.createElement('div', { className: 'mbx-address-error' }, error),
    React.createElement('button', {
      onClick: submit,
      disabled: !address || loading,
    }, loading ? 'Finding...' : 'Find my yard \u2192')
  );
}
```

- [ ] **Step 5: Run test, verify passes**

```bash
npm test -- tests/mapboxGeocoder.test.js
```

- [ ] **Step 6: Manual smoke**

Start with `USE_MAPBOX_DRAW=true`, type a real address, verify globe flies to it.

- [ ] **Step 7: Commit**

```bash
git add mapboxGeocoder.js MapboxDrawView.js mapbox.css tests/mapboxGeocoder.test.js
git commit -m "feat(mapbox): integrate geocoder for address-to-lat-lng resolution"
```

---

### Task 1.1.4: Hydrate from `gv_bridge_location` localStorage

**Files:**
- Modify: `MapboxDrawView.js`
- Test: `tests/mapboxDrawView.test.js` (extend)

- [ ] **Step 1: Write failing test**

Extend:
```javascript
  it('hydrates initial location from gv_bridge_location', () => {
    localStorage.setItem('gv_bridge_location', JSON.stringify({
      lat: 42.6, lng: -83.9, placeName: '123 Main St',
    }));
    const { queryByPlaceholderText } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    // Should skip AddressEntry, go straight to map
    expect(queryByPlaceholderText(/enter your address/i)).toBeFalsy();
    localStorage.clear();
  });
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement hydration**

In `MapboxDrawView`:
```javascript
function MapboxDrawView(props) {
  var locationState = useState(function() {
    if (props.initialLocation) return props.initialLocation;
    try {
      var raw = localStorage.getItem('gv_bridge_location');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  });
  var location = locationState[0];
  var setLocation = locationState[1];

  function handleAddress(loc) {
    try { localStorage.setItem('gv_bridge_location', JSON.stringify(loc)); } catch (e) {}
    setLocation(loc);
  }
  // ...
}
```

- [ ] **Step 4: Verify passes**

- [ ] **Step 5: Commit**

```bash
git add MapboxDrawView.js tests/mapboxDrawView.test.js
git commit -m "feat(mapbox): hydrate initial location from gv_bridge_location localStorage"
```

---

## Phase 1.2 — Parcel Proxy Worker

---

### Task 1.2.1: Scaffold the parcel-proxy Worker

**Files:**
- Create: `workers/parcel-proxy/wrangler.toml`
- Create: `workers/parcel-proxy/package.json`
- Create: `workers/parcel-proxy/src/index.js`

- [ ] **Step 1: Initialize Worker directory**

```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
mkdir -p workers/parcel-proxy/src
```

- [ ] **Step 2: Create `wrangler.toml`**

```toml
# workers/parcel-proxy/wrangler.toml
name = "grandview-parcel-proxy"
main = "src/index.js"
compatibility_date = "2026-04-01"

[vars]
ALLOWED_ORIGINS = "https://grandview-design-studio.pages.dev,http://localhost:3000"

# REGRID_API_KEY and MAPBOX_ACCESS_TOKEN set via `wrangler secret put`
```

- [ ] **Step 3: Create `package.json`**

```json
{
  "name": "grandview-parcel-proxy",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "devDependencies": {
    "wrangler": "^4.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 4: Create a stub `src/index.js`**

```javascript
// workers/parcel-proxy/src/index.js
// Proxies browser requests to Regrid API. Never exposes REGRID_API_KEY to client.

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    var origin = request.headers.get('origin') || '';
    var allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    var corsOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
    var corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'parcel-proxy' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
```

- [ ] **Step 5: Install deps**

```bash
cd workers/parcel-proxy
npm install
```

- [ ] **Step 6: Local dev smoke**

```bash
npx wrangler dev
```
In another shell: `curl http://localhost:8787/health`
Expected: `{"ok":true,"service":"parcel-proxy"}`.

Kill `wrangler dev` with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add workers/parcel-proxy/
git commit -m "feat(worker): scaffold parcel-proxy Cloudflare Worker with /health endpoint"
```

---

### Task 1.2.2: Implement `POST /api/parcel` → Regrid proxy

**Files:**
- Modify: `workers/parcel-proxy/src/index.js`
- Create: `workers/parcel-proxy/tests/index.test.js`

- [ ] **Step 1: Create Vitest config for worker**

`workers/parcel-proxy/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', globals: true },
});
```

- [ ] **Step 2: Write failing test**

`workers/parcel-proxy/tests/index.test.js`:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index.js';

describe('parcel-proxy', () => {
  beforeEach(() => { global.fetch = vi.fn(); });

  it('returns parcel boundary for a valid lat/lng', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parcels: {
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[[-83.9, 42.6], [-83.89, 42.6], [-83.89, 42.61], [-83.9, 42.61], [-83.9, 42.6]]],
            },
            properties: {
              fields: { address: '123 Main St', parcelnumb: '12-34', subdivision: 'Oak Hills' },
              ll_uuid: 'abc-123',
            },
          }],
        },
      }),
    });

    var req = new Request('https://x/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ lat: 42.605, lng: -83.895 }),
    });
    var env = { REGRID_API_KEY: 'test_key', ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    expect(resp.status).toBe(200);
    var data = await resp.json();
    expect(data.ok).toBe(true);
    expect(data.data.boundary.type).toBe('Polygon');
    expect(data.data.address).toBe('123 Main St');
  });

  it('returns fallback:manual when Regrid returns 404 / empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ parcels: { features: [] } }),
    });
    var req = new Request('https://x/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ lat: 0, lng: 0 }),
    });
    var env = { REGRID_API_KEY: 'test_key', ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    var data = await resp.json();
    expect(data.ok).toBe(false);
    expect(data.fallback).toBe('manual');
  });

  it('rejects requests without REGRID_API_KEY', async () => {
    var req = new Request('https://x/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ lat: 42, lng: -83 }),
    });
    var resp = await worker.fetch(req, {});
    expect(resp.status).toBe(500);
  });
});
```

- [ ] **Step 3: Verify fails**

```bash
cd workers/parcel-proxy && npm test
```
Expected: 3 failed.

- [ ] **Step 4: Implement `/api/parcel` in `src/index.js`**

Add inside `fetch` handler, before the 404 fallback:

```javascript
    if (url.pathname === '/api/parcel' && request.method === 'POST') {
      if (!env.REGRID_API_KEY) {
        return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      var body;
      try { body = await request.json(); }
      catch (e) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      var lat = Number(body.lat);
      var lng = Number(body.lng);
      if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid coordinates' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      try {
        var regridUrl = 'https://app.regrid.com/api/v2/parcels/point?lat=' + lat +
          '&lon=' + lng + '&token=' + env.REGRID_API_KEY;
        var rResp = await fetch(regridUrl);
        if (!rResp.ok) throw new Error('Regrid ' + rResp.status);
        var rData = await rResp.json();
        var features = (rData.parcels && rData.parcels.features) || [];
        if (features.length === 0) {
          return new Response(JSON.stringify({ ok: false, fallback: 'manual' }), {
            status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        var feature = features[0];
        var fields = (feature.properties && feature.properties.fields) || {};
        var out = {
          ok: true,
          data: {
            boundary: feature.geometry,
            address: fields.address || fields.scity || '',
            parcelId: fields.parcelnumb || feature.properties.ll_uuid || '',
            subdivision: fields.subdivision || '',
            dataQuality: feature.properties.score || 1,
          },
        };
        return new Response(JSON.stringify(out), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: 'Upstream error', retry: true }), {
          status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }
```

- [ ] **Step 5: Run tests, verify pass**

```bash
npm test
```
Expected: 3 passed.

- [ ] **Step 6: Deploy to Cloudflare**

```bash
npx wrangler deploy
```
Expected output contains: `https://grandview-parcel-proxy.sarah-13a.workers.dev` (or similar).

- [ ] **Step 7: Smoke test deployed worker**

```bash
curl -X POST https://grandview-parcel-proxy.sarah-13a.workers.dev/api/parcel \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"lat":42.6144,"lng":-83.9294}'
```
Expected: `{"ok":true,"data":{...}}` for a real Michigan address (Sarah's home or Howell MI).

- [ ] **Step 8: Commit**

```bash
cd ../..
git add workers/parcel-proxy/
git commit -m "feat(worker): implement /api/parcel → Regrid proxy with CORS and validation"
```

---

### Task 1.2.3: Client `parcelClient.js`

**Files:**
- Create: `parcelClient.js`
- Test: `tests/parcelClient.test.js`

- [ ] **Step 1: Write failing test**

`tests/parcelClient.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { fetchParcel } from '../parcelClient.js';

global.fetch = vi.fn();

describe('fetchParcel', () => {
  it('returns ok with boundary on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true, data: { boundary: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }, address: '123' },
      }),
    });
    const r = await fetchParcel(42.6, -83.9, 'https://parcel.test');
    expect(r.ok).toBe(true);
    expect(r.data.boundary.type).toBe('Polygon');
  });

  it('returns fallback:manual on empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, fallback: 'manual' }),
    });
    const r = await fetchParcel(0, 0, 'https://parcel.test');
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe('manual');
  });

  it('returns fallback:manual on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'));
    const r = await fetchParcel(42, -83, 'https://parcel.test');
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe('manual');
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement**

`parcelClient.js`:
```javascript
// parcelClient.js — client for the parcel-proxy worker
export async function fetchParcel(lat, lng, proxyUrl) {
  try {
    var resp = await fetch(proxyUrl + '/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: lat, lng: lng }),
    });
    if (!resp.ok) return { ok: false, fallback: 'manual', error: 'HTTP ' + resp.status };
    return await resp.json();
  } catch (e) {
    return { ok: false, fallback: 'manual', error: e.message };
  }
}
```

- [ ] **Step 4: Verify passes**

- [ ] **Step 5: Commit**

```bash
git add parcelClient.js tests/parcelClient.test.js
git commit -m "feat(mapbox): add parcelClient for calling parcel-proxy worker"
```

---

## Phase 1.3 — Parcel Render + Segment Generation

---

### Task 1.3.1: Ramer-Douglas-Peucker simplification

**Files:**
- Create: `geometryUtils.js`
- Test: `tests/geometryUtils.test.js`

- [ ] **Step 1: Write failing tests**

`tests/geometryUtils.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { simplifyRDP, angleBetween, splitPolygonIntoSides, compassBearing } from '../geometryUtils.js';

describe('simplifyRDP', () => {
  it('passes through points below threshold', () => {
    const pts = [[0,0],[1,0],[2,0]];
    expect(simplifyRDP(pts, 0.1)).toEqual([[0,0],[2,0]]);
  });

  it('preserves distinct corners', () => {
    const pts = [[0,0],[1,0],[1,1],[0,1],[0,0]];
    const r = simplifyRDP(pts, 0.0001);
    expect(r.length).toBe(5);
  });
});

describe('angleBetween', () => {
  it('returns 90 for right angle', () => {
    expect(Math.abs(angleBetween([0,0],[1,0],[1,1]) - 90)).toBeLessThan(1);
  });
  it('returns 0 for colinear points', () => {
    expect(Math.abs(angleBetween([0,0],[1,0],[2,0]) - 0)).toBeLessThan(1);
  });
});

describe('splitPolygonIntoSides', () => {
  it('splits a square into 4 sides', () => {
    const poly = [[-83.9,42.6],[-83.89,42.6],[-83.89,42.61],[-83.9,42.61],[-83.9,42.6]];
    const sides = splitPolygonIntoSides(poly);
    expect(sides.length).toBe(4);
    expect(sides[0].start).toEqual([-83.9,42.6]);
    expect(sides[0].compassLabel).toBeTruthy();
  });
});

describe('compassBearing', () => {
  it('returns North for due north', () => {
    expect(compassBearing([0,0],[0,1])).toBe('North');
  });
  it('returns East for due east', () => {
    expect(compassBearing([0,0],[1,0])).toBe('East');
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement `geometryUtils.js`**

```javascript
// geometryUtils.js — geometry helpers for Mapbox draw tool

// --- Ramer-Douglas-Peucker ---
function perpendicularDistance(pt, lineStart, lineEnd) {
  var dx = lineEnd[0] - lineStart[0];
  var dy = lineEnd[1] - lineStart[1];
  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(pt[0]-lineStart[0],2) + Math.pow(pt[1]-lineStart[1],2));
  }
  var t = ((pt[0]-lineStart[0])*dx + (pt[1]-lineStart[1])*dy) / (dx*dx + dy*dy);
  var cx = lineStart[0] + t*dx;
  var cy = lineStart[1] + t*dy;
  return Math.sqrt(Math.pow(pt[0]-cx,2) + Math.pow(pt[1]-cy,2));
}

export function simplifyRDP(points, epsilon) {
  if (!points || points.length < 3) return points.slice();
  var dmax = 0, idx = 0;
  for (var i = 1; i < points.length - 1; i++) {
    var d = perpendicularDistance(points[i], points[0], points[points.length-1]);
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > epsilon) {
    var a = simplifyRDP(points.slice(0, idx+1), epsilon);
    var b = simplifyRDP(points.slice(idx), epsilon);
    return a.slice(0, -1).concat(b);
  }
  return [points[0], points[points.length-1]];
}

// --- Angle + compass ---
export function angleBetween(p1, p2, p3) {
  var a1 = Math.atan2(p2[1]-p1[1], p2[0]-p1[0]);
  var a2 = Math.atan2(p3[1]-p2[1], p3[0]-p2[0]);
  var diff = Math.abs(a2 - a1) * 180 / Math.PI;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function compassBearing(start, end) {
  var dx = end[0] - start[0];
  var dy = end[1] - start[1];
  var angle = Math.atan2(dx, dy) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  var dirs = ['North','Northeast','East','Southeast','South','Southwest','West','Northwest'];
  var idx = Math.round(angle / 45) % 8;
  return dirs[idx];
}

// --- Side splitting ---
// Input: closed polygon ring [[lng,lat],...,[lng,lat]] with first === last
// Output: array of sides { start, end, compassLabel, index }
export function splitPolygonIntoSides(polygon) {
  var sides = [];
  for (var i = 0; i < polygon.length - 1; i++) {
    sides.push({
      index: i,
      start: polygon[i],
      end: polygon[i+1],
      compassLabel: compassBearing(polygon[i], polygon[i+1]),
    });
  }
  return sides;
}
```

- [ ] **Step 4: Verify passes**

```bash
npm test -- tests/geometryUtils.test.js
```

- [ ] **Step 5: Commit**

```bash
git add geometryUtils.js tests/geometryUtils.test.js
git commit -m "feat(mapbox): add RDP simplification + side-splitting + compass bearing helpers"
```

---

### Task 1.3.2: Render parcel boundary + highlight sides on map

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: Add parcel render logic**

In `MapScreen` inside `MapboxDrawView.js`, after `map.on('load', ...)` fires, add:
```javascript
import { fetchParcel } from './parcelClient';
import { simplifyRDP, splitPolygonIntoSides } from './geometryUtils';

// inside MapScreen, after map.on('load'):
map.on('idle', async function onceLoaded() {
  map.off('idle', onceLoaded);  // one-shot
  if (props.location.lat == null) return;
  var result = await fetchParcel(
    props.location.lat,
    props.location.lng,
    process.env.PARCEL_PROXY_URL
  );
  if (result.ok && result.data.boundary) {
    var coords = result.data.boundary.coordinates[0];
    var simplified = coords.length > 60 ? simplifyRDP(coords, 0.00001) : coords;
    var sides = splitPolygonIntoSides(simplified);

    map.addSource('parcel', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [simplified] } },
    });
    map.addLayer({
      id: 'parcel-fill',
      type: 'fill',
      source: 'parcel',
      paint: { 'fill-color': '#00d4d4', 'fill-opacity': 0.15 },
    });
    map.addLayer({
      id: 'parcel-outline',
      type: 'line',
      source: 'parcel',
      paint: { 'line-color': '#00d4d4', 'line-width': 2 },
    });

    props.onParcelLoaded(sides, result.data);
  } else {
    props.onParcelFallback();
  }
});
```

Expose `onParcelLoaded` and `onParcelFallback` via props from `MapboxDrawView`.

- [ ] **Step 2: Add state management**

In `MapboxDrawView`:
```javascript
var parcelState = useState(null);
var parcel = parcelState[0];
var setParcel = parcelState[1];
var sidesState = useState([]);
var sides = sidesState[0];
var setSides = sidesState[1];
var fallbackState = useState(false);
var manualMode = fallbackState[0];
var setManualMode = fallbackState[1];

function handleParcelLoaded(newSides, data) {
  setSides(newSides);
  setParcel(data);
}
function handleParcelFallback() {
  setManualMode(true);
}
// pass to MapScreen as props
```

- [ ] **Step 3: Manual smoke**

```bash
USE_MAPBOX_DRAW=true npm start
```
Use a real Michigan address. Expected: parcel boundary renders in translucent cyan. For an address with no Regrid coverage, expect Manual Mode toast.

- [ ] **Step 4: Commit**

```bash
git add MapboxDrawView.js
git commit -m "feat(mapbox): fetch + render parcel boundary with RDP simplification"
```

---

### Task 1.3.3: Color-assign sides and render clickable outlines

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: Define color palette**

At top of `MapboxDrawView.js`:
```javascript
var SEGMENT_COLORS = [
  '#22C55E', // green
  '#3B82F6', // blue
  '#F59E0B', // orange
  '#EC4899', // pink
  '#14B8A6', // teal
  '#A855F7', // purple
];
```

- [ ] **Step 2: Render each side as clickable line layer**

Inside `MapScreen`, after `onParcelLoaded`:
```javascript
sides.forEach(function(side, i) {
  var color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
  var sourceId = 'side-' + i;
  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [side.start, side.end] } },
  });
  map.addLayer({
    id: sourceId + '-line',
    type: 'line',
    source: sourceId,
    paint: { 'line-color': color, 'line-width': 6, 'line-opacity': 0.7 },
  });
  map.addLayer({
    id: sourceId + '-hit',
    type: 'line',
    source: sourceId,
    paint: { 'line-color': color, 'line-width': 20, 'line-opacity': 0 },  // invisible hit area
  });

  map.on('click', sourceId + '-hit', function() {
    props.onSideClicked(side, color);
  });
  map.on('mouseenter', sourceId + '-hit', function() {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', sourceId + '-hit', function() {
    map.getCanvas().style.cursor = '';
  });
});
```

- [ ] **Step 3: Add selected-sides state**

In `MapboxDrawView`:
```javascript
var selectedState = useState([]); // [{ side, color }]
var selectedSides = selectedState[0];
var setSelectedSides = selectedState[1];

function handleSideClicked(side, color) {
  setSelectedSides(function(prev) {
    var exists = prev.find(s => s.side.index === side.index);
    if (exists) return prev.filter(s => s.side.index !== side.index); // toggle off
    return prev.concat([{ side: side, color: color }]);
  });
}
```

- [ ] **Step 4: Render selected sides with thicker stroke**

When `selectedSides` changes, update the matching layers:
```javascript
useEffect(function() {
  if (!mapRef.current) return;
  sides.forEach(function(side, i) {
    var selected = selectedSides.find(s => s.side.index === i);
    var sourceId = 'side-' + i;
    if (mapRef.current.getLayer(sourceId + '-line')) {
      mapRef.current.setPaintProperty(sourceId + '-line', 'line-width', selected ? 10 : 6);
      mapRef.current.setPaintProperty(sourceId + '-line', 'line-opacity', selected ? 1 : 0.7);
    }
  });
}, [selectedSides, sides]);
```

- [ ] **Step 5: Smoke test**

Click property sides, confirm they highlight and toggle.

- [ ] **Step 6: Commit**

```bash
git add MapboxDrawView.js
git commit -m "feat(mapbox): click-to-select property sides with color-coded highlights"
```

---

## Phase 1.4 — Manual Mode + Drag Vertices

---

### Task 1.4.1: Manual Mode toggle

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: Add "Manual Mode" button**

In the `MapboxDrawView` render (above the map), add:
```javascript
React.createElement('button', {
  className: 'mbx-manual-mode-btn',
  onClick: function() { setManualMode(true); },
}, manualMode ? '\u{1F4D0} Manual Mode' : '\u{1F4D0} Use Manual Mode Instead')
```

- [ ] **Step 2: Add click-to-place vertex logic**

Inside `MapScreen`, when `props.manualMode === true`:
```javascript
if (props.manualMode) {
  map.on('click', function(e) {
    props.onManualVertex([e.lngLat.lng, e.lngLat.lat]);
  });
}
```

- [ ] **Step 3: Render manual line as GeoJSON LineString**

```javascript
useEffect(function() {
  if (!mapRef.current || !props.manualPoints) return;
  var id = 'manual-line';
  var geoj = {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: props.manualPoints },
  };
  if (mapRef.current.getSource(id)) {
    mapRef.current.getSource(id).setData(geoj);
  } else {
    mapRef.current.addSource(id, { type: 'geojson', data: geoj });
    mapRef.current.addLayer({
      id: id,
      type: 'line',
      source: id,
      paint: { 'line-color': '#00d4d4', 'line-width': 6 },
    });
  }
}, [props.manualPoints]);
```

- [ ] **Step 4: Wire state**

```javascript
var manualPointsState = useState([]);
var manualPoints = manualPointsState[0];
var setManualPoints = manualPointsState[1];

function handleManualVertex(lngLat) {
  setManualPoints(function(prev) { return prev.concat([lngLat]); });
}
```

- [ ] **Step 5: Smoke test**

Toggle Manual Mode, click to place vertices, verify line forms.

- [ ] **Step 6: Commit**

```bash
git add MapboxDrawView.js
git commit -m "feat(mapbox): add Manual Mode for click-to-place vertex drawing"
```

---

### Task 1.4.2: Draggable vertex handles + snapping (mobile-friendly)

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: Add vertex markers as Mapbox markers**

```javascript
useEffect(function() {
  if (!mapRef.current) return;
  var markers = [];
  props.manualPoints.forEach(function(pt, i) {
    var el = document.createElement('div');
    el.className = 'mbx-vertex-handle';
    el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:white;border:3px solid #00d4d4;cursor:grab;';
    // Invisible wider hit target for touch
    var hit = document.createElement('div');
    hit.style.cssText = 'position:absolute;inset:-22px;';
    el.appendChild(hit);

    var marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat(pt)
      .addTo(mapRef.current);
    marker.on('dragend', function() {
      var ll = marker.getLngLat();
      props.onVertexMoved(i, [ll.lng, ll.lat]);
    });
    markers.push(marker);
  });
  return function() { markers.forEach(function(m) { m.remove(); }); };
}, [props.manualPoints]);
```

- [ ] **Step 2: Snapping on dragend**

In `onVertexMoved` handler in `MapboxDrawView`, check if new position is within ~3m of an existing vertex and snap:
```javascript
function handleVertexMoved(idx, newPt) {
  var snapped = newPt;
  for (var i = 0; i < manualPoints.length; i++) {
    if (i === idx) continue;
    var dist = Math.sqrt(Math.pow(manualPoints[i][0]-newPt[0],2) + Math.pow(manualPoints[i][1]-newPt[1],2));
    if (dist < 0.00003) { snapped = manualPoints[i].slice(); break; }
  }
  setManualPoints(function(prev) {
    var next = prev.slice();
    next[idx] = snapped;
    return next;
  });
}
```

- [ ] **Step 3: Smoke test on mobile viewport**

Chrome DevTools → device mode → iPhone 14. Drag a vertex. Confirm 44×44 touch area works.

- [ ] **Step 4: Commit**

```bash
git add MapboxDrawView.js
git commit -m "feat(mapbox): draggable vertex handles with snap-to-vertex and touch-friendly hit targets"
```

---

## Phase 1.5 — EPQS Integration

---

### Task 1.5.1: `epqsClient.js` for elevation queries

**Files:**
- Create: `epqsClient.js`
- Test: `tests/epqsClient.test.js`

- [ ] **Step 1: Write failing tests**

`tests/epqsClient.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { queryElevation, classifyDrawnLine } from '../epqsClient.js';

global.fetch = vi.fn();

describe('queryElevation', () => {
  it('returns elevation in feet from EPQS response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: 1000.5, location: { x: -83.9, y: 42.6 } }),
    });
    const r = await queryElevation(42.6, -83.9);
    expect(r.elevationFeet).toBeCloseTo(1000.5);
    expect(r.dataSource).toBeDefined();
  });

  it('returns null on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'));
    const r = await queryElevation(42.6, -83.9);
    expect(r).toBeNull();
  });

  it('applies 5s timeout', async () => {
    global.fetch.mockImplementation(() => new Promise(() => {})); // never resolves
    const r = await queryElevation(42.6, -83.9, 100);
    expect(r).toBeNull();
  }, 1000);
});

describe('classifyDrawnLine', () => {
  it('classifies flat when all deltas < 3"', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ value: 100.0 }), // all same
    });
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6]], 50);
    expect(r.overallClassification).toBe('flat');
    expect(r.confidence).toBe('high');  // assume 1m lidar for US coords in test
  });

  it('classifies steep when any delta > 30"', async () => {
    let call = 0;
    global.fetch.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ value: call++ === 0 ? 100.0 : 105.0 }), // 5ft delta = 60"
    }));
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6]], 6);
    expect(r.overallClassification).toBe('steep');
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement**

`epqsClient.js`:
```javascript
// epqsClient.js — USGS EPQS elevation + slope classification

var EPQS_URL = 'https://epqs.nationalmap.gov/v1/json';

export async function queryElevation(lat, lng, timeoutMs) {
  var timeout = timeoutMs || 5000;
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = null;
  try {
    if (controller) timer = setTimeout(function() { controller.abort(); }, timeout);
    var url = EPQS_URL + '?x=' + lng + '&y=' + lat + '&units=Feet&wkid=4326&includeDate=false';
    var resp = await fetch(url, controller ? { signal: controller.signal } : {});
    if (!resp.ok) return null;
    var data = await resp.json();
    if (data == null || data.value == null) return null;
    return {
      elevationFeet: Number(data.value),
      dataSource: data.dataSource || '3DEP 1m',
    };
  } catch (e) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// segments: array of {start:[lng,lat], end:[lng,lat]}
// panelLengthFt: 6 (residential) or 8 (industrial)
// Returns { segmentClassifications:[], overallClassification, confidence, maxDeltaInches }
export async function classifyDrawnLine(points, segmentLengthFt) {
  var panelLen = segmentLengthFt || 6;
  var samples = await Promise.all(points.map(function(pt) {
    return queryElevation(pt[1], pt[0]);  // EPQS uses x=lng, y=lat
  }));

  var allLidar = samples.every(function(s) { return s && /1m|lidar|3DEP/i.test(s.dataSource); });
  var anyNull = samples.some(function(s) { return !s; });

  if (anyNull) {
    return { segmentClassifications: [], overallClassification: 'unknown', confidence: 'low', maxDeltaInches: 0 };
  }

  var classifications = [];
  var maxDelta = 0;
  for (var i = 0; i < samples.length - 1; i++) {
    var deltaFt = Math.abs(samples[i+1].elevationFeet - samples[i].elevationFeet);
    var deltaIn = deltaFt * 12;
    maxDelta = Math.max(maxDelta, deltaIn);
    var c = 'flat';
    if (deltaIn > 36) c = 'steps';
    else if (deltaIn > 20) c = 'steep';
    else if (deltaIn > 6) c = 'sloped';
    classifications.push({
      segmentIndex: i,
      deltaInches: deltaIn,
      classification: c,
      dataSource: samples[i].dataSource,
    });
  }

  var overall = 'flat';
  for (var j = 0; j < classifications.length; j++) {
    if (classifications[j].classification === 'steps') { overall = 'steps'; break; }
    if (classifications[j].classification === 'steep') overall = 'steep';
    else if (classifications[j].classification === 'sloped' && overall === 'flat') overall = 'sloped';
  }

  return {
    segmentClassifications: classifications,
    overallClassification: overall,
    confidence: allLidar ? 'high' : 'low',
    maxDeltaInches: maxDelta,
  };
}
```

- [ ] **Step 4: Verify passes**

- [ ] **Step 5: Manual smoke (real EPQS call)**

In a Node REPL or quick scratch:
```bash
node -e "fetch('https://epqs.nationalmap.gov/v1/json?x=-83.9294&y=42.6144&units=Feet&wkid=4326&includeDate=false').then(r=>r.json()).then(console.log)"
```
Expected: real elevation value for Howell MI.

- [ ] **Step 6: Commit**

```bash
git add epqsClient.js tests/epqsClient.test.js
git commit -m "feat(epqs): add USGS EPQS client and slope classification for drawn fence lines"
```

---

### Task 1.5.2: Wire EPQS into MapboxDrawView post-draw

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: Add classification state**

```javascript
var epqsState = useState(null);
var epqs = epqsState[0];
var setEpqs = epqsState[1];
var epqsLoadingState = useState(false);
var epqsLoading = epqsLoadingState[0];
var setEpqsLoading = epqsLoadingState[1];

import { classifyDrawnLine } from './epqsClient';
```

- [ ] **Step 2: Trigger EPQS after selectedSides or manualPoints stabilizes**

```javascript
useEffect(function() {
  // Build flat array of all points on the drawn line
  var pts = [];
  if (manualMode) pts = manualPoints.slice();
  else selectedSides.forEach(function(ss) {
    pts.push(ss.side.start);
    pts.push(ss.side.end);
  });
  if (pts.length < 2) { setEpqs(null); return; }

  // Sample every ~6 ft along the line
  var samplePts = densifyPath(pts, 6);
  setEpqsLoading(true);
  classifyDrawnLine(samplePts, 6).then(function(result) {
    setEpqs(result);
    setEpqsLoading(false);
  });
}, [selectedSides, manualPoints, manualMode]);
```

- [ ] **Step 3: Add `densifyPath` helper to `geometryUtils.js`**

```javascript
// Add to geometryUtils.js
// Insert interpolated points every approxFeetPerSample feet along the path.
export function densifyPath(points, approxFeetPerSample) {
  if (!points || points.length < 2) return points || [];
  var FEET_PER_DEG_LAT = 364567.2; // approx for mid-latitudes
  var out = [points[0]];
  for (var i = 0; i < points.length - 1; i++) {
    var a = points[i], b = points[i+1];
    var dLng = b[0] - a[0];
    var dLat = b[1] - a[1];
    // Rough feet-distance estimate (good enough for densifying EPQS samples)
    var cosLat = Math.cos(a[1] * Math.PI / 180);
    var feetDist = FEET_PER_DEG_LAT * Math.sqrt(dLat*dLat + dLng*dLng*cosLat*cosLat);
    var steps = Math.max(1, Math.ceil(feetDist / approxFeetPerSample));
    for (var s = 1; s <= steps; s++) {
      var t = s / steps;
      out.push([a[0] + dLng*t, a[1] + dLat*t]);
    }
  }
  return out;
}
```

And a matching test in `tests/geometryUtils.test.js`:
```javascript
import { densifyPath } from '../geometryUtils.js';
describe('densifyPath', () => {
  it('inserts intermediate points', () => {
    const r = densifyPath([[0,0],[0.001,0]], 6);
    expect(r.length).toBeGreaterThan(2);
  });
});
```

- [ ] **Step 4: Verify tests pass**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add MapboxDrawView.js geometryUtils.js tests/geometryUtils.test.js
git commit -m "feat(mapbox): run EPQS classification on drawn fence line"
```

---

## Phase 1.6 — Elevation Badges Per Segment

---

### Task 1.6.1: Render elevation badge HTML markers on segments

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: Add badge rendering**

When `epqs.segmentClassifications` changes, add HTML markers at segment midpoints:
```javascript
useEffect(function() {
  if (!mapRef.current || !epqs || !epqs.segmentClassifications) return;
  var badges = [];
  epqs.segmentClassifications.forEach(function(sc, i) {
    // find midpoint of the segment
    // (requires access to the corresponding segment's points; track this via state)
    // ... implementation depends on how segments are stored ...
    var color = {
      flat: '#22C55E', sloped: '#F59E0B', steep: '#EF4444',
      steps: '#6366F1', unknown: '#9CA3AF',
    }[sc.classification] || '#9CA3AF';

    var arrow = sc.deltaInches > 0 ? '\u2197' : '\u2198';
    var label = arrow + ' ' + sc.deltaInches.toFixed(1) + '"';

    var el = document.createElement('div');
    el.className = 'mbx-elev-badge';
    el.style.cssText = 'background:'+color+';color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;white-space:nowrap;';
    el.textContent = label;

    var marker = new mapboxgl.Marker({ element: el })
      .setLngLat(/* midpoint of segment i */)
      .addTo(mapRef.current);
    badges.push(marker);
  });
  return function() { badges.forEach(function(b) { b.remove(); }); };
}, [epqs]);
```

- [ ] **Step 2: Smoke test**

Verify badges appear on each segment after EPQS completes.

- [ ] **Step 3: Commit**

```bash
git add MapboxDrawView.js
git commit -m "feat(mapbox): show elevation badge per segment (color-coded by slope classification)"
```

---

## Phase 1.7 — Slope Popup + Per-Segment Rackability UI

---

### Task 1.7.1: Slope guide infographics as assets

**Files:**
- Create: `assets/slope-guides/measure-slope.png`
- Create: `assets/slope-guides/post-options.png`

- [ ] **Step 1: Instruct user to save infographics**

Tell user:
> "Save the two infographics you shared into `assets/slope-guides/`:
> - `C:\Users\sarah\Downloads\slope-measurement-infographic (1).png` → `assets/slope-guides/measure-slope.png`
> - `C:\Users\sarah\Downloads\post-options-infographic (1).png` → `assets/slope-guides/post-options.png`
> Reply 'saved' when done."

Wait for confirmation.

- [ ] **Step 2: Verify files exist**

```bash
ls -la assets/slope-guides/
```

- [ ] **Step 3: Commit**

```bash
git add assets/slope-guides/
git commit -m "chore(assets): add slope measurement + post options infographics"
```

---

### Task 1.7.2: `SlopePopup.js` component

**Files:**
- Create: `SlopePopup.js`
- Test: `tests/slopePopup.test.js`

- [ ] **Step 1: Write failing test**

`tests/slopePopup.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import SlopePopup from '../SlopePopup.js';

describe('SlopePopup', () => {
  it('shows three slope options', () => {
    const { getByText } = render(
      <SlopePopup open={true} onAnswer={()=>{}} onClose={()=>{}} />
    );
    expect(getByText(/mostly flat/i)).toBeTruthy();
    expect(getByText(/some sections slope/i)).toBeTruthy();
    expect(getByText(/very sloped throughout/i)).toBeTruthy();
  });

  it('calls onAnswer with selected option', () => {
    const onAnswer = vi.fn();
    const { getByText } = render(
      <SlopePopup open={true} onAnswer={onAnswer} onClose={()=>{}} />
    );
    fireEvent.click(getByText(/some sections slope/i));
    fireEvent.click(getByText(/continue/i));
    expect(onAnswer).toHaveBeenCalledWith('some');
  });

  it('renders measure-slope infographic', () => {
    const { container } = render(
      <SlopePopup open={true} onAnswer={()=>{}} onClose={()=>{}} />
    );
    expect(container.querySelector('img[src*="measure-slope"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement**

`SlopePopup.js`:
```javascript
// SlopePopup.js — modal asking the customer about yard slope
import React, { useState } from 'react';

function SlopePopup(props) {
  if (!props.open) return null;
  var choiceState = useState(null);
  var choice = choiceState[0];
  var setChoice = choiceState[1];

  return React.createElement('div', { className: 'mbx-slope-popup-overlay' },
    React.createElement('div', { className: 'mbx-slope-popup' },
      React.createElement('h2', null, 'Does your yard have slope?'),
      React.createElement('img', {
        src: 'assets/slope-guides/measure-slope.png',
        alt: 'How to measure yard slope with a board and level',
        className: 'mbx-slope-infographic',
      }),
      React.createElement('div', { className: 'mbx-slope-options' },
        ['flat', 'some', 'all'].map(function(val) {
          var label = {
            flat: 'Mostly flat \u2014 no panels need racking',
            some: 'Some sections slope \u2014 I\u2019ll mark them',
            all:  'Very sloped throughout',
          }[val];
          return React.createElement('label', {
            key: val, className: 'mbx-slope-option' + (choice === val ? ' selected' : ''),
          },
            React.createElement('input', {
              type: 'radio', name: 'slope', value: val,
              checked: choice === val,
              onChange: function() { setChoice(val); },
            }),
            React.createElement('span', null, label)
          );
        })
      ),
      React.createElement('div', { className: 'mbx-slope-help' },
        React.createElement('h4', null, 'How to verify:'),
        React.createElement('a', { href: 'https://youtube.com/TODO', target: '_blank', rel: 'noopener' },
          '\u{1F4F9} Watch: How to measure your yard slope'),
        React.createElement('a', { href: '/how-to-measure-your-yard', target: '_blank', rel: 'noopener' },
          '\u{1F4C4} Read: Full slope measurement guide')
      ),
      React.createElement('div', { className: 'mbx-slope-footer' },
        React.createElement('button', { onClick: props.onClose }, 'Cancel'),
        React.createElement('button', {
          className: 'primary',
          disabled: !choice,
          onClick: function() { props.onAnswer(choice); },
        }, 'Continue \u2192')
      )
    )
  );
}

export default SlopePopup;
```

- [ ] **Step 4: Add styles to `mapbox.css`**

```css
.mbx-slope-popup-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.mbx-slope-popup {
  background: white; border-radius: 12px; padding: 2rem;
  max-width: 700px; width: 90vw; max-height: 90vh; overflow-y: auto;
}
.mbx-slope-infographic { width: 100%; height: auto; margin: 1rem 0; border-radius: 8px; }
.mbx-slope-options { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; }
.mbx-slope-option {
  padding: 0.75rem; border: 2px solid #e8eaed; border-radius: 8px; cursor: pointer;
  display: flex; gap: 0.5rem; align-items: center;
}
.mbx-slope-option.selected { border-color: #6BA3C2; background: #f0f7fb; }
.mbx-slope-help { margin: 1rem 0; padding: 1rem; background: #f9fafb; border-radius: 8px; }
.mbx-slope-help a { display: block; color: #6BA3C2; text-decoration: none; margin: 0.25rem 0; }
.mbx-slope-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
.mbx-slope-footer .primary { background: #d4753a; color: white; border: none; padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer; }
.mbx-slope-footer .primary:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) {
  .mbx-slope-popup { padding: 1rem; width: 100vw; height: 100vh; max-height: 100vh; border-radius: 0; }
}
```

- [ ] **Step 5: Verify passes**

- [ ] **Step 6: Commit**

```bash
git add SlopePopup.js mapbox.css tests/slopePopup.test.js
git commit -m "feat(mapbox): SlopePopup component with three options + measurement infographic"
```

---

### Task 1.7.3: `SegmentCard.js` per-segment rackability card

**Files:**
- Create: `SegmentCard.js`
- Test: `tests/segmentCard.test.js`

- [ ] **Step 1: Write failing test**

`tests/segmentCard.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import SegmentCard from '../SegmentCard.js';

describe('SegmentCard', () => {
  it('renders segment label with compass + length', () => {
    const s = { index: 0, compassLabel: 'North', lengthFeet: 48, color: '#22C55E', panels: 8 };
    const { getByText } = render(
      <SegmentCard segment={s} rackingTier="standard" epqsClassification="flat" onChange={()=>{}} />
    );
    expect(getByText(/north.*48.*ft/i)).toBeTruthy();
  });

  it('fires onChange when tier is changed', () => {
    const s = { index: 0, compassLabel: 'North', lengthFeet: 48, color: '#22C55E', panels: 8 };
    const onChange = vi.fn();
    const { getByLabelText } = render(
      <SegmentCard segment={s} rackingTier="standard" epqsClassification="flat" onChange={onChange} />
    );
    fireEvent.click(getByLabelText(/rackable/i));
    expect(onChange).toHaveBeenCalledWith(0, 'rackable');
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement**

`SegmentCard.js`:
```javascript
// SegmentCard.js — per-segment rackability picker (color-coded to match map)
import React, { useState } from 'react';

function SegmentCard(props) {
  var s = props.segment;
  var expandedState = useState(false);
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];

  var tier = props.rackingTier || 'standard';

  return React.createElement('div', {
    className: 'mbx-segment-card' + (props.highlighted ? ' highlighted' : ''),
    onMouseEnter: function() { if (props.onHover) props.onHover(s.index); },
    onMouseLeave: function() { if (props.onHover) props.onHover(null); },
    style: { borderLeftColor: s.color },
  },
    React.createElement('div', { className: 'mbx-segment-header' },
      React.createElement('span', { className: 'mbx-segment-swatch', style: { background: s.color } }),
      React.createElement('strong', null, s.compassLabel || ('Segment ' + (s.index + 1))),
      React.createElement('span', { className: 'mbx-segment-meta' },
        s.lengthFeet.toFixed(0) + ' ft \u00B7 ' + s.panels + ' panels'),
    ),
    React.createElement('div', { className: 'mbx-segment-body' },
      React.createElement('label', { className: 'mbx-tier-inline' },
        React.createElement('select', {
          value: tier,
          onChange: function(e) { props.onChange(s.index, e.target.value); },
        },
          React.createElement('option', { value: 'standard' }, 'Standard (flat, 0-6")'),
          React.createElement('option', { value: 'rackable' }, 'Rackable (6-20") +$4.75/post'),
          React.createElement('option', { value: 'heavy-rackable' }, 'Heavy Rack (20-36") +$4.75/post'),
        )
      ),
      props.epqsClassification === 'unknown' ?
        React.createElement('div', { className: 'mbx-segment-warning' },
          '\u26A0 We couldn\u2019t auto-detect slope here. Please verify.') : null,
      React.createElement('a', {
        href: '/how-to-measure-your-yard', target: '_blank', rel: 'noopener',
        className: 'mbx-segment-help',
      }, '\u2139 how to verify')
    )
  );
}

export default SegmentCard;
```

- [ ] **Step 4: Add styles to `mapbox.css`**

```css
.mbx-segment-card {
  padding: 1rem; background: white; border-radius: 8px; margin-bottom: 0.5rem;
  border-left: 6px solid #22C55E;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: box-shadow 0.2s;
}
.mbx-segment-card.highlighted { box-shadow: 0 0 0 2px #6BA3C2; }
.mbx-segment-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.mbx-segment-swatch { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
.mbx-segment-meta { color: #8e95a0; margin-left: auto; font-size: 13px; }
.mbx-segment-body { display: flex; flex-direction: column; gap: 0.5rem; }
.mbx-segment-warning { color: #d97706; font-size: 13px; }
.mbx-segment-help { color: #6BA3C2; font-size: 12px; text-decoration: none; }
```

- [ ] **Step 5: Verify passes**

- [ ] **Step 6: Commit**

```bash
git add SegmentCard.js mapbox.css tests/segmentCard.test.js
git commit -m "feat(mapbox): SegmentCard component with color swatch + tier dropdown"
```

---

### Task 1.7.4: Wire SlopePopup + SegmentCards + map-sidebar hover linking

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: State for slope flow**

```javascript
var slopePopupOpenState = useState(false);
var slopePopupOpen = slopePopupOpenState[0];
var setSlopePopupOpen = slopePopupOpenState[1];
var slopeAnswerState = useState(null); // 'flat' | 'some' | 'all' | null
var slopeAnswer = slopeAnswerState[0];
var setSlopeAnswer = slopeAnswerState[1];
var segmentsState = useState([]); // [{ index, lengthFeet, color, compassLabel, panels, rackingTier, epqsClassification }]
var segments = segmentsState[0];
var setSegments = segmentsState[1];
var highlightedIdxState = useState(null);
var highlightedIdx = highlightedIdxState[0];
var setHighlightedIdx = highlightedIdxState[1];
```

- [ ] **Step 2: Trigger popup when draw stabilizes**

Add a "Done drawing" button that opens the popup:
```javascript
React.createElement('button', {
  className: 'mbx-done-btn',
  onClick: function() { setSlopePopupOpen(true); },
  disabled: selectedSides.length === 0 && manualPoints.length < 2,
}, 'Done — review slope \u2192'),
```

- [ ] **Step 3: Build segments when answer is provided**

```javascript
function handleSlopeAnswer(answer) {
  setSlopeAnswer(answer);
  setSlopePopupOpen(false);

  // Build segments array
  var src = manualMode
    ? buildSegmentsFromManual(manualPoints)
    : buildSegmentsFromSides(selectedSides);

  var segs = src.map(function(s, i) {
    // Default tier per spec: use EPQS per-segment if 'some'; override by blanket answer otherwise
    var epqsSeg = epqs && epqs.segmentClassifications[i];
    var epqsClass = epqsSeg ? epqsSeg.classification : 'unknown';
    var tier;
    if (answer === 'flat') tier = 'standard';
    else if (answer === 'all') tier = epqsClass === 'steep' || epqsClass === 'steps' ? 'heavy-rackable' : 'rackable';
    else {
      // 'some' → EPQS-derived
      if (epqsClass === 'flat') tier = 'standard';
      else if (epqsClass === 'sloped') tier = 'rackable';
      else if (epqsClass === 'steep' || epqsClass === 'steps') tier = 'heavy-rackable';
      else tier = 'standard';
    }
    return Object.assign({}, s, { rackingTier: tier, epqsClassification: epqsClass });
  });
  setSegments(segs);
}
```

- [ ] **Step 4: Add `buildSegmentsFromSides` / `buildSegmentsFromManual` helpers**

```javascript
function buildSegmentsFromSides(selected) {
  return selected.map(function(ss, i) {
    var lengthFt = distanceBetween(ss.side.start, ss.side.end);
    return {
      index: i,
      lengthFeet: lengthFt,
      color: ss.color,
      compassLabel: ss.side.compassLabel,
      panels: Math.ceil(lengthFt / 6),
      start: ss.side.start,
      end: ss.side.end,
    };
  });
}

function buildSegmentsFromManual(points) {
  var segs = [];
  for (var i = 0; i < points.length - 1; i++) {
    var color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    var lengthFt = distanceBetween(points[i], points[i+1]);
    segs.push({
      index: i, lengthFeet: lengthFt, color: color,
      compassLabel: compassBearing(points[i], points[i+1]),
      panels: Math.ceil(lengthFt / 6),
      start: points[i], end: points[i+1],
    });
  }
  return segs;
}

function distanceBetween(a, b) {
  // Haversine in feet
  var R = 20902231;
  var dLat = (b[1]-a[1]) * Math.PI/180;
  var dLng = (b[0]-a[0]) * Math.PI/180;
  var lat1 = a[1] * Math.PI/180;
  var lat2 = b[1] * Math.PI/180;
  var x = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
```

- [ ] **Step 5: Render sidebar with `SegmentCard`s**

When `slopeAnswer !== null` and not 'flat':
```javascript
import SegmentCard from './SegmentCard';

React.createElement('div', { className: 'mbx-sidebar' },
  React.createElement('h3', null, 'Your fence segments'),
  React.createElement('p', null, 'Leave Standard on flat sections. Only change the ones with slope.'),
  segments.map(function(s) {
    return React.createElement(SegmentCard, {
      key: s.index,
      segment: s,
      rackingTier: s.rackingTier,
      epqsClassification: s.epqsClassification,
      highlighted: highlightedIdx === s.index,
      onHover: setHighlightedIdx,
      onChange: function(idx, tier) {
        setSegments(function(prev) {
          return prev.map(function(x) {
            return x.index === idx ? Object.assign({}, x, { rackingTier: tier, customerOverrode: true }) : x;
          });
        });
      },
    });
  })
)
```

- [ ] **Step 6: Map pulse on hover**

When `highlightedIdx !== null`, pulse that segment's map layer:
```javascript
useEffect(function() {
  if (!mapRef.current) return;
  segments.forEach(function(s) {
    var layerId = 'side-' + s.index + '-line';  // reuse existing layers
    if (mapRef.current.getLayer(layerId)) {
      mapRef.current.setPaintProperty(layerId, 'line-width',
        highlightedIdx === s.index ? 14 : 10);
    }
  });
}, [highlightedIdx, segments]);
```

- [ ] **Step 7: Smoke test**

Full user flow: address → parcel → click 3 sides → done → popup → "Some slope" → segment cards render color-matched → hover on card pulses map → change a dropdown → state updates.

- [ ] **Step 8: Commit**

```bash
git add MapboxDrawView.js
git commit -m "feat(mapbox): wire slope popup + per-segment cards with map-sidebar hover linking"
```

---

## Phase 1.8 — drawToolData Contract + Snapshot

---

### Task 1.8.1: Emit complete `drawToolData` payload

**Files:**
- Modify: `MapboxDrawView.js`

- [ ] **Step 1: Build and emit drawToolData on "Continue to Quote"**

Add "Continue to Quote" button that fires `props.onComplete(drawToolData)`:
```javascript
function buildDrawToolData() {
  var totalFeet = segments.reduce(function(a, s) { return a + s.lengthFeet; }, 0);
  var paddedFeet = Math.ceil(totalFeet * 1.05);
  return {
    totalFeet: paddedFeet,
    rawFeet: totalFeet,
    corners: segments.length - 1 + (manualMode ? 0 : 0),
    ends: 2,
    lines: [{
      id: 'line-0',
      color: '#00d4d4',
      points: manualMode ? manualPoints.slice() : segments.flatMap(function(s) { return [s.start, s.end]; }),
      segments: segments.slice(),
    }],
    slopeAnswer: slopeAnswer,
    epqsOverall: epqs ? epqs.overallClassification : 'unknown',
    epqsConfidence: epqs ? epqs.confidence : 'low',
    epqsMaxDeltaInches: epqs ? epqs.maxDeltaInches : 0,
    mapboxSnapshotUrl: null, // filled by snapshot step
    source: 'auto',
    parcel: parcel,
  };
}

React.createElement('button', {
  className: 'mbx-continue-btn primary',
  onClick: function() {
    var data = buildDrawToolData();
    captureSnapshot().then(function(url) {
      data.mapboxSnapshotUrl = url;
      props.onComplete(data);
    });
  },
  disabled: segments.length === 0 || slopeAnswer == null,
}, 'Continue to Quote \u2192')
```

- [ ] **Step 2: Snapshot capture**

```javascript
function captureSnapshot() {
  return new Promise(function(resolve) {
    if (!mapRef.current) { resolve(null); return; }
    mapRef.current.once('render', function() {
      resolve(mapRef.current.getCanvas().toDataURL('image/png'));
    });
    mapRef.current.triggerRepaint();
  });
}
```

- [ ] **Step 3: Verify QuoteStep2 receives it**

In the browser, open DevTools. Log `drawToolData` from `QuoteBuilder.js` to confirm shape.

- [ ] **Step 4: Commit**

```bash
git add MapboxDrawView.js
git commit -m "feat(mapbox): emit drawToolData contract with segments, EPQS, snapshot URL"
```

---

## Phase 1.9 — Wire into Pricing + Verify Engine

---

### Task 1.9.1: Audit which pricing engine runs

**Files:**
- Read-only

- [ ] **Step 1: Add breadcrumb logs**

In `priceCalculator.js` and `pricingEngine.js` top of their exported function, add:
```javascript
// priceCalculator.js calculateZoneQuote
console.log('[pricing] priceCalculator.calculateZoneQuote called');

// pricingEngine.js
console.log('[pricing] pricingEngine.calculateZoneQuote called');
```

- [ ] **Step 2: Run full quote flow**

```bash
npm start
```
Go through a full quote. Observe which log fires.

- [ ] **Step 3: Document finding in TECH_DEBT.md**

Update `TECH_DEBT.md` with: `Confirmed live engine: <priceCalculator.js | pricingEngine.js>.`

- [ ] **Step 4: Remove breadcrumb logs**

- [ ] **Step 5: Commit**

```bash
git add TECH_DEBT.md priceCalculator.js pricingEngine.js
git commit -m "docs: document which pricing engine is live after audit"
```

---

### Task 1.9.2: Remove dead `slopedPostCount` code

**Files:**
- Modify: `priceCalculator.js`
- Test: `tests/priceCalculator.test.js`

- [ ] **Step 1: Write failing test**

`tests/priceCalculator.test.js`:
```javascript
import { describe, it, expect } from 'vitest';
import { calculateZoneQuote } from '../priceCalculator.js';

describe('calculateZoneQuote racking', () => {
  it('applies $4.75 per post for every post when rackingTier = rackable', () => {
    const config = {
      grade: 'residential',
      style: 'uaf_200',
      height: 48,
      linearFeet: 60, // 10 panels
      rackingTier: 'rackable',
      ends: 2,
      corners: 0,
      gates: [],
    };
    const r = calculateZoneQuote(config);
    const rackLine = r.items.find(i => /double-punch|racking/i.test(i.label));
    expect(rackLine).toBeTruthy();
    // 10 panels = 11 posts total; 11 × 4.75 = 52.25
    expect(rackLine.qty).toBe(11);
    expect(rackLine.unitPrice).toBe(4.75);
  });

  it('ignores stale slopedPostCount field', () => {
    const config = {
      grade: 'residential', style: 'uaf_200', height: 48, linearFeet: 60,
      rackingTier: 'rackable',
      slopedPostCount: 5,  // stale
      ends: 2, corners: 0, gates: [],
    };
    const r = calculateZoneQuote(config);
    const rackLine = r.items.find(i => /double-punch|racking/i.test(i.label));
    expect(rackLine.qty).toBe(11); // NOT 5
  });
});
```

- [ ] **Step 2: Verify fails (second test)**

The first test passes currently. The second fails because current code honors `slopedPostCount`.

- [ ] **Step 3: Fix `priceCalculator.js:164`**

Change:
```javascript
var slopedPosts = config.slopedPostCount || totalPosts;
```
To:
```javascript
var slopedPosts = totalPosts;
```

- [ ] **Step 4: Verify passes**

- [ ] **Step 5: Commit**

```bash
git add priceCalculator.js tests/priceCalculator.test.js
git commit -m "fix(pricing): remove dead slopedPostCount code — rackable surcharge applies to every post"
```

---

### Task 1.9.3: 5% padding on auto-drawn footage

**Files:**
- Modify: `priceCalculator.js`
- Modify: `QuoteStep2_Layout.js` (pass `source` through)
- Test: `tests/priceCalculator.test.js`

- [ ] **Step 1: Write failing test**

Add to `tests/priceCalculator.test.js`:
```javascript
  it('pads footage by 5% when source is auto', () => {
    const config = {
      grade: 'residential', style: 'uaf_200', height: 48,
      linearFeet: 100,
      _source: 'auto',
      rackingTier: 'standard', ends: 2, corners: 0, gates: [],
    };
    const r = calculateZoneQuote(config);
    const panelLine = r.items.find(i => /panels/i.test(i.label));
    // 105 ft / 6 ft = 17.5 → ceil = 18 panels
    expect(panelLine.qty).toBe(18);
  });

  it('does NOT pad footage when source is manual', () => {
    const config = {
      grade: 'residential', style: 'uaf_200', height: 48,
      linearFeet: 100,
      _source: 'manual',
      rackingTier: 'standard', ends: 2, corners: 0, gates: [],
    };
    const r = calculateZoneQuote(config);
    const panelLine = r.items.find(i => /panels/i.test(i.label));
    // 100 ft / 6 ft = 16.67 → ceil = 17 panels
    expect(panelLine.qty).toBe(17);
  });
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Fix `priceCalculator.js:59-60`**

Change:
```javascript
var linearFt = config.linearFeet || 0;
var panelCount = Math.ceil(linearFt / panelLengthFt);
```
To:
```javascript
var rawLinearFt = config.linearFeet || 0;
var linearFt = (config._source === 'auto') ? Math.ceil(rawLinearFt * 1.05) : rawLinearFt;
var panelCount = Math.ceil(linearFt / panelLengthFt);
```

- [ ] **Step 4: Propagate `_source` in `QuoteStep2_Layout.js`**

Find where `data` is initialized or drawn-data absorbed, and write `_source`:
```javascript
useEffect(function() {
  if (drawToolData && data._source !== 'auto') {
    update({
      linearFeet: drawToolData.totalFeet,
      _source: 'auto',
      rackingTier: drawToolData.epqsOverall === 'sloped' ? 'rackable'
        : drawToolData.epqsOverall === 'steep' || drawToolData.epqsOverall === 'steps' ? 'heavy-rackable'
        : 'standard',
    });
  } else if (!drawToolData && !data._source) {
    update({ _source: 'manual' });
  }
}, [drawToolData]);
```

- [ ] **Step 5: Verify passes**

- [ ] **Step 6: Commit**

```bash
git add priceCalculator.js QuoteStep2_Layout.js tests/priceCalculator.test.js
git commit -m "feat(pricing): 5% footage pad when source=auto; pre-fill rackingTier from EPQS"
```

---

## Phase 1.10 — Mobile Polish

---

### Task 1.10.1: Draw mode toggle for mobile

**Files:**
- Modify: `MapboxDrawView.js`, `mapbox.css`

- [ ] **Step 1: Add Navigate / Draw toggle button**

```javascript
var drawModeState = useState('navigate'); // 'navigate' | 'draw'
var drawMode = drawModeState[0];
var setDrawMode = drawModeState[1];

React.createElement('button', {
  className: 'mbx-mode-toggle ' + drawMode,
  onClick: function() { setDrawMode(drawMode === 'navigate' ? 'draw' : 'navigate'); },
},
  drawMode === 'navigate' ? '\u270B Navigate \u2192 tap to Draw' : '\u270F\uFE0F Draw \u2192 tap to Navigate'
)
```

- [ ] **Step 2: Gate map interactions on drawMode**

When `drawMode === 'navigate'`, disable side clicks and manual-vertex clicks:
```javascript
if (drawMode === 'navigate') {
  map.dragPan.enable();
  // side click handlers only fire when drawMode === 'draw'
}
```

Guard click handlers:
```javascript
map.on('click', sourceId + '-hit', function() {
  if (props.drawMode !== 'draw') return;
  props.onSideClicked(side, color);
});
```

- [ ] **Step 3: Auto-exit draw mode after 3s idle**

```javascript
useEffect(function() {
  if (drawMode !== 'draw') return;
  var timer = setTimeout(function() { setDrawMode('navigate'); }, 3000);
  return function() { clearTimeout(timer); };
}, [drawMode, selectedSides, manualPoints]);
```

- [ ] **Step 4: Style the button prominently**

```css
.mbx-mode-toggle {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  padding: 12px 24px; border-radius: 999px; border: none; font-weight: 600;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10; min-height: 44px;
  cursor: pointer;
}
.mbx-mode-toggle.navigate { background: white; color: #1a1a2e; }
.mbx-mode-toggle.draw { background: #d4753a; color: white; }
```

- [ ] **Step 5: Commit**

```bash
git add MapboxDrawView.js mapbox.css
git commit -m "feat(mapbox): mobile draw-mode toggle (Navigate/Draw) with 3s auto-exit"
```

---

### Task 1.10.2: Bottom drawer sidebar on mobile

**Files:**
- Modify: `mapbox.css`

- [ ] **Step 1: Responsive sidebar styles**

```css
.mbx-sidebar {
  position: fixed; right: 0; top: 0; width: 360px; height: 100vh;
  background: white; overflow-y: auto; padding: 1rem;
  box-shadow: -2px 0 12px rgba(0,0,0,0.08);
  z-index: 5;
}

@media (max-width: 768px) {
  .mbx-sidebar {
    position: fixed; left: 0; right: 0; bottom: 0; top: auto;
    width: 100vw; height: 50vh; max-height: 60vh;
    border-radius: 16px 16px 0 0;
    transform: translateY(calc(100% - 60px));
    transition: transform 0.25s;
  }
  .mbx-sidebar.open { transform: translateY(0); }
  .mbx-sidebar::before {
    content: ''; position: absolute; top: 8px; left: 50%; transform: translateX(-50%);
    width: 40px; height: 4px; border-radius: 2px; background: #ccc;
  }
}
```

- [ ] **Step 2: Add open/closed state with drag-to-expand stub**

(Implementation deferred — just toggle on tap of the pill for now.)
```javascript
var sidebarOpenState = useState(true);
// apply .open class conditionally
```

- [ ] **Step 3: Smoke test on 375px viewport**

Chrome DevTools iPhone SE. Verify bottom drawer slides.

- [ ] **Step 4: Commit**

```bash
git add mapbox.css MapboxDrawView.js
git commit -m "feat(mapbox): mobile bottom-drawer sidebar (slides from bottom on < 768px)"
```

---

## Phase 1.11 — Six CYA Touchpoints

---

### Task 1.11.1: Draw-tool start banner (CYA #1)

**Files:**
- Modify: `MapboxDrawView.js`, `mapbox.css`

- [ ] **Step 1: Add banner (once per session)**

```javascript
var bannerShownState = useState(function() {
  return !sessionStorage.getItem('gv_draw_banner_shown');
});
var bannerShown = bannerShownState[0];
var setBannerShown = bannerShownState[1];

bannerShown && React.createElement('div', { className: 'mbx-cya-banner' },
  'You\u2019ll mark your fence line on this map. ',
  React.createElement('strong', null,
    'It\u2019s your responsibility to double-check the math and validate your measurements yourself '),
  '\u2014 we\u2019ll verify with you before production, but the measurements you enter are what we build to.',
  React.createElement('button', {
    onClick: function() {
      sessionStorage.setItem('gv_draw_banner_shown', '1');
      setBannerShown(false);
    },
  }, 'Got it')
)
```

- [ ] **Step 2: Styles**

```css
.mbx-cya-banner {
  position: absolute; top: 0; left: 0; right: 0;
  background: #fff8e1; border-bottom: 2px solid #f59e0b;
  padding: 0.75rem 1rem; z-index: 20; display: flex; gap: 1rem; align-items: center;
  font-size: 14px;
}
.mbx-cya-banner button {
  margin-left: auto; padding: 4px 12px; border: 1px solid #f59e0b;
  background: white; border-radius: 4px; cursor: pointer;
}
```

- [ ] **Step 3: Commit**

```bash
git add MapboxDrawView.js mapbox.css
git commit -m "feat(mapbox): CYA #1 draw-tool start banner (measurement responsibility)"
```

---

### Task 1.11.2: Quote summary CYA card (CYA #3)

**Files:**
- Modify: `QuoteStep6_Review.js`

- [ ] **Step 1: Add card above review table**

Find the top of the rendered review content in `QuoteStep6_Review.js` and insert:
```javascript
React.createElement('div', { className: 'qs6-cya-card' },
  React.createElement('h4', null, 'Before you continue'),
  React.createElement('p', null,
    'This quote assumes your measurements are accurate. Slope, obstacles, and utilities are yours to verify before install. Sarah personally reviews every order within 24 hours.')
),
```

- [ ] **Step 2: Style (reuse existing card patterns in wizard.css)**

```css
/* add to wizard.css */
.qs6-cya-card {
  background: #f0f7fb; border-left: 4px solid #6BA3C2;
  padding: 1rem; border-radius: 8px; margin-bottom: 1rem;
}
.qs6-cya-card h4 { margin: 0 0 0.5rem; color: #1a1a2e; }
.qs6-cya-card p { margin: 0; color: #5a6270; font-size: 14px; }
```

- [ ] **Step 3: Commit**

```bash
git add QuoteStep6_Review.js wizard.css
git commit -m "feat(quote): CYA #3 measurement responsibility card on review page"
```

---

### Task 1.11.3: Confirmation email next-steps line (CYA #5)

**Files:**
- Modify: `workers/email-worker/worker.js`

- [ ] **Step 1: Find confirmation email template**

```bash
grep -n "Next steps\|confirmation\|subject" workers/email-worker/worker.js | head
```

- [ ] **Step 2: Append CYA line**

In the confirmation email HTML builder, add:
```javascript
'<h3 style="color:#1a1a2e">Next steps</h3>' +
'<p>Grandview reviews every order within 24 hours. If your site conditions differ from the quote (slope, obstacles, utility lines), we\u2019ll reach out before production starts.</p>'
```

- [ ] **Step 3: Deploy worker**

```bash
cd workers/email-worker && npx wrangler deploy && cd ../..
```

- [ ] **Step 4: Commit**

```bash
git add workers/email-worker/worker.js
git commit -m "feat(email): CYA #5 next-steps line in order confirmation email"
```

---

## Phase 1.12 — /how-to-measure-your-yard Route

---

### Task 1.12.1: Create `HowToMeasurePage.js` with markdown rendering

**Files:**
- Create: `HowToMeasurePage.js`
- Modify: `package.json` (add `react-markdown`)
- Modify: `app.js` (add route)

- [ ] **Step 1: Install react-markdown**

```bash
npm install react-markdown remark-gfm
```

- [ ] **Step 2: Create `HowToMeasurePage.js`**

```javascript
// HowToMeasurePage.js — renders docs/research/how-to-measure-yard-for-fence-guide.md
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TopNav from './TopNav';
import BacklinksFooter from './BacklinksFooter';

function HowToMeasurePage() {
  var contentState = useState('');
  var content = contentState[0];
  var setContent = contentState[1];

  useEffect(function() {
    fetch('/docs/how-to-measure-yard-for-fence-guide.md')
      .then(function(r) { return r.text(); })
      .then(setContent);
  }, []);

  return React.createElement('div', { className: 'how-to-measure-page' },
    React.createElement(TopNav, null),
    React.createElement('div', { className: 'htm-content' },
      React.createElement('div', { className: 'htm-hero' },
        React.createElement('h1', null, 'How to Measure Your Yard for a Fence Order'),
        React.createElement('p', null, 'A complete homeowner\u2019s guide for Grandview Fence customers.')
      ),
      React.createElement('div', { className: 'htm-body' },
        React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, content)
      )
    ),
    React.createElement(BacklinksFooter, null)
  );
}

export default HowToMeasurePage;
```

- [ ] **Step 3: Copy the markdown into `dist/docs/`**

Modify `webpack.config.js` `CopyPlugin` patterns to include:
```javascript
{ from: 'docs/research/how-to-measure-yard-for-fence-guide.md', to: 'docs/how-to-measure-yard-for-fence-guide.md' },
{ from: 'assets/slope-guides', to: 'assets/slope-guides' },
```

- [ ] **Step 4: Add route to `app.js`**

```javascript
import HowToMeasurePage from './HowToMeasurePage';
// in the router:
<Route path="/how-to-measure-your-yard" element={<HowToMeasurePage />} />
```

- [ ] **Step 5: Style**

Add to `styles.css`:
```css
.how-to-measure-page { min-height: 100vh; background: #f9fafb; }
.htm-content { max-width: 800px; margin: 0 auto; padding: 2rem; background: white; }
.htm-hero h1 { font-size: 2.5rem; color: #1a1a2e; margin-bottom: 0.5rem; }
.htm-body { line-height: 1.6; color: #333; }
.htm-body h2 { margin-top: 2rem; color: #1a1a2e; }
.htm-body img { max-width: 100%; height: auto; margin: 1rem 0; }
.htm-body table { border-collapse: collapse; margin: 1rem 0; }
.htm-body th, .htm-body td { border: 1px solid #e8eaed; padding: 0.5rem 1rem; }
```

- [ ] **Step 6: Smoke test**

Build and open `/how-to-measure-your-yard`. Verify markdown + infographics render.

- [ ] **Step 7: Commit**

```bash
git add HowToMeasurePage.js app.js webpack.config.js styles.css package.json package-lock.json
git commit -m "feat(content): /how-to-measure-your-yard route rendering research markdown"
```

---

## Phase 1 — Acceptance Gates

Before merging `feat/quote-redesign` or flipping `USE_MAPBOX_DRAW` permanently on:

### Task 1.A.1: Playwright E2E — flat yard path

**Files:**
- Create: `e2e/draw-flat-yard.spec.js`

- [ ] **Step 1: Write E2E**

```javascript
import { test, expect } from '@playwright/test';

test.describe('flat yard end-to-end', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.process = { env: { USE_MAPBOX_DRAW: 'true' } };
    });
  });

  test('draws 4 property sides, answers flat, reaches checkout ready state', async ({ page }) => {
    await page.goto('/');
    // Navigate to draw step (TODO: stub state or use existing flow)
    await page.fill('input[placeholder*="address"]', '123 Main St, Howell MI');
    await page.click('button:has-text("Find my yard")');
    await page.waitForTimeout(5000); // globe flyTo + parcel fetch

    // Click 4 parcel sides (coords depend on real parcel; use mock or real Howell address)
    // For now, manual mode is the reliable fallback:
    await page.click('button:has-text("Manual Mode")');
    await page.click('.mbx-map', { position: { x: 400, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 300 } });
    await page.click('.mbx-map', { position: { x: 600, y: 500 } });
    await page.click('.mbx-map', { position: { x: 400, y: 500 } });

    await page.click('button:has-text("Done — review slope")');
    await page.click('label:has-text("Mostly flat")');
    await page.click('button:has-text("Continue")');

    await expect(page.locator('button:has-text("Continue to Quote")')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run e2e -- draw-flat-yard
```

- [ ] **Step 3: Commit when passing**

```bash
git add e2e/draw-flat-yard.spec.js
git commit -m "test(e2e): flat-yard draw path reaches checkout-ready state"
```

---

### Task 1.A.2: Playwright E2E — sloped yard path

**Files:**
- Create: `e2e/draw-sloped-yard.spec.js`

- [ ] **Step 1: Write E2E**

```javascript
import { test, expect } from '@playwright/test';

test.describe('sloped yard end-to-end', () => {
  test('answers "some slope" → per-segment cards render with color match', async ({ page }) => {
    await page.addInitScript(() => {
      window.process = { env: { USE_MAPBOX_DRAW: 'true' } };
    });
    await page.goto('/');
    // ... same address + manual mode flow as above ...
    await page.click('button:has-text("Done — review slope")');
    await page.click('label:has-text("Some sections slope")');
    await page.click('button:has-text("Continue")');

    const cards = page.locator('.mbx-segment-card');
    await expect(cards).toHaveCount(4);

    // Color swatch should match the border-left-color
    const firstSwatch = cards.nth(0).locator('.mbx-segment-swatch');
    await expect(firstSwatch).toHaveCSS('background-color', /rgb/);

    // Changing dropdown fires state update
    await cards.nth(0).locator('select').selectOption('rackable');
    // drawToolData should reflect override — checked via network inspection in a larger integration test
  });
});
```

- [ ] **Step 2: Run and commit**

```bash
npm run e2e -- draw-sloped-yard
git add e2e/draw-sloped-yard.spec.js
git commit -m "test(e2e): sloped-yard path renders per-segment cards with color matching"
```

---

### Task 1.A.3: Code review gate

- [ ] **Step 1: Invoke code-reviewer subagent**

Dispatch `superpowers:code-reviewer` against all commits on `feat/quote-redesign` since branch start. Address any blocking findings.

- [ ] **Step 2: Address findings**

Make fixes as needed, one commit each.

- [ ] **Step 3: Re-run full test suite**

```bash
npm test
npm run e2e
```

All green.

---

### Task 1.A.4: Zero-regression check (flag off)

- [ ] **Step 1: Flip flag off**

```bash
USE_MAPBOX_DRAW=false npm start
```

- [ ] **Step 2: Walk entire existing flow**

Confirm old `DrawYardView` still works byte-for-byte as before. Draw a line, complete a quote, submit. Payload matches pre-change expectations.

---

### Task 1.A.5: Staging dogfood (48h)

- [ ] **Step 1: Deploy with flag ON to staging**

Update Cloudflare Pages env var: `USE_MAPBOX_DRAW=true`. Deploy to a preview URL only (not prod).

- [ ] **Step 2: Wait**

Sarah tests the flow herself for 48 hours. Notes go in `journal.txt`.

- [ ] **Step 3: Phase 1 exit**

When Sarah approves, Phase 1 is complete. Ready to start Phase 2 planning (Stripe checkout) in a separate plan file.

---

# Post-Phase-1 Followups (write separate plan files)

The next plans, to be written after Phase 1 ships:
1. `docs/superpowers/plans/YYYY-MM-DD-mapbox-phase2-checkout.md` — Stripe auth-then-capture, `/checkout` page, BNPL wiring, Stripe webhook.
2. `docs/superpowers/plans/YYYY-MM-DD-mapbox-phase3-admin-crm.md` — D1 migration (`terrain_flag`, `epqs_data`, `mapbox_snapshot_url`, `stripe_payment_intent_id`), LeadCard pill, LeadDetail terrain section, partial capture button.
3. `docs/superpowers/plans/YYYY-MM-DD-mapbox-phase4-calculator-bypass.md` — "I already know my measurements" entry, guide polish, Ultra spec follow-ups.

Then: delete `DrawYardView.js` in a final commit once flag has been on in prod for 2+ weeks with no regressions.
