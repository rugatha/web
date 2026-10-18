window.RUGATHA_FEATURE_FLAGS = Object.assign({}, window.RUGATHA_FEATURE_FLAGS, {
  firebaseEnabled: true,
  qaFateEnabled: true,
  dataBackend: "firestore",
  spellbookSyncMemberUids: [], // Nonempty list limits rollout to these Authentication UIDs.
  characterSpellbookMemberUids: [], // Nonempty list limits character-book acceptance to test UIDs.
  characterSpellbooksEnabled: false, // Enable only after schema/rules rollout and production acceptance.
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
