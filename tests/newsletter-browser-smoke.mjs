import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNewsletterPreviewServer, projectId } from '../scripts/newsletter-preview-server.mjs';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
if (!process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:')) throw new Error('Requires local Firebase Emulators');
const app = initializeApp({ projectId }, 'newsletter-browser');
const db = getFirestore(app);
const server = createNewsletterPreviewServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const sdkPrefix = 'https://www.gstatic.com/firebasejs/12.7.0/';
const sdk = new Map();
const cache = join(tmpdir(), 'rugatha-firebase-12.7.0');
await mkdir(cache, { recursive: true });
let browser;
try {
  for (const name of ['firebase-app.js', 'firebase-functions.js']) {
    let body;
    try { body = await readFile(join(cache, name), 'utf8'); }
    catch {
      const response = await fetch(sdkPrefix + name);
      assert.ok(response.ok);
      body = await response.text();
      await writeFile(join(cache, name), body);
    }
    sdk.set(sdkPrefix + name, body);
  }
  browser = await chromium.launch({ channel: process.env.RUGATHA_TEST_BROWSER_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(sdkPrefix + '**', async route => {
    const body = sdk.get(route.request().url());
    assert.ok(body, 'Only expected SDK modules load');
    await route.fulfill({ body, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } });
  });
  // Any accidental production backend request must fail the test.
  await page.route('https://**/*', route => {
    if (route.request().url().startsWith(sdkPrefix)) return route.fallback();
    throw new Error('Unexpected external request: ' + new URL(route.request().url()).origin);
  });
  await page.goto(origin + '/experience/subscribe/');
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: join(tmpdir(), `rugatha-subscribe-${width}.png`), fullPage: true });
  }
  await db.recursiveDelete(db.collection('experienceNewsletterLimits'));
  const email = 'browser-adventurer@example.com';
  await page.getByLabel('Email', { exact: false }).fill(email);
  await page.getByRole('button', { name: '訂閱快報', exact: true }).click();
  assert.equal(await page.locator('#success').isVisible(), false, 'Consent is required');
  await page.locator('#consent').check();
  // Fail once to verify input retention and a real retry through the callable backend.
  await page.route('**/asia-east1/experienceNewsletter', async route => {
    await page.unroute('**/asia-east1/experienceNewsletter');
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { status: 'UNAVAILABLE', message: 'test failure' } }), headers: { 'access-control-allow-origin': '*' } });
  });
  await page.getByRole('button', { name: '訂閱快報', exact: true }).click();
  await page.locator('#form-status').filter({ hasText: '目前無法完成' }).waitFor();
  assert.equal(await page.locator('#email').inputValue(), email);
  assert.ok(await page.locator('#consent').isChecked());
  await page.getByRole('button', { name: '訂閱快報', exact: true }).click();
  await page.locator('#success').waitFor({ timeout: 30000 });
  let rows = await db.collection('experienceNewsletterSubscriptions').where('email', '==', email).get();
  assert.equal(rows.size, 1);
  assert.equal(rows.docs[0].data().status, 'active');
  const createdAt = rows.docs[0].data().createdAt;
  await page.goto(origin + '/experience/unsubscribe/');
  assert.equal((await rows.docs[0].ref.get()).data().status, 'active', 'GET does not unsubscribe');
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    await page.screenshot({ path: join(tmpdir(), `rugatha-unsubscribe-${width}.png`), fullPage: true });
  }
  await page.getByLabel('快報內容不符合我的需求', { exact: true }).check();
  await page.getByLabel('已透過其他管道取得最新資訊', { exact: true }).check();
  await page.locator('#unsubscribe-note').fill('希望快報內容能更精簡。');
  await page.locator('#email').fill(email);
  await page.getByRole('button', { name: '確認取消訂閱' }).click();
  await page.locator('#success').waitFor();
  assert.equal((await rows.docs[0].ref.get()).data().status, 'unsubscribed');
  const feedback = (await rows.docs[0].ref.get()).data().unsubscribeFeedback;
  assert.deepEqual(feedback.reasons, ['快報內容不符合我的需求', '已透過其他管道取得最新資訊']);
  assert.equal(feedback.note, '希望快報內容能更精簡。');
  await page.goto(origin + '/experience/subscribe/');
  await page.locator('#email').fill(email.toUpperCase());
  await page.locator('#consent').check();
  await page.getByRole('button', { name: '訂閱快報', exact: true }).click();
  await page.locator('#success').waitFor();
  rows = await db.collection('experienceNewsletterSubscriptions').where('email', '==', email).get();
  assert.equal(rows.size, 1);
  assert.equal(rows.docs[0].data().status, 'active');
  assert.ok(rows.docs[0].data().createdAt.isEqual(createdAt));
  await page.goto(origin + '/experience/unsubscribe/');
  await page.locator('#email').fill(email);
  await page.getByRole('button', { name: '確認取消訂閱' }).click();
  await page.locator('#success').waitFor();
  const withoutFeedback = (await rows.docs[0].ref.get()).data();
  assert.equal(withoutFeedback.status, 'unsubscribed');
  assert.deepEqual(withoutFeedback.unsubscribeFeedback.reasons, []);
  assert.equal(withoutFeedback.unsubscribeFeedback.note, '');
  assert.deepEqual(errors, []);
  console.log('Browser: consent, failure/retry, real callable writes, optional cancellation feedback, blank cancellation, resubscribe, mobile and desktop layout passed.');
  await rows.docs[0].ref.delete();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await deleteApp(app);
}
