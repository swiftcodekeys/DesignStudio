# Ultra Gate Design Studio - Validation Data

**Source:** https://www.ultrafence.com/design-studio/gates/index.html
**Scraped:** 2026-03-18
**Method:** Playwright browser automation with runtime JS extraction

---

## 1. Available UI Options

### Gate Styles (stlArr)
| Series | Code | Name | Category | Model |
|--------|------|------|----------|-------|
| 200 | UAF-200 | Flat Top | f (flat) | 200 |
| 200 | UAF-250 | Flat Top w/ Spears | f (flat) | 250 |
| 200 | UAF-201 | Flat Top 1-1/2" Spacing | f (flat) | 201 |
| 200 | UAB-200 | Flat Top Flush | b (flush) | 200 |
| 100 | UAS-100 | Spear Top | s (spear) | 100 |
| 100 | UAS-150 | Staggered Spear | s (spear) | 150 |
| 100 | UAS-101 | Spear Top 1-1/2" Spacing | s (spear) | 100 |

### Arch Types (arArr)
| ID | Name | midY Offset |
|----|------|-------------|
| s | Standard | 0 |
| a | Arched | 0.305 |
| e | Estate | 0.305 |
| r | Reverse Arched | -0.305 |

### Gate Heights (htArr)
**Available heights: 48", 60", 72" (NO 54")**

| Height | ID | Index in array |
|--------|----|----------------|
| 48" | 48 | 11 |
| 60" | 60 | 12 |
| 72" | 72 | 13 |

### Leaf Configuration (lfArr)
| ID | Leaf Count (lfI) | Mount Type (mntI) | Label |
|----|-------------------|---------------------|-------|
| ddpo | 2 | p | Double Leaf Post Mount |
| ddpl | 2 | d | Double Leaf Direct Mount |
| sdpo | 1 | p | Single Leaf Post Mount |
| sdpl | 1 | d | Single Leaf Direct Mount |

### Post Caps (pcArr)
| ID | Name |
|----|------|
| pcf | Flat Cap |
| pcb | Ball Cap |

---

## 2. Height Clipping Planes (CRITICAL)

### How Height Works
Ultra uses **material-level clipping planes** (not renderer-level). `renderer.localClippingEnabled = true`.

The height is controlled by a Y-axis clipping plane with normal `(0, -1, 0)` applied to all gate/post materials. The `constant` property of the plane determines where the cut happens.

There are **two different clipping plane constants** per height:
- **Gate panels clipping plane** - clips the gate panel meshes
- **Post clipping plane** - clips the posts (posts are taller than gate panels)

### tY Variable (Y-offset / translation)
The `tY` variable controls the vertical translation offset. When height changes, `tY` is set to the corresponding `yXX` value:

| Height | tY Value | Y-offset Variable |
|--------|----------|--------------------|
| 48" | -0.915 | y48 = -0.915 |
| 60" | -0.61 | y60 = -0.61 |
| 72" | -0.305 | y72 = -0.305 |

### Clipping Plane Constants Per Height

| Height | Gate Clip Constant | Post Clip Constant | Ground Planes |
|--------|--------------------|--------------------|---------------|
| 48" | **1.2825** | **1.5873** | +/-0.735 |
| 60" | **1.5875** | **1.8923** | +/-0.735 |
| 72" | **1.8925** | **3.0** (effectively no clip) | +/-0.735 |

### Clipping Plane Pattern Analysis
The gate clip constant increases by ~0.305 per height step:
- 48" -> 60": 1.5875 - 1.2825 = **0.305**
- 60" -> 72": 1.8925 - 1.5875 = **0.305**

The post clip constant also increases by ~0.305 per step:
- 48" -> 60": 1.8923 - 1.5873 = **0.305**
- 60" -> 72": At 72", posts use constant=3.0 (no effective clipping, full height post shown)

### Ground Planes (constant across all heights)
- Plane: normal (0, 0.735, 0), constant -0.735
- Plane: normal (0, -0.735, 0), constant 0.735

These appear to be ground-level clipping planes that don't change with height.

### Clipping Plane Normal Direction
All height-related clipping planes use normal `(0, -1, 0)` - this means the plane clips everything **above** the constant value. The constant represents the maximum Y value that remains visible.

---

## 3. Leaf Configuration Behavior (Single vs Double)

### Variables
- `lfI`: "1" for single, "2" for double
- `lfS`: Display string (always says "Double" for legacy reasons even when single)
- `mntI`: "p" for post mount, "d" for direct mount
- `mntS`: Full display string like "Double Leaf Post Mount"

