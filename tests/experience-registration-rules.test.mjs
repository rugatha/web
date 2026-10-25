import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
import { commitRegistration } from '../experience/register/registration-store.js';
const { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp, Timestamp, writeBatch } = sdk;
let env;
let db;
const id = 'a'.repeat(20);
const event = { registrationOpen: true, deadline: Timestamp.fromDate(new Date('2099-01-01')), maxPlayers: 5, registeredPlayers: 2 };
const answers = () => ({ schemaVersion: 1, eventId: 'test', name: '冒險者', contact: 'LINE: test', partySize: 2, systems: ['龍與地下城 D&D', '其他'], systemsOther: '測試系統', dndExperience: '有玩過，但經驗較少', rugathaExperience: '無', sources: ['Instagram', 'Threads'], sourcesOther: '', boundaries: '避免過度暴力', notes: '同行一人' });
before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-rugatha-registration', firestore: { rules: readFileSync('config/firebase/firestore.rules', 'utf8') } });
  db = env.unauthenticatedContext().firestore();
});
after(async () => env?.cleanup());
beforeEach(async () => { await env.clearFirestore(); await seed(event); });
async function seed(data) { await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'experienceEvents/test'), data)); }
// Bypass application validation to probe the actual server-side rules.
function rawSubmission(data, { registrationId = id, count = event.registeredPlayers + data.partySize, eventId = 'test' } = {}) {
  const batch = writeBatch(db);
  batch.set(doc(db,'experienceRegistrations',registrationId), { ...data, createdAt: data.createdAt ?? serverTimestamp() });
  batch.update(doc(db,'experienceEvents',eventId), { registeredPlayers:count, lastRegistrationId:registrationId, updatedAt:serverTimestamp() });
  return batch.commit();
}
test('guest saves all answers and atomically counts party size; only admins read personal data', async () => {
  await assertSucceeds(commitRegistration(db,id,answers(),sdk));
  assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,4);
  await assertFails(getDoc(doc(db,'experienceRegistrations',id)));
  await assertFails(getDocs(collection(db,'experienceRegistrations')));
  const admin=env.authenticatedContext('admin',{admin:true}).firestore();
  const saved=await assertSucceeds(getDoc(doc(admin,'experienceRegistrations',id)));
  assert.deepEqual(saved.data().sources,['Instagram','Threads']);
  assert.equal(saved.data().partySize,2);
  assert.ok(saved.data().createdAt instanceof Timestamp);
  await assertSucceeds(getDocs(collection(admin,'experienceRegistrations')));
  const member=env.authenticatedContext('member').firestore();
  await assertFails(getDoc(doc(member,'experienceRegistrations',id)));
  await assertFails(updateDoc(doc(db,'experienceRegistrations',id),{name:'changed'}));
  await assertFails(deleteDoc(doc(db,'experienceRegistrations',id)));
});
test('server rejects expired, closed and full events',async()=>{
 for(const change of [{deadline:Timestamp.fromDate(new Date('2000-01-01'))},{registrationOpen:false},{registeredPlayers:5}]){
  await seed({...event,...change});
  await assertFails(rawSubmission(answers()));
 }
});
test('server rejects malformed answers and oversize parties',async()=>{
 for(const change of [
  {partySize:4},{partySize:1.5},{partySize:0},{name:'   '},{contact:''},
  {systems:['無經驗','龍與地下城 D&D'],systemsOther:''},{systems:['not-an-option']},
  {systemsOther:''},{sources:[]},{sources:['Instagram','Instagram']},
  {dndExperience:['有當過 DM']},{rugathaExperience:'maybe'},{notes:'x'.repeat(2001)},
  {createdAt:Timestamp.fromDate(new Date('2000-01-01'))},{extra:'unapproved'},{eventId:'missing'}
 ]) await assertFails(rawSubmission({...answers(),...change}));
});
test('cannot create without counting, alter the count alone, undercount, or replay a submission',async()=>{
 await assertFails(setDoc(doc(db,'experienceRegistrations',id),{...answers(),createdAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(db,'experienceEvents/test'),{registeredPlayers:0}));
 await assertFails(rawSubmission(answers(),{count:3}));
 await assertFails(rawSubmission(answers(),{count:1}));
 await assertSucceeds(commitRegistration(db,id,answers(),sdk));
 await assertFails(rawSubmission({...answers(),partySize:1},{count:5}));
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,4);
});
test('concurrent parties cannot overbook remaining seats',async()=>{
 const results=await Promise.allSettled([
  commitRegistration(db,'b'.repeat(20),answers(),sdk),
  commitRegistration(db,'c'.repeat(20),answers(),sdk),
 ]);
 assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,4);
 await assertSucceeds(commitRegistration(db,'d'.repeat(20),{...answers(),partySize:1},sdk));
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,5);
 await assert.rejects(commitRegistration(db,'e'.repeat(20),{...answers(),partySize:1},sdk),{code:'registration-full'});
});
test('public reads counts but cannot change settings or attach a registration from a different event',async()=>{
 await assertSucceeds(getDoc(doc(db,'experienceEvents/test')));
 await assertFails(updateDoc(doc(db,'experienceEvents/test'),{registrationOpen:true}));
 await assertFails(updateDoc(doc(db,'experienceEvents/test'),{maxPlayers:100}));
 await seed({...event,registrationOpen:false});
 await assertFails(rawSubmission(answers()));
});

