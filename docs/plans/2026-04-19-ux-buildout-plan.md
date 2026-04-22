# UX Buildout Plan — Specs Catalog, Building Codes, Onboarding

**Date:** 2026-04-19
**Status:** Planning
**Branch:** `feat/quote-redesign` (or spin off if scope grows)

---

## Goals

Three VFP-inspired UX features to layer on top of the current Design Studio + Draw Yard + Quote Details flows. Each is independently shippable; no hard dependencies between them.

1. **Construction Specs catalog** — pinterest-style grid of fence-style cards with illustration + spec chips. Lets customers compare styles side-by-side without diving into the configurator.
2. **Building Codes Reference** — searchable IRC/IBC baseline with state overrides. Positions Grandview as a code-literate expert, answers permitting questions buyers ask, and is SEO bait.
3. **9-step Onboarding** — welcome screen with a task-oriented overview in front of the existing wizard so first-time visitors know the shape of what's coming.

---

## Phase 1 — Construction Specs catalog

### Scope

Single page at `/studio/specs` (or `/specs` top-level tab in the top nav), card grid per fence family.

Each card:
- Hero illustration (reuse `assets/ifence_previews/gate_styles/*.png` or `gate_tool/th/th_st_*.jpg`)
- Grandview style name + Ultra model code as a muted secondary line
- Short description (1 sentence)
- Spec chips grid (4–6 chips per card):
  - Available heights (e.g. "36–72\"")
  - Panel length (72\" standard, 96\" industrial)
  - Rail dimensions
  - Picket dimensions
  - Post size options
  - Rackability tier support
- ASTM badges (F-1184, F-626, A-153) as small chips
- Pool-code compliance badge if applicable (Haven only, for now)
- "Configure this style →" CTA that deep-links into the 3D designer with this style preselected

### Data sources
- `retailPricing.js` (`STYLES` + `PANEL_PRICING` + `POST_PRICING`) — already has most numbers
- `configData.js` / `fenceConfigData.js` — Grandview display names, top styles, pro variants
- `docs/research/specs-catalog-data.md` — research output covering anything not yet in code (ASTM refs, pool-code notes, spacing dimensions). Authoritative summary distilled from the Ultra March 2026 pricebook.
- Ultra pricebook at `C:\Users\sarah\Downloads\ULTRA_PRICEBOOK_MARCH2026_PARSED.md`

### Files to add/change
- `SpecsCatalog.js` — new page component, React.createElement pattern
- `specsCatalogData.js` — derived from research doc; exports an array of style spec objects
- `styles.css` — new `.specs-*` selectors (card, chip, grid)
- `app.js` — wire a `/studio/specs` route + top-nav link
- `TopNav.js` — add "Specs" tab

### Out of scope (v1)
- Per-style spec detail pages (v2 — tap a card to get IRC setback, wind load, install details)
- Privacy fence variants (Solace, Solace Hybrid) — ornamental first, privacy can follow in v1.5
- Gate-specific cards — the catalog is about fence families, not gate types

### Effort: 4–6 hours
Grid UI ~2h, data extraction ~2h, routing/nav wiring ~1h, polish ~1h.

### Success criteria
- Every fence family that appears in the configurator is represented by a card
- Every chip value traces back to the pricebook or a code reference (no made-up numbers)
- CTAs deep-link correctly into the configurator with style preselected
- Loads under 500ms; grid is responsive to mobile

---

## Phase 2 — Building Codes Reference

### Scope

Top-level tab at `/studio/codes` (or education section). MVP is federal IRC/IBC baseline only. State overrides added incrementally as we gather local codes.

Structure:
- Intro header: "IRC & IBC code requirements for fences, railings, and pool barriers. Select your state for local variations."
- Search bar (client-side filter on keyword / product / requirement)
- State dropdown (defaults to "IRC/IBC Baseline (Federal)"); selecting a state shows override chips on each card
- Card grid — one card per fence category:
  - Ornamental Aluminum (F-2408, IRC R301.1 standard)
  - Pool Barriers (ISPSC / IRC Appendix G / state pool code)
  - Privacy Fences (Aluminum / Vinyl / Louvered — F964 for vinyl)
  - Chain Link (F567, F668, F1043)
  - Decorative Iron (F2408)
  - Deck & Porch Railings (IRC R312, R317, R507)
- Each card shows: code refs, max height (no permit), post depth rule, setback note, wind load class, "View full requirements →" link opening a detail drawer or subpage.

### Data sources
- **IRC 2021 Chapter R301** (structural load, wind/snow/seismic) — publicly referenced by ICC
- **IRC 2021 Chapter R312** (guards / handrails) — fence railings on decks
- **IRC Appendix G (Swimming Pools, Spas, and Hot Tubs)** — pool barrier code (48" min, 4" max gap, self-closing gate, etc.)
- **ASTM standards** — F-1184 (ornamental), F-2408 (ornamental), F-626 (fence hardware), F-567 (chain link installation), F-964 (vinyl)
- **State-specific layer** (phased):
  1. Michigan — because Grandview's in MI and most orders are local. Michigan Residential Code 2015 mirrors IRC with specific pool barrier amendments.
  2. California — Title 24; strict pool code (Senate Bill 442, CBC Appendix G amendments)
  3. Texas — TDLR pool rules, local jurisdiction variation (Austin, Houston, Dallas)
  4. Florida — FBC 2023; wind-borne debris region requires ASTM E330/E1886 for fences near coast

### Files to add/change
- `BuildingCodesReference.js` — new page component
- `buildingCodesData.js` — structured code data (keyed by category → federal + state overrides)
- `docs/research/building-codes-baseline.md` — research source of truth, updated as we add states
- `styles.css` — `.codes-*` selectors
- `app.js` / `TopNav.js` — routing + nav

### Out of scope (v1)
- PDF export of a code summary for a specific job
- Per-jurisdiction permit application templates
- Integration into the quote flow (flagging projects that trigger permit requirements)

### Effort
- **MVP (federal IRC only, 6 cards):** 2–3 hours UI + 4 hours research + content = ~6 hours total
- **+ Michigan overrides:** +3 hours research
- **+ CA/TX/FL:** +4–6 hours per state (depending on jurisdiction depth)
- **Full v1 (federal + MI):** ~9 hours

### Success criteria
- Every code reference cites the actual code section (no "check local requirements" hand-waving)
- State dropdown shows only states we've researched; others say "Federal baseline applies — contact us"
- Cards are scannable in <10 seconds each
- Content is SEO-optimized (fence code questions are high-volume long-tail queries)

---

## Phase 3 — 9-step Onboarding with Progress Dots

### Scope

Additive: a new welcome step at the front of the existing `WizardShell.js` flow. No change to the existing 6-step QuoteBuilder inside.

Welcome screen:
- Full-width hero: "Let's build your fence"
- Subhead: "Takes about 10 minutes. You can save your progress at any time."
- 3 cards in a row (Style → Measure → Quote), each with an icon + 1-line description
- Progress dots: 9 dots showing the full path (Welcome + 8 configuration steps)
- "Let's Get Started →" primary CTA advances to the current step 1 (Style)

Progress dots component:
- Horizontal row of filled / outlined dots
- Current step is a larger solid dot with subtle glow
- Completed steps are solid, upcoming are outlined
- Reusable component — can appear on any step of the wizard

### Files to add/change
- `WizardWelcome.js` — new component
- `WizardProgressDots.js` — reusable progress component
- `WizardShell.js` — wire Welcome as step 0, wire progress-dots into header
- `wizard.css` — `.wizard-welcome-*`, `.wizard-dots-*`

### Out of scope (v1)
- "10-minute" label is approximate — can measure real completion times later via analytics
- No skip-welcome cookie (user can always click past; re-showing on return is fine)
- No personalization based on referral source (save for v2)

### Effort: 2–4 hours
Welcome component ~1h, progress dots ~1h, wiring ~1h, polish ~1h.

### Success criteria
- Welcome step takes <3 seconds to skim
- CTA click advances to step 1 without losing any existing state
- Progress dots update correctly as user moves forward/backward
- Works on mobile (dots stay readable at 320px width)

---

## Research tasks

### Immediate (this session)
1. **Specs catalog data** — extract per-style spec objects from the Ultra pricebook into `docs/research/specs-catalog-data.md`. Done as part of this plan's execution.
2. **Building codes baseline** — fetch IRC + ASTM references, write `docs/research/building-codes-baseline.md`. Done as part of this plan's execution.

### Follow-up (separate sessions, lower priority)
3. **Michigan fence + pool code overrides** — Michigan Residential Code 2015 as amended, specific cities (Howell, Detroit, Grand Rapids)
4. **California pool code** — CBC Appendix G with CA amendments, ISPSC cross-reference, SB 442 safety features
5. **Ultra additional spec data** — wind load ratings (call Ultra), post depth recommendations by height (install manual), setback recommendations (not code-driven but manufacturer best practice)

---

## Execution order

Ship in this order — each is independently useful:

1. **Phase 1 (Specs catalog)** first. Highest customer-facing value. Most of the data already exists in code. Visible marketing win even before codes/onboarding.
2. **Phase 3 (Onboarding welcome)** second. Tiny scope, big first-time-visitor UX lift. Low risk.
3. **Phase 2 (Codes reference)** last in this arc. Highest content overhead (federal research + state-by-state). MVP (federal only) first, then Michigan, then others.

## Non-goals

- None of these features change the pricing engine, the draw tool, or the 3D renderer
- No new backend APIs — all three phases are static-data-plus-React
- No replacement of existing education page — these are additive references, not substitutes
- No A/B testing on these features for v1 — ship, measure, iterate
