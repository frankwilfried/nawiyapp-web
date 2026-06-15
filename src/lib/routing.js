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

// Traduction des manœuvres OSRM en français
const MANEUVER_FR = {
  'turn-left':           'Tournez à gauche',
  'turn-right':          'Tournez à droite',
  'turn-slight left':    'Légèrement à gauche',
  'turn-slight right':   'Légèrement à droite',
  'turn-sharp left':     'Virage serré à gauche',
  'turn-sharp right':    'Virage serré à droite',
  'continue':            'Continuez tout droit',
  'roundabout':          'Prenez le rond-point',
  'merge':               'Fusionnez',
  'depart':              'Démarrez',
  'arrive':              'Vous êtes arrivé',
};

function maneuverText(step) {
  const type = step.maneuver?.type || '';
  const mod  = step.maneuver?.modifier || '';
  const key  = mod ? `${type}-${mod}` : type;
  const base = MANEUVER_FR[key] || MANEUVER_FR[type] || 'Continuez';
  const street = step.name && step.name !== '' ? ` sur ${step.name}` : '';
  return base + street;
}

/**
 * Route complète avec étapes de navigation
 * @returns {{ coords, steps, distanceM, durationS } | null}
 */
export async function getRouteWithSteps(waypoints, profile = 'driving') {
  if (!waypoints || waypoints.length < 2) return null;
  try {
    const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';');
    const url = `${OSRM_BASE}/${profile}/${coords}?overview=full&geometries=geojson&steps=true&annotations=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const steps = route.legs.flatMap(leg => leg.steps).map(s => ({
      instruction: maneuverText(s),
      distanceM:   Math.round(s.distance),
      durationS:   Math.round(s.duration),
      type:        s.maneuver?.type || 'continue',
      location:    s.maneuver?.location, // [lng, lat]
    })).filter(s => s.type !== 'arrive' || true);

    return {
      coords:    route.geometry.coordinates,
      steps,
      distanceM: Math.round(route.distance),
      durationS: Math.round(route.duration),
    };
  } catch (e) {
    console.warn('[routing] getRouteWithSteps échec', e.message);
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
