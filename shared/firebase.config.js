window.RUGATHA_FEATURE_FLAGS = Object.assign({}, window.RUGATHA_FEATURE_FLAGS, {
  firebaseEnabled: true,
  qaFateEnabled: true,
  dataBackend: "firestore",
  spellbookSyncMemberUids: ["LTCR4SQOQOQEI1c1rQa35cjAZUG2", "SAkRUHuuXJdjlHGzCt2bykbSbht1"], // Nonempty list limits rollout to these Authentication UIDs.
  spellbookSyncEnabled: true, // Staged rollout after Rules deployment; allowlist above limits access.
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
