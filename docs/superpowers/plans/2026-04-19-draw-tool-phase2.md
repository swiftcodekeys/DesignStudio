# Draw Tool Phase 2 — Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix 10 remaining draw-tool issues on `feat/quote-redesign` — several of which are regressions from prior rewrites that stubbed out working features (EPQS auto-detect, parcel overlay data flow).

**Architecture:** All changes concentrated in `MapboxDrawView.js`, `mapbox.css`, and a handful of new/extended components. No changes to the renderer pipeline. The parcel-proxy worker is already deployed — issue is client-side failure handling. EPQS client is working — issue is the draw view no longer calls it.

**Tech Stack:** React (createElement, no JSX), Mapbox GL JS, Vitest + Testing Library, vanilla CSS, Phosphor icons, `classifyDrawnLine` from `epqsClient.js`, `fetchParcel` from `parcelClient.js`.

**Branch:** `feat/quote-redesign` (HEAD: `1f5eda8` at time of writing).

**Preview URL:** https://feat-quote-redesign.designstudio-csy.pages.dev

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `MapboxDrawView.js` | Modify heavily | Animation timing, segment labels, per-segment UI, multi-line state, EPQS call, parcel data flow, pre-draw popup, expanded estimate popup |
| `mapbox.css` | Modify | Slower fly-in easing, segment label repositioning, per-segment row dropdown styles, pre-draw popup styles |
| `SlopePopup.js` or new `PreDrawPopup.js` | New or reuse | Pre-draw "is your yard sloped?" question |
| `tests/mapboxDrawView.test.js` | Modify | Add regression guards for EPQS wiring, parcel data in output, multi-line state shape, pre-draw popup gate |
| `geometryUtils.js` | Modify | `countCornerPosts(points, minCornerDeg)` helper distinguishing direction changes from colinear runs |

---

## Global decisions

- **"Corner" definition:** a vertex where the inbound and outbound segment bearings differ by ≥ 20 degrees. First and last vertex are always corners. Everything else is a line-post position along a straight run (automatic, no user input). The dock shows the count of user-dropped vertices, with a secondary line: "~N line posts along straight runs."
- **Multi-line data shape:** `points` becomes `lines[].points[]`. Backwards-compat shim: `points` kept as a flat concat for any consumer that hasn't been updated yet.
- **EPQS call strategy:** debounced 800ms after last vertex drop, fires once per `points` change when `points.length >= 2`. Result cached per session in a ref. Failure falls back to "unknown" per segment.
- **Parcel failure mode:** surface failures as a one-line toast at the bottom: "Couldn't load your parcel outline — you can still draw." No blocker.

---

## Task 1: Slower, eased intro flyTo animation

**Root cause:** `MapboxDrawView.js:625-633` runs `map.flyTo({ center, zoom: 20, pitch: 0, duration: cinematic && !prefersReduced ? 2400 : (prefersReduced ? 0 : 800), essential: true })`. 2400ms is abrupt for a globe-to-satellite zoom.

**Files:** `MapboxDrawView.js:625-633`

- [ ] **Step 1: Slow + ease**

Replace the `flyTo` call with:

```javascript
      var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var duration = cinematic && !prefersReduced ? 4200 : (prefersReduced ? 0 : 900);
      map.flyTo({
        center: [props.location.lng, props.location.lat],
        zoom: 20,
        pitch: 0,
        duration: duration,
        essential: true,
        // Cubic bezier imitating ease-out-quint — slow entry, fast middle,
        // gentle settle onto the property. Default flyTo easing is ease-in-out
        // which feels mechanical at high zoom deltas.
        easing: function(t) { return 1 - Math.pow(1 - t, 5); },
      });
```

- [ ] **Step 2: Commit**

```
fix(draw): smoother intro flyTo (4200ms + ease-out-quint)
```

---

## Task 2: Segment labels block short-distance vertex drops

**Root cause:** `.dy-seg-label` chips are rendered at segment midpoints as Mapbox Markers. On short runs (< 6ft on screen) they overlap the user's click target for the next vertex. Default Mapbox Marker elements have `pointer-events: auto`.

