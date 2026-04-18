// MapboxDrawView.js — Mapbox GL JS satellite draw tool
// Replaces DrawYardView when USE_MAPBOX_DRAW env flag is true.

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './mapbox.css';
import { geocodeAddress } from './mapboxGeocoder';

var MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

function AddressEntry(props) {
  var addressState = useState('');
  var address = addressState[0];
  var setAddress = addressState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];
  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  async function submit() {
    if (!address) return;
    setError('');
    setLoading(true);
    try {
      var result = await geocodeAddress(address, MAPBOX_TOKEN);
      if (props.onAddressEntered) props.onAddressEntered(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return React.createElement('div', { className: 'mbx-address-entry' },
    React.createElement('h2', null, 'Enter your address'),
    React.createElement('input', {
      type: 'text',
      placeholder: 'Enter your address (e.g., 123 Main St, Howell MI)',
      value: address,
      onChange: function(e) { setAddress(e.target.value); },
      className: 'mbx-address-input',
      disabled: loading,
    }),
    error ? React.createElement('div', { className: 'mbx-address-error' }, error) : null,
    React.createElement('button', {
      onClick: submit,
      className: 'mbx-address-submit',
      disabled: !address || loading,
    }, loading ? 'Finding...' : 'Find my yard \u2192')
  );
}

function MapScreen(props) {
  var mapContainerRef = useRef(null);
  var mapRef = useRef(null);

  useEffect(function() {
    if (!mapContainerRef.current || mapRef.current) return;

    var map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
      center: [props.location.lng || 0, props.location.lat || 20],
      zoom: props.location.lat ? 18 : 1,
      maxZoom: 22,
      pitch: 0,
      attributionControl: true,
    });

    mapRef.current = map;

    map.on('load', function() {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      if (props.location.lat) {
        var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var duration = prefersReduced ? 0 : 4000;
        map.flyTo({
          center: [props.location.lng, props.location.lat],
          zoom: 20,
          pitch: 0,
          duration: duration,
          essential: true,
        });
      }
    });

    return function() {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [props.location.lat, props.location.lng]);

  return React.createElement('div', {
    ref: mapContainerRef,
    className: 'mbx-map',
    style: { width: '100%', height: '100%' },
  });
}

function MapboxDrawView(props) {
  var locationState = useState(function() {
    if (props.initialLocation) return props.initialLocation;
    try {
      var raw = localStorage.getItem('gv_bridge_location');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  });
  var location = locationState[0];
  var setLocation = locationState[1];

  function handleAddress(loc) {
    try { localStorage.setItem('gv_bridge_location', JSON.stringify(loc)); } catch (e) {}
    setLocation(loc);
  }

  return React.createElement('div', { className: 'mbx-container' },
    !location
      ? React.createElement(AddressEntry, { onAddressEntered: handleAddress })
      : React.createElement(MapScreen, { location: location })
  );
}

export default MapboxDrawView;
