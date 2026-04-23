# Ultra Style → Asset Mapping

Cross-reference of each Grandview style to Ultra model files, options, and position arrays.

## Key Concept: Styles Share Models

Ultra's 8 styles use only 3 model SETS (determined by `st` field):
- **f2** (flat 2-rail): UAF-200, UAF-250, UAF-201 — same post/rail/picket geometry
- **s1** (spear 1-style): UAS-100, UAS-150, UAS-101 — same post/rail/picket geometry
- **b2** (flush 2-rail): UAB-200 — uses same base as f2 but different bottom rail positioning

What CHANGES between styles within a set:
- Finial support (fin: true/false)
- Pro spacing (xtr: true for pi=201/101)
- Staggered flag (stg: true for gN=7 only)
- Available options and accents
- Position arrays used for finials

---

## Horizon™ (UAF-200 Flat Top)
**Ultra:** gN=1, st=f2, cat=f, mod=200, pi=200, fin=false
**Models:** Same as all f2 styles
- Posts: po12, po14, po23, po40d, po40s
- Rails: rt{1|2}{s|a|e|r}, rb{1|2}
- Pickets: pt{1|2}{s|a|e|r}{e|o|x}, pb{1|2}{e|o|x}
**Options:** pcf, pcb, res, ufr, mdr, xlr, pup, rem
**Accents:** tcr, tbu, scr, bcr, bbu, rem (ALL accents)
**Finials:** NONE (fin=false, flat top plugged only)
**Heights:** 48, 60, 72 (from htArr)
**Pro spacing:** NO (pi=200, xtr=false)
**Staggered:** NO

## Vanguard™ (UAF-250 Flat Top w/ Spears)
**Ultra:** gN=2, st=f2, cat=f, mod=250, pi=250, fin=true
**Models:** Same f2 base + finials
- Finial position arrays: f250_{1|2}{s|a|e|r} (15 positions per leaf for single, 14 for double)
- Finial models: fs, ft, fq, fp
**Options:** pcf, pcb, fs, ft, fq, fp, res, ufr, mdr, xlr, pup, rem
**Accents:** scr, bcr, bbu, rem (NO top circles/butterflies — because finials block them)
**Special:** f250v offset = 0.205 in movY() for finial and odd picket positioning
**Heights:** 48, 60, 72
**Pro spacing:** NO

