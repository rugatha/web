const EMPEROR_ERAS = [
  {
    title: {
      zh: "卓尼森王朝",
      en: "The Era of Dranison"
    },
    tag: "Dranison",
    emperors: [
      {
        name: {
          zh: "沃斯頓一世",
          en: "Walston I"
        },
        image: "gallery/dranison-walston.jpeg",
        title: {
          zh: "王朝首任皇帝",
          en: "First Emperor of the Era"
        },
        desc: {
          zh: "「自由軍團」的首領。\n以「卓尼森革命」推翻艾米頓帝國的統治",
          en: "The leader of 'The Legion of Freedom'.\nOverthrew the rule of the Emiton Empire on the island."
        }
      },
      {
        name: {
          zh: "喬森十三世",
          en: "Georson XIII"
        },
        image: "gallery/dranison-georson.jpeg",
        title: {
          zh: "王朝末任皇帝",
          en: "Last Emperor of the Era"
        },
        desc: {
          zh: "在「平民革命」被俘，結束了卓尼森王朝的統治。",
          en: "Was captured during 'the Common Revolution', ending the reign of the Dranison Empire."
        }
      },
    ],
  },
  {
    title: {
      zh: "崔尼斯王朝",
      en: "The Era of Trinix"
    },
    tag: "Trinix",
    emperors: [
      {
        name: {
          zh: "霍里森一世",
          en: "Hollison I"
        },
        image: "gallery/trinix-hollison.jpeg",
        title: {
          zh: "王朝首任皇帝",
          en: "First Emperor of the Era"
        },
        desc: {
          zh: "登基前為「崔尼斯的聖騎士」首領",
          en: "He was originally the leader of 'the Paladin of Trinix' before becoming the emperor."
        }
      },
      {
        name: {
          zh: "瑞蘭十五世",
          en: "Reylan XV"
        },
        image: "gallery/trinix-reylan.jpeg",
        title: {
          zh: "王朝末任皇帝",
          en: "Last Emperor of the Era"
        },
        desc: {
          zh: "被東境妖精殘忍殺害。",
          en: "Brutally murdered by the Elves of the East."
        }
      },
    ],
  },
  {
    title: {
      zh: "洛森王朝",
      en: "The Era of Lothum"
    },
    tag: "Lothum",
    emperors: [
      {
        name: {
          zh: "征服者洛林",
          en: "Lorin the Conqueror"
        },
        image: "gallery/lothum-lorin.jpeg",
        title: {
          zh: "王朝首任皇帝",
          en: "First Emperor of the Era"
        },
        desc: {
          zh: "妖精軍團的首領洛林・瑞斯。\n推翻逐漸走向種族歧視的崔尼斯帝國。",
          en: "Lorin Reese, the leader of the Elvish Legion.\nOverthrew the Trinix Empire, who was heading towards racial discrimination."
        }
      },
      {
        name: {
          zh: "年輕的傑里斯",
          en: "Jelix the Young"
        },
        image: "gallery/lothum-jelix.jpeg",
        title: {
          zh: "王朝末任皇帝",
          en: "Last Emperor of the Era"
        },
        desc: {
          zh: "洛森王朝末任皇帝，被神秘的謀殺。",
          en: "The last emperor of the Lothum Emperor, Jelix was murdered mysteriously."
        }
      },
    ],
  },
  {
    title: {
      zh: "新卓尼森王朝",
      en: "The Era of New Dranison"
    },
    tag: "New Dranison",
    emperors: [
      {
        name: {
          zh: "卡洛斯七世",
          en: "Carlos VII"
        },
        image: "gallery/new-dranison-carlos.jpeg",
        title: {
          zh: "王朝首任皇帝",
          en: "First Emperor of the Era"
        },
        desc: {
          zh: "原名卡洛斯・達米頓，自稱為卓尼斯後裔。\n登基後恢復自己卓尼森的姓氏。",
          en: "He was originally named Carlos Demiton, but claimed to be a descendant of the Dranison bloodline.\nUsed Dranison as his last name after he sat on the throne."
        }
      },
      {
        name: {
          zh: "凱里諾六世",
          en: "Kylenor VI"
        },
        image: "gallery/new-dranison-kylenor.jpeg",
        title: {
          zh: "王朝現任皇帝",
          en: "Current Emperor of the Era"
        },
        desc: {
          zh: "現任新卓尼森王朝卓尼森帝國皇帝。",
          en: "The current emperor of the New Dranison Empire."
        }
      },
    ],
  },
];

const container = document.getElementById("emperor-eras");
const langButtons = document.querySelectorAll(".lang-toggle__button");
const titleEl = document.getElementById("emperors-title");
let currentLang = "zh";

const getLocalizedText = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (currentLang === "en") {
    return value.en || value.zh || "";
  }
  return value.zh || value.en || "";
};

const formatText = (value) => getLocalizedText(value).replace(/\n/g, "<br>");

if (container) {
  const createCard = (emperor, tag) => {
    const card = document.createElement("article");
    card.className = "emperor-card";
    const nameText = getLocalizedText(emperor.name);
    card.setAttribute("aria-label", `${nameText} (${tag})`);

    const portrait = document.createElement("div");
    portrait.className = "portrait";

    const img = document.createElement("img");
    img.src = emperor.image;
    img.alt = emperor.name;
    img.loading = "lazy";

    portrait.appendChild(img);

    const body = document.createElement("div");
    body.className = "card-body";

    const nameEl = document.createElement("h3");
    nameEl.className = "card-name";
    nameEl.innerHTML = formatText(emperor.name);

    const titleEl = document.createElement("p");
    titleEl.className = "card-title";
    titleEl.textContent = getLocalizedText(emperor.title) || tag;

    const desc = document.createElement("p");
    desc.className = `card-desc ${currentLang}`;
    desc.innerHTML = formatText(emperor.desc);

    const divider = document.createElement("div");
    divider.className = "card-divider";

    body.append(nameEl, titleEl, divider, desc);
    card.append(portrait, body);

    return card;
  };

  const render = () => {
    container.textContent = "";
    const frag = document.createDocumentFragment();

    EMPEROR_ERAS.forEach((era) => {
      const section = document.createElement("section");
      section.className = "era";
      const eraTitle = getLocalizedText(era.title);
      section.setAttribute("aria-label", eraTitle || era.tag || "Era");

      const title = document.createElement("h2");
      title.className = "era-title";
      title.textContent = eraTitle;

      const header = document.createElement("div");
      header.className = "era-header";
      header.append(title);

      const grid = document.createElement("div");
      grid.className = "emperor-grid";

      era.emperors.forEach((emperor) => {
        grid.appendChild(createCard(emperor, era.tag));
      });

      section.append(header, grid);
      frag.appendChild(section);
    });

    container.appendChild(frag);
  };

  const updateTitle = () => {
    if (!titleEl) return;
    const zhTitle = titleEl.dataset.titleZh || "";
    const enTitle = titleEl.dataset.titleEn || "";
    titleEl.textContent = currentLang === "en" ? enTitle : zhTitle;
  };

  const setupLanguageToggle = () => {
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
        updateTitle();
        render();
      });
    });
  };

  render();
  setupLanguageToggle();
  updateTitle();
}
