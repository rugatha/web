import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeEmails, subscriptionRows, subscriptionSeries, unsubscribeReasonText, subscriptionEventRows } from '../admin/subscriptions-model.js';

test('unsubscribe reason combines selections and free text, including retained feedback after resubscribing',()=>{
  const feedback={reasons:['快報內容不符合我的需求','想減少收到的電子郵件'],note:'  希望通知更精簡。\n謝謝！  '};
  const expected='快報內容不符合我的需求、想減少收到的電子郵件\n補充：希望通知更精簡。\n謝謝！';
  assert.equal(unsubscribeReasonText({status:'unsubscribed',unsubscribeFeedback:feedback}),expected);
  assert.equal(subscriptionRows([{status:'active',unsubscribeFeedback:feedback}],[])[0].unsubscribeReason,expected);
  assert.equal(unsubscribeReasonText({status:'unsubscribed',unsubscribeFeedback:{note:'自由填寫'}}),'補充：自由填寫');
  assert.equal(unsubscribeReasonText({status:'unsubscribed'}),'未填寫');
  assert.equal(unsubscribeReasonText({status:'unsubscribed',unsubscribeFeedback:{reasons:[],note:''}}),'未填寫');
  assert.equal(unsubscribeReasonText({status:'active'}),'—');
  assert.equal(unsubscribeReasonText({status:'unsubscribed',unsubscribeFeedback:{reasons:[null,{},' '],note:7}}),'未填寫');
});

test('member matching normalizes email but keeps plus aliases distinct and unknown membership explicit',()=>{
  const rows=[{email:' USER@example.com ',status:'active'},{email:'user+tag@example.com',status:'unsubscribed'}];
  assert.deepEqual(subscriptionRows(rows,[{email:'user@EXAMPLE.com'}]).map(row=>[row.statusLabel,row.memberLabel]),[['訂閱中','是'],['取消訂閱','否']]);
  assert.equal(subscriptionRows(rows,null)[0].memberLabel,'尚未完成比對');
  assert.equal(subscriptionRows([{status:'unexpected'}],[])[0].statusLabel,'未知狀態');
});
test('copy list includes only active addresses and deduplicates without changing plus aliases',()=>{
  assert.deepEqual(activeEmails([{email:' B@example.com ',status:'active'},{email:'b@EXAMPLE.com',status:'active'},{email:'a+tag@example.com',status:'active'},{email:'cancelled@example.com',status:'unsubscribed'},{email:'unknown@example.com',status:'other'}]),['a+tag@example.com','b@example.com']);
});
test('cumulative chart includes cancellations, uses first subscription and Taipei date boundaries',()=>{
  const result=subscriptionSeries([
    {createdAt:{toDate:()=>new Date('2026-10-31T16:00:00Z')},status:'active',subscribedAt:'2026-11-02T00:00:00+08:00'},
    {createdAt:'2026-11-01T15:59:59Z',status:'unsubscribed'},
    {createdAt:'2026-11-01T16:00:00Z',status:'active'},
    {createdAt:null},{createdAt:'bad-date'},
  ],new Date('2026-11-03T04:00:00Z'));
  assert.deepEqual(result.labels,['2026-11-01','2026-11-02','2026-11-03']);
  assert.deepEqual(result.values,[2,3,3]);assert.equal(result.undated,2);
});
test('long periods aggregate cumulative totals monthly and empty data yields zero',()=>{
  const result=subscriptionSeries([{createdAt:'2026-01-01T00:00:00+08:00'},{createdAt:'2026-11-01T00:00:00+08:00'}],new Date('2026-11-01T04:00:00Z'));
  assert.equal(result.monthly,true);assert.equal(result.values[0],1);assert.equal(result.values.at(-1),2);
  assert.deepEqual(subscriptionSeries([],new Date('2026-11-01T04:00:00Z')).values,[0]);
});

test('history retains repeated subscriber events, sorts newest first, and formats cancellation feedback',()=>{
 const rows=subscriptionEventRows([
  {id:'a',email:'same@example.com',action:'subscribe',sequence:1,occurredAt:'2026-11-01T00:00:00Z'},
  {id:'c',email:'same@example.com',action:'subscribe',sequence:3,occurredAt:'2026-11-03T00:00:00Z'},
  {id:'b',email:'same@example.com',action:'unsubscribe',sequence:2,occurredAt:'2026-11-02T00:00:00Z',reasons:['想減少收到的電子郵件'],note:'第一次退訂'},
 ]);
 assert.deepEqual(rows.map(row=>row.id),['c','b','a']);
 assert.equal(rows[1].actionLabel,'取消訂閱');
 assert.equal(rows[1].reasonText,'想減少收到的電子郵件\n補充：第一次退訂');
 assert.equal(rows[0].reasonText,'—');
});
