import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import UnifiedCanvas from './UnifiedCanvas';
import TopNav from './TopNav';
import FloatingPanel from './FloatingPanel';
import BacklinksFooter from './BacklinksFooter';
import SocialProof from './SocialProof';
import ContactPopup from './ContactPopup';
import DrawYardView from './DrawYardView';
import QuoteBuilder from './QuoteBuilder';
import { COLORS, FENCE_STYLES } from './configData';
import { FENCE_COLORS, FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';
import QuizPage from './quiz/QuizPage';
import LandingPage from './LandingPage';
import WizardShell from './WizardShell';
import DesignReviewPage from './DesignReviewPage';
import AreaReturnPage from './AreaReturnPage';

var STORAGE_KEY = 'gv_config';

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

    // Separate config state per fence tab — preserves user selections when switching
    var frontYardConfigState = useState(defaultFrontYardConfig);
    var frontYardConfig = frontYardConfigState[0];
    var setFrontYardConfig = frontYardConfigState[1];

    var backyardConfigState = useState(defaultBackyardConfig);
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

        if (scene === 'backyard' && !savedDesign.poolBarrier) {
            setShowPoolPopup(true);
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

    // Auto-save to localStorage and update URL hash on config change
    useEffect(function() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            // localStorage may be unavailable
        }
        var hashString = buildHashString(config);
        window.history.replaceState(null, '', '#' + hashString);
    }, [config]);

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

    var isDraw = activeTab === 'draw';

    if (view === 'design-review') {
        return (
            <div className="app-shell">
                <DesignReviewPage
                    onNavigateToDraw={function(location) {
                        setView('studio');
                        setActiveTab('draw');
                    }}
                    onNavigateToManual={function() {
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
                <QuoteBuilder onClose={function() { setView('studio'); }} />
            </div>
        );
    }

    return (
        <div className="app-shell">
            <TopNav activeScene={activeTab} onSceneChange={function(id) { setActiveTab(id); setView('studio'); }} onReset={handleReset} onSaveImage={handleSaveImage} onGetQuote={handleGetQuote} />
            {isDraw ? (
                <div className="viewport-wrap">
                    <DrawYardView onGetQuote={handleGetQuote} onSkipToManualEntry={handleSkipToManualEntry} fenceConfig={fenceConfig} />
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
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/wizard" element={<WizardShell />} />
            <Route path="/fence-quiz" element={<QuizPage />} />
            <Route path="/studio" element={<DesignStudio />} />
            <Route path="/*" element={<DesignStudio />} />
        </Routes>
    );
};

export default App;
