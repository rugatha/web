const npcId = getRequestedNpc();

const elements = {
  name: document.getElementById("npc-name"),
  portrait: document.getElementById("npc-portrait"),
  zh: document.getElementById("npc-desc-zh"),
  en: document.getElementById("npc-desc-en"),
  content: document.querySelector(".content")
};

let charactersCache = null;

const genderMap = {
  male: { icon: "♂", label: "Male" },
  female: { icon: "♀", label: "Female" },
  neutral: { icon: "⚪", label: "Neutral" },
  other: { icon: "✦", label: "Other" }
};

const statusMap = {
  alive: { icon: "❤", label: "Alive" },
  dead: { icon: "☠", label: "Dead" },
  "historical figure": { icon: "⌛", label: "Historical figure" },
  other: { icon: "?", label: "Unknown" }
};

function loadInlineData() {
  const el = document.getElementById("npc-data");
  if (!el) return {};
  try {
    const parsed = JSON.parse(el.textContent);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    return {};
  } catch (err) {
    return {};
  }
}

function normalize(str) {
  return (str || "").toLowerCase().trim().replace(/[\s_-]+/g, "");
}

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((v) => `${v}`.trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

const rootBase = new URL("../../../", window.location.href);
const npcAppearanceUrls = {
  mapping: new URL("campaigns/pages/npcs.json", rootBase).href,
  config: new URL("shared/rugatha.config.js", rootBase).href
};
const campaignSortOrder = ["rugatha-main", "plus", "lite", "wilds", "brown", "legends"];
const appearanceCache = {
  npcMap: null,
  configPromise: null,
  graphData: null
};

async function loadNpcAppearanceMap() {
  if (appearanceCache.npcMap) return appearanceCache.npcMap;
  try {
    const res = await fetch(npcAppearanceUrls.mapping, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    appearanceCache.npcMap = json && json.npcs ? json.npcs : {};
  } catch (err) {
    appearanceCache.npcMap = {};
    console.warn("Unable to load NPC appearance map:", err && err.message ? err.message : err);
  }
  return appearanceCache.npcMap;
}

async function ensureRugathaConfig() {
  if (window.RUGATHA_CONFIG) return window.RUGATHA_CONFIG;
  if (appearanceCache.configPromise) return appearanceCache.configPromise;
  appearanceCache.configPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = npcAppearanceUrls.config;
    script.async = true;
    script.onload = () => resolve(window.RUGATHA_CONFIG || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return appearanceCache.configPromise;
}

async function loadGraphData() {
  if (appearanceCache.graphData) return appearanceCache.graphData;
  const config = await ensureRugathaConfig();
  const nodes =
    config && config.graph && Array.isArray(config.graph.data) ? config.graph.data : window.CAMPAIGN_GRAPH_DATA;
  appearanceCache.graphData = Array.isArray(nodes) ? nodes : [];
  return appearanceCache.graphData;
}

function resolveChapterUrl(chapter, arc) {
  if (!chapter) return "";
  const rawUrl = chapter.url || (arc && arc.url) || "";
  if (!rawUrl) return "";

  // If already absolute, strip to path so we stay root-relative.
  if (/^(https?:)?\/\//i.test(rawUrl)) {
    try {
      const parsed = new URL(rawUrl);
      return parsed.pathname + parsed.search + parsed.hash;
    } catch (_) {
      return rawUrl;
    }
  }
  // If already root-relative, return as-is.
  if (rawUrl.startsWith("/")) return rawUrl;

  // Build root-relative path: /campaigns/pages/{campaignSlug}/...
  const campaignSlugMap = {
    "rugatha-main": "rugatha",
    plus: "rugatha-plus",
    lite: "rugatha-lite",
    wilds: "rugatha-wilds",
    brown: "rugatha-brown",
    legends: "rugatha-legends",
    exp: "campaigns"
  };
  const arcId = (arc && arc.id) || chapter.parent || "";
  const campaignSlug = campaignSlugMap[(arc && arc.parent) || ""] || campaignSlugMap[arcId.split("-")[0]] || "campaigns";

  // Normalize the provided URL by stripping leading ./ or ../
  let cleaned = rawUrl.replace(/^\.\/+/, "").replace(/^(\.\.\/)+/, "");
  if (!cleaned) cleaned = arcId ? `${arcId}/` : "";
  if (cleaned.endsWith("/")) cleaned += "index.html";

  // If the cleaned path already starts with the campaign slug, don't double-prefix.
  const prefix = cleaned.startsWith(`${campaignSlug}/`) ? "" : `${campaignSlug}/`;
  return `/campaigns/pages/${prefix}${cleaned}`;
}

function buildAppearances(mapping, graphData, npc) {
  if (!npc) return [];
  const targetKey = normalize(npc.id || npc.name);
  if (!targetKey) return [];
  const entries = Object.entries(mapping || {}).filter(
    ([, list]) => Array.isArray(list) && list.some((id) => normalize(id) === targetKey)
  );
  if (!entries.length) return [];

  const graphById = new Map();
  const chaptersByArc = new Map();
  const arcOrder = new Map();
  const chapterOrder = new Map();
  graphData.forEach((node, idx) => {
    if (!node || !node.id) return;
    graphById.set(node.id, node);
    if (node.level === 3 && !arcOrder.has(node.id)) arcOrder.set(node.id, idx);
    if (node.level === 4) {
      chapterOrder.set(node.id, idx);
      const list = chaptersByArc.get(node.parent) || [];
      list.push(node);
      chaptersByArc.set(node.parent, list);
    }
  });

  const campaignOrderMap = new Map(campaignSortOrder.map((id, idx) => [id, idx]));
  const grouped = new Map();
  const seen = new Set();
  const ensureNode = (node, fallbackId) => node || { id: fallbackId, label: fallbackId };

  const addChapter = (chapterNode, arcNode) => {
    if (!chapterNode || !arcNode) return;
    const chapterId = chapterNode.id || `${arcNode.id || "arc"}-chapter`;
    if (seen.has(chapterId)) return;
    seen.add(chapterId);
    const campaignNode = graphById.get(arcNode.parent) || { id: arcNode.parent || "campaign", label: arcNode.parent || "Campaign" };
    const campaignId = campaignNode.id || "campaign";
    const campaignGroup = grouped.get(campaignId) || { campaign: ensureNode(campaignNode, campaignId), arcs: new Map() };
    grouped.set(campaignId, campaignGroup);

    const arcId = arcNode.id || chapterNode.parent || "arc";
    const arcGroup =
      campaignGroup.arcs.get(arcId) ||
      { arc: ensureNode(arcNode, arcId), chapters: [] };
    campaignGroup.arcs.set(arcId, arcGroup);
    arcGroup.chapters.push({ ...chapterNode, id: chapterId });
  };

  entries.forEach(([key]) => {
    const node = graphById.get(key);
    if (node && node.level === 4) {
      const arcNode = graphById.get(node.parent) || { id: node.parent, label: node.parent };
      addChapter(node, arcNode);
      return;
    }
    if (node && node.level === 3) {
      const chapters = chaptersByArc.get(node.id);
      if (chapters && chapters.length) {
        chapters.forEach((ch) => addChapter(ch, node));
      } else {
        addChapter({ ...node, parent: node.id }, node);
      }
      return;
    }
    const arcNode = graphById.get(key) || { id: key, label: key };
    const chapters = chaptersByArc.get(key);
    if (chapters && chapters.length) {
      chapters.forEach((ch) => addChapter(ch, arcNode));
    }
  });

  const campaigns = Array.from(grouped.values()).map((entry) => {
    const arcs = Array.from(entry.arcs.values());
    arcs.sort((a, b) => {
      const idxA = arcOrder.get(a.arc.id) ?? 9999;
      const idxB = arcOrder.get(b.arc.id) ?? 9999;
      if (idxA !== idxB) return idxA - idxB;
      return (a.arc.title || a.arc.label || a.arc.id || "").localeCompare(
        b.arc.title || b.arc.label || b.arc.id || ""
      );
    });
    arcs.forEach((arcEntry) => {
      arcEntry.chapters.sort((a, b) => {
        const idxA = chapterOrder.get(a.id) ?? 9999;
        const idxB = chapterOrder.get(b.id) ?? 9999;
        if (idxA !== idxB) return idxA - idxB;
        return (a.title || a.label || a.id || "").localeCompare(b.title || b.label || b.id || "");
      });
    });
    return { ...entry, arcs };
  });

  campaigns.sort((a, b) => {
    const orderA = campaignOrderMap.get(a.campaign.id) ?? 99;
    const orderB = campaignOrderMap.get(b.campaign.id) ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.campaign.title || a.campaign.label || a.campaign.id || "").localeCompare(
      b.campaign.title || b.campaign.label || b.campaign.id || ""
    );
  });

  return campaigns;
}

async function renderAppearances(npc) {
  if (!elements.content || !npc) return;
  const existing = elements.content.querySelector(".appearances");
  if (existing) existing.remove();

  let mapping = {};
  let graphData = [];
  try {
    [mapping, graphData] = await Promise.all([loadNpcAppearanceMap(), loadGraphData()]);
  } catch (err) {
    console.warn("Unable to load appearance data:", err && err.message ? err.message : err);
  }

  const appearances = buildAppearances(mapping, graphData, npc);
  const section = document.createElement("div");
  section.className = "appearances";
  const title = document.createElement("h2");
  title.className = "section-title";
  title.textContent = "出現章節 Appeared Chapters";
  section.appendChild(title);

  if (!appearances.length) {
    const empty = document.createElement("span");
    empty.className = "location-empty";
    empty.textContent = "尚未記錄出現章節 / No appearances logged";
    section.appendChild(empty);
    elements.content.appendChild(section);
    return;
  }

  appearances.forEach((campaignEntry) => {
    const campaignBlock = document.createElement("div");
    campaignBlock.className = "appearance-campaign";

    const campaignTitle = document.createElement("div");
    campaignTitle.className = "appearance-campaign__title";
    campaignTitle.textContent =
      campaignEntry.campaign.title || campaignEntry.campaign.label || campaignEntry.campaign.id || "Campaign";
    campaignBlock.appendChild(campaignTitle);

    campaignEntry.arcs.forEach((arcEntry) => {
      const arcWrap = document.createElement("div");
      arcWrap.className = "appearance-arc";

      const arcTitle = document.createElement("div");
      arcTitle.className = "appearance-arc__title";
      arcTitle.textContent = arcEntry.arc.title || arcEntry.arc.label || arcEntry.arc.id || "Story Arc";
      arcWrap.appendChild(arcTitle);

      const chapterList = document.createElement("div");
      chapterList.className = "appearance-chapters";
      arcEntry.chapters.forEach((ch) => {
        const href = resolveChapterUrl(ch, arcEntry.arc);
        const node = document.createElement(href ? "a" : "div");
        node.className = "appearance-chip";
        if (href) {
          node.href = href;
          node.target = "_self";
        }
        node.textContent = ch.title || ch.label || ch.id || "Chapter";
        chapterList.appendChild(node);
      });

      arcWrap.appendChild(chapterList);
      campaignBlock.appendChild(arcWrap);
    });

    section.appendChild(campaignBlock);
  });

  const locationTitle = elements.content.querySelector(".location-title");
  const relatedSection = elements.content.querySelector(".related");
  const anchor = locationTitle || relatedSection || null;
  if (anchor && anchor.parentNode === elements.content) {
    elements.content.insertBefore(section, anchor);
  } else {
    elements.content.appendChild(section);
  }
}

const deityList = [
  { en: "Trinix", zh: "崔尼斯" },
  { en: "Phyneal", zh: "芬尼爾" },
  { en: "Phynoir", zh: "芬諾爾" },
  { en: "Nessis", zh: "涅西斯" },
  { en: "Keinra", zh: "津菈" },
  { en: "Jeorisan", zh: "喬里森" },
  { en: "Ultisen", zh: "奧提森" },
  { en: "Maxus", zh: "麥克瑟斯" },
  { en: "Laxthos", zh: "拉索斯" },
  { en: "Kalinius", zh: "凱里涅斯" },
  { en: "Daligon", zh: "達里崗" },
  { en: "Amoret", zh: "阿莫雷" },
  { en: "The Mother", zh: "母親大人" },
  { en: "Mother", zh: "母親大人" },
  { en: "Anna", zh: "安娜" },
  { en: "Alfenor", zh: "阿爾芬諾" },
  { en: "King Knicol", zh: "神王尼可" },
  { en: "Knicol", zh: "尼可" },
  { en: "The Spider Religion", zh: "蜘蛛神教" }
];

const spiderKeys = ["The Mother", "Mother", "Anna", "Alfenor"].map((n) => normalize(n));

const religionMap = deityList.reduce((acc, entry) => {
  acc[normalize(entry.en)] = { en: entry.en, zh: entry.zh };
  return acc;
}, {});

function getSlugId(pathname = window.location.pathname) {
  const parts = (pathname || "").split("/");
  const last = parts.filter(Boolean).pop() || "";
  const decoded = safeDecode(last);
  return decoded.replace(/\.html?$/i, "");
}

function getRequestedNpc() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("npc") || params.get("id") || "";
  const cleanedQuery = stripQuotes(fromQuery);
  if (cleanedQuery) return cleanedQuery;

  const slug = getSlugId();
  if (slug && slug.toLowerCase() !== "_template") return slug;

  const ref = document.referrer || "";
  if (ref) {
    try {
      const refUrl = new URL(ref);
      const refNpc = refUrl.searchParams.get("npc") || refUrl.searchParams.get("id");
      const cleanedRef = stripQuotes(refNpc);
      if (cleanedRef) return cleanedRef;
      const refSlug = getSlugId(refUrl.pathname);
      if (refSlug && refSlug.toLowerCase() !== "_template") return refSlug;
    } catch (err) {
      /* ignore parse errors */
    }
  }

  return "ada";
}

function stripQuotes(str) {
  const s = (str || "").trim();
  if (!s) return "";
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1);
  }
  return s;
}

