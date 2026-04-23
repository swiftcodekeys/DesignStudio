// InfoPopup.js — Reusable (i) info popup with image + explanation
// Used throughout QuoteBuilder for post types, racking, spacing, etc.

import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from '@phosphor-icons/react';

function InfoPopup(props) {
  var title = props.title;
  var text = props.text;
  var imageSrc = props.imageSrc;
  var imageAlt = props.imageAlt;
  var children = props.children;

  var [open, setOpen] = useState(false);
  var popupRef = useRef(null);

  useEffect(function() {
    if (!open) return;
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [open]);

  return React.createElement('span', { className: 'info-popup-wrapper', style: { position: 'relative', display: 'inline-flex', alignItems: 'center' } },
    React.createElement('button', {
      className: 'info-popup-trigger',
      onClick: function(e) { e.stopPropagation(); setOpen(!open); },
      'aria-label': 'More info about ' + (title || 'this option'),
    }, React.createElement(Info, { size: 16, weight: 'fill' })),
    open && React.createElement('div', { ref: popupRef, className: 'info-popup-content' },
      React.createElement('div', { className: 'info-popup-header' },
        title && React.createElement('span', { className: 'info-popup-title' }, title),
        React.createElement('button', { className: 'info-popup-close', onClick: function() { setOpen(false); } },
          React.createElement(X, { size: 14 })
        )
      ),
      imageSrc && React.createElement('img', { src: imageSrc, alt: imageAlt || title, className: 'info-popup-image' }),
      text && React.createElement('p', { className: 'info-popup-text' }, text),
      children
    )
  );
}

export default InfoPopup;
