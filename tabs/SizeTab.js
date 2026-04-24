import React from 'react';
import { HEIGHTS } from '../configData';
import DesignStudioContext from '../DesignStudioContext';

var SizeTab = function(props) {
    var ctx = React.useContext(DesignStudioContext);
    var config = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.fenceConfig : ctx.config) : props.config;
    var onConfigChange = ctx ? ((ctx.activeScene === 'fencing' || ctx.activeScene === 'backyard') ? ctx.setFenceConfig : ctx.setConfig) : props.onConfigChange;

    var update = function(key, value) {
        onConfigChange({ ...config, [key]: value });
    };

    return (
        <div className="sections-row">
            {config.styleId === 'uap_100' ? (
                <div className="section-group">
                    <div className="section-title">Height</div>
                    <div className="controls-row">
                        <div className="ctrl-btn active">48″ (Privacy)</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#8e95a0', marginTop: 8, textAlign: 'center' }}>
                        Additional heights (60″ and 72″) available — request a quote for full options.
                    </div>
                </div>
            ) : (
                <div className="section-group">
                    <div className="section-title">Height</div>
                    <div className="controls-row">
                        {HEIGHTS.map(function(h) {
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
            )}
            {!props.isFence && (
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
            {!props.isFence && (
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
