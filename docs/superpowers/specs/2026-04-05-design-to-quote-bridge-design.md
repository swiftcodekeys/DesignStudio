# Design-to-Quote Bridge — Design Spec

**Date:** 2026-04-05
**Scope:** Persist all design selections, capture 3D snapshot, add bridge page between design tool and quote flow, pool compliance popup, reframe gate question.

---

## 1. Problem

The design tool captures ~20 config fields (style, color, height, circles, finials, puppy pickets, scrolls, butterflies, arch, mount, leaf, mid rail, upper finial rail, pro spacing, post caps, privacy colors). When the user clicks "Get Quote," only 5 fields transfer to the quote builder (style, height, color string, postCap, finial). Everything else is lost.

There is no design snapshot. There is no confirmation page. The user jumps from a rich 3D configurator directly into a multi-step form that re-asks questions they already answered.

The gate question ("Do you need gates?") appears as a blocking checkbox early in both the wizard and the quote builder, treating all gate types equally. Walk/drive gates are standard products; estate/cantilever are custom. The question confuses users.

## 2. Saved Design Object

### Key: `gv_saved_design`

Written to localStorage when the user clicks "Get Quote" from any entry point (TopNav, QuoteTab, FloatingPanel Next button).

```
{
  scene: 'fencing' | 'backyard' | 'gates',

  // Core
  styleId: string,          // e.g. 'uaf_200'
  height: string,           // e.g. '48'
  color: {                  // full color object, not just a string
    id: number,
    displayName: string,
    hex: string
  },

  // Ornaments & accessories
  postCap: string | null,       // 'pcf' | 'pcb'
  finialType: string | null,    // 'fs' | 'ft' | 'fq' | 'fp'
  pupType: string | null,       // e.g. 'pupcl_pfs' (classic spear)
  circles: boolean,
  butterflies: boolean,
  scrolls: boolean,

  // Feature toggles
  midRail: boolean,
  upperFinialRail: boolean,
  proSpacing: boolean,

  // Gate-only (null when scene is fencing/backyard)
  arch: string | null,          // 'e' | 'a' | 'r' | 's'
  mount: string | null,         // 'p' | 'd'
  leaf: string | null,          // '1' | '2'

  // Privacy-only (null when not privacy style)
  privacyPostColor: string | null,
  privacyPanelColor: string | null,

  // Pool
  poolBarrier: boolean,
  poolCompliance: 'full' | 'unsure' | 'none' | null,

  // Snapshot
  snapshotDataUrl: string,      // base64 PNG from canvas.toDataURL()

  // Metadata
  timestamp: string             // ISO 8601
}
```

### How it's built

In `app.js`, `handleOpenQuoteBuilder` is replaced with `handleSaveDesignAndTransition`:

1. Determine active config: `fenceConfig` (fencing/backyard tabs) or `config` (gates tab)
2. Read all fields from the active config object
3. Extract accessories from `config.accessories` object — check for `tcr` (circles), `tbu` (butterflies), `scr` (scrolls), `mdr` (mid rail), `ufr` (upper finial rail)
4. Check `config.options` or equivalent for pro spacing / flush bottom
5. Grab the canvas element, call `canvas.toDataURL('image/png')` for the snapshot
6. Write to `localStorage.setItem('gv_saved_design', JSON.stringify(data))`
7. Set view to `'design-review'`

### Backward compatibility

The old `gv_quote_builder` key continues to work. QuoteBuilder first checks for `gv_saved_design`; if present, it uses that. If not, it falls back to `gv_quote_builder`. This means the wizard flow and direct QuoteBuilder links still work.

## 3. Bridge Page (`DesignReviewPage.js`)

### New view state: `'design-review'`

Added to `app.js` view routing. Triggered when user clicks "Get Quote" from any design tool surface.

### Layout (desktop)

Two-column layout, max-width 960px centered:

