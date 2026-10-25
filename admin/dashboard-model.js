export const MIN_DATE = '2026-01-01';
export const ADMIN_EMAIL = 'rugathadnd@gmail.com';
export const isDashboardAdmin = user => !!user && user.email === ADMIN_EMAIL && user.emailVerified === true;
export const toDate = value => {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
export const dayKey = value => {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit' }).format(date) : null;
};
export const dateOffset = (day, count) => dayKey(new Date(new Date(day + 'T00:00:00+08:00').getTime() + count * 86400000));
export function dateBounds(from, to) {
  const valid = day => /^\d{4}-\d{2}-\d{2}$/.test(day || '') && dayKey(new Date(day + 'T00:00:00+08:00')) === day;
  if (!valid(from) || !valid(to) || from > to) throw new Error('請選擇有效日期，開始日期不能晚於結束日期。');
  if (from < MIN_DATE) throw new Error('日期不可早於 2026/1/1。');
  return { from, to, start:new Date(from + 'T00:00:00+08:00'), end:new Date(new Date(to + 'T00:00:00+08:00').getTime() + 86400000) };
}
export const inRange = (value, range) => {
  if (!range) return true;
  const date=toDate(value);
  return !!date && date >= range.start && date < range.end;
};
export function presetRange(days, now = new Date()) {
  const to=dayKey(now);
  const from=days==='all' ? MIN_DATE : [MIN_DATE,dateOffset(to,1-Number(days))].sort().at(-1);
  return dateBounds(from,to);
}
// Legacy migration records may have createdAt:null. Keep their evidence separate
// from date-qualified answers instead of assigning them an invented date.
export function answerScope(choices, range, includeUndated = true) {
  const valid=choices.filter(choice=>['C1','C2'].includes(choice.choice));
  const undated=valid.filter(choice=>!toDate(choice.createdAt));
  const dated=valid.filter(choice=>toDate(choice.createdAt)&&inRange(choice.createdAt,range));
  return { valid,undated,dated,selected:includeUndated?[...dated,...undated]:dated };
}
// Counts are answer records, never percentages averaged across questions.
export function fateSummary(choices) {
  const c1=choices.filter(record=>record.choice==='C1').length;
  const c2=choices.filter(record=>record.choice==='C2').length;
  const total=c1+c2;
  return { c1,c2,total,ratio:total ? c1/total*100 : null };
}
export const normalizedPath = value => String(value || '').replace(/^\/+/, '');
export function fateRows(npcs, choices) {
  const rows=new Map(npcs.filter(n=>n.qaZh?.Q || n.qaEn?.Q).map(n=>[normalizedPath(n.url),{ npc:n, path:normalizedPath(n.url), answers:[] }]));
  choices.forEach(answer=>{
    if (!['C1','C2'].includes(answer.choice)) return;
    const path=normalizedPath(answer.questionPage);
    if(!rows.has(path)) rows.set(path,{npc:null,path,answers:[]});
    rows.get(path).answers.push(answer);
  });
  return [...rows.values()].map(row=>({...row,...fateSummary(row.answers)}));
}
const norm = value => String(value || '').trim().normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'");
export const list = value => [...new Set((Array.isArray(value) ? value : value ? [value] : []).map(x=>String(x).trim()).filter(Boolean))];
export function kingdomIndex(atlas) {
  const index=new Map();
  for (const realm of atlas.realms || []) for (const kingdom of realm.kingdoms || []) {
    const label=kingdom.name_zh || kingdom.name_en;
    const visit=node=>{
      if(node.draft) return;
      [node.name_zh,node.name_en,node.slug].filter(Boolean).forEach(name=>{
        const key=norm(name); if(!index.has(key)) index.set(key,new Set()); index.get(key).add(label);
      });
      for(const child of [...(node.cities || []),...(node.pois || [])]) visit(child);
    };
    visit(kingdom);
  }
  return index;
}
export function npcValues(npc, dimension, index = new Map()) {
  const labels={male:'男性',female:'女性',neutral:'中性',alive:'存活',dead:'死亡',unknown:'未知',other:'其他','historical figure':'歷史人物'};
  if(['gender','status'].includes(dimension)) return [labels[npc[dimension]] || npc[dimension] || '未註明'];
  if(dimension==='kingdom') {
    const explicit=list(npc.kingdomZh || npc.kingdomEn || npc.kingdom);
    if(explicit.length) return explicit;
    const names=[...list(npc.locationZh),...list(npc.locationEn),...list(npc.location)];
    const found=[...new Set(names.flatMap(name=>[...(index.get(norm(name)) || [])]))];
    return found.length ? found : ['未能對應'];
  }
  const values=list(npc[dimension+'Zh']).length ? list(npc[dimension+'Zh']) : list(npc[dimension+'En'] || npc[dimension]);
  return values.length ? values : ['未註明'];
}
export function groupNpcs(npcs, dimension, index) {
  const groups=new Map();
  npcs.forEach(npc=>npcValues(npc,dimension,index).forEach(label=>groups.set(label,(groups.get(label)||0)+1)));
  return [...groups].map(([label,count])=>({label,count,share:npcs.length ? count/npcs.length*100 : null})).sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label,'zh-Hant'));
}
export function activitySeries(groups, range, now = new Date()) {
  const dated=groups.flat().map(record=>dayKey(record.createdAt)).filter(Boolean).sort();
  const from=range?.from || dated[0] || dayKey(now), to=range?.to || dayKey(now);
  const span=(new Date(to)-new Date(from))/86400000;
  const monthly=span>90;
  const labels=[];
  if(monthly) {
    let year=Number(from.slice(0,4)), month=Number(from.slice(5,7));
    while(`${year}-${String(month).padStart(2,'0')}`<=to.slice(0,7)) { labels.push(`${year}-${String(month).padStart(2,'0')}`); month++; if(month===13){year++;month=1;} }
  } else for(let day=from;day<=to;day=dateOffset(day,1)) labels.push(day);
  return { labels, monthly, series:groups.map(records=>{
    const counts=new Map();
    records.filter(record=>inRange(record.createdAt,range)).forEach(record=>{ const day=dayKey(record.createdAt); if(day){const key=monthly?day.slice(0,7):day;counts.set(key,(counts.get(key)||0)+1);} });
    return labels.map(key=>counts.get(key)||0);
  }) };
}
export const memberUrl = member => '/member/?' + new URLSearchParams({memberId:member.memberId || member.id});
export const characterUrl = character => '/toolbox/character_sheet/?' + new URLSearchParams({memberId:character.ownerId,character:character.id});
