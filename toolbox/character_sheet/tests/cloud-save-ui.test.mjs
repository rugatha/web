import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sheetHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const memberHtml = readFileSync(new URL('../../../member/index.html', import.meta.url), 'utf8');

assert.doesNotMatch(sheetHtml, /id="saveCharacterButton"/);
assert.doesNotMatch(sheetHtml, /id="saveDraftButton"/);
assert.match(sheetHtml, /id="saveCloudButton"[^>]+data-i18n="saveAction"/);
assert.match(sheetHtml, /document\.getElementById\('saveCloudButton'\)\.addEventListener\('click',[\s\S]+queueCloudSave\(\{ assignDefaultName: true \}\)/);

const nameInput = { value: '' };
let writes = 0;
let defaultNames = 0;
const context = vm.createContext({
  characterStore: {
    normalizeName: value => value.trim(),
    defaultName: () => { defaultNames++; return '未命名角色 2026/09/28 12:00:00'; },
    keyForName: name => name,
    save: async () => { writes++; return { key: nameInput.value, portrait: null }; },
  },
  characterUser: { uid: 'test' }, characterReadOnly: false, isRestoringCharacter: false,
  currentCharacterKey: '', currentLanguage: 'zh', characterItems: [], existingPortrait: null,
  portraitDirty: false, portraitSrc: '', portraitSource: null,
  document: { getElementById: () => nameInput }, collectSheetData: () => ({}),
  setCharacterManagerStatus() {}, updateCharacterUrl() {}, refreshCharacterList: async () => {},
  t: () => ({}), console,
});
vm.runInContext(sheetHtml.slice(sheetHtml.indexOf('const saveToCloud ='), sheetHtml.indexOf('const queueCloudSave =')), context);
const save = options => vm.runInContext(`saveToCloud(${JSON.stringify(options)})`, context);
await save({ silent: true });
assert.equal(writes, 0, 'Opening a blank sheet must not create a database record');
assert.equal(defaultNames, 0);
assert.equal(nameInput.value, '');
nameInput.value = 'Named draft';
await save({ silent: true });
assert.equal(writes, 0, 'New drafts await an explicit save even after entering a name');
nameInput.value = '  ';
await save({});
assert.equal(writes, 0, 'Import or other saves cannot generate a default name');
await save({ assignDefaultName: true });
assert.equal(writes, 1);
assert.equal(defaultNames, 1);
assert.equal(nameInput.value, '未命名角色 2026/09/28 12:00:00');
await save({ silent: true });
assert.equal(writes, 2, 'Existing characters still autosave');
assert.equal(defaultNames, 1);
nameInput.value = '';
await save({ silent: true });
assert.equal(writes, 2, 'Clearing a saved name does not silently rename the character');
nameInput.value = 'My hero';
await save({ assignDefaultName: true });
assert.equal(writes, 3);
assert.equal(defaultNames, 1, 'Explicit names are preserved');

assert.match(memberHtml, /className = "member-character-delete"/);
assert.match(memberHtml, /window\.confirm\([\s\S]+deleteCharacterSheet\(\{/);
assert.match(memberHtml, /targetMemberId === authState\.user\.uid/);

console.log('Passed cloud-save consolidation and member character deletion UI assertions.');
