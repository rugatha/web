import { test, expect } from '@playwright/test';

const base = 'http://127.0.0.1:8765';
const legacyKey = 'rugatha.phb.spellbook', guestKey = 'rugatha.phb.spellbook.guest.v1';
const counter = 'http://127.0.0.1:8080/v1/projects/demo-rugatha/databases/(default)/documents/system/memberNumbers';
const panel = page => page.locator('#spellbookSync');
const book = page => page.locator('#bookList');
const cards = page => book(page).locator('.book-card');

test('catalog download failure is visible and never falls back to a repository data file', async ({ page, context }) => {
  const paths = [];
  page.on('request', request => paths.push(new URL(request.url()).pathname));
  await context.route('**/__catalog__/spells-phb.json*', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto(`${base}/toolbox/spells/`);
  await expect(page.locator('#loadState')).toContainText('HTTP 503');
  await expect(page.locator('#spellTable')).toBeHidden();
  expect(paths).not.toContain('/toolbox/spells/spells-phb.json');
});

test('catalog references are shared by spells, character sheet and class reference pages', async ({ page }) => {
  const paths = [];
  page.on('request', request => paths.push(new URL(request.url()).pathname));
  await page.goto(`${base}/toolbox/character_sheet/`);
  const count = await page.evaluate(async () => { await loadSpellOptions(); return window.sheetOptions.spells.length; });
  expect(count).toBe(361);
  await page.goto(`${base}/toolbox/race_class/`);
  await expect.poll(() => page.evaluate(() => Object.keys(data.classSpells?.classes || {}).length)).toBeGreaterThan(0);
  expect(paths).toContain('/__catalog__/spells-phb.json');
  expect(paths).toContain('/__catalog__/class_spells.json');
  expect(paths).not.toContain('/toolbox/spells/spells-phb.json');
  expect(paths).not.toContain('/toolbox/race_class/class_spells.json');
});

async function open(page, origin = base) {
  await page.addInitScript(() => localStorage.setItem('rugatha-language', 'en'));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(`${origin}/toolbox/spells/`);
  await expect(page.locator('#spellTable')).toBeVisible();
  await expect(panel(page)).not.toContainText('Loading your spellbook');
}
async function viewBook(page) { await page.locator('[data-view="book"]').click(); }
async function login(page, account = 'A') {
  await page.getByRole('button', { name: `登入測試 ${account}`, exact: true }).click();
  await expect(panel(page)).toContainText(`Synced (spellbook-${account.toLowerCase()}@example.test)`);
}
async function add(page, name) {
  await page.locator('#bookSearchInput').fill(name);
  const result = page.locator('#bookSearchResults [data-book-add]').filter({ has: page.getByText(name, { exact: true }) });
  await result.first().click();
  await expect(book(page)).toContainText(name);
}
async function synced(page) { await expect(panel(page)).toContainText('Synced'); }
async function seedLegacy(page, ids = ['Aid', 'Fireball', 'Unrecognized test spell']) {
  await page.evaluate(({ key, ids }) => {
    localStorage.setItem(key, JSON.stringify(ids));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, { key: legacyKey, ids });
}
async function importBook(page) {
  await panel(page).getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(panel(page).getByRole('button', { name: 'Confirm import', exact: true })).toHaveCount(0);
  await synced(page);
}
async function receipt(page) {
  return page.evaluate(() => localStorage.getItem(`rugatha.phb.spellbook.import.v1.${window.spellbookTest.auth.currentUser.uid}`));
}
async function clear(page) {
  await page.locator('#clearBookButton').click();
  await expect(cards(page)).toHaveCount(0);
}

async function isolatedContext(browser) {
  const context = await browser.newContext(); await localRequestsOnly(context); return context;
}
async function localRequestsOnly(context) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort('blockedbyclient');
  });
}

test.beforeEach(async ({ request, context }) => {
  await localRequestsOnly(context);
  await request.delete('http://127.0.0.1:8080/emulator/v1/projects/demo-rugatha/databases/(default)/documents');
  await request.delete('http://127.0.0.1:9099/emulator/v1/projects/demo-rugatha/accounts');
  await request.patch(counter, { headers: { Authorization: 'Bearer owner' }, data: {
    fields: { lastAllocated: { integerValue: '0' }, updatedAt: { timestampValue: '2026-10-18T00:00:00Z' } }
  } });
});

