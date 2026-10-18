// Pure state and migration logic; no Firebase or browser globals.
export const LEGACY_BOOK_KEY = 'rugatha.phb.spellbook';
export const GUEST_BOOK_KEY = 'rugatha.phb.spellbook.guest.v1';
export const MAX_SPELLS = 500;

export function spellbookAccessEnabled(flags, uid) {
  if (flags?.spellbookSyncEnabled !== true) return false;
  const members = flags.spellbookSyncMemberUids;
  return members === undefined || (Array.isArray(members) && (!members.length || members.includes(uid)));
}

export function spellSearchRank(spell, query) {
  const names = [spell.name_en, spell.name_zh].map(name => String(name || '').toLowerCase());
  if (names.includes(query)) return 0;
  if (names.some(name => name.startsWith(query))) return 1;
  if (names.some(name => name.includes(query))) return 2;
  return 3;
}

export function parseLocalBook(raw) {
  if (raw === null) return { ids: [], invalid: false };
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return { ids: [], invalid: true };
    return { ids: [...new Set(value.filter(id => typeof id === 'string'))],
      invalid: value.some(id => typeof id !== 'string') };
  } catch { return { ids: [], invalid: true }; }
}

export function importSource(legacyRaw, guestRaw, knownIds) {
  const sources = [parseLocalBook(legacyRaw), parseLocalBook(guestRaw)];
  const ids = [...new Set(sources.flatMap(source => source.ids))].sort();
  return {
    // Include exact source content so edits by an older page trigger another prompt.
    fingerprint: JSON.stringify([legacyRaw, guestRaw]),
    ids: ids.filter(id => knownIds.has(id)),
    unknown: ids.filter(id => !knownIds.has(id)),
    invalid: sources.some(source => source.invalid)
  };
}

export function applyOperation(ids, operation) {
  const result = new Set(ids);
  if (operation.type === 'clear') result.clear();
  else if (operation.type === 'remove') operation.ids.forEach(id => result.delete(id));
  else operation.ids.forEach(id => result.add(id));
  if (result.size > MAX_SPELLS) throw new Error('法術書最多可儲存 500 個法術。');
  return [...result];
}

// Each instance belongs to exactly one auth session. Never reuse it for another UID.
export function createSpellbookSession({ connect, write, onChange, enabled = () => true }) {
  let active = true, loaded = false, confirmed = false, base = [], queue = [];
  let running = false, error = null, unsubscribe = () => {}, connection = 0, revision = 0;
  const emit = () => {
    if (!active) return;
    let ids = base;
    for (const item of queue) ids = applyOperation(ids, item.operation);
    onChange({ ids, loaded, pending: queue.length, error,
      status: !enabled() ? 'paused' : error ? 'error' : !loaded ? 'loading'
        : queue.length ? 'pending' : confirmed ? 'synced' : 'cached' });
  };
  const pump = async () => {
    if (!active || running || !loaded || !enabled() || !queue.length || error) return;
    running = true;
    const item = queue[0];
    const startRevision = revision;
    try {
      // Transport must check isActive again inside transaction retries.
      await write(item.operation, () => active && enabled());
      if (!active) return;
      // A newer subscription may already include this commit and a later remote edit.
      if (revision === startRevision) base = applyOperation(base, item.operation);
      confirmed = true; // write() resolves only on server acknowledgement.
      queue.shift();
      item.resolve();
    } catch (cause) {
      if (active) error = cause;
    } finally {
      running = false;
      emit();
      if (active && !error) void pump();
    }
  };
  const subscribe = async () => {
    const version = ++connection;
    unsubscribe();
    try {
      const stop = await connect(snapshot => {
        if (!active || version !== connection) return;
        revision++;
        base = snapshot.ids;
        loaded = true;
        confirmed = snapshot.confirmed;
        error = null;
        emit();
        void pump();
      }, cause => {
        if (!active || version !== connection) return;
        error = cause;
        confirmed = false;
        emit();
      });
      if (!active || version !== connection) stop();
      else unsubscribe = stop;
    } catch (cause) {
      if (active && version === connection) { error = cause; emit(); }
    }
  };
  emit();
  void subscribe();
  return {
    enqueue(operation) {
      if (!active || !loaded || !enabled()) return Promise.reject(new Error('目前無法寫入法術書。'));
      let ids = base;
      for (const item of queue) ids = applyOperation(ids, item.operation);
      try { applyOperation(ids, operation); } // Validate before adding to queue.
      catch (cause) { return Promise.reject(cause); }
      const promise = new Promise((resolve, reject) => queue.push({ operation, resolve, reject }));
      emit();
      void pump();
      return promise;
    },
    retry() { error = null; void subscribe(); emit(); },
    close() {
      active = false; connection++; unsubscribe();
      for (const item of queue) item.reject(new Error('登入帳號已變更，舊帳號的待同步操作已取消。'));
      queue = [];
    }
  };
}
