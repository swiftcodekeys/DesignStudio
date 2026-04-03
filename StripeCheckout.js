// ============================================================================
// StripeCheckout.js — Client-side Stripe checkout via GAS backend
//
// Flow:
// 1. Client POSTs quote items to GAS_ENDPOINT with source: 'stripe-session'
// 2. GAS calls Stripe API to create a Checkout Session (uses STRIPE_SECRET_KEY)
// 3. GAS returns { sessionUrl: 'https://checkout.stripe.com/...' }
// 4. Client redirects: window.location.href = sessionUrl
//
// Stripe secret key lives in GAS Script Properties — never in client code.
// ============================================================================

var GAS_ENDPOINT = (typeof process !== 'undefined' && process.env && process.env.GAS_ENDPOINT) || '';

/**
 * Redirect the user to Stripe Checkout for full payment.
 *
 * @param {Object} quoteResult — output from calculateQuote()
 * @param {string} style — Grandview style key (e.g. 'horizon')
 * @param {string} grade — 'residential' | 'commercial' | 'industrial'
 * @param {number} height — fence height in inches
 * @param {number} linearFeet — total linear footage
 * @param {string} [customerEmail] — pre-fill Stripe email field
 * @returns {Promise<{error: string}|void>} — returns error object if failed, otherwise redirects
 */
export function redirectToCheckout(quoteResult, style, grade, height, linearFeet, customerEmail) {
  if (!GAS_ENDPOINT) {
    return Promise.resolve({
      error: 'Checkout is not configured. Please call (855) FENCE-30 | (855) 336-2330 to place your order.'
    });
  }

  if (!quoteResult || !quoteResult.items || quoteResult.items.length === 0) {
    return Promise.resolve({ error: 'No items to checkout.' });
  }

  var payload = {
    source: 'stripe-session',
    items: quoteResult.items.map(function(item) {
      return {
        label: item.label,
        unitPrice: item.unitPrice,
        qty: item.qty,
        note: item.note || '',
      };
    }),
    subtotal: quoteResult.subtotal,
    style: style,
    grade: grade,
    height: height,
    linearFeet: linearFeet,
    customerEmail: customerEmail || '',
    cancelUrl: window.location.href,
    timestamp: new Date().toISOString(),
  };

  return fetch(GAS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function(data) {
      if (data.status === 'error') {
        return { error: data.message || 'Could not create checkout session.' };
      }
      if (!data.sessionUrl) {
        return { error: 'No checkout URL returned. Please call (855) FENCE-30.' };
      }
      // Redirect to Stripe Checkout
      window.location.href = data.sessionUrl;
      // No return — page is navigating away
    })
    .catch(function(err) {
      console.error('[StripeCheckout] Error:', err);
      return {
        error: 'Could not connect to checkout. Please try again or call (855) FENCE-30 | (855) 336-2330.'
      };
    });
}