**Files:** `mapbox.css` (seg-label rule), `MapboxDrawView.js` (label marker setup)

- [ ] **Step 1: Hide segment labels while the mouse is near the line end**

Simplest fix: make the label non-interactive, offset perpendicular from the line, and shrink on very short segments.

In `mapbox.css`, update the `.dy-seg-label` rule:

```css
.dy-seg-label {
  background: white;
  color: var(--dy-ink);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: var(--dy-font-mono);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  white-space: nowrap;
  pointer-events: none;  /* can never block a map click */
  letter-spacing: -0.02em;
  transform: translateY(-18px);  /* float above the line, not on it */
}
.dy-seg-label-ghost { opacity: 0.6; }
```

- [ ] **Step 2: Offset perpendicular to the segment (optional polish)**

In the segment-label useEffect (around `MapboxDrawView.js:800-830`), compute a perpendicular offset per label so labels don't stack on tight corners:

```javascript
    // For a segment from A→B, offset the label marker perpendicular to the
    // segment vector. Picks the side that keeps the label inside the viewport
    // when possible (falls back to "always above" if both sides overflow).
    var dx = props.points[i+1][0] - props.points[i][0];
    var dy = props.points[i+1][1] - props.points[i][1];
    var len = Math.sqrt(dx*dx + dy*dy) || 1;
    var perpLng = -dy / len * 0.00002;  // small lat/lng offset, adjusts to zoom
    var perpLat =  dx / len * 0.00002;
    marker.setLngLat([mid[0] + perpLng, mid[1] + perpLat]);
```

If this proves finicky at very high zoom, revert to the simple `transform: translateY(-18px)` from Step 1 alone.

- [ ] **Step 3: Commit**

```
fix(draw): segment labels no longer block vertex drops (pointer-events none + vertical offset)
```

---

## Task 3: Per-segment rackability UI

**Root cause:** The dock's expanded breakdown shows each segment's length but no slope/racking tier. Customers can't see which sections will need racking or stepping.

**Files:** `MapboxDrawView.js` (MorphingDock `expandedPanel`), `mapbox.css`, `tests/mapboxDrawView.test.js`

- [ ] **Step 1: Extend segment data shape**

In `buildAndComplete` at `MapboxDrawView.js:989-1005`, the loop already builds per-segment objects. Expand them to include the EPQS classification (wired in Task 6) and a user override:

```javascript
    var segments = [];
    for (var i = 0; i < points.length - 1; i++) {
      var lengthFt = distanceBetween(points[i], points[i + 1]);
      var epqsSeg = epqsResults.current && epqsResults.current.segmentClassifications
        ? epqsResults.current.segmentClassifications[i] : null;
      var autoTier = classificationToRackingTier(epqsSeg ? epqsSeg.classification : 'unknown');
      var userTier = segmentOverrides[i] || null;
      segments.push({
        index: i,
        mapLayerIdx: null,
        lengthFeet: lengthFt,
        color: '#c2410c',
        compassLabel: compassBearing(points[i], points[i + 1]),
        panels: Math.ceil(lengthFt / 6),
        start: points[i],
        end: points[i + 1],
        rackingTier: userTier || autoTier,
        rackingSource: userTier ? 'user' : 'auto',
        epqsClassification: epqsSeg ? epqsSeg.classification : 'unknown',
        epqsDeltaInches: epqsSeg ? epqsSeg.deltaInches : 0,
      });
    }
```

(`classificationToRackingTier` lives in `geometryUtils.js` already or add it: flat→standard, sloped→rackable, steep|steps→heavy. Dispatch as appropriate.)

- [ ] **Step 2: Render a per-segment row with tier dropdown**

In the `expandedPanel` segment list (`MapboxDrawView.js:528-542`), extend each `<li>` to include a tier dropdown:

