const campaigns =
  window.RUGATHA_CONFIG && Array.isArray(window.RUGATHA_CONFIG.campaigns)
    ? window.RUGATHA_CONFIG.campaigns
    : [];

const grid = document.querySelector("#campaign-grid");
const filter = document.body.dataset.campaignFilter || "all";
const languageToggleButtons = Array.from(document.querySelectorAll("[data-lang-option]"));
const campaignGroups = {
  active: new Set(["rugatha lite", "rugatha wilds", "rugatha legends"]),
  closed: new Set(["rugatha", "rugatha plus", "rugatha brown"])
};
const i18n = {
  zh: {
    sessionLabel: "下次團務",
    emptyState: "目前沒有團務。"
  },
  en: {
    sessionLabel: "Next Session",
    emptyState: "No campaigns found."
  }
};

let currentLanguage = (() => {
  try {
    return localStorage.getItem("rugathaCampaignLanguage") || "zh";
  } catch (_) {
    return "zh";
  }
})();
if (!i18n[currentLanguage]) currentLanguage = "zh";

const setLanguage = (language) => {
  if (!i18n[language]) return;
  currentLanguage = language;
  document.documentElement.lang = language === "zh" ? "zh-TW" : "en";
  document.body.dataset.lang = language;
  languageToggleButtons.forEach((button) => {
    const isActive = button.dataset.langOption === language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.querySelectorAll("[data-i18n='sessionLabel']").forEach((el) => {
    el.textContent = i18n[language].sessionLabel;
  });
  document.querySelectorAll("[data-i18n='emptyState']").forEach((el) => {
    el.textContent = i18n[language].emptyState;
  });
  document.querySelectorAll("[data-i18n='tagline']").forEach((el) => {
    el.textContent = language === "en" ? el.dataset.taglineEn || "" : el.dataset.taglineZh || "";
  });
  try {
    localStorage.setItem("rugathaCampaignLanguage", language);
  } catch (_) {}
};

languageToggleButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.langOption));
});

const toRgba = (hex, alpha = 0.22) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized.length === 3 ? normalized.split("").map(c => c + c).join("") : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getTagline = (item, language = currentLanguage) => {
  if (language === "en") return item.tagline_en || item.tagline || item.tagline_zh || "";
  return item.tagline_zh || item.tagline || item.tagline_en || "";
};

const escapeAttr = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildCard = (item) => {
  const rawHref = item.page || item.link;
  const href =
    rawHref && rawHref.startsWith("./") && window.RUGATHA_CAMPAIGNS_BASE
      ? new URL(rawHref.slice(2), window.RUGATHA_CAMPAIGNS_BASE).href
      : rawHref;
  const isInternal =
    href &&
    window.RUGATHA_CAMPAIGNS_BASE &&
    href.startsWith(window.RUGATHA_CAMPAIGNS_BASE);
  const card = document.createElement("a");
  card.className = "card";
  card.href = href || "#";
  card.target = isInternal ? "_self" : "_blank";
  card.rel = isInternal ? "" : "noreferrer noopener";
  const accent = item.accent || "#7bdcb5";
  card.style.setProperty("--accent", accent);
  card.style.setProperty("--accent-soft", toRgba(accent, 0.22));
  const taglineZh = getTagline(item, "zh");
  const taglineEn = getTagline(item, "en");

  card.innerHTML = `
    <span class="card__glow"></span>
    <div class="card__media">
      <img src="${item.image}" alt="${item.name} logo" loading="lazy" />
    </div>
    <div class="card__info">
      <span class="card__title">${item.name}</span>
    </div>
    <div class="card__details">
      <div class="card__session">
        <div class="card__session-label" data-i18n="sessionLabel">${i18n[currentLanguage].sessionLabel}</div>
        <div class="card__session-time">${item.nextSession || "TBD"}</div>
      </div>
      <div class="card__details-text">
        <p class="card__tagline" data-i18n="tagline" data-tagline-zh="${escapeAttr(taglineZh)}" data-tagline-en="${escapeAttr(taglineEn)}">${getTagline(item)}</p>
        <p class="card__meta">${item.dates}</p>
      </div>
    </div>
  `;

  return card;
};

const render = () => {
  if (!grid) return;
  const fragment = document.createDocumentFragment();
  const visibleCampaigns = campaigns.filter((item) => {
    const campaignName = (item.name || "").toLowerCase();
    if (filter === "active") return campaignGroups.active.has(campaignName);
    if (filter === "closed") return campaignGroups.closed.has(campaignName);
    return true;
  });

  if (!visibleCampaigns.length) {
    grid.innerHTML = `<p class="empty-state" data-i18n="emptyState">${i18n[currentLanguage].emptyState}</p>`;
    return;
  }

  visibleCampaigns.forEach((item) => {
    fragment.appendChild(buildCard(item));
  });
  grid.appendChild(fragment);
};

render();
setLanguage(currentLanguage);
