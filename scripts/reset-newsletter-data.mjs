// Explicitly scoped administrative reset. Never exports addresses or touches other site data.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const args = process.argv.slice(2), projectIndex = args.indexOf('--project');
const project = args[projectIndex + 1];
if (projectIndex < 0 || project !== 'rugatha-87e15') throw new Error('Specify --project rugatha-87e15 explicitly');
const modes = ['--pause', '--resume', '--apply'].filter(flag => args.includes(flag));
if (modes.length > 1) throw new Error('Use only one operation per invocation');
if (args.some((arg,index) => index!==projectIndex+1 && !['--project','--pause','--resume','--apply'].includes(arg))) throw new Error('Unknown option');
const options = { project }, account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Sign in to Firebase first');
auth.setActiveAccount(options, account);
await requireAuth(options);
const client = new Client({ urlPrefix: 'https://firestore.googleapis.com' });
const base = `projects/${project}/databases/(default)/documents`;
const control = `${base}/experienceNewsletterSystem/control`;
const quiet = () => ({ skipLog: { reqBody: true, resBody: true } });
const collections = ['experienceNewsletterSubscriptions', 'experienceNewsletterEvents', 'experienceNewsletterLimits'];
if (args.includes('--pause') || args.includes('--resume')) {
  const accepting = args.includes('--resume');
  await client.post(`/v1/${base}:commit`, { writes: [{
    update: { name: control, fields: { acceptingSubscriptions: { booleanValue: accepting } } },
    updateMask: { fieldPaths: ['acceptingSubscriptions'] },
    updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
  }] }, quiet());
  console.log(`Newsletter acceptingSubscriptions=${accepting} in ${project}.`);
} else {
  async function names(collectionId, limit) {
    const result = await client.post(`/v1/${base}:runQuery`, { structuredQuery: {
      from: [{ collectionId }], select: { fields: [{ fieldPath: '__name__' }] },
      ...(limit ? { limit } : {}),
    } }, quiet());
    return result.body.filter(row => row.document).map(row => row.document.name);
  }
  const apply = args.includes('--apply');
  if (apply) {
    const state = await client.get(`/v1/${control}`, quiet());
    if (state.body.fields?.acceptingSubscriptions?.booleanValue !== false) throw new Error('Pause the history-enabled backend before resetting');
  }
  for (const collection of collections) {
    if (!apply) { console.log(`${collection}: ${(await names(collection)).length} documents (dry run)`); continue; }
    let deleted = 0;
    while (true) {
      const batch = await names(collection, 400);
      if (!batch.length) break;
      if (batch.some(name => !name.startsWith(`${base}/${collection}/`) || name.slice(`${base}/${collection}/`.length).includes('/'))) throw new Error('Unsafe reset target');
      await client.post(`/v1/${base}:commit`, { writes: batch.map(name => ({ delete: name })) }, quiet());
      deleted += batch.length;
    }
    console.log(`${collection}: deleted ${deleted}; remaining 0`);
  }
  if (!apply) console.log('No data changed. --apply requires the production backend to be paused.');
}
