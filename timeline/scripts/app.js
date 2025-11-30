import { events } from "../data/events.js";

const listEl = document.getElementById("timeline-list");

const eraClasses = {
  dranison: "era-dranison",
  trinix: "era-trinix",
  lothum: "era-lothum",
  "new-dranison": "era-new-dranison"
};

function renderEra(item) {
  const li = document.createElement("li");
  li.className = `timeline-item era ${eraClasses[item.era] || ""}`;

  const content = document.createElement("div");
  content.className = "card";
  content.innerHTML = `
    <p class="label">${item.title}<br>${item.subtitle || ""}</p>
    <p class="meta">${item.span || ""}</p>
  `;

  li.appendChild(content);
  return li;
}

function renderEvent(item) {
  const li = document.createElement("li");
  li.className = `timeline-item event ${eraClasses[item.era] || ""}`;

  const content = document.createElement("div");
  content.className = "card";

  const title = item.url
    ? `<a href="${item.url}" target="_blank" rel="noopener">${item.title}</a>`
    : item.title;

  content.innerHTML = `
    <p class="label">${title}</p>
    <p class="meta">${item.date || ""}</p>
  `;

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
