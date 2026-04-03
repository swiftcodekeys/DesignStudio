import React, { useState, useEffect } from 'react';
import { House, SwimmingPool, Tree, MapPin, Buildings, GearSix, ArrowLeft, ArrowRight, Check, X, Plus } from '@phosphor-icons/react';
import { calculateQuote } from './pricingEngine';

var STORAGE_KEY = 'gv_quote_builder';
var STEPS = [
    { id: 'project', label: 'Your Project' },
    { id: 'layout', label: 'Layout' },
    { id: 'style', label: 'Style & Options' },
    { id: 'gates', label: 'Gates' },
    { id: 'extras', label: 'Extras' },
    { id: 'install', label: 'Install & Shipping' },
    { id: 'review', label: 'Review' },
    { id: 'confirm', label: 'Confirmation' },
];

var ICON_MAP = { backyard: House, pool: SwimmingPool, front: Tree, full: MapPin, commercial: Buildings, other: GearSix };

function buildQuoteConfig(data) {
    var totalFeet = 0;
    var worstTerrain = 'flat';
    var terrainRank = { flat: 0, slope: 1, steep: 2, mixed: 2 };

    (data.runs || []).forEach(function(run) {
        totalFeet += (parseFloat(run.lengthFt) || 0);
        if ((terrainRank[run.terrain] || 0) > (terrainRank[worstTerrain] || 0)) {
            worstTerrain = run.terrain;
        }
    });

    return {
        style: data.style || 'horizon',
        height: parseInt(data.height) || 48,
        grade: data.grade || 'residential',
        linearFeet: totalFeet || 100,
        corners: parseInt(data.corners) || 0,
        endCount: 2,
        gates: (data.gates || []).map(function(g) {
            return {
                type: g.type || 'walk',
                widthInches: parseInt(g.width) || 36,
                top: g.topStyle === 'arched' ? 'arch' : 'straight',
                hardware: null
            };
        }),
        postCap: data.postCap || 'flat',
        puppyPickets: !!(data.extras && data.extras.puppyPickets),
        finials: null,
        circles: !!(data.extras && data.extras.circles),
        terrain: worstTerrain
    };
}

var PROJECT_TYPES = [
    { id: 'backyard', label: 'Backyard' },
    { id: 'pool', label: 'Pool Area' },
    { id: 'front', label: 'Front Yard' },
    { id: 'full', label: 'Full Property' },
    { id: 'commercial', label: 'Commercial' },
    { id: 'other', label: 'Other' },
];

var FENCE_STYLES_LIST = [
    { id: 'horizon', name: 'Horizon', subtitle: 'Flat Top', heights: [48, 54, 60, 72] },
    { id: 'horizon-pro', name: 'Horizon Pro', subtitle: 'Heavy Duty Flat', heights: [48, 54, 60, 72] },
    { id: 'haven', name: 'Haven', subtitle: 'Pool Compliant', heights: [48, 54, 60], poolCompliant: true },
    { id: 'vanguard', name: 'Vanguard', subtitle: 'Flat + Spear', heights: [48, 54, 60, 72] },
    { id: 'charleston', name: 'Charleston', subtitle: 'Spear Top', heights: [48, 54, 60, 72] },
    { id: 'charleston-pro', name: 'Charleston Pro', subtitle: 'HD Spear Top', heights: [48, 54, 60, 72] },
    { id: 'savannah', name: 'Savannah', subtitle: 'Staggered Spear', heights: [48, 54, 60, 72] },
    { id: 'lexington', name: 'Lexington', subtitle: 'Convex', heights: [48, 54, 60, 72] },
    { id: 'cambridge', name: 'Cambridge', subtitle: 'Concave', heights: [48, 54, 60, 72] },
];

var COLORS_LIST = [
    { id: 'textured-black', name: 'Textured Black', hex: '#1a1a1a' },
    { id: 'textured-bronze', name: 'Textured Bronze', hex: '#5a4d3e' },
    { id: 'textured-white', name: 'Textured White', hex: '#e8e8e8' },
    { id: 'textured-khaki', name: 'Textured Khaki', hex: '#b8ac9f' },
    { id: 'silver', name: 'Silver (Premium)', hex: '#a8adb5' },
];

