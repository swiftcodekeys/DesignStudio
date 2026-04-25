# Segment Wizard + Gate Placement — Design Spec
Date: 2026-04-25
Status: Draft — pending implementation plan

---

## 1. Goal

Replace the current global terrain picker in QuoteStep2_Layout with a segment-by-segment confirmation wizard anchored to the buyer's annotated overlay image. Add gate placement as a final step in the draw tool so gates are spatially positioned, automatically deducted from panel footage, and confirmed alongside slope in the same wizard screen.

**Success criteria:**
- Draw-tool buyers confirm slope tier and gate placement per segment without needing to understand racking terminology
- Manual-entry buyers answer a simple slope question (no segment breakdown required)
- All confirmed data carries through cleanly to the manufacturing payload
- No new data is required from the buyer that isn't already derivable or already asked

---

## 2. User Paths

### Path A — Draw-tool buyer
1. Draws fence in MapboxDrawView (existing)
2. Reviews measurements (existing)
3. **NEW: Places gates** in draw tool Step 3
4. Enters QuoteBuilder
5. **NEW: Segment wizard** in Step 0 (Layout & Posts) — confirms slope per segment, reviews gate placements
6. Continues to Style, Extras, Shipping, Review (unchanged)
7. Gates step (Step 2) is skipped automatically via `skipToStep` prop

### Path B — Manual-entry buyer
1. Enters total footage manually (existing)
2. Enters QuoteBuilder
3. **Modified: Step 0** shows simplified slope question ("Any slope?" → footage slider) instead of segment wizard
4. Continues to Style, **Gates (Step 2 kept)**, Extras, Shipping, Review
5. Gates step remains for manual buyers since they have no draw tool

---

## 3. Draw Tool — Gate Placement Step (new Step 3 in MapboxDrawView)

### Trigger
Shown after the buyer completes drawing and reviews measurements. Presented as a third panel in MapboxDrawView's step flow.

### Interaction
- Instruction: "Click anywhere on your fence line to place a gate"
- Buyer clicks a point on any drawn fence line segment
- A gate marker appears at the click position; the fence line renders a gap at that location
- A gate configuration card appears in the right panel

### Gate configuration card fields
| Field | Options | Default |
|-------|---------|---------|
| Gate type | Walk Gate / Drive Gate / Double Drive | Walk Gate |
| Top style | Flat / Arched | Flat |
| Swing direction | Swings left / Swings right | Swings left |
| Width | Selected from type's available range (see below) | 36" |

Gate types and width ranges match the existing `GATE_TYPES` and `widthsForType()` in `QuoteStep3_Gates.js`:
- `walk` (Walk Gate): 36"–72", default 36". "36" = person access | 48" = mower"
- `drive` (Drive Gate, single leaf): 72"–144", default 72". Vehicle access.
- `double` (Double Drive, two leaves): 72"–144", default 72". Two leaves meet in center.

Width is selected via a dropdown using the same widths array as `QuoteStep3_Gates.js`. The gate card also shows the segment it's on and its approximate offset from the start of that segment.

### Multiple gates
Buyer can place additional gates by clicking the fence line again. Each gate gets its own card. A "Remove" button on each card removes the marker and restores the fence line gap.

### Footage impact panel
Live-updated as gates are placed:
- Drawn total: [X] ft
- Gate openings: − [Y] ft (one line per gate, or summed)
- **Fence panels: [X − Y] ft**

### Skip option
"No gates — skip this step" button below the CTA. This is prominent, not hidden.

### Data produced
```javascript
gates: [
  {
    id: 'gate-0',
    segmentLineId: 'line-1',        // which drawn line
    segmentIndex: 2,                 // which segment within that line
    offsetFt: 42,                    // distance from start of THIS segment (not line start)
    latLng: { lat, lng },           // precise placement point
    type: 'walk',                    // 'walk' | 'drive' | 'double' — matches QuoteStep3_Gates GATE_TYPES
    top: 'flat',                     // 'flat' | 'arched' — matches QuoteStep3_Gates DEFAULT_GATE
    swing: 'left',                   // 'left' | 'right' — matches QuoteStep3_Gates DEFAULT_GATE
    widthInches: 36,                 // matches QuoteStep3_Gates widthInches field name
    hinge: 'standard',              // carried through from gate defaults — not shown in draw tool UI but required for payload
    latch: 'lokklatch',             // carried through from gate defaults — not shown in draw tool UI but required for payload
  }
]
```

This is added to `drawToolData` alongside existing fields.

---

## 4. legendOverlay.js — Post Markers on Overlay Image

### Current state
`legendOverlay.js` composites the color-coded fence line image with a stats header/footer. It does not render individual post positions.

### Changes required

