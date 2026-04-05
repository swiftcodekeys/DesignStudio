// ============================================================================
// Grandview Fence — Email Worker
// Receives quote/contact form submissions, sends email via Resend,
// and forwards to Google Apps Script for spreadsheet logging.
// ============================================================================

var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBdmxtSMuNETzERknuA9ZuhZ-KfK9kWCtDiFnVdIBnBqiLAAjGrpMgJmf_DibN6WnVYw/exec';
var LOGO_URL = 'https://designstudio-csy.pages.dev/assets/logo-email.png';

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

    var results = { email: null, sheet: null };

    // 1) Send email via Resend
    try {
      var emailHtml = buildEmailHtml(payload);
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
          html: emailHtml,
          reply_to: payload.email || undefined,
        }),
      });
      var resendData = await resendRes.json();
      results.email = resendRes.ok ? 'sent' : resendData;
    } catch (e) {
      results.email = 'error: ' + e.message;
    }

    // 2) Forward to GAS for Google Sheet logging
    try {
      var gasRes = await fetch(GAS_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      results.sheet = gasRes.ok ? 'logged' : 'gas-error-' + gasRes.status;
    } catch (e) {
      results.sheet = 'error: ' + e.message;
    }

    return new Response(JSON.stringify({ ok: true, results: results }), {
      status: 200,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
    });
  },
};

function buildEmailHtml(p) {
  var isQuote = p.source === 'design-studio-quote';
  var name = ((p.firstName || '') + ' ' + (p.lastName || '')).trim();

  var header = [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e8eaed;border-radius:8px;overflow:hidden;">',
    // Logo header
    '<div style="background:#1a2332;padding:24px;text-align:center;">',
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
    return [
      header,
      // Title bar
      '<div style="background:#6BA3C2;padding:12px 24px;">',
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
    '<div style="background:#6BA3C2;padding:12px 24px;">',
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