function loadQuoteData() {
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function saveQuoteData(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* */ }
}

var defaultData = {
    projectType: '',
    needsFence: true,
    needsGates: false,
    zip: '',
    runs: [{ label: '', lengthFt: 50, terrain: 'flat' }],
    corners: 0,
    style: '',
    height: 60,
    color: 'textured-black',
    picketSpacing: 'standard',
    postCap: 'flat',
    gates: [{ type: 'walk', width: '36', topStyle: 'flat', swing: 'left', selfClosing: false }],
    extras: {},
    installPlan: '',
    shippingAddress: '',
    timeline: '',
    name: '',
    email: '',
    phone: '',
    company: '',
};

// ============================================================
// Step Components
// ============================================================

var StepProject = function(props) {
    var data = props.data;
    var update = props.update;

    return (
        <div className="qb-step">
            <h3 className="qb-question">What are you fencing?</h3>
            <div className="qb-card-grid">
                {PROJECT_TYPES.map(function(pt) {
                    var IconComp = ICON_MAP[pt.id] || GearSix;
                    return (
                        <button
                            key={pt.id}
                            className={'qb-card' + (data.projectType === pt.id ? ' active' : '')}
                            onClick={function() { update({ projectType: pt.id }); }}
                        >
                            <IconComp size={24} weight={data.projectType === pt.id ? 'fill' : 'regular'} />
                            <span className="qb-card-label">{pt.label}</span>
                        </button>
                    );
                })}
            </div>

            <h3 className="qb-question">What do you need?</h3>
            <div className="qb-check-row">
                <label className="qb-check">
                    <input type="checkbox" checked={data.needsFence} onChange={function(e) { update({ needsFence: e.target.checked }); }} />
                    <span>Fence Panels</span>
                </label>
                <label className="qb-check">
                    <input type="checkbox" checked={data.needsGates} onChange={function(e) { update({ needsGates: e.target.checked }); }} />
                    <span>Gate(s)</span>
                </label>
            </div>

            <h3 className="qb-question">ZIP Code</h3>
            <input
                className="qb-input qb-input-short"
                type="text"
                value={data.zip}
                onChange={function(e) { update({ zip: e.target.value.replace(/\D/g, '').slice(0, 5) }); }}
                placeholder="48843"
                maxLength="5"
            />
        </div>
    );
};

