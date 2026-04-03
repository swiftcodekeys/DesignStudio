# CORRECTIVE SESSION HANDOFF — Size Tab & Renderer Regressions

## Working Directory
```
C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp
```
Branch: `feat/fence-quiz`

## What Happened

Two Claude sessions attempted to fix the Size tab (height/single-double/direct-mount) and introduced multiple regressions. The sessions were too aggressive — they changed renderer math without properly validating each change against Ultra's live tool. **You need to fix the regressions before doing anything else.**

Read `CLAUDE.md` in the repo root for full architecture and rules. The #1 rule: **Ultra's live tool is the source of truth. If our output doesn't match theirs, it's wrong.**

---

## CRITICAL REGRESSIONS TO FIX

### 1. HEIGHT OFFSET BROKE SPEAR STYLES (Charleston, Charleston Pro, Savannah, Vanguard)

**NOTE: Height changes DO work correctly for flat-top styles.** Sarah confirmed heights work. The issue is specifically with spear/finial styles.

**What happened:** Commit `4df0eac` added a height offset (`hOff`) that gets applied to picket tops, rails, and caps via `offsetY()`. This correctly makes height changes visible for flat-top styles (Horizon, Haven). But for spear-family styles (Charleston, Savannah) and Vanguard, the spear tips / finials are now FLOATING ABOVE the gate. The `fsv` (spear family vertical offset = -0.152) and `hOff` are being combined incorrectly.

**Root cause in code:** `GateRenderer.js` line 242:
```javascript
var picketTop = offsetY(lt.picketTop, fsv, hOff);
```
This applies BOTH `fsv` AND `hOff` to picket tops. But the spear/finial position arrays in `FINIAL_POSITIONS` were extracted at 60" baseline — they don't expect a height offset to be applied to the pickets they sit on top of. The finials end up disconnected from the picket tops.

**What needs to happen:**
1. Open Ultra's tool, select Charleston (spear style), compare 48"/60"/72"
2. Extract exactly how Ultra handles height changes for spear styles vs flat styles
3. The height offset may need to be applied DIFFERENTLY for spear styles, or the finial positions may also need the offset
4. Verify Vanguard separately — it's flat category but has spear finials, so it's a hybrid case

### 2. PUPPY PICKETS — ptRes/pbRes ARE THE WRONG MODELS FOR THIS

