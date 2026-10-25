import { newId, watchSlot, save } from './firebase-registration.js';
const times = Array.from({ length: 6 }, (_, i) => `${12 + i}:00-${13 + i}:00`);
const dates = { '2026-12-12': '12/12（六）', '2026-12-13': '12/13（日）' };
const availability = Object.fromEntries(Object.keys(dates).map(date => [date, times.map(() => null)]));
const form = document.querySelector('#boarding-form');
const date = form.elements.date;
const time = form.elements.time;
const party = form.elements.partySize;
const dialog = document.querySelector('#review-dialog');
let reviewText = '';
let pending = null;
let submissionId = null;
let sending = false;
let completed = false;
const slotId = (day, index) => `${day}-${12 + index}`;
const slots = {};
const loaded = new Set();
const reviewButton = document.querySelector('#review-button');
function refresh() {
  const ready = loaded.size === 12;
  reviewButton.disabled = !ready || sending || completed;
  document.querySelector('#connection-status').textContent = ready ? '名額已更新，歡迎登船報名！' : '正在讀取即時名額；若無法連線，請重新整理後再試。';
  renderSchedule();
  updateTimes();
}
function renderSchedule() {
  const body = document.querySelector('#schedule-body');
  body.replaceChildren();
  times.forEach((slot, index) => {
    const row = document.createElement('tr');
    for (const day of Object.keys(dates)) {
      const timeCell = document.createElement('td');
      timeCell.textContent = slot;
      row.append(timeCell);
      const remaining = Math.max(0, Math.min(2, availability[day][index]));
      for (let seat = 0; seat < 2; seat++) {
        const cell = document.createElement('td');
        const occupied = availability[day][index] !== null && seat < 2 - remaining;
        if (availability[day][index] === null) {
          cell.textContent = '載入中';
        } else if (occupied) {
          const icon = document.createElement('img');
          icon.src = '../../../../assets/logo/rugatha-icon.png';
          icon.alt = '已報名';
          icon.className = 'seat-icon';
          cell.append(icon);
        }
        cell.classList.toggle('is-occupied', occupied);
        cell.setAttribute('aria-label', `${dates[day]} ${slot} 船位 ${seat + 1}：${availability[day][index] === null ? '尚未取得名額' : occupied ? '已報名' : '可報名'}`);
        row.append(cell);
      }
    }
    body.append(row);
  });
}
renderSchedule();
function updateTimes() {
  const previous = time.value;
  time.replaceChildren(new Option(date.value ? '請選擇時段' : '請先選擇日期', ''));
  time.disabled = !date.value || loaded.size !== 12;
  if (date.value && loaded.size === 12) times.forEach((slot, i) => {
    const seats = Math.max(0, Math.min(2, availability[date.value][i]));
    const option = new Option(`${slot} ｜剩餘 ${seats} 人`, slot);
    const settings = slots[slotId(date.value, i)];
    option.disabled = seats < Number(party.value) || !settings?.registrationOpen || settings.deadline < Date.now();
    time.add(option);
    if (slot === previous && !option.disabled) time.value = previous;
  });
}
function cost() {
  return 300 + (form.elements.miniature.checked ? 500 : 0) + (form.elements.portrait.checked ? 200 : 0);
}
const money = value => `新臺幣 ${value.toLocaleString('zh-TW')}`;
form.addEventListener('change', event => {
  if (event.target === date) { time.value = ''; updateTimes(); }
  if (event.target === party) updateTimes();
  document.querySelector('#total').textContent = money(cost() * Number(party.value));
  document.querySelector('#cost-breakdown').textContent = `每人 ${money(cost())} × ${party.value} 人`;
});
form.addEventListener('submit', event => {
  event.preventDefault();
  if (sending || completed || loaded.size !== 12 || !form.reportValidity()) return;
  if (!form.elements.name.value.trim()) { form.elements.name.focus(); return; }
  const remaining = availability[date.value]?.[times.indexOf(time.value)] ?? 0;
  if (Number(party.value) > remaining) { updateTimes(); return; }
  const services = ['角色卡教學', ...(form.elements.miniature.checked ? ['3D 公仔印製'] : []), ...(form.elements.portrait.checked ? ['角色肖像圖繪製'] : [])];
  const details = [
    ['稱呼', form.elements.name.value.trim()], ['手機', form.elements.phone.value.trim()],
    ['報名時段', `${dates[date.value]} ${time.value}`], ['報名人數', `${party.value} 人`],
    ['服務種類（每人）', services.join('、')], ['預估費用', `${money(cost() * Number(party.value))}（每人 ${money(cost())}）`],
  ];
  const list = document.querySelector('#review-details');
  list.replaceChildren();
  for (const [label, value] of details) {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    row.append(term, description);
    list.append(row);
  }
  pending = { slotId: slotId(date.value, times.indexOf(time.value)), name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim(), partySize: Number(party.value), miniature: form.elements.miniature.checked, portrait: form.elements.portrait.checked, total: cost() * Number(party.value) };
  submissionId = newId();
  reviewText = '2026 龍山地下城 Rugatha D&D 創角報名（尚未送出）\n' + details.map(([label, value]) => `${label}：${value}`).join('\n');
  document.querySelector('#copy-status').textContent = '';
  document.querySelector('#submission-status').textContent = '請確認內容，按下「送出報名」才會正式保留船位。';
  dialog.showModal();
});
document.querySelector('#edit-button').addEventListener('click', () => dialog.close());
document.querySelector('#copy-button').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(reviewText);
    document.querySelector('#copy-status').textContent = '已複製報名內容；尚未正式送出。';
  } catch {
    document.querySelector('#copy-status').textContent = '無法存取剪貼簿，請選取上方內容手動複製。';
  }
});
document.querySelector('#submit-button').addEventListener('click', async () => {
  if (sending || !pending || completed) return;
  sending = true;
  const submit = document.querySelector('#submit-button');
  const edit = document.querySelector('#edit-button');
  submit.disabled = edit.disabled = true;
  document.querySelector('#submission-status').textContent = '正在送出，請稍候…';
  try {
    await save(submissionId, pending);
    completed = true;
    dialog.close();
    form.hidden = true;
    const success = document.querySelector('#registration-success');
    success.hidden = false;
    document.querySelector('#registration-reference').textContent = `報名編號：${submissionId}`;
    success.focus();
  } catch (error) {
    document.querySelector('#submission-status').textContent = error.code === 'permission-denied' ? '此時段可能已額滿或已截止，請返回修改後重試。' : `送出未完成：${error.message}。請確認連線後重試。`;
  } finally {
    sending = false;
    submit.disabled = edit.disabled = false;
    refresh();
  }
});
dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
for (const day of Object.keys(dates)) times.forEach((_, index) => {
  const id = slotId(day, index);
  watchSlot(id, slot => {
    slots[id] = slot;
    availability[day][index] = 2 - slot.registeredPlayers;
    loaded.add(id);
    refresh();
  }, () => {
    loaded.delete(id);
    availability[day][index] = null;
    refresh();
  });
});
