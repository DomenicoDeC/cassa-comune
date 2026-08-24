const CACHE_NAME = 'cassa-comune-v1';
const ASSETS = [
  '/cassa-comune/',
  '/cassa-comune/index.html',
  '/cassa-comune/style.css',
  '/cassa-comune/js/app.js',
  '/cassa-comune/js/ui.js',
  '/cassa-comune/js/state.js',
  '/cassa-comune/js/storage.js',
  '/cassa-comune/js/sync.js',
  '/cassa-comune/js/charts.js',
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for JS/API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Always fetch Firebase and external APIs from network
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh response
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
