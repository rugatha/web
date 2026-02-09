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

const ACHIEVEMENTS_CSV_PATH = "../../../member/achievements.csv";
const ACHIEVEMENT_CODE = "ach_DB";

let db = null;
let currentUser = null;
let achievementData = null;
let achievementLoadPromise = null;

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

const normalizeText = (value) =>
  `${value || ""}`.toLowerCase().replace(/\s+/g, "").trim();

const loadAchievementData = async () => {
  if (achievementLoadPromise) return achievementLoadPromise;
  achievementLoadPromise = (async () => {
    try {
      const response = await fetch(ACHIEVEMENTS_CSV_PATH, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load achievements CSV: ${response.status}`);
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

const checkReligionMatch = async () => {
  if (!currentUser || !db) return;
  const memberId = await resolveMemberId(currentUser);
  if (!memberId) return;
  let religionValue = "";
  try {
    const snapshot = await get(ref(db, `members/${memberId}/religion`));
    if (snapshot.exists()) {
      religionValue = `${snapshot.val() || ""}`.trim();
    }
  } catch (error) {
    console.warn("Failed to load member religion", error);
    return;
  }
  if (!religionValue) return;
  const deityName = window.faithDeityName || "";
  if (!deityName) return;
  const normalizedReligion = normalizeText(religionValue);
  if (normalizedReligion.includes(normalizeText(deityName))) {
    awardAchievement();
  }
};

if (!firebaseDisabled && firebaseConfig) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getDatabase(app);
  const auth = getAuth(app);
  onAuthStateChanged(auth, (user) => {
    currentUser = user || null;
    if (currentUser) {
      checkReligionMatch();
    }
  });
}
