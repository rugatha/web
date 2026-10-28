import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const path = resolve(root, `.${pathname}`);
  if (!path.startsWith(`${root}${sep}`)) { response.writeHead(403).end(); return; }
  try {
    const body = await readFile(path);
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[extname(path)] || 'application/octet-stream';
    response.writeHead(200, { 'content-type': type });
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const cases = [
    { name: 'LINE', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Line/15.0.0', line: true },
    { name: 'Threads', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Barcelona 425.0.0 IABMV/1', line: false },
  ];
  for (const item of cases) {
    const context = await browser.newContext({ userAgent: item.userAgent });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${port}/index.html?source=test#intro`, { waitUntil: 'domcontentloaded' });
    await page.locator('.auth-entry').waitFor();
    assert.equal(await page.locator('#google-login').isVisible(), false, `${item.name} must not start Google OAuth in WebView`);
    assert.equal(await page.getByRole('button', { name: '複製網址' }).count(), 1);
    if (item.line) {
      const href = await page.getByRole('link', { name: '在外部瀏覽器開啟' }).getAttribute('href');
      assert.equal(href, 'https://rugatha.com/index.html?source=test&openExternalBrowser=1#intro');
    } else {
      assert.equal(await page.getByRole('link', { name: '在外部瀏覽器開啟' }).count(), 0);
      await page.getByRole('button', { name: '複製網址' }).click();
      assert.match(await page.locator('#auth-status').innerText(), /Safari|Chrome/);
    }
    await context.close();
  }
  const normal = await browser.newContext({ userAgent: 'Mozilla/5.0 Chrome/125.0.0.0 Safari/537.36' });
  const normalPage = await normal.newPage();
  await normalPage.route('https://www.gstatic.com/**', route => route.abort());
  await normalPage.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
  await normalPage.locator('#google-login').waitFor();
  assert.equal(await normalPage.getByRole('button', { name: '複製網址' }).count(), 0);
  assert.equal(await normalPage.locator('#google-login').isVisible(), true);
  await normal.close();
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
