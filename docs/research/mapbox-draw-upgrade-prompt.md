# Implementation Prompt — Mapbox Draw Upgrade + VFP-Style UX

**Paste this into a fresh Claude Code session. Branch from `feat/quote-redesign`.**

---

## Prompt begins

You are rebuilding the fence drawing experience in Grandview Fence's Design Studio. The current draw tool (Google Maps, freehand click-to-place) is being replaced with a Mapbox GL JS satellite map + parcel boundary click-to-select UX inspired by Visual Fence Pro. This is the highest-impact UX upgrade in the product roadmap.

**Working directory:** `C:\Users\sarah\Desktop\App Repos\fence-tool`

**Read first (in order):**
1. `CLAUDE.md` — mandatory rules. One fix = one commit.
2. `docs/research/vfp-complete-audit.md` — complete audit of Visual Fence Pro's platform, source code, and UX patterns. **Read the entire file.** It contains the exact Mapbox config, parcel service architecture, elevation system, segment selection UX, grade dropdown, and BOM integration details we're replicating.
3. `docs/research/10m-tool-master-plan.md` — strategic context and feature priorities.
4. `docs/research/post-rackability-research.md` — rackability tiers (Standard 0-6", Rackable 0-20", Heavy Rack 0-36") and USGS EPQS elevation API details.
5. `DrawYardView.js` (1,869 lines) — the CURRENT draw tool being replaced. Understand what it does so you don't lose features. Keep all existing data flow (lines, gates, footage, slope data → QuoteStep2).
6. `QuoteStep2_Layout.js` — where terrain/racking data is consumed. Lines 23-33 have TERRAIN_OPTIONS and RACKING_TIERS already defined.

**Do NOT touch:**
- `gate_tool/js/ultra_dsg_min.js`
- Any file in `gate_tool/m/`, `gate_tool/t/`, `gate_tool/th/`
- `SPATIAL_TRUTH.json`, `spatialConstants.js`
- `GateRenderer.js`, `FenceRenderer.js`, `UnifiedCanvas.js` — the 3D renderer is untouched by this work

**Reference code (downloaded from VFP, read-only — do NOT copy verbatim, learn from the patterns):**
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\parcel-service.js` (280 lines) — parcel API client + Ramer-Douglas-Peucker simplification + segment generation
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\app.html` (5,208 lines) — VFP's full estimator. Key sections:
  - Lines 731: Map initialization (`mapboxgl.Map` with `satellite-streets-v12`)
  - Lines 860-920: Fence/parcel/neighbor map layers with GeoJSON sources
  - Lines 1050-1090: Terrain DEM loading + 3D buildings + pitch toggle
  - Lines 1700-1750: Segment data structure (setbackFt, grade, gradeNotes, gates[])
  - Lines 2726-2756: Elevation query via `map.queryTerrainElevation()` + elevation badge HTML
  - Lines 2930-2965: Per-segment grade dropdown (Level / Sloped Toward / Sloped Away / Stepped Toward / Stepped Away)
  - Lines 2955-2970: Segment sidebar card with elevation badge
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\bom-engine.js` (477 lines) — BOM calculation with post roles
- `C:\Users\sarah\Desktop\vfp-capture\sourcemaps\fence-registry.js` (2,854 lines) — 100 styles, component templates

---

## Branch setup

```bash
cd "C:\Users\sarah\Desktop\App Repos\fence-tool"
git checkout feat/quote-redesign
git pull origin feat/quote-redesign
git checkout -b feat/mapbox-draw-upgrade
```

---

## Goal

Replace the current Google Maps freehand-draw experience with a Mapbox GL JS satellite map where the customer:
1. Enters their address
2. Sees their property boundary auto-loaded (parcel sides labeled)
3. **Clicks property sides** to select which ones get fence (no freehand drawing for the 80% case)
4. Can also draw custom lines for non-boundary fence (manual mode)
5. Gets a per-segment **"Is this section sloped?"** popup/question
6. Sees live elevation badges per segment
7. Everything feeds the existing QuoteStep2 → pricing engine pipeline

The experience should feel as smooth and polished as VFP's — clean animations, snapping, segment highlighting on hover, satellite imagery with translucent street labels.

---

## Architecture decisions

### Mapbox GL JS, not Google Maps
- Use Mapbox GL JS v3 with `satellite-streets-v12` style
- This gives vector tiles (sharp at any zoom), terrain DEM, 3D buildings, smooth pitch/bearing transitions, translucent street labels on satellite
- API key: **get a new Mapbox token for Grandview** — do NOT use VFP's token. Add as `MAPBOX_TOKEN` in webpack env config (same pattern as `GOOGLE_MAPS_API_KEY`).
- Keep Google Maps API loaded for Places Autocomplete address search — Mapbox Geocoder is fine too but Google Places has better US residential address matching. Pick whichever works better in testing.

### Parcel data via Realie.ai Parcel API
- Cheaper than Regrid: $50/month for 1,250 lookups (nationwide coverage)
- Returns parcel boundary polygon geometry
- Requires API key (Sarah needs to sign up at realie.ai)
- Add as `REALIE_API_KEY` in webpack env config
- Query: geocode address to lat/lng → call Realie.ai for parcel polygon → render on map
- **Fallback:** If Realie doesn't cover an address, show "Manual Mode" (same as VFP's 📐 Manual Mode fallback)
- **Upgrade path:** If volume exceeds 1,250/month, bump to Tier 2 ($150/mo for 6,000) or Tier 3 ($350/mo for 30,000). Can also switch to Regrid at scale for best data quality.

### Elevation via USGS EPQS (NOT Mapbox DEM)
- EPQS has 1m lidar resolution vs Mapbox's 10m DEM — genuinely better for fence-scale slope detection
- Endpoint: `https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Feet&wkid=4326`
- Free, no API key
- Use Mapbox terrain DEM for the **visual** 3D view (buildings, terrain tilt) — but use EPQS for the **data** (elevation badges, rackability suggestions)
- This is strictly better than VFP's approach (they use Mapbox DEM for both visual and data)

### Slope question per segment
- When a customer clicks a property side to select it, **show a small popup/card below the segment** asking: "Does this section have a slope?"
  - ○ Flat (no extra cost)
  - ○ Some slope (adds $X for rackable posts)
  - ○ Significant slope (adds $X for heavy-rack posts)
  - ○ I'm not sure (we'll review before production)
- Pre-fill the answer from EPQS elevation data when available (if EPQS says >4% grade, default to "Some slope")
- The popup should feel lightweight — not a modal that blocks the screen, more like a tooltip that appears inline with the segment card in the sidebar
- Store as `segment.rackingTier` (`standard` | `rackable` | `heavy-rackable` | `unknown`)
- Wire into existing `QuoteStep2_Layout.js` RACKING_TIERS and pricing via `DOUBLE_PUNCH_PER_POST = $4.75` in `priceData.js`

---

## Implementation plan

### Phase A — Mapbox map + address search (replace Google Maps in DrawYardView)

1. Install Mapbox GL JS: `npm install mapbox-gl @mapbox/mapbox-gl-geocoder`
2. Create new component `MapboxDrawView.js` (do NOT modify DrawYardView.js yet — build alongside, swap later)
3. Initialize Mapbox map with:
   ```javascript
   map = new mapboxgl.Map({
     container: 'map',
     style: 'mapbox://styles/mapbox/satellite-streets-v12',
     center: [lng, lat],  // from address geocode
     zoom: 18,
     maxZoom: 22,
     attributionControl: false,
     preserveDrawingBuffer: true  // for screenshots
   });
   ```
4. Add Mapbox Geocoder for address search (or keep Google Places Autocomplete — test both)
5. On address selected → fly to location at zoom 18

### Phase B — Parcel boundary loading + segment selection

1. On address geocode, call Regrid API to get parcel polygon
2. Apply Ramer-Douglas-Peucker simplification for parcels >60 vertices (copy the algorithm from VFP's `parcel-service.js` `simplifyRing()` — the math is standard, not proprietary)
3. Split polygon into segments with compass labels ("Side 1 (North)", "Side 2 (East)")
4. Render parcel boundary as a filled polygon (semi-transparent fill + solid border)
5. Render each segment as a separate clickable line on the map
6. **Click a segment → it toggles selected** (cyan highlight, like VFP)
7. Selected segments appear in a sidebar list with:
   - Segment label + compass direction
   - Length in feet (from haversine)
   - Elevation badge (from EPQS)
   - Slope question (the popup)
   - Gate controls (add/remove gates)
8. Sidebar ↔ map linked: hover a sidebar card → highlight segment on map, and vice versa

### Phase C — Elevation + slope per segment

1. When a segment is selected, fire EPQS queries at both endpoints + every 6ft along the segment
2. Compute per-panel rise, classify each span:
   - <6" → Standard
   - 6-20" → Rackable
   - 20-36" → Heavy Rack
   - >36" → Stepped (flag)
3. Use MAX tier across all spans as the segment's suggested tier
4. Display elevation badge per segment (like VFP):
   ```
   ↗ 4.2ft Moderate (5.8% grade) | 892ft → 896ft
   ```
   Color: green (<4%), amber (4-8%), red (>8%)
5. Show the slope question popup with EPQS-suggested answer pre-selected
6. "I'm not sure" option stores `unknown` — Sarah reviews these

### Phase D — Manual draw mode (fallback for no parcel data)

1. "📐 Draw manually" button for addresses without parcel coverage
2. Click-to-place vertices on the map (like current DrawYardView behavior)
3. Draggable vertices with handles
4. Right-click to undo last point
5. Lines connect with distance labels at midpoints
6. Same sidebar treatment as parcel segments (slope question, gates, etc.)

### Phase E — 3D terrain toggle + visual polish

1. "3D" button loads Mapbox terrain DEM + 3D buildings:
   ```javascript
   map.addSource('mapbox-dem', {
     type: 'raster-dem',
     url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
     tileSize: 512, maxzoom: 14
   });
   map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
   map.addLayer({
     id: '3d-buildings', source: 'composite', 'source-layer': 'building',
     filter: ['==', 'extrude', 'true'], type: 'fill-extrusion', minzoom: 15,
     paint: {
       'fill-extrusion-color': '#aaa',
       'fill-extrusion-height': ['get', 'height'],
       'fill-extrusion-opacity': 0.5
     }
   });
   ```
2. Toggle pitch to 50° with `easeTo({pitch:50, bearing:-15, duration:1000})`
3. Flatten back to 0° for drawing (auto-flatten when draw mode active)
4. Fence segment styling:
   - Selected: cyan `#00d4d4`, width 4px, round caps
   - Hover highlight: width 10px, opacity 0.8, blur 3 (glow effect)
   - Unselected: white dashed, width 2px, opacity 0.5

### Phase F — Wire into existing quote pipeline

1. `MapboxDrawView.js` must output the SAME data structure that `DrawYardView.js` currently outputs:
   ```javascript
   {
     lines: [{ points: [{lat, lng}], segments: [{slope, length}] }],
     gates: [{ lat, lng, style, width, type }],
     totalLinearFt: number,
     corners: number,
     // NEW fields:
     parcelData: { address, owner, lot, parcelId },
     segmentRacking: [{ segmentId, tier: 'standard'|'rackable'|'heavy-rackable'|'unknown' }]
   }
   ```
2. `QuoteStep2_Layout.js` consumes this data — the `linearFeet`, `terrain`, `rackingTier`, `corners`, `ends` fields are already wired
3. Add `segmentRacking` to the payload sent to the email worker (`WizardShell.js submitQuoteToCRM()`) so Sarah sees per-segment racking decisions
4. In the email worker (`workers/email-worker/worker.js`), add a row per zone showing racking tier and EPQS elevation data. Bold red warning if any segment is `unknown` or if EPQS disagrees with customer selection.

### Phase G — Admin tool enhancements

**Working directory for admin:** `C:\Users\sarah\Desktop\grandview-quote-system`
**IMPORTANT: `git init` + initial commit before ANY changes — the repo has no commits yet.**

1. In `admin-app/src/components/QuoteDetail.jsx`:
   - Add satellite map thumbnail (static Mapbox image of the customer's drawn fence)
   - Add per-segment elevation badge display
   - Add racking tier display with yellow/red flags for `unknown` or EPQS-disagrees
   - Add a "BOM Override" section where Sarah can adjust line item quantities before sending to Ultra

2. In `admin-app/src/components/LeadList.jsx` or `LeadCard`:
   - Add a small badge: 🟢 flat / 🟡 sloped / 🔴 steep per lead, from EPQS data
   - Prioritize review of flagged orders

3. In the CRM worker (`worker/src/index.js`):
   - Accept `epqsClassification`, `segmentRacking[]`, and `parcelData` in the POST /leads payload
   - Store in `legacy_data` JSON column initially (dedicated columns are a follow-up migration)

---

## Mobile considerations

This is critical — 70% of traffic is mobile and every competitor says "desktop only."

1. **Draw mode toggle** — floating button: "Navigate" (map panning enabled, selection disabled) vs "Select" (map locked, segments clickable). Auto-switch to Navigate after 3 seconds of inactivity.
2. **44×44px touch targets** — segment highlight areas must be large enough to tap accurately. Use invisible expanded hit areas (64×64px) around segments.
3. **Slope popup on mobile** — show as a bottom sheet (slides up from bottom) not a sidebar dropdown. One-tap answer selection.
4. **Sidebar as bottom drawer on mobile** — segment list slides up from bottom, map takes full screen above. Same pattern as Google Maps directions.

---

## What NOT to build

- No AI Fence Visualizer (VFP hasn't shipped theirs either)
- No work order pipeline (Phase 3)
- No QuickBooks/Google Calendar integration
- No building codes reference page (Phase 3)
- No white-label embeddable widget (Phase 3)
- No multi-material support (we only sell Ultra aluminum)
- No Good/Better/Best comparison (Phase 2 — useful but not MVP)
- Do NOT rewrite the 3D renderer — it stays untouched
- Do NOT change the pricing engine — it stays untouched (except wiring rackingTier into the surcharge that already exists in priceCalculator.js)

---

## Acceptance criteria

Ship when all of these are true:

- [ ] Customer enters address → Mapbox satellite map loads at zoom 18
- [ ] Parcel boundary auto-loads from Regrid with sides labeled
- [ ] Click a side → toggles selected (cyan highlight)
- [ ] Selected segments show in sidebar with length, elevation badge, slope question
- [ ] Slope question per segment: Flat / Some slope / Significant slope / Not sure
- [ ] EPQS elevation pre-fills the slope suggestion
- [ ] "📐 Draw manually" fallback works for addresses without parcel data
- [ ] 3D toggle shows terrain + buildings with smooth pitch transition
- [ ] Data flows correctly into QuoteStep2 → pricing engine → email worker
- [ ] Rackability surcharge ($4.75/post) applies when slope selected
- [ ] Mobile: draw mode toggle works, sidebar as bottom drawer, 44px touch targets
- [ ] No regressions in the 3D renderer, quiz, landing page, or existing quote steps
- [ ] Admin CRM: git initialized, EPQS/racking data visible in quote detail
- [ ] Fence segment hover glow effect (10px blur, cyan)
- [ ] Segment ↔ sidebar hover linking works

Run `npm start` and test end-to-end before declaring done. Test on both desktop (Chrome) and mobile (Chrome DevTools responsive mode at 375px width).

---

## Commit discipline

- One feature = one commit. Example:
  - `feat(draw): Mapbox GL JS map initialization with satellite-streets-v12`
  - `feat(draw): Regrid parcel boundary loading and segment generation`
  - `feat(draw): click-to-select segments with cyan highlight`
  - `feat(draw): EPQS elevation queries and per-segment badges`
  - `feat(draw): slope question popup with EPQS pre-fill`
  - `feat(draw): manual draw mode fallback`
  - `feat(draw): 3D terrain toggle with buildings`
  - `feat(draw): mobile bottom drawer sidebar and draw mode toggle`
  - `feat(draw): wire segment racking into quote pipeline`
  - `feat(admin): git init and initial commit`
  - `feat(admin): EPQS and racking badges in QuoteDetail`

---

## Prompt ends
