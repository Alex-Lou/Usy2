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
 * - Share target: Android's "Share" menu POSTs to /share-target; the content is
 *   parked in SHARE_CACHE and the app opens a pre-filled post with it.
 */
const CACHE = "memocat-v1";
const SHARE_CACHE = "memocat-share";
const MAX_SHARED_FILE = 15 * 1024 * 1024;
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SHARE_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Something shared from another app (link, text, photo): keep it for the app,
// which turns it into a draft post, then open the app.
async function receiveShare(req) {
  try {
    const form = await req.formData();
    const field = (name) => String(form.get(name) || "").slice(0, 2000);
    const file = form.getAll("media").find((f) => f && typeof f === "object" && f.type.startsWith("image/") && f.size <= MAX_SHARED_FILE);
    const cache = await caches.open(SHARE_CACHE);
    await cache.put(
      "/shared/meta",
      new Response(JSON.stringify({ title: field("title"), text: field("text"), url: field("url"), fileName: file ? file.name : null, at: Date.now() })),
    );
    if (file) await cache.put("/shared/file", new Response(file, { headers: { "Content-Type": file.type } }));
    else await cache.delete("/shared/file");
  } catch {
    /* unreadable share: just open the app */
  }
  return Response.redirect("/?share=1", 303);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === "POST" && url.origin === self.location.origin && url.pathname === "/share-target") {
    event.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== "GET") return;

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

// Web Push from the server (the app may be closed). The payload is small JSON:
// { title, body, url, tag } — who did what, never message content.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* unreadable payload: fall back to a generic banner */
  }
  const options = {
    body: data.body || "Du nouveau sur MemoCat 💕",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: typeof data.url === "string" && /^\/(?!\/)/.test(data.url) ? data.url : "/" },
  };
  if (data.tag) {
    options.tag = data.tag; // same conversation/post: replace instead of stacking
    options.renotify = true;
  }
  event.waitUntil(self.registration.showNotification(data.title || "MemoCat", options));
});

// Tapping a MemoCat notification brings the app to the front on the right page
// (or opens it there).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => "focus" in w);
      if (!open) return self.clients.openWindow(url);
      return open.focus().then((w) => w.postMessage({ type: "memocat:navigate", url }));
    }),
  );
});