**New data passed into legendOverlay:**
- `mapBounds: { north, south, east, west }` — captured from `map.getBounds()` at snapshot time in MapboxDrawView
- `vertices: [{ lat, lng, type: 'corner' | 'end' }]` — all structural vertices from the drawn lines
- `gates: [{ latLng, widthFt, type, topStyle }]` — from gate placement step

**Coordinate projection (linear, sufficient at property scale):**
```javascript
function projectToPixel(lat, lng, bounds, imageWidth, imageHeight) {
  const x = (lng - bounds.west) / (bounds.east - bounds.west) * imageWidth;
  const y = (bounds.north - lat) / (bounds.north - bounds.south) * imageHeight;
  return { x, y };
}
```

**New markers drawn on canvas:**
| Marker | Shape | Color | Size |
|--------|-------|-------|------|
| Corner post | Filled square | White #f1f5f9 | 12×12px |
| Line post | Filled circle | Light grey #cbd5e1 | 10px diameter |
| End post | Filled triangle | Light grey #cbd5e1 | 12px |
| Gate post | Filled diamond (square rotated 45°) | Amber #f59e0b | 12px |
| Gate arc | Dashed arc between gate posts | Amber #f59e0b | 2px stroke |

**Line post positions** are calculated by evenly spacing posts along each segment at the configured panel spacing (default 6ft, or 8ft for certain styles). The posts nearest the ends of a segment are gate posts or corner posts — line posts fill the gaps.

**Segment length labels** rendered mid-segment in the segment's tier color (yellow/blue/red).

**Gate gap** rendered by skipping the fence line stroke between `offsetFt` and `offsetFt + widthFt` on the relevant segment.

---

## 5. Segment Wizard — QuoteStep2_Layout Redesign

### Draw-tool buyer layout

Two-column layout (mirrors current QuoteBuilder shell pattern):

**Left column — overlay image**
- Renders the updated annotated snapshot (with post markers, gate gaps)
- Post totals summary row below image: Total ft / Corner / Line / End / Gate posts
- Caption: "Post locations are estimated for planning. Final cut list confirmed during order review."

**Right column — segment cards**
- Header: "Confirm slope by segment — X of Y confirmed"
- One card per structural segment (corner↔corner, end↔corner, end↔end)
- Cards ordered by compass bearing (North → East → South → West, or by draw order for non-rectangular fences)

**Segment card anatomy:**
- Left border color = segment tier color (yellow=flat, blue=rackable, red=heavy)
- Title: compass label (North side) or segment index if no compass data
- Subtitle: `[X] ft · [N] line posts · [N] corner posts`
- Auto-detect badge: "Auto: Flat" / "Auto: Sloped" / "Auto: Heavy" / "⚠ Needs review" (for unknown/low-confidence EPQS)
- Slope buttons: `No slope` / `Sloped` / `Heavy slope` — selected state highlighted
- If a gate is on this segment: a gate sub-row below the slope buttons showing type, width, swing, with an "Edit" link

**Gate "Edit" link** opens a lightweight inline modal with the same gate config fields from the draw tool (type, top: flat/arched, swing: left/right, widthInches dropdown). Changes update the overlay image snapshot and footage totals live within the wizard. This edit does NOT navigate back to the draw tool — all gate editing in the wizard is self-contained.

**CTA:** "Continue to Style →" — disabled and shows "Confirm [segment name] to continue" until all segments have a slope selection. Segments with "⚠ Needs review" must be explicitly confirmed even if auto-detect made a suggestion.

**Edge case — single-segment fence (straight line, no corners):** If `drawToolData` contains only one segment (e.g., a straight fence run with two end posts and no corners), the wizard renders a single card. The two-column layout still applies; the single card fills the right column with no progress counter ("Confirm your fence segment"). The CTA is gated on that one card being confirmed.

### Manual-entry buyer layout

Single-column layout (no image):

1. "Does any part of your fence have slope?" — **No / Yes** toggle
2. If Yes: "About how many of your [X] total feet are on a slope?" — slider from 0 to X, with rough bucket labels below: "Just a section (under 20%)" / "About half (40–60%)" / "Most of it (over 80%)"
3. Derived: `slopedPostCount = Math.round(slopedFt / panelSpacingFt)`
4. No segment breakdown — single racking tier applied across all posts proportionally

Gates for manual buyers are handled in the existing Gates step (Step 2) which is unchanged.

---

## 6. Data Model Changes

### drawToolData additions
```javascript
{
  // existing fields unchanged...

  // NEW: gate placements from draw tool Step 3
  gates: [GateObject],               // [] if no gates placed

  // NEW: map bounds for overlay projection
  mapBounds: {
    north: Number,  // from map.getBounds()
    south: Number,
    east: Number,
    west: Number,
  },

  // NEW: vertex positions for post rendering
  vertices: [
    { lat: Number, lng: Number, type: 'corner' | 'end', lineId: String }
  ],
}
```

