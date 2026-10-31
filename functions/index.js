import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { updateSubscription } from './newsletter-store.js';

initializeApp();
const secret = defineSecret('NEWSLETTER_HMAC_KEY');
const emulated = process.env.FUNCTIONS_EMULATOR === 'true';
const demoEmulator = emulated && process.env.GCLOUD_PROJECT?.startsWith('demo-');
export const experienceNewsletter = onCall({
  region: 'asia-east1', secrets: demoEmulator ? [] : [secret], maxInstances: 3, timeoutSeconds: 15,
  memory: '256MiB', invoker: 'public',
  cors: emulated ? true : ['https://rugatha.com', 'https://www.rugatha.com'],
}, async request => {
  try {
    return await updateSubscription(getFirestore(), request.data, {
      secret: demoEmulator ? 'local-newsletter-emulator-only-key-not-for-production' : secret.value(),
      ip: request.rawRequest.ip,
      timestamp: () => FieldValue.serverTimestamp(),
    });
  } catch (error) {
    const code = ['invalid-argument', 'resource-exhausted', 'failed-precondition'].includes(error.code)
      ? error.code : 'internal';
    // Do not include submitted addresses or database errors in logs or responses.
    throw new HttpsError(code, code);
  }
});
