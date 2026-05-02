# Post & Rackability Research — Grandview Fence

**Date:** 2026-04-15
**Scope:** Research-only. How competitor fence companies handle post calculation and rackability in online ordering/quoting; how rackability should actually be measured; what elevation/terrain APIs can (and cannot) deliver for automated slope detection; and options for Grandview's tool.
**Product reference:** Ultra Aluminum rackability tiers — Standard (0–6" per 6' panel), Rackable (0–20" per 6' panel), Heavy Rack (0–36" per 6' panel). Ultra charges nothing extra on panels; Grandview's ~$4.75/post upcharge covers install labor and drilled-hole precision.

---

## Part 1: Competitor Analysis

### GreatFence.com (defunct — Wayback archive)
- **URL:** https://greatfence.com (captured 2024–2025 via web.archive.org)
- **Ordering:** Yes — fully direct-to-consumer e-commerce with cart and checkout.
- **Prices shown:** **Exact.** Each size/height permutation priced individually (e.g., "6′ wide × 4′ high with 3 horizontal rails (+$104.17)"). "Click For Pricing" buttons populate $0.00 placeholders until an option is selected (classic WooCommerce pattern).
- **Post handling:** **Manual (B).** Posts are completely separate SKUs — line, corner, end, 3-way (T), gate, blank, and blank-for-heavy-rack posts. Panel product page explicitly says "Pricing Per Panel (posts sold separately)." Customer must count and order each post type. A "POST CHART" illustrated image and shop-drawing diagrams guide them; a "Next Step" banner after panel selection links to the posts category.
- **Rackability handling:** **Per-panel dropdown (B) — the standout finding.** On every panel product page there is a required "Panel Terrain Configuration" dropdown:
  - "Standard: install straight or rack up to 6 inches PER PANEL ($0.00)"
  - "Rackable: install straight or rack up to 20 inches PER PANEL ($0.00)"
  - "Heavy Rackable: install straight or rack up to 36 inches PER PANEL ($0.00)"
  Educational text: "Each option determines the size of the factory-routed, picket-to-rail holes. If your property is flat, choose Standard." Heavy Rackable requires a different post type (Blank + Vertical Swivel Mount) and the configurator warns about this. The user can **mix rack types across a single order** — 10 Standard panels and 3 Rackable panels for one sloped stretch. Puppy pickets, butterfly scrolls, and rings reduce available racking and the page surfaces this: "Adding Butterfly Scrolls or Puppy Pickets will only allow this fence panel to rack for slight slopes."
- **Terrain detection:** **None.** No map, no elevation probe, no auto-detection. The knowledge-base article `racking-fence-panels-for-hills-stairs` instructs the user to walk the property and identify "any short spans (6 or 7 foot spans) that have a rise or fall of more than 6 inches." If so, order some panels as Rackable or Heavy Rackable.
- **Notes:** **Reference model for the category.** Rack level maps directly to a physical SKU difference (wider factory-routed holes), so the customer's choice isn't soft advice — it determines what ships. Paired with an optional "Quote Form" for customers who want humans to draw up a material list from a hand-drawn sketch (explicitly "DO NOT USE GRAPH PAPER"). The sketch path offloads post counting to an employee.

### iFenceUSA.com (Integrity Aluminum / Specrail)
- **URL:** https://www.ifenceusa.com
- **Ordering:** Quote-only.
- **Prices shown:** None.
- **Post handling:** **Hybrid (D).** Online "Fence Quote" form asks for "Total Linear Feet Including Gates," offers a radio for "Post-To-Post / Continuous," and a radio for "Posts Needed / Already Have Posts / Both." Does NOT ask for corner/end/line counts — staff work those up from a follow-up sketch. Separate "gates-only direct-mount" path where the user indicates they already have posts.
- **Rackability handling:** **Not asked in the quote form (D).** SmartRail System page advertises panel rackability as a product feature, but intake form has no racking field. Resolved via sales consultation.
- **Terrain detection:** None.
- **Notes:** iFenceUSA offers an "iDesign™ Studio" — but it's a **yard visualization / color-and-style tool only**, not a materials calculator. Good model for what a "look-and-feel" configurator is, separate from a quote flow.

### AluminumFencesDirect.net
- **URL:** https://aluminumfencesdirect.net
- **Ordering:** Quote-first, with a paid online "Order Form" path after quote confirmation.
- **Prices shown:** Range — "Aluminum fence pricing starts as low as $69 per panel."
- **Post handling:** **Manual (B) with full item-by-item form.** The `afd-order-form/` page asks the customer to enter quantities for: 2" Line Posts, 2" End Posts, 2" Corner Posts, 2" Blank Posts, 2" Gate Blank Posts, 2" Gate End Posts, 2.5" Gate End Posts, 3" Gate End Posts — plus line-item Qtys for single gates (3'/4'/5'/6' etc.), double gates, estate gates. Each line has a tooltip describing the use case. "Confused? Let us help" routes to the sketch/layout form.
- **Rackability handling:** **Yard-wide configuration note, not per panel (C).** Marketing copy: "residential-grade sections can rack 16 inches for every 6-foot panel, or up to 29 inches with our free double-punched option." Double-punching offered as a free upgrade, effectively binary ("standard vs double-punched"), selected in conversation or on the layout form, not per panel.
- **Terrain detection:** None.
- **Notes:** Three parallel intake paths: (1) Online Order Form, (2) Online Layout Form (sketch), (3) Downloadable fax-in PDF. The post-counting UX is educational — field labels explain what each post type is for.

### CatalystFence.com
- **URL:** https://www.catalystfence.com
- **Ordering:** No direct online ordering — manufacturer-style lead routing only.
- **Prices shown:** None.
- **Post handling:** **Not asked (C).** "Request a Quote" form captures contact info, ZIP, and customer type (Homeowner / Contractor / Architect / Dealer / Other). No footage, no posts, no slope. Leads routed to dealers via "Where to Buy."
- **Rackability handling:** **Not asked (D).**
- **Terrain detection:** None.
- **Notes:** Catalyst advertises a "Fence Finder Quiz" but interactive content didn't render through scraping (JS gated). Classic manufacturer hand-off funnel. Negative example: 100% of material takeoff delegated to dealer network.

