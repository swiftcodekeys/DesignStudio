import React from 'react';

var el = React.createElement;

function fmt(cents) {
  return '$' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function OrderSummary(props) {
  var q = props.quote;
  return el('div', { className: 'co-order-summary' },
    q.mapboxSnapshotUrl ? el('img', {
      src: q.mapboxSnapshotUrl,
      alt: 'Satellite view of your fence',
      className: 'co-map-thumb',
    }) : null,
    el('h3', { className: 'co-zone-name' }, q.zoneName || 'Your fence'),
    el('p', { className: 'co-config' },
      (q.config && q.config.style ? q.config.style : '') +
      (q.config && q.config.height ? ' · ' + q.config.height + '"' : '') +
      (q.config && q.config.color ? ' · ' + q.config.color.replace(/-/g, ' ') : '')
    ),
    el('ul', { className: 'co-items' },
      (q.items || []).map(function(item, i) {
        return el('li', { key: i },
          el('span', null, item.label),
          el('span', null, fmt(Math.round((item.total || 0) * 100)))
        );
      })
    ),
    el('div', { className: 'co-subtotal' },
      el('span', null, 'Subtotal'),
      el('span', null, fmt(Math.round((q.subtotal || 0) * 100)))
    ),
    q.shippingCents ? el('div', { className: 'co-shipping' },
      el('span', null, 'Shipping'),
      el('span', null, fmt(q.shippingCents))
    ) : null,
    el('div', { className: 'co-total' },
      el('strong', null, 'Total'),
      el('strong', null, fmt(q.totalCents || 0))
    )
  );
}

export default OrderSummary;
