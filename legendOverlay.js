// legendOverlay.js -- Annotated snapshot compositor for the fence quote flow.
// Takes the raw Mapbox satellite screenshot (PNG data URL) and composites a
// legend box + header (total ft + corner count) so the buyer and Ultra both
// get a clear manufacturing spec visual.
//
// Approach: "easier path" per the task spec. The Mapbox canvas already has
// the drawn line baked in (brand orange). We only add legend + header on top.
// Segment-color re-annotation (yellow/blue/red by racking tier) is out of
// scope because re-projecting lngLat -> pixel requires a live Mapbox instance
// that is not available at canvas-composite time.
//
// Exports: buildAnnotatedSnapshot(baseImageDataUrl, lines, opts) -> Promise<string>

import { TIER_COLORS } from './tierColors.js';

// Post-cap icon tags used in the legend.
var CAP_LABELS = {
  'pcf': 'Flat cap posts',
  'pcb': 'Ball cap posts',
  'pf':  'Finial posts',
};

// Draw a small square (flat cap icon) on ctx at (cx, cy).
function drawSquareIcon(ctx, cx, cy, size) {
  var half = size / 2;
  ctx.beginPath();
  ctx.rect(cx - half, cy - half, size, size);
  ctx.fill();
  ctx.stroke();
}

// Draw a circle (ball cap icon) on ctx at (cx, cy).
function drawCircleIcon(ctx, cx, cy, radius) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

// Draw a small upward-pointing triangle (finial icon) on ctx at (cx, cy).
function drawTriangleIcon(ctx, cx, cy, size) {
  var half = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx + half, cy + half);
  ctx.lineTo(cx - half, cy + half);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Draw a 6-pointed star (corner post marker) on ctx at (cx, cy).
