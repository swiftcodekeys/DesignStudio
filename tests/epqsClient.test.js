import { describe, it, expect, vi } from 'vitest';
import { queryElevation, classifyDrawnLine } from '../epqsClient.js';

global.fetch = vi.fn();

describe('queryElevation', () => {
  it('returns elevation in feet from EPQS proxy response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, data: { elevationFeet: 1000.5, dataSource: '3DEP 1m' } }),
    });
    const r = await queryElevation(42.6, -83.9);
    expect(r.elevationFeet).toBeCloseTo(1000.5);
    expect(r.dataSource).toBeDefined();
  });

  it('returns null on network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('network'));
    const r = await queryElevation(42.6, -83.9);
    expect(r).toBeNull();
  });

  it('aborts when the timeout elapses', async () => {
    global.fetch.mockImplementation((_url, opts) => new Promise((_res, rej) => {
      if (opts && opts.signal) {
        opts.signal.addEventListener('abort', () => rej(new DOMException('AbortError', 'AbortError')));
      }
    })); // resolves only when aborted
    const r = await queryElevation(42.6, -83.9, 100);
    expect(r).toBeNull();
  }, 1000);
});

describe('classifyDrawnLine', () => {
  it('classifies flat when all deltas < 3"', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { elevationFeet: 100.0, dataSource: '3DEP 1m' } }), // all same
    });
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6]], 50);
    expect(r.overallClassification).toBe('flat');
    expect(r.confidence).toBe('high');  // assume 1m lidar for US coords in test
  });

  it('classifies steep when any delta > 30"', async () => {
    let call = 0;
    global.fetch.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ ok: true, data: { elevationFeet: call++ === 0 ? 100.0 : 102.5, dataSource: '3DEP 1m' } }), // 2.5ft delta = 30"
    }));
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6]], 6);
    expect(r.overallClassification).toBe('steep');
  });

  it('returns unknown (non-null) when USGS proxy returns 502 for every point', async () => {
    // Regression guard for Task 2.5: a total USGS outage must not hang the UI
    // or return null — the classifier returns a fully-formed result whose
    // overall classification is 'unknown' so the draw flow can proceed.
    global.fetch.mockResolvedValue({ ok: false, status: 502, json: async () => ({ ok: false, error: 'Upstream error' }) });
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6],[-83.88,42.6]], 6);
    expect(r).not.toBeNull();
    expect(r.overallClassification).toBe('unknown');
    expect(r.confidence).toBe('low');
    expect(Array.isArray(r.segmentClassifications)).toBe(true);
  });

  it('returns partial classifications when one sample fails', async () => {
    // Task 2.5 graceful degradation: a single failed sample no longer nukes
    // the whole classification. Segments bordering the missing sample are
    // flagged 'unknown' while valid segments keep their flat/sloped/steep
    // classification.
    let call = 0;
    global.fetch.mockImplementation(async () => {
      const i = call++;
      if (i === 1) return { ok: false, status: 502, json: async () => ({ ok: false }) };
      return { ok: true, json: async () => ({ ok: true, data: { elevationFeet: 100, dataSource: '3DEP 1m' } }) };
    });
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6],[-83.88,42.6]], 6);
    expect(r).not.toBeNull();
    expect(r.segmentClassifications).toHaveLength(2);
    // Both segments touch the failed middle sample → both should be 'unknown'.
    expect(r.segmentClassifications[0].classification).toBe('unknown');
    expect(r.segmentClassifications[1].classification).toBe('unknown');
  });
});
