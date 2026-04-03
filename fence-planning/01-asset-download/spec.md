# Split 01: Asset Download — Fence Models, Textures & Thumbnails

## Objective
Download all fence-specific 3D model files, HDR environment textures, background images,
foreground overlays, and thumbnails from Ultra's live fence tool using Playwright.

## Source
Ultra fence tool: `https://www.ultrafence.com/design-studio/fence/`

## Target Directory
```
fence_tool/
├── m/
│   ├── 0/          # Posts (pot.json, pob.json)
│   ├── 1/          # Top rails (rtf2.json, rts1.json, rtb2.json, + gs variants, + circle variants)
│   ├── 2/          # Bottom rails (rbs.json, grbs.json)
│   ├── 3/          # Picket tops (ptf200.json, pts100.json, ptb200.json, + gs/pro/circle variants)
│   ├── 4/          # Picket bottoms (pbs.json, pbd.json, gpbs.json, gpbd.json)
│   ├── 5/          # Finials (fn100s.json, fn100t.json, fn100q.json, fn100p.json, fn250s.json, + gs variants)
│   ├── 6/          # Puppy (pupcl.json, pupst.json, pupfl.json, + g variants)
│   ├── 7/          # Puppy finials (fn100s.json, etc., + g variants)
│   ├── 8/          # Post caps + accents (pcf.json, accir.json, acbut.json, acscr.json, + gs variants)
│   └── 9/          # Privacy (DEFER — not needed for MVP)
├── t/
│   ├── hdr_fr/     # Front yard HDR cubemap (px/nx/py/ny/pz/nz.hdr)
│   ├── hdr_ba/     # Back yard HDR cubemap
│   ├── fb.jpg      # Front yard background
│   ├── bb.jpg      # Back yard background
│   ├── bm.jpg      # Bump map (may reuse gate_tool/t/bm.jpg)
│   ├── ffs.png     # Front foreground: standard
│   ├── ffd.png     # Front foreground: dense (puppy)
│   ├── fff.png     # Front foreground: flush
│   ├── ffp.png     # Front foreground: privacy
│   ├── ffplt.png   # Front foreground: planter overlay
│   ├── bfp.png     # Back foreground: privacy
│   └── bff.png     # Back foreground: fence
├── th/             # Thumbnails for fence styles
│   ├── th_st_uaf_200.jpg
│   ├── th_st_uaf_250.jpg
│   ├── th_st_uaf_201.jpg
│   ├── th_st_uab_200.jpg
│   ├── th_st_uas_100.jpg
│   ├── th_st_uas_150.jpg
│   ├── th_st_uas_101.jpg
│   ├── th_st_uas_300.jpg
│   ├── th_st_uas_350.jpg
│   └── (accessory/puppy/cap thumbnails)
└── MANIFEST.json   # Complete file listing with sizes and download status
```

## Download Strategy

### Step 1: Model Files via Playwright
Navigate to Ultra's fence tool, then for each model path:
```javascript
// Use XMLHttpRequest to download JSON models
const url = 'https://www.ultrafence.com/design-studio/fence/m/0/pot.json';
const response = await fetch(url);
const json = await response.json();
```
Save each JSON file to the corresponding local path.

### Step 2: Determine Complete File List
From the extracted function source code, we know these model IDs:

**Posts (m/0/):**
- pot.json, pob.json

**Top rails (m/1/):**
- rtf2.json, rts1.json, rtb2.json (per stlI)
- gsrtf2.json, gsrts1.json, gsrtb2.json (gate section variants)
- rtf2c.json, rts1c.json (circle variants)
- gsrtf2c.json, gsrts1c.json (gate section + circle)
- Rail groove textures: grd128T.jpg, grd128L.jpg, grd128R.jpg
- Gate shadow: gashd.jpg (in m/3/)

**Bottom rails (m/2/):**
- rbs.json, grbs.json

**Picket tops (m/3/):**
- ptf200.json, ptf250.json, ptf201.json (flat family)
- pts100.json (spear family — used by 100, 150, 300, 350)
- ptb200.json (flush family)
- ptf201c.json (pro + circle variant)
- gsptf200.json, gspts100.json, gsptb200.json, etc. (gate section variants)

**Picket bottoms (m/4/):**
- pbs.json, pbd.json (standard / pro-density)
- gpbs.json, gpbd.json (gate section variants)

**Finials (m/5/):**
- fn100s.json, fn100t.json, fn100q.json, fn100p.json (spear finials)
- fn250s.json, fn250t.json, fn250q.json, fn250p.json (Vanguard finials)
- fn150s.json, etc. (staggered — may reuse fn100 per dfin source)
- fn300s.json, fn350s.json (concave/convex)
- gsfn100s.json, etc. (gate section variants)

**Puppy (m/6/):**
- pupcl.json, pupst.json, pupfl.json
- gpupcl.json, gpupst.json, gpupfl.json

**Puppy finials (m/7/):**
- Same IDs as m/5/ finials but in puppy context

**Post caps + accents (m/8/):**
- pcf.json (flat cap)
- accir.json (circle accent)
- acbut.json (butterfly accent)
- acscr.json (scroll accent)
- gsaccir.json, gsacbut.json (gate section accent variants)

### Step 3: Textures & Images
- HDR cubemaps: 6 files each for front/back (px/nx/py/ny/pz/nz.hdr)
- Background images: fb.jpg, bb.jpg
- Foreground overlays: ffs.png, ffd.png, fff.png, ffp.png, ffplt.png, bfp.png, bff.png
- Post texture: m/0/pors.jpg
- Bump map: bm.jpg (or reuse gate_tool/t/bm.jpg)

### Step 4: Verification
For each downloaded JSON model:
1. Confirm file is valid JSON
2. Confirm it contains `vertices` and `faces` arrays (Three.js JSON format)
3. Log vertex count and face count
4. Test loading with `THREE.JSONLoader` in a minimal test page

### Step 5: Write MANIFEST.json
```json
{
  "downloaded": "2026-03-31",
  "source": "https://www.ultrafence.com/design-studio/fence/",
  "files": [
    { "path": "m/0/pot.json", "size": 12345, "vertices": 234, "faces": 456, "status": "ok" },
    ...
  ]
}
```

## Acceptance Criteria
- [ ] All model files downloaded and valid JSON
- [ ] All HDR cubemaps downloaded (12 files)
- [ ] Background images downloaded (2 files)
- [ ] Foreground overlays downloaded (7 files)
- [ ] MANIFEST.json lists every file with status
- [ ] Test page confirms JSONLoader can parse at least pot.json, rtf2.json, ptf200.json
