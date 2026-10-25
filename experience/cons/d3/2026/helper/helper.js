import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import { initializeAuth, browserSessionPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import * as sdk from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
import { createD3Dashboard } from '/admin/d3-dashboard.js?v=20261026-helper-1';
import { clearTableData } from '/admin/data-table.js?v=20261026-experience-v3';
const $=id=>document.getElementById(id);
let authenticated=false,generation=0;
try {
  const app=getApps().find(app=>app.name==='d3-helper') || initializeApp(window.RUGATHA_FIREBASE_CONFIG,'d3-helper');
  const auth=initializeAuth(app,{persistence:browserSessionPersistence});
  const db=sdk.getFirestore(app);
  const dashboard=createD3Dashboard(()=>({authenticated,generation,db,sdk}));
  function applySession(user) {
    authenticated=user?.uid==='d3-helper-2026' && navigator.onLine;generation++;
    clearTableData();dashboard.reset();
    $('helper-gate').hidden=authenticated;$('helper-workspace').hidden=!authenticated;
    $('helper-password').value='';$('helper-login-button').disabled=!navigator.onLine;
    $('helper-login-status').textContent='';
    if(authenticated)dashboard.render();
    else if(user && user.uid!=='d3-helper-2026')void signOut(auth);
  }
  onAuthStateChanged(auth,applySession);
  window.addEventListener('offline',()=>applySession(auth.currentUser));
  window.addEventListener('online',()=>applySession(auth.currentUser));
  $('helper-login').addEventListener('submit',async event=>{
    event.preventDefault();$('helper-login-button').disabled=true;$('helper-login-status').textContent='正在驗證密碼…';
    try { await signInWithEmailAndPassword(auth,'2026-d3-helper@rugatha.com',$('helper-password').value); }
    catch(error){$('helper-password').value='';$('helper-login-status').textContent=error.code==='auth/too-many-requests'?'嘗試次數過多，請稍後再試。':'密碼不正確或連線失敗，請重試。';}
    finally{$('helper-login-button').disabled=false;}
  });
  $('helper-logout').addEventListener('click',async()=>{
    authenticated=false;generation++;clearTableData();dashboard.reset();$('helper-workspace').hidden=true;$('helper-gate').hidden=false;
    try{await signOut(auth);}catch{$('helper-login-status').textContent='登出未完成，請重新整理後再試。';}
  });
}catch{$('helper-login-status').textContent='無法連線至登入服務，請重新整理後再試。';}
