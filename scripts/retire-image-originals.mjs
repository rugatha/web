// Removes only manifested, unreferenced originals after fresh cloud read-back.
import { readFile, writeFile, copyFile, mkdtemp, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { root, audit, imageBucket, sha256, publicImageUrl, readableImageObject } from './image-assets.mjs';
import { archiveDescriptor, storageClient, verifyArchive } from './image-original-archive.mjs';

export function retirementPlan(manifest, inventory) {
  if (manifest.bucket !== imageBucket || !manifest.images?.length) throw new Error('Invalid manifest');
  const seen = new Set();
  return manifest.images.map(image => {
    const expected = archiveDescriptor(image);
    const saved = image.original.archive;
    if (!saved || saved.object !== expected.object || saved.sha256 !== expected.sha256 || saved.bytes !== expected.bytes || !/^\d+$/.test(saved.generation || '')) throw new Error(`Durable archive missing: ${image.source}`);
    if (seen.has(image.source)) throw new Error('Duplicate retirement source');
    seen.add(image.source);
    if (Object.keys(image.variants || {}).sort().join(',') !== 'reading,thumb') throw new Error(`Both public variants are required: ${image.source}`);
    for (const [name, variant] of Object.entries(image.variants)) {
      if (!/^[a-f0-9]{64}$/.test(variant.sha256) || ![`public-images/${image.category}/${image.id}/${variant.sha256}/${name}.webp`, readableImageObject(image.category, image.id, variant.sha256, name)].includes(variant.object) || variant.url !== publicImageUrl(imageBucket, variant.object) || !Number.isSafeInteger(variant.bytes) || variant.bytes <= 0) throw new Error(`Invalid public variant: ${image.source}`);
    }
    const local = inventory.images.find(item => item.source === image.source);
    if (!local || local.sha256 !== image.original.sha256 || local.bytes !== image.original.bytes) throw new Error(`Original changed or absent: ${image.source}`);
    if (local.references.length) throw new Error(`Live references remain: ${image.source}`);
    return image;
  });
}

export async function retireOriginals(manifestPath, apply = false) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const temporary = await mkdtemp(join(tmpdir(), 'rugatha-image-retirement-'));
  const inventoryPath = join(temporary, 'inventory.json');
  // Reuse only hash-matching dimensions; references are always freshly scanned.
  await copyFile(join(root, 'docs/image-migration/inventory.json'), inventoryPath);
  const inventory = await audit(inventoryPath);
  const images = retirementPlan(manifest, inventory);
  if (!apply) return { mode: 'dry-run', count: images.length, bytes: images.reduce((sum, image) => sum + image.original.bytes, 0), liveReferences: 0 };
  const client = await storageClient();
  const archived = [];
  for (const image of images) {
    const result = await verifyArchive(client, image);
    archived.push({ source: image.source, sha256: image.original.sha256, bytes: image.original.bytes, archive: result.archive });
    for (const [name, variant] of Object.entries(image.variants)) {
      if (!['thumb', 'reading'].includes(name) || !/^[a-f0-9]{64}$/.test(variant.sha256) || ![`public-images/${image.category}/${image.id}/${variant.sha256}/${name}.webp`, readableImageObject(image.category, image.id, variant.sha256, name)].includes(variant.object) || variant.url !== publicImageUrl(imageBucket, variant.object)) throw new Error('Unexpected public variant');
      const response = await fetch(variant.url, { headers: { Origin: 'https://rugatha.com' } });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok || bytes.length !== variant.bytes || sha256(bytes) !== variant.sha256 || response.headers.get('cache-control') !== variant.cacheControl || !response.headers.get('content-type')?.startsWith('image/webp')) throw new Error(`Public variant verification failed: ${variant.object}`);
    }
  }
  // No deletions until all cloud copies and all current local hashes pass.
  for (const image of images) if (sha256(await readFile(join(root, image.source))) !== image.original.sha256) throw new Error(`Original changed during verification: ${image.source}`);
  const batch = String(manifest.batch || 'batch').replace(/[^a-zA-Z0-9_-]/g, '-');
  const reportPath = join(root, 'docs/image-migration', `${batch}-${sha256(Buffer.from(JSON.stringify(manifest))).slice(0, 12)}-retirement.json`);
  const report = { checkedAt: new Date().toISOString(), mode: 'verified-before-removal', bucket: imageBucket, count: images.length, bytes: archived.reduce((sum, item) => sum + item.bytes, 0), liveReferences: 0, publicVariantsVerified: images.reduce((sum, image) => sum + Object.keys(image.variants).length, 0), originalUrlPolicy: 'Retire old direct image URLs without redirects, as authorized by the user; pages and share metadata use public immutable variants.', originals: archived, removed: [] };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  const ignorePath = join(root, '.gitignore');
  let ignore = await readFile(ignorePath, 'utf8');
  const patterns = images.map(image => '/' + image.source).filter(pattern => !ignore.split('\n').includes(pattern));
  if (patterns.length) {
    ignore = ignore.trimEnd() + '\n\n# Retired public originals are archived privately in Storage; see pilot-manifest.json.\n' + patterns.join('\n') + '\n';
    await writeFile(ignorePath, ignore);
  }
  for (const image of images) {
    await unlink(join(root, image.source));
    report.removed.push(image.source);
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  }
  report.mode = 'removed-after-cloud-verification';
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  return { reportPath, count: report.removed.length, bytes: report.bytes, liveReferences: 0, publicVariantsVerified: report.publicVariantsVerified };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [manifest, flag] = process.argv.slice(2);
  if (!manifest || (flag && flag !== '--apply')) throw new Error('Usage: node scripts/retire-image-originals.mjs manifest.json [--apply]');
  console.log(JSON.stringify(await retireOriginals(manifest, flag === '--apply'), null, 2));
}
