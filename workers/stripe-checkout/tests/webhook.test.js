import { describe, it, expect, vi } from 'vitest';
import worker from '../src/index.js';

vi.mock('stripe', () => ({
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
      capture: vi.fn(async () => ({ status: 'succeeded', amount_received: 300000 })),
    },
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
      id: 'evt_test_1',
      type: 'payment_intent.amount_capturable_updated',
      data: { object: { id: 'pi_test_1', amount: 350000, amount_received: 0, metadata: { quoteMeta: '{}' } } },
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
      ALLOWED_ORIGINS: '*',
    });
    expect(resp.status).toBe(200);
    const data = await resp.json();
    expect(data.received).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://crm.test/leads/by-payment-intent/pi_test_1',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('rejects invalid signature with 400', async () => {
    const req = new Request('https://x/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'bad_sig' },
      body: '{}',
    });
    const resp = await worker.fetch(req, {
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_SECRET_KEY: 'sk_test',
      ALLOWED_ORIGINS: '*',
    });
    expect(resp.status).toBe(400);
  });

  it('ignores unknown event types and returns 200', async () => {
    const event = {
      id: 'evt_test_2',
      type: 'customer.created',
      data: { object: {} },
    };
    global.fetch = vi.fn();
    const req = new Request('https://x/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'valid_sig' },
      body: JSON.stringify(event),
    });
    const resp = await worker.fetch(req, {
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      STRIPE_SECRET_KEY: 'sk_test',
      ALLOWED_ORIGINS: '*',
    });
    expect(resp.status).toBe(200);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
