// MapboxDrawView.js — Mapbox GL JS satellite draw tool
// Replaces DrawYardView when USE_MAPBOX_DRAW env flag is true.

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './mapbox.css';
import { geocodeAddress } from './mapboxGeocoder';
import { fetchParcel } from './parcelClient';
import { simplifyRDP, splitPolygonIntoSides, densifyPath, computeSampleStepCount, compassBearing, aggregateClassificationsForUserSegments, computeSlopedPostCount } from './geometryUtils';
import { classifyDrawnLine } from './epqsClient';
import SegmentCard from './SegmentCard';

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

// Pure helper: compute the display label for an EPQS elevation badge.
// Precedence: confidence-low > flat-threshold > numeric default.
// Exported for unit-testing without DOM or React mounting.
export function epqsBadgeLabel({ maxAbsDelta, signedDelta, confidence }) {
  if (confidence === 'low') return '\u2014 unknown \u2014';
  if (maxAbsDelta < 0.5) return 'Flat \u2713';
  var arrow = signedDelta >= 0 ? '\u2197' : '\u2198';
  return arrow + ' ' + maxAbsDelta.toFixed(1) + '"';
}

function distanceBetween(a, b) {
  // Haversine in feet
  var R = 20902231;
  var dLat = (b[1]-a[1]) * Math.PI/180;
  var dLng = (b[0]-a[0]) * Math.PI/180;
  var lat1 = a[1] * Math.PI/180;
  var lat2 = b[1] * Math.PI/180;
  var x = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

function buildSegmentsFromSides(selected) {
  return selected.map(function(ss, i) {
    var lengthFt = distanceBetween(ss.side.start, ss.side.end);
    return {
      index: i,
      mapLayerIdx: ss.side.index,
      lengthFeet: lengthFt,
      color: ss.color,
      compassLabel: ss.side.compassLabel,
      panels: Math.ceil(lengthFt / 6),
      start: ss.side.start,
      end: ss.side.end,
    };
  });
}

function buildSegmentsFromManual(points) {
  var segs = [];
  for (var i = 0; i < points.length - 1; i++) {
    var color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    var lengthFt = distanceBetween(points[i], points[i+1]);
    segs.push({
      index: i, mapLayerIdx: null, lengthFeet: lengthFt, color: color,
      compassLabel: compassBearing(points[i], points[i+1]),
      panels: Math.ceil(lengthFt / 6),
      start: points[i], end: points[i+1],
    });
  }
  return segs;
}

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
  var drawModeRef = useRef(props.drawMode);
  drawModeRef.current = props.drawMode;

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
      attributionControl: false,
    });

    // Compact attribution collapses into a small "i" badge — less visual noise
    // while remaining visible and legible (satisfies Mapbox ToS).
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));

    mapRef.current = map;
    if (props.mapInstanceRef) props.mapInstanceRef.current = map;

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
            if (drawModeRef.current !== 'draw') return;
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
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        if (props.mapInstanceRef) props.mapInstanceRef.current = null;
      }
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
      if (props.drawMode !== 'draw') return;
      if (props.onManualVertex) props.onManualVertex([e.lngLat.lng, e.lngLat.lat]);
    }
    map.on('click', handleClick);
    return function() {
      if (map && map.off) map.off('click', handleClick);
    };
  }, [props.manualMode, props.drawMode]);

  useEffect(function() {
    if (!mapRef.current || !props.manualPoints) return;
    var id = 'manual-line';
    var geoj = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: props.manualPoints },
    };
    function applySource() {
      if (!mapRef.current) return;
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
    }
    if (mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) {
      applySource();
    } else {
      mapRef.current.once('style.load', applySource);
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
      // Do NOT set position here — Mapbox adds .mapboxgl-marker { position: absolute }
      // directly to this element. Inline position:relative would override that class rule
      // (inline > class specificity), keeping the dot in normal document flow and causing
      // the visible marker to appear offset from the click coordinate.
      el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:white;border:3px solid #00d4d4;cursor:grab;';
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

  useEffect(function() {
    if (!mapRef.current || !props.epqs || !props.epqs.segmentClassifications) return;

    // Build user-drawn segments: each entry is { start: [lng,lat], end: [lng,lat] }
    var userSegments = [];
    if (props.manualMode) {
      for (var mi = 0; mi < props.manualPoints.length - 1; mi++) {
        userSegments.push({ start: props.manualPoints[mi], end: props.manualPoints[mi+1] });
      }
    } else {
      props.selectedSides.forEach(function(ss) {
        userSegments.push({ start: ss.side.start, end: ss.side.end });
      });
    }
    if (userSegments.length === 0) return;

    var aggregated = aggregateClassificationsForUserSegments(
      userSegments, props.epqs.segmentClassifications, 6
    );
    var badges = [];

    userSegments.forEach(function(seg, segIdx) {
      var agg = aggregated[segIdx];
      var confidence = props.epqs && props.epqs.confidence;
      var label = epqsBadgeLabel({
        maxAbsDelta: agg.maxAbsDelta,
        signedDelta: agg.signedDelta,
        confidence: confidence,
      });

      var color = {
        flat: '#22C55E', sloped: '#F59E0B', steep: '#EF4444',
        steps: '#6366F1', unknown: '#9CA3AF',
      }[agg.classification] || '#9CA3AF';

      var midLng = (seg.start[0] + seg.end[0]) / 2;
      var midLat = (seg.start[1] + seg.end[1]) / 2;

      var el = document.createElement('div');
      el.className = 'mbx-elev-badge';
      el.style.cssText = 'background:'+color+';color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);pointer-events:none;';
      el.textContent = label;

      var marker = new mapboxgl.Marker({ element: el })
        .setLngLat([midLng, midLat])
        .addTo(mapRef.current);
      badges.push(marker);
    });

    return function() { badges.forEach(function(b) { b.remove(); }); };
  }, [props.epqs, props.selectedSides, props.manualPoints, props.manualMode]);

  // TODO: coordinate with selected-side paint useEffect to avoid flicker
  useEffect(function() {
    if (!mapRef.current) return;
    if (!props.segments) return;
    props.segments.forEach(function(s) {
      if (s.mapLayerIdx == null) return;
      var layerId = 'side-' + s.mapLayerIdx + '-line';
      if (mapRef.current.getLayer && mapRef.current.getLayer(layerId)) {
        mapRef.current.setPaintProperty(layerId, 'line-width',
          props.highlightedIdx === s.index ? 14 : 10);
      }
    });
  }, [props.highlightedIdx, props.segments]);

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
  var epqsState = useState(null);
  var epqs = epqsState[0];
  var setEpqs = epqsState[1];
  var epqsLoadingState = useState(false);
  var epqsLoading = epqsLoadingState[0];
  var setEpqsLoading = epqsLoadingState[1];

  var slopeAnswerState = useState(null); // 'flat' | 'some' | 'all' | null
  var slopeAnswer = slopeAnswerState[0];
  var setSlopeAnswer = slopeAnswerState[1];
  var segmentsState = useState([]);
  var segments = segmentsState[0];
  var setSegments = segmentsState[1];
  var highlightedIdxState = useState(null);
  var highlightedIdx = highlightedIdxState[0];
  var setHighlightedIdx = highlightedIdxState[1];

  var drawModeState = useState('navigate'); // 'navigate' | 'draw'
  var drawMode = drawModeState[0];
  var setDrawMode = drawModeState[1];

  var sidebarOpenState = useState(function() {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  var sidebarOpen = sidebarOpenState[0];
  var setSidebarOpen = sidebarOpenState[1];

  var bannerShownState = useState(false);
  var bannerShown = bannerShownState[0];
  var setBannerShown = bannerShownState[1];

  // Show CYA banner on first draw action (first side selected or first manual vertex added),
  // but only if the user hasn't already dismissed it this session.
  useEffect(function() {
    if (sessionStorage.getItem('gv_draw_banner_shown')) return;
    if (selectedSides.length > 0 || manualPoints.length > 0) {
      setBannerShown(true);
    }
  }, [selectedSides.length, manualPoints.length]);

  var mapInstanceRef = useRef(null);

  // Auto-exit draw mode after 3s idle (resets when user adds a vertex or clicks a side)
  useEffect(function() {
    if (drawMode !== 'draw') return;
    var timer = setTimeout(function() { setDrawMode('navigate'); }, 3000);
    return function() { clearTimeout(timer); };
  }, [drawMode, selectedSides, manualPoints]);

  useEffect(function() {
    var cancelled = false;

    // Build flat array of all points on the drawn line
    var pts = [];
    if (manualMode) pts = manualPoints.slice();
    else selectedSides.forEach(function(ss) {
      pts.push(ss.side.start);
      pts.push(ss.side.end);
    });
    if (pts.length < 2) { setEpqs(null); return; }

    // Sample every ~6 ft along the line
    var samplePts = densifyPath(pts, 6);
    setEpqsLoading(true);
    classifyDrawnLine(samplePts, 6).then(function(result) {
      if (cancelled) return;
      setEpqs(result);
      setEpqsLoading(false);
    }).catch(function() {
      if (cancelled) return;
      setEpqsLoading(false);
    });

    return function() { cancelled = true; };
  }, [selectedSides, manualPoints, manualMode]);

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

  function buildDrawToolData() {
    // Emit RAW total feet (sum of drawn segment lengths). The 5% material pad
    // is applied at the pricing boundary (priceCalculator.js, gated on
    // _source === 'auto'). Applying it here too would double-pad (compounds
    // to ~10.25%). Single source of truth for the pad = pricing.
    var totalFeet = segments.reduce(function(a, s) { return a + s.lengthFeet; }, 0);
    // Panel length for sloped-post counting defaults to 6ft (residential/commercial).
    // Industrial's 8ft panel length is applied later in priceCalculator based on grade,
    // which customers pick after the draw step. Using 6 here is a safe over-estimate
    // for post count; priceCalculator's tier gate still applies.
    var slopedPostCount = computeSlopedPostCount(segments, 6);
    return {
      totalFeet: totalFeet,
      corners: segments.length - 1 + (manualMode ? 0 : 0),
      ends: 2,
      lines: [{
        id: 'line-0',
        color: '#00d4d4',
        points: manualMode ? manualPoints.slice() : segments.flatMap(function(s) { return [s.start, s.end]; }),
        segments: segments.slice(),
      }],
      slopeAnswer: slopeAnswer,
      slopedPostCount: slopedPostCount,
      epqsOverall: epqs ? epqs.overallClassification : 'unknown',
      epqsConfidence: epqs ? epqs.confidence : 'low',
      epqsMaxDeltaInches: epqs ? epqs.maxDeltaInches : 0,
      mapboxSnapshotUrl: null, // filled by snapshot step
      source: 'auto',
      parcel: parcel,
    };
  }

  function captureSnapshot() {
    return new Promise(function(resolve) {
      if (!mapInstanceRef.current) { resolve(null); return; }
      mapInstanceRef.current.once('render', function() {
        resolve(mapInstanceRef.current.getCanvas().toDataURL('image/png'));
      });
      mapInstanceRef.current.triggerRepaint();
    });
  }

  function handleSlopeAnswer(answer) {
    setSlopeAnswer(answer);

    var src = manualMode
      ? buildSegmentsFromManual(manualPoints)
      : buildSegmentsFromSides(selectedSides);

    // Aggregate per-sample classifications back to per-user-segment summaries.
    var aggregated = (epqs && epqs.segmentClassifications)
      ? aggregateClassificationsForUserSegments(
          src.map(function(s) { return { start: s.start, end: s.end }; }),
          epqs.segmentClassifications,
          6
        )
      : null;

    var segs = src.map(function(s, i) {
      var epqsClass = aggregated && aggregated[i] ? aggregated[i].classification : 'unknown';
      var tier;
      if (answer === 'flat') tier = 'standard';
      else if (answer === 'all') tier = epqsClass === 'steep' || epqsClass === 'steps' ? 'heavy-rackable' : 'rackable';
      else {
        if (epqsClass === 'flat') tier = 'standard';
        else if (epqsClass === 'sloped') tier = 'rackable';
        else if (epqsClass === 'steep' || epqsClass === 'steps') tier = 'heavy-rackable';
        else tier = 'standard';
      }
      return Object.assign({}, s, { rackingTier: tier, epqsClassification: epqsClass });
    });
    setSegments(segs);
  }

  return React.createElement('div', { className: 'mbx-container' },
    !location
      ? React.createElement(AddressEntry, { onAddressEntered: handleAddress })
      : React.createElement(React.Fragment, null,
          bannerShown && React.createElement('div', { className: 'mbx-cya-banner' },
            'You\u2019ll mark your fence line on this map. ',
            React.createElement('strong', null,
              'It\u2019s your responsibility to double-check the math and validate your measurements yourself '),
            '\u2014 we\u2019ll verify with you before production, but the measurements you enter are what we build to.',
            React.createElement('button', {
              onClick: function() {
                sessionStorage.setItem('gv_draw_banner_shown', '1');
                setBannerShown(false);
              },
            }, 'Got it')
          ),
          React.createElement('div', { className: 'mbx-map-area', style: { flex: 1, display: 'flex', flexDirection: 'column' } },
            React.createElement('div', { className: 'mbx-bottom-toolbar' },
              React.createElement('button', {
                className: 'mbx-toolbar-btn mbx-manual-mode-btn',
                onClick: function() { setManualMode(true); },
              }, manualMode ? '\u{1F4D0} Manual Mode' : '\u{1F4D0} Use Manual Mode Instead'),
              React.createElement('button', {
                className: 'mbx-toolbar-btn mbx-done-btn',
                onClick: function() { handleSlopeAnswer('some'); },
                disabled: (selectedSides.length === 0 && manualPoints.length < 2) || epqsLoading,
              }, 'Done \u2014 review segments \u2192'),
              React.createElement('button', {
                className: 'mbx-toolbar-btn mbx-continue-btn primary',
                onClick: function() {
                  var data = buildDrawToolData();
                  captureSnapshot().then(function(url) {
                    data.mapboxSnapshotUrl = url;
                    props.onComplete(data);
                  });
                },
                disabled: segments.length === 0,
              }, 'Continue to Quote \u2192'),
              React.createElement('button', {
                className: 'mbx-toolbar-btn mbx-mode-toggle ' + drawMode,
                onClick: function() { setDrawMode(drawMode === 'navigate' ? 'draw' : 'navigate'); },
              }, drawMode === 'navigate' ? '\u270B Navigate \u2192 tap to Draw' : '\u270F\uFE0F Draw \u2192 tap to Navigate'),
              epqsLoading ? React.createElement('span', {
                className: 'mbx-epqs-loading',
              }, 'Analyzing slope...') : null
            ),
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
              epqs: epqs,
              segments: segments,
              highlightedIdx: highlightedIdx,
              mapInstanceRef: mapInstanceRef,
              drawMode: drawMode,
            })
          ),
          segments.length > 0 ?
            React.createElement('div', {
              className: 'mbx-sidebar ' + (sidebarOpen ? 'open' : ''),
              onClick: function(e) {
                // Toggle only when tapping the header region (h3) — not the body controls.
                if (e.target && e.target.tagName === 'H3') {
                  setSidebarOpen(function(prev) { return !prev; });
                }
              },
            },
              React.createElement('h3', { style: { cursor: 'pointer' } }, 'Your fence segments'),
              React.createElement('p', null, 'We auto-detected slope from elevation data. Each segment\u2019s tier is pre-filled \u2014 override any that look wrong.'),
              segments.map(function(s) {
                return React.createElement(SegmentCard, {
                  key: s.index,
                  segment: s,
                  rackingTier: s.rackingTier,
                  epqsClassification: s.epqsClassification,
                  highlighted: highlightedIdx === s.index,
                  onHover: setHighlightedIdx,
                  onChange: function(idx, tier) {
                    setSegments(function(prev) {
                      return prev.map(function(x) {
                        return x.index === idx ? Object.assign({}, x, { rackingTier: tier, customerOverrode: true }) : x;
                      });
                    });
                  },
                });
              })
            ) : null
        )
  );
}

export { MapScreen };
export default MapboxDrawView;
