(() => {
  const existing = document.querySelector(".return-home");
  if (existing) return;

  const pathParts =
    window.location && window.location.pathname
      ? window.location.pathname.split("/").filter(Boolean)
      : [];
  const pagesIdx = pathParts.indexOf("pages");
  const afterPages = pagesIdx >= 0 ? pathParts.slice(pagesIdx + 1) : [];
  const isTopCampaignIndex =
    afterPages.length === 2 &&
    afterPages[1].replace(/index\.html?$/i, "index.html") === "index.html";
  if (isTopCampaignIndex) return;

  const page = document.querySelector(".page") || document.body;
  if (!page) return;

  const deriveHome = () => {
    const path = window.location && window.location.pathname ? window.location.pathname : "/";
    const normalized = path.replace(/index\.html?$/i, "").replace(/\/+$/, "/");
    const trimmed = normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
    const parent = trimmed.slice(0, trimmed.lastIndexOf("/") + 1) || "/";
    return parent;
  };

  const href = deriveHome();
  const wrap = document.createElement("div");
  wrap.className = "return-home";
  const link = document.createElement("a");
  link.className = "return-home__link";
  link.href = href;
  link.textContent = "\u2190";
  link.setAttribute("aria-label", "返回上一層");
  link.title = "返回上一層";
  wrap.appendChild(link);
  page.appendChild(wrap);
})();
