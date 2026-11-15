(function () {
  const scriptUrl = document.currentScript ? document.currentScript.src : "";
  const assetBase = scriptUrl ? new URL("../assets/others/", scriptUrl) : new URL("/assets/others/", window.location.origin);
  const iconSize = 44;

  const normalizeLanguage = (language) => language === "en" ? "en" : "zh";

  // All pages share this device preference. Ignore the old per-page keys:
  // they can disagree and have no timestamp identifying the latest choice.
  const storageKey = "rugatha-language";
  const getLanguage = () => {
    try {
      return normalizeLanguage(localStorage.getItem(storageKey));
    } catch (_) {
      return "zh";
    }
  };
  const setLanguage = (language) => {
    const next = normalizeLanguage(language);
    try { localStorage.setItem(storageKey, next); } catch (_) {}
    return next;
  };

  const getIconUrl = (language) =>
    new URL(`lan-${normalizeLanguage(language)}.png`, assetBase).href;

  const getButtonLanguage = (button, fallbackLanguage) =>
    normalizeLanguage(
      fallbackLanguage ||
      button.dataset.lang ||
      button.dataset.langOption ||
      document.body.dataset.lang ||
      document.documentElement.dataset.lang ||
      document.documentElement.lang
    );

  const ensureIcon = (button) => {
    let icon = button.querySelector(".language-toggle__icon");
    if (!icon) {
      icon = document.createElement("img");
      icon.className = "language-toggle__icon";
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
    }
    icon.width = iconSize;
    icon.height = iconSize;
    return icon;
  };

  const setButtonIcon = (button, language) => {
    if (!button) return null;
    const icon = ensureIcon(button);
    icon.src = getIconUrl(getButtonLanguage(button, language));
    return icon;
  };

  const sync = (root, language) => {
    const scope = root || document;
    const buttons = scope.matches && scope.matches("[data-lang-toggle]")
      ? [scope]
      : Array.from(scope.querySelectorAll("[data-lang-toggle]"));
    buttons.forEach((button) => setButtonIcon(button, language));
  };

  window.RugathaLanguageToggle = {
    storageKey,
    getLanguage,
    setLanguage,
    iconSize,
    getIconUrl,
    ensureIcon,
    setButtonIcon,
    sync
  };

  document.addEventListener("DOMContentLoaded", () => sync(document));
})();
