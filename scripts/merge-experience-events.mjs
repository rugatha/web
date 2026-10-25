// Merge the compact October history ID into the configured current-event ID.
// Preserves every registration and the old event as a closed alias.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),auth=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth'),{Client}=require('firebase-tools/lib/apiv2');
const options={project:'rugatha-87e15'},account=auth.getProjectDefaultAccount(process.cwd());
if(!account)throw new Error('Sign in with firebase login first');
auth.setActiveAccount(options,account);await requireAuth(options);
const client=new Client({urlPrefix:'https://firestore.googleapis.com'});
const database='projects/rugatha-87e15/databases/(default)',prefix=`${database}/documents`;
const from='202610-lorin',to='2026-10-lorin';
const query=async(collection,transaction)=>(await client.post(`/v1/${prefix}:runQuery`,{...(transaction?{transaction}:{}),structuredQuery:{from:[{collectionId:collection}]}},{skipLog:{reqBody:true,resBody:true}})).body.filter(r=>r.document).map(r=>r.document);
const apply=process.argv.includes('--apply');
let transaction;
try{
 if(apply)transaction=(await client.post(`/v1/${prefix}:beginTransaction`,{},{skipLog:{resBody:true}})).body.transaction;
 const events=await query('experienceEvents',transaction),rows=await query('experienceRegistrations',transaction);
 const old=events.find(d=>d.name.endsWith('/'+from)),target=events.find(d=>d.name.endsWith('/'+to));
 if(!old||!target)throw new Error('Both events must exist');
 const moved=rows.filter(r=>r.fields.eventId?.stringValue===from);
 const combined=rows.filter(r=>[from,to].includes(r.fields.eventId?.stringValue));
 const people=combined.filter(r=>r.fields.status?.stringValue!=='cancelled').reduce((s,r)=>{
  const count=Number(r.fields.partySize?.integerValue);if(!Number.isSafeInteger(count)||count<1)throw new Error('Invalid party size');return s+count;
 },0);
 console.log(JSON.stringify({from,to,registrationsToMove:moved.length,combinedRegistrations:combined.length,registeredPlayers:people,maxPlayers:Number(target.fields.maxPlayers?.integerValue),sourceAlreadyAliased:old.fields.aliasOf?.stringValue===to}));
 if(!apply){console.log('Read-only inspection; use --apply to merge.');process.exit(0);}
 if(people>Number(target.fields.maxPlayers?.integerValue))throw new Error('Combined count exceeds target capacity');
 const patch=(name,fields)=>({update:{name,fields},updateMask:{fieldPaths:Object.keys(fields)},updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]});
 const writes=moved.map(r=>patch(r.name,{eventId:{stringValue:to}}));
 writes.push(patch(target.name,{registeredPlayers:{integerValue:String(people)},scriptName:{stringValue:'洛林精神'}}));
 writes.push(patch(old.name,{aliasOf:{stringValue:to},registrationOpen:{booleanValue:false},registeredPlayers:{integerValue:'0'}}));
 await client.post(`/v1/${prefix}:commit`,{transaction,writes},{skipLog:{reqBody:true,resBody:true}});transaction=null;
 const after=await query('experienceRegistrations');
 if(after.length!==rows.length||after.some(r=>r.fields.eventId?.stringValue===from)||after.filter(r=>r.fields.eventId?.stringValue===to).length!==combined.length)throw new Error('Merge verification failed');
 console.log(`Verified: ${combined.length} registrations consolidated, ${after.length} total registrations preserved.`);
}finally{if(transaction)await client.post(`/v1/${prefix}:rollback`,{transaction},{skipLog:{reqBody:true,resBody:true}});}
