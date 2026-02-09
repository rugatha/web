import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase, ref, get, set, runTransaction } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const qaRoot = document.querySelector("[data-qa]");
if (qaRoot) window.qaRoot = qaRoot;

const qaDisabled = Boolean(
  window.RUGATHA_FEATURE_FLAGS && window.RUGATHA_FEATURE_FLAGS.qaFateEnabled === false
);

if (qaRoot && qaDisabled) {
  qaRoot.hidden = true;
}

if (qaRoot && !qaDisabled) {
  const qaSource = qaRoot.getAttribute("data-qa-src");
  const qaId = qaRoot.getAttribute("data-qa-id");
  const questionEl = qaRoot.querySelector("[data-qa-question]");
  const choiceButtons = Array.from(qaRoot.querySelectorAll(".qa-choice"));
  const choiceTextEls = Array.from(qaRoot.querySelectorAll("[data-qa-choice]"));
  const percentTextEls = Array.from(qaRoot.querySelectorAll("[data-qa-percent]"));
  const resultTextEls = Array.from(qaRoot.querySelectorAll("[data-qa-result]"));
  const firebaseConfig = window.RUGATHA_FIREBASE_CONFIG || null;

  let db = null;
  let authUid = "";
  let memberNo = "";
  let questionPage = qaRoot.getAttribute("data-qa-page") || "";
  let lastLoggedChoice = "";
  const isViolentQa = (qaId || "").toLowerCase() === "dr_vaxon";
  const ACHIEVEMENTS_CSV_PATH = "../../../member/achievements.csv";
  const ACHIEVEMENT_CODES = {
    anyChoice: "ach_EO",
    manyChoices: "ach_PU",
    drVaxon: "ach_NbtL"
  };
  const achievementCache = {};
  let achievementLoadPromise = null;
  const getCorruptLabel = () =>
    document.documentElement?.getAttribute("data-lang") === "en" ? "Data Corrupted" : "資料損毀";
  const applyViolentPortrait = () => {
    const portrait = document.getElementById("npc-portrait");
    if (!portrait) return;
    portrait.src = "../../individual_pics/Dr. Vaxon Lich.png";
    portrait.alt = "Dr. Vaxon Lich";
  };

  const encodeKey = (value) =>
    `${value || ""}`.replace(/%/g, "%25").replace(/\//g, "%2F").replace(/\./g, "%2E");

  const setButtonState = (choice) => {
    choiceButtons.forEach((btn) => {
      const isSelected = btn.dataset.choice === choice;
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
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

  const loadAchievementData = async (code) => {
    if (achievementCache[code]) return achievementCache[code];
    if (!achievementLoadPromise) {
      achievementLoadPromise = fetch(ACHIEVEMENTS_CSV_PATH, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load achievements CSV: ${response.status}`);
          }
          return response.text();
        })
        .then((text) => parseCsv(text));
    }
    try {
      const rows = await achievementLoadPromise;
      if (!rows.length) return null;
      const headers = rows[0].map((header) => String(header || "").trim());
      const target = rows.slice(1).find((row) => row[0] === code);
      if (!target) return null;
      const record = {};
      headers.forEach((header, index) => {
        record[header] = target[index] ?? "";
      });
      const data = {
        achievement: code,
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
      achievementCache[code] = data;
      return data;
    } catch (error) {
      console.warn("Failed to load achievement data", error);
      return null;
    }
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
          background: rgba(248, 250, 252, 0.95);
          color: #1b2a26;
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
    title.textContent = "解鎖成就：";
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

  const resolveMemberIdForAchievement = async () => {
    if (!db || !authUid) return null;
    try {
      const snapshot = await get(ref(db, `members/${authUid}`));
      if (snapshot.exists()) {
        const data = snapshot.val() || {};
        return data.memberId || authUid;
      }
    } catch (error) {
      console.warn("Failed to resolve member id for achievement", error);
    }
    return authUid || null;
  };

  const awardAchievementByCode = async (code) => {
    if (!db || !authUid) return;
    const achievement = await loadAchievementData(code);
    if (!achievement) return;
    const memberId = await resolveMemberIdForAchievement();
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
      console.warn("Failed to award achievement", error);
    }
  };

  const evaluateChoiceAchievements = async () => {
    await awardAchievementByCode(ACHIEVEMENT_CODES.anyChoice);
    if (isViolentQa) {
      await awardAchievementByCode(ACHIEVEMENT_CODES.drVaxon);
    }
    const memberKey = memberNo || authUid;
    if (!memberKey) return;
    try {
      const snapshot = await get(ref(db, `qa_choices/${memberKey}`));
      if (!snapshot.exists()) return;
      let count = 0;
      snapshot.forEach(() => {
        count += 1;
      });
      if (count > 20) {
        await awardAchievementByCode(ACHIEVEMENT_CODES.manyChoices);
      }
    } catch (error) {
      console.warn("Failed to evaluate choice achievements", error);
    }
  };

  const revealResults = (choice) => {
    qaRoot.dataset.choice = choice;
    qaRoot.classList.add("is-revealed");
    qaRoot.classList.add("show-stats");
    if (isViolentQa) {
      qaRoot.classList.add("qa--violent");
      applyViolentPortrait();
      window.dispatchEvent(new CustomEvent("qa:violent", { detail: { enabled: true } }));
    }
    if (isViolentQa) {
      percentTextEls.forEach((el) => {
        el.textContent = getCorruptLabel();
      });
    }
    setButtonState(choice);
  };

  const setChoiceLocked = (locked) => {
    qaRoot.dataset.locked = locked ? "true" : "false";
    choiceButtons.forEach((btn) => {
      btn.disabled = Boolean(locked);
    });
  };

  const bindChoices = () => {
    choiceButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (qaRoot.dataset.locked === "true") return;
        const choice = btn.dataset.choice;
        if (!choice) return;
        revealResults(choice);
        logChoice(choice);
        setChoiceLocked(true);
      });
    });
  };

  const getQaPayload = (record) => {
    if (!record || typeof record !== "object") return null;
    const lang = document.documentElement?.getAttribute("data-lang") === "en" ? "en" : "zh";
    if (lang === "en") return record.qaEn || record.qa || record;
    return record.qaZh || record.qa || record;
  };

  const populate = (data) => {
    if (!data || typeof data !== "object") return false;
    if (questionEl) questionEl.textContent = data.Q || "";
    choiceTextEls.forEach((slotEl) => {
      const slot = slotEl.dataset.qaChoice;
      if (!slot) return;
      slotEl.textContent = data[slot === "1" ? "C1" : "C2"] || "";
    });
    resultTextEls.forEach((slotEl) => {
      const slot = slotEl.dataset.qaResult;
      if (!slot) return;
      slotEl.textContent = data[slot === "1" ? "R1" : "R2"] || "";
    });
    return Boolean(data.Q && data.C1 && data.C2 && data.R1 && data.R2);
  };

  const normalizeKey = (value) =>
    `${value || ""}`.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const resolveQaFromCharacters = (characters) => {
    if (!Array.isArray(characters)) return null;
    const targetId = normalizeKey(qaId);
    const pagePath = `${questionPage || window.location.pathname || ""}`.replace(/^\/+/, "");
    return (
      characters.find((entry) => targetId && normalizeKey(entry.id) === targetId) ||
      characters.find((entry) => entry.url && pagePath.endsWith(`${entry.url}`)) ||
      null
    );
  };

  const loadQa = async () => {
    if (!qaSource) return false;
    try {
      const response = await fetch(qaSource, { cache: "no-store" });
      if (!response.ok) return false;
      const json = await response.json();
      const resolved = Array.isArray(json) ? resolveQaFromCharacters(json) : json;
      if (!resolved) return false;
      if (!questionPage && resolved.url) {
        questionPage = resolved.url;
      }
      return populate(getQaPayload(resolved));
    } catch (err) {
      return false;
    }
  };

  window.addEventListener("qa:reload", () => {
    loadQa();
    if (isViolentQa) {
      percentTextEls.forEach((el) => {
        el.textContent = getCorruptLabel();
      });
      if (qaRoot.classList.contains("is-revealed") || qaRoot.dataset.locked === "true") {
        applyViolentPortrait();
        window.dispatchEvent(new CustomEvent("qa:violent", { detail: { enabled: true } }));
      }
    }
  });

  const updatePercentText = (slot, value) => {
    const el = percentTextEls.find((node) => node.dataset.qaPercent === slot);
    if (!el) return;
    if (isViolentQa) {
      el.textContent = getCorruptLabel();
      return;
    }
    el.textContent = `${value}%`;
  };

  const loadChoiceStats = async () => {
    if (!db || !questionPage) return;
    try {
      const snapshot = await get(ref(db, "qa_choices"));
      let count1 = 0;
      let count2 = 0;
      if (snapshot.exists()) {
        snapshot.forEach((memberSnap) => {
          const memberEntries = memberSnap.val();
          if (!memberEntries || typeof memberEntries !== "object") return;
          Object.values(memberEntries).forEach((value) => {
            if (!value || value.questionPage !== questionPage) return;
            if (value.choice === "C1") count1 += 1;
            if (value.choice === "C2") count2 += 1;
          });
        });
      }
      const total = count1 + count2;
      const percent1 = total ? Math.round((count1 / total) * 100) : 0;
      const percent2 = total ? Math.round((count2 / total) * 100) : 0;
      updatePercentText("1", percent1);
      updatePercentText("2", percent2);
    } catch (error) {
      console.warn("Failed to load QA stats", error);
    }
  };

  const ensureFirebase = () => {
    if (!firebaseConfig) return;
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    db = getDatabase(app);
    const auth = getAuth(app);
    onAuthStateChanged(auth, async (user) => {
      memberNo = "";
      authUid = user?.uid || "";
      if (!user || !db) return;
      try {
        const snapshot = await get(ref(db, `members/${user.uid}/memberNo`));
        if (snapshot.exists()) {
          memberNo = `${snapshot.val()}`.trim();
        }
      } catch (error) {
        console.warn("Failed to load memberNo", error);
      }
      loadSavedChoice();
    });
    loadChoiceStats();
  };

  const loadSavedChoice = async () => {
    if (!db || !questionPage) return;
    const memberKey = memberNo || authUid;
    if (!memberKey) return;
    try {
      const pageKey = encodeKey(questionPage);
      const snapshot = await get(ref(db, `qa_choices/${memberKey}/${pageKey}`));
      if (!snapshot.exists()) return;
      const value = snapshot.val();
      const choice = value && value.choice;
      if (choice === "C1" || choice === "C2") {
        lastLoggedChoice = choice;
        revealResults(choice === "C1" ? "1" : "2");
        setChoiceLocked(true);
        if (isViolentQa) {
          applyViolentPortrait();
          window.dispatchEvent(new CustomEvent("qa:violent", { detail: { enabled: true } }));
        }
      }
    } catch (error) {
      console.warn("Failed to load saved QA choice", error);
    }
  };

  const logChoice = async (choice) => {
    if (!db || !choice) return;
    const memberKey = memberNo || authUid;
    if (!memberKey) {
      console.warn("Missing member key; QA choice not recorded.");
      return;
    }
    const choiceValue = `C${choice}`;
    if (lastLoggedChoice === choiceValue) return;
    lastLoggedChoice = choiceValue;
    const payload = {
      memberNo: memberNo || "",
      questionPage: questionPage || `${window.location.pathname || ""}`.replace(/^\/+/, ""),
      choice: choiceValue
    };
    try {
      const pageKey = encodeKey(payload.questionPage);
      const entryRef = ref(db, `qa_choices/${memberKey}/${pageKey}`);
      await set(entryRef, payload);
      loadChoiceStats();
      evaluateChoiceAchievements();
    } catch (error) {
      console.warn("Failed to log QA choice", error);
    }
  };

  loadQa().then((loaded) => {
    if (!loaded) {
      qaRoot.hidden = true;
      return;
    }
    ensureFirebase();
    bindChoices();
    loadSavedChoice();
  });
}
