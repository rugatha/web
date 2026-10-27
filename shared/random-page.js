const siteRoot = new URL("../", import.meta.url);

const DATA_SOURCES = {
  chapters: "campaigns/data/chapter-content.json",
  deities: "deities/data/deities.json",
  npcs: "npc/data/characters.json",
  pcs: "campaigns/pages/pcs.json",
  locations: "map/location/assets/location.json"
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
  const response = await fetch(new URL(url, siteRoot), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.json();
};

const loadRandomDestinations = async () => {
  const [chapterContent, deities, npcs, pcRoster, locations] = await Promise.all(
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

  const locationPages = ["map/"];
  const childKeys = ["realms", "kingdoms", "cities", "pois"];
  const visitLocation = (node, route = "map/location/", depth = 0) => {
    locationPages.push(route);
    for (const child of node[childKeys[depth]] || []) {
      visitLocation(child, `${route}${child.slug}/`, depth + 1);
    }
  };
  visitLocation(locations);

  return [...new Set([...chapterPages, ...deityPages, ...npcPages, ...pcPages, ...EXTRA_PC_PAGES, ...locationPages])];
};

let randomDestinations;
const getRandomDestinations = () => {
  randomDestinations ||= loadRandomDestinations().catch((error) => {
    console.error("Unable to prepare random page destinations", error);
    randomDestinations = null;
    return [];
  });
  return randomDestinations;
};

const trackD20Click = () => {
  if (typeof window.gtag !== "function") return;

  window.gtag("event", "d20_click", {
    button_location: document.querySelector("[data-random-page]") ? "member" : "homepage",
    button_asset: "others/d20.png"
  });
};

const navigateToRandomLeafPage = async () => {
  trackD20Click();

  const destinations = await getRandomDestinations();
  if (!destinations.length) return;

  const destination = destinations[Math.floor(Math.random() * destinations.length)];
  window.location.assign(new URL(destination, siteRoot).href);
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

// Member cards are rebuilt on language and bookmark updates.
// Delegate clicks so newly rendered random-page buttons remain interactive.
document.addEventListener("click", (event) => {
  if (event.target.closest?.("[data-random-page]")) return navigateToRandomLeafPage();
});
