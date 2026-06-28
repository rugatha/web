const GRAPH_WIDTH = 1600;
const GRAPH_HEIGHT = 980;
const DATA_URLS = {
  pcs: "../campaigns/pages/pcs.json",
  guests: "../campaigns/pages/guest.json",
  npcs: "../campaigns/pages/npcs.json",
  npcCharacters: "../npc/data/characters.json",
  chapterTitles: "../campaigns/data/chapter-titles.json",
  storyArcTitles: "../campaigns/data/story-arc-titles.json",
  pcLib: "../pc/pc_lib"
};

const CAMPAIGN_ORDER = ["rugatha-main", "plus", "lite", "wilds", "brown", "legends"];
const I18N = {
  zh: {
    pageTitle: "關聯圖",
    heroTitle: "關聯圖",
    language: "Language",
    campaign: "Campaign",
    storyArc: "Story Arc",
    chapter: "Chapter",
    resetView: "重設視角",
    legend: "圖例",
    legendChapter: "團錄 / Chapter",
    legendPc: "PC",
    legendGuest: "Guest",
    legendNpc: "NPC",
    legendAppearance: "章節出場",
    legendRelated: "NPC 關聯",
    clearSelection: "清除高亮",
    detailHint: "點一個節點後，這裡會顯示詳細資訊。",
    loading: "資料載入中...",
    allCampaign: "全部 Campaign",
    allArc: "全部 Story Arc",
    allChapter: "全部 Chapter",
    allPc: "全部 PC",
    allGuest: "全部 Guest",
    allNpc: "全部 NPC",
    noData: "目前篩選條件沒有資料。",
    noMatch: "目前沒有符合條件的關係資料",
    statusShown: "顯示 {chapters} 個章節、{pcs} 個 PC/Guest、{npcs} 個 NPC",
    chapterType: "章節",
    campaignsGroup: "Campaigns",
    arcsGroup: "Story Arcs",
    chaptersGroup: "Chapters",
    pcsGroup: "PC",
    guestsGroup: "Guest",
    npcsGroup: "NPC",
    pcLabel: "PC",
    guestLabel: "Guest",
    npcLabel: "NPC",
    pcGuestLabel: "PC / Guest",
    pcField: "PC",
    guestField: "Guest",
    npcField: "NPC",
    player: "玩家",
    race: "種族",
    class: "職業",
    location: "地點",
    appearances: "出場章節",
    relatedNpcs: "NPC 關聯",
    rankingsTitle: "Top 10 連結數",
    rankingsHint: "以下統計會跟目前 filters 與顯示設定同步。",
    linksUnit: "連結",
    none: "無",
    loadError: "讀取 relation graph 資料時發生錯誤：",
    graphAria: "關聯圖"
  },
  en: {
    pageTitle: "Relation Graph",
    heroTitle: "Relation Graph",
    language: "Language",
    campaign: "Campaign",
    storyArc: "Story Arc",
    chapter: "Chapter",
    resetView: "Reset View",
    legend: "Legend",
    legendChapter: "Session / Chapter",
    legendPc: "PC",
    legendGuest: "Guest",
    legendNpc: "NPC",
    legendAppearance: "Chapter Appearance",
    legendRelated: "NPC Relation",
    clearSelection: "Clear Highlight",
    detailHint: "Click a node to view details here.",
    loading: "Loading data...",
    allCampaign: "All Campaigns",
    allArc: "All Story Arcs",
    allChapter: "All Chapters",
    allPc: "All PC",
    allGuest: "All Guest",
    allNpc: "All NPC",
    noData: "No data matches the current filters.",
    noMatch: "No relation data matches the current filters",
    statusShown: "Showing {chapters} chapters, {pcs} PC/guest, {npcs} NPC",
    chapterType: "Chapter",
    campaignsGroup: "Campaigns",
    arcsGroup: "Story Arcs",
    chaptersGroup: "Chapters",
    pcsGroup: "PC",
    guestsGroup: "Guest",
    npcsGroup: "NPC",
    pcLabel: "PC",
    guestLabel: "Guest",
    npcLabel: "NPC",
    pcGuestLabel: "PC / Guest",
    pcField: "PC",
    guestField: "Guest",
    npcField: "NPC",
    player: "Player",
    race: "Race",
    class: "Class",
    location: "Location",
    appearances: "Appearances",
    relatedNpcs: "NPC Relations",
    rankingsTitle: "Top 10 Link Counts",
    rankingsHint: "These stats follow the current filters and visibility settings.",
    linksUnit: "links",
    none: "None",
    loadError: "Failed to load relation graph data:",
    graphAria: "PC, NPC, and chapter relation graph"
  }
};

const state = {
  graphData: null,
  currentGraph: null,
  language: "zh",
  toggles: {
    campaigns: true,
    arcs: true,
    chapters: true,
    pcs: true,
    guests: true,
    npcs: true
  },
  selectedCampaign: "all",
  selectedArc: "all",
  selectedChapter: "all",
  selectedPc: "all",
  selectedGuest: "all",
  selectedNpc: "all",
  selectedNodeId: "",
  viewTransform: { x: 0, y: 0, scale: 1 },
  drag: null
};

const els = {
  campaignFilter: document.getElementById("campaign-filter"),
  languageButtons: document.querySelectorAll(".language-toggle button"),
  arcFilter: document.getElementById("arc-filter"),
  chapterFilter: document.getElementById("chapter-filter"),
  pcFilter: document.getElementById("pc-filter"),
  guestFilter: document.getElementById("guest-filter"),
  npcFilter: document.getElementById("npc-filter"),
  resetView: document.getElementById("reset-view"),
  clearSelection: document.getElementById("clear-selection"),
  countCampaigns: document.getElementById("count-campaigns"),
  countArcs: document.getElementById("count-arcs"),
  countChapters: document.getElementById("count-chapters"),
  countPcs: document.getElementById("count-pcs"),
  countGuests: document.getElementById("count-guests"),
  countNpcs: document.getElementById("count-npcs"),
  status: document.getElementById("status"),
  graph: document.getElementById("graph"),
  viewport: document.getElementById("viewport"),
  detailPanel: document.getElementById("detail-panel"),
  graphFrame: document.querySelector(".graph-frame"),
  rankingsGrid: document.getElementById("rankings-grid"),
  toggleCampaigns: document.getElementById("toggle-campaigns"),
  toggleArcs: document.getElementById("toggle-arcs"),
  toggleChapters: document.getElementById("toggle-chapters"),
  togglePcs: document.getElementById("toggle-pcs"),
  toggleGuests: document.getElementById("toggle-guests"),
  toggleNpcs: document.getElementById("toggle-npcs")
};

function t(key) {
  return (I18N[state.language] && I18N[state.language][key]) || key;
}

function normalize(value) {
  return `${value || ""}`.trim().toLowerCase();
}

