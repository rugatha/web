import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const characters = JSON.parse(readFileSync('npc/data/characters.json', 'utf8'));
const alfie = characters.find(npc => npc.id === 'Alfie_Fuller');
const manifest = JSON.parse(readFileSync('docs/image-migration/pilot-manifest.json', 'utf8'));
const oldPaths = new Set(manifest.images.map(image => '/' + image.source));
const production = process.env.RUGATHA_IMAGE_TEST_BASE_URL;
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
    await page.screenshot({ path: `test-results/image-pilot-${production ? 'production-' : ''}${mobile ? 'mobile' : 'desktop'}.png` });
    expect(failed).toEqual([]);
    expect(oldRequests).toEqual([]);
  });
}

test('real worker caches a CORS image for offline rendering', async ({ page, context }) => {
  if (production) await page.route('**/__image-test__/', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Image cache acceptance</title>' }));
  await page.goto('/__image-test__/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  const render = src => page.evaluate(async value => {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.src = value;
    document.body.append(image); await image.decode(); return image.naturalWidth;
  }, src);
  expect(await render(alfie.image)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open('rugatha-pwa-v26-public-images'); return (await cache.keys()).length;
  })).toBeGreaterThan(0);
  await context.setOffline(true);
  expect(await render(alfie.image)).toBeGreaterThan(0);
  // This variant was never fetched by the blank test page; offline it uses
  // the small precached site icon instead of a broken image.
  expect(await render(alfie.imageThumb)).toBe(192);
  await context.setOffline(false);
});
