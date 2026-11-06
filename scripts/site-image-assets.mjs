// Preserve exact image bytes outside Git and publish immutable public copies.
import { readFile, writeFile, mkdir, copyFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { assetId, sha256, imageBucket, publicImageUrl, imageInfo, root, outsideDirectory } from './image-assets.mjs';
import { storageClient } from './image-original-archive.mjs';

export const collections = {
  'pc/pics/': 'pc-portraits', 'pc/three_views/': 'pc-three-views',
  'pc/pics_by_players/': 'pc-player-art', 'pc/assets/': 'pc-cards',
  'deities/images/': 'deities', 'emperors/gallery/': 'emperors',
  'about-us/assets/': 'about', 'map/assets/': 'maps',
  'member/assets/': 'member', 'npc/npc_page/assets/': 'npc-backgrounds'
};
const types = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const save = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n');
async function pool(items, action) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
    while (next < items.length) await action(items[next++]);
  }));
}
export function descriptor(source, bytes) {
  const collection = Object.entries(collections).find(([prefix]) => source.startsWith(prefix))?.[1];
  const extension = extname(source).toLowerCase(), contentType = types[extension];
  if (!collection || !contentType || source.split('/').includes('..') || resolve(root, source) !== join(root, source)) throw Error(`Unreviewed source: ${source}`);
  const hash = sha256(bytes), id = assetId(source);
  return { source, collection, id, bytes: bytes.length, sha256: hash,
    public: { object: `public-images/site/${collection}/${id}/image-${hash.slice(0, 8)}${extension}`, contentType, cacheControl: 'public, max-age=31536000, immutable' },
    archive: { object: `image-originals/site/${collection}/${id}/original-${hash.slice(0, 8)}${extension}`, contentType, cacheControl: 'private, no-store' } };
}
async function adminBytes(client, metadata) {
  const response = await client.get(`/storage/v1/b/${imageBucket}/o/${encodeURIComponent(metadata.name)}`, { queryParams: { alt: 'media', generation: metadata.generation }, responseType: 'stream', resolveOnHTTPError: true, skipLog: { resBody: true } });
  if (response.status >= 400) throw Error(`Read-back HTTP ${response.status}`);
  const chunks = []; for await (const chunk of response.body) chunks.push(chunk);
  return Buffer.concat(chunks);
}
async function verify(client, image, kind) {
  const item = image[kind];
  const metadata = (await client.get(`/storage/v1/b/${imageBucket}/o/${encodeURIComponent(item.object)}`, { skipLog: { resBody: true } })).body;
  if (metadata.contentType !== item.contentType || metadata.cacheControl !== item.cacheControl || metadata.storageClass !== 'STANDARD' || Number(metadata.size) !== image.bytes || metadata.metadata?.sha256 !== image.sha256 || metadata.metadata?.firebaseStorageDownloadTokens || (item.generation && item.generation !== metadata.generation)) throw Error(`Cloud metadata mismatch: ${item.object}`);
  const bytes = await adminBytes(client, metadata);
  if (bytes.length !== image.bytes || sha256(bytes) !== image.sha256) throw Error(`Read-back checksum mismatch: ${item.object}`);
  const response = await fetch(publicImageUrl(imageBucket, item.object), { headers: { Origin: 'https://rugatha.com' }, signal: AbortSignal.timeout(60000) });
  const anonymous = Buffer.from(await response.arrayBuffer());
  if (kind === 'archive') {
    if (![401, 403].includes(response.status)) throw Error(`Private archive is accessible: ${item.object}`);
  } else if (response.status !== 200 || anonymous.length !== image.bytes || sha256(anonymous) !== image.sha256 || !response.headers.get('content-type')?.startsWith(item.contentType) || response.headers.get('cache-control') !== item.cacheControl || !['*', 'https://rugatha.com'].includes(response.headers.get('access-control-allow-origin'))) throw Error(`Anonymous verification failed: ${item.object}`);
  return metadata.generation;
}
async function publishObject(client, image, kind, bytes) {
  const item = image[kind], endpoint = `/storage/v1/b/${imageBucket}/o/${encodeURIComponent(item.object)}`;
  let present;
  try { present = (await client.get(endpoint, { skipLog: { resBody: true } })).body; }
  catch (error) { if (error.status !== 404) throw error; }
  if (!present) {
    const boundary = `rugatha-site-${image.sha256}`;
    const metadata = { name: item.object, contentType: item.contentType, cacheControl: item.cacheControl, storageClass: 'STANDARD', metadata: { sha256: image.sha256 } };
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${item.contentType}\r\n\r\n`), bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    await client.request({ method: 'POST', path: `/upload/storage/v1/b/${imageBucket}/o`, queryParams: { uploadType: 'multipart', ifGenerationMatch: 0 }, headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body, skipLog: { reqBody: true, resBody: true } });
  }
  item.generation = await verify(client, image, kind);
}
export async function prepareSiteImages(scopePath, directory) {
  const output = await outsideDirectory(directory), scope = await json(scopePath), images = [];
  if (existsSync(join(output, 'manifest.json'))) throw Error('Do not replace an existing batch manifest.');
  for (const item of scope.selected) {
    const bytes = await readFile(join(root, item.path));
    if (sha256(bytes) !== item.sha256 || bytes.length !== item.bytes) throw Error(`Source changed: ${item.path}`);
    const image = { ...descriptor(item.path, bytes), ...imageInfo(join(root, item.path)) };
    image.public.url = publicImageUrl(imageBucket, image.public.object);
    const target = join(output, 'originals', item.path);
    await mkdir(dirname(target), { recursive: true }); await copyFile(join(root, item.path), target);
    images.push(image);
  }
  const manifest = { schemaVersion: 1, batch: 'remaining-site-images-2026-11-06', bucket: imageBucket, policy: 'Preserve original dimensions, formats and exact bytes; no resizing or lossy recompression.', images };
  await save(join(output, 'manifest.json'), manifest);
  return { images: images.length, bytes: images.reduce((sum, image) => sum + image.bytes, 0) };
}
export async function publishSiteImages(directory) {
  const output = await outsideDirectory(directory), path = join(output, 'manifest.json'), manifest = await json(path);
  if (manifest.bucket !== imageBucket) throw Error('Unreviewed bucket');
  const client = await storageClient();
  if ((await client.get(`/storage/v1/b/${imageBucket}`, { queryParams: { fields: 'location' }, skipLog: { resBody: true } })).body.location !== 'US-WEST1') throw Error('Unexpected bucket region');
  let done = 0;
  await pool(manifest.images, async image => {
    const bytes = await readFile(join(output, 'originals', image.source));
    const expected = descriptor(image.source, bytes);
    if (expected.sha256 !== image.sha256 || expected.public.object !== image.public.object || expected.archive.object !== image.archive.object) throw Error('Prepared image changed');
    await publishObject(client, image, 'archive', bytes);
    await publishObject(client, image, 'public', bytes);
    console.log(`Verified ${++done}/${manifest.images.length}: ${image.source}`);
  });
  manifest.publication = { verifiedAt: new Date().toISOString(), publicImages: manifest.images.length, privateOriginals: manifest.images.length, checks: ['IAM read-back checksum', 'anonymous public checksum', 'CORS', 'immutable cache headers', 'private anonymous denial', 'no download tokens'] };
  await save(path, manifest);
  return manifest.publication;
}
export async function retireSiteImages(manifestPath) {
  const manifest = await json(manifestPath);
  if (manifest.bucket !== imageBucket || !manifest.publication || !manifest.images.length) throw Error('Unverified manifest');
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root }).toString().split('\0').filter(file => file && !/^(docs|scripts|tests|migration-private)\//.test(file) && /\.(html|css|js|mjs|json|webmanifest)$/.test(file) && existsSync(join(root, file)));
  const texts = await Promise.all(files.map(async file => [file, await readFile(join(root, file), 'utf8')]));
  for (const image of manifest.images) {
    const bytes = await readFile(join(root, image.source)), expected = descriptor(image.source, bytes);
    if (expected.sha256 !== image.sha256 || expected.public.object !== image.public.object || expected.archive.object !== image.archive.object || !image.archive.generation || !image.public.generation) throw Error(`Invalid retirement descriptor: ${image.source}`);
    for (const [file, text] of texts) if (text.includes(image.source) || text.includes(encodeURI(image.source))) throw Error(`Live source reference: ${file}: ${image.source}`);
  }
  const client = await storageClient(); let done = 0;
  await pool(manifest.images, async image => {
    await verify(client, image, 'archive'); await verify(client, image, 'public');
    console.log(`Retirement verified ${++done}/${manifest.images.length}: ${image.source}`);
  });
  for (const image of manifest.images) if (sha256(await readFile(join(root, image.source))) !== image.sha256) throw Error('Local source changed during verification');
  const reportPath = join(root, 'docs/image-migration/site-images-retirement-2026-11-06.json');
  const report = { verifiedAt: new Date().toISOString(), mode: 'verified-before-removal', count: manifest.images.length, bytes: manifest.images.reduce((sum, image) => sum + image.bytes, 0), cloudManifest: manifestPath, removed: [] };
  await save(reportPath, report);
  const ignorePath = join(root, '.gitignore'); let ignore = await readFile(ignorePath, 'utf8');
  const patterns = manifest.images.map(image => '/' + image.source).filter(pattern => !ignore.split('\n').includes(pattern));
  if (patterns.length) await writeFile(ignorePath, ignore.trimEnd() + '\n\n# Public site originals are preserved in docs/image-migration/site-current.json.\n' + patterns.join('\n') + '\n');
  for (const image of manifest.images) { await unlink(join(root, image.source)); report.removed.push(image.source); await save(reportPath, report); }
  report.mode = 'removed-after-cloud-verification'; await save(reportPath, report);
  return { count: report.count, bytes: report.bytes, reportPath };
}
export async function restoreSiteImages(manifestPath, directory) {
  const output = await outsideDirectory(directory), manifest = await json(manifestPath);
  if (manifest.bucket !== imageBucket || !manifest.publication) throw Error('Unverified manifest');
  const client = await storageClient();
  await pool(manifest.images, async image => {
    await verify(client, image, 'archive');
    const bytes = await adminBytes(client, { name: image.archive.object, generation: image.archive.generation });
    const expected = descriptor(image.source, bytes);
    if (expected.sha256 !== image.sha256 || expected.archive.object !== image.archive.object) throw Error('Restore checksum mismatch');
    const target = join(output, image.source); await mkdir(dirname(target), { recursive: true });
    try { await writeFile(target, bytes, { flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST' || sha256(await readFile(target)) !== image.sha256) throw error; }
  });
  return { restored: manifest.images.length, directory: output };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, first, second] = process.argv.slice(2);
  if (command === 'prepare' && first && second) console.log(await prepareSiteImages(first, second));
  else if (command === 'publish' && first) console.log(await publishSiteImages(first));
  else if (command === 'retire' && first) console.log(await retireSiteImages(first));
  else if (command === 'restore' && first && second) console.log(await restoreSiteImages(first, second));
  else throw Error('Usage: site-image-assets.mjs prepare scope.json /outside/batch | publish /outside/batch | retire manifest.json | restore manifest.json /outside/restore');
}
