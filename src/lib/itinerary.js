/**
 * Itinéraire complet façon DB Navigator, adapté au transport informel :
 * marche jusqu'au premier carrefour → taxis / motos avec changements → marche finale.
 *
 * Il n'existe pas d'horaires : toutes les heures sont des ESTIMATIONS calculées
 * à partir de l'heure de départ, des durées du graphe et d'attentes moyennes.
 */
import { findPath } from './pathfinder';
import { findNearestNode } from './routing';

const WALK_MIN_PER_KM   = 12;   // ~5 km/h
const MAX_WALK_KM       = 0.8;  // au-delà, on propose une moto pour le premier / dernier km
const SAME_PLACE_KM     = 0.05;
const MOTO_MIN_PER_KM   = 2.5;
const CHANGE_WALK_MIN   = 2;    // traverser le carrefour pour changer de véhicule
const CHANGE_PENALTY    = 4;    // effort ressenti d'un changement (pour le calcul uniquement)
const PEAK_FACTOR       = 1.4;

// Attente moyenne avant de trouver un véhicule (minutes)
export const WAIT_MIN = { taxi_collectif: 4, moto_taxi: 2, minibus: 8 };

export function haversineKm(a, b) {
  const R = 6371, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Prix indicatif d'une course moto, arrondi à 50 F (100 F minimum)
export const motoPrice = (km) => Math.max(100, Math.ceil((100 + km * 80) / 50) * 50);

// Ce qu'on dit au chauffeur, selon le mode
export function announceFor(transport, destName, price) {
  if (transport === 'taxi_collectif') return `« ${destName}, ${price} »`;
  if (transport === 'minibus')        return `Demande « ${destName} » au chargeur`;
  return `Annonce « ${destName} » et fixe le prix avant de monter`;
}

function walkLeg(from, to, km) {
  return { kind: 'walk', from, to, minutes: Math.max(1, Math.round(km * WALK_MIN_PER_KM)), distanceM: Math.round(km * 100) * 10 };
}

function rideLeg(from, to, transport, minutes, price, { estimated = false, k = 1 } = {}) {
  return {
    kind: 'ride', from, to, transport,
    waitMin: Math.round((WAIT_MIN[transport] ?? 4) * k),
    minutes: Math.max(1, Math.round(minutes * k)),
    price, estimated,
    announce: announceFor(transport, to.name, price),
  };
}

// Premier / dernier kilomètre entre un lieu quelconque et un carrefour du graphe
function accessLeg(from, to, k) {
  const km = haversineKm(from, to);
  if (km < SAME_PLACE_KM) return null;
  if (km <= MAX_WALK_KM) return walkLeg(from, to, km);
  return rideLeg(from, to, 'moto_taxi', km * MOTO_MIN_PER_KM, motoPrice(km), { estimated: true, k });
}

// Un taxi ne va pas plus vite qu'une voiture seule : si la durée saisie est en dessous
// du temps de route OSRM (sans trafic), on la remplace par ce temps majoré (arrêts, trafic).
const ROAD_SLOWDOWN = { taxi_collectif: 1.5, minibus: 1.6, moto_taxi: 1.1 };
export function realisticEdge(e) {
  if (!e.road_duration_min || e.duration_min >= e.road_duration_min * 0.8) return e;
  const duration_min = e.transport === 'a_pied'
    ? Math.max(1, Math.round((e.road_distance_km || 0) * WALK_MIN_PER_KM))
    : Math.round(e.road_duration_min * (ROAD_SLOWDOWN[e.transport] ?? 1.3));
  return { ...e, duration_min: Math.max(e.duration_min, duration_min), corrected: true };
}

// Une moto t'emmène de porte à porte : deux tronçons moto qui se suivent = une seule course
function mergeMotoRides(legs) {
  const out = [];
  for (const leg of legs) {
    const prev = out.at(-1), beforePrev = out.at(-2);
    if (leg.kind === 'ride' && leg.transport === 'moto_taxi'
        && prev?.kind === 'change' && beforePrev?.kind === 'ride' && beforePrev.transport === 'moto_taxi') {
      out.pop(); // retire le changement
      const price = beforePrev.price + leg.price;
      Object.assign(beforePrev, {
        to: leg.to,
        minutes: beforePrev.minutes + leg.minutes,
        price,
        estimated: beforePrev.estimated || leg.estimated,
        announce: announceFor('moto_taxi', leg.to.name, price),
      });
      continue;
    }
    out.push(leg);
  }
  return out;
}

const snap = (point, nodes) => {
  const exact = nodes.find(n => n.id === point.id);
  return exact || findNearestNode(point.lat, point.lng, nodes)?.node || null;
};

/**
 * @param graph  { nodes, edges }
 * @param from   { id?, name, lat, lng }
 * @param to     { id?, name, lat, lng }
 * @returns { legs, departAt, arriveAt, total_duration_min, total_price_fcfa, changes, distance_km, waypoints } | null
 */
export function planTrip(graph, from, to, { departAt = Date.now(), peak = false } = {}) {
  const nodes = graph?.nodes || [];
  if (!nodes.length || !from || !to) return null;
  const k = peak ? PEAK_FACTOR : 1;

  const startNode = snap(from, nodes);
  const endNode   = snap(to, nodes);
  const directKm  = haversineKm(from, to);
  let legs = [];

  if (directKm <= MAX_WALK_KM) {
    // Tout près : on y va à pied
    legs = [walkLeg(from, to, directKm)];
  } else {
    const r = startNode && endNode && startNode.id !== endNode.id
      ? findPath({ nodes, edges: graph.edges.map(realisticEdge) }, startNode.id, endNode.id, 'duration_min', {
          boardingCost: (e) => (e.transport === 'a_pied' ? 0 : (WAIT_MIN[e.transport] ?? 4) + CHANGE_PENALTY),
        })
      : { found: false };

    if (!r.found) {
      // Pas de chemin dans le graphe : moto directe (estimation)
      legs = [rideLeg(from, to, 'moto_taxi', directKm * MOTO_MIN_PER_KM, motoPrice(directKm), { estimated: true, k })];
    } else {
      // Un changement n'existe qu'entre deux véhicules
      const pushLeg = (leg) => {
        if (leg.kind === 'ride' && legs.at(-1)?.kind === 'ride') legs.push({ kind: 'change', at: leg.from, minutes: CHANGE_WALK_MIN });
        legs.push(leg);
      };
      const first = accessLeg(from, startNode, k);
      if (first) pushLeg(first);
      r.path.forEach((s) => {
        if (s.transport === 'a_pied') {
          pushLeg({ ...walkLeg(s.from, s.to, haversineKm(s.from, s.to)), minutes: s.duration_min });
        } else {
          pushLeg(rideLeg(s.from, s.to, s.transport, s.duration_min, s.price_fcfa, { k }));
        }
      });
      const last = accessLeg(endNode, to, k);
      if (last) pushLeg(last);
    }
  }

  legs = mergeMotoRides(legs);

  // Horodatage estimé de chaque étape
  let t = departAt;
  for (const leg of legs) {
    leg.startAt = t;
    t += ((leg.waitMin || 0) + leg.minutes) * 60_000;
    leg.endAt = t;
  }

  const rides = legs.filter(l => l.kind === 'ride');
  const waypoints = [from, ...rides.flatMap(l => [l.from, l.to]), to]
    .filter((p, i, arr) => i === 0 || haversineKm(p, arr[i - 1]) > 0.01)
    .map(p => ({ lat: p.lat, lng: p.lng }));

  return {
    legs,
    departAt,
    arriveAt: t,
    total_duration_min: Math.round((t - departAt) / 60_000),
    total_price_fcfa: rides.reduce((sum, l) => sum + l.price, 0),
    changes: Math.max(0, rides.length - 1),
    distance_km: Math.round(directKm * 10) / 10,
    waypoints,
  };
}
