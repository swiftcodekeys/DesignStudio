import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock mapbox-gl before importing MapboxDrawView
vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(function () {
      return {
        on: vi.fn(), off: vi.fn(), flyTo: vi.fn(), remove: vi.fn(),
        addSource: vi.fn(), addLayer: vi.fn(), setTerrain: vi.fn(),
      };
    }),
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

  it('initializes Mapbox map with satellite-streets-v12 style', async () => {
    const mapboxgl = await import('mapbox-gl');
    const mockMap = vi.fn(function () {
      return {
        on: vi.fn(), off: vi.fn(), flyTo: vi.fn(), remove: vi.fn(),
        addSource: vi.fn(), addLayer: vi.fn(), setTerrain: vi.fn(),
      };
    });
    mapboxgl.default.Map = mockMap;

    const { rerender } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );

    expect(mockMap).toHaveBeenCalledWith(expect.objectContaining({
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
    }));
  });
});
