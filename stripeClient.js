// stripeClient.js — Stripe.js initialization wrapper.
//
// The publishable key is safe to expose on the client, but we still load it
// from an environment-driven constant so tests/preview/prod can swap keys
// without a code change. When the key is absent (common in tests and in
// non-prod preview builds), getStripe() returns null so call sites know to
// skip real Stripe initialization.
//
// See workers/stripe/README.md for the server-side secrets (STRIPE_SECRET_KEY
// and STRIPE_WEBHOOK_SECRET) which MUST NOT be embedded in client code.

import { loadStripe } from '@stripe/stripe-js';

// Webpack replaces process.env.* via DefinePlugin in prod builds; in the jsdom
// test environment `process` exists but `process.env.STRIPE_PUBLISHABLE_KEY`
// is undefined — that's fine, we resolve to '' and getStripe returns null.
var PUBLISHABLE_KEY = (typeof process !== 'undefined' && process.env
  ? process.env.STRIPE_PUBLISHABLE_KEY || ''
  : '');

var stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

export function getStripe() {
  return stripePromise;
}

export function hasStripeKey() {
  return Boolean(PUBLISHABLE_KEY);
}