**What happened:** Commit `8fbf146` made `ptRes`/`pbRes` (the Pro-spacing extra pickets) visible when puppy pickets are enabled. This was wrong. The ptRes/pbRes models are designed for Pro spacing (1.5" picket gap) — they add intermediate pickets that extend the FULL HEIGHT of the gate. They are NOT puppy pickets.

**What it broke:**
- On Horizon (non-Pro style): enabling puppy adds full-height intermediate bars — they should NOT be there
- On ALL styles: the extra bars appear from top to bottom, not just below the puppy rail
- The bars added are too short (they don't reach the bottom rail properly)
- Circles and other accents may be affected by the extra geometry

**What puppy pickets ACTUALLY need:**
- Puppy pickets add SHORT intermediate pickets only in the BOTTOM section (below the puppy rail)
- Ultra's approach: they use textured flat planes, not 3D geometry — the "puppy" look is baked into the texture
- Our 3D approach needs a DIFFERENT solution. Options:
  a. Load separate puppy picket models (if they exist in `gate_tool/m/`)
  b. Use the existing bottom picket models (pbEven/pbOdd) repositioned below the puppy rail
  c. Clone the bottom section geometry and clip it to puppy rail height
- **Before implementing:** scrape Ultra's Features panel, enable puppy, and examine EXACTLY what meshes change and how. Don't guess.

**Immediate fix:** REVERT `showExtraPickets` back to `isProSpacing` only:
```javascript
// WRONG (current):
var showExtraPickets = isProSpacing || hasPuppy;

// CORRECT (revert to):
mesh.visible = isProSpacing;
```
This restores non-Pro styles to normal. Puppy pickets should be implemented properly in a future session, not by reusing Pro-spacing models.

### 3. SINGLE GATE TOGGLE STILL NOT WORKING

**What Sarah sees:** Clicking Single just makes the gate shorter (same as changing height). The gate does NOT change to a single panel — it stays as a double gate that's been clipped shorter.

**Likely root cause:** The `config.leaf` may not be flowing through to `buildGate` correctly, OR the leaf=1 model files may render identically to leaf=2 at this camera angle. Debug by:
1. Add `console.log('buildGate leaf:', leaf, 'isDoubleLeaf:', isDoubleLeaf)` at the top of buildGate
2. Check browser Network tab — are different model files loading when you switch Single/Double?
3. Compare our leaf=1 output vs Ultra's single-gate output visually

### 4. QUOTE TAB STILL CLIPPING

**What Sarah sees:** Configuration values on the right side are cut off ("Horizon" shows as "Horiz...", etc.). The Download PDF and Share Design buttons may be below the fold.

**The fix attempted:** Changed `.quote-layout` from horizontal to vertical flex. Added text-overflow ellipsis. But the panel is only 370px wide with 20px padding each side = 330px content width. Long values still clip.

**Better approach:**
- Make the quote-row labels and values stack vertically (label on top, value below) instead of side-by-side
- Or reduce font size further
- Or wrap text instead of using ellipsis
- Make sure Download PDF / Share Design / contact info are visible without scrolling

### 5. FOOTER BUTTON SIZE INCONSISTENCY

**What Sarah sees:** The Back button and Get Instant Quote button at the bottom of the Quote tab are not the same size as on other tabs. They should be consistent.

---

## WHAT WORKS (DON'T BREAK THESE — DO NOT REVERT THESE COMMITS)

- **Height changes WORK** — commit `4df0eac`. Sarah confirmed. The `hOff` offset correctly moves top rails, caps, top hinges down/up by 0.305m per step while anchoring bottom. Dramatic visible change across 48"/60"/72". **DO NOT REVERT this commit.** Only fix how it interacts with spear styles/finials.
- **Direct mount:** Structural frame (po40d/po14) hides, hinges stay, outer caps hide, inner caps stay. Matches Ultra.
- **Color hover popup:** Portal fix works correctly.
- **Nav buttons:** Fence link with arrow, orange Next button — working.
- **Social proof:** "Veteran-owned & American-made" — correct.

---

## HOW TO APPROACH THIS SESSION

### Priority order:
1. **REVERT puppy picket change** — change `showExtraPickets` back to `isProSpacing`. This immediately fixes Horizon and other non-Pro styles showing wrong extra bars.
2. **Fix spear style regressions** — investigate how `hOff` interacts with `fsv` for Charleston/Savannah/Vanguard. May need to skip height offset for finial positioning, or apply it to finials too.
3. **Debug single gate** — find out why leaf=1 doesn't produce a visually different gate.
4. **Fix quote tab layout** — make content fit in 370px panel.
5. **Puppy pickets proper implementation** — only after everything else is stable. This requires real research into Ultra's puppy rendering approach.

### Rules:
1. **One fix at a time.** Fix → verify → commit. Don't batch.
2. **Verify against Ultra VISUALLY.** Take our screenshot, take Ultra's screenshot, compare them side by side. "Verified" means they look the same.
3. **If you're not sure, don't ship it.** Say "I can't verify this matches Ultra because..." rather than committing broken code with "verified" in the message.
4. **Don't modify gate_tool/js/ultra_dsg_min.js**
5. **Read CLAUDE.md before making any changes** — it has the architecture, design tokens, spatial constants, and rendering rules.

---

## KEY FILES

| File | What It Does |
|------|-------------|
| `GateRenderer.js` | Three.js r86 renderer — this is where the bugs are |
| `spatialConstants.js` | All verified spatial constants, transforms, clipping values |
| `configData.js` | Style definitions, model paths, feature gating |
| `UnifiedCanvas.js` | React↔renderer bridge, config change detection |
| `FloatingPanel.js` | Panel layout, tabs, footer |
| `styles.css` | All CSS including panel sizing |
| `tabs/SizeTab.js` | Size tab UI (height/leaf/mount buttons) |
| `tabs/QuoteTab.js` | Quote tab layout |
| `CLAUDE.md` | Full architecture doc — READ THIS FIRST |

---

## ULTRA VALIDATION DATA

Previous sessions scraped Ultra's gate tool and saved data to:
- `planning/session-2/01-size-tab/ultra-validation.md` — height/leaf/mount behavior data
- Key finding: Ultra moves top elements by ±0.305m per height step, anchors bottom
- Key finding: Ultra uses textured flat planes (72 vertices), not 3D geometry like us
- Key finding: Puppy pickets in Ultra swap textures, they don't add 3D geometry

The Playwright MCP server is available for live scraping of:
- Ultra: `https://www.ultrafence.com/design-studio/gates/index.html`
- iFence: `https://ifenceusa.com` (gate studio)
