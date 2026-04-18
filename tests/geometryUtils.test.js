import { describe, it, expect } from 'vitest';
import { simplifyRDP, angleBetween, splitPolygonIntoSides, compassBearing, densifyPath } from '../geometryUtils.js';

describe('simplifyRDP', () => {
  it('passes through points below threshold', () => {
    const pts = [[0,0],[1,0],[2,0]];
    expect(simplifyRDP(pts, 0.1)).toEqual([[0,0],[2,0]]);
  });

  it('preserves distinct corners', () => {
    const pts = [[0,0],[1,0],[1,1],[0,1],[0,0]];
    const r = simplifyRDP(pts, 0.0001);
    expect(r.length).toBe(5);
  });
});

describe('angleBetween', () => {
  it('returns 90 for right angle', () => {
    expect(Math.abs(angleBetween([0,0],[1,0],[1,1]) - 90)).toBeLessThan(1);
  });
  it('returns 0 for colinear points', () => {
    expect(Math.abs(angleBetween([0,0],[1,0],[2,0]) - 0)).toBeLessThan(1);
  });
});

describe('splitPolygonIntoSides', () => {
  it('splits a square into 4 sides', () => {
    const poly = [[-83.9,42.6],[-83.89,42.6],[-83.89,42.61],[-83.9,42.61],[-83.9,42.6]];
    const sides = splitPolygonIntoSides(poly);
    expect(sides.length).toBe(4);
    expect(sides[0].start).toEqual([-83.9,42.6]);
    expect(sides[0].compassLabel).toBeTruthy();
  });
});

describe('compassBearing', () => {
  it('returns North for due north', () => {
    expect(compassBearing([0,0],[0,1])).toBe('North');
  });
  it('returns East for due east', () => {
    expect(compassBearing([0,0],[1,0])).toBe('East');
  });
});

describe('densifyPath', () => {
  it('inserts intermediate points', () => {
    const r = densifyPath([[0,0],[0.001,0]], 6);
    expect(r.length).toBeGreaterThan(2);
  });
});
