// ============================================================================
// ContactPopup.js — Contact form popup
// POSTs to Google Apps Script endpoint (GAS_ENDPOINT env var).
// Falls back to phone number if endpoint not configured.
// ============================================================================

import React, { useState } from 'react';

var GAS_ENDPOINT = (typeof process !== 'undefined' && process.env && process.env.GAS_ENDPOINT) || '';

var ContactPopup = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var prefillMessage = props.prefillMessage || '';

  var nameState = useState('');
  var name = nameState[0];
  var setName = nameState[1];

  var emailState = useState('');
  var email = emailState[0];
  var setEmail = emailState[1];

  var phoneState = useState('');
  var phone = phoneState[0];
  var setPhone = phoneState[1];

  var messageState = useState(prefillMessage);
  var message = messageState[0];
  var setMessage = messageState[1];

  var statusState = useState('idle'); // idle | sending | success | error
  var status = statusState[0];
  var setStatus = statusState[1];

  var errorMsgState = useState('');
  var errorMsg = errorMsgState[0];
  var setErrorMsg = errorMsgState[1];

  var cooldownState = useState(false);
  var cooldown = cooldownState[0];
  var setCooldown = cooldownState[1];

  if (!isOpen) return null;

  var isValid = name.trim().length >= 2 && email.trim().indexOf('@') > 0 && message.trim().length >= 10;

  var handleSubmit = function(e) {
    e.preventDefault();
    if (!isValid || status === 'sending' || cooldown) return;

    if (!GAS_ENDPOINT) {
      setStatus('error');
      setErrorMsg('not-configured');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    var payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
      source: 'design-studio-contact',
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    };

    fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json().catch(function() { return { status: 'ok' }; });
      })
      .then(function(data) {
        if (data.status === 'error') {
          throw new Error(data.message || 'Server error');
        }
        setStatus('success');
        setCooldown(true);
        setTimeout(function() { setCooldown(false); }, 30000);
      })
      .catch(function(err) {
        setStatus('error');
        setErrorMsg('send-failed');
        console.error('[ContactPopup] Submit error:', err);
      });
  };

  var handleClose = function() {
    if (status !== 'sending') {
      onClose();
    }
  };

  return (
    <div className="contact-overlay" onClick={handleClose}>
      <div className="contact-popup" onClick={function(e) { e.stopPropagation(); }}>
        <button className="contact-close" onClick={handleClose}>&times;</button>
        <h2 className="contact-title">Contact Us</h2>
        <p className="contact-subtitle">
          Questions about your project? We&rsquo;ll reply within 1 business day.
        </p>

        {status === 'success' ? (
          <div className="contact-success">
            <div className="contact-success-icon">&check;</div>
            <p><strong>Message sent!</strong> We&rsquo;ll reply within 1 business day.</p>
            <p className="contact-phone-fallback">
              Or call <strong>(855) FENCE-30</strong> | (855) 336-2330
            </p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-field">
              <label className="contact-label">Name <span className="contact-req">*</span></label>
              <input
                className="contact-input"
                type="text"
                value={name}
                onChange={function(e) { setName(e.target.value); }}
                placeholder="Your name"
                required
                minLength="2"
              />
            </div>
            <div className="contact-field">
              <label className="contact-label">Email <span className="contact-req">*</span></label>
              <input
                className="contact-input"
                type="email"
                value={email}
                onChange={function(e) { setEmail(e.target.value); }}
                placeholder="you@email.com"
                required
              />
            </div>
            <div className="contact-field">
              <label className="contact-label">Phone</label>
              <input
                className="contact-input"
                type="tel"
                value={phone}
                onChange={function(e) { setPhone(e.target.value); }}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="contact-field">
              <label className="contact-label">
                Tell us about your project <span className="contact-req">*</span>
              </label>
              <textarea
                className="contact-textarea"
                value={message}
                onChange={function(e) { setMessage(e.target.value); }}
                placeholder="Describe your fencing project, timeline, questions..."
                required
                minLength="10"
                rows="4"
              />
            </div>

            {status === 'error' && (
              <div className="contact-error">
                {errorMsg === 'not-configured'
                  ? <span>Contact form is not configured yet. Please call us at <a href="tel:+18553362330">(855) FENCE-30 | (855) 336-2330</a>.</span>
                  : <span>Couldn&rsquo;t send your message. Please try again or call <a href="tel:+18553362330">(855) FENCE-30 | (855) 336-2330</a>.</span>
                }
              </div>
            )}

            <button
              className="contact-submit"
              type="submit"
              disabled={!isValid || status === 'sending' || cooldown}
            >
              {status === 'sending' ? 'Sending...' : cooldown ? 'Sent \u2014 wait 30s' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactPopup;
