import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOperation, parseLocalBook, importSource, createSpellbookSession } from '../shared/spellbook-state.js';

const turn = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const add = (...ids) => ({ type: 'add', ids });

test('local parsing preserves recoverable strings and reports malformed data', () => {
  assert.deepEqual(parseLocalBook(null), { ids: [], invalid: false });
  for (const raw of ['', '{broken', '{}', '42', 'null']) assert.equal(parseLocalBook(raw).invalid, true);
  assert.deepEqual(parseLocalBook('["Aid","Aid",3,"Lost"]'), { ids: ['Aid', 'Lost'], invalid: true });
});

test('imports deduplicate both sources, retain unknown names and fingerprint source edits', () => {
  const source = importSource('["Aid","Lost"]', '["Aid","Fireball",5]', new Set(['Aid', 'Fireball']));
  assert.deepEqual(source.ids, ['Aid', 'Fireball']);
  assert.deepEqual(source.unknown, ['Lost']);
  assert.equal(source.invalid, true);
  assert.notEqual(source.fingerprint, importSource('["Aid"]', null, new Set()).fingerprint);
});

test('merge is idempotent for absent, empty and populated books; clear retains empty state', () => {
  for (const before of [[], ['Fireball']]) {
    const merged = applyOperation(before, add('Aid', 'Aid'));
    assert.deepEqual(applyOperation(merged, add('Aid')), merged);
    assert(merged.includes('Aid'));
    if (before.length) assert(merged.includes('Fireball'));
  }
  assert.deepEqual(applyOperation(['Aid'], { type: 'clear' }), []);
  assert.throws(() => applyOperation(Array.from({ length: 500 }, (_, i) => `${i}`), add('extra')));
});

function harness(options = {}) {
  let next, fail, latest, stops = 0;
  const writes = [];
  const session = createSpellbookSession({
    connect: async (onNext, onFail) => { next = onNext; fail = onFail; return () => stops++; },
    write: async (operation, active) => { writes.push(operation); await options.write?.(operation, active); },
    onChange: state => { latest = state; }, enabled: options.enabled
  });
  return { session, writes, get state() { return latest; }, get stops() { return stops; },
    next: (ids = [], confirmed = true) => next({ ids, confirmed }), fail: cause => fail(cause) };
}

test('read failures never initialize or write empty data; cache is not synchronized', async () => {
  const h = harness();
  h.fail(new Error('permission denied'));
  assert.equal(h.state.status, 'error');
  await assert.rejects(h.session.enqueue(add('Aid')));
  assert.equal(h.writes.length, 0);
  h.next(['Aid'], false);
  assert.equal(h.state.status, 'cached');
  h.next(['Aid'], true);
  assert.equal(h.state.status, 'synced');
  h.session.close();
});

test('write failure retains queue; retry resolves import receipt only after server success', async () => {
  let attempts = 0, receipt = false;
  const h = harness({ write: async () => { if (++attempts === 1) throw new Error('offline'); } });
  h.next(['Fireball']);
  const saved = h.session.enqueue(add('Aid')).then(() => { receipt = true; });
  await turn();
  assert.equal(h.state.status, 'error');
  assert.equal(h.state.pending, 1);
  assert.equal(receipt, false);
  h.session.retry(); h.next(['Fireball']);
  await saved;
  assert.equal(receipt, true);
  assert.equal(attempts, 2);
  assert.deepEqual(h.state.ids, ['Fireball', 'Aid']);
  h.session.close();
});

test('account change closes old subscription and ignores late callbacks and writes', async () => {
  const request = deferred();
  let activeCheck;
  const h = harness({ write: async (_, active) => { activeCheck = active; await request.promise; } });
  h.next(['Aid']);
  void h.session.enqueue(add('Fireball')).catch(() => {});
  await turn();
  const oldState = h.state;
  h.session.close();
  assert.equal(activeCheck(), false);
  h.next(['Other account data']); request.resolve();
  await turn();
  assert.equal(h.state, oldState);
  assert.equal(h.stops, 1);
});

test('paused writes do not submit; queued edits remain isolated until enabled and retried', async () => {
  let enabled = false;
  const h = harness({ enabled: () => enabled }); h.next();
  await assert.rejects(h.session.enqueue(add('Aid')));
  assert.equal(h.state.status, 'paused');
  assert.equal(h.writes.length, 0);
  enabled = true;
  await h.session.enqueue(add('Aid'));
  assert.equal(h.writes.length, 1);
  h.session.close();
});

test('late write acknowledgement must not overwrite a newer remote snapshot', async () => {
  const request = deferred();
  const h = harness({ write: () => request.promise }); h.next(['Aid']);
  const saved = h.session.enqueue({ type: 'clear' });
  h.next(['Fireball']); // Another device commits after our clear.
  request.resolve(); await saved;
  assert.deepEqual(h.state.ids, ['Fireball']);
  h.session.close();
});

import { mountSpellbook } from '../shared/spellbook-page.js';

