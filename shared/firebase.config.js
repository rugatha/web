window.RUGATHA_FEATURE_FLAGS = Object.assign({}, window.RUGATHA_FEATURE_FLAGS, {
  firebaseEnabled: true,
  qaFateEnabled: true
});

if (window.RUGATHA_FEATURE_FLAGS.firebaseEnabled) {
  window.RUGATHA_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBvVXMxGHHJH2KCGhi5AjJeu-7_48irc1U",
    authDomain: "rugatha-87e15.firebaseapp.com",
    projectId: "rugatha-87e15",
    storageBucket: "rugatha-87e15.firebasestorage.app",
    messagingSenderId: "1022766499204",
    appId: "1:1022766499204:web:a4a4c318e16ce37809c9d1",
    databaseURL: "https://rugatha-87e15-default-rtdb.firebaseio.com/"
  };
} else {
  window.RUGATHA_FIREBASE_CONFIG = null;
  window.RUGATHA_FIREBASE_DISABLED = true;
}