function drawStarIcon(ctx, cx, cy, outerR, innerR) {
  var points = 6;
  ctx.beginPath();
  for (var i = 0; i < points * 2; i++) {
    var r = (i % 2 === 0) ? outerR : innerR;
    var angle = (Math.PI / points) * i - Math.PI / 2;
    var x = cx + r * Math.cos(angle);
    var y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Summarize racking tier counts from lines data.
// Returns { standard: n, rackable: n, 'heavy-rack': n }.
function summarizeTiers(lines) {
  var counts = { 'standard': 0, 'rackable': 0, 'heavy-rack': 0 };
  if (!lines || !Array.isArray(lines)) return counts;
  for (var li = 0; li < lines.length; li++) {
    var segs = (lines[li] && lines[li].segments) || [];
    for (var si = 0; si < segs.length; si++) {
      var tier = segs[si].rackingTier || 'standard';
      if (counts[tier] != null) counts[tier]++;
      else counts['standard']++;
    }
  }
  return counts;
}

// Main export. Returns a Promise<string> (data URL for image/png).
// baseImageDataUrl: string | null -- Mapbox canvas PNG, may be null
// lines: array -- per the buildAndComplete outLines shape
// opts: { postCap: string, finialType: string|null, totalFt: number, corners: number }
function buildAnnotatedSnapshot(baseImageDataUrl, lines, opts) {
  return new Promise(function(resolve) {
    var postCap = (opts && opts.postCap) || 'pcf';
    var finialType = (opts && opts.finialType) || null;
    var totalFt = (opts && opts.totalFt) || 0;
    var corners = (opts && opts.corners) || 0;

    var tierCounts = summarizeTiers(lines);

    // Canvas dimensions: match the source image when available; fall back to
    // a standard size so the legend still renders even without a base image.
    var W = 800;
    var H = 500;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    function drawOverlay() {
      canvas.width = W;
      canvas.height = H;

      // -- Draw base image if available --
      // Real Mapbox PNG data URLs are large (>50 chars). Very short ones
      // (stubs, test sentinels) won't render -- skip the image path and
      // render legend-only on a dark background so we don't hang waiting
      // for onload/onerror in environments where Image is a stub (jsdom).
      var hasRealImage = baseImageDataUrl
        && baseImageDataUrl.indexOf('data:') === 0
        && baseImageDataUrl.length > 100;

      if (hasRealImage) {
        var img = new Image();
        var settled = false;

        function onImageReady() {
          if (settled) return;
          settled = true;
          if (img.naturalWidth && img.naturalHeight) {
            W = img.naturalWidth;
            H = img.naturalHeight;
            canvas.width = W;
            canvas.height = H;
            ctx.drawImage(img, 0, 0, W, H);
          } else {
            // Image loaded but has no dimensions (stub env) -- dark bg.
            ctx.fillStyle = '#1a2a3a';
            ctx.fillRect(0, 0, W, H);
          }
          addAnnotations();
        }

        function onImageError() {
          if (settled) return;
          settled = true;
          ctx.fillStyle = '#1a2a3a';
          ctx.fillRect(0, 0, W, H);
          addAnnotations();
        }

        img.onload = onImageReady;
        img.onerror = onImageError;
        img.src = baseImageDataUrl;

        // Fallback: if jsdom (or any environment) never fires onload/onerror,
        // proceed after one macrotask so the promise always resolves.
        setTimeout(function() {
          if (!settled) {
            settled = true;
            ctx.fillStyle = '#1a2a3a';
            ctx.fillRect(0, 0, W, H);
            addAnnotations();
          }
        }, 0);
      } else {
        ctx.fillStyle = '#1a2a3a';
        ctx.fillRect(0, 0, W, H);
        addAnnotations();
      }
    }

    function addAnnotations() {
      var PAD = 12;
      var CORNER_RADIUS = 6;
      var LEGEND_WIDTH = 240;
      var LINE_H = 24;
      var ICON_SIZE = 10;
      var ICON_RADIUS = 5;

      // Build legend rows.
      // Tier rows only shown when at least one segment exists for that tier.
      var legendRows = [];

      // Tier legend entries.
      var tierKeys = ['standard', 'rackable', 'heavy-rack'];
      var tierLabels = {
        'standard': 'Standard (no rack needed)',
        'rackable': 'Rackable (up to 6" rise per panel)',
        'heavy-rack': 'Heavy-rack (stepped install)',
      };
      for (var ti = 0; ti < tierKeys.length; ti++) {
        var tier = tierKeys[ti];
        if (tierCounts[tier] > 0) {
          legendRows.push({ type: 'tier', tier: tier, label: tierLabels[tier] });
        }
      }

      // Post cap row.
      var capLabel = CAP_LABELS[postCap] || 'Post caps';
      if (finialType && finialType !== 'none' && finialType !== '') {
        legendRows.push({ type: 'finial', label: 'Finial posts' });
      } else {
        legendRows.push({ type: 'cap', postCap: postCap, label: capLabel });
      }

      // Corner row (only when corners > 0).
      if (corners > 0) {
        legendRows.push({ type: 'corner', label: 'Corner posts' });
      }

      var LEGEND_HEIGHT = PAD * 2 + legendRows.length * LINE_H;

      // Position legend in bottom-left corner.
      var legendX = PAD;
      var legendY = H - LEGEND_HEIGHT - PAD;

      // -- Legend background (semi-transparent dark) --
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = '#111827';
      roundRect(ctx, legendX, legendY, LEGEND_WIDTH, LEGEND_HEIGHT, CORNER_RADIUS);
      ctx.fill();
      ctx.restore();

      // -- Legend border --
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      roundRect(ctx, legendX, legendY, LEGEND_WIDTH, LEGEND_HEIGHT, CORNER_RADIUS);
      ctx.stroke();
      ctx.restore();

      // -- Legend label "LEGEND" at top --
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#d1d5db';
      ctx.font = 'bold 9px Arial, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('LEGEND', legendX + PAD, legendY + 6);
      ctx.restore();

      // -- Legend rows --
      for (var ri = 0; ri < legendRows.length; ri++) {
        var row = legendRows[ri];
        var rowY = legendY + PAD + 12 + ri * LINE_H;
        var iconCX = legendX + PAD + 10;
        var iconCY = rowY + LINE_H / 2 - 4;
        var textX = legendX + PAD + 24;
        var textY = rowY + LINE_H / 2 - 4;

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = '11px Arial, sans-serif';
        ctx.fillStyle = '#f9fafb';

        if (row.type === 'tier') {
          // Colored dash line.
          var color = TIER_COLORS[row.tier] || '#888';
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(legendX + PAD, iconCY);
          ctx.lineTo(legendX + PAD + 20, iconCY);
          ctx.stroke();
          ctx.fillStyle = '#f9fafb';
          ctx.fillText(row.label, textX + 2, iconCY);
        } else if (row.type === 'cap') {
          // Post cap icon.
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          if (row.postCap === 'pcf') {
            drawSquareIcon(ctx, iconCX, iconCY, ICON_SIZE);
          } else {
            drawCircleIcon(ctx, iconCX, iconCY, ICON_RADIUS);
          }
          ctx.fillStyle = '#f9fafb';
          ctx.fillText(row.label, textX, iconCY);
        } else if (row.type === 'finial') {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          drawTriangleIcon(ctx, iconCX, iconCY, ICON_SIZE);
          ctx.fillStyle = '#f9fafb';
          ctx.fillText(row.label, textX, iconCY);
        } else if (row.type === 'corner') {
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#92400e';
          ctx.lineWidth = 1;
          drawStarIcon(ctx, iconCX, iconCY, 6, 3);
          ctx.fillStyle = '#f9fafb';
          ctx.fillText(row.label, textX, iconCY);
        }
        ctx.restore();
      }

      // -- Header bar (top of image) --
      var HEADER_H = 36;
      ctx.save();
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, W, HEADER_H);
      ctx.restore();

      // Header text: total feet + corner count.
      ctx.save();
      ctx.fillStyle = '#f9fafb';
      ctx.font = 'bold 13px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        Math.round(totalFt) + ' linear ft  |  ' + corners + ' corner' + (corners === 1 ? '' : 's'),
        PAD,
        HEADER_H / 2
      );
      ctx.restore();

      // Grandview watermark on the right side of header.
      ctx.save();
      ctx.fillStyle = '#6ba3c2';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('Grandview Fence', W - PAD, HEADER_H / 2);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    }

    drawOverlay();
  });
}

// Polyfill for roundRect since jsdom / older browsers may not have it.
function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

export { buildAnnotatedSnapshot };
