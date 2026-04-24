import React, { useState } from 'react';
import { STYLE_FEATURE_GATE, FENCE_STYLES } from '../configData';
import ImagePopup from './ImagePopup';
import DesignStudioContext from '../DesignStudioContext';

var POST_CAP_ITEMS = [
    { id: 'pcf', name: 'Flat', thumb: 'assets/ifence_previews/post_caps/flat_cap_71.png' },
    { id: 'pcb', name: 'Ball', thumb: 'assets/ifence_previews/gate_accent_choices/ball_caps_160.png' },
];

var FINIAL_ITEMS = [
    { id: 'fs', name: 'Spear',   thumb: 'gate_tool/th/th_pc_spe.jpg' },
    { id: 'ft', name: 'Trident', thumb: 'gate_tool/th/th_pc_tri.jpg' },
    { id: 'fq', name: 'Quad',    thumb: 'gate_tool/th/th_pc_qua.jpg' },
    { id: 'fp', name: 'Plug',    thumb: 'gate_tool/th/th_pc_plg.jpg' },
];

var ACCENT_ITEMS = [
    { id: 'cir', name: 'Circle',    thumb: 'assets/ifence_previews/gate_accent_choices/circles_at_base_151.png' },
    { id: 'but', name: 'Butterfly', thumb: 'assets/ifence_previews/gate_accent_choices/butterflies_at_base_154.png' },
    { id: 'scr', name: 'Scroll',    thumb: 'assets/ifence_previews/gate_accent_choices/estate_scrolls_136.png' },
];

var DetailsTab = function(props) {
    var ctx = React.useContext(DesignStudioContext);
    var config = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.fenceConfig : ctx.config) : props.config;
    var onConfigChange = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.setFenceConfig : ctx.setConfig) : props.onConfigChange;
    var gate = STYLE_FEATURE_GATE[config.styleId] || {};
    var style = FENCE_STYLES.find(function(s) { return s.id === config.styleId; }) || FENCE_STYLES[0];

    var hoverState = useState(null);
    var popup = hoverState[0];
    var setPopup = hoverState[1];

    var availablePostCaps = (gate.postCaps || []);
    var availableFinials = (gate.finials || []);
    var availableAccessories = (gate.accessories || []);

    var filteredPostCaps = POST_CAP_ITEMS.filter(function(pc) {
        return availablePostCaps.indexOf(pc.id) !== -1;
    });

    var isFence = props.isFence;
    var filteredFinials = FINIAL_ITEMS.filter(function(f) {
        if (isFence && f.id === 'fp') return false;
        return availableFinials.indexOf(f.id) !== -1;
    });

    var filteredAccents = ACCENT_ITEMS.filter(function(a) {
        return availableAccessories.indexOf(a.id) !== -1;
    });

    var handlePostCapChange = function(pcId) {
        onConfigChange({ ...config, postCap: pcId });
    };

    var handleFinialChange = function(finId) {
        onConfigChange({ ...config, finial: finId, finialType: finId });
    };

    var toggleAccent = function(accId) {
        var current = config.accessories || {};
        var updated = { ...current };
        if (accId === 'cir' || accId === 'but') {
            var other = accId === 'cir' ? 'but' : 'cir';
            updated[accId] = !current[accId];
            updated[other] = false;
        } else {
            updated[accId] = !current[accId];
        }
        onConfigChange({
            ...config,
            accessories: updated,
        });
    };

    var handleMouseEnter = function(src, alt, event) {
        var rect = event.currentTarget.getBoundingClientRect();
        setPopup({
            src: src,
            alt: alt,
            position: {
                top: rect.top - 10,
                left: rect.left - 116,
            }
        });
    };

    var handleMouseLeave = function() {
        setPopup(null);
    };

    return (
        <div className="sections-row">
            {filteredPostCaps.length > 0 && (
                <div className="section-group">
                    <div className="section-title">Post Caps</div>
                    <div className="option-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: '200px', margin: '0 auto' }}>
                        {filteredPostCaps.map(function(pc) {
                            var isActive = (config.postCap || 'pcf') === pc.id;
                            return (
                                <div
                                    key={pc.id}
                                    className={'opt-card' + (isActive ? ' active' : '')}
                                    onClick={function() { handlePostCapChange(pc.id); }}
                                >
                                    <div className="opt-card-img">
                                        <img src={pc.thumb} alt={pc.name} />
                                    </div>
                                    <div className="opt-card-label">{pc.name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {style.hasFinials && filteredFinials.length > 0 && (
                <div className="section-group">
                    <div className="section-title">Finials</div>
                    <div className="option-row">
                        {filteredFinials.map(function(f) {
                            var isActive = (config.finial || config.finialType || 'fs') === f.id;
                            return (
                                <div
                                    key={f.id}
                                    className={'opt-card' + (isActive ? ' active' : '')}
                                    onClick={function() { handleFinialChange(f.id); }}
                                    onMouseEnter={function(e) { handleMouseEnter(f.thumb, f.name, e); }}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <div className="opt-card-img">
                                        <img src={f.thumb} alt={f.name} />
                                    </div>
                                    <div className="opt-card-label">{f.name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {filteredAccents.length > 0 && (
                <div className="section-group">
                    <div className="section-title">Accents</div>
                    <div className="option-row">
                        {filteredAccents.map(function(acc) {
                            var isActive = config.accessories && config.accessories[acc.id];
                            return (
                                <div
                                    key={acc.id}
                                    className={'opt-card' + (isActive ? ' active' : '')}
                                    onClick={function() { toggleAccent(acc.id); }}
                                >
                                    <div className="opt-card-img">
                                        <img src={acc.thumb} alt={acc.name} />
                                    </div>
                                    <div className="opt-card-label">{acc.name}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {popup && <ImagePopup src={popup.src} alt={popup.alt} position={popup.position} />}
        </div>
    );
};

export default DetailsTab;
