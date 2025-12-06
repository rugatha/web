const npcId = getRequestedNpc();

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

function getSlugId(pathname = window.location.pathname) {
  const parts = (pathname || "").split("/");
  const last = parts.filter(Boolean).pop() || "";
  return last.replace(/\.html?$/i, "");
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
  const last = (url.split("/").pop() || "").replace(/\.html?$/i, "");
  return normalize(last);
}

function normalizeRelatedUrl(url) {
  if (!url) return "#";
  if (url.startsWith("npc_page/pages/")) return "../../" + url;
  if (url.startsWith("npc/npc_page/pages/")) return "../../" + url.slice(4);
  return url;
}

function resolveRelated(chars, relatedIds = []) {
  if (!Array.isArray(relatedIds) || !relatedIds.length) return [];
  const byId = new Map();
  chars.forEach((c) => {
    const key = normalize(c.id || c.name);
    if (key) byId.set(key, c);
  });
  const result = [];
  relatedIds.forEach((rid) => {
    const key = normalize(rid);
    const match = key ? byId.get(key) : null;
    if (match && match.name) {
      result.push({ name: match.name, url: normalizeRelatedUrl(match.url) });
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
  const inlineNpc =
    npcMap[npcId] ||
    Object.values(npcMap).find((entry) => normalize(entry.id || entry.name) === normalize(npcId)) ||
    Object.values(npcMap)[0];

  const baseNpc = inlineNpc || {
    id: npcId || "npc",
    name: inlineNpc?.name || npcId || "NPC",
    image: "",
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
    mergedNpc.descZh = record.descZh || mergedNpc.descZh;
    mergedNpc.descEn = record.descEn || mergedNpc.descEn;
    mergedNpc.related = resolveRelated(chars, record.related || mergedNpc.related);
  }

  ensurePrettyUrl(mergedNpc.id || mergedNpc.name);
  render(mergedNpc);
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
