# Performance & Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve perceived performance (faster loads, smoother style switches) and fix UX pain points across 4 sequential phases — without touching verified spatial rendering math.

**Architecture:** Phase 1 adds a dirty-flag render loop, loading overlay, XSS fix, and ContactPopup UX. Phase 2 adds material/geometry caching and swap-when-ready transitions. Phase 3 cleans up diffing, magic numbers, and localStorage thrashing. Phase 4 tackles Context API and config merging.

**Tech Stack:** React (var/useState pattern, no hooks syntax), Three.js r86, Webpack, vanilla CSS

**Branch:** `feat/performance-and-polish`

**CRITICAL — Never touch:**
- Any value in `spatialConstants.js` or `SPATIAL_TRUTH.json`
- PBR values (roughness, metalness, bumpScale, envMapIntensity) in GateRenderer.js
- `gate_tool/js/ultra_dsg_min.js`
- Clip plane constants (CLIP_POST, CLIP_PO23, CLIP_PT, CLIP_PB)
- Finial/accent position arrays

---

## Phase 1 — Quick Wins

### Task 1: Dirty-flag render loop (`GateRenderer.js`)

**Files:**
- Modify: `GateRenderer.js`

**What:** The animate loop calls `renderer.render()` 60fps unconditionally. Add a `_needsRender` flag so render only fires when something changed.

- [ ] **Step 1: Add `_needsRender` flag to constructor**

In `GateRenderer.js`, after the line `this._lastConfig = null;` (around line 37), add:

```javascript
this._needsRender = true;
```

- [ ] **Step 2: Update the animate loop to check the flag**

Find the animate loop (lines 152–155):
```javascript
(function animate() {
    self._animId = requestAnimationFrame(animate);
    self.renderer.render(self.scene, self.camera);
})();
```

Replace with:
```javascript
(function animate() {
    self._animId = requestAnimationFrame(animate);
    if (self._needsRender) {
        self._needsRender = false;
        self.renderer.render(self.scene, self.camera);
    }
})();
```

- [ ] **Step 3: Set flag in `resize()`**

Find `GateRenderer.prototype.resize` (line 158). Add `this._needsRender = true;` as the last line:

```javascript
GateRenderer.prototype.resize = function(w, h) {
    this.camera.aspect = w / h;
    this.camera.zoom = 1.788;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this._needsRender = true;
};
```

- [ ] **Step 4: Set flag at start of `buildGate()`**

Find `GateRenderer.prototype.buildGate` (search for `GateRenderer.prototype.buildGate`). Add as the very first line of the function body:

```javascript
this._needsRender = true;
```

- [ ] **Step 5: Set flag in `updateMaterials()`**

Find `GateRenderer.prototype.updateMaterials`. Add as the very first line:

```javascript
this._needsRender = true;
```

- [ ] **Step 6: Set flag in `buildFence()` if it exists**

Search for `GateRenderer.prototype.buildFence`. If found, add `this._needsRender = true;` as the first line.

- [ ] **Step 7: Keep the `gv:request-render` event handler working**

The existing `_onRequestRender` handler (line 142–148) calls `renderer.render()` directly — this is intentional for snapshot capture. Leave it unchanged.

- [ ] **Step 8: Build and verify**

```bash
cd "C:/Users/sarah/Desktop/App Repos/fence-tool"
npx webpack --mode development 2>&1 | tail -5
```

Open the app. Switch between gate styles — should still render correctly. Open browser DevTools Performance tab, record 5 seconds of idle (not clicking anything). CPU should be near 0% during idle.

- [ ] **Step 9: Commit**

```bash
git add GateRenderer.js
git commit -m "perf: dirty-flag render loop — skip render when scene is idle"
```

---

### Task 2: Loading overlay (`GateRenderer.js`, `UnifiedCanvas.js`)

**Files:**
- Modify: `GateRenderer.js`
- Modify: `UnifiedCanvas.js`

**What:** Show a spinner overlay while 3D models load. GateRenderer calls `onLoading`/`onReady` callbacks; UnifiedCanvas renders the overlay.

- [ ] **Step 1: Add callback props to GateRenderer constructor**

In the GateRenderer constructor, after `this._lastConfig = null;`, add:

```javascript
this._onLoading = null;
this._onReady = null;
this._pendingLoads = 0;
```

