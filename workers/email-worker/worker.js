// ============================================================================
// Grandview Fence — Email Worker
// Receives quote/contact form submissions, sends email via Resend,
// and forwards to Google Apps Script for spreadsheet logging.
// ============================================================================

var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBdmxtSMuNETzERknuA9ZuhZ-KfK9kWCtDiFnVdIBnBqiLAAjGrpMgJmf_DibN6WnVYw/exec';
var LOGO_URL = 'https://studio.grandviewfence.com/assets/logo-email.png';

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    var payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
      });
    }

    // Analytics events — just log to GAS, no email
    if (payload.source === 'analytics') {
      var analyticsResult = { sheet: null };
      try {
        var gasRes = await fetch(GAS_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        analyticsResult.sheet = gasRes.ok ? 'logged' : 'gas-error-' + gasRes.status;
      } catch (e) {
        analyticsResult.sheet = 'error: ' + e.message;
      }
      return new Response(JSON.stringify({ ok: true, results: analyticsResult }), {
        status: 200,
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
      });
    }

    // Save-quote-link — send a simple resume link email, then log to GAS
    if (payload.source === 'save-quote-link') {
      var saveResult = { resumeEmail: null, sheet: null };
      if (payload.email && payload.resumeUrl) {
        try {
          var saveName = ((payload.firstName || '') + ' ' + (payload.lastName || '')).trim() || 'there';
          var saveHtml = [
            '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">',
            '<div style="background:#6BA3C2;padding:24px;text-align:center;">',
            '<img src="' + LOGO_URL + '" alt="Grandview Fence" style="height:80px;width:auto;" />',
            '</div>',
            '<div style="background:#1a2332;padding:12px 24px;">',
            '<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Your Saved Design</h2>',
            '</div>',
            '<div style="padding:20px 24px;">',
            '<p style="margin:0 0 16px;color:#1a2332;font-size:15px;line-height:1.5;">Hi ' + saveName + ',</p>',
            '<p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.5;">',
            'Here\'s your link to resume your fence design in the Grandview Design Studio. Click below to pick up right where you left off.</p>',
            '<div style="text-align:center;margin:24px 0;">',
            '<a href="' + payload.resumeUrl + '" style="display:inline-block;padding:14px 36px;background:#d4753a;color:#fff;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;">Resume My Design</a>',
            '</div>',
            '<p style="margin:0;color:#888;font-size:12px;">If the button doesn\'t work, copy and paste this link: <a href="' + payload.resumeUrl + '" style="color:#6BA3C2;">' + payload.resumeUrl + '</a></p>',
            '</div>',
            '<div style="padding:16px 24px;background:#f8f9fa;border-top:1px solid #e8eaed;">',
            '<p style="margin:0 0 8px;color:#1a2332;font-size:14px;font-weight:600;">Questions?</p>',
            '<p style="margin:0;color:#555;font-size:13px;line-height:1.6;">',
            'Reply to this email or call us at <a href="tel:+18553362330" style="color:#6BA3C2;">(855) FENCE-30</a><br/>',
            '<a href="https://www.grandviewfence.com" style="color:#6BA3C2;">www.grandviewfence.com</a></p>',
            '</div>',
            '</div>',
          ].join('');

          var saveRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + env.RESEND_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Grandview Fence <noreply@grandviewfence.com>',
              to: [payload.email],
              subject: 'Your Saved Fence Design — Grandview Fence',
              html: saveHtml,
              reply_to: 'sales@grandviewfence.com',
            }),
          });
          var saveData = await saveRes.json();
          saveResult.resumeEmail = saveRes.ok ? 'sent' : saveData;
        } catch (e) {
          saveResult.resumeEmail = 'error: ' + e.message;
        }
      }
      try {
        var gasRes2 = await fetch(GAS_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        saveResult.sheet = gasRes2.ok ? 'logged' : 'gas-error-' + gasRes2.status;
      } catch (e) {
        saveResult.sheet = 'error: ' + e.message;
      }
      return new Response(JSON.stringify({ ok: true, results: saveResult }), {
        status: 200,
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
      });
    }

    var results = { salesEmail: null, customerEmail: null, sheet: null };

    // 1) Send sales notification email
    try {
      var salesHtml = buildSalesEmailHtml(payload);
      var resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Grandview Design Studio <noreply@grandviewfence.com>',
          to: ['sales@grandviewfence.com'],
          subject: payload.source === 'design-studio-quote'
            ? 'New Quote Request — ' + (payload.quoteId || 'Design Studio')
            : 'New Contact — ' + (payload.inquiryType || 'Design Studio'),
          html: salesHtml,
          reply_to: payload.email || undefined,
        }),
      });
      var resendData = await resendRes.json();
      results.salesEmail = resendRes.ok ? 'sent' : resendData;
    } catch (e) {
      results.salesEmail = 'error: ' + e.message;
    }

    // 2) Send customer their quote copy
    if (payload.email && payload.source === 'design-studio-quote') {
      try {
        var customerHtml = buildCustomerEmailHtml(payload);
        var custRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + env.RESEND_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Grandview Fence <noreply@grandviewfence.com>',
            to: [payload.email],
            subject: 'Your Fence Quote — ' + (payload.quoteId || 'Grandview Fence'),
            html: customerHtml,
            reply_to: 'sales@grandviewfence.com',
          }),
        });
        var custData = await custRes.json();
        results.customerEmail = custRes.ok ? 'sent' : custData;
      } catch (e) {
        results.customerEmail = 'error: ' + e.message;
      }
    }

    // 3) Forward to GAS for Google Sheet logging
    try {
      var gasRes3 = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      results.sheet = gasRes3.ok ? 'logged' : 'gas-error-' + gasRes3.status;
    } catch (e) {
      results.sheet = 'error: ' + e.message;
    }

    return new Response(JSON.stringify({ ok: true, results: results }), {
      status: 200,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
    });
  },
};

