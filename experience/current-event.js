import { parseExperienceInfo } from './register/settings.js';

const title = document.getElementById('current-experience-title');
const time = document.getElementById('current-experience-time');
const status = document.getElementById('current-experience-status');
const linkText = document.querySelector('#current-experience-link > span');
let info, seats, failed = false;
function renderStatus() {
  let state = 'loading', text = '正在確認報名狀態…';
  if (info.active !== 'y') { state = 'closed'; text = '報名已截止'; }
  else if (seats?.remainingSeats === 0) { state = 'full'; text = '本期已額滿'; }
  else if (Date.now() > Date.parse(info.deadline) || (seats && (!seats.registrationOpen || Date.now() > seats.deadline))) {
    state = 'closed'; text = '報名已截止';
  } else if (failed) { state = 'unavailable'; text = '暫時無法確認名額，請稍後再試'; }
  else if (seats) { state = 'open'; text = '尚有名額'; }
  status.dataset.state = state;
  status.textContent = text;
  linkText.textContent = state === 'open' ? '前往體驗團報名' : '查看報名頁面';
}
const date = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
});
const clock = new Intl.DateTimeFormat('zh-TW', {timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false});
try {
  const response = await fetch('./register/experience_info.json', {cache: 'no-store'});
  if (!response.ok) throw new Error('Configuration unavailable');
  const raw = await response.json();
  if (!['y', 'n'].includes(raw.active)) throw new Error('Invalid active state');
  // Validate and format schedule information even while registration is disabled.
  info = {...parseExperienceInfo({...raw, active: 'y'}), active: raw.active};
  title.textContent = `《${info.scriptName}》`;
  const start = new Date(info.startsAt), end = new Date(info.endsAt);
  time.textContent = `跑團時間：${date.format(start)} ${clock.format(start)} – ${info.startDate === info.endDate ? '' : date.format(end) + ' '}${clock.format(end)}`;
  renderStatus();
} catch {
  title.textContent = '當期場次資訊暫時無法載入';
  status.textContent = '請稍後再試，或前往報名頁面查看';
  status.dataset.state = 'unavailable';
}
if (info) {
  setInterval(renderStatus, 30000);
  if (info.active === 'y') {
    try {
      const {watchEvent} = await import('./register/firebase-registration.js');
      watchEvent(info.eventId, value => {seats = value; failed = false; renderStatus();}, () => {
        seats = undefined; failed = true; renderStatus();
      });
    } catch { failed = true; renderStatus(); }
  }
}