### Scene Mesh Visibility Changes (Single vs Double)

**Scene children indices 2-10 are Meshes. Key differences:**

| Scene Index | Double Post | Double Direct | Single Post | Single Direct | Identity |
|-------------|-------------|---------------|-------------|---------------|----------|
| 2 (Mesh) | visible | visible | **hidden** | **hidden** | Left hinge top (x=-1.823, y=1.374) |
| 3 (Mesh) | visible | visible | visible | visible | Right hinge top (x=1.823, y=1.374) |
| 4 (Mesh) | visible | visible | **hidden** | **hidden** | Left hinge bottom (x=-1.823, y=0.225) |
| 5 (Mesh) | visible | visible | visible | visible | Right hinge bottom (x=1.823, y=0.225) |
| 6 (Mesh) | **hidden** | **hidden** | visible | visible | Single-leaf gate panel |
| 7 (Mesh) | visible | visible | **hidden** | **hidden** | Double-leaf left panel |
| 8 (Mesh) | visible | visible | **hidden** | **hidden** | Double-leaf right panel |
| 9 (Mesh) | visible | **hidden** | **hidden** | **hidden** | Post mount ground strip? |
| 10 (Mesh) | **hidden** | **hidden** | **hidden** | **hidden** | (unused in current config) |

### Hinge Behavior
Hinges are stored as `hng0`-`hng3`:
- **hng0** (left top): x=-1.778 (double) or x=-1.823 (single), y=1.374
- **hng1** (right top): x=1.778 (double) or x=1.823 (single), y=1.374
- **hng2** (left bottom): x=-1.778 (double) or x=-1.823 (single), y=0.225
- **hng3** (right bottom): x=1.778 (double) or x=1.823 (single), y=0.225

**Single leaf:** Left hinges (hng0, hng2) are **hidden**. Right hinges (hng1, hng3) remain visible.
**Double leaf:** All four hinges are visible.

Note: Hinge X positions shift slightly between single and double (1.778 vs 1.823).

---

## 4. Mount Type Behavior (Post vs Direct)

### Post Visibility by Mount Type

Posts are `pc0`-`pc5` in the `pcPo` array (Group at scene index 11):

| Post | Position | Double Post | Double Direct | Single Post | Single Direct | Role |
|------|----------|-------------|---------------|-------------|---------------|------|
| pc0 | x=-1.829, y=1.573 | **visible** | **HIDDEN** | **visible** | **HIDDEN** | Left outer hinge post |
| pc1 | x=1.829, y=1.573 | **visible** | **HIDDEN** | **visible** | **HIDDEN** | Right outer hinge post |
| pc2 | x=-1.689, y=1.573 | visible | visible | visible | visible | Left inner decorative post |
| pc3 | x=1.689, y=1.573 | visible | visible | visible | visible | Right inner decorative post |
| pc4 | x=-0.044, y=1.877 | visible | visible | **HIDDEN** | **HIDDEN** | Center-left post (double only) |
| pc5 | x=0.044, y=1.877 | visible | visible | **HIDDEN** | **HIDDEN** | Center-right post (double only) |

### Key Direct Mount Behavior
When switching from Post Mount to Direct Mount:
1. **pc0 and pc1 (outer hinge posts) become HIDDEN** - these are the main mounting posts
2. pc2 and pc3 (inner decorative posts) remain visible
3. Hinges remain visible (they would attach to a wall/pillar instead)
4. Scene mesh index 9 becomes hidden (post mount ground element)

### Key Single vs Double Post Behavior
When switching from Double to Single:
1. **pc4 and pc5 (center posts) become HIDDEN** - no center divider needed
2. Left hinges (hng0, hng2) become hidden
3. Gate panel mesh swaps (mesh 6 for single, meshes 7-8 for double)

---

## 5. Texture/Model Loading Pattern

### Gate Panel Textures
The texture naming convention: `t/{config}{height}{side}.jpg`

| Code | Config | Height | Side |
|------|--------|--------|------|
| dd | Double-Direct | 4=48" | l=Left |
| dp | Double-Post | 5=60" | r=Right |
| sd | Single-Direct | 6=72" | |
| sp | Single-Post | | |

**Full texture list:**
```
dd4l, dd4r, dd5l, dd5r, dd6l, dd6r    (double-direct at 48/60/72)
dp4l, dp4r, dp5l, dp5r, dp6l, dp6r    (double-post at 48/60/72)
sd4l, sd4r, sd5l, sd5r, sd6l, sd6r    (single-direct at 48/60/72)
sp4l, sp4r, sp5l, sp5r, sp6l, sp6r    (single-post at 48/60/72)
```

