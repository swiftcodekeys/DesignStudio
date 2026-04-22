import React, { useState, useEffect } from 'react';
import { FENCE_STYLES, ARCH_STYLES, POST_CAPS, FINIALS, ACCESSORIES } from './configData';
import { FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';
import { isProductionEmailHost } from './emailWorkerClient';

var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBdmxtSMuNETzERknuA9ZuhZ-KfK9kWCtDiFnVdIBnBqiLAAjGrpMgJmf_DibN6WnVYw/exec';

function buildConfigSummary(config, isFence) {
    var styleList = isFence ? FENCE_TOOL_STYLES : FENCE_STYLES;
    var style = styleList.find(function(s) { return s.id === config.styleId; }) || styleList[0];
    var archObj = ARCH_STYLES.find(function(a) { return a.id === config.arch; });
    var postCapObj = POST_CAPS.find(function(pc) { return pc.id === config.postCap; });
    var finialObj = config.finial ? FINIALS.find(function(f) { return f.id === config.finial; }) : null;
    // Fence config uses finialType instead of finial
    if (!finialObj && config.finialType) {
        finialObj = FINIALS.find(function(f) { return f.id === config.finialType; });
    }
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

    return {
        style: style.name,
        subtitle: style.subtitle,
        color: colorName,
        height: config.height + '"',
        leaf: isFence ? 'N/A' : leafLabel,
        mount: isFence ? 'N/A' : mountLabel,
        arch: archObj ? archObj.name : (isFence ? 'N/A' : 'Standard'),
        postCap: postCapObj ? postCapObj.name : 'None',
        finial: finialObj ? finialObj.name : 'None',
        accessories: accList.length > 0 ? accList.join(', ') : 'None',
        isFence: isFence,
    };
}

var QuoteModal = function(props) {
    var isOpen = props.isOpen;
    var onClose = props.onClose;
    var config = props.config;
    var isFence = props.isFence;
    var onOpenBuilder = props.onOpenBuilder;

    var nameState = useState('');
    var name = nameState[0];
    var setName = nameState[1];

    var emailState = useState('');
    var email = emailState[0];
    var setEmail = emailState[1];

    var phoneState = useState('');
    var phone = phoneState[0];
    var setPhone = phoneState[1];

    var messageState = useState('');
    var message = messageState[0];
    var setMessage = messageState[1];

    var sentState = useState(false);
    var sent = sentState[0];
    var setSent = sentState[1];

    // Close on Escape key
    useEffect(function() {
        if (!isOpen) return;
        function handleKey(e) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKey);
        return function() { document.removeEventListener('keydown', handleKey); };
    }, [isOpen, onClose]);

    // Reset form when opened
    useEffect(function() {
        if (isOpen) {
            setSent(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    var summary = buildConfigSummary(config, isFence);
    var configUrl = window.location.href;

    var summaryLines = [
        'Style: ' + summary.style + ' (' + summary.subtitle + ')',
        'Color: ' + summary.color + ' (ProCoat)',
    ];
    if (isFence) {
        summaryLines.push('Height: ' + summary.height);
    } else {
        summaryLines.push('Size: ' + summary.height + ' ' + summary.leaf + ' Gate, ' + summary.mount);
        summaryLines.push('Arch: ' + summary.arch);
    }
    summaryLines.push('Post Cap: ' + summary.postCap);
    summaryLines.push('Finial: ' + summary.finial);
    summaryLines.push('Accessories: ' + summary.accessories);
    summaryLines.push('');
    summaryLines.push('Config URL: ' + configUrl);
    var summaryText = summaryLines.join('\n');

    var sendingState = useState(false);
    var sending = sendingState[0];
    var setSending = sendingState[1];

    var handleSubmit = function(e) {
        e.preventDefault();
        if (sending) return;
        setSending(true);

        var productType = isFence ? 'Fence' : 'Gate';
        var nameParts = name.trim().split(/\s+/);
        var payload = {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: email.trim(),
            phone: phone.trim(),
            inquiryType: productType + ' Quote',
            specialRequests: [
                message.trim(),
                '--- Configuration ---',
                summaryText,
            ].filter(Boolean).join('\n'),
            source: 'design-studio-quote-modal',
            timestamp: new Date().toISOString(),
            pageUrl: configUrl,
        };

        // Guard against non-prod hosts (dev, preview, tests) firing real
        // emails to Sarah's inbox. See emailWorkerClient.js for rationale.
        if (!isProductionEmailHost()) {
            console.info('[QuoteModal] BLOCKED on non-prod host; submit simulated');
            setSending(false);
            setSent(true);
            return;
        }
        fetch(GAS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
        .then(function() {
            setSending(false);
            setSent(true);
        })
        .catch(function(err) {
            console.error('[QuoteModal] Submit error:', err);
            setSending(false);
            setSent(true); // Still show success. GAS is fire-and-forget, CORS may block response.
        });
    };

    var handleBackdropClick = function(e) {
        if (e.target === e.currentTarget) onClose();
    };

    if (sent) {
        return (
            <div className="quote-modal-backdrop" onClick={handleBackdropClick}>
                <div className="quote-modal">
                    <button className="quote-modal-close" onClick={onClose}>&times;</button>
                    <div className="quote-modal-sent">
                        <div className="quote-modal-sent-icon">&#10003;</div>
                        <h2>Quote Request Received!</h2>
                        <p>We'll email your detailed quote to <strong>{email}</strong> within 1 business day. Need it sooner?</p>
                        <div className="quote-modal-phone">
                            <strong>(855) FENCE-30</strong>
                            <span>(855) 336-2330</span>
                        </div>
                        <p className="quote-modal-email-alt">or email <a href="mailto:sales@grandviewfence.com">sales@grandviewfence.com</a></p>
                        <button className="quote-modal-done-btn" onClick={onClose}>Done</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="quote-modal-backdrop" onClick={handleBackdropClick}>
            <div className="quote-modal">
                <button className="quote-modal-close" onClick={onClose}>&times;</button>
                <div className="quote-modal-header">
                    <h2>Get Your Quote</h2>
                    <p>We'll respond within 1 business day</p>
                </div>

                <div className="quote-modal-config">
                    <div className="quote-modal-config-title">Your Design</div>
                    <div className="quote-modal-config-grid">
                        <span className="qm-label">Style</span>
                        <span className="qm-value">{summary.style}</span>
                        <span className="qm-label">Color</span>
                        <span className="qm-value">{summary.color}</span>
                        {isFence ? (
                            <React.Fragment>
                                <span className="qm-label">Height</span>
                                <span className="qm-value">{summary.height}</span>
                            </React.Fragment>
                        ) : (
                            <React.Fragment>
                                <span className="qm-label">Size</span>
                                <span className="qm-value">{summary.height} {summary.leaf} · {summary.mount}</span>
                                <span className="qm-label">Arch</span>
                                <span className="qm-value">{summary.arch}</span>
                            </React.Fragment>
                        )}
                        {summary.finial !== 'None' && (
                            <React.Fragment>
                                <span className="qm-label">Finial</span>
                                <span className="qm-value">{summary.finial}</span>
                            </React.Fragment>
                        )}
                    </div>
                </div>

                <form className="quote-modal-form" onSubmit={handleSubmit}>
                    <div className="qm-field">
                        <label htmlFor="qm-name">Name *</label>
                        <input id="qm-name" type="text" required value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Your full name" />
                    </div>
                    <div className="qm-field">
                        <label htmlFor="qm-email">Email *</label>
                        <input id="qm-email" type="email" required value={email} onChange={function(e) { setEmail(e.target.value); }} placeholder="you@example.com" />
                    </div>
                    <div className="qm-field">
                        <label htmlFor="qm-phone">Phone</label>
                        <input id="qm-phone" type="tel" value={phone} onChange={function(e) { setPhone(e.target.value); }} placeholder="(555) 123-4567" />
                    </div>
                    <div className="qm-field">
                        <label htmlFor="qm-message">Message</label>
                        <textarea id="qm-message" rows="3" value={message} onChange={function(e) { setMessage(e.target.value); }} placeholder="Tell us about your project..." />
                    </div>
                    <button type="submit" className="quote-modal-submit" disabled={sending}>
                        {sending ? 'Sending...' : 'Send Quote Request \u2192'}
                    </button>
                </form>

                {onOpenBuilder && (
                    <button className="quote-modal-builder-link" onClick={onOpenBuilder}>
                        Or build your quote step by step &rarr;
                    </button>
                )}

                <div className="quote-modal-alt">
                    <span>Prefer to talk?</span>
                    <strong>(855) FENCE-30</strong>
                </div>
            </div>
        </div>
    );
};

export default QuoteModal;
