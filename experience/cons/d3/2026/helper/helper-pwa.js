const buttons=[...document.querySelectorAll('[data-helper-install]')];
const hint=document.querySelector('#helper-install-hint');
let prompt;
function installed(){buttons.forEach(button=>button.hidden=true);hint.hidden=true;}
if(matchMedia('(display-mode: standalone)').matches || navigator.standalone)installed();
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event;buttons.forEach(button=>button.hidden=false);hint.textContent='可將此工作區安裝到主畫面，方便現場使用。';});
buttons.forEach(button=>button.addEventListener('click',async()=>{if(!prompt)return;await prompt.prompt();await prompt.userChoice;prompt=null;buttons.forEach(button=>button.hidden=true);}));
window.addEventListener('appinstalled',installed);
function network(){document.querySelectorAll('[data-helper-network]').forEach(node=>node.hidden=navigator.onLine);}
window.addEventListener('online',network);window.addEventListener('offline',network);network();
if('serviceWorker' in navigator){
  // Retire only the previous helper worker; leave the main Rugatha PWA alone.
  navigator.serviceWorker.getRegistrations().then(registrations=>Promise.all(registrations.filter(registration=>new URL(registration.scope).pathname==='/2026-d3-helper.html').map(registration=>registration.unregister()))).catch(()=>{});
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{hint.textContent='暫時無法準備安裝，請連線後重新整理。';});
}
