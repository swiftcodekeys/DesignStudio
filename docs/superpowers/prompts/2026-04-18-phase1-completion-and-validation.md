# Phase 1 Completion & Validation Prompt

**Resume prompt — feed this to a fresh session to finish Phase 1 properly.**

## Session Goal

Phase 1 of the Mapbox draw upgrade shipped 12 commits but was declared "done" prematurely — the acceptance E2E specs (1.A.1, 1.A.2) were committed as scaffolding and never actually ran to green, and Sarah caught material UX and math issues during her own test. This session's job: fix every outstanding issue and DO NOT claim done without runtime evidence.

**Hard rule for this session: no "done" without:**
1. A green Playwright E2E run that exercises the full draw → slope → quote → submit flow, with math assertions verifying line items and totals.
2. Sarah's visual approval via Playwright screenshots of the key states (draw step, slope step, review step).
3. A receipt-style math walkthrough in the final report: "100ft yard → 105ft padded → 18 panels → X dollars" with every line item accounted for.
4. All 52+ vitest tests still green.
5. The user prefers tight, autonomous execution — but on UX judgment calls (like the slope-question redesign), pause and confirm the approach BEFORE writing code. Don't guess at UX.

## Environment

- Working directory: `C:\Users\sarah\Desktop\App Repos\fence-tool`
- Branch: `feat/quote-redesign` (stay on it, do NOT cut a new branch)
- HEAD commit at session start: `3ac8a70` (fix(pricing): remove pre-pad in buildDrawToolData to prevent 10.25% double-pad)
- **Uncommitted change** in `MapboxDrawView.js` (lines ~260-285): a style-load gate wrapping the `manualPoints` addSource — COMMIT THIS FIRST as a separate commit before anything else. Message: `fix(mapbox): gate manual-line addSource on style.load to prevent race`.
- Test baseline: 53 vitest tests (11 files). 2 Playwright specs present but not green.
- Dev server: `USE_MAPBOX_DRAW=true npx webpack serve --port 3033 --no-open` (first compile ~25s).
- Mapbox token: already set in local `.env` (`MAPBOX_ACCESS_TOKEN=pk.eyJ1Ijoic2FyYWhlYiIsImEi...`). Also set as Cloudflare Pages secret for production + preview environments of the `designstudio` project.
- Mapbox token URL restrictions include `localhost:3000`. If token rejects `localhost:3033` in the browser, user needs to add that URL at account.mapbox.com — flag but don't block on it.

## Plan + Outstanding Work

**Plan file:** `docs/superpowers/plans/2026-04-17-mapbox-draw-upgrade.md`