async function loadCharacters() {
  try {
    const res = await fetch("../../data/characters.json", { cache: "no-store" });
    const chars = await res.json();
    charactersCache = Array.isArray(chars) ? chars : [];
  } catch (err) {
    charactersCache = [];
  }
  return charactersCache;
}

function resolveImage(image) {
  if (!image) return "";
  return /^https?:|^\//.test(image) ? image : `../../${image}`;
}

function findCharacter(chars, name, id, slug) {
  const targets = new Set([normalize(id), normalize(name), normalize(slug)]);
  return chars.find((c) => {
    const idKey = normalize(c.id || c.name);
    const slugKey = normalizeSlug(c.url);
    for (const target of targets) {
      if (target && (target === idKey || target === slugKey)) return true;
    }
    return false;
  });
}

function normalizeSlug(url) {
  if (!url) return "";
  const raw = (url.split("/").pop() || "").replace(/\.html?$/i, "");
  const decoded = safeDecode(raw);
  return normalize(decoded);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch (err) {
    return value;
  }
}

function normalizeRelatedUrl(url) {
  if (!url) return "#";
  if (url.startsWith("npc_page/pages/")) return "../../" + url;
  if (url.startsWith("npc/npc_page/pages/")) return "../../" + url.slice(4);
  return url;
}

