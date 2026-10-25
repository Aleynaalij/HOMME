// HOMME service worker: makes the site installable and shows an offline page when there's no signal.
const CACHE = "homme-v1";
const OFFLINE = "/offline.html";
const PRECACHE = [OFFLINE, "/brand/homme-logo.png", "/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Only handle page loads; everything else (API, booking, Supabase) always goes to the network.
  if (req.method !== "GET" || req.mode !== "navigate") return;
  e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
});