test('guest adds, removes, clears and reloads without changing the legacy backup', async ({ page }) => {
  await open(page); await viewBook(page);
  await add(page, 'Acid Splash');
  await page.reload(); await expect(panel(page)).toContainText('Guest spellbook'); await viewBook(page);
  await expect(book(page)).toContainText('Acid Splash');
  await book(page).getByRole('button', { name: 'Remove spell', exact: true }).click();
  await expect(cards(page)).toHaveCount(0);
  await add(page, 'Fireball'); await clear(page);
  await page.reload(); await viewBook(page); await expect(cards(page)).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), legacyKey)).toBeNull();
  expect(await page.evaluate(key => localStorage.getItem(key), guestKey)).toBe('[]');
});

test('new member waits for mapping; cloud add/remove/clear survive reopening', async ({ page, context }) => {
  await open(page); await login(page); await viewBook(page); await add(page, 'Acid Splash'); await synced(page);
  await page.reload(); await synced(page); await viewBook(page);
  await expect(book(page)).toContainText('Acid Splash');
  await book(page).getByRole('button', { name: 'Remove spell' }).click(); await synced(page);
  await add(page, 'Fireball'); await synced(page); await clear(page); await synced(page);
  await page.close();
  const reopened = await context.newPage(); await open(reopened); await synced(reopened); await viewBook(reopened);
  await expect(cards(reopened)).toHaveCount(0);
});

test('explicit import preserves unknown data, deferral and receipt prevent resurrection', async ({ page }) => {
  await open(page); await seedLegacy(page); await login(page); await viewBook(page);
  await expect(panel(page)).toContainText('2 local spells');
  await expect(panel(page)).toContainText('Unrecognized test spell');
  await panel(page).getByRole('button', { name: 'Later', exact: true }).click();
  await expect(cards(page)).toHaveCount(0);
  await page.reload(); await synced(page); await viewBook(page); await importBook(page);
  await expect(cards(page)).toHaveCount(2);
  expect(await receipt(page)).not.toBeNull();
  expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), legacyKey))).toContain('Unrecognized test spell');
  await clear(page); await synced(page); await page.reload(); await synced(page); await viewBook(page);
  await expect(cards(page)).toHaveCount(0);
  await expect(panel(page).getByRole('button', { name: 'Confirm import', exact: true })).toHaveCount(0);
});

test('search, level filters, class view, details and bilingual spellbooks remain usable', async ({ page }) => {
  await open(page);
  await page.locator('#searchInput').fill('Acid Splash');
  await expect(page.locator('#resultCount')).toContainText('1 / 361');
  await page.locator('#spellRows [data-book-add]:visible').click();
  await page.locator('#spellRows [data-toggle]').click();
  await expect(page.locator('.detail-panel')).toContainText('acid');
  await page.locator('#searchInput').fill('');
  await page.locator('#levelFilter').selectOption('3');
  await expect(page.locator('#spellRows')).toContainText('Fireball');
  await page.locator('[data-view="class"]').click();
  await expect(page.locator('.class-card')).toHaveCount(8);
  await page.locator('[data-class-toggle]').first().click();
  await expect(page.locator('.class-card .level-groups').first()).toBeVisible();
  await viewBook(page); await expect(book(page)).toContainText('Acid Splash');
  await page.locator('#bookSearchInput').fill('Light');
  await expect(page.locator('#bookSearchResults small').first()).toHaveText('Light');
  await add(page, 'Light');
  await page.locator('[data-lang-toggle]').click();
  await expect(panel(page)).toContainText('訪客本機法術書');
  await expect(book(page)).toContainText('酸液飛濺');
  await page.locator('[data-lang-toggle]').click();
  await expect(panel(page)).toContainText('Guest spellbook');
});

test('independent device contexts synchronize and concurrent changes preserve both spells', async ({ browser, page }) => {
  const otherContext = await isolatedContext(browser);
  try {
    const other = await otherContext.newPage();
    await open(page); await login(page); await viewBook(page);
    await open(other, 'http://localhost:8765'); await login(other); await viewBook(other);
    await Promise.all([add(page, 'Acid Splash'), add(other, 'Fireball')]);
    await expect(cards(page)).toHaveCount(2); await expect(cards(other)).toHaveCount(2);
    await synced(page); await synced(other);
    await book(other).locator('.book-card').filter({ hasText: 'Acid Splash' }).getByRole('button', { name: 'Remove spell' }).click();
    await expect(book(page)).not.toContainText('Acid Splash'); await expect(cards(page)).toHaveCount(1);
    await page.reload(); await synced(page); await viewBook(page); await expect(cards(page)).toHaveCount(1);
  } finally { await otherContext.close(); }
});

