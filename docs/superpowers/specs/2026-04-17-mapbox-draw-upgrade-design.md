# Mapbox Draw Upgrade — Design Spec

**Date:** 2026-04-17
**Branch:** `feat/quote-redesign` (stay on existing branch — do NOT cut a new one)
**Owner:** Sarah / Grandview Fence LLC
**Status:** Approved for implementation planning

---

## 1. Problem & Goal

### Problem
The current customer-facing fence draw tool (`DrawYardView.js`, 1,869 lines) is a freehand Google Maps line-drawing experience. Mobile drawing is broken, there is no property-line assistance, Google Elevation reports sloped yards as flat, slope data does not reach the pricing engine, and there is no checkout. At the target $3,500 AOV / 238 orders per month, every friction point costs ~$3,500 in revenue.

### Goal
Replace the Google Maps freehand draw with a Mapbox GL JS satellite-imagery tool that matches Visual Fence Pro's UX quality (click property sides to select fence runs, globe-to-address flyTo animation, per-segment elevation intelligence), adds EPQS-driven rackability pre-fill, adds Stripe auth-then-capture checkout with BNPL, and surfaces everything to Sarah's admin CRM for 24-hour review.

### What we are NOT changing
- 3D renderer (`GateRenderer.js`, `FenceRenderer.js`, `UnifiedCanvas.js`) — untouched.
- Six-step wizard (`QuoteBuilder.js`, `QuoteStep1_Style.js` through `QuoteStep6_Review.js`) — untouched except for pre-fill plumbing.
- Pricing engines (`priceCalculator.js`, `pricingEngine.js`) — only wire rackability data into the existing `DOUBLE_PUNCH_PER_POST = $4.75` surcharge logic. No new pricing math.
- Quiz, landing page, Ultra spec constants, admin CRM lead detail structure.

---

## 2. Non-Goals

- No native mobile app.
- No AR / photo simulation / WebXR (Phase 2+ per the $10M master plan).
- No refactor of `priceCalculator.js` vs `pricingEngine.js` duplication (documented as tech debt, not blocking).
- No custom 3D terrain rendering beyond Mapbox's built-in terrain DEM visual tilt.
- No Google Elevation fallback for EPQS — EPQS's 10m fallback is the fallback.

---

## 3. Architecture Overview

### New module: `MapboxDrawView.js`
Replaces the top-level draw screen. Same component contract as `DrawYardView.js`:
- Receives the same `onComplete(drawToolData)` prop from `WizardShell.js`.
- Emits the same `drawToolData` shape downstream to `QuoteStep2_Layout` (already plumbed via `QuoteBuilder.js:111`).
- Extended shape adds `epqsClassification`, `epqsConfidence`, `segments[].color`, `segments[].rackingTier`.

### New Cloudflare Workers
- `workers/parcel-proxy/` — `/api/parcel` endpoint, reads `REGRID_API_KEY` secret, proxies to Regrid.
- `workers/stripe-checkout/` — `/api/checkout`, `/api/capture`, `/api/webhook` endpoints. Reads `STRIPE_SECRET_KEY` secret.

### Feature flag
`process.env.USE_MAPBOX_DRAW === 'true'` in `webpack.config.js`. `WizardShell.js` conditionally imports `MapboxDrawView` or `DrawYardView`. Default: false until Phase 1 E2E passes. Once validated, remove the flag and delete `DrawYardView.js` in a separate commit.

### Data flow
```
Address input
   ↓  (Mapbox Geocoder)
Geocode → { lat, lng }
   ↓
Globe flyTo animation (projection: 'globe', satellite-streets-v12, zoom 20)
   ↓
POST /api/parcel  ──► Worker ──► Regrid API (with REGRID_API_KEY)
   ↓                                ↓
   GeoJSON polygon  ◄────────────────
   ↓
Split polygon into sides w/ compass labels ("Side 1 (North)")
   ↓
Customer clicks sides OR enters Manual Mode
   ↓
Drawn line → EPQS call (parallel, one per 6-ft interval)
   ↓
Per-segment classification { flat | sloped | steep | unknown } + confidence
   ↓
Color-assign each segment (green/blue/orange/magenta/cyan/yellow)
   ↓
Slope popup: "Does your yard have slope?"
   ↓
Per-segment rackingTier cards (if user says "some slope" or "very sloped")
   ↓
drawToolData { totalFeet, corners, ends, segments[], epqs*, mapboxSnapshotUrl }
   ↓
QuoteStep2 (pre-fills from drawToolData)
   ↓
... QuoteStep 3-6 unchanged ...
   ↓
/checkout page (Step 7 replacement via full-page route)
   ↓
POST /api/checkout → Stripe auth → customer redirected to confirmation
   ↓
POST /api/webhook ← Stripe event → forward to admin CRM + email worker
   ↓
Sarah reviews in admin CRM (within 24h)
   ↓
POST /api/capture → Stripe partial capture → Ultra order placed
```

