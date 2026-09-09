import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../creation-guide.js', import.meta.url), 'utf8');
const stored = {fighter:{skills:['Athletics'],equipment:{0:'1'},weapons:{'0-0':'21'},details:{0:'Lute'},applied:true,appliedVersion:2},wizard:{skills:['Arcana']}};
// Model the hidden input behavior that caused this bug: .value also changes
// the default restored by form.reset().
const field = {defaultValue:JSON.stringify(stored),get value(){return this.defaultValue;},set value(v){this.defaultValue=v;}};
const timers = [];
let resetHandler, saved;
const context = vm.createContext({
  document:{getElementById:id=>id==='creationChoices'?field:{addEventListener:(type,handler)=>{if(type==='reset')resetHandler=handler;}}},
  window:{setTimeout:fn=>timers.push(fn)},
  renderCreationGuide(){},renderBackstoryPreview(){},renderRacialSpells(){},
  save(){saved=field.value;},
});
vm.runInContext(source.slice(source.indexOf('const readCreationChoices ='),source.indexOf('const primaryCreationClass =')),context);
vm.runInContext(source.split('\n').find(line=>line.startsWith('const startingEquipmentChoice =')),context);
vm.runInContext(source.slice(source.lastIndexOf("document.getElementById('characterSheet').addEventListener('reset'"),source.lastIndexOf('renderDragonAncestry();')),context);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(readCreationChoices())',context)),stored,'Loading an existing character preserves choices');
resetHandler();
assert.equal(field.value,'{}','Clear choices synchronously before the sheet reset saves');
context.save();
assert.equal(saved,'{}');
field.value=field.defaultValue; // Native reset must not revive the previous class's choices.
timers.splice(0).forEach(fn=>fn());
assert.equal(saved,'{}','New character remains empty after queued render/save');
assert.equal(vm.runInContext('readCreationChoices().fighter',context),undefined);
assert.equal(vm.runInContext('readCreationChoices().wizard',context),undefined);
assert.equal(vm.runInContext("startingEquipmentChoice({},0,{options:[{}]})",context),'','Even one-option groups start unselected');
assert.equal(vm.runInContext("startingEquipmentChoice({},0,{options:[{},{}]})",context),'');
assert.equal(vm.runInContext("startingEquipmentChoice({equipment:{0:'1'}},0,{options:[{},{}]})",context),'1','Explicit existing selections retained');
assert.equal(vm.runInContext("startingEquipmentChoice({applied:true},0,{options:[{}]})",context),'0','Old applied fixed equipment remains repairable');
field.value=JSON.stringify(stored);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(readCreationChoices())',context)),stored,'Importing existing choices still works');
console.log('Passed new-character reset, empty choices, all-class clearing and existing-character preservation.');
