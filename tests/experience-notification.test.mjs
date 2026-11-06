import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { findScenario, renderNotification } from '../scripts/build-experience-notification.mjs';

const info = JSON.parse(readFileSync('experience/register/experience_info.json', 'utf8'));
const source = readFileSync('experience/index.html', 'utf8');
const template = readFileSync('scripts/templates/experience-notification.html', 'utf8');

test('generated HTML matches current source and can be used without scripts', () => {
  const html = renderNotification(info, source, template);
  assert.equal(html, readFileSync('experience/subscribe/experience-notification.html', 'utf8'));
  assert.doesNotMatch(html, /<script\b|\{\{[A-Z_]+\}\}|設計預覽|退訂頁待實作|localhost:/);
  assert.match(html, /https:\/\/rugatha.com\/experience\/unsubscribe\//);
  if (info.active === 'y') {
    assert.ok(html.includes(info.eventId));
    for (const line of findScenario(source, info.scriptName).introduction) assert.ok(html.includes(line));
  }
});

test('changing the JSON updates all event fields, cross-day dates, campaign, banner and introduction', () => {
  const changed = {
    ...info, active: 'y', eventId: '2027-01-dragon', scriptName: '龍鳴的回音', scriptEnglishName: 'Echoes of the Dragon’s Roar',
    startDate: '2027-01-09', startTime: '19:00', endDate: '2027-01-10', endTime: '01:30', deadline: '2027-01-08',
    dm: '新的 DM', location: '新竹', locationNote: '新場地', minPlayers: 2, maxPlayers: 6, fee: 1250.5, characterCreation: false,
  };
  const html = renderNotification(changed, source, template);
  const banners = JSON.parse(readFileSync('docs/image-migration/campaign-current.json', 'utf8'));
  const banner = banners.images.find(image => image.source === 'campaigns/campaign-banners/exp-e02.png').variants.reading.url;
  for (const value of ['2027 年 1 月', '2027/01/09', '19:00', '2027/01/10', '01:30', '2027/01/08', '23:59', '新的 DM', '新竹', '新場地', 'NT$ 1,250.5', '2–6 人', '不包含角色創建教學', 'experience_2027-01-dragon', banner, '陣陣龍鳴不時從洞穴傳出', 'Echoes of the Dragon’s Roar']) assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /洛林精神|exp-e03\.jpeg|2026-11-lorin/);
});

test('inactive events do not advertise old or incomplete event details', () => {
  const html = renderNotification({ active: 'n' }, source, template);
  assert.match(html, /目前尚未開放新一期報名/);
  assert.doesNotMatch(html, /開放報名了|查看場次並報名|experience\/register|undefined|Invalid Date/);
});

test('unmatched scenarios fail rather than reusing the wrong banner or introduction', () => {
  assert.throws(() => renderNotification({ ...info, active: 'y', scriptName: '未建立的劇本' }, source, template), /Cannot find scriptName/);
});

test('dynamic text is escaped; optional English name and location note can be omitted', () => {
  const html = renderNotification({ ...info, active: 'y', dm: '<img src=x onerror=alert(1)>', location: 'A & B', scriptEnglishName: '', locationNote: '' }, source, template);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /A &amp; B/);
  assert.doesNotMatch(html, /<img src=x|undefined/);
});

test('cloud scenario banners accept only the reviewed public bucket without tokens', () => {
  const image = 'https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fexp%2Fe02%2Freading-1234abcd.webp?alt=media';
  const scenario = url => `<article class="experience-card"><h2 class="experience-card__title">Test</h2><img src="${url}"><p class="experience-card__description">Description</p></article>`;
  assert.equal(findScenario(scenario(image), 'Test').banner, image);
  for (const url of [image.replace('rugatha-87e15', 'other-project'), image + '&token=secret', image.replace('public-images%2F', 'image-originals%2F'), image.replace('firebasestorage.googleapis.com', 'example.com')]) {
    assert.throws(() => findScenario(scenario(url), 'Test'), /reviewed public Firebase/);
  }
});
