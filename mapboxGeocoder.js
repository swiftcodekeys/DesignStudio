// mapboxGeocoder.js — Mapbox geocoding API wrapper
// Returns { lat, lng, placeName } or throws.

export async function geocodeAddress(address, token) {
  var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    encodeURIComponent(address) + '.json?access_token=' + token +
    '&country=us&types=address&limit=1';
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('Geocoding failed: ' + resp.status);
  var data = await resp.json();
  if (!data.features || data.features.length === 0) {
    throw new Error('No results for address: ' + address);
  }
  var f = data.features[0];
  return {
    lat: f.center[1],
    lng: f.center[0],
    placeName: f.place_name,
  };
}
