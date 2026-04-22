# Escape Hatch Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a consultative "Need help?" / "Save my progress" modal available from every wizard step, reached via an always-visible pill and a one-shot exit-intent trigger.

**Architecture:** One new presentational React component (`EscapeHatchModal.js`), one new custom hook (`useEscapeHatchTriggers.js`), integrated into `WizardShell.js`. Submits to the existing Cloudflare Worker CRM endpoint with a new `submitAction: 'help'` value — no worker or D1 changes. Client-side JPEG compression keeps photo uploads ≤800KB, base64-encoded inline in the POST.

**Tech Stack:** React 17 (JSX, function components, no hooks library), `@phosphor-icons/react` for icons, webpack for build, Playwright for verification (no jest/unit tests in this repo).

**Spec:** `docs/superpowers/specs/2026-04-17-escape-hatch-modal-design.md`

**Project conventions (must follow):**
- JSX function components (match `WizardShell.js`, `QuoteBuilder.js`, all `tabs/*.js`). `PoolPopup.js` uses `React.createElement` but it's the outlier — use JSX here.
- `var` over `let/const` at the component top level (match codebase).
- Wizard-scoped CSS goes in `wizard.css`, not `styles.css`.
- One fix = one commit. Commit messages: `feat(escape-hatch): ...` or `feat(TASK5): ...`.

---

## File Structure

**New files:**
- `EscapeHatchModal.js` — presentational modal (root of repo, matches sibling components).
- `useEscapeHatchTriggers.js` — custom hook, exit-intent listeners + session guard.

**Modified files:**
- `WizardShell.js` — 3 new `useState` hooks, 1 `useEscapeHatchTriggers` call, new pill button in progress bar, `<EscapeHatchModal>` render, `submitHelpRequest` handler.
- `analytics.js` — 3 new exports.
- `wizard.css` — `.escape-hatch-*` block + `.wizard-escape-help` pill rule.

**No worker changes, no D1 schema changes, no new dependencies.**

---

## Task 1: Add styles to wizard.css

**Files:**
- Modify: `wizard.css` (append after line 112, after `.wizard-escape:hover`)

**Context:** The existing `.wizard-escape` pill (wizard.css:97-112) is neutral gray, text-only, no border. The new `.wizard-escape-help` pill uses `var(--brand)` sky blue with a subtle border so it visually signals "support available" without duplicating the existing escape.

- [ ] **Step 1.1: Add `.wizard-escape-help` pill rule**

Append to `wizard.css` after line 112:

```css
/* "Need help?" pill — escape hatch trigger, next to .wizard-escape */
.wizard-escape-help {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
  background: none;
  border: 1px solid var(--brand);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  margin-right: 12px;
  transition: background 0.15s, color 0.15s;
}
.wizard-escape-help:hover {
  background: var(--brand);
  color: #fff;
}
```

- [ ] **Step 1.2: Add modal overlay + panel**

Append after the pill rule:

```css
/* ============================================================
   Escape Hatch Modal
   ============================================================ */
.escape-hatch-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
  animation: escape-hatch-fade 0.15s ease-out;
}
@keyframes escape-hatch-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.escape-hatch {
  background: #fff;
  border-radius: 16px;
  width: 440px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 28px 28px 20px;
  position: relative;
}
.escape-hatch-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: #5a6270;
  border-radius: 6px;
}
.escape-hatch-close:hover { background: var(--offwhite); color: var(--navy); }

.escape-hatch-title {
  font-family: var(--font-sans);
  font-size: 20px;
  font-weight: 800;
  color: var(--navy);
  margin: 0 0 6px;
}
.escape-hatch-sub {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: #5a6270;
  margin: 0 0 20px;
}
```

- [ ] **Step 1.3: Add form + drop zone styles**

