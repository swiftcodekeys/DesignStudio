# Split 03: Styles & Options — All 9 Aluminum Fence Styles + Accessories

## Objective
Add all remaining fence styles beyond UAF-200, plus all accessories (accents, puppy, finials).
Each style is added one at a time and validated against Ultra before moving to the next.

## Dependencies
- Split 02 (FenceRenderer.js must render UAF-200 correctly)
- All model files downloaded (Split 01)

## Style Build Order

### Phase A: Spear Styles (adds finials + spear offset)

#### 1. UAS-100 Charleston (Spear Top)
**What changes:**
- Model: pts100.json (top pickets), gspts100.json (gate section)
- Finials: m/5/fn100{finT}.json where finT = s/t/q/p
  - Gate section finials: m/5/gsfn100{finT}.json
  - Finial Y offset: 0.025 (from dfin source)
  - Finials placed at poArr positions + gate section
  - Group position: tY
- Accent offset: circles/butterflies at tY - 0.1524 (vs flat's tY)
- Scroll Y: (tY/2) - 0.125 (vs flat's (tY/2) - 0.035)
- Bottom pickets: pbs.json (standard, same as UAF-200)
- Rails: rts1.json, gsrts1.json

**Validation:** Compare finial positions and accent heights vs Ultra's UAS-100.

#### 2. UAS-150 Savannah (Staggered Spear)
**What changes from UAS-100:**
- Finials use fn150{finT}.json models (but dfin source shows it falls back to fn100)
  - `if(finC == '150') gfinI = 'fn100' + finT` — gate section uses fn100 regardless
- Staggered Y: The stagger is in the model geometry, not in positioning code
- Same spear offset and accent positioning as UAS-100

**Validation:** Confirm stagger is visible in picket/finial rendering.

#### 3. UAS-101 Charleston Pro (Spear Top 1-1/2" Spacing)
**What changes from UAS-100:**
- Bottom pickets: pbd.json (pro density), gpbd.json (gate section)
- Picket top: pts100.json (same model — the "pro" density is in the model file)
  - Actually may need: ptI = 'pt' + cat + pi = 'pts101' — verify against Ultra
- No puppy pickets allowed (acc string is empty)
- No scroll accents

**Validation:** Confirm denser picket spacing matches Ultra.

---

### Phase B: Remaining Flat Styles

#### 4. UAF-250 Vanguard (Flat Top with Spears)
**What changes from UAF-200:**
- Finials: fn250{finT}.json — different model than UAS-100's fn100
  - `if(finC != '250') finY = 0.025` — Vanguard finials have Y=0 (no offset)
- Picket top: ptf250.json (alternating picket heights baked into model)
- Same rts: rtf2.json (same flat rail)
- Accents: only scrolls + puppy (no circles/butterflies — finials occupy that space)

**Validation:** Confirm finials render at correct height (no 0.025 offset).

#### 5. UAF-201 Horizon Pro (Flat Top 1-1/2" Spacing)
**What changes from UAF-200:**
- Bottom pickets: pbd.json (pro density)
- Picket top: ptf201.json (denser spacing)
  - Circle variant: ptf201c.json (if circles active, special model)
- No puppy, no scroll
- Accents: only circles, butterflies

**Validation:** Confirm dense picket spacing, circle variant model swap.

#### 6. UAB-200 Haven (Flat Top Flush)
**What changes:**
- Models: rtb2.json, gsrtb2.json (flush rail geometry), ptb200.json, gsptb200.json
- Height: FORCED to 48" (`if(stlI == 'b2') { hite = '48'; tY = y48; }`)
- Bottom rail Y: always -0.099 (flush style behaves like back yard view)
- No accessories (acc string is empty)

**Validation:** Confirm forced 48" height, bottom rail position matches Ultra.

---

### Phase C: Fence-Only Styles

#### 7. UAS-300 Concave (Cambridge) — FENCE ONLY
**What changes:**
- Picket top model has concave curve (different from all other styles)
- Need to verify model file exists: pts100.json may work (shared s1 model set)
  - OR may need separate model — check Ultra's network tab
- Finials: fn300{finT}.json → BUT dfin says `if(finC=='300') gfinI='fn100'+finT`
  - So panel finials use fn300, gate section finials use fn100
- Same spear accent offsets as UAS-100

**Risk:** Model file for concave picket top may not be in standard model set.
**Mitigation:** Download and test this model first. If it's just a different ptI string
pointing to the same s1 model set, it may already work.

**Validation:** Confirm concave picket curve renders correctly.

#### 8. UAS-350 Convex (Lexington) — FENCE ONLY
**What changes from UAS-300:**
- Picket top model has convex curve (opposite of concave)
- Finials: fn350{finT}.json → gate section uses fn100
- Otherwise identical positioning to UAS-300

**Validation:** Confirm convex picket curve renders correctly.

---

### Phase D: Accessories

#### 9. Circle Accents
**Models:** m/8/accir.json + m/8/gsaccir.json
**Positioning:**
- Flat styles (f2): gract.position.y = tY
- Spear styles (s1): gract.position.y = tY - 0.1524
- Placed at poArr positions + gate section
- When circles active, rail model changes: rtI += 'c' (e.g., rtf2c.json)
- Pro picket top also changes: ptI = ptf201c.json

#### 10. Butterfly Accents
**Models:** m/8/acbut.json + m/8/gsacbut.json
**Positioning:** Same as circles (shares gract group)

#### 11. Scroll Accents
**Models:** m/8/acscr.json (single model, no gs variant)
**Positioning (from mvY source):**
- Flat front no circles: (tY/2) - 0.035
- Flat front with circles: (tY/2) - 0.015
- Spear front no circles: (tY/2) - 0.125
- Spear front with circles: (tY/2) - 0.100
- Back yard adds ~0.030-0.035 additional offset
- Gate section scroll at gZ - 0.340, rotated -90°

#### 12. Puppy Pickets
**Models:** m/6/{pupI}.json + m/6/g{pupI}.json
**Types:**
- pupcl (classic) — adds puppy finials
- pupst (standard) — no finials
- pupfl (flush) — no finials
**Positioning:** Same poArr repetition as other components, group at Y=0

#### 13. Puppy Finials
**Models:** m/7/{pfinI}.json + m/7/g{pfinI}.json
**Positioning:** poArr positions, group.position.y = 0.025
**Only active when:** puppy type is classic (pupcl)

## Model ID Construction Reference

```javascript
// Style → model set
stlI = stlArr[fN].st;     // 'f2' | 's1' | 'b2'
cat  = stlArr[fN].cat;     // 'f' | 's' | 'b'
mod  = stlArr[fN].mod;     // '200' | '250' | '201' | '100' | '150' | '101' | '300' | '350'
pi   = stlArr[fN].pi;      // '200' | '250' | '201' | '100' | '101'

// Rails
rtI = 'rt' + stlI;         // rtf2, rts1, rtb2
if (cir) rtI += 'c';       // rtf2c, rts1c

// Pickets
ptI = 'pt' + cat + pi;     // ptf200, pts100, ptb200, ptf250, ptf201
if (cir && pi=='201') ptI = 'pt' + cat + pi + 'c';  // ptf201c

// Bottom pickets
pbI = (pi=='201' || pi=='101') ? 'pbd' : 'pbs';

// Finials
finI = 'fn' + mod + finT;  // fn100s, fn250t, fn300q, fn350p
// Gate section finial: staggered/concave/convex use fn100
gfinI = (mod=='150'||mod=='300'||mod=='350') ? 'fn100'+finT : finI;
```

## Acceptance Criteria
- [ ] All 9 aluminum styles render correctly
- [ ] Finials place correctly for all styles that support them (5 styles)
- [ ] All 4 finial types work (spear, tri, quad, plug)
- [ ] Circle accents render with correct Y offset per style family
- [ ] Butterfly accents render with correct Y offset
- [ ] Scroll accents render with fence-specific Y formulas
- [ ] Puppy pickets render (standard, flush, classic)
- [ ] Puppy finials render for classic puppy
- [ ] Each style validated against Ultra's live fence tool before marking complete
