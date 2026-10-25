const CACHE = 'd3-helper-shell-v2';
// Static UI only. Never cache authentication responses or registration data.
const SHELL = [
  '/experience/cons/d3/2026/helper/', '/experience/cons/d3/2026/helper/index.html', '/experience/cons/d3/2026/helper/manifest.webmanifest',
  '/experience/cons/d3/2026/helper/helper.js', '/experience/cons/d3/2026/helper/helper.css',
  '/experience/cons/d3/2026/helper/helper-pwa.js', '/experience/cons/d3/2026/registration-store.js',
  '/admin/d3-dashboard.js', '/admin/data-table.js', '/admin/dashboard-model.js', '/admin/dashboard.css',
  '/shared/firebase.config.js', '/shared/styles/theme.css',
  '/assets/banner/rugatha-banner-trademark-transparent.png',
  '/assets/2026-d3-helper.png',
];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('d3-helper-shell-') && key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method!=='GET' || url.origin!==self.location.origin || !SHELL.includes(url.pathname))return;
  event.respondWith((async()=>{
    try {
      const response=await fetch(event.request,{cache:'no-cache'});
      if(response.ok){const cache=await caches.open(CACHE);await cache.put(url.pathname,response.clone());}
      return response;
    } catch(error){const cached=await caches.match(url.pathname,{cacheName:CACHE});if(cached)return cached;throw error;}
  })());
});
