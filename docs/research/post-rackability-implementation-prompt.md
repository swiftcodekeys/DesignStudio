# Implementation Prompt — Post & Rackability + Instant Quote Readiness

**Paste this prompt into a fresh Claude Code session when ready to implement. Everything the implementer needs is in this file or in `docs/research/post-rackability-research.md` + `docs/research/how-to-measure-yard-for-fence-guide.md`.**

---

## Prompt begins

You are implementing the post calculation, rackability, and instant-quote readiness for Grandview Fence's online quote tool. This is real customer-facing code. Sarah (the owner) reviews every order through the **admin CRM app** before it ships to Ultra for production, so the tool does not need to be perfect — it needs to be conservative, transparent, and fast.

**Working directory:** `C:\Users\sarah\Desktop\App Repos\fence-tool` — this is the ONLY correct directory for the customer-facing tool. The admin CRM lives at `C:\Users\sarah\Desktop\grandview-quote-system\admin-app` and is deployed at `grandview-admin.pages.dev`. Do not work in `Testing-VS code\designstudio\...` or `Downloads/.../designstudioworkingmvp`. Those are stale.

**Read first (in order):**
1. `CLAUDE.md` in this repo — MANDATORY rules including Ultra-is-source-of-truth and one-fix-one-commit.
2. `journal.txt` — current 100-line rolling summary.
3. `docs/research/post-rackability-research.md` — the research that motivated this work.
4. `docs/research/how-to-measure-yard-for-fence-guide.md` — the customer-facing guide this tool links to.
5. `QUOTE_ENGINE_SPEC.md` and `QUOTE_FUNNEL_SPEC.md` for existing quote flow.
6. `docs/ultra-product-specifications.md` — Ultra's spec data. Do NOT re-scrape, use this as source of truth.
7. The "What's Already Built" inventory in this file — **critical** to read before writing any code, because a lot of this is half-implemented already.

**Do NOT touch:**
- `gate_tool/js/ultra_dsg_min.js`
- Any file in `gate_tool/m/`, `gate_tool/t/`, `gate_tool/th/`
- `SPATIAL_TRUTH.json`, `spatialConstants.js`

---

## Goal

Ship an instant-checkout quote flow where:
- Customer draws fence line on a satellite map (or skips to a calculator form)
- Tool generates a conservative quote they can pay immediately
- Sarah reviews each order in the **admin CRM** within 24 hours before sending to Ultra production
- The tool is wrong in the customer's favor (over-quotes, refunds on review) — it never under-quotes and requires upcharge calls

---

## What's Already Built (READ BEFORE CODING)

Scanned 2026-04-16. File paths + line numbers below. **If you start writing code that duplicates any of this, stop and reread.**

### Customer-facing fence-tool repo

