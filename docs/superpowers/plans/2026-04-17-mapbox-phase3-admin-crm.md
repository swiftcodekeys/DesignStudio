# Mapbox Phase 3 — Admin CRM Extensions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phases 1 and 2 shipped. Admin CRM repo pushed to GitHub (Task 0.4). `drawToolData` includes EPQS + mapbox snapshot fields. Stripe webhook is forwarding events to CRM.

**Goal:** Extend the admin CRM (`C:\Users\sarah\Desktop\grandview-quote-system\admin-app`) with slope intelligence and partial-capture controls. New D1 columns, yellow "Possible slope" pill on lead cards, red warning when EPQS and customer rackability disagree, CaptureButton for Sarah to capture partial amounts.

**Architecture:**
- D1 migration adds `terrain_flag`, `epqs_data`, `mapbox_snapshot_url`, `stripe_payment_intent_id`, `payment_status`, `authorized_amount_cents`, `captured_amount_cents` columns.
- Worker (`worker/src/index.js`) reads/writes new fields in `rowToLead()` and `POST /leads`. Adds `PATCH /leads/by-payment-intent/:id` (called by stripe-checkout webhook).
- Admin app UI adds pill, filter, Terrain section, CaptureButton.
- Email worker appends terrain check row + red warning when EPQS ≠ customer selection.

**Tech Stack:** Cloudflare D1, Cloudflare Workers, React 18 (admin app), Vite (admin app build).

**Working directory:** `C:\Users\sarah\Desktop\grandview-quote-system` (separate repo from fence-tool).

---

## File Structure Overview

### Created (admin CRM repo)
```
worker/src/migrations/001_terrain_and_stripe.sql
admin-app/src/components/TerrainSection.jsx
admin-app/src/components/SlopePill.jsx
admin-app/src/components/CaptureButton.jsx
admin-app/src/hooks/useCapture.js
```

### Modified (admin CRM repo)
```
worker/src/index.js               # rowToLead, POST /leads, new PATCH /leads/by-payment-intent/:id
admin-app/src/components/LeadCard.jsx
admin-app/src/components/LeadList.jsx (filter)
admin-app/src/components/LeadDetail.jsx (or QuoteDetail.jsx)
```

### Modified (fence-tool repo)
```
WizardShell.js                    # extend submitQuoteToCRM payload with new fields
workers/email-worker/worker.js    # terrain check row
```

---

## Phase 3.1 — D1 Schema Migration

---

### Task 3.1.1: Write migration SQL

**Files:**
- Create: `worker/src/migrations/001_terrain_and_stripe.sql`

- [ ] **Step 1: Create migration file**

```sql
-- worker/src/migrations/001_terrain_and_stripe.sql
-- Adds terrain intelligence and Stripe payment tracking columns to leads.

ALTER TABLE leads ADD COLUMN terrain_flag TEXT;
ALTER TABLE leads ADD COLUMN epqs_data TEXT;
ALTER TABLE leads ADD COLUMN mapbox_snapshot_url TEXT;
ALTER TABLE leads ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE leads ADD COLUMN payment_status TEXT;
ALTER TABLE leads ADD COLUMN authorized_amount_cents INTEGER;
ALTER TABLE leads ADD COLUMN captured_amount_cents INTEGER;
ALTER TABLE leads ADD COLUMN stripe_event_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_terrain_flag ON leads(terrain_flag);
CREATE INDEX IF NOT EXISTS idx_leads_payment_intent ON leads(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_leads_payment_status ON leads(payment_status);
```

- [ ] **Step 2: Apply to D1 (staging)**

```bash
cd "C:/Users/sarah/Desktop/grandview-quote-system/worker"
npx wrangler d1 execute grandview-crm --file src/migrations/001_terrain_and_stripe.sql --preview
```

Verify columns exist:
```bash
npx wrangler d1 execute grandview-crm --command "PRAGMA table_info(leads);" --preview
```

- [ ] **Step 3: Apply to prod D1**

```bash
npx wrangler d1 execute grandview-crm --file src/migrations/001_terrain_and_stripe.sql
```

- [ ] **Step 4: Commit**

```bash
cd ..
git add worker/src/migrations/
git commit -m "feat(crm): add terrain + Stripe columns to leads table"
git push
```

---

## Phase 3.2 — Worker Endpoints

---

### Task 3.2.1: Extend `rowToLead()` with new columns

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Locate `rowToLead` (around lines 76-109)**

```bash
grep -n "rowToLead\|terrain_flag" worker/src/index.js
```

