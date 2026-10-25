// Test-only event configuration and transport; never reads/writes production.
import assert from 'node:assert/strict';
import {readFile, mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.RUGATHA_TEST_BASE_URL || 'http://127.0.0.1:8790';
const raw=JSON.parse(await readFile('experience/register/experience_info.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for (const scenario of ['inactive','open','full','closed','expired','network-error','config-error']) {
    const context=await browser.newContext({viewport:{width:1280,height:1000}});
    const page=await context.newPage();
    await page.route(/^https:\/\//,route=>route.abort());
    const config={...raw,active:scenario==='inactive'?'n':'y',startDate:'2099-01-02',endDate:'2099-01-02',deadline:scenario==='expired'?'2000-01-01':'2099-01-01'};
    await page.route('**/experience_info.json',route=>scenario==='config-error'?route.fulfill({status:500,body:'error'}):route.fulfill({json:config}));
    let transportReads=0;
    await page.route('**/experience/register/firebase-registration.js',route=>{
      transportReads++;
      return route.fulfill({contentType:'application/javascript',body:`export const watchEvent=(id,cb,fail)=>{window.testSetSeats=n=>cb({remainingSeats:n,registrationOpen:${scenario!=='closed'},deadline:4102444799999});${scenario==='network-error'?'fail();':`window.testSetSeats(${scenario==='full'?0:3});`}};`});
    });
    await page.goto(base+'/experience/');
    const status=page.locator('#current-experience-status');
    const expected={inactive:'closed',open:'open',full:'full',closed:'closed',expired:'closed','network-error':'unavailable','config-error':'unavailable'}[scenario];
    await page.waitForFunction(expected=>document.getElementById('current-experience-status').dataset.state===expected,expected);
    if(scenario!=='config-error') {
      assert.equal(await page.locator('#current-experience-title').textContent(),`《${raw.scriptName}》`);
      assert.match(await page.locator('#current-experience-time').textContent(),/2099\/01\/02.*13:00.*17:30/);
    }
    if(scenario==='inactive') {assert.equal(transportReads,0);assert.match(await status.textContent(),/報名已截止/);}
    if(scenario==='full') assert.match(await status.textContent(),/已額滿/);
    if(scenario==='open') {
      assert.equal(await status.textContent(),'尚有名額');
      assert.match(await page.locator('#current-experience-link').textContent(),/前往體驗團報名/);
      const lede=await page.locator('.experience-hero__lede').boundingBox();
      const card=await page.locator('.current-experience').boundingBox();
      const history=await page.locator('.experience-list').boundingBox();
      assert.ok(card.y>=lede.y+lede.height && card.y+card.height<=history.y);
      await mkdir('output/experience',{recursive:true});
      await page.screenshot({path:'output/experience/current-event-desktop.png'});
      await page.evaluate(()=>window.testSetSeats(0));assert.match(await status.textContent(),/已額滿/);
      await page.evaluate(()=>window.testSetSeats(2));assert.equal(await status.textContent(),'尚有名額');
      await page.setViewportSize({width:390,height:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:'output/experience/current-event-mobile.png'});
    }
    await page.locator('#current-experience-link').click();
    assert.equal(new URL(page.url()).pathname,'/experience/register/');
    await context.close();
  }
  console.log('PASS: event details, inactive/open/full/closed/expired states, live seats, failures, placement, mobile layout and registration link.');
} finally {await browser.close();}