- [ ] **Step 2: Add `_loadGeo` helper method**

After `GateRenderer.prototype.dispose`, add a new method:

```javascript
GateRenderer.prototype._loadGeo = function(path, callback) {
    var self = this;
    var THREE = window.THREE;
    self._pendingLoads++;
    var loader = new THREE.JSONLoader();
    loader.load(path, function(geo) {
        self._pendingLoads--;
        callback(geo);
        if (self._pendingLoads === 0) {
            self._needsRender = true;
            if (self._onReady) self._onReady();
        }
    });
};
```

- [ ] **Step 3: Call `onLoading` at the start of `buildGate`**

At the very start of `GateRenderer.prototype.buildGate` (after the `this._needsRender = true` line added in Task 1), add:

```javascript
this._pendingLoads = 0;
if (this._onLoading) this._onLoading();
```

- [ ] **Step 4: Replace all `loader.load()` calls inside `buildGate` with `self._loadGeo()`**

Inside `buildGate`, find the line:
```javascript
var loader = new THREE.JSONLoader();
```
Delete it.

Then replace every occurrence of:
```javascript
loader.load(somePath, function(geo) {
```
with:
```javascript
self._loadGeo(somePath, function(geo) {
```

There will be many such calls (one per model file). Replace all of them within `buildGate`. Do the same inside `buildFence` if it exists and uses `loader.load`.

- [ ] **Step 5: Handle edge case — zero models**

After the `if (this._onLoading) this._onLoading();` line, add a guard for the case where no loads are triggered (e.g., empty config):

```javascript
// Will be decremented by _loadGeo; guard against zero-load configs
var self = this;
setTimeout(function() {
    if (self._pendingLoads === 0 && self._onReady) self._onReady();
}, 0);
```

- [ ] **Step 6: Add `isLoading` state to `UnifiedCanvas.js`**

In `UnifiedCanvas.js`, find where other state variables are declared near the top of the component. Add:

```javascript
var loadingState = useState(false);
var isLoading = loadingState[0];
var setIsLoading = loadingState[1];
```

- [ ] **Step 7: Wire callbacks when creating the renderer**

In `UnifiedCanvas.js`, find where `new GateRenderer(container)` is called. After that line, add:

```javascript
r._onLoading = function() { setIsLoading(true); };
r._onReady = function() { setIsLoading(false); };
```

- [ ] **Step 8: Render the spinner overlay**

In `UnifiedCanvas.js`, find the return statement for 3D mode. Wrap the existing canvas container with a relative-positioned wrapper and add the overlay:

```jsx
<div style={{ position: 'relative', width: '100%', height: '100%' }}>
  <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  {isLoading && (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.15)',
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(255,255,255,0.3)',
        borderTopColor: '#6BA3C2',
        borderRadius: '50%',
        animation: 'gv-spin 0.8s linear infinite',
      }} />
    </div>
  )}
</div>
```

- [ ] **Step 9: Add spin keyframe to `styles.css`**

At the end of `styles.css`, add:

```css
@keyframes gv-spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 10: Build and verify**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Open the app. Switch gate styles — a blue spinner should appear briefly, then fade away when models finish loading.

- [ ] **Step 11: Commit**

```bash
git add GateRenderer.js UnifiedCanvas.js styles.css
git commit -m "feat: loading overlay while 3D gate models load"
```

---

### Task 3: Fix `dangerouslySetInnerHTML` in `SocialProof.js`

**Files:**
- Modify: `SocialProof.js`

**What:** Replace raw HTML injection with safe JSX rendering. Messages with `<strong>` tags become React elements; HTML entities become Unicode.

- [ ] **Step 1: Update the MESSAGES array — replace HTML entities with Unicode**

Replace the current `MESSAGES` array with:

```javascript
var MESSAGES = [
    ['Most chosen this month: ', 'Charleston', ' in Satin Black'],
    ['Top seller for pool safety: ', 'Haven', ' in Black'],
    ['', 'Charleston Pro', ' | best for pet owners'],
    'Estate arch is the most requested upgrade',
    'Veteran-owned & American-made',
    'Limited Lifetime Warranty on all panels',
    'Pool code compliant in all 50 states',
    'Aluminum won’t rust, rot, or need repainting',
    ['', 'ProCoat', ' powder coat finish rated to AAMA 2604'],
    ['Most popular pairing: ', 'Horizon', ' + Ball Post Caps in Bronze'],
    'Contractors: call for volume pricing',
    'Design your gate in under 2 minutes',
];
```

Arrays are `[before, boldText, after]`. Plain strings have no bold.

- [ ] **Step 2: Add a `renderMessage` helper**

After the MESSAGES array, add:

```javascript
function renderMessage(msg) {
    if (typeof msg === 'string') return msg;
    return [
        msg[0],
        React.createElement('strong', { key: 'b' }, msg[1]),
        msg[2],
    ];
}
```

- [ ] **Step 3: Update the return statement**

Replace:
```jsx
<div
    className="social-proof-pill"
    key={index}
    dangerouslySetInnerHTML={{ __html: MESSAGES[index] }}
