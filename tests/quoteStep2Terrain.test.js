/**
 * quoteStep2Terrain.test.js
 *
 * Task 15. Terrain section defers to slopeAnswer when the draw flow
 * already captured it.
 *
 * Problem (Sarah's words): "I think we are asking what kind of terrain
 * they have too many times."
 *
 * The flow used to ask three times:
 *   1. SlopePopup during the draw flow (writes gv_slope_answer)
 *   2. QuoteStep2 Terrain section (Flat / Sloped / Mixed card grid)
 *   3. QuoteStep2 Racking Tier picker
 *
 * After this change:
 *   - Drew-flow buyers see a read-only "Your answer from the draw step:
 *     Some sections sloped" row with a Change button. The 3-card grid is
 *     hidden until they click Change.
 *   - Direct-quote buyers (no drawToolData, no slopeAnswer) still see the
 *     full 3-card pick grid.
 *   - Racking Tier collapses to "Grandview detected: <tier>" with a
 *     "Change racking tier" button when the draw flow pre-filled it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import QuoteBuilder from '../QuoteBuilder.js';

describe('QuoteStep2_Layout. Terrain section defers to slopeAnswer (Task 15)', function() {
  beforeEach(function() {
    window.localStorage.clear();
  });

  it('drew-flow: shows read-only terrain summary with "Some sections sloped" and a Change button when gv_slope_answer=some', function() {
    // Seed the same localStorage keys MapboxDrawView writes when the
    // SlopePopup is answered. QuoteBuilder.hydrateFromSavedDesign reads
    // gv_slope_answer directly (see QuoteBuilder.js ~line 183).
    window.localStorage.setItem('gv_slope_answer', 'some');
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'horizon',
    }));

    var container = render(React.createElement(QuoteBuilder, { skipToStep: 0 })).container;

    // Read-only summary row is rendered
    var readonly = container.querySelector('[data-test="qb-terrain-readonly"]');
    expect(readonly).toBeTruthy();

    // It contains the exact eyebrow + friendly slope answer label
    expect(readonly.textContent).toMatch(/Your answer from the draw step/i);
    expect(readonly.textContent).toMatch(/Some sections sloped/);

    // The 3-card pick grid is NOT present
    expect(container.querySelector('.qb-layout-terrain-grid')).toBeFalsy();

    // Change button is present and clickable
    var change = readonly.querySelector('.qs1-collapsible-toggle');
    expect(change).toBeTruthy();
    expect(change.textContent.trim()).toBe('Change');
  });

  it('direct-quote flow: shows the full 3-card Terrain pick grid when no slopeAnswer and no drawToolData', function() {
    // Fresh localStorage, no drawToolData prop. "instant quote" buyer.
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 0 })).container;

    // Full 3-card grid renders
    var grid = container.querySelector('.qb-layout-terrain-grid');
    expect(grid).toBeTruthy();

    // All three terrain cards are present
    var cards = grid.querySelectorAll('.qb-layout-terrain-card');
    expect(cards.length).toBe(3);

    // No read-only summary
    expect(container.querySelector('[data-test="qb-terrain-readonly"]')).toBeFalsy();
  });

  it('clicking Change on the read-only Terrain summary reveals the 3-card pick grid', function() {
    window.localStorage.setItem('gv_slope_answer', 'some');
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 0 })).container;

    // Initial: read-only summary present, grid absent
    expect(container.querySelector('[data-test="qb-terrain-readonly"]')).toBeTruthy();
    expect(container.querySelector('.qb-layout-terrain-grid')).toBeFalsy();

    // Click Change
    var change = container.querySelector('[data-test="qb-terrain-readonly"] .qs1-collapsible-toggle');
    fireEvent.click(change);

    // After click: grid is rendered, read-only summary is gone
    expect(container.querySelector('.qb-layout-terrain-grid')).toBeTruthy();
    expect(container.querySelector('[data-test="qb-terrain-readonly"]')).toBeFalsy();
  });

  it('uses "Flat yard" label when gv_slope_answer=flat', function() {
    window.localStorage.setItem('gv_slope_answer', 'flat');
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 0 })).container;

    var readonly = container.querySelector('[data-test="qb-terrain-readonly"]');
    expect(readonly).toBeTruthy();
    expect(readonly.textContent).toMatch(/Flat yard/);
  });

  it('uses "Mostly sloped yard" label when gv_slope_answer=all', function() {
    window.localStorage.setItem('gv_slope_answer', 'all');
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 0 })).container;

    var readonly = container.querySelector('[data-test="qb-terrain-readonly"]');
    expect(readonly).toBeTruthy();
    expect(readonly.textContent).toMatch(/Mostly sloped yard/);
  });

  it('drew-flow with drawToolData: Racking Tier section collapses to a "Grandview detected" summary with Change racking tier button', function() {
    // Simulate drew-flow arrival: drawToolData carries EPQS classification.
    // The absorb-drawToolData useEffect pre-fills data.rackingTier from
    // epqsOverall. The UI then shows a read-only summary.
    // initialConfig.terrain='sloped' mirrors what the draw step writes when
    // the buyer confirms sloped terrain; needed here because the Racking
    // section is gated on hasSlope (QuoteStep2_Layout.js) which reads
    // data.terrain, not drawToolData.epqsOverall directly.
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
      drawToolData: {
        totalFeet: 120,
        segments: [{ label: 'Run 1', length: 120, terrain: 'sloped' }],
        corners: 0,
        ends: 2,
        epqsOverall: 'sloped', // -> rackingTier: 'rackable'
        slopedPostCount: 5,
      },
    })).container;

    // Racking Tier read-only summary rendered with Grandview detected eyebrow
    var rackReadonly = container.querySelector('[data-test="qb-racking-readonly"]');
    expect(rackReadonly).toBeTruthy();
    expect(rackReadonly.textContent).toMatch(/Grandview detected/i);
    // 'rackable' -> "Rackable panels"
    expect(rackReadonly.textContent).toMatch(/Rackable panels/);

    // Change racking tier button present
    var rackChange = rackReadonly.querySelector('.qs1-collapsible-toggle');
    expect(rackChange).toBeTruthy();
    expect(rackChange.textContent.trim()).toBe('Change racking tier');

    // Full tier picker (.qb-rack-tier buttons) is NOT rendered
    expect(container.querySelector('.qb-rack-tier')).toBeFalsy();
  });

  it('clicking Change racking tier reveals the full 3-tier pick UI', function() {
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 0,
      initialConfig: { terrain: 'sloped' },
      drawToolData: {
        totalFeet: 120,
        segments: [{ label: 'Run 1', length: 120, terrain: 'sloped' }],
        corners: 0,
        ends: 2,
        epqsOverall: 'sloped',
        slopedPostCount: 5,
      },
    })).container;

    // Expand the racking summary
    var rackChange = container.querySelector('[data-test="qb-racking-readonly"] .qs1-collapsible-toggle');
    expect(rackChange).toBeTruthy();
    fireEvent.click(rackChange);

    // Now the tier buttons render (3 options: standard, rackable, heavy-rackable)
    var tiers = container.querySelectorAll('.qb-rack-tier');
    expect(tiers.length).toBe(3);

    // And the read-only summary is gone
    expect(container.querySelector('[data-test="qb-racking-readonly"]')).toBeFalsy();
  });

  it('direct-quote flow: Racking Tier shows the full tier picker (no drawToolData, no slopeAnswer)', function() {
    // Direct buyer arrives at the Layout step and picks Sloped terrain.
    // Without drawToolData AND without slopeAnswer, the Racking Tier should
    // present the full 3-card picker just like before (no regression for
    // instant-quote buyers).
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 0 })).container;

    // Pick 'Sloped' terrain so the Slope Handling + Racking sections appear
    var slopedCard = Array.from(container.querySelectorAll('.qb-layout-terrain-card'))
      .find(function(c) { return /Sloped/.test(c.textContent) && !/Mixed/.test(c.textContent); });
    expect(slopedCard).toBeTruthy();
    fireEvent.click(slopedCard);

    // Full tier picker appears, NOT the read-only summary
    var tiers = container.querySelectorAll('.qb-rack-tier');
    expect(tiers.length).toBe(3);
    expect(container.querySelector('[data-test="qb-racking-readonly"]')).toBeFalsy();
  });
});
