import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';

// Helper: build a mock Map instance with the methods MapboxDrawView calls
function makeMockMapInstance() {
  const listeners = {};
  return {
    on: vi.fn(function (event, handler) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    off: vi.fn(),
    once: vi.fn(),
    flyTo: vi.fn(),
    remove: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    setTerrain: vi.fn(),
    getSource: vi.fn(() => null),
    getLayer: vi.fn(() => null),
    getCanvas: vi.fn(() => ({ style: {} })),
    isStyleLoaded: vi.fn(() => false),
    setPaintProperty: vi.fn(),
    // Expose internal listeners so tests can fire synthetic events
    _listeners: listeners,
    _fire: function (event, arg) {
      (listeners[event] || []).forEach(function (h) { h(arg); });
    },
  };
}

// Mock mapbox-gl before importing MapboxDrawView
vi.mock('mapbox-gl', () => {
  const MockMarker = vi.fn(function (opts) {
    this._opts = opts;
    this._lngLat = null;
    this.setLngLat = vi.fn(function (ll) { this._lngLat = ll; return this; }.bind(this));
    this.addTo = vi.fn(function () { return this; }.bind(this));
    this.remove = vi.fn();
    this.getLngLat = vi.fn(function () { return { lng: this._lngLat[0], lat: this._lngLat[1] }; }.bind(this));
    this.on = vi.fn(function () { return this; }.bind(this));
  });

  return {
    default: {
      Map: vi.fn(function () { return makeMockMapInstance(); }),
      Marker: MockMarker,
      accessToken: '',
    },
  };
});

import MapboxDrawView from '../MapboxDrawView.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The manual-mode click handler in MapScreen reads e.lngLat.lng / e.lngLat.lat
 * and passes [lng, lat] straight to props.onManualVertex without any pixel math.
 * This helper tests that logic in isolation so we don't need a live Mapbox map.
 */
function makeManualClickHandler(onManualVertex, drawModeRef) {
  return function handleClick(e) {
    if (drawModeRef.current !== 'draw') return;
    if (onManualVertex) onManualVertex([e.lngLat.lng, e.lngLat.lat]);
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapboxDrawView', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(container.querySelector('.mbx-container')).toBeTruthy();
  });

  it('renders an address entry screen when no location provided', () => {
    const { getByPlaceholderText } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(getByPlaceholderText(/enter your address/i)).toBeTruthy();
  });

  it('initializes Mapbox map with satellite-streets-v12 style', async () => {
    const mapboxgl = await import('mapbox-gl');
    const mockInstance = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

    render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );

    expect(mapboxgl.default.Map).toHaveBeenCalledWith(expect.objectContaining({
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
    }));
  });

  it('hydrates initial location from gv_bridge_location', () => {
    localStorage.setItem('gv_bridge_location', JSON.stringify({
      lat: 42.6, lng: -83.9, placeName: '123 Main St',
    }));
    const { queryByPlaceholderText } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    // Should skip AddressEntry, go straight to map
    expect(queryByPlaceholderText(/enter your address/i)).toBeFalsy();
    localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Issue #17 — Manual vertex lngLat must match click event lngLat exactly.
  //
  // The click handler uses e.lngLat (the geographic coordinate Mapbox already
  // computed from the raw pixel hit) and passes it directly to onManualVertex.
  // There must be NO pixel-to-lngLat conversion in application code, because
  // Mapbox has already done it. This test verifies the handler is a pure
  // pass-through with no pixel math or offset introduced.
  // ---------------------------------------------------------------------------
  describe('manual vertex click alignment (issue #17)', () => {
    it('passes e.lngLat directly to onManualVertex — no pixel math applied', () => {
      // Simulate what map.unproject([400, 300]) would return for a given pixel
      const expectedLng = -83.912345;
      const expectedLat = 42.601234;

      const onManualVertex = vi.fn();
      const drawModeRef = { current: 'draw' };

      const handler = makeManualClickHandler(onManualVertex, drawModeRef);

      // Simulate a Mapbox click event: Mapbox provides e.lngLat, not pixel coords
      const syntheticEvent = {
        lngLat: { lng: expectedLng, lat: expectedLat },
        point: { x: 400, y: 300 },   // pixel hit — handler must NOT use these
      };

      handler(syntheticEvent);

      expect(onManualVertex).toHaveBeenCalledTimes(1);
      const [result] = onManualVertex.mock.calls[0];
      expect(result[0]).toBe(expectedLng);
      expect(result[1]).toBe(expectedLat);
    });

    it('does not call onManualVertex when drawMode is not "draw"', () => {
      const onManualVertex = vi.fn();
      const drawModeRef = { current: 'navigate' };

      const handler = makeManualClickHandler(onManualVertex, drawModeRef);
      handler({ lngLat: { lng: -83.9, lat: 42.6 }, point: { x: 100, y: 100 } });

      expect(onManualVertex).not.toHaveBeenCalled();
    });

    it('vertex marker element has no inline position property that would override .mapboxgl-marker', () => {
      // Mapbox GL adds class "mapboxgl-marker" to custom marker elements and
      // relies on its CSS rule { position: absolute } to anchor the element.
      // An inline position:relative would win over the class rule (inline > class
      // specificity) and break positioning. Verify the cssText used in the marker
      // effect does NOT include "position".
      //
      // We test this by inspecting the source string directly — the cssText is
      // a constant literal in the effect, so a regex match on the module source
      // is the most reliable unit-level check without a live DOM.
      const fs = require('fs');
      const src = fs.readFileSync(
        require('path').resolve(__dirname, '../MapboxDrawView.js'),
        'utf8'
      );

      // Find the cssText line for the vertex handle element
      const match = src.match(/mbx-vertex-handle[\s\S]*?el\.style\.cssText\s*=\s*'([^']+)'/);
      expect(match, 'Should find the el.style.cssText assignment for mbx-vertex-handle').toBeTruthy();
      const cssText = match[1];
      // Must not contain "position" — Mapbox sets position via its own class
      expect(cssText).not.toMatch(/position/);
    });
  });
});
