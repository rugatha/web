import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sheetHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const memberHtml = readFileSync(new URL('../../../member/index.html', import.meta.url), 'utf8');

assert.doesNotMatch(sheetHtml, /id="saveCharacterButton"/);
assert.doesNotMatch(sheetHtml, /id="saveDraftButton"/);
assert.match(sheetHtml, /id="saveCloudButton"[^>]+data-i18n="saveAction"/);
assert.match(sheetHtml, /document\.getElementById\('saveCloudButton'\)\.addEventListener\('click',[\s\S]+queueCloudSave\(\)/);

assert.match(memberHtml, /className = "member-character-delete"/);
assert.match(memberHtml, /window\.confirm\([\s\S]+deleteCharacterSheet\(\{/);
assert.match(memberHtml, /targetMemberId === authState\.user\.uid/);

console.log('Passed cloud-save consolidation and member character deletion UI assertions.');
