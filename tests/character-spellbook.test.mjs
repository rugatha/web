import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSpellbookScope, spellbookPath, previewCharacterSpells } from '../shared/character-spellbook.js';

test('scopes keep encoded legacy IDs opaque and reject arbitrary paths', () => {
  assert.deepEqual(spellbookPath('0000-0001'), ['members', '0000-0001', 'spellbooks', 'default']);
  assert.deepEqual(spellbookPath('0000-0001', { type: 'character', characterId: 'Ada%20%E4%BA%BA' }),
    ['members', '0000-0001', 'characters', 'Ada%20%E4%BA%BA', 'spellbooks', 'default']);
  for (const scope of [{}, { type: 'character', characterId: '' }, { type: 'character', characterId: '../other' }, { type: 'path' }]) assert.throws(() => normalizeSpellbookScope(scope));
});
test('legacy migration requires the pinned catalog and matching numeric index and level', () => {
  const spells = [{ name_en: 'Aid', level: 2 }, { name_en: 'Fireball', level: 3 }];
  const data = { spellName1: '0', spellLevel1: '2', spellName2: '0', spellLevel2: '2', spellName3: '1', spellLevel3: '1', spellName4: '404', spellLevel4: '0', notes: 'unchanged' };
  const result = previewCharacterSpells(data, spells, '2026-10-18-v1');
  assert.deepEqual(result.ids, ['Aid']); assert.equal(result.unknown.length, 2);
  assert.equal(previewCharacterSpells(data, spells, 'future').ids.length, 0);
  assert.equal(previewCharacterSpells(data, spells, 'future').unknown.length, 4);
  assert.equal(result.source.notes, undefined);
  assert.notEqual(result.fingerprint, previewCharacterSpells({ ...data, spellName1: '1' }, spells, '2026-10-18-v1').fingerprint);
});