function escapeHtml(value) {
  return `${value || ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createSvg(tagName, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attrs).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
  return node;
}

function setStatus(text) {
  els.status.textContent = text;
}

function applyStaticI18n() {
  document.documentElement.lang = state.language === "zh" ? "zh-Hant" : "en";
  document.title = t("pageTitle");
  const heroTitle = document.querySelector(".hero h1");
  if (heroTitle) heroTitle.textContent = t("heroTitle");
  if (els.languageButtons) {
    els.languageButtons.forEach((button) => {
      button.setAttribute("aria-pressed", button.dataset.lang === state.language ? "true" : "false");
    });
  }
  if (els.graph) els.graph.setAttribute("aria-label", t("graphAria"));
  document.querySelectorAll("[data-i18n-key]").forEach((node) => {
    const key = node.getAttribute("data-i18n-key");
    if (!key) return;
    node.textContent = t(key);
  });
}

function getCampaignLabel(id) {
  const configCampaign = (window.RUGATHA_CONFIG && window.RUGATHA_CONFIG.campaigns || []).find((item) => {
    if (!item || !item.page) return false;
    if (id === "rugatha-main") return /\/campaigns\/?$/.test(item.link || "");
    return item.page.includes(`/${id === "plus" ? "rugatha-plus" : id === "lite" ? "rugatha-lite" : id === "wilds" ? "rugatha-wilds" : id === "brown" ? "rugatha-brown" : "rugatha-legends"}/`);
  });
  const manual = {
    "rugatha-main": "Rugatha",
    plus: "Rugatha Plus",
    lite: "Rugatha lite",
    wilds: "Rugatha WILDS",
    brown: "Rugatha Brown",
    legends: "Rugatha Legends"
  };
  return (configCampaign && configCampaign.name) || manual[id] || id;
}

function getEntityDisplayLabel(entity) {
  if (!entity) return "";
  if (state.language === "en") return entity.nameEn || entity.label || entity.nameZh || "";
  return entity.nameZh || entity.label || entity.nameEn || "";
}

function getEntitySecondaryLabel(entity) {
  if (!entity) return "";
  if (entity.player) return entity.player;
  if (state.language === "en") return entity.nameZh || "";
  return entity.nameEn || "";
}

function getNodeCategory(entity) {
  if (entity.kindSet.has("npc")) return "npc";
  if (entity.kindSet.has("pc") && entity.kindSet.has("guest")) return "pc-guest";
  if (entity.kindSet.has("guest")) return "guest";
  return "pc";
}

function loadGraphMeta() {
  const allNodes = window.RUGATHA_CONFIG && window.RUGATHA_CONFIG.graph && Array.isArray(window.RUGATHA_CONFIG.graph.data)
    ? window.RUGATHA_CONFIG.graph.data
    : [];
  const campaigns = [];
  const arcs = [];
  const chapters = [];
  allNodes.forEach((node) => {
    if (!node || !node.id) return;
    if (node.level === 2 && CAMPAIGN_ORDER.includes(node.id)) campaigns.push(node);
    if (node.level === 3) arcs.push(node);
    if (node.level === 4) chapters.push(node);
  });
  campaigns.sort((a, b) => CAMPAIGN_ORDER.indexOf(a.id) - CAMPAIGN_ORDER.indexOf(b.id));
  return { campaigns, arcs, chapters };
}

function buildGraphDataset(resources) {
  const { meta, pcsJson, guestsJson, npcsJson, npcCharacters, chapterTitles, storyArcTitles, pcData } = resources;
  const pcInfoMap = new Map();
  (Array.isArray(pcData) ? pcData : []).forEach((entry) => {
    const nameEn = entry && entry.name_en;
    if (!nameEn) return;
    pcInfoMap.set(nameEn, {
      id: `pc:${nameEn}`,
      key: nameEn,
      nameEn,
      nameZh: entry.name_zh || "",
      raceEn: entry.race_en || "",
      raceZh: entry.race_zh || "",
      classEn: entry.class_en || "",
      classZh: entry.class_zh || "",
      player: entry.player || "",
      campaign: Array.isArray(entry.campaign)
        ? entry.campaign
        : [entry.campaign_1, entry.campaign_2].filter(Boolean),
      guest: entry.guest === "1"
    });
  });

  const npcMap = new Map();
  npcCharacters.forEach((npc) => {
    if (!npc || !npc.id) return;
    npcMap.set(npc.id, npc);
  });

  const chapterMap = new Map();
  meta.chapters.forEach((chapter, index) => {
    const titleEntry = chapterTitles[chapter.id] || {};
    const arcTitleEntry = storyArcTitles[chapter.parent] || {};
    const arcNode = meta.arcs.find((item) => item.id === chapter.parent);
    const campaignId = (arcNode && arcNode.parent) || "";
    chapterMap.set(chapter.id, {
      ...chapter,
      order: index,
      campaignId,
      campaignLabel: getCampaignLabel(campaignId),
      arcLabelZh: arcTitleEntry.zh || arcNode && arcNode.title || arcNode && arcNode.label || chapter.parent,
      arcLabelEn: arcTitleEntry.en || arcNode && arcNode.label || chapter.parent,
      labelZh: titleEntry.zh || chapter.title || chapter.label || chapter.id,
      labelEn: titleEntry.en || chapter.label || chapter.id
    });
  });

  const entityMap = new Map();
  const chapterEntityEdges = [];

  function ensurePcEntity(name) {
    const key = `pc:${name}`;
    if (!entityMap.has(key)) {
      const info = pcInfoMap.get(name) || { key: name, nameEn: name, nameZh: "", player: "" };
      entityMap.set(key, {
        id: key,
        type: "entity",
        nameEn: info.nameEn || name,
        nameZh: info.nameZh || "",
        label: info.nameZh || info.nameEn || name,
        secondaryLabel: info.nameZh && info.nameEn ? info.nameEn : info.player || "",
        player: info.player || "",
        details: info,
        kindSet: new Set()
      });
    }
    return entityMap.get(key);
  }

  function ensureNpcEntity(id) {
    const key = `npc:${id}`;
    if (!entityMap.has(key)) {
      const info = npcMap.get(id) || { id, nameEn: id, nameZh: "" };
      entityMap.set(key, {
        id: key,
        type: "entity",
        nameEn: info.nameEn || id,
        nameZh: info.nameZh || "",
        label: info.nameZh || info.nameEn || id,
        secondaryLabel: info.nameZh && info.nameEn ? info.nameEn : "",
        details: info,
        kindSet: new Set(["npc"])
      });
    }
    return entityMap.get(key);
  }

  function registerAppearance(chapterId, items, entityType) {
    items.forEach((rawValue) => {
      if (!rawValue) return;
      const entity = entityType === "npc" ? ensureNpcEntity(rawValue) : ensurePcEntity(rawValue);
      entity.kindSet.add(entityType);
      chapterEntityEdges.push({
        source: chapterId,
        target: entity.id,
        type: "appearance"
      });
    });
  }

  Object.entries((pcsJson && pcsJson.pcs) || {}).forEach(([chapterId, items]) => {
    registerAppearance(chapterId, Array.isArray(items) ? items : [], "pc");
  });
  Object.entries((guestsJson && guestsJson.guest) || {}).forEach(([chapterId, items]) => {
    registerAppearance(chapterId, Array.isArray(items) ? items : [], "guest");
  });
  Object.entries((npcsJson && npcsJson.npcs) || {}).forEach(([chapterId, items]) => {
    registerAppearance(chapterId, Array.isArray(items) ? items : [], "npc");
  });

  entityMap.forEach((entity) => {
    entity.category = getNodeCategory(entity);
  });

  const npcRelatedEdges = [];
  npcCharacters.forEach((npc) => {
    const relatedIds = Array.isArray(npc && npc.related) ? npc.related : [];
    relatedIds.forEach((relatedId) => {
      if (!npcMap.has(relatedId)) return;
      const source = `npc:${npc.id}`;
      const target = `npc:${relatedId}`;
      const pairKey = [source, target].sort().join("|");
      npcRelatedEdges.push({ source, target, type: "related", pairKey });
    });
  });

  const dedupedRelatedEdges = [];
  const relatedSeen = new Set();
  npcRelatedEdges.forEach((edge) => {
    if (relatedSeen.has(edge.pairKey)) return;
    relatedSeen.add(edge.pairKey);
    dedupedRelatedEdges.push(edge);
  });

  return {
    meta,
    chapterMap,
    entityMap,
    chapterEntityEdges,
    npcRelatedEdges: dedupedRelatedEdges,
    storyArcTitles
  };
}

function buildSelectOptions(select, items, selectedValue, allLabel) {
  const fragment = document.createDocumentFragment();
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = allLabel;
  fragment.appendChild(allOption);
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    if (item.value === selectedValue) option.selected = true;
    fragment.appendChild(option);
  });
  select.innerHTML = "";
  select.appendChild(fragment);
  select.value = selectedValue;
}

function updateFilterControls() {
  const { meta, chapterMap } = state.graphData;
  const campaignItems = meta.campaigns.map((campaign) => ({
    value: campaign.id,
    label: getCampaignLabel(campaign.id)
  }));
  buildSelectOptions(els.campaignFilter, campaignItems, state.selectedCampaign, t("allCampaign"));

  const arcItems = meta.arcs
    .filter((arc) => state.selectedCampaign === "all" || arc.parent === state.selectedCampaign)
    .map((arc) => ({
      value: arc.id,
      label: getArcDisplayLabel(arc)
    }));

  if (state.selectedArc !== "all" && !arcItems.some((item) => item.value === state.selectedArc)) {
    state.selectedArc = "all";
  }
  buildSelectOptions(els.arcFilter, arcItems, state.selectedArc, t("allArc"));

  const chapterItems = Array.from(chapterMap.values())
    .filter((chapter) => {
      if (state.selectedCampaign !== "all" && chapter.campaignId !== state.selectedCampaign) return false;
      if (state.selectedArc !== "all" && chapter.parent !== state.selectedArc) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order)
    .map((chapter) => ({
      value: chapter.id,
      label: `${getChapterDisplayLabel(chapter)} · ${chapter.id}`
    }));

  if (state.selectedChapter !== "all" && !chapterItems.some((item) => item.value === state.selectedChapter)) {
    state.selectedChapter = "all";
  }
  buildSelectOptions(els.chapterFilter, chapterItems, state.selectedChapter, t("allChapter"));

  const pcItems = getScopedEntitiesByCategory("pc").map((entity) => ({
    value: entity.id,
    label: getEntityDisplayLabel(entity)
  }));
  if (state.selectedPc !== "all" && !pcItems.some((item) => item.value === state.selectedPc)) {
    state.selectedPc = "all";
  }
  buildSelectOptions(els.pcFilter, pcItems, state.selectedPc, t("allPc"));

  const guestItems = getScopedGuestEntities().map((entity) => ({
    value: entity.id,
    label: getEntityDisplayLabel(entity)
  }));
  if (state.selectedGuest !== "all" && !guestItems.some((item) => item.value === state.selectedGuest)) {
    state.selectedGuest = "all";
  }
  buildSelectOptions(els.guestFilter, guestItems, state.selectedGuest, t("allGuest"));

  const npcItems = getScopedEntitiesByCategory("npc").map((entity) => ({
    value: entity.id,
    label: getEntityDisplayLabel(entity)
  }));
  if (state.selectedNpc !== "all" && !npcItems.some((item) => item.value === state.selectedNpc)) {
    state.selectedNpc = "all";
  }
  buildSelectOptions(els.npcFilter, npcItems, state.selectedNpc, t("allNpc"));
}

function getArcDisplayLabel(arc) {
  if (!arc) return "";
  const entry = state.graphData && state.graphData.storyArcTitles ? state.graphData.storyArcTitles[arc.id] : null;
  if (state.language === "en") return (entry && (entry.en || entry.zh)) || arc.label || arc.title || arc.id;
  return (entry && (entry.zh || entry.en)) || arc.title || arc.label || arc.id;
}

function getChapterDisplayLabel(chapter) {
  if (!chapter) return "";
  return state.language === "en" ? chapter.labelEn || chapter.labelZh || chapter.id : chapter.labelZh || chapter.labelEn || chapter.id;
}

function getDropdownScopedChapters() {
  return Array.from(state.graphData.chapterMap.values())
    .filter((chapter) => {
      if (state.selectedCampaign !== "all" && chapter.campaignId !== state.selectedCampaign) return false;
      if (state.selectedArc !== "all" && chapter.parent !== state.selectedArc) return false;
      if (state.selectedChapter !== "all" && chapter.id !== state.selectedChapter) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

function getScopedArcs() {
  return state.graphData.meta.arcs
    .filter((arc) => state.selectedCampaign === "all" || arc.parent === state.selectedCampaign)
    .sort((a, b) => getArcDisplayLabel(a).localeCompare(getArcDisplayLabel(b), state.language === "zh" ? "zh-Hant" : "en"));
}

function getScopedEntitiesByCategory(category) {
  const chapterIds = new Set(getDropdownScopedChapters().map((chapter) => chapter.id));
  const ids = new Set();
  state.graphData.chapterEntityEdges.forEach((edge) => {
    if (!chapterIds.has(edge.source)) return;
    const entity = state.graphData.entityMap.get(edge.target);
    if (!entity || entity.category !== category) return;
    ids.add(entity.id);
  });
  return Array.from(ids)
    .map((id) => state.graphData.entityMap.get(id))
    .filter(Boolean)
    .sort((a, b) => getEntityDisplayLabel(a).localeCompare(getEntityDisplayLabel(b), state.language === "zh" ? "zh-Hant" : "en"));
}

function getScopedGuestEntities() {
  return getScopedEntitiesByCategory("guest").concat(getScopedEntitiesByCategory("pc-guest"));
}

function getNodeSortLabel(node) {
  if (!node) return "";
  if (node.graphType === "chapter") return getChapterDisplayLabel(node.data);
  if (node.graphType === "arc") return getArcDisplayLabel(node.data);
  if (node.graphType === "campaign") return getCampaignLabel(node.data.id);
  return node.label || "";
}

function getPairDirection(a, b) {
  const seed = `${a.id}|${b.id}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180);
  return {
    x: Math.cos(angle) || 1,
    y: Math.sin(angle) || 0
  };
}

