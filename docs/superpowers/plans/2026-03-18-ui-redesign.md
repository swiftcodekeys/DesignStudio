# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current dark flyout+bottom-strip layout with a light-theme frosted floating panel over the full-screen viewport, using iFence-style image popups for colors and details.

**Architecture:** The FloatingPanel component replaces both FlyoutPanel and BottomStrip. It contains tabs internally, renders tab content from existing tab components (restyled), and manages its own collapse state. The viewport fills the entire area below the nav. CSS is rewritten with a documented light-theme design system.

**Tech Stack:** React (no hooks beyond useState/useEffect/useRef), Webpack, vanilla CSS, existing Three.js r86 renderer.

**Spec:** `docs/superpowers/specs/2026-03-18-ui-redesign-design.md`
**Approved mockup:** `.superpowers/brainstorm/3139-1773802877/mockup-e-light-floating.html`

---

### Task 1: Replace CSS Design System

**Files:**
- Modify: `styles.css` (complete rewrite of design tokens + component styles)

This is the foundation — all other tasks depend on it.

- [ ] **Step 1: Replace CSS design tokens**

Replace the `:root` block in `styles.css` with the light-theme design system:

```css
:root {
  --brand: #6BA3C2;
  --brand-dark: #5A8FAD;
  --brand-light: #e8f2f8;
  --cta: #d4753a;
  --cta-hover: #c06830;
  --cta-glow: rgba(212,117,58,0.25);
  --nav-bg: #0c1420;
  --panel: rgba(255,255,255,0.95);
  --panel-solid: #ffffff;
  --text-primary: #1a1a2e;
  --text-secondary: #5a6270;
  --text-hint: #8e95a0;
  --border: #e8eaed;
  --border-hover: #d0d4da;
  --card-bg: #f0f2f5;
  --active-bg: rgba(107,163,194,0.1);
  --active-border: #6BA3C2;
}
```

- [ ] **Step 2: Replace body/reset styles**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--nav-bg);
  color: var(--text-primary);
  overflow: hidden;
  height: 100vh;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Rewrite app-shell to flexbox column**

```css
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
```

- [ ] **Step 4: Rewrite topnav CSS for dark nav, 56px height**

Slim the nav to 56px. Keep sky-blue gradient. Add styles for `.nav-btn` and `.nav-btn.cta` for Reset/Save Image/Get Quote buttons in the nav. Reference mockup-e for exact values.

- [ ] **Step 5: Rewrite viewport CSS**

```css
.viewport-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: var(--nav-bg);
}
```

- [ ] **Step 6: Write floating panel CSS**

New `.float-panel` class with: `position: absolute; right: 20px; top: 14px; bottom: 14px; width: 370px; background: var(--panel); backdrop-filter: blur(20px); border-radius: 16px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 48px rgba(0,0,0,0.25);` Plus `.panel-tabs`, `.panel-tab`, `.panel-header`, `.panel-body`, `.panel-footer` styles. Reference mockup-e CSS.

- [ ] **Step 7: Write light-theme style card CSS**

`.style-item` with white bg, `#e8eaed` border, hover lift, active state with `--brand` border + `--active-bg`. `.style-thumb` at 72x54px. `.style-name` in `--text-primary`, `.style-sub` in `--text-secondary`. Badges: `.b-popular`, `.b-puppy`, `.b-pool`, `.b-classic` (keep existing colors).

- [ ] **Step 8: Write light-theme color swatch CSS**

Restyle `.swatch-row` and `.swatch-group` for light backgrounds. Swatch circles get white border, active gets `--brand` border.

- [ ] **Step 9: Write light-theme control button CSS**

`.ctrl-btn` gets light bg, `--border` border, `--text-secondary` color. Active gets `--brand` border + `--active-bg`.

- [ ] **Step 10: Write light-theme option card CSS**

`.opt-card` gets white bg, `--border` border, hover lift. Active gets `--brand` border.

- [ ] **Step 11: Write light-theme quote layout CSS**

Restyle `.quote-layout`, `.quote-row`, buttons for light theme.

