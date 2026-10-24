import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { createLocationRenderer } from '../map/scripts/location-render.js';
import { loadLocationChapterCatalog } from '../scripts/location-chapter-catalog.mjs';
const data = JSON.parse(await readFile(new URL('../map/location/assets/location.json', import.meta.url), 'utf8'));
const catalog = await loadLocationChapterCatalog(data);
const realm = data.realms[0];
const ancestors = [{ node: data, href: '/map/location/' }];
const render = (node, language = 'zh') => createLocationRenderer(data, language, catalog).render(node, 1, [realm.slug], ancestors);

test('each related chapter has an existing campaign, arc, chapter and resolved thumbnail', async () => {
  for (const chapter of data.chapters) {
    const metadata = catalog[chapter.id];
    assert.ok(metadata.arc.title_zh && metadata.arc.title_en);
    assert.equal(metadata.campaign.name, chapter.series);
    for (const url of [chapter.url, metadata.arc.url, metadata.campaign.url]) {
      await access(new URL(`..${url}${url.endsWith('/') ? 'index.html' : ''}`, import.meta.url));
    }
    if (metadata.image.startsWith('/')) await access(new URL(`..${metadata.image}`, import.meta.url));
    else assert.match(metadata.image, /^https:\/\/firebasestorage\.googleapis\.com\//);
  }
  assert.match(catalog['rugatha-c01-chpt01'].image, /thumb\.webp/);
});

test('chapters are grouped by campaign and arc, retaining every chapter exactly once', () => {
  const node = { ...realm, chapters: data.chapters };
  const html = render(node);
  assert.equal((html.match(/class="location-campaign"/g) ?? []).length, new Set(data.chapters.map(c => catalog[c.id].campaign.id)).size);
  assert.equal((html.match(/class="location-story-arc"/g) ?? []).length, new Set(data.chapters.map(c => catalog[c.id].arc.id)).size);
  assert.equal((html.match(/class="location-chapter-card"/g) ?? []).length, data.chapters.length);
  assert.equal((html.match(/class="location-chapters__image"/g) ?? []).length, data.chapters.length);
  for (const chapter of data.chapters) assert.equal(html.split(`class="location-chapter-card" href="${chapter.url}"`).length - 1, 1);
});

test('short lists open by default, English arc titles translate, and empty lists retain their message', () => {
  const chapter = data.chapters[0];
  const node = { ...realm, chapters: [chapter] };
  const html = render(node, 'en');
  assert.ok(html.includes(`data-chapter-group="${catalog[chapter.id].campaign.id}" open`));
  assert.ok(html.includes(catalog[chapter.id].arc.title_en));
  assert.ok(html.includes(chapter.title_en));
  assert.ok(render({ ...realm, chapters: [] }).includes('目前尚未收錄以此地為發生地點的章節。'));
});
