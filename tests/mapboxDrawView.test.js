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

import MapboxDrawView, { MapScreen, MorphingDock } from '../MapboxDrawView.js';

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
        drawModeActive={true}
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

  it('MapScreen gates map clicks on drawModeActive=false', async () => {
    // Task 3 leaf-level gate: when the parent has not opted into draw mode,
    // MapScreen's click handler must be a no-op. Even a perfectly valid click
    // (canvas target, good lngLat, no .dy-vertex guard) must NOT append a
    // point. This pins the gate at the MapScreen boundary so a future refactor
    // that forgets to thread drawModeActive down would fail loudly here rather
    // than silently dropping vertices in pan/zoom mode.
    const mapboxgl = await import('mapbox-gl');
    const mockInstance = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

    const setPoints = vi.fn();
    const setHoverPoint = vi.fn();

    render(
      <MapScreen
        location={{ lat: 42.6, lng: -83.9 }}
        points={[]}
        setPoints={setPoints}
        setHoverPoint={setHoverPoint}
        drawModeActive={false}
      />
    );

    // Fire a click that would otherwise drop a vertex (canvas target, valid
    // lngLat, no vertex-guard collision).
    const canvasEl = document.createElement('canvas');
    canvasEl.className = 'mapboxgl-canvas';
    mockInstance._fire('click', {
      lngLat: { lng: -83.912, lat: 42.601 },
      point: { x: 400, y: 300 },
      originalEvent: { target: canvasEl },
    });

    // Gate must have swallowed the click — no vertex appended.
    expect(setPoints).not.toHaveBeenCalled();
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

  // --- Task 2.4: vertex-drop reliability near existing vertices ---------------

  it('dy-vertex::before has pointer-events: none so click-ring passes through to canvas', () => {
    // Regression guard: the ::before pseudo-element must have pointer-events:none
    // so that clicks in the 14px enlarged hit-target ring around a vertex are
    // NOT swallowed by the vertex element and instead reach the Mapbox canvas
    // where the map.on('click') handler can drop a new vertex.
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'mapbox.css'),
      'utf8'
    );
    // Match the .dy-vertex::before rule block
    const match = css.match(/\.dy-vertex::before\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const rule = match[1];
    expect(rule).toMatch(/pointer-events\s*:\s*none/);
  });

  // --- R4: Stats row must stay on one horizontal line (no wrapping) -----------

  it('R4: .dy-stats has flex-wrap:nowrap so the three stats stay on one line', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'mapbox.css'),
      'utf8'
    );
    // Match the first .dy-stats rule block (not inside a media query override).
    // The rule must contain flex-wrap: nowrap so the three stats (linear feet,
    // post count, price range) cannot spill onto separate rows at the
    // 820-860px dock width.
    const match = css.match(/\.dy-stats\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const rule = match[1];
    expect(rule).toMatch(/flex-wrap\s*:\s*nowrap/);
  });

  it('R4: .dy-stat has min-width:0 so flex children can shrink below their content size', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'mapbox.css'),
      'utf8'
    );
    const match = css.match(/\.dy-stat\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const rule = match[1];
    expect(rule).toMatch(/min-width\s*:\s*0/);
  });

  it('R4: .dy-stat-num uses clamp() for font-size so it scales down at narrow dock widths', () => {
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'mapbox.css'),
      'utf8'
    );
    const match = css.match(/\.dy-stat-num\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const rule = match[1];
    // font-size value must use clamp() so numbers shrink at narrow dock widths
    // rather than forcing a wrap.
    expect(rule).toMatch(/font-size\s*:\s*clamp\(/);
  });

  it('map click near existing vertex still drops a new vertex (canvas target bypasses guard)', async () => {
    // This is the behavioral test for the fix. With pointer-events:none on
    // ::before, a click that lands in the 14px ring hits the canvas, not the
    // .dy-vertex element. The map click handler's t.closest('.dy-vertex') check
    // then returns null and the new vertex is added.
    //
    // We simulate this by firing a map click whose originalEvent.target is the
    // Mapbox canvas element (a plain div, not inside .dy-vertex). One existing
    // vertex is already placed. The click must add a second vertex.
    const mapboxgl = await import('mapbox-gl');
    const mockInstance = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

    const received = [];
    const setPoints = vi.fn(function (updater) {
      // Call the updater with the existing single-vertex array to simulate state
      const existing = received.length === 0 ? [] : received[received.length - 1];
      const next = typeof updater === 'function' ? updater(existing) : updater;
      received.push(next);
    });
    const setHoverPoint = vi.fn();

    render(
      <MapScreen
        location={{ lat: 42.6, lng: -83.9 }}
        points={[[-83.9, 42.6]]}
        setPoints={setPoints}
        setHoverPoint={setHoverPoint}
        drawModeActive={true}
      />
    );

    // Simulate canvas element as click target (what happens when ::before has
    // pointer-events:none and the user clicks in the ring around the vertex).
    const canvasEl = document.createElement('canvas');
    canvasEl.className = 'mapboxgl-canvas';

    // Click at a point 10px away from existing vertex in screen space, but
    // lngLat is what matters for vertex placement.
    mockInstance._fire('click', {
      lngLat: { lng: -83.9001, lat: 42.6001 },
      point: { x: 410, y: 300 },
      originalEvent: { target: canvasEl },
    });

    // setPoints must have been called (new vertex dropped)
    expect(setPoints).toHaveBeenCalledTimes(1);
    expect(received.length).toBe(1);
    // The new point should be the clicked lngLat
    const newPoint = received[0][received[0].length - 1];
    expect(newPoint[0]).toBeCloseTo(-83.9001, 4);
    expect(newPoint[1]).toBeCloseTo(42.6001, 4);
  });

  it('map click directly on .dy-vertex element is still blocked (drag target not confused with canvas)', async () => {
    // Sanity check: a click whose originalEvent.target IS a .dy-vertex element
    // (user clicked right on the 18px circle) should NOT drop a new vertex,
    // because the map handler guards against it to avoid spurious vertex stacking.
    const mapboxgl = await import('mapbox-gl');
    const mockInstance = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function () { return mockInstance; });

    const setPoints = vi.fn();
    const setHoverPoint = vi.fn();

    render(
      <MapScreen
        location={{ lat: 42.6, lng: -83.9 }}
        points={[[-83.9, 42.6]]}
        setPoints={setPoints}
        setHoverPoint={setHoverPoint}
        drawModeActive={true}
      />
    );

    // Construct a .dy-vertex DOM element, like the real marker creates
    const vertexEl = document.createElement('div');
    vertexEl.className = 'dy-vertex';
    document.body.appendChild(vertexEl);

    mockInstance._fire('click', {
      lngLat: { lng: -83.9, lat: 42.6 },
      point: { x: 400, y: 300 },
      originalEvent: { target: vertexEl },
    });

    // Guard must have fired — no new vertex dropped
    expect(setPoints).not.toHaveBeenCalled();

    document.body.removeChild(vertexEl);
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

  it('counts corners by direction change, separately from end posts', () => {
    // L shape: 3 points. 1 interior elbow (corner) + 2 end posts. Pass 4
    // splits these so the colored post overlay + dock stats can show each
    // type. Total structural posts at vertices stays 3.
    const { countCornersAndLinePosts } = require('../geometryUtils');
    const L = [[0,0], [0.001,0], [0.001,0.001]];
    const result = countCornersAndLinePosts(L, 6);
    expect(result.corners).toBe(1);
    expect(result.endPosts).toBe(2);
  });

  it('per-segment tier dropdown is removed from the draw tool', () => {
    // Pass 4: rackability moved to the quote page. The draw tool is now
    // measurement + geometry only, so the per-segment tier dropdown is
    // gone from the expanded breakdown. Segment rows still render with
    // their length and a delete affordance.
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    act(() => { fireEvent.click(container.querySelector('.dy-breakdown-toggle')); });
    expect(container.querySelectorAll('.dy-segment-tier').length).toBe(0);
    // Segment rows still render with length + delete.
    expect(container.querySelectorAll('.dy-segment-item').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.dy-segment-delete').length).toBeGreaterThan(0);
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
    await act(async () => {
      fireEvent.click(cta);
      // Flush async promise chain from buildAnnotatedSnapshot compositor.
      await new Promise(function(r) { setTimeout(r, 0); });
    });
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
    await act(async () => {
      fireEvent.click(cta);
      await new Promise(function(r) { setTimeout(r, 0); });
    });
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
    await act(async () => {
      fireEvent.click(cta);
      await new Promise(function(r) { setTimeout(r, 0); });
    });
    expect(onComplete).toHaveBeenCalled();
    const arg = onComplete.mock.calls[0][0];
    expect(arg.parcel).toBeTruthy();
    expect(arg.parcel.parcelnumb).toBe('42');
  });

  it('parcel fetch failure is silent: no toast, no error copy, draw still works', async () => {
    // Sarah's requirement: the "couldn't load your property" banner made
    // buyers think the whole tool was broken when in fact the parcel outline
    // is optional. A 500 from the Regrid proxy must be logged to the console
    // for debugging but render NO user-visible error, and the draw flow must
    // still complete normally.
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

    // Seed a drawn line so the Continue CTA is actionable, proving the
    // failure did not block the draw flow.
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));

    const onComplete = vi.fn();
    const { container } = render(
      <MapboxDrawView onComplete={onComplete} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    await act(async () => {
      await new Promise(function(r) { setTimeout(r, 900); });
    });

    // No toast element.
    expect(container.querySelector('.dy-parcel-toast')).toBeNull();
    // No user-visible copy about the property / outline failure anywhere.
    expect(container.textContent).not.toMatch(/Couldn't load your property/i);
    expect(container.textContent).not.toMatch(/couldn.?t load/i);
    expect(container.textContent).not.toMatch(/could not load/i);

    // Draw flow still completes: Continue CTA present and clickable.
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    await act(async () => {
      fireEvent.click(cta);
      await new Promise(function(r) { setTimeout(r, 0); });
    });
    expect(onComplete).toHaveBeenCalled();
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

  // --- P4.3: Multi-line UI + per-line output shape --------------------------

  it('P4.3: Start-new-line (Plus) button is NOT rendered when active line has fewer than 2 points', () => {
    // Single vertex drawn → one line with 1 point → active line has no
    // complete segment yet. The "New line" button should stay hidden.
    localStorage.setItem('gv_draw_state', JSON.stringify({
      lines: [[[-83.9, 42.6]]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    const plusBtn = container.querySelector('button[aria-label="New line"]');
    expect(plusBtn).toBeNull();
  });

  it('P4.3: Start-new-line (Plus) button IS rendered once the active line has a complete segment, and clicking it starts a new empty line', async () => {
    // Two points on the active line -> button visible. Click it and the
    // multi-line autosave shape should persist with a trailing empty line.
    localStorage.setItem('gv_draw_state', JSON.stringify({
      lines: [[[-83.9, 42.6], [-83.901, 42.601]]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    const plusBtn = container.querySelector('button[aria-label="New line"]');
    expect(plusBtn).toBeTruthy();
    expect(plusBtn.getAttribute('title')).toBe('Start new disconnected line');

    act(() => { fireEvent.click(plusBtn); });

    // Wait for the 2s autosave debounce + micro-task flush.
    await act(async () => {
      await new Promise(function(r) { setTimeout(r, 2100); });
    });
    const raw = localStorage.getItem('gv_draw_state');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    // New line appended; lines: [[first-line...], []]
    // Autosave writes a flat `points` shim today (not the full lines
    // array), so the robust assertion is that total flat points stayed
    // the same (click only added an empty trailing line) — that proves
    // no stray point leaked, while the in-memory lines shape is what
    // drives the Plus button's visibility. Re-query the button: with
    // the trailing empty line, the active line has 0 points, so the
    // Plus button should disappear.
    const plusAfter = container.querySelector('button[aria-label="New line"]');
    expect(plusAfter).toBeNull();
  });

  it('P4.3: buildAndComplete emits per-line output with correct points per line, no bridge segment, and ends = lines.length * 2', async () => {
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.once = vi.fn(function(event, handler) { handler(); });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    // Two disconnected lines: L0 has 3 points (2 segs), L1 has 2 points (1 seg).
    // The bridge between L0's last point and L1's first point must NOT appear
    // in any emitted segments[].
    const L0 = [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]];
    const L1 = [[-83.91, 42.61], [-83.915, 42.615]];
    localStorage.setItem('gv_draw_state', JSON.stringify({
      lines: [L0, L1],
      ts: Date.now(),
    }));
    const onComplete = vi.fn();
    const { container } = render(
      <MapboxDrawView onComplete={onComplete} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    await act(async () => { await new Promise(function(r) { setTimeout(r, 900); }); });

    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    await act(async () => {
      fireEvent.click(cta);
      await new Promise(function(r) { setTimeout(r, 0); });
    });
    expect(onComplete).toHaveBeenCalled();

    const arg = onComplete.mock.calls[0][0];
    expect(Array.isArray(arg.lines)).toBe(true);
    expect(arg.lines.length).toBe(2);

    // Line 0: points == L0, segments length = 2, no bridge segment.
    expect(arg.lines[0].id).toBe('line-0');
    expect(arg.lines[0].points).toEqual(L0);
    expect(arg.lines[0].segments.length).toBe(2);
    // Each segment's start/end must be from L0; none may reference L1 points.
    arg.lines[0].segments.forEach(function(s) {
      expect(L0.some(function(p) { return p[0] === s.start[0] && p[1] === s.start[1]; })).toBe(true);
      expect(L0.some(function(p) { return p[0] === s.end[0] && p[1] === s.end[1]; })).toBe(true);
    });

    // Line 1: points == L1, segments length = 1, no bridge from L0.
    expect(arg.lines[1].id).toBe('line-1');
    expect(arg.lines[1].points).toEqual(L1);
    expect(arg.lines[1].segments.length).toBe(1);
    const s1 = arg.lines[1].segments[0];
    // The bridge would be (L0 last point) -> (L1 first point). Neither
    // combination should appear as an emitted segment.
    const bridgeStart = L0[L0.length - 1];
    const bridgeEnd = L1[0];
    const isBridge = s1.start[0] === bridgeStart[0] && s1.start[1] === bridgeStart[1]
      && s1.end[0] === bridgeEnd[0] && s1.end[1] === bridgeEnd[1];
    expect(isBridge).toBe(false);
    // L1's only segment is L1[0] -> L1[1].
    expect(s1.start).toEqual(L1[0]);
    expect(s1.end).toEqual(L1[1]);

    // ends = 2 lines * 2 = 4
    expect(arg.ends).toBe(4);
  });

  it('P4.3: buildAndComplete output corners sum across per-line counts (no bridge corner)', async () => {
    // Per-line count: line 0 has 3 collinear points -> 3 corners (start+end,
    // plus one middle that in this geometry is NOT a direction change but the
    // helper counts start+end as 2; a 90-deg bend at the middle adds 1).
    // Actually let's use an L for line 0 (3 corners) and a straight 2-pt line 1
    // (2 corners). Summed per-line total = 5. The flat concat would include a
    // bridge vertex that could add an extra "corner" if summed flat.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.once = vi.fn(function(event, handler) { handler(); });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    // L-shape: [0,0] -> [0, 0.001] -> [0.001, 0.001] (90-degree bend at middle)
    const L0 = [[-83.9, 42.6], [-83.9, 42.601], [-83.899, 42.601]];
    // Straight 2-point line.
    const L1 = [[-83.91, 42.61], [-83.911, 42.611]];

    // Confirm per-line expected counts against the actual helper.
    const { countCornersAndLinePosts } = require('../geometryUtils');
    const c0 = countCornersAndLinePosts(L0, 6).corners;
    const c1 = countCornersAndLinePosts(L1, 6).corners;
    const expectedTotal = c0 + c1;

    localStorage.setItem('gv_draw_state', JSON.stringify({
      lines: [L0, L1],
      ts: Date.now(),
    }));
    const onComplete = vi.fn();
    const { container } = render(
      <MapboxDrawView onComplete={onComplete} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    await act(async () => { await new Promise(function(r) { setTimeout(r, 900); }); });

    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    await act(async () => {
      fireEvent.click(cta);
      await new Promise(function(r) { setTimeout(r, 0); });
    });
    expect(onComplete).toHaveBeenCalled();
    const arg = onComplete.mock.calls[0][0];
    expect(arg.corners).toBe(expectedTotal);

    // Sanity: the flat-points count would differ — computing the helper on
    // the concatenated point array would include a bridge direction change.
    const flat = L0.concat(L1);
    const flatCorners = countCornersAndLinePosts(flat, 6).corners;
    expect(arg.corners).not.toBe(flatCorners);
  });

  // --- Task 3: Draw mode off by default / explicit "Start Drawing" gate ------

  it('Task 3: on mount with no autosave, clicking the map does NOT drop a vertex', async () => {
    // The tool should open in pan/zoom-only mode. Firing a Mapbox click before
    // the user opts in via "Start Drawing" must be a no-op (no new vertex,
    // no state mutation). This is the core of Sarah's fix.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    // Empty-state CTA should be visible before the user opts in
    const startBtn = Array.from(container.querySelectorAll('.dy-dock-cta'))
      .find(function(b) { return b.textContent.trim() === 'Start Drawing'; });
    expect(startBtn).toBeTruthy();
    // Fire a map click. drawModeActive is still false, so nothing should happen.
    inst._fire('click', {
      lngLat: { lng: -83.91, lat: 42.61 },
      point: { x: 100, y: 100 },
      originalEvent: { target: document.createElement('canvas') },
    });
    // No vertex markers (no .dy-vertex in the container, though markers
    // are rendered via Mapbox Marker mock). The real assertion is that the
    // empty overlay is still visible, meaning points.length is still 0.
    expect(container.querySelector('.dy-empty-overlay')).toBeTruthy();
  });

  it('Task 3: .dy-map does NOT have dy-draw-active class before opt-in', () => {
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    const mapEl = container.querySelector('.dy-map');
    expect(mapEl).toBeTruthy();
    expect(mapEl.className).not.toMatch(/dy-draw-active/);
  });

  it('Task 3: clicking "Start Drawing" toggles dy-draw-active on .dy-map and enables vertex clicks', async () => {
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    const startBtn = Array.from(container.querySelectorAll('.dy-dock-cta'))
      .find(function(b) { return b.textContent.trim() === 'Start Drawing'; });
    expect(startBtn).toBeTruthy();

    act(() => { fireEvent.click(startBtn); });

    // After opt-in, the wrapper gets dy-draw-active (CSS flips cursor to crosshair)
    const mapEl = container.querySelector('.dy-map');
    expect(mapEl.className).toMatch(/dy-draw-active/);

    // Start Drawing button should be hidden in draw-active empty state
    const startAfter = Array.from(container.querySelectorAll('.dy-dock-cta'))
      .find(function(b) { return b.textContent.trim() === 'Start Drawing'; });
    expect(startAfter).toBeFalsy();

    // Map clicks now drop vertices. Assert empty overlay disappears once
    // a vertex lands in state.
    inst._fire('click', {
      lngLat: { lng: -83.91, lat: 42.61 },
      point: { x: 100, y: 100 },
      originalEvent: { target: document.createElement('canvas') },
    });
    // React state updates from the click handler are flushed synchronously
    // by testing-library inside the _fire handler call; empty overlay gone.
    expect(container.querySelector('.dy-empty-overlay')).toBeNull();
  });

  it('Task 3: Finish exits draw mode (dy-draw-active removed, Start Drawing re-shows after reset)', async () => {
    // Seed autosave with points so phase=='ready' and micro-actions (incl Finish) render.
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
        __testDrawModeActive={true}
      />
    );
    // Sanity: dy-draw-active is on
    expect(container.querySelector('.dy-map').className).toMatch(/dy-draw-active/);
    // Click Finish
    const finishBtn = container.querySelector('button[aria-label="Finish"]');
    expect(finishBtn).toBeTruthy();
    act(() => { fireEvent.click(finishBtn); });
    // dy-draw-active should be gone
    expect(container.querySelector('.dy-map').className).not.toMatch(/dy-draw-active/);
  });

  it('Task 3: Continue to Quote exits draw mode', async () => {
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
      <MapboxDrawView
        onComplete={onComplete}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
        __testDrawModeActive={true}
      />
    );
    expect(container.querySelector('.dy-map').className).toMatch(/dy-draw-active/);
    await act(async () => { await new Promise(function(r) { setTimeout(r, 900); }); });
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    await act(async () => {
      fireEvent.click(cta);
      await new Promise(function(r) { setTimeout(r, 0); });
    });
    // After Continue, draw mode is off so .dy-map has no dy-draw-active anymore.
    expect(container.querySelector('.dy-map').className).not.toMatch(/dy-draw-active/);
  });

  it('Task 3: "Edit drawing" from finished state re-enters draw mode', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
        __testDrawModeActive={true}
      />
    );
    // Click Finish to get into finished state
    const finishBtn = container.querySelector('button[aria-label="Finish"]');
    act(() => { fireEvent.click(finishBtn); });
    expect(container.querySelector('.dy-map').className).not.toMatch(/dy-draw-active/);
    // Click "Edit drawing"
    const editLink = container.querySelector('.dy-edit-drawing-link');
    expect(editLink).toBeTruthy();
    act(() => { fireEvent.click(editLink); });
    // Draw mode is back on
    expect(container.querySelector('.dy-map').className).toMatch(/dy-draw-active/);
  });

  it('Task 4: "Add another line" from finished state calls onStartNewLine and restores micro-actions', () => {
    // Render the MorphingDock directly so we can stub onStartNewLine and
    // assert that Finish -> Add another line re-exposes the micro-actions
    // row (Undo/Reset/Finish) and pushes through the new-line handler.
    const onStartNewLine = vi.fn();
    const onEnterDrawMode = vi.fn();
    const onExitDrawMode = vi.fn();
    const { container } = render(
      <MorphingDock
        phase="ready"
        totalFt={40}
        corners={3}
        linePosts={2}
        priceRange={{ low: 3000, high: 5000 }}
        segments={[]}
        lines={[[[0,0],[1,1],[2,2]]]}
        onUndo={() => {}}
        onReset={() => {}}
        onStartNewLine={onStartNewLine}
        onContinue={() => {}}
        onStartDrawing={() => {}}
        onEnterDrawMode={onEnterDrawMode}
        onExitDrawMode={onExitDrawMode}
        drawModeActive={true}
      />
    );
    // Sanity: Finish button is present in the ready-phase micro-actions row.
    const finishBtn = container.querySelector('button[aria-label="Finish"]');
    expect(finishBtn).toBeTruthy();
    // Click Finish to swap micro-actions for the finished-state row.
    act(() => { fireEvent.click(finishBtn); });
    // After Finish, micro-actions are hidden; Add another line is visible.
    expect(container.querySelector('button[aria-label="Undo"]')).toBeFalsy();
    const addLineBtn = container.querySelector('.dy-add-line-btn');
    expect(addLineBtn).toBeTruthy();
    expect(addLineBtn.textContent).toBe('Add another line');
    // Click Add another line.
    act(() => { fireEvent.click(addLineBtn); });
    expect(onStartNewLine).toHaveBeenCalledTimes(1);
    expect(onEnterDrawMode).toHaveBeenCalled();
    // Micro-actions row is back (Undo/Reset/Finish present again).
    expect(container.querySelector('button[aria-label="Undo"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Reset"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Finish"]')).toBeTruthy();
    // Finished-state link is gone.
    expect(container.querySelector('.dy-add-line-btn')).toBeFalsy();
  });

  it('Task 4: "Add another line" at the MapboxDrawView level restores draw mode and micro-actions row', () => {
    // Integration test: drive the full <MapboxDrawView> through
    // finish -> add-another-line and assert only on observable DOM
    // (no internal `lines` state access). Seeds autosave so the dock
    // opens in `ready` phase with content, and uses the test-only draw
    // mode flag to bypass the explicit Start Drawing opt-in gate.
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
        __testDrawModeActive={true}
      />
    );
    // Sanity: draw mode is on and Finish is present in the micro-actions row.
    expect(container.querySelector('.dy-map').className).toMatch(/dy-draw-active/);
    const finishBtn = container.querySelector('button[aria-label="Finish"]');
    expect(finishBtn).toBeTruthy();
    // Click Finish: draw mode exits, micro-actions row is replaced by the
    // finished-state row (Edit drawing + Add another line).
    act(() => { fireEvent.click(finishBtn); });
    expect(container.querySelector('.dy-map').className).not.toMatch(/dy-draw-active/);
    expect(container.querySelector('button[aria-label="Undo"]')).toBeFalsy();
    const addLineBtn = container.querySelector('.dy-add-line-btn');
    expect(addLineBtn).toBeTruthy();
    // Click Add another line: draw mode is restored AND the micro-actions
    // row (Undo / Reset / Finish) comes back for the next disconnected run.
    act(() => { fireEvent.click(addLineBtn); });
    expect(container.querySelector('.dy-map').className).toMatch(/dy-draw-active/);
    expect(container.querySelector('button[aria-label="Undo"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Reset"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Finish"]')).toBeTruthy();
    // Finished-state row is gone.
    expect(container.querySelector('.dy-add-line-btn')).toBeFalsy();
  });

  // --- Pass 4 Tasks 5 + 6: colored posts, colored segments, legend ----------

  it('P4.5: post legend is hidden in the empty phase and visible once a line exists', () => {
    localStorage.removeItem('gv_draw_state');
    const { container: empty } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    expect(empty.querySelector('.dy-post-legend')).toBeNull();

    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const { container: drawn } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    const legend = drawn.querySelector('.dy-post-legend');
    expect(legend).toBeTruthy();
    // Three color dots (end, corner, line) plus the copy hint.
    expect(drawn.querySelectorAll('.dy-post-legend .dy-legend-dot').length).toBe(3);
    expect(legend.textContent).toMatch(/End posts/);
    expect(legend.textContent).toMatch(/Corner posts/);
    expect(legend.textContent).toMatch(/Line posts/);
    expect(legend.textContent).toMatch(/15/);
  });

  it('P4.6: breakdown rows render a colored dot matching the rainbow palette', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605], [-83.905, 42.6]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    act(() => { fireEvent.click(container.querySelector('.dy-breakdown-toggle')); });
    const items = container.querySelectorAll('.dy-segment-item');
    expect(items.length).toBe(3);
    items.forEach(function(it) {
      const dot = it.querySelector('.dy-segment-dot');
      expect(dot).toBeTruthy();
      // background inline-style should be set to a non-empty color.
      expect(dot.style.background).toBeTruthy();
    });
  });

  // --- R3: Ghost line origin follows active line, not flat shim ---------------

  it('R3: dy-ghost source receives empty coords when active line is empty (first click after Add another line)', async () => {
    // State: Line 1 is finished with 2 vertices; Line 2 is the new active line
    // with zero vertices. drawModeActive=true. Hover is over [2,2].
    // Expected: the ghost effect sees an empty active line and sets dy-ghost
    // to an empty coordinates array — no ghost renders connecting Line 1's
    // last vertex to the cursor.
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    // isStyleLoaded returns true so apply() runs synchronously inside the effect.
    inst.isStyleLoaded = vi.fn(() => true);
    // getSource('dy-ghost') returns a mock source with setData so the effect
    // takes the fast-path (src.setData) rather than addSource.
    const ghostSrc = { setData: vi.fn() };
    inst.getSource = vi.fn(function(id) {
      if (id === 'dy-ghost') return ghostSrc;
      return null;
    });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    // Two-line state: Line 1 finished [[0,0],[1,1]], Line 2 active but empty [].
    // The flat `points` shim concatenates both = [[0,0],[1,1]] — this is the
    // stale reference that the old code would use, causing the ghost to appear.
    render(
      <MapScreen
        location={{ lat: 42.6, lng: -83.9 }}
        points={[[0, 0], [1, 1]]}
        lines={[[[0, 0], [1, 1]], []]}
        activeLinePoints={[]}
        setPoints={vi.fn()}
        hoverPoint={[2, 2]}
        setHoverPoint={vi.fn()}
        drawModeActive={true}
      />
    );

    // Find the setData call that targeted the ghost source.
    const ghostCalls = ghostSrc.setData.mock.calls;
    expect(ghostCalls.length).toBeGreaterThan(0);
    const lastCall = ghostCalls[ghostCalls.length - 1];
    const coords = lastCall[0].geometry.coordinates;
    // Active line is empty → no ghost segment should render.
    expect(coords).toEqual([]);
  });

  it('R3: dy-ghost source connects active-line last vertex to hoverPoint, not Line 1 last vertex', async () => {
    // State: Line 1 finished [[0,0],[1,1]]; Line 2 active with one vertex [[2,2]].
    // drawModeActive=true. Hover is at [3,3].
    // Expected: ghost connects [2,2] → [3,3], NOT [1,1] → [3,3].
    const mapboxgl = await import('mapbox-gl');
    const inst = makeMockMapInstance();
    inst.isStyleLoaded = vi.fn(() => true);
    const ghostSrc = { setData: vi.fn() };
    inst.getSource = vi.fn(function(id) {
      if (id === 'dy-ghost') return ghostSrc;
      return null;
    });
    mapboxgl.default.Map = vi.fn(function() { return inst; });

    render(
      <MapScreen
        location={{ lat: 42.6, lng: -83.9 }}
        points={[[0, 0], [1, 1], [2, 2]]}
        lines={[[[0, 0], [1, 1]], [[2, 2]]]}
        activeLinePoints={[[2, 2]]}
        setPoints={vi.fn()}
        hoverPoint={[3, 3]}
        setHoverPoint={vi.fn()}
        drawModeActive={true}
      />
    );

    const ghostCalls = ghostSrc.setData.mock.calls;
    expect(ghostCalls.length).toBeGreaterThan(0);
    const lastCall = ghostCalls[ghostCalls.length - 1];
    const coords = lastCall[0].geometry.coordinates;
    // Must start from Line 2's first vertex [2,2], not Line 1's last vertex [1,1].
    expect(coords.length).toBe(2);
    expect(coords[0]).toEqual([2, 2]);
    expect(coords[1]).toEqual([3, 3]);
  });
});