test('same account tabs see remote edits without duplicate initialization or listeners', async ({ context, page }) => {
  await open(page); await login(page); await viewBook(page);
  const tab = await context.newPage(); await open(tab); await synced(tab); await viewBook(tab);
  await add(page, 'Fireball'); await expect(book(tab)).toContainText('Fireball');
  await book(tab).getByRole('button', { name: 'Remove spell' }).click();
  await expect(cards(page)).toHaveCount(0);
  await tab.close();
});

test('account changes never display or submit the previous account queue', async ({ page, context }) => {
  await open(page); await login(page); await viewBook(page); await add(page, 'Fireball'); await synced(page);
  await context.setOffline(true); await add(page, 'Acid Splash');
  await expect(panel(page)).not.toContainText('Synced');
  await context.setOffline(false);
  // Switch while the previous write may still be retrying; its path must remain A's.
  await page.getByRole('button', { name: '登入測試 B', exact: true }).click();
  await expect(panel(page)).toContainText(/Pending changes are retained|Synced.*spellbook-b/);
  const discard = panel(page).getByRole('button', { name: 'Discard pending changes and switch account', exact: true });
  if (await discard.isVisible()) await discard.click();
  await synced(page); await expect(cards(page)).toHaveCount(0);
  await add(page, 'Aid'); await synced(page);
  await login(page, 'A'); await expect(book(page)).toContainText('Fireball');
  await expect(book(page)).not.toContainText('援助術');
  await login(page, 'B'); await expect(cards(page)).toHaveCount(1);
  await expect(book(page)).toContainText('Aid');
});

test('offline writes remain pending, retry on reconnection, and never claim early success', async ({ page, context }) => {
  await open(page); await login(page); await viewBook(page); await add(page, 'Fireball'); await synced(page);
  await context.setOffline(true); await add(page, 'Acid Splash');
  await expect(panel(page)).toContainText(/Pending sync|Sync failed/);
  await expect(panel(page)).not.toContainText('Synced');
  await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await synced(page); await page.reload(); await synced(page); await viewBook(page);
  await expect(cards(page)).toHaveCount(2);
});

test('interrupted imports retain source and safely retry after closing the page', async ({ page, context }) => {
  await open(page); await seedLegacy(page); await login(page); await viewBook(page);
  await context.setOffline(true);
  await panel(page).getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(panel(page)).toContainText(/Pending sync|Sync failed/);
  expect(await receipt(page)).toBeNull();
  await page.close(); await context.setOffline(false);
  const reopened = await context.newPage(); await open(reopened); await synced(reopened); await viewBook(reopened);
  await importBook(reopened); await expect(cards(reopened)).toHaveCount(2);
  expect(await receipt(reopened)).not.toBeNull();
});

test('write pause and kill switch preserve cloud data and never fall back to guest backup', async ({ page }) => {
  await open(page); await seedLegacy(page); await login(page); await viewBook(page);
  await add(page, 'Acid Splash'); await synced(page);
  await page.getByRole('button', { name: '暫停寫入', exact: true }).click();
  await expect(panel(page)).toContainText('Writes paused');
  await expect(page.locator('#clearBookButton')).toBeDisabled();
  await page.getByRole('button', { name: '恢復寫入', exact: true }).click(); await synced(page);
  await page.getByRole('button', { name: '停用同步', exact: true }).click();
  await expect(panel(page)).toContainText('Account sync is disabled');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('#clearBookButton')).toBeDisabled();
  await page.getByRole('button', { name: '啟用同步', exact: true }).click(); await synced(page);
  await expect(cards(page)).toHaveCount(1); await expect(book(page)).toContainText('Acid Splash');
});

test('permission denial reports failure and retains import source until a successful retry', async ({ page, request }) => {
  await open(page); await seedLegacy(page); await login(page); await viewBook(page);
  try {
    await request.post(`${base}/__test__/deny`);
    await panel(page).getByRole('button', { name: 'Confirm import', exact: true }).click();
    await expect(panel(page)).toContainText('Sync failed');
    expect(await receipt(page)).toBeNull();
  } finally { await request.post(`${base}/__test__/restore`); }
  await panel(page).getByRole('button', { name: 'Retry sync', exact: true }).click();
  await synced(page); await expect.poll(() => receipt(page)).not.toBeNull();
  await expect(cards(page)).toHaveCount(2);
});

