(() => {
  const graph = (window.RUGATHA_CONFIG && window.RUGATHA_CONFIG.graph) || {};
  const graphNodes = Array.isArray(graph.data)
    ? graph.data
    : Array.isArray(window.CAMPAIGN_GRAPH_DATA)
      ? window.CAMPAIGN_GRAPH_DATA
      : Array.isArray(graph.nodes)
        ? graph.nodes
        : [];

  if (!graphNodes.length) return;

  const normalizePath = (value) => {
    try {
      const url = new URL(value, window.location.href);
      let path = url.pathname.replace(/\/index\.html?$/i, "/");
      path = path.replace(/\/+$/, "/");
      return path;
    } catch (err) {
      return null;
    }
  };

  const resolveUrl = (value) => {
    if (!value) return null;
    try {
      return new URL(value, window.location.href).href;
    } catch (err) {
      return value;
    }
  };

  const campaignsBase =
    typeof window.RUGATHA_CAMPAIGNS_BASE === "string"
      ? window.RUGATHA_CAMPAIGNS_BASE
      : (() => {
          const path = window.location && window.location.pathname ? window.location.pathname : "";
          const idx = path.indexOf("/campaigns/");
          if (idx >= 0 && window.location && window.location.origin) {
            return `${window.location.origin}${path.slice(0, idx + "/campaigns/".length)}`;
          }
          return new URL("../", window.location.href).href;
        })();

  const ensureDetailScript = () => {
    const alreadyLoaded =
      Array.from(document.getElementsByTagName("script")).some((el) =>
        (el.src || "").includes("/campaigns/scripts/detail.js")
      );
    if (alreadyLoaded) return;
    const script = document.createElement("script");
    script.src = new URL("../../../scripts/detail.js", window.location.href).href;
    script.defer = true;
    script.dataset.name = "campaign-detail-loader";
    document.head.appendChild(script);
  };

  const ensureAchievementScript = () => {
    if (window.__rugathaChapterAchievementLoaded) return;
    window.__rugathaChapterAchievementLoaded = true;
    const src = new URL("scripts/chapter-achievement.js", campaignsBase).href;
    import(src).catch((error) => {
      console.warn("Failed to load chapter achievement script", error);
    });
  };

  const fetchOverrides = async () => {
    const overridesUrl = new URL("data/chapter-nav.json", campaignsBase).href;
    try {
      const res = await fetch(overridesUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data && typeof data === "object" ? data : {};
    } catch (err) {
      console.warn("Chapter nav overrides unavailable:", err && err.message ? err.message : err);
      return {};
    }
  };

  const main = async () => {
    ensureDetailScript();
    ensureAchievementScript();
    const overrides = await fetchOverrides();

    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const pagesIdx = pathParts.indexOf("pages");
    const arcIdFromPath = pagesIdx >= 0 ? pathParts[pagesIdx + 2] : "";
    if (!arcIdFromPath) return;

    // Skip nav for Rugatha Legends chapters except legends-os05
    if (/^legends-os\d+/i.test(arcIdFromPath) && arcIdFromPath.toLowerCase() !== "legends-os05") {
      return;
    }

    const toNodeById = (id, level) =>
      graphNodes.find((node) => node.id === id && (!level || node.level === level)) || null;

    const toMeta = (chapter) => {
      if (!chapter) return null;
      const arc = toNodeById(chapter.parent, 3);
      const campaignNode = arc ? toNodeById(arc.parent, 2) : null;
      return { chapter, arc, campaign: campaignNode };
    };

    let targetArc = toNodeById(arcIdFromPath, 3);
    let campaign = targetArc
      ? toNodeById(targetArc.parent, 2)
      : null;
    if (!targetArc || !campaign) return;

    let chapters = graphNodes.filter((node) => node.level === 4 && node.parent === targetArc.id);
    if (!chapters.length) return;

    const lastSegment = pathParts[pathParts.length - 1] || "";
    const chapterFromPath = lastSegment.match(/^(chpt[^/.]+)\.html?$/i);
    const chapterIdFromPath = chapterFromPath ? `${targetArc.id}-${chapterFromPath[1].toLowerCase()}` : null;
    const currentPath = normalizePath(window.location.href);

    let currentChapter =
      (chapterIdFromPath && chapters.find((ch) => ch.id === chapterIdFromPath)) || null;

    if (!currentChapter) {
      currentChapter = chapters.find((ch) => {
        if (!ch.url) return false;
        const chapterPath = normalizePath(resolveUrl(ch.url));
        return chapterPath === currentPath;
      });
    }

    if (!currentChapter && chapters.length === 1) {
      currentChapter = chapters[0];
    }

    if (!currentChapter) return;

    const override = overrides[currentChapter.id] || null;
    if (override) {
      const storyArcRaw = override["story-arc"];
      const storyArcId = typeof storyArcRaw === "object" && storyArcRaw ? storyArcRaw.id : storyArcRaw;
      const storyArcUrl = typeof storyArcRaw === "object" && storyArcRaw ? storyArcRaw.url : null;

      if (storyArcId && typeof storyArcId === "string") {
        const overrideArc = toNodeById(storyArcId, 3);
        if (overrideArc) {
          targetArc = storyArcUrl ? Object.assign({}, overrideArc, { url: storyArcUrl }) : overrideArc;
          campaign = toNodeById(targetArc.parent, 2) || campaign;
          chapters = graphNodes.filter((node) => node.level === 4 && node.parent === targetArc.id);
        }
      }
    }

    const currentIdx = chapters.findIndex((ch) => ch.id === currentChapter.id);
    let prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
    let nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

    if (override) {
      const toChapter = (value) => {
        if (!value) return null;
        if (typeof value === "string") {
          return toNodeById(value, 4);
        }
        if (typeof value === "object") {
          const id = typeof value.id === "string" ? value.id : null;
          if (!id) return null;
          const node = toNodeById(id, 4);
          if (!node) return null;
          if (typeof value.url === "string" && value.url.length) {
            return Object.assign({}, node, { url: value.url });
          }
          return node;
        }
        return null;
      };

      const toChapters = (value) => {
        if (Array.isArray(value)) {
          return value.map((entry) => toChapter(entry)).filter(Boolean);
        }
        if (typeof value === "string") {
          const node = toChapter(value);
          return node ? [node] : [];
        }
        if (typeof value === "object" && value) {
          const node = toChapter(value);
          return node ? [node] : [];
        }
        return [];
      };

      const prevList = toChapters(override["prev-chapter"]);
      const nextList = toChapters(override["next-chapter"]);
      prevChapter = prevList.length ? prevList : prevChapter;
      nextChapter = nextList.length ? nextList : nextChapter;
    }

    const campaignName = campaign && (campaign.label || campaign.title || campaign.name || campaign.id);
    const arcName = targetArc && (targetArc.title || targetArc.label || targetArc.id);

    const buildItem = (type, chapter, fallbackArc, fallbackCampaign) => {
      const list = Array.isArray(chapter)
        ? chapter.filter(Boolean)
        : chapter
          ? [chapter]
          : [];
      const metaList = list.map((item) => toMeta(item)).filter(Boolean);
      const isArc = type === "arc";
      const primaryMeta = metaList[0] || null;
      const displayCampaign = primaryMeta?.campaign || fallbackCampaign;
      const displayArc = primaryMeta?.arc || fallbackArc;

      const hasMultiple = !isArc && list.length > 1;
      const arcHref = isArc ? "./" : "../";
      const href = isArc
        ? arcHref
        : !hasMultiple && list[0]
          ? resolveUrl(list[0].url)
          : null;
      const isDisabled = !href && !hasMultiple;
      const wrapper = document.createElement(href ? "a" : "div");
      wrapper.className = `chapter-nav__item chapter-nav__item--${type}${isDisabled ? " is-disabled" : ""}${hasMultiple ? " chapter-nav__item--multi" : ""}`;
      if (href) {
        wrapper.href = href;
        wrapper.target = "_self";
      }

      const eyebrow = document.createElement("div");
      eyebrow.className = "chapter-nav__eyebrow";
      eyebrow.textContent =
        type === "prev" ? "上一章節 Last Chapter" : type === "next" ? "下一章節 Next Chapter" : "故事弧 Story Arc";
      wrapper.appendChild(eyebrow);

      const meta = document.createElement("div");
      meta.className = "chapter-nav__meta";

      if (!hasMultiple) {
        if (displayCampaign) {
          const campaignLine = document.createElement("span");
          campaignLine.className = "chapter-nav__line";
          campaignLine.textContent =
            displayCampaign.label || displayCampaign.title || displayCampaign.name || displayCampaign.id;
          meta.appendChild(campaignLine);
        }

        if (displayArc) {
          const arcLine = document.createElement("span");
          arcLine.className = "chapter-nav__line";
          arcLine.textContent = displayArc.title || displayArc.label || displayArc.id;
          meta.appendChild(arcLine);
        }
      }

      if (!isArc) {
        if (hasMultiple) {
          const links = document.createElement("div");
          links.className = "chapter-nav__links";
          metaList.forEach((itemMeta) => {
            const item = itemMeta.chapter;
            const link = document.createElement("a");
            link.className = "chapter-nav__link";
            const useHref = resolveUrl(item.url);
            link.href = useHref || "#";
            link.textContent = item.title || item.label || item.id;
            link.target = "_self";
            const itemCampaign = itemMeta.campaign;
            const itemArc = itemMeta.arc;

            if (itemCampaign) {
              const campaignBadge = document.createElement("span");
              campaignBadge.className = "chapter-nav__link-campaign";
              campaignBadge.textContent =
                itemCampaign.label || itemCampaign.title || itemCampaign.name || itemCampaign.id;
              link.appendChild(campaignBadge);
            }

            const shouldShowArcBadge =
              itemArc &&
              (!itemCampaign || itemArc.id !== itemCampaign.id);
            if (shouldShowArcBadge) {
              const badge = document.createElement("span");
              badge.className = "chapter-nav__link-arc";
              badge.textContent = itemArc.title || itemArc.label || itemArc.id;
              link.appendChild(badge);
            }
            links.appendChild(link);
          });
          meta.appendChild(links);
        } else {
          const chapterLine = document.createElement("span");
          chapterLine.className = "chapter-nav__line chapter-nav__line--chapter";
          const item = list[0];
          chapterLine.textContent = item ? item.title || item.label || item.id : "沒有章節";
          meta.appendChild(chapterLine);
        }
      }

      wrapper.appendChild(meta);
      return wrapper;
    };

    const existingNav = document.querySelector("section.chapter-nav[data-role='chapter-nav']");
    if (existingNav) existingNav.remove();

    const nav = document.createElement("section");
    nav.className = "chapter-nav";
    nav.setAttribute("aria-label", "章節導覽");
    nav.dataset.role = "chapter-nav";
    nav.appendChild(buildItem("prev", prevChapter, targetArc, campaign));
    nav.appendChild(buildItem("arc", null, targetArc, campaign));
    nav.appendChild(buildItem("next", nextChapter, targetArc, campaign));

    const placeNav = () => {
      const related = document.querySelector(".related-npcs");
      if (related && related.parentNode) {
        related.parentNode.insertBefore(nav, related.nextSibling);
        return true;
      }
      const contentTarget =
        document.querySelector(".campaign-detail:not(.arc-detail) .campaign-detail__content") ||
        document.querySelector(".campaign-detail:not(.arc-detail)") ||
        document.querySelector(".detail-canvas") ||
        document.querySelector(".page");
      if (contentTarget) {
        if (nav.parentNode !== contentTarget) {
          contentTarget.appendChild(nav);
        }
        return false;
      }
      return false;
    };

    const initialPlaced = placeNav();
    if (!initialPlaced) {
      const observer = new MutationObserver(() => {
        if (placeNav()) {
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };

  main();
})();