- [ ] **Step 2: Extend function**

In `rowToLead`, add to the returned object:
```javascript
terrain_flag: row.terrain_flag || null,
epqs_data: row.epqs_data ? JSON.parse(row.epqs_data) : null,
mapbox_snapshot_url: row.mapbox_snapshot_url || null,
stripe_payment_intent_id: row.stripe_payment_intent_id || null,
payment_status: row.payment_status || null,
authorized_amount_cents: row.authorized_amount_cents || null,
captured_amount_cents: row.captured_amount_cents || null,
```

- [ ] **Step 3: Commit (deferred — bundle with 3.2.2 for atomicity)**

---

### Task 3.2.2: Extend `POST /leads` to accept new fields

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Locate `POST /leads` handler (lines 138-174)**

- [ ] **Step 2: Extend INSERT statement**

```javascript
var stmt = env.DB.prepare(
  'INSERT INTO leads (zones, contact_info, grand_total, legacy_data, ' +
  'terrain_flag, epqs_data, mapbox_snapshot_url, ' +
  'stripe_payment_intent_id, payment_status, authorized_amount_cents) ' +
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
var result = await stmt.bind(
  JSON.stringify(body.zones || []),
  JSON.stringify(body.contactInfo || {}),
  body.grand_total || 0,
  JSON.stringify(body.legacy_data || {}),
  body.terrain_flag || null,
  body.epqs_data ? JSON.stringify(body.epqs_data) : null,
  body.mapbox_snapshot_url || null,
  body.stripe_payment_intent_id || null,
  body.payment_status || null,
  body.authorized_amount_cents || null
).run();
```

- [ ] **Step 3: Deploy and smoke-test**

```bash
cd worker && npx wrangler deploy
```
Then curl-test:
```bash
curl -X POST https://grandview-crm.sarah-13a.workers.dev/leads \
  -H "Content-Type: application/json" \
  -d '{"contactInfo":{"email":"t@t.com"},"zones":[],"terrain_flag":"possible_slope","epqs_data":{"overall":"sloped","confidence":"high"}}'
```
Expected: 201 with lead id.

- [ ] **Step 4: Commit**

```bash
cd ..
git add worker/src/index.js
git commit -m "feat(crm): accept terrain_flag, epqs_data, mapbox_snapshot_url, stripe fields in POST /leads"
git push
```

---

### Task 3.2.3: Add `PATCH /leads/by-payment-intent/:id`

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Add route handler**

```javascript
// Inside the request router
if (method === 'PATCH' && url.pathname.startsWith('/leads/by-payment-intent/')) {
  var auth = request.headers.get('authorization') || '';
  if (auth !== 'Bearer ' + env.ADMIN_API_KEY) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  var piId = url.pathname.split('/').pop();
  var body = await request.json();

  await env.DB.prepare(
    'UPDATE leads SET payment_status=?, authorized_amount_cents=?, captured_amount_cents=?, stripe_event_id=? ' +
    'WHERE stripe_payment_intent_id=?'
  ).bind(
    body.payment_status || null,
    body.authorized_amount_cents || null,
    body.captured_amount_cents || null,
    body.stripe_event_id || null,
    piId
  ).run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Set `ADMIN_API_KEY` secret**

```bash
cd worker
npx wrangler secret put ADMIN_API_KEY
# paste same value you gave to stripe-checkout worker
cd ..
```

- [ ] **Step 3: Deploy + test**

```bash
cd worker && npx wrangler deploy && cd ..
curl -X PATCH https://grandview-crm.sarah-13a.workers.dev/leads/by-payment-intent/pi_test_123 \
  -H "Authorization: Bearer YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"payment_status":"authorized","authorized_amount_cents":350000}'
```

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(crm): PATCH /leads/by-payment-intent/:id for stripe webhook updates"
git push
```

---

## Phase 3.3 — Admin App UI

---

### Task 3.3.1: `SlopePill` component

**Files:**
- Create: `admin-app/src/components/SlopePill.jsx`

- [ ] **Step 1: Implement**

```jsx
// admin-app/src/components/SlopePill.jsx
import React from 'react';

export function SlopePill({ terrainFlag }) {
  if (terrainFlag !== 'possible_slope') return null;
  return (
    <span className="slope-pill" title="EPQS or customer reported slope — verify">
      ⚠ Possible slope — verify
    </span>
  );
}
```

Add to `admin-app/src/index.css`:
```css
.slope-pill {
  background: #fff8e1; color: #92400e; border: 1px solid #f59e0b;
  border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600;
  display: inline-block;
}
```

