import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const loader = source.split('\n').find(line => line.includes('const loadSpellOptions ='));
const spellbook = JSON.parse(readFileSync(new URL('../../spells/spells-phb.json', import.meta.url), 'utf8'));

for (const first of ['spells', 'options']) {
  test(`Spell choices survive when ${first} finish first`, async () => {
    let resolveOptions, resolveSpells;
    const options = new Promise(resolve => { resolveOptions = resolve; });
    const spells = new Promise(resolve => { resolveSpells = resolve; });
    let renders = 0;
    const window = {};
    const context = vm.createContext({
      window,
      loadOptions: () => options,
      fetchJSON: () => spells,
      cleanSpellText: text => text,
      captureSpellValues: () => ({ spellLevel1: '1', spellName1: '0' }),
      renderSpellRows: () => { renders++; },
      restoreSpellValues: () => {},
      restoreSpellSelections: () => {},
      readSavedSheet: () => ({}),
      updateSpellSummary: () => {},
      renderRacialSpells: () => {},
    });
    vm.runInContext(`let spellOptionsPromise = null; ${loader}`, context);
    const pending = vm.runInContext('loadSpellOptions()', context);
    assert.equal(vm.runInContext('loadSpellOptions()', context), pending);
    const finishOptions = () => {
      window.sheetOptions = { spells: [] };
      resolveOptions(window.sheetOptions);
    };
    if (first === 'spells') resolveSpells(spellbook);
    else finishOptions();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(renders, 0, 'Wait for both catalogs before rendering');
    if (first === 'spells') finishOptions();
    else resolveSpells(spellbook);
    await pending;
    assert.equal(window.sheetOptions.spells.length, spellbook.spell.length);
    assert.ok(window.sheetOptions.spells.some(spell => spell.level === 1 && spell.classes.includes('法師')));
    assert.equal(renders, 1);
  });
}
