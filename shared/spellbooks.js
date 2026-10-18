import { doc, getDocFromServer, getFirestore, onSnapshot, runTransaction, serverTimestamp,
  arrayUnion, arrayRemove } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { ensureMemberDocument, areDataWritesEnabled } from './firebase-data.js';
import { resolveMemberKey } from './member-path.js';
import { createSpellbookSession, spellbookAccessEnabled } from './spellbook-state.js?v=20261019-character-books-1';
import { normalizeSpellbookScope, spellbookPath, legacySpellSource } from './character-spellbook.js?v=20261019-character-books-1';
import { writeSpellbookOperation } from './spellbook-transport.js?v=20261019-character-books-1';

export const spellbookSyncEnabled = user => spellbookAccessEnabled(window.RUGATHA_FEATURE_FLAGS, user?.uid);
export const characterSpellbookSyncEnabled = user => spellbookAccessEnabled({
  spellbookSyncEnabled: window.RUGATHA_FEATURE_FLAGS?.characterSpellbooksEnabled,
  spellbookSyncMemberUids: window.RUGATHA_FEATURE_FLAGS?.characterSpellbookMemberUids
}, user?.uid);
export const spellbookWritesEnabled = user => spellbookSyncEnabled(user)
  && window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled !== false;

export function subscribeSpellbook({ app, auth, user, scope, ownerUid = user.uid, onChange }) {
  scope = normalizeSpellbookScope(scope);
  if (ownerUid !== user.uid && scope.type !== 'character') throw new Error('Personal books are private');
  const db = getFirestore(app);
  let reference, parentReference, active = true;
  const current = () => active && auth.currentUser?.uid === user.uid && ownerUid === user.uid
    && spellbookWritesEnabled(user) && (scope.type === 'personal' || characterSpellbookSyncEnabled(user));
  const session = createSpellbookSession({
    enabled: current,
    onChange,
    connect: async (next, fail) => {
      // Auth also initializes new memberships asynchronously. Wait for its mapping
      // transaction before choosing a path, or a UID fallback can become stale.
      if (areDataWritesEnabled()) await ensureMemberDocument(db, user);
      const key = await resolveMemberKey(db, ownerUid);
      if (!active || auth.currentUser?.uid !== user.uid) throw new Error('登入帳號已變更。');
      reference = doc(db, ...spellbookPath(key, scope));
      if (scope.type === 'character') {
        parentReference = doc(db, 'members', key, 'characters', scope.characterId);
        if (ownerUid === user.uid && current()) {
          await runTransaction(db, async tx => {
            const parent = await tx.get(parentReference);
            if (!current()) throw new Error('帳號已變更。');
            if (!parent.exists()) throw new Error('角色不存在。');
            if (parent.data().schemaVersion === 1) tx.update(parentReference, { schemaVersion: 2, updatedAt: serverTimestamp() });
          });
        }
      }
      return onSnapshot(reference, { includeMetadataChanges: true }, snapshot => {
        // A missing cache entry is not evidence that the server document is absent.
        if (!snapshot.exists() && snapshot.metadata.fromCache) return;
        next({ exists: snapshot.exists(), ids: snapshot.exists() ? snapshot.data().spellIds : [],
          confirmed: !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites });
      }, fail);
    },
    write: (operation, isActive) => writeSpellbookOperation({ db, reference, parentReference, operation,
      isActive: () => current() && isActive()
    }, { runTransaction, serverTimestamp, arrayUnion, arrayRemove })
  });
  return { ...session, close() { active = false; session.close(); } };
}

// Explicit, preview-bound migration. Never merge over an existing (even empty) book.
export async function migrateCharacterSpellbook({ app, auth, user, characterId, preview, isActive = () => true }) {
  const db = getFirestore(app), key = await resolveMemberKey(db, user.uid);
  const parent = doc(db, 'members', key, 'characters', normalizeSpellbookScope({ type: 'character', characterId }).characterId);
  const book = doc(parent, 'spellbooks', 'default');
  await runTransaction(db, async tx => {
    const record = await tx.get(parent), existing = await tx.get(book);
    if (auth.currentUser?.uid !== user.uid || !isActive() || !spellbookWritesEnabled(user) || !characterSpellbookSyncEnabled(user)) throw new Error('操作已取消。');
    if (!record.exists() || record.data().schemaVersion !== 2) throw new Error('角色不存在或尚未升級。');
    if (existing.exists()) throw new Error('角色書已建立，請重新載入。');
    if (JSON.stringify(legacySpellSource(record.data().data)) !== preview.fingerprint) throw new Error('舊法術已變更，請重新載入及預覽。');
    if (preview.unknown.length) throw new Error('部分舊資料無法辨識，請保留並先修正來源。');
    tx.set(book, { schemaVersion: 1, spellIds: preview.ids, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
}

export async function readPersonalSpellbook({ app, auth, user }) {
  const db = getFirestore(app), key = await resolveMemberKey(db, user.uid);
  const book = await getDocFromServer(doc(db, 'members', key, 'spellbooks', 'default'));
  if (auth.currentUser?.uid !== user.uid) throw new Error('帳號已變更。');
  return book.exists() ? book.data().spellIds : [];
}
