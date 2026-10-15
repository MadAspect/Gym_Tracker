// PWA layer: caches the app files so it opens offline. Stale-while-revalidate:
// serve the cached copy instantly, refresh it in the background for next time.
const CACHE = "gym-v1";
const FILES = ["./", "index.html", "css/style.css", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "js/app.js", "js/db.js", "js/logic.js", "js/numpad.js", "js/progress.js", "js/routine.js", "js/sync.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  // Only handle our own GET requests; the Google Sheets upload (POST, other origin) passes straight through.
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