test('storage failures show a recoverable error without breaking spell search', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.goto('/toolbox/spells/');
  await expect(panel(page)).toContainText('訪客本機法術書');
  await page.locator('[data-view="book"]').click();
  await page.locator('#bookSearchInput').fill('Acid Splash');
  await page.locator('#bookSearchResults [data-book-add]').click();
  await expect(panel(page)).toContainText('本機儲存失敗');
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator('#bookSearchInput')).toBeEnabled();
});

test.describe('mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('import, status, errors and spell controls fit the phone viewport', async ({ page }) => {
    await open(page); await seedLegacy(page); await login(page); await viewBook(page);
    const button = panel(page).getByRole('button', { name: 'Confirm import', exact: true });
    await expect(button).toBeEnabled();
    const bounds = await button.boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    await importBook(page); await expect(cards(page)).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.getByRole('button', { name: '暫停寫入', exact: true }).click();
    await expect(panel(page)).toContainText('Writes paused');
    await expect(page.locator('.auth-status')).not.toContainText('Auth error');
    await page.screenshot({ path: 'test-results/spellbook-mobile.png', fullPage: true });
  });
});

test('PWA upgrade removes legacy caches and a formerly local-only source remains importable', async ({ page }) => {
  await open(page); await seedLegacy(page);
  await page.evaluate(async () => {
    const cache = await caches.open('rugatha-pwa-v21-runtime');
    await cache.put('/toolbox/spells/', new Response('old local-only page'));
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  });
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain('rugatha-pwa-v21-runtime');
  await page.reload(); await login(page); await viewBook(page); await importBook(page);
  await expect(cards(page)).toHaveCount(2);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), legacyKey)).toContain('Unrecognized test spell');
  await page.evaluate(async () => { for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister(); });
});

test('stale same-spell add/remove converges according to the order of server commits', async ({ browser, page, context }) => {
  const otherContext = await isolatedContext(browser);
  try {
    const other = await otherContext.newPage();
    await open(page); await login(page); await viewBook(page);
    await open(other); await login(other); await viewBook(other);
    await context.setOffline(true);
    await add(other, 'Acid Splash'); await synced(other);
    await add(page, 'Acid Splash');
    await book(other).getByRole('button', { name: 'Remove spell' }).click(); await synced(other);
    await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await synced(page); await expect(cards(other)).toHaveCount(1);
    await context.setOffline(true);
    await book(page).getByRole('button', { name: 'Remove spell' }).click();
    await book(other).getByRole('button', { name: 'Remove spell' }).click(); await synced(other);
    await add(other, 'Acid Splash'); await synced(other);
    await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await synced(page); await expect(cards(other)).toHaveCount(0); await expect(cards(page)).toHaveCount(0);
  } finally { await otherContext.close(); }
});

test('simultaneous clear and remote add converge to the server document on both devices', async ({ browser, page, request }) => {
  const otherContext = await isolatedContext(browser);
  try {
    const other = await otherContext.newPage();
    await open(page); await login(page); await viewBook(page); await add(page, 'Aid'); await synced(page);
    await open(other); await login(other); await viewBook(other);
    await Promise.all([page.locator('#clearBookButton').click(), add(other, 'Acid Splash')]);
    await synced(page); await synced(other);
    const uid = await page.evaluate(() => window.spellbookTest.auth.currentUser.uid);
    const root = 'http://127.0.0.1:8080/v1/projects/demo-rugatha/databases/(default)/documents/';
    const mapping = await (await request.get(root + 'memberKeys/' + uid, { headers: { Authorization: 'Bearer owner' } })).json();
    const data = await (await request.get(root + 'members/' + mapping.fields.memberNo.stringValue + '/spellbooks/default', { headers: { Authorization: 'Bearer owner' } })).json();
    const expected = (data.fields.spellIds.arrayValue.values || []).map(item => item.stringValue).sort();
    expect(expected).not.toContain('Aid');
    const selected = current => book(current).locator('[data-book-remove]').evaluateAll(buttons => buttons.map(button => button.dataset.bookRemove).sort());
    await expect.poll(() => selected(page)).toEqual(expected);
    await expect.poll(() => selected(other)).toEqual(expected);
  } finally { await otherContext.close(); }
});