---

## 4. Phases

### Phase 0 — Foundations (1-2 days)
Blocks all other work.

**0.1 Admin CRM git-tracking**
- `cd C:\Users\sarah\Desktop\grandview-quote-system`
- `git add -A && git commit -m "chore: initial commit — admin CRM app"`
- Create GitHub repo `swiftcodekeys/grandview-crm` (private)
- `git remote add origin ...` and `git push -u origin master`
- Document deploy path in `KNOWN_ISSUES.md` replacement `README.md`

**0.2 Feature flag plumbing**
- Add `USE_MAPBOX_DRAW` to `webpack.config.js` (default false).
- Add `USE_MAPBOX_DRAW: JSON.stringify(process.env.USE_MAPBOX_DRAW === 'true')` via `DefinePlugin`.

**0.3 Mapbox + Regrid secret setup**
- Create `workers/parcel-proxy/wrangler.toml`.
- `wrangler secret put REGRID_API_KEY` (existing secret from user).
- `wrangler secret put MAPBOX_ACCESS_TOKEN` (user provides — already has account per memory).
- Client reads Mapbox token from build-time env.

**0.4 Tech debt register**
- Write `TECH_DEBT.md` at repo root, document:
  - `priceCalculator.js` vs `pricingEngine.js` duplication
  - `DrawYardView.js` 1,869-line monolith (deleted end of Phase 1)
  - Mixed `var`/`let`/`const` across codebase
  - `React.createElement` vs JSX inconsistency
  - Dead `slopedPostCount` code path in `priceCalculator.js:164`

**Acceptance:**
- Admin CRM repo pushed to GitHub, deployment unchanged.
- Feature flag flips between old and new draw view without errors.
- Mapbox + Regrid secrets accessible to their respective Workers.
- `TECH_DEBT.md` committed.

---

### Phase 0.5 — Pre-flight Bug Cleanup (1 day, each fix = own commit)

Independent of Mapbox work. Ship each as its own commit per repo's one-fix-one-commit rule. Low-risk, high-value housekeeping before the bigger changes start landing.

**0.5.1 — Hoist `grade` and `installPlan` into CRM payload**
- **Symptom:** `data.grade` (Step 1 Style & Config) and `data.installPlan` (Step 5 Shipping) submit as empty strings in `submitQuoteToCRM()`.
- **Root cause:** Both fields live in `QuoteBuilder`'s local `data` state but are not included in the CRM payload construction at `WizardShell.js:~660`.
- **Fix:** Add `grade` and `installPlan` to the payload object in `submitQuoteToCRM()`. Confirm they reach the Review page display first.
- **Test:** Submit a quote with `grade: 'commercial'` and `installPlan: 'diy'`; verify both appear in the admin CRM lead detail.

**0.5.2 — Fix Review page "End Posts: 0" display bug**
- **Symptom:** Review summary shows `End Posts: 0` when Step 2 Post Summary had `2`.
- **Root cause:** Cosmetic — `QuoteStep6_Review.js` mis-reads the Layout's `endPosts` field (likely wrong key name — could be `ends` vs `endPosts`).
- **Fix:** Audit `QuoteStep6_Review` rendering of layout data, align key names with what `QuoteStep2_Layout` writes (`ends`, not `endPosts`).
- **Test:** Configure a layout with 2 end posts in Step 2; verify Review displays `End Posts: 2`. Payload already correct — this is display-only.

**0.5.3 — Verify "Order Now" button submit path**
- **Symptom:** "Order Now" button on Step 6 may not have the same fetch wiring as "Submit Quote Request"; payload with `submitAction='order'` was not re-verified.
- **Fix:** Trace `Order Now` onClick → confirm it calls the same `submitQuoteToCRM('order')` path. If it skips any step the quote path runs, align them.
- **Test:** Click "Order Now" end-to-end, verify admin CRM lead is created with `intent: 'order'`.

**0.5.4 — React Router v7 future flags**
- **Symptom:** Harmless but noisy warnings about v6 → v7 deprecation.
- **Fix:** Two lines in the `BrowserRouter` / `RouterProvider` opts — add `future={{ v7_startTransition: true, v7_relativeSplatPath: true }}`.
- **Test:** Console is clean of router future-flag warnings on app load. No behavior change.

