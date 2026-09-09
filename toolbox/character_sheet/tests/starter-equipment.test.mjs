import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const guide = read('../creation-guide.js');
const context = vm.createContext({ window: {}, currentLanguage: 'en' });
const line = name => html.split('\n').find(line => line.trim().startsWith(`const ${name} =`));
vm.runInContext(['parseWeaponOptions', 'parseArmorOptions', 'parsePageConstant', 'parseEquipmentOptions'].map(line).join('\n'), context);
context.weaponHTML = read('../../weapons/index.html');
context.armorHTML = read('../../armor/index.html');
context.toolsHTML = read('../../tools/index.html');
context.packsHTML = read('../../packs/index.html');
vm.runInContext(`window.sheetOptions = { weapons: parseWeaponOptions(weaponHTML), armors: parseArmorOptions(armorHTML).filter(a => a.category !== '盾牌'), equipment: parseEquipmentOptions(toolsHTML, packsHTML) }; const primaryCreationClass = () => currentClass;`, context);
vm.runInContext(guide.slice(guide.indexOf('const startingEquipmentGroups ='), guide.indexOf('const renderCreationGuide =')), context);
vm.runInContext(guide.slice(guide.indexOf('const starterNormalize ='), guide.indexOf('let starterApplying =')), context);
const classes = JSON.parse(read('../../race_class/class_details.json'));
let cases = 0;
for (const cls of classes) {
  context.currentClass = cls;
  const groups = vm.runInContext('startingEquipmentGroups()', context);
  assert.ok(groups.length, `${cls.id}: starting choices exist`);
  for (let group = 0; group < groups.length; group++) {
    for (let option = 0; option < groups[group].options.length; option++) {
      context.groupIndex = group; context.optionIndex = option;
      vm.runInContext(`state = { equipment: {}, weapons: {}, details: {} }; startingEquipmentGroups().forEach((g, i) => {
        state.equipment[i] = i === groupIndex ? String(optionIndex) : '0';
        const option = g.options[state.equipment[i]];
        const generic = starterGeneric(option.en);
        if (generic) for (let slot = 0; slot < (generic[1].toLowerCase() === 'two' ? 2 : 1); slot++) state.weapons[i+'-'+slot] = equipmentWeaponChoices(generic[0])[0]?.id;
        state.details[i] = 'Test focus / instrument';
      }); result = resolveStarterEquipment(currentClass, state);`, context);
      assert.ok(context.result.items.length, `${cls.id}: option ${group}/${option} resolves`);
      assert.ok(context.result.items.every(item => item.quantity > 0 && item.nameZh && item.nameEn));
      cases++;
    }
  }
}
context.currentClass = classes.find(c => c.id === 'fighter');
vm.runInContext(`state = {equipment: {0:'0',1:'0',2:'0',3:'0'},weapons:{'1-0':'21'}}; result = resolveStarterEquipment(currentClass,state)`, context);
assert.ok(context.result.armorIds.has('9'), 'Chain mail resolves');
assert.ok(context.result.shield, 'Shield resolves');
assert.ok(context.result.weaponIds.has('21') && context.result.weaponIds.has('10'), 'Longsword and crossbow resolve');
assert.equal(context.result.items.find(i => i.key === 'bolts').quantity, 20);
assert.ok(context.result.items.some(i => i.key.startsWith('pack-item:')), 'Pack expands');
assert.equal(context.result.items.find(i => /rope/i.test(i.nameEn)).quantity, 1, '50 feet is a length, not 50 ropes');
assert.match(context.result.items.find(i => /rope/i.test(i.nameEn)).nameEn, /50/, 'Rope length retained');
assert.ok(!context.result.items.some(i => i.nameEn.toLowerCase().includes("dungeoneer's pack")), 'No opaque pack-only entry');
context.currentClass = classes.find(c => c.id === 'ranger');
vm.runInContext(`state = {equipment:{0:'0',1:'0',2:'0',3:'0'}}; result=resolveStarterEquipment(currentClass,state)`, context);
assert.equal(context.result.items.find(i => i.nameEn === 'Shortsword').quantity, 2);
assert.equal(context.result.items.find(i => i.key === 'arrows').quantity, 20);
assert.equal(context.result.items.find(i => i.key === 'quiver').quantity, 1);
context.currentClass = classes.find(c => c.id === 'fighter');
assert.throws(() => vm.runInContext(`resolveStarterEquipment(currentClass,{equipment:{0:'0',1:'0',2:'0',3:'0'},weapons:{'1-0':'1'}})`, context), 'Simple dagger rejected for martial choice');
assert.throws(() => vm.runInContext(`resolveStarterEquipment(currentClass,{})`, context), 'Incomplete choices rejected');
console.log(`Passed ${cases} class/equipment option cases and focused inventory assertions.`);

