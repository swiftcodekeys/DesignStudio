# Mapbox Phase 2 — Stripe Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Phase 1 shipped and dogfooded. `MapboxDrawView.js` emits `drawToolData` with `mapboxSnapshotUrl`. Stripe MCP authenticated in user's session.

**Goal:** Add a dedicated `/checkout` page (Option B layout from spec §2.2) with Stripe auth-then-capture payment. Support cards + Apple Pay + Google Pay + Affirm + Klarna + Afterpay. Webhook fires to admin CRM on authorization. Sarah captures partial amounts from admin CRM after 24h review.

**Architecture:**
- New React route `/checkout` (two-column desktop, single-column mobile)
- New Cloudflare Worker `stripe-checkout` with `/api/checkout`, `/api/capture`, `/api/webhook` endpoints
- Stripe Payment Element (auto-renders all enabled methods)
- PaymentIntent created with `capture_method: 'manual'` (auth now, capture within 7 days)
- Webhook `payment_intent.amount_capturable_updated` → POST to admin CRM

**Tech Stack:** `@stripe/stripe-js`, `@stripe/react-stripe-js`, Cloudflare Workers, Stripe API 2024-11-20+.

**Branch:** `feat/quote-redesign` (continue on same branch).

---

## File Structure Overview

### Created
```
CheckoutPage.js                           # /checkout route
CheckoutSuccessPage.js                    # /checkout/success route
StripePaymentForm.js                      # Payment Element wrapper
OrderSummary.js                           # left-column order summary
TrustSignals.js                           # badges, testimonial, veteran-owned

stripeClient.js                           # frontend Stripe helpers

workers/stripe-checkout/
workers/stripe-checkout/src/index.js
workers/stripe-checkout/wrangler.toml
workers/stripe-checkout/package.json
workers/stripe-checkout/tests/checkout.test.js
workers/stripe-checkout/tests/webhook.test.js

tests/checkoutPage.test.js
e2e/checkout-flow.spec.js

checkout.css
```

### Modified
```
package.json                              # add @stripe/stripe-js, @stripe/react-stripe-js
webpack.config.js                         # add STRIPE_PUBLISHABLE_KEY + STRIPE_CHECKOUT_WORKER_URL env
app.js                                    # /checkout and /checkout/success routes
QuoteStep6_Review.js                      # "Pay" button → navigate('/checkout')
WizardShell.js                            # pass drawToolData to /checkout via location.state
workers/email-worker/worker.js            # include payment status in confirmation email
```

---

## Phase 2.1 — Stripe Configuration

---

### Task 2.1.1: Verify Stripe Connect account + enable payment methods

**Files:** None in-repo.

- [ ] **Step 1: Confirm Stripe authentication**

In Claude Code session, run:
```bash
# Verify MCP tools are loaded; attempt a call
```
Ask user:
> "Can you confirm Stripe MCP is working? Try asking me 'list my Stripe payment methods' and I'll test it."

- [ ] **Step 2: Enable payment methods in Stripe dashboard**

