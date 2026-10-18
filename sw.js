const CACHE_VERSION = "rugatha-pwa-v25";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

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
  if (!isSameOriginGet(request) && !(request.method === "GET" && SPELL_CATALOG_URLS.includes(request.url))) return;

  if (["localhost", "127.0.0.1", "::1"].includes(self.location.hostname)) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  if (request.mode === "navigate" || new URL(request.url).pathname === "/shared/firebase.config.js") {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, event));
});
