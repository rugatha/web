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

  const pathParts = window.location.pathname.replace(/\/index\.html?$/, "").split("/").filter(Boolean);
  const pagesIdx = pathParts.indexOf("pages");
  const slugSegment = pagesIdx >= 0 ? pathParts[pagesIdx + 1] : "";
  const arcSegment = pagesIdx >= 0 ? pathParts[pagesIdx + 2] : "";
  const isNestedPage = Boolean(slugSegment);
  const isArcPage = Boolean(arcSegment);
  const chapterBannerBase = isArcPage
    ? "../../../campaign-banners/"
    : isNestedPage
      ? "../../campaign-banners/"
      : "../campaign-banners/";
  const chapterImageMap = {
    // Rugatha main
    "rugatha-c01": "rugatha-c01.jpg",
    "rugatha-c02": "rugatha-c02.jpg",
    "rugatha-c03": "rugatha-c03.jpg",
    "rugatha-c04": "rugatha-c04.jpg",
    "rugatha-c05": "rugatha-c05.png",
    // Mattington shared variants
    "plus-c05": "plus-c05.jpg",
    "lite-c05": "lite-c05.jpg",
    // Rugatha Plus
    "plus-c06": "plus-c06.jpg",
    "plus-c07": "plus-c07.png",
    // Rugatha Plus 1
    "plus1-c01": "plus1-c01.png",
    // Rugatha lite
    "lite-c06": "lite-c06.jpg",
    "lite-c07": "lite-c07.jpg",
    "lite-c08": "lite-c08.png",
    "lite-c09": "lite-c09.jpg",
    "lite-c10": "lite-c10.png",
    "lite-c11": "lite-c11.png",
    // Rugatha WILDS
    "wilds-c01": "wilds-c01.jpg",
    "wilds-c02": "wilds-c02.png",
    "wilds-c03": "wilds-c03.png",
    "wilds-c04": "wilds-c04.png",
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

  const img = document.querySelector("[data-role='campaign-image']");
  const heroImage = (target && target.image) || (targetCampaign && targetCampaign.image);
  if (img && heroImage) {
    img.src = heroImage;
    img.alt = `${displayName} campaign art`;
  }

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
        title.href = arcHref;
        title.target = "_self";
        title.textContent = displayTitle;
        meta.appendChild(title);

        const imageName = isLevel4 ? ch.image : chapterImageMap[ch.id];
        li.appendChild(meta);
        if (imageName) {
          const imageLink = document.createElement("a");
          imageLink.href = arcHref;
          imageLink.target = "_self";
          const img = document.createElement("img");
          img.className = "chapter-list__image";
          const useSrc =
            typeof imageName === "string" && (imageName.startsWith("/") || imageName.startsWith("http"))
              ? imageName
              : `${isLevel4 ? "/campaigns/chapter-banners/" : chapterBannerBase}${imageName}`;
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
})();