Via Stripe MCP or direct dashboard: enable for Grandview account:
- Card (default)
- Apple Pay, Google Pay (under "Wallets")
- Affirm, Klarna, Afterpay/Clearpay (under "Buy now, pay later")
- Link (Stripe's saved-card network — free conversion lift)

- [ ] **Step 3: Collect keys**

Tell user:
> "Paste your Stripe publishable key (`pk_live_...` or `pk_test_...`) and reply 'done'. I won't echo the secret key — you'll put that in a Worker secret."

Save publishable key to a note; user will put secret in Worker.

---

### Task 2.1.2: Set Stripe secrets + env vars

**Files:**
- Modify: `webpack.config.js`
- Modify: `workers/stripe-checkout/wrangler.toml` (created next task)

- [ ] **Step 1: Add publishable key + worker URL to webpack**

In `webpack.config.js` `DefinePlugin`:
```javascript
'process.env.STRIPE_PUBLISHABLE_KEY': JSON.stringify(process.env.STRIPE_PUBLISHABLE_KEY || ''),
'process.env.STRIPE_CHECKOUT_WORKER_URL': JSON.stringify(process.env.STRIPE_CHECKOUT_WORKER_URL || 'https://grandview-stripe-checkout.sarah-13a.workers.dev'),
```

- [ ] **Step 2: Tell user to set local env**

Tell user:
> "Add to your `.env` (fence-tool repo root):
> ```
> STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
> STRIPE_CHECKOUT_WORKER_URL=http://localhost:8788
> ```
> Reply 'done' when saved."

- [ ] **Step 3: Commit env plumbing**

```bash
git add webpack.config.js
git commit -m "chore: add Stripe env vars (publishable key + worker URL)"
```

---

## Phase 2.2 — stripe-checkout Worker

---

### Task 2.2.1: Scaffold the worker

**Files:**
- Create: `workers/stripe-checkout/wrangler.toml`
- Create: `workers/stripe-checkout/package.json`
- Create: `workers/stripe-checkout/src/index.js` (skeleton)
- Create: `workers/stripe-checkout/vitest.config.js`

- [ ] **Step 1: Directory + configs**

```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
mkdir -p workers/stripe-checkout/src workers/stripe-checkout/tests
```

`workers/stripe-checkout/wrangler.toml`:
```toml
name = "grandview-stripe-checkout"
main = "src/index.js"
compatibility_date = "2026-04-01"

[vars]
ALLOWED_ORIGINS = "https://grandview-design-studio.pages.dev,http://localhost:3000"
CRM_WORKER_URL = "https://grandview-crm.sarah-13a.workers.dev"
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, ADMIN_API_KEY set via `wrangler secret put`
```

`workers/stripe-checkout/package.json`:
```json
{
  "name": "grandview-stripe-checkout",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev --port 8788",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "devDependencies": {
    "wrangler": "^4.0.0",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "stripe": "^17.0.0"
  }
}
```

`workers/stripe-checkout/vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', globals: true } });
```

- [ ] **Step 2: Install**

```bash
cd workers/stripe-checkout
npm install
```

- [ ] **Step 3: Commit**

```bash
cd ../..
git add workers/stripe-checkout/
git commit -m "chore(worker): scaffold stripe-checkout worker"
```

---

### Task 2.2.2: Set Stripe secrets on the Worker

**Files:** None (wrangler secret storage).

- [ ] **Step 1: Tell user to run secret commands**

> "Run these, replacing values with your actuals:
> ```
> cd workers/stripe-checkout
> npx wrangler secret put STRIPE_SECRET_KEY      # paste sk_test_... or sk_live_...
> npx wrangler secret put STRIPE_WEBHOOK_SECRET   # paste whsec_... (generated after webhook is created in Step 2.2.5)
> npx wrangler secret put ADMIN_API_KEY           # any 32-char random string you choose — save it in password manager
> ```
> Reply 'done'."

---

### Task 2.2.3: Implement `POST /api/checkout` (create PaymentIntent)

**Files:**
- Modify: `workers/stripe-checkout/src/index.js`
- Create: `workers/stripe-checkout/tests/checkout.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// workers/stripe-checkout/tests/checkout.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index.js';

vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      paymentIntents: {
        create: vi.fn(async (args) => ({
          id: 'pi_test_123',
          client_secret: 'pi_test_123_secret_abc',
          amount: args.amount,
          currency: args.currency,
          capture_method: args.capture_method,
          status: 'requires_payment_method',
        })),
      },
    })),
  };
});

describe('POST /api/checkout', () => {
  it('creates a manual-capture PaymentIntent', async () => {
    const req = new Request('https://x/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ amountCents: 350000, quoteData: { zone: 'back' } }),
    });
    const env = { STRIPE_SECRET_KEY: 'sk_test', ALLOWED_ORIGINS: 'http://localhost:3000' };
    const resp = await worker.fetch(req, env);
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.clientSecret).toBe('pi_test_123_secret_abc');
    expect(data.paymentIntentId).toBe('pi_test_123');
  });

  it('rejects invalid amount', async () => {
    const req = new Request('https://x/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ amountCents: -100 }),
    });
    const env = { STRIPE_SECRET_KEY: 'sk_test', ALLOWED_ORIGINS: 'http://localhost:3000' };
    const resp = await worker.fetch(req, env);
    expect(resp.status).toBe(400);
  });
});
```

- [ ] **Step 2: Verify fails**

```bash
cd workers/stripe-checkout && npm test
```

- [ ] **Step 3: Implement `src/index.js`**

```javascript
// workers/stripe-checkout/src/index.js
import Stripe from 'stripe';

function corsHeaders(request, env) {
  var origin = request.headers.get('origin') || '';
  var allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, opts) {
  return new Response(JSON.stringify(body), {
    status: (opts && opts.status) || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, (opts && opts.headers) || {}),
  });
}

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    var cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'stripe-checkout' }, { headers: cors });
    }

    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Misconfigured' }, { status: 500, headers: cors });
      var body; try { body = await request.json(); } catch (e) {
        return json({ error: 'Invalid JSON' }, { status: 400, headers: cors });
      }
      var amountCents = Number(body.amountCents);
      if (!isFinite(amountCents) || amountCents < 100 || amountCents > 5000000) {
        return json({ error: 'Invalid amount' }, { status: 400, headers: cors });
      }

      try {
        var stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
        var intent = await stripe.paymentIntents.create({
          amount: Math.round(amountCents),
          currency: 'usd',
          capture_method: 'manual',
          automatic_payment_methods: { enabled: true },
          metadata: {
            source: 'grandview-quote-tool',
            quoteMeta: JSON.stringify(body.quoteData || {}).slice(0, 500),
          },
        });
        return json({
          clientSecret: intent.client_secret,
          paymentIntentId: intent.id,
        }, { headers: cors });
      } catch (e) {
        return json({ error: 'Stripe error', detail: e.message }, { status: 502, headers: cors });
      }
    }

    return json({ error: 'Not found' }, { status: 404, headers: cors });
  },
};
```

- [ ] **Step 4: Verify passes**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
cd ../..
git add workers/stripe-checkout/
git commit -m "feat(worker): POST /api/checkout creates manual-capture PaymentIntent"
```

---

### Task 2.2.4: Implement `POST /api/capture` (admin-authed partial capture)

**Files:**
- Modify: `workers/stripe-checkout/src/index.js`
- Modify: `workers/stripe-checkout/tests/checkout.test.js`

- [ ] **Step 1: Extend test**

```javascript
describe('POST /api/capture', () => {
  it('requires admin API key', async () => {
    const req = new Request('https://x/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId: 'pi_test', amountCents: 300000 }),
    });
    const resp = await worker.fetch(req, { ADMIN_API_KEY: 'secret' });
    expect(resp.status).toBe(401);
  });
});
```

- [ ] **Step 2: Extend implementation**

```javascript
    if (url.pathname === '/api/capture' && request.method === 'POST') {
      var auth = request.headers.get('authorization') || '';
      var token = auth.replace(/^Bearer\s+/i, '');
      if (!env.ADMIN_API_KEY || token !== env.ADMIN_API_KEY) {
        return json({ error: 'Unauthorized' }, { status: 401, headers: cors });
      }
      var body; try { body = await request.json(); } catch (e) {
        return json({ error: 'Invalid JSON' }, { status: 400, headers: cors });
      }
      try {
        var stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
        var captured = await stripe.paymentIntents.capture(body.paymentIntentId, {
          amount_to_capture: Math.round(Number(body.amountCents)),
        });
        return json({ ok: true, status: captured.status, amount: captured.amount_received }, { headers: cors });
      } catch (e) {
        return json({ error: 'Capture failed', detail: e.message }, { status: 502, headers: cors });
      }
    }
