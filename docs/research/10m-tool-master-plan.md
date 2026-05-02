# $10M Fence Tool Master Plan — Competitive Research + UX Playbook + Architecture

**Date:** 2026-04-16
**Scope:** Every fence configurator/draw tool worldwide, best UX patterns from each, AR feasibility, GPS boundary tech, codebase gaps, and a phased plan to build the best fence ordering tool in the market.

---

## Revenue Math

$10M/year at $3,500 average order = **2,857 orders/year = 238/month = ~8/day**.
At 3% conversion rate, that requires **7,936 unique configurator sessions/month**.
At $15–25 CPC for fence keywords, ad spend = ~$120K–$200K/year.
**The tool's job:** convert every possible session. Every friction point costs ~$3,500.

---

## Part 1: Complete Competitive Landscape (56 tools scanned)

### A) Map-Draw Tools (draw on satellite → materials/quote)

| Tool | Auto-calc posts? | Handles slope? | Instant cart? | Contact gate? | Notable UX |
|------|-----------------|----------------|---------------|---------------|------------|
| **America's Fence Store** | Yes | No | Yes (Shopify) | No | Hold-to-draw, dual mode (map+canvas), "Remove Trees" toggle |
| **Visual Fence Pro** | Yes (91 styles) | Unknown | No (branded quotes) | No signup for demo | Click property sides to auto-place runs, branded quote portal |
| **See My Fence** | Yes | Unknown | No | No | Auto-detects property boundaries, "no sales calls, just transparent costs" |
| **WamBam Fence** | Yes | Unknown | Links to store | No | Manufacturer-direct, satellite draw, recommends desktop |
| **Cascade Fence** | Implied | Unknown | No (estimate) | No | "No forms, no phone calls," multiple fence lines, trash icon delete |
| **Diversified Fence** | Implied | Unknown | No | Yes (post-estimate) | ASP.NET, supports wood/vinyl/chain-link/aluminum |
| **Catalyst/CertainTeed** | Estimated | Unknown | No | Unknown | **AR tool launching Spring 2026** — walk property, real-time overlay |
| **mySalesman/myBudgetQuote** | Yes (backend) | Unknown | No (lead gen) | Yes | White-label SaaS, 15+ fence companies, instant budget range |
| **MAPQX** | Yes | Unknown | No | Unknown | Custom formula engine, multi-industry (fence/roofing/solar) |
| **Fence Drawing Tool** | Configurable | Unknown | No | Yes | White-label widget, monthly flat fee, no dev team needed |
| **Bekaert** | Yes | Unknown | Unknown | No | Google Earth-based, agricultural/ranch fencing |
| **Clipex (AU)** | Yes | Unknown | Unknown | Unknown | Google Maps, Australian agricultural market |

### B) 2D/3D Configurators (visual builder → materials)

| Tool | Auto-calc? | Slope? | Cart? | Notable |
|------|-----------|--------|-------|---------|
| **Fencing Direct** | Yes | No | Yes (one-click) | Save quote, PDF download, email-to-friend |
| **Discount Fence Supply** | Yes (to screws) | **YES** | Yes (one-click) | **Only tool that handles slope/racking AND goes to cart** |
| **SGC Products** | Yes | No | Yes | Guest demo login, mix composite + aluminum |
| **MyConfigurator (EU)** | Yes | Unknown | No (PDF) | Full 3D, AR, exports DXF/GLB, enterprise-grade |
| **Betafence** | Yes | Unknown | Unknown | Upload YOUR photo, place fence on it |
| **Ultra Fence Estimator** | Yes | No | No (dealer referral) | Generates materials list, no pricing |
| **Peak Products** | Yes | Unknown | Unknown | 3D visualization, sold via Home Depot Canada / Bunnings |
| **Simpson Strong-Tie** | Yes | Unknown | No | 2D+3D, building code guidance, recommends hardware |

### C) Form-Based Calculators

