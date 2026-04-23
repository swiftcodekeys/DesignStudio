# Rendering Quality Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 3D gate look realistic by matching Ultra's actual rendering pipeline — PMREM env map, per-color envMapIntensity, bump map, and exact lighting/camera/material settings.

**Architecture:** All changes are in GateRenderer.js (renderer), configData.js (color data), and index.html (script tags). The env map and bump map load asynchronously in the constructor and retroactively apply to materials when ready. No new components or architectural changes.

**Tech Stack:** Three.js r86 (legacy, CDN), MeshStandardMaterial, HDRCubeTextureLoader + PMREMGenerator + PMREMCubeUVPacker (all r86-era scripts in gate_tool/js/)

**Data Source:** All values scraped from Ultra's live tool via Playwright on 2026-03-17. Saved to `planning/ultra-live-scrape-2026-03-17.json`. Design spec at `docs/superpowers/specs/2026-03-17-rendering-quality-design.md`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `configData.js` | Modify lines 8-17 | Add envMapIntensity, bumpScale, ao per color; fix Silver hex |
| `GateRenderer.js` | Modify | Remove directional light, fix ambient, fix camera near, fix material side, load env map + bump map, update material factories |
| `index.html` | Modify line 7 | Add `<script>` tags for 4 HDR loader scripts after Three.js |

---

### Task 1: Update configData.js Color Definitions

**Files:**
- Modify: `configData.js:8-17`

- [ ] **Step 1: Update COLORS array with Playwright-scraped values**

Replace the COLORS array with values scraped from Ultra's live `window.clrs` array. Each color now includes `envMapIntensity`, `bumpScale`, and `ao`.

```js
export var COLORS = [
  { id: 0, name: 'Textured Khaki',   hex: '#cdbeaf', threeHex: 0xcdbeaf, metalness: 0.2, roughness: 0.4, envMapIntensity: 2.6, bumpScale: 0.002,  ao: 0.8 },
  { id: 1, name: 'Gloss Bronze',     hex: '#42382c', threeHex: 0x42382c, metalness: 0.3, roughness: 0.1, envMapIntensity: 4.0, bumpScale: 0.0001, ao: 0.8 },
  { id: 2, name: 'Textured Bronze',  hex: '#42382c', threeHex: 0x42382c, metalness: 0.3, roughness: 0.4, envMapIntensity: 5.5, bumpScale: 0.0015, ao: 0.8 },
  { id: 3, name: 'Gloss White',      hex: '#f4f4f4', threeHex: 0xF8F5F6, metalness: 0.2, roughness: 0.2, envMapIntensity: 2.5, bumpScale: 0.0001, ao: 0.5 },
  { id: 4, name: 'Textured White',   hex: '#f2f2f2', threeHex: 0xF8F5F6, metalness: 0.1, roughness: 0.2, envMapIntensity: 2.5, bumpScale: 0.002,  ao: 0.3 },
  { id: 5, name: 'Gloss Black',      hex: '#090909', threeHex: 0x080808, metalness: 0.2, roughness: 0.2, envMapIntensity: 8.0, bumpScale: 0.0001, ao: 1.0 },
  { id: 6, name: 'Textured Black',   hex: '#0c0c0c', threeHex: 0x0c0c0c, metalness: 0.2, roughness: 0.4, envMapIntensity: 9.0, bumpScale: 0.0015, ao: 1.0 },
  { id: 7, name: 'Silver',           hex: '#c8c8c8', threeHex: 0xFEF8F2, metalness: 0.8, roughness: 0.2, envMapIntensity: 5.5, bumpScale: 0.0002, ao: 0.6 },
];
```

Key changes: Silver threeHex fixed (0xc8c8c8 → 0xFEF8F2), envMapIntensity/bumpScale/ao added to all.

- [ ] **Step 2: Verify the app still loads**

Run: `npm start`
Expected: App loads on port 3000, gate still renders (no env map yet but no errors).

- [ ] **Step 3: Commit**

```bash
git add configData.js
git commit -m "feat: add per-color envMapIntensity, bumpScale, ao from Ultra scrape; fix Silver hex"
```

---

### Task 2: Fix Camera, Lighting, and Material Side

**Files:**
- Modify: `GateRenderer.js:42` (camera near), `GateRenderer.js:57-61` (lighting), `GateRenderer.js:183-184` (material side)

- [ ] **Step 1: Fix camera near plane**

