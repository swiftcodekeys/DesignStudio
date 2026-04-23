# Grandview Design Studio — Deep Project Requirements

> Rebuild the Grandview Fence Design Studio into the coolest, best UX and designed web experience ever.
> 3D gate and fence configurator white-labeling Ultra Aluminum's design tools.
> React + Webpack + Three.js r86

---

## WHO YOU ARE

Senior React + Three.js developer rebuilding the **Grandview Fence Design Studio**. Working repo:

```
C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp
```

---

## WHAT EXISTS TODAY

### Architecture
- `index.js` → `app.js` → `Nav.js` (tab navigation) + `Sidebar.js` (controls panel) + `UnifiedCanvas.js` (3D viewport)
- `GateRenderer.js` — Pure Three.js renderer (no React), uses legacy Three.js r86
- `configData.js` — Product config, style definitions, feature gating
- `spatialConstants.js` — Verified Matrix4 transforms extracted from Ultra's live tool
- `gate_tool/` — Ultra's legacy assets: 3D models (`m/`), textures (`t/`), thumbnails (`th/`)
- Build: `npm run build` or `npm start` (webpack dev server, port 3000)

### What Works
- 3D gate rendering (basic — loads models, applies transforms)
- Style switching between gate families
- Pro spacing picket visibility (UAF-201 Horizon Pro, UAS-101 Charleston Pro)
- Height selection with Y-offset clipping
- Color switching (basic hex application)
- Finial position arrays extracted (needs visual verification)

### What's Broken / Missing
- Gate looks flat/2D — no proper PBR materials, lighting, or environment
- UI is a dark left sidebar — needs complete redesign to Option B (top tabs + bottom strip)
- Missing selectors: leaf count, mount type, arch style, puppy pickets, post caps, finials, accessories, mid rail, flush bottom, upper finial rail
- Color picker is basic — needs proper swatches with names and PBR material application
- No "Get Quote" flow
- No branding alignment with grandviewfence.com
- Finial fix committed but not visually verified
- `res` (flush bottom rail) not lowering bottom rail Y correctly
- Camera not matching Ultra's proven angles

---

## THE THREE BIG PROBLEMS TO SOLVE

### PROBLEM 1: "The Fence Looks 2D"

The 3D viewport renders gates that look flat and lifeless. Ultra's tool produces realistic-looking aluminum with depth, reflection, and texture.

#### A. PBR Material System
| Grandview Color Name | Ultra Internal | Hex | Roughness | Metalness | Bump Scale |
|---------------------|---------------|-----|-----------|-----------|------------|
| Black | Gloss Black | 0x080808 | 0.2 | 0.2 | 0.0001 |
| Satin Black | Textured Black | 0x0c0c0c | 0.4 | 0.2 | 0.0015 |
| Bronze | Gloss Bronze | 0x42382c | 0.1 | 0.3 | 0.0001 |
| Satin Bronze | Textured Bronze | 0x42382c | 0.4 | 0.3 | 0.0015 |
| White | Gloss White | 0xF8F5F6 | 0.2 | 0.2 | 0.0001 |
| Satin White | Textured White | 0xF8F5F6 | 0.2 | 0.1 | 0.002 |
| Beige / Satin Khaki | Khaki | 0xcdbeaf | 0.4 | 0.2 | 0.002 |
| Forest Green | (needs extraction) | ~0x2d4a2d | 0.3 | 0.2 | 0.001 |

#### B. Lighting Setup
- Ambient light: AmbientLight(0xffffff, 0.4)
- Key light: DirectionalLight(0xffffff, 0.8) — position (5, 10, 7), casts shadows
- Fill light: DirectionalLight(0xffffff, 0.3) — position (-3, 5, -5)
- Rim light: DirectionalLight(0xffffff, 0.2) — behind/above

#### C. Environment Map
Metals REQUIRE env map to look metallic.

#### D. Tone Mapping & Gamma
ACES filmic tone mapping, sRGB encoding.

#### E. Camera Match
```js
PerspectiveCamera(28, w/h, 1, 10000)
zoom = 1.788
position = (0.82, 1.27, 7.2)
rotation.y = 6 degrees
```

#### F. Ground Plane
Subtle ground shadow receiver.

---

### PROBLEM 2: Complete UI Redesign (Option B)

Replace current dark left sidebar with clean, professional layout:

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Driveway Gates | Yard Fencing | Visualize | Quote  │  ← Top nav bar
├─────────────────────────────────────────────────────────────┤
│                    3D VIEWPORT (80% height)                 │
├─────────────────────────────────────────────────────────────┤
│  [Style] [Color] [Height] [Options] [Accessories] [Quote]  │  ← Bottom config strip
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Expandable panel: thumbnails, swatches, toggles    │    │  ← Flyout panel
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