**Tasks still pending (in the session's task tracker):**
- `#12` 1.A.4 — Flag-off regression walk
- `#13` 1.A.5 — Staging test by Sarah (renamed from "dogfood" per user preference)
- `#14` CYA banner should trigger on first draw, not page load
- `#15` Floating bottom toolbar for Manual/Done/Continue + mode toggle
- `#16` Rework slope question UX (modal is awkward) — BLOCKED on #20
- `#17` Manual-mode click dots misaligned from cursor
- `#18` EPQS badges show "0.0"" for every segment
- `#19` Shrink/restyle Mapbox attribution link
- `#20` Get reference tool URL from user for UX modeling — blocks #16

**New issues raised by the user just before session end (not yet in task tracker):**
- Scroll doesn't work in "quote details" (likely `QuoteStep6_Review.js` — investigate overflow/max-height rules introduced by the CYA card commit 9b70544 or preceding wizard redesign).
- Is the drawn `linearFeet` actually carrying over to the quote? User is skeptical. This needs a math walkthrough verifying: `buildDrawToolData.totalFeet` (raw) → `QuoteStep2_Layout.data.linearFeet` → `calculateZoneQuote(config).items[panels].qty` with the 5% pad applied exactly once.
- **Important from 1.A.3 branch review that was deferred:** I1 mobile sidebar defaults to `open` — covers Continue/Done buttons at <768px. Change `useState(true)` to `useState(false)` in `MapboxDrawView.js:427`.

## Hard Rules (enforce on the subagents you dispatch)

- Branch `feat/quote-redesign` only. No new branches. No `--amend`. No hook skipping. One fix = one commit.
- Never modify `gate_tool/js/ultra_dsg_min.js`, `SPATIAL_TRUTH.json`, `spatialConstants.js`.
- **Do not use the word "dogfood"** in any commit message, code comment, task title, file name, or user-facing text. User explicitly flagged it. See `~/.claude/projects/C--Users-sarah/memory/feedback_no_dogfood_term.md`. Preferred alternatives: "staging test", "self-test", "pre-ship validation".
- The user prefers autonomous execution with minimal questions EXCEPT for UX judgment calls. Task #16 (slope-question redesign) requires the user to specify the reference tool (task #20) and probably a design conversation before code.
- Before claiming any task done, verify evidence — tests green, screenshots captured, math walks through. The prior session got burned calling E2E scaffolding "done"; don't repeat it.

## Work Order (enforce this sequence)

1. **Commit the uncommitted style.load fix** in `MapboxDrawView.js` (~lines 260-285). One commit, diff just that file.

2. **Ask the user** for:
   - The reference tool URL (unblocks #16 and #20)
   - Whether they want Playwright to run headed (visible browser) or headless for the E2E validation
   - Whether they've updated their Mapbox token's URL restrictions to include `localhost:3033`

3. **Bug fixes first** (these don't need UX discussion):
   - `#17` Manual-mode click coord bug. The handler at `MapboxDrawView.js:~248` is `map.on('click', handleClick)`. Make sure it's using `e.lngLat.lng` and `e.lngLat.lat` (Mapbox's click event gives lng/lat directly; don't apply any pixel→geo math yourself). Verify via an E2E test that clicking at a specific map pixel lands a vertex at the matching lnglat.
   - `#18` EPQS 0.0" display fallback. In `MapboxDrawView.js:~336` (`label = arrow + maxAbsDelta.toFixed(1) + '"';`). If `maxAbsDelta < 0.5`, render "Flat ✓" pill with no arrow. If `props.epqs.confidence === 'low'`, render "— unknown —" instead of numeric.
   - Scroll-in-quote-details bug. Investigate `QuoteStep6_Review.js` — likely a parent container has `overflow: hidden` or a fixed `max-height` that traps content. The CYA card (commit 9b70544) sits above the review table — confirm it didn't accidentally push the table outside the scroll container.
   - `linearFeet` data-flow verification. Add a unit test that traces `buildDrawToolData → QuoteStep2_Layout → calculateZoneQuote` for a 100ft auto-drawn yard and asserts the panel qty is 18, the post count is 19, and the subtotal matches a hand-calculated expected value. If the test fails, fix the data flow.
   - `#15` mobile sidebar default (I1 from prior review). `useState(true)` → `useState(false)` in `MapboxDrawView.js:~427`. One-line fix, one commit.

4. **Polish:**
   - `#19` Mapbox attribution: use `mapboxgl.AttributionControl({ compact: true })` and/or reduce its z-index so it doesn't appear to be an affordance. Must still satisfy Mapbox ToS (attribution visible).

5. **UX redesign** (only after user responds to step 2's questions):
   - `#14` Banner timing: show on first draw action (first `selectedSides.length > 0` OR first `manualPoints.length > 0`), not on mount. Auto-dismiss via "Got it" button, sessionStorage-gated.
   - `#15 (continued)` Floating bottom toolbar: rebuild the button layout. Add real CSS classes for `.mbx-manual-mode-btn`, `.mbx-done-btn`, `.mbx-continue-btn` — a flex row at the bottom of the map area with consistent pill styling. Mode toggle becomes one pill in this row, not a separate absolute-positioned element.
   - `#16` Slope question rework: brainstorm with user first. Candidate approaches:
     - (a) Per-segment inline tier dropdown in the sidebar, skip modal entirely. User clicks Done → segments auto-classify via EPQS → user adjusts tier per segment if needed.
     - (b) Compact inline question card as first child of the sidebar (not a modal overlay).
     - (c) Overlay small question cards on the map near the drawn line for each segment.
     User must confirm direction before coding.

6. **E2E validation** — THIS IS THE DONE CRITERION. Wire `e2e/draw-flat-yard.spec.js` and `e2e/draw-sloped-yard.spec.js` to actually run green:
   - Playwright must start the dev server with `USE_MAPBOX_DRAW=true` (via `webServer.command` in `playwright.config.js` or a test-mode script). The in-test `page.addInitScript` stub does NOT work because webpack DefinePlugin substitutes the flag at build time.
   - Replace `page.waitForTimeout(5000)` with `page.waitForSelector('.mbx-map canvas')` or a data-testid.
   - Verify the `.mbx-map` selector exists; if it's actually under a different class name, update the test.
   - Add a specific math assertion at the end: after reaching the review step, read the panel quantity and subtotal from the DOM, compare to hand-calculated expected values. If a 100ft drawn yard should produce 18 panels at $64 each = $1,152 in panels plus $28 × 19 posts = $532 in posts, assert those specific numbers.
   - Also add a test that verifies `linearFeet` carryover: after drawing, inspect `window.__DRAW_TOOL_DATA__` (or similar debug hook — add one if needed) and confirm `totalFeet` is raw 100, not 105.
   - Both specs must go green in headless before this task is done.

7. **Flag-off regression** (`#12`, 1.A.4): kill the Mapbox server, run `USE_MAPBOX_DRAW=false npm start` on port 3000, walk the legacy `DrawYardView` flow end-to-end, submit a quote, and capture the CRM payload. Compare payload shape to the saved one in `tests/` or the CRM repo. If possible, add a Playwright test for this path too.

8. **Final evidence gate**:
   - All vitest tests green (53+).
   - Both E2E specs green with math assertions passing.
   - Screenshots of: (a) the draw step with a completed 4-sided draw, (b) the slope step, (c) the review step with pricing visible, (d) the submitted-state confirmation.
   - A short report in the session's final message listing: commits made, test counts, specific dollar amounts verified, any deferred issues and why.

Only after step 8 may you say "Phase 1 complete."

## Notable Prior-Session Artifacts (carry these forward)

- `TECH_DEBT.md` — read it; it documents pitfalls that the plan author missed.
- `priceCalculator.js:164-170` applies `Math.min(config.slopedPostCount ?? totalPosts, totalPosts)`. Don't break this invariant.
- `buildDrawToolData` emits RAW `totalFeet` post-commit `3ac8a70`. The 5% pad lives at the pricing boundary only.
- `geometryUtils.js` has `computeSampleStepCount`, `computeSlopedPostCount`, `aggregateClassificationsForUserSegments`. Reuse before adding helpers.
- Parcel-proxy worker URL: `https://grandview-parcel-proxy.sarah-13a.workers.dev` (default in webpack DefinePlugin).
- Email worker is NOT deployed — user runs `cd workers/email-worker && npx wrangler deploy` when they're ready to see the new "Next steps" line in order confirmation emails.
- User's Cloudflare account: sarah@grandviewfence.com, account ID `13a1fa5db3cc03d1afc933f43a37e66a`. Wrangler token has `workers (write)` scope only — some operations may require dashboard.

## Phase Exit

When this session says Phase 1 is done with evidence, the next session can pick up `docs/superpowers/prompts/2026-04-18-phase2-stripe-checkout.md`.
