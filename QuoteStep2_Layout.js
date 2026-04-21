// QuoteStep2_Layout.js — Layout & Posts step for QuoteBuilder
// React.createElement, var, function declarations, vanilla CSS

import React, { useState, useEffect } from 'react';
import { Mountains, WaveSine, Minus, Plus, Trash, CaretDown, CaretUp, Check, Warning } from '@phosphor-icons/react';
import InfoPopup from './InfoPopup';
import { PRIVACY_RACKABLE } from './retailPricing';

// ---- Helpers ----
function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

function sectionHeader(title, infoProps) {
  return el('div', { className: 'qs1-section-header' },
    el('h4', { className: 'qs1-section-title' }, title),
    infoProps ? React.createElement(InfoPopup, infoProps) : null
  );
}

var TERRAIN_OPTIONS = [
  { id: 'flat',   name: 'Flat',   desc: 'Level ground, no grade changes', icon: Minus },
  { id: 'sloped', name: 'Sloped', desc: 'Consistent uphill or downhill grade', icon: Mountains },
  { id: 'mixed',  name: 'Mixed',  desc: 'Some flat, some sloped sections', icon: WaveSine },
];

var RACKING_TIERS = [
  { id: 'standard',       name: 'Standard',        desc: 'Follow slopes up to 6 inches per panel' },
  { id: 'rackable',       name: 'Rackable',         desc: 'Follow slopes up to 20 inches per panel. Requires double-punched rails' },
  { id: 'heavy-rackable', name: 'Heavy Rackable',   desc: 'Follow slopes up to 36 inches per panel. Requires double-punched rails' },
];

var POST_SIZES = {
  residential: '2" x 2"',
  commercial:  '2.5" x 2.5"',
  industrial:  '3" x 3"',
};