**Left column — Design Summary:**
- 3D snapshot image (large, dark background, "SAVED" badge)
- "YOUR SELECTIONS" grid — 2-column grid showing all non-null saved fields in human-readable format:
  - Style, Color, Height, Post Cap, Finials, Puppy Picket, Circles, Butterflies, Scrolls, Mid Rail, Upper Finial Rail, Pro Spacing, Arch (gate), Mount (gate), Leaf (gate), Privacy colors (privacy)
- "Pool Ready" badge if `poolBarrier === true` and style is pool-compliant (UAB-200, UAF-200, UAF-250 with flush bottom)
- Subtext: "You'll have a chance to edit these before your final quote"

**Right column — Next Steps:**
- **"Draw Your Yard"** card (primary, blue border):
  - Subtext: "Enter your address to view your property on satellite imagery and calculate linear footage"
  - Address input with Google Places autocomplete
  - "View My Property →" CTA button
  - On submit: geocodes address, navigates to DrawYardView with design already saved
- **OR** divider
- **"Enter Footage Manually"** card (secondary):
  - "I already know my linear footage"
  - On click: navigates to QuoteBuilder at StepLayout (step 1) with `gv_saved_design` data pre-filled
- **"Have questions? Drop us a line"** section:
  - On click: opens ContactPopup
  - Phone number: (855) FENCE-30

### Cold start (no saved design)

When `gv_saved_design` doesn't exist or has no styleId:

- Left column shows:
  - Placeholder image (no snapshot)
  - "Configure Your Fence" button → navigates back to design studio
  - "Skip to quote — you can choose your style and options during the quote process" link → proceeds to QuoteBuilder
- Right column: same address entry + manual entry + contact options

### Mobile layout

Single column, stacked: snapshot → selections → address card → manual entry → contact.

## 4. Pool Compliance Popup (`PoolCompliancePopup.js`)

### Trigger

- User selects "Backyard" zone in WizardShell
- OR user arrives at bridge page with `scene === 'backyard'` and `poolBarrier` is not yet set

### Flow

**Step 1:** Premium-styled modal overlay.
- "Is any part of this fence around a pool?"
- Two cards: **Yes** / **No**
- If No → close popup, `poolBarrier: false`

**Step 2 (if Yes):** "Does this need to meet pool safety code?"
- Three options:
  - **Yes, full pool code (BOCA/IRC)** → `poolCompliance: 'full'`
  - **I'm not sure** → `poolCompliance: 'unsure'`
  - **No, just near a pool** → `poolCompliance: 'none'`

### Enforcement (when `poolCompliance` is `'full'` or `'unsure'`)

- Height: must be 48" or higher (enforce, don't allow lower)
- Style: only flat-top styles with flush bottom qualify — Haven (UAB-200), Horizon flush (UAF-200), Vanguard flush (UAF-250)
- If current style is NOT pool-compliant (spear tops: Charleston, Savannah, Eclipse, Lexington): show warning banner with suggestion to switch
- Pro spacing (1.5" pickets) NOT pool compliant (> 4" gap between pickets when combined with rail offset)
- Gate requirements flagged: "Pool gates must be self-closing, self-latching, and open outward. We'll configure this during the quote process."
- When `poolCompliance: 'unsure'`: apply same safe defaults but add note: "Grandview will confirm pool code requirements for your area before production"

### Visual

- "Pool Ready" green badge on compliant configs
- Warning banner (amber) on non-compliant configs with specific issue listed

## 5. Gate Flow Changes

### WizardShell — Reframed gate step

**Before:** Step 3 blocks with "Want to explore gate options?" Yes/No cards.

**After:** Step 3 becomes educational/inspirational:
- Header: "Take a Look at Your Gate Options"
- Subtext: "Most homeowners add a walk gate or drive gate. Take a look — if you see something you like, we'll add it to your quote."
- Walk gate card: thumbnail, brief description, "Most common — included in instant quote"
- Drive gate card: thumbnail, brief description, "Standard double drive — included in instant quote"
- Estate/cantilever section: smaller, "Custom order — contact us for pricing"
- If they configure a gate: it saves to the design state and carries forward
- Clear exit: **"I'll add my gates with my instant quote →"** button (primary CTA at bottom)
- This step does NOT block — the exit button is always available

