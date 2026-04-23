# Split 01: Rendering Quality Design

**Date:** 2026-03-17
**Status:** Approved (rev 4 — review fixes applied)
**Scope:** Make the 3D gate look realistic — match Ultra's actual rendering pipeline
**Data source:** `planning/ultra-live-scrape-2026-03-17.json` (scraped via Playwright)

---

## Problem

The gate renders flat and lifeless. Playwright scrape of Ultra's live tool reveals the "realistic" look comes almost entirely from:
1. **PMREM-processed HDR environment map** applied per-material
2. **Per-color envMapIntensity** ranging from 2.5 (whites) to 9.0 (textured black)
3. **Bump map** (2048×2048, canvas-generated from bm.jpg)

Ultra does NOT use: directional lights, shadows, ground planes, fancy tone mapping, or gamma correction. The entire scene has a single AmbientLight at 0.5 intensity.

## What's Wrong In Our Code

| Property | Ultra (scraped) | Our Code | Fix |
|----------|----------------|----------|-----|
| Ambient intensity | 0.5 | 0.6 | Lower to 0.5 |
| Directional light | NONE | 1 at (-5,10,5) | Remove |
| Camera near | 1 | 0.1 | Change to 1 |
| FlatShading | YES (shading=1) | YES (shading=1) | KEEP — do not remove |
| Material side | FrontSide (0) | DoubleSide (2) | Change to FrontSide |
| envMap | PMREM HDR, per-material | NONE | **ADD** (critical) |
| envMapIntensity | Per-color (2.5–9.0) | N/A | **ADD** per color |
| bumpMap | Canvas 2048×2048 from bm.jpg | NONE | **ADD** |
| Shadows | disabled | disabled | Keep disabled |
| Tone mapping | Linear (default) | Linear (default) | Keep as-is |
| Gamma | off | off | Keep as-is |
| Silver hex | 0xFEF8F2 | 0xc8c8c8 | **FIX** |

---

## Design

### 1. Environment Map (THE critical change)

This is the single biggest improvement. Ultra's entire visual quality comes from the PMREM env map.

**Script loading:** Add `<script>` tags to `index.html` for these files (all in `gate_tool/js/`). They attach to the global `THREE` namespace and MUST load AFTER `three.min_086.js` but BEFORE the webpack bundle that contains `GateRenderer.js`:
- `RGBELoader.js`
- `PMREMGenerator.js`
- `PMREMCubeUVPacker.js`
- `HDRCubeTextureLoader.js`

**r86 PMREM workflow (async, in GateRenderer constructor):**
```
1. HDRCubeTextureLoader → load px/nx/py/ny/pz/nz.hdr from gate_tool/t/hdr/
2. PMREMGenerator.update(cubeMap) → generates mip levels
3. PMREMCubeUVPacker.update(pmremGenerator.cubeLods) → packs into texture
4. this._envMap = cubeUVPacker.CubeUVRenderTarget.texture
5. If a gate is already built, call updateMaterials() to retroactively apply
```

**Async race condition:** Both env map and bump map load asynchronously. `makeMat()`/`makeClipMat()` use `self._envMap || null` and `self._bumpMap || null`, so materials work without them. Once loaded, store on instance and call `updateMaterials(this._lastConfig)` to retroactively apply to existing meshes. The existing `material.needsUpdate = true` in `updateMaterials()` handles shader recompilation.

**Apply per-material:** `scene.environment` does NOT exist in r86 — must set `material.envMap` on every material individually.

**Fallback:** If HDR loading fails, use PNG cube map from `gate_tool/t/hdr/px.png, nx.png, py.png, ny.png, pz.png, nz.png` with `THREE.CubeTextureLoader`.

### 2. Per-Color envMapIntensity (NEW — not in previous spec)

Ultra sets `envMapIntensity` per color — this is how dark colors look deep/reflective and light colors look subtle. Values scraped from live tool:

| Color | envMapIntensity |
|-------|----------------|
| Textured Khaki (Beige) | 2.6 |
| Gloss Bronze | 4.0 |
| Textured Bronze (Satin Bronze) | 5.5 |
| Gloss White | 2.5 |
| Textured White (Satin White) | 2.5 |
| Gloss Black | 8.0 |
| Textured Black (Satin Black) | 9.0 |
| Silver | 5.5 |

