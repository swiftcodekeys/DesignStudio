# Pass 4 Regressions Handoff (2026-04-22)

**Next session:** Execute each item below with the `superpowers:subagent-driven-development` pattern. Current branch is `feat/quote-redesign`, pushed through commit `8926aba`. Preview: https://feat-quote-redesign.designstudio-csy.pages.dev

Pass 4 landed 11 tasks but Sarah's review of the pushed preview surfaced 6 regressions and one new ask. None of these were fixed in this session — the work stopped at the revert. All items below are open.

---

## R1 — Concrete bag count is too high

**Screenshot evidence:** 14 total posts (2 end + 2 corner + 10 line) produced "Concrete: ~35 bags estimated." Sarah says that's excessive.

**Root cause:** Two bugs compound:

1. `MapboxDrawView.js` breakdown panel computes `totalPosts = corners + linePosts` — it omits `endPosts`. Should be `corners + linePosts + endPosts`. With 14 posts and 3 bags/post, we'd currently be computing 12*3=36 → rounded-to-5 = 35. Including endPosts gives 14*3=42 → 40. Still too many per Sarah.
2. The 3-bags-per-post rate is on the high end of industry guidance. Residential aluminum fence installers most commonly use **2 bags per post** for a 10" × 28" hole with 60-lb fast-set Quikrete. 3 bags is the commercial / industrial case. Dropping to 2 bags/post is the right default.

**Fix:**
- Include `endPosts` in the total: `var totalPosts = endPosts + corners + linePosts;` at the Concrete line in `MapboxDrawView.js` (search: `"Concrete: ~"`).
- Drop the residential bag rate to 2. For 14 posts that's 28, rounded to 30. That's closer to what the buyer actually picks up at Home Depot.
- Keep the 4-bag rate for industrial grade if / when a grade signal is wired here. For now leave a comment.
- Update the tooltip copy to match: "2 bags per post (60-lb fast-set, 10 inch hole, 28 inch deep)."

**Commit:** `fix(draw): lower concrete estimate to 2 bags per post + include end posts`

---

## R2 — Per-segment racking dropdown should come BACK, with plain-language labels

**Sarah's words:** "there should still be a drop down but it should only be flat slope and heavy slop or something for each ridge"

**Context:** Pass 4 Task 7 removed the per-segment racking dropdown from the draw tool entirely. Sarah wants it back, simplified to 3 plain-language options that match the quote page (Pass 4 Task 8 established the user-facing labels: **No Slope / Sloped / Heavy Slope**). Buyer picks per segment in the draw tool.

**Acceptance criteria:**
1. In the expanded breakdown panel's "Your fence line" list, each segment row has a small dropdown.
2. Dropdown options: **No Slope**, **Sloped**, **Heavy Slope**. (Optionally prepend an "Auto" option that reflects the EPQS classification — if Auto, show the detected label in parentheses like the old dropdown did.)
3. Internal values stay `standard` / `rackable` / `heavy-rackable` so pricing, Ultra manufacturing payload, and the quote page Terrain picker all see the same data shape.
4. When the buyer picks per segment in the draw tool, that flows forward to the quote page — the Layout step's aggregate racking tier should reflect the max severity of the per-segment picks (or could show "Mixed" with a drill-in). Simplest: just carry the per-segment values in `drawToolData.lines[].segments[].rackingTier` and let the quote page's breakdown card continue to summarize them.
5. Tests: restore the dropdown test in `tests/mapboxDrawView.test.js` that was converted to "dropdown is absent." Assert 3 options present with the new labels.

**Commit:** `feat(draw): restore per-segment racking dropdown with plain-language labels`

---

## R3 — Trailing dotted line comes back after Finish → Add another line

**Sarah's words:** "when you hit done and then draw new line the dotted line appears again from the line you hit finished on"

**Repro:** Draw line 1, click Finish, dotted line disappears (good — P4.1 fixed this). Click "Add another line." A fresh disconnected line should begin. But the dotted preview renders from the LAST VERTEX OF THE PREVIOUS LINE to the cursor, instead of from nothing.