- [ ] **Step 12: Write image popup CSS**

```css
.img-popup {
  position: fixed;
  z-index: 200;
  background: var(--panel-solid);
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
  border: 1px solid var(--border);
  padding: 8px;
  animation: popIn 0.2s cubic-bezier(0.22,1,0.36,1);
}
.img-popup img {
  max-width: 280px;
  max-height: 200px;
  border-radius: 8px;
  display: block;
}
@keyframes popIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 13: Write viewport overlay CSS (social pill, backlinks, collapse handle)**

Social pill: `rgba(0,0,0,0.5)` with blur. Backlinks: gradient fade from bottom. Collapse handle: white rounded rect on panel left edge.

- [ ] **Step 14: Remove old bottom-strip and flyout CSS**

Delete the `.bottom-strip`, `.strip-tab`, `.flyout`, `.flyout-header`, `.flyout-body`, `.flyout-content`, `.flyout-selected`, `.flyout-title`, `.flyout-placeholder` rules.

- [ ] **Step 15: Verify build works**

Run: `cd "C:/Users/sarah/Desktop/App Repos/Testing-VS code/designstudio/designstudio/designstudioworkingmvp" && npx webpack --mode development`
Expected: Builds without CSS errors.

- [ ] **Step 16: Commit**

```bash
git add styles.css
git commit -m "feat(ui): replace dark theme with light-theme design system"
```

---

### Task 2: Create FloatingPanel Component

**Files:**
- Create: `FloatingPanel.js`
- Delete: `BottomStrip.js` (functionality moves into FloatingPanel)

- [ ] **Step 1: Create FloatingPanel.js**

The component wraps: panel tabs (replacing BottomStrip), panel header (from FlyoutPanel header logic), scrollable panel body (renders active tab content), and panel footer (progress dots + Next button).

Props: `activeTab`, `onTabChange`, `config`, `onConfigChange`, `collapsed`, `onToggleCollapse`

```jsx
import React from 'react';
import { FENCE_STYLES, COLORS, ARCH_STYLES } from './configData';
import StyleTab from './tabs/StyleTab';
import ColorTab from './tabs/ColorTab';
import SizeTab from './tabs/SizeTab';
import OptionsTab from './tabs/OptionsTab';
import PuppyPicketsTab from './tabs/PuppyPicketsTab';
import DetailsTab from './tabs/DetailsTab';
import QuoteTab from './tabs/QuoteTab';

var TABS = [
    { id: 'style', label: 'Style' },
    { id: 'color', label: 'Color' },
    { id: 'size', label: 'Size' },
    { id: 'options', label: 'Options' },
    { id: 'puppy', label: 'Puppy' },
    { id: 'details', label: 'Details' },
    { id: 'quote', label: 'Quote' },
];

// ... (see spec for header logic — reuse getHeader from FlyoutPanel.js)
// ... renderTabContent — same switch as FlyoutPanel.js
```

Include progress dots in footer (reuse ProgressIndicator logic inline), Next/Back buttons that advance `activeTab`.

- [ ] **Step 2: Verify it renders**

Import in app.js temporarily alongside existing components. Run dev server, check for errors.

- [ ] **Step 3: Commit**

```bash
git add FloatingPanel.js
git commit -m "feat(ui): create FloatingPanel component"
```

---

### Task 3: Rewire app.js Layout

**Files:**
- Modify: `app.js`
- Modify: `TopNav.js`

- [ ] **Step 1: Update app.js layout**

Replace:
```jsx
<FlyoutPanel activeTab={activeConfigTab} config={config} onConfigChange={setConfig} />
<BottomStrip activeTab={activeConfigTab} onTabChange={setActiveConfigTab} />
```
With:
```jsx
<FloatingPanel
    activeTab={activeConfigTab}
    onTabChange={setActiveConfigTab}
    config={config}
    onConfigChange={setConfig}
    collapsed={panelCollapsed}
    onToggleCollapse={function() { setPanelCollapsed(!panelCollapsed); }}
