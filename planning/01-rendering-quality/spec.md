# Split 01: Rendering Quality — "Make It Look Real"

## Goal
Transform the 3D gate from flat/2D appearance to realistic aluminum with depth, reflection, and texture. The gate should look indistinguishable from Ultra's live tool output.

## Context
- **Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- **Primary file:** `GateRenderer.js` (18 KB, pure Three.js class)
- **Three.js version:** r86 (legacy, loaded from CDN) — some modern APIs unavailable
- **Reference:** Ultra's live tool at https://www.ultrafence.com/design-studio/gates/index.html

## What Already Exists
- `MeshStandardMaterial` with color, metalness, roughness per configData.COLORS
- AmbientLight(0xffffff, 0.6) + DirectionalLight(0xffffff, 0.8) at (-5, 10, 5)
- PerspectiveCamera with 40° FOV, 1.788 zoom, position (0.82, 1.27, 7.2)
- WebGLRenderer with antialias, alpha:true, localClippingEnabled
- Material clipping planes for posts and pickets

## What Needs To Be Done

### 1. Fix Camera FOV
Current: 40° → Target: 28° (Ultra's exact value)
```js
camera = new THREE.PerspectiveCamera(28, width/height, 1, 10000);
camera.zoom = 1.788;
camera.position.set(0.82, 1.27, 7.2);
camera.rotation.y = THREE.MathUtils.degToRad(6); // r86: THREE.Math.degToRad
camera.updateProjectionMatrix();
```

### 2. Expand Lighting Rig
Add fill + rim lights to complement existing ambient + key:
```js
// Fill light (soften shadows from opposite side)
fillLight = new DirectionalLight(0xffffff, 0.3);
fillLight.position.set(-3, 5, -5);

// Rim light (edge definition, behind/above)
rimLight = new DirectionalLight(0xffffff, 0.2);
rimLight.position.set(0, 8, -10);
```
Adjust existing ambient from 0.6 → 0.4 and key from 0.8 → 0.8 (keep).

### 3. Enable Shadow Maps
```js
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Key light must castShadow = true
// Gate meshes: castShadow = true, receiveShadow = false
// Ground plane: receiveShadow = true
```

### 4. Add Environment Map
Metals require env map for realistic reflections. Without one, metalness has nothing to reflect.
- Option A: Procedural gradient env map (simplest, no external files)
- Option B: Load HDR/cube texture from gate_tool/t/
- Note: r86 has `PMREMGenerator.js`, `HDRCubeTextureLoader.js`, `RGBELoader.js` already in `gate_tool/js/`
- Apply: `scene.environment = envMap;`

### 5. Tone Mapping + Gamma
r86 uses `gammaOutput` instead of `outputEncoding`:
```js
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.gammaOutput = true;
renderer.gammaFactor = 2.2;
```

### 6. Ground Shadow Plane
```js
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0; // at grade level
ground.receiveShadow = true;
scene.add(ground);
```

### 7. Verify PBR Material Values
Cross-check configData.COLORS against these Ultra-verified values:

| Grandview Name | Hex | Roughness | Metalness | Bump Scale |
|---------------|-----|-----------|-----------|------------|
| Black | 0x080808 | 0.2 | 0.2 | 0.0001 |
| Satin Black | 0x0c0c0c | 0.4 | 0.2 | 0.0015 |
| Bronze | 0x42382c | 0.1 | 0.3 | 0.0001 |
| Satin Bronze | 0x42382c | 0.4 | 0.3 | 0.0015 |
| White | 0xF8F5F6 | 0.2 | 0.2 | 0.0001 |
| Satin White | 0xF8F5F6 | 0.2 | 0.1 | 0.002 |
| Beige | 0xcdbeaf | 0.4 | 0.2 | 0.002 |
| Forest Green | ~0x2d4a2d | 0.3 | 0.2 | 0.001 |
| Silver | 0xFEF8F2 | 0.2 | 0.8 | 0.0002 |

Bump scale may require bump map texture — if unavailable, skip bump and rely on roughness/metalness for visual quality.

## Validation Criteria
- [ ] Gate appears 3D with visible depth and metallic sheen
- [ ] Shadows cast onto ground plane
- [ ] Different colors show distinct gloss/satin differences
- [ ] Side-by-side screenshot comparison with Ultra's tool shows similar quality
- [ ] Camera angle matches Ultra's default view

## Constraints
- Three.js r86: Use `gammaOutput`/`gammaFactor`, not `outputEncoding`/`sRGBEncoding`
- Use `THREE.Math.degToRad()` not `THREE.MathUtils.degToRad()` (r86)
- Don't break existing clipping planes or model transforms
- Keep renderer alpha:true (transparent background composited over bg image)

## Dependencies
- None — this is the foundation split.
- Output: Realistic-looking 3D gate that all subsequent splits build upon.
