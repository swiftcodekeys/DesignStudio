import { describe, it, expect } from 'vitest';
import { computeTotalPanelFt, makeDefaultGate } from '../MapboxDrawGateStep.js';

describe('computeTotalPanelFt', () => {
  it('returns totalFt when no gates', () => {
    expect(computeTotalPanelFt(200, [])).toBe(200);
  });

  it('deducts single walk gate (36 inches = 3 ft)', () => {
    var gates = [{ widthInches: 36 }];
    expect(computeTotalPanelFt(200, gates)).toBeCloseTo(197, 1);
  });

  it('deducts multiple gates', () => {
    var gates = [{ widthInches: 36 }, { widthInches: 96 }];
    expect(computeTotalPanelFt(200, gates)).toBeCloseTo(189, 1);
  });
});

describe('makeDefaultGate', () => {
  it('returns a walk gate with 48" default', () => {
    var g = makeDefaultGate('gate-0', 'line-0', 1, 42, { lat: 42.45, lng: -83.05 });
    expect(g.type).toBe('walk');
    expect(g.widthInches).toBe(48);
    expect(g.top).toBe('flat');
    expect(g.swing).toBe('left');
    expect(g.id).toBe('gate-0');
  });
});