var StepLayout = function(props) {
    var data = props.data;
    var update = props.update;

    // Check for pre-filled GPS data
    var gpsData = null;
    try {
        var raw = localStorage.getItem('gv_draw_layout');
        if (raw) gpsData = JSON.parse(raw);
    } catch (e) { /* */ }

    var totalFt = 0;
    data.runs.forEach(function(r) { totalFt += (r.lengthFt || 0); });

    var addRun = function() {
        if (data.runs.length >= 10) return;
        update({ runs: data.runs.concat([{ label: '', lengthFt: 50, terrain: 'flat' }]) });
    };

    var updateRun = function(idx, field, value) {
        var updated = data.runs.slice();
        updated[idx] = Object.assign({}, updated[idx], { [field]: value });
        update({ runs: updated });
    };

    var removeRun = function(idx) {
        var updated = data.runs.slice();
        updated.splice(idx, 1);
        update({ runs: updated });
    };

    var importGps = function() {
        if (!gpsData || !gpsData.lines) return;
        var runs = gpsData.lines.map(function(l) {
            return { label: l.label, lengthFt: l.lengthFt, terrain: 'flat' };
        });
        update({ runs: runs, corners: gpsData.corners || 0 });
    };

    return (
        <div className="qb-step">
            {gpsData && gpsData.totalLengthFt > 0 && (
                <div className="qb-gps-banner">
                    <strong>GPS layout detected!</strong> {gpsData.totalLengthFt} ft across {gpsData.lines.length} line(s) from {gpsData.address}
                    <button className="qb-gps-import" onClick={importGps}>Use This Layout</button>
                </div>
            )}

            <h3 className="qb-question">Your Fence Runs</h3>
            {data.runs.map(function(run, idx) {
                return (
                    <div key={idx} className="qb-run-card">
                        <div className="qb-run-header">
                            <input
                                className="qb-run-label"
                                value={run.label}
                                onChange={function(e) { updateRun(idx, 'label', e.target.value); }}
                                placeholder={'Run ' + (idx + 1) + ' (optional label)'}
                            />
                            {data.runs.length > 1 && (
                                <button className="qb-run-delete" onClick={function() { removeRun(idx); }}><X size={14} /></button>
                            )}
                        </div>
                        <div className="qb-run-fields">
                            <div className="qb-field-group">
                                <label>Length (ft)</label>
                                <input
                                    type="number"
                                    className="qb-input"
                                    min="10" max="300"
                                    value={run.lengthFt}
                                    onChange={function(e) { updateRun(idx, 'lengthFt', parseInt(e.target.value) || 0); }}
                                />
                            </div>
                            <div className="qb-field-group">
                                <label>Terrain</label>
                                <select
                                    className="qb-select"
                                    value={run.terrain}
                                    onChange={function(e) { updateRun(idx, 'terrain', e.target.value); }}
                                >
                                    <option value="flat">Flat</option>
                                    <option value="slope">Slope</option>
                                    <option value="hill">Hill</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            })}

            <button className="qb-add-btn" onClick={addRun} disabled={data.runs.length >= 10}><Plus size={14} /> Add Run</button>

            <div className="qb-run-total">
                {totalFt} linear feet across {data.runs.length} run{data.runs.length !== 1 ? 's' : ''}
            </div>

            <div className="qb-field-group" style={{ marginTop: 16 }}>
                <label>Number of corners</label>
                <input
                    type="number"
                    className="qb-input qb-input-short"
                    min="0" max="20"
                    value={data.corners}
                    onChange={function(e) { update({ corners: parseInt(e.target.value) || 0 }); }}
                />
            </div>
        </div>
    );
};

var StepStyle = function(props) {
    var data = props.data;
    var update = props.update;
    var isPool = data.projectType === 'pool';

    var styles = FENCE_STYLES_LIST.slice();
    if (isPool) {
        // Haven first for pool projects
        styles.sort(function(a, b) { return (b.poolCompliant ? 1 : 0) - (a.poolCompliant ? 1 : 0); });
    }

    var selectedStyle = FENCE_STYLES_LIST.find(function(s) { return s.id === data.style; });
    var heights = selectedStyle ? selectedStyle.heights : [48, 54, 60, 72];

    return (
        <div className="qb-step">
            <h3 className="qb-question">Fence Style</h3>
            <div className="qb-style-grid">
                {styles.map(function(s) {
                    return (
                        <button
                            key={s.id}
                            className={'qb-style-card' + (data.style === s.id ? ' active' : '')}
                            onClick={function() { update({ style: s.id }); }}
                        >
                            <div className="qb-style-name">{s.name}</div>
                            <div className="qb-style-sub">{s.subtitle}</div>
                            {isPool && s.poolCompliant && <span className="qb-pool-badge">Pool Compliant</span>}
                        </button>
                    );
                })}
            </div>

            <h3 className="qb-question">Height</h3>
            <div className="qb-toggle-row">
                {heights.map(function(h) {
                    return (
                        <button
                            key={h}
                            className={'qb-toggle' + (data.height === h ? ' active' : '')}
                            onClick={function() { update({ height: h }); }}
                        >
                            {h}" ({Math.round(h / 12)} ft)
                        </button>
                    );
                })}
            </div>

            <h3 className="qb-question">Color</h3>
            <div className="qb-color-row">
                {COLORS_LIST.map(function(c) {
                    return (
                        <button
                            key={c.id}
                            className={'qb-color-swatch' + (data.color === c.id ? ' active' : '')}
                            onClick={function() { update({ color: c.id }); }}
                            title={c.name}
                        >
                            <span className="qb-swatch-circle" style={{ backgroundColor: c.hex }} />
                            <span className="qb-swatch-label">{c.name}</span>
                        </button>
                    );
                })}
            </div>

            <h3 className="qb-question">Picket Spacing</h3>
            <div className="qb-toggle-row">
                <button className={'qb-toggle' + (data.picketSpacing === 'standard' ? ' active' : '')} onClick={function() { update({ picketSpacing: 'standard' }); }}>Standard</button>
                <button className={'qb-toggle' + (data.picketSpacing === 'puppy' ? ' active' : '')} onClick={function() { update({ picketSpacing: 'puppy' }); }}>Puppy Picket</button>
            </div>

            <h3 className="qb-question">Post Cap</h3>
            <div className="qb-toggle-row">
                <button className={'qb-toggle' + (data.postCap === 'flat' ? ' active' : '')} onClick={function() { update({ postCap: 'flat' }); }}>Flat</button>
                <button className={'qb-toggle' + (data.postCap === 'ball' ? ' active' : '')} onClick={function() { update({ postCap: 'ball' }); }}>Ball</button>
            </div>
        </div>
    );
};

var StepGates = function(props) {
    var data = props.data;
    var update = props.update;

    if (!data.needsGates) {
        return (
            <div className="qb-step">
                <div className="qb-empty-state">
                    <p>You indicated you don't need gates. Click Next to continue, or go back to add gates.</p>
                </div>
            </div>
        );
    }

    var addGate = function() {
        update({ gates: data.gates.concat([{ type: 'walk', width: '36', topStyle: 'flat', swing: 'left', selfClosing: data.projectType === 'pool' }]) });
    };

    var updateGate = function(idx, field, value) {
        var updated = data.gates.slice();
        updated[idx] = Object.assign({}, updated[idx], { [field]: value });
        update({ gates: updated });
    };

    var removeGate = function(idx) {
        var updated = data.gates.slice();
        updated.splice(idx, 1);
        update({ gates: updated });
    };

    return (
        <div className="qb-step">
            <h3 className="qb-question">Your Gates</h3>
            {data.gates.map(function(gate, idx) {
                return (
                    <div key={idx} className="qb-run-card">
                        <div className="qb-run-header">
                            <span className="qb-run-label-text">Gate {idx + 1}</span>
                            {data.gates.length > 1 && (
                                <button className="qb-run-delete" onClick={function() { removeGate(idx); }}><X size={14} /></button>
                            )}
                        </div>
                        <div className="qb-run-fields">
                            <div className="qb-field-group">
                                <label>Type</label>
                                <select className="qb-select" value={gate.type} onChange={function(e) { updateGate(idx, 'type', e.target.value); }}>
                                    <option value="walk">Walk Gate</option>
                                    <option value="drive">Drive Gate</option>
                                    <option value="double">Double Gate</option>
                                    <option value="estate">Estate Gate</option>
                                </select>
                            </div>
                            <div className="qb-field-group">
                                <label>Width</label>
                                <select className="qb-select" value={gate.width} onChange={function(e) { updateGate(idx, 'width', e.target.value); }}>
                                    <option value="36">36"</option>
                                    <option value="42">42"</option>
                                    <option value="48">48"</option>
                                    <option value="60">60" (5 ft)</option>
                                    <option value="72">72" (6 ft)</option>
                                    <option value="96">96" (8 ft)</option>
                                    <option value="120">120" (10 ft)</option>
                                </select>
                            </div>
                        </div>
                        <div className="qb-run-fields">
                            <div className="qb-field-group">
                                <label>Top Style</label>
                                <div className="qb-toggle-row">
                                    <button className={'qb-toggle-sm' + (gate.topStyle === 'flat' ? ' active' : '')} onClick={function() { updateGate(idx, 'topStyle', 'flat'); }}>Flat</button>
                                    <button className={'qb-toggle-sm' + (gate.topStyle === 'arched' ? ' active' : '')} onClick={function() { updateGate(idx, 'topStyle', 'arched'); }}>Arched</button>
                                </div>
                            </div>
                            <div className="qb-field-group">
                                <label>Swing</label>
                                <div className="qb-toggle-row">
                                    <button className={'qb-toggle-sm' + (gate.swing === 'left' ? ' active' : '')} onClick={function() { updateGate(idx, 'swing', 'left'); }}>Left</button>
                                    <button className={'qb-toggle-sm' + (gate.swing === 'right' ? ' active' : '')} onClick={function() { updateGate(idx, 'swing', 'right'); }}>Right</button>
                                </div>
                            </div>
                        </div>
                        <label className="qb-check" style={{ marginTop: 8 }}>
                            <input type="checkbox" checked={gate.selfClosing} onChange={function(e) { updateGate(idx, 'selfClosing', e.target.checked); }} />
                            <span>Self-closing {data.projectType === 'pool' && '(required for pool)'}</span>
                        </label>
                    </div>
                );
            })}
            <button className="qb-add-btn" onClick={addGate}><Plus size={14} /> Add Gate</button>
        </div>
    );
};

var StepExtras = function(props) {
    var data = props.data;
    var update = props.update;
    var extras = data.extras || {};

    var toggle = function(key) {
        var updated = Object.assign({}, extras, { [key]: !extras[key] });
        update({ extras: updated });
    };

    return (
        <div className="qb-step">
            <h3 className="qb-question">Decorative Upgrades</h3>
            <div className="qb-check-col">
                <label className="qb-check"><input type="checkbox" checked={!!extras.circles} onChange={function() { toggle('circles'); }} /><span>Circle Accents</span></label>
                <label className="qb-check"><input type="checkbox" checked={!!extras.butterflies} onChange={function() { toggle('butterflies'); }} /><span>Butterfly Accents</span></label>
                <label className="qb-check"><input type="checkbox" checked={!!extras.scrolls} onChange={function() { toggle('scrolls'); }} /><span>Scroll Accents</span></label>
                <label className="qb-check"><input type="checkbox" checked={!!extras.touchUpPaint} onChange={function() { toggle('touchUpPaint'); }} /><span>Touch-up Paint Kit</span></label>
                <label className="qb-check"><input type="checkbox" checked={!!extras.dropRod} onChange={function() { toggle('dropRod'); }} /><span>Drop Rod (double gates)</span></label>
            </div>
        </div>
    );
};

var StepInstall = function(props) {
    var data = props.data;
    var update = props.update;

    return (
        <div className="qb-step">
            <h3 className="qb-question">Installation Plan</h3>
            <div className="qb-toggle-row">
                <button className={'qb-toggle' + (data.installPlan === 'diy' ? ' active' : '')} onClick={function() { update({ installPlan: 'diy' }); }}>DIY</button>
                <button className={'qb-toggle' + (data.installPlan === 'contractor' ? ' active' : '')} onClick={function() { update({ installPlan: 'contractor' }); }}>Hiring Contractor</button>
                <button className={'qb-toggle' + (data.installPlan === 'help' ? ' active' : '')} onClick={function() { update({ installPlan: 'help' }); }}>Need Help</button>
            </div>

            <h3 className="qb-question">Shipping Address</h3>
            <input className="qb-input" type="text" value={data.shippingAddress} onChange={function(e) { update({ shippingAddress: e.target.value }); }} placeholder="Street, City, State, ZIP" />

        </div>
    );
};

var StepReview = function(props) {
    var data = props.data;
    var goToStep = props.goToStep;

    var totalFt = 0;
    data.runs.forEach(function(r) { totalFt += (r.lengthFt || 0); });

    var selectedStyle = FENCE_STYLES_LIST.find(function(s) { return s.id === data.style; });
    var selectedColor = COLORS_LIST.find(function(c) { return c.id === data.color; });

    return (
        <div className="qb-step">
            <h3 className="qb-question">Review Your Quote Request</h3>

            <div className="qb-review-section">
                <div className="qb-review-header">
                    <span>Project</span>
                    <button className="qb-edit-link" onClick={function() { goToStep(0); }}>Edit</button>
                </div>
                <div className="qb-review-body">
                    {data.projectType || 'Not specified'} | ZIP: {data.zip || '—'}
                </div>
            </div>

            <div className="qb-review-section">
                <div className="qb-review-header">
                    <span>Layout</span>
                    <button className="qb-edit-link" onClick={function() { goToStep(1); }}>Edit</button>
                </div>
                <div className="qb-review-body">
                    {totalFt} linear ft | {data.runs.length} run(s) | {data.corners} corner(s)
                </div>
            </div>

            <div className="qb-review-section">
                <div className="qb-review-header">
                    <span>Style & Options</span>
                    <button className="qb-edit-link" onClick={function() { goToStep(2); }}>Edit</button>
                </div>
                <div className="qb-review-body">
                    {selectedStyle ? selectedStyle.name : '—'} | {data.height}" | {selectedColor ? selectedColor.name : '—'} | {data.picketSpacing} | {data.postCap} cap
                </div>
            </div>

            {data.needsGates && (
                <div className="qb-review-section">
                    <div className="qb-review-header">
                        <span>Gates</span>
                        <button className="qb-edit-link" onClick={function() { goToStep(3); }}>Edit</button>
                    </div>
                    <div className="qb-review-body">
                        {data.gates.length} gate(s): {data.gates.map(function(g) { return g.type + ' ' + g.width + '"'; }).join(', ')}
                    </div>
                </div>
            )}

            <div className="qb-review-section">
                <div className="qb-review-header">
                    <span>Installation</span>
                    <button className="qb-edit-link" onClick={function() { goToStep(5); }}>Edit</button>
                </div>
                <div className="qb-review-body">
                    {data.installPlan || '—'}
                </div>
            </div>

            <h3 className="qb-question" style={{ marginTop: 24 }}>Your Contact Info</h3>
            <div className="qb-contact-fields">
                <input className="qb-input" placeholder="Full Name *" value={data.name} onChange={function(e) { props.update({ name: e.target.value }); }} />
                <input className="qb-input" placeholder="Email *" type="email" value={data.email} onChange={function(e) { props.update({ email: e.target.value }); }} />
                <input className="qb-input" placeholder="Phone" type="tel" value={data.phone} onChange={function(e) { props.update({ phone: e.target.value }); }} />
                <input className="qb-input" placeholder="Company (optional)" value={data.company} onChange={function(e) { props.update({ company: e.target.value }); }} />
            </div>
        </div>
    );
};

var StepQuoteDisplay = function(props) {
    var quoteId = props.quoteId;
    var result = props.quoteResult;
    var data = props.data;
    var onBackToStudio = props.onBackToStudio;

    return (
        <div className="qb-step qb-quote-display">
            <div className="qb-quote-header">
                <div className="qb-confirm-icon"><Check size={32} weight="bold" /></div>
                <h2>Your Itemized Quote</h2>
                <p className="qb-confirm-ref">Reference: <strong>{quoteId}</strong></p>
            </div>

            <div className="qb-quote-table">
                <div className="qb-quote-row qb-quote-row-header">
                    <span className="qb-quote-col-item">Item</span>
                    <span className="qb-quote-col-qty">Qty</span>
                    <span className="qb-quote-col-unit">Unit</span>
                    <span className="qb-quote-col-total">Total</span>
                </div>
                {result.items.map(function(item, i) {
                    return (
                        <div className="qb-quote-row" key={i}>
                            <span className="qb-quote-col-item">
                                {item.label}
                                {item.note && <small className="qb-quote-note">{item.note}</small>}
                            </span>
                            <span className="qb-quote-col-qty">{item.qty}</span>
                            <span className="qb-quote-col-unit">{'$' + item.unitPrice.toFixed(2)}</span>
                            <span className="qb-quote-col-total">{'$' + item.total.toFixed(2)}</span>
                        </div>
                    );
                })}
                <div className="qb-quote-row qb-quote-row-subtotal">
                    <span className="qb-quote-col-item">Subtotal</span>
                    <span className="qb-quote-col-qty"></span>
                    <span className="qb-quote-col-unit"></span>
                    <span className="qb-quote-col-total">{'$' + result.subtotal.toFixed(2)}</span>
                </div>
            </div>

            {result.warnings.length > 0 && (
                <div className="qb-quote-warnings">
                    {result.warnings.map(function(w, i) { return <p key={i}>{w}</p>; })}
                </div>
            )}

            <p className="qb-quote-followup">We'll follow up at <strong>{data.email}</strong> within 1 business day.</p>

            <div className="qb-quote-actions">
                <a className="qb-action-btn qb-action-primary" href="tel:8553362330">
                    Talk to an Expert — (855) FENCE-30
                </a>
                <button className="qb-action-btn qb-action-disabled" disabled>
                    Buy Now — Coming Soon
                </button>
                <button className="qb-action-btn qb-action-secondary" onClick={onBackToStudio}>
                    Back to Design Studio
                </button>
            </div>
        </div>
    );
};

var StepConfirm = function(props) {
    var quoteId = props.quoteId;

    return (
        <div className="qb-step qb-confirm">
            <div className="qb-confirm-icon"><Check size={32} weight="bold" /></div>
            <h2>Thanks! We'll email your detailed quote within 1 business day.</h2>
            <p className="qb-confirm-ref">Your quote reference: <strong>{quoteId}</strong></p>
            <div className="qb-confirm-phone">
                Call us: <strong>(855) FENCE-30</strong>
                <br /><span>(855) 336-2330</span>
            </div>
            <button className="qb-confirm-back" onClick={props.onBackToStudio}>
                Browse fence styles while you wait <ArrowRight size={14} />
            </button>
        </div>
    );
};

// ============================================================
// Main Quote Builder
// ============================================================
var QuoteBuilder = function(props) {
    var onClose = props.onClose;

    var saved = loadQuoteData();
    var dataState = useState(Object.assign({}, defaultData, saved || {}));
    var data = dataState[0];
    var setData = dataState[1];
    if (!data.runs) data.runs = [];
    if (!data.gates) data.gates = [];

    // Read initialStep from saved data (set by handleSkipToManualEntry)
    var startStep = (saved && saved.initialStep) || 0;
    // Clear it so it doesn't persist on next open
    if (saved && saved.initialStep != null) {
        delete saved.initialStep;
        saveQuoteData(saved);
    }
    var stepState = useState(startStep);
    var step = stepState[0];
    var setStep = stepState[1];

    var quoteIdState = useState('');
    var quoteId = quoteIdState[0];
    var setQuoteId = quoteIdState[1];

    var quoteResultState = useState(null);
    var quoteResult = quoteResultState[0];
    var setQuoteResult = quoteResultState[1];

    // Auto-apply pool defaults
    useEffect(function() {
        if (data.projectType === 'pool') {
            var needsUpdate = false;
            var updates = {};
            if (!data.style || data.style === '') {
                updates.style = 'haven';
                needsUpdate = true;
            }
            if (data.gates.length > 0 && !data.gates[0].selfClosing) {
                var updatedGates = data.gates.map(function(g) {
                    return Object.assign({}, g, { selfClosing: true });
                });
                updates.gates = updatedGates;
                needsUpdate = true;
            }
            if (needsUpdate) {
                setData(function(prev) { return Object.assign({}, prev, updates); });
            }
        }
    }, [data.projectType]);

    // Save on every change
    useEffect(function() {
        saveQuoteData(data);
    }, [data]);

    var update = function(changes) {
        setData(function(prev) { return Object.assign({}, prev, changes); });
    };

    var goToStep = function(idx) { setStep(idx); };

    var handleNext = function() {
        if (step < STEPS.length - 2) {
            setStep(step + 1);
        }
    };

    var handleBack = function() {
        if (step > 0) setStep(step - 1);
    };

    var handleSubmit = function() {
        // Generate quote ID
        var id = 'GV-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        setQuoteId(id);

        // Calculate itemized quote
        var quoteConfig = buildQuoteConfig(data);
        var result = calculateQuote(quoteConfig);
        setQuoteResult(result);

        // Build mailto as backup
        var totalFt = 0;
        data.runs.forEach(function(r) { totalFt += (r.lengthFt || 0); });
        var selectedStyle = FENCE_STYLES_LIST.find(function(s) { return s.id === data.style; });
        var selectedColor = COLORS_LIST.find(function(c) { return c.id === data.color; });

        var summary = [
            'Quote Reference: ' + id,
            'Project Type: ' + data.projectType,
            'ZIP: ' + data.zip,
            'Total Footage: ' + totalFt + ' ft (' + data.runs.length + ' runs, ' + data.corners + ' corners)',
            'Style: ' + (selectedStyle ? selectedStyle.name : data.style),
            'Height: ' + data.height + '"',
            'Color: ' + (selectedColor ? selectedColor.name : data.color),
            'Pickets: ' + data.picketSpacing,
            'Post Cap: ' + data.postCap,
        ];

        if (data.needsGates) {
            summary.push('Gates: ' + data.gates.map(function(g) { return g.type + ' ' + g.width + '" ' + g.topStyle; }).join('; '));
        }

        var extrasList = Object.keys(data.extras).filter(function(k) { return data.extras[k]; });
        if (extrasList.length) summary.push('Extras: ' + extrasList.join(', '));

        summary.push('Install: ' + data.installPlan);

        summary.push('Shipping: ' + data.shippingAddress);
        summary.push('');
        summary.push('Name: ' + data.name);
        summary.push('Email: ' + data.email);
        summary.push('Phone: ' + data.phone);
        if (data.company) summary.push('Company: ' + data.company);

        var subject = encodeURIComponent('Grandview Fence Quote Request — ' + id);
        var body = encodeURIComponent(summary.join('\n'));
        window.location.href = 'mailto:sales@grandviewfence.com?subject=' + subject + '&body=' + body;

        // Store with ID
        try {
            localStorage.setItem('gv_quote_' + id, JSON.stringify(Object.assign({}, data, { quoteId: id, submitted: new Date().toISOString() })));
        } catch (e) { /* */ }

        setStep(STEPS.length - 1);
    };

    var renderStep = function() {
        switch (step) {
            case 0: return <StepProject data={data} update={update} />;
            case 1: return <StepLayout data={data} update={update} />;
            case 2: return <StepStyle data={data} update={update} />;
            case 3: return <StepGates data={data} update={update} />;
            case 4: return <StepExtras data={data} update={update} />;
            case 5: return <StepInstall data={data} update={update} />;
            case 6: return <StepReview data={data} update={update} goToStep={goToStep} />;
            case 7: return quoteResult
                ? <StepQuoteDisplay quoteId={quoteId} quoteResult={quoteResult} data={data} onBackToStudio={onClose} />
                : <StepConfirm quoteId={quoteId} onBackToStudio={onClose} />;
            default: return null;
        }
    };

    var isConfirm = step === STEPS.length - 1;
    var isReview = step === STEPS.length - 2;

    return (
        <div className="qb-shell">
            {/* Progress Bar */}
            <div className="qb-progress">
                {STEPS.map(function(s, i) {
                    var cls = 'qb-progress-step';
                    if (i < step) cls += ' done';
                    if (i === step) cls += ' active';
                    return (
                        <button
                            key={s.id}
                            className={cls}
                            onClick={function() { if (i < step && !isConfirm) goToStep(i); }}
                            disabled={i >= step || isConfirm}
                        >
                            <span className="qb-progress-num">{i < step ? <Check size={12} weight="bold" /> : (i + 1)}</span>
                            <span className="qb-progress-label">{s.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="qb-content">
                {renderStep()}
            </div>

            {/* Footer */}
            {!isConfirm && (
                <div className="qb-footer">
                    <div className="qb-footer-left">
                        {step > 0 && (
                            <button className="qb-back-btn" onClick={handleBack}><ArrowLeft size={14} /> Back</button>
                        )}
                    </div>
                    <div className="qb-footer-center">
                        <span className="qb-escape">Prefer to talk? <strong>(855) FENCE-30</strong></span>
                    </div>
                    <div className="qb-footer-right">
                        {isReview ? (
                            <button className="qb-submit-btn" onClick={handleSubmit} disabled={!data.name || !data.email}>
                                Get My Quote <ArrowRight size={14} />
                            </button>
                        ) : (
                            <button className="qb-next-btn" onClick={handleNext}>
                                Next <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuoteBuilder;
