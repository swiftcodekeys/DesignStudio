import React, { useState } from 'react';
import { COLORS } from '../configData';
import { FENCE_COLORS, FENCE_TOOL_STYLES } from '../configData';
import ImagePopup from './ImagePopup';
import DesignStudioContext from '../DesignStudioContext';

var COLOR_PREVIEWS = {
    5: 'assets/ifence_previews/gate_colors/black.png',
    6: 'assets/ifence_previews/gate_colors/matte_black.png',
    3: 'assets/ifence_previews/gate_colors/gloss_white.png',
    4: 'assets/ifence_previews/gate_colors/white.png',
    1: 'assets/ifence_previews/gate_colors/gloss_bronze.png',
    2: 'assets/ifence_previews/gate_colors/bronze.png',
    0: 'assets/ifence_previews/gate_colors/matte_sandstone.png',
    7: 'assets/ifence_previews/gate_colors/silver.png',
};

var ColorTab = function(props) {
    var isFence = props.isFence;
    var ctx = React.useContext(DesignStudioContext);
    var config = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.fenceConfig : ctx.config) : props.config;
    var onConfigChange = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.setFenceConfig : ctx.setConfig) : props.onConfigChange;

    // Check if current fence style is privacy
    var fStyle = null;
    var isPrivacy = false;
    if (isFence && config.styleId) {
        fStyle = FENCE_TOOL_STYLES.find(function(s) { return s.id === config.styleId; });
        isPrivacy = fStyle && fStyle.isPrivacy;
    }

    var hoverState = useState(null);
    var popup = hoverState[0];
    var setPopup = hoverState[1];

    var handleMouseEnter = function(colorId, name, event) {
        var rect = event.currentTarget.getBoundingClientRect();
        var src = COLOR_PREVIEWS[colorId];
        if (!src) return;
        setPopup({ src: src, name: name, position: { top: rect.top - 40, left: rect.left - 104 } });
    };

    var handleMouseLeave = function() { setPopup(null); };

    // ── Privacy: dual color picker (posts + panels) ──
    if (isPrivacy && fStyle) {
        var postColors = fStyle.privacyPostColors || [];
        var panelColors = fStyle.privacyPanelColors || [];
        var activePostId = config.privacyPostColor || 'white';
        var activePanelId = config.privacyPanelColor || 'white';

        var handlePostColor = function(c) {
            onConfigChange(function(prev) { return { ...prev, privacyPostColor: c.id }; });
        };
        var handlePanelColor = function(c) {
            onConfigChange(function(prev) { return { ...prev, privacyPanelColor: c.id }; });
        };

        function renderPrivacySwatch(color, isActive, onClick) {
            var isLight = color.hex === '#f0f0f0' || color.hex === '#e8e8e8';
            var swatchClass = 'swatch' + (isActive ? ' active' : '') + (isLight ? ' swatch-light' : '');
            return (
                <div key={color.id} className="swatch-group" onClick={function() { onClick(color); }}>
                    <div className={swatchClass} style={{ background: color.hex }} />
                    <div className="swatch-name">{color.name}</div>
                </div>
            );
        }

        return (
            <div>
                <div style={{ marginBottom: '16px' }}>
                    <div className="panel-section-label">POST &amp; RAIL COLOR</div>
                    <div className="swatch-row">
                        {postColors.map(function(c) { return renderPrivacySwatch(c, c.id === activePostId, handlePostColor); })}
                    </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border, #e8eaed)', paddingTop: '16px' }}>
                    <div className="panel-section-label">PANEL COLOR</div>
                    <div className="swatch-row">
                        {panelColors.map(function(c) { return renderPrivacySwatch(c, c.id === activePanelId, handlePanelColor); })}
                    </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#8e95a0', fontWeight: 500 }}>
                    Mix and match post &amp; panel colors. Every component individually coated before assembly.
                </div>
                {popup && <ImagePopup src={popup.src} label={popup.name} position={popup.position} />}
            </div>
        );
    }

    // ── Standard color picker (gates + aluminum fences) ──
    var colorList = isFence ? FENCE_COLORS : COLORS;

    var handleColorChange = function(color) {
        onConfigChange(function(prev) { return { ...prev, color: color }; });
    };

    var row1 = colorList.slice(0, 4);
    var row2 = colorList.slice(4, 8);

    function renderSwatch(color) {
        var isActive = config.color && config.color.id === color.id;
        var isLight = color.hex === '#f0f0f0' || color.hex === '#e8e8e8';
        var swatchClass = 'swatch' + (isActive ? ' active' : '') + (isLight ? ' swatch-light' : '');
        return (
            <div
                key={color.id}
                className="swatch-group"
                onClick={function() { handleColorChange(color); }}
                onMouseEnter={function(e) { handleMouseEnter(color.id, color.displayName, e); }}
                onMouseLeave={handleMouseLeave}
            >
                <div
                    className={swatchClass}
                    style={{ background: color.hex }}
                />
                <div className="swatch-name">{color.displayName}</div>
            </div>
        );
    }

    return (
        <div>
            <div className="swatch-row">
                {row1.map(renderSwatch)}
            </div>
            <div className="swatch-row" style={{ marginTop: '12px' }}>
                {row2.map(renderSwatch)}
            </div>
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#8e95a0', fontWeight: 500 }}>
                Every component individually coated before assembly for complete coverage. Limited Lifetime Warranty.
            </div>
            {popup && <ImagePopup src={popup.src} label={popup.name} position={popup.position} />}
        </div>
    );
};

export default ColorTab;
