const CACHE_VERSION = "rugatha-pwa-v12";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/rugatha-favicon.png",
  "/assets/rugatha-favicon-32.png",
  "/assets/rugatha-icon.png",
  "/assets/rugatha-icon-32.png",
  "/assets/rugatha-icon-192.png",
  "/assets/rugatha-icon-512.png",
  "/assets/rugatha-icon-maskable-512.png",
  "/shared/pwa.js",
  "/shared/styles/theme.css",
  "/styles/home.css?v=campaign-link-20260701"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("rugatha-pwa-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isSameOriginGet = (request) =>
  request.method === "GET" && new URL(request.url).origin === self.location.origin;

const networkFirst = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    return cached || caches.match("/index.html");
  }
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || fetched || caches.match(request);
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isSameOriginGet(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
