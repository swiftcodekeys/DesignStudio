// QuoteStep2_Layout.js — Layout & Posts step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React, { useState, useEffect } from 'react';
import { Mountains, WaveSine, Minus, Plus, Trash, CaretDown, CaretUp, Check, Warning } from '@phosphor-icons/react';
import InfoPopup from './InfoPopup';
import { PRIVACY_RACKABLE } from './retailPricing';
import { TIER_COLORS } from './tierColors.js';
import { SLOPE_ANSWER_LABELS } from './slopeAnswers.js';

// ---- Helpers ----
function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

function sectionHeader(title, infoProps) {
  return el('div', { className: 'qs1-section-header' },
    el('h4', { className: 'qs1-section-title' }, title),
    infoProps ? React.createElement(InfoPopup, infoProps) : null
  );
}

// Read-only summary row used by Task 15 when the buyer already answered
// terrain/slope during the draw flow. Matches the qs1-collapsible-* styling
// from QuoteStep1_Style so the visual language is consistent across steps.
function readOnlySummary(opts) {
  // opts: { title, eyebrow, valueLabel, onChange, changeLabel, testId }
  return el('div', { className: 'qs1-collapsible-header', 'data-test': opts.testId || null },
    el('div', { className: 'qs1-collapsible-label-row' },
      el('h4', { className: 'qs1-section-title' }, opts.title),
      el('div', { className: 'qs1-collapsible-value' },
        opts.eyebrow ? el('span', { className: 'qb-readonly-eyebrow' }, opts.eyebrow) : null,
        el('span', { className: 'qs1-collapsible-value-text' }, opts.valueLabel)
      )
    ),
    el('button', {
      type: 'button',
      className: 'qs1-collapsible-toggle',
      onClick: opts.onChange,
      'aria-expanded': 'false',
      'aria-label': opts.changeLabel || 'Change answer',
    }, opts.changeLabel || 'Change')
  );
}

// ---- Task 9: Racking vs stair-step SVG diagrams ----
// Inline SVG, no external assets. 4 panels on a 15 degree grade.
// Approximate 240x100 viewBox. Uses site tokens via currentColor / CSS vars.
//
// Racking: pickets stay vertical, top and bottom rails angle with the slope
// so the top forms a smooth diagonal.
// Stair-step: each panel is level (horizontal rails) and posts step up at
// each panel break, giving a staircase profile.
function rackingDiagramSvg() {
  // Ground: slopes down-right to simulate a 15 degree descending grade.
  // 4 panels span x=20..220 (50 wide each). Top/bottom rails follow the
  // slope (left higher than right). Pickets stay vertical.
  var groundY1 = 55;
  var groundY2 = 95;
  var postX = [20, 70, 120, 170, 220];
  // Rail Y at each x along the slope. Linear interpolation matches the
  // ground slope so the fence top rises smoothly left to right.
  function slopeY(x) {
    var t = (x - 20) / 200; // 0..1 across the run
    return 30 + t * 40;     // top rail Y at left vs right
  }
  return el('svg', {
    viewBox: '0 0 240 100',
    width: '100%',
    height: 'auto',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
    style: { display: 'block' },
  },
    // Ground line
    el('line', {
      x1: 0, y1: groundY1, x2: 240, y2: groundY2,
      stroke: 'var(--text-hint, #8e95a0)', strokeWidth: 1, strokeDasharray: '3 3',
    }),
    // Top rail (diagonal, follows slope)
    el('line', {
      x1: postX[0], y1: slopeY(postX[0]),
      x2: postX[4], y2: slopeY(postX[4]),
      stroke: 'var(--brand, #6BA3C2)', strokeWidth: 2,
    }),
    // Bottom rail (diagonal, parallel to top, above ground)
    el('line', {
      x1: postX[0], y1: slopeY(postX[0]) + 32,
      x2: postX[4], y2: slopeY(postX[4]) + 32,
      stroke: 'var(--brand, #6BA3C2)', strokeWidth: 2,
    }),
    // Posts + vertical pickets. Posts anchor top rail to ground.
    postX.map(function(px, i) {
      return el('line', {
        key: 'p-' + i,
        x1: px, y1: slopeY(px) - 4,
        x2: px, y2: slopeY(px) + 38,
        stroke: 'var(--text-primary, #1a1a2e)', strokeWidth: 1.5,
      });
    }),
    // Vertical pickets between posts (4 per panel)
    postX.slice(0, 4).map(function(px, pi) {
      var picks = [];
      var nextX = postX[pi + 1];
      for (var k = 1; k <= 4; k++) {
        var x = px + (nextX - px) * (k / 5);
        // Picket top/bottom intersect the diagonal rails at the same x
        var topY = slopeY(x);
        picks.push(el('line', {
          key: 'pk-' + pi + '-' + k,
          x1: x, y1: topY,
          x2: x, y2: topY + 32,
          stroke: 'var(--text-primary, #1a1a2e)', strokeWidth: 0.8, opacity: 0.7,
        }));
      }
      return picks;
    })
  );
}

