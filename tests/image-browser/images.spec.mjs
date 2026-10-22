import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const characters = JSON.parse(readFileSync('npc/data/characters.json', 'utf8'));
const alfie = characters.find(npc => npc.id === 'Alfie_Fuller');
const manifest = JSON.parse(readFileSync('docs/image-migration/pilot-manifest.json', 'utf8'));
const oldPaths = new Set(manifest.images.map(image => '/' + image.source));
const production = process.env.RUGATHA_IMAGE_TEST_BASE_URL;
async function startImageWorker(page) {
  if (production) await page.context().route('**/__image-test__/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Image cache acceptance</title>' }));
  await page.goto('/__image-test__/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
}
const renderImage = (page, src) => page.evaluate(async value => {
  const image = new Image(); image.crossOrigin = 'anonymous'; image.src = value;
  document.body.append(image); await image.decode(); return image.naturalWidth;
}, src);
test.beforeEach(async ({ context }) => {
  // Browsers may read the public image endpoint only. Auth, analytics and all
  // production databases are blocked, regardless of current user login state.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET') return route.abort();
    if (url.hostname === '127.0.0.1') return route.continue();
    if (production && url.origin === new URL(production).origin) return route.continue();
    if (url.origin === 'https://firebasestorage.googleapis.com' && decodeURIComponent(url.pathname).includes('/o/public-images/') && url.search === '?alt=media') return route.continue();
    return route.abort();
  });
});

for (const mobile of [false, true]) {
  test(`pilot pages load public images and list thumbnails (${mobile ? 'mobile' : 'desktop'})`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const failed = [];
    const oldRequests = [];
    page.on('request', request => { if (oldPaths.has(decodeURIComponent(new URL(request.url()).pathname))) oldRequests.push(request.url()); });
    page.on('response', response => { if (response.url().includes('/o/public-images') && !response.ok()) failed.push(response.url()); });
    await page.goto('/campaigns/pages/rugatha/rugatha-c01/');
    const cover = page.locator('[data-role="arc-image"]');
    await expect(cover).toHaveAttribute('src', /public-images/);
    await expect.poll(() => cover.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.locator('.chapter-list__image')).toHaveCount(7);
    await expect(page.locator('.chapter-list__image').first()).toHaveAttribute('src', /thumb\.webp/);
    for (let chapter = 1; chapter <= 7; chapter++) {
      await page.goto(`/campaigns/pages/rugatha/rugatha-c01/chpt0${chapter}.html`);
      const hero = page.locator('img[src*="public-images%2Fchapters"]').first();
      await expect.poll(() => hero.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await expect(page.locator('[data-role="chapter-content"]')).not.toBeEmpty();
    }
    await page.goto('/npc/npc_page/pages/Alfie_Fuller.html');
    const portrait = page.locator('#npc-portrait');
    await expect(portrait).toHaveAttribute('src', alfie.image);
    await expect.poll(() => portrait.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.goto('/npc/');
    const card = page.locator(`a[href*="Alfie_Fuller"] img`).first();
    await expect(card).toHaveAttribute('src', alfie.imageThumb);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: `test-results/image-browser/image-pilot-${production ? 'production-' : ''}${mobile ? 'mobile' : 'desktop'}.png` });
    expect(failed).toEqual([]);
    expect(oldRequests).toEqual([]);
  });
}

test('real worker caches a CORS image for offline rendering', async ({ page, context }) => {
  await startImageWorker(page);
  const render = src => renderImage(page, src);
  expect(await render(alfie.image)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open('rugatha-pwa-v28-public-images'); return (await cache.keys()).length;
  })).toBeGreaterThan(0);
  if (production) {
    // Cache a controlled document through the real network-first navigation
    // handler, then stop fulfilling it. Offline reload must use Cache Storage.
    await page.reload();
    await expect.poll(() => page.evaluate(async () => !!(await (await caches.open('rugatha-pwa-v28-runtime')).match(location.href)))).toBe(true);
    await context.unroute('**/__image-test__/');
  }
  await context.setOffline(true);
  if (production) await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await render(alfie.image)).toBe(manifest.images.find(image => image.entityIds.includes('Alfie_Fuller')).variants.reading.width);
  // This variant was never fetched by the blank test page; offline it uses
  // the small precached site icon instead of a broken image.
  expect(await render(alfie.imageThumb)).toBe(192);
  await context.setOffline(false);
});

