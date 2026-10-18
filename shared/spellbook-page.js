import { getSiteAuth } from './auth-session.js?v=20261019-character-books-1';
import { normalizeSpellbookScope } from './character-spellbook.js?v=20261019-character-books-1';
import { LEGACY_BOOK_KEY, GUEST_BOOK_KEY, parseLocalBook, importSource, applyOperation } from './spellbook-state.js?v=20261019-character-books-1';

const loadFirebaseModules = () => Promise.all([
  import('https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js'),
  import('./spellbooks.js?v=20261019-character-books-1')
]);

export function mountSpellbook({ knownIds, onChange, language, panel, loadFirebase = loadFirebaseModules }) {
  let user = null, mode = 'loading', session = null, snapshot = null, generation = 0;
  let ids = [], warning = '', storageError = false, storageReadError = false, source = null, deferred = false, importing = false;
  let scope = normalizeSpellbookScope(new URL(window.location?.href || 'https://rugatha.com/toolbox/spells/').searchParams.has('character')
    ? { type: 'character', characterId: new URL(window.location?.href || 'https://rugatha.com/toolbox/spells/').searchParams.get('character') } : undefined);
  let characters = [], selectedName = '', charactersError = '', deferredUser;
  let awaitingAccountDecision = false;
  const personal = () => scope.type === 'personal';
  const characterEnabled = () => backend?.characterSpellbookSyncEnabled?.(user) === true;
  let auth, app, backend, stopAuth = () => {}, destroyed = false;
  const text = (zh, en) => language() === 'en' ? en : zh;
  const read = key => {
    try { return localStorage.getItem(key); }
    catch { storageError = true; storageReadError = true; return null; }
  };
  const save = (key, value) => {
    try { localStorage.setItem(key, value); return true; }
    catch { storageError = true; return false; }
  };
  const recordKey = () => `rugatha.phb.spellbook.import.v1.${user.uid}`;
  const writesEnabled = () => window.RUGATHA_FEATURE_FLAGS?.dataWritesEnabled !== false;
  const canEdit = () => mode === 'guest' || (mode === 'member' && snapshot?.loaded && (personal() || characterEnabled()) && backend.spellbookWritesEnabled(user));
  const publish = () => { if (destroyed) return; onChange({ ids, canEdit: canEdit() }); render(); };
  const inspectSource = () => {
    source = importSource(read(LEGACY_BOOK_KEY), read(GUEST_BOOK_KEY), knownIds);
  };
  function render() {
    if (destroyed) return;
    panel.replaceChildren();
    if (user && characterEnabled()) {
      const label = document.createElement('label');
      label.textContent = text('選擇法術書：', 'Spellbook: ');
      const selector = document.createElement('select'); selector.id = 'spellbookSelector';
      selector.append(new Option(text('我的個人法術書', 'My personal spellbook'), ''));
      characters.forEach(item => selector.append(new Option(item.characterName, item.key)));
      if (!personal() && !characters.some(item => item.key === scope.characterId)) {
        selector.append(new Option(text('指定角色（無法載入）', 'Requested character (unavailable)'), scope.characterId));
      }
      selector.value = personal() ? '' : scope.characterId;
      selector.addEventListener('change', () => {
        if (snapshot?.pending && !confirm(text('此書尚有待同步操作。確定放棄並切換？取消可留在此頁重試。', 'Discard pending changes and switch books? Cancel to stay and retry.'))) { render(); return; }
        scope = normalizeSpellbookScope(selector.value ? { type: 'character', characterId: selector.value } : undefined);
        const url = new URL(window.location?.href || 'https://rugatha.com/toolbox/spells/');
        if (personal()) url.searchParams.delete('character'); else url.searchParams.set('character', scope.characterId);
        window.history.replaceState({}, '', url);
        switchUser(user);
      });
      label.append(selector); panel.append(label);
      if (!personal()) {
        const heading = document.createElement('h3');
        selectedName = characters.find(item => item.key === scope.characterId)?.characterName || scope.characterId;
        heading.textContent = text('角色法術書：', 'Character spellbook: ') + selectedName; panel.append(heading);
        const link = document.createElement('a'), url = new URL('/toolbox/character_sheet/', window.location.href);
        url.searchParams.set('character', scope.characterId); link.href = url.href;
        link.textContent = text('開啟此角色卡', 'Open character sheet'); panel.append(link);
      }
      if (charactersError) { const error = document.createElement('p'); error.textContent = charactersError; panel.append(error); }
    }
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    const statuses = {
      loading: storageReadError
        ? text('無法讀取瀏覽器儲存空間，暫停編輯並確認登入狀態。請允許儲存後重新整理。', 'Browser storage cannot be read. Editing is paused while sign-in is checked. Allow storage and reload.')
        : text('正在載入帳號法術書…', 'Loading your spellbook…'),
      synced: text('已同步', 'Synced'),
      cached: text('顯示快取，尚未由伺服器確認。', 'Cached copy; waiting for server confirmation.'),
      pending: text('尚未同步：操作保留於此頁，請保持頁面開啟。', 'Pending sync. Keep this page open to retain changes.'),
      error: text('同步失敗，待同步操作仍保留於此頁。請重試。', 'Sync failed. Changes remain on this page. Please retry.'),
      paused: text('寫入已暫停，尚未同步的操作保留於此頁。', 'Writes paused. Pending changes remain on this page.')
    };
    status.textContent = mode === 'guest'
      ? text('訪客本機法術書。登入後可確認匯入並跨裝置同步。', 'Guest spellbook on this browser. Sign in to import and sync.')
      : mode === 'disabled'
        ? text('帳號同步尚未開放或已停用。雲端清單暫不顯示，本機備份仍保留。', 'Account sync is disabled. Cloud data is hidden; local backups are preserved.')
        : mode === 'local-error'
          ? text('無法讀取本機資料，已暫停編輯以保護原始清單。請允許儲存後重新整理。', 'Local data cannot be read. Editing is paused to protect the original list. Allow storage and reload.')
        : mode === 'unavailable'
          ? text('無法確認登入狀態，暫停編輯。請重新整理重試。', 'Unable to check sign-in status. Reload to retry.')
          : statuses[!writesEnabled() && mode === 'member' ? 'paused' : snapshot?.status || 'loading'];
    if (mode === 'disabled' && snapshot?.pending) status.textContent += text(
      ' 尚未同步的操作保留於此頁，離開後可能遺失。',
      ' Pending changes remain on this page and may be lost when you leave.');
    if (user) status.textContent += ` (${user.email || user.displayName || user.uid})`;
    panel.append(status);
    const button = (label, action, disabled = false) => {
      const element = document.createElement('button');
      element.type = 'button'; element.className = 'book-button';
      element.textContent = label; element.disabled = disabled;
      element.addEventListener('click', action); panel.append(element);
    };
    if (awaitingAccountDecision) {
      button(text('放棄原帳號待同步操作，切換帳號', 'Discard pending changes and switch account'), () => {
        awaitingAccountDecision = false; switchUser(deferredUser, true);
      });
    }
    if (mode === 'member' && ['error', 'cached', 'paused'].includes(snapshot?.status)) {
      button(text('重試同步', 'Retry sync'), () => session.retry(), !writesEnabled());
    }
    if (personal() && mode === 'member' && source?.ids.length && !deferred && read(recordKey()) !== source.fingerprint) {
      const message = document.createElement('p');
      message.textContent = text(`此瀏覽器有 ${source.ids.length} 個可匯入的本機法術，將合併到以上帳號。`,
        `${source.ids.length} local spells can be merged into the account above.`);
      panel.append(message);
      if (source.ids.length) {
        button(text(importing ? '匯入中…' : '確認合併匯入', importing ? 'Importing…' : 'Confirm import'), doImport,
          importing || !canEdit());
      }
      button(text('稍後處理', 'Later'), () => { deferred = true; render(); }, importing);
    }
    if (!personal() && mode === 'member') {
      button(text(`從個人書合併複製到「${selectedName}」`, `Copy personal spells into “${selectedName}”`), async () => {
        const token = generation, target = session;
        try {
          const copied = await backend.readPersonalSpellbook({ app, auth, user });
          if (token !== generation) return;
          if (confirm(text(`將 ${copied.length} 個法術合併複製到「${selectedName}」？兩本書之後各自獨立。`, `Merge ${copied.length} personal spells into “${selectedName}”? The books remain independent.`))) {
            await target.enqueue({ type: 'add', ids: copied });
          }
        } catch (error) { if (token === generation) { warning = String(error.message); render(); } }
      }, !canEdit());
    }
    const unknown = ids.filter(id => !knownIds.has(id));
    if (source?.unknown.length || source?.invalid || unknown.length) {
      const detail = document.createElement('p');
      detail.textContent = text('部分本機資料損壞或法術名稱無法辨識；原始本機資料仍保留，無法辨識的項目不會匯入。',
        'Some local data is invalid or unrecognized. Original data is preserved; unknown spells are not imported.')
        + ` ${[...new Set([...(source?.unknown || []), ...unknown])].join(', ')}`;
      panel.append(detail);
    }
    if (warning || storageError) {
      const message = document.createElement('p'); message.setAttribute('role', 'alert');
      message.textContent = warning || text('本機儲存無法使用。請保持頁面開啟；匯入紀錄可能無法保存。',
        'Browser storage is unavailable. Keep this page open; import receipts may not be saved.');
      panel.append(message);
    }
  }
  async function doImport() {
    if (!canEdit() || importing || !source.ids.length) return;
    const token = generation, owner = user.uid, capturedSource = source;
    importing = true; warning = ''; render();
    try {
      await session.enqueue({ type: 'add', ids: capturedSource.ids });
      if (token !== generation || user?.uid !== owner || auth.currentUser?.uid !== owner || awaitingAccountDecision) return;
      // This promise resolves only after the server transaction commits.
      save(recordKey(), capturedSource.fingerprint);
      importing = false; render();
    } catch {
      if (token !== generation) return;
      importing = false;
      warning = text('匯入尚未完成，請重試。', 'Import is incomplete. Please retry.'); render();
    }
  }
  function switchUser(nextUser, discard = false) {
    if (destroyed) return;
    if (!discard && snapshot?.pending && nextUser?.uid !== user?.uid) {
      deferredUser = nextUser; awaitingAccountDecision = true; mode = 'unavailable'; ids = [];
      warning = text('帳號已變更，原帳號待同步操作仍保留；可登入原帳號重試，或明確放棄後切換。', 'Account changed. Pending changes are retained. Sign in to the original account to retry, or discard them to switch.');
      publish(); return;
    }
    if (awaitingAccountDecision && nextUser?.uid === user?.uid) {
      awaitingAccountDecision = false; mode = 'member'; warning = ''; ids = snapshot?.ids || []; session.retry(); publish(); return;
    }
    awaitingAccountDecision = false;
    generation++; session?.close(); session = null; user = nextUser;
    snapshot = null; ids = []; deferred = false; importing = false; warning = ''; source = null;
    if (!user && !personal()) { mode = 'unavailable'; }
    else if (!user) {
      mode = 'guest';
      const guest = read(GUEST_BOOK_KEY), legacy = read(LEGACY_BOOK_KEY);
      const parsed = parseLocalBook(guest === null ? legacy : guest);
      ids = parsed.ids;
      if (parsed.invalid) warning = text('本機資料格式有誤，原始資料已保留；修復前暫停本機編輯。',
        'Local data is invalid and preserved. Repair it before editing.');
      if (parsed.invalid) mode = 'local-error';
      if (storageReadError) { mode = 'local-error'; ids = []; }
    } else if ((!personal() && !characterEnabled()) || !backend.spellbookSyncEnabled(user)) mode = 'disabled';
    else {
      mode = 'member'; if (personal()) inspectSource();
      session = backend.subscribeSpellbook({ app, auth, user, scope, onChange: value => {
        snapshot = value; ids = mode === 'disabled' || awaitingAccountDecision ? [] : value.ids; publish();
      } });
    }
    if (user && characterEnabled()) {
      const token = generation, owner = user.uid;
      import('./character-sheets.js?v=20261019-character-books-1').then(module => module.listCharacterSheets(app, owner)).then(items => {
        if (token !== generation) return;
        characters = items; charactersError = ''; render();
      }).catch(() => { if (token === generation) { charactersError = text('角色列表載入失敗，請重新整理。', 'Could not load characters. Reload to retry.'); render(); } });
    } else characters = [];
    publish();
  }
  const change = operation => {
    if (!canEdit()) return;
    warning = '';
    if (mode === 'guest') {
      let next;
      try { next = applyOperation(ids, operation); }
      catch {
        warning = text('法術書最多可儲存 500 個法術。', 'A spellbook can contain at most 500 spells.');
        render(); return;
      }
      // The old key is a backup only. Never overwrite it with guest or member edits.
      if (!save(GUEST_BOOK_KEY, JSON.stringify(next))) {
        warning = text('本機儲存失敗，此次變更未儲存。', 'Local save failed. This change was not saved.');
      } else ids = next;
      publish();
    } else {
      const token = generation;
      session.enqueue(operation).catch(() => {
        if (token !== generation) return;
        warning = text('變更尚未儲存，請重試。', 'Change was not saved. Please retry.'); render();
      });
    }
  };
  const onOnline = () => session?.retry();
  const onStorage = event => {
    if (![LEGACY_BOOK_KEY, GUEST_BOOK_KEY].includes(event.key)) return;
    if (mode === 'guest') switchUser(null);
    else if (mode === 'member' && personal()) { inspectSource(); deferred = false; render(); }
  };
  window.addEventListener('online', onOnline);
  window.addEventListener('storage', onStorage);
  const onBeforeUnload = event => {
    if (!snapshot?.pending) return;
    event.preventDefault(); event.returnValue = '';
  };
  const onFlags = () => {
    if (!user || !backend) return;
    if ((!personal() && !characterEnabled()) || !backend.spellbookSyncEnabled(user)) {
      mode = 'disabled'; ids = [];
    } else if (!session) {
      switchUser(user); return;
    } else {
      mode = 'member'; ids = snapshot?.ids || [];
      if (backend.spellbookWritesEnabled(user)) session.retry();
    }
    publish();
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('rugatha:feature-flags-changed', onFlags);
  read(LEGACY_BOOK_KEY); // Surface blocked storage even when Auth initialization cannot finish.
  publish();
  Promise.resolve().then(loadFirebase).then(async ([firebaseApp, firebaseAuth, cloud]) => {
    if (destroyed) return;
    backend = cloud;
    if (!window.RUGATHA_FIREBASE_CONFIG) { switchUser(null); return; }
    app = firebaseApp.getApps().length ? firebaseApp.getApps()[0]
      : firebaseApp.initializeApp(window.RUGATHA_FIREBASE_CONFIG);
    auth = getSiteAuth(app, firebaseAuth);
    if (destroyed) return;
    stopAuth = firebaseAuth.onAuthStateChanged(auth, switchUser, () => {
      generation++; session?.close(); session = null; user = null; ids = []; snapshot = null;
      mode = 'unavailable'; publish();
    });
  }).catch(() => { if (!destroyed) { mode = 'unavailable'; publish(); } });
  return {
    render,
    destroy() {
      if (destroyed) return;
      destroyed = true; generation++; session?.close(); stopAuth?.();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('rugatha:feature-flags-changed', onFlags);
    },
    add(id) { change({ type: 'add', ids: [id] }); },
    remove(id) { change({ type: 'remove', ids: [id] }); },
    clear() {
      if (canEdit() && confirm(text('確定清空全部法術？其他裝置較早提交的新增也會被清除。',
        'Clear all spells? This also clears additions already committed by other devices.'))) {
        change({ type: 'clear', ids: [] });
      }
    }
  };
}
