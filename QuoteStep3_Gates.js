// QuoteStep3_Gates.js — Gates step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React, { useState } from 'react';
import { Trash, Plus, ArrowsLeftRight, Warning, ShieldCheck, DoorOpen } from '@phosphor-icons/react';
import InfoPopup from './InfoPopup';
import GateEditModal from './GateEditModal.js';

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

// ---- Constants ----
var GATE_TYPES = [
  { id: 'walk',     name: 'Walk Gate',     desc: 'Person or mower access',       range: '36\u201372\u2033',   image: 'assets/gate_types/walk_flat.png' },
  { id: 'driveway', name: 'Driveway Gate', desc: 'Double-leaf, meets in center',  range: '72\u2013144\u2033',  image: 'assets/gate_types/driveway_flat.png' },
];

var WIDTHS_WALK   = [36, 42, 48, 60, 72];
var WIDTHS_DRIVE  = [72, 84, 96, 120, 144];

// IDs must match retailPricing.js keys (hinges, latches) — drift causes $0 pricing
var HINGE_OPTIONS = [
  { id: 'standard',           name: 'Standard',              price: 33.50, unit: '/pair', info: 'Heavy-duty steel hinges, field adjustable' },
  { id: 'truclose',           name: 'TruClose Self-Closing',  price: 95.50, unit: '/pair', info: 'Polymer self-closing hinge. Required for pool code compliance' },
  { id: 'ultra-adjustable',   name: 'Heavy Duty Adjustable',   price: 333.50, unit: '/pair', info: 'Tension-adjustable, 3-way alignment. Requires 4\u00d74 posts.' },
];

var LATCH_OPTIONS = [
  { id: 'lokklatch',          name: 'LokkLatch',           price: 58.50,  info: 'Key-lockable gravity latch' },
  { id: 'magna-latch',        name: 'MagnaLatch Pool',     price: 186.50, info: 'Magnetic, key-lockable, self-latching. Pool code compliant' },
  { id: 'lokklatch-deluxe',   name: 'LokkLatch Deluxe',    price: 175.00, info: 'Premium key-lockable gravity latch with dual access' },
  { id: 'lokklatch-magnetic', name: 'LokkLatch Magnetic', price: 227.00, info: 'Magnetic key-lockable latch, dual-side keyed' },
];

var DEFAULT_GATE = {
  type: 'walk', widthInches: 36, top: 'flat', swing: 'left',
  hinge: 'standard', latch: 'lokklatch',
};

function widthsForType(type) {
  return type === 'walk' ? WIDTHS_WALK : WIDTHS_DRIVE;
}

function fmt$(val) {
  return '$' + val.toFixed(2);
}

