// Administrative release command. Never bundled into the website.
import '../shared/spell-catalog.js';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const sourceDirectory = process.argv[2];
if (!sourceDirectory) throw new Error('Usage: npm run catalog:publish -- /absolute/source-directory');
const localPath = relative(fileURLToPath(new URL('../', import.meta.url)), resolve(sourceDirectory));
if (localPath !== '..' && !localPath.startsWith('..' + sep) && !isAbsolute(localPath)) throw new Error('Keep catalog sources outside the repository.');
const catalog = globalThis.RUGATHA_SPELL_CATALOG;
const payloads = [];
const rules = await readFile(new URL('../config/firebase/firestore.rules', import.meta.url), 'utf8');
const whitelist = JSON.parse(rules.match(/data\.spellIds\.toSet\(\)\.hasOnly\((\[[\s\S]*?\])\)/)[1]);
for (const [kind, file] of Object.entries(catalog.files)) {
  const bytes = await readFile(join(resolve(sourceDirectory), file.name));
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`${file.name}: checksum differs from release descriptor`);
  const data = JSON.parse(bytes.toString('utf8'));
  if (kind === 'spells' && (!Array.isArray(data.spell) || !data.spell.length || new Set(data.spell.map(s => s.name_en)).size !== data.spell.length)) throw new Error('Invalid spell catalog');
  if (kind === 'spells' && data.spell.some(s => !whitelist.includes(s.name_en))) throw new Error('Catalog IDs and Firestore Rules differ; update and deploy compatible Rules first.');
  if (kind === 'classes' && (!data.labels || !data.progressions || !data.classes)) throw new Error('Invalid class spell catalog');
  payloads.push({ file, bytes });
}
// firebase-tools is pinned in package.json; it supplies the existing CLI login.
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const options = { project: 'rugatha-87e15' };
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Sign in with firebase login first.');
auth.setActiveAccount(options, account);
await requireAuth(options);
const client = new Client({ urlPrefix: 'https://storage.googleapis.com' });
for (const { file, bytes } of payloads) {
  const object = `/storage/v1/b/${catalog.bucket}/o/${encodeURIComponent(file.path)}`;
  let existing;
  try { existing = await client.get(object, { skipLog: { resBody: true } }); }
  catch (error) { if (error.status !== 404) throw error; }
  if (existing) {
    const content = await client.get(object, { queryParams: { alt: 'media' }, responseType: 'stream', resolveOnHTTPError: true, skipLog: { resBody: true } });
    if (content.status >= 400) throw new Error(`${file.path}: read-back failed with HTTP ${content.status}`);
    const chunks = []; for await (const chunk of content.body) chunks.push(chunk);
    if (createHash('sha256').update(Buffer.concat(chunks)).digest('hex') !== file.sha256) throw new Error(`${file.path}: existing release differs; publish a new version instead`);
    if (existing.body.cacheControl !== 'public, max-age=31536000, immutable' || existing.body.metadata?.sha256 !== file.sha256) {
      await client.patch(object, { cacheControl: 'public, max-age=31536000, immutable', metadata: { ...existing.body.metadata, sha256: file.sha256 } }, { skipLog: { reqBody: true, resBody: true } });
    }
    console.log(`Already published and verified: ${file.path}`);
    continue;
  }
  await client.request({ method: 'POST', path: `/upload/storage/v1/b/${catalog.bucket}/o`,
    queryParams: { uploadType: 'media', name: file.path, ifGenerationMatch: 0 },
    headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: bytes,
    skipLog: { reqBody: true, resBody: true } });
  await client.patch(object, { cacheControl: 'public, max-age=31536000, immutable', metadata: { sha256: file.sha256 } }, { skipLog: { reqBody: true, resBody: true } });
  console.log(`Published: ${file.path} (${bytes.length} bytes; SHA-256 ${file.sha256})`);
}
