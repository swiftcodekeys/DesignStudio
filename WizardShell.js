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

var GateYesIcon = function() {
    return (
        <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="8" width="6" height="40" rx="1" />
            <rect x="46" y="8" width="6" height="40" rx="1" />
            <line x1="10" y1="18" x2="46" y2="18" />
            <line x1="10" y1="38" x2="46" y2="38" />
            <line x1="20" y1="12" x2="20" y2="44" />
            <line x1="28" y1="10" x2="28" y2="44" />
            <line x1="36" y1="12" x2="36" y2="44" />
        </svg>
    );
};

var NoGateIcon = function() {
    return (
        <svg viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="8" x2="48" y2="48" />
            <rect x="12" y="14" width="32" height="28" rx="2" strokeDasharray="4 3" />
            <line x1="28" y1="14" x2="28" y2="42" strokeDasharray="4 3" />
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

/* ---- Step names for progress bar ---- */
var STEP_NAMES = ['Select zones', 'Configure', 'Gates', 'Measure'];

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
            height: '54',
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

    // Wizard state
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

    var gateAnswerState = useState(null);
    var gateAnswer = gateAnswerState[0];
    var setGateAnswer = gateAnswerState[1];

    var rendererReadyState = useState(false);
    var rendererReady = rendererReadyState[0];
    var setRendererReady = rendererReadyState[1];

    // Pool compliance state
    var poolPopupState = useState(false);
    var showPoolPopup = poolPopupState[0];
    var setShowPoolPopup = poolPopupState[1];

    var poolAnsweredState = useState(false);
    var poolAnswered = poolAnsweredState[0];
    var setPoolAnswered = poolAnsweredState[1];

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

    // Calculate total steps (skip gate question if gate already selected)
    var zoneOrder = ['front', 'back', 'gate'];
    var sortedZones = selectedZones.slice().sort(function(a, b) {
        return zoneOrder.indexOf(a) - zoneOrder.indexOf(b);
    });
    var hasGateZone = selectedZones.indexOf('gate') >= 0;
    var fenceZones = selectedZones.filter(function(z) { return z !== 'gate'; });
    var totalSteps = hasGateZone ? 3 : 4; // zone, configure, (gates?), measure
    var stepNames = ['Select zones'];
    stepNames.push('Configure');
    if (!hasGateZone) stepNames.push('Gates');
    stepNames.push('Measure');

    var progressPercent = (step / totalSteps) * 100;

    // Zone toggle
    var toggleZone = function(zoneId) {
        setSelectedZones(function(prev) {
            var idx = prev.indexOf(zoneId);
            if (idx >= 0) {
                return prev.filter(function(z) { return z !== zoneId; });
            }
            return prev.concat([zoneId]);
        });
    };

    // Config change handler for current zone
    var handleConfigChange = function(newConfig) {
        setZoneConfigs(function(prev) {
            var updated = Object.assign({}, prev);
            var current = updated[currentZone] || {};
            updated[currentZone] = typeof newConfig === 'function' ? newConfig(current) : newConfig;
            return updated;
        });
    };

    // Mark current zone as configured and move to next
    var handleZoneNext = function() {
        setZonesConfigured(function(prev) {
            var updated = Object.assign({}, prev);
            updated[currentZone] = true;
            return updated;
        });

        // Find next unconfigured zone
        var allZones = sortedZones;
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
            // All zones configured, move to next step
            if (!hasGateZone) {
                setStep(3); // Gates question
            } else {
                setStep(hasGateZone ? 3 : 4); // Measure
            }
        }
    };

    // Escape to full configurator
    var handleEscape = function() {
        try {
            if (zoneConfigs.front) localStorage.setItem('gv_fence_config', JSON.stringify(zoneConfigs.front));
            if (zoneConfigs.back) localStorage.setItem('gv_back_config', JSON.stringify(zoneConfigs.back));
            if (zoneConfigs.gate) localStorage.setItem('gv_config', JSON.stringify(zoneConfigs.gate));
        } catch (e) { /* */ }
        navigate('/studio');
    };

    // Confirm before leaving if wizard has progress
    var handleLogoClick = function() {
        if (step > 1 || selectedZones.length > 0) {
            if (window.confirm('Leave wizard? Your progress will be saved.')) {
                navigate('/');
            }
        } else {
            navigate('/');
        }
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
                        Step {step} of {totalSteps}
                        <span className="wizard-step-name"> &mdash; {stepNames[step - 1] || ''}</span>
                    </span>
                </div>
                <div className="wizard-progress-bar">
                    <div className="wizard-progress-fill" style={{ width: progressPercent + '%' }} />
                </div>
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
                        <div className="wizard-pool-inline">
                            <div className="wizard-pool-question">
                                <strong>Pool Safety:</strong> Is any part of your backyard fence around a pool?
                            </div>
                            <div className="wizard-pool-btns">
                                <button className={'wizard-pool-btn' + (poolAnswered === 'yes' ? ' active' : '')} onClick={function() { setPoolAnswered('yes'); setShowPoolPopup(true); }}>
                                    Yes
                                </button>
                                <button className={'wizard-pool-btn' + (poolAnswered === 'no' ? ' active' : '')} onClick={function() { setPoolAnswered('no'); }}>
                                    No
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="wizard-actions">
                        <button
                            className="wizard-btn-primary"
                            disabled={selectedZones.length === 0}
                            onClick={function() {
                                // If backyard selected and pool not answered, prompt
                                if (selectedZones.indexOf('back') >= 0 && !poolAnswered) {
                                    setShowPoolPopup(true);
                                    return;
                                }
                                setCurrentZone(sortedZones[0]);
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

            {/* Pool Compliance Popup */}
            {showPoolPopup && (
                <PoolCompliancePopup
                    currentStyleId={zoneConfigs.back ? zoneConfigs.back.styleId : 'uab_200'}
                    onComplete={function(result) {
                        setShowPoolPopup(false);
                        setPoolAnswered(result.poolBarrier ? 'yes' : 'no');
                        // Save pool data to backyard config
                        setZoneConfigs(function(prev) {
                            var updated = Object.assign({}, prev);
                            var back = updated.back || getDefaultConfig('back');
                            back.poolBarrier = result.poolBarrier;
                            back.poolCompliance = result.poolCompliance;
                            updated.back = back;
                            return updated;
                        });
                        // If pool answered, proceed to step 2
                        setCurrentZone(sortedZones[0]);
                        setStep(2);
                    }}
                    onCancel={function() {
                        setShowPoolPopup(false);
                        setPoolAnswered('no');
                    }}
                />
            )}

            {/* ---- Step 2: Configure Each Zone ---- */}
            {step === 2 && activeConfig && (
                <div className="wizard-configure">
                    <div className="wizard-configure-left">
                        {/* Zone pills (if multiple zones) */}
                        {selectedZones.length > 1 && (
                            <div className="wizard-zone-pills">
                                {sortedZones.map(function(zoneId) {
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
                                {selectedZones.length > 1 && ' (' + (sortedZones.indexOf(currentZone) + 1) + ' of ' + sortedZones.length + ')'}
                            </div>
                            <div className="wizard-config-title">Choose Your Style</div>
                        </div>

                        {/* Tab content: Style, Color, Size */}
                        <div className="wizard-config-panel">
                            <StyleTab
                                config={activeConfig}
                                onConfigChange={handleConfigChange}
                                isFence={!isGateConfig}
                            />
                            <div style={{ marginTop: 24, borderTop: '1px solid #E8E8E8', paddingTop: 20 }}>
                                <ColorTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                            </div>
                            <div style={{ marginTop: 24, borderTop: '1px solid #E8E8E8', paddingTop: 20 }}>
                                <SizeTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                            </div>
                            <div style={{ marginTop: 24, borderTop: '1px solid #E8E8E8', paddingTop: 20 }}>
                                <DetailsTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                            </div>
                            <div style={{ marginTop: 24, borderTop: '1px solid #E8E8E8', paddingTop: 20 }}>
                                <PuppyPicketsTab config={activeConfig} onConfigChange={handleConfigChange} isFence={!isGateConfig} />
                            </div>
                            {!isGateConfig ? null : (
                                <div style={{ marginTop: 24, borderTop: '1px solid #E8E8E8', paddingTop: 20 }}>
                                    <OptionsTab config={activeConfig} onConfigChange={handleConfigChange} />
                                </div>
                            )}
                        </div>

                        {/* Footer with nav */}
                        <div className="wizard-config-footer">
                            <button
                                className="wizard-btn-back"
                                onClick={function() {
                                    var idx = sortedZones.indexOf(currentZone);
                                    if (idx > 0) {
                                        setCurrentZone(sortedZones[idx - 1]);
                                    } else {
                                        setStep(1);
                                    }
                                }}
                            >
                                &larr; Back
                            </button>
                            <button className="wizard-btn-primary" onClick={handleZoneNext}>
                                {zonesConfigured[currentZone] || sortedZones.indexOf(currentZone) === sortedZones.length - 1
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

            {/* ---- Step 3: Gate Exploration (educational, not blocking) ---- */}
            {step === 3 && !hasGateZone && (
                <div className="wizard-gate-explore">
                    <h2 className="wizard-step-title">Take a Look at Your Gate Options</h2>
                    <p className="wizard-step-desc">
                        Most homeowners add a walk gate or drive gate. Take a look — if you see something you like, we'll add it to your quote.
                    </p>

                    <div className="wizard-gate-cards">
                        <div className="wizard-gate-card">
                            <img src="assets/ifence_previews/gate_styles/san_marino_15.png" alt="Walk Gate" className="wizard-gate-img" />
                            <div className="wizard-gate-card-body">
                                <div className="wizard-gate-card-title">Walk Gate</div>
                                <div className="wizard-gate-card-desc">36" to 72" wide. Single-leaf pedestrian gate.</div>
                                <div className="wizard-gate-card-tag">Most common — included in instant quote</div>
                            </div>
                        </div>
                        <div className="wizard-gate-card">
                            <img src="assets/ifence_previews/gate_styles/san_marino_15.png" alt="Drive Gate" className="wizard-gate-img" />
                            <div className="wizard-gate-card-body">
                                <div className="wizard-gate-card-title">Double Drive Gate</div>
                                <div className="wizard-gate-card-desc">72" to 144" wide. Standard vehicle access.</div>
                                <div className="wizard-gate-card-tag">Standard — included in instant quote</div>
                            </div>
                        </div>
                    </div>

                    <div className="wizard-gate-custom">
                        <strong>Estate &amp; Cantilever Gates</strong> — Custom order. <button className="wizard-gate-custom-link" onClick={function() {}}>Contact us for pricing</button>
                    </div>

                    <div className="wizard-gate-actions">
                        <button className="wizard-gate-explore-btn" onClick={function() {
                            setGateAnswer('yes');
                            var newZones = selectedZones.concat(['gate']);
                            setSelectedZones(newZones);
                            setCurrentZone('gate');
                            setZoneConfigs(function(prev) {
                                var updated = Object.assign({}, prev);
                                if (!updated.gate) updated.gate = getDefaultConfig('gate');
                                return updated;
                            });
                            setStep(2);
                        }}>
                            Yes, configure a gate now
                        </button>
                        <button className="wizard-gate-skip-btn" onClick={function() {
                            setGateAnswer('no');
                            setStep(hasGateZone ? 3 : 4);
                        }}>
                            I'll add my gates with my instant quote &rarr;
                        </button>
                    </div>
                </div>
            )}

            {/* ---- Step 3 (with gate) or Step 4: Measure ---- */}
            {((step === 3 && hasGateZone) || step === 4) && (
                <div className="wizard-content">
                    <h1 className="zone-heading">Measure your property</h1>
                    <p className="zone-subhead">
                        Draw your fence line on the map, or enter measurements manually.
                    </p>
                    <div className="wizard-actions" style={{ marginTop: 24 }}>
                        <button
                            className="wizard-btn-primary"
                            onClick={function() {
                                // Save all zone configs to localStorage
                                try {
                                    if (zoneConfigs.front) localStorage.setItem('gv_fence_config', JSON.stringify(zoneConfigs.front));
                                    if (zoneConfigs.back) localStorage.setItem('gv_back_config', JSON.stringify(zoneConfigs.back));
                                    if (zoneConfigs.gate) localStorage.setItem('gv_config', JSON.stringify(zoneConfigs.gate));
                                } catch (e) { /* */ }
                                try { localStorage.setItem('gv_start_scene', 'draw'); } catch (e) { /* */ }
                                navigate('/studio');
                            }}
                        >
                            Open Draw Your Yard &rarr;
                        </button>
                        <button className="wizard-btn-secondary" onClick={function() {
                            try {
                                if (zoneConfigs.front) localStorage.setItem('gv_fence_config', JSON.stringify(zoneConfigs.front));
                                if (zoneConfigs.back) localStorage.setItem('gv_back_config', JSON.stringify(zoneConfigs.back));
                                if (zoneConfigs.gate) localStorage.setItem('gv_config', JSON.stringify(zoneConfigs.gate));
                            } catch (e) { /* */ }
                            navigate('/studio');
                        }}>
                            Skip &mdash; I will enter measurements manually
                        </button>
                        <div style={{ marginTop: 16 }}>
                            <button className="wizard-btn-back" onClick={function() {
                                if (!hasGateZone) {
                                    setStep(3);
                                } else {
                                    setStep(2);
                                }
                            }}>
                                &larr; Back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WizardShell;
