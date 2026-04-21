// QuoteBuilder.js — Thin shell: step indicator, snapshot header, Back/Next, renders active step
// React.createElement, var, function declarations, vanilla CSS

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { emailSaveLink } from './quoteSaver';
import { trackStepEnter, trackStepComplete } from './analytics';
import QuoteStep1_Style, { POOL_MIN_HEIGHT_BY_STYLE } from './QuoteStep1_Style';
import QuoteStep2_Layout from './QuoteStep2_Layout';
import QuoteStep3_Gates from './QuoteStep3_Gates';
import QuoteStep4_Extras from './QuoteStep4_Extras';
import QuoteStep5_Shipping from './QuoteStep5_Shipping';
import QuoteStep6_Review from './QuoteStep6_Review';
import {
  POST_CAP_LABELS,
  FINIAL_LABELS,
  PUPPY_TYPE_LABELS,
  ARCH_LABELS,
  MOUNT_LABELS,
  LEAF_LABELS,
  SLOPE_LABELS,
} from './optionLabels';

var STEP_LABELS = ['Layout & Posts', 'Style & Config', 'Gates', 'Extras', 'Shipping', 'Review'];

// styleId -> iFence gate preview thumbnail.
//
// We accept BOTH shapes of styleId because the saved design comes from
// different entry points:
//   - Ultra ids (e.g. 'uaf_200') are written by app.js buildSavedDesign from
//     the 3D configurator state.
//   - Slug ids (e.g. 'horizon') are written by the QuoteBuilder's own data
//     and by the StyleTab fence-side.
// Keep the map flat and inline — YAGNI, and the list is small and stable.
var STYLE_THUMBNAILS = {
  // Ultra ids
  uaf_200: 'assets/ifence_previews/gate_styles/san_marino_15.png',
  uaf_201: 'assets/ifence_previews/gate_styles/santa_monica_9.png',
  uaf_250: 'assets/ifence_previews/gate_styles/sanibel_12.png',
  uab_200: 'assets/ifence_previews/gate_styles/boca_grande_45.png',
  uas_100: 'assets/ifence_previews/gate_styles/bella_vista_48.png',
  uas_101: 'assets/ifence_previews/gate_styles/charleston_pro.png',
  uas_150: 'assets/ifence_previews/gate_styles/bella_terra_51.png',
  // Slug ids used elsewhere in the Quote flow
  'horizon':        'assets/ifence_previews/gate_styles/san_marino_15.png',
  'horizon-pro':    'assets/ifence_previews/gate_styles/santa_monica_9.png',
  'vanguard':       'assets/ifence_previews/gate_styles/sanibel_12.png',
  'haven':          'assets/ifence_previews/gate_styles/boca_grande_45.png',
  'charleston':     'assets/ifence_previews/gate_styles/bella_vista_48.png',
  'charleston-pro': 'assets/ifence_previews/gate_styles/charleston_pro.png',
  'savannah':       'assets/ifence_previews/gate_styles/bella_terra_51.png',
  'lexington':      'assets/ifence_previews/gate_styles/excelsior_30.png',
  'eclipse':        'assets/ifence_previews/gate_styles/new_orleans_21.png',
  'defender':       'assets/ifence_previews/gate_styles/castile_36.png',
};

// Ultra id -> Quote Builder slug. The 3D configurator (app.js buildSavedDesign)
// writes Ultra ids like "uaf_200" into gv_saved_design.styleId, but the
// Quote Builder's left sidebar + Review step treat data.style as a slug
// ("horizon", "charleston-pro", etc.). Keep this map inline and flat — same
// pattern as STYLE_THUMBNAILS above. Verified against configData.js.
var ULTRA_ID_TO_STYLE_SLUG = {
  uaf_200: 'horizon',
  uaf_201: 'horizon-pro',
  uaf_250: 'vanguard',
  uab_200: 'haven',
  uas_100: 'charleston',
  uas_101: 'charleston-pro',
  uas_150: 'savannah',
};

