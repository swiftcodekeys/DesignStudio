import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

var stripePromise = null;
function getStripePromise() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY || '');
  }
  return stripePromise;
}

function PaymentForm(props) {
  var stripe = useStripe();
  var elements = useElements();
  var [submitting, setSubmitting] = React.useState(false);
  var [error, setError] = React.useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!props.acknowledged) {
      setError('Please check the measurement disclaimer below before paying.');
      return;
    }
    setSubmitting(true);
    setError('');
    stripe.confirmPayment({
      elements: elements,
      confirmParams: {
        return_url: window.location.origin + '/checkout/success',
      },
    }).then(function(result) {
      if (result.error) {
        setError(result.error.message || 'Payment failed. Please try again.');
        setSubmitting(false);
      }
      // On success, Stripe redirects to return_url — no further action needed here
    }).catch(function(e) {
      console.error('confirmPayment error:', e);
      setError('An unexpected error occurred.');
      setSubmitting(false);
    });
  }

  return React.createElement('form', { onSubmit: handleSubmit, className: 'co-pay-form' },
    React.createElement(PaymentElement, { options: { layout: 'tabs' } }),
    error ? React.createElement('div', { className: 'co-error', role: 'alert' }, error) : null,
    React.createElement('button', {
      type: 'submit',
      className: 'co-pay-btn',
      disabled: !stripe || submitting,
    }, submitting ? 'Processing…' : 'Authorize ' + props.formattedTotal + ' →')
  );
}

function StripePaymentForm(props) {
  var [clientSecret, setClientSecret] = React.useState(null);
  var [error, setError] = React.useState('');

  React.useEffect(function() {
    var workerUrl = process.env.STRIPE_CHECKOUT_WORKER_URL || '';
    if (!workerUrl) {
      setError('Payment system not configured.');
      return;
    }
    fetch(workerUrl + '/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountCents: props.totalCents,
        quoteData: props.quoteData || {},
      }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) {
          console.error('PaymentIntent creation failed:', data.error);
          setError('Payment setup failed: ' + data.error);
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch(function(e) {
        console.error('PaymentIntent fetch error:', e);
        setError('Could not connect to payment service. Please try again.');
      });
  }, [props.totalCents]);

  if (error) {
    return React.createElement('div', { className: 'co-pay-error' },
      React.createElement('p', null, error),
      React.createElement('p', null, 'If this continues, call us at (517) 999-GV01.')
    );
  }

  if (!clientSecret) {
    return React.createElement('div', { className: 'co-pay-loading' }, 'Loading payment form…');
  }

  return React.createElement(Elements, {
    stripe: getStripePromise(),
    options: {
      clientSecret: clientSecret,
      appearance: { theme: 'stripe' },
    },
  },
    React.createElement(PaymentForm, {
      acknowledged: props.acknowledged,
      formattedTotal: props.formattedTotal || '',
    })
  );
}

export default StripePaymentForm;
