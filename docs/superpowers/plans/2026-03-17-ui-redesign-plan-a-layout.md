# UI Redesign Plan A: Layout Shell + Data Fixes

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark sidebar layout with the new sky-blue top nav + dark viewport + flyout panel + sky-blue bottom strip + backlinks footer structure. All 7 tabs render placeholder content. Config state flows correctly.

**Architecture:** New layout components (TopNav, BottomStrip, FlyoutPanel, BacklinksFooter) replace Nav.js and Sidebar.js. app.js orchestrates state. styles.css is rewritten. UnifiedCanvas stays unchanged internally. Each component is a React functional component using inline styles (matching existing pattern).

**Tech Stack:** React 17, Three.js r86 (unchanged), webpack

**Spec:** `docs/superpowers/specs/2026-03-17-ui-redesign-design.md`
**Mockup reference:** `mockup-v6.html`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `configData.js` | Modify | Fix heights, arch naming, finial naming, add displayName to colors |
| `styles.css` | Rewrite | New CSS custom properties + layout classes |
| `TopNav.js` | Create | Sky blue nav: logo, brand, scene tabs, quote button |
| `BottomStrip.js` | Create | Sky blue strip: 7 config tab buttons |
| `FlyoutPanel.js` | Create | Dark panel container: header + body with slide animation |
| `BacklinksFooter.js` | Create | 17 SEO links to grandviewfence.com |
| `app.js` | Modify | New layout, add `mount` + `activeConfigTab` to state, remove Sidebar/Nav imports |

---

### Task 1: Fix configData.js

**Files:**
- Modify: `configData.js`

- [ ] **Step 1: Remove 36" and 54" from HEIGHTS**

```js
export var HEIGHTS = [
  { id: '48', label: '48"' },
  { id: '60', label: '60"' },
  { id: '72', label: '72"' },
];
```

- [ ] **Step 2: Add displayName to COLORS**

Add a `displayName` property to each color for consumer-facing UI:

```js
export var COLORS = [
  { id: 0, name: 'Textured Khaki',   displayName: 'Beige',        hex: '#cdbeaf', threeHex: 0xcdbeaf, metalness: 0.2, roughness: 0.4, envMapIntensity: 2.6, bumpScale: 0.002,  ao: 0.8 },
  { id: 1, name: 'Gloss Bronze',     displayName: 'Bronze',       hex: '#42382c', threeHex: 0x42382c, metalness: 0.3, roughness: 0.1, envMapIntensity: 4.0, bumpScale: 0.0001, ao: 0.8 },
  { id: 2, name: 'Textured Bronze',  displayName: 'Satin Bronze', hex: '#42382c', threeHex: 0x42382c, metalness: 0.3, roughness: 0.4, envMapIntensity: 5.5, bumpScale: 0.0015, ao: 0.8 },
  { id: 3, name: 'Gloss White',      displayName: 'White',        hex: '#f4f4f4', threeHex: 0xF8F5F6, metalness: 0.2, roughness: 0.2, envMapIntensity: 2.5, bumpScale: 0.0001, ao: 0.5 },
  { id: 4, name: 'Textured White',   displayName: 'Satin White',  hex: '#f2f2f2', threeHex: 0xF8F5F6, metalness: 0.1, roughness: 0.2, envMapIntensity: 2.5, bumpScale: 0.002,  ao: 0.3 },
  { id: 5, name: 'Gloss Black',      displayName: 'Black',        hex: '#090909', threeHex: 0x080808, metalness: 0.2, roughness: 0.2, envMapIntensity: 8.0, bumpScale: 0.0001, ao: 1.0 },
  { id: 6, name: 'Textured Black',   displayName: 'Satin Black',  hex: '#0c0c0c', threeHex: 0x0c0c0c, metalness: 0.2, roughness: 0.4, envMapIntensity: 9.0, bumpScale: 0.0015, ao: 1.0 },
  { id: 7, name: 'Silver',           displayName: 'Silver',       hex: '#c8c8c8', threeHex: 0xFEF8F2, metalness: 0.8, roughness: 0.2, envMapIntensity: 5.5, bumpScale: 0.0002, ao: 0.6 },
];
```

