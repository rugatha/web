import { createHmac } from 'node:crypto';

export const CONSENT_VERSION = '2026-10-31-v1';
export const SUBSCRIPTIONS = 'experienceNewsletterSubscriptions';
export const LIMITS = 'experienceNewsletterLimits';
export const UNSUBSCRIBE_REASONS = [
  '收到快報的頻率太高',
  '快報內容不符合我的需求',
  '已透過其他管道取得最新資訊',
  '不記得曾訂閱這份快報',
  '想減少收到的電子郵件',
  '其他',
];
const fail = code => { throw Object.assign(new Error(code), { code }); };

export function validateRequest(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || Object.keys(data).some(key => !['action', 'email', 'consent', 'consentVersion', 'reasons', 'note'].includes(key))
    || !['subscribe', 'unsubscribe'].includes(data.action)
    || typeof data.email !== 'string') fail('invalid-argument');
  const email = data.email.trim().toLowerCase();
  // Deliberately accept conventional email addresses only; never use email in a URL or document ID.
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)
    || email.split('@')[0].length > 64 || email.startsWith('.') || email.includes('..')
    || email.includes('.@')) fail('invalid-argument');
  if (data.action === 'subscribe') {
    if (data.consent !== true || data.consentVersion !== CONSENT_VERSION
      || 'reasons' in data || 'note' in data) fail('invalid-argument');
    return { email, action: data.action };
  }
  const reasons = data.reasons === undefined ? [] : data.reasons;
  const note = data.note === undefined ? '' : data.note;
  if (!Array.isArray(reasons) || reasons.length > UNSUBSCRIBE_REASONS.length
    || new Set(reasons).size !== reasons.length
    || !reasons.every(reason => UNSUBSCRIBE_REASONS.includes(reason))
    || typeof note !== 'string' || note.length > 1000) fail('invalid-argument');
  return { email, action: data.action, reasons, note: note.trim() };
}

export function privateId(secret, purpose, value) {
  if (typeof secret !== 'string' || secret.length < 32) fail('failed-precondition');
  return createHmac('sha256', secret).update(`${purpose}:${value}`).digest('hex');
}

// The same transaction serializes rate checks and state changes, including concurrent requests.
export async function updateSubscription(db, data, { secret, ip, timestamp, now = Date.now() }) {
  const { email, action, reasons, note } = validateRequest(data);
  const ref = db.collection(SUBSCRIPTIONS).doc(privateId(secret, 'email', email));
  const limitRef = db.collection(LIMITS).doc(privateId(secret, 'ip', ip || 'unknown'));
  await db.runTransaction(async transaction => {
    const [existing, limit] = await Promise.all([transaction.get(ref), transaction.get(limitRef)]);
    const previous = limit.data();
    const sameWindow = previous && now - previous.windowStart < 10 * 60 * 1000;
    if (sameWindow && previous.requests >= 10) fail('resource-exhausted');
    transaction.set(limitRef, {
      windowStart: sameWindow ? previous.windowStart : now,
      requests: sameWindow ? previous.requests + 1 : 1,
    });
    const before = existing.data();
    if (action === 'unsubscribe') {
      if (before?.status === 'active') transaction.update(ref, {
        status: 'unsubscribed', unsubscribedAt: timestamp(), updatedAt: timestamp(),
        unsubscribeFeedback: { reasons, note, submittedAt: timestamp() },
      });
    } else if (before?.status !== 'active') {
      transaction.set(ref, {
        email, status: 'active', source: 'website', consentVersion: CONSENT_VERSION,
        createdAt: before?.createdAt || timestamp(), updatedAt: timestamp(),
        subscribedAt: timestamp(), unsubscribedAt: null,
        ...(before?.unsubscribeFeedback ? { unsubscribeFeedback: before.unsubscribeFeedback } : {}),
      });
    }
  });
  // Never disclose whether an address existed or its previous status.
  return { ok: true };
}
