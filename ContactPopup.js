// ============================================================================
// ContactPopup.js — Contact form modal
// POSTs to Google Apps Script endpoint (GAS_ENDPOINT env var).
// Falls back to phone number if endpoint not configured.
// ============================================================================

import React, { useState } from 'react';

var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBdmxtSMuNETzERknuA9ZuhZ-KfK9kWCtDiFnVdIBnBqiLAAjGrpMgJmf_DibN6WnVYw/exec';

var TOPICS = [
  { value: '', label: 'Select a topic...', disabled: true },
  { value: 'front-yard', label: 'Add a front yard fence' },
  { value: 'back-yard', label: 'Add a backyard fence' },
  { value: 'driveway-gate', label: 'Add a driveway gate' },
  { value: 'get-quote', label: 'Get a quote' },
  { value: 'general', label: 'General question' },
];

var ContactPopup = function(props) {
  var isOpen = props.isOpen;
  var onClose = props.onClose;
  var prefillMessage = props.prefillMessage || '';

  var topicState = useState('');
  var topic = topicState[0];
  var setTopic = topicState[1];

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

  var isValid = topic && name.trim().length >= 2 && email.trim().indexOf('@') > 0 && message.trim().length >= 10;

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

    var nameParts = name.trim().split(/\s+/);
    var payload = {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: email.trim(),
      phone: phone.trim(),
      inquiryType: topic,
      specialRequests: message.trim(),
      source: 'design-studio-contact',
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
    };

    fetch(GAS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
      .then(function() {
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
      <div className="contact-modal" onClick={function(e) { e.stopPropagation(); }}>
        <button className="contact-close" onClick={handleClose}>&times;</button>
        <h2 className="contact-title">Contact Us</h2>
        <p className="contact-subtitle">
          Questions about your project? We&rsquo;ll reply within 1 business day.
        </p>

        {status === 'success' ? (
          <div className="contact-success">
            <div className="contact-success-icon">&#10003;</div>
            <p className="contact-success-msg">Message sent! We&rsquo;ll reply within 1 business day.</p>
            <p className="contact-phone-fallback">
              Or call <strong>(855) FENCE-30</strong> | (855) 336-2330
            </p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-field">
              <label className="contact-label">What can we help you with? <span className="contact-req">*</span></label>
              <select
                className="contact-input contact-select"
                value={topic}
                onChange={function(e) { setTopic(e.target.value); }}
                required
              >
                {TOPICS.map(function(t) {
                  return <option key={t.value} value={t.value} disabled={t.disabled}>{t.label}</option>;
                })}
              </select>
            </div>
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
              <label className="contact-label">Phone <span className="contact-optional">(optional)</span></label>
              <input
                className="contact-input"
                type="tel"
                value={phone}
                onChange={function(e) { setPhone(e.target.value); }}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="contact-field">
              <label className="contact-label">Message <span className="contact-req">*</span></label>
              <textarea
                className="contact-input contact-textarea"
                value={message}
                onChange={function(e) { setMessage(e.target.value); }}
                placeholder="Tell us about your project..."
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
