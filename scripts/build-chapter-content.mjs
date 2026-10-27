import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(root, 'campaigns/data/chapter-content.json');
const output = path.join(root, 'campaigns/data/chapters');
const check = process.argv.includes('--check');
const chapters = JSON.parse(await readFile(source, 'utf8'));
const expected = new Set();

if (!check) await mkdir(output, { recursive: true });
for (const [id, chapter] of Object.entries(chapters)) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Unsafe chapter ID: ${id}`);
  const filename = `${id}.json`;
  const content = `${JSON.stringify(chapter)}\n`;
  expected.add(filename);
  const target = path.join(output, filename);
  if (check) {
    if (await readFile(target, 'utf8') !== content) throw new Error(`Outdated chapter file: ${filename}`);
  } else {
    await writeFile(target, content);
  }
}
for (const filename of await readdir(output)) {
  if (!filename.endsWith('.json') || expected.has(filename)) continue;
  if (check) throw new Error(`Obsolete chapter file: ${filename}`);
  await unlink(path.join(output, filename));
}
console.log(`${check ? 'Verified' : 'Built'} ${expected.size} chapter files.`);
