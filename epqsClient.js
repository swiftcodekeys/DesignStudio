// epqsClient.js — USGS EPQS elevation + slope classification
// Elevation queries go through the Cloudflare Worker at EPQS_PROXY_URL because
// USGS does not send CORS headers. See workers/epqs-proxy/.

var EPQS_PROXY_URL = (typeof process !== 'undefined' && process.env && process.env.EPQS_PROXY_URL)
  ? process.env.EPQS_PROXY_URL
  : 'https://grandview-epqs-proxy.sarah-13a.workers.dev';

export async function queryElevation(lat, lng, timeoutMs) {
  var timeout = timeoutMs || 5000;
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = null;
  try {
    if (controller) timer = setTimeout(function() { controller.abort(); }, timeout);
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

// segments: array of {start:[lng,lat], end:[lng,lat]}
// panelLengthFt: 6 (residential) or 8 (industrial)
// Returns { segmentClassifications:[], overallClassification, confidence, maxDeltaInches }
export async function classifyDrawnLine(points, segmentLengthFt) {
  var panelLen = segmentLengthFt || 6;
  var samples = await Promise.all(points.map(function(pt) {
    return queryElevation(pt[1], pt[0]);  // EPQS uses x=lng, y=lat
  }));

  var allLidar = samples.every(function(s) { return s && /1m|lidar|3DEP/i.test(s.dataSource); });
  var anyNull = samples.some(function(s) { return !s; });

  if (anyNull) {
    return { segmentClassifications: [], overallClassification: 'unknown', confidence: 'low', maxDeltaInches: 0 };
  }

  var classifications = [];
  var maxDelta = 0;
  for (var i = 0; i < samples.length - 1; i++) {
    var deltaFt = Math.abs(samples[i+1].elevationFeet - samples[i].elevationFeet);
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
      dataSource: samples[i].dataSource,
    });
  }

  var overall = 'flat';
  for (var j = 0; j < classifications.length; j++) {
    if (classifications[j].classification === 'steps') { overall = 'steps'; break; }
    if (classifications[j].classification === 'steep') overall = 'steep';
    else if (classifications[j].classification === 'sloped' && overall === 'flat') overall = 'sloped';
  }

  return {
    segmentClassifications: classifications,
    overallClassification: overall,
    confidence: allLidar ? 'high' : 'low',
    maxDeltaInches: maxDelta,
  };
}
