import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
import { commitFeedback } from '../experience/feedback/feedback-store.js';
const { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp, Timestamp } = sdk;
let env, db;
const id = 'a'.repeat(20);
const answers = () => ({ nickname:'冒險者', gender:'其他/不願透露', genderOther:'', ageRange:'不願透露', sessionDate:'2026-10-25', scenario:'體驗團《龍鳴的回音》', previousParticipation:'無', interests:['桌遊','其他'], interestsOther:'閱讀', storyRating:3, characterRating:4, dmRating:5, cardRating:2, propRating:1, feeOpinion:'可以接受', privateFeedback:'私下意見', publicFeedback:'公開心得' });
before(async () => {
  env = await initializeTestEnvironment({ projectId:'demo-rugatha-feedback', firestore:{rules:readFileSync('config/firebase/firestore.rules','utf8')} });
  db = env.unauthenticatedContext().firestore();
});
after(async () => env?.cleanup());
beforeEach(async () => env.clearFirestore());
const raw = (changes={}, recordId=id) => setDoc(doc(db,'experienceFeedback',recordId),{...answers(), schemaVersion:1, source:'website', createdAt:serverTimestamp(), ...changes});
test('guests submit; only admins read private and public answers', async () => {
  await assertSucceeds(commitFeedback(db,id,answers(),sdk));
  const ref = doc(db,'experienceFeedback',id);
  await assertFails(getDoc(ref));
  await assertFails(getDocs(collection(db,'experienceFeedback')));
  const member = env.authenticatedContext('member').firestore();
  await assertFails(getDoc(doc(member,'experienceFeedback',id)));
  const admin = env.authenticatedContext('admin',{admin:true}).firestore();
  const saved = (await assertSucceeds(getDoc(doc(admin,'experienceFeedback',id)))).data();
  assert.equal(saved.privateFeedback,'私下意見');
  assert.equal(saved.publicFeedback,'公開心得');
  assert.equal(saved.storyRating,3);
  assert.deepEqual(saved.interests,['桌遊','其他']);
  assert.ok(saved.createdAt instanceof Timestamp);
  await assertSucceeds(getDocs(collection(admin,'experienceFeedback')));
});
test('required answers, discrete values, options, lengths and timestamp are enforced on server', async () => {
  for (const change of [
    {nickname:'  '},{gender:''},{ageRange:''},{sessionDate:'yesterday'},{scenario:'unknown'},
    {gender:'男性',genderOther:'hidden extra'},{previousParticipation:'maybe'},
    {interestsOther:''},{interestsOther:'  '},{interestsOther:'x'.repeat(151)},{interests:['桌遊'],interestsOther:'stale'}, {interests:[]},{interests:['桌遊','桌遊']},{interests:['unknown']},
    ...['storyRating','characterRating','dmRating','cardRating','propRating'].flatMap(key=>[0,6,2.5,'3',null].map(value=>({[key]:value}))),
    {feeOpinion:''},{privateFeedback:'x'.repeat(4001)},{publicFeedback:'x'.repeat(4001)},
    {source:'surveycake-history'},{extra:'not-allowed'}, {schemaVersion:2},
    {createdAt:Timestamp.fromDate(new Date('2000-01-01'))},
  ]) await assertFails(raw(change));
  const missingOther = {...answers()}; delete missingOther.interestsOther;
  await assertFails(setDoc(doc(db,'experienceFeedback',id),{...missingOther,schemaVersion:1,source:'website',createdAt:serverTimestamp()}));
  const missing = {...answers()}; delete missing.storyRating;
  await assertFails(setDoc(doc(db,'experienceFeedback',id),{...missing,schemaVersion:1,source:'website',createdAt:serverTimestamp()}));
  await assertFails(raw({},'invalid-id'));
});
test('no replay, edits or deletes; historical data remains admin-only', async () => {
  await assertSucceeds(raw({privateFeedback:'',publicFeedback:''}));
  await assertFails(raw());
  await assertFails(updateDoc(doc(db,'experienceFeedback',id),{nickname:'changed'}));
  await assertFails(deleteDoc(doc(db,'experienceFeedback',id)));
  const admin = env.authenticatedContext('admin',{admin:true}).firestore();
  await assertFails(deleteDoc(doc(admin,'experienceFeedback',id)));
  await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'experienceFeedback/history-test'),{source:'surveycake-history',privateFeedback:'history'}));
  await assertFails(getDoc(doc(db,'experienceFeedback/history-test')));
  await assertSucceeds(getDoc(doc(admin,'experienceFeedback/history-test')));
});
