# Split 03: UI Redesign — "The Coolest Best UX Ever"

## Goal
Replace the dark left sidebar with a clean, professional bottom-strip + flyout panel layout. Every Ultra option must have a polished UI control. The design should feel premium, modern, and on-brand with Grandview Fence LLC.

## Context
- **Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- **Current UI:** Dark sidebar (Sidebar.js, 13.6 KB) with dropdowns, chips, checkboxes
- **Target:** Option B layout — top nav bar + 3D viewport (80% height) + bottom config strip with flyout panels
- **Depends on:** Split 02 (all renderer hooks must exist to wire up)

## Current Architecture
```
App (app.js)
├── Nav.js — 3 tabs: Driveway Gates | Yard Fencing | Yard Layout
├── Sidebar.js — All controls in collapsible sections (WILL BE REPLACED)
└── UnifiedCanvas.js — Three.js viewport wrapper
```

## Target Architecture
```
App (app.js — updated)
├── TopNav.js — Logo + main navigation tabs
├── ViewportArea — 3D canvas taking ~80% of viewport height
│   └── UnifiedCanvas.js — unchanged internally
├── BottomStrip.js — 6 category tabs along bottom edge
│   └── FlyoutPanel.js — slides up from bottom strip
│       ├── StyleTab.js — thumbnail grid of 7 gate families
│       ├── ColorTab.js — swatch picker with PBR hookup
│       ├── SizeTab.js — height, width, leaf count
│       ├── OptionsTab.js — mount, arch, rail toggles
│       ├── DetailsTab.js — puppy pickets, post caps, finials, accessories
│       └── QuoteTab.js — config summary + CTA
└── Sidebar.js — DEPRECATED, removed
```

