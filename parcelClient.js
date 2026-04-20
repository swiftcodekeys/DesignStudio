// parcelClient.js — client for the parcel-proxy worker
export async function fetchParcel(lat, lng, proxyUrl) {
  try {
    var resp = await fetch(proxyUrl + '/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: lat, lng: lng }),
    });
    if (!resp.ok) {
      console.warn('[parcelClient] HTTP', resp.status, 'from', proxyUrl);
      return { ok: false, fallback: 'manual', error: 'HTTP ' + resp.status };
    }
    var json = await resp.json();
    if (!json.ok) console.warn('[parcelClient] upstream error', json.error);
    return json;
  } catch (e) {
    console.warn('[parcelClient] network error', e.message);
    return { ok: false, fallback: 'manual', error: e.message };
  }
}
