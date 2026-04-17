import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock mapbox-gl before importing MapboxDrawView
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(), off: vi.fn(), flyTo: vi.fn(), remove: vi.fn(),
      addSource: vi.fn(), addLayer: vi.fn(), setTerrain: vi.fn(),
    })),
    accessToken: '',
  },
}));

import MapboxDrawView from '../MapboxDrawView.js';

describe('MapboxDrawView', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(container.querySelector('.mbx-container')).toBeTruthy();
  });

  it('renders an address entry screen when no location provided', () => {
    const { getByPlaceholderText } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={null} />
    );
    expect(getByPlaceholderText(/enter your address/i)).toBeTruthy();
  });
});
