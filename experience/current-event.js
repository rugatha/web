import { parseExperienceInfo } from './register/settings.js';

const title = document.getElementById('current-experience-title');
const time = document.getElementById('current-experience-time');
const status = document.getElementById('current-experience-status');
const linkText = document.querySelector('#current-experience-link > span');
const subscribeText = document.querySelector('[data-current-subscribe-text]');
const english = () => document.documentElement.dataset.homeLang === 'en';
let info, seats, failed = false;
function renderStatus() {
  document.querySelector('.current-experience__eyebrow').textContent = english() ? 'LATEST EXPERIENCE SESSION' : '最新一期體驗團';
  subscribeText.textContent = english() ? 'Get adventure updates' : '訂閱體驗團快報';
  title.textContent = english() ? (info.scriptEnglishName || info.scriptName) : `《${info.scriptName}》`;
  const start = new Date(info.startsAt), end = new Date(info.endsAt);
  const dates = english() ? new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Taipei', year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'}) : date;
  time.textContent = `${english() ? 'Session: ' : '跑團時間：'}${dates.format(start)} ${clock.format(start)} – ${info.startDate === info.endDate ? '' : dates.format(end) + ' '}${clock.format(end)}`;
  let state = 'loading', text = '正在確認報名狀態…';
  if (info.active !== 'y') { state = 'closed'; text = '報名已截止'; }
  else if (seats?.remainingSeats === 0) { state = 'full'; text = '本期已額滿'; }
  else if (Date.now() > Date.parse(info.deadline) || (seats && (!seats.registrationOpen || Date.now() > seats.deadline))) {
    state = 'closed'; text = '報名已截止';
  } else if (failed) { state = 'unavailable'; text = '暫時無法確認名額，請稍後再試'; }
  else if (seats) { state = 'open'; text = '尚有名額'; }
  status.dataset.state = state;
  status.textContent = english() ? {loading: 'Checking availability…', closed: 'Registration closed', full: 'Fully booked', unavailable: 'Availability unavailable. Please try again later.', open: 'Seats available'}[state] : text;
  linkText.textContent = english() ? (state === 'open' ? 'Register for this session' : 'View registration') : state === 'open' ? '前往體驗團報名' : '查看報名頁面';
}
const date = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
});
const clock = new Intl.DateTimeFormat('zh-TW', {timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false});
try {
  const response = await fetch(new URL('./register/experience_info.json', import.meta.url), {cache: 'no-store'});
  if (!response.ok) throw new Error('Configuration unavailable');
  const raw = await response.json();
  if (!['y', 'n'].includes(raw.active)) throw new Error('Invalid active state');
  // Validate and format schedule information even while registration is disabled.
  info = {...parseExperienceInfo({...raw, active: 'y'}), active: raw.active};
  renderStatus();
} catch {
  title.textContent = '當期場次資訊暫時無法載入';
  status.textContent = '請稍後再試，或前往報名頁面查看';
  status.dataset.state = 'unavailable';
}
if (info) {
  window.addEventListener('rugatha:language-changed', renderStatus);
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
