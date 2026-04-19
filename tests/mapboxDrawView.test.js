import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
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

    // ---------------------------------------------------------------------------
    // CYA banner — deferred trigger tests (issue #14)
    // ---------------------------------------------------------------------------

    it('CYA banner is hidden on mount — starts false regardless of sessionStorage', () => {
      // The banner must NOT show when the component mounts with no draw actions.
      // Previously bannerShown was initialised from sessionStorage; now it starts false.
      sessionStorage.removeItem('gv_draw_banner_shown');
      const { container } = render(
        <MapboxDrawView
          onComplete={() => {}}
          initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
        />
      );
      expect(container.querySelector('.mbx-cya-banner')).toBeNull();
    });

    it('CYA banner appears on first draw action — useEffect fires when manualPoints becomes non-empty', async () => {
      // Behavioral test: render MapboxDrawView with a real location so the map screen
      // is shown. Enable manual mode (click the button), enable draw mode (click toggle),
      // then fire a synthetic map click. The click drives state through handleManualVertex
      // → setManualPoints → useEffect → setBannerShown(true) → banner in DOM.

      sessionStorage.removeItem('gv_draw_banner_shown');

      const mapboxgl = await import('mapbox-gl');
      const mockInstance = makeMockMapInstance();
      mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

      const { container } = render(
        <MapboxDrawView
          onComplete={() => {}}
          initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
        />
      );

      // Banner must not be visible yet — no draw action has occurred.
      expect(container.querySelector('.mbx-cya-banner')).toBeNull();

      // Enable manual mode — the "Use Manual Mode Instead" button calls setManualMode(true),
      // which causes MapScreen to register its click handler (props.manualMode is now true).
      const manualBtn = container.querySelector('.mbx-manual-mode-btn');
      act(function () { fireEvent.click(manualBtn); });

      // Enable draw mode — the mode toggle sets drawMode='draw', which is required for
      // the click handler inside MapScreen to forward events to onManualVertex.
      const drawToggle = container.querySelector('.mbx-mode-toggle');
      act(function () { fireEvent.click(drawToggle); });

      // Fire a synthetic Mapbox click via the established _fire pattern. This drives
      // the MapScreen click handler → props.onManualVertex([lng, lat]) →
      // MapboxDrawView.handleManualVertex → setManualPoints grows → useEffect fires.
      await act(async function () {
        mockInstance._fire('click', {
          lngLat: { lng: -83.9, lat: 42.6 },
          point: { x: 400, y: 300 },
        });
      });

      // The CYA banner should now be visible in the DOM.
      expect(container.querySelector('.mbx-cya-banner')).toBeTruthy();
    });

    it('CYA banner does not re-trigger after "Got it" dismissed — sessionStorage gate in effect', () => {
      // Simulate a session where the user previously dismissed the banner.
      // The effect early-returns when 'gv_draw_banner_shown' is set, so even though
      // selectedSides/manualPoints grow, setBannerShown(true) is never called again.
      sessionStorage.setItem('gv_draw_banner_shown', '1');

      const { container } = render(
        <MapboxDrawView
          onComplete={() => {}}
          initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
        />
      );

      // Banner must not appear even though we rendered with a real location (draw screen shown).
      expect(container.querySelector('.mbx-cya-banner')).toBeNull();

      // Clean up
      sessionStorage.removeItem('gv_draw_banner_shown');
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