- [ ] **Step 2: Commit**

```bash
git add admin-app/src/components/SlopePill.jsx admin-app/src/index.css
git commit -m "feat(admin): SlopePill component"
```

---

### Task 3.3.2: Wire SlopePill into LeadCard

**Files:**
- Modify: `admin-app/src/components/LeadCard.jsx`

- [ ] **Step 1: Import and render**

```jsx
import { SlopePill } from './SlopePill';
// inside LeadCard render:
<SlopePill terrainFlag={lead.terrain_flag} />
```

Place it near other lead badges.

- [ ] **Step 2: Smoke test**

Start admin app (`npm run dev`), verify a test lead with `terrain_flag='possible_slope'` shows the pill.

- [ ] **Step 3: Commit**

```bash
git add admin-app/src/components/LeadCard.jsx
git commit -m "feat(admin): show SlopePill on LeadCard when terrain_flag set"
```

---

### Task 3.3.3: LeadList filter "Show only: Possible slope"

**Files:**
- Modify: `admin-app/src/components/LeadList.jsx` (or wherever filter UI lives)

- [ ] **Step 1: Find existing filters**

```bash
grep -n "filter\|useState" admin-app/src/components/LeadList.jsx
```

- [ ] **Step 2: Add filter state + UI**

```jsx
const [slopeFilter, setSlopeFilter] = useState(false);

// UI: checkbox or toggle in the filter row
<label>
  <input type="checkbox" checked={slopeFilter} onChange={e => setSlopeFilter(e.target.checked)} />
  Show only: Possible slope
</label>

// Filter logic:
const displayed = slopeFilter
  ? leads.filter(l => l.terrain_flag === 'possible_slope')
  : leads;
```

- [ ] **Step 3: Commit**

```bash
git add admin-app/src/components/LeadList.jsx
git commit -m "feat(admin): add 'Show only: Possible slope' filter to LeadList"
```

---

### Task 3.3.4: `TerrainSection` component in LeadDetail

**Files:**
- Create: `admin-app/src/components/TerrainSection.jsx`
- Modify: `admin-app/src/components/LeadDetail.jsx`

- [ ] **Step 1: Implement TerrainSection**

```jsx
// admin-app/src/components/TerrainSection.jsx
import React from 'react';

export function TerrainSection({ lead }) {
  const epqs = lead.epqs_data || {};
  const customerTier = (lead.zones || [])[0]?.config?.rackingTier || 'standard';
  const disagreement =
    (epqs.overall === 'sloped' || epqs.overall === 'steep') && customerTier === 'standard';

  return (
    <section className="terrain-section">
      <h3>Terrain / EPQS</h3>
      {lead.mapbox_snapshot_url && (
        <img src={lead.mapbox_snapshot_url} alt="Satellite thumbnail" className="terrain-map" />
      )}
      <dl>
        <dt>EPQS classification:</dt>
        <dd>{epqs.overall || 'unknown'}</dd>
        <dt>Confidence:</dt>
        <dd>{epqs.confidence || 'low'}</dd>
        <dt>Max delta:</dt>
        <dd>{epqs.maxDeltaInches ? epqs.maxDeltaInches.toFixed(1) + '"' : 'n/a'}</dd>
        <dt>Customer selected:</dt>
        <dd>{customerTier}</dd>
      </dl>
      {disagreement && (
        <div className="terrain-disagreement">
          ⚠ EPQS detected slope but customer selected Standard — verify before production.
        </div>
      )}
    </section>
  );
}
```

CSS:
```css
.terrain-section {
  margin: 1rem 0; padding: 1rem; background: #f9fafb; border-radius: 8px;
}
.terrain-map { max-width: 400px; border-radius: 4px; margin-bottom: 0.75rem; }
.terrain-section dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
.terrain-section dt { font-weight: 600; color: #5a6270; }
.terrain-disagreement {
  margin-top: 0.75rem; padding: 0.75rem; background: #fee2e2; color: #991b1b;
  border-left: 4px solid #dc2626; border-radius: 4px; font-weight: 600;
}
```

- [ ] **Step 2: Wire into LeadDetail**

```jsx
import { TerrainSection } from './TerrainSection';
// inside LeadDetail render:
<TerrainSection lead={lead} />
```

- [ ] **Step 3: Commit**

```bash
git add admin-app/src/components/TerrainSection.jsx admin-app/src/components/LeadDetail.jsx admin-app/src/index.css
git commit -m "feat(admin): TerrainSection shows EPQS vs customer selection with disagreement warning"
```

