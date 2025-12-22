import { events } from "../data/events.js";

const listEl = document.getElementById("timeline-list");

const eraClasses = {
  dranison: "era-dranison",
  trinix: "era-trinix",
  lothum: "era-lothum",
  "new-dranison": "era-new-dranison"
};

const tagClasses = {
  history: "tag-history",
  rugatha: "tag-rugatha",
  "rugatha-plus": "tag-rugatha-plus",
  "rugatha-legends": "tag-rugatha-legends",
  "rugatha-lite": "tag-rugatha-lite",
  "rugatha-wilds": "tag-rugatha-wilds",
  "rugatha-brown": "tag-rugatha-brown"
};

function appendDescription(cardEl, description) {
  if (!description) return;

  const descEl = document.createElement("p");
  descEl.className = "description";
  descEl.textContent = description;
  cardEl.appendChild(descEl);

  cardEl.classList.add("has-description");
  cardEl.setAttribute("role", "button");
  cardEl.tabIndex = 0;
  cardEl.setAttribute("aria-expanded", "false");

  const toggle = () => {
    const expanded = cardEl.classList.toggle("expanded");
    cardEl.setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  cardEl.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    toggle();
  });

  cardEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
  });
}

function renderEra(item) {
  const li = document.createElement("li");
  li.className = `timeline-item era ${eraClasses[item.era] || ""}`;
  li.dataset.era = item.era || "";
  const description = item.description || item.desc || "";

  const content = document.createElement("div");
  content.className = "card";
  content.innerHTML = `
    <p class="label">${item.title}<br>${item.subtitle || ""}</p>
    <p class="meta">${item.span || ""}</p>
  `;
  appendDescription(content, description);

  li.appendChild(content);
  return li;
}

function renderEvent(item) {
  const li = document.createElement("li");
  li.className = `timeline-item event ${eraClasses[item.era] || ""}`;
  const tag = item.tag || "history";
  li.dataset.era = item.era || "";
  li.dataset.tag = tag;
  const tagClass = tagClasses[tag] || "";
  if (tagClass) {
    li.classList.add(tagClass);
  }
  const description = item.description || item.desc || "";

  const content = document.createElement("div");
  content.className = "card";

  content.innerHTML = `
    <p class="label">${item.title}</p>
    <p class="meta">${item.date || ""}</p>
  `;
  appendDescription(content, description);

  li.appendChild(content);
  return li;
}

function render() {
  const frag = document.createDocumentFragment();
  events.forEach((item) => {
    const node = item.type === "era" ? renderEra(item) : renderEvent(item);
    frag.appendChild(node);
  });
  listEl.appendChild(frag);
}

function setupReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );

  listEl.querySelectorAll("li").forEach((li) => observer.observe(li));
}

function setupFilters() {
  const filterButtons = document.querySelectorAll(".timeline-legend__button");
  if (!filterButtons.length) return;

  const allButton = Array.from(filterButtons).find((button) => button.dataset.tag === "all");
  const tagButtons = Array.from(filterButtons).filter((button) => button.dataset.tag !== "all");

  const setButtonState = (button, isActive) => {
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  };

  const applyFilter = (selectedTags) => {
    const showAll = selectedTags.length === 0;
    listEl.querySelectorAll("li.event").forEach((li) => {
      li.hidden = !showAll && !selectedTags.includes(li.dataset.tag);
    });

    if (showAll) {
      listEl.querySelectorAll("li.era").forEach((li) => {
        li.hidden = false;
      });
      return;
    }

    const visibleByEra = new Map();
    listEl.querySelectorAll("li.event").forEach((li) => {
      if (li.hidden) return;
      const era = li.dataset.era || "";
      if (!era) return;
      visibleByEra.set(era, true);
    });

    listEl.querySelectorAll("li.era").forEach((li) => {
      const era = li.dataset.era || "";
      li.hidden = !visibleByEra.has(era);
    });
  };

  const updateFilter = () => {
    const selectedTags = tagButtons
      .filter((button) => button.classList.contains("is-active"))
      .map((button) => button.dataset.tag)
      .filter(Boolean);
    const isAllActive = selectedTags.length === 0;
    if (allButton) setButtonState(allButton, isAllActive);
    applyFilter(selectedTags);
  };

  if (allButton) {
    allButton.addEventListener("click", () => {
      tagButtons.forEach((button) => setButtonState(button, false));
      setButtonState(allButton, true);
      applyFilter([]);
    });
  }

  tagButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const isActive = !button.classList.contains("is-active");
      setButtonState(button, isActive);
      if (allButton) setButtonState(allButton, false);
      updateFilter();
    });
  });
}

render();
setupReveal();
setupFilters();
