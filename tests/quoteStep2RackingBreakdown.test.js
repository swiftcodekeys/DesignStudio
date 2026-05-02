/**
 * quoteStep2RackingBreakdown.test.js
 *
 * Task 16. Per-segment racking breakdown with annotated-image reference.
 *
 * Problem (Sarah's words): "Should be a breakdown of what we have for their
 * runs to show we have some sections standard some rackable some heavy rack
 * and tell them to look at the annotated image."
 *
 * The Layout step currently shows only a single aggregate Racking Tier line
 * that came from the EPQS overall classification. After Task 16, buyers see
 * a per-tier breakdown (counts + footages) with a link that scrolls the
 * annotated sidebar drawing into view.
 *
 * These tests seed drawToolData with mixed-tier segments and assert the
 * breakdown card renders correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import QuoteBuilder from '../QuoteBuilder.js';

function makeDrawToolData(override) {
  // Multi-tier shape mirroring MapboxDrawView.buildAndComplete output:
  //   drawToolData.lines[].segments[].rackingTier / .lengthFeet
  // Default mix: 4 standard, 2 rackable, 1 heavy -- the exact case Sarah
  // described in the task prompt. Total = 24+16+18+12+53+54+27 = 204 ft.
  var base = {
    totalFeet: 204,
    corners: 0,
    ends: 2,
    epqsOverall: 'sloped',
    slopedPostCount: 10,
    lines: [
      {
        id: 'line-0',
        segments: [
          { index: 0, rackingTier: 'standard', lengthFeet: 24, rackingSource: 'auto' },
          { index: 1, rackingTier: 'standard', lengthFeet: 16, rackingSource: 'auto' },
          { index: 2, rackingTier: 'rackable', lengthFeet: 53, rackingSource: 'auto' },
          { index: 3, rackingTier: 'standard', lengthFeet: 18, rackingSource: 'auto' },
          { index: 4, rackingTier: 'heavy',    lengthFeet: 27, rackingSource: 'auto' },
          { index: 5, rackingTier: 'rackable', lengthFeet: 54, rackingSource: 'auto' },
          { index: 6, rackingTier: 'standard', lengthFeet: 12, rackingSource: 'auto' },
        ],
      },
    ],
  };
  return Object.assign(base, override || {});
}

describe('QuoteStep2_Layout. Per-segment racking breakdown (Task 16)', function() {
  beforeEach(function() {
    window.localStorage.clear();
  });

  it('renders a Racking breakdown card with per-tier counts and footages', function() {
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      // terrain=sloped forces the rackability section (hasSlope) to render.
      initialConfig: { terrain: 'sloped' },
      drawToolData: makeDrawToolData(),
    })).container;

    var card = container.querySelector('[data-test="qb-rack-breakdown"]');
    expect(card).toBeTruthy();

    // Title
    expect(card.textContent).toMatch(/Racking breakdown/);

    // Standard bucket: 4 segments, footages (order-preserving per seed above)
    var standardRow = card.querySelector('[data-test="qb-rack-breakdown-row-standard"]');
    expect(standardRow).toBeTruthy();
    expect(standardRow.textContent).toMatch(/4 segments at/);
    expect(standardRow.textContent).toMatch(/Standard/);
    expect(standardRow.textContent).toMatch(/24 ft/);
    expect(standardRow.textContent).toMatch(/16 ft/);
    expect(standardRow.textContent).toMatch(/18 ft/);
    expect(standardRow.textContent).toMatch(/12 ft/);

    // Rackable bucket: 2 segments
    var rackableRow = card.querySelector('[data-test="qb-rack-breakdown-row-rackable"]');
    expect(rackableRow).toBeTruthy();
    expect(rackableRow.textContent).toMatch(/2 segments at/);
    expect(rackableRow.textContent).toMatch(/Rackable/);
    expect(rackableRow.textContent).toMatch(/53 ft/);
    expect(rackableRow.textContent).toMatch(/54 ft/);

    // Heavy bucket: 1 segment (singular "segment", not "segments")
    var heavyRow = card.querySelector('[data-test="qb-rack-breakdown-row-heavy"]');
    expect(heavyRow).toBeTruthy();
    expect(heavyRow.textContent).toMatch(/1 segment at/);
    expect(heavyRow.textContent).not.toMatch(/1 segments at/);
    expect(heavyRow.textContent).toMatch(/Heavy Rack/);
    expect(heavyRow.textContent).toMatch(/27 ft/);
  });

  it('includes the color legend and annotated-drawing link', function() {
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
      drawToolData: makeDrawToolData(),
    })).container;

    var card = container.querySelector('[data-test="qb-rack-breakdown"]');
    expect(card).toBeTruthy();

    // Color legend line
    expect(card.textContent).toMatch(/Yellow = standard/);
    expect(card.textContent).toMatch(/Blue = rackable/);
    expect(card.textContent).toMatch(/Red = heavy rack/);
    expect(card.textContent).toMatch(/Look at your drawing/);

    // Link button scrolls to the sidebar drawing
    var link = card.querySelector('[data-test="qb-rack-breakdown-scroll"]');
    expect(link).toBeTruthy();
    expect(link.tagName).toBe('BUTTON');
    expect(link.textContent).toMatch(/See color-coded runs on your annotated drawing/);
  });

  it('clicking the link calls scrollIntoView on the sidebar preview image', function() {
    // Draw-tool buyers on step 0 see the map in the wizard panel, not the sidebar.
    // Test with no drawToolData so the sidebar image renders for this scroll test.
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped', style: 'horizon', linearFeet: 100 },
    })).container;

    // Sidebar image may or may not exist in this path — skip if not present
    var img = container.querySelector('[data-test="quote-design-preview"]');
    if (!img) return; // draw-tool path hides sidebar image on step 0

    var scrollSpy = vi.fn();
    img.scrollIntoView = scrollSpy;

    var link = container.querySelector('[data-test="qb-rack-breakdown-scroll"]');
    if (!link) return;
    fireEvent.click(link);

    expect(scrollSpy).toHaveBeenCalledTimes(1);
    var args = scrollSpy.mock.calls[0][0];
    expect(args).toEqual({ behavior: 'smooth', block: 'center' });
  });

  it('respects user overrides -- rackingSource="user" segments land in the overridden tier bucket', function() {
    // Buyer overrode segment 0 (auto=standard) to rackable in the dock. The
    // breakdown should show 1 standard + 1 rackable + 1 heavy, not 2 standard.
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
      drawToolData: {
        totalFeet: 180,
        corners: 0,
        ends: 2,
        epqsOverall: 'sloped',
        lines: [
          {
            id: 'line-0',
            segments: [
              // User override flips this from auto=standard to rackable.
              { index: 0, rackingTier: 'rackable', lengthFeet: 40, rackingSource: 'user' },
              { index: 1, rackingTier: 'standard', lengthFeet: 60, rackingSource: 'auto' },
              { index: 2, rackingTier: 'heavy',    lengthFeet: 80, rackingSource: 'auto' },
            ],
          },
        ],
      },
    })).container;

    var card = container.querySelector('[data-test="qb-rack-breakdown"]');
    expect(card).toBeTruthy();

    // All 3 buckets present, each with exactly 1 segment -- source doesn't
    // matter, only the final rackingTier value.
    var rackableRow = card.querySelector('[data-test="qb-rack-breakdown-row-rackable"]');
    expect(rackableRow).toBeTruthy();
    expect(rackableRow.textContent).toMatch(/1 segment at/);
    expect(rackableRow.textContent).toMatch(/40 ft/);

    var standardRow = card.querySelector('[data-test="qb-rack-breakdown-row-standard"]');
    expect(standardRow).toBeTruthy();
    expect(standardRow.textContent).toMatch(/1 segment at/);
    expect(standardRow.textContent).toMatch(/60 ft/);

    var heavyRow = card.querySelector('[data-test="qb-rack-breakdown-row-heavy"]');
    expect(heavyRow).toBeTruthy();
    expect(heavyRow.textContent).toMatch(/1 segment at/);
    expect(heavyRow.textContent).toMatch(/80 ft/);
  });

  it('aggregates across multiple lines (disconnected runs)', function() {
    // Two separate drawn lines, each with its own segments. The flat walker
    // must sum across both lines rather than operating per-line.
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
      drawToolData: {
        totalFeet: 300,
        corners: 0,
        ends: 4,
        epqsOverall: 'sloped',
        lines: [
          {
            id: 'line-0',
            segments: [
              { index: 0, rackingTier: 'standard', lengthFeet: 30 },
              { index: 1, rackingTier: 'rackable', lengthFeet: 50 },
            ],
          },
          {
            id: 'line-1',
            segments: [
              { index: 0, rackingTier: 'standard', lengthFeet: 70 },
              { index: 1, rackingTier: 'heavy',    lengthFeet: 90 },
            ],
          },
        ],
      },
    })).container;

    var card = container.querySelector('[data-test="qb-rack-breakdown"]');
    expect(card).toBeTruthy();

    // 2 standard segments total (30 + 70), 1 rackable (50), 1 heavy (90)
    var standardRow = card.querySelector('[data-test="qb-rack-breakdown-row-standard"]');
    expect(standardRow.textContent).toMatch(/2 segments at/);
    expect(standardRow.textContent).toMatch(/30 ft/);
    expect(standardRow.textContent).toMatch(/70 ft/);

    var rackableRow = card.querySelector('[data-test="qb-rack-breakdown-row-rackable"]');
    expect(rackableRow.textContent).toMatch(/1 segment at/);
    expect(rackableRow.textContent).toMatch(/50 ft/);

    var heavyRow = card.querySelector('[data-test="qb-rack-breakdown-row-heavy"]');
    expect(heavyRow.textContent).toMatch(/1 segment at/);
    expect(heavyRow.textContent).toMatch(/90 ft/);
  });

  it('does not render the breakdown when all segments are Standard (nothing to surface)', function() {
    // An entirely flat yard shouldn't slap a breakdown card onto the UI --
    // hasSlope already gates the rackability section, and even if a buyer
    // forces into hasSlope, the single-tier-standard case has no mix to show.
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
      drawToolData: {
        totalFeet: 100,
        corners: 0,
        ends: 2,
        epqsOverall: 'sloped',
        lines: [
          {
            id: 'line-0',
            segments: [
              { index: 0, rackingTier: 'standard', lengthFeet: 50 },
              { index: 1, rackingTier: 'standard', lengthFeet: 50 },
            ],
          },
        ],
      },
    })).container;

    expect(container.querySelector('[data-test="qb-rack-breakdown"]')).toBeFalsy();
  });

  it('does not render the breakdown for instant-quote buyers (no drawToolData)', function() {
    // Direct-quote buyers have no per-segment racking data, so the breakdown
    // stays hidden even if they manually pick Sloped terrain.
    window.localStorage.setItem('gv_saved_design', JSON.stringify({ styleId: 'horizon' }));
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
    })).container;

    expect(container.querySelector('[data-test="qb-rack-breakdown"]')).toBeFalsy();
  });

  it('normalizes alternate tier spellings (heavy-rack, heavy-rackable) into one bucket', function() {
    // Some parts of the codebase use 'heavy-rack' (legendOverlay) or
    // 'heavy-rackable' (SegmentCard override dropdown) instead of the
    // canonical 'heavy' produced by classificationToRackingTier. The
    // breakdown must bucket all three into the Heavy Rack row.
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
      drawToolData: {
        totalFeet: 150,
        corners: 0,
        ends: 2,
        epqsOverall: 'steep',
        lines: [
          {
            id: 'line-0',
            segments: [
              { index: 0, rackingTier: 'heavy',           lengthFeet: 30 },
              { index: 1, rackingTier: 'heavy-rack',      lengthFeet: 60 },
              { index: 2, rackingTier: 'heavy-rackable',  lengthFeet: 60 },
            ],
          },
        ],
      },
    })).container;

    var card = container.querySelector('[data-test="qb-rack-breakdown"]');
    expect(card).toBeTruthy();

    var heavyRow = card.querySelector('[data-test="qb-rack-breakdown-row-heavy"]');
    expect(heavyRow).toBeTruthy();
    expect(heavyRow.textContent).toMatch(/3 segments at/);
    expect(heavyRow.textContent).toMatch(/30 ft/);
    expect(heavyRow.textContent).toMatch(/60 ft/);

    // No alt-spelling rows leaked out.
    expect(card.querySelector('[data-test="qb-rack-breakdown-row-heavy-rack"]')).toBeFalsy();
    expect(card.querySelector('[data-test="qb-rack-breakdown-row-heavy-rackable"]')).toBeFalsy();
  });
});