function resolveRelated(chars, relatedIds = []) {
  const related = toList(relatedIds);
  if (!related.length) return [];
  const byId = new Map();
  chars.forEach((c) => {
    const key = normalize(c.id || c.name);
    if (key) byId.set(key, c);
  });
  const result = [];
  related.forEach((rid) => {
    const key = normalize(rid);
    const match = key ? byId.get(key) : null;
    if (match && match.name) {
      result.push({
        name: match.name,
        url: normalizeRelatedUrl(match.url),
        image: resolveImage(match.image)
      });
    } else {
      result.push({ name: rid, url: "#" });
      console.warn(`Related NPC not found: ${rid}`);
    }
  });
  return result;
}

function ensurePrettyUrl(id) {
  if (!id || !window.history || !window.history.replaceState) return;
  const path = window.location.pathname || "";
  if (!/_template\.html$/i.test(path)) return;
  const dir = path.slice(0, path.lastIndexOf("/") + 1);
  const targetPath = `${dir}${encodeURIComponent(id)}.html`;
  if (targetPath === path) return;
  const params = new URLSearchParams(window.location.search);
  params.delete("npc");
  params.delete("id");
  const query = params.toString();
  const hash = window.location.hash || "";
  const newUrl = `${targetPath}${query ? `?${query}` : ""}${hash}`;
  window.history.replaceState(null, "", newUrl);
}

