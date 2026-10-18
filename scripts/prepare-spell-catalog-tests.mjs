import '../shared/spell-catalog.js';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const catalog = globalThis.RUGATHA_SPELL_CATALOG;
const directory = process.env.RUGATHA_SPELL_CATALOG_TEST_DIR || join(tmpdir(), 'rugatha-spell-catalog', catalog.version);
const root = fileURLToPath(new URL('../', import.meta.url));
const localPath = relative(root, resolve(directory));
if (localPath !== '..' && !localPath.startsWith('..' + sep) && !isAbsolute(localPath)) throw new Error('Keep catalog data outside the repository; choose an external test directory.');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(directory, { recursive: true });
for (const file of Object.values(catalog.files)) {
  const target = join(directory, file.name);
  try { if (digest(await readFile(target)) === file.sha256) continue; } catch {}
  const response = await fetch(file.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${file.name}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== file.sha256) throw new Error(`${file.name}: catalog checksum mismatch`);
  JSON.parse(bytes.toString('utf8'));
  await writeFile(target + '.tmp', bytes);
  await rename(target + '.tmp', target);
}
console.log(`Firebase catalog test cache verified: ${directory}`);
