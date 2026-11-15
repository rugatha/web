const grid = document.getElementById("deity-grid");
const langButtons = document.querySelectorAll(".lang-toggle__button");
const fallbackImage = "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Flocations%2Fatlas-cover-firebase%2Freading-c565780a.png?alt=media";
const categoryOrder = [
  "pantheon",
  "newly-ascended",
  "obscured",
  "spider-religion",
  "dubbed"
];

const categoryLabels = {
  pantheon: { zh: "主神", en: "The Pantheon" },
  "newly-ascended": { zh: "新生神", en: "The Newly Ascended" },
  obscured: { zh: "隱密信仰", en: "The Obscured" },
  "spider-religion": { zh: "蜘蛛神信仰", en: "The Spider Religion" },
  dubbed: { zh: "被冊封者", en: "The Dubbed" }
};

// Presentation accents follow each deity's domains; content stays in deities.json.
const deityAccents = {
  trinix: "235, 205, 132", phyneal: "181, 198, 243", nessis: "147, 211, 165",
  keinra: "164, 205, 227", jeorisan: "155, 186, 235", ultisen: "202, 170, 225",
  maxus: "239, 167, 123", laxthos: "182, 200, 204", kalinius: "225, 199, 133",
  daligon: "229, 151, 143", amoret: "233, 174, 194", phynoir: "188, 169, 225",
  "the-mother": "198, 166, 209", anna: "174, 186, 229", alfenor: "191, 176, 209",
  "king-knicol": "208, 189, 150"
};
const pageCopy = {
  zh: { title: "神祇與信仰", intro: "循著神的名諱，探索 Rugatha 的權能、信仰與神諭。", categories: "神祇分類", gallery: "神祇圖鑑" },
  en: { title: "Deities & Faiths", intro: "Follow the names of the divine. Discover the powers, faiths and words of Rugatha’s gods.", categories: "Deity categories", gallery: "Deity archive" }
};

let currentLang = window.RugathaLanguageToggle.getLanguage();
let deitiesCache = [];
const DEITY_SKELETON_GROUPS = [3, 3];
const PAGE_TITLES = {
  zh: "Rugatha 神祇",
  en: "Deities of Rugatha"
};

const getLocalizedText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (currentLang === "en") {
    return value.en || value.zh || "";
  }
  return value.zh || value.en || "";
};

const getLocalizedList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") {
    if (currentLang === "en") return value.en || value.zh || [];
    return value.zh || value.en || [];
  }
  return [];
};