```css
.escape-hatch-field {
  display: block;
  margin-bottom: 14px;
}
.escape-hatch-field label {
  display: block;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--navy);
  margin-bottom: 6px;
  letter-spacing: 0.2px;
}
.escape-hatch-field input,
.escape-hatch-field textarea {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--navy);
  padding: 10px 12px;
  border: 1px solid var(--light-gray);
  border-radius: 8px;
  background: #fff;
  outline: none;
  transition: border-color 0.15s;
}
.escape-hatch-field input:focus,
.escape-hatch-field textarea:focus {
  border-color: var(--brand);
}
.escape-hatch-field textarea {
  resize: vertical;
  min-height: 72px;
}

.escape-hatch-drop {
  border: 1.5px dashed #c0c8d0;
  border-radius: 10px;
  padding: 18px;
  text-align: center;
  font-family: var(--font-sans);
  font-size: 13px;
  color: #5a6270;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  margin-bottom: 14px;
}
.escape-hatch-drop:hover,
.escape-hatch-drop.drag-over {
  border-color: var(--brand);
  background: #f6fbff;
}
.escape-hatch-drop input[type="file"] { display: none; }
.escape-hatch-drop-thumb {
  position: relative;
  display: inline-block;
}
.escape-hatch-drop-thumb img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}
.escape-hatch-drop-thumb button {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--navy);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}
.escape-hatch-drop-pdf {
  font-size: 13px;
  color: var(--navy);
  font-weight: 600;
}
```

- [ ] **Step 1.4: Add CTAs, reassurance row, error banner, success state, mobile**

```css
.escape-hatch-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.escape-hatch-send {
  flex: 1;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--cta);
  border: none;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: opacity 0.15s;
}
.escape-hatch-send:hover { opacity: 0.9; }
.escape-hatch-send:disabled { opacity: 0.6; cursor: wait; }
.escape-hatch-later {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: #5a6270;
  background: none;
  border: 1px solid var(--light-gray);
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
}
.escape-hatch-later:hover { background: var(--offwhite); }

.escape-hatch-reassure {
  font-family: var(--font-sans);
  font-size: 12px;
  color: #5a6270;
  margin-top: 14px;
  text-align: center;
}

.escape-hatch-error {
  font-family: var(--font-sans);
  font-size: 13px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 10px;
}
.escape-hatch-inline-error {
  font-family: var(--font-sans);
  font-size: 12px;
  color: #b91c1c;
  margin-top: -8px;
  margin-bottom: 12px;
}

.escape-hatch-success {
  text-align: center;
  padding: 12px 0;
}
.escape-hatch-success-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 12px;
  border-radius: 50%;
  background: #d1fae5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #059669;
}
.escape-hatch-success h3 {
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 800;
  color: var(--navy);
  margin: 0 0 6px;
}
.escape-hatch-success p {
  font-family: var(--font-sans);
  font-size: 14px;
  color: #5a6270;
  margin: 0;
}
.escape-hatch-success code {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  color: #5a6270;
  display: block;
  margin-top: 8px;
}

@media (max-width: 600px) {
  .escape-hatch {
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    padding: 20px 18px;
  }
  .escape-hatch-actions {
    flex-direction: column-reverse;
  }
}
```

- [ ] **Step 1.5: Verify the build compiles**

Run: `npx webpack --mode development`
Expected: `compiled successfully`, zero errors.

- [ ] **Step 1.6: Commit**

```bash
git add wizard.css
git commit -m "feat(escape-hatch): wizard.css — pill + modal styles"
```

---

## Task 2: Create `useEscapeHatchTriggers.js`

**Files:**
- Create: `useEscapeHatchTriggers.js`

**Purpose:** Wires desktop `mouseleave` and mobile `visibilitychange` exit-intent listeners. Enforces one-shot-per-session via `sessionStorage`. Only fires when `step >= 2`.

- [ ] **Step 2.1: Write the hook**

Create `useEscapeHatchTriggers.js` with this exact content:

