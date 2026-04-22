import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';

// MorphingDock is defined inside MapboxDrawView but exported for testing.
// Mock heavy dependencies before importing.

vi.mock('../epqsClient', () => ({
  classifyDrawnLine: vi.fn(() => Promise.resolve({
    overallClassification: 'flat',
    confidence: 'high',
    maxDeltaInches: 0.1,
    segmentClassifications: [],
  })),
  queryElevation: vi.fn(() => Promise.resolve({ elevationFeet: 100, dataSource: '3DEP 1m' })),
}));

vi.mock('../parcelClient', () => ({
  fetchParcel: vi.fn(() => Promise.resolve({ ok: false, fallback: 'manual', error: 'skip' })),
}));

global.fetch = vi.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ value: 100.0 }),
}));

vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(function () {
      return {
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn(),
        flyTo: vi.fn(),
        remove: vi.fn(),
        addSource: vi.fn(),
        addLayer: vi.fn(),
        setTerrain: vi.fn(),
        getSource: vi.fn(() => null),
        getLayer: vi.fn(() => null),
        getCanvas: vi.fn(() => ({ style: {}, toDataURL: function () { return 'data:image/png;base64,x'; } })),
        isStyleLoaded: vi.fn(() => false),
        setPaintProperty: vi.fn(),
        triggerRepaint: vi.fn(),
        addControl: vi.fn(),
      };
    }),
    Marker: vi.fn(function () {
      this.setLngLat = vi.fn(() => this);
      this.addTo = vi.fn(() => this);
      this.remove = vi.fn();
      this.getLngLat = vi.fn(() => ({ lng: 0, lat: 0 }));
      this.on = vi.fn(() => this);
    }),
    AttributionControl: vi.fn(function () {}),
    accessToken: '',
  },
}));

import { MorphingDock } from '../MapboxDrawView.js';

// Default "ready" props — totalFt=80 is well above MIN_DRAW_FT=30.
function makeReadyProps(overrides) {
  return Object.assign({
    phase: 'ready',
    totalFt: 80,
    corners: 2,
    linePosts: 0,
    priceRange: { low: 1000, high: 2000, panelWidthFt: 6, panelPrice: 200 },
    segments: [],
    lines: [[ [-83.9, 42.6], [-83.901, 42.601] ]],
    epqsLoading: false,
    onContinue: vi.fn(),
    onUndo: vi.fn(),
    onReset: vi.fn(),
    onStartNewLine: vi.fn(),
    onToggleBreakdown: vi.fn(),
    onSetTierOverride: vi.fn(),
    onDeleteSegment: vi.fn(),
  }, overrides || {});
}

