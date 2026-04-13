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
