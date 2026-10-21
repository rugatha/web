// Loopback-only static server for image acceptance. No Auth or production writes.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { root } from './image-assets.mjs';

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const base = resolve(root);
createServer(async (request, response) => {
  try {
    if (request.method !== 'GET') { response.writeHead(405); return response.end(); }
    const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (path === '/__image-test__/') { response.writeHead(200, { 'Content-Type': 'text/html' }); return response.end('<!doctype html><title>Image cache acceptance</title>'); }
    if (path.split('/').some(part => part.startsWith('.')) || ['migration-private', 'config', 'scripts', 'tests', 'docs', 'node_modules'].includes(path.split('/')[1])) throw new Error('Excluded path');
    let file = resolve(root, '.' + path);
    if (!file.startsWith(base + sep) && file !== base) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const type = types[extname(file).toLowerCase()]; if (!type) throw new Error('Unsupported file');
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(await readFile(file));
  } catch (_) { response.writeHead(404); response.end('Not found'); }
}).listen(8766, '127.0.0.1');
