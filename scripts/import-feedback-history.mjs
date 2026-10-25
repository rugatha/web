// Import private SurveyCake history; print counts only, never respondent data.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const filename = process.argv.find(arg=>arg.endsWith('.csv')) || 'experience/feedback_his.csv';
const rows = JSON.parse(execFileSync('python3',['-c',`import csv,json,sys
with open(sys.argv[1],encoding='utf-8-sig',newline='') as f:
 print(json.dumps(list(csv.DictReader(f)),ensure_ascii=False))`,filename],{encoding:'utf8'}));
const columns = {
  '您的暱稱':'nickname', '您的性別':'gender', '您的年齡層':'ageRange', '參與日期':'sessionDate', '跑團劇本':'scenario',
  '是否參與過我們的其他團務？':'previousParticipation', '平時的興趣類型':'interests',
  '關於劇本設計，您給的評分為何？':'storyRating', '關於角色設計，您給的評分為何？':'characterRating',
  '關於DM帶團風格，您給的評分為何？':'dmRating', '關於角色卡與幫助卡設計，您給的評分為何？':'cardRating',
  '關於公仔、地圖等道具，您給的評分為何？':'propRating', '關於費用，您覺得是否合理？':'feeOpinion',
  '請不吝給我們任何文字回饋！':'privateFeedback',
  '歡迎填寫公開回饋內容，我們將把您填寫的文字分享於社群軟體上，且不會公開您的身份':'publicFeedback',
};
const encode = value => typeof value === 'number' ? {integerValue:String(value)}
  : Array.isArray(value) ? {arrayValue:{values:value.map(encode)}} : {stringValue:value};
const normalize = value => value?.timestampValue ? Date.parse(value.timestampValue)
  : value?.arrayValue ? (value.arrayValue.values || []).map(normalize)
  : value?.stringValue ?? value?.integerValue;
const entries = rows.map((row,index) => {
  if (!Object.keys(columns).every(key=>typeof row[key] === 'string') || typeof row['填答時間'] !== 'string') throw new Error(`Missing columns at row ${index+2}`);
  const data = Object.fromEntries(Object.entries(columns).map(([column,name])=>[name,row[column]]));
  data.interests = data.interests ? data.interests.split(/\r?\n/).filter(Boolean) : [];
  for (const name of ['storyRating','characterRating','dmRating','cardRating','propRating']) {
    data[name] = Number(data[name]);
    if (!Number.isInteger(data[name]) || data[name] < 1 || data[name] > 5) throw new Error(`Invalid rating at row ${index+2}`);
  }
  if (!data.nickname.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(data.sessionDate)
    || !['有','無'].includes(data.previousParticipation) || !['太便宜','可以接受','太貴'].includes(data.feeOpinion)) throw new Error(`Invalid answer at row ${index+2}`);
  const time = row['填答時間'];
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(time)) throw new Error(`Invalid timestamp at row ${index+2}`);
  const timestamp = new Date(time.replace(' ','T')+'+08:00').toISOString();
  // Old surveys did not ask all demographic questions. Preserve absence as empty.
  Object.assign(data,{genderOther:'', schemaVersion:1, source:'surveycake-history', historySource:'feedback_his.csv', historyOriginal:JSON.stringify(row)});
  const id = 'history-'+createHash('sha256').update(row.Hash || data.historyOriginal).digest('hex').slice(0,32);
  const fields = Object.fromEntries(Object.entries(data).map(([key,value])=>[key,encode(value)]));
  fields.createdAt = {timestampValue:timestamp};
  return {id,fields};
});
if (new Set(entries.map(entry=>entry.id)).size !== entries.length) throw new Error('Duplicate history IDs; import stopped');
console.log(`Validated ${entries.length} historical feedback records. Asia/Taipei timestamps, integer ratings, separate private/public feedback and original CSV fields retained.`);
if (!process.argv.includes('--apply') && !process.argv.includes('--verify')) {
  console.log('Dry run. Add --apply to import; --verify to read back without writes.');
  process.exit(0);
}
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const options = {project:'rugatha-87e15'};
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Sign in with firebase login first');
auth.setActiveAccount(options,account);
await requireAuth(options);
const client = new Client({urlPrefix:'https://firestore.googleapis.com'});
const prefix = 'projects/rugatha-87e15/databases/(default)/documents';
const list = async () => {
  const result = await client.post(`/v1/${prefix}:runQuery`,{structuredQuery:{from:[{collectionId:'experienceFeedback'}]}},{skipLog:{reqBody:true,resBody:true}});
  return result.body.filter(row=>row.document).map(row=>row.document);
};
function matches(document,entry) {
  return Object.entries(entry.fields).every(([key,value])=>JSON.stringify(normalize(document.fields[key])) === JSON.stringify(normalize(value)));
}
const before = await list();
const writes = [];
for (const entry of entries) {
  const name = `${prefix}/experienceFeedback/${entry.id}`;
  const existing = before.find(document=>document.name === name);
  if (existing) {
    if (!matches(existing,entry)) throw new Error('History ID conflicts with existing data; no records overwritten');
    continue;
  }
  if (before.some(document=>document.fields.nickname?.stringValue === entry.fields.nickname.stringValue
    && Date.parse(document.fields.createdAt?.timestampValue) === Date.parse(entry.fields.createdAt.timestampValue)
    && document.fields.scenario?.stringValue === entry.fields.scenario.stringValue)) throw new Error('Possible historical duplicate; import stopped');
  writes.push({update:{name,fields:entry.fields},currentDocument:{exists:false}});
}
if (process.argv.includes('--apply') && writes.length) {
  await client.post(`/v1/${prefix}:commit`,{writes},{skipLog:{reqBody:true,resBody:true}});
}
const after = await list();
for (const entry of entries) {
  const saved = after.find(document=>document.name === `${prefix}/experienceFeedback/${entry.id}`);
  if (!saved || !matches(saved,entry)) throw new Error('History read-back mismatch');
}
console.log(`Verified ${entries.length}/${entries.length} complete historical records. Total feedback: ${after.length}. New writes: ${process.argv.includes('--apply') ? writes.length : 0}.`);
