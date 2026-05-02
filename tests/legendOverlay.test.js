// legendOverlay.test.js -- Unit tests for buildAnnotatedSnapshot compositor.
//
// jsdom does not implement canvas 2D context. We stub getContext to return a
// minimal spy object so the drawing code runs to completion without throwing,
// then assert that toDataURL was called with 'image/png' and the return value
// matches our sentinel.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Sentinel returned by the stubbed toDataURL.
const SENTINEL = 'data:image/png;base64,MOCK_ANNOTATED_PNG_SENTINEL_FOR_TESTING';

// Build a minimal canvas 2D context stub. All drawing methods are no-ops.
function makeCtxStub() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
    globalAlpha: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    letterSpacing: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    roundRect: vi.fn(),
    setLineDash: vi.fn(),
  };
}

// Install canvas mock before importing the module under test.
const ctxStub = makeCtxStub();
const toDataURLMock = vi.fn(() => SENTINEL);

HTMLCanvasElement.prototype.getContext = vi.fn(() => ctxStub);
HTMLCanvasElement.prototype.toDataURL = toDataURLMock;

import { buildAnnotatedSnapshot } from '../legendOverlay.js';

// Sample lines matching the buildAndComplete outLines shape.
const SAMPLE_LINES = [
  {
    id: 'line-0',
    color: '#c2410c',
    points: [[-83.9, 42.6], [-83.91, 42.605], [-83.92, 42.6]],
    segments: [
      { index: 0, lengthFeet: 280, rackingTier: 'standard', rackingSource: 'auto' },
      { index: 1, lengthFeet: 140, rackingTier: 'rackable', rackingSource: 'auto' },
    ],
  },
  {
    id: 'line-1',
    color: '#c2410c',
    points: [[-83.88, 42.61], [-83.89, 42.615]],
    segments: [
      { index: 0, lengthFeet: 90, rackingTier: 'heavy-rack', rackingSource: 'user' },
    ],
  },
];

const SAMPLE_OPTS = {
  postCap: 'pcb',
  finialType: null,
  totalFt: 510,
  corners: 3,
};

describe('buildAnnotatedSnapshot', () => {
  beforeEach(() => {
    toDataURLMock.mockClear();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockClear();
  });

  it('returns a Promise resolving to the sentinel data URL (no base image)', async () => {
    const result = await buildAnnotatedSnapshot(null, SAMPLE_LINES, SAMPLE_OPTS);
    expect(result).toBe(SENTINEL);
  });

  it('result starts with data:image/png;base64,', async () => {
    const result = await buildAnnotatedSnapshot(null, SAMPLE_LINES, SAMPLE_OPTS);
    expect(result.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('calls toDataURL with image/png (proves compositor ran to completion)', async () => {
    await buildAnnotatedSnapshot(null, SAMPLE_LINES, SAMPLE_OPTS);
    expect(toDataURLMock).toHaveBeenCalledWith('image/png');
    expect(toDataURLMock).toHaveBeenCalledTimes(1);
  });

  it('handles null lines gracefully', async () => {
    const result = await buildAnnotatedSnapshot(null, null, SAMPLE_OPTS);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles empty lines array gracefully', async () => {
    const result = await buildAnnotatedSnapshot(null, [], SAMPLE_OPTS);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles missing opts gracefully', async () => {
    const result = await buildAnnotatedSnapshot(null, SAMPLE_LINES, {});
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles null opts gracefully', async () => {
    const result = await buildAnnotatedSnapshot(null, SAMPLE_LINES, null);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles pcf (flat cap) without crash', async () => {
    const result = await buildAnnotatedSnapshot(null, SAMPLE_LINES, {
      postCap: 'pcf', totalFt: 200, corners: 2,
    });
    expect(typeof result).toBe('string');
  });

  it('handles finialType set without crash', async () => {
    const result = await buildAnnotatedSnapshot(null, SAMPLE_LINES, {
      postCap: 'pcf', finialType: 'fs', totalFt: 200, corners: 2,
    });
    expect(typeof result).toBe('string');
  });

  it('handles corners=0 without crash', async () => {
    const result = await buildAnnotatedSnapshot(null, SAMPLE_LINES, {
      postCap: 'pcb', totalFt: 100, corners: 0,
    });
    expect(typeof result).toBe('string');
  });
});

describe('buildAnnotatedSnapshot with post markers', () => {
  var mockBounds = { north: 42.5, south: 42.4, east: -83.0, west: -83.1 };
  var mockLines = [{
    id: 'line-0',
    points: [[-83.1, 42.45], [-83.0, 42.45]],
    segments: [{
      index: 0, rackingTier: 'standard', lengthFeet: 80, rackingSource: 'auto',
      compassLabel: 'East', start: [-83.1, 42.45], end: [-83.0, 42.45], color: '#eab308',
    }],
  }];
  var mockGates = [{
    id: 'gate-0', segmentLineId: 'line-0', segmentIndex: 0,
    offsetFt: 20, latLng: { lat: 42.45, lng: -83.06 },
    type: 'walk', top: 'flat', swing: 'left', widthInches: 36,
  }];

  beforeEach(function() { vi.clearAllMocks(); });

  it('calls arc for a gate marker when mapBounds and gates provided', async () => {
    await buildAnnotatedSnapshot(null, mockLines, {
      mapBounds: mockBounds,
      gates: mockGates,
      postCap: 'pcf', finialType: null, totalFt: 80, corners: 0,
    });
    expect(ctxStub.arc.mock.calls.length).toBeGreaterThan(0);
  });

  it('calls fillRect for corner post squares when mapBounds provided', async () => {
    await buildAnnotatedSnapshot(null, mockLines, {
      mapBounds: mockBounds,
      gates: [],
      postCap: 'pcf', finialType: null, totalFt: 80, corners: 0,
    });
    expect(ctxStub.fillRect.mock.calls.length).toBeGreaterThan(0);
  });
});
