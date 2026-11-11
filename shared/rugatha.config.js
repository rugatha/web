// Shared Rugatha configuration used by the campaigns, graph, and NPC tools.
(function (global) {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "http:" &&
    /(^|\.)rugatha\.com$/i.test(window.location.hostname || "")
  ) {
    const secureUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.replace(secureUrl);
    return;
  }

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

  const campaignPng = (fileName) => new URL(`../assets/campaign_logo/${fileName}`, campaignsBase).href;
  const rugathaIcon = new URL("../assets/logo/rugatha-icon.png", campaignsBase).href;

  const campaigns = [
    {
      name: "Rugatha",
      tagline_en: "When Heroes and Villains Wake, Gods Tremble",
      tagline_zh: "當英雄與反派甦醒，眾神震顫",
      dates: "2021/5/22 ~ 2022/7/16",
      page: "./pages/rugatha/index.html",
      image: rugathaIcon,
      accent: "#E3D0AB",
      nextSession_zh: "團務完結",
      nextSession_en: "Campaign Ended"
    },
    {
      name: "Rugatha Plus",
      tagline_en: "Through Lost Roads, Truth Hunts Back",
      tagline_zh: "穿越迷失之路，真相反獵而來",
      dates: "2022/7/23 ~ 2026/6/27",
      page: "./pages/rugatha-plus/index.html",
      image: campaignPng("logo_RPlus.png"),
      accent: "	#E3D8D3",
      nextSession_zh: "團務完結",
      nextSession_en: "Campaign Ended"
    },
    {
      name: "Rugatha Lite",
      tagline_en: "Small Lights Against an Endless Night",
      tagline_zh: "小小光芒，對抗無盡長夜",
      dates: "2022/8/6 ~",
      page: "./pages/rugatha-lite/index.html",
      image: campaignPng("logo_RLite.png"),
      accent: "#DDDDD3",
      nextSession_zh: "2026/10/24",
      nextSession_en: "2026/10/24"
    },
    {
      name: "Rugatha Wilds",
      tagline_en: "Blood, Legacy, and the Call Beyond the Walls",
      tagline_zh: "鮮血、傳承，與牆外的呼喚",
      dates: "2024/3/16 ~",
      page: "./pages/rugatha-wilds/index.html",
      image: campaignPng("logo_RWilds.png"),
      accent: "#DCE3E7",
      nextSession_zh: "2026/11/21",
      nextSession_en: "2026/11/21"
    },
    {
      name: "Rugatha Veil",
      tagline_en: "Beyond the Veil, Nothing Is What It Seems",
      tagline_zh: "揭開帷幕之後，一切皆非所見",
      dates: "2027/1/1 ~",
      page: "./pages/rugatha-veil/index.html",
      image: campaignPng("logo_RVeil.png"),
      accent: "#E3D0AB",
      nextSession_zh: "2026/10/3",
      nextSession_en: "2026/10/3"
    },
    {
      name: "Rugatha Prosper",
      tagline_en: "Gold, Choice, and the Roar of Dragons",
      tagline_zh: "黃金、抉擇，與巨龍的咆哮",
      dates: "2027/1/1 ~",
      page: "./pages/rugatha-prosper/index.html",
      image: campaignPng("logo_RProsper.png"),
      accent: "#E5BC48",
      nextSession_zh: "2026/11/22",
      nextSession_en: "2026/11/22"
    },
    {
      name: "Rugatha Brown",
      tagline_en: "In Every Bloom, Obedience Rots",
      tagline_zh: "每朵綻放之中，服從悄然腐朽",
      dates: "2022/11/7 ~ 2023/3/14",
      page: "./pages/rugatha-brown/index.html",
      image: campaignPng("logo_RBrown.png"),
      accent: "#C69C6D",
      nextSession_zh: "團務完結",
      nextSession_en: "Campaign Ended"
    },
    {
      name: "Rugatha Legends",
      tagline_en: "One Night, One Tale, One Legend",
      tagline_zh: "一夜，一則故事，一段傳奇",
      dates: "2022/2/7 ~",
      page: "./pages/rugatha-legends/index.html",
      image: campaignPng("logo_RLegends.png"),
      accent: "#F6E891",
      nextSession_zh: "未訂",
      nextSession_en: "TBD"
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
    {
      id: "plus-c08",
      label: "A Place Called Home",
      title: "A Place Called Home 名為家的地方",
      level: 3,
      parent: "plus"
    },

    // ===== Rugatha Lite =====
    {
      id: "lite",
      label: "Rugatha Lite",
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
      label: "Requiem of the Feathered Estate",
      title: "Requiem of the Feathered Estate 覆羽莊園的輓歌",
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
    {
      id: "lite-c12",
      title: "Py'Par's Vision 派琶的預示",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c13",
      label: "Before Stonefield",
      title: "Before Stonefield 石原鎮之前",
      level: 3,
      parent: "lite"
    },

    // ===== Rugatha Wilds =====
    { id: "wilds", label: "Rugatha Wilds", level: 2, parent: "rugatha" },
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
    {
      id: "wilds-c05",
      label: "The Unacknowledged Child",
      title: "The Unacknowledged Child 不被承認的孩子",
      level: 3,
      parent: "wilds"
    },
    {
      id: "wilds-c06",
      label: "Where the Willow Drifts",
      title: "Where the Willow Drifts 柳絮因風起",
      level: 3,
      parent: "wilds",
      noLink: true
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
    {
      id: "legends-os09",
      label: "To the Deep and Back 往返深淵",
      title: "To the Deep and Back 往返深淵",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os10",
      label: "The Invisible Spell",
      title: "The Invisible Spell 隱形咒語",
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
        url: "../rugatha-c01/chpt01.html"
      },
      {
        id: "rugatha-c01-chpt02",
        title: "Chapter 2: Before Sunset",
        url: "../rugatha-c01/chpt02.html"
      },
      {
        id: "rugatha-c01-chpt03",
        title: "Chapter 3: Into the Woods",
        url: "../rugatha-c01/chpt03.html"
      },
      {
        id: "rugatha-c01-chpt04",
        title: "Chapter 4: Wescoe Tour",
        url: "../rugatha-c01/chpt04.html"
      },
      {
        id: "rugatha-c01-chpt05",
        title: "Chapter 5: Back in the Woods",
        url: "../rugatha-c01/chpt05.html"
      },
      {
        id: "rugatha-c01-chpt06",
        title: "Chapter 6: Heroes of Vowalon",
        url: "../rugatha-c01/chpt06.html"
      },
      {
        id: "rugatha-c01-chpt07",
        title: "Chapter 7: Demons of Vowalon",
        url: "../rugatha-c01/chpt07.html"
      }
    ],
    "rugatha-c02": [
      {
        id: "rugatha-c02-chpt01",
        title: "Chapter 1: Altered Mindsets",
        url: "../rugatha-c02/chpt01.html"
      },
      {
        id: "rugatha-c02-chpt02",
        title: "Chapter 2: Venture into Darkness",
        url: "../rugatha-c02/chpt02.html"
      },
      {
        id: "rugatha-c02-chpt03",
        title: "Chapter 3: The Spirit of Lorin",
        url: "../rugatha-c02/chpt03.html"
      }
    ],
    "rugatha-c03": [
      {
        id: "rugatha-c03-chpt01",
        title: "Chapter 1: Bitter Reunion",
        url: "../rugatha-c03/chpt01.html"
      },
      {
        id: "rugatha-c03-chpt02",
        title: "Chapter 2: Streets of Korringfield",
        url: "../rugatha-c03/chpt02.html"
      },
      {
        id: "rugatha-c03-chpt03",
        title: "Chapter 3: A Good Place",
        url: "../rugatha-c03/chpt03.html"
      },
      {
        id: "rugatha-c03-chpt04",
        title: "Chapter 4: Between Life and Death",
        url: "../rugatha-c03/chpt04.html"
      }
    ],
    "rugatha-c04": [
      {
        id: "rugatha-c04-chpt01",
        title: "Chapter 1: Welcome to Macksohn",
        url: "../rugatha-c04/chpt01.html"
      },
      {
        id: "rugatha-c04-chpt02",
        title: "Chapter 2: Sun and Moon",
        url: "../rugatha-c04/chpt02.html"
      },
      {
        id: "rugatha-c04-chpt03",
        title: "Chapter 3: Upper Class Life",
        url: "../rugatha-c04/chpt03.html"
      },
      {
        id: "rugatha-c04-chpt04",
        title: "Chapter 4: The Father of Shadows",
        url: "../rugatha-c04/chpt04.html"
      },
      {
        id: "rugatha-c04-chpt05",
        title: "Chapter 5: Gladiators",
        url: "../rugatha-c04/chpt05.html"
      }
    ],
    "rugatha-c05": [
      {
        id: "rugatha-c05-chpt01",
        title: "Chapter 1: The Aftermath",
        url: "../rugatha-c05/chpt01.html"
      }
    ],

    "plus-c05": [
      {
        id: "plus-c05-chpt01",
        canonicalId: "rugatha-c05-chpt01",
        title: "Chapter 1: The Aftermath",
        url: "../../rugatha/rugatha-c05/chpt01.html"
      },
      {
        id: "plus-c05-chpt02",
        title: "Chapter 2: Regroup and Reanalysis",
        url: "../../rugatha-plus/plus-c05/chpt02.html"
      },
      {
        id: "plus-c05-chpt03",
        title: "Chapter 3: Fey Senses",
        url: "../plus-c05/chpt03.html"
      },
      {
        id: "plus-c05-chpt04",
        title: "Chapter 4: Trial of the Chosen One",
        url: "../plus-c05/chpt04.html"
      },
      {
        id: "plus-c05-chpt05",
        title: "Chapter 5: Feywild Lost",
        url: "../plus-c05/chpt05.html"
      }
    ],
    "plus-c06": [
      {
        id: "plus-c06-chpt01",
        title: "Chapter 1: Stinky Stinky",
        url: "../plus-c06/chpt01.html"
      },
      {
        id: "plus-c06-chpt02",
        title: "Chapter 2: Detour to Macksohn",
        url: "../plus-c06/chpt02.html"
      },
      {
        id: "plus-c06-chpt03",
        title: "Chapter 3: Dangerous Roads",
        url: "../plus-c06/chpt03.html"
      },
      {
        id: "plus-c06-chpt04",
        title: "Chapter 4: Knowledge Unbound",
        url: "../plus-c06/chpt04.html"
      }
    ],
    "plus-c07": [
      {
        id: "plus-c07-chpt01",
        title: "Chapter 1: The Ritual of Rage",
        url: "../plus-c07/chpt01.html"
      },
      {
        id: "plus-c07-chpt02",
        title: "Chapter 2: El Oro de los Ratones",
        url: "../plus-c07/chpt02.html"
      },
      {
        id: "plus-c07-chpt03",
        title: "Chapter 3: Memory",
        url: "../plus-c07/chpt03.html"
      },
      {
        id: "plus-c07-chpt04",
        title: "Chapter 4: Before the Next Full Moon",
        url: "../plus-c07/chpt04.html"
      }
    ],

    "plus-c08": [
      {
        id: "plus-c08-chpt01",
        title: "Chapter 1: Memories Overflowing",
        url: "../plus-c08/chpt01.html"
      },
      {
        id: "plus-c08-chpt02",
        title: "Chapter 2: Senior and Junior",
        url: "../plus-c08/chpt02.html"
      },
      {
        id: "plus-c08-chpt03",
        title: "Chapter 3: In and Out",
        url: "../plus-c08/chpt03.html"
      }
    ],
    "lite-c05": [
      {
        id: "lite-c05-chpt01",
        canonicalId: "rugatha-c05-chpt01",
        title: "Chapter 1: The Aftermath",
        url: "../../rugatha/rugatha-c05/chpt01.html"
      },
      {
        id: "lite-c05-chpt02",
        title: "Chapter 2: Town of Villains",
        url: "../lite-c05/chpt02.html"
      },
      {
        id: "lite-c05-chpt03",
        title: "Chapter 3: Deal?",
        url: "../lite-c05/chpt03.html"
      },
      {
        id: "lite-c05-chpt04",
        title: "Chapter 4: True Form",
        url: "../lite-c05/chpt04.html"
      }
    ],
    "lite-c06": [
      {
        id: "lite-c06-chpt01",
        title: "Chapter 1: Mysterious Bites",
        url: "../lite-c06/chpt01.html"
      },
      {
        id: "lite-c06-chpt02",
        title: "Chapter 2: Mother of Ruins",
        url: "../lite-c06/chpt02.html"
      },
      {
        id: "lite-c06-chpt03",
        title: "Chapter 3: Count M",
        url: "../lite-c06/chpt03.html"
      },
      {
        id: "lite-c06-chpt04",
        title: "Chapter 4: We Need a Plan",
        url: "../lite-c06/chpt04.html"
      },
      {
        id: "lite-c06-chpt05",
        title: "Chapter 5: The Rescue",
        url: "../lite-c06/chpt05.html"
      }
    ],
    "lite-c07": [
      {
        id: "lite-c07-chpt01",
        title: "Chapter 1: Underneath the Theatre",
        url: "../lite-c07/chpt01.html"
      },
      {
        id: "lite-c07-chpt02",
        title: "Chapter 2: Mother Reborn",
        url: "../lite-c07/chpt02.html"
      },
      {
        id: "lite-c07-chpt03",
        title: "Chapter 3: Clone of...... Us?",
        url: "../lite-c07/chpt03.html"
      }
    ],
    "lite-c08": [
      {
        id: "lite-c08-chpt01",
        title: "Chapter 1: Moonlight Predators",
        url: "../lite-c08/chpt01.html"
      },
      {
        id: "lite-c08-chpt02",
        title: "Chapter 2: Hatched Companion",
        url: "../lite-c08/chpt02.html"
      },
      {
        id: "lite-c08-chpt03",
        title: "Chapter 3: I'm Sorry for Your Loss",
        url: "../lite-c08/chpt03.html"
      }
    ],
    "lite-c09": [
      {
        id: "lite-c09-chpt01",
        title: "Chapter 1: Aberration 101",
        url: "../lite-c09/chpt01.html"
      },
      {
        id: "lite-c09-chpt02",
        title: "Chapter 2: Evangelist of Phynoir",
        url: "../lite-c09/chpt02.html"
      },
      {
        id: "lite-c09-chpt03",
        title: "Chapter 3: Lord of the Feathers",
        url: "../lite-c09/chpt03.html"
      }
    ],
    "lite-c10": [
      {
        id: "lite-c10-chpt01",
        title: "Chapter 1: Last Moment of Sanity",
        url: "../lite-c10/chpt01.html"
      },
      {
        id: "lite-c10-chpt02",
        title: "Chapter 2: Fate of the Destined Past",
        url: "../lite-c10/chpt02.html"
      },
      {
        id: "lite-c10-chpt03",
        title: "Chapter 3: Broken Angels",
        url: "../lite-c10/chpt03.html"
      },
      {
        id: "lite-c10-chpt04",
        title: "Chapter The Divine Dominion of Everlasting and Love",
        url: "../lite-c10/chpt04.html"
      }
    ],
    "lite-c11": [
      {
        id: "lite-c11-chpt01",
        title: "Chapter 1: Call of Fenadra",
        url: "../lite-c11/chpt01.html"
      },
      {
        id: "lite-c11-chpt02",
        title: "Chapter 2: The Council of Spirit",
        url: "../lite-c11/chpt02.html"
      },
      {
        id: "lite-c11-chpt03",
        title: "Chapter 3: The Heartless Trial",
        url: "../lite-c11/chpt03.html"
      },
      {
        id: "lite-c11-chpt04",
        title: "Chapter 4: The Heartbroken Endgame",
        url: "../lite-c11/chpt04.html"
      }
    ],
    "lite-c12": [
      {
        id: "lite-c12-chpt01",
        title: "Chapter 1: Do Not Leave Us in the Dark",
        url: "../lite-c12/chpt01.html"
      },
      {
        id: "lite-c12-chpt02",
        title: "Chapter 2: The Truth Beneath the Mask",
        url: "../lite-c12/chpt02.html"
      },
      {
        id: "lite-c12-chpt03",
        title: "Chapter 3: Forces of the Serpent",
        url: "../lite-c12/chpt03.html"
      },
      {
        id: "lite-c12-chpt04",
        title: "Chapter 4: The Evergreen Grove",
        url: "../lite-c12/chpt04.html"
      },
      {
        id: "lite-c12-chpt05",
        title: "Chapter 5: The Champion of Nessis",
        url: "../lite-c12/chpt05.html"
      }
    ],
    "lite-c13": [
      {
        id: "lite-c13-chpt01",
        title: "Chapter 1: Goodbye, Lott",
        url: "../lite-c13/chpt01.html"
      }
    ],

    "wilds-c01": [
      {
        id: "wilds-c01-chpt01",
        title: "Chapter 1: The Town of Trades and Goods",
        url: "../wilds-c01/chpt01.html"
      },
      {
        id: "wilds-c01-chpt02",
        title: "Chapter 2: The Siren's Cemetery",
        url: "../wilds-c01/chpt02.html"
      },
      {
        id: "wilds-c01-chpt03",
        title: "Chapter 3: Invitation to T.I.D.E.S.",
        url: "../wilds-c01/chpt03.html"
      }
    ],
    "wilds-c02": [
      {
        id: "wilds-c02-chpt01",
        title: "Chapter 1: A Feast of the Exquisite",
        url: "../wilds-c02/chpt01.html"
      },
      {
        id: "wilds-c02-chpt02",
        title: "Chapter 2: Banquet Night, Holy Night",
        url: "../wilds-c02/chpt02.html"
      },
      {
        id: "wilds-c02-chpt03",
        title: "Chapter 3: The Gathering",
        url: "../wilds-c02/chpt03.html"
      }
    ],
    "wilds-c03": [
      {
        id: "wilds-c03-chpt01",
        title: "Chapter 1: The Spirit of Spring",
        url: "../wilds-c03/chpt01.html"
      },
      {
        id: "wilds-c03-chpt02",
        title: "Chapter 2: Banditry is a State of Mind",
        url: "../wilds-c03/chpt02.html"
      },
      {
        id: "wilds-c03-chpt03",
        title: "Chapter 3: Dusk of the Applewoods",
        url: "../wilds-c03/chpt03.html"
      }
    ],
    "wilds-c04": [
      {
        id: "wilds-c04-chpt01",
        title: "Chapter 1: Lunch with the Aryliths",
        url: "../wilds-c04/chpt01.html"
      },
      {
        id: "wilds-c04-chpt02",
        title: "Chapter 2: The Silver Dragon's Treat",
        url: "../wilds-c04/chpt02.html"
      },
      {
        id: "wilds-c04-chpt03",
        title: "Chapter 3: whodunit",
        url: "../wilds-c04/chpt03.html"
      },
      {
        id: "wilds-c04-chpt04",
        title: "Chapter 4: Eternal Loss of the Dragonborn Vein",
        url: "../wilds-c04/chpt04.html"
      }
    ],
    "wilds-c05": [
      {
        id: "wilds-c05-chpt01",
        title: "Chapter 1: Unfamiliar Hometown",
        url: "../wilds-c05/chpt01.html"
      },
      {
        id: "wilds-c05-chpt02",
        title: "Chapter 2: Blue, Red and Brown",
        url: "../wilds-c05/chpt02.html"
      },
      {
        id: "wilds-c05-chpt03",
        title: "Chapter 3: New Dawn",
        url: "../wilds-c05/chpt03.html"
      },
      {
        id: "wilds-c05-chpt04",
        title: "Chapter 4: Leah's Dilemma",
        url: "../wilds-c05/chpt04.html"
      },
      {
        id: "wilds-c05-chpt05",
        title: "Chapter 5: La Vie de Leah",
        url: "../wilds-c05/chpt05.html"
      },
      {
        id: "wilds-c05-chpt06",
        title: "Chapter 6: Dear Leah",
        url: "../wilds-c05/chpt06.html"
      }
    ],

    "brown-c01": [
      {
        id: "brown-c01-chpt01",
        title: "Chapter 1: Offer from the Wind Family",
        url: "../brown-c01/chpt01.html"
      },
      {
        id: "brown-c01-chpt02",
        title: "Chapter 2: The Basement of the Shrine",
        url: "../brown-c01/chpt02.html"
      },
      {
        id: "brown-c01-chpt03",
        title: "Chapter 3: Lotus Petals",
        url: "../brown-c01/chpt03.html"
      },
      {
        id: "brown-c01-chpt04",
        title: "Chapter 4: Baptized",
        url: "../brown-c01/chpt04.html"
      },
      {
        id: "brown-c01-chpt05",
        title: "Chapter 5: Farewell, Wescoe",
        url: "../brown-c01/chpt05.html"
      }
    ],
    "brown-c02": [
      {
        id: "brown-c02-chpt01",
        title: "Chapter 1: Mesmerized",
        url: "../brown-c02/chpt01.html"
      }
    ],

    "legends-os01": [
      {
        id: "legends-os01",
        title: "The False Hydra of Moorland Haunt",
        url: "../rugatha-legends/legends-os01/"
      }
    ],
    "legends-os02": [
      {
        id: "legends-os02",
        title: "The Disappearance of Gustavo Norman",
        url: "../rugatha-legends/legends-os02/"
      }
    ],
    "legends-os03": [
      {
        id: "legends-os03",
        title: "The Lighthouse on the Deserted Island",
        url: "../rugatha-legends/legends-os03/"
      }
    ],
    "legends-os04": [
      {
        id: "legends-os04",
        title: "The Deadly Prison Break",
        url: "../rugatha-legends/legends-os04/"
      }
    ],
    "legends-os06": [
      {
        id: "legends-os06",
        title: "The Malicious Rise of Alfenor",
        url: "../rugatha-legends/legends-os06/"
      }
    ],
    "legends-os07": [
      {
        id: "legends-os07",
        title: "Mylstan Colossus",
        url: "../rugatha-legends/legends-os07/"
      }
    ],
    "legends-os08": [
      {
        id: "legends-os08",
        title: "Lord Octavian von Oderick’s Dungeon of Randomness",
        url: "../rugatha-legends/legends-os08/"
      }
    ],
    "legends-os09": [
      {
        id: "legends-os09",
        title: "To the Deep and Back 往返深淵",
        url: "../rugatha-legends/legends-os09/"
      }
    ],
    "legends-os10": [
      {
        id: "legends-os10",
        title: "The Invisible Spell 隱形咒語",
        url: "../rugatha-legends/legends-os10/"
      }
    ],

    "legends-os05": [
      {
        id: "legends-os05-chpt01",
        title: "Chapter 1: The Mine",
        url: "../legends-os05/chpt01.html"
      },
      {
        id: "legends-os05-chpt02",
        title: "Chapter 2: The Trade",
        url: "../legends-os05/chpt02.html"
      }
    ]
  };
  const chapterImages = {
    "rugatha-c01-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc01%2Fchapter-01%2Fthumb-cd2af9c3.webp?alt=media",
    "rugatha-c01-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc01%2Fchapter-02%2Fthumb-ecf376a5.webp?alt=media",
    "rugatha-c01-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc01%2Fchapter-03%2Fthumb-7095633e.webp?alt=media",
    "rugatha-c01-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc01%2Fchapter-04%2Fthumb-8052872a.webp?alt=media",
    "rugatha-c01-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc01%2Fchapter-05%2Fthumb-b27076a4.webp?alt=media",
    "rugatha-c01-chpt06": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc01%2Fchapter-06%2Fthumb-435be384.webp?alt=media",
    "rugatha-c01-chpt07": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc01%2Fchapter-07%2Fthumb-4468fd86.webp?alt=media",
    "rugatha-c02-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc02%2Fchapter-01%2Fthumb-0e49079e.webp?alt=media",
    "rugatha-c02-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc02%2Fchapter-02%2Fthumb-f0306204.webp?alt=media",
    "rugatha-c02-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc02%2Fchapter-03%2Fthumb-36619e7e.webp?alt=media",
    "rugatha-c03-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-01%2Fthumb-29e6d699.webp?alt=media",
    "rugatha-c03-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-02%2Fthumb-71c4ac43.webp?alt=media",
    "rugatha-c03-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-03%2Fthumb-92dfc9be.webp?alt=media",
    "rugatha-c03-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-04%2Fthumb-6f8ddb42.webp?alt=media",
    "rugatha-c04-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-01%2Fthumb-8b141256.webp?alt=media",
    "rugatha-c04-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-02%2Fthumb-28148963.webp?alt=media",
    "rugatha-c04-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-03%2Fthumb-9125309b.webp?alt=media",
    "rugatha-c04-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-04%2Fthumb-dbe168cc.webp?alt=media",
    "rugatha-c04-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-05%2Fthumb-5de1ef27.webp?alt=media",
    "rugatha-c05-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc05%2Fchapter-01%2Fthumb-2d5c2829.webp?alt=media",
    "plus-c05-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc05%2Fchapter-01%2Fthumb-2d5c2829.webp?alt=media",
    "plus-c05-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-02%2Fthumb-0b28b7fa.webp?alt=media",
    "plus-c05-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-03%2Fthumb-fc272280.webp?alt=media",
    "plus-c05-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-04%2Fthumb-8469e928.webp?alt=media",
    "plus-c05-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-05%2Fthumb-dab8a1c3.webp?alt=media",
    "plus-c06-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-01%2Fthumb-d8e49b6a.webp?alt=media",
    "plus-c06-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-02%2Fthumb-92194423.webp?alt=media",
    "plus-c06-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-03%2Fthumb-a0308466.webp?alt=media",
    "plus-c06-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-04%2Fthumb-3d339618.webp?alt=media",
    "plus-c07-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-01%2Fthumb-35ce69a3.webp?alt=media",
    "plus-c07-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-02%2Fthumb-346ffdda.webp?alt=media",
    "plus-c07-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-03%2Fthumb-ccbde3b1.webp?alt=media",
    "plus-c07-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-04%2Fthumb-9d98857b.webp?alt=media",
    "plus-c08-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc08%2Fchapter-01%2Fthumb-638bd2ad.webp?alt=media",
    "plus-c08-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc08%2Fchapter-03%2Fthumb-9a9d6eaf.webp?alt=media",
    "plus-c08-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc08%2Fchapter-02%2Fthumb-a90becbc.webp?alt=media",
    "lite-c05-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc05%2Fchapter-02%2Fthumb-4a95f971.webp?alt=media",
    "lite-c05-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc05%2Fchapter-01%2Fthumb-2d5c2829.webp?alt=media",
    "lite-c05-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc05%2Fchapter-03%2Fthumb-126e122f.webp?alt=media",
    "lite-c05-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc05%2Fchapter-04%2Fthumb-b4339b0a.webp?alt=media",
    "lite-c06-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc06%2Fchapter-01%2Fthumb-f399ac6a.webp?alt=media",
    "lite-c06-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc06%2Fchapter-02%2Fthumb-ca58d6d4.webp?alt=media",
    "lite-c06-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc06%2Fchapter-03%2Fthumb-a370db08.webp?alt=media",
    "lite-c06-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc06%2Fchapter-04%2Fthumb-1cece2e0.webp?alt=media",
    "lite-c06-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc06%2Fchapter-05%2Fthumb-372abdd1.webp?alt=media",
    "lite-c07-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc07%2Fchapter-01%2Fthumb-99c0d6c0.webp?alt=media",
    "lite-c07-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc07%2Fchapter-02%2Fthumb-19b3bae6.webp?alt=media",
    "lite-c07-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc07%2Fchapter-03%2Fthumb-52439373.webp?alt=media",
    "lite-c07-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc07%2Fchapter-01%2Fthumb-99c0d6c0.webp?alt=media",
    "lite-c07-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc07%2Fchapter-02%2Fthumb-19b3bae6.webp?alt=media",
    "lite-c07-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc07%2Fchapter-03%2Fthumb-52439373.webp?alt=media",
    "lite-c08-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc08%2Fchapter-01%2Fthumb-68c090ff.webp?alt=media",
    "lite-c08-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc08%2Fchapter-02%2Fthumb-96d11e50.webp?alt=media",
    "lite-c08-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc08%2Fchapter-03%2Fthumb-10b094e9.webp?alt=media",
    "lite-c09-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc09%2Fchapter-01%2Fthumb-a766e7d5.webp?alt=media",
    "lite-c09-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc09%2Fchapter-02%2Fthumb-b8db5572.webp?alt=media",
    "lite-c09-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc09%2Fchapter-03%2Fthumb-9aebe87c.webp?alt=media",
    "lite-c10-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc10%2Fchapter-01%2Fthumb-fd5afa98.webp?alt=media",
    "lite-c10-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc10%2Fchapter-02%2Fthumb-30a3328b.webp?alt=media",
    "lite-c10-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc10%2Fchapter-03%2Fthumb-fc3514de.webp?alt=media",
    "lite-c10-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc10%2Fchapter-04%2Fthumb-afd6400d.webp?alt=media",
    "lite-c11-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc11%2Fchapter-01%2Fthumb-3d36bfdf.webp?alt=media",
    "lite-c11-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc11%2Fchapter-02%2Fthumb-6f2bfb56.webp?alt=media",
    "lite-c11-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc11%2Fchapter-03%2Fthumb-72dbb583.webp?alt=media",
    "lite-c11-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc11%2Fchapter-04%2Fthumb-6e7e4abb.webp?alt=media",
    "lite-c12-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc12%2Fchapter-01%2Fthumb-896c574e.webp?alt=media",
    "lite-c12-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc12%2Fchapter-02%2Fthumb-6fa3d24a.webp?alt=media",
    "lite-c12-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc12%2Fchapter-03%2Fthumb-b030dd55.webp?alt=media",
    "lite-c12-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc12%2Fchapter-04%2Fthumb-08b92078.webp?alt=media",
    "lite-c12-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc12%2Fchapter-05%2Fthumb-edae0cb0.webp?alt=media",
    "lite-c13-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc13%2Fchapter-01%2Fthumb-212af7d2.webp?alt=media",
    "wilds-c01-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc01%2Fchapter-01%2Fthumb-2625c12c.webp?alt=media",
    "wilds-c01-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc01%2Fchapter-02%2Fthumb-f810f0b4.webp?alt=media",
    "wilds-c01-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc01%2Fchapter-03%2Fthumb-f6b1d2f3.webp?alt=media",
    "wilds-c02-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc02%2Fchapter-01%2Fthumb-85fe8443.webp?alt=media",
    "wilds-c02-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc02%2Fchapter-02%2Fthumb-0cba10d9.webp?alt=media",
    "wilds-c02-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc02%2Fchapter-03%2Fthumb-7ee279bb.webp?alt=media",
    "wilds-c03-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc03%2Fchapter-01%2Fthumb-42290d14.webp?alt=media",
    "wilds-c03-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc03%2Fchapter-02%2Fthumb-47609357.webp?alt=media",
    "wilds-c03-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc03%2Fchapter-03%2Fthumb-ff7a8df1.webp?alt=media",
    "wilds-c04-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-01%2Fthumb-60c38689.webp?alt=media",
    "wilds-c04-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-02%2Fthumb-b18d473f.webp?alt=media",
    "wilds-c04-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-03%2Fthumb-a57c27b0.webp?alt=media",
    "wilds-c04-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-04%2Fthumb-a5a83b52.webp?alt=media",
    "wilds-c05-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc05%2Fchapter-01%2Fthumb-9a40d158.webp?alt=media",
    "wilds-c05-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc05%2Fchapter-02%2Fthumb-d7f33e8d.webp?alt=media",
    "wilds-c05-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc05%2Fchapter-03%2Fthumb-b393480c.webp?alt=media",
    "wilds-c05-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc05%2Fchapter-04%2Fthumb-01317097.webp?alt=media",
    "wilds-c05-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc05%2Fchapter-05%2Fthumb-a75a7418.webp?alt=media",
    "wilds-c05-chpt06": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc05%2Fchapter-06%2Fthumb-8a9fb1a4.webp?alt=media",
    "brown-c01-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-01%2Fthumb-a461ee4d.webp?alt=media",
    "brown-c01-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-02%2Fthumb-60763776.webp?alt=media",
    "brown-c01-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-03%2Fthumb-6560b547.webp?alt=media",
    "brown-c01-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-04%2Fthumb-ccbbfb21.webp?alt=media",
    "brown-c01-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-05%2Fthumb-43a9f67c.webp?alt=media",
    "brown-c02-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc02%2Fchapter-01%2Fthumb-94cf298f.webp?alt=media",
    "legends-os01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos01%2Fthumb-8fa23a2f.webp?alt=media",
    "legends-os02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos02%2Fthumb-bf0c5f74.webp?alt=media",
    "legends-os03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos03%2Fthumb-6252058b.webp?alt=media",
    "legends-os04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos04%2Fthumb-99475b92.webp?alt=media",
    "legends-os06": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos06%2Fthumb-0b4866f8.webp?alt=media",
    "legends-os07": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos07%2Fthumb-7218e3dd.webp?alt=media",
    "legends-os08": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos08%2Fthumb-1df65dfc.webp?alt=media",
    "legends-os09": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos09%2Fthumb-2ba1ee63.webp?alt=media",
    "legends-os10": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos10%2Fthumb-e40c10a9.webp?alt=media",
    "legends-os05-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flegends%2Fos05%2Fchapter-01%2Fthumb-9acb5ff1.webp?alt=media",
    "legends-os05-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flegends%2Fos05%2Fchapter-02%2Fthumb-268b97f0.webp?alt=media"
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
      if (!arcChapters[node.id].length && !node.noChapters) {
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
    rugatha: "https://rugatha.com/",

    // Level 2
    "rugatha-main": "https://rugatha.com/campaigns/",
    plus: "https://rugatha.com/rugatha-plus/",
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
    "plus-c08": "../rugatha-plus/plus-c08/",
    "lite-c06": "../rugatha-lite/lite-c06/",
    "lite-c07": "../rugatha-lite/lite-c07/",
    "lite-c08": "../rugatha-lite/lite-c08/",
    "lite-c09": "../rugatha-lite/lite-c09/",
    "lite-c10": "../rugatha-lite/lite-c10/",
    "lite-c11": "../rugatha-lite/lite-c11/",
    "lite-c12": "../rugatha-lite/lite-c12/",
    "lite-c13": "../rugatha-lite/lite-c13/",
    "wilds-c01": "../rugatha-wilds/wilds-c01/",
    "wilds-c02": "../rugatha-wilds/wilds-c02/",
    "wilds-c03": "../rugatha-wilds/wilds-c03/",
    "wilds-c04": "../rugatha-wilds/wilds-c04/",
    "wilds-c05": "../rugatha-wilds/wilds-c05/",
    "wilds-c06": null,
    "brown-c01": "../rugatha-brown/brown-c01/",
    "brown-c02": "../rugatha-brown/brown-c02/",
    "legends-os01": "../rugatha-legends/legends-os01/",
    "legends-os02": "../rugatha-legends/legends-os02/",
    "legends-os03": "../rugatha-legends/legends-os03/",
    "legends-os04": "../rugatha-legends/legends-os04/",
    "legends-os05": "../rugatha-legends/legends-os05/",
    "legends-os06": "../rugatha-legends/legends-os06/",
    "legends-os07": "../rugatha-legends/legends-os07/",
    "legends-os08": "../rugatha-legends/legends-os08/",
    "legends-os09": "../rugatha-legends/legends-os09/",
    "legends-os10": "../rugatha-legends/legends-os10/",
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
      home: "https://rugatha.com/"
    },
    campaigns,
    graph: {
      defaultNodeUrl: "https://rugatha.com",
      nodes: graphNodes,
      urlOverrides: graphUrlOverrides
    },
    dataFiles: {
      calendarEvents: "./shared/calendar-events.json",
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
