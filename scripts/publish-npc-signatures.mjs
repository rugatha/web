// Create-only signature uploads; local PNGs retire only after all public checks pass.
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { storageClient } from './image-original-archive.mjs';
import { imageBucket } from './image-assets.mjs';
import { signatureFiles } from '../npc/npc_page/assets/signature-files.js';

const publish = process.argv.includes('--publish');
const retire = process.argv.includes('--retire');
if (retire && !publish) throw Error('--retire requires --publish');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const characters = JSON.parse(await readFile('npc/data/characters.json', 'utf8'));
const ids = new Set(characters.map(npc => npc.id));
const generationManifest = JSON.parse(await readFile('npc/signatures/manifest.json', 'utf8'));
const localFiles = new Map(generationManifest.map(entry => [entry.id, entry.file]));
const images = await Promise.all(Object.entries(signatureFiles).map(async ([id, file]) => {
  file = localFiles.get(id);
  if (typeof file !== 'string') throw Error(`Missing manifest entry: ${id}`);
  if (!ids.has(id) || path.basename(file) !== file || !file.endsWith('.png')) throw Error(`Invalid signature: ${id}`);
  const bytes = await readFile(path.join('npc/signatures', file));
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error(`Invalid PNG: ${id}`);
  const hash = sha(bytes);
  const object = `public-images/signatures/${id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}/${hash}/signature.png`;
  return {id, file, bytes, hash, object, url: `https://firebasestorage.googleapis.com/v0/b/${imageBucket}/o/${encodeURIComponent(object)}?alt=media`};
}));
if (!publish) {
  console.log(JSON.stringify({count: images.length, bytes: images.reduce((sum, image) => sum + image.bytes.length, 0)}));
  process.exit(0);
}
await storageClient();
const require = createRequire(import.meta.url);
const token = await require('firebase-tools/lib/apiv2').getAccessToken();
const temporary = await mkdtemp(path.join(tmpdir(), 'rugatha-signature-upload-'));
async function request(url, extra = [], authenticated = true) {
  const result = await new Promise((resolve, reject) => {
    const child = spawn('curl', ['--silent', '--show-error', '--connect-timeout', '15', '--max-time', '90', '--retry', '1', '--config', '-', ...extra, '--write-out', '\n%{http_code}', url], {stdio: ['pipe', 'pipe', 'pipe']});
    const out = [], errors = [];
    child.stdout.on('data', chunk => out.push(chunk));
    child.stderr.on('data', chunk => errors.push(chunk));
    child.on('error', reject);
    child.on('close', code => code ? reject(Error(`curl ${code}: ${Buffer.concat(errors)}`)) : resolve(Buffer.concat(out)));
    child.stdin.end(authenticated ? `header = ${JSON.stringify('Authorization: Bearer ' + token)}\n` : '');
  });
  const split = result.lastIndexOf(10);
  return {status: Number(result.subarray(split + 1).toString()), body: result.subarray(0, split)};
}
try {
  const bucket = await request(`https://storage.googleapis.com/storage/v1/b/${imageBucket}?fields=location`);
  if (bucket.status !== 200 || !['US-WEST1','US-CENTRAL1','US-EAST1'].includes(JSON.parse(bucket.body).location)) throw Error('Unexpected image bucket');
  async function publishImage(image, index) {
    const endpoint = `https://storage.googleapis.com/storage/v1/b/${imageBucket}/o/${encodeURIComponent(image.object)}`;
    let metadata = await request(endpoint);
    if (metadata.status === 404) {
      const boundary = `rugatha-${image.hash}`;
      const info = {name: image.object, contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable', metadata: {sha256: image.hash}};
      const multipart = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(info)}\r\n--${boundary}\r\nContent-Type: image/png\r\n\r\n`), image.bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
      const file = path.join(temporary, `${index}.multipart`);
      await writeFile(file, multipart);
      const upload = await request(`https://storage.googleapis.com/upload/storage/v1/b/${imageBucket}/o?uploadType=multipart&ifGenerationMatch=0`, ['--request', 'POST', '--header', `Content-Type: multipart/related; boundary=${boundary}`, '--data-binary', `@${file}`]);
      if (upload.status !== 200) throw Error(`Upload failed: ${image.id} (${upload.status})`);
      metadata = upload;
    }
    if (metadata.status !== 200) throw Error(`Metadata failed: ${image.id} (${metadata.status})`);
    const info = JSON.parse(metadata.body);
    if (info.metadata?.sha256 !== image.hash || info.contentType !== 'image/png' || Number(info.size) !== image.bytes.length || info.cacheControl !== 'public, max-age=31536000, immutable') throw Error(`Metadata mismatch: ${image.id}`);
    const publicRead = await request(image.url, [], false);
    if (publicRead.status !== 200 || sha(publicRead.body) !== image.hash) throw Error(`Public image verification failed: ${image.id} (${publicRead.status})`);
    console.log(`Verified ${index + 1}/${images.length}: ${image.id}`);
  }
  // Finish every active worker before cleanup, including when a request fails.
  let next = 0;
  let failure;
  await Promise.all(Array.from({length: 4}, async () => {
    while (!failure && next < images.length) {
      const index = next++;
      try { await publishImage(images[index], index); }
      catch (error) { failure ||= error; }
    }
  }));
  if (failure) throw failure;
  const directory = 'docs/signature-migration';
  await mkdir(directory, {recursive: true});
  await writeFile(path.join(directory, 'generation-manifest.json'), await readFile('npc/signatures/manifest.json'));
  await writeFile(path.join(directory, 'published.json'), JSON.stringify(images.map(({id, file, hash, object, url, bytes}) => ({id, file, sha256: hash, object, url, bytes: bytes.length})), null, 2) + '\n');
  await writeFile('npc/npc_page/assets/signature-files.js', '// Firebase Storage signatures, keyed by character ID; see docs/signature-migration/published.json.\nexport const signatureFiles = ' + JSON.stringify(Object.fromEntries(images.map(image => [image.id, image.url])), null, 2) + ';\n');
  if (retire) {
    const expected = new Set([...images.map(image => image.file), 'manifest.json']);
    for (const file of await readdir('npc/signatures')) {
      if (!expected.has(file)) throw Error(`Unexpected local file; review before retiring: ${file}`);
    }
    for (const image of images) {
      if (sha(await readFile(path.join('npc/signatures', image.file))) !== image.hash) throw Error(`Local signature changed: ${image.id}`);
    }
    await rm('npc/signatures', {recursive: true});
  }
} finally {
  await rm(temporary, {recursive: true, force: true});
}
