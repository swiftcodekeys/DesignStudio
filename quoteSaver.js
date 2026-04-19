// quoteSaver.js — Save & resume quote via URL
// Encodes wizard state into a compact URL hash, emails link to buyer

import { loadWizardState, saveWizardState } from './wizardState';

function encodeState(state) {
  var slim = Object.assign({}, state);
  if (slim.zoneQuotes) {
    var cleaned = {};
    Object.keys(slim.zoneQuotes).forEach(function(k) {
      cleaned[k] = Object.assign({}, slim.zoneQuotes[k], { snapshotDataUrl: null });
    });
    slim.zoneQuotes = cleaned;
  }
  try {
    return btoa(encodeURIComponent(JSON.stringify(slim)));
  } catch (e) { return null; }
}

function decodeState(hash) {
  try {
    return JSON.parse(decodeURIComponent(atob(hash)));
  } catch (e) { return null; }
}

export function getSaveLink() {
  var state = loadWizardState();
  var encoded = encodeState(state);
  if (!encoded) return null;
  return window.location.origin + window.location.pathname + '#resume=' + encoded;
}

export function checkForResume() {
  var hash = window.location.hash;
  if (!hash || hash.indexOf('#resume=') !== 0) return false;
  var encoded = hash.replace('#resume=', '');
  var state = decodeState(encoded);
  if (state) {
    saveWizardState(state);
    window.history.replaceState(null, '', window.location.pathname);
    return true;
  }
  return false;
}

export function emailSaveLink(email, quoteId) {
  var link = getSaveLink();
  if (!link) return Promise.resolve(false);

  return fetch('https://grandview-email-worker.sarah-13a.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'save-quote-link',
      email: email,
      quoteId: quoteId || 'draft',
      resumeUrl: link,
    }),
  }).then(function(r) { return r.ok; }).catch(function() { return false; });
}

// Draw-tool specific encode/resume. The draw state (points + location) is
// tiny compared to a full wizard, so it fits comfortably in a URL hash.
function encodeDrawState(state) {
  try {
    return btoa(encodeURIComponent(JSON.stringify(state)));
  } catch (e) { return null; }
}

function decodeDrawState(encoded) {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
  } catch (e) { return null; }
}

export function getDrawSaveLink(drawState) {
  var encoded = encodeDrawState(drawState);
  if (!encoded) return null;
  return window.location.origin + window.location.pathname + '?tab=draw#dy-resume=' + encoded;
}

export function checkForDrawResume() {
  var hash = window.location.hash;
  if (!hash || hash.indexOf('#dy-resume=') !== 0) return null;
  var encoded = hash.replace('#dy-resume=', '');
  var state = decodeDrawState(encoded);
  if (state) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  return state;
}

export function emailDrawSaveLink(email, drawState) {
  var link = getDrawSaveLink(drawState);
  if (!link) return Promise.resolve(false);

  return fetch('https://grandview-email-worker.sarah-13a.workers.dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'save-quote-link',
      email: email,
      quoteId: 'draw-' + Date.now(),
      resumeUrl: link,
    }),
  }).then(function(r) { return r.ok; }).catch(function() { return false; });
}
