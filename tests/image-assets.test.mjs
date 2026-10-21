import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assetId, referenceCandidates, outsideDirectory, root, npcSourceFor, imageBucket, publicImageUrl } from '../scripts/image-assets.mjs';

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
