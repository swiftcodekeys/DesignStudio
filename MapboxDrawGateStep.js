import React from 'react';

function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

var GATE_TYPES = [
  { id: 'walk',     name: 'Walk Gate',     range: '36–72"',  defaultWidth: 36 },
  { id: 'driveway', name: 'Driveway Gate', range: '72–144"', defaultWidth: 72 },
];

var WIDTHS_WALK     = [36, 42, 48, 60, 72];
var WIDTHS_DRIVEWAY = [72, 84, 96, 108, 120, 132, 144];

var GATE_IMAGES = {
  'walk-flat':       'assets/gate_types/walk_flat.png',
  'walk-arched':     'assets/gate_types/walk_arched.png',
  'driveway-flat':   'assets/gate_types/driveway_flat.png',
  'driveway-arched': 'assets/gate_types/driveway_arched.png',
};

function widthsForType(type) {
  return type === 'driveway' ? WIDTHS_DRIVEWAY : WIDTHS_WALK;
}

export function makeDefaultGate(id, segmentLineId, segmentIndex, offsetFt, latLng) {
  return {
    id: id,
    segmentLineId: segmentLineId,
    segmentIndex: segmentIndex,
    offsetFt: offsetFt,
    latLng: latLng,
    type: 'walk',
    top: 'flat',
    swing: 'left',
    widthInches: 36,
    hinge: 'standard',
    latch: 'lokklatch',
  };
}

export function computeTotalPanelFt(totalFt, gates) {
  var deduction = (gates || []).reduce(function(sum, g) {
    return sum + (g.widthInches || 36) / 12;
  }, 0);
  return totalFt - deduction;
}

export default function MapboxDrawGateStep(props) {
  var gates = props.gates || [];
  var totalFt = props.totalFt || 0;
  var panelFt = computeTotalPanelFt(totalFt, gates);

  function updateGate(index, changes) {
    var updated = gates.map(function(g, i) {
      if (i !== index) return g;
      var merged = Object.assign({}, g, changes);
      if (changes.type && changes.type !== g.type) {
        var widths = widthsForType(changes.type);
        if (widths.indexOf(merged.widthInches) < 0) merged.widthInches = widths[0];
      }
      return merged;
    });
    props.onGatesChange(updated);
  }

  function removeGate(index) {
    props.onGatesChange(gates.filter(function(_, i) { return i !== index; }));
  }

  function renderGateCard(gate, index) {
    var widths = widthsForType(gate.type);
    var imgKey = gate.type + '-' + gate.top;
    var imgSrc = GATE_IMAGES[imgKey];
    return el('div', { key: gate.id, className: 'mds-gate-card' },
      el('div', { className: 'mds-gate-card-header' },
        el('div', null,
          el('div', { className: 'mds-gate-card-title' }, 'Gate ' + (index + 1)),
          el('div', { className: 'mds-gate-card-seg' },
            (gate.segmentLabel || 'Fence segment') + ' · ~' + Math.round(gate.offsetFt) + ' ft in'
          )
        ),
        el('button', { className: 'mds-gate-remove', onClick: function() { removeGate(index); } }, 'Remove')
      ),
      imgSrc && el('img', { src: imgSrc, className: 'mds-gate-img', alt: gate.type + ' gate' }),
      el('div', { className: 'mds-gate-field' },
        el('div', { className: 'mds-gate-label' }, 'Gate type'),
        el('div', { className: 'mds-gate-toggle-row' },
          GATE_TYPES.map(function(gt) {
            return el('button', {
              key: gt.id,
              className: 'mds-gate-toggle' + (gate.type === gt.id ? ' active' : ''),
              onClick: function() { updateGate(index, { type: gt.id }); },
            }, gt.name);
          })
        )
      ),
      el('p', { className: 'mds-gate-style-note' },
        'Your gate will be built to match your fence style. The images shown are representative — your actual gate will use the same picket design, rail spacing, and finish as your selected fence.'
      ),
      el('div', { className: 'mds-gate-field' },
        el('div', { className: 'mds-gate-label' }, 'Top style'),
        el('div', { className: 'mds-gate-toggle-row' },
          el('button', {
            className: 'mds-gate-toggle' + (gate.top === 'flat' ? ' active' : ''),
            onClick: function() { updateGate(index, { top: 'flat' }); },
          }, 'Straight'),
          el('button', {
            className: 'mds-gate-toggle' + (gate.top === 'arched' ? ' active' : ''),
            onClick: function() { updateGate(index, { top: 'arched' }); },
          }, 'Arched')
        )
      ),
      el('div', { className: 'mds-gate-row2' },
        el('div', { className: 'mds-gate-field' },
          el('div', { className: 'mds-gate-label' }, 'Width'),
          el('select', {
            className: 'mds-gate-select',
            value: gate.widthInches,
            onChange: function(e) { updateGate(index, { widthInches: Number(e.target.value) }); },
          }, widths.map(function(w) {
            return el('option', { key: w, value: w }, w + '"');
          }))
        ),
        el('div', { className: 'mds-gate-field' },
          el('div', { className: 'mds-gate-label' }, 'Swing'),
          el('div', { className: 'mds-gate-toggle-row' },
            el('button', {
              className: 'mds-gate-toggle' + (gate.swing === 'left' ? ' active' : ''),
              onClick: function() { updateGate(index, { swing: 'left' }); },
            }, 'Left'),
            el('button', {
              className: 'mds-gate-toggle' + (gate.swing === 'right' ? ' active' : ''),
              onClick: function() { updateGate(index, { swing: 'right' }); },
            }, 'Right')
          )
        )
      )
    );
  }

  return el('div', { className: 'mds-gate-step' },
    el('div', { className: 'mds-gate-step-header' },
      el('div', { className: 'mds-gate-step-title' }, 'Add gates'),
      el('div', { className: 'mds-gate-step-hint' }, 'Click anywhere on your fence line to place a gate')
    ),
    el('div', { className: 'mds-gate-cards' },
      gates.length === 0
        ? el('div', { className: 'mds-gate-empty' }, 'No gates placed yet — click the fence line on the map')
        : gates.map(renderGateCard)
    ),
    el('div', { className: 'mds-gate-footage' },
      el('div', { className: 'mds-gate-footage-row' },
        el('span', null, 'Drawn total'), el('span', null, Math.round(totalFt) + ' ft')
      ),
      gates.length > 0 && el('div', { className: 'mds-gate-footage-row mds-gate-deduction' },
        el('span', null, 'Gate openings (' + gates.length + ')'),
        el('span', null, '− ' + (totalFt - panelFt).toFixed(1) + ' ft')
      ),
      el('div', { className: 'mds-gate-footage-row mds-gate-total' },
        el('span', null, 'Fence panels'), el('span', null, Math.round(panelFt) + ' ft')
      )
    ),
    el('button', { className: 'mds-gate-cta', onClick: props.onComplete }, 'Done → Continue to Quote'),
    el('button', { className: 'mds-gate-skip', onClick: props.onSkip }, 'No gates — skip this step')
  );
}
