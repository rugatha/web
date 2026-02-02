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
  const isArcPage = Boolean(arcSegment);
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

  if (!target) {
    if (detail) detail.classList.add("is-hidden");
    if (notFound) notFound.classList.remove("is-hidden");
    document.title = "Campaign not found | Rugatha";
    console.warn("Campaign slug not found:", slugParam);
    return;
  }

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
    if (window.__RUGATHA_NPCS_RENDERED) return;
    window.__RUGATHA_NPCS_RENDERED = true;
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

    const ensureStyles = () => {
      if (document.getElementById("related-npcs-style")) return;
      const style = document.createElement("style");
      style.id = "related-npcs-style";
      style.textContent = `
        .related-npcs { margin: 28px auto 0; padding: 20px; background: var(--panel, rgba(0, 0, 0, 0.04)); border-radius: 16px; width: 100%; max-width: 1200px; }
        .related-npcs__title { margin: 0 0 12px; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.02em; }
        .related-npcs__grid { display: flex; gap: 16px; width: 100%; margin: 0 auto; overflow-x: auto; padding-bottom: 8px; }
        .related-npcs__card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 12px; border-radius: 12px; background: var(--card, #fff); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06); border: 1px solid rgba(0, 0, 0, 0.04); color: inherit; text-decoration: none; transition: transform 120ms ease, box-shadow 120ms ease; }
        .related-npcs__card:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0, 0, 0, 0.08); }
        .related-npcs__image { width: 140px; height: 140px; object-fit: cover; border-radius: 10px; background: #f3f3f3; margin-bottom: 10px; }
        .related-npcs__name { font-weight: 700; font-size: 0.95rem; }
        @media (max-width: 599px) { .related-npcs { padding: 16px; } }
      `;
      document.head.appendChild(style);
    };

    const container = document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    if (!container) return;
    ensureStyles();

    const section = document.createElement("section");
    section.className = "related-npcs";

    const heading = document.createElement("h2");
    heading.className = "related-npcs__title";
    heading.textContent = "相關 NPC Related NPCs";
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "related-npcs__grid";
    section.appendChild(grid);

    const npcBase = new URL("npc/", siteBase).href;
    const resolveNpcUrl = (value) => {
      if (!value) return null;
      if (/^(https?:)?\/\//i.test(value)) return value;
      if (value.startsWith("/")) return new URL(value, siteBase).href;
      if (value.startsWith("npc/")) return new URL(value, siteBase).href;
      return new URL(value, npcBase).href;
    };

    const getNpcName = (meta) => {
      if (!meta) return "NPC";
      return meta.nameEn || meta.nameZh || meta.name || meta.id || "NPC";
    };

    npcIds.forEach((id) => {
      const meta = charById[id] || { id, nameEn: "", nameZh: "", name: id, url: null, image: null };
      const displayName = getNpcName(meta);
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

  const chapterList = document.querySelector("[data-role='chapter-list']");
  if (chapterList) {
    chapterList.innerHTML = "";
    if (!chapters.length) {
      const li = document.createElement("li");
      li.textContent = "尚未有章節";
      chapterList.appendChild(li);
    } else {
      chapters.forEach((ch) => {
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
        const displayTitle = ch.title || ch.label || ch.id;
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
    }
  }

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
  setupHeroDrift();
  renderRelatedNpcs();

})();