| Tool | Notable |
|------|---------|
| **Hoover Fence** | Gold standard — 5-step calculator, "Pretty Darn Good" disclaimer, per-stretch entry |
| **Home Depot** | Guided wizard, links to products |
| **Menards** | "Design & Buy" implies direct purchase |
| **Duramax Fences** | Accommodates slopes, turns, landscaping features |

### D) White-Label Platforms

| Platform | Customers | Model |
|----------|-----------|-------|
| **mySalesman/myBudgetQuote** | 15+ fence companies | Lead gen SaaS, aerial draw, budget quote |
| **FenceDrawingTool.com** | Unknown | Monthly flat fee, no dev team needed |
| **Visual Fence Pro** | Unknown | SaaS, branded quotes, 91 styles |
| **MAPQX** | Multi-industry | Custom formula engine, white-label PDFs |
| **MyConfigurator (EU)** | Enterprise | Full 3D, API integration, DXF export |

### E) AR/Emerging

| Tool | What it does | Status |
|------|-------------|--------|
| **Catalyst AR** | Walk property with homeowner, real-time fence overlay, estimate on spot. 35–40% faster decisions, 75–80% close rates | Launching Spring 2026 |
| **RealityFence** | Native AR app, 4,500 users, 44% sales increase. v9 added voice-powered sketches | Live, $200/mo |
| **Betafence** | Photo upload → fence overlay, 6 languages, mobile app | Live |
| **Trex AR** | Detect surfaces, drag deck model, mini-mode for indoor. Generates permit-ready blueprints | Live, best-in-class outdoor |

### F) GPS Boundary Products (dog collars — UX patterns only)

| Product | Boundary method | GPS accuracy | Transferable pattern |
|---------|----------------|-------------|---------------------|
| **SpotOn** ($1,295) | Walk + Draw + Hybrid. Post every 5ft. 1,500 max posts. | 2.3ft avg (Spirent tested) | Tap-to-place vertex model, drag to edit, hybrid walk+draw |
| **Halo Collar** ($524) | **Auto-generate from property lines** + Drop pins + Walk | 1.4ft claimed, 4–10ft real | One-tap boundary from address, L1+L5 dual-band, Skylark corrections |
| **Tractive** ($79) | Drag circle/square, 50m minimum radius | Phone-grade (~10–30m) | Nothing worth copying |
| **Fi** (~$150) | Draw zones on map | Phone-grade | Nothing worth copying |

**Critical insight:** SpotOn/Halo GPS precision is irrelevant to Grandview. Their users need real-time pet tracking; your users are tapping on a satellite photo. A homeowner tapping on a zoomed satellite image achieves **2–5ft precision for free** by aligning to visible landmarks. Better than Halo, comparable to SpotOn, zero hardware cost.

---

## Part 2: Best Practices Playbook — What to Steal from Each

### Drawing UX

| Pattern | Source | Why it works | Priority |
|---------|--------|-------------|----------|
| **One-tap boundary from property lines** | Halo Collar | Eliminates blank-canvas paralysis. 80% of fences follow property lines. One tap = done. | MUST HAVE |
| **Click-to-place vertex** (not freehand draw) | Cascade, SpotOn | 5 clicks = complete perimeter. No gesture ambiguity. Users already know this from Google Maps. | MUST HAVE |
| **Click property sides to auto-place runs** | Visual Fence Pro | Users click 3–4 property line segments and the tool calculates exact footage from parcel geometry. | MUST HAVE |
| **Draw mode toggle for mobile** | Map UX research | Solves pinch-zoom vs drag-vertex conflict. "Navigate" mode vs "Draw/Edit" mode. Auto-exit after 3s inactivity. | MUST HAVE |
| **Satellite + "Remove Trees" toggle** | America's Fence Store | Hides foliage overlay so property lines and structures are visible. | NICE TO HAVE |
| **Dual mode (map OR blank canvas)** | America's Fence Store | For customers without good satellite imagery, or who prefer abstract layout. | PHASE 2 |
| **Landscape objects (house, pool, shed)** | America's Fence Store | Context objects help position fence correctly. | PHASE 2 |

