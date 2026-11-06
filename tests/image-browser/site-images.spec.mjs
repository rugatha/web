import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('docs/image-migration/site-current.json', 'utf8'));
const production = process.env.RUGATHA_IMAGE_TEST_BASE_URL;
const urlFor = source => manifest.images.find(image => image.source === source).public.url;
test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.abort();
    if (url.origin === new URL(baseURL).origin) return route.continue();
    if (url.origin === 'https://firebasestorage.googleapis.com' && decodeURIComponent(url.pathname).includes('/o/public-images/') && url.search === '?alt=media') return route.continue();
    if (url.origin === 'https://unpkg.com' && url.pathname.startsWith('/leaflet@1.9.4/dist/')) return route.continue();
    return route.abort();
  });
});

test('all original-format site images decode at their original dimensions', async ({ page }) => {
  test.setTimeout(300000);
  if (production) await page.route('**/__image-test__/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Site images acceptance</title>' }));
  await page.goto('/__image-test__/');
  const failed = await page.evaluate(async images => {
    let next = 0; const failed = [];
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < images.length) {
        const item = images[next++], img = new Image(); img.crossOrigin = 'anonymous'; img.src = item.public.url;
        try {
          await img.decode();
          if (!img.naturalWidth || (item.width && img.naturalWidth !== item.width) || (item.height && img.naturalHeight !== item.height)) failed.push(item.source);
        } catch { failed.push(item.source); }
        img.removeAttribute('src');
      }
    }));
    return failed;
  }, manifest.images);
  expect(failed).toEqual([]);
});

for (const width of [1280, 390]) {
  test(`PC lists, profiles, deities, emperors and about page load cloud images at ${width}px`, async ({ page }) => {
    test.setTimeout(180000);
    await page.setViewportSize({ width, height: 900 });
    const retiredRequests = [];
    const oldPaths = new Set(manifest.images.map(image => '/' + image.source));
    page.on('request', request => { if (oldPaths.has(decodeURIComponent(new URL(request.url()).pathname))) retiredRequests.push(request.url()); });
    for (const path of ['/pc/', '/characters/', '/pc/articles/al-lon.html', '/pc/articles/siri-oslee.html', '/deities/pages/trinix.html', '/emperors/', '/about-us/']) {
      await page.goto(path);
      await expect.poll(() => page.locator('img').evaluateAll(images => images.filter(img => img.src.includes('/o/public-images%2Fsite%2F')).length)).toBeGreaterThan(0);
      const images = page.locator('img[src*="/o/public-images%2Fsite%2F"]');
      await images.evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
      await expect.poll(() => images.evaluateAll(images => images.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src)), { timeout: 30000 }).toEqual([]);
      await images.evaluateAll(images => Promise.all(images.map(img => img.decode())));
      const wrongDimensions = await images.evaluateAll((images, manifest) => images.filter(img => {
        const expected = manifest.find(image => image.public.url === img.src);
        return !expected || (expected.width && img.naturalWidth !== expected.width) || (expected.height && img.naturalHeight !== expected.height);
      }).map(img => img.src), manifest.images);
      expect(wrongDimensions).toEqual([]);
      // Characters appearing in multiple campaigns have more than one card.
      if (path === '/pc/') expect(await images.evaluateAll(images => new Set(images.map(img => img.src)).size)).toBe(35);
      if (path === '/pc/') {
        const records = JSON.parse(readFileSync('pc/pc_lib', 'utf8'));
        expect(await images.count()).toBe(records.reduce((sum, record) => sum + record.campaign.length, 0));
      }
      if (path === '/pc/') await page.screenshot({ path: `test-results/image-browser/site-images-pc-${width}.png`, fullPage: true });
      if (path === '/emperors/') expect(await images.count()).toBe(8);
      if (path.includes('/pc/articles/')) await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /public-images%2Fsite%2Fpc-portraits/);
    }
    await page.screenshot({ path: `test-results/image-browser/site-images-about-${width}.png`, fullPage: true });
    expect(retiredRequests).toEqual([]);
  });
}

test('interactive map uses the full-resolution cloud original', async ({ page }) => {
  await page.goto('/map/map/');
  const map = page.locator('.leaflet-image-layer');
  await expect(map).toHaveAttribute('src', urlFor('map/assets/dranison-map.jpg'));
  await expect.poll(() => map.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.locator('.leaflet-control-zoom-in').click();
  await page.screenshot({ path: 'test-results/image-browser/site-images-map.png' });
});

test('a full-resolution PC three-view survives a true offline reload', async ({ page, context, baseURL }) => {
  if (production) await context.route('**/__image-test__/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>PC art offline acceptance</title>' }));
  await page.goto('/__image-test__/');
  const script = await page.evaluate(async () => (await fetch('/sw.js')).text());
  const version = script.match(/const CACHE_VERSION = "([^"]+)";/)[1];
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js'); await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  const url = urlFor('pc/three_views/Al-lon.png');
  const render = () => page.evaluate(async url => { const image = new Image(); image.crossOrigin = 'anonymous'; image.src = url; document.body.append(image); await image.decode(); return image.naturalWidth; }, url);
  const width = await render(); expect(width).toBeGreaterThan(1000);
  await expect.poll(() => page.evaluate(async ({ name, url }) => !!(await (await caches.open(name)).match(url)), { name: `${version}-public-images`, url })).toBe(true);
  const fullReload = production || !['127.0.0.1', 'localhost', '::1'].includes(new URL(baseURL).hostname);
  if (fullReload) {
    await page.reload();
    await expect.poll(() => page.evaluate(async name => !!(await (await caches.open(name)).match(location.href)), `${version}-runtime`)).toBe(true);
    if (production) await context.unroute('**/__image-test__/');
  }
  await context.setOffline(true);
  if (fullReload) await page.reload({ waitUntil: 'domcontentloaded' });
  else await page.evaluate(() => document.body.replaceChildren());
  expect(await render()).toBe(width);
});

test('member card catalog references only published bilingual cards', async ({ request }) => {
  const path = !production && process.env.RUGATHA_IMAGE_TEST_HTTPS === '1' ? 'https://127.0.0.1:8767/member/index.html' : '/member/index.html';
  const html = await (await request.get(path)).text();
  const literal = html.match(/const characterCardCatalog = (\[[\s\S]*?\n    \]);/)[1];
  const cards = Function(`return (${literal});`)();
  expect(cards).toHaveLength(16);
  for (const card of cards) for (const language of ['en', 'zh']) expect(manifest.images.some(image => image.collection === 'pc-cards' && image.public.url === card[language])).toBe(true);
  expect(html).not.toContain('`../pc/assets/${fileName}`');
});
