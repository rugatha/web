import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseExperienceInfo } from '../experience/register/settings.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const decode = value => value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key) => {
  if (key.startsWith('#')) return String.fromCodePoint(key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1)));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[key.toLowerCase()] ?? entity;
});
const text = html => decode(html.replace(/<[^>]+>/g, '')).trim();
const date = value => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}/${parts.month}/${parts.day}（${parts.weekday.replace(/^(星期|週|周)/u, '')}）`;
};

export function findScenario(source, scriptName) {
  for (const [, article] of source.matchAll(/<article\b[^>]*class="experience-card"[^>]*>([\s\S]*?)<\/article>/g)) {
    const title = article.match(/<h2\b[^>]*class="experience-card__title"[^>]*>([\s\S]*?)<\/h2>/)?.[1];
    if (!title || text(title) !== scriptName) continue;
    const banner = article.match(/<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
    const introduction = article.match(/<p\b[^>]*class="experience-card__description"[^>]*>([\s\S]*?)<\/p>/)?.[1];
    if (!banner || !introduction) throw new Error(`Missing banner or introduction for ${scriptName}`);
    const url = new URL(decode(banner), 'https://rugatha.com/experience/');
    if (url.origin !== 'https://rugatha.com') throw new Error('Scenario banner must use the public Rugatha domain');
    return { banner: url.href, introduction: introduction.split(/<br\s*\/?\s*>/i).map(text).filter(Boolean) };
  }
  throw new Error(`Cannot find scriptName "${scriptName}" in experience/index.html`);
}

export function renderNotification(info, source, template) {
  const config = parseExperienceInfo(info);
  let values = {
    TITLE: 'Rugatha 體驗團快報｜新一期籌備中',
    PREHEADER: '目前尚未開放新一期報名，歡迎留意下一次體驗團公告。',
    ISSUE: 'Rugatha 體驗團快報',
    HERO_TITLE: '下一場冒險，<br>正在準備中。',
    HERO_DESCRIPTION: '目前尚未開放新一期報名。<br>歡迎先看看 Rugatha 的體驗團介紹。',
    EVENT_BODY: '<p style="margin:0 0 24px;font-size:15px;color:#566156;">新場次開放時，我們會再透過快報通知你。</p>',
    CTA_URL: 'https://rugatha.com/experience/', CTA_TEXT: '查看體驗團資訊 →',
  };
  if (config.active === 'y') {
    const scenario = findScenario(source, config.scriptName);
    const start = new Date(config.startsAt);
    const year = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', year: 'numeric' }).format(start);
    const month = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', month: 'numeric' }).format(start);
    const day = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', day: 'numeric' }).format(start);
    const url = new URL('https://rugatha.com/experience/register/');
    for (const [key, value] of Object.entries({ event: config.eventId, utm_source: 'rugatha_newsletter', utm_medium: 'email', utm_campaign: `experience_${config.eventId}`, utm_content: 'primary_cta' })) url.searchParams.set(key, value);
    const row = (label, value, last = false) => `<tr><td style="width:76px;padding:13px 10px 13px 0;color:#7a806f;vertical-align:top;border-bottom:1px solid ${last ? '#ded8ca' : '#e7e1d6'};">${label}</td><td style="padding:13px 0;border-bottom:1px solid ${last ? '#ded8ca' : '#e7e1d6'};">${value}</td></tr>`;
    const muted = value => `<span style="font-size:12px;color:#737d71;">${escape(value)}</span>`;
    const time = config.startDate === config.endDate
      ? `${date(config.startsAt)}<br>${escape(config.startTime)}–${escape(config.endTime)}（台灣時間）`
      : `${date(config.startsAt)} ${escape(config.startTime)}<br>至 ${date(config.endsAt)} ${escape(config.endTime)}（台灣時間）`;
    const rows = [
      row('活動時間', time),
      row('地下城主', escape(config.dm)),
      row('地點', escape(config.location) + (config.locationNote ? `<br>${muted(config.locationNote)}` : '')),
      row('費用', `每人 NT$ ${escape(config.fee.toLocaleString('en-US', { maximumFractionDigits: 20 }))}`),
      row('人數', `${config.minPlayers}–${config.maxPlayers} 人，名額以報名頁為準`),
      row('角色創建', config.characterCreation === true ? '包含角色創建教學' : config.characterCreation === false ? '不包含角色創建教學' : '請參閱報名頁說明'),
      row('報名截止', `${escape(config.deadline.slice(0, 10).replaceAll('-', '/'))}　23:59（台灣時間）<br>${muted('額滿將提前停止受理')}`, true),
    ];
    values = {
      TITLE: escape(`【Rugatha 體驗團快報】${month}/${day}《${config.scriptName}》開放報名`),
      PREHEADER: escape(`${config.location}・D&D 5e・新手友善。查看活動資訊與報名方式。`),
      ISSUE: `體驗團快報 ／ ${year} 年 ${month} 月`,
      HERO_TITLE: `下一場冒險，<br>從《${escape(config.scriptName)}》開始。`,
      HERO_DESCRIPTION: '新的 Rugatha 體驗團開放報名了。<br>帶著好奇心，與我們一起踏入原創奇幻世界。',
      EVENT_BODY: `<p style="margin:0 0 10px;font-size:12px;letter-spacing:2px;color:#8b7441;">本期冒險</p>
          <h2 style="margin:0;font-size:24px;line-height:1.5;">${escape(config.scriptName)}</h2>
          ${config.scriptEnglishName ? `<p style="margin:4px 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:16px;font-style:italic;color:#737d71;">${escape(config.scriptEnglishName)}</p>` : ''}
          <p style="margin:0 0 24px;font-size:15px;color:#566156;">第一次玩 D&amp;D 也歡迎參加。這次由 DM ${escape(config.dm)}帶領，使用龍與地下城第五版規則，在 Rugatha 原創世界展開一段冒險。</p>
          <img src="${escape(scenario.banner)}" alt="當期體驗團《${escape(config.scriptName)}》banner" width="534" style="display:block;width:100%;max-width:534px;height:auto;margin:0 0 24px;border:0;">
          <p id="scenario-introduction" style="margin:0 0 28px;font-size:15px;font-style:italic;line-height:1.9;color:#566156;">${scenario.introduction.map(escape).join('<br>\n            ')}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;border-top:1px solid #ded8ca;">${rows.join('\n            ')}</table>`,
      CTA_URL: escape(url.href), CTA_TEXT: '查看場次並報名 →',
    };
  }
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown notification placeholder: ${key}`);
    return values[key];
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [info, source, template] = await Promise.all([
    readFile(resolve(root, 'experience/register/experience_info.json'), 'utf8'),
    readFile(resolve(root, 'experience/index.html'), 'utf8'),
    readFile(resolve(root, 'scripts/templates/experience-notification.html'), 'utf8'),
  ]);
  const output = resolve(root, 'experience/subscribe/experience-notification.html');
  const html = renderNotification(JSON.parse(info), source, template);
  if (process.argv.includes('--check')) {
    if (await readFile(output, 'utf8') !== html) throw new Error('Notification is outdated. Run npm run newsletter:build');
    console.log('Verified current experience notification.');
  } else {
    await writeFile(output, html);
    console.log('Built experience/subscribe/experience-notification.html');
  }
}
