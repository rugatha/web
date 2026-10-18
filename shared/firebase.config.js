window.RUGATHA_FEATURE_FLAGS = Object.assign({}, window.RUGATHA_FEATURE_FLAGS, {
  firebaseEnabled: true,
  qaFateEnabled: true,
  dataBackend: "firestore",
  spellbookSyncMemberUids: [], // Nonempty list limits rollout to these Authentication UIDs.
  characterSpellbookMemberUids: ["U7mw2fMY4oh6zqkhDQOcWXEdRyI2", "sS1pP9cfBCOm3eG8tqksA2E4oWr2"], // Nonempty list limits character-book acceptance to test UIDs.
  characterSpellbooksEnabled: true, // Restricted to acceptance UIDs until public rollout.
  spellbookSyncEnabled: true, // Rules, production acceptance and rollback drill verified.
  dataWritesEnabled: true
});

window.RUGATHA_DATA_BACKEND = window.RUGATHA_FEATURE_FLAGS.dataBackend;

if (window.RUGATHA_FEATURE_FLAGS.firebaseEnabled) {
  window.RUGATHA_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBvVXMxGHHJH2KCGhi5AjJeu-7_48irc1U",
    authDomain: "rugatha-87e15.firebaseapp.com",
    projectId: "rugatha-87e15",
    storageBucket: "rugatha-87e15.firebasestorage.app",
    messagingSenderId: "1022766499204",
    appId: "1:1022766499204:web:a4a4c318e16ce37809c9d1"
  };
} else {
  window.RUGATHA_FIREBASE_CONFIG = null;
  window.RUGATHA_FIREBASE_DISABLED = true;
}
