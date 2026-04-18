// geometryUtils.js — geometry helpers for Mapbox draw tool

// --- Ramer-Douglas-Peucker ---
function perpendicularDistance(pt, lineStart, lineEnd) {
  var dx = lineEnd[0] - lineStart[0];
  var dy = lineEnd[1] - lineStart[1];
  if (dx === 0 && dy === 0) {
    return Math.sqrt(Math.pow(pt[0]-lineStart[0],2) + Math.pow(pt[1]-lineStart[1],2));
  }
  var t = ((pt[0]-lineStart[0])*dx + (pt[1]-lineStart[1])*dy) / (dx*dx + dy*dy);
  var cx = lineStart[0] + t*dx;
  var cy = lineStart[1] + t*dy;
  return Math.sqrt(Math.pow(pt[0]-cx,2) + Math.pow(pt[1]-cy,2));
}

export function simplifyRDP(points, epsilon) {
  if (!points || points.length < 3) return points.slice();
  var dmax = 0, idx = 0;
  for (var i = 1; i < points.length - 1; i++) {
    var d = perpendicularDistance(points[i], points[0], points[points.length-1]);
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > epsilon) {
    var a = simplifyRDP(points.slice(0, idx+1), epsilon);
    var b = simplifyRDP(points.slice(idx), epsilon);
    return a.slice(0, -1).concat(b);
  }
  return [points[0], points[points.length-1]];
}

// --- Angle + compass ---
export function angleBetween(p1, p2, p3) {
  var a1 = Math.atan2(p2[1]-p1[1], p2[0]-p1[0]);
  var a2 = Math.atan2(p3[1]-p2[1], p3[0]-p2[0]);
  var diff = Math.abs(a2 - a1) * 180 / Math.PI;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function compassBearing(start, end) {
  var dx = end[0] - start[0];
  var dy = end[1] - start[1];
  var angle = Math.atan2(dx, dy) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  var dirs = ['North','Northeast','East','Southeast','South','Southwest','West','Northwest'];
  var idx = Math.round(angle / 45) % 8;
  return dirs[idx];
}

// --- Side splitting ---
// Input: closed polygon ring [[lng,lat],...,[lng,lat]] with first === last
// Output: array of sides { start, end, compassLabel, index }
export function splitPolygonIntoSides(polygon) {
  var sides = [];
  for (var i = 0; i < polygon.length - 1; i++) {
    sides.push({
      index: i,
      start: polygon[i],
      end: polygon[i+1],
      compassLabel: compassBearing(polygon[i], polygon[i+1]),
    });
  }
  return sides;
}

// --- Sample step count (used by densifyPath and consumers that need to map back to sample indices) ---
export function computeSampleStepCount(start, end, sampleSpacingFeet) {
  var FEET_PER_DEG_LAT = 364567.2;
  var dLng = end[0] - start[0];
  var dLat = end[1] - start[1];
  var cosLat = Math.cos(start[1] * Math.PI / 180);
  var feetDist = FEET_PER_DEG_LAT * Math.sqrt(dLat*dLat + dLng*dLng*cosLat*cosLat);
  return Math.max(1, Math.ceil(feetDist / sampleSpacingFeet));
}

// --- Sample-classification aggregator ---
// Maps per-sample segmentClassifications back to per-user-segment summaries.
// userSegments: [{ start: [lng,lat], end: [lng,lat] }, ...]
// segmentClassifications: [{ classification, deltaInches, ... }, ...] from epqsClient.classifyDrawnLine
// sampleSpacingFeet: same value passed to densifyPath (typically 6)
// Returns: [{ classification, signedDelta, maxAbsDelta }, ...] keyed by user-segment index.
export function aggregateClassificationsForUserSegments(userSegments, segmentClassifications, sampleSpacingFeet) {
  var SEVERITY = { flat: 0, sloped: 1, steep: 2, steps: 3, unknown: -1 };
  var out = [];
  var sampleSegStartIdx = 0;
  for (var u = 0; u < userSegments.length; u++) {
    var seg = userSegments[u];
    var steps = computeSampleStepCount(seg.start, seg.end, sampleSpacingFeet);
    var rangeEnd = sampleSegStartIdx + steps;

    var worstClass = 'flat';
    var maxAbsDelta = 0;
    var signedDelta = 0;
    for (var k = sampleSegStartIdx; k < rangeEnd && k < segmentClassifications.length; k++) {
      var sc = segmentClassifications[k];
      var newSev = SEVERITY[sc.classification];
      var curSev = SEVERITY[worstClass];
      if (newSev !== undefined && curSev !== undefined && newSev > curSev) worstClass = sc.classification;
      var abs = Math.abs(sc.deltaInches);
      if (abs > maxAbsDelta) {
        maxAbsDelta = abs;
        signedDelta = sc.deltaInches;
      }
    }
    out.push({ classification: worstClass, signedDelta: signedDelta, maxAbsDelta: maxAbsDelta });
    sampleSegStartIdx = rangeEnd;
  }
  return out;
}

// --- Sloped post counting ---
// Given per-user-segment rackingTier data, count how many physical posts sit
// on a sloped (rackable / heavy-rackable) segment. Used to price the $4.75
// "Double-Punch Posts (racking)" surcharge accurately on partially-sloped
// yards. Shared boundary posts are counted once; a boundary post is marked
// sloped if EITHER adjacent segment is sloped (the post receives the racked
// panel).
// segments: [{ lengthFeet, rackingTier }, ...]
// panelLengthFt: 6 for residential/commercial, 8 for industrial.
// Returns an integer count of sloped posts.
export function computeSlopedPostCount(segments, panelLengthFt) {
  if (!segments || segments.length === 0) return 0;
  var pl = panelLengthFt ?? 6;
  function isSloped(tier) {
    return tier && tier !== 'standard' && tier !== 'stair-step';
  }
  var count = 0;
  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    var panels = Math.max(0, Math.ceil((seg.lengthFeet || 0) / pl));
    var segSloped = isSloped(seg.rackingTier);
    var prevSloped = i > 0 && isSloped(segments[i - 1].rackingTier);

    // Start post: shared with previous segment's end. Count only if sloped
    // under the either-adjacent rule AND we haven't already counted it as
    // the previous segment's end post.
    var startSloped = segSloped || prevSloped;
    if (i === 0) {
      // First segment's start post has no previous neighbor.
      if (segSloped) count += 1;
    } else if (startSloped && !prevSloped) {
      // Previous segment didn't claim this boundary as sloped; this segment
      // does (previous was standard, current is sloped) — count once here.
      count += 1;
    }
    // Otherwise the boundary post was already counted in the previous
    // segment's loop iteration (if prevSloped is true).

    // Interior + end posts belonging to this segment: panels posts after the
    // start. These are new (not shared with any earlier-indexed segment).
    if (segSloped) {
      count += panels;
    }
  }
  return count;
}

// --- Densify ---
// Insert interpolated points every approxFeetPerSample feet along the path.
export function densifyPath(points, approxFeetPerSample) {
  if (!points || points.length < 2) return points || [];
  var out = [points[0]];
  for (var i = 0; i < points.length - 1; i++) {
    var a = points[i], b = points[i+1];
    var dLng = b[0] - a[0];
    var dLat = b[1] - a[1];
    var steps = computeSampleStepCount(a, b, approxFeetPerSample);
    for (var s = 1; s <= steps; s++) {
      var t = s / steps;
      out.push([a[0] + dLng*t, a[1] + dLat*t]);
    }
  }
  return out;
}
