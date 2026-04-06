# Design-to-Quote Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist all design selections + 3D snapshot, add a bridge page between the design tool and quote flow, add pool compliance popup, reframe the gate question, and support multi-area (Front + Backyard) flows.

**Architecture:** Replace the fragmented config transfer (5 fields via `gv_quote_builder`) with a single `gv_saved_design` localStorage key capturing all ~20 config fields + a canvas snapshot. A new `DesignReviewPage` component sits between the design tool and QuoteBuilder, showing the saved design and offering address entry, manual footage, or lead capture. Pool compliance is a two-step popup triggered on backyard selection. The gate question is reframed from blocking to educational. Multi-area flows handle areas sequentially with an Area 2 Return Page.

**Tech Stack:** React (vanilla, no JSX transform — uses `var` throughout), vanilla CSS, Google Maps Places API, localStorage.

**Spec:** `docs/superpowers/specs/2026-04-05-design-to-quote-bridge-design.md`

---

### Task 1: Build `gv_saved_design` writer in app.js

**Files:**
- Modify: `app.js:225-259` (replace `handleGetQuote` + `handleOpenQuoteBuilder`)

- [ ] **Step 1: Add `buildSavedDesign` helper function**

Add after line 224 (before `handleGetQuote`). This function reads the active config and builds the complete saved design object.

```js
var buildSavedDesign = function(scene, activeConfig) {
    var acc = activeConfig.accessories || {};
    var isFence = (scene === 'fencing' || scene === 'backyard');

    // Capture 3D canvas snapshot
    var snapshotDataUrl = '';
    try {
        var canvasEl = document.querySelector('.viewport-scene canvas');
        if (canvasEl) {
            snapshotDataUrl = canvasEl.toDataURL('image/png');
        }
    } catch (e) {
        console.warn('[SaveDesign] Canvas capture failed:', e);
    }

    return {
        scene: scene,
        styleId: activeConfig.styleId || '',
        height: activeConfig.height || '48',
        color: activeConfig.color ? {
            id: activeConfig.color.id,
            displayName: activeConfig.color.displayName,
            hex: activeConfig.color.hex || activeConfig.color.threeHex || '',
        } : null,
        postCap: activeConfig.postCap || 'pcf',
        finialType: isFence ? (activeConfig.finialType || null) : (activeConfig.finial || null),
        pupType: activeConfig.pupType || null,
        circles: !!acc.tcr,
        butterflies: !!acc.tbu,
        scrolls: !!acc.scr,
        midRail: !!acc.mdr,
        upperFinialRail: !!acc.ufr,
        proSpacing: !!acc.res,
        arch: isFence ? null : (activeConfig.arch || null),
        mount: isFence ? null : (activeConfig.mount || null),
        leaf: isFence ? null : (activeConfig.leaf || null),
        privacyPostColor: activeConfig.privacyPostColor || null,
        privacyPanelColor: activeConfig.privacyPanelColor || null,
        poolBarrier: false,
        poolCompliance: null,
        snapshotDataUrl: snapshotDataUrl,
        timestamp: new Date().toISOString(),
    };
};
```

- [ ] **Step 2: Replace `handleGetQuote` and `handleOpenQuoteBuilder`**

Replace lines 225-259 with:

```js
var handleGetQuote = function() {
    setContactPopupOpen(false);

    var isFenceScene = (activeTab === 'fencing' || activeTab === 'backyard');
    var activeConfig = isFenceScene ? fenceConfig : config;
    var scene = activeTab === 'draw' ? 'fencing' : activeTab;

    var savedDesign = buildSavedDesign(scene, activeConfig);

    try {
        localStorage.setItem('gv_saved_design', JSON.stringify(savedDesign));
    } catch (e) {
        console.warn('[SaveDesign] localStorage write failed:', e);
    }

    setView('design-review');
};
```

- [ ] **Step 3: Add `'design-review'` view state routing**

In the render section (around line 295), add a branch before the `quote-builder` check:

```js
if (view === 'design-review') {
    return React.createElement(DesignReviewPage, {
        onNavigateToDraw: function(location) {
            setView('studio');
            setActiveTab('draw');
        },
        onNavigateToManual: function() {
            setView('quote-builder');
        },
        onNavigateToStudio: function() {
            setView('studio');
        },
        onOpenContact: function() {
            setContactPopupOpen(true);
            setView('studio');
        },
    });
}
```

- [ ] **Step 4: Add import for DesignReviewPage**

At top of app.js (after existing imports):

```js
import DesignReviewPage from './DesignReviewPage';
```

- [ ] **Step 5: Build and verify no errors**

