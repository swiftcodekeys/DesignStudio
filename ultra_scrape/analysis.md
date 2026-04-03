# Ultra Aluminum Gate Design Studio — Complete Technical Analysis

**Source:** https://www.ultrafence.com/design-studio/gates/index.html
**Date of Analysis:** 2026-03-19

---

## 1. Architecture

- **Three.js r86** (legacy), loaded from `/gates/js/three.min_086.js`
- **Single JS bundle:** `ultra_dsg_min.js` (75KB minified) — ALL renderer logic in one file
- **jQuery + jQuery Mobile** for UI
- **iScroll** for panel scrolling
- **HDR environment mapping** with PMREM (PMREMGenerator + PMREMCubeUVPacker)
- **Models are THREE.js JSON format** (NOT OBJ) loaded via `THREE.JSONLoader`
- **Camera:** PerspectiveCamera, fov=28 (init) then set to 40 via `cmF()`, zoom=1.788, near=1, far=100
- **Position:** (0.82, 1.27, 7.2), rotation.y = 6 degrees, rotation.order = YXZ
- **Single AmbientLight** (0xFFFFFF, 0.5)
- `renderer.localClippingEnabled = true` (critical for height clipping)
- **NOTE:** fov discrepancy — `iSc()` creates camera with fov=28, but `cmF()` immediately sets it to 40

---

## 2. Asset Loading Pattern

All assets served from same domain: `www.ultrafence.com/design-studio/gates/`

- **Models:** `m/{0,1,2,3}/*.json` — loaded via `THREE.JSONLoader`
- **Textures:** `t/*.{jpg,png,hdr}` — loaded individually
- **Thumbnails:** `th/*.jpg` — preloaded via iA (image array)
- **CSS assets:** `css/*.{css,png}`

### Model Files (16 loaded on initial page load for UAF-200 estate double)

#### Posts (m/0/)

| File | Description |
|------|-------------|
| `po12.json` | Single-leaf outer posts |
| `po14.json` | Double-leaf outer posts |
| `po23.json` | Center seam post (double-leaf) |
| `po40d.json` | Inner posts for double-leaf |
| `po40s.json` | Inner posts for single-leaf |

#### Rails (m/1/)

| Pattern | Description | Example |
|---------|-------------|---------|
| `rt{leaf}{arch}.json` | Top rail. leaf = 1 or 2, arch = s/a/e/r | `rt2e.json` = double leaf estate top rail |
| `rb{leaf}.json` | Bottom rail. leaf = 1 or 2 | `rb2.json` = double leaf bottom rail |

#### Pickets (m/2/)

| Pattern | Description | Example |
|---------|-------------|---------|
| `pt{leaf}{arch}{type}.json` | Top pickets. type: e=even, o=odd, x=extra (Pro spacing) | `pt2ee.json` = double leaf estate even top pickets |
| `pb{leaf}{type}.json` | Bottom pickets. type: e=even, o=odd, x=extra (Pro spacing) | `pb2e.json` = double leaf even bottom pickets |

#### Finials/Accents (m/3/)

| File | Description |
|------|-------------|
| `fs.json` | Spear finial |
| `ft.json` | Tri-finial |
| `fq.json` | Quad-finial |
| `fp.json` | Plugged finial (cap) |
| `pcf.json` | Flat post cap |
| `pcb.json` | Ball post cap |
| `act.json` | Circle accent (top) |
| `acb.json` | Butterfly accent |
| `acs.json` | Scroll accent |
| `hng.json` | Hinge |
| `ufr{leaf}.json` | U-frame rail |

### Models Are Loaded On Demand Per Style Change

- Style change calls `stl()` which chains: `drt` -> `drb` -> `dpt` -> `dpb` -> `dpc` -> `dHngs` -> `viz`
- `drt()` loads `m/1/rt{leaf}{arch}.json` (top rail, keyed by leaf+arch)
- `drb()` loads `m/1/rb{leaf}.json` (bottom rail, keyed by leaf)
- `dpt()` loads `m/2/pt{leaf}{arch}{e|o|x}.json` (THREE picket models: even, odd, extra)
- `dpb()` loads `m/2/pb{leaf}{e|o|x}.json` (THREE bottom picket models)
- `dfin()` loads `m/3/{finI}.json` (finial model based on selected finial type)
- `dpc()` loads `m/3/{pcI}.json` (post cap model)
- `dact()`/`dacb()`/`dacs()` loads `m/3/ac{type}.json` (accent geometry)

---

## 3. Style Configuration (stlArr)

8 gate styles organized in 2 series:

### 200 Series (flat-top family)