/>
```

With:
```jsx
<div className="social-proof-pill" key={index}>
    {renderMessage(MESSAGES[index])}
</div>
```

- [ ] **Step 4: Build and visually verify**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Open the app. Wait 15 seconds per message cycle and confirm all 12 messages display correctly — bold text is bold, ampersands show as `&`, apostrophe in `won't` is correct.

- [ ] **Step 5: Commit**

```bash
git add SocialProof.js
git commit -m "fix: replace dangerouslySetInnerHTML in SocialProof with safe JSX"
```

---

### Task 4: ContactPopup UX fixes (`ContactPopup.js`)

**Files:**
- Modify: `ContactPopup.js`

**What:** Remove dead GAS_ENDPOINT check, add cooldown countdown, auto-close success, phone formatting.

- [ ] **Step 1: Remove the dead `GAS_ENDPOINT` check**

Find and delete lines 64–68:
```javascript
if (!GAS_ENDPOINT) {
  setStatus('error');
  setErrorMsg('not-configured');
  return;
}
```
The `postToEmailWorker` call below handles its own endpoint via `emailWorkerClient`. This check references an undefined variable and crashes on every submit.

- [ ] **Step 2: Replace boolean `cooldown` state with numeric countdown**

Replace the two cooldown state lines:
```javascript
var cooldownState = useState(false);
var cooldown = cooldownState[0];
var setCooldown = cooldownState[1];
```

With:
```javascript
var cooldownState = useState(0);
var cooldown = cooldownState[0];
var setCooldown = cooldownState[1];
```

`cooldown` is now a number (seconds remaining). `0` means not in cooldown.

- [ ] **Step 3: Add countdown useEffect**

After all the `useState` calls, add (before the `if (!isOpen) return null;` line):

```javascript
useEffect(function() {
    if (cooldown <= 0) return;
    var t = setTimeout(function() { setCooldown(function(s) { return Math.max(0, s - 1); }); }, 1000);
    return function() { clearTimeout(t); };
}, [cooldown]);
```

- [ ] **Step 4: Update the submit handler to start countdown at 30**

Find in `handleSubmit`:
```javascript
setCooldown(true);
setTimeout(function() { setCooldown(false); }, 30000);
```

Replace with:
```javascript
setCooldown(30);
```

The useEffect from Step 3 handles the countdown automatically.

- [ ] **Step 5: Add auto-close for success state**

After the cooldown useEffect, add:

```javascript
useEffect(function() {
    if (status !== 'success') return;
    var t = setTimeout(function() { onClose(); }, 3000);
    return function() { clearTimeout(t); };
}, [status]);
```

- [ ] **Step 6: Update button label to show countdown**

Find the button label:
```javascript
{status === 'sending' ? 'Sending...' : cooldown ? 'Sent, wait 30s' : 'Send Message'}
```

Replace with:
```javascript
{status === 'sending' ? 'Sending...' : cooldown > 0 ? 'Try again in ' + cooldown + 's…' : 'Send Message'}
```

- [ ] **Step 7: Update button disabled condition**

Find:
```javascript
disabled={!isValid || status === 'sending' || cooldown}
```

Replace with:
```javascript
disabled={!isValid || status === 'sending' || cooldown > 0}
```

- [ ] **Step 8: Add phone formatting on blur**

Find the phone `<input>` element. Add an `onBlur` handler:

