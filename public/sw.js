// Repeat visits: the app's hashed files and the card posters come from the
// cache at once (and are refreshed quietly in the background), and any image
// the components pull from ImageKit is kept too. Pages themselves always go to
// the network first so a new deploy shows up, falling back to the cached shell
// when offline.
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const IMAGES = `images-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, IMAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheFirst = async (req, name) => {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(req, res.clone());
  return res;
};

const staleWhileRevalidate = async (req, name) => {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const refresh = fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") cache.put(req, res.clone());
    return res;
  });
  return hit || refresh;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.startsWith("/assets/")) return e.respondWith(cacheFirst(req, STATIC));
    if (url.pathname.startsWith("/posters/")) return e.respondWith(staleWhileRevalidate(req, IMAGES));
    if (req.mode === "navigate") {
      return e.respondWith(
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(STATIC).then((c) => c.put("/index.html", copy));
          return res;
        }).catch(() => caches.match("/index.html"))
      );
    }
    return;
  }
  if (url.hostname === "ik.imagekit.io" && req.destination === "image") e.respondWith(staleWhileRevalidate(req, IMAGES));
});
