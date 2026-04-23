import React from 'react';

var el = React.createElement;

function TrustSignals() {
  return el('div', { className: 'co-trust' },
    el('div', { className: 'co-trust-badges' },
      el('span', { className: 'co-trust-badge' }, '🛡 Every order reviewed by Sarah within 24h'),
      el('span', { className: 'co-trust-badge' }, '🇺🇸 Veteran-owned SDVOSB'),
      el('span', { className: 'co-trust-badge' }, '↩ 24h cancel window')
    ),
    el('div', { className: 'co-trust-testimonial' },
      el('div', { className: 'co-trust-stars' }, '⭐⭐⭐⭐⭐'),
      el('blockquote', { className: 'co-trust-quote' },
        '"Install was perfect — Sarah caught a footage miscount on my order and saved me $400."'
      ),
      el('cite', { className: 'co-trust-cite' }, '— Jen M., 2026')
    )
  );
}

export default TrustSignals;