```jsx
onBlur={function(e) {
    var digits = e.target.value.replace(/\D/g, '');
    if (digits.length === 10) {
        setPhone('(' + digits.slice(0,3) + ') ' + digits.slice(3,6) + '-' + digits.slice(6));
    } else if (digits.length === 11 && digits[0] === '1') {
        setPhone('(' + digits.slice(1,4) + ') ' + digits.slice(4,7) + '-' + digits.slice(7));
    }
}}
```

- [ ] **Step 9: Build and verify**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Test:
1. Open contact form, submit — no crash, form submits via Cloudflare worker
2. After success, modal closes after ~3 seconds
3. Button shows "Try again in 29s…" counting down
4. Enter `8005551234` in phone field, tab out — formats to `(800) 555-1234`

- [ ] **Step 10: Commit**

```bash
git add ContactPopup.js
git commit -m "fix: ContactPopup — remove dead GAS_ENDPOINT check, countdown cooldown, auto-close success, phone formatting"
```

---

## Phase 2 — Renderer Performance

### Task 5: Material caching by color ID (`GateRenderer.js`)

**Files:**
- Modify: `GateRenderer.js`

**What:** Cache `MeshStandardMaterial` instances by color ID. Same color across style switches = zero material allocation.

- [ ] **Step 1: Add `_matCache` to constructor**

In the constructor, after `this._lastConfig = null;`:

```javascript
this._matCache = {};
```

- [ ] **Step 2: Update `dispose()` to clear the cache**

In `GateRenderer.prototype.dispose`, before `this.renderer.dispose()`, add:

```javascript
var self = this;
Object.keys(this._matCache).forEach(function(k) {
    self._matCache[k].dispose();
});
this._matCache = {};
```

- [ ] **Step 3: Update `makeMat()` inside `buildGate` to use cache**

Find the `makeMat` function definition inside `buildGate`:
```javascript
var makeMat = function() {
    return new THREE.MeshStandardMaterial({
        color: color.threeHex,
        ...
    });
};
```

Replace with:
```javascript
var makeMat = function() {
    var cacheKey = 'base_' + (color.id || color.threeHex);
    if (self._matCache[cacheKey]) return self._matCache[cacheKey];
    var mat = new THREE.MeshStandardMaterial({
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
    self._matCache[cacheKey] = mat;
    return mat;
};
```

- [ ] **Step 4: Update `makeClipMat()` inside `buildGate` to use cache**

Find `makeClipMat` definition:
```javascript
var makeClipMat = function(plane) {
    return new THREE.MeshStandardMaterial({...clippingPlanes: [plane]...});
};
```

Replace with:
```javascript
var makeClipMat = function(plane, planeKey) {
    var cacheKey = 'clip_' + planeKey + '_' + (color.id || color.threeHex);
    if (self._matCache[cacheKey]) return self._matCache[cacheKey];
    var mat = new THREE.MeshStandardMaterial({
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
    self._matCache[cacheKey] = mat;
    return mat;
};
```

- [ ] **Step 5: Update all `makeClipMat(plane)` call sites to pass a key**

Search `buildGate` for every call to `makeClipMat(`. Each call passes one of the clip planes. Add a string key matching the plane:

| Call site | Old | New |
|-----------|-----|-----|
| post clip | `makeClipMat(clips.post)` | `makeClipMat(clips.post, 'post')` |
| post23 clip | `makeClipMat(clips.post23)` | `makeClipMat(clips.post23, 'post23')` |
| pt clip | `makeClipMat(clips.pt)` | `makeClipMat(clips.pt, 'pt')` |
| pb clip | `makeClipMat(clips.pb)` | `makeClipMat(clips.pb, 'pb')` |
| pbRes clip | `makeClipMat(clips.pbRes)` | `makeClipMat(clips.pbRes, 'pbRes')` |

- [ ] **Step 6: Invalidate cache on color change in `updateMaterials`**

Find `GateRenderer.prototype.updateMaterials`. At the start, add:

```javascript
this._matCache = {};
```

This ensures a color switch rebuilds materials with the new color values.

- [ ] **Step 7: Build and test all 9 colors**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Switch through all 9 colors (Black, Satin Black, Bronze, Satin Bronze, Beige, Satin Khaki, White, Satin White, Forest Green). Each should render correctly with proper PBR appearance.

- [ ] **Step 8: Commit**

```bash
git add GateRenderer.js
git commit -m "perf: cache MeshStandardMaterial by color ID — skip allocation on style switch"
```

---