/>
```

Add `useState(false)` for `panelCollapsed`.

Move `<ProgressIndicator>` and `<SocialProof>` — ProgressIndicator moves into FloatingPanel footer, SocialProof stays as viewport overlay.

Remove `<BacklinksFooter />` from the bottom — backlinks become a viewport overlay (absolute positioned at viewport bottom with gradient fade).

- [ ] **Step 2: Update TopNav.js**

Add Reset, Save Image buttons to the right side of the nav. Pass `onReset` prop from app.js.

```jsx
<div className="topnav-right">
    <button className="nav-btn" onClick={onReset}>↺ Reset</button>
    <button className="nav-btn" onClick={onSaveImage}>📷 Save Image</button>
    <button className="nav-btn cta">Get Quote →</button>
</div>
```

Add `onReset` handler in app.js that resets config to defaults.

- [ ] **Step 3: Move BacklinksFooter into viewport as overlay**

Change the backlinks from a separate div after the viewport to an absolutely positioned element inside `.viewport-wrap`:

```jsx
<div className="viewport-wrap">
    <UnifiedCanvas config={config} />
    <SocialProof />
    <BacklinksFooter />  {/* now absolutely positioned via CSS */}
    <FloatingPanel ... />
</div>
```

- [ ] **Step 4: Remove old imports**

Remove `import BottomStrip` and `import FlyoutPanel` from app.js. Remove `import ProgressIndicator` (logic moves into FloatingPanel).

- [ ] **Step 5: Test full layout**

Run: `npm start`
Verify: Dark nav at top, full-screen viewport with gate bg, white floating panel on right, backlinks fading at bottom.

- [ ] **Step 6: Commit**

```bash
git add app.js TopNav.js FloatingPanel.js
git commit -m "feat(ui): rewire app layout to floating panel"
```

---

### Task 4: Restyle Tab Components for Light Theme

**Files:**
- Modify: `tabs/StyleTab.js`
- Modify: `tabs/ColorTab.js`
- Modify: `tabs/SizeTab.js`
- Modify: `tabs/OptionsTab.js`
- Modify: `tabs/PuppyPicketsTab.js`
- Modify: `tabs/DetailsTab.js`
- Modify: `tabs/QuoteTab.js`

- [ ] **Step 1: Restyle StyleTab**

Change `.style-grid` from horizontal row to vertical `.style-list` (list format for floating panel — see mockup-e). Each card becomes a `.style-item` row: 72x54 thumbnail + name/subtitle + badge. Use actual thumbnail images from `gate_tool/th/th_st_*.jpg`.

- [ ] **Step 2: Restyle ColorTab**

Keep circle swatches but update colors for light theme. Change text from light-on-dark to dark-on-light. Update the warranty text color.

- [ ] **Step 3: Restyle SizeTab**

Update `.ctrl-btn` references — the CSS handles the light styling, but verify inline styles are removed. Update the "not available" text for dark-on-light.

- [ ] **Step 4: Restyle OptionsTab**

Update `.opt-card` and `.ctrl-btn` — CSS handles it. Remove any inline dark-theme styles.

- [ ] **Step 5: Restyle PuppyPicketsTab**

Update "not available" message for light theme. Remove inline dark-theme styles.

- [ ] **Step 6: Restyle DetailsTab**

Update any inline styles. Remove dark-theme color references.

- [ ] **Step 7: Restyle QuoteTab**

Update `.quote-layout`, `.quote-row`, `.quote-contact` for light theme. Update inline styles.

- [ ] **Step 8: Test all tabs**

Click through each tab in the floating panel. Verify text is readable (dark on light), thumbnails load, active states work.

- [ ] **Step 9: Commit**

```bash
git add tabs/
git commit -m "feat(ui): restyle all tab components for light theme"
```

---

### Task 5: Add Image Popup Component

**Files:**
- Create: `ImagePopup.js`
- Modify: `tabs/ColorTab.js`
- Modify: `tabs/DetailsTab.js`
- Modify: `tabs/PuppyPicketsTab.js`

- [ ] **Step 1: Create ImagePopup.js**

A simple popup component that positions itself near the hovered element and shows an enlarged thumbnail image.

```jsx
import React from 'react';

