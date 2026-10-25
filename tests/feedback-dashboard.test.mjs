import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackSessions, latestFeedbackSessions, feedbackSessionKey, feedbackSessionDate, feedbackRatingAverage, feedbackScenario, feedbackFeeDistribution } from '../admin/feedback-model.js';
test('latest uses session date, not receipt time; same-day scripts stay separate',()=>{
  const rows=[
    {sessionDate:'2026-09-26',scenario:'甲',createdAt:'2026-09-26',storyRating:5},
    {sessionDate:'2026-09-26',scenario:'甲',createdAt:'2026-09-27',storyRating:3},
    {sessionDate:'2026-09-26',scenario:'乙',createdAt:'2026-09-26',storyRating:2},
    {sessionDate:'2026-05-23',scenario:'乙',createdAt:'2099-01-01',storyRating:1},
    {scenario:'未定',createdAt:'2099-02-01'},
  ];
  const latest=latestFeedbackSessions(rows);
  assert.equal(latest.length,2);assert.equal(latest[0].date,'2026-09-26');
  assert.deepEqual(latest.map(group=>group.rows.length).sort(),[1,2]);
  assert.equal(feedbackSessions(rows).length,4);
  assert.notEqual(feedbackSessionKey(rows[0]),feedbackSessionKey(rows[2]));
  assert.equal(feedbackRatingAverage(rows.slice(0,2),'storyRating'),4);
});
test('missing/invalid historical dates and ratings are not invented',()=>{
  for(const date of ['2026-02-30','bad','2026-2-01',null]) assert.equal(feedbackSessionDate({sessionDate:date}),'');
  assert.equal(feedbackSessionDate({sessionDate:'2024-02-29'}),'2024-02-29');
  assert.deepEqual(latestFeedbackSessions([{scenario:'舊劇本'}]),[]);
  assert.deepEqual(latestFeedbackSessions([]),[]);
  assert.equal(feedbackSessions([{scenario:'舊劇本'}])[0].label,'未記錄日期 · 舊劇本');
  assert.equal(feedbackRatingAverage([{storyRating:null},{storyRating:0},{storyRating:6},{storyRating:'5'}],'storyRating'),null);
});

test('script filter groups the same title across different activities',()=>{
  assert.equal(feedbackScenario({scenario:'體驗團《洛林精神》'}),'洛林精神');
  assert.equal(feedbackScenario({scenario:'竹推《洛林精神》'}),'洛林精神');
  assert.equal(feedbackScenario({scenario:'自訂劇本'}),'自訂劇本');
});

test('fee stack counts valid responses with the requested colors and no fabricated empty percentages',()=>{
  const distribution=feedbackFeeDistribution([{feeOpinion:'太貴'},{feeOpinion:'可以接受'},{feeOpinion:'可以接受'},{feeOpinion:'太便宜'},{feeOpinion:''}]);
  assert.equal(distribution.total,4);
  assert.deepEqual(distribution.items.map(item=>[item.label,item.count,item.percent,item.color]),[
    ['太便宜',1,25,'#40996d'],['可以接受',2,50,'#e5bd4b'],['太貴',1,25,'#d96961'],
  ]);
  assert(feedbackFeeDistribution([]).items.every(item=>item.percent===0));
});