**Phase 0.5 Acceptance:**
- Four commits land, each with a focused message (`fix(wizard): hoist grade/installPlan to CRM payload`, etc.).
- No regressions in existing flows.
- Warnings console clean on app load.

---

### Phase 1 — Mapbox Draw Tool Core (7-10 days)
The headline work.

**1.1 `MapboxDrawView.js` — shell + globe flyTo**
- Install `mapbox-gl` (latest v3.x).
- Create `MapboxDrawView.js` with same props/callbacks as `DrawYardView.js`.
- Initialize map: `satellite-streets-v12`, `projection: 'globe'`, initial center `[0, 20]` zoom `1`.
- On address geocoded (via Mapbox Geocoder), `map.flyTo({ center, zoom: 20, pitch: 45, duration: 4000 })`.
- Add Mapbox Terrain DEM source for visual 3D (`mapbox://mapbox.mapbox-terrain-dem-v1`).
- Port the existing `gv_bridge_location` hydration from `DrawYardView.js:~1533` (now `WizardShell.js:1081`).

**1.2 Parcel proxy Worker**
- `workers/parcel-proxy/src/index.js`:
  - `POST /api/parcel { lat, lng }` → Regrid `GET /api/v2/parcels/point?lat=...&lng=...`
  - Returns `{ ok, data: { boundary: GeoJSON, address, parcelId, dataQuality } }`
  - Error handling: Regrid 404 → `{ ok: false, fallback: 'manual' }`; Regrid 5xx → `{ ok: false, retry: true }`.
  - CORS whitelist: staging + prod origins only.
- Deploy as `grandview-parcel-proxy.sarah-13a.workers.dev`.

**1.3 Parcel render + segment generation**
- Fetch parcel on geocode success.
- Render GeoJSON polygon with translucent cyan fill.
- Apply Ramer-Douglas-Peucker simplification for polygons > 60 vertices (VFP pattern; preserves ≤2% perimeter, ≤1% area error).
- Split polygon into sides with compass labels (`Side 1 (North)`, `Side 2 (East)`, etc.).
- Each segment gets a unique color from a six-color palette (`#22C55E`, `#3B82F6`, `#F59E0B`, `#EC4899`, `#14B8A6`, `#A855F7`).

**1.4 Click-to-select + Manual Mode**
- Click any property side → segment becomes part of the fence line (highlight, add to `lines` state).
- "📐 Manual Mode" button exits parcel mode, switches to click-to-place vertex drawing (port from `DrawYardView.js`).
- Segments support drag-to-adjust endpoints.
- Fallback: if parcel Worker returns `fallback: 'manual'`, auto-switch to Manual Mode with a toast.

**1.5 EPQS integration (replaces Google Elevation)**
- New module `epqsClient.js`.
- `classifyDrawnLine(segments) → { segmentClassifications, overallClassification, confidence }`
- Endpoint: `https://epqs.nationalmap.gov/v1/json?x={lng}&y={lat}&units=Feet&wkid=4326`
- Sample one point per 6-ft interval per segment, `Promise.all` parallel.
- Per-segment classification using existing `classifySlope()` thresholds (0-6"/6-20"/20-36"/>36").
- Confidence: HIGH if all points used 1m lidar (`dataSource` field), LOW if any 10m fallback or failure.
- Timeout: 5s per request, classify as `unknown` on timeout/error. Never fail the quote.

**1.6 Elevation badges per segment**
- Small floating badge on each drawn segment: `↗ 4.2ft · Moderate` with color (green `flat`, amber `sloped`, red `steep`, gray `unknown`).
- VFP pattern: advisory only, does NOT auto-set rackability (that happens in 1.7).

**1.7 Slope popup + per-segment rackability UI**
New component `SlopePopup.js`. Triggered after draw finalization.

```
"Does your yard have slope?"
[Board-and-Level infographic from assets/slope-guides/measure-slope.png]

○ Mostly flat
● Some sections slope — I'll mark them
○ Very sloped throughout

How to verify:
📹 Watch: How to measure your yard slope
   [YouTube placeholder — TODO: Sarah provides URL]
📄 Read: Full slope measurement guide
   → /how-to-measure-your-yard
```

**Default logic (CRITICAL — user-specified behavior):**
- If customer picks "Mostly flat" → all segments default to Standard. Skip per-segment UI.
- If customer picks "Very sloped throughout" → all segments default to `max(EPQS suggestion, Rackable)`. Show per-segment UI with Rackable pre-filled.
- If customer picks "Some sections slope" → each segment pre-fills from its own EPQS classification:
  - EPQS `flat` → Standard
  - EPQS `sloped` → Rackable
  - EPQS `steep` → Heavy Rack
  - EPQS `unknown` → Standard + "We couldn't auto-detect — please verify" banner on that segment