### SleekFence.com
- **URL:** https://sleekfence.com
- **Ordering:** Hybrid — direct online purchase of individual panels, plus a quote-request path. Privacy panels show exact prices ($772.99, etc.).
- **Prices shown:** Exact per SKU on shop pages; budget quote tool generates a budget estimate after mapping.
- **Post handling:** **Auto (A) via mapping tool, else manual B for shop checkout.** Their "SLEEKFENCE Aluminum Fence Cost Calculator" is a third-party product — **mySalesman / mybudgetquote.com** at `sleekfenceinc.mybudgetquote.com/budget`. 5-step Leaflet + Google Maps flow: (1) Contact info, (2) Find location, (3) Draw polyline on satellite map, (4) Design (panel style/color/accessories), (5) Get quote (auto-calculated materials). The tool infers number of panels and posts from the drawn polyline automatically.
- **Rackability handling:** **Not asked in the mapping tool (D).** No per-panel rack picker.
- **Terrain detection:** **Google Maps overhead drawing (A) for length only.** Uses Google Maps satellite imagery — but only 2D; no elevation probe. Slope is not auto-detected, just lengths.
- **Notes:** mySalesman/mybudgetquote is a white-label configurator used by many mid-market fence contractors. Worth copying: 5-step wizard structure, "Draw on a map" input, mandatory contact info gate before seeing the estimate. Worth avoiding: no slope handling at all — the same gap Sarah's tool must fill.

### FenceTown.com
- **URL:** https://www.fencetown.com
- **Ordering:** Quote-only.
- **Prices shown:** None publicly.
- **Post handling:** **Not asked in intake (C→D).** They request a "basic line drawing" and handle counts internally.
- **Rackability handling:** **Educational content only — no user input field (D).** The `/hills-and-slopes/` and `/aluminum-fence-panel-racking/` pages are brand-by-brand reference tables: Ultra 0–6" standard / 0–20" double-punched / 0–36" triple-punched; OnGuard 9" standard / 16" double-punched; Elite similar. Double-picket and puppy-picket panels rack roughly half. Customers are expected to absorb this content.
- **Terrain detection:** None.
- **Notes:** Reference content is outstanding — essentially tells customers how much each brand accommodates. Worth copying: that racking chart by brand/punch level. Worth avoiding: zero automation. Consultative 24-hour-response model is the historical industry default.

### QuickShipAluminumFence.com
- **URL:** https://www.quickshipaluminumfence.com
- **Ordering:** Unclear — Shopify collection pages returned near-empty for anonymous scraping, suggesting JS-gated storefront.
- **Prices shown:** Marketing claims "below-market prices." Unable to verify pricing display without executing JS.
- **Post handling:** Unverified.
- **Rackability handling:** Unverified.
- **Terrain detection:** None documented.
- **Notes:** Scraping blocked. Recommend Playwright walkthrough to fully document.

### HooverFence.com
- **URL:** https://www.hooverfence.com
- **Ordering:** Yes — full ecommerce with cart and checkout.
- **Prices shown:** Exact per SKU. Extensive catalog (sections, posts, gates, hardware, openers, accessories).
- **Post handling:** **Manual (B), via dedicated 5-step calculator.** `/calculators/ornamental-aluminum-fence`:
  - **Step 1:** Enter footage for up to 20 "stretches" (separate straight lines between posts/gates/corners). Labeled A, B, C in an illustrated example.
  - **Step 2:** Enter corner posts and gate end posts.
  - **Step 3:** Enter end posts and free-standing gate blank posts.
  - **Step 4:** Walk gate quantities by width (3', 4', 5', 6'), then drive gate quantities (6', 8', 10', 12').
  - **Step 5:** Pick fence style, finial, color, height. Submit to receive a materials list with pricing.
  Hoover has parallel calculators for chain-link, split-rail, wood, and vinyl. Candid disclaimer: "Pretty Darn Good, But Not Perfect" — warns that post lengths may need adjustment for grade changes.
- **Rackability handling:** **Not auto (D).** Separate `/ornamental-fence-raking` reference page explains stair-stepping vs racking; the calculator doesn't expose a rack field. Calculator output lists "Standard 90 Degree Wall Mount Brackets" that "may also be required for stair-stepping sections." Grade-change adjustments are documented as follow-up line items the user must add manually.
- **Terrain detection:** None.
- **Notes:** **Gold standard for post-count calculators with real ecommerce.** They trust customers to sketch the yard and enter stretch lengths. Worth copying: illustrated multi-stretch-input layout, transparent disclaimer, explicit handling of "odd angles" via a documented upsell SKU. Worth avoiding: putting rack/grade handling completely in the disclaimer rather than the form.

### Wholesale-Fencing.com
- **URL:** https://www.wholesale-fencing.com — **domain dead** (DNS resolution failed). Likely defunct.

### Merchants Metals (Fe-Fence Estimator)
- **URL:** https://www.merchantsmetals.com/fence-estimator/
- **Ordering:** Contractor-only — submit quote as an order to local service center.
- **Prices shown:** Login-gated (existing customers only).
- **Post handling:** **Hybrid (D), with three distinct modules.** Fe-Fence Estimator® offers:
  - **Qwik Order:** Enter part numbers / item lookup and build the order SKU by SKU.
  - **Qwik Bid:** Enter total footage + post/gate quantities manually and pick specifications.
  - **Qwik Draw:** Visually draw a fence line and add gates before specifying components. Closest wholesale-market analog to a map-draw tool.
- **Rackability handling:** **SKU-level (B in principle).** Their Secure-Weld® Plus product line explicitly offers "Fully Rackable" panels that "adjust to variations in terrain." Not all styles have the fully rackable option (e.g., Plainview is "Not available with Fully Rackable option"). Rack choice is a product variant, not a mid-run picker.
- **Terrain detection:** None documented.
- **Notes:** B2B-only, but the 3-module split (Order / Bid / Draw) is instructive — lets contractors self-serve at their preferred level of detail. Pattern worth considering for multi-persona audience (DIY homeowner vs installer).

### FenceDepot.com / Fence-Depot.com
- **URL:** https://www.fence-depot.com
- **Ordering:** Quote-first via "Send a Sketch."
- **Prices shown:** Per-SKU pricing on accessory pages; panel pricing follows sketch review.
- **Post handling:** **Sketch-to-staff (C).** Explicit copy: "'Send a Sketch' service: Send us a simple drawing of your yard, and our experts will calculate exactly how many posts, gates and accessories you need."
- **Rackability handling:** **Marketed as always-on (D).** "Rackable panels: Our easy-install aluminum fence panels are rackable, meaning they can adjust to follow the slope of your ground without leaving unsightly gaps or requiring stair-stepping." No per-panel selection exposed.
- **Terrain detection:** None.
- **Notes:** Classic consultative model. Low-tech comparison point.

