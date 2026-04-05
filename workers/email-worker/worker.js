// ============================================================================
// Grandview Fence — Email Worker
// Receives quote/contact form submissions, sends email via Resend,
// and forwards to Google Apps Script for spreadsheet logging.
// ============================================================================

var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBdmxtSMuNETzERknuA9ZuhZ-KfK9kWCtDiFnVdIBnBqiLAAjGrpMgJmf_DibN6WnVYw/exec';

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
  var name = (p.firstName || '') + ' ' + (p.lastName || '');

  if (isQuote) {
    return [
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">',
      '<h2 style="color:#2c3e50;border-bottom:2px solid #6BA3C2;padding-bottom:8px;">',
      '&#9878; New Quote Request</h2>',
      '<table style="width:100%;border-collapse:collapse;">',
      row('Quote ID', p.quoteId),
      row('Name', name),
      row('Email', p.email),
      row('Phone', p.phone),
      row('Zip Code', p.zipCode),
      row('Style', p.style),
      row('Grade', p.grade),
      row('Height', p.fenceHeight),
      row('Linear Footage', p.linearFootage),
      row('Accessories', p.accessories),
      row('Location', p.location),
      row('Details', p.specialRequests),
      row('Subtotal', p.subtotal ? '$' + Number(p.subtotal).toFixed(2) : ''),
      '</table>',
      '<p style="color:#888;font-size:12px;margin-top:16px;">',
      'Submitted ' + (p.timestamp || new Date().toISOString()) + ' via Design Studio</p>',
      '</div>',
    ].join('');
  }

  // Contact form
  return [
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">',
    '<h2 style="color:#2c3e50;border-bottom:2px solid #6BA3C2;padding-bottom:8px;">',
    '&#9993; New Contact Message</h2>',
    '<table style="width:100%;border-collapse:collapse;">',
    row('Name', name),
    row('Email', p.email),
    row('Phone', p.phone),
    row('Topic', p.inquiryType),
    row('Message', p.specialRequests),
    row('Page', p.pageUrl),
    '</table>',
    '<p style="color:#888;font-size:12px;margin-top:16px;">',
    'Submitted ' + (p.timestamp || new Date().toISOString()) + ' via Design Studio</p>',
    '</div>',
  ].join('');
}

function row(label, value) {
  if (!value) return '';
  return '<tr><td style="padding:6px 12px;font-weight:bold;color:#555;border-bottom:1px solid #eee;">'
    + label + '</td><td style="padding:6px 12px;border-bottom:1px solid #eee;">'
    + String(value) + '</td></tr>';
}
