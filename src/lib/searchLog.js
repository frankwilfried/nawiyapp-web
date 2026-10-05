import client from '../api/client';

/**
 * Signale une recherche d'itinéraire au serveur, pour savoir quels trajets collecter en priorité.
 * Anonyme : noms de lieux et positions arrondies à ~100 m, jamais « Ma position » ni l'identité.
 */
export function logSearch(city, from, to, trip) {
  const found = !!trip?.legs?.some(l => l.kind === 'ride' && !l.estimated);
  const name = (p) => (p?.isMyPosition || /ma position/i.test(p?.name || '') ? null : p?.name || null);
  client.post('/graph/search-log', {
    city, found,
    from_name: name(from), from_lat: from.lat, from_lng: from.lng,
    to_name: name(to), to_lat: to.lat, to_lng: to.lng,
  }).catch(() => {});
}