test('temporary HTTP failure shows one uncached placeholder and recovers on the next load', async ({ page, context }) => {
  await startImageWorker(page);
  let attempts = 0;
  const fault = route => { attempts++; return route.fulfill({ status: 503, contentType: 'text/plain', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Unavailable' }); };
  await context.route(alfie.image, fault);
  expect(await renderImage(page, alfie.image)).toBe(192);
  expect(attempts).toBe(1);
  expect(await page.evaluate(async src => !!(await (await caches.open('rugatha-pwa-v28-public-images')).match(src)), alfie.image)).toBe(false);
  await context.unroute(alfie.image, fault);
  // Chrome can reuse a decoded image within the same document. The supported
  // retry is the next page load, without a timer or repeated failing requests.
  await page.reload();
  expect(await renderImage(page, alfie.image)).toBe(manifest.images.find(image => image.entityIds.includes('Alfie_Fuller')).variants.reading.width);
});

test('all twenty reading variants have zero additional warm network or metadata requests', async ({ page, context }) => {
  await startImageWorker(page);
  const requests = [];
  context.on('request', request => {
    if (request.serviceWorker() && request.url().startsWith('https://firebasestorage.googleapis.com/')) requests.push(request.url());
  });
  const urls = manifest.images.map(image => image.variants.reading.url);
  const renderBatch = () => page.evaluate(async sources => {
    await Promise.all(sources.map(async source => { const image = new Image(); image.crossOrigin = 'anonymous'; image.src = source; document.body.append(image); await image.decode(); }));
  }, urls);
  const coldStart = Date.now(); await renderBatch(); const coldMs = Date.now() - coldStart;
  await expect.poll(() => page.evaluate(async () => (await (await caches.open('rugatha-pwa-v28-public-images')).keys()).length)).toBe(20);
  const coldRequests = requests.length;
  expect(coldRequests).toBe(20);
  const warmStart = Date.now(); await renderBatch(); const warmMs = Date.now() - warmStart;
  expect(requests.length - coldRequests).toBe(0);
  expect(requests.every(url => urls.includes(url))).toBe(true);
  const reportDirectory = process.env.RUGATHA_IMAGE_REPORT_DIR || join(tmpdir(), 'rugatha-image-acceptance');
  mkdirSync(reportDirectory, { recursive: true });
  writeFileSync(join(reportDirectory, `image-transfer-${production ? 'production' : 'local'}.json`), JSON.stringify({ checkedAt: new Date().toISOString(), images: 20, coldNetworkRequests: coldRequests, warmNetworkRequests: requests.length - coldRequests, metadataRequests: 0, coldMs, warmMs, originalBytesFromManifest: manifest.images.reduce((sum, image) => sum + image.original.bytes, 0), readingBytesFromManifest: manifest.images.reduce((sum, image) => sum + image.variants.reading.bytes, 0), note: 'Bytes are exact manifest payload totals; timings measure this controlled browser run, not a before/after site-wide speed benchmark.' }, null, 2) + '\n');
});

test('all migrated NPC detail pages and anonymous share metadata use the new images', async ({ page, request }) => {
  test.setTimeout(90000);
  const oldRequests = [];
  page.on('request', request => { if (oldPaths.has(decodeURIComponent(new URL(request.url()).pathname))) oldRequests.push(request.url()); });
  for (const npc of characters.filter(npc => manifest.images.some(image => image.entityIds.includes(npc.id)))) {
    const response = await request.get('/' + npc.url);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain(`property="og:image" content="${npc.image}"`);
    expect(html).toContain(`name="twitter:image" content="${npc.image}"`);
    await page.goto('/' + npc.url);
    const portrait = page.locator('#npc-portrait');
    await expect(portrait).toHaveAttribute('src', npc.image);
    await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(portrait).toHaveAttribute('alt', (npc.nameZh || npc.nameEn).trim());
    await page.locator('.language-toggle button').click();
    await expect(portrait).toHaveAttribute('alt', (npc.nameEn || npc.nameZh).trim());
    await page.locator('.language-toggle button').click();
    await expect(portrait).toHaveAttribute('alt', (npc.nameZh || npc.nameEn).trim());
  }
  expect(oldRequests).toEqual([]);
});

test('retired repository image URLs are absent while cloud variants remain available', async ({ request }) => {
  for (const image of manifest.images) {
    const retired = await request.get(`/${encodeURI(image.source)}?image-retirement=20261021`, { headers: { 'Cache-Control': 'no-cache' } });
    expect([404, 410]).toContain(retired.status());
  }
});
