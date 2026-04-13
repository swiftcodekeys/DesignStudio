# Wizard + QuoteBuilder + Gate Pricing — Unified Redesign Spec

**Date:** 2026-04-12
**Status:** Draft
**Scope:** WizardShell zone flow, QuoteBuilder step redesign, gate auto-pricing, all Ultra Easy Form conditional logic

---

## 1. Problem Statement

The current wizard and QuoteBuilder flow has these issues:

- **Confusing zone flow** — all zones configure at once, then dump to one quote form
- **Gates appear in 3 places** — zone selection, wizard gate step, QuoteBuilder gates step
- **No delineation** between walk/drive gates (fence accessories) vs driveway gates (custom 3D product)
- **Missing fields** — grade, post sizing, rail count, hardware per gate, racking tiers, privacy fencing, finial types, all gloss color variants, flange covers
- **No back buttons** throughout the flow
- **Two pool popups** instead of one
- **Scattered localStorage** — 6+ separate keys instead of unified state
- **No auto-pricing** — everything routes to "request a quote"
- **No educational content** — buyers don't understand posts, racking, spacing, or hardware options
- **Draw tool data issues** — over-counts corners (no angle detection), misidentifies terrain

The QuoteBuilder currently captures ~65-70% of what Ultra's Easy Order Form requires for manufacturing.

---

## 2. Architecture Decision: Approach B — Shared Config, Per-Zone Layout

**Flow:** Style/color/height configured once globally. Layout, gates, and extras are per-zone. Driveway gate zone breaks to 3D Design Studio.

### Zone Ordering Logic
- **Pool selected?** → Backyard goes first (pool compliance affects style + hardware)
- **No pool?** → Front yard first
- **Gate zone?** → Always last (separate product, separate flow)
- **Only gate selected?** → Skip fence flow entirely, straight to 3D Design Studio

### Zone Transition
After completing first fence zone, buyer sees: "Want the same fence for your [next zone]?"
- **"Same fence"** → skip style/color/height, just layout + gates + extras
- **"Different fence"** → full config for that zone

---

## 3. What Stays the Same (UI)

- **WizardShell zone selection screen** — same UI, but pool question consolidated into one popup
- **3D Design Studio configurator** — unchanged
- **Bridge page ("Your Design is Saved")** — unchanged
- **Overall visual language / design system** — light theme, frosted panel, Phosphor icons

---

## 4. What Changes

### 4.1 Pool Compliance — One Popup

Single popup at zone selection when buyer indicates pool. Consolidates all pool decisions:

- Shows pool-compliant styles: **Haven** (recommended), **Horizon Flush** (2-rail variant)
- Auto-configures: flush bottom rail, TruClose hinges, MagnaLatch, outward-swinging gates, minimum 48" height
- Note: "Always verify local pool code requirements"
- Dismissed with "Got It — Configure for Pool Code"

### 4.2 QuoteBuilder — Major Rework

6 steps, each a separate screen (not one scrolling page). Back/Next navigation. Step indicator dots. Persistent Design Studio snapshot header.

### 4.3 Design Studio Snapshot Header

Persistent thumbnail at top of every QuoteBuilder step showing:
- 3D snapshot image from the bridge page
- Zone name, style, height, color, post caps summary
- "← Back to Design Studio to change" link
- Green banner: "Pre-filled from your Design Studio selections"

### 4.4 Unified State Management

Single localStorage key: `gv_wizard_state`
```js
{
  selectedZones: ['back', 'front', 'gate'],
  currentZoneIndex: 0,
  contactInfo: { name, email, phone },
  zoneQuotes: {
    back: { config: {...}, quoteData: {...}, quoteResult: {...}, snapshotDataUrl, status: 'complete' },
    front: { config: {...}, ..., status: 'pending' },
    gate: { config: {...}, ..., status: 'pending' }
  }
}
```

### 4.5 Gate Auto-Pricing

- `priceData.js` — pricebook matrices (data only, replaceable when 2027 pricebook drops)
- `priceCalculator.js` — pure calculation logic
- Standard configs (walk, drive, standard/arched) → instant price shown
- Estate/cantilever → "Custom quote required" with estimated base range
- All prices shown with: "All measurements verified by our team before your order enters production."

### 4.6 Instant Checkout Option

