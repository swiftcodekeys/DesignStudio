# Quote Flow UX Pass 2 — Data Pass-Through + Draw Polish + Legend Overlay

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`. Work task-by-task. Steps use checkbox syntax. **Before each commit:** run the data-pass-through audit described in "The non-negotiable QA lens" below. Do not ship a fix without proving the full Ultra-manufacturing field set survives end-to-end.

**Goal:** Fix every bug and UX gap Sarah identified during the live Playwright walkthrough on 2026-04-20, tighten the Quote Builder information architecture, and add the post-draw annotated legend overlay. Ship in a state ready for paid ads.

**Branch:** Continue on `feat/quote-redesign` (HEAD at session start: `8caf231`).
**Preview:** https://feat-quote-redesign.designstudio-csy.pages.dev
**Prior session commits:** `98cd126..8caf231` — 12 commits shipping P1–P4 from the ship-blockers plan, plus live E2E-surfaced color/postCap label fix.

---

## The non-negotiable QA lens (from user memory)

Every step of the flow must pass BOTH:

1. **Buyer-intent check** — Does this make sense to the customer at the point they encounter it? Is the label clear, the default obvious, the next click intuitive?
2. **Manufacturing-data check** — Which Ultra form field does this step populate? Can you point at the exact `activeConfig.*`, `gv_saved_design.*`, `gv_fence_config.*`, `gv_wizard_state.*`, or `window.__DRAW_TOOL_DATA__.*` path? If a field a customer configured doesn't survive to the Review step + final payload, the step is broken EVEN IF the visible UI looks fine.

See `~/.claude/projects/C--Users-sarah/memory/project_ultra_manufacturing_payload.md` for the exhaustive field list.

**Walk the flow twice** during E2E:
- Pass 1 — Standard persona, verify UX.
- Pass 2 — Set every secondary option (ball cap, tri finial, circles accent, pool barrier, pro spacing, privacy post-color), capture localStorage + `__DRAW_TOOL_DATA__` at every step, and confirm no field drops silently.

---

## Task 1: Slope popup infographic — 30% larger

**Root cause:** SlopePopup's infographic is the `measure-slope.png` asset loaded inside a 520px-max-width modal card. On a 900px-tall viewport the image reads small. Sarah wants ~30% larger while still fitting the modal comfortably.

**Files:**
- `mapbox.css` — `.mbx-slope-popup` (modal card) and `.mbx-slope-infographic` (the image)
- No JS change

- [ ] **Step 1:** Raise `.mbx-slope-popup { max-width }` from 520px to ~640px. Keep `width: min(640px, calc(100vw - 32px))` so mobile still works.
- [ ] **Step 2:** Update `.mbx-slope-infographic` — remove any `max-width` cap that's smaller than the card's content width. Add `width: 100%`, `height: auto`, preserve `border-radius: 8px` and border.
- [ ] **Step 3:** Visual check — the three radio options, "How to verify" links, and Cancel/Continue footer all still fit without scrolling on a 900px-tall viewport. If the modal grows taller than the viewport on a 700px-tall phone landscape, add `max-height: calc(100vh - 32px); overflow-y: auto;` to the modal card.
- [ ] **Step 4:** Commit: `fix(draw): enlarge SlopePopup infographic ~30% for readability`

---

## Task 2: Draw-tool placement glitches (multi-bug)

Sarah observed during the walkthrough:

1. **"Placing another dot nearby it didn't want to work then it did"** — vertex clicks within some threshold of an existing vertex are silently ignored or delayed. Need to find the cause (debounce? hit-target overlap? `::before` pseudo on `.dy-vertex` intercepting clicks on new spots?).
2. **"Said 0 and then kept saying calculating and reloading"** — the footage read "0" briefly, then the CTA got stuck in "Calculating slope…" loop. This correlates with EPQS 502s from USGS (cold-start timeouts). Retries thrash the UI.
3. **Feet label directly under mouse** — impedes the next vertex placement. Needs vertical or perpendicular offset.
4. **No explicit "Done" button** — only "Done. Continue" advances to QB. Users want to stop drawing without leaving the map (e.g., to zoom out and double-check).
5. **Default cursor should be a cross** (+) — currently browser default arrow over the canvas.

**Files:**
- `MapboxDrawView.js` — click handler, segment-label rendering, dock buttons, cursor
- `mapbox.css` — cursor, label offsets

### Task 2.1 — Cursor cross (smallest fix, do first)
- [ ] `mapbox.css`: `.dy-map .mapboxgl-canvas-container.mapboxgl-interactive { cursor: crosshair; }` (override Mapbox's grab default when in draw mode). Verify the `.dy-map` container is the right selector — grep for it.
- [ ] Confirm hover over a vertex still shows `grab` via `.dy-vertex { cursor: grab; }` which is already set (lines ~821-822 of mapbox.css).
- [ ] Commit: `fix(draw): crosshair cursor over the draw canvas`

### Task 2.2 — Segment-label offset so it doesn't block the next click
- [ ] `mapbox.css`: `.dy-seg-label` currently has `transform: translateY(-18px)`. That places labels 18px above the midpoint — directly over the segment line itself at the midpoint. Change to `translate(12px, -22px)` so the label sits off-center AND up.
- [ ] If the diagonal offset looks bad on certain orientations, compute the offset in JS based on segment bearing (perpendicular to the line, outward). Keep it simple for v1 — fixed diagonal is probably enough.
- [ ] Commit: `fix(draw): offset segment labels diagonally so they don't block new clicks`

