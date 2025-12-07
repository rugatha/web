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

  const chapterBannerBase = "../campaign-banners/";
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
    "brown-howling": "brown-c02.jpg",
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
    (params.get("campaign") || params.get("slug") || (document.body.dataset.campaign || "")).toLowerCase();

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

  const target = campaigns.find((item) => slugify(item.name) === slugParam);
  const detail = document.querySelector("[data-role='campaign-detail']");
  const notFound = document.querySelector("[data-role='not-found']");

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

  const accent = target.accent || "#7bdcb5";
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-soft", toRgba(accent, 0.18));

  setText("title", target.name);
  setText("tagline", target.tagline);
  setText("dates", target.dates);

  const img = document.querySelector("[data-role='campaign-image']");
  if (img && target.image) {
    img.src = target.image;
    img.alt = `${target.name} campaign art`;
  }

  const findCampaignNode = (slug) =>
    graphData.find((node) => node.level === 2 && slugify(node.label || "") === slug);

  const campaignNode = findCampaignNode(slugParam);
  const chapters = campaignNode
    ? graphData.filter((node) => {
        const matchesParent = node.parent === campaignNode.id;
        const matchesExtra = Array.isArray(node.extraParents) && node.extraParents.includes(campaignNode.id);
        return node.level === 3 && (matchesParent || matchesExtra);
      })
    : [];
  const chaptersMissingImages = chapters.filter((ch) => !chapterImageMap[ch.id]).map((ch) => ch.label || ch.id);
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
        const title = document.createElement("a");
        title.href = ch.url || "#";
        if (!ch.url) title.removeAttribute("target");
        else {
          title.target = "_blank";
          title.rel = "noreferrer noopener";
        }
        title.textContent = ch.label || ch.id;
        meta.appendChild(title);

        const imageName = chapterImageMap[ch.id];
        li.appendChild(meta);
        if (imageName) {
          const img = document.createElement("img");
          img.className = "chapter-list__image";
          img.src = `${chapterBannerBase}${imageName}`;
          img.alt = `${ch.label || ch.id} banner`;
          li.appendChild(img);
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

  document.title = `${target.name} | Rugatha Campaign`;
  setupHeroDrift();
})();
