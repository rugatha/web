import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Real member UI / Web SDK with only demo Emulator accounts and objects.
test('member photo is cleared on logout and private Storage never enters public PWA caches', async ({ page, context, request }) => {
  page.on('dialog', dialog => dialog.accept());
  await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await request.delete('http://127.0.0.1:8080/emulator/v1/projects/demo-rugatha/databases/(default)/documents');
  await request.delete('http://127.0.0.1:9099/emulator/v1/projects/demo-rugatha/accounts');
  const seeded = await request.patch('http://127.0.0.1:8080/v1/projects/demo-rugatha/databases/(default)/documents/system/memberNumbers', { headers: { Authorization: 'Bearer owner' }, data: { fields: { lastAllocated: { integerValue: '0' }, updatedAt: { timestampValue: '2026-10-21T00:00:00Z' } } } });
  expect(seeded.ok()).toBe(true);
  await page.goto('/member/');
  await expect(page.getByRole('button', { name: '登入測試 A', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const sdk = await import('/__firebase__/firebase-storage.js');
    sdk.connectStorageEmulator(sdk.getStorage(window.spellbookTest.app), '127.0.0.1', 9199);
  });
  await page.getByRole('button', { name: '登入測試 A', exact: true }).click();
  await expect(page.locator('#user-email')).toContainText('spellbook-a@example.test');
  await expect(page.locator('#user-member-no')).toContainText(/[0-9]{4}-[0-9]{4}/);
  await expect(page.locator('#profile-photo-button')).toBeEnabled();
  await page.locator('#profile-photo-input').setInputFiles({ name: 'private-avatar.png', mimeType: 'image/png', buffer: readFileSync('assets/logo/rugatha-favicon-32.png') });
  const photo = page.locator('#user-photo');
  await expect(photo).toHaveAttribute('src', /^blob:/);
  const uid = await page.evaluate(() => window.spellbookTest.auth.currentUser.uid);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  const privateResponses = [];
  page.on('response', response => {
    if (decodeURIComponent(response.url()).includes('/o/profile-photos/')) privateResponses.push({ status: response.status(), fromServiceWorker: response.fromServiceWorker() });
  });
  expect(await page.evaluate(async owner => {
    const sdk = await import('/__firebase__/firebase-storage.js');
    return (await sdk.getBytes(sdk.ref(sdk.getStorage(window.spellbookTest.app), `profile-photos/${owner}/avatar.webp`))).byteLength;
  }, uid)).toBeGreaterThan(0);
  const privateCacheKeys = () => page.evaluate(async () => {
    const entries = await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(request => request.url)));
    return entries.flat().filter(url => /profile-photos|character-portraits|blob:/.test(decodeURIComponent(url)));
  });
  expect(await privateCacheKeys()).toEqual([]);
  await page.locator('#sign-out').click();
  // The production logout UI returns home. Reopen the member page as a guest,
  // with fresh SDK instances again connected only to the demo Storage Emulator.
  await page.waitForURL('**/index.html');
  await page.goto('/member/');
  await page.evaluate(async () => {
    await window.spellbookTest.auth.authStateReady();
    const sdk = await import('/__firebase__/firebase-storage.js');
    sdk.connectStorageEmulator(sdk.getStorage(window.spellbookTest.app), '127.0.0.1', 9199);
  });
  expect(await page.evaluate(() => window.spellbookTest.auth.currentUser === null)).toBe(true);
  await expect(photo).not.toHaveAttribute('src', /^blob:/);
  expect(await page.evaluate(async owner => {
    const sdk = await import('/__firebase__/firebase-storage.js');
    try { await sdk.getBytes(sdk.ref(sdk.getStorage(window.spellbookTest.app), `profile-photos/${owner}/avatar.webp`)); return 'unexpected-read'; }
    catch (error) { return error.code; }
  }, uid)).toBe('storage/unauthorized');
  expect(await privateCacheKeys()).toEqual([]);
  expect(privateResponses.some(response => response.status === 200)).toBe(true);
  expect(privateResponses.some(response => response.status === 403)).toBe(true);
  expect(privateResponses.every(response => !response.fromServiceWorker)).toBe(true);
});
