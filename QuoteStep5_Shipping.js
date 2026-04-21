// QuoteStep5_Shipping.js — Shipping & Contact step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React, { useState } from 'react';
import { Truck, HardHat, Question, PencilSimple, Package } from '@phosphor-icons/react';

// ---- Helpers ----
function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

function sectionHeader(title) {
  return el('div', { className: 'qs1-section-header' },
    el('h4', { className: 'qs1-section-title' }, title)
  );
}

// ---- US States ----
var US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

// ---- Install plan options ----
var INSTALL_OPTIONS = [
  { id: 'diy',        name: "I'll install myself",          icon: HardHat,  desc: 'DIY' },
  { id: 'contractor', name: "I'll hire a local installer",  icon: Truck,    desc: 'Contractor' },
  { id: 'not-sure',   name: 'Help me decide',               icon: Question, desc: 'Not Sure' },
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

// Parse a Mapbox geocoder placeName (e.g. "1600 Pennsylvania Ave NW,
// Washington, DC 20500, United States") into street/city/state/zip parts.
// Heuristic and tolerant: returns nulls for parts it can't confidently pull.
function parseMapboxPlaceName(placeName) {
  if (!placeName || typeof placeName !== 'string') return null;
  var parts = placeName.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  // Drop trailing country component
  while (parts.length && /^(united states|usa|us)$/i.test(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length === 0) return null;
  var last = parts.pop();
  var stateZipMatch = last.match(/^([A-Za-z]{2})\s+([\d-]+)$/);
  var state = '';
  var zip = '';
  var cityFromLast = '';
  if (stateZipMatch) {
    state = stateZipMatch[1].toUpperCase();
    zip = stateZipMatch[2];
  } else {
    // Sometimes the last token is just the zip or just the city.
    if (/^\d{5}(-\d{4})?$/.test(last)) zip = last;
    else cityFromLast = last;
  }
  var city = parts.length ? parts.pop() : cityFromLast;
  var street = parts.join(', ');
  return {
    street: street || '',
    city: city || '',
    state: state,
    zip: zip,
  };
}

function readDrawAddressFromStorage() {
  try {
    var raw = window.localStorage.getItem('gv_bridge_location');
    if (!raw) return null;
    var loc = JSON.parse(raw);
    if (!loc || typeof loc !== 'object') return null;
    var parsed = parseMapboxPlaceName(loc.address);
    if (!parsed) return null;
    return Object.assign({ placeName: loc.address || '' }, parsed);
  } catch (_) { return null; }
}

function QuoteStep5_Shipping(props) {
  var data = props.data;
  var update = props.update;
  var isFirstZone = props.isFirstZone;
  var editingContact = useState(false);
  var isEditing = editingContact[0];
  var setEditing = editingContact[1];

  // "Same as drawing address" auto-fill (UX-5b). Reads gv_bridge_location
  // (written by the draw flow's Mapbox geocoder) so the buyer can one-click
  // populate the shipping address. Checkbox defaults to true if shipping
  // fields are empty AND we have a parsed draw address — matches how most
  // buyers use the tool (draw first, then quote at the same site).
  var drawAddrFromStorage = React.useMemo(readDrawAddressFromStorage, []);
  var shipIsEmpty = !data.shippingStreet && !data.shippingCity && !data.shippingState && !data.shippingZip;
  var sameAsDrawState = useState(function() {
    return !!(drawAddrFromStorage && shipIsEmpty);
  });
  var sameAsDraw = sameAsDrawState[0];
  var setSameAsDraw = sameAsDrawState[1];

  // Apply the autofill on mount and whenever the checkbox flips on. We do NOT
  // clear fields when the checkbox flips off, so a buyer who toggles can edit
  // from the prefilled values rather than losing them.
  React.useEffect(function() {
    if (!sameAsDraw || !drawAddrFromStorage) return;
    update({
      shippingStreet: drawAddrFromStorage.street || data.shippingStreet || '',
      shippingCity: drawAddrFromStorage.city || data.shippingCity || '',
      shippingState: drawAddrFromStorage.state || data.shippingState || '',
      shippingZip: drawAddrFromStorage.zip || data.shippingZip || '',
    });
  }, [sameAsDraw]);

  // Pre-fill from jobAddress if available and shipping fields empty
  React.useEffect(function() {
    if (data.jobAddress && !data.shippingStreet) {
      var addr = data.jobAddress;
      update({
        shippingStreet: addr.street || '',
        shippingCity: addr.city || '',
        shippingState: addr.state || '',
        shippingZip: addr.zip || '',
      });
    }
  }, []);

  // Default sameAsInstall to true
  React.useEffect(function() {
    if (data.sameAsInstall === undefined) {
      update({ sameAsInstall: true });
    }
  }, []);

  return el('div', { className: 'qb-ship-container' },

    // ---- Installation Plan ----
    sectionHeader('Installation Plan'),
    el('div', { className: 'qs1-card-row' },
      INSTALL_OPTIONS.map(function(opt) {
        var selected = data.installPlan === opt.id;
        return el('div', {
          key: opt.id,
          className: 'qs1-card' + (selected ? ' selected' : ''),
          onClick: function() { update({ installPlan: opt.id }); },
        },
          React.createElement(opt.icon, { size: 22, weight: selected ? 'fill' : 'regular', className: 'qb-ship-icon' }),
          el('div', { className: 'qs1-card-title' }, opt.desc),
          el('div', { className: 'qs1-card-desc' }, opt.name)
        );
      })
    ),

    // ---- Shipping Address ----
    sectionHeader('Shipping Address'),

    // Auto-populate from the address the buyer entered when drawing their fence
    drawAddrFromStorage ? el('label', { className: 'qb-ship-same-as-draw' },
      el('input', {
        type: 'checkbox',
        checked: sameAsDraw,
        onChange: function(e) { setSameAsDraw(e.target.checked); },
      }),
      el('span', { className: 'qb-ship-same-as-draw-text' },
        'Ship to the address where you drew your fence: ',
        el('strong', null, drawAddrFromStorage.placeName || '')
      )
    ) : null,

    el('div', { className: 'qb-ship-fields' },
      el('input', {
        className: 'qb-ship-input qb-ship-full',
        type: 'text',
        placeholder: 'Street Address',
        value: data.shippingStreet || '',
        onChange: function(e) { update({ shippingStreet: e.target.value }); },
      }),
      el('input', {
        className: 'qb-ship-input',
        type: 'text',
        placeholder: 'City',
        value: data.shippingCity || '',
        onChange: function(e) { update({ shippingCity: e.target.value }); },
      }),
      el('select', {
        className: 'qb-ship-input qb-ship-select',
        value: data.shippingState || '',
        onChange: function(e) { update({ shippingState: e.target.value }); },
      },
        el('option', { value: '' }, 'State'),
        US_STATES.map(function(st) { return el('option', { key: st, value: st }, st); })
      ),
      el('input', {
        className: 'qb-ship-input qb-ship-zip',
        type: 'text',
        placeholder: 'ZIP',
        maxLength: 10,
        value: data.shippingZip || '',
        onChange: function(e) { update({ shippingZip: e.target.value }); },
      })
    ),

    // ---- Same as install site ----
    el('div', { className: 'qb-ship-toggle-row' },
      el('span', { className: 'qb-ship-toggle-label' }, 'Is this also the installation site?'),
      el('div', { className: 'qs1-toggle-row' },
        el('button', {
          className: 'qs1-toggle' + (data.sameAsInstall !== false ? ' active' : ''),
          onClick: function() { update({ sameAsInstall: true }); },
        }, 'Yes'),
        el('button', {
          className: 'qs1-toggle' + (data.sameAsInstall === false ? ' active' : ''),
          onClick: function() { update({ sameAsInstall: false }); },
        }, 'Different Site')
      )
    ),

    // ---- Shipping Info ----
    el('div', { className: 'qs5-shipping-info' },
      el('div', { className: 'qs5-shipping-badge' },
        el('span', { className: 'qs5-shipping-quoted' },
          React.createElement(Package, { size: 18, weight: 'duotone' }),
          ' Shipping will be quoted separately'
        )
      ),
      el('p', { className: 'qs5-shipping-note' },
        'Aluminum fence ships via LTL freight. Our team will provide a shipping quote with your order confirmation.'
      )
    ),

    // ---- Contact Info ----
    sectionHeader('Contact Information'),
    isFirstZone || isEditing
      ? el('div', { className: 'qb-ship-fields' },
          el('input', {
            className: 'qb-ship-input qb-ship-full',
            type: 'text',
            placeholder: 'Full Name',
            value: data.contactName || '',
            onChange: function(e) { update({ contactName: e.target.value }); },
          }),
          el('input', {
            className: 'qb-ship-input',
            type: 'email',
            placeholder: 'Email',
            value: data.contactEmail || '',
            onChange: function(e) { update({ contactEmail: e.target.value }); },
          }),
          !isValidEmail(data.contactEmail) && data.contactEmail
            ? el('span', { className: 'qb-ship-email-err' }, 'Please enter a valid email')
            : null,
          el('input', {
            className: 'qb-ship-input',
            type: 'tel',
            placeholder: 'Phone',
            value: data.contactPhone || '',
            onChange: function(e) { update({ contactPhone: e.target.value }); },
          }),
          !isFirstZone
            ? el('button', {
                className: 'qb-ship-edit-link',
                onClick: function() { setEditing(false); },
              }, 'Done')
            : null
        )
      : el('div', { className: 'qb-ship-contact-summary' },
          el('span', null,
            'Quoting as: ',
            el('strong', null, data.contactName || 'Unknown'),
            ' (' + (data.contactEmail || '') + ')'
          ),
          el('button', {
            className: 'qb-ship-edit-link',
            onClick: function() { setEditing(true); },
          },
            React.createElement(PencilSimple, { size: 14 }),
            ' Edit'
          )
        )
  );
}

export default QuoteStep5_Shipping;
