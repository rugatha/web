import { doc, getFirestore, onSnapshot, runTransaction, serverTimestamp,
  arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { ensureMemberDocument, areDataWritesEnabled } from './firebase-data.js';
import { resolveMemberKey } from './member-path.js';
import { createSpellbookSession, spellbookAccessEnabled } from './spellbook-state.js';
import { writeSpellbookOperation } from './spellbook-transport.js';

export const spellbookSyncEnabled = user => spellbookAccessEnabled(window.RUGATHA_FEATURE_FLAGS, user?.uid);
export const spellbookWritesEnabled = user => spellbookSyncEnabled(user)
  && window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled !== false;

export function subscribeSpellbook({ app, auth, user, onChange }) {
  const db = getFirestore(app);
  let reference;
  const current = () => auth.currentUser?.uid === user.uid && spellbookWritesEnabled(user);
  return createSpellbookSession({
    enabled: () => spellbookWritesEnabled(user),
    onChange,
    connect: async (next, fail) => {
      // Auth also initializes new memberships asynchronously. Wait for its mapping
      // transaction before choosing a path, or a UID fallback can become stale.
      if (areDataWritesEnabled()) await ensureMemberDocument(db, user);
      const key = await resolveMemberKey(db, user.uid);
      if (auth.currentUser?.uid !== user.uid) throw new Error('登入帳號已變更。');
      reference = doc(db, 'members', key, 'spellbooks', 'default');
      return onSnapshot(reference, { includeMetadataChanges: true }, snapshot => {
        // A missing cache entry is not evidence that the server document is absent.
        if (!snapshot.exists() && snapshot.metadata.fromCache) return;
        next({ ids: snapshot.exists() ? snapshot.data().spellIds : [],
          confirmed: !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites });
      }, fail);
    },
    write: (operation, isActive) => writeSpellbookOperation({ db, reference, operation,
      isActive: () => current() && isActive()
    }, { runTransaction, serverTimestamp, arrayUnion, arrayRemove })
  });
}