## Layout Specification

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Driveway Gates | Yard Fencing | Visualize | Quote  │  ← TopNav (60px)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                                                             │
│              3D VIEWPORT (flex: 1, fills space)             │
│              Background: gate tool bg image                 │
│                                                             │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ○ Style  ○ Color  ○ Size  ○ Options  ○ Details  ○ Quote   │  ← BottomStrip (50px)
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Flyout panel content (200-350px, slides up)        │    │  ← FlyoutPanel (variable)
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Brand Guidelines
- **Background:** White / very light gray (#f8f9fa) for UI chrome
- **Accent:** Grandview steel blue (#1a5276) — buttons, active states, highlights
- **Text:** Dark charcoal (#2c3e50) for readability
- **Typography:** Clean sans-serif — Montserrat or Inter for headings, system font stack for body
- **Cards/panels:** White with subtle box-shadow, 8px border-radius
- **Active tab:** Accent color underline or filled background
- **Logo:** "Grandview Fence LLC" — use `assets/logo.png`, no Ultra branding anywhere
- **Terminology:**
  - Finish: "ProCoat (powder coat finish)" — NEVER "Powercoat™"
  - Warranty: "Limited Lifetime Warranty"
  - Grandview SUPPLIES product, Ultra BUILDS it

## Tab Specifications

### Tab 1: STYLE (Gate Family Picker)
- Thumbnail grid layout (2-3 per row depending on viewport width)
- Images from `gate_tool/th/th_st_*.jpg`
- Each card: thumbnail + Grandview name + brief description
- Active style: accent border + checkmark overlay
- 7 styles: Horizon, Horizon Pro, Vanguard, Haven, Charleston, Charleston Pro, Savannah
- On select: update `config.styleId`, trigger `buildGate()`

### Tab 2: COLOR (ProCoat Finish Picker)
- Large swatch circles (48-64px) with color name labels below
- Optional: "Gloss" / "Satin" filter toggle
- 9 colors: Black, Satin Black, Bronze, Satin Bronze, White, Satin White, Beige, Forest Green, Silver
- Active color: ring highlight + "Selected" label
- On select: update `config.color`, trigger `updateMaterials()` (fast path)
- Show selected color name prominently at top of panel

### Tab 3: SIZE
- **Height:** Button group (48" / 54" / 60" / 72") — active button highlighted
- **Width:** Preset buttons (36" / 42" / 48" / 60" / 72" / 96" / 120" / 144") or text input
- **Leaf Count:** Two large thumbnail cards:
  - Single Gate (`th_so_sngpl.jpg`) — "Single Panel"
  - Double Gate (`th_so_dblpl.jpg`) — "Double Panel"
  - Active: accent border

### Tab 4: OPTIONS
- Thumbnail toggle cards for each option:
  - **Mount Type:** Post Mount (`th_so_sngpl.jpg`) | Direct Mount (`th_so_sngpo.jpg`)
  - **Arch Style:** Standard (`th_so_arst.jpg`) | Arched (`th_so_arar.jpg`) | Estate (`th_so_ares.jpg`) | Reverse (`th_so_arrv.jpg`)
  - **Mid Rail:** toggle with thumbnail (`th_ft_mdr.jpg`)
  - **Flush Bottom:** toggle with thumbnail (`th_ft_res.jpg`)
  - **Upper Finial Rail:** toggle with thumbnail (`th_ft_ufr.jpg`)
- Options hidden/disabled per STYLE_FEATURE_GATE in configData.js

### Tab 5: DETAILS
- Sub-sections with headers:
  - **Puppy Pickets** — 10-type thumbnail grid (`th_pup_*.jpg`)
  - **Post Caps** — 2 options: Flat (`th_pstcp_flat.jpg`), Ball (`th_pstcp_ball.jpg`)
  - **Finials** — 4 options: Spear (`th_pc_spe.jpg`), Trident (`th_pc_tri.jpg`), Quad (`th_pc_qua.jpg`), Plug (`th_pc_plg.jpg`)
  - **Accessories** — 5 options: Circle (`th_acc_cir.jpg`), Butterfly (`th_acc_but.jpg`), Scroll (`th_acc_scr.jpg`), Basket Circle (`th_acc_bcr.jpg`), Basket Butterfly (`th_acc_bbu.jpg`)
- Each sub-section: thumbnail cards with labels, active state, "None" option
- Filtered by STYLE_FEATURE_GATE per style

### Tab 6: GET QUOTE
- Configuration summary card listing all selected options
- Breakdown: Style → Color → Size → Options → Details
- "Request a Quote" primary CTA button (links to grandviewfence.com contact form)
- "Share Configuration" secondary button (copy config URL)
- Grandview phone number + email

## Flyout Panel Behavior
- Click tab → panel slides up with smooth animation (300ms ease-out)
- Click same tab again → panel slides down (collapse)
- Click different tab → content swaps (panel stays open)
- Panel height: auto based on content, max ~350px
- Mobile: flyout takes full screen minus nav bar

## Responsive Breakpoints
- **Desktop (>1024px):** Full layout as specified
- **Tablet (768-1024px):** Bottom strip tabs become icons only, flyout takes more height
- **Mobile (<768px):** Viewport stacks above controls, flyout panels go full-screen, touch-friendly large tap targets (min 44px)

## CSS Strategy
- Rewrite `styles.css` from dark theme → light/white theme
- Use CSS custom properties for brand colors, spacing, typography
- Flexbox layout for responsive structure
- CSS transitions for flyout animation
- No CSS framework (keep it lightweight)

## Thumbnail Files Reference
All in `gate_tool/th/`:
- Styles: th_st_uaf_200.jpg through th_st_uas_150.jpg
- Puppy Pickets: th_pup_std.jpg through th_pup_trs.jpg
- Post Caps: th_pstcp_flat.jpg, th_pstcp_ball.jpg
- Finials: th_pc_spe.jpg, th_pc_tri.jpg, th_pc_qua.jpg, th_pc_plg.jpg
- Mount/Leaf: th_so_sngpl.jpg, th_so_sngpo.jpg, th_so_dblpl.jpg, th_so_dblpo.jpg
- Arch Styles: th_so_arst.jpg, th_so_arar.jpg, th_so_ares.jpg, th_so_arrv.jpg
- Accessories: th_acc_cir.jpg, th_acc_but.jpg, th_acc_scr.jpg, th_acc_bcr.jpg, th_acc_bbu.jpg
- Options: th_ft_mdr.jpg, th_ft_res.jpg, th_ft_ufr.jpg

## Validation Criteria
- [ ] Every UI control updates the 3D viewport in real time
- [ ] All 7 styles selectable via thumbnail grid
- [ ] All 9 colors selectable via swatch picker
- [ ] Height, width, leaf count controls work
- [ ] All options (mount, arch, rails) toggle correctly
- [ ] All details (puppy pickets, post caps, finials, accessories) selectable
- [ ] Feature gating hides unavailable options per style
- [ ] Flyout panel animates smoothly
- [ ] Responsive at desktop, tablet, mobile breakpoints
- [ ] No Ultra branding visible — all Grandview terminology
- [ ] Professional, premium feel matching grandviewfence.com

## Constraints
- No CSS frameworks (Tailwind, Bootstrap) — keep lightweight
- React functional components with hooks
- Config state flows from App → BottomStrip → Tab → back to App via callbacks
- UnifiedCanvas.js internals stay unchanged — just receives config props
- All thumbnail paths resolve from `gate_tool/th/` (already served by webpack)

## Dependencies
- **Input from 02:** All renderer config keys must produce visible 3D changes
- **Output to 04:** Complete, functional UI ready for polish (loading states, URL state, quote integration)
