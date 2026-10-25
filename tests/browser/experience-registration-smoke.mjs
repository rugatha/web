// Run with a local web server and the Firestore Emulator. Never writes production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
import { commitRegistration } from '../../experience/register/registration-store.js';
const projectId='demo-rugatha-registration';
const config=JSON.parse(await readFile('experience/register/experience_info.json','utf8'));
Object.assign(config,{active:'y',eventId:'browser-smoke',startDate:'2099-01-02',endDate:'2099-01-02',deadline:'2099-01-01'});
const env=await initializeTestEnvironment({projectId,firestore:{rules:await readFile('config/firebase/firestore.rules','utf8')}});
await env.clearFirestore();
await env.withSecurityRulesDisabled(ctx=>sdk.setDoc(sdk.doc(ctx.firestore(),'experienceEvents',config.eventId),{
 registrationOpen:true,deadline:sdk.Timestamp.fromDate(new Date('2099-01-01T23:59:59.999+08:00')),maxPlayers:5,registeredPlayers:0,
}));
const browser=await chromium.launch({channel:'chrome'});
try{
const context=await browser.newContext();
const errors=[];
context.on('page',page=>page.on('pageerror',e=>errors.push(e.message)));
await context.route('**/experience_info.json',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(config)}));
await context.route('**/shared/firebase.config.js',route=>route.fulfill({contentType:'text/javascript',body:`window.RUGATHA_FIREBASE_CONFIG={projectId:'${projectId}',apiKey:'demo-key',appId:'demo-app'};window.RUGATHA_FEATURE_FLAGS={dataWritesEnabled:true};`}));
let transport=await readFile('experience/register/firebase-registration.js','utf8');
transport="import { connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';\n"+transport.replace('  return getFirestore(app);',"  const db = getFirestore(app); if (!window.emulatorConnected) { connectFirestoreEmulator(db, '127.0.0.1', 8080); window.emulatorConnected = true; } return db;");
await context.route('**/experience/register/firebase-registration.js',route=>route.fulfill({contentType:'text/javascript',body:transport}));
const page=await context.newPage();
const observer=await context.newPage();
const url=(process.env.RUGATHA_TEST_BASE_URL || 'http://127.0.0.1:8765')+'/experience/register/';
await Promise.all([page.goto(url),observer.goto(url)]);
await page.getByText('剩餘 5 人／共 5 人',{exact:false}).waitFor({timeout:30000});
await observer.getByText('剩餘 5 人／共 5 人',{exact:false}).waitFor();
assert.equal(await page.locator('#party-size option').count(),5);
await page.locator('#name').fill('Emulator 測試玩家');
await page.locator('#contact').fill('test@example.test');
await page.locator('#party-size').selectOption('2');
await page.locator('#systems input[value="其他"]').check();
await page.locator('#systems-other').fill('測試系統');
await page.locator('#dnd-experience input').first().check();
await page.locator('#rugatha-experience input').last().check();
await page.locator('#sources input[value="Instagram"]').check();
await page.locator('#sources input[value="Threads"]').check();
await page.getByRole('button',{name:'確認報名內容'}).click();
await page.locator('#submit-button').click();
await page.locator('#registration-success').waitFor({timeout:30000});
assert.doesNotMatch(await page.locator('#registration-success').textContent(), /報名編號/);
assert.match(await page.locator('#success-details').textContent(), /Emulator 測試玩家/);
assert.match(await page.locator('#success-details').textContent(), /2 人/);
assert.match(await page.locator('#success-details').textContent(), /2099\/01\/02/);
assert.equal(await page.locator('.success-next-steps > p').count(), 3);
await observer.getByText('剩餘 3 人／共 5 人',{exact:false}).waitFor();
assert.equal(await observer.locator('#party-size option').count(),3);
const admin=env.authenticatedContext('admin',{admin:true}).firestore();
const records=await sdk.getDocs(sdk.collection(admin,'experienceRegistrations'));
assert.equal(records.size,1);
const saved=records.docs[0].data();
assert.equal(saved.partySize,2);
assert.deepEqual(saved.sources,['Instagram','Threads']);
assert.ok(saved.createdAt instanceof sdk.Timestamp);
await commitRegistration(env.unauthenticatedContext().firestore(),'z'.repeat(20),{...saved,partySize:3},sdk);
await observer.locator('#full-notice').waitFor();
assert.match(await observer.locator('#seats-note').textContent(), /剩餘 0 人／共 5 人/);
assert.equal(await observer.locator('#event-status').textContent(),'本期已額滿');
assert.equal(await observer.locator('#party-size').isDisabled(),true);
assert.equal(await observer.locator('#registration-form').isVisible(),false);
assert.equal(await observer.locator('#registration-intro').isVisible(),false);
assert.equal(await observer.locator('#full-notice').isVisible(),true);
assert.equal(await observer.locator('#full-notice').textContent(),'本期已額滿，敬請期待下個月的體驗團！');
for(const [width,height] of [[1440,1000],[390,844]]){
 await observer.setViewportSize({width,height});
 assert.equal(await observer.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
assert.equal(await observer.locator('#event-poster').evaluate(img=>img.complete&&img.naturalWidth>0),true);
assert.match(await observer.locator('#event-poster').getAttribute('src'),/rugatha-experience.jpeg$/);
assert.deepEqual(errors,[]);
console.log('PASS: actual browser → Firestore Emulator submission, saved answers, live seats across tabs, full state, upright JPEG fallback, mobile layout.');
}finally{await browser.close();await env.cleanup();}