### Task 6: Model geometry caching (`GateRenderer.js`)

**Files:**
- Modify: `GateRenderer.js`

**What:** Cache parsed JSON geometries in memory. Style switches clone from cache instead of re-loading from disk.

- [ ] **Step 1: Add `_geoCache` to constructor**

After `this._matCache = {};`:

```javascript
this._geoCache = {};
```

- [ ] **Step 2: Add `_loadGeo` helper method** (if not already added in Task 2)

After `GateRenderer.prototype.dispose`, add:

```javascript
GateRenderer.prototype._loadGeo = function(path, callback) {
    var self = this;
    var THREE = window.THREE;
    if (self._geoCache[path]) {
        // Clone to avoid sharing geometry between scenes
        callback(self._geoCache[path].clone());
        self._pendingLoads--;
        if (self._pendingLoads === 0) {
            self._needsRender = true;
            if (self._onReady) self._onReady();
        }
        return;
    }
    var loader = new THREE.JSONLoader();
    loader.load(path, function(geo) {
        self._geoCache[path] = geo;
        self._pendingLoads--;
        callback(geo.clone());
        if (self._pendingLoads === 0) {
            self._needsRender = true;
            if (self._onReady) self._onReady();
        }
    });
};
```

**Note:** If Task 2 already added `_loadGeo`, update it to include the cache check shown above.

- [ ] **Step 3: Delete the `var loader = new THREE.JSONLoader()` line inside `buildGate`**

Find and remove:
```javascript
var loader = new THREE.JSONLoader();
```

- [ ] **Step 4: Replace all `loader.load(path, fn)` calls with `self._loadGeo(path, fn)`**

Inside `buildGate`, replace every:
```javascript
loader.load(somePath, function(geo) {
```
with:
```javascript
self._pendingLoads++;
self._loadGeo(somePath, function(geo) {
```

There are many such calls. Replace all of them. Do the same in `buildFence` if it uses `loader.load`.

- [ ] **Step 5: Clear geometry cache on dispose**

In `GateRenderer.prototype.dispose`, after clearing `_matCache`, add:

```javascript
Object.keys(this._geoCache).forEach(function(k) {
    self._geoCache[k].dispose();
});
this._geoCache = {};
```

- [ ] **Step 6: Build and test all 7 styles**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Switch through all 7 styles: Horizon, Horizon Pro, Charleston, Charleston Pro, Vanguard, Haven, Savannah. On the second visit to each style, the switch should be noticeably faster (no disk reads). Verify all styles render correctly.

- [ ] **Step 7: Commit**

```bash
git add GateRenderer.js
git commit -m "perf: geometry caching — clone from memory on style switch, skip JSONLoader re-load"
```

---

### Task 7: Swap-when-ready scene transition (`GateRenderer.js`)

**Files:**
- Modify: `GateRenderer.js`

**What:** Build the new gate into a staging group while the old one stays visible. Swap in one frame when all models resolve. Eliminates the blank-canvas flash on style switch.

- [ ] **Step 1: Add staging group to constructor**

In the constructor, after `this.gate = new THREE.Object3D();`:

```javascript
this._stagingGate = null;
this._isBuilding = false;
```

- [ ] **Step 2: Update `buildGate` to build into a staging group**

At the start of `GateRenderer.prototype.buildGate` (after the existing `this._needsRender = true` and loading callback lines), add:

```javascript
this._isBuilding = true;
var stagingGate = new THREE.Object3D();
```

- [ ] **Step 3: Route all mesh additions to `stagingGate`**

Inside `buildGate`, find every `self.gate.add(mesh)` and `this.gate.add(mesh)` call. Replace with `stagingGate.add(mesh)`.

There will be many. Replace all of them.

- [ ] **Step 4: Swap on completion**

Update `_loadGeo` (or the pending-loads completion logic from Task 6) so that when `_pendingLoads === 0`, it performs the swap:

```javascript
if (self._pendingLoads === 0 && self._isBuilding) {
    self._isBuilding = false;
    // Dispose old gate children
    var oldChildren = self.gate.children.slice();
    oldChildren.forEach(function(child) {
        self.gate.remove(child);
        if (child.geometry) child.geometry.dispose();
    });
    // Move staging children to live gate
    var newChildren = stagingGate.children.slice();
    newChildren.forEach(function(child) {
        stagingGate.remove(child);
        self.gate.add(child);
    });
    self._needsRender = true;
    if (self._onReady) self._onReady();
}
```

