// epqsClient.js — USGS EPQS elevation + slope classification

var EPQS_URL = 'https://epqs.nationalmap.gov/v1/json';

export async function queryElevation(lat, lng, timeoutMs) {
  var timeout = timeoutMs || 5000;
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = null;
  try {
    if (controller) timer = setTimeout(function() { controller.abort(); }, timeout);
    var url = EPQS_URL + '?x=' + lng + '&y=' + lat + '&units=Feet&wkid=4326&includeDate=false';
    var resp = await fetch(url, controller ? { signal: controller.signal } : {});
    if (!resp.ok) return null;
    var data = await resp.json();
    if (data == null || data.value == null) return null;
    return {
      elevationFeet: Number(data.value),
      dataSource: data.dataSource || '3DEP 1m',
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
