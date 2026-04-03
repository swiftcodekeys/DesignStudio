# Quote Engine Specification — Grandview Design Studio

**Date:** 2026-04-02
**Repo:** `C:\Users\sarah\Desktop\App Repos\fence-tool`
**Status:** Research + specification only. No code changes.
**Price Source:** Ultra Fence May 2025 Retail Price Book + Changes document.
**Existing pricing code:** `C:\Users\sarah\Desktop\grandview-quote-system\shared\pricing.js` (already structured — use as foundation)

---

## PART 1 — PRODUCT MATRIX

### Grades

| Grade | Panel Length | Rail Size | Picket Size | Post Options | Fence Heights | Max Double Gate Width |
|-------|------------|-----------|-------------|-------------|---------------|----------------------|
| **Residential** | 72" (6') | 1-1/8" x 1" | 5/8" x 5/8" | 2" x 2", 2.5" x 2.5" | 36, 42, 48, 54, 60, 72" | 12' |
| **Commercial** | 72" (6') | 1-3/8" x 1-1/4" | 3/4" x 3/4" | 2", 2.5", 3", 4" | 48, 60, 72" | 16' |
| **Industrial** | 96" (8') | 1-5/8" x 1-1/2" | 1" x 1" | 3", 4" | 48, 60, 72, 84, 96, 108, 120" | 20' |
| **Defender** | 96" (8') | 1-5/8" x 1-1/2" | 1" x 1" | 3", 4" | 84, 96" | 20' |

### Picket Spacing

| Grade | Standard Spacing | Optional (Pro) Spacing |
|-------|-----------------|----------------------|
| Residential | 3-13/16" | 1-5/8" |
| Commercial | 3-5/8" | 1-1/2" |
| Industrial | 3-5/8" | 1-5/16" |

Standard models: -100, -150, -200, -250, -300, -350.
Pro/optional spacing models: -101, -151, -201, -251, -301, -351.

### Style Matrix — Residential

| Grandview Name | Ultra Model (Std) | Ultra Model (Pro) | Type | Heights Available | Pool Code | Rackable |
|---------------|-------------------|-------------------|------|-------------------|-----------|----------|
| Horizon | UAF-200 | UAF-201 | Flat Top | 36, 42, 48, 54, 60, 72" | No | Yes |
| Haven | UAB-200 | — | Flat Top Flush | 48, 54, 60" | Yes (flush bottom) | Yes |
| Vanguard | UAF-250 | UAF-251 | Flat Top w/ Spear | 48, 54, 60, 72" | No | Yes |
| Charleston | UAS-100 | UAS-101 | Spear Point | 48, 54, 60, 72" | Yes (spear top) | Yes |
| Savannah | UAS-150 | UAS-151 | Staggered Spear | 48, 54, 60, 72" | Yes (spear top) | Yes |
| Cambridge (Eclipse) | UAS-300 | UAS-301 | Concave | 48, 54, 60, 72" | No | Yes |
| Lexington | UAS-350 | UAS-351 | Convex | 48, 54, 60, 72" | No | Yes |