After combined summary, buyer can:
- **"Order Now"** — proceeds to payment (Affirm/BNPL option for $3-15K orders). Order verified before manufacturing.
- **"Submit Quote Request"** — traditional quote path
- **"Talk to an Expert"** — call/email

Frame as: "Order Now — We Verify Before We Build"

---

## 5. QuoteBuilder Steps — Detailed Design

### Step 1: Style & Configuration

All defaults pre-filled from Design Studio. Every field changeable.

#### Grade
- Residential / Commercial / Industrial selector cards
- Each shows picket size, rail size, height range
- "Premium options available" expandable (double-wall enclosed rails, hidden fasteners)
- **Images:** Grade cross-section diagrams (from Ultra — picket/rail cutaway showing 5/8", 3/4", 1" dimensions). User has these as screenshots.

#### Fence Type
- **Ornamental** (picket styles) — default
- **Privacy** — triggers sub-type picker:
  - Aluminum (tongue & groove)
  - Louvered (airflow screening)
  - Vinyl (solid/variegated inserts)
  - Independent post + panel color pickers for privacy

#### Style
- All styles shown, filtered by grade. Pool projects show compliant styles first with badge.
- **Images:** `assets/ifence_previews/gate_styles/` — san_marino (Horizon), bella_vista (Charleston), sanibel (Vanguard), boca_grande (Haven), bella_terra (Savannah), etc. Also `assets/ifence_previews/styles/` for fence panel versions.
- Badges: POPULAR (Horizon, Charleston), POOL (Haven), PUPPY READY (Horizon Pro), SECURITY (Defender)
- Defender only shows for Industrial grade

#### Picket Spacing — Standard vs Pro
- **Standard:** 3-13/16" gap (residential), 3-5/8" (commercial). Classic open look.
- **Pro Spacing:** 1-5/8" gap (residential), 1-1/2" (commercial). Entire panel has ~2x pickets. Denser, more private. Also works as pet deterrent since gaps are too small for most small dogs.
- **Images:** `assets/ifence_previews/config_options/extreme_spacing_116.png` for pro spacing comparison
- Education: "Pro Spacing uses a different panel model with twice the pickets. Styles: Horizon Pro (UAF-201), Charleston Pro (UAS-101)."

#### Puppy Picket Add-On (separate from spacing)
- Checkbox: "Add puppy pickets to my panels"
- Adds short pickets (16") below second rail to close bottom gap
- Works with either spacing. Surcharge per panel (residential $57, commercial $62.25, industrial $72.50)
- When enabled, shows puppy style selector:
  - **Flush** — rail at 16" (`th_pup_fls.jpg`, ifence: `flush_puppies_97.png`)
  - **Standard** — rail at 12" (`th_pup_std.jpg`)
  - **Classic Plugged** — rail at 7.5" + plug finials (`th_pup_plg.jpg`, ifence: `classic_puppies_100.png`)
  - **Classic Spear** — + spear finials (`th_pup_spe.jpg`)
  - **Classic Spear Staggered** — (`th_pup_sps.jpg`)
  - **Classic Tri** — + tri finials (`th_pup_tri.jpg`)
  - **Classic Tri Staggered** — (`th_pup_trs.jpg`)
  - **Classic Quad** — + quad finials (`th_pup_qua.jpg`)
  - **Classic Quad Staggered** — (`th_pup_qus.jpg`)
  - Also ifence: `bella_puppies_82.png`, `excelsior_puppies_88.png`, `fleur_de_lis_puppies_76.png`, `nouveau_puppies_94.png` + staggered variants
- Tip: "If you chose Pro Spacing, gaps are already too tight for most small dogs. Puppy pickets are most useful with Standard spacing."
- **Conditional:** Adding puppy pickets or butterfly scrolls limits racking to Standard tier only (Great Fence rule)

#### Height
- Person silhouette comparison diagram at each height
- **Images:** User has height comparison illustrations with family at 48", 60", 72" (provided as screenshots today)
- Heights filtered by grade:
  - Residential: 36", 42", 48", 54", 60", 72"
  - Commercial: 48", 60", 72"
  - Industrial: 48", 60", 72", 84", 96", 108", 120"
  - Defender: 84", 96"

#### Color
- All 8 colors: Textured Black, Gloss Black, Textured Bronze, Gloss Bronze, Textured White, Gloss White, Textured Khaki, Silver
- Silver shows "PREMIUM" badge (no percentage shown)
- **Images:** `assets/ifence_previews/gate_colors/` — black.png, bronze.png, gloss_bronze.png, gloss_white.png, matte_black.png, matte_sandstone.png, silver.png, white.png
- "See colors on real fences →" link to grandviewfence.com color page
- Textured = matte satin finish. Gloss = smooth reflective.

#### Rails
- 2-Rail / 3-Rail (default) / 4-Rail selector cards with side-view images
- Education per type:
  - **2-Rail:** "Top and bottom rail. Used for pool code fencing (flush bottom) and shorter fences."
  - **3-Rail:** "Standard for most residential and commercial. Best balance of strength and aesthetics."
  - **4-Rail:** "Extra rail for taller fences (72"+) and industrial. Adds rigidity. Recommended for high-wind areas."
- **Images:** Need to source or create side-profile diagrams. Can adapt from Great Fence style.

#### Bottom Rail
- Standard (gap at bottom for drainage) / Flush (sits on ground, pool code required)
- Auto-locked to Flush for pool projects
- **Images:** `assets/ifence_previews/config_options/resort_flush_bottom_93.png` for flush, `assets/ifence_previews/views/classic_view_62.png` vs `resort_view_65.png`

#### Post Caps
- Pre-filled from Design Studio
- Flat (included) / Ball (upgrade per post)
- **Images:** `assets/ifence_previews/post_caps/flat_cap_71.png`, `ball_cap_74.png`. Also `gate_tool/th/th_pstcp_flat.jpg`, `th_pstcp_ball.jpg`

---

### Step 2: Layout & Posts

#### Draw Tool Data Handoff
If buyer used Draw Your Yard:
- Green banner: "Layout imported from your drawing — [X] ft across [Y] runs from [address]"
- Lengths and segment count pre-filled
- Corners calculated with angle detection (>15° = corner, gentle curves don't count)
- Terrain NOT pre-filled — always ask buyer (GPS elevation unreliable)
- End posts derived from open-ended segments

#### Simple Mode (default)
- **Total Linear Feet** — single number input
- **Terrain** — single picker: Flat / Sloped / Mixed
  - **Images:** Need photos of flat yard, gently sloped yard, mixed terrain. Source from Great Fence slopes page (they had dedicated content + images on web.archive.org/greatfence.com/hills-slopes/).

#### Advanced Mode (inline toggle)
- "▸ I have multiple runs with different terrain" — expands inline
- Per-run cards: label, length (ft), terrain selector
- "+ Add another run" button
- Auto-populated from draw tool segments if available
- Total footer: "[X] linear feet across [Y] runs"

#### Rackability (conditional — appears when terrain ≠ flat)
- **Racked vs Stair-Stepped** comparison with photos
- Education: "Sloped ground means panels need to angle to follow the terrain."
- **Racked:** "Panels follow the slope. Pickets stay vertical. Clean, continuous look. Requires double-punched rails (+$4.75/post)."
- **Stair-Stepped:** "Panels stay level and step down. Gaps appear at the bottom of each step. No surcharge, but needs blank posts + rail end mounts at each step."
- **Images:** From Great Fence Wayback Machine captures:
  - `S1_STANDARD.7.jpg` — standard panel (0-6" rack)
  - `S1_RACKABLE.7.jpg` — rackable panel (0-20" rack)
  - `S1_Heavy_Rackable.7.jpg` — heavy rackable (0-36" rack)
  - `Blank_Post_Stair_Stepping_2024.jpg` — blank post for stair-step
  - `2021-POSTS-DISPLAY-1024x510-1.jpg` — post types display
  - `adjustable-vertical-swivel-mount-greatfence.jpg` — swivel mount
- Racking tiers (adapted from Great Fence copy):
  - **Standard:** "Install straight or follow slopes up to 6 inches per panel"
  - **Rackable:** "Follow slopes up to 20 inches per panel — requires double-punched rails"
  - **Heavy Rackable:** "Follow slopes up to 36 inches per panel — requires double-punched rails"
  - **Stair-Step:** "For slopes beyond 36 inches — panels stay level, step down at each post"
- "How to check" popup: "Stand at one end of your fence line and look along it. If the ground drops more than 6 inches over a single 6-foot panel, you need rackable panels."
- **Conditional:** Puppy pickets + butterfly scrolls limit racking to Standard tier only (per Great Fence/Ultra spec)

#### Layout Shape
- **90° Corners** — number input with diagram + (i) popup. "Sharp right-angle turns. A rectangular backyard has 4."
- **End Points** — number input with diagram + (i) popup. "Where your fence stops. Most backyards have 2 — one on each side of the house. Fully enclosed = 0."
- **Sharp Angles (45-89°)** — number input. "Not 90° but sharper than gentle curves. Need corner posts or swivel brackets."
- **Gentle Curves** — checkbox. "My fence line has gentle curves." With info: "No special hardware needed. Standard line posts handle gentle curves (1-5° per post)."
- **Images:** From Great Fence:
  - `residentialCorner.1.jpg` — corner post photo
  - `Residential-End-Post-large.jpg` — end post photo
  - `ResidentialLine.1.jpg` — line post photo
  - `ResidentialT3way.1.jpg` — 3-way post
  - Diagram of corner vs gentle curve vs sharp angle needed

#### Post Summary (auto-calculated, read-only with "Adjust" link)
- Line Posts: [N] — "Standard posts between panels along straight runs" (i)
- Corner Posts: [N] — "Reinforced posts where your fence changes direction 90°" (i)
- End Posts: [N] — "Terminal posts where your fence starts or stops" (i)
- Gate Posts (4"): [N] — "Heavy-duty posts required for each gate opening" (i)
- Post Size: auto-selected by grade, "Change" link for override
  - Residential: 2"×2" (.060) standard, 2.5"×2.5" (.100) upgrade
  - Commercial: 2.5"×2.5" (.100) standard, 3"×3" (.125) upgrade
  - Industrial: 3"×3" (.125) standard, 4"×4" (.125) upgrade
- Note: "Auto-calculated from your layout. Our team verifies before manufacturing."

---

### Step 3: Gates

#### Gate Type Reference
- Visual cards for Walk / Drive / Double Drive with photos and size ranges
- **Images:** `assets/ifence_previews/gates/standard_3.png`, `arched_4.png`. Also Ultra thumbnails.

#### Per-Gate Configuration Card
Each gate gets a card with:
- **Type:** Walk / Drive / Double Drive
- **Width:** dropdown filtered by type
  - Walk: 36", 42", 48", 60", 72"
  - Drive: 72", 84", 96", 120", 144"
  - Width helper text: "36" = person, 48" = mower" / "Measure driveway + 2ft each side"
- **Top Style:** Flat / Arched (show +$43.25/LF surcharge inline for arched)
- **Swing Direction:** Left / Right
- **Hardware section per gate:**
  - Hinges: Standard ($33.50/pair) / TruClose Self-Closing ($95.50/pair) / Ultra Adjustable ($333.50/pair)
  - Latch: LokkLatch ($58.50) / MagnaLatch Pool ($186.50) / LokkLatch Deluxe ($175.00) / LokkLatch Magnetic ($227.00)
  - Each hardware option has (i) popup with description
  - Note: "Ultra Adjustable Hinges require 4×4 posts"
- **Auto for double gates:** Drop rod auto-included ($39.25)
- **Auto for pool gates:** TruClose + MagnaLatch locked, blue banner: "Pool code: self-closing + self-latching required"
- **Surcharge notes shown inline:**
  - Gate width > 6' single / >12' double → U-frame surcharge ($19/LF)
  - Arched → +$43.25/LF

#### "+ Add a gate" button
- Hint: "Most yards need at least one walk gate."

#### Estate & Cantilever Callout
- Card at bottom: "Custom order — preview in the 3D Design Studio or call (855) FENCE-30"
- "Cantilever gates carry a 5-year limited warranty (not lifetime)"

---

### Step 4: Extras & Upgrades

All pre-filled from Design Studio. Green banner showing what carried over.

#### Finials (conditional on style type)
- Spear-top styles → Spear, Trident, Quad options
- Flat-top styles → Plug option only
- **Images:** `gate_tool/th/th_pc_spe.jpg`, `th_pc_tri.jpg`, `th_pc_qua.jpg`, `th_pc_plg.jpg`
- Education: "Decorative tops on each picket. 15 finials per 6-foot panel section."

#### Panel Accents (conditional on style type)
- **Circles** — spear-top styles only. Images: `gate_tool/th/th_acc_cir.jpg`, `assets/ifence_previews/gate_accent_choices/circles_at_base_151.png`
- **Butterflies** — all styles. Images: `gate_tool/th/th_acc_but.jpg`, `assets/ifence_previews/gate_accent_choices/butterflies_at_base_154.png`, `butterfly_scrolls_145.png`
- **Scrolls** — all styles. Images: `gate_tool/th/th_acc_scr.jpg`, `assets/ifence_previews/gate_accent_choices/estate_scrolls_136.png`
- Education: "Ornamental elements between pickets. Approximately 16 per panel section."
- **Conditional:** Adding butterflies or scrolls limits racking to Standard tier (note if terrain was sloped)

#### Post Accessories
- **Flange Covers** — checkbox with (i) popup. "Decorative base covers that hide the post flange at ground level."
- **Touch-Up Paint Kit** — checkbox. "Color-matched paint for installation scratches."

---

### Step 5: Install & Shipping

#### Installation Plan
- DIY / Contractor / Not Sure — card selector

#### Shipping Address
- Street, City, State, ZIP fields
- Pre-filled from zone 1 or draw tool GPS address
- "Is this also the installation site?" — Yes / Different site toggle

#### Contact Info (zone 1 only)
- Name, Email, Phone fields
- On zones 2+: "Quoting as: [Name] ([email])" with Edit link
- Entered once, carried forward to all zones

---

### Step 6: Review & Quote

#### Selections Summary
- All choices listed with Edit links back to each step section
- Edit links jump directly to the relevant step

#### Calculated Materials Breakdown
- Panels (count × unit price)
- Posts by type (line, corner, end, gate) with sizes
- Gates with hardware per gate
- Post cap upgrades
- Finials (count = panels × 15)
- Decorative accents (count = panels × 16)
- Puppy picket surcharge (if enabled)
- Double-punch surcharge (if racked)
- Silver premium (if applicable)
- Note: "Calculated materials are verified by our team before production."

#### Auto-Pricing
- Running subtotal updates live through all steps (small footer bar)
- Full line-item breakdown in review step
- Zone subtotal shown prominently

#### Verification Disclaimer
"All measurements are verified by our team before your order enters production."

---

## 6. Combined Summary Page (after all zones)

Shows all completed zones:
```
┌─────────────────────────────────────────────┐
│  BACKYARD                        $4,200.00  │
│    38 panels · 40 posts · 1 walk gate       │
│    Charleston 48" Textured Black             │
│                              [Edit]         │
├─────────────────────────────────────────────┤
│  FRONT YARD                      $2,400.00  │
│    20 panels · 22 posts · 1 walk gate       │
│    Charleston 48" Textured Black (same)      │
│                              [Edit]         │
├─────────────────────────────────────────────┤
│  DRIVEWAY GATE                   $1,388.00  │
│    Charleston · Double · 10ft · Arched       │
│                              [Edit]         │
╞═════════════════════════════════════════════╡
│  GRAND TOTAL                     $7,988.00  │
│                                             │
│  [ Order Now — We Verify Before We Build ]  │
│  [ Submit Quote Request ]                   │
│  [ Talk to an Expert ]                      │
└─────────────────────────────────────────────┘
```

One submit sends all zones. One quote reference: GV-XXXXXX.

---

## 7. Driveway Gate Zone Flow

Always last. Separate track:

1. **3D Design Studio** — full gate configurator (style, arch, height, color, finials, leaf count, mount type, accessories)
2. **Bridge Page** — snapshot + address
3. **Short QuoteBuilder:**
   - Gate width (pre-filled from 3D config)
   - Hardware (hinges, latch, drop rod)
   - Install & shipping
   - Contact (carried from fence zones if already entered)
   - Review with auto-pricing
4. **Auto-price** for standard configs
5. **"Custom quote required"** for estate/cantilever — show estimated base range ("starting from ~$998") + (855) FENCE-30

---

## 8. Image Asset Map

### Already Have — Use Directly

| Need | Source | Path |
|------|--------|------|
| Fence styles (gate view) | iFence | `assets/ifence_previews/gate_styles/*.png` |
| Fence styles (panel view) | iFence | `assets/ifence_previews/styles/*.png` |
| Gate colors (8 colors) | iFence | `assets/ifence_previews/gate_colors/*.png` |
| Post caps (flat, ball) | iFence | `assets/ifence_previews/post_caps/*.png` |
| Puppy pickets (10 variants) | iFence + Ultra | `assets/ifence_previews/gate_puppy_pickets/*.png` + `gate_tool/th/th_pup_*.jpg` |
| Finials (spear, tri, quad, plug) | Ultra | `gate_tool/th/th_pc_*.jpg` |
| Accents (circles, butterflies, scrolls) | iFence + Ultra | `assets/ifence_previews/gate_accent_choices/*.png` + `gate_tool/th/th_acc_*.jpg` |
| Arch types | iFence + Ultra | `assets/ifence_previews/gate_arch_types/*.png` + `gate_tool/th/th_so_ar*.jpg` |
| Leaf/mount config | iFence + Ultra | `assets/ifence_previews/gate_leaf_config/*.png` + `gate_tool/th/th_so_*.jpg` |
| Feature options (flush, mid rail, etc.) | iFence | `assets/ifence_previews/gate_feature_options/*.png` + `config_options/*.png` |
| Pro spacing | iFence | `assets/ifence_previews/config_options/extreme_spacing_116.png` |
| Flush bottom | iFence | `assets/ifence_previews/config_options/resort_flush_bottom_93.png` |
| Classic/resort views | iFence | `assets/ifence_previews/views/classic_view_62.png`, `resort_view_65.png` |
| Gate types (standard, arched) | iFence | `assets/ifence_previews/gates/standard_3.png`, `arched_4.png` |
| Height comparisons (48", 60", 72") | User-provided | Screenshots from 2026-04-12 (family silhouette diagrams) |
| Grade cross-sections (res, comm, ind) | User-provided | Screenshots from 2026-04-12 (picket/rail cutaway diagrams) |
| Brainstorm height PNGs | Brainstorm session | `.superpowers/brainstorm/73757.../content/4ft.png`, `5ft.png`, `6ft.png` |

### Need to Source — From Great Fence (Wayback Machine, out of business)

| Need | Great Fence Source | Notes |
|------|-------------------|-------|
| Racking: standard panel | `S1_STANDARD.7.jpg` | Panel at 0-6" rack |
| Racking: rackable panel | `S1_RACKABLE.7.jpg` | Panel at 0-20" rack |
| Racking: heavy rackable | `S1_Heavy_Rackable.7.jpg` | Panel at 0-36" rack |
| Stair-step blank post | `Blank_Post_Stair_Stepping_2024.jpg` | Post for stair-stepping |
| Post types display | `2021-POSTS-DISPLAY-1024x510-1.jpg` | All post types in one image |
| Line post | `ResidentialLine.1.jpg` | Standard line post |
| End post | `Residential-End-Post-large.jpg` | Terminal end post |
| Corner post | `residentialCorner.1.jpg` | 90° corner post |
| 3-way post | `ResidentialT3way.1.jpg` | T-intersection post |
| Swivel mount | `adjustable-vertical-swivel-mount-greatfence.jpg` | For angles |

**Action:** Download these from Wayback Machine URLs, save to `assets/education/` directory. Slightly modify copy to be Grandview-branded.

### Need to Create

| Need | Description |
|------|-------------|
| Rail count diagrams | Side-profile showing 2-rail, 3-rail, 4-rail fence |
| Corner vs curve vs angle diagram | Bird's-eye showing which turn types need what posts |
| Flat vs sloped vs mixed terrain photos | Lifestyle photos of real yards (or adapt Great Fence) |
| Privacy fence type photos | Aluminum, louvered, vinyl panel photos |
| Walk gate vs drive gate vs double | Photos showing each gate in use with size context |

---

## 9. Conditional Logic Map

| Trigger | Effect |
|---------|--------|
| Pool selected at zone selection | One popup → Haven recommended, flush bottom locked, TruClose + MagnaLatch locked on gates, outward swing, min 48" |
| Grade = commercial | Heights 48-72", 3/4" pickets, 2.5" posts default, wider gate widths |
| Grade = industrial | Heights 48-120", 1" pickets, 8' panels (not 6'), Defender available, 3-4" posts |
| Grade = premium (any) | Note: double-wall enclosed rails, hidden fasteners |
| Fence type = privacy | Sub-type picker (aluminum/louvered/vinyl), independent post+panel colors, separate pricing |
| Style = spear top | Circle accents available, spear/tri/quad finials |
| Style = flat top | Plug finials only, no circles |
| Style = Defender | Industrial only, no decorative options, 84-96" only |
| Spacing = Pro | Uses different panel model (UAF-201 or UAS-101), tip about puppy not needed |
| Puppy pickets enabled | Puppy style sub-selector appears, racking limited to Standard tier |
| Butterflies or scrolls enabled | Racking limited to Standard tier |
| Terrain = sloped or mixed | Racking section appears (racked vs stair-stepped) |
| Terrain = mixed | Advanced per-run breakdown auto-expands |
| Gate type = double | Drop rod auto-included ($39.25) |
| Gate width > 6' single / >12' double | U-frame surcharge ($19/LF) auto-applied |
| Gate top = arched | +$43.25/LF surcharge shown inline |
| Gate top = estate | "Custom quote required" path |
| Ultra Adjustable hinges selected | Note: "Requires 4×4 posts" |
| Color = Silver | "PREMIUM" badge (no percentage shown to buyer) |
| Draw tool data available | Lengths pre-filled, corners angle-detected (>15° = corner), terrain always asked |

---

## 10. Data Capture Checklist (Ultra Easy Form Compliance)

Everything Ultra needs for manufacturing:

- [x] Style (maps to Ultra model number)
- [x] Grade (residential/premium/commercial/premium/industrial/premium)
- [x] Height
- [x] Color (all 8 standard + custom option)
- [x] Rail count (2/3/4)
- [x] Bottom rail treatment (standard/flush)
- [x] Picket spacing (standard/pro)
- [x] Puppy picket type (10 variants)
- [x] Linear footage per run
- [x] Terrain per run (flat/slope/steep)
- [x] Racking tier per run (standard/rackable/heavy/stair-step)
- [x] Corner count
- [x] End post count
- [x] Sharp angle count
- [x] Post size + gauge
- [x] Gate type, width, top style, swing direction per gate
- [x] Hardware per gate (hinge type, latch type, drop rod)
- [x] Post cap type (flat/ball)
- [x] Finial type (spear/tri/quad/plug)
- [x] Decorative accents (circles, butterflies, scrolls)
- [x] Flange covers
- [x] Install plan (DIY/contractor/unsure)
- [x] Shipping address + ZIP
- [x] Installation site (same/different)
- [x] Contact: name, email, phone

---

## 11. File Changes Estimated

| File | Change | Size |
|------|--------|------|
| `WizardShell.js` | Zone loop logic, pool popup consolidation, "same fence?" transition, back buttons | ~300 lines changed |
| `QuoteBuilder.js` | Major rewrite — 6 tabbed steps, all new fields, zone-scoped, conditional sections | ~800 lines changed |
| `ZoneQuoteSummary.js` | NEW — combined summary page with all zones + grand total + checkout options | ~250 lines |
| `ZoneTransitionPage.js` | NEW — "same fence for [zone]?" transition between zones | ~80 lines |
| `PoolPopup.js` | NEW — consolidated pool compliance popup | ~100 lines |
| `priceData.js` | NEW — pricebook matrices (panels, posts, gates, accessories, surcharges) | ~300 lines |
| `priceCalculator.js` | NEW — pure pricing function, no side effects | ~120 lines |
| `pricingEngine.js` | Update — integrate new price calculator, add missing surcharges | ~100 lines changed |
| `retailPricing.js` | Update — add missing colors, fix poolCompliant flags, add privacy pricing | ~80 lines changed |
| `configData.js` | Update — add WALK_WIDTHS, DRIVE_WIDTHS, privacy styles, all grades | ~50 lines |
| `app.js` | Update — unified wizard state persistence, new routing | ~40 lines changed |
| `styles.css` | New styles for QuoteBuilder steps, summary, transitions, info popups | ~200 lines |

**Total:** ~6 new files, ~6 modified files, ~2,400+ lines of change

---

## 12. What NOT to Build (out of scope)

- Cantilever gate configurator — completely different product, separate future feature
- Racked gate configurator — needs elevation sketch UX, separate feature
- Shipping cost calculator — needs zip code, weight, LTL vs common carrier logic
- Post/hardware pricing by ZIP — depends on regional distributors
- Checkout/payment integration — separate scope after quote flow works
- Fence-image mode (orthographic camera + user photo upload) — Phase 2
- Google Maps property estimator enhancements — separate feature
- Mobile responsiveness — after desktop flow is solid
