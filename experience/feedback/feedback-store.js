// Shared write path for the browser and Firestore Emulator verification.
export async function commitFeedback(db, id, answers, sdk) {
  const { doc, setDoc, serverTimestamp } = sdk;
  await setDoc(doc(db, 'experienceFeedback', id), {
    ...answers, schemaVersion: 1, source: 'website', createdAt: serverTimestamp(),
  });
}
