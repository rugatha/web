import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getCampaignStatus, getDeactiveReason, matchesPcFilters, sortCampaignPcs } from '../pc/pc-status.js';

const pcs = JSON.parse(fs.readFileSync(new URL('../pc/pc_lib', import.meta.url), 'utf8'));
const find = name => pcs.find(pc => pc.name_en === name);

test('departure reasons follow the displayed campaign and language', () => {
  const pc = {
    active: { Rugatha: false, 'Rugatha Plus': true },
    deactive_reason: {
      Rugatha: { zh: '  返回故鄉。 ', en: ' Returned home. ' },
      'Rugatha Plus': { zh: '尚未離隊', en: 'Still in party' }
    }
  };
  assert.equal(getDeactiveReason(pc, 'Rugatha', 'zh'), '返回故鄉。');
  assert.equal(getDeactiveReason(pc, 'Rugatha', 'en'), 'Returned home.');
  assert.equal(getDeactiveReason(pc, 'Rugatha Plus', 'zh'), '');
  assert.equal(getDeactiveReason(pc, 'Rugatha Lite', 'zh'), '');
});

test('empty and untranslated departure reasons remain hidden', () => {
  const pc = { active: { Rugatha: false }, deactive_reason: { Rugatha: { zh: '已離隊' } } };
  assert.equal(getDeactiveReason(pc, 'Rugatha', 'en'), '');
  pc.deactive_reason.Rugatha = '已離隊';
  assert.equal(getDeactiveReason(pc, 'Rugatha', 'zh'), '已離隊');
  assert.equal(getDeactiveReason(pc, 'Rugatha', 'en'), '');
  pc.deactive_reason.Rugatha = { zh: '  ', en: '' };
  assert.equal(getDeactiveReason(pc, 'Rugatha', 'zh'), '');
  assert.equal(getDeactiveReason({ active: { Rugatha: false } }, 'Rugatha'), '');
});

test('departure reasons are optional and reference valid campaigns', () => {
  for (const pc of pcs) {
    if (!pc.deactive_reason) continue;
    assert(Object.keys(pc.deactive_reason).length > 0);
    for (const [campaign, reason] of Object.entries(pc.deactive_reason)) {
      assert(pc.campaign.includes(campaign), `${pc.name_en}: ${campaign}`);
      if (typeof reason === 'string') {
        assert(reason.trim());
        continue;
      }
      assert.equal(typeof reason.zh, 'string');
      assert.equal(typeof reason.en, 'string');
      assert(reason.zh.trim() || reason.en.trim());
    }
  }
});

test('membership filters use the displayed campaign, while death is shared', () => {
  const paladin = find('Paladin');
  assert.equal(matchesPcFilters(paladin, 'Rugatha', { active: 'true', dead: 'true' }), true);
  assert.equal(matchesPcFilters(paladin, 'Rugatha Lite', { active: 'true', dead: 'true' }), false);
  assert.equal(matchesPcFilters(paladin, 'Rugatha Lite', { active: 'false', dead: 'true' }), true);
});

test('founding status can differ between campaigns', () => {
  const yhwh = find('YHWH');
  assert.equal(matchesPcFilters(yhwh, 'Rugatha', { origin: 'true' }), false);
  assert.equal(matchesPcFilters(yhwh, 'Rugatha Plus', { origin: 'true' }), true);
});

test('campaign, player and guest filters intersect', () => {
  const ravi = find('Ravi');
  const filters = { campaign: 'Rugatha Wilds', active: 'true', origin: 'true', dead: 'false', participation: 'guest', player: 'Joseph' };
  assert.equal(matchesPcFilters(ravi, 'Rugatha Wilds', filters), true);
  assert.equal(matchesPcFilters(ravi, 'Rugatha Wilds', { ...filters, player: 'Nathan' }), false);
  assert.equal(matchesPcFilters(ravi, 'Rugatha Wilds', { ...filters, participation: 'regular' }), false);
  assert.equal(matchesPcFilters(ravi, 'Rugatha Wilds', { ...filters, campaign: 'Rugatha' }), false);
});

test('unknown values are not treated as false', () => {
  const pc = { active: { Rugatha: null }, origin: {} };
  assert.equal(getCampaignStatus(pc, 'origin', 'Rugatha'), null);
  assert.equal(matchesPcFilters(pc, 'Rugatha', { active: 'false' }), false);
  assert.equal(matchesPcFilters(pc, 'Rugatha', { origin: 'false' }), false);
  assert.equal(matchesPcFilters(pc, 'Rugatha', { dead: 'false' }), false);
  assert.equal(matchesPcFilters(pc, 'Rugatha', { active: 'unknown', origin: 'unknown', dead: 'unknown' }), true);
});

test('cleared filters include every campaign card', () => {
  let cards = 0;
  for (const pc of pcs) for (const campaign of pc.campaign) {
    assert.equal(matchesPcFilters(pc, campaign, { campaign: 'all', active: 'all', origin: 'all', dead: 'all', participation: 'all', player: 'all' }), true);
    cards++;
  }
  assert.equal(cards, 44);
});

test('current members precede former founders; current founders come first', () => {
  const member = (name_en, active, origin) => ({ name_en, active: { Rugatha: active }, origin: { Rugatha: origin }, dead: false });
  const sorted = sortCampaignPcs([member('Later', true, false), member('Former', false, true), member('Founder', true, true)], 'Rugatha');
  assert.deepEqual(sorted.map(pc => pc.name_en), ['Founder', 'Later', 'Former']);
});

test('sorting follows each campaign and preserves the input array', () => {
  const input = [find('YHWH'), find('Siri Oslee')];
  const original = input.slice();
  assert.deepEqual(sortCampaignPcs(input, 'Rugatha').map(pc => pc.name_en), ['Siri Oslee', 'YHWH']);
  assert.deepEqual(sortCampaignPcs(input, 'Rugatha Plus').map(pc => pc.name_en), ['Siri Oslee', 'YHWH']);
  assert.deepEqual(input, original);
  assert.equal(sortCampaignPcs([find('Paladin'), find('Buzz')], 'Rugatha Lite')[0].name_en, 'Buzz');
});

test('deceased founders follow living later members within each roster group', () => {
  const member = (name_en, active, origin, dead) => ({ name_en, active: { Rugatha: active }, origin: { Rugatha: origin }, dead });
  const sorted = sortCampaignPcs([
    member('Dead founder', true, true, true), member('Living later', true, false, false),
    member('Dead former founder', false, true, true), member('Living former', false, false, false)
  ], 'Rugatha');
  assert.deepEqual(sorted.map(pc => pc.name_en), ['Living later', 'Dead founder', 'Living former', 'Dead former founder']);
});

test('all deceased characters appear last in each campaign membership category', () => {
  for (const campaign of new Set(pcs.flatMap(pc => pc.campaign))) {
    const sorted = sortCampaignPcs(pcs.filter(pc => pc.campaign.includes(campaign)), campaign);
    for (const active of [true, false, null]) {
      let sawDeceased = false;
      for (const pc of sorted.filter(pc => getCampaignStatus(pc, 'active', campaign) === active)) {
        if (pc.dead === true) sawDeceased = true;
        else assert.equal(sawDeceased, false, `${campaign}: living ${pc.name_en} after deceased`);
      }
    }
  }
});
