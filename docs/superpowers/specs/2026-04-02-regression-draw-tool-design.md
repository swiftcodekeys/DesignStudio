# Regression Fixes + Draw Tool Overhaul — Design Spec

**Date:** 2026-04-02
**Branch:** `feat/fence-quiz`
**Hard boundary:** Configurator UI unchanged. Heights 48/54/60/72 only. No grade selector in configurator.

---

## PART 1 — REGRESSION FIXES (15 items, one commit)

### Fix 1 — Footer separator pipes
**File:** `BacklinksFooter.js` lines 34, 36, 38
**Change:** Replace `&middot;` with `|` in row2. Row1 already uses pipes.
- Line 34: `&middot;` → `|`
- Line 36: `&middot;` → `|`
- Line 38: `&middot;` → `|`

### Fix 2 — Footer link underline consistency
**File:** `styles.css` — search for `.backlinks-trust-link` and `.backlinks-bar a`
**Change:** Ensure `text-decoration: none` on all footer links. Remove any underline on hover too — all links same style, bright on hover only.

### Fix 3 — Email opens ContactPopup instead of mailto:
**Files affected:**
- `BacklinksFooter.js:36` — `mailto:sales@grandviewfence.com` → onClick opens ContactPopup
- `QuoteTab.js:51` — same
- `QuoteModal.js:119` — mailto submission → rewrite to POST to GAS (or open ContactPopup)
- `QuoteModal.js:140` — same

**Approach:** Deprecate QuoteModal.js entirely. Remove the file. Replace every QuoteModal trigger with ContactPopup. BacklinksFooter and QuoteTab get an `onContactClick` prop from app.js. All email links open ContactPopup instead of mailto:.

### Fix 4 — Callable phone numbers
**Files:** All instances of (855) already identified.
- `BacklinksFooter.js:36` — already wrapped in `tel:` ✓
- `QuoteTab.js:49` — already wrapped in `tel:` ✓
- `ContactPopup.js:56` — plain text in error message → wrap in `<a href="tel:+18553362330">`
- `QuoteModal.js:137-138` — phone numbers not wrapped → wrap in `<a href="tel:+18553362330">`

### Fix 5 — Privacy color names
**File:** `fenceConfigData.js` lines 102-112
**Changes:**
| Current | Correct ProCoat Name |
|---------|---------------------|
| Black | Textured Black |
| White (post) | Textured White |
| Bronze | Textured Bronze |
| Satin Khaki | Textured Khaki |
| Silver | Silver |
| White (panel) | Textured White |
| Satin Khaki (panel) | Textured Khaki |

Hex values unchanged.

### Fix 6 — Bottom CTAs on front/back yard screens
**File:** `tabs/QuoteTab.js` (or FloatingPanel.js footer section)
**Approach:** QuoteTab receives `activeTab` prop and renders different CTAs based on scene.

Front yard:
- "Add Driveway Gate" → `onTabChange('gates')`
- "Add Backyard Fence" → `onTabChange('backyard')`
- "Get Instant Quote" → `onTabChange('draw')`

Backyard:
- "Add Driveway Gate" → `onTabChange('gates')`
- "Add Front Yard Fence" → `onTabChange('fencing')`
- "Get Instant Quote" → `onTabChange('draw')`

Gate tab: unchanged (current QuoteTab CTAs stay).

### Fix 7 — Front yard defaults
**File:** `app.js` line 132-142 (`defaultFenceConfig`)
**Change:** Already correct: styleId `uaf_200`, height `48`, color `FENCE_COLORS[5]` (Gloss Black).
**Verify:** FENCE_COLORS[5] maps to Textured Black, not Gloss Black. Check fenceConfigData.js color array index 5.

### Fix 8 — Backyard defaults
**File:** `app.js`
**Approach:** Separate default config objects per scene:
- `defaultFrontYardConfig` — Horizon (uaf_200), 48", Textured Black
- `defaultBackyardConfig` — Haven (uab_200), 54", Textured White
- `defaultGateConfig` — Horizon (uaf_200), 48", Textured Black
Load scene defaults on first tab switch. Preserve user changes on subsequent switches. Track per-scene initialization with a `sceneInitialized` object: `{ fencing: false, backyard: false, gates: false }`.

### Fix 9 — Driveway gate defaults
**File:** `app.js` line 93 (`defaultConfig`)
**Current:** styleId = `defaultStyle.id` (first FENCE_STYLES entry = uaf_200), height `60`, color `COLORS[5]`.
**Change:** Height should stay at configurator's decision (currently 60" which is fine). Color index 5 — verify it maps to Textured Black in configData.js COLORS array.

### Fix 10 — Haven height lock bug
**File:** Investigate where Haven forces height to 54".
**Change:** Remove any hardcoded height restriction. Haven shows all 3 available heights (48, 54, 60). Add pool compliance banner in SizeTab or FloatingPanel when Haven is selected:
- Always: "Haven features a flush bottom rail — required for pool barrier compliance in most jurisdictions."
- When 48": additional warning about minimum height codes.

**Important:** This touches SizeTab only for the warning banner text, NOT for height options. Heights come from FENCE_HEIGHTS array which already has 48/54/60/72. Haven's restriction (if any) is elsewhere — possibly in a useEffect in app.js or the style change handler.

