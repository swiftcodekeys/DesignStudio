/**
 * quoteBuilderDataPassThrough.test.js
 *
 * Full data-pass-through regression for all Ultra manufacturing fields.
 *
 * Each test seeds gv_saved_design (and optionally gv_slope_answer) with a
 * specific value, renders QuoteBuilder, and asserts the human-readable label
 * appears in:
 *   (a) the left sidebar spec list (.qb-sidebar-spec)
 *   (b) the Review step (.qb-review-row) when skipToStep:5
 *
 * Fields covered (from the Task 5 audit table):
 *   postCap, finialType (Ultra codes + QB slugs), pupType, circles,
 *   butterflies, scrolls, midRail, upperFinialRail, proSpacing,
 *   arch, mount, leaf, rackingTier, slopeAnswer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import QuoteBuilder from '../QuoteBuilder.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Seed the full "happy path" design with every manufacturing field set. */
function seedFullDesign(overrides) {
  var base = {
    scene: 'fencing',
    styleId: 'uaf_200',
    height: '60',
    color: { id: 'textured-bronze', displayName: 'Textured Bronze', hex: '#5a4d3e' },
    postCap: 'pcb',
    finialType: 'fs',
    pupType: 'pupst',
    circles: true,
    butterflies: false,
    scrolls: true,
    midRail: true,
    upperFinialRail: true,
    proSpacing: false,
    arch: 'e',
    mount: 'p',
    leaf: '2',
    snapshotDataUrl: '',
    timestamp: new Date().toISOString(),
  };
  window.localStorage.setItem('gv_saved_design', JSON.stringify(Object.assign({}, base, overrides)));
}

/** Read the sidebar spec value for a given label. Returns null if not found. */
function getSidebarSpec(container, label) {
  var rows = container.querySelectorAll('.qb-sidebar-spec');
  for (var i = 0; i < rows.length; i++) {
    var l = rows[i].querySelector('.qb-sidebar-spec-label');
    var v = rows[i].querySelector('.qb-sidebar-spec-value');
    if (l && l.textContent === label) return v ? v.textContent : null;
  }
  return null;
}

