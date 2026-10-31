// Publish aggregates only; never write individual answers into the public site.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { feedbackRatingFields, feedbackRatingAverage } from '../admin/feedback-model.js';

export function summarizeFeedbackRatings(rows, updatedAt = new Date().toISOString()) {
  return {
    updatedAt,
    responseCount: rows.length,
    ratings: feedbackRatingFields.map(([key, label]) => ({
      key, label,
      count: rows.filter(row => Number.isInteger(row[key]) && row[key] >= 1 && row[key] <= 5).length,
      average: feedbackRatingAverage(rows, key),
    })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const require = createRequire(import.meta.url);
  const auth = require('firebase-tools/lib/auth');
  const { requireAuth } = require('firebase-tools/lib/requireAuth');
  const { Client } = require('firebase-tools/lib/apiv2');
  const options = { project: 'rugatha-87e15' };
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account) throw new Error('Sign in with firebase login first');
  auth.setActiveAccount(options, account);
  await requireAuth(options);
  const client = new Client({ urlPrefix: 'https://firestore.googleapis.com' });
  const result = await client.post('/v1/projects/rugatha-87e15/databases/(default)/documents:runQuery', {
    structuredQuery: {
      from: [{ collectionId: 'experienceFeedback' }],
      select: { fields: feedbackRatingFields.map(([fieldPath]) => ({ fieldPath })) },
    },
  }, { skipLog: { reqBody: true, resBody: true } });
  const rows = result.body.filter(item => item.document).map(({ document }) =>
    Object.fromEntries(feedbackRatingFields.map(([key]) => [key,
      document.fields?.[key]?.integerValue === undefined ? null : Number(document.fields[key].integerValue),
    ])));
  const summary = summarizeFeedbackRatings(rows);
  await writeFile(new URL('../experience/feedback-ratings.json', import.meta.url), JSON.stringify(summary, null, 2) + '\n');
  console.log(`Exported five rating aggregates from ${summary.responseCount} responses. No individual answers exported.`);
}
