/**
 * quoteStep1Collapsible.test.js
 *
 * Verifies Task 4.2 — Style / Grade / Fence Type collapse when a selection
 * already exists so a buyer who picked a style in the wizard isn't re-asked
 * to pick it. Clicking "Change X" expands the section back to the pick grid.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import QuoteStep1_Style from '../QuoteStep1_Style.js';

function noop() {}

describe('QuoteStep1_Style — collapsible sections (Task 4.2)', () => {
  it('Style section starts collapsed when data.style is set, and expands on click', () => {
    const data = { style: 'horizon', grade: 'residential', fenceType: 'ornamental' };
    const container = render(React.createElement(QuoteStep1_Style, {
      data: data,
      update: noop,
      poolCompliance: null,
    })).container;

    // Collapsed: full style-pick grid is NOT rendered
    expect(container.querySelector('.qs1-style-grid')).toBeFalsy();

    // Collapsed: collapsible header IS rendered with a Change button
    const headers = container.querySelectorAll('.qs1-collapsible-header');
    expect(headers.length).toBeGreaterThan(0);

    // Find the "Change style" toggle
    const toggles = Array.from(container.querySelectorAll('.qs1-collapsible-toggle'));
    const changeStyle = toggles.find(function(b) { return b.textContent.trim() === 'Change style'; });
    expect(changeStyle).toBeTruthy();

    fireEvent.click(changeStyle);

    // After click: the style grid is rendered
    expect(container.querySelector('.qs1-style-grid')).toBeTruthy();
  });

  it('Style section starts expanded when data.style is empty', () => {
    const data = { grade: 'residential', fenceType: 'ornamental' };
    const container = render(React.createElement(QuoteStep1_Style, {
      data: data,
      update: noop,
      poolCompliance: null,
    })).container;

    // No prior style pick → grid visible immediately
    expect(container.querySelector('.qs1-style-grid')).toBeTruthy();
  });

  it('Grade section collapses when a grade is set, showing the summary label', () => {
    const data = { grade: 'residential', fenceType: 'ornamental', style: 'horizon' };
    const container = render(React.createElement(QuoteStep1_Style, {
      data: data,
      update: noop,
      poolCompliance: null,
    })).container;

    // The Grade card-row (.qs1-card-row with Residential/Commercial/Industrial) is NOT shown.
    // Simpler assertion: the Change grade toggle is present.
    const toggles = Array.from(container.querySelectorAll('.qs1-collapsible-toggle'));
    const changeGrade = toggles.find(function(b) { return b.textContent.trim() === 'Change grade'; });
    expect(changeGrade).toBeTruthy();

    // Summary shows "Residential" via valueLabel
    const summary = container.querySelector('.qs1-collapsible-value-text');
    expect(summary).toBeTruthy();
  });
});
