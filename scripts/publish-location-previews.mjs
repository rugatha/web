// Publish reviewed location PNGs immutably, then activate their location pages.
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { storageClient } from './image-original-archive.mjs';
import { imageBucket } from './image-assets.mjs';

const directory = path.resolve(process.argv[2] || 'output/location-previews/2026-10-24');
const publish = process.argv.includes('--publish');
const source = path.resolve('map/location/assets/location.json');
const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const images = await Promise.all(manifest.map(async entry => {
  if (!/^(?:[a-z0-9-]+\/)+[a-z0-9-]+$/.test(entry.location_key) || path.basename(entry.file) !== entry.file) throw Error('Unsafe preview entry');
  const bytes = await readFile(path.join(directory, entry.file));
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Expected a PNG');
  const hash = sha(bytes);
  const object = `public-images/locations/${entry.location_key.replaceAll('/', '--')}/${hash}/reading.png`;
  return { ...entry, bytes, hash, object, url: `https://firebasestorage.googleapis.com/v0/b/${imageBucket}/o/${encodeURIComponent(object)}?alt=media` };
}));
if (!publish) {
  console.log(JSON.stringify(images.map(({location_key, hash, url}) => ({location_key, hash, url})), null, 2));
  process.exit(0);
}
await storageClient();
const require = createRequire(import.meta.url);
const token = await require('firebase-tools/lib/apiv2').getAccessToken();
const temporary = await mkdtemp(path.join(tmpdir(), 'rugatha-location-upload-'));
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
  for (const [index, image] of images.entries()) {
    const endpoint = `https://storage.googleapis.com/storage/v1/b/${imageBucket}/o/${encodeURIComponent(image.object)}`;
    let metadata = await request(endpoint);
    if (metadata.status === 404) {
      const boundary = `rugatha-${image.hash}`;
      const info = {name: image.object, contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable', metadata: {sha256: image.hash}};
      const multipart = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(info)}\r\n--${boundary}\r\nContent-Type: image/png\r\n\r\n`), image.bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]);
      const file = path.join(temporary, `${index}.multipart`);
      await writeFile(file, multipart);
      const upload = await request(`https://storage.googleapis.com/upload/storage/v1/b/${imageBucket}/o?uploadType=multipart&ifGenerationMatch=0`, ['--request', 'POST', '--header', `Content-Type: multipart/related; boundary=${boundary}`, '--data-binary', `@${file}`]);
      if (upload.status !== 200) throw Error(`Upload failed: ${image.slug} (${upload.status})`);
      metadata = upload;
    }
    if (metadata.status !== 200) throw Error(`Metadata failed: ${image.slug} (${metadata.status})`);
    const info = JSON.parse(metadata.body);
    if (info.metadata?.sha256 !== image.hash || info.contentType !== 'image/png') throw Error(`Metadata mismatch: ${image.slug}`);
    const publicRead = await request(image.url, [], false);
    if (publicRead.status !== 200 || sha(publicRead.body) !== image.hash) throw Error(`Public image verification failed: ${image.slug}`);
    console.log(`Verified ${image.name_zh}`);
  }
  // Re-read immediately before updating so unrelated description edits survive.
  const data = JSON.parse(await readFile(source, 'utf8'));
  for (const image of images) {
    let node = data;
    for (const [depth, slug] of image.location_key.split('/').entries()) {
      node = node[['realms','kingdoms','cities','pois'][depth]]?.find(child => child.slug === slug);
      if (!node) throw Error(`Missing location: ${image.location_key}`);
    }
    node.image = image.url;
    delete node.draft;
  }
  await writeFile(source, JSON.stringify(data, null, 2) + '\n');
  await writeFile(path.join(directory, 'published.json'), JSON.stringify(images.map(({slug, location_key, hash, url}) => ({slug, location_key, hash, url})), null, 2) + '\n');
} finally {
  await rm(temporary, {recursive: true, force: true});
}