### Material Calculation

| Pattern | Source | Why it works |
|---------|--------|-------------|
| **Real-time BOM as you draw** | Visual Fence Pro | Panel count, post count, and running cost update per segment as user draws. Eliminates "submit and wait" anxiety. |
| **Professional bay calculation** (exact inches, not rounded) | Discount Fence Supply | Same math pros use. When calculation is right, trust is earned. |
| **Slope/racking in the calculator** | Discount Fence Supply | Only tool that adjusts panel type for grade. Everyone else ignores slope → wrong parts. |
| **Per-segment style selection** | Visual Fence Pro | Different fence styles on different sides of the yard. Increases AOV. |
| **"Down to screws" BOM detail** | Discount Fence Supply | Concrete bags, brackets, screws — every component. Professional accuracy = professional trust. |

### Pricing & Checkout

| Pattern | Source | Why it works |
|---------|--------|-------------|
| **Zero-gate instant price** | Cascade | No email, no phone. Draw → see price. Highest trust model. |
| **One-click BOM-to-cart** | Discount Fence, Fencing Direct, America's Fence Store | One button adds every item. Cart becomes a saved quote. |
| **Show range instantly, gate exact quote** | mySalesman | Hybrid: "$X–$Y for your project" free, "Get exact quote emailed" for contact info. Value exchange. |
| **BNPL (Affirm/Klarna)** | E-commerce best practice | $2K–$15K fence orders need financing. BNPL reduces sticker shock, especially mobile. |
| **Branded quote portal** | Visual Fence Pro Enterprise | B2B: customer gets branded page with satellite map, fence lines, BOM, sign-and-pay buttons. |
| **Cart = saved quote** | Discount Fence Supply | Dual purpose. Users can return later. Add abandoned-cart email (recovers 5–15%). |

### 3D/AR Visualization

| Pattern | Source | Feasibility | Priority |
|---------|--------|-------------|----------|
| **Photo simulation** (upload photo, overlay fence) | Betafence | Easy — any browser, any device, no camera access. Output shareable on social. | PHASE 2 |
| **WebXR fence preview** (browser AR, no app install) | WebXR spec 2026 | Feasible for simple placement. 60% engagement vs 12% native app. Shareable via URL/QR. | PHASE 2 |
| **Existing 3D configurator** | Grandview (already built) | Already production-ready. 8 gate styles, HDR, PBR materials. Major differentiator vs all competitors. | DONE |
| **AR mini-mode** (design on table indoors) | Trex | Removes "must be outside" limitation. Good for evening/weather. | PHASE 3 |
| **Native AR for contractor sales** | Catalyst, RealityFence | 75–80% close rates. But requires native app. Contractor-facing only. | PHASE 3 |
| **Blueprint/permit generation** | Trex, Simpson | Generates PDF with dimensions for building department. Trust signal + practical value. | PHASE 3 |

### Mobile UX

| Pattern | Source | Why it works |
|---------|--------|-------------|
| **Draw mode toggle** | Map UX research, Leaflet issues | Floating button: "Navigate" vs "Draw." Prevents gesture conflict. |
| **44×44px touch targets** (64×64px hit area) | Apple HIG, Terra Draw | Large vertex handles with invisible expanded hit area. Accommodates finger imprecision. |
| **Snapping** (to coordinate, to property line) | Terra Draw | Auto-corrects near-misses. Reduces frustration from imprecise taps. |
| **Progressive disclosure** (measure → style → quote) | Peak Products | 3-step workflow that works on small screens. 3D optional via dedicated icon. |
| **Desktop-first is dead** | Industry data | Mobile is 70%+ of traffic but converts 1–2% vs desktop 2–4%. Tool that nails mobile captures market everyone else abandoned. |

### Trust & Conversion

