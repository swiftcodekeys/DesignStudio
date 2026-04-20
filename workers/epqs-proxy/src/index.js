// workers/epqs-proxy/src/index.js
// Proxies browser requests to USGS EPQS (epqs.nationalmap.gov). USGS does not
// send CORS headers, so the browser cannot call it directly; this worker adds
// the missing CORS layer.

// Matches any Cloudflare Pages preview subdomain for this project,
// e.g. https://feat-quote-redesign.designstudio-csy.pages.dev.
// We allow these implicitly so branch previews work without editing ALLOWED_ORIGINS.
var PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.designstudio-csy\.pages\.dev$/;

var UPSTREAM_TIMEOUT_MS = 5000;

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    var origin = request.headers.get('origin') || '';
    var allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    var isExactAllowed = origin && allowed.includes(origin);
    var isPreviewAllowed = origin && PREVIEW_ORIGIN_RE.test(origin);
    var originAllowed = isExactAllowed || isPreviewAllowed;
    var corsOrigin = originAllowed ? origin : (allowed[0] || '*');
    var corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };
    // Vary: Origin when we echo the request Origin so caches key correctly
    // and do not serve the wrong Allow-Origin to a different caller.
    if (originAllowed) {
      corsHeaders['Vary'] = 'Origin';
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'epqs-proxy' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (url.pathname === '/api/epqs' && request.method === 'GET') {
      var lat = Number(url.searchParams.get('lat'));
      var lng = Number(url.searchParams.get('lng'));
      if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid coordinates' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, UPSTREAM_TIMEOUT_MS);
      try {
        var epqsUrl = 'https://epqs.nationalmap.gov/v1/json?x=' + lng + '&y=' + lat +
          '&units=Feet&wkid=4326&includeDate=false';
        var uResp = await fetch(epqsUrl, { signal: controller.signal });
        if (!uResp.ok) throw new Error('EPQS ' + uResp.status);
        var uData = await uResp.json();
        if (uData == null || uData.value == null) {
          return new Response(JSON.stringify({ ok: false, error: 'No elevation data' }), {
            status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        var out = {
          ok: true,
          data: {
            elevationFeet: Number(uData.value),
            dataSource: uData.dataSource || '3DEP 1m',
          },
        };
        return new Response(JSON.stringify(out), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: 'Upstream error', retry: true }), {
          status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } finally {
        clearTimeout(timer);
      }
    }

    return new Response(JSON.stringify({ ok: false, error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  },
};
