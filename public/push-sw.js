/* Notifications push NawiyApp — importé par le service worker généré (workbox.importScripts). */

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'NawiyApp', body: event.data?.text() }; }

  event.waitUntil((async () => {
    // Appli ouverte et visible : l'écran affiche déjà l'information, pas de doublon
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.some(w => w.visibilityState === 'visible')) return;

    await self.registration.showNotification(data.title || 'NawiyApp', {
      body: data.body || '',
      tag: data.tag || 'nawiy',
      renotify: true,
      requireInteraction: !!data.requireInteraction,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'fr',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Réutilise l'onglet déjà ouvert plutôt que d'en ouvrir un nouveau (la course y est en cours)
    const same = windows.find(w => w.url === url) || windows[0];
    if (same) {
      await same.focus();
      if (same.url !== url && 'navigate' in same) await same.navigate(url).catch(() => {});
      return;
    }
    await self.clients.openWindow(url);
  })());
});
