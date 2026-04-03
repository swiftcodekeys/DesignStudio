import React from 'react';
import { FENCE_STYLES } from '../configData';
import { FENCE_STYLES as FENCE_TOOL_STYLES } from '../fenceConfigData';

var STYLE_BADGES = {
    uaf_200: { label: 'Popular', cls: 'b-popular' },
    uaf_201: { label: 'Puppy Ready', cls: 'b-puppy' },
    uaf_250: { label: 'Popular', cls: 'b-popular' },
    uab_200: { label: 'Pool Safe', cls: 'b-pool' },
    uas_100: { label: 'Classic', cls: 'b-classic' },
    uas_101: { label: 'Puppy Ready', cls: 'b-puppy' },
    uas_150: { label: 'Classic', cls: 'b-classic' },
    uas_300: { label: 'Decorative', cls: 'b-classic' },
    uas_350: { label: 'Decorative', cls: 'b-classic' },
    uap_100: { label: 'Privacy', cls: 'b-pool' },
};

var GATE_THUMBS = {
    uaf_200: 'assets/ifence_previews/gate_styles/san_marino_15.png',
    uaf_201: 'assets/ifence_previews/gate_styles/santa_monica_9.png',
    uaf_250: 'assets/ifence_previews/gate_styles/sanibel_12.png',
    uab_200: 'assets/ifence_previews/gate_styles/boca_grande_45.png',
    uas_100: 'assets/ifence_previews/gate_styles/bella_vista_48.png',
    uas_101: 'assets/ifence_previews/gate_styles/charleston_pro.png',
    uas_150: 'assets/ifence_previews/gate_styles/bella_terra_51.png',
};

var FENCE_THUMBS = {
    uaf_200: 'assets/ifence_previews/gate_styles/san_marino_15.png',
    uaf_201: 'assets/ifence_previews/gate_styles/santa_monica_9.png',
    uaf_250: 'assets/ifence_previews/gate_styles/sanibel_12.png',
    uab_200: 'assets/ifence_previews/gate_styles/boca_grande_45.png',
    uas_100: 'assets/ifence_previews/gate_styles/bella_vista_48.png',
    uas_101: 'assets/ifence_previews/gate_styles/charleston_pro.png',
    uas_150: 'assets/ifence_previews/gate_styles/bella_terra_51.png',
    uas_300: 'fence_tool/th/th_st_uas_300.jpg',
    uas_350: 'fence_tool/th/th_st_uas_350.jpg',
    uap_100: 'fence_tool/th/th_prv_2ra.jpg',
};

var StyleTab = function(props) {
    var config = props.config;
    var onConfigChange = props.onConfigChange;
    var isFence = props.isFence;
    var allStyles = isFence ? FENCE_TOOL_STYLES : FENCE_STYLES;
    var styles3D = allStyles.filter(function(s) {
        if (!isFence && (s.isPrivacy || s.category === 'privacy')) return false;
        return s.supports3D || s.renderMode === 'overlay';
    });
    var thumbs = isFence ? FENCE_THUMBS : GATE_THUMBS;

    var handleStyleChange = function(styleId) {
        var style = allStyles.find(function(s) { return s.id === styleId; });
        if (isFence) {
            onConfigChange(function(prev) {
                return {
                    ...prev,
                    styleId: styleId,
                    finialType: style.hasFinials ? 's' : null,
                    accessories: {},
                };
            });
        } else {
            onConfigChange(function(prev) {
                var newAccessories = {};
                if (prev.accessories && prev.accessories.pup) {
                    newAccessories.pup = prev.accessories.pup;
                }
                return {
                    ...prev,
                    styleId: styleId,
                    post: style.postDefault,
                    leaf: prev.leaf,
                    finial: style.hasFinials ? 'fs' : null,
                    accessories: newAccessories,
                };
            });
        }
    };

    return (
        <div className="style-grid">
            {styles3D.map(function(style) {
                var badge = STYLE_BADGES[style.id];
                var isActive = config.styleId === style.id;
                return (
                    <div
                        key={style.id}
                        className={'style-card' + (isActive ? ' active' : '')}
                        onClick={function() { handleStyleChange(style.id); }}
                    >
                        <div className="style-card-img">
                            <img
                                src={thumbs[style.id]}
                                alt={style.name}
                                style={{}}
                            />
                        </div>
                        <div className="style-card-info">
                            <div className="style-card-name">{style.name}</div>
                            <div className="style-card-sub">{style.subtitle}</div>
                        </div>
                        {badge && (
                            <div className={'card-badge ' + badge.cls}>{badge.label}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default StyleTab;
