import { getNpcFollowers, getPcFollowers } from "./followers.js";

const grid = document.getElementById("deity-grid");
const langButtons = document.querySelectorAll(".lang-toggle__button");
const fallbackImage = "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Flocations%2Fatlas-cover-firebase%2Freading-c565780a.png?alt=media";
const categoryOrder = ["pantheon", "other-faiths"];

const categoryLabels = {
  pantheon: { zh: "主神", en: "The Pantheon" },
  "other-faiths": { zh: "其他信仰", en: "Other Faiths" }
};

// Presentation accents follow each deity's domains; content stays in deities.json.
const deityAccents = {
  trinix: "235, 205, 132", phyneal: "181, 198, 243", nessis: "147, 211, 165",
  keinra: "164, 205, 227", jeorisan: "155, 186, 235", ultisen: "202, 170, 225",
  maxus: "239, 167, 123", laxthos: "182, 200, 204", kalinius: "225, 199, 133",
  daligon: "229, 151, 143", amoret: "233, 174, 194", phynoir: "188, 169, 225",
  "spider-religion": "198, 166, 209",
  "king-knicol": "208, 189, 150"
};
const pageCopy = {
  zh: { title: "神祇與信仰", intro: "循著神的名諱，探索 Rugatha 的權能、信仰與神諭。", categories: "神祇分類", gallery: "神祇圖鑑" },
  en: { title: "Deities & Faiths", intro: "Follow the names of the divine. Discover the powers, faiths and words of Rugatha’s gods.", categories: "Deity categories", gallery: "Deity archive" }
};

let currentLang = window.RugathaLanguageToggle.getLanguage();
let deitiesCache = [];
const flippedCards = new Set();
const followerData = { pc: null, npc: null };
const followerStatus = { pc: "idle", npc: "idle" };
let followersPromise = null;
const followerCopy = {
  zh: { title: "信徒名錄", expand: "點選翻至人物清冊", collapse: "翻回正面", loading: "正在載入人物…", empty: "尚無可確認的人物紀錄。", failed: "人物資料暫時無法載入。", retry: "重新載入", pc: "玩家角色", npc: "非玩家角色", note: "依已知信仰紀錄整理，可能包含過往信仰。", spider: "蜘蛛神教共同名單" },
  en: { title: "Followers", expand: "Flip to view followers", collapse: "Back to deity", loading: "Loading characters…", empty: "No confirmed character records yet.", failed: "Character records could not be loaded.", retry: "Try again", pc: "Player characters", npc: "Non-player characters", note: "Known faith records may include former affiliations.", spider: "Shared Spider Religion roster" }
};
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

  card.dataset.deity = deity.slug;
  const inner = document.createElement("div");
  inner.className = "deity-card-inner";
  const front = document.createElement("div");
  front.className = "deity-front";
  const flip = document.createElement("button");
  flip.type = "button";
  flip.className = "deity-flip";
  flip.setAttribute("aria-label", `${nameText} · ${followerCopy[currentLang].expand}`);
  flip.setAttribute("aria-controls", `followers-${deity.slug}`);
  const hint = document.createElement("span");
  hint.className = "flip-hint";
  hint.setAttribute("aria-hidden", "true");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.5");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.innerHTML = '<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M5 7C1 9 1 15 5 17m-3-1 3 1 1-3M19 17c4-2 4-8 0-10m3 1-3-1-1 3"/>';
  hint.appendChild(icon);
  flip.title = followerCopy[currentLang].expand;
  flip.appendChild(hint);
  front.append(stage, body, flip);
  const back = createFollowers(deity);
  inner.append(front, back);
  card.appendChild(inner);
  const setFlipped = (flipped, focus = true) => {
    card.classList.toggle("is-flipped", flipped);
    front.inert = flipped;
    front.setAttribute("aria-hidden", String(flipped));
    back.inert = !flipped;
    back.setAttribute("aria-hidden", String(!flipped));
    flip.setAttribute("aria-expanded", String(flipped));
    if (flipped) {
      flippedCards.add(deity.slug);
      renderFollowers(back.querySelector(".followers-content"), deity);
      if (Object.values(followerStatus).includes("idle")) loadFollowers();
    } else {
      flippedCards.delete(deity.slug);
    }
    if (focus) (flipped ? back.querySelector(".deity-return") : flip).focus({ preventScroll: true });
  };
  flip.addEventListener("click", () => setFlipped(true));
  back.querySelector(".deity-return").addEventListener("click", () => setFlipped(false));
  back.addEventListener("click", event => {
    const target = event.target;
    if (!target.matches(".deity-back, .followers-header, .followers-content, .followers-group")) return;
    if (window.getSelection()?.isCollapsed === false) return;
    setFlipped(false);
  });
  card.addEventListener("keydown", event => {
    if (event.key === "Escape" && card.classList.contains("is-flipped")) {
      event.preventDefault();
      setFlipped(false);
    }
  });
  setFlipped(flippedCards.has(deity.slug), false);
  return card;
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
  return response.json();
}

