import React, { useState } from 'react';
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

function SegmentCard(props) {
  var seg = props.segment;
  var finalTier = computeFinalTier(seg.rackingTier, seg.userTierOverride || null);
  var isLowConfidence = !seg.rackingTier || seg.rackingTier === 'unknown' || seg.epqsConfidence === 'low';
  var color = TIER_COLORS[finalTier] || TIER_COLORS.unknown;
  var postCounts = computeSegmentPostCounts(
    seg.start && seg.end ? [seg.start, seg.end] : [],
    6
  );
  var gatesOnSeg = (props.gates || []).filter(function(g) {
    return g.segmentLineId === seg.lineId && g.segmentIndex === seg.index;
  });

  var tierButtons = ['standard', 'rackable', 'heavy'].map(function(tier) {
    var labels = { standard: 'No slope', rackable: 'Sloped', heavy: 'Heavy slope' };
    var isActive = seg.userTierConfirmed && computeFinalTier(seg.rackingTier, seg.userTierOverride) === tier;
    return el('button', {
      key: tier,
      className: 'swc-tier-btn' + (isActive ? ' active' : ''),
      onClick: function() { props.onTierSelect(seg.index, seg.lineId, tier); },
    }, isActive ? '✓ ' + labels[tier] : labels[tier]);
  });

  return el('div', { className: 'swc-card', style: { borderLeftColor: color } },
    el('div', { className: 'swc-card-header' },
      el('div', null,
        el('span', { className: 'swc-card-title' }, seg.compassLabel || ('Segment ' + (seg.index + 1))),
        el('span', { className: 'swc-card-sub' },
          Math.round(seg.lengthFeet) + ' ft · ' +
          postCounts.linePosts + ' line posts · ' +
          postCounts.corners + ' corner posts'
        )
      ),
      isLowConfidence
        ? el('span', { className: 'swc-badge swc-badge-warn' }, '⚠ Needs review')
        : el('span', { className: 'swc-badge swc-badge-auto' }, 'Auto: ' + (TIER_LABELS[seg.rackingTier] || 'Unknown'))
    ),
    el('div', { className: 'swc-tier-row' }, tierButtons),
    gatesOnSeg.length > 0 && el('div', { className: 'swc-gates' },
      gatesOnSeg.map(function(gate) {
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

export default function SegmentWizardCards(props) {
  var lines = props.lines || [];
  var gates = props.gates || [];
  var confirmedState = props.confirmedState || {};

  var allSegs = [];
  lines.forEach(function(line) {
    (line.segments || []).forEach(function(seg, i) {
      allSegs.push(Object.assign({}, seg, {
        lineId: line.id,
        index: i,
        userTierConfirmed: !!(confirmedState[line.id + '-' + i]),
        userTierOverride: (confirmedState[line.id + '-' + i + '-override']) || null,
      }));
    });
  });

  var confirmedCount = allSegs.filter(function(s) { return s.userTierConfirmed; }).length;
  var total = allSegs.length;
  var allDone = allSegmentsConfirmed(allSegs);

  var firstUnconfirmed = allSegs.find(function(s) { return !s.userTierConfirmed; });
  var ctaMsg = allDone
    ? 'Continue to Style →'
    : 'Confirm ' + (firstUnconfirmed ? (firstUnconfirmed.compassLabel || ('segment ' + (firstUnconfirmed.index + 1))) : 'all segments') + ' to continue';

  return el('div', { className: 'swc-root' },
    el('div', { className: 'swc-header' },
      'Confirm slope by segment',
      total > 1 && el('span', { className: 'swc-progress' },
        ' — ',
        el('span', { className: 'swc-progress-count' + (allDone ? ' done' : '') },
          confirmedCount + ' of ' + total + ' confirmed'
        )
      )
    ),
    el('div', { className: 'swc-cards' },
      allSegs.map(function(seg) {
        return React.createElement(SegmentCard, {
          key: seg.lineId + '-' + seg.index,
          segment: seg,
          gates: gates,
          onTierSelect: props.onTierSelect,
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