### FencingDirect.com (surfaced during research)
- **URL:** https://www.fencingdirect.com
- **Ordering:** Yes — full cart with line-item checkout.
- **Prices shown:** Exact with list and sale prices (e.g., Clearfield 4'×6' panel: list $189.59, sale $132.71).
- **Post handling:** **Manual (B) — separate SKUs.** On each panel's product page, "Posts sold separately from panels" with a related-items carousel: Line Post ($53.48), Corner Post ($53.48), End Post ($53.48), Heavy Duty Gate Post ($93.64), Blank Post ($53.48), Heavy Duty Blank Post ($93.64). A "Fence Builder Tutorial" page explains how to calculate material and price.
- **Rackability handling:** **Yard-wide binary — no per-panel picker (C).** Product copy: "Panels can be adjusted for grades and rack up to 33" per 6' panel." Marketing positions panels as universally rackable.
- **Terrain detection:** None.
- **Notes:** Clean shopping UX — posts appear as related products on every panel page, encouraging customers to pick up the correct post types without a separate calculator step. Rack claim (33") is much higher than Ultra's standard (6") and competes with GreatFence's Heavy Rackable — but it is built into the single product rather than an option variant.

### Home Depot (homedepot.com) and Lowe's (lowes.com)
- **URL:** https://www.homedepot.com, https://www.lowes.com
- **Ordering:** Yes — fully operational ecommerce.
- **Prices shown:** Exact per SKU.
- **Post handling:** **Manual (B) at the SKU level.** Both retailers sell aluminum fence panels (e.g., US Door & Fence Pro Series), posts, gates, and kits as individual products. No configurator linking panel to post count.
- **Rackability handling:** **Not asked (D).** Product listings mention "rackable" as a spec attribute, but no online flow accounts for slope.
- **Terrain detection:** None.
- **Notes:** Product pages gated (403/404 via WebFetch). Commodity shelf — no fence-industry sophistication. A better-than-Home-Depot configurator on a dealer site is a clear differentiator. Many product kits bundle 3 panels + 4 posts ("buy-the-kit") to sidestep the counting question.

### Menards.com
- **URL:** https://www.menards.com
- WebFetch returned 403. Based on comparable retailers, Menards follows the same catalog-SKU model. No configurator, no rack picker, no slope handling.

### Wayfair.com / Amazon.com
- **URL:** https://www.wayfair.com, https://www.amazon.com
- **Ordering:** Yes.
- **Prices shown:** Exact per SKU.
- **Post handling:** **Not handled (D).** No configurator. Listings are thin on fence-specific attributes.
- **Rackability handling:** **Not asked (D).** Listings occasionally mention "adjustable" in free text, no rack variants.
- **Terrain detection:** None.
- **Notes:** General merchandise marketplaces — not competitive with the dealer-configurator model.

### America's Fence Store (americasfencestore.com) — CRITICAL COMPETITOR
- **URL:** https://americasfencestore.com — e-commerce division of American Fence Company (top-10 US fence contractor, 55+ years, 14 locations, $3M+ online sales).
- **Ordering:** Yes — full Shopify e-commerce with instant cart. **Draw-to-cart in seconds.**
- **Prices shown:** **Exact.** Transparent pricing on all products. Complete packages (e.g., 4' ornamental aluminum 100ft package: $2,722.51). Free shipping over $499.
- **Post handling:** **Auto-calculated (A).** "Draw My Fence" tool at `americasfencestore.com/pages/calculate-fence` (engine hosted at `afpw.americafence.com/drawing-tool/?_mode=shopify`) auto-calculates all posts (end, corner, line, gate) from the drawn fence line. Also has a form-based calculator alternative for customers who know their footage. User clicks "Finalize Drawing And Add to Cart" → all materials (panels, posts, caps, fittings) auto-populate in Shopify cart in seconds.
- **Rackability handling:** **Not handled at all (D).** Zero slope/rackability in the drawing tool. Draws on flat 2D plane. Tool assumes flat ground. No rackable panel option, no slope question. If a customer on a hill uses the tool, they get standard (wrong) parts.
- **Terrain detection:** **Limited — visual only.** Google Maps satellite view with a "Remove Trees" toggle that hides foliage to reveal property lines/structures. No elevation data processing, no slope detection, no 3D terrain.
- **Notes:** **This is the closest direct competitor to Grandview's tool.** Key differences: (1) They sell ALL fence types (chain link, vinyl, wood, ornamental) while Grandview specializes in Ultra aluminum. (2) **No contact info gate** — tool is 100% free to use without email/phone, contact only at Shopify checkout. (3) **No 3D visualization** — flat 2D drawing only. (4) **No expert review before ship** — their flow is cart → checkout → ship (they mention staff review but it's not a gated step). (5) Separate **Pro Center** (`pros.americasfencestore.com`) with job management, bulk pricing, multi-project quoting — relevant to Grandview's SDVOSB/contractor strategy. (6) White-labeled across 11+ local storefronts. **Grandview's differentiators vs them: 3D rendering, slope/rackability intelligence, Ultra-deep configuration, and Sarah's expert review gate.**

### Categorization

**Post handling:**
- **A) Auto-calculates posts from footage + layout geometry:** **America's Fence Store** (Draw My Fence → auto-calc all post types → Shopify cart); SleekFence (via mybudgetquote / mySalesman); Merchants Metals Qwik Draw (contractors).
- **B) Asks customer to count/enter posts manually:** GreatFence, AluminumFencesDirect, Hoover Fence (5-step calculator), FencingDirect, Home Depot, Lowe's, Menards, Wayfair/Amazon.
- **C) Doesn't handle posts at all — sales call required:** Catalyst Fence, FenceTown, Fence-Depot (counts internally after sketch review), iFenceUSA (footage only, staff counts).
- **D) Hybrid:** Merchants Metals (three modules), iFenceUSA (footage + optional sketch).