| Pattern | Source | Impact |
|---------|--------|--------|
| **Reviews on checkout page** | CrazyEgg research | Displaying reviews increases conversion up to 270%. |
| **Money-back guarantee badge** | E-commerce best practice | 61% abandon when trust logos missing. |
| **"Same math professional estimators use"** | Discount Fence Supply | Professional accuracy = professional trust. |
| **Shipping/delivery timeline visible** | E-commerce best practice | "Ships in 2 weeks" removes uncertainty. |
| **Expert review badge** | Grandview's differentiator | "Every order reviewed by a fence expert before production." No competitor does this. |
| **Veteran-owned badge** | Grandview's differentiator | SDVOSB, veteran-owned, woman-owned. Trust signal + government market. |

### Property Intelligence

| Pattern | Source | Implementation |
|---------|--------|---------------|
| **Regrid for parcel boundaries** | Regrid API | 150M+ US parcels. GIS polygon geometry. ~$0.01/lookup. Best for boundary polygons. |
| **One-tap boundary generation** | Halo Collar | Query Regrid on address entry → render parcel polygon → highlight rear+side segments as "suggested fence." User taps to confirm or drags to adjust. |
| **USGS EPQS for elevation** | USGS | Free, no key, 1m lidar where available. Replace Google Elevation. |
| **Satellite imagery for ground truth** | Every successful tool | Google Maps or Mapbox satellite. Users verify boundaries + identify obstacles visually. |

---

## Part 3: What Grandview Already Has (Codebase Scan)

### Already Production-Ready

| Component | Lines | Status | Key capabilities |
|-----------|-------|--------|-----------------|
| **DrawYardView.js** | 1,869 | PROD | Google Maps satellite, click-to-place, elevation API, slope classification, gate placement, undo/redo, draggable vertices, per-segment distance labels |
| **QuoteBuilder** (6 steps) | 1,840 | PROD | Style/config, layout/posts, gates, extras, shipping, review. Pool compliance smart defaults. |
| **Pricing engine** | 1,251 | PROD | Ultra May 2025 price book, per-model/grade/height lookup, $4.75 double-punch, silver premium, gate surcharges |
| **3D Renderer** | 1,592 | PROD | Three.js r86, 8+ gate styles, HDR+PBR, finials, accents, puppy pickets, height clipping, mount types |
| **Landing page** | 281 | PROD | Hero, testimonials, trust signals, CTA |
| **Multi-zone wizard** | 991 | PROD | Front/back/gate zones, per-zone quotes, transitions, grand total |
| **Quiz/lead capture** | Multi | PROD | Matching engine, email gate, personalized recommendations |
| **Analytics** | 46 | FUNC | 9 event types, sendBeacon, session tracking |
| **Assets** | 99+ | PROD | Education images, iFence previews, backgrounds |

### Gaps / What's Missing

| Gap | Impact | Effort |
|-----|--------|--------|
| **No payment/checkout** | Can't take money | 1–2 weeks (Stripe) |
| **No property line overlay** | User draws from scratch on blank map | 1 week (Regrid API) |
| **No "suggest fence from property" one-tap** | Blank canvas paralysis on mobile | 1 week |
| **Mobile drawing is broken** | 70% of traffic can't use the tool | 2 weeks (draw mode toggle, touch targets) |
| **Google Elevation unreliable** | Sloped yards reported as flat | 2 days (swap to EPQS) |
| **Two pricing engines coexist** | Potential pricing bugs | 1 day to audit, 2 days to consolidate |
| **slopedPostCount is dead code** | Racking surcharge always applies to ALL posts | 1 hour fix |
| **Draw tool slope data doesn't flow to QuoteStep2** | Racking tier never auto-defaults from drawing | 1 day |
| **No photo upload** | Can't verify site conditions | 2 days (Cloudflare R2) |
| **No BNPL** | $3,500+ orders need financing | 1 day (Affirm/Klarna widget) |
| **No abandoned cart recovery** | Losing 5–15% of near-conversions | 2 days |
| **No AR/photo simulation** | Missing visualization differentiator | 2–4 weeks (Phase 2) |
| **Admin CRM not git-tracked** | Changes can be lost | 10 minutes |

### Known Code Contradictions

