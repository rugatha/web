import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync('shared/character-sheets.js', 'utf8')
  .replace(/import[\s\S]*?from "[^"]+";/g, '').replace(/export /g, '');
function fixture() {
  const records = new Map(), deleted = [];
  let sequence = 0;
  const context = vm.createContext({
    console, TextEncoder, Blob, URL, btoa, Date,
    getFirestore: () => ({}), getStorage: () => ({}), resolveMemberKey: async () => '0000-0001',
    collection: (_, ...parts) => parts.join('/'),
    doc: (parent, ...parts) => {
      const path = typeof parent === 'string' ? `${parent}/${++sequence}`
        : parent.path ? `${parent.path}/${parts.join('/')}` : parts.join('/');
      return { path, id: path.split('/').at(-1) };
    },
    serverTimestamp: () => 'server-time',
    getDoc: async ref => ({ exists: () => records.has(ref.path), data: () => records.get(ref.path) }),
    runTransaction: async (_, callback) => callback({
      get: async ref => ({ exists: () => records.has(ref.path), data: () => records.get(ref.path) }),
      set: (ref, value) => records.set(ref.path, value)
    }),
    writeBatch: () => ({ delete: ref => deleted.push(ref.path), commit: async () => {
      deleted.forEach(path => records.delete(path));
    } })
  });
  vm.runInContext(source, context);
  return { records, deleted, context,
    save: options => { context.options = { app: {}, user: { uid: 'owner' }, ...options };
      return vm.runInContext('saveCharacterSheet(options)', context); },
    remove: key => { context.options = { app: {}, user: { uid: 'owner' }, characterKey: key };
      return vm.runInContext('deleteCharacterSheet(options)', context); }
  };
}
test('new characters with the same name receive independent IDs; rename keeps the old opaque ID', async () => {
  const f = fixture();
  const a = await f.save({ characterName: 'Ada', sheetData: {} });
  const b = await f.save({ characterName: 'Ada', sheetData: {} });
  assert.notEqual(a.key, b.key);
  const path = 'members/0000-0001/characters/Old%20Name';
  f.records.set(path, { createdAt: 'original' });
  f.records.set(`${path}/spellbooks/default`, { spellIds: ['Aid'] });
  const renamed = await f.save({ currentKey: 'Old%20Name', characterName: 'New Name', sheetData: {} });
  assert.equal(renamed.key, 'Old%20Name');
  assert.equal(f.records.get(path).schemaVersion, 2);
  assert.equal(f.records.get(path).createdAt, 'original');
  assert.deepEqual(f.records.get(`${path}/spellbooks/default`).spellIds, ['Aid']);
  assert.equal(f.deleted.length, 0);
});
test('saving a remotely deleted character fails instead of recreating it', async () => {
  const f = fixture();
  await assert.rejects(f.save({ currentKey: 'deleted', characterName: 'Ada' }), /no longer exists/);
  assert.equal(f.records.size, 0);
});
test('both character and known spellbook are deleted in one batch', async () => {
  const f = fixture(), path = 'members/0000-0001/characters/old';
  f.records.set(path, {});
  assert.equal(await f.remove('old'), true);
  assert.deepEqual(f.deleted, [`${path}/spellbooks/default`, path]);
});