function stairStepDiagramSvg() {
  // Same 4 panels, same slope ground, but each panel is level (horizontal
  // rails) and posts step up at each panel break.
  var groundY1 = 55;
  var groundY2 = 95;
  var postX = [20, 70, 120, 170, 220];
  // Each panel top is level. Step down by ~10 px per panel to produce the
  // staircase profile on a descending grade.
  var panelTops = [30, 40, 50, 60]; // one per panel (left to right)
  return el('svg', {
    viewBox: '0 0 240 100',
    width: '100%',
    height: 'auto',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': 'true',
    style: { display: 'block' },
  },
    // Ground line
    el('line', {
      x1: 0, y1: groundY1, x2: 240, y2: groundY2,
      stroke: 'var(--text-hint, #8e95a0)', strokeWidth: 1, strokeDasharray: '3 3',
    }),
    // Horizontal top + bottom rails per panel
    panelTops.map(function(topY, i) {
      return el('g', { key: 'panel-' + i },
        el('line', {
          x1: postX[i], y1: topY, x2: postX[i + 1], y2: topY,
          stroke: 'var(--brand, #6BA3C2)', strokeWidth: 2,
        }),
        el('line', {
          x1: postX[i], y1: topY + 32, x2: postX[i + 1], y2: topY + 32,
          stroke: 'var(--brand, #6BA3C2)', strokeWidth: 2,
        })
      );
    }),
    // Posts. Each post spans from min(adjacent panel tops) - 4 to ground.
    postX.map(function(px, i) {
      var leftTop = i > 0 ? panelTops[i - 1] : panelTops[0];
      var rightTop = i < panelTops.length ? panelTops[i] : panelTops[panelTops.length - 1];
      var topMost = Math.min(leftTop, rightTop) - 4;
      // Base the post at the slope line so the staircase sits on the ground.
      var t = (px - 20) / 200;
      var groundAt = groundY1 + t * (groundY2 - groundY1);
      return el('line', {
        key: 'p-' + i,
        x1: px, y1: topMost,
        x2: px, y2: groundAt,
        stroke: 'var(--text-primary, #1a1a2e)', strokeWidth: 1.5,
      });
    }),
    // Vertical pickets per panel (4 per panel)
    panelTops.map(function(topY, pi) {
      var picks = [];
      var nextX = postX[pi + 1];
      var px = postX[pi];
      for (var k = 1; k <= 4; k++) {
        var x = px + (nextX - px) * (k / 5);
        picks.push(el('line', {
          key: 'pk-' + pi + '-' + k,
          x1: x, y1: topY,
          x2: x, y2: topY + 32,
          stroke: 'var(--text-primary, #1a1a2e)', strokeWidth: 0.8, opacity: 0.7,
        }));
      }
      return picks;
    })
  );
}

// Side-by-side diagram block with captions. Stacks on mobile via CSS.
function rackingVsStairStepDiagrams() {
  return el('div', {
    className: 'qb-rack-diagrams',
    'data-test': 'qb-rack-diagrams',
  },
    el('figure', { className: 'qb-rack-diagram' },
      rackingDiagramSvg(),
      el('figcaption', { className: 'qb-rack-diagram-caption' }, 'Racking (preferred)')
    ),
    el('figure', { className: 'qb-rack-diagram' },
      stairStepDiagramSvg(),
      el('figcaption', { className: 'qb-rack-diagram-caption' }, 'Stair-step')
    )
  );
}

var TERRAIN_OPTIONS = [
  { id: 'flat',   name: 'Flat',   desc: 'Level ground, no grade changes', icon: Minus },
  { id: 'sloped', name: 'Sloped', desc: 'Consistent uphill or downhill grade', icon: Mountains },
  { id: 'mixed',  name: 'Mixed',  desc: 'Some flat, some sloped sections', icon: WaveSine },
];

// Plain-language slope options shown to the buyer. The card label describes
// what their yard looks like, not the internal tier name. The id stays
// 'standard' | 'rackable' | 'heavy-rackable' so Ultra / PO / pricing continue
// unchanged downstream. Grandview team can see the internal tier via the PO
// or admin view.
var RACKING_TIERS = [
  { id: 'standard',       name: 'No Slope',     desc: 'Most yards. Grade change is hardly noticeable.' },
  { id: 'rackable',       name: 'Sloped',       desc: 'Yard has a visible uphill or downhill grade along the fence line.' },
  { id: 'heavy-rackable', name: 'Heavy Slope',  desc: 'Steep drop across the run. Think a tall retaining wall or a hillside lot.' },
];