### QuoteBuilder — Gate changes

**Removed:** `needsGates` checkbox from StepProject (Step 0). The "What do you need?" section no longer has a gates checkbox that gates (pun intended) access to Step 3.

**StepGates (Step 3):** Always accessible. Reframed:
- "Add Walk or Drive Gates" — add/configure as many as needed
- "Estate & Cantilever Gates" — "These are custom order. Contact us for a quote." with link to ContactPopup
- "Skip — no gates needed" button to advance
- If gates were already configured in the design tool or wizard, they appear pre-filled here

## 6. QuoteBuilder Pre-fill from Saved Design

When QuoteBuilder mounts, it checks for `gv_saved_design`:

1. If present, map fields into QuoteBuilder's data structure:
   - `style` ← styleId mapped to display name
   - `height` ← height
   - `color` ← color.displayName
   - `postCap` ← postCap
   - `picketSpacing` ← pupType ? 'puppy' : proSpacing ? 'pro' : 'standard'
   - `extras.circles` ← circles
   - `extras.butterflies` ← butterflies
   - `extras.scrolls` ← scrolls
   - `extras.midRail` ← midRail
   - `extras.upperFinialRail` ← upperFinialRail
   - Gate fields if scene === 'gates': arch, mount, leaf mapped into gates array

2. Pre-filled fields show as already answered but editable. The step UI shows them as "from your design" with an edit icon.

3. If `gv_saved_design` is NOT present, fall back to `gv_quote_builder` (existing behavior).

## 7. Files Changed

| File | Change |
|------|--------|
| `app.js` | Replace `handleOpenQuoteBuilder` with `handleSaveDesignAndTransition`. Add `'design-review'` view state. Canvas snapshot capture. Write `gv_saved_design`. |
| `DesignReviewPage.js` | **NEW** — Bridge page component with design summary, address entry, manual entry, contact link. Multi-area progress indicator. |
| `AreaReturnPage.js` | **NEW** — "Now let's do your backyard" page with same-system / different-system choice. |
| `PoolCompliancePopup.js` | **NEW** — Two-step pool question modal. |
| `WizardShell.js` | Reframe gate step as educational. Add pool popup trigger when backyard zone selected. |
| `QuoteBuilder.js` | Read `gv_saved_design`. Remove `needsGates` checkbox from StepProject. Pre-fill all steps from saved design. StepGates always accessible. |
| `styles.css` | Bridge page styles, pool popup styles, gate step restyle. |

## 8. Multi-Area Flow (Front + Backyard)

When the user selects both front yard and backyard (either in WizardShell zone selection or via the "Front + Backyard" project type), the flow handles them sequentially — not in parallel.

### Saved Design Object — Multi-Area

`gv_saved_design` gains an `areas` array instead of flat fields:

```
{
  multiArea: true,
  areas: [
    {
      zone: 'front',
      styleId: 'uaf_200',
      height: '48',
      color: { ... },
      // ... all config fields ...
      snapshotDataUrl: 'data:image/png;base64,...',
      poolBarrier: false,
      poolCompliance: null,
      layout: null,  // filled after draw/manual entry
    },
    {
      zone: 'back',
      styleId: null,  // null until area 2 is configured
      // ... remaining fields null until configured ...
      snapshotDataUrl: null,
      poolBarrier: null,
      poolCompliance: null,
      layout: null,
    }
  ],
  activeAreaIndex: 0,  // which area we're currently working on
  timestamp: '...'
}
```

Single-area flows still use the flat format (no `multiArea` flag). QuoteBuilder checks `multiArea` to decide which format to read.

### Flow

