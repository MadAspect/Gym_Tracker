// PWA layer: caches the app files so it opens offline.
// Network first: online you always get the latest files (and never a stale/new mix); offline, or on a slow
// connection, the saved copy is used.
const CACHE = "gym-v8";
const FILES = ["./", "index.html", "css/style.css", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png",
  "js/app.js", "js/db.js", "js/logic.js", "js/numpad.js", "js/progress.js", "js/routine.js", "js/sync.js", "js/settings.js",
  "js/ui.js", "js/illustrations.js", "js/calendar.js", "js/theme.js"];

self.addEventListener("install", (e) => {
  // "reload" skips the browser's own cache so we never save an out-of-date copy; one missing file can't block the install
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(FILES.map((f) => c.add(new Request(f, { cache: "reload" }))))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  // Only our own GET requests; the Google Sheets upload (POST, other origin) passes straight through.
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const net = fetch(e.request, { cache: "no-cache" }).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; });
    const slow = new Promise((res) => setTimeout(res, 3000, null)); // slow connection: fall back to the saved copy
    try { return (await Promise.race([net, slow])) || (await c.match(e.request)) || net; }
    catch { return (await c.match(e.request)) || Response.error(); }
  }));
});