function buildVisibleGraph() {
  const { chapterMap, entityMap, chapterEntityEdges, npcRelatedEdges } = state.graphData;
  const scopedChapters = getDropdownScopedChapters();
  const scopedChapterIds = new Set(scopedChapters.map((chapter) => chapter.id));
  const scopedArcIds = new Set(scopedChapters.map((chapter) => chapter.parent));
  const scopedArcs = state.graphData.meta.arcs.filter((arc) => scopedArcIds.has(arc.id));
  const scopedCampaignIds = new Set(scopedArcs.map((arc) => arc.parent));
  const scopedCampaigns = state.graphData.meta.campaigns.filter((campaign) => scopedCampaignIds.has(campaign.id));
  const nodes = [];
  const nodeMap = new Map();
  const edges = [];
  const visibleNodeIds = new Set();

  const pushNode = (node) => {
    nodes.push(node);
    nodeMap.set(node.id, node);
    visibleNodeIds.add(node.id);
  };

  if (state.toggles.campaigns) {
    scopedCampaigns.forEach((campaign) => {
      pushNode({
        id: `campaign:${campaign.id}`,
        graphType: "campaign",
        category: "campaign",
        label: getCampaignLabel(campaign.id),
        secondaryLabel: "",
        detailTitle: getCampaignLabel(campaign.id),
        detailSubtitle: campaign.id,
        data: campaign
      });
    });
  }

  if (state.toggles.arcs) {
    scopedArcs.forEach((arc) => {
      pushNode({
        id: `arc:${arc.id}`,
        graphType: "arc",
        category: "arc",
        label: getArcDisplayLabel(arc),
        secondaryLabel: getCampaignLabel(arc.parent),
        detailTitle: getArcDisplayLabel(arc),
        detailSubtitle: arc.id,
        data: arc
      });
    });
  }

  if (state.toggles.chapters) {
    scopedChapters.forEach((chapter) => {
      pushNode({
        id: chapter.id,
        graphType: "chapter",
        category: "chapter",
        label: getChapterDisplayLabel(chapter),
        secondaryLabel: `${chapter.campaignLabel} / ${state.language === "en" ? chapter.arcLabelEn : chapter.arcLabelZh}`,
        detailTitle: getChapterDisplayLabel(chapter),
        detailSubtitle: state.language === "en" ? chapter.labelZh : chapter.labelEn,
        data: chapter
      });
    });
  }

  chapterEntityEdges.forEach((edge) => {
    if (!scopedChapterIds.has(edge.source)) return;
    const entity = entityMap.get(edge.target);
    if (!entity) return;
    if (entity.category === "pc" && !state.toggles.pcs) return;
    if ((entity.category === "guest" || entity.category === "pc-guest") && !state.toggles.guests) return;
    if (entity.category === "npc" && !state.toggles.npcs) return;
    if (entity.category === "pc" && state.selectedPc !== "all" && entity.id !== state.selectedPc) return;
    if ((entity.category === "guest" || entity.category === "pc-guest") && state.selectedGuest !== "all" && entity.id !== state.selectedGuest) return;
    if (entity.category === "npc" && state.selectedNpc !== "all" && entity.id !== state.selectedNpc) return;
    if (!nodeMap.has(entity.id)) {
      pushNode({
        id: entity.id,
        graphType: "entity",
        category: entity.category,
        label: getEntityDisplayLabel(entity),
        secondaryLabel: getEntitySecondaryLabel(entity),
        detailTitle: getEntityDisplayLabel(entity),
        detailSubtitle: getEntitySecondaryLabel(entity),
        data: entity
      });
    }
  });

  scopedArcs.forEach((arc) => {
    const campaignNodeId = `campaign:${arc.parent}`;
    const arcNodeId = `arc:${arc.id}`;
    if (visibleNodeIds.has(campaignNodeId) && visibleNodeIds.has(arcNodeId)) {
      edges.push({ source: campaignNodeId, target: arcNodeId, type: "hierarchy" });
    }
  });

  scopedChapters.forEach((chapter) => {
    const arcNodeId = `arc:${chapter.parent}`;
    if (visibleNodeIds.has(arcNodeId) && visibleNodeIds.has(chapter.id)) {
      edges.push({ source: arcNodeId, target: chapter.id, type: "hierarchy" });
    }
  });

  chapterEntityEdges.forEach((edge) => {
    if (!scopedChapterIds.has(edge.source)) return;
    if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return;
    edges.push(edge);
  });

  if (state.toggles.npcs) {
    npcRelatedEdges.forEach((edge) => {
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return;
      edges.push(edge);
    });
  }

  if (state.selectedNodeId && !nodeMap.has(state.selectedNodeId)) {
    state.selectedNodeId = "";
  }

  return { nodes, edges, nodeMap };
}

