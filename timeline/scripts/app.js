import { events } from "../data/events.js";

const listEl = document.getElementById("timeline-list");

const eraClasses = {
  dranison: "era-dranison",
  trinix: "era-trinix",
  lothum: "era-lothum",
  "new-dranison": "era-new-dranison"
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

render();
setupReveal();
