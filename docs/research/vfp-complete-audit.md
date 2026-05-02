# Visual Fence Pro — Complete Platform Audit

**Date:** 2026-04-16
**Method:** Live account access + full source code analysis (all JS files publicly accessible, no obfuscation)
**Purpose:** Identify every feature, UX pattern, and architectural decision to inform Grandview's $10M tool build

---

## Executive Summary

VFP is a **contractor-facing** fence estimating SaaS built by a single developer (Sean LeBlanc, Boise ID) on Vercel + Supabase + Mapbox + Stripe. It has ~12 users, launched 2025, and is surprisingly complete for a solo project. The platform has significant features Grandview should adopt but also critical gaps Grandview can exploit.

**What VFP does that we should steal:**
1. Click-on-property-side to select fence segments (not draw from scratch)
2. Per-segment grade/slope dropdown with elevation auto-detection via Mapbox terrain DEM
3. Component-level BOM with spec-driven calculations (boards per panel from actual dimensions)
4. Post role awareness (terminal, gate, line) with different concrete per role
5. Good/Better/Best comparison quotes for upselling
6. Manual override system for contractor quote adjustments
7. Building codes reference library by jurisdiction
8. Construction spec cards with engineering data
9. 10-step onboarding tour
10. Embeddable public estimator widget

