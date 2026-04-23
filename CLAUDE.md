<!-- ============================================================ -->
<!-- CRITICAL — WORKING DIRECTORY                                 -->
<!-- This is the ONLY correct working directory:                  -->
<!--   C:\Users\sarah\Desktop\App Repos\fence-tool                -->
<!--                                                              -->
<!-- NEVER work in:                                               -->
<!--   C:\Users\sarah\Desktop\App Repos\Testing-VS code\...      -->
<!--   or any other directory                                     -->
<!--                                                              -->
<!-- If you are not in fence-tool, stop immediately               -->
<!-- and cd to it before doing anything.                           -->
<!--                                                              -->
<!-- Verify at session start:                                     -->
<!--   cd "C:\Users\sarah\Desktop\App Repos\fence-tool"           -->
<!--   git log --oneline -3                                       -->
<!-- ============================================================ -->

# Grandview Design Studio — CLAUDE.md

## Working Directory
```
WORKING DIRECTORY: C:\Users\sarah\Desktop\App Repos\fence-tool
Never work in any other directory.
```
GitHub: https://github.com/swiftcodekeys/designstudioworkingmvp
Branch: `main`

**This is the ONLY repo to work in.** Do NOT use `Testing-VS code\designstudio\...`, `grandview_design_studio_gates`, or `Downloads/.../designstudioworkingmvp`.

---

## Architecture

- **React + Webpack** app with vanilla CSS
- `index.js` → `app.js` → `TopNav.js` + `UnifiedCanvas.js` (3D) + `FloatingPanel.js` (controls)
- `GateRenderer.js` — Pure Three.js gate renderer (no React), uses legacy Three.js r86
- `configData.js` — All product configuration, style definitions, feature gating
- `spatialConstants.js` — Extraction-verified Matrix4 transforms from Ultra's live tool
- `gate_tool/` — Ultra assets: 3D models (`m/`), textures (`t/`), thumbnails (`th/`)
- Build: `npx webpack --mode development` or `npm start` (dev server on port 3000)

### Key Components
| File | Purpose |
|------|---------|
| `app.js` | React app shell, state management, config persistence (localStorage + URL hash) |
| `FloatingPanel.js` | White frosted floating panel — tabs, header, body, footer with progress + Next/Back |
| `TopNav.js` | Dark nav bar with scene tabs, Reset, Save Image, Get Quote buttons |
| `UnifiedCanvas.js` | Routes to 3D / preview / overlay based on style's renderMode |
| `GateRenderer.js` | Three.js scene: camera, lighting, materials, model loading, clipping, accents, finials |
| `spatialConstants.js` | All verified spatial constants from Ultra extraction |
| `configData.js` | Styles, colors, heights, arches, accessories, feature gating per style |
| `styles.css` | Light-theme design system with documented tokens |
| `tabs/*.js` | 7 tab content components (Style, Color, Size, Options, PuppyPickets, Details, Quote) |
| `tabs/ImagePopup.js` | Reusable hover popup for enlarged thumbnails |
| `BacklinksFooter.js` | SEO backlinks to grandviewfence.com product pages |
| `SocialProof.js` | Social proof pill overlay |

---

## MANDATORY VERIFICATION RULE

**Before making ANY change to rendering code:**

1. Find the relevant value in `SPATIAL_TRUTH.json`
2. Confirm it matches `gate_tool/js/ultra_dsg_min.js`
3. Confirm what the Ultra live tool shows at https://www.ultrafence.com/design-studio/gates/index.html
4. Only then write the change

**Use Playwright to scrape Ultra's live tool runtime values — never guess.**
**One fix = one commit. Never batch unrelated changes.**

---

## UI Design System (Light Theme)

### Layout
- Dark TopNav (56px) → Full-screen Viewport (driveway bg) → White FloatingPanel (370px, right side)
- Panel: frosted glass (`rgba(255,255,255,0.95)` + `backdrop-filter: blur(20px)`)
- Panel collapses with ‹/› handle
- Backlinks + social proof as viewport overlays

### Design Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `--brand` | `#6BA3C2` | Active states, checkmarks, nav |
| `--cta` | `#d4753a` | CTA buttons ONLY (Next, Get Quote) |
| `--panel` | `rgba(255,255,255,0.95)` | Floating panel |
| `--text-primary` | `#1a1a2e` | Titles |
| `--text-secondary` | `#5a6270` | Body text |
| `--text-hint` | `#8e95a0` | Labels |
| `--border` | `#e8eaed` | Borders |

