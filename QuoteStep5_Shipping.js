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

function QuoteStep5_Shipping(props) {
  var data = props.data;
  var update = props.update;
  var isFirstZone = props.isFirstZone;
  var editingContact = useState(false);
  var isEditing = editingContact[0];
  var setEditing = editingContact[1];

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
