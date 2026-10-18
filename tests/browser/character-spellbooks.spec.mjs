import { test, expect } from '@playwright/test';
const base = 'http://127.0.0.1:8765';
const panel = page => page.locator('#spellbookSync');
const cardPanel = page => page.locator('#characterSpellbook');

test.beforeEach(async ({ request, context }) => {
  await context.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await request.delete('http://127.0.0.1:8080/emulator/v1/projects/demo-rugatha/databases/(default)/documents');
  await request.delete('http://127.0.0.1:9099/emulator/v1/projects/demo-rugatha/accounts');
  await request.patch('http://127.0.0.1:8080/v1/projects/demo-rugatha/databases/(default)/documents/system/memberNumbers', {
    headers: { Authorization: 'Bearer owner' }, data: { fields: { lastAllocated: { integerValue: '0' }, updatedAt: { timestampValue: '2026-10-18T00:00:00Z' } } }
  });
});
async function open(page) {
  await page.addInitScript(() => localStorage.setItem('rugatha-language', 'en'));
  page.on('dialog', dialog => dialog.accept());
  await page.goto(`${base}/toolbox/spells/`);
  await page.getByRole('button', { name: '登入測試 A', exact: true }).click();
  await expect(panel(page)).toContainText('Synced');
}
async function seed(page, names = ['Alpha', 'Beta']) {
  return page.evaluate(async names => {
    const { app, auth } = window.spellbookTest;
    const { saveCharacterSheet } = await import('/shared/character-sheets.js');
    const keys = [];
    for (const characterName of names) keys.push((await saveCharacterSheet({ app, user: auth.currentUser, characterName, sheetData: { characterName } })).key);
    return keys;
  }, names);
}
async function add(page, name) {
  await page.locator('[data-view="book"]').click();
  await page.locator('#bookSearchInput').fill(name);
  await page.locator('#bookSearchResults [data-book-add]').filter({ has: page.getByText(name, { exact: true }) }).first().click();
  await expect(panel(page)).toContainText('Synced');
}
async function select(page, key) {
  await page.locator('#spellbookSelector').selectOption(key);
  await expect(panel(page)).toContainText('Synced');
}

test('personal, A and B books isolate; rename retains ID; same-character pages sync and copy is independent', async ({ page, context }) => {
  await open(page); const [a, b] = await seed(page);
  await add(page, 'Aid');
  await page.reload(); await expect(panel(page)).toContainText('Synced');
  await select(page, a); await expect(page.locator('#bookList')).not.toContainText('Aid');
  await add(page, 'Fireball');
  const other = await context.newPage(); other.on('dialog', dialog => dialog.accept());
  await other.goto(`${base}/toolbox/spells/?character=${encodeURIComponent(a)}`);
  await expect(panel(other)).toContainText('Synced');
  await other.locator('[data-view="book"]').click(); await expect(other.locator('#bookList')).toContainText('Fireball');
  await add(other, 'Mage Hand'); await expect(page.locator('#bookList')).toContainText('Mage Hand');
  await select(page, b); await expect(page.locator('#bookList')).not.toContainText('Fireball');
  await panel(page).getByRole('button', { name: 'Copy personal spells into “Beta”', exact: true }).click();
  await expect(page.locator('#bookList')).toContainText('Aid');
  await add(page, 'Acid Splash'); await select(page, '');
  await expect(page.locator('#bookList')).toContainText('Aid'); await expect(page.locator('#bookList')).not.toContainText('Acid Splash');
  await page.evaluate(async key => {
    const { app, auth } = window.spellbookTest;
    const { saveCharacterSheet } = await import('/shared/character-sheets.js');
    const result = await saveCharacterSheet({ app, user: auth.currentUser, currentKey: key, characterName: 'Renamed', sheetData: {} });
    if (result.key !== key) throw new Error('Rename changed ID');
  }, a);
  await page.reload(); await select(page, a);
  await expect(panel(page)).toContainText('Renamed'); await expect(page.locator('#bookList')).toContainText('Fireball');
});

