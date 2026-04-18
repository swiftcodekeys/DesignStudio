// SlopePopup.js — modal asking the customer about yard slope
import React, { useState } from 'react';

function SlopePopup(props) {
  if (!props.open) return null;
  var choiceState = useState(null);
  var choice = choiceState[0];
  var setChoice = choiceState[1];

  return React.createElement('div', { className: 'mbx-slope-popup-overlay' },
    React.createElement('div', { className: 'mbx-slope-popup' },
      React.createElement('h2', null, 'Does your yard have slope?'),
      React.createElement('img', {
        src: 'assets/slope-guides/measure-slope.png',
        alt: 'How to measure yard slope with a board and level',
        className: 'mbx-slope-infographic',
      }),
      React.createElement('div', { className: 'mbx-slope-options' },
        ['flat', 'some', 'all'].map(function(val) {
          var label = {
            flat: 'Mostly flat \u2014 no panels need racking',
            some: 'Some sections slope \u2014 I\u2019ll mark them',
            all:  'Very sloped throughout',
          }[val];
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
        React.createElement('a', { href: 'https://youtube.com/TODO', target: '_blank', rel: 'noopener' },
          '\u{1F4F9} Watch: How to measure your yard slope'),
        React.createElement('a', { href: '/how-to-measure-your-yard', target: '_blank', rel: 'noopener' },
          '\u{1F4C4} Read: Full slope measurement guide')
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
