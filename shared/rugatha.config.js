// Shared Rugatha configuration used by the campaigns, graph, and NPC tools.
(function (global) {
  const currentScript =
    (typeof document !== "undefined" && document.currentScript) ||
    (typeof document !== "undefined" &&
      Array.from(document.getElementsByTagName("script") || []).find((el) =>
        (el.src || "").includes("rugatha.config.js")
      ));
  const scriptUrl = (() => {
    try {
      if (currentScript && currentScript.src) {
        return new URL(currentScript.src, window.location.href);
      }
      return new URL("shared/rugatha.config.js", window.location.href);
    } catch (_) {
      return null;
    }
  })();
  const baseUrl = scriptUrl ? new URL("./", scriptUrl).href : window.location.href;
  const campaignsBase =
    scriptUrl && scriptUrl.pathname.includes("/shared/")
      ? new URL("../campaigns/", scriptUrl).href
      : new URL("/campaigns/", baseUrl).href;
  const resolveInternalPath = (value) => {
    if (typeof value !== "string" || !value.length) return value;
    if (
      value.startsWith("./") ||
      value.startsWith("../") ||
      value.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
      value.startsWith("//")
    ) {
      return value;
    }
    const sanitized = value.replace(/^\//, "");
    try {
      return new URL(sanitized, campaignsBase).href;
    } catch (err) {
      return `${campaignsBase}${sanitized}`;
    }
  };

  global.RUGATHA_BASE_URL = baseUrl;
  global.RUGATHA_CAMPAIGNS_BASE = campaignsBase;
  global.RUGATHA_RESOLVE = resolveInternalPath;

  const campaigns = [
    {
      name: "Rugatha",
      tagline: "Where Gods Collide",
      dates: "2021/5/22 ~ 2022/7/16",
      link: "https://rugatha.com/campaigns/",
      page: "./pages/rugatha/index.html",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-logo.jpg",
      accent: "#9fe0ba",
      nextSession: "團務完結 Campaign Ended"
    },
    {
      name: "RUGATHA Plus",
      tagline: "Adventures & Mysteries Awaits",
      dates: "2022/7/23 ~",
      link: "https://rugatha.com/rugatha-plus/",
      page: "./pages/rugatha-plus/index.html",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-plus-logo-1.jpg",
      accent: "#c8f9ff",
      nextSession: "2026/1"
    },
    {
      name: "Rugatha lite",
      tagline: "Stories & Treasures Awaits",
      dates: "2022/8/6 ~",
      link: "https://rugatha.com/rugatha-lite/",
      page: "./pages/rugatha-lite/index.html",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-light-logo-1.jpg",
      accent: "#ffe7a3",
      nextSession: "2026/1"
    },
    {
      name: "Rugatha WILDS",
      tagline: "Wisdon & Ingenuity... Leads to Daring Success",
      dates: "2024/3/16 ~",
      link: "https://rugatha.com/rugatha-wilds/",
      page: "./pages/rugatha-wilds/index.html",
      image: "https://rugatha.com/wp-content/uploads/2024/03/rugatha-wilds-logo.jpg",
      accent: "#c1e27a",
      nextSession: "2026/1"
    },
    {
      name: "RUGATHA Plus 1",
      tagline: "LET'S GET ROLLING IN THE DEEEEEEEP",
      dates: "2024/7/13 ~ 2024/11/23",
      link: "https://rugatha.com/rugatha-plus-1/",
      page: "./pages/rugatha-plus-1/index.html",
      image: "https://rugatha.com/wp-content/uploads/2024/06/rugatha-plus-one.png",
      accent: "#ffd0f0",
      nextSession: "團務完結 Campaign Ended"
    },
    {
      name: "Rugatha Brown",
      tagline: "Descend into Darkness",
      dates: "2022/11/7 ~ 2023/3/14",
      link: "https://rugatha.com/rugatha-brown/",
      page: "./pages/rugatha-brown/index.html",
      image: "https://rugatha.com/wp-content/uploads/2022/11/rugatha-brown-logo-1.jpg",
      accent: "#ffc09f",
      nextSession: "團務完結 Campaign Ended"
    },
    {
      name: "Rugatha Legends",
      tagline: "Adventures. Heroes. Legends.",
      dates: "2022/2/7 ~",
      link: "https://rugatha.com/rugatha-legends/",
      page: "./pages/rugatha-legends/index.html",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-legends.jpg",
      accent: "#f6d185",
      nextSession: "未訂 TBD"
    }
  ];

  let graphNodes = [
    // Level 1 (root)
    { id: "rugatha", label: "Rugatha", level: 1, parent: null },

    // ===== Rugatha (main line) =====
    { id: "rugatha-main", label: "Rugatha", level: 2, parent: "rugatha" },
    {
      id: "rugatha-c01",
      label: "Curse of Vowalon",
      title: "Curse of Vowalon 沃瓦倫的詛咒",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c02",
      label: "Beneath the Temple",
      title: "Beneath the Temple 殿堂之下",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c03",
      label: "Korringfield Reunion",
      title: "Korringfield Reunion 寇林菲爾德重逢",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c04",
      label: "The Blooming of Macksohn",
      title: "The Blooming of Macksohn 麥克嵩的綻放",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c05",
      label: "Mattington Shattered",
      title: "Mattington Shattered 麥丁頓的破碎",
      level: 3,
      parent: "rugatha-main"
    },

    // ===== Rugatha Plus =====
    {
      id: "plus",
      label: "Rugatha Plus",
      level: 2,
      parent: "rugatha",
      extraParents: ["rugatha-main"]
    },
    {
      id: "plus-c05",
      label: "Mattington Shattered",
      title: "Mattington Shattered 麥丁頓的破碎",
      level: 3,
      parent: "plus"
    },
    {
      id: "plus-c06",
      label: "Hand of the Lich",
      title: "Hand of the Lich 巫妖之手",
      level: 3,
      parent: "plus"
    },
    {
      id: "plus-c07",
      label: "Before the Next Full Moon",
      title: "Before the Next Full Moon 滿月來臨之前",
      level: 3,
      parent: "plus"
    },

    // ===== Rugatha Plus 1 =====
    { id: "plus1", label: "Rugatha Plus 1", level: 2, parent: "rugatha" },
    {
      id: "plus1-c01",
      label: "To the Deep and Back",
      title: "To the Deep and Back 往返深淵",
      level: 3,
      parent: "plus1",
      url: "/campaigns/pages/rugatha-plus-1/plus1-c01/"
    },

    // ===== Rugatha lite =====
    {
      id: "lite",
      label: "Rugatha lite",
      level: 2,
      parent: "rugatha",
      extraParents: ["rugatha-main"]
    },
    {
      id: "lite-c05",
      label: "Mattington Shattered",
      title: "Mattington Shattered 麥丁頓的破碎",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c06",
      label: "The Gift from Alfenor",
      title: "The Gift from Alfenor 阿爾芬諾之禮",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c07",
      label: "Lurking Dangers",
      title: "Lurking Dangers 危機四伏",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c08",
      label: "Deep into Lothum",
      title: "Deep into Lothum 深入洛森",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c09",
      label: "The Cave of Drogsland",
      title: "The Cave of Drogsland 卓茲蘭之穴",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c10",
      label: "Requiem of the Feathered Island",
      title: "Requiem of the Feathered Island 覆羽莊園的輓歌",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c11",
      label: "Seats of the Eclipse",
      title: "Seats of the Eclipse 月蝕之席",
      level: 3,
      parent: "lite"
    },

    // ===== Rugatha WILDS =====
    { id: "wilds", label: "Rugatha WILDS", level: 2, parent: "rugatha" },
    {
      id: "wilds-c01",
      label: "The Elite Bloodline",
      title: "The Elite Bloodline 菁英血脈",
      level: 3,
      parent: "wilds"
    },
    {
      id: "wilds-c02",
      label: "Gathering of the Chosen",
      title: "Gathering of the Chosen 天選集會",
      level: 3,
      parent: "wilds"
    },
    {
      id: "wilds-c03",
      label: "Storm of Mudtown",
      title: "Storm of Mudtown 土城風暴",
      level: 3,
      parent: "wilds"
    },
    {
      id: "wilds-c04",
      label: "Heir to Rathanad",
      title: "Heir to Rathanad 拉撒拿的傳人",
      level: 3,
      parent: "wilds"
    },

    // ===== Rugatha Brown =====
    { id: "brown", label: "Rugatha Brown", level: 2, parent: "rugatha" },
    {
      id: "brown-c01",
      label: "Dark Petals",
      title: "Dark Petals 深色花瓣",
      level: 3,
      parent: "brown"
    },
    {
      id: "brown-c02",
      label: "Howling of the Wolf",
      title: "Howling of the Wolf 狼嚎",
      level: 3,
      parent: "brown"
    },

    // ===== Rugatha Legends =====
    { id: "legends", label: "Rugatha Legends", level: 2, parent: "rugatha" },
    {
      id: "legends-os01",
      label: "The False Hydra of Moorland Haunt",
      title: "The False Hydra of Moorland Haunt 鬧鬼荒野的偽多頭龍",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os02",
      label: "The Disappearance of Gustavo Norman",
      title: "The Disappearance of Gustavo Norman 古斯塔夫・諾曼的失蹤",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os03",
      label: "The Lighthouse on the Deserted Island",
      title: "The Lighthouse on the Deserted Island 荒島燈塔",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os04",
      label: "The Deadly Prison Break",
      title: "The Deadly Prison Break 致命越獄",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os05",
      label: "Dragon’s Orb",
      title: "Dragon’s Orb 龍之球",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os06",
      label: "The Malicious Rise of Alfenor",
      title: "The Malicious Rise of Alfenor 阿爾芬諾的惡邪誕生",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os07",
      label: "Mylstan Colossus",
      title: "Mylstan Colossus 邁爾斯坦巨像",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os08",
      label: "Lord Octavian von Oderick’s Dungeon of Randomness",
      title: "Lord Octavian von Oderick’s Dungeon of Randomness 屋大維・歐德里克大人的隨機地下城",
      level: 3,
      parent: "legends"
    },

    // ===== Rugatha Experience =====
    { id: "exp", label: "Rugatha Experience", level: 2, parent: "rugatha" },
    {
      id: "exp-e01",
      label: "The Scroll of the Golden Castle",
      title: "The Scroll of the Golden Castle 金之堡的卷軸",
      level: 3,
      parent: "exp"
    },
    {
      id: "exp-e02",
      label: "Echoes of the Dragon’s Roar",
      title: "Echoes of the Dragon’s Roar 龍鳴的回音",
      level: 3,
      parent: "exp"
    }
  ];

  // Level 4 chapter placeholders for each story arc (level 3). Add entries like:
  // arcChapters["rugatha-c01"] = [{ id: "rugatha-c01-ch1", title: "Chapter Title (中文)", url: "https://..." }];
  const arcChapters = {
    "rugatha-c01": [
      {
        id: "rugatha-c01-chpt01",
        title: "Chapter 1: The Curse of Vowalon",
        url: "https://rugatha.wordpress.com/2021/05/20/chapter-1-the-curse-of-vowalon/"
      },
      {
        id: "rugatha-c01-chpt02",
        title: "Chapter 2: Before Sunset",
        url: "https://rugatha.wordpress.com/2021/05/23/chapter-2-before-sunset/"
      },
      {
        id: "rugatha-c01-chpt03",
        title: "Chapter 3: Into the Woods",
        url: "https://rugatha.wordpress.com/2021/05/30/chapter-3-into-the-woods/"
      },
      {
        id: "rugatha-c01-chpt04",
        title: "Chapter 4: Wescoe Tour",
        url: "https://rugatha.wordpress.com/2021/06/13/chapter-4-wescoe-tour/"
      },
      {
        id: "rugatha-c01-chpt05",
        title: "Chapter 5: Back in the Woods",
        url: "https://rugatha.wordpress.com/2021/06/27/chapter-5-back-in-the-woods/"
      },
      {
        id: "rugatha-c01-chpt06",
        title: "Chapter 6: Heroes of Vowalon",
        url: "https://rugatha.wordpress.com/2021/07/11/chapter-6-before-the-ritual/"
      },
      {
        id: "rugatha-c01-chpt07",
        title: "Chapter 7: Demons of Vowalon",
        url: "https://rugatha.wordpress.com/2021/07/18/chapter-7-demons-of-vowalon/"
      }
    ],
    "rugatha-c02": [
      {
        id: "rugatha-c02-chpt01",
        title: "Chapter 1: Altered Mindsets",
        url: "https://rugatha.wordpress.com/2021/08/01/chapter-1-altered-mindsets/"
      },
      {
        id: "rugatha-c02-chpt02",
        title: "Chapter 2: Venture into Darkness",
        url: "https://rugatha.wordpress.com/2021/08/08/chapter-2-venture-into-darkness/"
      },
      {
        id: "rugatha-c02-chpt03",
        title: "Chapter 3: The Spirit of Lorin",
        url: "https://rugatha.wordpress.com/2021/08/22/chapter-3-venture-into-darkness/"
      }
    ],
    "rugatha-c03": [
      {
        id: "rugatha-c03-chpt01",
        title: "Chapter 1: Bitter Reunion",
        url: "https://rugatha.wordpress.com/2021/09/20/chapter-1-bitter-reunion/"
      },
      {
        id: "rugatha-c03-chpt02",
        title: "Chapter 2: Streets of Korringfield",
        url: "https://rugatha.wordpress.com/2021/09/20/chapter-2-streets-of-korringfield/"
      },
      {
        id: "rugatha-c03-chpt03",
        title: "Chapter 3: A Good Place",
        url: "https://rugatha.wordpress.com/2021/10/03/chapter-3-a-good-place/"
      },
      {
        id: "rugatha-c03-chpt03-2",
        title: "Chapter 4: Bwtween Life and Death",
        url: "https://rugatha.wordpress.com/2021/11/01/chapter-4-between-life-and-death/"
      }
    ],
    "rugatha-c04": [
      {
        id: "rugatha-c04-chpt01",
        title: "Chapter 1: Welcome to Macksohn",
        url: "https://rugatha.wordpress.com/2021/12/27/chapter-1-welcome-to-macksohn/"
      },
      {
        id: "rugatha-c04-chpt02",
        title: "Chapter 2: Sun and Moon",
        url: "https://rugatha.wordpress.com/2022/01/19/chapter-2-sun-and-moon/"
      },
      {
        id: "rugatha-c04-chpt03",
        title: "Chapter 3: Upper Class Life",
        url: "https://rugatha.wordpress.com/2022/03/20/chapter-3-upper-class-life/"
      },
      {
        id: "rugatha-c04-chpt04",
        title: "Chapter 4: The Father of Shadows",
        url: "https://rugatha.wordpress.com/2022/05/02/chapter-4-the-father-of-shadows/"
      },
      {
        id: "rugatha-c04-chpt05",
        title: "Chapter 5: Gladiators",
        url: "https://rugatha.wordpress.com/2022/06/13/chapter-5-gladiators/"
      }
    ],
    "rugatha-c05": [
      {
        id: "rugatha-c05-chpt01",
        title: "Chapter 1: The Aftermath",
        url: "https://rugatha.wordpress.com/2022/07/11/chapter-1-the-aftermath/"
      }
    ],

    "plus-c05": [
      {
        id: "rugatha-c05-chpt01",
        title: "Chapter 1: The Aftermath",
        url: "https://rugatha.wordpress.com/2022/07/11/chapter-1-the-aftermath/"
      },
      {
        id: "plus-c05-chpt02",
        title: "Chapter 2: Regroup and Reanalysis",
        url: "https://rugatha.wordpress.com/2022/07/24/chapter-2-regroup-and-reanalysis/"
      },
      {
        id: "plus-c05-chpt03",
        title: "Chapter 3: Fey Senses",
        url: "https://rugatha.wordpress.com/2022/09/25/chapter-3-fey-senses/"
      },
      {
        id: "plus-c05-chpt04",
        title: "Chapter 4: Trial of the Chosen One",
        url: "https://rugatha.wordpress.com/2022/11/06/chapter-5-trial-of-the-chosen-one/"
      },
      {
        id: "plus-c05-chpt05",
        title: "Chapter 5: Feywild Lost",
        url: "https://rugatha.wordpress.com/2023/02/28/chapter-5-feywild-lost/"
      }
    ],
    "plus-c06": [
      {
        id: "plus-c06-chpt01",
        title: "Chapter 1: Stinky Stinky",
        url: "https://rugatha.wordpress.com/2023/03/13/chapter-1-stinky-stinky/"
      },
      {
        id: "plus-c06-chpt02",
        title: "Chapter 2: Detour to Macksohn",
        url: "https://rugatha.wordpress.com/2023/04/30/chapter-2-detour-to-macksohn/"
      },
      {
        id: "plus-c06-chpt03",
        title: "Chapter 3: Dangerous Roads",
        url: "https://rugatha.wordpress.com/2023/07/02/chapter-3-dangerous-roads/"
      },
      {
        id: "plus-c06-chpt04",
        title: "Chapter 4: Knowledge Unbound",
        url: "https://rugatha.wordpress.com/2023/07/31/chapter-4-knowledge-unbound/"
      }
    ],
    "plus-c07": [
      {
        id: "plus-c07-chpt01",
        title: "Chapter 1: The Ritual of Rage",
        url: "https://rugatha.com/2024/01/09/chapter-1-the-ritual-of-rage/"
      },
      {
        id: "plus-c07-chpt02",
        title: "Chapter 2: El Oro de los Ratones",
        url: "https://rugatha.com/2024/01/09/chapter-2-the-mine-on-the-island"
      },
      {
        id: "plus-c07-chpt03",
        title: "Chapter 3: Memory",
        url: "https://rugatha.com/2024/05/04/memory/"
      }
    ],

    "plus1-c01": [
      {
        id: "plus1-c01-chpt01",
        title: "Chapter 1: To the Deep and Back",
        url: "https://rugatha.com/2024/07/17/campaign-1-to-the-deep-and-back/"
      }
    ],

    "lite-c05": [
      {
        id: "rugatha-c05-chpt01",
        title: "Chapter 1: The Aftermath",
        url: "https://rugatha.wordpress.com/2022/07/11/chapter-1-the-aftermath/"
      },
      {
        id: "lite-c05-chpt02",
        title: "Chapter 2: Town of Villains",
        url: "https://rugatha.wordpress.com/2022/08/07/chapter-2-town-of-villains/"
      },
      {
        id: "lite-c05-chpt03",
        title: "Chapter 3: Deal?",
        url: "https://rugatha.wordpress.com/2022/08/22/chapter-3-deal/"
      },
      {
        id: "lite-c05-chpt04",
        title: "Chapter 4: True Form",
        url: "https://rugatha.wordpress.com/2022/10/02/chapter-4-true-form/"
      }
    ],
    "lite-c06": [
      {
        id: "lite-c06-chpt01",
        title: "Chapter 1: Mysterious Bites",
        url: "https://rugatha.wordpress.com/2022/10/23/chapter-1-mysterious-bites/"
      },
      {
        id: "lite-c06-chpt02",
        title: "Chapter 2: Mother of Ruins",
        url: "https://rugatha.wordpress.com/2023/01/15/chapter-2-mother-of-ruins/"
      },
      {
        id: "lite-c06-chpt03",
        title: "Chapter 3: Count M",
        url: "https://rugatha.wordpress.com/2023/03/20/chapter-3-count-m/"
      },
      {
        id: "lite-c06-chpt04",
        title: "Chapter 4: We Need a Plan",
        url: "https://rugatha.wordpress.com/2023/04/16/chapter-4-we-need-a-plan/"
      },
      {
        id: "lite-c06-chpt04-2",
        title: "Chapter 5: The Rescue",
        url: "https://rugatha.wordpress.com/2023/07/16/chapter-5-the-rescue/"
      }
    ],
    "lite-c07": [
      {
        id: "lite-c07-chpt01",
        title: "Chapter 1: Underneath the Theatre",
        url: "https://rugatha.wordpress.com/2023/08/14/chapter-1-underneath-the-theatre/"
      },
      {
        id: "lite-c07-chpt02",
        title: "Chapter 2: Mother Reborn",
        url: "https://rugatha.wordpress.com/2023/09/18/chapter-2-mother-reborn/"
      },
      {
        id: "lite-c07-chpt03",
        title: "Chapter 3: Clone of...... Us?",
        url: "https://rugatha.com/2023/10/22/chapter-3-clones-of-us/"
      }
    ],
    "lite-c08": [
      {
        id: "lite-c08-chpt01",
        title: "Chapter 1: Moonlight Predators",
        url: "https://rugatha.com/2024/03/04/chapter-1-moonlight-predators/"
      },
      {
        id: "lite-c08-chpt02",
        title: "Chapter 2: Hatched Companion",
        url: "https://rugatha.com/2024/05/05/chapter-2-hatched-companion/"
      },
      {
        id: "lite-c08-chpt03",
        title: "Chapter 3: I'm Sorry for Your Loss",
        url: "https://rugatha.com/2024/07/07/chapter-3-im-sorry-for-your-loss/"
      }
    ],
    "lite-c09": [
      {
        id: "lite-c09-chpt01",
        title: "Chapter 1: Aberration 101",
        url: "https://rugatha.com/2024/09/08/chapter-1-aberration-101/"
      },
      {
        id: "lite-c09-chpt02",
        title: "Chapter 2: Evangelist of Phynoir",
        url: "https://rugatha.com/2024/10/12/chapter-2-evangelist-of-phynoir/"
      },
      {
        id: "lite-c09-chpt03",
        title: "Chapter 3: Lord of the Feathers",
        url: "https://rugatha.com/2024/12/08/chapter-3-lord-of-the-feathers/"
      }
    ],
    "lite-c10": [
      {
        id: "lite-c10-chpt01",
        title: "Chapter 1: Last Moment of Sanity",
        url: "https://rugatha.com/2025/02/25/chapter-1-last-moment-of-sanity/"
      },
      {
        id: "lite-c10-chpt02",
        title: "Chapter 2: Fate of the Destined Past",
        url: "https://rugatha.com/2025/03/30/chapter-2-fate-of-the-destined-past/"
      },
      {
        id: "lite-c10-chpt03",
        title: "Chapter 3: Broken Angels",
        url: "https://rugatha.com/2025/04/20/chapter-3-broken-angels/"
      },
      {
        id: "lite-c10-chpt04",
        title: "Chapter The Divine Dominion of Everlasting and Love",
        url: "https://rugatha.com/2025/05/25/chapter-4-the-divine-dominion-of-everlasting-and-love/"
      }
    ],
    "lite-c11": [
      {
        id: "lite-c11-chpt01",
        title: "Chapter 1: Call of Fenadra",
        url: "https://rugatha.com/2025/07/13/chapter-1-call-of-fenadra/"
      },
      {
        id: "lite-c11-chpt02",
        title: "Chapter 2: The Council of Spirit",
        url: "https://rugatha.com/2025/08/18/chapter-2-the-council-of-spirit/"
      },
      {
        id: "lite-c11-chpt03",
        title: "Chapter 3: The Heartless Trial",
        url: "https://rugatha.com/2025/09/21/chapter-3-the-heartless-trial/"
      },
      {
        id: "lite-c11-chpt04",
        title: "Chapter 4: The Heartbroken Endgame",
        url: "https://rugatha.com/2025/10/12/chapter-4-the-heartbroken-endgame/"
      }
    ],

    "wilds-c01": [
      {
        id: "wilds-c01-chpt01",
        title: "Chapter 1: The Town of Trades and Goods",
        url: "https://rugatha.com/2024/03/17/chapter-1-the-town-of-trades-and-goods/"
      },
      {
        id: "wilds-c01-chpt02",
        title: "Chapter 2: The Siren's Cemetery",
        url: "https://rugatha.com/2024/04/21/chapter-2-the-sirens-cemetery/"
      },
      {
        id: "wilds-c01-chpt03",
        title: "Chapter 3: Invitation to T.I.D.E.S.",
        url: "https://rugatha.com/2024/06/16/chapter-3-invitation-to-t-i-d-e-s/"
      }
    ],
    "wilds-c02": [
      {
        id: "wilds-c02-chpt01",
        title: "Chapter 1: A Feast of the Exquisite",
        url: "https://rugatha.com/2024/07/28/chapter-1-a-feast-of-the-exquisite/"
      },
      {
        id: "wilds-c02-chpt02",
        title: "Chapter 2: Banquet Night, Holy Night",
        url: "https://rugatha.com/2024/08/12/chapter-2-banquet-night-holy-night/"
      },
      {
        id: "wilds-c02-chpt03",
        title: "Chapter 3: The Gathering",
        url: "https://rugatha.com/2024/12/08/chapter-3-the-gathering/"
      }
    ],
    "wilds-c03": [
      {
        id: "wilds-c03-chpt01",
        title: "Chapter 1: The Spirit of Spring",
        url: "https://rugatha.com/2025/01/06/chapter-1-the-spirit-of-spring/"
      },
      {
        id: "wilds-c03-chpt02",
        title: "Chapter 2: Banditry is a State of Mind",
        url: "https://rugatha.com/2025/02/19/chapter-2-banditry-is-a-state-of-mind/"
      },
      {
        id: "wilds-c03-chpt03",
        title: "Chapter 3: Dusk of the Applewoods",
        url: "https://rugatha.com/2025/04/27/chapter-3-dusk-of-the-applewoods/"
      }
    ],
    "wilds-c04": [
      {
        id: "wilds-c04-chpt01",
        title: "Chapter 1: Lunch with the Aryliths",
        url: "https://rugatha.com/2025/06/29/chapter-1-lunch-with-the-arylith/"
      },
      {
        id: "wilds-c04-chpt02",
        title: "Chapter 2: The Silver Dragon's Treat",
        url: "https://rugatha.com/2025/08/10/chapter-2-the-silver-dragons-treat/"
      },
      {
        id: "wilds-c04-chpt03",
        title: "Chapter 3: whodunit",
        url: "https://rugatha.com/2025/10/26/chapter-3-whodunit/"
      },
      {
        id: "wilds-c04-chpt04",
        title: "Chapter 4: Eternal Lost of the Dragonborn Vein",
        url: "https://rugatha.com/2025/11/17/chapter-4-eternal-lost-of-the-dragonborn-vein/"
      }
    ],

    "brown-c01": [
      {
        id: "brown-c01-chpt01",
        title: "Chapter 1: Offer from the Wind Family",
        url: "https://rugatha.wordpress.com/2022/11/07/chapter-1-offer-from-the-wind-family/"
      },
      {
        id: "brown-c01-chpt02",
        title: "Chapter 2: The Basement of the Shrine",
        url: "https://rugatha.wordpress.com/2022/11/07/chapter-2-drugged/"
      },
      {
        id: "brown-c01-chpt03",
        title: "Chapter 3: Lotus Petals",
        url: "https://rugatha.wordpress.com/2022/12/05/chapter-3-lotus-petals/"
      },
      {
        id: "brown-c01-chpt04",
        title: "Chapter 4: Baptized",
        url: "https://rugatha.wordpress.com/2023/01/08/chapter-4-baptized/"
      },
      {
        id: "brown-c01-chpt05",
        title: "Chapter 5: Farewell, Wescoe",
        url: "https://rugatha.wordpress.com/2023/02/28/chapter-5-farewell-wescoe/"
      }
    ],
    "brown-c02": [
      {
        id: "brown-c02-chpt01",
        title: "Chapter 1: Mesmerized",
        url: "https://rugatha.wordpress.com/2023/03/14/chapter-1-mesmerized/"
      }
    ],

    "legends-os05": [
      {
        id: "legends-os05-chpt01",
        title: "Chapter 1: The Mine",
        url: "https://rugatha.wordpress.com/2023/01/29/chapter-1-the-mine/"
      },
      {
        id: "legends-os05-chpt02",
        title: "Chapter 2: The Trade",
        url: "https://rugatha.wordpress.com/2023/01/30/chapter-2-the-trade/"
      }
    ]
  };
  const chapterImages = {
    "rugatha-c01-chpt01": "../chapter-banners/rugatha-c01-chpt01.png",
    "rugatha-c01-chpt02": "../chapter-banners/rugatha-c01-chpt02.png",
    "rugatha-c01-chpt03": "../chapter-banners/rugatha-c01-chpt03.png",
    "rugatha-c01-chpt04": "../chapter-banners/rugatha-c01-chpt04.png",
    "rugatha-c01-chpt05": "../chapter-banners/rugatha-c01-chpt05.png",
    "rugatha-c01-chpt06": "../chapter-banners/rugatha-c01-chpt06.png",
    "rugatha-c01-chpt07": "../chapter-banners/rugatha-c01-chpt07.png",
    "rugatha-c02-chpt01": "../chapter-banners/rugatha-c02-chpt01.png",
    "rugatha-c02-chpt02": "../chapter-banners/rugatha-c02-chpt02.png",
    "rugatha-c02-chpt03": "../chapter-banners/rugatha-c02-chpt03.png",
    "rugatha-c03-chpt01": "../chapter-banners/rugatha-c03-chpt01.png",
    "rugatha-c03-chpt02": "../chapter-banners/rugatha-c03-chpt02.png",
    "rugatha-c03-chpt03": "../chapter-banners/rugatha-c03-chpt03.png",
    "rugatha-c03-chpt04": "../chapter-banners/rugatha-c03-chpt04.png",
    "rugatha-c04-chpt01": "../chapter-banners/rugatha-c04-chpt01.png",
    "rugatha-c04-chpt02": "../chapter-banners/rugatha-c04-chpt02.png",
    "rugatha-c04-chpt03": "../chapter-banners/rugatha-c04-chpt03.png",
    "rugatha-c04-chpt04": "../chapter-banners/rugatha-c04-chpt04.png",
    "rugatha-c04-chpt05": "../chapter-banners/rugatha-c04-chpt05.jpeg",
    "rugatha-c05-chpt01": "../chapter-banners/rugatha-c05-chpt01.png",
    "plus-c05-chpt02": "../chapter-banners/plus-c05-chpt02.png",
    "plus-c05-chpt03": "../chapter-banners/plus-c05-chpt03.png",
    "plus-c05-chpt04": "../chapter-banners/plus-c05-chpt04.png",
    "plus-c05-chpt05": "../chapter-banners/plus-c05-chpt05.png",
    "plus-c06-chpt01": "../chapter-banners/plus-c06-chpt01.png",
    "plus-c06-chpt02": "../chapter-banners/plus-c06-chpt02.png",
    "plus-c06-chpt03": "../chapter-banners/plus-c06-chpt03.png",
    "plus-c06-chpt04": "../chapter-banners/plus-c06-chpt04.png",
    "plus-c07-chpt01": "../chapter-banners/plus-c07-chpt01.jpeg",
    "plus-c07-chpt02": "../chapter-banners/plus-c07-chpt02.jpeg",
    "plus-c07-chpt03": "../chapter-banners/plus-c07-chpt03.png",
    "lite-c05-chpt02": "../chapter-banners/lite-c05-chpt02.png",
    "lite-c05-chpt03": "../chapter-banners/lite-c05-chpt03.png",
    "lite-c05-chpt04": "../chapter-banners/lite-c05-chpt04.png",
    "lite-c06-chpt01": "../chapter-banners/lite-c06-chpt01.png",
    "lite-c06-chpt02": "../chapter-banners/lite-c06-chpt02.png",
    "lite-c06-chpt03": "../chapter-banners/lite-c06-chpt03.png",
    "lite-c06-chpt04": "../chapter-banners/lite-c06-chpt04.png",
    "lite-c07-chpt01": "../chapter-banners/lite-c07-chpt01.png",
    "lite-c07-chpt02": "../chapter-banners/lite-c07-chpt02.png",
    "lite-c07-chpt03": "../chapter-banners/lite-c07-chpt03.png",
    "lite-c08-chpt01": "../chapter-banners/lite-c08-chpt01.jpg",
    "lite-c08-chpt02": "../chapter-banners/lite-c08-chpt02.png",
    "lite-c08-chpt03": "../chapter-banners/lite-c08-chpt03.png",
    "lite-c09-chpt01": "../chapter-banners/lite-c09-chpt01.png",
    "lite-c09-chpt02": "../chapter-banners/lite-c09-chpt02.png",
    "lite-c09-chpt03": "../chapter-banners/lite-c09-chpt03.png",
    "lite-c10-chpt01": "../chapter-banners/lite-c10-chpt01.png",
    "lite-c10-chpt02": "../chapter-banners/lite-c10-chpt02.jpeg",
    "lite-c10-chpt03": "../chapter-banners/lite-c10-chpt03.jpeg",
    "lite-c10-chpt04": "../chapter-banners/lite-c10-chpt04.jpeg",
    "lite-c11-chpt01": "../chapter-banners/lite-c11-chpt01.jpeg",
    "lite-c11-chpt02": "../chapter-banners/lite-c11-chpt02.jpeg",
    "lite-c11-chpt03": "../chapter-banners/lite-c11-chpt03.jpeg",
    "lite-c11-chpt04": "../chapter-banners/lite-c11-chpt04.JPG",
    "wilds-c01-chpt01": "../chapter-banners/wilds-c01-chpt01.png",
    "wilds-c01-chpt02": "../chapter-banners/wilds-c01-chpt02.png",
    "wilds-c01-chpt03": "../chapter-banners/wilds-c01-chpt03.png",
    "wilds-c02-chpt01": "../chapter-banners/wilds-c02-chpt01.png",
    "wilds-c02-chpt02": "../chapter-banners/wilds-c02-chpt02.png",
    "wilds-c02-chpt03": "../chapter-banners/wilds-c02-chpt03.png",
    "wilds-c03-chpt01": "../chapter-banners/wilds-c03-chpt01.png",
    "wilds-c03-chpt02": "../chapter-banners/wilds-c03-chpt02.jpeg",
    "wilds-c03-chpt03": "../chapter-banners/wilds-c03-chpt03.JPG",
    "wilds-c04-chpt01": "../chapter-banners/wilds-c04-chpt01.jpeg",
    "wilds-c04-chpt02": "../chapter-banners/wilds-c04-chpt02.jpeg",
    "wilds-c04-chpt03": "../chapter-banners/wilds-c04-chpt03.jpeg",
    "wilds-c04-chpt04": "../chapter-banners/wilds-c04-chpt04.jpeg",
    "brown-c01-chpt01": "../chapter-banners/brown-c01-chpt01.png",
    "brown-c01-chpt02": "../chapter-banners/brown-c01-chpt02.png",
    "brown-c01-chpt03": "../chapter-banners/brown-c01-chpt03.png",
    "brown-c01-chpt04": "../chapter-banners/brown-c01-chpt04.png",
    "brown-c01-chpt05": "../chapter-banners/brown-c01-chpt05.png",
    "brown-c02-chpt01": "../chapter-banners/brown-c02-chpt01.png",
    "legends-os05-chpt01": "../chapter-banners/legends-os05-chpt01.png",
    "legends-os05-chpt02": "../chapter-banners/legends-os05-chpt02.png"
  };

  Object.keys(chapterImages).forEach((key) => {
    chapterImages[key] = resolveInternalPath(chapterImages[key]);
  });

  // Attach chapter image URLs directly to each level-4 node definition
  Object.entries(arcChapters).forEach(([arcId, chapters]) => {
    if (!Array.isArray(chapters)) return;
    chapters.forEach((chapter) => {
      if (!chapter.image && chapterImages[chapter.id]) {
        chapter.image = chapterImages[chapter.id];
      }
    });
  });

  graphNodes.forEach((node) => {
    if (node.level === 3) {
      arcChapters[node.id] = arcChapters[node.id] || [];
      if (!arcChapters[node.id].length) {
        arcChapters[node.id].push({
          id: `${node.id}-ch1`,
          title: "",
          url: null
        });
      }
    }
  });

  const chapterNodes = Object.entries(arcChapters).flatMap(([arcId, chapters]) =>
    (Array.isArray(chapters) ? chapters : []).map((chapter, index) => ({
      id: chapter.id || `${arcId}-ch${index + 1}`,
      label: chapter.label || chapter.title || `Chapter ${index + 1}`,
      title: chapter.title,
      image: chapter.image,
      level: 4,
      parent: arcId,
      url: chapter.url
    }))
  );

  graphNodes = graphNodes.concat(chapterNodes);

  const graphUrlOverrides = {
    // Level 1
    rugatha: "https://rugatha.com/rugatha-home/",

    // Level 2
    "rugatha-main": "https://rugatha.com/campaigns/",
    plus: "https://rugatha.com/rugatha-plus/",
    plus1: "https://rugatha.com/rugatha-plus-1/",
    lite: "https://rugatha.com/rugatha-lite/",
    wilds: "https://rugatha.com/rugatha-wilds/",
    brown: "https://rugatha.com/rugatha-brown/",
    legends: "https://rugatha.com/rugatha-legends/",
    exp: null,

    // Level 3
    "rugatha-c01": "../rugatha/rugatha-c01/",
    "rugatha-c02": "../rugatha/rugatha-c02/",
    "rugatha-c03": "../rugatha/rugatha-c03/",
    "rugatha-c04": "../rugatha/rugatha-c04/",
    "rugatha-c05": "../rugatha/rugatha-c05/",
    "plus-c05": "../rugatha-plus/plus-c05/",
    "lite-c05": "../rugatha-lite/lite-c05/",
    "plus-c06": "../rugatha-plus/plus-c06/",
    "plus-c07": "../rugatha-plus/plus-c07/",
    "plus1-c01": "../rugatha-plus-1/plus1-c01/",
    "lite-c06": "../rugatha-lite/lite-c06/",
    "lite-c07": "../rugatha-lite/lite-c07/",
    "lite-c08": "../rugatha-lite/lite-c08/",
    "lite-c09": "../rugatha-lite/lite-c09/",
    "lite-c10": "../rugatha-lite/lite-c10/",
    "lite-c11": "../rugatha-lite/lite-c11/",
    "wilds-c02": "../rugatha-wilds/wilds-c02/",
    "wilds-c03": "../rugatha-wilds/wilds-c03/",
    "wilds-c04": "../rugatha-wilds/wilds-c04/",
    "brown-c01": "../rugatha-brown/brown-c01/",
    "brown-c02": "../rugatha-brown/brown-c02/",
    "legends-os01": "https://rugatha.wordpress.com/2022/02/07/the-false-hydra-of-moorland-haunt/",
    "legends-os02": "https://rugatha.wordpress.com/2022/02/07/the-disappearance-of-gustavo-norman/",
    "legends-os03": "https://rugatha.wordpress.com/2022/08/05/the-lighthouse-on-the-deserted-island/",
    "legends-os04": "https://rugatha.wordpress.com/2022/08/28/the-deadly-prison-break/",
    "legends-os05": "../rugatha-legends/legends-os05/",
    "legends-os06": "https://rugatha.wordpress.com/2023/04/06/the-malicious-rise-of-alfenor/",
    "legends-os07": "https://rugatha.wordpress.com/2023/08/29/mylstan-colossus/",
    "legends-os08": "https://rugatha.com/2024/05/27/lord-octavian-von-odericks-dungeon-of-randomness/",
    "exp-e01": null,
    "exp-e02": null
  };

  Object.keys(graphUrlOverrides).forEach((key) => {
    if (!graphUrlOverrides[key]) return;
    graphUrlOverrides[key] = resolveInternalPath(graphUrlOverrides[key]);
  });

  const config = {
    brand: {
      name: "Rugatha",
      home: "https://rugatha.com/rugatha-home/"
    },
    campaigns,
    graph: {
      defaultNodeUrl: "https://rugatha.com",
      nodes: graphNodes,
      urlOverrides: graphUrlOverrides
    },
    dataFiles: {
      npcCharacters: "npc/data/characters.json"
    }
  };

  const graphData = graphNodes.map((node) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(graphUrlOverrides, node.id);
    const overrideUrl = hasOverride ? graphUrlOverrides[node.id] : undefined;
    return Object.assign({}, node, {
      url: overrideUrl === undefined ? node.url || config.graph.defaultNodeUrl : overrideUrl
    });
  });

  config.graph.data = graphData;

  global.RUGATHA_CONFIG = config;
  global.CAMPAIGN_GRAPH_DATA = graphData;
})(typeof window !== "undefined" ? window : globalThis);
