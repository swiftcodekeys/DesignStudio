import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import UnifiedCanvas from './UnifiedCanvas';
import TopNav from './TopNav';
import FloatingPanel from './FloatingPanel';
import BacklinksFooter from './BacklinksFooter';
import SocialProof from './SocialProof';
import QuoteModal from './QuoteModal';
import DrawYardView from './DrawYardView';
import QuoteBuilder from './QuoteBuilder';
import { COLORS, FENCE_STYLES } from './configData';
import { FENCE_COLORS, FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';
import QuizPage from './quiz/QuizPage';

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
        height: '60',
        color: COLORS[5], // Gloss Black
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
    var setActiveTab = tabState[1];

    var configTabState = useState('style');
    var activeConfigTab = configTabState[0];
    var setActiveConfigTab = configTabState[1];

    // ---- FENCE CONFIG STATE ----
    var defaultFenceConfig = {
        styleId: 'uaf_200',
        height: '48',
        color: FENCE_COLORS[5],  // Gloss Black (matches Ultra default)
        finialType: null,
        postCap: 'pcf',
        accessories: {},
        pupType: null,
        privacyPostColor: 'white',
        privacyPanelColor: 'white',
    };
    var fenceConfigState = useState(defaultFenceConfig);
    var fenceConfig = fenceConfigState[0];
    var setFenceConfig = fenceConfigState[1];

    var panelState = useState(false);
    var panelCollapsed = panelState[0];
    var setPanelCollapsed = panelState[1];

    var quoteModalState = useState(false);
    var quoteModalOpen = quoteModalState[0];
    var setQuoteModalOpen = quoteModalState[1];

    var viewState = useState('studio');
    var view = viewState[0];
    var setView = viewState[1];

    var handleGetQuote = function() {
        setQuoteModalOpen(true);
    };

    var handleOpenQuoteBuilder = function() {
        setQuoteModalOpen(false);
        // Pre-fill quote builder with current design studio config
        try {
            var isFenceMode = activeTab === 'fencing' || activeTab === 'backyard' || activeTab === 'draw';
            var activeConfig = isFenceMode ? fenceConfig : config;
            var colorMap = {
                5: 'textured-black', 6: 'textured-black',
                3: 'textured-white', 4: 'textured-white',
                1: 'textured-bronze', 2: 'textured-bronze',
                0: 'textured-khaki', 7: 'silver',
            };
            var styleMap = {
                'uaf_200': 'horizon', 'uaf_201': 'horizon-pro',
                'uab_200': 'haven', 'uaf_250': 'vanguard',
                'uas_100': 'charleston', 'uas_101': 'charleston-pro',
                'uas_150': 'savannah', 'uas_300': 'cambridge', 'uas_350': 'lexington',
            };
            var existing = JSON.parse(localStorage.getItem('gv_quote_builder') || '{}');
            var prefill = Object.assign({}, existing, {
                style: styleMap[activeConfig.styleId] || existing.style || '',
                height: parseInt(activeConfig.height) || existing.height || 60,
                color: (activeConfig.color && colorMap[activeConfig.color.id]) || existing.color || 'textured-black',
                isFence: isFenceMode,
                postCap: activeConfig.postCap || existing.postCap || '',
                finial: activeConfig.finial || activeConfig.finialType || existing.finial || '',
            });
            localStorage.setItem('gv_quote_builder', JSON.stringify(prefill));
        } catch (e) { console.error('[App] Quote prefill error:', e); }
        setView('quote-builder');
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

    var isDraw = activeTab === 'draw';

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
                    <DrawYardView onGetQuote={handleOpenQuoteBuilder} />
                    <BacklinksFooter config={config} />
                </div>
            ) : (
                <div className="viewport-wrap">
                    <div className="viewport-scene">
                        <SocialProof />
                        <UnifiedCanvas config={config} fenceConfig={fenceConfig} panelCollapsed={panelCollapsed} activeScene={activeTab} />
                        <BacklinksFooter config={config} />
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
            <QuoteModal isOpen={quoteModalOpen} onClose={function() { setQuoteModalOpen(false); }} config={(activeTab === 'fencing' || activeTab === 'backyard') ? fenceConfig : config} isFence={activeTab === 'fencing' || activeTab === 'backyard'} onOpenBuilder={handleOpenQuoteBuilder} />
        </div>
    );
};

var App = function() {
    return (
        <Routes>
            <Route path="/fence-quiz" element={<QuizPage />} />
            <Route path="/*" element={<DesignStudio />} />
        </Routes>
    );
};

export default App;