```javascript
        segments.map(function(s, i) {
          return React.createElement('li', { key: i, className: 'dy-segment-item' },
            React.createElement('span', { className: 'dy-segment-num' }, i + 1),
            React.createElement('span', { className: 'dy-segment-len' }, Math.round(s.lengthFeet) + ' ft'),
            React.createElement('select', {
              className: 'dy-segment-tier',
              value: s.rackingTier || 'auto',
              onChange: function(ev) { props.onSetTierOverride(i, ev.target.value); },
              title: 'Racking tier for segment ' + (i + 1),
            },
              React.createElement('option', { value: 'auto' }, 'Auto' + (s.rackingSource === 'auto' && s.rackingTier ? ' (' + s.rackingTier + ')' : '')),
              React.createElement('option', { value: 'standard' }, 'Standard'),
              React.createElement('option', { value: 'rackable' }, 'Rackable'),
              React.createElement('option', { value: 'heavy' }, 'Heavy rack'),
              React.createElement('option', { value: 'steps' }, 'Stair-step')
            ),
            React.createElement('button', {
              className: 'dy-segment-delete',
              onClick: function() { props.onDeleteSegment(i); },
              title: 'Remove this segment',
              type: 'button',
              'aria-label': 'Remove segment ' + (i + 1),
            }, React.createElement(X, { size: 12, weight: 'bold' }))
          );
        })
```

- [ ] **Step 3: CSS for the dropdown**

Add to `mapbox.css` near the `.dy-segment-item` rules:

```css
.dy-segment-tier {
  margin-left: auto;
  margin-right: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid var(--dy-rule);
  background: white;
  font-family: inherit;
  font-size: 12px;
  color: var(--dy-ink);
  max-width: 140px;
}
.dy-segment-tier:focus { outline: 2px solid var(--dy-accent); outline-offset: 1px; }
```

- [ ] **Step 4: Add `onSetTierOverride` + state**

At the top of the `MapboxDrawView` component, add:

```javascript
  var overrideState = useState({});
  var segmentOverrides = overrideState[0];
  var setSegmentOverrides = overrideState[1];

  function handleSetTierOverride(i, value) {
    setSegmentOverrides(function(prev) {
      var next = Object.assign({}, prev);
      if (value === 'auto') delete next[i];
      else next[i] = value;
      return next;
    });
  }
```

Pass `onSetTierOverride: handleSetTierOverride` into `MorphingDock` props.

- [ ] **Step 5: Test**

Add to `tests/mapboxDrawView.test.js`:

```javascript
  it('per-segment tier dropdown defaults to Auto and updates on change', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [[-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605]],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView onComplete={() => {}} initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }} />
    );
    act(() => { fireEvent.click(container.querySelector('.dy-breakdown-toggle')); });
    const selects = container.querySelectorAll('.dy-segment-tier');
    expect(selects.length).toBe(2);
    expect(selects[0].value).toBe('auto');
    act(() => { fireEvent.change(selects[0], { target: { value: 'heavy' } }); });
    expect(selects[0].value).toBe('heavy');
  });
```

- [ ] **Step 6: Commit**

```
feat(draw): per-segment racking tier dropdown (auto-detect default, user override)
```

---

## Task 4: Corner vs line post math

**Root cause:** Dock currently shows `corners = max(0, points.length - 2)`. For a 4-point square that's 2, but a "corner" by product definition is a direction change — the 4-point square has 4 corners (each vertex IS a direction change). The current math subtracts the start+end assuming they're endpoints, which is wrong for a closed or near-closed loop.

**Files:** `MapboxDrawView.js` (corner calculation + dock display), `geometryUtils.js` (corner detection), `tests/mapboxDrawView.test.js`

- [ ] **Step 1: Add `countCorners` helper in geometryUtils.js**

In `geometryUtils.js`, add:

```javascript
// Counts "corners" — vertices where the inbound and outbound bearings differ by
// at least `minCornerDeg` (default 20). First and last vertex are always counted
// as corners (they're the endpoints of the fence). Returns { corners, linePosts }
// where linePosts is an estimate of how many auto-placed posts sit along the
// straight runs between corners, assuming `panelLengthFt` spacing.
export function countCornersAndLinePosts(points, panelLengthFt, minCornerDeg) {
  if (!points || points.length < 2) return { corners: 0, linePosts: 0 };
  var minDeg = minCornerDeg || 20;
  var corners = 2; // start + end
  for (var i = 1; i < points.length - 1; i++) {
    var a = bearingDeg(points[i-1], points[i]);
    var b = bearingDeg(points[i], points[i+1]);
    var diff = Math.abs(((b - a + 540) % 360) - 180);
    if (diff >= minDeg) corners++;
  }
  var totalFt = 0;
  for (var j = 0; j < points.length - 1; j++) {
    totalFt += haversineFeet(points[j], points[j+1]);
  }
  var posts = Math.max(0, Math.ceil(totalFt / (panelLengthFt || 6)) - corners);
  return { corners: corners, linePosts: posts };
}

function bearingDeg(a, b) {
  return Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI;
}
```

