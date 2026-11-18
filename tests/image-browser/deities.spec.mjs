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
    const data = await (await page.request.get('/deities/data/deities.json')).json();
    const portraits = page.locator('.deity-image > img');
    await expect(portraits).toHaveCount(data.length);
    await expect(page.locator('a.deity-card')).toHaveCount(0);
    await expect(page.locator('.deity-logo-slot')).toHaveCount(data.length);
    for (let index = 0; index < data.length; index++) {
      const card = page.locator(`.deity-card[data-deity="${data[index].slug}"]`);
      const portrait = card.locator('.deity-image > img');
      await expect(portrait).toHaveAttribute('loading', 'lazy');
      await expect(portrait).toHaveAttribute('src', data[index].thumbnail || data[index].image);
      await expect(portrait).toHaveAttribute('src', /\.webp(?:\?alt=media)?$/);
      await portrait.scrollIntoViewIfNeeded();
      await expect.poll(() => portrait.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      const size = await portrait.boundingBox();
      expect(size.width).toBeCloseTo(size.height, 0);
      const cardSize = await card.boundingBox();
      expect(size.width).toBeCloseTo(cardSize.width - 2, 0);
      const logoSize = await card.locator('.deity-logo-slot').boundingBox();
      expect(logoSize.x + logoSize.width / 2).toBeCloseTo(cardSize.x + cardSize.width / 2, 0);
    }
    expect(imageRequests.filter(url => data.some(deity => deity.image === url))).toHaveLength(0);
    await page.locator('[data-lang-toggle]').click();
    await expect(page.locator('.deity-name').first()).toHaveText('Trinix');
    await expect(portraits).toHaveCount(data.length);
    await portraits.first().scrollIntoViewIfNeeded();
    await expect.poll(() => portraits.first().evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const width of [1280, 390]) {
  test(`cards flip, retain their size and language state, and navigate to characters at ${width}px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height: 900 });
    const characterRequests = [];
    page.on('request', request => {
      if (/\/(pc_lib|characters\.json)$/.test(new URL(request.url()).pathname)) characterRequests.push(request.url());
    });
    await page.route('**/*', route => {
      const request = route.request();
      if (request.resourceType() === 'script' && new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
      return route.continue();
    });
    await page.goto('/deities/');
    const card = page.locator('.deity-card[data-deity="nessis"]');
    await expect(card).toBeVisible();
    expect(characterRequests).toHaveLength(0);
    await expect(card.locator('.flip-hint svg')).toHaveCount(1);
    await expect(card.locator('.flip-hint')).toHaveText('');
    const size = await card.boundingBox();
    await card.locator('.deity-flip').focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveClass(/is-flipped/);
    await expect(card.locator('.deity-front')).toHaveAttribute('inert', '');
    await expect(card.locator('.deity-back')).not.toHaveAttribute('inert', '');
    await expect(card.locator('.followers-group--pc a')).toHaveCount(3);
    await expect(card.locator('.followers-group--pc h4')).toHaveText('玩家角色');
    await expect(card.locator('.followers-group--npc h4')).toHaveText('非玩家角色');
    await expect(card.locator('a[href="../pc/articles/psyber.html"]')).toContainText('賽柏');
    await expect(card.locator('.followers-group--npc a[href="../npc/npc_page/pages/Py_Par.html"]')).toContainText('派琶');
    expect((await card.boundingBox()).height).toBeCloseTo(size.height, 0);
    await expect(page.locator('.follower-arrow')).toHaveCount(0);
    await expect(card.locator('.followers-content')).not.toContainText('↗');
    await page.locator('[data-lang-toggle]').click();
    await expect(card).toHaveClass(/is-flipped/);
    await expect(card.locator('a[href="../pc/articles/psyber.html"]')).toContainText('Psyber');
    await expect(card.locator('.deity-return')).toHaveText('Back to deity');
    expect(characterRequests).toHaveLength(2);
    await card.locator('.deity-return').click();
    await expect(card).not.toHaveClass(/is-flipped/);
    await expect(card.locator('.deity-flip')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(card).toHaveClass(/is-flipped/);
    await page.keyboard.press('Escape');
    await expect(card).not.toHaveClass(/is-flipped/);
    await card.locator('.deity-flip').click();
    await card.locator('.followers-header').click({ position: { x: 12, y: 12 } });
    await expect(card).not.toHaveClass(/is-flipped/);
    await card.locator('.deity-flip').click();
    // A screenshot after the transform ends also checks that text is not mirrored.
    await expect.poll(() => card.locator('.deity-card-inner').evaluate(el => el.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
    await card.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/image-browser/deities-flipped-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await card.locator('a[href="../pc/articles/psyber.html"]').click();
    await expect(page).toHaveURL(/\/pc\/articles\/psyber\.html$/);
  });
}

test('a failed NPC load on the card back preserves PCs and can be retried', async ({ page, baseURL }) => {
  await page.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'script' && new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
    return route.continue();
  });
  let fail = true;
  await page.route('**/npc/data/characters.json', route => fail ? route.fulfill({status:503,body:'Unavailable'}) : route.continue());
  await page.goto('/deities/');
  const card = page.locator('.deity-card[data-deity="nessis"]');
  await card.locator('.deity-flip').click();
  await expect(card.locator('.followers-group--pc a')).toHaveCount(3);
  await expect(card.locator('.followers-group--npc [role="status"]')).toHaveText('人物資料暫時無法載入。');
  fail = false;
  await card.getByRole('button', {name:'重新載入'}).click();
  await expect(card.locator('.followers-group--npc a').first()).toBeVisible();
  await expect(card.locator('.followers-group--pc a')).toHaveCount(3);
  await expect(card.getByRole('button', {name:'重新載入'})).toHaveCount(0);
});


test('hover lifts and tilts the card while reduced motion keeps it still', async ({ page, baseURL }) => {
  await page.route('**/*', route => {
    const request = route.request();
    if (request.resourceType() === 'script' && new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
    return route.continue();
  });
  await page.goto('/deities/');
  const card = page.locator('.deity-card[data-deity="trinix"]');
  await card.hover();
  await expect.poll(() => card.evaluate(el => getComputedStyle(el).transform)).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => card.evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await card.locator('.deity-flip').click();
  await expect(card).toHaveClass(/is-flipped/);
  await expect(card.locator('.deity-back')).not.toHaveAttribute('inert', '');
});

for (const width of [1280, 390]) {
  test(`long NPC rosters scroll to the final person using ${width === 390 ? 'touch' : 'wheel'}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width === 390,
      isMobile: width === 390
    });
    const page = await context.newPage();
    await page.route('**/*', route => {
      const request = route.request();
      if (request.resourceType() === 'script' && new URL(request.url()).origin !== new URL(baseURL).origin) return route.abort();
      return route.continue();
    });
    await page.goto(`${baseURL}/deities/`);
    const card = page.locator('.deity-card[data-deity="laxthos"]');
    await card.locator('.deity-flip').click();
    await expect(card).toHaveClass(/is-flip-settled/);
    const last = card.locator('.followers-group--npc a').last();
    await expect(last).toHaveAttribute('href', /npc_page/);
    const content = card.locator('.followers-content');
    await card.scrollIntoViewIfNeeded();
    const bounds = await content.boundingBox();
    const headerBefore = await card.locator('.followers-header').boundingBox();
    const pageScroll = await page.evaluate(() => scrollY);
    const scrollRange = await content.evaluate(el => el.scrollHeight - el.clientHeight);
    expect(scrollRange).toBeGreaterThan(300);
    if (width === 390) {
      const cdp = await context.newCDPSession(page);
      for (let swipe = 0; swipe < 6; swipe++) {
        await cdp.send('Input.synthesizeScrollGesture', {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height - 32,
          yDistance: -280,
          speed: 1200,
          gestureSourceType: 'touch',
          preventFling: true
        });
      }
      await cdp.detach();
    } else {
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.wheel(0, 3000);
    }
    await expect.poll(() => content.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(2);
    await expect(card).toHaveClass(/is-flipped/);
    expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
    const headerAfter = await card.locator('.followers-header').boundingBox();
    expect(headerAfter.y).toBeCloseTo(headerBefore.y, 0);
    const lastBounds = await last.boundingBox();
    const contentBounds = await content.boundingBox();
    expect(lastBounds.y).toBeGreaterThanOrEqual(contentBounds.y);
    expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(contentBounds.y + contentBounds.height);
    await page.screenshot({ path: `test-results/image-browser/deities-npc-scrolled-${width}.png` });
    const href = await last.getAttribute('href');
    await last.click();
    await expect(page).toHaveURL(new URL(href, `${baseURL}/deities/`).href);
    await context.close();
  });
}
