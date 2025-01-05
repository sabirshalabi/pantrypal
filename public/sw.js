// Import workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

// Check if workbox is loaded
if (workbox) {
  console.log('Workbox is loaded');
} else {
  console.log('Workbox did not load');
}

// Use workbox strategies
const { strategies, routing, precaching, cacheableResponse, expiration } = workbox;

// Precache static resources
precaching.precacheAndRoute(self.__WB_MANIFEST || []);

// Cache page navigations
routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new strategies.StaleWhileRevalidate({
    cacheName: 'pages',
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  })
);

// Cache images
routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new strategies.CacheFirst({
    cacheName: 'images',
    plugins: [
      new cacheableResponse.CacheableResponsePlugin({
        statuses: [200],
      }),
      new expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
      }),
    ],
  })
);

// Cache static resources (CSS, JS)
routing.registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new strategies.StaleWhileRevalidate({
    cacheName: 'static-resources',
  })
);

// Cache Firebase resources
routing.registerRoute(
  ({ url }) => url.origin === 'https://firebasestorage.googleapis.com',
  new strategies.NetworkFirst({
    cacheName: 'firebase-storage-cache',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Cache Google Fonts
routing.registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new strategies.CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// Handle offline fallback
self.addEventListener('install', (event) => {
  const offlinePage = new Response('You are offline. Please check your connection.', {
    headers: { 'Content-Type': 'text/html' },
  });
  event.waitUntil(
    caches.open('offline').then((cache) => cache.put('/offline.html', offlinePage))
  );
});

// Service worker activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old cache versions
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== 'offline') {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim clients
      self.clients.claim(),
    ])
  );
});