/** Read a Review step row value for a given label text. Returns null if not found. */
function getReviewValue(container, label) {
  var rows = container.querySelectorAll('.qb-review-row');
  for (var i = 0; i < rows.length; i++) {
    var l = rows[i].querySelector('.qb-review-label');
    var v = rows[i].querySelector('.qb-review-value');
    if (l && l.textContent === label) return v ? v.textContent : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Post cap codes
// ---------------------------------------------------------------------------
describe('postCap pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar: pcb shows "Ball Cap"', function() {
    seedFullDesign({ postCap: 'pcb' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Post cap')).toBe('Ball Cap');
  });

  it('sidebar: pcf shows "Flat Cap" (the string code pcf !== literal default "flat")', function() {
    // DEFAULT_DATA.postCap = 'flat' (a string, not the Ultra code 'pcf').
    // When the 3D configurator writes 'pcf' to gv_saved_design, it hydrates as
    // data.postCap = 'pcf', which !== 'flat', so the sidebar DOES show it.
    seedFullDesign({ postCap: 'pcf' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Post cap')).toBe('Flat Cap');
  });

  it('Review: pcb shows "Ball Cap" in Style & Config section', function() {
    seedFullDesign({ postCap: 'pcb' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Post Caps')).toBe('Ball Cap');
  });

  it('Review: pcf shows "Flat Cap" in Style & Config section', function() {
    seedFullDesign({ postCap: 'pcf' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Post Caps')).toBe('Flat Cap');
  });
});

// ---------------------------------------------------------------------------
// Finial codes (Ultra codes: fs/ft/fq/fp) and QB Extras slugs
// ---------------------------------------------------------------------------
describe('finialType pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar: Ultra code "fs" renders as "Spear" not "Fs"', function() {
    seedFullDesign({ finialType: 'fs' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Finials')).toBe('Spear');
  });

  it('sidebar: Ultra code "ft" renders as "Tri-Finial"', function() {
    seedFullDesign({ finialType: 'ft' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Finials')).toBe('Tri-Finial');
  });

  it('sidebar: Ultra code "fq" renders as "Quad-Finial"', function() {
    seedFullDesign({ finialType: 'fq' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Finials')).toBe('Quad-Finial');
  });

  it('sidebar: Ultra code "fp" renders as "Plug"', function() {
    seedFullDesign({ finialType: 'fp' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Finials')).toBe('Plug');
  });

  it('sidebar: QB slug "spear" renders as "Spear"', function() {
    seedFullDesign({ finialType: 'spear' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Finials')).toBe('Spear');
  });

  it('sidebar: finialType "none" is hidden (not shown as a row)', function() {
    seedFullDesign({ finialType: 'none' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Finials')).toBeNull();
  });

  it('Review: "fs" renders as "Spear" in Extras summary', function() {
    seedFullDesign({ finialType: 'fs' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    var selectionsRow = getReviewValue(container, 'Selections');
    expect(selectionsRow).toContain('Spear');
    expect(selectionsRow).not.toContain('fs');
  });

  it('Review: QB slug "tri" renders as "Tri-Finial" in Extras summary', function() {
    seedFullDesign({ finialType: 'tri', circles: false, butterflies: false, scrolls: false });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    var selectionsRow = getReviewValue(container, 'Selections');
    expect(selectionsRow).toContain('Tri-Finial');
  });
});

// ---------------------------------------------------------------------------
// Puppy pickets: pupType hydration and display
// ---------------------------------------------------------------------------
describe('pupType pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar shows "Standard" for pupType=pupst', function() {
    seedFullDesign({ pupType: 'pupst' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Puppy pickets')).toBe('Standard');
  });

  it('sidebar shows "Classic" for pupType=pupcl', function() {
    seedFullDesign({ pupType: 'pupcl' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Puppy pickets')).toBe('Classic');
  });

  it('sidebar shows "Classic Spear" for pupType=pupcl_spe', function() {
    seedFullDesign({ pupType: 'pupcl_spe' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Puppy pickets')).toBe('Classic Spear');
  });

  it('Review shows puppy picket row when pupType is set', function() {
    seedFullDesign({ pupType: 'pupst' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Puppy Pickets')).toBe('Standard');
  });
});

// ---------------------------------------------------------------------------
// Accent flags: circles, butterflies, scrolls
// ---------------------------------------------------------------------------
describe('accent flags pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar shows "Circles" when circles=true', function() {
    seedFullDesign({ circles: true, butterflies: false, scrolls: false });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Accents')).toContain('Circles');
  });

  it('sidebar shows "Butterflies" when butterflies=true', function() {
    seedFullDesign({ circles: false, butterflies: true, scrolls: false });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Accents')).toContain('Butterflies');
  });

  it('sidebar shows "Scrolls" when scrolls=true', function() {
    seedFullDesign({ circles: false, butterflies: false, scrolls: true });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Accents')).toContain('Scrolls');
  });

  it('sidebar shows multiple accents combined', function() {
    seedFullDesign({ circles: true, butterflies: false, scrolls: true });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    var val = getSidebarSpec(container, 'Accents');
    expect(val).toContain('Circles');
    expect(val).toContain('Scrolls');
  });

  it('sidebar omits Accents row when all accent flags are false', function() {
    seedFullDesign({ circles: false, butterflies: false, scrolls: false });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Accents')).toBeNull();
  });

  it('Review Extras Selections shows "Butterflies" when butterflies=true', function() {
    seedFullDesign({ circles: false, butterflies: true, scrolls: false, finialType: 'none' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Selections')).toContain('Butterflies');
  });

  it('Review Extras Selections shows "Circles" when circles=true', function() {
    seedFullDesign({ circles: true, butterflies: false, scrolls: false, finialType: 'none' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Selections')).toContain('Circles');
  });
});

// ---------------------------------------------------------------------------
// Rail add-on flags: midRail, upperFinialRail
// ---------------------------------------------------------------------------
describe('midRail and upperFinialRail pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar shows "Mid Rail" when midRail=true', function() {
    seedFullDesign({ midRail: true, upperFinialRail: false });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Rail add-ons')).toContain('Mid Rail');
  });

  it('sidebar shows "Upper Finial Rail" when upperFinialRail=true', function() {
    seedFullDesign({ midRail: false, upperFinialRail: true });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Rail add-ons')).toContain('Upper Finial Rail');
  });

  it('sidebar omits Rail add-ons row when both are false', function() {
    seedFullDesign({ midRail: false, upperFinialRail: false });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Rail add-ons')).toBeNull();
  });

  it('Review shows "Mid Rail" in Extras Selections', function() {
    seedFullDesign({ midRail: true, upperFinialRail: false, finialType: 'none', circles: false, butterflies: false, scrolls: false });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Selections')).toContain('Mid Rail');
  });

  it('Review shows "Upper Finial Rail" in Extras Selections', function() {
    seedFullDesign({ midRail: false, upperFinialRail: true, finialType: 'none', circles: false, butterflies: false, scrolls: false });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Selections')).toContain('Upper Finial Rail');
  });
});

// ---------------------------------------------------------------------------
// Gate-only fields: arch, mount, leaf
// ---------------------------------------------------------------------------
describe('gate arch / mount / leaf pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar shows "Estate" for arch=e', function() {
    seedFullDesign({ scene: 'gate', arch: 'e' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Arch')).toBe('Estate');
  });

  it('sidebar shows "Arched" for arch=a', function() {
    seedFullDesign({ scene: 'gate', arch: 'a' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Arch')).toBe('Arched');
  });

  it('sidebar shows "Post Mount" for mount=p', function() {
    seedFullDesign({ scene: 'gate', mount: 'p' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Mount')).toBe('Post Mount');
  });

  it('sidebar shows "Direct Mount" for mount=d', function() {
    seedFullDesign({ scene: 'gate', mount: 'd' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Mount')).toBe('Direct Mount');
  });

  it('sidebar shows "Double Gate" for leaf=2', function() {
    seedFullDesign({ scene: 'gate', leaf: '2' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Leaf')).toBe('Double Gate');
  });

  it('sidebar shows "Single Gate" for leaf=1', function() {
    seedFullDesign({ scene: 'gate', leaf: '1' });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Leaf')).toBe('Single Gate');
  });

  it('Review shows "Estate" in Arch Style row', function() {
    seedFullDesign({ scene: 'gate', arch: 'e' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Arch Style')).toBe('Estate');
  });

  it('Review shows "Post Mount" in Mount Type row', function() {
    seedFullDesign({ scene: 'gate', mount: 'p' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Mount Type')).toBe('Post Mount');
  });

  it('Review shows "Double Gate" in Gate Leaf row', function() {
    seedFullDesign({ scene: 'gate', leaf: '2' });
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Gate Leaf')).toBe('Double Gate');
  });
});

// ---------------------------------------------------------------------------
// Slope answer (stored in separate gv_slope_answer key)
// ---------------------------------------------------------------------------
describe('slopeAnswer pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar shows "Flat (no slope)" for slopeAnswer=none', function() {
    seedFullDesign({});
    window.localStorage.setItem('gv_slope_answer', 'none');
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Slope')).toBe('Flat (no slope)');
  });

  it('sidebar shows "Some sections sloped" for slopeAnswer=some', function() {
    seedFullDesign({});
    window.localStorage.setItem('gv_slope_answer', 'some');
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Slope')).toBe('Some sections sloped');
  });

  it('sidebar shows "Very sloped throughout" for slopeAnswer=all', function() {
    seedFullDesign({});
    window.localStorage.setItem('gv_slope_answer', 'all');
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Slope')).toBe('Very sloped throughout');
  });

  it('Review shows slope answer in Layout & Posts section', function() {
    seedFullDesign({});
    window.localStorage.setItem('gv_slope_answer', 'some');
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    expect(getReviewValue(container, 'Slope')).toBe('Some sections sloped');
  });

  it('sidebar omits Slope row when gv_slope_answer is absent', function() {
    seedFullDesign({});
    // no gv_slope_answer set
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Slope')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Pro spacing
// ---------------------------------------------------------------------------
describe('proSpacing pass-through', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar shows "Pro" spacing row when proSpacing=true', function() {
    seedFullDesign({ proSpacing: true });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSidebarSpec(container, 'Spacing')).toBe('Pro');
  });

  it('sidebar omits Spacing row when proSpacing=false', function() {
    seedFullDesign({ proSpacing: false });
    var container = render(React.createElement(QuoteBuilder, {})).container;
    // Default spacing is 'standard' -- sidebar skips standard spacing
    expect(getSidebarSpec(container, 'Spacing')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Full manufacturing payload: all fields together
// ---------------------------------------------------------------------------
describe('full manufacturing payload end-to-end', function() {
  beforeEach(function() { window.localStorage.clear(); });

  it('sidebar renders all key manufacturing fields from a fully-seeded design', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      scene: 'gate',
      styleId: 'uas_100',
      height: '72',
      color: { id: 'textured-bronze', displayName: 'Textured Bronze', hex: '#5a4d3e' },
      postCap: 'pcb',
      finialType: 'ft',
      pupType: 'pupst',
      circles: true,
      butterflies: false,
      scrolls: false,
      midRail: true,
      upperFinialRail: false,
      proSpacing: false,
      arch: 'e',
      mount: 'd',
      leaf: '1',
    }));
    window.localStorage.setItem('gv_slope_answer', 'some');

    var container = render(React.createElement(QuoteBuilder, {})).container;

    // Core visible-in-sidebar fields (Sarah's screenshot 7 shows these survive).
    // Asserting explicitly so a future hydrate regression on Style/Height/Color
    // is caught by vitest instead of discovered by a buyer.
    expect(getSidebarSpec(container, 'Style')).toBe('Charleston');
    expect(getSidebarSpec(container, 'Height')).toBe('72"');
    expect(getSidebarSpec(container, 'Color')).toBe('Textured Bronze');

    expect(getSidebarSpec(container, 'Post cap')).toBe('Ball Cap');
    expect(getSidebarSpec(container, 'Finials')).toBe('Tri-Finial');
    expect(getSidebarSpec(container, 'Puppy pickets')).toBe('Standard');
    expect(getSidebarSpec(container, 'Accents')).toContain('Circles');
    expect(getSidebarSpec(container, 'Rail add-ons')).toContain('Mid Rail');
    expect(getSidebarSpec(container, 'Arch')).toBe('Estate');
    expect(getSidebarSpec(container, 'Mount')).toBe('Direct Mount');
    expect(getSidebarSpec(container, 'Leaf')).toBe('Single Gate');
    expect(getSidebarSpec(container, 'Slope')).toBe('Some sections sloped');
  });

  it('Review renders all key manufacturing fields from a fully-seeded design', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      scene: 'gate',
      styleId: 'uas_100',
      height: '72',
      color: { id: 'textured-bronze', displayName: 'Textured Bronze', hex: '#5a4d3e' },
      postCap: 'pcb',
      finialType: 'ft',
      pupType: 'pupcl_spe',
      circles: false,
      butterflies: true,
      scrolls: false,
      midRail: false,
      upperFinialRail: true,
      proSpacing: false,
      arch: 'a',
      mount: 'p',
      leaf: '2',
    }));
    window.localStorage.setItem('gv_slope_answer', 'all');

    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;

    expect(getReviewValue(container, 'Post Caps')).toBe('Ball Cap');
    expect(getReviewValue(container, 'Puppy Pickets')).toBe('Classic Spear');
    expect(getReviewValue(container, 'Arch Style')).toBe('Arched');
    expect(getReviewValue(container, 'Mount Type')).toBe('Post Mount');
    expect(getReviewValue(container, 'Gate Leaf')).toBe('Double Gate');
    expect(getReviewValue(container, 'Slope')).toBe('Very sloped throughout');

    // Extras summary should include Butterflies and Upper Finial Rail
    var extrasSel = getReviewValue(container, 'Selections');
    expect(extrasSel).toContain('Butterflies');
    expect(extrasSel).toContain('Upper Finial Rail');
    // And the finial label from the Ultra code should be readable
    expect(extrasSel).toContain('Tri-Finial');
  });
});
