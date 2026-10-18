// Pure path and legacy-index validation shared by UI and transport tests.
export const LEGACY_CHARACTER_CATALOG = '2026-10-18-v1';
export function normalizeSpellbookScope(scope = { type: 'personal' }) {
  if (scope?.type === 'personal') return Object.freeze({ type: 'personal' });
  if (scope?.type !== 'character' || typeof scope.characterId !== 'string'
      || !scope.characterId || scope.characterId.includes('/') || ['.', '..'].includes(scope.characterId)) {
    throw new Error('Invalid spellbook scope');
  }
  return Object.freeze({ type: 'character', characterId: scope.characterId });
}
export function spellbookPath(memberNo, scope) {
  const normalized = normalizeSpellbookScope(scope);
  return ['members', memberNo, ...(normalized.type === 'character'
    ? ['characters', normalized.characterId] : []), 'spellbooks', 'default'];
}
export function legacySpellSource(data = {}) {
  return Object.fromEntries(Object.entries(data).filter(([key]) => /^(spellName\d+|spellLevel\d+|spellRowCount)$/.test(key)).sort());
}
export function previewCharacterSpells(data, spells, version) {
  const source = legacySpellSource(data), ids = [], unknown = [];
  for (const [key, value] of Object.entries(source)) {
    if (!/^spellName\d+$/.test(key) || value === '') continue;
    const row = key.slice('spellName'.length), index = String(value);
    const spell = /^(0|[1-9]\d*)$/.test(index) ? spells[Number(index)] : null;
    if (version !== LEGACY_CHARACTER_CATALOG || !spell?.name_en
        || String(spell.level) !== String(source[`spellLevel${row}`])) unknown.push({ row, value, level: source[`spellLevel${row}`] });
    else ids.push(spell.name_en);
  }
  return { source, fingerprint: JSON.stringify(source), ids: [...new Set(ids)], unknown };
}
