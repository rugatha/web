import { applyOperation } from './spellbook-state.js';

// Inject the SDK so the production write path also runs against the Emulator.
export async function writeSpellbookOperation({ db, reference, operation, isActive }, sdk) {
  await sdk.runTransaction(db, async transaction => {
    if (!isActive()) throw new Error('同步已暫停或帳號已變更。');
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
