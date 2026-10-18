import '../../shared/spell-catalog.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const catalog = globalThis.RUGATHA_SPELL_CATALOG;
export const catalogDirectory = process.env.RUGATHA_SPELL_CATALOG_TEST_DIR || join(tmpdir(), 'rugatha-spell-catalog', catalog.version);
export function readCatalog(name) {
  const file = catalog.files[name];
  let bytes;
  try { bytes = readFileSync(join(catalogDirectory, file.name)); }
  catch { throw new Error('Catalog cache missing. Run npm run test:catalog:setup first.'); }
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('Catalog cache changed. Run npm run test:catalog:setup again.');
  return JSON.parse(bytes.toString('utf8'));
}
