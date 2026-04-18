// workers/parcel-proxy/src/index.js
// Proxies browser requests to Regrid API. Never exposes REGRID_API_KEY to client.

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    var origin = request.headers.get('origin') || '';
    var allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
    var corsOrigin = allowed.includes(origin) ? origin : allowed[0] || '*';
    var corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'parcel-proxy' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
