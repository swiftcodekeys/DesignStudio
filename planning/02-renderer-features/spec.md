# Split 02: Renderer Features — Complete Feature Parity

## Goal
Every option available in Ultra's design studio must work in the Grandview renderer. When a user changes any setting, the 3D model must visibly update.

## Context
- **Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- **Primary files:** `GateRenderer.js`, `configData.js`, `spatialConstants.js`
- **Reference:** Ultra's live tool + `gate_tool/js/ultra_dsg_min.js` (obfuscated source of truth)
- **Depends on:** Split 01 (needs proper lighting/materials to visually verify)

## What Already Works
- 7 gate styles load and render (Horizon, Horizon Pro, Vanguard, Haven, Charleston, Charleston Pro, Savannah)
- Arch styles: Estate, Arched, Standard, Royal — with correct clipping
- Finials: Spear, Trident, Quad, Plug — placed at Ultra's exact XYZ positions
- Post caps: Flat & Ball — arch-aware inner Y adjustment
- Accessories: Circles, Butterflies, Scrolls — at verified positions
- Options: Mid rail, extra rail, upper filler rail, puppy panel toggle, pro spacing
- Height selection: 36–72" with clipping planes
- Color switching: 8 colors with PBR material update (fast path)
- Pro spacing: UAF-201 & UAS-101 with correct Y offsets

## What Needs To Be Built

### 1. Leaf Count Rendering (Single/Double Gate)
- **Config key:** `leaf: '1'` or `leaf: '2'`
- Currently hardcoded per style (leafDefault in configData). Needs to be user-selectable.
- Model files differ by leaf: `rt1s.json` (single) vs `rt2s.json` (double)
- `configData.getModelPath()` already resolves leaf in path — just need to pass correct value
- Thumbnails: `th_so_sngpl.jpg` (single), `th_so_dblpl.jpg` (double)

### 2. Mount Type Rendering
- **Config key:** `mount: 'p'` (post) or `mount: 'd'` (direct)
- Ultra variables: `mntI = 'p'` / `'d'`
- Post mount: loads standard post models (po40s outer posts)
- Direct mount: loads wall-mount bracket models instead of posts
- Thumbnails: `th_so_sngpl.jpg`/`th_so_dblpl.jpg` (post), `th_so_sngpo.jpg`/`th_so_dblpo.jpg` (direct)
- Need to research `ultra_dsg_min.js` for exact model swap logic

### 3. Puppy Picket Variant Rendering
- Currently: puppy picket toggle (on/off). Missing: variant TYPE selection.
- 10 types with distinct models and clipping:
  - Standard (pup_std), Flush (pup_fls), Plug (pup_plg), Plug Spear (pup_pls)
  - Quad (pup_qua), Quad Spear (pup_qus), Spear (pup_spe), Spear Spear (pup_sps)
  - Trident (pup_tri), Trident Spear (pup_trs)
- Clipping: `CLIP_PB_PUPPY_STD = 0.6598`, `CLIP_PB_PUPPY_CLP = 0.477`
- Thumbnails: `th_pup_*.jpg` for each type
- Research needed: which puppy types use which clipping constant

### 4. Fix Flush Bottom Rail (`res`)
- **Config key:** `res: true`
- Should lower bottom rail Y to 0.0508m (from current ~0.155m)
- Ultra variable: `res` boolean
- Currently broken — bottom rail doesn't move when `res` toggled
- Research `ultra_dsg_min.js` for exact rail transform when `res=true`

### 5. Width Adjustment
- Currently: gate renders at default width
- Ultra allows width selection: 36", 42", 48", 60", 72", 96", 120", 144"
- Research needed: does Ultra scale the model, or load different width models?
- Likely a horizontal scale transform on the gate group

### 6. Visual Verification Pass
- [ ] Verify finial positions: Charleston style + Estate arch
- [ ] Verify po23 center gap: gap should be baked into model (no vertex shift needed)
- [ ] Verify all 7 styles × 4 arch types render correctly
- [ ] Verify pro spacing Y for UAS-101
- [ ] Test all option combinations don't break each other

## Ultra Source Variables (Reference)
```
stlArr[gN].pi  — style/picket ID ('200','201','250','200b','100','101','150')
mntI            — mount type ('p'=post, 'd'=direct)
lfI             — leaf count ('1'=single, '2'=double)
xtr             — extra pickets (pro spacing, auto-detected from pi)
res             — flush bottom rail (boolean)
grptx/grpbx     — extra picket mesh groups (visibility toggled by xtr)
dfin()          — finial drawing function
```

## Validation Criteria
- [ ] Single gate and double gate render with correct models
- [ ] Post mount and direct mount show different geometry
- [ ] All 10 puppy picket types render distinctly
- [ ] Flush bottom rail moves bottom rail to grade level
- [ ] Width changes are visible in the viewport
- [ ] No rendering regressions — all existing features still work
- [ ] Every option change produces a visible 3D update

## Constraints
- Always validate against Ultra's live tool before committing
- Never guess rendering values — extract from `ultra_dsg_min.js`
- Keep `configData.getModelPath()` as single source of truth for model file resolution
- One fix = one commit

## Dependencies
- **Input from 01:** Proper lighting and materials for visual verification
- **Output to 03:** Complete set of renderer hooks (config keys → visible 3D changes) that UI controls can invoke
