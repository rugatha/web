import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { readCatalog, catalog } from './helpers/spell-catalog.mjs';
import { stripSpellTags, formatSpellTime, formatSpellRange, formatSpellDuration, spellTableCellText } from '../shared/spell-display.js';
import { previewCharacterSpells } from '../shared/character-spellbook.js';

const spells = readCatalog('spells').spell;
const byName = name => spells.find(s => s.name_en === name);
const text = name => JSON.stringify(byName(name).entries);
const classes = JSON.parse(readFileSync('toolbox/race_class/class_details.json'));
const wild = JSON.parse(readFileSync('toolbox/race_class/wild_magic_table.json'));
const notes = id => classes.find(c => c.id === id).note;

test('catalog keeps the complete legacy index mapping for character migration', () => {
  assert.equal(spells.length, 361);
  const mappingHash = createHash('sha256').update(JSON.stringify(spells.map(s => [s.name_en, s.level]))).digest('hex');
  assert.equal(mappingHash, '5fd381503a976cc0f9c70e4173a54ffbcadd526111cc195a1b4bffc28ff94696');
  // The digest pins every identifier and level in sequence, independently of prose.
  assert.equal(new Set(spells.map(s => s.name_en)).size, 361);
  const data = {};
  spells.forEach((s, i) => { data[`spellName${i}`] = String(i); data[`spellLevel${i}`] = String(s.level); });
  const old = previewCharacterSpells(data, spells, '2026-10-18-v1');
  const current = previewCharacterSpells(data, spells, catalog.version);
  assert.equal(current.unknown.length, 0);
  assert.deepEqual(current.ids, old.ids);
  assert.equal(previewCharacterSpells(data, spells, 'unknown-release').ids.length, 0);
});

test('corrected rules retain the direction, timing, and numeric conditions in Chinese', () => {
  assert.match(text("Heroes' Feast"), /免疫毒素與.*恐慌/);
  assert.match(text('Ray of Enfeeblement'), /目標以力量進行的武器攻擊，只造成一半傷害/);
  assert.match(text("Otiluke's Resilient Sphere"), /都不能穿過屏障/);
  assert.match(text('Sending'), /5%/);
  assert.match(text('Wish'), /33%/);
  assert.match(text('Misty Step'), /30 呎內/);
  assert.match(text('Rope Trick'), /掉落出來/);
  assert.match(text('Haste'), /直到它下個回合結束前/);
  assert.match(text('Animate Objects'), /巨型算八件/);
});

test('all nested spell entries and tables are usable in both languages', () => {
  let tables = 0;
  function walk(value, language) {
    if (Array.isArray(value)) { value.forEach(v => walk(v, language)); return; }
    if (!value || typeof value !== 'object') return;
    if (['entries', '條目'].includes(value.type)) assert(value.name || value[`name_${language}`]);
    if (value.rows) {
      tables += 1;
      for (const row of value.rows) {
        assert.equal(row.length, value.colLabels.length);
        for (const cell of row) assert(spellTableCellText(cell).length > 0);
      }
    }
    Object.values(value).forEach(v => walk(v, language));
  }
  for (const spell of spells) {
    assert(!JSON.stringify(spell).includes('__標籤'));
    for (const lang of ['zh', 'en']) {
      for (const key of ['entries', 'entriesHigherLevel']) walk(spell[`${key}${lang === 'en' ? '_en' : ''}`], lang);
    }
  }
  assert.equal(tables, 20);
  assert.equal(spellTableCellText({ roll: { min: 1, max: 4, pad: true } }), '01–04');
  assert.equal(spellTableCellText({ roll: { min: 97, max: 0, pad: true } }), '97–00');
});

test('5etools display tags preserve scaling increments, names and nested notes', () => {
  assert.equal(stripSpellTags('{@scaledamage 8d6|3-9|1d6}'), '1d6');
  assert.equal(stripSpellTags('{@scaledice 5d8|1-9|2d8}'), '2d8');
  assert.equal(stripSpellTags('{@spell fireball|phb}'), 'fireball');
  assert.equal(stripSpellTags('{@spell fireball||Fireball}'), 'Fireball');
  assert.equal(stripSpellTags('{@spell fireball|火球術}'), '火球術');
  assert.equal(stripSpellTags('{@filter beast of challenge rating 2 or lower|bestiary|challenge rating=2}'), 'beast of challenge rating 2 or lower');
  assert.equal(stripSpellTags('{@quickref Cover||3||half cover}'), 'half cover');
  assert.equal(stripSpellTags('{@chance 33|||Lost!|OK}'), '33%');
  assert.equal(stripSpellTags('{@filter 9 or lower|bestiary|challenge rating=9}', 'zh'), '9 或更低');
  assert.equal(stripSpellTags('{@note Additional {@filter animal forms|bestiary|type=beast} are available.}'), 'Additional animal forms are available.');
});