function computeLayout(graph) {
  const campaignNodes = graph.nodes.filter((node) => node.category === "campaign");
  const arcNodes = graph.nodes.filter((node) => node.category === "arc");
  const chapterNodes = graph.nodes.filter((node) => node.category === "chapter");
  const degreeMap = new Map();
  const neighborMap = new Map(graph.nodes.map((node) => [node.id, new Set()]));
  graph.edges.forEach((edge) => {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
    if (neighborMap.has(edge.source)) neighborMap.get(edge.source).add(edge.target);
    if (neighborMap.has(edge.target)) neighborMap.get(edge.target).add(edge.source);
  });

  const campaignIndexMap = new Map(campaignNodes.map((node, index) => [node.id, index]));
  const sortedArcs = [...arcNodes].sort((a, b) => {
    const parentDiff = (campaignIndexMap.get(`campaign:${a.data.parent}`) || 0) - (campaignIndexMap.get(`campaign:${b.data.parent}`) || 0);
    if (parentDiff !== 0) return parentDiff;
    return getNodeSortLabel(a).localeCompare(getNodeSortLabel(b), state.language === "zh" ? "zh-Hant" : "en");
  });
  const arcIndexMap = new Map(sortedArcs.map((node, index) => [node.id, index]));
  const chapterIndexMap = new Map(chapterNodes.map((node, index) => [node.id, index]));
  const chaptersByArc = new Map();
  chapterNodes.forEach((node) => {
    const arcId = node.data.parent;
    if (!chaptersByArc.has(arcId)) chaptersByArc.set(arcId, []);
    chaptersByArc.get(arcId).push(node);
  });
  chaptersByArc.forEach((nodes) => nodes.sort((a, b) => (a.data.order || 0) - (b.data.order || 0)));

  const chapterPositionHints = new Map();
  const chapterBandLeft = 420;
  const chapterBandRight = 1180;
  const chapterRowTop = 330;
  const chapterRowGap = 120;

  sortedArcs.forEach((arcNode, arcIndex) => {
    const siblings = chaptersByArc.get(arcNode.data.id) || [];
    const arcX = sortedArcs.length === 1
      ? (chapterBandLeft + chapterBandRight) / 2
      : chapterBandLeft + (arcIndex / Math.max(sortedArcs.length - 1, 1)) * (chapterBandRight - chapterBandLeft);
    siblings.forEach((chapterNode, siblingIndex) => {
      const direction = siblingIndex % 2 === 0 ? -1 : 1;
      const layer = Math.floor(siblingIndex / 2);
      chapterPositionHints.set(chapterNode.id, {
        x: arcX + direction * Math.min(140, 48 + layer * 26),
        y: chapterRowTop + (arcIndex % 4) * chapterRowGap + layer * 18
      });
    });
  });

  graph.nodes.forEach((node, index) => {
    const degree = degreeMap.get(node.id) || 0;
    const campaignIndex = campaignIndexMap.get(node.id);
    const arcIndex = arcIndexMap.get(node.id);
    node.degree = degree;
    node.radius =
      node.category === "campaign"
        ? 18
        : node.category === "arc"
          ? 16
          : node.category === "chapter"
            ? 14
            : Math.min(22, 7 + degree * 0.7);
    if (node.category === "campaign") {
      node.anchorX = campaignNodes.length === 1 ? 240 : 180 + (campaignIndex / Math.max(campaignNodes.length - 1, 1)) * 360;
      node.anchorY = 110;
    } else if (node.category === "arc") {
      const parentIndex = campaignIndexMap.get(`campaign:${node.data.parent}`) || 0;
      node.anchorX = sortedArcs.length === 1
        ? 520
        : 420 + (arcIndex / Math.max(sortedArcs.length - 1, 1)) * 760;
      node.anchorY = 220 + parentIndex * 18;
    } else if (node.category === "chapter") {
      const hint = chapterPositionHints.get(node.id) || { x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 };
      node.anchorX = hint.x;
      node.anchorY = hint.y;
    } else {
      const neighbors = Array.from(neighborMap.get(node.id) || []);
      const chapterNeighbors = neighbors
        .map((neighborId) => graph.nodeMap.get(neighborId))
        .filter((neighbor) => neighbor && neighbor.category === "chapter");
      const avgChapterX = chapterNeighbors.length
        ? chapterNeighbors.reduce((sum, neighbor) => sum + (chapterPositionHints.get(neighbor.id)?.x || neighbor.anchorX || GRAPH_WIDTH / 2), 0) / chapterNeighbors.length
        : GRAPH_WIDTH / 2;
      const avgChapterY = chapterNeighbors.length
        ? chapterNeighbors.reduce((sum, neighbor) => sum + (chapterPositionHints.get(neighbor.id)?.y || neighbor.anchorY || GRAPH_HEIGHT / 2), 0) / chapterNeighbors.length
        : GRAPH_HEIGHT / 2;
      if (node.category === "pc") {
        node.anchorX = Math.max(150, avgChapterX - 260);
        node.anchorY = avgChapterY - 56;
      } else if (node.category === "guest" || node.category === "pc-guest") {
        node.anchorX = avgChapterX;
        node.anchorY = Math.min(GRAPH_HEIGHT - 120, avgChapterY + 170);
      } else {
        node.anchorX = Math.min(GRAPH_WIDTH - 150, avgChapterX + 280);
        node.anchorY = avgChapterY + 24;
      }
    }
    const offsetX = ((index % 7) - 3) * 14;
    const offsetY = ((Math.floor(index / 7) % 5) - 2) * 14;
    node.x = node.anchorX + offsetX;
    node.y = node.anchorY + offsetY;
    node.vx = 0;
    node.vy = 0;
  });

  const edgeNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const pairs = [];
  for (let i = 0; i < graph.nodes.length; i += 1) {
    for (let j = i + 1; j < graph.nodes.length; j += 1) {
      pairs.push([graph.nodes[i], graph.nodes[j]]);
    }
  }

  for (let tick = 0; tick < 280; tick += 1) {
    pairs.forEach(([a, b]) => {
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        const direction = getPairDirection(a, b);
        dx = direction.x * 0.8;
        dy = direction.y * 0.8;
      }
      const distSq = dx * dx + dy * dy + 0.01;
      const dist = Math.sqrt(distSq);
      const repel = 2200 / distSq;
      const fx = (dx / dist) * repel;
      const fy = (dy / dist) * repel;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;

      const categoryPadding = a.category !== b.category ? 38 : 18;
      const minDist = a.radius + b.radius + categoryPadding;
      if (dist < minDist) {
        const push = ((minDist - dist) / Math.max(minDist, 1)) * 1.3;
        const cfx = (dx / dist) * push;
        const cfy = (dy / dist) * push;
        a.vx -= cfx;
        a.vy -= cfy;
        b.vx += cfx;
        b.vy += cfy;
      }
    });

    graph.edges.forEach((edge) => {
      const source = edgeNodes.get(edge.source);
      const target = edgeNodes.get(edge.target);
      if (!source || !target) return;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const desired = edge.type === "hierarchy" ? 120 : edge.type === "related" ? 180 : 155;
      const spring = (dist - desired) * (edge.type === "related" ? 0.0016 : edge.type === "hierarchy" ? 0.0042 : 0.0028);
      const fx = (dx / dist) * spring;
      const fy = (dy / dist) * spring;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    graph.nodes.forEach((node) => {
      node.vx += (node.anchorX - node.x) * 0.003;
      node.vy += (node.anchorY - node.y) * 0.003;
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x = Math.max(70, Math.min(GRAPH_WIDTH - 70, node.x + node.vx));
      node.y = Math.max(70, Math.min(GRAPH_HEIGHT - 70, node.y + node.vy));
    });
  }

  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false;
    pairs.forEach(([a, b]) => {
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
        const direction = getPairDirection(a, b);
        dx = direction.x;
        dy = direction.y;
      }
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = a.radius + b.radius + (a.category !== b.category ? 42 : 20);
      if (dist >= minDist) return;
      moved = true;
      const overlap = (minDist - dist) / 2;
      const ux = dx / dist;
      const uy = dy / dist;
      a.x = Math.max(70, Math.min(GRAPH_WIDTH - 70, a.x - ux * overlap));
      a.y = Math.max(70, Math.min(GRAPH_HEIGHT - 70, a.y - uy * overlap));
      b.x = Math.max(70, Math.min(GRAPH_WIDTH - 70, b.x + ux * overlap));
      b.y = Math.max(70, Math.min(GRAPH_HEIGHT - 70, b.y + uy * overlap));
    });
    if (!moved) break;
  }
}

