import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Stub global fetch so any incidental EPQS / parcel calls resolve cleanly.
global.fetch = vi.fn(function () {
  return Promise.resolve({
    ok: true,
    json: function () { return Promise.resolve({ value: 100.0 }); },
  });
});

// Helper: build a mock Map instance with the methods the draw view calls.
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
    getCanvas: vi.fn(() => ({ style: {}, toDataURL: function() { return 'data:image/png;base64,x'; } })),
    isStyleLoaded: vi.fn(() => false),
    setPaintProperty: vi.fn(),
    triggerRepaint: vi.fn(),
    addControl: vi.fn(),
    _listeners: listeners,
    _fire: function (event, arg) {
      (listeners[event] || []).forEach(function (h) { h(arg); });
    },
  };
}

// Mock mapbox-gl before importing MapboxDrawView.
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

describe('MapboxDrawView (pen-tool + morphing dock)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Mark the Earth-view intro as already seen so tests render the draw
    // surface immediately, not the cinematic intro. Tests that want to
    // verify the intro can clear this cookie explicitly.
    document.cookie = 'dy_seen=1; path=/; max-age=31536000';
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(container.querySelector('.dy-container')).toBeTruthy();
  });

  it('renders address entry when no location provided', () => {
    const { getByPlaceholderText } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(getByPlaceholderText(/123 Main St/i)).toBeTruthy();
  });

  it('skips address entry when gv_bridge_location is in localStorage', () => {
    localStorage.setItem('gv_bridge_location', JSON.stringify({
      lat: 42.6, lng: -83.9, address: '123 Main St',
    }));
    const { queryByPlaceholderText } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(queryByPlaceholderText(/123 Main St/i)).toBeFalsy();
  });

  it('initializes Mapbox map with satellite-streets-v12 style when location provided', async () => {
    const mapboxgl = await import('mapbox-gl');
    const mockInstance = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

    render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );

    expect(mapboxgl.default.Map).toHaveBeenCalledWith(expect.objectContaining({
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
    }));
  });

  it('dock renders in "empty" phase when no points drawn', () => {
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    expect(container.querySelector('.dy-dock')).toBeTruthy();
    expect(container.querySelector('.dy-dock-empty')).toBeTruthy();
    expect(container.querySelector('.dy-empty-overlay')).toBeTruthy();
  });

  it('empty-state overlay disappears once autosave state has points', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.901, 42.601]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    expect(container.querySelector('.dy-empty-overlay')).toBeNull();
    // Signed note and dock should show in drawing/ready phase
    expect(container.querySelector('.dy-signed-note')).toBeTruthy();
  });

  it('map click passes e.lngLat straight into setPoints (no pixel math)', async () => {
    // Contract: MapScreen's click handler reads Mapbox's already-computed
    // e.lngLat and hands it to setPoints verbatim. Production must never
    // re-derive from e.point or introduce offsets.
    const expectedLng = -83.912345;
    const expectedLat = 42.601234;

    const mapboxgl = await import('mapbox-gl');
    const mockInstance = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

    const received = [];
    const setPoints = vi.fn(function (updater) {
      received.push(typeof updater === 'function' ? updater([]) : updater);
    });
    const setHoverPoint = vi.fn();

    render(
      <MapScreen
        location={{ lat: 42.6, lng: -83.9 }}
        points={[]}
        setPoints={setPoints}
        setHoverPoint={setHoverPoint}
      />
    );

    // Synthesize a Mapbox click — event shape is { lngLat, point, originalEvent }.
    mockInstance._fire('click', {
      lngLat: { lng: expectedLng, lat: expectedLat },
      point: { x: 400, y: 300 },
      originalEvent: { target: null },
    });

    expect(setPoints).toHaveBeenCalledTimes(1);
    expect(received.length).toBe(1);
    expect(received[0][0][0]).toBe(expectedLng);
    expect(received[0][0][1]).toBe(expectedLat);
  });

  it('signed-note row is visible (non-dismissible) when user has drawn points', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.901, 42.601]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    const note = container.querySelector('.dy-signed-note');
    expect(note).toBeTruthy();
    // No dismiss button — handoff spec: "Do not make it dismissible"
    expect(note.querySelector('button')).toBeNull();
  });

  it('address pill renders short form of current location in the top bar', () => {
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '4820 Beacon Hill Rd, Austin, TX 78731' }}
      />
    );
    const pill = container.querySelector('.dy-pill');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toContain('4820 Beacon Hill Rd');
  });
});
