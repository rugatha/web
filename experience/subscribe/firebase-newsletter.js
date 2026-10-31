import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js';

let submit;
export async function saveSubscription(data) {
  if (!window.RUGATHA_FIREBASE_CONFIG || window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled === false) {
    throw new Error('Newsletter is unavailable');
  }
  if (!submit) {
    const app = getApps().find(item => item.name === '[DEFAULT]') || initializeApp(window.RUGATHA_FIREBASE_CONFIG);
    const functions = getFunctions(app, 'asia-east1');
    // Local acceptance only. Production cannot enable an emulator through a URL parameter.
    if (['localhost', '127.0.0.1'].includes(location.hostname) && window.RUGATHA_NEWSLETTER_EMULATOR) {
      connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    }
    submit = httpsCallable(functions, 'experienceNewsletter', { timeout: 20000 });
  }
  const response = await submit(data);
  if (response.data?.ok !== true) throw new Error('Newsletter update was not confirmed');
}
