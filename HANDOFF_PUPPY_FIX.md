# Puppy Picket Fix — Handoff Document
**Date: 2026-03-19 | Branch: feat/fence-quiz | Commit: 0742d73**

## THE BUG

**Flush and Standard puppy types WORK — pickets extend above the puppy rail.**
**All classic variants (Nouveau, Excelsior, Bella, Fleur de Lis, and their staggered versions) do NOT — pickets stop at the puppy rail.**

The classic variants are pupId values: `plg`, `pls`, `spe`, `sps`, `tri`, `trs`, `qua`, `qus`.

## HOW TO REPRODUCE

1. Open `localhost:3000`
2. Go to Puppy tab (step 5)
3. Select "Flush" → puppy pickets extend above the rail ✓
4. Select "Classic" (id='std') → puppy pickets extend above the rail ✓
5. Select "Excelsior" (id='qua') → puppy pickets STOP at the rail ✗
6. Select any other classic variant → same broken behavior ✗

## EXECUTION RULES (FROM SARAH)

1. **ONE FIX AT A TIME** — commit, push, wait for Sarah to confirm
2. **DO NOT BREAK WORKING STYLES** — test Horizon, Vanguard, Charleston, Charleston Pro, Savannah after every change
3. **MATH FIRST** — extract numbers from Ultra via Playwright, implement against those numbers, verify numerically
4. **DO NOT modify `gate_tool/js/ultra_dsg_min.js`**
5. **DO NOT batch fixes** — one commit per fix
6. **STOP and TELL SARAH** after each fix with Ultra numbers vs localhost numbers

---

## ULTRA'S PUPPY ARCHITECTURE (Verified via Playwright + Source)

### Key Variables
| Ultra var | Value | Meaning |
|-----------|-------|---------|
| `pup` | bool | Puppy active |
| `pupI` | string | Puppy type: `pupst`, `pupfl`, `pupcl` |
| `bY` | float | Bottom rail Y (0.155 normal, 0.0508 when flush) |
| `r3y` | float | Puppy rail Y position |
| `pbxCp` | Plane | Clip plane controlling how high puppy pickets extend |
| `grpbx` | Group | Bottom extra picket group (reused for puppy) |
| `grptx` | Group | Top extra picket group (NOT used for puppy, only pro spacing) |

### Puppy Type Mapping
| Our pupId | Ultra pupI | Type | bY | r3y formula | r3y value |
|-----------|-----------|------|-----|------------|-----------|
| `std` | `pupst` | Standard | 0.155 | bY + _12 (0.3048) | 0.4598 |
| `fls` | `pupfl` | Flush | 0.0508 | bY + _16 (0.4064) | 0.4572 |
| `plg`,`pls`,`spe`,`sps`,`tri`,`trs`,`qua`,`qus` | `pupcl` | Classic | 0.155 | bY + _7_5 (0.1905) | 0.3455 |

### Clip Plane Math
The puppy clip plane `pbxCp` has normal `(0, -0.735, 0)` (non-normalized).
Effective clip ceiling = `constant / |normal|` = `constant / 0.735`.

| Type | pbxCp.constant | Clip ceiling Y | Rail Y | Distance above rail |
|------|---------------|---------------|--------|-------------------|
| Standard | 0.6598 | 0.8977 | 0.4598 | 0.4379m |
| Flush | 0.6572 | 0.8942 | 0.4572 | 0.4370m |
| Classic | 0.477 | 0.6490 | 0.3455 | 0.3035m |

**All types should show pickets extending significantly above the puppy rail.**

### Ultra Source — Clip Plane Setting (from `movY()`)
```javascript
// Ultra sets the clip plane based on puppy type:
if(pupI=='pupst' || pupI=='pupfl'){
    cpY(pbxCp, r3y + 0.2);  // std/flush: clip = railY + 0.2
} else {
    cpY(pbxCp, _18 + 0.02);  // classic: clip = 0.457 + 0.02 = 0.477
}
```

### Ultra Source — Visibility
```javascript
// grpbx (bottom extra pickets) visible for pro spacing OR puppy:
if(xtr==true){
    grptx.visible = true; grpbx.visible = true;  // pro spacing: both halves
} else {
    grptx.visible = false;                         // NOT pro: top half hidden
    if(pup==true){ grpbx.visible = true; }         // puppy: bottom half only
    else { grpbx.visible = false; }
}
```

