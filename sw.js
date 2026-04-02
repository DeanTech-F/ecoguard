// EcoGuard Service Worker v1.0
// Enables offline use, caching, and background sync

const CACHE_NAME = 'ecoguard-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap'
];

// Install — cache all assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[EcoGuard SW] Caching app shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || network;
    })
  );
});

// Background Sync for alert buffering when offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-alerts') {
    event.waitUntil(syncAlerts());
  }
});

async function syncAlerts() {
  // In a real backend, this would POST buffered alerts to the server
  console.log('[EcoGuard SW] Syncing buffered alerts...');
}

// Push notifications from server
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'EcoGuard Alert';
  const options = {
    body: data.body || 'Oil concentration threshold exceeded',
    icon: './icon.svg',
    badge: './icon.svg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'ecoguard-alert',
    data: { url: './' },
    actions: [
      { action: 'view', title: 'View Dashboard' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(clients.openWindow('./'));
  }
});
