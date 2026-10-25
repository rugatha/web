import { dataTable, resetTablePage } from './data-table.js?v=20261026-experience-v3';
import { feedbackRatingFields, feedbackSessionKey, feedbackSessionLabel, feedbackSessions, feedbackScenario, feedbackRatingAverage, feedbackFeeDistribution } from './feedback-model.js?v=20261026-forms-8';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = value => Array.isArray(value) ? value.join('、') : value ?? '';
const dateText = value => value?.toDate ? value.toDate().toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '未記錄';
const answerFields = ['nickname','gender','genderOther','ageRange','sessionDate','scenario','previousParticipation','interests','interestsOther',...feedbackRatingFields.map(([key])=>key),'feeOpinion','privateFeedback','publicFeedback'];
export function createFeedbackDashboard(context) {
  let rows = null, loading = false, failed = false, revision = 0;
  const valid = (ticket,generation) => context().authenticated && context().generation === generation && revision === ticket;
  async function load() {
    if (!context().authenticated || loading) return;
    const {db,sdk,generation} = context(), ticket = ++revision;
    loading = true; failed = false;
    $('feedback-status').textContent = '正在讀取跑團回饋…';
    try {
      const result = await sdk.getDocs(sdk.collection(db,'experienceFeedback'));
      if (!valid(ticket,generation)) return;
      rows = result.docs.map(doc=>({...doc.data(),id:doc.id}));
      const selectedScript = $('feedback-script').value;
      const scripts = [...new Set(rows.map(feedbackScenario))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
      $('feedback-script').replaceChildren(new Option('全部劇本','all'));
      scripts.forEach(script=>$('feedback-script').add(new Option(script,script)));
      $('feedback-script').value = scripts.includes(selectedScript) ? selectedScript : 'all';
      populateSessions();
      $('feedback-status').textContent = `已讀取 ${rows.length} 筆回饋，更新於 ${new Date().toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}`;
      render();
    } catch {
      if (!valid(ticket,generation)) return;
      rows = null; failed = true;
      for (const id of ['feedback-current','feedback-summary','feedback-table','feedback-public-text','feedback-private-text']) $(id).replaceChildren();
      $('feedback-written').hidden=true;
      $('feedback-status').textContent = '無法讀取跑團回饋，請按「重新整理回饋資料」重試。';
    } finally { if (valid(ticket,generation)) loading = false; }
  }
  function populateSessions() {
    const selected = $('feedback-event').value;
    const script = $('feedback-script').value;
    const sessions = feedbackSessions((rows || []).filter(row=>script==='all' || feedbackScenario(row)===script));
    $('feedback-event').replaceChildren(new Option('全部場次','all'));
    sessions.forEach(session=>$('feedback-event').add(new Option(session.label,session.id)));
    $('feedback-event').value = sessions.some(session=>session.id===selected) ? selected : 'all';
  }
  function renderWrittenFeedback(filtered) {
    for (const [field,id,heading] of [
      ['publicFeedback','feedback-public-text','公開回饋'],
      ['privateFeedback','feedback-private-text','非公開回饋'],
    ]) {
      const written = filtered.filter(row=>String(row[field] || '').trim());
      $(id).innerHTML = `<table><caption class="chart-sr-only">${heading}，${written.length} 筆</caption><thead><tr><th scope="col">場次</th><th scope="col">填答者</th><th scope="col">回饋內容</th></tr></thead><tbody>${written.map(row=>`<tr><td>${esc(feedbackSessionLabel(row))}</td><td>${esc(row.nickname || '未提供')}</td><td>${esc(row[field])}</td></tr>`).join('') || `<tr><td colspan="3" class="grid-empty">沒有符合條件的${heading}。</td></tr>`}</tbody></table>`;
    }
    $('feedback-written').hidden=false;
  }
  function renderSummary(filtered, label) {
    const compare = $('feedback-event').value!=='all' || $('feedback-script').value!=='all' || filtered.length!==rows.length;
    const fee = feedbackFeeDistribution(filtered);
    const allFees = feedbackFeeDistribution(rows);
    let cumulative = 0;
    const boundaries = new Set();
    const feeBaselines = allFees.items.slice(0,-1).flatMap(item=>{
      cumulative += item.percent;
      if (cumulative<=0 || cumulative>=100 || boundaries.has(cumulative)) return [];
      boundaries.add(cumulative);
      return [{position:cumulative,label:`全部場次：${item.label}為止累計 ${cumulative.toFixed(1)}%`}];
    });
    const feeDescription = fee.items.map(item=>`${item.label} ${item.count} 筆（${item.percent.toFixed(1)}%）`).join('、');
    const ratings = feedbackRatingFields.map(([key,title])=>{
      const mean = feedbackRatingAverage(filtered,key), baseline = feedbackRatingAverage(rows,key);
      return `<li class="feedback-rating-row" data-rating="${key}"><strong class="rating-score">${mean===null?'—':mean.toFixed(2)}<small> / 5</small></strong><div class="rating-track" aria-hidden="true"><span class="rating-bar" style="height:${mean===null?0:mean/5*100}%"></span>${compare && baseline!==null?`<span class="rating-baseline" style="bottom:${baseline/5*100}%" title="全部場次平均：${baseline.toFixed(2)} / 5"></span>`:''}</div><span class="rating-label">${esc(title)}</span>${compare && baseline!==null?`<span class="chart-sr-only">全部場次平均 ${baseline.toFixed(2)} / 5</span>`:''}</li>`;
    }).join('');
    $('feedback-current').innerHTML = `<h2>篩選回饋平均分</h2><p class="hint">${esc(label)} · 平均分依符合全部篩選條件的有效評分計算，包含所有分頁。</p><p>${filtered.length} 筆回饋 · 公開文字 ${filtered.filter(row=>String(row.publicFeedback || '').trim()).length} 筆 · 私下文字 ${filtered.filter(row=>String(row.privateFeedback || '').trim()).length} 筆</p>${filtered.length?'':`<p>${rows.length?'沒有符合篩選條件的回饋。':'目前尚無跑團回饋。'}</p>`}<div class="feedback-charts"><figure class="feedback-rating-chart"><figcaption>各項目評分</figcaption><div class="feedback-chart-legend"><span class="bar-key"></span>篩選平均分${compare?'<span class="baseline-key"></span>全部場次平均分':''}</div><div class="rating-plot"><div class="rating-axis" aria-hidden="true">${[5,4,3,2,1,0].map(value=>`<span>${value}</span>`).join('')}</div><ol class="feedback-rating-bars">${ratings}</ol></div></figure><figure class="feedback-fee-chart"><figcaption>費用感受</figcaption><div class="feedback-fee-layout"><div class="fee-stack-wrap"><div class="feedback-fee-stack${fee.total?'':' is-empty'}" role="img" aria-label="${fee.total?esc(feeDescription):'沒有有效的費用感受回覆'}">${fee.total?fee.items.filter(item=>item.count).map(item=>`<span data-fee-segment="${item.label}" style="width:${item.percent}%;background:${item.color}" title="${item.label}：${item.count} 筆（${item.percent.toFixed(1)}%）" aria-hidden="true">${item.percent>=12?`${item.percent.toFixed(1)}%`:''}</span>`).join(''):'<span class="fee-no-data">無資料</span>'}</div>${compare && allFees.total?feeBaselines.map(item=>`<span class="fee-baseline" style="left:${item.position}%" title="${item.label}" aria-hidden="true"></span>`).join(''):''}</div>${compare && allFees.total?`<p class="hint fee-baseline-caption"><span class="baseline-key" aria-hidden="true"></span>虛線：全部場次平均分布（${allFees.items.map(item=>`${item.label} ${item.percent.toFixed(1)}%`).join('／')}）</p>`:''}<ul class="feedback-fee-legend">${fee.items.map(item=>`<li data-fee="${item.label}"><span class="fee-color" style="background:${item.color}"></span><span>${item.label}</span><strong>${item.count} 筆<small>${item.percent.toFixed(1)}%</small></strong></li>`).join('')}</ul></div><p class="hint">有效費用回覆 ${fee.total} 筆</p></figure></div>`;
    renderWrittenFeedback(filtered);
    $('feedback-summary').textContent = `${label}：符合 ${filtered.length} 筆回饋／全部 ${rows.length} 筆`;
  }
  function render() {
    if (!context().authenticated) return;
    if (rows === null) { if (!loading && !failed) void load(); return; }
    const selected = $('feedback-event').value, script = $('feedback-script').value;
    const search = $('feedback-search').value.trim().normalize('NFKC').toLowerCase();
    const scoped = rows.filter(row=>(selected==='all' || feedbackSessionKey(row)===selected) && (script==='all' || feedbackScenario(row)===script));
    const filtered = scoped.filter(row=>answerFields.map(key=>text(row[key])).join(' ').normalize('NFKC').toLowerCase().includes(search));
    const label = `${script==='all'?'全部劇本':script} · ${selected==='all'?'全部場次':$('feedback-event').selectedOptions[0]?.textContent || '所選場次'}`;
    dataTable('feedback-table',[
      {id:'session',label:'場次',value:feedbackSessionLabel},
      {id:'createdAt',label:'填答時間',type:'date',value:row=>row.createdAt,html:row=>esc(dateText(row.createdAt))},
      {id:'nickname',label:'暱稱',value:row=>row.nickname},
      {id:'gender',label:'性別',type:'category',value:row=>row.gender || '未填寫'},
      {id:'genderOther',label:'其他性別補充',value:row=>row.genderOther || ''},
      {id:'ageRange',label:'年齡層',type:'category',value:row=>row.ageRange || '未填寫'},
      {id:'previousParticipation',label:'參與過其他團務',type:'category',value:row=>row.previousParticipation || '未填寫'},
      {id:'interests',label:'興趣類型',type:'category',value:row=>row.interests || []},
      {id:'interestsOther',label:'其他興趣',value:row=>row.interestsOther || ''},
      ...feedbackRatingFields.map(([id,label])=>({id,label,type:'number',value:row=>row[id]})),
      {id:'feeOpinion',label:'費用感受',type:'category',value:row=>row.feeOpinion},
      {id:'privateFeedback',label:'私下回饋（不公開）',value:row=>row.privateFeedback || ''},
      {id:'publicFeedback',label:'公開回饋（匿名）',value:row=>row.publicFeedback || ''},
      {id:'source',label:'資料來源',type:'category',value:row=>row.source==='surveycake-history'?'歷史匯入':'網站填答'},
    ],filtered,{defaultSort:{id:'createdAt',direction:'desc'},lockOrder:true,frozenColumns:['session','createdAt','nickname'],onResult:result=>renderSummary(result,label)});
  }
  $('feedback-script').addEventListener('change',()=>{populateSessions();resetTablePage('feedback-table');render();});
  $('feedback-event').addEventListener('change',()=>{resetTablePage('feedback-table');render();});
  $('feedback-search').addEventListener('input',()=>{resetTablePage('feedback-table');render();});
  $('feedback-refresh').addEventListener('click',()=>void load());
  return {render,reset() {
    revision++; rows=null; loading=false; failed=false;
    for (const id of ['feedback-current','feedback-summary','feedback-table','feedback-status','feedback-public-text','feedback-private-text']) $(id).replaceChildren();
    $('feedback-written').hidden=true;
    $('feedback-search').value='';
    $('feedback-script').replaceChildren(new Option('全部劇本','all'));
    $('feedback-event').replaceChildren(new Option('全部場次','all'));
  }};
}
