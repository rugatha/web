import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`deity cards use full-width square art and centered logo slots at ${viewport.width}px`, async ({ page, baseURL }) => {
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
    await expect(page.locator('a.deity-card, .deity-card a')).toHaveCount(0);
    await expect(page.locator('.deity-logo-slot')).toHaveCount(16);
    const data = await (await page.request.get('/deities/data/deities.json')).json();
    for (let index = 0; index < data.length; index++) {
      const portrait = portraits.nth(index);
      await expect(portrait).toHaveAttribute('loading', 'lazy');
      await expect(portrait).toHaveAttribute('src', /\.webp\?alt=media$/);
      await portrait.scrollIntoViewIfNeeded();
      await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      const size = await portrait.boundingBox();
      expect(size.width).toBeCloseTo(size.height, 0);
      const cardSize = await page.locator('.deity-card').nth(index).boundingBox();
      expect(size.width).toBeCloseTo(cardSize.width - 2, 0);
      const logoSize = await page.locator('.deity-logo-slot').nth(index).boundingBox();
      expect(logoSize.x + logoSize.width / 2).toBeCloseTo(cardSize.x + cardSize.width / 2, 0);
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
