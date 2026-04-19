// MapboxDrawView.js — "Draw Your Yard" with pen-tool + morphing dock.
// Redesigned per Claude-Handoff-Prompt.md: four-phase dock (empty / drawing /
// ready / expanded), pen-tool interaction (click, drag, right-click delete,
// hover ghost, ⌘Z undo), parcel overlay with pulsing orange while empty,
// signed-note reassurance, real pricing via estimatePerFootRange.

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './mapbox.css';
import {
  Check, Pencil, MapPin, FloppyDisk, ArrowCounterClockwise,
  X, CaretDown, CaretUp, ArrowRight,
} from '@phosphor-icons/react';
import { geocodeAddress, suggestAddresses } from './mapboxGeocoder';
import { fetchParcel } from './parcelClient';
import { computeSlopedPostCount, compassBearing } from './geometryUtils';
import { estimatePerFootRange } from './retailPricing';
import { emailDrawSaveLink, checkForDrawResume } from './quoteSaver';

// OS-aware modifier key display. Mac shows ⌘, everyone else shows Ctrl.
// The keyboard handler itself listens for both metaKey and ctrlKey so the
// shortcut works regardless of platform — this is purely the label shown
// in the keyboard-hints strip and the undo button's tooltip.
function detectModKey() {
  if (typeof navigator === 'undefined') return 'Ctrl';
  var src = (navigator.platform || navigator.userAgent || '').toString();
  return /Mac|iPhone|iPad|iPod/i.test(src) ? '\u2318' : 'Ctrl';
}
var MOD_KEY = detectModKey();

var MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

// Haven Classic 60" residential is the default range baseline.
// Per user preference — the handoff doc suggested 72, user overrode to 60 as
// the most common residential height. Actual style/height selection happens
// in the next step (QuoteBuilder).
var DEFAULT_ESTIMATE_INPUTS = {
  style: 'haven',
  height: 60,
  grade: 'residential',
  spacing: 'standard',
};

var MIN_DRAW_FT = 30;
var AUTOSAVE_KEY = 'gv_draw_state';
var AUTOSAVE_DEBOUNCE_MS = 2000;
var EARTH_INTRO_ENABLED = process.env.EARTH_INTRO_ENABLED !== false && process.env.EARTH_INTRO_ENABLED !== 'false';
var EARTH_INTRO_COOKIE = 'dy_seen';
var EARTH_INTRO_DURATION_MS = 2400;

function hasSeenEarthIntro() {
  try {
    return document.cookie.split('; ').some(function(c) { return c.indexOf(EARTH_INTRO_COOKIE + '=') === 0; });
  } catch (e) { return false; }
}

function markEarthIntroSeen() {
  try {
    var oneYear = 60 * 60 * 24 * 365;
    document.cookie = EARTH_INTRO_COOKIE + '=1; path=/; max-age=' + oneYear + '; SameSite=Lax';
  } catch (e) {}
}