function render(npc) {
  ensureContentSections();
  elements.name.textContent = npc.name || "NPC";
  elements.portrait.src = npc.image || "";
  elements.portrait.alt = npc.name || "NPC portrait";
  setDescription(elements.zh, npc.descZh, "（尚無中文介紹）");
  setDescription(elements.en, npc.descEn, "(Description coming soon)");
  renderGender(npc.gender);
  renderStatus(npc.status);
  renderLocationList(npc.location);
  renderReligion(npc.religion);
  document.title = npc.name ? `${npc.name} | NPC` : "NPC";
  insertRelated(npc.related || []);
}

(async function init() {
  const npcMap = loadInlineData();
  const inlineNpc =
    npcMap[npcId] ||
    Object.values(npcMap).find((entry) => normalize(entry.id || entry.name) === normalize(npcId)) ||
    Object.values(npcMap)[0];

  const baseNpc = inlineNpc || {
    id: npcId || "npc",
    name: inlineNpc?.name || npcId || "NPC",
    image: "",
    gender: inlineNpc?.gender || "neutral",
    location: inlineNpc?.location || [],
    descZh: "找不到該 NPC。",
    descEn: "NPC not found."
  };

  const chars = await loadCharacters();
  const record = findCharacter(chars, baseNpc.name, baseNpc.id, getSlugId());
  const mergedNpc = { ...baseNpc };
  if (record) {
    mergedNpc.id = record.id || mergedNpc.id;
    mergedNpc.name = record.name || mergedNpc.name;
    mergedNpc.image = resolveImage(record.image) || mergedNpc.image;
    mergedNpc.gender = record.gender || mergedNpc.gender;
    mergedNpc.status = record.status || mergedNpc.status;
    mergedNpc.descZh = record.descZh || mergedNpc.descZh;
    mergedNpc.descEn = record.descEn || mergedNpc.descEn;
    const resolvedRelated = resolveRelated(chars, record.related || mergedNpc.related);
    if (resolvedRelated.length) {
      mergedNpc.related = resolvedRelated;
    } else {
      const fallbackRelated = toList(record.related || mergedNpc.related).map((rid) => ({
        name: rid,
        url: normalizeRelatedUrl(`npc_page/pages/${rid}.html`)
      }));
      mergedNpc.related = fallbackRelated;
    }
    mergedNpc.religion = record.religion || mergedNpc.religion;
    mergedNpc.location = record.location || mergedNpc.location;
  }

  ensurePrettyUrl(mergedNpc.id || mergedNpc.name);
  render(mergedNpc);
  await renderAppearances(mergedNpc);
})();

