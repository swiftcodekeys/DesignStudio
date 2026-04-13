// QuoteStep4_Extras.js — Extras & Upgrades step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React from 'react';
import { Sparkle, Warning } from '@phosphor-icons/react';
import InfoPopup from './InfoPopup';

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

// ---- Style type detection ----
var SPEAR_STYLES = ['charleston', 'charleston-pro', 'vanguard', 'savannah'];

// ---- Finial options ----
var FINIAL_SPEAR_OPTIONS = [
  { id: 'spear', name: 'Spear',   image: 'gate_tool/th/th_pc_spe.jpg' },
  { id: 'tri',   name: 'Trident', image: 'gate_tool/th/th_pc_tri.jpg' },
  { id: 'quad',  name: 'Quad',    image: 'gate_tool/th/th_pc_qua.jpg' },
  { id: 'plug',  name: 'Plug',    image: 'gate_tool/th/th_pc_plg.jpg' },
];

var FINIAL_FLAT_OPTIONS = [
  { id: 'plug', name: 'Plug', image: 'gate_tool/th/th_pc_plg.jpg' },
];

// ---- Accent options ----
var ACCENT_ALL = [
  { id: 'butterflies', name: 'Butterflies', image: 'gate_tool/th/th_acc_but.jpg', field: 'butterflies' },
  { id: 'scrolls',     name: 'Scrolls',     image: 'gate_tool/th/th_acc_scr.jpg', field: 'scrolls'     },
];

var ACCENT_SPEAR_ONLY = [
  { id: 'circles', name: 'Circles', image: 'gate_tool/th/th_acc_cir.jpg', field: 'circles' },
];

// ============================================================
// QuoteStep4_Extras Component
// ============================================================
function QuoteStep4_Extras(props) {
  var data = props.data;
  var update = props.update;

  var isSpearTop = SPEAR_STYLES.indexOf(data.style) !== -1;
  var finialOptions = isSpearTop ? FINIAL_SPEAR_OPTIONS : FINIAL_FLAT_OPTIONS;
  var accentOptions = isSpearTop
    ? ACCENT_SPEAR_ONLY.concat(ACCENT_ALL)
    : ACCENT_ALL;

  // Detect if any extras are pre-filled from Design Studio
  var hasPrefill = !!(data.finialType && data.finialType !== 'none') ||
    !!(data.circles) || !!(data.butterflies) || !!(data.scrolls);

  var hasRackingWarning =
    (data.butterflies || data.scrolls) &&
    data.terrain && data.terrain !== 'flat';

  // ---- Pre-fill banner ----
  function renderPrefillBanner() {
    if (!hasPrefill) return null;
    return el('div', { className: 'qb-extras-prefill-banner' },
      React.createElement(Sparkle, { size: 16, weight: 'fill' }),
      ' Carried over from your Design Studio selections'
    );
  }

  // ---- Finial selector ----
  function renderFinials() {
    var currentFinial = data.finialType || 'none';

    return el('div', { className: 'qb-extras-section' },
      sectionHeader('Finial Style',
        { title: 'Finial Style', text: 'Decorative tops on each picket. 15 finials per 6-foot panel section.' }
      ),
      el('div', { className: 'qb-extras-finial-grid' },
        // "None" option always available
        el('div', {
          className: 'qb-extras-thumb-card' + (currentFinial === 'none' ? ' active' : ''),
          onClick: function() { update({ finialType: 'none' }); },
        },
          el('div', { className: 'qb-extras-thumb-none' }, '\u2014'),
          el('div', { className: 'qb-extras-thumb-name' }, 'None')
        ),
        finialOptions.map(function(f) {
          return el('div', {
            key: f.id,
            className: 'qb-extras-thumb-card' + (currentFinial === f.id ? ' active' : ''),
            onClick: function() { update({ finialType: f.id }); },
          },
            el('img', { src: f.image, alt: f.name, className: 'qb-extras-thumb-img' }),
            el('div', { className: 'qb-extras-thumb-name' }, f.name)
          );
        })
      )
    );
  }

  // ---- Panel accents ----
  function renderAccents() {
    return el('div', { className: 'qb-extras-section' },
      sectionHeader('Panel Accents',
        { title: 'Panel Accents', text: 'Ornamental elements between pickets. Approximately 16 per panel section.' }
      ),
      el('div', { className: 'qb-extras-accent-list' },
        accentOptions.map(function(acc) {
          var checked = !!(data[acc.field]);
          return el('label', {
            key: acc.id,
            className: 'qb-extras-accent-row' + (checked ? ' checked' : ''),
          },
            el('input', {
              type: 'checkbox',
              checked: checked,
              onChange: function(e) {
                var changes = {};
                changes[acc.field] = e.target.checked;
                update(changes);
              },
            }),
            el('img', { src: acc.image, alt: acc.name, className: 'qb-extras-accent-img' }),
            el('span', { className: 'qb-extras-accent-name' }, acc.name)
          );
        })
      ),
      hasRackingWarning ? el('div', { className: 'qb-extras-warning' },
        React.createElement(Warning, { size: 15, weight: 'fill' }),
        ' Adding butterfly or scroll accents limits racking to Standard tier.'
      ) : null
    );
  }

  // ---- Post accessories ----
  function renderAccessories() {
    return el('div', { className: 'qb-extras-section' },
      sectionHeader('Post Accessories', null),
      el('div', { className: 'qb-extras-accessory-list' },

        // Flange covers
        el('label', {
          className: 'qb-extras-acc-row' + (data.flangeCovers ? ' checked' : ''),
        },
          el('input', {
            type: 'checkbox',
            checked: !!(data.flangeCovers),
            onChange: function(e) { update({ flangeCovers: e.target.checked }); },
          }),
          el('div', { className: 'qb-extras-acc-body' },
            el('span', { className: 'qb-extras-acc-name' }, 'Flange Covers'),
            el('span', { className: 'qb-extras-acc-desc' },
              'Decorative base covers that hide the post flange at ground level.'
            )
          ),
          React.createElement(InfoPopup, {
            title: 'Flange Covers',
            text: 'Decorative base covers that hide the post flange at ground level.',
          })
        ),

        // Touch-up paint kit
        el('label', {
          className: 'qb-extras-acc-row' + (data.paintKit ? ' checked' : ''),
        },
          el('input', {
            type: 'checkbox',
            checked: !!(data.paintKit),
            onChange: function(e) { update({ paintKit: e.target.checked }); },
          }),
          el('div', { className: 'qb-extras-acc-body' },
            el('span', { className: 'qb-extras-acc-name' }, 'Touch-Up Paint Kit'),
            el('span', { className: 'qb-extras-acc-desc' },
              'Color-matched paint for installation scratches.'
            )
          )
        )
      )
    );
  }

  // ---- Main render ----
  return el('div', { className: 'qb-extras-step' },
    renderPrefillBanner(),
    renderFinials(),
    renderAccents(),
    renderAccessories()
  );
}

export default QuoteStep4_Extras;
