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
  X, CaretDown, CaretUp, ArrowRight, Plus,
} from '@phosphor-icons/react';
import { geocodeAddress, suggestAddresses } from './mapboxGeocoder';
import { fetchParcel } from './parcelClient';
import { computeSlopedPostCount, compassBearing, countCornersAndLinePosts, classificationToRackingTier } from './geometryUtils';
import { estimatePerFootRange } from './retailPricing';
import { emailDrawSaveLink, checkForDrawResume } from './quoteSaver';
import { classifyDrawnLine } from './epqsClient';
import { buildAnnotatedSnapshot } from './legendOverlay';
import SlopePopup from './SlopePopup';

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
// Minimum pixel distance between two segment-label midpoints before we hide
// the later one. Roughly the label's own width including padding (~50-80px
// depending on digit count); 54 keeps the common "XX ft" labels from overlapping
// while still allowing adjacent labels to show when there's room.
var LABEL_MIN_PIXEL_GAP = 54;
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

// Compute a pixel-space offset for a segment length label so it sits
// perpendicular to the segment, on the "outside" of the fence line.
// This replaces the old fixed CSS `translate(12px, -22px)`, which collided
// with the click path when the user's next vertex was up-and-right of the
// endpoint.
//
// Inputs are all in pixel space (from `map.project([lng, lat])`):
//   p0, p1     - segment endpoints {x, y}
//   centroid   - centroid of the current line in pixel space, or null if the
//                line has <3 points (treated as an open line)
//   isClosed   - true when the line has >=3 points (polygon-ish); for an open
//                line we use a consistent "left-of-walk" perpendicular sign
//   distancePx - distance to offset the label from the midpoint (default 22)
// Returns [offsetX, offsetY] suitable for mapboxgl.Marker({ offset }).
export function computeLabelOffsetPx(args) {
  var p0 = args.p0;
  var p1 = args.p1;
  var centroid = args.centroid || null;
  var isClosed = !!args.isClosed;
  var distancePx = typeof args.distancePx === 'number' ? args.distancePx : 22;
  var dx = p1.x - p0.x;
  var dy = p1.y - p0.y;
  var len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Unit perpendicular rotated 90 degrees CCW from the segment direction.
  var nx = -dy / len;
  var ny = dx / len;
  var sign = 1;
  if (isClosed && centroid) {
    var midX = (p0.x + p1.x) / 2;
    var midY = (p0.y + p1.y) / 2;
    // Dot product of (mid - centroid) with the perpendicular tells us
    // which side of the segment is "away from centroid" (the outside).
    var towardX = midX - centroid.x;
    var towardY = midY - centroid.y;
    sign = (towardX * nx + towardY * ny) >= 0 ? 1 : -1;
  }
  return [nx * sign * distancePx, ny * sign * distancePx];
}