| gN | Name | st | cat | mod | pi | fin |
|----|------|----|-----|-----|----|-----|
| 1 | UAF-200 Flat Top | f2 | f | 200 | 200 | false |
| 2 | UAF-250 Flat Top w/ Spears | f2 | f | 250 | 250 | true |
| 3 | UAF-201 Flat Top 1-1/2" Spacing (Pro) | f2 | f | 201 | 201 | false |
| 4 | UAB-200 Flat Top Flush (Haven) | b2 | b | 200 | 200 | false |

### 100 Series (spear-top family)

| gN | Name | st | cat | mod | pi | fin |
|----|------|----|-----|-----|----|-----|
| 6 | UAS-100 Spear Top | s1 | s | 100 | 100 | true |
| 7 | UAS-150 Staggered Spear | s1 | s | 150 | 100 | true |
| 8 | UAS-101 Spear Top 1-1/2" Spacing (Pro) | s1 | s | 100 | 101 | true |

**Note:** gN=0 and gN=5 are divider rows ("200 Series" and "100 Series"), not actual styles.

### Key Fields

- **st:** model set identifier (f2=flat 2-rail, s1=spear 1-style, b2=flush 2-rail)
- **cat:** category (f=flat, s=spear, b=flush)
- **mod:** model number determines rail/picket model prefix
- **pi:** picket index — 200/250 use same pickets, 201/101 = Pro spacing
- **fin:** whether finials are supported
- **opt:** comma-separated list of available options
- **acc:** comma-separated list of available accents

---

## 4. Color System (clrs array — 8 colors)

Colors are applied via `dClr()` which iterates all 9 materials and sets hex, bumpScale, roughness, metalness, envMapIntensity.

| # | Name | Hex CSS | Hex Int | AO | Roughness | Metalness | EnvMapInt | BumpScale |
|---|------|---------|---------|-----|-----------|-----------|-----------|-----------|
| 0 | Textured Khaki | #cdbeaf | 13483695 | 0.8 | 0.4 | 0.2 | 2.6 | 0.002 |
| 1 | Gloss Bronze | #42382c | 4339756 | 0.8 | 0.1 | 0.3 | 4.0 | 0.0001 |
| 2 | Textured Bronze | #42382c | 4339756 | 0.8 | 0.4 | 0.3 | 5.5 | 0.0015 |
| 3 | Gloss White | #f4f4f4 | 16315894 | 0.5 | 0.2 | 0.2 | 2.5 | 0.0001 |
| 4 | Textured White | #f2f2f2 | 16315894 | 0.3 | 0.2 | 0.1 | 2.5 | 0.002 |
| 5 | Gloss Black | #090909 | 526344 | 1.0 | 0.2 | 0.2 | 8.0 | 0.0001 |
| 6 | Textured Black | #0c0c0c | 789516 | 1.0 | 0.4 | 0.2 | 9.0 | 0.0015 |
| 7 | Silver | #c8c8c8 | 16709874 | 0.6 | 0.2 | 0.8 | 5.5 | 0.0002 |

### 9 Materials That Get Colored

`mainMt`, `pob124Mt`, `pob23Mt`, `pteMt`, `ptoMt`, `ptxMt`, `pbeMt`, `pboMt`, `pbxMt`

---

## 5. Height System

**Heights:** 48", 60", 72" (from `htArr`). Heights use **clipping planes, NOT different models**.

### Key Constants

- `y48` = tY for 48" (stored as variable)
- `y60` = tY for 60"
- `y72` = tY for 72"
- `_48`, `_60`, `_72` = htY values for clipping plane math

### Clipping Planes (created in mCv())

| Plane | Purpose | Normal | Notes |
|-------|---------|--------|-------|
| `pob124Cp` | Clips posts at top | (0, -1, 0) | Standard downward clip |
| `pob23Cp` | Clips center post at top | (0, -1, 0) | Separate for center post height |
| `pteCp`/`ptoCp`/`ptxCp` | Clips top pickets | (0, 0.735, 0) | NON-NORMALIZED normal — critical |
| `pbeCp`/`pboCp`/`pbxCp` | Clips bottom pickets | (0, -0.735, 0) | constant = 0.735 |

**CRITICAL NOTE:** Picket clipping planes use NON-NORMALIZED normal `(0, 0.735, 0)` not `(0, 1, 0)`. This is essential for correct visual output.

Height changes call `movY()` which adjusts clipping plane constants via `cpY()` and repositions everything.

---

## 6. Arch System (arArr)

4 arch types:

| Code | Name | midY | Description |
|------|------|------|-------------|
| s | Standard | 0 | Flat top |
| a | Arched | 0.305 | Curve up |
| e | Estate | 0.305 | Steeper curve up |
| r | Reverse Arched | -0.305 | Curve down |

- Arch type determines which rail and picket models load (the arch character is embedded in the filename)
- Arch also determines finial Y offsets (via position arrays)

---

## 7. Finial System (dfin function)