function buildDetailHtml(node, graph) {
  if (!node) {
    return `<p class="detail-panel__hint">${escapeHtml(t("detailHint"))}</p>`;
  }
  const relatedEdges = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  const neighbors = relatedEdges
    .map((edge) => graph.nodeMap.get(edge.source === node.id ? edge.target : edge.source))
    .filter(Boolean);

  if (node.graphType === "campaign") {
    const arcNames = neighbors.filter((item) => item.category === "arc").map((item) => item.label);
    return `
      <h3>${escapeHtml(node.detailTitle)}</h3>
      <p class="detail-panel__meta">${escapeHtml(node.detailSubtitle || "")}</p>
      <ul class="detail-panel__list">
        <li>${escapeHtml(t("arcsGroup"))}: ${escapeHtml(arcNames.join("、") || t("none"))}</li>
      </ul>
    `;
  }

  if (node.graphType === "arc") {
    const chapterNames = neighbors.filter((item) => item.category === "chapter").map((item) => item.label);
    return `
      <h3>${escapeHtml(node.detailTitle)}</h3>
      <p class="detail-panel__meta">${escapeHtml(node.detailSubtitle || "")}</p>
      <ul class="detail-panel__list">
        <li>${escapeHtml(t("chaptersGroup"))}: ${escapeHtml(chapterNames.join("、") || t("none"))}</li>
      </ul>
    `;
  }

  if (node.graphType === "chapter") {
    const chapter = node.data;
    const grouped = { pc: [], guest: [], npc: [] };
    neighbors.forEach((item) => {
      if (item.category === "npc") grouped.npc.push(item.label);
      else if (item.category === "guest" || item.category === "pc-guest") grouped.guest.push(item.label);
      else grouped.pc.push(item.label);
    });
    return `
      <h3>${escapeHtml(node.detailTitle)}</h3>
      <p class="detail-panel__meta">${escapeHtml(chapter.campaignLabel)} / ${escapeHtml(state.language === "en" ? chapter.arcLabelEn : chapter.arcLabelZh)}</p>
      <p class="detail-panel__meta">${escapeHtml(node.detailSubtitle || chapter.id)}</p>
      <ul class="detail-panel__list">
        <li>${escapeHtml(t("pcField"))}: ${escapeHtml(grouped.pc.join("、") || t("none"))}</li>
        <li>${escapeHtml(t("guestField"))}: ${escapeHtml(grouped.guest.join("、") || t("none"))}</li>
        <li>${escapeHtml(t("npcField"))}: ${escapeHtml(grouped.npc.join("、") || t("none"))}</li>
      </ul>
    `;
  }

  const entity = node.data;
  const appearanceChapters = relatedEdges
    .filter((edge) => edge.type === "appearance")
    .map((edge) => graph.nodeMap.get(edge.source === node.id ? edge.target : edge.source))
    .filter((item) => item && item.graphType === "chapter")
    .map((item) => item.label);
  const relatedNpcs = relatedEdges
    .filter((edge) => edge.type === "related")
    .map((edge) => graph.nodeMap.get(edge.source === node.id ? edge.target : edge.source))
    .filter(Boolean)
    .map((item) => item.label);

  const metaLines = [];
  const raceValue = entity.details && (state.language === "en" ? entity.details.raceEn : entity.details.raceZh);
  const classValue = entity.details && (state.language === "en" ? entity.details.classEn : entity.details.classZh);
  const locationValue = entity.details && (state.language === "en" ? entity.details.locationEn : entity.details.locationZh);
  if (entity.player) metaLines.push(`${t("player")}: ${entity.player}`);
  if (raceValue) metaLines.push(`${t("race")}: ${Array.isArray(raceValue) ? raceValue.join("、") : raceValue}`);
  if (classValue) metaLines.push(`${t("class")}: ${classValue}`);
  if (Array.isArray(locationValue) && locationValue.length) metaLines.push(`${t("location")}: ${locationValue.join("、")}`);

  return `
    <h3>${escapeHtml(node.detailTitle)}</h3>
    <p class="detail-panel__meta">${escapeHtml(node.category === "chapter" ? t("chapterType") : node.category === "pc-guest" ? t("pcGuestLabel") : t(`${node.category}Label`) || node.category)}${node.detailSubtitle ? ` / ${escapeHtml(node.detailSubtitle)}` : ""}</p>
    ${metaLines.map((line) => `<p class="detail-panel__meta">${escapeHtml(line)}</p>`).join("")}
    <ul class="detail-panel__list">
      <li>${escapeHtml(t("appearances"))}: ${escapeHtml(appearanceChapters.join("、") || t("none"))}</li>
      <li>${escapeHtml(t("relatedNpcs"))}: ${escapeHtml(relatedNpcs.join("、") || t("none"))}</li>
    </ul>
  `;
}

