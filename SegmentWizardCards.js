import React from 'react';
import { classifyPostsPerVertex, computeLinePostPositions } from './geometryUtils.js';

function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

var TIER_COLORS = {
  standard: '#eab308',
  rackable:  '#3b82f6',
  heavy:     '#ef4444',
  steps:     '#8b5cf6',
  unknown:   '#94a3b8',
};

var TIER_LABELS = { standard: 'Flat', rackable: 'Sloped', heavy: 'Heavy', unknown: 'Unknown' };

// Higher = more conservative/expensive racking
function tierSeverity(tier) {
  var s = { heavy: 3, rackable: 2, standard: 1 };
  return s[tier] || 0;
}

// ─── Exported helpers (unit-tested) ──────────────────────────────────────────

export function computeFinalTier(recommendedTier, userTierOverride) {
  if (userTierOverride) return userTierOverride;
  if (recommendedTier) return recommendedTier;
  return 'unknown';
}

export function allSegmentsConfirmed(segments) {
  if (!segments || segments.length === 0) return false;
  return segments.every(function(s) { return s.userTierConfirmed; });
}

export function computeSegmentPostCounts(points, panelLengthFt) {
  var classified = classifyPostsPerVertex(points || [], 15);
  var linePosts = computeLinePostPositions(points || [], panelLengthFt || 6);
  var corners = classified.filter(function(v) { return v.type === 'corner'; }).length;
  var ends = classified.filter(function(v) { return v.type === 'end'; }).length;
  return { corners: corners, ends: ends, linePosts: linePosts.length };
}

// ─── Group segments into runs between corner posts ────────────────────────────
//
// Instead of showing one card per tiny segment (e.g. 15 cards for a 4-corner
// fence), we show one card per "run" — a continuous stretch between corners.
// A corner is any vertex where the fence changes direction by > 15°.
//
// Each group exposes:
//   lineId, groupIndex, segmentIndices[], totalFt, compassLabel,
//   rackingTier, epqsConfidence, start, end, color
export function groupSegmentsByCorner(line) {
  if (!line || !line.segments || line.segments.length === 0) return [];

  var segs = line.segments;
  var pts  = line.points || [];

  // classifyPostsPerVertex returns one entry per point (vertex).
  // Vertex i is BETWEEN segment i-1 and segment i.
  var classified = pts.length >= 2 ? classifyPostsPerVertex(pts, 15) : [];

  var groups = [];
  var cur = null;

  segs.forEach(function(seg, i) {
    // A new run starts at the first segment OR when the vertex at position i
    // (sitting between segment i-1 and segment i) is a corner post.
    var vertexType = classified[i] ? classified[i].type : 'end';
    var startsNewRun = i === 0 || vertexType === 'corner';

    if (startsNewRun) {
      if (cur) groups.push(cur);
      cur = {
        lineId:          line.id,
        groupIndex:      groups.length,
        segmentIndices:  [i],
        totalFt:         seg.lengthFeet || 0,
        compassLabel:    seg.compassLabel,
        rackingTier:     seg.rackingTier,
        epqsConfidence:  seg.epqsConfidence,
        start:           seg.start,
        end:             seg.end,
        color:           seg.color,
      };
    } else {
      cur.segmentIndices.push(i);
      cur.totalFt += (seg.lengthFeet || 0);
      cur.end = seg.end;
      // Most severe racking tier in the run drives the whole run's tier.
      if (tierSeverity(seg.rackingTier) > tierSeverity(cur.rackingTier)) {
        cur.rackingTier    = seg.rackingTier;
        cur.epqsConfidence = seg.epqsConfidence;
        cur.compassLabel   = seg.compassLabel;
      }
    }
  });

  if (cur) groups.push(cur);
  return groups;
}

// ─── RunCard — one card per corner-bounded run ────────────────────────────────

