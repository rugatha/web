(function () {
  const scriptUrl = document.currentScript ? document.currentScript.src : "";
  const assetBase = scriptUrl ? new URL("../assets/", scriptUrl) : new URL("/assets/", window.location.origin);
  const iconSize = 44;

  const normalizeLanguage = (language) => language === "en" ? "en" : "zh";

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
    iconSize,
    getIconUrl,
    ensureIcon,
    setButtonIcon,
    sync
  };

  document.addEventListener("DOMContentLoaded", () => sync(document));
})();