(Reuse the existing `haversineFeet` / distance helper from the same file; adapt if the actual name differs.)

- [ ] **Step 2: Use the helper in MapboxDrawView**

In the `MapboxDrawView` component, replace `var corners = points.length >= 2 ? Math.max(0, points.length - 2) : 0;` (around line 926) with:

```javascript
  var cornerStats = countCornersAndLinePosts(points, 6);
  var corners = cornerStats.corners;
  var linePosts = cornerStats.linePosts;
```

- [ ] **Step 3: Pass `linePosts` into MorphingDock and render**

Pass `linePosts: linePosts` as a prop. In `MorphingDock`, add a secondary line under the Stats:

```javascript
    React.createElement('div', { className: 'dy-stat' },
      React.createElement('div', { className: 'dy-stat-num' }, corners),
      React.createElement('div', { className: 'dy-stat-label' }, 'corners'),
      linePosts > 0 && React.createElement('div', { className: 'dy-stat-sub' }, '+' + linePosts + ' line posts')
    ),
```

Add to mapbox.css:

```css
.dy-stat-sub { font-size: 10px; color: var(--dy-muted); margin-top: 2px; }
```

- [ ] **Step 4: Test**

```javascript
  it('counts corners by direction change, not vertex count', () => {
    // 4 points forming an L: only 1 interior direction change → 3 total corners (start + elbow + end)
    const { countCornersAndLinePosts } = require('../geometryUtils');
    const L = [[0,0], [0.001,0], [0.001,0.001]];
    const result = countCornersAndLinePosts(L, 6);
    expect(result.corners).toBe(3);
  });
```

- [ ] **Step 5: Commit**

```
fix(draw): count corners by direction change; expose line-post estimate
```

---

## Task 5: Multi-line support (deferred Bug #3)

**Root cause:** Draw tool accepts one polyline. Yards with detached runs (e.g., front yard + side yard separated by a driveway) can't be drawn.

**Files:** `MapboxDrawView.js` (state shape, dock CTA, line rendering), `tests/mapboxDrawView.test.js`

- [ ] **Step 1: Introduce `lines` state instead of `points`**

Top of `MapboxDrawView`:

```javascript
  // Lines: array of point arrays. The "active" line is the last one — new
  // vertices append there. `Start new line` pushes a fresh empty array.
  var linesState = useState(function() {
    try {
      var raw = localStorage.getItem(AUTOSAVE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Back-compat: older autosave used flat `points`
        if (parsed && Array.isArray(parsed.lines)) return parsed.lines;
        if (parsed && Array.isArray(parsed.points)) return [parsed.points];
      }
    } catch (e) {}
    return [[]];
  });
  var lines = linesState[0];
  var setLines = linesState[1];

  // Derived: flat points for consumers that still think in terms of one line
  var points = lines.reduce(function(acc, l) { return acc.concat(l); }, []);

  // Active line getter/setter
  function setActiveLinePoints(updater) {
    setLines(function(prev) {
      var next = prev.slice();
      var last = next[next.length - 1] || [];
      var updated = typeof updater === 'function' ? updater(last) : updater;
      next[next.length - 1] = updated;
      return next;
    });
  }
```

Replace all `setPoints(...)` calls in the component with `setActiveLinePoints(...)`.

- [ ] **Step 2: Add "Start new line" dock action**

In `MorphingDock`'s `microActions` block, add a new button when there's at least one complete line:

