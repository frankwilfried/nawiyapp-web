// Distance et direction entre deux points GPS (radar « retrouver ton chauffeur »)
const toRad = (d) => d * Math.PI / 180;

export function distanceM(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Cap de a vers b, en degrés (0 = nord, 90 = est). */
export function bearingDeg(a, b) {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

const POINTS = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ouest', 'ouest', 'nord-ouest'];
export const cardinal = (deg) => POINTS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

/** Direction relative au téléphone quand la boussole est disponible (« devant toi », « à ta droite »…). */
export function relativeDirection(bearing, heading) {
  if (heading == null) {
    const c = cardinal(bearing);
    return `vers ${c === 'est' || c === 'ouest' ? `l'${c}` : `le ${c}`}`;
  }
  const rel = ((bearing - heading) % 360 + 360) % 360;
  if (rel < 30 || rel > 330) return 'devant toi';
  if (rel < 150) return 'à ta droite';
  if (rel <= 210) return 'derrière toi';
  return 'à ta gauche';
}

export const formatDistance = (m) => (m < 1000 ? `${Math.max(5, Math.round(m / 5) * 5)} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
