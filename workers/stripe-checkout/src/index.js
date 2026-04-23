import Stripe from 'stripe';

function corsHeaders(request, env) {
  var origin = request.headers.get('origin') || '';
  var allowed = (env.ALLOWED_ORIGINS || '').split(',').map(function(s) { return s.trim(); });
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || '*'),
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(body, opts) {
  var status = (opts && opts.status) || 200;
  var extraHeaders = (opts && opts.headers) || {};
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json' }, extraHeaders),
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
      if (!env.STRIPE_SECRET_KEY) {
        return json({ error: 'Misconfigured' }, { status: 500, headers: cors });
      }
      var body;
      try {
        body = await request.json();
      } catch (e) {
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
        console.error('Stripe PaymentIntent create failed:', e);
        return json({ error: 'Stripe error', detail: e.message }, { status: 502, headers: cors });
      }
    }

    if (url.pathname === '/api/capture' && request.method === 'POST') {
      var auth = request.headers.get('authorization') || '';
      var token = auth.replace(/^Bearer\s+/i, '');
      if (!env.ADMIN_API_KEY || token !== env.ADMIN_API_KEY) {
        return json({ error: 'Unauthorized' }, { status: 401, headers: cors });
      }
      var captureBody;
      try {
        captureBody = await request.json();
      } catch (e) {
        return json({ error: 'Invalid JSON' }, { status: 400, headers: cors });
      }
      try {
        var stripeCapture = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
        var captured = await stripeCapture.paymentIntents.capture(captureBody.paymentIntentId, {
          amount_to_capture: Math.round(Number(captureBody.amountCents)),
        });
        return json({ ok: true, status: captured.status, amount: captured.amount_received }, { headers: cors });
      } catch (e) {
        console.error('Stripe capture failed:', e);
        return json({ error: 'Capture failed', detail: e.message }, { status: 502, headers: cors });
      }
    }

    return json({ error: 'Not found' }, { status: 404, headers: cors });
  },
};
