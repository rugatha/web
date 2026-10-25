export async function commitD3Registration(db, id, answers, sdk) {
  const { doc, runTransaction, serverTimestamp } = sdk;
  const ref = doc(db, 'd3Slots', answers.slotId);
  await runTransaction(db, async tx => {
    const snapshot = await tx.get(ref);
    const slot = snapshot.data();
    if (!slot || !slot.registrationOpen || slot.deadline.toMillis() < Date.now()) throw new Error('此時段尚未開放或已截止');
    if (![1, 2].includes(answers.partySize) || slot.registeredPlayers + answers.partySize > 2) throw new Error('此時段剩餘名額不足，請重新選擇');
    tx.set(doc(db, 'd3Registrations', id), { ...answers, createdAt: serverTimestamp() });
    tx.update(ref, { registeredPlayers: slot.registeredPlayers + answers.partySize, lastRegistrationId: id, updatedAt: serverTimestamp() });
  });
}

// Preserve cancelled answers; release a whole booking exactly once.
export async function cancelD3Registration(db, id, sdk) {
  const { doc, runTransaction, serverTimestamp } = sdk;
  try { return await runTransaction(db, async tx => {
    const ref = doc(db, 'd3Registrations', id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error('找不到此筆報名');
    const answer = snapshot.data();
    if (answer.status === 'cancelled') return false;
    const slotRef = doc(db, 'd3Slots', answer.slotId);
    const slot = (await tx.get(slotRef)).data();
    if (!slot || !Number.isInteger(slot.registeredPlayers) || ![1,2].includes(answer.partySize) || slot.registeredPlayers < answer.partySize) throw new Error('名額統計異常，請先確認資料');
    tx.update(ref, { status: 'cancelled', cancelledAt: serverTimestamp() });
    tx.update(slotRef, { registeredPlayers: slot.registeredPlayers - answer.partySize, lastCancellationId: id, updatedAt: serverTimestamp() });
    return true;
  }); } catch (error) {
    // Another admin may have cancelled while our transaction was committing.
    if (['permission-denied', 'aborted'].includes(error.code)) {
      try { if ((await sdk.getDoc(doc(db, 'd3Registrations', id))).data()?.status === 'cancelled') return false; } catch {}
    }
    throw error;
  }
}

export async function updateD3Shipping(db, id, shipping, sdk) {
  if (!/^[+0-9() \-]{8,30}$/.test(shipping.recipientPhone.trim())) throw new Error('請填寫完整收件人電話，例如 0912-345-678');
  if (!shipping.recipientName.trim() || !shipping.sevenElevenStore.trim()) throw new Error('請完整填寫收件人姓名與 7-11 店名');
  if (!/^[^ @]+@[^ @]+[.][^ @]+$/.test(shipping.recipientEmail.trim())) throw new Error('請填寫有效的收件人 email');
  await sdk.runTransaction(db, async tx => {
    const ref = sdk.doc(db, 'd3Registrations', id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists() || snapshot.data().miniature !== true) throw new Error('須先加購 3D 公仔印製，才能填寫寄送資訊');
    tx.update(ref, {
      recipientName: shipping.recipientName.trim(),
      recipientPhone: shipping.recipientPhone.trim(),
      recipientEmail: shipping.recipientEmail.trim(),
      sevenElevenStore: shipping.sevenElevenStore.trim(),
      shippingUpdatedAt: sdk.serverTimestamp(),
    });
  });
}

// Read the latest other add-on inside the transaction to preserve concurrent edits.
export async function updateD3Addon(db, id, field, enabled, sdk) {
  if (!['miniature', 'portrait'].includes(field) || typeof enabled !== 'boolean') throw new Error('加購選項不正確');
  return sdk.runTransaction(db, async tx => {
    const ref = sdk.doc(db, 'd3Registrations', id);
    const snapshot = await tx.get(ref);
    if (!snapshot.exists()) throw new Error('找不到此筆報名');
    const row = snapshot.data();
    const miniature = field === 'miniature' ? enabled : row.miniature;
    const portrait = field === 'portrait' ? enabled : row.portrait;
    const patch = { miniature, portrait, total: (300 + (miniature ? 500 : 0) + (portrait ? 200 : 0)) * row.partySize, addonsUpdatedAt: sdk.serverTimestamp() };
    tx.update(ref, patch);
    return { miniature, portrait, total: patch.total };
  });
}

export async function updateD3ImageEmail(db, id, email, sdk) {
  const imageRecipientEmail = email.trim();
  await sdk.updateDoc(sdk.doc(db, 'd3Registrations', id), {
    imageRecipientEmail, imageEmailUpdatedAt: sdk.serverTimestamp(),
  });
  return imageRecipientEmail;
}
