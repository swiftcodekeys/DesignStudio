import { describe, it, expect } from 'vitest';
import { extractMapBoundsFromMap, extractVerticesFromLines } from '../MapboxDrawView.js';

describe('extractMapBoundsFromMap', () => {
  it('returns {north, south, east, west} from a Mapbox-like getBounds()', () => {
    var mockMap = {
      getBounds: function() {
        return {
          getNorth: function() { return 42.5; },
          getSouth: function() { return 42.4; },
          getEast: function() { return -83.0; },
          getWest: function() { return -83.1; },
        };
      }
    };
    var bounds = extractMapBoundsFromMap(mockMap);
    expect(bounds.north).toBe(42.5);
    expect(bounds.south).toBe(42.4);
    expect(bounds.east).toBe(-83.0);
    expect(bounds.west).toBe(-83.1);
  });

  it('returns null when map is null', () => {
    expect(extractMapBoundsFromMap(null)).toBeNull();
  });
});

describe('extractVerticesFromLines', () => {
  it('classifies first and last points of an open line as end posts', () => {
    var lines = [{ points: [[-83.1, 42.4], [-83.05, 42.4], [-83.0, 42.4]] }];
    var verts = extractVerticesFromLines(lines);
    expect(verts.find(function(v) { return v.type === 'end'; })).toBeTruthy();
  });
});
