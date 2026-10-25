import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('characters/index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(source => source.includes('const PC_IMAGES'));

async function preview(characters, ok = true) {
  const collages = Object.fromEntries(['pc', 'npc'].map(type => [type, {
    replaceChildren(...images) { this.images = images; }
  }]));
  vm.runInNewContext(script, {
    document: {
      documentElement: {}, body: { dataset: {} },
      querySelector: selector => collages[selector.includes('"pc"') ? 'pc' : 'npc'],
      querySelectorAll: () => [],
      createElement: () => ({})
    },
    window: {}, navigator: { language: 'zh-TW' },
    localStorage: { getItem: () => null, setItem() {} },
    fetch: async () => ({ ok, json: async () => characters })
  });
  await new Promise(resolve => setImmediate(resolve));
  return collages;
}

test('NPC preview uses published cloud thumbnails without rewriting their URLs', async () => {
  const characters = JSON.parse(readFileSync('npc/data/characters.json', 'utf8'));
  const { npc, pc } = await preview(characters);
  assert.equal(npc.images.length, 5);
  const thumbnails = new Set(characters.map(character => character.imageThumb || character.image));
  for (const image of npc.images) {
    assert.ok(thumbnails.has(image.src), image.src);
    assert.match(image.src, /^https:\/\/firebasestorage\.googleapis\.com\/.+%2Fthumb\.webp\?alt=media$/);
  }
  assert.equal(pc.images.length, 5);
  assert.ok(pc.images.every(image => image.src.startsWith('../pc/pics/')));
});

test('NPC preview supports reading-only, thumbnail-only and legacy relative images', async () => {
  const sources = [
    { image: 'https://example.com/reading.webp?alt=media&token=a%2Fb' },
    { imageThumb: 'https://example.com/thumb.webp?alt=media' },
    { image: 'individual_pics/Dr. Crow.jpeg' },
    { image: '/assets/npc.png' },
    { image: '//example.com/npc.webp' },
    { id: 'no-portrait' }
  ];
  const { npc } = await preview(sources);
  assert.deepEqual(npc.images.map(image => image.src).sort(), [
    sources[0].image, sources[1].imageThumb,
    '../npc/individual_pics/Dr.%20Crow.jpeg', sources[3].image, sources[4].image
  ].sort());
});

test('NPC preview retains its fallback collage when the data request fails', async () => {
  const { npc } = await preview(null, false);
  assert.equal(npc.images.length, 5);
  for (const image of npc.images) {
    const path = new URL(image.src, new URL('../characters/', import.meta.url));
    assert.ok(readFileSync(path).length > 0);
  }
});