```javascript
    lines.length >= 1 && lines[lines.length - 1].length >= 2 && React.createElement('button', {
      className: 'dy-micro-btn',
      onClick: props.onStartNewLine,
      title: 'Start a new disconnected fence line',
      type: 'button',
      'aria-label': 'New line',
    }, React.createElement(Plus, { size: 16, weight: 'regular' })),
```

Import `Plus` from `@phosphor-icons/react`.

In `MapboxDrawView`:

```javascript
  function handleStartNewLine() {
    setLines(function(prev) {
      // Don't push a new empty line if the last one is already empty
      if (prev.length > 0 && prev[prev.length - 1].length === 0) return prev;
      return prev.concat([[]]);
    });
  }
```

Pass `onStartNewLine: handleStartNewLine` and `lines: lines` into MorphingDock.

- [ ] **Step 3: Render each line as its own Mapbox source**

The existing polyline-rendering `useEffect` (around `MapboxDrawView.js:735-770`) assumes a single `points` array. Update it to iterate lines:

```javascript
  useEffect(function() {
    if (!mapRef.current) return;
    // ... existing style.load gating ...
    function apply() {
      var map = mapRef.current;
      lines.forEach(function(linePoints, lineIdx) {
        var srcId = 'line-' + lineIdx;
        var layerId = 'line-' + lineIdx + '-stroke';
        if (linePoints.length < 2) {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getSource(srcId)) map.removeSource(srcId);
          return;
        }
        var coords = linePoints.slice();
        if (map.getSource(srcId)) {
          map.getSource(srcId).setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
          });
        } else {
          map.addSource(srcId, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } },
          });
          map.addLayer({
            id: layerId,
            type: 'line',
            source: srcId,
            paint: { 'line-color': '#c2410c', 'line-width': 3 },
          });
        }
      });
      // Clean up any removed lines
      var existingLayers = map.getStyle().layers.filter(function(l) { return /^line-\d+-stroke$/.test(l.id); });
      existingLayers.forEach(function(l) {
        var idx = Number(l.id.split('-')[1]);
        if (idx >= lines.length) {
          if (map.getLayer(l.id)) map.removeLayer(l.id);
          if (map.getSource('line-' + idx)) map.removeSource('line-' + idx);
        }
      });
    }
    if (mapRef.current.isStyleLoaded()) apply();
    else mapRef.current.once && mapRef.current.once('style.load', apply);
  }, [lines, props.hoverPoint]);
```

- [ ] **Step 4: Update `buildAndComplete` output shape**

In `buildAndComplete`, iterate lines and emit one line entry per:

```javascript
    var outLines = lines.map(function(linePoints, lineIdx) {
      var segs = [];
      for (var i = 0; i < linePoints.length - 1; i++) {
        // ... same segment build as before, keyed by (lineIdx, i) ...
      }
      return {
        id: 'line-' + lineIdx,
        color: '#c2410c',
        points: linePoints.slice(),
        segments: segs,
      };
    });
    var data = {
      totalFeet: totalFt,
      corners: cornerStats.corners,
      linePosts: cornerStats.linePosts,
      ends: outLines.filter(function(l) { return l.points.length >= 2; }).length * 2,
      lines: outLines,
      // ... rest ...
    };
```

- [ ] **Step 5: Test**

```javascript
  it('Start new line pushes a fresh empty line and subsequent clicks go there', () => {
    // ... seed, render, verify initial state ...
    // ... click the "start new line" button via test selector ...
    // ... verify lines.length === 2 and new clicks append to lines[1] ...
  });
```

- [ ] **Step 6: Commit**

```
feat(draw): multi-line support (Start new line action + per-line rendering)
```

---

## Task 6: Restore EPQS auto-detect

**Root cause:** `MapboxDrawView.js:1033` hardcodes `epqsOverall: 'unknown'` etc. The working `classifyDrawnLine` in `epqsClient.js` is never called from the current draw view. A prior rewrite stubbed it out and didn't restore.

**Files:** `MapboxDrawView.js`, `tests/mapboxDrawView.test.js`

- [ ] **Step 1: Add EPQS debounced call**

In `MapboxDrawView`, add an effect that watches `points` and calls `classifyDrawnLine` when the user has drawn ≥ 2 vertices:

