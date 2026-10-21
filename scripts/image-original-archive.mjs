// Private, create-only preservation of full-resolution originals before retiring repo copies.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, imageBucket, categoryFor, assetId, sha256, outsideDirectory, publicImageUrl } from './image-assets.mjs';

export function archiveDescriptor(image) {
  const extension = extname(image.source).toLowerCase();
  if (!['arcs', 'chapters', 'npcs'].includes(image.category) || categoryFor(image.source) !== image.category || resolve(root, image.source) !== join(resolve(root), image.source) || image.source.split('/').includes('..') || image.id !== assetId(image.source) || !/^[a-f0-9]{64}$/.test(image.original.sha256) || !['.jpg', '.jpeg', '.png', '.webp'].includes(extension) || !Number.isSafeInteger(image.original.bytes) || image.original.bytes <= 0) throw new Error(`Invalid original descriptor: ${image.source}`);
  return {
    object: `image-originals/${image.category}/${image.id}/${image.original.sha256}/original${extension}`,
    sha256: image.original.sha256, bytes: image.original.bytes,
    contentType: extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg',
    cacheControl: 'private, no-store', storageClass: 'STANDARD'
  };
}

export async function storageClient() {
  const require = createRequire(import.meta.url);
  const auth = require('firebase-tools/lib/auth');
  const { requireAuth } = require('firebase-tools/lib/requireAuth');
  const { Client } = require('firebase-tools/lib/apiv2');
  const options = { project: 'rugatha-87e15' };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error('Run firebase login first.');
  auth.setActiveAccount(options, account);
  await requireAuth(options);
  return new Client({ urlPrefix: 'https://storage.googleapis.com' });
}

export async function verifyArchive(client, image) {
  const descriptor = archiveDescriptor(image);
  const endpoint = `/storage/v1/b/${imageBucket}/o/${encodeURIComponent(descriptor.object)}`;
  const metadata = (await client.get(endpoint, { skipLog: { resBody: true } })).body;
  if (metadata.contentType !== descriptor.contentType || metadata.cacheControl !== descriptor.cacheControl || metadata.storageClass !== 'STANDARD' || Number(metadata.size) !== descriptor.bytes || metadata.metadata?.sha256 !== descriptor.sha256 || metadata.metadata?.firebaseStorageDownloadTokens || (image.original.archive?.generation && image.original.archive.generation !== metadata.generation)) throw new Error(`Archive metadata / generation mismatch: ${image.source}`);
  const response = await client.get(endpoint, { queryParams: { alt: 'media', generation: metadata.generation }, responseType: 'stream', resolveOnHTTPError: true, skipLog: { resBody: true } });
  if (response.status >= 400) throw new Error(`Archive read-back failed: ${image.source}`);
  const chunks = []; for await (const chunk of response.body) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  if (bytes.length !== descriptor.bytes || sha256(bytes) !== descriptor.sha256) throw new Error(`Archive checksum mismatch: ${image.source}`);
  const publicResponse = await fetch(publicImageUrl(imageBucket, descriptor.object));
  if (![401, 403].includes(publicResponse.status)) throw new Error(`Archive anonymous access must be denied: ${image.source} (${publicResponse.status})`);
  return { bytes, archive: { ...descriptor, generation: metadata.generation } };
}

export async function archiveOriginals(manifestPath, mode = 'dry-run', restoreDirectory) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.bucket !== imageBucket || !manifest.images?.length || !['dry-run', 'archive', 'verify', 'restore'].includes(mode)) throw new Error('Invalid manifest or mode');
  const sources = new Map();
  for (const image of manifest.images) {
    archiveDescriptor(image);
    if (sources.has(image.source)) throw new Error('Duplicate source');
    sources.set(image.source, null);
    if (['dry-run', 'archive'].includes(mode)) {
      const bytes = await readFile(join(root, image.source));
      if (bytes.length !== image.original.bytes || sha256(bytes) !== image.original.sha256) throw new Error(`Original changed: ${image.source}`);
      sources.set(image.source, bytes);
    }
  }
  if (mode === 'dry-run') return { mode, count: sources.size, bytes: [...sources.values()].reduce((sum, bytes) => sum + bytes.length, 0) };
  const output = mode === 'restore' ? await outsideDirectory(restoreDirectory) : null;
  const client = await storageClient();
  const region = (await client.get(`/storage/v1/b/${imageBucket}`, { queryParams: { fields: 'location' }, skipLog: { resBody: true } })).body.location;
  if (!['US-WEST1', 'US-CENTRAL1', 'US-EAST1'].includes(region)) throw new Error('Unreviewed archive region');
  const verified = [];
  for (const image of manifest.images) {
    const descriptor = archiveDescriptor(image);
    if (mode === 'archive') {
      let exists;
      try { exists = await client.get(`/storage/v1/b/${imageBucket}/o/${encodeURIComponent(descriptor.object)}`, { skipLog: { resBody: true } }); }
      catch (error) { if (error.status !== 404) throw error; }
      if (!exists) {
        const boundary = `rugatha-original-${descriptor.sha256}`;
        const metadata = { name: descriptor.object, contentType: descriptor.contentType, cacheControl: descriptor.cacheControl, storageClass: descriptor.storageClass, metadata: { sha256: descriptor.sha256 } };
        const body = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${descriptor.contentType}\r\n\r\n`),
          sources.get(image.source), Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);
        await client.request({ method: 'POST', path: `/upload/storage/v1/b/${imageBucket}/o`, queryParams: { uploadType: 'multipart', ifGenerationMatch: 0 }, headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body, skipLog: { reqBody: true, resBody: true } });
      }
    }
    const { bytes, archive } = await verifyArchive(client, image);
    image.original.archive = archive;
    if (mode === 'restore') {
      const target = resolve(output, image.source);
      if (!target.startsWith(output + sep)) throw new Error('Invalid restore path');
      await mkdir(dirname(target), { recursive: true });
      try { await writeFile(target, bytes, { flag: 'wx' }); }
      catch (error) { if (error.code !== 'EEXIST' || sha256(await readFile(target)) !== archive.sha256) throw error; }
    }
    verified.push({ source: image.source, ...archive });
    console.log(`Archive verified: ${image.source}`);
  }
  // Commit a complete archive ledger only after every original passed read-back.
  if (mode === 'archive') await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return { mode, checkedAt: new Date().toISOString(), bucket: imageBucket, count: verified.length, bytes: verified.reduce((sum, item) => sum + item.bytes, 0), originals: verified };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [manifest, mode, output] = process.argv.slice(2);
  if (!manifest || (mode && !['--archive', '--verify', '--restore'].includes(mode))) throw new Error('Usage: node scripts/image-original-archive.mjs manifest.json [--archive|--verify|--restore /outside/restore]');
  console.log(JSON.stringify(await archiveOriginals(manifest, mode ? mode.slice(2) : 'dry-run', output), null, 2));
}
