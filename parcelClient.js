// parcelClient.js — client for the parcel-proxy worker
export async function fetchParcel(lat, lng, proxyUrl) {
  try {
    var resp = await fetch(proxyUrl + '/api/parcel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: lat, lng: lng }),
    });
    if (!resp.ok) return { ok: false, fallback: 'manual', error: 'HTTP ' + resp.status };
    return await resp.json();
  } catch (e) {
    return { ok: false, fallback: 'manual', error: e.message };
  }
}