**Rackability / slope handling:**
- **A) Auto-detects slope:** **None.** Zero competitors use elevation data or LiDAR-style auto-detection.
- **B) Asks customer per panel/run (SKU-level):** GreatFence (Standard / Rackable / Heavy Rackable dropdown), Merchants Metals Secure-Weld® Plus (Fully Rackable as product variant).
- **C) Asks yard-wide question or treats as global setting:** AluminumFencesDirect (optional free double-punching upgrade).
- **D) Not asked — handled at quote review or marketed as always-on:** SleekFence, FenceTown, Fence-Depot, iFenceUSA, Catalyst, FencingDirect, Hoover, Home Depot, Lowe's, Menards, Wayfair, Amazon.

### Patterns Observed

1. **Nobody is auto-detecting slope.** Across 14+ fence retailers and two wholesale configurators, not a single one uses Google Maps elevation, LiDAR, or any terrain API to infer rackability. The universal approach is ask the customer, let them mix SKUs, or handle on the sales call. Grandview's Google-Maps-elevation approach would be genuinely novel — but the reported false-flat error validates that it cannot stand alone.

2. **GreatFence's per-panel rack-level dropdown is the only direct-to-consumer model that ties slope to a real SKU outcome.** Standard (6") / Rackable (20") / Heavy Rackable (36") each correspond to different factory punching and (for Heavy) different post hardware. Because the choice drives what ships, customers are incentivized to answer correctly. This is the single most copyable UX in the landscape.

3. **Posts are almost always customer-counted, by type, with illustrated help.** Hoover's 5-step calculator, AFD's order form, GreatFence's separate post catalog, and FencingDirect's "related products" approach all push the geometry burden onto the buyer — typically with labeled illustrations. The only exceptions are mybudgetquote-style map-drawing tools, which auto-count from a polyline but skip rack entirely. Grandview's tool can deliver both: auto-count from the drawn line *and* ask rack per panel.

4. **"Send a sketch" is the universal fallback.** FenceTown, iFenceUSA, AFD, Fence-Depot, and GreatFence all offer (or encourage) hand-drawn sketches. Even sophisticated customers find geometric entry hard. A good online tool needs a sketch-escape-hatch or image-upload fallback for messy yards.

5. **Pricing transparency and racking sophistication correlate inversely with sales-funnel friction.** Retailers that show exact prices (GreatFence, Hoover, FencingDirect, SleekFence shop pages) also expose more calculation complexity. Those that hide pricing handle complexity offline via sketches. Grandview is positioned to leap-frog both: (a) show prices like GreatFence, (b) auto-count posts from a map draw like mybudgetquote, (c) expose per-panel rack choice like GreatFence, (d) auto-suggest rack level from elevation as a *default* (acknowledging imperfection) with easy manual override per panel, (e) keep the sketch-upload escape hatch. That combination exists nowhere in the current market.

---

## Part 2: Technical — How Rackability Is Measured

### 2A — Data needed to accurately specify rackability

**Ultra Aluminum's published tiers.** Two Ultra sources disagree slightly, worth flagging:
- **Ultra FAQ (ultrafence.com/faq.html):** *"Yes, standard Ultra Aluminum™ fencings will rack up to 4 inches. Rackable and Heavy Rackable options are also available for more severe changes in grade at no extra charge."*
- **FenceTown Ultra distributor spec (`/customer-service/aluminum-fence-panel-racking/`):**
  - **Standard:** 0–6 inches per 6-foot panel
  - **Double Punched Posts (Rackable):** 0–20 inches per 6-foot panel
  - **Triple Punched Posts (Heavy Rack):** 0–36 inches per 6-foot panel

The 6"/20"/36" numbers match Grandview's internal documentation and are almost certainly the correct engineering thresholds. Ultra's FAQ "4 inches" appears to be a conservative marketing round-down. **Unable to verify directly from Ultra's PDF spec sheet** — WebFetch could not extract text from the compressed PDF streams. **Recommend Grandview obtain dealer-only PDF or written confirmation from an Ultra rep before publishing public specs.**

Notably, **Ultra enlarges the hole in the POST** (single/double/triple punched) rather than punching larger slots in the rail. Rackability is tracked by post SKU, not panel SKU.

**Cross-reference with other manufacturers:**

| Manufacturer | Standard | Rackable (Double) | Heavy Rack (Triple) |
|---|---|---|---|
| Ultra | 0–6" / 6' | 0–20" / 6' | 0–36" / 6' |
| Onguard | 4" / 6' | 9" / 6' | 16" / 6' |
| Elite | 6" / 6' | 16" / 6' | — (not offered) |
| Specrail (res) | ~6" / 6' | 14" / 6' | 18" / 6' |
| Specrail (comm) | ~3" / 6' | — | — |
| Jerith | 20–24" / 6' baseline | N/A | "Hill Country" 26"+ / 6' |
| DSI CourtYard | up to 20" / 6' | — | — |

**Takeaway:** Ultra's three-tier ladder is on the generous end of the industry. A homeowner with genuine 3-foot-of-fall-per-panel has almost no other manufacturer that covers it in a single panel. This is a real Grandview sales angle — but also means accurate tier selection matters *more* for Ultra buyers than for competitors like Jerith (which starts at 20"+ baseline).

**Rise-over-run the installer needs.** The measurement is **vertical rise (inches) across a 6-foot horizontal run** at the specific location where a single panel will sit. Not slope percentage, not degrees — inches of drop along a level 72-inch horizontal distance.

Conversion reference:
- 6" over 6' = 8.3% grade = 4.8°
- 20" over 6' = 27.8% grade = 15.5°
- 36" over 6' = 50% grade = 26.6°

**Per panel vs per run — this matters.** Rackability is **per panel** (6-foot section), not per run. A 60-foot run with 30" total drop averages 3"/panel — "Standard" qualifies in aggregate. But if the drop is concentrated in two panels that each fall 12", those two need "Rackable" while the other eight can be "Standard."

Because Ultra's racking lives in the **post** (hole size), ordering has to be **per-post-pair**, not per-panel. The steeper post in a transition governs the tier. Grandview's quote tool should either:
1. Ask per-panel and use MAX tier at each post to choose the post SKU, or
2. Ask homeowner to break the run into "segments of similar slope" and pick a tier per segment.

Option 2 is more user-friendly but risks picking "Standard" for an entire 80-foot run when a single 6-foot subsection needs "Heavy Rack." Mitigate with a conservative default: **if any portion is in doubt, tier it up.**

