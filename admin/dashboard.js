import { createExperienceDashboard } from './experience-dashboard.js?v=20261026-5';
import { getSiteAuth } from '/shared/auth-session.js?v=20261019-character-books-1';
import { MIN_DATE, answerScope, isDashboardAdmin, toDate, dayKey, dateOffset, dateBounds, inRange, presetRange, fateRows, npcValues, kingdomIndex, groupNpcs, activitySeries, memberUrl, characterUrl } from './dashboard-model.js?v=20261025-admin-v5';
import { dataTable,resetTablePages,resetTablePage,clearTableData } from './data-table.js?v=20261026-experience-v3';
const $ = id => document.getElementById(id);
const fmt = value => value == null ? '—' : new Intl.NumberFormat('zh-TW').format(value);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const empty = message => `<div class="empty">${esc(message)}</div>`;
const dateText = value => {
  const date=toDate(value);
  return date ? new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date) : '未記錄';
};
const screens = {
  overview:['管理總覽','檢視網站內容總量與所選期間的新增資料。'],
  campaigns:['團務與章節','依團務、故事弧檢視已刊載章節，可展開查看章節明細。'],
  experience:['體驗團報名','依場次檢視完整填答與名額，管理狀態、DM_Note 與取消報名。'],
  members:['會員管理','查看會員清單、註冊時間、最後登入時間及關聯資料。'],
  characters:['角色卡','查看每張角色卡的建立者、職業、種族與建立時間。'],
  npcs:['NPC 統計','依宗教、性別、所在王國、種族等面向分析 NPC。'],
  fate:['命運的抉擇','總覽各 NPC 的題目、選項、答題數與選項比例。']
};
const blankState = () => ({catalog:null,npcs:null,kingdoms:new Map(),members:null,characters:null,choices:null,errors:{}});
let state=blankState(), authenticated=false, generation=0, db, sdk, range=presetRange('all'), screen='overview';
const experience = createExperienceDashboard(() => ({ authenticated, generation, db, sdk }));
let sliderMin=MIN_DATE, today=dayKey(new Date());
function notice(message) { const node=document.createElement('div');node.className='notice';node.textContent=message;$('notices').append(node); }
function failBoot() { authenticated=false;generation++;state=blankState();clearTableData();experience.reset();window.RUGATHA_ADMIN_BOOT?.fail(); }
function deny() {
  window.RUGATHA_ADMIN_BOOT?.ready();authenticated=false;generation++;state=blankState();clearTableData();experience.reset();
  $('dashboard').hidden=true;$('dashboard').replaceChildren();$('gate').hidden=false;$('gate').textContent='404 · Page not found';location.replace('/404/');
}
const count = (id,value) => { $(id).textContent=fmt(value); };
const missing = kind => state.errors[kind] ? `${state.errors[kind]}，請重新載入頁面重試。` : '正在讀取資料…';
function memberName(member) { return member?.profile?.title || member?.displayName || '未設定名稱'; }
function memberIdentity(member) { return `<a href="${esc(memberUrl(member))}">${esc(memberName(member))} ↗</a><small>${esc(member.memberNo || member.id)}</small>`; }
function timeSort(a,b,field) { return (toDate(b[field])?.getTime() || 0)-(toDate(a[field])?.getTime() || 0); }
function syncSliderDomain() {
  today=dayKey(new Date());sliderMin=MIN_DATE;
  const max=Math.max(1,Math.round((new Date(today)-new Date(sliderMin))/86400000));
  const from=range?.from || sliderMin,to=range?.to || today;
  for(const id of ['range-from','range-to']) $(id).max=String(max);
  const left=Math.round((new Date(from)-new Date(sliderMin))/86400000),right=Math.round((new Date(to)-new Date(sliderMin))/86400000);
  $('range-from').value=String(left);$('range-to').value=String(right);
  $('range-from').setAttribute('aria-valuetext',from);$('range-to').setAttribute('aria-valuetext',to);
  $('range-fill').style.left=`${left/max*100}%`;$('range-fill').style.right=`${100-right/max*100}%`;
  $('slider-min-label').textContent=sliderMin;$('slider-max-label').textContent=today;
  $('date-from').max=today;$('date-to').max=today;
}
function setRange(next, preset='custom') {
  range=next;resetTablePages();
  $('date-from').value=range?.from || '';$('date-to').value=range?.to || '';
  $('range-label').textContent=`${range.from} — ${range.to}`;
  $('date-error').hidden=true;
  document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===preset)));
  syncSliderDomain();renderActive();
}
function applyDates() {
  try {
    if($('date-to').value>today) throw new Error('結束日期不能晚於今天。');
    setRange(dateBounds($('date-from').value,$('date-to').value));
  } catch(error) { $('date-error').textContent=error.message;$('date-error').hidden=false; }
}
function trend(target, groups, labels) {
  if(groups.some(group=>group===null)) { $(target).innerHTML=empty('會員或角色卡資料尚未完整讀取。');return; }
  const data=activitySeries(groups,range), max=Math.max(1,...data.series.flat()), length=data.labels.length;
  const x=index=>44+(length<=1 ? 0 : index/(length-1)*860), y=value=>188-value/max*155;
  const ticks=[...new Set([0,Math.ceil(max/2),max])];
  const colors=['#28664d','#ac7b3d'];
  $(target).innerHTML=`<svg viewBox="0 0 940 230" role="img" aria-label="${data.monthly?'每月':'每日'}新增會員與角色卡數量">${ticks.map(n=>`<line x1="44" x2="910" y1="${y(n)}" y2="${y(n)}" stroke="#c6d5cd" stroke-dasharray="3 5"/><text x="8" y="${y(n)+4}">${n}</text>`).join('')}${data.series.map((values,j)=>`<polyline points="${values.map((n,i)=>`${x(i)},${y(n)}`).join(' ')}" fill="none" stroke="${colors[j]}" stroke-width="2.5"/>${values.map((n,i)=>n?`<circle cx="${x(i)}" cy="${y(n)}" r="3" fill="${colors[j]}"><title>${esc(data.labels[i])} ${esc(labels[j])}：${n}</title></circle>`:'').join('')}`).join('')}${[...new Set([0,Math.floor((length-1)/2),length-1])].map(i=>`<text x="${x(i)}" y="219" text-anchor="${i===0?'start':i===length-1?'end':'middle'}">${esc(data.labels[i])}</text>`).join('')}</svg>`;
  $('trend-note').textContent=`${data.monthly?'依月':'依日'}彙整。日期區間包含起訖日；未記錄建立時間的資料不納入趨勢圖。`;
}
function renderOverview() {
  count('overview-members',state.members?.length);count('overview-characters',state.characters?.length);count('overview-npcs',state.npcs?.length);
  count('overview-arcs',state.catalog?.campaigns.flatMap(c=>c.arcs).length);count('overview-chapters',state.catalog?.campaigns.flatMap(c=>c.arcs).reduce((n,a)=>n+a.chapters,0));
  count('overview-new-members',state.members?.filter(m=>inRange(m.createdAt,range)).length);
  count('overview-new-characters',state.characters?.filter(c=>inRange(c.createdAt,range)).length);
  const scope=state.choices?answerScope(state.choices,range):null;
  count('overview-answers',scope?.dated.length);
  $('overview-undated').textContent=scope?.undated.length?`另 ${scope.undated.length} 筆日期未記錄，查看歷史作答 ↗`:'';
  trend('overview-trend',[state.members,state.characters],['新增會員','新建角色卡']);
}
function renderCampaigns() {
  if(!state.catalog) { $('campaign-list').innerHTML=empty(missing('static'));return; }
  const filter=$('campaign-filter').value, search=$('arc-search').value.trim().toLowerCase();
  const campaigns=state.catalog.campaigns.filter(c=>filter==='all'||filter===c.status||filter===c.name).map(c=>({...c,arcs:c.arcs.filter(a=>`${a.id} ${a.title}`.toLowerCase().includes(search))})).filter(c=>!search||c.arcs.length);
  count('campaign-count',campaigns.length);count('arc-count',campaigns.flatMap(c=>c.arcs).length);count('chapter-count',campaigns.flatMap(c=>c.arcs).reduce((n,a)=>n+a.chapters,0));
  $('campaign-list').innerHTML=campaigns.map(c=>`<article class="campaign-card"><div class="campaign-heading"><h2>${esc(c.name)} <span class="status ${c.status==='closed'?'closed':''}">${c.status==='closed'?'已結團':'進行中'}</span></h2><span>${c.arcs.length} 故事弧 · ${c.arcs.reduce((n,a)=>n+a.chapters,0)} 章</span></div>${c.arcs.length?c.arcs.map(a=>`<details class="arc"><summary><span class="arc-code">${esc(a.id)}</span><span class="arc-title">${esc(a.title)}</span><small>${a.chapters} 個章節</small></summary><ol class="chapter-list">${a.chapterList.map(ch=>`<li><a href="${esc(ch.url)}"><span>${esc(ch.title)}</span><small>${esc(ch.id)} ↗</small></a></li>`).join('') || '<li class="hint">尚無已刊載章節。</li>'}</ol></details>`).join(''):empty('此團務尚無已刊載故事弧。')}</article>`).join('') || empty('沒有符合條件的團務或故事弧。');
}
function renderMembers() {
  if(!state.members){['member-filtered','member-total','member-logins'].forEach(id=>count(id,null));$('member-table').innerHTML=empty(missing('members'));return;}
  const search=$('member-search').value.trim().toLowerCase(),field=$('member-date-field').value;
  const rows=state.members.filter(m=>inRange(m[field],range)&&`${m.id} ${m.memberNo || ''} ${memberName(m)} ${m.displayName || ''} ${m.email || ''}`.toLowerCase().includes(search)).sort((a,b)=>String(a.memberNo||a.id).localeCompare(String(b.memberNo||b.id),'en',{numeric:true}));
  count('member-total',state.members.length);count('member-logins',state.members.filter(m=>m.lastLoginAt&&inRange(m.lastLoginAt,range)).length);
  const cardCount=m=>state.characters?state.characters.filter(c=>c.memberKey===m.id).length:null;
  const answerCount=m=>state.choices?state.choices.filter(c=>c.memberKey===m.id&&['C1','C2'].includes(c.choice)).length:null;
  dataTable('member-table',[
    {id:'number',label:'會員編號',value:m=>m.memberNo||m.id,className:'nowrap'},
    {id:'name',label:'會員名稱',value:m=>memberName(m),html:m=>`<a href="${esc(memberUrl(m))}">${esc(memberName(m))} ↗</a>`,className:'identity'},
    {id:'email',label:'Email',value:m=>m.email||'未記錄',className:'email'},
    ...[['createdAt','註冊時間'],['lastLoginAt','最後登入時間']].map(([id,label])=>({id,label,type:'date',value:m=>m[id],html:m=>esc(dateText(m[id])),className:'nowrap'})),
    {id:'cards',label:'角色卡數',type:'number',value:cardCount,html:m=>fmt(cardCount(m))},
    {id:'answers',label:'累計答題數',type:'number',value:answerCount,html:m=>fmt(answerCount(m))}
  ],rows,{onResult:filtered=>{
    count('member-filtered',filtered.length);
    $('member-summary').textContent=`符合 ${filtered.length} / ${state.members.length} 位會員 · 日期依「${field==='createdAt'?'註冊時間':'最後登入時間'}」篩選；未記錄此時間者不列入。角色卡與答題欄為累計數。`;
  }});
}
function renderCharacters() {
  if(!state.characters){['character-filtered','character-creators','character-total'].forEach(id=>count(id,null));$('character-table').innerHTML=empty(missing('characters'));return;}
  const search=$('character-search').value.trim().toLowerCase(),field=$('character-date-field').value;
  const rows=state.characters.filter(c=>inRange(c[field],range)&&`${c.characterName} ${memberName(c.owner)} ${c.owner.displayName || ''} ${c.owner.email || ''} ${c.owner.memberNo || ''} ${c.className} ${c.race}`.toLowerCase().includes(search)).sort((a,b)=>timeSort(a,b,'createdAt'));
  count('character-total',state.characters.length);
  dataTable('character-table',[
    {id:'name',label:'角色名稱',value:c=>c.characterName,html:c=>`<a href="${esc(characterUrl(c))}">${esc(c.characterName)} ↗</a>`,className:'identity'},
    {id:'creator',label:'建立者',value:c=>memberName(c.owner),html:c=>memberIdentity(c.owner),className:'identity'},
    {id:'email',label:'建立者 Email',value:c=>c.owner.email||'未記錄',className:'email'},
    {id:'class',label:'職業',type:'category',value:c=>c.className||'未設定'},
    {id:'race',label:'種族',type:'category',value:c=>c.race||'未設定'},
    ...[['createdAt','建立時間'],['updatedAt','更新時間']].map(([id,label])=>({id,label,type:'date',value:c=>c[id],html:c=>esc(dateText(c[id])),className:'nowrap'}))
  ],rows,{onResult:filtered=>{
    count('character-filtered',filtered.length);count('character-creators',new Set(filtered.map(c=>c.memberKey)).size);
    $('character-summary').textContent=`符合 ${filtered.length} / ${state.characters.length} 張角色卡 · 日期依「${field==='createdAt'?'建立時間':'更新時間'}」篩選。`;
  }});
}
const dimensions={religion:'宗教',gender:'性別',kingdom:'所在王國',race:'種族',status:'生存狀態',location:'所在地點'};
function populateNpcCategories() {
  const dim=$('npc-dimension').value,old=$('npc-category').value;
  $('npc-category').replaceChildren(new Option('全部分類','all'));
  groupNpcs(state.npcs || [],dim,state.kingdoms).forEach(g=>$('npc-category').add(new Option(`${g.label}（${g.count}）`,g.label)));
  if([...$('npc-category').options].some(o=>o.value===old)) $('npc-category').value=old;
}
function renderNpcOverview() {
  const colors=['#2d7055','#85b69b','#c4a16c','#839db8','#b1777c','#c6d2b8','#959b90'];
  $('npc-overview-charts').innerHTML=['gender','status','religion','race','kingdom','location'].map(dim=>{
    const groups=groupNpcs(state.npcs,dim,state.kingdoms),total=groups.reduce((sum,g)=>sum+g.count,0),single=total===state.npcs.length;
    const parts=groups.length>6?[...groups.slice(0,5),{label:`其餘 ${groups.length-5} 個分類`,count:groups.slice(5).reduce((sum,g)=>sum+g.count,0)}]:groups;
    let degrees=0;
    const gradient=parts.map((g,i)=>{const start=degrees;degrees+=total?g.count/total*360:0;return `${colors[i]} ${start}deg ${degrees}deg`;}).join(',');
    return `<article class="pie-card"><h3>${dimensions[dim]}</h3><div class="pie-layout"><div class="npc-pie" style="background:conic-gradient(${gradient||'#e0e8e2'})" role="img" aria-label="${esc(dimensions[dim])}分類占比：${esc(parts.map(g=>`${g.label} ${g.count} 人次，占 ${(g.count/total*100).toFixed(1)}%`).join('；'))}"><div><strong>${state.npcs.length}</strong><span>位 NPC</span></div></div><ul class="pie-legend">${parts.map((g,i)=>`<li><span class="pie-dot" style="background:${colors[i]}"></span><span>${esc(g.label)}</span><b>${g.count} <small>${(g.count/total*100).toFixed(1)}%</small></b></li>`).join('')}</ul></div><p>${single?`分母：${total} 位 NPC，每位計一次。`:`分母：${total} 分類人次；一人可有多個分類。`}</p></article>`;
  }).join('');
}
function renderNpcs() {
  if(!state.npcs){$('npc-overview-charts').innerHTML=empty(missing('static'));$('npc-chart').innerHTML=empty(missing('static'));$('npc-table').innerHTML=empty(missing('static'));return;}
  renderNpcOverview();
  const dim=$('npc-dimension').value,category=$('npc-category').value,search=$('npc-search').value.trim().toLowerCase();
  const rows=state.npcs.filter(n=>`${n.nameZh} ${n.nameEn}`.toLowerCase().includes(search)&&(category==='all'||npcValues(n,dim,state.kingdoms).includes(category))).sort((a,b)=>(a.nameZh||a.nameEn).localeCompare(b.nameZh||b.nameEn,'zh-Hant'));
  count('npc-total',state.npcs.length);$('npc-chart-title').textContent=dimensions[dim]+'分布';
  dataTable('npc-table',[
    {id:'name',label:'NPC',value:n=>`${n.nameZh || ''} ${n.nameEn || ''}`,html:n=>`<a href="/${esc(n.url)}">${esc(n.nameZh||n.nameEn)} ↗</a><small>${esc(n.nameEn)}</small>`,className:'identity'},
    ...['gender','race','religion','kingdom','location','status'].map(id=>({id,label:dimensions[id],type:'category',value:n=>npcValues(n,id,state.kingdoms)}))
  ],rows,{onResult:filtered=>{
    const groups=groupNpcs(filtered,dim,state.kingdoms);count('npc-filtered',filtered.length);count('npc-groups',groups.length);
    $('npc-method').textContent=`分母：下方明細符合篩選的 ${filtered.length} 位 NPC。同一 NPC 在同一分類只計一次，跨分類可重複計入，占比總和可能超過 100%。${dim==='kingdom'?'王國依所在地點對應；無法對應者列為「未能對應」。':''}`;
    $('npc-chart').innerHTML=groups.length?groups.map(g=>`<div class="distribution-row"><span>${esc(g.label)}</span><div class="distribution-track"><div class="distribution-bar" style="width:${g.share}%"></div></div><span>${g.count} 人 · ${g.share.toFixed(1)}%</span></div>`).join(''):empty('沒有符合條件的 NPC。');
    dataTable('npc-group-table',[
      {id:'category',label:'分類',value:g=>g.label},
      {id:'count',label:'NPC 數',type:'number',value:g=>g.count},
      {id:'share',label:'占符合人數 %',type:'number',value:g=>g.share,html:g=>g.share.toFixed(1)+'%'}
    ],groups,{paginate:false});
    $('npc-summary').textContent=`符合 ${filtered.length} / ${state.npcs.length} 位`;
  }});
}
function renderFate() {
  if(!state.npcs || !state.choices){$('fate-date-quality').textContent='';['fate-answers','fate-members','fate-answered','fate-questions'].forEach(id=>count(id,null));$('fate-table').innerHTML=empty(missing(state.npcs?'choices':'static'));return;}
  const search=$('fate-search').value.trim().toLowerCase(),showUnanswered=$('fate-show-unanswered').checked;
  const scope=answerScope(state.choices,range,$('fate-include-undated').checked);
  const choices=scope.selected;
  $('fate-date-quality').textContent=`資料完整性：累計 ${scope.valid.length} 筆回答、${new Set(scope.valid.map(c=>c.memberKey)).size} 位會員；所選日期區間內有 ${scope.dated.length} 筆具有效日期的回答，另有 ${scope.undated.length} 筆歷史回答未記錄日期。${$('fate-include-undated').checked?'目前表格納入日期未記錄的回答，這些回答無法確認是否發生在所選區間。':'目前表格僅顯示所選區間內、日期已知的回答。'}`;
  const name=row=>row.npc?.nameZh || row.npc?.nameEn || row.path;
  const question=row=>row.npc?.qaZh?.Q||row.npc?.qaEn?.Q||'目前 NPC 目錄沒有此題目的文字，保留歷史作答統計。';
  const rows=fateRows(state.npcs,choices).filter(row=>`${row.npc?.nameZh||''} ${row.npc?.nameEn||''} ${question(row)} ${row.npc?.qaZh?.C1||''} ${row.npc?.qaZh?.C2||''} ${row.path}`.toLowerCase().includes(search)&&(showUnanswered||row.total>0)).sort((a,b)=>b.total-a.total||name(a).localeCompare(name(b),'zh-Hant'));
  const answerHtml=(row,key)=>{const n=row[key],percent=row.total?n/row.total*100:null;return `<div class="answer-label">${esc(row.npc?.qaZh?.[key==='c1'?'C1':'C2']||row.npc?.qaEn?.[key==='c1'?'C1':'C2']||'原題目選項未在目前目錄中')}</div><div class="answer-bar-track"><div class="answer-bar ${key==='c2'?'secondary':''}" style="width:${percent||0}%"></div></div><div class="answer-stat">${n} 筆 · <b>${percent===null?'—':percent.toFixed(1)+'%'}</b></div>`;};
  dataTable('fate-table',[
    {id:'name',label:'NPC',value:name,html:row=>row.npc?`<a href="/${esc(row.npc.url)}">${esc(name(row))} ↗</a><small>${esc(row.npc.nameEn)}</small>`:`${esc(row.path)}<small>歷史題目</small>`,className:'identity'},
    {id:'question',label:'題目',value:question,className:'question-text'},
    ...['c1','c2'].map((key,index)=>({id:key,label:`選項${index?'二':'一'}／比例 %`,type:'number',value:row=>row.total?row[key]/row.total*100:null,html:row=>answerHtml(row,key)})),
    {id:'total',label:'總回答',type:'number',value:row=>row.total,html:row=>`${row.total}<small>${row.total?'筆回答':'尚無作答'}</small>`,className:'fate-number'}
  ],rows,{paginate:false,onResult:filtered=>{
    const answers=filtered.flatMap(row=>row.answers);count('fate-answers',answers.length);count('fate-members',new Set(answers.map(a=>a.memberKey)).size);count('fate-answered',filtered.filter(r=>r.total).length);count('fate-questions',filtered.length);
    $('fate-summary').textContent=`符合 ${filtered.length} 道題目 · ${answers.length} 筆有效回答。${showUnanswered?'包含此期間無人作答的題目。':'已隱藏此期間無人作答的題目；可勾選顯示。'}`;
  }});
}
function renderActive() {
  if(!authenticated) return;
  const renders={experience:experience.render,overview:renderOverview,campaigns:renderCampaigns,members:renderMembers,characters:renderCharacters,npcs:renderNpcs,fate:renderFate};
  renders[screen]();
}
function route() {
  const requested=location.hash.slice(1);screen=screens[requested]?requested:'overview';
  document.querySelectorAll('[data-screen]').forEach(node=>node.hidden=node.dataset.screen!==screen);
  document.querySelectorAll('[data-nav]').forEach(node=>{if(node.dataset.nav===screen)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current');});
  $('breadcrumb').textContent=screens[screen][0];$('screen-title').textContent=screens[screen][0];$('screen-description').textContent=screens[screen][1];
  document.title=screens[screen][0]+' | Rugatha';
  $('date-controls').hidden = screen === 'experience';
  document.querySelectorAll('[data-time-field]').forEach(node=>node.hidden=node.dataset.timeField!==screen);
  renderActive();
}
async function withTimeout(promise) {
  let timer;
  try { return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('timeout'),{code:'讀取逾時'})),20000);})]); }
  finally { clearTimeout(timer); }
}
async function fetchJson(path) { const response=await withTimeout(fetch(path,{cache:'no-store'}));if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json(); }
async function loadData() {
  if(!authenticated) return;
  const ticket=++generation,current=()=>authenticated&&ticket===generation;
  state=blankState();$('notices').replaceChildren();$('sync-status').textContent='正在讀取資料…';renderActive();
  const read=async path=>(await withTimeout(sdk.getDocs(sdk.collection(db,...path.split('/'))))).docs.map(d=>({...d.data(),id:d.id}));
  const results=await Promise.allSettled([
    (async()=>{
      const [catalog,npcs,atlas]=await Promise.all([fetchJson('./catalog.json'),fetchJson('/npc/data/characters.json'),fetchJson('/map/location/assets/location.json')]);
      if(!current())return;state.catalog=catalog;state.npcs=npcs;state.kingdoms=kingdomIndex(atlas);
      const selected=$('campaign-filter').value;$('campaign-filter').replaceChildren(new Option('全部團務','all'),new Option('進行中','active'),new Option('已結團','closed'));
      catalog.campaigns.forEach(c=>$('campaign-filter').add(new Option(c.name,c.name)));$('campaign-filter').value=selected || 'all';populateNpcCategories();renderActive();
    })(),
    (async()=>{
      const members=await read('members');if(!current())return;state.members=members;syncSliderDomain();renderActive();
      const characters=[],choices=[];let charError=false,choiceError=false;
      for(let i=0;i<members.length;i+=8) {
        if(!current())return;
        await Promise.all(members.slice(i,i+8).map(async member=>{
          const [chars,answers]=await Promise.allSettled([read(`members/${member.id}/characters`),read(`members/${member.id}/qaChoices`)]);
          if(chars.status==='fulfilled') characters.push(...chars.value.map(c=>({id:c.id,characterName:c.characterName || decodeName(c.id),className:c.className || '',race:c.race || '',createdAt:c.createdAt,updatedAt:c.updatedAt,ownerId:member.memberId || member.id,memberKey:member.id,owner:member})));else charError=true;
          if(answers.status==='fulfilled') choices.push(...answers.value.map(q=>({createdAt:q.createdAt,choice:q.choice,questionPage:q.questionPage,memberKey:member.id})));else choiceError=true;
        }));
      }
      if(!current())return;
      if(charError){state.errors.characters='角色卡未完整讀取';notice('部分角色卡讀取失敗，角色卡總數與清單暫不顯示，避免誤用部分數據。');}else state.characters=characters;
      if(choiceError){state.errors.choices='答題資料未完整讀取';notice('部分答題資料讀取失敗，答題數與比例暫不顯示。');}else state.choices=choices;
      syncSliderDomain();renderActive();
    })()
  ]);
  if(!current())return;
  results.forEach((result,index)=>{if(result.status==='rejected') {
    const kind=index===0?'static':'members',label=index===0?'網站目錄':'會員資料';state.errors[kind]=label+'讀取失敗';
    if(index===1){state.errors.characters='會員資料讀取失敗';state.errors.choices='會員資料讀取失敗';}
    notice(`${label}讀取失敗（${result.reason?.code || result.reason?.message || '連線異常'}），請重新載入頁面重試。`);
  }});
  $('sync-status').textContent=`更新於 ${dateText(new Date())}（台北）${Object.keys(state.errors).length?' · 部分資料未載入':''}`;
  renderActive();
}
function decodeName(value) {try{return decodeURIComponent(value);}catch{return value;}}
$('date-apply').addEventListener('click',applyDates);
for(const id of ['date-from','date-to']) $(id).addEventListener('keydown',event=>{if(event.key==='Enter')applyDates();});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>setRange(presetRange(button.dataset.preset),button.dataset.preset)));
for(const id of ['range-from','range-to']) $(id).addEventListener('input',()=>{
  let from=Number($('range-from').value),to=Number($('range-to').value);
  if(from>to){if(id==='range-from')from=to;else to=from;}
  setRange(dateBounds(dateOffset(sliderMin,from),dateOffset(sliderMin,to)));
});
for(const [id,event] of [
  ['campaign-filter','change'],['arc-search','input'],['member-search','input'],['member-date-field','change'],
  ['character-search','input'],['character-date-field','change'],['npc-category','change'],['npc-search','input'],['fate-search','input'],['fate-show-unanswered','change'],['fate-include-undated','change']
]) $(id).addEventListener(event,()=>{resetTablePages();renderActive();});
$('npc-dimension').addEventListener('change',()=>{$('npc-category').value='all';resetTablePage('npc-table');populateNpcCategories();renderActive();});
$('expand-arcs').addEventListener('click',()=>document.querySelectorAll('.arc').forEach(node=>node.open=true));
$('collapse-arcs').addEventListener('click',()=>document.querySelectorAll('.arc').forEach(node=>node.open=false));
window.addEventListener('hashchange',route);route();setRange(range,'all');
try {
  const [appSdk,authSdk,firestoreSdk]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js')
  ]);
  sdk=firestoreSdk;const app=appSdk.getApps()[0] || appSdk.initializeApp(window.RUGATHA_FIREBASE_CONFIG);db=sdk.getFirestore(app);
  const auth=getSiteAuth(app,authSdk);
  authSdk.onAuthStateChanged(auth,user=>{
    if(!isDashboardAdmin(user)){deny();return;}
    window.RUGATHA_ADMIN_BOOT?.ready();authenticated=true;$('gate').hidden=true;$('dashboard').hidden=false;loadData();
  },failBoot);
} catch {failBoot();}
