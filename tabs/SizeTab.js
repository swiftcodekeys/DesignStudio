import React from 'react';
import { HEIGHTS } from '../configData';
import { FENCE_HEIGHTS } from '../fenceConfigData';

var SizeTab = function(props) {
    var config = props.config;
    var onConfigChange = props.onConfigChange;
    var isFence = props.isFence;
    var heightList = isFence ? FENCE_HEIGHTS : HEIGHTS;

    var update = function(key, value) {
        onConfigChange(function(prev) { return { ...prev, [key]: value }; });
    };

    return (
        <div className="sections-row">
            <div className="section-group">
                <div className="section-title">{isFence ? 'Fence Height' : 'Height'}</div>
                <div className="controls-row">
                    {heightList.map(function(h) {
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