function setDescription(el, text, fallback) {
  if (!el) return;
  const content = (text || "").trim() || fallback;
  el.innerHTML = "";
  const blocks = content.split(/\n{2,}/); // split paragraphs
  blocks.forEach((block, bIdx) => {
    const lines = block.split(/\n+/);
    lines.forEach((line, lIdx) => {
      const span = document.createElement("span");
      span.textContent = line;
      el.appendChild(span);
      if (lIdx !== lines.length - 1) {
        el.appendChild(document.createElement("br"));
      }
    });
    if (bIdx !== blocks.length - 1) {
      el.appendChild(document.createElement("br"));
      el.appendChild(document.createElement("br"));
    }
  });
}

function renderGender(gender) {
  const meta = getMetaContainer();
  if (!meta) return;

  let badge = meta.querySelector(".gender-pill");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "tag gender-pill";
    meta.appendChild(badge);
  }

  const key = (gender || "").toLowerCase();
  const info = genderMap[key] || genderMap.other;
  badge.dataset.gender = info.label.toLowerCase();
  badge.textContent = info.icon;
  badge.setAttribute("aria-label", `Gender: ${info.label}`);
}

function parseReligionEntries(religion) {
  const entries = toList(religion);
  if (!entries.length) return [];
  return entries
    .map((label) => {
      const key = normalize(label);
      if (!key) return null;
      if (key === "notsure") {
        return { en: "Not sure", zh: "不確定" };
      }
      const mapped = religionMap[key];
      if (mapped) {
        const family = spiderKeys.includes(key) ? "蜘蛛神教 / The Spider Religion" : null;
        return { ...mapped, family };
      }
      return { en: label, zh: "未知", unknown: true };
    })
    .filter(Boolean);
}

