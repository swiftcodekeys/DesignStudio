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

    if (url.pathname === '/api/webhook' && request.method === 'POST') {
      var sig = request.headers.get('stripe-signature') || '';
      var rawBody = await request.text();
      var event;
      try {
        var stripeWebhook = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });
        event = stripeWebhook.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
      } catch (e) {
        console.error('Webhook signature verification failed:', e.message);
        return json({ error: 'Invalid signature' }, { status: 400 });
      }

      var knownEvents = [
        'payment_intent.amount_capturable_updated',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
      ];
      if (knownEvents.indexOf(event.type) !== -1) {
        var pi = event.data.object;
        var paymentStatus = event.type === 'payment_intent.succeeded' ? 'captured'
          : event.type === 'payment_intent.payment_failed' ? 'failed'
          : 'authorized';
        var crmBody = JSON.stringify({
          payment_status: paymentStatus,
          authorized_amount_cents: pi.amount,
          captured_amount_cents: pi.amount_received || 0,
          stripe_event_id: event.id,
        });
        if (ctx && ctx.waitUntil) {
          ctx.waitUntil(
            fetch(env.CRM_WORKER_URL + '/leads/by-payment-intent/' + pi.id, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + env.ADMIN_API_KEY,
              },
              body: crmBody,
            }).catch(function(e) { console.error('CRM webhook forward failed:', e); })
          );
        } else {
          // In test environment ctx may be undefined
          fetch(env.CRM_WORKER_URL + '/leads/by-payment-intent/' + pi.id, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + env.ADMIN_API_KEY,
            },
            body: crmBody,
          }).catch(function(e) { console.error('CRM webhook forward failed:', e); });
        }
      }
      return json({ received: true });
    }

    return json({ error: 'Not found' }, { status: 404, headers: cors });
  },
};
