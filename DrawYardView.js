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
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + GOOGLE_MAPS_KEY + '&libraries=places,geometry&callback=__initGoogleMaps';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

// ============================================================
// Distance utilities — prefer Google geometry when available
// ============================================================
var METERS_TO_FEET = 3.28084;

// Haversine fallback (spherical approximation)
function haversineFt(lat1, lng1, lat2, lng2) {
    var R = 20902231; // Earth radius in feet
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Point-to-point distance in feet using Google geometry (WGS84 ellipsoid)
function distanceFt(lat1, lng1, lat2, lng2) {
    if (window.google && window.google.maps && window.google.maps.geometry) {
        var a = new window.google.maps.LatLng(lat1, lng1);
        var b = new window.google.maps.LatLng(lat2, lng2);
        return window.google.maps.geometry.spherical.computeDistanceBetween(a, b) * METERS_TO_FEET;
    }
    return haversineFt(lat1, lng1, lat2, lng2);
}

// Total path length in feet from an array of {lat, lng} points
function pathLengthFt(points) {
    if (!points || points.length < 2) return 0;
    if (window.google && window.google.maps && window.google.maps.geometry) {
        var path = points.map(function(p) { return new window.google.maps.LatLng(p.lat, p.lng); });
        return window.google.maps.geometry.spherical.computeLength(path) * METERS_TO_FEET;
    }
    // Haversine fallback
    var total = 0;
    for (var i = 0; i < points.length - 1; i++) {
        total += haversineFt(points[i].lat, points[i].lng, points[i + 1].lat, points[i + 1].lng);
    }
    return total;
}

// ============================================================
// Line color palette — each line gets a unique color
// ============================================================
var LINE_COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6'];
function getLineColor(idx) { return LINE_COLORS[idx % LINE_COLORS.length]; }

// ============================================================
// Google Elevation API — query elevation for an array of {lat,lng} points
// ============================================================
function getElevationsForPoints(points, callback) {
    if (!window.google || !window.google.maps || !window.google.maps.ElevationService) {
        callback(null);
        return;
    }
    if (!points || points.length < 2) { callback(null); return; }
    var service = new window.google.maps.ElevationService();
    var locations = points.map(function(p) { return new window.google.maps.LatLng(p.lat, p.lng); });
    service.getElevationForLocations({ locations: locations }, function(results, status) {
        if (status === 'OK' && results) {
            callback(results.map(function(r) { return { elevation: r.elevation, resolution: r.resolution }; }));
        } else {
            callback(null);
        }
    });
}

// Classify slope per segment based on elevation change and horizontal distance
// Returns 'flat' | 'gentle' | 'steep' | 'steps'
function classifySlope(elevChange, horizontalFt) {
    if (horizontalFt <= 0) return 'flat';
    // Grade change per 6ft panel (inches)
    var gradePerPanel = Math.abs(elevChange * METERS_TO_FEET * 12) / horizontalFt * 6;
    if (gradePerPanel <= 6) return 'flat';       // 0-6" per panel = standard
    if (gradePerPanel <= 20) return 'gentle';    // 6-20" per panel = rackable
    if (gradePerPanel <= 36) return 'steep';     // 20-36" per panel = heavy rack
    return 'steps';                               // >36" per panel = stair-step
}

// Query MaxZoomService for best native satellite zoom at a location
function getMaxNativeZoom(lat, lng, callback) {
    if (!window.google || !window.google.maps || !window.google.maps.MaxZoomService) {
        callback(20); // safe default
        return;
    }
    var service = new window.google.maps.MaxZoomService();
    service.getMaxZoomAtLatLng(new window.google.maps.LatLng(lat, lng), function(response) {
        if (response.status === 'OK') {
            callback(response.zoom);
        } else {
            callback(20); // fallback
        }
    });
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
// Drawing Map — supports fence draw mode + gate placement mode
// ============================================================
var DrawingMap = function(props) {
    var location = props.location;
    var lines = props.lines;
    var setLines = props.setLines;
    var activeLineIndex = props.activeLineIndex;
    var setActiveLineIndex = props.setActiveLineIndex;
    var drawMode = props.drawMode;
    var gatePlaceMode = props.gatePlaceMode; // { type, widthInches, arch }
    var onGatePlaced = props.onGatePlaced;
    var undoStack = props.undoStack;
    var setUndoStack = props.setUndoStack;
    var redoStack = props.redoStack;
    var setRedoStack = props.setRedoStack;
    var onNewLine = props.onNewLine;
    var onUndo = props.onUndo;
    var onClear = props.onClear;
    var onFinishLine = props.onFinishLine;
    var canUndo = props.canUndo;
    var gateMarkers = props.gateMarkers;
    var onRemoveGateMarker = props.onRemoveGateMarker;

    var mapRef = useRef(null);
    var mapInstanceRef = useRef(null);
    var markersRef = useRef([]);
    var polylinesRef = useRef([]);
    var labelsRef = useRef([]);
    var gateMarkersRef = useRef([]);
    var gatePreviewRef = useRef(null); // orange preview polyline following mouse

    // Instruction overlay
    var instructionState = useState(true);
    var showInstructions = instructionState[0];
    var setShowInstructions = instructionState[1];

    // Track max native zoom for this location
    var maxZoomRef = useRef(20);

    // Initialize map with MaxZoom-aware satellite cap
    useEffect(function() {
        if (!window.google || !mapRef.current) return;
        if (mapInstanceRef.current) return;

        getMaxNativeZoom(location.lat, location.lng, function(nativeMax) {
            var safeMax = Math.min(nativeMax, 21);
            maxZoomRef.current = safeMax;
            var initialZoom = Math.min(19, safeMax);

            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                center: { lat: location.lat, lng: location.lng },
                zoom: initialZoom,
                maxZoom: safeMax,
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

            // Click handler — routes to fence draw or gate placement
            mapInstanceRef.current.addListener('click', function(e) {
                var lat = e.latLng.lat();
                var lng = e.latLng.lng();
                if (window.__gatePlaceMode) {
                    window.__drawMapGatePlace({ lat: lat, lng: lng });
                } else if (window.__drawModeActive) {
                    window.__drawMapClick({ lat: lat, lng: lng });
                    setShowInstructions(false);
                }
            });

            // Right-click removes last point (draw mode only)
            mapInstanceRef.current.addListener('rightclick', function() {
                if (window.__drawModeActive && !window.__gatePlaceMode) {
                    window.__drawMapRightClick();
                }
            });

            // Mouse move — update gate preview line
            mapInstanceRef.current.addListener('mousemove', function(e) {
                if (!window.__gatePlaceMode || !gatePreviewRef.current) return;
                var lat = e.latLng.lat();
                var lng = e.latLng.lng();
                var widthFt = window.__gatePlaceWidthFt || 4;
                // Compute a short line segment centered on mouse, perpendicular-ish
                var halfM = (widthFt / 2) / METERS_TO_FEET;
                if (window.google.maps.geometry) {
                    var center = new window.google.maps.LatLng(lat, lng);
                    var p1 = window.google.maps.geometry.spherical.computeOffset(center, halfM, 90);
                    var p2 = window.google.maps.geometry.spherical.computeOffset(center, halfM, 270);
                    gatePreviewRef.current.setPath([p1, p2]);
                    gatePreviewRef.current.setVisible(true);
                }
            });
        });
    }, [location]);

    // Sync draw mode flag to window for closure-safe access
    useEffect(function() {
        window.__drawModeActive = drawMode;
    }, [drawMode]);

    // Sync gate placement mode to window
    useEffect(function() {
        window.__gatePlaceMode = !!gatePlaceMode;
        window.__gatePlaceWidthFt = gatePlaceMode ? gatePlaceMode.widthInches / 12 : 0;

        // Create or remove preview polyline
        if (gatePlaceMode && mapInstanceRef.current && !gatePreviewRef.current) {
            gatePreviewRef.current = new window.google.maps.Polyline({
                path: [],
                strokeColor: '#D4753A',
                strokeOpacity: 1,
                strokeWeight: 5,
                map: mapInstanceRef.current,
                clickable: false,
                visible: false,
            });
        }
        if (!gatePlaceMode && gatePreviewRef.current) {
            gatePreviewRef.current.setVisible(false);
        }

        return function() {
            if (!gatePlaceMode && gatePreviewRef.current) {
                gatePreviewRef.current.setMap(null);
                gatePreviewRef.current = null;
            }
        };
    }, [gatePlaceMode]);

    // Gate placement click handler
    useEffect(function() {
        window.__drawMapGatePlace = function(clickPt) {
            if (!gatePlaceMode || !lines.length) return;
            // Find nearest fence line segment to the click
            var bestLine = 0;
            var bestSeg = 0;
            var bestDist = Infinity;
            for (var li = 0; li < lines.length; li++) {
                for (var si = 0; si < lines[li].points.length - 1; si++) {
                    var midLat = (lines[li].points[si].lat + lines[li].points[si + 1].lat) / 2;
                    var midLng = (lines[li].points[si].lng + lines[li].points[si + 1].lng) / 2;
                    var d = distanceFt(clickPt.lat, clickPt.lng, midLat, midLng);
                    if (d < bestDist) { bestDist = d; bestSeg = si; bestLine = li; }
                }
            }
            var segStart = lines[bestLine].points[bestSeg];
            var posFt = distanceFt(segStart.lat, segStart.lng, clickPt.lat, clickPt.lng);
            onGatePlaced({
                lineIndex: bestLine,
                segmentIndex: bestSeg,
                positionFt: Math.round(posFt),
                lat: clickPt.lat,
                lng: clickPt.lng,
                type: gatePlaceMode.type,
                widthInches: gatePlaceMode.widthInches,
                arch: gatePlaceMode.arch,
            });
        };
        return function() { delete window.__drawMapGatePlace; };
    }, [gatePlaceMode, lines, onGatePlaced]);

    // Expose fence draw click handler via window (avoids stale closure)
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
        window.__drawMapRightClick = function() {
            setLines(function(prev) {
                var updated = prev.slice();
                var idx = activeLineIndex;
                if (idx < 0 || idx >= updated.length) return prev;
                var pts = updated[idx].points;
                if (pts.length === 0) return prev;
                setUndoStack(function(u) { return u.concat([prev]); });
                setRedoStack([]);
                updated[idx] = Object.assign({}, updated[idx], {
                    points: pts.slice(0, -1),
                });
                if (updated[idx].points.length === 0) {
                    updated.splice(idx, 1);
                    setActiveLineIndex(Math.max(0, idx - 1));
                }
                return updated;
            });
        };

        return function() { delete window.__drawMapClick; delete window.__drawMapRightClick; delete window.__drawMapInstance; };
    }, [activeLineIndex, setLines, setActiveLineIndex, setUndoStack, setRedoStack]);

    // Midpoint markers ref
    var midpointMarkersRef = useRef([]);

    // Render markers, polylines, distance labels, midpoints, and placed gates
    useEffect(function() {
        if (!mapInstanceRef.current || !window.google) return;

        // Clear old
        markersRef.current.forEach(function(m) { m.setMap(null); });
        polylinesRef.current.forEach(function(p) { p.setMap(null); });
        labelsRef.current.forEach(function(l) { l.setMap(null); });
        gateMarkersRef.current.forEach(function(m) { if (m.setMap) m.setMap(null); });
        midpointMarkersRef.current.forEach(function(m) { m.setMap(null); });
        markersRef.current = [];
        polylinesRef.current = [];
        labelsRef.current = [];
        gateMarkersRef.current = [];
        midpointMarkersRef.current = [];

        lines.forEach(function(line, lineIdx) {
            var lineColor = getLineColor(lineIdx);
            var path = line.points.map(function(p) {
                return new window.google.maps.LatLng(p.lat, p.lng);
            });

            // Fence polyline — color per line
            if (path.length >= 2) {
                var polyline = new window.google.maps.Polyline({
                    path: path,
                    strokeColor: lineColor,
                    strokeOpacity: 0.9,
                    strokeWeight: 3,
                    map: mapInstanceRef.current,
                    clickable: false,
                });
                polylinesRef.current.push(polyline);
            }

            // Node markers (draggable endpoints/corners)
            line.points.forEach(function(point, ptIdx) {
                var marker = new window.google.maps.Marker({
                    position: { lat: point.lat, lng: point.lng },
                    map: mapInstanceRef.current,
                    draggable: true,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: '#fff',
                        fillOpacity: 1,
                        strokeColor: lineColor,
                        strokeWeight: 3,
                        scale: 7,
                    },
                    zIndex: 10,
                });

                // Fix: capture lineIdx/ptIdx in closure via IIFE
                (function(li, pi) {
                    marker.addListener('dragend', function(e) {
                        var newLat = e.latLng.lat();
                        var newLng = e.latLng.lng();
                        setLines(function(prev) {
                            var updated = prev.slice();
                            if (!updated[li]) return prev;
                            var pts = updated[li].points.slice();
                            pts[pi] = { lat: newLat, lng: newLng };
                            updated[li] = Object.assign({}, updated[li], { points: pts });
                            return updated;
                        });
                    });
                })(lineIdx, ptIdx);

                markersRef.current.push(marker);
            });

            // Midpoint handles — draggable ghost markers that insert a new point when dragged
            for (var mi = 0; mi < line.points.length - 1; mi++) {
                var mp1 = line.points[mi];
                var mp2 = line.points[mi + 1];
                var midLat = (mp1.lat + mp2.lat) / 2;
                var midLng = (mp1.lng + mp2.lng) / 2;

                var midMarker = new window.google.maps.Marker({
                    position: { lat: midLat, lng: midLng },
                    map: mapInstanceRef.current,
                    draggable: true,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: lineColor,
                        fillOpacity: 0.4,
                        strokeColor: lineColor,
                        strokeWeight: 2,
                        scale: 5,
                    },
                    zIndex: 5,
                    title: 'Drag to add a point',
                    cursor: 'grab',
                    opacity: 0.6,
                });

                // Insert new point at this midpoint position when dragged
                (function(li, insertAfter) {
                    midMarker.addListener('dragend', function(e) {
                        var newLat = e.latLng.lat();
                        var newLng = e.latLng.lng();
                        setLines(function(prev) {
                            var updated = prev.slice();
                            if (!updated[li]) return prev;
                            var pts = updated[li].points.slice();
                            // Insert new point after insertAfter index
                            pts.splice(insertAfter + 1, 0, { lat: newLat, lng: newLng });
                            updated[li] = Object.assign({}, updated[li], { points: pts });
                            return updated;
                        });
                    });
                })(lineIdx, mi);

                midpointMarkersRef.current.push(midMarker);
            }

            // Distance labels per segment
            for (var i = 0; i < line.points.length - 1; i++) {
                var p1 = line.points[i];
                var p2 = line.points[i + 1];
                var segMidLat = (p1.lat + p2.lat) / 2;
                var segMidLng = (p1.lng + p2.lng) / 2;
                var dist = Math.round(distanceFt(p1.lat, p1.lng, p2.lat, p2.lng));

                var label = new window.google.maps.Marker({
                    position: { lat: segMidLat, lng: segMidLng },
                    map: mapInstanceRef.current,
                    icon: {
                        path: 'M -20,-10 L 20,-10 L 20,10 L -20,10 Z',
                        fillColor: '#fff',
                        fillOpacity: 0.9,
                        strokeColor: lineColor,
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
                    zIndex: 3,
                });
                labelsRef.current.push(label);
            }
        });

        // Render placed gates as orange lines on map
        gateMarkers.forEach(function(gm, gmIdx) {
            var line = lines[gm.lineIndex];
            if (!line || !line.points[gm.segmentIndex] || !line.points[gm.segmentIndex + 1]) return;
            var seg0 = line.points[gm.segmentIndex];
            var seg1 = line.points[gm.segmentIndex + 1];
            var segLen = distanceFt(seg0.lat, seg0.lng, seg1.lat, seg1.lng);
            var frac = segLen > 0 ? Math.min(gm.positionFt / segLen, 1) : 0.5;
            var gateLat = seg0.lat + (seg1.lat - seg0.lat) * frac;
            var gateLng = seg0.lng + (seg1.lng - seg0.lng) * frac;

            // Draw gate as an orange line segment at the gate location
            var halfM = (gm.widthInches / 12 / 2) / METERS_TO_FEET;
            var center = new window.google.maps.LatLng(gateLat, gateLng);
            // Compute heading of the fence segment to orient gate perpendicular
            var segHeading = window.google.maps.geometry
                ? window.google.maps.geometry.spherical.computeHeading(
                    new window.google.maps.LatLng(seg0.lat, seg0.lng),
                    new window.google.maps.LatLng(seg1.lat, seg1.lng)
                ) : 90;
            var gateHeading = segHeading; // gate runs along the fence line
            if (window.google.maps.geometry) {
                var gp1 = window.google.maps.geometry.spherical.computeOffset(center, halfM, gateHeading);
                var gp2 = window.google.maps.geometry.spherical.computeOffset(center, halfM, gateHeading + 180);
                var gatePoly = new window.google.maps.Polyline({
                    path: [gp1, gp2],
                    strokeColor: '#D4753A',
                    strokeOpacity: 1,
                    strokeWeight: 5,
                    map: mapInstanceRef.current,
                    clickable: true,
                });
                gatePoly.addListener('click', function() {
                    if (window.confirm('Remove this ' + (gm.type === 'walk' ? 'walk' : 'double drive') + ' gate (' + gm.widthInches + '")?')) {
                        onRemoveGateMarker(gmIdx);
                    }
                });
                gateMarkersRef.current.push(gatePoly);
            }

            // Gate label marker
            var gateLabel = gm.type === 'walk' ? 'W' : 'DD';
            var archLabel = gm.arch === 'arched' ? ' Arch' : '';
            var gateMapMarker = new window.google.maps.Marker({
                position: { lat: gateLat, lng: gateLng },
                map: mapInstanceRef.current,
                icon: {
                    path: 'M -1,-1 L 1,-1 L 1,1 L -1,1 Z',
                    fillColor: '#D4753A',
                    fillOpacity: 0,
                    strokeOpacity: 0,
                    scale: 1,
                },
                label: {
                    text: gateLabel + ' ' + gm.widthInches + '"' + archLabel,
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '700',
                    className: 'draw-gate-map-label',
                },
                clickable: false,
            });
            gateMarkersRef.current.push(gateMapMarker);
        });
    }, [lines, setLines, gateMarkers, drawMode]);

    // Instruction text changes based on mode
    var instructionText = gatePlaceMode
        ? 'Click on a fence line to place your ' + (gatePlaceMode.widthInches) + '" ' + (gatePlaceMode.type === 'walk' ? 'walk' : 'double drive') + ' gate'
        : 'Click to place points along your fence line. Right-click to undo.';

    return (
        <div className="draw-map-wrap">
            <div ref={mapRef} className="draw-map" />

            {/* GPS accuracy disclaimer — top center */}
            <div className="draw-accuracy-note">
                Satellite measurements are approximate, +/- 3-5 ft per 100 ft. Final measurements confirmed on-site.
            </div>

            {/* Instruction overlay — below disclaimer */}
            {(showInstructions || gatePlaceMode) && (
                <div className={'draw-instruction-overlay' + (gatePlaceMode ? ' gate-mode' : '')}>
                    {instructionText}
                </div>
            )}

            {/* Action buttons — top left */}
            {!gatePlaceMode && (
                <div className="draw-float-actions">
                    <button className="draw-float-btn draw-float-primary" onClick={onNewLine} title="Start a new fence line">
                        &#9998; New Line
                    </button>
                    <button className="draw-float-btn draw-float-secondary" onClick={onUndo} disabled={!canUndo} title="Undo last point">
                        &#8617; Undo
                    </button>
                    <button className="draw-float-btn draw-float-secondary" onClick={onClear} title="Clear all lines">
                        &#128465; Clear
                    </button>
                    <button className="draw-float-btn draw-float-finish" onClick={onFinishLine} disabled={!drawMode} title="Finish current line">
                        &#10003; Finish
                    </button>
                </div>
            )}
        </div>
    );
};

