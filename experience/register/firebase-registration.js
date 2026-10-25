import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { collection, doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { commitRegistration } from './registration-store.js';

function database() {
  if (!window.RUGATHA_FIREBASE_CONFIG) throw new Error('Firebase is unavailable');
  const app = getApps().find((item) => item.name === '[DEFAULT]') || initializeApp(window.RUGATHA_FIREBASE_CONFIG);
  return getFirestore(app);
}
export function createRegistrationId() {
  return doc(collection(database(), 'experienceRegistrations')).id;
}
export function watchEvent(eventId, onChange, onError) {
  return onSnapshot(doc(database(), 'experienceEvents', eventId), { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.fromCache) return;
    const event = snapshot.data();
    if (!snapshot.exists() || !Number.isInteger(event.registeredPlayers) || event.registeredPlayers < 0
      || !Number.isInteger(event.maxPlayers) || event.maxPlayers < 1 || !event.deadline?.toMillis) {
      onError(new Error('Event is not configured')); return;
    }
    onChange({
      registeredPlayers: event.registeredPlayers, maxPlayers: event.maxPlayers,
      remainingSeats: Math.max(0, event.maxPlayers - event.registeredPlayers),
      registrationOpen: event.registrationOpen === true, deadline: event.deadline.toMillis(),
    });
  }, onError);
}
export async function saveRegistration(id, answers) {
  if (window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled === false) throw new Error('Registration writes are unavailable');
  await commitRegistration(database(), id, answers, { doc, runTransaction, serverTimestamp });
}