// Renders a single zone as a styled table group for sales/customer emails
function buildZoneSectionHtml(zone) {
  var parts = [];
  var subtotalFormatted = zone.subtotal
    ? '$' + Number(zone.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 })
    : '';

  // Zone name header
  parts.push(
    '<div style="margin:0 24px 0;padding:8px 12px;background:#f0f7fb;border-left:4px solid #6BA3C2;">',
    '<span style="font-size:12px;font-weight:700;color:#6BA3C2;text-transform:uppercase;letter-spacing:1.5px;">' + (zone.zoneName || zone.zoneId || '') + '</span>',
    '</div>'
  );

  // Style / height / linear footage summary
  var summaryParts = [];
  if (zone.style) summaryParts.push(zone.style);
  if (zone.grade) summaryParts.push(capitalize(zone.grade));
  if (zone.height) summaryParts.push(zone.height);
  if (zone.linearFootage) summaryParts.push(zone.linearFootage + ' ft');
  if (summaryParts.length > 0) {
    parts.push(
      '<div style="margin:0 24px;padding:6px 12px;">',
      '<span style="font-size:13px;color:#555;">' + summaryParts.join(' &nbsp;·&nbsp; ') + '</span>',
      '</div>'
    );
  }

  // Line items table (if present)
  if (zone.items && zone.items.length > 0) {
    parts.push(
      '<div style="margin:0 24px;">',
      '<table style="width:100%;border-collapse:collapse;font-size:13px;">',
      '<tr style="border-bottom:1px solid #e8eaed;">',
      '<th style="padding:6px 4px;text-align:left;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Item</th>',
      '<th style="padding:6px 4px;text-align:center;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Qty</th>',
      '<th style="padding:6px 4px;text-align:right;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Unit</th>',
      '<th style="padding:6px 4px;text-align:right;color:#888;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Total</th>',
      '</tr>'
    );
    for (var i = 0; i < zone.items.length; i++) {
      var item = zone.items[i];
      var unitStr = item.unitPrice != null ? '$' + Number(item.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
      var totalStr = item.total != null ? '$' + Number(item.total).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
      parts.push(
        '<tr style="border-bottom:1px solid #f0f0f0;">',
        '<td style="padding:7px 4px;color:#1a2332;">' + (item.label || '') + '</td>',
        '<td style="padding:7px 4px;text-align:center;color:#555;">' + (item.qty != null ? item.qty : '') + '</td>',
        '<td style="padding:7px 4px;text-align:right;color:#555;">' + unitStr + '</td>',
        '<td style="padding:7px 4px;text-align:right;color:#1a2332;font-weight:600;">' + totalStr + '</td>',
        '</tr>'
      );
    }
    parts.push('</table>', '</div>');
  }

  // Accessories note (if present, no items array)
  if (zone.accessories && (!zone.items || zone.items.length === 0)) {
    parts.push(
      '<div style="margin:0 24px;padding:4px 12px;">',
      '<span style="font-size:12px;color:#888;">Accessories: ' + zone.accessories + '</span>',
      '</div>'
    );
  }

  // Zone subtotal row
  if (subtotalFormatted) {
    parts.push(
      '<div style="margin:6px 24px 16px;padding:8px 12px;display:flex;justify-content:flex-end;border-top:1px solid #e8eaed;">',
      '<table style="width:100%;border-collapse:collapse;"><tr>',
      '<td style="font-size:13px;color:#888;padding:4px 0;">Zone Subtotal</td>',
      '<td style="font-size:15px;font-weight:700;color:#1a2332;text-align:right;padding:4px 0;">' + subtotalFormatted + '</td>',
      '</tr></table>',
      '</div>'
    );
  }

  return parts.join('');
}