In the constructor, change the camera `near` from `0.1` to `1` to match Ultra:

```js
// Line 42 — change:
this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
// to:
this.camera = new THREE.PerspectiveCamera(40, 1, 1, 100);
```

- [ ] **Step 2: Fix lighting — remove directional, adjust ambient**

Replace the current 2-light setup (lines 57-61) with Ultra's single ambient:

```js
// Replace:
this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(-5, 10, 5);
this.scene.add(dirLight);

// With:
this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
```

- [ ] **Step 3: Fix material side in makeMat and makeClipMat**

In `buildGate()`, change `side: THREE.DoubleSide` to `side: THREE.FrontSide` in both `makeMat()` and `makeClipMat()`:

```js
// In makeMat() — change:
side: THREE.DoubleSide,
// to:
side: THREE.FrontSide,

// Same change in makeClipMat()
```

- [ ] **Step 4: Verify the app still renders**

Run: `npm start`
Expected: Gate renders. It will look slightly different (darker without directional light) but should still be correct geometry. No errors in console.

- [ ] **Step 5: Commit**

```bash
git add GateRenderer.js
git commit -m "fix: match Ultra camera/lighting/material — near=1, ambient=0.5, FrontSide, remove directional"
```

---

### Task 3: Add HDR Loader Script Tags

**Files:**
- Modify: `index.html:7`

- [ ] **Step 1: Add script tags after Three.js**

Add 4 `<script>` tags for the r86-era HDR loaders. These MUST load after Three.js (they attach to `window.THREE`). Add them right after the Three.js CDN script:

```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/86/three.min.js"></script>
  <script src="gate_tool/js/RGBELoader.js"></script>
  <script src="gate_tool/js/PMREMGenerator.js"></script>
  <script src="gate_tool/js/PMREMCubeUVPacker.js"></script>
  <script src="gate_tool/js/HDRCubeTextureLoader.js"></script>
```

- [ ] **Step 2: Verify scripts load without errors**

Run: `npm start`
Open browser console. Expected: No script loading errors. `THREE.HDRCubeTextureLoader` should exist on the global THREE namespace.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: add HDR/PMREM loader scripts for environment map support"
```

---

### Task 4: Load Environment Map via PMREM Pipeline

**Files:**
- Modify: `GateRenderer.js` (constructor, add env map loading)

- [ ] **Step 1: Add env map loading to constructor**

After the gate group creation (after line 79), add the async HDR env map loading. This uses the r86 PMREM workflow: HDRCubeTextureLoader → PMREMGenerator → PMREMCubeUVPacker.

```js
    // Environment map — PMREM-processed HDR (matches Ultra exactly)
    this._envMap = null;
    this._bumpMap = null;
    var self = this;

    // Load HDR cube map
    // NOTE: r86 HDRCubeTextureLoader has NO .setPath() method — must use full paths.
    // Also, loadHDRData has a `this.manager` binding quirk (uses undefined, falls back
    // to DefaultLoadingManager) — this is expected and not a bug.
    var hdrPaths = [
        'gate_tool/t/hdr/px.hdr', 'gate_tool/t/hdr/nx.hdr',
        'gate_tool/t/hdr/py.hdr', 'gate_tool/t/hdr/ny.hdr',
        'gate_tool/t/hdr/pz.hdr', 'gate_tool/t/hdr/nz.hdr'
    ];
    if (THREE.HDRCubeTextureLoader) {
        new THREE.HDRCubeTextureLoader()
            .load(THREE.UnsignedByteType, hdrPaths, function(hdrCubeMap) {
                var pmremGenerator = new THREE.PMREMGenerator(hdrCubeMap);
                pmremGenerator.update(self.renderer);

                var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods, pmremGenerator.numLods);
                pmremCubeUVPacker.update(self.renderer);

                self._envMap = pmremCubeUVPacker.CubeUVRenderTarget.texture;

                // Retroactively apply to existing materials
                if (self._lastConfig) {
                    self.updateMaterials(self._lastConfig);
                }

                // Clean up
                pmremGenerator.dispose();
                pmremCubeUVPacker.dispose();
            }, undefined, function(err) {
                // HDR failed — fall back to PNG cube map
                console.warn('HDR env map failed, falling back to PNG:', err);
                var loader = new THREE.CubeTextureLoader();
                loader.setPath('gate_tool/t/hdr/');
                loader.setPath('gate_tool/t/hdr/');
                loader.load(['px.png','nx.png','py.png','ny.png','pz.png','nz.png'], function(cubeMap) {
                    self._envMap = cubeMap;
                    if (self._lastConfig) {
                        self.updateMaterials(self._lastConfig);
                    }
                });
            });
    }