### Finial Position Lookup Logic

```
if (stg) {                   // staggered spear (UAS-150)
  poStr = 'st' + lfI + arI;  // e.g., 'st2e' for double leaf estate
} else if (modI == '250') {   // Vanguard
  poStr = 'f250_' + lfI + arI;
} else {                      // all other spear styles
  poStr = 'b' + lfI + arI;   // e.g., 'b2e' for double leaf estate
}
```

- Position array is a string of `"x,y,z*x,y,z*..."` parsed at runtime
- Each finial is loaded as `m/3/{finI}.json` where finI = `fs`|`ft`|`fq`|`fp`

### Finial Y Placement in movY()

| Arch Type | Formula |
|-----------|---------|
| Arched | `grfin.y = htY + 0.06 + fsv - f250v` |
| Estate | `grfin.y = htY + 0.04 + fsv - f250v` |
| Reverse | `grfin.y = htY + 0.025 + fsv - f250v` |
| Standard | `grfin.y = htY + 0.04 + fsv - f250v` |

Where:
- `fsv` = -0.152 for spear (s1), 0 for flat (f2/b2)
- `f250v` = 0.205 for Vanguard (gN==2), 0 otherwise

---

## 8. Puppy Picket System

10 puppy types defined in `ftArr`:

| Type | Name | Rail Position |
|------|------|--------------|
| pupfl | Flush | rail at bY + 0.4064 (_16) |
| pupst | Standard | rail at bY + 0.3048 (_12) |
| pupcl | Classic | rail at bY + 0.1905 (_7_5), plus finials |

### Key Behavior

- Puppy pickets **REUSE** existing bottom picket models (`grpbx`) — no separate geometry
- When `pup=true`, `grpbx.visible=true` regardless of `xtr` (Pro spacing)

### Classic Variants Add Puppy Finials via dpfin()

| Code | Description |
|------|-------------|
| pfp | Plugged |
| pfs | Spear |
| pft | Tri |
| pfq | Quad |
| pfps | Staggered plugged |
| pfss | Staggered spear |
| pfts | Staggered tri |
| pfqs | Staggered quad |

- Finial model loaded from `m/3/{pfinI.substr(1,2)}.json` (same as gate finials: fp, fs, ft, fq)
- Position from `pf{leaf}` or `pf{leaf}s` arrays
- `dpfin()` Y offset: `movY()` sets `grpf.y = r3y + 0.076`

---

## 9. Visibility Logic (viz function)

The `viz()` function is the master visibility controller.

### Single Leaf (lfI==1)

- `pob12` visible, `pob23` hidden, `pob14` hidden
- `hng0`/`hng2` hidden (only outer hinges for single)

### Double Leaf (lfI==2)

- `pob12` hidden, `pob14` visible, `pob23` visible
- All 4 hinges visible

### Direct Mount (mntI=='d')

- `pob40s`/`pob40d` hidden, `pc0`/`pc1` hidden (no end posts or caps)

### Pro Spacing (xtr==true)

- `grptx`/`grpbx` visible (extra pickets)

### Puppy (pup==true)

- `grpbx` visible (even if not Pro spacing)

### Features Visibility

| Feature | Visible Element |
|---------|----------------|
| `mdr` | `r2` (mid rail) visible |
| `ufr` | `grufr` (u-frame) visible |
| `xlr`/`bbu`/`bcr`/`pup` | `r3` (lower rail) visible |

---

## 10. Mount System

| Mount | Code | Posts | Hinge X Position |
|-------|------|-------|-----------------|
| Post Mount | `p` | `pob40d`/`pob40s` visible (depending on leaf), caps visible | +/-1.823 |
| Direct Mount | `d` | Posts hidden, caps hidden | +/-1.778 |

---

## 11. Scene Graph (21 children)

| Index | Type | Position | Description |
|-------|------|----------|-------------|
| 0 | PerspectiveCamera | (0.82, 1.27, 7.2) | Main camera |
| 1 | AmbientLight | — | Scene lighting |
| 2-3 | Mesh | (+/-1.778, 1.374, 0) | Post tops or column caps |
| 4-5 | Mesh | (+/-1.778, 0.225, 0) | Post bottoms |
| 6 | Mesh (hidden) | origin | — |
| 7-10 | Mesh | origin | Base geometry |
| 11 | Group (6 children) | — | Post cap group |
| 12 | Group (2 children) | — | Rail group |
| 13 | Group (3 children) | — | Picket group top |
| 14-16 | Group (1 child each) | Y=-0.3052 | Bottom picket groups |
| 17-20 | Group (1 child each, some hidden) | origin | Finial/accent groups |

---

## 12. Key Rendering Functions

### stl() — Style Change Orchestrator

