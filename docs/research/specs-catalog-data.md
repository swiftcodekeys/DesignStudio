# Fence Specs Catalog — Source Data

**Date:** 2026-04-19
**Primary source:** `C:\Users\sarah\Downloads\ULTRA_PRICEBOOK_MARCH2026_PARSED.md` (Ultra Aluminum March 2026 pricebook, internal)
**Secondary sources:** ASTM standards (public), IRC 2021 (publicly referenced), Ultra spec sheets on ultrafence.com (public marketing pages)
**Purpose:** Authoritative spec data for the Construction Specs catalog page. Every chip on every card must trace back to a row below.

---

## Global conformance (all ornamental aluminum styles)

| Spec | Value | Source |
|---|---|---|
| Material | 6005-T5 aluminum alloy | Ultra spec sheet (public) |
| Finish | ProCoat powder coat | Ultra pricebook p.1-1 |
| Warranty — fence panels | Limited Lifetime | Pricebook §14 |
| Warranty — ProCoat finish | Limited Lifetime (no cracking/peeling/chipping) | Pricebook §14 |
| Warranty — commercial apps | 10 years | Pricebook §14 |
| ASTM — ornamental fence | F-2408 *(typical industry standard for ornamental metal fence)* | Industry standard |
| ASTM — cantilever gate | F-1184 | Pricebook §8 |
| ASTM — gate hardware | F-626, A-153 (galvanizing) | Pricebook §8 |
| Panel length | 72″ (6′) residential/commercial/industrial; 72″ defender | Pricebook §4–7 |
| Colors available | 7 standard + Silver premium | Pricebook §1 |
| Countries of manufacture | USA (Howell, MI) | Pricebook preamble |
| Rackability tiers | Standard (0–6″), Rackable (0–20″), Heavy Rack (0–36″) | Pricebook §2 |

---

## Per-grade construction specs

These are constant across styles within a grade — reuse on every card at that grade.

### Residential grade (pricebook §4)
- Rail: 1-1/8″ wide × 1″ high
- Picket: 5/8″ × 5/8″
- Posts: 2″ × 2″ or 2-1/2″ × 2-1/2″ square
- Wall options: .060, .080, .125 (2″); .100 (2-1/2″)
- Post lengths (by fence height): 36″→60″, 36–48″→72″, 42–60″→84″, 54–72″→96″, 72″→108″
- Standard spacing: 3-13/16″ between pickets
- Pro spacing: 1-5/8″ between pickets

### Commercial grade (pricebook §5)
- Rail: 1-3/8″ wide × 1-1/4″ high (heavier than residential)
- Picket: 3/4″ × 3/4″
- Posts: 2″, 2-1/2″, 3″, or 4″ square
- Heights: 48″, 60″, 72″ only
- Standard spacing: 3-5/8″
- Pro spacing: 1-1/2″

### Industrial grade (pricebook §6)
- Rail: 1-5/8″ × 1-5/8″ (heaviest standard-grade)
- Picket: 1″ × 1″
- Posts: 2-1/2″, 3″, or 4″ square
- Heights: 48″, 60″, 72″, 84″, 96″, 108″, 120″
- Standard spacing: 3-5/8″
- Pro spacing: 1-1/2″

### Defender industrial (pricebook §7)
- Rail: 1-5/8″ × 1-5/8″
- Picket: 1″ × 1″
- Posts: 2-1/2″, 3″, or 4″ square
- **Heights: 84″ and 96″ ONLY** (confirmed via pricebook March 2026)
- Security feature: 51° angled outward-facing spear tops
- Always 4-rail construction
- Standard spacing: 3-5/8″
- Pro spacing: 1-5/16″
- Application: airports, commercial/industrial perimeter security

---

## Per-style cards (ornamental)

Each entry below is the data payload for one catalog card. Missing values are flagged with `TODO` so we know what still needs sourcing.

### Horizon™ / Horizon Pro™
- **Ultra model:** UAF-200 (standard) / UAF-201 (pro)
- **Top style:** Flat
- **Rails:** 3-rail typical (2-rail at 42″ and 48″ available)
- **Grades:** Residential, Commercial, Industrial
- **Heights:** 36, 42, 48, 54, 60, 72″ (res); 48/60/72″ (comm); 48/60/72/84/96/108/120″ (ind)
- **Pool-compliant:** No *(Haven is the pool-compliant flat variant)*
- **Pro variant:** Yes (UAF-201, tight 1-5/8″ spacing)
- **Rackability:** All three tiers supported
- **Hero image:** `assets/ifence_previews/gate_styles/san_marino_15.png` (existing)
- **Description:** Clean, timeless flat top. Most common aluminum fence profile. Works for front yard, backyard, and pool adjacent (with flush-bottom option).

