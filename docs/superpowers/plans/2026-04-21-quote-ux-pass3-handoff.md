# Quote Flow UX Pass 3 — Handoff Document

**For the next session.** Do NOT apply these changes in the current session — just read, plan, and execute task-by-task with the `superpowers:subagent-driven-development` skill.

---

## Context from Pass 2 session (ended 2026-04-21)

- 22 commits shipped on branch `feat/quote-redesign`, pushed to origin.
- HEAD: `1ca84bd fix(quote): shipping "same as drawing address" auto-populate`
- Preview URL: https://feat-quote-redesign.designstudio-csy.pages.dev
- 183 vitest tests passing. Webpack build clean.
- **Email-worker guard is now in place** (`emailWorkerClient.js`). Any non-prod host (`localhost`, `*.designstudio-csy.pages.dev`, etc.) returns synthetic success instead of hitting the real email pipeline. Preview testing is now safe — previous session burned Sarah's 100-email GAS quota with an unguarded E2E run; that cannot recur.
- Sarah reviewed the preview after the push and surfaced the issues below. **She's tired. Execute autonomously, minimize questions, be correct.**

## Mandatory practices for this pass

1. **Use `superpowers:subagent-driven-development`** — dispatch one implementer subagent per task with full context; two-stage review (spec compliance, then code quality) after each.
2. **Before ANY Playwright run:** Confirm `emailWorkerClient.isProductionEmailHost()` returns false on your test host. Double-confirm by greping for the allowlist in `emailWorkerClient.js`.
3. **Every Playwright test MUST attach console listeners** per `feedback_playwright_console_inspect.md`:
   ```js
   page.on('console', msg => { if (msg.type() === 'error') throw new Error('Console error: ' + msg.text()); });
   page.on('pageerror', err => { throw new Error('Page error: ' + err.message); });
   ```
   Treat `error`-level console lines as test failures, not warnings.
4. **Walk the flow TWICE during E2E:**
   - **Pass A:** Drew-flow buyer — enters address → draws yard → goes to QB. Verifies every captured field survives to Review.
   - **Pass B:** Instant-quote buyer — direct URL to `/studio?view=quote` with no draw flow. Verifies fallback paths (terrain question, preview image, no-draw-address shipping).
5. **After implementing each task**, screenshot the fixed UI and save to `.playwright-mcp/pass3-<task>-<state>.png` so Sarah can review without needing to re-test herself.
6. **No em dashes** in code comments, commit messages, or UI copy. Use periods.
7. **Voice:** "Grandview" / "we" — never first-person "I".
8. **One fix = one commit**, exact commit messages specified below, Co-Authored-By footer always.

---

## Task 1: Remove "couldn't load your property" message from draw tool

