import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { collection, doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { commitD3Registration } from './registration-store.js';
const app = getApps().find(app => app.name === '[DEFAULT]') || initializeApp(window.RUGATHA_FIREBASE_CONFIG);
const db = getFirestore(app);
export const newId = () => doc(collection(db, 'd3Registrations')).id;
export const watchSlot = (id, change, error) => onSnapshot(doc(db, 'd3Slots', id), { includeMetadataChanges: true }, snapshot => {
  if (snapshot.metadata.fromCache) return;
  const slot = snapshot.data();
  if (!slot || !Number.isInteger(slot.registeredPlayers) || slot.registeredPlayers < 0 || slot.registeredPlayers > 2 || !slot.deadline?.toMillis) { error(new Error('時段尚未設定')); return; }
  change({ ...slot, deadline: slot.deadline.toMillis() });
}, error);
export async function save(id, answers) {
  if (window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled === false) throw new Error('報名暫停中');
  await commitD3Registration(db, id, answers, { doc, runTransaction, serverTimestamp });
}
