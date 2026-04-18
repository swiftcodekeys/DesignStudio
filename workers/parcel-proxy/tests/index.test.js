import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index.js';

describe('parcel-proxy', () => {
  beforeEach(() => { global.fetch = vi.fn(); });

  it('returns parcel boundary for a valid lat/lng', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parcels: {
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[[-83.9, 42.6], [-83.89, 42.6], [-83.89, 42.61], [-83.9, 42.61], [-83.9, 42.6]]],
            },
            properties: {
              fields: { address: '123 Main St', parcelnumb: '12-34', subdivision: 'Oak Hills' },
              ll_uuid: 'abc-123',
            },
          }],
        },
      }),
    });

    var req = new Request('https://x/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ lat: 42.605, lng: -83.895 }),
    });
    var env = { REGRID_API_KEY: 'test_key', ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    expect(resp.status).toBe(200);
    var data = await resp.json();
    expect(data.ok).toBe(true);
    expect(data.data.boundary.type).toBe('Polygon');
    expect(data.data.address).toBe('123 Main St');
  });

  it('returns fallback:manual when Regrid returns 404 / empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ parcels: { features: [] } }),
    });
    var req = new Request('https://x/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ lat: 0, lng: 0 }),
    });
    var env = { REGRID_API_KEY: 'test_key', ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    var data = await resp.json();
    expect(data.ok).toBe(false);
    expect(data.fallback).toBe('manual');
  });

  it('rejects requests without REGRID_API_KEY', async () => {
    var req = new Request('https://x/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ lat: 42, lng: -83 }),
    });
    var resp = await worker.fetch(req, {});
    expect(resp.status).toBe(500);
  });
});
