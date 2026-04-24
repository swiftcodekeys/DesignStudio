import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { checkForResume } from './quoteSaver';
import UnifiedCanvas from './UnifiedCanvas';
import TopNav from './TopNav';
import FloatingPanel from './FloatingPanel';
import BacklinksFooter from './BacklinksFooter';
import SocialProof from './SocialProof';
import ContactPopup from './ContactPopup';
import DrawYardView from './DrawYardView';
import MapboxDrawView from './MapboxDrawView';
import QuoteBuilder from './QuoteBuilder';
import { COLORS, FENCE_STYLES } from './configData';
import { FENCE_COLORS, FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';
import QuizPage from './quiz/QuizPage';
import LandingPage from './LandingPage';
import WizardShell from './WizardShell';
import DesignReviewPage from './DesignReviewPage';
import AreaReturnPage from './AreaReturnPage';
import HowToMeasurePage from './HowToMeasurePage';
import CheckoutPage from './CheckoutPage';
import CheckoutSuccessPage from './CheckoutSuccessPage';
import './checkout.css';

function debounce(fn, ms) {
    var t;
    var debounced = function() {
        var args = arguments;
        var ctx = this;
        clearTimeout(t);
        t = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
    debounced.flush = function() {
        clearTimeout(t);
        fn();
    };
    return debounced;
}

var STORAGE_KEY = 'gv_config';
var USE_MAPBOX = process.env.USE_MAPBOX_DRAW;

function buildHashString(config) {
    var parts = [
        'style=' + config.styleId,
        'color=' + (config.color ? config.color.id : ''),
        'height=' + config.height,
        'arch=' + config.arch,
        'leaf=' + (config.leaf || ''),
        'mount=' + (config.mount || ''),
        'finial=' + (config.finial || ''),
        'postCap=' + (config.postCap || ''),
    ];
    return parts.join('&');
}

function parseHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return null;
    var params = {};
    hash.split('&').forEach(function(pair) {
        var kv = pair.split('=');
        if (kv.length === 2) {
            params[kv[0]] = decodeURIComponent(kv[1]);
        }
    });
    return params;
}

function buildConfigFromParams(params, defaultConfig) {
    if (!params || !params.style) return null;

    // Validate style exists
    var style = FENCE_STYLES.find(function(s) { return s.id === params.style; });
    if (!style) return null;

    // Validate color exists
    var color = COLORS.find(function(c) { return c.id === params.color; });

    var config = Object.assign({}, defaultConfig, {
        styleId: params.style,
        height: params.height || defaultConfig.height,
        arch: params.arch || defaultConfig.arch,
        leaf: params.leaf || defaultConfig.leaf,
        mount: params.mount || defaultConfig.mount,
        finial: params.finial || (style.hasFinials ? 'fs' : null),
        postCap: params.postCap || defaultConfig.postCap,
    });
    if (color) config.color = color;

    return config;
}

function loadFromStorage(defaultConfig) {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        var saved = JSON.parse(raw);
        if (!saved || !saved.styleId) return null;

        // Validate style
        var style = FENCE_STYLES.find(function(s) { return s.id === saved.styleId; });
        if (!style) return null;

        // Resolve color object (stored as id reference)
        if (saved.color && saved.color.id) {
            var color = COLORS.find(function(c) { return c.id === saved.color.id; });
            if (color) saved.color = color;
        }

        return saved;
    } catch (e) {
        return null;
    }
}

