/* eslint-disable no-restricted-globals */
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {
    title: 'NovaFit',
    body: 'התראה חדשה מ-NovaFit',
    icon: '/placeholder.svg'
  };

  const options = {
    body: data.body,
    icon: data.icon || '/placeholder.svg',
    badge: '/placeholder.svg',
    data: data.url || '/',
    vibrate: [100, 50, 100]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Basic caching for offline functionality
const CACHE_NAME = 'novafit-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/placeholder.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
