import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { catalog } from '../../../tests/helpers/spell-catalog.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const between = (start, end) => html.slice(html.indexOf(start), html.indexOf(end));

const parserSource = between('const parseCharacterSheetConfig =', 'const readConfigFile =');
const parserContext = vm.createContext({ configFormat: 'rugatha-character-sheet', configVersion: 1 });
vm.runInContext(parserSource, parserContext);
const parse = text => JSON.parse(vm.runInContext(`JSON.stringify(parseCharacterSheetConfig(${JSON.stringify(text)}))`, parserContext));

const exported = { format: 'rugatha-character-sheet', version: 1, exportedAt: '2026-09-24T00:00:00.000Z', data: { characterName: '', class1: 'fighter', background: 'noble', 'skill-3': true } };
assert.deepEqual(parse(JSON.stringify(exported)), exported.data, 'Current exported files restore even when the optional character name is blank');
assert.deepEqual(parse(`\uFEFF${JSON.stringify(exported)}`), exported.data, 'UTF-8 BOM files from another device are accepted');
assert.deepEqual(parse(JSON.stringify({ class1: 'wizard', level1: '3' })), { class1: 'wizard', level1: '3' }, 'Legacy raw sheet data is accepted');
assert.throws(() => parse(JSON.stringify({ ...exported, version: 2 })), /Unsupported/);
assert.throws(() => parse(JSON.stringify({ format: 'another-app', version: 1, data: { class1: 'fighter' } })), /Invalid/);
assert.throws(() => parse('{}'), /Invalid/);

const loadOptionsSource = between('const loadOptions =', 'const loadSubclassOptions =');
let resourceRequests = 0;
const requestedPaths = [];
const optionsContext = vm.createContext({
  window: { RUGATHA_SPELL_CATALOG: catalog },
  fetchJSON: (path, fallback) => { resourceRequests += 1; requestedPaths.push(path); return Promise.resolve(fallback); },
  fetchTEXT: (_path, fallback = '') => { resourceRequests += 1; return Promise.resolve(fallback); },
  normalizeClass: item => item,
  normalizeRace: item => item,
  normalizeBackground: item => item,
  parseWeaponOptions: () => [],
  parseArmorOptions: () => [],
  renderOptions() {}, renderArmorOptions() {}, renderShieldACOptions() {}, renderArmorLoadout() {}, renderFeatPicker() {}, syncShieldEditor() {}, updateArmorClass() {}, updateHitDice() {}, updateSpellSummary() {}, renderCharacterAbilities() {},
  console
});
const shared = vm.runInContext(`let optionsPromise = null; ${loadOptionsSource}; const first = loadOptions(); const second = loadOptions(); first === second`, optionsContext);
assert.equal(shared, true, 'Concurrent startup and import share one catalog-loading promise');
assert.equal(resourceRequests, 7, 'Catalog resources are requested only once during concurrent loading');
assert.ok(requestedPaths.includes(catalog.classesUrl), 'Class spell progression is fetched from Firebase Storage');

console.log('Passed character-sheet config parsing, compatibility, and concurrent-load assertions.');