Chains: `drt` -> `drb` -> `dpt` -> `dpb` -> `dpc` -> `dHngs` -> `viz` -> `rndr`

### movY() — Master Y-Position Calculator

THE most critical function. Handles ALL vertical positioning based on height, arch, features.

Calculates:
- Rail Y positions
- Post cap Y
- Hinge Y
- Picket group Y
- Accent group Y
- Finial group Y

Key variable: `fsv = -0.152` for spear family, `0` for flat family.

### dClr() — Color Application

Iterates `mats[]` array, sets hex/bumpScale/roughness/metalness/envMapIntensity on each.

### kOpt() — Reset All Options

Clears all features/puppy/accents, resets state variables.

### kGrp() — Dispose Group

Removes group from scene, disposes geometry/material/maps. Required before creating new group.

---

## 13. Texture System

### Rail Textures

Pattern: `{prefix}{arch}{type}.jpg`

| Prefix | Description |
|--------|-------------|
| `r1ae`, `r1ao`, `r1ax` | Rail 1, arch a, type e/o/x |
| `r2ae`, `r2ao`, `r2ax` | Rail 2, arch a, type e/o/x |

General pattern: `r{rail}{arch}{type}.jpg`

### Shadow/Decoration Textures

| Pattern | Description |
|---------|-------------|
| `dd{height}{side}.jpg` | Driveway shadows for double gate |
| `dp{height}{side}.jpg` | Driveway shadows for post mount |
| `sd{height}{side}.jpg` | Single gate driveway shadows |
| `sp{height}{side}.jpg` | Single gate post shadows |
| `shrl.jpg` | Shadow rail |
| `shpo.jpg` | Shadow post |
| `hing.jpg` | Hinge texture |
| `grdv.jpg` | Ground/driveway texture |
| `fgdp.png` | Foreground double post |
| `fgsp.png` | Foreground single post |
| `sigr.png` | Signature/watermark overlay |

### HDR Environment

`t/hdr/{px,nx,py,ny,pz,nz}.hdr` — cubemap for reflections

### Other Textures

| File | Description |
|------|-------------|
| `bm.jpg` | Bump map (2048x2048) |
| `mnao.jpg` | AO map |
| `ulg.png` | Ultra logo |

---

## 14. Missing from Gate Tool (vs Spreadsheet)

The gate tool has 7 styles (+ UAB-200 flush). The following are **NOT** present in `stlArr`:

| Style | Code | Notes |
|-------|------|-------|
| Lexington | UAS-350 Convex | Not in stlArr |
| Cambridge | UAS-300 Concave | Not in stlArr |
| Eclipse | UAF-200 variant | Not in stlArr |
| Haven Lite | UAF-200 Flush 2-Rail | Not in stlArr |
| Haven Plus | UAF-200 Flush 4.5' | Not in stlArr |
| Haven Guard | UAF-250 Spear Flush | Not in stlArr |
| Defender | UAS-100 Industrial | Not in stlArr |
| All Solace/privacy styles | — | Not in stlArr |

These may exist in a different tool version or may need to be built from the same base models with different configurations.

---

## 15. What We Already Have vs What's New

### Already in Our Repo (gate_tool/m/)

- All post models (po12, po14, po23, po40d, po40s)
- Rail models (rt and rb variants)
- Picket models (pt and pb variants)
- Finial models (fs, ft, fq, fp)
- Accent models (act, acb, acs if they exist)
- Post caps (pcf, pcb)
- Hinge (hng)
- All textures in gate_tool/t/
- All thumbnails in gate_tool/th/

### NEW from This Extraction

| # | Data | Significance |
|---|------|-------------|
| 1 | COMPLETE position arrays for ALL finial/accent/puppy positions | Previously guessed/computed |
| 2 | COMPLETE color PBR values with envMapIntensity | We had partial |
| 3 | COMPLETE `movY()` function logic | THE master positioning function |
| 4 | COMPLETE `viz()` visibility rules | Master visibility controller |
| 5 | COMPLETE `dfin()`/`dpfin()`/`dact()`/`dacb()`/`dacs()` function source | Finial and accent loading |
| 6 | COMPLETE `stlArr` with option/accent gating per style | Per-style feature availability |
| 7 | NEW accent position arrays (`c1s` through `c2r`) for circles/butterflies | Not previously available |
| 8 | NEW puppy finial position arrays (`pf1`, `pf2`, `pf1s`, `pf2s`) | Not previously available |
| 9 | Scroll position array (`scr1`) | Not previously available |
| 10 | Camera function `cmF()` with exact parameters | Not previously available |
| 11 | Material initialization `mCv()` with clipping plane setup | Not previously available |
| 12 | Scene initialization `iSc()` | Not previously available |

**This data is NOT already in our codebase and represents critical missing pieces for a faithful reproduction of Ultra's gate design studio.**
