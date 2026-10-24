export function createLocationCards(locations, language = "zh") {
  const en = language === "en";
  const name = (node) => node[en ? "name_en" : "name_zh"] || node.name_zh || node.name_en;
  const section = document.createElement("section");
  section.className = "related-locations";
  const heading = document.createElement("h2");
  heading.className = "related-locations__title";
  heading.textContent = en ? "Locations" : "登場地點";
  section.appendChild(heading);
  const cities = locations.filter((location) => location.depth === 3);
  for (const city of cities) {
    const group = document.createElement("section");
    group.className = "related-locations__group";
    group.setAttribute("aria-label", name(city.node));
    const card = document.createElement("a");
    card.className = "related-locations__city";
    card.href = city.href;
    const art = document.createElement("img");
    art.className = "related-locations__city-image";
    art.src = city.image;
    art.alt = "";
    art.loading = "lazy";
    art.decoding = "async";
    art.width = 720;
    art.height = 405;
    card.appendChild(art);
    const title = document.createElement("h3");
    title.className = "related-locations__city-name";
    title.textContent = name(city.node);
    card.appendChild(title);
    group.appendChild(card);

    const pois = locations.filter((location) => location.depth === 4 && location.ancestors.at(-1) === city.node);
    if (pois.length) {
      const poiSection = document.createElement("div");
      poiSection.className = "related-locations__poi-section";
      poiSection.setAttribute("aria-label", en ? "Points of interest" : "景點");
      const grid = document.createElement("div");
      grid.className = "related-npcs__grid related-locations__pois";
      for (const { node, href, image } of pois) {
        const poi = document.createElement("a");
        poi.className = "related-npcs__card related-locations__poi";
        poi.href = href;
        const preview = document.createElement("img");
        preview.className = "related-npcs__image";
        preview.src = image;
        preview.alt = "";
        preview.loading = "lazy";
        preview.decoding = "async";
        preview.width = 140;
        preview.height = 140;
        poi.appendChild(preview);
        const label = document.createElement("div");
        label.className = "related-npcs__name";
        label.textContent = name(node);
        poi.appendChild(label);
        grid.appendChild(poi);
      }
      poiSection.appendChild(grid);
      group.appendChild(poiSection);
    }
    section.appendChild(group);
  }
  return section;
}