test('expired authentication transitions out of cloud mode without reporting a saved change', async ({ page }) => {
  await open(page); await login(page); await viewBook(page); await add(page, 'Acid Splash'); await synced(page);
  const expiredToken = '**/securetoken.googleapis.com/**';
  await page.route(expiredToken, route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: { code: 400, message: 'TOKEN_EXPIRED' } }) }));
  await page.evaluate(async () => { try { await window.spellbookTest.auth.currentUser.getIdToken(true); } catch {} });
  await expect(panel(page)).toContainText('Guest spellbook');
  await expect(book(page)).not.toContainText('Acid Splash');
  await page.unroute(expiredToken); await login(page); await expect(book(page)).toContainText('Acid Splash');
});

test('allowlisted rollout enables A while B receives an explicit disabled state', async ({ page }) => {
  await open(page); await login(page); await viewBook(page); await add(page, 'Acid Splash'); await synced(page);
  await page.evaluate(() => {
    window.RUGATHA_FEATURE_FLAGS.spellbookSyncMemberUids = [window.spellbookTest.auth.currentUser.uid];
    window.dispatchEvent(new Event('rugatha:feature-flags-changed'));
  });
  await page.getByRole('button', { name: '登入測試 B', exact: true }).click();
  await expect(panel(page)).toContainText('Account sync is disabled'); await expect(cards(page)).toHaveCount(0);
  await login(page); await expect(book(page)).toContainText('Acid Splash');
});

test('legacy writers in another tab trigger another explicit import without auto-merging', async ({ page, context }) => {
  await open(page); await seedLegacy(page, ['Aid']); await login(page); await viewBook(page); await importBook(page);
  const oldWriter = await context.newPage(); await oldWriter.goto('/__test__/legacy.html');
  await oldWriter.evaluate(key => localStorage.setItem(key, JSON.stringify(['Aid', 'Fireball'])), legacyKey);
  await expect(panel(page)).toContainText('2 local spells');
  await expect(cards(page)).toHaveCount(1);
  await importBook(page); await expect(cards(page)).toHaveCount(2);
  await oldWriter.close();
});

test('cloud spellbooks coexist with member, bookmark, QA and character modules', async ({ page }) => {
  await open(page); await login(page); await viewBook(page); await add(page, 'Acid Splash'); await synced(page);
  const result = await page.evaluate(async () => {
    const database = await import('/shared/firebase-data.js');
    const characters = await import('/shared/character-sheets.js');
    const { app, auth, db } = window.spellbookTest, uid = auth.currentUser.uid;
    const member = await database.get(database.ref(db, `members/${uid}`));
    const bookmarkRef = database.ref(db, `members/${uid}/bookmarks/browser-regression`);
    await database.set(bookmarkRef, { path: 'npc/test.html', title: 'Browser regression', savedAt: new Date().toISOString() });
    const bookmark = await database.get(bookmarkRef);
    await database.remove(bookmarkRef);
    const qa = await database.submitQaChoice(db, uid, 'npc/browser-regression.html', 'C1');
    const stats = await database.getQaStats(db, 'npc/browser-regression.html');
    await characters.saveCharacterSheet({ app, user: auth.currentUser, characterName: 'Browser regression', sheetData: { class1: 'Wizard', race: 'Human' } });
    const listed = await characters.listCharacterSheets(app, uid);
    const loaded = await characters.loadCharacterSheet(app, uid, listed[0].key);
    await characters.deleteCharacterSheet({ app, user: auth.currentUser, characterKey: listed[0].key });
    return { member: member.exists(), bookmark: bookmark.exists(), qa, total: stats.total,
      character: loaded.characterName, remainingCharacters: (await characters.listCharacterSheets(app, uid)).length };
  });
  expect(result).toEqual({ member: true, bookmark: true, qa: true, total: 1, character: 'Browser regression', remainingCharacters: 0 });
  await expect(book(page)).toContainText('Acid Splash'); await synced(page);
});

