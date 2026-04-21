// epqsClient.js — USGS EPQS elevation + slope classification
// Elevation queries go through the Cloudflare Worker at EPQS_PROXY_URL because
// USGS does not send CORS headers. See workers/epqs-proxy/.

var EPQS_PROXY_URL = (typeof process !== 'undefined' && process.env && process.env.EPQS_PROXY_URL)
  ? process.env.EPQS_PROXY_URL
  : 'https://grandview-epqs-proxy.sarah-13a.workers.dev';

// Single-shot fetch. Factored so the retry path in queryElevation can call it
// without re-entering the outer timeout/retry bookkeeping.
async function queryElevationOnce(lat, lng, timeoutMs) {
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = null;
  try {
    if (controller) timer = setTimeout(function() { controller.abort(); }, timeoutMs);
    var url = EPQS_PROXY_URL + '/api/epqs?lat=' + lat + '&lng=' + lng;
    var resp = await fetch(url, controller ? { signal: controller.signal } : {});
    if (!resp.ok) return null;
    var body = await resp.json();
    if (!body || !body.ok || !body.data || body.data.elevationFeet == null) return null;
    return {
      elevationFeet: Number(body.data.elevationFeet),
      dataSource: body.data.dataSource || '3DEP 1m',
    };
  } catch (e) {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Default per-attempt timeout is 12s. The worker's upstream budget is 10s
// including its own retry backoff, so a 10s client timeout races the wire.
// 12s gives ~2s of Cloudflare-edge-to-browser RTT margin so we don't abort
// a response that is already in flight. The previous 5s default aborted
// before the worker could respond on any USGS cold start, turning healthy
// calls into nulls. One client-side retry on null covers the case where the
// first attempt coincides with a cold start.
export async function queryElevation(lat, lng, timeoutMs) {
  var timeout = timeoutMs || 12000;
  var first = await queryElevationOnce(lat, lng, timeout);
  if (first) return first;
  // Tiny backoff so a thundering-herd retry does not hammer the upstream.
  await new Promise(function(res) { setTimeout(res, 200); });
  return queryElevationOnce(lat, lng, timeout);
}

// Runs `fn(item)` for each item with at most `concurrency` in flight at once.
// Preserves input order in the output. Used by classifyDrawnLine so a buyer
// drawing 20+ vertices doesn't fire 20 concurrent calls at USGS at once
// (which overloads the upstream and trips the client timeout on most of them).
async function mapWithConcurrency(items, concurrency, fn) {
  var out = new Array(items.length);
  var idx = 0;
  var workers = [];
  var n = Math.min(concurrency, items.length);
  for (var w = 0; w < n; w++) {
    workers.push((async function() {
      while (idx < items.length) {
        var my = idx++;
        out[my] = await fn(items[my], my);
      }
    })());
  }
  await Promise.all(workers);
  return out;
}

// segments: array of {start:[lng,lat], end:[lng,lat]}
// panelLengthFt: 6 (residential) or 8 (industrial)
// Returns { segmentClassifications:[], overallClassification, confidence, maxDeltaInches }
export async function classifyDrawnLine(points, segmentLengthFt) {
  var panelLen = segmentLengthFt || 6;
  // Concurrency 4: empirical sweet spot. Promise.all over 20 points produced
  // ~20% AbortError rate when the USGS upstream was slow; dropping to 4 while
  // keeping the per-request 10s timeout + one retry gave 100% success across
  // repeated 20-point stress runs.
  var samples = await mapWithConcurrency(points, 4, function(pt) {
    return queryElevation(pt[1], pt[0]);  // EPQS uses x=lng, y=lat
  });

  var anyNull = samples.some(function(s) { return !s; });
  var allNull = samples.every(function(s) { return !s; });
  // With every sample missing we have nothing to partially classify, and the
  // UI should present the honest "unknown, ask the customer" path.
  if (allNull) {
    return { segmentClassifications: [], overallClassification: 'unknown', confidence: 'low', maxDeltaInches: 0 };
  }

  var validSamples = samples.filter(function(s) { return !!s; });
  var allLidar = !anyNull && validSamples.every(function(s) { return /1m|lidar|3DEP/i.test(s.dataSource); });

  var classifications = [];
  var maxDelta = 0;
  for (var i = 0; i < samples.length - 1; i++) {
    var a = samples[i];
    var b = samples[i+1];
    // Segments with either endpoint missing are flagged 'unknown' rather than
    // dropping the whole classification. Lets the UI show what it can.
    if (!a || !b) {
      classifications.push({
        segmentIndex: i,
        deltaInches: 0,
        classification: 'unknown',
        dataSource: (a && a.dataSource) || (b && b.dataSource) || null,
      });
      continue;
    }
    var deltaFt = Math.abs(b.elevationFeet - a.elevationFeet);
    var deltaIn = deltaFt * 12;
    maxDelta = Math.max(maxDelta, deltaIn);
    var c = 'flat';
    if (deltaIn > 36) c = 'steps';
    else if (deltaIn > 20) c = 'steep';
    else if (deltaIn > 6) c = 'sloped';
    classifications.push({
      segmentIndex: i,
      deltaInches: deltaIn,
      classification: c,
      dataSource: a.dataSource,
    });
  }

  var overall = 'flat';
  for (var j = 0; j < classifications.length; j++) {
    if (classifications[j].classification === 'steps') { overall = 'steps'; break; }
    if (classifications[j].classification === 'steep') overall = 'steep';
    else if (classifications[j].classification === 'sloped' && overall === 'flat') overall = 'sloped';
  }
  // Downgrade overall to 'unknown' if we partially failed AND everything we
  // did classify was flat. Otherwise the steeper observed segment wins.
  if (anyNull && overall === 'flat') overall = 'unknown';

  return {
    segmentClassifications: classifications,
    overallClassification: overall,
    confidence: allLidar ? 'high' : 'low',
    maxDeltaInches: maxDelta,
  };
}
