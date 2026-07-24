// Retires Mapshroom's former offline service worker for existing installations.
// New visitors do not register this file.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.unregister();

      const legacyPrefixes = [
        'workbox-precache',
        'mapshroom-runtime-assets',
        'google-fonts-stylesheets',
        'google-fonts-webfonts',
      ];
      const cacheNames = await self.caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) =>
            legacyPrefixes.some((prefix) => cacheName.startsWith(prefix)),
          )
          .map((cacheName) => self.caches.delete(cacheName)),
      );

      const clients = await self.clients.matchAll({ type: 'window' });
      await Promise.all(clients.map((client) => client.navigate(client.url)));
    })(),
  );
});
