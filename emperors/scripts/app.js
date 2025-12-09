const EMPEROR_ERAS = [
  {
    title: "The Era of Dranison 卓尼森王朝",
    tag: "Dranison",
    emperors: [
      {
        name: "Walston the First\n沃斯頓一世",
        image: "gallery/dranison-walston.jpeg",
        title: "First Emperor of the Era 王朝首任皇帝",
        zhDesc: "「自由軍團」的首領。以「卓尼森革命」推翻艾米頓帝國的統治",
        enDesc: "The leader of 'The Legion of Freedom'. Overthrew the rule of the Emiton Empire on the island."
      },
      {
        name: "Georson the Thirteenth\n喬森十三世",
        image: "gallery/dranison-georson.jpeg",
        title: "Last Emperor of the Era 王朝末任皇帝",
        zhDesc: "在「平民革命」被俘，結束了卓尼森王朝的統治。",
        enDesc: "Was captured during 'the Common Revolution', ending the reign of the Dranison Empire."
      },
    ],
  },
  {
    title: "The Era of Trinix 崔尼斯王朝",
    tag: "Trinix",
    emperors: [
      {
        name: "Hollison the First\n霍里森一世",
        image: "gallery/trinix-hollison.jpeg",
        title: "First Emperor of the Era 王朝首任皇帝",
        zhDesc: "登基前為「崔尼斯的聖騎士」首領",
        enDesc: "He was originally the leader of 'the Paladin of Trinix' before becoming the emperor."
      },
      {
        name: "Reylan the Fifteenth\n瑞蘭十五世",
        image: "gallery/trinix-reylan.jpeg",
        title: "Last Emperor of the Era 王朝末任皇帝",
        zhDesc: "被東境妖精殘忍殺害。",
        enDesc: "Brutally murdered by the Elves of the East."
      },
    ],
  },
  {
    title: "The Era of Lothum 洛森王朝",
    tag: "Lothum",
    emperors: [
      {
        name: "Lorin the Conqueror\n征服者洛林",
        image: "gallery/lothum-lorin.jpeg",
        title: "First Emperor of the Era 王朝首任皇帝",
        zhDesc: "妖精軍團的首領洛林・瑞斯，推翻逐漸走向種族歧視的崔尼斯帝國。",
        enDesc: "Lorin Reese, the leader of the Elvish Legion. Overthrew the Trinix Empire, who was heading towards racial discrimination."
      },
      {
        name: "Jelix the Young\n年輕的傑里斯",
        image: "gallery/lothum-jelix.jpeg",
        title: "Last Emperor of the Era 王朝末任皇帝",
        zhDesc: "洛森王朝末任皇帝，被神秘的謀殺。",
        enDesc: "The last emperor of the Lothum Emperor, Jelix was murdered mysteriously."
      },
    ],
  },
  {
    title: "The Era of New Dranison 新卓尼森王朝",
    tag: "New Dranison",
    emperors: [
      {
        name: "Carlos the Seventh\n卡洛斯七世",
        image: "gallery/new-dranison-carlos.jpeg",
        title: "First Emperor of the Era 王朝首任皇帝",
        zhDesc: "原名卡洛斯・達米頓，自稱為卓尼斯後裔，登基後恢復自己卓尼森的姓氏。",
        enDesc: "He was originally named Carlos Demiton, but claimed to be a descendant of the Dranison bloodline, and so he used Dranison as his last name after he sat on the throne."
      },
      {
        name: "Kylenor the Sixth\n凱里諾六世",
        image: "gallery/new-dranison-kylenor.jpeg",
        title: "Current Emperor of the Era 王朝現任皇帝",
        zhDesc: "現任新卓尼森王朝卓尼森帝國皇帝。",
        enDesc: "The current emperor of the New Dranison Empire."
      },
    ],
  },
];

const container = document.getElementById("emperor-eras");

if (container) {
  const createCard = (emperor, tag) => {
    const card = document.createElement("a");
    card.className = "emperor-card";
    card.href = emperor.link;
    card.setAttribute("aria-label", `${emperor.name} (${tag})`);

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
    nameEl.innerHTML = emperor.name.replace(/\n/g, "<br>");

    const titleEl = document.createElement("p");
    titleEl.className = "card-title";
    titleEl.textContent = emperor.title || tag;

    const descZh = document.createElement("p");
    descZh.className = "card-desc zh";
    descZh.textContent = emperor.zhDesc || "";

    const descEn = document.createElement("p");
    descEn.className = "card-desc en";
    descEn.textContent = emperor.enDesc || "";

    const divider = document.createElement("div");
    divider.className = "card-divider";

    body.append(nameEl, titleEl, divider, descZh, descEn);
    card.append(portrait, body);

    return card;
  };

  EMPEROR_ERAS.forEach((era, index) => {
    const section = document.createElement("section");
    section.className = "era";
    section.setAttribute("aria-label", era.title);

    const title = document.createElement("h2");
    title.className = "era-title";
    title.textContent = era.title;

    const header = document.createElement("div");
    header.className = "era-header";
    header.append(title);

    const grid = document.createElement("div");
    grid.className = "emperor-grid";

    era.emperors.forEach((emperor) => {
      grid.appendChild(createCard(emperor, era.tag));
    });

    section.append(header, grid);
    container.appendChild(section);
  });
}
