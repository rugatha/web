const grid = document.getElementById("deity-grid");
const langButtons = document.querySelectorAll(".lang-toggle__button");
const fallbackImage = "../assets/rugatha-banner.jpg";
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

let currentLang = "zh";
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
  const card = document.createElement(deity.link ? "a" : "article");
  card.className = "deity-card";
  card.setAttribute("role", "listitem");
  const nameText = getLocalizedText(deity.name);

  if (deity.link) {
    card.href = deity.link;
    card.target = "_blank";
    card.rel = "noreferrer noopener";
    card.setAttribute("aria-label", `Open ${nameText || "deity"} on rugatha.com`);
  }

  const image = document.createElement("div");
  image.className = "deity-image";

  if (deity.image) {
    image.style.backgroundImage = `url(${deity.image})`;
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
  tagline.textContent = getLocalizedText(deity.title);

  body.append(title, tagline);

  const domains = getLocalizedList(deity.domains);
  if (domains.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";

    domains.forEach((domain) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = domain;
      chipRow.appendChild(chip);
    });

    body.appendChild(chipRow);
  }

  card.append(image, body);
  return card;
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

  const chipRow = document.createElement("div");
  chipRow.className = "chip-row";

  for (let index = 0; index < 2; index += 1) {
    const chip = document.createElement("span");
    chip.className = "chip skeleton-block";
    chipRow.appendChild(chip);
  }

  body.append(title, tagline, chipRow);
  card.append(image, body);
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

  categoryOrder.forEach((categoryKey) => {
    const categoryDeities = deities.filter((deity) => deity.category === categoryKey);
    if (!categoryDeities.length) return;

    const section = document.createElement("section");
    section.className = "category-group";
    const heading = document.createElement("h2");
    heading.className = "category-title";
    heading.textContent = getLocalizedText(categoryLabels[categoryKey]);

    const groupGrid = document.createElement("div");
    groupGrid.className = "deity-grid";

    categoryDeities.forEach((deity) => {
      groupGrid.appendChild(createCard(deity));
    });

    section.append(heading, groupGrid);
    grid.appendChild(section);
  });
}

function setupLanguageToggle() {
  if (!langButtons.length) return;

  const setButtonState = (button, isActive) => {
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  };

  langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLang = button.dataset.lang || "zh";
      if (nextLang === currentLang) return;
      currentLang = nextLang;
      langButtons.forEach((btn) => setButtonState(btn, btn.dataset.lang === currentLang));
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
      grid.innerHTML =
        '<p class="load-error">Unable to load deities right now.</p>';
    });
}