**What VFP doesn't do that we already have or can build better:**
1. No 3D visualization (we have full Three.js renderer)
2. No manufacturer SKU integration (we have Ultra's exact price book)
3. No consumer self-service checkout (they're contractor-only)
4. No rackability tier calculation (they have grade labels but no rack-level logic)
5. No photo simulation or AR
6. No instant consumer checkout (Stripe is contractor-to-homeowner only)

---

## Platform Architecture

| Layer | Technology |
|-------|-----------|
| Hosting | Vercel |
| Database / Auth | Supabase (project: sncoammnzpdgvapuiuke) |
| Mapping | Mapbox GL JS v3.3.0, satellite-streets-v12 |
| Parcel data | Server-side API at `/api/get-parcel` (provider unknown, likely Regrid) |
| Elevation | Mapbox Terrain DEM v1 (`mapbox.mapbox-terrain-dem-v1`) via `map.queryTerrainElevation()` |
| Payments | Stripe Connect |
| Accounting | QuickBooks Online |
| Calendar | Google Calendar |
| Analytics | PostHog + Google Analytics 4 |
| AI/ML | fal.run (serverless AI inference — for upcoming AI Fence Visualizer) |
| Visitor ID | rb2b.com (B2B visitor identification) |
| Weather | open-meteo.com |
| Error tracking | Custom error-reporter.js |
| CDN | Cloudflare (via Vercel) |

**Supabase Tables Identified:**
- `companies` — contractor company profiles
- `company_settings` — per-company configuration
- `fence_products` — custom product catalog per company
- `projects` — saved estimates/jobs
- `shared_quotes` — quotes sent to homeowners
- `work_orders` — job tracking pipeline
- `public_leads` — leads from embeddable widget
- `marketplace_lead_purchases` — lead marketplace
- `textures` — custom fence textures/renders
- `published_registry` — shared product registry (via RPC)

---

## Feature-by-Feature Audit

### 1. Estimator (app.html) — 5,208 lines

**The core draw-on-map tool.**

**Address Search:**
- Mapbox Geocoder with address autocomplete
- Searches address → flies to location on satellite map
- User clicks any property to load parcel boundary

**Parcel Loading:**
- Server-side API: `GET /api/get-parcel?lat={}&lng={}`
- Returns GeoJSON boundary polygon + address + owner + parcel ID + lot + block + subdivision
- Client-side Ramer-Douglas-Peucker simplification for parcels >60 vertices (preserves within 2% perimeter / 1% area)
- Parcel boundary rendered as a filled polygon on the map
- Segments auto-generated from boundary sides with compass labels ("Side 1 (North)")
- Neighbor parcels fetchable via `?mode=neighbors&radius=300`

**Segment Selection:**
- Property boundary pre-split into sides
- **Click a side to select it as a fence run** — this is the key UX pattern
- Selected segments highlight in cyan
- Each segment shows: label, length in feet, compass direction
- Segments are independently draggable — endpoints can be adjusted

**Per-Segment Configuration:**
- Fence type selector (from contractor's product catalog)
- Height override per segment (multi-height support)
- Setback adjustment (feet from property line)
- **Grade/Slope dropdown** per segment:
  - Level (standard)
  - Sloped Panels — Towards House
  - Sloped Panels — Away From House
  - Stepped Panels — Towards House
  - Stepped Panels — Away From House
- Grade notes text field per segment
- Gate placement on any segment

**Elevation Intelligence (Mapbox Terrain DEM):**
- Uses `map.queryTerrainElevation()` on Mapbox Terrain DEM v1 tiles (zoom 14 max, ~10m resolution)
- Queries elevation at both endpoints of each segment
- Computes: start elevation (ft), end elevation (ft), change (ft), grade percentage
- Auto-displays elevation badge per segment:
  - <0.5ft change: hidden
  - <4% grade: green "Gentle"
  - 4-8% grade: amber "Moderate"
  - >8% grade: red "Steep"
- Shows arrow (↗ or ↘) and ft→ft reading
- **CRITICAL FINDING: This is the SAME Mapbox DEM data (~10m resolution) that we already know is insufficient for per-panel rackability detection.** VFP uses it as a visual indicator, NOT as a BOM input. The grade dropdown is manual — the contractor still chooses the slope handling method themselves. The elevation badge is advisory only.

**Gate Placement:**
- Click "+ Gate" to add gate to any selected segment
- Gate types: category-specific (walk 3-5ft, double drive 10-12ft, cantilever for chain link)
- Gate positioning: slider 0-1 along segment length
- Swing direction: configurable
- Hinge end: start or end of segment
- Per-gate grade dropdown (same options as fence segments)
- Per-gate notes field
- **Gate pricing hierarchy:** product-level prices override registry defaults

**Manual Mode:**
- "📐 Manual Mode — no parcel needed" button
- Creates virtual segments without property boundary
- User draws lines manually on satellite map
- For customers without parcel data coverage

**3D Terrain View:**
- "3D" button toggles Mapbox terrain exaggeration
- Loads `mapbox-dem` raster DEM tiles
- Adds 3D building extrusions
- Tilts camera for perspective view
- Visual only — does not affect calculations

**BOM Calculation:**
- Real-time BOM updates as segments/gates are selected
- Component-level detail (posts, boards, rails, concrete, fasteners)
- Quote summary with material cost, gate cost, markups, grand total
- Good/Better/Best comparison across fence products
- Full manual override system

**Sidebar UI:**
- Left sidebar shows:
  - Property info (address, lot, parcel ID, owner, subdivision)
  - Perimeter total with selected segment count
  - Per-segment cards with length, grade badge, elevation reading
  - Expandable segment details (fence type, height, setback, gates, grade)
  - BOM summary at bottom
- Segment highlight-on-hover (map ↔ sidebar linked)

### 2. Products Admin (admin/visualfence-admin.html)

- Product catalog with 3D-rendered cards per fence style
- Component-level pricing editor (per product)
- Quick stats: board size, post type, bags/post, panel width
- Per-panel cost and $/ft calculated live
- Tear-out pricing configuration ($7/ft default)
- "Add Product" with 8-step guided tour
- Product duplication support
- Free tier: 3 products max; Starter+: unlimited

### 3. Construction Specs (app/specs.html)

- Filterable by category: All, Wood, Vinyl, Iron/Aluminum, Chain Link, Industrial
- Spec cards with 3D fence renders
- Quick stats per card: board size, line post type, bags/post, panel width
- Expandable detail sections: Posts, Footing, Boards/Pickets, Rails, Fasteners
- Post variant annotations
- **Includes gate specs (14 types):** walk, double drive, arched ornamental, cantilever, crash-rated barrier
- **Includes industrial specs (8 types):** anti-climb mesh, palisade, highway fence, noise barriers
- **Source citations embedded:** ASTM, IRC, AFA, manufacturer docs

### 4. Building Codes (app/building-codes.html)

- **State jurisdiction selector** — IRC/IBC Baseline (Federal) default
- Categories: Wood, Vinyl, Chain Link, Iron/Aluminum, Deck & Porch Railings, Staircases
- Per-category cards showing:
  - Max height (no permit)
  - Post depth rule
  - Setback (varies by jurisdiction)
  - Wind load standard (IRC R301.2)
  - Post reinforcement requirements
  - UV rating (ASTM D4329 for vinyl)
  - Fabric gauge range (chain link)
- "View Full Code Requirements →" expandable detail
- Code badge tags: IRC, IBC
- Searchable by keyword

### 5. AI Fence Visualizer (app/visualizer.html)

- **"Coming Soon" — not yet functional**
- Planned flow: Upload photo → Draw fence line → Pick style → AI renders photorealistic preview
- Tech: `fal.run` (serverless AI inference) — likely Stable Diffusion / ControlNet for inpainting
- Will be a major differentiator when live

### 6. Work Orders (app/work-orders.html)

- **Pro tier feature ($179/mo)**
- Pipeline stages: Set Crew → Shop → Install → Complete → Paid
- KPI cards: Total Work Orders, Active, Completed, Total Labor Cost
- Project-to-work-order conversion
- Crew hours tracking
- Profit per project calculation

### 7. Dashboard (dashboard.html)

- Redirects to onboarding if setup incomplete (9-step onboarding)
- Project list with updated-at sorting
- Analytics overview (Pro tier)

### 8. Settings (settings.html)

- Company Info: name, phone, business email, contact email, address, logo upload
- Appears on PDF quotes and visualizer watermark
- Integration settings: Stripe Connect, QuickBooks, Google Calendar

### 9. Messages (messages.html)

- In-app messaging (implementation not visible on free tier)

### 10. User Guide (app/user-guide.html)

- 12-section comprehensive guide with searchable sidebar:
  1. Getting Started
  2. Company Setup
  3. Products vs Specs
  4. Adding Products
  5. Specs Database
  6. First Estimate
  7. Satellite Map
  8. Drawing Fences
  9. Adding Gates & Gate Pricing
  10. BOM Breakdown
  11. Saving Projects
  12. Sending Quotes
- Quick-start cards: Quick Start, Create Estimate, Send Quote, Get Paid

### 11. Public Estimator Widget (marketing/public-estimator.html)

- **Enterprise tier feature ($299/mo)**
- Embeddable on contractor's website
- Homeowner enters address, draws fence, gets budget estimate
- Lead captured (name, email, phone) and delivered to contractor's dashboard
- White-labeled to contractor's branding

---

## Elevation / Slope / Grade System — Deep Analysis

### How VFP handles slope (the exact logic):

1. **Automatic elevation detection:** Uses Mapbox `queryTerrainElevation()` on terrain DEM tiles (~10m resolution). Queries both endpoints of each segment. Computes absolute change in feet and grade percentage.

2. **Visual indicator only:** Displays a small elevation badge per segment with color coding (green/amber/red) and ft change. This is purely informational — it does NOT auto-set the grade dropdown.

3. **Manual grade selection per segment:** Contractor chooses from 5 options:
   - Level (standard)
   - Sloped Panels — Towards House
   - Sloped Panels — Away From House
   - Stepped Panels — Towards House
   - Stepped Panels — Away From House

4. **Grade is metadata, not a BOM input:** The grade field is stored in the project data and appears on quotes/work orders, but it does NOT change the BOM calculation. The same materials are calculated regardless of whether "Level" or "Sloped" is selected. No extra posts, no racking surcharge, no panel type change.

5. **Per-gate grade selection:** Same 5 options available per gate. Also metadata-only.

6. **Grade notes field:** Free-text notes per segment for contractor annotations.

### What this means for Grandview:

VFP's elevation feature is **cosmetic** — a visual aid for the contractor to notice slope, not a calculation engine. The contractor still makes the slope handling decision manually and doesn't get different materials.

**Grandview's opportunity:** Actually wire slope detection into the BOM:
- EPQS (1m lidar) for better accuracy than Mapbox DEM (10m)
- Auto-suggest rackability tier from detected slope
- Change the BOM: add double-punch post surcharge when rackable tier selected
- Different post types or quantities for stepped sections
- This is functionality NO competitor has

---

## BOM Engine — Complete Technical Analysis

### Component Types (22 categories)

Post, Picket/Board, Rail, Cap/Trim, Concrete, Fasteners, Gate Hardware, Post Cap, Kick Board/Rot Board, Gravel, Stringer, Tread, Riser, Bracket/Connector, Handrail, Newel Post, Baluster, Base Plate, Landing Plate, Panel/Insert, Wire/Mesh, Tension Bar

### How BOM Calculates (end-to-end):

```
Input: segment(length, fenceProduct, height, gates[])
  ↓
panelLength = product.panelLength (6ft or 8ft or 10ft)
gateFootage = sum(gate widths)
netFootage = length - gateFootage (if GATE_DEDUCTS_FOOTAGE)
numPanels = ceil(netFootage / panelLength)
  ↓
For each component in product.components:
  → Check spec-driven overrides:
    → Board count: floor(panelWidth / (boardWidth + gap))
    → Fastener count: boards × rails × perBoardPerRail / perBox
    → Concrete: bagsPerPost from footing data by post role
  → totalQty = qtyPerPanel × numPanels
  → materialCost += totalQty × unitCost
  ↓
Add terminal post (+1 per run + concrete)
Add gate posts (+2 per gate + concrete)
  ↓
Apply overrides:
  → $/ft override (flat rate from distributor)
  → Height-specific $/ft rate
  ↓
Add gate costs (from pricing hierarchy)
  ↓
Apply markups:
  → Material markup %
  → Labor markup %
  → Minimum job price floor
  ↓
Return: { parts, partsDetail, materialCost, gateCost, subtotal }
```

### Post Calculation Logic

| Post Type | How it's counted | Concrete |
|-----------|-----------------|----------|
| Line posts | 1 per panel (embedded in component qty) | bagsPerPost.line (1.5 default) |
| Terminal post | +1 per run (explicit addition) | bagsPerPost.terminal or .corner (2 default) |
| Gate posts | +2 per gate (hinge + latch) | bagsPerPost.gate (1 default) |
| Corner posts | **NOT differentiated from line posts** | Not separate |

**Gap:** Corner posts need more concrete and different sizing but VFP treats them as line posts. Grandview can improve on this.

### Pricing Override Hierarchy

1. **Manual component overrides** (contractor edits qty/cost) — highest priority
2. **Height-specific $/ft** (`pricesByHeight[height]`) — overrides component math
3. **Flat $/ft override** (`pricePerFootOverride`) — overrides component math
4. **Component-level calculation** — default (qty × unitCost per panel × panels)
5. **Registry defaults** — base costs from fence-registry.js

### What's NOT in the BOM

- No slope/racking surcharge
- No corner post differentiation
- No waste factor
- No tax calculation
- No freight/delivery
- No wind load structural check
- No post spacing optimization for partial panels
- No manufacturer SKU mapping

---

## Product Registry — Key Data

### Iron/Aluminum Styles (Grandview's direct competitors)

14 styles defined:
1. Flat Top (2-Rail) — 6ft panels
2. Flat Top (3-Rail) — 6ft panels
3. Spear Top (2-Rail)
4. Spear Top (3-Rail)
5. Alternating Spear
6. Puppy Picket — Flat Top
7. Puppy Picket — Spear Top
8. Ring Top
9. Finial Top
10. Majestic (Flush Rail)
11. Genesis (Extended Flat Top)
12. Invincible (Security Spear)
13. Horizontal Slat
14. Double Picket

**Aliases mapped:** Jerith #202, Montage Classic, **UAF-200 (Ultra)**, Freedom Bolton, ActiveYards Dogwood, OnGuard Starling, Ameristar Echelon, Regis 3000, Digger Specialties, etc.

Colors: Black, Bronze, White, Green (4 colors vs Ultra's 8)
Heights: 3-6ft (vs Ultra's 3-10ft for industrial)

### Component Template for Iron/Aluminum

```
Per 6ft panel:
- 1 Post ($0 — cost from POST_OPTIONS lookup by height)
- 15 Pickets @ $2.25 each = $33.75
- 3 Rails @ $4.50 each = $13.50
- 1 bag Concrete @ $5.50
- 1 box Fasteners @ $3.25
Total per panel: ~$56 + post cost
```

**Post pricing (Iron/Aluminum):**
| Type | 5ft | 6ft | 7ft | 8ft |
|------|-----|-----|-----|-----|
| 2" sq Aluminum | $28 | $32 | $38 | $44 |
| 2.5" sq Aluminum | $36 | $42 | $48 | $56 |
| Steel w/ brackets | $22 | $26 | $30 | $36 |

### The `scales` Flag

When a product's panel length differs from its `basePanelLength`, component quantities auto-scale:
```javascript
ratio = panelLength / basePanelLength
adjustedQty = Math.ceil(qty * ratio)
```
This handles non-standard post spacing without manual recalculation.

---

## Features Grandview Should Adopt

### Must-Steal (high impact, not hard to build)

1. **Click-property-side to select fence run** — eliminates freehand drawing. User clicks 3-4 sides and fence layout is done. (Requires Regrid parcel data.)

2. **Per-segment grade dropdown with elevation badge** — show auto-detected elevation change as advisory info, let user manually select slope handling. But GO FURTHER: actually wire it into the BOM as rackability tier.

3. **Good/Better/Best comparison** — generate 3 quotes with different fence styles for the same layout. Instant upsell. One function call.

4. **Manual override system** — let Sarah (or future sales staff) adjust any BOM line item after auto-calculation. Critical for real-world quoting where the formula doesn't handle every edge case.

5. **Post role awareness** — differentiate terminal, gate, and line posts with different concrete amounts. Add corner post differentiation that VFP is missing.

6. **Building codes reference** — state-specific fence height limits, setback rules, pool code requirements. Builds trust and positions Grandview as the expert.

7. **Onboarding tour** — 10-step guided walkthrough for new users. Reduces support load and improves activation.

8. **Tear-out pricing** — configurable $/ft for removing existing fence. Common upsell.

### Should-Steal (medium impact)

9. **Spec cards with engineering data** — visual construction specification cards with dimensional data. Good for quotes and work orders.

10. **Product duplication** — clone an existing product to create a variant. Saves time.

11. **Setback adjustment per segment** — feet from property line. Simple but useful.

12. **Gate swing visualization** — arc showing which way gate opens.

13. **Parcel simplification** — Ramer-Douglas-Peucker to reduce high-vertex parcels while preserving geometry.

14. **Multi-height support** — different fence heights on different sides of the yard. Priced per height.

### Don't-Steal (VFP's approach is worse than ours)

15. **VFP's elevation system** — they use Mapbox DEM (~10m). We should use USGS EPQS (1m lidar). Better data.

16. **VFP's aluminum product data** — generic 4-color, 3-6ft range. We have Ultra's full catalog: 10+ styles, 8 colors, 3-10ft, exact SKUs and prices.

17. **VFP's consumer experience** — they don't have one. We build for homeowners.

18. **VFP's 3D rendering** — they render static product card images. We have real-time Three.js.

---

## How to Add Post Calculation and Rackability — Best Approach

Based on VFP's architecture + our own codebase + Ultra's spec data, here's the optimal approach:

### Post Calculation

```
From drawn/selected segments:

Per segment:
  linePosts = ceil(segmentFeet / 6) - 1  (6ft Ultra panels)
  terminalPosts = 1                       (one end post per segment)
  
Per gate on segment:
  gatePosts = 2 per gate                  (hinge + latch)
  
Corner detection (from polyline geometry):
  cornerPosts = count of vertices where angle < 150°
  (corners need corner-punched posts, not line posts)

Total posts = sum(linePosts) + sum(terminalPosts) + sum(gatePosts) + cornerPosts
```

VFP embeds line posts in the per-panel component (1 post per panel). Grandview should calculate posts separately because Ultra has different post SKUs by type (2" .060, 2" .080, 2.5" .100, 3" .125, 4" .125) and posts are priced independently from panels.

### Rackability

```
Per segment:
  1. Query EPQS for elevation at both endpoints + every 6ft interval
  2. For each 6ft span, compute rise in inches
  3. Classify per span:
     - 0-6" → Standard (no surcharge)
     - 6-20" → Rackable ($4.75/post)
     - 20-36" → Heavy Rack ($4.75/post)
     - >36" → Stepped (flag for Sarah's review)
  4. Per segment, use MAX tier of all spans
  5. Apply to both posts bounding each panel (MAX of adjacent panels)

Auto-default the rackability toggle from EPQS, but keep manual override.
Show VFP-style elevation badge per segment as advisory info.
```

### What Makes This Better Than VFP

| Feature | VFP | Grandview (proposed) |
|---------|-----|---------------------|
| Elevation data | Mapbox DEM ~10m | USGS EPQS 1m lidar |
| Slope as BOM input | No (metadata only) | Yes (changes post SKU + surcharge) |
| Rackability tiers | Not implemented | Standard / Rackable / Heavy Rack |
| Post type by role | Line + terminal + gate | Line + terminal + gate + **corner** |
| Post SKU mapping | Generic ("2" sq Aluminum") | Ultra exact SKU (2" .060 / .080 / .125) |
| Corner detection | Not implemented | Angle-based from polyline geometry |

---

## Technical Details Worth Knowing

### Parcel API

```
GET /api/get-parcel?lat={lat}&lng={lng}
Response: {
  ok: true,
  data: {
    boundary: { type: "Polygon", coordinates: [[lng,lat], ...] },
    address: "123 Main St",
    owner: "John Doe",
    parcelId: "12-34-56-789",
    lot: "12",
    block: "3",
    subdivision: "Oak Hills",
    dataQuality: 0.85,
    provider: "server",
    raw: { ... }
  }
}

GET /api/get-parcel?lat={}&lng={}&mode=neighbors&radius=300
Response: { ok: true, neighbors: [...] }
```

### Mapbox Terrain Elevation Query

```javascript
map.addSource('mapbox-dem', {
  type: 'raster-dem',
  url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
  tileSize: 512,
  maxzoom: 14
});

var elevMeters = map.queryTerrainElevation(
  new mapboxgl.LngLat(lng, lat)
);
var elevFeet = elevMeters * 3.28084;
```

### Grade Classification Thresholds

| Grade % | VFP Label | Color |
|---------|-----------|-------|
| <0.5ft change | Hidden | — |
| 0-4% | Gentle | Green |
| 4-8% | Moderate | Amber |
| >8% | Steep | Red |

For reference: Ultra's rackability thresholds at 6ft panel width:
- 6" / 72" = 8.3% (Standard limit)
- 20" / 72" = 27.8% (Rackable limit)
- 36" / 72" = 50% (Heavy Rack limit)

VFP's "Steep" threshold (>8%) roughly aligns with Ultra's Standard→Rackable boundary. This is likely coincidental but convenient.

---

## Files Downloaded for Reference

All saved to `C:/Users/sarah/Desktop/vfp-capture/sourcemaps/`:

| File | Lines | Contents |
|------|-------|----------|
| `bom-engine.js` | 477 | BOM calculation engine |
| `fence-registry.js` | 2,854 | 100 styles, components, specs, pricing |
| `spec-data.js` | 748 | Spec card generation, gate/industrial specs |
| `config.js` | 35 | Configuration defaults |
| `parcel-service.js` | 280 | Parcel API client + geometry helpers |
| `app.html` | 5,208 | Complete estimator (map, drawing, sidebar, BOM) |
| `user-guide.html` | 1,780 | 12-section user guide |
| `public-estimator.html` | 706 | Embeddable widget for contractor sites |

**Total: ~12,088 lines of production code analyzed.**

---

*Screenshots saved to `.playwright-mcp/` directory: login, onboarding, estimator map, products admin, specs library, building codes, work orders, settings, user guide.*
