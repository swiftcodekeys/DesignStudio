/**
 * quoteBuilder.test.js
 *
 * Verifies the Quote Builder left-sidebar preview image behavior.
 *
 * The sidebar should show:
 *   1. The saved snapshot image when `gv_saved_design.snapshotDataUrl` is a
 *      truthy non-empty string.
 *   2. A style thumbnail fallback based on `gv_saved_design.styleId` when
 *      the snapshot is missing or empty.
 *   3. The existing "Design preview will appear here" placeholder when
 *      nothing has been saved yet (fresh customer).
 *
 * The image element carries data-test="quote-design-preview" for testability.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import QuoteBuilder from '../QuoteBuilder.js';

describe('QuoteBuilder sidebar preview', () => {
  beforeEach(function() {
    // Wipe localStorage between tests so each case runs from a clean slate.
    window.localStorage.clear();
  });

  it('renders the saved snapshot data URL when one is present', function() {
    var snapshot = 'data:image/jpeg;base64,AAAA';
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      snapshotDataUrl: snapshot,
      styleId: 'horizon',
    }));

    var container = render(React.createElement(QuoteBuilder, {})).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');

    expect(img).toBeTruthy();
    expect(img.tagName).toBe('IMG');
    expect(img.getAttribute('src')).toBe(snapshot);
    // Placeholder must not be rendered when an image is shown.
    expect(container.querySelector('.qb-sidebar-image-placeholder')).toBeFalsy();
  });

  it('falls back to the Horizon style thumbnail when snapshot is an empty string', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      snapshotDataUrl: '',
      styleId: 'horizon',
    }));

    var container = render(React.createElement(QuoteBuilder, {})).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');

    expect(img).toBeTruthy();
    expect(img.tagName).toBe('IMG');
    // Horizon (slug or uaf_200 Ultra id) maps to the San Marino iFence preview.
    expect(img.getAttribute('src')).toBe('assets/ifence_previews/gate_styles/san_marino_15.png');
    expect(container.querySelector('.qb-sidebar-image-placeholder')).toBeFalsy();
  });

  it('falls back to the Horizon thumbnail when styleId is the Ultra id uaf_200', function() {
    // buildSavedDesign in app.js emits the Ultra id (e.g. "uaf_200"), not the
    // slug, so the helper must also map Ultra ids.
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      snapshotDataUrl: '',
      styleId: 'uaf_200',
    }));

    var container = render(React.createElement(QuoteBuilder, {})).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');

    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('assets/ifence_previews/gate_styles/san_marino_15.png');
  });

  it('renders the placeholder text when localStorage is empty', function() {
    var container = render(React.createElement(QuoteBuilder, {})).container;

    expect(container.querySelector('[data-test="quote-design-preview"]')).toBeFalsy();
    var placeholder = container.querySelector('.qb-sidebar-image-placeholder');
    expect(placeholder).toBeTruthy();
    expect(placeholder.textContent).toMatch(/Design preview will appear here/);
  });

  // Priority chain for drew-flow buyers: the yard sketch beats everything else.
  // Drew-flow passes drawToolData (with annotatedSnapshotUrl + mapboxSnapshotUrl)
  // in as a prop, and those must take precedence over any 3D fence snapshot or
  // style thumbnail already sitting in localStorage.
  it('prefers drawToolData.annotatedSnapshotUrl over a saved 3D fence snapshot', function() {
    var annotated = 'data:image/jpeg;base64,ANNOT';
    var mapboxRaw = 'data:image/jpeg;base64,MAPRAW';
    var savedFence = 'data:image/jpeg;base64,FENCE3D';
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      snapshotDataUrl: savedFence,
      styleId: 'horizon',
    }));
    var container = render(React.createElement(QuoteBuilder, {
      drawToolData: {
        annotatedSnapshotUrl: annotated,
        mapboxSnapshotUrl: mapboxRaw,
      },
    })).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(annotated);
  });

  it('falls through annotated to drawToolData.mapboxSnapshotUrl when annotated is empty', function() {
    var mapboxRaw = 'data:image/jpeg;base64,MAPRAW';
    var savedFence = 'data:image/jpeg;base64,FENCE3D';
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      snapshotDataUrl: savedFence,
      styleId: 'horizon',
    }));
    var container = render(React.createElement(QuoteBuilder, {
      drawToolData: {
        annotatedSnapshotUrl: '',
        mapboxSnapshotUrl: mapboxRaw,
      },
    })).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(mapboxRaw);
  });

  it('falls through to saved.mapboxSnapshotUrl when drawToolData is absent but the saved design has a map snapshot', function() {
    // Instant-quote or second-session buyer: drawToolData is null but a prior
    // draw wrote its mapboxSnapshotUrl into the saved design.
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      mapboxSnapshotUrl: 'data:image/jpeg;base64,SAVEDMAP',
      snapshotDataUrl: 'data:image/jpeg;base64,FENCE3D',
      styleId: 'horizon',
    }));
    var container = render(React.createElement(QuoteBuilder, {})).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,SAVEDMAP');
  });

  it('last resort is STYLE_THUMBNAILS when nothing else is available', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      annotatedSnapshotUrl: '',
      mapboxSnapshotUrl: '',
      snapshotDataUrl: '',
      styleId: 'horizon',
    }));
    var container = render(React.createElement(QuoteBuilder, {})).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('assets/ifence_previews/gate_styles/san_marino_15.png');
  });

  // Task 14: on Style and Config step (step 1) the buyer is configuring the
  // fence, so the sidebar should show the 3D fence render, not the yard.
  it('Style and Config step prefers saved 3D fence snapshot over yard snapshots', function() {
    var fenceSnap = 'data:image/jpeg;base64,FENCE3D';
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      snapshotDataUrl: fenceSnap,
      styleId: 'horizon',
    }));
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 1,
      drawToolData: {
        annotatedSnapshotUrl: 'data:image/jpeg;base64,ANNOTATED',
        mapboxSnapshotUrl: 'data:image/jpeg;base64,MAPRAW',
      },
    })).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(fenceSnap);
  });

  it('Style and Config step falls back to STYLE_THUMBNAILS when no 3D snapshot exists', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'horizon',
    }));
    var container = render(React.createElement(QuoteBuilder, {
      skipToStep: 1,
    })).container;
    var img = container.querySelector('[data-test="quote-design-preview"]');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('assets/ifence_previews/gate_styles/san_marino_15.png');
  });
});

// ---------------------------------------------------------------------------
// Hydration from gv_saved_design (P2.1 color drift + P2.2 empty Style row)
//
// When the configurator writes gv_saved_design, the Quote Builder must seed
// its initial `data` state with the buyer's color + style choices so the
// left sidebar "Your design" spec list and the Review step show what the
// user actually picked — not the DEFAULT_DATA black/empty fallback.
// ---------------------------------------------------------------------------
describe('QuoteBuilder hydration from gv_saved_design', function() {
  beforeEach(function() {
    window.localStorage.clear();
  });

  function getSpecValue(container, label) {
    var rows = container.querySelectorAll('.qb-sidebar-spec');
    for (var i = 0; i < rows.length; i++) {
      var l = rows[i].querySelector('.qb-sidebar-spec-label');
      var v = rows[i].querySelector('.qb-sidebar-spec-value');
      if (l && l.textContent === label) return v ? v.textContent : null;
    }
    return null;
  }

  it('maps saved.color.id (slug) into sidebar Color row', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'horizon',
      color: { id: 'textured-bronze', displayName: 'Textured Bronze', hex: '#5a4d3e' },
      height: '48',
    }));
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSpecValue(container, 'Color')).toBe('Textured Bronze');
  });

  it('maps Ultra styleId uaf_200 to Horizon in sidebar Style row', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'uaf_200',
      color: { id: 'textured-black', displayName: 'Textured Black' },
      height: '48',
    }));
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSpecValue(container, 'Style')).toBe('Horizon');
  });

  it('passes slug styleId horizon through unchanged', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'horizon',
      color: { id: 'textured-black', displayName: 'Textured Black' },
      height: '48',
    }));
    var container = render(React.createElement(QuoteBuilder, {})).container;
    expect(getSpecValue(container, 'Style')).toBe('Horizon');
  });

  it('applies DEFAULT_DATA when localStorage is empty (Textured Black, no Style row)', function() {
    var container = render(React.createElement(QuoteBuilder, {})).container;
    // DEFAULT_DATA.color is 'textured-black', so Color row renders with that slug.
    expect(getSpecValue(container, 'Color')).toBe('Textured Black');
    // DEFAULT_DATA.style is '' — the sidebar skips falsy fields, so no Style row.
    expect(getSpecValue(container, 'Style')).toBeNull();
  });

  it('props.initialConfig overrides gv_saved_design hydration', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'uaf_200',
      color: { id: 'textured-bronze', displayName: 'Textured Bronze' },
    }));
    var container = render(React.createElement(QuoteBuilder, {
      initialConfig: { style: 'charleston', color: 'satin-white' },
    })).container;
    expect(getSpecValue(container, 'Style')).toBe('Charleston');
    expect(getSpecValue(container, 'Color')).toBe('Satin White');
  });

  it('Review step shows saved color + style (P2.2 acceptance)', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'uaf_200',
      color: { id: 'textured-bronze', displayName: 'Textured Bronze' },
      height: '48',
    }));
    // Skip to Review (step 5).
    var container = render(React.createElement(QuoteBuilder, { skipToStep: 5 })).container;
    // Find the Style & Config review section and check Style + Color values.
    var rows = container.querySelectorAll('.qb-review-row');
    var styleVal = null;
    var colorVal = null;
    for (var i = 0; i < rows.length; i++) {
      var label = rows[i].querySelector('.qb-review-label');
      var value = rows[i].querySelector('.qb-review-value');
      if (!label || !value) continue;
      if (label.textContent === 'Style') styleVal = value.textContent;
      if (label.textContent === 'Color') colorVal = value.textContent;
    }
    expect(styleVal).toBe('Horizon');
    expect(colorVal).toBe('Textured Bronze');
  });

  // -------------------------------------------------------------------------
  // gv_fence_config precedence + Post cap label mapping (live E2E bug fix)
  //
  // When the wizard color picker writes gv_fence_config with id=2 Textured
  // Bronze, but the address-suggestion click into /studio then overwrites
  // app.js fenceConfig.color via URL hash (#color=1 -> Bronze), the resulting
  // gv_saved_design has the wrong color id. The QuoteBuilder must treat
  // gv_fence_config.color.displayName as the user-intent source of truth.
  // -------------------------------------------------------------------------
  it('gv_fence_config color.displayName wins over gv_saved_design color id', function() {
    window.localStorage.setItem('gv_fence_config', JSON.stringify({
      styleId: 'uaf_200',
      color: { id: 2, name: 'Textured Bronze', displayName: 'Textured Bronze', hex: '#5a4d3e' },
      postCap: 'pcf',
    }));
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'uaf_200',
      color: { id: 1, displayName: 'Bronze', hex: '#42382c' },
      postCap: 'pcf',
    }));
    var container = render(React.createElement(QuoteBuilder, {
      zoneName: 'Front', zoneId: 'front', skipToStep: 0,
    })).container;
    // Sidebar Color row should show "Textured Bronze" (from gv_fence_config),
    // not "Bronze" (which is what gv_saved_design would produce on its own).
    expect(getSpecValue(container, 'Color')).toBe('Textured Bronze');
  });

  it('Post cap code pcf renders as "Flat Cap" in sidebar', function() {
    window.localStorage.setItem('gv_saved_design', JSON.stringify({
      styleId: 'uaf_200',
      color: { id: 'textured-bronze', displayName: 'Textured Bronze' },
      postCap: 'pcf',
    }));
    var container = render(React.createElement(QuoteBuilder, {
      zoneName: 'Front', zoneId: 'front', skipToStep: 0,
    })).container;
    expect(getSpecValue(container, 'Post cap')).toBe('Flat Cap');
  });
});