**Note:** `stagingGate` must be in scope here. If `_loadGeo` is a prototype method, pass `stagingGate` as a parameter to it, or store it as `self._stagingGate` temporarily.

- [ ] **Step 5: Handle the `stagingGate` scope issue**

The cleanest approach: store the staging gate on the instance during build:

```javascript
// At start of buildGate:
this._stagingGate = new THREE.Object3D();

// All mesh additions: stagingGate.add(mesh) → this._stagingGate.add(mesh)
// (use self._stagingGate throughout buildGate)

// In the completion block inside _loadGeo:
var stagingGate = self._stagingGate;
self._stagingGate = null;
// ...then do the swap as above
```

- [ ] **Step 6: Build and test**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Switch styles rapidly (click Style A, then B, then C quickly). There should be no blank-canvas flash between styles — the old gate stays visible until the new one is fully loaded.

- [ ] **Step 7: Commit**

```bash
git add GateRenderer.js
git commit -m "perf: swap-when-ready — old gate stays visible until new scene is fully loaded"
```

---

## Phase 3 — State & Diff Cleanup

### Task 8: Replace `JSON.stringify` diff in `UnifiedCanvas.js`

**Files:**
- Modify: `UnifiedCanvas.js`

**What:** Replace O(n) `JSON.stringify` accessory comparison with direct field enumeration.

- [ ] **Step 1: Find both stringify comparisons**

In `UnifiedCanvas.js` around lines 265–295, find these two occurrences:
```javascript
JSON.stringify(prev.accessories) === JSON.stringify(fc.accessories)
JSON.stringify(prev.accessories) === JSON.stringify(config.accessories)
```

- [ ] **Step 2: Replace with explicit key comparison**

For each occurrence, replace with a helper. Add this function before the component definition:

```javascript
function accessoriesEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    var keys = ['circle', 'butterfly', 'scrollTop', 'scrollBottom', 'finialRail'];
    for (var i = 0; i < keys.length; i++) {
        if (a[keys[i]] !== b[keys[i]]) return false;
    }
    return true;
}
```

Then replace both `JSON.stringify(prev.accessories) === JSON.stringify(fc.accessories)` with:
```javascript
accessoriesEqual(prev.accessories, fc.accessories)
```

And `JSON.stringify(prev.accessories) === JSON.stringify(config.accessories)` with:
```javascript
accessoriesEqual(prev.accessories, config.accessories)
```

**Note:** Verify the actual accessory keys by checking `configData.js` — the keys used in `accessoriesEqual` must match the actual property names on the accessories object.

- [ ] **Step 3: Build and verify**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Toggle accessories (circle, butterfly) on and off — verify the gate updates correctly (accessories appear/disappear). Color-only changes should still use the fast `updateMaterials` path.

- [ ] **Step 4: Commit**

```bash
git add UnifiedCanvas.js
git commit -m "perf: replace JSON.stringify accessory diff with direct field comparison"
```

---

### Task 9: Document magic numbers in `GateRenderer.js`

**Files:**
- Modify: `GateRenderer.js`

**What:** Add single-line comments to explain verified camera constants. No code changes.

- [ ] **Step 1: Document camera constants**

Find the camera setup block (lines 43–48):
```javascript
this.camera = new THREE.PerspectiveCamera(40, 1, 1, 100);
this.camera.zoom = 1.788;
this.camera.position.set(0.82, 1.27, 7.2);
this.camera.rotation.order = 'YXZ';
this.camera.rotation.set(0, (6 * Math.PI) / 180, 0);
```

Replace with:
```javascript
// FOV=40, near=1, far=100 — matches Ultra gate tool (Playwright-verified 2026-03-17)
this.camera = new THREE.PerspectiveCamera(40, 1, 1, 100);
// zoom=1.788 — verified against Ultra's scene camera zoom value
this.camera.zoom = 1.788;
// position — verified against Ultra: x=0.82 (slight right), y=1.27 (chest height), z=7.2 (distance)
this.camera.position.set(0.82, 1.27, 7.2);
this.camera.rotation.order = 'YXZ';
// 6° Y rotation — slight left-facing angle matching Ultra's gate view
this.camera.rotation.set(0, (6 * Math.PI) / 180, 0);
```

