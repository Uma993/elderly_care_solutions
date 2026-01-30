const CACHE_NAME = 'elderly-care-shell-v1';
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

