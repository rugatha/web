import { dataTable } from './data-table.js?v=20261026-experience-v3';
import { toDate } from './dashboard-model.js?v=20261025-admin-v5';
import { activeEmails, subscriptionRows, subscriptionSeries, subscriptionEventRows, normalizeEmail } from './subscriptions-model.js?v=20261101-history';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateText = value => {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date) : '未記錄';
};
export function createSubscriptionsDashboard(context) {
  let rows = null, events = [], loading = false, failed = false, revision = 0;
  const valid = (ticket, generation) => context().authenticated && context().generation===generation && revision===ticket;
  function clearView() {
    for (const id of ['subscriptions-table','subscriptions-trend','subscriptions-trend-note','subscriptions-summary','subscriptions-copy-status','subscriptions-history-table','subscriptions-history-summary']) $(id).replaceChildren();
    $('subscriptions-history-email').replaceChildren(new Option('全部訂閱者',''));
    for (const id of ['subscriptions-total','subscriptions-active','subscriptions-cancelled']) $(id).textContent='—';
    $('subscriptions-copy').disabled=true;
    $('subscriptions-copy-fallback').hidden=true;
    $('subscriptions-copy-emails').value='';
  }
  async function load() {
    if (!context().authenticated || loading) return;
    const {db,sdk,generation} = context(), ticket=++revision;
    loading=true; failed=false; rows=null; events=[]; clearView();
    $('subscriptions-refresh').disabled=true;
    $('subscriptions-status').textContent='正在讀取訂閱資料…';
    let timer;
    try {
      const result = await Promise.race([
        Promise.all([
          sdk.getDocs(sdk.collection(db,'experienceNewsletterSubscriptions')),
          sdk.getDocs(sdk.collection(db,'experienceNewsletterEvents')),
        ]),
        new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),20000);}),
      ]);
      if (!valid(ticket,generation)) return;
      rows=result[0].docs.map(doc=>({...doc.data(),id:doc.id}));
      events=result[1].docs.map(doc=>({...doc.data(),id:doc.id}));
      $('subscriptions-status').textContent=`已讀取 ${rows.length} 筆訂閱資料，更新於 ${dateText(new Date())}（台北）`;
      render();
    } catch {
      if (!valid(ticket,generation)) return;
      failed=true; clearView();
      $('subscriptions-status').textContent='無法讀取訂閱資料，請按「重新整理訂閱資料」重試。';
    } finally {
      clearTimeout(timer);
      if (valid(ticket,generation)) { loading=false; $('subscriptions-refresh').disabled=false; }
    }
  }
  function renderHistory() {
    if (!context().authenticated || rows===null) return;
    const select=$('subscriptions-history-email'), selected=select.value;
    const emails=[...new Set(events.map(event=>normalizeEmail(event.email)).filter(Boolean))].sort();
    select.replaceChildren(new Option('全部訂閱者',''),...emails.map(email=>new Option(email,email)));
    select.value=emails.includes(selected)?selected:'';
    const filtered=subscriptionEventRows(events).filter(event=>!select.value||normalizeEmail(event.email)===select.value);
    dataTable('subscriptions-history-table',[
      {id:'occurredAt',label:'事件時間',type:'date',value:row=>row.occurredAt,html:row=>{
        const date=toDate(row.occurredAt);
        return esc(date?new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date):'未記錄');
      },className:'nowrap'},
      {id:'email',label:'訂閱者 email',value:row=>row.email,className:'email'},
      {id:'action',label:'事件',type:'category',value:row=>row.actionLabel},
      {id:'reason',label:'退訂原因',value:row=>row.reasonText,className:'subscription-reason'},
    ],filtered,{defaultSort:{id:'occurredAt',direction:'desc'},onResult:visible=>{
      $('subscriptions-history-summary').textContent=`符合 ${visible.length} / ${events.length} 筆事件 · 每次實際訂閱與取消訂閱各保留一筆，時間以台北顯示。`;
    }});
  }
  function renderTrend() {
    const data=subscriptionSeries(rows), length=data.labels.length, max=Math.max(1,...data.values);
    const x=i=>50+(length===1?430:i/(length-1)*850), y=n=>185-n/max*150;
    const ticks=[...new Set([0,Math.ceil(max/2),max])];
    $('subscriptions-trend').innerHTML=`<svg viewBox="0 0 940 230" role="img" aria-label="${data.monthly?'每月':'每日'}累計訂閱總人數（含取消訂閱）"><title>累計訂閱總人數（含取消訂閱）</title>${ticks.map(n=>`<line x1="50" x2="900" y1="${y(n)}" y2="${y(n)}" stroke="#c6d5cd" stroke-dasharray="3 5"/><text x="8" y="${y(n)+4}">${n}</text>`).join('')}<polyline points="${data.values.map((n,i)=>`${x(i)},${y(n)}`).join(' ')}" fill="none" stroke="#28664d" stroke-width="2.5"/>${data.values.map((n,i)=>`<circle cx="${x(i)}" cy="${y(n)}" r="3" fill="#28664d"><title>${esc(data.labels[i])}：${n} 人</title></circle>`).join('')}${[...new Set([0,Math.floor((length-1)/2),length-1])].map(i=>`<text x="${x(i)}" y="219" text-anchor="${i===0?'start':i===length-1?'end':'middle'}">${esc(data.labels[i])}</text>`).join('')}</svg>`;
    $('subscriptions-trend-note').textContent=`依首次訂閱時間${data.monthly?'逐月':'逐日'}累計，含已取消訂閱者，重新訂閱不重複計算；非各日有效訂閱人數。台北時間，截至今天。${data.undated?`另有 ${data.undated} 筆未記錄首次訂閱時間，未納入折線圖。`:''}`;
  }
  function render() {
    if (!context().authenticated) return;
    if (rows===null) { if (!loading && !failed) void load(); return; }
    $('subscriptions-total').textContent=rows.length;
    $('subscriptions-active').textContent=rows.filter(row=>row.status==='active').length;
    $('subscriptions-cancelled').textContent=rows.filter(row=>row.status==='unsubscribed').length;
    $('subscriptions-copy').disabled=activeEmails(rows).length===0;
    renderTrend();
    renderHistory();
    dataTable('subscriptions-table',[
      {id:'email',label:'訂閱者 email',value:row=>row.email,className:'email'},
      {id:'status',label:'訂閱狀態',type:'category',value:row=>row.statusLabel},
      {id:'member',label:'會員',type:'category',value:row=>row.memberLabel},
      {id:'createdAt',label:'訂閱時間',type:'date',value:row=>row.createdAt,html:row=>esc(dateText(row.createdAt)),className:'nowrap'},
      {id:'unsubscribeReason',label:'退訂原因',value:row=>row.unsubscribeReason,className:'subscription-reason'},
    ],subscriptionRows(rows,context().members),{defaultSort:{id:'createdAt',direction:'desc'},onResult:filtered=>{
      $('subscriptions-summary').textContent=`符合 ${filtered.length} / ${rows.length} 筆訂閱資料 · 訂閱時間為首次訂閱時間。${context().members===null?(context().memberError?'會員資料讀取失敗，無法比對會員。':'會員資料讀取中，尚未完成比對。'):'會員依 email 比對，忽略大小寫與前後空白。'}`;
    }});
  }
  $('subscriptions-refresh').addEventListener('click',()=>void load());
  $('subscriptions-history-email').addEventListener('change',renderHistory);
  $('subscriptions-copy').addEventListener('click',async()=>{
    if (!context().authenticated || loading || rows===null) return;
    const emails=activeEmails(rows), text=emails.join(', '), ticket=revision, generation=context().generation;
    if (!emails.length) return;
    $('subscriptions-copy-fallback').hidden=true;
    $('subscriptions-copy-emails').value='';
    try {
      await navigator.clipboard.writeText(text);
      if (valid(ticket,generation)) $('subscriptions-copy-status').textContent=`已複製 ${emails.length} 個訂閱中的 email，可貼到 Gmail 收件者或密件副本欄位。`;
    } catch {
      if (!valid(ticket,generation)) return;
      $('subscriptions-copy-status').textContent='無法自動複製，請複製下方已選取的 email 清單。';
      $('subscriptions-copy-fallback').hidden=false;
      $('subscriptions-copy-emails').value=text;
      $('subscriptions-copy-emails').focus();$('subscriptions-copy-emails').select();
    }
  });
  return {render,reset() {
    revision++; rows=null; events=[]; loading=false; failed=false; clearView();
    $('subscriptions-status').textContent='';$('subscriptions-refresh').disabled=false;
  }};
}
