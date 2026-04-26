# Quote Redesign Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 11 ship-blocking bugs in the quote redesign (`feat/quote-redesign` branch) without introducing scope creep.

**Architecture:** Targeted edits to 5 existing files. No new modules. Tests added per fix where behavior is verifiable in JSDOM. Each bug = one task = one commit, per CLAUDE.md rule.

**Tech Stack:** React (createElement, no JSX in these files), Mapbox GL JS, vanilla CSS, Vitest + Testing Library, Phosphor icons, webpack.

**Scope decisions locked in before execution:**
- Bug #3 (multi-line): **single-line only for v1**. Sarah's bug list asks the question but she told us to ship; default to single-line, leave multi-line for a later branch.
- Bug #9 (YouTube URL): **not available**. Will link to `/how-to-measure-your-yard` only; YouTube link stays out of the popup until Sarah provides a URL.
- Bug #10 (measurement image): use `assets/slope-guides/measure-slope.png` — already in the repo, previously wired in the now-deprecated `SlopePopup.js`. Link the image inline in the popup and link the `/how-to-measure-your-yard` route (served by `HowToMeasurePage.js`) as the Read More link.

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `mapbox.css` | Modify | Vertex marker positioning, expanded-panel overflow + close button |
| `MapboxDrawView.js` | Modify | Vertex hit target via `::before`, restore estimate-popup copy + measurement image + link, add close-X inside expanded panel |
| `tests/mapboxDrawView.test.js` | Modify | Restore the vertex-marker inline-style guard test; add tests for popup copy and image |
| `app.js` | Modify | Force a renderer frame before `toDataURL` in `buildSavedDesign` |
| `DesignReviewPage.js` | Modify | Fallback snapshot rendering when `saved.snapshotDataUrl` is empty |

---

## Task 1: Bug #1 — vertex marker positioning

**Root cause:** `.dy-vertex { position: relative }` in `mapbox.css:753` overrides Mapbox GL's inline `position: absolute` on `.mapboxgl-marker` elements. Mapbox positions markers via `transform: translate(x, y)` which requires `position: absolute`. Result: dots drift off the corners.

**Fix:** Remove `position: relative` from `.dy-vertex`. Replace the nested `.dy-vertex-hit` child div with a `::before` pseudo-element on `.dy-vertex` so the hit-area stays anchored to the same transformed ancestor.

**Files:**
- Modify: `mapbox.css:745-763`
- Modify: `MapboxDrawView.js:773-777`
- Test: `tests/mapboxDrawView.test.js` (add new test)

- [ ] **Step 1: Write the failing test**

Add this test to `tests/mapboxDrawView.test.js` inside the existing `describe('MapboxDrawView (pen-tool + morphing dock)', ...)` block, right after the "estimate banner is visible..." test (around line 212):

```javascript
  it('vertex marker element has no inline position style (relies on Mapbox transform)', () => {
    // Guard: Mapbox Marker applies position:absolute + transform:translate().
    // Our CSS must not set position:relative on .dy-vertex or the marker
    // renders at origin with the inner dot offset by the transform. This
    // test protects against a regression where a rewrite adds position
    // back to the vertex class.
    const fs = require('fs');
    const path = require('path');
    const css = fs.readFileSync(
      path.join(__dirname, '..', 'mapbox.css'),
      'utf8'
    );
    // Find the .dy-vertex rule (not .dy-vertex-first, not .dy-vertex-hit)
    const match = css.match(/\.dy-vertex\s*\{([^}]*)\}/);
    expect(match).toBeTruthy();
    const rule = match[1];
    expect(rule).not.toMatch(/position\s*:/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mapboxDrawView.test.js -t "vertex marker element has no inline position"`
Expected: FAIL with `expected 'width: 18px; ... position: relative; ...' not to match /position\s*:/`

- [ ] **Step 3: Apply the CSS fix**

In `mapbox.css`, replace the existing `.dy-vertex` / `.dy-vertex-hit` block (lines 745-763):