- [ ] **Step 3: Rename Royal → Reverse in ARCH_STYLES**

```js
export var ARCH_STYLES = [
  { id: 'e', name: 'Estate' },
  { id: 'a', name: 'Arched' },
  { id: 'r', name: 'Reverse' },
  { id: 's', name: 'Standard' },
];
```

- [ ] **Step 4: Rename Pyramid → Plug in FINIALS**

```js
export var FINIALS = [
  { id: 'fs', name: 'Spear',   model: 'fs' },
  { id: 'ft', name: 'Trident', model: 'ft' },
  { id: 'fq', name: 'Quad',    model: 'fq' },
  { id: 'fp', name: 'Plug',    model: 'fp' },
];
```

- [ ] **Step 5: Verify app still loads**

Run: `npm start`
Expected: App loads, gate renders, no errors.

- [ ] **Step 6: Commit**

```bash
git add configData.js
git commit -m "fix: remove invalid gate heights, fix arch/finial names, add color displayNames"
```

---

### Task 2: Rewrite styles.css

**Files:**
- Rewrite: `styles.css`

- [ ] **Step 1: Replace styles.css with new design system**

Replace the entire file with CSS custom properties and layout classes matching the spec. The key classes needed:

```css
/* Root variables */
:root {
  --sky: #6BA3C2;
  --sky-dark: #5A8FAD;
  --accent: #d4753a;
  --accent-hover: #e8844a;
  --accent-glow: rgba(212,117,58,0.3);
  --dark: #0c1018;
  --dark-panel: #0e1420;
  --text: #f0f2f5;
  --text-muted: rgba(240,242,245,0.5);
  --text-dim: rgba(240,242,245,0.3);
  --border: rgba(255,255,255,0.07);
  --glass: rgba(255,255,255,0.04);
}

/* Reset */
* { box-sizing: border-box; }
html, body { height: 100%; margin: 0; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--dark);
  color: var(--text);
  overflow: hidden;
}

/* App shell */
.app-shell { display: flex; flex-direction: column; height: 100vh; }

/* Top nav - sky blue */
.topnav { /* styles from spec: 72px, sky gradient, flex between */ }

/* Viewport - flex:1, dark bg, contain image */
.viewport-wrap { flex: 1; position: relative; overflow: hidden; background: var(--dark); }

/* Flyout - 285px, no scroll, dark panel */
.flyout { height: 285px; overflow: hidden; background: var(--dark-panel); }

/* Bottom strip - sky blue, 52px */
.bottom-strip { height: 52px; background: linear-gradient(0deg, var(--sky-dark), var(--sky)); }

/* Backlinks footer */
.backlinks { padding: 8px; background: var(--dark); }

/* Slide animation for tab content */
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(70px); }
  to { opacity: 1; transform: translateX(0); }
}
.slide-in { animation: slideInRight 0.55s cubic-bezier(0.22, 1, 0.36, 1); }
```

