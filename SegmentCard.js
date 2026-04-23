// SegmentCard.js — per-segment rackability picker (color-coded to match map)
import React, { useState } from 'react';

function SegmentCard(props) {
  var s = props.segment;
  var expandedState = useState(false);
  var expanded = expandedState[0];
  var setExpanded = expandedState[1];

  var tier = props.rackingTier || 'standard';

  return React.createElement('div', {
    className: 'mbx-segment-card' + (props.highlighted ? ' highlighted' : ''),
    onMouseEnter: function() { if (props.onHover) props.onHover(s.index); },
    onMouseLeave: function() { if (props.onHover) props.onHover(null); },
    style: { borderLeftColor: s.color },
  },
    React.createElement('div', { className: 'mbx-segment-header' },
      React.createElement('span', { className: 'mbx-segment-swatch', style: { background: s.color } }),
      React.createElement('strong', null, s.compassLabel || ('Segment ' + (s.index + 1))),
      React.createElement('span', { className: 'mbx-segment-meta' },
        s.lengthFeet.toFixed(0) + ' ft \u00B7 ' + s.panels + ' panels'),
    ),
    React.createElement('div', { className: 'mbx-segment-body' },
      React.createElement('label', { className: 'mbx-tier-inline' },
        React.createElement('select', {
          value: tier,
          onChange: function(e) { props.onChange(s.index, e.target.value); },
        },
          React.createElement('option', { value: 'standard' }, 'Standard (flat, 0-6")'),
          React.createElement('option', { value: 'stair-step' }, 'Stepped (any direction)'),
          React.createElement('option', { value: 'rackable' }, 'Rackable (6-20") +$4.75/post'),
          React.createElement('option', { value: 'heavy-rackable' }, 'Heavy Rack (20-36") +$4.75/post'),
        )
      ),
      props.epqsClassification === 'unknown' ?
        React.createElement('div', { className: 'mbx-segment-warning' },
          '\u26A0 We couldn\u2019t auto-detect slope here. Please verify.') : null,
      React.createElement('a', {
        href: '/how-to-measure-your-yard', target: '_blank', rel: 'noopener',
        className: 'mbx-segment-help',
      }, '\u2139 how to verify')
    )
  );
}

export default SegmentCard;
