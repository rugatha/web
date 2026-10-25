import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const characters = read('npc/data/characters.json');
const framing = read('npc/data/portrait-framing.json');
const published = read('docs/image-migration/npc-current.json');

test('overview framing covers the portrait without empty margins at responsive widths', () => {
  for (const [id, value] of Object.entries(framing)) {
    assert.ok(characters.some(character => character.id === id), id);
    const { zoom, positionX, positionY } = value;
    assert.ok(Number.isFinite(zoom) && zoom >= 1, id);
    for (const position of [positionX, positionY]) {
      assert.ok(Number.isFinite(position) && position >= 0 && position <= 100, id);
      // Cover already fills the frame; scaling at the same origin and object
      // position keeps every edge covered, independent of the source ratio.
      const start = (1 - zoom) * position / 100;
      assert.ok(start <= 0 && start + zoom >= 1 - 1e-10, id);
    }
    assert.equal(value.image, undefined, 'Overview portraits use the shared cloud catalog');
  }
});

test('published NPC portraits have consistent catalog, profile, share and archive references', () => {
  assert.equal(published.images.length, characters.length + 1);
  for (const image of published.images.filter(image => image.role === 'portrait')) {
    const character = characters.find(character => image.entityIds.includes(character.id));
    assert.ok(character);
    assert.equal(character.image, image.variants.reading.url);
    assert.equal(character.imageThumb, image.variants.thumb.url);
    assert.ok(image.original.archive.generation);
    assert.equal(image.original.archive.sha256, image.original.sha256);
    const html = readFileSync(character.url, 'utf8');
    assert.ok(html.includes(`property="og:image" content="${character.image}"`));
    assert.ok(html.includes(`name="twitter:image" content="${character.image}"`));
    assert.ok(html.includes(`id="npc-portrait" src="${character.image}"`));
  }
});

 test('all runtime NPC portraits use retained cloud versions, including the special form', () => {
  for (const c of characters) {
    assert.match(c.image, /^https:\/\/firebasestorage\.googleapis\.com\//);
    assert.match(c.imageThumb, /^https:\/\/firebasestorage\.googleapis\.com\//);
  }
  const alternate = published.images.find(image => image.role === 'alternate');
  assert.ok(alternate);
  for (const file of ['npc/npc_page/assets/scripts.js', 'npc/npc_page/assets/qa.js']) {
    const source = readFileSync(file, 'utf8');
    assert.ok(source.includes(alternate.variants.reading.url));
    assert.ok(source.includes('removeAttribute("srcset")'));
    assert.ok(!source.includes('individual_pics/'));
  }
});
