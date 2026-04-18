import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import SegmentCard from '../SegmentCard.js';

describe('SegmentCard', () => {
  it('renders segment label with compass + length', () => {
    const s = { index: 0, compassLabel: 'North', lengthFeet: 48, color: '#22C55E', panels: 8 };
    const { getByText } = render(
      <SegmentCard segment={s} rackingTier="standard" epqsClassification="flat" onChange={()=>{}} />
    );
    expect(getByText(/north/i)).toBeTruthy();
    expect(getByText(/48 ft/i)).toBeTruthy();
  });

  it('fires onChange when tier is changed', () => {
    const s = { index: 0, compassLabel: 'North', lengthFeet: 48, color: '#22C55E', panels: 8 };
    const onChange = vi.fn();
    const { container } = render(
      <SegmentCard segment={s} rackingTier="standard" epqsClassification="flat" onChange={onChange} />
    );
    const select = container.querySelector('select');
    fireEvent.change(select, { target: { value: 'rackable' } });
    expect(onChange).toHaveBeenCalledWith(0, 'rackable');
  });
});
