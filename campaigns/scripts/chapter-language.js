(() => {
  const button = document.querySelector('[data-chapter-language-toggle]');
  if (!button) return;
  let language = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  try {
    const stored = localStorage.getItem('npc-lang');
    if (stored === 'en' || stored === 'zh') language = stored;
  } catch (_) { /* Language switching also works without storage. */ }

  const apply = () => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-TW';
    document.documentElement.dataset.lang = language;
    window.__RUGATHA_CHAPTER_LANG = language;
    document.querySelectorAll('[data-text-zh][data-text-en]').forEach(node => {
      node.textContent = node.dataset[language === 'en' ? 'textEn' : 'textZh'];
    });
    document.querySelectorAll('[data-placeholder-zh][data-placeholder-en]').forEach(node => {
      node.placeholder = node.dataset[language === 'en' ? 'placeholderEn' : 'placeholderZh'];
    });
    button.dataset.lang = language;
    button.setAttribute('aria-label', language === 'en' ? 'Switch to 中文' : 'Switch to English');
    window.RugathaLanguageToggle?.setButtonIcon(button, language);
    const title = document.querySelector('#chapter-title');
    if (title) document.title = `${title.textContent} | Rugatha Plus`;
    window.dispatchEvent(new CustomEvent('rugatha:chapter-language-change', { detail: { lang: language } }));
  };
  button.addEventListener('click', () => {
    language = language === 'en' ? 'zh' : 'en';
    try { localStorage.setItem('npc-lang', language); } catch (_) { /* Optional. */ }
    apply();
  });
  apply();
})();
