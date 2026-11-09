import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
import { commitD3Registration, cancelD3Registration } from '../experience/cons/d3/2026/registration-store.js';
let env, db;
const slotId = '2026-12-12-12';
const id = 'a'.repeat(20);
const answers = { slotId, name:'測試', phone:'0912345678', partySize:1, miniature:true, portrait:true, total:900 };
const slot = { registeredPlayers:0, registrationOpen:true, deadline:sdk.Timestamp.fromDate(new Date('2099-01-01')) };
const ref = () => sdk.doc(db,'d3Slots',slotId);
async function seed(patch={}) { await env.withSecurityRulesDisabled(ctx=>sdk.setDoc(sdk.doc(ctx.firestore(),'d3Slots',slotId),{...slot,...patch})); }
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-d3',firestore:{rules:readFileSync('config/firebase/firestore.rules','utf8')}});db=env.unauthenticatedContext().firestore();});
after(async()=>env?.cleanup());
beforeEach(async()=>{await env.clearFirestore();await seed();});
function raw(data=answers, count=data.partySize) {
 const batch=sdk.writeBatch(db);
 batch.set(sdk.doc(db,'d3Registrations',id),{...data,createdAt:sdk.serverTimestamp()});
 batch.update(ref(),{registeredPlayers:count,lastRegistrationId:id,updatedAt:sdk.serverTimestamp()});
 return batch.commit();
}
test('public counts and private answers, server total validation',async()=>{
 await assertSucceeds(commitD3Registration(db,id,answers,sdk));
 assert.equal((await sdk.getDoc(ref())).data().registeredPlayers,1);
 await assertFails(sdk.getDoc(sdk.doc(db,'d3Registrations',id)));
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 await assertSucceeds(sdk.getDoc(sdk.doc(admin,'d3Registrations',id)));
});
test('rejects malformed, extra fields, invalid prices and uncounted writes',async()=>{
 for (const patch of [{total:1},{name:' '},{phone:'bad'},{partySize:3},{partySize:1.5},{miniature:'yes'},{extra:'bad'}]) await assertFails(raw({...answers,...patch}));
 await assertFails(sdk.setDoc(sdk.doc(db,'d3Registrations',id),{...answers,createdAt:sdk.serverTimestamp()}));
 await assertFails(sdk.updateDoc(ref(),{registeredPlayers:1}));
 await assertFails(raw(answers,2));
});
test('concurrent groups never exceed two seats; repeated ID cannot count twice',async()=>{
 const pair={...answers,partySize:2,total:1800};
 const result=await Promise.allSettled([commitD3Registration(db,id,pair,sdk),commitD3Registration(db,'b'.repeat(20),pair,sdk)]);
 assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await sdk.getDoc(ref())).data().registeredPlayers,2);
 await assert.rejects(commitD3Registration(db,id,pair,sdk));
});
test('closed, expired and full slots reject direct writes',async()=>{
 for (const patch of [{registrationOpen:false},{deadline:sdk.Timestamp.fromMillis(0)},{registeredPlayers:2}]) {
  await seed(patch);await assertFails(raw(answers,(patch.registeredPlayers??0)+1));
 }
});

test('admin manually registers and cancels a party once; guests cannot cancel',async()=>{
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 await assertSucceeds(commitD3Registration(admin,id,{...answers,partySize:2,total:1800},sdk));
 await assertFails(cancelD3Registration(db,id,sdk));
 await assertFails(sdk.updateDoc(sdk.doc(admin,'d3Registrations',id),{status:'cancelled',cancelledAt:sdk.serverTimestamp()}));
 const result=await Promise.all([cancelD3Registration(admin,id,sdk),cancelD3Registration(admin,id,sdk)]);
 assert.deepEqual(result.sort(),[false,true]);
 assert.equal((await sdk.getDoc(ref())).data().registeredPlayers,0);
 const cancelled=(await sdk.getDoc(sdk.doc(admin,'d3Registrations',id))).data();
 assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.name,answers.name);assert.equal(cancelled.total,1800);
 await assertSucceeds(commitD3Registration(admin,'c'.repeat(20),answers,sdk));
 assert.equal((await sdk.getDoc(ref())).data().registeredPlayers,1);
 await assertFails(sdk.deleteDoc(sdk.doc(admin,'d3Registrations',id)));
});

test('standard and noon prices apply on both dates with optional printing and party sizes',async()=>{
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 for(const day of ['2026-12-12','2026-12-13']) for(const hour of [12,13,14,15,16,17]) for(const miniature of [false,true]) for(const partySize of [1,2]) {
  const selectedSlot=`${day}-${hour}`;
  await env.withSecurityRulesDisabled(ctx=>sdk.setDoc(sdk.doc(ctx.firestore(),'d3Slots',selectedSlot),slot));
  const bookingId=sdk.doc(sdk.collection(admin,'d3Registrations')).id;
  const total=((hour===12?400:500)+(miniature?500:0))*partySize;
  await assertSucceeds(commitD3Registration(admin,bookingId,{...answers,slotId:selectedSlot,miniature,partySize,total},sdk));
  assert.equal((await sdk.getDoc(sdk.doc(admin,'d3Registrations',bookingId))).data().total,total);
 }
 for(const total of [800,1000,1100]) {await seed();await assertFails(raw({...answers,total}));}
 await seed();await assertFails(raw({...answers,portrait:false}));
});