test('admin cancellation releases the entire party once, preserves answers and permits new guests', async () => {
 const { cancelRegistration } = await import('../experience/register/registration-store.js');
 await commitRegistration(db,id,answers(),sdk);
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 await assertFails(cancelRegistration(db,id,sdk));
 await assertFails(cancelRegistration(env.authenticatedContext('member').firestore(),id,sdk));
 await assertFails(updateDoc(doc(admin,'experienceRegistrations',id),{status:'cancelled',cancelledAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(admin,'experienceRegistrations',id),{contact:'changed'}));
 const results=await Promise.all([cancelRegistration(admin,id,sdk),cancelRegistration(admin,id,sdk)]);
 assert.deepEqual(results.sort(),[false,true]);
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,2);
 const saved=(await getDoc(doc(admin,'experienceRegistrations',id))).data();
 assert.equal(saved.status,'cancelled');assert.equal(saved.contact,answers().contact);
 assert.ok(saved.cancelledAt instanceof Timestamp);
 await assertFails(deleteDoc(doc(admin,'experienceRegistrations',id)));
 await assertFails(updateDoc(doc(admin,'experienceRegistrations',id),{status:'active'}));
 await assertSucceeds(commitRegistration(db,'n'.repeat(20),{...answers(),partySize:3},sdk));
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,5);
});

test('admin edits custom status and DM_Note, cancels and restores seats atomically',async()=>{
 const {updateRegistrationAdmin}=await import('../experience/register/registration-store.js');
 await commitRegistration(db,id,answers(),sdk);
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 const edit=(status,DM_Note='主持人備註')=>updateRegistrationAdmin(admin,id,{status,DM_Note},sdk);
 await assertFails(updateRegistrationAdmin(db,id,{status:'完成跑團',DM_Note:'private'},sdk));
 await assertFails(updateRegistrationAdmin(env.authenticatedContext('member').firestore(),id,{status:'完成跑團',DM_Note:'private'},sdk));
 await assertSucceeds(edit('完成跑團'));
 assert.equal((await getDoc(doc(admin,'experienceRegistrations',id))).data().DM_Note,'主持人備註');
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,4);
 await assertSucceeds(edit('沒來','新的備註'));
 await assertSucceeds(edit('cancelled'));
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,2);
 await assertSucceeds(edit('cancelled','更新取消備註'));
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,2);
 await assertSucceeds(edit('完成跑團'));
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,4);
 await assertFails(updateDoc(doc(admin,'experienceRegistrations',id),{status:'cancelled',DM_Note:'',cancelledAt:serverTimestamp(),updatedAt:serverTimestamp()}));
 await assertFails(updateDoc(doc(admin,'experienceRegistrations',id),{contact:'changed',status:'custom',DM_Note:'',updatedAt:serverTimestamp()}));
 await assertSucceeds(edit('cancelled'));
 await commitRegistration(db,'z'.repeat(20),{...answers(),partySize:3},sdk);
 await assert.rejects(edit('active'),/名額不足/);
 assert.equal((await getDoc(doc(db,'experienceEvents/test'))).data().registeredPlayers,5);
});
