import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index.js';

describe('epqs-proxy', () => {
  beforeEach(() => { global.fetch = vi.fn(); });

  it('returns elevation for a valid lat/lng', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: 1000.5, dataSource: '3DEP 1m', location: { x: -83.9, y: 42.6 } }),
    });

    var req = new Request('https://x/api/epqs?lat=42.6&lng=-83.9', {
      method: 'GET',
      headers: { 'Origin': 'http://localhost:3000' },
    });
    var env = { ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    expect(resp.status).toBe(200);
    var data = await resp.json();
    expect(data.ok).toBe(true);
    expect(data.data.elevationFeet).toBeCloseTo(1000.5);
    expect(data.data.dataSource).toBe('3DEP 1m');
  });

  it('rejects invalid coordinates with 400', async () => {
    var req = new Request('https://x/api/epqs?lat=999&lng=-83.9', {
      method: 'GET',
      headers: { 'Origin': 'http://localhost:3000' },
    });
    var env = { ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    expect(resp.status).toBe(400);
    var data = await resp.json();
    expect(data.ok).toBe(false);
  });

  it('returns 502 when upstream errors', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    var req = new Request('https://x/api/epqs?lat=42.6&lng=-83.9', {
      method: 'GET',
      headers: { 'Origin': 'http://localhost:3000' },
    });
    var env = { ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    expect(resp.status).toBe(502);
    var data = await resp.json();
    expect(data.ok).toBe(false);
    expect(data.retry).toBe(true);
  });

  it('GET /health returns ok with service name', async () => {
    var req = new Request('https://x/health', {
      method: 'GET',
      headers: { 'Origin': 'http://localhost:3000' },
    });
    var env = { ALLOWED_ORIGINS: 'http://localhost:3000' };
    var resp = await worker.fetch(req, env);
    expect(resp.status).toBe(200);
    var data = await resp.json();
    expect(data.ok).toBe(true);
    expect(data.service).toBe('epqs-proxy');
  });

  describe('CORS', () => {
    var baseEnv = {
      ALLOWED_ORIGINS: 'https://grandview-design-studio.pages.dev,http://localhost:3000',
    };

    it('echoes Cloudflare Pages preview subdomain Origin and sets Vary', async () => {
      var previewOrigin = 'https://feat-quote-redesign.designstudio-csy.pages.dev';
      var req = new Request('https://x/health', {
        method: 'GET',
        headers: { 'Origin': previewOrigin },
      });
      var resp = await worker.fetch(req, baseEnv);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe(previewOrigin);
      expect(resp.headers.get('Vary')).toBe('Origin');
    });

    it('echoes exact allowlisted Origin (localhost:3000)', async () => {
      var req = new Request('https://x/health', {
        method: 'GET',
        headers: { 'Origin': 'http://localhost:3000' },
      });
      var resp = await worker.fetch(req, baseEnv);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(resp.headers.get('Vary')).toBe('Origin');
    });

    it('does NOT echo an untrusted Origin (falls back, no Vary)', async () => {
      var untrusted = 'https://evil.example.com';
      var req = new Request('https://x/health', {
        method: 'GET',
        headers: { 'Origin': untrusted },
      });
      var resp = await worker.fetch(req, baseEnv);
      expect(resp.headers.get('Access-Control-Allow-Origin')).not.toBe(untrusted);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('https://grandview-design-studio.pages.dev');
      expect(resp.headers.get('Vary')).toBeNull();
    });

    it('does NOT accept spoofed preview-like Origin on another domain', async () => {
      // designstudio-csy.pages.dev.evil.com should not match
      var spoof = 'https://feat.designstudio-csy.pages.dev.evil.com';
      var req = new Request('https://x/health', {
        method: 'GET',
        headers: { 'Origin': spoof },
      });
      var resp = await worker.fetch(req, baseEnv);
      expect(resp.headers.get('Access-Control-Allow-Origin')).not.toBe(spoof);
      expect(resp.headers.get('Vary')).toBeNull();
    });

    it('OPTIONS preflight from preview subdomain echoes Origin and sets Vary', async () => {
      var previewOrigin = 'https://feat-quote-redesign.designstudio-csy.pages.dev';
      var req = new Request('https://x/api/epqs', {
        method: 'OPTIONS',
        headers: { 'Origin': previewOrigin },
      });
      var resp = await worker.fetch(req, baseEnv);
      expect(resp.status).toBe(204);
      expect(resp.headers.get('Access-Control-Allow-Origin')).toBe(previewOrigin);
      expect(resp.headers.get('Vary')).toBe('Origin');
    });
  });
});
