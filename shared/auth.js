import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const getFirebaseConfig = () => window.RUGATHA_FIREBASE_CONFIG || null;
const loginHidden = true;
const isLikelyInAppBrowser = () => {
  const ua = navigator.userAgent || "";
  return /(FBAN|FBAV|Instagram|Line|TikTok|Twitter|WeChat|QQ|Weibo|WebView|wv)/i.test(
    ua
  );
};

const ensureAuthStyles = () => {
  if (document.getElementById("rugatha-auth-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "rugatha-auth-style";
  style.textContent = `
    .auth-entry {
      position: static;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      margin: 32px auto 24px;
      padding: 0 16px;
      text-align: center;
      justify-self: center;
      align-self: center;
      grid-column: 1 / -1;
      font-family: "Space Grotesk", "Inter", system-ui, -apple-system, sans-serif;
    }

    .auth-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.1);
      color: #1a1a1a;
      font-weight: 700;
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .auth-button:hover,
    .auth-button:focus-visible {
      transform: translateY(-1px);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
      outline: none;
    }

    .auth-button:disabled {
      cursor: default;
      opacity: 0.7;
    }

    .auth-button--ghost {
      background: rgba(255, 255, 255, 0.12);
      color: #f0f5f2;
      border-color: rgba(255, 255, 255, 0.3);
    }

    .auth-button--ghost:hover,
    .auth-button--ghost:focus-visible {
      background: rgba(255, 255, 255, 0.2);
    }

    .auth-icon {
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      background: #fff;
      border-radius: 50%;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
    }

    .auth-status {
      font-size: 13px;
      color: #f0f5f2;
      font-weight: 600;
      text-align: center;
      max-width: 240px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
    }

    @media (max-width: 720px) {
      .auth-status {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
};

const ensureAuthMarkup = () => {
  if (document.getElementById("google-login")) {
    return;
  }

  const container = document.createElement("section");
  container.className = "auth-entry";
  container.setAttribute("aria-label", "Account");
  container.innerHTML = `
    <button class="auth-button" id="google-login" type="button" aria-label="Sign in with Google">
      <span class="auth-icon" aria-hidden="true">
        <svg viewBox="0 0 256 262" width="18" height="18" role="presentation" focusable="false">
          <path fill="#4285F4" d="M255.9 133.5c0-11.1-.9-22.5-2.9-33.5H130v63.4h70.3c-3 16.1-12.2 30.1-25.9 39.4v32.6h41.8c24.5-22.6 39.7-56.1 39.7-101.9z"/>
          <path fill="#34A853" d="M130 261.1c35.1 0 64.6-11.6 86.2-31.5l-41.8-32.6c-11.6 7.8-26.5 12.4-44.4 12.4-34.1 0-63-23-73.3-53.8H13.6v33.8C35.4 230.6 79.9 261.1 130 261.1z"/>
          <path fill="#FBBC05" d="M56.7 155.6c-2.7-8.1-4.2-16.8-4.2-25.6s1.6-17.5 4.2-25.6V70.6H13.6C4.9 88.2 0 108.1 0 130s4.9 41.8 13.6 59.4l43.1-33.8z"/>
          <path fill="#EA4335" d="M130 51.9c19.1 0 36.3 6.6 49.8 19.6l37.3-37.3C194.5 12.7 165.1 0 130 0 79.9 0 35.4 30.5 13.6 70.6l43.1 33.8C67 74.9 95.9 51.9 130 51.9z"/>
        </svg>
      </span>
      <span class="auth-label">Sign in</span>
    </button>
    <button class="auth-button auth-button--ghost" id="google-logout" type="button" aria-label="Sign out" disabled>
      <span class="auth-label">Sign out</span>
    </button>
    <div class="auth-status" id="auth-status" aria-live="polite">Google login</div>
  `;
  const host =
    document.querySelector(".page") ||
    document.querySelector("main") ||
    document.querySelector(".container") ||
    document.body;
  host.appendChild(container);
};

const setupAuth = () => {
  const firebaseConfig = getFirebaseConfig();
  const firebaseDisabled =
    window.RUGATHA_FEATURE_FLAGS && window.RUGATHA_FEATURE_FLAGS.firebaseEnabled === false;

  if (loginHidden) {
    const container = document.querySelector(".auth-entry");
    if (container) {
      container.remove();
    }
    return;
  }

  if (firebaseDisabled || !firebaseConfig) {
    const loginButton = document.getElementById("google-login");
    if (loginButton) {
      const container = loginButton.closest(".auth-entry");
      if (container) {
        container.remove();
      } else {
        loginButton.remove();
      }
    }
    if (!firebaseDisabled && !firebaseConfig) {
      console.warn("Missing window.RUGATHA_FIREBASE_CONFIG");
    }
    return;
  }

  ensureAuthStyles();
  ensureAuthMarkup();

  const loginButton = document.getElementById("google-login");
  const logoutButton = document.getElementById("google-logout");
  const statusEl = document.getElementById("auth-status");
  const inAppBrowser = isLikelyInAppBrowser();

  if (!loginButton || !logoutButton || !statusEl) {
    return;
  }

  const labelEl = loginButton.querySelector(".auth-label");

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getDatabase(app);

  isSupported()
    .then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    })
    .catch(() => {});

  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  let memberId = null;
  const VISIT_KEY_PREFIX = "rugatha-visit:";
  const VISIT_AWARD_CODE = "ach_TWRY";
  let visitPendingAward = false;
  let visitAchievementPromise = null;

  const resolveMemberId = async (user) => {
    if (!user || !db) return null;
    const defaultId = user.uid;
    try {
      const snapshot = await get(ref(db, `members/${defaultId}`));
      if (snapshot.exists()) {
        const data = snapshot.val() || {};
        return data.memberId || defaultId;
      }
    } catch (error) {
      console.warn("Failed to resolve memberId", error);
    }
    return defaultId;
  };

  const resolveAchievementUrls = () => {
    const origin = window.location.origin || "";
    const candidates = [];
    if (window.RUGATHA_BASE_URL) {
      try {
        const base = new URL(window.RUGATHA_BASE_URL, window.location.href);
        const normalizedBase =
          base.pathname.endsWith("/shared/") || base.pathname.endsWith("/shared")
            ? new URL("../", base)
            : base;
        candidates.push(new URL("member/achievements.csv", normalizedBase).href);
      } catch (error) {}
    }
    if (origin) {
      candidates.push(`${origin}/member/achievements.csv`);
      candidates.push(`${origin}/web/member/achievements.csv`);
    }
    return Array.from(new Set(candidates));
  };

  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (inQuotes) {
        if (char === "\"") {
          if (text[i + 1] === "\"") {
            cell += "\"";
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cell += char;
        }
      } else if (char === "\"") {
        inQuotes = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (char !== "\r") {
        cell += char;
      }
    }
    if (cell.length || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  };

  const loadVisitAchievement = async () => {
    if (visitAchievementPromise) return visitAchievementPromise;
    visitAchievementPromise = (async () => {
      const urls = resolveAchievementUrls();
      let response = null;
      for (const url of urls) {
        try {
          const attempt = await fetch(url, { cache: "no-store" });
          if (attempt.ok) {
            response = attempt;
            break;
          }
        } catch (error) {}
      }
      if (!response) {
        throw new Error("Failed to load achievements CSV");
      }
      const text = await response.text();
      const rows = parseCsv(text);
      if (!rows.length) return null;
      const headers = rows[0].map((header) => String(header || "").trim());
      const target = rows.slice(1).find((row) => row[0] === VISIT_AWARD_CODE);
      if (!target) return null;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = target[index] ?? "";
      });
      return {
        achievement: VISIT_AWARD_CODE,
        rewards: {
          BadgeSTR: Number(record.STR || 0),
          BadgeDEX: Number(record.DEX || 0),
          BadgeCON: Number(record.CON || 0),
          BadgeINT: Number(record.INT || 0),
          BadgeWIS: Number(record.WIS || 0),
          BadgeCHA: Number(record.CHA || 0)
        }
      };
    })();
    return visitAchievementPromise;
  };

  const awardVisitAchievement = async () => {
    if (!memberId || !db) return;
    let achievement = null;
    try {
      achievement = await loadVisitAchievement();
    } catch (error) {
      console.warn("Failed to load visit achievement", error);
      return;
    }
    if (!achievement) return;
    const memberRef = ref(db, `members/${memberId}`);
    try {
      await runTransaction(memberRef, (current) => {
        const existing = current || {};
        const existingAchievements = existing.achievements || {};
        if (existingAchievements[achievement.achievement]) {
          return existing;
        }
        const nextAchievements = { ...existingAchievements, [achievement.achievement]: true };
        const next = { ...existing, achievements: nextAchievements };
        Object.entries(achievement.rewards || {}).forEach(([key, value]) => {
          const baseValue = Number(existing[key]);
          const safeBase = Number.isFinite(baseValue) ? baseValue : 10;
          const rewardValue = Number.isFinite(value) ? value : 0;
          next[key] = safeBase + rewardValue;
        });
        return next;
      });
    } catch (error) {
      console.warn("Failed to award visit achievement", error);
    }
  };

  const maybeAwardVisitAchievement = () => {
    if (!visitPendingAward) return;
    if (!memberId || !db) return;
    visitPendingAward = false;
    awardVisitAchievement();
  };

  const trackPageVisit = () => {
    const path = window.location.pathname || "";
    const key = `${VISIT_KEY_PREFIX}${path}`;
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem(key));
      localStorage.setItem(key, String(Date.now()));
    } catch (error) {}
    if (seen) {
      visitPendingAward = true;
      maybeAwardVisitAchievement();
    }
  };

  const setSignedOut = () => {
    if (labelEl) {
      labelEl.textContent = "Sign in";
    }
    statusEl.textContent = inAppBrowser
      ? "Open in Chrome/Safari to sign in"
      : "Google login";
    loginButton.disabled = false;
    loginButton.removeAttribute("aria-disabled");
    logoutButton.disabled = true;
    logoutButton.setAttribute("aria-disabled", "true");
    memberId = null;
  };

  const setSignedIn = (user) => {
    if (labelEl) {
      labelEl.textContent = "Signed in";
    }
    const fallback = user?.email || "Signed in";
    statusEl.textContent = user?.displayName ? `Hi, ${user.displayName}` : fallback;
    loginButton.disabled = true;
    loginButton.setAttribute("aria-disabled", "true");
    logoutButton.disabled = false;
    logoutButton.removeAttribute("aria-disabled");
  };

  loginButton.addEventListener("click", async () => {
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google sign-in failed", error);
      statusEl.textContent = "Sign-in failed";
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Sign-out failed", error);
      statusEl.textContent = "Sign-out failed";
    }
  });

  onAuthStateChanged(auth, (user) => {
    if (user) {
      setSignedIn(user);
      resolveMemberId(user).then((resolved) => {
        memberId = resolved;
        maybeAwardVisitAchievement();
      });
      return;
    }
    setSignedOut();
  });

  trackPageVisit();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupAuth);
} else {
  setupAuth();
}
