// MapboxDrawView.js — Mapbox GL JS satellite draw tool
// Replaces DrawYardView when USE_MAPBOX_DRAW env flag is true.

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './mapbox.css';
import { geocodeAddress } from './mapboxGeocoder';
import { fetchParcel } from './parcelClient';
import { simplifyRDP, splitPolygonIntoSides } from './geometryUtils';

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

    map.on('idle', async function onceLoaded() {
      map.off('idle', onceLoaded);  // one-shot
      if (props.location.lat == null) return;
      var result = await fetchParcel(
        props.location.lat,
        props.location.lng,
        process.env.PARCEL_PROXY_URL
      );
      if (result.ok && result.data && result.data.boundary) {
        var coords = result.data.boundary.coordinates[0];
        var simplified = coords.length > 60 ? simplifyRDP(coords, 0.00001) : coords;
        var sides = splitPolygonIntoSides(simplified);

        map.addSource('parcel', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [simplified] } },
        });
        map.addLayer({
          id: 'parcel-fill',
          type: 'fill',
          source: 'parcel',
          paint: { 'fill-color': '#00d4d4', 'fill-opacity': 0.15 },
        });
        map.addLayer({
          id: 'parcel-outline',
          type: 'line',
          source: 'parcel',
          paint: { 'line-color': '#00d4d4', 'line-width': 2 },
        });

        if (props.onParcelLoaded) props.onParcelLoaded(sides, result.data);
      } else {
        if (props.onParcelFallback) props.onParcelFallback();
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

  var parcelState = useState(null);
  var parcel = parcelState[0];
  var setParcel = parcelState[1];
  var sidesState = useState([]);
  var sides = sidesState[0];
  var setSides = sidesState[1];
  var fallbackState = useState(false);
  var manualMode = fallbackState[0];
  var setManualMode = fallbackState[1];

  function handleAddress(loc) {
    try { localStorage.setItem('gv_bridge_location', JSON.stringify(loc)); } catch (e) {}
    setLocation(loc);
  }

  function handleParcelLoaded(newSides, data) {
    setSides(newSides);
    setParcel(data);
  }
  function handleParcelFallback() {
    setManualMode(true);
  }

  return React.createElement('div', { className: 'mbx-container' },
    !location
      ? React.createElement(AddressEntry, { onAddressEntered: handleAddress })
      : React.createElement(MapScreen, {
          location: location,
          onParcelLoaded: handleParcelLoaded,
          onParcelFallback: handleParcelFallback,
        })
  );
}

export default MapboxDrawView;