function fitGraphToViewport(graph, preserveSelection) {
  if (!graph.nodes.length) {
    state.viewTransform = { x: 0, y: 0, scale: 1 };
    applyViewportTransform();
    return;
  }
  const bounds = getRobustBounds(graph.nodes);
  const minX = bounds ? bounds.minX : Math.min(...graph.nodes.map((node) => node.x - node.radius));
  const maxX = bounds ? bounds.maxX : Math.max(...graph.nodes.map((node) => node.x + node.radius));
  const minY = bounds ? bounds.minY : Math.min(...graph.nodes.map((node) => node.y - node.radius));
  const maxY = bounds ? bounds.maxY : Math.max(...graph.nodes.map((node) => node.y + node.radius));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(1.15, Math.max(0.48, Math.min((GRAPH_WIDTH - 120) / width, (GRAPH_HEIGHT - 120) / height)));
  state.viewTransform = {
    scale,
    x: GRAPH_WIDTH / 2 - (minX + width / 2) * scale,
    y: GRAPH_HEIGHT / 2 - (minY + height / 2) * scale
  };
  if (!preserveSelection) state.selectedNodeId = state.selectedNodeId || "";
  applyViewportTransform();
}

function applyViewportTransform() {
  const { x, y, scale } = state.viewTransform;
  els.viewport.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
}

function clearSelection() {
  state.selectedNodeId = "";
  if (!state.currentGraph) return;
  renderGraph(state.currentGraph, { recomputeLayout: false, refitViewport: false });
}

function getRobustBounds(nodes) {
  if (!nodes.length) return null;
  const sortedX = nodes.map((node) => node.x).sort((a, b) => a - b);
  const sortedY = nodes.map((node) => node.y).sort((a, b) => a - b);
  const trimRatio = nodes.length > 24 ? 0.08 : 0;
  const lowIndex = Math.floor((sortedX.length - 1) * trimRatio);
  const highIndex = Math.ceil((sortedX.length - 1) * (1 - trimRatio));
  return {
    minX: sortedX[lowIndex] - 70,
    maxX: sortedX[highIndex] + 70,
    minY: sortedY[lowIndex] - 70,
    maxY: sortedY[highIndex] + 70
  };
}

function getRankingGroups(graph) {
  return [
    { title: t("campaignsGroup"), categories: ["campaign"] },
    { title: t("arcsGroup"), categories: ["arc"] },
    { title: t("chaptersGroup"), categories: ["chapter"] },
    { title: t("pcsGroup"), categories: ["pc"] },
    { title: t("guestsGroup"), categories: ["guest", "pc-guest"] },
    { title: t("npcsGroup"), categories: ["npc"] }
  ];
}

