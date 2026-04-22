// SlopePopup.js — modal asking the customer about yard slope
import React, { useState } from 'react';
import { PlayCircle, FileText } from '@phosphor-icons/react';
import { SLOPE_ANSWER_VALUES, SLOPE_ANSWER_EXPLAINERS } from './slopeAnswers.js';

function SlopePopup(props) {
  var choiceState = useState(null);
  var choice = choiceState[0];
  var setChoice = choiceState[1];
  if (!props.open) return null;

  return React.createElement('div', { className: 'mbx-slope-popup-overlay' },
    React.createElement('div', { className: 'mbx-slope-popup' },
      React.createElement('h2', null, 'Does your yard have slope?'),
      React.createElement('img', {
        src: 'assets/slope-guides/measure-slope.png',
        alt: 'How to measure yard slope with a board and level',
        className: 'mbx-slope-infographic',
      }),
      React.createElement('div', { className: 'mbx-slope-options' },
        SLOPE_ANSWER_VALUES.map(function(val) {
          var label = SLOPE_ANSWER_EXPLAINERS[val];
          return React.createElement('label', {
            key: val, className: 'mbx-slope-option' + (choice === val ? ' selected' : ''),
          },
            React.createElement('input', {
              type: 'radio', name: 'slope', value: val,
              checked: choice === val,
              onChange: function() { setChoice(val); },
            }),
            React.createElement('span', null, label)
          );
        })
      ),
      React.createElement('div', { className: 'mbx-slope-help' },
        React.createElement('h4', null, 'How to verify:'),
        React.createElement('a', { href: 'https://youtu.be/nfrwyY4GttE', target: '_blank', rel: 'noopener noreferrer' },
          React.createElement(PlayCircle, { size: 16, weight: 'fill' }),
          ' Watch: How to measure your yard'),
        React.createElement('a', { href: '/how-to-measure-your-yard', target: '_blank', rel: 'noopener noreferrer' },
          React.createElement(FileText, { size: 16, weight: 'regular' }),
          ' Read: Full slope measurement guide')
      ),
      React.createElement('div', { className: 'mbx-slope-footer' },
        React.createElement('button', { onClick: props.onClose }, 'Cancel'),
        React.createElement('button', {
          className: 'primary',
          disabled: !choice,
          onClick: function() { props.onAnswer(choice); },
        }, 'Continue \u2192')
      )
    )
  );
}

export default SlopePopup;
