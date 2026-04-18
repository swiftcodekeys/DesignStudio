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

    if (url.pathname === '/api/parcel' && request.method === 'POST') {
      if (!env.REGRID_API_KEY) {
        return new Response(JSON.stringify({ ok: false, error: 'Server misconfigured' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      var body;
      try { body = await request.json(); }
      catch (e) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      var lat = Number(body.lat);
      var lng = Number(body.lng);
      if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid coordinates' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      try {
        var regridUrl = 'https://app.regrid.com/api/v2/parcels/point?lat=' + lat +
          '&lon=' + lng + '&token=' + env.REGRID_API_KEY;
        var rResp = await fetch(regridUrl);
        if (!rResp.ok) throw new Error('Regrid ' + rResp.status);
        var rData = await rResp.json();
        var features = (rData.parcels && rData.parcels.features) || [];
        if (features.length === 0) {
          return new Response(JSON.stringify({ ok: false, fallback: 'manual' }), {
            status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        var feature = features[0];
        var fields = (feature.properties && feature.properties.fields) || {};
        var out = {
          ok: true,
          data: {
            boundary: feature.geometry,
            address: fields.address || fields.scity || '',
            parcelId: fields.parcelnumb || feature.properties.ll_uuid || '',
            subdivision: fields.subdivision || '',
            dataQuality: feature.properties.score || 1,
          },
        };
        return new Response(JSON.stringify(out), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: 'Upstream error', retry: true }), {
          status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