### Haven™ (Flat Top Flush — pool-compliant)
- **Ultra model:** UAB-200
- **Top style:** Flat
- **Rails:** 2-rail at 48″ (pool-code configuration)
- **Grades:** Residential only
- **Heights:** 36, 42, 48, 54, 60, 72″
- **Pool-compliant:** **YES** — flush bottom rail (no ground gap), pre-configured to meet BOCA/IRC pool barrier code at 48″+
- **Pro variant:** No separate pro; pro-spacing available via UAF-201 with flush config
- **Rackability:** All three tiers supported
- **Hero image:** `assets/ifence_previews/gate_styles/boca_grande_45.png`
- **Description:** Purpose-built for pool-barrier code. Flush bottom rail eliminates climb-through gaps. Self-closing/latching hardware is sold standard with this configuration.

### Vanguard™ / Vanguard Pro™
- **Ultra model:** UAF-250 (standard) / UAF-251 (pro)
- **Top style:** Flat top with spear accents
- **Rails:** 3-rail typical
- **Grades:** Residential, Commercial, Industrial
- **Heights:** same range as Horizon
- **Pool-compliant:** No
- **Pro variant:** Yes (UAF-251, tight 1-5/8″ spacing)
- **Rackability:** All three tiers
- **Hero image:** `assets/ifence_previews/gate_styles/sanibel_25.png`
- **Description:** Flat top with decorative spear points rising above the rail. More statement-making than Horizon; still code-friendly for most residential jurisdictions.

### Charleston™ / Charleston Pro™
- **Ultra model:** UAS-100 (standard) / UAS-101 (pro)
- **Top style:** Spear top
- **Rails:** 3-rail typical (also 2-rail at 42″)
- **Grades:** Residential, Commercial, Industrial
- **Heights:** same range as Horizon
- **Pool-compliant:** No (pool requires flush bottom — available via custom quote)
- **Pro variant:** Yes (UAS-101)
- **Rackability:** All three tiers
- **Hero image:** `assets/ifence_previews/gate_styles/bella_vista_35.png`
- **Description:** Classic pointed-spear top. Ornate without being fussy. Popular for front-yard curb appeal.

### Savannah™ / Savannah Pro™
- **Ultra model:** UAS-150 (standard) / UAS-151 (pro)
- **Top style:** Staggered spear (alternating heights)
- **Rails:** 3-rail
- **Grades:** Residential, Commercial, Industrial
- **Heights:** same range as Charleston (same price rows in pricebook)
- **Pool-compliant:** No
- **Pro variant:** Yes (UAS-151)
- **Rackability:** All three tiers
- **Hero image:** `assets/ifence_previews/gate_styles/bella_terra_40.png`
- **Description:** Alternating tall/short spear heights. Adds rhythm and visual interest. Same panel price as Charleston.

### Eclipse™ / Eclipse Pro™
- **Ultra model:** UAS-300 (standard) / UAS-301 (pro)
- **Top style:** Concave spear (curves inward)
- **Rails:** 3-rail
- **Grades:** Residential, Commercial, Industrial
- **Heights:** 36, 42, 48, 54, 60, 72″ (res); 48, 60, 72″ (comm)
- **Pool-compliant:** No
- **Pro variant:** Yes (UAS-301)
- **Rackability:** All three tiers
- **Hero image:** TODO — no direct Eclipse preview in `assets/ifence_previews/`; use Ultra's th_st_uas_300.jpg or commission one
- **Description:** Arched curve drops between spears for an "estate" feel. Premium pricing; premium look.

### Lexington™ / Lexington Pro™
- **Ultra model:** UAS-350 (standard) / UAS-351 (pro)
- **Top style:** Convex spear (curves outward)
- **Rails:** 3-rail
- **Grades:** Residential, Commercial, Industrial
- **Heights:** same as Eclipse
- **Pool-compliant:** No
- **Pro variant:** Yes (UAS-351)
- **Rackability:** All three tiers
- **Hero image:** TODO — use Ultra th_st_uas_350.jpg or commission
- **Description:** Arched crown rises between spears. Mirror image of Eclipse — different visual energy, same price tier.

### Defender™ / Defender Pro™
- **Ultra model:** UAD-100 / UAD-101
- **Top style:** 51° angled outward-facing spears (anti-climb)
- **Rails:** Always 4-rail
- **Grades:** Industrial only
- **Heights:** **84″ and 96″ ONLY**
- **Pool-compliant:** No (industrial security application)
- **Pro variant:** Yes (UAD-101, tight 1-5/16″ spacing)
- **Rackability:** Not a residential concern — verify with Ultra for specific jobs
- **Freight:** Private truck quoted per job (does not qualify for standard free freight)
- **Hero image:** TODO — Ultra th_st_uad_100.jpg if available
- **Description:** Industrial-grade anti-climb security fence. Used at airports, utilities, and commercial perimeters. Grandview as an SDVOSB is well-positioned for government/municipal Defender contracts.

---

## Privacy styles (separate catalog section or "Privacy" tab)

### Solace™ (Aluminum Privacy)
- **Ultra model:** UAE-200
- **Construction:** 3/4″ × 5″ × .080″ T&G boards + Hamilton top rail
- **Material:** 100% aluminum
- **Weight:** ~99 lbs per 6′ × 6′ section
- **Heights:** 48″, 60″, 72″
- **Colors:** Textured only (TB, TZ, TK, TW) + Silver premium (no gloss options)
- **Rackability:** Cannot rack (rigid panels) — follow grade with step method
- **Pool-compliant:** Height-dependent; check local code

