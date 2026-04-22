import { describe, it, expect } from 'vitest';
import { computeLabelOffsetPx, computeCentroidPx } from '../MapboxDrawView.js';

// Pixel-space note: Mapbox's map.project returns screen pixels where
// +x is right and +y is DOWN (standard screen convention). The helper
// returns an offset in that same space.

describe('computeLabelOffsetPx', () => {
  it('returns zero-magnitude offset for degenerate (p0 == p1) segments', () => {
    const [ox, oy] = computeLabelOffsetPx({
      p0: { x: 100, y: 100 },
      p1: { x: 100, y: 100 },
      centroid: null,
      isClosed: false,
    });
    // Divide-by-zero guard: when len falls back to 1, dx=dy=0, perpendicular
    // is (0, 0), so the offset collapses to zero magnitude.
    expect(Math.abs(ox)).toBeLessThan(1e-9);
    expect(Math.abs(oy)).toBeLessThan(1e-9);
  });

  it('places label perpendicular to an east-going horizontal segment (open line, consistent sign)', () => {
    const [ox, oy] = computeLabelOffsetPx({
      p0: { x: 0, y: 100 },
      p1: { x: 100, y: 100 }, // east-going in pixel space
      centroid: null,
      isClosed: false,
    });
    // Segment vector (+x, 0). The helper's perpendicular is (-dy, +dx)/len
    // which in screen coords (+y = down) produces (0, +y). Offset is 22px in y.
    expect(Math.abs(ox)).toBeLessThan(1e-9);
    expect(oy).toBeCloseTo(22, 6);
  });

  it('places label perpendicular to a south-going vertical segment (open line)', () => {
    const [ox, oy] = computeLabelOffsetPx({
      p0: { x: 100, y: 0 },
      p1: { x: 100, y: 100 }, // south in pixel space
      centroid: null,
      isClosed: false,
    });
    // Segment vector (0, +y). Perpendicular is (-1, 0) in screen coords.
    expect(ox).toBeCloseTo(-22, 6);
    expect(Math.abs(oy)).toBeLessThan(1e-9);
  });

  it('uses centroid to pick "outside" for a closed polygon (square walked clockwise on screen)', () => {
    // Square in pixel space, clockwise on screen (remember +y is DOWN).
    // Vertices: (0,0) -> (100,0) -> (100,100) -> (0,100) -> (0,0).
    // Centroid at (50, 50).
    const centroid = { x: 50, y: 50 };
    // Top edge: p0=(0,0) -> p1=(100,0). Midpoint (50, 0). Outside = up (-y).
    const [ox0, oy0] = computeLabelOffsetPx({
      p0: { x: 0, y: 0 },
      p1: { x: 100, y: 0 },
      centroid, isClosed: true,
    });
    expect(oy0).toBeLessThan(0); // pointing up (outside the square)
    expect(Math.abs(ox0)).toBeLessThan(1e-9);

    // Right edge: p0=(100,0) -> p1=(100,100). Midpoint (100, 50). Outside = right (+x).
    const [ox1, oy1] = computeLabelOffsetPx({
      p0: { x: 100, y: 0 },
      p1: { x: 100, y: 100 },
      centroid, isClosed: true,
    });
    expect(ox1).toBeGreaterThan(0);
    expect(Math.abs(oy1)).toBeLessThan(1e-9);

    // Bottom edge: p0=(100,100) -> p1=(0,100). Midpoint (50, 100). Outside = down (+y).
    const [ox2, oy2] = computeLabelOffsetPx({
      p0: { x: 100, y: 100 },
      p1: { x: 0, y: 100 },
      centroid, isClosed: true,
    });
    expect(oy2).toBeGreaterThan(0);
    expect(Math.abs(ox2)).toBeLessThan(1e-9);

    // Left edge: p0=(0,100) -> p1=(0,0). Midpoint (0, 50). Outside = left (-x).
    const [ox3, oy3] = computeLabelOffsetPx({
      p0: { x: 0, y: 100 },
      p1: { x: 0, y: 0 },
      centroid, isClosed: true,
    });
    expect(ox3).toBeLessThan(0);
    expect(Math.abs(oy3)).toBeLessThan(1e-9);
  });

  it('honors custom distancePx', () => {
    const [ox, oy] = computeLabelOffsetPx({
      p0: { x: 0, y: 100 },
      p1: { x: 100, y: 100 },
      centroid: null,
      isClosed: false,
      distancePx: 40,
    });
    expect(Math.abs(ox)).toBeLessThan(1e-9);
    expect(Math.abs(oy)).toBeCloseTo(40, 6);
  });

  it('produces a unit-length perpendicular scaled by distancePx regardless of segment length', () => {
    // Long diagonal segment (pixel length = sqrt(2) * 100)
    const [ox, oy] = computeLabelOffsetPx({
      p0: { x: 0, y: 0 },
      p1: { x: 100, y: 100 },
      centroid: null,
      isClosed: false,
      distancePx: 22,
    });
    // Magnitude of offset should be exactly distancePx.
    expect(Math.sqrt(ox * ox + oy * oy)).toBeCloseTo(22, 6);
  });
});

describe('computeCentroidPx', () => {
  it('returns null for <3 points', () => {
    const project = pt => ({ x: pt[0], y: pt[1] });
    expect(computeCentroidPx([], project)).toBeNull();
    expect(computeCentroidPx([[0, 0]], project)).toBeNull();
    expect(computeCentroidPx([[0, 0], [1, 1]], project)).toBeNull();
  });

  it('returns the average of projected points', () => {
    // project just passes through lng/lat as pixel x/y for the test.
    const project = pt => ({ x: pt[0], y: pt[1] });
    const c = computeCentroidPx([[0, 0], [100, 0], [100, 100], [0, 100]], project);
    expect(c).toEqual({ x: 50, y: 50 });
  });

  it('returns null when projectFn is not a function', () => {
    expect(computeCentroidPx([[0, 0], [1, 1], [2, 2]], null)).toBeNull();
  });

  it('returns null if projectFn throws', () => {
    const project = () => { throw new Error('boom'); };
    expect(computeCentroidPx([[0, 0], [1, 1], [2, 2]], project)).toBeNull();
  });
});
