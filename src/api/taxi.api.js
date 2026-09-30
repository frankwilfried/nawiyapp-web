import client from './client';
import { CATEGORIES, priceFor, roadKm } from '../lib/pricing';

// Estimation hors ligne : mêmes prix que le serveur, sans info sur les chauffeurs proches
function localEstimate(from, to) {
  const distance_km = roadKm(from, to);
  return {
    offline: true,
    distance_km,
    categories: Object.entries(CATEGORIES).map(([id, c]) => ({
      id, label: c.label, seats: c.seats, price: priceFor(id, distance_km), drivers_nearby: null, pickup_eta_min: null,
    })),
    payment_methods: [
      { id: 'cash', label: 'Espèces', available: true, needs_phone: false },
      { id: 'momo', label: 'MTN Mobile Money', available: false, needs_phone: true },
      { id: 'orange_money', label: 'Orange Money', available: false, needs_phone: true },
    ],
  };
}

/** Prix par catégorie, chauffeurs proches et moyens de paiement disponibles. */
export async function getTaxiEstimate(from, to, city) {
  try {
    const { data } = await client.get('/taxi/estimate', {
      params: { from_lat: from.lat, from_lng: from.lng, to_lat: to.lat, to_lng: to.lng, city },
      timeout: 5000,
    });
    return data;
  } catch {
    return localEstimate(from, to);
  }
}
