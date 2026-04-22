import { describe, it, expect, vi } from 'vitest';
import { fetchParcel } from '../parcelClient.js';

global.fetch = vi.fn();

describe('fetchParcel', () => {
  it('returns ok with boundary on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true, data: { boundary: { type: 'Polygon', coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] }, address: '123' },
      }),
    });
    const r = await fetchParcel(42.6, -83.9, 'https://parcel.test');
    expect(r.ok).toBe(true);
    expect(r.data.boundary.type).toBe('Polygon');
  });

  it('returns fallback:manual on empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, fallback: 'manual' }),
    });
    const r = await fetchParcel(0, 0, 'https://parcel.test');
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe('manual');
  });

  it('returns fallback:manual on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'));
    const r = await fetchParcel(42, -83, 'https://parcel.test');
    expect(r.ok).toBe(false);
    expect(r.fallback).toBe('manual');
  });
});