1. **`slopedPostCount` is dead code** — referenced in `priceCalculator.js:164`, never written anywhere. Falls through to `totalPosts` every time.
2. **Two pricing engines** (`priceCalculator.js` and `pricingEngine.js`) with different racking logic. Must audit which one QuoteStep6 actually calls.
3. **`rackingTier` and `slopeMethod` are independent** — user can select `rackable` tier + `stair-stepped` method, which is contradictory. No enforcement.
4. **Draw tool segment slope data never reaches QuoteStep2** — one-way flow, racking tier never auto-defaults.
5. **Admin app is not git-tracked.**

---

## Part 4: AR Feasibility Assessment

### WebXR (Browser-Based AR) — 2026 Status

- **Simple object placement on detected surfaces:** Works at 60fps on modern phones (iOS 16.4+, Android Chrome 120+). Sufficient for "see this fence panel in your yard."
- **Complex scene rendering:** 35–45fps WebXR vs 60fps native. Acceptable for fence preview but not for measurement.
- **Key advantage:** Engagement jumps from 12% (native app requiring install) to **60%** (WebXR, no install). Shareable via URL/QR code.
- **Limitations:** No detailed mesh mapping, no full occlusion (fence won't disappear behind a tree), no LiDAR integration in browser.
- **Library:** `@three/xr` (Three.js WebXR integration) — fits Grandview's existing Three.js stack.

### Photo Simulation (Non-AR Alternative)

- **How Betafence does it:** Upload a photo → position fence on the ground plane → adjust distance/height to match perspective → render fence in the photo.
- **Advantages over AR:** Works on any device, any browser, no camera access needed. Output is a shareable image. Zero technical barriers.
- **Implementation:** Overlay a perspective-corrected 2D fence rendering on the user's uploaded photo. Use vanishing-point estimation from the photo for perspective matching.
- **Effort:** 2–3 weeks.

### Native AR App (Contractor-Facing)

- **Catalyst model:** Walk property with homeowner, real-time fence overlay, generate estimate on spot. 75–80% close rates in testing.
- **RealityFence model:** $200/mo subscription, 4,500 users, voice-powered sketches. 44% sales increase.
- **Effort:** 3–6 months for a production-quality native app.
- **Recommendation:** Phase 3. Focus on consumer web tool first. Consider partnering with RealityFence for contractor sales rather than building native.

### Recommendation

**Phase 2:** Photo simulation (Betafence model). Low effort, works everywhere, shareable output.
**Phase 2.5:** WebXR "fence preview" — no install, shareable via URL. Builds on existing Three.js.
**Phase 3:** Evaluate native AR only after web tool is at $5M run rate.

---

## Part 5: The $10M Plan — Phased Implementation

### Phase 1: Ship Instant Checkout (Weeks 1–3) — Target: First paid order

**The minimum viable monetizable tool:**

1. **Stripe Checkout with auth-then-capture** — Cloudflare Worker, dynamic BOM as line items, Sarah captures after review. Partial capture (no refund needed). 1–2 weeks.
2. **Swap Google Elevation → USGS EPQS** — in DrawYardView.js, same function signature. 2 days.
3. **Wire draw-tool slope data to QuoteStep2** — auto-default racking tier from what the customer drew. 1 day.
4. **Fix slopedPostCount dead code** — wire it or delete the fallback. 1 hour.
5. **Consolidate pricing engines** — audit which one runs, kill the other. 2 days.
6. **Add rackability toggle** — single "my yard has slope" checkbox, defaults from EPQS. $4.75 × posts. 1 day.
7. **Calculator-only bypass** — form for customers who know footage. Skip map. Same pricing engine. 2 days.
8. **6 CYA validation touchpoints** — draw start banner, slope tooltip, quote summary card, checkout checkbox, confirmation email, how-to link. 1 day.
9. **EPQS flag in sales email** — bold red warning when EPQS disagrees with customer selection. 2 hours.
10. **5% footage padding** — multiply computed footage × 1.05. Round panels up. 30 minutes.

**Exit criteria:** Customer can draw → see quote → pay → Sarah reviews → captures payment → orders from Ultra.

### Phase 2: Mobile + Intelligence + Trust (Weeks 4–8) — Target: 50 orders/month

**Make the tool work on phones and feel premium:**

11. **Regrid parcel boundary overlay** — auto-load property lines on address entry. ~$0.01/lookup. 1 week.
12. **One-tap "suggest fence"** — highlight rear+side property lines, user taps to confirm. Halo Collar model. 1 week.
13. **Mobile draw mode toggle** — floating "Navigate / Draw" button. Lock map when editing. 3 days.
14. **44×44px vertex touch targets** — large handles, 64×64 hit area, snapping. 2 days.
15. **Real-time BOM feedback** — panel count, post count, running cost update as user draws. 3 days.
16. **Photo upload on checkout** — optional, stored in Cloudflare R2, shown in Sarah's admin. 2 days.
17. **BNPL integration** — Affirm or Klarna for orders over $2,000. 1 day.
18. **Abandoned cart email sequence** — Resend API, 3 emails over 7 days, resume link. 2 days.
19. **Photo simulation** — upload yard photo, overlay fence rendering. Betafence model. 2–3 weeks.
20. **Trust signals on checkout** — reviews, veteran-owned badge, money-back guarantee, "expert reviewed" badge. 1 day.

**Exit criteria:** Mobile conversion rate within 1% of desktop. 50+ orders/month. Abandoned cart recovery pulling 5–15%.

### Phase 3: Differentiation + Scale (Weeks 9–16) — Target: 100+ orders/month

**Features that no competitor has:**

21. **WebXR fence preview** — no-install browser AR. Point phone at yard, see fence. Shareable URL. 3–4 weeks.
22. **Per-segment style selection** — different fence styles on different sides. Increases AOV. 1 week.
23. **Contractor/wholesale portal** — Stripe Invoicing, ACH payments (0.8%), net-30 terms. SDVOSB/government channel. 2 weeks.
24. **Blueprint/permit PDF generation** — dimensions, post locations, materials list. Trex model. 2 weeks.
25. **Building code guidance** — pool code, height restrictions, setback rules by jurisdiction. Simpson model. Ongoing.
26. **"Remove Trees" satellite toggle** — hide foliage overlay. America's Fence Store model. 1 week.
27. **Landscape objects** — drag house, pool, shed onto map for context. 1 week.
28. **White-label capability** — power other fence dealers' sites. mySalesman/VFP model. Major revenue multiplier. 4–6 weeks.

**Exit criteria:** 100+ orders/month. Contractor channel live. White-label pipeline started.

### Phase 4: Market Dominance (Months 5–12) — Target: $10M run rate

29. **Native AR app for contractor field sales** — RealityFence/Catalyst competitor. 3–6 months.
30. **AI-powered voice sketch** — describe fence, AI generates layout. RealityFence v9 model. 2–3 months.
31. **Multi-material support** — vinyl, wood, chain-link (not just aluminum). Expands TAM 5×.
32. **Custom formula engine for white-label** — each dealer sets own margins. MAPQX model. 2–3 months.
33. **SEO product pages** — browsable catalog for organic traffic. Consider Shopify as catalog (Stripe stays for tool checkout).
34. **National installer network** — connect DIY customers with local installers. Two-sided marketplace.

---

## Part 6: Drawing Library Recommendation

### Terra Draw (terradraw.io)

**Why this over Google Maps Drawing Manager (deprecated) or Leaflet Draw:**

- Supports **Google Maps, Mapbox, MapLibre, OpenLayers, and Leaflet** — no vendor lock-in.
- **Touch device support** built in — solves the mobile gesture conflict.
- **Polygon mode with vertex snapping** — `toCoordinate`, `toLine`, `toCustom` snap modes.
- **Coordinate point rendering** at each vertex — visible dots for editing.
- **Select mode** for post-draw editing — drag, delete, add vertices.
- **Open source** (MIT license), actively maintained.

**Migration path:** Grandview currently uses Google Maps JS API with manual marker management in DrawYardView.js. Terra Draw wraps Google Maps and adds drawing primitives. The migration is additive, not a rewrite — keep the map, add Terra Draw for the drawing layer.

**Alternative:** Mapbox GL JS + Mapbox Draw. Better satellite imagery, better mobile performance, but vendor-locked and Mapbox pricing is per-tile-load (can get expensive at scale).

---

## Part 7: Property Line Data — Regrid vs Alternatives

| Provider | Coverage | Data quality | Cost | API | Best for |
|----------|----------|-------------|------|-----|----------|
| **Regrid** | 150M+ US parcels | GIS-native polygons, ownership, zoning | ~$0.01/lookup, free trial | REST, GeoJSON response | **Boundary polygons (recommended)** |
| **ATTOM** | 160M properties | Tax, deed, valuation, boundaries | Enterprise pricing | REST | Property valuations, lead scoring |
| **LightBox** | 300+ attributes | Commercial-focused | Enterprise | REST | Commercial real estate |
| **County GIS** | Per-county | Varies wildly | Free | WMS/WFS (varies) | Michigan-specific (cheap) |

**Recommendation:** Regrid for parcel boundaries. Free trial to validate, then ~$0.01/lookup at scale. At 8,000 sessions/month = ~$80/month.

---

## Key Findings (5 bullets)

1. **Nobody combines satellite draw + 3D visualization + slope intelligence + instant checkout.** Grandview can be the first. America's Fence Store has draw+cart but no 3D, no slope. Discount Fence Supply has slope+cart but no draw. Visual Fence Pro has draw+BOM but no cart. The full stack doesn't exist yet.

2. **Mobile drawing is the industry's biggest unsolved problem.** WamBam, Fencing Direct, and Simpson all explicitly say "desktop only." The tool that nails mobile drawing captures 70% of traffic that every competitor abandons. Draw mode toggle + large touch targets + property-line-first (not blank canvas) solves this.

3. **One-tap boundary from property lines is the killer UX feature.** Halo Collar proved it for pet fences. Visual Fence Pro does it for fence contractors. Zero consumer fence tools do it. Enter address → Regrid loads parcel → highlight rear+side lines → user taps "Yes, fence here" → done. 5 seconds to a complete fence layout.

4. **Photo simulation beats AR for consumer self-service today.** WebXR works but has limitations. Photo upload + fence overlay works everywhere, requires no camera access, produces shareable images. Betafence proves the model. Build this before AR.

5. **Stripe + auth-then-capture is the checkout architecture.** Partial capture (charge less than authorized) eliminates the refund workflow entirely. Sarah authorizes $7,000, reviews, captures $6,500. No customer notification of "adjustment." America's Fence Store uses Shopify, but their SKU-catalog model doesn't fit Grandview's dynamic BOM approach.

## Recommended Approach for Grandview

**Week 1–3:** Ship Stripe checkout + EPQS swap + calculator bypass + mobile draw fixes. First paid order.
**Week 4–8:** Regrid property lines + one-tap suggest + photo simulation + BNPL + abandoned cart. 50 orders/month.
**Week 9–16:** WebXR preview + contractor portal + blueprint PDF + white-label foundation. 100 orders/month.
**Month 5–12:** Native AR + multi-material + white-label + installer network. $10M run rate.

The moat is the full stack: **draw on map + auto-detect property lines + slope intelligence + 3D preview + photo simulation + instant checkout with expert review.** No one has all of these. Build them in order of revenue impact, not technical coolness.

---

*Sources: 56 fence tools scanned across 8 countries; SpotOn/Halo/Tractive/Fi GPS boundary products; Catalyst/RealityFence/Betafence/Trex AR products; WebXR spec analysis; Terra Draw, Regrid, MAPQX documentation; e-commerce conversion benchmarks from Nector, CrazyEgg, FunnelFlex, DTC Pages. Full URLs in companion docs `post-rackability-research.md` and `how-to-measure-yard-for-fence-guide.md`.*
