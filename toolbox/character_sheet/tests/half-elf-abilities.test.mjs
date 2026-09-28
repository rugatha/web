import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const functionLines = [
  'const applyFixedAbilityBonuses =',
  'const syncHalfElfAbilityChoices =',
  'const abilityBonusMap =',
].map((prefix) => source.split('\n').find((line) => line.trimStart().startsWith(prefix)));

assert.ok(functionLines.every(Boolean), 'Half-elf ability helpers should be present');
for (const id of ['halfElfAbility1', 'halfElfAbility2']) {
  const options = source.match(new RegExp(`<select class="half-elf-ability-choice" id="${id}">([\\s\\S]*?)<\\/select>`))?.[1] || '';
  assert.doesNotMatch(options, /value="cha"/, 'Charisma cannot be selected for either additional half-elf bonus');
}

const abilityData = [
  { id: 'str' },
  { id: 'dex' },
  { id: 'con' },
  { id: 'int' },
  { id: 'wis' },
  { id: 'cha' },
];
const races = [
  { id: 'half-elf', note: { basic_zh: '魅力+2\n選二能力各+1', basic_en: 'CHA+2\nChoose 2 Abilities Each +1' } },
  { id: 'dragonborn', note: { basic_zh: '力量+2\n魅力+1', basic_en: 'STR+2\nCHA+1' } },
  { id: 'human', note: { basic_zh: '所有能力+1', basic_en: 'All Abilities +1' } },
];
const elements = {
  race: { value: 'half-elf' },
  halfElfAbilityChoices: { hidden: true },
  halfElfAbility1: { value: 'dex', disabled: false, options: ['', 'str', 'dex', 'con', 'int', 'wis'].map((value) => ({ value, disabled: false })) },
  halfElfAbility2: { value: 'con', disabled: false, options: ['', 'str', 'dex', 'con', 'int', 'wis'].map((value) => ({ value, disabled: false })) },
};
const context = vm.createContext({
  abilityData,
  abilityCatalog: [],
  selectedAbilityIndexes: [],
  characterReadOnly: false,
  window: { sheetOptions: { races } },
  document: { getElementById: (id) => elements[id] },
});
vm.runInContext(`${functionLines.join('\n')}\nglobalThis.testAbilityBonusMap = abilityBonusMap; globalThis.testSyncHalfElfAbilityChoices = syncHalfElfAbilityChoices;`, context);

const bonuses = () => JSON.parse(JSON.stringify(context.testAbilityBonusMap()));
assert.deepEqual(bonuses(), { str: 0, dex: 1, con: 1, int: 0, wis: 0, cha: 2 });

context.testSyncHalfElfAbilityChoices();
assert.equal(elements.halfElfAbilityChoices.hidden, false);
assert.equal(elements.halfElfAbility1.options.find((option) => option.value === 'con').disabled, true);
assert.equal(elements.halfElfAbility2.options.find((option) => option.value === 'dex').disabled, true);

elements.halfElfAbility2.value = 'dex';
context.testSyncHalfElfAbilityChoices('halfElfAbility2');
assert.equal(elements.halfElfAbility1.value, '', 'The latest selection wins when the two choices collide');
assert.equal(elements.halfElfAbility2.value, 'dex');
assert.deepEqual(bonuses(), { str: 0, dex: 1, con: 0, int: 0, wis: 0, cha: 2 });

elements.race.value = 'dragonborn';
context.testSyncHalfElfAbilityChoices();
assert.equal(elements.halfElfAbilityChoices.hidden, true);
assert.deepEqual(bonuses(), { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 1 }, 'Bilingual race notes must not double fixed bonuses');

elements.race.value = 'human';
assert.deepEqual(bonuses(), { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 });

console.log('Passed half-elf fixed and selectable ability bonuses.');
