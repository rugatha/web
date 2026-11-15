import { test, expect } from '@playwright/test';

const pages = [
  '/', '/characters/', '/campaigns/', '/campaigns/pages/rugatha-plus/plus-c08/',
  '/campaigns/pages/rugatha-plus/plus-c08/chpt01.html',
  '/map/', '/map/location/', '/about-us/', '/pc/', '/pc/articles/al-lon.html', '/npc/',
  '/npc/npc_page/pages/Mafa.html', '/npc/appearance-timeline/',
  '/member/', '/deities/', '/emperors/', '/timeline/', '/relation-graph/',
  '/toolbox/', '/toolbox/weapons/', '/toolbox/armor/', '/toolbox/tools/',
  '/toolbox/packs/', '/toolbox/background/', '/toolbox/feats/',
  '/toolbox/race_class/', '/toolbox/dice_roll/', '/toolbox/character_card/',
  '/campaigns/pages/rugatha-veil/veil_pc_timeline.html', '/template/'
];

test.use({ locale: 'en-US', serviceWorkers: 'block' });
test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', route => {
    const request = route.request();
    if (request.method() !== 'GET' || new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
    return route.continue();
  });
});

test('Chinese is the default even with English browser and conflicting legacy preferences', async ({ page }) => {
  await page.addInitScript(() => {
    for (const key of ['rugatha-home-lang', 'npc-lang', 'characters-lang', 'rugathaCampaignLanguage']) localStorage.setItem(key, 'en');
  });
  for (const path of pages) {
    await page.goto(path, { waitUntil: 'load' });
    await expect(page.locator('[data-lang-toggle], [data-chapter-language-toggle]').first(), path).toHaveAttribute('aria-label', /中文|English/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('rugatha-language')), { message: path }).not.toBe('en');
    await expect(page.locator('html'), path).toHaveAttribute('lang', /^zh/);
  }
});

test('button selection survives cross-page navigation, reload, and a new browser context', async ({ page, browser, baseURL }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await page.locator('[data-lang-toggle]').first().click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('rugatha-language'))).toBe('en');
  for (const path of pages) {
    await page.goto(path, { waitUntil: 'load' });
    await expect(page.locator('html'), path).toHaveAttribute('lang', 'en');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('rugatha-language')), { message: path }).toBe('en');
    // Member controls depend on the Firebase SDK, which this local test blocks.
    if (path !== '/member/') {
      const toggle = page.locator('[data-lang-toggle], [data-chapter-language-toggle]').first();
      await expect(toggle, path).toHaveAttribute('aria-label', /English|Switch to 中文/);
      await toggle.click();
      await expect.poll(() => page.evaluate(() => localStorage.getItem('rugatha-language')), { message: path }).toBe('zh');
      await expect(page.locator('html'), path).toHaveAttribute('lang', /^zh/);
      await toggle.click();
      await expect.poll(() => page.evaluate(() => localStorage.getItem('rugatha-language')), { message: path }).toBe('en');
      await expect(page.locator('html'), path).toHaveAttribute('lang', 'en');
    }
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  const context = await browser.newContext({ baseURL, storageState: await page.context().storageState(), serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(baseURL).origin ? route.continue() : route.abort());
  const reopened = await context.newPage();
  await reopened.goto('/characters/');
  await expect(reopened.locator('html')).toHaveAttribute('lang', 'en');
  await reopened.locator('[data-lang-toggle]').first().click();
  await expect(reopened.locator('html')).toHaveAttribute('lang', /^zh/);
  await reopened.goto('/campaigns/');
  await expect(reopened.locator('html')).toHaveAttribute('lang', /^zh/);
  await expect.poll(() => reopened.evaluate(() => localStorage.getItem('rugatha-language'))).toBe('zh');
  await context.close();
});
