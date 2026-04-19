import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import fs from 'fs';
import path from 'path';
import QuoteStep6_Review from '../QuoteStep6_Review.js';

describe('QuoteStep6_Review display', () => {
  it('wizard.css .wizard-shell .qb-container has min-height:0 so overflow-y:auto fires in flex column', () => {
    var css = fs.readFileSync(path.resolve(__dirname, '../wizard.css'), 'utf8');
    // Locate the .wizard-shell .qb-container block and confirm min-height: 0 is present.
    var match = css.match(/\.wizard-shell\s+\.qb-container\s*\{([^}]+)\}/);
    expect(match).toBeTruthy();
    expect(match[1]).toMatch(/min-height\s*:\s*0/);
  });

  it('shows End Posts count from data.ends', () => {
    const data = {
      grade: 'residential',
      style: 'uaf_200',
      height: 48,
      color: 'textured-black',
      linearFeet: 150,
      ends: 2,
      corners: 0,
      gates: [],
    };
    render(
      React.createElement(QuoteStep6_Review, {
        data: data,
        update: function () {},
        onEditStep: function () {},
        zoneName: 'Test',
      })
    );
    // Find the "End Posts" label, then read its sibling value cell.
    var label = screen.getByText(/^End Posts$/i);
    var value = label.parentElement.querySelector('.qb-review-value');
    expect(value).toBeTruthy();
    expect(value.textContent).toBe('2');
  });
});