// ---------- Distance helpers ----------
function distanceBetween(a, b) {
  // Haversine in feet
  var R = 20902231;
  var dLat = (b[1] - a[1]) * Math.PI / 180;
  var dLng = (b[0] - a[0]) * Math.PI / 180;
  var lat1 = a[1] * Math.PI / 180;
  var lat2 = b[1] * Math.PI / 180;
  var x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function totalFeet(pts) {
  var t = 0;
  for (var i = 0; i < pts.length - 1; i++) t += distanceBetween(pts[i], pts[i + 1]);
  return t;
}

// ---------- Pure helpers (exported for tests) ----------
// Kept for backward compatibility with tests/epqsBadgeLabel.test.js even though
// the draw screen no longer shows the elevation badge inline (slope tier is
// chosen in the wizard's next step).
export function epqsBadgeLabel(args) {
  var maxAbsDelta = args.maxAbsDelta;
  var signedDelta = args.signedDelta;
  var confidence = args.confidence;
  if (confidence === 'low') return 'Unknown';
  if (maxAbsDelta < 0.5) return 'Flat \u2713';
  var arrow = signedDelta >= 0 ? '\u2197' : '\u2198';
  return arrow + ' ' + maxAbsDelta.toFixed(1) + '"';
}

// ---------- Intro overlay (first visit — flies from globe to rooftop) ----------
// MapScreen is already mounted behind this overlay with cinematic=true,
// which starts the Mapbox globe at zoom 1 and flyTo()'s to the user's
// address at zoom 20 over 2.4s. This overlay is just the "Finding your
// home..." copy + vignette on top of that real satellite motion — no
// video, no CSS-faked globe. When the camera arrives, the whole overlay
// fades out and the user can start drawing. Gated by the dy_seen cookie
// and EARTH_INTRO_ENABLED build flag.
function IntroOverlay(props) {
  var visibleState = useState(true);
  var visible = visibleState[0];
  var setVisible = visibleState[1];

  useEffect(function() {
    var fade = setTimeout(function() {
      setVisible(false);
    }, EARTH_INTRO_DURATION_MS - 400); // start fade ~400ms before end
    var done = setTimeout(function() {
      markEarthIntroSeen();
      if (props.onComplete) props.onComplete();
    }, EARTH_INTRO_DURATION_MS);
    return function() { clearTimeout(fade); clearTimeout(done); };
  }, []);

  function skip() {
    markEarthIntroSeen();
    setVisible(false);
    if (props.onComplete) props.onComplete();
  }

  var addrLine = props.location && props.location.address ? props.location.address : '';

  return React.createElement('div', {
    className: 'dy-intro-overlay' + (visible ? '' : ' dy-intro-overlay-hidden'),
    onClick: skip,
  },
    React.createElement('div', { className: 'dy-intro-copy' },
      React.createElement('div', { className: 'dy-intro-finding' }, 'Finding your home\u2026'),
      addrLine && React.createElement('div', { className: 'dy-intro-address' }, addrLine)
    ),
    React.createElement('button', {
      className: 'dy-intro-skip',
      onClick: function(e) { e.stopPropagation(); skip(); },
      type: 'button',
    },
      React.createElement('span', null, 'Skip'),
      React.createElement(ArrowRight, { size: 14, weight: 'bold' })
    )
  );
}

// ---------- AddressEntry (cold start, no localStorage location) ----------
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
  var suggestionsState = useState([]);
  var suggestions = suggestionsState[0];
  var setSuggestions = suggestionsState[1];
  var debounceRef = useRef(null);

  function onInput(val) {
    setAddress(val);
    setError('');
    if (!val || val.length < 3 || !MAPBOX_TOKEN) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function() {
      suggestAddresses(val, MAPBOX_TOKEN).then(function(results) {
        setSuggestions(results);
      }).catch(function() { setSuggestions([]); });
    }, 250);
  }

  function pick(s) {
    setAddress(s.placeName);
    setSuggestions([]);
    if (props.onAddressEntered) props.onAddressEntered({
      address: s.placeName, lat: s.lat, lng: s.lng,
    });
  }

  async function submit() {
    if (!address) return;
    setError('');
    setLoading(true);
    setSuggestions([]);
    try {
      var result = await geocodeAddress(address, MAPBOX_TOKEN);
      if (props.onAddressEntered) props.onAddressEntered({
        address: result.placeName, lat: result.lat, lng: result.lng,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return React.createElement('div', { className: 'dy-address-entry' },
    React.createElement('h2', null, 'Where are we fencing?'),
    React.createElement('p', { className: 'dy-address-hint' }, 'Enter your property address so I can pull satellite imagery.'),
    React.createElement('div', { className: 'dy-address-wrap' },
      React.createElement('input', {
        type: 'text',
        placeholder: '123 Main St, Howell MI',
        value: address,
        onChange: function(e) { onInput(e.target.value); },
        className: 'dy-address-input',
        disabled: loading,
        autoComplete: 'off',
        onKeyDown: function(e) { if (e.key === 'Enter') submit(); },
      }),
      suggestions.length > 0 && React.createElement('div', { className: 'dy-address-suggestions' },
        suggestions.map(function(s) {
          return React.createElement('button', {
            key: s.id,
            type: 'button',
            className: 'dy-address-suggestion',
            onClick: function() { pick(s); },
          }, s.placeName);
        })
      )
    ),
    error ? React.createElement('div', { className: 'dy-address-error' }, error) : null,
    React.createElement('button', {
      onClick: submit,
      className: 'dy-address-submit',
      disabled: !address || loading,
    }, loading ? 'Finding\u2026' : 'Find my yard \u2192')
  );
}

// ---------- Top-bar address pill (compact, with autocomplete) ----------
function AddressPill(props) {
  var openState = useState(false);
  var open = openState[0];
  var setOpen = openState[1];
  var inputState = useState('');
  var input = inputState[0];
  var setInput = inputState[1];
  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];
  var suggestionsState = useState([]);
  var suggestions = suggestionsState[0];
  var setSuggestions = suggestionsState[1];
  var debounceRef = useRef(null);

  function onInput(val) {
    setInput(val);
    setError('');
    if (!val || val.length < 3 || !MAPBOX_TOKEN) { setSuggestions([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(function() {
      suggestAddresses(val, MAPBOX_TOKEN).then(function(results) {
        setSuggestions(results);
      }).catch(function() { setSuggestions([]); });
    }, 250);
  }

  function pick(s) {
    setSuggestions([]);
    setOpen(false);
    setInput('');
    props.onChangeAddress({ address: s.placeName, lat: s.lat, lng: s.lng });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setSuggestions([]);
    geocodeAddress(input, MAPBOX_TOKEN).then(function(res) {
      setLoading(false);
      setOpen(false);
      setInput('');
      props.onChangeAddress({ address: res.placeName, lat: res.lat, lng: res.lng });
    }).catch(function() {
      setLoading(false);
      setError('Could not find that address.');
    });
  }

  var shortAddr = props.location && props.location.address
    ? props.location.address.split(',')[0]
    : 'Enter address';

  return React.createElement('div', { className: 'dy-pill-wrap' },
    React.createElement('button', {
      className: 'dy-pill',
      onClick: function() { setOpen(!open); },
      type: 'button',
    },
      React.createElement(MapPin, { size: 14, weight: 'fill', className: 'dy-pill-pin' }),
      React.createElement('span', { className: 'dy-pill-addr' }, shortAddr),
      React.createElement(CaretDown, { size: 12, weight: 'bold', className: 'dy-pill-caret' })
    ),
    open && React.createElement('div', { className: 'dy-pill-dropdown' },
      React.createElement('form', { onSubmit: onSubmit },
        React.createElement('input', {
          type: 'text',
          placeholder: 'New address',
          value: input,
          onChange: function(e) { onInput(e.target.value); },
          autoFocus: true,
          autoComplete: 'off',
          className: 'dy-pill-input',
        }),
        suggestions.length > 0 && React.createElement('div', { className: 'dy-pill-suggestions' },
          suggestions.map(function(s) {
            return React.createElement('button', {
              key: s.id,
              type: 'button',
              className: 'dy-pill-suggestion',
              onClick: function() { pick(s); },
            }, s.placeName);
          })
        ),
        React.createElement('div', { className: 'dy-pill-actions' },
          React.createElement('button', {
            type: 'button',
            onClick: function() { setOpen(false); },
            className: 'dy-pill-btn dy-pill-btn-ghost',
          }, 'Cancel'),
          React.createElement('button', {
            type: 'submit',
            disabled: loading || !input.trim(),
            className: 'dy-pill-btn dy-pill-btn-primary',
          }, loading ? 'Searching\u2026' : 'Update')
        )
      ),
      error && React.createElement('div', { className: 'dy-pill-error' }, error)
    )
  );
}

// ---------- Empty-state hero overlay ----------
function EmptyStateOverlay() {
  return React.createElement('div', { className: 'dy-empty-overlay' },
    React.createElement('div', { className: 'dy-empty-badge' },
      React.createElement('span', { className: 'dy-empty-dot' }),
      ' Your property'
    ),
    React.createElement('h1', { className: 'dy-empty-title' }, 'Sketch your fence line'),
    React.createElement('p', { className: 'dy-empty-sub' },
      'Click to drop corners. Drag to adjust. Every measurement is verified on a free call before anything gets cut.'
    )
  );
}

// ---------- Estimate banner (compact, tappable → popup) ----------
// A small persistent pill at the top-center that says "This is an estimate".
// Clicking opens the EstimatePopup with the full explanation + an Acknowledge
// action. Replaces the old named signed-note; no personal names referenced.
function EstimateBanner(props) {
  return React.createElement('button', {
    className: 'dy-est-banner',
    onClick: props.onOpen,
    type: 'button',
    'aria-haspopup': 'dialog',
  },
    React.createElement('span', { className: 'dy-est-banner-dot' }),
    React.createElement('span', null, 'This is an estimate'),
    React.createElement(CaretDown, { size: 12, weight: 'bold' })
  );
}

function EstimatePopup(props) {
  return React.createElement('div', {
    className: 'dy-est-overlay',
    onClick: function(e) { if (e.target === e.currentTarget) props.onClose(); },
    role: 'dialog',
    'aria-modal': 'true',
  },
    React.createElement('div', { className: 'dy-est-dialog' },
      React.createElement('button', {
        type: 'button',
        className: 'dy-est-close',
        onClick: props.onClose,
        'aria-label': 'Close',
      }, React.createElement(X, { size: 18, weight: 'bold' })),
      React.createElement('h3', null, 'About this estimate'),
      React.createElement('p', null,
        'The linear footage and price range on this screen come from the line you\u2019ve drawn on the satellite image. They\u2019re a solid starting point, but they\u2019re not a firm quote.'
      ),
      React.createElement('p', null,
        React.createElement('strong', null, 'It\u2019s your responsibility to double-check the math '),
        'and validate the measurements yourself. Grandview reviews every order before production and catches obvious red flags, but the linear feet you submit are what we build to.'
      ),
      React.createElement('p', { className: 'dy-est-muted' },
        'Satellite imagery can be a year or two old and tree canopy can hide features, so always walk the line once yourself before you order. Questions? Call (855) FENCE-30.'
      ),
      React.createElement('div', { className: 'dy-est-actions' },
        React.createElement('button', {
          type: 'button',
          className: 'dy-est-btn',
          onClick: props.onClose,
        }, 'Got it')
      )
    )
  );
}

// ---------- Morphing bottom dock ----------
function MorphingDock(props) {
  var phase = props.phase;
  var totalFt = props.totalFt;
  var corners = props.corners;
  var priceRange = props.priceRange;
  var segments = props.segments;
  var isEmpty = phase === 'empty';
  var isReady = phase === 'ready';
  var isExpanded = phase === 'expanded';
  var canContinue = isReady || isExpanded;

  function formatMoney(n) {
    return '$' + Math.round(n).toLocaleString();
  }

  var statsRow = React.createElement('div', { className: 'dy-stats' },
    React.createElement('div', { className: 'dy-stat' },
      React.createElement('div', { className: 'dy-stat-num' }, Math.round(totalFt)),
      React.createElement('div', { className: 'dy-stat-label' }, 'linear feet')
    ),
    React.createElement('div', { className: 'dy-stat' },
      React.createElement('div', { className: 'dy-stat-num' }, corners),
      React.createElement('div', { className: 'dy-stat-label' }, 'corners')
    ),
    priceRange && React.createElement('div', { className: 'dy-stat' },
      React.createElement('div', { className: 'dy-stat-num dy-stat-range' },
        formatMoney(priceRange.low) + ' – ' + formatMoney(priceRange.high)
      ),
      React.createElement('div', { className: 'dy-stat-label' }, 'est. range')
    )
  );

  var microActions = React.createElement('div', { className: 'dy-micro' },
    React.createElement('button', {
      className: 'dy-micro-btn',
      onClick: props.onUndo,
      title: 'Undo last corner (' + MOD_KEY + 'Z)',
      type: 'button',
      'aria-label': 'Undo',
    }, React.createElement(ArrowCounterClockwise, { size: 16, weight: 'regular' })),
    React.createElement('button', {
      className: 'dy-micro-btn',
      onClick: props.onReset,
      title: 'Clear all corners',
      type: 'button',
      'aria-label': 'Reset',
    }, React.createElement(X, { size: 16, weight: 'regular' }))
  );

  var emptyContent = React.createElement(React.Fragment, null,
    React.createElement('div', { className: 'dy-dock-icon' },
      React.createElement(Pencil, { size: 22, weight: 'regular', color: '#c2410c' })
    ),
    React.createElement('div', { className: 'dy-dock-copy' },
      React.createElement('strong', null, 'Ready when you are'),
      React.createElement('span', { className: 'dy-dock-sep' }, '\u00B7'),
      'Click on the map to drop your first corner'
    ),
    React.createElement('button', {
      className: 'dy-dock-cta dy-dock-cta-disabled',
      disabled: true,
      type: 'button',
    }, 'Start drawing')
  );

  var drawingOrReadyContent = React.createElement(React.Fragment, null,
    statsRow,
    microActions,
    React.createElement('button', {
      className: 'dy-dock-cta ' + (canContinue ? 'dy-dock-cta-ready' : 'dy-dock-cta-disabled'),
      onClick: canContinue ? props.onContinue : null,
      disabled: !canContinue,
      type: 'button',
    },
      canContinue ? (function() {
        var mid = priceRange ? (priceRange.low + priceRange.high) / 2 : 0;
        return React.createElement(React.Fragment, null,
          React.createElement(Check, { size: 14, weight: 'bold' }),
          React.createElement('span', null, 'Continue'),
          priceRange && React.createElement('span', { className: 'dy-dock-cta-price' },
            '\u00B7 ~' + formatMoney(mid)
          ),
          React.createElement(ArrowRight, { size: 14, weight: 'bold' })
        );
      })() : React.createElement('span', null,
        'Keep going \u00B7 ' + Math.max(0, MIN_DRAW_FT - Math.round(totalFt)) + '+ ft'
      )
    ),
    canContinue && React.createElement('button', {
      className: 'dy-breakdown-toggle',
      onClick: props.onToggleBreakdown,
      type: 'button',
    },
      React.createElement('span', null, isExpanded ? 'Hide breakdown' : 'View breakdown'),
      React.createElement(isExpanded ? CaretUp : CaretDown, { size: 12, weight: 'bold' })
    )
  );

  var expandedPanel = isExpanded && segments.length > 0 && React.createElement('div', { className: 'dy-dock-expanded' },
    // Segment list
    React.createElement('div', { className: 'dy-expanded-col' },
      React.createElement('h4', { className: 'dy-expanded-head' }, 'Your fence line'),
      React.createElement('ol', { className: 'dy-segment-list' },
        segments.map(function(s, i) {
          return React.createElement('li', { key: i, className: 'dy-segment-item' },
            React.createElement('span', { className: 'dy-segment-num' }, i + 1),
            React.createElement('span', { className: 'dy-segment-len' }, Math.round(s.lengthFeet) + ' ft'),
            React.createElement('button', {
              className: 'dy-segment-delete',
              onClick: function() { props.onDeleteSegment(i); },
              title: 'Remove this segment',
              type: 'button',
              'aria-label': 'Remove segment ' + (i + 1),
            }, React.createElement(X, { size: 12, weight: 'bold' }))
          );
        })
      )
    ),
    // Materials
    priceRange && React.createElement('div', { className: 'dy-expanded-col' },
      React.createElement('h4', { className: 'dy-expanded-head' }, 'Materials (estimate)'),
      React.createElement('ul', { className: 'dy-material-list' },
        React.createElement('li', null,
          React.createElement('span', null, Math.ceil(totalFt / priceRange.panelWidthFt) + ' panels \u00B7 6\u2032'),
          React.createElement('span', { className: 'dy-material-price' },
            formatMoney(priceRange.panelPrice * Math.ceil(totalFt / priceRange.panelWidthFt))
          )
        ),
        React.createElement('li', null,
          React.createElement('span', null, 'Posts (corner + end + line)'),
          React.createElement('span', { className: 'dy-material-price' }, 'included')
        ),
        React.createElement('li', null,
          React.createElement('span', null, 'Concrete (2 bags / post)'),
          React.createElement('span', { className: 'dy-material-price' }, 'quoted on call')
        ),
        React.createElement('li', { className: 'dy-material-total' },
          React.createElement('span', null, 'Estimated total range'),
          React.createElement('span', { className: 'dy-material-price' },
            formatMoney(priceRange.low) + ' \u2013 ' + formatMoney(priceRange.high)
          )
        )
      ),
      React.createElement('div', { className: 'dy-material-note' },
        'Haven Classic 60" baseline. Actual style, height, and color chosen in the next step.'
      )
    )
  );

  return React.createElement('div', { className: 'dy-dock dy-dock-' + phase },
    React.createElement('div', { className: 'dy-dock-main' },
      isEmpty ? emptyContent : drawingOrReadyContent
    ),
    expandedPanel,
    isEmpty && React.createElement('div', { className: 'dy-keyboard-hints' },
      React.createElement('span', { className: 'dy-kbd-hint' },
        React.createElement('kbd', null, 'Click'), ' drop corner'),
      React.createElement('span', { className: 'dy-kbd-hint' },
        React.createElement('kbd', null, 'Drag'), ' move corner'),
      React.createElement('span', { className: 'dy-kbd-hint' },
        React.createElement('kbd', null, 'Right-click'), ' delete'),
      React.createElement('span', { className: 'dy-kbd-hint' },
        React.createElement('kbd', null, MOD_KEY + 'Z'), ' undo')
    )
  );
}

// ---------- Map canvas with pen-tool drawing ----------
function MapScreen(props) {
  var mapContainerRef = useRef(null);
  var mapRef = useRef(null);
  var setPoints = props.setPoints;
  var setHoverPoint = props.setHoverPoint;
  var pointsRef = useRef(props.points);
  pointsRef.current = props.points;

  // One-time map init per location
  useEffect(function() {
    if (!mapContainerRef.current || mapRef.current) return;

    // First-visit cinematic: start at zoom 1 (real Mapbox globe), fly down
    // to zoom 20 over 2.4s. Return visits start already zoomed in.
    var cinematic = !!props.cinematic;
    var startZoom = cinematic ? 1 : 18;
    var startCenter = cinematic ? [0, 20] : [props.location.lng || 0, props.location.lat || 20];

    var map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      projection: 'globe',
      center: startCenter,
      zoom: startZoom,
      maxZoom: 22,
      pitch: 0,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }));
    mapRef.current = map;
    if (props.mapInstanceRef) props.mapInstanceRef.current = map;

    map.on('load', function() {
      // Render a subtle atmosphere + globe fog for a nicer cinematic look
      try {
        map.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        });
      } catch (e) { /* setFog unavailable on older mapbox-gl */ }

      var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var duration = cinematic && !prefersReduced ? 2400 : (prefersReduced ? 0 : 800);
      map.flyTo({
        center: [props.location.lng, props.location.lat],
        zoom: 20,
        pitch: 0,
        duration: duration,
        essential: true,
      });
    });

    // Click to drop vertex (but not if the click hit an existing vertex marker)
    map.on('click', function(e) {
      if (e.originalEvent && e.originalEvent.target) {
        var t = e.originalEvent.target;
        if (t.closest && t.closest('.dy-vertex')) return;
      }
      setPoints(function(prev) { return prev.concat([[e.lngLat.lng, e.lngLat.lat]]); });
      setHoverPoint(null);
    });

    // Hover ghost preview after first point
    map.on('mousemove', function(e) {
      if (pointsRef.current.length === 0) { setHoverPoint(null); return; }
      setHoverPoint([e.lngLat.lng, e.lngLat.lat]);
    });
    map.on('mouseout', function() { setHoverPoint(null); });

    // Parcel outline on first idle
    map.on('idle', async function onceLoaded() {
      map.off('idle', onceLoaded);
      if (props.location.lat == null) return;
      try {
        var result = await fetchParcel(props.location.lat, props.location.lng, process.env.PARCEL_PROXY_URL);
        if (result && result.ok && result.data && result.data.boundary) {
          var coords = result.data.boundary.coordinates[0];
          if (!map.getSource('parcel')) {
            map.addSource('parcel', {
              type: 'geojson',
              data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } },
            });
            map.addLayer({
              id: 'parcel-outline',
              type: 'line',
              source: 'parcel',
              paint: {
                'line-color': '#ffffff',
                'line-width': 1.5,
                'line-dasharray': [3, 3],
                'line-opacity': 0.9,
              },
            });
            map.addLayer({
              id: 'parcel-pulse',
              type: 'line',
              source: 'parcel',
              paint: {
                'line-color': '#c2410c',
                'line-width': 3,
                'line-opacity': 0.8,
              },
            });
          }
        }
      } catch (e) { /* parcel fetch failure is non-fatal */ }
    });

    return function() {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        if (props.mapInstanceRef) props.mapInstanceRef.current = null;
      }
    };
  }, [props.location.lat, props.location.lng]);

  // Parcel-pulse visible only when no points drawn
  useEffect(function() {
    if (!mapRef.current || !mapRef.current.getLayer) return;
    if (!mapRef.current.getLayer('parcel-pulse')) return;
    mapRef.current.setPaintProperty('parcel-pulse', 'line-opacity', props.points.length === 0 ? 0.8 : 0);
  }, [props.points.length]);

  // Main polyline (glow + solid orange)
  useEffect(function() {
    if (!mapRef.current) return;
    var geoj = { type: 'Feature', geometry: { type: 'LineString', coordinates: props.points } };
    function apply() {
      if (!mapRef.current) return;
      var src = mapRef.current.getSource && mapRef.current.getSource('dy-line');
      if (src && src.setData) { src.setData(geoj); return; }
      if (!mapRef.current.addSource) return;
      mapRef.current.addSource('dy-line', { type: 'geojson', data: geoj });
      mapRef.current.addLayer({
        id: 'dy-line-glow',
        type: 'line',
        source: 'dy-line',
        paint: { 'line-color': '#c2410c', 'line-width': 10, 'line-opacity': 0.25, 'line-blur': 2 },
      });
      mapRef.current.addLayer({
        id: 'dy-line',
        type: 'line',
        source: 'dy-line',
        paint: { 'line-color': '#c2410c', 'line-width': 4 },
      });
    }
    if (mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) apply();
    else mapRef.current.once && mapRef.current.once('style.load', apply);
  }, [props.points]);

  // Dashed ghost segment from last point to hover
  useEffect(function() {
    if (!mapRef.current) return;
    var empty = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } };
    var coords = [];
    if (props.points.length > 0 && props.hoverPoint) {
      coords = [props.points[props.points.length - 1], props.hoverPoint];
    }
    var geoj = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
    function apply() {
      if (!mapRef.current) return;
      var src = mapRef.current.getSource && mapRef.current.getSource('dy-ghost');
      if (src && src.setData) { src.setData(geoj); return; }
      if (!mapRef.current.addSource) return;
      mapRef.current.addSource('dy-ghost', { type: 'geojson', data: empty });
      mapRef.current.addLayer({
        id: 'dy-ghost',
        type: 'line',
        source: 'dy-ghost',
        paint: {
          'line-color': '#c2410c',
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.55,
        },
      });
      // Re-apply data after layer created
      var src2 = mapRef.current.getSource('dy-ghost');
      if (src2 && src2.setData) src2.setData(geoj);
    }
    if (mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) apply();
    else mapRef.current.once && mapRef.current.once('style.load', apply);
  }, [props.points, props.hoverPoint]);

  // Vertex markers (draggable, right-click to delete)
  useEffect(function() {
    if (!mapRef.current || !mapboxgl || !mapboxgl.Marker) return;
    var markers = [];
    props.points.forEach(function(pt, i) {
      var el = document.createElement('div');
      el.className = 'dy-vertex' + (i === 0 ? ' dy-vertex-first' : '');
      var hit = document.createElement('div');
      hit.className = 'dy-vertex-hit';
      el.appendChild(hit);

      var marker = new mapboxgl.Marker({ element: el, draggable: true })
        .setLngLat(pt)
        .addTo(mapRef.current);
      marker.on('dragend', function() {
        var ll = marker.getLngLat();
        setPoints(function(prev) {
          var next = prev.slice();
          next[i] = [ll.lng, ll.lat];
          return next;
        });
      });
      el.addEventListener('contextmenu', function(ev) {
        ev.preventDefault();
        setPoints(function(prev) { return prev.filter(function(_, j) { return j !== i; }); });
      });
      markers.push(marker);
    });
    return function() { markers.forEach(function(m) { m.remove(); }); };
  }, [props.points]);

  // Segment length labels at midpoints
  useEffect(function() {
    if (!mapRef.current || !mapboxgl || !mapboxgl.Marker) return;
    var labels = [];
    for (var i = 0; i < props.points.length - 1; i++) {
      var len = distanceBetween(props.points[i], props.points[i + 1]);
      var midLng = (props.points[i][0] + props.points[i + 1][0]) / 2;
      var midLat = (props.points[i][1] + props.points[i + 1][1]) / 2;
      var el = document.createElement('div');
      el.className = 'dy-seg-label';
      el.textContent = Math.round(len) + ' ft';
      var marker = new mapboxgl.Marker({ element: el })
        .setLngLat([midLng, midLat])
        .addTo(mapRef.current);
      labels.push(marker);
    }
    return function() { labels.forEach(function(m) { m.remove(); }); };
  }, [props.points]);

  // Live ghost distance label ("+42 ft")
  useEffect(function() {
    if (!mapRef.current || !mapboxgl || !mapboxgl.Marker) return;
    if (props.points.length === 0 || !props.hoverPoint) return;
    var last = props.points[props.points.length - 1];
    var len = distanceBetween(last, props.hoverPoint);
    if (len < 1) return;
    var midLng = (last[0] + props.hoverPoint[0]) / 2;
    var midLat = (last[1] + props.hoverPoint[1]) / 2;
    var el = document.createElement('div');
    el.className = 'dy-seg-label dy-seg-label-ghost';
    el.textContent = '+' + Math.round(len) + ' ft';
    var marker = new mapboxgl.Marker({ element: el })
      .setLngLat([midLng, midLat])
      .addTo(mapRef.current);
    return function() { marker.remove(); };
  }, [props.points, props.hoverPoint]);

  return React.createElement('div', {
    ref: mapContainerRef,
    className: 'dy-map',
  });
}

