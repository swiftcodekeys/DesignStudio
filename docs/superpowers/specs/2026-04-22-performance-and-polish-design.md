# Performance & Polish — Design Spec
**Date:** 2026-04-22  
**Branch:** `feat/performance-and-polish`  
**Execution model:** 4 sequential phases, each run as a Haiku 4.5 subagent

---

## Goal
Improve perceived performance (faster loads, smoother style switches), fix real UX pain points, and clean up technical debt — without touching the verified spatial rendering math.

---

## Phase 1 — Quick Wins (zero renderer risk)

### 1A. Stop the idle 60fps render loop
**File:** `GateRenderer.js`  
**What it does today:** The animate loop calls `renderer.render()` unconditionally every frame, even when nothing is moving or changing.  
**Change:** Add a `_needsRender` dirty flag. Set it `true` whenever config changes, resize happens, or the scene is first built. The loop only calls `render()` when the flag is true, then clears it. Result: CPU drops to near-zero when the gate is just sitting there.  
**Risk:** None — purely additive. The flag is set on every existing mutation point.

### 1B. Loading overlay while 3D models load
**Files:** `GateRenderer.js`, `UnifiedCanvas.js`  
**What it does today:** User sees a blank/frozen canvas for 2–3 seconds while JSON models load. Looks broken.  
**Change:** GateRenderer emits a `loading` callback when `buildGate` starts and a `ready` callback when the last model resolves. UnifiedCanvas listens and renders a centered spinner overlay (`position: absolute` over the canvas) during loading. Fade out on ready.  
**Risk:** None — overlay is purely cosmetic, doesn't touch scene logic.

### 1C. Fix dangerouslySetInnerHTML in SocialProof.js
**File:** `SocialProof.js`  
**What it does today:** Injects message strings as raw HTML via `dangerouslySetInnerHTML`. Works now but is an XSS vector if messages ever become dynamic.  
**Change:** Replace with a small parser that converts `<strong>text</strong>` to a `<strong>` JSX element. Messages stay the same visually; no raw HTML injection.  
**Risk:** None.

### 1D. ContactPopup UX fixes
**File:** `ContactPopup.js`  
**What it does today:** Success state stays open indefinitely; cooldown silently disables the button with no explanation; phone field has no formatting.  
**Changes:**
- Auto-close success state after 3 seconds (with a visible countdown: "Closing in 3…")
- Show cooldown timer on button: "Try again in 28s…" counting down
- Phone field: format input as `(XXX) XXX-XXXX` on blur  
**Risk:** None.

---

## Phase 2 — Renderer Performance (medium risk)

### 2A. Material caching by color ID
**File:** `GateRenderer.js`  
**What it does today:** `makeMat()` creates a new `MeshStandardMaterial` on every `buildGate()` call — even if the color hasn't changed.  
**Change:** Add `this._matCache = {}` on the renderer. Key is `colorId`. On `buildGate`, check cache before creating. Clear cache only on `dispose()`.  
**Constraint:** Do NOT change PBR values (roughness, metalness, bump, envMapIntensity) — these are verified against Ultra. Cache the whole material object as-is.  
**Risk:** Low. Only changes when materials are created, not how they're configured.