function renderReligion(religion) {
  const meta = getMetaContainer();
  if (!meta) return;
  const entries = parseReligionEntries(religion);
  if (!entries.length) return;

  entries.forEach((entry) => {
    const pill = document.createElement("span");
    pill.className = "tag religion-pill";
    pill.innerHTML = `${entry.zh}<span class="en-label">${entry.en}</span>`;

    if (entry.family) {
      const fam = document.createElement("span");
      fam.className = "religion-family";
      fam.textContent = entry.family;
      pill.appendChild(fam);
    }

    if (entry.unknown) {
      const hint = document.createElement("span");
      hint.className = "religion-family";
      hint.textContent = "未能匹配到神祇";
      pill.appendChild(hint);
      console.warn(`Unknown religion mapping: ${entry.en}`);
    }

    meta.appendChild(pill);
  });
}

function getMetaContainer() {
  const row = document.querySelector(".title-row");
  if (!row) return null;
  let meta = row.querySelector(".title-meta");
  if (!meta) {
    meta = document.createElement("div");
    meta.className = "title-meta";
    row.appendChild(meta);
  }
  return meta;
}

function renderLocationList(locations) {
  if (!elements.locations) return;
  elements.locations.innerHTML = "";
  const items = Array.isArray(locations) ? locations.filter(Boolean) : [];
  if (!items.length) {
    const empty = document.createElement("span");
    empty.className = "location-empty";
    empty.textContent = "尚未提供地點 / Location unavailable";
    elements.locations.appendChild(empty);
    return;
  }
  items.forEach((loc) => {
    const pill = document.createElement("span");
    pill.className = "tag location-pill";
    pill.textContent = loc;
    elements.locations.appendChild(pill);
  });
}

function ensureContentSections() {
  const content = elements.content;
  if (!content) return;

  if (elements.zh && !content.querySelector(".intro-title")) {
    const intro = document.createElement("h2");
    intro.className = "section-title intro-title";
    intro.textContent = "介紹 Introduction";
    content.insertBefore(intro, elements.zh);
  }

  if (!elements.locations) {
    const locTitle = document.createElement("h2");
    locTitle.className = "section-title location-title";
    locTitle.textContent = "地點 Locations";

    const locWrap = document.createElement("div");
    locWrap.id = "npc-locations";
    locWrap.className = "location-list";

    if (elements.en && elements.en.parentNode === content) {
      const afterEn = elements.en.nextSibling;
      if (afterEn) {
        content.insertBefore(locTitle, afterEn);
      } else {
        content.appendChild(locTitle);
      }
      content.insertBefore(locWrap, locTitle.nextSibling);
    } else {
      content.appendChild(locTitle);
      content.appendChild(locWrap);
    }

    elements.locations = locWrap;
  }
}

function insertRelated(items) {
  if (!elements.content) return;
  const existing = elements.content.querySelector(".related");
  if (existing) existing.remove();
  const wrap = document.createElement("div");
  wrap.className = "related";
  const title = document.createElement("h2");
  title.className = "section-title";
  title.textContent = "相關NPC Related NPCs";
  wrap.appendChild(title);

  if (items.length) {
    const list = document.createElement("div");
    list.className = "related-list";
    items.forEach((item) => {
      const card = document.createElement(item.url ? "a" : "div");
      card.className = "related-card";
      if (item.url) {
        card.href = item.url;
        card.target = "_self";
      }

      if (item.image) {
        const img = document.createElement("img");
        img.className = "related-card__img";
        img.src = item.image;
        img.alt = item.name || "NPC portrait";
        card.appendChild(img);
      }

      const name = document.createElement("div");
      name.className = "related-card__name";
      name.textContent = item.name || "NPC";
      card.appendChild(name);

      list.appendChild(card);
    });
    wrap.appendChild(list);
  } else {
    const empty = document.createElement("span");
    empty.className = "location-empty";
    empty.textContent = "無相關 NPC / No related NPCs";
    wrap.appendChild(empty);
  }

  elements.content.appendChild(wrap);
}

function renderStatus(status) {
  const meta = getMetaContainer();
  if (!meta) return;

  let badge = meta.querySelector(".status-pill");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "tag status-pill";
    meta.appendChild(badge);
  }

  const key = (status || "").toLowerCase();
  const info = statusMap[key] || statusMap.other;
  badge.dataset.status = info.label.toLowerCase().replace(/\s+/g, "-");
  badge.textContent = info.icon;
  badge.setAttribute("aria-label", `Status: ${info.label}`);
}
