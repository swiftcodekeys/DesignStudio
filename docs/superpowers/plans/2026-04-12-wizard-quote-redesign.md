# Wizard + QuoteBuilder + Gate Pricing Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the zone-aware wizard flow, rebuild the QuoteBuilder with all Ultra Easy Form fields, add gate auto-pricing, and create a combined multi-zone summary — so buyers get an instant, accurate quote while Grandview captures everything Ultra needs for manufacturing.

**Architecture:** Approach B (Shared Config, Per-Zone Layout). Style/color/height configured once, layout per-zone. Driveway gate zone breaks to 3D Design Studio then a short QuoteBuilder. Unified `gv_wizard_state` localStorage replaces scattered keys. New `priceData.js` + `priceCalculator.js` separate pricing data from logic.

**Tech Stack:** React 18, Webpack, vanilla CSS, Phosphor Icons, Three.js r86 (renderer — not touched in this plan)

**Spec:** `docs/superpowers/specs/2026-04-12-wizard-quote-redesign-design.md`

**No test framework installed.** Verification is manual: `npm start` → test in browser at localhost:3000.

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `priceData.js` | Ultra pricebook matrices — panels, posts, gates, accessories, surcharges. Data only, no logic. |
| `priceCalculator.js` | Pure pricing function. Takes a zone config, returns `{ items[], subtotal, warnings[] }`. Imports only from `priceData.js`. |
| `PoolPopup.js` | Single consolidated pool compliance popup. Shows compliant styles, auto-configures hardware/rails. |
| `ZoneTransitionPage.js` | "Same fence for [zone]?" transition screen between fence zones. |
| `ZoneQuoteSummary.js` | Combined summary after all zones — per-zone subtotals, grand total, edit links, checkout CTAs. |
| `QuoteStep1_Style.js` | Step 1: Grade, fence type, style, spacing, puppy, height, color, rails, post caps. |
| `QuoteStep2_Layout.js` | Step 2: Linear feet, terrain, racking, layout shape, post summary. |
| `QuoteStep3_Gates.js` | Step 3: Gate cards with type/width/top/swing/hardware per gate. |
| `QuoteStep4_Extras.js` | Step 4: Finials, accents, flange covers, paint kit. |
| `QuoteStep5_Shipping.js` | Step 5: Install plan, shipping address, contact info. |
| `QuoteStep6_Review.js` | Step 6: All selections summary, calculated materials, auto-pricing, edit links. |
| `InfoPopup.js` | Reusable (i) info popup component — photo + 2-3 sentence explanation. |
| `wizardState.js` | Unified state management — read/write `gv_wizard_state`, zone helpers. |

### Modified Files

| File | Change |
|------|--------|
| `WizardShell.js` | Zone ordering logic (pool→backyard first), pool popup trigger, "same fence?" transition, back buttons |
| `QuoteBuilder.js` | Gutted and rewired — becomes a thin shell that renders QuoteStep1-6 based on current step, manages step navigation |
| `app.js` | Route updates, import new components, wire unified state |
| `pricingEngine.js` | Import new priceCalculator for gate pricing, add missing surcharge logic |
| `retailPricing.js` | Add missing gloss colors, fix poolCompliant flags, add all gate hardware pricing |
| `configData.js` | Add grade definitions, privacy styles, width constants |
| `styles.css` | QuoteBuilder step styles, info popups, pool popup, zone transition, summary page |

---

## Phase 1: Foundation (Tasks 1-5)

Core infrastructure that everything else builds on.

---

### Task 1: Unified Wizard State Manager

**Files:**
- Create: `wizardState.js`

- [ ] **Step 1: Create wizardState.js with state shape and helpers**

```js
// wizardState.js — Unified wizard state management
// Single localStorage key replaces scattered gv_config, gv_fence_config, etc.

var STORAGE_KEY = 'gv_wizard_state';

var DEFAULT_ZONE_CONFIG = {
  config: null,       // { styleId, height, color, grade, spacing, puppy, ... }
  quoteData: null,    // { runs, corners, ends, gates, extras, ... }
  quoteResult: null,  // { items, subtotal, warnings }
  snapshotDataUrl: null,
  status: 'pending',  // 'pending' | 'configuring' | 'complete' | 'skipped'
};

var DEFAULT_STATE = {
  selectedZones: [],          // ['front', 'back', 'gate']
  currentZoneIndex: 0,
  poolCompliance: false,
  contactInfo: { name: '', email: '', phone: '' },
  shippingAddress: { street: '', city: '', state: '', zip: '' },
  installPlan: '',
  sameAsInstall: true,
  jobAddress: '',
  zoneQuotes: {},             // { front: {...}, back: {...}, gate: {...} }
};

function loadWizardState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return Object.assign({}, DEFAULT_STATE);
}

function saveWizardState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function getZoneQuote(state, zoneId) {
  return state.zoneQuotes[zoneId] || Object.assign({}, DEFAULT_ZONE_CONFIG);
}

function updateZoneQuote(state, zoneId, updates) {
  var zone = getZoneQuote(state, zoneId);
  var newZone = Object.assign({}, zone, updates);
  var newQuotes = Object.assign({}, state.zoneQuotes);
  newQuotes[zoneId] = newZone;
  return Object.assign({}, state, { zoneQuotes: newQuotes });
}

function getZoneOrder(state) {
  var zones = state.selectedZones.slice();
  // Gate always last
  var gateIdx = zones.indexOf('gate');
  if (gateIdx > -1) {
    zones.splice(gateIdx, 1);
    zones.push('gate');
  }
  // Pool → backyard first
  if (state.poolCompliance) {
    var backIdx = zones.indexOf('back');
    var frontIdx = zones.indexOf('front');
    if (backIdx > -1 && frontIdx > -1 && backIdx > frontIdx) {
      zones.splice(backIdx, 1);
      zones.splice(frontIdx, 0, 'back');
    }
  }
  return zones;
}

function getCurrentZoneId(state) {
  var order = getZoneOrder(state);
  return order[state.currentZoneIndex] || null;
}

function getGrandTotal(state) {
  var total = 0;
  Object.keys(state.zoneQuotes).forEach(function(zoneId) {
    var zone = state.zoneQuotes[zoneId];
    if (zone.quoteResult && zone.status === 'complete') {
      total += zone.quoteResult.subtotal || 0;
    }
  });
  return total;
}

function resetWizardState() {
  localStorage.removeItem(STORAGE_KEY);
  return Object.assign({}, DEFAULT_STATE);
}

export {
  loadWizardState, saveWizardState, getZoneQuote, updateZoneQuote,
  getZoneOrder, getCurrentZoneId, getGrandTotal, resetWizardState,
  DEFAULT_STATE, DEFAULT_ZONE_CONFIG,
};
```

- [ ] **Step 2: Verify module compiles**

