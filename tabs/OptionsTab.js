import React from 'react';
import { ARCH_STYLES, STYLE_FEATURE_GATE } from '../configData';

var ARCH_THUMBS = {
    e: 'gate_tool/th/th_so_ares.jpg',
    a: 'gate_tool/th/th_so_arar.jpg',
    s: 'gate_tool/th/th_so_arst.jpg',
    r: 'gate_tool/th/th_so_arrv.jpg',
};

var ADDON_DEFS = [
    { id: 'mdr', label: 'Mid Rail' },
    { id: 'res', label: 'Flush Bottom' },
    { id: 'ufr', label: 'Finial Rail' },
];

var OptionsTab = function(props) {
    var config = props.config;
    var onConfigChange = props.onConfigChange;
    var gate = STYLE_FEATURE_GATE[config.styleId] || {};
    var availableArches = (gate.archStyles || []);
    var availableOptions = (gate.options || []);

    var filteredArches = ARCH_STYLES.filter(function(a) {
        return availableArches.indexOf(a.id) !== -1;
    });

    var filteredAddons = ADDON_DEFS.filter(function(addon) {
        return availableOptions.indexOf(addon.id) !== -1;
    });

    var handleArchChange = function(archId) {
        onConfigChange({ ...config, arch: archId });
    };

    var toggleAccessory = function(accId) {
        var current = config.accessories || {};
        onConfigChange({
            ...config,
            accessories: { ...current, [accId]: !current[accId] },
        });
    };

    return (
        <div className="sections-row">
            <div className="section-group">
                <div className="section-title">Arch Style</div>
                <div className="option-row">
                    {filteredArches.map(function(arch) {
                        var isActive = config.arch === arch.id;
                        return (
                            <div
                                key={arch.id}
                                className={'opt-card' + (isActive ? ' active' : '')}
                                onClick={function() { handleArchChange(arch.id); }}
                            >
                                <div className="opt-card-img">
                                    <img src={ARCH_THUMBS[arch.id]} alt={arch.name} />
                                </div>
                                <div className="opt-card-label">{arch.name}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {filteredAddons.length > 0 && (
                <div className="section-group">
                    <div className="section-title">Add-Ons</div>
                    <div className="controls-row">
                        {filteredAddons.map(function(addon) {
                            var isActive = config.accessories && config.accessories[addon.id];
                            return (
                                <div
                                    key={addon.id}
                                    className={'ctrl-btn' + (isActive ? ' active' : '')}
                                    onClick={function() { toggleAccessory(addon.id); }}
                                >
                                    {addon.label}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OptionsTab;