#### Brand Guidelines
- Primary: White / light gray backgrounds
- Accent: Grandview blue (~#1a5276 steel blue)
- Typography: Clean sans-serif (Montserrat, Open Sans)
- Logo: "Grandview Fence LLC" — no Ultra branding
- Finish: "ProCoat (powder coat finish)" — NEVER "Powercoat™"
- Warranty: "Limited Lifetime Warranty"

#### Bottom Config Strip — 6 Tab Categories

**Tab 1: STYLE** — 7 gate family thumbnail grid
**Tab 2: COLOR** — 9 ProCoat finish swatches with PBR hookup
**Tab 3: SIZE** — Height (48/54/60/72"), Width, Leaf Count (single/double)
**Tab 4: OPTIONS** — Mount type, Arch style, Mid Rail, Flush Bottom, Upper Finial Rail
**Tab 5: DETAILS** — Puppy Pickets (10 types), Post Caps (2), Finials (4), Accessories (5)
**Tab 6: GET QUOTE** — Summary + CTA

#### Responsive
- Desktop: Full layout
- Tablet: Collapsed icon tabs, taller flyout
- Mobile: Full-screen flyout panels

---

### PROBLEM 3: Every Ultra Option Must Be Available

| Feature | Status |
|---------|--------|
| 7 gate styles | Verify all load |
| 9 colors w/ PBR | **BUILD** |
| 4 heights | Verify |
| Width adjustment | **BUILD** |
| Single/Double leaf | **BUILD** |
| Post/Direct mount | **BUILD** |
| 4 arch styles | **BUILD** |
| Mid rail toggle | **BUILD** |
| Flush bottom (res) | **FIX** |
| Upper finial rail | **BUILD** |
| 10 puppy picket types | **BUILD** |
| 2 post cap types | **BUILD** |
| 4 finial types | **VERIFY + UI** |
| 5 accessory types | **BUILD** |
| Pro spacing | Done |

---

## IMPLEMENTATION ORDER

### Phase A — Make It Look Real
1. PBR material factory (all 8 color defs)
2. Multi-light rig
3. Environment map
4. Tone mapping + gamma
5. Camera match
6. Ground shadow plane

### Phase B — Complete Renderer Features
1. Verify finial positions
2. Fix flush bottom rail
3. Leaf count rendering
4. Mount type rendering
5. Arch style rendering
6. Mid rail toggle
7. Upper finial rail toggle
8. Puppy picket rendering (10 variants)
9. Post cap rendering
10. Finial type rendering
11. Accessory rendering

### Phase C — UI Redesign
1. Top navigation bar
2. Bottom config strip (6 tabs)
3. Flyout panel system
4. All 6 tab implementations
5. Brand styling
6. Responsive breakpoints

### Phase D — Polish & Ship
1. Loading states/transitions
2. URL state management
3. Get Quote integration
4. Performance optimization
5. Cross-browser/mobile testing

---

## CRITICAL RULES

1. Validate ALL rendering against Ultra's live tool
2. Never guess — research ultra_dsg_min.js first
3. Branding: "ProCoat (powder coat finish)", "Grandview Fence LLC"
4. One fix = one commit
5. Use Grandview color names always

## THUMBNAIL REFERENCE

All in `gate_tool/th/`:
- Styles: th_st_uaf_200.jpg, th_st_uaf_201.jpg, th_st_uaf_250.jpg, th_st_uab_200.jpg, th_st_uas_100.jpg, th_st_uas_101.jpg, th_st_uas_150.jpg
- Puppy Pickets: th_pup_std.jpg, th_pup_fls.jpg, th_pup_plg.jpg, th_pup_pls.jpg, th_pup_qua.jpg, th_pup_qus.jpg, th_pup_spe.jpg, th_pup_sps.jpg, th_pup_tri.jpg, th_pup_trs.jpg
- Post Caps: th_pstcp_flat.jpg, th_pstcp_ball.jpg
- Finials: th_pc_spe.jpg, th_pc_tri.jpg, th_pc_qua.jpg, th_pc_plg.jpg
- Mount/Leaf: th_so_sngpl.jpg, th_so_sngpo.jpg, th_so_dblpl.jpg, th_so_dblpo.jpg
- Arch Styles: th_so_ares.jpg, th_so_arar.jpg, th_so_arrv.jpg, th_so_arst.jpg
- Accessories: th_acc_cir.jpg, th_acc_but.jpg, th_acc_scr.jpg, th_acc_bcr.jpg, th_acc_bbu.jpg
- Options: th_ft_mdr.jpg, th_ft_res.jpg, th_ft_ufr.jpg
