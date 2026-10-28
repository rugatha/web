import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root, imageBucket, publicImageUrl } from './image-assets.mjs';

const [planPath, inventoryPath] = process.argv.slice(2);
if (!planPath || !inventoryPath) throw Error('Usage: node scripts/update-readable-image-manifests.mjs plan.json new-inventory.json');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
const mapped = new Map(plan.items.map(item => [item.from, item.to]));
const current = new Map(inventory.map(item => [item.name, item]));
const files = [
  'docs/image-migration/uploaded-2026-10-22/arcs-manifest.json',
  'docs/image-migration/uploaded-2026-10-22/chapters-manifest.json',
  'docs/image-migration/npc-current.json'
];
for (const file of files) {
  const path = join(root, file);
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  if (manifest.bucket !== imageBucket) throw Error(`Unreviewed bucket: ${file}`);
  for (const image of manifest.images) {
    const original = image.original.archive;
    const newOriginal = mapped.get(original.object) || (current.has(original.object) ? original.object : null);
    if (!newOriginal || !current.has(newOriginal)) throw Error(`Missing original copy in ${file}: ${original.object}`);
    original.object = newOriginal;
    original.generation = current.get(newOriginal).generation;
    for (const variant of Object.values(image.variants)) {
      const object = mapped.get(variant.object) || (current.has(variant.object) ? variant.object : null);
      if (!object || !current.has(object)) throw Error(`Missing variant copy: ${variant.object}`);
      variant.object = object;
      variant.url = publicImageUrl(imageBucket, object);
    }
  }
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${file}: ${manifest.images.length} current`);
}