### Fix 11 — Driveway gate CTAs
**File:** QuoteTab.js or FloatingPanel.js (gate-specific rendering)
**Change:** When `activeTab === 'gates'`:
- Row 1: "Measure My Property" → `onTabChange('draw')` | "Get Instant Quote" → QuoteBuilder Step 2
- Row 2: "Talk to an Expert" → opens ContactPopup

### Fix 12 — Double gate middle post at 72" (INVESTIGATE ONLY)
**Files to investigate:** `GateRenderer.js`, `spatialConstants.js`
**Questions to answer:**
- Where is middle post height calculated for Standard and Reverse double gates?
- What's different about 72" vs 48"/60"?
- Why do Estate/Arch work correctly at 72"?
**Zero code changes this session.**

### Fix 13 — Privacy hidden on gate tab
**File:** Find where privacy/Solace option renders in style picker or options.
**Change:** Add conditional: if `activeTab === 'gates'`, exclude styles where `isPrivacy === true` from the style list.
**Note:** The scan report says privacy already doesn't render on gate tab. Verify in browser before marking done.

### Fix 14 — Charleston Pro decoratives (INVESTIGATE ONLY)
**Method:** Use Playwright to check Ultra's live configurator.
**Questions:** Does Ultra allow circles/butterfly on UAS-101? What changes in the middle section for Pro spacing?
**Zero code changes.**

### Fix 15 — Flush bottom option (INVESTIGATE ONLY)
**Method:** Check Ultra price book and configurator.
**Questions:** Is flush bottom a separate orderable option or style-specific (Haven only)? Which styles support it?
**Zero code changes.**

---

## PART 2 — DRAW TOOL OVERHAUL

### DRAW 1 — Config thumbnail
**File:** `DrawYardView.js` (new section in AddressEntry or DrawingPanel)
**Data flow:** Read current `fenceConfig` or `config` from props. Access `renderer.domElement.toDataURL()` from UnifiedCanvas ref. Display as `<img>` in a styled card.
**Fallback:** If no renderer available (cold entry), show lifestyle photo from `assets/`.

### DRAW 2 — Draw button color
**File:** `DrawYardView.js` line 300-307
**Change:** Marker fillColor `#C9A84C` (gold) → `#1B3A5C` (navy, matching polyline stroke)

### DRAW 3 — Map zoom level
**File:** `DrawYardView.js` line 217 and line 571
**Change:** Initial zoom `20` → `18`. Recenter zoom `20` → `18`.

### DRAW 4 — Remove Center button
**File:** `DrawYardView.js` line 431
**Change:** Delete the `<button>` element and its `onRecenter` handler.

### DRAW 5, 6, 7 — PLANNING PASS (written below, needs approval before code)

#### DRAW 5 — Floating action buttons on map

**Files modified:** `DrawYardView.js`, `styles.css`
**Data flow:** Buttons call existing handlers: `handleNewLine()` (new line), undo handler, clear handler.
**New:** Instruction overlay — ephemeral `<div>` shown via `showInstructions` state, dismissed on first map click.
**No new data** — just UI controls for existing functionality.

#### DRAW 6 — Gate markers on segments

**Files modified:** `DrawYardView.js`, `styles.css`
**New state:** `gateMarkers` array in DrawYardView: `[{ lineIndex, segmentIndex, positionFt, type, widthInches }]`
**Data flow IN:** User clicks segment → popup → confirms gate → marker added to `gateMarkers` state.
**Data flow OUT:** `handleGetQuoteForLayout()` already saves to localStorage. Add `gates` array to the output:
```js
data.gates = gateMarkers.map(function(m) {
    return { type: m.type, widthInches: m.widthInches };
});
data.gateCount = gateMarkers.length;
```
This feeds directly into `calculateQuote(config).gates[]`.
**Conflict with existing code:** None — `gateMarkers` is new state. The existing `lines` state is unchanged. Undo needs awareness: if undo removes a point that a gate marker references, remove that marker too.
**Dependency:** Imports `GATE_COMPATIBLE_WIDTHS` from `retailPricing.js` for width dropdown.

#### DRAW 7 — Follow-up questions after drawing

**Files modified:** `DrawYardView.js` (new `FollowUpQuestions` component), `styles.css`
**Data flow IN:** After "Get Quote for This Layout" click, show overlay instead of immediately navigating. Overlay reads current `gateMarkers` count to decide if Q2 is needed. Reads `fenceConfig` to decide if Q4 is needed.
**Data flow OUT:** Answers stored in localStorage alongside the draw layout data:
```js
localStorage['gv_draw_layout'] = {
    ...existingData,
    terrain: 'flat',        // from Q1
    gates: [...],           // from Q2 (if no markers from DRAW 6)
    installPlan: 'diy',     // from Q3
    style: 'horizon',       // from Q4 (if cold entry)
};
```
**Dependency on DRAW 6:** Q2 (gate count) only shows if `gateMarkers.length === 0`. If DRAW 6 isn't built yet, Q2 always shows.
**Dependency on DRAW 5:** None.
**Feeds into:** `calculateQuote()` via the QuoteBuilder/QuoteDisplay config assembly.

---

## Summary of Dependencies

```
DRAW 1, 2, 3, 4 — independent, no dependencies
DRAW 5 — independent (UI buttons for existing handlers)
DRAW 6 — independent (new state, new UI, feeds into output)
DRAW 7 — depends on DRAW 6 (Q2 gate question conditional)
```

Build order: DRAW 1→4 in any order, then DRAW 5, then DRAW 6, then DRAW 7.
