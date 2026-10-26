import test from 'node:test';
import assert from 'node:assert/strict';
import { bookmarkDisplayTitle } from '../shared/member-bookmarks.js';

test('saved cards show only the page title, without site/category suffixes', () => {
  for (const [title, expected] of [
    ['朱代卡運河 | Rugatha 地點圖鑑', '朱代卡運河'],
    ['Addie Applewood | NPC | Rugatha', 'Addie Applewood'],
    ['Jeorisan | Deity of Rugatha', 'Jeorisan'],
    ['Cecil ｜ Rugatha PC', 'Cecil'],
    ['單純的標題', '單純的標題']
  ]) assert.equal(bookmarkDisplayTitle(title), expected);
});

test('campaign cards omit Chinese and English chapter numbers', () => {
  const path = 'campaigns/pages/rugatha-lite/lite-c12/chpt01.html';
  for (const [title, expected] of [
    ['第十二章：不要把我們留在黑暗裡 | Rugatha Lite', '不要把我們留在黑暗裡'],
    ['第 12 章：故事', '故事'],
    ['Chapter 1: Do Not Leave Us in the Dark | Rugatha Lite', 'Do Not Leave Us in the Dark'],
    ['Chapter IV — A New Beginning', 'A New Beginning']
  ]) assert.equal(bookmarkDisplayTitle(title, path), expected);
  assert.equal(bookmarkDisplayTitle('Chapter 1: A Name', 'npc/npc_page/pages/Name.html'), 'Chapter 1: A Name');
});

test('missing title falls back to the stored path', () => {
  assert.equal(bookmarkDisplayTitle('', 'npc/npc_page/pages/Name.html'), 'npc/npc_page/pages/Name.html');
});