// SLOPE_ANSWER_LABELS imported from slopeAnswers.js so the Terrain read-only
// summary copy stays in lockstep with the SlopePopup choice values.

// Labels for the auto-detected racking tier summary. Mirrors RACKING_TIERS
// with plain-language copy for the read-only "Grandview detected this" row.
var RACKING_TIER_SUMMARY_LABELS = {
  'standard':       'No Slope',
  'rackable':       'Sloped',
  'heavy-rackable': 'Heavy Slope',
};

// Task 16: per-segment racking breakdown. Per-segment rackingTier values come
// from geometryUtils.classificationToRackingTier via MapboxDrawView, producing
// 'standard' | 'rackable' | 'heavy' | 'steps' | 'unknown'. We also tolerate
// the alternate 'heavy-rack' / 'heavy-rackable' spellings that appear in
// other parts of the codebase (legendOverlay, SegmentCard override dropdown)
// so whatever shape lands here normalizes to one display bucket per tier.
var BREAKDOWN_TIER_ORDER = ['standard', 'rackable', 'heavy', 'steps'];
var BREAKDOWN_TIER_LABELS = {
  'standard': 'Standard',
  'rackable': 'Rackable',
  'heavy':    'Heavy Rack',
  'steps':    'Stair-Stepped',
};

function normalizeBreakdownTier(tier) {
  if (!tier) return 'standard';
  if (tier === 'heavy-rack' || tier === 'heavy-rackable') return 'heavy';
  if (tier === 'stair-step' || tier === 'stair-stepped') return 'steps';
  if (tier === 'unknown') return 'standard';
  return tier;
}

// Walk drawToolData.lines[].segments[] and return a per-tier breakdown.
// Shape: { totalSegments, byTier: { standard: { count, lengths: [..] }, ... } }
// Segments are tolerated from either drawToolData.lines[].segments[] (the
// current shape) or a flat drawToolData.segments[] fallback. Returns null
// when no segments with a rackingTier field are present.
function buildRackingBreakdown(drawToolData) {
  if (!drawToolData) return null;
  var flat = [];
  if (Array.isArray(drawToolData.lines)) {
    for (var li = 0; li < drawToolData.lines.length; li++) {
      var line = drawToolData.lines[li];
      var segs = (line && Array.isArray(line.segments)) ? line.segments : [];
      for (var si = 0; si < segs.length; si++) flat.push(segs[si]);
    }
  }
  if (flat.length === 0 && Array.isArray(drawToolData.segments)) {
    for (var fi = 0; fi < drawToolData.segments.length; fi++) {
      flat.push(drawToolData.segments[fi]);
    }
  }
  var rackableSegs = flat.filter(function(s) { return s && typeof s.rackingTier === 'string'; });
  if (rackableSegs.length === 0) return null;

  var byTier = {};
  rackableSegs.forEach(function(s) {
    var tier = normalizeBreakdownTier(s.rackingTier);
    if (!byTier[tier]) byTier[tier] = { count: 0, lengths: [] };
    byTier[tier].count += 1;
    // segments use .lengthFeet (MapboxDrawView buildAndComplete) but be
    // defensive against .length / .lengthFt shapes seen elsewhere.
    var lenFt = 0;
    if (typeof s.lengthFeet === 'number') lenFt = s.lengthFeet;
    else if (typeof s.length === 'number') lenFt = s.length;
    else if (typeof s.lengthFt === 'number') lenFt = s.lengthFt;
    byTier[tier].lengths.push(Math.round(lenFt));
  });

  return { totalSegments: rackableSegs.length, byTier: byTier };
}

