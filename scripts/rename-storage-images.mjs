// One-time, create-only migration of editorial Firebase Storage images.
// `plan` is offline; `copy` uses GCS server-side rewrite and verifies metadata.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { imageBucket, root } from './image-assets.mjs';

const [command, inventoryPath, planPath] = process.argv.slice(2);
if (!['plan', 'copy'].includes(command) || !inventoryPath || !planPath) {
  throw Error('Usage: node scripts/rename-storage-images.mjs plan|copy /tmp/storage-objects.json /tmp/readable-paths.json');
}

const objects = JSON.parse(await readFile(inventoryPath, 'utf8'));
const media = objects.filter(item => /^(image-originals|public-images)\//.test(item.name));
const hashPart = /^[a-f0-9]{64}$/;
const cleanId = id => id.replace(/-[a-f0-9]{10}$/, '');
const campaignParts = id => {
  const match = cleanId(id).match(/^([a-z]+)-([a-z]+\d+(?:-\d+)?)(?:-chpt([\d_-]+))?$/);
  if (!match) throw Error(`Unrecognized campaign asset: ${id}`);
  return [match[1], match[2], ...(match[3] ? [`chapter-${match[3]}`] : [])];
};

function destination(name) {
  const p = name.split('/');
  const kind = p[0], category = p[1];
  if (kind === 'image-originals') {
    if (p.length !== 5 || !hashPart.test(p[3]) || !/^original\.(png|jpe?g|webp)$/.test(p[4])) throw Error(`Unexpected original: ${name}`);
    const parts = category === 'npcs' ? [cleanId(p[2])] : campaignParts(p[2]);
    return [kind, category, ...parts, `original-${p[3].slice(0, 8)}.${p[4].split('.').pop()}`].join('/');
  }
  if (kind !== 'public-images' || p.length !== 5 || !hashPart.test(p[3])) throw Error(`Unexpected public image: ${name}`);
  let parts;
  if (category === 'arcs' || category === 'chapters') parts = campaignParts(p[2]);
  else if (category === 'npcs' || category === 'signatures') parts = [category === 'npcs' ? cleanId(p[2]) : p[2]];
  else if (category === 'locations') parts = p[2].split('--');
  else throw Error(`Unknown image category: ${name}`);
  if (!parts.every(part => /^[a-z0-9_-]+$/.test(part))) throw Error(`Unsafe readable path: ${name}`);
  if (!/^(thumb|reading)\.webp$|^reading\.png$|^signature\.png$/.test(p[4])) throw Error(`Unexpected variant: ${name}`);
  const [variant, extension] = p[4].split('.');
  return [kind, category, ...parts, `${variant}-${p[3].slice(0, 8)}.${extension}`].join('/');
}

const plan = media.map(item => ({ from: item.name, to: destination(item.name), generation: item.generation, size: item.size, contentType: item.contentType, cacheControl: item.cacheControl, sha256: item.metadata?.sha256 }));
if (new Set(plan.map(item => item.to)).size !== plan.length) throw Error('Destination collision');
if (command === 'plan') {
  await writeFile(planPath, JSON.stringify({ bucket: imageBucket, items: plan }, null, 2) + '\n');
  console.log(JSON.stringify({ count: plan.length, categories: Object.groupBy(plan, item => item.from.split('/').slice(0, 2).join('/')) && Object.fromEntries(Object.entries(Object.groupBy(plan, item => item.from.split('/').slice(0, 2).join('/'))).map(([key, value]) => [key, value.length])) }));
  process.exit(0);
}

const saved = JSON.parse(await readFile(planPath, 'utf8'));
if (saved.bucket !== imageBucket || JSON.stringify(saved.items) !== JSON.stringify(plan)) throw Error('Inventory or plan changed');
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const options = { project: 'rugatha-87e15' };
const account = auth.getProjectDefaultAccount(root);
if (!account) throw Error('Run firebase login first');
auth.setActiveAccount(options, account);
await requireAuth(options);
const client = new Client({ urlPrefix: 'https://storage.googleapis.com' });
let next = 0, completed = 0, failure;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (!failure && next < plan.length) {
    const item = plan[next++];
    try {
      const source = encodeURIComponent(item.from), target = encodeURIComponent(item.to);
      const sourceInfo = (await client.get(`/storage/v1/b/${imageBucket}/o/${source}`, { skipLog: { resBody: true } })).body;
      if (sourceInfo.generation !== item.generation || sourceInfo.size !== item.size || sourceInfo.metadata?.sha256 !== item.sha256) throw Error(`Source changed: ${item.from}`);
      let targetInfo;
      try { targetInfo = (await client.get(`/storage/v1/b/${imageBucket}/o/${target}`, { skipLog: { resBody: true } })).body; }
      catch (error) { if (error.status !== 404) throw error; }
      if (!targetInfo) {
        const result = await client.request({ method: 'POST', path: `/storage/v1/b/${imageBucket}/o/${source}/rewriteTo/b/${imageBucket}/o/${target}`, queryParams: { ifGenerationMatch: 0, ifSourceGenerationMatch: item.generation }, body: {}, skipLog: { reqBody: true, resBody: true } });
        if (!result.body.done) throw Error(`Multi-step rewrite unexpected: ${item.from}`);
        targetInfo = result.body.resource;
      }
      // GCS rewrite can add a Firebase download token automatically. Remove it
      // before treating any copied private original as verified.
      if (targetInfo.metadata?.firebaseStorageDownloadTokens) {
        await client.request({ method: 'PATCH', path: `/storage/v1/b/${imageBucket}/o/${target}`, queryParams: { ifGenerationMatch: targetInfo.generation }, body: { metadata: { firebaseStorageDownloadTokens: null } }, skipLog: { reqBody: true, resBody: true } });
        targetInfo = (await client.get(`/storage/v1/b/${imageBucket}/o/${target}`, { skipLog: { resBody: true } })).body;
      }
      for (const field of ['size', 'contentType', 'cacheControl', 'md5Hash', 'crc32c']) if (targetInfo[field] !== sourceInfo[field]) throw Error(`Copy metadata mismatch (${field}): ${item.to}`);
      if (targetInfo.metadata?.sha256 !== item.sha256 || targetInfo.metadata?.firebaseStorageDownloadTokens) throw Error(`Copy private metadata mismatch: ${item.to}`);
      completed++;
      if (completed % 50 === 0) console.log(`Verified ${completed}/${plan.length}`);
    } catch (error) { failure ||= error; }
  }
}));
if (failure) throw failure;
console.log(`Verified ${completed} readable-path copies`);
