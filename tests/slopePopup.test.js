import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import SlopePopup from '../SlopePopup.js';

describe('SlopePopup', () => {
  it('shows three slope options', () => {
    const { getByText } = render(
      <SlopePopup open={true} onAnswer={()=>{}} onClose={()=>{}} />
    );
    expect(getByText(/mostly flat/i)).toBeTruthy();
    expect(getByText(/some sections slope/i)).toBeTruthy();
    expect(getByText(/very sloped throughout/i)).toBeTruthy();
  });

  it('calls onAnswer with selected option', () => {
    const onAnswer = vi.fn();
    const { getByText } = render(
      <SlopePopup open={true} onAnswer={onAnswer} onClose={()=>{}} />
    );
    fireEvent.click(getByText(/some sections slope/i));
    fireEvent.click(getByText(/continue/i));
    expect(onAnswer).toHaveBeenCalledWith('some');
  });

  it('renders measure-slope infographic', () => {
    const { container } = render(
      <SlopePopup open={true} onAnswer={()=>{}} onClose={()=>{}} />
    );
    expect(container.querySelector('img[src*="measure-slope"]')).toBeTruthy();
  });
});