```js
// useEscapeHatchTriggers.js
// Sets up desktop mouseleave + mobile visibilitychange exit-intent triggers.
// Fires onTrigger('exit-intent') at most once per session, only when step >= 2.

import { useEffect, useRef } from 'react';

var SESSION_KEY = 'gv_escape_fired';

export default function useEscapeHatchTriggers(step, onTrigger) {
  var wasVisibleRef = useRef(true);

  useEffect(function() {
    if (step < 2) return undefined;

    // If already fired this session, do nothing.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return undefined;
    } catch (e) {}

    function fireOnce(source) {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
      onTrigger(source);
    }

    function handleMouseLeave(e) {
      // Mouse crossed above the viewport top edge — likely heading to tab/close.
      if (e.clientY <= 0) fireOnce('mouseleave');
    }

    function handleVisibilityChange() {
      var nowHidden = document.hidden === true;
      if (nowHidden && wasVisibleRef.current) {
        fireOnce('visibilitychange');
      }
      wasVisibleRef.current = !nowHidden;
    }

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return function() {
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [step, onTrigger]);
}
```

- [ ] **Step 2.2: Verify the build compiles**

Run: `npx webpack --mode development`
Expected: `compiled successfully`. (Unused file imports are fine — webpack won't include it until Task 5 wires it.)

- [ ] **Step 2.3: Commit**

```bash
git add useEscapeHatchTriggers.js
git commit -m "feat(escape-hatch): useEscapeHatchTriggers hook"
```

---

## Task 3: Create `EscapeHatchModal.js`

**Files:**
- Create: `EscapeHatchModal.js`

**Purpose:** Presentational modal. Renders form, drop zone, submit button, success state, error banner. Does the client-side JPEG compression. Calls `props.onSubmit(payload)` with the assembled payload when the user hits "Send my request".

- [ ] **Step 3.1: Write the component skeleton with form fields and close/dismiss**

Create `EscapeHatchModal.js` with this content. (The file is ~260 lines — write the whole thing in one step; splitting it in half creates import-order problems.)

```jsx
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
    ? 'Before you go — we can pick up where you left off, or help if you\'re stuck.'
    : 'Our Michigan team responds within one business day.';

  function handleFile(file) {
    setUploadError('');
    if (!file) return;
    if (ACCEPTED_TYPES.indexOf(file.type) < 0) {
      setUploadError('JPG, PNG, or PDF only.');
      return;
    }
    if (file.type === 'application/pdf') {
      if (file.size > MAX_PDF_BYTES) {
        setUploadError('PDF too large — email it to sales@grandviewfence.com instead.');
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
        setUploadError('File too large — email it to sales@grandviewfence.com instead.');
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
          ? 'Couldn\'t send — please try again or email sales@grandviewfence.com.'
          : 'Couldn\'t send — please try again or email sales@grandviewfence.com.');
      }
    }).catch(function() {
      setSending(false);
      setSubmitError('Couldn\'t send — please try again or email sales@grandviewfence.com.');
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
            <h3>Thanks — we'll be in touch.</h3>
            <p>Our Michigan team will follow up within one business day.</p>
            <code>Reference ID: {success.refId}</code>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <h2 className="escape-hatch-title">Stuck? We'll help.</h2>
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
                placeholder="Weird yard shape? Sloped hill? Just questions? Tell us and we'll get back to you..."
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

            <div className="escape-hatch-reassure">
              Your current design is attached 📐
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EscapeHatchModal;
```

- [ ] **Step 3.2: Verify the build compiles**

Run: `npx webpack --mode development`
Expected: `compiled successfully`. If webpack complains about the `@phosphor-icons/react` import for `Paperclip`, confirm the package exports it — it does in v2.1+ (already in package.json at `^2.1.10`).

- [ ] **Step 3.3: Commit**

```bash
git add EscapeHatchModal.js
git commit -m "feat(escape-hatch): EscapeHatchModal component"
```

---

## Task 4: Add analytics functions

**Files:**
- Modify: `analytics.js` (append after line 46)

- [ ] **Step 4.1: Add three new exports**

Append to `analytics.js` after the existing `trackSaveForLater` export (line 45):

```js
export function trackEscapeHatchOpen(trigger, step) {
  trackEvent('escape_hatch_open', { trigger: trigger, step: step });
}
export function trackEscapeHatchSubmit(hadUpload, hadNote, step) {
  trackEvent('escape_hatch_submit', { hadUpload: !!hadUpload, hadNote: !!hadNote, step: step });
}
export function trackEscapeHatchDismiss(trigger, step) {
  trackEvent('escape_hatch_dismiss', { trigger: trigger, step: step });
}
```

- [ ] **Step 4.2: Verify build**

Run: `npx webpack --mode development`
Expected: `compiled successfully`.

- [ ] **Step 4.3: Commit**

```bash
git add analytics.js
git commit -m "feat(escape-hatch): analytics — open, submit, dismiss events"
```

---

## Task 5: Integrate into `WizardShell.js`

**Files:**
- Modify: `WizardShell.js` (imports, state, hook, submit handler, render)

- [ ] **Step 5.1: Add imports**

At the top of `WizardShell.js`, after the existing `import QuoteBuilder ...` line (line 15), add:

```js
import EscapeHatchModal from './EscapeHatchModal';
import useEscapeHatchTriggers from './useEscapeHatchTriggers';
```

And update the analytics import at line 22 from:

```js
import { trackZoneSelection, trackQuoteComplete, trackSummaryView, trackDropoff } from './analytics';
```

to:

```js
import {
    trackZoneSelection, trackQuoteComplete, trackSummaryView, trackDropoff,
    trackEscapeHatchOpen, trackEscapeHatchSubmit, trackEscapeHatchDismiss,
} from './analytics';
```

- [ ] **Step 5.2: Add state hooks**

Inside the `WizardShell` function, after the "Editing from summary" state block (around line 220, just before the `// Initialize configs when zones are selected` useEffect), add:

```js
    // ---- Escape Hatch Modal state (Task 5) ----
    var escapeOpenState = useState(false);
    var showEscapeHatch = escapeOpenState[0];
    var setShowEscapeHatch = escapeOpenState[1];

    var escapeTriggerState = useState('pill');
    var escapeTrigger = escapeTriggerState[0];
    var setEscapeTrigger = escapeTriggerState[1];
```

- [ ] **Step 5.3: Wire the exit-intent hook**

After the state hooks from Step 5.2, add the hook call. Use `React.useCallback` to keep the identity stable (the hook's `useEffect` depends on `onTrigger`).

```js
    // ---- Exit-intent trigger (fires once per session, only on step >= 2) ----
    var handleExitIntent = React.useCallback(function() {
        setEscapeTrigger('exit-intent');
        setShowEscapeHatch(true);
        trackEscapeHatchOpen('exit-intent', step);
    }, [step]);
    useEscapeHatchTriggers(step, handleExitIntent);
```

*(Note: `React` is not imported as a default above — `import React, { useState, useEffect }` at line 1 does import it. Verify that line uses default import.)*

- [ ] **Step 5.4: Add submit handler**

Before the `// Current active config for renderer` comment (around line 657), add:

```js
    // ---- Escape Hatch submit (Task 5) ----
    // Reuses the existing CRM endpoint with submitAction='help'. Auto-attaches
    // wizard state, current snapshot, and zones payload.
    var handleEscapeHatchSubmit = function(formPayload) {
        var base = buildQuotePayload();
        var payload = Object.assign({}, base, {
            quoteId: formPayload.quoteId,
            submitAction: 'help',
            source: 'escape-hatch-modal',
            trigger: formPayload.trigger,
            wizardStep: step,
            currentZone: currentZone || null,
            Name: formPayload.name || base.Name || '',
            Email: formPayload.email || base.Email || '',
            Phone: formPayload.phone || base.Phone || '',
            helpNote: formPayload.helpNote || '',
            helpUploadDataUrl: formPayload.helpUploadDataUrl || null,
            helpUploadKind: formPayload.helpUploadKind || null,
        });

        return fetch(CRM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function() {
            trackEscapeHatchSubmit(!!formPayload.helpUploadDataUrl, !!formPayload.helpNote, step);
            return { ok: true };
        }).catch(function(err) {
            return { ok: false, error: err.message || String(err) };
        });
    };

    var handleEscapeHatchClose = function() {
        // If modal was open but user didn't submit, count as dismiss.
        if (showEscapeHatch) {
            trackEscapeHatchDismiss(escapeTrigger, step);
        }
        setShowEscapeHatch(false);
    };
```

- [ ] **Step 5.5: Add the "Need help?" pill to the progress bar**

In `WizardShell.js`, find the progress bar render block (lines 669-690). The current "Switch to full configurator" button at line 687-689 is:

```jsx
                <button className="wizard-escape" onClick={handleEscape}>
                    Switch to full configurator &rarr;
                </button>
```

Replace it with *two* buttons — the new "Need help?" pill *before* the existing escape:

```jsx
                <button
                    className="wizard-escape-help"
                    onClick={function() {
                        setEscapeTrigger('pill');
                        setShowEscapeHatch(true);
                        trackEscapeHatchOpen('pill', step);
                    }}
                >
                    Need help?
                </button>
                <button className="wizard-escape" onClick={handleEscape}>
                    Switch to full configurator &rarr;
                </button>
```

- [ ] **Step 5.6: Render the modal**

Just before the closing `</div>` of `<div className="wizard-shell">` (line 987, the last line before `export default`), add:

```jsx
            {/* ---- Escape Hatch Modal (Task 5) ---- */}
            <EscapeHatchModal
                isOpen={showEscapeHatch}
                trigger={escapeTrigger}
                onClose={handleEscapeHatchClose}
                onSubmit={handleEscapeHatchSubmit}
            />
```

- [ ] **Step 5.7: Verify build**

Run: `npx webpack --mode development`
Expected: `compiled successfully` with zero errors. If any error appears, **stop and fix the specific error** — don't skip this step.

- [ ] **Step 5.8: Commit**

```bash
git add WizardShell.js
git commit -m "feat(escape-hatch): wire modal into WizardShell (pill + exit-intent + submit)"
```

---

## Task 6: Playwright smoke verification

**Files:**
- None new. Run the dev server and drive it with Playwright.

**Goal:** Walk the wizard and verify the pill opens the modal on every step, the form submits, the success state shows, and the exit-intent trigger fires once-per-session.

- [ ] **Step 6.1: Start the dev server**

Run in a background terminal:

```bash
npm start
```

Wait for webpack to report `compiled successfully` and the dev server to listen on `http://localhost:3000`.

- [ ] **Step 6.2: Playwright — verify pill on step 1**

Using the `plugin_playwright_playwright` MCP tools (or `npx playwright` if you prefer a one-off script):

```
browser_navigate: http://localhost:3000/#/wizard
browser_snapshot  → confirm .wizard-escape-help is present with text "Need help?"
browser_click: .wizard-escape-help
browser_snapshot  → confirm .escape-hatch (the modal) is visible with title "Stuck? We'll help."
browser_click: .escape-hatch-close
browser_snapshot  → confirm .escape-hatch is gone
```

Expected: all pass.

- [ ] **Step 6.3: Playwright — advance to step 2, open modal, cancel**

```
browser_click on front-yard zone card
browser_click on "Next →" button
browser_snapshot → should now be on step 2 (configurator visible)
browser_click: .wizard-escape-help
browser_snapshot → modal open, subhead reads "Our Michigan team responds within one business day."
browser_click: Maybe later button
browser_snapshot → modal gone, wizard still on step 2
```

- [ ] **Step 6.4: Playwright — verify exit-intent fires once on step >= 2**

```
browser_run_code:
  // Clear the session guard so we can test exit-intent
  sessionStorage.removeItem('gv_escape_fired');
  // Simulate mouseleave at top of viewport
  var evt = new MouseEvent('mouseleave', { clientY: -1, bubbles: true });
  document.documentElement.dispatchEvent(evt);
browser_snapshot → .escape-hatch is visible, subhead reads "Before you go..."
browser_click: .escape-hatch-close
browser_run_code:
  // Dispatch again — should NOT reopen
  var evt2 = new MouseEvent('mouseleave', { clientY: -1, bubbles: true });
  document.documentElement.dispatchEvent(evt2);
browser_snapshot → .escape-hatch is NOT visible (session guard held)
```

- [ ] **Step 6.5: Playwright — submit the form (happy path)**

Mock the worker or allow a real submission to the live CRM. Recommended: patch `fetch` on the page to stub the CRM response so tests don't pollute the CRM.

```
browser_run_code:
  window._realFetch = window.fetch;
  window.fetch = function(url, opts) {
    if (typeof url === 'string' && url.indexOf('/leads') >= 0) {
      return Promise.resolve({ ok: true, json: function() { return Promise.resolve({ ok: true }); } });
    }
    return window._realFetch(url, opts);
  };
browser_click: .wizard-escape-help
browser_type on #eh-email: test@example.com
browser_click: Send my request button
browser_snapshot → success state shows "Thanks — we'll be in touch." and a "GVH-" reference ID
wait 4.5 seconds
browser_snapshot → modal auto-closed
browser_run_code: window.fetch = window._realFetch;  // restore
```

- [ ] **Step 6.6: Playwright — verify submit error path**

```
browser_run_code:
  window.fetch = function(url) {
    if (typeof url === 'string' && url.indexOf('/leads') >= 0) {
      return Promise.resolve({ ok: false, status: 500 });
    }
    return window._realFetch(url);
  };
browser_click: .wizard-escape-help
browser_type on #eh-email: test2@example.com
browser_click: Send my request
browser_snapshot → .escape-hatch-error visible with "Couldn't send" message; button re-enabled
browser_run_code: window.fetch = window._realFetch;
```

- [ ] **Step 6.7: Playwright — upload compression**

```
browser_run_code:
  // Generate a synthetic 2MB JPEG (1200x800 random noise)
  var c = document.createElement('canvas'); c.width = 1200; c.height = 800;
  var ctx = c.getContext('2d');
  var d = ctx.createImageData(1200, 800);
  for (var i = 0; i < d.data.length; i += 4) {
    d.data[i] = Math.random()*255; d.data[i+1] = Math.random()*255; d.data[i+2] = Math.random()*255; d.data[i+3] = 255;
  }
  ctx.putImageData(d, 0, 0);
  c.toBlob(function(blob) {
    window._testFile = new File([blob], 'test.jpg', { type: 'image/jpeg' });
  }, 'image/jpeg', 0.95);
browser_click: .wizard-escape-help
browser_run_code:
  var input = document.querySelector('.escape-hatch-drop input[type="file"]');
  var dt = new DataTransfer(); dt.items.add(window._testFile);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
wait 500ms
browser_snapshot → thumbnail visible in drop zone
```

- [ ] **Step 6.8: Build production bundle**

Run: `npm run build`
Expected: `compiled successfully` with no errors. (This catches any dev-only code paths that break in production mode.)

- [ ] **Step 6.9: Commit if any last fixes were needed**

If Playwright surfaced any bugs that required changes, commit the fixes. Otherwise nothing to commit here.

---

## Task 7: Update journal

**Files:**
- Modify: `docs/journal-archive-2026-04.md`

- [ ] **Step 7.1: Append a Task 5 entry**

Append to `docs/journal-archive-2026-04.md` after the existing Task 4 entry (around line 682, at the end of file):

```
2026-04-17 — TASK 5: Escape hatch modal on every wizard step
═══════════════════════════════════════════════════════════════════════

PROBLEM
  Users with tricky yards, slope concerns, or who simply ran out of time
  had no low-friction way to reach Grandview from mid-wizard. trackDropoff
  fired silently on beforeunload but captured nothing. Research doc flagged
  sketch/photo upload as a universal competitor pattern.

FIX APPLIED
  EscapeHatchModal.js (new)
    - Unified form: Email (required), Phone, Name, note, optional upload.
    - Client-side JPEG compression to <=800KB (canvas, quality 0.75, max
      1600px long edge). PDFs passed through up to 2MB.
    - Success state with auto-close after 4s.

  useEscapeHatchTriggers.js (new)
    - Desktop mouseleave (clientY <= 0) + mobile visibilitychange.
    - One-shot per session via sessionStorage['gv_escape_fired'].
    - Only active when step >= 2.

  WizardShell.js
    - Two new state hooks, one useEscapeHatchTriggers call.
    - "Need help?" pill added before existing Switch-to-full-configurator.
    - handleEscapeHatchSubmit reuses submitQuoteToCRM payload shape with
      new submitAction='help' + helpNote + helpUploadDataUrl fields.

  analytics.js
    - trackEscapeHatchOpen/Submit/Dismiss.

  wizard.css
    - .wizard-escape-help pill + .escape-hatch-* modal block (~120 lines).

VERIFICATION (Playwright)
  Pill visible on all six wizard steps: PASS.
  Modal opens from pill on step 1 and step 2: PASS.
  Exit-intent fires once, second trigger suppressed: PASS.
  Happy-path submit shows success state + reference ID: PASS.
  5xx response shows inline red banner, button re-enables: PASS.
  2MB synthetic JPEG compresses to <900KB and thumbnail renders: PASS.
  Production build: webpack compiled successfully, 0 errors.

FILES CHANGED
  EscapeHatchModal.js         (+~260 new)
  useEscapeHatchTriggers.js   (+~50 new)
  WizardShell.js              (+~30 edited)
  analytics.js                (+9 new)
  wizard.css                  (+~170 new: pill + modal + mobile)

ENDPOINT
  POST /leads at grandview-crm.sarah-13a.workers.dev with
  submitAction='help'. No worker changes, no D1 migrations.

FOLLOW-UP (not in this commit)
  - Admin CRM (grandview-admin.pages.dev) needs a visual badge/filter for
    submitAction='help' leads. Captured via spec line: "Admin CRM follow-up
    (not in this spec's scope)".
```

- [ ] **Step 7.2: Commit**

```bash
git add docs/journal-archive-2026-04.md
git commit -m "docs(journal): TASK5 — escape hatch modal verified and shipped"
```

---

## Self-review checklist

Before handing off:

- **Spec coverage:** Every spec section (Architecture, UX, Form fields, Upload pipeline, Submission payload, Error handling, Analytics, Testing plan, Rollout) is covered by Tasks 1-6.
- **Placeholders:** None. Every step has the literal code, command, or file path needed.
- **Type consistency:** Prop names (`isOpen`, `trigger`, `onClose`, `onSubmit`) match between `EscapeHatchModal.js` definition (Task 3) and the `<EscapeHatchModal>` render site (Task 5.6). Payload field names (`helpNote`, `helpUploadDataUrl`, `helpUploadKind`) match between modal (Task 3), submit handler (Task 5.4), and analytics call (Task 5.4).
- **Order:** Tasks 1-4 can be done in any order (they don't depend on each other); Task 5 depends on 1-4; Task 6 depends on 5; Task 7 depends on 6. The listed order is the safest — styles first so the modal renders correctly the moment it's wired.

---

## Rollback plan

If something breaks in production:

```bash
# Revert the integration commit; modal still exists but is not rendered.
git revert <Task 5.8 commit hash>
git push origin feat/quote-redesign
```

The standalone files (Tasks 1-4) are harmless on their own — they're not imported by anything until Task 5's WizardShell changes land.