### Solace Screen™ (Aluminum Privacy, Double-Stacked)
- **Ultra model:** UAE-DS
- **Same construction as Solace** but stacked for taller heights
- **Heights:** 48″, 60″, 72″ stacks (check pricebook for exact stacked max)

### Solace Hybrid™ (Vinyl Privacy with Aluminum Frame)
- **Ultra model:** UAE-VP
- **Construction:** Aluminum rails (top, mid, bottom) + vinyl T&G 6″ panels sourced locally
- **Key note:** Ultra supplies frame only — vinyl panels not included
- **Heights:** 48″, 60″, 72″
- **Rails:** 2-rail or 3-rail options
- **Colors:** TB, TZ, TK, TW + Silver premium

### Solace Air™ (Louvered Privacy)
- **Ultra model:** UAE-AIR
- **Construction:** Welded aluminum louvers in 1″ × 3″ framed panels
- **Privacy angle:** 145° visual privacy at level sight line
- **Heights:** 48″, 60″, 72″, 84″, 96″
- **Colors:** Textured only
- **Rackability:** Cannot rack
- **Note:** Not AMCA-tested for airflow (visual privacy only)

---

## Cantilever gates (separate section if we show them in the catalog)

### Ultrack™ Cantilever Gate
- **Ultra model:** UAE-CG family
- **Opening widths:** 6′ to 30′ (standard); custom wider on request
- **Heights:** 48″, 60″, 72″, 84″, 96″
- **Frame:** 2-1/2″ square vertical + 1″ × 2″ diagonal tubing, 1/8″ wall
- **Posts:** 4″ square, .125 wall
- **Included:** All hardware + Y-shaped receiver
- **Conforms to:** ASTM F-1184
- **Hardware:** ASTM F-626, A-153
- **Warranty:** 5-year limited *(exception to lifetime)*
- **Freight:** Private truck quoted per gate

---

## Chip dimensions & labels (shared across cards)

These are the chip labels to render. Values come from the style-specific rows above.

| Chip label | Chip value format | Example |
|---|---|---|
| Heights | comma-separated inches | "36, 42, 48, 54, 60, 72″" |
| Panel length | fixed string | "6′ (72″)" |
| Rail size | W × H | "1-1/8″ × 1″" |
| Picket size | square | "5/8″" |
| Post sizes | list | "2″ or 2-1/2″ sq" |
| Rackability | tier list | "Std · Rack · Heavy Rack" |
| Pro spacing | chip presence | "Pro spacing available" |
| Pool code | chip presence | "Pool-code compliant" |
| Material | "6005-T5 Aluminum" | (constant) |
| Finish | "ProCoat powder coat" | (constant) |
| Warranty | "Limited Lifetime" | (constant for residential) |
| Made in USA | flag chip | (constant — "Howell, MI") |
| ASTM | "F-2408" | on ornamental; F-1184 on cantilever |

---

## Gaps / TODO (not in pricebook — source elsewhere)

| Gap | Why it matters | Plan |
|---|---|---|
| **Wind load rating** per height | Coastal and high-wind jurisdictions require it | Call Ultra engineering; or reference ASTM F-2408 Section 10 |
| **Post depth / footing spec** per height | Install guidance for DIY and contractor BOM | Ultra install manual + IRC R404 footing minimums |
| **Setback recommendations** | Not code — manufacturer best-practice | Ultra install manual |
| **Eclipse / Lexington / Defender hero images** | 3 missing from iFence previews | Use `gate_tool/th/th_st_uas_300.jpg`, `_350.jpg`, `_uad_100.jpg` as placeholders; commission real ones later |
| **Pool-code specifics per state** | Haven only flags federal; state-by-state varies | Research task for Building Codes doc |
| **Haven variants (Haven Lite, Plus, Guard)** | App references them but pricebook doesn't | Verify with Ultra / Amanda before exposing in catalog |

---

## Implementation notes

- `specsCatalogData.js` should export an array of objects matching this shape:
  ```js
  {
    id: 'horizon',
    ultraModel: 'UAF-200',
    proModel: 'UAF-201',
    name: 'Horizon',
    proName: 'Horizon Pro',
    topStyle: 'Flat',
    grades: ['residential', 'commercial', 'industrial'],
    heights: { residential: [36,42,48,54,60,72], commercial: [48,60,72], industrial: [48,60,72,84,96,108,120] },
    poolCompliant: false,
    hasPro: true,
    rackability: ['standard', 'rackable', 'heavy-rack'],
    heroImg: 'assets/ifence_previews/gate_styles/san_marino_15.png',
    description: 'Clean, timeless flat top...',
  }
  ```
- Only include `poolCompliant: true` for Haven
- Only include `hasPro: true` where a pro variant exists (UAx-x01 model)
- For grade-specific heights, use a map keyed by grade so the card can filter
- Pro spacing dimensions differ by grade (1-5/8″ res, 1-1/2″ comm/ind, 1-5/16″ defender) — include as a `proSpacing` field per grade if needed in detail view