**Can a homeowner self-report without tools?** **Not reliably under 6" of drop per panel.** A 6" rise over 6 ft is ~5° — below the threshold humans can eyeball. They can reliably recognize:
- "Flat or nearly flat" (<3")
- "Obvious hill" (10"+)
- "Steep / I have to lean forward to walk up" (20"+)

The problematic zone is 6–20" — the Standard→Rackable transition. Without a tool, instructions should emphasize: measure at the STEEPEST 6-foot section, not the average; step up one tier when in doubt.

### 2B — How professional installers determine racking before ordering

Standard site-survey methods, in order of residential prevalence:

1. **String line + line level (~70–80% of residential installers).** Drive stakes at top and bottom of run; tie mason's line between; attach line level at center; raise/lower until bubble centers; measure vertical distance from string down to ground at each post location. Sources: WamBam Fence KB, Ergeon blog, DSI racking guide.
2. **Straight-board + torpedo level (panel-by-panel spot checks).** A 6- or 8-foot 2×4 with a 2-foot level on top. Hold one end against uphill post, level the board, measure gap from downhill end to ground. Directly gives "inches of drop per 6 feet."
3. **Laser level (rotary or grade laser).** Pro shops with $300–$1,500 in equipment. Self-leveling rotary on tripod projects level plane; installer walks line with receiver rod.
4. **Transit level / builder's level.** Commercial crews. Tripod optical scope reads leveling rod; modern units have built-in inclinometer.
5. **Phone clinometer / IMU.** Occasional quick spot-checks, rarely primary.

**What gets recorded on site-survey form.** Per run:
- Total linear footage
- Number of 6' panels
- **Per-panel slope notation** — "S" (standard/<6"), "R" (rackable/6–20"), "HR" (heavy rack/20–36"), or "STEP" (too steep, use stepped panels)
- Gate locations (gates do NOT rack — they need level pads)
- Obstacles (tree roots, utilities, rock)
- Soil type

**Unable to find canonical industry-standard form** — each company rolls their own. Ultra contractor PDFs (`UltraNewCustomerOrderForm.pdf`, `EasyOrderForm.pdf`) are per-SKU order forms, not site-survey templates.

**Translation to order (from DSI blog + FenceTown):**
> For each 6' panel segment:
> - 0–6" → standard post
> - 6–20" → double-punched (rackable) post on BOTH ends of the panel
> - 20–36" → triple-punched (heavy rack) post on BOTH ends of the panel
> - >36" → step the panel; use level panel with stepped rail transition

Posts are shared between adjacent panels, so: **the post between two panels must match whichever adjacent panel is steeper.** Terminal and gate posts are typically standard unless the adjacent panel demands otherwise.

### 2C — Manual methods a homeowner could use

**Method 1: Board-and-level (recommended primary DIY).**
- Tools: straight 6ft+ board (2×4 or extension pole); 2ft bubble level; tape measure; notebook.
- Steps: walk fence line, mark post locations at ~6ft; at each segment hold one end of board against uphill post at ground; extend toward downhill post with level on top; raise/lower until bubble centers; measure vertical gap from downhill end of board to ground; record for each panel.
- Output: inches of drop per 6-foot panel, directly comparable to Ultra's tiers.
- Accuracy: **±1"** careful homeowner (rigid aluminum pole → ±0.5"). Errors: board sag (2×4 sags ~½" mid-span — measure at end not middle), board not straight, parallax on level.
- Failure modes: measuring mid-panel instead of planned post location; tall grass/debris under downhill end; frozen/muddy ground shifting.

**Method 2: String line + line level (better for long runs).**
- Tools: 2 stakes; 50–100ft mason's line; line level (~$5 clip-on); tape; hammer.
- Accuracy: ±1–2" per measurement. String sag is main error (50ft line can sag 1–2" if not taut). Split long runs into 20–30ft segments.

**Method 3: Phone inclinometer / clinometer app.**
- Apps: iOS Measure → Level mode (±1° typical); Clinometer / Clinometer+ (claim ±0.1° with calibration, ±0.3–0.5° in practice per Analog Devices).
- Procedure: place phone on straight 6-foot board; read angle in degrees; convert rise (inches) = 72 × sin(angle).
- Accuracy: best case ±0.5° = ±0.6" over 6 ft; real-world ±1–2° = ±1.3–2.5" over 6 ft. **Reliable for distinguishing tiers (5° vs 15° vs 27°)**; NOT reliable near tier boundaries (5.5" vs 6.5").
- Critical: **calibrate phone on known-level surface first.** Uncalibrated phones can be off 2–3°.
- Failure modes: uncalibrated IMU; phone case tilt; board not straight; freehand (hand tremor); cold-day thermal drift.

**Method 4: Walk-the-line rough assessment.**
- Stand at each planned post; look 6 ft ahead. "Is the ground there more than knee-height different from here?" (knee ≈ 18", near Rackable/Heavy Rack boundary).
- Accuracy: ±6–10". Gut-check only, not sufficient for ordering.

**Method 5: Google Earth elevation profile.**
- Google Earth Pro → Path tool → View → Elevation Profile. Where LiDAR present, vertical accuracy 5–25 cm. In SRTM-only areas, 5–10 m error. Licensing: *"should not be used as any sort of replacement for surveying."*
- **Verdict:** Not usable as primary measurement. Cannot resolve 6"/20"/36" tier thresholds. Pre-screen only.

### 2D — Confidence and error modeling

**Under-ordering failure: ordered "Standard" but yard needs "Rackable."**
- Panels can't follow slope: panel picket ends can't tilt far enough within post slot.
- Installer's bad options: (a) force-rack, bending pickets and cracking powder coat, (b) leave 4–8" wedge-shaped ground gap.
- Post holes may already be concreted → breaking concrete ($200–$500).
- Pro installers refuse, return posts, need second truck roll ($250–$1,000 all-in per TSIA).

**Under-ordering failure: ordered "Rackable" but yard needs "Heavy Rack."** Same symptoms, worse severity.

**Over-ordering: specified "Heavy Rack" when only "Rackable" needed.**
- Essentially zero cost. Triple-punched posts accept rackable or standard slopes — bigger hole simply unused.
- Ultra charges nothing extra on panels; Grandview's $4.75/post upcharge is sunk, but install proceeds.

**Which direction is cheaper to recover?** Over-ordering by a wide margin. Single mis-tiered run under-ordered costs ~$400–$1,200 to recover (truck roll + re-order + potential concrete break). Over-ordering one tier on a typical 8-post run costs ~$40 sunk.

**Design rule for Grandview's tool:** Bias toward upgrading when in doubt. A "conservative estimate" option that bumps questionable panels up one tier costs the customer ~$20–$50 on a typical run and eliminates the $400–$1,200 failure mode. Expected-value math strongly favors upgrade bias.

**Planning number: use $500 as the implied cost of a rackability error.** This justifies substantial UX effort on tier clarity and conservative bias.

---

## Part 3: Terrain Detection Options

### 3A — Google Maps Elevation API

**Endpoints:** `maps.googleapis.com/maps/api/elevation/json` with `locations=` (up to 512 points) or `path=...&samples=N` (interpolated along polyline).

**Response resolution:** Every result includes a `resolution` value: *"the maximum distance between data points from which the elevation was interpolated, in meters."* Google's own Denver example returns **~4.77 m** — i.e., dataset samples were ~5 m apart. Resolution varies by location: urban/developed areas ~5–10 m, rural ~30–90 m.

**Underlying dataset:** **Never publicly disclosed.** Likely composite of SRTM (30/90 m), USGS NED/3DEP where applicable, and regional sources.

**Documented absolute accuracy:** **Not published.** Third-party empirical testing: 1.5–3 m (5–10 ft) vertical error for small urban features.

**Why a 12" slope over 20 ft came back as flat:** Three compounding causes:
1. **Sample spacing (~5 m) is larger than the feature.** A 20-ft (6m) yard spans 1–2 underlying data points. A 6-ft panel spans less than one data point — can't resolve a feature smaller than sample interval.
2. **Interpolation smooths across gaps.** Per Google: *"it also interpolates elevation for a location without elevation, providing an average returned from the four nearest locations that do provide elevation data."* 4-NN average flattens small local slopes.
3. **Underlying DEM is likely bare-earth SRTM/NED at 10–30 m posting.** A 30 cm vertical change across 6 m is well inside the noise floor of a 10 m DEM (~1–2 m vertical RMSE).

**Does `samples=N` give denser data?** **No** — only denser *interpolated output*. The underlying grid is unchanged. Requesting `samples=512` over a 20ft line gives 512 nearly-identical smooth values.

**Cost:** 10,000 free requests/month (2025 restructure). Historical $5/1000. Each `path` call counts as 1 request regardless of N.

**Verdict:** Unsuitable for sub-6" grade detection. Documented resolution (~5 m best) is larger than a 6-ft panel.

### 3B — Alternative elevation data sources

| Source | Horiz. res | Vertical RMSE | Cost | Detects 6" over 6 ft? |
|---|---|---|---|---|
| Google Elevation | ~5–30 m | Not published (~1–3 m observed) | Free + $5/1000 | **No** |
| Mapbox Terrain-DEM v1 | ~10 m (z14) | Not published | 50k free/mo | **No** |
| AWS Terrain Tiles (Mapzen) | ~30 m CONUS | Inherited | Free S3 egress | **No** |
| Esri World Elevation | ~3 m (1/9 arc-sec areas) | ~0.5–0.8 m | Pay-as-you-go | **No (marginal)** |
| **USGS EPQS** (1 m lidar areas) | **1 m** | **0.53 m** | **Free, no key** | **Marginal — ~21" differenced** |
| **USGS 3DEP 1 m raw DEM** | **1 m** | **0.10 m (QL2)** | **Free** | **Close (~14 cm noise)** |
| USGS 3DEP QL1 raw DEM | 0.5 m | 0.10 m | Free | Yes (marginal) |
| **GPXZ** (commercial) | 0.5 m where available | Inherits source | Paid | **Same as lidar source** |
| OpenTopography API | Dataset-dependent | Dataset-dependent | 50 calls/day non-academic | Bulk only, not per-address |
| Bing Maps Elevations | 10 m US NED | Not published | **Deprecated, Enterprise only** | No |

**Key detail — USGS EPQS:** `https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Meters&wkid=4326`. Free, no API key, returns 1 m lidar-derived DEM where available, falls back to 1/3 arc-second (~10 m). **Best free hosted option for US residential.** At ±0.53 m RMSE, a single reading is still ±21", but a cumulative grade change across a long run is reliably detected.

**OpenTopography** is best for bulk-downloading LiDAR rasters/point clouds — not a per-address real-time lookup (50 calls/day ceiling for non-academic).

**GPXZ** is the best commercial option — integrates lidar down to 50 cm where available, Copernicus DEM fallback.

### 3C — LiDAR data availability (2025–2026)

**Coverage:** 3DEP LiDAR coverage of CONUS is **substantial but incomplete**. Expanding rapidly — ~233,000 km² added Oct–Dec 2025. 3DEP mandates QL2 or better. Coverage is biased toward populated, flood-prone, and state-funded areas. Per-address lookup: `apps.nationalmap.gov/3depdem/`.

**Resolution/accuracy:**
- QL1: 8 ppm, **0.5 m DEM**, **10 cm vertical RMSE**
- QL2: 2 ppm, **1 m DEM**, **10 cm vertical RMSE** (3DEP default)
- QL3: 0.5 ppm, 2 m DEM, 20 cm vertical RMSE
- Raw lidar bare-earth: 5–30 cm depending on ground cover, vegetation, scan geometry.

**Could it detect 6" (15 cm) over 6 ft?** On paper, QL1/QL2 10 cm RMSE is close to target. In practice:
- Single point-to-point difference propagates noise: √2 × 10 cm ≈ **14 cm combined uncertainty** — right at threshold. *Suggestive* not *conclusive* per-span classification.
- Over longer runs (5+ posts), averaging helps substantially. Whole-run grade trend from LiDAR is genuinely viable.
- Ground cover matters: tall grass, gardens, mulch corrupt bare-earth returns. Vegetation-removal algorithms are good, not perfect, especially on manicured residential lots.

**Programmatic access:**
- **OpenTopography** — best for bulk raster/point-cloud retrieval (GeoTIFF DEMs or LAS/LAZ).
- **USGS downloads** — `apps.nationalmap.gov/downloader/`. Raw 1 m DEM GeoTIFFs, tile-based.
- **USGS EPQS** — hosted point lookup, interpolated 1 m value where available.
- **State open-data portals** — MI, PA, NY, NC, WA often host higher-res or more-recent lidar than 3DEP.

**Processing complexity:** Pre-processed DEM tiles (1 m GeoTIFF) are queryable with GDAL/rasterio — moderate lift. Raw LAS/LAZ point clouds require classification filtering, rasterization, reprojection — not practical in a serverless web tool.

### 3D — Practical accuracy benchmark

**The boundary that actually matters (<6" vs >6"):** **Hardest classification.** The 6" threshold sits close to the vertical noise floor of even the best public lidar at two-point-difference scale. Expect 70–80% classification accuracy with 3DEP 1 m lidar, worse with everything else. **You cannot build a reliable binary <6"/>6" classifier from any hosted API alone.**

**The 20" vs 36" distinction:** Achievable. Both thresholds are well above vertical RMSE of 3DEP 1 m and Esri 1/9 arc-sec. 20"+ grade change is a clear regional signal, not subtle local variation.

**Realistic accuracy floor:** For **any** public elevation API, expect ±30 cm (±12") best-case per-point error in residential areas, worsening to ±1–3 m (±40–120") for non-lidar areas. Differentials across 6-ft spans compound this. **Fundamentally an "ask the customer" problem at the 6" threshold.**

**Phone GPS/altimeter for comparison:**
- **GPS vertical:** Poor — ~30 m (100 ft) vertical accuracy. Useless.
- **Barometric altimeter (modern phones):** Detects height changes **below 10 cm** short-term if calibrated and ambient pressure stable. A customer walking the yard tapping "post 1, post 2, post 3…" over 5 minutes could plausibly give ±5–10 cm per-reading data — **better than any elevation API** for small features, as long as pressure doesn't shift mid-walk.
- **Caveat:** Relative, not absolute. 30-min yard walk on a day with approaching front can accumulate tens of cm drift.

**Takeaway:** A calibrated smartphone barometer over a short walk can plausibly produce better per-panel slope data than any public elevation API. **Customer participation is the winning accuracy strategy.**

### 3E — Implementation recommendations

- **Best free-tier prototyping:** USGS EPQS (`epqs.nationalmap.gov/v1/json`). Free, no key, 1 m lidar where available, CONUS-focused. Use to sanity-check Google.
- **Best accuracy if budget is no object:** GPXZ commercial API, or self-hosted 3DEP 1 m lidar via OpenTopography bulk.
- **Best hybrid — Grandview's recommendation:** Use EPQS as coarse flag; classify into confidence zones; ask the customer for ambiguous cases; optional mobile barometer flow; always disclose uncertainty in the quote.

---

## Part 4: Options & Recommendation

Four design options for how Grandview's tool should handle rackability and post calculation, with trade-offs.

### Option 1 — Auto-detect everything (current tool direction, "Full Auto")

**What customer sees:** Draws fence line on Google Maps → tool auto-calculates posts, gates, panels, and automatically applies rackable/heavy-rack tier per panel based on Google Elevation API. Customer sees a finished quote with no slope questions asked.

**What system calculates:** Post count from polyline geometry. Slope per panel from Google Elevation sample points. Tier per panel from threshold logic.

**Deferred to order review:** Sarah manually checks each order for terrain plausibility before sending to Ultra.

- **Accuracy:** **Low for the 6"/20" boundary** — Google Elevation resolution (~5 m) is larger than a 6-ft panel. Documented to report sloped yards as flat. False-negative rate likely 30–50% for real residential slopes.
- **Implementation complexity:** **Medium** (already largely built).
- **Customer confusion:** **Low** — no slope questions asked.
- **Order error risk:** **High** — wrong tier on 30–50% of sloped yards. Every slope miss becomes a truck-roll cost ($400–$1,200) or requires Sarah to catch it in review. At ad-driven volume, Sarah becomes the bottleneck.
- **Trade-off:** Lowest customer friction, highest install-failure risk. Ad money buying orders with known-bad slope data.

### Option 2 — GreatFence-style per-panel manual picker ("Copy What Works")

**What customer sees:** Draws fence on map (for post count). After drawing, the tool segments the run into 6-ft panel slots and asks per-panel: "How steep is this section? [Flat/<6"] [Sloped 6–20"] [Very sloped 20–36"]" with illustrated examples and a "measure it yourself" help link. Customer can set a default (e.g., "whole yard flat") and override individual panels.

**What system calculates:** Post count from polyline. Tier per post pair from max of adjacent panels. Material list with correct SKUs.

**Deferred:** Install-time verification (pro installer catches errors before digging).

- **Accuracy:** **High** if customer answers honestly. Matches GreatFence's proven model. Customer incentive aligned with SKU outcome.
- **Implementation complexity:** **Low** — per-panel picker + illustrated help + default-all button. No elevation API needed.
- **Customer confusion:** **Medium** — requires customer to assess slope, but illustrated examples (photos of flat/slight/steep yards) reduce this. Homeowners with flat yards answer in 2 seconds.
- **Order error risk:** **Low-Medium** — failure mode is customer self-under-estimates slope. Mitigate with conservative "when in doubt, upgrade" copy and a free "Heavy Rack everywhere" option that costs Grandview nothing extra on panels.
- **Trade-off:** Highest ceiling for accuracy. Customer friction higher than Option 1.

### Option 3 — Hybrid: elevation-as-hint + per-panel override ("Best of Both")

**What customer sees:** Draws fence on map. Tool queries **USGS EPQS** (not Google) for elevation along the drawn path. For each 6-ft panel:
- If elevation data is high-confidence flat (<3" detected in 1-m lidar area) → auto-assign Standard, tell customer "We detected this section as flat".
- If elevation data is high-confidence steep (>25" detected) → auto-assign Rackable or Heavy Rack, flag with "Detected significant slope here".
- If elevation data is ambiguous (between thresholds, or lidar coverage is missing) → ask the customer: "Is this section flat, sloped, or very sloped?" with illustrations.

Customer can always override any auto-assignment with one click. Every panel shows its current tier and a small edit pencil.

Final step before quote submission: "Please confirm the slope of your yard" with a summary ("4 panels standard, 2 rackable") and a photo-upload option for customers who want to send Sarah visuals.

**What system calculates:** Post count from polyline; slope *hints* from EPQS; per-panel tier from hint + customer confirmation.

**Deferred:** Sarah reviews flagged-ambiguous runs before Ultra submission. Photo uploads give her visual context.

- **Accuracy:** **High.** Elevation catches obvious cases; customer catches the 6"/20" boundary where APIs fail; Sarah catches the rest.
- **Implementation complexity:** **Medium** — requires EPQS integration, confidence scoring, per-panel UI, photo upload.
- **Customer confusion:** **Low** — most customers on flat lots never see the question. Only ambiguous-terrain customers are asked.
- **Order error risk:** **Low.** Three independent checks (API, customer, Sarah) make slope errors rare.
- **Trade-off:** Best accuracy, best customer UX, most implementation effort. Matches the research conclusion that "API as screening filter, customer confirmation for certainty" is the only workable pattern.

### Option 4 — Defer rackability entirely to order review ("Ship Fast")

**What customer sees:** Draws fence on map. Tool auto-calculates posts and panels. Rackability is NOT asked in the customer-facing flow — the quote summary says *"Final material list confirmed by Grandview before shipping. If your yard has significant slope, we'll follow up with a quick photo request."*

**What system calculates:** Post count from polyline. All panels initially specced as Standard. All rackability deferred to Sarah's review.

**Deferred:** 100% of rackability. Sarah reviews every order; if in doubt, requests a photo or phone call with the customer before submitting to Ultra.

- **Accuracy:** **Moderate** — Sarah's judgment is good but she's operating with no site data. False-negative rate depends entirely on how aggressively she pushes back on customers.
- **Implementation complexity:** **Very low** — no slope UI at all. Fastest to ship.
- **Customer confusion:** **Very low** — simplest flow of any option.
- **Order error risk:** **Medium.** Relies on Sarah catching issues in review; at ad-driven volume (10+ orders/day) she becomes the bottleneck. Customers with slopes may get a follow-up call they didn't expect.
- **Trade-off:** Fastest to market, lowest feature set. Reasonable short-term posture because Sarah reviews every order anyway. Bad long-term because it doesn't scale past her personal bandwidth.

---

## Key Findings (5 bullets max)

1. **No competitor auto-detects slope.** Across 14+ fence retailers and 2 wholesale configurators, zero use elevation APIs or LiDAR for rackability. The universal approach is customer-entered or sales-call-resolved. If Grandview ships auto-detection that works, it's genuinely industry-unique.
2. **GreatFence's per-panel dropdown (Standard/Rackable/Heavy Rackable) is the only proven D2C model that ties slope to a real SKU outcome.** It works because the choice drives what ships, so customers are incentivized to answer correctly. The UX is directly copyable.
3. **No public elevation API can reliably resolve the <6" vs >6" threshold over a 6-ft span.** Google's ~5 m resolution is larger than one fence panel. Even USGS 3DEP 1-m LiDAR (0.10 m RMSE) gives ~14 cm combined noise across a two-point difference — right at the threshold. This is fundamentally an "ask the customer" problem at the most important tier boundary.
4. **Over-ordering tier costs ~$40; under-ordering costs ~$500 in truck roll + potential concrete break.** Design rule: bias conservative. A free "one tier up when in doubt" toggle costs Grandview almost nothing and eliminates the expensive failure mode.
5. **USGS EPQS (`epqs.nationalmap.gov`) is free, unkeyed, and uses 1-m LiDAR where available — strictly better than Google Elevation for this use case.** It should replace Google as the slope-detection backend even if Google remains for the map display. Use it as a *screening filter*, not ground truth.

## Recommended Approach for Grandview

**Ship Option 4 ("Ship Fast") in the next 1–2 weeks to unblock the ad campaign. Evolve to Option 3 ("Hybrid") within 4–6 weeks once ad data validates the funnel.**

Rationale:

1. **Getting to "good enough to run ads" is the immediate goal.** Option 4 has the lowest implementation complexity and the lowest customer friction. Sarah reviews every order anyway — rackability review is already part of her workflow. Adding a slope UI before validating that the funnel converts is optimizing a step the customer hasn't reached yet.
2. **Swap Google Elevation for USGS EPQS now, as a zero-customer-visible change.** Even in Option 4, the tool can silently flag "likely sloped" orders for Sarah's priority review. This is cheap to build and gives her a heads-up before she opens the order.
3. **Add the GreatFence-style per-panel dropdown (Option 3) as the second iteration** once we see which customers are actually being served by the tool. If >60% of orders are flat-yard standard, the slope UI is overkill and Option 4 might stay permanent. If ~30%+ of orders have real slope, the full hybrid is worth the build.
4. **When Option 3 ships, keep the defaults conservative.** "Flat" is the default for easy cases, but any ambiguity (missing lidar coverage, detected slope near threshold, customer doesn't want to measure) defaults to "Rackable" rather than "Standard." Overcharging $30 on 10% of orders beats one truck-roll disaster per month.
5. **Preserve the sketch-upload / photo-upload escape hatch in every option.** Every competitor consultative brand offers it. Customers with weird yards need a way out of the geometric UI.

Implementation priorities:
- **Week 1:** Replace Google Elevation with USGS EPQS in backend; flag "probable slope" in Sarah's order-review dashboard; ship Option 4 to customers with no slope UI.
- **Week 2–3:** Run ads, measure conversion, collect real orders to see how often slope actually matters.
- **Week 4–6:** Build Option 3 per-panel UI with illustrations, default-all toggle, and photo upload. Retire Option 4 when Option 3 is battle-tested.

This path delivers the ad-ready tool fast, avoids the Option-1 trap of shipping known-bad auto-detection, and sets up the eventual market-unique UX (elevation hint + per-panel customer confirmation + Sarah review) without blocking on it.

---

*Research sources include: Wayback Machine archives of greatfence.com (2023–2024); Ultra Aluminum FAQ, spec sheets, and literature at ultrafence.com; FenceTown racking reference; Hoover Fence calculator; AluminumFencesDirect order form; Catalyst Fence, iFenceUSA, SleekFence / mybudgetquote, FenceDepot, FencingDirect, Merchants Metals Fe-Fence Estimator; Google Maps Elevation API docs; USGS 3DEP and EPQS documentation; OpenTopography, Mapbox, AWS Terrain Tiles, Esri World Elevation; Analog Devices accelerometer inclination accuracy; Apple Measure app; Clinometer app specs; WamBam Fence, DSI, Ergeon, Prowell Woodworks installer guides; TSIA and MAVSOtech truck-roll cost studies. All work conducted April 2026.*