### Task 2.3 — Explicit "Done" button (separate from "Done. Continue")
- [ ] `MorphingDock` microActions row currently has Undo, Reset, Plus (P4.3). Add a fourth button: a checkmark icon labeled "Finish" that collapses the dock to a final state but DOES NOT advance to Quote Builder. The existing "Done. Continue" remains for advancing.
- [ ] Clicking "Finish" should:
  - Set a local `isFinished` state
  - Hide the microActions (Undo/Reset/Plus)
  - Keep the map interactive (user can still pan/zoom)
  - Show an "Edit drawing" link that restores the drawing-phase UI
  - Keep the stats row visible (footage, corners, $ range)
- [ ] `MorphingDock` CTA button: when `isFinished`, relabel "Done. Continue" to just "Continue to Quote". Primary action unchanged.
- [ ] Tests: render the dock in drawing state, click Finish, assert microActions hidden and Continue label changed. Click "Edit drawing" link, assert dock returns to drawing state.
- [ ] Commit: `feat(draw): explicit Finish button separate from Continue to quote`

### Task 2.4 — Fix vertex-drop reliability near existing vertices
- [ ] Investigate: when the user clicks close to an existing vertex, does the `.dy-vertex::before` pseudo hit-target (inset: -14px, radius) intercept the click? Test by temporarily setting `pointer-events: none` on `.dy-vertex::before` and see if the drop works.
- [ ] Hypothesis: the vertex-drag handler swallows clicks near its hit target even when no drag occurs. The fix may be to distinguish "click on empty space within vertex hit target" (should drop) from "click on the vertex itself" (should start drag).
- [ ] Alternative fix: if clicks within N pixels of an existing vertex are swallowed, just increase the vertex visual size and the hit target together so users don't TRY to click near an existing vertex.
- [ ] Write a test that simulates: drop vertex at (100,100), then click at (110,100) (10px away). Assert a second vertex is added. Currently this likely fails.
- [ ] Commit: `fix(draw): reliable vertex drop near existing vertices`