### Ultra Source — Bottom Rail
```javascript
if(res==true || pupI=='pupfl'){ bY = _2; }  // flush: bottom rail drops to 0.0508
else { bY = 0.155; }                         // all others: normal bottom rail
```

---

## OUR CODE — Current State (GateRenderer.js)

### Puppy Variables (lines 237-247)
```javascript
var hasPuppy = config.accessories && config.accessories.pup;
var pupId = hasPuppy ? config.accessories.pup : null;
var isClassicPuppy = pupId && ['plg','pls','spe','sps','tri','trs','qua','qus'].indexOf(pupId) !== -1;
var isFlushPuppy = (pupId === 'fls');
var puppyRailY = isClassicPuppy ? 0.3455 : (isFlushPuppy ? 0.4572 : 0.4598);
```

### Clip Plane Setting (lines 274-284)
```javascript
if (hasPuppy) {
    if (isClassicPuppy) {
        clips.pbRes.constant = CLIP_PB_PUPPY_CLP;  // 0.477
    } else if (isFlushPuppy) {
        clips.pbRes.constant = 0.6572;
    } else {
        clips.pbRes.constant = CLIP_PB_PUPPY_STD;  // 0.6598
    }
} else {
    clips.pbRes.constant = CLIP_PB;  // 0.735 (default)
}
```

### pbRes Mesh Loading (lines 514-522)
```javascript
loader.load(getModelPath('pbRes', config), function(geo) {
    var mesh = new THREE.Mesh(geo, makeClipMat(clips.pbRes));
    snap(mesh, M_IDENTITY);
    mesh.visible = isProSpacing || hasPuppy;  // BUG: evaluates to string not boolean
    gate.add(mesh);
});
```

### Puppy Rail (lines 428-432)
```javascript
if (hasPuppy) {
    var meshP = new THREE.Mesh(geo, makeMat());
    snap(meshP, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,puppyRailY,0,1]);
    gate.add(meshP);
}
```

---

## WHAT WAS VERIFIED VIA PLAYWRIGHT (This Session)

### Test 1: Runtime Clip Inspection
After selecting Classic (std) puppy via UI:
- pbRes mesh clip constant: **0.6598** ✓ (correct for standard)
- pbRes geometry bbox: Y = 0.051 to 2.134 (model extends well above rail)
- pbRes visible: `"std"` (string, not boolean — but renders as truthy)

### Test 2: Clip Override to 3.0
Setting `clips.pbRes.constant = 3.0` via Playwright console made the extra pickets extend ALL THE WAY up the gate. **This proves the clip plane mechanism works and the model geometry IS tall enough.**

### Test 3: Ultra Extraction (Standard Puppy)
- Ultra r3y = 0.4598, pbxCp.constant = 0.6598 ✓
- Ultra grpbx geometry: minY=0.051, maxY=2.134 (same model as ours)

---

## THE MYSTERY

The clip constant IS set correctly (0.6598 for standard, 0.477 for classic). The model geometry DOES extend above the rail (to Y=2.134). The clip ceiling IS above the rail (0.898 for standard, 0.649 for classic). Setting clip=3.0 DOES make pickets extend above.

Yet visually at the correct clip values, the extra pickets appear to stop at the puppy rail.

### Possible Root Causes (Not Yet Tested)

1. **Race condition in buildGate**: If `buildGate` is called twice (e.g., React re-render), the second call resets `clips.pbRes.constant` before the first call's async model load completes. The material created in the callback would have the wrong constant. Capture the constant before async and re-apply in callback.

2. **Three.js r86 clip plane precision**: Non-normalized normals (0, -0.735, 0) might behave unexpectedly at certain constant values in r86. Try normalizing to (0, -1, 0) and adjusting constants accordingly: `new_constant = old_constant / 0.735`.

3. **Shared plane object mutation**: `clips.pbRes` is a shared `THREE.Plane` instance. Multiple materials reference it. When `buildGate` clears meshes and rebuilds, the old materials' references might interfere with the new ones. Consider creating a NEW plane per build.

