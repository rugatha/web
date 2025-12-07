const deities = [
  {
    name: "Trinix\n崔尼斯",
    title: "God of Light and Hope\n光與希望之神",
    domains: ["Light", "Hope"],
    image: "https://rugatha.github.io/web/deities/Banners/Trinix.jpeg",
    link: "https://rugatha.com/2021/05/19/trinix-god-of-light/",
    category: "The Pantheon 主神"
  },
  {
    name: "Phyneal\n芬尼爾",
    title: "God of Luna\n月神",
    domains: ["Luna"],
    image: "https://rugatha.github.io/web/deities/Banners/Phyneal.jpeg",
    link: "https://rugatha.com/2021/05/19/phyneal-god-of-luna/",
    category: "The Pantheon 主神"
  },
  {
    name: "Phynoir\n芬諾爾",
    title: "God of Exchange and Prophecy\n交易與預言之神",
    domains: ["Exchange", "Prophecy"],
    image: "https://rugatha.github.io/web/deities/Banners/Phyneal.jpeg",
    link: "https://rugatha.com/2023/07/16/phynoir-god-of-exchange/",
    category: "The Obscured 隱密信仰"
  },
  {
    name: "Nessis\n涅西斯",
    title: "God of Woods and Life\n樹林與生命之神",
    domains: ["Woods", "Life"],
    image: "https://rugatha.github.io/web/deities/Banners/Nessis.jpeg",
    link: "https://rugatha.com/2021/05/19/nessis-god-of-woods/",
    category: "The Pantheon 主神"
  },
  {
    name: "Keinra\n津菈",
    title: "God of Protection and Justice\n守護與正義之神",
    domains: ["Protection", "Justice"],
    image: "https://rugatha.github.io/web/deities/Banners/Keinra.jpeg",
    link: "https://rugatha.com/2021/05/19/keinra-god-of-protection/",
    category: "The Pantheon 主神"
  },
  {
    name: "Jeorisan\n喬里森",
    title: "God of Storm and Intelligence\n風暴與智慧之神",
    domains: ["Storm", "Intelligence"],
    image: "https://rugatha.github.io/web/deities/Banners/Jeorisan.jpeg",
    link: "https://rugatha.com/2021/05/19/jeorisan-god-of-storm/",
    category: "The Pantheon 主神"
  },
  {
    name: "Ultisen\n奧提森",
    title: "God of Trickery and Drama\n詐欺與戲劇之神",
    domains: ["Trickery", "Drama"],
    image: "https://rugatha.github.io/web/deities/Banners/Ultisen.jpeg",
    link: "https://rugatha.com/2021/05/19/ultisen-god-of-trickery/",
    category: "The Pantheon 主神"
  },
  {
    name: "Maxus\n麥克瑟斯",
    title: "God of Fire and Forge\n火與熔鍛之神",
    domains: ["Fire", "Forge"],
    image: "https://rugatha.github.io/web/deities/Banners/Maxus.jpeg",
    link: "https://rugatha.com/2021/05/19/maxus-god-of-forge/",
    category: "The Pantheon 主神"
  },
  {
    name: "Laxthos\n拉索斯",
    title: "God of Silence and Rules\n寂靜與秩序之神",
    domains: ["Silence", "Rules"],
    image: "https://rugatha.github.io/web/deities/Banners/Laxthos.jpeg",
    link: "https://rugatha.com/2021/05/19/laxthos-god-of-silence/",
    category: "The Pantheon 主神"
  },
  {
    name: "Kalinius\n凱里涅斯",
    title: "God of Trades and Wealth\n貿易與財富之神",
    domains: ["Trades", "Wealth"],
    image: "https://rugatha.github.io/web/deities/Banners/Kalinius.jpeg",
    link: "https://rugatha.com/2021/05/19/kalinius-god-of-trades/",
    category: "The Pantheon 主神"
  },
  {
    name: "Daligon\n達里崗",
    title: "God of War and Strength\n戰爭與力量之神",
    domains: ["War", "Strength"],
    image: "https://rugatha.github.io/web/deities/Banners/Daligon.jpeg",
    link: "https://rugatha.com/2021/05/19/daligon-god-of-war/",
    category: "The Pantheon 主神"
  },
  {
    name: "Amoret\n阿莫雷",
    title: "God of Love and Eternity\n愛與永恆之神",
    domains: ["Love", "Eternity"],
    image: "../npc/individual_pics/Lysien%20Amoret.webp",
    link: "../npc/npc_page/pages/Lysien_Amoret.html",
    category: "The Newly Ascended 新生神"
  },
  {
    name: "The Mother\n母親大人",
    title: "The Spider King\n蜘蛛王",
    domains: ["Spider"],
    image: "../npc/individual_pics/The%20Mother.jpeg",
    link: "../npc/npc_page/pages/The_Mother.html",
    category: "The Spider Religion 蜘蛛神信仰"
  },
  {
    name: "Anna\n安娜",
    title: "The New Spider God\n新蜘蛛神",
    domains: ["Spider"],
    image: "../npc/individual_pics/Anna.png",
    link: "../npc/npc_page/pages/Anna.html",
    category: "The Spider Religion 蜘蛛神信仰"
  },
  {
    name: "Alfenor\n阿爾芬諾",
    title: "The Spider God\n蜘蛛神",
    domains: ["Spider"],
    image: "../npc/individual_pics/Alfenor.jpeg",
    link: "../npc/npc_page/pages/Alfenor.html",
    category: "The Spider Religion 蜘蛛神信仰"
  },
  {
    name: "King Knicol\n神王尼可",
    title: "King of the Underground\n地底王",
    image: "../npc/individual_pics/King%20Knicol.jpeg",
    link: "../npc/npc_page/pages/King_Knicol.html",
    category: "The Dubbed 被冊封者"
  }
];

const grid = document.getElementById("deity-grid");
const fallbackImage = "../assets/Wordpress%20Banner.jpg";
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

if (grid) {
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