function renderRankings(graph) {
  if (!els.rankingsGrid) return;
  const degreeMap = new Map();
  graph.nodes.forEach((node) => degreeMap.set(node.id, 0));
  graph.edges.forEach((edge) => {
    if (degreeMap.has(edge.source)) degreeMap.set(edge.source, degreeMap.get(edge.source) + 1);
    if (degreeMap.has(edge.target)) degreeMap.set(edge.target, degreeMap.get(edge.target) + 1);
  });

  els.rankingsGrid.innerHTML = getRankingGroups(graph).map((group) => {
    const items = graph.nodes
      .filter((node) => group.categories.includes(node.category))
      .map((node) => ({
        name: node.label,
        degree: degreeMap.get(node.id) || 0
      }))
      .sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name, state.language === "zh" ? "zh-Hant" : "en"))
      .slice(0, 10);

    const body = items.length
      ? `<ol class="ranking-list">${items
          .map(
            (item, index) => `
              <li class="ranking-item">
                <span class="ranking-item__name"><span class="ranking-item__rank">${index + 1}.</span> ${escapeHtml(item.name)}</span>
                <span class="ranking-item__degree">${item.degree} ${escapeHtml(t("linksUnit"))}</span>
              </li>
            `
          )
          .join("")}</ol>`
      : `<div class="ranking-empty">${escapeHtml(t("none"))}</div>`;

    return `
      <article class="ranking-card">
        <h3 class="ranking-card__title">${escapeHtml(group.title)}</h3>
        ${body}
      </article>
    `;
  }).join("");
}

