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
});
