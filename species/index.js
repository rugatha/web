(() => {
  const types = {
    humanoid: { zh: '人形生物', en: 'Humanoid' },
    fey: { zh: '精類', en: 'Fey' },
    celestial: { zh: '天界生物', en: 'Celestial' },
    fiend: { zh: '邪魔', en: 'Fiend' },
    dragon: { zh: '龍類', en: 'Dragon' },
    giant: { zh: '巨人', en: 'Giant' },
    elemental: { zh: '元素生物', en: 'Elemental' },
    construct: { zh: '構裝生物', en: 'Construct' },
    'magical-creature': { zh: '魔法生物', en: 'Magical Creatures' },
    monstrosity: { zh: '怪物', en: 'Monstrosity' },
    ooze: { zh: '軟泥怪', en: 'Ooze' },
    undead: { zh: '不死生物', en: 'Undead' },
    beast: { zh: '野獸', en: 'Beast' },
    aberration: { zh: '異怪', en: 'Aberration' },
    deepling: { zh: '深淵生物', en: 'Deepling' },
    klaussian: { zh: '有鉗人', en: 'Klaussian' },
    plant: { zh: '植物', en: 'Plant' }
  };
  const copy = {
    zh: {
      eyebrow: 'RUGATHA · 種族圖鑑', title: '種族',
      lead: '認識在 Rugatha 世界中現身的各種生物。他們可能是冒險者、怪物、神魔，也有可能改變外型，潛伏在你我之中......',
      search: '搜尋種族名稱', searchLabel: '搜尋種族', filterLabel: '依生物類型篩選',
      all: '全部', count: n => `顯示 ${n} 個種族`, loading: '正在讀取種族資料…',
      empty: '找不到符合條件的種族。', error: '種族資料讀取失敗，請稍後重試。',
      pending: '此種族的介紹正在整理，之後會補上故事中的形象與登場脈絡。',
      subPending: '此亞種的介紹正在整理中。', portrait: name => `${name}的正面半身像`,
      button: '目前語言：中文', home: 'Rugatha 首頁'
    },
    en: {
      eyebrow: 'RUGATHA · SPECIES', title: 'Species',
      lead: 'Meet the species that set foot in the world of Rugatha. They could be adventurers, monsters, Gods or Demons. They might even alter their appearance, and lurk among us......',
      search: 'Search species names', searchLabel: 'Search species', filterLabel: 'Filter by creature type',
      all: 'All', count: n => `${n} species shown`, loading: 'Loading species…',
      empty: 'No species match your filters.', error: 'Unable to load species. Please try again later.',
      pending: 'This species profile is being prepared. Its appearance and story context will be added later.',
      subPending: 'This subspecies profile is being prepared.', portrait: name => `Front-facing portrait of ${name}`,
      button: 'Current language: English', home: 'Rugatha home'
    }
  };
  const $ = id => document.getElementById(id);
  const state = { language: 'zh', filters: new Set(), entries: [], loaded: false, error: false, openSubspecies: null };
  const search = $('species-search');
  const list = $('species-list');
  const filters = $('type-filters');
  const languageButton = $('language-button');

  try {
    const saved = localStorage.getItem('npc-lang');
    if (saved === 'zh' || saved === 'en') state.language = saved;
  } catch (_) { /* Storage may be unavailable. */ }

  const localized = value => value?.[state.language] || value?.zh || value?.en || '';
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function setLanguage(language) {
    state.language = language;
    const t = copy[language];
    document.documentElement.lang = language === 'zh' ? 'zh-Hant' : 'en';
    document.documentElement.dataset.lang = language;
    document.title = `${t.title} | Rugatha`;
    $('eyebrow').textContent = t.eyebrow;
    $('page-title').textContent = t.title;
    $('page-lead').textContent = t.lead;
    $('search-label').textContent = t.searchLabel;
    search.placeholder = t.search;
    filters.setAttribute('aria-label', t.filterLabel);
    document.querySelector('.banner').setAttribute('aria-label', t.home);
    languageButton.dataset.lang = language;
    languageButton.setAttribute('aria-label', t.button);
    window.RugathaLanguageToggle?.setButtonIcon(languageButton, language);
    try { localStorage.setItem('npc-lang', language); } catch (_) { /* Storage may be unavailable. */ }
    render();
  }

  function renderFilters() {
    const scrollLeft = filters.scrollLeft;
    filters.replaceChildren();
    filters.hidden = !state.loaded || state.error;
    if (filters.hidden) return;
    const present = new Set(state.entries.flatMap(entry => entry.creatureTypes));
    const choices = [['all', copy[state.language].all], ...Object.entries(types)
      .filter(([id]) => present.has(id))
      .map(([id, names]) => [id, names[state.language]])];
    for (const [id, label] of choices) {
      const button = make('button', 'filter-button', label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(id === 'all' ? state.filters.size === 0 : state.filters.has(id)));
      button.addEventListener('click', () => {
        if (id === 'all') state.filters.clear();
        else if (state.filters.has(id)) state.filters.delete(id);
        else state.filters.add(id);
        render();
      });
      filters.append(button);
    }
    filters.scrollLeft = scrollLeft;
  }

  function addExpandableButton(actions, panels, key, label, description, portraitSrc) {
    const id = `detail-${key}`;
    const button = make('button', 'detail-button', label);
    button.type = 'button';
    button.id = `toggle-${key}`;
    button.setAttribute('aria-controls', id);
    button.setAttribute('aria-expanded', String(state.openSubspecies === key));
    const panel = make('section', 'detail-panel');
    panel.id = id;
    panel.hidden = state.openSubspecies !== key;
    if (portraitSrc) {
      panel.classList.add('detail-panel--with-portrait');
      const portrait = make('div', 'detail-panel__portrait');
      const image = make('img', 'detail-panel__image');
      image.src = portraitSrc;
      image.alt = copy[state.language].portrait(label);
      image.loading = 'lazy';
      image.width = 1254;
      image.height = 1254;
      image.addEventListener('error', () => {
        portrait.remove();
        panel.classList.remove('detail-panel--with-portrait');
      }, { once: true });
      portrait.append(image);
      panel.append(portrait);
    }
    const content = make('div', 'detail-panel__content');
    content.append(make('h3', 'detail-panel__title', label), make('p', 'detail-panel__copy', description));
    panel.append(content);
    button.addEventListener('click', () => {
      const previous = state.openSubspecies;
      if (previous && previous !== key) {
        const oldButton = document.getElementById(`toggle-${previous}`);
        const oldPanel = document.getElementById(`detail-${previous}`);
        oldButton?.setAttribute('aria-expanded', 'false');
        if (oldPanel) oldPanel.hidden = true;
      }
      const opening = state.openSubspecies !== key;
      state.openSubspecies = opening ? key : null;
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
    });
    actions.append(button);
    panels.append(panel);
  }

  function makeCard(entry) {
    const t = copy[state.language];
    const name = localized(entry.name) || entry.id;
    const description = localized(entry.desc) || t.pending;
    const item = make('article', 'species-item');
    const card = make('div', 'species-card');
    card.setAttribute('aria-label', name);
    const copyWrap = make('div', 'card-copy');
    const heading = make('div', 'card-heading');
    heading.append(make('h2', 'card-name', name));
    const tags = make('div', 'card-types');
    for (const type of entry.creatureTypes) {
      tags.append(make('span', 'type-tag', types[type]?.[state.language] || type));
    }
    heading.append(tags);
    copyWrap.append(heading);
    copyWrap.append(make('p', 'card-description', description));
    const actions = make('div', 'card-actions');
    const panels = make('div', 'detail-panels');
    for (const [subId, sub] of Object.entries(entry.subspecies)) {
      const subName = localized(sub.name) || subId;
      addExpandableButton(actions, panels, `subspecies-${entry.id}-${subId}`, subName, localized(sub.desc) || t.subPending, sub.portrait);
    }
    copyWrap.append(actions);
    card.append(copyWrap);
    const portrait = make('div', 'portrait-window');
    const image = make('img', 'card-portrait');
    image.src = entry.portrait;
    image.alt = t.portrait(name);
    image.loading = 'lazy';
    image.width = 1254;
    image.height = 1254;
    portrait.append(image);
    card.append(portrait);
    item.append(card, panels);
    return item;
  }

  function render() {
    const t = copy[state.language];
    renderFilters();
    list.replaceChildren();
    if (state.error || !state.loaded) {
      const message = make('p', 'page-message', state.error ? t.error : t.loading);
      message.setAttribute('role', 'status');
      list.append(message);
      $('search-count').textContent = '';
      return;
    }
    const query = search.value.trim().toLocaleLowerCase();
    const matches = state.entries.filter(entry => {
      const typeMatches = state.filters.size === 0 || entry.creatureTypes.some(type => state.filters.has(type));
      const subspeciesNames = Object.entries(entry.subspecies).flatMap(([id, sub]) =>
        [id, sub.name?.zh, sub.name?.en, ...(sub.aliases?.zh || []), ...(sub.aliases?.en || [])]);
      const textMatches = !query || [entry.id, entry.name.zh, entry.name.en, ...(entry.aliases?.zh || []), ...(entry.aliases?.en || []), ...subspeciesNames]
        .some(value => String(value || '').toLocaleLowerCase().includes(query));
      return typeMatches && textMatches;
    });
    $('search-count').textContent = t.count(matches.length);
    if (!matches.length) {
      const message = make('p', 'page-message', t.empty);
      message.setAttribute('role', 'status');
      list.append(message);
      return;
    }
    for (const entry of matches) list.append(makeCard(entry));
  }

  languageButton.addEventListener('click', () => setLanguage(state.language === 'zh' ? 'en' : 'zh'));
  search.addEventListener('input', render);
  setLanguage(state.language);
  fetch('data/species.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      state.entries = Object.entries(data)
        .filter(([, species]) => species?.portrait && species.name && Array.isArray(species['creature-type']) && species['creature-type'].length)
        .map(([id, species]) => ({
          id, name: species.name, aliases: species.aliases, desc: species.desc, portrait: species.portrait,
          creatureTypes: species['creature-type'], subspecies: species.subspecies || {}
        }));
      state.loaded = true;
      render();
    })
    .catch(error => {
      console.error('Unable to load species data', error);
      state.error = true;
      render();
    });
})();
