import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const loadCharacterByKey =');
const end = html.indexOf('const startNewCharacter =', start);
const loadSource = html.slice(start, end);

let resolvePortrait;
const selector = { value: '' };
const record = {
  key: 'Ian%20Test',
  characterName: 'Ian Test',
  data: { characterName: 'Ian Test', class1: 'wizard' },
  portrait: { path: 'character-portraits/member/ian/portrait.png' },
  loadPortrait: () => new Promise((resolve) => { resolvePortrait = resolve; })
};
const calls = { restored: null, portrait: null, statuses: [] };
const context = vm.createContext({
  mockStore: { load: async () => record },
  document: { getElementById: () => selector },
  window: { clearTimeout() {} },
  URL: { revokeObjectURL() {} },
  console,
  setCharacterManagerStatus: (message) => calls.statuses.push(message),
  resetSheetForCloudLoad() {},
  restore: (data) => { calls.restored = data; },
  updateCharacterUrl() {},
  renderFullSheet() {},
  updateGate() {},
  setPortrait: (url, options) => { calls.portrait = { url, options }; },
  t: () => ({ characterLoaded: 'Loaded {name}', cloudSaveFailed: 'Failed' })
});

vm.runInContext(`
  let saveTimer = null;
  let currentLanguage = 'en';
  let isRestoringCharacter = false;
  let characterStore = mockStore;
  let characterUser = { uid: 'admin' };
  let characterMemberId = 'member';
  let currentCharacterKey = '';
  let existingPortrait = null;
  let portraitDirty = false;
  let portraitSource = null;
  ${loadSource}
`, context);

const loaded = await Promise.race([
  vm.runInContext("loadCharacterByKey('Ian%20Test')", context),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Text loading waited for the portrait')), 100))
]);

assert.equal(loaded, true);
assert.equal(calls.restored.characterName, 'Ian Test');
assert.equal(calls.restored.class1, 'wizard');
assert.equal(calls.restored.portraitSrc, '');
assert.equal(calls.statuses.at(-1), 'Loaded Ian Test');
assert.equal(calls.portrait, null, 'Portrait loading remains independent from text restoration');

resolvePortrait('blob:portrait');
await new Promise((resolve) => setImmediate(resolve));
assert.equal(calls.portrait.url, 'blob:portrait');
assert.equal(calls.portrait.options.dirty, false);

console.log('Passed non-blocking cloud character text and portrait loading assertions.');