test('offline import account change cancels A receipt and never imports into B', async ({ page, context }) => {
  await open(page); await login(page, 'B');
  await page.evaluate(() => { window.spellbookTest.savedB = window.spellbookTest.auth.currentUser; });
  await login(page, 'A'); await viewBook(page); await seedLegacy(page, ['Aid', 'Fireball']);
  const owner = await page.evaluate(() => window.spellbookTest.auth.currentUser.uid);
  await context.setOffline(true);
  await panel(page).getByRole('button', { name: 'Confirm import', exact: true }).click();
  await expect(panel(page)).toContainText(/Pending sync|Sync failed/);
  await page.evaluate(async () => {
    const { updateCurrentUser } = await import('/__firebase__/firebase-auth.js');
    await updateCurrentUser(window.spellbookTest.auth, window.spellbookTest.savedB);
  });
  await expect(panel(page)).toContainText('Pending changes are retained');
  await panel(page).getByRole('button', { name: 'Discard pending changes and switch account', exact: true }).click();
  await expect(panel(page)).toContainText('spellbook-b@example.test'); await expect(cards(page)).toHaveCount(0);
  await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online'))); await synced(page);
  expect(await receipt(page)).toBeNull();
  expect(await page.evaluate(uid => localStorage.getItem(`rugatha.phb.spellbook.import.v1.${uid}`), owner)).toBeNull();
  await expect(cards(page)).toHaveCount(0);
  await login(page, 'A'); await importBook(page); await expect(cards(page)).toHaveCount(2);
});

test('browser storage reads may be unavailable without crashing the spell page', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); }; });
  await page.goto('/toolbox/spells/');
  await expect(page.locator('#spellTable')).toBeVisible();
  await expect(panel(page)).toContainText('本機儲存無法使用');
  await page.locator('#searchInput').fill('Acid Splash');
  await expect(page.locator('#resultCount')).toContainText('1 / 361');
});

test('a paused offline queue waits for re-enable before committing its retained changes', async ({ page, context, request }) => {
  await open(page); await login(page); await viewBook(page); await add(page, 'Fireball'); await synced(page);
  await context.setOffline(true); await add(page, 'Acid Splash');
  await page.getByRole('button', { name: '暫停寫入', exact: true }).click();
  await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(panel(page)).toContainText('Writes paused');
  await expect(page.locator('#clearBookButton')).toBeDisabled();
  const uid = await page.evaluate(() => window.spellbookTest.auth.currentUser.uid);
  const root = 'http://127.0.0.1:8080/v1/projects/demo-rugatha/databases/(default)/documents/';
  const mapping = await (await request.get(root + 'memberKeys/' + uid, { headers: { Authorization: 'Bearer owner' } })).json();
  const cloud = await (await request.get(root + 'members/' + mapping.fields.memberNo.stringValue + '/spellbooks/default', { headers: { Authorization: 'Bearer owner' } })).json();
  expect(cloud.fields.spellIds.arrayValue.values.map(item => item.stringValue)).toEqual(['Fireball']);
  await page.getByRole('button', { name: '恢復寫入', exact: true }).click(); await synced(page);
  await page.reload(); await synced(page); await viewBook(page); await expect(cards(page)).toHaveCount(2);
});

test('concurrent shared member initializers allocate once without a false auth error', async ({ page }) => {
  await page.goto('/__test__/member-race.html');
  await page.getByRole('button', { name: '登入測試 A', exact: true }).click();
  await expect(page.locator('output')).toContainText('OK: 登入測試 A');
  const result = await page.evaluate(async () => {
    const data = await import('/shared/firebase-data.js');
    const { db, auth } = window.spellbookTest;
    const members = await Promise.all(Array.from({ length: 10 }, () => data.ensureMemberDocument(db, auth.currentUser)));
    const counter = await data.get(data.ref(db, 'members_meta/memberNoCounter'));
    return { numbers: [...new Set(members.map(member => member.memberNo))], counter: counter.val() };
  });
  expect(result).toEqual({ numbers: ['0000-0001'], counter: 1 });
});

test('another tab finishing registration after a stale counter read is recovered safely', async ({ browser, page }) => {
  const otherContext = await isolatedContext(browser);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  try {
    const other = await otherContext.newPage();
    for (const current of [page, other]) {
      await current.goto('/__test__/member-race.html');
      await current.getByRole('button', { name: '登入測試 A', exact: true }).click();
      await expect(current.locator('output')).toContainText('OK: 登入測試 A');
    }
    let reached;
    const readingDestination = new Promise(resolve => { reached = resolve; });
    await page.route('**/documents:batchGet*', async route => {
      if (route.request().postData()?.includes('members/0000-0001')) { reached(); await gate; }
      await route.continue();
    });
    const initialize = current => current.evaluate(async () => {
      const { ensureMemberDocument } = await import('/shared/firebase-data.js');
      return (await ensureMemberDocument(window.spellbookTest.db, window.spellbookTest.auth.currentUser)).memberNo;
    });
    const first = initialize(page);
    await readingDestination;
    const second = await initialize(other);
    release();
    expect([await first, second]).toEqual(['0000-0001', '0000-0001']);
  } finally { release(); await otherContext.close(); }
});
