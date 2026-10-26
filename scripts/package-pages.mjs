import { execFileSync } from 'node:child_process';
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Ship runtime files only. Maintenance scripts, tests and local previews stay out
// of the public Pages artifact, including tests nested inside site directories.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Provide an empty output directory');
const output = resolve(process.argv[2]);
if (output === root) throw new Error('Output must differ from the source directory');
const publicDirectories = new Set([
  'about-us', 'admin', 'assets', 'campaigns', 'characters', 'deities',
  'emperors', 'experience', 'map', 'member', 'npc', 'pc', 'relation-graph',
  'shared', 'styles', 'timeline', 'toolbox'
]);
const publicRootFiles = new Set(['CNAME', 'index.html', 'manifest.webmanifest', 'sw.js']);
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
  cwd: root, encoding: 'utf8'
}).split('\0').filter(Boolean);
let copied = 0;
for (const file of new Set(files)) {
  const parts = file.split('/');
  const allowed = parts.length === 1 ? publicRootFiles.has(file) : publicDirectories.has(parts[0]);
  if (!allowed || parts.some(part => part.startsWith('.') || ['tests', '__tests__', '__pycache__'].includes(part))) continue;
  if (file.startsWith('shared/scripts/') || /(?:\.(?:test|spec)\.[cm]?js|\.(?:md|py|pyc|log))$/i.test(file)) continue;
  const destination = resolve(output, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(root, file), destination);
  copied += 1;
}
console.log(`Prepared ${copied} public files in ${output}`);