**Each configuration loads DIFFERENT textures per height** - the textures encode the correct picket layout for that height/config combination. This means the gate panel is not just clipped -- the texture itself changes.

### Foreground Overlay Textures
- `t/fgdp.png` - Double post foreground
- `t/fgsp.png` - Single post foreground

### Rail Textures
Pattern: `t/r{rail}{arch}{orientation}.jpg`
- r1/r2 = top/bottom rail group
- a/e/r/s = arch type (arched/estate/reverse/standard)
- e/o/x = even/odd/extra

---

## 6. Scene Structure

### Scene Children (21 total)
| Index | Type | Identity |
|-------|------|----------|
| 0 | PerspectiveCamera | Main camera (fov=40, pos: 0.82, 1.27, 7.2) |
| 1 | AmbientLight | Scene lighting |
| 2 | Mesh | Left hinge top (hng0) |
| 3 | Mesh | Right hinge top (hng1) |
| 4 | Mesh | Left hinge bottom (hng2) |
| 5 | Mesh | Right hinge bottom (hng3) |
| 6 | Mesh | Single-leaf gate panel |
| 7 | Mesh | Double-leaf left panel |
| 8 | Mesh | Double-leaf right panel |
| 9 | Mesh | Post mount ground element |
| 10 | Mesh | (Additional mesh, usually hidden) |
| 11 | Group (6 children) | Post caps group (grpc: pc0-pc5) |
| 12 | Group (2 children) | Top rail group (grrt: r0, r1) |
| 13 | Group (3 children) | Bottom rail group (grrb: r2, r3, r4) |
| 14 | Group (1 child) | Rail sub-group (grpte) |
| 15 | Group (1 child) | Rail sub-group (grpto) |
| 16 | Group (1 child) | Rail sub-group (grptx) - usually hidden |
| 17 | Group (1 child) | Rail sub-group (grpbe) |
| 18 | Group (1 child) | Rail sub-group (grpbo) |
| 19 | Group (1 child) | Rail sub-group (grpbx) - usually hidden |
| 20 | Group (1 child) | Under-fence rail (grufr) - usually hidden |

### Rail Y Positions (fixed)
| Rail | Variable | Y Position |
|------|----------|------------|
| r0 | r0y | 1.489 |
| r1 | r1y | 1.299 |
| r2 | r2y | 0.727 |
| r3 | r3y | 0.346 |
| r4 | r4y | 0.155 |

---

## 7. Dimension Constants (THREE.js Units = Meters)

### Height Conversions (inches to meters)
| Inches | Meters | Variable |
|--------|--------|----------|
| 48" | 1.219 | _48 |
| 60" | 1.524 | _60 |
| 72" | 1.829 | _72 |

### Common Dimension Constants
| Variable | Value (meters) | Likely Inches |
|----------|----------------|---------------|
| _1 | 0.025 | 1" |
| _1_5 | 0.037 | 1.5" |
| _2 | 0.0508 | 2" |
| _2_5 | 0.0635 | 2.5" |
| _3_625 | 0.092 | 3.625" |
| _4_125 | 0.105 | 4.125" |
| _5 | 0.127 | 5" |
| _6 | 0.152 | 6" |
| _6_125 | 0.155 | 6.125" |
| _7_5 | 0.1905 | 7.5" |
| _12 | 0.3048 | 12" (1 ft) |
| _13_5 | 0.343 | 13.5" |
| _14_5 | 0.3683 | 14.5" |
| _16 | 0.4064 | 16" |
| _18 | 0.457 | 18" |
| _20 | 0.508 | 20" |
| _24 | 0.61 | 24" (2 ft) |

