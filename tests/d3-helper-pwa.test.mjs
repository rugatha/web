import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('experience/cons/d3/2026/helper/sw.js','utf8');
function worker(){
 const listeners={},deleted=[];
 const self={location:{origin:'https://rugatha.com'},addEventListener:(name,fn)=>listeners[name]=fn,clients:{claim:async()=>{}},skipWaiting:async()=>{}};
 const caches={keys:async()=>['rugatha-pwa-v31-static','d3-helper-shell-v1','d3-helper-shell-v2'],delete:async name=>deleted.push(name)};
 vm.runInNewContext(source,{self,caches,URL,fetch:async()=>({ok:false})});return {listeners,deleted};
}
test('helper worker never intercepts personal data, auth, other pages or writes',()=>{
 const {listeners}=worker();
 for(const [url,method] of [
  ['https://firestore.googleapis.com/v1/projects/test/documents/d3Registrations','GET'],
  ['https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword','POST'],
  ['https://rugatha.com/admin/index.html','GET'],['https://rugatha.com/','GET'],
  ['https://rugatha.com/2026-d3-helper.html','POST'],
 ]){let intercepted=false;listeners.fetch({request:{url,method},respondWith:()=>intercepted=true});assert.equal(intercepted,false,url);}
});
test('helper cache lifecycle preserves the main site PWA caches',async()=>{
 const {listeners,deleted}=worker();let finished;
 listeners.activate({waitUntil:promise=>finished=promise});await finished;
 assert.deepEqual(deleted,['d3-helper-shell-v1']);
});
test('helper manifest has an independent identity and a scope limited to its entry page',()=>{
 const manifest=JSON.parse(readFileSync('experience/cons/d3/2026/helper/manifest.webmanifest','utf8'));
 assert.equal(manifest.id,'/2026-d3-helper.html');assert.equal(manifest.scope,'/experience/cons/d3/2026/helper/');assert.equal(manifest.start_url,manifest.scope);
 assert.equal(manifest.icons[0].src,'/assets/2026-d3-helper.png');
 assert.equal(manifest.display,'standalone');assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));
});

test('all precached local files exist after the helper move',async()=>{
 const listeners={};let urls;
 const self={addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{}};
 const caches={open:async()=>({addAll:async items=>urls=items})};
 vm.runInNewContext(source,{self,caches,URL});let finished;listeners.install({waitUntil:p=>finished=p});await finished;
 const {existsSync,statSync}=await import('node:fs');
 for(const url of urls){const file=url.slice(1);assert.ok(existsSync(file),url);if(url.endsWith('/'))assert.ok(statSync(file).isDirectory());}
 for(const old of ['2026-d3-helper.html','2026-d3-helper.webmanifest','2026-d3-helper-sw.js','experience/cons/d3/2026/helper.js','experience/cons/d3/2026/helper.css','experience/cons/d3/2026/helper-pwa.js'])assert.equal(existsSync(old),false,old);
});
