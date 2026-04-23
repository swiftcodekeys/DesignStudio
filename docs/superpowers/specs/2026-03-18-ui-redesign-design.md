# UI Redesign — Design Spec

## Decision

**Layout:** Light-theme floating panel over full-screen viewport (Option E from brainstorming).

**Approved mockup:** `.superpowers/brainstorm/3139-1773802877/mockup-e-light-floating.html`

## What Changes

### Layout: Current → New
- **Current:** TopNav → Viewport → FlyoutPanel (240px fixed) → BottomStrip (52px tabs) → Backlinks
- **New:** Dark TopNav → Full-screen Viewport (with existing driveway bg) → White frosted floating panel (right side, 370px) → Backlinks fade at viewport bottom

### Components to Create
- `FloatingPanel.js` — White frosted glass panel with tabs, header, scrollable body, footer with progress + Next button. Replaces FlyoutPanel + BottomStrip.

### Components to Modify
- `app.js` — Remove BottomStrip + FlyoutPanel, add FloatingPanel. Move ProgressIndicator into panel footer. Remove SocialProof from viewport overlay (move into panel or keep as viewport pill).
- `styles.css` — Complete replacement of flyout/bottom-strip/style-card CSS with light-theme panel styles.
- `TopNav.js` — Add Reset and Save Image buttons to nav right side. Slim down height to 56px.
- All `tabs/*.js` — Restyle for light panel (dark text on white bg instead of light text on dark bg).
- `ColorTab.js` — Replace circle swatches with fence-section photo cards (iFence-style). Use Ultra's thumbnail images or render fence sections per color.
- `DetailsTab.js` — Add hover/click popup showing enlarged product photo for post caps, finials, accents.
- `PuppyPicketsTab.js` — Add hover popup showing enlarged puppy picket photo.

### Components to Delete
- `BottomStrip.js` — Replaced by tabs inside FloatingPanel.

## Design System

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#6BA3C2` | Nav bar, active tab, checkmarks |
| `--brand-light` | `#e8f2f8` | Product link button bg |
| `--cta` | `#d4753a` | Next button, Get Quote, CTA only |
| `--panel` | `rgba(255,255,255,0.95)` | Floating panel bg |
| `--text-primary` | `#1a1a2e` | Titles, card names |
| `--text-secondary` | `#5a6270` | Subtitles, descriptions |
| `--text-hint` | `#8e95a0` | Labels, inactive tabs |
| `--border` | `#e8eaed` | Card borders, dividers |
| `--card-bg` | `#f0f2f5` | Tab bar bg, card bg |
| `--active-bg` | `rgba(107,163,194,0.1)` | Active card bg |

### Typography (3 levels only)
| Level | Size | Weight | Tracking | Usage |
|-------|------|--------|----------|-------|
| Title | 20px | 800 | -0.3px | Panel title |
| Body | 14px | 600-700 | 0 | Card names, buttons |
| Label | 11px | 700 | 1.5px uppercase | Step indicator, tab labels |

### Panel Structure
```
┌─────────────────────────────┐
│ [Style][Color][Size]...     │ ← Pill tabs, 6px padding
├─────────────────────────────┤
│ STEP 1 OF 7                 │
│ Choose Your Gate Style       │ ← Title 20px/800
│ 7 premium aluminum styles    │
├─────────────────────────────┤
│                              │
│  ┌─────┬──────────┬─────┐   │
│  │thumb│ Horizon   │badge│   │ ← Style cards (list format)
│  │72x54│ Flat Top  │     │   │   72x54 thumb, same size for all
│  └─────┴──────────┴─────┘   │
│  ┌─────┬──────────┬─────┐   │
│  │thumb│ Vanguard  │badge│   │
│  └─────┴──────────┴─────┘   │
│         ...                  │ ← Scrollable
│                              │
│  View on grandviewfence.com →│ ← Product link
├─────────────────────────────┤
│ ●○○○○○○  1/7   [Next: Color→] │ ← Progress dots + CTA
└─────────────────────────────┘
```

### Image Popups (from iFence)
When hovering/clicking a color swatch, post cap, finial, or puppy picket option:
- Show enlarged product photo in a tooltip/popover
- Photo shows the actual fence/component in that configuration
- Use existing thumbnails from `gate_tool/th/` at larger size
- Dismiss on click-away or mouse-leave

### Thumbnail Sources
All from `gate_tool/th/`:
- Styles: `th_st_uaf_200.jpg` through `th_st_uas_150.jpg`
- Post caps: `th_pstcp_flat.jpg`, `th_pstcp_ball.jpg`
- Finials: `th_pc_spe.jpg`, `th_pc_tri.jpg`, `th_pc_qua.jpg`, `th_pc_plg.jpg`
- Puppy pickets: `th_pup_std.jpg` through `th_pup_trs.jpg` (10 variants)
- Arch styles: `th_so_ares.jpg`, `th_so_arar.jpg`, `th_so_arrv.jpg`, `th_so_arst.jpg`
- Mount/leaf: `th_so_sngpl.jpg`, `th_so_sngpo.jpg`, `th_so_dblpl.jpg`, `th_so_dblpo.jpg`
- Accents: `th_acc_cir.jpg`, `th_acc_but.jpg`, `th_acc_scr.jpg`, `th_acc_bcr.jpg`, `th_acc_bbu.jpg`
- Options: `th_ft_mdr.jpg`, `th_ft_res.jpg`, `th_ft_ufr.jpg`

### Viewport Overlays
- Social proof pill at bottom center (existing)
- Backlinks fade-in at bottom (gradient overlay)
- Collapse handle (‹) on panel's left edge to hide/show panel

### What NOT to change
- `GateRenderer.js` — no rendering changes in this redesign
- `spatialConstants.js` — no spatial changes
- `configData.js` — no data model changes
- `UnifiedCanvas.js` — only CSS/layout wrapper changes, not rendering logic
- The existing background images (`assets/backgrounds/`)
