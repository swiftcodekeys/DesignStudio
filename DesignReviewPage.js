import React, { useState, useEffect, useRef } from 'react';
import PoolCompliancePopup from './PoolCompliancePopup';
import { FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';
import { FENCE_STYLES as GATE_STYLES, POST_CAPS, FINIALS, ARCH_STYLES } from './configData';
import {
    STYLES as PRICING_STYLES, PANEL_PRICING, POST_PRICING, POST_LENGTH_MAP,
    DEFAULT_POST_SPEC, PANEL_LENGTH_FT, STYLE_ID_MAP,
} from './retailPricing';
import { suggestAddresses, geocodeAddress } from './mapboxGeocoder';

// Human-readable label lookups
var STYLE_NAMES = {};
FENCE_TOOL_STYLES.forEach(function(s) { STYLE_NAMES[s.id] = s.name; });
GATE_STYLES.forEach(function(s) { STYLE_NAMES[s.id] = s.name; });

var POST_CAP_NAMES = { pcf: 'Flat Cap', pcb: 'Ball Cap' };
var FINIAL_NAMES = { fs: 'Spear', ft: 'Triangle', fq: 'Quad', fp: 'Plug' };
var ARCH_NAMES = { e: 'Estate', a: 'Arched', r: 'Reverse', s: 'Standard' };
var MOUNT_NAMES = { p: 'Post Mount', d: 'Direct Mount' };
var LEAF_NAMES = { '1': 'Single', '2': 'Double' };

var POOL_STYLES = ['uab_200', 'uaf_200', 'uaf_250'];

var MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';

// Build per-linear-foot estimate from saved design
function estimatePricing(saved) {
    if (!saved || !saved.styleId) return null;

    var grandviewName = STYLE_ID_MAP[saved.styleId] || saved.styleId;
    var styleInfo = PRICING_STYLES[grandviewName];
    if (!styleInfo) return null;

    var ultraModel = styleInfo.ultraModel;
    var height = parseInt(saved.height) || 48;
    var panelPrices = PANEL_PRICING[ultraModel];
    if (!panelPrices) return null;

    var panelPrice = panelPrices[height] || panelPrices[48] || 0;
    var panelWidthFt = (PANEL_LENGTH_FT && PANEL_LENGTH_FT.residential) || 6;

    var postLength = POST_LENGTH_MAP[height] || 84;
    var postSpec = DEFAULT_POST_SPEC || { size: '2x2', wall: '.060' };
    var postPrices = POST_PRICING[postSpec.size] && POST_PRICING[postSpec.size][postSpec.wall];
    var postPrice = postPrices ? (postPrices[postLength] || 0) : 0;

    var perFoot = (panelPrice / panelWidthFt) + (postPrice / panelWidthFt);

    return {
        styleName: styleInfo.name,
        ultraModel: ultraModel,
        height: height,
        panelPrice: panelPrice,
        panelWidthFt: panelWidthFt,
        postPrice: postPrice,
        perLinearFoot: perFoot,
    };
}

function loadSavedDesign() {
    try {
        var raw = localStorage.getItem('gv_saved_design');
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

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

    var debounceRef = useRef(null);

    // Manual footage popup state
    var manualOpenState = useState(false);
    var manualOpen = manualOpenState[0];
    var setManualOpen = manualOpenState[1];

    var footageState = useState('');
    var footage = footageState[0];
    var setFootage = footageState[1];

    // Mapbox autocomplete (debounced)
    var handleAddressChange = function(e) {
        var val = e.target.value;
        setAddress(val);
        setError('');
        if (!val.trim() || val.length < 3) { setSuggestions([]); return; }
        if (!MAPBOX_TOKEN) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(function() {
            suggestAddresses(val, MAPBOX_TOKEN).then(function(results) {
                setSuggestions(results);
            }).catch(function() {
                setSuggestions([]);
            });
        }, 250);
    };

    var selectSuggestion = function(s) {
        setAddress(s.placeName);
        setSuggestions([]);
        var loc = { address: s.placeName, lat: s.lat, lng: s.lng };
        try { localStorage.setItem('gv_bridge_location', JSON.stringify(loc)); } catch (e) {}
        onNavigateToDraw(loc);
    };

    var handleSubmitAddress = function(e) {
        e.preventDefault();
        if (!address.trim()) { setError('Please enter an address'); return; }
        setSuggestions([]);
        if (!MAPBOX_TOKEN) { setError('Map service unavailable. Please refresh and try again.'); return; }
        setLoading(true);
        geocodeAddress(address, MAPBOX_TOKEN).then(function(result) {
            setLoading(false);
            var loc = { address: result.placeName, lat: result.lat, lng: result.lng };
            try { localStorage.setItem('gv_bridge_location', JSON.stringify(loc)); } catch (e) {}
            onNavigateToDraw(loc);
        }).catch(function() {
            setLoading(false);
            setError('Could not find that address. Please try again.');
        });
    };

    // Manual footage popup handlers
    var openManualPopup = function() {
        setFootage('');
        setManualOpen(true);
    };
    var closeManualPopup = function() { setManualOpen(false); };
    var submitManualFootage = function(e) {
        if (e) e.preventDefault();
        var ft = parseInt(footage, 10);
        if (!ft || ft < 1) return;
        onNavigateToManual({ totalFeet: ft, manualEntry: true });
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
        var isPrivacy = saved.styleId && saved.styleId.indexOf('priv') >= 0;
        if (isPrivacy && saved.privacyPostColor) selections.push({ label: 'Privacy Post', value: saved.privacyPostColor });
        if (isPrivacy && saved.privacyPanelColor) selections.push({ label: 'Privacy Panel', value: saved.privacyPanelColor });
    }

    var isPoolReady = hasDesign && saved.poolBarrier && POOL_STYLES.indexOf(saved.styleId) >= 0;
    var pricing = hasDesign ? estimatePricing(saved) : null;

    var fmt = function(n) { return '$' + Math.round(n).toLocaleString('en-US'); };

    return (
        <div className="bridge-page bridge-page--compact">

            <div className="bridge-content">
                <div className="bridge-header bridge-header--compact">
                    <h1 className="bridge-header-title">
                        {hasDesign ? 'Your Design is Saved' : 'Get Your Fence Quote'}
                    </h1>
                    <p className="bridge-header-subtitle">
                        {hasDesign
                            ? "Review your selections, then choose how to measure."
                            : 'Enter your property address or measurements to get started.'}
                    </p>
                    {hasDesign && (
                        <button className="bridge-edit-link" onClick={onNavigateToStudio}>
                            &larr; Back to Design Tool
                        </button>
                    )}
                </div>

                <div className="bridge-columns">
                    {/* LEFT: Saved image + current selections */}
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
                                <button className="bridge-skip-link" onClick={openManualPopup}>
                                    Skip to quote. Choose options during the quote process.
                                </button>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Quote config — pricing + CTAs + address + manual */}
                    <div className="bridge-right">
                        {/* Price estimate (moved from left) */}
                        {pricing && (
                            <div className="bridge-pricing">
                                <div className="bridge-pricing-title">PRICE ESTIMATE</div>
                                <div className="bridge-pricing-subtitle">
                                    Ultra retail, based on your selections
                                </div>
                                <table className="bridge-pricing-table">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th style={{ textAlign: 'right' }}>Unit</th>
                                            <th style={{ textAlign: 'right' }}>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>{pricing.styleName} Panel | {pricing.height}" ({pricing.ultraModel})</td>
                                            <td style={{ textAlign: 'right' }}>{pricing.panelWidthFt}' section</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(pricing.panelPrice)}</td>
                                        </tr>
                                        <tr>
                                            <td>Residential Post | 2" sq</td>
                                            <td style={{ textAlign: 'right' }}>each</td>
                                            <td style={{ textAlign: 'right' }}>{fmt(pricing.postPrice)}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan="2"><strong>Estimated per linear foot</strong></td>
                                            <td style={{ textAlign: 'right' }}><strong>{fmt(pricing.perLinearFoot)}</strong>/ft</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <div className="bridge-pricing-note">
                                    Gates, hardware, accessories, and shipping calculated in the next step.
                                </div>
                            </div>
                        )}

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
                                                        key={s.id}
                                                        type="button"
                                                        className="bridge-suggestion-item"
                                                        onClick={function() { selectSuggestion(s); }}
                                                    >
                                                        {s.placeName}
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

                        {/* Manual entry — now opens a popup */}
                        <button className="bridge-manual-card" onClick={openManualPopup}>
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
                                Drop us a line and a Grandview rep will walk you through it
                            </button>
                            <div className="bridge-contact-phone">Or call (855) FENCE-30</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Manual footage popup */}
            {manualOpen && (
                <div className="bridge-manual-popup-overlay" onClick={function(e) {
                    if (e.target === e.currentTarget) closeManualPopup();
                }}>
                    <form className="bridge-manual-popup" onSubmit={submitManualFootage}>
                        <h3>Enter Your Linear Footage</h3>
                        <p>Total feet of fence you need. You can adjust this in the next step.</p>
                        <input
                            type="number"
                            className="bridge-manual-popup-input"
                            placeholder="e.g. 150"
                            min="1"
                            value={footage}
                            onChange={function(e) { setFootage(e.target.value); }}
                            autoFocus
                        />
                        <div className="bridge-manual-popup-actions">
                            <button type="button" className="bridge-manual-popup-cancel" onClick={closeManualPopup}>
                                Cancel
                            </button>
                            <button type="submit" className="bridge-manual-popup-go" disabled={!footage || parseInt(footage, 10) < 1}>
                                Continue to Quote &rarr;
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {props.showPoolPopup && (
                <PoolCompliancePopup
                    currentStyleId={hasDesign ? saved.styleId : ''}
                    onComplete={props.onPoolComplete}
                    onCancel={props.onPoolCancel}
                />
            )}
        </div>
    );
};

export default DesignReviewPage;
