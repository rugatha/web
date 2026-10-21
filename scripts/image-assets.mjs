// Local image inventory and deterministic migration preparation. No cloud writes.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, copyFile, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, basename, extname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const imageBucket = 'rugatha-87e15.firebasestorage.app';
export const publicImageUrl = (bucket, object) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(object)}?alt=media`;
export const categories = {
  'campaigns/campaign-banners/': 'arcs',
  'campaigns/chapter-banners/': 'chapters',
  'npc/individual_pics/': 'npcs'
};
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const slash = path => path.split(sep).join('/');
const imagePattern = /\.(png|jpe?g|webp|gif|svg|avif)$/i;
const textPattern = /\.(html|css|js|mjs|json|webmanifest)$/i;
const files = () => execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 }).toString().split('\0').filter(Boolean);

export function categoryFor(path) {
  return Object.entries(categories).find(([prefix]) => path.startsWith(prefix))?.[1] || null;
}

export function assetId(path) {
  // Preserve original names in source; use a path-derived suffix to avoid slug collisions.
  const slug = basename(path, extname(path)).normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'image';
  return `${slug}-${sha256(Buffer.from(path)).slice(0, 10)}`;
}

export function imageInfo(path) {
  if (extname(path).toLowerCase() === '.svg') return { width: null, height: null, format: 'svg' };
  const result = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'format', path], { encoding: 'utf8' });
  const number = key => Number(result.match(new RegExp(`${key}: (\\d+)`))?.[1]) || null;
  return { width: number('pixelWidth'), height: number('pixelHeight'), format: result.match(/format: (\S+)/)?.[1] || null };
}

export function referenceCandidates(value, source) {
  let clean;
  try { clean = decodeURIComponent(value.replaceAll('&amp;', '&').replaceAll('\\/', '/')); }
  catch { return []; }
  clean = clean.split(/[?#]/)[0];
  if (/^https?:\/\//i.test(clean)) {
    const url = new URL(clean);
    if (!['rugatha.com', 'www.rugatha.com'].includes(url.hostname)) return [];
    return [decodeURIComponent(url.pathname.slice(1))];
  }
  if (/^(data:|blob:|\/\/)/i.test(clean)) return [];
  const candidates = [slash(relative(root, resolve(root, dirname(source), clean)))];
  if (clean.startsWith('/')) return [clean.slice(1)];
  candidates.push(clean);
  const canonical = clean.match(/(?:^|\/)((?:campaigns\/(?:campaign-banners|chapter-banners)|npc\/individual_pics)\/[^/]+)$/);
  if (canonical) candidates.push(canonical[1]);
  if (clean.startsWith('individual_pics/')) candidates.push(`npc/${clean}`);
  // Shared configuration values are resolved against campaigns/pages or banners at runtime.
  if (source === 'shared/rugatha.config.js') candidates.push(slash(relative(root, resolve(root, 'campaigns/pages', clean))));
  if (!clean.includes('/') && source === 'campaigns/scripts/detail.js') {
    candidates.push(`campaigns/campaign-banners/${clean}`, `campaigns/chapter-banners/${clean}`);
  }
  return [...new Set(candidates)];
}

export async function audit(output) {
  const paths = files().filter(path => !path.startsWith('docs/image-migration/'));
  let previous = new Map();
  try { previous = new Map(JSON.parse(await readFile(output, 'utf8')).images.map(image => [image.source, image])); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const images = [];
  for (const path of paths.filter(p => imagePattern.test(p))) {
    const bytes = await readFile(join(root, path));
    const hash = sha256(bytes);
    const old = previous.get(path);
    const info = old?.sha256 === hash ? { width: old.width, height: old.height, format: old.format } : imageInfo(join(root, path));
    images.push({ source: path, id: assetId(path), category: categoryFor(path), bytes: bytes.length, sha256: hash, ...info, references: [] });
  }
  const byPath = new Map(images.map(image => [image.source, image]));
  const missing = [];
  for (const path of paths.filter(p => textPattern.test(p) && !p.startsWith('scripts/') && !p.startsWith('tests/'))) {
    const text = (await readFile(join(root, path), 'utf8')).replaceAll('\\"', '"');
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const match of lines[i].matchAll(/(["'`])((?:(?!\1)[^<>\n])*?\.(?:png|jpe?g|webp|gif|svg|avif)(?:\?(?:(?!\1)[^<>\n])*)?)\1/gi)) {
        const value = match[2];
        if (value.includes('${')) continue;
        const candidates = referenceCandidates(value, path);
        const found = candidates.filter(candidate => byPath.has(candidate));
        if (found.length) {
          for (const candidate of found) byPath.get(candidate).references.push({ file: path, line: i + 1, value });
        } else if (candidates.some(candidate => categoryFor(candidate))) {
          missing.push({ file: path, line: i + 1, value, candidates });
        }
      }
    }
  }
  const hashes = new Map();
  for (const image of images) hashes.set(image.sha256, [...(hashes.get(image.sha256) || []), image.source]);
  const groups = {};
  for (const image of images) {
    const key = image.category || 'other';
    groups[key] ||= { count: 0, bytes: 0 };
    groups[key].count++; groups[key].bytes += image.bytes;
  }
  const inventory = {
    schemaVersion: 1, baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    referenceCoverage: 'Static quoted paths plus known runtime bases; computed paths and suffix guessing require browser verification. Zero matches means candidate for review, not proof of unused.',
    summary: groups, duplicates: [...hashes.values()].filter(group => group.length > 1),
    unreferencedCandidates: images.filter(image => image.category && !image.references.length).map(image => image.source),
    missingCandidates: missing, images
  };
  await mkdir(dirname(resolve(output)), { recursive: true });
  await writeFile(output, JSON.stringify(inventory, null, 2) + '\n');
  console.log(JSON.stringify({ output, summary: groups, duplicateGroups: inventory.duplicates.length, unreferencedCandidates: inventory.unreferencedCandidates.length, missingCandidates: missing.length }));
  return inventory;
}