### Task 2.5 — EPQS stuck "Calculating slope…" + retry thrash
- [ ] The `classifyDrawnLine` call fires 4 concurrent USGS requests (one per vertex). USGS cold-starts past 5s timeout — the worker returns 502, client retries. This creates the thrashing Sarah saw.
- [ ] Worker fix: in `workers/epqs-proxy/src/index.js`, bump `UPSTREAM_TIMEOUT_MS` from 5000 to 10000. Add one retry on 5xx (single retry, with backoff) before returning 502. This gives USGS a cold-start budget.
- [ ] Client fix: in `epqsClient.js`, if any one point fails, don't abort the whole classification — return partial results with the failed segments marked as `'unknown'` and let the UI degrade gracefully instead of stuck-loading. Current behavior: one failure → whole classification null.
- [ ] UI fix: `MapboxDrawView.js` EPQS effect should set a max-wait of 12s. If `epqsLoading` is still true after 12s, force-resolve to "unknown" and let the user continue. The "Done. Continue" CTA should never stick indefinitely.
- [ ] Tests: mock USGS returning 502, assert `classifyDrawnLine` returns a non-null result with `classification: 'unknown'` and `confidence: 'low'` after the timeout, not null.
- [ ] Deploy: `cd workers/epqs-proxy && npx wrangler deploy` after worker change.
- [ ] Commit: `fix(draw): EPQS graceful degradation on USGS 5xx + 10s timeout ceiling`

---

## Task 3: Quote Builder sidebar preview — use the actual fence the user built

**Sarah's issue:** The QB sidebar shows a cropped/zoomed view of the fence pickets that looks glitchy, not the "Your Design is Saved" image from the Design Review step. She wants the same image in both places.

**Root cause:** The sidebar image priority in `QuoteBuilder.js:resolveSidebarPreviewSrc()` is `props.snapshotDataUrl → gv_saved_design.snapshotDataUrl → STYLE_THUMBNAILS[styleId] → placeholder`. When the user arrives at QB via the draw-tool flow, `gv_saved_design.snapshotDataUrl` is the Mapbox snapshot (aerial + sketch), NOT the 3D fence snapshot. The style thumbnail fallback activates because the Mapbox snapshot URL parser may not match, OR the data URL is empty because the configurator canvas wasn't re-rendered before `buildSavedDesign`.

- [ ] Check what `gv_saved_design.snapshotDataUrl` actually contains after the full flow. Use the Playwright devtools to inspect.
- [ ] If it contains the Mapbox snapshot — that's actually what we want on the draw flow (it shows the yard sketch). But Sarah wants the "Your Design is Saved" page's fence rendering. That image lives in `DesignReviewPage.js` and is also sourced from `saved.snapshotDataUrl`. So they SHOULD match today.
- [ ] **If they don't match:** it means the configurator's `gate_tool/renderer` canvas was never re-captured before the flow progressed. Fix by forcing a render on view-switch: dispatch `gv:request-render` after the user leaves the Style & Config step and BEFORE navigating to the draw tool. The existing event handler in `GateRenderer.js` / `FenceRenderer.js` will re-render the scene; then capture the data URL fresh.
- [ ] **If they do match but one looks glitchy:** the issue is the object-fit/zoom on `.qb-sidebar-img` — it's `object-fit: cover` on a 4:3 aspect container, which crops the fence scene. Change to `object-fit: contain` on the QB sidebar AND the DesignReview page image so both show the full fence scene with letterboxing rather than a tight crop.
- [ ] Test: full wizard flow → open QB → assert `img.qb-sidebar-img.src === localStorage.gv_saved_design.snapshotDataUrl` AND that the src is a valid data URL (length > 1000 chars).
- [ ] Commit: `fix(quote): QB sidebar shows the same fence snapshot as Design Review`

---

## Task 4: Quote Builder width + Style-step collapsed state

**Sarah's feedback:** "Make the QB a little wider. Collapse the fence-style grid and say 'Expand if you want to adjust your style' — it's confusing for someone who already chose their style in the wizard."

**Files:**
- `styles.css` — `.qb-container` max-width (currently 1200px), `.qb-layout` grid template
- `QuoteStep1_Style.js` — style card grid wrapped in a collapsible

