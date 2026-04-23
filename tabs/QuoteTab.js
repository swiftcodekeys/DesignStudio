import React from 'react';
import { FENCE_STYLES, ARCH_STYLES, POST_CAPS, FINIALS, ACCESSORIES } from '../configData';

var QuoteTab = function(props) {
    var config = props.config;
    var onGetQuote = props.onGetQuote;
    var activeScene = props.activeScene;
    var onSceneChange = props.onSceneChange;
    var style = FENCE_STYLES.find(function(s) { return s.id === config.styleId; }) || FENCE_STYLES[0];
    var archObj = ARCH_STYLES.find(function(a) { return a.id === config.arch; });
    var archName = archObj ? archObj.name : 'Standard';

    var postCapObj = POST_CAPS.find(function(pc) { return pc.id === config.postCap; });
    var postCapName = postCapObj ? postCapObj.name : 'None';

    var finialObj = config.finial ? FINIALS.find(function(f) { return f.id === config.finial; }) : null;
    var finialName = finialObj ? finialObj.name : 'None';

    var colorName = config.color ? config.color.displayName : 'Black';
    var leafLabel = config.leaf === '1' ? 'Single' : 'Double';
    var mountLabel = config.mount === 'd' ? 'Direct Mount' : 'Post Mount';

    var accList = [];
    var acc = config.accessories || {};
    Object.keys(acc).forEach(function(key) {
        if (acc[key] && ACCESSORIES[key]) {
            accList.push(ACCESSORIES[key].name);
        }
    });
    var accDisplay = accList.length > 0 ? accList.join(', ') : 'None';

    var isFenceScene = activeScene === 'fencing' || activeScene === 'backyard';

    var renderCTAs = function() {
        if (activeScene === 'fencing') {
            return (
                <div className="quote-cta-stack">
                    <div className="quote-cta-row">
                        <button className="quote-btn-secondary" onClick={function() { if (onSceneChange) onSceneChange('gates'); }}>Add Driveway Gate</button>
                        <button className="quote-btn-secondary" onClick={function() { if (onSceneChange) onSceneChange('backyard'); }}>Add Backyard Fence</button>
                        <button className="quote-btn-primary" onClick={function() { if (onSceneChange) onSceneChange('draw'); }}>Get Instant Quote</button>
                    </div>
                    <div className="quote-cta-row">
                        <button className="quote-btn-tertiary" onClick={onGetQuote}>Talk to an Expert</button>
                    </div>
                </div>
            );
        }
        if (activeScene === 'backyard') {
            return (
                <div className="quote-cta-stack">
                    <div className="quote-cta-row">
                        <button className="quote-btn-secondary" onClick={function() { if (onSceneChange) onSceneChange('gates'); }}>Add Driveway Gate</button>
                        <button className="quote-btn-primary" onClick={function() { if (onSceneChange) onSceneChange('draw'); }}>Get Instant Quote</button>
                    </div>
                    <div className="quote-cta-row">
                        <button className="quote-btn-tertiary" onClick={onGetQuote}>Talk to an Expert</button>
                    </div>
                </div>
            );
        }
        // Gate tab CTAs
        return (
            <div className="quote-cta-stack">
                <div className="quote-cta-row">
                    <button className="quote-btn-measure" onClick={function() { if (onSceneChange) onSceneChange('draw'); }}>Measure My Property</button>
                    <button className="quote-btn-primary" onClick={onGetQuote}>Get Instant Quote</button>
                </div>
                <div className="quote-cta-row">
                    <button className="quote-btn-tertiary" onClick={onGetQuote}>Talk to an Expert</button>
                </div>
            </div>
        );
    };

    return (
        <div className="quote-layout-compact">
            <p className="quote-intro">Your configuration carries over to your quote. Pick your style, color, height, and options, then get an instant estimate or request a custom quote.</p>
            <div className="quote-summary-compact">
                <div className="quote-row"><span className="ql">Style</span><span className="qv">{style.name}</span></div>
                <div className="quote-row"><span className="ql">Color</span><span className="qv">{colorName}</span></div>
                {!isFenceScene && (
                    <div className="quote-row"><span className="ql">Size</span><span className="qv">{config.height}" {leafLabel} | {mountLabel}</span></div>
                )}
                {isFenceScene && (
                    <div className="quote-row"><span className="ql">Height</span><span className="qv">{config.height}"</span></div>
                )}
                {!isFenceScene && (
                    <div className="quote-row"><span className="ql">Arch</span><span className="qv">{archName}</span></div>
                )}
                <div className="quote-row"><span className="ql">Details</span><span className="qv">{postCapName} | {finialName}</span></div>
                {accList.length > 0 && (
                    <div className="quote-row"><span className="ql">Extras</span><span className="qv">{accDisplay}</span></div>
                )}
            </div>
            {renderCTAs()}
            <div className="quote-contact-compact">
                <a href="tel:+18553362330">(855) FENCE-30 | (855) 336-2330</a>
                <br />
                <a href="#" onClick={function(e) { e.preventDefault(); if (onGetQuote) onGetQuote(); }}>sales@grandviewfence.com</a>
            </div>
        </div>
    );
};

export default QuoteTab;