export async function outsideDirectory(output) {
  await mkdir(resolve(output), { recursive: true });
  const actual = await realpath(resolve(output));
  const repo = await realpath(root);
  if (actual === repo || actual.startsWith(repo + sep)) throw new Error('Keep originals and generated images outside the repository.');
  return actual;
}

export async function prepare(inventoryPath, output, batch = 'rugatha-c01') {
  if (batch !== 'rugatha-c01' && batch !== 'all') throw new Error('Supported batches: rugatha-c01, all');
  const directory = await outsideDirectory(output);
  const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
  const npcIds = new Set(Object.entries(JSON.parse(await readFile(join(root, 'campaigns/pages/npcs.json'), 'utf8')).npcs).filter(([id]) => id.startsWith('rugatha-c01-')).flatMap(([, ids]) => ids));
  const npcRecords = JSON.parse(await readFile(join(root, 'npc/data/characters.json'), 'utf8'));
  const pilotNpcs = new Set(npcRecords.filter(npc => npcIds.has(npc.id)).map(npc => `npc/${npc.image}`));
  const selected = inventory.images.filter(image => image.category && (batch === 'all' || /^campaigns\/(campaign-banners|chapter-banners)\/rugatha-c01(?:[.-])/.test(image.source) || pilotNpcs.has(image.source)));
  if (!selected.length) throw new Error('No images selected');
  const manifest = { schemaVersion: 1, batch, baselineCommit: inventory.baselineCommit, bucket: imageBucket, encoder: execFileSync('cwebp', ['-version'], { encoding: 'utf8' }).trim(), variants: { thumb: { maxEdge: 480, quality: 82 }, reading: { maxEdge: 1600, quality: 85 } }, images: [] };
  for (const image of selected) {
    const source = join(root, image.source);
    const original = await readFile(source);
    if (sha256(original) !== image.sha256) throw new Error(`Source changed since inventory: ${image.source}`);
    if (!image.width || !image.height) throw new Error(`Missing dimensions: ${image.source}`);
    const backup = join(directory, 'originals', image.source);
    await mkdir(dirname(backup), { recursive: true });
    // Never replace an existing backup with different bytes.
    try { if (sha256(await readFile(backup)) !== image.sha256) throw new Error(`Backup mismatch: ${backup}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await copyFile(source, backup); }
    if (sha256(await readFile(backup)) !== image.sha256) throw new Error(`Backup verification failed: ${image.source}`);
    const entityIds = image.category === 'npcs' ? npcRecords.filter(npc => `npc/${npc.image}` === image.source).map(npc => npc.id) : [basename(image.source, extname(image.source))];
    const record = { source: image.source, id: image.id, category: image.category, entityIds, original: { bytes: image.bytes, sha256: image.sha256, width: image.width, height: image.height }, variants: {} };
    for (const [name, spec] of Object.entries(manifest.variants)) {
      const scale = Math.min(1, spec.maxEdge / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const temporary = join(directory, `${image.id}-${name}.webp`);
      execFileSync('cwebp', ['-quiet', '-q', String(spec.quality), '-m', '6', '-metadata', 'icc', '-resize', String(width), String(height), source, '-o', temporary]);
      const bytes = await readFile(temporary);
      const hash = sha256(bytes);
      const object = `public-images/${image.category}/${image.id}/${hash}/${name}.webp`;
      const target = join(directory, 'objects', object);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(temporary, target);
      const { unlink } = await import('node:fs/promises'); await unlink(temporary);
      record.variants[name] = { object, url: publicImageUrl(imageBucket, object), sha256: hash, bytes: bytes.length, width, height, contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' };
    }
    manifest.images.push(record);
  }
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ directory, batch, count: selected.length, originalBytes: selected.reduce((sum, item) => sum + item.bytes, 0), readingBytes: manifest.images.reduce((sum, item) => sum + item.variants.reading.bytes, 0) }));
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'audit' && args.length === 1) await audit(args[0]);
  else if (command === 'prepare' && args.length >= 2) await prepare(args[0], args[1], args[2]);
  else throw new Error('Usage: node scripts/image-assets.mjs audit output.json | prepare inventory.json /outside/output [rugatha-c01|all]');
}
