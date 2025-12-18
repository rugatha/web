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

  const campaignLogo = (fileName) => new URL(`campaign-logos/${fileName}`, campaignsBase).href;

  const campaigns = [
    {
      name: "Rugatha",
      tagline: "Where Gods Collide",
      dates: "2021/5/22 ~ 2022/7/16",
      link: "https://rugatha.com/campaigns/",
      page: "./pages/rugatha/index.html",
      image: campaignLogo("rugatha-logo.jpg"),
      accent: "#9fe0ba",
      nextSession: "團務完結 Campaign Ended"
    },
    {
      name: "RUGATHA Plus",
      tagline: "Adventures & Mysteries Awaits",
      dates: "2022/7/23 ~",
      link: "https://rugatha.com/rugatha-plus/",
      page: "./pages/rugatha-plus/index.html",
      image: campaignLogo("rugatha-plus-logo.jpg"),
      accent: "#c8f9ff",
      nextSession: "2026/1/3"
    },
    {
      name: "Rugatha lite",
      tagline: "Stories & Treasures Awaits",
      dates: "2022/8/6 ~",
      link: "https://rugatha.com/rugatha-lite/",
      page: "./pages/rugatha-lite/index.html",
      image: campaignLogo("rugatha-light-logo.jpg"),
      accent: "#ffe7a3",
      nextSession: "2026/1/17"
    },
    {
      name: "Rugatha WILDS",
      tagline: "Wisdon & Ingenuity... Leads to Daring Success",
      dates: "2024/3/16 ~",
      link: "https://rugatha.com/rugatha-wilds/",
      page: "./pages/rugatha-wilds/index.html",
      image: campaignLogo("rugatha-wilds-logo.jpg"),
      accent: "#c1e27a",
      nextSession: "2026/1/10"
    },
    {
      name: "Rugatha Brown",
      tagline: "Descend into Darkness",
      dates: "2022/11/7 ~ 2023/3/14",
      link: "https://rugatha.com/rugatha-brown/",
      page: "./pages/rugatha-brown/index.html",
      image: campaignLogo("rugatha-brown-logo.jpg"),
      accent: "#ffc09f",
      nextSession: "團務完結 Campaign Ended"
    },
    {
      name: "Rugatha Legends",
      tagline: "Adventures. Heroes. Legends.",
      dates: "2022/2/7 ~",
      link: "https://rugatha.com/rugatha-legends/",
      page: "./pages/rugatha-legends/index.html",
      image: campaignLogo("rugatha-legends-logo.jpg"),
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
    {
      id: "legends-os09",
      label: "To the Moon and Back 往返深淵",
      title: "To the Moon and Back 往返深淵",
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
        id: "rugatha-c05-chpt01",
        title: "Chapter 1: The Aftermath",
        url: "../../rugatha/rugatha-c05/chpt01.html"
      },
      {
        id: "plus-c05-chpt02",
        title: "Chapter 2: Regroup and Reanalysis",
        url: "/campaigns/pages/rugatha-plus/plus-c05/chpt02.html"
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
      }
    ],

    "lite-c05": [
      {
        id: "rugatha-c05-chpt01",
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
        title: "Chapter 4: Eternal Lost of the Dragonborn Vein",
        url: "../wilds-c04/chpt04.html"
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
        id: "legends-os01-chpt01",
        title: "The False Hydra of Moorland Haunt",
        url: "../rugatha-legends/legends-os01/"
      }
    ],
    "legends-os02": [
      {
        id: "legends-os02-chpt01",
        title: "The Disappearance of Gustavo Norman",
        url: "../rugatha-legends/legends-os02/"
      }
    ],
    "legends-os03": [
      {
        id: "legends-os03-chpt01",
        title: "The Lighthouse on the Deserted Island",
        url: "../rugatha-legends/legends-os03/"
      }
    ],
    "legends-os04": [
      {
        id: "legends-os04-chpt01",
        title: "The Deadly Prison Break",
        url: "../rugatha-legends/legends-os04/"
      }
    ],
    "legends-os06": [
      {
        id: "legends-os06-chpt01",
        title: "The Malicious Rise of Alfenor",
        url: "../rugatha-legends/legends-os06/"
      }
    ],
    "legends-os07": [
      {
        id: "legends-os07-chpt01",
        title: "Mylstan Colossus",
        url: "../rugatha-legends/legends-os07/"
      }
    ],
    "legends-os08": [
      {
        id: "legends-os08-chpt01",
        title: "Lord Octavian von Oderick’s Dungeon of Randomness",
        url: "../rugatha-legends/legends-os08/"
      }
    ],
    "legends-os09": [
      {
        id: "legends-os09-chpt01",
        title: "To the Moon and Back 往返深淵",
        url: "../rugatha-legends/legends-os09/"
      }
    ],
    "legends-os10": [
      {
        id: "legends-os10-chpt01",
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
    "lite-c06-chpt05": "../chapter-banners/lite-c06-chpt05.png",
    "lite-c07-chpt01": "../chapter-banners/lite-c07-chpt01.png",
    "lite-c07-chpt02": "../chapter-banners/lite-c07-chpt02.png",
    "lite-c07-chpt03": "../chapter-banners/lite-c07-chpt03.png",
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
    "lite-c11-chpt04": "../chapter-banners/lite-c11-chpt04.jpeg",
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
    "legends-os01-chpt01": "../chapter-banners/legends-os01-chpt01.jpg",
    "legends-os02-chpt01": "../campaign-banners/legends-os02.jpg",
    "legends-os03-chpt01": "../campaign-banners/legends-os03.jpg",
    "legends-os04-chpt01": "../campaign-banners/legends-os04.jpg",
    "legends-os06-chpt01": "../campaign-banners/legends-os06.jpg",
    "legends-os07-chpt01": "../campaign-banners/legends-os07.jpg",
    "legends-os08-chpt01": "../campaign-banners/legends-os08.png",
    "legends-os09-chpt01": "../campaign-banners/legends-os09.png",
    "legends-os10-chpt01": "../campaign-banners/legends-os10.png",
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
    rugatha: "http://rugatha.github.io/web/",

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
    "lite-c06": "../rugatha-lite/lite-c06/",
    "lite-c07": "../rugatha-lite/lite-c07/",
    "lite-c08": "../rugatha-lite/lite-c08/",
    "lite-c09": "../rugatha-lite/lite-c09/",
    "lite-c10": "../rugatha-lite/lite-c10/",
    "lite-c11": "../rugatha-lite/lite-c11/",
    "wilds-c01": "../rugatha-wilds/wilds-c01/",
    "wilds-c02": "../rugatha-wilds/wilds-c02/",
    "wilds-c03": "../rugatha-wilds/wilds-c03/",
    "wilds-c04": "../rugatha-wilds/wilds-c04/",
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
      home: "http://rugatha.github.io/web/"
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