Add `envMapIntensity` to each color definition in `configData.js`. Apply in `makeMat()`/`makeClipMat()` and `updateMaterials()`.

### 3. Bump Map

Ultra generates a 2048×2048 bump texture on a Canvas element (source likely `gate_tool/t/bm.jpg`). Per-color `bumpScale` controls intensity (0.0001 for gloss, 0.002 for heavily textured). Ultra uses `ClampToEdgeWrapping` (1001) for both wrapS and wrapT.

**Implementation (async, same pattern as env map):**
1. Load `gate_tool/t/bm.jpg` via `THREE.TextureLoader` in constructor
2. Set `texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping` (match Ultra)
3. Store as `this._bumpMap` on the renderer instance
4. On load complete: if gate already built, call `updateMaterials(this._lastConfig)` to retroactively apply
5. Apply to materials: `material.bumpMap = this._bumpMap; material.bumpScale = color.bumpScale;`
6. Update in `updateMaterials()` when color changes (bumpScale varies per color)

### 4. Lighting — Match Ultra Exactly

**Remove the directional light.** Ultra uses only:
```js
new THREE.AmbientLight(0xffffff, 0.5)
```

Our code has ambient at 0.6 + a directional. Change to match Ultra exactly.

### 5. Camera — Fix `near` Plane

Change `near` from 0.1 → 1 to match Ultra:
```js
this.camera = new THREE.PerspectiveCamera(40, 1, 1, 100);
```
Everything else (FOV=40, zoom=1.788, position, rotation) is already correct.

### 6. Material Side — FrontSide

Ultra uses `side: THREE.FrontSide` (0). Our code uses `side: THREE.DoubleSide` (2). Change to FrontSide to match. This may also slightly improve performance (fewer fragments rendered).

### 7. Fix configData.js Colors

Update `configData.js` to include `envMapIntensity` and `ao` per color, and fix Silver hex:

```js
// Each color now has: threeHex, roughness, metalness, envMapIntensity, bumpScale, ao
{ name: 'Black',        threeHex: 0x080808, roughness: 0.2, metalness: 0.2, envMapIntensity: 8.0,  bumpScale: 0.0001, ao: 1.0 },
{ name: 'Satin Black',  threeHex: 0x0C0C0C, roughness: 0.4, metalness: 0.2, envMapIntensity: 9.0,  bumpScale: 0.0015, ao: 1.0 },
{ name: 'Bronze',       threeHex: 0x42382C, roughness: 0.1, metalness: 0.3, envMapIntensity: 4.0,  bumpScale: 0.0001, ao: 0.8 },
{ name: 'Satin Bronze', threeHex: 0x42382C, roughness: 0.4, metalness: 0.3, envMapIntensity: 5.5,  bumpScale: 0.0015, ao: 0.8 },
{ name: 'White',        threeHex: 0xF8F5F6, roughness: 0.2, metalness: 0.2, envMapIntensity: 2.5,  bumpScale: 0.0001, ao: 0.5 },
{ name: 'Satin White',  threeHex: 0xF8F5F6, roughness: 0.2, metalness: 0.1, envMapIntensity: 2.5,  bumpScale: 0.002,  ao: 0.3 },
{ name: 'Beige',        threeHex: 0xCDBEAF, roughness: 0.4, metalness: 0.2, envMapIntensity: 2.6,  bumpScale: 0.002,  ao: 0.8 },
{ name: 'Silver',       threeHex: 0xFEF8F2, roughness: 0.2, metalness: 0.8, envMapIntensity: 5.5,  bumpScale: 0.0002, ao: 0.6 },
```

**Note:** Silver hex was wrong (0xc8c8c8 → 0xFEF8F2). All values now match Playwright scrape exactly.

**Note on `ao`:** The `ao` property is stored per color for future use but is NOT applied in `makeMat()` or `updateMaterials()`. Ultra has no `aoMap` attached to materials — the `ao` value may be used elsewhere in their code (possibly as a color multiplier). We capture it to maintain data fidelity but do not apply it until its purpose is confirmed.

### 8. Material Factory Update