// Scroll target: the sidebar annotated-drawing image. Using querySelector
// on the known [data-test] attribute keeps this uncoupled from QuoteBuilder's
// ref wiring and survives re-renders / step changes.
function scrollToAnnotatedDrawing() {
  if (typeof document === 'undefined') return;
  var img = document.querySelector('[data-test="quote-design-preview"]');
  if (!img) return;
  try {
    img.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (_) {
    // Older browsers / jsdom: best effort.
    if (typeof img.scrollIntoView === 'function') img.scrollIntoView();
  }
}

function rackingBreakdownSection(breakdown) {
  if (!breakdown) return null;
  var tiers = BREAKDOWN_TIER_ORDER.filter(function(t) {
    return breakdown.byTier[t] && breakdown.byTier[t].count > 0;
  });
  // Nothing to summarize when only one tier is present and it's standard --
  // the whole point of the card is to surface the mix.
  if (tiers.length === 0) return null;
  if (tiers.length === 1 && tiers[0] === 'standard') return null;

  return el('div', {
    className: 'qb-rack-breakdown',
    'data-test': 'qb-rack-breakdown',
  },
    sectionHeader('Racking breakdown'),
    el('ul', { className: 'qb-rack-breakdown-list' },
      tiers.map(function(tier) {
        var bucket = breakdown.byTier[tier];
        var label = BREAKDOWN_TIER_LABELS[tier] || tier;
        var countWord = bucket.count === 1 ? 'segment' : 'segments';
        var lens = bucket.lengths.map(function(n) { return n + ' ft'; }).join(', ');
        return el('li', {
          key: tier,
          className: 'qb-rack-breakdown-row',
          'data-test': 'qb-rack-breakdown-row-' + tier,
        },
          el('span', {
            className: 'qb-rack-breakdown-dot',
            style: { background: TIER_COLORS[tier] || TIER_COLORS.standard },
            'aria-hidden': 'true',
          }),
          el('span', { className: 'qb-rack-breakdown-count' },
            bucket.count + ' ' + countWord + ' at '
          ),
          el('span', { className: 'qb-rack-breakdown-tier' }, label),
          el('span', { className: 'qb-rack-breakdown-lengths' }, ' (' + lens + ')')
        );
      })
    ),
    el('p', { className: 'qb-rack-breakdown-legend' },
      'Yellow = standard. Blue = rackable. Red = heavy rack. ',
      'Look at your drawing to see which run is which.'
    ),
    el('button', {
      type: 'button',
      className: 'qb-rack-breakdown-link',
      onClick: scrollToAnnotatedDrawing,
      'data-test': 'qb-rack-breakdown-scroll',
    },
      'See color-coded runs on your annotated drawing →'
    )
  );
}

var POST_SIZES = {
  residential: '2" x 2"',
  commercial:  '2.5" x 2.5"',
  industrial:  '3" x 3"',
};

// ============================================================
// QuoteStep2_Layout Component
// ============================================================
function QuoteStep2_Layout(props) {
  var data = props.data;
  var update = props.update;
  var drawToolData = props.drawToolData;

  // Local state
  var advancedState = useState(false);
  var advancedMode = advancedState[0];
  var setAdvancedMode = advancedState[1];

  // Task 15: Terrain section collapses to a read-only summary when the
  // SlopePopup already captured the buyer's terrain answer during the draw
  // flow. Clicking Change reveals the original 3-card pick UI. Initial state
  // is "expanded" when no slopeAnswer exists so direct-quote buyers (no
  // drawToolData, no slopeAnswer) still see the full picker on first render.
  var terrainExpandedState = useState(!props.data.slopeAnswer);
  var terrainExpanded = terrainExpandedState[0];
  var setTerrainExpanded = terrainExpandedState[1];

  // Task 15: Racking Tier collapses to a read-only summary when drawToolData
  // pre-filled the tier from EPQS classification, or when slopeAnswer signals
  // non-flat terrain. Buyers can still expand to override.
  var rackingTierDetected = !!(props.drawToolData || (props.data.slopeAnswer && props.data.slopeAnswer !== 'flat'));
  var rackingExpandedState = useState(!rackingTierDetected);
  var rackingExpanded = rackingExpandedState[0];
  var setRackingExpanded = rackingExpandedState[1];

  // Initialize layout defaults
  var linearFeet = data.linearFeet || (drawToolData ? Math.round(drawToolData.totalFeet) : 100);
  var terrain = data.terrain || 'flat';
  var slopeMethod = data.slopeMethod || 'racked';
  var rackingTier = data.rackingTier || 'standard';
  var corners = data.corners || 0;
  var ends = data.ends != null ? data.ends : 2;
  var sharpAngles = data.sharpAngles || 0;
  var gentleCurves = !!data.gentleCurves;

  // Runs for advanced mode
  var runsState = useState(function() {
    if (data.runs && data.runs.length) return data.runs;
    if (drawToolData && drawToolData.segments && drawToolData.segments.length) {
      return drawToolData.segments.map(function(seg, i) {
        return { label: seg.label || ('Run ' + (i + 1)), length: seg.length || 0, terrain: seg.terrain || 'flat' };
      });
    }
    return [{ label: 'Run 1', length: linearFeet, terrain: terrain }];
  });
  var runs = runsState[0];
  var setRuns = runsState[1];

  // Auto-expand advanced mode if draw tool has multiple segments
  useEffect(function() {
    if (drawToolData && drawToolData.segments && drawToolData.segments.length > 1) {
      setAdvancedMode(true);
    }
    // Seed data.slopedPostCount from drawToolData on mount so downstream
    // pricing (priceCalculator.js) can charge the $4.75 racking surcharge
    // only on posts belonging to rackable segments. Don't clobber a value
    // the parent has already set (manual-entry callers keep their own).
    if (drawToolData && drawToolData.slopedPostCount != null && data.slopedPostCount == null) {
      update({ slopedPostCount: drawToolData.slopedPostCount });
    }
  }, []);

  // Absorb draw-tool metadata into wizard data (Task 1.9.3):
  //   - Mark _source='auto' so priceCalculator applies the 5% material pad.
  //   - Pre-fill rackingTier from EPQS overall slope classification.
  //   - Fallback to _source='manual' when no drawToolData and no prior source.
  // Gate on data._source !== 'auto' so this only fires once per drawToolData
  // absorption, not on every parent re-render.
  useEffect(function() {
    if (drawToolData && data._source !== 'auto') {
      update({
        linearFeet: Math.round(drawToolData.totalFeet || 0),
        corners: drawToolData.corners || 0,
        ends: drawToolData.ends || 2,
        _source: 'auto',
        rackingTier: drawToolData.epqsOverall === 'sloped' ? 'rackable'
          : drawToolData.epqsOverall === 'steep' || drawToolData.epqsOverall === 'steps' ? 'heavy-rackable'
          : 'standard',
      });
    } else if (!drawToolData && !data._source) {
      update({ _source: 'manual' });
    }
  }, [drawToolData]);

  // Sync runs total back to linearFeet in advanced mode
  var runsTotal = runs.reduce(function(sum, r) { return sum + (parseFloat(r.length) || 0); }, 0);

  // Derived: any non-flat terrain?
  var hasSlope = advancedMode
    ? runs.some(function(r) { return r.terrain !== 'flat'; })
    : terrain !== 'flat';

  // Post calculations
  var grade = data.grade || 'residential';
  var panelLength = grade === 'industrial' ? 8 : 6;
  var totalLinear = advancedMode ? runsTotal : (parseFloat(linearFeet) || 0);
  var panelCount = Math.ceil(totalLinear / panelLength);
  var gates = data.gates || 0;
  var totalPosts = panelCount + 1;
  var gatePosts = gates * 2;
  var linePosts = Math.max(0, totalPosts - corners - ends - gatePosts);
  var postSize = POST_SIZES[grade] || POST_SIZES.residential;

  // Racking warning check
  var hasRackingConflict = !!(data.puppyPickets && (data.butterflies || data.scrolls));

  // Task 16: per-segment racking breakdown from drawToolData. Null when the
  // buyer didn't come through the draw flow (instant-quote) or when segments
  // carry no rackingTier data.
  var rackingBreakdown = buildRackingBreakdown(drawToolData);

  // Update parent on change
  function syncLayout(changes) {
    update(Object.assign({
      linearFeet: advancedMode ? runsTotal : linearFeet,
      terrain: terrain,
      slopeMethod: slopeMethod,
      rackingTier: rackingTier,
      corners: corners,
      ends: ends,
      sharpAngles: sharpAngles,
      gentleCurves: gentleCurves,
      runs: advancedMode ? runs : null,
      // Preserve per-segment-derived sloped-post count across re-syncs so
      // priceCalculator sees it on the final calculateZoneQuote(data) call.
      slopedPostCount: data.slopedPostCount != null
        ? data.slopedPostCount
        : (drawToolData ? drawToolData.slopedPostCount : undefined),
      // Preserve the pricing-meta source flag so subsequent field edits don't
      // nuke the 'auto' marker set by the drawToolData-absorption effect.
      _source: data._source,
    }, changes));
  }

  function updateRun(index, field, value) {
    var newRuns = runs.map(function(r, i) {
      if (i !== index) return r;
      var updated = Object.assign({}, r);
      updated[field] = value;
      return updated;
    });
    setRuns(newRuns);
    var newTotal = newRuns.reduce(function(sum, r) { return sum + (parseFloat(r.length) || 0); }, 0);
    syncLayout({ runs: newRuns, linearFeet: newTotal });
  }

  function addRun() {
    var newRuns = runs.concat([{ label: 'Run ' + (runs.length + 1), length: 0, terrain: 'flat' }]);
    setRuns(newRuns);
    syncLayout({ runs: newRuns });
  }

  function removeRun(index) {
    if (runs.length <= 1) return;
    var newRuns = runs.filter(function(_, i) { return i !== index; });
    setRuns(newRuns);
    var newTotal = newRuns.reduce(function(sum, r) { return sum + (parseFloat(r.length) || 0); }, 0);
    syncLayout({ runs: newRuns, linearFeet: newTotal });
  }

  return el('div', { className: 'qs1-container' },

    // ---- Intro: reassure the buyer the drawing was captured ----
    drawToolData ? el('div', { className: 'qb-layout-intro' },
      el('p', null,
        "Here's what we captured from your drawing. Please double-check each field. " +
        "These measurements are exactly what we'll build to. You can adjust any value below if your sketch was rough."
      )
    ) : null,

    // ---- Draw Tool Banner ----
    drawToolData ? (function(){
      var runCount = drawToolData.segments ? drawToolData.segments.length : 1;
      var feet = Math.round(drawToolData.totalFeet || 0);
      return el('div', { className: 'qb-layout-draw-banner' },
        el(Check, { size: 16, weight: 'bold' }),
        ' Layout imported from your drawing. ',
        el('strong', null, feet + ' ft'),
        ' across ',
        el('strong', null, runCount + (runCount === 1 ? ' run' : ' runs')),
        drawToolData.address ? el('span', null, ' from ' + drawToolData.address) : null
      );
    })() : null,

    // ---- Total Linear Feet (simple mode) ----
    !advancedMode ? el('div', null,
      sectionHeader('Total Linear Feet', {
        title: 'Linear Footage',
        text: 'Measure the total length of your fence line in feet. Include all straight runs but not gate openings. If unsure, use your property survey or measure with a tape measure.',
      }),
      el('div', { className: 'qb-layout-footage-row' },
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: linearFeet,
          min: 1,
          onChange: function(e) {
            var val = parseInt(e.target.value, 10) || 0;
            syncLayout({ linearFeet: val });
          },
        }),
        el('span', { className: 'qb-layout-unit' }, 'feet')
      )
    ) : null,

    // ---- Terrain (simple mode) ----
    // Task 15: if SlopePopup already captured the buyer's terrain answer
    // (data.slopeAnswer) AND the buyer hasn't asked to change it, render a
    // read-only summary instead of re-presenting the 3-card pick grid.
    // Direct-quote buyers (no slopeAnswer) still see the full picker.
    !advancedMode ? el('div', { 'data-test': 'qb-terrain-section' },
      (data.slopeAnswer && !terrainExpanded)
        ? readOnlySummary({
            title: 'Terrain',
            eyebrow: 'Your answer from the draw step:',
            valueLabel: SLOPE_ANSWER_LABELS[data.slopeAnswer] || data.slopeAnswer,
            onChange: function() { setTerrainExpanded(true); },
            changeLabel: 'Change',
            testId: 'qb-terrain-readonly',
          })
        : el('div', null,
            sectionHeader('Terrain', {
              title: 'Terrain Type',
              text: 'Flat terrain means no grade change along the fence line. Sloped means the ground rises or falls consistently. Mixed means some sections are flat and others are sloped.',
            }),
            el('div', { className: 'qb-layout-terrain-grid' },
              TERRAIN_OPTIONS.map(function(t) {
                return el('button', {
                  key: t.id,
                  className: 'qb-layout-terrain-card' + (terrain === t.id ? ' selected' : ''),
                  onClick: function() { syncLayout({ terrain: t.id }); },
                },
                  React.createElement(t.icon, { size: 24, weight: 'duotone' }),
                  el('div', { className: 'qb-layout-terrain-name' }, t.name),
                  el('div', { className: 'qb-layout-terrain-desc' }, t.desc)
                );
              })
            )
          )
    ) : null,

    // ---- Advanced Mode Toggle ----
    el('button', {
      className: 'qb-layout-advanced-toggle',
      onClick: function() {
        var next = !advancedMode;
        setAdvancedMode(next);
        if (next && runs.length === 1 && runs[0].length === 0) {
          var init = [{ label: 'Run 1', length: linearFeet || 100, terrain: terrain }];
          setRuns(init);
          syncLayout({ runs: init });
        }
      },
    },
      React.createElement(advancedMode ? CaretUp : CaretDown, { size: 14 }),
      ' I have multiple runs with different terrain'
    ),

    // ---- Advanced Runs ----
    advancedMode ? el('div', { className: 'qb-layout-runs' },
      runs.map(function(run, i) {
        return el('div', { key: i, className: 'qb-run-card' },
          el('div', { className: 'qb-run-header' },
            el('input', {
              type: 'text',
              className: 'qb-run-label',
              value: run.label,
              onChange: function(e) { updateRun(i, 'label', e.target.value); },
            }),
            runs.length > 1 ? el('button', {
              className: 'qb-run-delete',
              onClick: function() { removeRun(i); },
              'aria-label': 'Remove run',
            }, React.createElement(Trash, { size: 14 })) : null
          ),
          el('div', { className: 'qb-run-fields' },
            el('div', { className: 'qb-field-group' },
              el('label', null, 'Length'),
              el('input', {
                type: 'number',
                className: 'qb-input',
                value: run.length,
                min: 0,
                onChange: function(e) { updateRun(i, 'length', parseInt(e.target.value, 10) || 0); },
              }),
              el('span', { className: 'qb-layout-unit-sm' }, 'ft')
            ),
            el('div', { className: 'qb-field-group' },
              el('label', null, 'Terrain'),
              el('div', { className: 'qb-layout-terrain-mini' },
                TERRAIN_OPTIONS.map(function(t) {
                  return el('button', {
                    key: t.id,
                    className: 'qb-toggle-sm' + (run.terrain === t.id ? ' active' : ''),
                    onClick: function() { updateRun(i, 'terrain', t.id); },
                  }, t.name);
                })
              )
            )
          )
        );
      }),
      el('button', {
        className: 'qb-add-btn',
        onClick: addRun,
      }, React.createElement(Plus, { size: 14 }), ' Add another run'),
      el('div', { className: 'qb-run-total' },
        el('strong', null, runsTotal), ' linear feet across ',
        el('strong', null, runs.length), ' run' + (runs.length !== 1 ? 's' : '')
      )
    ) : null,

    // ---- Privacy racking note (privacy panels cannot rack) ----
    hasSlope && data.fenceType === 'privacy' ? el('div', { className: 'qb-rack-section' },
      sectionHeader('Slope Handling'),
      el('div', { className: 'qb-layout-warning' },
        React.createElement(Warning, { size: 16 }),
        ' Privacy panels are not rackable. Stair-stepping is recommended for sloped terrain.'
      )
    ) : null,

    // ---- Rackability (conditional — ornamental only) ----
    // Pass 4 Task 8 + 9 reorder:
    //   1. Racking Tier picker (plain-language "No Slope / Sloped / Heavy Slope").
    //      Task 15 read-only summary still applies when drawToolData pre-filled.
    //   2. Racking vs stair-step SVG diagram block + educational copy.
    //   3. Slope Handling choice (racked vs stair-stepped) below the diagrams
    //      so the buyer sees the comparison first, then picks.
    hasSlope && data.fenceType !== 'privacy' ? el('div', { className: 'qb-rack-section' },

      // 1. Racking Tier picker (plain-language).
      // Task 15: when the draw flow already detected the tier (via EPQS
      // classification in drawToolData) or slopeAnswer signals non-flat
      // terrain, render a read-only summary with a "Change racking tier"
      // affordance instead of the full tier picker. Expanded picker is still
      // one click away for buyers who want to override.
      el('div', { className: 'qb-rack-tiers', 'data-test': 'qb-racking-section' },
        (rackingTierDetected && !rackingExpanded)
          ? readOnlySummary({
              title: 'Racking Tier',
              eyebrow: 'Grandview detected:',
              valueLabel: RACKING_TIER_SUMMARY_LABELS[rackingTier] || RACKING_TIER_SUMMARY_LABELS.standard,
              onChange: function() { setRackingExpanded(true); },
              changeLabel: 'Change racking tier',
              testId: 'qb-racking-readonly',
            })
          : el('div', null,
              sectionHeader('How much slope does your yard have?', {
                title: 'Slope and racking',
                text: 'Pick the option that matches what your yard looks like. Grandview uses this to decide whether your panels need standard rails or double-punched rails that bend further. Higher slope tiers cost a little more per foot.',
              }),
              RACKING_TIERS.map(function(tier) {
                return el('button', {
                  key: tier.id,
                  className: 'qb-rack-tier' + (rackingTier === tier.id ? ' selected' : ''),
                  onClick: function() { syncLayout({ rackingTier: tier.id }); },
                },
                  el('div', { className: 'qb-rack-tier-name' }, tier.name),
                  el('div', { className: 'qb-rack-tier-desc' }, tier.desc),
                  rackingTier === tier.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
                );
              })
            )
      ),

      // Task 16: per-segment racking breakdown. Renders alongside the overall
      // Racking Tier picker so the buyer sees the mix ("4 at Standard, 2 at
      // Rackable, 1 at Heavy Rack") and can cross-reference the color-coded
      // annotated drawing in the sidebar. Only renders when drawToolData
      // carries per-segment rackingTier data and there is more than one tier
      // (or any non-standard tier) represented.
      rackingBreakdownSection(rackingBreakdown),

      // 2. Racking vs stair-step education block. Inline SVG diagrams side by
      // side on desktop, stacked on mobile via CSS. Educational copy sits
      // below so the buyer reads the comparison before making a pick.
      rackingVsStairStepDiagrams(),
      el('p', { className: 'qb-rack-education-copy', 'data-test': 'qb-rack-education-copy' },
        'Racking is the preferred method for most residential installations. ',
        'Stair-stepping is more common on large commercial applications and very ',
        'steep slopes (greater than 30 degrees). For sloped installations, every ',
        'fence is custom-fabricated to fit your property.'
      ),

      // 3. Slope Handling choice. Repositioned below the diagram + copy so the
      // buyer sees the comparison first, then picks.
      el('div', { className: 'qb-rack-slope-handling' },
        sectionHeader('How should panels follow the slope?', {
          title: 'Racking vs Stair-Stepping',
          text: 'Racked panels follow the ground smoothly with pickets staying vertical. Stair-stepped panels stay level and step down, leaving triangular gaps at the bottom.',
        }),
        el('div', { className: 'qb-rack-compare' },
          el('button', {
            className: 'qb-rack-card' + (slopeMethod === 'racked' ? ' selected' : ''),
            onClick: function() { syncLayout({ slopeMethod: 'racked' }); },
          },
            el('div', { className: 'qb-rack-img-placeholder' },
              el('img', { src: 'assets/education/racking-standard.jpg', alt: 'Racked panels', className: 'qb-rack-img' })
            ),
            el('div', { className: 'qb-rack-card-title' }, 'Racked'),
            el('div', { className: 'qb-rack-card-desc' }, 'Panels follow the slope. Pickets stay vertical. Clean, continuous look.'),
            slopeMethod === 'racked' ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 14, weight: 'bold' })) : null
          ),
          el('button', {
            className: 'qb-rack-card' + (slopeMethod === 'stair-stepped' ? ' selected' : ''),
            onClick: function() { syncLayout({ slopeMethod: 'stair-stepped' }); },
          },
            el('div', { className: 'qb-rack-img-placeholder' },
              el('img', { src: 'assets/education/post-blank-stair.jpg', alt: 'Stair-stepped panels', className: 'qb-rack-img' })
            ),
            el('div', { className: 'qb-rack-card-title' }, 'Stair-Stepped'),
            el('div', { className: 'qb-rack-card-desc' }, 'Panels stay level and step down. Gaps appear at the bottom.'),
            slopeMethod === 'stair-stepped' ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 14, weight: 'bold' })) : null
          )
        )
      ),

      // Racking conflict warning
      hasRackingConflict ? el('div', { className: 'qb-layout-warning' },
        React.createElement(Warning, { size: 16 }),
        ' Puppy pickets and butterfly/scroll accents limit racking to Standard tier only.'
      ) : null
    ) : null,

    // ---- Layout Shape ----
    sectionHeader('Layout Shape'),
    el('div', { className: 'qb-layout-shape-grid' },
      // 90-degree corners
      el('div', { className: 'qb-layout-shape-field' },
        el('div', { className: 'qb-layout-shape-label' },
          '90\u00B0 Corners',
          React.createElement(InfoPopup, {
            title: '90\u00B0 Corners',
            text: 'Count each place where your fence turns a right angle (90 degrees). Each corner requires a special corner post instead of a line post.',
          })
        ),
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: corners,
          min: 0,
          onChange: function(e) { syncLayout({ corners: parseInt(e.target.value, 10) || 0 }); },
        })
      ),
      // End points
      el('div', { className: 'qb-layout-shape-field' },
        el('div', { className: 'qb-layout-shape-label' },
          'End Points',
          React.createElement(InfoPopup, {
            title: 'End Points',
            text: 'End points are where your fence terminates (starts or stops). A straight fence has 2 end points. A fence that wraps around and connects back has 0.',
          })
        ),
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: ends,
          min: 0,
          onChange: function(e) { syncLayout({ ends: parseInt(e.target.value, 10) || 0 }); },
        })
      ),
      // Sharp angles
      el('div', { className: 'qb-layout-shape-field' },
        el('div', { className: 'qb-layout-shape-label' },
          'Sharp Angles (45\u201389\u00B0)',
          React.createElement(InfoPopup, {
            title: 'Sharp Angles',
            text: 'Count any turns between 45 and 89 degrees. These require special angle fittings on the posts.',
          })
        ),
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: sharpAngles,
          min: 0,
          onChange: function(e) { syncLayout({ sharpAngles: parseInt(e.target.value, 10) || 0 }); },
        })
      ),
      // Gentle curves checkbox removed: "shorter panel widths" copy was
      // inaccurate -- Ultra panels are 6' standard and are angled at the post
      // joint for bends. Bends under ~10° need no special hardware; sharper
      // bends need angle brackets (different SKU). This will be replaced with
      // a proper bend-angle selector when SKU-selection is implemented.
    ),

    // ---- Post Summary ----
    el('div', { className: 'qb-layout-post-summary' },
      sectionHeader('Post Summary', {
        title: 'How we count posts',
        text: 'Every corner, end, and gate needs its own special post. Line posts sit between them, spaced by panel width (typically 6 feet residential, 8 feet industrial). The totals here are what Grandview will ship; the material quote on the right reflects them.',
      }),
      el('div', { className: 'qb-layout-post-grid' },
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, linePosts),
          el('div', { className: 'qb-layout-post-label' }, 'Line Posts')
        ),
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, corners),
          el('div', { className: 'qb-layout-post-label' }, 'Corner Posts')
        ),
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, ends),
          el('div', { className: 'qb-layout-post-label' }, 'End Posts')
        ),
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, gatePosts),
          el('div', { className: 'qb-layout-post-label' }, 'Gate Posts')
        )
      ),
      el('div', { className: 'qb-layout-post-meta' },
        'Post size: ' + postSize + ' (' + grade + ')'
      ),
      el('div', { className: 'qb-layout-post-note' },
        'Auto-calculated from your layout. Our team verifies before manufacturing.'
      )
    )
  );
}

export default QuoteStep2_Layout;
