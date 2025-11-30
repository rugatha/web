const campaigns =
  window.RUGATHA_CONFIG && Array.isArray(window.RUGATHA_CONFIG.campaigns)
    ? window.RUGATHA_CONFIG.campaigns
    : [];

const grid = document.querySelector("#campaign-grid");

const toRgba = (hex, alpha = 0.22) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized.length === 3 ? normalized.split("").map(c => c + c).join("") : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildCard = (item) => {
  const card = document.createElement("a");
  card.className = "card";
  card.href = item.link;
  card.target = "_blank";
  card.rel = "noreferrer noopener";
  const accent = item.accent || "#7bdcb5";
  card.style.setProperty("--accent", accent);
  card.style.setProperty("--accent-soft", toRgba(accent, 0.22));

  card.innerHTML = `
    <span class="card__glow"></span>
    <div class="card__media">
      <img src="${item.image}" alt="${item.name} logo" loading="lazy" />
    </div>
    <div class="card__info">
      <span class="card__title">${item.name}</span>
    </div>
    <div class="card__details">
      <p class="card__tagline">${item.tagline}</p>
      <p class="card__meta">${item.dates}</p>
    </div>
  `;

  return card;
};

const render = () => {
  if (!grid) return;
  const fragment = document.createDocumentFragment();
  campaigns.forEach((item) => {
    fragment.appendChild(buildCard(item));
  });
  grid.appendChild(fragment);
};

render();
