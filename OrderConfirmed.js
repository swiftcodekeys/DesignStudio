// ============================================================================
// OrderConfirmed.js — Post-checkout confirmation page
//
// Displayed after successful Stripe Checkout.
// Reads session reference from URL: ?ref={CHECKOUT_SESSION_ID}
//
// Stripe webhook setup (for Sarah to configure in Stripe Dashboard):
//   Event: checkout.session.completed
//   Webhook URL: POST to GAS_ENDPOINT with source: 'stripe-webhook'
//   Include quoteRef in metadata so it appears in the Deposits sheet.
//   Sarah sets this up in Stripe Dashboard → Developers → Webhooks.
// ============================================================================

import React from 'react';

var TRUST_BADGES = [
  'Service-Disabled Veteran-Owned',
  'Made in the USA',
  'AAMA 2604 Certified',
  'Lifetime Structural Warranty',
];

var OrderConfirmed = function() {
  // Extract session ID from URL
  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('ref') || '';
  var displayRef = 'GV-' + (sessionId ? sessionId.slice(-8).toUpperCase() : 'XXXXXX');

  return (
    <div className="order-confirmed">
      <div className="order-confirmed-card">
        <div className="order-confirmed-check">{'\u2713'}</div>
        <h1 className="order-confirmed-title">Your Order is Confirmed</h1>
        <p className="order-confirmed-ref">Reference: <strong>{displayRef}</strong></p>

        <div className="order-confirmed-body">
          <p>
            We&rsquo;ll review your order and contact you within <strong>1 business day</strong> before
            submitting to production.
          </p>
          <p>
            All materials are custom-fabricated to your order specifications. If we spot any
            discrepancies in quantities or configuration, we&rsquo;ll reach out before fabrication
            begins.
          </p>
        </div>

        <div className="order-confirmed-contact">
          <p>Questions about your order?</p>
          <p>
            <strong><a href="tel:+18553362330">(855) FENCE-30</a></strong>
            {' | '}
            <a href="tel:+18553362330">(855) 336-2330</a>
          </p>
          <p>
            <a href="mailto:sales@grandviewfence.com">sales@grandviewfence.com</a>
          </p>
        </div>

        <div className="order-confirmed-badges">
          {TRUST_BADGES.map(function(badge, i) {
            return <span key={i} className="order-confirmed-badge">{badge}</span>;
          })}
        </div>

        <a href="/" className="order-confirmed-back">
          Browse More Fence Styles
        </a>
      </div>
    </div>
  );
};

export default OrderConfirmed;
