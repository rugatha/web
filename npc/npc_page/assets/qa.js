import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const qaRoot = document.querySelector("[data-qa]");

if (qaRoot) {
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

  const encodeKey = (value) =>
    `${value || ""}`.replace(/%/g, "%25").replace(/\//g, "%2F").replace(/\./g, "%2E");

  const setButtonState = (choice) => {
    choiceButtons.forEach((btn) => {
      const isSelected = btn.dataset.choice === choice;
      btn.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });
  };

  const revealResults = (choice) => {
    qaRoot.dataset.choice = choice;
    qaRoot.classList.add("is-revealed");
    qaRoot.classList.add("show-stats");
    setButtonState(choice);
  };

  const bindChoices = () => {
    choiceButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.dataset.choice;
        if (!choice) return;
        revealResults(choice);
        logChoice(choice);
      });
    });
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
      return populate(resolved.qa || resolved);
    } catch (err) {
      return false;
    }
  };

  const updatePercentText = (slot, value) => {
    const el = percentTextEls.find((node) => node.dataset.qaPercent === slot);
    if (!el) return;
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
    });
    loadChoiceStats();
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
  });
}