describe('MorphingDock — Finish button (Task 2.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Finish microAction button when phase is "ready"', () => {
    const { container } = render(React.createElement(MorphingDock, makeReadyProps()));
    const finishBtn = container.querySelector('button[aria-label="Finish"]');
    expect(finishBtn).toBeTruthy();
  });

  it('renders Undo and Reset microAction buttons when phase is "ready" (pre-finish)', () => {
    const { container } = render(React.createElement(MorphingDock, makeReadyProps()));
    expect(container.querySelector('button[aria-label="Undo"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Reset"]')).toBeTruthy();
  });

  it('clicking Finish hides Undo, Reset, Finish buttons and shows "Edit drawing"', () => {
    const { container } = render(React.createElement(MorphingDock, makeReadyProps()));

    // Before clicking Finish — micro buttons visible, Edit drawing absent
    expect(container.querySelector('button[aria-label="Undo"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Finish"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Edit drawing"]')).toBeNull();

    // Click Finish
    act(() => { fireEvent.click(container.querySelector('button[aria-label="Finish"]')); });

    // After clicking Finish — micro buttons gone, Edit drawing present
    expect(container.querySelector('button[aria-label="Undo"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Reset"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Finish"]')).toBeNull();
    expect(container.querySelector('button[aria-label="Edit drawing"]')).toBeTruthy();
  });

  it('after Finish, CTA button text contains "Continue to Quote" not "Done. Continue"', () => {
    const { container } = render(React.createElement(MorphingDock, makeReadyProps()));

    // Before finish — CTA reads "Done. Continue"
    const ctaBefore = container.querySelector('.dy-dock-cta');
    expect(ctaBefore).toBeTruthy();
    expect(ctaBefore.textContent).toMatch(/Done\. Continue/);
    expect(ctaBefore.textContent).not.toMatch(/Continue to Quote/);

    // Click Finish
    act(() => { fireEvent.click(container.querySelector('button[aria-label="Finish"]')); });

    const ctaAfter = container.querySelector('.dy-dock-cta');
    expect(ctaAfter.textContent).toMatch(/Continue to Quote/);
    expect(ctaAfter.textContent).not.toMatch(/Done\. Continue/);
  });

  it('clicking "Edit drawing" restores microActions and CTA reverts to "Done. Continue"', () => {
    const { container } = render(React.createElement(MorphingDock, makeReadyProps()));

    // Click Finish to enter finished state
    act(() => { fireEvent.click(container.querySelector('button[aria-label="Finish"]')); });
    expect(container.querySelector('button[aria-label="Edit drawing"]')).toBeTruthy();

    // Click Edit drawing to revert
    act(() => { fireEvent.click(container.querySelector('button[aria-label="Edit drawing"]')); });

    // Should be back to original micro actions
    expect(container.querySelector('button[aria-label="Undo"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Reset"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Finish"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Edit drawing"]')).toBeNull();

    // CTA back to "Done. Continue"
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta.textContent).toMatch(/Done\. Continue/);
    expect(cta.textContent).not.toMatch(/Continue to Quote/);
  });

  it('CTA onClick still calls props.onContinue after finishing', () => {
    const onContinue = vi.fn();
    const { container } = render(React.createElement(MorphingDock, makeReadyProps({ onContinue })));

    // Enter finished state
    act(() => { fireEvent.click(container.querySelector('button[aria-label="Finish"]')); });

    // Click the CTA
    act(() => { fireEvent.click(container.querySelector('.dy-dock-cta')); });

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe('MorphingDock Task 5: slope-calculated acknowledgment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('while epqsLoading=true the CTA shows "Calculating slope"', () => {
    const { container } = render(React.createElement(
      MorphingDock,
      makeReadyProps({ epqsLoading: true, epqsOverall: null })
    ));
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta).toBeTruthy();
    expect(cta.textContent).toMatch(/Calculating slope/);
  });

  it('when epqsLoading flips false with "rackable" classification, CTA shows "Slope detected: rackable"', () => {
    const { container, rerender } = render(React.createElement(
      MorphingDock,
      makeReadyProps({ epqsLoading: true, epqsOverall: null })
    ));
    // Initial CTA is the loading label.
    expect(container.querySelector('.dy-dock-cta').textContent).toMatch(/Calculating slope/);

    // EPQS resolves: loading false, overall becomes rackable. The effect runs
    // synchronously on render and sets slopeAck.
    act(() => {
      rerender(React.createElement(
        MorphingDock,
        makeReadyProps({ epqsLoading: false, epqsOverall: 'rackable' })
      ));
    });

    const cta = container.querySelector('.dy-dock-cta');
    expect(cta.textContent).toMatch(/Slope detected: rackable/);
  });

  it('after ~2s the acknowledgment clears and CTA returns to "Done. Continue"', () => {
    const { container, rerender } = render(React.createElement(
      MorphingDock,
      makeReadyProps({ epqsLoading: true, epqsOverall: null })
    ));
    act(() => {
      rerender(React.createElement(
        MorphingDock,
        makeReadyProps({ epqsLoading: false, epqsOverall: 'rackable' })
      ));
    });
    expect(container.querySelector('.dy-dock-cta').textContent).toMatch(/Slope detected: rackable/);

    // Advance past the 2s timeout and let React flush the state update.
    act(() => { vi.advanceTimersByTime(2100); });

    const cta = container.querySelector('.dy-dock-cta');
    expect(cta.textContent).toMatch(/Done\. Continue/);
    expect(cta.textContent).not.toMatch(/Slope detected/);
  });

  it('unknown classification shows the "Slope unknown, you can still continue" label', () => {
    const { container, rerender } = render(React.createElement(
      MorphingDock,
      makeReadyProps({ epqsLoading: true, epqsOverall: null })
    ));
    act(() => {
      rerender(React.createElement(
        MorphingDock,
        makeReadyProps({ epqsLoading: false, epqsOverall: 'unknown' })
      ));
    });
    const cta = container.querySelector('.dy-dock-cta');
    expect(cta.textContent).toMatch(/Slope unknown, you can still continue/);
  });

  it('persistent slope chip renders "Slope: rackable" when epqsOverall="rackable"', () => {
    const { container } = render(React.createElement(
      MorphingDock,
      makeReadyProps({ epqsLoading: false, epqsOverall: 'rackable' })
    ));
    const chip = container.querySelector('.dy-slope-chip');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toMatch(/Slope: rackable/);
    expect(chip.className).toMatch(/dy-slope-chip-rackable/);
  });

  it('persistent slope chip renders "Slope: heavy rack" with the heavy-rack modifier class', () => {
    const { container } = render(React.createElement(
      MorphingDock,
      makeReadyProps({ epqsLoading: false, epqsOverall: 'heavy-rack' })
    ));
    const chip = container.querySelector('.dy-slope-chip');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toMatch(/Slope: heavy rack/);
    expect(chip.className).toMatch(/dy-slope-chip-heavy-rack/);
  });

  it('no slope chip when epqsOverall is null (line not yet classified)', () => {
    const { container } = render(React.createElement(
      MorphingDock,
      makeReadyProps({ epqsLoading: false, epqsOverall: null })
    ));
    expect(container.querySelector('.dy-slope-chip')).toBeNull();
  });
});