Run: `npx webpack --mode development`
Expected: Compiles with only the pre-existing DefinePlugin warnings. (DesignReviewPage doesn't exist yet — create a stub in next task.)

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: save full design config + snapshot to gv_saved_design on Get Quote"
```

---

### Task 2: Create DesignReviewPage (bridge page)

**Files:**
- Create: `DesignReviewPage.js`

- [ ] **Step 1: Create the component file**

```js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';
import { FENCE_STYLES as GATE_STYLES, POST_CAPS, FINIALS, ARCH_STYLES } from './configData';

// Human-readable label lookups
var STYLE_NAMES = {};
FENCE_TOOL_STYLES.forEach(function(s) { STYLE_NAMES[s.id] = s.name; });
GATE_STYLES.forEach(function(s) { STYLE_NAMES[s.id] = s.name; });

var POST_CAP_NAMES = { pcf: 'Flat Cap', pcb: 'Ball Cap' };
var FINIAL_NAMES = { fs: 'Spear', ft: 'Triangle', fq: 'Quad', fp: 'Plug' };
var ARCH_NAMES = { e: 'Estate', a: 'Arched', r: 'Reverse', s: 'Standard' };
var MOUNT_NAMES = { p: 'Post Mount', d: 'Direct Mount' };
var LEAF_NAMES = { '1': 'Single', '2': 'Double' };

// Pool-compliant styles
var POOL_STYLES = ['uab_200', 'uaf_200', 'uaf_250'];

function loadSavedDesign() {
    try {
        var raw = localStorage.getItem('gv_saved_design');
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

// Google Maps loader (reuse from DrawYardView pattern)
var GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

var DesignReviewPage = function(props) {
    var onNavigateToDraw = props.onNavigateToDraw;
    var onNavigateToManual = props.onNavigateToManual;
    var onNavigateToStudio = props.onNavigateToStudio;
    var onOpenContact = props.onOpenContact;

    var saved = loadSavedDesign();
    var hasDesign = saved && saved.styleId;

    // Address entry state
    var addrState = useState('');
    var address = addrState[0];
    var setAddress = addrState[1];

    var loadingState = useState(false);
    var loading = loadingState[0];
    var setLoading = loadingState[1];

    var errorState = useState('');
    var error = errorState[0];
    var setError = errorState[1];

    var suggestionsState = useState([]);
    var suggestions = suggestionsState[0];
    var setSuggestions = suggestionsState[1];

    var serviceRef = useRef(null);
    var debounceRef = useRef(null);

    // Address autocomplete
    var handleAddressChange = function(e) {
        var val = e.target.value;
        setAddress(val);
        setError('');
        if (!val.trim() || val.length < 3) { setSuggestions([]); return; }
        if (!window.google || !window.google.maps || !window.google.maps.places) return;
        if (!serviceRef.current) {
            serviceRef.current = new window.google.maps.places.AutocompleteService();
        }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(function() {
            serviceRef.current.getPlacePredictions(
                { input: val, types: ['address'], componentRestrictions: { country: 'us' } },
                function(predictions, status) {
                    if (status === 'OK' && predictions) {
                        setSuggestions(predictions.slice(0, 5));
                    } else {
                        setSuggestions([]);
                    }
                }
            );
        }, 250);
    };

    var selectSuggestion = function(prediction) {
        setAddress(prediction.description);
        setSuggestions([]);
        geocodeAndGo(prediction.description);
    };

    var geocodeAndGo = function(addr) {
        if (!window.google || !window.google.maps) {
            setError('Google Maps is still loading.');
            return;
        }
        setLoading(true);
        var geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: addr }, function(results, status) {
            setLoading(false);
            if (status === 'OK' && results[0]) {
                var loc = {
                    address: results[0].formatted_address,
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                };
                try {
                    localStorage.setItem('gv_bridge_location', JSON.stringify(loc));
                } catch (e) {}
                onNavigateToDraw(loc);
            } else {
                setError('Could not find that address. Please try again.');
            }
        });
    };

    var handleSubmitAddress = function(e) {
        e.preventDefault();
        if (!address.trim()) { setError('Please enter an address'); return; }
        setSuggestions([]);
        geocodeAndGo(address);
    };

    // Build selections list from saved design
    var selections = [];
    if (hasDesign) {
        selections.push({ label: 'Style', value: STYLE_NAMES[saved.styleId] || saved.styleId });
        if (saved.color) selections.push({ label: 'Color', value: saved.color.displayName });
        selections.push({ label: 'Height', value: saved.height + '"' });
        if (saved.postCap) selections.push({ label: 'Post Cap', value: POST_CAP_NAMES[saved.postCap] || saved.postCap });
        if (saved.finialType) selections.push({ label: 'Finials', value: FINIAL_NAMES[saved.finialType] || saved.finialType });
        if (saved.pupType) selections.push({ label: 'Puppy Picket', value: 'Yes' });
        if (saved.circles) selections.push({ label: 'Circles', value: 'Yes' });
        if (saved.butterflies) selections.push({ label: 'Butterflies', value: 'Yes' });
        if (saved.scrolls) selections.push({ label: 'Scrolls', value: 'Yes' });
        if (saved.midRail) selections.push({ label: 'Mid Rail', value: 'Yes' });
        if (saved.upperFinialRail) selections.push({ label: 'Upper Finial Rail', value: 'Yes' });
        if (saved.proSpacing) selections.push({ label: 'Pro Spacing', value: 'Yes' });
        if (saved.arch) selections.push({ label: 'Arch', value: ARCH_NAMES[saved.arch] || saved.arch });
        if (saved.mount) selections.push({ label: 'Mount', value: MOUNT_NAMES[saved.mount] || saved.mount });
        if (saved.leaf) selections.push({ label: 'Leaf', value: LEAF_NAMES[saved.leaf] || saved.leaf });
        if (saved.privacyPostColor) selections.push({ label: 'Privacy Post', value: saved.privacyPostColor });
        if (saved.privacyPanelColor) selections.push({ label: 'Privacy Panel', value: saved.privacyPanelColor });
    }

    var isPoolReady = hasDesign && saved.poolBarrier && POOL_STYLES.indexOf(saved.styleId) >= 0;

    return (
        <div className="bridge-page">
            {/* Top bar */}
            <div className="bridge-topbar">
                <div className="bridge-topbar-brand">
                    <span className="bridge-topbar-highlight">GRANDVIEW</span> Fence | Design Studio
                </div>
                <button className="bridge-topbar-back" onClick={onNavigateToStudio}>
                    &larr; Back to Design Tool
                </button>
            </div>

            <div className="bridge-content">
                {/* Header */}
                <div className="bridge-header">
                    <div className="bridge-header-label">DESIGN STUDIO</div>
                    <h1 className="bridge-header-title">
                        {hasDesign ? 'Your Design is Saved' : 'Get Your Fence Quote'}
                    </h1>
                    <p className="bridge-header-subtitle">
                        {hasDesign
                            ? "You'll have a chance to review and edit all options before your quote is finalized."
                            : 'Enter your property address or measurements to get started.'}
                    </p>
                </div>

                <div className="bridge-columns">
                    {/* LEFT: Design Summary */}
                    <div className="bridge-left">
                        {hasDesign && saved.snapshotDataUrl ? (
                            <div className="bridge-snapshot">
                                <img className="bridge-snapshot-img" src={saved.snapshotDataUrl} alt="Your fence design" />
                                <div className="bridge-snapshot-badge">SAVED</div>
                                {isPoolReady && <div className="bridge-pool-badge">POOL READY</div>}
                            </div>
                        ) : (
                            <div className="bridge-snapshot bridge-snapshot-empty">
                                <div className="bridge-snapshot-placeholder">No design configured yet</div>
                            </div>
                        )}

                        {hasDesign ? (
                            <div className="bridge-selections">
                                <div className="bridge-selections-title">YOUR SELECTIONS</div>
                                <div className="bridge-selections-subtitle">
                                    You'll have a chance to edit these before your final quote
                                </div>
                                <div className="bridge-selections-grid">
                                    {selections.map(function(s, i) {
                                        return (
                                            <div key={i} className="bridge-selection-item">
                                                <span className="bridge-selection-label">{s.label}</span>
                                                <strong className="bridge-selection-value">{s.value}</strong>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="bridge-cold-start">
                                <button className="bridge-configure-btn" onClick={onNavigateToStudio}>
                                    Configure Your Fence
                                </button>
                                <button className="bridge-skip-link" onClick={onNavigateToManual}>
                                    Skip to quote &mdash; choose options during the quote process
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Address + Actions */}
                    <div className="bridge-right">
                        {/* Draw Your Yard card */}
                        <div className="bridge-address-card">
                            <div className="bridge-address-title">Draw Your Yard</div>
                            <div className="bridge-address-desc">
                                Enter your address to view your property on satellite imagery and calculate linear footage.
                            </div>
                            <form onSubmit={handleSubmitAddress} autoComplete="off">
                                <div className="bridge-address-wrap">
                                    <input
                                        type="text"
                                        className="bridge-address-input"
                                        placeholder="123 Main St, Howell, MI 48843"
                                        value={address}
                                        onChange={handleAddressChange}
                                        autoComplete="off"
                                    />
                                    {suggestions.length > 0 && (
                                        <div className="bridge-suggestions">
                                            {suggestions.map(function(s) {
                                                return (
                                                    <button
                                                        key={s.place_id}
                                                        type="button"
                                                        className="bridge-suggestion-item"
                                                        onClick={function() { selectSuggestion(s); }}
                                                    >
                                                        {s.description}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {error && <div className="bridge-address-error">{error}</div>}
                                <button type="submit" className="bridge-address-btn" disabled={loading}>
                                    {loading ? 'Searching...' : 'View My Property \u2192'}
                                </button>
                            </form>
                        </div>

                        {/* OR divider */}
                        <div className="bridge-divider">
                            <span className="bridge-divider-line"></span>
                            <span className="bridge-divider-text">OR</span>
                            <span className="bridge-divider-line"></span>
                        </div>

                        {/* Manual entry */}
                        <button className="bridge-manual-card" onClick={onNavigateToManual}>
                            <div>
                                <div className="bridge-manual-title">Enter Footage Manually</div>
                                <div className="bridge-manual-desc">I already know my linear footage</div>
                            </div>
                            <span className="bridge-manual-arrow">&rarr;</span>
                        </button>

                        {/* Contact */}
                        <div className="bridge-contact">
                            <div className="bridge-contact-title">Have questions?</div>
                            <button className="bridge-contact-link" onClick={onOpenContact}>
                                Drop us a line and we'll walk you through it
                            </button>
                            <div className="bridge-contact-phone">Or call (855) FENCE-30</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesignReviewPage;
```

- [ ] **Step 2: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles successfully.

- [ ] **Step 3: Commit**

```bash
git add DesignReviewPage.js
git commit -m "feat: add DesignReviewPage bridge between design tool and quote flow"
```

---

### Task 3: Add bridge page CSS

**Files:**
- Modify: `styles.css` (append at end, before mobile media queries)

- [ ] **Step 1: Add bridge page styles**

Append to `styles.css` before the final mobile media query:

```css
/* ============================================================
   Bridge Page (Design Review)
   ============================================================ */
.bridge-page {
  width: 100%;
  min-height: 100vh;
  background: #f7fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.bridge-topbar {
  background: #1B3A5C;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bridge-topbar-brand {
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.bridge-topbar-highlight { color: #6BA3C2; }
.bridge-topbar-back {
  background: none;
  border: none;
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}
.bridge-topbar-back:hover { color: #fff; }

.bridge-content {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 24px;
}
.bridge-header {
  text-align: center;
  margin-bottom: 28px;
}
.bridge-header-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #6BA3C2;
  margin-bottom: 6px;
}
.bridge-header-title {
  font-size: 24px;
  font-weight: 800;
  color: #1B3A5C;
  margin: 0 0 8px;
}
.bridge-header-subtitle {
  font-size: 14px;
  color: #718096;
  max-width: 480px;
  margin: 0 auto;
}

.bridge-columns {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}
.bridge-left, .bridge-right { flex: 1; min-width: 0; }

/* Snapshot */
.bridge-snapshot {
  background: #0c1420;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  margin-bottom: 16px;
}
.bridge-snapshot-img {
  width: 100%;
  display: block;
  border-radius: 12px;
}
.bridge-snapshot-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255,255,255,0.18);
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
}
.bridge-pool-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: #16A34A;
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
}
.bridge-snapshot-empty {
  background: #e2e8f0;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bridge-snapshot-placeholder {
  color: #A0AEC0;
  font-size: 14px;
}

/* Selections */
.bridge-selections {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 18px;
}
.bridge-selections-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #718096;
  margin-bottom: 4px;
}
.bridge-selections-subtitle {
  font-size: 12px;
  color: #A0AEC0;
  margin-bottom: 14px;
}
.bridge-selections-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
}
.bridge-selection-item {
  display: flex;
  flex-direction: column;
  font-size: 12px;
}
.bridge-selection-label { color: #A0AEC0; }
.bridge-selection-value { color: #1B3A5C; font-size: 13px; }

/* Cold start */
.bridge-cold-start {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  padding: 32px 16px;
  text-align: center;
}
.bridge-configure-btn {
  background: #1B3A5C;
  color: #fff;
  border: none;
  padding: 14px 32px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.bridge-configure-btn:hover { background: #142d49; }
.bridge-skip-link {
  background: none;
  border: none;
  color: #6BA3C2;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
  font-family: inherit;
}

/* Address card */
.bridge-address-card {
  background: #fff;
  border: 1.5px solid #6BA3C2;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
}
.bridge-address-title {
  font-size: 16px;
  font-weight: 700;
  color: #1B3A5C;
  margin-bottom: 4px;
}
.bridge-address-desc {
  font-size: 12px;
  color: #718096;
  margin-bottom: 14px;
}
.bridge-address-wrap { position: relative; margin-bottom: 12px; }
.bridge-address-input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  background: #f8fafc;
  color: #1B3A5C;
}
.bridge-address-input:focus {
  border-color: #6BA3C2;
  outline: none;
}
.bridge-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 100;
}
.bridge-suggestion-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  border: none;
  background: none;
  font-size: 13px;
  font-family: inherit;
  color: #333;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}
.bridge-suggestion-item:hover { background: #f7fafc; }
.bridge-suggestion-item:last-child { border-bottom: none; }
.bridge-address-error {
  color: #DC2626;
  font-size: 12px;
  margin-bottom: 8px;
}
.bridge-address-btn {
  width: 100%;
  padding: 12px;
  background: #D4753A;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.bridge-address-btn:hover { background: #c46830; }
.bridge-address-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* OR divider */
.bridge-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.bridge-divider-line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}
.bridge-divider-text {
  font-size: 11px;
  font-weight: 600;
  color: #A0AEC0;
}

/* Manual entry card — equal weight to address card */
.bridge-manual-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: #fff;
  border: 1.5px solid #6BA3C2;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.bridge-manual-card:hover { border-color: #1B3A5C; background: #f8fafc; }
.bridge-manual-title {
  font-size: 14px;
  font-weight: 600;
  color: #1B3A5C;
}
.bridge-manual-desc {
  font-size: 12px;
  color: #718096;
}
.bridge-manual-arrow {
  color: #CBD5E0;
  font-size: 20px;
}

/* Contact section */
.bridge-contact {
  text-align: center;
  padding: 14px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px dashed #CBD5E0;
}
.bridge-contact-title {
  font-size: 13px;
  font-weight: 600;
  color: #1B3A5C;
  margin-bottom: 4px;
}
.bridge-contact-link {
  background: none;
  border: none;
  color: #6BA3C2;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  font-family: inherit;
}
.bridge-contact-phone {
  font-size: 11px;
  color: #A0AEC0;
  margin-top: 4px;
}

/* Mobile */
@media (max-width: 767px) {
  .bridge-columns { flex-direction: column; }
  .bridge-header-title { font-size: 20px; }
}

/* Google Places must appear above bridge */
.bridge-page .pac-container { z-index: 10000 !important; }
```

- [ ] **Step 2: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles. Bridge page now renders with full styling.

- [ ] **Step 3: Commit**

```bash
git add styles.css
git commit -m "feat: add bridge page CSS styles"
```

---

### Task 4: Create PoolCompliancePopup

**Files:**
- Create: `PoolCompliancePopup.js`

- [ ] **Step 1: Create the component**

```js
import React, { useState } from 'react';

var POOL_COMPLIANT_STYLES = ['uab_200', 'uaf_200', 'uaf_250'];

var PoolCompliancePopup = function(props) {
    var onComplete = props.onComplete; // receives { poolBarrier, poolCompliance }
    var onCancel = props.onCancel;
    var currentStyleId = props.currentStyleId;

    var stepState = useState(1);
    var step = stepState[0];
    var setStep = stepState[1];

    var handleNo = function() {
        onComplete({ poolBarrier: false, poolCompliance: null });
    };

    var handleYes = function() {
        setStep(2);
    };

    var handleCompliance = function(level) {
        onComplete({ poolBarrier: true, poolCompliance: level });
    };

    var isCompliant = POOL_COMPLIANT_STYLES.indexOf(currentStyleId) >= 0;

    return (
        <div className="pool-popup-overlay">
            <div className="pool-popup">
                {step === 1 && (
                    <div className="pool-popup-step">
                        <div className="pool-popup-icon">&#127946;</div>
                        <h2 className="pool-popup-title">Is any part of this fence around a pool?</h2>
                        <p className="pool-popup-desc">Pool barriers have specific safety requirements. We'll make sure your fence meets code.</p>
                        <div className="pool-popup-cards">
                            <button className="pool-popup-card" onClick={handleYes}>
                                <div className="pool-popup-card-title">Yes</div>
                                <div className="pool-popup-card-desc">Part or all of this fence is a pool barrier</div>
                            </button>
                            <button className="pool-popup-card" onClick={handleNo}>
                                <div className="pool-popup-card-title">No</div>
                                <div className="pool-popup-card-desc">No pool on this side of the property</div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="pool-popup-step">
                        <h2 className="pool-popup-title">Does this need to meet pool safety code?</h2>
                        <p className="pool-popup-desc">Most municipalities require BOCA/IRC pool barrier compliance. If you're not sure, we'll apply safe defaults and confirm with you.</p>

                        {!isCompliant && (
                            <div className="pool-popup-warning">
                                Your current style may not be pool compliant. Pool-safe styles include Haven, Horizon, and Vanguard with flush bottom configuration. We'll help you find the right fit.
                            </div>
                        )}

                        <div className="pool-popup-options">
                            <button className="pool-popup-option" onClick={function() { handleCompliance('full'); }}>
                                <strong>Yes, full pool code (BOCA/IRC)</strong>
                                <span>Enforce flush bottom, 48"+ height, self-closing gates, &lt;4" spacing</span>
                            </button>
                            <button className="pool-popup-option" onClick={function() { handleCompliance('unsure'); }}>
                                <strong>I'm not sure</strong>
                                <span>We'll apply safe defaults and Grandview will confirm requirements for your area</span>
                            </button>
                            <button className="pool-popup-option" onClick={function() { handleCompliance('none'); }}>
                                <strong>No, just near a pool</strong>
                                <span>No special requirements needed</span>
                            </button>
                        </div>
                    </div>
                )}

                <button className="pool-popup-cancel" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export { POOL_COMPLIANT_STYLES };
export default PoolCompliancePopup;
```

- [ ] **Step 2: Add pool popup CSS to styles.css**

Append to styles.css:

```css
/* ============================================================
   Pool Compliance Popup
   ============================================================ */
.pool-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.pool-popup {
  background: #fff;
  border-radius: 16px;
  padding: 32px;
  max-width: 480px;
  width: calc(100% - 32px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.pool-popup-icon {
  font-size: 36px;
  text-align: center;
  margin-bottom: 8px;
}
.pool-popup-title {
  font-size: 20px;
  font-weight: 800;
  color: #1B3A5C;
  text-align: center;
  margin: 0 0 8px;
}
.pool-popup-desc {
  font-size: 13px;
  color: #718096;
  text-align: center;
  margin-bottom: 20px;
}
.pool-popup-cards {
  display: flex;
  gap: 12px;
}
.pool-popup-card {
  flex: 1;
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms ease;
}
.pool-popup-card:hover { border-color: #6BA3C2; background: #f0f7ff; }
.pool-popup-card-title {
  font-size: 18px;
  font-weight: 700;
  color: #1B3A5C;
  margin-bottom: 4px;
}
.pool-popup-card-desc {
  font-size: 12px;
  color: #718096;
}
.pool-popup-warning {
  background: #FFFBEB;
  border: 1px solid #F6E05E;
  border-radius: 8px;
  padding: 12px;
  font-size: 12px;
  color: #92700C;
  margin-bottom: 16px;
}
.pool-popup-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pool-popup-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: all 150ms ease;
}
.pool-popup-option:hover { border-color: #6BA3C2; background: #f8fafc; }
.pool-popup-option strong {
  font-size: 14px;
  color: #1B3A5C;
}
.pool-popup-option span {
  font-size: 12px;
  color: #718096;
}
.pool-popup-cancel {
  display: block;
  margin: 16px auto 0;
  background: none;
  border: none;
  color: #A0AEC0;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.pool-popup-cancel:hover { color: #718096; }
```

- [ ] **Step 3: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles.

- [ ] **Step 4: Commit**

```bash
git add PoolCompliancePopup.js styles.css
git commit -m "feat: add pool compliance popup with two-step flow"
```

---

### Task 5: Reframe gate step in WizardShell

**Files:**
- Modify: `WizardShell.js:482-540` (gate question step)

- [ ] **Step 1: Replace the gate question block**

Replace lines 482-540 (the `step === 3 && !hasGateZone` block) with the educational/inspirational reframe:

```js
{/* Gate exploration — educational, not blocking */}
{step === 3 && !hasGateZone && (
    <div className="wizard-gate-explore">
        <h2 className="wizard-step-title">Take a Look at Your Gate Options</h2>
        <p className="wizard-step-desc">
            Most homeowners add a walk gate or drive gate. Take a look — if you see something you like, we'll add it to your quote.
        </p>

        <div className="wizard-gate-cards">
            <div className="wizard-gate-card">
                <img src="assets/ifence_previews/gate_styles/san_marino_15.png" alt="Walk Gate" className="wizard-gate-img" />
                <div className="wizard-gate-card-body">
                    <div className="wizard-gate-card-title">Walk Gate</div>
                    <div className="wizard-gate-card-desc">36" to 72" wide. Single-leaf pedestrian gate.</div>
                    <div className="wizard-gate-card-tag">Most common — included in instant quote</div>
                </div>
            </div>
            <div className="wizard-gate-card">
                <img src="assets/ifence_previews/gate_styles/san_marino_15.png" alt="Drive Gate" className="wizard-gate-img" />
                <div className="wizard-gate-card-body">
                    <div className="wizard-gate-card-title">Double Drive Gate</div>
                    <div className="wizard-gate-card-desc">72" to 144" wide. Standard vehicle access.</div>
                    <div className="wizard-gate-card-tag">Standard — included in instant quote</div>
                </div>
            </div>
        </div>

        <div className="wizard-gate-custom">
            <strong>Estate &amp; Cantilever Gates</strong> — Custom order. <button className="wizard-gate-custom-link" onClick={function() {}}>Contact us for pricing</button>
        </div>

        <div className="wizard-gate-actions">
            <button className="wizard-gate-explore-btn" onClick={function() {
                setGateAnswer('yes');
                var newZones = selectedZones.concat(['gate']);
                setSelectedZones(newZones);
                setCurrentZone('gate');
                setZoneConfigs(function(prev) {
                    var updated = Object.assign({}, prev);
                    if (!updated.gate) updated.gate = getDefaultConfig('gate');
                    return updated;
                });
                setStep(2);
            }}>
                Yes, configure a gate now
            </button>
            <button className="wizard-gate-skip-btn" onClick={function() {
                setGateAnswer('no');
                setStep(hasGateZone ? 3 : 4);
            }}>
                I'll add my gates with my instant quote &rarr;
            </button>
        </div>
    </div>
)}
```

- [ ] **Step 2: Add wizard gate explore CSS**

Append to styles.css:

```css
/* ============================================================
   Wizard Gate Exploration (reframed)
   ============================================================ */
.wizard-gate-explore {
  max-width: 600px;
  margin: 0 auto;
}
.wizard-gate-cards {
  display: flex;
  gap: 16px;
  margin: 20px 0;
}
.wizard-gate-card {
  flex: 1;
  background: #fff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
.wizard-gate-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}
.wizard-gate-card-body { padding: 12px; }
.wizard-gate-card-title {
  font-size: 15px;
  font-weight: 700;
  color: #1B3A5C;
  margin-bottom: 4px;
}
.wizard-gate-card-desc {
  font-size: 12px;
  color: #718096;
  margin-bottom: 6px;
}
.wizard-gate-card-tag {
  font-size: 10px;
  font-weight: 600;
  color: #16A34A;
  background: #F0FFF4;
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
}
.wizard-gate-custom {
  background: #f8fafc;
  border: 1px dashed #CBD5E0;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #718096;
  text-align: center;
  margin-bottom: 20px;
}
.wizard-gate-custom-link {
  background: none;
  border: none;
  color: #6BA3C2;
  text-decoration: underline;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
}
.wizard-gate-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wizard-gate-explore-btn {
  padding: 12px;
  background: #fff;
  color: #1B3A5C;
  border: 1.5px solid #1B3A5C;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.wizard-gate-explore-btn:hover { background: #f0f4f8; }
.wizard-gate-skip-btn {
  padding: 14px;
  background: #D4753A;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.wizard-gate-skip-btn:hover { background: #c46830; }
```

- [ ] **Step 3: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles.

- [ ] **Step 4: Commit**

```bash
git add WizardShell.js styles.css
git commit -m "feat: reframe wizard gate step as educational exploration"
```

---

### Task 6: Update QuoteBuilder to read gv_saved_design + remove needsGates

**Files:**
- Modify: `QuoteBuilder.js:98-108` (loadQuoteData), `QuoteBuilder.js:141-187` (StepProject), `QuoteBuilder.js:380-392` (StepGates empty state), `QuoteBuilder.js:31-67` (buildQuoteConfig)

- [ ] **Step 1: Add saved design reader and pre-fill logic**

After the existing `loadQuoteData` function (around line 108), add:

```js
function loadSavedDesign() {
    try {
        var raw = localStorage.getItem('gv_saved_design');
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

function prefillFromSavedDesign(savedDesign) {
    if (!savedDesign || !savedDesign.styleId) return null;

    var styleMap = {
        'uaf_200': 'horizon', 'uaf_201': 'horizon-pro',
        'uab_200': 'haven', 'uaf_250': 'vanguard',
        'uas_100': 'charleston', 'uas_101': 'charleston-pro',
        'uas_150': 'savannah', 'uas_300': 'cambridge', 'uas_350': 'lexington',
    };

    var prefill = {
        style: styleMap[savedDesign.styleId] || savedDesign.styleId,
        height: parseInt(savedDesign.height) || 48,
        color: savedDesign.color ? savedDesign.color.displayName.toLowerCase().replace(/\s+/g, '-') : 'textured-black',
        postCap: savedDesign.postCap === 'pcb' ? 'ball' : 'flat',
        picketSpacing: savedDesign.pupType ? 'puppy' : (savedDesign.proSpacing ? 'pro' : 'standard'),
        extras: {
            circles: !!savedDesign.circles,
            butterflies: !!savedDesign.butterflies,
            scrolls: !!savedDesign.scrolls,
        },
        needsFence: true,
        needsGates: false,
    };

    // Pre-fill pool project type
    if (savedDesign.poolBarrier) {
        prefill.projectType = 'pool';
    }

    return prefill;
}
```

- [ ] **Step 2: Update QuoteBuilder mount to check gv_saved_design first**

At line 687 (where `loadQuoteData` is called), modify:

```js
var saved = loadQuoteData();
var designPrefill = prefillFromSavedDesign(loadSavedDesign());
var initialData = Object.assign({}, defaultData, saved || {}, designPrefill || {});
var dataState = useState(initialData);
```

- [ ] **Step 3: Remove needsGates checkbox from StepProject**

In StepProject (lines 164-174), remove the `needsGates` checkbox. Keep the `needsFence` checkbox. The section becomes just the project type cards + ZIP input.

Remove lines 170-173 (the needsGates checkbox and its label).

- [ ] **Step 4: Make StepGates always accessible**

Replace lines 384-392 (the `!data.needsGates` empty state) with:

```js
// Gate step is always accessible — no longer gated by needsGates checkbox
```

Remove the early return / empty state message entirely. The gate list and "Add Gate" button are always shown.

Add at the bottom of StepGates (before the closing div):

```js
<div className="qb-gate-custom-note">
    <strong>Estate &amp; Cantilever Gates</strong> are custom order.{' '}
    <button className="qb-gate-custom-link" onClick={function() {}}>
        Contact us for a quote
    </button>
</div>
<button className="qb-gate-skip" onClick={handleNext}>
    Skip — no gates needed &rarr;
</button>
```

- [ ] **Step 5: Fix puppyPickets bug in buildQuoteConfig**

At line 62, replace:

```js
puppyPickets: !!(data.extras && data.extras.puppyPickets),
```

with:

```js
puppyPickets: data.picketSpacing === 'puppy',
```

- [ ] **Step 6: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles.

- [ ] **Step 7: Commit**

```bash
git add QuoteBuilder.js
git commit -m "feat: pre-fill QuoteBuilder from gv_saved_design, remove needsGates, fix puppy bug"
```

---

### Task 7: Create AreaReturnPage for multi-area flow

**Files:**
- Create: `AreaReturnPage.js`

- [ ] **Step 1: Create the component**

```js
import React from 'react';

var AreaReturnPage = function(props) {
    var area1Config = props.area1Config;
    var onSameSystem = props.onSameSystem;
    var onDifferentSystem = props.onDifferentSystem;
    var onBack = props.onBack;

    var styleName = area1Config ? (area1Config.styleId || 'your fence') : 'your fence';
    var colorName = area1Config && area1Config.color ? area1Config.color.displayName : '';

    return (
        <div className="area-return-page">
            <div className="area-return-content">
                <div className="area-return-progress">
                    <span className="area-return-step done">Area 1: Front Yard &#10003;</span>
                    <span className="area-return-step-divider">&mdash;</span>
                    <span className="area-return-step current">Area 2: Backyard</span>
                </div>

                <h1 className="area-return-title">Now let's do your backyard</h1>
                <p className="area-return-desc">Your front yard design is saved. Would you like the same fence system for the backyard?</p>

                {area1Config && area1Config.snapshotDataUrl && (
                    <div className="area-return-snapshot">
                        <img src={area1Config.snapshotDataUrl} alt="Front yard design" className="area-return-snapshot-img" />
                        <div className="area-return-snapshot-label">Front Yard Design</div>
                    </div>
                )}

                <div className="area-return-options">
                    <button className="area-return-option-btn area-return-same" onClick={onSameSystem}>
                        <strong>Yes, same system</strong>
                        <span>Use the same style, color, and options for the backyard</span>
                    </button>
                    <button className="area-return-option-btn area-return-diff" onClick={onDifferentSystem}>
                        <strong>No, different system</strong>
                        <span>Configure a different fence for the backyard</span>
                    </button>
                </div>

                <button className="area-return-back" onClick={onBack}>
                    &larr; Back to front yard
                </button>
            </div>
        </div>
    );
};

export default AreaReturnPage;
```

- [ ] **Step 2: Add area return page CSS**

Append to styles.css:

```css
/* ============================================================
   Area Return Page (Multi-Area Flow)
   ============================================================ */
.area-return-page {
  width: 100%;
  min-height: 100vh;
  background: #f7fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.area-return-content {
  max-width: 520px;
  width: calc(100% - 48px);
  text-align: center;
}
.area-return-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}
.area-return-step {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 20px;
  background: #e2e8f0;
  color: #718096;
}
.area-return-step.done { background: #16A34A; color: #fff; }
.area-return-step.current { background: #1B3A5C; color: #fff; }
.area-return-step-divider { color: #CBD5E0; }
.area-return-title {
  font-size: 24px;
  font-weight: 800;
  color: #1B3A5C;
  margin: 0 0 8px;
}
.area-return-desc {
  font-size: 14px;
  color: #718096;
  margin-bottom: 20px;
}
.area-return-snapshot {
  background: #0c1420;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
  position: relative;
}
.area-return-snapshot-img {
  width: 100%;
  display: block;
}
.area-return-snapshot-label {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0,0,0,0.6);
  color: #fff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.area-return-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}
.area-return-option-btn {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 18px;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 150ms ease;
}
.area-return-option-btn strong {
  font-size: 15px;
}
.area-return-option-btn span {
  font-size: 12px;
  opacity: 0.8;
}
.area-return-same {
  background: #D4753A;
  color: #fff;
  border: none;
}
.area-return-same:hover { background: #c46830; }
.area-return-diff {
  background: #fff;
  color: #1B3A5C;
  border: 1.5px solid #e2e8f0;
}
.area-return-diff:hover { border-color: #1B3A5C; }
.area-return-back {
  background: none;
  border: none;
  color: #6BA3C2;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.area-return-back:hover { text-decoration: underline; }
```

- [ ] **Step 3: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles.

- [ ] **Step 4: Commit**

```bash
git add AreaReturnPage.js styles.css
git commit -m "feat: add AreaReturnPage for multi-area (Front + Backyard) flow"
```

---

### Task 8: Wire multi-area flow into app.js

**Files:**
- Modify: `app.js` (add area state management and AreaReturnPage routing)

- [ ] **Step 1: Add multi-area state**

After the existing view state declarations (around line 223), add:

```js
// Multi-area flow state
var multiAreaState = useState(null); // null = single area, { areas: [...], activeAreaIndex: 0 }
var multiArea = multiAreaState[0];
var setMultiArea = multiAreaState[1];
```

- [ ] **Step 2: Add `'area-return'` view routing**

In the render section, add after the `design-review` branch:

```js
if (view === 'area-return') {
    return React.createElement(AreaReturnPage, {
        area1Config: multiArea && multiArea.areas ? multiArea.areas[0] : null,
        onSameSystem: function() {
            // Copy area 1 config to area 2
            setMultiArea(function(prev) {
                if (!prev || !prev.areas) return prev;
                var updated = Object.assign({}, prev);
                var areas = updated.areas.slice();
                areas[1] = Object.assign({}, areas[0], { zone: 'back', layout: null });
                updated.areas = areas;
                updated.activeAreaIndex = 1;
                return updated;
            });
            // Save area 2 design and go to bridge page for measurement
            setView('design-review');
        },
        onDifferentSystem: function() {
            // Go to design tool with backyard tab
            setActiveTab('backyard');
            setView('studio');
        },
        onBack: function() {
            setView('design-review');
        },
    });
}
```

- [ ] **Step 3: Add import for AreaReturnPage**

```js
import AreaReturnPage from './AreaReturnPage';
```

- [ ] **Step 4: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles.

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: wire multi-area state and AreaReturnPage routing"
```

---

### Task 9: Wire pool popup into backyard flow

**Files:**
- Modify: `app.js` (add pool popup state and trigger)
- Modify: `DesignReviewPage.js` (show pool popup when backyard + no pool data)

- [ ] **Step 1: Add pool popup state to app.js**

After the multi-area state (added in Task 8):

```js
var poolPopupState = useState(false);
var showPoolPopup = poolPopupState[0];
var setShowPoolPopup = poolPopupState[1];
```

Import at top of app.js:

```js
import PoolCompliancePopup from './PoolCompliancePopup';
```

- [ ] **Step 2: Add pool popup rendering in design-review view**

In the `design-review` view branch, add the popup conditionally:

After the `DesignReviewPage` createElement, render the popup overlay if needed. The cleanest approach: pass `showPoolPopup` and `onPoolComplete` as props to DesignReviewPage, and let it render the popup internally.

Update the DesignReviewPage createElement to include:

```js
showPoolPopup: showPoolPopup,
onPoolComplete: function(result) {
    setShowPoolPopup(false);
    // Update saved design with pool data
    try {
        var raw = localStorage.getItem('gv_saved_design');
        if (raw) {
            var design = JSON.parse(raw);
            design.poolBarrier = result.poolBarrier;
            design.poolCompliance = result.poolCompliance;
            localStorage.setItem('gv_saved_design', JSON.stringify(design));
        }
    } catch (e) {}
},
onPoolCancel: function() { setShowPoolPopup(false); },
```

- [ ] **Step 3: Trigger pool popup on bridge page load for backyard**

In DesignReviewPage.js, add a useEffect that checks if scene is backyard and pool hasn't been answered:

```js
useEffect(function() {
    if (hasDesign && saved.scene === 'backyard' && saved.poolBarrier === false && saved.poolCompliance === null) {
        if (props.showPoolPopup !== undefined) {
            // Trigger is controlled by parent — not needed here
        }
    }
}, []);
```

Actually, simpler: in app.js, when setting view to `'design-review'`, check if the saved design is backyard and trigger:

In `handleGetQuote`, after `setView('design-review')`:

```js
if (scene === 'backyard' && !savedDesign.poolBarrier) {
    setShowPoolPopup(true);
}
```

- [ ] **Step 4: Add pool popup rendering in DesignReviewPage**

Add to the DesignReviewPage return, at the end inside the `.bridge-page` div:

```js
{props.showPoolPopup && (
    <PoolCompliancePopup
        currentStyleId={hasDesign ? saved.styleId : ''}
        onComplete={props.onPoolComplete}
        onCancel={props.onPoolCancel}
    />
)}
```

Add the import at top of DesignReviewPage.js:

```js
import PoolCompliancePopup from './PoolCompliancePopup';
```

- [ ] **Step 5: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles.

- [ ] **Step 6: Commit**

```bash
git add app.js DesignReviewPage.js
git commit -m "feat: wire pool compliance popup into backyard flow"
```

---

### Task 10: Auto-persist fence configs to localStorage

**Files:**
- Modify: `app.js` (add useEffect to save fenceConfig and backyardConfig)

- [ ] **Step 1: Add auto-save for fence configs**

Currently only the gate `config` auto-saves (lines 283-291). Add equivalent saves for the fence configs. After the existing useEffect for gate config:

```js
useEffect(function() {
    try {
        localStorage.setItem('gv_fence_config', JSON.stringify(frontYardConfig));
    } catch (e) {}
}, [frontYardConfig]);

useEffect(function() {
    try {
        localStorage.setItem('gv_back_config', JSON.stringify(backyardConfig));
    } catch (e) {}
}, [backyardConfig]);
```

- [ ] **Step 2: Build and verify**

Run: `npx webpack --mode development`
Expected: Compiles.

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "fix: auto-persist fenceConfig and backyardConfig to localStorage"
```

---

### Task 11: Final integration test and push

- [ ] **Step 1: Full build**

Run: `npx webpack --mode development`
Expected: Compiles with only pre-existing warnings.

- [ ] **Step 2: Verify file list**

Check that all new/modified files are tracked:

```bash
git status
```

Expected new files: `DesignReviewPage.js`, `PoolCompliancePopup.js`, `AreaReturnPage.js`
Expected modified files: `app.js`, `QuoteBuilder.js`, `WizardShell.js`, `styles.css`

- [ ] **Step 3: Push to dev**

```bash
git push origin dev
```

- [ ] **Step 4: Verify deployment on Cloudflare Pages preview**

Check the dev branch preview URL to verify:
- "Get Quote" from design tool → bridge page with snapshot + selections
- Address entry works → navigates to draw tool
- "Enter Footage Manually" → QuoteBuilder with pre-filled data
- Pool popup appears for backyard scenes
- Gate step in wizard is educational, not blocking
- QuoteBuilder gate step is always accessible
