// ZoneTransitionPage.js — "Same fence for your [next zone]?" transition screen
// React.createElement, var, function declarations, vanilla CSS

import React from 'react';
import { CheckCircle, CopySimple, Shuffle } from '@phosphor-icons/react';

function el(tag, props) {
  var args = [tag, props];
  for (var i = 2; i < arguments.length; i++) args.push(arguments[i]);
  return React.createElement.apply(React, args);
}

function ZoneTransitionPage(props) {
  var completedZoneName = props.completedZoneName || 'Zone';
  var completedConfig   = props.completedConfig || {};
  var nextZoneName      = props.nextZoneName || 'Next Zone';
  var onSame            = props.onSame;
  var onDifferent       = props.onDifferent;

  var styleName  = completedConfig.style  || '—';
  var heightVal  = completedConfig.height ? completedConfig.height + '"' : '—';
  var colorName  = completedConfig.color  || '—';

  return el('div', { className: 'zone-transition-overlay' },
    el('div', { className: 'zone-transition-card' },

      // ---- Completion header ----
      el('div', { className: 'zone-transition-check' },
        React.createElement(CheckCircle, { size: 40, weight: 'fill', color: '#38a169' })
      ),
      el('h2', { className: 'zone-transition-title' },
        'Your ' + completedZoneName + ' fence is configured!'
      ),

      // ---- Summary card ----
      el('div', { className: 'zone-transition-summary' },
        el('div', { className: 'zone-transition-summary-row' },
          el('span', { className: 'zone-transition-summary-label' }, 'Style'),
          el('span', { className: 'zone-transition-summary-value' },
            styleName.charAt(0).toUpperCase() + styleName.slice(1)
          )
        ),
        el('div', { className: 'zone-transition-summary-row' },
          el('span', { className: 'zone-transition-summary-label' }, 'Height'),
          el('span', { className: 'zone-transition-summary-value' }, heightVal)
        ),
        el('div', { className: 'zone-transition-summary-row' },
          el('span', { className: 'zone-transition-summary-label' }, 'Color'),
          el('span', { className: 'zone-transition-summary-value' },
            colorName.split('-').map(function(w) {
              return w.charAt(0).toUpperCase() + w.slice(1);
            }).join(' ')
          )
        )
      ),

      // ---- Question ----
      el('p', { className: 'zone-transition-question' },
        'Want the same fence for your ' + nextZoneName + '?'
      ),

      // ---- Choice buttons ----
      el('div', { className: 'zone-transition-choices' },

        el('button', {
          className: 'zone-transition-btn zone-transition-btn-same',
          onClick: onSame,
        },
          el('div', { className: 'zone-transition-btn-icon' },
            React.createElement(CopySimple, { size: 22, weight: 'duotone' })
          ),
          el('div', { className: 'zone-transition-btn-text' },
            el('span', { className: 'zone-transition-btn-label' }, 'Same Fence'),
            el('span', { className: 'zone-transition-btn-desc' },
              'Skip style\u2009/\u2009color\u2009/\u2009height, go straight to layout.'
            )
          )
        ),

        el('button', {
          className: 'zone-transition-btn zone-transition-btn-different',
          onClick: onDifferent,
        },
          el('div', { className: 'zone-transition-btn-icon' },
            React.createElement(Shuffle, { size: 22, weight: 'duotone' })
          ),
          el('div', { className: 'zone-transition-btn-text' },
            el('span', { className: 'zone-transition-btn-label' }, 'Different Fence'),
            el('span', { className: 'zone-transition-btn-desc' },
              'Choose a different style, color, or height.'
            )
          )
        )
      )
    )
  );
}

export default ZoneTransitionPage;