**Problem (Sarah's words):** "I don't think we do that 'couldn't load your property' thing in the draw tool — it might make users think something is wrong."

**Context:** The Regrid parcel fetch can fail for addresses outside the 30-day trial coverage area, or when the worker times out. Current UI shows a "couldn't load your property" type error toast/banner. This makes buyers think the whole tool is broken when in fact the draw still works fine without the parcel outline — the outline is a nice-to-have, not a blocker.

**Files to investigate:**
- `MapboxDrawView.js` — grep for `parcelError`, `setParcelError`, "couldn't load", "could not load"
- `parcelClient.js`
- Any component that reads `parcelError` state

**Acceptance criteria:**
1. ✅ When Regrid fails (network error, 404, timeout), NO error message is shown to the user. The parcel boundary overlay simply doesn't render.
2. ✅ `console.warn` or `console.error` may still log for debugging, but nothing visible to the buyer.
3. ✅ Draw tool continues to function normally — user can still drop vertices and advance to QB.
4. ✅ Playwright test: stub Regrid to return 500, confirm draw flow completes without a visible error banner.

**Commit:** `fix(draw): hide parcel-fetch failures from users (non-blocking feature)`

---

## Task 2: Fix segment-label placement so it doesn't block the next click

**Problem (Sarah's words + screenshot):** "See how the 5ft tag placement impedes ability to put down another dot?" In screenshot, a "+5 ft" orange label sits directly where the user's cursor needs to go to drop the next vertex.

**Context:** Pass 2 Task 2.2 moved the label to `translate(12px, -22px)` (diagonal up-right). For short segments where the next vertex goes up-and-right from the endpoint, the label still falls in the click path.

**Root cause hypothesis:** Fixed diagonal offset works for south/east-trending next clicks but collides on north/east trends. Needs dynamic positioning based on segment bearing.

**Files:**
- `mapbox.css` — current `.dy-seg-label { transform: translate(12px, -22px); }`
- `MapboxDrawView.js` — the component rendering the label (search for `dy-seg-label`)

**Acceptance criteria:**
1. ✅ Label is positioned **perpendicular to the segment, on the outside** (away from where the next vertex would go). For a closed polygon walk, "outside" is the side away from the interior. For an open line, either side is acceptable but consistent within one line.
2. ✅ Computed from segment bearing in JS, not a fixed CSS transform. Example: for a north-south segment, label goes to the east by ~20px; for an east-west segment, label goes north by ~20px.
3. ✅ Labels never overlap each other when the user draws tight corners (two adjacent segments forming a small angle).
4. ✅ Manual Playwright test: draw a 5-vertex rectangle. All four segment labels should be visibly OUTSIDE the rectangle, none overlapping the rectangle edges or the vertex hit circles.

**Commit:** `fix(draw): dynamic perpendicular-outside segment-label placement (no longer blocks next click)`

---

## Task 3: Draw mode off by default — explicit "Start Drawing" button

**Problem (Sarah's words):** "By default draw should not be selected and user should select 'Start Drawing' button then change to cross tooltip."

**Context:** Currently the draw tool enters "ready to drop vertices" mode immediately on navigating to `/studio?tab=draw`. Sarah wants an explicit opt-in: the tool opens in a pan/zoom-only state with normal cursor. A prominent "Start Drawing" button flips into draw mode and changes cursor to crosshair.

**Files:**
- `MapboxDrawView.js` — the state machine for draw phase
- `mapbox.css` — cursor rules (we already have `.dy-map .mapboxgl-canvas-container.mapboxgl-interactive { cursor: crosshair }` from Task 2.1 — this needs to be conditional on draw-mode-active)

**Acceptance criteria:**
1. ✅ On entering the draw view, cursor is normal (arrow/grab), map is pan/zoom-only, **clicking the map does NOT drop a vertex.**
2. ✅ A clearly visible "Start Drawing" CTA button is shown (suggested location: inside the MorphingDock when phase is `'empty'`, where "Start drawing" already exists as a disabled-looking text).
3. ✅ Clicking "Start Drawing" transitions to draw-active mode: cursor becomes crosshair, click drops first vertex.
4. ✅ After the user clicks "Finish" in the micro-actions OR "Continue to Quote", draw mode exits and cursor returns to normal. **Draw mode is NOT auto-re-entered.**
5. ✅ In draw-active mode, the "Start Drawing" button hides.
6. ✅ If the user has >=2 vertices placed and clicks "Start Drawing" again after finishing, it starts a NEW line (wires into the existing multi-line logic from P4).

**Commit:** `feat(draw): explicit Start Drawing gate (cursor stays normal until user opts in)`

---

## Task 4: Allow adding another line after Finish

**Problem (Sarah's words):** "Once you hit done you should then be able to add another line."

**Context:** Pass 2 Task 2.3 added an explicit "Finish" button that sets `isFinished` state, hides micro-actions, and shows "Edit drawing" link. This is correct for the "done entirely" state. But Sarah also wants a path to start a SECOND disconnected line from the finished state.

**Files:**
- `MapboxDrawView.js`, specifically the `MorphingDock` component (currently exported at the end of the file)

**Acceptance criteria:**
1. ✅ When `isFinished === true`, in addition to the "Edit drawing" link, show a "Add another line" button.
2. ✅ Clicking "Add another line" sets `isFinished = false`, calls `onStartNewLine` (the existing handler from P4.3), returns the micro-actions row.
3. ✅ Cursor becomes crosshair again.
4. ✅ New click drops a vertex on a new disconnected line (per existing P4 multi-line logic).
5. ✅ Vitest test: render dock with `phase='ready'`, click Finish, assert "Add another line" button visible. Click it, assert micro-actions are back and `onStartNewLine` was called.

**Commit:** `feat(draw): "Add another line" path from the Finished state`

---

## Task 5: Clear "Slope calculated" end-state after EPQS resolves

**Problem (Sarah's words):** "There is something wrong with calculating slope — it doesn't make it clear when it's done. It should say 'slope calculated'."

**Context:** The CTA label currently shows "Calculating slope..." while `epqsLoading` is true. When `epqsLoading` becomes false, the label jumps straight to "Done. Continue" with no acknowledgment that the slope detection finished. The buyer doesn't know whether the slope was analyzed or whether it timed out.

**Files:**
- `MapboxDrawView.js` — the `MorphingDock` CTA label branch around `if (showEpqsLoading)` and the useEffect that manages `epqsResults.current`

**Acceptance criteria:**
1. ✅ When EPQS resolves successfully (not `'unknown'`): show a short-lived "Slope detected: flat / rackable / heavy-rack" acknowledgment for ~2 seconds before the CTA returns to "Done. Continue".
2. ✅ When EPQS resolves to `'unknown'` (all samples failed): show "Slope unknown, you can still continue" briefly before CTA returns to "Done. Continue".
3. ✅ The acknowledgment is NOT a blocking modal. It's inline in the dock where the CTA label sits.
4. ✅ A small chip or pill near the stats row persists showing the detected overall slope classification (e.g. green chip "Slope: rackable" or gray chip "Slope: unknown"). Removes confusion about whether the analysis actually ran.
5. ✅ Playwright test: mock EPQS to return a known classification, advance through draw, assert the acknowledgment text appears within 200ms of classification completing.

**Commit:** `fix(draw): explicit "slope calculated" acknowledgment + persistent chip`

---

## Task 6: Diagnose why most segments show "Auto (unknown)"

**Problem (Sarah's words + screenshot):** "Almost all mine said auto unknown, is it working right?"

**Context:** The per-segment tier dropdown shows "Auto (unknown)" for most segments. This means `classifyDrawnLine` is returning `segmentClassifications` entries with `classification: 'unknown'`. Possible causes:
- USGS EPQS is actually returning 502 for most queries (despite Pass 2 Task 2.5 worker retry).
- The Pass 2 partial-failure fix marks too many segments 'unknown' (bug in the new partial classification logic).
- The EPQS proxy worker isn't deployed or its routing is broken.
- The client is hitting a CORS issue.

**Files to investigate:**
- `epqsClient.js` — the `classifyDrawnLine` function post-Pass 2 (now supports partial failures, uses `allNull` / `anyNull` branching)
- `workers/epqs-proxy/src/index.js` — the Cloudflare worker with 10s timeout + single retry
- Live worker at `https://grandview-epqs-proxy.sarah-13a.workers.dev` — hit `/health` to confirm it's up

**Acceptance criteria:**
1. ✅ **Diagnose first.** Run a Playwright session with `page.on('console')` and `page.on('response')` listeners, capture every EPQS proxy request + response. Report what's actually happening.
2. ✅ If USGS is genuinely down: surface "Slope detection unavailable right now" as a one-line note in the dock (not alarming) and let user proceed.
3. ✅ If the client-side partial-failure logic is too aggressive: tighten it so segments with VALID endpoints still get proper classification instead of cascading 'unknown'.
4. ✅ If the worker isn't deployed: redeploy via `wrangler deploy` in `workers/epqs-proxy/` (the CLOUDFLARE_API_TOKEN is in `.env.local` per project memory).
5. ✅ If it's CORS: add the preview URL pattern to the worker's `ALLOWED_ORIGINS` or confirm the regex covers it.
6. ✅ After the fix, draw a yard in Sarah's test address (3267 Sheffield Drive) and verify >=75% of segments get a non-'unknown' classification.

**Commit:** `fix(draw): resolve "Auto (unknown)" cascade in EPQS classification` (or more specific title based on diagnosis)

---

## Task 7: EPQS should not re-fire when no new vertex activity

**Problem (Sarah's words):** "There is a bug — it keeps going back to calculating slope when I haven't placed a line in a long time."

**Context:** The EPQS useEffect's dep array is `[points]`. Every time `points` changes reference (even if content is identical), the effect re-fires. React's reconciliation, a stale-closure parent re-render, or a shim that rebuilds the flat points array on every render can trigger spurious re-fires.

**Files:**
- `MapboxDrawView.js` — the `useEffect(function() { ... }, [points])` block around line ~1196

**Acceptance criteria:**
1. ✅ Identify the root cause. Likely candidates: `points` is a derived value rebuilt on every render (the multi-line shim), OR an ancestor useEffect triggers a no-op setState that causes re-render.
2. ✅ Fix so EPQS only fires on MEANINGFUL points changes (length changed, or specific coordinate changed). Suggested pattern: memoize a stable key like `JSON.stringify(points)` or `points.length + ':' + lastPointHash` and use that as the dep.
3. ✅ Don't re-fire if `points.length < 2` (already guarded, but verify after the dep fix).
4. ✅ Playwright test: draw 3 vertices, wait 5s, assert `classifyDrawnLine` was called exactly once. Pan the map, wait 3s, assert still called only once.

**Commit:** `fix(draw): EPQS no longer re-fires on spurious renders (stable points key)`

---

## Task 8: Post summary — estimate concrete bags, note Grandview doesn't supply

**Problem (Sarah's words):** "We don't provide concrete, but you can scrape the internet and estimate how many bags they will need for the amount of posts — say estimate and that we don't provide."

**Context:** The expanded breakdown panel shows: `Concrete (2 bags / post) | quoted on call`. This is misleading — Grandview doesn't quote concrete at all, it's buyer's responsibility. The user wants it rephrased as an informational estimate.

**Reference math (common industry standard):**
- Typical aluminum fence post hole: 10" diameter, 24-30" deep for 48-60" tall fence
- Volume: π × (5")² × 27" ≈ 2,120 in³ ≈ 1.23 ft³ per post hole
- One 60-lb bag of Quikrete Fast-Setting Concrete Mix = ~0.45 ft³ set
- So ~2.5-3 bags per post hole for residential; 3-4 bags for commercial/industrial (larger posts)
- Easier rounded estimate for residential: **3 bags per post**

**Files:**
- `MapboxDrawView.js` — the expanded breakdown Materials list (search for "Concrete (2 bags / post)" or "quoted on call")

**Acceptance criteria:**
1. ✅ Replace `Concrete (2 bags / post) | quoted on call` with: `Concrete: ~N bags estimated | Grandview does not supply` where N = `(cornerPosts + endPosts + linePosts + gatePosts) * 3` rounded to nearest 5.
2. ✅ Add a small info icon next to the line. Tooltip text: `This is a rough estimate based on 3 bags of 60-lb fast-set concrete per post hole (10" diameter, 24-30" deep). Grandview does not supply concrete. Most buyers pick it up at Home Depot or Lowes.`
3. ✅ For industrial grade (where posts are larger), bump to 4 bags per post.
4. ✅ Update any test that asserted on the old "quoted on call" text.

**Commit:** `fix(draw): concrete line estimates bags needed + notes Grandview does not supply`

---

## Task 9: Widen slope popup further (infographic still not readable)

**Problem (Sarah's words + screenshot):** "Lets widen this a little so we can make it more easily readable the diagram."

**Context:** Pass 2 Task 1 widened the slope popup from 520px to 640px. Not enough — the "How to Measure Yard Slope" infographic has fine text callouts that are still cramped.

**Files:** `mapbox.css` — `.mbx-slope-popup` and `.mbx-slope-infographic`

**Acceptance criteria:**
1. ✅ `.mbx-slope-popup { max-width: min(820px, calc(100vw - 32px)); }` (up from 640).
2. ✅ Still respects `max-height: calc(100vh - 32px); overflow-y: auto;` so it fits in short viewports.
3. ✅ Infographic callouts ("Position a 6-Foot Board", "Level the Board", "Measure the Vertical Rise", "Selecting Your Slope Tier", "The 6-Foot Rule", "Round Up When in Doubt", the Vertical Rise / Required Slope Tier table) are all legible without squinting at 1280px wide laptop viewport.
4. ✅ Check 1024px tablet viewport — popup shouldn't clip off screen.

**Commit:** `fix(draw): widen SlopePopup to 820px for readable infographic`

---

## Task 10: Identify and address the Mapbox attribution toggle in bottom-right corner

**Problem (Sarah's words + screenshot):** "What is the toggle attribution thing that's visible in the bottom right corner?"

**Context:** Mapbox GL JS ships with an attribution control by default. It's required by Mapbox's terms of service but can be styled/compacted. On the screenshot it's a small circled `i` or toggle. Sarah wants to know what it is and probably either hide it or shrink it so it doesn't look like a stray UI element.

**Files:**
- `MapboxDrawView.js` — the `new mapboxgl.Map({ ... attributionControl: ... })` config

**Acceptance criteria:**
1. ✅ Identify the element. It's almost certainly Mapbox's AttributionControl + LogoControl pair (or the ScaleControl).
2. ✅ Do NOT remove attribution entirely — that violates Mapbox ToS.
3. ✅ Compact the attribution control: `new mapboxgl.AttributionControl({ compact: true })` so it collapses to the `i` icon that expands on click.
4. ✅ Style it so it blends with the map chrome (small opacity, muted color) — it shouldn't look like a primary UI button.
5. ✅ Document what the control is in a code comment so future-Sarah/future-Claude doesn't re-ask.

**Commit:** `chore(draw): compact + style Mapbox attribution control so it doesn't look like UI`

---

## Task 11: QB sidebar preview must match the saved design (not a generic fence image)

**Problem (Sarah's words + screenshot):** "This is still wrong — number 1, it's not the same design picture and the selections I picked did not carry forward from the design."

**Context:** The QB sidebar on Layout & Posts step shows an image of generic black ornamental fence bars (not the buyer's actual Textured Black + Horizon + Flat Cap fence they configured, and not their annotated yard drawing). This is a regression OR a case where the priority chain is falling through to `STYLE_THUMBNAILS` instead of the actual snapshot.

**Files:**
- `QuoteBuilder.js` — `resolveSidebarPreviewSrc()` priority chain:
  1. `props.snapshotDataUrl`
  2. `saved.annotatedSnapshotUrl`
  3. `saved.snapshotDataUrl`
  4. `STYLE_THUMBNAILS[styleId]`
- `app.js` — `buildSavedDesign()` where the snapshot is captured

**Hypotheses:**
- `saved.snapshotDataUrl` exists but is the 3D configurator snapshot of the fence bars alone (before the user drew), and `saved.annotatedSnapshotUrl` doesn't exist because the buyer didn't trigger it.
- OR the `styleId` is cascading to the generic thumbnail because neither snapshot exists.

**Acceptance criteria:**
1. ✅ Layout & Posts step sidebar shows the **annotated drawing with legend overlay** (from `data.annotatedSnapshotUrl`) whenever the buyer came through the draw flow.
2. ✅ If no annotated snapshot: show the `mapboxSnapshotUrl` (raw aerial with line).
3. ✅ If no map snapshot either: show the 3D fence snapshot (`saved.snapshotDataUrl`).
4. ✅ Generic `STYLE_THUMBNAILS` is an absolute LAST RESORT — used only when a brand-new buyer has seen nothing.
5. ✅ In Style & Config step: sidebar should show whatever is appropriate to the step (fence 3D snapshot is fine here, not the yard drawing).
6. ✅ Playwright test (drew-flow): walk the flow, assert `img.qb-sidebar-img.src === data.annotatedSnapshotUrl` on Layout & Posts step.

**Related:** Pass 2 Task 7 wired `annotatedSnapshotUrl` but perhaps the priority is wrong post-merge. Verify against live preview.

**Commit:** `fix(quote): QB sidebar prefers annotated-drawing > map-snapshot > fence-snapshot > thumbnail`

---

## Task 12: Selections from configurator carry forward to QB (regression check)

**Problem (Sarah's words):** "The selections I picked did not carry forward from the design."

**Context:** This should have been fixed by Pass 2 Task 5 (data pass-through audit + regression test). Sarah is reporting it again, which means EITHER:
- A specific selection she made isn't covered by the existing tests (a field we missed).
- The hydration path is failing at runtime on the preview despite tests passing (e.g., `gv_saved_design` write timing).
- She's confused the order and saw step 1 (Layout) which doesn't show Style picks, then inferred the picks didn't carry.

**Acceptance criteria:**
1. ✅ **Diagnose first.** Sarah's screenshot 7 shows:
   - Sidebar "Your design" section lists: Style: Horizon, Height: 48", Color: Textured Black, Post cap: Flat Cap, Linear feet: 302 ft, Racking: Rackable, Slope: Some sections sloped.
   - So Style, Height, Color, Post cap DID carry over. What she may mean: the secondary options (finial, accents, puppy pickets, spacing, gates/arch/mount/leaf) if she set any.
2. ✅ Run the Pass 2 regression test (`tests/quoteBuilderDataPassThrough.test.js`) against the live bundle (not just vitest). Playwright: seed localStorage with EVERY field, navigate to QB, assert every value appears in the sidebar + Review.
3. ✅ If a specific field is dropping: trace it from setter → `gv_saved_design` write → hydrate → sidebar. Fix at the first missing hop.
4. ✅ If everything actually carries: answer Sarah with a screenshot showing each field propagating, and ask her to show which specific field was wrong.

**Commit (if fix needed):** `fix(quote): <specific field> passes through to QB sidebar`

---

## Task 13: Layout step should show annotated drawing, not generic fence image

**Problem (Sarah's words):** "The layout and posts saved picture should show the annotated drawing from the draw tool not this."

**This is largely the same issue as Task 11** but worth calling out explicitly: the Layout step's preview should be the yard sketch, not a fence.

**Acceptance criteria:** Same as Task 11, scoped specifically to step 0 (Layout & Posts).

**Commit:** Covered by Task 11's commit.

---

## Task 14: When validating options, show the saved fence design (not a stock image)

**Problem (Sarah's words):** "The design when we get to validating options should be the saved pic not a random fence pic."

**Context:** When the buyer enters Style & Config step (step 1 post-reorder), the sidebar image OR an in-flow confirmation image is showing a generic fence photo rather than the buyer's 3D configurator snapshot.

**Files:**
- `QuoteStep1_Style.js` — the in-step confirmation of selections (if any)
- `QuoteBuilder.js` — sidebar preview logic for step 1

**Acceptance criteria:**
1. ✅ On Style & Config step, the sidebar preview image should be the buyer's 3D fence render from `saved.snapshotDataUrl` (captured from the `/studio` 3D scene), NOT a stock `STYLE_THUMBNAILS` image.
2. ✅ When the Style section is collapsed (Pass 2 Task 4.2) and shows "Style: Horizon" summary with the small thumbnail — that thumbnail can still be from `STYLE_THUMBNAILS` because it's a visual anchor for the buyer's current pick, not a "this is your fence" representation.
3. ✅ If the buyer has never touched the 3D configurator (e.g., direct-to-QB from a CRM link), fall back to STYLE_THUMBNAILS[styleId] gracefully.

**Commit:** `fix(quote): Style & Config sidebar prefers saved 3D fence snapshot over stock thumbnail`

---

## Task 15: Don't re-ask terrain if the slope popup already captured it

**Problem (Sarah's words):** "I think we are asking what kind of terrain they have too many times."

**Context:** The flow currently asks about terrain/slope in THREE places:
1. `SlopePopup` during the draw flow ("Is your yard flat / has some slopes / mostly sloped?")
2. Layout step `Terrain` section (Flat / Sloped / Mixed card grid)
3. Layout step `How should panels follow the slope?` + `Racking Tier`

That's 3 data entry points for overlapping information.

**Acceptance criteria:**
1. ✅ If `data.slopeAnswer` exists (SlopePopup was answered), the Layout step's Terrain section should display it as READ-ONLY: "Your answer from the draw step: Some sections sloped" with a "Change" affordance, not a re-pick card grid.
2. ✅ Keep the full Terrain pick UI for buyers who arrive via direct QB URL (`/studio?view=quote` with no drawToolData AND no slopeAnswer). These are the "instant quote" buyers per Sarah.
3. ✅ Racking tier section: when slope was detected or answered, show the detected tier as a read-only summary with "Change racking tier" affordance. Still allow override, just don't re-present the full pick.
4. ✅ Slope Handling (racked vs stair-stepped) should remain as a user choice — that's not redundant with terrain.
5. ✅ Playwright tests (both flows):
   - Drew-flow: assert Terrain section shows "Some sections sloped" read-only with Change link.
   - Direct-quote flow: assert Terrain section shows the 3-card pick UI.

**Commit:** `fix(quote): Terrain section defers to slopeAnswer when the draw flow already captured it`

---

## Task 16: Per-segment racking breakdown with annotated-image reference

**Problem (Sarah's words):** "Should be a breakdown of what we have for their runs to show we have some sections standard some rackable some heavy rack and tell them to look at the annotated image."

**Context:** After the draw flow, the buyer has per-segment racking tiers (from `data.lines[].segments[].rackingTier`). The Layout step currently either hides this detail or shows a single aggregate "Racking: Rackable" line. Sarah wants an itemized view.

**Files:**
- `QuoteStep2_Layout.js` — the rackability section post-reorder is inside the `hasSlope` branch

**Acceptance criteria:**
1. ✅ When `drawToolData.lines` has >0 segments, render a **Racking breakdown** card within the Layout step:
   - "4 segments at Standard (24 ft, 16 ft, 18 ft, 12 ft)"
   - "2 segments at Rackable (53 ft, 54 ft)"
   - "1 segment at Heavy Rack (27 ft)"
   - Link: "See color-coded runs on your annotated drawing →" scrolls the sidebar image into view.
2. ✅ Small instructional line: "Yellow = standard. Blue = rackable. Red = heavy rack. Look at your drawing to see which run is which."
3. ✅ If buyer overrode any segment in the draw tool's per-segment dropdown, the breakdown reflects the override (source 'user' vs 'auto' doesn't matter for the summary).
4. ✅ Playwright test: seed multi-tier segments, open Layout step, assert the breakdown card shows all 3 tiers with correct footage sums.

**Commit:** `feat(quote): per-segment racking breakdown referencing the annotated drawing`

---

## Pre-flight checks before this session begins

1. **Git state:** Confirm branch is `feat/quote-redesign`, HEAD is `1ca84bd` or newer, clean working tree.
2. **Run `npx vitest run`:** Must be 183/183 passing before starting.
3. **Run `npx webpack --mode production`:** Must build cleanly (3 pre-existing bundle-size warnings are OK).
4. **Verify email guard is in place:** Grep `emailWorkerClient.js` exists; `PROD_HOSTS` contains only `['studio.grandviewfence.com', 'grandviewfence.com']`.
5. **Verify EPQS worker is deployed:** `curl https://grandview-epqs-proxy.sarah-13a.workers.dev/health` returns `{"ok":true}`.

## Post-session checklist

1. All 16 tasks (or any subset Sarah scopes down to) have commits with exact messages.
2. Final `npx vitest run` green.
3. Final `npx webpack --mode production` clean.
4. **Playwright full flow run** (drew-flow + direct-quote flow) with **console listeners active** — zero `error`-level messages.
5. Screenshots saved to `.playwright-mcp/pass3-*.png`.
6. Push with `git push` (email guard makes this safe — preview won't fire real emails).
7. Summary comment to Sarah listing every task's SHA, any scope cuts, and any still-broken items with proposed follow-ups.

## Things NOT to touch this pass

- The email-worker guard (`emailWorkerClient.js`). It's load-bearing for quota protection.
- The 3D configurator (`/studio` default view). Sarah's feedback is about the draw flow and QB, not the fence/gate configurator.
- The pricing engine (`priceCalculator.js`, `retailPricing.js`). No pricing changes requested.
- The parcel-proxy or EPQS-proxy worker CORS configuration unless diagnosis in Task 6 specifically requires it.

## If you get stuck

- The plan's Task 6 diagnosis step (EPQS "auto unknown") might reveal the root is a worker deploy that got reverted OR a USGS-side outage. If it's USGS, mark it as "external cause, showing friendly message" and move on; don't burn hours trying to fix an upstream service.
- If Task 11 + Task 13 reveal that `data.annotatedSnapshotUrl` is reliably null because `buildAnnotatedSnapshot` fails silently on some environments, the fallback to `mapboxSnapshotUrl` should be adequate for ship. Add a follow-up task to debug the overlay generator separately.

Good luck.
