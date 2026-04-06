import React from 'react';

var AreaReturnPage = function(props) {
    var area1Config = props.area1Config;
    var onSameSystem = props.onSameSystem;
    var onDifferentSystem = props.onDifferentSystem;
    var onBack = props.onBack;

    var styleName = area1Config ? (area1Config.styleId || 'your fence') : 'your fence';
    var colorName = area1Config && area1Config.color ? area1Config.color.displayName : '';

    return (
        <div className="area-return-page">
            <div className="area-return-content">
                <div className="area-return-progress">
                    <span className="area-return-step done">Area 1: Front Yard &#10003;</span>
                    <span className="area-return-step-divider">&mdash;</span>
                    <span className="area-return-step current">Area 2: Backyard</span>
                </div>

                <h1 className="area-return-title">Now let's do your backyard</h1>
                <p className="area-return-desc">Your front yard design is saved. Would you like the same fence system for the backyard?</p>

                {area1Config && area1Config.snapshotDataUrl && (
                    <div className="area-return-snapshot">
                        <img src={area1Config.snapshotDataUrl} alt="Front yard design" className="area-return-snapshot-img" />
                        <div className="area-return-snapshot-label">Front Yard Design</div>
                    </div>
                )}

                <div className="area-return-options">
                    <button className="area-return-option-btn area-return-same" onClick={onSameSystem}>
                        <strong>Yes, same system</strong>
                        <span>Use the same style, color, and options for the backyard</span>
                    </button>
                    <button className="area-return-option-btn area-return-diff" onClick={onDifferentSystem}>
                        <strong>No, different system</strong>
                        <span>Configure a different fence for the backyard</span>
                    </button>
                </div>

                <button className="area-return-back" onClick={onBack}>
                    &larr; Back to front yard
                </button>
            </div>
        </div>
    );
};

export default AreaReturnPage;