Include all the detailed styles from `mockup-v6.html` — this is the reference implementation. Copy the exact CSS from the mockup, organized with comments for each section.

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "feat: rewrite styles.css with new design system — sky blue, dark viewport, orange accents"
```

---

### Task 3: Create Layout Components

**Files:**
- Create: `TopNav.js`
- Create: `BottomStrip.js`
- Create: `FlyoutPanel.js`
- Create: `BacklinksFooter.js`

- [ ] **Step 1: Create TopNav.js**

React functional component. Props: `activeScene` (string), `onSceneChange` (function).

Renders: sky-blue nav bar with logo (80px, from `assets/logo.png`), "Grandview" white + "Fence" dark navy + "DESIGN STUDIO" subtitle, vertical divider, 4 scene tabs (Driveway Gates / Front Yard / Back Yard / Draw Your Yard NEW), ghost "Get Instant Quote →" button.

Active tab has orange underline. No ™ symbols. Use inline styles matching mockup-v6.html CSS.

- [ ] **Step 2: Create BottomStrip.js**

Props: `activeTab` (string), `onTabChange` (function).

Renders: sky-blue strip with 7 buttons — Style, Color, Size, Options, Puppy Pickets, Details, Quote. Active tab has white top border + white text + slight bg fill. All uppercase, 13px, weight 700.

Tab IDs: `'style'`, `'color'`, `'size'`, `'options'`, `'puppyPickets'`, `'details'`, `'quote'`

- [ ] **Step 3: Create FlyoutPanel.js**

Props: `activeTab` (string), `config` (object), `onConfigChange` (function).

For now, renders a dark panel (285px) with a header showing the tab name and a body showing placeholder text like "Style tab content coming soon". The body div gets the `slide-in` CSS class, re-triggered on tab change by toggling a key.

The slide animation is triggered by changing the React `key` prop on the content div when `activeTab` changes, forcing React to remount and replay the CSS animation.

- [ ] **Step 4: Create BacklinksFooter.js**

No props. Static component.

Renders: 17 `<a>` tags linking to grandviewfence.com pages. All links have `target="_blank"` and `rel="noopener"`. Orange hover color. 11px text. Separated by · dots.

Links: Home, All Fencing, Residential, Pool & Safety, Privacy, Gates, Accessories, Horizon, Horizon Pro, Vanguard, Haven, Charleston, Savannah, Get a Quote, Blog, About, Pet-Safe.

- [ ] **Step 5: Verify each component renders in isolation**

Import each into app.js temporarily and check they render without errors.

- [ ] **Step 6: Commit**

```bash
git add TopNav.js BottomStrip.js FlyoutPanel.js BacklinksFooter.js
git commit -m "feat: create layout shell components — TopNav, BottomStrip, FlyoutPanel, BacklinksFooter"
```

---

### Task 4: Wire Layout in app.js

**Files:**
- Modify: `app.js`

- [ ] **Step 1: Add new state variables**

```js
const [activeScene, setActiveScene] = useState('gates');
const [activeConfigTab, setActiveConfigTab] = useState('style');
```

Add `mount: 'p'` to the initial config object.

- [ ] **Step 2: Replace the DesignStudio layout**

Remove: `<Nav>` and `<Sidebar>` imports and usage.
Add: `<TopNav>`, `<BottomStrip>`, `<FlyoutPanel>`, `<BacklinksFooter>`.

New layout structure:
```jsx
<div className="app-shell">
  <TopNav activeScene={activeScene} onSceneChange={setActiveScene} />
  <div className="viewport-wrap">
    <UnifiedCanvas config={config} />
  </div>
  <FlyoutPanel activeTab={activeConfigTab} config={config} onConfigChange={setConfig} />
  <BottomStrip activeTab={activeConfigTab} onTabChange={setActiveConfigTab} />
  <BacklinksFooter />
</div>
```

- [ ] **Step 3: Remove old imports**

Remove `import Nav from './Nav'` and `import Sidebar from './Sidebar'`. Add imports for the 4 new components.

- [ ] **Step 4: Remove old inline styles**

Remove the `styles` object at the bottom of app.js (shell, container, canvasArea, placeholder, placeholderText). Layout is now handled by CSS classes in styles.css.

- [ ] **Step 5: Verify the new layout renders**

Run: `npm start`
Expected: Sky blue top nav with logo + tabs, dark viewport with 3D gate, dark flyout panel with placeholder text, sky blue bottom strip with 7 tabs, backlinks footer. Clicking bottom tabs changes the flyout placeholder text with slide animation.

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: wire new layout shell — TopNav, FlyoutPanel, BottomStrip, BacklinksFooter replace Sidebar"
```

---

## What This Plan Produces

After Plan A, you have:
- New layout rendering correctly with sky blue nav bars, dark viewport, flyout panel, backlinks
- 7 bottom tabs that switch flyout content (placeholder for now)
- Config state flowing from app.js to UnifiedCanvas (3D gate still renders)
- configData.js cleaned up (heights, names, displayNames)
- All old sidebar/nav code removed

**Next:** Plan B implements the 7 tab content components (StyleTab, ColorTab, SizeTab, OptionsTab, PuppyPicketsTab, DetailsTab, QuoteTab) and wires them to the config.
