// Demo-only preview. Never serves credentials or connects to the production project.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const projectId = 'demo-rugatha-newsletter';
export function createNewsletterPreviewServer() {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    if (pathname === '/shared/firebase.config.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      response.end(`window.RUGATHA_FEATURE_FLAGS={dataWritesEnabled:true};window.RUGATHA_NEWSLETTER_EMULATOR=true;window.RUGATHA_FIREBASE_CONFIG={apiKey:'demo-key',projectId:'${projectId}',appId:'demo-newsletter'};`);
      return;
    }
    if (!['/experience/subscribe/', '/experience/unsubscribe/', '/assets/', '/shared/styles/'].some(prefix => pathname.startsWith(prefix))) {
      response.writeHead(404).end(); return;
    }
    const file = resolve(root, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
    if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpeg': 'image/jpeg' }[extname(file)];
      if (!type) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createNewsletterPreviewServer();
  server.listen(8766, '127.0.0.1', () => console.log('Local newsletter preview: http://127.0.0.1:8766/experience/subscribe/ (Firebase demo only)'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
