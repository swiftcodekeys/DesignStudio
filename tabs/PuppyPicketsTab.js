import React, { useState } from 'react';
import { STYLE_FEATURE_GATE } from '../configData';
import { FENCE_STYLES as FENCE_TOOL_STYLES } from '../fenceConfigData';
import ImagePopup from './ImagePopup';
import DesignStudioContext from '../DesignStudioContext';

var PUPPY_VARIANTS = [
    { id: 'fls', name: 'Flush',     thumb: 'assets/ifence_previews/gate_puppy_pickets/flush_puppies_97.png' },
    { id: 'std', name: 'Standard',  thumb: 'assets/ifence_previews/gate_puppy_pickets/classic_puppies_100.png' },
    { id: 'plg', name: 'Classic Plugged',   thumb: 'assets/ifence_previews/gate_puppy_pickets/nouveau_puppies_94.png' },
    { id: 'pls', name: 'Staggered Plugged', thumb: 'assets/ifence_previews/gate_puppy_pickets/nouveau_puppies_staggered_91.png' },
    { id: 'spe', name: 'Classic Spear',     thumb: 'assets/ifence_previews/gate_puppy_pickets/bella_puppies_82.png' },
    { id: 'sps', name: 'Staggered Spear',   thumb: 'assets/ifence_previews/gate_puppy_pickets/bella_puppies_staggered_79.png' },
    { id: 'tri', name: 'Classic Tri-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/fleur_de_lis_puppies_76.png' },
    { id: 'trs', name: 'Staggered Tri-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/fleur_de_lis_puppies_staggered_73.png' },
    { id: 'qua', name: 'Classic Quad-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/excelsior_puppies_88.png' },
    { id: 'qus', name: 'Staggered Quad-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/excelsior_puppies_staggered_85.png' },
];

// Fence puppy: pupType is the model ID (pupst or pupcl)
// All classic variants use pupcl model — finial visual differences are aspirational
// until m/7/ puppy finial models become available on Ultra's server
var FENCE_PUPPY_VARIANTS = [
    { id: 'pupst', name: 'Standard',           thumb: 'assets/ifence_previews/gate_puppy_pickets/classic_puppies_100.png' },
    { id: 'pupcl', name: 'Classic Plugged',     thumb: 'assets/ifence_previews/gate_puppy_pickets/nouveau_puppies_94.png' },
    { id: 'pupcl_pls', name: 'Staggered Plugged', thumb: 'assets/ifence_previews/gate_puppy_pickets/nouveau_puppies_staggered_91.png', model: 'pupcl' },
    { id: 'pupcl_spe', name: 'Classic Spear',   thumb: 'assets/ifence_previews/gate_puppy_pickets/bella_puppies_82.png', model: 'pupcl' },
    { id: 'pupcl_sps', name: 'Staggered Spear', thumb: 'assets/ifence_previews/gate_puppy_pickets/bella_puppies_staggered_79.png', model: 'pupcl' },
    { id: 'pupcl_tri', name: 'Classic Tri-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/fleur_de_lis_puppies_76.png', model: 'pupcl' },
    { id: 'pupcl_trs', name: 'Staggered Tri-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/fleur_de_lis_puppies_staggered_73.png', model: 'pupcl' },
    { id: 'pupcl_qua', name: 'Classic Quad-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/excelsior_puppies_88.png', model: 'pupcl' },
    { id: 'pupcl_qus', name: 'Staggered Quad-Finial', thumb: 'assets/ifence_previews/gate_puppy_pickets/excelsior_puppies_staggered_85.png', model: 'pupcl' },
];

var PuppyPicketsTab = function(props) {
    var isFence = props.isFence;
    var ctx = React.useContext(DesignStudioContext);
    var config = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.fenceConfig : ctx.config) : props.config;
    var onConfigChange = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.setFenceConfig : ctx.setConfig) : props.onConfigChange;

    var supportsPuppy;
    if (isFence) {
        var fStyle = FENCE_TOOL_STYLES.find(function(s) { return s.id === config.styleId; });
        supportsPuppy = fStyle && fStyle.acc && fStyle.acc.indexOf('pup') !== -1;
    } else {
        var gate = STYLE_FEATURE_GATE[config.styleId] || {};
        supportsPuppy = (gate.options || []).indexOf('pup') !== -1;
    }

    var variants = isFence ? FENCE_PUPPY_VARIANTS : PUPPY_VARIANTS;

    var hoverState = useState(null);
    var popup = hoverState[0];
    var setPopup = hoverState[1];

    if (!supportsPuppy) {
        return (
            <div style={{ textAlign: 'center', color: '#5a6270', fontSize: '15px', fontWeight: 500 }}>
                Puppy pickets are not available for this style. Try Horizon, Vanguard, Haven, Charleston, or Savannah.
            </div>
        );
    }

    var currentPup = isFence ? (config._pupVariant || config.pupType) : (config.accessories && config.accessories.pup);

    // Ultra mutual exclusions: puppy disables res, xlr, mdr, scr, bcr, bbu
    var PUPPY_CONFLICTS = ['res', 'xlr', 'mdr', 'scr', 'bcr', 'bbu'];

    var handlePuppyClick = function(variantId, modelId) {
        if (isFence) {
            var actualModel = modelId || variantId;  // use model override or variant ID
            onConfigChange(function(prev) {
                var isDeselecting = prev.pupType === actualModel && prev._pupVariant === variantId;
                var cleanedAcc = { ...prev.accessories, pup: !isDeselecting };
                // Remove conflicting accessories when enabling puppy
                if (!isDeselecting) {
                    PUPPY_CONFLICTS.forEach(function(key) { delete cleanedAcc[key]; });
                }
                return {
                    ...prev,
                    pupType: isDeselecting ? null : actualModel,
                    _pupVariant: isDeselecting ? null : variantId,
                    accessories: cleanedAcc,
                };
            });
        } else {
            var current = config.accessories || {};
            if (currentPup === variantId) {
                var updated = { ...current };
                delete updated.pup;
                onConfigChange({ ...config, accessories: updated });
            } else {
                // Remove conflicting accessories when enabling puppy
                var cleaned = { ...current, pup: variantId };
                PUPPY_CONFLICTS.forEach(function(key) { delete cleaned[key]; });
                onConfigChange({ ...config, accessories: cleaned });
            }
        }
    };

    var handleMouseEnter = function(src, alt, event) {
        var rect = event.currentTarget.getBoundingClientRect();
        setPopup({
            src: src,
            alt: alt,
            position: {
                top: rect.top,
                left: rect.left,
            }
        });
    };

    var handleMouseLeave = function() {
        setPopup(null);
    };

    return (
        <div className="option-row">
            {variants.map(function(variant) {
                var isActive = currentPup === variant.id;
                return (
                    <div
                        key={variant.id}
                        className={'opt-card' + (isActive ? ' active' : '')}
                        onClick={function() { handlePuppyClick(variant.id, variant.model); }}
                        onMouseEnter={function(e) { handleMouseEnter(variant.thumb, variant.name, e); }}
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="opt-card-img">
                            <img src={variant.thumb} alt={variant.name} />
                        </div>
                        <div className="opt-card-label">{variant.name}</div>
                    </div>
                );
            })}
            {popup && <ImagePopup src={popup.src} alt={popup.alt} position={popup.position} />}
        </div>
    );
};

export default PuppyPicketsTab;
