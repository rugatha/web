import test from 'node:test';
import assert from 'node:assert/strict';
import { isDashboardAdmin,dayKey,dateBounds,inRange,presetRange,fateSummary,fateRows,kingdomIndex,npcValues,groupNpcs,activitySeries,characterUrl,memberUrl } from '../admin/dashboard-model.js';
test('dashboard requires the exact verified administrator identity',()=>{
  for(const user of [null,{email:'other@example.com',emailVerified:true,admin:true},{email:'rugathadnd@gmail.com',emailVerified:false}])assert.equal(isDashboardAdmin(user),false);
  assert.equal(isDashboardAdmin({email:'rugathadnd@gmail.com',emailVerified:true}),true);
});
test('custom dates include both Taipei days, exclude following midnight and reject invalid ranges',()=>{
  const range=dateBounds('2026-10-01','2026-10-25');
  assert.equal(range.start.toISOString(),'2026-09-30T16:00:00.000Z');
  assert.equal(range.end.toISOString(),'2026-10-25T16:00:00.000Z');
  assert.equal(inRange('2026-09-30T15:59:59Z',range),false);
  assert.equal(inRange('2026-09-30T16:00:00Z',range),true);
  assert.equal(inRange('2026-10-25T15:59:59Z',range),true);
  assert.equal(inRange('2026-10-25T16:00:00Z',range),false);
  assert.equal(inRange(null,range),false);assert.equal(inRange(null,null),true);
  for(const [from,to] of [['2026-10-25','2026-10-01'],['2026-02-30','2026-03-01'],['','2026-10-25']])assert.throws(()=>dateBounds(from,to));
  const preset=presetRange('7',new Date('2026-10-24T17:00:00Z'));
  assert.equal(preset.from,'2026-10-19');assert.equal(preset.to,'2026-10-25');assert.equal(presetRange('all').from,'2026-01-01');
  assert.equal(presetRange('365',new Date('2026-10-24T17:00:00Z')).from,'2026-01-01');
  assert.throws(()=>dateBounds('2025-12-31','2026-10-25'),/2026/);
});
test('NPC multivalues deduplicate within each category, use all matching NPCs as denominator and distinguish missing from none',()=>{
  const npcs=[{religionZh:['信仰甲','信仰乙','信仰甲']},{religionZh:['信仰甲']},{}];
  const groups=groupNpcs(npcs,'religion');
  assert.equal(groups.find(g=>g.label==='信仰甲').count,2);
  assert.ok(Math.abs(groups.find(g=>g.label==='信仰甲').share-200/3)<1e-10);
  assert.equal(groups.find(g=>g.label==='未註明').count,1);
  assert.equal(groups.reduce((n,g)=>n+g.count,0),4);
});
test('kingdom grouping resolves explicit bilingual city/POI names without guessing unknown citizenship',()=>{
  const index=kingdomIndex({realms:[{kingdoms:[{name_zh:'甲國',name_en:'A',cities:[{name_zh:'甲城',name_en:'City A',pois:[{name_zh:'甲店'}]}]},{name_zh:'乙國',cities:[{name_zh:'草稿城',draft:true}]}]}]});
  assert.deepEqual(npcValues({locationEn:['City A'],locationZh:['甲店']},'kingdom',index),['甲國']);
  assert.deepEqual(npcValues({locationZh:['草稿城']},'kingdom',index),['未能對應']);
  assert.deepEqual(npcValues({locationZh:['未記錄的城市']},'kingdom',index),['未能對應']);
});
test('fate overview retains unanswered and historical questions; zero denominators are undefined',()=>{
  assert.deepEqual(fateSummary([]),{c1:0,c2:0,total:0,ratio:null});
  const npcs=[{url:'npc/a.html',qaZh:{Q:'題一'}},{url:'npc/b.html',qaZh:{Q:'題二'}}];
  const rows=fateRows(npcs,[{questionPage:'/npc/a.html',choice:'C1'},{questionPage:'npc/a.html',choice:'C2'},{questionPage:'npc/deleted.html',choice:'C1'},{questionPage:'npc/a.html',choice:'bad'}]);
  assert.equal(rows.length,3);assert.equal(rows.find(r=>r.path==='npc/a.html').ratio,50);
  assert.equal(rows.find(r=>r.path==='npc/b.html').total,0);assert.equal(rows.find(r=>r.path==='npc/b.html').ratio,null);
  assert.equal(rows.find(r=>r.path==='npc/deleted.html').npc,null);
});
test('long date ranges aggregate monthly without including records beyond the selected end',()=>{
  const range=dateBounds('2026-01-01','2026-10-25');
  const series=activitySeries([[{createdAt:'2026-01-01T00:00:00Z'},{createdAt:'2026-10-25T15:59:59Z'},{createdAt:'2026-10-25T16:00:00Z'}]],range);
  assert.equal(series.monthly,true);assert.equal(series.labels.length,10);assert.equal(series.series[0].reduce((n,v)=>n+v,0),2);
  assert.equal(dayKey('2026-10-24T17:00:00Z'),'2026-10-25');
});
test('admin links preserve creator identity and the original encoded document key',()=>{
  const url=new URL(characterUrl({ownerId:'uid-1',id:'Test%20Name'}),'https://rugatha.com');
  assert.equal(url.searchParams.get('character'),'Test%20Name');assert.equal(url.searchParams.get('memberId'),'uid-1');
  const member=new URL(memberUrl({id:'0000-0001',memberId:'uid-1'}),'https://rugatha.com');assert.equal(member.searchParams.get('memberId'),'uid-1');
});


