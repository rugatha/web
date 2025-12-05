const params = new URLSearchParams(window.location.search);
const npcId = params.get("npc") || "ada";

const elements = {
  name: document.getElementById("npc-name"),
  portrait: document.getElementById("npc-portrait"),
  zh: document.getElementById("npc-desc-zh"),
  en: document.getElementById("npc-desc-en"),
  content: document.querySelector(".content")
};

let charactersCache = null;

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
  return (str || "").toLowerCase().replace(/[^0-9a-z]/g, "");
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

function findCharacter(chars, name, id) {
  const key = normalize(id || name);
  return chars.find((c) => normalize(c.id || c.name) === key);
}

function findRelated(chars, npc, descZh, descEn) {
  const textEn = (descEn || "").toLowerCase();
  const textZh = descZh || "";
  const related = [];
  chars.forEach((c) => {
    if (!c.name || !c.url) return;
    if (normalize(c.id || c.name) === normalize(npc.id || npc.name)) return;
    const nameEn = c.name.toLowerCase();
    const nameZh = c.name;
    const tokens = nameTokens(c.name);
    const tokenHit = tokens.some((tok) => textEn.match(new RegExp(`\\b${tok}\\b`)));
    const fullHit =
      nameEn &&
      textEn.match(new RegExp(`\\b${nameEn.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, "\\\\$&")}\\b`));
    const matchEn = tokenHit || fullHit;
    const matchZh = nameZh && textZh.includes(nameZh);
    if (matchEn || matchZh) {
      related.push({ name: c.name, url: normalizeRelatedUrl(c.url) });
    }
  });
  return related;
}

function nameTokens(name) {
  const cleaned = (name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!cleaned) return [];
  const stop = new Set([
    "the",
    "of",
    "and",
    "lord",
    "lady",
    "king",
    "queen",
    "mr",
    "mrs",
    "ms",
    "sir",
    "dr",
    "captain",
    "young",
    "evil",
    "from",
    "father",
    "mother",
    "Macksohn",
    "Evil"
  ]);
  return cleaned.split(/\s+/).filter((tok) => tok && !stop.has(tok));
}

function normalizeRelatedUrl(url) {
  if (!url) return "#";
  if (url.startsWith("npc_page/pages/")) return "../../" + url;
  if (url.startsWith("npc/npc_page/pages/")) return "../../../" + url.slice(4);
  return url;
}

function render(npc) {
  elements.name.textContent = npc.name || "NPC";
  elements.portrait.src = npc.image || "";
  elements.portrait.alt = npc.name || "NPC portrait";
  setDescription(elements.zh, npc.descZh, "（尚無中文介紹）");
  setDescription(elements.en, npc.descEn, "(Description coming soon)");
  document.title = npc.name ? `${npc.name} | NPC` : "NPC";
  insertRelated(npc.related || []);
}

(async function init() {
  const npcMap = loadInlineData();
  const npc = npcMap[npcId] || Object.values(npcMap)[0];
  const baseNpc = npc || {
    id: "npc",
    name: "NPC",
    image: "",
    descZh: "找不到該 NPC。",
    descEn: "NPC not found."
  };

  const chars = await loadCharacters();
  const record = findCharacter(chars, baseNpc.name, baseNpc.id);
  if (record) {
    baseNpc.name = record.name || baseNpc.name;
    baseNpc.image = resolveImage(record.image) || baseNpc.image;
    baseNpc.related = findRelated(chars, baseNpc, baseNpc.descZh, baseNpc.descEn);
  }

  render(baseNpc);
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

function insertRelated(items) {
  if (!elements.content || !items.length) return;
  const wrap = document.createElement("div");
  wrap.className = "related";
  const title = document.createElement("h3");
  title.textContent = "相關 NPC / Related";
  wrap.appendChild(title);

  const list = document.createElement("div");
  list.className = "related-list";
  items.forEach((item) => {
    const a = document.createElement("a");
    a.className = "related-chip";
    a.href = item.url || "#";
    a.textContent = item.name;
    list.appendChild(a);
  });
  wrap.appendChild(list);
  elements.content.appendChild(wrap);
}
