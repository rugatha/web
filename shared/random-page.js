const DATA_SOURCES = {
  chapters: "campaigns/data/chapter-content.json",
  deities: "deities/data/deities.json",
  npcs: "npc/data/characters.json",
  pcs: "campaigns/pages/pcs.json"
};

// These PC pages are not currently referenced by the campaign roster data.
const EXTRA_PC_PAGES = ["cecil", "mr-green", "ravi", "yi"].map(
  (slug) => `pc/articles/${slug}.html`
);

const slugify = (value) =>
  value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.json();
};

const loadRandomDestinations = async () => {
  const [chapterContent, deities, npcs, pcRoster] = await Promise.all(
    Object.values(DATA_SOURCES).map(fetchJson)
  );

  const chapterPages = Object.values(chapterContent)
    .map((chapter) => chapter.source)
    .filter((source) => /^campaigns\/pages\/.+\/chpt\d+\.html$/.test(source));

  const deityPages = deities
    .map((deity) => deity.link)
    .filter(Boolean)
    .map((link) => `deities/${link.replace(/^\.\//, "")}`);

  const npcPages = npcs
    .map((character) => character.url)
    .filter(Boolean);

  const pcNames = Object.values(pcRoster.pcs || {}).flat();
  const pcPages = [...new Set(pcNames)].map(
    (name) => `pc/articles/${slugify(name)}.html`
  );

  return [...new Set([...chapterPages, ...deityPages, ...npcPages, ...pcPages, ...EXTRA_PC_PAGES])];
};

const randomDestinations = loadRandomDestinations().catch((error) => {
  console.error("Unable to prepare random page destinations", error);
  return [];
});

const navigateToRandomLeafPage = async () => {
  const destinations = await randomDestinations;
  if (!destinations.length) return;

  const destination = destinations[Math.floor(Math.random() * destinations.length)];
  window.location.assign(new URL(destination, document.baseURI).href);
};

const setupRandomD20 = () => {
  const d20 = document.querySelector(".home-d20");
  if (!d20) return;

  d20.setAttribute("role", "button");
  d20.setAttribute("tabindex", "0");
  d20.setAttribute("aria-label", "隨機前往 Rugatha 頁面");
  d20.addEventListener("click", navigateToRandomLeafPage);
  d20.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToRandomLeafPage();
    }
  });
};

setupRandomD20();
