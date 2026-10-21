// Read-only usage snapshot. Does not export account IDs, object names or credentials.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const project = 'rugatha-87e15', bucket = `${project}.firebasestorage.app`;
const options = { project };
const account = auth.getProjectDefaultAccount(process.cwd());
if (!account) throw new Error('Run firebase login first.');
auth.setActiveAccount(options, account);
await requireAuth(options);
const skipLog = { resBody: true };
const storage = new Client({ urlPrefix: 'https://storage.googleapis.com' });
const metadata = (await storage.get(`/storage/v1/b/${bucket}`, { queryParams: { fields: 'location,storageClass,softDeletePolicy' }, skipLog })).body;
const report = { checkedAt: new Date().toISOString(), bucket, ...metadata, liveObjects: 0, liveBytes: 0, metricsWindowDays: 30, metrics: {}, limitations: 'Live size excludes noncurrent and soft-deleted objects. Monitoring includes this migration and is delayed; request_count is not a Class B billing total. Not a billing invoice or guaranteed remaining free allowance.' };
let pageToken;
do {
  const result = (await storage.get(`/storage/v1/b/${bucket}/o`, { queryParams: { maxResults: 1000, fields: 'nextPageToken,items(size)', ...(pageToken ? { pageToken } : {}) }, skipLog })).body;
  for (const item of result.items || []) { report.liveObjects++; report.liveBytes += Number(item.size); }
  pageToken = result.nextPageToken;
} while (pageToken);
const monitoring = new Client({ urlPrefix: 'https://monitoring.googleapis.com' });
for (const metric of ['api/request_count', 'network/sent_bytes_count']) {
  try {
    const result = (await monitoring.get(`/v3/projects/${project}/timeSeries`, { queryParams: {
      filter: `metric.type="storage.googleapis.com/${metric}" AND resource.labels.bucket_name="${bucket}"`,
      'interval.endTime': report.checkedAt, 'interval.startTime': new Date(Date.parse(report.checkedAt) - 30 * 86400000).toISOString(),
      'aggregation.alignmentPeriod': '86400s', 'aggregation.perSeriesAligner': 'ALIGN_SUM', 'aggregation.crossSeriesReducer': 'REDUCE_SUM', pageSize: 1000
    }, skipLog })).body;
    report.metrics[metric] = { total: (result.timeSeries || []).flatMap(series => series.points || []).reduce((sum, point) => sum + Number(point.value.int64Value || point.value.doubleValue || 0), 0), truncated: !!result.nextPageToken };
  } catch (error) { report.metrics[metric] = { unavailable: true, status: error.status }; }
}
const billing = new Client({ urlPrefix: 'https://cloudbilling.googleapis.com' });
try {
  const info = (await billing.get(`/v1/projects/${project}/billingInfo`, { skipLog })).body;
  report.billingEnabled = info.billingEnabled;
  const projects = (await billing.get(`/v1/${info.billingAccountName}/projects`, { skipLog })).body;
  report.linkedProjects = { count: projects.projectBillingInfo?.length || 0, truncated: !!projects.nextPageToken };
  const budgets = new Client({ urlPrefix: 'https://billingbudgets.googleapis.com' });
  const result = (await budgets.get(`/v1/${info.billingAccountName}/budgets`, { headers: { 'X-Goog-User-Project': project }, queryParams: { pageSize: 100 }, skipLog })).body;
  report.budgets = (result.budgets || []).filter(budget => budget.budgetFilter?.projects?.includes('projects/1022766499204') && budget.budgetFilter?.services?.includes('services/95FF-2EF5-5EA1')).map(budget => ({ displayName: budget.displayName, amount: budget.amount, thresholdRules: budget.thresholdRules, defaultRecipientsEnabled: budget.notificationsRule?.disableDefaultIamRecipients !== true }));
  report.budgetsTruncated = !!result.nextPageToken;
} catch (error) { report.billingDetailsUnavailable = { status: error.status }; }
const output = JSON.stringify(report, null, 2) + '\n';
if (process.argv[2]) await writeFile(process.argv[2], output);
console.log(output);
