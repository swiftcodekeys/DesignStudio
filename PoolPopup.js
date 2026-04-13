// PoolPopup.js — Single pool compliance popup
// Shows at zone selection. Replaces the two separate pool popups.

import React from 'react';
import { SwimmingPool, Check, X } from '@phosphor-icons/react';

var POOL_STYLES = [
  { id: 'haven', name: 'Haven', desc: 'Built for pool code — flush bottom by design', recommended: true,
    image: 'assets/ifence_previews/gate_styles/boca_grande_45.png' },
  { id: 'horizon', name: 'Horizon Flush', desc: 'Flat top with flush bottom 2-rail variant',
    image: 'assets/ifence_previews/gate_styles/san_marino_15.png' },
];

function PoolPopup(props) {
  var onConfirm = props.onConfirm;
  var onCancel = props.onCancel;
  var selectedStyle = props.selectedStyle;
  var onStyleSelect = props.onStyleSelect;

  return React.createElement('div', { className: 'pool-popup-overlay' },
    React.createElement('div', { className: 'pool-popup' },
      React.createElement('div', { className: 'pool-popup-header' },
        React.createElement(SwimmingPool, { size: 20, weight: 'fill' }),
        React.createElement('div', null,
          React.createElement('div', { className: 'pool-popup-title' }, 'Pool Safety Requirements'),
          React.createElement('div', { className: 'pool-popup-subtitle' }, 'BOCA/IRC pool code compliance')
        ),
        React.createElement('button', { className: 'pool-popup-close', onClick: onCancel },
          React.createElement(X, { size: 18 })
        )
      ),
      React.createElement('p', { className: 'pool-popup-desc' },
        'Pool fencing must meet safety codes. We\'ll automatically configure your fence to comply:'
      ),
      React.createElement('div', { className: 'pool-popup-styles' },
        POOL_STYLES.map(function(style) {
          var isSel = selectedStyle === style.id;
          return React.createElement('button', {
            key: style.id,
            className: 'pool-style-card' + (isSel ? ' selected' : '') + (style.recommended ? ' recommended' : ''),
            onClick: function() { onStyleSelect(style.id); },
          },
            React.createElement('img', { src: style.image, alt: style.name, className: 'pool-style-img' }),
            React.createElement('div', { className: 'pool-style-name' }, style.name),
            style.recommended && React.createElement('span', { className: 'pool-style-badge' }, 'RECOMMENDED'),
            React.createElement('div', { className: 'pool-style-desc' }, style.desc)
          );
        })
      ),
      React.createElement('div', { className: 'pool-popup-auto' },
        React.createElement('strong', null, 'What we auto-configure for pool code:'),
        React.createElement('ul', null,
          React.createElement('li', null, 'Flush bottom rail (no gap at ground level)'),
          React.createElement('li', null, 'Self-closing hinges (D&D TruClose) on all gates'),
          React.createElement('li', null, 'Self-latching hardware (MagnaLatch) on all gates'),
          React.createElement('li', null, 'Gates swing outward (away from pool)'),
          React.createElement('li', null, 'Minimum 48" fence height')
        )
      ),
      React.createElement('div', { className: 'pool-popup-note' },
        'Always verify your local pool code requirements. Some jurisdictions have additional requirements.'
      ),
      React.createElement('button', { className: 'pool-popup-confirm', onClick: onConfirm },
        React.createElement(Check, { size: 16, weight: 'bold' }),
        ' Got It \u2014 Configure for Pool Code'
      )
    )
  );
}

export default PoolPopup;