4. **`mesh.visible = "std"` (string)**: While truthy, Three.js r86 might handle string visibility differently in the render pipeline. Fix: `mesh.visible = !!(isProSpacing || hasPuppy)`.

### Recommended Investigation Order

1. **Fix the boolean**: `mesh.visible = !!(isProSpacing || hasPuppy)` — quick, safe
2. **Capture clip constant**: Save clip value before async, re-apply in callback
3. **Create new plane per build**: Instead of mutating `clips.pbRes.constant`, create `new THREE.Plane(...)` each time
4. **Normalize clip normals**: Try `(0, -1, 0)` with `constant / 0.735` — eliminates any r86 non-normalized normal issues
5. **Add console.log in callback**: Log the actual clip constant when the material is created to verify timing

---

## WHAT WAS FIXED THIS SESSION (All Pushed & Stable)

| Commit | Fix | Verified |
|--------|-----|----------|
| d04f0ca | Hoist puppy variables before rail calculations | ✓ |
| 3722153 | Accent circles/butterflies no longer float (add fsv+hOff) | ✓ Sarah confirmed |
| bc8b6bb | Second rail moves up 0.0635m when circles active | ✓ Sarah confirmed |
| 5c1d7f3 | Scroll positions use Ultra's exact arrays + dynamic Y | ✓ Sarah confirmed |
| 1209f96 | Pro spacing pickets extend to meet raised rail (circles) | ✓ Sarah confirmed |
| fc57457 | Direct mount: only hides outer posts, keeps hinges/inner | ✓ Sarah confirmed |
| ca988d1 | Direct mount hinges push out to x=±1.829 | ✓ Sarah confirmed |
| 3e8d76c | Direct mount camera zoom 1.85 to fill pillar gap | ✓ Sarah confirmed |

---

## OTHER KNOWN ISSUES (Not Yet Fixed)

1. **Savannah loses a horizontal rail** — user reported, not investigated
2. **Quote tab clipping + duplicate button** — CSS/React, no renderer risk
3. **OptionsTab images not wired** — UI only
4. **Style card hover popups** — UI enhancement

---

## ULTRA SOURCE KEY FUNCTIONS

| Function | Purpose |
|----------|---------|
| `viz()` | Main render — sets visibility, calls movY, movX, shadow |
| `movY()` | Sets all Y positions: rails, clips, pickets, accents, scrolls |
| `movX()` | Sets X positions for hinges, caps per leaf/mount |
| `stl()` | Style change — reloads models, then chains to viz |
| `dact()` | Load top accent (circle/butterfly) meshes |
| `dacb()` | Load bottom accent meshes |
| `dacs()` | Load scroll meshes |
| `dfin()` | Load finial meshes |
| `dpfin()` | Load puppy finial meshes |
| `cpY(plane, val)` | Set clip plane constant |
| `mY(obj, val)` | Set object position.y |
| `mX(obj, val)` | Set object position.x |

## PLAYWRIGHT EXTRACTION TEMPLATE (For Next Session)

```javascript
// Run on Ultra: https://www.ultrafence.com/design-studio/gates/index.html
// Set state, call movY, then extract:
() => new Promise(resolve => {
    window.pup = true;
    window.pupI = 'pupst';  // change per variant
    movY(function() {
        var out = {};
        ['r0','r1','r3','r4'].forEach(function(k) {
            if (window[k]) out[k] = { posY: +window[k].position.y.toFixed(4), visible: window[k].visible };
        });
        if (window.pbxCp) out.pbxCp = { constant: +window.pbxCp.constant.toFixed(4) };
        if (window.grpbx) {
            out.grpbx = { posY: +window.grpbx.position.y.toFixed(4), visible: window.grpbx.visible };
            window.grpbx.children.forEach(function(c, i) {
                var box = new THREE.Box3().setFromObject(c);
                out['grpbx_child'+i] = { minY: +box.min.y.toFixed(4), maxY: +box.max.y.toFixed(4) };
            });
        }
        out.bY = window.bY; out.r3y = window.r3y;
        resolve(out);
    });
})
```

**NOTE:** `movY()` only sets positions/clips. Call `viz()` after to set visibility. But `viz()` requires all models loaded. For position/clip extraction, `movY()` alone is sufficient.
