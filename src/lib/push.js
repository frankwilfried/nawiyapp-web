import client from '../api/client';

/**
 * Notifications push : chauffeur prévenu d'une course, passager prévenu de l'arrivée du chauffeur,
 * même appli en arrière-plan. Sur iPhone, seulement une fois l'appli ajoutée à l'écran d'accueil.
 */
export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const pushPermission = () => (pushSupported() ? Notification.permission : 'unsupported');

// Clé VAPID en base64url → Uint8Array attendu par PushManager
export function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

let keyPromise;
const publicKey = () => (keyPromise ??= client.get('/push/public-key').then(r => r.data.publicKey).catch(() => null));

/**
 * Demande l'autorisation si besoin (doit venir d'un geste de l'utilisateur), abonne le navigateur
 * et l'enregistre côté serveur. Renvoie 'granted' | 'denied' | 'default' | 'unsupported' | 'unavailable'.
 */
export async function enablePush({ anonClientId, prompt = true } = {}) {
  if (!pushSupported()) return 'unsupported';
  const key = await publicKey();
  if (!key) return 'unavailable';
  let permission = Notification.permission;
  if (permission === 'default' && prompt) permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;

  const reg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('sw')), 8000)),
  ]).catch(() => null);
  if (!reg) return 'unavailable';
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  await client.post('/push/subscribe', { subscription: sub.toJSON(), anon_client_id: anonClientId });
  return 'granted';
}
