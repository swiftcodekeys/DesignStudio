// analytics.js — Lightweight funnel tracking
// Sends events to GAS via the email worker for Google Sheets logging

var WORKER_URL = 'https://grandview-email-worker.sarah-13a.workers.dev';

function trackEvent(event, data) {
  var payload = {
    source: 'analytics',
    event: event,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    data: data || {},
  };

  try {
    navigator.sendBeacon(WORKER_URL, JSON.stringify(payload));
  } catch (e) {
    fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function() {});
  }
}

function getSessionId() {
  var key = 'gv_session_id';
  var id = sessionStorage.getItem(key);
  if (!id) {
    id = 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function trackZoneSelection(zones) { trackEvent('zone_select', { zones: zones }); }
export function trackStepEnter(step, zone) { trackEvent('step_enter', { step: step, zone: zone }); }
export function trackStepComplete(step, zone) { trackEvent('step_complete', { step: step, zone: zone }); }
export function trackQuoteComplete(zone, subtotal) { trackEvent('quote_complete', { zone: zone, subtotal: subtotal }); }
export function trackSummaryView(grandTotal) { trackEvent('summary_view', { grandTotal: grandTotal }); }
export function trackSubmit(quoteId, grandTotal) { trackEvent('quote_submit', { quoteId: quoteId, grandTotal: grandTotal }); }
export function trackDropoff(step, zone) { trackEvent('dropoff', { step: step, zone: zone }); }
export function trackPdfDownload(quoteId) { trackEvent('pdf_download', { quoteId: quoteId }); }
export function trackSaveForLater(email) { trackEvent('save_for_later', { hasEmail: !!email }); }