**`DrawYardView.js`**
- Lines 129–146: `getElevationsForPoints()` — Google `ElevationService`, array in, `{elevation, resolution}` out.
- Lines 148–158: `classifySlope()` → `'flat' | 'gentle' | 'steep' | 'steps'` (6"/20"/36" cutoffs per panel).
- Lines 851–913: auto-detect state machine — on button click writes segment-level `slope`, `autoDetected`, `elevChange` into `line.segments[si]`.
- Lines 933–952: per-segment manual override UI (length + slope).
- Lines ~1533: location hydrates from `gv_bridge_location` (Task 1 already shipped).

**`QuoteStep2_Layout.js`**
- Lines 23–27: `TERRAIN_OPTIONS` = `flat | sloped | mixed` (with Phosphor icons, help copy).
- Lines 29–33: `RACKING_TIERS` = `standard | rackable | heavy-rackable` (each with desc copy).
- State fields already in use: `data.terrain`, `data.rackingTier`, `data.slopeMethod` (`racked | stair-stepped`), `data.runs` (per-run terrain in advanced mode).
- Lines 273–278: privacy-panels-can't-rack warning.
- Lines 329–332: puppy + butterflies/scrolls → limits to Standard tier.

**`priceCalculator.js`** (NEW pricing path)
- Line 163: conditional `rackingTier && rackingTier !== 'standard' && !== 'stair-step'`
- Line 164–165: line item `Double-Punch Posts (racking)` at `DOUBLE_PUNCH_PER_POST = $4.75` (constant in `priceData.js:44`).
- Line 164: reads `config.slopedPostCount || totalPosts` — **the `slopedPostCount` field is never set anywhere; this is dead code that always falls through to `totalPosts`.**

**`pricingEngine.js`** (LEGACY pricing path — parallel to priceCalculator.js)
- Lines 315–360: segment-based racking; computes `slopedFt` from `config.segments` where `slope !== 'flat'`, then `slopedPosts = Math.ceil(slopedFt / PANEL_LENGTH_FT) + 1`. Returns `hasSlope: boolean`.
- **Two pricing systems coexist. Verify which one runs in production before touching either.**

**`QuoteStep6_Review.js`**
- Line 148: displays `data.terrain` (Flat/Sloped/Mixed).
- Line 158: displays `data.racking` truthy flag.
- Double-punch charge appears only in the itemized table (not called out).

**`wizardState.js`**
- DEFAULT_ZONE_CONFIG (lines 6–12): no `terrain_flag` / `slope_flag` / EPQS field yet — those need to be added.

**`WizardShell.js`**
- `captureSnapshot()` ~line 296. Saves `gv_design_snapshot` localStorage + `gv_saved_design.snapshotDataUrl`.
- Pool question inline ~line 710.
- `submitQuoteToCRM()` — search here for the CRM POST; EPQS fields need to be added to this payload.

### Admin CRM app (`C:\Users\sarah\Desktop\grandview-quote-system`)

- **Not a git repo yet.** `git init` + initial commit before any changes land, or work will be lost.
- `admin-app/src/` holds the React UI. Lead cards render from `useLeads.js`; check `LeadList`, `LeadCard`, `QuoteDetail` for where to add a yellow "possible slope" indicator.
- Worker at `worker/src/index.js`:
  - `rowToLead()` lines 76–109 — maps D1 row to API shape.
  - POST /leads INSERT at lines 138–174.
  - Columns include `zones` (JSON), `grand_total`, `legacy_data` (JSON catch-all).
  - **No `terrain_flag` column yet — migration needed.** Any unmapped field currently flows into `legacy_data`, so you could stuff EPQS data there as a first pass, but a dedicated column makes the filter/badge UI trivial.
- Live at `grandview-admin.pages.dev`. Worker at `grandview-crm.sarah-13a.workers.dev` (D1: `grandview-crm`).

### Email worker

- `workers/email-worker/worker.js`, `buildZoneSectionHtml()` lines 193–200.
- Only renders subtotal + items per zone. No terrain/slope/racking field referenced.
- Add an "EPQS check / customer selection" row here (especially a flagged row when they disagree).

### Known mess / contradictions

1. **`slopedPostCount` is dead code** — referenced in `priceCalculator.js:164`, never written anywhere. Either wire it up from EPQS/draw-tool slope data or delete the fallback.
2. **Two pricing engines** (`priceCalculator.js` and `pricingEngine.js`) with slightly different racking logic. Confirm which one `QuoteStep6_Review → calculateZoneQuote` actually calls before editing.
3. **`rackingTier` and `slopeMethod` are independent** — user can select `rackable` tier + `stair-stepped` method, which is contradictory. No enforcement.
4. **Draw tool segment slope data never reaches QuoteStep2** — one-way flow, so the racking tier selector never auto-defaults from what the customer just drew.
5. **Admin app is not git-tracked.** `git init` is a prerequisite for any admin-app change.

---

## Phased scope

### Phase 1 — Ship in the next 1–2 weeks (unblock ads)

**P1.1 — Replace Google Elevation with USGS EPQS (backend-only, invisible to customer)**

- Endpoint: `https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Feet&wkid=4326&includeDate=false`
- Free, no API key, no auth.
- **Replace the Google fetch in `DrawYardView.js:129–146`** (`getElevationsForPoints`). Keep the function signature identical so the rest of the draw-tool machinery (classifySlope, segment annotation at 851–913) keeps working.
- Sample one point per planned post (every 6 ft along the line) and fire parallel EPQS requests via `Promise.all`.
- For each pair of adjacent points, compute elevation delta in feet. That is your per-panel rise estimate.
- EPQS response includes a `dataSource` field — check for `"3DEP 1m"` (lidar, trustworthy) vs `"1/3 arc-second"` (10m fallback, don't trust at this scale). Record which per point.
- Output a single classification for the whole drawn run (use `classifySlope`-compatible values plus a confidence flag):
  - `"flat"` — all points used 1m lidar AND all deltas < 3" → confidence HIGH
  - `"sloped"` — all points used 1m lidar AND max delta 3–30" → confidence HIGH
  - `"steep"` — all points used 1m lidar AND max delta > 30" → confidence HIGH
  - `"unknown"` — any point used 10m fallback OR request failed → confidence LOW
- **Phase 1: classification is NOT shown to the customer.** It is logged to the admin CRM only.
- Error handling: EPQS timeout or error → classify as `"unknown"`, don't fail the quote.

**P1.2 — Rackability toggle consolidation (simplify what's there, don't rebuild)**

QuoteStep2_Layout already has `TERRAIN_OPTIONS` + `RACKING_TIERS` + `slopeMethod`. The surface area is too wide. Collapse it for Phase 1:

```
☐ My yard has slope — add Rackable posts throughout (+$4.75 × post count)
   [Not sure? See how to measure ›] ← link to /how-to-measure-your-yard
```

Plus a second, collapsed-by-default toggle:

```
☐ My yard has significant slope (>20" drop per panel anywhere) — add Heavy Rack posts
```

- The top toggle maps to `rackingTier = 'rackable'`. The bottom maps to `rackingTier = 'heavy-rackable'`. Default both OFF.
- Hide the `slopeMethod` selector behind an "Advanced" disclosure — it's a pro-install concern and confuses DIY customers. Keep the state field; just don't surface it by default.
- Keep the privacy-panel-can't-rack warning and the puppy+accent limit.
- Keep the `TERRAIN_OPTIONS` dropdown for now (it feeds warnings in QuoteStep4_Extras:66), but label it "My yard is mostly:" to make it clear it's an overview, not a pricing selector.
- Pricing math already works — `priceCalculator.js:163–166` handles `rackingTier !== 'standard'`. Do NOT duplicate the math.
- **TODO in code:** verify Heavy Rack upcharge with Sarah — may be higher than $4.75. Placeholder constant `HEAVY_RACK_PER_POST` in `priceData.js`.

**IMPORTANT — verify with Ultra rep before publishing:**
- Does Heavy Rack (triple-punched) post show visible holes when installed level?
- Is Grandview's upcharge the same for double vs triple punch?

**P1.3 — Footage padding**

Multiply the computed linear footage by 1.05 (5% pad) before computing panel count. Round panel count UP to nearest even number. Post count follows standard formula (panels + 1 per run + corner adjustments).

**Where:** inside `priceCalculator.js` / `pricingEngine.js` panel-count computation. Confirm which one runs in prod first.

Do NOT show "padded" language to the customer. It's internal.

**P1.4 — Six homeowner-validation touchpoints**

Add these strings to the UI. **Attorney review required on #4 before launch** — add a blocking TODO in the code.

1. **Draw tool start banner:**
   > You'll mark your fence line on this map. Accuracy depends on your drawing — we'll confirm total feet and slope before your order goes into production.

2. **Slope toggle tooltip/help link:**
   > Only you know how sloped your yard is. [See how to measure ›]
   Link target: `/how-to-measure-your-yard` (new route, renders guide).

3. **Quote summary info card:**
   > This quote assumes your measurements are accurate. Slope, obstacles, and utilities are yours to verify before install.

4. **Checkout page required checkbox (attorney review required):**
   > ☐ I confirm the measurements, slope, gate placements, and site conditions I provided are based on my own inspection of my property. I understand:
   > - Grandview reviews every order within 24 hours but the accuracy of what I submitted is my responsibility.
   > - Ultra Aluminum fence is manufactured to order and cannot be returned for measurement errors or slope misclassification.
   > - Site conditions I haven't disclosed (buried utilities, rock, tree roots, slope beyond what I reported, property-line disputes, HOA restrictions) may affect install feasibility and are my responsibility to verify.
   > - Grandview's review is a courtesy double-check and does not constitute a professional site survey.

5. **Order confirmation email:**
   > **Next steps** — Grandview reviews every order within 24 hours. If your site conditions differ from the quote (slope, obstacles, utility lines), we'll reach out before production starts.

6. **How-to-measure guide Section 1** — already drafted, verify present.

Sarah should also add custom-goods non-return language to Terms of Service per FTC rules (separate task).

**P1.5 — Calculator-only bypass (no map draw required)**

Add an "I already know my measurements" link on the QuoteBuilder entry that skips the map draw:
- Linear feet
- Number of 90° corners
- Number of end posts (default 2)
- Terrain toggle (reuse QuoteStep2 component)
- Gate count/type

Feeds the same pricing engine. No map, no EPQS. Captures the "I just need 100 feet of 4' flat top" customer.

**P1.6 — Contact gate: show price freely, gate checkout**

Show the quote price with no contact gate. Collect name/email/phone/address at checkout. This matches the `americasfencestore.com` model at $3M+/yr scale. Do NOT require contact to use the draw tool or see the quote summary.

**P1.7 — How-to-measure route/page**

Create `/how-to-measure-your-yard`. Render `docs/research/how-to-measure-yard-for-fence-guide.md` as styled HTML. Use `TopNav` + `BacklinksFooter` for consistency. Open in a new tab from the slope toggle.

Before publishing, resolve Ultra spec discrepancies in the guide's Verification Notes:
- Standard rack: 4" (Ultra FAQ) vs 6" (FenceTown). Default to 4" until Sarah confirms.
- Gate opening offset (+¼"?)
- Post spacing (72" vs 72.5" center-to-center)
- Pet-panel racking halves — confirm Ultra's current spec

Replace `[Grandview contact]` placeholder with actual contact info.

**P1.8 — Surface EPQS + racking to Sarah's review (admin CRM, not a new dashboard)**

There is NO separate admin dashboard. Sarah uses:
1. The existing **admin CRM app** at `grandview-admin.pages.dev` (source: `C:\Users\sarah\Desktop\grandview-quote-system\admin-app`).
2. Backup: sales email from Cloudflare email worker + Google Sheets via GAS webhook.

**Do first (blocker):** `git init` the `grandview-quote-system` repo and commit the current working tree. The admin app has uncommitted fixes from 2026-04-15 (PricingEngine normalizeItem, ZoneCard coercion, QuoteDetail safe fmt, PO generator format, worker PO-by-lastname). Commit those first, then build on top.

**Customer-facing payload changes (`WizardShell.js` `submitQuoteToCRM()`):**
- Add `epqs_classification` (`flat` | `sloped` | `steep` | `unknown`)
- Add `epqs_confidence` (`high` | `low`)
- Add `epqs_max_delta_in` (numeric, max per-panel delta in inches)
- Add `terrain_flag` (`'possible_slope'` when EPQS says sloped/steep OR when any 6-ft segment has >6" rise) — per user's explicit ask.
- `rackingTier` already goes through in `zones` JSON; no schema change needed there.

**CRM worker (`grandview-quote-system/worker/src/index.js`):**
- Add a D1 migration for two new columns: `terrain_flag TEXT`, `epqs_data TEXT` (JSON blob with classification/confidence/max_delta). Don't over-engineer — JSON blob is fine.
- Update `rowToLead()` (lines 76–109) to include them in the API response.
- Update POST /leads INSERT (lines 138–174) to write them. Fall back to `legacy_data` for anything unmapped.

**Admin UI (`admin-app/src/components/LeadCard.jsx` or equivalent — find the exact file):**
- Yellow pill indicator on the lead card when `terrain_flag === 'possible_slope'`. Copy: "Possible slope — verify".
- Filter in the lead list: "Show only: Possible slope".
- In the lead detail / QuoteDetail view: a "Terrain / EPQS" section showing classification, confidence, max delta, and whether customer selected Rackable. **Bold red row when EPQS says sloped but customer left toggle off.**
- Reuse existing badge styling if present; do not invent a new component library.

**Email worker (`workers/email-worker/worker.js` `buildSalesEmailHtml` and `buildZoneSectionHtml`):**
- Append a "Terrain check" row showing EPQS classification vs customer rackability toggle.
- **Bold red warning row** when they disagree: "⚠ EPQS detected slope but customer did not select Rackable — verify before production."
- GAS payload already mirrors `submitQuoteToCRM` — new fields flow through automatically.

### Phase 1 acceptance criteria

Ship when all are true:
- Customer can draw, see a quote, check out with the checkbox.
- Admin CRM shows the EPQS classification, rackability selection, and a yellow "possible slope" pill on lead cards when `terrain_flag === 'possible_slope'`.
- Admin CRM filter: can list only leads with a slope flag.
- Disagreement between EPQS and customer shows a red warning in sales email AND on the lead detail page.
- Rackability upcharge applies correctly to all posts when toggle ON (verified against known test cases).
- How-to-measure guide renders at `/how-to-measure-your-yard`.
- Attorney has signed off on checkout checkbox language.
- Admin-app repo is git-tracked.
- No regressions in existing `priceCalculator.js` / `pricingEngine.js` outputs for test fixtures.
- End-to-end test: draw → quote → checkout → sales email → admin CRM lead view, run against a known-sloped yard and a known-flat yard.

### Phase 2 — Footage Accuracy UX Polish (Week 2–3)

Only start after Phase 1 is validated with real traffic.

**P2.1 — Live draw feedback:** live length at cursor, per-segment labels at midpoint, panel tick marks every 6 ft, draggable vertices with live-updating labels, undo/redo. Use `google.maps.geometry.spherical.computeLength()`.

**P2.2 — Sanity checks (soft warnings, not blockers):**
- >500 ft → "That's a large project — confirm."
- <20 ft → "Very short — confirm."
- Self-intersecting line → "Your line crosses itself — did you mean this?"

**P2.3 — "Does this look right?" confirmation:** satellite zoom + stats block (padded feet, panels, posts, gates) + "Yes, this is my yard" / "No, let me redraw".

**P2.4 — Photo/sketch upload at checkout:**
- Optional file upload. Accept JPEG/PNG/HEIC/PDF. Max 20 MB, up to 10 files.
- Store in Cloudflare R2. Reference from the lead record.
- **Admin CRM must surface photos in QuoteDetail view** (this is where "use the existing admin app" really pays off — build on the same lead detail page).

**P2.5 — Promote EPQS classification to customer-visible:**
After draw, before quote:
- HIGH confidence flat: "We checked USGS elevation data — your yard looks flat. Rackability not needed."
- HIGH confidence sloped: "We detected slope. We've added Rackable posts (+$X) — uncheck below if your yard is actually flat." Pre-check the toggle.
- HIGH confidence steep: "We detected significant slope. We've added Heavy Rack posts (+$X). If any section exceeds 36" drop over 6 feet, please contact us."
- LOW confidence: "We couldn't auto-detect slope. If your yard has any, check the box below."

Always keep the toggle visible and customer-controllable. Never hide it.

**P2.6 — Wire draw tool segment slope → QuoteStep2 (close the one-way flow)**
Currently `DrawYardView` populates `line.segments[si].slope` but QuoteStep2 never reads it. Pass the aggregated slope summary in via `props.drawToolData` (already plumbed — see `QuoteBuilder.js:103`) and auto-default `rackingTier` from it. Customer override always wins.

### Phase 2 acceptance criteria

- Draw UX feels alive (live length + labels + panel markers).
- Customers confirm their drawing before seeing the quote.
- Photo upload round-trips through R2 to admin CRM QuoteDetail.
- EPQS classification pre-sets the toggle; customer override is respected.

### Phase 3 — GreatFence-style per-panel picker (Week 4–6, only if data says needed)

**Gate on real data from Phase 1–2:**
- <15% of orders have slope → skip Phase 3 entirely.
- 15–30% → implement.
- >30% → priority.

**P3.1 — Per-panel expansion under the toggle:** collapsible "Customize per panel" with a dropdown per panel (Flat / Sloped / Very sloped). Default to whatever the blanket toggle picked; customer overrides individual panels.

**P3.2 — Post SKU logic:** each interior post uses MAX tier of adjacent panels. End/gate posts use the tier of their single adjoining panel. This is where `slopedPostCount` should finally get wired — compute it here.

**P3.3 — Illustrated help:** inline photos or line drawings next to each dropdown. Reuse images from the how-to-measure guide.

**P3.4 — Default-all button:** "Apply same tier to all panels: [Flat] [Sloped] [Very sloped]".

### Phase 3 acceptance criteria

- Power users can override per panel.
- 90% of customers never expand the picker (measure — if the default toggle is enough, don't force the UI).
- MAX-of-adjacent rule verified against a hand-computed test case.

---

## Deferred / out of scope

- Parcel boundary overlay (Regrid API). Worth doing when Phase 2 is solid. Separate ticket.
- AR mobile slope measurement. v3+.
- Custom 3D terrain rendering. Unreliable at this scale.
- Google Elevation as EPQS fallback — **don't add.** EPQS's 10m fallback IS the fallback.
- Reconciling `priceCalculator.js` vs `pricingEngine.js` into a single module — flagged as a known mess, but not blocking. File a separate refactor ticket after Phase 1 ships.

---

## Non-goals / explicit do-nots

- Do NOT auto-detect slope and silently apply it without showing the toggle. Customer agency is load-bearing.
- Do NOT show the customer raw elevation numbers or confidence percentages. Only the categorical classification.
- Do NOT try to detect gates, obstacles, or property lines from the map draw. Customer inputs only.
- Do NOT optimize Ultra renderer code as part of this work. Separate ticket if a bug appears.
- Do NOT change Ultra's branding or spec values.
- Do NOT skip the attorney review on the checkout checkbox.
- Do NOT build a separate admin dashboard. The admin CRM at `grandview-admin.pages.dev` is the review surface. Extend it.
- Do NOT duplicate any code flagged in "What's Already Built". Consolidate.

---

## Commit discipline

- One fix = one commit. No batching.
- Message format: `feat(quote): EPQS classification backend` / `fix(quote): rackability upcharge applies to gate posts` / `chore(docs): add how-to-measure route`.
- `git init` `grandview-quote-system` and commit the current uncommitted fixes **before** adding any new admin-app work.
- Never skip git hooks.
- Verify against the Ultra live tool at https://www.ultrafence.com/design-studio/gates/index.html when touching anything rendering-adjacent.

---

## Verification checklist before Phase 1 ship

- [ ] `git log --oneline -3` confirms fence-tool repo is on the right branch.
- [ ] `grandview-quote-system` is a git repo with a clean commit history; the 2026-04-15 PO/pricing fixes are committed.
- [ ] EPQS endpoint returns sensible data for Sarah's address.
- [ ] Quote with slope toggle OFF: post count × $4.75 = $0 added.
- [ ] Quote with slope toggle ON: post count × $4.75 added correctly, quote math re-computes.
- [ ] Checkout checkbox blocks submit when unchecked.
- [ ] Order confirmation email fires with the "next steps" language.
- [ ] Admin CRM lead card shows yellow "Possible slope — verify" pill when `terrain_flag === 'possible_slope'`.
- [ ] Admin CRM filter "Show only: Possible slope" works.
- [ ] Admin CRM lead detail shows EPQS section; bold red row when EPQS/customer disagree.
- [ ] Sales email includes the terrain check row; disagreement renders in bold red.
- [ ] How-to-measure page renders at `/how-to-measure-your-yard` with working internal navigation.
- [ ] Attorney review completed for checkout checkbox.
- [ ] Ultra spec discrepancies in the how-to guide verified with Ultra rep.
- [ ] End-to-end test: draw → quote → checkout → sales email → admin review. Run against a known-sloped yard AND a known-flat yard.
- [ ] No regressions in `priceCalculator.js` / `pricingEngine.js` outputs for existing test fixtures.

Ship only when all boxes are checked. This is production code for real customer money.

---

## Prompt ends