// POST_CAP_LABELS, FINIAL_LABELS, PUPPY_TYPE_LABELS, ARCH_LABELS, MOUNT_LABELS,
// LEAF_LABELS, SLOPE_LABELS are imported from optionLabels.js above.

// Hydrate a partial Quote Builder data object from gv_saved_design in
// localStorage. Returns an empty object when nothing is saved or parsing
// fails — the caller merges the result over DEFAULT_DATA, so empty is safe.
//
// Shape mapping (see app.js buildSavedDesign ~line 288-316 for the source):
//   saved.styleId           -> data.style   (normalize Ultra id to slug)
//   saved.color.id          -> data.color   (already slug format; use directly)
//   saved.height            -> data.height  (coerce string "48" to number 48)
//   saved.postCap           -> data.postCap
//   saved.finialType        -> data.finialType
//   saved.pupType           -> data.pupType
//   saved.proSpacing        -> data.spacing ('pro' | 'standard')
//   saved.privacyPostColor  -> data.privacyPostColor
//   saved.privacyPanelColor -> data.privacyPanelColor
//   saved.poolBarrier       -> data.bottomRail = 'flush' (mirrors the existing
//                              poolCompliance useEffect so the sidebar shows
//                              the right value on the very first render)
function hydrateFromSavedDesign() {
  var out = {};

  // ---- gv_fence_config: wizard-authoritative color (E2E bug fix) ----
  //
  // The wizard color picker writes gv_fence_config with the user-picked
  // color's displayName (e.g. "Textured Bronze"). If the buyer then clicks
  // through to /studio via an address suggestion, app.js applies URL hash
  // `#color=<n>` which can overwrite fenceConfig.color in React state to a
  // DIFFERENT color (because the wizard and configurator use different
  // color-id lists). buildSavedDesign then writes that wrong color id into
  // gv_saved_design.
  //
  // Fix at the hydration layer: read gv_fence_config FIRST and use its
  // displayName (slugified) as the color source of truth. The existing
  // gv_saved_design fallback below only applies if gv_fence_config is absent
  // or malformed, so legacy flows (no wizard) still work.
  try {
    var fcRaw = window.localStorage.getItem('gv_fence_config');
    if (fcRaw) {
      var fc = JSON.parse(fcRaw);
      if (fc && fc.color && typeof fc.color === 'object' && typeof fc.color.displayName === 'string' && fc.color.displayName) {
        out.color = fc.color.displayName.toLowerCase().replace(/\s+/g, '-');
      }
    }
  } catch (_) { /* ignore parse errors, fall through to gv_saved_design */ }

  try {
    var raw = window.localStorage.getItem('gv_saved_design');
    var saved = raw ? JSON.parse(raw) : null;
    if (saved && typeof saved === 'object') {

    // Style: Ultra id -> slug, else pass through if already a slug.
    if (typeof saved.styleId === 'string' && saved.styleId) {
      out.style = ULTRA_ID_TO_STYLE_SLUG[saved.styleId] || saved.styleId;
    }

    // Color (fallback only): if gv_fence_config didn't already set a color,
    // use saved.color.id (already slug format) or slugified displayName.
    if (!out.color && saved.color && typeof saved.color === 'object') {
      if (typeof saved.color.id === 'string' && saved.color.id) {
        out.color = saved.color.id;
      } else if (typeof saved.color.displayName === 'string' && saved.color.displayName) {
        out.color = saved.color.displayName.toLowerCase().replace(/\s+/g, '-');
      }
    }

    // Height: saved as string, QB expects number.
    if (saved.height != null && saved.height !== '') {
      var h = Number(saved.height);
      if (!isNaN(h)) out.height = h;
    }

    // 1:1 passthroughs when present.
    if (typeof saved.postCap === 'string' && saved.postCap) out.postCap = saved.postCap;
    if (typeof saved.finialType === 'string' && saved.finialType) out.finialType = saved.finialType;
    if (typeof saved.pupType === 'string' && saved.pupType) {
      out.pupType = saved.pupType;
      // If a pupType is set, also set puppyPickets so sidebar/Review show the puppy row
      out.puppyPickets = true;
      // Carry the display-variant through as puppyStyle (set by _pupVariant in PuppyPicketsTab)
      // gv_saved_design does not yet persist _pupVariant, so puppyStyle stays as pupType for now
      out.puppyStyle = saved.pupType;
    }
    if (typeof saved.privacyPostColor === 'string' && saved.privacyPostColor) out.privacyPostColor = saved.privacyPostColor;
    if (typeof saved.privacyPanelColor === 'string' && saved.privacyPanelColor) out.privacyPanelColor = saved.privacyPanelColor;

    // Boolean accent / accessory flags
    if (saved.circles === true)          out.circles = true;
    if (saved.butterflies === true)      out.butterflies = true;
    if (saved.scrolls === true)          out.scrolls = true;
    if (saved.midRail === true)          out.midRail = true;
    if (saved.upperFinialRail === true)  out.upperFinialRail = true;

    // Gate-only fields (arch/mount/leaf) -- null for fence scenes, set for gate scenes
    if (typeof saved.arch === 'string' && saved.arch)   out.arch = saved.arch;
    if (typeof saved.mount === 'string' && saved.mount) out.mount = saved.mount;
    if (saved.leaf != null && saved.leaf !== '')        out.leaf = saved.leaf;

    // Pro spacing flag -> QB spacing enum.
    if (saved.proSpacing === true) out.spacing = 'pro';

    // Pool barrier -> flush bottom (matches the poolCompliance useEffect).
    if (saved.poolBarrier === true) out.bottomRail = 'flush';

    } // end: if (saved && typeof saved === 'object')
  } catch (_) { /* ignore parse errors */ }

  // ---- gv_slope_answer: written by MapboxDrawView, separate localStorage key ----
  // Read independently so it augments the saved design without conflicting with it.
  try {
    var slopeRaw = window.localStorage.getItem('gv_slope_answer');
    if (slopeRaw) out.slopeAnswer = slopeRaw;
  } catch (_) {}

  return out;
}

