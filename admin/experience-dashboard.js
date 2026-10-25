import { cancelRegistration, updateRegistrationAdmin } from '../experience/register/registration-store.js';
import { dataTable, resetTablePage } from './data-table.js?v=20261026-experience-v3';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusText = row => row.status === 'cancelled' ? '已取消' : row.status === 'active' || !row.status ? '有效' : row.status;
const answerText = value => Array.isArray(value) ? value.join('、') : value ?? '';
const dateText = value => value?.toDate ? value.toDate().toLocaleString('zh-TW', {timeZone:'Asia/Taipei',hour12:false}) : '未記錄';
const scriptNames = { lorin: '洛林精神', echo: '龍鳴的回音', scroll: '金之堡的卷軸' };
export function experienceEventDate(id) {
  const match = /^(\d{4})-?(\d{2})(?:-(\d{1,2}))?(?:-|$)/.exec(id);
  return match ? `${match[1]}-${match[2]}${match[3] ? `-${match[3].padStart(2,'0')}` : ''}` : id;
}
export function experienceEventLabel(id, event) {
  const script = scriptNames[id.split('-').at(-1)] || event?.scriptName;
  return `${experienceEventDate(id)}${script ? ` · ${script}` : ''}`;
}
export function createExperienceDashboard(context) {
  let rows = null, events = [], currentConfig = null, loading = false, busy = false, revision = 0;
  const valid = (ticket, auth) => context().authenticated && context().generation === auth && revision === ticket;
  async function load() {
    if (!context().authenticated || loading || busy) return;
    const {db,sdk,generation} = context(), ticket = ++revision;
    loading = true; $('experience-status').textContent = '正在讀取報名資料…';
    try {
      const [results, config] = await Promise.all([
        Promise.all(['experienceEvents','experienceRegistrations'].map(name => sdk.getDocs(sdk.collection(db,name)))),
        fetch('../experience/register/experience_info.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw new Error('settings unavailable');return response.json();}).catch(()=>null)
      ]);
      if (!valid(ticket,generation)) return;
      currentConfig=config;
      [events,rows] = results.map(result => result.docs.map(doc => ({...doc.data(),id:doc.id})));
      const selected = $('experience-event').value;
      $('experience-event').replaceChildren(new Option('全部場次','all'));
      // Include legacy registrations even when their event record is missing.
      const ids = [...new Set([...events.filter(e=>!e.aliasOf).map(e=>e.id),...rows.map(r=>r.eventId)])].sort((a,b)=>experienceEventDate(b).localeCompare(experienceEventDate(a)));
      ids.forEach(id => $('experience-event').add(new Option(experienceEventLabel(id,events.find(e=>e.id===id)),id)));
      if (ids.includes(selected)) $('experience-event').value = selected;
      else if (ids.length === 1) $('experience-event').value = ids[0];
      $('experience-status').textContent = `已讀取 ${rows.length} 筆報名（含取消），更新於 ${new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}`;
      render();
    } catch {
      if (!valid(ticket,generation)) return;
      rows = null; $('experience-table').replaceChildren(); $('experience-seats').replaceChildren(); $('experience-current').replaceChildren();
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
    const currentEvent=events.find(e=>e.id===currentConfig?.eventId && !e.aliasOf);
    const currentRows=rows.filter(r=>r.eventId===currentConfig?.eventId && r.status!=='cancelled');
    const currentPeople=currentRows.reduce((sum,row)=>sum+row.partySize,0);
    $('experience-current').innerHTML=`<h2>本次報名狀況</h2>${currentEvent
      ? `<p>${esc(experienceEventLabel(currentEvent.id,currentEvent))} · ${currentEvent.registrationOpen?'報名開放':'報名已關閉'}</p><p>${currentPeople} 人報名 / ${currentEvent.maxPlayers} 人上限 · 剩餘 ${Math.max(0,currentEvent.maxPlayers-currentPeople)} 位</p><div class="seat-boxes" role="img" aria-label="${currentPeople} 人已報名，${Math.max(0,currentEvent.maxPlayers-currentPeople)} 個空位">${Array.from({length:currentEvent.maxPlayers},(_,i)=>`<span class="seat-box ${i<currentPeople?'occupied':''}">${i<currentPeople?'已報名':'空位'}</span>`).join('')}</div>${currentEvent.registeredPlayers!==currentPeople?'<p class="form-error">場次統計與回覆人數不一致，請先執行場次同步。</p>':''}`
      : '<p>無法讀取本次場次設定，請重新整理報名資料。</p>'}`;
    $('experience-seats').innerHTML = selected === 'all'
      ? `<p>全部場次：${active.length} 筆有效報名，共 ${people} 人；已取消 ${scoped.length-active.length} 筆。</p>`
      : `<p>${esc(experienceEventLabel(selected,event))}：${people} 人報名 · 有效 ${active.length} 筆 · 取消 ${scoped.length-active.length} 筆</p>`;
    const filtered = scoped.filter(row => [experienceEventLabel(row.eventId,events.find(e=>e.id===row.eventId)),...Object.entries(row).filter(([key])=>!key.startsWith('history')).map(([,value])=>answerText(value))].join(' ').toLowerCase().includes(search));
    dataTable('experience-table',[
      {id:'eventId',label:'場次',value:r=>experienceEventLabel(r.eventId,events.find(e=>e.id===r.eventId))},
      {id:'createdAt',label:'報名時間',type:'date',value:r=>r.createdAt,html:r=>esc(dateText(r.createdAt))},
      {id:'name',label:'稱呼',value:r=>r.name},
      {id:'contact',label:'聯絡方式',value:r=>r.contact},
      {id:'partySize',label:'人數',type:'number',value:r=>r.partySize},
      {id:'status',label:'狀態',type:'category',value:statusText,html:r=>`${esc(statusText(r))}<br><button class="button" data-edit-registration="${esc(r.id)}" ${busy?'disabled':''}>編輯狀態／備註</button>${r.status==='cancelled'?`<small>${esc(dateText(r.cancelledAt))}</small>`:` <button class="button" data-cancel-registration="${esc(r.id)}" ${busy?'disabled':''}>取消報名</button>`}`},
      ...[['systems','TRPG 系統'],['systemsOther','其他系統'],['dndExperience','D&D 經驗'],['rugathaExperience','Rugatha 經驗'],['sources','得知管道'],['sourcesOther','其他管道'],['boundaries','不能接受的內容'],['notes','備註']].map(([id,label])=>({id,label,value:r=>answerText(r[id])})),
      {id:'DM_Note',label:'DM_Note',value:r=>r.DM_Note || ''}
    ],filtered,{defaultSort:{id:'createdAt',direction:'desc'},lockOrder:true,frozenColumns:['eventId','createdAt','name']});
  }
  $('experience-event').addEventListener('change',()=>{resetTablePage('experience-table');render();});
  $('experience-search').addEventListener('input',()=>{resetTablePage('experience-table');render();});
  $('experience-refresh').addEventListener('click',()=>void load());
  const editor = $('experience-editor');
  let editingId = null;
  $('experience-edit-cancel').addEventListener('click',()=>editor.close());
  $('experience-edit-form').addEventListener('submit',async event=>{
    event.preventDefault();
    if (busy || !context().authenticated || !editingId) return;
    const {db,sdk,generation} = context(), ticket=revision;
    busy=true; $('experience-edit-save').disabled=true; $('experience-edit-error').textContent='';
    try {
      await updateRegistrationAdmin(db,editingId,{status:$('experience-edit-status').value,DM_Note:$('experience-edit-note').value},sdk);
      if (!valid(ticket,generation)) return;
      editor.close(); busy=false; await load();
    } catch (error) {
      if (valid(ticket,generation)) $('experience-edit-error').textContent=`儲存失敗：${error.message}。請確認資料後重試。`;
    } finally { if (valid(ticket,generation)) {busy=false;$('experience-edit-save').disabled=false;render();} }
  });
  $('experience-table').addEventListener('click',async event=>{
    const edit = event.target.closest('[data-edit-registration]');
    if (edit && !busy && !loading && context().authenticated) {
      const row=rows.find(r=>r.id===edit.dataset.editRegistration);
      if (!row) return;
      editingId=row.id; $('experience-edit-title').textContent=`${row.name} · ${experienceEventLabel(row.eventId,events.find(e=>e.id===row.eventId))}`;
      $('experience-edit-status').value=row.status || 'active';
      $('experience-edit-note').value=row.DM_Note || '';
      $('experience-edit-error').textContent=''; editor.showModal(); return;
    }
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
  return { render, reset() {editor.close();editingId=null;revision++;rows=null;events=[];currentConfig=null;loading=false;busy=false;$('experience-table').replaceChildren();$('experience-seats').replaceChildren(); $('experience-current').replaceChildren();$('experience-search').value='';$('experience-event').replaceChildren(new Option('全部場次','all'));} };
}
