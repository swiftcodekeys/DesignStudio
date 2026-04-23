# Size Tab Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken Size tab so height selection, single/double gate toggle, and direct mount all update the 3D model correctly.

**Architecture:** SizeTab.js UI → app.js state → UnifiedCanvas.js useEffect → GateRenderer.buildGate(). The UI and state flow are already correct. The bugs are in GateRenderer.js where: (1) height clipping planes are hardcoded to 60" baseline, (2) leaf/mount changes trigger buildGate but visual output needs verification. Playwright scraping of Ultra's live tool is required before any renderer math changes.

**Tech Stack:** React, Three.js r86, Playwright MCP, Webpack

---

## File Structure

| File | Role | Changes |
|------|------|---------|
| `GateRenderer.js` | Three.js renderer | Add dynamic height clipping, verify leaf/mount behavior |
| `spatialConstants.js` | Spatial math constants | Add HEIGHT_OFFSETS map, per-height clipping values |
| `configData.js` | Config definitions | Verify HEIGHTS array matches Ultra |
| `tabs/SizeTab.js` | Size tab UI | Already correct — may need minor tweaks after validation |
| `UnifiedCanvas.js` | React↔renderer bridge | Add `mount` to fast-path comparison (currently missing) |
| `planning/session-2/01-size-tab/ultra-validation.md` | Validation data | New — document scraped data from Ultra + iFence |

---

## Task 1: Playwright Scrape — Ultra Gate Configurator

**Files:**
- Create: `planning/session-2/01-size-tab/ultra-validation.md`

- [ ] **Step 1: Navigate to Ultra's gate design studio**

Use Playwright to open `https://www.ultrafence.com/design-studio/gates/index.html`. Wait for the 3D canvas to load.

- [ ] **Step 2: Capture height behavior**

For each gate style available in Ultra's tool:
- Select each height option (48", 54", 60", 72")
- Take a screenshot at each height
- Note which heights are available per style
- Observe how the 3D model changes (clipping planes? model swap? scale?)

- [ ] **Step 3: Capture single vs double gate behavior**

- Toggle between single (1 leaf) and double (2 leaf) gate
- Take screenshots of each
- Note: does the gate width change? Do posts move? How many panels render?

- [ ] **Step 4: Capture direct mount behavior**

- Toggle between post mount and direct mount
- Take screenshots of each
- Note: which elements disappear? (posts, caps, hinges)
- Note hinge X positions for each mount type

- [ ] **Step 5: Extract runtime dimension values**

Use `browser_evaluate` to extract JavaScript variables from Ultra's running tool:
```javascript
// Look for height/clipping/mount variables in the page's JS context
// Ultra uses: htI (height index), lfI (leaf), mntI (mount)
// Clipping: look for THREE.Plane constants
```

- [ ] **Step 6: Document findings**

Write all scraped data to `planning/session-2/01-size-tab/ultra-validation.md` including:
- Available heights per style
- Clipping plane values per height
- Single vs double gate differences
- Direct mount vs post mount element visibility
- Screenshots saved as references

---

## Task 2: Playwright Scrape — iFence Cross-Reference

**Files:**
- Modify: `planning/session-2/01-size-tab/ultra-validation.md` (append iFence data)

- [ ] **Step 1: Navigate to iFence gate configurator**

Use Playwright to open `https://ifenceusa.com` and find their gate design studio.

- [ ] **Step 2: Cross-reference height/width options**

- Note available heights per style
- Note available widths for single vs double
- Compare with Ultra's data from Task 1

- [ ] **Step 3: Cross-reference mount behavior**

- Toggle direct mount if available
- Note which elements hide/show
- Compare with Ultra

- [ ] **Step 4: Document cross-reference**

Append iFence findings to `ultra-validation.md`. Note any discrepancies with Ultra data.

---

## Task 3: Fix Height Clipping — Make Dynamic

**Files:**
- Modify: `spatialConstants.js` (add HEIGHT_OFFSETS)
- Modify: `GateRenderer.js:232-234` (dynamic clipping)

