// Immutable, create-only uploads. Default is offline validation; --publish writes cloud objects.
import { readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { sha256, outsideDirectory, imageBucket, publicImageUrl } from './image-assets.mjs';

const [directoryArg, ...flags] = process.argv.slice(2);
if (!directoryArg || flags.some(flag => flag !== '--publish')) throw new Error('Usage: node scripts/publish-image-assets.mjs /outside/batch [--publish]');
const directory = await outsideDirectory(directoryArg);
const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
const bucket = imageBucket;
if (manifest.bucket !== bucket) throw new Error(`Set and review manifest.bucket as ${bucket} after confirming its region.`);
const objects = [];
for (const image of manifest.images) {
  for (const [variant, object] of Object.entries(image.variants)) {
    const expected = `public-images/${image.category}/${image.id}/${object.sha256}/${variant}.webp`;
    if (!['arcs', 'chapters', 'npcs'].includes(image.category) || !['thumb', 'reading'].includes(variant) || !/^[a-z0-9_-]+$/.test(image.id) || !/^[a-f0-9]{64}$/.test(object.sha256) || object.object !== expected) throw new Error('Invalid object path');
    const local = resolve(directory, 'objects', object.object);
    if (!local.startsWith(join(directory, 'objects') + sep)) throw new Error('Invalid local path');
    const bytes = await readFile(local);
    if (bytes.length !== object.bytes || sha256(bytes) !== object.sha256 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw new Error(`Invalid WebP or checksum: ${object.object}`);
    if (object.contentType !== 'image/webp' || object.cacheControl !== 'public, max-age=31536000, immutable') throw new Error('Invalid metadata');
    if (object.url !== publicImageUrl(bucket, object.object)) throw new Error('Invalid public URL');
    objects.push({ ...object, bytes });
  }
}
if (!objects.length) throw new Error('Empty manifest');
if (!flags.includes('--publish')) {
  console.log(JSON.stringify({ mode: 'dry-run', bucket, objects: objects.length, bytes: objects.reduce((sum, object) => sum + object.bytes.length, 0) }));
  process.exit(0);
}

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const options = { project: 'rugatha-87e15' };
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Run firebase login first.');
auth.setActiveAccount(options, account);
await requireAuth(options);
const client = new Client({ urlPrefix: 'https://storage.googleapis.com' });
const info = await client.get(`/storage/v1/b/${bucket}`, { queryParams: { fields: 'location' }, skipLog: { resBody: true } });
if (!['US-WEST1', 'US-CENTRAL1', 'US-EAST1'].includes(info.body.location)) throw new Error('Bucket is not in a reviewed free-tier region.');
for (const object of objects) {
  const endpoint = `/storage/v1/b/${bucket}/o/${encodeURIComponent(object.object)}`;
  let metadata;
  try { metadata = (await client.get(endpoint, { skipLog: { resBody: true } })).body; }
  catch (error) { if (error.status !== 404) throw error; }
  if (!metadata) {
    // Multipart create sets bytes and metadata atomically, avoiding a publicly cached
    // object without the final cache headers. Generation precondition prevents replacement.
    const boundary = `rugatha-${object.sha256}`;
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: object.object, contentType: object.contentType, cacheControl: object.cacheControl, storageClass: 'STANDARD', metadata: { sha256: object.sha256 } })}\r\n--${boundary}\r\nContent-Type: image/webp\r\n\r\n`),
      object.bytes, Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
    await client.request({ method: 'POST', path: `/upload/storage/v1/b/${bucket}/o`, queryParams: { uploadType: 'multipart', ifGenerationMatch: 0 }, headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body, skipLog: { reqBody: true, resBody: true } });
    metadata = (await client.get(endpoint, { skipLog: { resBody: true } })).body;
  }
  if (metadata.contentType !== object.contentType || metadata.cacheControl !== object.cacheControl || metadata.metadata?.sha256 !== object.sha256) throw new Error(`Existing object metadata differs; do not overwrite: ${object.object}`);
  const response = await client.get(endpoint, { queryParams: { alt: 'media', generation: metadata.generation }, responseType: 'stream', resolveOnHTTPError: true, skipLog: { resBody: true } });
  if (response.status >= 400) throw new Error(`Read-back failed with HTTP ${response.status}: ${object.object}`);
  const chunks = []; for await (const chunk of response.body) chunks.push(chunk);
  if (sha256(Buffer.concat(chunks)) !== object.sha256) throw new Error(`Read-back checksum mismatch: ${object.object}`);
  // Public endpoint is checked independently from administrator credentials.
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(object.object)}?alt=media`;
  const publicResponse = await fetch(url, { headers: { Origin: 'https://rugatha.com' } });
  if (!publicResponse.ok || sha256(Buffer.from(await publicResponse.arrayBuffer())) !== object.sha256 || !publicResponse.headers.get('content-type')?.startsWith(object.contentType) || publicResponse.headers.get('cache-control') !== object.cacheControl || !['*', 'https://rugatha.com'].includes(publicResponse.headers.get('access-control-allow-origin'))) throw new Error(`Anonymous download / metadata / CORS verification failed: ${object.object}`);
  console.log(`Verified: ${object.object}`);
}
console.log(JSON.stringify({ mode: 'published-and-anonymously-verified', bucket, objects: objects.length }));
