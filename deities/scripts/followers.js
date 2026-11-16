const deityNpcIds = new Set(["Lysien_Amoret", "King_Knicol"]);
const normalize = value => String(value || "").trim().toLowerCase();
const list = value => Array.isArray(value) ? value : value ? [value] : [];

export function getNpcFollowers(deity, records) {
  const names = deity.slug === "spider-religion"
    ? ["蜘蛛神教", "The Spider Religion", "Spider Religion"]
    : deity.slug === "king-knicol"
      ? [deity.name.zh, deity.name.en, "神王尼可", "King Knicol"]
      : [deity.name.zh, deity.name.en];
  const matches = new Set(names.map(normalize));
  const seen = new Set();
  return records.filter(person => {
    if (deityNpcIds.has(person.id) || seen.has(person.id)) return false;
    const religions = [...list(person.religionZh), ...list(person.religionEn)];
    if (!religions.some(religion => matches.has(normalize(religion)))) return false;
    seen.add(person.id);
    return true;
  }).map(person => ({
    id: person.id,
    name: { zh: person.nameZh, en: person.nameEn },
    href: `../${person.url}`,
    note: null
  }));
}

export function getPcFollowers(deity, records) {
  const names = [deity.slug, deity.name.zh, deity.name.en];
  if (deity.slug === "king-knicol") names.push("GodKing", "神王尼可", "King Knicol");
  if (deity.slug === "spider-religion") names.push("蜘蛛神教", "The Spider Religion", "Spider Religion");
  const matches = new Set(names.map(normalize));
  const seen = new Set();
  return records.filter(person => {
    if (!list(person.religion).some(religion => matches.has(normalize(religion))) || seen.has(person.name_en)) return false;
    seen.add(person.name_en);
    return true;
  }).map(person => {
    const slug = person.name_en.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return {
      id: person.name_en,
      name: { zh: person.name_zh, en: person.name_en },
      href: `../pc/articles/${slug}.html`,
      note: null
    };
  });
}
