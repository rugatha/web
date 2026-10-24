// Delete only unreferenced, content-addressed location PNGs with generation guards.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {storageClient} from './image-original-archive.mjs';
import {imageBucket,publicImageUrl} from './image-assets.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=path.join(root,'docs/image-migration/location-cleanup-2026-10-24');
const pattern=/^public-images\/locations\/[a-z0-9_-]+\/[a-f0-9]{64}\/reading\.png$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

export function planCleanup(objects,protectedNames){
 const names=new Set(objects.map(x=>x.name));
 for(const name of protectedNames)if(!names.has(name))throw Error(`Referenced image missing in Storage: ${name}`);
 const kept=[],candidates=[],blocked=[];
 for(const item of objects){
  if(protectedNames.has(item.name)){kept.push(item);continue;}
  const hash=item.name.split('/').at(-2);
  if(!pattern.test(item.name)||item.metadata?.sha256!==hash||!/^\d+$/.test(item.generation)||item.temporaryHold||item.eventBasedHold||item.retentionExpirationTime||item.retention){blocked.push(item);continue;}
  candidates.push(item);
 }
 return {kept,candidates,blocked};
}

async function main(){
 const mode=process.argv[2]||'--plan';if(!['--plan','--apply'].includes(mode))throw Error('Use --plan or --apply');
 await mkdir(output,{recursive:true});
 const source=path.join(root,'map/location/assets/location.json');
 const data=JSON.parse(await readFile(source,'utf8'));
 const sources=new Map();
 const add=(name,source)=>{if(pattern.test(name)){if(!sources.has(name))sources.set(name,new Set());sources.get(name).add(source);}};
 function visit(node){
  const url=new URL(node.image);
  if(url.hostname!=='firebasestorage.googleapis.com'||!url.pathname.startsWith(`/v0/b/${imageBucket}/o/`))throw Error('Every location must use this Firebase bucket');
  const name=decodeURIComponent(url.pathname.split('/o/')[1]);if(!pattern.test(name))throw Error(`Invalid location object ${name}`);add(name,'map/location/assets/location.json');
  for(const key of ['realms','kingdoms','cities','pois'])for(const child of node[key]||[])visit(child);
 }visit(data);
 // Historical review records are not runtime references and must not pin obsolete art.
 const files=execFileSync('rg',['--files','--hidden','-g','!.git/**','-g','!node_modules/**','-g','!docs/**'],{cwd:root,encoding:'utf8'}).trim().split('\n').sort();
 const runtimeHashes=[];
 for(const file of files){
  if(!/\.(?:html|json|[cm]?js|css|svg|xml|webmanifest)$/.test(file))continue;
  const bytes=await readFile(path.join(root,file));const text=bytes.toString();
  const matches=[...text.matchAll(/public-images(?:%2[fF]|\/)locations(?:%2[fF]|\/)[a-zA-Z0-9_%/.-]+/g)];
  if(matches.length)runtimeHashes.push({file,sha256:sha(bytes)});
  for(const match of matches){let name;try{name=decodeURIComponent(match[0])}catch{continue;}add(name,file);}
 }
 // The currently deployed atlas endpoints are absent; also protect image URLs in
 // the deployed map entry page before removing old objects from this project.
 await storageClient();const require=createRequire(import.meta.url);
 const token=await require('firebase-tools/lib/apiv2').getAccessToken();
 async function request(url,{method='GET',authenticated=true,head=false}={}){
  const result=await new Promise((resolve,reject)=>{
   const args=['--silent','--show-error','--connect-timeout','15','--max-time','60','--retry','2','--config','-','--write-out','\n%{http_code}'];
   if(head)args.push('--head');else args.push('--request',method);args.push(url);
   const child=spawn('curl',args,{stdio:['pipe','pipe','pipe']}),out=[],err=[];
   child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x));child.on('error',reject);
   child.on('close',code=>code?reject(Error(`curl ${code}: ${Buffer.concat(err)}`)):resolve(Buffer.concat(out).toString()));
   child.stdin.end(authenticated?`header = ${JSON.stringify('Authorization: Bearer '+token)}\n`:'');
  });const split=result.lastIndexOf('\n');return {status:Number(result.slice(split+1)),body:result.slice(0,split)};
 }
 const prefix=`https://storage.googleapis.com/storage/v1/b/${imageBucket}`;
 async function list(){
  const all=[];let pageToken;
  do{const u=new URL(prefix+'/o');u.searchParams.set('prefix','public-images/locations/');u.searchParams.set('maxResults','1000');u.searchParams.set('fields','nextPageToken,items(name,size,generation,metadata,temporaryHold,eventBasedHold,retentionExpirationTime,retention)');if(pageToken)u.searchParams.set('pageToken',pageToken);
   const r=await request(u.href);if(r.status!==200)throw Error(`List failed: ${r.status}`);const d=JSON.parse(r.body);all.push(...d.items||[]);pageToken=d.nextPageToken;
  }while(pageToken);return all;
 }
 const deployed=[];
 for(const route of ['/map/','/map/location/','/map/location/assets/location.json','/data/location.json']){
  const url='https://rugatha.com'+route,r=await request(url,{authenticated:false});deployed.push({url,status:r.status});
  if(r.status!==200&&r.status!==404)throw Error(`Cannot establish deployed references: ${url} ${r.status}`);
  if(r.status===200){for(const match of r.body.matchAll(/public-images(?:%2[fF]|\/)locations(?:%2[fF]|\/)[a-zA-Z0-9_%/.-]+/g))add(decodeURIComponent(match[0]),url);}
 }
 const objects=await list(),plan=planCleanup(objects,new Set(sources.keys()));
 const report={checked_at:new Date().toISOString(),bucket:imageBucket,location_data_sha256:sha(await readFile(source)),runtime_hashes:runtimeHashes,deployed_checks:deployed,protected_references:[...sources].map(([object,refs])=>({object,sources:[...refs]})),...plan,candidate_bytes:plan.candidates.reduce((sum,x)=>sum+Number(x.size),0)};
 const planFile=path.join(output,'firebase-cleanup-plan.json');
 if(mode==='--plan'){await writeFile(planFile,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({kept:plan.kept.length,candidates:plan.candidates.length,blocked:plan.blocked.length,bytes:report.candidate_bytes}));return;}
 const saved=JSON.parse(await readFile(planFile,'utf8'));
 const identities=items=>items.map(x=>`${x.name}#${x.generation}`).sort();
 if(saved.location_data_sha256!==report.location_data_sha256||JSON.stringify(saved.runtime_hashes)!==JSON.stringify(report.runtime_hashes)||JSON.stringify(identities(saved.candidates))!==JSON.stringify(identities(plan.candidates))||JSON.stringify(identities(saved.kept))!==JSON.stringify(identities(plan.kept)))throw Error('References or cloud state changed; rebuild plan before deletion');
 let cursor=0,verified=0;
 await Promise.all(Array.from({length:6},async()=>{while(cursor<plan.kept.length){const item=plan.kept[cursor++],r=await request(publicImageUrl(imageBucket,item.name),{authenticated:false,head:true});if(r.status!==200||!/content-type:\s*image\/png/i.test(r.body))throw Error(`Referenced image inaccessible: ${item.name} ${r.status}`);verified++;}}));
 // Fresh reference fingerprints are required immediately before any deletion.
 if(sha(await readFile(source))!==report.location_data_sha256)throw Error('Location data changed during verification');
 for(const item of runtimeHashes)if(sha(await readFile(path.join(root,item.file)))!==item.sha256)throw Error(`Runtime source changed: ${item.file}`);
 const ledger={started_at:new Date().toISOString(),plan_sha256:sha(await readFile(planFile)),kept_images_verified:verified,deleted:[],mode:'deleting-generation-matched-unused-images'};
 const ledgerFile=path.join(output,'firebase-deletions.json');
 try{
  await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');
  for(const item of plan.candidates){const u=new URL(prefix+'/o/'+encodeURIComponent(item.name));u.searchParams.set('generation',item.generation);u.searchParams.set('ifGenerationMatch',item.generation);const r=await request(u.href,{method:'DELETE'});if(r.status!==204)throw Error(`Delete failed (${r.status}): ${item.name}`);ledger.deleted.push({...item,deleted_at:new Date().toISOString()});await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');if(ledger.deleted.length%20===0)console.log(`Deleted ${ledger.deleted.length}/${plan.candidates.length}`);}
  const remaining=await list(),names=new Set(remaining.map(x=>x.name));
  for(const x of plan.kept)if(!names.has(x.name))throw Error('Referenced image missing after cleanup');
  for(const x of ledger.deleted)if(names.has(x.name))throw Error('Deleted image still live');
  ledger.completed_at=new Date().toISOString();ledger.mode='completed';ledger.remaining_live_objects=remaining.length;ledger.deleted_bytes=ledger.deleted.reduce((sum,x)=>sum+Number(x.size),0);await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify({deleted:ledger.deleted.length,remaining:remaining.length,bytes:ledger.deleted_bytes}));
 }catch(error){ledger.error=error.message;await writeFile(ledgerFile,JSON.stringify(ledger,null,2)+'\n');throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