test('column filtering runs across the full dataset and supports text, multivalue categories, numeric bounds and Taipei dates',async()=>{
  const {filterTableRows,sortTableRows,moveColumn}=await import('../admin/data-table.js');
  const columns=[{id:'name',value:r=>r.name},{id:'tags',type:'category',value:r=>r.tags},{id:'count',type:'number',value:r=>r.count},{id:'date',type:'date',value:r=>r.date}];
  const rows=[{name:'Member 2',tags:['甲','乙'],count:0,date:'2026-10-24T17:00:00Z'},{name:'Member 10',tags:['甲'],count:10,date:'2026-10-25T16:00:00Z'},{name:'Other',tags:['乙'],count:null,date:null}];
  assert.equal(filterTableRows(rows,columns,{count:{min:'0',max:'0'}}).length,1);
  assert.equal(filterTableRows(rows,columns,{tags:{text:'乙'}}).length,2);
  assert.equal(filterTableRows(rows,columns,{name:{text:'MEMBER'},count:{min:'1'}}).length,1);
  assert.equal(filterTableRows(rows,columns,{date:{min:'2026-10-25',max:'2026-10-25'}}).length,1);
  assert.deepEqual(sortTableRows(rows,columns,{id:'name',direction:'asc'}).map(r=>r.name),['Member 2','Member 10','Other']);
  assert.deepEqual(sortTableRows(rows,columns,{id:'count',direction:'desc'}).map(r=>r.count),[10,0,null]);
  assert.deepEqual(moveColumn(['name','tags','count'],'name','count'),['tags','count','name']);
  assert.deepEqual(moveColumn(['name','tags','count'],'count','name'),['count','name','tags']);
});


test('legacy undated answers remain visible without being misclassified into a date interval',async()=>{
  const {answerScope}=await import('../admin/dashboard-model.js');
  const range=dateBounds('2026-10-01','2026-10-25');
  const choices=[{choice:'C1',memberKey:'one',createdAt:'2026-10-10T00:00:00Z'},{choice:'C2',memberKey:'two',createdAt:null},{choice:'C1',memberKey:'three',createdAt:'2026-01-01T00:00:00Z'},{choice:'invalid',createdAt:null}];
  const scope=answerScope(choices,range);
  assert.equal(scope.valid.length,3);assert.equal(scope.dated.length,1);assert.equal(scope.undated.length,1);assert.equal(scope.selected.length,2);
  assert.equal(new Set(scope.selected.map(c=>c.memberKey)).size,2);
  assert.equal(answerScope(choices,range,false).selected.length,1);
  assert.equal(choices[1].createdAt,null);
});

test('experience event labels map scripts and preserve numbered sessions', async()=>{
 const {experienceEventLabel}=await import('../admin/experience-dashboard.js');
 for(const [id,label] of [
  ['202610-lorin','2026-10 · 洛林精神'],
  ['2026-10-lorin','2026-10 · 洛林精神'],
  ['202604-1-echo','2026-04-01 · 龍鳴的回音'],
  ['202604-2-echo','2026-04-02 · 龍鳴的回音'],
  ['202505-scroll','2025-05 · 金之堡的卷軸'],
  ['legacy','legacy · 自訂劇本']
 ]) assert.equal(experienceEventLabel(id,{scriptName:'自訂劇本'}),label);
});
