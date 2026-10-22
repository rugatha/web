import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const production = process.env.RUGATHA_LETTER_TEST_BASE_URL;
const chapterPath = '/campaigns/pages/rugatha-wilds/wilds-c05/chpt06.html';
const dataPath = '/campaigns/data/chapter-content.json';
const oldData = execFileSync('git', ['show', '46f445b:campaigns/data/chapter-content.json'], { maxBuffer: 16 * 1024 * 1024 }).toString();
const workerVersion = readFileSync('sw.js', 'utf8').match(/CACHE_VERSION = "([^"]+)"/)[1];
const runtime = `${workerVersion}-runtime`;

for (const width of [1280, 390]) {
  test(`letter reading upgrades old caches and opens original images after a full offline reload (${width}px)`, async ({ page, context }, testInfo) => {
    const origin = new URL(testInfo.project.use.baseURL).origin;
    await context.route('**/*', route => route.request().method() === 'GET' && new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    if (production) await context.route('**/__image-test__/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Letter PWA acceptance</title>' }));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/__image-test__/');
    await page.evaluate(() => localStorage.setItem('npc-lang', 'zh'));
    if (!production) {
      await page.evaluate(async () => {
        await navigator.serviceWorker.register('/__image-test__/old-sw.js', { scope: '/', updateViaCache: 'none' });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      });
      await expect.poll(() => page.evaluate(() => caches.keys())).toContain('rugatha-pwa-v27-static');
    }
    await page.evaluate(async ({ oldData, dataPath }) => {
      const stale = await caches.open('rugatha-pwa-v27-runtime');
      await stale.put(dataPath, new Response(oldData, { headers: { 'Content-Type': 'application/json' } }));
      const unrelated = await caches.open('letter-test-unrelated');
      await unrelated.put('/proof', new Response('keep'));
    }, { oldData, dataPath });

    // The real shared/pwa.js registers the new worker from the actual chapter.
    await page.goto(chapterPath);
    await expect.poll(() => page.evaluate(() => caches.keys())).toContain(`${workerVersion}-static`);
    await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain('rugatha-pwa-v27-runtime');
    expect(await page.evaluate(() => caches.keys())).toContain('letter-test-unrelated');
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain('20261022-letter-reading-r2');
    await page.reload();

    // Seed stale JSON in the new runtime too. The next online navigation must
    // already contain current links, not require a second stale-while-revalidate load.
    await page.evaluate(async ({ runtime, oldData, dataPath }) => {
      await (await caches.open(runtime)).put(dataPath, new Response(oldData, { headers: { 'Content-Type': 'application/json' } }));
    }, { runtime, oldData, dataPath });
    await page.reload();
    const imageUrls = [];
    for (const language of ['zh', 'en']) {
      const block = page.locator(`.campaign-detail__content_${language}`);
      await expect(block).toBeVisible();
      const links = block.locator('a:has(img[src*="wilds-c05-chpt06_"])');
      await expect(links).toHaveCount(language === 'zh' ? 2 : 3);
      for (const link of await links.all()) {
        await link.scrollIntoViewIfNeeded();
        await expect.poll(() => link.locator('img').evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
        imageUrls.push(await link.evaluate(a => a.href));
      }
      if (language === 'zh') await page.locator('[data-lang-toggle]').click();
    }
    await expect.poll(() => page.evaluate(async ({ runtime, paths }) => {
      const cache = await caches.open(runtime);
      return (await Promise.all(paths.map(path => cache.match(path)))).every(Boolean);
    }, { runtime, paths: [chapterPath, dataPath, '/campaigns/scripts/chapter-content.js', '/campaigns/scripts/detail.js', ...imageUrls] })).toBe(true);

    const offlineResponses = [];
    context.on('response', response => {
      if (imageUrls.includes(response.url())) offlineResponses.push({ url: response.url(), status: response.status(), fromServiceWorker: response.fromServiceWorker() });
    });
    await context.setOffline(true);
    if (production) await context.unroute('**/__image-test__/');
    await page.reload({ waitUntil: 'domcontentloaded' });
    const opened = [];
    for (const language of ['en', 'zh']) {
      const block = page.locator(`.campaign-detail__content_${language}`);
      await expect(block).toBeVisible();
      const links = block.locator('a:has(img[src*="wilds-c05-chpt06_"])');
      await expect(links).toHaveCount(language === 'zh' ? 2 : 3);
      for (const link of await links.all()) {
        await link.scrollIntoViewIfNeeded();
        await expect.poll(() => link.locator('img').evaluate(i => i.complete && i.naturalWidth > 0)).toBe(true);
        const url = await link.evaluate(a => a.href);
        await link.focus();
        const popupPromise = context.waitForEvent('page');
        await link.press('Enter');
        const popup = await popupPromise;
        await popup.waitForLoadState('domcontentloaded');
        expect(popup.url()).toBe(url);
        expect(await popup.evaluate(() => document.contentType)).toBe('image/jpeg');
        await expect.poll(() => popup.locator('img').evaluate(i => i.complete && i.naturalWidth)).toBe(language === 'zh' ? 595 : 1190);
        opened.push({ language, url, width: await popup.locator('img').evaluate(i => i.naturalWidth) });
        await popup.close();
      }
      if (language === 'en') await page.locator('[data-lang-toggle]').click();
    }
    expect(opened).toHaveLength(5);
    for (const url of imageUrls) expect(offlineResponses.some(r => r.url === url && r.status === 200 && r.fromServiceWorker)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('offline-letter.png') });
    await context.setOffline(false);
    await page.reload();
    await expect(page.locator('.campaign-detail__content_zh a:has(img[src*="wilds-c05-chpt06_"])')).toHaveCount(2);
    const directory = process.env.RUGATHA_LETTER_REPORT_DIR || join(tmpdir(), 'rugatha-letter-pwa');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `${production ? 'production' : 'local'}-${width}.json`), JSON.stringify({ checkedAt: new Date().toISOString(), workerVersion, viewport: width, origin, activeOldWorkerTested: !production, staleV27CacheRemoved: true, unrelatedCachePreserved: true, staleCurrentJsonRefreshedOnNextNavigation: true, offlineFullReload: true, opened, offlineResponses, reconnect: true }, null, 2) + '\n');
  });
}