Run: `npx webpack --mode development`
Expected: Build succeeds (wizardState.js has no imports that don't exist yet)

- [ ] **Step 3: Commit**

```bash
git add wizardState.js
git commit -m "feat: add unified wizard state manager (wizardState.js)"
```

---

### Task 2: Price Data Module

**Files:**
- Create: `priceData.js`

- [ ] **Step 1: Extract pricing constants from retailPricing.js into priceData.js**

This file is DATA ONLY — no functions, no logic. When the 2027 pricebook drops, this is the only file that changes.

```js
// priceData.js — Ultra Fence Pricebook (March 2026)
// DATA ONLY. No logic. Replace this file when new pricebook arrives.

// Gate widths available for auto-pricing
export var WALK_WIDTHS = [36, 42, 48, 60, 72];
export var DRIVE_WIDTHS_RES = [72, 84, 96, 120, 144];
export var DRIVE_WIDTHS_COMM = [72, 84, 96, 120, 144, 192];
export var DRIVE_WIDTHS_IND = [72, 84, 96, 120, 144, 192, 240];

// Gate hardware pricing
export var HARDWARE_PRICING = {
  hinges: {
    'standard':        33.50,   // per pair
    'truclose':        95.50,   // per pair, self-closing, pool code
    'ultra-adjustable': 333.50, // per pair, requires 4" posts
  },
  latches: {
    'lokklatch':          58.50,
    'magna-latch':       186.50,  // pool code approved
    'lokklatch-deluxe':  175.00,
    'lokklatch-magnetic': 227.00,
  },
  accessories: {
    'drop-rod':           39.25,  // auto-included for double gates
    'external-access':    33.50,
  },
};

// Surcharges
export var GATE_SURCHARGES = {
  arch: 43.25,          // per linear foot of gate width
  estate: 49.00,        // per linear foot
  uFrame: 19.00,        // per LF, required for singles >6', doubles >12'
};

// Puppy picket surcharges per panel
export var PUPPY_SURCHARGES = {
  residential: 57.00,
  commercial:  62.25,
  industrial:  72.50,
};

// Double punch for racking — per post
export var DOUBLE_PUNCH_PER_POST = 4.75;

// Silver premium multiplier
export var SILVER_PREMIUM = 0.25; // +25% on panels

// Decorative accessory pricing (per piece)
export var DECORATIVE_PRICING = {
  finials: { spear: 8.75, tri: 8.75, quad: 8.75, plug: 1.25 },
  accents: { circles: 11.00, butterflies: 17.00, scrolls: 79.25 },
  caps: {
    '2-flat': 7.75, '2-ball': 22.00,
    '2.5-flat': 10.25, '2.5-ball': 29.00,
    '3-flat': 12.75, '3-ball': 31.75,
    '4-flat': 18.50, '4-ball': 45.75,
  },
  flange: {
    '2': 21.50, '2.5': 27.00, '3': 34.50, '4': 45.75,
  },
};

// Finials per 6' panel section
export var FINIALS_PER_PANEL = 15;
// Accent pieces per 6' panel section
export var ACCENTS_PER_PANEL = 16;

// Panel length by grade
export var PANEL_LENGTH_FT = { residential: 6, commercial: 6, industrial: 8 };
```

- [ ] **Step 2: Verify build**

Run: `npx webpack --mode development`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add priceData.js
git commit -m "feat: add priceData.js — pricebook data separated from logic"
```

---

### Task 3: Price Calculator Module

**Files:**
- Create: `priceCalculator.js`

- [ ] **Step 1: Create priceCalculator.js — pure function, imports only from priceData.js**

```js
// priceCalculator.js — Pure pricing calculator
// Takes a zone config object, returns { items[], subtotal, warnings[] }
// Imports ONLY from priceData.js

import {
  HARDWARE_PRICING, GATE_SURCHARGES, PUPPY_SURCHARGES,
  DOUBLE_PUNCH_PER_POST, SILVER_PREMIUM, DECORATIVE_PRICING,
  FINIALS_PER_PANEL, ACCENTS_PER_PANEL, PANEL_LENGTH_FT,
  WALK_WIDTHS, DRIVE_WIDTHS_RES,
} from './priceData';

// Use existing retailPricing for panel/post/gate base prices
import {
  STYLES, PANEL_PRICING, POST_PRICING, GATE_PRICING,
  POST_LENGTH_MAP, DEFAULT_POST_SPEC, GATE_POST_SPEC,
  STYLE_TO_GATE_MODEL, GRADE_GATE_SUFFIX,
} from './retailPricing';

function calculateGateHardwareCost(gate) {
  var cost = 0;
  if (gate.hinge && HARDWARE_PRICING.hinges[gate.hinge]) {
    cost += HARDWARE_PRICING.hinges[gate.hinge];
  }
  if (gate.latch && HARDWARE_PRICING.latches[gate.latch]) {
    cost += HARDWARE_PRICING.latches[gate.latch];
  }
  if (gate.type === 'double') {
    cost += HARDWARE_PRICING.accessories['drop-rod'];
  }
  return cost;
}

function calculateGateSurcharges(gate) {
  var widthFt = (gate.widthInches || 36) / 12;
  var surcharge = 0;
  if (gate.top === 'arch') surcharge += GATE_SURCHARGES.arch * widthFt;
  if (gate.top === 'estate') surcharge += GATE_SURCHARGES.estate * widthFt;
  // U-frame required for wide gates
  if ((gate.type === 'walk' && gate.widthInches > 72) ||
      (gate.type !== 'walk' && gate.widthInches > 144)) {
    surcharge += GATE_SURCHARGES.uFrame * widthFt;
  }
  return surcharge;
}

export function calculateZoneQuote(config) {
  var items = [];
  var warnings = [];
  var grade = config.grade || 'residential';
  var panelLengthFt = PANEL_LENGTH_FT[grade] || 6;

  // Panels
  var linearFt = config.linearFeet || 0;
  var panelCount = Math.ceil(linearFt / panelLengthFt);
  var panelPrice = getPanelPriceLookup(config.style, config.height, grade);
  if (panelPrice && panelCount > 0) {
    var panelTotal = panelCount * panelPrice;
    // Silver premium
    if (config.color === 'silver' || config.color === 'SI') {
      panelTotal *= (1 + SILVER_PREMIUM);
    }
    items.push({ label: panelLengthFt + "' Panels", qty: panelCount, unitPrice: panelPrice, total: panelTotal });
  }

  // Posts
  var corners = config.corners || 0;
  var ends = config.ends || 2;
  var gateCount = (config.gates || []).length;
  var gatePosts = gateCount * 2;
  var totalPosts = panelCount + 1;
  var linePosts = Math.max(0, totalPosts - corners - ends - gatePosts);

  var postSpec = DEFAULT_POST_SPEC[grade];
  var postLength = POST_LENGTH_MAP[config.height];
  var postPrice = getPostPriceLookup(postSpec, postLength);

  if (postPrice) {
    if (linePosts > 0) items.push({ label: 'Line Posts (' + postSpec.size + '")', qty: linePosts, unitPrice: postPrice, total: linePosts * postPrice });
    if (corners > 0) items.push({ label: 'Corner Posts', qty: corners, unitPrice: postPrice, total: corners * postPrice });
    if (ends > 0) items.push({ label: 'End Posts', qty: ends, unitPrice: postPrice, total: ends * postPrice });
  }

  // Gate posts (always 4x4)
  if (gatePosts > 0) {
    var gatePostPrice = getGatePostPriceLookup(postLength);
    if (gatePostPrice) {
      items.push({ label: 'Gate Posts (4"x4")', qty: gatePosts, unitPrice: gatePostPrice, total: gatePosts * gatePostPrice });
    }
  }

  // Gates
  (config.gates || []).forEach(function(gate, i) {
    var gateLabel = (gate.type === 'walk' ? 'Walk' : gate.type === 'double' ? 'Double Drive' : 'Drive') + ' Gate (' + gate.widthInches + '")';
    var basePrice = getGatePriceLookup(config.style, config.height, gate.widthInches, gate.type, grade);
    var surcharges = calculateGateSurcharges(gate);
    var hwCost = calculateGateHardwareCost(gate);

    if (basePrice) {
      items.push({ label: gateLabel, qty: 1, unitPrice: basePrice + surcharges, total: basePrice + surcharges });
    } else {
      warnings.push('Gate ' + (i + 1) + ': price not available — custom quote required');
    }
    if (hwCost > 0) {
      items.push({ label: 'Hardware — Gate ' + (i + 1), qty: 1, unitPrice: hwCost, total: hwCost });
    }
  });

  // Post caps upgrade
  if (config.postCap === 'ball' && totalPosts > 0) {
    var capSize = postSpec.size.split('x')[0];
    var ballKey = capSize + '-ball';
    var flatKey = capSize + '-flat';
    var ballPrice = DECORATIVE_PRICING.caps[ballKey] || 0;
    var flatPrice = DECORATIVE_PRICING.caps[flatKey] || 0;
    var upgrade = ballPrice - flatPrice;
    if (upgrade > 0) {
      items.push({ label: 'Ball Cap Upgrade', qty: totalPosts, unitPrice: upgrade, total: totalPosts * upgrade });
    }
  }

  // Puppy pickets
  if (config.puppyPickets && panelCount > 0) {
    var puppyPrice = PUPPY_SURCHARGES[grade] || 0;
    if (puppyPrice > 0) {
      items.push({ label: 'Puppy Pickets', qty: panelCount, unitPrice: puppyPrice, total: panelCount * puppyPrice });
    }
  }

  // Finials
  if (config.finialType && config.finialType !== 'none') {
    var finialPrice = DECORATIVE_PRICING.finials[config.finialType] || 0;
    var finialQty = panelCount * FINIALS_PER_PANEL;
    if (finialPrice > 0) {
      items.push({ label: 'Finials (' + config.finialType + ')', qty: finialQty, unitPrice: finialPrice, total: finialQty * finialPrice });
    }
  }

  // Decorative accents
  ['circles', 'butterflies', 'scrolls'].forEach(function(accent) {
    if (config[accent]) {
      var accentPrice = DECORATIVE_PRICING.accents[accent] || 0;
      var accentQty = panelCount * ACCENTS_PER_PANEL;
      if (accentPrice > 0) {
        items.push({ label: accent.charAt(0).toUpperCase() + accent.slice(1), qty: accentQty, unitPrice: accentPrice, total: accentQty * accentPrice });
      }
    }
  });

  // Double punch (racking)
  if (config.rackingTier && config.rackingTier !== 'standard' && config.rackingTier !== 'stair-step') {
    var slopedPosts = config.slopedPostCount || totalPosts;
    items.push({ label: 'Double-Punch Posts (racking)', qty: slopedPosts, unitPrice: DOUBLE_PUNCH_PER_POST, total: slopedPosts * DOUBLE_PUNCH_PER_POST });
  }

  // Flange covers
  if (config.flangCovers && totalPosts > 0) {
    var flangeSize = postSpec.size.split('x')[0];
    var flangePrice = DECORATIVE_PRICING.flange[flangeSize] || 0;
    if (flangePrice > 0) {
      items.push({ label: 'Flange Covers', qty: totalPosts, unitPrice: flangePrice, total: totalPosts * flangePrice });
    }
  }

  var subtotal = items.reduce(function(sum, item) { return sum + (item.total || 0); }, 0);

  return { items: items, subtotal: Math.round(subtotal * 100) / 100, warnings: warnings };
}

// Internal lookup wrappers (same logic as pricingEngine.js but self-contained)
function getPanelPriceLookup(style, height, grade) {
  var s = STYLES[style];
  if (!s) return null;
  var model = s.ultraModel;
  if (grade === 'commercial') model += '-C';
  if (grade === 'industrial') model += '-I';
  if (!PANEL_PRICING[model]) return null;
  return PANEL_PRICING[model][height] || null;
}

function getPostPriceLookup(spec, postLength) {
  if (!spec || !postLength) return null;
  var table = POST_PRICING[spec.size];
  if (!table || !table[spec.wall]) return null;
  return table[spec.wall][postLength] || null;
}

function getGatePostPriceLookup(postLength) {
  if (!postLength) return null;
  var table = POST_PRICING[GATE_POST_SPEC.size];
  if (!table || !table[GATE_POST_SPEC.wall]) return null;
  return table[GATE_POST_SPEC.wall][postLength] || null;
}

function getGatePriceLookup(style, height, widthInches, type, grade) {
  var s = STYLES[style];
  if (!s) return null;
  var gateModel = STYLE_TO_GATE_MODEL[style];
  if (!gateModel) return null;
  var suffix = GRADE_GATE_SUFFIX[grade] || '';
  var fullModel = gateModel + suffix;
  var gateType = (type === 'walk') ? 'walk' : 'drive';
  if (!GATE_PRICING[fullModel] || !GATE_PRICING[fullModel][gateType]) return null;
  var heightTable = GATE_PRICING[fullModel][gateType][height];
  if (!heightTable) return null;
  return heightTable[widthInches] || null;
}
```

- [ ] **Step 2: Verify build**

Run: `npx webpack --mode development`
Expected: Build succeeds

- [ ] **Step 3: Quick smoke test — import in browser console**

Run: `npm start`
In browser console at localhost:3000:
```js
// Verify the module loaded (check webpack bundle for exports)
```

- [ ] **Step 4: Commit**

```bash
git add priceCalculator.js
git commit -m "feat: add priceCalculator.js — pure pricing function with hardware + surcharges"
```

---

### Task 4: InfoPopup Component

**Files:**
- Create: `InfoPopup.js`

- [ ] **Step 1: Create reusable info popup component**

```js
// InfoPopup.js — Reusable (i) info popup with image + explanation
// Used throughout QuoteBuilder for post types, racking, spacing, etc.

import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from '@phosphor-icons/react';

function InfoPopup(props) {
  var title = props.title;
  var text = props.text;
  var imageSrc = props.imageSrc;
  var imageAlt = props.imageAlt;
  var children = props.children;

  var [open, setOpen] = useState(false);
  var popupRef = useRef(null);

  useEffect(function() {
    if (!open) return;
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [open]);

  return React.createElement('span', { className: 'info-popup-wrapper', style: { position: 'relative', display: 'inline-flex', alignItems: 'center' } },
    React.createElement('button', {
      className: 'info-popup-trigger',
      onClick: function(e) { e.stopPropagation(); setOpen(!open); },
      'aria-label': 'More info about ' + (title || 'this option'),
    }, React.createElement(Info, { size: 16, weight: 'fill' })),
    open && React.createElement('div', { ref: popupRef, className: 'info-popup-content' },
      React.createElement('div', { className: 'info-popup-header' },
        title && React.createElement('span', { className: 'info-popup-title' }, title),
        React.createElement('button', { className: 'info-popup-close', onClick: function() { setOpen(false); } },
          React.createElement(X, { size: 14 })
        )
      ),
      imageSrc && React.createElement('img', { src: imageSrc, alt: imageAlt || title, className: 'info-popup-image' }),
      text && React.createElement('p', { className: 'info-popup-text' }, text),
      children
    )
  );
}

export default InfoPopup;
```

- [ ] **Step 2: Add CSS for info popup to styles.css**

Add at the end of `styles.css`:

```css
/* === Info Popup === */
.info-popup-wrapper { position: relative; display: inline-flex; align-items: center; }
.info-popup-trigger {
  width: 18px; height: 18px; border-radius: 50%; background: var(--border, #e8eaed);
  border: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  color: #666; margin-left: 4px; padding: 0; transition: background 0.15s;
}
.info-popup-trigger:hover { background: #d0d5dd; }
.info-popup-content {
  position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
  background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  border: 1px solid #e0e0e0; padding: 14px; width: 280px; z-index: 1000;
  animation: infoPopupIn 0.15s ease-out;
}
@keyframes infoPopupIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
.info-popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.info-popup-title { font-size: 13px; font-weight: 700; color: var(--text-primary, #1a1a2e); }
.info-popup-close { background: none; border: none; cursor: pointer; color: #999; padding: 2px; }
.info-popup-image { width: 100%; border-radius: 8px; margin-bottom: 8px; }
.info-popup-text { font-size: 12px; color: #555; line-height: 1.5; margin: 0; }
```

- [ ] **Step 3: Verify build and test popup renders**

Run: `npx webpack --mode development`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add InfoPopup.js styles.css
git commit -m "feat: add InfoPopup component — reusable (i) popups with image + explanation"
```

---

### Task 5: Pool Popup Component

**Files:**
- Create: `PoolPopup.js`

- [ ] **Step 1: Create consolidated pool compliance popup**

```js
// PoolPopup.js — Single pool compliance popup
// Shows at zone selection. Replaces the two separate pool popups.

import React from 'react';
import { SwimmingPool, Check, X } from '@phosphor-icons/react';

var POOL_STYLES = [
  { id: 'haven', name: 'Haven', desc: 'Built for pool code — flush bottom by design', recommended: true,
    image: 'assets/ifence_previews/gate_styles/boca_grande_45.png' },
  { id: 'horizon', name: 'Horizon Flush', desc: 'Flat top with flush bottom 2-rail variant',
    image: 'assets/ifence_previews/gate_styles/san_marino_15.png' },
];

function PoolPopup(props) {
  var onConfirm = props.onConfirm;
  var onCancel = props.onCancel;
  var selectedStyle = props.selectedStyle;
  var onStyleSelect = props.onStyleSelect;

  return React.createElement('div', { className: 'pool-popup-overlay' },
    React.createElement('div', { className: 'pool-popup' },
      React.createElement('div', { className: 'pool-popup-header' },
        React.createElement(SwimmingPool, { size: 20, weight: 'fill' }),
        React.createElement('div', null,
          React.createElement('div', { className: 'pool-popup-title' }, 'Pool Safety Requirements'),
          React.createElement('div', { className: 'pool-popup-subtitle' }, 'BOCA/IRC pool code compliance')
        ),
        React.createElement('button', { className: 'pool-popup-close', onClick: onCancel },
          React.createElement(X, { size: 18 })
        )
      ),
      React.createElement('p', { className: 'pool-popup-desc' },
        'Pool fencing must meet safety codes. We\'ll automatically configure your fence to comply:'
      ),
      React.createElement('div', { className: 'pool-popup-styles' },
        POOL_STYLES.map(function(style) {
          var isSel = selectedStyle === style.id;
          return React.createElement('button', {
            key: style.id,
            className: 'pool-style-card' + (isSel ? ' selected' : '') + (style.recommended ? ' recommended' : ''),
            onClick: function() { onStyleSelect(style.id); },
          },
            React.createElement('img', { src: style.image, alt: style.name, className: 'pool-style-img' }),
            React.createElement('div', { className: 'pool-style-name' }, style.name),
            style.recommended && React.createElement('span', { className: 'pool-style-badge' }, 'RECOMMENDED'),
            React.createElement('div', { className: 'pool-style-desc' }, style.desc)
          );
        })
      ),
      React.createElement('div', { className: 'pool-popup-auto' },
        React.createElement('strong', null, 'What we auto-configure for pool code:'),
        React.createElement('ul', null,
          React.createElement('li', null, 'Flush bottom rail (no gap at ground level)'),
          React.createElement('li', null, 'Self-closing hinges (D&D TruClose) on all gates'),
          React.createElement('li', null, 'Self-latching hardware (MagnaLatch) on all gates'),
          React.createElement('li', null, 'Gates swing outward (away from pool)'),
          React.createElement('li', null, 'Minimum 48" fence height')
        )
      ),
      React.createElement('div', { className: 'pool-popup-note' },
        'Always verify your local pool code requirements. Some jurisdictions have additional requirements.'
      ),
      React.createElement('button', { className: 'pool-popup-confirm', onClick: onConfirm },
        React.createElement(Check, { size: 16, weight: 'bold' }),
        ' Got It \u2014 Configure for Pool Code'
      )
    )
  );
}

export default PoolPopup;
```

- [ ] **Step 2: Add CSS for pool popup to styles.css**

Add at the end of `styles.css`:

```css
/* === Pool Popup === */
.pool-popup-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 2000;
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.pool-popup {
  background: #fff; border-radius: 16px; max-width: 440px; width: 90%; max-height: 90vh;
  overflow-y: auto; box-shadow: 0 8px 40px rgba(0,0,0,0.2);
}
.pool-popup-header {
  background: #3182CE; color: #fff; padding: 14px 16px; border-radius: 16px 16px 0 0;
  display: flex; align-items: center; gap: 10px;
}
.pool-popup-title { font-size: 15px; font-weight: 700; }
.pool-popup-subtitle { font-size: 11px; opacity: 0.8; }
.pool-popup-close { background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; margin-left: auto; }
.pool-popup-desc { padding: 14px 16px 0; font-size: 13px; color: #555; line-height: 1.5; }
.pool-popup-styles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px 16px; }
.pool-style-card {
  border: 1px solid #e0e0e0; border-radius: 10px; padding: 10px; text-align: center;
  cursor: pointer; background: #fff; transition: all 0.15s; position: relative;
}
.pool-style-card.selected { border: 2px solid #1B3A5C; background: #EBF0F7; }
.pool-style-card.recommended::before { content: ''; }
.pool-style-img { width: 100%; height: 60px; object-fit: contain; border-radius: 6px; margin-bottom: 6px; }
.pool-style-name { font-size: 13px; font-weight: 700; }
.pool-style-badge { background: #38A169; color: #fff; font-size: 8px; font-weight: 700; padding: 2px 6px; border-radius: 3px; }
.pool-style-desc { font-size: 10px; color: #888; margin-top: 2px; }
.pool-popup-auto {
  margin: 0 16px; padding: 12px; background: #EBF4FF; border-radius: 8px; font-size: 12px; color: #555; line-height: 1.6;
}
.pool-popup-auto ul { margin: 6px 0 0 16px; padding: 0; }
.pool-popup-auto li { margin-bottom: 2px; }
.pool-popup-note { margin: 10px 16px; padding: 8px 10px; background: #FFFBEB; border-radius: 6px; font-size: 10px; color: #666; }
.pool-popup-confirm {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: calc(100% - 32px); margin: 12px 16px 16px; padding: 14px;
  background: #3182CE; color: #fff; border: none; border-radius: 10px;
  font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.15s;
}
.pool-popup-confirm:hover { background: #2b6cb0; }
```

- [ ] **Step 3: Verify build**

Run: `npx webpack --mode development`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add PoolPopup.js styles.css
git commit -m "feat: add PoolPopup — single consolidated pool compliance popup"
```

---

## Phase 2: QuoteBuilder Steps (Tasks 6-12)

Each step is a separate component. QuoteBuilder.js becomes a thin shell.

---

### Task 6: QuoteBuilder Shell + Step 1 (Style & Config)

**Files:**
- Create: `QuoteStep1_Style.js`
- Modify: `QuoteBuilder.js`

- [ ] **Step 1: Create QuoteStep1_Style.js**

This is the largest step component. It includes: grade, fence type (ornamental/privacy), style selector, picket spacing (standard/pro), puppy picket add-on with sub-styles, height with silhouette, all 8 colors, rail count, bottom rail, post caps.

All fields pre-filled from Design Studio config via props. Every section has an InfoPopup for education.

Read the full spec Section 5 "Step 1: Style & Configuration" for field details. The component receives `data` (current config) and `update` (setter function) as props — same pattern as wizard-v3.jsx.

Key conditional logic to implement:
- Grade selection filters available heights and styles
- Pool compliance locks flush bottom, suggests Haven
- Style badges: POPULAR, POOL, PUPPY READY, SECURITY
- Pro spacing note about puppy not being needed
- Puppy + butterflies/scrolls → racking limited to Standard (warn in Step 2)
- Silver shows PREMIUM badge
- Privacy type triggers sub-type picker (aluminum/louvered/vinyl)

Image mappings (from spec Section 8):
- Styles: `assets/ifence_previews/gate_styles/` files
- Colors: `assets/ifence_previews/gate_colors/` files
- Post caps: `assets/ifence_previews/post_caps/` files
- Puppy: `gate_tool/th/th_pup_*.jpg` files (10 variants)
- Spacing: `assets/ifence_previews/config_options/extreme_spacing_116.png`
- Flush bottom: `assets/ifence_previews/config_options/resort_flush_bottom_93.png`
- Heights: User-provided family silhouette screenshots
- Grade cross-sections: User-provided cutaway diagrams

The component should be ~350-400 lines following the wizard-v3.jsx pattern (Section/ButtonGroup/PhotoPlaceholder helpers, inline styles for cards).

- [ ] **Step 2: Rewire QuoteBuilder.js as thin shell**

Replace the current 950-line QuoteBuilder with a step-navigation shell (~100 lines):
- Step indicator dots (1-6)
- Renders the active QuoteStepN component
- Back/Next footer buttons
- Persistent snapshot header (loads from `gv_saved_design` localStorage)
- Green "pre-filled from Design Studio" banner

Imports: QuoteStep1_Style (now), remaining steps as they're built (Tasks 7-11).

- [ ] **Step 3: Verify in browser**

Run: `npm start`
Navigate to quote builder. Verify:
- Step dots show 1-6
- Step 1 renders with grade, style, color, height, spacing, rails, post caps sections
- All iFence/Ultra thumbnail images load
- Selecting grade filters available heights
- Back button disabled on step 1, Next advances (to blank step 2 for now)

- [ ] **Step 4: Commit**

```bash
git add QuoteStep1_Style.js QuoteBuilder.js
git commit -m "feat: QuoteBuilder shell + Step 1 (Style & Config) with all fields"
```

---

### Task 7: Step 2 — Layout & Posts

**Files:**
- Create: `QuoteStep2_Layout.js`

- [ ] **Step 1: Create QuoteStep2_Layout.js**

Sections: total linear feet, terrain picker (flat/sloped/mixed), inline advanced toggle for per-run breakdown, rackability comparison (racked vs stair-stepped — conditional on terrain ≠ flat), layout shape (corners/ends/angles/curves), auto-calculated post summary.

Key features:
- Draw tool data pre-fill with green banner
- Simple mode default: total feet + single terrain
- Advanced toggle expands per-run breakdown inline
- Racking section only appears when terrain ≠ flat
- Post summary is read-only with "Adjust →" link for override
- Post size auto-selected by grade with "Change" option

Images for racking: source from Great Fence Wayback captures (save to `assets/education/`):
- `racking-standard.jpg`, `racking-rackable.jpg`, `racking-heavy.jpg`
- `stair-step-blank-post.jpg`
- `post-types-display.jpg`

Images for post types: Great Fence captures:
- `post-line.jpg`, `post-end.jpg`, `post-corner.jpg`

Conditional: if puppy pickets or butterfly scrolls selected in Step 1, show yellow warning that racking is limited to Standard tier.

~250-300 lines.

- [ ] **Step 2: Wire into QuoteBuilder shell**

Import QuoteStep2_Layout in QuoteBuilder.js, render for step index 1.

- [ ] **Step 3: Verify in browser**

Navigate to Step 2. Verify:
- Total feet input works
- Terrain cards show (flat selected by default)
- Advanced toggle reveals per-run breakdown
- Selecting "Sloped" shows racking section with racked/stair-step comparison
- Post summary calculates from footage + corners + ends
- Back button returns to Step 1

- [ ] **Step 4: Commit**

```bash
git add QuoteStep2_Layout.js QuoteBuilder.js
git commit -m "feat: Step 2 (Layout & Posts) with racking, post summary, advanced toggle"
```

---

### Task 8: Step 3 — Gates

**Files:**
- Create: `QuoteStep3_Gates.js`

- [ ] **Step 1: Create QuoteStep3_Gates.js**

Gate type reference cards (walk/drive/double with images), per-gate configuration cards (type, width, top style, swing, hardware section with hinge/latch selectors), "+ Add a gate" button, pool hardware auto-lock, estate/cantilever callout.

Key features:
- Width options filtered by gate type (walk: 36-72", drive: 72-144")
- Hardware per gate, not global
- Pool compliance auto-selects TruClose + MagnaLatch, shows blue banner
- Arched surcharge shown inline (+$43.25/LF)
- Double gates auto-include drop rod ($39.25)
- Ultra Adjustable hinges note: "Requires 4×4 posts"
- U-frame surcharge note for wide gates

Images: `assets/ifence_previews/gates/standard_3.png`, `arched_4.png`

~200-250 lines.

- [ ] **Step 2: Wire into QuoteBuilder shell**

- [ ] **Step 3: Verify in browser**

Add a gate, change type/width/hardware. Verify pool lockout works. Verify surcharge notes appear.

- [ ] **Step 4: Commit**

```bash
git add QuoteStep3_Gates.js QuoteBuilder.js
git commit -m "feat: Step 3 (Gates) with per-gate hardware, pool lockout, surcharges"
```

---

### Task 9: Step 4 — Extras & Upgrades

**Files:**
- Create: `QuoteStep4_Extras.js`

- [ ] **Step 1: Create QuoteStep4_Extras.js**

Finial selector (spear/tri/quad/plug — conditional on style type), panel accents checkboxes (circles/butterflies/scrolls — conditional), post accessories (flange covers, paint kit).

Pre-filled from Design Studio with green banner.

Images:
- Finials: `gate_tool/th/th_pc_spe.jpg`, `th_pc_tri.jpg`, `th_pc_qua.jpg`, `th_pc_plg.jpg`
- Accents: `gate_tool/th/th_acc_cir.jpg`, `th_acc_but.jpg`, `th_acc_scr.jpg`
- Also iFence: `assets/ifence_previews/gate_accent_choices/*.png`

Conditional logic:
- Spear-top styles → circles available, spear/tri/quad finials
- Flat-top styles → plug finials only, no circles
- Butterflies/scrolls → warn about racking limitation

~150 lines.

- [ ] **Step 2: Wire into QuoteBuilder shell**

- [ ] **Step 3: Verify in browser**

- [ ] **Step 4: Commit**

```bash
git add QuoteStep4_Extras.js QuoteBuilder.js
git commit -m "feat: Step 4 (Extras) with conditional finials, accents, accessories"
```

---

### Task 10: Step 5 — Install & Shipping + Step 6 — Review

**Files:**
- Create: `QuoteStep5_Shipping.js`
- Create: `QuoteStep6_Review.js`

- [ ] **Step 1: Create QuoteStep5_Shipping.js**

Install plan cards (DIY/contractor/not sure), shipping address fields, "same as install site?" toggle, contact info (zone 1 only — shows "Quoting as: [name]" on zone 2+).

~120 lines.

- [ ] **Step 2: Create QuoteStep6_Review.js**

All selections summary with edit links (clicking jumps to that step). Calculated materials breakdown using `calculateZoneQuote()` from priceCalculator.js. Running subtotal. Verification disclaimer. "Get Quote for [Zone Name] →" CTA button.

~200 lines.

- [ ] **Step 3: Wire both into QuoteBuilder shell**

- [ ] **Step 4: Verify full 6-step flow in browser**

Walk through all 6 steps. Verify:
- Step 1 selections carry through
- Step 6 review shows all selections with correct edit links
- Calculated materials update based on inputs
- Auto-pricing shows line items and subtotal
- CTA button works

- [ ] **Step 5: Commit**

```bash
git add QuoteStep5_Shipping.js QuoteStep6_Review.js QuoteBuilder.js
git commit -m "feat: Steps 5-6 (Shipping + Review) with auto-pricing and materials breakdown"
```

---

## Phase 3: Zone Flow (Tasks 11-13)

Wire the zone loop, transitions, and combined summary.

---

### Task 11: Zone Transition Page

**Files:**
- Create: `ZoneTransitionPage.js`

- [ ] **Step 1: Create ZoneTransitionPage.js**

"Same fence for your [zone]?" screen. Shows completed zone summary (style/color/height), two choices:
- "Same fence" → skip to layout-only QuoteBuilder
- "Different fence" → full QuoteBuilder

Props: `completedZoneName`, `completedConfig`, `nextZoneName`, `onSame`, `onDifferent`.

~80 lines.

- [ ] **Step 2: Add CSS**

- [ ] **Step 3: Commit**

```bash
git add ZoneTransitionPage.js styles.css
git commit -m "feat: ZoneTransitionPage — 'same fence?' transition between zones"
```

---

### Task 12: Combined Summary Page

**Files:**
- Create: `ZoneQuoteSummary.js`

- [ ] **Step 1: Create ZoneQuoteSummary.js**

Shows all completed zones with per-zone subtotals + grand total. Edit links per zone (return to that zone's QuoteBuilder). Three CTAs: "Order Now — We Verify Before We Build", "Submit Quote Request", "Talk to an Expert".

Uses `getGrandTotal()` from wizardState.js.

~250 lines.

- [ ] **Step 2: Add CSS**

- [ ] **Step 3: Commit**

```bash
git add ZoneQuoteSummary.js styles.css
git commit -m "feat: ZoneQuoteSummary — combined multi-zone summary with grand total"
```

---

### Task 13: Wire Zone Flow into WizardShell + app.js

**Files:**
- Modify: `WizardShell.js`
- Modify: `app.js`

- [ ] **Step 1: Update WizardShell.js**

Changes:
- Import PoolPopup, ZoneTransitionPage
- Zone ordering logic (pool → backyard first, gate always last)
- Pool popup triggers once at zone selection (replaces two separate popups)
- After zone 1 QuoteBuilder completes → show ZoneTransitionPage
- "Same fence" → pass config, skip style step in QuoteBuilder
- "Different fence" → full QuoteBuilder
- Gate zone → routes to Design Studio (existing flow), then short QuoteBuilder
- After all zones → route to ZoneQuoteSummary
- Back buttons on every screen
- Use wizardState.js for all state management

- [ ] **Step 2: Update app.js routing**

Add routes/views for:
- `zone-transition` → ZoneTransitionPage
- `zone-summary` → ZoneQuoteSummary
- Update QuoteBuilder routing to accept zone-scoped props
- Import new components

- [ ] **Step 3: Full end-to-end test in browser**

Test these scenarios:
1. **Single zone (backyard only):** zone select → QuoteBuilder 6 steps → summary
2. **Two zones, same fence:** front + back → configure front → "same fence?" → yes → layout-only for back → summary
3. **Two zones, different fence:** front + back → configure front → "same fence?" → no → full config for back → summary
4. **Pool + backyard:** select backyard + pool → pool popup → backyard goes first with Haven locked → front yard → summary
5. **Gate zone:** select gate → Design Studio → bridge → short QuoteBuilder → auto-price → summary
6. **All three zones:** front + back + gate → full flow → combined summary with grand total

- [ ] **Step 4: Commit**

```bash
git add WizardShell.js app.js
git commit -m "feat: wire zone flow — ordering, transitions, pool popup, back buttons"
```

---

## Phase 4: Polish (Tasks 14-15)

---

### Task 14: Update retailPricing.js + configData.js

**Files:**
- Modify: `retailPricing.js`
- Modify: `configData.js`

- [ ] **Step 1: Add missing data to retailPricing.js**

- Add all 8 color definitions (currently missing gloss variants)
- Fix poolCompliant flags (only Haven + Horizon Flush are confirmed)
- Add all gate hardware pricing to existing ACCESSORY_PRICING
- Verify all gate widths match WALK_WIDTHS / DRIVE_WIDTHS from priceData.js

- [ ] **Step 2: Add missing data to configData.js**

- Add grade definitions (residential/commercial/industrial + premium variants)
- Add privacy style stubs (UAP-100 Solace, etc.)
- Add WALK_WIDTHS, DRIVE_WIDTHS exports
- Add all heights per grade (including industrial 84-120")

- [ ] **Step 3: Verify pricing calculations are correct**

Open the QuoteBuilder, configure a known fence (150 LF, 48" Horizon, residential, 1 walk gate 48"), and verify the calculated total matches the manual calculation from the spec's Example 1 in `docs/ultra-product-specifications.md`.

- [ ] **Step 4: Commit**

```bash
git add retailPricing.js configData.js
git commit -m "fix: add missing colors, fix pool flags, add gate hardware pricing"
```

---

### Task 15: Download Great Fence Education Images

**Files:**
- Create: `assets/education/` directory + downloaded images

- [ ] **Step 1: Download racking and post images from Wayback Machine**

Save to `assets/education/`:
- Racking images from `greatfence.com/wp-content/uploads/2023/01/`:
  - `S1_STANDARD.7.jpg` → `assets/education/racking-standard.jpg`
  - `S1_RACKABLE.7.jpg` → `assets/education/racking-rackable.jpg`
  - `S1_Heavy_Rackable.7.jpg` → `assets/education/racking-heavy.jpg`
- Post images from `greatfence.com/wp-content/uploads/2024/01/`:
  - `03ResidentialLine.1.jpg` → `assets/education/post-line.jpg`
  - `Residential-End-Post-large.jpg` → `assets/education/post-end.jpg`
  - `01residentialCorner.1.jpg` → `assets/education/post-corner.jpg`
  - `Blank_Post_Stair_Stepping_2024.jpg` → `assets/education/post-blank-stair.jpg`
  - `04ResidentialT3way.1.jpg` → `assets/education/post-3way.jpg`
- Post display from `greatfence.com/wp-content/uploads/2023/11/`:
  - `2021-POSTS-DISPLAY-1024x510-1.jpg` → `assets/education/post-types-overview.jpg`

Use `curl` to download from Wayback Machine URLs:
```bash
curl -o assets/education/racking-standard.jpg "https://web.archive.org/web/20250116183054im_/https://greatfence.com/wp-content/uploads/2023/01/S1_STANDARD.7.jpg"
```

- [ ] **Step 2: Save user-provided height/grade images**

Copy the user's screenshots to `assets/education/`:
- Height silhouettes: `height-48.png`, `height-60.png`, `height-72.png`
- Grade cross-sections: `grade-residential.png`, `grade-commercial.png`, `grade-industrial.png`

- [ ] **Step 3: Update image paths in QuoteStep1_Style.js and QuoteStep2_Layout.js**

Replace placeholder strings with actual `assets/education/` paths.

- [ ] **Step 4: Verify all images load in browser**

- [ ] **Step 5: Commit**

```bash
git add assets/education/
git commit -m "feat: add educational images for racking, posts, heights, grades"
```

---

## Phase 5: Additional Features (Tasks 16-21)

---

### Task 16: Draw Tool Corner Angle Detection Fix

**Files:**
- Modify: `DrawYardView.js`

The draw tool currently counts every intermediate vertex as a corner (`line.points.length - 2`). This over-counts — a straight line with 3 points registers as 1 corner when it should be 0. Fix: calculate the angle between consecutive segments and only count as a corner if the direction change exceeds 15°.

- [ ] **Step 1: Add angle calculation helper**

Add this function near the top of DrawYardView.js (after the distance utilities, around line 95):

```js
// Calculate angle between three points (in degrees)
// Returns 0 for straight, 90 for right angle, 180 for U-turn
function angleBetweenPoints(p1, p2, p3) {
  var dx1 = p2.lng - p1.lng;
  var dy1 = p2.lat - p1.lat;
  var dx2 = p3.lng - p2.lng;
  var dy2 = p3.lat - p2.lat;
  var angle1 = Math.atan2(dy1, dx1);
  var angle2 = Math.atan2(dy2, dx2);
  var diff = Math.abs(angle2 - angle1) * (180 / Math.PI);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

// Count corners using angle threshold (default 15 degrees)
function countCornersWithAngle(line, threshold) {
  if (!threshold) threshold = 15;
  if (!line.points || line.points.length < 3) return 0;
  var corners = 0;
  for (var i = 1; i < line.points.length - 1; i++) {
    var angle = angleBetweenPoints(line.points[i - 1], line.points[i], line.points[i + 1]);
    if (angle > threshold) corners++;
  }
  return corners;
}
```

- [ ] **Step 2: Replace naive corner counting**

At line 903 (the `cornerCount` calculation in the stats section), replace:
```js
cornerCount += line.points.length - 2;
```
with:
```js
cornerCount += countCornersWithAngle(line);
```

At line 1668-1670 (the final output object), replace:
```js
if (line.points.length > 2) corners += line.points.length - 2;
```
with:
```js
corners += countCornersWithAngle(line);
```

- [ ] **Step 3: Verify in browser**

Run: `npm start`
Draw a fence line with 4+ points that are roughly straight. Verify corner count shows 0 (not points-2). Draw a right-angle turn. Verify it counts as 1 corner.

- [ ] **Step 4: Commit**

```bash
git add DrawYardView.js
git commit -m "fix: draw tool corner detection — use angle threshold instead of vertex count"
```

---

### Task 17: Multi-Zone Email Template

**Files:**
- Modify: `workers/email-worker/worker.js`

The existing email worker sends a single-zone quote. The new flow sends multi-zone quotes with a grand total. Update both the sales and customer email templates to handle the new `zoneQuotes` payload format.

- [ ] **Step 1: Update worker.js to handle multi-zone payload**

The new payload from ZoneQuoteSummary will include:
```js
{
  source: 'design-studio-quote',
  quoteId: 'GV-XXXXXX',
  firstName: '...', lastName: '...', email: '...', phone: '...',
  zipCode: '...', location: '...',
  zones: [
    { zoneId: 'back', zoneName: 'Backyard', style: 'Charleston', grade: 'residential',
      height: '48"', linearFootage: 225, accessories: '...', subtotal: 4200.00,
      items: [...] },
    { zoneId: 'front', zoneName: 'Front Yard', ... },
    { zoneId: 'gate', zoneName: 'Driveway Gate', ... },
  ],
  grandTotal: 7988.00,
  snapshotDataUrls: { back: 'data:image/jpeg;base64,...', gate: 'data:image/jpeg;base64,...' },
}
```

Update `buildSalesEmailHtml()` and `buildCustomerEmailHtml()` to:
- Detect multi-zone format: `if (p.zones && p.zones.length > 0)`
- Render a section per zone with zone name, style, subtotal
- Show grand total at the bottom
- Fall back to existing single-zone format for backward compatibility

Add a new helper function `buildZoneSectionHtml(zone)` that renders one zone's details as a table row group.

- [ ] **Step 2: Update customer email to include per-zone summary**

The customer email should show each zone with its key selections and subtotal, followed by the grand total. Include the "View Design Studio" CTA button.

- [ ] **Step 3: Test locally**

Use `wrangler dev` (if available) or deploy to staging worker and test with a curl POST:
```bash
curl -X POST https://grandview-email-worker.sarah-13a.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"source":"design-studio-quote","quoteId":"GV-TEST01","firstName":"Test","email":"test@test.com","zones":[{"zoneName":"Backyard","style":"Charleston","subtotal":4200}],"grandTotal":4200}'
```

- [ ] **Step 4: Commit**

```bash
git add workers/email-worker/worker.js
git commit -m "feat: multi-zone email template — per-zone subtotals + grand total"
```

---

### Task 18: PDF Quote Download

**Files:**
- Create: `quoteRenderer.js`

Generate a branded PDF quote from the combined summary data. Uses browser-native approach (render HTML → `window.print()` with print-specific CSS) rather than adding a PDF library dependency.

- [ ] **Step 1: Create quoteRenderer.js**

```js
// quoteRenderer.js — Generate printable/PDF quote from zone data
// Uses a hidden iframe with print-optimized HTML, triggered by window.print()

function generateQuoteHtml(state) {
  var zones = state.selectedZones || [];
  var grandTotal = 0;
  var contact = state.contactInfo || {};
  var shipping = state.shippingAddress || {};

  var zoneSections = zones.map(function(zoneId) {
    var zone = state.zoneQuotes[zoneId];
    if (!zone || zone.status !== 'complete') return '';
    var config = zone.config || {};
    var result = zone.quoteResult || {};
    grandTotal += result.subtotal || 0;

    var itemRows = (result.items || []).map(function(item) {
      return '<tr>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;">' + item.label + '</td>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">' + (item.qty || '') + '</td>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">$' + (item.unitPrice || 0).toFixed(2) + '</td>'
        + '<td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$' + (item.total || 0).toFixed(2) + '</td>'
        + '</tr>';
    }).join('');

    var zoneName = zoneId === 'front' ? 'Front Yard' : zoneId === 'back' ? 'Backyard' : 'Driveway Gate';

    return '<div style="margin-bottom:24px;">'
      + '<h3 style="margin:0 0 8px;color:#1B3A5C;font-size:16px;border-bottom:2px solid #6BA3C2;padding-bottom:4px;">' + zoneName + '</h3>'
      + '<p style="margin:0 0 8px;font-size:12px;color:#666;">'
      + (config.style || '') + ' · ' + (config.height || '') + '" · ' + (config.color || '')
      + '</p>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px;">'
      + '<tr style="background:#f0f4f8;">'
      + '<th style="text-align:left;padding:6px 0;">Item</th>'
      + '<th style="text-align:center;padding:6px 0;">Qty</th>'
      + '<th style="text-align:right;padding:6px 0;">Unit</th>'
      + '<th style="text-align:right;padding:6px 0;">Total</th>'
      + '</tr>'
      + itemRows
      + '<tr><td colspan="3" style="padding:8px 0;text-align:right;font-weight:700;">Zone Subtotal</td>'
      + '<td style="padding:8px 0;text-align:right;font-weight:700;font-size:14px;">$' + (result.subtotal || 0).toFixed(2) + '</td></tr>'
      + '</table>'
      + '</div>';
  }).join('');

  return '<!DOCTYPE html><html><head><title>Grandview Fence Quote</title>'
    + '<style>body{font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#333;}'
    + '@media print{body{padding:20px;}}</style></head><body>'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">'
    + '<div><img src="assets/logo-email.png" alt="Grandview Fence" style="height:50px;" />'
    + '<div style="font-size:11px;color:#888;margin-top:4px;">grandviewfence.com | (855) FENCE-30</div></div>'
    + '<div style="text-align:right;"><div style="font-size:11px;color:#888;">Quote Date</div>'
    + '<div style="font-size:13px;font-weight:600;">' + new Date().toLocaleDateString() + '</div></div></div>'
    + '<div style="margin-bottom:20px;padding:12px;background:#f8f9fa;border-radius:8px;">'
    + '<div style="font-size:12px;"><strong>Customer:</strong> ' + (contact.name || '') + '</div>'
    + '<div style="font-size:12px;"><strong>Email:</strong> ' + (contact.email || '') + '</div>'
    + '<div style="font-size:12px;"><strong>Ship to:</strong> ' + [shipping.street, shipping.city, shipping.state, shipping.zip].filter(Boolean).join(', ') + '</div>'
    + '</div>'
    + zoneSections
    + '<div style="margin-top:16px;padding:16px;background:#1B3A5C;border-radius:8px;color:#fff;display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:16px;font-weight:800;">Grand Total</span>'
    + '<span style="font-size:22px;font-weight:800;">$' + grandTotal.toFixed(2) + '</span></div>'
    + '<div style="margin-top:16px;font-size:10px;color:#888;text-align:center;">'
    + 'All measurements verified by our team before production. Pricing valid for 30 days.<br/>'
    + 'Grandview Fence LLC | SDVOSB | Veteran-Owned | Woman-Owned</div>'
    + '</body></html>';
}

export function downloadQuotePdf(state) {
  var html = generateQuoteHtml(state);
  var iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();

  setTimeout(function() {
    iframe.contentWindow.print();
    setTimeout(function() { document.body.removeChild(iframe); }, 1000);
  }, 250);
}
```

- [ ] **Step 2: Wire PDF download button into ZoneQuoteSummary.js**

In ZoneQuoteSummary.js, import `downloadQuotePdf` from `quoteRenderer.js` and add a "Download PDF" button next to the CTAs:

```js
import { downloadQuotePdf } from './quoteRenderer';
// In the CTA section:
React.createElement('button', {
  className: 'summary-pdf-btn',
  onClick: function() { downloadQuotePdf(wizardState); },
}, 'Download PDF Quote')
```

- [ ] **Step 3: Verify in browser**

Click "Download PDF" in the combined summary. Browser print dialog should open with a clean, branded quote showing all zones and grand total.

- [ ] **Step 4: Commit**

```bash
git add quoteRenderer.js ZoneQuoteSummary.js
git commit -m "feat: PDF quote download via print-to-PDF with branded template"
```

---

### Task 19: Save & Resume (Email Link)

**Files:**
- Create: `quoteSaver.js`
- Modify: `app.js`

Allow buyers to save their in-progress quote and get an emailed link to resume later. Uses URL hash encoding of the wizard state (compressed).

- [ ] **Step 1: Create quoteSaver.js**

```js
// quoteSaver.js — Save & resume quote via URL
// Encodes wizard state into a compact URL hash, emails link to buyer

import { loadWizardState, saveWizardState } from './wizardState';

function encodeState(state) {
  // Strip snapshot data URLs (too large for URL) and encode as base64
  var slim = Object.assign({}, state);
  if (slim.zoneQuotes) {
    var cleaned = {};
    Object.keys(slim.zoneQuotes).forEach(function(k) {
      cleaned[k] = Object.assign({}, slim.zoneQuotes[k], { snapshotDataUrl: null });
    });
    slim.zoneQuotes = cleaned;
  }
  try {
    return btoa(encodeURIComponent(JSON.stringify(slim)));
  } catch (e) { return null; }
}

function decodeState(hash) {
  try {
    return JSON.parse(decodeURIComponent(atob(hash)));
  } catch (e) { return null; }
}

export function getSaveLink() {
  var state = loadWizardState();
  var encoded = encodeState(state);
  if (!encoded) return null;
  return window.location.origin + window.location.pathname + '#resume=' + encoded;
}

export function checkForResume() {
  var hash = window.location.hash;
  if (!hash || !hash.startsWith('#resume=')) return false;
  var encoded = hash.replace('#resume=', '');
  var state = decodeState(encoded);
  if (state) {
    saveWizardState(state);
    // Clean URL
    window.history.replaceState(null, '', window.location.pathname);
    return true;
  }
  return false;
}

export function emailSaveLink(email, quoteId) {
  var link = getSaveLink();
  if (!link) return Promise.resolve(false);

  return fetch('https://grandview-email-worker.sarah-13a.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'save-quote-link',
      email: email,
      quoteId: quoteId || 'draft',
      resumeLink: link,
    }),
  }).then(function(r) { return r.ok; }).catch(function() { return false; });
}
```

- [ ] **Step 2: Add "Save for Later" button to QuoteBuilder footer**

In QuoteBuilder.js, add a small "Save for Later" link in the footer bar that opens a mini-form asking for email, then calls `emailSaveLink()`.

- [ ] **Step 3: Update app.js to check for resume on load**

In app.js, call `checkForResume()` on mount. If it returns true, route to the wizard view so the buyer picks up where they left off.

- [ ] **Step 4: Update email worker to handle save-link emails**

In `workers/email-worker/worker.js`, add handling for `source: 'save-quote-link'` — sends a simple email with the resume link and "Continue Your Quote" CTA button.

- [ ] **Step 5: Verify in browser**

Fill out a few steps in the QuoteBuilder, click "Save for Later", enter email, verify email sends with resume link. Open the link in a new incognito tab, verify state restores.

- [ ] **Step 6: Commit**

```bash
git add quoteSaver.js QuoteBuilder.js app.js workers/email-worker/worker.js
git commit -m "feat: save & resume quotes via emailed link"
```

---

### Task 20: Funnel Analytics Tracking

**Files:**
- Create: `analytics.js`

Lightweight analytics to track where buyers drop off in the quote flow. No external dependencies — sends events to the existing Cloudflare email worker which can log to GAS/Google Sheets.

- [ ] **Step 1: Create analytics.js**

```js
// analytics.js — Lightweight funnel tracking
// Sends events to GAS via the email worker for Google Sheets logging

var WORKER_URL = 'https://grandview-email-worker.sarah-13a.workers.dev';

function trackEvent(event, data) {
  var payload = {
    source: 'analytics',
    event: event,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    data: data || {},
  };

  // Fire and forget — don't block UI
  try {
    navigator.sendBeacon(WORKER_URL, JSON.stringify(payload));
  } catch (e) {
    // Fallback for browsers without sendBeacon
    fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function() {});
  }
}

function getSessionId() {
  var key = 'gv_session_id';
  var id = sessionStorage.getItem(key);
  if (!id) {
    id = 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    sessionStorage.setItem(key, id);
  }
  return id;
}

// Pre-built event helpers
export function trackZoneSelection(zones) { trackEvent('zone_select', { zones: zones }); }
export function trackStepEnter(step, zone) { trackEvent('step_enter', { step: step, zone: zone }); }
export function trackStepComplete(step, zone) { trackEvent('step_complete', { step: step, zone: zone }); }
export function trackQuoteComplete(zone, subtotal) { trackEvent('quote_complete', { zone: zone, subtotal: subtotal }); }
export function trackSummaryView(grandTotal) { trackEvent('summary_view', { grandTotal: grandTotal }); }
export function trackSubmit(quoteId, grandTotal) { trackEvent('quote_submit', { quoteId: quoteId, grandTotal: grandTotal }); }
export function trackDropoff(step, zone) { trackEvent('dropoff', { step: step, zone: zone }); }
export function trackPdfDownload(quoteId) { trackEvent('pdf_download', { quoteId: quoteId }); }
export function trackSaveForLater(email) { trackEvent('save_for_later', { hasEmail: !!email }); }
```

- [ ] **Step 2: Wire analytics into QuoteBuilder and WizardShell**

Import and call tracking functions at key points:
- `trackZoneSelection()` when zones are picked in WizardShell
- `trackStepEnter()` when a QuoteBuilder step renders
- `trackStepComplete()` when Next is clicked
- `trackQuoteComplete()` when zone quote finishes
- `trackSummaryView()` when combined summary loads
- `trackSubmit()` when quote is submitted
- `trackDropoff()` on page unload if mid-flow (via `beforeunload`)

- [ ] **Step 3: Update email worker to log analytics events**

In `workers/email-worker/worker.js`, add handling for `source: 'analytics'` — forward to GAS endpoint for Google Sheets logging. Log: event name, session ID, timestamp, data.

- [ ] **Step 4: Verify events fire**

Open browser dev tools Network tab. Walk through the quote flow. Verify beacon/fetch calls go out at each step transition.

- [ ] **Step 5: Commit**

```bash
git add analytics.js QuoteBuilder.js WizardShell.js workers/email-worker/worker.js
git commit -m "feat: funnel analytics — track step-by-step dropoff via GAS/Sheets"
```

---

### Task 21: Shipping Estimate by ZIP

**Files:**
- Create: `shippingEstimate.js`

Rough shipping estimate based on ZIP code. Aluminum fence ships LTL freight — cost varies by distance from manufacturer (Ultra is in NJ). Provide a range, not an exact number.

- [ ] **Step 1: Create shippingEstimate.js**

```js
// shippingEstimate.js — Rough shipping estimate by ZIP
// Aluminum fence ships LTL freight from NJ. Cost varies by distance zone.
// These are estimates — actual shipping quoted at order confirmation.

var SHIPPING_ZONES = [
  { zips: /^(0[0-9]|1[0-9]|2[0-7])/, zone: 'northeast', label: 'Northeast (nearby)', range: [150, 350] },
  { zips: /^(2[8-9]|3[0-9])/, zone: 'southeast', label: 'Southeast', range: [250, 500] },
  { zips: /^(4[0-9]|5[0-3])/, zone: 'midwest', label: 'Midwest', range: [300, 600] },
  { zips: /^(5[4-9]|6[0-9]|7[0-9])/, zone: 'central', label: 'Central / South', range: [350, 700] },
  { zips: /^(8[0-9]|9[0-9])/, zone: 'west', label: 'West Coast', range: [500, 1000] },
];

export function getShippingEstimate(zip) {
  if (!zip || zip.length < 2) return null;
  var prefix = zip.substring(0, 2);

  for (var i = 0; i < SHIPPING_ZONES.length; i++) {
    if (SHIPPING_ZONES[i].zips.test(prefix)) {
      return {
        zone: SHIPPING_ZONES[i].zone,
        label: SHIPPING_ZONES[i].label,
        low: SHIPPING_ZONES[i].range[0],
        high: SHIPPING_ZONES[i].range[1],
        disclaimer: 'Estimate based on distance from manufacturer. Actual shipping quoted at order confirmation.',
      };
    }
  }

  return {
    zone: 'unknown',
    label: 'Your area',
    low: 200,
    high: 800,
    disclaimer: 'Shipping varies by location. We\'ll provide an exact quote after you submit.',
  };
}
```

- [ ] **Step 2: Wire into QuoteStep5_Shipping.js**

When buyer enters a ZIP code, call `getShippingEstimate(zip)` and show:
```
Estimated shipping to [zone label]: $[low] – $[high]
[disclaimer text]
```

Show this as an info card below the ZIP field.

- [ ] **Step 3: Verify in browser**

Enter different ZIP codes (07001, 30301, 48001, 90210) and verify different ranges show.

- [ ] **Step 4: Commit**

```bash
git add shippingEstimate.js QuoteStep5_Shipping.js
git commit -m "feat: rough shipping estimate by ZIP code zone"
```

---

## Verification Checklist

After all tasks complete, verify these scenarios work end-to-end:

- [ ] Single zone quote: zone select → 6-step QuoteBuilder → correct pricing → summary
- [ ] Multi-zone same fence: front + back → shared config → layout-only for second zone
- [ ] Multi-zone different fence: front + back → different styles → both priced correctly
- [ ] Pool flow: pool selected → one popup → Haven locked → hardware auto-selected
- [ ] Gate zone: Design Studio → bridge → short QuoteBuilder → auto-price for standard, "custom quote" for estate
- [ ] All three zones → combined summary with correct grand total
- [ ] Back buttons work on every screen
- [ ] Draw tool data pre-fills layout (if available)
- [ ] All thumbnail images load
- [ ] All (i) popups show correct educational content
- [ ] Running subtotal updates as selections change
- [ ] Silver premium applied to panels
- [ ] Racking surcharge appears when terrain is sloped
- [ ] Puppy/butterflies warn about racking limitation
- [ ] Gate hardware per gate, pool auto-locks
- [ ] Draw tool counts corners by angle (>15°), not vertex count
- [ ] Multi-zone email sends with per-zone subtotals + grand total
- [ ] PDF download renders branded quote with all zones
- [ ] Save for Later emails resume link, resume link restores state
- [ ] Analytics events fire at each step transition (check Network tab)
- [ ] Shipping estimate shows range based on ZIP code
