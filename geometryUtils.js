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

// --- Racking tier mapping ---
// Maps an EPQS slope classification onto the racking tier the fence needs.
// classifications: 'flat' | 'sloped' | 'steep' | 'steps' | 'unknown'
// tiers: 'standard' | 'rackable' | 'heavy' | 'steps' | 'unknown'
export function classificationToRackingTier(classification) {
  switch (classification) {
    case 'flat': return 'standard';
    case 'sloped': return 'rackable';
    case 'steep': return 'heavy';
    case 'steps': return 'steps';
    default: return 'unknown';
  }
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

// --- Corner / end / line-post counting ---
// Returns { endPosts, corners, linePosts }:
//   endPosts  = first and last vertex of an open line. Always 2 for any
//               non-degenerate open run; 0 for a closed polygon (the
//               closing vertex merges into a corner).
//   corners   = interior vertices where the inbound and outbound bearings
//               differ by at least `minCornerDeg` (default 15, per Pass 4
//               spec). Gentler interior bends are absorbed into the line
//               run because a standard panel can flex through them.
//   linePosts = estimate of auto-placed posts along the straight runs
//               between structural posts, assuming `panelLengthFt` spacing.
export function countCornersAndLinePosts(points, panelLengthFt, minCornerDeg) {
  if (!points || points.length < 2) return { corners: 0, linePosts: 0, endPosts: 0 };
  var minDeg = minCornerDeg || 15;
  var first = points[0];
  var last = points[points.length - 1];
  var closed = points.length >= 3 && first[0] === last[0] && first[1] === last[1];
  var endPosts = closed ? 0 : 2;
  var corners = 0;
  var innerLast = closed ? points.length - 1 : points.length - 1;
  for (var i = 1; i < innerLast; i++) {
    var a = bearingDeg(points[i-1], points[i]);
    var b = bearingDeg(points[i], points[i+1]);
    var diff = Math.abs(((b - a + 540) % 360) - 180);
    if (diff >= minDeg) corners++;
  }
  // Closed polygon: check the wrap-around vertex (last == first) too.
  if (closed) {
    var a2 = bearingDeg(points[points.length - 2], last);
    var b2 = bearingDeg(first, points[1]);
    var diffClose = Math.abs(((b2 - a2 + 540) % 360) - 180);
    if (diffClose >= minDeg) corners++;
  }
  var totalFt = 0;
  for (var j = 0; j < points.length - 1; j++) {
    totalFt += haversineFeet(points[j], points[j+1]);
  }
  var structural = corners + endPosts;
  var posts = Math.max(0, Math.ceil(totalFt / (panelLengthFt || 6)) - structural);
  return { corners: corners, linePosts: posts, endPosts: endPosts };
}

// Per-vertex classification: { type, lng, lat } for every vertex in the line.
// Used by the map-overlay post rendering (Pass 4 Task 5) so each vertex gets
// the correct colored marker. Mirrors the same 15 degree corner threshold as
// countCornersAndLinePosts so the counts and the colors always agree.
export function classifyPostsPerVertex(points, minCornerDeg) {
  if (!points || points.length < 2) return [];
  var minDeg = minCornerDeg || 15;
  var first = points[0];
  var last = points[points.length - 1];
  var closed = points.length >= 3 && first[0] === last[0] && first[1] === last[1];
  var out = [];
  for (var i = 0; i < points.length; i++) {
    var p = points[i];
    var type;
    if (closed) {
      // Every vertex is interior on a closed polygon. The wrap-around vertex
      // (index points.length - 1, which equals index 0) is rendered once.
      if (i === points.length - 1) continue;
      var prevIdx = (i === 0) ? points.length - 2 : i - 1;
      var nextIdx = (i === points.length - 1) ? 1 : i + 1;
      var diffC = bearingDelta(points[prevIdx], p, points[nextIdx]);
      type = (diffC >= minDeg) ? 'corner' : 'line';
    } else if (i === 0 || i === points.length - 1) {
      type = 'end';
    } else {
      var diffO = bearingDelta(points[i - 1], p, points[i + 1]);
      type = (diffO >= minDeg) ? 'corner' : 'line';
    }
    out.push({ lng: p[0], lat: p[1], type: type, index: i });
  }
  return out;
}

function bearingDelta(prev, cur, next) {
  var a = bearingDeg(prev, cur);
  var b = bearingDeg(cur, next);
  return Math.abs(((b - a + 540) % 360) - 180);
}

function bearingDeg(a, b) {
  return Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
}

// Haversine distance in feet between two [lng, lat] points.
function haversineFeet(a, b) {
  var R = 20902231; // Earth radius in feet
  var dLat = (b[1] - a[1]) * Math.PI / 180;
  var dLng = (b[0] - a[0]) * Math.PI / 180;
  var lat1 = a[1] * Math.PI / 180;
  var lat2 = b[1] * Math.PI / 180;
  var x = Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
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
