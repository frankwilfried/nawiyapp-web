/**
 * Calcule la distance en mètres entre deux points GPS (Haversine)
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Trouve le point focal le plus proche d'une position GPS
 */
export function nearestFocalPoint(lat, lng, focalPoints, maxDistance = 2000) {
  let nearest = null;
  let minDist = Infinity;
  for (const fp of focalPoints) {
    const d = haversineDistance(lat, lng, fp.lat, fp.lng);
    if (d < minDist) { minDist = d; nearest = fp; }
  }
  return minDist <= maxDistance ? { ...nearest, distance_meters: Math.round(minDist) } : null;
}

/**
 * Géocodage via Nominatim (OpenStreetMap)
 */
export async function geocodeAddress(address, city = 'Douala') {
  try {
    const q = encodeURIComponent(`${address}, ${city}, Cameroun`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'fr' } }
    );
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
  } catch (_) {
    return null; // Nominatim indisponible — fallback géré par l'appelant
  }
}

/**
 * Heures de pointe : 7h-9h et 17h-20h (UTC+1)
 */
export function isPeakHour() {
  const h = new Date().getUTCHours() + 1; // UTC+1
  return (h >= 7 && h < 9) || (h >= 17 && h < 20);
}

export function applyPeakMultiplier(duration_min) {
  return isPeakHour() ? Math.round(duration_min * 1.4) : duration_min;
}