class Element {
  constructor() { this.children = []; this.events = {}; this.textContent = ''; }
  replaceChildren() { this.children = []; }
  append(...items) { this.children.push(...items); }
  setAttribute() {}
  addEventListener(name, action) { this.events[name] = action; }
}

function pageHarness({ enabled = true, legacy = '["Aid"]' } = {}) {
  const storage = new Map([['rugatha.phb.spellbook', legacy]]);
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  globalThis.document = { createElement: () => new Element() };
  const listeners = new Map();
  globalThis.window = { RUGATHA_FEATURE_FLAGS: { dataWritesEnabled: true },
    RUGATHA_FIREBASE_CONFIG: {}, addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name) };
  const panel = new Element(), auth = {};
  let changeUser, state, next, stopped = 0, commit = deferred();
  const loader = async () => [
    { getApps: () => [{}] },
    { getAuth: () => auth, onAuthStateChanged: (_, callback) => { changeUser = user => { auth.currentUser = user; callback(user); }; } },
    { spellbookSyncEnabled: () => enabled, spellbookWritesEnabled: () => enabled && window.RUGATHA_FEATURE_FLAGS.dataWritesEnabled,
      subscribeSpellbook: ({ onChange }) => { next = onChange;
        return { close: () => stopped++, retry() {}, enqueue: () => commit.promise }; } }
  ];
  const page = mountSpellbook({ knownIds: new Set(['Aid', 'Fireball']), panel,
    language: () => 'en', onChange: value => { state = value; }, loadFirebase: loader });
  return { page, panel, storage, commit,
    get state() { return state; }, get stopped() { return stopped; },
    flags: value => { enabled = value; listeners.get('rugatha:feature-flags-changed')?.(); },
    event: name => listeners.get(name)?.(),
    get listeners() { return listeners; },
    user: user => changeUser(user), next: value => next(value),
    button: label => panel.children.find(element => element.textContent === label) };
}

test('page: guest edits preserve legacy backup and survive another guest session', async () => {
  const h = pageHarness(); await turn(); h.user(null);
  assert.deepEqual(h.state.ids, ['Aid']);
  h.page.add('Fireball');
  assert.equal(h.storage.get('rugatha.phb.spellbook'), '["Aid"]');
  assert.equal(h.storage.get('rugatha.phb.spellbook.guest.v1'), '["Aid","Fireball"]');
  h.user(null);
  assert.deepEqual(h.state.ids, ['Aid', 'Fireball']);
  h.page.remove('Aid');
  assert.deepEqual(h.state.ids, ['Fireball']);
});

test('page: import is explicit, server-confirmed, account/source scoped and never auto-replayed', async () => {
  const h = pageHarness(); await turn(); h.user({ uid: 'A' });
  h.next({ ids: ['Fireball'], loaded: true, status: 'synced' });
  assert(h.button('Confirm import'));
  const pending = h.button('Confirm import').events.click();
  assert.equal(h.storage.get('rugatha.phb.spellbook.import.v1.A'), undefined);
  h.commit.resolve(); await pending;
  assert(h.storage.has('rugatha.phb.spellbook.import.v1.A'));
  h.user({ uid: 'A' }); h.next({ ids: [], loaded: true, status: 'synced' });
  assert.equal(h.button('Confirm import'), undefined);
  assert.deepEqual(h.state.ids, []); // Deleting from cloud does not resurrect local spells.
  h.user({ uid: 'B' }); h.next({ ids: [], loaded: true, status: 'synced' });
  assert(h.button('Confirm import'));
  h.storage.set('rugatha.phb.spellbook', '["Aid","Fireball"]');
  h.user({ uid: 'A' }); h.next({ ids: [], loaded: true, status: 'synced' });
  assert(h.button('Confirm import'));
});

test('page: switching accounts during import cannot mark the new account as imported', async () => {
  const h = pageHarness(); await turn(); h.user({ uid: 'A' });
  h.next({ ids: [], loaded: true, status: 'synced' });
  const pending = h.button('Confirm import').events.click();
  h.user({ uid: 'B' }); h.commit.resolve(); await pending;
  assert.equal(h.storage.has('rugatha.phb.spellbook.import.v1.A'), false);
  assert.equal(h.storage.has('rugatha.phb.spellbook.import.v1.B'), false);
  assert.deepEqual(h.state.ids, []);
  assert.equal(h.stopped, 1);
});

test('page: disabled sync never presents the guest backup as an account spellbook', async () => {
  const h = pageHarness({ enabled: false }); await turn(); h.user({ uid: 'A' });
  assert.equal(h.state.canEdit, false);
  assert.deepEqual(h.state.ids, []);
  assert(h.panel.children.some(element => element.textContent.includes('Account sync is disabled')));
});

test('page: damaged guest data remains untouched and editing stays disabled', async () => {
  const h = pageHarness({ legacy: '{broken' }); await turn(); h.user(null);
  assert.equal(h.state.canEdit, false);
  h.page.add('Fireball');
  assert.equal(h.storage.get('rugatha.phb.spellbook'), '{broken');
  assert.equal(h.storage.has('rugatha.phb.spellbook.guest.v1'), false);
});