### 2B. Model geometry caching
**File:** `GateRenderer.js`  
**What it does today:** Every style switch re-invokes `THREE.JSONLoader` for every model file — re-reading and re-parsing JSON from disk each time.  
**Change:** Add `this._geoCache = {}` keyed by file path. After first load, store the parsed geometry. On subsequent calls, clone from cache instead of re-loading. Clear cache on `dispose()`.  
**Constraint:** Use `.clone()` on cached geometries — never share geometry objects between scenes (Three.js r86 doesn't handle shared geometry disposal safely).  
**Risk:** Medium. Must verify `.clone()` behavior for each model type. Test all 7 styles after implementing.

### 2C. Swap-when-ready scene transition
**Files:** `GateRenderer.js`, `UnifiedCanvas.js`  
**What it does today:** On style switch, old scene tears down first, then new scene builds — user sees blank canvas during the gap.  
**Change:** Keep old scene rendering while new scene builds in background. GateRenderer builds into a staging scene. When all models resolve, swap `this.scene` to the staged scene in a single frame and dispose the old one.  
**Risk:** Medium. Requires careful disposal tracking to avoid memory leaks. Old scene must be fully disposed after swap.

---

## Phase 3 — State & Diff Cleanup (low risk)

### 3A. Replace JSON.stringify diff in UnifiedCanvas
**File:** `UnifiedCanvas.js` (lines 265–276)  
**What it does today:** Uses `JSON.stringify(prev.accessories) === JSON.stringify(fc.accessories)` on every useEffect run to detect changes. O(n) string serialization every render.  
**Change:** Replace with explicit field comparison for each accessory key. If accessories object shape is fixed (it is — defined in configData), enumerate keys directly.  
**Risk:** Low. Pure optimization, same logical outcome.

### 3B. Document magic numbers in GateRenderer
**File:** `GateRenderer.js`  
**What it does today:** Values like `1.788` (camera zoom), `0.82, 1.27, 7.2` (camera position), `6°` rotation appear with no explanation.  
**Change:** Add a single-line comment above each constant citing its origin: "Playwright-verified 2026-03-17 against Ultra live tool" with the value's meaning. No code changes — documentation only.  
**Risk:** None.

### 3C. Debounce localStorage writes
**File:** `app.js`  
**What it does today:** 3 separate `localStorage.setItem()` calls fire on every state change (every keystroke, every click).  
**Change:** Wrap the persistence block in a `debounce(500ms)`. No behavioral change for the user — saves still happen within half a second.  
**Risk:** Low. Confirm saves still fire on page unload (add `beforeunload` flush if needed).

---

## Phase 4 — Architecture (higher risk, own session)

### 4A. Context API for config state
**Files:** `app.js`, `FloatingPanel.js`, `UnifiedCanvas.js`, `tabs/*.js`  
**What it does today:** Gate config, fence config (front + back), and active scene are passed as props through 4–5 levels.  
**Change:** Create `DesignStudioContext` with `useReducer`. Expose `gateConfig`, `frontConfig`, `backConfig`, `activeScene`, and dispatch. Remove config props from FloatingPanel and Tab component signatures — they read from context directly.  
**Constraint:** Do NOT change how config values are structured or named — GateRenderer reads them directly and those field names are verified against Ultra.  
**Risk:** High. Touches every tab component. Must run full visual test of all 7 styles + colors after implementing.

### 4B. Merge configData.js and fenceConfigData.js
**Files:** `configData.js`, `fenceConfigData.js`, `app.js`, `FloatingPanel.js`  
**What it does today:** Two parallel config files for gate and fence products. Both imported in multiple files.  
**Change:** Merge into single `configData.js` with `gate` and `fence` top-level keys. Update all imports.  
**Risk:** Medium. Import paths change in ~6 files. No logic changes.

---

## What We Are NOT Changing
- Any value in `SPATIAL_TRUTH.json` or `spatialConstants.js`
- Any PBR material values (roughness, metalness, bump, envMapIntensity)
- `gate_tool/js/ultra_dsg_min.js` — never modified
- Clip plane constants (`CLIP_POST`, `CLIP_PO23`)
- Finial/accent position arrays

---

## Branch Strategy
All phases land on `feat/performance-and-polish`. Each phase gets its own commit(s) with the prefix `perf:`, `fix:`, `refactor:`, or `docs:`. No squashing — each phase is independently revertable.

---

## Execution Plan
Each phase runs as a **Haiku 4.5 subagent** with this spec as context. Phases run sequentially — Phase 2 assumes Phase 1 is committed, etc.
