// Inventory published campaign pages; never copy Firebase member data into this file.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
const window = { location: new URL('https://rugatha.com/') };
vm.runInNewContext(await readFile('shared/rugatha.config.js', 'utf8'), { window, URL, document: { currentScript: { src: 'https://rugatha.com/shared/rugatha.config.js' } } });
const titles = JSON.parse(await readFile('campaigns/data/story-arc-titles.json', 'utf8'));
const chapterTitles = JSON.parse(await readFile('campaigns/data/chapter-titles.json', 'utf8'));
const campaigns = [];
for (const campaign of window.RUGATHA_CONFIG.campaigns) {
  const directory = 'campaigns/' + campaign.page.replace(/^\.\//, '').replace(/index.html$/, '');
  const arcs = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !titles[entry.name]) continue;
    const files = await readdir(directory + entry.name);
    if (!files.includes('index.html')) continue;
    const html = await readFile(directory + entry.name + '/index.html', 'utf8');
    const chapterFiles = files.filter(file => /^chpt[^/]+\.html$/.test(file)).sort((a,b) => a.localeCompare(b, 'en', { numeric:true }));
    const chapterList = chapterFiles.map(file => {
      const id = entry.name + '-' + file.replace(/\.html$/, '');
      return { id, title: chapterTitles[id]?.zh || chapterTitles[id]?.en || file, url: '/' + directory + entry.name + '/' + file };
    });
    if (!chapterList.length && html.includes('data-role="chapter-content"')) chapterList.push({ id:entry.name, title:chapterTitles[entry.name]?.zh || titles[entry.name].zh, url:'/' + directory + entry.name + '/' });
    arcs.push({ id:entry.name, title:titles[entry.name].zh, chapters:chapterList.length, chapterList, url:'/' + directory + entry.name + '/' });
  }
  campaigns.push({ name: campaign.name, status: campaign.nextSession_en === 'Campaign Ended' ? 'closed' : 'active', arcs });
}
const result = JSON.stringify({ campaigns }, null, 2) + '\n';
const target = 'admin/catalog.json';
if (process.argv.includes('--check')) {
  if (await readFile(target, 'utf8') !== result) throw new Error('Run node scripts/build-admin-catalog.mjs to refresh the catalog');
} else await writeFile(target, result);
console.log(campaigns.map(c => `${c.name}: ${c.arcs.length} arcs, ${c.arcs.reduce((sum, a) => sum + a.chapters, 0)} chapters`).join('\n'));