describe('MorphingDock R1: VFP concrete bag estimate', () => {
  // VFP industry rates: end/corner = 2 bags, line = 1.5, gate = 1.
  // Scenario: 2 end posts, 2 corner posts, 10 line posts, 0 gate posts.
  // Raw = (2*2) + (2*2) + (10*1.5) + (0*1) = 4 + 4 + 15 = 23 bags.
  // Rounded to nearest 5 = 25 bags.
  //
  // The breakdown panel renders when phase='expanded' AND segments.length > 0.
  // Pass phase='expanded' directly and supply one dummy segment to unlock it.
  const dummySegment = { lengthFeet: 20, color: '#aaa' };

  it('concrete estimate uses VFP per-post-type rates: 2 end + 2 corner + 10 line = 25 bags', () => {
    const { container } = render(React.createElement(
      MorphingDock,
      makeReadyProps({
        phase: 'expanded',
        endPosts: 2,
        corners: 2,
        linePosts: 10,
        totalFt: 80,
        segments: [dummySegment],
        priceRange: { low: 5000, high: 8000, panelWidthFt: 6, panelPrice: 250 },
      })
    ));

    const breakdown = container.querySelector('.dy-dock-breakdown');
    expect(breakdown).toBeTruthy();
    // Concrete estimate must show 25 bags (VFP formula), not the old flat rate.
    // Old formula: totalPosts = corners + linePosts = 2+10 = 12; 12*3 = 36 → rounds to 35 bags.
    expect(breakdown.textContent).toMatch(/Concrete: ~25 bags/);
    expect(breakdown.textContent).not.toMatch(/Concrete: ~35 bags/);
  });

  it('concrete tooltip copy mentions per-post-type rates', () => {
    const { container } = render(React.createElement(
      MorphingDock,
      makeReadyProps({
        phase: 'expanded',
        endPosts: 2,
        corners: 2,
        linePosts: 10,
        segments: [dummySegment],
        priceRange: { low: 5000, high: 8000, panelWidthFt: 6, panelPrice: 250 },
      })
    ));

    const breakdown = container.querySelector('.dy-dock-breakdown');
    expect(breakdown).toBeTruthy();
    // Tooltip element carries the title attribute with rate details.
    const infoSpan = breakdown.querySelector('.dy-material-info');
    expect(infoSpan).toBeTruthy();
    const tooltip = infoSpan.getAttribute('title');
    expect(tooltip).toMatch(/2 bags per end\/corner/i);
    expect(tooltip).toMatch(/1\.5 bags per line post/i);
  });
});
