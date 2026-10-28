// Replace live site URLs after the corresponding cloud copies have been verified.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { root, imageBucket, publicImageUrl } from './image-assets.mjs';

const [planPath, flag] = process.argv.slice(2);
if (!planPath || (flag && flag !== '--apply')) throw Error('Usage: node scripts/switch-readable-image-paths.mjs plan.json [--apply]');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
if (plan.bucket !== imageBucket || !plan.items?.length) throw Error('Unreviewed plan');
const mappings = plan.items.filter(item => item.from.startsWith('public-images/')).map(item => [publicImageUrl(imageBucket, item.from), publicImageUrl(imageBucket, item.to)]);
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 8 * 1024 * 1024 }).toString().split('\0').filter(Boolean);
const changes = [];
for (const file of files) {
  if (!/\.(?:html|css|js|mjs|json|webmanifest)$/.test(file) || file.startsWith('docs/') || file.startsWith('scripts/') || file.startsWith('tests/')) continue;
  const path = join(root, file);
  const before = await readFile(path, 'utf8');
  let after = before;
  for (const [oldUrl, newUrl] of mappings) after = after.replaceAll(oldUrl, newUrl);
  if (after !== before) changes.push({ file, before, after });
}
console.log(JSON.stringify({ mode: flag ? 'apply' : 'dry-run', changedFiles: changes.length, files: changes.map(item => item.file) }, null, 2));
if (flag) for (const change of changes) await writeFile(join(root, change.file), change.after);