// ---------- Main view ----------
function MapboxDrawView(props) {
  var locationState = useState(function() {
    if (props.initialLocation) return props.initialLocation;
    try {
      var raw = localStorage.getItem('gv_bridge_location');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });
  var location = locationState[0];
  var setLocation = locationState[1];

  // Hydrate points from last autosave (persistence)
  var pointsState = useState(function() {
    try {
      var raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.points)) return parsed.points;
      }
    } catch (e) {}
    return [];
  });
  var points = pointsState[0];
  var setPoints = pointsState[1];

  var hoverPointState = useState(null);
  var hoverPoint = hoverPointState[0];
  var setHoverPoint = hoverPointState[1];

  var showBreakdownState = useState(false);
  var showBreakdown = showBreakdownState[0];
  var setShowBreakdown = showBreakdownState[1];

  var savedToastState = useState(false);
  var savedToast = savedToastState[0];
  var setSavedToast = savedToastState[1];

  var saveDialogState = useState(false);
  var saveDialogOpen = saveDialogState[0];
  var setSaveDialogOpen = saveDialogState[1];

  var saveEmailState = useState('');
  var saveEmail = saveEmailState[0];
  var setSaveEmail = saveEmailState[1];

  var saveSendingState = useState(false);
  var saveSending = saveSendingState[0];
  var setSaveSending = saveSendingState[1];

  var saveErrorState = useState('');
  var saveError = saveErrorState[0];
  var setSaveError = saveErrorState[1];

  // First-visit cinematic: ride the real Mapbox flyTo animation instead
  // of a fake pre-map overlay. Gated by the dy_seen cookie and the
  // EARTH_INTRO_ENABLED build flag.
  var cinematicState = useState(function() {
    return EARTH_INTRO_ENABLED && !hasSeenEarthIntro();
  });
  var cinematic = cinematicState[0];
  var setCinematic = cinematicState[1];

  var estOpenState = useState(false);
  var estOpen = estOpenState[0];
  var setEstOpen = estOpenState[1];

  var mapInstanceRef = useRef(null);

  // On mount: check URL hash for a resume link (#dy-resume=...)
  useEffect(function() {
    var resumed = checkForDrawResume();
    if (resumed && resumed.points && Array.isArray(resumed.points)) {
      setPoints(resumed.points);
      if (resumed.location) {
        try { localStorage.setItem('gv_bridge_location', JSON.stringify(resumed.location)); } catch (e) {}
        setLocation(resumed.location);
      }
    }
  }, []);

  // Derived values
  var totalFt = totalFeet(points);
  var corners = points.length >= 2 ? Math.max(0, points.length - 2) : 0;

  var per = estimatePerFootRange(DEFAULT_ESTIMATE_INPUTS);
  var priceRange = null;
  if (per && totalFt > 0) {
    priceRange = {
      low: per.low * totalFt,
      high: per.high * totalFt,
      mid: per.mid * totalFt,
      panelWidthFt: per.panelWidthFt,
      panelPrice: per.panelPrice,
      postPrice: per.postPrice,
    };
  }

  var phase;
  if (points.length === 0) phase = 'empty';
  else if (totalFt < MIN_DRAW_FT) phase = 'drawing';
  else if (showBreakdown) phase = 'expanded';
  else phase = 'ready';

  // Autosave: debounced 2s after last change
  useEffect(function() {
    if (points.length === 0) {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
      return;
    }
    var t = setTimeout(function() {
      try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ points: points, ts: Date.now() }));
      } catch (e) {}
    }, AUTOSAVE_DEBOUNCE_MS);
    return function() { clearTimeout(t); };
  }, [points]);

  // Keyboard undo (⌘Z / Ctrl+Z)
  useEffect(function() {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        setPoints(function(prev) { return prev.slice(0, -1); });
      }
    }
    window.addEventListener('keydown', onKey);
    return function() { window.removeEventListener('keydown', onKey); };
  }, []);

  function handleAddress(loc) {
    try { localStorage.setItem('gv_bridge_location', JSON.stringify(loc)); } catch (e) {}
    setLocation(loc);
  }

  function handleUndo() {
    setPoints(function(prev) { return prev.slice(0, -1); });
  }

  function handleReset() {
    if (points.length === 0) return;
    if (!window.confirm('Clear your drawing?')) return;
    setPoints([]);
    setShowBreakdown(false);
  }

  function buildAndComplete(snapshotUrl) {
    var segments = [];
    for (var i = 0; i < points.length - 1; i++) {
      var lengthFt = distanceBetween(points[i], points[i + 1]);
      segments.push({
        index: i,
        mapLayerIdx: null,
        lengthFeet: lengthFt,
        color: '#c2410c',
        compassLabel: compassBearing(points[i], points[i + 1]),
        panels: Math.ceil(lengthFt / 6),
        start: points[i],
        end: points[i + 1],
        rackingTier: 'standard',
        epqsClassification: 'unknown',
      });
    }
    var slopedPostCount = computeSlopedPostCount(segments, 6);
    var data = {
      totalFeet: totalFt,
      corners: corners,
      ends: 2,
      lines: [{
        id: 'line-0',
        color: '#c2410c',
        points: points.slice(),
        segments: segments,
      }],
      slopeAnswer: null,
      slopedPostCount: slopedPostCount,
      epqsOverall: 'unknown',
      epqsConfidence: 'low',
      epqsMaxDeltaInches: 0,
      mapboxSnapshotUrl: snapshotUrl,
      source: 'auto',
      parcel: null,
    };
    if (typeof window !== 'undefined') window.__DRAW_TOOL_DATA__ = data;
    props.onComplete(data);
  }

  function handleContinue() {
    if (!mapInstanceRef.current) { buildAndComplete(null); return; }
    var map = mapInstanceRef.current;
    map.once('render', function() {
      try { buildAndComplete(map.getCanvas().toDataURL('image/png')); }
      catch (e) { buildAndComplete(null); }
    });
    map.triggerRepaint();
  }

  function handleToggleBreakdown() { setShowBreakdown(!showBreakdown); }

  function handleDeleteSegment(i) {
    // Segment i spans points[i] → points[i+1]. Deleting removes the "end" of
    // that segment (the vertex that created it), which shifts later segments.
    setPoints(function(prev) { return prev.filter(function(_, j) { return j !== i + 1; }); });
  }

  function handleSaveForLater() {
    setSaveEmail('');
    setSaveError('');
    setSaveDialogOpen(true);
  }

  function submitSaveForLater(e) {
    if (e) e.preventDefault();
    if (!saveEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saveEmail)) {
      setSaveError('Please enter a valid email.');
      return;
    }
    setSaveSending(true);
    setSaveError('');
    emailDrawSaveLink(saveEmail, { points: points, location: location }).then(function(ok) {
      setSaveSending(false);
      if (ok) {
        setSaveDialogOpen(false);
        setSaveEmail('');
        setSavedToast(true);
        setTimeout(function() { setSavedToast(false); }, 3500);
      } else {
        setSaveError('Could not send. Please try again or email sales@grandviewfence.com.');
      }
    }).catch(function() {
      setSaveSending(false);
      setSaveError('Could not send. Please try again or email sales@grandviewfence.com.');
    });
  }

  // Cold start: no location → show address entry
  if (!location) {
    return React.createElement('div', { className: 'dy-container' },
      React.createElement(AddressEntry, { onAddressEntered: handleAddress })
    );
  }

  // Build segments array for the dock
  var dockSegments = [];
  for (var si = 0; si < points.length - 1; si++) {
    dockSegments.push({ lengthFeet: distanceBetween(points[si], points[si + 1]) });
  }

  return React.createElement('div', { className: 'dy-container' },
    // Top-overlay: address pill (always), save-for-later (when drawing)
    React.createElement('div', { className: 'dy-top-overlay' },
      React.createElement(AddressPill, { location: location, onChangeAddress: handleAddress }),
      points.length > 0 && React.createElement('button', {
        className: 'dy-save-btn',
        onClick: handleSaveForLater,
        type: 'button',
        title: 'Save this drawing to resume later',
      },
        React.createElement(FloppyDisk, { size: 14, weight: 'regular' }),
        React.createElement('span', null, 'Save for later')
      )
    ),

    // Map canvas — passes cinematic flag so first visit flies from globe
    React.createElement(MapScreen, {
      location: location,
      points: points,
      setPoints: setPoints,
      hoverPoint: hoverPoint,
      setHoverPoint: setHoverPoint,
      mapInstanceRef: mapInstanceRef,
      cinematic: cinematic,
    }),

    // Cinematic overlay rides on top of the live flyTo for first visits
    cinematic && React.createElement(IntroOverlay, {
      location: location,
      onComplete: function() { setCinematic(false); },
    }),

    // Empty-state hero text (only when zero points + no cinematic running)
    phase === 'empty' && !cinematic && React.createElement(EmptyStateOverlay, null),

    // Dock
    React.createElement(MorphingDock, {
      phase: phase,
      totalFt: totalFt,
      corners: corners,
      priceRange: priceRange,
      segments: dockSegments,
      onUndo: handleUndo,
      onReset: handleReset,
      onContinue: handleContinue,
      onToggleBreakdown: handleToggleBreakdown,
      onDeleteSegment: handleDeleteSegment,
    }),

    // Estimate banner (compact, always visible while drawing) + popup
    points.length > 0 && React.createElement(EstimateBanner, {
      onOpen: function() { setEstOpen(true); },
    }),
    estOpen && React.createElement(EstimatePopup, {
      onClose: function() { setEstOpen(false); },
    }),

    // Save confirmation toast
    savedToast && React.createElement('div', { className: 'dy-toast' },
      React.createElement(Check, { size: 14, weight: 'bold' }),
      React.createElement('span', null, 'Email sent. Click the link anytime to resume.')
    ),

    // Save-for-later dialog
    saveDialogOpen && React.createElement('div', {
      className: 'dy-save-overlay',
      onClick: function(e) { if (e.target === e.currentTarget) setSaveDialogOpen(false); },
    },
      React.createElement('form', { className: 'dy-save-dialog', onSubmit: submitSaveForLater },
        React.createElement('button', {
          type: 'button',
          className: 'dy-save-close',
          onClick: function() { setSaveDialogOpen(false); },
          'aria-label': 'Close',
        }, React.createElement(X, { size: 18, weight: 'bold' })),
        React.createElement('h3', null, 'Save your drawing'),
        React.createElement('p', { className: 'dy-save-copy' },
          'We\u2019ll email you a link so you can resume exactly where you left off, from any device.'
        ),
        React.createElement('input', {
          type: 'email',
          placeholder: 'you@example.com',
          value: saveEmail,
          onChange: function(e) { setSaveEmail(e.target.value); },
          className: 'dy-save-input',
          autoFocus: true,
          disabled: saveSending,
          required: true,
        }),
        saveError && React.createElement('div', { className: 'dy-save-error' }, saveError),
        React.createElement('div', { className: 'dy-save-actions' },
          React.createElement('button', {
            type: 'button',
            className: 'dy-save-btn-ghost',
            onClick: function() { setSaveDialogOpen(false); },
            disabled: saveSending,
          }, 'Cancel'),
          React.createElement('button', {
            type: 'submit',
            className: 'dy-save-btn-primary',
            disabled: saveSending || !saveEmail,
          }, saveSending ? 'Sending\u2026' : 'Email me the link')
        )
      )
    )
  );
}

export { MapScreen };
export default MapboxDrawView;
