import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FENCE_STYLES as FENCE_TOOL_STYLES, FENCE_COLORS } from './fenceConfigData';
import { GATE_COMPATIBLE_WIDTHS } from './retailPricing';

var GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
if (GOOGLE_MAPS_KEY) {
    console.log('[DrawYard] Maps API key loaded:', GOOGLE_MAPS_KEY.substring(0, 12) + '...');
} else {
    console.warn('[DrawYard] No Google Maps API key found in process.env.GOOGLE_MAPS_API_KEY');
}

// Style thumbnail map for follow-up Q4
var STYLE_THUMBS = {
    uaf_200: 'assets/ifence_previews/gate_styles/san_marino_15.png',
    uaf_201: 'assets/ifence_previews/gate_styles/santa_monica_9.png',
    uaf_250: 'assets/ifence_previews/gate_styles/sanibel_12.png',
    uab_200: 'assets/ifence_previews/gate_styles/boca_grande_45.png',
    uas_100: 'assets/ifence_previews/gate_styles/bella_vista_48.png',
    uas_101: 'assets/ifence_previews/gate_styles/charleston_pro.png',
    uas_150: 'assets/ifence_previews/gate_styles/bella_terra_51.png',
    uas_300: 'assets/ifence_previews/gate_styles/castile_36.png',
    uas_350: 'assets/ifence_previews/gate_styles/camelot_39.png',
};

// ============================================================
// Google Maps Script Loader
// ============================================================
var mapsLoaded = false;
var mapsCallbacks = [];

