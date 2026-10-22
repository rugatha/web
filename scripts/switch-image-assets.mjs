// Rewrites only the reviewed batch; cloud uploads and verification must precede --apply.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { root, sha256, outsideDirectory, imageBucket, publicImageUrl } from './image-assets.mjs';

const [directoryArg, ...flags] = process.argv.slice(2);
if (!directoryArg || flags.some(flag => !['--apply', '--rollback'].includes(flag)) || flags.length > 1) throw new Error('Usage: node scripts/switch-image-assets.mjs /outside/batch [--apply|--rollback]');
const directory = await outsideDirectory(directoryArg);
const journalPath = join(directory, 'source-changes.json');
if (flags.includes('--rollback')) {
  const changes = JSON.parse(await readFile(journalPath, 'utf8'));
  // Validate the whole set before restoring anything; refuse to erase subsequent edits.
  for (const change of changes) {
    if (![change.before, change.after].includes(sha256(await readFile(join(root, change.file))))) throw new Error(`Later edits present: ${change.file}`);
    if (sha256(await readFile(join(directory, 'source-backup', change.file))) !== change.before) throw new Error(`Backup mismatch: ${change.file}`);
  }
  for (const change of changes) await copyFile(join(directory, 'source-backup', change.file), join(root, change.file));
  console.log(`Restored ${changes.length} source files; cloud objects retained.`);
  process.exit(0);
}
const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
if (manifest.bucket !== imageBucket) throw new Error('Unreviewed bucket');
// Prepared follow-up batches carry a fresh reference snapshot. Keep the frozen
// pre-pilot inventory only as the fallback for existing pilot/rollback folders.
const batchInventory = join(directory, 'inventory.json');
const inventory = JSON.parse(await readFile(existsSync(batchInventory) ? batchInventory : join(root, 'docs/image-migration/inventory.json'), 'utf8'));
const url = variant => publicImageUrl(manifest.bucket, variant.object);
const replacements = new Map();
for (const image of manifest.images) {
  const source = inventory.images.find(item => item.source === image.source);
  if (!source || source.sha256 !== image.original.sha256) throw new Error(`Inventory mismatch: ${image.source}`);
  for (const reference of source.references) {
    if (!replacements.has(reference.file)) replacements.set(reference.file, new Map());
    const variant = ['shared/rugatha.config.js', 'campaigns/scripts/detail.js'].includes(reference.file) ? 'thumb' : 'reading';
    replacements.get(reference.file).set(reference.value, url(image.variants[variant]));
  }
}
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const changes = [];
const writes = [];
for (const [file, mapping] of replacements) {
  const before = await readFile(join(root, file), 'utf8');
  const replaceString = value => {
    if (mapping.has(value)) return mapping.get(value);
    for (const [from, to] of [...mapping].sort((a, b) => b[0].length - a[0].length)) {
      value = value.replace(new RegExp(`(["'\x60])${escape(from)}\\1`, 'g'), (_, quote) => `${quote}${to}${quote}`);
    }
    return value;
  };
  let after;
  if (file.endsWith('.json')) {
    // Preserve existing formatting and unrelated prose exactly.
    after = before.replace(/"(?:\\.|[^"\\])*"/g, literal => {
      const value = JSON.parse(literal);
      const replacement = replaceString(value);
      return replacement === value ? literal : JSON.stringify(replacement);
    });
    if (file === 'npc/data/characters.json') {
      const alreadyHasThumb = new Set(JSON.parse(before).filter(npc => npc.imageThumb).map(npc => npc.image));
      after = after.replace(/("image":\s*)("(?:\\.|[^"\\])*")/g, (match, prefix, literal, offset) => {
        const image = manifest.images.find(item => item.category === 'npcs' && url(item.variants.reading) === JSON.parse(literal));
        if (!image || alreadyHasThumb.has(JSON.parse(literal))) return match;
        return `${prefix}${literal},\n    "imageThumb": ${JSON.stringify(url(image.variants.thumb))}`;
      });
    }
    JSON.parse(after);
  } else after = replaceString(before);
  if (file.endsWith('.html')) {
    after = after.replace(/<img\b[^>]*>/gi, tag => {
      const image = manifest.images.find(item => tag.includes(`src="${url(item.variants.reading)}"`) || tag.includes(`src='${url(item.variants.reading)}'`));
      if (!image) return tag;
      const { thumb, reading } = image.variants;
      const attrs = `${tag.includes('crossorigin=') ? '' : ' crossorigin="anonymous"'}${tag.includes('srcset=') ? '' : ` srcset="${url(thumb)} ${thumb.width}w, ${url(reading)} ${reading.width}w" sizes="(max-width: 600px) 100vw, 1200px"`}${tag.includes(' width=') ? '' : ` width="${reading.width}" height="${reading.height}"`}`;
      return tag.replace(/\s*\/?>$/, ending => `${attrs}${ending}`);
    });
  }
  if (before === after) continue;
  changes.push({ file, before: sha256(Buffer.from(before)), after: sha256(Buffer.from(after)) });
  writes.push({ file, after });
}
if (flags.includes('--apply') && changes.length) {
  let previous = [];
  try { previous = JSON.parse(await readFile(journalPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const merged = new Map(previous.map(change => [change.file, change]));
  for (const change of changes) merged.set(change.file, change);
  // Check all backups before touching sources; journal first permits recovery
  // even if writing the batch is interrupted partway through.
  for (const change of changes) {
    const backup = join(directory, 'source-backup', change.file);
    await mkdir(dirname(backup), { recursive: true });
    try { await copyFile(join(root, change.file), backup, 1); }
    catch (error) { if (error.code !== 'EEXIST' || sha256(await readFile(backup)) !== change.before) throw error; }
  }
  await writeFile(journalPath, JSON.stringify([...merged.values()], null, 2) + '\n');
  for (const write of writes) await writeFile(join(root, write.file), write.after);
}
console.log(JSON.stringify({ mode: flags.includes('--apply') ? 'applied' : 'dry-run', files: changes.map(change => change.file) }, null, 2));