```

**Note:** The `HDRCubeTextureLoader` API in r86 may differ from later versions. The signature is `.load(type, urls, onLoad, onProgress, onError)`. If the above doesn't work, check `gate_tool/js/HDRCubeTextureLoader.js` for the exact API and adjust.

- [ ] **Step 2: Verify env map loads in browser console**

Run: `npm start`
Open console. Expected: No errors. To verify, add a temporary `console.log('ENV MAP LOADED', self._envMap)` inside the onLoad callback. The gate won't look different yet (materials don't use it yet).

- [ ] **Step 3: Commit**

```bash
git add GateRenderer.js
git commit -m "feat: load PMREM HDR environment map with PNG fallback"
```

---

### Task 5: Load Bump Map

**Files:**
- Modify: `GateRenderer.js` (constructor, add bump map loading)

- [ ] **Step 1: Add bump map loading after env map code**

```js
    // Load bump map (Ultra uses bm.jpg at 2048x2048, ClampToEdgeWrapping)
    var texLoader = new THREE.TextureLoader();
    texLoader.load('gate_tool/t/bm.jpg', function(texture) {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        self._bumpMap = texture;

        // Retroactively apply to existing materials
        if (self._lastConfig) {
            self.updateMaterials(self._lastConfig);
        }
    });
```

- [ ] **Step 2: Verify bump map loads**

Run: `npm start`
Console should show no errors. Add temporary `console.log('BUMP MAP LOADED')` in callback if needed.

- [ ] **Step 3: Commit**

```bash
git add GateRenderer.js
git commit -m "feat: load bump map texture from bm.jpg"
```

---

### Task 6: Apply Env Map + Bump Map to Material Factories

**Files:**
- Modify: `GateRenderer.js` — `makeMat()`, `makeClipMat()`, `updateMaterials()`

- [ ] **Step 1: Update makeMat() to include envMap, bumpMap, envMapIntensity**

Replace the current `makeMat` function in `buildGate()`:

```js
    var makeMat = function() {
        return new THREE.MeshStandardMaterial({
            color: color.threeHex,
            roughness: color.roughness !== undefined ? color.roughness : 0.1,
            metalness: color.metalness !== undefined ? color.metalness : 0.9,
            envMap: self._envMap || null,
            envMapIntensity: color.envMapIntensity || 1.0,
            bumpMap: self._bumpMap || null,
            bumpScale: color.bumpScale || 0.0001,
            shading: THREE.FlatShading,
            side: THREE.FrontSide,
        });
    };
```

- [ ] **Step 2: Update makeClipMat() similarly**

```js
    var makeClipMat = function(plane) {
        return new THREE.MeshStandardMaterial({
            color: color.threeHex,
            roughness: color.roughness !== undefined ? color.roughness : 0.1,
            metalness: color.metalness !== undefined ? color.metalness : 0.9,
            envMap: self._envMap || null,
            envMapIntensity: color.envMapIntensity || 1.0,
            bumpMap: self._bumpMap || null,
            bumpScale: color.bumpScale || 0.0001,
            shading: THREE.FlatShading,
            side: THREE.FrontSide,
            clippingPlanes: [plane],
        });
    };
