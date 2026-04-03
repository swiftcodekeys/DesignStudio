# Split 04: UI & Integration — Full Fence Configurator Experience

## Objective
Wire the fence renderer into the complete UI with FloatingPanel tabs, TopNav scene switching,
foreground overlays, URL persistence, and all user controls.

## Dependencies
- Split 03 (all 9 styles + accessories working)

## TopNav Scene Switching

The existing TopNav already has tabs. The "Yard Fencing" tab will:
1. Set `activeScene: 'fence'` in app.js state
2. UnifiedCanvas detects scene change → instantiates FenceRenderer instead of GateRenderer
3. FloatingPanel switches to fence-specific tab configuration
4. URL hash updates to reflect fence config

```
TopNav tabs:
  [Driveway Gates]  [Yard Fencing]  [Visualize My Home (coming soon)]  [Estimate (coming soon)]
```

## FloatingPanel — Fence Tab Configuration

### Tab 1: Fence Style
- 9 aluminum style cards with thumbnail images
- Each card: thumbnail + style name + subtitle
- Active card: sky blue border + checkmark
- Tap to select → triggers FenceRenderer.buildFence()

### Tab 2: Color
- 8 color swatches (same layout as gate ColorTab)
- Swatch: colored circle + display name
- Active: sky blue ring
- Tap → triggers FenceRenderer.updateMaterials() (fast path)
- Fence PBR values (different from gate)

### Tab 3: Size
- 4 height options: 48" | 54" | 60" | 72"
- Radio button or card selector
- Default: 48" (matches Ultra default)
- Haven (UAB-200): forced to 48", selector disabled

### Tab 4: Options
- **Finial type** (if style supports finials): Spear | Triangle | Quad | Plug
  - Thumbnail cards from ifence_previews/gate_feature_options/
- **Post cap**: Flat | Ball
- **Puppy pickets** (if style supports): Off | Standard | Flush | Classic
  - If Classic: show finial sub-selector (Plug | Spear | Tri | Quad)
- **Accents** (if style supports):
  - Circles (on/off)
  - Butterflies (on/off)
  - Scrolls (on/off)
- All options gated by style's acc string (same pattern as gate STYLE_FEATURE_GATE)

### Tab 5: View Options
- **Yard view**: Front Yard | Back Yard toggle
  - Front: daytime suburban front yard with sidewalk
  - Back: afternoon back yard with patio
- Each view switches:
  - Camera position
  - HDR environment map
  - Background image
  - Foreground overlay

### Tab 6: Details
- Current configuration summary
- Style name, color, height, selected options
- Estimated measurements

### Tab 7: Quote
- Get Quote form (same as gate tool)
- Pre-fills with fence configuration
- Links to grandviewfence.com contact form

## Foreground Overlay System

Ultra renders PNG overlays on top of the 3D scene for grass, sidewalk, and planters.

**Front yard overlays:**
- `ffs.png` — standard fence foreground (grass + sidewalk)
- `ffd.png` — dense/puppy variant
- `fff.png` — flush style variant
- `ffplt.png` — planter overlay (always on top)

**Logic from Ultra's drfg():**
```javascript
if (view == 'fr') {
  if (style == 'b2') {
    fg = fff;  // flush
  } else if (pbI == 'pbs' && !pup) {
    fg = ffs;  // standard
  } else {
    fg = ffd;  // dense/puppy
  }
  // Always overlay planter on top
  draw(ffplt);
}
if (view == 'ba') {
  fg = bff;  // back fence foreground
}
```

**Implementation:** Canvas overlay element positioned absolutely over the Three.js canvas.
Draw the appropriate PNG based on current config.

## URL Hash Persistence

Same pattern as gate tool. Fence config encoded in URL hash:
```
#scene=fence&style=uaf_200&height=48&color=5&view=fr&finial=fs&postCap=pcf&pup=pupcl&cir=1
```

## State Management (app.js)

```javascript
state = {
  activeScene: 'gate',  // 'gate' | 'fence'
  gateConfig: { ... },  // existing gate config
  fenceConfig: {
    styleId: 'uaf_200',
    height: '48',
    color: FENCE_COLORS[5],  // Gloss Black default
    view: 'fr',
    finial: null,
    postCap: 'pcf',
    accessories: {
      cir: false,
      but: false,
      scr: false,
      pup: false,
      pupType: null,
    },
  },
};
```

## Backlinks Footer

Update BacklinksFooter.js to show fence-specific product links when fence scene active:
- Aluminum Fence Panels
- Fence Post Caps & Accessories
- Fence Installation Guide
- Pool Fence Code Compliance
- Property Line Fence Solutions

## Save Image

Same as gate tool — `renderer.domElement.toDataURL('image/png')` → download.
Overlay the background image and foreground before capture.

## Acceptance Criteria
- [ ] TopNav "Yard Fencing" tab switches to fence scene
- [ ] TopNav "Driveway Gates" tab switches back to gate scene
- [ ] All 7 FloatingPanel tabs work for fence
- [ ] Style selector shows 9 styles with thumbnails
- [ ] Color selector shows 8 colors with correct fence PBR values
- [ ] Height selector shows 4 options (48/54/60/72)
- [ ] Haven forces 48" height
- [ ] Options tab correctly gates features per style
- [ ] Front/back yard view switching works
- [ ] Foreground overlays render correctly per style/view
- [ ] URL hash persists fence config across refresh
- [ ] Save Image captures fence scene correctly
- [ ] Backlinks update for fence product pages
- [ ] No regressions in gate tool (still works via "Driveway Gates" tab)
