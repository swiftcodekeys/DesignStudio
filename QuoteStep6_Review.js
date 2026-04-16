// QuoteStep6_Review.js — Review & Submit step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React from 'react';
import { PencilSimple, Warning, ShieldCheck, Package } from '@phosphor-icons/react';
import { calculateZoneQuote } from './priceCalculator';
import { estimatePerFootRange } from './retailPricing';

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

var INSTALL_LABELS = {
  'diy': 'DIY Install', 'contractor': 'Hire a Contractor', 'not-sure': 'Undecided',
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

function QuoteStep6_Review(props) {
  var data = props.data;
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
  if (data.finialType && data.finialType !== 'none') extraParts.push('Finial: ' + capitalize(data.finialType));
  if (data.butterflies) extraParts.push('Butterflies');
  if (data.scrolls) extraParts.push('Scrolls');
  if (data.circles) extraParts.push('Circles');
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

  return el('div', { className: 'qb-review-container' },

    // ======== Selections Summary ========
    el('div', { className: 'qb-review-section' },
      el('div', { className: 'qb-review-section-header' },
        el('h4', { className: 'qs1-section-title' }, 'Style & Config'),
        editLink('Edit', 0, onEditStep)
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
          el('span', { className: 'qb-review-value' }, capitalize(data.postCap))
        )
      )
    ),

    // ---- Layout ----
    el('div', { className: 'qb-review-section' },
      el('div', { className: 'qb-review-section-header' },
        el('h4', { className: 'qs1-section-title' }, 'Layout & Posts'),
        editLink('Edit', 1, onEditStep)
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
          el('span', { className: 'qb-review-value' }, data.endPosts || 0)
        ),
        data.racking
          ? el('div', { className: 'qb-review-row' },
              el('span', { className: 'qb-review-label' }, 'Racking'),
              el('span', { className: 'qb-review-value' }, 'Yes')
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
    el('button', {
      className: 'qb-review-cta',
      onClick: function() {
        if (props.onComplete) {
          props.onComplete(data, result);
        }
      },
    }, 'Get Quote for ' + zoneName)
  );
}

export default QuoteStep6_Review;
