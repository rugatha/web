import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { getCampaignStatus, matchesPcFilters, sortCampaignPcs } from '../pc/pc-status.js';

const pcs = JSON.parse(fs.readFileSync(new URL('../pc/pc_lib', import.meta.url), 'utf8'));
const find = name => pcs.find(pc => pc.name_en === name);

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
  const sorted = sortCampaignPcs([find('Anedak'), find('Drayer'), find('Midori'), find('Usioni')], 'Rugatha');
  assert.deepEqual(sorted.map(pc => pc.name_en), ['Midori', 'Anedak', 'Drayer', 'Usioni']);
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
  const sorted = sortCampaignPcs([find('Paladin'), find('Lemmy'), find('Anedak'), find('Jiaheng'), find('Usioni')], 'Rugatha');
  assert.deepEqual(sorted.map(pc => pc.name_en), ['Anedak', 'Paladin', 'Lemmy', 'Usioni', 'Jiaheng']);
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
