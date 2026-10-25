// Firebase test doubles only; no production reads or writes.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';
const root=resolve('.');
const server=createServer(async(req,res)=>{
  try {
    let path=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(path.endsWith('/'))path+='index.html';
    const file=resolve(root,'.'+path);if(!file.startsWith(root+'/'))throw new Error();
    const body=await readFile(file);
    res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(body);
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base=`http://127.0.0.1:${server.address().port}`;
const rows=Array.from({length:34},(_,index)=>({
  id:`feedback-${index}`, nickname:`玩家 ${index}`,sessionDate:index<3?'2026-09-26':'2026-05-23',
  scenario:index<3?'體驗團《洛林精神：那些不被提及的歷史》':index===3?'竹推《洛林精神：那些不被提及的歷史》':'TRPG Fes. 《寂靜與秩序之下》',
  createdAt:index===33?'2026-10-26T00:00:00+08:00':index<3?`2026-09-26T18:00:0${index}+08:00`:'2026-05-23T13:00:00+08:00',
  storyRating:index<3?index+3:index===3?1:4,characterRating:4,dmRating:5,cardRating:3,propRating:5,
  feeOpinion:index===0?'太便宜':index===2?'太貴':'可以接受',
  gender:index<3?'男性':'', ageRange:index<3?'22-35':'',previousParticipation:'無',interests:['其他'],interestsOther:'閱讀',
  privateFeedback:index===0?'<img src=x onerror="window.feedbackXss=true">私下意見':`私下意見 ${index}`, publicFeedback:index===0?'推薦！':'',
  source:'surveycake-history',historyOriginal:'private-raw-marker-never-render',
}));
const browser=await chromium.launch({channel:'chrome'});
async function open(user={email:'rugathadnd@gmail.com',emailVerified:true},dataset=rows){
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://www.gstatic.com/firebasejs/12.7.0/**',async route=>{
    const file=new URL(route.request().url()).pathname.split('/').pop();let body='';
    if(file==='firebase-app.js')body='export const getApps=()=>[];export const initializeApp=()=>({});';
    if(file==='firebase-auth.js')body=`export const getAuth=()=>({});export const onAuthStateChanged=(auth,cb)=>{window.testSignOut=()=>cb(null);cb(${JSON.stringify(user)});};`;
    if(file==='firebase-firestore.js')body=`const rows=${JSON.stringify(dataset)};for(const row of rows){const date=row.createdAt;row.createdAt={toDate:()=>new Date(date)};}
      export const getFirestore=()=>({});export const collection=(db,...parts)=>({name:parts.join('/')});
      export const getDocs=async ref=>{(window.testReads??=[]).push(ref.name);if(ref.name==='experienceFeedback'&&window.failFeedback)throw new Error('denied');if(ref.name==='experienceFeedback'&&window.delayFeedback)await new Promise(resolve=>window.releaseFeedback=resolve);return {docs:(ref.name==='experienceFeedback'?rows:[]).map(row=>({id:row.id,data:()=>row}))};};`;
    await route.fulfill({contentType:'text/javascript',body});
  });
  await page.goto(base+'/admin/#feedback');
  return {page,context,errors};
}
try {
  const {page,context,errors}=await open();
  await page.locator('#feedback-status').filter({hasText:'已讀取 34 筆'}).waitFor();
  assert.equal(await page.locator('#forms-navigation [data-nav]').count(),2);
  assert.match(await page.locator('#forms-navigation summary').textContent(),/報名與表單/);
  assert.equal(await page.locator('[data-nav=feedback]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#breadcrumb').textContent(),'報名與表單 / 跑團回饋');
  assert.equal(await page.locator('#date-controls').isVisible(),false);
  assert.equal(await page.locator('#feedback-public-text tbody tr').count(),1);
  assert.equal(await page.locator('#feedback-private-text tbody tr').count(),34);
  assert.deepEqual(await page.locator('#feedback-public-text th').allTextContents(),['場次','填答者','回饋內容']);
  assert.equal(await page.locator('#feedback-written button, #feedback-written input, #feedback-written select').count(),0);
  assert.equal(await page.locator('#feedback-written img').count(),0);
  assert.match(await page.locator('#feedback-private-text').textContent(),/<img src=x/);
  const identity=await page.locator('#feedback-public-text tbody tr').first().locator('td').allTextContents();
  assert.equal(identity.length,3);
  assert.equal(identity[1],'玩家 0');
  assert.equal(identity[2],'推薦！');
  assert.equal(await page.locator('#feedback-event').inputValue(),'all');
  assert.equal(await page.locator('#feedback-script').inputValue(),'all');
  assert.match(await page.locator('#feedback-current').textContent(),/34 筆回饋/);
  assert.equal(await page.locator('.rating-score').first().textContent(),'3.91 / 5');
  assert.equal(await page.locator('.rating-baseline').count(),0);
  assert.equal(await page.locator('.fee-baseline').count(),0);
  assert.equal(await page.locator('.rating-bar').count(),5);
  assert.equal(await page.locator('#feedback-table tbody tr').count(),25);
  await page.selectOption('#feedback-script','洛林精神：那些不被提及的歷史');
  assert.equal(await page.locator('#feedback-table tbody tr').count(),4);
  assert.match(await page.locator('#feedback-current').textContent(),/4 筆回饋/);
  assert.equal(await page.locator('.rating-score').first().textContent(),'3.25 / 5');
  assert.equal(await page.locator('.rating-baseline').count(),5);
  assert.equal(await page.locator('.fee-baseline').count(),2);
  const boundaries=await page.locator('.fee-baseline').evaluateAll(nodes=>nodes.map(el=>parseFloat(el.style.left)));
  assert(Math.abs(boundaries[0]-100/34)<0.001);
  assert(Math.abs(boundaries[1]-3300/34)<0.001);
  assert.match(await page.locator('.fee-baseline-caption').textContent(),/太便宜 2.9%／可以接受 94.1%／太貴 2.9%/);
  assert.equal(await page.locator('.rating-baseline').first().getAttribute('title'),'全部場次平均：3.91 / 5');
  assert(Math.abs(await page.locator('.rating-baseline').first().evaluate(el=>parseFloat(el.style.bottom))-133/34/5*100)<0.001);
  assert.equal(await page.locator('#feedback-event option').count(),3);
  await page.selectOption('#feedback-event',{label:'2026-09-26 · 體驗團《洛林精神：那些不被提及的歷史》'});
  await page.locator('#feedback-current').screenshot({path:'/tmp/admin-feedback-charts-filtered.png'});
  assert.equal(await page.locator('[data-fee-segment]').count(),3);
  for(const width of await page.locator('[data-fee-segment]').evaluateAll(nodes=>nodes.map(el=>parseFloat(el.style.width)))) assert(Math.abs(width-100/3)<0.01);
  const current=await page.locator('#feedback-current').textContent();
  assert.match(current,/2026-09-26/);assert.match(current,/3 筆回饋/);
  assert.match(current,/4.00/);assert.match(await page.locator('.feedback-fee-stack').getAttribute('aria-label'),/太便宜 1 筆（33.3%）/);
  assert.equal(await page.locator('#feedback-table tbody tr').count(),3);
  assert.equal(await page.locator('#feedback-private-text tbody tr').count(),3);
  await page.selectOption('#feedback-script','寂靜與秩序之下');
  assert.equal(await page.locator('#feedback-event').inputValue(),'all');
  assert.match(await page.locator('#feedback-current').textContent(),/30 筆回饋/);
  await page.selectOption('#feedback-script','all');
  assert.equal(await page.locator('#feedback-table th').count(),18);
  for(const [label,color] of [['太便宜','rgb(64, 153, 109)'],['可以接受','rgb(229, 189, 75)'],['太貴','rgb(217, 105, 97)']]) {
    assert.equal(await page.locator(`[data-fee="${label}"] .fee-color`).evaluate(el=>getComputedStyle(el).backgroundColor),color);
  }
  assert.equal(await page.locator('#feedback-table td img').count(),0);
  assert.equal(await page.evaluate(()=>window.feedbackXss),undefined);
  assert(!(await page.locator('#feedback-table').textContent()).includes('private-raw-marker'));
  await page.selectOption('#feedback-event','all');
  assert.equal(await page.locator('#feedback-table tbody tr').count(),25);
  await page.locator('#feedback-table [data-grid-step="1"]').click();
  assert.equal(await page.locator('#feedback-table tbody tr').count(),9);
  assert.equal(await page.locator('.rating-score').first().textContent(),'3.91 / 5');
  await page.fill('#feedback-search','推薦！');
  assert.equal(await page.locator('#feedback-table tbody tr').count(),1);
  assert.match(await page.locator('#feedback-current').textContent(),/1 筆回饋/);
  assert.equal(await page.locator('.rating-score').first().textContent(),'3.00 / 5');
  await page.fill('#feedback-search','not-a-match');
  assert.match(await page.locator('#feedback-current').textContent(),/沒有符合篩選條件/);
  assert.equal(await page.locator('.rating-score').first().textContent(),'— / 5');
  assert.equal(await page.locator('.feedback-fee-stack.is-empty').count(),1);
  await page.fill('#feedback-search','');
  await page.locator('#feedback-table [data-filter=storyRating][data-bound=min]').fill('5');
  assert.equal(await page.locator('#feedback-table tbody tr').count(),1);
  assert.equal(await page.locator('.rating-score').first().textContent(),'5.00 / 5');
  assert.equal(await page.locator('[data-fee-segment]').count(),1);
  assert.equal(await page.locator('[data-fee-segment]').first().evaluate(el=>el.style.width),'100%');
  assert.equal(await page.locator('.rating-baseline').first().getAttribute('title'),'全部場次平均：3.91 / 5');
  await page.locator('#feedback-table [data-clear-filters]').click();
  assert.equal(await page.locator('#feedback-table th[data-column=createdAt]').getAttribute('aria-sort'),'descending');
  await page.locator('#feedback-table [data-sort=nickname]').click();
  assert.equal(await page.locator('#feedback-table th[data-column=nickname]').getAttribute('aria-sort'),'ascending');
  await page.locator('#feedback-table [data-clear-filters]').click();
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:1000});
    const written=await page.locator('#feedback-written').boundingBox();
    const summaryChart=await page.locator('#feedback-current').boundingBox();
    const fullTable=await page.locator('#feedback-table').boundingBox();
    assert(written.y>=summaryChart.y+summaryChart.height && written.y+written.height<=fullTable.y);
    const chart=await page.locator('.feedback-rating-chart').boundingBox();
    const fees=await page.locator('.feedback-fee-chart').boundingBox();
    assert(fees.y>=chart.y+chart.height);
    const bar=await page.locator('.rating-bar').first().boundingBox();
    assert(bar.height>bar.width);
    const cells=page.locator('#feedback-table tbody tr').first().locator('.frozen-column');
    assert.equal(await cells.count(),3);
    const before=await cells.evaluateAll(cells=>cells.map(cell=>cell.getBoundingClientRect().left));
    await page.locator('#feedback-table .grid-scroll').evaluate(el=>el.scrollLeft=700);
    const after=await cells.evaluateAll(cells=>cells.map(cell=>cell.getBoundingClientRect().left));
    before.forEach((x,index)=>assert(Math.abs(x-after[index])<2));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#feedback-table .grid-scroll').evaluate(el=>el.scrollLeft=0);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`/tmp/admin-feedback-${width}.png`});
  }
  await page.evaluate(()=>window.failFeedback=true);
  await page.click('#feedback-refresh');
  await page.locator('#feedback-status').filter({hasText:'無法讀取'}).waitFor();
  assert.equal(await page.locator('#feedback-table').textContent(),'');
  assert.equal(await page.locator('#feedback-current').textContent(),'');
  assert.equal(await page.locator('#feedback-written').isVisible(),false);
  assert.equal(await page.locator('#feedback-private-text').textContent(),'');
  await page.evaluate(()=>window.failFeedback=false);
  await page.click('#feedback-refresh');
  await page.locator('#feedback-status').filter({hasText:'已讀取'}).waitFor();
  assert.equal(await page.locator('#feedback-event').inputValue(),'all');
  await page.locator('[data-nav=experience]').click();
  await page.locator('#experience-status').filter({hasText:'已讀取'}).waitFor();
  assert.equal(await page.locator('#screen-experience').isVisible(),true);
  await page.locator('[data-nav=feedback]').click();
  await page.evaluate(()=>window.delayFeedback=true);
  await page.click('#feedback-refresh');
  await page.waitForFunction(()=>window.releaseFeedback);
  // Hold navigation so the delayed result can resolve after authorization is revoked.
  await page.route('**/404/',route=>route.fulfill({contentType:'text/html',body:'Not found'}));
  await page.evaluate(()=>{window.testSignOut();window.releaseFeedback();});
  await page.waitForURL(base+'/404/');
  assert.deepEqual(errors,[]);
  await context.close();
  const empty=await open(undefined,[]);
  await empty.page.locator('#feedback-status').filter({hasText:'已讀取 0 筆'}).waitFor();
  assert.match(await empty.page.locator('#feedback-current').textContent(),/目前尚無跑團回饋/);
  await empty.context.close();
  for(const user of [null,{email:'other@example.test',emailVerified:true}]){
    const denied=await open(user);
    await denied.page.waitForURL(base+'/404/');
    assert.equal(await denied.page.evaluate(()=>window.testReads?.includes('experienceFeedback') || false),false);
    await denied.context.close();
  }
  console.log('PASS: form category; all/session/script filters and matching averages; full answers; safe text; filters/sort/pagination; frozen columns; mobile; failure retry; empty data; guest denial and sign-out during read.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
