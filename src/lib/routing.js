/**
 * Récupère la géométrie de route réelle via OSRM (OpenStreetMap)
 * Pas de clé API requise — données OSM mondiales
 */

const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

/**
 * @param {Array<{lat,lng}>} waypoints
 * @param {string} profile 'driving' | 'walking' | 'cycling'
 * @returns {Array<[lng,lat]> | null}  coordonnées GeoJSON, null si échec
 */
export async function getRoadGeometry(waypoints, profile = 'driving') {
  if (!waypoints || waypoints.length < 2) return null;
  try {
    const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `${OSRM_BASE}/${profile}/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      return data.routes[0].geometry.coordinates; // [[lng,lat], ...]
    }
  } catch (e) {
    console.warn('[routing] OSRM indisponible, tracé en ligne droite', e.message);
  }
  return null;
}

/**
 * Trouve le point focal le plus proche d'une position GPS
 * @param {number} lat
 * @param {number} lng
 * @param {Array} nodes
 * @returns {{ node, distanceKm, walkMinutes }}
 */
export function findNearestNode(lat, lng, nodes) {
  if (!nodes?.length) return null;
  const R = 6371;
  let nearest = null;
  let minDist = Infinity;
  for (const node of nodes) {
    const dLat = (node.lat - lat) * Math.PI / 180;
    const dLng = (node.lng - lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2
      + Math.cos(lat * Math.PI/180) * Math.cos(node.lat * Math.PI/180) * Math.sin(dLng/2)**2;
    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    if (d < minDist) { minDist = d; nearest = node; }
  }
  return {
    node:        nearest,
    distanceKm:  Math.round(minDist * 100) / 100,
    walkMinutes: Math.max(1, Math.round(minDist / 0.08)), // ~5 km/h
  };
}