- [ ] **Step 2: Document resize zoom**

Find in `GateRenderer.prototype.resize`:
```javascript
this.camera.zoom = 1.788;
```

Add comment above:
```javascript
// Restore verified zoom after aspect change — do not change this value
this.camera.zoom = 1.788;
```

- [ ] **Step 3: Commit**

```bash
git add GateRenderer.js
git commit -m "docs: document verified camera constants in GateRenderer"
```

---

### Task 10: Debounce `localStorage` writes (`app.js`)

**Files:**
- Modify: `app.js`

**What:** 3 separate localStorage writes fire on every state change. Debounce to 500ms. Add `beforeunload` flush.

- [ ] **Step 1: Add a debounce utility near the top of `app.js`**

Find the imports/constants at the top of `app.js`. After the last import, add:

```javascript
function debounce(fn, ms) {
    var t;
    var debounced = function() {
        var args = arguments;
        var ctx = this;
        clearTimeout(t);
        t = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
    debounced.flush = function() {
        clearTimeout(t);
        fn();
    };
    return debounced;
}
```

- [ ] **Step 2: Create a debounced persist function**

Find the three localStorage useEffect blocks (around lines 426–446):

```javascript
useEffect(function() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch (e) {}
    var hashString = buildHashString(config);
    window.history.replaceState(null, '', '#' + hashString);
}, [config]);

useEffect(function() {
    try { localStorage.setItem('gv_fence_config', JSON.stringify(frontYardConfig)); } catch (e) {}
}, [frontYardConfig]);

useEffect(function() {
    try { localStorage.setItem('gv_back_config', JSON.stringify(backyardConfig)); } catch (e) {}
}, [backyardConfig]);
```

- [ ] **Step 3: Replace with debounced versions**

Replace all three useEffects with:

```javascript
var persistRef = React.useRef(null);

useEffect(function() {
    if (!persistRef.current) {
        persistRef.current = debounce(function(cfg, frontCfg, backCfg) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
            try { localStorage.setItem('gv_fence_config', JSON.stringify(frontCfg)); } catch (e) {}
            try { localStorage.setItem('gv_back_config', JSON.stringify(backCfg)); } catch (e) {}
        }, 500);
    }
    persistRef.current(config, frontYardConfig, backyardConfig);
    var hashString = buildHashString(config);
    window.history.replaceState(null, '', '#' + hashString);
}, [config, frontYardConfig, backyardConfig]);
```

- [ ] **Step 4: Add `beforeunload` flush**

After the combined useEffect above, add:

```javascript
useEffect(function() {
    var flush = function() {
        if (persistRef.current) persistRef.current.flush();
    };
    window.addEventListener('beforeunload', flush);
    return function() { window.removeEventListener('beforeunload', flush); };
}, []);
```

- [ ] **Step 5: Build and verify**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Change gate color rapidly several times. Open DevTools → Application → Local Storage. Verify `gv_config` updates ~500ms after the last change, not on every click. Close the tab and reopen — config should be restored from localStorage.

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "perf: debounce localStorage writes to 500ms with beforeunload flush"
```

---

## Phase 4 — Architecture

### Task 11: Context API for config state (`app.js`, `FloatingPanel.js`, `UnifiedCanvas.js`, `tabs/*.js`)

**Files:**
- Create: `DesignStudioContext.js`
- Modify: `app.js`
- Modify: `FloatingPanel.js`
- Modify: `UnifiedCanvas.js`
- Modify: `tabs/StyleTab.js`, `tabs/ColorTab.js`, `tabs/SizeTab.js`, `tabs/OptionsTab.js`, `tabs/PuppyPicketsTab.js`, `tabs/DetailsTab.js`, `tabs/QuoteTab.js`

**What:** Create a React context so config state doesn't have to be prop-drilled 5 levels deep. Config field names and values are NOT changed — GateRenderer reads them directly.

- [ ] **Step 1: Create `DesignStudioContext.js`**

Create new file `DesignStudioContext.js`:

```javascript
import React from 'react';

var DesignStudioContext = React.createContext(null);

export default DesignStudioContext;
```

- [ ] **Step 2: Wrap the app in the context provider in `app.js`**

In `app.js`, import the context:
```javascript
import DesignStudioContext from './DesignStudioContext';
```

Find the return statement of the App component. Wrap the outermost JSX element with:
```jsx
<DesignStudioContext.Provider value={{
    config: config,
    setConfig: setConfig,
    frontYardConfig: frontYardConfig,
    setFrontYardConfig: setFrontYardConfig,
    backyardConfig: backyardConfig,
    setBackyardConfig: setBackyardConfig,
    activeTab: activeTab,
    setActiveTab: setActiveTab,
    fenceConfig: fenceConfig,
}}>
  {/* existing JSX */}