```javascript
  var epqsResults = useRef(null);
  var epqsLoadingState = useState(false);
  var epqsLoading = epqsLoadingState[0];
  var setEpqsLoading = epqsLoadingState[1];

  useEffect(function() {
    if (points.length < 2) { epqsResults.current = null; return; }
    var timer = setTimeout(async function() {
      setEpqsLoading(true);
      try {
        var result = await classifyDrawnLine(points, 6);
        epqsResults.current = result;
      } catch (e) {
        epqsResults.current = null;
      } finally {
        setEpqsLoading(false);
      }
    }, 800);
    return function() { clearTimeout(timer); };
  }, [points]);
```

Import at the top: `import { classifyDrawnLine } from './epqsClient';`

- [ ] **Step 2: Use results in `buildAndComplete`**

Replace the hardcoded stubs at `MapboxDrawView.js:1031-1034` with:

```javascript
      slopeAnswer: preDrawSlopeAnswer,  // from the pre-draw popup (Task 8)
      slopedPostCount: slopedPostCount,
      epqsOverall: epqsResults.current ? epqsResults.current.overallClassification : 'unknown',
      epqsConfidence: epqsResults.current ? epqsResults.current.confidence : 'low',
      epqsMaxDeltaInches: epqsResults.current ? epqsResults.current.maxDeltaInches : 0,
```

- [ ] **Step 3: Show an EPQS loading indicator on the dock CTA**

In `MorphingDock`, if `props.epqsLoading`, disable the primary CTA and change label to "Calculating slope…". Prevents the user from hitting Continue with stale auto-detect data.

- [ ] **Step 4: Test**

Add a test that mocks `epqsClient` and confirms `buildAndComplete` includes the real classification.

- [ ] **Step 5: Commit**

```
fix(draw): restore EPQS auto-detect (classifyDrawnLine) — wire into buildAndComplete
```

---

## Task 7: Per-segment slope dropdown

Merged into Task 3 (above) — the dropdown IS the per-segment control. When a user overrides, `rackingSource: 'user'` gets set in the output.

- [ ] **Already covered in Task 3.**

---

## Task 8: Pre-draw "is your yard sloped?" popup

**Root cause:** The old `SlopePopup.js` was deprecated after Task #9 in a prior milestone but customers still benefit from being primed on slope before drawing. Surface it at the start.

**Files:** `MapboxDrawView.js` (new state + gate), new or reuse `SlopePopup.js`, `mapbox.css`

- [ ] **Step 1: Decide reuse vs new component**

`SlopePopup.js` already exists (still in repo, with the measure-slope image). Reuse it but update the copy to reflect the new flow. Options stay the same: Mostly flat / Some sections / Very sloped.

- [ ] **Step 2: Gate draw entry on the answer**

At the top of `MapboxDrawView`, before address/cinematic logic:

```javascript
  var slopeAnswerState = useState(function() {
    try { return localStorage.getItem('gv_slope_answer') || null; }
    catch (e) { return null; }
  });
  var slopeAnswer = slopeAnswerState[0];
  var setSlopeAnswer = slopeAnswerState[1];

  function handleSlopeAnswer(ans) {
    setSlopeAnswer(ans);
    try { localStorage.setItem('gv_slope_answer', ans); } catch (e) {}
  }
```

When `!slopeAnswer && location`, render `<SlopePopup open={true} onAnswer={handleSlopeAnswer} onClose={() => handleSlopeAnswer('skip')} />` as a full-screen overlay.

- [ ] **Step 3: Pass slopeAnswer into buildAndComplete**

Replace `slopeAnswer: null` in the draw tool data with `slopeAnswer: slopeAnswer || null`. Also use it as a hint in the classifier UI (e.g., pre-bias the dropdown).

- [ ] **Step 4: Commit**

```
feat(draw): pre-draw slope question (gates the map with a classifier hint)
```

---

## Task 9: Expand "This is an estimate" popup with measurement + auto-detect caveat

**Root cause:** Sarah wants the estimate popup to include clear measurement guidance AND call out that auto-detect isn't always accurate.

**Files:** `MapboxDrawView.js` (`EstimatePopup`)