Pool code compliance: Spear-top styles (Charleston, Savannah) and flush-bottom (Haven) meet
most pool barrier codes. All styles at 48"+ meet height requirements. Check local code for
specific picket spacing requirements (4" max gap for pool).

Rackability: All residential aluminum panels are rackable up to the stair-step angles
specified in the Ultra ordering guide. Custom racked panels available for $25 setup fee.

### Residential Panel Pricing — Standard Spacing (per 6' section)

```json
{
  "UAF-200": { "36": 137.50, "42_2r": 133.00, "42_3r": 146.00, "48_2r": 139.75, "48_3r": 153.00, "54": 162.00, "60": 166.50, "72": 211.00 },
  "UAB-200": { "48_2r": 139.75, "48_3r": 153.00, "54": 162.00, "60": 166.50 },
  "UAS-100": { "36": 143.75, "42": 137.50, "48": 150.75, "54": 157.00, "60": 166.50, "72": 214.75 },
  "UAS-150": { "36": 143.75, "42": 137.50, "48": 150.75, "54": 157.00, "60": 166.50, "72": 214.75 },
  "UAF-250": { "36": 143.75, "48": 150.75, "54": 155.25, "60": 164.50, "72": 169.25 },
  "UAS-300": { "36": 153.00, "42": 149.75, "48": 162.00, "54": 169.25, "60": 176.00, "72": 180.75 },
  "UAS-350": { "36": 153.00, "42": 149.75, "48": 162.00, "54": 169.25, "60": 176.00, "72": 180.75 }
}
```

### Residential Panel Pricing — Pro Spacing (per 6' section)

```json
{
  "UAF-201": { "36": 214.75, "42": 213.75, "48": 227.00, "54": 258.75, "60": 279.50, "72": 291.00 },
  "UAS-101": { "36": 217.25, "42": 218.00, "48": 229.00, "54": 260.50, "60": 281.25, "72": 293.00 },
  "UAS-151": { "36": 217.25, "42": 215.75, "48": 229.00, "54": 260.50, "60": 277.50, "72": 293.00 },
  "UAF-251": { "36": 217.25, "48": 229.00, "54": 260.50, "60": 291.00, "72": 293.00 },
  "UAS-301": { "36": 231.25, "42": 227.25, "48": 241.00, "54": 275.25, "60": 291.00, "72": 305.00 },
  "UAS-351": { "36": 231.25, "42": 227.25, "48": 241.00, "54": 275.25, "60": 305.00, "72": 305.00 }
}
```

### Commercial Panel Pricing — Standard Spacing (per 6' section)

```json
{
  "UAF-200-C": { "48": 201.25, "60": 231.25, "72": 260.50 },
  "UAS-100-C": { "48": 203.75, "60": 233.75, "72": 268.00 },
  "UAS-150-C": { "48": 203.75, "60": 233.75, "72": 268.00 },
  "UAF-250-C": { "48": 203.75, "60": 233.75, "72": 268.00 },
  "UAS-300-C": { "48": 217.25, "60": 244.75, "72": 281.25 },
  "UAS-350-C": { "48": 217.25, "60": 244.75, "72": 281.25 }
}
```

### Post Pricing (includes square cap)

```json
{
  "2x2": {
    ".060": { "60": 42.00, "72": 45.00, "84": 49.35 },
    ".080": { "60": 51.50, "72": 56.50, "84": 63.00, "96": 68.00, "108": 75.50 },
    ".125": { "60": 68.00, "72": 76.75, "84": 89.50, "96": 99.75, "108": 108.50 }
  },
  "2.5x2.5": {
    ".080": { "72": 56.50, "84": 63.00, "96": 68.00, "108": 75.50 },
    ".100": { "72": 79.25, "84": 89.50, "96": 99.75, "108": 108.50 },
    ".125": { "72": 76.75, "84": 89.50, "96": 99.75, "108": 108.50 }
  },
  "3x3": {
    ".125": { "72": 113.75, "84": 132.50, "96": 150.75, "108": 169.00, "120": 187.25, "144": 227.00 }
  },
  "4x4": {
    ".125": { "72": 166.50, "84": 194.25, "96": 217.75, "108": 244.50, "120": 266.25, "132": 288.75, "144": 311.50 }
  }
}
```

### Post Length by Fence Height

| Fence Height | Post Length Required |
|-------------|-------------------|
| 36" | 60" |
| 42" | 72" |
| 48" | 72" |
| 54" | 84" |
| 60" | 84" |
| 72" | 96" |
| 84" | 108" |
| 96" | 120" |
| 108" | 132" |
| 120" | 144" |

### Gate Compatible Widths

| Gate Type | Residential Widths | Commercial Widths | Industrial Widths |
|-----------|-------------------|-------------------|-------------------|
| Walk/Single | 36, 42, 48, 60, 72" | 36, 42, 48, 60, 72" | 36, 42, 48, 60, 72, 96" |
| Drive/Double | 6, 7, 8, 10, 11, 12' | 6, 7, 8, 10, 12, 16' | 6, 7, 8, 10, 12, 16, 20' |

### Post Size by Grade

| Grade | Standard Post | Upgraded Post | Gate Post |
|-------|-------------|--------------|-----------|
| Residential | 2" x 2" (.060 wall) | 2.5" x 2.5" (.100 wall) | 4" x 4" (for Ultra hinges) |
| Commercial | 2" x 2" (.080 wall) or 2.5" | 3" x 3" (.125 wall) | 4" x 4" |
| Industrial | 3" x 3" (.125 wall) | 4" x 4" (.125 wall) | 4" or 6" steel |

---

## PART 2 — PRICING CALCULATION LOGIC

### Existing Foundation

A complete pricing module already exists at:
`C:\Users\sarah\Desktop\grandview-quote-system\shared\pricing.js`

This file contains:
- `PANEL_PRICING` — all grades, all models, all heights
- `POST_PRICING` — all sizes, wall thicknesses, lengths
- `GATE_PRICING` — walk + drive gates, all grades, all widths
- `ACCESSORY_PRICING` — caps, finials, circles, hardware, flanges, puppy surcharge
- `GATE_SURCHARGES` — arch, u-frame, estate, v-trac per linear foot
- Helper functions: `getPanelPrice()`, `getGatePrice()`, `getPostPrice()`, `customerPriceRange()`
- Discount: `GRANDVIEW_COST_MULTIPLIER = 0.51` (Grandview pays 51% of retail)
- Margin: `DEFAULT_MARGIN = 0.30` (30% markup on cost)

**IMPORTANT:** The Design Studio's customer-facing quote engine uses RETAIL prices only.
Dealer cost and margin logic exist ONLY in the admin tool (separate codebase).
The Design Studio never imports or exposes `GRANDVIEW_COST_MULTIPLIER` or `sellPrice()`.

### Calculation Formulas

#### 1. Panel Count from Linear Footage

```
PANEL_LENGTH_FT = 6   // Residential and Commercial panels are 6'
PANEL_LENGTH_FT_IND = 8  // Industrial panels are 8'

panelCount = ceil(linearFeet / PANEL_LENGTH_FT)

// Example: 150 LF → ceil(150 / 6) = 25 panels
// Example: 37 LF → ceil(37 / 6) = 7 panels (last panel is partial — they ship full panels)
```

NOTE: Panels ship as full sections. The customer buys full panels.
A custom-cut panel is available for $25 setup fee but is rarely needed.

#### 2. Post Count from Layout

```
POSTS PER RUN:
  endPosts = 2 per run  (one at each end)
  linePosts = panelsInRun - 1  (between panels, within a straight run)
  cornerPosts = number of direction changes

TOTAL POST FORMULA:
  For a SINGLE straight run:
    totalPosts = panelCount + 1
    (because: 1 end post, [panelCount - 1] line posts, 1 end post = panelCount + 1)

  For MULTIPLE runs with corners:
    Each corner consumes one corner post (which serves as the end post
    of one run and the start post of the next).
    
    totalPosts = totalPanels + totalRuns - totalCorners
    
    Where:
    - totalPanels = sum of panels across all runs
    - totalRuns = number of fence runs (line segments)
    - totalCorners = corners connecting runs
    
    Simplified for a single closed/connected layout:
    totalPosts = totalPanels + 1 + extraEnds
    where extraEnds = number of open run terminuses beyond the first

  Practical approximation (used by pricing.js):
    totalPosts = totalPanels + 1

GATE POSTS:
  Each gate requires 2 gate posts (not included in gate price).
  Gate posts are typically 4" x 4" for Ultra Adjustable Hinges.
  These are ADDITIONAL to the fence line post count.
  If a gate replaces a fence section, subtract 1 line post, add 2 gate posts.
```

#### 3. Gate Pricing

```
gatePrice = GATE_PRICING[gateModel][heightInches][widthInches]

// Walk gate (single): model suffix "W"
// Drive gate (double): model suffix "D"

// Gate hardware is SOLD SEPARATELY — not included in gate price:
//   - 1 pair of hinges (standard $29.00, Ultra Adjustable $290.00)
//   - 1 latch (LokkLatch $43.75, MagnaLatch $162.00, etc.)
//   - 1 drop rod (for double gates only) $34.00

// Surcharges:
if (gateTop === 'arch') gatePrice += GATE_SURCHARGES.arch * gateWidthFt
if (gateTop === 'estate') gatePrice += GATE_SURCHARGES.estate * gateWidthFt
if (singleGateWidth > 72 || doubleGateWidth > 144)
    gatePrice += GATE_SURCHARGES.uFrame * gateWidthFt
```

#### 4. Post Cap / Finial Add-Ons

```
// Post caps: standard flat cap is INCLUDED with each post
// Upgrade to ball cap:
ballCapUpcharge = ACCESSORY_PRICING.caps["2.5-ball"] - ACCESSORY_PRICING.caps["2.5-flat"]
// = $25.25 - $8.75 = $16.50 per post for residential 2.5"

// Finials: per picket, 15 per 6' section
finialCostPerSection = 15 * ACCESSORY_PRICING.finials.quad  // 15 × $8.75 = $131.25/section
totalFinialCost = finialCostPerSection * panelCount

// Circles: 16 per 6' section
circleCostPerSection = 16 * ACCESSORY_PRICING.decorative.circles  // 16 × $11.00 = $176.00/section
```

#### 5. Hardware (Sold Separately per Gate)

```
PER GATE HARDWARE PACKAGE:
  hinges:  1 pair (choice of type)
  latch:   1 (choice of type)
  dropRod: 1 (double gates only)

MINIMUM HARDWARE PER WALK GATE:
  standardHinge ($29.00) + lokkLatch ($43.75) = $72.75

RECOMMENDED HARDWARE PER WALK GATE:
  ultraHinge ($290.00) + lokkLatchDeluxe ($133.00) = $423.00

POOL GATE HARDWARE:
  truClose self-closing ($83.00) + magnaLatch ($162.00) = $245.00
```

#### 6. Upcharges

```
SHORT PICKETS (puppy pickets):
  Residential: $57.00 per section
  Commercial:  $62.25 per section
  Industrial:  $72.50 per section

DOUBLE PUNCH POSTS:
  $4.75 per post (required for racking / stair-stepping)

PREMIUM COLOR (Silver):
  Call for pricing (flag in UI: "Contact us for Silver pricing")

CUSTOM WIDTH PANELS:
  $25.00 setup fee per order

CUSTOM POST ROUTING:
  $9.25 per hole
```

### Worked Example A

**150 LF, 4 corners, Horizon 48", 1 walk gate 48" wide, standard spacing, residential**

```
STYLE: UAF-200, HEIGHT: 48", GRADE: Residential

PANELS:
  150 LF ÷ 6' = 25 panels
  panelPrice = $153.00 (48" 3-rail)
  panelTotal = 25 × $153.00 = $3,825.00

POSTS:
  totalPosts = 25 + 1 = 26 posts (simplified)
  Actually with 4 corners and a gate:
    26 fence posts + 2 gate posts = 28 posts total
  postSize = 2" × 2" (.060 wall), postLength = 72"
  postPrice = $45.00
  fencePostTotal = 26 × $45.00 = $1,170.00
  gatePostPrice = 4" × 4" (.125 wall), 72" = $166.50
  gatePostTotal = 2 × $166.50 = $333.00
  postTotal = $1,170.00 + $333.00 = $1,503.00

GATE:
  UAF-200W, 48" height, 48" wide = $393.00

HARDWARE (1 walk gate):
  Standard hinges: $29.00 pair
  LokkLatch: $43.75
  hardwareTotal = $72.75

POST CAPS (flat included, no upgrade):
  $0.00

SUBTOTAL:
  $3,825.00 + $1,503.00 + $393.00 + $72.75 = $5,793.75

SHIPPING:
  Michigan: $252.00 (if under freight threshold)
  Free if order > $5,500 (this order qualifies at $5,793.75)

ESTIMATE SHOWN TO CUSTOMER: ~$5,794
```

### Worked Example B

**300 LF, 6 corners, Charleston 60" commercial, 1 walk gate 48" + 1 driveway gate 10', puppy picket**

```
STYLE: UAS-100-C, HEIGHT: 60", GRADE: Commercial

PANELS:
  300 LF ÷ 6' = 50 panels
  panelPrice = $233.75 (60" 3-rail, commercial standard)
  panelTotal = 50 × $233.75 = $11,687.50

PUPPY PICKET SURCHARGE:
  Commercial = $62.25 per section
  puppyTotal = 50 × $62.25 = $3,112.50

POSTS:
  totalPosts = 50 + 1 = 51 fence posts + 4 gate posts (2 per gate)
  Fence: 3" × 3" (.125 wall), postLength = 84"
  fencePostPrice = $132.50
  fencePostTotal = 51 × $132.50 = $6,757.50
  Gate: 4" × 4" (.125 wall), 84" = $194.25
  gatePostTotal = 4 × $194.25 = $777.00
  postTotal = $6,757.50 + $777.00 = $7,534.50

WALK GATE:
  UAS-100W-C, 60" height, 48" wide = $482.50

DRIVEWAY GATE:
  UAS-100D-C (commercial double), 60" height, 10' wide = $1,056.75

HARDWARE:
  Walk gate: Ultra hinges $290.00 + LokkLatch Deluxe $133.00 = $423.00
  Drive gate: Ultra hinges $290.00 + LokkLatch Deluxe $133.00 + Drop Rod $34.00 = $457.00
  hardwareTotal = $880.00

POST CAPS (upgrade all 55 to ball):
  3" ball cap = $27.50 each
  Standard 3" cap included = $11.00
  Upgrade per post = $27.50 - $11.00 = $16.50
  capTotal = 55 × $16.50 = $907.50

SUBTOTAL:
  $11,687.50 + $3,112.50 + $7,534.50 + $482.50 + $1,056.75 + $880.00 + $907.50 = $25,661.25

SHIPPING:
  Over $8,500 threshold for most states. Free for most destinations.

ESTIMATE SHOWN TO CUSTOMER: ~$25,661
```

### Pseudocode — Full Quote Calculator

```
function calculateQuote(config):
    // Inputs
    style     = config.style          // "horizon", "charleston", etc.
    height    = config.height         // 48, 60, 72, etc.
    grade     = config.grade          // "residential", "commercial", "industrial"
    linearFt  = config.linearFeet
    corners   = config.corners
    runs      = config.runs           // array of { lengthFt, terrain }
    gates     = config.gates          // array of { type, width, top, hardware }
    postCap   = config.postCap        // "flat" | "ball" | "solar"
    puppy     = config.puppyPickets   // boolean
    finials   = config.finials        // null | "tri" | "quad"
    circles   = config.circles        // boolean

    // Derived
    panelLengthFt = (grade === "industrial") ? 8 : 6
    panelCount = ceil(linearFt / panelLengthFt)
    
    // Post count
    fencePostCount = panelCount + 1
    gatePostCount  = gates.length * 2
    totalPostCount = fencePostCount + gatePostCount

    // Prices
    panelPrice = lookupPanelPrice(style, height, grade)
    postPrice  = lookupPostPrice(grade, height)
    
    // Line items
    items = []
    items.push({ label: "Fence Panels", qty: panelCount, unit: panelPrice, total: panelCount * panelPrice })
    items.push({ label: "Fence Posts", qty: fencePostCount, unit: postPrice, total: fencePostCount * postPrice })
    
    if (gatePostCount > 0):
        gatePostPrice = lookupGatePostPrice(grade, height)
        items.push({ label: "Gate Posts (4\")", qty: gatePostCount, unit: gatePostPrice, total: gatePostCount * gatePostPrice })
    
    for each gate in gates:
        gatePrice = lookupGatePrice(style, height, gate.width, gate.type, grade)
        surcharges = 0
        if (gate.top === "arch"): surcharges += 43.25 * (gate.width / 12)
        if (gate.top === "estate"): surcharges += 49.00 * (gate.width / 12)
        if (needsUFrame(gate)): surcharges += 19.00 * (gate.width / 12)
        items.push({ label: gateLabel(gate), qty: 1, unit: gatePrice + surcharges, total: gatePrice + surcharges })
        
        // Hardware per gate
        hwTotal = gate.hardware.hinge + gate.hardware.latch
        if (gate.type === "double"): hwTotal += 34.00  // drop rod
        items.push({ label: "Hardware — " + gate.label, qty: 1, unit: hwTotal, total: hwTotal })
    
    if (puppy):
        puppySurcharge = lookupPuppySurcharge(grade)
        items.push({ label: "Puppy Pickets (short picket add-on)", qty: panelCount, unit: puppySurcharge, total: panelCount * puppySurcharge })
    
    if (postCap !== "flat"):
        capUpgrade = lookupCapUpgrade(grade, postCap)
        items.push({ label: "Post Cap Upgrade (" + postCap + ")", qty: totalPostCount, unit: capUpgrade, total: totalPostCount * capUpgrade })
    
    if (finials):
        finialsPerSection = 15
        finialPrice = 8.75
        items.push({ label: "Finials (" + finials + ")", qty: panelCount * finialsPerSection, unit: finialPrice, total: panelCount * finialsPerSection * finialPrice })
    
    if (circles):
        circlesPerSection = 16
        circlePrice = 11.00
        items.push({ label: "Decorative Circles", qty: panelCount * circlesPerSection, unit: circlePrice, total: panelCount * circlesPerSection * circlePrice })

    subtotal = sum(items.total)
    
    return { items, subtotal, panelCount, totalPostCount }
```

---

## PART 3 — DRAW TOOL AUDIT

### Current Capture (DrawYardView.js)

The Draw Tool at `DrawYardView.js` (670 lines) has three sub-components:
`AddressEntry` (lines 54-187), `DrawingMap` (lines 192-360), `DrawingPanel` (lines 365-483).

#### Data Currently Captured

| Field | Type | Variable | Location | Notes |
|-------|------|----------|----------|-------|
| Property address | string | `location.address` | Line 126 | From Google Places Autocomplete |
| Map center lat | number | `location.lat` | Line 126 | From Google Geocoder |
| Map center lng | number | `location.lng` | Line 127 | From Google Geocoder |
| Line label | string | `lines[i].label` | Line 247/406 | Default "Line N", user-editable |
| Point coordinates | array | `lines[i].points[j]` | Line 233/316 | `{ lat, lng }` per click or drag |
| Segment distance | number | calculated | Line 331 | Haversine formula, `distanceFt()` at lines 40-49 |
| Total line footage | number | calculated | Line 386/581 | Sum of segment distances per line |
| Total footage | number | `data.totalLengthFt` | Line 594 | Sum across all lines |
| Corner count | number | `data.corners` | Line 596 | `points.length - 2` per line (intermediate points) |
| Timestamp | string | `data.timestamp` | Line 592 | ISO 8601 |

#### Output Object (localStorage `gv_draw_layout`)

```json
{
  "source": "gps-draw-tool",
  "address": "123 Main St, Howell, MI 48843",
  "lines": [
    {
      "label": "Back Fence",
      "lengthFt": 87,
      "points": [
        { "lat": 42.7214, "lng": -83.4567 },
        { "lat": 42.7225, "lng": -83.4580 },
        { "lat": 42.7220, "lng": -83.4590 }
      ]
    }
  ],
  "totalLengthFt": 142,
  "corners": 3,
  "mapCenter": { "lat": 42.7214, "lng": -83.4567 },
  "timestamp": "2026-04-02T14:30:00.000Z"
}
```

### What the Draw Tool COULD Capture But Doesn't

| Missing Data | Why It Matters | Difficulty |
|-------------|---------------|-----------|
| **Gate placement** (which segment, position along segment) | Needed for accurate post count — gates interrupt fence runs and require separate gate posts | Medium — add clickable gate markers on segments |
| **Gate type and width** per marker | Different gates need different openings, changing panel count | Medium — popup form per gate marker |
| **Slope indicator per segment** | Racked panels cost extra ($4.75/post for double punch), and severe slopes may require stair-stepping which changes panel count | Easy — per-segment dropdown |
| **Terrain type per segment** (flat / gentle slope / steep / retaining wall) | Affects installation complexity and whether racking or stair-step is needed | Easy — per-segment dropdown |
| **Corner auto-derivation from angle** | Currently counts all intermediate points as corners, but a straight point isn't a corner | Medium — calculate angle between segments, only count >15 degree changes |
| **End post vs corner post distinction** | Different post types at terminations vs direction changes | Easy — derive from line start/end points |
| **Obstacle markers** (trees, sheds, AC units) | Warns about potential conflicts during installation | Low priority — nice-to-have |
| **Property line overlay** | Helps ensure fence is inside property boundary | Hard — requires parcel data API |

### Minimum Viable Per-Segment Interaction

When the user finishes drawing a line segment (places point 3+), show a brief inline prompt:

```
┌──────────────────────────────────────────┐
│ This section: 47 ft                      │
│                                          │
│ Ground:  [Flat ▾]  [Gentle Slope ▾]     │
│          [Steep Slope ▾]  [Steps ▾]     │
│                                          │
│ Gate on this section?  [+ Add Gate]      │
└──────────────────────────────────────────┘
```

If they click "Add Gate":
```
┌──────────────────────────────────────────┐
│ Gate Type:  [Walk (3-4') ▾]             │
│ Width:      [48" ▾]                      │
│ [Add Gate]  [Cancel]                     │
└──────────────────────────────────────────┘
```

Total additional interaction: 1 dropdown per segment (terrain) + optional gate button.
This adds ~3 seconds per segment — acceptable.

### Proposed Enhanced Output Object

```json
{
  "source": "gps-draw-tool",
  "version": 2,
  "address": "123 Main St, Howell, MI 48843",
  "lines": [
    {
      "label": "Back Fence",
      "lengthFt": 87,
      "terrain": "flat",
      "points": [
        { "lat": 42.7214, "lng": -83.4567 },
        { "lat": 42.7225, "lng": -83.4580 },
        { "lat": 42.7220, "lng": -83.4590 }
      ],
      "gates": [
        {
          "afterPointIndex": 1,
          "type": "walk",
          "widthInches": 48,
          "positionFt": 32
        }
      ]
    },
    {
      "label": "Side Fence",
      "lengthFt": 55,
      "terrain": "gentle-slope",
      "points": [
        { "lat": 42.7220, "lng": -83.4590 },
        { "lat": 42.7210, "lng": -83.4600 }
      ],
      "gates": []
    }
  ],
  "totalLengthFt": 142,
  "corners": [
    {
      "pointIndex": 2,
      "lineIndex": 0,
      "angleDegrees": 92,
      "type": "corner"
    }
  ],
  "cornerCount": 1,
  "endCount": 2,
  "gates": [
    { "lineIndex": 0, "type": "walk", "widthInches": 48 }
  ],
  "gateCount": 1,
  "mapCenter": { "lat": 42.7214, "lng": -83.4567 },
  "timestamp": "2026-04-02T14:30:00.000Z"
}
```

---

## PART 4 — MANUAL ENTRY QUESTION SET

For users who skip the Draw Tool and enter footage manually.
All questions map directly to pricing calculation inputs.

### Question 1: Total Linear Footage

```
How many linear feet of fencing do you need?
Type: number stepper (increment by 10, min 20, max 2000)
Default: 100
Calculation: panelCount = ceil(value / 6)
```

### Question 2: Number of Corners

```
How many corners or direction changes?
Type: stepper (0-20)
Default: 2
Visual: simple diagram showing 0, 1, 2, 4 corner examples
Calculation: cornerPosts, may affect racking
```

### Question 3: Ground Conditions

```
Describe your terrain:
Type: single-select cards
Options:
  - "Flat or nearly flat" (default) → no surcharge
  - "Gentle slope (< 6 inches per panel)" → rackable, +$4.75/post for double punch
  - "Steep slope (> 6 inches per panel)" → stair-step, custom cuts needed, flag for consultation
  - "Mixed — some flat, some sloped" → flag for consultation
Calculation: doublePunchSurcharge = slopeType !== "flat" ? postCount * 4.75 : 0
```

### Question 4: Gate Count and Type

```
How many gates do you need?
Type: counter with detail expansion

Per gate:
  Type: [Walk Gate ▾] / [Drive Gate ▾]
  Width: 
    Walk: [36" ▾] [42" ▾] [48" ▾] (default) [60" ▾] [72" ▾]
    Drive: [8' ▾] (default) [10' ▾] [12' ▾]
  Self-closing needed? [Yes] [No] (show only if pool-code style selected)

Default: 1 walk gate, 48" wide
Calculation: gatePricing + gatePostCount + hardware
```

### Question 5: Post Cap Preference

```
Post cap style:
Type: image card select (2 options)
Options:
  - "Standard Flat Cap" (included) — thumbnail image
  - "Ball Cap" (+$16.50/post) — thumbnail image
Default: Standard Flat
Calculation: capUpgrade * totalPostCount
```

### Question 6: Installation Plan

```
Who will install the fence?
Type: single-select cards
Options:
  - "I'll install it myself (DIY)"
  - "I have a contractor"
  - "I need an installer referral"
Default: none (required)
Calculation: no price impact — but "need referral" triggers consultation CTA prominence
```

### Mapping Summary

| Question | Field | Feeds Into |
|----------|-------|-----------|
| Q1: Footage | `linearFeet` | `panelCount`, `postCount` |
| Q2: Corners | `corners` | `cornerPosts`, layout complexity |
| Q3: Terrain | `terrain` | `doublePunchSurcharge`, consultation flag |
| Q4: Gates | `gates[]` | `gatePrice`, `gatePostCount`, `hardware` |
| Q5: Post Cap | `postCap` | `capUpgrade` per post |
| Q6: Install | `installPlan` | CTA weighting (not price) |

---

## PART 5 — QUOTE DISPLAY SPEC

### Itemized Breakdown

```
┌─────────────────────────────────────────────────────────┐
│  YOUR ESTIMATE                                          │
│                                                          │
│  Grade: [Residential ▾]  Height: [48" ▾]               │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  Fence Panels                                            │
│  25 sections × $153.00                        $3,825.00 │
│  ‹ 150 linear feet of Horizon at 48" ›                  │
│                                                          │
│  Fence Posts                                             │
│  26 posts × $45.00                            $1,170.00 │
│  ‹ Includes 2 end posts, 4 corner posts,                │
│    20 line posts — calculated from your layout ›        │
│                                                          │
│  Gate Posts (4" heavy duty)                              │
│  2 posts × $166.50                              $333.00 │
│                                                          │
│  Walk Gate — 48" wide, straight top                      │
│  1 × $393.00                                    $393.00 │
│                                                          │
│  Gate Hardware                                           │
│  Standard hinges + LokkLatch                     $72.75 │
│                                                          │
│  ─────────────────────────────────────────────────────── │
│  SUBTOTAL                                    $5,793.75  │
│                                                          │
│  Shipping: Calculated at checkout                        │
│  Installation: Not included                              │
│  ‹ Request a free installer referral below ›            │
│                                                          │
│  ═══════════════════════════════════════════════════════ │
│                                                          │
│  [  Reserve Materials — Pay Deposit  ]  ← orange CTA    │
│  [  Schedule Free Consultation       ]  ← outline CTA   │
│                                                          │
│  Both always visible. Never hide consultation.           │
└─────────────────────────────────────────────────────────┘
```

### Grade Selector

Always visible at the top of the estimate. Live-updates all prices on change.

| Grade | Label | Tooltip (plain English) |
|-------|-------|----------------------|
| Residential | "Residential" (default) | "Standard aluminum fence for homes. 5/8\" pickets, perfect for backyards, pools, and property lines." |
| Commercial | "Commercial" | "Heavier-duty fence with 3/4\" pickets and thicker rails. Built for businesses, HOAs, and high-traffic areas." |
| Industrial | "Industrial" | "Maximum strength with 1\" pickets and 8-foot panels. For government, schools, and critical infrastructure." |

### Height Selector

Show ALL available heights for the selected style, not just the Design Studio's 3-4 options.

Example for Horizon (UAF-200) Residential:
`[36"] [42"] [48"] [54"] [60"] [72"]`

Example for Haven (UAB-200) Residential:
`[48"] [54"] [60"]` (no 36, 42, 72 available)

### CYA Language (Exact Copy)

**Estimate Accuracy:**
> This estimate is based on the material quantities calculated from your layout. Actual quantities may vary based on site conditions and final measurements. All estimates are subject to confirmation before materials are ordered.

**Slope/Terrain:**
> Sloped terrain may require additional posts, racked panels, or stair-stepped sections. If your property has significant grade changes, we recommend a free consultation to confirm quantities.

**Final Quantities:**
> Final material quantities will be confirmed with you before any order is placed or payment processed. You'll receive a detailed quote within one business day of your request.

**Reassurance (below CTAs):**
> No commitment required. Your deposit is fully refundable if quantities change after site review.

### CTA Buttons

**Primary: "Reserve Materials — Pay Deposit"**
- Orange background (`--cta: #d4753a`)
- Opens Stripe checkout with 10% deposit amount
- Shows: "10% deposit secures your materials. Balance due before shipment."

**Secondary: "Schedule Free Consultation"**
- White/outline style with brand-blue border
- Opens contact form (Part 6) pre-filled with estimate summary
- Shows: "Talk to a fence specialist about your project"

Both CTAs always visible side by side. Never hide the consultation option. Users who aren't ready to pay still generate a lead.

---

## PART 6 — CONTACT POPUP SPEC

### Fields

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| Name | text input | Yes | min 2 chars |
| Email | email input | Yes | valid email format |
| Phone | tel input | No | digits only, 10+ chars |
| Message / "Tell us about your project" | textarea | Yes | min 10 chars |

### Behavior

- **Trigger:** "Contact Us" or "Questions?" link in TopNav or footer
- **Separate from the quote flow** — this is a general contact form, not a quote request
- **On submit:** POST JSON to Google Apps Script web app endpoint
- **Success:** Show green checkmark + "Message sent! We'll reply within 1 business day." in popup. Don't navigate away.
- **Error:** Show red message: "Couldn't send your message. Please try again or call (855) FENCE-30." Keep the form filled so the user doesn't lose their message.
- **Rate limit:** Disable submit button for 30 seconds after successful send

### Google Apps Script Structure

```
ENDPOINT: https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec

POST BODY (JSON):
{
  "name": "Sarah Johnson",
  "email": "sarah@example.com",
  "phone": "5175551234",
  "message": "I need a quote for 200 feet of...",
  "source": "design-studio-contact",
  "timestamp": "2026-04-02T14:30:00.000Z",
  "pageUrl": "https://designstudio.grandviewfence.com/",
  "userAgent": "Mozilla/5.0..."
}
```

**Apps Script Handler (Code.gs):**

```
function doPost(e):
  1. Parse JSON from e.postData.contents
  2. Open Google Sheet by ID (SHEET_ID env or hardcoded)
  3. Get sheet named "Contacts" (create if missing)
  4. Append row: [timestamp, name, email, phone, message, source, pageUrl]
  5. Send email:
     To: sales@grandviewfence.com
     Subject: "Design Studio Contact — {name}"
     Body:
       Name: {name}
       Email: {email}
       Phone: {phone}
       
       Message:
       {message}
       
       ---
       Source: {source}
       Page: {pageUrl}
       Time: {timestamp}
  6. Return JSON: { "status": "ok" }
  
  On error:
  7. Return JSON: { "status": "error", "message": error.toString() }
```

**Google Sheet Columns:**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Timestamp | Name | Email | Phone | Message | Source | Page URL |

**Deployment:**
- Deploy as Web App
- Execute as: "Me" (the Google account owner)
- Who has access: "Anyone" (no login required)
- Returns: JSON

**CORS Note:** Google Apps Script web apps accept POST from any origin when deployed
as "Anyone". No CORS headers needed on the client side — use `fetch()` with `mode: 'no-cors'`
or handle the opaque response. Better: use `mode: 'cors'` and handle the redirect that
Google Apps Script returns (it returns a 302 → 200 with JSON body).

---

## PART 7 — SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────┐
│                    CUSTOMER-FACING                            │
│                                                              │
│  ┌─────────────────────┐     ┌─────────────────────┐        │
│  │  Grandview Website   │     │  Design Studio       │        │
│  │  (Framer)            │     │  (Cloudflare Pages)  │        │
│  │                      │     │                      │        │
│  │  - Marketing pages   │     │  - 3D Gate viewer    │        │
│  │  - Product pages     │     │  - Fence configurator│        │
│  │  - Contact form      │     │  - Draw Your Yard    │        │
│  │  - Blog/SEO          │     │  - Quote Engine      │        │
│  └──────────┬───────────┘     └──────────┬───────────┘        │
│             │                            │                    │
│             │ POST /contact              │ POST /contact      │
│             │                            │ POST /quote        │
│             │                            │ Stripe Checkout    │
│             ▼                            ▼                    │
│  ┌──────────────────────────────────────────────────┐        │
│  │  Google Apps Script (Web App)                     │        │
│  │  - doPost() handler                               │        │
│  │  - Routes: /contact, /quote                       │        │
│  │  - Writes to Google Sheet                         │        │
│  │  - Emails sales@grandviewfence.com                │        │
│  └──────────────────────┬───────────────────────────┘        │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────┐        │
│  │  Google Sheet — "Lead Log"                        │        │
│  │  Tab 1: Contacts (general inquiries)              │        │
│  │  Tab 2: Quotes (quote requests with config)       │        │
│  │  Tab 3: Deposits (Stripe-confirmed payments)      │        │
│  └──────────────────────────────────────────────────┘        │
│                                                              │
│  ┌──────────────────────────────────────────────────┐        │
│  │  Stripe                                           │        │
│  │  - Checkout sessions for deposits                 │        │
│  │  - Webhook → Google Apps Script for confirmation  │        │
│  │  - Customer-facing receipts                       │        │
│  └──────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│                    ADMIN (SEPARATE CODEBASE)                  │
│                                                              │
│  ┌─────────────────────────────────────────────────┐         │
│  │  Admin Tool (separate build, later)              │         │
│  │  - Google Sheets API (read Lead Log)             │         │
│  │  - Separate pricing layer with dealer cost       │         │
│  │  - Margin calculator (retail × 0.51 = cost)      │         │
│  │  - Never imports from Design Studio codebase     │         │
│  │  - Never exposes cost/margin to customers        │         │
│  └─────────────────────────────────────────────────┘         │
│                                                              │
│  FIREWALL: Dealer costs and margin logic NEVER appear in     │
│  the Design Studio or any customer-facing code. The pricing  │
│  module in the Design Studio uses RETAIL list prices only.   │
│  The admin tool is a completely separate codebase.           │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow — Quote Request

```
1. User configures fence in Design Studio
2. User enters footage (Draw Tool or manual)
3. Quote Engine calculates using RETAIL prices (client-side)
4. User sees itemized estimate
5. User clicks "Schedule Consultation" OR "Reserve Materials"

PATH A — Consultation:
  6a. Contact popup opens, pre-filled with estimate summary
  7a. POST to Google Apps Script
  8a. Sheet row added + email sent to sales@
  9a. Sarah sees lead in Google Sheet, calls customer

PATH B — Deposit:
  6b. Stripe Checkout session created (10% of subtotal)
  7b. Customer pays via Stripe
  8b. Stripe webhook → Google Apps Script → Sheet row added
  9b. Sarah sees confirmed deposit, processes order
```

### Data Flow — Contact Form

```
1. User clicks "Contact Us" anywhere in the Design Studio
2. Popup form appears (name, email, phone, message)
3. POST to same Google Apps Script endpoint (different source tag)
4. Sheet row added to "Contacts" tab + email to sales@
5. Sarah sees inquiry in Google Sheet
```

### What Lives Where

| Component | Location | Accesses |
|-----------|----------|---------|
| Product matrix (styles, heights, specs) | Design Studio `configData.js` | Read-only |
| Retail pricing data | Design Studio `pricing.js` (copy from grandview-quote-system) | Read-only |
| Quote calculation logic | Design Studio client-side JS | Retail prices only |
| Contact form | Design Studio popup | Google Apps Script |
| Quote submissions | Design Studio → Google Apps Script | Sheet + email |
| Stripe checkout | Design Studio → Stripe | Stripe API |
| Lead log | Google Sheet | Read by admin tool |
| Dealer cost / margins | Admin tool ONLY | Never in Design Studio |
| Order processing | Admin tool ONLY | Reads leads, manages orders |

### Security Boundaries

1. **Retail prices are NOT secret.** They come from Ultra's published price book. Showing them to customers is fine.
2. **Grandview's cost (49% discount) is secret.** Never reference `GRANDVIEW_COST_MULTIPLIER` or `grandviewCost()` in any customer-facing code.
3. **Stripe secret keys** live in environment variables, never in client-side code. Use Stripe Checkout (redirect) not Stripe Elements (inline).
4. **Google Apps Script deployment key** is public by nature (it's a URL). Rate-limit by IP or add a simple API key check if spam becomes an issue.