**Per-segment card UI:**
```
🟢 Back (48 ft · 8 panels)
   [Standard ▼]   [ℹ how to verify]
```

Clicking the dropdown reveals three radio options with the post-options infographic inline:
```
● Standard (0-6" rise)
○ Rackable (6-20" rise)  +$4.75 per post
○ Heavy Rack (20-36" rise)  +$4.75 per post

[Post Options infographic from assets/slope-guides/post-options.png]
```

**Map ↔ sidebar linking:**
- Hovering a segment card pulses that segment's color on the map.
- Clicking a segment on the map scrolls the matching card into view and highlights it.

**1.8 Data contract: `drawToolData` output shape**
```js
{
  totalFeet: Number,         // post-padding footage (auto-draw only)
  rawFeet: Number,           // pre-padding
  corners: Number,
  ends: Number,
  lines: [
    {
      id: String,
      color: String,         // hex
      points: [{lat, lng}],
      segments: [
        {
          index: Number,
          lengthFt: Number,
          color: String,
          compassLabel: String,   // "North", "East", etc.
          epqsClassification: 'flat'|'sloped'|'steep'|'unknown',
          epqsMaxDeltaInches: Number,
          rackingTier: 'standard'|'rackable'|'heavy-rackable',
          customerOverrode: Boolean
        }
      ]
    }
  ],
  slopeAnswer: 'flat'|'some'|'all',
  epqsOverall: 'flat'|'sloped'|'steep'|'unknown',
  epqsConfidence: 'high'|'low',
  mapboxSnapshotUrl: String,   // for admin CRM
  source: 'auto' | 'manual'    // auto = from draw (padded); manual = typed (not padded)
}
```

**1.9 Wire `drawToolData.segments` into pricing**
- `QuoteStep2_Layout.js`: add `useEffect` that pre-fills `data.rackingTier` from `drawToolData.epqsOverall` when component mounts.
- `priceCalculator.js:164`: delete dead `config.slopedPostCount || totalPosts` — always use `totalPosts`. Deferring per-segment SKU differentiation to Phase 3 per the rackability implementation plan.
- `priceCalculator.js:60`: apply 5% padding ONLY when `config._source === 'auto'`. Add `linearFt = Math.ceil(linearFt * 1.05)` guarded by that check.
- Do NOT duplicate the racking math; use existing logic.
- Audit which pricing engine runs via `QuoteStep6_Review → calculateZoneQuote` — assume `priceCalculator.js` per current code; verify during implementation and document.

**1.10 Mobile polish (Phase 1 must work on phones, not Phase 2)**
- Draw mode toggle: floating button "Navigate / Draw" that locks map when editing.
- 44×44px minimum touch targets for vertex handles (64×64 invisible hit area).
- Vertex snapping (to coordinate, to line) — implement ourselves with raw Mapbox click handlers; no Terra Draw dependency.
- Bottom drawer sidebar on viewport < 768px.
- Responsive slope popup: full-screen modal on mobile, centered on desktop.

**1.11 Six CYA touchpoints**
Per the rackability implementation prompt, with touchpoint #1 reworded per Sarah:

1. **Draw tool start banner:**
   > "You'll mark your fence line on this map. It's your responsibility to double-check the math and validate your measurements yourself — we'll verify with you before production, but the measurements you enter are what we build to."

2. **Slope popup + per-segment dropdown help link:** `[ℹ how to verify]` opens `/how-to-measure-your-yard` in new tab.

3. **Quote summary card (QuoteStep6_Review):**
   > "This quote assumes your measurements are accurate. Slope, obstacles, and utilities are yours to verify before install."

4. **Checkout page required checkbox (ATTORNEY REVIEW TODO — blocks launch):**
   > "☐ I confirm the measurements, slope, gate placements, and site conditions I provided are based on my own inspection of my property. I understand:
   > - Grandview reviews every order within 24 hours but the accuracy of what I submitted is my responsibility.
   > - Ultra Aluminum fence is manufactured to order and cannot be returned for measurement errors or slope misclassification.
   > - Site conditions I haven't disclosed (buried utilities, rock, tree roots, slope beyond what I reported, property-line disputes, HOA restrictions) may affect install feasibility and are my responsibility to verify.
   > - Grandview's review is a courtesy double-check and does not constitute a professional site survey."

