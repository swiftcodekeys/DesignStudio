// EscapeHatchModal.js — Escape Hatch Modal (Task 5)
// Unified "Need help?" / "Save my progress" form reachable from every
// wizard step via the .wizard-escape-help pill or exit-intent trigger.
// Submits to the existing CRM worker with submitAction='help'.

import React, { useState, useRef } from 'react';
import { X, Check, Paperclip } from '@phosphor-icons/react';

var MAX_IMAGE_LONG_EDGE = 1600;      // px
var JPEG_QUALITY = 0.75;
var MAX_OUT_BYTES = 900 * 1024;      // 900KB safety threshold
var MAX_PDF_BYTES = 2 * 1024 * 1024; // 2MB for PDFs
var ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

function formatRefId() {
  return 'GVH-' + Math.floor(100000 + Math.random() * 900000);
}

function compressImage(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var img = new Image();
      img.onload = function() {
        var w = img.width;
        var h = img.height;
        var maxEdge = Math.max(w, h);
        var scale = maxEdge > MAX_IMAGE_LONG_EDGE ? MAX_IMAGE_LONG_EDGE / maxEdge : 1;
        var outW = Math.round(w * scale);
        var outH = Math.round(h * scale);
        var canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, outW, outH);
        try {
          var dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve(dataUrl);
        } catch (e) { reject(e); }
      };
      img.onerror = function() { reject(new Error('Image load failed')); };
      img.src = reader.result;
    };
    reader.onerror = function() { reject(new Error('File read failed')); };
    reader.readAsDataURL(file);
  });
}

function readPdfAsDataUrl(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result); };
    reader.onerror = function() { reject(new Error('File read failed')); };
    reader.readAsDataURL(file);
  });
}

