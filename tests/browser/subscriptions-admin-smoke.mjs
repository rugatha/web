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
const rows=Array.from({length:29},(_,i)=>({id:`sub-${i}`,email:i===0?' Member@Example.com ':`person${i}@example.com`,status:i===1?'unsubscribed':'active',createdAt:`2026-10-${String(i+1).padStart(2,'0')}T00:00:00+08:00`}));
rows[1].unsubscribeFeedback={reasons:['快報內容不符合我的需求','想減少收到的電子郵件'],note:'希望快報更精簡。\n<img src=x onerror=alert(1)>'};
const history=[
 {id:'h0',email:'member@example.com',action:'subscribe',sequence:1,occurredAt:'2026-10-01T02:00:00Z',reasons:[],note:''},
 ...['subscribe','unsubscribe','subscribe','unsubscribe'].map((action,i)=>({id:`h${i+1}`,email:'person1@example.com',action,sequence:i+1,occurredAt:`2026-10-${String(2+i*3).padStart(2,'0')}T02:00:00Z`,reasons:action==='unsubscribe'?['想減少收到的電子郵件']:[],note:action==='unsubscribe'?`${i===1?'第一次':'第二次'}退訂 <保留文字>`:''})),
];
const browser=await chromium.launch({channel:'chrome',headless:true});
async function open({empty=false,memberFailure=false,subFailure=false,user={email:'rugathadnd@gmail.com',emailVerified:true}}={}) {
  const context=await browser.newContext({viewport:{width:1280,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{window.copiedEmails='';Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.failClipboard)throw Error('denied');window.copiedEmails=text;}}});});
  await page.route('https://www.gstatic.com/firebasejs/12.7.0/**',async route=>{
    const file=new URL(route.request().url()).pathname.split('/').pop();let body='';
    if(file==='firebase-app.js')body='export const getApps=()=>[];export const initializeApp=()=>({});';
    if(file==='firebase-auth.js')body=`export const getAuth=()=>({});export const onAuthStateChanged=(auth,cb)=>{window.testSignOut=()=>cb(null);cb(${JSON.stringify(user)});};`;
    if(file==='firebase-firestore.js')body=`const history=${JSON.stringify(empty?[]:history)};const rows=${JSON.stringify(empty?[]:rows)};for(const row of rows){const date=row.createdAt;row.createdAt={toDate:()=>new Date(date)};}
      export const getFirestore=()=>({});export const collection=(db,...parts)=>({name:parts.join('/')});
      export const getDocs=async ref=>{(window.testReads??=[]).push(ref.name);if(ref.name==='members'&&${memberFailure})throw Error('denied');if(ref.name==='experienceNewsletterSubscriptions'&&(${subFailure}||window.failSubscriptions))throw Error('denied');return {docs:(ref.name==='experienceNewsletterSubscriptions'?rows:ref.name==='experienceNewsletterEvents'?history:ref.name==='members'?[{id:'member',email:'member@example.com'}]:[]).map(row=>({id:row.id,data:()=>row}))};};`;
    await route.fulfill({contentType:'text/javascript',body});
  });
  await page.goto(base+'/admin/#subscriptions');return {page,context,errors};
}
const ready=async page=>page.locator('#sync-status').filter({hasText:'更新於'}).waitFor();
try {
  const {page,context,errors}=await open();await ready(page);
  await page.locator('#subscriptions-status').filter({hasText:'已讀取 29 筆'}).waitFor();
  assert.equal(await page.locator('[data-nav=subscriptions]').getAttribute('aria-current'),'page');
  assert.equal(await page.locator('#subscriptions-navigation [data-nav=subscriptions]').textContent(),'體驗團快報');
  assert.equal(await page.locator('#breadcrumb').textContent(),'訂閱 / 體驗團快報');
  assert.equal(await page.locator('[data-screen]:visible').count(),1);
  assert.equal(await page.locator('#date-controls').isVisible(),false);
  assert.equal(await page.locator('#subscriptions-active').textContent(),'28');
  assert.equal(await page.locator('#subscriptions-cancelled').textContent(),'1');
  assert.equal(await page.locator('#subscriptions-total').textContent(),'29');
  assert.equal(await page.locator('#subscriptions-table tbody tr').count(),25);
  assert.match(await page.locator('#subscriptions-trend circle').last().locator('title').textContent(),/：29 人$/);
  assert.equal(await page.locator('#subscriptions-history-table tbody tr').count(),5);
  assert.equal(await page.locator('#subscriptions-history-table th[data-column="occurredAt"]').getAttribute('aria-sort'),'descending');
  await page.selectOption('#subscriptions-history-email','person1@example.com');
  assert.equal(await page.locator('#subscriptions-history-table tbody tr').count(),4);
  assert.match(await page.locator('#subscriptions-history-table tbody tr').first().textContent(),/第二次退訂 <保留文字>/);
  await page.locator('#subscriptions-history-table [data-sort="occurredAt"]').click();
  assert.equal(await page.locator('#subscriptions-history-table th[data-column="occurredAt"]').getAttribute('aria-sort'),'ascending');
  assert.match(await page.locator('#subscriptions-history-table tbody tr').first().textContent(),/2026\/10\/02/);
  await page.selectOption('#subscriptions-history-table [data-filter="action"]','取消訂閱');
  assert.equal(await page.locator('#subscriptions-history-table tbody tr').count(),2);
  assert.match(await page.locator('#subscriptions-history-summary').textContent(),/符合 2 \/ 5 筆事件/);
  await page.locator('#subscriptions-history-table [data-clear-filters]').click();
  await page.selectOption('#subscriptions-history-email','');
  await page.selectOption('#subscriptions-table [data-filter=member]','是');
  assert.equal(await page.locator('#subscriptions-table tbody tr').count(),1);
  assert.match(await page.locator('#subscriptions-table tbody').textContent(),/Member@Example.com/);
  await page.click('#subscriptions-copy');
  const copied=await page.evaluate(()=>window.copiedEmails.split(', '));
  assert.equal(copied.length,28);assert.ok(copied.includes('member@example.com'));assert.ok(!copied.includes('person1@example.com'));
  assert.match(await page.locator('#subscriptions-copy-status').textContent(),/已複製 28/);
  await page.locator('#subscriptions-table [data-clear-filters]').click();
  await page.locator('#subscriptions-table [data-grid-step="1"]').click();assert.equal(await page.locator('#subscriptions-table tbody tr').count(),4);
  await page.selectOption('#subscriptions-table [data-filter=status]','取消訂閱');
  assert.equal(await page.locator('#subscriptions-table tbody tr').count(),1);
  const reasonCell=page.locator('#subscriptions-table tbody td[data-column="unsubscribeReason"]');
  assert.match(await reasonCell.textContent(),/快報內容不符合我的需求、想減少收到的電子郵件/);
  assert.match(await reasonCell.textContent(),/補充：希望快報更精簡。\n<img src=x onerror=alert\(1\)>/);
  assert.equal(await reasonCell.locator('img').count(),0,'Feedback is rendered as text, not HTML');
  await page.locator('#subscriptions-table [data-filter="unsubscribeReason"]').fill('更精簡');
  assert.equal(await page.locator('#subscriptions-table tbody tr').count(),1);
  await page.evaluate(()=>window.failClipboard=true);await page.click('#subscriptions-copy');
  assert.equal(await page.locator('#subscriptions-copy-fallback').isVisible(),true);
  assert.equal((await page.locator('#subscriptions-copy-emails').inputValue()).split(', ').length,28);
  await page.locator('#subscriptions-table [data-clear-filters]').click();
  await page.evaluate(()=>window.failClipboard=false);await page.click('#subscriptions-copy');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await import('node:fs/promises').then(fs=>fs.mkdir('output/admin',{recursive:true}));
  assert.equal(await page.locator('#admin-menu-open').isVisible(),true);
  assert.equal(await page.locator('#admin-sidebar').isVisible(),false);
  assert.equal(await page.locator('#admin-mobile-title').textContent(),'體驗團快報');
  await page.locator('#admin-menu-open').click();
  await page.locator('#admin-navigation-dialog').waitFor();
  assert.equal(await page.locator('#admin-menu-open').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#admin-navigation-dialog [aria-current=page]').textContent(),'體驗團快報');
  await page.screenshot({path:'output/admin/mobile-navigation-open.png'});
  for(let i=0;i<18;i++){
    await page.keyboard.press('Tab');
    assert.ok(await page.locator('#admin-navigation-dialog').evaluate(node=>node.contains(document.activeElement)),'Focus stays in the mobile drawer');
  }
  await page.keyboard.press('Escape');
  await page.locator('#admin-navigation-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#admin-menu-open').getAttribute('aria-expanded'),'false');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'admin-menu-open');
  await page.locator('#admin-menu-open').click();
  await page.locator('[data-nav=members]').click();
  await page.locator('#screen-members').waitFor();
  assert.equal(await page.locator('#admin-navigation-dialog').isVisible(),false);
  assert.equal(await page.locator('#admin-mobile-title').textContent(),'會員管理');
  await page.locator('#admin-menu-open').click();
  await page.locator('[data-nav=subscriptions]').click();
  await page.locator('#screen-subscriptions').waitFor();
  assert.equal(await page.locator('#admin-navigation-dialog').isVisible(),false);
  await page.locator('#admin-menu-open').click();
  await page.mouse.click(382,180);
  await page.locator('#admin-navigation-dialog').waitFor({state:'hidden'});
  await page.locator('#admin-menu-open').click();
  await page.locator('#admin-menu-close').click();
  await page.locator('#admin-navigation-dialog').waitFor({state:'hidden'});
  await page.locator('#admin-menu-open').click();
  await page.setViewportSize({width:1440,height:1050});
  await page.locator('#admin-navigation-dialog').waitFor({state:'hidden'});
  await page.locator('#dashboard > #admin-sidebar').waitFor();
  assert.equal(await page.locator('#dashboard > #admin-sidebar').count(),1);
  assert.equal(await page.locator('#admin-menu-open').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.body.classList.contains('admin-menu-open')),false);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#admin-navigation-dialog > #admin-sidebar').waitFor({state:'attached'});
  assert.equal(await page.locator('#admin-sidebar').isVisible(),false);
  await page.locator('#subscriptions-status').evaluate(node=>node.textContent='測試資料預覽，非正式訂閱名單');
  await page.screenshot({path:'output/admin/subscriptions-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1050});await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await page.screenshot({path:'output/admin/subscriptions-desktop.png',fullPage:true});
  await page.evaluate(()=>window.failSubscriptions=true);await page.click('#subscriptions-refresh');
  await page.locator('#subscriptions-status').filter({hasText:'無法讀取'}).waitFor();
  assert.equal(await page.locator('#subscriptions-copy').isDisabled(),true);assert.equal(await page.locator('#subscriptions-table tbody').count(),0);
  assert.equal(await page.locator('#subscriptions-copy-emails').inputValue(),'');
  await page.evaluate(()=>window.failSubscriptions=false);await page.click('#subscriptions-refresh');
  await page.locator('#subscriptions-status').filter({hasText:'已讀取 29 筆'}).waitFor();
  await page.evaluate(()=>window.testSignOut());await page.waitForURL(base+'/404/');assert.equal(await page.locator('#subscriptions-table').count(),0);
  assert.deepEqual(errors,[]);await context.close();
  for(const options of [{empty:true},{memberFailure:true},{subFailure:true}]) {
    const view=await open(options);await ready(view.page);
    await view.page.locator('#subscriptions-status').filter({hasText:options.subFailure?'無法讀取':'已讀取'}).waitFor();
    if(options.empty) {assert.equal(await view.page.locator('#subscriptions-total').textContent(),'0');assert.equal(await view.page.locator('#subscriptions-copy').isDisabled(),true);}
    if(options.memberFailure) {assert.match(await view.page.locator('#subscriptions-summary').textContent(),/會員資料讀取失敗/);assert.match(await view.page.locator('#subscriptions-table tbody').textContent(),/尚未完成比對/);assert.equal(await view.page.locator('#subscriptions-copy').isDisabled(),false);}
    if(options.subFailure) assert.equal(await view.page.locator('#subscriptions-copy').isDisabled(),true);
    assert.deepEqual(view.errors,[]);await view.context.close();
  }
  const guest=await open({user:null});await guest.page.waitForURL(base+'/404/');assert.equal(await guest.page.evaluate(()=>window.testReads?.includes('experienceNewsletterSubscriptions')||false),false);await guest.context.close();
  console.log('PASS: subscriptions chart, membership, pagination/filters, complete active-email clipboard, fallback, refresh failures/recovery, empty state, authorization and mobile layout');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