5. **Order confirmation email** (append to existing `email-worker/worker.js`):
   > "**Next steps** — Grandview reviews every order within 24 hours. If your site conditions differ from the quote (slope, obstacles, utility lines), we'll reach out before production starts."

6. **`/how-to-measure-your-yard` route** — renders `docs/research/how-to-measure-yard-for-fence-guide.md` as styled HTML. Uses `TopNav` + `BacklinksFooter`.

**1.12 `/how-to-measure-your-yard` route**
- New React route in `app.js`.
- Renders the markdown guide using `react-markdown` with GitHub-flavored markdown support.
- Embed both slope-guide infographics (placeholder URLs until Sarah provides):
  - `assets/slope-guides/measure-slope.png` (board-and-level method)
  - `assets/slope-guides/post-options.png` (standard/rackable/heavy-rack visual)
- YouTube video embed placeholder, article link placeholder.

**Phase 1 Acceptance (E2E + code review required):**
- Feature flag ON: `MapboxDrawView` loads, globe spins to address, parcel polygon renders, sides split, click-to-select works.
- Feature flag ON with manual mode: click-to-place vertex drawing works.
- EPQS pre-fills rackingTier per segment correctly.
- Slope popup appears with three options; per-segment UI only appears for "some" or "all" choice.
- Segment colors match between map and sidebar; hover linking works.
- Pricing: Standard selection adds $0 to posts; Rackable adds `totalPosts × $4.75`.
- Mobile viewport: all above flows work with touch, draw-mode toggle prevents gesture conflicts.
- Feature flag OFF: old `DrawYardView` still works exactly as before (zero regression).
- **Playwright E2E test passes** for both flat-yard and sloped-yard scenarios.
- **Code review by `superpowers:code-reviewer` agent passes.**

---

### Phase 2 — Checkout + Stripe (5-7 days)

**2.1 Stripe Connect verification**
- Confirm Stripe Connect account exists via MCP tool or Stripe dashboard check.
- If not, block Phase 2 until Sarah completes Stripe Connect onboarding (US business, SDVOSB, veteran-owned disclosure for future Stripe Climate / Stripe tax credit eligibility).
- Add Stripe publishable key to webpack env.
- `wrangler secret put STRIPE_SECRET_KEY` for the checkout Worker.
- `wrangler secret put STRIPE_WEBHOOK_SECRET` for webhook verification.

