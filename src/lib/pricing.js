/**
 * Tarification des courses taxi à la demande (façon Yango / Uber).
 * ⚠️ Copie conforme de nawiyapp-backend/src/lib/pricing.js : le prix affiché au passager
 * doit être exactement celui enregistré par le serveur. Modifier les deux ensemble.
 */

// Tarifs en FCFA — à ajuster selon le marché
export const CATEGORIES = {
  eco:     { label: 'Nawiy Éco',     base: 500, perKm: 250, min: 1000, step: 100, seats: 4 },
  confort: { label: 'Nawiy Confort', base: 800, perKm: 350, min: 1500, step: 100, seats: 4 },
  moto:    { label: 'Nawiy Moto',    base: 200, perKm: 150, min: 300,  step: 50,  seats: 1 },
};

// Rapport moyen distance par la route / distance à vol d'oiseau en ville
export const ROAD_FACTOR = 1.3;

// Vitesse moyenne en ville, pour estimer l'arrivée du chauffeur (km/h)
const CITY_SPEED_KMH = { eco: 20, confort: 20, moto: 25 };

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const roadKm = (from, to) => Math.round(haversineKm(from.lat, from.lng, to.lat, to.lng) * ROAD_FACTOR * 10) / 10;

/** Prix fixe annoncé avant la commande, arrondi au palier supérieur. */
export function priceFor(category, distanceKm) {
  const c = CATEGORIES[category];
  if (!c) throw new Error(`Catégorie inconnue : ${category}`);
  const raw = c.base + c.perKm * Math.max(0, distanceKm);
  return Math.max(c.min, Math.ceil(raw / c.step) * c.step);
}

/** Minutes estimées pour parcourir distanceKm (au moins 1). */
export function etaMinutes(category, distanceKm) {
  const speed = CITY_SPEED_KMH[category] || 20;
  return Math.max(1, Math.round((distanceKm * ROAD_FACTOR / speed) * 60));
}
