// Shared transaction logic, exercised against the Firestore Emulator in tests.
export async function commitRegistration(db, id, answers, sdk) {
  const { doc, runTransaction, serverTimestamp } = sdk;
  const eventRef = doc(db, 'experienceEvents', answers.eventId);
  const registrationRef = doc(db, 'experienceRegistrations', id);
  const fail = (code) => { throw Object.assign(new Error(code), { code }); };
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    if (!snapshot.exists()) fail('registration-unavailable');
    const event = snapshot.data();
    if (!event.registrationOpen || !event.deadline?.toMillis || event.deadline.toMillis() < Date.now()) fail('registration-closed');
    if (!Number.isInteger(event.registeredPlayers) || event.registeredPlayers < 0
      || !Number.isInteger(event.maxPlayers)) fail('registration-unavailable');
    if (!Number.isInteger(answers.partySize) || answers.partySize < 1
      || answers.partySize > event.maxPlayers - event.registeredPlayers) fail('registration-full');
    transaction.set(registrationRef, { ...answers, createdAt: serverTimestamp() });
    transaction.update(eventRef, {
      registeredPlayers: event.registeredPlayers + answers.partySize,
      lastRegistrationId: id,
      updatedAt: serverTimestamp(),
    });
  });
}

// Admin cancellation preserves the answers and releases all party seats once.
export async function cancelRegistration(db, id, sdk) {
  const { doc, getDoc, runTransaction, serverTimestamp } = sdk;
  const ref = doc(db, 'experienceRegistrations', id);
  try { return await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('找不到此筆報名');
    const answer = snapshot.data();
    if (answer.status === 'cancelled') return false;
    const eventRef = doc(db, 'experienceEvents', answer.eventId);
    const event = await transaction.get(eventRef);
    const count = event.data()?.registeredPlayers;
    if (!event.exists() || !Number.isInteger(count) || !Number.isInteger(answer.partySize)
      || answer.partySize < 1 || count < answer.partySize) throw new Error('名額統計異常，請先同步場次資料');
    transaction.update(ref, { status: 'cancelled', cancelledAt: serverTimestamp() });
    transaction.update(eventRef, { registeredPlayers: count - answer.partySize, lastCancellationId: id, updatedAt: serverTimestamp() });
    return true;
  }); } catch (error) {
    // Another admin tab may have cancelled this answer while we committed.
    if (['permission-denied', 'aborted'].includes(error.code)) {
      try { if ((await getDoc(ref)).data()?.status === 'cancelled') return false; } catch {}
    }
    throw error;
  }
}