- [ ] **Step 1: Extend popup body**

In `EstimatePopup`, after the existing content and before `dy-est-actions`, add a section titled "How to measure" with a short bullet list pulled from the education content, plus a distinct paragraph about auto-detect:

```javascript
      React.createElement('h4', { className: 'dy-est-subhead' }, 'How to measure'),
      React.createElement('ul', { className: 'dy-est-tips' },
        React.createElement('li', null, 'Walk each fence run with a tape measure, end to end.'),
        React.createElement('li', null, 'Note every direction change — those are corner posts.'),
        React.createElement('li', null, 'For slope, hold a 6\u2032 board level and measure the gap at the downhill end.'),
      ),
      React.createElement('h4', { className: 'dy-est-subhead' }, 'What we auto-detect'),
      React.createElement('p', null,
        'Grandview pulls USGS elevation data for the line you draw and suggests whether each segment needs standard, rackable, or heavy-rack panels. ',
        React.createElement('strong', null, 'Auto-detect is not always accurate \u2014 especially in dense tree canopy or recently graded lots. Please verify on the ground before you submit.')
      ),
      // existing image + Read-More link stay as they are
```

Add to `mapbox.css`:

```css
.dy-est-subhead { font-size: 13px; font-weight: 700; margin: 14px 0 6px; color: var(--dy-ink); }
.dy-est-tips { padding-left: 18px; margin: 0 0 10px; font-size: 13px; color: var(--dy-ink-2); line-height: 1.5; }
.dy-est-tips li { margin-bottom: 4px; }
```

- [ ] **Step 2: Commit**

```
feat(draw): expand estimate popup with measurement tips and auto-detect caveat
```

---

## Task 10: Parcel overlay — diagnose + restore + wire into output

**Root cause:**
- Silent failure at `MapboxDrawView.js:705` swallows any error, so we can't tell from the UI why overlay isn't appearing. Most likely: worker proxy returning non-200 for the current test addresses, OR the `.mapboxgl-canvas` isn't ready when `map.on('idle')` fires cleanly.
- `buildAndComplete` at line 1038 hardcodes `parcel: null` — the fetched data never flows downstream.

**Files:** `MapboxDrawView.js`, `workers/parcel-proxy/src/index.js` (only if the worker is the issue), `tests/mapboxDrawView.test.js`

- [ ] **Step 1: Surface errors to a toast instead of swallowing**

At `MapboxDrawView.js:705`, replace the silent catch with:

```javascript
      } catch (e) {
        console.warn('[parcel] fetch failed', e);
        if (props.onParcelError) props.onParcelError(e.message || 'unknown');
      }
    });
```

And pass `onParcelError` from the outer component with a 6-second toast: "Couldn't load your property outline. You can still draw."

- [ ] **Step 2: Capture the parcel result in state**

Add to MapboxDrawView state:

```javascript
  var parcelState = useState(null);
  var parcelData = parcelState[0];
  var setParcelData = parcelState[1];
```

In the parcel fetch block, on success: `setParcelData(result.data);`.

- [ ] **Step 3: Wire into buildAndComplete**

Replace `parcel: null` at line 1038 with `parcel: parcelData || null,`.

- [ ] **Step 4: Health-check the worker during CI / startup**

Wire a dev-only `console.info` in `parcelClient.js` that logs the HTTP status on non-200, so when Sarah reloads the preview she can see in DevTools whether the worker is reachable:

```javascript
export async function fetchParcel(lat, lng, proxyUrl) {
  try {
    var resp = await fetch(proxyUrl + '/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: lat, lng: lng }),
    });
    if (!resp.ok) {
      console.warn('[parcelClient] HTTP', resp.status, 'from', proxyUrl);
      return { ok: false, fallback: 'manual', error: 'HTTP ' + resp.status };
    }
    var json = await resp.json();
    if (!json.ok) console.warn('[parcelClient] upstream error', json.error);
    return json;
  } catch (e) {
    console.warn('[parcelClient] network error', e.message);
    return { ok: false, fallback: 'manual', error: e.message };
  }
}
```

- [ ] **Step 5: Manual verification**

