import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readJson = async filename => JSON.parse(await readFile(new URL(filename, root), 'utf8'));
const data = await readJson('map/location/assets/location.json');
const retiredAliases = await readJson('docs/image-migration/location-cleanup-2026-10-24/retired-route-aliases.json');
const manifest = await readJson('map/location/.generated-pages.json');
const routes = new Map();
function visit(node, segments = [], depth = 0) {
  const route = `/map/location/${segments.length ? `${segments.join('/')}/` : ''}`;
  assert.ok(!routes.has(route), `Duplicate route: ${route}`);
  routes.set(route, node);
  for (const child of node[['realms', 'kingdoms', 'cities', 'pois'][depth]] ?? []) {
    if (child.draft === true) continue;
    visit(child, [...segments, child.slug], depth + 1);
  }
}
visit(data);
const htmlFor = route => readFile(new URL(`${route.slice(1)}index.html`, root), 'utf8');

test('only canonical JSON routes have generated pages', () => {
  const expected = [...routes.keys()]
    .map(route => `${route.slice('/map/location/'.length)}index.html`).sort();
  assert.deepEqual([...manifest].sort(), expected);
});

test('removed locations leave no stale HTML pages on disk', async () => {
  const files = await readdir(new URL('map/location/', root), { recursive: true });
  const pages = files.filter(filename => filename === 'index.html' || filename.endsWith('/index.html'));
  assert.deepEqual(pages.sort(), [...manifest].sort());
});

test('retired aliases leave no redirect pages and destinations remain valid', async () => {
  for (const [from, to] of Object.entries(retiredAliases)) {
    assert.ok(!routes.has(from));
    assert.ok(routes.has(to), `Missing canonical destination: ${to}`);
    await assert.rejects(access(new URL(`${from.slice(1)}index.html`, root)), { code: 'ENOENT' });
  }
});

test('location pages link to current routes and existing local pages and resources', async () => {
  const localFiles = new Set();
  for (const route of routes.keys()) {
    const html = await htmlFor(route);
    assert.ok(html.includes(`rel="canonical" href="https://rugatha.com${route}"`));
    assert.ok(!html.includes('location.replace('));
    for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!value.startsWith('/') || value.startsWith('//')) continue;
      const pathname = new URL(value, 'https://rugatha.com').pathname;
      if (pathname.startsWith('/map/location/') && pathname.endsWith('/')) {
        assert.ok(routes.has(pathname), `${route} links to an outdated location: ${pathname}`);
      }
      localFiles.add(`${pathname.slice(1)}${pathname.endsWith('/') ? 'index.html' : ''}`);
    }
  }
  for (const filename of localFiles) await access(new URL(filename, root));
});

test('every location uses a Firebase PNG and review-only fields are absent', () => {
  for (const [route, node] of routes) {
    assert.match(node.image, /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/rugatha-87e15\.firebasestorage\.app\/o\/public-images%2Flocations%2F[a-z0-9_-]+%2F[a-f0-9]{64}%2Freading\.png\?alt=media$/, route);
    assert.equal('art_fix' in node, false, route);
  }
});
