// Private CSV is read locally; logs contain aggregate counts only.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const rows = JSON.parse(execFileSync('python3', ['-c', `import csv,json,sys
with open(sys.argv[1],encoding='utf-8-sig',newline='') as f:
 print(json.dumps(list(csv.DictReader(f)),ensure_ascii=False))`, process.argv.find(a=>a.endsWith('.csv')) || 'experience/experience_his.csv'], {encoding:'utf8'}));
const columns = {'場次':'eventId','稱呼':'name','聯絡方式':'contact','狀態':'status','其他系統':'systemsOther','D&D 經驗':'dndExperience','Rugatha 經驗':'rugathaExperience','其他管道':'sourcesOther','不能接受的內容':'boundaries','備註':'notes','DM_Note':'DM_Note'};
const encode = value => typeof value==='number' ? {integerValue:String(value)} : typeof value==='boolean' ? {booleanValue:value} : Array.isArray(value) ? {arrayValue:{values:value.map(encode)}} : {stringValue:value};
const entries=rows.map((row,index)=>{
 if (Object.values(row).some(v=>typeof v!=='string') || !Object.keys(columns).every(k=>k in row)) throw new Error(`Invalid CSV row ${index+2}`);
 const data=Object.fromEntries(Object.entries(columns).map(([key,field])=>[field,row[key]]));
 const date=row['報名時間'];
 if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) throw new Error('Invalid registration date');
 const timestamp=new Date(date.replace(' ','T')+'+08:00').toISOString();
 data.partySize=Number(row['人數']);
 if(!Number.isSafeInteger(data.partySize)||data.partySize<1||!data.eventId||!data.name||!data.status) throw new Error('Invalid registration identity or party size');
 data.systems=row['TRPG 系統']?row['TRPG 系統'].split(/\r?\n/):[];
 data.sources=row['得知管道']?row['得知管道'].split(/\r?\n/):[];
 data.schemaVersion=1;
 const raw=JSON.stringify(row);
 const id='history-'+createHash('sha256').update(raw).digest('hex').slice(0,32);
 const fields=Object.fromEntries(Object.entries(data).map(([k,v])=>[k,encode(v)]));
 fields.createdAt={timestampValue:timestamp};
 fields.historySource=encode('experience_his.csv');
 fields.historyOriginal=encode(raw);
 return {id,data,fields};
});
if(new Set(entries.map(e=>e.id)).size!==entries.length) throw new Error('Duplicate CSV rows; import stopped');
const events=[...new Set(entries.map(e=>e.data.eventId))];
console.log(`Validated ${entries.length} registrations / ${events.length} events. Dates interpreted in Asia/Taipei; DM_Note and original CSV values retained.`);
if(!process.argv.includes('--apply')&&!process.argv.includes('--verify')){console.log('Dry run. Use --apply to import or --verify to read back.');process.exit(0);}
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth'),{Client}=require('firebase-tools/lib/apiv2');
const options={project:'rugatha-87e15'},account=auth.getProjectDefaultAccount(process.cwd());
if(!account)throw new Error('Sign in with firebase login first');
auth.setActiveAccount(options,account);await requireAuth(options);
const client=new Client({urlPrefix:'https://firestore.googleapis.com'});
const database='projects/rugatha-87e15/databases/(default)',prefix=`${database}/documents`;
const list=async collection=>{
 const result=await client.post(`/v1/${prefix}:runQuery`,{structuredQuery:{from:[{collectionId:collection}]}},{skipLog:{reqBody:true,resBody:true}});
 return result.body.filter(r=>r.document).map(r=>r.document);
};
const existing=await list('experienceRegistrations'),existingEvents=await list('experienceEvents');
const byName=new Map(existing.map(d=>[d.name,d]));
const canonicalEventId=id=>existingEvents.find(d=>d.name===`${prefix}/experienceEvents/${id}`)?.fields.aliasOf?.stringValue || id;
const writes=[];
for(const entry of entries){
 entry.data.eventId=canonicalEventId(entry.data.eventId);
 entry.fields.eventId=encode(entry.data.eventId);
 const name=`${prefix}/experienceRegistrations/${entry.id}`,previous=byName.get(name);
 if(previous){if(previous.fields.historyOriginal?.stringValue!==entry.fields.historyOriginal.stringValue)throw new Error('History ID conflict');continue;}
 const duplicate=existing.some(d=>d.fields.eventId?.stringValue===entry.data.eventId && d.fields.name?.stringValue===entry.data.name && d.fields.contact?.stringValue===entry.data.contact && Date.parse(d.fields.createdAt?.timestampValue)===Date.parse(entry.fields.createdAt.timestampValue));
 if(duplicate)throw new Error('An existing registration matches a CSV row; reconcile before importing');
 writes.push({update:{name,fields:entry.fields},currentDocument:{exists:false}});
}
for(const eventId of events){
 const name=`${prefix}/experienceEvents/${eventId}`;
 if(existingEvents.some(d=>d.name===name))continue;
 const count=entries.filter(e=>e.data.eventId===eventId&&e.data.status!=='cancelled').reduce((s,e)=>s+e.data.partySize,0);
 writes.push({update:{name,fields:{registrationOpen:encode(false),maxPlayers:encode(Math.max(5,count)),registeredPlayers:encode(count),deadline:{timestampValue:'2000-01-01T00:00:00Z'},historySource:encode('experience_his.csv')}},currentDocument:{exists:false}});
}
if(process.argv.includes('--apply')&&writes.length)await client.post(`/v1/${prefix}:commit`,{writes},{skipLog:{reqBody:true,resBody:true}});
const verified=await list('experienceRegistrations'),verifiedEvents=await list('experienceEvents');
let found=0;
for(const entry of entries){
 const saved=verified.find(d=>d.name===`${prefix}/experienceRegistrations/${entry.id}`);
 if(!saved)throw new Error('Missing history registration');
 // Compare all original fields on initial import; on later runs preserve admin edits.
 for(const [key,value] of Object.entries(entry.fields)){
  if(['status','DM_Note'].includes(key)&&saved.fields.updatedAt)continue;
  const normalize=v=>v?.timestampValue ? Date.parse(v.timestampValue) : v?.arrayValue ? (v.arrayValue.values || []).map(normalize) : v?.stringValue ?? v?.integerValue ?? v?.booleanValue;
  if(key==='eventId' && canonicalEventId(saved.fields[key]?.stringValue)===canonicalEventId(value.stringValue))continue;
  if(JSON.stringify(normalize(saved.fields[key]))!==JSON.stringify(normalize(value)))throw new Error(`Read-back mismatch in ${key}`);
 }
 found++;
}
for(const eventId of events){
 const event=verifiedEvents.find(d=>d.name===`${prefix}/experienceEvents/${canonicalEventId(eventId)}`);
 const count=verified.filter(d=>d.fields.eventId?.stringValue===canonicalEventId(eventId)&&d.fields.status?.stringValue!=='cancelled').reduce((s,d)=>s+Number(d.fields.partySize.integerValue),0);
 if(Number(event?.fields.registeredPlayers?.integerValue)!==count)throw new Error('Event seat count mismatch');
}
console.log(`Verified ${found}/${entries.length} complete historical registrations and ${events.length} event counts. Total backend registrations: ${verified.length}. Writes: ${process.argv.includes('--apply')?writes.length:0}.`);
if(process.argv.includes('--verify-ui')) {
 // Render the production read-back in a local browser, without exposing PII in logs
 // or making browser writes. Admin authorization is separately covered by Rules tests.
 const {chromium}=await import('@playwright/test');
 const decode=v=>v.timestampValue?{__timestamp:v.timestampValue}:v.arrayValue?(v.arrayValue.values||[]).map(decode):v.stringValue??(v.integerValue!==undefined?Number(v.integerValue):v.booleanValue??null);
 const dataset=Object.fromEntries([['experienceRegistrations',verified],['experienceEvents',verifiedEvents]].map(([key,docs])=>[key,docs.map(d=>({id:d.name.split('/').pop(),...Object.fromEntries(Object.entries(d.fields).map(([k,v])=>[k,decode(v)]))}))]));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.gstatic.com/firebasejs/12.7.0/**',async route=>{
   const file=new URL(route.request().url()).pathname.split('/').pop();let body='';
   if(file==='firebase-app.js')body='export const getApps=()=>[];export const initializeApp=()=>({});';
   if(file==='firebase-auth.js')body='export const getAuth=()=>({});export const onAuthStateChanged=(a,cb)=>cb({email:"rugathadnd@gmail.com",emailVerified:true});';
   if(file==='firebase-firestore.js')body=`const data=${JSON.stringify(dataset)};for(const rows of Object.values(data))for(const row of rows)for(const [k,v] of Object.entries(row))if(v?.__timestamp)row[k]={toDate:()=>new Date(v.__timestamp)};export const getFirestore=()=>({});export const collection=(db,name)=>({name});export const getDocs=async ref=>({docs:(data[ref.name]||[]).map(row=>({id:row.id,data:()=>row}))});`;
   await route.fulfill({contentType:'application/javascript',body});
  });
  await page.goto('http://127.0.0.1:8790/admin/#experience');
  await page.locator('#experience-status').filter({hasText:`已讀取 ${verified.length} 筆`}).waitFor();
  const found=new Set();
  for(const eventId of events){
   await page.selectOption('#experience-event',canonicalEventId(eventId));
   const expected=entries.filter(e=>canonicalEventId(e.data.eventId)===canonicalEventId(eventId));
   const rendered=await page.locator('#experience-table tbody tr').allTextContents();
   if(rendered.length!==expected.length)throw new Error('Historical UI row count mismatch');
   for(const entry of expected){
    if(!rendered.some(text=>text.includes(entry.data.name)&&text.includes(entry.data.contact)&&text.includes(entry.data.status)&&(!entry.data.DM_Note||text.includes(entry.data.DM_Note))))throw new Error('Historical UI field mismatch');
    found.add(entry.id);
   }
  }
  await page.selectOption('#experience-event','all');
  let count=await page.locator('#experience-table tbody tr').count();
  while(await page.locator('[data-grid-step="1"]').isEnabled()){
   await page.locator('[data-grid-step="1"]').click();
   count+=await page.locator('#experience-table tbody tr').count();
  }
  if(found.size!==entries.length||count!==verified.length||errors.length)throw new Error('Historical UI completeness check failed');
  console.log(`Local backend UI verified against production read-back: ${found.size} historical records, ${events.length} event filters, ${count} rows across all pages; no browser writes.`);
 } finally {await browser.close();}
}
