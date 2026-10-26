import test from 'node:test';
import assert from 'node:assert/strict';
import { choiceShare, normalizeFatePath } from '../shared/member-fate.js';

test('choice share uses everyone who answered the same question as its denominator', () => {
  const stats = { c1: 1, c2: 2, total: 3 };
  assert.equal(choiceShare('C1', stats).percent.toFixed(1), '33.3');
  assert.equal(choiceShare('C2', stats).percent.toFixed(1), '66.7');
  assert.equal(choiceShare('C1', { c1: 1, c2: 0, total: 1 }).percent, 100);
  assert.equal(choiceShare('C1', { c1: 0, c2: 3, total: 3 }).percent, 0);
});

test('missing or invalid counts never display a fabricated percentage', () => {
  for (const stats of [null, {}, { total: 0, c1: 0 }, { total: 2, c1: 3 }, { total: 2, c1: -1 }]) {
    assert.equal(choiceShare('C1', stats), null);
  }
  assert.equal(choiceShare('C3', { total: 3, c1: 1 }), null);
});

test('choice links accept NPC page paths only', () => {
  assert.equal(normalizeFatePath('/npc/npc_page/pages/Dr_Vaxon.html'), 'npc/npc_page/pages/Dr_Vaxon.html');
  for (const path of ['javascript:alert(1)', 'https://example.com', 'npc/npc_page/pages/../index.html', '']) {
    assert.equal(normalizeFatePath(path), '');
  }
});

import { availableFateNpcs, pickFateNpc } from '../shared/member-fate.js';
const question = { Q: 'Q', C1: 'A', C2: 'B', R1: 'RA', R2: 'RB' };
const npc = (id, qa = question) => ({ url: `npc/npc_page/pages/${id}.html`, qaZh: qa });
test('NPC totals include unique playable questions only', () => {
  assert.equal(availableFateNpcs([npc('A'), npc('A'), npc('B', {}), npc('C')]).length, 2);
});
test('random NPC only selects unanswered questions and stops when all are answered', () => {
  const catalog = [npc('A'), npc('B')];
  assert.equal(pickFateNpc(catalog, [{ questionPage: catalog[0].url }], () => 0).url, catalog[1].url);
  assert.equal(pickFateNpc(catalog, catalog.map(n => ({ questionPage: n.url })), () => 0), null);
  assert.equal(pickFateNpc([], []), null);
});
