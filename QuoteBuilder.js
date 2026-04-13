// QuoteBuilder.js — Thin shell: step indicator, snapshot header, Back/Next, renders active step
// React.createElement, var, function declarations, vanilla CSS

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import QuoteStep1_Style from './QuoteStep1_Style';
import QuoteStep2_Layout from './QuoteStep2_Layout';
import QuoteStep3_Gates from './QuoteStep3_Gates';
import QuoteStep4_Extras from './QuoteStep4_Extras';
import QuoteStep5_Shipping from './QuoteStep5_Shipping';
import QuoteStep6_Review from './QuoteStep6_Review';

var STEP_LABELS = ['Style & Config', 'Layout & Posts', 'Gates', 'Extras', 'Shipping', 'Review'];

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

  // Lock flush bottom rail for pool compliance
  useEffect(function() {
    if (props.poolCompliance && props.poolCompliance.poolBarrier && data.bottomRail !== 'flush') {
      update({ bottomRail: 'flush' });
    }
  }, [props.poolCompliance]);

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

  return React.createElement('div', { className: 'qb-container' },

    // ---- Snapshot header ----
    props.snapshotDataUrl ? React.createElement('div', { className: 'qb-snapshot-header' },
      React.createElement('img', { src: props.snapshotDataUrl, className: 'qb-snapshot-img', alt: 'Design preview' }),
      React.createElement('div', { className: 'qb-snapshot-info' },
        React.createElement('div', { className: 'qb-snapshot-zone' }, props.zoneName || 'Your Fence'),
        React.createElement('div', { className: 'qb-snapshot-details' },
          (data.style || '') + ' \u00B7 ' + (data.height || '') + '" \u00B7 ' + (data.color || '').replace(/-/g, ' ')
        )
      ),
      React.createElement('div', { className: 'qb-snapshot-prefill' },
        '\u2705 Pre-filled from your Design Studio selections'
      )
    ) : null,

    // ---- Step dots ----
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
    ),

    // ---- Step content ----
    React.createElement('div', { className: 'qb-step-content' }, stepContent),

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
      React.createElement('button', {
        className: 'qb-next-btn',
        onClick: function() {
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