function createCard(deity) {
  const card = document.createElement("article");
  card.className = "deity-card";
  card.setAttribute("role", "listitem");
  const nameText = getLocalizedText(deity.name);
  card.style.setProperty("--deity-rgb", deityAccents[deity.slug] || "123, 220, 181");

  const image = document.createElement("div");
  image.className = "deity-image";

  if (deity.image) {
    const portrait = document.createElement("img");
    portrait.src = deity.thumbnail || deity.image;
    portrait.alt = "";
    portrait.width = 480;
    portrait.height = 480;
    portrait.loading = "lazy";
    portrait.decoding = "async";
    image.appendChild(portrait);
  } else {
    image.classList.add("fallback");
    image.style.backgroundImage = `url(${fallbackImage})`;
    const letter = document.createElement("span");
    letter.textContent = nameText.charAt(0);
    image.appendChild(letter);
  }

  const body = document.createElement("div");
  body.className = "deity-body";

  const title = document.createElement("h3");
  title.className = "deity-name";
  title.textContent = nameText;

  const tagline = document.createElement("p");
  tagline.className = "deity-tagline";
  const subtitle = getLocalizedText(deity.title);
  const domains = getLocalizedList(deity.domains).filter(Boolean);
  if (domains.length) {
    const pattern = domains
      .slice()
      .sort((a, b) => b.length - a.length)
      .map(domain => domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    let offset = 0;
    for (const match of subtitle.matchAll(new RegExp(pattern, "gi"))) {
      tagline.append(document.createTextNode(subtitle.slice(offset, match.index)));
      const emphasis = document.createElement("strong");
      emphasis.className = "deity-domain";
      emphasis.textContent = match[0];
      tagline.appendChild(emphasis);
      offset = match.index + match[0].length;
    }
    tagline.append(document.createTextNode(subtitle.slice(offset)));
  } else {
    tagline.textContent = subtitle;
  }

  body.append(title, tagline);

  const stage = document.createElement("div");
  stage.className = "deity-stage";
  stage.append(image, createLogoSlot(deity));

  const saying = getLocalizedText(deity.saying);
  if (saying) {
    const quote = document.createElement("blockquote");
    quote.className = "deity-saying";
    quote.textContent = saying;
    body.appendChild(quote);
  }

  card.append(stage, body);
  return card;
}

// A deity's `logo` overrides the shared Rugatha placeholder when its artwork is ready.
function createLogoSlot(deity = {}) {
  const slot = document.createElement("div");
  slot.className = "deity-logo-slot";
  const logo = document.createElement("img");
  logo.src = deity.logo || "../assets/logo/rugatha-icon.png";
  logo.alt = "";
  logo.width = 72;
  logo.height = 72;
  logo.loading = "lazy";
  logo.decoding = "async";
  slot.appendChild(logo);
  slot.setAttribute("aria-hidden", "true");
  return slot;
}

function createSkeletonCard() {
  const card = document.createElement("article");
  card.className = "deity-card deity-card--skeleton";
  card.setAttribute("aria-hidden", "true");

  const image = document.createElement("div");
  image.className = "deity-image skeleton-block";

  const body = document.createElement("div");
  body.className = "deity-body";

  const title = document.createElement("div");
  title.className = "deity-name skeleton-block";

  const tagline = document.createElement("div");
  tagline.className = "deity-tagline skeleton-block";

  body.append(title, tagline);
  const stage = document.createElement("div");
  stage.className = "deity-stage";
  stage.append(image, createLogoSlot());
  card.append(stage, body);
  return card;
}

function renderLoadingState() {
  if (!grid) return;
  grid.innerHTML = "";

  DEITY_SKELETON_GROUPS.forEach((count) => {
    const section = document.createElement("section");
    section.className = "category-group";
    section.setAttribute("aria-hidden", "true");

    const heading = document.createElement("div");
    heading.className = "category-title skeleton-block";
    heading.style.width = "220px";
    heading.style.height = "34px";
    heading.style.margin = "0 auto 10px";

    const groupGrid = document.createElement("div");
    groupGrid.className = "deity-grid";

    for (let index = 0; index < count; index += 1) {
      groupGrid.appendChild(createSkeletonCard());
    }

    section.append(heading, groupGrid);
    grid.appendChild(section);
  });
}

async function loadDeities() {
  const response = await fetch("./data/deities.json");
  if (!response.ok) {
    throw new Error(`Failed to load deities.json (${response.status})`);
  }
  return response.json();
}

function renderDeities(deities) {
  grid.innerHTML = "";
  grid.setAttribute("aria-busy", "false");
  document.documentElement.lang = currentLang === "zh" ? "zh-Hant" : "en";
  document.body.dataset.lang = currentLang;
  document.querySelectorAll("[data-copy]").forEach(element => {
    element.textContent = pageCopy[currentLang][element.dataset.copy];
  });
  document.querySelector(".deity-section").setAttribute("aria-label", pageCopy[currentLang].gallery);
  const nav = document.getElementById("category-nav");
  nav.replaceChildren();
  nav.setAttribute("aria-label", pageCopy[currentLang].categories);

  categoryOrder.forEach((categoryKey) => {
    const categoryDeities = deities.filter((deity) => deity.category === categoryKey);
    if (!categoryDeities.length) return;

    const section = document.createElement("section");
    section.className = "category-group";
    section.id = categoryKey;
    section.setAttribute("aria-labelledby", `${categoryKey}-title`);
    const heading = document.createElement("h2");
    heading.className = "category-title";
    heading.id = `${categoryKey}-title`;
    heading.textContent = getLocalizedText(categoryLabels[categoryKey]);
    const categoryHeader = document.createElement("header");
    categoryHeader.className = "category-header";
    categoryHeader.append(heading);
    const navLink = document.createElement("a");
    navLink.href = `#${categoryKey}`;
    navLink.textContent = heading.textContent;
    nav.appendChild(navLink);

    const groupGrid = document.createElement("div");
    groupGrid.className = "deity-grid";
    groupGrid.setAttribute("role", "list");

    categoryDeities.forEach((deity) => {
      groupGrid.appendChild(createCard(deity));
    });

    section.append(categoryHeader, groupGrid);
    grid.appendChild(section);
  });
}

function setupLanguageToggle() {
  if (!langButtons.length) return;

  const updateButtonState = (button) => {
    button.dataset.lang = currentLang;
    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");
    button.setAttribute("aria-label", currentLang === "en" ? "Current language: English; switch to 中文" : "目前語言：中文；切換為 English");
    window.RugathaLanguageToggle?.setButtonIcon(button, currentLang);
  };

  langButtons.forEach((button) => {
    updateButtonState(button);
    button.addEventListener("click", () => {
      currentLang = currentLang === "en" ? "zh" : "en";
      window.RugathaLanguageToggle.setLanguage(currentLang);
      langButtons.forEach(updateButtonState);
      document.title = PAGE_TITLES[currentLang] || PAGE_TITLES.en;
      renderDeities(deitiesCache);
    });
  });
}

if (grid) {
  renderLoadingState();
  document.title = PAGE_TITLES[currentLang] || PAGE_TITLES.en;
  loadDeities()
    .then((data) => {
      deitiesCache = data;
      renderDeities(deitiesCache);
      setupLanguageToggle();
    })
    .catch((error) => {
      console.error(error);
      grid.setAttribute("aria-busy", "false");
      grid.innerHTML =
        '<p class="load-error">Unable to load deities right now.</p>';
    });
}
