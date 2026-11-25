import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const line = name => html.split('\n').find(line => line.includes(`const ${name} =`));
const weaponsPage = readFileSync(new URL('../../weapons/index.html', import.meta.url), 'utf8');

test('real weapon catalog selects the higher finesse score and uses DEX only for ranged weapons', () => {
  let scores = { str: 13, dex: 7 };
  const context = vm.createContext({ getAbilityScore: id => scores[id] });
  vm.runInContext(`${line('parseWeaponOptions')}\n${line('getWeaponAbility')}`, context);
  context.page = weaponsPage;
  const weapons = vm.runInContext('parseWeaponOptions(page)', context);
  assert.equal(weapons.length, 37);
  context.weapon = weapons.find(item => item.nameEn === 'Dagger');
  assert.equal(vm.runInContext('getWeaponAbility(weapon)', context), 'str');
  scores = { str: 12, dex: 13 }; // Equal modifiers, but DEX is the higher score.
  assert.equal(vm.runInContext('getWeaponAbility(weapon)', context), 'dex');
  context.weapon = weapons.find(item => item.nameEn === 'Quarterstaff');
  assert.equal(vm.runInContext('getWeaponAbility(weapon)', context), 'str');
  context.weapon = weapons.find(item => item.nameEn === 'Shortbow');
  scores = { str: 18, dex: 7 };
  assert.equal(vm.runInContext('getWeaponAbility(weapon)', context), 'dex');
});

test('attacks add proficiency only when trained and use the chosen modifier for damage', () => {
  const fields = { attackWeapon1: { value: 'dagger' }, attackProficiency1: { classList: { toggle() {} } } };
  const results = {};
  const context = vm.createContext({
    window: { sheetOptions: { weapons: [{ id: 'dagger', damage: '1d4', damageType: '穿刺', properties: ['靈巧'] }] } },
    document: { getElementById: id => fields[id] }, attackCustomRows: {},
    getWeaponAbility: () => 'dex', getAbilityScore: () => 7,
    modifier: score => Math.floor((score - 10) / 2), isWeaponProficient: () => true,
    t: () => ({ yes: 'yes', no: 'no' }), fieldValue: () => '+3', currentLanguage: 'zh',
    setCalculatedValue: (id, value) => results[id] = value,
  });
  vm.runInContext(`${line('formatRollBonus')}\n${line('updateAttackFromWeapon')}\nupdateAttackFromWeapon(1)`, context);
  assert.equal(results.attackBonus1, '1d20 + 1');
  assert.equal(results.attackDamage1, '1d4 - 2');
  context.isWeaponProficient = () => false;
  vm.runInContext('updateAttackFromWeapon(1)', context);
  assert.equal(results.attackBonus1, '1d20 - 2');
  assert.equal(results.attackDamage1, '1d4 - 2');
});

test('zoomed portrait positions move through the actual vertical crop area', () => {
  const image = { naturalWidth: 1200, naturalHeight: 1600, style: {} };
  const elements = { portraitImage: image, portraitFlipButton: { setAttribute() {} } };
  const context = vm.createContext({ document: { getElementById: id => elements[id] ||= {} }, portraitPosition: { x: 0, y: 0 }, portraitZoom: 2, portraitFlip: false, portraitSrc: 'test' });
  vm.runInContext(line('applyPortraitPosition'), context);
  vm.runInContext('applyPortraitPosition()', context);
  assert.equal(image.style.top, '0%');
  assert.equal(image.style.height, '200%');
  context.portraitPosition.y = 100;
  vm.runInContext('applyPortraitPosition()', context);
  assert.equal(image.style.top, '-100%');
  context.portraitFlip = true;
  vm.runInContext('applyPortraitPosition()', context);
  assert.equal(image.style.transform, 'scaleX(-1)');
  assert.equal(image.style.top, '-100%');
});