// ============================================================
// QuoteStep2_Layout Component
// ============================================================
function QuoteStep2_Layout(props) {
  var data = props.data;
  var update = props.update;
  var drawToolData = props.drawToolData;

  // Local state
  var advancedState = useState(false);
  var advancedMode = advancedState[0];
  var setAdvancedMode = advancedState[1];

  // Initialize layout defaults
  var linearFeet = data.linearFeet || (drawToolData ? Math.round(drawToolData.totalFeet) : 100);
  var terrain = data.terrain || 'flat';
  var slopeMethod = data.slopeMethod || 'racked';
  var rackingTier = data.rackingTier || 'standard';
  var corners = data.corners || 0;
  var ends = data.ends != null ? data.ends : 2;
  var sharpAngles = data.sharpAngles || 0;
  var gentleCurves = !!data.gentleCurves;

  // Runs for advanced mode
  var runsState = useState(function() {
    if (data.runs && data.runs.length) return data.runs;
    if (drawToolData && drawToolData.segments && drawToolData.segments.length) {
      return drawToolData.segments.map(function(seg, i) {
        return { label: seg.label || ('Run ' + (i + 1)), length: seg.length || 0, terrain: seg.terrain || 'flat' };
      });
    }
    return [{ label: 'Run 1', length: linearFeet, terrain: terrain }];
  });
  var runs = runsState[0];
  var setRuns = runsState[1];

  // Auto-expand advanced mode if draw tool has multiple segments
  useEffect(function() {
    if (drawToolData && drawToolData.segments && drawToolData.segments.length > 1) {
      setAdvancedMode(true);
    }
    // Seed data.slopedPostCount from drawToolData on mount so downstream
    // pricing (priceCalculator.js) can charge the $4.75 racking surcharge
    // only on posts belonging to rackable segments. Don't clobber a value
    // the parent has already set (manual-entry callers keep their own).
    if (drawToolData && drawToolData.slopedPostCount != null && data.slopedPostCount == null) {
      update({ slopedPostCount: drawToolData.slopedPostCount });
    }
  }, []);

  // Absorb draw-tool metadata into wizard data (Task 1.9.3):
  //   - Mark _source='auto' so priceCalculator applies the 5% material pad.
  //   - Pre-fill rackingTier from EPQS overall slope classification.
  //   - Fallback to _source='manual' when no drawToolData and no prior source.
  // Gate on data._source !== 'auto' so this only fires once per drawToolData
  // absorption, not on every parent re-render.
  useEffect(function() {
    if (drawToolData && data._source !== 'auto') {
      update({
        linearFeet: Math.round(drawToolData.totalFeet || 0),
        corners: drawToolData.corners || 0,
        ends: drawToolData.ends || 2,
        _source: 'auto',
        rackingTier: drawToolData.epqsOverall === 'sloped' ? 'rackable'
          : drawToolData.epqsOverall === 'steep' || drawToolData.epqsOverall === 'steps' ? 'heavy-rackable'
          : 'standard',
      });
    } else if (!drawToolData && !data._source) {
      update({ _source: 'manual' });
    }
  }, [drawToolData]);

  // Sync runs total back to linearFeet in advanced mode
  var runsTotal = runs.reduce(function(sum, r) { return sum + (parseFloat(r.length) || 0); }, 0);

  // Derived: any non-flat terrain?
  var hasSlope = advancedMode
    ? runs.some(function(r) { return r.terrain !== 'flat'; })
    : terrain !== 'flat';

  // Post calculations
  var grade = data.grade || 'residential';
  var panelLength = grade === 'industrial' ? 8 : 6;
  var totalLinear = advancedMode ? runsTotal : (parseFloat(linearFeet) || 0);
  var panelCount = Math.ceil(totalLinear / panelLength);
  var gates = data.gates || 0;
  var totalPosts = panelCount + 1;
  var gatePosts = gates * 2;
  var linePosts = Math.max(0, totalPosts - corners - ends - gatePosts);
  var postSize = POST_SIZES[grade] || POST_SIZES.residential;

  // Racking warning check
  var hasRackingConflict = !!(data.puppyPickets && (data.butterflies || data.scrolls));

  // Update parent on change
  function syncLayout(changes) {
    update(Object.assign({
      linearFeet: advancedMode ? runsTotal : linearFeet,
      terrain: terrain,
      slopeMethod: slopeMethod,
      rackingTier: rackingTier,
      corners: corners,
      ends: ends,
      sharpAngles: sharpAngles,
      gentleCurves: gentleCurves,
      runs: advancedMode ? runs : null,
      // Preserve per-segment-derived sloped-post count across re-syncs so
      // priceCalculator sees it on the final calculateZoneQuote(data) call.
      slopedPostCount: data.slopedPostCount != null
        ? data.slopedPostCount
        : (drawToolData ? drawToolData.slopedPostCount : undefined),
      // Preserve the pricing-meta source flag so subsequent field edits don't
      // nuke the 'auto' marker set by the drawToolData-absorption effect.
      _source: data._source,
    }, changes));
  }

  function updateRun(index, field, value) {
    var newRuns = runs.map(function(r, i) {
      if (i !== index) return r;
      var updated = Object.assign({}, r);
      updated[field] = value;
      return updated;
    });
    setRuns(newRuns);
    var newTotal = newRuns.reduce(function(sum, r) { return sum + (parseFloat(r.length) || 0); }, 0);
    syncLayout({ runs: newRuns, linearFeet: newTotal });
  }

  function addRun() {
    var newRuns = runs.concat([{ label: 'Run ' + (runs.length + 1), length: 0, terrain: 'flat' }]);
    setRuns(newRuns);
    syncLayout({ runs: newRuns });
  }

  function removeRun(index) {
    if (runs.length <= 1) return;
    var newRuns = runs.filter(function(_, i) { return i !== index; });
    setRuns(newRuns);
    var newTotal = newRuns.reduce(function(sum, r) { return sum + (parseFloat(r.length) || 0); }, 0);
    syncLayout({ runs: newRuns, linearFeet: newTotal });
  }

  return el('div', { className: 'qs1-container' },

    // ---- Intro: reassure the buyer the drawing was captured ----
    drawToolData ? el('div', { className: 'qb-layout-intro' },
      el('p', null,
        "Here's what we captured from your drawing. Please double-check each field. " +
        "These measurements are exactly what we'll build to. You can adjust any value below if your sketch was rough."
      )
    ) : null,

    // ---- Draw Tool Banner ----
    drawToolData ? (function(){
      var runCount = drawToolData.segments ? drawToolData.segments.length : 1;
      var feet = Math.round(drawToolData.totalFeet || 0);
      return el('div', { className: 'qb-layout-draw-banner' },
        el(Check, { size: 16, weight: 'bold' }),
        ' Layout imported from your drawing. ',
        el('strong', null, feet + ' ft'),
        ' across ',
        el('strong', null, runCount + (runCount === 1 ? ' run' : ' runs')),
        drawToolData.address ? el('span', null, ' from ' + drawToolData.address) : null
      );
    })() : null,

    // ---- Total Linear Feet (simple mode) ----
    !advancedMode ? el('div', null,
      sectionHeader('Total Linear Feet', {
        title: 'Linear Footage',
        text: 'Measure the total length of your fence line in feet. Include all straight runs but not gate openings. If unsure, use your property survey or measure with a tape measure.',
      }),
      el('div', { className: 'qb-layout-footage-row' },
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: linearFeet,
          min: 1,
          onChange: function(e) {
            var val = parseInt(e.target.value, 10) || 0;
            syncLayout({ linearFeet: val });
          },
        }),
        el('span', { className: 'qb-layout-unit' }, 'feet')
      )
    ) : null,

    // ---- Terrain (simple mode) ----
    !advancedMode ? el('div', null,
      sectionHeader('Terrain', {
        title: 'Terrain Type',
        text: 'Flat terrain means no grade change along the fence line. Sloped means the ground rises or falls consistently. Mixed means some sections are flat and others are sloped.',
      }),
      el('div', { className: 'qb-layout-terrain-grid' },
        TERRAIN_OPTIONS.map(function(t) {
          return el('button', {
            key: t.id,
            className: 'qb-layout-terrain-card' + (terrain === t.id ? ' selected' : ''),
            onClick: function() { syncLayout({ terrain: t.id }); },
          },
            React.createElement(t.icon, { size: 24, weight: 'duotone' }),
            el('div', { className: 'qb-layout-terrain-name' }, t.name),
            el('div', { className: 'qb-layout-terrain-desc' }, t.desc)
          );
        })
      )
    ) : null,

    // ---- Advanced Mode Toggle ----
    el('button', {
      className: 'qb-layout-advanced-toggle',
      onClick: function() {
        var next = !advancedMode;
        setAdvancedMode(next);
        if (next && runs.length === 1 && runs[0].length === 0) {
          var init = [{ label: 'Run 1', length: linearFeet || 100, terrain: terrain }];
          setRuns(init);
          syncLayout({ runs: init });
        }
      },
    },
      React.createElement(advancedMode ? CaretUp : CaretDown, { size: 14 }),
      ' I have multiple runs with different terrain'
    ),

    // ---- Advanced Runs ----
    advancedMode ? el('div', { className: 'qb-layout-runs' },
      runs.map(function(run, i) {
        return el('div', { key: i, className: 'qb-run-card' },
          el('div', { className: 'qb-run-header' },
            el('input', {
              type: 'text',
              className: 'qb-run-label',
              value: run.label,
              onChange: function(e) { updateRun(i, 'label', e.target.value); },
            }),
            runs.length > 1 ? el('button', {
              className: 'qb-run-delete',
              onClick: function() { removeRun(i); },
              'aria-label': 'Remove run',
            }, React.createElement(Trash, { size: 14 })) : null
          ),
          el('div', { className: 'qb-run-fields' },
            el('div', { className: 'qb-field-group' },
              el('label', null, 'Length'),
              el('input', {
                type: 'number',
                className: 'qb-input',
                value: run.length,
                min: 0,
                onChange: function(e) { updateRun(i, 'length', parseInt(e.target.value, 10) || 0); },
              }),
              el('span', { className: 'qb-layout-unit-sm' }, 'ft')
            ),
            el('div', { className: 'qb-field-group' },
              el('label', null, 'Terrain'),
              el('div', { className: 'qb-layout-terrain-mini' },
                TERRAIN_OPTIONS.map(function(t) {
                  return el('button', {
                    key: t.id,
                    className: 'qb-toggle-sm' + (run.terrain === t.id ? ' active' : ''),
                    onClick: function() { updateRun(i, 'terrain', t.id); },
                  }, t.name);
                })
              )
            )
          )
        );
      }),
      el('button', {
        className: 'qb-add-btn',
        onClick: addRun,
      }, React.createElement(Plus, { size: 14 }), ' Add another run'),
      el('div', { className: 'qb-run-total' },
        el('strong', null, runsTotal), ' linear feet across ',
        el('strong', null, runs.length), ' run' + (runs.length !== 1 ? 's' : '')
      )
    ) : null,

    // ---- Privacy racking note (privacy panels cannot rack) ----
    hasSlope && data.fenceType === 'privacy' ? el('div', { className: 'qb-rack-section' },
      sectionHeader('Slope Handling'),
      el('div', { className: 'qb-layout-warning' },
        React.createElement(Warning, { size: 16 }),
        ' Privacy panels are not rackable. Stair-stepping is recommended for sloped terrain.'
      )
    ) : null,

    // ---- Rackability (conditional — ornamental only) ----
    hasSlope && data.fenceType !== 'privacy' ? el('div', { className: 'qb-rack-section' },
      sectionHeader('How should panels follow the slope?', {
        title: 'Racking vs Stair-Stepping',
        text: 'How to check: Stand at one end of your fence line and look down its length. If the ground rises or falls, you need to decide how your panels handle the slope. Racked panels follow the ground smoothly. Stair-stepped panels stay level and step down, leaving triangular gaps at the bottom.',
      }),
      el('div', { className: 'qb-rack-compare' },
        el('button', {
          className: 'qb-rack-card' + (slopeMethod === 'racked' ? ' selected' : ''),
          onClick: function() { syncLayout({ slopeMethod: 'racked' }); },
        },
          el('div', { className: 'qb-rack-img-placeholder' },
            el('img', { src: 'assets/education/racking-standard.jpg', alt: 'Racked panels', className: 'qb-rack-img' })
          ),
          el('div', { className: 'qb-rack-card-title' }, 'Racked'),
          el('div', { className: 'qb-rack-card-desc' }, 'Panels follow the slope. Pickets stay vertical. Clean, continuous look.'),
          slopeMethod === 'racked' ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 14, weight: 'bold' })) : null
        ),
        el('button', {
          className: 'qb-rack-card' + (slopeMethod === 'stair-stepped' ? ' selected' : ''),
          onClick: function() { syncLayout({ slopeMethod: 'stair-stepped' }); },
        },
          el('div', { className: 'qb-rack-img-placeholder' },
            el('img', { src: 'assets/education/post-blank-stair.jpg', alt: 'Stair-stepped panels', className: 'qb-rack-img' })
          ),
          el('div', { className: 'qb-rack-card-title' }, 'Stair-Stepped'),
          el('div', { className: 'qb-rack-card-desc' }, 'Panels stay level and step down. Gaps appear at the bottom.'),
          slopeMethod === 'stair-stepped' ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 14, weight: 'bold' })) : null
        )
      ),

      // Racking tier (only if racked)
      slopeMethod === 'racked' ? el('div', { className: 'qb-rack-tiers' },
        sectionHeader('Racking Tier', {
          title: 'Racking Tier',
          text: 'Racking tier is how much slope each panel can absorb without needing a step. Standard racking handles up to 6" of rise per 6-foot panel, rackable handles up to 20", and heavy-rackable up to 36". Higher tiers need double-punched rails and cost a little more per foot.',
        }),
        RACKING_TIERS.map(function(tier) {
          return el('button', {
            key: tier.id,
            className: 'qb-rack-tier' + (rackingTier === tier.id ? ' selected' : ''),
            onClick: function() { syncLayout({ rackingTier: tier.id }); },
          },
            el('div', { className: 'qb-rack-tier-name' }, tier.name),
            el('div', { className: 'qb-rack-tier-desc' }, tier.desc),
            rackingTier === tier.id ? el('div', { className: 'qs1-check' }, React.createElement(Check, { size: 12, weight: 'bold' })) : null
          );
        })
      ) : null,

      // Racking conflict warning
      hasRackingConflict ? el('div', { className: 'qb-layout-warning' },
        React.createElement(Warning, { size: 16 }),
        ' Puppy pickets and butterfly/scroll accents limit racking to Standard tier only.'
      ) : null
    ) : null,

    // ---- Layout Shape ----
    sectionHeader('Layout Shape'),
    el('div', { className: 'qb-layout-shape-grid' },
      // 90-degree corners
      el('div', { className: 'qb-layout-shape-field' },
        el('div', { className: 'qb-layout-shape-label' },
          '90\u00B0 Corners',
          React.createElement(InfoPopup, {
            title: '90\u00B0 Corners',
            text: 'Count each place where your fence turns a right angle (90 degrees). Each corner requires a special corner post instead of a line post.',
          })
        ),
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: corners,
          min: 0,
          onChange: function(e) { syncLayout({ corners: parseInt(e.target.value, 10) || 0 }); },
        })
      ),
      // End points
      el('div', { className: 'qb-layout-shape-field' },
        el('div', { className: 'qb-layout-shape-label' },
          'End Points',
          React.createElement(InfoPopup, {
            title: 'End Points',
            text: 'End points are where your fence terminates (starts or stops). A straight fence has 2 end points. A fence that wraps around and connects back has 0.',
          })
        ),
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: ends,
          min: 0,
          onChange: function(e) { syncLayout({ ends: parseInt(e.target.value, 10) || 0 }); },
        })
      ),
      // Sharp angles
      el('div', { className: 'qb-layout-shape-field' },
        el('div', { className: 'qb-layout-shape-label' },
          'Sharp Angles (45\u201389\u00B0)',
          React.createElement(InfoPopup, {
            title: 'Sharp Angles',
            text: 'Count any turns between 45 and 89 degrees. These require special angle fittings on the posts.',
          })
        ),
        el('input', {
          type: 'number',
          className: 'qb-input qb-input-short',
          value: sharpAngles,
          min: 0,
          onChange: function(e) { syncLayout({ sharpAngles: parseInt(e.target.value, 10) || 0 }); },
        })
      ),
      // Gentle curves
      el('div', { className: 'qb-layout-shape-field' },
        el('label', { className: 'qb-layout-shape-label qb-layout-curve-label' },
          el('input', {
            type: 'checkbox',
            checked: gentleCurves,
            onChange: function(e) { syncLayout({ gentleCurves: e.target.checked }); },
          }),
          'Gentle Curves',
          React.createElement(InfoPopup, {
            title: 'Gentle Curves',
            text: 'If your fence line follows a gentle curve (like around a pool or garden), check this box. Curved sections use shorter panel widths and angled posts.',
          })
        )
      )
    ),

    // ---- Post Summary ----
    el('div', { className: 'qb-layout-post-summary' },
      sectionHeader('Post Summary', {
        title: 'How we count posts',
        text: 'Every corner, end, and gate needs its own special post. Line posts sit between them, spaced by panel width (typically 6 feet residential, 8 feet industrial). The totals here are what Grandview will ship; the material quote on the right reflects them.',
      }),
      el('div', { className: 'qb-layout-post-grid' },
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, linePosts),
          el('div', { className: 'qb-layout-post-label' }, 'Line Posts')
        ),
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, corners),
          el('div', { className: 'qb-layout-post-label' }, 'Corner Posts')
        ),
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, ends),
          el('div', { className: 'qb-layout-post-label' }, 'End Posts')
        ),
        el('div', { className: 'qb-layout-post-item' },
          el('div', { className: 'qb-layout-post-count' }, gatePosts),
          el('div', { className: 'qb-layout-post-label' }, 'Gate Posts')
        )
      ),
      el('div', { className: 'qb-layout-post-meta' },
        'Post size: ' + postSize + ' (' + grade + ')'
      ),
      el('div', { className: 'qb-layout-post-note' },
        'Auto-calculated from your layout. Our team verifies before manufacturing.'
      )
    )
  );
}

export default QuoteStep2_Layout;