**Area 1 (front yard):**
1. User configures front yard in the design tool
2. Clicks "Get Quote" → bridge page shows Area 1 summary
3. Draws yard / enters footage → completes Area 1 quote steps
4. After Area 1 layout is saved → **Area 2 Return Page** appears

**Area 2 Return Page:**
- Header: "Now let's do your backyard"
- Question: **"Use the same fence system as the front yard?"**
  - **Yes, same system** → copies Area 1's config (style, color, height, all accessories) into Area 2. Skips straight to the bridge page for Area 2 (draw/measure only — design is already set).
  - **No, different system** → navigates to design tool with backyard tab active. User configures backyard separately, then hits "Get Quote" again to return to the bridge page for Area 2.
- Pool question triggers here if Area 2 is backyard (the popup fires since it's a backyard zone).

**Area 2 completes:**
- After Area 2 layout is saved, both areas merge into a single combined quote in QuoteBuilder.
- QuoteBuilder shows both areas as separate sections with their own line items, then a combined total.

### Progress Indicator

When in multi-area mode, the bridge page shows a progress indicator:

```
[Area 1: Front Yard ✓] — [Area 2: Backyard ○]
```

This makes it clear they're not done yet and sets the expectation that there's a second area.

### Edge Cases

- **User abandons Area 2:** Area 1 data is already saved. If they close and return, they can pick up where they left off (Area 2 return page shows again).
- **User changes mind:** "Back to Design Tool" on the Area 2 return page lets them reconfigure Area 1 if needed.
- **Gate only:** If user also selected a gate zone in the wizard, gate config is separate from both areas and carries through as a third section in the quote.

## 9. Fields NOT Yet Wired

These fields exist in the design tool but do not yet affect pricing or the order form. They are saved in `gv_saved_design` for future use:

- **Mid rail** — saved, not priced (no separate line item in price book)
- **Upper finial rail** — saved, not priced
- **Pro spacing** — saved, affects visual only (no price difference in residential)
- **Mount type** (post/direct) — saved, gate-specific, not currently in pricing engine
- **Leaf count** (single/double) — saved, affects gate pricing but not yet wired to gate price lookup

These will be wired when the pricing engine is extended to cover gate quotes.

## 9. Navigation Flow Summary

### Single-area flow
```
Design Studio (any tab)
  → "Get Quote" clicked
  → Snapshot captured, gv_saved_design written
  → Bridge Page (design-review view)
      ├── "View My Property" → DrawYardView (address geocoded)
      │     → Follow-up questions → QuoteBuilder (pre-filled)
      ├── "Enter Footage Manually" → QuoteBuilder Step 1 (pre-filled)
      ├── "Drop us a line" → ContactPopup
      └── "Back to Design Tool" → Studio view
```

### Multi-area flow (Front + Backyard)
```
Wizard Shell → Select "Front Yard" + "Backyard"
  → Configure Area 1 (front yard)
  → "Get Quote" → Bridge Page (Area 1)
      → Draw / Manual → Area 1 layout saved
      → Area 2 Return Page
          ├── "Same system" → copies config → Bridge Page (Area 2, draw/measure only)
          │     → Draw / Manual → Area 2 layout saved → QuoteBuilder (both areas)
          └── "Different system" → Design Studio (backyard tab)
                → Configure backyard → "Get Quote" → Bridge Page (Area 2)
                    → Draw / Manual → Area 2 layout saved → QuoteBuilder (both areas)
```

### Wizard Shell flow
```
Wizard Shell
  → Zone selection → Configure → Gate exploration (educational, optional)
  → "Get Quote" → same bridge page flow (single or multi-area)
```

### Cold entry (direct URL, Framer landing page)
```
Bridge Page (cold start variant)
  ├── "Configure Your Fence" → Design Studio
  ├── "Skip to quote" → QuoteBuilder (no pre-fill)
  ├── Address entry → DrawYardView
  └── "Drop us a line" → ContactPopup
```