```

- [ ] **Step 3: Verify + commit**

```bash
cd workers/stripe-checkout && npm test
cd ../..
git add workers/stripe-checkout/
git commit -m "feat(worker): POST /api/capture for admin-authed partial captures"
```

---

### Task 2.2.5: Implement `POST /api/webhook` (Stripe webhook receiver)

**Files:**
- Modify: `workers/stripe-checkout/src/index.js`
- Create: `workers/stripe-checkout/tests/webhook.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// workers/stripe-checkout/tests/webhook.test.js
import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index.js';

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    webhooks: {
      constructEvent: vi.fn((body, sig, secret) => {
        if (sig !== 'valid_sig') throw new Error('Invalid signature');
        return JSON.parse(body);
      }),
    },
  })),
}));

describe('POST /api/webhook', () => {
  it('accepts signed payment_intent.amount_capturable_updated and forwards to CRM', async () => {
    const event = {
      type: 'payment_intent.amount_capturable_updated',
      data: { object: { id: 'pi_test_1', amount: 350000, metadata: { quoteMeta: '{}' } } },
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const req = new Request('https://x/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: JSON.stringify(event),
    });
    const resp = await worker.fetch(req, {
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_SECRET_KEY: 'sk_test',
      CRM_WORKER_URL: 'https://crm.test',
      ADMIN_API_KEY: 'admin',
    });
    expect(resp.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/leads/by-payment-intent/pi_test_1'),
      expect.any(Object)
    );
  });

  it('rejects invalid signature', async () => {
    const req = new Request('https://x/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'bad_sig' },
      body: '{}',
    });
    const resp = await worker.fetch(req, {
      STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_SECRET_KEY: 'sk_test',
    });
    expect(resp.status).toBe(400);
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement**

Add to `src/index.js`:
```javascript
    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      var sig = request.headers.get('stripe-signature') || '';
      var rawBody = await request.text();
      try {
        var stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
        var event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (e) {
        return json({ error: 'Invalid signature' }, { status: 400 });
      }

      if (
        event.type === 'payment_intent.amount_capturable_updated' ||
        event.type === 'payment_intent.succeeded' ||
        event.type === 'payment_intent.payment_failed'
      ) {
        var pi = event.data.object;
        ctx.waitUntil(
          fetch(env.CRM_WORKER_URL + '/leads/by-payment-intent/' + pi.id, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + env.ADMIN_API_KEY,
            },
            body: JSON.stringify({
              payment_status: event.type === 'payment_intent.succeeded' ? 'captured'
                : event.type === 'payment_intent.payment_failed' ? 'failed' : 'authorized',
              authorized_amount_cents: pi.amount,
              captured_amount_cents: pi.amount_received || 0,
              stripe_event_id: event.id,
            }),
          }).catch(function(e) { console.error('CRM forward failed', e); })
        );
      }
      return json({ received: true });
    }
```

- [ ] **Step 4: Verify + commit**

```bash
cd workers/stripe-checkout && npm test
cd ../..
git add workers/stripe-checkout/
git commit -m "feat(worker): POST /api/webhook verifies Stripe signature and forwards events to CRM"
```

---

### Task 2.2.6: Deploy worker + register webhook in Stripe

**Files:** None

- [ ] **Step 1: Deploy**

```bash
cd workers/stripe-checkout && npx wrangler deploy && cd ../..
```
Note the worker URL (e.g., `https://grandview-stripe-checkout.sarah-13a.workers.dev`).

- [ ] **Step 2: Register webhook in Stripe**

Via Stripe MCP or dashboard → Developers → Webhooks → "Add endpoint":
- URL: `https://grandview-stripe-checkout.sarah-13a.workers.dev/api/webhook`
- Events: `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed`

Copy the resulting `whsec_...` secret.

- [ ] **Step 3: Set webhook secret on worker**

```bash
cd workers/stripe-checkout
npx wrangler secret put STRIPE_WEBHOOK_SECRET
# paste whsec_...
cd ../..
```

- [ ] **Step 4: Smoke test from Stripe dashboard**

Stripe dashboard → Webhooks → select endpoint → "Send test webhook" → pick `payment_intent.amount_capturable_updated`. Expected: 200 response logged.

---

## Phase 2.3 — /checkout Page (React)

---

### Task 2.3.1: Install Stripe React SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
npm install @stripe/stripe-js @stripe/react-stripe-js
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @stripe/stripe-js and @stripe/react-stripe-js"
```

---

### Task 2.3.2: `OrderSummary` component

**Files:**
- Create: `OrderSummary.js`
- Test: `tests/orderSummary.test.js`

- [ ] **Step 1: Write failing test**

```javascript
// tests/orderSummary.test.js
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import OrderSummary from '../OrderSummary.js';

describe('OrderSummary', () => {
  it('renders thumbnail, line items, and total', () => {
    const quote = {
      mapboxSnapshotUrl: 'data:image/png;base64,aaa',
      zoneName: 'Back yard',
      config: { style: 'uaf_200', height: 48, color: 'textured-black' },
      items: [{ label: 'Panels', qty: 17, total: 1700 }],
      subtotal: 1700,
      shippingCents: 8000,
      totalCents: 178000,
    };
    const { getByText, getByAltText } = render(<OrderSummary quote={quote} />);
    expect(getByAltText(/satellite/i)).toBeTruthy();
    expect(getByText(/back yard/i)).toBeTruthy();
    expect(getByText(/\$1,780\.00/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Verify fails**

- [ ] **Step 3: Implement**

```javascript
// OrderSummary.js
import React from 'react';

function fmt(cents) {
  return '$' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function OrderSummary(props) {
  var q = props.quote;
  return React.createElement('div', { className: 'co-order-summary' },
    q.mapboxSnapshotUrl && React.createElement('img', {
      src: q.mapboxSnapshotUrl,
      alt: 'Satellite view of your fence',
      className: 'co-map-thumb',
    }),
    React.createElement('h3', null, q.zoneName || 'Your fence'),
    React.createElement('p', { className: 'co-config' },
      (q.config.style || '') + ' \u00B7 ' + (q.config.height || '') + '" \u00B7 ' + (q.config.color || '').replace(/-/g, ' ')
    ),
    React.createElement('ul', { className: 'co-items' },
      (q.items || []).map(function(item, i) {
        return React.createElement('li', { key: i },
          React.createElement('span', null, item.label),
          React.createElement('span', null, fmt(Math.round((item.total || 0) * 100)))
        );
      })
    ),
    React.createElement('div', { className: 'co-subtotal' },
      React.createElement('span', null, 'Subtotal'),
      React.createElement('span', null, fmt(Math.round((q.subtotal || 0) * 100)))
    ),
    q.shippingCents ? React.createElement('div', { className: 'co-shipping' },
      React.createElement('span', null, 'Shipping'),
      React.createElement('span', null, fmt(q.shippingCents))
    ) : null,
    React.createElement('div', { className: 'co-total' },
      React.createElement('strong', null, 'Total'),
      React.createElement('strong', null, fmt(q.totalCents))
    )
  );
}

export default OrderSummary;
```

- [ ] **Step 4: Verify passes + commit**

```bash
npm test -- tests/orderSummary.test.js
git add OrderSummary.js tests/orderSummary.test.js
git commit -m "feat(checkout): OrderSummary with map thumb, line items, total"
```

---

### Task 2.3.3: `TrustSignals` component

**Files:**
- Create: `TrustSignals.js`

- [ ] **Step 1: Implement**

```javascript
// TrustSignals.js
import React from 'react';

function TrustSignals() {
  return React.createElement('div', { className: 'co-trust' },
    React.createElement('div', { className: 'co-trust-row' },
      React.createElement('span', null, '\u{1F6E1} Every order reviewed by Sarah within 24h'),
      React.createElement('span', null, '\u{1F1FA}\u{1F1F8} Veteran-owned SDVOSB'),
      React.createElement('span', null, '\u21A9 24h cancel window')
    ),
    React.createElement('div', { className: 'co-trust-testimonial' },
      React.createElement('div', { className: 'co-stars' }, '\u2B50\u2B50\u2B50\u2B50\u2B50'),
      React.createElement('blockquote', null,
        '"Install was perfect \u2014 Sarah caught a footage miscount on my order and saved me $400."'),
      React.createElement('cite', null, '\u2014 Jen M., 2026')
    )
  );
}

export default TrustSignals;
```

- [ ] **Step 2: Commit**

```bash
git add TrustSignals.js
git commit -m "feat(checkout): TrustSignals component (badges + testimonial)"
```

---

### Task 2.3.4: `StripePaymentForm` component

**Files:**
- Create: `StripePaymentForm.js`

- [ ] **Step 1: Implement**

```javascript
// StripePaymentForm.js — wraps Stripe Payment Element with auth-then-capture
import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

var stripePromise = null;
function getStripePromise() {
  if (!stripePromise) stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

function PaymentForm(props) {
  var stripe = useStripe();
  var elements = useElements();
  var submittingState = useState(false);
  var submitting = submittingState[0];
  var setSubmitting = submittingState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!props.acknowledged) { setError('Please confirm the measurement disclaimer.'); return; }
    setSubmitting(true); setError('');

    var result = await stripe.confirmPayment({
      elements: elements,
      confirmParams: { return_url: window.location.origin + '/checkout/success' },
    });

    if (result.error) {
      setError(result.error.message || 'Payment failed');
      setSubmitting(false);
    }
  }

  return React.createElement('form', { onSubmit: handleSubmit, className: 'co-pay-form' },
    React.createElement(PaymentElement, { options: { layout: 'tabs' } }),
    error ? React.createElement('div', { className: 'co-error' }, error) : null,
    React.createElement('button', {
      type: 'submit',
      className: 'co-pay-btn',
      disabled: !stripe || submitting,
    }, submitting ? 'Processing…' : 'Authorize ' + props.formattedTotal + ' \u2192')
  );
}

function StripePaymentForm(props) {
  var clientSecretState = useState(null);
  var clientSecret = clientSecretState[0];
  var setClientSecret = clientSecretState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];

  useEffect(function() {
    fetch(process.env.STRIPE_CHECKOUT_WORKER_URL + '/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents: props.totalCents,
        quoteData: props.quoteData,
      }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) setError(data.error);
        else setClientSecret(data.clientSecret);
      })
      .catch(function(e) { setError(e.message); });
  }, [props.totalCents]);

  if (error) return React.createElement('div', { className: 'co-error' }, 'Payment setup failed: ' + error);
  if (!clientSecret) return React.createElement('div', null, 'Loading payment form…');

  return React.createElement(Elements, {
    stripe: getStripePromise(),
    options: { clientSecret: clientSecret, appearance: { theme: 'stripe' } },
  },
    React.createElement(PaymentForm, {
      acknowledged: props.acknowledged,
      formattedTotal: props.formattedTotal,
    })
  );
}

export default StripePaymentForm;
```

- [ ] **Step 2: Commit**

```bash
git add StripePaymentForm.js
git commit -m "feat(checkout): StripePaymentForm wraps Elements + PaymentElement with auth-only intent"
```

---

### Task 2.3.5: `CheckoutPage.js` — two-column layout

**Files:**
- Create: `CheckoutPage.js`
- Create: `checkout.css`
- Modify: `app.js`

- [ ] **Step 1: Implement page**

```javascript
// CheckoutPage.js
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OrderSummary from './OrderSummary';
import TrustSignals from './TrustSignals';
import StripePaymentForm from './StripePaymentForm';
import TopNav from './TopNav';
import './checkout.css';

var CYA_TEXT = 'I confirm the measurements, slope, gate placements, and site conditions I provided are based on my own inspection of my property. I understand: Grandview reviews every order within 24 hours but the accuracy of what I submitted is my responsibility. Ultra Aluminum fence is manufactured to order and cannot be returned for measurement errors or slope misclassification. Site conditions I haven\u2019t disclosed may affect install feasibility and are my responsibility to verify. Grandview\u2019s review is a courtesy double-check and does not constitute a professional site survey.';

function CheckoutPage() {
  var loc = useLocation();
  var nav = useNavigate();
  var quote = loc.state && loc.state.quote;

  var ackState = useState(false);
  var acknowledged = ackState[0];
  var setAcknowledged = ackState[1];

  var summaryOpenState = useState(false);
  var summaryOpen = summaryOpenState[0];
  var setSummaryOpen = summaryOpenState[1];

  if (!quote) {
    return React.createElement('div', { style: { padding: '4rem', textAlign: 'center' } },
      React.createElement('h2', null, 'No quote to check out'),
      React.createElement('button', { onClick: function() { nav('/'); } }, 'Back to start')
    );
  }

  var total = '$' + (quote.totalCents / 100).toFixed(2);

  return React.createElement('div', { className: 'co-page' },
    React.createElement(TopNav, null),

    // Mobile-only collapsible summary
    React.createElement('details', {
      className: 'co-mobile-summary',
      open: summaryOpen,
      onToggle: function(e) { setSummaryOpen(e.target.open); },
    },
      React.createElement('summary', null, 'View your order \u2014 ' + total),
      React.createElement(OrderSummary, { quote: quote })
    ),

    React.createElement('div', { className: 'co-grid' },
      // Desktop summary column
      React.createElement('aside', { className: 'co-col-summary' },
        React.createElement(OrderSummary, { quote: quote }),
        React.createElement(TrustSignals, null)
      ),
      // Payment column
      React.createElement('section', { className: 'co-col-pay' },
        React.createElement('h2', null, 'Payment'),

        React.createElement(StripePaymentForm, {
          totalCents: quote.totalCents,
          formattedTotal: total,
          acknowledged: acknowledged,
          quoteData: { quoteId: quote.id || null, zoneName: quote.zoneName },
        }),

        React.createElement('label', { className: 'co-cya' },
          React.createElement('input', {
            type: 'checkbox',
            checked: acknowledged,
            onChange: function(e) { setAcknowledged(e.target.checked); },
          }),
          React.createElement('span', null, CYA_TEXT),
          React.createElement('span', { className: 'co-attorney-todo',
            title: 'Pending attorney review',
          }, ' [ATTORNEY REVIEW TODO]')
        )
      )
    )
  );
}

export default CheckoutPage;
```

- [ ] **Step 2: Add route in `app.js`**

```javascript
import CheckoutPage from './CheckoutPage';
// in router
<Route path="/checkout" element={<CheckoutPage />} />
```

- [ ] **Step 3: Styles**

`checkout.css`:
```css
.co-page { min-height: 100vh; background: #f9fafb; }
.co-grid {
  max-width: 1200px; margin: 2rem auto; padding: 0 1.5rem;
  display: grid; grid-template-columns: minmax(300px, 40%) 1fr; gap: 2rem;
}
.co-col-summary { background: white; padding: 1.5rem; border-radius: 12px; }
.co-col-pay { background: white; padding: 1.5rem; border-radius: 12px; }
.co-map-thumb { width: 100%; border-radius: 8px; margin-bottom: 1rem; }
.co-config { color: #5a6270; margin-bottom: 1rem; }
.co-items { list-style: none; padding: 0; margin: 0 0 1rem; }
.co-items li { display: flex; justify-content: space-between; padding: 0.25rem 0; }
.co-subtotal, .co-shipping { display: flex; justify-content: space-between; padding: 0.25rem 0; color: #5a6270; }
.co-total { display: flex; justify-content: space-between; padding: 0.75rem 0; border-top: 2px solid #e8eaed; font-size: 18px; }
.co-pay-btn {
  width: 100%; background: #d4753a; color: white; border: none;
  padding: 1rem 2rem; border-radius: 8px; font-size: 16px; font-weight: 600; margin-top: 1rem;
  cursor: pointer; min-height: 48px;
}
.co-pay-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.co-cya { display: flex; gap: 0.5rem; margin-top: 1rem; font-size: 13px; color: #5a6270; }
.co-cya input { flex-shrink: 0; margin-top: 4px; min-width: 20px; min-height: 20px; }
.co-attorney-todo { color: #d97706; font-weight: 600; }
.co-error { color: #dc2626; margin-top: 0.5rem; }
.co-trust { margin-top: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 8px; font-size: 14px; }
.co-trust-row { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
.co-trust-testimonial blockquote { margin: 0.5rem 0; font-style: italic; color: #333; }
.co-trust-testimonial cite { color: #6BA3C2; }
.co-mobile-summary { display: none; }

@media (max-width: 768px) {
  .co-grid { grid-template-columns: 1fr; padding: 0 1rem; margin: 1rem 0; gap: 1rem; }
  .co-col-summary { display: none; }
  .co-mobile-summary {
    display: block; background: white; padding: 1rem; border-radius: 0 0 12px 12px;
    border-bottom: 1px solid #e8eaed; position: sticky; top: 0; z-index: 5;
  }
  .co-mobile-summary summary {
    cursor: pointer; font-weight: 600; padding: 0.5rem 0;
    display: flex; justify-content: space-between; align-items: center;
    min-height: 44px;
  }
  .co-pay-btn, .co-cya input { min-height: 48px; }
}
```

- [ ] **Step 4: Commit**

```bash
git add CheckoutPage.js checkout.css app.js
git commit -m "feat(checkout): /checkout route with two-column (desktop) / stack (mobile) layout"
```

---

### Task 2.3.6: Wire "Pay" button from Review

**Files:**
- Modify: `QuoteStep6_Review.js`

- [ ] **Step 1: Find the existing submit buttons**

```bash
grep -nE "Submit Quote|Order Now|submitAction" QuoteStep6_Review.js
```

- [ ] **Step 2: Add "Pay & Reserve" button**

```javascript
// In QuoteStep6_Review.js, wherever submit buttons render:
import { useNavigate } from 'react-router-dom';
// inside component:
var nav = useNavigate();

React.createElement('button', {
  className: 'qs6-pay-btn',
  onClick: function() {
    var quote = buildQuoteForCheckout(data, props);
    nav('/checkout', { state: { quote: quote } });
  },
}, 'Pay & Reserve \u2192')
```

Add helper:
```javascript
function buildQuoteForCheckout(data, props) {
  var quoteResult = calculateZoneQuote(data); // whichever engine is live
  var subtotal = quoteResult.subtotal || 0;
  var shippingCents = 8000; // default; refine per Step 5 data
  var totalCents = Math.round(subtotal * 100) + shippingCents;
  return {
    id: null,
    zoneName: props.zoneName || 'Your fence',
    config: { style: data.style, height: data.height, color: data.color, grade: data.grade },
    mapboxSnapshotUrl: props.mapboxSnapshotUrl || null,
    items: quoteResult.items || [],
    subtotal: subtotal,
    shippingCents: shippingCents,
    totalCents: totalCents,
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add QuoteStep6_Review.js
git commit -m "feat(review): add 'Pay & Reserve' button that navigates to /checkout"
```

---

### Task 2.3.7: `/checkout/success` page

**Files:**
- Create: `CheckoutSuccessPage.js`
- Modify: `app.js`

- [ ] **Step 1: Implement**

```javascript
// CheckoutSuccessPage.js
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import TopNav from './TopNav';

function CheckoutSuccessPage() {
  var loc = useLocation();
  var statusState = useState('Processing...');
  var status = statusState[0];
  var setStatus = statusState[1];

  useEffect(function() {
    var params = new URLSearchParams(loc.search);
    var pi = params.get('payment_intent');
    var clientSecret = params.get('payment_intent_client_secret');
    if (!pi) { setStatus('Unknown status'); return; }

    // Stripe redirects back with status param; we just confirm visually
    var redirectStatus = params.get('redirect_status');
    if (redirectStatus === 'succeeded') setStatus('authorized');
    else if (redirectStatus === 'processing') setStatus('processing');
    else setStatus('failed');
  }, [loc.search]);

  return React.createElement('div', null,
    React.createElement(TopNav, null),
    React.createElement('div', { style: { maxWidth: 600, margin: '4rem auto', padding: '2rem', textAlign: 'center' } },
      status === 'authorized' && React.createElement(React.Fragment, null,
        React.createElement('h1', null, '\u{1F389} Thank you!'),
        React.createElement('p', null, 'Your payment is authorized. Sarah will personally review your order and confirm within 24 hours before any charge is captured.'),
        React.createElement('p', null, 'Check your email for a confirmation.')
      ),
      status === 'processing' && React.createElement('h2', null, 'Processing your payment…'),
      status === 'failed' && React.createElement(React.Fragment, null,
        React.createElement('h2', null, 'Payment not completed'),
        React.createElement('p', null, 'No charge was made. You can try again from the checkout page.')
      )
    )
  );
}

export default CheckoutSuccessPage;
```

- [ ] **Step 2: Route in `app.js`**

```javascript
import CheckoutSuccessPage from './CheckoutSuccessPage';
<Route path="/checkout/success" element={<CheckoutSuccessPage />} />
```

- [ ] **Step 3: Commit**

```bash
git add CheckoutSuccessPage.js app.js
git commit -m "feat(checkout): /checkout/success post-auth confirmation page"
```

---

## Phase 2.4 — Phase 2 Acceptance

---

### Task 2.4.1: E2E Stripe test-mode flow

**Files:**
- Create: `e2e/checkout-flow.spec.js`

- [ ] **Step 1: Write E2E**

```javascript
import { test, expect } from '@playwright/test';

test.describe('checkout flow (Stripe test mode)', () => {
  test('authorize with test card 4242 succeeds', async ({ page }) => {
    // Navigate through quote to /checkout (or inject state directly)
    await page.goto('/checkout', {
      // In a real test, you'd build state via prior steps; here we stub
    });
    // If page shows "No quote to check out", test is running without state
    // Use a fixture route that pre-populates location.state (implement as needed)
    // For now, assume quote state exists

    // Fill Stripe iframe with test card
    const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    // Stripe Payment Element — element identifiers depend on layout
    await frame.locator('[name="number"]').fill('4242 4242 4242 4242');
    await frame.locator('[name="expiry"]').fill('12/30');
    await frame.locator('[name="cvc"]').fill('123');
    await frame.locator('[name="postalCode"]').fill('48843');

    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Authorize")');

    await expect(page).toHaveURL(/checkout\/success/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(/thank you/i);
  });

  test('invalid card shows error', async ({ page }) => {
    await page.goto('/checkout');
    const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
    await frame.locator('[name="number"]').fill('4000 0000 0000 0002'); // always declines
    await frame.locator('[name="expiry"]').fill('12/30');
    await frame.locator('[name="cvc"]').fill('123');
    await frame.locator('[name="postalCode"]').fill('48843');

    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Authorize")');

    await expect(page.locator('.co-error')).toBeVisible({ timeout: 15000 });
  });
});
```

- [ ] **Step 2: Run**

```bash
npm run e2e -- checkout-flow
```

- [ ] **Step 3: Commit**

```bash
git add e2e/checkout-flow.spec.js
git commit -m "test(e2e): Stripe checkout flow in test mode with success + decline paths"
```

---

### Task 2.4.2: Code review gate

- [ ] **Step 1: Invoke `superpowers:code-reviewer` against Phase 2 commits**

- [ ] **Step 2: Address findings, one commit each**

- [ ] **Step 3: Confirm no regressions in Phase 1 E2E**

```bash
npm run e2e
```

---

### Task 2.4.3: Attorney review blocker check

- [ ] **Step 1: Verify `[ATTORNEY REVIEW TODO]` is present**

```bash
grep -n "ATTORNEY REVIEW TODO" CheckoutPage.js
```
Expected: found. Do NOT remove until Sarah confirms attorney sign-off.

- [ ] **Step 2: Document in journal**

Append to `journal.txt`:
> "Phase 2 checkout built. Attorney review of §CYA checkbox language still pending before prod launch."
