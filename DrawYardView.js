import React, { useState, useEffect, useRef, useCallback } from 'react';

var GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
if (GOOGLE_MAPS_KEY) {
    console.log('[DrawYard] Maps API key loaded:', GOOGLE_MAPS_KEY.substring(0, 12) + '...');
} else {
    console.warn('[DrawYard] No Google Maps API key found in process.env.GOOGLE_MAPS_API_KEY');
}

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

    // Autocomplete via AutocompleteService (no widget)
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
                        console.warn('[DrawYard] Places autocomplete status:', status);
                        setSuggestions([]);
                    }
                }
            );
        }, 250);
    };

    var selectSuggestion = function(prediction) {
        setAddress(prediction.description);
        setSuggestions([]);
        // Geocode the selected prediction
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
            console.log('[DrawYard] Geocode status:', status, 'results:', results ? results.length : 0);
            if (status === 'OK' && results[0]) {
                onAddressSelect({
                    address: results[0].formatted_address,
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng(),
                });
            } else {
                console.error('[DrawYard] Geocode failed:', status);
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
                    Skip — I'll enter measurements manually
                </button>
            </div>
        </div>
    );
};

// ============================================================
// Drawing Map
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

    var mapRef = useRef(null);
    var mapInstanceRef = useRef(null);
    var markersRef = useRef([]);
    var polylinesRef = useRef([]);
    var labelsRef = useRef([]);

    // Initialize map
    useEffect(function() {
        if (!window.google || !mapRef.current) return;
        if (mapInstanceRef.current) return;

        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: location.lat, lng: location.lng },
            zoom: 20,
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
        });
    }, [location]);

    // Expose click handler via window (avoids stale closure)
    useEffect(function() {
        window.__drawMapClick = function(point) {
            setLines(function(prev) {
                var updated = prev.slice();
                var idx = activeLineIndex;
                if (idx < 0 || idx >= updated.length) {
                    // Create new line
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
                // Push to undo
                setUndoStack(function(u) { return u.concat([prev]); });
                setRedoStack([]);
                return updated;
            });
        };
        return function() { delete window.__drawMapClick; delete window.__drawMapInstance; };
    }, [activeLineIndex, setLines, setActiveLineIndex, setUndoStack, setRedoStack]);

    // Render markers, polylines, and distance labels
    useEffect(function() {
        if (!mapInstanceRef.current || !window.google) return;

        // Clear old
        markersRef.current.forEach(function(m) { m.setMap(null); });
        polylinesRef.current.forEach(function(p) { p.setMap(null); });
        labelsRef.current.forEach(function(l) { l.setMap(null); });
        markersRef.current = [];
        polylinesRef.current = [];
        labelsRef.current = [];

        lines.forEach(function(line, lineIdx) {
            var path = line.points.map(function(p) {
                return new window.google.maps.LatLng(p.lat, p.lng);
            });

            // Polyline
            if (path.length >= 2) {
                var polyline = new window.google.maps.Polyline({
                    path: path,
                    strokeColor: '#1B3A5C',
                    strokeOpacity: 0.8,
                    strokeWeight: 3,
                    map: mapInstanceRef.current,
                });
                polylinesRef.current.push(polyline);
            }

            // Markers
            line.points.forEach(function(point, ptIdx) {
                var marker = new window.google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: mapInstanceRef.current,
                    draggable: true,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#C9A84C',
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
                        strokeColor: '#1B3A5C',
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
    }, [lines, setLines]);

    return (
        <div ref={mapRef} className="draw-map" />
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
    var onRecenter = props.onRecenter;
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
        // Corners: each intermediate point in a line is a corner
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

    return (
        <div className="draw-panel">
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
                <button className="draw-tool-btn" onClick={onRecenter} title="Re-center map">
                    &#128205; Center
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
                </div>
            )}

            <div className="draw-panel-actions">
                <button className="draw-new-line-btn" onClick={onNewLine}>+ New Line</button>
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
// Main DrawYardView Component
// ============================================================
var DrawYardView = function(props) {
    var onGetQuote = props.onGetQuote;
    var onSkipToManualEntry = props.onSkipToManualEntry;

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
    };

    var handleRecenter = function() {
        // Re-center is handled by map component accessing location
        if (location && window.__drawMapInstance) {
            window.__drawMapInstance.setCenter({ lat: location.lat, lng: location.lng });
            window.__drawMapInstance.setZoom(20);
        }
    };

    var handleGetQuoteForLayout = function() {
        // Generate JSON and store it, then open quote
        var data = {
            source: 'gps-draw-tool',
            address: location ? location.address : '',
            lines: lines.map(function(line) {
                var totalFt = 0;
                for (var i = 0; i < line.points.length - 1; i++) {
                    totalFt += distanceFt(line.points[i].lat, line.points[i].lng, line.points[i + 1].lat, line.points[i + 1].lng);
                }
                return {
                    label: line.label,
                    lengthFt: Math.round(totalFt),
                    points: line.points,
                };
            }),
            totalLengthFt: 0,
            corners: 0,
            mapCenter: location ? { lat: location.lat, lng: location.lng } : null,
            timestamp: new Date().toISOString(),
        };
        data.lines.forEach(function(l) { data.totalLengthFt += l.lengthFt; });
        lines.forEach(function(line) {
            if (line.points.length > 2) data.corners += line.points.length - 2;
        });

        try {
            localStorage.setItem('gv_draw_layout', JSON.stringify(data));
        } catch (e) { /* */ }

        if (onGetQuote) onGetQuote();
    };

    // No API key
    if (!GOOGLE_MAPS_KEY) {
        return (
            <div className="draw-no-key">
                <h2>Google Maps API Key Required</h2>
                <p>Add VITE_GOOGLE_MAPS_API_KEY to .env to use the draw tool.</p>
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
                onRecenter={handleRecenter}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
            />
        </div>
    );
};

export default DrawYardView;
