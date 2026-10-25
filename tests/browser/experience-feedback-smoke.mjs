// Real Firestore SDK + demo Emulator only; never writes production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as sdk from 'firebase/firestore';
const projectId = 'demo-rugatha-feedback-browser';
const env = await initializeTestEnvironment({projectId,firestore:{rules:await readFile('config/firebase/firestore.rules','utf8')}});
await env.clearFirestore();
const root = resolve('.');
const server = createServer(async (request,response) => {
  try {
    let path = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(root,'.'+path);
    if (!file.startsWith(root+'/')) throw new Error('Invalid path');
    const body = await readFile(file);
    response.setHeader('Content-Type', ({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'})[extname(file)] || 'application/octet-stream');
    response.end(body);
  } catch { response.statusCode=404; response.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser = await chromium.launch({channel:'chrome'});
try {
  const context = await browser.newContext();
  const errors=[];
  await context.route('**/shared/firebase.config.js', route=>route.fulfill({contentType:'text/javascript',body:`window.RUGATHA_FIREBASE_CONFIG={projectId:'${projectId}',apiKey:'demo-key',appId:'demo-app'};window.RUGATHA_FEATURE_FLAGS={dataWritesEnabled:true};`}));
  let transport = await readFile('experience/feedback/firebase-feedback.js','utf8');
  transport = "import { connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';\n" + transport.replace('  return getFirestore(app);', "  const db = getFirestore(app); if (!window.feedbackEmulator) { connectFirestoreEmulator(db,'127.0.0.1',8080); window.feedbackEmulator = true; } return db;");
  transport = transport.replace('  await commitFeedback(', "  if (!window.feedbackFailedOnce) { window.feedbackFailedOnce=true; throw new Error('simulated network failure'); }\n  await new Promise(resolve=>setTimeout(resolve,250));\n  await commitFeedback(");
  await context.route('**/experience/feedback/firebase-feedback.js', route=>route.fulfill({contentType:'text/javascript',body:transport}));
  const page = await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/experience/feedback/`);
  await page.locator('#feedback-form').waitFor({state:'visible'});
  assert.equal(await page.locator('progress, #copy-button').count(),0);
  assert.equal(await page.locator('.hero-art').getAttribute('src'),'../../about-us/assets/rugatha-photo.png');
  assert.equal(await page.locator('output:visible').count(),0);
  assert.equal(await page.locator('input[type=range]:invalid').count(),6);
  assert.deepEqual(await page.locator('.question-number').allTextContents(),Array.from({length:15},(_,i)=>`${i+1}.`));
  const margin = await page.locator('.site-header').evaluate(el=>parseFloat(getComputedStyle(el).marginTop));
  assert(margin>=24);
  await page.locator('#nickname').fill('Emulator 測試冒險者');
  for (const name of ['gender','ageRange','scenario','previousParticipation','interests']) await page.locator(`input[name=${name}]`).first().check();
  const otherInterest = page.locator('input[name=interests][value="其他"]');
  await otherInterest.check();
  assert.equal(await page.locator('#interests-other').isVisible(),true);
  await page.locator('#interests-other').fill('   ');
  assert.equal(await page.locator('#interests-other').evaluate(el=>el.validity.valid),false);
  await page.locator('#interests-other').fill('閱讀');
  await otherInterest.uncheck();
  assert.equal(await page.locator('#interests-other').isDisabled(),true);
  await otherInterest.check();
  await page.locator('#sessionDate').fill('2026-10-25');
  await page.locator('button[type=submit]').click();
  assert.equal(await page.locator('dialog').evaluate(el=>el.open),false);
  for (const name of ['storyRating','characterRating','dmRating','cardRating','propRating','feeOpinion']) {
    const input=page.locator(`#${name}`);
    await input.focus(); await input.press('End');
  }
  assert.equal(await page.locator('.slider-control output').count(),0);
  await page.locator('#privateFeedback').fill('測試私下意見 <script>');
  await page.locator('#publicFeedback').fill('測試公開意見');
  await page.locator('button[type=submit]').click();
  assert.match(await page.locator('#review-details').innerText(),/其他：閱讀/);
  await page.locator('#submit-button').click();
  await page.locator('#submission-status').filter({hasText:'送出尚未完成'}).waitFor();
  assert.equal(await page.locator('#feedback-success').isVisible(),false);
  assert.equal(await page.locator('#edit-button').isEnabled(),true);
  await page.locator('#submit-button').click();
  assert.equal(await page.locator('#submit-button').isDisabled(),true);
  assert.equal(await page.locator('#edit-button').isDisabled(),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog').evaluate(el=>el.open),true);
  await page.locator('#feedback-success').waitFor({timeout:30000});
  assert.equal(await page.locator('#feedback-form').isVisible(),false);
  const admin=env.authenticatedContext('admin',{admin:true}).firestore();
  const records=await sdk.getDocs(sdk.collection(admin,'experienceFeedback'));
  assert.equal(records.size,1);
  const saved=records.docs[0].data();
  assert.equal(saved.nickname,'Emulator 測試冒險者');
  assert.equal(saved.storyRating,5); assert.equal(saved.feeOpinion,'太貴');
  assert.equal(saved.source,'website'); assert.equal(saved.schemaVersion,1);
  assert.equal(saved.privateFeedback,'測試私下意見 <script>');
  assert.equal(saved.publicFeedback,'測試公開意見');
  assert(saved.createdAt instanceof sdk.Timestamp);
  assert.deepEqual(saved.interests,['TRPG遊戲','其他']);
  assert.equal(saved.interestsOther,'閱讀');
  assert.deepEqual(errors,[]);
  await page.reload();
  for (const width of [1280,390,320]) {
    await page.setViewportSize({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:'/tmp/feedback-backend-desktop.png'});
  await page.locator('#storyRating').scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/feedback-backend-sliders.png'});
  console.log('PASS: blank required sliders, header space, failure retention, disabled duplicate submission, Escape lock, real Emulator write, success page and desktop/mobile layouts.');
} finally {
  await browser.close();
  await env.cleanup();
  await new Promise(resolve=>server.close(resolve));
}
