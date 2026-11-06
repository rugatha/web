import test from 'node:test';
import assert from 'node:assert/strict';
import { descriptor } from '../scripts/site-image-assets.mjs';

test('site migration rejects excluded website assets, working files and traversal', () => {
  for (const source of ['assets/banner/banner.png', 'campaigns/campaign-logos/logo.jpg', 'species/assets/portrait/elf.png', 'pc/pics/../../assets/one.png', 'tests/fixtures/images/test.jpg']) {
    assert.throws(() => descriptor(source, Buffer.from('image')));
  }
});
test('original public copies and private backups preserve source format and checksum', () => {
  const image = descriptor('pc/pics/Siri Oslee.png', Buffer.from('exact source bytes'));
  assert.equal(image.collection, 'pc-portraits');
  assert.equal(image.bytes, 18);
  assert.match(image.public.object, /^public-images\/site\/pc-portraits\/siri-oslee-[a-f0-9]{10}\/image-[a-f0-9]{8}\.png$/);
  assert.equal(image.public.contentType, 'image/png');
  assert.equal(image.archive.cacheControl, 'private, no-store');
  assert.match(image.archive.object, /^image-originals\/site\//);
});
