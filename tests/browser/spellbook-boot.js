import { getSiteAuth } from '/shared/auth-session.js?v=20261019-character-books-1';
import * as authSdk from '/__firebase__/firebase-auth.js';
// Injected only by scripts/spellbook-browser-server.py; not imported by production HTML.
import { getApps, initializeApp } from '/__firebase__/firebase-app.js';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from '/__firebase__/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator, disableNetwork, enableNetwork } from '/__firebase__/firebase-firestore.js';

if (!['127.0.0.1', 'localhost'].includes(location.hostname) || window.RUGATHA_FIREBASE_CONFIG.projectId !== 'demo-rugatha') {
  throw new Error('Browser tests require the loopback demo Emulator.');
}
const app = getApps()[0] || initializeApp(window.RUGATHA_FIREBASE_CONFIG);
const auth = getSiteAuth(app, authSdk), db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);
const tools = document.createElement('section');
tools.id = 'browser-test-tools';
tools.style.cssText = 'position:relative;padding:64px 8px 8px;background:#eef8ff;color:#132d48;border:2px solid #336699;font:14px sans-serif;z-index:5;';
const title = document.createElement('strong');
title.textContent = 'LOCAL DEMO TEST — Firebase Emulator only';
tools.append(title);
const result = document.createElement('output'); result.style.display = 'block';
const add = (label, action) => {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.style.cssText = 'padding:8px;margin:3px;font:14px sans-serif';
  button.onclick = async () => {
    try { await action(); result.textContent = `OK: ${label}`; }
    catch (cause) { result.textContent = `ERROR: ${label}: ${cause.message}`; }
  };
  tools.append(button);
};
const login = async label => {
  const email = `spellbook-${label.toLowerCase()}@example.test`, password = 'Emulator-test-only-123';
  try { await signInWithEmailAndPassword(auth, email, password); }
  catch (cause) {
    if (!['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(cause.code)) throw cause;
    await createUserWithEmailAndPassword(auth, email, password);
  }
};
add('登入測試 A', () => login('A'));
add('登入測試 B', () => login('B'));
add('登出', () => signOut(auth));
add('準備舊資料', () => {
  localStorage.setItem('rugatha.phb.spellbook', JSON.stringify(['Aid', 'Fireball', 'Unknown Legacy Spell']));
  window.dispatchEvent(new StorageEvent('storage', { key: 'rugatha.phb.spellbook' }));
});
add('停止網路', () => disableNetwork(db));
add('恢復網路', async () => { await enableNetwork(db); window.dispatchEvent(new Event('online')); });
add('暫停寫入', () => {
  window.RUGATHA_FEATURE_FLAGS.dataWritesEnabled = false;
  window.dispatchEvent(new Event('rugatha:feature-flags-changed'));
});
add('恢復寫入', () => {
  window.RUGATHA_FEATURE_FLAGS.dataWritesEnabled = true;
  window.dispatchEvent(new Event('rugatha:feature-flags-changed'));
});
add('停用同步', () => {
  window.RUGATHA_FEATURE_FLAGS.spellbookSyncEnabled = false;
  window.dispatchEvent(new Event('rugatha:feature-flags-changed'));
});
add('啟用同步', () => {
  window.RUGATHA_FEATURE_FLAGS.spellbookSyncEnabled = true;
  window.dispatchEvent(new Event('rugatha:feature-flags-changed'));
});
add('拒絕權限', () => fetch('/__test__/deny', { method: 'POST' }).then(response => { if (!response.ok) throw new Error(response.status); }));
add('恢復權限', async () => {
  const response = await fetch('/__test__/restore', { method: 'POST' });
  if (!response.ok) throw new Error(response.status);
  window.dispatchEvent(new Event('online'));
});
tools.append(result); document.body.prepend(tools);
// Available only on the loopback test server, for fault injection and assertions.
window.spellbookTest = { app, auth, db, login, signOut: () => signOut(auth) };
