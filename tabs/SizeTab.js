import React from 'react';
import { HEIGHTS } from '../configData';
import { FENCE_HEIGHTS } from '../fenceConfigData';

var isHavenStyle = function(styleId) {
    return styleId === 'uab_200';
};

var SizeTab = function(props) {
    var config = props.config;
    var onConfigChange = props.onConfigChange;
    var isFence = props.isFence;
    var heightList = isFence ? FENCE_HEIGHTS : HEIGHTS;
    var isHaven = isFence && isHavenStyle(config.styleId);
    // Haven available heights: 48, 54, 60 only (no 72)
    var filteredHeightList = isHaven
        ? heightList.filter(function(h) { return h.id !== '72'; })
        : heightList;

    var update = function(key, value) {
        onConfigChange(function(prev) { return { ...prev, [key]: value }; });
    };

    return (
        <div className="sections-row">
            <div className="section-group">
                <div className="section-title">{isFence ? 'Fence Height' : 'Height'}</div>
                <div className="controls-row">
                    {filteredHeightList.map(function(h) {
                        return (
                            <div
                                key={h.id}
                                className={'ctrl-btn' + (config.height === h.id ? ' active' : '')}
                                onClick={function() { update('height', h.id); }}
                            >
                                {h.label}
                            </div>
                        );
                    })}
                </div>
                {isHaven && (
                    <div className="size-pool-notice">
                        Haven features a flush bottom rail &mdash; required for pool barrier compliance in most jurisdictions.
                        {config.height === '48' && (
                            <span className="size-pool-warning"> At 48", this style may not meet pool barrier height requirements in all jurisdictions. Most codes require a minimum of 48"&ndash;54". Verify your local code before ordering.</span>
                        )}
                    </div>
                )}
            </div>
            {!isFence && (
                <div className="section-group">
                    <div className="section-title">Gate Type</div>
                    <div className="controls-row">
                        <div
                            className={'ctrl-btn' + (config.leaf === '1' ? ' active' : '')}
                            onClick={function() { update('leaf', '1'); }}
                        >
                            Single
                        </div>
                        <div
                            className={'ctrl-btn' + (config.leaf === '2' ? ' active' : '')}
                            onClick={function() { update('leaf', '2'); }}
                        >
                            Double
                        </div>
                    </div>
                </div>
            )}
            {!isFence && (
                <div className="section-group">
                    <div className="section-title">Mount</div>
                    <div className="controls-row">
                        <div
                            className={'ctrl-btn' + (config.mount === 'p' ? ' active' : '')}
                            onClick={function() { update('mount', 'p'); }}
                        >
                            Post
                        </div>
                        <div
                            className={'ctrl-btn' + (config.mount === 'd' ? ' active' : '')}
                            onClick={function() { update('mount', 'd'); }}
                        >
                            Direct
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SizeTab;
