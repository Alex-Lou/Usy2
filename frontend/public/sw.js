/*
 * MemoCat service worker — minimal and safe.
 * Goal: make the app installable and give a graceful offline shell, WITHOUT
 * ever caching authenticated data or breaking live features.
 *
 * Rules:
 * - Only same-origin GET requests are considered.
 * - /api and /ws are always bypassed (network only) — never cached.
 * - Navigations: network-first, fall back to the cached shell when offline.
 * - Hashed build assets (/assets/) and icons: cache-first (they're immutable).
 * - Bumping CACHE invalidates everything on the next load.
 */
const CACHE = "memocat-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin (fonts CDN, etc.) pass through
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/ws")) return; // never cache data

  // App navigations: network-first so a new deploy is picked up, offline falls back to shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/", { ignoreSearch: true }).then((r) => r || Response.error())),
    );
    return;
  }

  // Immutable static assets: cache-first.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});
