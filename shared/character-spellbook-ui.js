import { subscribeSpellbook, migrateCharacterSpellbook, spellbookSyncEnabled, characterSpellbookSyncEnabled, spellbookWritesEnabled } from './spellbooks.js?v=20261019-character-books-1';
import { legacySpellSource, previewCharacterSpells } from './character-spellbook.js?v=20261019-character-books-1';

export function createCharacterSpellbookUI({ app, auth, language, catalog, refresh }) {
  const panel = document.getElementById('characterSpellbook');
  let session, state, record, ownerUid, user, generation = 0, draftBook = null, legacyDraft = {}, restoring = false, warning = '', preview;
  const text = (zh, en) => language() === 'en' ? en : zh;
  const enabled = () => characterSpellbookSyncEnabled(user);
  const editable = () => enabled() && spellbookWritesEnabled(user) && auth.currentUser?.uid === user?.uid && ownerUid === user?.uid && state?.loaded && !state.error;
  const change = operation => {
    const token = generation;
    session.enqueue(operation).catch(error => { if (token === generation) { warning = error.message; render(); } });
  };
  const button = (label, action, disabled = false) => {
    const element = document.createElement('button'); element.type = 'button'; element.className = 'button';
    element.textContent = label; element.disabled = disabled; element.onclick = action; panel.append(element);
  };
  function render() {
    panel.replaceChildren();
    document.getElementById('spellRows')?.closest('.table-wrap')?.setAttribute('hidden', '');
    document.getElementById('mobileAddSpellButton')?.parentElement?.setAttribute('hidden', '');
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const labels = {
      loading: text('正在載入角色法術書…', 'Loading character spellbook…'),
      synced: text('角色法術書已同步', 'Character spellbook synced'),
      pending: text('角色法術書尚未同步，請保持頁面開啟。', 'Character spellbook has pending changes. Keep this page open.'),
      cached: text('角色法術書為快取，尚未由伺服器確認。', 'Cached character spellbook; awaiting server confirmation.'),
      error: text('角色法術書載入／同步失敗；請重試。', 'Character spellbook failed to load or sync. Retry.'),
      paused: text('角色法術書暫停寫入或為唯讀。', 'Character spellbook is paused or read-only.')
    };
    status.textContent = !enabled() ? text('角色法術書尚未開放。', 'Character spellbooks are not enabled.')
      : !record ? text('儲存角色後啟用法術書', 'Save this character to enable its spellbook')
        : labels[state?.status || 'loading'];
    panel.append(status);
    if (warning) { const alert = document.createElement('p'); alert.setAttribute('role', 'alert'); alert.textContent = warning; panel.append(alert); }
    if (!record || !enabled() || auth.currentUser?.uid !== user?.uid) { refresh?.(); return; }
    const link = document.createElement('a'), url = new URL('/toolbox/spells/', window.location.href);
    url.searchParams.set('character', record.key);
    // The full spells page lists only the signed-in owner's books.
    if (ownerUid === user.uid) { link.href = url.href; link.textContent = text('開啟此角色的完整法術書', 'Open this character’s full spellbook'); panel.append(link); }
    if (session && ['error', 'cached', 'paused'].includes(state?.status)) button(text('重試角色法術書', 'Retry character spellbook'), () => session.retry());
    if (state?.loaded) {
      if (draftBook) button(text('重試還原備份法術', 'Retry restoring backup spells'), restoreDraft, !editable() || restoring);
      const list = document.createElement('ul'); list.className = 'character-spell-list';
      for (const id of state.ids) {
        const spell = catalog().spells.find(item => item.name_en === id), row = document.createElement('li');
        row.textContent = spell ? `${spell.level} · ${language() === 'en' ? spell.name_en : spell.name_zh} (${id})` : `${text('未知法術', 'Unknown spell')}: ${id}`;
        if (editable()) {
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'button'; remove.textContent = text('移除', 'Remove');
          remove.onclick = () => change({ type: 'remove', ids: [id] }); row.append(remove);
        }
        const detail = document.createElement('p'); detail.textContent = spell ? (language() === 'en' ? spell.descriptionEn : spell.descriptionZh) : ''; row.append(detail);
        list.append(row);
      }
      panel.append(list);
      if (editable()) {
        const select = document.createElement('select'); select.setAttribute('aria-label', text('加入角色法術', 'Add character spell'));
        select.append(new Option(text('選擇法術', 'Choose spell'), ''));
        catalog().spells.filter(item => !state.ids.includes(item.name_en)).forEach(item => select.append(new Option(`${item.level} · ${language() === 'en' ? item.name_en : item.name_zh}`, item.name_en)));
        select.onchange = () => { if (select.value) change({ type: 'add', ids: [select.value] }); }; panel.append(select);
        button(text('清空角色書', 'Clear character spellbook'), () => {
          if (confirm(text('確定清空此角色書？', 'Clear this character spellbook?'))) change({ type: 'clear', ids: [] });
        });
      }
      if (!state.exists && state.status === 'synced' && preview && (preview.ids.length || preview.unknown.length) && ownerUid === user.uid) {
        const migration = document.createElement('p'); migration.textContent = text('舊法術轉移預覽：', 'Legacy migration preview: ') + preview.ids.join(', ')
          + (preview.unknown.length ? text('；無法確認的原始值：', '; Unresolved original values: ') + JSON.stringify(preview.unknown) : ''); panel.append(migration);
        button(text('確認轉移舊法術', 'Confirm legacy migration'), async () => {
          const token = generation;
          try { await migrateCharacterSpellbook({ app, auth, user, characterId: record.key, preview, isActive: () => token === generation }); }
          catch (error) { if (token === generation) { warning = error.message; render(); } }
        }, !editable() || Boolean(preview.unknown.length));
      }
    }
    refresh?.();
  }
  function attach(nextRecord, nextOwner, nextUser) {
    generation++; session?.close(); session = null; state = null; warning = '';
    record = nextRecord; ownerUid = nextOwner; user = nextUser; restoring = false;
    preview = record ? previewCharacterSpells(record.data, catalog().spells, catalog().version) : null;
    if (record && enabled() && spellbookSyncEnabled(user)) {
      const token = generation;
      session = subscribeSpellbook({ app, auth, user, ownerUid, scope: { type: 'character', characterId: record.key }, onChange: value => {
        if (token !== generation) return;
        state = value; render();
      } });
    }
    render();
  }
  async function restoreDraft() {
    if (!draftBook || !session || !state?.loaded || restoring) return;
    const imported = draftBook, token = generation; restoring = true;
    try {
      await session.enqueue({ type: 'add', ids: imported.spellIds });
      if (token === generation) { draftBook = null; warning = ''; }
    } catch (error) { if (token === generation) warning = error.message; }
    finally { if (token === generation) { restoring = false; render(); } }
  }
  const guard = () => (!state?.pending && !draftBook)  || confirm(text('角色書尚有待同步操作。確定放棄並離開？取消可留在此頁重試。', 'Discard pending character spellbook changes? Cancel to stay and retry.'));
  window.addEventListener('beforeunload', event => { if (state?.pending || draftBook) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('online', () => session?.retry());
  window.addEventListener('rugatha:feature-flags-changed', () => {
    if (enabled() && record && !session) { attach(record, ownerUid, user); return; }
    if (enabled()) session?.retry();
    render();
  });
  return {
    render, guard,
    load: attach,
    authChanged(nextUser) {
      if (nextUser?.uid === user?.uid) { warning = ''; session?.retry(); render(); return; }
      if (state?.pending || draftBook) { warning = text('帳號已變更，原角色書操作仍保留。請登入原帳號重試，或切換角色時明確放棄。', 'Account changed. Pending operations are retained. Sign in to the original account to retry, or explicitly discard when switching characters.'); render(); }
      else attach(null, nextUser?.uid, nextUser);
    },
    reset() { draftBook = null; legacyDraft = {}; attach(null, user?.uid, user); },
    validateBackup(book) {
      if (book !== undefined && (book?.schemaVersion !== 1 || !Array.isArray(book.spellIds) || book.spellIds.length > 500 || book.spellIds.some(id => !catalog().spells.some(spell => spell.name_en === id)))) throw new Error('Invalid character spellbook backup');
    },
    legacyDraftSource() { return legacyDraft; },
    importBackup(book, data = {}) {
      this.validateBackup(book);
      legacyDraft = book ? {} : legacySpellSource(data);
      draftBook = book ? { schemaVersion: 1, spellIds: [...new Set(book.spellIds)] } : null;
    },
    async saved(result, savedUser) {
      const key = result.key;
      if (record?.key === key && user?.uid === savedUser.uid) return;
      const imported = draftBook;
      attach({ key, data: result.data || {} }, savedUser.uid, savedUser);
      if (imported) {
        // Wait for the first authoritative read before adding imported spells.
        const token = generation;
        for (let attempt = 0; attempt < 100 && token === generation && !state?.loaded && !state?.error; attempt++) await new Promise(resolve => setTimeout(resolve, 100));
        if (token !== generation || !state?.loaded) { draftBook = imported; throw new Error('角色卡已儲存，但法術書尚未載入；請保持此頁並重試法術書。'); }
        await restoreDraft();
        if (draftBook) throw new Error('角色卡已儲存，但備份法術尚未還原；請重試法術書。');
      }
    },
    backup() {
      const legacyPending = !record ? Object.entries(legacyDraft).some(([key, value]) => /^spellName\d+$/.test(key) && value !== '')
        : state?.loaded && !state.exists && (preview?.ids.length || preview?.unknown.length);
      if (legacyPending) throw new Error(text('舊法術尚未確認轉移，請先處理轉移或明確清空角色書，再輸出備份。原始資料仍保留。', 'Legacy spells need review. Migrate them or explicitly clear the character spellbook before exporting. Original data is preserved.'));
      if (!record) return draftBook;
      if (draftBook || !enabled() || !state?.loaded || !state.confirmed || state.pending || state.error) throw new Error(text('角色法術書尚未確認同步，無法匯出。請先重試。', 'Character spellbook is not confirmed synced. Retry before exporting.'));
      return { schemaVersion: 1, spellIds: [...state.ids] };
    }
  };
}