function renderGraph(graph, options = {}) {
  const { recomputeLayout = true, refitViewport = true } = options;
  els.viewport.innerHTML = "";
  if (!graph.nodes.length) {
    els.detailPanel.innerHTML = `<p class="detail-panel__hint">${escapeHtml(t("noData"))}</p>`;
    setStatus(t("noMatch"));
    if (els.countCampaigns) els.countCampaigns.textContent = "0";
    if (els.countArcs) els.countArcs.textContent = "0";
    els.countChapters.textContent = "0";
    els.countPcs.textContent = "0";
    if (els.countGuests) els.countGuests.textContent = "0";
    els.countNpcs.textContent = "0";
    renderRankings(graph);
    return;
  }

  if (recomputeLayout || !graph.layoutReady) {
    computeLayout(graph);
    graph.layoutReady = true;
  }
  if (refitViewport) {
    fitGraphToViewport(graph, true);
  } else {
    applyViewportTransform();
  }

  const selectedId = state.selectedNodeId;
  const selectedNode = selectedId ? graph.nodeMap.get(selectedId) : null;
  const neighborSet = new Set();
  if (selectedNode) {
    graph.edges.forEach((edge) => {
      if (edge.source === selectedId) neighborSet.add(edge.target);
      if (edge.target === selectedId) neighborSet.add(edge.source);
    });
  }

  const edgeLayer = createSvg("g");
  const nodeLayer = createSvg("g");
  els.viewport.appendChild(edgeLayer);
  els.viewport.appendChild(nodeLayer);

  graph.edges.forEach((edge) => {
    const source = graph.nodeMap.get(edge.source);
    const target = graph.nodeMap.get(edge.target);
    if (!source || !target) return;
    const line = createSvg("line", {
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
      class: `edge edge--${edge.type}${selectedNode && selectedId !== edge.source && selectedId !== edge.target ? " edge--muted" : ""}`
    });
    edgeLayer.appendChild(line);
  });

  graph.nodes.forEach((node) => {
    const isSelected = selectedId === node.id;
    const isNeighbor = neighborSet.has(node.id);
    const featured = isSelected || isNeighbor;
    const g = createSvg("g", {
      class: `node node--${node.category}${isSelected ? " node--selected" : ""}${selectedNode && !featured && !isSelected ? " node--muted" : ""}${featured ? " node--featured" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": node.label
    });

    const circle = createSvg("circle", {
      class: "node__circle",
      cx: node.x,
      cy: node.y,
      r: node.radius
    });

    const label = createSvg("text", {
      class: "node__label",
      x: node.x + node.radius + 8,
      y: node.y + 4
    });
    label.textContent = node.label;

    const selectNode = () => {
      state.selectedNodeId = node.id;
      els.detailPanel.innerHTML = buildDetailHtml(node, graph);
      renderGraph(graph, { recomputeLayout: false, refitViewport: false });
    };
    let nodePointerDown = false;
    let nodeMoved = false;
    g.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      nodePointerDown = true;
      nodeMoved = false;
      state.drag = {
        mode: "node",
        nodeId: node.id,
        pointerX: event.clientX,
        pointerY: event.clientY,
        startX: node.x,
        startY: node.y
      };
      g.setPointerCapture(event.pointerId);
      els.graph.classList.add("is-dragging");
    });
    g.addEventListener("pointermove", (event) => {
      if (!state.drag || state.drag.mode !== "node" || state.drag.nodeId !== node.id) return;
      const scaleX = GRAPH_WIDTH / els.graph.clientWidth;
      const scaleY = GRAPH_HEIGHT / els.graph.clientHeight;
      const dx = (event.clientX - state.drag.pointerX) * scaleX / state.viewTransform.scale;
      const dy = (event.clientY - state.drag.pointerY) * scaleY / state.viewTransform.scale;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) nodeMoved = true;
      node.x = Math.max(70, Math.min(GRAPH_WIDTH - 70, state.drag.startX + dx));
      node.y = Math.max(70, Math.min(GRAPH_HEIGHT - 70, state.drag.startY + dy));
      node.anchorX = node.x;
      node.anchorY = node.y;
      renderGraph(graph, { recomputeLayout: false, refitViewport: false });
    });
    g.addEventListener("pointerup", (event) => {
      if (state.drag && state.drag.mode === "node" && state.drag.nodeId === node.id) {
        state.drag = null;
        els.graph.classList.remove("is-dragging");
      }
      if (nodePointerDown && !nodeMoved) {
        selectNode();
      }
      nodePointerDown = false;
      nodeMoved = false;
      g.releasePointerCapture(event.pointerId);
    });
    g.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode();
      }
    });

    g.appendChild(circle);
    g.appendChild(label);
    nodeLayer.appendChild(g);
  });

  const campaignCount = graph.nodes.filter((node) => node.category === "campaign").length;
  const arcCount = graph.nodes.filter((node) => node.category === "arc").length;
  const pcCount = graph.nodes.filter((node) => node.category === "pc").length;
  const guestCount = graph.nodes.filter((node) => ["guest", "pc-guest"].includes(node.category)).length;
  const npcCount = graph.nodes.filter((node) => node.category === "npc").length;
  const chapterCount = graph.nodes.filter((node) => node.category === "chapter").length;
  if (els.countCampaigns) els.countCampaigns.textContent = `${campaignCount}`;
  if (els.countArcs) els.countArcs.textContent = `${arcCount}`;
  els.countChapters.textContent = `${chapterCount}`;
  els.countPcs.textContent = `${pcCount}`;
  if (els.countGuests) els.countGuests.textContent = `${guestCount}`;
  els.countNpcs.textContent = `${npcCount}`;
  els.detailPanel.innerHTML = buildDetailHtml(selectedNode, graph);
  setStatus(t("statusShown").replace("{chapters}", chapterCount).replace("{pcs}", pcCount + guestCount).replace("{npcs}", npcCount));
  renderRankings(graph);
}

function refresh() {
  updateFilterControls();
  const graph = buildVisibleGraph();
  state.currentGraph = graph;
  renderGraph(graph);
}

function handleZoom(event) {
  event.preventDefault();
  const delta = event.deltaY < 0 ? 1.1 : 0.92;
  const nextScale = Math.max(0.32, Math.min(2.4, state.viewTransform.scale * delta));
  const point = els.graph.createSVGPoint();
  point.x = event.offsetX * (GRAPH_WIDTH / els.graph.clientWidth);
  point.y = event.offsetY * (GRAPH_HEIGHT / els.graph.clientHeight);
  const graphX = (point.x - state.viewTransform.x) / state.viewTransform.scale;
  const graphY = (point.y - state.viewTransform.y) / state.viewTransform.scale;
  state.viewTransform.scale = nextScale;
  state.viewTransform.x = point.x - graphX * nextScale;
  state.viewTransform.y = point.y - graphY * nextScale;
  applyViewportTransform();
}

function installPanAndZoom() {
  els.graph.addEventListener("wheel", handleZoom, { passive: false });
  els.graph.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".node")) return;
    state.drag = {
      mode: "pan",
      x: event.clientX,
      y: event.clientY,
      viewX: state.viewTransform.x,
      viewY: state.viewTransform.y
    };
    els.graph.classList.add("is-dragging");
  });
  window.addEventListener("pointermove", (event) => {
    if (!state.drag) return;
    if (state.drag.mode !== "pan") return;
    const dx = (event.clientX - state.drag.x) * (GRAPH_WIDTH / els.graph.clientWidth);
    const dy = (event.clientY - state.drag.y) * (GRAPH_HEIGHT / els.graph.clientHeight);
    state.viewTransform.x = state.drag.viewX + dx;
    state.viewTransform.y = state.drag.viewY + dy;
    applyViewportTransform();
  });
  window.addEventListener("pointerup", () => {
    if (!state.drag) return;
    state.drag = null;
    els.graph.classList.remove("is-dragging");
  });
}

function installEvents() {
  els.campaignFilter.addEventListener("change", (event) => {
    state.selectedCampaign = event.target.value;
    if (state.selectedCampaign !== "all") {
      const arc = state.graphData.meta.arcs.find((item) => item.id === state.selectedArc);
      if (arc && arc.parent !== state.selectedCampaign) state.selectedArc = "all";
    }
    state.selectedChapter = "all";
    refresh();
  });
  if (els.languageButtons) {
    els.languageButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!button.dataset.lang || button.dataset.lang === state.language) return;
        state.language = button.dataset.lang;
        applyStaticI18n();
        refresh();
      });
    });
  }
  els.arcFilter.addEventListener("change", (event) => {
    state.selectedArc = event.target.value;
    state.selectedChapter = "all";
    const arc = state.graphData.meta.arcs.find((item) => item.id === state.selectedArc);
    if (arc) state.selectedCampaign = arc.parent;
    refresh();
  });
  els.chapterFilter.addEventListener("change", (event) => {
    state.selectedChapter = event.target.value;
    if (state.selectedChapter !== "all") {
      const chapter = state.graphData.chapterMap.get(state.selectedChapter);
      if (chapter) {
        state.selectedCampaign = chapter.campaignId;
        state.selectedArc = chapter.parent;
      }
    }
    refresh();
  });
  els.pcFilter.addEventListener("change", (event) => {
    state.selectedPc = event.target.value;
    refresh();
  });
  els.guestFilter.addEventListener("change", (event) => {
    state.selectedGuest = event.target.value;
    refresh();
  });
  els.npcFilter.addEventListener("change", (event) => {
    state.selectedNpc = event.target.value;
    refresh();
  });
  els.resetView.addEventListener("click", () => {
    if (!state.currentGraph) return;
    fitGraphToViewport(state.currentGraph, true);
  });
  els.clearSelection.addEventListener("click", () => {
    clearSelection();
  });
  [
    ["toggleCampaigns", "campaigns"],
    ["toggleArcs", "arcs"],
    ["toggleChapters", "chapters"],
    ["togglePcs", "pcs"],
    ["toggleGuests", "guests"],
    ["toggleNpcs", "npcs"]
  ].forEach(([elementKey, stateKey]) => {
    const element = els[elementKey];
    if (!element) return;
    element.checked = state.toggles[stateKey];
    element.addEventListener("change", (event) => {
      state.toggles[stateKey] = event.target.checked;
      refresh();
    });
  });
  els.detailPanel.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input, select, textarea")) return;
    clearSelection();
  });
}

function installResizeHandling() {
  const refit = () => {
    if (!state.currentGraph || !state.currentGraph.nodes.length) return;
    requestAnimationFrame(() => {
      renderGraph(state.currentGraph, { recomputeLayout: false, refitViewport: true });
    });
  };
  if (typeof window !== "undefined") {
    window.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
  }
  if (!els.graphFrame || typeof ResizeObserver === "undefined") return;
  const observer = new ResizeObserver(() => {
    refit();
  });
  observer.observe(els.graphFrame);
}

async function init() {
  try {
    applyStaticI18n();
    setStatus(t("loading"));
    const meta = loadGraphMeta();
    const [pcsJson, guestsJson, npcsJson, npcCharacters, chapterTitles, storyArcTitles, pcData] = await Promise.all([
      fetch(DATA_URLS.pcs, { cache: "no-store" }).then((res) => res.json()),
      fetch(DATA_URLS.guests, { cache: "no-store" }).then((res) => res.json()),
      fetch(DATA_URLS.npcs, { cache: "no-store" }).then((res) => res.json()),
      fetch(DATA_URLS.npcCharacters, { cache: "no-store" }).then((res) => res.json()),
      fetch(DATA_URLS.chapterTitles, { cache: "no-store" }).then((res) => res.json()),
      fetch(DATA_URLS.storyArcTitles, { cache: "no-store" }).then((res) => res.json()),
      fetch(DATA_URLS.pcLib, { cache: "no-store" }).then((res) => res.json())
    ]);

    state.graphData = buildGraphDataset({
      meta,
      pcsJson,
      guestsJson,
      npcsJson,
      npcCharacters,
      chapterTitles,
      storyArcTitles,
      pcData
    });
    installEvents();
    installPanAndZoom();
    installResizeHandling();
    refresh();
    requestAnimationFrame(() => {
      if (!state.currentGraph || !state.currentGraph.nodes.length) return;
      renderGraph(state.currentGraph, { recomputeLayout: false, refitViewport: true });
    });
  } catch (error) {
    console.error(error);
    setStatus(t("loadError"));
    els.detailPanel.innerHTML = `<p class="detail-panel__hint">${escapeHtml(t("loadError"))} ${escapeHtml(error && error.message ? error.message : String(error))}</p>`;
  }
}

init();
