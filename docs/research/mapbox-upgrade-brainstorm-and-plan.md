# Mapbox Draw Upgrade — Brainstorm + Implementation Plan

**Paste this into a fresh Claude Code session. Use the brainstorming skill first, then the writing-plans skill to produce the implementation plan.**

---

## Prompt begins

I need you to brainstorm and then write a detailed implementation plan for the most important upgrade to Grandview Fence's Design Studio: replacing the current Google Maps freehand-draw fence tool with a Mapbox GL JS satellite map with VFP-style click-to-select UX, globe animation, per-segment slope popups, and elevation intelligence.

This is customer-facing production code for a fence ordering tool targeting $10M/year revenue. The owner (Sarah) reviews every order before production, so accuracy matters but perfection doesn't — the tool needs to be polished, fast, and conservative (over-quote rather than under-quote).

---

## Context you MUST read before brainstorming

Read these files IN THIS ORDER before doing anything. They contain deep competitive intelligence, a complete codebase inventory, and technical specifications that should shape every decision:

### Research docs (in `docs/research/`):

1. **`vfp-complete-audit.md`** — MOST IMPORTANT. Complete reverse-engineering of Visual Fence Pro's platform. Contains:
   - Their exact Mapbox config (`satellite-streets-v12`, zoom 18-22, maxZoom 22)
   - Their parcel service architecture (server-side `/api/get-parcel`, Ramer-Douglas-Peucker simplification, segment generation with compass labels)
   - Their elevation system (Mapbox Terrain DEM `queryTerrainElevation()`, grade badges green/amber/red at 4%/8% thresholds)
   - Their slope handling (per-segment dropdown: Level / Sloped Toward / Sloped Away / Stepped Toward / Stepped Away — but it's cosmetic, doesn't change BOM)
   - Their BOM engine (477 lines, component-level calculation, post role awareness: terminal + gate + line)
   - Their fence registry (2,854 lines, 100 styles, `$POST$` token system, `scales` flag, spec-driven board counts)
   - Their complete feature set: Products admin, Specs library, Building Codes reference, Work Orders pipeline, AI Visualizer (coming soon), Public Estimator widget
   - **17 features to steal, 3 to skip, and specific gaps to exploit**
   - Iron/Aluminum aliases including "UAF-200 (Ultra)" — they know our manufacturer

2. **`10m-tool-master-plan.md`** — Strategic context: 56 competitors scanned, best UX patterns ranked, phased implementation plan, revenue math ($10M = 238 orders/month at $3,500 AOV)

3. **`post-rackability-research.md`** — Ultra's rackability tiers (Standard 0-6", Rackable 0-20", Heavy Rack 0-36"), USGS EPQS elevation API (1m lidar, free, better than Mapbox DEM), how competitors handle slope (nobody does it well), GreatFence's per-panel dropdown pattern

4. **`how-to-measure-yard-for-fence-guide.md`** — Customer-facing guide to measuring yards, linked from slope tooltips

