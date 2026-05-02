import React from 'react';

function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

var GATE_TYPES = [
  { id: 'walk',     name: 'Walk Gate' },
  { id: 'driveway', name: 'Driveway Gate' },
];
var WIDTHS_WALK  = [36, 42, 48, 60, 72];
var WIDTHS_DRIVE = [72, 84, 96, 108, 120, 132, 144];
function widthsForType(type) { return type === 'walk' ? WIDTHS_WALK : WIDTHS_DRIVE; }

export default function GateEditModal(props) {
  var gate = props.gate;
  if (!gate) return null;
  var widths = widthsForType(gate.type);

  function update(changes) {
    var merged = Object.assign({}, gate, changes);
    if (changes.type && changes.type !== gate.type) {
      var newWidths = widthsForType(changes.type);
      if (newWidths.indexOf(merged.widthInches) < 0) merged.widthInches = newWidths[0];
    }
    props.onUpdate(merged);
  }

  return el('div', { className: 'gem-backdrop', onClick: props.onClose },
    el('div', { className: 'gem-modal', onClick: function(e) { e.stopPropagation(); } },
      el('div', { className: 'gem-header' },
        el('span', { className: 'gem-title' }, 'Edit gate'),
        el('button', { className: 'gem-close', onClick: props.onClose }, '×')
      ),
      el('div', { className: 'gem-field' },
        el('div', { className: 'gem-label' }, 'Gate type'),
        el('div', { className: 'gem-toggle-row' },
          GATE_TYPES.map(function(gt) {
            return el('button', {
              key: gt.id,
              className: 'gem-toggle' + (gate.type === gt.id ? ' active' : ''),
              onClick: function() { update({ type: gt.id }); },
            }, gt.name);
          })
        )
      ),
      el('div', { className: 'gem-field' },
        el('div', { className: 'gem-label' }, 'Top style'),
        el('div', { className: 'gem-toggle-row' },
          el('button', { className: 'gem-toggle' + (gate.top === 'flat' ? ' active' : ''), onClick: function() { update({ top: 'flat' }); } }, 'Straight'),
          el('button', { className: 'gem-toggle' + (gate.top === 'arched' ? ' active' : ''), onClick: function() { update({ top: 'arched' }); } }, 'Arched')
        )
      ),
      el('div', { className: 'gem-row2' },
        el('div', { className: 'gem-field' },
          el('div', { className: 'gem-label' }, 'Width'),
          el('select', {
            className: 'gem-select', value: gate.widthInches,
            onChange: function(e) { update({ widthInches: Number(e.target.value) }); },
          }, widths.map(function(w) { return el('option', { key: w, value: w }, w + '"'); }))
        ),
        el('div', { className: 'gem-field' },
          el('div', { className: 'gem-label' }, 'Swing'),
          el('div', { className: 'gem-toggle-row' },
            el('button', { className: 'gem-toggle' + (gate.swing === 'left' ? ' active' : ''), onClick: function() { update({ swing: 'left' }); } }, 'Left'),
            el('button', { className: 'gem-toggle' + (gate.swing === 'right' ? ' active' : ''), onClick: function() { update({ swing: 'right' }); } }, 'Right')
          )
        )
      ),
      el('button', { className: 'gem-done', onClick: props.onClose }, 'Done')
    )
  );
}