**2.2 `/checkout` route (Option B — dedicated page)**
- New route `/checkout` in `app.js`.
- Layout (desktop, two-column):
  - **Left column (40% width):** Order summary
    - Mapbox satellite thumbnail (captured from MapboxDrawView as PNG data URL)
    - Fence config: style, color, height, linear feet, gate summary
    - Line-item pricing breakdown
    - Subtotal / shipping / tax / total
    - Testimonial (pulled from `SocialProof.js` rotation)
    - "🛡 Every order reviewed by Sarah within 24h" badge
  - **Right column (60% width):** Payment
    - Stripe Payment Element (handles Card + Apple Pay + Google Pay automatically)
    - BNPL panel: Affirm, Klarna, Afterpay (all native via Payment Element)
    - Attorney-reviewed checkbox (CYA #4)
    - "Authorize $X" button (disabled until checkbox checked)
    - Trust row below button: "🛡 Every order reviewed by Sarah · 🇺🇸 Veteran-owned SDVOSB · ↩ 24h cancel window"

- Layout (mobile, < 768px):
  - Order summary collapses into a `<details>` drawer at the top ("View your order")
  - Payment fills the viewport
  - BNPL buttons stack vertically, 44×44px minimum
  - Apple Pay / Google Pay buttons prominent (mobile conversion drivers)
  - Single-column, full-width

**2.3 Stripe checkout Worker**
- `workers/stripe-checkout/src/index.js`:
  - `POST /api/checkout` — creates Stripe PaymentIntent with `capture_method: 'manual'`, returns `client_secret`.
  - `POST /api/capture` — admin-only (API key auth), partial-captures the PaymentIntent.
  - `POST /api/webhook` — verifies Stripe signature, forwards `payment_intent.succeeded` to admin CRM + email worker.

**2.4 Payment flow**
- Customer fills Payment Element, checks checkbox, clicks "Authorize $X".
- Frontend calls `stripe.confirmPayment()` with `client_secret`.
- On success: redirect to `/checkout/success?pi=...`.
- Webhook fires → admin CRM lead created with `stripe_payment_intent_id`, status `authorized`.
- Confirmation email sent via existing `email-worker/worker.js` (augmented with CYA #5).

**2.5 Partial capture workflow (admin CRM)**
- New `CaptureButton` in admin CRM lead detail:
  - Input: adjusted total (default: full authorized amount)
  - Confirm dialog: "Capture $X from customer's card?"
  - Calls `/api/capture` with admin API key.
  - On success: lead status → `captured`, Ultra PO auto-generated.

**2.6 BNPL config**
- Enable in Stripe dashboard: Card, Apple Pay, Google Pay, Affirm, Klarna, Afterpay, Link (Stripe's saved-card network).
- Geography filter: US only.
- Amount filters: Affirm $50-$17,500, Klarna $35-$10,000, Afterpay $35-$2,000 (likely skipped at AOV but available for smaller orders).

**Phase 2 Acceptance:**
- Customer can authorize a payment end-to-end.
- Webhook fires, admin CRM receives the lead with `authorized` status.
- Partial capture works from admin CRM ("charged $2,800 of $3,000 authorized" tested).
- Mobile checkout passes Lighthouse mobile score ≥ 90.
- All 6 BNPL methods render when applicable.
- Attorney-reviewed checkbox language is in place (TODO flag if attorney not yet reviewed).
- **Playwright E2E test passes** for full draw → quote → checkout → capture flow using Stripe test mode.
- **Code review by `superpowers:code-reviewer` agent passes.**

---

### Phase 3 — Admin CRM Extensions (3-4 days)

**3.1 D1 schema migration**
In `worker/src/migrations/`:
```sql
ALTER TABLE leads ADD COLUMN terrain_flag TEXT;          -- 'possible_slope' | null
ALTER TABLE leads ADD COLUMN epqs_data TEXT;             -- JSON blob
ALTER TABLE leads ADD COLUMN mapbox_snapshot_url TEXT;   -- R2 or inline
ALTER TABLE leads ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE leads ADD COLUMN payment_status TEXT;        -- 'authorized' | 'captured' | 'refunded'
ALTER TABLE leads ADD COLUMN captured_amount_cents INTEGER;
```

**3.2 Worker updates**
- `rowToLead()` (lines 76-109): include new columns in API response.
- `POST /leads` (lines 138-174): write new columns.
- New endpoint: `POST /leads/:id/capture` — admin-authed partial capture via Stripe.

**3.3 Admin UI changes**
In `admin-app/src/components/`:
- `LeadCard.jsx`: yellow "Possible slope — verify" pill when `terrain_flag === 'possible_slope'`.
- `LeadList.jsx`: filter "Show only: Possible slope".
- `QuoteDetail.jsx` / `LeadDetail.jsx`:
  - New "Terrain / EPQS" section:
    - EPQS classification
    - EPQS confidence (HIGH / LOW)
    - Max delta inches
    - Customer's rackability selection
    - **Bold red row** when EPQS says sloped/steep AND customer picked Standard.
  - Mapbox satellite thumbnail (display `mapbox_snapshot_url`).
  - Per-segment badges showing rackingTier + slope classification.
  - CaptureButton (Phase 2 wired here).

**3.4 Email worker updates**
`workers/email-worker/worker.js`:
- In `buildSalesEmailHtml()`: append "Terrain check" row with EPQS vs customer selection.
- Bold red warning row when they disagree.
- `buildZoneSectionHtml()` (lines 193-200): include per-segment slope info.

**Phase 3 Acceptance:**
- Admin CRM shows yellow slope pill on relevant leads.
- Filter "Possible slope" works.
- Lead detail shows EPQS section with bold red row on disagreement.
- Sales email includes terrain check + red warning row.
- Partial capture button functional.
- **Playwright E2E test passes** (admin review flow with known-sloped and known-flat leads).
- **Code review by `superpowers:code-reviewer` agent passes.**

---

### Phase 4 — Calculator Bypass + Guide Page (2-3 days)

**4.1 Calculator-only entry (non-blocking)**
- "I already know my measurements" link on quote entry.
- Skip map, go straight to form: linear feet, corners, ends, terrain toggle, gates.
- Reuses existing `QuoteStep2_Layout` component.
- `source: 'manual'` flag → no 5% padding.

**4.2 `/how-to-measure-your-yard` route — polish pass**
- Phase 1.12 creates the route with markdown rendering + infographics. This phase wires in:
  - Real YouTube video URL (once Sarah provides it)
  - Real article URL (once Sarah provides it)
  - Any Ultra spec corrections from 4.3 below
- Markdown → HTML with `react-markdown` (GitHub-flavored).
- Both infographics embedded from `assets/slope-guides/`.

**4.3 Ultra spec discrepancy resolution**
Before publishing the guide page:
- Verify Standard rack tolerance with Ultra rep: 4" (Ultra FAQ) vs 6" (FenceTown). Default to 4" per conservative bias.
- Verify gate-opening offset (+¼").
- Verify post spacing (72" vs 72.5" center-to-center).
- Verify pet-panel racking halves.
- Update guide + tool math to match Ultra's authoritative spec.

**Phase 4 Acceptance:**
- Calculator bypass works end-to-end, pricing matches draw-tool output for equivalent input.
- Guide renders at `/how-to-measure-your-yard` with both infographics.
- Ultra spec discrepancies resolved or flagged as TODO with Sarah.
- **Playwright E2E test passes.**
- **Code review by `superpowers:code-reviewer` agent passes.**

---

## 5. Data Structures

### `drawToolData` (emitted by MapboxDrawView)
See Phase 1.8 above.

### CRM payload extension (`WizardShell.js:660` `submitQuoteToCRM`)
```js
{
  // existing fields ...
  epqs_classification: 'flat'|'sloped'|'steep'|'unknown',
  epqs_confidence: 'high'|'low',
  epqs_max_delta_in: Number,
  terrain_flag: 'possible_slope' | null,
  mapbox_snapshot_url: String,
  stripe_payment_intent_id: String,  // after checkout
  segments: [ /* per-segment rackingTier + epqs data */ ]
}
```

### Regrid proxy response
```js
{
  ok: Boolean,
  data: {
    boundary: { type: 'Polygon', coordinates: [[lng,lat], ...] },
    address: String,
    parcelId: String,
    dataQuality: Number
  } | null,
  fallback: 'manual' | null,
  error: String | null
}
```

---

## 6. Process Gates (user-specified)

Every phase must satisfy all four gates before the next phase starts:

1. **End-to-end Playwright test passes** — simulates a real user from address entry through to admin CRM review. Golden path + one edge case (sloped yard, slope popup, per-segment override).
2. **Code review by `superpowers:code-reviewer` agent passes** — reviews diff against plan and coding standards.
3. **Zero regressions in existing test fixtures** — `priceCalculator.js` and `pricingEngine.js` outputs match prior snapshots for unchanged inputs.
4. **Feature flag can toggle the new work on/off cleanly** (Phase 1 specifically) — proves atomic delivery.

Between Phase 1 and Phase 2, also:
- Deploy feature flag ON to staging for at least 48 hours of Sarah dogfooding before Phase 2 begins.

---

## 7. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Regrid parcel coverage misses Michigan rural areas | Customer hits "no parcel found" | Manual Mode fallback, auto-triggered |
| Mapbox free tier exceeded (50K map loads/mo) | Surprise bill | Monitor via Cloudflare Analytics; alert at 40K; budget $100/mo overage |
| EPQS 10m fallback gives wrong tier on sloped yard | Customer under-orders | Classify as `unknown` not `flat`; show "please verify" banner; Sarah catches in review |
| Stripe webhook delivery failure | Lead missing in admin CRM | Webhook retry + idempotency key; manual sync button in admin CRM |
| Attorney review of checkout checkbox delayed | Blocks Phase 2 launch | TODO flag in code; Phase 2 completes without it but ships disabled until attorney signs off |
| `priceCalculator.js` vs `pricingEngine.js` audit reveals wrong engine runs in prod | Pricing bug | Step 1 of Phase 1.9 is the audit; document result; fix if needed |
| Globe flyTo animation causes motion sickness on mobile | UX complaint | Respect `prefers-reduced-motion` media query, fall back to instant pan |
| 5% padding visible to customer breaks trust | Abandonment | Silent rounding; never show "padded" language; pad is invisible |

---

## 8. Explicit Non-Decisions (deferred)

- Per-panel rackability picker (Phase 5+, gated on real data showing >15% of orders have slope).
- ACH for wholesale (Phase 5+ with SDVOSB contractor portal).
- PayPal (Phase 5+ based on customer demand).
- WebXR / AR / photo simulation (Phase 6+ per $10M master plan).
- Consolidating `priceCalculator.js` + `pricingEngine.js` into a single module (tech debt, separate ticket).
- Deleting `DrawYardView.js` (separate commit after Phase 1 E2E passes and feature flag flips permanently ON).

---

## 9. File Map

**Created:**
- `MapboxDrawView.js`
- `SlopePopup.js`
- `epqsClient.js`
- `mapboxGeocoder.js`
- `parcelClient.js`
- `CheckoutPage.js`
- `checkout.css`
- `workers/parcel-proxy/src/index.js`
- `workers/parcel-proxy/wrangler.toml`
- `workers/stripe-checkout/src/index.js`
- `workers/stripe-checkout/wrangler.toml`
- `docs/research/how-to-measure-yard-for-fence-guide.md` → rendered at `/how-to-measure-your-yard` route
- `TECH_DEBT.md`
- `assets/slope-guides/measure-slope.png`
- `assets/slope-guides/post-options.png`
- `regression/playwright/draw-flat-yard.spec.js`
- `regression/playwright/draw-sloped-yard.spec.js`
- `regression/playwright/checkout-authorize.spec.js`

**Modified:**
- `app.js` (routes: `/checkout`, `/how-to-measure-your-yard`)
- `WizardShell.js` (feature flag import; CRM payload extension at line ~660; snapshot capture)
- `QuoteBuilder.js` (pass `drawToolData.segments` through)
- `QuoteStep2_Layout.js` (pre-fill rackingTier from EPQS)
- `QuoteStep6_Review.js` (CYA #3; "Pay" → `/checkout` route; CYA #5 email)
- `priceCalculator.js` (line 164 dead code removed; 5% pad when `source === 'auto'`)
- `webpack.config.js` (env flags, Mapbox token)
- `package.json` (add `mapbox-gl`, `@stripe/react-stripe-js`, `react-markdown`)
- `workers/email-worker/worker.js` (terrain check row; disagreement warning; CYA #5)
- Admin CRM: `worker/src/index.js`, `admin-app/src/components/LeadCard.jsx`, `LeadList.jsx`, `LeadDetail.jsx`

**Deleted (Phase 1 exit, separate commit):**
- `DrawYardView.js` (once feature flag flips permanently to Mapbox)

---

## 10. Open TODOs

### Blocking
- [ ] Attorney review of checkout checkbox language (blocks Phase 2 **launch**, not build)
- [ ] Stripe Connect authentication via MCP (`/mcp` → "claude.ai Stripe") — required before Phase 2 starts
- [ ] Confirm Stripe Connect account is active + publishable key

### Non-blocking (assets / polish)
- [ ] Sarah provides YouTube URL for slope measurement video (Phase 4 polish)
- [ ] Sarah provides article URL for slope measurement guide (Phase 4 polish)
- [ ] Confirm `priceCalculator.js` is the runtime pricing engine (Phase 1.9 — audit task)

### Closed (resolved from 2026 Ultra pricebook in `docs/ultra-product-specifications.md`)
- [x] **Standard rack tolerance:** **0-6" per 6' panel** (pricebook §RACKABILITY, line 371). Ultra FAQ's "4 inches" is a conservative marketing round-down; pricebook is authoritative.
- [x] **Rackable:** 0-20" (pricebook line 372)
- [x] **Heavy Rack:** 0-36" (pricebook line 373)
- [x] **Racking surcharge:** `DOUBLE_PUNCH_PER_POST = $4.75` applies to **both** Rackable and Heavy Rack — same rate. There is no separate `HEAVY_RACK_PER_POST` constant and Ultra charges nothing extra for heavier punching (pricebook line 367 "at no extra charge"). Grandview's $4.75 covers install labor and hole-precision drilling.
- [x] **Gate opening offset (+¼"):** Not in Ultra pricebook. Industry norm per Aluminum Fences Direct. **Not relevant to the tool** — `priceData.js:5-6` provides pre-defined gate widths (`WALK_WIDTHS`, `DRIVE_WIDTHS_RES`), customers pick from the list; the tool never asks for a raw opening dimension.
- [x] **Post spacing (72" vs 72.5" center-to-center):** Not in Ultra pricebook. **Not relevant to the tool** — Ultra ships panels by count not footage, and `Math.ceil(linearFt / 6)` in `priceCalculator.js:60` is correct either way.
- [x] **Pet-panel racking halves:** Existing code in `QuoteStep2_Layout.js:329-332` already forces puppy + butterflies/scrolls to Standard (conservative, safest). Sufficient until Ultra explicitly publishes halving specs.

---

## 11. Success Metrics (Post-Launch)

Measured at 30 days post-Phase-2 ship:
- ≥ 1 paid order (ships the target customer flow end-to-end).
- Mobile conversion rate within 1% of desktop (was: mobile effectively 0%).
- < 10% of orders flagged by Sarah as "terrain mismatch" (EPQS disagreement rate).
- ≥ 90% of flat-yard customers complete quote in < 5 minutes (measured via analytics).
- Zero prod incidents from feature flag flip.