function RunCard(props) {
  var run = props.run;
  var finalTier = computeFinalTier(run.rackingTier, run.userTierOverride || null);
  var isLowConfidence = !run.rackingTier || run.rackingTier === 'unknown' || run.epqsConfidence === 'low';
  var color = TIER_COLORS[finalTier] || TIER_COLORS.unknown;

  // Post counts across the full run (start→end)
  var runPoints = run.start && run.end ? [run.start, run.end] : [];
  var postCounts = computeSegmentPostCounts(runPoints, 6);

  // Gates on any segment in this run
  var gatesOnRun = (props.gates || []).filter(function(g) {
    return g.segmentLineId === run.lineId &&
           run.segmentIndices.indexOf(g.segmentIndex) >= 0;
  });

  var tierButtons = ['standard', 'rackable', 'heavy'].map(function(tier) {
    var labels = { standard: 'No slope', rackable: 'Sloped', heavy: 'Heavy slope' };
    var isActive = run.userTierConfirmed && computeFinalTier(run.rackingTier, run.userTierOverride) === tier;
    return el('button', {
      key: tier,
      className: 'swc-tier-btn' + (isActive ? ' active' : ''),
      onClick: function() { props.onRunTierSelect(run, tier); },
    }, isActive ? '✓ ' + labels[tier] : labels[tier]);
  });

  // Label: compass direction + run index if ambiguous
  var cardTitle = run.compassLabel
    ? (run.compassLabel + ' run')
    : ('Run ' + (run.groupIndex + 1));

  return el('div', { className: 'swc-card', style: { borderLeftColor: color } },
    el('div', { className: 'swc-card-header' },
      el('div', null,
        el('span', { className: 'swc-card-title' }, cardTitle),
        el('span', { className: 'swc-card-sub' },
          Math.round(run.totalFt) + ' ft' +
          (run.segmentIndices.length > 1 ? ' · ' + run.segmentIndices.length + ' segments' : '')
        )
      ),
      isLowConfidence
        ? el('span', { className: 'swc-badge swc-badge-warn' }, '⚠ Needs review')
        : el('span', { className: 'swc-badge swc-badge-auto' }, 'Auto: ' + (TIER_LABELS[run.rackingTier] || 'Unknown'))
    ),
    el('div', { className: 'swc-tier-row' }, tierButtons),
    gatesOnRun.length > 0 && el('div', { className: 'swc-gates' },
      gatesOnRun.map(function(gate) {
        var typeLabels = { walk: 'Walk gate', driveway: 'Driveway gate' };
        return el('div', { key: gate.id, className: 'swc-gate-row' },
          el('span', { className: 'swc-gate-info' },
            (typeLabels[gate.type] || 'Gate') + ' · ' + gate.widthInches + '" · ' +
            (gate.top === 'arched' ? 'Arched' : 'Straight') + ' · Swings ' + (gate.swing || 'left')
          ),
          el('button', { className: 'swc-gate-edit', onClick: function() { props.onGateEdit(gate.id); } }, 'Edit')
        );
      })
    )
  );
}

// ─── SegmentWizardCards — main export ─────────────────────────────────────────

export default function SegmentWizardCards(props) {
  var lines = props.lines || [];
  var gates = props.gates || [];
  var confirmedState = props.confirmedState || {};

  // Build groups across all lines
  var allGroups = [];
  lines.forEach(function(line) {
    groupSegmentsByCorner(line).forEach(function(group) {
      // A group is confirmed only when ALL its segment indices are confirmed
      var allConfirmed = group.segmentIndices.every(function(idx) {
        return !!(confirmedState[group.lineId + '-' + idx]);
      });
      // Use first segment's override as group override (they'll all be the same)
      var override = confirmedState[group.lineId + '-' + group.segmentIndices[0] + '-override'] || null;
      allGroups.push(Object.assign({}, group, {
        userTierConfirmed: allConfirmed,
        userTierOverride:  override,
      }));
    });
  });

  var confirmedCount = allGroups.filter(function(g) { return g.userTierConfirmed; }).length;
  var total = allGroups.length;
  var allDone = allSegmentsConfirmed(allGroups);

  // When a run is confirmed, propagate to ALL segment indices in that run
  function handleRunTierSelect(run, tier) {
    run.segmentIndices.forEach(function(idx) {
      props.onTierSelect(idx, run.lineId, tier);
    });
  }

  var firstUnconfirmed = allGroups.find(function(g) { return !g.userTierConfirmed; });
  var ctaMsg = allDone
    ? 'Continue to Style →'
    : 'Confirm ' + (firstUnconfirmed
        ? (firstUnconfirmed.compassLabel ? firstUnconfirmed.compassLabel + ' run' : 'next run')
        : 'all runs') + ' to continue';

  return el('div', { className: 'swc-root' },
    el('div', { className: 'swc-header' },
      'Does any section of your fence run uphill or downhill?',
      total > 1 && el('span', { className: 'swc-progress' },
        ' — ',
        el('span', { className: 'swc-progress-count' + (allDone ? ' done' : '') },
          confirmedCount + ' of ' + total + ' confirmed'
        )
      )
    ),
    el('div', { className: 'swc-cards' },
      allGroups.map(function(group) {
        return React.createElement(RunCard, {
          key: group.lineId + '-group-' + group.groupIndex,
          run: group,
          gates: gates,
          onRunTierSelect: handleRunTierSelect,
          onGateEdit: props.onGateEdit,
        });
      })
    ),
    el('div', { className: 'swc-cta-wrap' },
      el('button', {
        className: 'swc-cta' + (allDone ? '' : ' disabled'),
        disabled: !allDone,
        onClick: allDone ? props.onContinue : undefined,
      }, ctaMsg)
    )
  );
}