- [ ] **Step 1: Add height offset constants to spatialConstants.js**

Using validated data from Task 1, add a height-to-offset map. Expected values (verify against scrape):

```javascript
// Height Y offsets (meters). 72" is baseline (0), shorter heights clip lower.
// These values MUST match Ultra's live tool — verified via Playwright.
export var HEIGHT_OFFSETS = {
    '48': -0.6096,
    '54': -0.4572,
    '60': -0.3048,
    '72': 0,
};
```

- [ ] **Step 2: Update buildGate to use dynamic clipping**

In `GateRenderer.js`, replace hardcoded clipping with height-adjusted values:

```javascript
// Current (hardcoded 60"):
clips.post.constant = CLIP_POST;
clips.post23.constant = CLIP_PO23[archId] || CLIP_PO23.e;

// New (dynamic):
var heightOffset = HEIGHT_OFFSETS[config.height] || HEIGHT_OFFSETS['60'];
clips.post.constant = CLIP_POST + heightOffset;
clips.post23.constant = (CLIP_PO23[archId] || CLIP_PO23.e) + heightOffset;
```

**IMPORTANT:** The exact math (additive offset vs multiplicative) must be validated against Ultra's scrape data from Task 1. The code above assumes additive offset — verify this assumption before implementing.

- [ ] **Step 2b: Check if picket clipping planes also need height adjustment**

The plan adjusts `clips.post` and `clips.post23`, but `CLIP_PT` (-0.735) and `CLIP_PB` (0.735) define picket split planes, and `CLIP_PB_PUPPY_STD`/`CLIP_PB_PUPPY_CLP` define puppy clip values. Use the Ultra scrape data from Task 1 to determine:
- Do picket split planes shift with height, or only post clipping?
- If they shift, apply the same `heightOffset` to `clips.pt.constant` and `clips.pb.constant`

- [ ] **Step 2c: Verify 54" height availability**

The scrape from Task 1 should reveal whether Ultra supports 54" height. If yes, ensure it is added to configData.js HEIGHTS:

```javascript
export var HEIGHTS = [
  { id: '48', label: '48"' },
  { id: '54', label: '54"' },  // ADD if Ultra supports it
  { id: '60', label: '60"' },
  { id: '72', label: '72"' },
];
```

If Ultra does NOT support 54", remove the `'54': -0.4572` entry from HEIGHT_OFFSETS.

- [ ] **Step 3: Run dev server and test height toggle**

```bash
cd "C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp"
npm start
```

Open http://localhost:3000, go to Size tab, toggle between 48"/60"/72". Gate should visibly change height. Compare against Ultra screenshots from Task 1.

- [ ] **Step 4: Commit**

```bash
git add spatialConstants.js GateRenderer.js
git commit -m "feat: dynamic height clipping — adjust clipping planes per selected height"
```

---

## Task 4: Verify and Fix Leaf Toggle (Single/Double)

**Files:**
- Modify: `GateRenderer.js` (if needed)
- Modify: `UnifiedCanvas.js:159-168` (add mount to fast-path check)

- [ ] **Step 1: Diagnose current leaf toggle behavior**

Run dev server. Go to Size tab. Toggle Single → Double and back. Open browser console and check for:
- JavaScript errors during model loading
- Whether buildGate is being called (add `console.log('buildGate leaf:', config.leaf)` temporarily)
- Whether leaf=1 model files load successfully (check Network tab for 404s)

- [ ] **Step 2: If leaf toggle already works — verify visual correctness**

Compare single gate vs double gate rendering against Ultra screenshots from Task 1. Verify:
- Single gate shows 1 panel, double shows 2
- Post positions are correct for each
- Rail positions match LEAF_TRANSFORMS values

- [ ] **Step 3: If leaf toggle does NOT work — debug and fix**

Possible issues:
- Model paths for leaf=1 may have loading errors (check browser console)
- LEAF_TRANSFORMS['1'] values may be wrong (compare against Ultra scrape)
- Clipping planes may need leaf-specific adjustments

