// All Firebase doubles live in the test process. No production preview identity.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dayKey,dateOffset } from '../admin/dashboard-model.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
const base='http://127.0.0.1:8790',today=dayKey(new Date()),recent=today+'T04:00:00Z',old='2026-01-02T00:00:00Z';
const admin={email:'rugathadnd@gmail.com',emailVerified:true};
const members=Array.from({length:28},(_,i)=>({id:`0000-${String(i+1).padStart(4,'0')}`,memberNo:`0000-${String(i+1).padStart(4,'0')}`,memberId:`uid-${i+1}`,displayName:i===0?'Owner <test>':`Member ${i+1}`,email:`member${i+1}@example.test`,campaign:i===0?'Rugatha Lite':'',createdAt:i===0?recent:old,lastLoginAt:recent}));
const datasets={members,
  'members/0000-0001/characters':[{id:'Ada%20One',characterName:'Ada <One>',className:'wizard',race:'human',createdAt:recent,updatedAt:recent}],
  'members/0000-0002/characters':[{id:'Old',characterName:'Old card',className:'fighter',race:'elf',createdAt:old,updatedAt:recent}],
  'members/0000-0001/qaChoices':[{choice:'C1',questionPage:'npc/npc_page/pages/Addie_Applewood.html',createdAt:recent}],
  'members/0000-0002/qaChoices':[{choice:'C2',questionPage:'npc/npc_page/pages/Addie_Applewood.html',createdAt:old}],
  'members/0000-0003/qaChoices':[{choice:'C1',questionPage:'npc/retired.html',createdAt:null}]
};
async function open(user,{failure=false,sdkFailure=false,authHung=false,dependencyFailure=false}={}) {
  const context=await browser.newContext({viewport:{width:1512,height:1050}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  if(authHung)await page.clock.install();
  if(dependencyFailure)await page.route(/\/admin\/dashboard-model\.js/,route=>route.abort());
  await page.route('https://www.gstatic.com/firebasejs/12.7.0/**',async route=>{
    if(sdkFailure){await route.abort();return;}
    const file=new URL(route.request().url()).pathname.split('/').pop();let body='';
    if(file==='firebase-app.js')body='export const getApps=()=>[];export const initializeApp=()=>({});';
    if(file==='firebase-auth.js')body=`export const getAuth=()=>({});export const onAuthStateChanged=(auth,callback)=>{window.testSignOut=()=>callback(null);${authHung?'window.testAuthWaiting=true;':`callback(${JSON.stringify(user)});`}};`;
    if(file==='firebase-firestore.js')body=`export const getFirestore=()=>({});export const collection=(db,...parts)=>({path:parts.join('/')});const data=${JSON.stringify(datasets)};export const getDocs=async ref=>{(window.testReads??=[]).push(ref.path);${failure?"throw Object.assign(new Error('denied'),{code:'permission-denied'});":"return {docs:(data[ref.path]||[]).map((item,i)=>({id:item.id||String(i),data:()=>item}))};"}};`;
    await route.fulfill({status:200,contentType:'application/javascript',body});
  });
  await page.goto(base+'/admin/');return {context,page,errors};
}
const ready=async page=>page.locator('#sync-status').filter({hasText:'更新於'}).waitFor();
async function navigate(page,name){await page.locator(`[data-nav="${name}"]`).click();await page.locator(`#screen-${name}`).waitFor();assert.equal(await page.locator('[data-screen]:visible').count(),1);}
try {
  const local=await browser.newContext(),file=await local.newPage();
  await file.goto(new URL('../admin/index.html',import.meta.url).href);assert.match(await file.locator('#gate').textContent(),/直接開啟 HTML/);assert.equal(await file.locator('#dashboard').isVisible(),false);await local.close();
  for(const options of [{sdkFailure:true},{dependencyFailure:true},{authHung:true}]){
    const failed=await open(admin,options);
    if(options.authHung){await failed.page.waitForFunction(()=>window.testAuthWaiting);await failed.page.clock.fastForward(21000);}
    await failed.page.getByText('無法完成登入驗證。',{exact:false}).waitFor();assert.equal(await failed.page.locator('#dashboard').isVisible(),false);assert.deepEqual(failed.errors,[]);await failed.context.close();
  }
  for(const user of [null,{email:'other@example.com',emailVerified:true},{email:'rugathadnd@gmail.com',emailVerified:false}]){
    const guest=await open(user);await guest.page.waitForURL(base+'/404/');assert.equal((await guest.page.reload()).status(),404);await guest.context.close();
  }
  const {context,page,errors}=await open(admin);await ready(page);
  assert.equal(await page.locator('#overview-members').textContent(),'28');assert.equal(await page.locator('#overview-characters').textContent(),'2');assert.equal(await page.locator('#overview-arcs').textContent(),'34');assert.equal(await page.locator('#overview-chapters').textContent(),'99');
  assert.equal(await page.locator('[data-nav="traffic"]').count(),0);assert.equal(await page.evaluate(()=>window.testReads.some(path=>path.includes('pageAccess'))),false);
  await navigate(page,'members');assert.equal(await page.locator('#member-table tbody tr').count(),25);await page.locator('#member-table [data-grid-step="1"]').click();assert.equal(await page.locator('#member-table tbody tr').count(),3);
  assert.equal(await page.locator('#refresh').count(),0);
  assert.equal(await page.locator('.brand img').getAttribute('src'),'/assets/banner/rugatha-banner-trademark-transparent.png');
  assert.equal(await page.locator('#date-from').getAttribute('min'),'2026-01-01');
  assert.equal(await page.locator('#date-from').inputValue(),'2026-01-01');
  assert.equal(await page.locator('#member-table th').filter({hasText:'團務'}).count(),0);
  await page.locator('#member-table [data-sort=createdAt]').click();await page.locator('#member-table [data-sort=createdAt]').click();
  assert.match(await page.locator('#member-table tbody tr').first().textContent(),/Owner <test>/);
  await page.locator('#member-table [data-filter=createdAt][data-bound=min]').fill(today);assert.equal(await page.locator('#member-filtered').textContent(),'1');
  await page.locator('#member-table [data-clear-filters]').click();
  await page.locator('#member-table [data-filter=cards][data-bound=min]').fill('1');assert.equal(await page.locator('#member-filtered').textContent(),'2');
  await page.locator('#member-table [data-clear-filters]').click();
  await page.locator('#member-table [data-filter=email]').fill('member28@example.test');assert.equal(await page.locator('#member-filtered').textContent(),'1');
  await page.locator('#member-table [data-filter=email]').fill('not-present');assert.equal(await page.locator('#member-filtered').textContent(),'0');
  assert.equal(await page.locator('#member-table [data-filter=email]').count(),1);
  await page.locator('#member-table [data-clear-filters]').click();
  await page.locator('#member-table [data-drag=email]').dragTo(page.locator('#member-table th[data-column=number]'));
  assert.equal(await page.locator('#member-table th').first().getAttribute('data-column'),'email');
  await page.locator('#member-table [data-drag=email]').focus();await page.keyboard.press('Alt+ArrowRight');
  assert.equal(await page.locator('#member-table th').nth(1).getAttribute('data-column'),'email');
  await page.reload();await ready(page);assert.equal(await page.locator('#member-table th').nth(1).getAttribute('data-column'),'email');
  await page.locator('#member-table [data-reset-order]').click();
  await page.fill('#member-search','member1@example.test');assert.equal(await page.locator('#member-table tbody tr').count(),1);assert.match(await page.locator('#member-table').textContent(),/Owner <test>/);assert.equal(await page.locator('#member-table td a').first().getAttribute('href'),'/member/?memberId=uid-1');assert.equal(await page.locator('#member-table test').count(),0);await page.fill('#member-search','');
  await page.locator('[data-preset="7"]').click();assert.equal(await page.locator('#member-filtered').textContent(),'1');
  await page.selectOption('#member-date-field','lastLoginAt');assert.equal(await page.locator('#member-filtered').textContent(),'28');
  await page.fill('#date-from',dateOffset(today,-2));await page.fill('#date-to',today);await page.click('#date-apply');assert.match(await page.locator('#range-label').textContent(),new RegExp(today));
  await page.fill('#date-from',today);await page.fill('#date-to',dateOffset(today,-1));await page.click('#date-apply');assert.equal(await page.locator('#date-error').isVisible(),true);
  await page.locator('[data-preset=all]').click();await page.locator('#range-from').focus();await page.keyboard.press('ArrowRight');assert.notEqual(await page.locator('#date-from').inputValue(),'');assert.equal(await page.locator('#date-error').isVisible(),false);await page.locator('[data-preset=all]').click();
  await navigate(page,'characters');assert.equal(await page.locator('#character-table tbody tr').count(),2);const characterLink=await page.locator('#character-table a').first().getAttribute('href');assert.match(characterLink,/memberId=uid-1/);assert.equal(new URL(characterLink,base).searchParams.get('character'),'Ada%20One');assert.match(await page.locator('#character-table').textContent(),/Owner <test>/);
  await page.locator('[data-preset="7"]').click();assert.equal(await page.locator('#character-filtered').textContent(),'1');await page.selectOption('#character-date-field','updatedAt');assert.equal(await page.locator('#character-filtered').textContent(),'2');await page.locator('[data-preset=all]').click();
  await navigate(page,'campaigns');assert.equal(await page.locator('#date-controls').isVisible(),true);await page.selectOption('#campaign-filter','Rugatha');assert.equal(await page.locator('.arc').count(),5);await page.locator('.arc').first().locator('summary').click();assert.equal(await page.locator('.arc').first().locator('.chapter-list li').count(),7);await page.click('#expand-arcs');assert.equal(await page.locator('.arc[open]').count(),5);await page.click('#collapse-arcs');assert.equal(await page.locator('.arc[open]').count(),0);
  await navigate(page,'npcs');assert.equal(await page.locator('#npc-overview-charts .npc-pie').count(),6);for(const dimension of ['gender','kingdom','race','status','religion','location']){await page.selectOption('#npc-dimension',dimension);assert.ok(await page.locator('#npc-chart .distribution-row').count()>0);assert.match(await page.locator('#npc-method').textContent(),/分母/);}await page.selectOption('#npc-dimension','gender');await page.selectOption('#npc-category','男性');assert.equal(await page.locator('#npc-table td[data-column=gender]').first().textContent(),'男性');
  await navigate(page,'fate');assert.equal(await page.locator('#fate-table tbody tr').count(),2);
  assert.equal(await page.locator('#fate-answers').textContent(),'3');assert.equal(await page.locator('#fate-members').textContent(),'3');
  assert.match(await page.locator('#fate-date-quality').textContent(),/1 筆歷史回答未記錄日期/);
  await page.locator('#fate-include-undated').uncheck();assert.equal(await page.locator('#fate-answers').textContent(),'2');assert.equal(await page.locator('#fate-members').textContent(),'2');
  await page.locator('#fate-include-undated').check();assert.equal(await page.locator('#fate-answers').textContent(),'3');await page.locator('#fate-show-unanswered').check();assert.ok(await page.locator('#fate-table tbody tr').count()>100);await page.fill('#fate-search','艾迪');assert.equal(await page.locator('#fate-table tbody tr').count(),1);assert.match(await page.locator('#fate-table').textContent(),/50.0%/);await page.locator('[data-preset="7"]').click();assert.match(await page.locator('#fate-table').textContent(),/100.0%/);await page.fill('#fate-search','');await page.locator('#fate-show-unanswered').check();await page.locator('#fate-table [data-filter=total][data-bound=max]').fill('0');assert.equal(await page.locator('#fate-answers').textContent(),'0');assert.match(await page.locator('#fate-table tbody tr').first().textContent(),/—/);
  await page.locator('[data-preset=all]').click();await page.locator('#fate-table [data-clear-filters]').click();await page.fill('#fate-search','retired');assert.equal(await page.locator('#fate-table tbody tr').count(),1);assert.match(await page.locator('#fate-table').textContent(),/歷史題目/);await page.fill('#fate-search','');
  await mkdir('output/admin',{recursive:true});await page.locator('#sync-status').evaluate(el=>el.textContent='測試資料預覽，非正式會員數字');await page.screenshot({path:'output/admin/v4-fate.png'});
  await navigate(page,'npcs');await page.screenshot({path:'output/admin/v4-npcs.png',fullPage:true});
  await navigate(page,'overview');await page.screenshot({path:'output/admin/v4-overview.png',fullPage:true});await navigate(page,'members');await page.screenshot({path:'output/admin/v4-members.png'});
  await page.setViewportSize({width:390,height:844});for(const name of ['overview','members','characters','campaigns','npcs','fate']){await navigate(page,name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow: ${name}`);}await navigate(page,'overview');await page.screenshot({path:'output/admin/v4-mobile.png',fullPage:true});
  await page.evaluate(()=>window.testSignOut());await page.waitForURL(base+'/404/');assert.deepEqual(errors,[]);await context.close();
  const failure=await open(admin,{failure:true});await ready(failure.page);assert.equal(await failure.page.locator('#overview-members').textContent(),'—');assert.match(await failure.page.locator('#notices').textContent(),/permission-denied/);await failure.context.close();
  console.log('PASS: persistent draggable columns, header filters/sorting, 2026 floor, light workspace, NPC pie overview, answered-only default, six independent screens, date boundaries/presets/drag, paginated members, character ownership/links, arc expansion, six NPC dimensions, full fate overview, retired access, auth/error handling and responsive layouts');
} finally {await browser.close();}