### Typography (3 levels only)
- Title: 20px / 800 / -0.3px
- Body: 14px / 600 / 0
- Label: 11px / 700 / 1.5px / uppercase

---

## What's Done

### Renderer Features — COMPLETE
- **Flush bottom (res):** Y=0.155 → Y=0.0508 when res=true (verified vs Ultra `_2=0.0508`)
- **Mount type:** Direct mount hides posts/hinges/caps
- **Leaf count:** Model paths + transforms key on config.leaf (working)
- **Circle/butterfly accents:** Position arrays from Ultra, ACCENT_BASE_Y=1.397 matches Ultra group posY
- **Finials:** Exact XYZ arrays from Ultra per style/leaf/arch
- **Pro spacing:** Res pickets visible only for UAF-201/UAS-101
- **Height clipping:** 48/60/72" via clipping planes (hardcoded constants, NOT dynamic)
- **HDR environment map + bump map:** Per-color envMapIntensity from Ultra scrape

### Renderer Fixes (2026-03-18)
- Reverted broken dynamic height math — restored verified CLIP_POST/CLIP_PO23 constants
- Fixed style change resetting color to black (stale closure in StyleTab)
- Fixed finial/postCap not persisting in URL hash (spear styles survive refresh)

### UI Redesign — COMPLETE (2026-03-18)
- Light-theme floating panel over full-screen viewport, capped max-height
- 7 tabs with step indicators, progress dots, Next/Back + "Complete your design" hint
- Viewport shifts left when panel open, centers when collapsed
- New nav bar (64px): logo icon + "GRANDVIEW Fence" (Fence in sky blue) + "Design Studio"
- White transparent logo (`assets/logo-white.png`)
- Centered nav tabs with sky blue underline, scaled-up elements
- Next button: white default, orange hover, blue text matching Get Quote
- Backlinks blur always full width, darker text (--text-primary), single line
- New driveway background image (`assets/backgrounds/GateBackground.jpg`)
- Scene vertically centered in viewport
- Social proof pill: 12 rotating trust signals every 15 seconds (veteran-owned, AAMA 2604, pool code, warranty, etc.)
- All UI separators use `|` pipes (no em dashes)

### iFence Image Scrape — COMPLETE (2026-03-18)
- Scraped 99 preview images from ifenceusa.com into `assets/ifence_previews/`
- Swapped all thumbnails: StyleTab, ColorTab, DetailsTab, PuppyPicketsTab
- Charleston Pro: custom image with zoom/crop/contrast CSS
- Style mappings: San Marino=Horizon, Santa Monica=Horizon Pro, Sanibel=Vanguard, Boca Grande=Haven, Bella Vista=Charleston, Bella Terra=Savannah

---

## What Needs To Be Done

### Priority 1: Remaining Renderer Bugs
1. **BUG-1: Charleston center gap** — Remove CENTER_GAP vertex shift from po23 loader. The gap is baked into po23.json geometry. Ultra does NOT vertex-shift po23.
2. **BUG-2: Center seam post caps** — pc4/pc5 at x=±0.044, no CENTER_GAP push. Arch-aware Y is correct.
3. **BUG-3: Pro spacing Y position** — ptRes needs own Y offset per style:
   - UAF-201: Y = tY + 0.3048 + fsv - 0.1905 = -0.4957
   - UAS-101: Y = tY + 0.3048 + fsv = lt.picketTop

### Priority 2: UI Bugs & Polish
- **Color hover popup not working** — ImagePopup wired in ColorTab but not rendering on hover. Debug positioning/triggering.
- Wire iFence images into OptionsTab (arch types, leaf config, feature options)
- Style card hover-to-enlarge popups (like iFence does)
- Dynamic height support (48"/72") — isolated commit with Ultra verification
- Camera alignment with new background photo

### Priority 3: Puppy Picket Refinement
Basic puppy works (rail + clip). Missing: puppy finials for classic variants.