### Per-segment data additions (lines[].segments[])
```javascript
{
  // existing fields unchanged...
  compassLabel: String,              // 'North' | 'East' etc — exists in SegmentCard.js but MUST be verified that it's included in the data passed from MapboxDrawView to QuoteBuilder (may need to be added to the segment object before handoff)
  userTierConfirmed: Boolean,        // NEW: true once buyer clicks a slope button
  userTierOverride: String | null,   // NEW: set when buyer overrides EPQS suggestion
  finalTier: String,                 // NEW: userTierOverride ?? recommendedTier
}
```

### Manufacturing payload additions
```javascript
{
  // existing fields unchanged...
  gateCount: Number,                 // gates.length
  gates: [                           // per-gate detail
    {
      type: String,                  // 'walk' | 'drive' | 'double'
      top: String,                   // 'flat' | 'arched'
      swing: String,                 // 'left' | 'right'
      widthInches: Number,           // consistent with QuoteStep3_Gates field name
    }
  ],
  gatePostCount: Number,             // gates.length * 2
  totalPanelFt: Number,              // totalFeet - sum(gate.widthInches / 12)
  slopedPostCount: Number,           // updated from confirmed segment tiers
  segmentTiers: [                    // per-segment tier array for manufacturing
    { segmentId: String, finalTier: String, lengthFt: Number }
  ],
}
```

---

## 7. QuoteBuilder Step Routing

### Draw-tool buyers
- QuoteBuilder receives `drawToolData` with `gates` populated
- Step 0 renders the segment wizard (new)
- Step 2 (Gates) renders a **read-only summary** of already-placed gates for draw-tool buyers, not a full entry form. The summary shows each gate's type, width, swing, and which segment it's on. An "Edit" link per gate opens the same inline modal used in the wizard. No navigation back to the draw tool required.
- This avoids using `skipToStep` to bypass Step 2 entirely, ensuring buyers have a natural review checkpoint for gates before checkout.

**Note:** The `skipToStep` prop exists on QuoteBuilder (line ~333) but is only used when the caller wants to start the buyer at a specific step. It is NOT used for this feature.

### Manual-entry buyers
- `drawToolData` is null or empty
- Step 0 renders the simplified slope question (no wizard, no image)
- Step 2 (Gates) renders normally — buyer adds gates here

---

## 8. Testing Plan

### Unit tests
- `legendOverlay.js`: test that given mock bounds + vertices, post markers are projected to correct pixel coordinates (use known lat/lng → expected pixel assertions)
- `projectToPixel()`: standalone unit test for the projection math
- Per-segment `finalTier` derivation: `userTierOverride ?? recommendedTier` logic
- Footage deduction: `totalPanelFt = totalFeet - sum(gate.widthInches / 12)` with multiple gates

### Integration tests (Playwright, against Cloudflare Pages preview)
1. **Draw-tool full flow**: draw fence → place single gate on South segment → confirm in wizard (override West slope to Heavy) → reach Review step → assert payload contains: correct `totalPanelFt`, `gateCount: 1`, `gates[0].type`, `slopedPostCount` from confirmed tiers, `segmentTiers` array
2. **Manual-entry slope flow**: enter 200ft manually → Yes to slope → slider to 80ft → reach Review → assert `slopedPostCount` derived correctly, no `segmentTiers` in payload
3. **No-gates skip**: draw fence → skip gate step → wizard shows no gate sub-rows → payload has `gateCount: 0`
4. **Low-confidence segment gate**: draw fence with one EPQS-unknown segment → wizard shows ⚠ badge → CTA stays disabled until that segment is confirmed
5. **Gate edit from wizard**: place gate in draw tool → reach wizard → click Edit on gate sub-row → change type from Single to Double → confirm footage totals update

### Manual smoke test checklist (before pushing to main)
- [ ] Overlay image renders post markers on Cloudflare preview (not just local)
- [ ] Gate gap visible on overlay image when gate placed
- [ ] Post totals footer matches sum of per-segment card post counts
- [ ] Segment card border color matches map line color
- [ ] CTA disabled state displays correctly on mobile viewport (375px)
- [ ] Skip gate step → wizard shows no gate rows → no gate fields in payload

---

## 9. Out of Scope (this sprint)

- Gate drag-to-reposition after initial placement (nice to have, post-launch)
- Gate hardware selection (latch type, hinges) — handled elsewhere in Style/Extras steps
- Manual-entry segment breakdown (they get the simple slope question only)
- Post placement conflict detection (e.g., gate too close to corner) — future sprint
- Obstacle/utility marking on the drawing — separate feature