### Task 4.1 — Widen QB container
- [ ] `styles.css`: raise `.qb-container { max-width: 1200px }` to `1400px` or `1440px`. Keep responsive behavior — test 1280px laptop and 1920px desktop.
- [ ] `styles.css`: adjust `.qb-layout { grid-template-columns: 320px 1fr }` — left sidebar can stay 320px OR grow to 360px to match the wider canvas.
- [ ] Visual check on a 1440x900 Playwright viewport: sidebar + main content both have comfortable breathing room, no horizontal scroll.
- [ ] Commit: `fix(quote): widen Quote Builder container to 1440px`

### Task 4.2 — Collapsed Style section by default
- [ ] `QuoteStep1_Style.js`: wrap the `.qb-style-grid` card grid in a collapsible. Default collapsed. Header reads: "Style: Horizon (Popular, Pool Safe)" with a chevron and "Change style" affordance.
- [ ] Expanded state shows the full grid as today.
- [ ] Clicking "Change style" or the chevron expands it.
- [ ] When collapsed, show a small preview thumbnail of the currently selected style (from `ifence_previews/gate_styles/`) next to the name.
- [ ] Apply the same pattern to the Grade row (residential default, collapse "Commercial / Industrial" options under "Change grade") and Fence Type (ornamental default).
- [ ] Tests: step 1 renders → assert the style grid is NOT visible but the header IS visible → click header → grid visible.
- [ ] Commit: `fix(quote): collapse Style section by default with "Change style" affordance`

---

## Task 5: DATA PASS-THROUGH AUDIT — every secondary option

**THIS IS THE BIG ONE.** Sarah: "All secondary options are not carrying over like ball caps, tri finials, color variants etc. Every single detail should show and pass through the whole way."

For EACH of the following, find where it's set in the configurator/wizard, verify it's written to localStorage, verify it's hydrated into `QuoteBuilder.data`, verify it's rendered in the sidebar spec list, and verify it's displayed in the Review step. Add a label map (like POST_CAP_LABELS) wherever a raw code is shown.

### Fields to audit and patch

| Field | Where set | localStorage key | QB `data` field | Sidebar spec | Review card |
|-------|-----------|------------------|-----------------|--------------|-------------|
| `postCap` (pcf/pcb) | ColorTab + DetailsTab | `gv_fence_config.postCap`, `gv_saved_design.postCap` | `data.postCap` | needs POST_CAP_LABELS ✅ done in 8caf231 | needs POST_CAP_LABELS ✅ done |
| `finialType` (fs/ft/fq/fp) | DetailsTab (spear styles) | `gv_fence_config.finialType`, `gv_saved_design.finialType` | `data.finialType` | needs FINIAL_LABELS | needs FINIAL_LABELS |
| `pupType` (pupfl/pupst/pupcl/etc.) | PuppyPicketsTab | `...pupType` | `data.puppyStyle` | needs PUPPY_TYPE_LABELS | needs PUPPY_TYPE_LABELS |
| `circles` | DetailsTab accents | `...accessories.tcr` | ??? (probably dropped) | missing | missing |
| `butterflies` | DetailsTab accents | `...accessories.tbu` | ??? | missing | missing |
| `scrolls` | DetailsTab accents | `...accessories.scr` | ??? | missing | missing |
| `midRail` | DetailsTab | `...accessories.mdr` | ??? | missing | missing |
| `upperFinialRail` | DetailsTab | `...accessories.ufr` | ??? | missing | missing |
| `proSpacing` | DetailsTab (201/101 styles) | `...accessories.res` | `data.spacing = 'pro'`? | missing | missing |
| `arch` (gates) | OptionsTab | `...arch` | ??? | n/a for fence | n/a for fence |
| `mount` (gates) | OptionsTab | `...mount` | ??? | n/a | n/a |
| `leaf` (gates) | OptionsTab | `...leaf` | ??? | n/a | n/a |
| `rackingTier` per segment | Draw tool per-segment dropdown | `__DRAW_TOOL_DATA__.lines[].segments[].rackingTier` | ??? | sidebar has generic "Racking" row | Review has it? |
| `slopeAnswer` | SlopePopup | `gv_slope_answer` | ??? | needs prominent display | needs display |