**Ultra's puppy behavior (from Playwright scrape):**
- Puppy pickets REUSE existing bottom picket models — no separate geometry
- `pupfl` (flush): rail at bY+0.4064, bY=0.0508
- `pupst` (standard): rail at bY+0.3048
- `pupcl` (classic): rail at bY+0.1905, finials at r3y+0.076
- Puppy finial models: `m/3/{fp|fs|ft|fq}.json` (same as gate finials)
- Position arrays: pf1/pf2 (classic), pf1s/pf2s (staggered)

### Priority 4: Ship
- PDF download (button exists, shows "coming soon" alert)
- Loading states and transitions
- Mobile responsiveness
- Cross-browser testing
- "Get Quote" form integration with grandviewfence.com

### Phase 2 — Fence Tool
- Front/back yard fence overlays (2D overlay system already works)
- Fence-image mode (orthographic camera + user photo upload)

### Phase 3 — Advanced
- Google Maps property estimator
- Live quote calculator

---

## Ultra Rendering Math (Verified via Playwright)

### Key Constants
| Variable | Value | Meaning |
|----------|-------|---------|
| `_2` | 0.0508 | 2" in meters — flush bottom rail Y |
| `_2_5` | 0.0635 | 2.5" — U-frame offset |
| `_7_5` | 0.1905 | 7.5" — classic puppy rail offset |
| `_12` | 0.3048 | 12" — standard puppy rail offset |
| `_16` | 0.4064 | 16" — flush puppy rail offset |
| `rH` | -0.035 | Rail height offset |
| `bY` | 0.155 | Normal bottom rail Y |
| `fsv` | -0.152 | Spear family vertical offset (flat=0) |

### Accent Y Placement
- **Circle group Y:** 1.397 (Ultra scene.children[21].position.y)
- **Butterfly group Y:** 1.363
- Mesh positions from position arrays are ADDED to group Y
- Our code: `mesh.position.set(pos[0], ACCENT_BASE_Y + pos[1], pos[2])` — correct

### Mount Type
- Post (p): po40d + po14 visible, hinges at x=±1.823
- Direct (d): posts hidden, caps hidden, hinges at x=±1.778

### Puppy Picket Types
| Name | pupid | pfinid | Rail Y |
|------|-------|--------|--------|
| Flush | pupfl | "" | bY+0.4064 |
| Standard | pupst | "" | bY+0.3048 |
| Classic Plugged | pupcl | pfp | bY+0.1905 |
| Classic Spear | pupcl | pfs | bY+0.1905 |
| Classic Tri | pupcl | pft | bY+0.1905 |
| Classic Quad | pupcl | pfq | bY+0.1905 |
| + staggered variants (pfps, pfss, pfts, pfqs) |

---

## Thumbnail Image Reference

### Active (iFence previews) — `assets/ifence_previews/`
| Folder | Count | Used In |
|--------|-------|---------|
| `gate_styles/` | 18 + charleston_pro.png | StyleTab |
| `gate_colors/` | 5 | ColorTab hover popups |
| `post_caps/` | 2 | DetailsTab |
| `gate_puppy_pickets/` | 10 | PuppyPicketsTab |
| `gate_accent_choices/` | 8 | DetailsTab |
| `gate_feature_options/` | 8 | DetailsTab (finials), OptionsTab (TODO) |
| `gate_arch_types/` | 4 | OptionsTab (TODO) |
| `gate_leaf_config/` | 4 | OptionsTab (TODO) |
| `styles/` | 18 | Fence versions (Phase 2) |
| `colors/` | 5 | Fence versions (Phase 2) |

### Legacy (Ultra thumbnails) — `gate_tool/th/`
Still available but no longer referenced in UI. Kept for reference.

---

## Critical Rules

1. **Ultra is the source of truth.** Every rendering value must trace back to `ultra_dsg_min.js` via `SPATIAL_TRUTH.json`.
2. **Use Playwright to validate** — scrape Ultra's live runtime values, don't guess.
3. **One fix = one commit.**
4. **Branding:** "ProCoat (powder coat finish)" — never "Powercoat™". No Ultra branding in UI.
5. **Colors:** Black, Satin Black, Bronze, Satin Bronze, Beige, Satin Khaki, White, Satin White, Forest Green (Silver).
6. **Do NOT modify** `gate_tool/js/ultra_dsg_min.js`.

## Commit Message Format
```
fix(BUG-N): short description
feat: short description for new features
chore: dependency or config changes
```
