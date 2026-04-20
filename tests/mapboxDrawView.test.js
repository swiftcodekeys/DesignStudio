import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Mock epqsClient BEFORE importing MapboxDrawView so the draw view picks up
// the stubbed classifyDrawnLine instead of hitting the real USGS endpoint.
vi.mock('../epqsClient', () => ({
  classifyDrawnLine: vi.fn(() => Promise.resolve({
    overallClassification: 'sloped',
    confidence: 'high',
    maxDeltaInches: 14,
    segmentClassifications: [
      { classification: 'flat', deltaInches: 1 },
      { classification: 'sloped', deltaInches: 14 },
    ],
  })),
  queryElevation: vi.fn(() => Promise.resolve({ elevationFeet: 100, dataSource: '3DEP 1m' })),
}));

// Mock parcelClient so parcel fetch resolves deterministically. Individual
// tests override the resolved value via vi.mocked(fetchParcel).mockResolvedValueOnce.
vi.mock('../parcelClient', () => ({
  fetchParcel: vi.fn(() => Promise.resolve({
    ok: true,
    data: {
      boundary: { type: 'Polygon', coordinates: [[[-83.9,42.6],[-83.9,42.605],[-83.905,42.605],[-83.9,42.6]]] },
      address: '123 Main',
      parcelnumb: '42',
    },
  })),
}));

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
    // Pre-answer the slope question by default so tests that exercise the
    // map surface aren't blocked by the pre-draw slope popup. The popup
    // gating is covered by its own dedicated test which clears this key.
    localStorage.setItem('gv_slope_answer', 'flat');
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
    // Estimate banner (compact, tappable) shows once user has drawn
    expect(container.querySelector('.dy-est-banner')).toBeTruthy();
  });

  it('loads autosave from new multi-line shape into the lines array', async () => {
    // P4.1 back-compat: the new localStorage shape persists `lines` (array of
    // point arrays). The loader must accept this shape just like the legacy
    // flat `points` shape. All points across all lines flatten into the shim
    // that drives rendering, so the dock leaves the empty phase.
    localStorage.setItem('gv_draw_state', JSON.stringify({
      lines: [[[-83.9, 42.6], [-83.901, 42.601]]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    // 2 points across the active line -> no empty overlay, banner visible
    expect(container.querySelector('.dy-empty-overlay')).toBeNull();
    expect(container.querySelector('.dy-est-banner')).toBeTruthy();
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

  it('estimate banner is visible when user has drawn points and opens a popup on click', () => {
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
    const banner = container.querySelector('.dy-est-banner');
    expect(banner).toBeTruthy();
    // No personal name (no "Sarah" references anywhere in the banner)
    expect(banner.textContent).not.toMatch(/Sarah/i);

    // Clicking the banner opens the popup
    expect(container.querySelector('.dy-est-dialog')).toBeNull();
    act(() => { fireEvent.click(banner); });
    const dialog = container.querySelector('.dy-est-dialog');
    expect(dialog).toBeTruthy();
    // Popup also doesn't mention the designer's name
    expect(dialog.textContent).not.toMatch(/Sarah/i);
    // "Got it" acknowledge button exists
    expect(dialog.textContent).toMatch(/Got it/i);
    // CYA language Sarah requires: customer is responsible for the math;
    // Grandview verifies before production; the measurements they enter are
    // what we build to. Do not soften.
    expect(dialog.textContent).toMatch(/your responsibility/i);
    expect(dialog.textContent).toMatch(/verify/i);
    expect(dialog.textContent).toMatch(/before production/i);
    expect(dialog.textContent).toMatch(/what (we|Grandview) build(s)? to/i);
    // Measurement guide image + Read-More link must be present in the popup.
    // These were in the original SlopePopup and got stripped in the rewrite.
    const img = dialog.querySelector('img.dy-est-measure-img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toMatch(/measure-slope\.png/);
    const readMore = dialog.querySelector('a[href="/how-to-measure-your-yard"]');
    expect(readMore).toBeTruthy();
  });

  it('vertex marker element has no inline position style (relies on Mapbox transform)', () => {
    // Guard: Mapbox Marker applies position:absolute + transform:translate().
    // Our CSS must not set position:relative on .dy-vertex or the marker
    // renders at origin with the inner dot offset by the transform. This
    // test protects against a regression where a rewrite adds position
    // back to the vertex class.
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'mapbox.css'),
      'utf8'
    );
    // Find the .dy-vertex rule (not .dy-vertex-first, not .dy-vertex-hit)
    const match = css.match(/\.dy-vertex\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const rule = match[1];
    expect(rule).not.toMatch(/position\s*:/);
  });

  it('expanded breakdown has a dedicated close button that collapses the panel', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [
        [-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605], [-83.905, 42.6],
      ],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    // Open the expanded panel via the existing toggle
    const toggle = container.querySelector('.dy-breakdown-toggle');
    expect(toggle).toBeTruthy();
    act(() => { fireEvent.click(toggle); });
    const breakdown = container.querySelector('.dy-dock-breakdown');
    expect(breakdown).toBeTruthy();
    // Close button inside the breakdown panel collapses it
    const closeBtn = breakdown.querySelector('.dy-expanded-close');
    expect(closeBtn).toBeTruthy();
    act(() => { fireEvent.click(closeBtn); });
    expect(container.querySelector('.dy-dock-breakdown')).toBeNull();
  });

  it('expanded breakdown lists every drawn segment (one per vertex pair)', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [
        [-83.9, 42.6],
        [-83.9, 42.605],
        [-83.905, 42.605],
        [-83.905, 42.6],
        [-83.9, 42.6],
      ],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    const toggle = container.querySelector('.dy-breakdown-toggle');
    act(() => { fireEvent.click(toggle); });
    const items = container.querySelectorAll('.dy-segment-list .dy-segment-item');
    // 5 points → 4 segments
    expect(items.length).toBe(4);
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

  it('counts corners by direction change, not vertex count', () => {
    // 4 points forming an L: only 1 interior direction change → 3 total corners (start + elbow + end)
    const { countCornersAndLinePosts } = require('../geometryUtils');
    const L = [[0,0], [0.001,0], [0.001,0.001]];
    const result = countCornersAndLinePosts(L, 6);
    expect(result.corners).toBe(3);
  });

  it('per-segment tier dropdown defaults to Auto and updates on change', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    act(() => { fireEvent.click(container.querySelector('.dy-breakdown-toggle')); });
    const selects = container.querySelectorAll('.dy-segment-tier');
    expect(selects.length).toBe(2);
    expect(selects[0].value).toBe('auto');
    act(() => { fireEvent.change(selects[0], { target: { value: 'heavy' } }); });
    expect(selects[0].value).toBe('heavy');
  });

  it('pre-draw slope popup gates the map until answered', () => {
    // Clear the default slope answer set in beforeEach so this test exercises
    // the pre-draw gate. Address has already been entered via initialLocation,
    // so we're past the cold-start screen.
    localStorage.removeItem('gv_slope_answer');
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    expect(container.querySelector('.mbx-slope-popup-overlay')).toBeTruthy();
    // Map should not render yet. The dock is part of the map view.
    expect(container.querySelector('.dy-dock')).toBeNull();
  });

  it('pre-draw slope answer flows into buildAndComplete output', async () => {
    // Pre-seed localStorage with an answered slope question so the map
    // renders immediately. Then draw 3 points and click Continue.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.once = vi.fn(function(event, handler) { handler(); });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    localStorage.setItem('gv_slope_answer', 'some');
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const onComplete = vi.fn();
    const { container } = render(
      <MapboxDrawView onComplete={onComplete} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    // Map should render (not the slope popup)
    expect(container.querySelector('.mbx-slope-popup-overlay')).toBeNull();
    await act(async () => {
      await new Promise(function(r) { setTimeout(r, 900); });
    });
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    act(() => { fireEvent.click(cta); });
    expect(onComplete).toHaveBeenCalled();
    const arg = onComplete.mock.calls[0][0];
    expect(arg.slopeAnswer).toBe('some');
  });

  it('EPQS classification flows into buildAndComplete output', async () => {
    // Install a Map mock whose `once('render', fn)` fires synchronously so
    // handleContinue's snapshot path actually reaches buildAndComplete.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.once = vi.fn(function(event, handler) { handler(); });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const onComplete = vi.fn();
    const { container } = render(
      <MapboxDrawView onComplete={onComplete} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    // Wait for 800ms debounce + promise resolution + state flush
    await act(async () => {
      await new Promise(function(r) { setTimeout(r, 900); });
    });
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    // Loading finished → CTA should be enabled again
    expect(cta.disabled).toBe(false);
    act(() => { fireEvent.click(cta); });
    expect(onComplete).toHaveBeenCalled();
    const arg = onComplete.mock.calls[0][0];
    expect(arg.epqsOverall).toBe('sloped');
    expect(arg.epqsConfidence).toBe('high');
    expect(arg.epqsMaxDeltaInches).toBe(14);
  });

  it('parcel data flows into buildAndComplete output', async () => {
    // Install a Map mock whose idle event fires synchronously, and whose
    // once('render') also fires synchronously so Continue reaches buildAndComplete.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.once = vi.fn(function(event, handler) { handler(); });
    // Fire 'idle' synchronously when a listener is registered for it
    inst.on = vi.fn(function(event, handler) {
      if (!inst._listeners[event]) inst._listeners[event] = [];
      inst._listeners[event].push(handler);
      if (event === 'idle') handler();
    });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    const parcelClient = await import('../parcelClient');
    parcelClient.fetchParcel.mockResolvedValueOnce({
      ok: true,
      data: {
        boundary: { type: 'Polygon', coordinates: [[[-83.9,42.6],[-83.9,42.605],[-83.905,42.605],[-83.9,42.6]]] },
        address: '123 Main',
        parcelnumb: '42',
      },
    });

    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const onComplete = vi.fn();
    const { container } = render(
      <MapboxDrawView onComplete={onComplete} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    // Wait for the parcel promise + EPQS debounce to resolve and state to flush
    await act(async () => {
      await new Promise(function(r) { setTimeout(r, 900); });
    });
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    act(() => { fireEvent.click(cta); });
    expect(onComplete).toHaveBeenCalled();
    const arg = onComplete.mock.calls[0][0];
    expect(arg.parcel).toBeTruthy();
    expect(arg.parcel.parcelnumb).toBe('42');
  });

  it('parcel fetch failure surfaces a dismissible toast', async () => {
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.once = vi.fn(function(event, handler) { handler(); });
    inst.on = vi.fn(function(event, handler) {
      if (!inst._listeners[event]) inst._listeners[event] = [];
      inst._listeners[event].push(handler);
      if (event === 'idle') handler();
    });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    const parcelClient = await import('../parcelClient');
    parcelClient.fetchParcel.mockResolvedValueOnce({
      ok: false,
      fallback: 'manual',
      error: 'HTTP 500',
    });

    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    await act(async () => {
      await new Promise(function(r) { setTimeout(r, 50); });
    });
    const toast = container.querySelector('.dy-parcel-toast');
    expect(toast).toBeTruthy();
    expect(toast.textContent).toMatch(/Couldn't load your property outline/);
    // Manual dismiss
    const dismiss = toast.querySelector('.dy-parcel-toast-dismiss');
    expect(dismiss).toBeTruthy();
    act(() => { fireEvent.click(dismiss); });
    expect(container.querySelector('.dy-parcel-toast')).toBeNull();
  });

  // --- Segment label overlap guard (P3.1) -------------------------------------
  // Helper: count segment-length labels created by the component. The Marker
  // mock stores opts.element; we filter by className. Ghost label carries the
  // modifier class 'dy-seg-label-ghost' and must be excluded so we count only
  // committed per-segment labels.
  async function countSegLabelMarkers() {
    const mapboxgl = (await import('mapbox-gl')).default;
    const calls = mapboxgl.Marker.mock && mapboxgl.Marker.mock.calls ? mapboxgl.Marker.mock.calls : [];
    let n = 0;
    for (const call of calls) {
      const opts = call[0];
      if (!opts || !opts.element) continue;
      const cls = (opts.element.className || '').toString();
      if (cls.indexOf('dy-seg-label') !== -1 && cls.indexOf('dy-seg-label-ghost') === -1) n++;
    }
    return n;
  }

  it('hides overlapping segment labels on short runs (pixel-distance guard)', async () => {
    // Four colinear points whose midpoints project to near-identical pixels.
    // With project() returning the same x/y for every midpoint, the pixel-gap
    // guard should drop middle labels and keep only the first + last segment
    // labels (2 of 3 possible).
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.project = vi.fn(function() { return { x: 100, y: 100 }; });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [
        [-83.9, 42.6],
        [-83.9, 42.6001],
        [-83.9, 42.6002],
        [-83.9, 42.6003],
      ],
      ts: Date.now(),
    }));
    render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    // 4 points → 3 segments. With collision, expect exactly 2 labels
    // (first + last always kept).
    const count = await countSegLabelMarkers();
    expect(count).toBe(2);
    expect(count).toBeGreaterThanOrEqual(Math.min(2, 3));
    expect(count).toBeLessThanOrEqual(3);
  });

  it('adds per-line dy-line-0 source + glow/stroke layer pair when lines has one 2+ point line (P4.2)', async () => {
    // P4.2: the main polyline effect iterates `lines` and creates per-line
    // source + layer pair. With a single 2-point line seeded in the multi-line
    // autosave shape, the map must receive exactly one `dy-line-0` source and
    // both the glow and solid stroke layers keyed on idx 0.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    // Fire style.load synchronously so the effect's apply() runs inline.
    inst.once = vi.fn(function(event, handler) { handler(); });
    // isStyleLoaded returns false so the effect takes the once('style.load') path.
    inst.isStyleLoaded = vi.fn(() => false);
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    localStorage.setItem('gv_draw_state', JSON.stringify({
      lines: [[[-83.9, 42.6], [-83.901, 42.601]]],
      ts: Date.now(),
    }));

    render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );

    const srcCalls = inst.addSource.mock.calls.map(function(c) { return c[0]; });
    const layerCalls = inst.addLayer.mock.calls.map(function(c) { return (c[0] || {}).id; });

    expect(srcCalls).toContain('dy-line-0');
    expect(layerCalls).toContain('dy-line-0');
    expect(layerCalls).toContain('dy-line-0-glow');
  });

  it('renders every segment label when midpoints are well-separated in pixel space', async () => {
    // project() returns widely-separated pixel coordinates per midpoint, so
    // the pixel-gap guard never fires and all 3 labels render.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    let i = 0;
    inst.project = vi.fn(function() {
      const out = { x: 100 + i * 200, y: 100 };
      i += 1;
      return out;
    });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [
        [-83.9, 42.6],
        [-83.9, 42.605],
        [-83.905, 42.605],
        [-83.905, 42.6],
      ],
      ts: Date.now(),
    }));
    render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    const count = await countSegLabelMarkers();
    expect(count).toBe(3);
  });
});
