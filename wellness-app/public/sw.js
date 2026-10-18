// WellnessApp service worker (F21): network-first for the app shell, with an offline fallback.
// API calls are never cached, so your health data is always live.
const CACHE = 'wellness-shell-v4';
const SHELL = ['/', '/index.html', '/styles.css', '/icon.svg', '/tiara.svg', '/manifest.webmanifest', '/js/app.js', '/js/api.js', '/js/ui.js', '/js/bmi-calc.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(async () => (await caches.match(e.request)) || (e.request.mode === 'navigate' ? caches.match('/index.html') : Response.error())),
  );
});