function buildSalesEmailHtml(p) {
  var isQuote = p.source === 'design-studio-quote';
  var name = ((p.firstName || '') + ' ' + (p.lastName || '')).trim();

  var header = [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">',
    // Logo header
    '<div style="background:#6BA3C2;padding:24px;text-align:center;">',
    '<img src="' + LOGO_URL + '" alt="Grandview Fence" style="height:80px;width:auto;" />',
    '</div>',
  ].join('');

  var footer = [
    '<div style="padding:16px 24px;background:#f8f9fa;border-top:1px solid #e8eaed;">',
    '<p style="margin:0;color:#888;font-size:12px;">',
    'Submitted ' + formatDate(p.timestamp) + ' via <a href="https://studio.grandviewfence.com/wizard" style="color:#6BA3C2;">Design Studio</a></p>',
    '</div>',
    '</div>',
  ].join('');

  if (isQuote) {
    // ── Multi-zone branch ──
    if (p.zones && p.zones.length > 0) {
      var zoneParts = [];
      for (var z = 0; z < p.zones.length; z++) {
        zoneParts.push(buildZoneSectionHtml(p.zones[z]));
      }
      var grandTotalFormatted = p.grandTotal
        ? '$' + Number(p.grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })
        : '';
      return [
        header,
        // Title bar
        '<div style="background:#1a2332;padding:12px 24px;">',
        '<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">New Multi-Zone Quote Request</h2>',
        '</div>',
        // Customer details section
        '<div style="padding:20px 24px;">',
        '<h3 style="margin:0 0 12px;color:#1a2332;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Customer Details</h3>',
        '<table style="width:100%;border-collapse:collapse;">',
        row('Name', name),
        row('Email', p.email ? '<a href="mailto:' + p.email + '" style="color:#6BA3C2;">' + p.email + '</a>' : ''),
        row('Phone', p.phone ? '<a href="tel:' + p.phone + '" style="color:#6BA3C2;">' + p.phone + '</a>' : ''),
        row('Location', p.location),
        row('Zip Code', p.zipCode),
        row('Quote ID', '<strong style="color:#1a2332;">' + (p.quoteId || '') + '</strong>'),
        '</table>',
        '</div>',
        // Zone sections
        '<div style="padding:0 0 4px;">',
        '<div style="padding:0 24px 8px;">',
        '<h3 style="margin:0 0 4px;color:#1a2332;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Quote Zones</h3>',
        '</div>',
        zoneParts.join(''),
        '</div>',
        // Grand total bar
        grandTotalFormatted ? [
          '<div style="margin:0 24px 20px;padding:16px 20px;background:#1a2332;border-radius:6px;display:flex;">',
          '<table style="width:100%;border-collapse:collapse;"><tr>',
          '<td style="font-size:14px;color:#aac6d8;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Grand Total</td>',
          '<td style="font-size:28px;font-weight:800;color:#fff;text-align:right;">' + grandTotalFormatted + '</td>',
          '</tr></table>',
          '</div>',
        ].join('') : '',
        footer,
      ].join('');
    }

    // ── Single-zone (legacy) branch ──
    return [
      header,
      // Title bar
      '<div style="background:#1a2332;padding:12px 24px;">',
      '<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">New Quote Request</h2>',
      '</div>',
      // Customer info section
      '<div style="padding:20px 24px;">',
      '<h3 style="margin:0 0 12px;color:#1a2332;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Customer Details</h3>',
      '<table style="width:100%;border-collapse:collapse;">',
      row('Name', name),
      row('Email', p.email ? '<a href="mailto:' + p.email + '" style="color:#6BA3C2;">' + p.email + '</a>' : ''),
      row('Phone', p.phone ? '<a href="tel:' + p.phone + '" style="color:#6BA3C2;">' + p.phone + '</a>' : ''),
      row('Location', p.location),
      row('Zip Code', p.zipCode),
      '</table>',
      '</div>',
      // Quote details section
      '<div style="padding:0 24px 20px;">',
      '<h3 style="margin:0 0 12px;color:#1a2332;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Quote Details</h3>',
      '<table style="width:100%;border-collapse:collapse;">',
      row('Quote ID', '<strong style="color:#1a2332;">' + (p.quoteId || '') + '</strong>'),
      row('Style', p.style),
      row('Grade', capitalize(p.grade)),
      row('Height', p.fenceHeight),
      row('Linear Footage', p.linearFootage ? p.linearFootage + ' ft' : ''),
      row('Accessories', p.accessories),
      row('Details', p.specialRequests),
      '</table>',
      '</div>',
      // Subtotal highlight
      p.subtotal ? [
        '<div style="margin:0 24px 20px;padding:16px;background:#f0f7fb;border-radius:6px;border-left:4px solid #6BA3C2;">',
        '<span style="font-size:14px;color:#555;">Estimated Subtotal</span><br/>',
        '<span style="font-size:28px;font-weight:800;color:#1a2332;">$' + Number(p.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 }) + '</span>',
        '</div>',
      ].join('') : '',
      footer,
    ].join('');
  }

  // Contact form email
  return [
    header,
    '<div style="background:#1a2332;padding:12px 24px;">',
    '<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">New Contact Message</h2>',
    '</div>',
    '<div style="padding:20px 24px;">',
    '<table style="width:100%;border-collapse:collapse;">',
    row('Name', name),
    row('Email', p.email ? '<a href="mailto:' + p.email + '" style="color:#6BA3C2;">' + p.email + '</a>' : ''),
    row('Phone', p.phone ? '<a href="tel:' + p.phone + '" style="color:#6BA3C2;">' + p.phone + '</a>' : ''),
    row('Topic', capitalize(p.inquiryType)),
    '</table>',
    '<div style="margin-top:16px;padding:16px;background:#f8f9fa;border-radius:6px;border-left:4px solid #6BA3C2;">',
    '<p style="margin:0;color:#555;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Message</p>',
    '<p style="margin:0;color:#1a2332;font-size:15px;line-height:1.5;">' + (p.specialRequests || '') + '</p>',
    '</div>',
    '</div>',
    footer,
  ].join('');
}

