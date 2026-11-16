import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { getNpcFollowers, getPcFollowers } from '../deities/scripts/followers.js';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const deities = read('deities/data/deities.json');
const pcs = read('pc/pc_lib');
const npcs = read('npc/data/characters.json');
const deity = slug => deities.find(item => item.slug === slug);

test('followers link to existing character pages and each PC with a known faith appears', () => {
  const listed = new Set();
  for (const god of deities) {
    const pcFollowers = getPcFollowers(god, pcs);
    pcFollowers.forEach(person => listed.add(person.id));
    for (const person of [...getNpcFollowers(god, npcs), ...pcFollowers]) {
      assert.ok(existsSync(`deities/${person.href}`), person.href);
    }
  }
  for (const pc of pcs.filter(person => person.religion.length)) assert.ok(listed.has(pc.name_en), pc.name_en);
});

test('Spider Religion includes its divine NPCs and deduplicates their bilingual records', () => {
  const people = getNpcFollowers(deity('spider-religion'), npcs);
  assert.ok(people.some(person => person.id === 'Fallon'));
  for (const id of ['The_Mother', 'Anna', 'Alfenor']) {
    assert.equal(people.filter(person => person.id === id).length, 1, id);
  }
  assert.ok(getPcFollowers(deity('amoret'), pcs).some(person => person.id === 'Lott'));
});

test('PC matching accepts maintained slugs and legacy names, and does not infer blank faiths', () => {
  const person = {name_en:'Midori',name_zh:'米多莉'};
  for (const religion of ['keinra', 'Keinra', '津菈']) {
    assert.equal(getPcFollowers(deity('keinra'), [{...person,religion}]).length, 1);
  }
  assert.equal(getPcFollowers(deity('king-knicol'), [{...person,religion:'GodKing'}]).length, 1);
  assert.deepEqual(getPcFollowers(deity('ultisen'), [{...person,religion:'',record_zh:'遇見奧提森信徒'}]), []);
});

test('NPC matching is exact, deduplicates bilingual records and supports multiple faiths', () => {
  const person = {id:'test',nameZh:'測試',religionZh:['不信仰崔尼斯'],religionEn:[]};
  assert.deepEqual(getNpcFollowers(deity('trinix'), [person]), []);
  const both = {...person,religionZh:['崔尼斯','涅西斯'],religionEn:['Trinix']};
  assert.equal(getNpcFollowers(deity('trinix'), [both,both]).length, 1);
  assert.equal(getNpcFollowers(deity('nessis'), [both]).length, 1);
});

test('PC religion fields are string lists and Lott appears under both faiths', () => {
  for (const pc of pcs) {
    assert.ok(Array.isArray(pc.religion), pc.name_en);
    assert.ok(pc.religion.every(value => typeof value === 'string' && value.length > 0), pc.name_en);
  }
  for (const slug of ['amoret', 'spider-religion']) {
    assert.equal(getPcFollowers(deity(slug), pcs).filter(person => person.id === 'Lott').length, 1);
  }
});
