// Share existing campaign metadata with generated and live location pages.
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = 'https://rugatha.com';
export async function loadLocationChapterCatalog(data) {
  const [content, navigation, arcTitles, configSource] = await Promise.all([
    'campaigns/data/chapter-content.json', 'campaigns/data/chapter-nav.json',
    'campaigns/data/story-arc-titles.json', 'shared/rugatha.config.js',
  ].map(file => readFile(join(root, file), 'utf8')));
  const chapters = JSON.parse(content), nav = JSON.parse(navigation), titles = JSON.parse(arcTitles);
  const window = { location: new URL(origin + '/'), };
  const context = { window, URL, document: { currentScript: { src: origin + '/shared/rugatha.config.js' } } };
  vm.runInNewContext(configSource, context, { timeout: 1000 });
  const graph = new Map(window.RUGATHA_CONFIG.graph.data.map(node => [node.id, node]));
  const selected = new Map();
  function visit(node, depth = 0) {
    for (const chapter of node.chapters ?? []) selected.set(chapter.id, chapter);
    for (const child of node[['realms', 'kingdoms', 'cities', 'pois'][depth]] ?? []) visit(child, depth + 1);
  }
  visit(data);
  const catalog = {};
  for (const [id, chapter] of selected) {
    const source = chapters[id], arc = nav[id]?.['story-arc'];
    if (!source || !arc || !titles[arc.id]?.zh || !titles[arc.id]?.en) throw new Error(`Missing chapter metadata: ${id}`);
    // Use existing small Firebase variants where available; resolve local chapter art
    // relative to its chapter page, so nested location routes cannot break it.
    const thumb = graph.get(id)?.image;
    const src = typeof thumb === 'string' && thumb.startsWith('https://firebasestorage.googleapis.com/') ? thumb : source.image?.src;
    if (!src) throw new Error(`Missing chapter image: ${id}`);
    const imageUrl = new URL(src, new URL(source.source, origin + '/'));
    if (imageUrl.origin === origin) await access(join(root, imageUrl.pathname.slice(1)));
    catalog[id] = {
      campaign: { id: id.split('-')[0], name: chapter.series, url: new URL('../', origin + arc.url).pathname },
      arc: { id: arc.id, title_zh: titles[arc.id].zh, title_en: titles[arc.id].en, url: arc.url },
      image: imageUrl.origin === origin ? imageUrl.pathname : imageUrl.href,
    };
  }
  return catalog;
}