```

- [ ] **Step 3: Add `self` reference at top of buildGate**

Add `var self = this;` near the top of `buildGate()` (after `var THREE = window.THREE;`) so the material factories can access `this._envMap` and `this._bumpMap`.

- [ ] **Step 4: Update updateMaterials() to apply textures and per-color intensity**

Replace the current `updateMaterials` method:

```js
GateRenderer.prototype.updateMaterials = function(config) {
    var THREE = window.THREE;
    var color = config.color || { threeHex: 0x080808, metalness: 0.9, roughness: 0.1 };
    var gate = this.gate;
    var self = this;

    gate.traverse(function(child) {
        if (child.isMesh && child.material) {
            child.material.color.setHex(color.threeHex);
            if (color.metalness !== undefined) child.material.metalness = color.metalness;
            if (color.roughness !== undefined) child.material.roughness = color.roughness;
            // Env map (may have loaded after initial buildGate)
            if (self._envMap) child.material.envMap = self._envMap;
            child.material.envMapIntensity = color.envMapIntensity || 1.0;
            // Bump map (may have loaded after initial buildGate)
            if (self._bumpMap) child.material.bumpMap = self._bumpMap;
            child.material.bumpScale = color.bumpScale || 0.0001;
            child.material.needsUpdate = true;
        }
    });
};
```

- [ ] **Step 5: Verify in browser — gate should now look DRAMATICALLY different**

Run: `npm start`
Expected: The gate should now show metallic reflections from the HDR environment map. Switching colors should show different reflection intensities (Black = very reflective, White = subtle). Textured finishes should show slight surface texture from the bump map.

**If env map doesn't show:** Check console for errors. Verify `self._envMap` is set by adding `console.log('envMap:', self._envMap)` in makeMat(). The most common issue is the HDRCubeTextureLoader API signature being different — check `gate_tool/js/HDRCubeTextureLoader.js` source.

- [ ] **Step 6: Commit**

```bash
git add GateRenderer.js
git commit -m "feat: apply PMREM env map + bump map to all materials with per-color envMapIntensity"
```

---

### Task 7: Add Texture Cleanup to dispose()

**Files:**
- Modify: `GateRenderer.js` — `dispose()` method

- [ ] **Step 1: Update dispose to clean up textures**

Add env map and bump map disposal to prevent GPU memory leaks:

```js
GateRenderer.prototype.dispose = function() {
    if (this._animId) cancelAnimationFrame(this._animId);
    if (this._envMap) this._envMap.dispose();
    if (this._bumpMap) this._bumpMap.dispose();
    if (this._container && this.renderer.domElement) {
        this._container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
};
```

- [ ] **Step 2: Commit**

```bash
git add GateRenderer.js
git commit -m "fix: dispose env map and bump map textures to prevent GPU memory leaks"
```

---

### Task 8: Visual Verification Against Ultra

**Files:** None (validation only)

- [ ] **Step 1: Open both tools side by side**

Open Ultra's tool: https://www.ultrafence.com/design-studio/gates/index.html
Open Grandview: http://localhost:3000

Set both to the same style (e.g., UAS-100 Charleston / Textured Bronze).

- [ ] **Step 2: Compare visual quality**

Check:
- Do metallic surfaces show reflections?
- Does Gloss Black look deep and reflective?
- Does Textured Bronze show surface texture?
- Do color switches produce visually distinct results?
- Is the overall "feel" similar to Ultra's?

- [ ] **Step 3: If env map loading failed, debug the PMREM pipeline**

Check `gate_tool/js/HDRCubeTextureLoader.js` for the actual API. The r86-era API may use a different signature than what we assumed. Common variations:
- `.load(urls, onLoad, onProgress, onError)` (no type parameter)
- Constructor takes renderer: `new THREE.HDRCubeTextureLoader(renderer)`
- The paths array may need the full path, not just filename

Read the first 50 lines of `gate_tool/js/HDRCubeTextureLoader.js` to check the constructor and `.load()` signature. Adjust Task 4 code accordingly.

- [ ] **Step 4: If PNG fallback is needed, verify it works**

If HDR fails, the fallback `CubeTextureLoader` with PNG files should kick in automatically. Verify by checking console for the "HDR env map failed, falling back to PNG" warning message. The PNG cube map gives lower dynamic range but still provides reflections.

- [ ] **Step 5: Take comparison screenshots and note any remaining differences**

Document: what matches Ultra and what doesn't. Any remaining visual gaps become items for future work.

---

## Quick Reference: Ultra's Actual Values (Playwright-Scraped)

```
Camera:    PerspectiveCamera(40, w/h, 1, 100), zoom=1.788, pos(0.82,1.27,7.2), rot.y=6°
Lighting:  AmbientLight(0xffffff, 0.5) — ONLY LIGHT
Material:  MeshStandardMaterial, FlatShading, FrontSide, envMap=PMREM HDR
Renderer:  No shadows, no tone mapping, no gamma, alpha=true, pixelRatio=1
EnvMap:    CubeUVReflectionMapping (306), PMREM-processed from HDR
BumpMap:   2048×2048, ClampToEdgeWrapping, from bm.jpg
Colors:    envMapIntensity ranges 2.5 (whites) to 9.0 (textured black)
```
