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

  it('rejects invalid amount (too low)', async () => {
    const req = new Request('https://x/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ amountCents: -100 }),
    });
    const env = { STRIPE_SECRET_KEY: 'sk_test', ALLOWED_ORIGINS: 'http://localhost:3000' };
    const resp = await worker.fetch(req, env);
    expect(resp.status).toBe(400);
  });

  it('responds to OPTIONS preflight with 204', async () => {
    const req = new Request('https://x/api/checkout', {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000' },
    });
    const env = { STRIPE_SECRET_KEY: 'sk_test', ALLOWED_ORIGINS: 'http://localhost:3000' };
    const resp = await worker.fetch(req, env);
    expect(resp.status).toBe(204);
  });
});

describe('POST /api/capture', () => {
  it('requires admin API key in Authorization header', async () => {
    const req = new Request('https://x/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId: 'pi_test', amountCents: 300000 }),
    });
    const resp = await worker.fetch(req, { ADMIN_API_KEY: 'secret', STRIPE_SECRET_KEY: 'sk_test', ALLOWED_ORIGINS: '*' });
    expect(resp.status).toBe(401);
  });

  it('rejects wrong API key', async () => {
    const req = new Request('https://x/api/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer wrong' },
      body: JSON.stringify({ paymentIntentId: 'pi_test', amountCents: 300000 }),
    });
    const resp = await worker.fetch(req, { ADMIN_API_KEY: 'secret', STRIPE_SECRET_KEY: 'sk_test', ALLOWED_ORIGINS: '*' });
    expect(resp.status).toBe(401);
  });
});