function loadFollowers() {
  if (followersPromise) return followersPromise;
  const tasks = [];
  if (followerStatus.pc !== "ready") {
    followerStatus.pc = "loading";
    tasks.push(fetchJson("../pc/pc_lib")
      .then(pcs => {
        followerData.pc = pcs;
        followerStatus.pc = "ready";
      }).catch(() => { followerStatus.pc = "error"; }));
  }
  if (followerStatus.npc !== "ready") {
    followerStatus.npc = "loading";
    tasks.push(fetchJson("../npc/data/characters.json").then(npcs => {
      followerData.npc = npcs;
      followerStatus.npc = "ready";
    }).catch(() => { followerStatus.npc = "error"; }));
  }
  followersPromise = Promise.all(tasks).finally(() => {
    followersPromise = null;
    refreshFollowers();
  });
  refreshFollowers();
  return followersPromise;
}

function refreshFollowers() {
  document.querySelectorAll(".deity-card.is-flipped").forEach(card => {
    const deity = deitiesCache.find(item => item.slug === card.dataset.deity);
    if (deity) renderFollowers(card.querySelector(".followers-content"), deity);
  });
}

function createFollowers(deity) {
  const copy = followerCopy[currentLang];
  const back = document.createElement("section");
  back.className = "deity-back deity-followers";
  back.id = `followers-${deity.slug}`;
  back.setAttribute("aria-labelledby", `followers-title-${deity.slug}`);
  const header = document.createElement("header");
  header.className = "followers-header";
  const name = document.createElement("p");
  name.className = "followers-deity-name";
  name.textContent = getLocalizedText(deity.name);
  const title = document.createElement("h3");
  title.id = `followers-title-${deity.slug}`;
  title.textContent = copy.title;
  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.className = "deity-return";
  backButton.textContent = copy.collapse;
  header.append(name, title, backButton);
  const content = document.createElement("div");
  content.className = "followers-content";
  content.tabIndex = 0;
  content.setAttribute("aria-label", `${getLocalizedText(deity.name)} · ${copy.title}`);
  back.append(header, content);
  return back;
}

function renderFollowers(content, deity) {
  const copy = followerCopy[currentLang];
  content.replaceChildren();
  const note = document.createElement("p");
  note.className = "followers-note";
  note.textContent = copy.note;
  content.appendChild(note);
  if (deity.slug === "spider-religion") {
    const shared = document.createElement("p");
    shared.className = "followers-shared";
    shared.textContent = copy.spider;
    content.appendChild(shared);
  }
  for (const type of ["pc", "npc"]) {
    const section = document.createElement("section");
    section.className = `followers-group followers-group--${type}`;
    const heading = document.createElement("h4");
    heading.textContent = copy[type];
    section.appendChild(heading);
    const status = followerStatus[type];
    section.setAttribute("aria-busy", String(status === "idle" || status === "loading"));
    if (status !== "ready") {
      const message = document.createElement("p");
      message.className = "followers-message";
      message.setAttribute("role", "status");
      message.textContent = status === "error" ? copy.failed : copy.loading;
      section.appendChild(message);
    } else {
      const people = type === "pc"
        ? getPcFollowers(deity, followerData.pc)
        : getNpcFollowers(deity, followerData.npc);
      if (!people.length) {
        const empty = document.createElement("p");
        empty.className = "followers-message";
        empty.textContent = copy.empty;
        section.appendChild(empty);
      } else {
        const list = document.createElement("ul");
        list.className = "followers-list";
        list.setAttribute("aria-label", copy[type]);
        people.forEach(person => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = person.href;
          const name = document.createElement("span");
          name.className = "follower-name";
          name.textContent = getLocalizedText(person.name);
          link.appendChild(name);
          if (person.note) {
            const note = document.createElement("span");
            note.className = "follower-label";
            note.textContent = getLocalizedText(person.note);
            link.appendChild(note);
          }
          item.appendChild(link);
          list.appendChild(item);
        });
        section.appendChild(list);
      }
    }
    content.appendChild(section);
  }
  if (Object.values(followerStatus).includes("error")) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "followers-retry";
    retry.textContent = copy.retry;
    retry.addEventListener("click", loadFollowers);
    content.appendChild(retry);
  }
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