var ImagePopup = function(props) {
    var src = props.src;
    var alt = props.alt;
    var position = props.position; // { top, left }

    if (!src) return null;

    return (
        <div className="img-popup" style={{ top: position.top, left: position.left }}>
            <img src={src} alt={alt} />
            <div className="img-popup-label">{alt}</div>
        </div>
    );
};

export default ImagePopup;
```

- [ ] **Step 2: Add hover popup to ColorTab**

On hover over a color swatch, show the enlarged swatch with the color name. Since we don't have per-color fence photos yet, show the swatch at larger size with the full color name and texture type (Gloss vs Textured).

- [ ] **Step 3: Add hover popup to DetailsTab**

On hover over post cap, finial, or accent cards, show the thumbnail at larger size (280px wide). Use existing `gate_tool/th/` images.

- [ ] **Step 4: Add hover popup to PuppyPicketsTab**

On hover over puppy picket variant cards, show enlarged thumbnail.

- [ ] **Step 5: Test popups**

Hover over colors, post caps, finials, puppy pickets. Verify popup appears near cursor, shows correct image, dismisses on mouse leave.

- [ ] **Step 6: Commit**

```bash
git add ImagePopup.js tabs/ColorTab.js tabs/DetailsTab.js tabs/PuppyPicketsTab.js
git commit -m "feat(ui): add iFence-style image popups for colors and details"
```

---

### Task 6: Add Collapse Toggle + Reset Button

**Files:**
- Modify: `FloatingPanel.js` (collapse animation)
- Modify: `app.js` (reset handler)
- Modify: `styles.css` (collapse animation CSS)

- [ ] **Step 1: Add collapse/expand animation to FloatingPanel**

When `collapsed` is true, panel slides off-screen right with CSS transform. Show collapse handle (‹/›) that toggles.

```css
.float-panel.collapsed {
  transform: translateX(calc(100% + 20px));
}
.collapse-handle {
  position: absolute;
  right: 397px; /* panel width + gap */
  top: 50%;
  transform: translateY(-50%);
  /* ... see mockup CSS */
}
.float-panel.collapsed ~ .collapse-handle {
  right: 20px;
}
```

- [ ] **Step 2: Implement reset handler in app.js**

```javascript
var handleReset = function() {
    setConfig(defaultConfig);
    setActiveConfigTab('style');
};
```

Pass to TopNav as `onReset={handleReset}`.

- [ ] **Step 3: Test collapse + reset**

Click collapse handle — panel should slide away, viewport fills. Click again — panel returns. Click Reset — config returns to defaults, tab goes to Style.

- [ ] **Step 4: Commit**

```bash
git add FloatingPanel.js app.js styles.css
git commit -m "feat(ui): add panel collapse toggle and reset button"
```

---

### Task 7: Cleanup + Delete Old Components

**Files:**
- Delete: `BottomStrip.js`
- Delete: `FlyoutPanel.js` (replaced by FloatingPanel)
- Modify: `ProgressIndicator.js` (may be unused if logic moved inline)

- [ ] **Step 1: Delete BottomStrip.js**

```bash
git rm BottomStrip.js
```

- [ ] **Step 2: Delete FlyoutPanel.js**

```bash
git rm FlyoutPanel.js
```

- [ ] **Step 3: Clean up ProgressIndicator.js**

If the progress logic was moved inline into FloatingPanel, delete this file. If it's still imported, keep it.

- [ ] **Step 4: Verify no broken imports**

Run: `npx webpack --mode development`
Expected: No errors. All imports resolve.

- [ ] **Step 5: Test full flow end-to-end**

Open in browser. Click through all 7 tabs. Change style, color, size, options, puppy pickets, details. Verify all work. Check Quote tab shows correct summary. Test Reset button. Test Save Image. Test collapse. Check backlinks visible at bottom.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(ui): remove old FlyoutPanel and BottomStrip components"
```
