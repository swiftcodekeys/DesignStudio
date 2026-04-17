import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedCanvas from './UnifiedCanvas';
import StyleTab from './tabs/StyleTab';
import ColorTab from './tabs/ColorTab';
import SizeTab from './tabs/SizeTab';
import DetailsTab from './tabs/DetailsTab';
import PuppyPicketsTab from './tabs/PuppyPicketsTab';
import OptionsTab from './tabs/OptionsTab';
import { COLORS, FENCE_STYLES } from './configData';
import { FENCE_COLORS, FENCE_STYLES as FENCE_TOOL_STYLES } from './fenceConfigData';
import PoolCompliancePopup from './PoolCompliancePopup';
import PoolPopup from './PoolPopup';
import DesignReviewPage from './DesignReviewPage';
import QuoteBuilder from './QuoteBuilder';
import EscapeHatchModal from './EscapeHatchModal';
import useEscapeHatchTriggers from './useEscapeHatchTriggers';
import ZoneTransitionPage from './ZoneTransitionPage';
import ZoneQuoteSummary from './ZoneQuoteSummary';
import {
    loadWizardState, saveWizardState, getZoneOrder, getZoneQuote,
    updateZoneQuote, getCurrentZoneId, getGrandTotal,
} from './wizardState';
import {
    trackZoneSelection, trackQuoteComplete, trackSummaryView, trackDropoff,
    trackEscapeHatchOpen, trackEscapeHatchSubmit, trackEscapeHatchDismiss,
} from './analytics';

/* ---- SVG Icons ---- */
var CheckSvg = function() {
    return (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="3 8 7 12 13 4" />
        </svg>
    );
};

var FenceIcon = function() {
    return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="16" x2="8" y2="56" />
            <line x1="32" y1="12" x2="32" y2="56" />
            <line x1="56" y1="16" x2="56" y2="56" />
            <line x1="8" y1="24" x2="56" y2="24" />
            <line x1="8" y1="44" x2="56" y2="44" />
            <line x1="20" y1="16" x2="20" y2="56" />
            <line x1="44" y1="16" x2="44" y2="56" />
        </svg>
    );
};

var BackyardIcon = function() {
    return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 36L32 16L56 36" />
            <rect x="20" y="36" width="24" height="20" />
            <rect x="28" y="44" width="8" height="12" />
            <line x1="4" y1="56" x2="60" y2="56" />
            <line x1="4" y1="56" x2="4" y2="48" />
            <line x1="60" y1="56" x2="60" y2="48" />
            <line x1="4" y1="50" x2="16" y2="50" />
            <line x1="48" y1="50" x2="60" y2="50" />
        </svg>
    );
};

var GateIcon = function() {
    return (
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="8" width="8" height="48" rx="1" />
            <rect x="52" y="8" width="8" height="48" rx="1" />
            <line x1="12" y1="20" x2="52" y2="20" />
            <line x1="12" y1="44" x2="52" y2="44" />
            <line x1="22" y1="14" x2="22" y2="50" />
            <line x1="32" y1="12" x2="32" y2="50" />
            <line x1="42" y1="14" x2="42" y2="50" />
            <circle cx="28" cy="32" r="2" />
            <circle cx="36" cy="32" r="2" />
        </svg>
    );
};

/* ---- Zone definitions ---- */
var ZONES = [
    {
        id: 'front',
        label: 'Front Yard Fence',
        desc: 'Decorative aluminum fence for your front yard, garden, or property line.',
        Icon: FenceIcon,
    },
    {
        id: 'back',
        label: 'Backyard Fence',
        desc: 'Pool safety, pet containment, or privacy. We have every style.',
        Icon: BackyardIcon,
    },
    {
        id: 'gate',
        label: 'Driveway Gate',
        desc: 'Single or double gate. Walk gates to full estate gates.',
        Icon: GateIcon,
    },
];

/* ---- Zone label lookup ---- */
var ZONE_LABELS = { front: 'Front Yard', back: 'Backyard', gate: 'Driveway Gate' };

/* ---- Step names for progress bar ---- */
var STEP_NAMES = ['Select zones', 'Configure', 'Review Design', 'Quote Details', 'Zone Transition', 'Quote Summary'];
var TOTAL_STEPS = 6;

/* ---- Default configs per zone ---- */
function getDefaultConfig(zoneId) {
    if (zoneId === 'gate') {
        var gateStyle = FENCE_STYLES[0];
        return {
            styleId: gateStyle.id,
            height: '60',
            color: COLORS[5],
            post: gateStyle.postDefault,
            postCap: 'pcf',
            arch: 'e',
            leaf: gateStyle.leafDefault,
            finial: null,
            accessories: {},
            mount: 'p',
        };
    }
    if (zoneId === 'back') {
        return {
            styleId: 'uab_200',
            height: '60',
            color: FENCE_COLORS[0],
            finialType: null,
            postCap: 'pcf',
            accessories: {},
            pupType: null,
        };
    }
    return {
        styleId: 'uaf_200',
        height: '48',
        color: FENCE_COLORS[5],
        finialType: null,
        postCap: 'pcf',
        accessories: {},
        pupType: null,
        privacyPostColor: 'white',
        privacyPanelColor: 'white',
    };
}

