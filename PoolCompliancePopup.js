import React, { useState } from 'react';

var POOL_COMPLIANT_STYLES = ['uab_200', 'uaf_200', 'uaf_250'];

var PoolCompliancePopup = function(props) {
    var onComplete = props.onComplete; // receives { poolBarrier, poolCompliance }
    var onCancel = props.onCancel;
    var currentStyleId = props.currentStyleId;

    var stepState = useState(1);
    var step = stepState[0];
    var setStep = stepState[1];

    var handleNo = function() {
        onComplete({ poolBarrier: false, poolCompliance: null });
    };

    var handleYes = function() {
        setStep(2);
    };

    var handleCompliance = function(level) {
        onComplete({ poolBarrier: true, poolCompliance: level });
    };

    var isCompliant = POOL_COMPLIANT_STYLES.indexOf(currentStyleId) >= 0;

    return (
        <div className="pool-popup-overlay">
            <div className="pool-popup">
                {step === 1 && (
                    <div className="pool-popup-step">
                        <div className="pool-popup-icon">&#127946;</div>
                        <h2 className="pool-popup-title">Is any part of this fence around a pool?</h2>
                        <p className="pool-popup-desc">Pool barriers have specific safety requirements. We'll make sure your fence meets code.</p>
                        <div className="pool-popup-cards">
                            <button className="pool-popup-card" onClick={handleYes}>
                                <div className="pool-popup-card-title">Yes</div>
                                <div className="pool-popup-card-desc">Part or all of this fence is a pool barrier</div>
                            </button>
                            <button className="pool-popup-card" onClick={handleNo}>
                                <div className="pool-popup-card-title">No</div>
                                <div className="pool-popup-card-desc">No pool on this side of the property</div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="pool-popup-step">
                        <h2 className="pool-popup-title">Does this need to meet pool safety code?</h2>
                        <p className="pool-popup-desc">Most municipalities require BOCA/IRC pool barrier compliance. If you're not sure, we'll apply safe defaults and confirm with you.</p>

                        {!isCompliant && (
                            <div className="pool-popup-warning">
                                Your current style may not be pool compliant. Pool-safe styles include Haven, Horizon, and Vanguard with flush bottom configuration. We'll help you find the right fit.
                            </div>
                        )}

                        <div className="pool-popup-options">
                            <button className="pool-popup-option" onClick={function() { handleCompliance('full'); }}>
                                <strong>Yes, full pool code (BOCA/IRC)</strong>
                                <span>Enforce flush bottom, 48"+ height, self-closing gates, &lt;4" spacing</span>
                            </button>
                            <button className="pool-popup-option" onClick={function() { handleCompliance('unsure'); }}>
                                <strong>I'm not sure</strong>
                                <span>We'll apply safe defaults and Grandview will confirm requirements for your area</span>
                            </button>
                            <button className="pool-popup-option" onClick={function() { handleCompliance('none'); }}>
                                <strong>No, just near a pool</strong>
                                <span>No special requirements needed</span>
                            </button>
                        </div>
                    </div>
                )}

                <button className="pool-popup-cancel" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export { POOL_COMPLIANT_STYLES };
export default PoolCompliancePopup;
