(() => {
  const getCampaignsBase = () => {
    if (typeof window.RUGATHA_CAMPAIGNS_BASE === "string") {
      return window.RUGATHA_CAMPAIGNS_BASE;
    }
    const path = window.location && window.location.pathname ? window.location.pathname : "";
    const idx = path.indexOf("/campaigns/");
    if (idx >= 0 && window.location && window.location.origin) {
      return `${window.location.origin}${path.slice(0, idx + "/campaigns/".length)}`;
    }
    return new URL("../../../", window.location.href).href;
  };

  const getPreferredLanguage = () => {
    try {
      const stored = localStorage.getItem("npc-lang");
      if (stored === "zh" || stored === "en") return stored;
    } catch (_) {
      // Ignore storage access errors.
    }
    const docLang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    return docLang.startsWith("en") ? "en" : "zh";
  };

  const getChapterId = () => {
    const explicitId = document.body && document.body.dataset ? document.body.dataset.chapterContentId : "";
    if (explicitId) return explicitId;

    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const pagesIdx = pathParts.indexOf("pages");
    if (pagesIdx < 0) return "";

    const arcId = pathParts[pagesIdx + 2] || "";
    const lastSegment = pathParts[pathParts.length - 1] || "";
    const chapterMatch = lastSegment.match(/^(chpt[^/.]+)\.html?$/i);
    if (arcId && chapterMatch) {
      return `${arcId}-${chapterMatch[1].toLowerCase()}`;
    }

    return arcId;
  };

  const applyLanguageVisibility = () => {
    const lang = getPreferredLanguage() === "en" ? "en" : "zh";
    const articles = document.querySelectorAll(".campaign-detail:not(.arc-detail)");
    articles.forEach((article) => {
      article.querySelectorAll(":scope > .campaign-detail__content_zh").forEach((block) => {
        block.hidden = lang !== "zh";
      });
      article.querySelectorAll(":scope > .campaign-detail__content_en").forEach((block) => {
        block.hidden = lang !== "en";
      });
    });
  };

  const renderContent = (entry) => {
    const container =
      document.querySelector("[data-role='chapter-content']") ||
      document.querySelector(".campaign-detail:not(.arc-detail)");
    if (!container || !entry || !entry.content) return;

    const fragment = document.createDocumentFragment();
    const renderParagraphItem = (item, target) => {
      if (typeof item === "string") {
        const p = document.createElement("p");
        p.innerHTML = item;
        target.appendChild(p);
        return;
      }
      if (!item || typeof item !== "object") return;
      if (typeof item.html === "string") {
        const template = document.createElement("template");
        template.innerHTML = item.html.trim();
        target.appendChild(template.content.cloneNode(true));
        return;
      }
      if (typeof item.quote === "string") {
        const quote = document.createElement("blockquote");
        const p = document.createElement("p");
        p.innerHTML = item.quote;
        quote.appendChild(p);
        if (item.cite) {
          const cite = document.createElement("cite");
          cite.innerHTML = item.cite;
          quote.appendChild(cite);
        }
        target.appendChild(quote);
      }
    };

    const renderSections = (sections, target) => {
      sections.forEach((section) => {
        if (!section || typeof section !== "object") return;
        if (section.date) {
          const date = document.createElement("p");
          date.className = "chapter-date";
          date.textContent = section.date;
          target.appendChild(date);
        }
        if (Array.isArray(section.paragraphs)) {
          section.paragraphs.forEach((item) => renderParagraphItem(item, target));
        }
      });
    };

    const addBlock = (className, content) => {
      if (!content || (Array.isArray(content) && !content.length)) return;
      const block = document.createElement("div");
      block.className = className;
      if (typeof content === "string") {
        block.innerHTML = content;
      } else if (Array.isArray(content)) {
        renderSections(content, block);
      }
      fragment.appendChild(block);
    };

    addBlock("campaign-detail__content_zh", entry.content.zh);
    addBlock("campaign-detail__content_en", entry.content.en);
    addBlock("campaign-detail__content", entry.content.default);

    container.innerHTML = "";
    container.appendChild(fragment);
    applyLanguageVisibility();
  };

  const main = async () => {
    const chapterId = getChapterId();
    if (!chapterId) return;

    const dataUrl = new URL("data/chapter-content.json", getCampaignsBase()).href;
    try {
      const res = await fetch(dataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderContent(data && data[chapterId]);
    } catch (err) {
      console.warn("Chapter content unavailable:", err && err.message ? err.message : err);
    }
  };

  main();
})();
