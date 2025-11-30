// Shared Rugatha configuration used by the campaigns, graph, and NPC tools.
(function (global) {
  const campaigns = [
    {
      name: "Rugatha",
      tagline: "Where Gods Collide",
      dates: "2021/5/22 ~ 2022/7/16",
      link: "https://rugatha.com/campaigns/",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-logo.jpg",
      accent: "#9fe0ba"
    },
    {
      name: "RUGATHA Plus",
      tagline: "Adventures & Mysteries Awaits",
      dates: "2022/7/23 ~",
      link: "https://rugatha.com/rugatha-plus/",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-plus-logo-1.jpg",
      accent: "#c8f9ff"
    },
    {
      name: "Rugatha lite",
      tagline: "Stories & Treasures Awaits",
      dates: "2022/8/6 ~",
      link: "https://rugatha.com/rugatha-lite/",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-light-logo-1.jpg",
      accent: "#ffe7a3"
    },
    {
      name: "Rugatha WILDS",
      tagline: "Wisdon & Ingenuity... Leads to Daring Success",
      dates: "2024/3/16 ~",
      link: "https://rugatha.com/rugatha-wilds/",
      image: "https://rugatha.com/wp-content/uploads/2024/03/rugatha-wilds-logo.jpg",
      accent: "#c1e27a"
    },
    {
      name: "RUGATHA Plus 1",
      tagline: "LET'S GET ROLLING IN THE DEEEEEEEP",
      dates: "2024/7/13 ~ 2024/11/23",
      link: "https://rugatha.com/rugatha-plus-1/",
      image: "https://rugatha.com/wp-content/uploads/2024/06/rugatha-plus-one.png",
      accent: "#ffd0f0"
    },
    {
      name: "Rugatha Brown",
      tagline: "Descend into Darkness",
      dates: "2022/11/7 ~ 2023/3/14",
      link: "https://rugatha.com/rugatha-brown/",
      image: "https://rugatha.com/wp-content/uploads/2022/11/rugatha-brown-logo-1.jpg",
      accent: "#ffc09f"
    },
    {
      name: "Rugatha Legends",
      tagline: "Adventures. Heroes. Legends.",
      dates: "2022/2/7 ~",
      link: "https://rugatha.com/rugatha-legends/",
      image: "https://rugatha.com/wp-content/uploads/2022/07/rugatha-legends.jpg",
      accent: "#f6d185"
    }
  ];

  const graphNodes = [
    // Level 1 (root)
    { id: "rugatha", label: "Rugatha", level: 1, parent: null },

    // ===== Rugatha (main line) =====
    { id: "rugatha-main", label: "Rugatha", level: 2, parent: "rugatha" },
    {
      id: "rugatha-c01",
      label: "C01 Curse of Vowalon",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c02",
      label: "C02 Beneath the Temple",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c03",
      label: "C03 Korringfield Reunion",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c04",
      label: "C04 The Blooming of Macksohn",
      level: 3,
      parent: "rugatha-main"
    },
    {
      id: "rugatha-c05",
      label: "C05 Mattington Shattered",
      level: 3,
      parent: "rugatha-main",
      extraParents: ["plus", "lite"]
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
      id: "plus-c06",
      label: "C06 Hand of the Lich",
      level: 3,
      parent: "plus"
    },
    {
      id: "plus-c07",
      label: "C07 Before the Next Full Moon",
      level: 3,
      parent: "plus"
    },

    // ===== Rugatha Plus 1 =====
    { id: "plus1", label: "Rugatha Plus 1", level: 2, parent: "rugatha" },
    {
      id: "plus1-c01",
      label: "C01 To the Deep and Back",
      level: 3,
      parent: "plus1"
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
      id: "lite-c06",
      label: "C06 The Gift from Alfenor",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c07",
      label: "C07 Lurking Dangers",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c08",
      label: "C08 Deep into Lothum",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c09",
      label: "C09 The Cave of Drogsland",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c10",
      label: "C10 Requiem of the Feathered Island",
      level: 3,
      parent: "lite"
    },
    {
      id: "lite-c11",
      label: "C11 Seats of the Eclipse",
      level: 3,
      parent: "lite"
    },

    // ===== Rugatha WILDS =====
    { id: "wilds", label: "Rugatha WILDS", level: 2, parent: "rugatha" },
    {
      id: "wilds-c01",
      label: "C01 The Elite Bloodline",
      level: 3,
      parent: "wilds"
    },
    {
      id: "wilds-c02",
      label: "C02 Gathering of the Chosen",
      level: 3,
      parent: "wilds"
    },
    {
      id: "wilds-c03",
      label: "C03 Storm of Mudtown",
      level: 3,
      parent: "wilds"
    },
    {
      id: "wilds-c04",
      label: "C04 Heir to Rathanad",
      level: 3,
      parent: "wilds"
    },

    // ===== Rugatha Brown =====
    { id: "brown", label: "Rugatha Brown", level: 2, parent: "rugatha" },
    {
      id: "brown-c01",
      label: "C01 Dark Petals",
      level: 3,
      parent: "brown"
    },
    {
      id: "brown-howling",
      label: "C02 Howling of the Wolf",
      level: 3,
      parent: "brown"
    },

    // ===== Rugatha Legends =====
    { id: "legends", label: "Rugatha Legends", level: 2, parent: "rugatha" },
    {
      id: "legends-os01",
      label: "OS01 The False Hydra of Moorland Haunt",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os02",
      label: "OS02 The Disappearance of Gustavo Norman",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os03",
      label: "OS03 The Lighthouse on the Deserted Island",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os04",
      label: "OS04 The Deadly Prison Break",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os05",
      label: "OS05 Dragon’s Orb",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os06",
      label: "OS06 The Malicious Rise of Alfenor",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os07",
      label: "OS07 Mylstan Colossus",
      level: 3,
      parent: "legends"
    },
    {
      id: "legends-os08",
      label: "OS08 Lord Octavian von Oderick’s Dungeon of Randomness",
      level: 3,
      parent: "legends"
    },

    // ===== Rugatha Experience =====
    { id: "exp", label: "Rugatha Experience", level: 2, parent: "rugatha" },
    {
      id: "exp-e01",
      label: "E01 The Scroll of the Golden Castle",
      level: 3,
      parent: "exp"
    },
    {
      id: "exp-e02",
      label: "E02 Echoes of the Dragon’s Roar",
      level: 3,
      parent: "exp"
    }
  ];

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
    "rugatha-c01": "https://rugatha.wordpress.com/campaign-1-curse-of-vowalon/",
    "rugatha-c02": "https://rugatha.wordpress.com/campaign-2-beneath-the-temple/",
    "rugatha-c03": "https://rugatha.com/campaign-3-korringfield-reunion/",
    "rugatha-c04": "https://rugatha.com/campaign-4-the-blooming-of-macksohn/",
    "rugatha-c05": "https://rugatha.com/campaign-5-mattington-shattered/",
    "plus-c05": "https://rugatha.com/campaign-5-mattington-shattered/",
    "lite-c05": "https://rugatha.com/campaign-5-mattington-shattered/",
    "plus-c06": "https://rugatha.wordpress.com/r-campaign-6-hand-of-the-lich/",
    "plus-c07": "https://rugatha.com/r-campaign-7-before-the-next-full-moon/",
    "plus1-c01": "https://rugatha.com/2024/07/17/campaign-1-to-the-deep-and-back/",
    "lite-c06": "https://rugatha.wordpress.com/rlite-campaign-6-the-gift-from-alfenor/",
    "lite-c07": "https://rugatha.wordpress.com/rlite-campaign-7-lurking-dangers/",
    "lite-c08": "https://rugatha.com/rlite-campaign-8-deep-into-lothum/",
    "lite-c09": "https://rugatha.com/rlite-campaign-9-the-cave-of-drogsland/",
    "lite-c10": "https://rugatha.com/rlite-campaign-10-requiem-of-the-feathered-estate/",
    "lite-c11": "https://rugatha.com/rlite-campaign-11-seats-of-the-eclipse/",
    "wilds-c02": "https://rugatha.com/rwilds-campaign-2-gathering-of-the-chosen/",
    "wilds-c03": "https://rugatha.com/rwilds-campaign-3-storm-of-mudtown/",
    "wilds-c04": "https://rugatha.com/rwilds-campaign-4-heir-to-rathanad/",
    "brown-c01": "https://rugatha.wordpress.com/rbrown-campaign-1-dark-petals/",
    "brown-howling": "https://rugatha.wordpress.com/rbrown-campaign-2-howling-of-the-wolf/",
    "legends-os01": "https://rugatha.wordpress.com/2022/02/07/the-false-hydra-of-moorland-haunt/",
    "legends-os02": "https://rugatha.wordpress.com/2022/02/07/the-disappearance-of-gustavo-norman/",
    "legends-os04": "https://rugatha.wordpress.com/2022/08/28/the-deadly-prison-break/",
    "legends-os05": "https://rugatha.wordpress.com/legend-5-dragons-orb/",
    "legends-os07": "https://rugatha.wordpress.com/2023/08/29/mylstan-colossus/",
    "legends-os08": "https://rugatha.com/2024/05/27/lord-octavian-von-odericks-dungeon-of-randomness/",
    "exp-e01": null,
    "exp-e02": null
  };

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
      url: overrideUrl === undefined ? config.graph.defaultNodeUrl : overrideUrl
    });
  });

  config.graph.data = graphData;

  global.RUGATHA_CONFIG = config;
  global.CAMPAIGN_GRAPH_DATA = graphData;
})(typeof window !== "undefined" ? window : globalThis);