### Task 5.1 — Write one test + fix per row

- [ ] Pick the first row with "missing" in sidebar/review column. Example: `finialType`.
- [ ] Write a failing test: render QB with `gv_saved_design.finialType = 'spear'` seeded, assert sidebar Finial row shows "Spear" (not "Fs" or missing).
- [ ] Add `FINIAL_LABELS = { fs: 'Spear', ft: 'Tri-Finial', fq: 'Quad-Finial', fp: 'Plug' }` in QuoteBuilder.js alongside POST_CAP_LABELS and STYLE_THUMBNAILS.
- [ ] In `buildSidebarSpecs`, add: `if (data.finialType) specs.push({ label: 'Finials', value: FINIAL_LABELS[data.finialType] || titleCase(data.finialType) });`
- [ ] Mirror in QuoteStep6_Review.js.
- [ ] Also add the field to the `hydrateFromSavedDesign()` helper if it's not already there.
- [ ] Commit each field fix as its own commit: `fix(quote): pass finialType through to QB sidebar + Review`, `fix(quote): pass accent flags (circles/butterflies/scrolls/midRail/upperFinialRail) through to QB`, etc.

### Task 5.2 — Label maps for every raw code

Centralize the label maps in a new file `C:/Users/sarah/Desktop/App Repos/fence-tool/optionLabels.js`:

```javascript
export var POST_CAP_LABELS = { pcf: 'Flat Cap', pcb: 'Ball Cap' };
export var FINIAL_LABELS = { fs: 'Spear', ft: 'Tri-Finial', fq: 'Quad-Finial', fp: 'Plug' };
export var PUPPY_TYPE_LABELS = {
  pupfl: 'Flush', pupst: 'Standard',
  pupcl: 'Classic', // base
  // the finial variant is a separate pfinid field
};
export var ARCH_LABELS = { es: 'Estate', ar: 'Arched', rv: 'Reverse', st: 'Standard' };
export var MOUNT_LABELS = { p: 'Post Mount', d: 'Direct Mount' };
```

Import these in `QuoteBuilder.js`, `QuoteStep6_Review.js`, and any other consumer. Replace local duplicates.

- [ ] Commit: `refactor(quote): centralize option label maps in optionLabels.js`

### Task 5.3 — The audit commit

After all field fixes land, add a Playwright test that seeds localStorage with EVERY field set to a specific value, renders QB through to Review, and asserts each value is displayed correctly. This is the regression guard.

- [ ] Test file: `tests/quoteBuilderDataPassThrough.test.js`
- [ ] For each field in the audit table, assert its displayed label in both sidebar AND Review.
- [ ] Commit: `test(quote): full data-pass-through regression for all Ultra manufacturing fields`

---

## Task 6: Quote Builder step ordering — Measurements FIRST

**Sarah's ask:** "The measurement details should be first in Quote Details right after Draw Your Yard. Your measurements are taken, etc. Your total linear feet, your runs, terrain for runs, etc., posts."

Currently the QB steps are:
1. Style & Config (Grade, Fence Type, Style, Color, etc.)
2. Layout & Posts (Linear Feet, Terrain, Corners, End Points, Sharp Angles, Gentle Curves, Layout Shape, Post breakdown)
3. Gates
4. Extras
5. Shipping
6. Review

Sarah wants Layout & Posts FIRST because the draw tool just captured that data — it should be confirmed immediately.

New order:
1. Layout & Posts (confirm what we captured from the draw)
2. Style & Config (what you already selected)
3. Gates
4. Extras
5. Shipping
6. Review