// Resolve the sidebar preview src from saved design state in localStorage.
// Returns '' when neither a snapshot nor a thumbnail is available — callers
// should render the "Design preview will appear here" placeholder in that
// case so fresh customers aren't shown a broken image.
function resolveSidebarPreviewSrc() {
  try {
    var raw = window.localStorage.getItem('gv_saved_design');
    if (!raw) return '';
    var saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return '';
    if (typeof saved.snapshotDataUrl === 'string' && saved.snapshotDataUrl.length > 0) {
      return saved.snapshotDataUrl;
    }
    // Some historical payloads nest under `config` — check both shapes.
    var styleId = saved.styleId || (saved.config && saved.config.styleId) || '';
    if (styleId && STYLE_THUMBNAILS[styleId]) return STYLE_THUMBNAILS[styleId];
    return '';
  } catch (_) {
    return '';
  }
}

function titleCase(s) {
  if (!s) return '';
  return String(s).replace(/[-_]/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
}

// Build the "Your design" sidebar spec list from whatever the buyer has
// chosen so far. Progressive: only renders fields that are actually set.
function buildSidebarSpecs(data) {
  var specs = [];
  if (data.style) specs.push({ label: 'Style', value: titleCase(data.style) });
  if (data.height) specs.push({ label: 'Height', value: data.height + '"' });
  if (data.color) specs.push({ label: 'Color', value: titleCase(data.color) });
  if (data.grade && data.grade !== 'residential') specs.push({ label: 'Grade', value: titleCase(data.grade) });
  if (data.bottomRail === 'flush') specs.push({ label: 'Bottom rail', value: 'Flush (pool code)' });
  if (data.spacing && data.spacing !== 'standard') specs.push({ label: 'Spacing', value: titleCase(data.spacing) });
  if (data.puppyPickets) {
    // Show the most descriptive label: prefer _pupVariant, then pupType, then puppyStyle
    var pupDisplayId = data._pupVariant || data.pupType || data.puppyStyle;
    var pupLabel = pupDisplayId
      ? (PUPPY_TYPE_LABELS[pupDisplayId] || titleCase(pupDisplayId))
      : 'Yes';
    specs.push({ label: 'Puppy pickets', value: pupLabel });
  }
  if (data.postCap && data.postCap !== 'flat') specs.push({ label: 'Post cap', value: POST_CAP_LABELS[data.postCap] || titleCase(data.postCap) });
  if (data.finialType && data.finialType !== 'none') {
    specs.push({ label: 'Finials', value: FINIAL_LABELS[data.finialType] || titleCase(data.finialType) });
  }
  // Accent flags from 3D configurator (circles/butterflies/scrolls) and QB Extras
  var accentParts = [];
  if (data.circles)     accentParts.push('Circles');
  if (data.butterflies) accentParts.push('Butterflies');
  if (data.scrolls)     accentParts.push('Scrolls');
  if (accentParts.length > 0) specs.push({ label: 'Accents', value: accentParts.join(', ') });
  // Accessory rail flags from 3D configurator
  var railParts = [];
  if (data.midRail)         railParts.push('Mid Rail');
  if (data.upperFinialRail) railParts.push('Upper Finial Rail');
  if (railParts.length > 0) specs.push({ label: 'Rail add-ons', value: railParts.join(', ') });
  // Gate-specific config
  if (data.arch) specs.push({ label: 'Arch', value: ARCH_LABELS[data.arch] || titleCase(data.arch) });
  if (data.mount) specs.push({ label: 'Mount', value: MOUNT_LABELS[data.mount] || titleCase(data.mount) });
  if (data.leaf != null && data.leaf !== '') specs.push({ label: 'Leaf', value: LEAF_LABELS[data.leaf] || titleCase(String(data.leaf)) });
  if (data.privacyType) specs.push({ label: 'Privacy', value: titleCase(data.privacyType) });
  if (data.linearFeet) specs.push({ label: 'Linear feet', value: Math.round(data.linearFeet) + ' ft' });
  if (data.terrain) specs.push({ label: 'Terrain', value: titleCase(data.terrain) });
  if (data.rackingTier && data.rackingTier !== 'standard') specs.push({ label: 'Racking', value: titleCase(data.rackingTier) });
  if (data.slopeAnswer) specs.push({ label: 'Slope', value: SLOPE_LABELS[data.slopeAnswer] || titleCase(data.slopeAnswer) });
  if (Array.isArray(data.gates) && data.gates.length > 0) {
    specs.push({ label: 'Gates', value: data.gates.length + ' gate' + (data.gates.length === 1 ? '' : 's') });
  } else if (typeof data.gates === 'number' && data.gates > 0) {
    specs.push({ label: 'Gates', value: data.gates + ' gate' + (data.gates === 1 ? '' : 's') });
  }
  if (data.zip) specs.push({ label: 'Ship to', value: data.zip });
  return specs;
}

var DEFAULT_DATA = {
  grade: 'residential',
  fenceType: 'ornamental',
  style: '',
  spacing: 'standard',
  puppyPickets: false,
  puppyStyle: '',
  height: 48,
  color: 'textured-black',
  rails: 3,
  bottomRail: 'standard',
  postCap: 'flat',
  // Privacy defaults
  privacyType: '',
  privacyPostColor: 'textured-black',
  privacyPanelColor: 'textured-white',
  // Layout, gates, extras, shipping fields added by later steps
};

function QuoteBuilder(props) {
  // props: zoneName, zoneId, initialConfig, poolCompliance, snapshotDataUrl, onComplete, onBack, skipToStep
  var stepState = useState(props.skipToStep || 0);
  var step = stepState[0];
  var setStep = stepState[1];

  // Initial data priority (later overrides earlier):
  //   1. DEFAULT_DATA (base defaults — black, empty style, etc.)
  //   2. hydrateFromSavedDesign() (buyer's configurator picks from localStorage)
  //   3. props.initialConfig (explicit caller-supplied config still wins)
  //
  // Without step 2 the QB always mounted with DEFAULT_DATA's "textured-black"
  // color + empty style — causing the sidebar + Review to drift away from
  // the buyer's actual selection (P2.1 color drift, P2.2 empty Style row).
  var dataState = useState(function() {
    return Object.assign({}, DEFAULT_DATA, hydrateFromSavedDesign(), props.initialConfig || {});
  });
  var data = dataState[0];
  var setData = dataState[1];

  function update(changes) {
    setData(function(prev) { return Object.assign({}, prev, changes); });
  }

  // Save for Later state
  var showSaveFormState = useState(false);
  var showSaveForm = showSaveFormState[0];
  var setShowSaveForm = showSaveFormState[1];

  var saveEmailState = useState('');
  var saveEmail = saveEmailState[0];
  var setSaveEmail = saveEmailState[1];

  var saveSentState = useState(false);
  var saveSent = saveSentState[0];
  var setSaveSent = saveSentState[1];

  function handleSendLink() {
    emailSaveLink(saveEmail, null).then(function(ok) {
      if (ok) {
        setSaveSent(true);
        setTimeout(function() {
          setSaveSent(false);
          setShowSaveForm(false);
          setSaveEmail('');
        }, 3000);
      }
    });
  }

  // Pool compliance smart defaults (warn, don't wall):
  //   Auto-select flush bottom rail. Height is NOT auto-bumped — the user
  //   gets a yellow warning in QuoteStep1_Style if they pick below the
  //   style's pool-code minimum, but the selection sticks. Previously this
  //   effect snapped height back every re-render, making the height
  //   selector appear stuck in the backyard pool flow.
  useEffect(function() {
    if (!(props.poolCompliance && props.poolCompliance.poolBarrier)) return;
    if (data.bottomRail !== 'flush') update({ bottomRail: 'flush' });
  }, [props.poolCompliance, data.style]);

  // Track step enters
  useEffect(function() {
    trackStepEnter(step, props.zoneId);
  }, [step]);

  // Render active step. Post-reorder (2026-04-21): step 0 is Layout & Posts
  // so the buyer confirms the measurements the draw tool just captured before
  // picking style. Review step edit-links updated to match (see QuoteStep6).
  var stepContent = null;
  if (step === 0) {
    stepContent = React.createElement(QuoteStep2_Layout, {
      data: data,
      update: update,
      drawToolData: props.drawToolData,
    });
  }
  if (step === 1) {
    stepContent = React.createElement(QuoteStep1_Style, {
      data: data,
      update: update,
      poolCompliance: props.poolCompliance,
    });
  }
  // step 2 — Gates
  if (step === 2) {
    stepContent = React.createElement(QuoteStep3_Gates, { data: data, update: update, poolCompliance: props.poolCompliance });
  }
  // step 3 — Extras
  if (step === 3) {
    stepContent = React.createElement(QuoteStep4_Extras, { data: data, update: update });
  }
  // step 4 — Shipping
  if (step === 4) {
    stepContent = React.createElement(QuoteStep5_Shipping, {
      data: data,
      update: update,
      isFirstZone: props.isFirstZone !== false,
    });
  }
  // step 5 — Review
  if (step === 5) {
    stepContent = React.createElement(QuoteStep6_Review, {
      data: data,
      update: update,
      onEditStep: setStep,
      onComplete: props.onComplete,
      zoneName: props.zoneName || 'Your Fence',
    });
  }

  var specs = buildSidebarSpecs(data);

  // Sidebar preview src: explicit prop wins (back-compat for any caller that
  // still passes snapshotDataUrl), otherwise fall back to the saved design
  // in localStorage — snapshot first, style thumbnail second. We read on
  // every render because the saved design is written by the 3D configurator
  // outside React, and the QuoteBuilder may mount AFTER that write.
  var previewSrc = props.snapshotDataUrl || resolveSidebarPreviewSrc();

  return React.createElement('div', { className: 'qb-container' },

    React.createElement('div', { className: 'qb-layout' },

      // ---- LEFT: Fixed sidebar with design snapshot + progressive spec list ----
      React.createElement('aside', { className: 'qb-sidebar' },
        React.createElement('div', { className: 'qb-sidebar-image-wrap' },
          previewSrc
            ? React.createElement('img', {
                src: previewSrc,
                className: 'qb-sidebar-img',
                alt: 'Your fence design',
                'data-test': 'quote-design-preview',
              })
            : React.createElement('div', { className: 'qb-sidebar-image-placeholder' },
                'Design preview will appear here'
              )
        ),
        React.createElement('div', { className: 'qb-sidebar-details' },
          React.createElement('div', { className: 'qb-sidebar-title' }, 'Your design'),
          specs.length > 0
            ? React.createElement('ul', { className: 'qb-sidebar-specs' },
                specs.map(function(s) {
                  return React.createElement('li', { key: s.label, className: 'qb-sidebar-spec' },
                    React.createElement('span', { className: 'qb-sidebar-spec-label' }, s.label),
                    React.createElement('span', { className: 'qb-sidebar-spec-value' }, s.value)
                  );
                })
              )
            : React.createElement('div', { className: 'qb-sidebar-empty' },
                'Selections will appear as you answer questions.'
              ),
          React.createElement('div', { className: 'qb-sidebar-prefill' },
            React.createElement(ArrowRight, { size: 14, style: { flexShrink: 0 } }),
            ' Pre-filled from your design. Finalize your quote on the right.'
          )
        )
      ),

      // ---- RIGHT: Scrolling main column with step content ----
      React.createElement('div', { className: 'qb-main' },

        // ---- Phase label + step dots ----
        // Wrapped in a "quote-phase" band so the buyer reads these as
        // sub-steps of the Quote phase — NOT six more top-level wizard steps.
        React.createElement('div', { className: 'qb-phase-band' },
          React.createElement('div', { className: 'qb-phase-eyebrow' }, 'QUOTE DETAILS'),
          React.createElement('div', { className: 'qb-step-dots' },
            STEP_LABELS.map(function(label, i) {
              return React.createElement('div', {
                key: i,
                className: 'qb-dot' + (i === step ? ' active' : '') + (i < step ? ' done' : ''),
                onClick: function() { if (i < step) setStep(i); },
              },
                React.createElement('span', { className: 'qb-dot-num' }, i + 1),
                React.createElement('span', { className: 'qb-dot-label' }, label)
              );
            })
          )
        ),

        // ---- Step content ----
        React.createElement('div', { className: 'qb-step-content' }, stepContent)
      )
    ),

    // ---- Footer nav ----
    React.createElement('div', { className: 'qb-footer' },
      step > 0 ? React.createElement('button', {
        className: 'qb-back-btn',
        onClick: function() { setStep(step - 1); },
      },
        React.createElement(ArrowLeft, { size: 16 }),
        ' Back'
      ) : (props.onBack ? React.createElement('button', {
        className: 'qb-back-btn',
        onClick: props.onBack,
      },
        React.createElement(ArrowLeft, { size: 16 }),
        ' Back'
      ) : React.createElement('span', null)),

      // ---- Save for Later ----
      React.createElement('div', { className: 'qb-save-wrap' },
        !showSaveForm ? React.createElement('button', {
          className: 'qb-save-link',
          onClick: function() { setShowSaveForm(true); },
        }, 'Save for Later') : null,
        showSaveForm ? React.createElement('div', { className: 'qb-save-form' },
          saveSent
            ? React.createElement('span', { className: 'qb-save-sent' }, 'Link sent!')
            : React.createElement(React.Fragment, null,
                React.createElement('input', {
                  className: 'qb-save-input',
                  type: 'email',
                  placeholder: 'your@email.com',
                  value: saveEmail,
                  onChange: function(e) { setSaveEmail(e.target.value); },
                }),
                React.createElement('button', {
                  className: 'qb-save-send-btn',
                  onClick: handleSendLink,
                  disabled: !saveEmail,
                }, 'Send Link')
              )
        ) : null
      ),

      React.createElement('button', {
        className: 'qb-next-btn',
        onClick: function() {
          trackStepComplete(step, props.zoneId);
          if (step < 5) setStep(step + 1);
          else if (props.onComplete) props.onComplete(data);
        },
      },
        step < 5 ? 'Next' : 'Get Quote',
        ' ',
        React.createElement(ArrowRight, { size: 16 })
      )
    )
  );
}

export default QuoteBuilder;
