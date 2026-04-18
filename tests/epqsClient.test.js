import { describe, it, expect, vi } from 'vitest';
import { queryElevation, classifyDrawnLine } from '../epqsClient.js';

global.fetch = vi.fn();

describe('queryElevation', () => {
  it('returns elevation in feet from EPQS response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: 1000.5, location: { x: -83.9, y: 42.6 } }),
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
      json: async () => ({ value: 100.0 }), // all same
    });
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6]], 50);
    expect(r.overallClassification).toBe('flat');
    expect(r.confidence).toBe('high');  // assume 1m lidar for US coords in test
  });

  it('classifies steep when any delta > 30"', async () => {
    let call = 0;
    global.fetch.mockImplementation(async () => ({
      ok: true,
      json: async () => ({ value: call++ === 0 ? 100.0 : 102.5 }), // 2.5ft delta = 30"
    }));
    const r = await classifyDrawnLine([[-83.9,42.6],[-83.89,42.6]], 6);
    expect(r.overallClassification).toBe('steep');
  });
});