## Horizon Pro™ (UAF-201 Flat Top 1-1/2" Spacing)
**Ultra:** gN=3, st=f2, cat=f, mod=201, pi=201, fin=false
**Models:** Same f2 base, BUT xtr=true (extra pickets visible)
- grptx/grpbx ALWAYS visible (Pro spacing extra pickets)
**Options:** pcf, pcb, res, ufr, mdr, xlr, rem (NO pup — can't add puppy to Pro)
**Accents:** tcr, tbu, bcr, bbu, rem (NO scroll)
**Special rules in movY():**
- When tcr=true: mY(grptx, tY+_7_5+fsv) — special top-extra positioning
- When gN==3 without tcr: mY(grptx, tY+_12+fsv-_7_5)
**Heights:** 48, 60, 72
**Pro spacing:** YES (pi=201, xtr=true)

## Haven™ (UAB-200 Flat Top Flush)
**Ultra:** gN=4, st=b2, cat=b, mod=200, pi=200, fin=false
**Models:** DIFFERENT bottom rail positioning (flush bottom default)
- Same posts and pickets as f2
- In movY(): `if(gN==4){ r1y = htY-0.07+rH+fsv; }` — different top rail offset
**Options:** pcf, pcb, res, ufr, mdr, xlr, pup, rem
**Accents:** scr, bcr, bbu, rem (NO top circles/butterflies)
**Finials:** NONE
**Heights:** 48, 60, 72 (should be 48, 54, 60 per spreadsheet — MISMATCH)
**Special:** cat=b means different model path for pickets — `b2` prefix

## Charleston™ (UAS-100 Spear Top)
**Ultra:** gN=6, st=s1, cat=s, mod=100, pi=100, fin=true
**Models:** Spear family (s1 set)
- Finial position arrays: b{1|2}{s|a|e|r} (29 positions for single leaf, 26 for double)
- fsv = -0.152 (spear vertical offset applied in movY())
**Options:** pcf, pcb, fs, ft, fq, fp, res, ufr, mdr, xlr, pup, rem (ALL options)
**Accents:** tcr, tbu, scr, bcr, bbu, rem (ALL accents)
**Heights:** 48, 60, 72

## Savannah™ (UAS-150 Staggered Spear)
**Ultra:** gN=7, st=s1, cat=s, mod=150, pi=100, fin=true
**Models:** Same s1 base as Charleston
- stg=true — sets staggered flag, changes finial position array prefix to 'st'
- Finial position arrays: st{1|2}{s|a|e|r} (29 pos single, 26 double, with alternating Y=-0.0381)
**Options:** pcf, pcb, fs, ft, fq, fp, res, ufr, mdr, xlr, pup, rem
**Accents:** tcr, tbu, scr, bcr, bbu, rem
**Special:** Staggered spear uses alternating finial heights — every other finial at Y-0.0381m (1.5")

## Charleston Pro™ (UAS-101 Spear Top 1-1/2" Spacing)
**Ultra:** gN=8, st=s1, cat=s, mod=100, pi=101, fin=true
**Models:** Same s1 base with xtr=true
**Options:** pcf, pcb, fs, ft, fq, fp, res, ufr, mdr, xlr, rem (NO pup)
**Accents:** tcr, tbu, bcr, bbu, rem (NO scroll)
**Special rules in movY():**
- When gN==8 with tcr: mY(grptx, tY+_7_5+fsv)
- When gN==8 with tbu: mY(grptx, tY+_5+fsv)
- When gN==8 neither: mY(grptx, tY+_12+fsv)

---

## Styles NOT in Ultra's Gate Tool (from spreadsheet)

These styles exist in the product line but have no 3D gate configurator:

| Grandview Name | Ultra Model | Notes |
|---|---|---|
| Lexington™ | UAS-350 Convex | Curved outward rail — would need new rail models |
| Cambridge™ | UAS-300 Concave | Curved inward rail — would need new rail models |
| Eclipse™ | UAF-200 variant | Ring accents — may use same models + ring geometry |
| Haven Lite™ | UAF-200 Flush 2-Rail | 2-rail variant — may work with existing models, fewer rails |
| Haven Plus™ | UAF-200 Flush 4.5' | Extended height Haven — same models, different height range |
| Haven Guard™ | UAF-250 Spear Flush | Flush + spears — combination of b2 + finials |
| Defender™ | UAS-100 Industrial | 84"/96" only — same s1 models, different height range |
| Solace™ | Privacy solid | Completely different — panel models needed |
| Solace Air™ | Privacy louvered | Completely different — louver models needed |

---

## Model Loading Flow

When user selects a style:
```
stl() sets: stlI, modI, rtI, rbI, fin, xtr, stg
  → drt() loads m/1/rt{leaf}{arch}.json (if changed)
  → drb() loads m/1/rb{leaf}.json (if changed)
  → dpt() loads 3 picket models: pt{leaf}{arch}{e|o|x}.json
  → dpb() loads 3 picket models: pb{leaf}{e|o|x}.json
  → dpc() loads m/3/{pcI}.json (post cap)
  → dHngs() loads m/3/hng.json (hinges)
  → viz() sets visibility for all meshes
  → movY() positions everything vertically
  → movX() positions everything horizontally
  → render
```

Style changes only trigger new model loads when the model KEY changes:
- Switching UAF-200 ↔ UAF-250 ↔ UAF-201: NO new models (same f2 set, same leaf/arch)
- Switching UAF-200 ↔ UAS-100: YES new models (f2 → s1, different picket geometry)
- Changing arch (s→e): YES new rail + top picket models
- Changing leaf (1→2): YES new rail + all picket models