5. **`post-rackability-implementation-prompt.md`** — Contains a full "What's Already Built" codebase inventory with exact file paths, line numbers, and known bugs. **Read the "What's Already Built" section carefully** — it documents:
   - `DrawYardView.js` elevation/slope code at specific line numbers
   - `QuoteStep2_Layout.js` terrain options and racking tiers at specific lines
   - `priceCalculator.js` dead `slopedPostCount` code
   - Two parallel pricing engines (priceCalculator.js vs pricingEngine.js)
   - Data flow gaps (draw tool slope data doesn't reach QuoteStep2)
   - Admin CRM paths and state

### VFP source code reference (read-only, learn from patterns):
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\parcel-service.js` (280 lines)
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\app.html` (5,208 lines)
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\bom-engine.js` (477 lines)
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\fence-registry.js` (2,854 lines)
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\config.js` (35 lines)
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\spec-data.js` (748 lines)

### Codebase files to understand:
- `CLAUDE.md` — mandatory rules (Ultra is source of truth, one fix = one commit, never touch `ultra_dsg_min.js`)
- `DrawYardView.js` (1,869 lines) — current Google Maps draw tool being replaced
- `QuoteStep2_Layout.js` — terrain/racking tier consumer (lines 23-33 have options defined)
- `priceCalculator.js` + `pricingEngine.js` — two pricing engines (audit which one runs)
- `priceData.js` — `DOUBLE_PUNCH_PER_POST = $4.75`
- `WizardShell.js` — `submitQuoteToCRM()` payload
- `workers/email-worker/worker.js` — sales/customer email generation
- `app.js` — React app shell, routing
- `QuoteBuilder.js` — 6-step wizard orchestrator

---

## What we're building

**The draw experience:**
- Address entry → **globe spins from space and zooms down to the customer's backyard** (Mapbox `projection: 'globe'` + `flyTo()`)
- Satellite imagery with translucent street labels (`satellite-streets-v12`)
- **Click property sides to select fence segments** (requires parcel boundary data — start with manual draw, add parcel data Phase 2)
- OR **click-to-place vertices** for custom fence lines (manual mode — always available)
- Draggable vertex handles with **snapping** to nearby points
- Per-segment **live elevation badge** (↗ 4.2ft Moderate, color-coded green/amber/red)
- Per-segment **slope popup**: "Does this section have a slope?" with Flat / Some slope / Significant slope / Not sure — pre-filled from EPQS elevation data
- **3D terrain toggle** — tilt view with buildings extruded, terrain visible
- **Fence line glow effect** — cyan #00d4d4 with 10px blur on hover
- Sidebar ↔ map hover linking (hover sidebar card → highlight segment on map)
- Gate placement on any segment with swing direction
- Live footage counter, panel count, post count updating as user draws
- **Mobile-first**: draw mode toggle (Navigate vs Draw), 44px touch targets, bottom drawer sidebar

**The slope/rackability system:**
- USGS EPQS (1m lidar, free) for elevation data — NOT Mapbox DEM (10m) and NOT Google Elevation
- Per-segment rackability tier auto-suggested from EPQS, customer confirms or overrides
- Wired into BOM: `$4.75/post` surcharge for rackable/heavy-rack posts
- "Not sure" option → flagged for Sarah's review
- Elevation badge is advisory (like VFP), rackability tier is functional (unlike VFP — this is our differentiator)

**Admin CRM enhancements:**
- EPQS classification + customer racking selection in the sales email (bold red warning on disagreements)
- Satellite map thumbnail in quote detail
- Per-segment slope badges in order review

**What stays untouched:**
- 3D renderer (GateRenderer.js, FenceRenderer.js, UnifiedCanvas.js)
- Pricing engine logic (just wire rackingTier into the existing $4.75 surcharge)
- Quiz, landing page, quote steps 3-6
- Ultra spatial constants and assets

---

## Key technical decisions to brainstorm

1. **Mapbox GL JS setup** — `satellite-streets-v12` style, `projection: 'globe'`, globe-to-address flyTo animation, terrain DEM for visual 3D, EPQS for elevation data. Mapbox is **$0/month** at our volume (50K free map loads, 100K free geocodes, elevation is client-side free).

2. **Parcel boundaries** — Use **Regrid API** (best data quality, 158M parcels, all 3,200 US counties). **30-day free trial is active** (2,000 parcel records, started April 2026). API key is stored as Cloudflare Workers secret `REGRID_API_KEY`. **CRITICAL: Regrid calls MUST go through a Cloudflare Worker proxy** — browser → `POST /api/parcel` on our Worker → Worker calls Regrid with the secret key → returns polygon to browser. Never expose the Regrid key client-side. Endpoint: `https://app.regrid.com/api/v2/parcels/point?lat={}&lng={}` or `/parcels/address`. On address geocode → call our Worker proxy → get parcel polygon → render boundary on map → split into clickable segments. Fallback to "📐 Manual Mode" when parcel data isn't available. **This is Phase 1, not deferred — the click-property-side UX is the killer feature.**

3. **Drawing library** — Options: raw Mapbox click handlers (like VFP does), `mapbox-gl-draw` plugin (adds draw modes but may be heavy), or `Terra Draw` (supports Mapbox, touch-native, vertex snapping). Brainstorm which fits best.

4. **Slope popup UX** — Inline in sidebar card (always visible for selected segments)? Or a small popup/tooltip that appears when you first select a segment? VFP uses a dropdown in an expandable section. Consider what's fastest for the "my yard is flat" customer (90% of users — they should be able to skip this friction).

5. **How to handle the transition** — Build `MapboxDrawView.js` alongside `DrawYardView.js` and swap via feature flag? Or replace in-place? The output data structure must match what QuoteStep2 expects.

6. **Stripe checkout integration** — auth-then-capture with partial capture. Where in the flow? After QuoteStep6_Review? New step? How does this interact with the "every order reviewed by Sarah" promise? Brainstorm the UX: customer pays immediately (card authorized) → Sarah reviews within 24 hours → Sarah captures actual amount (potentially less than authorized if over-quoted) → Ultra order submitted.

7. **5% footage padding** — applied silently to auto-calculated footage (customer sees padded number). Customer manual entry should NOT be padded. How to distinguish auto vs manual footage?

8. **CYA language** — 6 touchpoints identified in the rackability research. Where exactly should each go in the new Mapbox flow? The checkout checkbox is critical and needs attorney review before launch.

---

## Branch setup

```bash
cd "C:\Users\sarah\Desktop\App Repos\fence-tool"
git checkout feat/quote-redesign
git pull origin feat/quote-redesign
git checkout -b feat/mapbox-draw-upgrade
```

Admin CRM:
```bash
cd "C:\Users\sarah\Desktop\grandview-quote-system"
git init
git add -A
git commit -m "chore: initial commit — admin CRM app"
```

---

## Deliverable

After brainstorming, produce a **detailed implementation plan** with:
1. Phases (what ships when, what's blocked by what)
2. Per-phase file-by-file changes (which files created, which modified, which deleted)
3. Data flow diagrams (address → map → segments → slope → BOM → quote → checkout → email → admin review)
4. Specific acceptance criteria per phase
5. Risk register (what could go wrong, what's the fallback)
6. Estimated effort per phase in days

The plan should be executable by a Claude Code session without further clarification. Every file path, line number reference, API endpoint, and data structure should be explicit.

**Do NOT start coding.** This prompt is for brainstorming and planning only. The implementation happens in a follow-up session using the plan as input.

---

## Prompt ends