- [ ] `QuoteBuilder.js` — swap the step 0 and step 1 render branches. Update the `STEP_LABELS` array for the phase-band at top.
- [ ] Update progress dots + step numbers in the header.
- [ ] Update any step-enter tracking (`trackStepEnter`) so the analytics labels match.
- [ ] Update the Review-step Edit-links — they currently use step indexes. Swap them to match the new order.
- [ ] Task 4.2's collapsed Style section now applies to what becomes step 2, not step 1.
- [ ] Tests: render QB, assert step 0 title is "Layout & Posts", step 1 is "Style & Config".
- [ ] Commit: `feat(quote): reorder steps to put Layout & Posts first (measurements before style)`

**Intro copy for step 1 (new Layout step):**
```
Here's what we captured from your drawing. Please double-check each field —
these measurements are exactly what we'll build to. You can adjust any value
below if your sketch was rough.
```
(Sarah-voice, Grandview voice, no "I", no em dashes.)

---

## Task 7: Legend overlay on the final fence sketch

**Sarah's big idea:** "Have a saved image from their final fence overlay where we say on the image what each post type is and what sections are rackable. We can have a legend that says standard yellow blue rackable red heavy rack etc. What kind of post each is. These are the types of post, this is what we have for your terrain. Then when they are confirming their design choices again before checkout you get what I'm saying."

This becomes both the buyer-trust image AND the Ultra manufacturing spec visual.

### Design

On the Mapbox snapshot, after the user clicks "Done. Continue":

