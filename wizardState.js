// wizardState.js — Unified wizard state management
// Single localStorage key replaces scattered gv_config, gv_fence_config, etc.

var STORAGE_KEY = 'gv_wizard_state';

var DEFAULT_ZONE_CONFIG = {
  config: null,       // { styleId, height, color, grade, spacing, puppy, ... }
  quoteData: null,    // { runs, corners, ends, gates, extras, ... }
  quoteResult: null,  // { items, subtotal, warnings }
  snapshotDataUrl: null,
  status: 'pending',  // 'pending' | 'configuring' | 'complete' | 'skipped'
};

var DEFAULT_STATE = {
  selectedZones: [],          // ['front', 'back', 'gate']
  currentZoneIndex: 0,
  poolCompliance: false,
  contactInfo: { name: '', email: '', phone: '' },
  shippingAddress: { street: '', city: '', state: '', zip: '' },
  installPlan: '',
  sameAsInstall: true,
  jobAddress: '',
  zoneQuotes: {},             // { front: {...}, back: {...}, gate: {...} }
};

function loadWizardState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return Object.assign({}, DEFAULT_STATE);
}

function saveWizardState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* ignore */ }
}

function getZoneQuote(state, zoneId) {
  return state.zoneQuotes[zoneId] || Object.assign({}, DEFAULT_ZONE_CONFIG);
}

function updateZoneQuote(state, zoneId, updates) {
  var zone = getZoneQuote(state, zoneId);
  var newZone = Object.assign({}, zone, updates);
  var newQuotes = Object.assign({}, state.zoneQuotes);
  newQuotes[zoneId] = newZone;
  return Object.assign({}, state, { zoneQuotes: newQuotes });
}

function getZoneOrder(state) {
  var zones = state.selectedZones.slice();
  // Gate always last
  var gateIdx = zones.indexOf('gate');
  if (gateIdx > -1) {
    zones.splice(gateIdx, 1);
    zones.push('gate');
  }
  // Pool → backyard first
  if (state.poolCompliance) {
    var backIdx = zones.indexOf('back');
    var frontIdx = zones.indexOf('front');
    if (backIdx > -1 && frontIdx > -1 && backIdx > frontIdx) {
      zones.splice(backIdx, 1);
      zones.splice(frontIdx, 0, 'back');
    }
  }
  return zones;
}

function getCurrentZoneId(state) {
  var order = getZoneOrder(state);
  return order[state.currentZoneIndex] || null;
}

function getGrandTotal(state) {
  var total = 0;
  Object.keys(state.zoneQuotes).forEach(function(zoneId) {
    var zone = state.zoneQuotes[zoneId];
    if (zone.quoteResult && zone.status === 'complete') {
      total += zone.quoteResult.subtotal || 0;
    }
  });
  return total;
}

function resetWizardState() {
  localStorage.removeItem(STORAGE_KEY);
  return Object.assign({}, DEFAULT_STATE);
}

export {
  loadWizardState, saveWizardState, getZoneQuote, updateZoneQuote,
  getZoneOrder, getCurrentZoneId, getGrandTotal, resetWizardState,
  DEFAULT_STATE, DEFAULT_ZONE_CONFIG,
};
