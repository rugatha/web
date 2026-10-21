import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveDescriptor } from '../scripts/image-original-archive.mjs';
import { retirementPlan } from '../scripts/retire-image-originals.mjs';
import { assetId, imageBucket, publicImageUrl } from '../scripts/image-assets.mjs';

function fixture() {
  const source = 'campaigns/campaign-banners/rugatha-c01.jpg';
  const image = { source, id: assetId(source), category: 'arcs', original: { sha256: 'a'.repeat(64), bytes: 10 } };
  image.original.archive = { ...archiveDescriptor(image), generation: '123' };
  image.variants = Object.fromEntries(['thumb', 'reading'].map(name => {
    const object = `public-images/${image.category}/${image.id}/${'b'.repeat(64)}/${name}.webp`;
    return [name, { object, sha256: 'b'.repeat(64), bytes: 10, url: publicImageUrl(imageBucket, object) }];
  }));
  return {
    image, manifest: { bucket: imageBucket, images: [image] },
    inventory: { images: [{ source, sha256: image.original.sha256, bytes: 10, references: [] }] }
  };
}

test('retirement rejects any referenced or changed original and missing durable backup', () => {
  const { image, manifest, inventory } = fixture();
  assert.equal(retirementPlan(manifest, inventory).length, 1);
  inventory.images[0].references.push({ file: 'index.html', line: 1 });
  assert.throws(() => retirementPlan(manifest, inventory), /Live references/);
  inventory.images[0].references = [];
  inventory.images[0].sha256 = 'b'.repeat(64);
  assert.throws(() => retirementPlan(manifest, inventory), /changed or absent/);
  inventory.images[0].sha256 = image.original.sha256;
  delete image.original.archive;
  assert.throws(() => retirementPlan(manifest, inventory), /Durable archive missing/);
});

test('retirement refuses unknown buckets, duplicate paths and mismatched archive paths', () => {
  const { image, manifest, inventory } = fixture();
  assert.throws(() => retirementPlan({ ...manifest, bucket: 'other' }, inventory), /Invalid manifest/);
  manifest.images.push(image);
  assert.throws(() => retirementPlan(manifest, inventory), /Duplicate retirement/);
  manifest.images.pop();
  image.original.archive.object = 'image-originals/unrelated';
  assert.throws(() => retirementPlan(manifest, inventory), /Durable archive missing/);
});

test('original archives cannot target unrelated files or escape the image categories', () => {
  const { image } = fixture();
  assert.throws(() => archiveDescriptor({ ...image, source: 'package.json' }), /Invalid original/);
  assert.throws(() => archiveDescriptor({ ...image, source: 'campaigns/campaign-banners/../../private.jpg' }), /Invalid original/);
  assert.throws(() => archiveDescriptor({ ...image, id: 'another-id' }), /Invalid original/);
});

test('retirement refuses missing or redirected public variants before any deletion', () => {
  const { image, manifest, inventory } = fixture();
  image.variants.reading.url = 'https://example.com/other.webp';
  assert.throws(() => retirementPlan(manifest, inventory), /Invalid public variant/);
  delete image.variants.reading;
  assert.throws(() => retirementPlan(manifest, inventory), /Both public variants/);
});