### Special Position Constants
| Variable | Value | Purpose |
|----------|-------|---------|
| midY | 0.3048 | Mid-height Y (12") |
| bY | 0.155 | Bottom Y (6.125") |
| rH | -0.035 | Rail height offset |
| pcY | -0.015 | Post cap Y offset |
| gRot | -90 | Gate rotation (degrees) |
| gZ | 3.7465 | Gate Z position |

---

## 8. Renderer Configuration

| Property | Value |
|----------|-------|
| THREE.js Version | 86 |
| localClippingEnabled | true |
| Renderer clipping planes | [] (empty - all clipping is per-material) |
| Canvas size | 1960 x 1096 |

---

## 9. Key Findings Summary

### For Height Implementation (Task 3)
1. Height uses **per-material clipping planes**, not renderer-level
2. Clipping plane normal is always `(0, -1, 0)` with varying `constant`
3. The `constant` increases by **0.305** per height step (48->60->72)
4. Gate clip values: **1.2825** (48"), **1.5875** (60"), **1.8925** (72")
5. Post clip values: **1.5873** (48"), **1.8923** (60"), **3.0** (72" - effectively unlimited)
6. The `tY` variable is set to `y48`/`y60`/`y72` and likely repositions geometry vertically
7. **Textures also change per height** - not just clipping

### For Leaf Toggle (Task 4)
1. Single vs double swaps which gate panel mesh is visible (index 6 vs 7+8)
2. Single leaf hides left-side hinges (hng0, hng2)
3. Single leaf hides center posts (pc4, pc5)
4. Hinge X positions shift slightly between configurations
5. Different textures load (`sp`/`sd` vs `dp`/`dd` prefix)

### For Mount Toggle (Task 5)
1. Direct mount hides outer posts (pc0, pc1) -- the "hinge posts"
2. Direct mount hides scene mesh index 9 (ground element)
3. Hinges remain visible in direct mount (they attach to wall/pillar)
4. Inner decorative posts (pc2, pc3) remain visible in all modes
5. Different textures load (`d` vs `p` suffix in config code)

### Important: No 54" Height
Ultra's gate tool only offers 48", 60", and 72". There is NO 54" option for gates (unlike their fence tool which may offer 54").

---

## 10. Screenshots Captured

| File | Description |
|------|-------------|
| ultra-gate-initial.png | Default view (Estate arch, double-post, 60") |
| ultra-gate-style-options-panel.png | Style Options panel open |
| ultra-gate-styles-panel.png | Gate Styles panel showing all models |
| ultra-gate-48h.png | 48" height, double-post, estate arch |
| ultra-gate-72h.png | 72" height, double-post, estate arch |
| ultra-gate-double-post.png | Double leaf, post mount, 60" |
| ultra-gate-double-direct.png | Double leaf, direct mount, 60" |
| ultra-gate-single-post.png | Single leaf, post mount, 60" |
| ultra-gate-single-direct.png | Single leaf, direct mount, 60" |

---

## 11. iFence Cross-Reference (Secondary Validation)

**Source:** https://www.ifenceusa.com/gatestudio/ and https://www.ifenceusa.com/FREE-aluminum-fence-quote?form=gate
**Scraped:** 2026-03-18
**Method:** Playwright browser automation — iDesign Gate Studio + quote form extraction

### Key Architectural Difference
iFence uses a **2D composite image system** (layered PNGs), NOT a 3D Three.js renderer like Ultra. Height and width are NOT configurable in their design studio — those are specified only on the quote form. The design studio handles style, leaf, arch, color, features, and accents visually.

### iFence Gate Heights (from Quote Form)
| Height | Available |
|--------|-----------|
| 3 ft. | YES |
| 3 1/2 ft. | YES |
| **4 ft. (48")** | YES (default) |
| 4 1/2 ft. (54") | YES |
| **5 ft. (60")** | YES |
| **6 ft. (72")** | YES |
| Other | YES (custom) |

**DISCREPANCY:** iFence offers 7 height options including 3 ft, 3.5 ft, 4.5 ft (54"), and "Other". Ultra only offers 48", 60", 72" in their 3D tool. This means:
- iFence has **more height options** than Ultra's design studio
- iFence's 54" option exists (Ultra omits it for gates, though their fence tool may have it)
- The 3 ft and 3.5 ft options are likely for walk gates, not driveway gates
- **For our implementation: stick with Ultra's 48/60/72 — these are the standard driveway gate heights**

### iFence Gate Widths (from Quote Form)
| Width | Restriction |
|-------|-------------|
| 6 ft. | Any |
| 8 ft. | Any |
| 10 ft. | Any |
| 12 ft. (default) | Any |
| 16 ft. | Double leaf only |
| 18 ft. | Double leaf only |
| 20 ft. | Double leaf only |
| 22 ft. | Double leaf only |
| 24 ft. | Double leaf only |

Ultra's design studio does NOT have a width selector — width is fixed in the 3D model. iFence separates width to the quote form only.

### iFence Leaf Configuration (4 options — MATCHES Ultra)
| iFence Name | Ultra Equivalent |
|-------------|-----------------|
| Double-leaf with Posts | ddpo (Double Leaf Post Mount) |
| Double-leaf Direct-mount | ddpl (Double Leaf Direct Mount) |
| Single-leaf with Posts | sdpo (Single Leaf Post Mount) |
| Single-leaf Direct-mount | sdpl (Single Leaf Direct Mount) |

**MATCH:** Identical 4-way leaf/mount matrix. Both tools treat leaf count and mount type as a combined selection.

### iFence Arch Types (4 options)
| iFence Name | Ultra Equivalent |
|-------------|-----------------|
| Regal Wave | Arched (a) |
| StoneCliff Sunrise | Estate (e) |
| StoneCliff Sunset | Reverse Arched (r) |
| Horizon (Straight) | Standard (s) |

**MATCH:** Same 4 arch types. iFence uses branded names; Ultra uses generic descriptors.

### iFence Gate Styles (20 styles vs Ultra's 7)
iFence offers 20 named styles:
1. Contemporary Classic
2. Ventura
3. Boca Grande
4. San Marino
5. Santa Monica
6. Sanibel
7. New Orleans
8. Excelsior
9. Napa Valley
10. Amarillo
11. Camarillo
12. Ornamental
13. Bella Vista
14. Bella Terra
15. Mission Point
16. Charlemagne
17. Camelot
18. Providence
19. Castile
20. Valencia

Ultra has 7 gate models (UAF-200, UAF-250, UAF-201, UAB-200, UAS-100, UAS-101, UAS-150). iFence has more named styles but many map to the same underlying geometry with different options pre-selected (see CLAUDE.md style mappings).

### iFence Colors (from Quote Form: 8 options)
| iFence Color | Notes |
|--------------|-------|
| Matte Black | Satin/textured finish |
| Black | Gloss finish |
| Matte Bronze | Satin/textured finish |
| Bronze | Gloss finish |
| Sandstone | Equivalent to Beige/Khaki |
| White | Gloss finish |
| Matte White | Satin/textured finish |
| (Not Sure) | Quote form option |

**Note:** iFence design studio only shows 5 colors visually (Matte Sandstone, Bronze, White, Matte Black, Black). The quote form has 8. Ultra has 9 PBR color definitions.

### iFence Mount Type Behavior (Visual)
When switching from "Double-leaf with Posts" to "Single-leaf with Posts":
- The 2D composite swaps to show a single gate panel
- Left-side hinge post appears to remain but left hinges are removed
- Center post divider is removed
- **Consistent with Ultra's behavior** (hides left hinges + center posts for single leaf)

When switching to "Direct-mount":
- Outer brick pillars replace posts in the 2D image
- Gate panels attach directly to pillars
- **Consistent with Ultra's behavior** (hides outer hinge posts)

### iFence Feature Options
| Feature | Ultra Equivalent |
|---------|-----------------|
| Resort (Flush Bottom) | res=true (bY from 0.155 to 0.0508) |
| U-Frame | U-frame option |
| Mid Rail | Mid rail |
| Extra Lower Rail | Upper finial rail |
| Extreme Spacing | Pro spacing (xtr=true) |
| Puppy Pickets (10 types) | Puppy pickets (10 types match) |

### iFence Accent Choices
| Accent | Ultra Equivalent |
|--------|-----------------|
| Ball Caps | pcb (Ball Cap) |
| Estate Scrolls | Estate scroll accents |
| Circles at Base | Circle accents |
| Butterflies at Base | Butterfly accents |
| Butterflies Lite at Base | Butterfly lite variant |
| Butterfly Scrolls | Butterfly scroll variant |
| Butterfly Scrolls Lite | Butterfly scroll lite |
| Nouveau Picket caps | Finial caps |

### Summary of Discrepancies

| Feature | Ultra | iFence | Impact |
|---------|-------|--------|--------|
| Heights in design studio | 48/60/72 only | Not in studio (quote form has 7) | None — use Ultra's 3 |
| Width selector | None | Quote form only | None — not visual |
| 54" height | Not available | Available in quote | None — not needed for 3D |
| Rendering | 3D Three.js | 2D composite images | Ultra is source of truth for 3D |
| Leaf/mount options | 4 combos | 4 combos (identical) | CONFIRMED |
| Arch types | 4 types | 4 types (identical) | CONFIRMED |
| Gate styles | 7 models | 20 named styles | Many-to-one mapping |

### Cross-Reference Conclusion
iFence's gate configurator **confirms Ultra's leaf/mount/arch options are complete and correct**. The height options diverge (iFence offers more via quote form) but since Ultra is our 3D source of truth, we should implement 48/60/72 only. No discrepancies found in the core configuration matrix that would affect our implementation.

### Screenshots Captured
| File | Description |
|------|-------------|
| ifence-gate-initial.png | Default gate studio view (Ventura, double-post, Regal Wave, black) |
| ifence-single-post.png | Single-leaf with Posts selected |
| ifence-quote-form.png | Quote form showing all height/width/option dropdowns |
