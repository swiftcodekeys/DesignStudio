import React from 'react';
import { FENCE_STYLES } from './configData';

var STYLE_SLUGS = {
    uaf_200: 'horizon', uaf_201: 'horizon-pro', uaf_250: 'vanguard',
    uab_200: 'haven', uas_100: 'charleston', uas_101: 'charleston-pro',
    uas_150: 'savannah', uas_300: 'cambridge', uas_350: 'lexington',
    uap_100: 'privacy',
};

var BacklinksFooter = function(props) {
    var config = props.config || {};
    var onContactClick = props.onContactClick;
    var style = FENCE_STYLES.find(function(s) { return s.id === config.styleId; });
    var styleName = style ? style.name : 'Fence Styles';
    var styleSlug = STYLE_SLUGS[config.styleId] || 'fencing';

    return (
        <div className="backlinks-bar">
            <div className="backlinks-row1">
                <a href={'https://grandviewfence.com/fencing/' + styleSlug} target="_blank" rel="noopener">Shop {styleName}</a>
                <span className="backlinks-sep">|</span>
                <a href="https://grandviewfence.com/pool-safety" target="_blank" rel="noopener">Pool Safety</a>
                <span className="backlinks-sep">|</span>
                <a href="https://grandviewfence.com/pet-aluminum-fence" target="_blank" rel="noopener">Pet Fence</a>
                <span className="backlinks-sep">|</span>
                <a href="https://grandviewfence.com/residential-commercial" target="_blank" rel="noopener">Residential</a>
                <span className="backlinks-sep">|</span>
                <a href="https://grandviewfence.com/installation-guide" target="_blank" rel="noopener">Installation Guide</a>
                <span className="backlinks-sep">|</span>
                <a href="https://grandviewfence.com/shipping" target="_blank" rel="noopener">Shipping</a>
            </div>
            <div className="backlinks-row2">
                <a href="https://grandviewfence.com/about" target="_blank" rel="noopener" className="backlinks-trust-link">Made in USA</a>
                <span className="backlinks-sep">|</span>
                <span className="backlinks-contact">
                    <a href="tel:+18553362330"><strong>(855) FENCE-30 | (855) 336-2330</strong></a> | <a href="#" onClick={function(e) { e.preventDefault(); if (onContactClick) onContactClick(); }}>sales@grandviewfence.com</a>
                </span>
                <span className="backlinks-sep">|</span>
                <a href="https://grandviewfence.com/warranty" target="_blank" rel="noopener" className="backlinks-trust-link">Lifetime Warranty</a>
            </div>
        </div>
    );
};

export default BacklinksFooter;
