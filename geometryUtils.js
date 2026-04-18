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

// --- Densify ---
// Insert interpolated points every approxFeetPerSample feet along the path.
export function densifyPath(points, approxFeetPerSample) {
  if (!points || points.length < 2) return points || [];
  var FEET_PER_DEG_LAT = 364567.2; // approx for mid-latitudes
  var out = [points[0]];
  for (var i = 0; i < points.length - 1; i++) {
    var a = points[i], b = points[i+1];
    var dLng = b[0] - a[0];
    var dLat = b[1] - a[1];
    // Rough feet-distance estimate (good enough for densifying EPQS samples)
    var cosLat = Math.cos(a[1] * Math.PI / 180);
    var feetDist = FEET_PER_DEG_LAT * Math.sqrt(dLat*dLat + dLng*dLng*cosLat*cosLat);
    var steps = Math.max(1, Math.ceil(feetDist / approxFeetPerSample));
    for (var s = 1; s <= steps; s++) {
      var t = s / steps;
      out.push([a[0] + dLng*t, a[1] + dLat*t]);
    }
  }
  return out;
}