// ============================================================
// Slope options per segment
// ============================================================
var SLOPE_OPTIONS = [
    { value: 'flat', label: 'Flat', desc: '0-6" per panel', rack: 'standard' },
    { value: 'gentle', label: 'Gentle Slope', desc: '6-20" per panel', rack: 'rackable' },
    { value: 'steep', label: 'Steep Slope', desc: '20-36" per panel', rack: 'heavy-rack' },
    { value: 'steps', label: 'Stair-Step', desc: 'Not rackable', rack: 'none' },
];

// ============================================================
// Drawing Panel — Guided Measuring + Gate Config UI
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
    var gatePlaceMode = props.gatePlaceMode;
    var onStartGatePlace = props.onStartGatePlace;
    var onCancelGatePlace = props.onCancelGatePlace;
    var onRemoveGate = props.onRemoveGate;
    var onFinishLine = props.onFinishLine;

    var canUndo = props.canUndo;
    var canRedo = props.canRedo;

    // Measuring guide visibility
    var guideState = useState(false);
    var showGuide = guideState[0];
    var setShowGuide = guideState[1];

    // Expanded segment detail (per line)
    var expandedState = useState(null);
    var expandedLine = expandedState[0];
    var setExpandedLine = expandedState[1];

    // Gate configurator state (before entering placement mode)
    var gateTypeState = useState('walk');
    var pendingGateType = gateTypeState[0];
    var setPendingGateType = gateTypeState[1];

    var gateWidthState = useState(48);
    var pendingGateWidth = gateWidthState[0];
    var setPendingGateWidth = gateWidthState[1];

    var gateArchState = useState('standard');
    var pendingGateArch = gateArchState[0];
    var setPendingGateArch = gateArchState[1];

    // Gate config panel open/closed
    var gateConfigState = useState(false);
    var showGateConfig = gateConfigState[0];
    var setShowGateConfig = gateConfigState[1];

    // Elevation auto-detect state
    var elevLoadingState = useState(false);
    var elevLoading = elevLoadingState[0];
    var setElevLoading = elevLoadingState[1];
    var elevDataState = useState(null); // { lineIdx: [ {elevation, resolution}, ... ] }
    var elevData = elevDataState[0];
    var setElevData = elevDataState[1];

    // Manual segment override state: { "lineIdx-segIdx": numFt }
    var overridesState = useState({});
    var overrides = overridesState[0];
    var setOverrides = overridesState[1];

    // Auto-detect slopes for all lines using Elevation API
    var handleAutoDetectSlopes = function() {
        if (elevLoading) return;
        setElevLoading(true);
        var allPoints = [];
        var lineOffsets = []; // track which points belong to which line
        lines.forEach(function(line, li) {
            lineOffsets.push({ lineIdx: li, startIdx: allPoints.length, count: line.points.length });
            line.points.forEach(function(p) { allPoints.push(p); });
        });
        if (allPoints.length < 2) { setElevLoading(false); return; }

        getElevationsForPoints(allPoints, function(results) {
            setElevLoading(false);
            if (!results) return;
            var newElevData = {};
            lineOffsets.forEach(function(lo) {
                newElevData[lo.lineIdx] = results.slice(lo.startIdx, lo.startIdx + lo.count);
            });
            setElevData(newElevData);

            // Auto-classify and set slope per segment
            setLines(function(prev) {
                var updated = prev.slice();
                lineOffsets.forEach(function(lo) {
                    var line = Object.assign({}, updated[lo.lineIdx]);
                    var segments = (line.segments || []).slice();
                    var lineElevs = newElevData[lo.lineIdx];
                    if (!lineElevs) return;
                    for (var si = 0; si < line.points.length - 1; si++) {
                        while (segments.length <= si) segments.push({ slope: 'flat' });
                        var e1 = lineElevs[si];
                        var e2 = lineElevs[si + 1];
                        if (e1 && e2) {
                            var horizFt = distanceFt(line.points[si].lat, line.points[si].lng, line.points[si + 1].lat, line.points[si + 1].lng);
                            var detected = classifySlope(e2.elevation - e1.elevation, horizFt);
                            segments[si] = Object.assign({}, segments[si], {
                                slope: detected,
                                autoDetected: true,
                                elevChange: Math.round((e2.elevation - e1.elevation) * METERS_TO_FEET * 10) / 10,
                            });
                        }
                    }
                    line.segments = segments;
                    updated[lo.lineIdx] = line;
                });
                return updated;
            });
        });
    };

    // Manual segment length override handler
    var handleSegmentOverride = function(lineIdx, segIdx, ftValue) {
        var key = lineIdx + '-' + segIdx;
        setOverrides(function(prev) {
            var updated = Object.assign({}, prev);
            if (ftValue === '' || ftValue === null) {
                delete updated[key];
            } else {
                updated[key] = Number(ftValue);
            }
            return updated;
        });
    };

    // Totals — use manual overrides when available
    var totalFt = 0;
    var cornerCount = 0;

    lines.forEach(function(line, lineIdx) {
        for (var si = 0; si < line.points.length - 1; si++) {
            var overrideKey = lineIdx + '-' + si;
            if (overrides[overrideKey] !== undefined) {
                totalFt += overrides[overrideKey];
            } else {
                totalFt += distanceFt(line.points[si].lat, line.points[si].lng, line.points[si + 1].lat, line.points[si + 1].lng);
            }
        }
        if (line.points.length > 2) {
            cornerCount += line.points.length - 2;
        }
    });
    totalFt = Math.round(totalFt);

    // Gate footage
    var gateOpeningFt = 0;
    if (gateMarkers) {
        gateMarkers.forEach(function(gm) { gateOpeningFt += gm.widthInches / 12; });
    }
    gateOpeningFt = Math.round(gateOpeningFt * 10) / 10;
    var fenceFt = Math.round(totalFt - gateOpeningFt);
    var totalLinearFt = totalFt; // total measured = fence + gate openings

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

    // Segment slope update
    var handleSegmentSlope = function(lineIdx, segIdx, slopeValue) {
        setLines(function(prev) {
            var updated = prev.slice();
            var line = Object.assign({}, updated[lineIdx]);
            var segments = (line.segments || []).slice();
            while (segments.length <= segIdx) {
                segments.push({ slope: 'flat' });
            }
            segments[segIdx] = Object.assign({}, segments[segIdx], { slope: slopeValue });
            line.segments = segments;
            updated[lineIdx] = line;
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

    // Checklist progress
    var hasLines = lines.length > 0 && totalFt > 0;
    var hasGates = gateMarkers && gateMarkers.length > 0;
    var hasSlopesMarked = lines.some(function(line) {
        return line.segments && line.segments.some(function(s) { return s.slope && s.slope !== 'flat'; });
    });
    var hasMultiplePoints = lines.some(function(line) { return line.points.length >= 2; });

    // Gate validation
    var allGatesValid = !gateMarkers || gateMarkers.length === 0 || gateMarkers.every(function(gm) { return gm.widthInches > 0; });

    // Width options based on pending type
    var walkWidths = GATE_COMPATIBLE_WIDTHS.residential.walk;
    var driveWidths = GATE_COMPATIBLE_WIDTHS.residential.drive;
    var widthOptions = pendingGateType === 'walk' ? walkWidths : driveWidths;

    // Handle starting gate placement
    var handlePlaceGate = function() {
        if (!hasMultiplePoints) return;
        setDrawMode(false);
        onStartGatePlace({
            type: pendingGateType,
            widthInches: pendingGateWidth,
            arch: pendingGateArch,
        });
    };

    // Handle finish line: stop draw mode and start a new line next time
    var handleFinishLine = function() {
        setDrawMode(false);
        if (onFinishLine) onFinishLine();
    };

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
                <div className="draw-panel-title">MEASURE YOUR FENCE</div>
            </div>

            {/* ── Toolbar ── */}
            <div className="draw-toolbar">
                <button className={'draw-tool-btn' + (drawMode && !gatePlaceMode ? ' active' : '')} onClick={function() { if (gatePlaceMode) onCancelGatePlace(); setDrawMode(true); onNewLine(); }} title="Draw a new fence line">
                    &#9998; New Line
                </button>
                <button className="draw-tool-btn" onClick={handleFinishLine} disabled={!drawMode} title="Finish current line">
                    &#10003; Finish
                </button>
                <button className={'draw-tool-btn' + (showGateConfig || gatePlaceMode ? ' active' : '')} onClick={function() { if (gatePlaceMode) { onCancelGatePlace(); } else { setShowGateConfig(!showGateConfig); setDrawMode(false); } }} title="Add a gate">
                    &#9593; Gate
                </button>
                <button className="draw-tool-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
                    &#8617; Undo
                </button>
                <button className="draw-tool-btn" onClick={onClear} title="Clear all">
                    &#128465; Clear
                </button>
            </div>

            {/* ── Gate Configuration Panel ── */}
            {(showGateConfig || gatePlaceMode) && (
                <div className="draw-gate-config">
                    <div className="draw-gate-config-title">
                        {gatePlaceMode ? 'Click the map to place gate' : 'Configure Gate'}
                    </div>

                    {/* Gate type */}
                    <div className="draw-gate-config-field">
                        <label className="draw-gate-label">Type</label>
                        <div className="draw-gate-type-row">
                            <button
                                className={'draw-gate-type-btn' + (pendingGateType === 'walk' ? ' selected' : '')}
                                disabled={!!gatePlaceMode}
                                onClick={function() { setPendingGateType('walk'); setPendingGateWidth(48); }}
                            >Walk Gate</button>
                            <button
                                className={'draw-gate-type-btn' + (pendingGateType === 'drive' ? ' selected' : '')}
                                disabled={!!gatePlaceMode}
                                onClick={function() { setPendingGateType('drive'); setPendingGateWidth(120); }}
                            >Double Drive</button>
                        </div>
                    </div>

                    {/* Width dropdown */}
                    <div className="draw-gate-config-field">
                        <label className="draw-gate-label">Width</label>
                        <select
                            className="draw-gate-select"
                            value={pendingGateWidth}
                            disabled={!!gatePlaceMode}
                            onChange={function(e) { setPendingGateWidth(Number(e.target.value)); }}
                        >
                            {widthOptions.map(function(w) {
                                return <option key={w} value={w}>{w}" ({Math.round(w / 12 * 10) / 10} ft)</option>;
                            })}
                        </select>
                    </div>

                    {/* Arch style */}
                    <div className="draw-gate-config-field">
                        <label className="draw-gate-label">Top Style</label>
                        <div className="draw-gate-type-row">
                            <button
                                className={'draw-gate-type-btn' + (pendingGateArch === 'standard' ? ' selected' : '')}
                                disabled={!!gatePlaceMode}
                                onClick={function() { setPendingGateArch('standard'); }}
                            >Standard</button>
                            <button
                                className={'draw-gate-type-btn' + (pendingGateArch === 'arched' ? ' selected' : '')}
                                disabled={!!gatePlaceMode}
                                onClick={function() { setPendingGateArch('arched'); }}
                            >Arched</button>
                        </div>
                    </div>

                    {/* Place / Cancel buttons */}
                    <div className="draw-gate-config-actions">
                        {!gatePlaceMode ? (
                            <button
                                className="draw-gate-confirm"
                                onClick={handlePlaceGate}
                                disabled={!hasMultiplePoints}
                                title={!hasMultiplePoints ? 'Draw fence lines first' : ''}
                            >Place on Map</button>
                        ) : (
                            <button className="draw-gate-confirm" onClick={function() { onCancelGatePlace(); setShowGateConfig(true); }}>
                                + Add Another
                            </button>
                        )}
                        <button className="draw-gate-cancel" onClick={function() { onCancelGatePlace(); setShowGateConfig(false); }}>
                            Done with Gates
                        </button>
                    </div>
                </div>
            )}

            {/* ── Measuring Guide ── */}
            {showGuide && (
                <div className="draw-guide">
                    <div className="draw-guide-header">
                        <span className="draw-guide-title">Measuring Guide</span>
                        <button className="draw-guide-close" onClick={function() { setShowGuide(false); }}>&times;</button>
                    </div>
                    <ul className="draw-guide-list">
                        <li>Click to place points along your fence line</li>
                        <li>Click <strong>Finish</strong> to end a line, then <strong>New Line</strong> for the next</li>
                        <li><strong>Right-click</strong> to remove the last point</li>
                        <li>Use the <strong>Gate</strong> button to configure and place gates</li>
                        <li>Drag any point to adjust placement</li>
                    </ul>
                </div>
            )}
            {!showGuide && !showGateConfig && !gatePlaceMode && (
                <button className="draw-guide-reopen" onClick={function() { setShowGuide(true); }}>Show Measuring Guide</button>
            )}

            {/* ── Checklist ── */}
            <div className="draw-checklist">
                <div className="draw-checklist-title">STEPS</div>
                <div className={'draw-check-item' + (hasLines ? ' done' : ' current')}>
                    <span className="draw-check-icon">{hasLines ? '\u2713' : '1'}</span>
                    <span>Draw fence lines</span>
                </div>
                <div className={'draw-check-item' + (hasGates ? ' done' : hasLines ? ' current' : '')}>
                    <span className="draw-check-icon">{hasGates ? '\u2713' : '2'}</span>
                    <span>Add gates / openings</span>
                </div>
                <div className={'draw-check-item' + (hasSlopesMarked ? ' done' : hasMultiplePoints ? ' current' : '')}>
                    <span className="draw-check-icon">{hasSlopesMarked ? '\u2713' : '3'}</span>
                    <span>Mark sloped sections</span>
                    {hasMultiplePoints && !elevLoading && (
                        <button className="draw-check-action" onClick={handleAutoDetectSlopes} title="Use Google Elevation API to auto-detect slopes">
                            Auto-detect
                        </button>
                    )}
                    {elevLoading && <span className="draw-check-loading">Checking...</span>}
                </div>
                <div className={'draw-check-item' + (hasLines && hasMultiplePoints ? ' current' : '')}>
                    <span className="draw-check-icon">4</span>
                    <span>Review corners / endpoints</span>
                </div>
            </div>

            {/* ── Lines List with Segment Details ── */}
            <div className="draw-lines-list">
                {lines.length === 0 && (
                    <div className="draw-empty">Click on the map to start drawing your fence lines</div>
                )}
                {lines.map(function(line, idx) {
                    var lineFt = Math.round(pathLengthFt(line.points));
                    var isExpanded = expandedLine === idx;
                    var lineSegments = line.segments || [];

                    return (
                        <div key={idx} className={'draw-line-block' + (isExpanded ? ' expanded' : '')}>
                            <div className="draw-line-row">
                                <button className="draw-line-expand" onClick={function() { setExpandedLine(isExpanded ? null : idx); }}>
                                    {isExpanded ? '\u25BC' : '\u25B6'}
                                </button>
                                <input
                                    className="draw-line-label"
                                    value={line.label}
                                    onChange={function(e) { handleRename(idx, e.target.value); }}
                                />
                                <span className="draw-line-ft">{lineFt} ft</span>
                                <span className="draw-line-pts">{line.points.length} pts</span>
                                <button className="draw-line-delete" onClick={function() { handleDeleteLine(idx); }} title="Delete line">
                                    &#128465;
                                </button>
                            </div>
                            {isExpanded && line.points.length >= 2 && (
                                <div className="draw-segments">
                                    {line.points.slice(0, -1).map(function(pt, si) {
                                        var nextPt = line.points[si + 1];
                                        var gpsFt = Math.round(distanceFt(pt.lat, pt.lng, nextPt.lat, nextPt.lng));
                                        var overrideKey = idx + '-' + si;
                                        var hasOverride = overrides[overrideKey] !== undefined;
                                        var displayFt = hasOverride ? overrides[overrideKey] : gpsFt;
                                        var segData = lineSegments[si] || { slope: 'flat' };
                                        var isAutoDetected = segData.autoDetected;
                                        var elevChangeLabel = segData.elevChange !== undefined
                                            ? (segData.elevChange > 0 ? '+' : '') + segData.elevChange + ' ft'
                                            : '';
                                        return (
                                            <div key={si} className="draw-segment-detail">
                                                <div className="draw-segment-row">
                                                    <span className="draw-seg-label">Seg {si + 1}</span>
                                                    <span className={'draw-seg-ft' + (hasOverride ? ' overridden' : '')}>{displayFt} ft</span>
                                                    <input
                                                        className="draw-seg-override"
                                                        type="number"
                                                        placeholder={gpsFt + ''}
                                                        value={hasOverride ? overrides[overrideKey] : ''}
                                                        onChange={function(e) { handleSegmentOverride(idx, si, e.target.value); }}
                                                        title="Override with hand measurement"
                                                    />
                                                    <select
                                                        className="draw-seg-slope"
                                                        value={segData.slope || 'flat'}
                                                        onChange={function(e) { handleSegmentSlope(idx, si, e.target.value); }}
                                                    >
                                                        {SLOPE_OPTIONS.map(function(opt) {
                                                            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
                                                        })}
                                                    </select>
                                                </div>
                                                {/* Elevation info if auto-detected */}
                                                {isAutoDetected && (
                                                    <div className="draw-seg-elev-row">
                                                        <span className="draw-seg-elev-badge">Auto-detected</span>
                                                        {elevChangeLabel && <span className="draw-seg-elev-change">Elev: {elevChangeLabel}</span>}
                                                        <button className="draw-seg-elev-confirm" onClick={function() {
                                                            handleSegmentSlope(idx, si, segData.slope);
                                                        }} title="Confirm this slope">&#10003;</button>
                                                        <button className="draw-seg-elev-deny" onClick={function() {
                                                            handleSegmentSlope(idx, si, 'flat');
                                                        }} title="Override to flat">&#10007;</button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Placed Gates List ── */}
            {hasGates && (
                <div className="draw-gates-list">
                    <div className="draw-gates-list-title">GATES</div>
                    {gateMarkers.map(function(gm, gmIdx) {
                        var typeLabel = gm.type === 'walk' ? 'Walk Gate' : 'Double Drive';
                        var archLabel = gm.arch === 'arched' ? ' (Arched)' : '';
                        var ftLabel = Math.round(gm.widthInches / 12 * 10) / 10;
                        return (
                            <div key={gmIdx} className="draw-gate-list-row">
                                <span className="draw-gate-list-icon" style={{color: '#D4753A'}}>{gm.type === 'walk' ? 'W' : 'DD'}</span>
                                <span className="draw-gate-list-info">{typeLabel} {gm.widthInches}"{archLabel}</span>
                                <span className="draw-gate-list-ft">{ftLabel} ft</span>
                                <button className="draw-line-delete" onClick={function() { onRemoveGate(gmIdx); }} title="Remove gate">&#128465;</button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Totals ── */}
            {totalFt > 0 && (
                <div className="draw-totals">
                    <div className="draw-totals-row draw-totals-header">
                        <span>Total Linear Footage</span>
                        <strong>{totalLinearFt} ft</strong>
                    </div>
                    <div className="draw-totals-row draw-totals-sub">
                        <span>Fence linear footage</span>
                        <span>{fenceFt} ft</span>
                    </div>
                    {hasGates && (
                        <div className="draw-totals-row draw-totals-sub">
                            <span>Gate(s) linear footage ({gateMarkers.length} gate{gateMarkers.length !== 1 ? 's' : ''})</span>
                            <span>{gateOpeningFt} ft</span>
                        </div>
                    )}
                    <div className="draw-totals-row draw-totals-detail">
                        <span>Lines | Corners</span>
                        <span>{lines.length} | {cornerCount}</span>
                    </div>
                </div>
            )}

            {/* ── Actions ── */}
            <div className="draw-panel-actions">
                {totalFt > 0 && (
                    <button
                        className="draw-quote-btn"
                        onClick={onGetQuote}
                        disabled={!allGatesValid}
                        title={!allGatesValid ? 'Set gate widths before continuing' : ''}
                    >
                        Continue to Quote &rarr;
                    </button>
                )}
                {!allGatesValid && (
                    <div className="draw-validation-msg">All gates must have a width set before continuing.</div>
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

    // Gate placement mode state: null = off, { type, widthInches, arch } = active
    var gatePlaceModeState = useState(null);
    var gatePlaceMode = gatePlaceModeState[0];
    var setGatePlaceMode = gatePlaceModeState[1];

    var handleStartGatePlace = function(gateConfig) {
        setDrawMode(false);
        setGatePlaceMode(gateConfig);
    };

    var handleCancelGatePlace = function() {
        setGatePlaceMode(null);
    };

    // When a gate is placed on the map
    var handleGatePlaced = useCallback(function(marker) {
        setGateMarkers(function(prev) { return prev.concat([marker]); });
        // Stay in gate placement mode so user can place another (they click "Add Another" or "Done")
        setGatePlaceMode(null);
    }, []);

    // Finish current line
    var handleFinishLine = function() {
        setDrawMode(false);
    };

    // DRAW 7: Show follow-up questions instead of immediately navigating
    var handleGetQuoteForLayout = function() {
        setShowFollowUp(true);
    };

    // DRAW 7: Complete follow-up and export
    var handleFollowUpComplete = function(answers) {
        // Calculate totals using Google geometry (ellipsoid) when available
        var totalLengthFt = 0;
        lines.forEach(function(line) {
            totalLengthFt += pathLengthFt(line.points);
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

        // Build flat segments array for pricing engine (slope + length per segment)
        var pricingSegments = [];
        lines.forEach(function(line) {
            var lineSegs = line.segments || [];
            for (var si = 0; si < line.points.length - 1; si++) {
                var segSlope = (lineSegs[si] && lineSegs[si].slope) || 'flat';
                var segFt = distanceFt(line.points[si].lat, line.points[si].lng, line.points[si + 1].lat, line.points[si + 1].lng);
                pricingSegments.push({ lengthFt: Math.round(segFt), slope: segSlope });
            }
        });

        var data = {
            source: 'gps-draw-tool',
            address: location ? location.address : '',
            lines: lines.map(function(line) {
                return {
                    label: line.label,
                    lengthFt: Math.round(pathLengthFt(line.points)),
                    points: line.points,
                    segments: line.segments || [],
                };
            }),
            pricingSegments: pricingSegments,
            totalLengthFt: totalLengthFt,
            adjustedLinearFeet: adjustedLinearFeet,
            corners: corners,
            gates: allGates.map(function(g) { return { type: g.type, widthInches: g.widthInches, arch: g.arch || 'standard' }; }),
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
                    gatePlaceMode={null}
                    onGatePlaced={handleGatePlaced}
                    undoStack={undoStack}
                    setUndoStack={setUndoStack}
                    redoStack={redoStack}
                    setRedoStack={setRedoStack}
                    onNewLine={handleNewLine}
                    onUndo={handleUndo}
                    onClear={handleClear}
                    onFinishLine={handleFinishLine}
                    canUndo={undoStack.length > 0}
                    gateMarkers={gateMarkers}
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
                gatePlaceMode={gatePlaceMode}
                onGatePlaced={handleGatePlaced}
                undoStack={undoStack}
                setUndoStack={setUndoStack}
                redoStack={redoStack}
                setRedoStack={setRedoStack}
                onNewLine={handleNewLine}
                onUndo={handleUndo}
                onClear={handleClear}
                onFinishLine={handleFinishLine}
                canUndo={undoStack.length > 0}
                gateMarkers={gateMarkers}
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
                gatePlaceMode={gatePlaceMode}
                onStartGatePlace={handleStartGatePlace}
                onCancelGatePlace={handleCancelGatePlace}
                onRemoveGate={handleRemoveGateMarker}
                onFinishLine={handleFinishLine}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
            />
        </div>
    );
};

export default DrawYardView;
