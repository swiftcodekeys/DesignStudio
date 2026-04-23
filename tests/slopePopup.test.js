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

  it('renders overlay and primary footer button with the expected class names', () => {
    const { container } = render(
      <SlopePopup open={true} onAnswer={()=>{}} onClose={()=>{}} />
    );
    // Overlay hook — the z-index rule targets this class name.
    expect(container.querySelector('.mbx-slope-popup-overlay')).toBeTruthy();
    // Card + footer primary button hooks — verify the classNames the CSS depends on.
    expect(container.querySelector('.mbx-slope-popup')).toBeTruthy();
    expect(container.querySelector('.mbx-slope-footer button.primary')).toBeTruthy();
  });

  it('handles open=false then open=true without hook errors', () => {
    const { rerender, queryByText, getByText } = render(
      <SlopePopup open={false} onAnswer={()=>{}} onClose={()=>{}} />
    );
    // When closed, the modal content should not be in the DOM
    expect(queryByText(/mostly flat/i)).toBeNull();
    // Reopen — must NOT throw "Rendered more hooks than during the previous render"
    rerender(<SlopePopup open={true} onAnswer={()=>{}} onClose={()=>{}} />);
    expect(getByText(/mostly flat/i)).toBeTruthy();
  });
});