test('character card shares book, preserves legacy source, exports current book and blocks pending export', async ({ page }) => {
  await open(page); const [key] = await seed(page, ['Card Test']);
  await page.goto(`${base}/toolbox/character_sheet/?character=${encodeURIComponent(key)}`);
  await expect(cardPanel(page)).toContainText('Character spellbook synced');
  await page.locator('.creation-progress a[href="#workflowAdventure"]').click();
  await cardPanel(page).getByRole('combobox').selectOption('Fireball');
  await expect(cardPanel(page)).toContainText('Character spellbook synced');
  await expect(cardPanel(page).locator('li')).toContainText('Fireball');
  await page.locator('.creation-progress a[href="#workflowIdentity"]').click();
  await page.locator('#characterName').fill('Renamed Card');
  await page.locator('#saveCloudButton').click();
  await expect(page.locator('#characterManagerStatus')).toContainText('Saved');
  const saved = await page.evaluate(async key => {
    const { app, auth } = window.spellbookTest;
    const { loadCharacterSheet } = await import('/shared/character-sheets.js');
    const record = await loadCharacterSheet(app, auth.currentUser.uid, key);
    return { data: record.data, book: window.characterSpellbookUI.backup() };
  }, key);
  expect(saved.book.spellIds).toEqual(['Fireball']); expect(saved.data.spellName1).toBeUndefined();
  await page.locator('.creation-progress a[href="#workflowAdventure"]').click();
  await page.getByRole('button', { name: '停止網路', exact: true }).click();
  await cardPanel(page).getByRole('combobox').selectOption('Aid');
  await expect(cardPanel(page)).toContainText('pending');
  expect(await page.evaluate(() => { try { window.characterSpellbookUI.backup(); return 'unexpected'; } catch { return 'blocked'; } })).toBe('blocked');
  await page.getByRole('button', { name: '恢復網路', exact: true }).click();
  await expect(cardPanel(page)).toContainText('Character spellbook synced');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#mobileAddSpellButton')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto(`${base}/toolbox/spells/?character=${encodeURIComponent(key)}`);
  await expect(panel(page)).toContainText('Synced'); await page.locator('[data-view="book"]').click();
  await expect(page.locator('#bookList')).toContainText('Fireball'); await expect(page.locator('#bookList')).toContainText('Aid');
});

test('legacy index migration previews exact pinned source; clear never resurrects old spells', async ({ page }) => {
  await open(page);
  const key = await page.evaluate(async () => {
    const { app, auth } = window.spellbookTest;
    const { saveCharacterSheet } = await import('/shared/character-sheets.js');
    await loadCatalog();
    async function loadCatalog() { await import('/shared/spell-catalog.js'); }
    const catalog = await fetch(window.RUGATHA_SPELL_CATALOG.spellsUrl).then(response => response.json());
    const index = catalog.spell.findIndex(spell => spell.name_en === 'Fireball');
    return (await saveCharacterSheet({ app, user: auth.currentUser, characterName: 'Legacy', sheetData: { spellName1: String(index), spellLevel1: '3', spellRowCount: 1 } })).key;
  });
  await page.goto(`${base}/toolbox/character_sheet/?character=${encodeURIComponent(key)}`);
  await expect(cardPanel(page)).toContainText('Legacy migration preview: Fireball');
  expect(await page.evaluate(() => { try { window.characterSpellbookUI.backup(); return 'unexpected'; } catch (error) { return error.message; } })).toContain('Legacy spells need review');
  await page.locator('.creation-progress a[href="#workflowAdventure"]').click();
  await cardPanel(page).getByRole('button', { name: 'Confirm legacy migration' }).click();
  await expect(cardPanel(page).locator('li')).toContainText('Fireball');
  await cardPanel(page).getByRole('button', { name: 'Clear character spellbook', exact: true }).click();
  await expect(cardPanel(page).locator('li')).toHaveCount(0);
  await expect(cardPanel(page)).toContainText('Character spellbook synced');
  await page.reload(); await expect(cardPanel(page)).toContainText('Character spellbook synced');
  await expect(cardPanel(page).getByRole('button', { name: 'Confirm legacy migration' })).toHaveCount(0);
  await expect(cardPanel(page).locator('li')).toHaveCount(0);
});

