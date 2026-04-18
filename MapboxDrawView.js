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

var SEGMENT_COLORS = [
  '#22C55E', // green
  '#3B82F6', // blue
  '#F59E0B', // orange
  '#EC4899', // pink
  '#14B8A6', // teal
  '#A855F7', // purple
];

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

        sides.forEach(function(side, i) {
          var color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
          var sourceId = 'side-' + i;
          map.addSource(sourceId, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [side.start, side.end] } },
          });
          map.addLayer({
            id: sourceId + '-line',
            type: 'line',
            source: sourceId,
            paint: { 'line-color': color, 'line-width': 6, 'line-opacity': 0.7 },
          });
          map.addLayer({
            id: sourceId + '-hit',
            type: 'line',
            source: sourceId,
            paint: { 'line-color': color, 'line-width': 20, 'line-opacity': 0 },  // invisible hit area
          });

          map.on('click', sourceId + '-hit', function() {
            if (props.onSideClicked) props.onSideClicked(side, color);
          });
          map.on('mouseenter', sourceId + '-hit', function() {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', sourceId + '-hit', function() {
            map.getCanvas().style.cursor = '';
          });
        });
      } else {
        if (props.onParcelFallback) props.onParcelFallback();
      }
    });

    return function() {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [props.location.lat, props.location.lng]);

  useEffect(function() {
    if (!mapRef.current) return;
    if (!props.sides || props.sides.length === 0) return;
    props.sides.forEach(function(side, i) {
      var selected = props.selectedSides.find(function(s) { return s.side.index === i; });
      var sourceId = 'side-' + i;
      if (mapRef.current.getLayer && mapRef.current.getLayer(sourceId + '-line')) {
        mapRef.current.setPaintProperty(sourceId + '-line', 'line-width', selected ? 10 : 6);
        mapRef.current.setPaintProperty(sourceId + '-line', 'line-opacity', selected ? 1 : 0.7);
      }
    });
  }, [props.selectedSides, props.sides]);

  useEffect(function() {
    if (!mapRef.current) return;
    if (!props.manualMode) return;
    var map = mapRef.current;
    function handleClick(e) {
      if (props.onManualVertex) props.onManualVertex([e.lngLat.lng, e.lngLat.lat]);
    }
    map.on('click', handleClick);
    return function() {
      if (map && map.off) map.off('click', handleClick);
    };
  }, [props.manualMode]);

  useEffect(function() {
    if (!mapRef.current || !props.manualPoints) return;
    var id = 'manual-line';
    var geoj = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: props.manualPoints },
    };
    if (mapRef.current.getSource && mapRef.current.getSource(id)) {
      var src = mapRef.current.getSource(id);
      if (src && src.setData) src.setData(geoj);
    } else if (mapRef.current.addSource) {
      mapRef.current.addSource(id, { type: 'geojson', data: geoj });
      mapRef.current.addLayer({
        id: id,
        type: 'line',
        source: id,
        paint: { 'line-color': '#00d4d4', 'line-width': 6 },
      });
    }
  }, [props.manualPoints]);

  useEffect(function() {
    if (!mapRef.current) return;
    if (!props.manualPoints) return;
    if (!mapboxgl || !mapboxgl.Marker) return;
    var markers = [];
    props.manualPoints.forEach(function(pt, i) {
      var el = document.createElement('div');
      el.className = 'mbx-vertex-handle';
      el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:white;border:3px solid #00d4d4;cursor:grab;position:relative;';
      // Invisible wider hit target for touch (44x44px)
      var hit = document.createElement('div');
      hit.style.cssText = 'position:absolute;inset:-22px;';
      el.appendChild(hit);

      var marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat(pt)
        .addTo(mapRef.current);
      marker.on('dragend', function() {
        var ll = marker.getLngLat();
        if (props.onVertexMoved) props.onVertexMoved(i, [ll.lng, ll.lat]);
      });
      markers.push(marker);
    });
    return function() { markers.forEach(function(m) { m.remove(); }); };
  }, [props.manualPoints]);

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
  var selectedState = useState([]); // [{ side, color }]
  var selectedSides = selectedState[0];
  var setSelectedSides = selectedState[1];
  var manualPointsState = useState([]);
  var manualPoints = manualPointsState[0];
  var setManualPoints = manualPointsState[1];

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
  function handleSideClicked(side, color) {
    setSelectedSides(function(prev) {
      var exists = prev.find(function(s) { return s.side.index === side.index; });
      if (exists) return prev.filter(function(s) { return s.side.index !== side.index; });
      return prev.concat([{ side: side, color: color }]);
    });
  }
  function handleManualVertex(lngLat) {
    setManualPoints(function(prev) { return prev.concat([lngLat]); });
  }
  function handleVertexMoved(idx, newPt) {
    var snapped = newPt;
    for (var i = 0; i < manualPoints.length; i++) {
      if (i === idx) continue;
      var dist = Math.sqrt(Math.pow(manualPoints[i][0] - newPt[0], 2) + Math.pow(manualPoints[i][1] - newPt[1], 2));
      if (dist < 0.00003) { snapped = manualPoints[i].slice(); break; }
    }
    setManualPoints(function(prev) {
      var next = prev.slice();
      next[idx] = snapped;
      return next;
    });
  }

  return React.createElement('div', { className: 'mbx-container' },
    !location
      ? React.createElement(AddressEntry, { onAddressEntered: handleAddress })
      : React.createElement('div', { className: 'mbx-map-area', style: { flex: 1, display: 'flex', flexDirection: 'column' } },
          React.createElement('button', {
            className: 'mbx-manual-mode-btn',
            onClick: function() { setManualMode(true); },
          }, manualMode ? '\u{1F4D0} Manual Mode' : '\u{1F4D0} Use Manual Mode Instead'),
          React.createElement(MapScreen, {
            location: location,
            onParcelLoaded: handleParcelLoaded,
            onParcelFallback: handleParcelFallback,
            onSideClicked: handleSideClicked,
            sides: sides,
            selectedSides: selectedSides,
            manualMode: manualMode,
            manualPoints: manualPoints,
            onManualVertex: handleManualVertex,
            onVertexMoved: handleVertexMoved,
          })
        )
  );
}

export default MapboxDrawView;