</DesignStudioContext.Provider>
```

- [ ] **Step 3: Update each tab to read from context**

For each tab in `tabs/`, replace prop reads with context reads. Pattern for each file:

```javascript
import DesignStudioContext from '../DesignStudioContext';

var MyTab = function(props) {
    var ctx = React.useContext(DesignStudioContext);
    var config = ctx.config;
    var setConfig = ctx.setConfig;
    // ... remove config/setConfig from props destructuring
};
```

Do this for: `StyleTab.js`, `ColorTab.js`, `SizeTab.js`, `OptionsTab.js`, `PuppyPicketsTab.js`, `DetailsTab.js`, `QuoteTab.js`.

- [ ] **Step 4: Remove config props from `FloatingPanel.js`**

In `FloatingPanel.js`, remove all config/setConfig props from the component signature. Read from context instead (same pattern as Step 3).

- [ ] **Step 5: Remove config props from `UnifiedCanvas.js`**

In `UnifiedCanvas.js`, import and read config from context instead of props.

- [ ] **Step 6: Clean up prop-passing in `app.js`**

Remove all the config/setConfig/fenceConfig props from the `<FloatingPanel>` and `<UnifiedCanvas>` JSX in app.js. They now come from context.

- [ ] **Step 7: Build and full visual test**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Test all 7 styles × all 9 colors × single/double leaf. Verify:
- Style switching still works
- Color changing still works
- Accessories (circle, butterfly) still work
- All 7 tabs render correct content
- localStorage save/restore still works

- [ ] **Step 8: Commit**

```bash
git add DesignStudioContext.js app.js FloatingPanel.js UnifiedCanvas.js tabs/
git commit -m "refactor: Context API for config state — eliminate 5-level prop drilling"
```

---

### Task 12: Merge `configData.js` and `fenceConfigData.js`

**Files:**
- Modify: `configData.js`
- Delete: `fenceConfigData.js`
- Modify: `app.js`, `FloatingPanel.js`, any file that imports `fenceConfigData`

**What:** Two parallel config files for the same domain. Merge into one with `gate` and `fence` sections.

- [ ] **Step 1: Audit all imports of `fenceConfigData`**

```bash
grep -r "fenceConfigData" "C:/Users/sarah/Desktop/App Repos/fence-tool/src" --include="*.js" -l
grep -r "fenceConfigData" "C:/Users/sarah/Desktop/App Repos/fence-tool" --include="*.js" -l
```

Note every file that imports it.

- [ ] **Step 2: Move fence config exports into `configData.js`**

Open `fenceConfigData.js`. Copy all its exports to the bottom of `configData.js`, namespaced under a `FENCE_` prefix if any names conflict with existing gate exports.

- [ ] **Step 3: Update all import sites**

In every file from Step 1, replace:
```javascript
import { SomeName } from './fenceConfigData';
```
with:
```javascript
import { SomeName } from './configData';
```

- [ ] **Step 4: Delete `fenceConfigData.js`**

```bash
git rm "C:/Users/sarah/Desktop/App Repos/fence-tool/fenceConfigData.js"
```

- [ ] **Step 5: Build and verify**

```bash
npx webpack --mode development 2>&1 | tail -5
```

Confirm no import errors. Switch between gate and fence views — both should render.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: merge fenceConfigData.js into configData.js — single config source"
```

---

## Verification Checklist (run before opening PR)

- [ ] All 7 gate styles render correctly
- [ ] All 9 colors apply with correct PBR appearance
- [ ] Single and double leaf both work
- [ ] Accessories (circle, butterfly, finial rail) toggle correctly
- [ ] Puppy picket options render
- [ ] Height options (48"/60"/72") clip correctly
- [ ] Contact form submits without error
- [ ] localStorage restore works on page reload
- [ ] No console errors during normal use