test('pending role changes require explicit abandonment and do not reach the next book', async ({ page, context }) => {
  await open(page); const [a, b] = await seed(page);
  await page.reload(); await expect(panel(page)).toContainText('Synced'); await select(page, a);
  await context.setOffline(true);
  await page.locator('[data-view="book"]').click(); await page.locator('#bookSearchInput').fill('Fireball');
  await page.locator('#bookSearchResults [data-book-add]').filter({ has: page.getByText('Fireball', { exact: true }) }).first().click();
  await expect(panel(page)).toContainText(/Pending sync|Sync failed/);
  page.removeAllListeners('dialog'); page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#spellbookSelector').selectOption(b);
  await expect(page.locator('#spellbookSelector')).toHaveValue(a);
  page.once('dialog', dialog => dialog.accept()); await page.locator('#spellbookSelector').selectOption(b);
  await context.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(panel(page)).toContainText('Synced'); await expect(page.locator('#bookList')).not.toContainText('Fireball');
  await select(page, a); await expect(page.locator('#bookList')).not.toContainText('Fireball');
});

test('deleted parent cannot be recreated by stale card saves or spellbook retries', async ({ page, context }) => {
  await open(page); const [key] = await seed(page);
  await page.goto(`${base}/toolbox/spells/?character=${encodeURIComponent(key)}`); await expect(panel(page)).toContainText('Synced'); await add(page, 'Aid');
  const other = await context.newPage();
  await other.goto(`${base}/toolbox/character_sheet/?character=${encodeURIComponent(key)}`);
  await expect(cardPanel(other)).toContainText('Character spellbook synced');
  await page.evaluate(async characterKey => {
    const { app, auth } = window.spellbookTest;
    await (await import('/shared/character-sheets.js')).deleteCharacterSheet({ app, user: auth.currentUser, characterKey });
  }, key);
  await expect(cardPanel(other)).toContainText('failed');
  expect(await other.evaluate(async () => await saveToCloud({ assignDefaultName: true }))).toBe(false);
  const result = await page.evaluate(async key => {
    const { app, auth } = window.spellbookTest;
    return await (await import('/shared/character-sheets.js')).loadCharacterSheet(app, auth.currentUser.uid, key);
  }, key);
  expect(result).toBeNull();
});

