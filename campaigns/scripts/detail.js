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

  const chapterBannerBase = "../Campaign%20Banners/";
  const chapterImageMap = {
    // Rugatha main
    "rugatha-c01": "C01 Curse of Vowalon.jpg",
    "rugatha-c02": "C02 Beneath the Temple.jpg",
    "rugatha-c03": "C03 Korringfield Reunion.jpg",
    "rugatha-c04": "C04 The Blooming of Macksohn.jpg",
    "rugatha-c05": "C05 Mattington Shattered.png",
    // Mattington shared variants
    "plus-c05": "C05R+ Mattington Shattered.jpg",
    "lite-c05": "C05Rlite Mattington Shattered.jpg",
    // Rugatha Plus
    "plus-c06": "C06R+ Hand of the Lich.jpg",
    "plus-c07": "C07R+ Before the Next Full Moon.png",
    // Rugatha Plus 1
    "plus1-c01": "C01R+1 To the Deep and Back.png",
    // Rugatha lite
    "lite-c06": "C06Rlite The Gift from Alfenor.jpg",
    "lite-c07": "C07 Lurking Dangers_工作區域 1.jpg",
    "lite-c08": "C08Rlite Deep into Lothum.png",
    "lite-c09": "C09Rlite The Cave of Drogsland.jpg",
    "lite-c10": "C10lite Requiem of the Feathered Estate.png",
    "lite-c11": "C11lite Seats of the Eclipse.png",
    // Rugatha WILDS
    "wilds-c01": "C01RW The Elite Bloodline.jpg",
    "wilds-c02": "C02RW Gathering of the Chosen.png",
    "wilds-c03": "C03RW Storm of Mudtown.png",
    "wilds-c04": "C04RW Heir to Rathanad.png",
    // Rugatha Brown
    "brown-c01": "C01 Rbrown Dark Petals.jpg",
    "brown-howling": "C02 Rbrown Howling of the Wolf_工作區域 1.jpg",
    // Rugatha Legends
    "legends-os01": "O1 The False Hydra of Moorland Haunt.jpg",
    "legends-os02": "O2 The Disappearance of Gustavo Norman.jpg",
    "legends-os03": "O3 The Lighthouse on the Deserted Island.jpg",
    "legends-os04": "O4 The Deadly Prison Break.jpg",
    "legends-os05": "O5 Dragon's Orb_工作區域 1.jpg",
    "legends-os06": "O6 The Malicious Rise of Alfenor.jpg",
    "legends-os07": "O7 Mylstan Colossus.jpg",
    "legends-os08": "O8 Lord Octavian von Oderick's Dungeon of Randomness.png",
    // Experience (optional, in case used)
    "exp-e01": "2025O1 The Scroll of the Golden Castle.png",
    "exp-e02": "2025O2 Echoes of the Dragon's Roar.png"
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
