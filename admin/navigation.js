// Reuse one navigation tree across desktop and the native mobile dialog.
export function setupAdminNavigation() {
  const dashboard=document.getElementById('dashboard');
  const sidebar=document.getElementById('admin-sidebar');
  const dialog=document.getElementById('admin-navigation-dialog');
  const openButton=document.getElementById('admin-menu-open');
  const closeButton=document.getElementById('admin-menu-close');
  const mobile=window.matchMedia('(max-width: 760px)');
  let restoreFocus=true;
  function close(restore=true) {
    restoreFocus=restore;
    if(dialog.open)dialog.close();
    document.body.classList.remove('admin-menu-open');
    openButton.setAttribute('aria-expanded','false');
  }
  function syncLayout() {
    close(false);
    if(mobile.matches) {
      dialog.append(sidebar);
      sidebar.querySelectorAll('.nav-group').forEach(group=>group.open=Boolean(group.querySelector('[aria-current="page"]')));
    } else {
      dashboard.insertBefore(sidebar,dashboard.querySelector('main'));
    }
  }
  openButton.addEventListener('click',()=>{
    if(!mobile.matches || dashboard.hidden || dialog.open)return;
    restoreFocus=true;
    dialog.showModal();
    openButton.setAttribute('aria-expanded','true');
    document.body.classList.add('admin-menu-open');
    closeButton.focus();
  });
  closeButton.addEventListener('click',()=>close());
  dialog.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const items=[...dialog.querySelectorAll('a[href],button:not([disabled]),summary,input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')].filter(node=>node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden');
    const first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();return;}
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',()=>{
    if(dialog.open)return;
    document.body.classList.remove('admin-menu-open');
    openButton.setAttribute('aria-expanded','false');
    if(restoreFocus && document.contains(openButton) && mobile.matches)openButton.focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    const rect=dialog.getBoundingClientRect();
    if(event.target===dialog && (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom))close();
  });
  sidebar.addEventListener('click',event=>{
    if(!mobile.matches || !event.target.closest('[data-nav]'))return;
    close(false);
    requestAnimationFrame(()=>{
      window.scrollTo(0,0);
      document.getElementById('screen-title')?.focus({preventScroll:true});
    });
  });
  mobile.addEventListener('change',syncLayout);
  syncLayout();
  return {close:()=>close(false)};
}
