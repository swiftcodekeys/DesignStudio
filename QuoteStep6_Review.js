// QuoteStep6_Review.js — Review & Submit step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PencilSimple, Warning, ShieldCheck, Package } from '@phosphor-icons/react';
import { calculateZoneQuote } from './priceCalculator';
import { estimatePerFootRange } from './retailPricing';
import {
  POST_CAP_LABELS,
  FINIAL_LABELS,
  PUPPY_TYPE_LABELS,
  ARCH_LABELS,
  MOUNT_LABELS,
  LEAF_LABELS,
  SLOPE_LABELS,
} from './optionLabels';

function fmtDollarsInt(n) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

// ---- Helpers ----
function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

function fmt(amount) {
  if (amount == null || isNaN(amount)) return '$0.00';
  return '$' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function editLink(label, stepIndex, onEditStep) {
  return el('button', {
    className: 'qb-review-edit',
    onClick: function() { onEditStep(stepIndex); },
  },
    React.createElement(PencilSimple, { size: 12 }),
    ' Edit'
  );
}

// ---- Humanize helpers ----
var COLOR_LABELS = {
  'textured-black': 'Textured Black', 'satin-black': 'Satin Black',
  'textured-bronze': 'Textured Bronze', 'satin-bronze': 'Satin Bronze',
  'textured-white': 'Textured White', 'satin-white': 'Satin White',
  'beige': 'Beige', 'satin-khaki': 'Satin Khaki',
  'forest-green': 'Forest Green',
};

// POST_CAP_LABELS and other option label maps are imported from optionLabels.js above.

var INSTALL_LABELS = {
  'diy': 'DIY Install', 'contractor': 'Hire a Contractor', 'not-sure': 'Undecided',
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function buildQuoteForCheckout(data, result, zoneName, snapshotUrl) {
  var subtotal = result.subtotal || 0;
  var shippingCents = 8000; // $80 default; replaced by actual freight in later phase
  var totalCents = Math.round(subtotal * 100) + shippingCents;
  return {
    id: null,
    zoneName: zoneName || 'Your fence',
    config: {
      style: data.style || '',
      height: data.height || '',
      color: data.color || '',
      grade: data.grade || '',
    },
    mapboxSnapshotUrl: snapshotUrl || null,
    items: (result.items || []).map(function(item) {
      return {
        label: item.label || item.description || '',
        qty: item.qty || 0,
        total: item.total || (item.qty * item.unitPrice) || 0,
      };
    }),
    subtotal: subtotal,
    shippingCents: shippingCents,
    totalCents: totalCents,
  };
}

function QuoteStep6_Review(props) {
  var data = props.data;
  var nav = useNavigate();
  var onEditStep = props.onEditStep;
  var zoneName = props.zoneName || 'This Zone';

  // Calculate pricing
  var result = calculateZoneQuote(data);
  var items = result.items || [];
  var warnings = result.warnings || [];
  var subtotal = result.subtotal || 0;

  // ---- Gates summary text ----
  var gatesList = data.gates || [];
  var gatesSummary = gatesList.length === 0
    ? 'None'
    : gatesList.map(function(g, i) {
        return (g.type === 'double' ? 'Double' : 'Single') + ' ' +
          (g.width || '?') + '" ' +
          capitalize(g.archTop || 'flat');
      }).join(', ');

  // ---- Extras summary ----
  var extraParts = [];
  if (data.finialType && data.finialType !== 'none') {
    extraParts.push('Finial: ' + (FINIAL_LABELS[data.finialType] || capitalize(data.finialType)));
  }
  if (data.butterflies) extraParts.push('Butterflies');
  if (data.scrolls)     extraParts.push('Scrolls');
  if (data.circles)     extraParts.push('Circles');
  if (data.midRail)         extraParts.push('Mid Rail');
  if (data.upperFinialRail) extraParts.push('Upper Finial Rail');
  if (data.butterflyCircles) extraParts.push('Butterfly Circles');
  if (data.postAccessories && data.postAccessories.length > 0) {
    extraParts.push(data.postAccessories.join(', '));
  }
  var extrasSummary = extraParts.length === 0 ? 'None' : extraParts.join(' | ');

  // ---- Address summary ----
  var addrParts = [];
  if (data.shippingStreet) addrParts.push(data.shippingStreet);
  if (data.shippingCity) addrParts.push(data.shippingCity);
  if (data.shippingState) addrParts.push(data.shippingState);
  if (data.shippingZip) addrParts.push(data.shippingZip);
  var addressSummary = addrParts.length > 0 ? addrParts.join(', ') : 'Not provided';

  var annotatedSnapshotUrl = props.annotatedSnapshotUrl || '';

  return el('div', { className: 'qb-review-container' },

    // ======== Annotated fence sketch (manufacturing spec visual) ========
    annotatedSnapshotUrl ? el('div', { className: 'qs6-annotated-snapshot' },
      el('img', {
        src: annotatedSnapshotUrl,
        alt: 'Annotated fence layout',
        className: 'qs6-annotated-snapshot-img',
      }),
      el('p', { className: 'qs6-annotated-snapshot-caption' },
        'This is the fence we will manufacture. Review carefully. This is what your order is built against.'
      )
    ) : null,

    // ======== CYA #3: Measurement responsibility card ========
    React.createElement('div', { className: 'qs6-cya-card' },
      React.createElement('h4', null, 'Before you continue'),
      React.createElement('p', null,
        'This quote assumes your measurements are accurate. Slope, obstacles, and utilities are yours to verify before install. A Grandview rep personally reviews every order within 24 hours.')
    ),

    // ======== Selections Summary ========
    // Order matches the QB step order (post-reorder 2026-04-21): Layout first,
    // Style second. Edit-link indexes point at the new step indexes.
    // ---- Layout & Posts (step 0) ----
    el('div', { className: 'qb-review-section' },
      el('div', { className: 'qb-review-section-header' },
        el('h4', { className: 'qs1-section-title' }, 'Layout & Posts'),
        editLink('Edit', 0, onEditStep)
      ),
      el('div', { className: 'qb-review-details' },
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Linear Feet'),
          el('span', { className: 'qb-review-value' }, (data.linearFeet || 0) + ' ft')
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Terrain'),
          el('span', { className: 'qb-review-value' }, capitalize(data.terrain || 'flat'))
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Corners'),
          el('span', { className: 'qb-review-value' }, data.corners || 0)
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'End Posts'),
          el('span', { className: 'qb-review-value' }, data.ends != null ? data.ends : 2)
        ),
        data.rackingTier
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Racking Tier'),
              el('span', { className: 'qb-review-value' }, capitalize(data.rackingTier || 'standard'))
            )
          : (data.racking
              ? el('div', { className: 'qb-review-row' },
                  el('span', { className: 'qb-review-label' }, 'Racking'),
                  el('span', { className: 'qb-review-value' }, 'Yes')
                )
              : null),
        data.slopeAnswer
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Slope'),
              el('span', { className: 'qb-review-value' }, SLOPE_LABELS[data.slopeAnswer] || capitalize(data.slopeAnswer))
            )
          : null
      )
    ),

    // ---- Style & Config (step 1) ----
    el('div', { className: 'qb-review-section' },
      el('div', { className: 'qb-review-section-header' },
        el('h4', { className: 'qs1-section-title' }, 'Style & Config'),
        editLink('Edit', 1, onEditStep)
      ),
      el('div', { className: 'qb-review-details' },
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Grade'),
          el('span', { className: 'qb-review-value' }, capitalize(data.grade))
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Style'),
          el('span', { className: 'qb-review-value' }, capitalize(data.style))
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Height'),
          el('span', { className: 'qb-review-value' }, (data.height || '?') + '"')
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Color'),
          el('span', { className: 'qb-review-value' }, COLOR_LABELS[data.color] || capitalize(data.color))
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Spacing'),
          el('span', { className: 'qb-review-value' }, capitalize(data.spacing))
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Rails'),
          el('span', { className: 'qb-review-value' }, (data.rails || 2) + '-rail')
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Post Caps'),
          el('span', { className: 'qb-review-value' }, POST_CAP_LABELS[data.postCap] || capitalize(data.postCap))
        ),
        data.puppyPickets
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Puppy Pickets'),
              el('span', { className: 'qb-review-value' },
                (function() {
                  var pupId = data._pupVariant || data.pupType || data.puppyStyle;
                  return pupId ? (PUPPY_TYPE_LABELS[pupId] || capitalize(pupId)) : 'Yes';
                })()
              )
            )
          : null,
        data.arch
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Arch Style'),
              el('span', { className: 'qb-review-value' }, ARCH_LABELS[data.arch] || capitalize(data.arch))
            )
          : null,
        data.mount
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Mount Type'),
              el('span', { className: 'qb-review-value' }, MOUNT_LABELS[data.mount] || capitalize(data.mount))
            )
          : null,
        data.leaf != null && data.leaf !== ''
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Gate Leaf'),
              el('span', { className: 'qb-review-value' }, LEAF_LABELS[data.leaf] || capitalize(String(data.leaf)))
            )
          : null
      )
    ),

    // ---- Gates ----
    el('div', { className: 'qb-review-section' },
      el('div', { className: 'qb-review-section-header' },
        el('h4', { className: 'qs1-section-title' }, 'Gates'),
        editLink('Edit', 2, onEditStep)
      ),
      el('div', { className: 'qb-review-details' },
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, gatesList.length + ' gate(s)'),
          el('span', { className: 'qb-review-value' }, gatesSummary)
        )
      )
    ),

    // ---- Extras ----
    el('div', { className: 'qb-review-section' },
      el('div', { className: 'qb-review-section-header' },
        el('h4', { className: 'qs1-section-title' }, 'Extras & Upgrades'),
        editLink('Edit', 3, onEditStep)
      ),
      el('div', { className: 'qb-review-details' },
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Selections'),
          el('span', { className: 'qb-review-value' }, extrasSummary)
        )
      )
    ),

    // ---- Shipping ----
    el('div', { className: 'qb-review-section' },
      el('div', { className: 'qb-review-section-header' },
        el('h4', { className: 'qs1-section-title' }, 'Shipping & Contact'),
        editLink('Edit', 4, onEditStep)
      ),
      el('div', { className: 'qb-review-details' },
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Install Plan'),
          el('span', { className: 'qb-review-value' }, INSTALL_LABELS[data.installPlan] || 'Not selected')
        ),
        el('div', { className: 'qb-review-row' },
          el('span', { className: 'qb-review-label' }, 'Ship To'),
          el('span', { className: 'qb-review-value' }, addressSummary)
        ),
        data.contactName
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Contact'),
              el('span', { className: 'qb-review-value' }, data.contactName + ' (' + (data.contactEmail || '') + ')')
            )
          : null
      )
    ),

    // ======== Materials Breakdown ========
    el('div', { className: 'qb-review-section qb-review-materials' },
      el('div', { className: 'qb-review-section-header' },
        React.createElement(Package, { size: 18, weight: 'bold' }),
        el('h4', { className: 'qs1-section-title' }, 'Calculated Materials')
      ),

      // Warnings
      warnings.length > 0
        ? el('div', { className: 'qb-review-warnings' },
            warnings.map(function(w, i) {
              return el('div', { key: i, className: 'qb-review-warning' },
                React.createElement(Warning, { size: 14, weight: 'fill' }),
                el('span', null, w)
              );
            })
          )
        : null,

      // Table
      items.length > 0
        ? el('table', { className: 'qb-review-table' },
            el('thead', null,
              el('tr', null,
                el('th', null, 'Item'),
                el('th', { className: 'qb-review-num' }, 'Qty'),
                el('th', { className: 'qb-review-num' }, 'Unit Price'),
                el('th', { className: 'qb-review-num' }, 'Total')
              )
            ),
            el('tbody', null,
              items.map(function(item, i) {
                return el('tr', { key: i },
                  el('td', null, item.name || item.description || 'Item'),
                  el('td', { className: 'qb-review-num' }, item.qty != null ? item.qty : '-'),
                  el('td', { className: 'qb-review-num' }, item.unitPrice != null ? fmt(item.unitPrice) : '-'),
                  el('td', { className: 'qb-review-num' }, fmt(item.total || (item.qty * item.unitPrice) || 0))
                );
              })
            )
          )
        : el('div', { className: 'qb-review-empty' }, 'No items calculated.'),

      // Subtotal
      el('div', { className: 'qb-review-subtotal' },
        el('span', null, 'Estimated Subtotal'),
        el('span', { className: 'qb-review-subtotal-amount' }, fmt(subtotal))
      ),

      // ---- Per-LF rate + total range (Task 3) ----
      (function() {
        var est = estimatePerFootRange(data);
        if (!est) return null;
        var lf = Number(data.linearFeet) || 0;
        return el('div', { className: 'qb-review-estimate' },
          el('div', { className: 'qb-review-estimate-row' },
            el('span', null, 'Estimated per linear foot'),
            el('span', { className: 'qb-review-estimate-value' },
              fmtDollarsInt(est.low) + '\u2013' + fmtDollarsInt(est.high)
            )
          ),
          lf > 0 ? el('div', { className: 'qb-review-estimate-row' },
            el('span', null, 'Estimated range for ' + lf + ' ft of fence'),
            el('span', { className: 'qb-review-estimate-value' },
              fmtDollarsInt(est.low * lf) + '\u2013' + fmtDollarsInt(est.high * lf)
            )
          ) : null,
          el('div', { className: 'qb-review-estimate-note' },
            'Final pricing confirmed in your full quote.'
          )
        );
      })()
    ),

    // ======== Verification Disclaimer ========
    el('div', { className: 'qb-review-disclaimer' },
      React.createElement(ShieldCheck, { size: 16, weight: 'fill' }),
      el('span', null, 'All measurements are verified by our team before your order enters production.')
    ),

    // ======== CTA ========
    el('div', { className: 'qb-review-cta-row' },
      el('button', {
        className: 'qb-review-cta qb-review-cta--secondary',
        onClick: function() {
          if (props.onComplete) {
            props.onComplete(data, result);
          }
        },
      }, 'Get Quote for ' + zoneName),
      el('button', {
        className: 'qb-review-cta qb-review-cta--pay',
        onClick: function() {
          var quoteObj = buildQuoteForCheckout(data, result, zoneName, props.annotatedSnapshotUrl);
          nav('/checkout', { state: { quote: quoteObj } });
        },
      }, 'Pay & Reserve →')
    )
  );
}

export default QuoteStep6_Review;
