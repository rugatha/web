import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const characters = read('npc/data/characters.json');
const framing = read('npc/data/portrait-framing.json');
const published = read('docs/image-migration/npc-portraits-2026-10-25.json');

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
  assert.equal(published.images.length, 3);
  for (const image of published.images) {
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
