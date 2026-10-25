// UI uses test-only Firebase doubles. No production reads or writes.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const base='http://127.0.0.1:8790';
const datasets={experienceEvents:[{id:'2026-10-test',scriptName:'洛林精神',registeredPlayers:3,maxPlayers:5},{id:'2025-test',scriptName:'歷史場次',registeredPlayers:1,maxPlayers:5}],experienceRegistrations:[{id:'a'.repeat(20),eventId:'2026-10-test',partySize:3,name:'同行 <三人>',contact:'test@example.test',systems:['其他'],systemsOther:'測試系統',sources:['Threads'],dndExperience:'聽過，但沒玩過',rugathaExperience:'無',boundaries:'避開血腥',notes:'三人同行'},{id:'b'.repeat(20),eventId:'2025-test',partySize:1,name:'以前的玩家',contact:'LINE: old'}]};
try {
 const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://www.gstatic.com/firebasejs/12.7.0/**',async route=>{
  const file=new URL(route.request().url()).pathname.split('/').pop();
  let body='';
  if(file==='firebase-app.js')body='export const getApps=()=>[];export const initializeApp=()=>({});';
  if(file==='firebase-auth.js')body='export const getAuth=()=>({});export const onAuthStateChanged=(a,cb)=>cb({email:"rugathadnd@gmail.com",emailVerified:true});';
  if(file==='firebase-firestore.js')body=`const data=${JSON.stringify(datasets)};export const getFirestore=()=>({});export const collection=(db,name)=>({name});export const doc=(db,name,id)=>({name,id});export const serverTimestamp=()=>null;export const getDocs=async ref=>({docs:(data[ref.name]||[]).map(row=>({id:row.id,data:()=>row}))});export const runTransaction=async(db,fn)=>fn({get:async ref=>({exists:()=>true,data:()=>data[ref.name].find(r=>r.id===ref.id)}),update:(ref,changes)=>Object.assign(data[ref.name].find(r=>r.id===ref.id),changes)});`;
  await route.fulfill({contentType:'application/javascript',body});
 });
 await page.goto(base+'/admin/#experience');
 await page.locator('#experience-status').filter({hasText:'已讀取'}).waitFor();
 await page.selectOption('#experience-event','2026-10-test');
 assert.equal(await page.locator('.seat-box').count(),5);
 assert.equal(await page.locator('.seat-box.occupied').count(),3);
 assert.equal(await page.locator('#date-controls').isVisible(),false);
 assert.match(await page.locator('#experience-table').textContent(),/test@example.test/);
 assert.match(await page.locator('#experience-table').textContent(),/避開血腥/);
 assert.equal(await page.locator('#experience-table tbody tr').count(),1);
 page.on('dialog',dialog=>dialog.accept());
 await page.locator('[data-cancel-registration]').click();
 await page.waitForFunction(()=>document.querySelectorAll('.seat-box.occupied').length===0);
 assert.match(await page.locator('#experience-table tbody').textContent(),/已取消/);
 assert.equal(await page.locator('[data-cancel-registration]').count(),0);
 await page.selectOption('#experience-event','2025-test');
 assert.equal(await page.locator('.seat-box.occupied').count(),1);
 await page.selectOption('#experience-event','all');
 assert.equal(await page.locator('#experience-table tbody tr').count(),2);
 await page.fill('#experience-search','test@example.test');
 assert.equal(await page.locator('#experience-table tbody tr').count(),1);
 await page.fill('#experience-search','');
 await page.selectOption('#experience-event','2026-10-test');
 await mkdir('output/experience',{recursive:true});
 await page.screenshot({path:'output/experience/admin-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:'output/experience/admin-mobile.png',fullPage:true});
 const config=JSON.parse(await readFile('experience/register/experience_info.json','utf8'));
 Object.assign(config,{active:'y',startDate:'2099-01-02',endDate:'2099-01-02',deadline:'2099-01-01'});
 await page.route('**/experience_info.json',route=>route.fulfill({json:config}));
 await page.route('**/experience/register/firebase-registration.js',route=>route.fulfill({contentType:'application/javascript',body:'export const createRegistrationId=()=>"test";export const saveRegistration=async()=>{};export const watchEvent=(id,cb)=>{window.testSetSeats=(n)=>cb({remainingSeats:n,maxPlayers:5,registeredPlayers:5-n,registrationOpen:true,deadline:4102444799999});window.testSetSeats(5);return ()=>{}};'}));
 for(const width of [701,768,1280,1512,390]) {
  await page.setViewportSize({width,height:1000});await page.goto(base+'/experience/register/');
  await page.locator('#registration-form').waitFor();await page.evaluate(()=>document.fonts.ready);
  const size=await page.locator('#page-title .title-line').first().evaluate(el=>({height:el.getBoundingClientRect().height,line:parseFloat(getComputedStyle(el).lineHeight),width:el.scrollWidth,available:el.clientWidth,textWidth:(()=>{const r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect().width;})()}));
  assert.ok(size.textWidth/size.available>=.88,`title too small at ${width}`);assert.ok(size.height<=size.line+1,`title wraps at ${width}`);assert.ok(size.width<=size.available+1,`title overflows at ${width}`);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.locator('#contact').getAttribute('type'),'email');
  await page.locator('#contact-alternative').check();assert.equal(await page.locator('#contact').getAttribute('type'),'text');
  await page.locator('#contact-alternative').uncheck();assert.equal(await page.locator('#contact').getAttribute('type'),'email');
  assert.equal(await page.locator('footer').count(),0);
  const poster=await page.locator('#event-poster').evaluate(el=>({radius:getComputedStyle(el).borderRadius,shadow:getComputedStyle(el).boxShadow}));
  assert.equal(poster.radius,'18px');assert.notEqual(poster.shadow,'none');
  if([1280,390].includes(width)) {
   await page.screenshot({path:`output/experience/register-${width}.png`,fullPage:true});
   await page.evaluate(()=>window.testSetSeats(0));await page.locator('#full-notice').waitFor();
   assert.equal(await page.locator('#event-status').evaluate(el=>getComputedStyle(el).color),'rgb(246, 209, 133)');
   await page.screenshot({path:`output/experience/register-full-${width}.png`,fullPage:true});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: event filtering, all answers, five seat boxes, cancellation UI, historical events, search, responsive layouts, single-line desktop title and email fallback.');
} finally {await browser.close();}
