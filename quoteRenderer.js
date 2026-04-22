// quoteRenderer.js — Generate printable/PDF quote from zone data
// Uses a hidden iframe with print-optimized HTML, triggered by window.print()

import { getZoneOrder, getGrandTotal } from './wizardState';

var ZONE_LABELS = {
  front: 'Front Yard',
  back: 'Backyard',
  gate: 'Driveway Gate',
};

function generateQuoteHtml(state) {
  var zones = getZoneOrder(state);
  var grandTotal = getGrandTotal(state);
  var contact = state.contactInfo || {};
  var shipping = state.shippingAddress || {};

  var zoneSections = zones.map(function(zoneId) {
    var zone = state.zoneQuotes[zoneId];
    if (!zone || zone.status !== 'complete') return '';
    var config = zone.config || {};
    var result = zone.quoteResult || {};

    var itemRows = (result.items || []).map(function(item) {
      return '<tr>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;">' + (item.label || '') + '</td>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">' + (item.qty || '') + '</td>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">$' + (item.unitPrice || 0).toFixed(2) + '</td>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$' + (item.total || 0).toFixed(2) + '</td>'
        + '</tr>';
    }).join('');

    var zoneName = ZONE_LABELS[zoneId] || zoneId;
    var styleName = config.style || '';
    if (styleName) styleName = styleName.charAt(0).toUpperCase() + styleName.slice(1);
    var heightVal = config.height ? config.height + '"' : '';
    var colorVal = config.color || '';
    if (typeof colorVal === 'object' && colorVal.displayName) colorVal = colorVal.displayName;

    return '<div style="margin-bottom:24px;">'
      + '<h3 style="margin:0 0 8px;color:#1B3A5C;font-size:16px;border-bottom:2px solid #6BA3C2;padding-bottom:4px;">' + zoneName + '</h3>'
      + '<p style="margin:0 0 8px;font-size:12px;color:#666;">'
      + [styleName, heightVal, colorVal].filter(Boolean).join(' · ')
      + '</p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
      + '<tr style="background:#f0f4f8;">'
      + '<th style="text-align:left;padding:6px 0;">Item</th>'
      + '<th style="text-align:center;padding:6px 0;">Qty</th>'
      + '<th style="text-align:right;padding:6px 0;">Unit</th>'
      + '<th style="text-align:right;padding:6px 0;">Total</th>'
      + '</tr>'
      + itemRows
      + '<tr><td colspan="3" style="padding:8px 0;text-align:right;font-weight:700;">Zone Subtotal</td>'
      + '<td style="padding:8px 0;text-align:right;font-weight:700;font-size:14px;">$' + (result.subtotal || 0).toFixed(2) + '</td></tr>'
      + '</table>'
      + '</div>';
  }).join('');

  return '<!DOCTYPE html><html><head><title>Grandview Fence Quote</title>'
    + '<style>body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#333;}'
    + '@media print{body{padding:20px;}}</style></head><body>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">'
    + '<div><img src="assets/logo-email.png" alt="Grandview Fence" style="height:50px;" />'
    + '<div style="font-size:11px;color:#888;margin-top:4px;">grandviewfence.com | (855) FENCE-30</div></div>'
    + '<div style="text-align:right;"><div style="font-size:11px;color:#888;">Quote Date</div>'
    + '<div style="font-size:13px;font-weight:600;">' + new Date().toLocaleDateString() + '</div></div></div>'
    + '<div style="margin-bottom:20px;padding:12px;background:#f8f9fa;border-radius:8px;">'
    + '<div style="font-size:12px;"><strong>Customer:</strong> ' + (contact.name || '') + '</div>'
    + '<div style="font-size:12px;"><strong>Email:</strong> ' + (contact.email || '') + '</div>'
    + '<div style="font-size:12px;"><strong>Ship to:</strong> ' + [shipping.street, shipping.city, shipping.state, shipping.zip].filter(Boolean).join(', ') + '</div>'
    + '</div>'
    + zoneSections
    + '<div style="margin-top:16px;padding:16px;background:#1B3A5C;border-radius:8px;color:#fff;display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:16px;font-weight:800;">Grand Total</span>'
    + '<span style="font-size:22px;font-weight:800;">$' + grandTotal.toFixed(2) + '</span></div>'
    + '<div style="margin-top:16px;font-size:10px;color:#888;text-align:center;">'
    + 'All measurements verified by our team before production. Pricing valid for 30 days.<br/>'
    + 'Grandview Fence LLC | SDVOSB | Veteran-Owned | Woman-Owned</div>'
    + '</body></html>';
}

export function downloadQuotePdf(state) {
  var html = generateQuoteHtml(state);
  var iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  setTimeout(function() {
    iframe.contentWindow.print();
    setTimeout(function() { document.body.removeChild(iframe); }, 1000);
  }, 250);
}