Push, wait for Cloudflare build, open preview, draw a line at a known-parcel address (e.g., Sarah's own — lat/lng TBD), open DevTools Network tab, verify `POST /api/parcel` → 200 and a visible dashed-white outline with an orange pulse layer on the map.

If the worker returns 500 or 502, SSH into the worker logs via `npx wrangler tail grandview-parcel-proxy` and diagnose (likely Regrid auth or rate-limit).

- [ ] **Step 6: Commit**

```
fix(draw): parcel overlay — surface errors, flow data through buildAndComplete
```

---

## Ship checklist

- [ ] All 10 tasks committed on `feat/quote-redesign`
- [ ] `npx vitest run` → all tests pass
- [ ] `npx webpack --mode production` → clean
- [ ] Pushed to origin
- [ ] Cloudflare preview tested end-to-end with Playwright as a new customer:
  - [ ] Intro animation feels smooth and paced
  - [ ] Segment labels don't block vertex drops at short distances
  - [ ] Per-segment dropdowns visible in breakdown, default "Auto (X)" where X is the EPQS classification
  - [ ] Corner count matches the direction-change definition, line-post count surfaces too
  - [ ] "Start new line" button works, lines render independently, autosave round-trips
  - [ ] EPQS status appears on the CTA during classification
  - [ ] Pre-draw slope popup gates the map entry
  - [ ] Estimate popup shows the expanded measurement + auto-detect copy
  - [ ] Parcel dashed outline visible on a known-parcel address
  - [ ] `window.__DRAW_TOOL_DATA__` on Continue contains non-null `parcel` and real `epqsOverall`

---

## Handoff prompt

Copy-paste into a fresh session:

```
You are picking up Sarah Bachman's Grandview Fence Design Studio project at
C:\Users\sarah\Desktop\App Repos\fence-tool on branch feat/quote-redesign
(HEAD: 1f5eda8). GitHub: swiftcodekeys/DesignStudio. Cloudflare Pages preview:
https://feat-quote-redesign.designstudio-csy.pages.dev

A previous session shipped 8 commits fixing 11 ship-blocker bugs (plan:
docs/superpowers/plans/2026-04-19-quote-redesign-bugs.md, all tasks complete).

You are now executing the Phase 2 plan at
docs/superpowers/plans/2026-04-19-draw-tool-phase2.md which addresses 10 more
items — some of which are regressions from prior rewrites (EPQS auto-detect
was stubbed out, parcel overlay data flow was severed).

Follow superpowers:subagent-driven-development to dispatch one implementer
subagent per task, with spec-compliance review + code-quality review after each.
DO NOT batch tasks into one commit. One fix = one commit per Sarah's CLAUDE.md.

Hard rules from memory (C:\Users\sarah\.claude\projects\C--Users-sarah\memory):
- Autonomous overnight execution — minimal clarification questions.
- Test on the Cloudflare Pages preview URL, never local dev server.
- No em dashes in any user-visible string.
- Phosphor icons only; no emoji.
- Voice: "Grandview" / "we" — never first-person "I" in customer copy.
- Never remove working features, links, images, or copy unless explicitly told.
- CSS class names: never use the same class as both an ancestor phase modifier
  AND a child component. Rename to avoid collision (see feedback_class_name_collisions).

When you start:
1. Read the plan file in full.
2. TaskCreate one task per plan task (Tasks 1-10 + final verification).
3. Dispatch Task 1 implementer. After each task, spec review then code-quality
   review, fix any issues, then mark complete and move to the next task.
4. After all 10: push, wait for Cloudflare build, then run a Playwright
   walk-through as a new customer (address entry → draw → Quote Details →
   Quote Builder → email submit), capturing screenshots for each verification
   checkbox in the Ship Checklist.
5. Report to Sarah with the preview URL, commit SHAs, and a screenshot per bug.

Do NOT push to main or master. Do NOT amend prior commits. Do NOT skip hooks.
If a test fails, diagnose the root cause before changing implementation.
If a plan step is ambiguous, lean on the "Global decisions" section for tie
breakers; if still unclear, DONE_WITH_CONCERNS and flag for Sarah.

Start now.
```
