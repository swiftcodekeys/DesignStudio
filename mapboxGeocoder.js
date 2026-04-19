// mapboxGeocoder.js — Mapbox geocoding API wrapper

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

// Autocomplete: up to 5 suggestions for an in-progress address query.
// Returns [{ id, placeName, lat, lng }, ...].
export async function suggestAddresses(query, token) {
  if (!query || query.trim().length < 3) return [];
  var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
    encodeURIComponent(query) + '.json?access_token=' + token +
    '&country=us&types=address&autocomplete=true&limit=5';
  var resp = await fetch(url);
  if (!resp.ok) return [];
  var data = await resp.json();
  if (!data.features) return [];
  return data.features.map(function(f) {
    return {
      id: f.id,
      placeName: f.place_name,
      lat: f.center[1],
      lng: f.center[0],
    };
  });
}
