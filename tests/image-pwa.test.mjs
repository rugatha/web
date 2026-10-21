import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const base = 'https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/';
const url = n => `${base}${encodeURIComponent(`public-images/npcs/npc-${n}/${'a'.repeat(64)}/thumb.webp`)}?alt=media`;
function worker({ bytes = 20 } = {}) {
  const listeners = {}, stores = new Map();
  let calls = 0, offline = false;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      const key = request => typeof request === 'string' ? request : request.url;
      return {
        async match(request) { return store.get(key(request))?.clone(); },
        async put(request, response) { store.set(key(request), response.clone()); },
        async delete(request) { return store.delete(key(request)); },
        async keys() { return [...store.keys()].map(value => new Request(value)); }
      };
    }
  };
  vm.runInNewContext(readFileSync('sw.js', 'utf8'), {
    self: { location: { origin: 'https://rugatha.test', hostname: 'rugatha.test' }, addEventListener: (name, callback) => listeners[name] = callback },
    caches, URL, Request, Response, Headers, Date,
    fetch: async request => {
      calls++;
      assert.equal(request.mode, 'cors'); assert.equal(request.credentials, 'omit');
      if (offline) throw new Error('offline');
      return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/webp' } });
    }
  });
  return {
    stores, get calls() { return calls; }, offline: value => offline = value,
    async fetch(value) {
      let response;
      const tasks = [];
      listeners.fetch({ request: new Request(value, { mode: 'no-cors' }), respondWith: result => response = result, waitUntil: task => tasks.push(task) });
      const result = await response;
      await Promise.all(tasks);
      return result;
    }
  };
}

test('public images are cache-first and available offline; private or token URLs bypass cache', async () => {
  const w = worker();
  assert.equal((await w.fetch(url(1))).ok, true);
  assert.equal((await w.fetch(url(1))).ok, true);
  assert.equal(w.calls, 1);
  w.offline(true);
  assert.equal((await w.fetch(url(1))).ok, true);
  assert.equal((await w.fetch(url(2))).type, 'error');
  const calls = w.calls;
  assert.equal(await w.fetch(url(1) + '&token=secret'), undefined);
  assert.equal(await w.fetch(`${base}profile-photos%2Fowner%2Favatar.webp?alt=media`), undefined);
  assert.equal(await w.fetch(url(1).replace('/b/rugatha-87e15.', '/b/other.')), undefined);
  assert.equal(w.calls, calls);
});

test('image cache evicts oldest entries above its count limit', async () => {
  const w = worker();
  for (let n = 0; n < 121; n++) await w.fetch(url(n));
  const cache = [...w.stores.values()][0];
  assert.equal(cache.size, 120);
  assert.equal(cache.has(url(0)), false);
  assert.equal(cache.has(url(120)), true);
});

test('image cache enforces byte budget and skips oversized responses', async () => {
  const w = worker({ bytes: 1000000 });
  for (let n = 0; n < 35; n++) await w.fetch(url(n));
  const cache = [...w.stores.values()][0];
  const total = [...cache.values()].reduce((sum, response) => sum + Number(response.headers.get('Content-Length')), 0);
  assert.ok(total <= 32 * 1024 * 1024);
  assert.equal(cache.has(url(0)), false);
  const big = worker({ bytes: 1024 * 1024 + 1 });
  await big.fetch(url(1));
  assert.equal([...big.stores.values()][0].size, 0);
});
