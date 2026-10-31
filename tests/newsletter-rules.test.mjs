import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test, { before, after, beforeEach } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { CONSENT_VERSION, SUBSCRIPTIONS, LIMITS, privateId, updateSubscription } from '../functions/newsletter-store.js';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const projectId = 'demo-rugatha-newsletter';
const secret = 'local-newsletter-test-key-not-for-production';
let env, app, db;
const request = (email = 'adventurer@example.com') => ({ action: 'subscribe', email, consent: true, consentVersion: CONSENT_VERSION });
const options = (ip = '127.0.0.1') => ({ secret, ip, timestamp: () => FieldValue.serverTimestamp() });
const ref = email => db.collection(SUBSCRIPTIONS).doc(privateId(secret, 'email', email));
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run only with the Firestore Emulator');
  env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync('config/firebase/firestore.rules', 'utf8') } });
  app = initializeApp({ projectId }, 'newsletter-tests');
  db = getFirestore(app);
});
beforeEach(async () => env.clearFirestore());
after(async () => { await env?.cleanup(); if (app) await deleteApp(app); });

test('normalizes and deduplicates subscriptions; timestamps and consent are stored privately', async () => {
  assert.deepEqual(await updateSubscription(db, request('  Adventurer@Example.COM  '), options()), { ok: true });
  const first = (await ref('adventurer@example.com').get()).data();
  assert.equal(first.email, 'adventurer@example.com');
  assert.equal(first.status, 'active');
  assert.equal(first.consentVersion, CONSENT_VERSION);
  assert.equal(first.unsubscribedAt, null);
  assert.ok(first.createdAt.toMillis());
  await updateSubscription(db, request(), options());
  assert.deepEqual((await ref(first.email).get()).data(), first);
  assert.equal((await db.collection(SUBSCRIPTIONS).get()).size, 1);
});

test('unsubscribe and resubscribe preserve creation time; unknown and repeated cancellations are idempotent', async () => {
  const cancel = email => updateSubscription(db, { action: 'unsubscribe', email }, options());
  assert.deepEqual(await cancel('missing@example.com'), { ok: true });
  assert.equal((await db.collection(SUBSCRIPTIONS).get()).size, 0);
  await updateSubscription(db, request(), options());
  const first = (await ref('adventurer@example.com').get()).data();
  await cancel('Adventurer@example.com');
  const cancelled = (await ref(first.email).get()).data();
  assert.equal(cancelled.status, 'unsubscribed');
  assert.ok(cancelled.unsubscribedAt.toMillis());
  await cancel(first.email);
  assert.deepEqual((await ref(first.email).get()).data(), cancelled);
  await updateSubscription(db, request(), options());
  const restored = (await ref(first.email).get()).data();
  assert.equal(restored.status, 'active');
  assert.equal(restored.unsubscribedAt, null);
  assert.ok(restored.createdAt.isEqual(first.createdAt));
});

test('public, member and helper cannot read or write addresses; only verified admins read', async () => {
  await updateSubscription(db, request(), options());
  const id = privateId(secret, 'email', 'adventurer@example.com');
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('member'), env.authenticatedContext('d3-helper-2026'), env.authenticatedContext('spoof', { email: 'rugathadnd@gmail.com', email_verified: false })]) {
    const client = context.firestore(), target = doc(client, SUBSCRIPTIONS, id);
    await assertFails(getDoc(target));
    await assertFails(getDocs(collection(client, SUBSCRIPTIONS)));
    await assertFails(setDoc(target, { email: 'attacker@example.com', status: 'active' }));
    await assertFails(updateDoc(target, { status: 'unsubscribed' }));
    await assertFails(deleteDoc(target));
  }
  for (const claims of [{ admin: true }, { email: 'rugathadnd@gmail.com', email_verified: true }]) {
    const client = env.authenticatedContext('admin', claims).firestore();
    await assertSucceeds(getDocs(collection(client, SUBSCRIPTIONS)));
    await assertFails(updateDoc(doc(client, SUBSCRIPTIONS, id), { status: 'active' }));
    await assertFails(getDocs(collection(client, LIMITS)));
  }
});

