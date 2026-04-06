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
