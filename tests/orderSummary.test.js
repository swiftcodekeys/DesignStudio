import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import OrderSummary from '../OrderSummary.js';

describe('OrderSummary', () => {
  it('renders satellite thumbnail when mapboxSnapshotUrl provided', () => {
    var quote = {
      mapboxSnapshotUrl: 'data:image/png;base64,aaa',
      zoneName: 'Back yard',
      config: { style: 'uaf_200', height: 48, color: 'textured-black' },
      items: [{ label: 'Panels', qty: 17, total: 1700 }],
      subtotal: 1700,
      shippingCents: 8000,
      totalCents: 178000,
    };
    var result = render(React.createElement(OrderSummary, { quote: quote }));
    var img = result.getByAltText(/satellite/i);
    expect(img).toBeTruthy();
    expect(img.src).toContain('data:image/png');
  });

  it('renders zone name, total, and shipping', () => {
    var quote = {
      mapboxSnapshotUrl: null,
      zoneName: 'Back yard',
      config: { style: 'uaf_200', height: 48, color: 'textured-black' },
      items: [{ label: 'Panels', qty: 17, total: 1700 }],
      subtotal: 1700,
      shippingCents: 8000,
      totalCents: 178000,
    };
    var result = render(React.createElement(OrderSummary, { quote: quote }));
    expect(result.getByText(/back yard/i)).toBeTruthy();
    expect(result.getByText('$1,780.00')).toBeTruthy();
    expect(result.getByText('$80.00')).toBeTruthy();
  });

  it('renders line items', () => {
    var quote = {
      mapboxSnapshotUrl: null,
      zoneName: 'Front',
      config: { style: 'uaf_200', height: 48, color: 'textured-black' },
      items: [
        { label: 'Panels', qty: 10, total: 1000 },
        { label: 'Posts', qty: 11, total: 550 },
      ],
      subtotal: 1550,
      shippingCents: 8000,
      totalCents: 163000,
    };
    var result = render(React.createElement(OrderSummary, { quote: quote }));
    expect(result.getByText('Panels')).toBeTruthy();
    expect(result.getByText('Posts')).toBeTruthy();
  });

  it('omits satellite image when mapboxSnapshotUrl is null', () => {
    var quote = {
      mapboxSnapshotUrl: null,
      zoneName: 'Front',
      config: { style: 'uaf_200', height: 48, color: 'textured-black' },
      items: [],
      subtotal: 0,
      shippingCents: 0,
      totalCents: 0,
    };
    var result = render(React.createElement(OrderSummary, { quote: quote }));
    expect(result.queryByAltText(/satellite/i)).toBeNull();
  });
});