test('optional cancellation feedback supports multiple reasons or free text, preserves first submission on retry and survives resubscribe', async () => {
  await updateSubscription(db, request(), options());
  const feedback = { action: 'unsubscribe', email: request().email, reasons: ['快報內容不符合我的需求', '已透過其他管道取得最新資訊'], note: '  希望快報內容能更精簡。  ' };
  await updateSubscription(db, feedback, options());
  const cancelled = (await ref(feedback.email).get()).data();
  assert.deepEqual(cancelled.unsubscribeFeedback.reasons, feedback.reasons);
  assert.equal(cancelled.unsubscribeFeedback.note, feedback.note.trim());
  assert.ok(cancelled.unsubscribeFeedback.submittedAt.toMillis());
  await updateSubscription(db, { ...feedback, reasons: [], note: 'retry' }, options());
  assert.deepEqual((await ref(feedback.email).get()).data(), cancelled);
  await updateSubscription(db, request(), options());
  assert.deepEqual((await ref(feedback.email).get()).data().unsubscribeFeedback, cancelled.unsubscribeFeedback);
  await updateSubscription(db, { action: 'unsubscribe', email: feedback.email, note: '純文字回饋也可以' }, options());
  const latest = (await ref(feedback.email).get()).data().unsubscribeFeedback;
  assert.deepEqual(latest.reasons, []);
  assert.equal(latest.note, '純文字回饋也可以');
});

test('malformed cancellation feedback cannot alter subscription or create private data', async () => {
  await updateSubscription(db, request(), options());
  for (const change of [{ reasons: null }, { reasons: '其他' }, { reasons: ['不存在的原因'] }, { reasons: ['其他', '其他'] }, { reasons: Array(7).fill('其他') }, { note: null }, { note: {} }, { note: '字'.repeat(1001) }]) {
    await assert.rejects(updateSubscription(db, { action: 'unsubscribe', email: request().email, ...change }, options()), { code: 'invalid-argument' });
  }
  await assert.rejects(updateSubscription(db, { ...request(), reasons: [] }, options()), { code: 'invalid-argument' });
  const active = (await ref(request().email).get()).data();
  assert.equal(active.status, 'active');
  assert.equal(active.unsubscribeFeedback, undefined);
});

test('invalid email, missing consent, incorrect consent version, and arbitrary fields cannot write', async () => {
  for (const value of [null, {}, { ...request(), email: 'broken' }, { ...request(), email: 'a..b@example.com' }, { ...request(), email: 'a\n@example.com' }, { ...request(), email: `${'a'.repeat(65)}@example.com` }, { ...request(), consent: false }, { ...request(), consentVersion: 'old' }, { ...request(), status: 'active' }, { ...request(), action: 'list' }]) {
    await assert.rejects(updateSubscription(db, value, options()), { code: 'invalid-argument' });
  }
  assert.equal((await db.collection(SUBSCRIPTIONS).get()).size, 0);
  assert.equal((await db.collection(LIMITS).get()).size, 0);
});

test('rate limiting is enforced on the backend and resets after the window', async () => {
  const now = Date.now(), settings = { ...options(), now };
  for (let i = 0; i < 10; i++) await updateSubscription(db, request(), settings);
  await assert.rejects(updateSubscription(db, request('new@example.com'), settings), { code: 'resource-exhausted' });
  assert.equal((await ref('new@example.com').get()).exists, false);
  await updateSubscription(db, request('new@example.com'), { ...settings, now: now + 600001 });
  assert.equal((await ref('new@example.com').get()).data().status, 'active');
});

test('concurrent subscriptions share one document; plus aliases are preserved', async () => {
  await Promise.all([1, 2, 3].map(number => updateSubscription(db, request(), options(`ip-${number}`))));
  assert.equal((await db.collection(SUBSCRIPTIONS).get()).size, 1);
  await updateSubscription(db, request('adventurer+newsletter@example.com'), options());
  assert.equal((await db.collection(SUBSCRIPTIONS).get()).size, 2);
});
