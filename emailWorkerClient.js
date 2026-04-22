// emailWorkerClient.js — centralized email-worker POST with a non-prod guard.
//
// Any dev server (localhost:3000), Cloudflare Pages preview
// (*.designstudio-csy.pages.dev, *.pages.dev), Playwright test run, or
// staging host must NOT post to the real email worker — it forwards to
// Google Apps Script, and GAS's free quota is 100 resends/day. One stray
// full-flow E2E run can blow the whole quota at 1/sec.
//
// Production hosts (studio.grandviewfence.com, grandviewfence.com) pass
// through unchanged. Everything else logs to console and resolves to a
// fake-success so call-site code paths don't change.

var WORKER_URL = 'https://grandview-email-worker.sarah-13a.workers.dev';

// Allowlist of hostnames that may post to the real email worker.
// Adding a host here is a deliberate act and should be rare.
var PROD_HOSTS = ['studio.grandviewfence.com', 'grandviewfence.com'];

export function isProductionEmailHost() {
  if (typeof window === 'undefined' || !window.location) return false;
  var host = window.location.hostname || '';
  return PROD_HOSTS.indexOf(host) >= 0;
}

export function postToEmailWorker(payload) {
  if (!isProductionEmailHost()) {
    try {
      var host = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'unknown';
      console.info('[emailWorker] BLOCKED on non-prod host:', host, 'source:', payload && payload.source);
    } catch (_) { /* no-op */ }
    return Promise.resolve({ ok: true, blocked: true });
  }
  return fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function(r) { return { ok: r.ok, blocked: false }; })
    .catch(function() { return { ok: false, blocked: false }; });
}

// sendBeacon variant for analytics — fire-and-forget, keepalive true across
// page unload. Non-prod hosts get a no-op (returns true to signal "we tried").
export function sendBeaconToEmailWorker(payload) {
  if (!isProductionEmailHost()) {
    try {
      var host = (typeof window !== 'undefined' && window.location && window.location.hostname) || 'unknown';
      console.info('[emailWorker] BLOCKED sendBeacon on non-prod host:', host, 'event:', payload && payload.event);
    } catch (_) { /* no-op */ }
    return true;
  }
  try {
    return navigator.sendBeacon(WORKER_URL, JSON.stringify(payload));
  } catch (e) {
    return false;
  }
}

export var EMAIL_WORKER_URL = WORKER_URL;
