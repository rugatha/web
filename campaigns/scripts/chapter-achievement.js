import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = window.RUGATHA_FIREBASE_CONFIG || null;
const firebaseDisabled =
  window.RUGATHA_FEATURE_FLAGS && window.RUGATHA_FEATURE_FLAGS.firebaseEnabled === false;

const resolveAchievementUrls = () => {
  const origin = window.location.origin || "";
  const candidates = [];
  if (window.RUGATHA_BASE_URL) {
    try {
      candidates.push(new URL("member/achievements.csv", window.RUGATHA_BASE_URL).href);
    } catch (error) {}
  }
  if (window.RUGATHA_CAMPAIGNS_BASE) {
    try {
      const base = new URL("../", window.RUGATHA_CAMPAIGNS_BASE).href;
      candidates.push(new URL("member/achievements.csv", base).href);
    } catch (error) {}
  }
  const path = window.location.pathname || "";
  const idx = path.indexOf("/campaigns/");
  if (idx >= 0 && origin) {
    const basePath = `${origin}${path.slice(0, idx)}/`;
    candidates.push(new URL("member/achievements.csv", basePath).href);
  }
  if (origin) {
    candidates.push(`${origin}/member/achievements.csv`);
    candidates.push(`${origin}/web/member/achievements.csv`);
  }
  return Array.from(new Set(candidates));
};
const ACHIEVEMENTS_CSV_URLS = resolveAchievementUrls();
const ACHIEVEMENT_CODE = "ach_RTP";
const PENDING_KEY = "rugatha-achievement-rtp";
const PENDING_TTL_MS = 5 * 60 * 1000;

let db = null;
let currentUser = null;
let achievementData = null;
let achievementLoadPromise = null;
let pendingAward = false;

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

const loadAchievementData = async () => {
  if (achievementLoadPromise) return achievementLoadPromise;
  achievementLoadPromise = (async () => {
    try {
          let response = null;
          for (const url of ACHIEVEMENTS_CSV_URLS) {
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
      const target = rows.slice(1).find((row) => row[0] === ACHIEVEMENT_CODE);
      if (!target) return null;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = target[index] ?? "";
      });
      achievementData = {
        achievement: ACHIEVEMENT_CODE,
        flavorZh: record.flavorZh || "",
        flavorEn: record.flavorEn || "",
        rewards: {
          BadgeSTR: Number(record.STR || 0),
          BadgeDEX: Number(record.DEX || 0),
          BadgeCON: Number(record.CON || 0),
          BadgeINT: Number(record.INT || 0),
          BadgeWIS: Number(record.WIS || 0),
          BadgeCHA: Number(record.CHA || 0)
        }
      };
      return achievementData;
    } catch (error) {
      console.error("Failed to load achievement data", error);
      return null;
    }
  })();
  return achievementLoadPromise;
};

const showAchievementToast = (flavorZh, flavorEn) => {
  if (!flavorZh && !flavorEn) return;
  if (!document.body) return;
  const styleId = "rugatha-achievement-toast-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .achievement-toast-wrap {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9999;
        display: grid;
        gap: 10px;
        pointer-events: none;
      }
      .achievement-toast {
        min-width: 220px;
        max-width: 320px;
        background: rgba(10, 16, 20, 0.92);
        color: #f4f7f3;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 14px;
        padding: 12px 14px;
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.35);
        display: grid;
        gap: 6px;
        font-size: 0.85rem;
        line-height: 1.4;
        animation: toast-in 200ms ease-out;
      }
      .achievement-toast .toast-title {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.18em;
        color: rgba(27, 42, 38, 0.7);
      }
      @keyframes toast-in {
        from { transform: translateY(6px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  let wrap = document.querySelector(".achievement-toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "achievement-toast-wrap";
    document.body.appendChild(wrap);
  }
  const toast = document.createElement("div");
  toast.className = "achievement-toast";
  const title = document.createElement("div");
  title.className = "toast-title";
  title.textContent = "89e3939662105c31Ff1a";
  toast.appendChild(title);
  if (flavorZh) {
    const zh = document.createElement("div");
    zh.textContent = flavorZh;
    toast.appendChild(zh);
  }
  if (flavorEn) {
    const en = document.createElement("div");
    en.textContent = flavorEn;
    toast.appendChild(en);
  }
  wrap.appendChild(toast);
  window.setTimeout(() => {
    toast.remove();
    if (wrap && !wrap.children.length) {
      wrap.remove();
    }
  }, 4500);
};

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
    console.warn("Failed to resolve member id", error);
  }
  return defaultId;
};

const awardAchievement = async () => {
  if (!currentUser || !db) return;
  const achievement = await loadAchievementData();
  if (!achievement) return;
  const memberId = await resolveMemberId(currentUser);
  if (!memberId) return;
  const memberRef = ref(db, `members/${memberId}`);
  let awarded = false;
  try {
    const result = await runTransaction(memberRef, (current) => {
      const existing = current || {};
      const existingAchievements = existing.achievements || {};
      if (existingAchievements[achievement.achievement]) {
        return existing;
      }
      awarded = true;
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
    if (result.committed && awarded) {
      showAchievementToast(achievement.flavorZh, achievement.flavorEn);
    }
  } catch (error) {
    console.error("Failed to award achievement", error);
  }
};

const tryAward = () => {
  if (!pendingAward) return;
  if (!currentUser || !db) return;
  pendingAward = false;
  awardAchievement();
};

const requestAward = () => {
  pendingAward = true;
  tryAward();
};

const setupChapterNavTracking = () => {
  const selector = ".chapter-nav__item--prev, .chapter-nav__item--next, .chapter-nav__link";
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      if (!target) return;
      try {
        localStorage.setItem(PENDING_KEY, String(Date.now()));
      } catch (error) {}
      requestAward();
    },
    { capture: true, passive: true }
  );
};

const consumePendingAward = () => {
  let stored = null;
  try {
    stored = localStorage.getItem(PENDING_KEY);
  } catch (error) {
    return;
  }
  if (!stored) return;
  let timestamp = Number(stored);
  if (!Number.isFinite(timestamp)) {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch (error) {}
    return;
  }
  const now = Date.now();
  if (now - timestamp <= PENDING_TTL_MS) {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch (error) {}
    requestAward();
  } else {
    try {
      localStorage.removeItem(PENDING_KEY);
    } catch (error) {}
  }
};

if (!firebaseDisabled && firebaseConfig) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getDatabase(app);
  const auth = getAuth(app);
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    tryAward();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupChapterNavTracking);
} else {
  setupChapterNavTracking();
}

consumePendingAward();
