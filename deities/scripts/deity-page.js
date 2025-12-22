(() => {
  const fallbackImage = "../assets/rugatha-banner.jpg";

  const textOrFallback = (value, fallback = "") =>
    value ? String(value) : fallback;

  const nameEl = document.querySelector("[data-deity='name']");
  const titleEl = document.querySelector("[data-deity='title']");
  const domainsEl = document.querySelector("[data-deity='domains']");
  const sayingEl = document.querySelector("[data-deity='saying']");
  const imageEl = document.querySelector("[data-deity='image']");
  const profileEl = document.querySelector(".deity-profile");

  const getSlug = () => {
    if (window.deitySlug) return window.deitySlug;
    const parts = window.location.pathname.split("/");
    const last = parts.pop() || parts.pop();
    return (last || "").replace(".html", "");
  };

  const setHeroImage = (image) => {
    if (profileEl) {
      profileEl.style.setProperty("--hero-image", `url(${image})`);
    }
  };

  const resolveImagePath = (path) => {
    if (!path) return path;
    if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) {
      return path;
    }
    if (path.startsWith("../") || path.startsWith("./") || path.startsWith("/")) {
      return path;
    }
    return `../${path}`;
  };

  const fillContent = (data) => {
    const name = textOrFallback(data.name);
    const title = textOrFallback(data.title);
    const domains = Array.isArray(data.domains) ? data.domains : [];
    const saying = textOrFallback(data.saying).trim();

    if (nameEl) nameEl.textContent = name;
    if (titleEl) titleEl.textContent = title;

    if (imageEl) {
      if (data.image) {
        const imagePath = resolveImagePath(data.image);
        imageEl.src = imagePath;
        imageEl.alt = `${name} portrait`;
        setHeroImage(imagePath);
      } else {
        imageEl.src = fallbackImage;
        imageEl.classList.add("fallback");
        imageEl.setAttribute("aria-label", name || "Deity portrait");
        setHeroImage(fallbackImage);
      }
    }

    if (domainsEl) {
      domainsEl.innerHTML = "";
      domains.forEach((domain) => {
        const chip = document.createElement("span");
        chip.className = "domain-chip";
        chip.textContent = domain;
        domainsEl.appendChild(chip);
      });
    }

    if (sayingEl) {
      if (saying) {
        sayingEl.textContent = saying;
      } else {
        sayingEl.remove();
      }
    }

    if (name) {
      const plainName = name.replace(/\s+/g, " ").trim();
      document.title = `${plainName} | Deity of Rugatha`;
    }
  };

  const loadDeity = async () => {
    const slug = getSlug();
    const res = await fetch("../data/deities.json");
    if (!res.ok) throw new Error("Failed to load deity data");
    const list = await res.json();
    const data = list.find((item) => item.slug === slug);
    if (!data) throw new Error(`Deity not found for slug: ${slug}`);
    fillContent(data);
  };

  loadDeity().catch((err) => {
    console.error(err);
    if (nameEl) nameEl.textContent = "Unknown Deity";
    if (titleEl) titleEl.textContent = "Unable to load details";
  });
})();
