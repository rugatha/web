(() => {
  const translations = new Map(Object.entries({
    '角色相遇時間軸': 'Character Encounters',
    '以西比爾的歲數為時間基準，記錄五位角色相遇、分離，以及命運再次交會的時刻。': 'Using Sibyl’s age as the reference, follow five characters as they meet, part ways, and cross paths again.',
    '角色篩選': 'Character filters',
    '可同時選取多位角色': 'Select multiple characters',
    '全部角色': 'All characters',
    '清除角色': 'Clear selection',
    '年份 · 事件': 'Year · Event',
    '相遇': 'Encounter',
    '離開': 'Departure',
    '歲': 'years old',
    '尚未相遇': 'Not yet met',
    '無事件': 'No event',
    'Rugatha Veil 角色相遇與離開時間軸。列為年份，欄為角色，數字為事件發生時各角色的年齡。': 'Rugatha Veil encounters and departures. Rows show years, columns show characters, and numbers show each character’s age at the event.'
  }));
  const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
  const copies = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const key = node.textContent.trim();
    if (translations.has(key)) copies.push({ node, original: node.textContent, key });
  }
  const button = document.querySelector('[data-lang-toggle]');
  const storageKey = 'rugatha-veil-timeline-lang';
  let language = 'zh';
  try { if (localStorage.getItem(storageKey) === 'en') language = 'en'; } catch (_) {}
  function applyLanguage(next) {
    language = next === 'en' ? 'en' : 'zh';
    const english = language === 'en';
    document.body.dataset.lang = language;
    document.documentElement.lang = english ? 'en' : 'zh-Hant';
    document.title = english ? 'Character Encounters | Rugatha Veil' : '角色相遇時間軸｜Rugatha Veil';
    copies.forEach(({ node, original, key }) => { node.textContent = english ? original.replace(key, translations.get(key)) : original; });
    button.dataset.langOption = language;
    button.setAttribute('aria-label', english ? 'Current language: English; switch to Chinese' : '目前語言：中文；切換為英文');
    button.setAttribute('aria-pressed', String(english));
    window.RugathaLanguageToggle.setButtonIcon(button, language);
    document.querySelector('.site-mark a').setAttribute('aria-label', english ? 'Back to Rugatha home' : '返回 Rugatha 首頁');
    document.querySelector('.filters').setAttribute('aria-label', english ? 'Filter timeline characters' : '篩選時間軸角色');
    document.querySelector('.timeline-scroll').setAttribute('aria-label', english ? 'Character timeline; scroll horizontally' : '角色時間軸，可水平捲動');
    document.querySelector('meta[name="description"]').content = english
      ? 'A timeline of Rugatha Veil character encounters and departures, using Sibyl’s age as the reference.'
      : '以西比爾的年齡為基準，整理 Rugatha Veil 角色相遇與離開的年份。';
    try { localStorage.setItem(storageKey, language); } catch (_) {}
    window.dispatchEvent(new CustomEvent('rugatha:language-changed', { detail: { language } }));
  }
  button.addEventListener('click', () => applyLanguage(language === 'en' ? 'zh' : 'en'));
  applyLanguage(language);
})();