`makeMat()` and `makeClipMat()` in `buildGate()` need:
```js
var makeMat = function() {
    return new THREE.MeshStandardMaterial({
        color: color.threeHex,
        roughness: color.roughness,
        metalness: color.metalness,
        envMap: self._envMap || null,
        envMapIntensity: color.envMapIntensity || 1.0,
        bumpMap: self._bumpMap || null,
        bumpScale: color.bumpScale || 0.0001,
        shading: THREE.FlatShading,    // KEEP — Ultra uses FlatShading
        side: THREE.FrontSide,         // Changed from DoubleSide
    });
};
```

`updateMaterials()` needs to also update `envMapIntensity`, `bumpScale`, AND assign textures (in case they loaded after initial `buildGate()`):
```js
// In the traverse callback:
if (self._envMap) child.material.envMap = self._envMap;
if (self._bumpMap) child.material.bumpMap = self._bumpMap;
child.material.envMapIntensity = color.envMapIntensity || 1.0;
child.material.bumpScale = color.bumpScale || 0.0001;
// material.needsUpdate = true (already exists in current code — handles shader recompilation)
```

---

## What We Are NOT Doing (Ultra doesn't do it)

Based on Playwright scrape, these are explicitly **removed from scope**:
- ~~4-light rig~~ → Single ambient only
- ~~Shadow maps~~ → Ultra has no shadows
- ~~Ground shadow plane~~ → Ultra has none
- ~~ACES/Uncharted2 tone mapping~~ → Ultra uses Linear (default)
- ~~Gamma correction~~ → Ultra doesn't enable it
- ~~Remove FlatShading~~ → Ultra USES FlatShading
- ~~castShadow on meshes~~ → No shadows in scene

We may add shadows/ground plane later as a Grandview enhancement beyond Ultra, but for now: **match Ultra first, then improve.**

---

## Files Modified

| File | Changes |
|------|---------|
| `GateRenderer.js` | Remove directional light, adjust ambient to 0.5, load env map + bump map, apply per-material, update makeMat/makeClipMat/updateMaterials, fix camera near, change side to FrontSide |
| `index.html` | Add `<script>` tags for RGBELoader.js, PMREMGenerator.js, PMREMCubeUVPacker.js, HDRCubeTextureLoader.js |
| `configData.js` | Add envMapIntensity + ao per color, fix Silver hex 0xc8c8c8 → 0xFEF8F2 |

---

## Validation

1. Gate matches Ultra's visual quality in side-by-side screenshot comparison
2. Different colors show distinct reflection intensity (Black=high, White=subtle)
3. Textured finishes show visible bump/grain (bumpScale 0.0015–0.002)
4. Gloss finishes appear smooth/reflective (bumpScale 0.0001)
5. Silver looks highly metallic (metalness=0.8, envMapIntensity=5.5)
6. No rendering regressions (clipping, positions, visibility)
7. Background image still visible through transparent renderer

## Risks

- **r86 PMREM pipeline**: HDRCubeTextureLoader → PMREMGenerator → PMREMCubeUVPacker is the r86-era workflow. If any script has issues, fall back to PNG cube map.
- **Script load order in index.html**: Must load after three.min_086.js.
- **Bump map canvas generation**: Ultra processes bm.jpg into a canvas. We may need to replicate this or just use bm.jpg directly as a texture (simpler, should be close enough).
- **`ao` property**: Ultra stores per-color `ao` (0.3–1.0) but no actual aoMap is applied. Stored in configData.js but not applied in materials until purpose is confirmed.
- **pixelRatio**: Ultra uses `pixelRatio: 1`, our code uses `window.devicePixelRatio`. Keeping ours — higher quality on Retina/HiDPI displays is a Grandview enhancement. This is a conscious deviation.

## Implementation Order

1. Fix camera near plane (0.1 → 1)
2. Fix lighting (remove directional, ambient 0.6 → 0.5)
3. Fix material side (DoubleSide → FrontSide)
4. Update configData.js colors (add envMapIntensity, bumpScale, ao; fix Silver hex)
5. Add `<script>` tags for HDR loaders to index.html
6. Load HDR env map via PMREM pipeline, store as `this._envMap`
7. Load bump map from bm.jpg, store as `this._bumpMap`
8. Update makeMat/makeClipMat to apply envMap + bumpMap + envMapIntensity
9. Update updateMaterials() to apply per-color envMapIntensity + bumpScale
10. Visual verification: side-by-side with Ultra (Playwright screenshot comparison)
