import React, { useEffect, useRef } from 'react';
import { fitContainBox } from './spatialConstants';
import GateRenderer from './GateRenderer';
import FenceRenderer from './FenceRenderer';
import { FENCE_STYLES, getStyleRenderMode } from './configData';
import { FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';

// ============================================================
// PreviewPlaceholder — shown when renderMode === 'preview'
// ============================================================
var PreviewPlaceholder = function(props) {
    var styleName = props.styleName || 'This style';
    return React.createElement('div', {
        style: {
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#0b1220',
            color: '#667788',
            fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        }
    },
        React.createElement('div', {
            style: { fontSize: 48, marginBottom: 16, opacity: 0.4 }
        }, '\u25A8'),
        React.createElement('p', {
            style: { fontSize: 16, fontWeight: 600, marginBottom: 8 }
        }, styleName),
        React.createElement('p', {
            style: { fontSize: 13, opacity: 0.7 }
        }, '3D preview not yet available for this style'),
        React.createElement('p', {
            style: { fontSize: 12, opacity: 0.5, marginTop: 4 }
        }, 'Contact us for a custom quote')
    );
};

// ============================================================
// OverlayPlaceholder — shown when renderMode === 'overlay'
// Displays pre-rendered 3D privacy fence overlays scraped from Ultra.
// Images are indexed by post color, panel color, and view (front/back).
// ============================================================
function getPrivacyOverlaySrc(postColorId, panelColorId, view) {
    var folder = view === 'ba' ? 'back' : 'front';
    return 'fence_tool/overlays/' + folder + '/' + postColorId + '-' + panelColorId + '.png';
}

var OverlayPlaceholder = function(props) {
    var styleName = props.styleName || 'Privacy';
    var postColorId = props.postColorId || 'white';
    var panelColorId = props.panelColorId || 'white';
    var bgSrc = props.bgSrc || 'fence_tool/t/fb.jpg';
    var view = props.view || 'fr';

    var overlaySrc = getPrivacyOverlaySrc(postColorId, panelColorId, view);

    var outerRef = useRef(null);
    var wrapperRef = useRef(null);
    useEffect(function() {
        var outer = outerRef.current;
        var wrapper = wrapperRef.current;
        if (!outer || !wrapper) return;
        var resize = function() {
            var box = fitContainBox(outer.clientWidth, outer.clientHeight);
            wrapper.style.width = box.w + 'px';
            wrapper.style.height = box.h + 'px';
            wrapper.style.left = box.left + 'px';
            wrapper.style.top = box.top + 'px';
        };
        resize();
        window.addEventListener('resize', resize);
        return function() { window.removeEventListener('resize', resize); };
    }, []);

    return React.createElement('div', {
        ref: outerRef,
        style: {
            width: '100%', height: '100%',
            position: 'relative',
            backgroundColor: '#0b1220',
        }
    },
        React.createElement('div', {
            ref: wrapperRef,
            style: { position: 'absolute', overflow: 'hidden' },
        },
            React.createElement('img', {
                src: bgSrc,
                alt: '',
                style: { width: '100%', height: '100%', display: 'block' }
            }),
            React.createElement('img', {
                src: overlaySrc,
                alt: styleName + ' Privacy Fence',
                style: {
                    position: 'absolute',
                    top: '2%', left: '0%',
                    width: '100%',
                    height: 'auto',
                }
            }),
            React.createElement('div', {
                style: {
                    position: 'absolute',
                    bottom: 12, left: 16,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    backdropFilter: 'blur(8px)',
                }
            }, styleName + ' Privacy Fence')
        )
    );
};

// ============================================================
// UnifiedCanvas — routes to 3D / preview / overlay based on style
// ============================================================
var PANEL_WIDTH = 0; // Panel is now a flex sibling, canvas uses full container

var UnifiedCanvas = function(props) {
    var config = props.config;
    var fenceConfig = props.fenceConfig;
    var panelCollapsed = props.panelCollapsed;
    var activeScene = props.activeScene || 'gates';
    var isFence = (activeScene === 'fencing' || activeScene === 'backyard');

    // Determine render mode — check fence style's renderMode if in fence mode
    var renderMode;
    var fenceStyleDef = null;
    if (isFence) {
        fenceStyleDef = FENCE_TOOL_STYLES.find(function(s) { return s.id === (fenceConfig && fenceConfig.styleId); });
        renderMode = (fenceStyleDef && fenceStyleDef.renderMode) || '3d';
    } else {
        renderMode = getStyleRenderMode(config.styleId);
    }
    var activeStyle = isFence ? fenceStyleDef : FENCE_STYLES.find(function(s) { return s.id === config.styleId; });
    var styleName = activeStyle ? activeStyle.name : '';

    // Background image depends on scene
    var bgSrc = isFence
        ? (activeScene === 'backyard' ? 'fence_tool/t/bb.jpg' : 'fence_tool/t/fb.jpg')
        : 'assets/backgrounds/GateBackground.jpg';

    var outerRef = useRef(null);
    var wrapperRef = useRef(null);
    var mountRef = useRef(null);
    var rendererRef = useRef(null);
    var prevConfigRef = useRef(null);
    var sceneTypeRef = useRef(null);  // tracks 'gate' or 'fence' to detect scene switch

    // ============================================================
    // SCENE INIT — creates GateRenderer or FenceRenderer
    // Re-runs when switching between gate and fence scenes
    // ============================================================
    useEffect(function() {
        if (renderMode !== '3d') return;
        if (!window.THREE) return;

        var outer = outerRef.current;
        var wrapper = wrapperRef.current;
        var mount = mountRef.current;
        if (!outer || !wrapper || !mount) return;

        var currentType = isFence ? 'fence' : 'gate';

        // If renderer exists for the SAME scene type, keep it
        if (rendererRef.current && sceneTypeRef.current === currentType) return;

        // Dispose old renderer if switching scene type
        if (rendererRef.current) {
            rendererRef.current.dispose();
            rendererRef.current = null;
        }

        var positionCanvas = function(totalW, totalH, collapsed) {
            var availW = collapsed ? totalW : totalW - PANEL_WIDTH;
            var box = fitContainBox(availW, totalH);
            wrapper.style.width = box.w + 'px';
            wrapper.style.height = box.h + 'px';
            wrapper.style.left = box.left + 'px';
            wrapper.style.top = box.top + 'px';
            wrapper.style.transition = 'left 0.35s cubic-bezier(0.22,1,0.36,1), width 0.35s cubic-bezier(0.22,1,0.36,1)';
            return box;
        };

        var box = positionCanvas(outer.clientWidth, outer.clientHeight, panelCollapsed);

        var r;
        if (isFence) {
            r = new FenceRenderer(mount);
            // Set initial view based on which tab is active
            r.setView(activeScene === 'backyard' ? 'ba' : 'fr');
        } else {
            r = new GateRenderer(mount);
        }
        r.resize(box.w, box.h);
        rendererRef.current = r;
        sceneTypeRef.current = currentType;
        prevConfigRef.current = null;  // force rebuild on next config effect

        var handleResize = function() {
            var b = positionCanvas(outer.clientWidth, outer.clientHeight, panelCollapsed);
            r.resize(b.w, b.h);
        };
        window.addEventListener('resize', handleResize);

        return function() {
            window.removeEventListener('resize', handleResize);
            r.dispose();
            rendererRef.current = null;
            sceneTypeRef.current = null;
        };
    }, [renderMode, isFence]);

    // ============================================================
    // VIEW SWITCH — when switching between front/back yard
    // ============================================================
    useEffect(function() {
        if (!isFence) return;
        var r = rendererRef.current;
        if (!r || !r.setView) return;
        r.setView(activeScene === 'backyard' ? 'ba' : 'fr');
    }, [activeScene, isFence]);

    // ============================================================
    // REPOSITION — when panel collapses/expands
    // ============================================================
    useEffect(function() {
        if (renderMode !== '3d') return;
        var outer = outerRef.current;
        var wrapper = wrapperRef.current;
        var r = rendererRef.current;
        if (!outer || !wrapper || !r) return;

        var availW = panelCollapsed ? outer.clientWidth : outer.clientWidth - PANEL_WIDTH;
        var box = fitContainBox(availW, outer.clientHeight);
        wrapper.style.width = box.w + 'px';
        wrapper.style.height = box.h + 'px';
        wrapper.style.left = box.left + 'px';
        wrapper.style.top = box.top + 'px';
        r.resize(box.w, box.h);
    }, [panelCollapsed, renderMode]);

    // ============================================================
    // CONFIG CHANGE — rebuild or fast-update
    // ============================================================
    useEffect(function() {
        if (renderMode !== '3d') return;
        var r = rendererRef.current;
        if (!r) return;

        if (isFence) {
            // Fence: use fenceConfig
            var fc = fenceConfig;
            if (!fc) return;
            var prev = prevConfigRef.current;
            prevConfigRef.current = fc;

            // Fast path: color-only change
            if (prev && fc &&
                prev.styleId === fc.styleId &&
                prev.height === fc.height &&
                prev.finialType === fc.finialType &&
                prev.postCap === fc.postCap &&
                JSON.stringify(prev.accessories) === JSON.stringify(fc.accessories) &&
                prev.pupType === fc.pupType &&
                prev._pupVariant === fc._pupVariant &&
                prev.color !== fc.color) {
                r.updateMaterials(fc);
                return;
            }
            r.buildFence(fc);
        } else {
            // Gate: existing logic
            var prev = prevConfigRef.current;
            prevConfigRef.current = config;

            if (prev && config &&
                prev.styleId === config.styleId &&
                prev.arch === config.arch &&
                prev.leaf === config.leaf &&
                prev.post === config.post &&
                prev.postCap === config.postCap &&
                prev.finial === config.finial &&
                prev.height === config.height &&
                JSON.stringify(prev.accessories) === JSON.stringify(config.accessories) &&
                prev.color !== config.color) {
                r.updateMaterials(config);
                return;
            }
            r.buildGate(config);
        }
    }, [config, fenceConfig, renderMode, isFence, activeScene]);

    // ============================================================
    // Dispose renderer when leaving 3D mode
    // ============================================================
    useEffect(function() {
        if (renderMode !== '3d' && rendererRef.current) {
            rendererRef.current.dispose();
            rendererRef.current = null;
            sceneTypeRef.current = null;
        }
    }, [renderMode]);

    // ================================================================
    // LAYOUT
    // ================================================================
    if (renderMode === 'preview') {
        return React.createElement(PreviewPlaceholder, { styleName: styleName });
    }

    if (renderMode === 'overlay') {
        var postColorId = (fenceConfig && fenceConfig.privacyPostColor) || 'white';
        var panelColorId = (fenceConfig && fenceConfig.privacyPanelColor) || 'white';
        var overlayBg = (activeScene === 'backyard') ? 'fence_tool/t/bb.jpg' : 'fence_tool/t/fb.jpg';
        var overlayView = (activeScene === 'backyard') ? 'ba' : 'fr';
        return React.createElement(OverlayPlaceholder, {
            styleName: styleName,
            postColorId: postColorId,
            panelColorId: panelColorId,
            bgSrc: overlayBg,
            view: overlayView,
        });
    }

    // renderMode === '3d'
    return (
        <div ref={outerRef} style={{
            width: '100%', height: '100%',
            position: 'relative', backgroundColor: '#0b1220',
        }}>
            <div ref={wrapperRef} style={{ position: 'absolute' }}>
                <img
                    src={bgSrc}
                    alt=""
                    style={{ width: '100%', height: '100%', display: 'block' }}
                />
                <div ref={mountRef} style={{
                    width: '100%', height: '100%',
                    position: 'absolute', top: 0, left: 0,
                }} />
            </div>
        </div>
    );
};

export default UnifiedCanvas;
