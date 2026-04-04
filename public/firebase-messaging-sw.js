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
