import { activitySeries, dayKey, toDate } from './dashboard-model.js?v=20261025-admin-v5';

export const normalizeEmail = value => String(value ?? '').trim().toLowerCase();
export function subscriptionRows(subscriptions, members) {
  const emails = members === null ? null : new Set(members.map(member=>normalizeEmail(member.email)).filter(Boolean));
  return subscriptions.map(row=>({...row,
    statusLabel: row.status === 'active' ? '訂閱中' : row.status === 'unsubscribed' ? '取消訂閱' : '未知狀態',
    memberLabel: emails === null ? '尚未完成比對' : emails.has(normalizeEmail(row.email)) ? '是' : '否',
  }));
}
export function activeEmails(rows) {
  return [...new Set(rows.filter(row=>row.status==='active').map(row=>normalizeEmail(row.email)).filter(Boolean))].sort();
}
export function subscriptionSeries(rows, now = new Date()) {
  const today = dayKey(now);
  const dated = rows.filter(row=>toDate(row.createdAt) && dayKey(row.createdAt)<=today);
  const data = activitySeries([dated], null, now);
  let total = 0;
  return {...data, values: data.series[0].map(count=>total+=count), undated: rows.filter(row=>!toDate(row.createdAt)).length};
}
