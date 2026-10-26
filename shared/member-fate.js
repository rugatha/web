// Only allow known NPC pages as destinations for recorded choices.
export const normalizeFatePath = (value) => {
  const path = String(value || "").replace(/^\/+/, "");
  return /^npc\/npc_page\/pages\/[\w-]+\.html$/.test(path) ? path : "";
};

export const choiceShare = (choice, stats) => {
  if (!["C1", "C2"].includes(choice) || !stats) return null;
  const total = Number(stats.total);
  const count = Number(stats[choice === "C1" ? "c1" : "c2"]);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(count) || count < 0 || count > total) return null;
  return { count, total, percent: count / total * 100 };
};

// Count each NPC once, and only offer complete, playable questions.
export const availableFateNpcs = (catalog) => {
  const seen = new Set();
  return catalog.filter((npc) => {
    const path = normalizeFatePath(npc.url);
    const qa = npc.qaZh || npc.qa || npc.qaEn;
    if (!path || seen.has(path) || !qa?.Q || !qa.C1 || !qa.C2 || !qa.R1 || !qa.R2) return false;
    seen.add(path);
    return true;
  });
};

export const pickFateNpc = (catalog, entries, random = Math.random) => {
  const eligible = availableFateNpcs(catalog);
  const answered = new Set(entries.map((entry) => normalizeFatePath(entry.questionPage)));
  const unanswered = eligible.filter((npc) => !answered.has(normalizeFatePath(npc.url)));
  const pool = unanswered;
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
};