var DesignStudio = function() {
    var defaultStyle = FENCE_STYLES[0];
    var defaultConfig = {
        styleId: defaultStyle.id,
        height: '48',
        color: COLORS[1], // Textured Black
        post: defaultStyle.postDefault,
        postCap: 'pcf',
        arch: 'e',
        leaf: defaultStyle.leafDefault,
        finial: null,
        accessories: {},
        mount: 'p',
    };

    // Determine initial config: URL hash > localStorage > default
    var initialConfig = defaultConfig;
    var hashParams = parseHash();
    var fromHash = buildConfigFromParams(hashParams, defaultConfig);
    if (fromHash) {
        initialConfig = fromHash;
    } else {
        var fromStorage = loadFromStorage(defaultConfig);
        if (fromStorage) {
            initialConfig = fromStorage;
        }
    }

    var configState = useState(initialConfig);
    var config = configState[0];
    var setConfig = configState[1];

    var tabState = useState('fencing');
    var activeTab = tabState[0];
    var setActiveTabRaw = tabState[1];

    var configTabState = useState('style');
    var activeConfigTab = configTabState[0];
    var setActiveConfigTab = configTabState[1];

    // ---- PER-SCENE FENCE CONFIG DEFAULTS ----
    var defaultFrontYardConfig = {
        styleId: 'uaf_200', // Horizon
        height: '48',
        color: FENCE_COLORS[1], // Textured Black
        finialType: null,
        postCap: 'pcf',
        accessories: {},
        pupType: null,
        privacyPostColor: 'white',
        privacyPanelColor: 'white',
    };
    var defaultBackyardConfig = {
        styleId: 'uab_200', // Haven
        height: '54',
        color: FENCE_COLORS[3], // Textured White
        finialType: null,
        postCap: 'pcf',
        accessories: {},
        pupType: null,
        privacyPostColor: 'white',
        privacyPanelColor: 'white',
    };

    // Separate config state per fence tab. Preserves user selections across
    // tab switches AND across direct URL landings like /studio?view=quote.
    //
    // Lazy initializers hydrate from localStorage (gv_fence_config /
    // gv_back_config) so a buyer returning via a CRM email link doesn't have
    // their saved color clobbered by the defaults' write-back useEffect.
    // Without the hydration, the useState default fires, the write useEffect
    // fires, and the user's real color is overwritten before QuoteBuilder
    // reads gv_fence_config.
    function hydrateConfig(storageKey, defaults) {
        try {
            var raw = localStorage.getItem(storageKey);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return Object.assign({}, defaults, parsed);
                }
            }
        } catch (_) { /* ignore */ }
        return defaults;
    }

    var frontYardConfigState = useState(function() { return hydrateConfig('gv_fence_config', defaultFrontYardConfig); });
    var frontYardConfig = frontYardConfigState[0];
    var setFrontYardConfig = frontYardConfigState[1];

    var backyardConfigState = useState(function() { return hydrateConfig('gv_back_config', defaultBackyardConfig); });
    var backyardConfig = backyardConfigState[0];
    var setBackyardConfig = backyardConfigState[1];

    // Active fence config derived from current tab
    var fenceConfig = (activeTab === 'backyard') ? backyardConfig : frontYardConfig;
    var setFenceConfig = (activeTab === 'backyard') ? setBackyardConfig : setFrontYardConfig;

    var handleSceneChange = function(newTab) {
        setActiveTabRaw(newTab);
        setActiveConfigTab('style');
    };
    var setActiveTab = handleSceneChange;

    useEffect(function() {
        // Check URL query param first: ?tab=fencing|backyard|gates|draw&view=quote
        try {
            var params = new URLSearchParams(window.location.search);
            var tabParam = params.get('tab');
            var viewParam = params.get('view');
            if (tabParam && ['fencing', 'backyard', 'gates', 'draw'].indexOf(tabParam) >= 0) {
                setActiveTabRaw(tabParam);
            }
            if (viewParam === 'quote') {
                setView('quote-builder');
            }
        } catch(e) {}
        // Fallback: check localStorage (from wizard flow)
        try {
            var startScene = localStorage.getItem('gv_start_scene');
            if (startScene) {
                localStorage.removeItem('gv_start_scene');
                setActiveTabRaw(startScene);
            }
        } catch(e) {}
        try {
            var savedFence = localStorage.getItem('gv_fence_config');
            if (savedFence) {
                var parsed = JSON.parse(savedFence);
                if (parsed && parsed.styleId) setFrontYardConfig(parsed);
            }
        } catch(e) {}
        try {
            var savedBack = localStorage.getItem('gv_back_config');
            if (savedBack) {
                var parsedBack = JSON.parse(savedBack);
                if (parsedBack && parsedBack.styleId) setBackyardConfig(parsedBack);
            }
        } catch(e) {}
    }, []);

    var panelState = useState(false);
    var panelCollapsed = panelState[0];
    var setPanelCollapsed = panelState[1];

    var contactPopupState = useState(false);
    var contactPopupOpen = contactPopupState[0];
    var setContactPopupOpen = contactPopupState[1];

    var viewState = useState('studio');
    var view = viewState[0];
    var setView = viewState[1];

    // Multi-area flow state
    var multiAreaState = useState(null); // null = single area, { areas: [...], activeAreaIndex: 0 }
    var multiArea = multiAreaState[0];
    var setMultiArea = multiAreaState[1];

    var poolPopupState = useState(false);
    var showPoolPopup = poolPopupState[0];
    var setShowPoolPopup = poolPopupState[1];

    // Draw tool data from MapboxDrawView.onComplete — passed into QuoteBuilder so
    // QuoteStep2_Layout can pre-fill linearFeet/segments/rackingTier from the drawn yard.
    var drawToolDataState = useState(null);
    var drawToolData = drawToolDataState[0];
    var setDrawToolData = drawToolDataState[1];

    var buildSavedDesign = function(scene, activeConfig) {
        var acc = activeConfig.accessories || {};
        var isFence = (scene === 'fencing' || scene === 'backyard');

        // Capture viewport snapshot (background image + 3D canvas composited)
        var snapshotDataUrl = '';
        try {
            // Request a synchronous render pass from whichever renderer is
            // currently mounted. With preserveDrawingBuffer:true the back
            // buffer then contains the latest frame for toDataURL.
            try { window.dispatchEvent(new CustomEvent('gv:request-render')); } catch (_) {}

            var viewportWrap = document.querySelector('.viewport-wrap');
            var canvasEl = document.querySelector('.viewport-scene canvas');
            var bgImgEl = viewportWrap ? viewportWrap.querySelector('.viewport-scene img') : null;
            if (canvasEl && viewportWrap) {
                var w = canvasEl.width;
                var h = canvasEl.height;
                var offscreen = document.createElement('canvas');
                offscreen.width = w;
                offscreen.height = h;
                var ctx = offscreen.getContext('2d');
                if (bgImgEl && bgImgEl.complete && bgImgEl.naturalWidth > 0) {
                    ctx.drawImage(bgImgEl, 0, 0, w, h);
                } else {
                    var grad = ctx.createLinearGradient(0, 0, 0, h);
                    grad.addColorStop(0, '#cddcea');
                    grad.addColorStop(0.25, '#b4c6d6');
                    grad.addColorStop(0.5, '#a0b4c4');
                    grad.addColorStop(1, '#94a8b4');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, w, h);
                }
                ctx.drawImage(canvasEl, 0, 0, w, h);
                snapshotDataUrl = offscreen.toDataURL('image/jpeg', 0.85);
            } else if (canvasEl) {
                snapshotDataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
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

    var handleGetQuote = function(data) {
        // Defensive: only store draw tool data when the arg is a real draw result.
        // handleGetQuote is also called with no arg from the contact popup submit
        // and from handleSkipToManualEntry — those callers must not clear state.
        if (data && typeof data === 'object' && data.totalFeet != null) {
            setDrawToolData(data);
        }
        setContactPopupOpen(false);

        var isFenceScene = (activeTab === 'fencing' || activeTab === 'backyard');
        var activeConfig = isFenceScene ? fenceConfig : config;
        var scene = activeTab === 'draw' ? 'fencing' : activeTab;

        var savedDesign = buildSavedDesign(scene, activeConfig);

        // Pass 4: when the buyer arrives from the draw tool, the .viewport-scene
        // canvas is no longer in the DOM (they left the 3D view when they
        // clicked Draw Your Yard). buildSavedDesign tries to capture the 3D
        // canvas here and comes back with an empty snapshotDataUrl, which
        // would clobber the real fence render that was captured when they
        // entered the draw tool. Read the previously-persisted design and
        // preserve its snapshotDataUrl + any config fields the draw flow
        // can't re-derive. Other fields (styleId, color, etc.) still get
        // refreshed from activeConfig so any final tweaks carry forward.
        try {
            var rawPrev = localStorage.getItem('gv_saved_design');
            if (rawPrev) {
                var prev = JSON.parse(rawPrev);
                if (prev && typeof prev === 'object') {
                    if (!savedDesign.snapshotDataUrl && prev.snapshotDataUrl) {
                        savedDesign.snapshotDataUrl = prev.snapshotDataUrl;
                    }
                }
            }
        } catch (_) {}

        // Persist the annotated + raw map snapshots from the draw tool into
        // gv_saved_design so the QB sidebar still shows the buyer's yard
        // drawing after a reload. Without this, drawToolData state resets to
        // null on the next mount and the sidebar falls through to the generic
        // style thumbnail even though the drawing was just captured.
        if (data && typeof data === 'object') {
            if (typeof data.annotatedSnapshotUrl === 'string' && data.annotatedSnapshotUrl.length > 0) {
                savedDesign.annotatedSnapshotUrl = data.annotatedSnapshotUrl;
            }
            if (typeof data.mapboxSnapshotUrl === 'string' && data.mapboxSnapshotUrl.length > 0) {
                savedDesign.mapboxSnapshotUrl = data.mapboxSnapshotUrl;
            }
        }

        try {
            localStorage.setItem('gv_saved_design', JSON.stringify(savedDesign));
        } catch (e) {
            console.warn('[SaveDesign] localStorage write failed:', e);
        }

        // From draw tool: go straight to quote builder (they already have measurements)
        // From design studio: go to bridge page (review design + enter address or manual)
        if (activeTab === 'draw') {
            setView('quote-builder');
        } else {
            setView('design-review');
            if (scene === 'backyard' && !savedDesign.poolBarrier) {
                setShowPoolPopup(true);
            }
        }
    };

    var handleSkipToManualEntry = function() {
        handleGetQuote();
    };

    var handleReset = function() {
        if (window.confirm('Reset all selections to defaults?')) {
            setConfig(defaultConfig);
            setActiveConfigTab('style');
        }
    };

    var handleSaveImage = function() {
        alert('Save Image coming soon');
    };

    var persistRef = React.useRef(null);

    // Auto-save to localStorage (debounced) and update URL hash on config change
    useEffect(function() {
        if (!persistRef.current) {
            persistRef.current = debounce(function(cfg, frontCfg, backCfg) {
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
                try { localStorage.setItem('gv_fence_config', JSON.stringify(frontCfg)); } catch (e) {}
                try { localStorage.setItem('gv_back_config', JSON.stringify(backCfg)); } catch (e) {}
            }, 500);
        }
        persistRef.current(config, frontYardConfig, backyardConfig);
        var hashString = buildHashString(config);
        window.history.replaceState(null, '', '#' + hashString);
    }, [config, frontYardConfig, backyardConfig]);

    useEffect(function() {
        var flush = function() {
            if (persistRef.current) persistRef.current.flush();
        };
        window.addEventListener('beforeunload', flush);
        return function() { window.removeEventListener('beforeunload', flush); };
    }, []);

    var isDraw = activeTab === 'draw';

    if (view === 'design-review') {
        return (
            <div className="app-shell">
                <DesignReviewPage
                    onNavigateToDraw={function(location) {
                        setView('studio');
                        setActiveTab('draw');
                    }}
                    onNavigateToManual={function(payload) {
                        if (payload && payload.totalFeet) {
                            setDrawToolData({
                                totalFeet: payload.totalFeet,
                                manualEntry: true,
                            });
                        }
                        setView('quote-builder');
                    }}
                    onNavigateToStudio={function() {
                        setView('studio');
                    }}
                    onOpenContact={function() {
                        setContactPopupOpen(true);
                        setView('studio');
                    }}
                    showPoolPopup={showPoolPopup}
                    onPoolComplete={function(result) {
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
                    }}
                    onPoolCancel={function() { setShowPoolPopup(false); }}
                />
            </div>
        );
    }

    if (view === 'area-return') {
        return (
            <div className="app-shell">
                <AreaReturnPage
                    area1Config={multiArea && multiArea.areas ? multiArea.areas[0] : null}
                    onSameSystem={function() {
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
                    }}
                    onDifferentSystem={function() {
                        // Go to design tool with backyard tab
                        setActiveTab('backyard');
                        setView('studio');
                    }}
                    onBack={function() {
                        setView('design-review');
                    }}
                />
            </div>
        );
    }

    if (view === 'quote-builder') {
        return (
            <div className="app-shell">
                <QuoteBuilder
                    drawToolData={drawToolData}
                    onClose={function() { setView('studio'); }}
                    onBackToDesignReview={function() { setView('design-review'); }}
                />
            </div>
        );
    }

    return (
        <div className="app-shell">
            <TopNav activeScene={activeTab} onSceneChange={function(id) {
                if (id === 'draw') {
                    // Show bridge page first — user enters address, then goes to draw tool
                    var isFenceScene = (activeTab === 'fencing' || activeTab === 'backyard');
                    var activeConfig = isFenceScene ? fenceConfig : config;
                    var scene = activeTab === 'gates' ? 'gates' : activeTab;
                    var savedDesign = buildSavedDesign(scene, activeConfig);
                    try {
                        localStorage.setItem('gv_saved_design', JSON.stringify(savedDesign));
                    } catch (e) {}
                    setView('design-review');
                } else {
                    setActiveTab(id);
                    setView('studio');
                }
            }} onReset={handleReset} onSaveImage={handleSaveImage} onGetQuote={handleGetQuote} />
            {isDraw ? (
                <div className="viewport-wrap">
                    {USE_MAPBOX
                        ? <MapboxDrawView onComplete={handleGetQuote} initialLocation={null} onGetQuote={handleGetQuote} onSkipToManualEntry={handleSkipToManualEntry} fenceConfig={fenceConfig} />
                        : <DrawYardView onGetQuote={handleGetQuote} onSkipToManualEntry={handleSkipToManualEntry} fenceConfig={fenceConfig} />}
                    <BacklinksFooter config={config} />
                </div>
            ) : (
                <div className="viewport-wrap">
                    <div className="viewport-scene">
                        <SocialProof />
                        <UnifiedCanvas config={config} fenceConfig={fenceConfig} panelCollapsed={panelCollapsed} activeScene={activeTab} />
                        <BacklinksFooter config={config} onContactClick={function() { setContactPopupOpen(true); }} />
                    </div>
                    <FloatingPanel
                        activeTab={activeConfigTab}
                        onTabChange={setActiveConfigTab}
                        config={(activeTab === 'fencing' || activeTab === 'backyard') ? fenceConfig : config}
                        onConfigChange={(activeTab === 'fencing' || activeTab === 'backyard') ? setFenceConfig : setConfig}
                        collapsed={panelCollapsed}
                        onToggleCollapse={function() { setPanelCollapsed(!panelCollapsed); }}
                        isFence={activeTab === 'fencing' || activeTab === 'backyard'}
                        onGetQuote={handleGetQuote}
                        activeScene={activeTab}
                        onSceneChange={setActiveTab}
                    />
                </div>
            )}
            <ContactPopup isOpen={contactPopupOpen} onClose={function() { setContactPopupOpen(false); }} />
        </div>
    );
};

var App = function() {
    var navigate = useNavigate();
    useEffect(function() {
        // Handle legacy hash-style routes: /#/wizard, /#/studio, etc.
        // Anyone bookmarking or sharing a hash URL gets redirected to the
        // correct path route instead of falling through to the landing page.
        var hash = window.location.hash || '';
        if (hash.indexOf('#/') === 0) {
            var hashPath = hash.slice(1); // '#/wizard' -> '/wizard'
            window.history.replaceState(null, '', hashPath);
            navigate(hashPath, { replace: true });
            return;
        }
        if (checkForResume()) {
            navigate('/wizard');
        }
    }, []);
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/wizard" element={<WizardShell />} />
            <Route path="/fence-quiz" element={<QuizPage />} />
            <Route path="/studio" element={<DesignStudio />} />
            <Route path="/how-to-measure-your-yard" element={<HowToMeasurePage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            <Route path="/*" element={<DesignStudio />} />
        </Routes>
    );
};

export default App;
