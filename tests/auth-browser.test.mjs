import assert from 'node:assert/strict';
import test from 'node:test';
import { embeddedBrowser, externalBrowserUrl, lineExternalBrowserUrl } from '../shared/auth-browser.js';

test('detects LINE and Threads app browsers without classifying Safari or Chrome', () => {
  assert.equal(embeddedBrowser('Mozilla/5.0 (iPhone) Line/15.0.0'), 'line');
  assert.equal(embeddedBrowser('Mozilla/5.0 (iPhone) Barcelona 425.0.0 IABMV/1'), 'threads');
  assert.equal(embeddedBrowser('Mozilla/5.0 (Android; wv) Threads/1.0'), 'threads');
  assert.equal(embeddedBrowser('Mozilla/5.0 Instagram 400.0'), 'other');
  assert.equal(embeddedBrowser('Mozilla/5.0 Safari/605.1.15'), null);
  assert.equal(embeddedBrowser('Mozilla/5.0 Chrome/125.0.0.0'), null);
});

test('external links retain the current page, query and hash without duplicate LINE parameters', () => {
  const location = { pathname: '/npc/npc_page/pages/Mafa.html', search: '?source=line&openExternalBrowser=0', hash: '#story' };
  const copied = externalBrowserUrl(location);
  assert.equal(copied.href, 'https://rugatha.com/npc/npc_page/pages/Mafa.html?source=line#story');
  const line = lineExternalBrowserUrl(location);
  assert.equal(line.searchParams.get('openExternalBrowser'), '1');
  assert.equal(line.searchParams.getAll('openExternalBrowser').length, 1);
  assert.equal(line.hash, '#story');
});
