(() => {
  const root = document.querySelector("[data-pc-name]");
  if (!root) return;

  const targetPcName = String(root.dataset.pcName || "").trim();
  const state = {
    lang: "zh",
    pc: null,
    appearances: []
  };

  const i18n = {
    pageEyebrow: { zh: "玩家角色", en: "Player Character" },
    race: { zh: "種族", en: "Race" },
    role: { zh: "職業", en: "Class" },
    appearances: { zh: "登場故事弧與章節", en: "Story Arcs and Chapters" },
    noAppearances: { zh: "目前尚未整理到章節登場紀錄。", en: "No chapter appearances have been indexed yet." },
    loadFailed: { zh: "資料載入失敗。", en: "Failed to load data." },
    back: { zh: "返回角色總覽", en: "Back to PC Index" },
    previousView: { zh: "返回上一頁", en: "Back to Previous View" }
  };

  const familyBaseMap = {
    brown: "rugatha-brown",
    legends: "rugatha-legends",
    lite: "rugatha-lite",
    plus: "rugatha-plus",
    rugatha: "rugatha",
    wilds: "rugatha-wilds"
  };

  const normalizePcKey = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");

  const slugify = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const getStoredLanguage = () => {
    try {
      const stored = localStorage.getItem("npc-lang");
      if (stored === "zh" || stored === "en") return stored;
    } catch (_) {
      // ignore storage errors
    }
    return "zh";
  };

  const parseCsv = (text) => {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((cell) => cell.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((cell) => cell.trim());
      return headers.reduce((entry, header, index) => {
        entry[header] = values[index] || "";
        return entry;
      }, {});
    });
  };

  const resolvePortraitCandidates = (name) => [
    `../portrait/${name}.jpg`,
    `../portrait/${name}.jpeg`,
    `../portrait/${name}.png`,
    `../pics/${name}.jpg`,
    `../pics/${name}.jpeg`,
    `../pics/${name}.png`
  ];

  const resolveChapterUrl = (chapterId) => {
    const parts = String(chapterId || "").split("-");
    if (parts.length < 3) return null;
    const family = parts[0];
    const arcId = `${parts[0]}-${parts[1]}`;
    const chapterMatch = String(chapterId).match(/chpt\d+/i);
    const familyBase = familyBaseMap[family];
    if (!chapterMatch || !familyBase) return null;
    return `../../campaigns/pages/${familyBase}/${arcId}/${chapterMatch[0].toLowerCase()}.html`;
  };

  const getArcTitle = (arc, lang) => {
    if (!arc) return "";
    return (arc[lang] || arc.zh || arc.en || "").trim();
  };

  const getChapterTitle = (chapter, lang, chapterId) => {
    if (!chapter) return chapterId;
    return (chapter[lang] || chapter.zh || chapter.en || chapterId || "").trim();
  };

  const setLanguage = (nextLang) => {
    state.lang = nextLang === "en" ? "en" : "zh";
    try {
      localStorage.setItem("npc-lang", state.lang);
    } catch (_) {
      // ignore storage errors
    }
    document.documentElement.lang = state.lang === "en" ? "en" : "zh-Hant";
    render();
  };

  const renderPortrait = (pc) => {
    const wrap = document.getElementById("portrait");
    wrap.innerHTML = "";
    wrap.classList.remove("is-empty");

    const link = document.createElement("a");
    link.className = "portrait__link";
    link.href = "../../..";
    link.setAttribute("aria-label", "Rugatha Home");

    const inner = document.createElement("span");
    inner.className = "portrait__inner";
    link.appendChild(inner);

    const front = document.createElement("span");
    front.className = "portrait__face portrait__face--front";
    inner.appendChild(front);

    const back = document.createElement("span");
    back.className = "portrait__face portrait__face--back";
    inner.appendChild(back);

    const candidates = resolvePortraitCandidates(pc.name_en);
    const img = document.createElement("img");
    img.alt = pc.name_en;
    let index = 0;
    img.src = candidates[index];
    img.addEventListener("error", () => {
      index += 1;
      if (index < candidates.length) {
        img.src = candidates[index];
        return;
      }
      wrap.classList.add("is-empty");
      front.innerHTML = "";
    });
    front.appendChild(img);

    const logo = document.createElement("img");
    logo.src = "../../assets/rugatha-icon.png";
    logo.alt = "Rugatha";
    back.appendChild(logo);

    wrap.appendChild(link);
  };

  const renderAppearances = () => {
    const lang = state.lang;
    const list = document.getElementById("appearance-list");
    const sectionTitle = document.getElementById("appearances-title");
    sectionTitle.textContent = i18n.appearances[lang];
    list.innerHTML = "";

    if (!state.appearances.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = i18n.noAppearances[lang];
      list.appendChild(empty);
      return;
    }

    state.appearances.forEach((arcEntry) => {
      const card = document.createElement("article");
      card.className = "arc-card";

      const heading = document.createElement("h3");
      heading.className = "arc-title";
      const headingLink = document.createElement("a");
      headingLink.href = arcEntry.arcUrl || "#";
      headingLink.textContent = getArcTitle(arcEntry.arcTitle, lang) || arcEntry.arcId;
      heading.appendChild(headingLink);
      card.appendChild(heading);

      const chapters = document.createElement("ol");
      chapters.className = "chapter-list";
      arcEntry.chapters.forEach((chapter) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = chapter.url || "#";
        link.textContent = getChapterTitle(chapter.title, lang, chapter.id);
        item.appendChild(link);
        chapters.appendChild(item);
      });
      card.appendChild(chapters);

      list.appendChild(card);
    });
  };

  const render = () => {
    const lang = state.lang;
    const pc = state.pc;
    if (!pc) return;

    document.title = `${pc.name_en} | Rugatha PC`;
    document.getElementById("page-eyebrow").textContent = i18n.pageEyebrow[lang];
    document.getElementById("page-title").textContent = lang === "en" ? pc.name_en : pc.name_zh || pc.name_en;
    document.getElementById("page-subtitle").textContent = "";
    document.getElementById("race-label").textContent = i18n.race[lang];
    document.getElementById("role-label").textContent = i18n.role[lang];
    document.getElementById("race-value").textContent = lang === "en"
      ? (pc.race_en || pc.race_zh || "")
      : (pc.race_zh || pc.race_en || "");
    document.getElementById("role-value").textContent = lang === "en"
      ? (pc.class_en || pc.class_zh || "")
      : (pc.class_zh || pc.class_en || "");
    document.getElementById("back-link").textContent = i18n.back[lang];
    const prevLabel = document.getElementById("previous-view-label");
    if (prevLabel) prevLabel.textContent = i18n.previousView[lang];

    document.querySelectorAll("[data-lang]").forEach((button) => {
      const active = button.dataset.lang === lang;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    renderAppearances();
  };

  const renderError = (message) => {
    const app = document.getElementById("app");
    app.innerHTML = `<div class="error">${message}</div>`;
  };

  const init = async () => {
    state.lang = getStoredLanguage();

    const app = document.getElementById("app");
    if (app && !document.querySelector(".page-return")) {
      const wrap = document.createElement("div");
      wrap.className = "page-return";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "page-return__button";
      button.innerHTML = '<span class="page-return__icon" aria-hidden="true">←</span><span id="previous-view-label">返回上一頁</span>';
      button.addEventListener("click", () => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = "../index.html";
      });

      wrap.appendChild(button);
      app.appendChild(wrap);
    }

    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => setLanguage(button.dataset.lang));
    });

    try {
      const [pcRes, pcsRes, navRes, arcRes, chapterRes] = await Promise.all([
        fetch("../pc_lib", { cache: "no-cache" }),
        fetch("../../campaigns/pages/pcs.json", { cache: "no-cache" }),
        fetch("../../campaigns/data/chapter-nav.json", { cache: "no-cache" }),
        fetch("../../campaigns/data/story-arc-titles.json", { cache: "no-cache" }),
        fetch("../../campaigns/data/chapter-titles.json", { cache: "no-cache" })
      ]);

      if (!pcRes.ok || !pcsRes.ok || !navRes.ok || !arcRes.ok || !chapterRes.ok) {
        throw new Error(i18n.loadFailed[state.lang]);
      }

      const [pcCsv, pcsJson, chapterNav, arcTitles, chapterTitles] = await Promise.all([
        pcRes.text(),
        pcsRes.json(),
        navRes.json(),
        arcRes.json(),
        chapterRes.json()
      ]);

      const pcs = parseCsv(pcCsv);
      const pc = pcs.find((entry) => normalizePcKey(entry.name_en) === normalizePcKey(targetPcName));
      if (!pc) {
        throw new Error(`PC not found: ${targetPcName}`);
      }

      const pcMap = (pcsJson && pcsJson.pcs) || {};
      const chapterOrder = Object.keys(chapterNav || {}).reduce((acc, key, index) => {
        acc[key] = index;
        return acc;
      }, {});

      const appearanceChapters = Object.entries(pcMap)
        .filter(([, names]) => Array.isArray(names) && names.some((name) => normalizePcKey(name) === normalizePcKey(targetPcName)))
        .map(([chapterId]) => chapterId)
        .sort((a, b) => (chapterOrder[a] ?? Number.MAX_SAFE_INTEGER) - (chapterOrder[b] ?? Number.MAX_SAFE_INTEGER));

      const grouped = [];
      const byArc = new Map();

      appearanceChapters.forEach((chapterId) => {
        const navEntry = chapterNav[chapterId] || {};
        const arcInfo = navEntry["story-arc"] || {};
        const arcId = arcInfo.id || chapterId.split("-").slice(0, 2).join("-");
        if (!byArc.has(arcId)) {
          const group = {
            arcId,
            arcUrl: arcInfo.url ? `../..${arcInfo.url}` : null,
            arcTitle: arcTitles[arcId] || null,
            chapters: []
          };
          byArc.set(arcId, group);
          grouped.push(group);
        }
        byArc.get(arcId).chapters.push({
          id: chapterId,
          url: resolveChapterUrl(chapterId),
          title: chapterTitles[chapterId] || null
        });
      });

      state.pc = pc;
      state.appearances = grouped;
      renderPortrait(pc);
      render();
    } catch (error) {
      renderError(error && error.message ? error.message : i18n.loadFailed[state.lang]);
    }
  };

  init();
})();
