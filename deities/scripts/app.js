const grid = document.getElementById("deity-grid");
const fallbackImage = "../assets/rugatha-banner.jpg";
const categoryOrder = [
  "The Pantheon 主神",
  "The Newly Ascended 新生神",
  "The Obscured 隱密信仰",
  "The Spider Religion 蜘蛛神信仰",
  "The Dubbed 被冊封者"
];

function createCard(deity) {
  const card = document.createElement(deity.link ? "a" : "article");
  card.className = "deity-card";
  card.setAttribute("role", "listitem");

  if (deity.link) {
    card.href = deity.link;
    card.target = "_blank";
    card.rel = "noreferrer noopener";
    card.setAttribute("aria-label", `Open ${deity.name} on rugatha.com`);
  }

  const image = document.createElement("div");
  image.className = "deity-image";

  if (deity.image) {
    image.style.backgroundImage = `url(${deity.image})`;
  } else {
    image.classList.add("fallback");
    image.style.backgroundImage = `url(${fallbackImage})`;
    const letter = document.createElement("span");
    letter.textContent = deity.name.charAt(0);
    image.appendChild(letter);
  }

  const body = document.createElement("div");
  body.className = "deity-body";

  const title = document.createElement("h3");
  title.className = "deity-name";
  title.textContent = deity.name;

  const tagline = document.createElement("p");
  tagline.className = "deity-tagline";
  tagline.textContent = deity.title;

  body.append(title, tagline);

  if (deity.domains && deity.domains.length) {
    const chipRow = document.createElement("div");
    chipRow.className = "chip-row";

    deity.domains.forEach((domain) => {
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

async function loadDeities() {
  const response = await fetch("./data/deities.json");
  if (!response.ok) {
    throw new Error(`Failed to load deities.json (${response.status})`);
  }
  return response.json();
}

function renderDeities(deities) {
  grid.innerHTML = "";

  categoryOrder.forEach((categoryLabel) => {
    const categoryDeities = deities.filter(
      (deity) => deity.category === categoryLabel
    );
    if (!categoryDeities.length) return;

    const section = document.createElement("section");
    section.className = "category-group";
    const heading = document.createElement("h2");
    heading.className = "category-title";
    heading.textContent = categoryLabel;

    const groupGrid = document.createElement("div");
    groupGrid.className = "deity-grid";

    categoryDeities.forEach((deity) => {
      groupGrid.appendChild(createCard(deity));
    });

    section.append(heading, groupGrid);
    grid.appendChild(section);
  });
}

if (grid) {
  loadDeities()
    .then(renderDeities)
    .catch((error) => {
      console.error(error);
      grid.innerHTML =
        '<p class="load-error">Unable to load deities right now.</p>';
    });
}
