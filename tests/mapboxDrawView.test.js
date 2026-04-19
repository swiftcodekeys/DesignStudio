import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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
    addControl: vi.fn(),
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
    this._lngLat = [0, 0];
    this.setLngLat = vi.fn(function (ll) { this._lngLat = ll; return this; }.bind(this));
    this.addTo = vi.fn(function () { return this; }.bind(this));
    this.remove = vi.fn();
    this.getLngLat = vi.fn(function () { return { lng: this._lngLat[0], lat: this._lngLat[1] }; }.bind(this));
    this.on = vi.fn(function () { return this; }.bind(this));
  });

  const MockAttributionControl = vi.fn(function () {});

  return {
    default: {
      Map: vi.fn(function () { return makeMockMapInstance(); }),
      Marker: MockMarker,
      AttributionControl: MockAttributionControl,
      accessToken: '',
    },
  };
});

import MapboxDrawView, { MapScreen } from '../MapboxDrawView.js';

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
    it('passes e.lngLat directly to onManualVertex — no pixel math applied', async () => {
      // Mount the production MapScreen component with manualMode:true and drawMode:'draw'.
      // The component's useEffect registers a 'click' listener on the mock map instance.
      // We then fire a synthetic click via _fire and assert that onManualVertex receives
      // the geographic coordinate straight from e.lngLat — with no pixel math applied.
      const expectedLng = -83.912345;
      const expectedLat = 42.601234;

      const onManualVertex = vi.fn();

      // Capture the mock map instance that MapScreen will create so we can _fire on it.
      const mapboxgl = await import('mapbox-gl');
      const mockInstance = makeMockMapInstance();
      mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

      render(
        <MapScreen
          location={{ lat: 42.6, lng: -83.9 }}
          manualMode={true}
          drawMode="draw"
          onManualVertex={onManualVertex}
          selectedSides={[]}
          manualPoints={[]}
        />
      );

      // Fire a synthetic Mapbox click event: Mapbox provides e.lngLat, not pixel coords.
      // The handler must NOT use e.point — only e.lngLat is the authoritative geo coord.
      mockInstance._fire('click', {
        lngLat: { lng: expectedLng, lat: expectedLat },
        point: { x: 400, y: 300 },   // pixel hit — production handler must NOT use these
      });

      expect(onManualVertex).toHaveBeenCalledTimes(1);
      const [result] = onManualVertex.mock.calls[0];
      expect(result[0]).toBe(expectedLng);
      expect(result[1]).toBe(expectedLat);
    });

    it('does not call onManualVertex when drawMode is not "draw"', async () => {
      // Mount MapScreen with drawMode:'navigate' — click events must be ignored.
      const onManualVertex = vi.fn();

      const mapboxgl = await import('mapbox-gl');
      const mockInstance = makeMockMapInstance();
      mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

      render(
        <MapScreen
          location={{ lat: 42.6, lng: -83.9 }}
          manualMode={true}
          drawMode="navigate"
          onManualVertex={onManualVertex}
          selectedSides={[]}
          manualPoints={[]}
        />
      );

      mockInstance._fire('click', { lngLat: { lng: -83.9, lat: 42.6 }, point: { x: 100, y: 100 } });

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
      // This regex assumes single-quoted string literal — if cssText is refactored to
      // double-quotes or a template literal, update the regex capture group accordingly.
      const match = src.match(/mbx-vertex-handle[\s\S]*?el\.style\.cssText\s*=\s*'([^']+)'/);
      expect(match, 'Should find the el.style.cssText assignment for mbx-vertex-handle').toBeTruthy();
      const cssText = match[1];
      // Must not contain "position" — Mapbox sets position via its own class
      expect(cssText).not.toMatch(/position/);
    });
  });
});
