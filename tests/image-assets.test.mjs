import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, symlink, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { assetId, referenceCandidates, outsideDirectory, root, npcSourceFor, imageBucket, publicImageUrl, prepare, sha256, imageInfo } from '../scripts/image-assets.mjs';

test('resolve image references including encoded names, nested paths and shared runtime bases', () => {
  assert.deepEqual(referenceCandidates('https://rugatha.com/npc/individual_pics/Alfie%20Fuller.jpeg', 'npc/index.html'), ['npc/individual_pics/Alfie Fuller.jpeg']);
  assert.ok(referenceCandidates('../../../../campaigns/chapter-banners/rugatha-c01-chpt01.png', 'campaigns/pages/rugatha/rugatha-c01/chpt01.html').includes('campaigns/chapter-banners/rugatha-c01-chpt01.png'));
  assert.ok(referenceCandidates('../chapter-banners/rugatha-c01-chpt01.png', 'shared/rugatha.config.js').includes('campaigns/chapter-banners/rugatha-c01-chpt01.png'));
  assert.deepEqual(referenceCandidates('https://example.com/image.png', 'npc/index.html'), []);
});

test('stable asset IDs distinguish names that normalize to the same slug', () => {
  assert.notEqual(assetId('npc/individual_pics/A B.png'), assetId('npc/individual_pics/A-B.png'));
  assert.equal(assetId('npc/individual_pics/A B.png'), assetId('npc/individual_pics/A B.png'));
});

test('pilot preparation retains NPC scope and entity IDs after front-end migration', () => {
  const source = 'npc/individual_pics/Alfie Fuller.jpeg';
  const image = { source, id: assetId(source), category: 'npcs' };
  assert.equal(npcSourceFor({ image: 'individual_pics/Alfie Fuller.jpeg' }, [image]), source);
  assert.equal(npcSourceFor({ image: publicImageUrl(imageBucket, `public-images/npcs/${image.id}/${'a'.repeat(64)}/reading.webp`) }, [image]), source);
  assert.equal(npcSourceFor({ image: 'https://example.com/portrait.jpg' }, [image]), null);
});

test('generated originals cannot be written into repo, including through a symlink', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'image-assets-test-'));
  try {
    await symlink(root, join(temporary, 'repository'));
    await assert.rejects(outsideDirectory(join(temporary, 'repository')), /outside the repository/);
    assert.equal(await outsideDirectory(temporary), temporary.startsWith('/var/') ? `/private${temporary}` : temporary);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('CMYK cover converts to repeatable sRGB variants without modifying its original', {
  skip: process.platform !== 'darwin' ? 'Integration requires macOS ColorSync/sips' : false
}, async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'image-cmyk-test-'));
  try {
    const source = 'campaigns/campaign-banners/lite-c09.jpg';
    const original = await readFile(join(root, source));
    const record = { source, id: assetId(source), category: 'arcs', bytes: original.length,
      sha256: sha256(original), ...imageInfo(join(root, source)) };
    const inventory = join(temporary, 'inventory.json');
    await writeFile(inventory, JSON.stringify({ baselineCommit: 'cmyk-regression', images: [record] }));
    const first = await prepare(inventory, join(temporary, 'batch'), 'all');
    const image = first.images[0];
    assert.equal(image.preprocessing.from, 'CMYK');
    assert.equal(image.preprocessing.to, 'sRGB');
    assert.equal(image.preprocessing.sourceProfile, 'Japan Color 2001 Coated');
    for (const variant of Object.values(image.variants)) {
      const bytes = await readFile(join(temporary, 'batch', 'objects', variant.object));
      assert.equal(sha256(bytes), variant.sha256);
      assert.equal(imageInfo(join(temporary, 'batch', 'objects', variant.object)).format, 'webp');
    }
    const second = await prepare(inventory, join(temporary, 'batch'), 'all');
    assert.deepEqual(second, first);
    assert.deepEqual(await readFile(join(root, source)), original);
    assert.deepEqual(await readFile(join(temporary, 'batch', 'originals', source)), original);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test('source-switch dry-run uses fresh batch references and preserves the old pilot fallback', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'image-reference-snapshot-'));
  try {
    const source = 'campaigns/chapter-banners/lite-c12-chpt04-01.png';
    const baseline = JSON.parse(await readFile(join(root, 'docs/image-migration/inventory.json'), 'utf8'));
    const image = baseline.images.find(item => item.source === source);
    assert.equal(image.references.length, 0); // This illustration was restored after the pilot snapshot.
    const file = 'campaigns/data/chapter-content.json';
    const before = await readFile(join(root, file));
    const manifest = { bucket: imageBucket, images: [{ source, original: { sha256: image.sha256 },
      variants: { reading: { object: 'public-images/chapters/test/' + 'a'.repeat(64) + '/reading.webp' } } }] };
    await writeFile(join(temporary, 'manifest.json'), JSON.stringify(manifest));
    const run = () => JSON.parse(execFileSync(process.execPath,
      [join(root, 'scripts/switch-image-assets.mjs'), temporary], { encoding: 'utf8' }));
    assert.deepEqual(run().files, []);
    await writeFile(join(temporary, 'inventory.json'), JSON.stringify({ images: [{ ...image,
      references: [{ file, value: '../../../../campaigns/chapter-banners/lite-c12-chpt04-01.png' }] }] }));
    assert.deepEqual(run().files, [file]);
    assert.deepEqual(await readFile(join(root, file)), before);
    await assert.rejects(readFile(join(temporary, 'source-changes.json')), { code: 'ENOENT' });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