**Root cause:** The `dy-ghost` effect and the ghost-label effect in `MapScreen` (MapboxDrawView.js ~1062 and ~1227) read `props.points` — the flat shim. The last element of that flat array is the last vertex of the previously-finished line, not a fresh starting point.

**Fix:** Make the ghost reference the ACTIVE line, not the flat points. Add an `activeLinePoints` prop to MapScreen sourced from `lines[lines.length - 1]`. In both the dashed-line and ghost-label effects:

```js
var activeLine = props.activeLinePoints || [];
if (props.drawModeActive && activeLine.length > 0 && props.hoverPoint) {
  coords = [activeLine[activeLine.length - 1], props.hoverPoint];
}
```

When the active line is empty (immediately after Add another line before any vertex is placed), no ghost renders. When a vertex is placed it becomes the ghost's origin. When the line is finished, `drawModeActive` is already false so the ghost hides.

**Tests:** Extend `tests/mapboxDrawView.test.js`: seed two lines (first non-empty, second empty), set drawModeActive=true, hoverPoint at (x,y), assert the `dy-ghost` source has an EMPTY coordinates array. After placing a vertex on the active empty line, assert coords connects THAT vertex to hoverPoint.

**Commit:** `fix(draw): ghost line origin follows active line, not flat shim`

---

## R4 — Morph dock too tall; put all numbers on one bottom row

**Screenshot evidence:** The stats column wrapped vertically. "82 LINEAR FEET" on top, "14 POSTS / 2 end · 2 corner · 10 line" next, "$2,493 - $3,373 EST. RANGE" below. That's three rows when Sarah wants one.

**Root cause:** Pass 4 CSS has `.dy-stats { flex-wrap: wrap; row-gap: 12px; }` with `.dy-stat { min-width: 100px; flex: 0 0 auto; }` and `font-size: 30px` on the numbers. With Barlow Condensed at 30px the cluster exceeds the dock's 820-860px width and wraps.

**Fix in `mapbox.css`:**
- `.dy-stats { flex-wrap: nowrap; gap: clamp(16px, 2vw, 28px); }`
- `.dy-stat { flex: 1 1 auto; min-width: 0; }` (allow shrinking)
- `.dy-stat-num { font-size: clamp(22px, 2.4vw, 30px); overflow: hidden; }`
- `.dy-stat-range { font-size: clamp(16px, 1.6vw, 22px); }`
- `.dy-stat-sub { font-size: clamp(10px, 0.9vw, 11px); overflow: hidden; text-overflow: ellipsis; }`

The numbers scale DOWN on narrow windows instead of wrapping. On a wide window they stay at 30px. No vertical stacking at any width.

Also consider WIDENING the ready/expanded dock from 820/860 to 860/900 to give the three stats more breathing room.

**Commit:** `fix(draw): stats row stays on one line with clamp-based font sizing`

---

## R5 — Image passthrough still broken (3D fence render not showing)

**Screenshot evidence:** Style & Config step sidebar still shows the generic Horizon thumbnail, not the buyer's configured 3D fence. Pass 4 Task 10 added `snapshotDataUrl` preservation in `handleGetQuote`, but the image is still empty for some buyers.

**Investigation needed:** The 3D canvas capture in `app.js buildSavedDesign()` at lines 272-307 likely fails silently. Candidates:

1. **`preserveDrawingBuffer`** on the WebGL context may not be set. Without it, `canvas.toDataURL()` returns a blank image because the back buffer is cleared after each frame.
2. **`gv:request-render`** event may not fire a synchronous render. If the renderer's render loop is RAF-based, the captured frame may be whatever was last rendered — potentially blank.
3. **Tainted canvas**: HDR envmap loaded cross-origin could taint the canvas so `toDataURL` throws SecurityError (the try/catch swallows it silently).