test('new unsaved draft has no book; backup import creates an independent character book', async ({ page }) => {
  await open(page); const [key] = await seed(page, ['Original']);
  await page.goto(`${base}/toolbox/character_sheet/?new=1`);
  await expect(cardPanel(page)).toContainText('Save this character to enable its spellbook');
  await expect(cardPanel(page).getByRole('combobox')).toHaveCount(0);
  expect(await page.evaluate(() => { window.characterSpellbookUI.importBackup(undefined, { spellName1: '', spellLevel1: '', spellRowCount: 1 }); return window.characterSpellbookUI.backup(); })).toBeNull();
  await page.evaluate(async () => {
    const data = { format: 'rugatha-character-sheet', version: 2, data: { characterName: 'Imported', characterSpellbook: { schemaVersion: 1, spellIds: ['Fireball'] } } };
    await importConfig(new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' }));
  });
  await expect(cardPanel(page)).toContainText('Character spellbook synced');
  expect(await page.evaluate(() => window.characterSpellbookUI.backup().spellIds)).toEqual(['Fireball']);
  expect(new URL(page.url()).searchParams.get('character')).not.toBe(key);
  await page.goto(`${base}/toolbox/spells/?character=${encodeURIComponent(key)}`);
  await expect(panel(page)).toContainText('Synced'); await page.locator('[data-view="book"]').click();
  await expect(page.locator('#bookList')).not.toContainText('Fireball');
});

test('migration refuses changed source and existing empty book without overwriting either', async ({ page }) => {
  await open(page);
  const errors = await page.evaluate(async () => {
    const { app, auth, db } = window.spellbookTest;
    const { saveCharacterSheet } = await import('/shared/character-sheets.js');
    const { previewCharacterSpells } = await import('/shared/character-spellbook.js');
    const { migrateCharacterSpellbook } = await import('/shared/spellbooks.js');
    const { doc, setDoc, updateDoc, serverTimestamp, getDoc } = await import('/__firebase__/firebase-firestore.js');
    const { resolveMemberKey } = await import('/shared/member-path.js');
    const catalog = await fetch(window.RUGATHA_SPELL_CATALOG.spellsUrl).then(response => response.json());
    const index = catalog.spell.findIndex(spell => spell.name_en === 'Fireball');
    const data = { spellName1: String(index), spellLevel1: '3' };
    const first = await saveCharacterSheet({ app, user: auth.currentUser, characterName: 'Conflict', sheetData: data });
    const preview = previewCharacterSpells(data, catalog.spell, '2026-10-18-v1');
    const key = await resolveMemberKey(db, auth.currentUser.uid);
    const parent = doc(db, 'members', key, 'characters', first.key), book = doc(parent, 'spellbooks', 'default');
    await updateDoc(parent, { data: {}, updatedAt: serverTimestamp() });
    const messages = [];
    try { await migrateCharacterSpellbook({ app, auth, user: auth.currentUser, characterId: first.key, preview }); } catch (error) { messages.push(error.message); }
    await setDoc(book, { schemaVersion: 1, spellIds: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    try { await migrateCharacterSpellbook({ app, auth, user: auth.currentUser, characterId: first.key, preview }); } catch (error) { messages.push(error.message); }
    return { messages, ids: (await getDoc(book)).data().spellIds };
  });
  expect(errors.messages).toHaveLength(2); expect(errors.messages[0]).toContain('舊法術已變更'); expect(errors.messages[1]).toContain('角色書已建立'); expect(errors.ids).toEqual([]);
});

test('legacy IndexedDB login survives migration to the common Auth persistence', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('rugatha-language', 'en'));
  await page.goto(`${base}/__test__/legacy.html`);
  const uid = await page.evaluate(async () => {
    const { initializeApp } = await import('/__firebase__/firebase-app.js');
    const authSDK = await import('/__firebase__/firebase-auth.js');
    const { getFirestore, connectFirestoreEmulator } = await import('/__firebase__/firebase-firestore.js');
    const config = { apiKey: 'demo-key', authDomain: 'demo-rugatha.firebaseapp.com', projectId: 'demo-rugatha', appId: 'demo-app', storageBucket: 'demo-rugatha.appspot.com' };
    window.RUGATHA_FIREBASE_CONFIG = config; window.RUGATHA_FEATURE_FLAGS = { dataWritesEnabled: true };
    const app = initializeApp(config), auth = authSDK.initializeAuth(app, { persistence: authSDK.indexedDBLocalPersistence });
    authSDK.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    const db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080);
    const user = (await authSDK.createUserWithEmailAndPassword(auth, 'legacy-persistence@example.test', 'Emulator-test-only-123')).user;
    await (await import('/shared/firebase-data.js')).ensureMemberDocument(db, user);
    return user.uid;
  });
  await page.goto(`${base}/toolbox/spells/`); await expect(panel(page)).toContainText('Synced');
  expect(await page.evaluate(() => window.spellbookTest.auth.currentUser.uid)).toBe(uid);
});

test('character rollout can restore a disabled card while personal books remain available', async ({ page }) => {
  await open(page); const [key] = await seed(page);
  await add(page, 'Aid'); await page.reload(); await expect(panel(page)).toContainText('Synced');
  await select(page, key); await add(page, 'Fireball');
  await page.route('**/shared/firebase.config.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('characterSpellbooksEnabled:true', 'characterSpellbooksEnabled:false') });
  });
  await page.goto(`${base}/toolbox/character_sheet/?character=${encodeURIComponent(key)}`);
  await expect(cardPanel(page)).toContainText('Character spellbooks are not enabled');
  await page.evaluate(() => { window.RUGATHA_FEATURE_FLAGS.characterSpellbooksEnabled = true; window.dispatchEvent(new Event('rugatha:feature-flags-changed')); });
  await expect(cardPanel(page)).toContainText('Character spellbook synced'); await expect(cardPanel(page).locator('li')).toContainText('Fireball');
  await page.goto(`${base}/toolbox/spells/`); await expect(panel(page)).toContainText('Synced');
  await page.locator('[data-view="book"]').click(); await expect(page.locator('#bookList')).toContainText('Aid'); await expect(page.locator('#bookList')).not.toContainText('Fireball');
});