Fix whatever is found. Document the root cause.

- [ ] **Step 4: Test and commit**

Run dev server. Toggle single↔double. Verify 3D updates. Compare against Ultra.

```bash
git add GateRenderer.js
git commit -m "feat: verify and fix single/double gate toggle"
```

---

## Task 5: Verify and Fix Mount Toggle (Post/Direct)

**Files:**
- Modify: `GateRenderer.js` (if needed)

- [ ] **Step 1: Diagnose current mount toggle behavior**

Run dev server. Go to Size tab. Toggle Post → Direct and back. Check:
- Does the gate visually change? (posts/caps should disappear on Direct)
- Check browser console for errors
- Verify buildGate is called on mount change

- [ ] **Step 2: If mount toggle already works — verify visual correctness**

Compare against Ultra screenshots from Task 1:
- Post mount: po40d + po14 visible, post caps visible, hinges at x=±1.823
- Direct mount: posts hidden, caps hidden, hinges at x=±1.778

Check if hinge positions need to change between mount types. In current code (line 31-34 of spatialConstants.js), `M_HINGE` has x=±1.778 — this is the DIRECT mount position. If Ultra uses different hinge positions for post mount, this needs fixing.

- [ ] **Step 3: If mount toggle does NOT work — debug and fix**

Possible issues:
- The `isPostMount` flag may not correctly interpret config.mount
- Posts may load but not be visible (material/clipping issue)
- Direct mount hinge positions may differ from post mount positions

Fix whatever is found. Document the root cause.

- [ ] **Step 4: Add mount to UnifiedCanvas fast-path comparison**

Currently `mount` is missing from the fast-path check in UnifiedCanvas.js (lines 159-168). If mount and color change simultaneously, the fast path would incorrectly skip the rebuild. Add it:

```javascript
// In UnifiedCanvas.js, the fast-path color-only check:
prev.mount === config.mount &&   // ADD THIS LINE
prev.color !== config.color) {
```

- [ ] **Step 5: Test and commit**

Run dev server. Toggle post↔direct. Verify 3D updates. Compare against Ultra.

```bash
git add GateRenderer.js UnifiedCanvas.js
git commit -m "feat: verify and fix post/direct mount toggle"
```

---

## Task 6: Playwright Post-Implementation Verification

**Files:**
- Modify: `planning/session-2/01-size-tab/ultra-validation.md` (append verification results)

- [ ] **Step 1: Side-by-side comparison — Height**

Use Playwright to open both Ultra's tool and our dev server. For each height (48", 60", 72"):
- Screenshot Ultra's output
- Screenshot our output
- Compare gate proportions and clipping

- [ ] **Step 2: Side-by-side comparison — Leaf**

For single and double gate:
- Screenshot Ultra's output
- Screenshot our output
- Compare panel count, post positions, proportions

- [ ] **Step 3: Side-by-side comparison — Mount**

For post and direct mount:
- Screenshot Ultra's output
- Screenshot our output
- Compare element visibility (posts, caps, hinges)

- [ ] **Step 4: Document verification results**

Append to `ultra-validation.md`:
- Which comparisons pass
- Any remaining discrepancies
- Whether each fix matches Ultra's behavior

- [ ] **Step 5: Final commit if any adjustments were needed**

```bash
git add GateRenderer.js spatialConstants.js configData.js
git commit -m "fix: adjust size tab values after post-implementation Ultra verification"
```

---

## Execution Notes

- **Tasks 1-2 (scraping) MUST complete before Task 3-5 (implementation)**
- Tasks 3, 4, 5 are sequential — each builds on the previous
- Task 6 is the final gate — do not proceed to Split 02 until verification passes
- If scraping reveals unexpected constraints (e.g., certain heights unavailable for certain styles), update configData.js HEIGHTS array and SizeTab.js accordingly
- All clipping math must trace back to scraped Ultra values — never guess
