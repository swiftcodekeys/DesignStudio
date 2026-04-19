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

var STEP_LABELS = ['Style & Config', 'Layout & Posts', 'Gates', 'Extras', 'Shipping', 'Review'];

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
  if (data.puppyPickets) specs.push({ label: 'Puppy pickets', value: data.puppyStyle ? titleCase(data.puppyStyle) : 'Yes' });
  if (data.postCap && data.postCap !== 'flat') specs.push({ label: 'Post cap', value: titleCase(data.postCap) });
  if (data.finialType) specs.push({ label: 'Finials', value: titleCase(data.finialType) });
  if (data.privacyType) specs.push({ label: 'Privacy', value: titleCase(data.privacyType) });
  if (data.linearFeet) specs.push({ label: 'Linear feet', value: Math.round(data.linearFeet) + ' ft' });
  if (data.terrain) specs.push({ label: 'Terrain', value: titleCase(data.terrain) });
  if (data.rackingTier && data.rackingTier !== 'standard') specs.push({ label: 'Racking', value: titleCase(data.rackingTier) });
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

  var dataState = useState(function() {
    return Object.assign({}, DEFAULT_DATA, props.initialConfig || {});
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

  // Render active step
  var stepContent = null;
  if (step === 0) {
    stepContent = React.createElement(QuoteStep1_Style, {
      data: data,
      update: update,
      poolCompliance: props.poolCompliance,
    });
  }
  if (step === 1) {
    stepContent = React.createElement(QuoteStep2_Layout, {
      data: data,
      update: update,
      drawToolData: props.drawToolData,
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

  return React.createElement('div', { className: 'qb-container' },

    React.createElement('div', { className: 'qb-layout' },

      // ---- LEFT: Fixed sidebar with design snapshot + progressive spec list ----
      React.createElement('aside', { className: 'qb-sidebar' },
        React.createElement('div', { className: 'qb-sidebar-image-wrap' },
          props.snapshotDataUrl
            ? React.createElement('img', {
                src: props.snapshotDataUrl,
                className: 'qb-sidebar-img',
                alt: 'Your fence design',
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
