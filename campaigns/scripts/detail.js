(() => {
  const campaigns =
    window.RUGATHA_CONFIG && Array.isArray(window.RUGATHA_CONFIG.campaigns)
      ? window.RUGATHA_CONFIG.campaigns
      : [];
  const graphData =
    (window.RUGATHA_CONFIG &&
      window.RUGATHA_CONFIG.graph &&
      Array.isArray(window.RUGATHA_CONFIG.graph.data) &&
      window.RUGATHA_CONFIG.graph.data) ||
    window.CAMPAIGN_GRAPH_DATA ||
    [];

  const campaignsBaseFromConfig = typeof window.RUGATHA_CAMPAIGNS_BASE === "string" ? window.RUGATHA_CAMPAIGNS_BASE : null;
  const buildCampaignsBase = () => {
    const path = window.location && window.location.pathname ? window.location.pathname : "";
    const idx = path.indexOf("/campaigns/");
    if (idx >= 0) {
      const origin =
        (window.location && window.location.origin && window.location.origin !== "null"
          ? window.location.origin
          : "file://") || "";
      return `${origin}${path.slice(0, idx + "/campaigns/".length)}`;
    }
    return window.location && window.location.origin ? window.location.origin : "/";
  };
  const campaignsBase = campaignsBaseFromConfig || buildCampaignsBase();
  const withTrailingSlash = (value) => (value.endsWith("/") ? value : `${value}/`);
  const campaignBannerBase = `${withTrailingSlash(campaignsBase)}campaign-banners/`;
  const chapterBannerBase = `${withTrailingSlash(campaignsBase)}chapter-banners/`;
  const resolvePath = (value) => {
    if (typeof value !== "string" || !value.length) return value;
    if (
      value.startsWith("./") ||
      value.startsWith("../") ||
      value.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
      value.startsWith("//")
    ) {
      return value;
    }
    const sanitized = value.replace(/^\//, "");
    const base = withTrailingSlash(campaignsBase);
    try {
      return new URL(sanitized, base).href;
    } catch (err) {
      return `${base}${sanitized}`;
    }
  };

  const pathParts = window.location.pathname.replace(/\/index\.html?$/, "").split("/").filter(Boolean);
  const pagesIdx = pathParts.indexOf("pages");
  const slugSegment = pagesIdx >= 0 ? pathParts[pagesIdx + 1] : "";
  const arcSegment = pagesIdx >= 0 ? pathParts[pagesIdx + 2] : "";
  const lastSegment = pathParts[pathParts.length - 1] || "";
  const isChapterPage = /^chpt/i.test(lastSegment);
  const isNestedPage = Boolean(slugSegment);
  const isArcPage = !isChapterPage && Boolean(arcSegment);
  const imageBannerBase = isArcPage || isNestedPage ? campaignBannerBase : campaignBannerBase;
  const chapterImageMap = {
    // Rugatha main
    "rugatha-c01": "rugatha-c01.jpg",
    "rugatha-c02": "rugatha-c02.jpg",
    "rugatha-c03": "rugatha-c03.jpg",
    "rugatha-c03-chpt01": "rugatha-c03-chpt01.png",
    "rugatha-c03-chpt02": "rugatha-c03-chpt02.png",
    "rugatha-c03-chpt03": "rugatha-c03-chpt03.png",
    "rugatha-c03-chpt04": "rugatha-c03-chpt04.png",
    "rugatha-c04": "rugatha-c04.jpg",
    "rugatha-c04-chpt01": "rugatha-c04-chpt01.png",
    "rugatha-c04-chpt02": "rugatha-c04-chpt02.png",
    "rugatha-c04-chpt03": "rugatha-c04-chpt03.png",
    "rugatha-c04-chpt04": "rugatha-c04-chpt04.png",
    "rugatha-c04-chpt05": "rugatha-c04-chpt05.jpeg",
    "rugatha-c05": "rugatha-c05.png",
    // Mattington shared variants
    "plus-c05-chpt02": "plus-c05-chpt02.png",
    "plus-c05-chpt03": "plus-c05-chpt03.png",
    "plus-c05-chpt04": "plus-c05-chpt04.png",
    "plus-c05-chpt05": "plus-c05-chpt05.png",
    "plus-c05": "plus-c05.jpg",
    "plus-c06-chpt01": "plus-c06-chpt01.png",
    "plus-c06-chpt02": "plus-c06-chpt02.png",
    "plus-c06-chpt03": "plus-c06-chpt03.png",
    "plus-c06-chpt04": "plus-c06-chpt04.png",
    "plus-c07-chpt01": "plus-c07-chpt01.jpeg",
    "plus-c07-chpt02": "plus-c07-chpt02.jpeg",
    "plus-c07-chpt03": "plus-c07-chpt03.png",
    "brown-c01": "brown-c01.jpg",
    "brown-c01-chpt01": "brown-c01-chpt01.png",
    "brown-c01-chpt02": "brown-c01-chpt02.png",
    "brown-c01-chpt03": "brown-c01-chpt03.png",
    "brown-c01-chpt04": "brown-c01-chpt04.png",
    "brown-c01-chpt05": "brown-c01-chpt05.png",
    "brown-c02": "brown-c02.png",
    "brown-c02-chpt01": "brown-c02-chpt01.png",
    "lite-c05": "lite-c05.jpg",
    "lite-c05-chpt02": "lite-c05-chpt02.png",
    "lite-c05-chpt03": "lite-c05-chpt03.png",
    "lite-c05-chpt04": "lite-c05-chpt04.png",
    "lite-c06-chpt01": "lite-c06-chpt01.png",
    "lite-c06-chpt02": "lite-c06-chpt02.png",
    "lite-c06-chpt03": "lite-c06-chpt03.png",
    "lite-c06-chpt04": "lite-c06-chpt04.png",
    "lite-c06-chpt05": "lite-c06-chpt05.png",
    "lite-c07-chpt01": "lite-c07-chpt01.png",
    "lite-c07-chpt02": "lite-c07-chpt02.png",
    "lite-c07-chpt03": "lite-c07-chpt03.png",
    "lite-c08-chpt01": "lite-c08-chpt01.jpg",
    "lite-c08-chpt02": "lite-c08-chpt02.png",
    "lite-c08-chpt03": "lite-c08-chpt03.png",
    "lite-c09-chpt01": "lite-c09-chpt01.png",
    "lite-c09-chpt02": "lite-c09-chpt02.png",
    "lite-c09-chpt03": "lite-c09-chpt03.png",
    "lite-c10-chpt01": "lite-c10-chpt01.png",
    "lite-c10-chpt02": "lite-c10-chpt02.jpeg",
    "lite-c10-chpt03": "lite-c10-chpt03.jpeg",
    "lite-c10-chpt04": "lite-c10-chpt04.jpeg",
    "lite-c11-chpt01": "lite-c11-chpt01.jpeg",
    "lite-c11-chpt02": "lite-c11-chpt02.jpeg",
    "lite-c11-chpt03": "lite-c11-chpt03.jpeg",
    "lite-c11-chpt04": "lite-c11-chpt04.jpeg",
    // Rugatha Plus
    "plus-c06": "plus-c06.jpg",
    "plus-c07": "plus-c07.png",
    // Rugatha lite
    "lite-c06": "lite-c06.jpg",
    "lite-c07": "lite-c07.jpg",
    "lite-c08": "lite-c08.png",
    "lite-c09": "lite-c09.jpg",
    "lite-c10": "lite-c10.png",
    "lite-c11": "lite-c11.png",
    "lite-c12": "lite-c12.png",
    // Rugatha WILDS
    "wilds-c01": "wilds-c01.jpg",
    "wilds-c01-chpt01": "wilds-c01-chpt01.png",
    "wilds-c01-chpt02": "wilds-c01-chpt02.png",
    "wilds-c01-chpt03": "wilds-c01-chpt03.png",
    "wilds-c02": "wilds-c02.png",
    "wilds-c02-chpt01": "wilds-c02-chpt01.png",
    "wilds-c02-chpt02": "wilds-c02-chpt02.png",
    "wilds-c02-chpt03": "wilds-c02-chpt03.png",
    "wilds-c03": "wilds-c03.png",
    "wilds-c03-chpt01": "wilds-c03-chpt01.png",
    "wilds-c03-chpt02": "wilds-c03-chpt02.jpeg",
    "wilds-c03-chpt03": "wilds-c03-chpt03.JPG",
    "wilds-c04": "wilds-c04.png",
    "wilds-c04-chpt01": "wilds-c04-chpt01.jpeg",
    "wilds-c04-chpt02": "wilds-c04-chpt02.jpeg",
    "wilds-c04-chpt03": "wilds-c04-chpt03.jpeg",
    "wilds-c04-chpt04": "wilds-c04-chpt04.jpeg",
    "wilds-c05": "wilds-c05.png",
    "wilds-c04-chpt01": "wilds-c04-chpt01.jpeg",
    // Rugatha Brown
    "brown-c01": "brown-c01.jpg",
    "brown-c02": "brown-c02.jpg",
    // Rugatha Legends
    "legends-os01": "legends-os01.jpg",
    "legends-os02": "legends-os02.jpg",
    "legends-os03": "legends-os03.jpg",
    "legends-os04": "legends-os04.jpg",
    "legends-os05": "legends-os05.jpg",
    "legends-os06": "legends-os06.jpg",
    "legends-os07": "legends-os07.jpg",
    "legends-os08": "legends-os08.png",
    "legends-os09": "legends-os09.png",
    "legends-os10": "legends-os10.png",
    "legends-os01-chpt01": "legends-os01-chpt01.jpg",
    "legends-os02-chpt01": "legends-os02-chpt01.jpg",
    "legends-os03-chpt01": "legends-os03-chpt01.jpg",
    "legends-os04-chpt01": "legends-os04-chpt01.jpg",
    "legends-os06-chpt01": "legends-os06-chpt01.jpg",
    "legends-os07-chpt01": "legends-os07-chpt01.jpg",
    "legends-os08-chpt01": "legends-os08.png",
    "legends-os09-chpt01": "legends-os09.png",
    "legends-os10-chpt01": "legends-os10.png",
    // Experience (optional, in case used)
    "exp-e01": "exp-e01.png",
    "exp-e02": "exp-e02.png"
  };

  const params = new URLSearchParams(window.location.search);
  const slugParam =
    (params.get("campaign") ||
      params.get("slug") ||
      (document.body.dataset.campaign || slugSegment || "")).toLowerCase();
  const arcBase = "./";

  const slugify = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const toRgba = (hex, alpha = 0.18) => {
    const normalized = hex.replace("#", "");
    const bigint = parseInt(
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const targetCampaign = campaigns.find((item) => slugify(item.name) === slugParam);
  const bodyArc = (document.body.dataset && document.body.dataset.arc) || "";
  const targetArc = isArcPage
    ? graphData.find(
        (node) =>
          node.level === 3 &&
          (node.id === arcSegment || (bodyArc && node.id === bodyArc))
      )
    : null;
  const target = targetArc || targetCampaign;
  const detail = document.querySelector("[data-role='campaign-detail']");
  const notFound = document.querySelector("[data-role='not-found']");
  const displayName =
    (target && (target.name || target.title || target.label)) ||
    (targetCampaign && targetCampaign.name) ||
    "Campaign";
  const displayTagline = (target && target.tagline) || (targetCampaign && targetCampaign.tagline);
  const displayDates = (target && target.dates) || (targetCampaign && targetCampaign.dates);
  const accent = (target && target.accent) || (targetCampaign && targetCampaign.accent) || "#7bdcb5";
  const i18n = {
    relatedPcTitle: { zh: "玩家角色", en: "Player Characters" },
    relatedGuestTitle: { zh: "客串玩家", en: "Guest Players" },
    relatedTitle: { zh: "登場NPC", en: "NPCs" },
    chaptersTitle: { zh: "章節", en: "Chapters" },
    storyArcBadge: { zh: "故事弧", en: "Story Arc" },
    pcMetaSeparator: { zh: "｜", en: " | " }
  };
  const languageState = {
    value: "zh",
    wrap: null
  };
  const relatedNpcState = {
    npcIds: null,
    charById: null,
    siteBase: null
  };
  const relatedPcState = {
    pcIds: null,
    charById: null,
    siteBase: null
  };
  const relatedGuestState = {
    pcIds: null,
    charById: null,
    siteBase: null
  };
  const currentChapterId = isChapterPage && arcSegment ? `${arcSegment}-${lastSegment.replace(/\.html?$/i, "").toLowerCase()}` : null;
  const currentArcId = (isArcPage && targetArc && targetArc.id) || bodyArc || arcSegment || null;
  const chapterTitleState = {
    map: null,
    fallbackTitle: ""
  };
  const arcTitleState = {
    map: null,
    fallbackTitle: "",
    fallbackTagline: ""
  };
  const chapterListState = {
    chapters: []
  };

  if (!target) {
    if (detail) detail.classList.add("is-hidden");
    if (notFound) notFound.classList.remove("is-hidden");
    document.title = "Campaign not found | Rugatha";
    console.warn("Campaign slug not found:", slugParam);
    return;
  }

  const getPreferredLanguage = () => {
    try {
      const stored = localStorage.getItem("npc-lang");
      if (stored === "zh" || stored === "en") return stored;
    } catch (_) {
      // ignore storage access errors
    }
    const docLang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    return docLang.startsWith("en") ? "en" : "zh";
  };

  const loadChapterTitleMap = async () => {
    if (window.__RUGATHA_CHAPTER_TITLE_MAP) return window.__RUGATHA_CHAPTER_TITLE_MAP;
    if (window.__RUGATHA_CHAPTER_TITLES_PROMISE) return window.__RUGATHA_CHAPTER_TITLES_PROMISE;
    const titlesUrl = new URL("data/chapter-titles.json", campaignsBase).href;
    window.__RUGATHA_CHAPTER_TITLES_PROMISE = fetch(titlesUrl, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const map = data && typeof data === "object" ? data : {};
        window.__RUGATHA_CHAPTER_TITLE_MAP = map;
        return map;
      })
      .catch((err) => {
        console.warn("Chapter title map unavailable:", err && err.message ? err.message : err);
        const empty = {};
        window.__RUGATHA_CHAPTER_TITLE_MAP = empty;
        return empty;
      });
    return window.__RUGATHA_CHAPTER_TITLES_PROMISE;
  };

  const loadStoryArcTitleMap = async () => {
    if (window.__RUGATHA_STORY_ARC_TITLE_MAP) return window.__RUGATHA_STORY_ARC_TITLE_MAP;
    if (window.__RUGATHA_STORY_ARC_TITLES_PROMISE) return window.__RUGATHA_STORY_ARC_TITLES_PROMISE;
    const titlesUrl = new URL("data/story-arc-titles.json", campaignsBase).href;
    window.__RUGATHA_STORY_ARC_TITLES_PROMISE = fetch(titlesUrl, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const map = data && typeof data === "object" ? data : {};
        window.__RUGATHA_STORY_ARC_TITLE_MAP = map;
        return map;
      })
      .catch((err) => {
        console.warn("Story arc title map unavailable:", err && err.message ? err.message : err);
        const empty = {};
        window.__RUGATHA_STORY_ARC_TITLE_MAP = empty;
        return empty;
      });
    return window.__RUGATHA_STORY_ARC_TITLES_PROMISE;
  };

  const getLocalizedChapterTitle = (chapterId, fallback) => {
    if (!chapterId) return fallback || "Chapter";
    const map = chapterTitleState.map || window.__RUGATHA_CHAPTER_TITLE_MAP || {};
    const entry = map[chapterId];
    if (entry && typeof entry === "object") {
      if (languageState.value === "en") {
        return entry.en || entry.zh || fallback || chapterId;
      }
      return entry.zh || entry.en || fallback || chapterId;
    }
    return fallback || chapterId;
  };

  const getLocalizedArcTitle = (arcId, fallback) => {
    if (!arcId) return fallback || "Story Arc";
    const map = arcTitleState.map || window.__RUGATHA_STORY_ARC_TITLE_MAP || {};
    const entry = map[arcId];
    if (entry && typeof entry === "object") {
      if (languageState.value === "en") {
        return entry.en || entry.zh || fallback || arcId;
      }
      return entry.zh || entry.en || fallback || arcId;
    }
    return fallback || arcId;
  };

  const updateChapterTitle = () => {
    if (!isChapterPage || !currentChapterId) return;
    const titleEl = document.querySelector(".campaign-detail.arc-detail .campaign-detail__title");
    if (titleEl && !chapterTitleState.fallbackTitle) {
      chapterTitleState.fallbackTitle = titleEl.textContent.trim();
    }
    const localizedTitle = getLocalizedChapterTitle(currentChapterId, chapterTitleState.fallbackTitle || displayName);
    if (titleEl && localizedTitle) {
      titleEl.textContent = localizedTitle;
    }
    if (localizedTitle) {
      document.title = `${localizedTitle} | Rugatha Campaign`;
    }
  };

  const updateArcTitle = () => {
    if (!isArcPage || !targetArc) return;
    const titleEl = document.querySelector(".campaign-detail.arc-detail .campaign-detail__title");
    if (titleEl && !arcTitleState.fallbackTitle) {
      arcTitleState.fallbackTitle = titleEl.textContent.trim();
    }
    const localizedTitle = getLocalizedArcTitle(
      targetArc.id,
      arcTitleState.fallbackTitle || displayName
    );
    if (titleEl && localizedTitle) {
      titleEl.textContent = localizedTitle;
    }
    if (localizedTitle) {
      document.title = `${localizedTitle} | Rugatha Campaign`;
    }
  };

  const updateChapterArcTagline = () => {
    if (!isChapterPage || !currentArcId) return;
    const taglineEl = document.querySelector(".campaign-detail.arc-detail .campaign-detail__tagline");
    if (!taglineEl) return;
    if (!arcTitleState.fallbackTagline) {
      arcTitleState.fallbackTagline = taglineEl.textContent.trim();
    }
    const localizedTagline = getLocalizedArcTitle(currentArcId, arcTitleState.fallbackTagline || displayTagline || currentArcId);
    if (localizedTagline) {
      taglineEl.textContent = localizedTagline;
    }
  };

  const updateArcChaptersHeading = () => {
    if (!isArcPage) return;
    const heading = document.querySelector(".campaign-detail__chapters h2");
    if (!heading) return;
    heading.textContent = i18n.chaptersTitle[languageState.value];
  };

  const updateStoryArcBadge = () => {
    if (!isArcPage) return;
    const badge = document.querySelector(".campaign-detail.arc-detail .campaign-detail__badge");
    if (!badge) return;
    badge.textContent = i18n.storyArcBadge[languageState.value];
  };

  const renderChapterList = () => {
    const chapterList = document.querySelector("[data-role='chapter-list']");
    if (!chapterList) return;

    const chaptersToRender = Array.isArray(chapterListState.chapters) ? chapterListState.chapters : [];
    chapterList.innerHTML = "";

    if (!chaptersToRender.length) {
      const li = document.createElement("li");
      li.textContent = "尚未有章節";
      chapterList.appendChild(li);
      return;
    }

    chaptersToRender.forEach((ch) => {
      const li = document.createElement("li");
      const meta = document.createElement("div");
      meta.className = "chapter-list__meta";
      const isLevel4 = ch.level === 4;
      const arcHref = isLevel4
        ? ch.url || `${arcBase}${ch.id}/`
        : ch.id === "rugatha-c05" && slugSegment === "rugatha-plus"
          ? "./plus-c05/"
          : ch.id === "rugatha-c05" && slugSegment === "rugatha-lite"
            ? "./lite-c05/"
            : ch.url || `./${ch.id}/`;
      const fallbackTitle = ch.title || ch.label || ch.id;
      const displayTitle = getLocalizedChapterTitle(ch.id, fallbackTitle);
      const title = document.createElement("a");
      title.href = resolvePath(arcHref);
      title.target = "_self";
      title.textContent = displayTitle;
      meta.appendChild(title);

      const imageName = isLevel4 ? ch.image : chapterImageMap[ch.id];
      li.appendChild(meta);
      if (imageName) {
        const imageLink = document.createElement("a");
        imageLink.href = resolvePath(arcHref);
        imageLink.target = "_self";
        const img = document.createElement("img");
        img.className = "chapter-list__image";
        const base = isLevel4 ? chapterBannerBase : imageBannerBase;
        const useSrc =
          typeof imageName === "string" && (imageName.startsWith("/") || imageName.startsWith("http"))
            ? resolvePath(imageName)
            : resolvePath(`${base}${imageName}`);
        img.src = useSrc;
        img.alt = `${displayTitle} banner`;
        imageLink.appendChild(img);
        li.appendChild(imageLink);
      }
      chapterList.appendChild(li);
    });
  };

  const updateLanguageToggle = () => {
    if (!languageState.wrap) return;
    const buttons = languageState.wrap.querySelectorAll(".language-toggle button");
    buttons.forEach((button) => {
      const isActive = button.dataset.lang === languageState.value;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const updateChapterContentLanguage = () => {
    const lang = languageState.value === "en" ? "en" : "zh";
    const articles = document.querySelectorAll(".campaign-detail:not(.arc-detail)");
    articles.forEach((article) => {
      const zhBlocks = article.querySelectorAll(":scope > .campaign-detail__content_zh");
      const enBlocks = article.querySelectorAll(":scope > .campaign-detail__content_en");
      zhBlocks.forEach((block) => {
        block.hidden = lang !== "zh";
      });
      enBlocks.forEach((block) => {
        block.hidden = lang !== "en";
      });
    });
  };

  const getNpcDisplayName = (meta) => {
    if (!meta) return "NPC";
    if (languageState.value === "en") {
      return meta.nameEn || meta.nameZh || meta.name || meta.id || "NPC";
    }
    return meta.nameZh || meta.nameEn || meta.name || meta.id || "NPC";
  };

  const normalizePcKey = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  const getPcDisplayName = (meta, fallbackId) => {
    if (languageState.value === "en") {
      return meta?.name_en || meta?.name_zh || fallbackId || "PC";
    }
    return meta?.name_zh || meta?.name_en || fallbackId || "PC";
  };

  const getPcMetaText = (meta) => {
    if (!meta) return "";
    const race = languageState.value === "en"
      ? meta.race_en || meta.race_zh || ""
      : meta.race_zh || meta.race_en || "";
    const role = languageState.value === "en"
      ? meta.class_en || meta.class_zh || ""
      : meta.class_zh || meta.class_en || "";
    if (race && role) return `${race}${i18n.pcMetaSeparator[languageState.value]}${role}`;
    return race || role || "";
  };

  const createPcSection = (title, ids, charById, siteBase, extraClassName) => {
    const section = document.createElement("section");
    section.className = `related-pcs${extraClassName ? ` ${extraClassName}` : ""}`;

    const heading = document.createElement("h2");
    heading.className = "related-pcs__title";
    heading.textContent = title;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "related-pcs__grid";
    section.appendChild(grid);

    const resolvePcImageCandidates = (value) => {
      if (!value) return [];
      const baseName = String(value).trim();
      if (!baseName) return [];
      return ["jpg", "jpeg", "png"].map((ext) =>
        new URL(`pc/pics/${baseName}.${ext}`, siteBase).href
      );
    };

    ids.forEach((id) => {
      const meta = charById[normalizePcKey(id)] || null;
      const card = document.createElement("a");
      card.className = "related-pcs__card";
      card.href = new URL(`pc/articles/${slugify(id)}.html`, siteBase).href;
      card.target = "_self";

      const body = document.createElement("div");
      body.className = "related-pcs__body";
      card.appendChild(body);

      const textWrap = document.createElement("div");
      textWrap.className = "related-pcs__text";
      body.appendChild(textWrap);

      const name = document.createElement("div");
      name.className = "related-pcs__name";
      name.textContent = getPcDisplayName(meta, id);
      textWrap.appendChild(name);

      const detailText = getPcMetaText(meta);
      if (detailText) {
        const detail = document.createElement("div");
        detail.className = "related-pcs__meta";
        detail.textContent = detailText;
        textWrap.appendChild(detail);
      }

      const imageWrap = document.createElement("div");
      imageWrap.className = "related-pcs__portrait";
      body.appendChild(imageWrap);

      const imageCandidates = resolvePcImageCandidates(id);
      if (imageCandidates.length) {
        const imgEl = document.createElement("img");
        imgEl.className = "related-pcs__portrait-image";
        imgEl.alt = getPcDisplayName(meta, id);
        imgEl.loading = "lazy";
        imgEl.decoding = "async";
        imgEl.src = imageCandidates[0];
        let candidateIndex = 0;
        imgEl.addEventListener("error", () => {
          candidateIndex += 1;
          if (candidateIndex < imageCandidates.length) {
            imgEl.src = imageCandidates[candidateIndex];
            return;
          }
          imageWrap.classList.add("is-empty");
          imgEl.remove();
        });
        imageWrap.appendChild(imgEl);
      }

      grid.appendChild(card);
    });

    return section;
  };

  const renderRelatedPcSection = () => {
    const container = document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    if (
      !container ||
      !Array.isArray(relatedPcState.pcIds) ||
      !relatedPcState.charById ||
      !relatedPcState.siteBase
    ) return;

    const existing = container.querySelector(".related-pcs--main");
    if (existing) existing.remove();

    const pcIds = relatedPcState.pcIds.filter(Boolean);
    if (!pcIds.length) return;

    const section = createPcSection(
      i18n.relatedPcTitle[languageState.value],
      pcIds,
      relatedPcState.charById,
      relatedPcState.siteBase,
      "related-pcs--main"
    );

    const guestSection = container.querySelector(".related-guests");
    const npcSection = container.querySelector(".related-npcs");
    const anchor = guestSection || npcSection;
    if (anchor && anchor.parentNode === container) {
      container.insertBefore(section, anchor);
      return;
    }
    container.appendChild(section);
  };

  const renderRelatedGuestSection = () => {
    const container = document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    if (
      !container ||
      !Array.isArray(relatedGuestState.pcIds) ||
      !relatedGuestState.charById ||
      !relatedGuestState.siteBase
    ) return;

    const existing = container.querySelector(".related-guests");
    if (existing) existing.remove();

    const guestIds = relatedGuestState.pcIds.filter(Boolean);
    if (!guestIds.length) return;

    const section = createPcSection(
      i18n.relatedGuestTitle[languageState.value],
      guestIds,
      relatedGuestState.charById,
      relatedGuestState.siteBase,
      "related-guests"
    );

    const npcSection = container.querySelector(".related-npcs");
    if (npcSection && npcSection.parentNode === container) {
      container.insertBefore(section, npcSection);
      return;
    }
    container.appendChild(section);
  };

  const renderRelatedNpcSection = () => {
    const container = document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    if (!container || !Array.isArray(relatedNpcState.npcIds) || !relatedNpcState.charById || !relatedNpcState.siteBase) return;

    const existing = container.querySelector(".related-npcs");
    if (existing) existing.remove();

    const section = document.createElement("section");
    section.className = "related-npcs";

    const heading = document.createElement("h2");
    heading.className = "related-npcs__title";
    heading.textContent = i18n.relatedTitle[languageState.value];
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "related-npcs__grid";
    section.appendChild(grid);

    const npcBase = new URL("npc/", relatedNpcState.siteBase).href;
    const resolveNpcUrl = (value) => {
      if (!value) return null;
      if (/^(https?:)?\/\//i.test(value)) return value;
      if (value.startsWith("/")) return new URL(value, relatedNpcState.siteBase).href;
      if (value.startsWith("npc/")) return new URL(value, relatedNpcState.siteBase).href;
      return new URL(value, npcBase).href;
    };

    relatedNpcState.npcIds.forEach((id) => {
      const meta = relatedNpcState.charById[id] || { id, nameEn: "", nameZh: "", name: id, url: null, image: null };
      const displayName = getNpcDisplayName(meta);
      const npcUrl = resolveNpcUrl(meta.url || "");
      const card = document.createElement(npcUrl ? "a" : "div");
      card.className = "related-npcs__card";
      if (npcUrl) {
        card.href = npcUrl;
        card.target = "_self";
      }

      if (meta.image) {
        const imgEl = document.createElement("img");
        imgEl.className = "related-npcs__image";
        imgEl.src = resolveNpcUrl(meta.image);
        imgEl.alt = displayName || "NPC portrait";
        card.appendChild(imgEl);
      }

      const name = document.createElement("div");
      name.className = "related-npcs__name";
      name.textContent = displayName;
      card.appendChild(name);

      grid.appendChild(card);
    });

    container.appendChild(section);
  };

  const applyLanguage = (lang) => {
    const next = lang === "en" ? "en" : "zh";
    languageState.value = next;
    window.__RUGATHA_CHAPTER_LANG = next;
    document.documentElement.setAttribute("data-lang", next);
    updateLanguageToggle();
    updateChapterTitle();
    updateArcTitle();
    updateChapterArcTagline();
    updateStoryArcBadge();
    updateArcChaptersHeading();
    updateChapterContentLanguage();
    renderChapterList();
    renderRelatedPcSection();
    renderRelatedGuestSection();
    renderRelatedNpcSection();
    window.dispatchEvent(new CustomEvent("rugatha:chapter-language-change", { detail: { lang: next } }));
    try {
      localStorage.setItem("npc-lang", next);
    } catch (_) {
      // ignore storage access errors
    }
  };

  const ensureLanguageToggle = () => {
    if (!isChapterPage && !isArcPage) return;
    const container = document.querySelector(".detail-canvas") || document.querySelector(".page");
    if (!container) return;

    let bar = container.querySelector(".chapter-language-toggle-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "chapter-language-toggle-bar";

      const wrap = document.createElement("div");
      wrap.className = "language-toggle";
      wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-label", "Language");

      const makeButton = (label, lang) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.lang = lang;
        button.textContent = label;
        button.addEventListener("click", () => applyLanguage(lang));
        return button;
      };

      wrap.appendChild(makeButton("中文", "zh"));
      wrap.appendChild(makeButton("English", "en"));
      bar.appendChild(wrap);
      container.insertBefore(bar, container.firstChild);
    }

    languageState.wrap = bar.querySelector(".language-toggle");
    updateLanguageToggle();
  };

  const setText = (role, value) => {
    const el = document.querySelector(`[data-role='${role}']`);
    if (el && value) {
      el.textContent = value;
    }
  };

  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-soft", toRgba(accent, 0.18));

  setText("title", displayName);
  setText("tagline", displayTagline);
  setText("dates", displayDates);

  const normalizeUrl = (value, base) => {
    if (!value) return null;
    try {
      return new URL(value, base || window.location.href).href;
    } catch (err) {
      return value;
    }
  };

  const img = document.querySelector("[data-role='campaign-image']");
  const heroImage = (target && target.image) || (targetCampaign && targetCampaign.image);
  if (img && heroImage) {
    img.src = heroImage;
    img.alt = `${displayName} campaign art`;
  }

  const renderRelatedNpcs = async () => {
    console.log("[NPC] init related NPC render");
    if (!isChapterPage && !arcSegment && !slugSegment) return;
    const chapterId = isChapterPage && arcSegment ? `${arcSegment}-${lastSegment.replace(/\.html?$/i, "").toLowerCase()}` : null;
    const npcKeyCandidates = [];
    if (chapterId) npcKeyCandidates.push(chapterId);
    if (arcSegment) npcKeyCandidates.push(arcSegment);
    if (slugSegment) npcKeyCandidates.push(slugSegment);
    const campaignsPagesBase = campaignsBase ? new URL("pages/", campaignsBase).href : null;
    const npcsUrl = campaignsPagesBase
      ? new URL("npcs.json", campaignsPagesBase).href
      : new URL("../../npcs.json", window.location.href).href;
    console.debug("[NPC] npcKeyCandidates", npcKeyCandidates, "npcsUrl", npcsUrl);
    let mapping;
    try {
      const res = await fetch(npcsUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mapping = data && data.npcs ? data.npcs : {};
    } catch (err) {
      console.error("Related NPC map unavailable:", err && err.message ? err.message : err);
      return;
    }

    const npcKey = npcKeyCandidates.find((key) => Object.prototype.hasOwnProperty.call(mapping, key));
    const npcIds = npcKey ? mapping[npcKey] : null;
    if (!Array.isArray(npcIds) || !npcIds.length) {
      console.debug("[NPC] no npcIds for keys", npcKeyCandidates);
      return;
    }

    const npcDataPath =
      (window.RUGATHA_CONFIG &&
        window.RUGATHA_CONFIG.dataFiles &&
        window.RUGATHA_CONFIG.dataFiles.npcCharacters) ||
      "/npc/data/characters.json";
    const siteBase = campaignsBase ? new URL("../", campaignsBase).href : window.location.href;
    const npcDataUrl = npcDataPath.startsWith("http")
      ? npcDataPath
      : new URL(npcDataPath, siteBase).href;
    console.debug("[NPC] npcDataUrl", npcDataUrl);
    let characters = [];
    try {
      const res = await fetch(npcDataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      characters = Array.isArray(json) ? json : [];
    } catch (err) {
      console.error("NPC data unavailable:", err && err.message ? err.message : err);
      return;
    }

    const charById = characters.reduce((acc, ch) => {
      if (ch && ch.id) acc[ch.id] = ch;
      return acc;
    }, {});

    console.log("[NPC] rendering cards for", npcKey, npcIds.length, "NPCs");

    relatedNpcState.npcIds = npcIds;
    relatedNpcState.charById = charById;
    relatedNpcState.siteBase = siteBase;
    renderRelatedNpcSection();
  };

  const renderRelatedPcs = async () => {
    if (!isChapterPage || !arcSegment) return;
    const chapterId = `${arcSegment}-${lastSegment.replace(/\.html?$/i, "").toLowerCase()}`;
    const campaignsPagesBase = campaignsBase
      ? new URL("pages/", campaignsBase).href
      : new URL("../../npcs.json", window.location.href).href;
    const pcsUrl = new URL("pcs.json", campaignsPagesBase).href;

    let mapping;
    try {
      const res = await fetch(pcsUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mapping = data && data.pcs ? data.pcs : {};
    } catch (err) {
      console.error("Related PC map unavailable:", err && err.message ? err.message : err);
      return;
    }

    const pcIds = Array.isArray(mapping[chapterId]) ? mapping[chapterId] : null;
    if (!pcIds || !pcIds.length) return;

    const siteBase = campaignsBase ? new URL("../", campaignsBase).href : window.location.href;
    const pcDataUrl = new URL("pc/pc_lib", siteBase).href;

    let csvText = "";
    try {
      const res = await fetch(pcDataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      csvText = await res.text();
    } catch (err) {
      console.error("PC data unavailable:", err && err.message ? err.message : err);
      return;
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map((cell) => cell.trim());
    const charById = lines.slice(1).reduce((acc, line) => {
      const values = line.split(",").map((cell) => cell.trim());
      const entry = headers.reduce((obj, header, index) => {
        obj[header] = values[index] || "";
        return obj;
      }, {});
      const key = normalizePcKey(entry.name_en);
      if (key) acc[key] = entry;
      return acc;
    }, {});

    relatedPcState.pcIds = pcIds;
    relatedPcState.charById = charById;
    relatedPcState.siteBase = siteBase;
    renderRelatedPcSection();
  };

  const renderRelatedGuests = async () => {
    if (!isChapterPage || !arcSegment) return;
    const chapterId = `${arcSegment}-${lastSegment.replace(/\.html?$/i, "").toLowerCase()}`;
    const campaignsPagesBase = campaignsBase
      ? new URL("pages/", campaignsBase).href
      : new URL("../../guest.json", window.location.href).href;
    const guestUrl = new URL("guest.json", campaignsPagesBase).href;

    let mapping;
    try {
      const res = await fetch(guestUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mapping = data && data.guest ? data.guest : {};
    } catch (err) {
      console.error("Related guest map unavailable:", err && err.message ? err.message : err);
      return;
    }

    const guestIds = Array.isArray(mapping[chapterId]) ? mapping[chapterId] : null;
    if (!guestIds || !guestIds.length) return;

    const siteBase = campaignsBase ? new URL("../", campaignsBase).href : window.location.href;
    const pcDataUrl = new URL("pc/pc_lib", siteBase).href;

    let csvText = "";
    try {
      const res = await fetch(pcDataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      csvText = await res.text();
    } catch (err) {
      console.error("Guest PC data unavailable:", err && err.message ? err.message : err);
      return;
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map((cell) => cell.trim());
    const charById = lines.slice(1).reduce((acc, line) => {
      const values = line.split(",").map((cell) => cell.trim());
      const entry = headers.reduce((obj, header, index) => {
        obj[header] = values[index] || "";
        return obj;
      }, {});
      const key = normalizePcKey(entry.name_en);
      if (key) acc[key] = entry;
      return acc;
    }, {});

    relatedGuestState.pcIds = guestIds;
    relatedGuestState.charById = charById;
    relatedGuestState.siteBase = siteBase;
    renderRelatedGuestSection();
  };

  const findCampaignNode = (slug) =>
    graphData.find((node) => node.level === 2 && slugify(node.label || "") === slug);

  const campaignNode = findCampaignNode(slugParam);
  const chapters = isArcPage && targetArc
    ? graphData.filter((node) => node.level === 4 && node.parent === targetArc.id)
    : campaignNode
      ? graphData.filter((node) => {
          const matchesParent = node.parent === campaignNode.id;
          const matchesExtra = Array.isArray(node.extraParents) && node.extraParents.includes(campaignNode.id);
          return node.level === 3 && (matchesParent || matchesExtra);
        })
      : [];
  const chaptersMissingImages = chapters
    .filter((ch) => (ch.level === 4 ? !ch.image : !chapterImageMap[ch.id]))
    .map((ch) => ch.label || ch.id);
  if (chaptersMissingImages.length) {
    console.warn("No banner match for:", chaptersMissingImages.join(", "));
  }

  chapterListState.chapters = chapters;
  renderChapterList();

  const setupHeroDrift = () => {
    const root = document.documentElement;
    let ticking = false;
    const maxDrift = 48;
    const update = () => {
      const drift = Math.min(maxDrift, window.scrollY * 0.08);
      root.style.setProperty("--hero-drift", `${drift}px`);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
  };

  document.title = `${displayName} | Rugatha Campaign`;
  languageState.value = getPreferredLanguage();
  window.__RUGATHA_CHAPTER_LANG = languageState.value;
  document.documentElement.setAttribute("data-lang", languageState.value);
  ensureLanguageToggle();
  updateChapterContentLanguage();
  setupHeroDrift();
  updateStoryArcBadge();
  updateArcChaptersHeading();
  renderRelatedPcs();
  renderRelatedGuests();
  renderRelatedNpcs();
  loadChapterTitleMap().then((map) => {
    chapterTitleState.map = map;
    updateChapterTitle();
    renderChapterList();
  });
  loadStoryArcTitleMap().then((map) => {
    arcTitleState.map = map;
    updateArcTitle();
    updateChapterArcTagline();
  });

})();
