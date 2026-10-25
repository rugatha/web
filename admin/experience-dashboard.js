import { cancelRegistration } from '../experience/register/registration-store.js';
import { dataTable, resetTablePage } from './data-table.js?v=20261025-admin-v5';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const answerText = value => Array.isArray(value) ? value.join('、') : value ?? '';
const dateText = value => value?.toDate ? value.toDate().toLocaleString('zh-TW', {timeZone:'Asia/Taipei',hour12:false}) : '未記錄';
export function createExperienceDashboard(context) {
  let rows = null, events = [], loading = false, busy = false, revision = 0;
  const valid = (ticket, auth) => context().authenticated && context().generation === auth && revision === ticket;
  async function load() {
    if (!context().authenticated || loading || busy) return;
    const {db,sdk,generation} = context(), ticket = ++revision;
    loading = true; $('experience-status').textContent = '正在讀取報名資料…';
    try {
      const results = await Promise.all(['experienceEvents','experienceRegistrations'].map(name => sdk.getDocs(sdk.collection(db,name))));
      if (!valid(ticket,generation)) return;
      [events,rows] = results.map(result => result.docs.map(doc => ({...doc.data(),id:doc.id})));
      const selected = $('experience-event').value;
      $('experience-event').replaceChildren(new Option('全部場次','all'));
      // Include legacy registrations even when their event record is missing.
      const ids = [...new Set([...events.map(e=>e.id),...rows.map(r=>r.eventId)])].sort().reverse();
      ids.forEach(id => $('experience-event').add(new Option(`${id} · ${events.find(e=>e.id===id)?.scriptName || '未記錄劇本'}`,id)));
      if (ids.includes(selected)) $('experience-event').value = selected;
      else if (ids.length === 1) $('experience-event').value = ids[0];
      $('experience-status').textContent = `已讀取 ${rows.length} 筆報名（含取消），更新於 ${new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}`;
      render();
    } catch {
      if (!valid(ticket,generation)) return;
      rows = null; $('experience-table').replaceChildren(); $('experience-seats').replaceChildren();
      $('experience-status').textContent = '無法讀取報名資料，請按「重新整理報名資料」重試。';
    } finally { if (valid(ticket,generation)) loading = false; }
  }
  function render() {
    if (!context().authenticated) return;
    if (rows === null) { if (!loading) void load(); return; }
    const selected = $('experience-event').value, search = $('experience-search').value.trim().toLowerCase();
    const scoped = rows.filter(row => selected === 'all' || row.eventId === selected);
    const active = scoped.filter(row => row.status !== 'cancelled');
    const people = active.reduce((sum,row)=>sum+row.partySize,0);
    const event = events.find(e=>e.id===selected);
    $('experience-seats').innerHTML = selected === 'all'
      ? `<p>全部場次：${active.length} 筆有效報名，共 ${people} 人；已取消 ${scoped.length-active.length} 筆。</p>`
      : `<p>${people} 人報名 / ${event?.maxPlayers ?? '未設定'} 人上限 · 有效 ${active.length} 筆 · 取消 ${scoped.length-active.length} 筆</p>${event ? `<div class="seat-boxes" role="img" aria-label="${people} 人已報名，${Math.max(0,event.maxPlayers-people)} 個空位">${Array.from({length:event.maxPlayers},(_,i)=>`<span class="seat-box ${i<people?'occupied':''}">${i<people?'已報名':'空位'}</span>`).join('')}</div>${event.registeredPlayers!==people?'<p class="form-error">場次統計與回覆人數不一致，請先執行場次同步。</p>':''}` : '<p>缺少場次設定，無法顯示剩餘名額。</p>'}`;
    const filtered = scoped.filter(row => Object.values(row).map(answerText).join(' ').toLowerCase().includes(search));
    dataTable('experience-table',[
      {id:'eventId',label:'場次',value:r=>r.eventId},
      {id:'createdAt',label:'報名時間',type:'date',value:r=>r.createdAt,html:r=>esc(dateText(r.createdAt))},
      {id:'name',label:'稱呼',value:r=>r.name},
      {id:'contact',label:'聯絡方式',value:r=>r.contact},
      {id:'partySize',label:'人數',type:'number',value:r=>r.partySize},
      {id:'status',label:'狀態',type:'category',value:r=>r.status==='cancelled'?'已取消':'有效',html:r=>r.status==='cancelled'?`已取消<small>${esc(dateText(r.cancelledAt))}</small>`:`有效 <button class="button" data-cancel-registration="${esc(r.id)}" ${busy?'disabled':''}>取消報名</button>`},
      ...[['systems','TRPG 系統'],['systemsOther','其他系統'],['dndExperience','D&D 經驗'],['rugathaExperience','Rugatha 經驗'],['sources','得知管道'],['sourcesOther','其他管道'],['boundaries','不能接受的內容'],['notes','備註']].map(([id,label])=>({id,label,value:r=>answerText(r[id])}))
    ],filtered);
  }
  $('experience-event').addEventListener('change',()=>{resetTablePage('experience-table');render();});
  $('experience-search').addEventListener('input',()=>{resetTablePage('experience-table');render();});
  $('experience-refresh').addEventListener('click',()=>void load());
  $('experience-table').addEventListener('click',async event=>{
    const button = event.target.closest('[data-cancel-registration]');
    if (!button || busy || loading || !context().authenticated) return;
    const row = rows.find(r=>r.id===button.dataset.cancelRegistration);
    if (!row || !window.confirm(`確定取消「${row.name}」的 ${row.partySize} 人報名？將保留填答並釋出名額。`)) return;
    const {db,sdk,generation} = context(), ticket=revision;
    busy=true; render();
    try {
      await cancelRegistration(db,row.id,sdk);
      if (!valid(ticket,generation)) return;
      busy=false; await load();
    } catch {
      if (valid(ticket,generation)) $('experience-status').textContent='取消失敗，請重新整理確認狀態後重試；若尚未部署新版 Firebase 規則，請先部署。';
    } finally { if (valid(ticket,generation)) {busy=false;render();} }
  });
  return { render, reset() {revision++;rows=null;events=[];loading=false;busy=false;$('experience-table').replaceChildren();$('experience-seats').replaceChildren();$('experience-search').value='';$('experience-event').replaceChildren(new Option('全部場次','all'));} };
}
