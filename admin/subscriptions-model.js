import { activitySeries, dayKey, toDate } from './dashboard-model.js?v=20261025-admin-v5';

export const normalizeEmail = value => String(value ?? '').trim().toLowerCase();
export function unsubscribeReasonText(row) {
  const feedback = row.unsubscribeFeedback;
  const reasons = Array.isArray(feedback?.reasons) ? feedback.reasons.filter(value=>typeof value==='string').map(value=>value.trim()).filter(Boolean) : [];
  const note = typeof feedback?.note === 'string' ? feedback.note.trim() : '';
  return [reasons.join('、'), note ? `補充：${note}` : ''].filter(Boolean).join('\n') || (row.status === 'unsubscribed' ? '未填寫' : '—');
}
export function subscriptionRows(subscriptions, members) {
  const emails = members === null ? null : new Set(members.map(member=>normalizeEmail(member.email)).filter(Boolean));
  return subscriptions.map(row=>({...row,
    statusLabel: row.status === 'active' ? '訂閱中' : row.status === 'unsubscribed' ? '取消訂閱' : '未知狀態',
    memberLabel: emails === null ? '尚未完成比對' : emails.has(normalizeEmail(row.email)) ? '是' : '否',
    unsubscribeReason: unsubscribeReasonText(row),
  }));
}
export function activeEmails(rows) {
  return [...new Set(rows.filter(row=>row.status==='active').map(row=>normalizeEmail(row.email)).filter(Boolean))].sort();
}
export function subscriptionEventRows(events) {
  return events.map(event=>({...event,
    actionLabel: event.action === 'subscribe' ? '訂閱' : event.action === 'unsubscribe' ? '取消訂閱' : '未知事件',
    reasonText: event.action === 'unsubscribe' ? unsubscribeReasonText({status:'unsubscribed',unsubscribeFeedback:event}) : '—',
  })).sort((a,b)=>{
    const difference=(toDate(b.occurredAt)?.getTime()||0)-(toDate(a.occurredAt)?.getTime()||0);
    return difference || (b.occurredAt?.nanoseconds||0)-(a.occurredAt?.nanoseconds||0) || (b.sequence||0)-(a.sequence||0) || String(a.id).localeCompare(String(b.id));
  });
}
export function subscriptionSeries(rows, now = new Date()) {
  const today = dayKey(now);
  const dated = rows.filter(row=>toDate(row.createdAt) && dayKey(row.createdAt)<=today);
  const data = activitySeries([dated], null, now);
  let total = 0;
  return {...data, values: data.series[0].map(count=>total+=count), undated: rows.filter(row=>!toDate(row.createdAt)).length};
}
