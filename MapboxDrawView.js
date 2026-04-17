// MapboxDrawView.js — Mapbox GL JS satellite draw tool
// Replaces DrawYardView when USE_MAPBOX_DRAW env flag is true.

import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './mapbox.css';

var MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';
if (MAPBOX_TOKEN) mapboxgl.accessToken = MAPBOX_TOKEN;

function AddressEntry(props) {
  var addressState = useState('');
  var address = addressState[0];
  var setAddress = addressState[1];

  return React.createElement('div', { className: 'mbx-address-entry' },
    React.createElement('h2', null, 'Enter your address'),
    React.createElement('input', {
      type: 'text',
      placeholder: 'Enter your address (e.g., 123 Main St, Howell MI)',
      value: address,
      onChange: function(e) { setAddress(e.target.value); },
      className: 'mbx-address-input',
    }),
    React.createElement('button', {
      onClick: function() { if (address && props.onAddressEntered) props.onAddressEntered(address); },
      className: 'mbx-address-submit',
      disabled: !address,
    }, 'Find my yard \u2192')
  );
}

function MapboxDrawView(props) {
  var locationState = useState(props.initialLocation || null);
  var location = locationState[0];
  var setLocation = locationState[1];

  return React.createElement('div', { className: 'mbx-container' },
    !location
      ? React.createElement(AddressEntry, { onAddressEntered: function(addr) { setLocation({ address: addr }); } })
      : React.createElement('div', { className: 'mbx-map-placeholder' }, 'Map will render here (Task 1.1.2)')
  );
}

export default MapboxDrawView;