/* ============================================================
   WIZARD SHELL
   ============================================================ */
var WizardShell = function() {
    var navigate = useNavigate();

    // ---- Core wizard state ----
    var stepState = useState(1);
    var step = stepState[0];
    var setStep = stepState[1];

    var zonesState = useState([]);
    var selectedZones = zonesState[0];
    var setSelectedZones = zonesState[1];

    var currentZoneState = useState(null);
    var currentZone = currentZoneState[0];
    var setCurrentZone = currentZoneState[1];

    var configsState = useState({});
    var zoneConfigs = configsState[0];
    var setZoneConfigs = configsState[1];

    var configuredState = useState({});
    var zonesConfigured = configuredState[0];
    var setZonesConfigured = configuredState[1];

    var rendererReadyState = useState(false);
    var rendererReady = rendererReadyState[0];
    var setRendererReady = rendererReadyState[1];

    // ---- Pool popup state (NEW PoolPopup) ----
    var poolPopupState = useState(false);
    var showPoolPopup = poolPopupState[0];
    var setShowPoolPopup = poolPopupState[1];

    var poolAnsweredState = useState(false);
    var poolAnswered = poolAnsweredState[0];
    var setPoolAnswered = poolAnsweredState[1];

    var poolHintState = useState(false);
    var showPoolHint = poolHintState[0];
    var setShowPoolHint = poolHintState[1];

    // ---- Step 2 sidebar accordion (which section is expanded) ----
    var expandedSectionState = useState('style');
    var expandedSection = expandedSectionState[0];
    var setExpandedSection = expandedSectionState[1];
    var toggleSection = function(name) {
        setExpandedSection(function(prev) { return prev === name ? '' : name; });
    };

    var poolStyleState = useState('haven');
    var poolSelectedStyle = poolStyleState[0];
    var setPoolSelectedStyle = poolStyleState[1];

    // ---- Unified wizard state (persisted) ----
    var wizState = useState(function() { return loadWizardState(); });
    var wizardState = wizState[0];
    var setWizardState = wizState[1];

    // ---- QuoteBuilder state ----
    var skipToStepState = useState(0);
    var skipToStep = skipToStepState[0];
    var setSkipToStep = skipToStepState[1];

    // ---- Snapshot state (captured from 3D renderer) ----
    var snapshotState = useState(null);
    var snapshotDataUrl = snapshotState[0];
    var setSnapshotDataUrl = snapshotState[1];

    // ---- Zone transition state ----
    var completedZoneConfigState = useState(null);
    var completedZoneConfig = completedZoneConfigState[0];
    var setCompletedZoneConfig = completedZoneConfigState[1];

    // ---- Track which zone just completed (for transition page) ----
    var completedZoneIdState = useState(null);
    var completedZoneId = completedZoneIdState[0];
    var setCompletedZoneId = completedZoneIdState[1];

    // ---- Editing from summary ----
    var editingZoneState = useState(null);
    var editingZone = editingZoneState[0];
    var setEditingZone = editingZoneState[1];

    // ---- Escape Hatch Modal state (Task 5) ----
    var escapeOpenState = useState(false);
    var showEscapeHatch = escapeOpenState[0];
    var setShowEscapeHatch = escapeOpenState[1];

    var escapeTriggerState = useState('pill');
    var escapeTrigger = escapeTriggerState[0];
    var setEscapeTrigger = escapeTriggerState[1];

    // ---- Exit-intent trigger (fires once per session, only on step >= 2) ----
    var handleExitIntent = React.useCallback(function() {
        setEscapeTrigger('exit-intent');
        setShowEscapeHatch(true);
        trackEscapeHatchOpen('exit-intent', step);
    }, [step]);
    useEscapeHatchTriggers(step, handleExitIntent);

    // Initialize configs when zones are selected
    useEffect(function() {
        var newConfigs = {};
        selectedZones.forEach(function(zoneId) {
            newConfigs[zoneId] = zoneConfigs[zoneId] || getDefaultConfig(zoneId);
        });
        if (Object.keys(newConfigs).length > 0) {
            setZoneConfigs(newConfigs);
        }
    }, [selectedZones]);

    // Simulate renderer ready after mount
    useEffect(function() {
        var timer = setTimeout(function() {
            setRendererReady(true);
        }, 1500);
        return function() { clearTimeout(timer); };
    }, []);

    // Persist wizardState to localStorage on every change
    useEffect(function() {
        saveWizardState(wizardState);
    }, [wizardState]);

    // Track dropoff on page unload if mid-flow
    useEffect(function() {
        function handleUnload() {
            if (step > 1 && step < 6) {
                trackDropoff(step, currentZone);
            }
        }
        window.addEventListener('beforeunload', handleUnload);
        return function() { window.removeEventListener('beforeunload', handleUnload); };
    }, [step, currentZone]);

    // Track summary view when step 6 renders
    useEffect(function() {
        if (step === 6) {
            var grandTotal = getGrandTotal(Object.assign({}, wizardState, { selectedZones: selectedZones }));
            trackSummaryView(grandTotal);
        }
    }, [step]);

    // Compute ordered zones from wizardState helpers
    var orderedZones = getZoneOrder(
        Object.assign({}, wizardState, { selectedZones: selectedZones })
    );
    var hasGateZone = selectedZones.indexOf('gate') >= 0;

    // Progress bar — show current step out of total
    var progressPercent = (step / TOTAL_STEPS) * 100;

    // ---- Zone toggle ----
    var toggleZone = function(zoneId) {
        setSelectedZones(function(prev) {
            var idx = prev.indexOf(zoneId);
            if (idx >= 0) {
                return prev.filter(function(z) { return z !== zoneId; });
            }
            return prev.concat([zoneId]);
        });
    };

    // ---- Config change handler for current zone ----
    var handleConfigChange = function(newConfig) {
        setZoneConfigs(function(prev) {
            var updated = Object.assign({}, prev);
            var current = updated[currentZone] || {};
            updated[currentZone] = typeof newConfig === 'function' ? newConfig(current) : newConfig;
            return updated;
        });
    };

    // ---- Capture 3D snapshot ----
    var captureSnapshot = function() {
        var dataUrl = '';
        try {
            var canvasEl = document.querySelector('.wizard-configure-right canvas');
            var bgImgEl = document.querySelector('.wizard-configure-right img');
            if (canvasEl) {
                var w = canvasEl.width;
                var h = canvasEl.height;
                var offscreen = document.createElement('canvas');
                offscreen.width = w;
                offscreen.height = h;
                var ctx = offscreen.getContext('2d');
                if (bgImgEl && bgImgEl.complete && bgImgEl.naturalWidth > 0) {
                    ctx.drawImage(bgImgEl, 0, 0, w, h);
                }
                ctx.drawImage(canvasEl, 0, 0, w, h);
                dataUrl = offscreen.toDataURL('image/jpeg', 0.85);
            }
        } catch (e) {}
        setSnapshotDataUrl(dataUrl);
        // Task 4 — also store snapshot under its own key so downstream
        // consumers (QuoteBuilder header, ZoneQuoteSummary, confirmation
        // emails) can read it directly without decoding gv_saved_design.
        try {
            if (dataUrl) localStorage.setItem('gv_design_snapshot', dataUrl);
        } catch (e) {}
        return dataUrl;
    };

    // ---- Mark current zone as configured and move to next ----
    var handleZoneNext = function() {
        setZonesConfigured(function(prev) {
            var updated = Object.assign({}, prev);
            updated[currentZone] = true;
            return updated;
        });

        // Find next unconfigured zone
        var allZones = orderedZones;
        var currentIdx = allZones.indexOf(currentZone);
        var nextZone = null;
        for (var i = currentIdx + 1; i < allZones.length; i++) {
            if (!zonesConfigured[allZones[i]]) {
                nextZone = allZones[i];
                break;
            }
        }

        if (nextZone) {
            setCurrentZone(nextZone);
        } else {
            // All zones configured — save design and show bridge page (step 3)
            saveWizardDesign();
            setStep(3);
        }
    };

    // ---- Escape to full configurator ----
    var handleEscape = function() {
        try {
            if (zoneConfigs.front) localStorage.setItem('gv_fence_config', JSON.stringify(zoneConfigs.front));
            if (zoneConfigs.back) localStorage.setItem('gv_back_config', JSON.stringify(zoneConfigs.back));
            if (zoneConfigs.gate) localStorage.setItem('gv_config', JSON.stringify(zoneConfigs.gate));
        } catch (e) { /* */ }
        navigate('/studio');
    };

    // ---- Confirm before leaving if wizard has progress ----
    var handleLogoClick = function() {
        if (step > 1 || selectedZones.length > 0) {
            if (window.confirm('Leave wizard? Your progress will be saved.')) {
                navigate('/');
            }
        } else {
            navigate('/');
        }
    };

    // ---- Build and persist saved design for bridge page ----
    var saveWizardDesign = function() {
        var primaryZone = orderedZones.find(function(z) { return z === 'front' || z === 'back'; }) || orderedZones[0];
        var primaryConfig = zoneConfigs[primaryZone] || {};
        var scene = primaryZone === 'back' ? 'backyard' : (primaryZone === 'gate' ? 'gates' : 'fencing');
        var isFence = (scene === 'fencing' || scene === 'backyard');
        var acc = primaryConfig.accessories || {};

        var snap = captureSnapshot();

        var savedDesign = {
            scene: scene,
            styleId: primaryConfig.styleId || '',
            height: primaryConfig.height || '48',
            color: primaryConfig.color ? {
                id: primaryConfig.color.id,
                displayName: primaryConfig.color.displayName,
                hex: primaryConfig.color.hex || primaryConfig.color.threeHex || '',
            } : null,
            postCap: primaryConfig.postCap || 'pcf',
            finialType: isFence ? (primaryConfig.finialType || null) : (primaryConfig.finial || null),
            pupType: primaryConfig.pupType || null,
            circles: !!acc.tcr,
            butterflies: !!acc.tbu,
            scrolls: !!acc.scr,
            midRail: !!acc.mdr,
            upperFinialRail: !!acc.ufr,
            proSpacing: !!acc.res,
            arch: isFence ? null : (primaryConfig.arch || null),
            mount: isFence ? null : (primaryConfig.mount || null),
            leaf: isFence ? null : (primaryConfig.leaf || null),
            privacyPostColor: primaryConfig.privacyPostColor || null,
            privacyPanelColor: primaryConfig.privacyPanelColor || null,
            poolBarrier: !!(primaryConfig.poolBarrier),
            poolCompliance: primaryConfig.poolCompliance || null,
            snapshotDataUrl: snap || '',
            timestamp: new Date().toISOString(),
        };

        try {
            localStorage.setItem('gv_saved_design', JSON.stringify(savedDesign));
            if (zoneConfigs.front) localStorage.setItem('gv_fence_config', JSON.stringify(zoneConfigs.front));
            if (zoneConfigs.back) localStorage.setItem('gv_back_config', JSON.stringify(zoneConfigs.back));
            if (zoneConfigs.gate) localStorage.setItem('gv_config', JSON.stringify(zoneConfigs.gate));
        } catch (e) {}

        // Also update unified wizardState
        setWizardState(function(prev) {
            var next = Object.assign({}, prev, { selectedZones: selectedZones });
            next = updateZoneQuote(next, primaryZone, {
                config: primaryConfig,
                snapshotDataUrl: snap || '',
            });
            return next;
        });
    };

    // ---- Build QuoteBuilder initialConfig from zone design config ----
    var buildQuoteInitialConfig = function(zoneId, cfg) {
        if (!cfg) cfg = zoneConfigs[zoneId] || {};
        var colorName = '';
        if (cfg.color) {
            colorName = (typeof cfg.color === 'object' && cfg.color.displayName)
                ? cfg.color.displayName.toLowerCase().replace(/\s+/g, '-')
                : (typeof cfg.color === 'string' ? cfg.color : '');
        }
        return {
            style: cfg.styleId || '',
            height: parseInt(cfg.height, 10) || 48,
            color: colorName,
            postCap: cfg.postCap || 'flat',
            pupType: cfg.pupType || null,
            finialType: cfg.finialType || cfg.finial || null,
        };
    };

    // ---- QuoteBuilder completion handler ----
    var handleQuoteComplete = function(quoteData, quoteResult) {
        var zoneId = currentZone;
        var zoneLabel = ZONE_LABELS[zoneId] || zoneId;
        var cfg = zoneConfigs[zoneId] || {};

        // QuoteStep6_Review passes (data, result); legacy callers from
        // intermediate steps pass (data) only. Fall back to the embedded
        // quoteResult if the caller didn't hand us one.
        var result = quoteResult || (quoteData && quoteData.quoteResult) || { items: [], subtotal: 0, warnings: [] };

        // Track quote completion for this zone
        trackQuoteComplete(zoneId, result.subtotal || 0);

        // Save to wizardState — and also hoist contact/shipping/installPlan
        // from the QuoteBuilder data so the final CRM payload includes the
        // Ultra Easy Form fields (Name/Email/Phone/ZIP + shippingAddress).
        setWizardState(function(prev) {
            var next = Object.assign({}, prev, { selectedZones: selectedZones });
            next = updateZoneQuote(next, zoneId, {
                config: cfg,
                quoteData: quoteData,
                quoteResult: result,
                snapshotDataUrl: snapshotDataUrl || '',
                status: 'complete',
            });

            // Hoist contact info (only set if QuoteBuilder actually captured it)
            if (quoteData && (quoteData.contactName || quoteData.contactEmail || quoteData.contactPhone)) {
                next.contactInfo = {
                    name: quoteData.contactName || (prev.contactInfo && prev.contactInfo.name) || '',
                    email: quoteData.contactEmail || (prev.contactInfo && prev.contactInfo.email) || '',
                    phone: quoteData.contactPhone || (prev.contactInfo && prev.contactInfo.phone) || '',
                };
            }
            // Hoist shipping address
            if (quoteData && (quoteData.shippingStreet || quoteData.shippingCity || quoteData.shippingZip)) {
                next.shippingAddress = {
                    street: quoteData.shippingStreet || '',
                    city: quoteData.shippingCity || '',
                    state: quoteData.shippingState || '',
                    zip: quoteData.shippingZip || '',
                };
            }
            if (quoteData && quoteData.installPlan) {
                next.installPlan = quoteData.installPlan;
            }
            return next;
        });

        // Store completed zone info for transition page
        setCompletedZoneId(zoneId);
        setCompletedZoneConfig({
            style: cfg.styleId || '',
            height: cfg.height || '',
            color: cfg.color ? (cfg.color.displayName || '') : '',
        });

        // Determine what comes next
        var currentIdx = orderedZones.indexOf(zoneId);
        var remainingFenceZones = [];
        var remainingGateZones = [];
        for (var i = currentIdx + 1; i < orderedZones.length; i++) {
            if (orderedZones[i] === 'gate') {
                remainingGateZones.push(orderedZones[i]);
            } else {
                remainingFenceZones.push(orderedZones[i]);
            }
        }

        if (remainingFenceZones.length > 0) {
            // More fence zones remain — show transition page
            setCurrentZone(remainingFenceZones[0]);
            setStep(5);
        } else if (remainingGateZones.length > 0) {
            // Only gate zone remains — route to Design Studio gate tab
            setCurrentZone('gate');
            setStep(2); // Go to 3D configurator for gate
        } else {
            // All zones complete — show summary
            setStep(6);
        }
    };

    // ---- ZoneTransition handlers ----
    var handleSameFence = function() {
        // Copy style/color/height from completed zone, skip to Layout (step 1) in QuoteBuilder
        var prevCfg = zoneConfigs[completedZoneId] || {};
        setZoneConfigs(function(prev) {
            var updated = Object.assign({}, prev);
            var nextCfg = updated[currentZone] || getDefaultConfig(currentZone);
            nextCfg.styleId = prevCfg.styleId;
            nextCfg.height = prevCfg.height;
            nextCfg.color = prevCfg.color;
            nextCfg.postCap = prevCfg.postCap;
            nextCfg.finialType = prevCfg.finialType;
            nextCfg.pupType = prevCfg.pupType;
            updated[currentZone] = nextCfg;
            return updated;
        });
        setSkipToStep(1); // Skip style step, start at Layout
        setStep(4); // Go straight to QuoteBuilder
    };

    var handleDifferentFence = function() {
        // Full 3D configurator for next zone
        setSkipToStep(0);
        setStep(2);
    };

    // ---- ZoneQuoteSummary handlers ----
    var handleEditZone = function(zoneId) {
        setEditingZone(zoneId);
        setCurrentZone(zoneId);
        setSkipToStep(0);
        setStep(4); // Go back to QuoteBuilder for that zone
    };

    // Submit the completed multi-zone quote to the Grandview CRM worker.
    // Posts to D1 via /leads; admin can then process in the CRM.
    var CRM_ENDPOINT = 'https://grandview-crm.sarah-13a.workers.dev/leads';

    var buildQuotePayload = function() {
        var quoteId = 'GV-' + Math.floor(100000 + Math.random() * 900000);
        var primarySnapshot = null;

        var zones = (selectedZones || []).map(function(zoneId) {
            var zq = (wizardState.zoneQuotes && wizardState.zoneQuotes[zoneId]) || {};
            var cfg = zq.config || {};
            var qd = zq.quoteData || {};
            var qr = zq.quoteResult || { items: [], subtotal: 0 };

            if (!primarySnapshot && zq.snapshotDataUrl) primarySnapshot = zq.snapshotDataUrl;

            var colorId = '';
            if (cfg.color) {
                colorId = typeof cfg.color === 'string'
                    ? cfg.color
                    : (cfg.color.id || cfg.color.displayName || '');
            }

            return {
                zoneId: zoneId,
                zoneName: ZONE_LABELS[zoneId] || zoneId,
                style: cfg.styleId || '',
                grade: cfg.grade || '',
                height: cfg.height || '',
                color: colorId,
                linearFootage: qd.linearFeet || qd.runs || 0,
                corners: qd.corners || 0,
                gateCount: (qd.gates && qd.gates.length) || 0,
                items: qr.items || [],
                subtotal: qr.subtotal || 0,
            };
        });

        var grandTotal = getGrandTotal(
            Object.assign({}, wizardState, { selectedZones: selectedZones })
        );

        return {
            quoteId: quoteId,
            Name: (wizardState.contactInfo && wizardState.contactInfo.name) || '',
            Email: (wizardState.contactInfo && wizardState.contactInfo.email) || '',
            Phone: (wizardState.contactInfo && wizardState.contactInfo.phone) || '',
            ZIP: (wizardState.shippingAddress && wizardState.shippingAddress.zip) || '',
            followUpPref: 'email',
            installPlan: wizardState.installPlan || '',
            shippingAddress: wizardState.shippingAddress || null,
            zones: zones,
            grandTotal: grandTotal,
            snapshotDataUrl: primarySnapshot,
            source: 'quote-builder-wizard',
        };
    };

    var submitQuoteToCRM = function(orderingIntent) {
        var payload = buildQuotePayload();
        payload.submitAction = orderingIntent; // 'quote' | 'order'

        return fetch(CRM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }).then(function(res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        }).then(function(data) {
            return { ok: true, quoteId: payload.quoteId, data: data };
        }).catch(function(err) {
            console.error('Quote submit failed:', err);
            return { ok: false, error: err.message || String(err), quoteId: payload.quoteId };
        });
    };

    var handleSubmitQuote = function() {
        submitQuoteToCRM('quote').then(function(result) {
            if (result.ok) {
                alert(
                    'Quote submitted successfully!\n\nConfirmation ID: ' + result.quoteId +
                    '\n\nOur team will review your selections and reach out within one business day.'
                );
            } else {
                alert(
                    'Sorry, something went wrong submitting your quote.\n\n' +
                    'Reference ID: ' + result.quoteId + '\n' +
                    'Please try again or call us at (517) 555-GV01.'
                );
            }
        });
    };

    var handleOrderNow = function() {
        submitQuoteToCRM('order').then(function(result) {
            if (result.ok) {
                alert(
                    'Order placed!\n\nConfirmation ID: ' + result.quoteId +
                    '\n\nOur team will verify measurements and contact you to finalize before production.'
                );
            } else {
                alert(
                    'Sorry, something went wrong placing your order.\n\n' +
                    'Reference ID: ' + result.quoteId + '\n' +
                    'Please try again or call us at (517) 555-GV01.'
                );
            }
        });
    };

    var handleTalkToExpert = function() {
        // Could open ContactPopup or navigate
        navigate('/studio?view=contact');
    };

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

    // Current active config for renderer
    var activeConfig = currentZone && zoneConfigs[currentZone]
        ? zoneConfigs[currentZone]
        : null;
    var isGateConfig = currentZone === 'gate';
    var activeScene = isGateConfig ? 'gates' : ('back' === currentZone ? 'backyard' : 'fencing');

    /* ================================================================
       RENDER
       ================================================================ */
    return (
        <div className="wizard-shell">
            {/* ---- Progress Bar ---- */}
            <div className="wizard-progress">
                <div className="wizard-progress-left">
                    <img
                        src="assets/logo-email.png"
                        alt="Grandview"
                        className="wizard-logo-img"
                        style={{ cursor: 'pointer' }}
                        onClick={handleLogoClick}
                    />
                    <span className="wizard-step-label">
                        Step {step} of {TOTAL_STEPS}
                        <span className="wizard-step-name"> &mdash; {STEP_NAMES[step - 1] || ''}</span>
                    </span>
                </div>
                <div className="wizard-progress-bar">
                    <div className="wizard-progress-fill" style={{ width: progressPercent + '%' }} />
                </div>
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
            </div>

            {/* ---- Step 1: Zone Selection ---- */}
            {step === 1 && (
                <div className="wizard-content">
                    <h1 className="zone-heading">Where do you need fencing?</h1>
                    <p className="zone-subhead">
                        Select everything that applies. We will configure each one.
                    </p>
                    <div className="zone-cards">
                        {ZONES.map(function(zone) {
                            var isSelected = selectedZones.indexOf(zone.id) >= 0;
                            return (
                                <div
                                    key={zone.id}
                                    className={'zone-card' + (isSelected ? ' selected' : '')}
                                    onClick={function() { toggleZone(zone.id); }}
                                >
                                    <div className="zone-card-check"><CheckSvg /></div>
                                    <div className="zone-card-icon"><zone.Icon /></div>
                                    <div className="zone-card-title">{zone.label}</div>
                                    <div className="zone-card-desc">{zone.desc}</div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Pool question inline when backyard selected */}
                    {selectedZones.indexOf('back') >= 0 && !poolAnswered && (
                        <div className={'wizard-pool-inline' + (showPoolHint ? ' wizard-pool-inline-nudge' : '')}>
                            {showPoolHint && (
                                <div className="wizard-pool-hint">Answer below to continue →</div>
                            )}
                            <div className="wizard-pool-question">
                                <strong>Pool Safety:</strong> Is any part of your backyard fence around a pool?
                            </div>
                            <div className="wizard-pool-btns">
                                <button className={'wizard-pool-btn'} onClick={function() {
                                    setPoolAnswered('yes');
                                    // Auto-configure pool compliance: Haven, flush bottom, TruClose, MagnaLatch
                                    var poolCompliance = {
                                        poolBarrier: true,
                                        selectedStyle: 'haven',
                                        flushBottom: true,
                                        selfClosingHinges: true,
                                        selfLatching: true,
                                        swingOutward: true,
                                        minHeight48: true,
                                    };
                                    setZoneConfigs(function(prev) {
                                        var updated = Object.assign({}, prev);
                                        var back = updated.back || getDefaultConfig('back');
                                        back.poolBarrier = true;
                                        back.poolCompliance = poolCompliance;
                                        back.styleId = 'uab_200'; // Haven — pool compliant
                                        updated.back = back;
                                        return updated;
                                    });
                                    setWizardState(function(prev) {
                                        return Object.assign({}, prev, {
                                            selectedZones: selectedZones,
                                            poolCompliance: poolCompliance,
                                        });
                                    });
                                    // Auto-advance to configurator
                                    trackZoneSelection(selectedZones);
                                    setCurrentZone(orderedZones[0]);
                                    setStep(2);
                                }}>
                                    Yes — configure for pool code
                                </button>
                                <button className={'wizard-pool-btn'} onClick={function() {
                                    setPoolAnswered('no');
                                    // Also auto-advance
                                    trackZoneSelection(selectedZones);
                                    setWizardState(function(prev) {
                                        return Object.assign({}, prev, { selectedZones: selectedZones });
                                    });
                                    setCurrentZone(orderedZones[0]);
                                    setStep(2);
                                }}>
                                    No — standard spec
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="wizard-actions">
                        <button
                            className="wizard-btn-primary"
                            disabled={selectedZones.length === 0}
                            onClick={function() {
                                // If backyard selected and pool not answered, nudge them
                                if (selectedZones.indexOf('back') >= 0 && !poolAnswered) {
                                    setShowPoolHint(true);
                                    var poolEl = document.querySelector('.wizard-pool-inline');
                                    if (poolEl) poolEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    return;
                                }
                                trackZoneSelection(selectedZones);
                                // Sync selectedZones into wizardState
                                setWizardState(function(prev) {
                                    return Object.assign({}, prev, { selectedZones: selectedZones });
                                });
                                setCurrentZone(orderedZones[0]);
                                setStep(2);
                            }}
                        >
                            Next &rarr;
                        </button>
                        <button className="wizard-btn-secondary" onClick={function() { navigate('/studio'); }}>
                            Or skip &mdash; just show me the configurator &rarr;
                        </button>
                    </div>
                </div>
            )}

            {/* Pool popup removed — Yes/No inline handles pool compliance directly */}

            {/* ---- Step 2: Configure Each Zone (3D Configurator) ---- */}
            {step === 2 && activeConfig && (
                <div className="wizard-configure">
                    <div className="wizard-configure-left">
                        {/* Zone pills (if multiple zones) */}
                        {selectedZones.length > 1 && (
                            <div className="wizard-zone-pills">
                                {orderedZones.map(function(zoneId) {
                                    var zone = ZONES.find(function(z) { return z.id === zoneId; });
                                    var isActive = zoneId === currentZone;
                                    var isDone = zonesConfigured[zoneId];
                                    return (
                                        <button
                                            key={zoneId}
                                            className={'wizard-zone-pill' + (isActive ? ' active' : '') + (isDone ? ' done' : '')}
                                            onClick={function() { setCurrentZone(zoneId); }}
                                        >
                                            {isDone && (
                                                <svg className="wizard-zone-pill-check" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                                    <polyline points="3 8 7 12 13 4" />
                                                </svg>
                                            )}
                                            {zone ? zone.label : zoneId}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Config header */}
                        <div className="wizard-config-header" style={{ padding: '20px 20px 0' }}>
                            <div className="wizard-config-label">
                                Configuring{selectedZones.length > 1 ? ': ' + (ZONES.find(function(z) { return z.id === currentZone; }) || {}).label : ''}
                                {selectedZones.length > 1 && ' (' + (orderedZones.indexOf(currentZone) + 1) + ' of ' + orderedZones.length + ')'}
                            </div>
                            <div className="wizard-config-title">Choose Your Style</div>
                        </div>

                        {/* Tab content: accordion-style, one section open at a time
                            to keep the sidebar focused instead of a long scroll. */}
                        <div className="wizard-config-panel wizard-config-accordion">
                            <div className={'wizard-acc-section' + (expandedSection === 'style' ? ' open' : '')}>
                                <button type="button" className="wizard-acc-head" onClick={function() { toggleSection('style'); }}>
                                    <span>Style</span>
                                    <span className="wizard-acc-chev">{expandedSection === 'style' ? '\u2212' : '+'}</span>
                                </button>
                                {expandedSection === 'style' && (
                                    <div className="wizard-acc-body">
                                        <StyleTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                                    </div>
                                )}
                            </div>
                            <div className={'wizard-acc-section' + (expandedSection === 'color' ? ' open' : '')}>
                                <button type="button" className="wizard-acc-head" onClick={function() { toggleSection('color'); }}>
                                    <span>Color</span>
                                    <span className="wizard-acc-chev">{expandedSection === 'color' ? '\u2212' : '+'}</span>
                                </button>
                                {expandedSection === 'color' && (
                                    <div className="wizard-acc-body">
                                        <ColorTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                                    </div>
                                )}
                            </div>
                            <div className={'wizard-acc-section' + (expandedSection === 'size' ? ' open' : '')}>
                                <button type="button" className="wizard-acc-head" onClick={function() { toggleSection('size'); }}>
                                    <span>Size</span>
                                    <span className="wizard-acc-chev">{expandedSection === 'size' ? '\u2212' : '+'}</span>
                                </button>
                                {expandedSection === 'size' && (
                                    <div className="wizard-acc-body">
                                        <SizeTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                                    </div>
                                )}
                            </div>
                            <div className={'wizard-acc-section' + (expandedSection === 'details' ? ' open' : '')}>
                                <button type="button" className="wizard-acc-head" onClick={function() { toggleSection('details'); }}>
                                    <span>Details</span>
                                    <span className="wizard-acc-chev">{expandedSection === 'details' ? '\u2212' : '+'}</span>
                                </button>
                                {expandedSection === 'details' && (
                                    <div className="wizard-acc-body">
                                        <DetailsTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                                    </div>
                                )}
                            </div>
                            <div className={'wizard-acc-section' + (expandedSection === 'puppy' ? ' open' : '')}>
                                <button type="button" className="wizard-acc-head" onClick={function() { toggleSection('puppy'); }}>
                                    <span>Puppy Pickets</span>
                                    <span className="wizard-acc-chev">{expandedSection === 'puppy' ? '\u2212' : '+'}</span>
                                </button>
                                {expandedSection === 'puppy' && (
                                    <div className="wizard-acc-body">
                                        <PuppyPicketsTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                                    </div>
                                )}
                            </div>
                            {isGateConfig && (
                                <div className={'wizard-acc-section' + (expandedSection === 'options' ? ' open' : '')}>
                                    <button type="button" className="wizard-acc-head" onClick={function() { toggleSection('options'); }}>
                                        <span>Options</span>
                                        <span className="wizard-acc-chev">{expandedSection === 'options' ? '\u2212' : '+'}</span>
                                    </button>
                                    {expandedSection === 'options' && (
                                        <div className="wizard-acc-body">
                                            <OptionsTab config={activeConfig} onConfigChange={handleConfigChange} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer with nav */}
                        <div className="wizard-config-footer">
                            <button
                                className="wizard-btn-back"
                                onClick={function() {
                                    var idx = orderedZones.indexOf(currentZone);
                                    if (idx > 0) {
                                        setCurrentZone(orderedZones[idx - 1]);
                                    } else {
                                        setStep(1);
                                    }
                                }}
                            >
                                &larr; Back
                            </button>
                            <button className="wizard-btn-primary" onClick={handleZoneNext}>
                                {zonesConfigured[currentZone] || orderedZones.indexOf(currentZone) === orderedZones.length - 1
                                    ? 'Looks good, next \u2192'
                                    : 'Next zone \u2192'}
                            </button>
                        </div>
                    </div>

                    {/* 3D renderer */}
                    <div className="wizard-configure-right">
                        {!rendererReady ? (
                            <div className="wizard-renderer-loading">
                                <div className="wizard-spinner" />
                                Loading your 3D preview...
                            </div>
                        ) : (
                            <UnifiedCanvas
                                config={isGateConfig ? activeConfig : { styleId: 'uaf_200', height: '60', color: COLORS[5], arch: 'e', leaf: '2', mount: 'p', postCap: 'pcf' }}
                                fenceConfig={!isGateConfig ? activeConfig : { styleId: 'uaf_200', height: '48', color: FENCE_COLORS[5] }}
                                panelCollapsed={false}
                                activeScene={activeScene}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* ---- Step 3: Design Review / Measure (bridge page) ---- */}
            {step === 3 && (
                <DesignReviewPage
                    onNavigateToDraw={function(location) {
                        // Save address, then open the draw tool in the Design Studio
                        try {
                            localStorage.setItem('gv_bridge_location', JSON.stringify(location));
                            localStorage.setItem('gv_start_scene', 'draw');
                        } catch (e) {}
                        navigate('/studio');
                    }}
                    onNavigateToManual={function() {
                        setSkipToStep(0);
                        setStep(4);
                    }}
                    onNavigateToStudio={function() {
                        setStep(2);
                        setCurrentZone(orderedZones[orderedZones.length - 1]);
                    }}
                    onOpenContact={function() {}}
                    showPoolPopup={false}
                    onPoolComplete={function() {}}
                    onPoolCancel={function() {}}
                />
            )}

            {/* ---- Step 4: QuoteBuilder (per zone, 6 internal steps) ---- */}
            {step === 4 && currentZone && (
                <QuoteBuilder
                    zoneName={ZONE_LABELS[currentZone] || currentZone}
                    zoneId={currentZone}
                    initialConfig={buildQuoteInitialConfig(currentZone)}
                    poolCompliance={
                        currentZone === 'back' && zoneConfigs.back
                            ? zoneConfigs.back.poolCompliance || null
                            : null
                    }
                    snapshotDataUrl={snapshotDataUrl || ''}
                    onComplete={handleQuoteComplete}
                    onBack={function() {
                        // Back goes to design review (step 3) or transition (step 5)
                        if (editingZone) {
                            // Came from summary edit — go back to summary
                            setEditingZone(null);
                            setStep(6);
                        } else {
                            setStep(3);
                        }
                    }}
                    skipToStep={skipToStep}
                    isFirstZone={orderedZones.indexOf(currentZone) === 0}
                    drawToolData={null}
                />
            )}

            {/* ---- Step 5: Zone Transition ("Same fence?") ---- */}
            {step === 5 && completedZoneId && currentZone && (
                <ZoneTransitionPage
                    completedZoneName={ZONE_LABELS[completedZoneId] || completedZoneId}
                    completedConfig={completedZoneConfig || {}}
                    nextZoneName={ZONE_LABELS[currentZone] || currentZone}
                    onSame={handleSameFence}
                    onDifferent={handleDifferentFence}
                />
            )}

            {/* ---- Step 6: Zone Quote Summary (final combined) ---- */}
            {step === 6 && (
                <ZoneQuoteSummary
                    wizardState={Object.assign({}, wizardState, { selectedZones: selectedZones })}
                    onEditZone={handleEditZone}
                    onSubmitQuote={handleSubmitQuote}
                    onOrderNow={handleOrderNow}
                    onTalkToExpert={handleTalkToExpert}
                />
            )}

            {/* ---- Escape Hatch Modal (Task 5) ---- */}
            {/* Conditional render so the modal unmounts on close — resets internal
                success/error/upload state so a reopen never shows stale content. */}
            {showEscapeHatch && (
                <EscapeHatchModal
                    isOpen={showEscapeHatch}
                    trigger={escapeTrigger}
                    onClose={handleEscapeHatchClose}
                    onSubmit={handleEscapeHatchSubmit}
                />
            )}
        </div>
    );
};

export default WizardShell;