1. Draw each fence segment colored by its racking tier:
   - **Standard** — yellow (#e8c547 or similar)
   - **Rackable** — blue (#4a8db7)
   - **Heavy-rack** — red (#c2410c — same as accent, or a hazard red)
2. Place icons at each post location:
   - Flat cap — simple square
   - Ball cap — circle
   - Finial — small triangle
3. Corner posts circled or star-marked so they stand out from line posts
4. A legend box in a corner of the image:
   ```
   [colored line] Standard runs (no rack needed)
   [colored line] Rackable (up to 6" rise per panel)
   [colored line] Heavy-rack (stepped install)
   [icon]       Flat cap post
   [icon]       Ball cap post
   [★]          Corner post
   ```
5. Total linear feet + corner count in a header on the image.

### Implementation

- [ ] New file `legendOverlay.js` (or similar) — takes the Mapbox snapshot data URL, the `lines[]` with per-segment rackingTier, and the post-cap selection. Returns an annotated data URL.
- [ ] Use a hidden `<canvas>` to composite: draw the Mapbox image, overlay the colored segments + post icons + legend, then `canvas.toDataURL('image/png')`.
- [ ] Integration: in `buildAndComplete`, after building the `data` object, generate the annotated data URL and store it as `data.annotatedSnapshotUrl` (keep the raw Mapbox `mapboxSnapshotUrl` too — don't overwrite).
- [ ] In `DesignReviewPage.js` — use `annotatedSnapshotUrl` if present, fall back to `snapshotDataUrl`.
- [ ] In `QuoteBuilder.js` sidebar — same priority.
- [ ] In `QuoteStep6_Review.js` checkout confirmation card — prominently display the annotated snapshot with a caption: "This is the fence we'll manufacture. Review carefully — this is what your order is built against."
- [ ] Tests: mock `lines` + `postCap`, generate overlay, assert the canvas has the expected data URL structure (prefix `data:image/png;base64,`, length > 10000).
- [ ] Commit: `feat(draw): annotated legend overlay on final fence sketch`

---

## Task 8: Other UX improvements worth considering

**Sarah asked: "let me know any other things we should do for UX."**

Proposals for discussion before implementation:

- [ ] **Persistent "Save for Later" email capture** — currently a small link. Promote it to always-visible during the QB flow so users who bail can be followed up with.
- [ ] **Inline price update** — as the user changes any config in the QB, the price estimate in the left sidebar should update live (not just on step advance). Currently buyers might not realize that switching from Flat Cap to Ball Cap affects the price.
- [ ] **"Why this matters" hints on each row** — e.g., next to "End Points = 2", a tooltip saying "An end post caps each end of your fence. Usually 2 for a simple run, 1 if one side connects to an existing structure."
- [ ] **Unit toggles** — display Linear Feet in both ft AND meters (international buyers might find the ft-only display awkward). Low priority for US-only ads.
- [ ] **Shipping zip → estimate** without requiring full address — collect just the zip on QB step 4, estimate freight, only ask for full address at checkout. Reduces form friction.
- [ ] **Phone support ribbon** — "Call (855) FENCE-30 to talk to a rep about your order" persistent at the bottom of QB — since Grandview is D2C phone-only support.
- [ ] **Breadcrumb back to Design Review** — right now the QB's back button returns step-by-step. Add a "← Back to Design Review" link for users who want to re-draw.
- [ ] **Auto-save draft quote to email** — after step 3, offer to email the current quote as a resume link. Captures a lead even if they don't finish.
- [ ] **Comparison vs GreatFence** — a small "$X less than GreatFence" banner on the Review page if competitive (user memory references this positioning).

Discuss each with Sarah before implementing; several are business-model decisions.

---

## Task 9: E2E Playwright test harness (so this doesn't happen again)

Sarah's criticism: "This stuff should have been caught by you."

She's right. The prior E2E walkthrough verified visible UI but didn't audit data pass-through. Build a permanent Playwright test that walks the whole flow with every option set, and asserts each option survives to the Review step + final payload.

- [ ] New file `e2e/full-order-audit.spec.js`:
  - Clear gv_ localStorage
  - Walk the wizard with: Front Yard, Vanguard (spear style so finials show), Textured Bronze, Ball Cap, Tri-Finial, Circles + Butterflies accents, pro spacing
  - Enter a residential address that Regrid DOES match (find one in the 30-day trial area — test)
  - Answer "Some sections slope"
  - Draw 6 vertices with 2 short segments and 1 long
  - Click a per-segment dropdown to override one section to "Heavy Rack"
  - Click "Start new line", drop 3 more vertices
  - Open estimate popup, close, advance
  - In QB: confirm sidebar shows every option, confirm Review card shows every option, confirm `window.__DRAW_TOOL_DATA__.lines.length === 2`, confirm each line has per-segment tiers, confirm `annotatedSnapshotUrl` exists and starts with `data:image/png`
  - Submit mock and confirm the final payload has every field
- [ ] Wire into CI (Cloudflare Pages preview run after each push).
- [ ] Commit: `test(e2e): full-order data-pass-through audit (prevents silent field drops)`

---

## Known state at start of session

- Parcel-proxy + epqs-proxy deployed with CORS fixed, REGRID secret set. ✅
- 12 code commits landed this session: see `git log --oneline b2cf7ae..8caf231`. All tested (113/113 passing), all pushed.
- `.env.local` at repo root has `CLOUDFLARE_API_TOKEN` so wrangler deploys don't need re-auth.
- Known issue still in place: URL-hash color-index drift (wizard writes `color=1` for Textured Bronze, configurator interprets `color=1` as Gloss Bronze). Patched at QB read layer in 8caf231, but 3D fence preview in /studio after wizard navigation will still briefly flash the wrong color. Root-cause fix is a color-index normalizer in app.js URL hash parser — deferred.
- Multi-line draw (P4.1–P4.3) landed but not yet battle-tested with real user draws. Watch for bugs.
- `gv_wizard_state` full unification deferred (not needed for ads).

## Verification ritual per commit

Before committing ANY fix in this plan:

1. Unit tests pass (`npx vitest run`)
2. Webpack builds cleanly (`npx webpack --mode production`)
3. Full data-pass-through audit: seed every field, render QB, confirm every field displays, check `__DRAW_TOOL_DATA__` has every field.
4. Playwright walkthrough on preview (after Pages rebuilds) with screenshots saved to `.playwright-mcp/ship2-<task>-*.png`
5. Commit message is exact (matches plan), one commit per fix, Co-Authored-By footer present.
