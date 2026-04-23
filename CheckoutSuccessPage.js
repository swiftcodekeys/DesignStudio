// CheckoutSuccessPage.js — /checkout/success route
import React from 'react';
import { useLocation } from 'react-router-dom';
import TopNav from './TopNav';

var el = React.createElement;

function CheckoutSuccessPage() {
  var loc = useLocation();
  var [status, setStatus] = React.useState('loading');

  React.useEffect(function() {
    var params = new URLSearchParams(loc.search);
    var redirectStatus = params.get('redirect_status');
    var pi = params.get('payment_intent');
    if (!pi) {
      setStatus('unknown');
      return;
    }
    if (redirectStatus === 'succeeded') setStatus('authorized');
    else if (redirectStatus === 'processing') setStatus('processing');
    else setStatus('failed');
  }, [loc.search]);

  var content;
  if (status === 'authorized') {
    content = el(React.Fragment, null,
      el('div', { className: 'co-success-icon' }, '🎉'),
      el('h1', { className: 'co-success-heading' }, 'Thank you!'),
      el('p', null, 'Your payment is authorized. Grandview will personally review your order and confirm within 24 hours before any charge is captured.'),
      el('p', null, 'Check your email for a confirmation.')
    );
  } else if (status === 'processing') {
    content = el(React.Fragment, null,
      el('h2', null, 'Processing your payment…'),
      el('p', null, "Your payment is being processed. We'll send a confirmation email shortly.")
    );
  } else if (status === 'failed') {
    content = el(React.Fragment, null,
      el('h2', null, 'Payment not completed'),
      el('p', null, 'No charge was made. You can try again from the checkout page.'),
      el('p', null, 'Need help? Call us at (517) 999-GV01.')
    );
  } else {
    content = el('p', null, 'Loading…');
  }

  return el('div', { className: 'co-page' },
    el(TopNav, null),
    el('div', { className: 'co-success-container' }, content)
  );
}

export default CheckoutSuccessPage;
