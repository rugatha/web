import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
  const listeners = {}, stores = new Map();
  let offline = false, version = 1, claimed = 0;
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(request) { return store.get(typeof request === 'string' ? request : request.url)?.clone(); },
        async put(request, response) { store.set(typeof request === 'string' ? request : request.url, response.clone()); },
        async addAll(urls) { for (const url of urls) store.set(url, new Response(url)); }
      };
    },
    async match(request) {
      for (const name of stores.keys()) {
        const response = await (await caches.open(name)).match(request);
        if (response) return response;
      }
    }
  };
  const self = { location: { origin: 'https://rugatha.test', hostname: 'rugatha.test' },
    addEventListener: (name, callback) => listeners[name] = callback,
    skipWaiting: async () => {}, clients: { claim: async () => claimed++ } };
  vm.runInNewContext(readFileSync('sw.js', 'utf8'), { self, caches, URL, Response,
    fetch: async () => { if (offline) throw new Error('offline'); return new Response(`version-${version}`); } });
  return {
    caches, stores,
    offline: value => offline = value, version: value => version = value,
    get claimed() { return claimed; },
    async lifecycle(name) { let task; listeners[name]({ waitUntil: promise => task = promise }); await task; },
    async fetch(path, mode = 'cors') {
      let result;
      listeners.fetch({ request: { method: 'GET', url: `https://rugatha.test${path}`, mode }, respondWith: promise => result = promise });
      return await result;
    }
  };
}

test('PWA upgrade removes old Rugatha caches, preserves unrelated caches, and precaches all spellbook modules', async () => {
  const w = worker();
  await w.caches.open('rugatha-pwa-v21-runtime'); await w.caches.open('other-app');
  await w.lifecycle('install'); await w.lifecycle('activate');
  assert.equal(w.stores.has('rugatha-pwa-v21-runtime'), false);
  assert.equal(w.stores.has('other-app'), true);
  assert.equal(w.claimed, 1);
  const staticCache = w.stores.get('rugatha-pwa-v22-static');
  for (const name of ['page', 'state', 'transport']) assert(staticCache.has(`/shared/spellbook-${name}.js`));
  assert(staticCache.has('/shared/spellbooks.js'));
});

test('feature flags use fresh network configuration instead of one-navigation-old cached values', async () => {
  const w = worker();
  const paths = ['/shared/firebase.config.js', '/shared/firebase.config.js?v=spellbook-release'];
  for (const path of paths) assert.equal(await (await w.fetch(path)).text(), 'version-1');
  w.version(2);
  for (const path of paths) assert.equal(await (await w.fetch(path)).text(), 'version-2');
  w.offline(true);
  for (const path of paths) assert.equal(await (await w.fetch(path)).text(), 'version-2');
});

test('uncached offline JavaScript is not replaced with homepage HTML; cached navigation still works', async () => {
  const w = worker();
  await w.fetch('/toolbox/spells/', 'navigate'); w.offline(true);
  assert.equal(await (await w.fetch('/toolbox/spells/', 'navigate')).text(), 'version-1');
  assert.equal((await w.fetch('/shared/firebase.config.js')).type, 'error');
});
