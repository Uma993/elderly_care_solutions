const CACHE_NAME = 'elderly-care-shell-v2';
// Only static shell assets; never cache API or Firebase (auth/user data).
const CORE_ASSETS = ['/', '/index.html'];

function isAuthOrApiRequest(url) {
  try {
    const u = new URL(url);
    if (u.pathname.startsWith('/api/')) return true;
    if (u.hostname.includes('firestore.googleapis.com') || u.hostname.includes('firebase')) return true;
    return false;
  } catch (_) {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache API or Firebase; always go to network (fail when offline).
  if (isAuthOrApiRequest(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // For navigation requests, serve index.html from cache when offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(CACHE_NAME).then((cache) => cache.match('/index.html'))
      )
    );
    return;
  }

  // All other requests: network only (no caching of JS/CSS here; keep auth data safe)
  event.respondWith(fetch(request));
});

self.addEventListener('push', (event) => {
  let title = 'SOS';
  let body = 'An elder needs help.';
  let url = '/';
  let pushData = {};
  let type = 'sos';
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.url) url = data.url;
      if (data.data && typeof data.data === 'object') pushData = data.data;
      if (data.type) type = data.type;
    } catch (_) {}
  }
  const openUrl = pushData.url || url;
  const isMedicine = type === 'medicine';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      vibrate: isMedicine ? [] : [500, 200, 500, 200, 500, 200, 1000],
      requireInteraction: !isMedicine,
      data: { url: openUrl, ...pushData },
      tag: isMedicine ? 'medicine-reminder' : 'sos'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';
  const fullUrl = url.startsWith('http') ? url : self.location.origin + (url.startsWith('/') ? url : '/' + url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin)) {
          if (client.navigate) {
            client.navigate(fullUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(fullUrl);
    })
  );
});