test('page: local storage write failures leave the old guest list intact and show an error', async () => {
  const h = pageHarness(); await turn(); h.user(null);
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  h.page.add('Fireball');
  assert.deepEqual(h.state.ids, ['Aid']);
  assert(h.panel.children.some(element => element.textContent.includes('Local save failed')));
  assert.equal(h.storage.get('rugatha.phb.spellbook'), '["Aid"]');
});

test('page: deferring import preserves source and failures never create a receipt', async () => {
  const h = pageHarness(); await turn(); h.user({ uid: 'A' });
  h.next({ ids: [], loaded: true, status: 'synced' });
  h.button('Later').events.click();
  assert.equal(h.button('Confirm import'), undefined);
  assert.equal(h.storage.get('rugatha.phb.spellbook'), '["Aid"]');
  h.user({ uid: 'A' }); h.next({ ids: [], loaded: true, status: 'synced' });
  const pending = h.button('Confirm import').events.click();
  h.commit.reject(new Error('permission-denied')); await pending;
  assert.equal(h.storage.has('rugatha.phb.spellbook.import.v1.A'), false);
  assert(h.button('Confirm import'));
});

test('page: runtime kill switch hides cloud data, preserves the session and restores it', async () => {
  const h = pageHarness(); await turn(); h.user({ uid: 'A' });
  h.next({ ids: ['Fireball'], loaded: true, pending: 1, status: 'pending' });
  h.flags(false);
  assert.equal(h.state.canEdit, false);
  assert.deepEqual(h.state.ids, []);
  h.next({ ids: ['Fireball', 'Aid'], loaded: true, pending: 1, status: 'paused' });
  assert.deepEqual(h.state.ids, []);
  assert.equal(h.stopped, 0);
  h.flags(true);
  assert.deepEqual(h.state.ids, ['Fireball', 'Aid']);
  assert.equal(h.state.canEdit, true);
});

test('page: runtime write pause disables buttons immediately without destroying queued work', async () => {
  const h = pageHarness(); await turn(); h.user({ uid: 'A' });
  h.next({ ids: ['Aid'], loaded: true, pending: 1, status: 'pending' });
  window.RUGATHA_FEATURE_FLAGS.dataWritesEnabled = false; h.event('rugatha:feature-flags-changed');
  assert.equal(h.state.canEdit, false);
  assert.equal(h.stopped, 0);
  assert(h.panel.children.some(element => element.textContent.includes('Writes paused')));
  window.RUGATHA_FEATURE_FLAGS.dataWritesEnabled = true; h.event('rugatha:feature-flags-changed');
  assert.equal(h.state.canEdit, true);
});

test('page: destroy releases subscriptions and all mounted event listeners once', async () => {
  const h = pageHarness(); await turn(); h.user({ uid: 'A' });
  assert.equal(h.listeners.size, 4);
  h.page.destroy(); h.page.destroy();
  assert.equal(h.stopped, 1);
  assert.equal(h.listeners.size, 0);
});

import { spellbookAccessEnabled } from '../shared/spellbook-state.js';
test('staged rollout permits only allowlisted member UIDs and fails closed on malformed flags', () => {
  assert.equal(spellbookAccessEnabled({ spellbookSyncEnabled: false }, 'A'), false);
  assert.equal(spellbookAccessEnabled({ spellbookSyncEnabled: true, spellbookSyncMemberUids: ['A'] }, 'A'), true);
  assert.equal(spellbookAccessEnabled({ spellbookSyncEnabled: true, spellbookSyncMemberUids: ['A'] }, 'B'), false);
  assert.equal(spellbookAccessEnabled({ spellbookSyncEnabled: true, spellbookSyncMemberUids: ['A'] }), false);
  assert.equal(spellbookAccessEnabled({ spellbookSyncEnabled: true, spellbookSyncMemberUids: [] }, 'A'), true);
  assert.equal(spellbookAccessEnabled({ spellbookSyncEnabled: true, spellbookSyncMemberUids: 'A' }, 'A'), false);
});

test('delayed and repeated subscriptions leave only the newest listener active', async () => {
  let listeners = 0;
  const connections = [];
  const session = createSpellbookSession({
    connect: async () => {
      const gate = deferred(); connections.push(gate); await gate.promise;
      listeners++; let stopped = false;
      return () => { if (!stopped) { stopped = true; listeners--; } };
    },
    write: async () => {}, onChange: () => {}
  });
  session.retry(); session.retry();
  for (const connection of connections) connection.resolve();
  await turn(); assert.equal(listeners, 1);
  session.close(); assert.equal(listeners, 0);
});

test('destroy before Firebase loads prevents late auth registration and DOM updates', async () => {
  const h = pageHarness(); const state = h.state;
  h.page.destroy(); await turn();
  assert.equal(h.listeners.size, 0);
  assert.equal(h.state, state);
  assert.equal(h.stopped, 0);
});