function EscapeHatchModal(props) {
  var isOpen = props.isOpen;
  var trigger = props.trigger;
  var onClose = props.onClose;
  var onSubmit = props.onSubmit;

  var emailState = useState('');
  var email = emailState[0];
  var setEmail = emailState[1];

  var phoneState = useState('');
  var phone = phoneState[0];
  var setPhone = phoneState[1];

  var nameState = useState('');
  var name = nameState[0];
  var setName = nameState[1];

  var noteState = useState('');
  var note = noteState[0];
  var setNote = noteState[1];

  var uploadState = useState(null); // { dataUrl, kind: 'image'|'pdf', name }
  var upload = uploadState[0];
  var setUpload = uploadState[1];

  var uploadErrorState = useState('');
  var uploadError = uploadErrorState[0];
  var setUploadError = uploadErrorState[1];

  var submitErrorState = useState('');
  var submitError = submitErrorState[0];
  var setSubmitError = submitErrorState[1];

  var sendingState = useState(false);
  var sending = sendingState[0];
  var setSending = sendingState[1];

  var successState = useState(null); // { refId }
  var success = successState[0];
  var setSuccess = successState[1];

  var dragOverState = useState(false);
  var dragOver = dragOverState[0];
  var setDragOver = dragOverState[1];

  var fileInputRef = useRef(null);

  if (!isOpen) return null;

  var subhead = trigger === 'exit-intent'
    ? 'Before you go, I can pick up where you left off, or help if you\'re stuck.'
    : 'I respond within one business day.';

  function handleFile(file) {
    setUploadError('');
    if (!file) return;
    if (ACCEPTED_TYPES.indexOf(file.type) < 0) {
      setUploadError('JPG, PNG, or PDF only.');
      return;
    }
    if (file.type === 'application/pdf') {
      if (file.size > MAX_PDF_BYTES) {
        setUploadError('PDF too large. Email it to sales@grandviewfence.com instead.');
        return;
      }
      readPdfAsDataUrl(file).then(function(dataUrl) {
        setUpload({ dataUrl: dataUrl, kind: 'pdf', name: file.name });
      }).catch(function() {
        setUploadError('Could not read PDF. Try another file.');
      });
      return;
    }
    // image
    compressImage(file).then(function(dataUrl) {
      var bytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
      if (bytes > MAX_OUT_BYTES) {
        setUploadError('File too large. Email it to sales@grandviewfence.com instead.');
        return;
      }
      setUpload({ dataUrl: dataUrl, kind: 'image', name: file.name });
    }).catch(function() {
      setUploadError('Could not process image. Try another file.');
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    var file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  }

  function handleBrowse(e) {
    handleFile(e.target.files && e.target.files[0]);
  }

  function clearUpload() {
    setUpload(null);
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSend(e) {
    e.preventDefault();
    setSubmitError('');
    if (!email) return; // native validation handles this, belt+suspenders
    setSending(true);
    var refId = formatRefId();
    var payload = {
      quoteId: refId,
      refId: refId,
      name: name,
      email: email,
      phone: phone,
      helpNote: note,
      helpUploadDataUrl: upload ? upload.dataUrl : null,
      helpUploadKind: upload ? upload.kind : null,
      trigger: trigger || 'pill',
    };
    Promise.resolve(onSubmit(payload)).then(function(result) {
      setSending(false);
      if (result && result.ok) {
        setSuccess({ refId: refId });
        setTimeout(function() { onClose(); }, 4000);
      } else {
        setSubmitError((result && result.error)
          ? 'Couldn\'t send. Please try again or email sales@grandviewfence.com.'
          : 'Couldn\'t send. Please try again or email sales@grandviewfence.com.');
      }
    }).catch(function() {
      setSending(false);
      setSubmitError('Couldn\'t send. Please try again or email sales@grandviewfence.com.');
    });
  }

  return (
    <div className="escape-hatch-overlay" onClick={function(e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="escape-hatch" role="dialog" aria-modal="true">
        <button className="escape-hatch-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {success ? (
          <div className="escape-hatch-success">
            <div className="escape-hatch-success-icon">
              <Check size={28} weight="bold" />
            </div>
            <h3>Thanks, I'll be in touch.</h3>
            <p>I'll follow up within one business day.</p>
            <code>Reference ID: {success.refId}</code>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <h2 className="escape-hatch-title">Stuck? I'll help.</h2>
            <p className="escape-hatch-sub">{subhead}</p>

            <div className="escape-hatch-field">
              <label htmlFor="eh-email">Email *</label>
              <input
                id="eh-email"
                type="email"
                required
                value={email}
                onChange={function(e) { setEmail(e.target.value); }}
                autoComplete="email"
              />
            </div>

            <div className="escape-hatch-field">
              <label htmlFor="eh-phone">Phone (optional)</label>
              <input
                id="eh-phone"
                type="tel"
                value={phone}
                onChange={function(e) { setPhone(e.target.value); }}
                autoComplete="tel"
              />
            </div>

            <div className="escape-hatch-field">
              <label htmlFor="eh-name">Name (optional)</label>
              <input
                id="eh-name"
                type="text"
                value={name}
                onChange={function(e) { setName(e.target.value); }}
                autoComplete="name"
              />
            </div>

            <div className="escape-hatch-field">
              <label htmlFor="eh-note">What's tricky? (optional)</label>
              <textarea
                id="eh-note"
                maxLength={500}
                value={note}
                onChange={function(e) { setNote(e.target.value); }}
                placeholder="Weird yard shape? Sloped hill? Just questions? Drop a yard sketch and I'll get back to you."
              />
            </div>

            <div
              className={'escape-hatch-drop' + (dragOver ? ' drag-over' : '')}
              onClick={function() { if (fileInputRef.current) fileInputRef.current.click(); }}
              onDragOver={function(e) { e.preventDefault(); setDragOver(true); }}
              onDragLeave={function() { setDragOver(false); }}
              onDrop={handleDrop}
            >
              {upload ? (
                upload.kind === 'image' ? (
                  <div className="escape-hatch-drop-thumb">
                    <img src={upload.dataUrl} alt={upload.name} />
                    <button type="button" onClick={function(e) { e.stopPropagation(); clearUpload(); }} aria-label="Remove">×</button>
                  </div>
                ) : (
                  <div>
                    <div className="escape-hatch-drop-pdf">
                      <Paperclip size={14} /> {upload.name}
                    </div>
                    <button type="button" className="escape-hatch-later" style={{ marginTop: 8 }} onClick={function(e) { e.stopPropagation(); clearUpload(); }}>
                      Remove
                    </button>
                  </div>
                )
              ) : (
                <div>
                  <Paperclip size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Drop a sketch or photo here, or click to browse
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={handleBrowse}
              />
            </div>

            {uploadError && <div className="escape-hatch-inline-error">{uploadError}</div>}

            <div className="escape-hatch-actions">
              <button type="button" className="escape-hatch-later" onClick={onClose}>
                Maybe later
              </button>
              <button type="submit" className="escape-hatch-send" disabled={sending}>
                {sending ? 'Sending...' : 'Send my request →'}
              </button>
            </div>

            {submitError && <div className="escape-hatch-error">{submitError}</div>}

            {upload && (
              <div className="escape-hatch-reassure">
                Your current design is attached
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default EscapeHatchModal;
