# Split 03: UI Fixes — Color Popup + Nav Tweaks

## Goal

Fix the non-rendering color hover popup and polish nav button styling.

## Context

- **Repo:** `C:\Users\sarah\Desktop\App Repos\Testing-VS code\designstudio\designstudio\designstudioworkingmvp`
- **Full project context:** See `CLAUDE.md` in repo root
- **Key files:** `tabs/ColorTab.js`, `tabs/ImagePopup.js`, `TopNav.js`, `styles.css`
- **Design tokens:** See CLAUDE.md — `--brand` (#6BA3C2), `--cta` (#d4753a), `--text-primary` (#1a1a2e)

## Tasks

### 1. Color Hover Popup (RISK ITEM)

**Problem:** ImagePopup component is wired into ColorTab — state is being set on hover — but nothing renders visually.

**This is NOT a wiring issue.** The component exists, the state management is in place. The user has flagged this as likely a z-index or portal/layering conflict with the frosted glass floating panel (`rgba(255,255,255,0.95)` + `backdrop-filter: blur(20px)`).

**Debugging approach:**
1. Read `ImagePopup.js` — understand the render logic, positioning, and z-index
2. Read `ColorTab.js` — understand how hover state is set and where ImagePopup is placed in the component tree
3. Read `FloatingPanel.js` — understand the panel's CSS stacking context (backdrop-filter creates a new stacking context!)
4. Check if `overflow: hidden` on any ancestor is clipping the popup
5. Check if `backdrop-filter` on the panel creates a stacking context that traps the popup's z-index
6. Check if the popup needs to be rendered via a React portal to escape the panel's stacking context

**iFence preview images for colors** are already saved in `assets/ifence_previews/gate_colors/` (5 images).

**Expected behavior:** When user hovers over a color swatch, a larger preview image appears showing a gate in that color (similar to iFence's hover behavior).

### 2. Fence Button → Text Link

**Current:** Styled button in the nav bar.

**Target:** Simple text link with:
- White text, no background, no border
- Small right-arrow icon (→) after text
- On hover: arrow animates right (translateX 3-4px, ease transition)
- Links to grandviewfence.com

### 3. Next Button → Solid Orange

**Current:** White default, orange only on hover.

**Target:** Solid orange fill (`--cta`: #d4753a) at all times. White text. This is the primary action button — it should look like one.

### 4. Back Button

**Current:** Darker text, subtle appearance.

**Target:** Keep as-is. Current styling is fine.

## Dependencies

- None — fully self-contained UI work
- No Playwright needed
- No renderer changes

## Risks

- **Color popup is the main risk.** `backdrop-filter` creates a new stacking context in CSS, which means child z-index values are trapped within that context. If ImagePopup renders inside the FloatingPanel, its z-index cannot exceed the panel's stacking level relative to elements outside the panel. The fix may require:
  - Rendering the popup via React portal to `document.body`
  - Or restructuring the z-index hierarchy
  - Or moving the popup outside the panel's DOM tree
- Nav button tweaks are low-risk CSS changes.

## Constraints

- Design tokens must be used (--cta, --brand, --text-primary)
- No emojis in UI
- Separators use `|` pipes (no em dashes)
