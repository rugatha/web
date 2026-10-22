const CACHE_VERSION = "rugatha-pwa-v28";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}-public-images`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/logo/rugatha-favicon.png",
  "/assets/logo/rugatha-favicon-32.png",
  "/assets/logo/rugatha-icon.png",
  "/assets/logo/rugatha-icon-32.png",
  "/assets/logo/rugatha-icon-192.png",
  "/assets/logo/rugatha-icon-512.png",
  "/assets/logo/rugatha-icon-maskable-512.png",
  "/shared/pwa.js",
  "/shared/pwa.js?v=20261022-letter-reading-r2",
  "/shared/auth-session.js?v=20261019-character-books-1",
  "/shared/firebase.config.js",
  "/shared/spell-catalog.js?v=20261018-storage-1",
  "/shared/spellbook-page.js?v=20261019-character-books-1",
  "/shared/spellbook-state.js?v=20261019-character-books-1",
  "/shared/spellbook-transport.js?v=20261019-character-books-1",
  "/shared/spellbooks.js?v=20261019-character-books-1",
  "/shared/character-spellbook.js?v=20261019-character-books-1",
  "/shared/character-spellbook-ui.js?v=20261019-character-books-2",
  "/shared/character-sheets.js?v=20261019-character-books-1",
  "/shared/member-path.js",
  "/shared/firebase-data.js",
  "/shared/language-toggle.js",
  "/shared/styles/theme.css",
  "/styles/home.css?v=mobile-logo-150-20260703"
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

// Only these public, immutable reference files may enter the cross-origin cache.
// Auth, Firestore and private Storage requests must never enter this cache.
const SPELL_CATALOG_URLS = [
  "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/catalogs%2Fspells%2F2026-10-18-v1%2Fspells-phb.json?alt=media",
  "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/catalogs%2Fspells%2F2026-10-18-v1%2Fclass_spells.json?alt=media"
];

// Only immutable editorial WebP variants from the reviewed bucket may enter this
// cache. Download tokens, other buckets, private objects and other endpoints bypass it.
const isPublicImage = (request) => {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== "https://firebasestorage.googleapis.com" || url.search !== "?alt=media") return false;
  try {
    return /^\/v0\/b\/rugatha-87e15\.firebasestorage\.app\/o\/public-images\/(arcs|chapters|npcs)\/[a-z0-9_-]+\/[a-f0-9]{64}\/(thumb|reading)\.webp$/.test(decodeURIComponent(url.pathname));
  } catch (_) { return false; }
};

const IMAGE_MAX_ENTRIES = 120;
const IMAGE_MAX_BYTES = 32 * 1024 * 1024;
const IMAGE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
let imageCacheWrite = Promise.resolve();
const imageFallback = async (otherwise = Response.error()) => {
  const fallback = await caches.match?.("/assets/logo/rugatha-icon-192.png");
  if (!fallback) return otherwise;
  // Never let the browser retain a temporary placeholder under an image URL.
  const headers = new Headers(fallback.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(await fallback.arrayBuffer(), { status: 200, headers });
};
const imageCacheFirst = async (request, event) => {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);
  if (cached && Date.now() - Number(cached.headers.get("X-Rugatha-Cached-At") || 0) < IMAGE_MAX_AGE) return cached;
  if (cached) await cache.delete(request);
  try {
    // An img without crossorigin starts as no-cors. Explicit CORS fetch gives a
    // readable response; never store opaque responses with unknown size/status.
    const response = await fetch(new Request(request, { mode: "cors", credentials: "omit" }));
    if (!response.ok || !response.headers.get("Content-Type")?.startsWith("image/webp")) return imageFallback(response);
    const body = await response.clone().arrayBuffer();
    if (body.byteLength > 1024 * 1024) return response;
    const headers = new Headers(response.headers);
    headers.set("X-Rugatha-Cached-At", String(Date.now()));
    headers.set("Content-Length", String(body.byteLength));
    const stored = new Response(body, { status: response.status, headers });
    imageCacheWrite = imageCacheWrite.catch(() => {}).then(async () => {
      await cache.put(request, stored);
      const keys = await cache.keys();
      let total = 0;
      const entries = [];
      for (const key of keys) {
        const item = await cache.match(key);
        const at = Number(item?.headers.get("X-Rugatha-Cached-At") || 0);
        if (Date.now() - at >= IMAGE_MAX_AGE) { await cache.delete(key); continue; }
        const size = Number(item?.headers.get("Content-Length") || 0);
        total += size; entries.push({ key, size });
      }
      while (entries.length > IMAGE_MAX_ENTRIES || total > IMAGE_MAX_BYTES) {
        const oldest = entries.shift(); total -= oldest.size;
        await cache.delete(oldest.key);
      }
    });
    event.waitUntil(imageCacheWrite.catch(() => {}));
    return response;
  } catch (_) {
    return imageFallback();
  }
};

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
    if (cached) return cached;
    return request.mode === "navigate" ? caches.match("/index.html") : Response.error();
  }
};

const staleWhileRevalidate = async (request, event) => {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  event.waitUntil(fetched);
  return cached || await fetched || await caches.match(request) || Response.error();
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (isPublicImage(request)) {
    event.respondWith(imageCacheFirst(request, event));
    return;
  }
  if (!isSameOriginGet(request) && !(request.method === "GET" && SPELL_CATALOG_URLS.includes(request.url))) return;

  if (["localhost", "127.0.0.1", "::1"].includes(self.location.hostname)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  const pathname = new URL(request.url).pathname;
  // Fresh chapter JSON exposes new reading links immediately while retaining
  // the last successful body for a previously visited chapter offline.
  if (request.mode === "navigate" || pathname === "/shared/firebase.config.js" || pathname === "/campaigns/data/chapter-content.json") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, event));
});
