importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAFuVpVJQb51MYqXyKD9w9ETwI-FHKv2k8',
  authDomain: 'virtus-financeiro-cd7bd.firebaseapp.com',
  projectId: 'virtus-financeiro-cd7bd',
  storageBucket: 'virtus-financeiro-cd7bd.firebasestorage.app',
  messagingSenderId: '508459921027',
  appId: '1:508459921027:web:fb54b7f94795bdb88735b6',
});

const messaging = firebase.messaging();

const CACHE_NAME = 'sibanki-v2';
const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') || new Response('Offline', { status: 503 }))
    );
    return;
  }

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response('Asset not found or offline', { status: 404 });
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const clickAction = payload.data?.click_action || '/';

  if (!title) return;

  self.registration.showNotification(title, {
    body: body || '',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: { url: clickAction },
    actions: [{ action: 'open', title: 'Abrir' }],
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