// Compute the pixel-space centroid of a line's vertices. Returns null when
// the line has fewer than 3 points (no meaningful "inside" yet, so callers
// should fall through to the open-line sign).
export function computeCentroidPx(linePoints, projectFn) {
  if (!linePoints || linePoints.length < 3 || typeof projectFn !== 'function') return null;
  var sumX = 0;
  var sumY = 0;
  var n = 0;
  for (var i = 0; i < linePoints.length; i++) {
    var p;
    try { p = projectFn(linePoints[i]); } catch (e) { return null; }
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
    sumX += p.x;
    sumY += p.y;
    n++;
  }
  if (n === 0) return null;
  return { x: sumX / n, y: sumY / n };
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
        'You\u2019ll mark your fence line on this map. The linear footage and price range come straight from the line you draw.'
      ),
      React.createElement('p', null,
        React.createElement('strong', null, 'It\u2019s your responsibility to double-check the math and validate your measurements yourself. '),
        'Grandview will verify with you before production, but the measurements you enter are what we build to.'
      ),
      React.createElement('p', { className: 'dy-est-muted' },
        'Satellite imagery can be a year or two old, and tree canopy can hide features. When in doubt, walk the line with a tape measure before you submit.'
      ),
      React.createElement('img', {
        src: 'assets/slope-guides/measure-slope.png',
        alt: 'How to measure your yard for a fence',
        className: 'dy-est-measure-img',
      }),
      React.createElement('a', {
        href: '/how-to-measure-your-yard',
        target: '_blank',
        rel: 'noopener',
        className: 'dy-est-measure-link',
      }, 'Read: Full yard measurement guide \u2192'),
      React.createElement('h4', { className: 'dy-est-subhead' }, 'How to measure'),
      React.createElement('p', { className: 'dy-est-video-link' },
        React.createElement('a', {
          href: 'https://youtu.be/nfrwyY4GttE',
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'dy-est-video-cta'
        }, '\u25B6 Watch: How to measure your yard (2 min)')
      ),
      React.createElement('ul', { className: 'dy-est-tips' },
        React.createElement('li', null, 'Walk each fence run with a tape measure, end to end.'),
        React.createElement('li', null, 'Note every direction change (those are corner posts).'),
        React.createElement('li', null, 'For slope, hold a 6\u2032 board level and measure the gap at the downhill end.')
      ),
      React.createElement('h4', { className: 'dy-est-subhead' }, 'What we auto-detect'),
      React.createElement('p', null,
        'Grandview pulls USGS elevation data for the line you draw and suggests whether each segment needs standard, rackable, or heavy-rack panels. ',
        React.createElement('strong', null, 'Auto-detect is not always accurate, especially in dense tree canopy or recently graded lots. Please verify on the ground before you submit.')
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
  var linePosts = props.linePosts;
  var priceRange = props.priceRange;
  var segments = props.segments;
  var isEmpty = phase === 'empty';
  var isReady = phase === 'ready';
  var isExpanded = phase === 'expanded';
  var epqsLoading = props.epqsLoading;
  var canContinue = (isReady || isExpanded) && !epqsLoading;

  // Task 2.3: "Finish" vs "Continue" split. isFinished collapses micro-actions
  // so the user can pan/zoom and review the sketch before advancing to QB.
  var isFinishedState = useState(false);
  var isFinished = isFinishedState[0];
  var setIsFinished = isFinishedState[1];

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
      React.createElement('div', { className: 'dy-stat-label' }, 'corners'),
      linePosts > 0 && React.createElement('div', { className: 'dy-stat-sub' }, '+' + linePosts + ' line posts')
    ),
    priceRange && React.createElement('div', { className: 'dy-stat' },
      React.createElement('div', { className: 'dy-stat-num dy-stat-range' },
        formatMoney(priceRange.low) + ' – ' + formatMoney(priceRange.high)
      ),
      React.createElement('div', { className: 'dy-stat-label' }, 'est. range')
    )
  );

  // "Start new line" appears only once the active line has a real segment
  // (>=2 points). Clicking pushes a fresh empty line onto `lines` so the
  // next click drops a vertex that begins a disconnected run.
  var lines = props.lines || [];
  var canStartNewLine = lines.length >= 1 && lines[lines.length - 1].length >= 2;
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
    }, React.createElement(X, { size: 16, weight: 'regular' })),
    canStartNewLine && React.createElement('button', {
      className: 'dy-micro-btn',
      onClick: props.onStartNewLine,
      title: 'Start new disconnected line',
      type: 'button',
      'aria-label': 'New line',
    }, React.createElement(Plus, { size: 16, weight: 'regular' })),
    React.createElement('button', {
      className: 'dy-micro-btn dy-micro-btn-finish',
      onClick: function() { setIsFinished(true); },
      title: 'Finish drawing and review before continuing',
      type: 'button',
      'aria-label': 'Finish',
    }, React.createElement(Check, { size: 16, weight: 'bold' }))
  );

  // When finished, show a single "Edit drawing" link that restores drawing state.
  var editDrawingLink = React.createElement('div', { className: 'dy-micro dy-micro-finished' },
    React.createElement('button', {
      className: 'dy-edit-drawing-link',
      onClick: function() { setIsFinished(false); },
      type: 'button',
      'aria-label': 'Edit drawing',
    }, 'Edit drawing')
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

  // CTA label branches: EPQS-loading (ready phase only) > continue-ready > keep-going.
  // epqsLoading gates canContinue above; when loading we still show the ready-phase
  // stats row but swap the CTA label/disabled to signal slope calculation is in flight.
  var showEpqsLoading = epqsLoading && (isReady || isExpanded);
  var ctaLabel;
  if (showEpqsLoading) {
    ctaLabel = React.createElement('span', null, 'Calculating slope\u2026');
  } else if (canContinue && isFinished) {
    var mid = priceRange ? (priceRange.low + priceRange.high) / 2 : 0;
    ctaLabel = React.createElement(React.Fragment, null,
      React.createElement(Check, { size: 14, weight: 'bold' }),
      React.createElement('span', null, 'Continue to Quote'),
      priceRange && React.createElement('span', { className: 'dy-dock-cta-price' },
        '· ~' + formatMoney(mid)
      ),
      React.createElement(ArrowRight, { size: 14, weight: 'bold' })
    );
  } else if (canContinue) {
    var mid = priceRange ? (priceRange.low + priceRange.high) / 2 : 0;
    ctaLabel = React.createElement(React.Fragment, null,
      React.createElement(Check, { size: 14, weight: 'bold' }),
      React.createElement('span', null, 'Done. Continue'),
      priceRange && React.createElement('span', { className: 'dy-dock-cta-price' },
        '\u00B7 ~' + formatMoney(mid)
      ),
      React.createElement(ArrowRight, { size: 14, weight: 'bold' })
    );
  } else {
    ctaLabel = React.createElement('span', null,
      'Keep going \u00B7 ' + Math.max(0, MIN_DRAW_FT - Math.round(totalFt)) + '+ ft'
    );
  }

  var drawingOrReadyContent = React.createElement(React.Fragment, null,
    statsRow,
    isFinished ? editDrawingLink : microActions,
    React.createElement('button', {
      className: 'dy-dock-cta ' + (canContinue ? 'dy-dock-cta-ready' : 'dy-dock-cta-disabled'),
      onClick: canContinue ? props.onContinue : null,
      disabled: !canContinue,
      type: 'button',
    }, ctaLabel),
    (canContinue || showEpqsLoading) && React.createElement('button', {
      className: 'dy-breakdown-toggle',
      onClick: props.onToggleBreakdown,
      type: 'button',
    },
      React.createElement('span', null, isExpanded ? 'Hide breakdown' : 'View breakdown'),
      React.createElement(isExpanded ? CaretUp : CaretDown, { size: 12, weight: 'bold' })
    )
  );

  var expandedPanel = isExpanded && segments.length > 0 && React.createElement('div', { className: 'dy-dock-breakdown' },
    React.createElement('button', {
      type: 'button',
      className: 'dy-expanded-close',
      onClick: props.onToggleBreakdown,
      'aria-label': 'Close breakdown',
    }, React.createElement(X, { size: 16, weight: 'bold' })),
    // Segment list
    React.createElement('div', { className: 'dy-expanded-col' },
      React.createElement('h4', { className: 'dy-expanded-head' }, 'Your fence line'),
      React.createElement('ol', { className: 'dy-segment-list' },
        segments.map(function(s, i) {
          return React.createElement('li', { key: i, className: 'dy-segment-item' },
            React.createElement('span', { className: 'dy-segment-num' }, i + 1),
            React.createElement('span', { className: 'dy-segment-len' }, Math.round(s.lengthFeet) + ' ft'),
            React.createElement('select', {
              className: 'dy-segment-tier',
              value: s.rackingSource === 'user' && s.rackingTier ? s.rackingTier : 'auto',
              onChange: function(ev) { props.onSetTierOverride(i, ev.target.value); },
              title: 'Racking tier for segment ' + (i + 1),
            },
              React.createElement('option', { value: 'auto' }, 'Auto' + (s.rackingSource === 'auto' && s.rackingTier ? ' (' + s.rackingTier + ')' : '')),
              React.createElement('option', { value: 'standard' }, 'Standard'),
              React.createElement('option', { value: 'rackable' }, 'Rackable'),
              React.createElement('option', { value: 'heavy' }, 'Heavy rack'),
              React.createElement('option', { value: 'steps' }, 'Stair-step')
            ),
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
      var duration = cinematic && !prefersReduced ? 4200 : (prefersReduced ? 0 : 900);
      map.flyTo({
        center: [props.location.lng, props.location.lat],
        zoom: 20,
        pitch: 0,
        duration: duration,
        essential: true,
        // Cubic bezier imitating ease-out-quint — slow entry, fast middle,
        // gentle settle onto the property. Default flyTo easing is ease-in-out
        // which feels mechanical at high zoom deltas.
        easing: function(t) { return 1 - Math.pow(1 - t, 5); },
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
          if (props.setParcelData) props.setParcelData(result.data);
        } else if (result && !result.ok) {
          // Parcel overlay is a nice-to-have. A fallback result (Regrid outside
          // trial coverage, HTTP 4xx/5xx) is logged for debugging but never
          // surfaced to the buyer. The draw tool works fine without the outline.
          console.warn('[parcel] fetch returned fallback', result.error);
        }
      } catch (e) {
        // Same non-blocking posture for network / unexpected errors.
        console.warn('[parcel] fetch failed', e);
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

  // Parcel-pulse visible only when no points drawn
  useEffect(function() {
    if (!mapRef.current || !mapRef.current.getLayer) return;
    if (!mapRef.current.getLayer('parcel-pulse')) return;
    mapRef.current.setPaintProperty('parcel-pulse', 'line-opacity', props.points.length === 0 ? 0.8 : 0);
  }, [props.points.length]);

  // Main polyline (glow + solid orange) — per-line source/layers.
  // Each entry in `props.lines` gets its own `dy-line-${idx}` source plus a
  // `dy-line-${idx}-glow` + `dy-line-${idx}` layer pair (blurred wide glow
  // underneath, solid narrow stroke on top). When `lines` shrinks (e.g.
  // via a future delete-line action in P4.3), the now-removed indices are
  // torn down so orphan sources/layers don't leak.
  var prevLineCountRef = useRef(0);
  useEffect(function() {
    if (!mapRef.current) return;
    var linesArr = props.lines || [];
    function apply() {
      var map = mapRef.current;
      if (!map) return;
      // Upsert each line: either update the existing source's data, or
      // add the source + glow layer + solid layer fresh.
      linesArr.forEach(function(linePoints, idx) {
        var srcId = 'dy-line-' + idx;
        var glowId = 'dy-line-' + idx + '-glow';
        var strokeId = 'dy-line-' + idx;
        if (!linePoints || linePoints.length < 2) {
          // Tear down any existing source/layers for this index — a line
          // that shrinks back below 2 points has no geometry to render.
          if (map.getLayer && map.getLayer(strokeId) && map.removeLayer) map.removeLayer(strokeId);
          if (map.getLayer && map.getLayer(glowId) && map.removeLayer) map.removeLayer(glowId);
          if (map.getSource && map.getSource(srcId) && map.removeSource) map.removeSource(srcId);
          return;
        }
        var geoj = { type: 'Feature', geometry: { type: 'LineString', coordinates: linePoints } };
        var src = map.getSource && map.getSource(srcId);
        if (src && src.setData) { src.setData(geoj); return; }
        if (!map.addSource) return;
        map.addSource(srcId, { type: 'geojson', data: geoj });
        map.addLayer({
          id: glowId,
          type: 'line',
          source: srcId,
          paint: { 'line-color': '#c2410c', 'line-width': 10, 'line-opacity': 0.25, 'line-blur': 2 },
        });
        map.addLayer({
          id: strokeId,
          type: 'line',
          source: srcId,
          paint: { 'line-color': '#c2410c', 'line-width': 4 },
        });
      });
      // Cleanup on shrink: if the array shortened since last render, remove
      // every index from linesArr.length up to the previous max. Relevant
      // once P4.3 ships "Start new line" / per-line delete — without this,
      // each Start/delete cycle would leak a source + two layers.
      var prev = prevLineCountRef.current || 0;
      if (prev > linesArr.length) {
        for (var k = linesArr.length; k < prev; k++) {
          var oldSrc = 'dy-line-' + k;
          var oldGlow = 'dy-line-' + k + '-glow';
          var oldStroke = 'dy-line-' + k;
          if (map.getLayer && map.getLayer(oldStroke) && map.removeLayer) map.removeLayer(oldStroke);
          if (map.getLayer && map.getLayer(oldGlow) && map.removeLayer) map.removeLayer(oldGlow);
          if (map.getSource && map.getSource(oldSrc) && map.removeSource) map.removeSource(oldSrc);
        }
      }
      prevLineCountRef.current = linesArr.length;
    }
    if (mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) apply();
    else mapRef.current.once && mapRef.current.once('style.load', apply);
  }, [props.lines]);

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

  // Segment length labels at midpoints. We hide labels whose pixel-space midpoint
  // lands within LABEL_MIN_PIXEL_GAP of any already-kept label, so short runs
  // (e.g. 4 ft + 8 ft) don't render "39 ft" and "6 ft" on top of each other.
  // First and last segment labels PER LINE are always kept as reference points.
  // Re-runs when zoom changes (zoomTick) so a user zooming in reveals labels
  // that were previously hidden.
  // P4.3: iterate `props.lines` per-line (not the flat `props.points` shim)
  // so we never draw a label across the "bridge" gap between two
  // disconnected fence runs. The pixel-gap guard still dedupes across
  // lines — labels from different lines that happen to land near each
  // other in screen space get suppressed too.
  var zoomTickState = useState(0);
  var zoomTick = zoomTickState[0];
  var setZoomTick = zoomTickState[1];
  useEffect(function() {
    if (!mapRef.current) return;
    var map = mapRef.current;
    var handler = function() { setZoomTick(function(n) { return n + 1; }); };
    map.on('zoomend', handler);
    return function() { if (map && map.off) map.off('zoomend', handler); };
  }, []);
  useEffect(function() {
    if (!mapRef.current || !mapboxgl || !mapboxgl.Marker) return;
    var map = mapRef.current;
    var labels = [];
    var keptPx = [];
    var canProject = typeof map.project === 'function';
    var linesArr = props.lines || [];
    // Fallback: if `lines` wasn't provided (defensive — shouldn't happen in
    // production, but keeps old tests that only pass `points` working),
    // treat the flat `points` shim as a single line.
    if (linesArr.length === 0 && props.points && props.points.length > 0) {
      linesArr = [props.points];
    }
    for (var lineIdx = 0; lineIdx < linesArr.length; lineIdx++) {
      var linePoints = linesArr[lineIdx] || [];
      var segCount = linePoints.length - 1;
      // Pre-compute per-line centroid so all segment labels on this line
      // agree on "outside". Centroid is only meaningful for >=3 points.
      var projectFn = canProject ? function(pt) { return map.project(pt); } : null;
      var lineCentroid = linePoints.length >= 3 ? computeCentroidPx(linePoints, projectFn) : null;
      var lineIsClosed = linePoints.length >= 3;
      for (var i = 0; i < segCount; i++) {
        var len = distanceBetween(linePoints[i], linePoints[i + 1]);
        var midLng = (linePoints[i][0] + linePoints[i + 1][0]) / 2;
        var midLat = (linePoints[i][1] + linePoints[i + 1][1]) / 2;
        var isEndpoint = (i === 0) || (i === segCount - 1);
        var shouldRender = true;
        var px = null;
        // Overlap handling remains at the MIDPOINT pixel level. We only
        // changed where the label renders (the offset); the dedup comparison
        // still uses midpoint proximity, which is what matters for "are
        // these labels too close to each other to both be readable".
        if (!isEndpoint && canProject) {
          try { px = map.project([midLng, midLat]); } catch (err) { px = null; }
          if (px && typeof px.x === 'number' && typeof px.y === 'number') {
            for (var k = 0; k < keptPx.length; k++) {
              var dx = px.x - keptPx[k].x;
              var dy = px.y - keptPx[k].y;
              if (Math.sqrt(dx * dx + dy * dy) < LABEL_MIN_PIXEL_GAP) {
                shouldRender = false;
                break;
              }
            }
          }
        }
        if (!shouldRender) continue;
        if (canProject && px == null && isEndpoint) {
          try { px = map.project([midLng, midLat]); } catch (err2) { px = null; }
        }
        if (px && typeof px.x === 'number' && typeof px.y === 'number') {
          keptPx.push({ x: px.x, y: px.y });
        }
        // Compute perpendicular-outside offset in pixel space. For short/open
        // lines we fall through to the left-of-walk default; once the line
        // has 3+ points we have a real centroid and can pick the outside.
        var markerOffset = [0, 0];
        if (canProject) {
          var p0Px = null;
          var p1Px = null;
          try { p0Px = map.project(linePoints[i]); } catch (eP0) { p0Px = null; }
          try { p1Px = map.project(linePoints[i + 1]); } catch (eP1) { p1Px = null; }
          if (p0Px && p1Px && typeof p0Px.x === 'number' && typeof p1Px.x === 'number') {
            markerOffset = computeLabelOffsetPx({
              p0: p0Px,
              p1: p1Px,
              centroid: lineCentroid,
              isClosed: lineIsClosed,
            });
          }
        }
        var el = document.createElement('div');
        el.className = 'dy-seg-label';
        el.textContent = Math.round(len) + ' ft';
        var marker = new mapboxgl.Marker({ element: el, offset: markerOffset })
          .setLngLat([midLng, midLat])
          .addTo(map);
        labels.push(marker);
      }
    }
    return function() { labels.forEach(function(m) { m.remove(); }); };
  }, [props.points, props.lines, zoomTick]);

  // Live ghost distance label ("+42 ft")
  useEffect(function() {
    if (!mapRef.current || !mapboxgl || !mapboxgl.Marker) return;
    if (props.points.length === 0 || !props.hoverPoint) return;
    var map = mapRef.current;
    var last = props.points[props.points.length - 1];
    var len = distanceBetween(last, props.hoverPoint);
    if (len < 1) return;
    var midLng = (last[0] + props.hoverPoint[0]) / 2;
    var midLat = (last[1] + props.hoverPoint[1]) / 2;
    // Ghost segment uses the same perpendicular-offset logic. If we already
    // have >=2 committed points and the hover projects, we can compute a
    // centroid over (committed + hoverPoint) so the ghost label also picks
    // the outside for in-progress polygons. Otherwise it falls back to the
    // open-line default (left of walk direction).
    var markerOffset = [0, 0];
    var canProject = typeof map.project === 'function';
    if (canProject) {
      var p0Px = null;
      var p1Px = null;
      try { p0Px = map.project(last); } catch (eP0) { p0Px = null; }
      try { p1Px = map.project(props.hoverPoint); } catch (eP1) { p1Px = null; }
      if (p0Px && p1Px && typeof p0Px.x === 'number' && typeof p1Px.x === 'number') {
        var ghostLine = props.points.concat([props.hoverPoint]);
        var ghostIsClosed = ghostLine.length >= 3;
        var ghostCentroid = ghostIsClosed
          ? computeCentroidPx(ghostLine, function(pt) { return map.project(pt); })
          : null;
        markerOffset = computeLabelOffsetPx({
          p0: p0Px,
          p1: p1Px,
          centroid: ghostCentroid,
          isClosed: ghostIsClosed,
        });
      }
    }
    var el = document.createElement('div');
    el.className = 'dy-seg-label dy-seg-label-ghost';
    el.textContent = '+' + Math.round(len) + ' ft';
    var marker = new mapboxgl.Marker({ element: el, offset: markerOffset })
      .setLngLat([midLng, midLat])
      .addTo(map);
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

  // Hydrate lines from last autosave (persistence). P4.1 introduces a
  // multi-line state shape: `lines` is an array of point arrays. The loader
  // accepts both the new `{ lines: [...] }` shape and the legacy
  // `{ points: [...] }` flat shape so older saves keep working. Rendering
  // and buildAndComplete still read the flat `points` shim below — multi-line
  // rendering and UI land in later steps of the Task 5 migration.
  var linesState = useState(function() {
    try {
      var raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.lines)) return parsed.lines;
        if (parsed && Array.isArray(parsed.points)) return [parsed.points];
      }
    } catch (e) {}
    return [[]];
  });
  var lines = linesState[0];
  var setLines = linesState[1];

  // Flat shim for legacy readers (rendering, buildAndComplete, autosave write,
  // save-for-later email payload, etc.). Step 2 of Task 5 replaces the
  // Mapbox source/layer iteration with per-line iteration; Step 3 ships the
  // "Start new line" UI that actually uses the multi-line shape end-to-end.
  var points = lines.reduce(function(acc, l) { return acc.concat(l); }, []);

  // Mutation helper: any legacy `setPoints(updater)` call that targets the
  // currently-active line (the last line in `lines`) delegates through this.
  // Vertex click, drag, right-click-delete, undo, and segment-delete all
  // operate on the active line — that's semantically unchanged from pre-P4.1.
  function setActiveLinePoints(updater) {
    setLines(function(prev) {
      var next = prev.slice();
      var last = next[next.length - 1] || [];
      var updated = typeof updater === 'function' ? updater(last) : updater;
      next[next.length - 1] = updated;
      return next;
    });
  }

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

  // Pre-draw slope answer: "flat" | "some" | "all" | "skip". Gates map entry
  // until the customer answers (once per browser — persisted in localStorage
  // under gv_slope_answer). Cleared when the user resets the drawing so the
  // next session asks again.
  var slopeAnswerState = useState(function() {
    try { return localStorage.getItem('gv_slope_answer') || null; }
    catch (e) { return null; }
  });
  var slopeAnswer = slopeAnswerState[0];
  var setSlopeAnswer = slopeAnswerState[1];

  function handleSlopeAnswer(ans) {
    setSlopeAnswer(ans);
    try { localStorage.setItem('gv_slope_answer', ans); } catch (e) {}
  }

  // Per-segment racking-tier user overrides. Keyed by segment index; absence
  // means "use auto-detected EPQS classification". Cleared when the user picks
  // the "Auto" option from the dropdown.
  var overrideState = useState({});
  var segmentOverrides = overrideState[0];
  var setSegmentOverrides = overrideState[1];

  // Parcel fetch state. parcelData holds the { boundary, address, ... } payload
  // from the proxy on success. Fetch failures are logged to the console but
  // never surfaced to the buyer: the overlay is a nice-to-have, not a blocker.
  var parcelState = useState(null);
  var parcelData = parcelState[0];
  var setParcelData = parcelState[1];

  var mapInstanceRef = useRef(null);

  // EPQS auto-detect: debounced classification of the drawn line against
  // USGS 3DEP elevation. Result is read synchronously in buildAndComplete.
  var epqsResults = useRef(null);
  var epqsLoadingState = useState(false);
  var epqsLoading = epqsLoadingState[0];
  var setEpqsLoading = epqsLoadingState[1];

  useEffect(function() {
    if (!points || points.length < 2) { epqsResults.current = null; return; }
    var cancelled = false;
    var ceilingTimer = null;
    var timer = setTimeout(function() {
      setEpqsLoading(true);
      // Hard 12s ceiling: if the classification call hangs (cold-start USGS,
      // retry thrash), force-resolve to 'unknown' so the Continue CTA isn't
      // stuck. The worker-side retry + 10s upstream timeout should keep us
      // under this ceiling in the happy path.
      var classifyPromise = Promise.resolve().then(function() { return classifyDrawnLine(points, 6); });
      var ceiling = new Promise(function(resolve) {
        ceilingTimer = setTimeout(function() {
          resolve({ segmentClassifications: [], overallClassification: 'unknown', confidence: 'low', maxDeltaInches: 0 });
        }, 12000);
      });
      Promise.race([classifyPromise, ceiling])
        .then(function(result) { if (!cancelled) epqsResults.current = result; })
        .catch(function() { if (!cancelled) epqsResults.current = null; })
        .then(function() {
          if (ceilingTimer) clearTimeout(ceilingTimer);
          if (!cancelled) setEpqsLoading(false);
        });
    }, 800);
    return function() {
      cancelled = true;
      clearTimeout(timer);
      if (ceilingTimer) clearTimeout(ceilingTimer);
    };
  }, [points]);

  // On mount: check URL hash for a resume link (#dy-resume=...)
  useEffect(function() {
    var resumed = checkForDrawResume();
    if (resumed && resumed.points && Array.isArray(resumed.points)) {
      // Resume payloads are legacy flat-points; seed the active (only) line.
      setActiveLinePoints(resumed.points);
      if (resumed.location) {
        try { localStorage.setItem('gv_bridge_location', JSON.stringify(resumed.location)); } catch (e) {}
        setLocation(resumed.location);
      }
    }
  }, []);

  // Derived values
  var totalFt = totalFeet(points);
  // P4.3: sum corners + linePosts per-line. Calling the helper once on the
  // flat `points` shim would count each cross-line "bridge" vertex as a
  // direction change (a corner it isn't) and would spread post estimation
  // across the bridge gaps. Iterating per-line keeps each disconnected
  // fence run counted as its own geometry.
  var corners = 0;
  var linePosts = 0;
  for (var lineIdx_cs = 0; lineIdx_cs < lines.length; lineIdx_cs++) {
    var lineStats = countCornersAndLinePosts(lines[lineIdx_cs], 6);
    corners += lineStats.corners;
    linePosts += lineStats.linePosts;
  }

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

  // Autosave: debounced 2s after last change. P4.1 keeps the legacy flat
  // `{ points, ts }` shape on write — the loader accepts both flat and
  // `lines` shapes, so persistence stays backward-compatible with older
  // builds of the app and with in-flight email-resume payloads. Step 3 of
  // the Task 5 migration (when multiple lines actually diverge) is where
  // the write format flips to `{ lines, ts }`.
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

  // Keyboard undo (⌘Z / Ctrl+Z) — pops the last vertex off the active line.
  useEffect(function() {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        setActiveLinePoints(function(prev) { return prev.slice(0, -1); });
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
    setActiveLinePoints(function(prev) { return prev.slice(0, -1); });
  }

  function handleReset() {
    if (points.length === 0) return;
    if (!window.confirm('Clear your drawing?')) return;
    // Reset fully clears multi-line state back to a single empty active line.
    // Going through setLines directly (not setActiveLinePoints) avoids
    // leaving behind any other lines when multi-line UI lands in Step 3.
    setLines([[]]);
    setShowBreakdown(false);
    try { localStorage.removeItem('gv_slope_answer'); } catch (e) {}
    setSlopeAnswer(null);
  }

  // Push a fresh empty line onto `lines` so the next map click drops a
  // vertex that begins a disconnected run. No-op if the active (last)
  // line is already empty — prevents double-clicking "Start new line"
  // from stacking empty lines.
  function handleStartNewLine() {
    setLines(function(prev) {
      var last = prev[prev.length - 1] || [];
      if (last.length === 0) return prev;
      return prev.concat([[]]);
    });
  }

  function buildAndComplete(snapshotUrl) {
    // Per-line output shape (P4.3). The EPQS result's
    // `segmentClassifications` array is indexed over flat segments — which
    // includes implicit "bridge" segments sitting between line N's last
    // point and line N+1's first point. To map those flat indices to
    // per-line local segments without emitting bridge data, we walk each
    // line's points independently and carry a `flatIdx` counter that:
    //   - increments once per emitted segment (real fence segment), and
    //   - increments once per bridge between lines (to skip the garbage
    //     bridge entry in `segmentClassifications`).
    // Similarly, `segmentOverrides` keys are in flat-segment space, so we
    // use the same `flatIdx` for lookup.
    var outLines = [];
    var flatIdx = 0;
    var allSegments = []; // combined list, used for computeSlopedPostCount
    for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      var linePoints = lines[lineIdx];
      var segs = [];
      for (var i = 0; i < linePoints.length - 1; i++) {
        var lengthFt = distanceBetween(linePoints[i], linePoints[i + 1]);
        var epqsSeg = epqsResults.current && epqsResults.current.segmentClassifications
          ? epqsResults.current.segmentClassifications[flatIdx] : null;
        var autoTier = classificationToRackingTier(epqsSeg ? epqsSeg.classification : 'unknown');
        var userTier = segmentOverrides[flatIdx] || null;
        var seg = {
          index: i,
          mapLayerIdx: null,
          lengthFeet: lengthFt,
          color: '#c2410c',
          compassLabel: compassBearing(linePoints[i], linePoints[i + 1]),
          panels: Math.ceil(lengthFt / 6),
          start: linePoints[i],
          end: linePoints[i + 1],
          rackingTier: userTier || autoTier,
          rackingSource: userTier ? 'user' : 'auto',
          epqsClassification: epqsSeg ? epqsSeg.classification : 'unknown',
          epqsDeltaInches: epqsSeg ? epqsSeg.deltaInches : 0,
        };
        segs.push(seg);
        allSegments.push(seg);
        flatIdx++;
      }
      outLines.push({
        id: 'line-' + lineIdx,
        color: '#c2410c',
        points: linePoints.slice(),
        segments: segs,
      });
      // Skip the bridge slot in the flat EPQS/override indexing for the
      // boundary between this line and the next.
      if (lineIdx < lines.length - 1) flatIdx++;
    }
    var slopedPostCount = computeSlopedPostCount(allSegments, 6);
    // Each standalone drawn line (>=2 points) contributes 2 physical end
    // posts. Lines that don't have enough points to render don't.
    var emittedLines = outLines.filter(function(l) { return l.points.length >= 2; });
    var data = {
      totalFeet: totalFt,
      corners: corners,
      linePosts: linePosts,
      ends: emittedLines.length * 2,
      lines: outLines,
      slopeAnswer: slopeAnswer || null,
      slopedPostCount: slopedPostCount,
      epqsOverall: epqsResults.current ? epqsResults.current.overallClassification : 'unknown',
      epqsConfidence: epqsResults.current ? epqsResults.current.confidence : 'low',
      epqsMaxDeltaInches: epqsResults.current ? epqsResults.current.maxDeltaInches : 0,
      mapboxSnapshotUrl: snapshotUrl,
      source: 'auto',
      parcel: parcelData || null,
    };

    // Read postCap from saved design config (set by the 3D configurator before
    // the buyer enters the draw tool). Fall back to flat cap if unavailable.
    var savedPostCap = 'pcf';
    var savedFinialType = null;
    try {
      var rawSaved = window.localStorage && window.localStorage.getItem('gv_saved_design');
      if (rawSaved) {
        var parsedSaved = JSON.parse(rawSaved);
        if (parsedSaved && parsedSaved.postCap) savedPostCap = parsedSaved.postCap;
        if (parsedSaved && parsedSaved.finialType) savedFinialType = parsedSaved.finialType;
      }
    } catch (_) {}

    // Build the annotated snapshot asynchronously, then emit. The caller gets
    // both mapboxSnapshotUrl (raw) and annotatedSnapshotUrl (with legend).
    buildAnnotatedSnapshot(snapshotUrl, outLines, {
      postCap: savedPostCap,
      finialType: savedFinialType,
      totalFt: totalFt,
      corners: corners,
    }).then(function(annotatedUrl) {
      data.annotatedSnapshotUrl = annotatedUrl;
      if (typeof window !== 'undefined') window.__DRAW_TOOL_DATA__ = data;
      props.onComplete(data);
    }).catch(function() {
      // Overlay generation failed -- proceed without it so the buyer is not
      // blocked. The raw mapboxSnapshotUrl is still available.
      if (typeof window !== 'undefined') window.__DRAW_TOOL_DATA__ = data;
      props.onComplete(data);
    });
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
    // P4.1: single-line today, so targeting the active line via the shim is
    // correct. Step 3 may need to map segment index -> (lineIdx, localIdx)
    // once multiple lines actually coexist.
    setActiveLinePoints(function(prev) { return prev.filter(function(_, j) { return j !== i + 1; }); });
  }

  function handleSetTierOverride(i, value) {
    setSegmentOverrides(function(prev) {
      var next = Object.assign({}, prev);
      if (value === 'auto') delete next[i];
      else next[i] = value;
      return next;
    });
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

  // Pre-draw slope question: gates the map until the customer answers.
  // Order is address-entry → slope popup → map. "skip" is a valid answer
  // meaning the user dismissed without picking a slope tier.
  if (!slopeAnswer) {
    return React.createElement('div', { className: 'dy-container' },
      React.createElement(SlopePopup, {
        open: true,
        onAnswer: handleSlopeAnswer,
        onClose: function() { handleSlopeAnswer('skip'); },
      })
    );
  }

  // Build segments array for the dock, including auto-detected EPQS racking
  // tier (if available) and any user override. The dock renders a dropdown
  // per segment so customers can see and adjust the tier.
  var dockSegments = [];
  for (var si = 0; si < points.length - 1; si++) {
    var epqsSeg = epqsResults.current && epqsResults.current.segmentClassifications
      ? epqsResults.current.segmentClassifications[si] : null;
    var autoTier = classificationToRackingTier(epqsSeg ? epqsSeg.classification : 'unknown');
    var userTier = segmentOverrides[si] || null;
    dockSegments.push({
      lengthFeet: distanceBetween(points[si], points[si + 1]),
      rackingTier: userTier || autoTier,
      rackingSource: userTier ? 'user' : 'auto',
    });
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

    // Map canvas — passes cinematic flag so first visit flies from globe.
    // The `setPoints` prop is actually setActiveLinePoints from P4.1: the
    // MapScreen internals (click/drag/contextmenu) all mutate the active
    // line, and MapScreen still sees the flat `points` shim for rendering.
    React.createElement(MapScreen, {
      location: location,
      points: points,
      lines: lines,
      setPoints: setActiveLinePoints,
      hoverPoint: hoverPoint,
      setHoverPoint: setHoverPoint,
      mapInstanceRef: mapInstanceRef,
      cinematic: cinematic,
      setParcelData: setParcelData,
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
      linePosts: linePosts,
      priceRange: priceRange,
      segments: dockSegments,
      epqsLoading: epqsLoading,
      lines: lines,
      onUndo: handleUndo,
      onReset: handleReset,
      onStartNewLine: handleStartNewLine,
      onContinue: handleContinue,
      onToggleBreakdown: handleToggleBreakdown,
      onDeleteSegment: handleDeleteSegment,
      onSetTierOverride: handleSetTierOverride,
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

export { MapScreen, MorphingDock };
export default MapboxDrawView;
