import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const campaigns = JSON.parse(readFileSync('docs/image-migration/campaign-current.json', 'utf8'));
const melvin = JSON.parse(readFileSync('docs/image-migration/npc-current.json', 'utf8')).images.find(image => image.entityIds.includes('Melvin'));
const copies = JSON.parse(readFileSync('docs/image-migration/site-copies-2026-11-06.json', 'utf8'));
const banner = copies.images.find(image => image.source.endsWith('.png')).public.url;
const production = process.env.RUGATHA_IMAGE_TEST_BASE_URL;

test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.abort();
    if (url.origin === new URL(baseURL).origin) return route.continue();
    if (url.origin === 'https://firebasestorage.googleapis.com' && decodeURIComponent(url.pathname).includes('/o/public-images/') && url.search === '?alt=media') return route.continue();
    return route.abort();
  });
});

test('every switched campaign variant and the repaired Melvin images decode', async ({ page }) => {
  test.setTimeout(180000);
  if (production) await page.route('**/__image-test__/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Migration image acceptance</title>' }));
  await page.goto('/__image-test__/');
  const variants = [...campaigns.images, melvin].flatMap(image => Object.values(image.variants));
  const failed = await page.evaluate(async variants => {
    let next = 0;
    const failed = [];
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (next < variants.length) {
        const variant = variants[next++];
        const image = new Image(); image.crossOrigin = 'anonymous'; image.src = variant.url;
        try {
          await image.decode();
          if (image.naturalWidth !== variant.width || image.naturalHeight !== variant.height) failed.push(variant.url);
        } catch { failed.push(variant.url); }
        image.removeAttribute('src');
      }
    }));
    return failed;
  }, variants);
  expect(failed).toEqual([]);
  const gallery = [...campaigns.images.filter(image => image.entityIds.some(id => id.startsWith('plus-c08'))), melvin];
  await page.evaluate(async images => {
    document.body.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;background:#151824;color:white;padding:20px;font-family:sans-serif';
    for (const image of images) {
      const figure = document.createElement('figure'); figure.style.margin = '0';
      const img = new Image(); img.src = image.variants.reading.url; img.style.cssText = 'width:100%;height:340px;object-fit:contain';
      const caption = document.createElement('figcaption'); caption.textContent = image.entityIds.join(', ');
      figure.append(img, caption); document.body.append(figure); await img.decode();
    }
  }, gallery);
  await page.screenshot({ path: 'test-results/image-browser/migration-assets.png', fullPage: true });
});

for (const width of [1280, 390]) {
  test(`new chapter, NPC and banner references load at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    const pages = [
      ['/campaigns/pages/rugatha-plus/plus-c08/index.html', '.campaign-detail__media img', 'plus-c08'],
      ['/campaigns/pages/rugatha-plus/plus-c08/chpt01.html', '.campaign-detail__media img', 'plus-c08-chpt01'],
      ['/campaigns/pages/rugatha-plus/plus-c08/chpt02.html', '.campaign-detail__media img', 'plus-c08-chpt02'],
      ['/npc/npc_page/pages/Melvin.html', '#npc-portrait', 'Melvin']
    ];
    for (const [path, selector, id] of pages) {
      const image = id === 'Melvin' ? melvin : campaigns.images.find(image => image.entityIds.includes(id));
      await page.goto(path);
      const element = page.locator(selector).first();
      await expect(element).toHaveAttribute('src', image.variants.reading.url);
      await expect.poll(() => element.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      const logo = page.locator(`img[src="${banner}"]`).first();
      await expect.poll(() => logo.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', image.variants.reading.url);
    }
    // The current event poster is a separate local PNG. Exercise the legacy
    // JPEG fallback specifically, without changing which current poster wins.
    await page.route('**/assets/banner/rugatha-experience.{png,jpg}', route => route.fulfill({ status: 404, body: 'Not found' }));
    await page.goto('/experience/register/index.html');
    const activity = copies.images.find(image => image.source.endsWith('.jpeg'));
    const activityImage = page.locator(`img[src="${activity.public.url}"]`).first();
    await expect.poll(() => activityImage.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  });
}

test('cloud banner remains available offline', async ({ page, context, baseURL }) => {
  if (production) await context.route('**/__image-test__/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Banner cache acceptance</title>' }));
  await page.goto('/__image-test__/');
  const script = await page.evaluate(async () => (await fetch('/sw.js')).text());
  const version = script.match(/const CACHE_VERSION = "([^"]+)";/)[1];
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  const render = () => page.evaluate(async url => { const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url; document.body.append(img); await img.decode(); return img.naturalWidth; }, banner);
  const width = await render(); expect(width).toBeGreaterThan(192);
  await expect.poll(() => page.evaluate(async ({ name, url }) => !!(await (await caches.open(name)).match(url)), { name: `${version}-public-images`, url: banner })).toBe(true);
  const reloadOffline = production || !['localhost', '127.0.0.1', '::1'].includes(new URL(baseURL).hostname);
  if (reloadOffline) {
    await page.reload();
    await expect.poll(() => page.evaluate(async name => !!(await (await caches.open(name)).match(location.href)), `${version}-runtime`)).toBe(true);
    if (production) await context.unroute('**/__image-test__/');
  }
  await context.setOffline(true);
  if (reloadOffline) await page.reload({ waitUntil: 'domcontentloaded' });
  else await page.evaluate(() => document.body.replaceChildren());
  expect(await render()).toBe(width);
});