test('casting metadata shows action types, range shapes and duration limits', () => {
  const html = readFileSync('toolbox/spells/index.html', 'utf8');
  const classification = {};
  vm.createContext(classification);
  vm.runInContext(html.slice(html.indexOf('    function attackType('), html.indexOf('    function attackText(')), classification);
  assert.equal(classification.attackType(byName('Hold Person')), 'savingAttack');
  assert.equal(classification.attackType(byName('Fire Bolt')), 'spellAttack');
  assert.equal(classification.attackType(byName('Magic Missile')), 'nonAttack');
  assert.equal(formatSpellTime([{number: 1, unit: 'bonus'}], 'en'), '1 bonus action');
  assert.equal(formatSpellTime([{number: 10, unit: 'minute'}], 'en'), '10 minutes');
  assert.equal(formatSpellRange(byName('Burning Hands').range), '自身（15 呎錐形）');
  assert.equal(formatSpellRange(byName('Burning Hands').range_en, 'en'), 'Self (15-foot cone)');
  assert.equal(formatSpellRange(byName('Antimagic Field').range_en, 'en'), 'Self (10-foot-radius sphere)');
  assert.equal(formatSpellDuration(byName('Bless').duration), '專注，至多 1 分鐘');
  assert.equal(formatSpellDuration(byName('Bless').duration_en, 'en'), 'Concentration, up to 1 minute');
  assert.equal(formatSpellDuration([{type:'permanent',ends:['dispel','trigger']}], 'en'), 'Until dispelled or triggered');
});

test('the page renders bilingual headings and dice table ranges instead of raw object values', () => {
  const html = readFileSync('toolbox/spells/index.html', 'utf8');
  const start = html.indexOf('    function renderEntries('), end = html.indexOf('    function updateSortIndicators(', start);
  const scope = { currentLanguage: 'zh', spellTableCellText, escapeHtml: s => String(s), stripTags: stripSpellTags, plainEntryText: () => { throw new Error('Unexpected fallback'); } };
  vm.createContext(scope); vm.runInContext(html.slice(start, end), scope);
  const spell = byName('Confusion');
  const result = scope.renderEntries(spell.entries);
  assert.match(result, /<td>2–6<\/td>/);
  assert.match(scope.renderEntries(byName('Fireball').entriesHigherLevel), /<strong>升環施法<\/strong>/);
  assert.match(scope.renderEntries(byName('Fireball').entriesHigherLevel), /增加1d6/);
  scope.currentLanguage = 'en';
  assert.match(scope.renderEntries(byName('Alter Self').entries_en), /<strong>Aquatic Adaptation<\/strong>/);
});

test('wild magic is referenced once in each language and covers d100 exactly once', () => {
  for (const lang of ['zh', 'en']) {
    const note = notes('sorcerer')[`lvl01_details_${lang}`];
    assert.equal(note.split('{{table:wild_magic_table}}').length - 1, 1);
    assert(!/\|\s*d100\s*\|/.test(note));
  }
  assert.equal(wild.rows.length, 50);
  const rolls = wild.rows.flatMap(row => {
    const [min,max] = row.roll.split('–').map(Number);
    assert(row.effect.zh && row.effect.en);
    return [min, max || 100];
  });
  assert.deepEqual(rolls, Array.from({length:100}, (_,i) => i+1));
  const invocations = notes('warlock').lvl02_details_en;
  for (const name of ['Aspect of the Moon', 'Gift of the Depths', 'Gift of the Ever-Living Ones', 'Grasp of Hadar', 'Tomb of Levistus', "Trickster's Escape"]) {
    assert.equal(invocations.split(`\n\n${name}\n\n`).length - 1, 1, name);
  }
  assert.match(notes('warlock').lvl02_details_zh, /火焰傷害具有易傷/);
  const row = roll => wild.rows.find(r => r.roll === roll).effect;
  assert.match(row('07–08').zh, /3 環火球術/);
  assert.match(row('09–10').zh, /5 環魔法飛彈/);
  assert.match(row('33–34').zh, /最大傷害/);
  assert.match(row('57–58').zh, /易燃物品/);
  assert.match(row('77–78').zh, /綿羊/);
  assert.match(row('83–84').zh, /1d10 黯蝕傷害/);
  assert.match(row('25–26').en, /advantage/);
  assert.match(row('51–52').en, /immunity to magic missile/);
});

test('skill proficiencies follow the attached Traditional Chinese character sheet', () => {
  const vocabulary = new Set(['運動','扒手','隱藏','特技動作','調查','歷史','奧術','自然','宗教','馴服動物','察言觀色','醫術','觀察','求生','欺瞞','威嚇','表演','說服']);
  for (const c of classes) {
    const line = c.note.lvl01_details_zh.split('\n').find(s => s.startsWith('• 技能：'));
    if (!line || !line.includes('從')) continue;
    const names = line.split('從')[1].split('中選擇')[0].split('、');
    names.forEach(name => assert(vocabulary.has(name), `${c.id}: ${name}`));
  }
});

test('fog references and movement retain their actual rules instead of section numbers or dice rolls', () => {
  for (const name of ['Cloudkill','Fog Cloud','Stinking Cloud','Sleet Storm','Incendiary Cloud']) assert.match(text(name),/重度遮蔽/);
  assert.match(text('Insect Plague'),/輕度遮蔽/);
  assert.match(text('Cloudkill'),/遠離你的方向移動 10 呎/);
  assert.doesNotMatch(text('Cloudkill'),/地面擲骰|面積是2/);
  assert.match(text("Otiluke's Resilient Sphere"),/滾動/);
  assert.match(text('Tsunami'),/每個生物每輪/);
  assert.match(text('Modify Memory'),/事件本身持續不超過 10 分鐘/);
});
