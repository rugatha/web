import { applyOperation } from './spellbook-state.js?v=20261019-character-books-1';

// Inject the SDK so the production write path also runs against the Emulator.
export async function writeSpellbookOperation({ db, reference, operation, isActive, parentReference }, sdk) {
  await sdk.runTransaction(db, async transaction => {
    if (!isActive()) throw new Error('同步已暫停或帳號已變更。');
    if (parentReference) {
      const parent = await transaction.get(parentReference);
      if (!parent.exists() || parent.data().schemaVersion !== 2) throw new Error('角色不存在或尚未升級，請重新載入角色卡。');
    }
    const snapshot = await transaction.get(reference);
    if (!isActive()) throw new Error('同步已暫停或帳號已變更。');
    const ids = applyOperation(snapshot.exists() ? snapshot.data().spellIds : [], operation);
    if (!snapshot.exists()) {
      transaction.set(reference, { schemaVersion: 1, spellIds: ids,
        createdAt: sdk.serverTimestamp(), updatedAt: sdk.serverTimestamp() });
    } else {
      transaction.update(reference, { spellIds: operation.type === 'clear' ? []
        : operation.type === 'remove' ? sdk.arrayRemove(...operation.ids) : sdk.arrayUnion(...operation.ids),
      updatedAt: sdk.serverTimestamp() });
    }
  });
}
