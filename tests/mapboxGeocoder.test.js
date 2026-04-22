import { describe, it, expect, vi } from 'vitest';
import { geocodeAddress } from '../mapboxGeocoder.js';

global.fetch = vi.fn();

describe('geocodeAddress', () => {
  it('returns lat/lng for a valid address', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ center: [-83.9, 42.6], place_name: '123 Main St, Howell, MI' }],
      }),
    });
    const result = await geocodeAddress('123 Main St Howell MI', 'pk.test');
    expect(result.lat).toBe(42.6);
    expect(result.lng).toBe(-83.9);
    expect(result.placeName).toContain('Howell');
  });

  it('throws on empty results', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [] }),
    });
    await expect(geocodeAddress('asdf asdf', 'pk.test')).rejects.toThrow(/no results/i);
  });
});