**Diagnosis plan:**
1. Open the live preview, enter the 3D configurator, configure a fence, click Draw Your Yard. In DevTools console inspect `localStorage.getItem('gv_saved_design')` — is `snapshotDataUrl` empty, a broken data URL, or valid?
2. If empty: grep for `new THREE.WebGLRenderer` in the codebase. Confirm `preserveDrawingBuffer: true` is in the renderer options. If not, add it (watch for performance: this costs ~5% on some GPUs, acceptable here).
3. If a blank data URL (e.g. `data:image/jpeg;base64,/9j/...` that decodes to a white frame): force a synchronous render via `renderer.render(scene, camera)` right before the toDataURL call. Move the capture from `buildSavedDesign` into a pre-capture hook that the renderer itself exposes.
4. If SecurityError: remove the HDR fetch or mark the image `crossorigin="anonymous"` on load.

Also audit: does the Draw Your Yard tab click actually call `buildSavedDesign` while the 3D canvas is still in the DOM? Trace through `onSceneChange` in app.js line 502-512 — the order matters.

**Commit (after diagnosis):** `fix(quote): 3D fence render actually captures to gv_saved_design`

---

## R6 — Bring back the outer scroll; keep the sidebar scrollbar gone

**Sarah's words:** "you totally took the scrolls away from the quote menus what the fuck we just dont need two the one on the right needs to be there"

**Root cause:** Pass 4 `48f92fb` changed `.app-shell > .qb-container` from `overflow-y: auto` to `overflow: visible`. But `.app-shell` is `100vh` with `overflow: hidden`. With both containers set to visible/hidden, content past the fold is clipped — no outer scroll.

**Fix:** Restore `.app-shell > .qb-container { overflow-y: auto }`. That produces the right-side page-level scrollbar Sarah wants.

The sidebar's internal scrollbar stays suppressed (the `.qb-sidebar` no longer has `overflow-y: auto` + `max-height`, so it grows with its content and the outer container scrolls past it when the viewport is short). Net: one scrollbar, on the right, as requested.

**Commit:** `fix(quote): restore outer scroll on app-shell > qb-container`

---

## Phase 2 Stripe Implementation (separate track)

Sarah dispatched the Phase 2 D2C checkout implementation in parallel. See:
- Spec: `C:\Users\sarah\Downloads\design tool.zip` → `design_handoff_d2c_checkout/README.md`
- Target: replaces `QuoteStep6_Review.js` as the terminal step of QuoteBuilder
- Stack: React.createElement, `var`, Phosphor icons, vanilla CSS in `styles.css`
- Scope: Stripe Payment Element (Card, Affirm, Klarna, Afterpay), 1280px 2-col layout, 420px sticky right rail, no deposits, 48-hour measurement consultation flow

Expected output: a new `QuoteStep6_Review.js` (or a sibling component) that implements the design, plus any supporting CSS and a Stripe Elements wrapper. Env var requirement: `STRIPE_PUBLISHABLE_KEY` (preview) / `STRIPE_SECRET_KEY` (server for creating PaymentIntents).

Because the payment flow requires a server endpoint, the subagent should either:
- Produce a mocked front-end that talks to a `POST /api/create-payment-intent` stub and document the server contract, OR
- Implement the server stub as a Cloudflare Worker in `workers/stripe/` with env vars documented.

Pick whichever keeps the scope clean. Real Stripe keys should NOT be committed.

---

## Suggested execution order

1. R6 (outer scroll) — smallest, fully unblocks testing of everything else
2. R4 (dock stats on one line) — quick visual fix, user sees it every draw
3. R3 (ghost line on Add another line) — small MapScreen change
4. R1 (concrete bags) — 2-line math fix
5. R2 (per-segment rackability dropdown restored) — new UI work, biggest of the six
6. R5 (3D fence snapshot) — diagnostic-first, might fan out

Phase 2 Stripe runs on its own track. Treat as a separate feature branch if it exceeds one session.

---

## What's green on the branch right now

- 247/247 vitest passing at `8926aba`
- Webpack production build clean (3 expected bundle-size warnings)
- Post color overlay + legend + segment rainbow colors visible on the preview
- Quote page plain-language slope options + racking vs stair-step diagrams working
- Terrain defers to slopeAnswer
- Per-segment racking breakdown card on the quote page
- Email guard protecting preview from real emails

The regressions above are all layered on top of a working baseline — no need to revert any earlier commits.
