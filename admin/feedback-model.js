export const feedbackRatingFields = [
  ['storyRating','劇本設計'], ['characterRating','角色設計'], ['dmRating','DM 帶團風格'],
  ['cardRating','角色卡與幫助卡'], ['propRating','公仔與地圖道具'],
];
export function feedbackSessionDate(row) {
  const date = row.sessionDate;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : '';
}
export const feedbackSessionKey = row => JSON.stringify([feedbackSessionDate(row), row.scenario || '未記錄劇本']);
export const feedbackSessionLabel = row => `${feedbackSessionDate(row) || '未記錄日期'} · ${row.scenario || '未記錄劇本'}`;
export function feedbackSessions(rows) {
  const groups = new Map();
  for (const row of rows) {
    const id = feedbackSessionKey(row);
    if (!groups.has(id)) groups.set(id, {id, date:feedbackSessionDate(row), label:feedbackSessionLabel(row), rows:[]});
    groups.get(id).rows.push(row);
  }
  return [...groups.values()].sort((a,b)=>b.date.localeCompare(a.date) || a.label.localeCompare(b.label,'zh-Hant'));
}
export function latestFeedbackSessions(rows) {
  const sessions = feedbackSessions(rows);
  const date = sessions.find(session=>session.date)?.date;
  // Keep separate scripts on the same latest date instead of arbitrarily dropping one.
  return date ? sessions.filter(session=>session.date === date) : [];
}
export function feedbackRatingAverage(rows, field) {
  const values = rows.map(row=>row[field]).filter(value=>Number.isInteger(value) && value>=1 && value<=5);
  return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
}

export function feedbackScenario(row) {
  const name = String(row.scenario || '未記錄劇本');
  return /《([^》]+)》/.exec(name)?.[1] || name;
}

export function feedbackFeeDistribution(rows) {
  const items = [
    {label:'太便宜',color:'#40996d'},
    {label:'可以接受',color:'#e5bd4b'},
    {label:'太貴',color:'#d96961'},
  ].map(item=>({...item,count:rows.filter(row=>row.feeOpinion===item.label).length}));
  const total = items.reduce((sum,item)=>sum+item.count,0);
  return {total,items:items.map(item=>({...item,percent:total ? item.count/total*100 : 0}))};
}