// ============================================================
// QuoteStep3_Gates Component
// ============================================================
function QuoteStep3_Gates(props) {
  var data = props.data;
  var update = props.update;
  var poolCompliance = props.poolCompliance;
  var isPool = poolCompliance && poolCompliance.poolBarrier;

  var editingGateVar = useState(null);
  var editingGate = editingGateVar[0];
  var setEditingGate = editingGateVar[1];

  var gates = data.gates || [];

  function updateGate(index, changes) {
    var newGates = gates.map(function(g, i) {
      if (i !== index) return g;
      return Object.assign({}, g, changes);
    });
    update({ gates: newGates });
  }

  function removeGate(index) {
    var newGates = gates.filter(function(_, i) { return i !== index; });
    update({ gates: newGates });
  }

  function addGate() {
    var newGate = Object.assign({}, DEFAULT_GATE);
    if (isPool) {
      newGate.hinge = 'truclose';
      newGate.latch = 'magna-latch';
    }
    var newGates = gates.concat([newGate]);
    update({ gates: newGates });
  }

  // Pool lockout: when pool compliance is active, force hinge/latch state to compliant values
  // (not just display override — pricing reads gate.hinge/gate.latch, so state must match)
  if (isPool && gates.length > 0) {
    var needsCorrection = gates.some(function(g) {
      return g.hinge !== 'truclose' || g.latch !== 'magna-latch';
    });
    if (needsCorrection) {
      var corrected = gates.map(function(g) {
        if (g.hinge === 'truclose' && g.latch === 'magna-latch') return g;
        return Object.assign({}, g, { hinge: 'truclose', latch: 'magna-latch' });
      });
      setTimeout(function() { update({ gates: corrected }); }, 0);
    }
  }

  // ---- Gate Type Reference cards ----
  function renderTypeReference() {
    return el('div', { className: 'qb-gates-section' },
      sectionHeader('Gate Types', { title: 'Gate Types', text: 'Choose the right gate type for each opening in your fence line.' }),
      el('div', { className: 'qb-gates-type-grid' },
        GATE_TYPES.map(function(gt) {
          return el('div', { key: gt.id, className: 'qb-gates-type-card' },
            el('img', { src: gt.image, alt: gt.name, className: 'qb-gates-type-img' }),
            el('div', { className: 'qb-gates-type-name' }, gt.name),
            el('div', { className: 'qb-gates-type-range' }, gt.range),
            el('div', { className: 'qb-gates-type-desc' }, gt.desc)
          );
        })
      )
    );
  }

  // ---- Per-Gate Card ----
  function renderGateCard(gate, index) {
    var widths = widthsForType(gate.type);
    var isDriveway = gate.type === 'driveway';
    var isArched = gate.top === 'arched';
    var wideThreshold = isDriveway ? 144 : 72;
    var needsUFrame = gate.widthInches > wideThreshold;

    // Pool lockout: state is corrected by the useEffect-like block above, so just read from gate
    var poolLocked = isPool;
    var hingeVal = gate.hinge;
    var latchVal = gate.latch;

    return el('div', { key: index, className: 'qb-gates-card' },
      el('div', { className: 'qb-gates-card-header' },
        el('span', { className: 'qb-gates-card-num' }, 'Gate ' + (index + 1)),
        el('button', {
          className: 'qb-gates-delete-btn',
          onClick: function() { removeGate(index); },
          'aria-label': 'Remove gate ' + (index + 1),
        }, React.createElement(Trash, { size: 16 }))
      ),

      // Pool compliance banner
      poolLocked ? el('div', { className: 'qb-gates-pool-banner' },
        React.createElement(ShieldCheck, { size: 16 }),
        ' Pool code: self-closing + self-latching required'
      ) : null,

      // Type selector
      el('div', { className: 'qb-gates-field' },
        el('label', { className: 'qb-gates-label' }, 'Type'),
        el('div', { className: 'qb-gates-toggle-row' },
          GATE_TYPES.map(function(gt) {
            return el('button', {
              key: gt.id,
              className: 'qb-gates-toggle' + (gate.type === gt.id ? ' active' : ''),
              onClick: function() {
                var newWidths = widthsForType(gt.id);
                var w = newWidths.indexOf(gate.widthInches) >= 0 ? gate.widthInches : newWidths[0];
                updateGate(index, { type: gt.id, widthInches: w });
              },
            }, gt.name);
          })
        )
      ),

      // Width
      el('div', { className: 'qb-gates-field' },
        el('label', { className: 'qb-gates-label' }, 'Width'),
        el('select', {
          className: 'qb-gates-select',
          value: gate.widthInches,
          onChange: function(e) { updateGate(index, { widthInches: Number(e.target.value) }); },
        },
          widths.map(function(w) {
            return el('option', { key: w, value: w }, w + '\u2033');
          })
        ),
        el('div', { className: 'qb-gates-hint' },
          gate.type === 'walk'
            ? '36\u2033 = person access | 48\u2033 = mower'
            : 'Measure driveway + 2 ft each side'
        ),
        needsUFrame ? el('div', { className: 'qb-gates-surcharge' },
          'U-frame surcharge ($19/LF)'
        ) : null
      ),

      // Top Style
      el('div', { className: 'qb-gates-field' },
        el('label', { className: 'qb-gates-label' }, 'Top Style'),
        el('div', { className: 'qb-gates-toggle-row' },
          ['flat', 'arched'].map(function(t) {
            return el('button', {
              key: t,
              className: 'qb-gates-toggle' + (gate.top === t ? ' active' : ''),
              onClick: function() { updateGate(index, { top: t }); },
            }, t === 'flat' ? 'Flat' : 'Arched');
          })
        ),
        isArched ? el('div', { className: 'qb-gates-surcharge' },
          '+$43.25/LF surcharge for arched top'
        ) : null
      ),

      // Swing Direction
      el('div', { className: 'qb-gates-field' },
        el('label', { className: 'qb-gates-label' }, 'Swing Direction'),
        el('div', { className: 'qb-gates-toggle-row' },
          ['left', 'right'].map(function(dir) {
            return el('button', {
              key: dir,
              className: 'qb-gates-toggle' + (gate.swing === dir ? ' active' : ''),
              onClick: function() { updateGate(index, { swing: dir }); },
            },
              React.createElement(ArrowsLeftRight, { size: 14 }),
              ' ',
              dir.charAt(0).toUpperCase() + dir.slice(1)
            );
          })
        ),
        poolLocked ? el('div', { className: 'qb-gates-hint qb-gates-pool-hint' },
          React.createElement(Warning, { size: 12 }),
          ' Pool code: gate must swing AWAY from pool. Choose the direction that opens outward.'
        ) : null
      ),

      // Hardware — Hinges
      el('div', { className: 'qb-gates-field' },
        el('label', { className: 'qb-gates-label' }, 'Hinges'),
        el('div', { className: 'qb-gates-hw-list' },
          HINGE_OPTIONS.map(function(h) {
            var selected = hingeVal === h.id;
            var locked = poolLocked && h.id !== 'truclose';
            return el('label', {
              key: h.id,
              className: 'qb-gates-hw-option' + (selected ? ' selected' : '') + (locked ? ' locked' : ''),
            },
              el('input', {
                type: 'radio',
                name: 'hinge-' + index,
                value: h.id,
                checked: selected,
                disabled: poolLocked,
                onChange: function() { updateGate(index, { hinge: h.id }); },
              }),
              el('span', { className: 'qb-gates-hw-name' }, h.name),
              el('span', { className: 'qb-gates-hw-price' }, fmt$(h.price) + h.unit),
              React.createElement(InfoPopup, { title: h.name, text: h.info }),
              h.id === 'ultra-adj' ? el('div', { className: 'qb-gates-hw-note' }, 'Requires 4\u00d74 posts') : null
            );
          })
        )
      ),

      // Hardware — Latch
      el('div', { className: 'qb-gates-field' },
        el('label', { className: 'qb-gates-label' }, 'Latch'),
        el('div', { className: 'qb-gates-hw-list' },
          LATCH_OPTIONS.map(function(l) {
            var selected = latchVal === l.id;
            var locked = poolLocked && l.id !== 'magna-latch';
            return el('label', {
              key: l.id,
              className: 'qb-gates-hw-option' + (selected ? ' selected' : '') + (locked ? ' locked' : ''),
            },
              el('input', {
                type: 'radio',
                name: 'latch-' + index,
                value: l.id,
                checked: selected,
                disabled: poolLocked,
                onChange: function() { updateGate(index, { latch: l.id }); },
              }),
              el('span', { className: 'qb-gates-hw-name' }, l.name),
              el('span', { className: 'qb-gates-hw-price' }, fmt$(l.price)),
              React.createElement(InfoPopup, { title: l.name, text: l.info })
            );
          })
        )
      ),

      // Driveway gate drop rod note
      isDriveway ? el('div', { className: 'qb-gates-droprod' },
        'Drop rod auto-included ($39.25)'
      ) : null
    );
  }

  // ---- Add Gate button ----
  function renderAddGate() {
    return el('div', { className: 'qb-gates-add-wrap' },
      el('button', { className: 'qb-gates-add-btn', onClick: addGate },
        React.createElement(Plus, { size: 16 }),
        ' Add a gate'
      ),
      el('div', { className: 'qb-gates-add-hint' }, 'Most yards need at least one walk gate.')
    );
  }

  // Estate/Cantilever callout removed — was discouraging buyers

  // Draw-tool buyers: show read-only gate summary with edit capability
  var isDrawToolBuyer = !!(props.drawToolData && props.drawToolData.lines);
  if (isDrawToolBuyer) {
    var dtGates = props.drawToolData.gates || [];
    return el('div', { className: 'qbg-readonly' },
      el('div', { className: 'qbg-readonly-header' },
        el('div', { className: 'qbg-readonly-title' }, 'Your gates'),
        el('div', { className: 'qbg-readonly-sub' }, 'Placed during drawing. Edit any gate below.')
      ),
      dtGates.length === 0
        ? el('div', { className: 'qbg-readonly-none' }, 'No gates placed. You confirmed no gates during drawing.')
        : el('div', { className: 'qbg-readonly-list' },
            dtGates.map(function(gate, i) {
              var typeLabels = { walk: 'Walk gate', driveway: 'Driveway gate' };
              var gateImgKey = (gate.type || 'walk') + '-' + (gate.top || 'flat');
              var gateImgSrc = {
                'walk-flat': 'assets/gate_types/walk_flat.png',
                'walk-arched': 'assets/gate_types/walk_arched.png',
                'driveway-flat': 'assets/gate_types/driveway_flat.png',
                'driveway-arched': 'assets/gate_types/driveway_arched.png',
              }[gateImgKey];
              return el('div', { key: gate.id || i, className: 'qbg-readonly-card' },
                gateImgSrc && el('img', { src: gateImgSrc, className: 'qbg-readonly-gate-img', alt: typeLabels[gate.type] || gate.type }),
                el('div', { className: 'qbg-readonly-card-info' },
                  el('div', { className: 'qbg-readonly-card-title' },
                    'Gate ' + (i + 1) + ' — ' + (typeLabels[gate.type] || gate.type)
                  ),
                  el('div', { className: 'qbg-readonly-card-detail' },
                    gate.widthInches + '" · ' +
                    (gate.top === 'arched' ? 'Arched' : 'Straight') + ' · Swings ' + (gate.swing || 'left') +
                    (gate.segmentLabel ? ' · ' + gate.segmentLabel + ' run' : '')
                  )
                ),
                el('button', {
                  className: 'qbg-readonly-edit',
                  onClick: function() { setEditingGate(gate); },
                }, 'Edit')
              );
            })
          ),
      editingGate ? React.createElement(GateEditModal, {
        gate: editingGate,
        onUpdate: function(updated) {
          var newGates = dtGates.map(function(g) { return g.id === updated.id ? updated : g; });
          props.update({ gates: newGates });
          setEditingGate(updated);
        },
        onClose: function() { setEditingGate(null); },
      }) : null,
      el('button', { className: 'qbg-readonly-next', onClick: props.onNext }, 'Continue →')
    );
  }

  // ---- Main render ----
  return el('div', { className: 'qb-gates-step' },
    renderTypeReference(),
    gates.length > 0 ? el('div', { className: 'qb-gates-section' },
      sectionHeader('Your Gates'),
      gates.map(function(gate, i) { return renderGateCard(gate, i); })
    ) : null,
    renderAddGate()
  );
}

export default QuoteStep3_Gates;
