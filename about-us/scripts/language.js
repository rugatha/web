// About-page copy and state are independent of Firebase and account loading.
(() => {
  const copy = {
  "headline": {
    "zh": "神祇與冒險碰撞，魔法與故事綻放",
    "en": "Where Gods and Adventures Meet, Magic and Stories Bloom"
  },
  "intro": {
    "zh": [
      "Rugatha D&D是台灣原創的「龍與地下城」世界觀、團務，與設定",
      "從2021年中第一次跑團，至今已經數年了",
      "一開始，我們只是一群私下跑團的朋友，但一路上認識了越來越多人，也組成擁有不同面向的團隊，一起擴展這個世界，寫下屬於我們獨有的故事"
    ],
    "en": [
      "Rugatha D&D is an original Dungeons & Dragons world, with campaigns and settings created in Taiwan.",
      "Our first session was in mid-2021, and we have been adventuring together ever since.",
      "We began as a group of friends playing D&D in private. Along the way, we met new people and built a team with diverse talents, expanding this world together and writing stories of our own."
    ]
  },
  "world": {
    "zh": "與官方不同的世界觀",
    "en": "A world beyond the official settings"
  },
  "stories": {
    "zh": "獨一無二的劇本",
    "en": "Original adventures"
  },
  "personal": {
    "zh": "從玩家角色出發，量身訂做的個人故事線",
    "en": "Personal storylines built around your characters"
  },
  "experience": {
    "zh": "你從未有過的D&D體驗",
    "en": "A D&D experience unlike any you have had before"
  },
  "journey": {
    "zh": "我們的旅程",
    "en": "Our journey"
  },
  "milestones": {
    "zh": "Rugatha 的里程碑",
    "en": "Rugatha MILESTONES"
  },
  "hsinchu": {
    "zh": "2026 5月新竹推廣會",
    "en": "May 2026 Hsinchu TRPG Showcase"
  },
  "hsinchu-copy": {
    "zh": "Rugatha D&D首次參與推廣會活動",
    "en": "Rugatha D&D took part in a TRPG showcase for the first time."
  },
  "fes26": {
    "zh": "2026 TRPG 嘉年華會",
    "en": "2026 TRPG Festival"
  },
  "d3": {
    "zh": "2025 龍山地下城",
    "en": "2025 D3 Convention"
  },
  "d3-copy": {
    "zh": "Rugatha D&D首次參與擺攤，並主持兩天共8場的D&D跑團體驗",
    "en": "Rugatha D&D ran its first convention booth and hosted eight introductory D&D sessions over two days."
  },
  "fes25": {
    "zh": "2025 TRPG 嘉年華會",
    "en": "2025 TRPG Festival"
  },
  "cards": {
    "zh": "Rugatha D&D名片初登場",
    "en": "Rugatha D&D business cards made their debut."
  },
  "wilds": {
    "zh": "新的一批冒險者們在貝瑟頓的酒館相遇，但他們並不知道，這是命運的牽引而非巧合",
    "en": "A new band of adventurers met at a tavern in Batherdon, unaware that fate, rather than chance, had brought them together."
  },
  "lite": {
    "zh": "新的冒險者加入殘存的夥伴，月神芬尼爾的勢力逐漸籠罩",
    "en": "New adventurers joined the surviving companions as the influence of Phyneal, the Moon God, spread."
  },
  "plus": {
    "zh": "冒險者分道揚鑣，冒險團隊之一回到麥克嵩探尋拉索斯的陰謀",
    "en": "The adventurers went their separate ways. One group returned to Macksohn to investigate the schemes of Laxthos."
  },
  "first": {
    "zh": "冒險者們第一次在Rugatha的世界登場",
    "en": "The adventurers entered the world of Rugatha for the first time."
  },
  "fes26-copy": {
    "zh": [
      "Rugatha D&D首次參與嘉年華，主持一天共4場的D&D跑團體驗",
      "2026公仔初登場，開放限時預購",
      "開始調查2027長團調查"
    ],
    "en": [
      "Rugatha D&D participated in the festival for the first time, hosting four introductory D&D sessions in one day.",
      "The 2026 miniatures debuted with limited-time preorders.",
      "We began gathering interest in long-running campaigns for 2027."
    ]
  },
  "promo": {
    "zh": "推廣會",
    "en": "Showcase"
  },
  "con": {
    "zh": "大型活動",
    "en": "Convention"
  },
  "campaign": {
    "zh": "團務",
    "en": "Campaign"
  },
  "hsinchu-meta": {
    "zh": "新竹推廣會",
    "en": "Hsinchu Showcase"
  },
  "donate": {
    "zh": "小額贊助",
    "en": "Support us"
  },
  "quote-1": {
    "zh": [
      "「你們會抑制仇恨、阻止它蔓延，還是讓歷史重演？」",
      "——《洛林精神：未曾訴說的歷史》"
    ],
    "en": [
      "\"Are you going to restrain and stop the hatred from spreading, or repeat the history?\"",
      "-- The Spirit of Lorin: The Untold History"
    ]
  },
  "quote-2": {
    "zh": [
      "「教會就是這樣吩咐我的。」麥特修士說。「這無關我的意願。這就是規則。」",
      "——《沉默與規則之下》"
    ],
    "en": [
      "\"This is what the church tells me to do.\" Says Brother Matt. \"It's not about what I want. THIS is the rule.\"",
      "-- Beneath Silence and Rules"
    ]
  },
  "quote-3": {
    "zh": [
      "「你想要的是答案，還是活著離開這個房間？」金龍溫柔地問道。",
      "——《屠龍者的餐桌》"
    ],
    "en": [
      "\"Is it the answer you want? Or to survive and leave this room?\" The Golden Dragon asked, in a gentle voice.",
      "-- The Dragonslayers' Dining Table"
    ]
  },
  "quote-4": {
    "zh": "嗨，我們是 Rugatha D&D :)",
    "en": "Hi we are Rugatha D&D :)"
  },
  "quote-5": {
    "zh": "一張張紙，如同拼圖般彼此嵌合。",
    "en": "Pieces of papers, like puzzles, fit into each others."
  },
  "quote-6": {
    "zh": "「賽巴諾，惡棍之城。」好吧，當然，有何不可？",
    "en": "\"Sebano, Town of Villains.\" Yeah, sure, why not?"
  },
  "quote-7": {
    "zh": "麥克嵩的城門依然矗立，但你知道，一切已不同於你第一次踏入這座城市的時候。",
    "en": "The gates of Macksohn was still there, but you know it's different from the first time you step into this city."
  },
  "quote-8": {
    "zh": "你們在一間酒館相遇……",
    "en": "You all meet in a tavern......"
  },
  "fes-meta": {
    "zh": "TRPG 嘉年華會",
    "en": "TRPG FES."
  },
  "d3-meta": {
    "zh": "龍山地下城",
    "en": "D3"
  }
};
  const storageKey = 'rugatha-about-lang';
  const button = document.querySelector('[data-lang-toggle]');
  if (!button) return;
  const labels = {
    home: {zh:'返回 Rugatha 首頁', en:'Back to Rugatha home'},
    timeline: {zh:'Rugatha 里程碑', en:'Rugatha milestones'}
  };
  function applyLanguage(value) {
    const language = value === 'en' ? 'en' : 'zh';
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-Hant';
    document.body.dataset.lang = language;
    document.title = language === 'en' ? 'About Us | Rugatha' : '關於我們 | Rugatha';
    document.querySelectorAll('[data-about-i18n]').forEach(node => {
      const value = copy[node.dataset.aboutI18n][language];
      const lines = Array.isArray(value) ? value : [value];
      node.replaceChildren();
      lines.forEach((line, index) => {
        if (index) node.append(document.createElement('br'));
        node.append(document.createTextNode(line));
      });
    });
    document.querySelectorAll('[data-about-label]').forEach(node => node.setAttribute('aria-label', labels[node.dataset.aboutLabel][language]));
    document.querySelector('[data-about-alt="photo"]').alt = language === 'en' ? 'A Rugatha group at the gaming table' : 'Rugatha 跑團合照';
    button.dataset.langOption = language;
    button.setAttribute('aria-label', language === 'en' ? 'Current language: English; switch to 中文' : '目前語言：中文；切換為 English');
    window.RugathaLanguageToggle?.setButtonIcon(button, language);
    try { localStorage.setItem(storageKey, language); } catch (_) {}
    window.dispatchEvent(new CustomEvent('rugatha:language-changed', {detail:{language}}));
  }
  button.addEventListener('click', () => applyLanguage(document.body.dataset.lang === 'en' ? 'zh' : 'en'));
  let initialLanguage = 'zh';
  try { initialLanguage = localStorage.getItem(storageKey) || 'zh'; } catch (_) {}
  applyLanguage(initialLanguage);
})();