```css
/* ===== Map overlays (vertex markers, labels) ===== */
.dy-vertex {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: white;
  border: 3px solid var(--dy-accent);
  cursor: grab;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.dy-vertex:active { cursor: grabbing; }
.dy-vertex-first {
  background: var(--dy-accent);
  border-color: white;
}
/* Enlarged invisible hit target — rendered as pseudo-element so it inherits
   Mapbox's absolute positioning on the parent. Prior impl nested a div and
   broke translate-based marker placement. */
.dy-vertex::before {
  content: '';
  position: absolute;
  inset: -14px;
  border-radius: 50%;
}
```

- [ ] **Step 4: Apply the JS fix**

In `MapboxDrawView.js`, replace the vertex-creation block (lines 773-777) inside the vertex markers `useEffect`:

```javascript
    props.points.forEach(function(pt, i) {
      var el = document.createElement('div');
      el.className = 'dy-vertex' + (i === 0 ? ' dy-vertex-first' : '');

      var marker = new mapboxgl.Marker({ element: el, draggable: true })
```

(Delete the `var hit = document.createElement('div'); hit.className = 'dy-vertex-hit'; el.appendChild(hit);` lines.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/mapboxDrawView.test.js`
Expected: PASS for all tests including the new guard.

- [ ] **Step 6: Commit**

```bash
git add mapbox.css MapboxDrawView.js tests/mapboxDrawView.test.js
git commit -m "$(cat <<'EOF'
fix(draw): vertex markers anchor to corners (remove position:relative override)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Bug #7 — restore estimate-popup CYA disclaimer

**Root cause:** Session rewrite replaced the popup body with softer marketing copy. Sarah wants the verification/responsibility language back.

**Files:**
- Modify: `MapboxDrawView.js:375-409` (EstimatePopup function)
- Test: `tests/mapboxDrawView.test.js` (extend existing popup test)

- [ ] **Step 1: Write the failing assertion**

In `tests/mapboxDrawView.test.js`, extend the existing `it('estimate banner is visible when user has drawn points and opens a popup on click', ...)` test. Add these assertions right before the closing `});` of that test (after the "Got it" check around line 211):

```javascript
    // CYA language Sarah requires: customer is responsible for the math;
    // Grandview verifies before production; the measurements they enter are
    // what we build to. Do not soften.
    expect(dialog.textContent).toMatch(/your responsibility/i);
    expect(dialog.textContent).toMatch(/verify/i);
    expect(dialog.textContent).toMatch(/before production/i);
    expect(dialog.textContent).toMatch(/what (we|Grandview) build(s)? to/i);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mapboxDrawView.test.js -t "estimate banner is visible"`
Expected: FAIL — current text says "catches obvious red flags" not "what we build to" in that exact shape; previous assertion set may partially pass.

- [ ] **Step 3: Restore the popup body**

In `MapboxDrawView.js`, replace the `<h3>` + `<p>` content inside `EstimatePopup` (lines 389-399):

```javascript
      React.createElement('h3', null, 'About this estimate'),
      React.createElement('p', null,
        'You\u2019ll mark your fence line on this map. The linear footage and price range come straight from the line you draw.'
      ),
      React.createElement('p', null,
        React.createElement('strong', null, 'It\u2019s your responsibility to double-check the math and validate your measurements yourself. '),
        'Grandview will verify with you before production, but the measurements you enter are what we build to.'
      ),
      React.createElement('p', { className: 'dy-est-muted' },
        'Satellite imagery can be a year or two old, and tree canopy can hide features. When in doubt, walk the line with a tape measure before you submit.'
      ),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/mapboxDrawView.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add MapboxDrawView.js tests/mapboxDrawView.test.js
git commit -m "$(cat <<'EOF'
fix(draw): restore CYA disclaimer in estimate popup (verification language)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Bug #10 — restore measurement image + how-to link in popup

**Root cause:** The rewrite dropped the `measure-slope.png` image and the `/how-to-measure-your-yard` link that previously lived in the (now-deprecated) `SlopePopup`. Customers had no way to reach the measurement guide.

**Files:**
- Modify: `MapboxDrawView.js:389-406` (EstimatePopup body — add image and link)
- Modify: `mapbox.css` (style the image inline with the popup)
- Modify: `tests/mapboxDrawView.test.js` (add assertion)

**Note:** `assets/slope-guides/measure-slope.png` exists in the repo. `/how-to-measure-your-yard` is a live route mounted in `app.js:548` rendering `HowToMeasurePage.js`. Do not create new routes or assets.

- [ ] **Step 1: Write the failing assertion**

In `tests/mapboxDrawView.test.js`, extend the same popup test with:

```javascript
    // Measurement guide image + Read-More link must be present in the popup.
    // These were in the original SlopePopup and got stripped in the rewrite.
    const img = dialog.querySelector('img.dy-est-measure-img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toMatch(/measure-slope\.png/);
    const readMore = dialog.querySelector('a[href="/how-to-measure-your-yard"]');
    expect(readMore).toBeTruthy();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mapboxDrawView.test.js -t "estimate banner is visible"`
Expected: FAIL — `img.dy-est-measure-img` is null.

- [ ] **Step 3: Add the image + link to the popup**

In `MapboxDrawView.js`, inside `EstimatePopup`, insert the image and link between the last paragraph (`dy-est-muted`) and the `dy-est-actions` div. The final body of the dialog should look like:

```javascript
      React.createElement('h3', null, 'About this estimate'),
      React.createElement('p', null,
        'You\u2019ll mark your fence line on this map. The linear footage and price range come straight from the line you draw.'
      ),
      React.createElement('p', null,
        React.createElement('strong', null, 'It\u2019s your responsibility to double-check the math and validate your measurements yourself. '),
        'Grandview will verify with you before production, but the measurements you enter are what we build to.'
      ),
      React.createElement('p', { className: 'dy-est-muted' },
        'Satellite imagery can be a year or two old, and tree canopy can hide features. When in doubt, walk the line with a tape measure before you submit.'
      ),
      React.createElement('img', {
        src: 'assets/slope-guides/measure-slope.png',
        alt: 'How to measure your yard for a fence',
        className: 'dy-est-measure-img',
      }),
      React.createElement('a', {
        href: '/how-to-measure-your-yard',
        target: '_blank',
        rel: 'noopener',
        className: 'dy-est-measure-link',
      }, 'Read: Full yard measurement guide \u2192'),
      React.createElement('div', { className: 'dy-est-actions' },
```

- [ ] **Step 4: Style the image and link**

In `mapbox.css`, add below the existing `.dy-est-muted` block (after line ~724):

```css
.dy-est-measure-img {
  display: block;
  width: 100%;
  max-width: 420px;
  height: auto;
  margin: 4px 0 10px;
  border-radius: 8px;
  border: 1px solid var(--dy-border, #e6e0d7);
}
.dy-est-measure-link {
  display: inline-block;
  color: var(--dy-accent);
  text-decoration: none;
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 14px;
}
.dy-est-measure-link:hover { text-decoration: underline; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/mapboxDrawView.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add MapboxDrawView.js mapbox.css tests/mapboxDrawView.test.js
git commit -m "$(cat <<'EOF'
fix(draw): restore measure-slope image + how-to-measure link in estimate popup

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Bugs #2, #6 — explicit Done action + close-X on expanded panel

**Root cause:**
- #2: No explicit "I'm finished" control — users don't know drawing has ended. The `Continue · ~$X` button does finalize and advance, but its label reads as "proceed" not "done".
- #6: Expanded breakdown has a bottom-left text toggle that isn't obvious. Needs a prominent X in the top-right of the panel.

**Fix for #2:** Keep `Continue · ~$X` but add a leading `Check` + the word `Done` in the label so it reads `✓ Done — Continue · ~$X`. Behavior unchanged.

**Fix for #6:** Add an absolutely-positioned close button inside `.dy-dock-expanded` that calls `onToggleBreakdown`.

**Files:**
- Modify: `MapboxDrawView.js:480-508` (dock CTA label) and `MapboxDrawView.js:510-559` (expanded panel)
- Modify: `mapbox.css:477-498` (expanded panel close button style)

- [ ] **Step 1: Add a test for the close button**

In `tests/mapboxDrawView.test.js`, add a new test after the vertex-position guard test:

```javascript
  it('expanded breakdown has a dedicated close button that collapses the panel', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [
        [-83.9, 42.6], [-83.9, 42.605], [-83.905, 42.605], [-83.905, 42.6],
      ],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    // Open the expanded panel via the existing toggle
    const toggle = container.querySelector('.dy-breakdown-toggle');
    expect(toggle).toBeTruthy();
    act(() => { fireEvent.click(toggle); });
    const expanded = container.querySelector('.dy-dock-expanded');
    expect(expanded).toBeTruthy();
    // Close button inside the expanded panel collapses it
    const closeBtn = expanded.querySelector('.dy-expanded-close');
    expect(closeBtn).toBeTruthy();
    act(() => { fireEvent.click(closeBtn); });
    expect(container.querySelector('.dy-dock-expanded')).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/mapboxDrawView.test.js -t "expanded breakdown has a dedicated close"`
Expected: FAIL — `.dy-expanded-close` does not exist yet.

- [ ] **Step 3: Update the dock CTA label**

In `MapboxDrawView.js`, replace the CTA label block (lines 486-498) with:

```javascript
      canContinue ? (function() {
        var mid = priceRange ? (priceRange.low + priceRange.high) / 2 : 0;
        return React.createElement(React.Fragment, null,
          React.createElement(Check, { size: 14, weight: 'bold' }),
          React.createElement('span', null, 'Done. Continue'),
          priceRange && React.createElement('span', { className: 'dy-dock-cta-price' },
            '\u00B7 ~' + formatMoney(mid)
          ),
          React.createElement(ArrowRight, { size: 14, weight: 'bold' })
        );
      })() : React.createElement('span', null,
        'Keep going \u00B7 ' + Math.max(0, MIN_DRAW_FT - Math.round(totalFt)) + '+ ft'
      )
```

- [ ] **Step 4: Add the close-X inside the expanded panel**

In `MapboxDrawView.js`, modify the `expandedPanel` block (starts at line 510). Add the close button as the first child inside the outer `dy-dock-expanded` div:

```javascript
  var expandedPanel = isExpanded && segments.length > 0 && React.createElement('div', { className: 'dy-dock-expanded' },
    React.createElement('button', {
      type: 'button',
      className: 'dy-expanded-close',
      onClick: props.onToggleBreakdown,
      'aria-label': 'Close breakdown',
    }, React.createElement(X, { size: 16, weight: 'bold' })),
    // Segment list
    React.createElement('div', { className: 'dy-expanded-col' },
```

(Leave the rest of the expandedPanel contents unchanged.)

- [ ] **Step 5: Style the close button**

In `mapbox.css`, add below the `.dy-dock-expanded` rule (after line ~489):

```css
.dy-expanded-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--dy-muted, #8a7a63);
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dy-expanded-close:hover { background: var(--dy-cream, #f6efe3); color: var(--dy-ink, #1a1917); }
```

And ensure `.dy-dock-expanded { position: relative; ... }` — add `position: relative;` to the existing rule (line 477) so the close button anchors correctly:

```css
.dy-dock-expanded {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  /* ...existing props... */
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/mapboxDrawView.test.js`
Expected: PASS for all tests including the new close-button test.

- [ ] **Step 7: Commit**

```bash
git add MapboxDrawView.js mapbox.css tests/mapboxDrawView.test.js
git commit -m "$(cat <<'EOF'
fix(draw): explicit Done label on CTA + dedicated close-X in expanded breakdown

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Bug #5 — expanded breakdown overflow on narrow viewports

**Root cause:** `.dy-dock-expanded` uses `grid-template-columns: 1fr 1fr` at 860px width with no max-height. Long segment lists push the panel past the dock container.

**Files:**
- Modify: `mapbox.css:477-498` (expanded panel rules)

- [ ] **Step 1: Add max-height + scrollable segment list**

In `mapbox.css`, update the `.dy-dock-expanded` block (already touched in Task 4). It should now read:

```css
.dy-dock-expanded {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 16px 20px 18px;
  border-top: 1px solid var(--dy-border);
  max-height: min(60vh, 420px);
  overflow: hidden;
  animation: dy-expand-in 0.2s ease-out;
}
.dy-expanded-col {
  min-width: 0;
  overflow-y: auto;
  max-height: 100%;
}
```

(Preserve any existing properties in the original rule that aren't listed above — specifically `padding`, `border-top`, and `animation` if they were already there.)

- [ ] **Step 2: Narrow-viewport stack fallback**

In the existing `@media (max-width: 900px)` block at `mapbox.css:991-994`, add a rule that collapses the grid to a single column so both columns remain readable on mobile:

```css
@media (max-width: 900px) {
  .dy-dock, .dy-dock-ready, .dy-dock-drawing, .dy-dock-expanded, .dy-dock-empty {
    width: calc(100vw - 24px);
    max-width: calc(100vw - 24px);
  }
  .dy-dock-expanded {
    grid-template-columns: 1fr;
    max-height: 50vh;
  }
```

(Keep the rest of the @media block; only this rule is added.)

- [ ] **Step 3: Smoke-test by opening the preview URL**

Run: `npx webpack --mode production`
Expected: build completes without errors.

Then push the commit and verify on the Cloudflare preview that:
1. Drawing 8+ segments on a desktop viewport keeps the breakdown panel within the dock bounds (scroll bar appears inside `.dy-expanded-col`).
2. Drawing on a 375px-wide viewport stacks the two columns vertically.

- [ ] **Step 4: Commit**

```bash
git add mapbox.css
git commit -m "$(cat <<'EOF'
fix(draw): expanded breakdown respects dock width with scroll + mobile stack

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Bug #4 — verify segment list shows all segments

**Root cause:** Per the bug report, the per-segment row list "appears missing" in the expanded panel. Code inspection (`MapboxDrawView.js:510-528`) shows the list IS rendered from the `segments` prop, and the main component passes `dockSegments` (computed from all points). If Sarah saw no rows, the most likely cause is either the panel was collapsed (Bug #6, addressed above) or CSS truncation hid the list.

**Files:**
- Verify-only: `MapboxDrawView.js:510-528` (segment rendering)
- Add test: `tests/mapboxDrawView.test.js`

- [ ] **Step 1: Write a test proving the segment count matches points - 1**

In `tests/mapboxDrawView.test.js`, add after the expanded-breakdown close test:

```javascript
  it('expanded breakdown lists every drawn segment (one per vertex pair)', () => {
    localStorage.setItem('gv_draw_state', JSON.stringify({
      points: [
        [-83.9, 42.6],
        [-83.9, 42.605],
        [-83.905, 42.605],
        [-83.905, 42.6],
        [-83.9, 42.6],
      ],
      ts: Date.now(),
    }));
    const { container } = render(
      <MapboxDrawView
        onComplete={() => {}}
        initialLocation={{ lat: 42.6, lng: -83.9, address: '123 Main' }}
      />
    );
    const toggle = container.querySelector('.dy-breakdown-toggle');
    act(() => { fireEvent.click(toggle); });
    const items = container.querySelectorAll('.dy-segment-list .dy-segment-item');
    // 5 points → 4 segments
    expect(items.length).toBe(4);
  });
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/mapboxDrawView.test.js -t "expanded breakdown lists every drawn segment"`
Expected: PASS (this should pass without code changes — the test is a regression guard, not a fix).

If it fails: inspect the JSDOM output, determine whether `segments` is empty, `dockSegments` is empty, or CSS `display: none` is applied. Fix accordingly.

- [ ] **Step 3: Commit**

```bash
git add tests/mapboxDrawView.test.js
git commit -m "$(cat <<'EOF'
test(draw): guard segment list renders one row per drawn pair

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Bug #11 — fence snapshot missing on Quote Details page

**Root cause:** `app.js:buildSavedDesign` calls `canvasEl.toDataURL(...)` without forcing a render pass. Three.js renderers use rAF-driven loops; if the scene was last rendered several frames before the button click, the back buffer contents depend on `preserveDrawingBuffer: true` being effective. On tab switches or quick "Get Quote" taps the canvas may be the wrong scene's canvas or a stale one, producing an empty data URL.

**Fix A (primary):** Before capture, dispatch a `gv:request-render` CustomEvent on `window`. The active renderer (GateRenderer / FenceRenderer already mounted via `UnifiedCanvas`) listens and triggers a render pass. Then capture inside `requestAnimationFrame` so the composite happens post-render.

**Fix B (fallback):** In `DesignReviewPage`, when `saved.snapshotDataUrl` is empty, render a styled placeholder using the existing selections grid. The "No design configured yet" placeholder already exists at line 218 for the cold-start case; we reuse it with different copy when `hasDesign && !snapshotDataUrl`.

**Files:**
- Modify: `app.js:246-285` (buildSavedDesign)
- Modify: `GateRenderer.js`, `FenceRenderer.js` (listen for gv:request-render)
- Modify: `DesignReviewPage.js:211-221` (fallback branch)

- [ ] **Step 1: Add a request-render listener to GateRenderer**

Open `GateRenderer.js`. Find the constructor or initialization method where `this.renderer` is set up (around line 51). After the renderer is created, add a render-on-demand listener. Look for an existing `init()` or constructor method; add at the end:

```javascript
    // Allow the app shell to force a render before capturing a snapshot.
    // buildSavedDesign in app.js dispatches gv:request-render immediately
    // before toDataURL so the back buffer reflects the current scene state.
    this._onRequestRender = function() {
      try {
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      } catch (e) { /* non-fatal */ }
    }.bind(this);
    window.addEventListener('gv:request-render', this._onRequestRender);
```

Also add a cleanup path in whatever dispose/destroy method exists (search for `dispose` or `destroy` in `GateRenderer.js`). If the renderer has a `destroy()` method:

```javascript
    if (this._onRequestRender) {
      window.removeEventListener('gv:request-render', this._onRequestRender);
      this._onRequestRender = null;
    }
```

- [ ] **Step 2: Mirror the same changes in FenceRenderer**

Open `FenceRenderer.js`. Find the corresponding renderer initialization (around line 50) and apply the identical `window.addEventListener('gv:request-render', ...)` + cleanup pattern as Step 1.

- [ ] **Step 3: Update buildSavedDesign to request a render before capture**

In `app.js`, replace the snapshot-capture try-block (lines 252-285) with:

```javascript
        var snapshotDataUrl = '';
        try {
            // Request a synchronous render pass from whichever renderer is
            // currently mounted. With preserveDrawingBuffer:true the back
            // buffer then contains the latest frame for toDataURL.
            try { window.dispatchEvent(new CustomEvent('gv:request-render')); } catch (_) {}

            var viewportWrap = document.querySelector('.viewport-wrap');
            var canvasEl = document.querySelector('.viewport-scene canvas');
            var bgImgEl = viewportWrap ? viewportWrap.querySelector('.viewport-scene img') : null;
            if (canvasEl && viewportWrap) {
                var w = canvasEl.width;
                var h = canvasEl.height;
                var offscreen = document.createElement('canvas');
                offscreen.width = w;
                offscreen.height = h;
                var ctx = offscreen.getContext('2d');
                if (bgImgEl && bgImgEl.complete && bgImgEl.naturalWidth > 0) {
                    ctx.drawImage(bgImgEl, 0, 0, w, h);
                } else {
                    var grad = ctx.createLinearGradient(0, 0, 0, h);
                    grad.addColorStop(0, '#cddcea');
                    grad.addColorStop(0.25, '#b4c6d6');
                    grad.addColorStop(0.5, '#a0b4c4');
                    grad.addColorStop(1, '#94a8b4');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, w, h);
                }
                ctx.drawImage(canvasEl, 0, 0, w, h);
                snapshotDataUrl = offscreen.toDataURL('image/jpeg', 0.85);
            } else if (canvasEl) {
                snapshotDataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
            }
        } catch (e) {
            console.warn('[SaveDesign] Canvas capture failed:', e);
        }
```

- [ ] **Step 4: Add fallback in DesignReviewPage**

In `DesignReviewPage.js`, replace the snapshot branch (lines 211-221) with:

```javascript
                        {hasDesign && saved.snapshotDataUrl ? (
                            <div className="bridge-snapshot">
                                <img className="bridge-snapshot-img" src={saved.snapshotDataUrl} alt="Your fence design" />
                                <div className="bridge-snapshot-badge">SAVED</div>
                                {isPoolReady && <div className="bridge-pool-badge">POOL READY</div>}
                            </div>
                        ) : hasDesign ? (
                            <div className="bridge-snapshot bridge-snapshot-empty">
                                <div className="bridge-snapshot-placeholder">
                                    Your design is saved. Preview image unavailable — selections below are accurate.
                                </div>
                                {isPoolReady && <div className="bridge-pool-badge">POOL READY</div>}
                            </div>
                        ) : (
                            <div className="bridge-snapshot bridge-snapshot-empty">
                                <div className="bridge-snapshot-placeholder">No design configured yet</div>
                            </div>
                        )}
```

- [ ] **Step 5: Verify build is clean**

Run: `npx webpack --mode production`
Expected: builds without errors.

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 6: Smoke-test on preview**

After commit + push, open the Cloudflare preview URL and flow:
Design Studio → configure style/color → Get Quote → Design Review page.

Expected: snapshot appears (Fix A worked) OR the fallback "Preview image unavailable" message appears with selections intact (Fix B worked). No broken/empty img tag.

- [ ] **Step 7: Commit**

```bash
git add app.js GateRenderer.js FenceRenderer.js DesignReviewPage.js
git commit -m "$(cat <<'EOF'
fix(quote): force render pass before snapshot capture + graceful fallback on review page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final verification

**Files:** None modified. Verification-only.

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass. Count should be at least 81 (81 existing + new tests from this plan).

- [ ] **Step 2: Production build**

Run: `npx webpack --mode production`
Expected: clean build, no errors.

- [ ] **Step 3: Push and verify Cloudflare build**

```bash
git push origin feat/quote-redesign
```

Wait for Cloudflare Pages build. Open the preview URL.

Expected checks on preview:
- [ ] Vertex dots sit on the corner pixel (Bug #1)
- [ ] CTA reads "Done. Continue · ~$X" (Bug #2)
- [ ] Expanded breakdown has X close button top-right (Bug #6)
- [ ] Segment list shows every drawn line (Bug #4)
- [ ] Expanded panel doesn't overflow on desktop or mobile (Bug #5)
- [ ] Estimate popup has the responsibility copy + measure-slope image + "Read: Full yard measurement guide" link (Bugs #7, #8, #10)
- [ ] `/how-to-measure-your-yard` opens in new tab when clicked
- [ ] Design Studio → Get Quote → review page shows the fence snapshot (Bug #11)
- [ ] No mentions of "walks the property", "video call", or "Sarah" in any of the CYA copy (Bug #8)

- [ ] **Step 4: Confirm complete**

No commit. Report back to Sarah with the preview URL, the commit list, and a note on the single-line v1 scope (Bug #3 deferred) and the still-missing YouTube URL (Bug #9).

---

## Open items (not blockers — surface to Sarah on completion)

1. **Bug #3 — multi-line support:** shipped as single-line v1. A follow-up branch is needed if she wants array-of-arrays `lines[]`.
2. **Bug #9 — YouTube video URL:** popup currently omits it. When Sarah provides the URL, add a `<a className="dy-est-measure-video" href="...">Watch: How to measure your yard</a>` entry next to the read-more link.