test('only admins edit complete shipping fields without changing booking or seats',async()=>{
 const {updateD3Shipping}=await import('../experience/cons/d3/2026/registration-store.js');
 await commitD3Registration(db,id,answers,sdk);
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 const shipping={print3D:true,recipientName:' 收件人 ',recipientPhone:'0912-345-678',recipientEmail:'recipient@example.com',sevenElevenStore:'龍山門市'};
 await assertFails(updateD3Shipping(db,id,shipping,sdk));
 await assertSucceeds(updateD3Shipping(admin,id,shipping,sdk));
 const ref=sdk.doc(admin,'d3Registrations',id);
 const saved=(await sdk.getDoc(ref)).data();
 assert.equal(saved.recipientName,'收件人');assert.equal(saved.print3D,undefined);assert.equal(saved.total,900);
 assert.equal((await sdk.getDoc(sdk.doc(db,'d3Slots',slotId))).data().registeredPlayers,1);
 await assertFails(sdk.updateDoc(ref,{...shipping,recipientName:'收件人',total:1,shippingUpdatedAt:sdk.serverTimestamp()}));
 await assert.rejects(updateD3Shipping(admin,id,{...shipping,recipientEmail:'invalid'},sdk),/有效的收件人 email/);
 await assertFails(updateD3Shipping(admin,id,{...shipping,sevenElevenStore:'字'.repeat(121)},sdk));
 await assert.rejects(updateD3Shipping(admin,id,{recipientName:'',recipientPhone:'',recipientEmail:'',sevenElevenStore:''},sdk));
 for(const field of ['recipientName','recipientPhone','recipientEmail','sevenElevenStore']) {
  await assert.rejects(updateD3Shipping(admin,id,{...shipping,[field]:''},sdk));
  await assertFails(sdk.updateDoc(ref,{[field]:'',shippingUpdatedAt:sdk.serverTimestamp()}));
 }
 await assert.rejects(updateD3Shipping(admin,id,{...shipping,recipientName:'   '},sdk));
 await assert.rejects(updateD3Shipping(admin,id,{...shipping,recipientPhone:'09'},sdk),/完整收件人電話/);
 await assertFails(sdk.updateDoc(ref,{recipientPhone:'09',shippingUpdatedAt:sdk.serverTimestamp()}));
 assert.equal((await sdk.getDoc(ref)).data().recipientEmail,'recipient@example.com');
 await assertSucceeds(cancelD3Registration(admin,id,sdk));
});

test('admin printing edits recalculate discounted party price and preserve shipping and seats',async()=>{
 const {updateD3Addon,updateD3Shipping}=await import('../experience/cons/d3/2026/registration-store.js');
 await commitD3Registration(db,id,{...answers,partySize:2,total:1800},sdk);
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 await updateD3Shipping(admin,id,{recipientName:'姓名',recipientPhone:'0912345678',recipientEmail:'recipient@example.com',sevenElevenStore:'門市'},sdk);
 await assertFails(updateD3Addon(db,id,'miniature',false,sdk));
 await assert.rejects(updateD3Addon(admin,id,'portrait',false,sdk),/加購選項不正確/);
 assert.equal((await updateD3Addon(admin,id,'miniature',false,sdk)).total,800);
 const ref=sdk.doc(admin,'d3Registrations',id);
 await assertFails(sdk.updateDoc(ref,{miniature:true,total:1,addonsUpdatedAt:sdk.serverTimestamp()}));
 await assertFails(sdk.updateDoc(ref,{miniature:true,total:900,partySize:1,addonsUpdatedAt:sdk.serverTimestamp()}));
 await assertFails(sdk.updateDoc(ref,{portrait:false,addonsUpdatedAt:sdk.serverTimestamp()}));
 assert.equal((await updateD3Addon(admin,id,'miniature',true,sdk)).total,1800);
 const saved=(await sdk.getDoc(ref)).data();
 assert.equal(saved.total,1800);assert.equal(saved.miniature,true);assert.equal(saved.portrait,true);
 assert.equal(saved.sevenElevenStore,'門市');
 assert.equal((await sdk.getDoc(sdk.doc(db,'d3Slots',slotId))).data().registeredPlayers,2);
});

