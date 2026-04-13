// ZoneQuoteSummary.js — Combined multi-zone summary page
// React.createElement, var, function declarations, vanilla CSS

import React from 'react';
import {
  ArrowSquareOut,
  DownloadSimple,
  ChatCircleDots,
  CheckCircle,
  PencilSimple,
  ShieldCheck,
  Medal,
} from '@phosphor-icons/react';
import { getGrandTotal, getZoneOrder } from './wizardState';

// ─── el() shorthand ───────────────────────────────────────────────────────────
function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n) {
  if (typeof n !== 'number' || isNaN(n)) return '$0.00';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function generateQuoteRef() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var ref = '';
  for (var i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'GV-' + ref;
}

// Map zoneId to display label
var ZONE_LABELS = {
  front: 'Front Yard',
  back:  'Backyard',
  gate:  'Driveway Gate',
};

// Summarize config into a readable one-liner
function buildConfigSummary(config) {
  if (!config) return '';
  var parts = [];
  if (config.style) {
    var s = String(config.style);
    parts.push(s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '));
  }
  if (config.height) parts.push(config.height + '"');
  if (config.color) {
    var c = config.color;
    var colorName = (typeof c === 'object' && c.displayName)
      ? c.displayName
      : (typeof c === 'string' ? c : '');
    if (colorName) parts.push(colorName);
  }
  return parts.join(' · ');
}

// Pull material highlights (panels, posts, gates) from quoteResult.items
function buildMaterialHighlights(quoteResult) {
  if (!quoteResult || !quoteResult.items || !quoteResult.items.length) return [];
  var highlights = [];
  var panels = 0;
  var posts  = 0;
  var gates  = 0;

  for (var i = 0; i < quoteResult.items.length; i++) {
    var item = quoteResult.items[i];
    var label = (item.label || '').toLowerCase();
    if (label.indexOf('panel') >= 0) panels += (item.qty || 0);
    if (label.indexOf('post') >= 0)  posts  += (item.qty || 0);
    if (label.indexOf('gate') >= 0)  gates  += (item.qty || 0);
  }

  if (panels > 0) highlights.push(panels + ' panel' + (panels !== 1 ? 's' : ''));
  if (posts  > 0) highlights.push(posts  + ' post'  + (posts  !== 1 ? 's' : ''));
  if (gates  > 0) highlights.push(gates  + ' gate'  + (gates  !== 1 ? 's' : ''));
  return highlights;
}

// ─── Sub-component: per-zone card ─────────────────────────────────────────────

function ZoneSummaryCard(props) {
  var zoneId     = props.zoneId;
  var zoneData   = props.zoneData;
  var onEdit     = props.onEdit;

  var label      = ZONE_LABELS[zoneId] || zoneId;
  var config     = zoneData.config     || {};
  var quoteResult = zoneData.quoteResult || null;
  var subtotal   = (quoteResult && quoteResult.subtotal) ? quoteResult.subtotal : 0;
  var summary    = buildConfigSummary(config);
  var highlights = buildMaterialHighlights(quoteResult);
  var warnings   = (quoteResult && quoteResult.warnings && quoteResult.warnings.length)
    ? quoteResult.warnings : [];

  return el('div', { className: 'summary-zone-card' },

    // ─── Card header: zone name + subtotal
    el('div', { className: 'summary-zone-header' },
      el('div', { className: 'summary-zone-title' },
        el('span', { className: 'summary-zone-label' }, label.toUpperCase())
      ),
      el('span', { className: 'summary-zone-subtotal' }, formatCurrency(subtotal))
    ),

    // ─── Config summary line
    summary
      ? el('p', { className: 'summary-zone-config' }, summary)
      : null,

    // ─── Material highlights
    highlights.length > 0
      ? el('p', { className: 'summary-zone-materials' }, highlights.join(' · '))
      : null,

    // ─── Warnings
    warnings.length > 0
      ? el('ul', { className: 'summary-zone-warnings' },
          warnings.map(function(w, idx) {
            return el('li', { key: idx }, w);
          })
        )
      : null,

    // ─── Edit button row
    el('div', { className: 'summary-zone-footer' },
      el('button', {
        className: 'summary-edit-btn',
        onClick: function() { if (onEdit) onEdit(zoneId); },
        'aria-label': 'Edit ' + label,
      },
        React.createElement(PencilSimple, { size: 15, weight: 'bold' }),
        el('span', null, 'Edit')
      )
    )
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

function ZoneQuoteSummary(props) {
  // props: wizardState, onEditZone(zoneId), onSubmitQuote(), onOrderNow(), onTalkToExpert()
  var wizardState   = props.wizardState   || {};
  var onEditZone    = props.onEditZone    || function() {};
  var onSubmitQuote = props.onSubmitQuote || function() {};
  var onOrderNow    = props.onOrderNow    || function() {};
  var onTalkToExpert = props.onTalkToExpert || function() {};

  var quoteRef      = React.useState(generateQuoteRef)[0];
  var zoneQuotes    = wizardState.zoneQuotes || {};
  var zoneOrder     = getZoneOrder(wizardState);
  var grandTotal    = getGrandTotal(wizardState);

  // Only show completed zones
  var completedZones = zoneOrder.filter(function(zoneId) {
    var z = zoneQuotes[zoneId];
    return z && z.status === 'complete';
  });

  function handleDownloadPDF() {
    console.log('PDF download — will be wired in Task 18');
  }

  // ─── Empty state guard
  if (completedZones.length === 0) {
    return el('div', { className: 'summary-empty' },
      el('p', null, 'No completed zones to display.')
    );
  }

  return el('div', { className: 'summary-page' },

    // ─── Page header
    el('div', { className: 'summary-header' },
      el('div', { className: 'summary-header-inner' },
        el('div', { className: 'summary-header-check' },
          React.createElement(CheckCircle, { size: 32, weight: 'fill', color: '#38a169' })
        ),
        el('div', { className: 'summary-header-text' },
          el('h1', { className: 'summary-title' }, 'Your Complete Quote'),
          el('span', { className: 'summary-ref' }, 'Quote Reference: ' + quoteRef)
        )
      )
    ),

    // ─── Zone cards
    el('div', { className: 'summary-zones' },
      completedZones.map(function(zoneId) {
        return React.createElement(ZoneSummaryCard, {
          key:      zoneId,
          zoneId:   zoneId,
          zoneData: zoneQuotes[zoneId] || {},
          onEdit:   onEditZone,
        });
      })
    ),

    // ─── Grand total bar
    el('div', { className: 'summary-grand-total-bar' },
      el('span', { className: 'summary-grand-label' }, 'GRAND TOTAL'),
      el('span', { className: 'summary-grand-amount' }, formatCurrency(grandTotal))
    ),

    // ─── Verification disclaimer
    el('p', { className: 'summary-disclaimer' },
      React.createElement(ShieldCheck, { size: 16, weight: 'fill', style: { verticalAlign: 'middle', marginRight: 6, color: '#6BA3C2' } }),
      'All measurements verified by our team before production.'
    ),

    // ─── CTA buttons
    el('div', { className: 'summary-ctas' },

      // Primary: Order Now
      el('button', {
        className: 'summary-cta-btn summary-cta-order',
        onClick: onOrderNow,
      },
        el('span', null, 'Order Now \u2014 We Verify Before We Build'),
        React.createElement(ArrowSquareOut, { size: 18, weight: 'bold', style: { flexShrink: 0 } })
      ),

      // Secondary: Submit Quote Request
      el('button', {
        className: 'summary-cta-btn summary-cta-submit',
        onClick: onSubmitQuote,
      },
        'Submit Quote Request'
      ),

      // Outline: Talk to an Expert
      el('button', {
        className: 'summary-cta-btn summary-cta-expert',
        onClick: onTalkToExpert,
      },
        React.createElement(ChatCircleDots, { size: 18, weight: 'duotone', style: { flexShrink: 0 } }),
        el('span', null, 'Talk to an Expert')
      ),

      // Outline: Download PDF (placeholder)
      el('button', {
        className: 'summary-cta-btn summary-cta-pdf',
        onClick: handleDownloadPDF,
      },
        React.createElement(DownloadSimple, { size: 18, weight: 'bold', style: { flexShrink: 0 } }),
        el('span', null, 'Download PDF')
      )
    ),

    // ─── Footer badges
    el('div', { className: 'summary-badges' },
      React.createElement(Medal, { size: 18, weight: 'fill', style: { color: '#6BA3C2', flexShrink: 0 } }),
      el('span', { className: 'summary-badges-text' },
        'SDVOSB\u2002|\u2002Veteran-Owned\u2002|\u2002Woman-Owned'
      )
    )
  );
}

export default ZoneQuoteSummary;
