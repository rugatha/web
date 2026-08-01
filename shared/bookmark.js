const BOOKMARK_BUTTON_ID = "rugatha-page-bookmark";
let bookmarkSession = 0;
let unsubscribeBookmark = null;
let bookmarkStorageListener = null;

const isBookmarkablePage = () => {
  const path = window.location.pathname || "";
  return (
    /\/campaigns\/pages\/.+\/chpt\d+\.html$/i.test(path) ||
    /\/deities\/pages\/[^/]+\.html$/i.test(path) ||
    /\/npc\/npc_page\/pages\/[^/]+\.html$/i.test(path) ||
    /\/pc\/articles\/[^/]+\.html$/i.test(path)
  );
};

const getPagePath = () => {
  const path = (window.location.pathname || "/").replace(/^\/web(?=\/)/, "");
  return path.startsWith("/") ? path.slice(1) : path;
};

const encodeKey = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const ensureBookmarkStyles = () => {
  if (document.getElementById("rugatha-bookmark-style")) return;
  const style = document.createElement("style");
  style.id = "rugatha-bookmark-style";
  style.textContent = `
    .page-bookmark {
      position: fixed;
      top: max(16px, env(safe-area-inset-top));
      right: max(16px, env(safe-area-inset-right));
      z-index: 10000;
      display: grid;
      width: 48px;
      height: 48px;
      padding: 0;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.38);
      border-radius: 14px;
      color: #fff;
      background: rgba(15, 45, 36, 0.88);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      transition: color 160ms ease, background 160ms ease, border-color 160ms ease,
        transform 160ms ease, box-shadow 160ms ease;
    }

    .page-bookmark[hidden] { display: none !important; }
    .page-bookmark:hover { transform: translateY(-2px); }
    .page-bookmark:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 3px;
    }
    .page-bookmark:disabled { cursor: wait; opacity: 0.65; }
    .page-bookmark svg { width: 25px; height: 25px; }
    .page-bookmark .page-bookmark__fill { opacity: 0; }

    .page-bookmark[aria-pressed="true"] {
      color: #3b2b08;
      background: #f5c451;
      border-color: #ffe4a0;
      box-shadow: 0 8px 28px rgba(245, 196, 81, 0.42);
    }
    .page-bookmark[aria-pressed="true"] .page-bookmark__fill { opacity: 1; }

    @media (max-width: 720px) {
      .page-bookmark {
        top: max(12px, env(safe-area-inset-top));
        right: max(12px, env(safe-area-inset-right));
        width: 36px;
        height: 36px;
        border-radius: 10px;
      }
      .page-bookmark svg { width: 18px; height: 18px; }
    }
  `;
  document.head.appendChild(style);
};

const ensureBookmarkButton = () => {
  let button = document.getElementById(BOOKMARK_BUTTON_ID);
  if (button) return button;

  ensureBookmarkStyles();
  button = document.createElement("button");
  button.id = BOOKMARK_BUTTON_ID;
  button.className = "page-bookmark";
  button.type = "button";
  button.hidden = true;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path class="page-bookmark__fill" fill="currentColor" d="M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75V22l-6-3.75L6 22V3.75Z"/>
      <path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M6 3.75A1.75 1.75 0 0 1 7.75 2h8.5A1.75 1.75 0 0 1 18 3.75V22l-6-3.75L6 22V3.75Z"/>
    </svg>`;
  document.body.appendChild(button);
  return button;
};

const setBookmarkState = (button, saved) => {
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", saved ? "移除書籤" : "加入書籤");
  button.title = saved ? "已加入書籤，點擊可移除" : "加入書籤";
};

const getBookmarkCacheKey = (memberId, pagePath) =>
  `rugatha-bookmark:${memberId}:${pagePath}`;

const readCachedBookmark = (memberId, pagePath) => {
  try {
    return localStorage.getItem(getBookmarkCacheKey(memberId, pagePath)) === "1";
  } catch (error) {
    return false;
  }
};

const cacheBookmark = (memberId, pagePath, saved) => {
  try {
    localStorage.setItem(getBookmarkCacheKey(memberId, pagePath), saved ? "1" : "0");
  } catch (error) {}
};

const trackBookmarkChange = (saved, pagePath) => {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", saved ? "bookmark_add" : "bookmark_remove", {
    page_path: `/${pagePath}`,
    page_title: document.title || pagePath,
    bookmark_source: "page_button"
  });
};

export const hidePageBookmark = () => {
  bookmarkSession += 1;
  if (unsubscribeBookmark) {
    unsubscribeBookmark();
    unsubscribeBookmark = null;
  }
  if (bookmarkStorageListener) {
    window.removeEventListener("storage", bookmarkStorageListener);
    bookmarkStorageListener = null;
  }
  const button = document.getElementById(BOOKMARK_BUTTON_ID);
  if (!button) return;
  button.hidden = true;
  button.disabled = false;
  button.replaceWith(button.cloneNode(true));
};

export const setupPageBookmark = async ({ memberId, db, database }) => {
  if (!isBookmarkablePage() || !memberId || !db || !database) return;
  const session = ++bookmarkSession;
  const button = ensureBookmarkButton();
  const pagePath = getPagePath();
  const bookmarkRef = database.ref(db, `members/${memberId}/bookmarks/${encodeKey(pagePath)}`);

  if (unsubscribeBookmark) {
    unsubscribeBookmark();
    unsubscribeBookmark = null;
  }
  button.hidden = false;
  button.disabled = false;
  button.replaceWith(button.cloneNode(true));
  const activeButton = document.getElementById(BOOKMARK_BUTTON_ID);
  setBookmarkState(activeButton, readCachedBookmark(memberId, pagePath));
  const cacheKey = getBookmarkCacheKey(memberId, pagePath);
  if (bookmarkStorageListener) {
    window.removeEventListener("storage", bookmarkStorageListener);
  }
  bookmarkStorageListener = (event) => {
    if (session !== bookmarkSession || event.key !== cacheKey) return;
    setBookmarkState(activeButton, event.newValue === "1");
  };
  window.addEventListener("storage", bookmarkStorageListener);

  const applySnapshot = (snapshot) => {
    if (session !== bookmarkSession) return;
    const saved = snapshot.exists();
    setBookmarkState(activeButton, saved);
    cacheBookmark(memberId, pagePath, saved);
  };
  const handleLoadError = (error) => console.warn("Failed to load bookmark", error);
  if (typeof database.onValue === "function") {
    unsubscribeBookmark = database.onValue(bookmarkRef, applySnapshot, handleLoadError);
  } else {
    database.get(bookmarkRef).then(applySnapshot).catch(handleLoadError);
  }

  activeButton.addEventListener("click", async () => {
    if (activeButton.disabled) return;
    activeButton.disabled = true;
    try {
      const result = await database.runTransaction(bookmarkRef, (current) =>
        current
          ? null
          : {
              path: pagePath,
              title: document.title || pagePath,
              savedAt: new Date().toISOString()
            }
      );
      if (session !== bookmarkSession || !result.committed) return;
      const saved = result.snapshot.exists();
      setBookmarkState(activeButton, saved);
      cacheBookmark(memberId, pagePath, saved);
      trackBookmarkChange(saved, pagePath);
    } catch (error) {
      console.warn("Failed to update bookmark", error);
    } finally {
      if (session === bookmarkSession) activeButton.disabled = false;
    }
  });
};