test('shipping requires 3D add-on even for admin direct writes, and locks after removal',async()=>{
 const {updateD3Addon,updateD3Shipping}=await import('../experience/cons/d3/2026/registration-store.js');
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 await commitD3Registration(db,id,{...answers,miniature:false,total:400},sdk);
 const shipping={recipientName:'收件人',recipientPhone:'0912345678',recipientEmail:'recipient@example.com',sevenElevenStore:'龍山門市'};
 await assert.rejects(updateD3Shipping(admin,id,shipping,sdk));
 await assertFails(sdk.updateDoc(sdk.doc(admin,'d3Registrations',id),{...shipping,shippingUpdatedAt:sdk.serverTimestamp()}));
 await updateD3Addon(admin,id,'miniature',true,sdk);
 await assertSucceeds(updateD3Shipping(admin,id,shipping,sdk));
 await updateD3Addon(admin,id,'miniature',false,sdk);
 await assert.rejects(updateD3Shipping(admin,id,{...shipping,recipientName:'不能改'},sdk));
 assert.equal((await sdk.getDoc(sdk.doc(admin,'d3Registrations',id))).data().recipientName,'收件人');
});

test('independent image email works without 3D, remains separate from shipping and private',async()=>{
 const {updateD3ImageEmail,updateD3Addon,updateD3Shipping}=await import('../experience/cons/d3/2026/registration-store.js');
 await commitD3Registration(db,id,{...answers,miniature:false,total:400},sdk);
 const admin=env.authenticatedContext('admin',{admin:true}).firestore();
 await assertFails(updateD3ImageEmail(db,id,'images@example.com',sdk));
 await assertSucceeds(updateD3ImageEmail(admin,id,' images@example.com ',sdk));
 const ref=sdk.doc(admin,'d3Registrations',id);
 let saved=(await sdk.getDoc(ref)).data();assert.equal(saved.imageRecipientEmail,'images@example.com');assert.equal(saved.recipientEmail,undefined);assert.equal(saved.total,400);
 await assertFails(updateD3ImageEmail(admin,id,'invalid',sdk));
 await assertFails(sdk.updateDoc(ref,{imageRecipientEmail:'test@example.com',total:1,imageEmailUpdatedAt:sdk.serverTimestamp()}));
 await updateD3Addon(admin,id,'miniature',true,sdk);
 await updateD3Shipping(admin,id,{recipientName:'收件人',recipientPhone:'0912345678',recipientEmail:'shipping@example.com',sevenElevenStore:'龍山門市'},sdk);
 await updateD3ImageEmail(admin,id,'new@example.com',sdk);
 saved=(await sdk.getDoc(ref)).data();assert.equal(saved.recipientEmail,'shipping@example.com');assert.equal(saved.imageRecipientEmail,'new@example.com');
 await assertSucceeds(updateD3ImageEmail(admin,id,'',sdk));
 await assertFails(sdk.getDoc(sdk.doc(db,'d3Registrations',id)));
});

test('dedicated helper manages D3 only; ordinary users and matching emails gain no helper access',async()=>{
 const {updateD3Addon,updateD3Shipping,updateD3ImageEmail}=await import('../experience/cons/d3/2026/registration-store.js');
 const helper=env.authenticatedContext('d3-helper-2026').firestore();
 await assertSucceeds(commitD3Registration(helper,id,answers,sdk));
 await assertSucceeds(sdk.getDocs(sdk.collection(helper,'d3Slots')));
 await assertSucceeds(sdk.getDocs(sdk.collection(helper,'d3Registrations')));
 await assertSucceeds(updateD3ImageEmail(helper,id,'helper@example.com',sdk));
 await assertSucceeds(updateD3Shipping(helper,id,{recipientName:'收件人',recipientPhone:'0912345678',recipientEmail:'helper@example.com',sevenElevenStore:'龍山門市'},sdk));
 await assertSucceeds(updateD3Addon(helper,id,'miniature',false,sdk));
 await assertSucceeds(cancelD3Registration(helper,id,sdk));
 assert.equal((await sdk.getDoc(ref())).data().registeredPlayers,0);
 await assertFails(sdk.updateDoc(sdk.doc(helper,'d3Slots',slotId),{registrationOpen:false}));
 await assertFails(sdk.updateDoc(sdk.doc(helper,'d3Slots',slotId),{registeredPlayers:2}));
 for(const name of ['members','experienceEvents','experienceRegistrations','experienceFeedback']) await assertFails(sdk.getDocs(sdk.collection(helper,name)));
 await env.withSecurityRulesDisabled(ctx=>sdk.setDoc(sdk.doc(ctx.firestore(),'members','someone-else'),{displayName:'私人會員'}));
 await assertFails(sdk.getDoc(sdk.doc(helper,'members','someone-else')));
 const impersonator=env.authenticatedContext('ordinary-user',{email:'2026-d3-helper@rugatha.com',email_verified:true}).firestore();
 await assertFails(sdk.getDocs(sdk.collection(impersonator,'d3Registrations')));
 await assertFails(sdk.getDocs(sdk.collection(db,'d3Registrations')));
});
