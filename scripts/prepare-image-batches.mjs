// Offline preparation only: no cloud requests and no changes to front-end references.
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { prepare, outsideDirectory, sha256, publicImageUrl, root } from './image-assets.mjs';

const [inventoryPath, outputPath] = process.argv.slice(2);
if (!inventoryPath || !outputPath || process.argv.length !== 4) {
  throw new Error('Usage: node scripts/prepare-image-batches.mjs /outside/current-inventory.json /outside/new-batches');
}
const output = await outsideDirectory(outputPath);
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
const pilot = JSON.parse(await readFile(join(root, 'docs/image-migration/pilot-manifest.json'), 'utf8'));
const published = new Set(pilot.images.map(image => image.source));
const fullResolutionText = new Set([
  'campaigns/chapter-banners/wilds-c05-chpt06_1.jpg',
  'campaigns/chapter-banners/wilds-c05-chpt06_2.jpg',
  'campaigns/chapter-banners/wilds-c05-chpt06_3.jpeg',
  'campaigns/chapter-banners/wilds-c05-chpt06_4.jpeg',
  'campaigns/chapter-banners/wilds-c05-chpt06_5.jpeg'
]);
const summary = [];
for (const category of ['arcs', 'chapters', 'npcs']) {
  const directory = join(output, category);
  // Refuse to replace a previous prepared batch or an interrupted run.
  await mkdir(directory);
  const images = inventory.images.filter(image => image.category === category && !published.has(image.source));
  if (!images.length) throw new Error(`Empty remaining category: ${category}`);
  const snapshot = { ...inventory, images, summary: { [category]: { count: images.length, bytes: images.reduce((n, i) => n + i.bytes, 0) } } };
  await writeFile(join(directory, 'inventory.json'), JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`Preparing ${category}: ${images.length} originals`);
  const manifest = await prepare(join(directory, 'inventory.json'), directory, 'all');
  for (const image of manifest.images.filter(image => fullResolutionText.has(image.source))) {
    const old = image.variants.reading;
    const temporary = join(directory, `${image.id}-full-resolution.webp`);
    execFileSync('cwebp', ['-quiet', '-lossless', '-exact', '-m', '6', '-metadata', 'icc',
      join(directory, 'originals', image.source), '-o', temporary]);
    const bytes = await readFile(temporary);
    const digest = sha256(bytes);
    const object = `public-images/${category}/${image.id}/${digest}/reading.webp`;
    const target = join(directory, 'objects', object);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes);
    await unlink(temporary);
    if (old.object !== object) await unlink(join(directory, 'objects', old.object));
    image.variants.reading = { ...old, object, url: publicImageUrl(manifest.bucket, object), sha256: digest,
      bytes: bytes.length, width: image.original.width, height: image.original.height };
    image.readingPolicy = { lossless: true, originalDimensions: true,
      reason: 'Letter text: preserve full resolution for zoomed reading.' };
  }
  manifest.preparation = { mode: 'offline', category, inventoryPath: 'inventory.json',
    note: 'URLs are planned only; objects are not uploaded. Text readingPolicy overrides the default reading encoder. The switch tool reads this batch inventory snapshot; refresh it and review reference changes again before any future source switch.' };
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const validation = JSON.parse(execFileSync(process.execPath,
    [join(root, 'scripts/publish-image-assets.mjs'), directory], { encoding: 'utf8' }));
  const record = { category, images: manifest.images.length, objects: validation.objects,
    originalBytes: manifest.images.reduce((n, i) => n + i.original.bytes, 0),
    thumbBytes: manifest.images.reduce((n, i) => n + i.variants.thumb.bytes, 0),
    readingBytes: manifest.images.reduce((n, i) => n + i.variants.reading.bytes, 0),
    fullResolutionText: manifest.images.filter(i => i.readingPolicy).map(i => i.source),
    missingEntityIds: manifest.images.filter(i => !i.entityIds.length).map(i => i.source), validation };
  summary.push(record);
  await writeFile(join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(JSON.stringify(record));
}
await writeFile(join(output, 'source-inventory.json'), await readFile(resolve(inventoryPath)));