---

### Task 3.3.5: `CaptureButton` for partial Stripe capture

**Files:**
- Create: `admin-app/src/components/CaptureButton.jsx`
- Create: `admin-app/src/hooks/useCapture.js`
- Modify: `admin-app/src/components/LeadDetail.jsx`

- [ ] **Step 1: Hook**

```jsx
// admin-app/src/hooks/useCapture.js
import { useState } from 'react';

const STRIPE_WORKER_URL = import.meta.env.VITE_STRIPE_WORKER_URL || 'https://grandview-stripe-checkout.sarah-13a.workers.dev';
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY;

export function useCapture() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  async function capture(paymentIntentId, amountCents) {
    setStatus('loading'); setError(null);
    try {
      const r = await fetch(STRIPE_WORKER_URL + '/api/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ADMIN_API_KEY,
        },
        body: JSON.stringify({ paymentIntentId, amountCents }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Capture failed');
      setStatus('success');
      return data;
    } catch (e) {
      setError(e.message); setStatus('error');
      throw e;
    }
  }

  return { capture, status, error };
}
```

- [ ] **Step 2: Component**

```jsx
// admin-app/src/components/CaptureButton.jsx
import React, { useState } from 'react';
import { useCapture } from '../hooks/useCapture';

export function CaptureButton({ lead, onCaptured }) {
  const authorizedCents = lead.authorized_amount_cents || 0;
  const [amount, setAmount] = useState(authorizedCents);
  const { capture, status, error } = useCapture();

  if (!lead.stripe_payment_intent_id) return null;
  if (lead.payment_status === 'captured') {
    return <div className="capture-done">✓ Captured ${(lead.captured_amount_cents / 100).toFixed(2)}</div>;
  }

  async function handle() {
    if (!confirm(`Capture $${(amount/100).toFixed(2)} from this customer\'s card?`)) return;
    try {
      await capture(lead.stripe_payment_intent_id, amount);
      onCaptured?.();
    } catch (e) { /* shown in UI */ }
  }

  return (
    <div className="capture-box">
      <h4>Capture payment</h4>
      <p>Authorized: ${(authorizedCents/100).toFixed(2)}</p>
      <label>Amount to capture (cents):
        <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} max={authorizedCents} />
      </label>
      <button onClick={handle} disabled={status === 'loading'}>
        {status === 'loading' ? 'Capturing…' : `Capture $${(amount/100).toFixed(2)}`}
      </button>
      {error && <div className="capture-error">{error}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Wire into LeadDetail**

```jsx
import { CaptureButton } from './CaptureButton';
// in LeadDetail:
<CaptureButton lead={lead} onCaptured={refetchLead} />
```

- [ ] **Step 4: Add env var**

In `admin-app/.env.local` (gitignored):
```
VITE_STRIPE_WORKER_URL=https://grandview-stripe-checkout.sarah-13a.workers.dev
VITE_ADMIN_API_KEY=<same as worker secret>
```

- [ ] **Step 5: Commit**

```bash
git add admin-app/src/hooks/useCapture.js admin-app/src/components/CaptureButton.jsx admin-app/src/components/LeadDetail.jsx
git commit -m "feat(admin): CaptureButton for partial Stripe captures"
git push
```

---

## Phase 3.4 — Email Worker

---

### Task 3.4.1: Terrain check row in sales email

**Files:**
- Modify: `workers/email-worker/worker.js` (in fence-tool repo)

- [ ] **Step 1: Locate `buildSalesEmailHtml`**

```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
grep -n "buildSalesEmailHtml\|buildZoneSectionHtml" workers/email-worker/worker.js
```

- [ ] **Step 2: Append terrain row**

In `buildSalesEmailHtml`:
```javascript
var terrain = lead.epqs_data || {};
var customerTier = (lead.zones && lead.zones[0] && lead.zones[0].config && lead.zones[0].config.rackingTier) || 'standard';
var disagree = (terrain.overall === 'sloped' || terrain.overall === 'steep') && customerTier === 'standard';

var terrainHtml = '<tr><td><strong>EPQS:</strong></td><td>' + (terrain.overall || 'unknown') + ' (' + (terrain.confidence || 'low') + ')</td></tr>' +
  '<tr><td><strong>Customer selected:</strong></td><td>' + customerTier + '</td></tr>';

if (disagree) {
  terrainHtml += '<tr><td colspan="2" style="background:#fee2e2;color:#991b1b;padding:0.75rem;font-weight:bold;border-left:4px solid #dc2626;">' +
    '\u26A0 EPQS detected slope but customer selected Standard \u2014 verify before production.</td></tr>';
}

// insert terrainHtml into the main HTML table
```

- [ ] **Step 3: Deploy + smoke**

```bash
cd workers/email-worker && npx wrangler deploy && cd ../..
```

Trigger a test email via the CRM worker and verify output in Sarah's inbox.

- [ ] **Step 4: Commit**

```bash
git add workers/email-worker/worker.js
git commit -m "feat(email): add terrain check row + red warning on EPQS/customer disagreement"
```

---

## Phase 3.5 — Fence-tool Side: Pass New Fields

---

### Task 3.5.1: Extend `submitQuoteToCRM` payload

**Files:**
- Modify: `WizardShell.js` (fence-tool repo)

- [ ] **Step 1: Write test**

Extend `tests/wizardShell.payload.test.js`:
```javascript
  it('includes EPQS + mapbox snapshot + Stripe intent in payload', () => {
    const state = {
      zoneQuotes: {
        back: {
          config: {},
          drawToolData: {
            epqsOverall: 'sloped',
            epqsConfidence: 'high',
            epqsMaxDeltaInches: 12,
            mapboxSnapshotUrl: 'data:image/png;base64,xxx',
          },
        },
      },
      stripePaymentIntentId: 'pi_test_1',
    };
    const payload = buildCrmPayload(state, 'order');
    expect(payload.epqs_data.overall).toBe('sloped');
    expect(payload.mapbox_snapshot_url).toContain('data:image');
    expect(payload.stripe_payment_intent_id).toBe('pi_test_1');
    expect(payload.terrain_flag).toBe('possible_slope'); // auto-derived from epqs.overall
  });
```

- [ ] **Step 2: Extend `buildCrmPayload`**

```javascript
export function buildCrmPayload(state, intent) {
  // ... existing zones mapping ...
  var epqs = null; var snapshot = null;
  Object.keys(state.zoneQuotes || {}).forEach(function(zoneId) {
    var d = state.zoneQuotes[zoneId].drawToolData;
    if (d) {
      if (!epqs) {
        epqs = {
          overall: d.epqsOverall, confidence: d.epqsConfidence,
          maxDeltaInches: d.epqsMaxDeltaInches,
        };
      }
      if (!snapshot && d.mapboxSnapshotUrl) snapshot = d.mapboxSnapshotUrl;
    }
  });

  var terrainFlag = null;
  if (epqs && (epqs.overall === 'sloped' || epqs.overall === 'steep' || epqs.overall === 'steps')) {
    terrainFlag = 'possible_slope';
  }

  return Object.assign({}, /* existing payload */, {
    epqs_data: epqs,
    mapbox_snapshot_url: snapshot,
    terrain_flag: terrainFlag,
    stripe_payment_intent_id: state.stripePaymentIntentId || null,
  });
}
```

- [ ] **Step 3: Verify passes + commit**

```bash
npm test -- tests/wizardShell.payload.test.js
git add WizardShell.js tests/wizardShell.payload.test.js
git commit -m "feat(crm): pass EPQS, mapbox snapshot, Stripe PI, terrain_flag to CRM"
```

---

## Phase 3.6 — Acceptance

---

### Task 3.6.1: E2E admin review flow

**Files:**
- Create: `e2e/admin-review.spec.js` (in admin-app repo)

- [ ] **Step 1: Write E2E**

```javascript
import { test, expect } from '@playwright/test';
test('admin sees slope pill + EPQS section for flagged leads', async ({ page }) => {
  await page.goto('https://grandview-admin.pages.dev'); // or preview URL
  await page.fill('input[name="email"]', 'sarah@example.com');
  await page.fill('input[name="password"]', process.env.ADMIN_TEST_PASSWORD);
  await page.click('button:has-text("Sign in")');

  await page.check('input[type="checkbox"]:has-text("Possible slope")'); // or label matching
  const slopePill = page.locator('.slope-pill').first();
  await expect(slopePill).toBeVisible();

  await slopePill.locator('..').click(); // open detail
  await expect(page.locator('.terrain-section')).toBeVisible();
  await expect(page.locator('.terrain-disagreement')).toBeVisible();
});
```

- [ ] **Step 2: Run + commit**

---

### Task 3.6.2: Code review gate

- [ ] **Step 1: Invoke `superpowers:code-reviewer` on Phase 3 commits across both repos**
- [ ] **Step 2: Address findings**
- [ ] **Step 3: Full regression sweep (Phase 1 + 2 E2E all pass)**
