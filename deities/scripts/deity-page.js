(() => {
  const fallbackImage = "../assets/rugatha-banner.jpg";

  const nameEl = document.querySelector("[data-deity='name']");
  const titleEl = document.querySelector("[data-deity='title']");
  const domainsEl = document.querySelector("[data-deity='domains']");
  const sayingEl = document.querySelector("[data-deity='saying']");
  const imageEl = document.querySelector("[data-deity='image']");
  const profileEl = document.querySelector(".deity-profile");
  const langButtons = document.querySelectorAll(".lang-toggle__button");
  const labelEls = document.querySelectorAll("[data-label-zh]");
  const ariaLabelEls = document.querySelectorAll("[data-aria-zh]");

  let currentLang = "zh";
  let deityData = null;

  const textOrFallback = (value, fallback = "") =>
    value ? String(value) : fallback;

  const getLocalizedText = (value, fallback = "") => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    if (currentLang === "en") {
      return value.en || value.zh || fallback;
    }
    return value.zh || value.en || fallback;
  };

  const getLocalizedList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") {
      if (currentLang === "en") return value.en || value.zh || [];
      return value.zh || value.en || [];
    }
    return [];
  };

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
    if (!data) return;
    const name = textOrFallback(getLocalizedText(data.name));
    const title = textOrFallback(getLocalizedText(data.title));
    const domains = getLocalizedList(data.domains);
    const saying = textOrFallback(getLocalizedText(data.saying)).trim();

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
      const suffix =
        currentLang === "en" ? "Deity of Rugatha" : "魯伽薩神祇";
      document.title = `${plainName} | ${suffix}`;
    }
  };

  const updateStaticLabels = () => {
    labelEls.forEach((el) => {
      const zh = el.dataset.labelZh || "";
      const en = el.dataset.labelEn || "";
      el.textContent = currentLang === "en" ? en : zh;
    });

    ariaLabelEls.forEach((el) => {
      const zh = el.dataset.ariaZh || "";
      const en = el.dataset.ariaEn || "";
      const next = currentLang === "en" ? en : zh;
      if (next) el.setAttribute("aria-label", next);
    });
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
        updateStaticLabels();
        fillContent(deityData);
      });
    });
  };

  const loadDeity = async () => {
    const slug = getSlug();
    const res = await fetch("../data/deities.json");
    if (!res.ok) throw new Error("Failed to load deity data");
    const list = await res.json();
    const data = list.find((item) => item.slug === slug);
    if (!data) throw new Error(`Deity not found for slug: ${slug}`);
    deityData = data;
    fillContent(deityData);
    updateStaticLabels();
    setupLanguageToggle();
  };

  loadDeity().catch((err) => {
    console.error(err);
    if (nameEl) nameEl.textContent = "Unknown Deity";
    if (titleEl) titleEl.textContent = "Unable to load details";
  });
})();
