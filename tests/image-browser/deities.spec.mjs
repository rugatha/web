import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`deity cards use small, lazy portraits at ${viewport.width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize(viewport);
    // Auth and analytics are unrelated to this public gallery.
    await page.route('**/*', route => {
      const request = route.request();
      if (request.resourceType() === 'script' && new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
      return route.continue();
    });
    const imageRequests = [];
    page.on('request', request => {
      if (request.resourceType() === 'image') imageRequests.push(request.url());
    });
    await page.goto('/deities/index.html');
    const portraits = page.locator('.deity-image > img');
    await expect(portraits).toHaveCount(16);
    const data = await (await page.request.get('/deities/data/deities.json')).json();
    for (let index = 0; index < data.length; index++) {
      const portrait = portraits.nth(index);
      await expect(portrait).toHaveAttribute('loading', 'lazy');
      await expect(portrait).toHaveAttribute('src', /\.webp\?alt=media$/);
      await portrait.scrollIntoViewIfNeeded();
      await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      const size = await portrait.boundingBox();
      expect(size.width).toBe(160);
      expect(size.height).toBe(160);
    }
    expect(imageRequests.filter(url => data.some(deity => deity.image === url))).toHaveLength(0);
    await page.locator('[data-lang-toggle]').click();
    await expect(page.locator('.deity-name').first()).toHaveText('Trinix');
    await expect(portraits).toHaveCount(16);
    await portraits.first().scrollIntoViewIfNeeded();
    await expect.poll(() => portraits.first().evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