function buildCustomerEmailHtml(p) {
  var name = ((p.firstName || '') + ' ' + (p.lastName || '')).trim() || 'there';

  var headerHtml = [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">',
    // Logo header — sky blue
    '<div style="background:#6BA3C2;padding:24px;text-align:center;">',
    '<img src="' + LOGO_URL + '" alt="Grandview Fence" style="height:80px;width:auto;" />',
    '</div>',
  ].join('');

  var footerHtml = [
    // CTA
    '<div style="padding:0 24px 24px;text-align:center;">',
    '<a href="https://studio.grandviewfence.com/wizard" style="display:inline-block;padding:12px 32px;background:#d4753a;color:#fff;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;">View Design Studio</a>',
    '</div>',
    // Contact info
    '<div style="padding:16px 24px;background:#f8f9fa;border-top:1px solid #e8eaed;">',
    '<p style="margin:0 0 8px;color:#1a2332;font-size:14px;font-weight:600;">Questions?</p>',
    '<p style="margin:0;color:#555;font-size:13px;line-height:1.6;">',
    'Reply to this email or call us at <a href="tel:+18553362330" style="color:#6BA3C2;">(855) FENCE-30</a><br/>',
    '<a href="https://www.grandviewfence.com" style="color:#6BA3C2;">www.grandviewfence.com</a></p>',
    '</div>',
    '</div>',
  ].join('');

  // ── Multi-zone branch ──
  if (p.zones && p.zones.length > 0) {
    var zoneParts2 = [];
    for (var z = 0; z < p.zones.length; z++) {
      zoneParts2.push(buildZoneSectionHtml(p.zones[z]));
    }
    var grandTotalFormatted2 = p.grandTotal
      ? '$' + Number(p.grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })
      : '';
    return [
      headerHtml,
      // Title bar — dark
      '<div style="background:#1a2332;padding:12px 24px;">',
      '<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Your Fence Quote</h2>',
      '</div>',
      // Greeting
      '<div style="padding:20px 24px 0;">',
      '<p style="margin:0 0 16px;color:#1a2332;font-size:15px;line-height:1.5;">Hi ' + name + ',</p>',
      '<p style="margin:0 0 4px;color:#555;font-size:14px;line-height:1.5;">',
      'Thank you for using our Design Studio! Here\'s a summary of your multi-zone quote. A member of our team will follow up within 1 business day.</p>',
      '</div>',
      // Quote ID row
      '<div style="padding:12px 24px 0;">',
      '<table style="width:100%;border-collapse:collapse;">',
      row('Quote ID', '<strong>' + (p.quoteId || '') + '</strong>'),
      '</table>',
      '</div>',
      // Zone sections
      '<div style="padding:8px 0 4px;">',
      '<div style="padding:0 24px 8px;">',
      '<h3 style="margin:0 0 4px;color:#1a2332;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Your Zones</h3>',
      '</div>',
      zoneParts2.join(''),
      '</div>',
      // Grand total bar
      grandTotalFormatted2 ? [
        '<div style="margin:0 24px 20px;padding:16px 20px;background:#1a2332;border-radius:6px;">',
        '<table style="width:100%;border-collapse:collapse;"><tr>',
        '<td style="font-size:14px;color:#aac6d8;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Grand Total</td>',
        '<td style="font-size:28px;font-weight:800;color:#fff;text-align:right;">' + grandTotalFormatted2 + '</td>',
        '</tr></table>',
        '</div>',
      ].join('') : '',
      // Next steps (CYA #5)
      '<div style="padding:0 24px 20px;">' +
      '<h3 style="color:#1a1a2e">Next steps</h3>' +
      '<p>Grandview reviews every order within 24 hours. If your site conditions differ from the quote (slope, obstacles, utility lines), we\u2019ll reach out before production starts.</p>' +
      '</div>',
      footerHtml,
    ].join('');
  }

  // ── Single-zone (legacy) branch ──
  return [
    headerHtml,
    // Title bar — dark
    '<div style="background:#1a2332;padding:12px 24px;">',
    '<h2 style="margin:0;color:#fff;font-size:18px;font-weight:700;">Your Fence Quote</h2>',
    '</div>',
    // Greeting
    '<div style="padding:20px 24px 0;">',
    '<p style="margin:0 0 16px;color:#1a2332;font-size:15px;line-height:1.5;">',
    'Hi ' + name + ',</p>',
    '<p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.5;">',
    'Thank you for using our Design Studio! Here\'s a summary of your quote. A member of our team will follow up within 1 business day.</p>',
    '</div>',
    // Quote details
    '<div style="padding:0 24px 20px;">',
    '<h3 style="margin:0 0 12px;color:#1a2332;font-size:15px;text-transform:uppercase;letter-spacing:1px;">Quote Details</h3>',
    '<table style="width:100%;border-collapse:collapse;">',
    row('Quote ID', '<strong>' + (p.quoteId || '') + '</strong>'),
    row('Style', p.style),
    row('Grade', capitalize(p.grade)),
    row('Height', p.fenceHeight),
    row('Linear Footage', p.linearFootage ? p.linearFootage + ' ft' : ''),
    row('Accessories', p.accessories),
    row('Details', p.specialRequests),
    '</table>',
    '</div>',
    // Subtotal
    p.subtotal ? [
      '<div style="margin:0 24px 20px;padding:16px;background:#f0f7fb;border-radius:6px;border-left:4px solid #6BA3C2;">',
      '<span style="font-size:14px;color:#555;">Estimated Subtotal</span><br/>',
      '<span style="font-size:28px;font-weight:800;color:#1a2332;">$' + Number(p.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2 }) + '</span>',
      '</div>',
    ].join('') : '',
    // Next steps (CYA #5)
    '<div style="padding:0 24px 20px;">' +
    '<h3 style="color:#1a1a2e">Next steps</h3>' +
    '<p>Grandview reviews every order within 24 hours. If your site conditions differ from the quote (slope, obstacles, utility lines), we\u2019ll reach out before production starts.</p>' +
    '</div>',
    footerHtml,
  ].join('');
}

function row(label, value) {
  if (!value) return '';
  return '<tr>'
    + '<td style="padding:8px 0;font-size:13px;color:#888;width:130px;vertical-align:top;">' + label + '</td>'
    + '<td style="padding:8px 0;font-size:14px;color:#1a2332;">' + String(value) + '</td>'
    + '</tr>';
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(ts) {
  if (!ts) return new Date().toISOString();
  var d = new Date(ts);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
