// Add immutable card derivatives; full-size images and private originals stay intact.
// Requires cwebp and the existing Firebase CLI login. Re-running verifies existing objects.
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, imageBucket, publicImageUrl, sha256 } from './image-assets.mjs';
import { storageClient } from './image-original-archive.mjs';

const readJSON = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const dataPath = join(root, 'deities/data/deities.json');
const dataText = await readFile(dataPath, 'utf8');
const deities = JSON.parse(dataText);
const flags = process.argv.slice(2);
if (flags.length > 1 || flags.some(flag => !flag.startsWith('--slugs='))) throw Error('Usage: prepare-deity-thumbnails.mjs [--slugs=slug,slug]');
const selected = flags.length ? new Set(flags[0].slice('--slugs='.length).split(',')) : null;
if (selected && [...selected].some(slug => !deities.some(deity => deity.slug === slug))) throw Error('Unknown deity slug');
const manifestPath = join(root, 'docs/image-migration/deity-thumbnails.json');
const existing = selected ? JSON.parse(await readFile(manifestPath, 'utf8')).images : [];
const site = await readJSON('docs/image-migration/site-current.json');
const npcs = await readJSON('docs/image-migration/npc-current.json');
const client = await storageClient();
const temporary = await mkdtemp(join(tmpdir(), 'deity-thumbnails-'));
const images = [];
try {
  for (const deity of deities) {
    if (selected && !selected.has(deity.slug)) continue;
    const npc = npcs.images.find(image => image.variants.reading.url === deity.image);
    if (npc) {
      deity.thumbnail = npc.variants.thumb.url;
      continue;
    }
    const source = site.images.find(image => image.collection === 'deities' && image.public.url === deity.image);
    if (!source) throw Error(`Unknown deity image: ${deity.slug}`);
    const response = await fetch(deity.image, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw Error(`Source HTTP ${response.status}: ${deity.slug}`);
    const original = Buffer.from(await response.arrayBuffer());
    if (sha256(original) !== source.sha256) throw Error(`Source checksum mismatch: ${deity.slug}`);
    const input = join(temporary, 'source.png'), output = join(temporary, 'thumbnail.webp');
    await writeFile(input, original);
    // Preserve each original's framing, including square artwork.
    const scale = Math.min(1, 480 / Math.max(source.width, source.height));
    const width = Math.round(source.width * scale), height = Math.round(source.height * scale);
    execFileSync('cwebp', ['-quiet', '-q', '82', '-resize', String(width), String(height), input, '-o', output]);
    const bytes = await readFile(output), hash = sha256(bytes);
    const object = `public-images/site/deities/${source.id}/image-${hash.slice(0, 8)}.webp`;
    const contentType = 'image/webp', cacheControl = 'public, max-age=31536000, immutable';
    const endpoint = `/storage/v1/b/${imageBucket}/o/${encodeURIComponent(object)}`;
    let exists = false;
    try { await client.get(endpoint, { skipLog: { resBody: true } }); exists = true; }
    catch (error) { if (error.status !== 404) throw error; }
    if (!exists) {
      const boundary = `deity-${hash}`;
      const metadata = { name: object, contentType, cacheControl, storageClass: 'STANDARD', metadata: { sha256: hash } };
      const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
      await client.request({ method: 'POST', path: `/upload/storage/v1/b/${imageBucket}/o`, queryParams: { uploadType: 'multipart', ifGenerationMatch: 0 }, headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body, skipLog: { reqBody: true, resBody: true } });
    }
    const url = publicImageUrl(imageBucket, object);
    const check = await fetch(url, { headers: { Origin: 'https://rugatha.com' }, signal: AbortSignal.timeout(60000) });
    if (!check.ok || sha256(Buffer.from(await check.arrayBuffer())) !== hash || check.headers.get('cache-control') !== cacheControl || !check.headers.get('content-type')?.startsWith(contentType) || !['*', 'https://rugatha.com'].includes(check.headers.get('access-control-allow-origin'))) throw Error(`Public verification failed: ${deity.slug}`);
    deity.thumbnail = url;
    images.push({ slug: deity.slug, source: deity.image, sourceBytes: source.bytes, object, url, sha256: hash, bytes: bytes.length, width, height, contentType, cacheControl });
    console.log(`${deity.slug}: ${source.bytes} → ${bytes.length} bytes, verified`);
  }
  // Switch only after every derivative is publicly verified.
  const merged = selected ? [...existing.filter(image => !selected.has(image.slug)), ...images] : images;
  await writeFile(manifestPath, JSON.stringify({ schemaVersion: 1, bucket: imageBucket, images: merged }, null, 2) + '\n');
  let updated = dataText;
  for (const deity of deities) {
    const imageLine = `"image": ${JSON.stringify(deity.image)},`;
    const thumbnailLine = `"thumbnail": ${JSON.stringify(deity.thumbnail)},`;
    const previous = JSON.parse(dataText).find(item => item.slug === deity.slug)?.thumbnail;
    updated = previous
      ? updated.replace(`"thumbnail": ${JSON.stringify(previous)},`, thumbnailLine)
      : updated.replace(imageLine, `${imageLine}\n    ${thumbnailLine}`);
  }
  await writeFile(dataPath, updated);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