function loadGoogleMaps(callback) {
    if (window.google && window.google.maps) {
        callback();
        return;
    }
    mapsCallbacks.push(callback);
    if (mapsLoaded) return;
    mapsLoaded = true;

    window.__initGoogleMaps = function() {
        mapsCallbacks.forEach(function(cb) { cb(); });
        mapsCallbacks = [];
    };

    var script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_MAPS_KEY + '&libraries=places&callback=__initGoogleMaps';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

// ============================================================
// Haversine distance in feet
// ============================================================
function distanceFt(lat1, lng1, lat2, lng2) {
    var R = 20902231; // Earth radius in feet
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// ============================================================
// Address Entry Screen
// ============================================================
var AddressEntry = function(props) {
    var onAddressSelect = props.onAddressSelect;
    var onSkip = props.onSkip;

    var addrState = useState('');
    var address = addrState[0];
    var setAddress = addrState[1];

    var suggestionsState = useState([]);
    var suggestions = suggestionsState[0];
    var setSuggestions = suggestionsState[1];

    var errorState = useState('');
    var error = errorState[0];
    var setError = errorState[1];

    var loadingState = useState(false);
    var loading = loadingState[0];
    var setLoading = loadingState[1];

    var serviceRef = useRef(null);
    var debounceRef = useRef(null);

    var handleChange = function(e) {
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
        geocodeAddress(prediction.description);
    };

    var geocodeAddress = function(addr) {
        if (!window.google || !window.google.maps) {
            setError('Google Maps is still loading.');
            return;
        }
        setLoading(true);
        var geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: addr }, function(results, status) {
            setLoading(false);
            if (status === 'OK' && results[0]) {
                onAddressSelect({
                    address: results[0].formatted_address,
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                });
            } else {
                setError('Geocode error: ' + status + '. Check that the Maps API key has Geocoding API enabled.');
            }
        });
    };

    var handleSubmit = function(e) {
        e.preventDefault();
        if (!address.trim()) { setError('Please enter an address'); return; }
        setSuggestions([]);
        geocodeAddress(address);
    };

    return (
        <div className="draw-address-overlay">
            <div className="draw-address-card">
                <div className="draw-address-label">DESIGN STUDIO</div>
                <h2>Draw Your Fence Layout</h2>
                <p>Enter your property address to view it on satellite imagery, then click to trace your fence lines.</p>
                <form onSubmit={handleSubmit} autoComplete="off">
                    <div className="draw-address-wrap">
                        <input
                            type="text"
                            className="draw-address-input"
                            placeholder="123 Main St, Howell, MI 48843"
                            value={address}
                            onChange={handleChange}
                            autoComplete="off"
                        />
                        {suggestions.length > 0 && (
                            <div className="draw-suggestions">
                                {suggestions.map(function(s) {
                                    return (
                                        <button
                                            key={s.place_id}
                                            type="button"
                                            className="draw-suggestion-item"
                                            onClick={function() { selectSuggestion(s); }}
                                        >
                                            {s.description}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    {error && <div className="draw-address-error">{error}</div>}
                    <button type="submit" className="draw-address-btn" disabled={loading}>
                        {loading ? 'Searching...' : 'View My Property'}
                    </button>
                </form>
                <button className="draw-skip-link" onClick={onSkip}>
                    Skip &mdash; I'll enter measurements manually
                </button>
            </div>
        </div>
    );
};

// ============================================================
// Drawing Map (with floating action buttons + instruction overlay)
// ============================================================
var DrawingMap = function(props) {
    var location = props.location;
    var lines = props.lines;
    var setLines = props.setLines;
    var activeLineIndex = props.activeLineIndex;
    var setActiveLineIndex = props.setActiveLineIndex;
    var drawMode = props.drawMode;
    var undoStack = props.undoStack;
    var setUndoStack = props.setUndoStack;
    var redoStack = props.redoStack;
    var setRedoStack = props.setRedoStack;
    var onNewLine = props.onNewLine;
    var onUndo = props.onUndo;
    var onClear = props.onClear;
    var canUndo = props.canUndo;
    // DRAW 6 props
    var gateMarkers = props.gateMarkers;
    var onAddGateMarker = props.onAddGateMarker;
    var onRemoveGateMarker = props.onRemoveGateMarker;

    var mapRef = useRef(null);
    var mapInstanceRef = useRef(null);
    var markersRef = useRef([]);
    var polylinesRef = useRef([]);
    var labelsRef = useRef([]);
    var gateMarkersRef = useRef([]);

    // DRAW 5: instruction overlay
    var instructionState = useState(true);
    var showInstructions = instructionState[0];
    var setShowInstructions = instructionState[1];

    // DRAW 6: gate popup state
    var gatePopupState = useState(null); // { lineIndex, segmentIndex, lat, lng }
    var gatePopup = gatePopupState[0];
    var setGatePopup = gatePopupState[1];
    var gateTypeState = useState('walk');
    var gateType = gateTypeState[0];
    var setGateType = gateTypeState[1];
    var gateWidthState = useState(48);
    var gateWidth = gateWidthState[0];
    var setGateWidth = gateWidthState[1];

    // Initialize map
    useEffect(function() {
        if (!window.google || !mapRef.current) return;
        if (mapInstanceRef.current) return;

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: location.lat, lng: location.lng },
            zoom: 18,
            mapTypeId: 'satellite',
            tilt: 0,
            disableDefaultUI: true,
            zoomControl: true,
            zoomControlOptions: {
                position: window.google.maps.ControlPosition.RIGHT_CENTER,
            },
            gestureHandling: 'greedy',
        });
        window.__drawMapInstance = mapInstanceRef.current;

        // Click handler for placing nodes
        mapInstanceRef.current.addListener('click', function(e) {
            if (!drawMode) return;
            var lat = e.latLng.lat();
            var lng = e.latLng.lng();
            window.__drawMapClick({ lat: lat, lng: lng });
            // Dismiss instructions on first click
            setShowInstructions(false);
        });
    }, [location]);

    // Expose click handler via window (avoids stale closure)
    useEffect(function() {
        window.__drawMapClick = function(point) {
            setLines(function(prev) {
                var updated = prev.slice();
                var idx = activeLineIndex;
                if (idx < 0 || idx >= updated.length) {
                    updated.push({
                        label: 'Line ' + (updated.length + 1),
                        points: [point],
                    });
                    setActiveLineIndex(updated.length - 1);
                } else {
                    updated[idx] = Object.assign({}, updated[idx], {
                        points: updated[idx].points.concat([point]),
                    });
                }
                setUndoStack(function(u) { return u.concat([prev]); });
                setRedoStack([]);
                return updated;
            });
        };
        return function() { delete window.__drawMapClick; delete window.__drawMapInstance; };
    }, [activeLineIndex, setLines, setActiveLineIndex, setUndoStack, setRedoStack]);

    // Render markers, polylines, distance labels, and gate markers
    useEffect(function() {
        if (!mapInstanceRef.current || !window.google) return;

        // Clear old
        markersRef.current.forEach(function(m) { m.setMap(null); });
        polylinesRef.current.forEach(function(p) { p.setMap(null); });
        labelsRef.current.forEach(function(l) { l.setMap(null); });
        gateMarkersRef.current.forEach(function(m) { m.setMap(null); });
        markersRef.current = [];
        polylinesRef.current = [];
        labelsRef.current = [];
        gateMarkersRef.current = [];

        lines.forEach(function(line, lineIdx) {
            var path = line.points.map(function(p) {
                return new window.google.maps.LatLng(p.lat, p.lng);
            });

            // Polyline — green for satellite contrast
            if (path.length >= 2) {
                var polyline = new window.google.maps.Polyline({
                    path: path,
                    strokeColor: '#22C55E',
                    strokeOpacity: 0.9,
                    strokeWeight: 3,
                    map: mapInstanceRef.current,
                    clickable: true,
                });
                polylinesRef.current.push(polyline);

                // DRAW 6: Click polyline segment to add gate
                polyline.addListener('click', function(e) {
                    if (drawMode) return; // don't intercept during draw mode
                    var clickLat = e.latLng.lat();
                    var clickLng = e.latLng.lng();
                    // Find nearest segment
                    var bestSeg = 0;
                    var bestDist = Infinity;
                    for (var si = 0; si < line.points.length - 1; si++) {
                        var midLat = (line.points[si].lat + line.points[si + 1].lat) / 2;
                        var midLng = (line.points[si].lng + line.points[si + 1].lng) / 2;
                        var d = distanceFt(clickLat, clickLng, midLat, midLng);
                        if (d < bestDist) { bestDist = d; bestSeg = si; }
                    }
                    // Compute position along segment in feet
                    var segStart = line.points[bestSeg];
                    var posFt = distanceFt(segStart.lat, segStart.lng, clickLat, clickLng);
                    setGatePopup({
                        lineIndex: lineIdx,
                        segmentIndex: bestSeg,
                        positionFt: Math.round(posFt),
                        lat: clickLat,
                        lng: clickLng,
                    });
                    setGateType('walk');
                    setGateWidth(48);
                });
            }

            // Node markers
            line.points.forEach(function(point, ptIdx) {
                var marker = new window.google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: mapInstanceRef.current,
                    draggable: true,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#1B3A5C',
                        fillOpacity: 1,
                        strokeColor: '#1B3A5C',
                        strokeWeight: 2,
                        scale: 6,
                    },
                });

                marker.addListener('dragend', function(e) {
                    var newLat = e.latLng.lat();
                    var newLng = e.latLng.lng();
                    setLines(function(prev) {
                        var updated = prev.slice();
                        var pts = updated[lineIdx].points.slice();
                        pts[ptIdx] = { lat: newLat, lng: newLng };
                        updated[lineIdx] = Object.assign({}, updated[lineIdx], { points: pts });
                        return updated;
                    });
                });

                markersRef.current.push(marker);
            });

            // Distance labels
            for (var i = 0; i < line.points.length - 1; i++) {
                var p1 = line.points[i];
                var p2 = line.points[i + 1];
                var midLat = (p1.lat + p2.lat) / 2;
                var midLng = (p1.lng + p2.lng) / 2;
                var dist = Math.round(distanceFt(p1.lat, p1.lng, p2.lat, p2.lng));

                var label = new window.google.maps.Marker({
                    position: { lat: midLat, lng: midLng },
                    map: mapInstanceRef.current,
                    icon: {
                        path: 'M -20,-10 L 20,-10 L 20,10 L -20,10 Z',
                        fillColor: '#fff',
                        fillOpacity: 0.9,
                        strokeColor: '#22C55E',
                        strokeWeight: 1,
                        scale: 1,
                    },
                    label: {
                        text: dist + ' ft',
                        color: '#1B3A5C',
                        fontSize: '11px',
                        fontWeight: '700',
                    },
                    clickable: false,
                });
                labelsRef.current.push(label);
            }
        });

        // DRAW 6: Render gate markers on map (orange)
        gateMarkers.forEach(function(gm, gmIdx) {
            var line = lines[gm.lineIndex];
            if (!line || !line.points[gm.segmentIndex] || !line.points[gm.segmentIndex + 1]) return;
            var seg0 = line.points[gm.segmentIndex];
            var seg1 = line.points[gm.segmentIndex + 1];
            var segLen = distanceFt(seg0.lat, seg0.lng, seg1.lat, seg1.lng);
            var frac = segLen > 0 ? Math.min(gm.positionFt / segLen, 1) : 0.5;
            var gateLat = seg0.lat + (seg1.lat - seg0.lat) * frac;
            var gateLng = seg0.lng + (seg1.lng - seg0.lng) * frac;

            var gateLabel = gm.type === 'walk' ? 'W' : 'D';
            var gateMapMarker = new window.google.maps.Marker({
                position: { lat: gateLat, lng: gateLng },
                map: mapInstanceRef.current,
                icon: {
                    path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    fillColor: '#D4753A',
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    scale: 7,
                },
                label: {
                    text: gateLabel,
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '700',
                },
                title: (gm.type === 'walk' ? 'Walk' : 'Drive') + ' Gate — ' + gm.widthInches + '"',
            });
            gateMapMarker.addListener('click', function() {
                if (window.confirm('Remove this ' + (gm.type === 'walk' ? 'walk' : 'drive') + ' gate (' + gm.widthInches + '")?')) {
                    onRemoveGateMarker(gmIdx);
                }
            });
            gateMarkersRef.current.push(gateMapMarker);
        });
    }, [lines, setLines, gateMarkers, drawMode]);

    var handleConfirmGate = function() {
        if (!gatePopup) return;
        onAddGateMarker({
            lineIndex: gatePopup.lineIndex,
            segmentIndex: gatePopup.segmentIndex,
            positionFt: gatePopup.positionFt,
            type: gateType,
            widthInches: gateWidth,
        });
        setGatePopup(null);
    };

    var walkWidths = GATE_COMPATIBLE_WIDTHS.residential.walk;
    var driveWidths = GATE_COMPATIBLE_WIDTHS.residential.drive;
    var widthOptions = gateType === 'walk' ? walkWidths : driveWidths;

    return (
        <div className="draw-map-wrap">
            <div ref={mapRef} className="draw-map" />

            {/* DRAW 5: Instruction overlay */}
            {showInstructions && (
                <div className="draw-instruction-overlay">
                    Click to place points along your fence line. Double-click to finish a section.
                </div>
            )}

            {/* DRAW 5: Floating action buttons */}
            <div className="draw-float-actions">
                <button className="draw-float-btn draw-float-primary" onClick={onNewLine} title="Start a new fence line">
                    &#9998; Draw New Line
                </button>
                <button className="draw-float-btn draw-float-secondary" onClick={onUndo} disabled={!canUndo} title="Undo last point">
                    &#8617; Undo
                </button>
                <button className="draw-float-btn draw-float-secondary" onClick={onClear} title="Clear all lines">
                    &#128465; Clear All
                </button>
            </div>

            {/* DRAW 6: Gate popup */}
            {gatePopup && (
                <div className="draw-gate-popup-overlay" onClick={function() { setGatePopup(null); }}>
                    <div className="draw-gate-popup" onClick={function(e) { e.stopPropagation(); }}>
                        <div className="draw-gate-popup-title">Add Gate to Segment</div>
                        <div className="draw-gate-popup-field">
                            <label className="draw-gate-label">Gate Type</label>
                            <div className="draw-gate-type-row">
                                <button
                                    className={'draw-gate-type-btn' + (gateType === 'walk' ? ' selected' : '')}
                                    onClick={function() { setGateType('walk'); setGateWidth(48); }}
                                >Walk Gate</button>
                                <button
                                    className={'draw-gate-type-btn' + (gateType === 'drive' ? ' selected' : '')}
                                    onClick={function() { setGateType('drive'); setGateWidth(120); }}
                                >Drive Gate</button>
                            </div>
                        </div>
                        <div className="draw-gate-popup-field">
                            <label className="draw-gate-label">Width</label>
                            <select
                                className="draw-gate-select"
                                value={gateWidth}
                                onChange={function(e) { setGateWidth(Number(e.target.value)); }}
                            >
                                {widthOptions.map(function(w) {
                                    return <option key={w} value={w}>{w}" ({Math.round(w / 12 * 10) / 10} ft)</option>;
                                })}
                            </select>
                        </div>
                        <div className="draw-gate-popup-actions">
                            <button className="draw-gate-confirm" onClick={handleConfirmGate}>Add Gate</button>
                            <button className="draw-gate-cancel" onClick={function() { setGatePopup(null); }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================
// Drawing Panel (replaces FloatingPanel when in draw mode)
// ============================================================
var DrawingPanel = function(props) {
    var lines = props.lines;
    var setLines = props.setLines;
    var onNewLine = props.onNewLine;
    var onUndo = props.onUndo;
    var onRedo = props.onRedo;
    var onClear = props.onClear;
    var drawMode = props.drawMode;
    var setDrawMode = props.setDrawMode;
    var onGetQuote = props.onGetQuote;
    var fenceConfig = props.fenceConfig;
    var gateMarkers = props.gateMarkers;

    var canUndo = props.canUndo;
    var canRedo = props.canRedo;

    var totalFt = 0;
    var cornerCount = 0;

    lines.forEach(function(line) {
        for (var i = 0; i < line.points.length - 1; i++) {
            var p1 = line.points[i];
            var p2 = line.points[i + 1];
            totalFt += distanceFt(p1.lat, p1.lng, p2.lat, p2.lng);
        }
        if (line.points.length > 2) {
            cornerCount += line.points.length - 2;
        }
    });
    totalFt = Math.round(totalFt);

    var handleDeleteLine = function(idx) {
        setLines(function(prev) {
            var updated = prev.slice();
            updated.splice(idx, 1);
            return updated;
        });
    };

    var handleRename = function(idx, newName) {
        setLines(function(prev) {
            var updated = prev.slice();
            updated[idx] = Object.assign({}, updated[idx], { label: newName });
            return updated;
        });
    };

    // Config thumbnail
    var configStyle = fenceConfig ? FENCE_TOOL_STYLES.find(function(s) { return s.id === fenceConfig.styleId; }) : null;
    var configColorName = fenceConfig && fenceConfig.color ? fenceConfig.color.displayName : '';
    var configStyleName = configStyle ? configStyle.name : '';
    var configHeight = fenceConfig ? fenceConfig.height : '';
    var hasConfig = !!configStyleName;
    var thumbSrc = fenceConfig ? (STYLE_THUMBS[fenceConfig.styleId] || 'assets/ifence_previews/gate_styles/bella_vista_48.png') : '';

    // Gate opening deduction display
    var gateOpeningFt = 0;
    if (gateMarkers) {
        gateMarkers.forEach(function(gm) { gateOpeningFt += gm.widthInches / 12; });
    }
    gateOpeningFt = Math.round(gateOpeningFt * 10) / 10;

    return (
        <div className="draw-panel">
            {hasConfig && (
                <div className="draw-config-thumb">
                    <img className="draw-config-img" src={thumbSrc} alt={configStyleName} />
                    <div className="draw-config-info">
                        <div className="draw-config-name">{configStyleName} in {configColorName}</div>
                        <div className="draw-config-detail">{configHeight}" | Residential</div>
                    </div>
                </div>
            )}
            <div className="draw-panel-header">
                <div className="draw-panel-title">YOUR FENCE LAYOUT</div>
            </div>

            <div className="draw-toolbar">
                <button className={'draw-tool-btn' + (drawMode ? ' active' : '')} onClick={function() { setDrawMode(true); }} title="Draw mode">
                    &#9998; Draw
                </button>
                <button className="draw-tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
                    &#8617; Undo
                </button>
                <button className="draw-tool-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
                    &#8618; Redo
                </button>
                <button className="draw-tool-btn" onClick={onClear} title="Clear all">
                    &#128465; Clear
                </button>
            </div>

            <div className="draw-lines-list">
                {lines.length === 0 && (
                    <div className="draw-empty">Click on the map to start drawing your fence lines</div>
                )}
                {lines.map(function(line, idx) {
                    var lineFt = 0;
                    for (var i = 0; i < line.points.length - 1; i++) {
                        var p1 = line.points[i];
                        var p2 = line.points[i + 1];
                        lineFt += distanceFt(p1.lat, p1.lng, p2.lat, p2.lng);
                    }
                    lineFt = Math.round(lineFt);

                    return (
                        <div key={idx} className="draw-line-row">
                            <input
                                className="draw-line-label"
                                value={line.label}
                                onChange={function(e) { handleRename(idx, e.target.value); }}
                            />
                            <span className="draw-line-ft">{lineFt} ft</span>
                            <button className="draw-line-delete" onClick={function() { handleDeleteLine(idx); }} title="Delete line">
                                &#128465;
                            </button>
                        </div>
                    );
                })}
            </div>

            {lines.length > 0 && (
                <div className="draw-totals">
                    Total: <strong>{totalFt} ft</strong> &middot; {lines.length} line{lines.length !== 1 ? 's' : ''} &middot; {cornerCount} corner{cornerCount !== 1 ? 's' : ''}
                    {gateMarkers && gateMarkers.length > 0 && (
                        <span> &middot; {gateMarkers.length} gate{gateMarkers.length !== 1 ? 's' : ''}</span>
                    )}
                </div>
            )}

            {gateOpeningFt > 0 && (
                <div className="draw-gate-summary">
                    {totalFt} ft measured &minus; {gateOpeningFt} ft gate openings = <strong>{Math.round(totalFt - gateOpeningFt)} ft</strong> fence
                </div>
            )}

            <div className="draw-panel-actions">
                <button className="draw-new-line-btn" onClick={onNewLine}>+ New Line</button>
                <div className="draw-gate-hint">
                    Tip: Switch off Draw mode, then click a green fence line to add a gate.
                </div>
                {totalFt > 0 && (
                    <button className="draw-quote-btn" onClick={onGetQuote}>
                        Get Quote for This Layout &rarr;
                    </button>
                )}
                <div className="draw-phone-hint">
                    Or call <strong>(855) FENCE-30</strong> for a free estimate
                </div>
            </div>
        </div>
    );
};

// ============================================================
// DRAW 7: Follow-Up Questions Overlay
// ============================================================
var TERRAIN_OPTIONS = [
    { value: 'flat', label: 'Flat' },
    { value: 'gentle', label: 'Gentle Slope' },
    { value: 'steep', label: 'Steep Slope' },
    { value: 'mixed', label: 'Mixed' },
];

var INSTALL_OPTIONS = [
    { value: 'diy', label: "I'll do it myself" },
    { value: 'contractor', label: 'I have a contractor' },
    { value: 'referral', label: 'Not Sure' },
];

var FollowUpQuestions = function(props) {
    var onComplete = props.onComplete;
    var onCancel = props.onCancel;
    var gateMarkerCount = props.gateMarkerCount;
    var hasFenceConfig = props.hasFenceConfig;

    var terrainState = useState('flat');
    var terrain = terrainState[0];
    var setTerrain = terrainState[1];

    var installState = useState('');
    var installPlan = installState[0];
    var setInstallPlan = installState[1];

    // Q2: manual gates (only if no gate markers placed)
    var showGateQuestion = gateMarkerCount === 0;
    var manualGateState = useState([]);
    var manualGates = manualGateState[0];
    var setManualGates = manualGateState[1];

    // Q4: style pick (only if cold entry)
    var showStyleQuestion = !hasFenceConfig;
    var selectedStyleState = useState('');
    var selectedStyle = selectedStyleState[0];
    var setSelectedStyle = selectedStyleState[1];

    var addManualGate = function() {
        setManualGates(function(prev) {
            return prev.concat([{ type: 'walk', widthInches: 48 }]);
        });
    };
    var removeManualGate = function(idx) {
        setManualGates(function(prev) {
            var updated = prev.slice();
            updated.splice(idx, 1);
            return updated;
        });
    };
    var updateManualGate = function(idx, field, value) {
        setManualGates(function(prev) {
            var updated = prev.slice();
            updated[idx] = Object.assign({}, updated[idx]);
            updated[idx][field] = value;
            return updated;
        });
    };

    var canContinue = !!installPlan && (!showStyleQuestion || !!selectedStyle);

    var handleContinue = function() {
        onComplete({
            terrain: terrain,
            installPlan: installPlan,
            gates: showGateQuestion ? manualGates : null,
            style: showStyleQuestion ? selectedStyle : null,
        });
    };

    var walkWidths = GATE_COMPATIBLE_WIDTHS.residential.walk;
    var driveWidths = GATE_COMPATIBLE_WIDTHS.residential.drive;

    return (
        <div className="draw-followup-overlay">
            <div className="draw-followup-card">
                <h2 className="draw-followup-title">A few quick questions</h2>
                <p className="draw-followup-subtitle">Help us give you the most accurate quote.</p>

                {/* Q1: Terrain */}
                <div className="draw-followup-q">
                    <label className="draw-followup-label">What's the ground like?</label>
                    <div className="draw-followup-options">
                        {TERRAIN_OPTIONS.map(function(opt) {
                            return (
                                <button
                                    key={opt.value}
                                    className={'draw-followup-option' + (terrain === opt.value ? ' selected' : '')}
                                    onClick={function() { setTerrain(opt.value); }}
                                >{opt.label}</button>
                            );
                        })}
                    </div>
                </div>

                {/* Q2: Gates (only if no markers placed) */}
                {showGateQuestion && (
                    <div className="draw-followup-q">
                        <label className="draw-followup-label">How many gates do you need?</label>
                        {manualGates.map(function(g, idx) {
                            var widths = g.type === 'walk' ? walkWidths : driveWidths;
                            return (
                                <div key={idx} className="draw-followup-gate-row">
                                    <select
                                        className="draw-followup-select"
                                        value={g.type}
                                        onChange={function(e) { updateManualGate(idx, 'type', e.target.value); }}
                                    >
                                        <option value="walk">Walk Gate</option>
                                        <option value="drive">Drive Gate</option>
                                    </select>
                                    <select
                                        className="draw-followup-select"
                                        value={g.widthInches}
                                        onChange={function(e) { updateManualGate(idx, 'widthInches', Number(e.target.value)); }}
                                    >
                                        {widths.map(function(w) {
                                            return <option key={w} value={w}>{w}"</option>;
                                        })}
                                    </select>
                                    <button className="draw-followup-remove" onClick={function() { removeManualGate(idx); }}>&times;</button>
                                </div>
                            );
                        })}
                        <button className="draw-followup-add-gate" onClick={addManualGate}>+ Add a gate</button>
                    </div>
                )}

                {/* Q3: Install plan */}
                <div className="draw-followup-q">
                    <label className="draw-followup-label">Who will install the fence?</label>
                    <div className="draw-followup-options">
                        {INSTALL_OPTIONS.map(function(opt) {
                            return (
                                <button
                                    key={opt.value}
                                    className={'draw-followup-option' + (installPlan === opt.value ? ' selected' : '')}
                                    onClick={function() { setInstallPlan(opt.value); }}
                                >{opt.label}</button>
                            );
                        })}
                    </div>
                </div>

                {/* Q4: Style pick (cold entry only) */}
                {showStyleQuestion && (
                    <div className="draw-followup-q">
                        <label className="draw-followup-label">What fence style?</label>
                        <div className="draw-followup-styles">
                            {FENCE_TOOL_STYLES.filter(function(s) { return !s.isPrivacy; }).map(function(s) {
                                return (
                                    <button
                                        key={s.id}
                                        className={'draw-followup-style-card' + (selectedStyle === s.id ? ' selected' : '')}
                                        onClick={function() { setSelectedStyle(s.id); }}
                                    >
                                        <img src={STYLE_THUMBS[s.id] || ''} alt={s.name} className="draw-followup-style-img" />
                                        <span className="draw-followup-style-name">{s.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="draw-followup-actions">
                    <button
                        className="draw-followup-continue"
                        onClick={handleContinue}
                        disabled={!canContinue}
                    >Continue to Quote &rarr;</button>
                    <button className="draw-followup-back" onClick={onCancel}>Back to Map</button>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Main DrawYardView Component
// ============================================================
var DrawYardView = function(props) {
    var onGetQuote = props.onGetQuote;
    var onSkipToManualEntry = props.onSkipToManualEntry;
    var fenceConfig = props.fenceConfig;

    var mapsReadyState = useState(false);
    var mapsReady = mapsReadyState[0];
    var setMapsReady = mapsReadyState[1];

    var locationState = useState(null);
    var location = locationState[0];
    var setLocation = locationState[1];

    var linesState = useState([]);
    var lines = linesState[0];
    var setLines = linesState[1];

    var activeLineState = useState(0);
    var activeLineIndex = activeLineState[0];
    var setActiveLineIndex = activeLineState[1];

    var drawModeState = useState(true);
    var drawMode = drawModeState[0];
    var setDrawMode = drawModeState[1];

    var undoState = useState([]);
    var undoStack = undoState[0];
    var setUndoStack = undoState[1];

    var redoState = useState([]);
    var redoStack = redoState[0];
    var setRedoStack = redoState[1];

    // DRAW 6: Gate markers state
    var gateMarkersState = useState([]);
    var gateMarkers = gateMarkersState[0];
    var setGateMarkers = gateMarkersState[1];

    // DRAW 7: Follow-up questions state
    var followUpState = useState(false);
    var showFollowUp = followUpState[0];
    var setShowFollowUp = followUpState[1];

    // Load Google Maps
    useEffect(function() {
        if (!GOOGLE_MAPS_KEY) return;
        loadGoogleMaps(function() { setMapsReady(true); });
    }, []);

    var handleAddressSelect = useCallback(function(loc) {
        setLocation(loc);
    }, []);

    var handleSkip = useCallback(function() {
        if (onSkipToManualEntry) onSkipToManualEntry();
        else if (onGetQuote) onGetQuote();
    }, [onSkipToManualEntry, onGetQuote]);

    var handleNewLine = function() {
        setLines(function(prev) {
            return prev.concat([{ label: 'Line ' + (prev.length + 1), points: [] }]);
        });
        setActiveLineIndex(lines.length);
    };

    var handleUndo = function() {
        if (undoStack.length === 0) return;
        setRedoStack(function(r) { return r.concat([lines]); });
        var prev = undoStack[undoStack.length - 1];
        setUndoStack(function(u) { return u.slice(0, -1); });
        setLines(prev);
        // Remove gate markers on segments that no longer exist
        setGateMarkers(function(gm) {
            return gm.filter(function(m) {
                var line = prev[m.lineIndex];
                return line && line.points.length > m.segmentIndex + 1;
            });
        });
    };

    var handleRedo = function() {
        if (redoStack.length === 0) return;
        setUndoStack(function(u) { return u.concat([lines]); });
        var next = redoStack[redoStack.length - 1];
        setRedoStack(function(r) { return r.slice(0, -1); });
        setLines(next);
    };

    var handleClear = function() {
        if (lines.length === 0) return;
        if (!window.confirm('Clear all fence lines?')) return;
        setUndoStack(function(u) { return u.concat([lines]); });
        setRedoStack([]);
        setLines([]);
        setActiveLineIndex(0);
        setGateMarkers([]);
    };

    var handleAddGateMarker = function(marker) {
        setGateMarkers(function(prev) { return prev.concat([marker]); });
    };

    var handleRemoveGateMarker = function(idx) {
        setGateMarkers(function(prev) {
            var updated = prev.slice();
            updated.splice(idx, 1);
            return updated;
        });
    };

    // DRAW 7: Show follow-up questions instead of immediately navigating
    var handleGetQuoteForLayout = function() {
        setShowFollowUp(true);
    };

    // DRAW 7: Complete follow-up and export
    var handleFollowUpComplete = function(answers) {
        // Calculate totals
        var totalLengthFt = 0;
        lines.forEach(function(line) {
            for (var i = 0; i < line.points.length - 1; i++) {
                totalLengthFt += distanceFt(line.points[i].lat, line.points[i].lng, line.points[i + 1].lat, line.points[i + 1].lng);
            }
        });
        totalLengthFt = Math.round(totalLengthFt);

        // Gate openings deduction (DRAW 6 addition)
        var allGates = gateMarkers.slice();
        if (answers.gates && answers.gates.length > 0) {
            allGates = allGates.concat(answers.gates.map(function(g, i) {
                return { lineIndex: 0, segmentIndex: 0, positionFt: 0, type: g.type, widthInches: g.widthInches };
            }));
        }
        var gateOpeningFt = 0;
        allGates.forEach(function(g) { gateOpeningFt += g.widthInches / 12; });
        var adjustedLinearFeet = Math.round(totalLengthFt - gateOpeningFt);

        var corners = 0;
        lines.forEach(function(line) {
            if (line.points.length > 2) corners += line.points.length - 2;
        });

        var data = {
            source: 'gps-draw-tool',
            address: location ? location.address : '',
            lines: lines.map(function(line) {
                var ft = 0;
                for (var i = 0; i < line.points.length - 1; i++) {
                    ft += distanceFt(line.points[i].lat, line.points[i].lng, line.points[i + 1].lat, line.points[i + 1].lng);
                }
                return { label: line.label, lengthFt: Math.round(ft), points: line.points };
            }),
            totalLengthFt: totalLengthFt,
            adjustedLinearFeet: adjustedLinearFeet,
            corners: corners,
            gates: allGates.map(function(g) { return { type: g.type, widthInches: g.widthInches }; }),
            gateCount: allGates.length,
            terrain: answers.terrain,
            installPlan: answers.installPlan,
            style: answers.style || (fenceConfig ? fenceConfig.styleId : ''),
            mapCenter: location ? { lat: location.lat, lng: location.lng } : null,
            timestamp: new Date().toISOString(),
        };

        try {
            localStorage.setItem('gv_draw_layout', JSON.stringify(data));
        } catch (e) { /* */ }

        setShowFollowUp(false);
        if (onGetQuote) onGetQuote();
    };

    // No API key
    if (!GOOGLE_MAPS_KEY) {
        return (
            <div className="draw-no-key">
                <h2>Google Maps API Key Required</h2>
                <p>Add GOOGLE_MAPS_API_KEY to .env to use the draw tool.</p>
            </div>
        );
    }

    // Loading Maps
    if (!mapsReady) {
        return (
            <div className="draw-loading">
                <div className="draw-loading-spinner"></div>
                <p>Loading Google Maps...</p>
            </div>
        );
    }

    // Address entry
    if (!location) {
        return (
            <AddressEntry
                onAddressSelect={handleAddressSelect}
                onSkip={handleSkip}
            />
        );
    }

    // DRAW 7: Follow-up questions overlay
    if (showFollowUp) {
        return (
            <div className="draw-container">
                <DrawingMap
                    location={location}
                    lines={lines}
                    setLines={setLines}
                    activeLineIndex={activeLineIndex}
                    setActiveLineIndex={setActiveLineIndex}
                    drawMode={false}
                    undoStack={undoStack}
                    setUndoStack={setUndoStack}
                    redoStack={redoStack}
                    setRedoStack={setRedoStack}
                    onNewLine={handleNewLine}
                    onUndo={handleUndo}
                    onClear={handleClear}
                    canUndo={undoStack.length > 0}
                    gateMarkers={gateMarkers}
                    onAddGateMarker={handleAddGateMarker}
                    onRemoveGateMarker={handleRemoveGateMarker}
                />
                <FollowUpQuestions
                    onComplete={handleFollowUpComplete}
                    onCancel={function() { setShowFollowUp(false); }}
                    gateMarkerCount={gateMarkers.length}
                    hasFenceConfig={!!(fenceConfig && fenceConfig.styleId)}
                />
            </div>
        );
    }

    // Map + Drawing Panel
    return (
        <div className="draw-container">
            <DrawingMap
                location={location}
                lines={lines}
                setLines={setLines}
                activeLineIndex={activeLineIndex}
                setActiveLineIndex={setActiveLineIndex}
                drawMode={drawMode}
                undoStack={undoStack}
                setUndoStack={setUndoStack}
                redoStack={redoStack}
                setRedoStack={setRedoStack}
                onNewLine={handleNewLine}
                onUndo={handleUndo}
                onClear={handleClear}
                canUndo={undoStack.length > 0}
                gateMarkers={gateMarkers}
                onAddGateMarker={handleAddGateMarker}
                onRemoveGateMarker={handleRemoveGateMarker}
            />
            <DrawingPanel
                lines={lines}
                setLines={setLines}
                onNewLine={handleNewLine}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onClear={handleClear}
                drawMode={drawMode}
                setDrawMode={setDrawMode}
                onGetQuote={handleGetQuoteForLayout}
                fenceConfig={fenceConfig}
                gateMarkers={gateMarkers}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
            />
        </div>
    );
};

export default DrawYardView;
