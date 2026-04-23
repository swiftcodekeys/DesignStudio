# Split 03: UI Redesign Design — "Grandview Design Studio"

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Complete UI overhaul from dark sidebar to bottom-strip + flyout panel layout with conversion optimization
**Mockup:** `mockup-v6.html` (served via webpack dev server)

---

## Design Summary

Replace the current left sidebar (Sidebar.js) with an immersive full-viewport layout: sky-blue top nav, dark 3D viewport, bottom flyout panels with 7 config tabs, sky-blue bottom strip, and SEO backlinks footer. Dark theme with toned-down orange accents (#d4753a). Apple-like precision.

## Important Clarifications

**Architecture:** This is a **React + Webpack** app (not Vanilla JS). The repo CLAUDE.md incorrectly states "Vanilla JS" — the actual code uses `import React`, JSX, `useState`, and webpack bundling. The CLAUDE.md needs updating to reflect this.

**Color Display Names:** configData.js uses Ultra's internal names. The UI must show Grandview consumer names:

| configData name | Display name | Hex |
|----------------|-------------|-----|
| Gloss Black | Black | #090909 |
| Textured Black | Satin Black | #0c0c0c |
| Gloss Bronze | Bronze | #42382c |
| Textured Bronze | Satin Bronze | #42382c |
| Gloss White | White | #f4f4f4 |
| Textured White | Satin White | #f2f2f2 |
| Textured Khaki | Beige | #cdbeaf |
| Silver | Silver | #c8c8c8 |

Note: Forest Green is listed in CLAUDE.md but has no configData entry and no Ultra PBR values. Add it when values are extracted (Phase 2). For now, 8 colors.

**Arch Naming:** configData has `id: 'r', name: 'Royal'` but the thumbnail is `th_so_arrv.jpg` (reverse). Ultra's UI calls it "Reverse." Update configData: rename 'Royal' → 'Reverse'.

**Finial fp:** configData has `name: 'Pyramid'` but thumbnail is `th_pc_plg.jpg` (plug). Ultra calls it "Plug." Update configData: rename 'Pyramid' → 'Plug'.

**Puppy Pickets:** Show all 10 variants (not 8). The thumbnails exist for: std, fls, plg, pls, qua, qus, spe, sps, tri, trs.

**Config State:** Add `leaf` (from style's `leafDefault`) and `mount: 'p'` to the config object in app.js. Include `mount` in URL hash params.

**QuizPage route:** Preserve the `/fence-quiz` route as-is. It's independent of the Design Studio UI.

**Heights prerequisite:** Remove 36" and 54" from HEIGHTS array in configData.js as a first task before UI work begins.

**PDF dependencies:** Install `html2canvas` and `jspdf` via npm. They will be bundled by webpack.

---

## Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ [Logo 80px] Grandview Fence  │  Driveway Gates │ Front Yard │   │ ← Sky blue nav (72px)
│             DESIGN STUDIO    │  Back Yard │ Draw Your Yard NEW  │   "Get Instant Quote →"
├──────────────────────────────────────────────────────────────────┤
│                                                    ●●●○○○○ 3/7  │ ← Progress indicator
│                                                                  │
│                    3D VIEWPORT (flex:1)                          │
│                    object-fit:contain — never crop               │
│                    80px magnifier lens on hover (3x zoom)        │
│                                                                  │
│              Most chosen: Charleston in Satin Black, 60"         │ ← Social proof pill
├──────────────────────────────────────────────────────────────────┤
│  CHOOSE YOUR GATE STYLE                    [View Horizon Page →] │ ← Flyout header (22px)
│  Horizon — Flat Top, 3-Rail                                      │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │ ← Flyout body (centered)
│  │ img │ │ img │ │ img │ │ img │ │ img │ │ img │ │ img │     │   Real thumbnails
│  │Horiz│ │H.Pro│ │Vangu│ │Haven│ │Charl│ │C.Pro│ │Savan│     │   Badges per style
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │   Slide-in animation
├──────────────────────────────────────────────────────────────────┤
│  STYLE │ COLOR │ SIZE │ OPTIONS │ PUPPY PICKETS │ DETAILS │ QUOTE│ ← Sky blue strip (52px)
├──────────────────────────────────────────────────────────────────┤
│  Home · All Fencing · Residential · Pool & Safety · Privacy ·    │ ← Backlinks (11px)
│  Gates · Accessories · Horizon · Horizon Pro · Vanguard ·        │   17 internal links
│  Haven · Charleston · Savannah · Get a Quote · Blog · About ·    │   Orange hover
└──────────────────────────────────────────────────────────────────┘
```

---

## Top Navigation Bar

- **Height:** 72px
- **Background:** Linear gradient sky blue (#6BA3C2 → #5A8FAD)
- **Logo:** 80px, transparent background, brightness filter for white appearance on blue. No box/border around it.
- **Brand:** "Grandview" in white (#fff, 19px, weight 900), "Fence" in dark navy (#0e1420), "DESIGN STUDIO" below in 9px uppercase, letter-spacing 3px, 55% opacity
- **Divider:** 1px vertical line (20% white opacity) between brand and tabs
- **Tabs:** "Driveway Gates" (active), "Front Yard", "Back Yard", "Draw Your Yard" with NEW badge
  - 15px, weight 600, 55% opacity inactive, white active
  - **Orange underline** (3px, #d4753a) on active tab
- **"Get Instant Quote →":** Ghost button (transparent bg, white border), turns solid orange on hover
- No trademark symbols anywhere

---

## 3D Viewport

- **Flex:1** — takes all remaining vertical space
- **Background:** #0c1018 dark
- **Background image:** `object-fit:contain` — **never crop**, center the image
- **Magnifier lens:** 80px circle, 3x zoom, follows mouse cursor, subtle white border + shadow + radial vignette. `cursor:none` on viewport when magnifier active.
- **Progress indicator:** Top-right corner, pill with colored dots (orange=done, outline=pending) + "3 of 7 configured" label. Background: 75% dark with backdrop blur.
- **Social proof:** Bottom-center pill, "Most chosen this month: Charleston in Satin Black, 60". 11px text, dark bg with blur.

---

## Flyout Panel

- **Height:** 285px fixed, no vertical scrolling — use full horizontal space
- **Background:** #0e1420, 1px top border
- **Padding:** 48px horizontal (generous)
- **Header:** Left-aligned title (11px uppercase, dim) + selected value (22px, weight 800, accent color for span). Right-aligned orange "View [Style] Page →" button linking to grandviewfence.com product page.
- **Body:** Centered content, full width
- **Animation:** Content slides in from right on tab change, 0.55s cubic-bezier(0.22, 1, 0.36, 1) — smooth, noticeable

---

## Bottom Strip — 7 Tabs

| Tab | Content |
|-----|---------|
| **Style** | 7 thumbnail cards (148px wide) with real images from gate_tool/th/, badges, hover zoom effect |
| **Color** | 8 color swatches (56px circles) with names, ProCoat branding, warranty note |
| **Size** | Height buttons (48"/60"/72" — validated against Ultra), Gate Type (Single/Double), Mount (Post/Direct) |
| **Options** | Arch style cards with thumbnails (Estate/Arched/Standard/Reverse), Add-on buttons (Mid Rail/Flush Bottom/Finial Rail) |
| **Puppy Pickets** | 10 puppy picket variant cards with real thumbnails from gate_tool/th/th_pup_*.jpg (std, fls, plg, pls, qua, qus, spe, sps, tri, trs), link to Pet-Safe Fencing page |
| **Details** | Post Caps (Flat/Ball with images), Finials (Spear/Trident/Quad/Plug with images), Accents (Circle/Butterfly/Scroll with images) |
| **Quote** | Config summary table + "Get Instant Quote →" big orange CTA + "Download PDF" + "Share Design" secondary buttons + phone/email |

- **Strip height:** 52px
- **Background:** Linear gradient sky blue (same as top nav)
- **Tab style:** 13px, weight 700, uppercase, 1.5px letter-spacing
- **Active:** White text, white top border (3px), 12% white background fill
- **Hover:** 85% white text, 6% white background

---

## Style Card Badges

| Style | Badge | Color |
|-------|-------|-------|
| Horizon | Popular | Orange (#d4753a) |
| Horizon Pro | Puppy Ready | Green (rgba(34,197,94,0.9)) |
| Vanguard | Popular | Orange |
| Haven | Pool Safe | Blue (rgba(59,130,246,0.9)) |
| Charleston | Classic | Purple (rgba(168,85,247,0.9)) |
| Charleston Pro | Puppy Ready | Green |
| Savannah | Classic | Purple |

---

## Color Palette

| Element | Color | Notes |
|---------|-------|-------|
| Sky blue (nav bars) | #6BA3C2 → #5A8FAD | Gradient, from grandviewfence.com footer |
| Accent (orange) | #d4753a | Toned down, not neon. Hover: #e8844a |
| Dark background | #0c1018 | Viewport, body |
| Dark panel | #0e1420 | Flyout panel |
| Text | #f0f2f5 | Primary |
| Text muted | rgba(240,242,245,0.5) | Labels, secondary |
| Text dim | rgba(240,242,245,0.3) | Tertiary |
| Border | rgba(255,255,255,0.07) | Subtle dividers |
| "Grandview" text | #ffffff | White |
| "Fence" text | #0e1420 | Dark navy |

---

## Conversion Features (All 5)

### 1. Progress Indicator
- Top-right of viewport, pill overlay
- 7 dots (one per tab), filled orange when configured
- "3 of 7 configured" text label
- Updates in real-time as user makes selections

### 2. Social Proof
- Bottom-center of viewport, pill overlay
- "Most chosen this month: Charleston in Satin Black, 60""
- Static text initially (can be dynamic later with analytics)

### 3. Auto-Save (localStorage)
- Save full config state to localStorage on every change
- On page load, restore saved config
- No lost work on refresh/close

### 4. Shareable URL
- Encode config in URL hash: `#style=uaf_200&color=5&height=60&arch=e&leaf=2&...`
- "Share Design" button copies URL to clipboard with toast notification
- Future: Dynamic OG image for rich social previews

### 5. PDF Download
- "Download PDF" button in Quote tab
- Client-side: html2canvas captures 3D viewport + jsPDF assembles branded summary
- Includes: rendered gate image, all selected options, Grandview branding, contact info

---

## Backlinks (17 internal links)

Footer bar with links to: Home, All Fencing, Residential, Pool & Safety, Privacy, Gates, Accessories, Horizon, Horizon Pro, Vanguard, Haven, Charleston, Savannah, Get a Quote, Blog, About, Pet-Safe

Each style card's "View [Style] Page →" button also links to the corresponding product page on grandviewfence.com.

---

## Heights — Validated Against Ultra Source

Ultra's gate tool (`htArr` in ultra_dsg_min.js) only has 3 heights:
- **48"** (id:'48')
- **60"** (id:'60')
- **72"** (id:'72')

Remove 36" and 54" from gate height options. These may apply to fence panels (Phase 2) but NOT gates.

---

## Component Architecture

```
App (app.js — updated)
├── TopNav.js — Logo, brand, tabs, quote button
├── ViewportArea — 3D canvas wrapper
│   ├── UnifiedCanvas.js — unchanged internally
│   ├── MagnifierLens.js — 80px zoom circle following cursor
│   ├── ProgressIndicator.js — config completion dots
│   └── SocialProof.js — "most chosen" pill
├── FlyoutPanel.js — Container with slide animation
│   ├── StyleTab.js — thumbnail grid
│   ├── ColorTab.js — swatch picker
│   ├── SizeTab.js — height, gate type, mount
│   ├── OptionsTab.js — arch style, add-ons
│   ├── PuppyPicketsTab.js — 8 puppy picket variants
│   ├── DetailsTab.js — post caps, finials, accents
│   └── QuoteTab.js — summary, CTA, PDF, share
├── BottomStrip.js — 7 tab buttons
├── BacklinksFooter.js — SEO links
└── Sidebar.js — REMOVED
```

---

## CSS Strategy

- Single `styles.css` rewrite — replace current dark sidebar theme
- CSS custom properties for all brand colors
- No CSS frameworks
- Flexbox layout
- CSS transitions for hover states (0.25s)
- CSS animation for flyout slide-in (0.55s)
- `overflow:hidden` on flyout — NO vertical scrolling, content uses full horizontal space and is centered

---

## Responsive Behavior

- **Desktop (>1024px):** Full layout as described
- **Tablet (768-1024px):** Bottom strip tabs become icons, flyout takes more height
- **Mobile (<768px):** Full-screen flyout panels, viewport stacks above, touch-friendly 44px tap targets, magnifier disabled (no cursor on mobile)

---

## Terminology Rules

- "ProCoat" (proper case, never PROCOAT or Powercoat)
- No trademark symbols (no ™ anywhere)
- "Grandview Fence" (never Ultra branding)
- "Limited Lifetime Warranty"
- Grandview SUPPLIES, Ultra BUILDS

---

## Files Modified/Created

| File | Action |
|------|--------|
| `app.js` | Update layout: remove Sidebar, add TopNav + FlyoutPanel + BottomStrip + BacklinksFooter |
| `TopNav.js` | NEW — sky blue nav with logo, brand, tabs, quote button |
| `FlyoutPanel.js` | NEW — container with slide animation, tab content routing |
| `StyleTab.js` | NEW — thumbnail grid with badges |
| `ColorTab.js` | NEW — swatch picker |
| `SizeTab.js` | NEW — height/type/mount controls |
| `OptionsTab.js` | NEW — arch style cards + add-on toggles |
| `PuppyPicketsTab.js` | NEW — 8 puppy picket variant cards |
| `DetailsTab.js` | NEW — post caps, finials, accents |
| `QuoteTab.js` | NEW — summary + CTA + PDF + share |
| `BottomStrip.js` | NEW — 7 tab buttons |
| `BacklinksFooter.js` | NEW — SEO links |
| `MagnifierLens.js` | NEW — zoom lens following cursor |
| `ProgressIndicator.js` | NEW — config completion dots |
| `SocialProof.js` | NEW — "most chosen" pill |
| `styles.css` | REWRITE — new theme, layout, components |
| `Nav.js` | REMOVED (replaced by TopNav.js) |
| `Sidebar.js` | REMOVED (replaced by FlyoutPanel + BottomStrip) |
| `configData.js` | Remove 36"/54" heights, rename Royal→Reverse, rename Pyramid→Plug, add displayName to COLORS |
| `CLAUDE.md` | Fix "Vanilla JS" → "React + Webpack" |

---

## Validation Criteria

1. Every UI control updates 3D viewport in real-time
2. All 7 styles selectable via thumbnail cards with real images
3. All 8 colors selectable via swatch picker
4. Heights 48"/60"/72" only (validated against Ultra)
5. All options toggle correctly with feature gating per style
6. All 8 puppy picket variants shown with thumbnails
7. Flyout slides in from right on tab change (0.55s)
8. Magnifier lens works on desktop viewport hover
9. Progress indicator updates per tab completion
10. No vertical scrolling in flyout — everything fits horizontally
11. No trademark symbols anywhere
12. "ProCoat" proper capitalization
13. 17+ backlinks in footer
14. Each style has "View [Style] Page →" button linking to grandviewfence.com
15. Quote tab has Get Instant Quote + Download PDF + Share Design
16. Responsive at desktop/tablet/mobile breakpoints
17. Config saves to localStorage
18. Shareable URL via hash params
