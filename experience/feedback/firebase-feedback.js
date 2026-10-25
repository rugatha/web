import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { collection, doc, getFirestore, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { commitFeedback } from './feedback-store.js';

function database() {
  if (!window.RUGATHA_FIREBASE_CONFIG || window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled === false) {
    throw new Error('Feedback writes are unavailable');
  }
  const app = getApps().find(item => item.name === '[DEFAULT]') || initializeApp(window.RUGATHA_FIREBASE_CONFIG);
  return getFirestore(app);
}
export function createFeedbackId() {
  return doc(collection(database(), 'experienceFeedback')).id;
}
export async function saveFeedback(id, answers) {
  await commitFeedback(database(), id, answers, { doc, setDoc, serverTimestamp });
}