// Exercise the actual apply transaction with an existing custom attack and
// inventory. Rendering is stubbed so this test needs no browser dependency.
vm.runInContext(guide.slice(guide.indexOf('let starterApplying ='), guide.indexOf('// Render escaped Markdown')), context);
vm.runInContext(`
  choices = {fighter: {equipment: {0:'0',1:'0',2:'0',3:'0'},weapons:{'1-0':'21'}}};
  const readCreationChoices = () => choices;
  const writeCreationChoices = data => { choices = data; };
  const loadEquipmentOptions = async () => {};
  statusNode = {textContent:''};
  document = {getElementById: () => statusNode};
  const guideText = (zh, en) => en;
  equipmentItems = [{id:'custom:keepsake', nameZh:'紀念物',nameEn:'Keepsake',quantity:1}];
  armorRows = [{choice:'',worn:false,custom:'',customAC:'10'}];
  shieldRows = [{choice:'none',worn:false,custom:'',customAC:'0'}];
  attackCustomRows = {1:true}; attackRowCount = 1;
  attackFields = {attackWeapon1:'',attackWeaponCustom1:'Custom attack QA',attackDamage1:'2d6'};
  const captureAttackValues = () => ({...attackFields});
  const restoreAttackValues = data => { attackFields = {...data}; };
  const renderAttackRows = () => { attackFields = {}; };
  const syncLoadoutState = () => {};
  const updateAllAttacks = () => {};
  const renderArmorLoadout = () => {};
  const updateArmorClass = () => {};
  const renderEquipmentItems = () => {};
  const renderCreationGuide = () => {};
  const save = () => true;
`, context);
await vm.runInContext('applyStarterEquipment()', context);
assert.equal(context.attackFields.attackWeaponCustom1, 'Custom attack QA');
assert.equal(context.attackFields.attackDamage1, '2d6');
assert.equal(context.attackRowCount, 3, 'Custom attack plus both starter attacks');
assert.equal(context.attackFields.attackWeapon2, '21');
assert.equal(context.attackFields.attackWeapon3, '10');
assert.equal(context.armorRows.length, 1, 'Reuse the empty armor slot');
assert.equal(context.armorRows[0].choice, '9');
assert.equal(context.armorRows[0].worn, true);
assert.equal(context.shieldRows.length, 1, 'Reuse the empty shield slot');
assert.equal(context.shieldRows[0].choice, 'shield');
assert.ok(context.equipmentItems.some(item => item.id === 'custom:keepsake'));
const appliedInventory = JSON.stringify(context.equipmentItems);
await vm.runInContext('applyStarterEquipment()', context);
assert.equal(JSON.stringify(context.equipmentItems), appliedInventory, 'Repeat repair never duplicates quantities');
assert.equal(context.attackRowCount, 3, 'Repeat repair never duplicates attacks');
vm.runInContext(`equipmentItems.push({id:'starter:fighter:0',nameZh:'舊組合',nameEn:'Old bundle',quantity:1}); delete attackFields.attackWeapon3;`, context);
await vm.runInContext('applyStarterEquipment()', context);
assert.ok(!context.equipmentItems.some(item => item.id === 'starter:fighter:0'), 'Legacy bundle migrated');
assert.equal(context.attackFields.attackWeapon3, '10', 'Missing starter attack repaired');
vm.runInContext(`choices = {fighter:{equipment:{0:'0'}}};`, context);
const beforeInvalid = JSON.stringify([context.equipmentItems, context.armorRows, context.attackFields]);
await vm.runInContext('applyStarterEquipment()', context);
assert.equal(JSON.stringify([context.equipmentItems, context.armorRows, context.attackFields]), beforeInvalid, 'Invalid selection leaves the sheet untouched');
console.log('Passed starter application, custom-attack preservation, repair, migration and invalid-input tests.');
