(async () => {
'use strict';
const accessState = document.getElementById('access-state');
let config;
try {
  const response = await fetch('experience_info.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Configuration unavailable');
  const { parseExperienceInfo } = await import('./settings.js');
  config = parseExperienceInfo(await response.json());
  if (!config || !['y', 'n'].includes(config.active)) throw new Error('Invalid active value');
  if (config.active === 'n') {
    document.getElementById('access-title').textContent = '目前未開放報名';
    document.getElementById('access-message').textContent = '本期報名頁暫未開放，請留意 Rugatha 體驗團的最新公告。';
    document.title = '目前未開放報名 | Rugatha';
    return;
  }

} catch {
  document.getElementById('access-title').textContent = '暫時無法載入報名資訊';
  document.getElementById('access-message').textContent = location.protocol === 'file:'
    ? '請透過網站網址或本機 HTTP 伺服器開啟此頁，以讀取 experience_info.json。'
    : '場次資訊目前無法讀取，請稍後重新整理，或返回體驗團介紹。';
  return;
}

const $ = (id) => document.getElementById(id);
const form = $('registration-form');
const dialog = $('review-dialog');
$('contact-alternative').addEventListener('change', () => {
  const other = $('contact-alternative').checked;
  $('contact').type = other ? 'text' : 'email';
  $('contact').autocomplete = other ? 'off' : 'email';
  $('contact').placeholder = other ? '例如：LINE ID：your_id' : 'you@example.com';
  $('contact').setCustomValidity('');
});
const dateFormat = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const validDate = (value) => Boolean(value) && Number.isFinite(new Date(value).getTime());
const formatDate = (value) => {
  if (!validDate(value)) return '待公告';
  const parts = Object.fromEntries(dateFormat.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  const weekday = parts.weekday.replace(/^(星期|週|周)/u, '');
  return `${parts.year}/${parts.month}/${parts.day}（${weekday}） ${parts.hour}:${parts.minute}`;
};
const positiveInt = (value) => Number.isInteger(value) && value > 0;
let eventState = null;
let seatError = false;
const configured = Boolean(config.eventId && config.scriptName && config.dm && config.location && validDate(config.startsAt) && validDate(config.endsAt) && new Date(config.endsAt) > new Date(config.startsAt) && validDate(config.deadline) && new Date(config.deadline) <= new Date(config.startsAt) && positiveInt(config.minPlayers) && positiveInt(config.maxPlayers) && config.minPlayers <= config.maxPlayers && Number.isFinite(config.fee) && config.fee >= 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.contactEmail));
function availability() {
  if (eventState?.remainingSeats === 0) return { open: false, text: '本期已額滿', note: '謝謝你的關注！本期已額滿，歡迎留意下一次冒險。' };
  if (validDate(config.deadline) && Date.now() > new Date(config.deadline).getTime()) return { open: false, text: '本期報名已截止', note: '本期報名已截止，歡迎留意下一次體驗團公告。' };
  if (eventState && (!eventState.registrationOpen || Date.now() > eventState.deadline)) return { open: false, text: '本期報名已截止', note: '本期已停止受理報名，歡迎留意下次公告。' };
  if (!eventState || seatError) return { open: false, text: seatError ? '暫時無法確認名額' : '名額確認中', note: seatError ? '名額資訊暫時無法讀取，請重新整理後再試。' : '正在向 Firebase 確認剩餘名額，請稍候。' };
  if (config.active !== 'y' || !configured) return { open: false, text: '場次籌備中', note: '場次籌備中，歡迎先了解報名內容；正式開放後即可送出報名資料。' };
  return { open: true, text: '本期開放報名', note: '確認資料後即可送出報名。名額與成團狀態以主辦方回覆為準。' };
}
function updateAvailability() {
  const state = availability();
  $('event-status').textContent = state.text;
  $('event-status').classList.toggle('is-full', eventState?.remainingSeats === 0 && !seatError);
  $('availability').textContent = state.note;
  $('submit-button').disabled = !state.open;
  return state;
}
function addDetail(container, label, value) {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = value;
  row.append(dt, dd);
  container.append(row);
}
if (config.scriptName) {
  const month = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(new Date(config.startsAt));
  $('page-title').replaceChildren();
  [`${month} Rugatha 體驗團`, `《${config.scriptName}》`, '報名頁面'].forEach((text, index) => {
    const line = document.createElement('span');
    line.className = 'title-line';
    line.textContent = text;
    if (index) $('page-title').append(document.createTextNode(' '));
    $('page-title').append(line);
  });
  document.title = `${validDate(config.startsAt) ? new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit' }).format(new Date(config.startsAt)) + ' ' : ''}《${config.scriptName}》體驗團報名頁面 | Rugatha`;
}
const posterCandidates = ['png', 'jpg', 'jpeg'].map(extension => `../../assets/banner/rugatha-experience.${extension}`);
const poster = $('event-poster');
poster.alt = config.scriptName ? `《${config.scriptName}》體驗團海報` : 'Rugatha 體驗團主視覺';
let posterIndex = 0;
poster.addEventListener('error', () => {
  if (posterIndex < posterCandidates.length - 1) poster.src = posterCandidates[++posterIndex];
  else { poster.hidden = true; }
});
poster.src = posterCandidates[posterIndex];
const details = [
  ['遊戲系統', config.system], ['世界觀', config.world],
  ['地下城主 DM', config.dm || '待公告'],
  ['日期時間', validDate(config.startsAt) ? `${formatDate(config.startsAt)} 至 ${formatDate(config.endsAt)}` : '待公告'],
  ['冒險地點', [config.location || '待公告', config.locationNote].filter(Boolean).join(' · ')],
  ['玩家人數', positiveInt(config.minPlayers) && positiveInt(config.maxPlayers) ? `${config.minPlayers}–${config.maxPlayers} 人` : '待公告'],
  ['活動費用', `NT$ ${config.fee}／人（團務費＋場地費）`],
  ['創角教學', config.characterCreation === null ? '待公告' : config.characterCreation ? '包含創角教學' : '不包含創角教學'],
  ['報名截止', validDate(config.deadline) ? `${formatDate(config.deadline)}，或額滿為止` : '待公告，或額滿為止'],
];
details.forEach(([key, value]) => addDetail($('event-details'), key, value));
$('event-details').lastElementChild.classList.add('event-deadline');
function refreshSeats() {
  const select = $('party-size');
  const previous = Number(select.value);
  select.replaceChildren();
  const remaining = eventState?.remainingSeats ?? 0;
  for (let count = 1; count <= remaining; count += 1) {
    const option = document.createElement('option');
    option.value = String(count);
    option.textContent = count === 1 ? '1 人（我自己）' : `${count} 人`;
    select.append(option);
  }
  select.disabled = !eventState || remaining === 0 || seatError;
  if (previous > 0 && previous <= remaining) select.value = String(previous);
  $('seats-note').textContent = eventState && !seatError
    ? `剩餘 ${remaining} 人／共 ${eventState.maxPlayers} 人（已報名 ${eventState.registeredPlayers} 人）。名額於送出成功後保留；同行夥伴資料請於備註補充。`
    : '正在向 Firebase 確認剩餘名額。';
  if (seatError) $('seats-note').textContent = '暫時無法讀取名額，請重新整理後再試。';
  if (pendingRegistration && pendingRegistration.partySize > remaining && dialog.open) {
    $('submission-status').textContent = '剩餘名額已變動，請返回修改報名人數。';
  }
  const isFull = eventState?.remainingSeats === 0 && !seatError;
  const canShowForm = Boolean(eventState) && !seatError && !isFull && !submitted;
  const wasFilling = form.contains(document.activeElement) || dialog.open;
  form.hidden = !canShowForm;
  $('registration-intro').hidden = !canShowForm;
  $('availability').hidden = submitted || isFull;
  $('full-notice').hidden = !isFull || submitted;
  document.querySelector('.afterword').hidden = isFull && !submitted;
  document.querySelector('.hero-cta').hidden = isFull;
  if (isFull && !submitted && !submitting) {
    if (dialog.open) dialog.close();
    if (wasFilling) $('full-notice').focus();
  }
  updateAvailability();
  if (submitting || submitted || (pendingRegistration && pendingRegistration.partySize > remaining)) $('submit-button').disabled = true;
}
$('contact-link').href = `mailto:${config.contactEmail}`;
$('contact-link').textContent = config.contactEmail;
updateAvailability();

for (const group of ['systems', 'sources']) {
  $(group).addEventListener('change', (event) => {
    if (group === 'systems' && event.target.checked) {
      for (const input of $(group).querySelectorAll('input')) {
        if (event.target.value === '無經驗' ? input !== event.target : input.value === '無經驗') input.checked = false;
      }
    }
    const other = $(group).querySelector('input[value="其他"]').checked;
    $(`${group}-other`).hidden = !other;
    $(`${group}-other`).disabled = !other;
    $(`${group}-other`).required = other;
    $(`${group}-error`).hidden = Boolean($(group).querySelector('input:checked'));
  });
}
let reviewText = '';
let reviewTitle = '';
let pendingRegistration = null;
let registrationId = null;
let submitting = false;
let submitted = false;
form.addEventListener('submit', (event) => {
  event.preventDefault();
  let invalid = null;
  for (const group of ['systems', 'sources']) {
    const selected = Boolean($(group).querySelector('input:checked'));
    $(`${group}-error`).hidden = selected;
    if (!selected && !invalid) invalid = $(group).querySelector('input');
  }
  if (invalid) { invalid.focus(); return; }
  if (submitted || submitting) return;
  if (!eventState || seatError || eventState.remainingSeats < 1) { $('availability').textContent = availability().note; return; }
  const data = new FormData(form);
  if (!String(data.get('name')).trim() || !String(data.get('contact')).trim()) {
    const input = !String(data.get('name')).trim() ? $('name') : $('contact');
    input.setCustomValidity('請填寫有效內容，不能僅有空白。');
    input.reportValidity();
    return;
  }
  for (const group of ['systems', 'sources']) {
    if (data.getAll(group).includes('其他') && !String(data.get(`${group}Other`) || '').trim()) {
      const input = $(`${group}-other`);
      input.setCustomValidity('請填寫其他選項的內容。');
      input.reportValidity();
      return;
    }
  }
  pendingRegistration = {
    schemaVersion: 1, eventId: config.eventId,
    name: String(data.get('name')).trim(), contact: String(data.get('contact')).trim(),
    partySize: Number(data.get('partySize')), systems: data.getAll('systems'),
    systemsOther: data.getAll('systems').includes('其他') ? String(data.get('systemsOther')).trim() : '',
    dndExperience: data.get('dndExperience'), rugathaExperience: data.get('rugathaExperience'),
    sources: data.getAll('sources'),
    sourcesOther: data.getAll('sources').includes('其他') ? String(data.get('sourcesOther')).trim() : '',
    boundaries: String(data.get('boundaries')).trim(), notes: String(data.get('notes')).trim(),
  };
  const selectedValues = (key) => data.getAll(key).map((value) => value === '其他' ? `其他：${String(data.get(`${key}Other`) || '').trim()}` : value).join('、');
  const answers = [
    ['報名場次', config.scriptName || '最新一期體驗團（待公告）'], ['活動時間', formatDate(config.startsAt)],
    ['稱呼', String(data.get('name')).trim()], ['聯繫方式', String(data.get('contact')).trim()], ['報名人數', `${data.get('partySize')} 人`],
    ['玩過的 TRPG 系統', selectedValues('systems')], ['D&D 遊玩經驗', data.get('dndExperience')], ['玩過 Rugatha 劇本', data.get('rugathaExperience')],
    ['得知管道', selectedValues('sources')], ['不能接受的內容', String(data.get('boundaries')).trim() || '未填寫'], ['備註', String(data.get('notes')).trim() || '未填寫'],
  ];
  $('review-details').replaceChildren();
  answers.forEach(([key, value]) => addDetail($('review-details'), key, value));
  reviewTitle = `Rugatha 體驗團報名｜${config.scriptName || '最新一期'}｜${String(data.get('name')).trim()}`;
  reviewText = answers.map(([key, value]) => `${key}：${value}`).join('\n\n');
  const state = updateAvailability();
  $('submission-status').textContent = state.open ? '尚未送出。確認資料無誤後，請按下「送出報名」。' : state.note;
  $('copy-button').textContent = '複製報名內容';
  dialog.showModal();
});
for (const input of [$('name'), $('contact'), $('systems-other'), $('sources-other')]) input.addEventListener('input', () => input.setCustomValidity(''));
$('edit-button').addEventListener('click', () => dialog.close());
$('submit-button').addEventListener('click', async () => {
  if (submitting || submitted || !pendingRegistration) return;
  const state = updateAvailability();
  if (!state.open) { $('submission-status').textContent = state.note; return; }
  if (pendingRegistration.partySize > eventState.remainingSeats) { $('submission-status').textContent = '剩餘名額已變動，請返回修改報名人數。'; return; }
  submitting = true;
  $('submit-button').disabled = true;
  $('edit-button').disabled = true;
  $('submit-button').textContent = '正在送出…';
  $('submission-status').textContent = '正在儲存報名資料，請稍候。';
  try {
    const { createRegistrationId, saveRegistration } = await import('./firebase-registration.js');
    registrationId ||= createRegistrationId();
    await saveRegistration(registrationId, pendingRegistration);
    submitted = true;
    dialog.close();
    form.hidden = true;
    $('registration-intro').hidden = true;
    $('availability').hidden = true;
    const summary = $('success-details');
    summary.replaceChildren();
    [
      ['報名人', pendingRegistration.name],
      ['聯繫方式', pendingRegistration.contact],
      ['報名劇本', `《${config.scriptName}》`],
      ['跑團時間', `開始：${formatDate(config.startsAt)}\n結束：${formatDate(config.endsAt)}`],
      ['跑團地點', [config.location, config.locationNote].filter(Boolean).join(' · ')],
      ['報名人數', `${pendingRegistration.partySize} 人`],
      ['活動費用', `每人 NT$ ${config.fee}，共 NT$ ${config.fee * pendingRegistration.partySize}`],
    ].forEach(([label, value]) => addDetail(summary, label, value));
    $('registration-success').hidden = false;
    $('registration-success').focus();
  } catch (error) {
    const denied = ['permission-denied', 'registration-closed', 'registration-full', 'registration-unavailable'].includes(error.code);
    $('submission-status').textContent = denied
      ? '目前無法受理報名，場次可能已截止、額滿或暫停開放。資料尚未確認送達，請聯繫主辦方。'
      : '送出尚未完成，請確認網路後重試。填寫內容已保留在此頁；若問題持續，請聯繫主辦方。';
  } finally {
    submitting = false;
    $('edit-button').disabled = false;
    $('submit-button').disabled = submitted || !availability().open;
    $('submit-button').textContent = '送出報名 →';
    refreshSeats();
  }
});
dialog.addEventListener('cancel', (event) => { if (submitting) event.preventDefault(); });
$('copy-button').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(`${reviewTitle}\n\n${reviewText}`);
    $('copy-button').textContent = '已複製報名內容';
  } catch {
    $('submission-status').textContent = '無法存取剪貼簿，請直接選取上方文字複製。';
  }
});

$('review-button').disabled = false;
accessState.hidden = true;
$('registration-page').hidden = false;
refreshSeats();
try {
  const { watchEvent } = await import('./firebase-registration.js');
  watchEvent(config.eventId, (state) => {
    eventState = state; seatError = false; refreshSeats();
  }, () => { seatError = true; refreshSeats(); });
} catch { seatError = true; refreshSeats(); }
})().catch(() => {
  document.getElementById('registration-page').hidden = true;
  document.getElementById('access-state').hidden = false;
  document.getElementById('access-title').textContent = '暫時無法載入報名資訊';
  document.getElementById('access-message').textContent = '請稍後重新整理，或返回體驗團介紹。';
});
