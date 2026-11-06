(() => {
  const revision = document.currentScript?.src
    ? new URL(document.currentScript.src).searchParams.get('v') : '';
  const versionedDataUrl = (filename) => {
    const url = new URL(`data/${filename}`, campaignsBase);
    if (revision) url.searchParams.set('v', revision);
    return url.href;
  };
  const campaigns =
    window.RUGATHA_CONFIG && Array.isArray(window.RUGATHA_CONFIG.campaigns)
      ? window.RUGATHA_CONFIG.campaigns
      : [];
  const graphData =
    (window.RUGATHA_CONFIG &&
      window.RUGATHA_CONFIG.graph &&
      Array.isArray(window.RUGATHA_CONFIG.graph.data) &&
      window.RUGATHA_CONFIG.graph.data) ||
    window.CAMPAIGN_GRAPH_DATA ||
    [];

  const campaignsBaseFromConfig = typeof window.RUGATHA_CAMPAIGNS_BASE === "string" ? window.RUGATHA_CAMPAIGNS_BASE : null;
  const buildCampaignsBase = () => {
    const path = window.location && window.location.pathname ? window.location.pathname : "";
    const idx = path.indexOf("/campaigns/");
    if (idx >= 0) {
      const origin =
        (window.location && window.location.origin && window.location.origin !== "null"
          ? window.location.origin
          : "file://") || "";
      return `${origin}${path.slice(0, idx + "/campaigns/".length)}`;
    }
    return window.location && window.location.origin ? window.location.origin : "/";
  };
  const campaignsBase = campaignsBaseFromConfig || buildCampaignsBase();
  const withTrailingSlash = (value) => (value.endsWith("/") ? value : `${value}/`);
  const campaignBannerBase = `${withTrailingSlash(campaignsBase)}campaign-banners/`;
  const chapterBannerBase = `${withTrailingSlash(campaignsBase)}chapter-banners/`;
  const resolvePath = (value) => {
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
    const base = withTrailingSlash(campaignsBase);
    try {
      return new URL(sanitized, base).href;
    } catch (err) {
      return `${base}${sanitized}`;
    }
  };

  const pathParts = window.location.pathname.replace(/\/index\.html?$/, "").split("/").filter(Boolean);
  const pagesIdx = pathParts.indexOf("pages");
  const slugSegment = pagesIdx >= 0 ? pathParts[pagesIdx + 1] : "";
  const arcSegment = pagesIdx >= 0 ? pathParts[pagesIdx + 2] : "";
  const lastSegment = pathParts[pathParts.length - 1] || "";
  const isChapterPage = /^chpt/i.test(lastSegment);
  const isNestedPage = Boolean(slugSegment);
  const isArcPage = !isChapterPage && Boolean(arcSegment);
  const isCampaignOverviewPage = !isChapterPage && !isArcPage && Boolean(slugSegment);
  document.body.classList.toggle("campaign-overview-page", isCampaignOverviewPage);
  const imageBannerBase = isArcPage || isNestedPage ? campaignBannerBase : campaignBannerBase;
  const chapterImageMap = {
    // Rugatha main
    "rugatha-c01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Frugatha%2Fc01%2Fthumb-89e07b5d.webp?alt=media",
    "rugatha-c02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Frugatha%2Fc02%2Fthumb-67c4d0b3.webp?alt=media",
    "rugatha-c03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Frugatha%2Fc03%2Fthumb-613e1e32.webp?alt=media",
    "rugatha-c03-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-01%2Fthumb-29e6d699.webp?alt=media",
    "rugatha-c03-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-02%2Fthumb-71c4ac43.webp?alt=media",
    "rugatha-c03-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-03%2Fthumb-92dfc9be.webp?alt=media",
    "rugatha-c03-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc03%2Fchapter-04%2Fthumb-6f8ddb42.webp?alt=media",
    "rugatha-c04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Frugatha%2Fc04%2Fthumb-c95681ad.webp?alt=media",
    "rugatha-c04-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-01%2Fthumb-8b141256.webp?alt=media",
    "rugatha-c04-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-02%2Fthumb-28148963.webp?alt=media",
    "rugatha-c04-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-03%2Fthumb-9125309b.webp?alt=media",
    "rugatha-c04-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-04%2Fthumb-dbe168cc.webp?alt=media",
    "rugatha-c04-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Frugatha%2Fc04%2Fchapter-05%2Fthumb-5de1ef27.webp?alt=media",
    "rugatha-c05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Frugatha%2Fc05%2Fthumb-facef588.webp?alt=media",
    // Mattington shared variants
    "plus-c05-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-02%2Fthumb-0b28b7fa.webp?alt=media",
    "plus-c05-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-03%2Fthumb-fc272280.webp?alt=media",
    "plus-c05-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-04%2Fthumb-8469e928.webp?alt=media",
    "plus-c05-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc05%2Fchapter-05%2Fthumb-dab8a1c3.webp?alt=media",
    "plus-c05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fplus%2Fc05%2Fthumb-e44129a7.webp?alt=media",
    "plus-c06-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-01%2Fthumb-d8e49b6a.webp?alt=media",
    "plus-c06-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-02%2Fthumb-92194423.webp?alt=media",
    "plus-c06-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-03%2Fthumb-a0308466.webp?alt=media",
    "plus-c06-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc06%2Fchapter-04%2Fthumb-3d339618.webp?alt=media",
    "plus-c07-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-01%2Fthumb-35ce69a3.webp?alt=media",
    "plus-c07-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-02%2Fthumb-346ffdda.webp?alt=media",
    "plus-c07-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-03%2Fthumb-ccbde3b1.webp?alt=media",
    "plus-c07-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc07%2Fchapter-04%2Fthumb-9d98857b.webp?alt=media",
    "plus-c08-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc08%2Fchapter-01%2Fthumb-638bd2ad.webp?alt=media",
    "plus-c08-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fplus%2Fc08%2Fchapter-02%2Fthumb-a90becbc.webp?alt=media",
    "brown-c01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fbrown%2Fc01%2Fthumb-aece5aad.webp?alt=media",
    "brown-c01-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-01%2Fthumb-a461ee4d.webp?alt=media",
    "brown-c01-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-02%2Fthumb-60763776.webp?alt=media",
    "brown-c01-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-03%2Fthumb-6560b547.webp?alt=media",
    "brown-c01-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-04%2Fthumb-ccbbfb21.webp?alt=media",
    "brown-c01-chpt05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc01%2Fchapter-05%2Fthumb-43a9f67c.webp?alt=media",
    "brown-c02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fbrown%2Fc02%2Fthumb-7f70d8a9.webp?alt=media",
    "brown-c02-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fbrown%2Fc02%2Fchapter-01%2Fthumb-94cf298f.webp?alt=media",
    "lite-c05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc05%2Fthumb-8202f026.webp?alt=media",
    "lite-c05-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Flite%2Fc05%2Fchapter-02%2Fthumb-4a95f971.webp?alt=media",
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
    // Rugatha Plus
    "plus-c06": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fplus%2Fc06%2Fthumb-176af930.webp?alt=media",
    "plus-c07": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fplus%2Fc07%2Fthumb-478e24b8.webp?alt=media",
    "plus-c08": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fplus%2Fc08%2Fthumb-dda4ac83.webp?alt=media",
    // Rugatha Lite
    "lite-c06": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc06%2Fthumb-c0c2b3dc.webp?alt=media",
    "lite-c07": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc07%2Fthumb-bf970fd6.webp?alt=media",
    "lite-c08": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc08%2Fthumb-921c4e26.webp?alt=media",
    "lite-c09": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc09%2Fthumb-9ab848a0.webp?alt=media",
    "lite-c10": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc10%2Fthumb-c52f8ed6.webp?alt=media",
    "lite-c11": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc11%2Fthumb-d8b69443.webp?alt=media",
    "lite-c12": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc12%2Fthumb-64706114.webp?alt=media",
    "lite-c13": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flite%2Fc13%2Fthumb-819cf9e1.webp?alt=media",
    // Rugatha Wilds
    "wilds-c01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fwilds%2Fc01%2Fthumb-e50b749d.webp?alt=media",
    "wilds-c01-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc01%2Fchapter-01%2Fthumb-2625c12c.webp?alt=media",
    "wilds-c01-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc01%2Fchapter-02%2Fthumb-f810f0b4.webp?alt=media",
    "wilds-c01-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc01%2Fchapter-03%2Fthumb-f6b1d2f3.webp?alt=media",
    "wilds-c02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fwilds%2Fc02%2Fthumb-e3b1710e.webp?alt=media",
    "wilds-c02-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc02%2Fchapter-01%2Fthumb-85fe8443.webp?alt=media",
    "wilds-c02-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc02%2Fchapter-02%2Fthumb-0cba10d9.webp?alt=media",
    "wilds-c02-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc02%2Fchapter-03%2Fthumb-7ee279bb.webp?alt=media",
    "wilds-c03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fwilds%2Fc03%2Fthumb-d64a2940.webp?alt=media",
    "wilds-c03-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc03%2Fchapter-01%2Fthumb-42290d14.webp?alt=media",
    "wilds-c03-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc03%2Fchapter-02%2Fthumb-47609357.webp?alt=media",
    "wilds-c03-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc03%2Fchapter-03%2Fthumb-ff7a8df1.webp?alt=media",
    "wilds-c04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fwilds%2Fc04%2Fthumb-1da1d848.webp?alt=media",
    "wilds-c04-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-01%2Fthumb-60c38689.webp?alt=media",
    "wilds-c04-chpt02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-02%2Fthumb-b18d473f.webp?alt=media",
    "wilds-c04-chpt03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-03%2Fthumb-a57c27b0.webp?alt=media",
    "wilds-c04-chpt04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-04%2Fthumb-a5a83b52.webp?alt=media",
    "wilds-c05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fwilds%2Fc05%2Fthumb-061dfe39.webp?alt=media",
    "wilds-c06": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fwilds%2Fc06%2Fthumb-8a197fe2.webp?alt=media",
    "wilds-c04-chpt01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Fchapters%2Fwilds%2Fc04%2Fchapter-01%2Fthumb-60c38689.webp?alt=media",
    // Rugatha Brown
    "brown-c01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fbrown%2Fc01%2Fthumb-aece5aad.webp?alt=media",
    "brown-c02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fbrown%2Fc02%2Fthumb-7f70d8a9.webp?alt=media",
    // Rugatha Legends
    "legends-os01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos01%2Fthumb-8fa23a2f.webp?alt=media",
    "legends-os02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos02%2Fthumb-bf0c5f74.webp?alt=media",
    "legends-os03": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos03%2Fthumb-6252058b.webp?alt=media",
    "legends-os04": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos04%2Fthumb-99475b92.webp?alt=media",
    "legends-os05": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos05%2Fthumb-848a96d0.webp?alt=media",
    "legends-os06": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos06%2Fthumb-0b4866f8.webp?alt=media",
    "legends-os07": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos07%2Fthumb-7218e3dd.webp?alt=media",
    "legends-os08": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos08%2Fthumb-1df65dfc.webp?alt=media",
    "legends-os09": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos09%2Fthumb-2ba1ee63.webp?alt=media",
    "legends-os10": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Flegends%2Fos10%2Fthumb-e40c10a9.webp?alt=media",
    // Experience (optional, in case used)
    "exp-e01": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fexp%2Fe01%2Fthumb-062d7ea8.webp?alt=media",
    "exp-e02": "https://firebasestorage.googleapis.com/v0/b/rugatha-87e15.firebasestorage.app/o/public-images%2Farcs%2Fexp%2Fe02%2Fthumb-5c205223.webp?alt=media"
  };

  const params = new URLSearchParams(window.location.search);
  const slugParam =
    (params.get("campaign") ||
      params.get("slug") ||
      (document.body.dataset.campaign || slugSegment || "")).toLowerCase();
  const arcBase = "./";

  const slugify = (text) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const toRgba = (hex, alpha = 0.18) => {
    const normalized = hex.replace("#", "");
    const bigint = parseInt(
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const targetCampaign = campaigns.find((item) => slugify(item.name) === slugParam);
  const bodyArc = (document.body.dataset && document.body.dataset.arc) || "";
  const targetArc = isArcPage
    ? graphData.find(
        (node) =>
          node.level === 3 &&
          (node.id === arcSegment || (bodyArc && node.id === bodyArc))
      )
    : null;
  const target = targetArc || targetCampaign;
  const detail = document.querySelector("[data-role='campaign-detail']");
  const notFound = document.querySelector("[data-role='not-found']");
  const displayName =
    (target && (target.name || target.title || target.label)) ||
    (targetCampaign && targetCampaign.name) ||
    "Campaign";
  const getLocalizedTagline = (item, lang) => {
    if (!item) return "";
    if (lang === "en") return item.tagline_en || item.tagline || item.tagline_zh || "";
    return item.tagline_zh || item.tagline || item.tagline_en || "";
  };
  const getDisplayTagline = (lang) =>
    getLocalizedTagline(target, lang) || getLocalizedTagline(targetCampaign, lang);
  const displayTagline = getDisplayTagline("zh");
  const displayDates = (target && target.dates) || (targetCampaign && targetCampaign.dates);
  const accent = (target && target.accent) || (targetCampaign && targetCampaign.accent) || "#7bdcb5";
  const i18n = {
    relatedPcTitle: { zh: "玩家角色", en: "Player Characters" },
    relatedGuestTitle: { zh: "客串玩家", en: "Guest Players" },
    relatedTitle: { zh: "登場NPC", en: "NPCs" },
    chaptersTitle: { zh: "章節", en: "Chapters" },
    storyArcsTitle: { zh: "故事線", en: "Story Arcs" },
    storyArcsEmpty: { zh: "敬請期待", en: "Stay Tuned" },
    storyArcBadge: { zh: "故事弧", en: "Story Arc" },
    pcMetaSeparator: { zh: "｜", en: " | " }
  };
  const languageState = {
    value: "zh",
    wrap: null
  };
  const relatedNpcState = {
    npcIds: null,
    charById: null,
    pcCharById: null,
    siteBase: null
  };
  const relatedPcState = {
    pcIds: null,
    charById: null,
    siteBase: null
  };
  const relatedGuestState = {
    pcIds: null,
    charById: null,
    siteBase: null
  };
  let relatedLocations = [];
  const currentChapterId = isChapterPage && arcSegment ? `${arcSegment}-${lastSegment.replace(/\.html?$/i, "").toLowerCase()}` : null;
  const currentArcId = (isArcPage && targetArc && targetArc.id) || bodyArc || arcSegment || null;
  const chapterTitleState = {
    map: null,
    fallbackTitle: ""
  };
  const arcTitleState = {
    map: null,
    fallbackTitle: "",
    fallbackTagline: ""
  };
  const chapterListState = {
    chapters: []
  };

  if (!target) {
    if (detail) detail.classList.add("is-hidden");
    if (notFound) notFound.classList.remove("is-hidden");
    document.title = "Campaign not found | Rugatha";
    console.warn("Campaign slug not found:", slugParam);
    return;
  }

  const getPreferredLanguage = () => {
    try {
      const stored = localStorage.getItem("npc-lang");
      if (stored === "zh" || stored === "en") return stored;
    } catch (_) {
      // ignore storage access errors
    }
    const docLang = (document.documentElement.getAttribute("lang") || "").toLowerCase();
    return docLang.startsWith("en") ? "en" : "zh";
  };

  const loadChapterTitleMap = async () => {
    if (window.__RUGATHA_CHAPTER_TITLE_MAP) return window.__RUGATHA_CHAPTER_TITLE_MAP;
    if (window.__RUGATHA_CHAPTER_TITLES_PROMISE) return window.__RUGATHA_CHAPTER_TITLES_PROMISE;
    const titlesUrl = versionedDataUrl("chapter-titles.json");
    window.__RUGATHA_CHAPTER_TITLES_PROMISE = fetch(titlesUrl, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const map = data && typeof data === "object" ? data : {};
        window.__RUGATHA_CHAPTER_TITLE_MAP = map;
        return map;
      })
      .catch((err) => {
        console.warn("Chapter title map unavailable:", err && err.message ? err.message : err);
        const empty = {};
        window.__RUGATHA_CHAPTER_TITLE_MAP = empty;
        return empty;
      });
    return window.__RUGATHA_CHAPTER_TITLES_PROMISE;
  };

  const loadStoryArcTitleMap = async () => {
    if (window.__RUGATHA_STORY_ARC_TITLE_MAP) return window.__RUGATHA_STORY_ARC_TITLE_MAP;
    if (window.__RUGATHA_STORY_ARC_TITLES_PROMISE) return window.__RUGATHA_STORY_ARC_TITLES_PROMISE;
    const titlesUrl = versionedDataUrl("story-arc-titles.json");
    window.__RUGATHA_STORY_ARC_TITLES_PROMISE = fetch(titlesUrl, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const map = data && typeof data === "object" ? data : {};
        window.__RUGATHA_STORY_ARC_TITLE_MAP = map;
        return map;
      })
      .catch((err) => {
        console.warn("Story arc title map unavailable:", err && err.message ? err.message : err);
        const empty = {};
        window.__RUGATHA_STORY_ARC_TITLE_MAP = empty;
        return empty;
      });
    return window.__RUGATHA_STORY_ARC_TITLES_PROMISE;
  };

  const getLocalizedChapterTitle = (chapterId, fallback) => {
    if (!chapterId) return fallback || "Chapter";
    const map = chapterTitleState.map || window.__RUGATHA_CHAPTER_TITLE_MAP || {};
    const entry = map[chapterId];
    if (entry && typeof entry === "object") {
      if (languageState.value === "en") {
        return entry.en || entry.zh || fallback || chapterId;
      }
      return entry.zh || entry.en || fallback || chapterId;
    }
    return fallback || chapterId;
  };

  const getLocalizedArcTitle = (arcId, fallback) => {
    if (!arcId) return fallback || "Story Arc";
    const map = arcTitleState.map || window.__RUGATHA_STORY_ARC_TITLE_MAP || {};
    const entry = map[arcId];
    if (entry && typeof entry === "object") {
      if (languageState.value === "en") {
        return entry.en || entry.zh || fallback || arcId;
      }
      return entry.zh || entry.en || fallback || arcId;
    }
    return fallback || arcId;
  };

  const updateChapterTitle = () => {
    if (!isChapterPage || !currentChapterId) return;
    const titleEl = document.querySelector(".campaign-detail.arc-detail .campaign-detail__title");
    if (titleEl && !chapterTitleState.fallbackTitle) {
      chapterTitleState.fallbackTitle = titleEl.textContent.trim();
    }
    const localizedTitle = getLocalizedChapterTitle(currentChapterId, chapterTitleState.fallbackTitle || displayName);
    if (titleEl && localizedTitle) {
      titleEl.textContent = localizedTitle;
    }
    if (localizedTitle) {
      document.title = `${localizedTitle} | Rugatha Campaign`;
    }
  };

  const updateArcTitle = () => {
    if (!isArcPage || !targetArc) return;
    const titleEl = document.querySelector(".campaign-detail.arc-detail .campaign-detail__title");
    if (titleEl && !arcTitleState.fallbackTitle) {
      arcTitleState.fallbackTitle = titleEl.textContent.trim();
    }
    const localizedTitle = getLocalizedArcTitle(
      targetArc.id,
      arcTitleState.fallbackTitle || displayName
    );
    if (titleEl && localizedTitle) {
      titleEl.textContent = localizedTitle;
    }
    if (localizedTitle) {
      document.title = `${localizedTitle} | Rugatha Campaign`;
    }
  };

  const updateChapterArcTagline = () => {
    if (!isChapterPage || !currentArcId) return;
    const taglineEl = document.querySelector(".campaign-detail.arc-detail .campaign-detail__tagline");
    if (!taglineEl) return;
    if (!arcTitleState.fallbackTagline) {
      arcTitleState.fallbackTagline = taglineEl.textContent.trim();
    }
    const localizedTagline = getLocalizedArcTitle(currentArcId, arcTitleState.fallbackTagline || displayTagline || currentArcId);
    if (localizedTagline) {
      taglineEl.textContent = localizedTagline;
    }
  };

  const updateArcChaptersHeading = () => {
    if (!isArcPage) return;
    const heading = document.querySelector(".campaign-detail__chapters h2");
    if (!heading) return;
    heading.textContent = i18n.chaptersTitle[languageState.value];
  };

  const updateCampaignStoryArcsHeading = () => {
    if (isArcPage || isChapterPage) return;
    const heading = document.querySelector(".campaign-detail__chapters h2");
    if (!heading) return;
    const titleKey = document.body.dataset.emptyCampaignArcs === "true" ? "storyArcsEmpty" : "storyArcsTitle";
    heading.textContent = i18n[titleKey][languageState.value];
  };

  const updateStoryArcBadge = () => {
    if (!isArcPage) return;
    const badge = document.querySelector(".campaign-detail.arc-detail .campaign-detail__badge");
    if (!badge) return;
    badge.textContent = i18n.storyArcBadge[languageState.value];
  };

  const renderChapterList = () => {
    const chapterList = document.querySelector("[data-role='chapter-list']");
    if (!chapterList) return;

    const chaptersToRender = Array.isArray(chapterListState.chapters) ? chapterListState.chapters : [];
    chapterList.innerHTML = "";

    if (chapterList.dataset.emptyState === "blank") return;

    if (!chaptersToRender.length) {
      const li = document.createElement("li");
      li.textContent = "尚未有章節";
      chapterList.appendChild(li);
      return;
    }

    chaptersToRender.forEach((ch) => {
      const li = document.createElement("li");
      const meta = document.createElement("div");
      meta.className = "chapter-list__meta";
      const isLevel4 = ch.level === 4;
      const arcHref = isLevel4
        ? ch.url || `${arcBase}${ch.id}/`
        : ch.id === "rugatha-c05" && slugSegment === "rugatha-plus"
          ? "./plus-c05/"
          : ch.id === "rugatha-c05" && slugSegment === "rugatha-lite"
            ? "./lite-c05/"
            : ch.url || `./${ch.id}/`;
      const fallbackTitle = ch.title || ch.label || ch.id;
      const displayTitle = isLevel4
        ? getLocalizedChapterTitle(ch.id, fallbackTitle)
        : getLocalizedArcTitle(ch.id, fallbackTitle);
      const title = document.createElement(ch.noLink ? "span" : "a");
      if (!ch.noLink) {
        title.href = resolvePath(arcHref);
        title.target = "_self";
      }
      title.textContent = displayTitle;
      meta.appendChild(title);

      const imageName = isLevel4 ? ch.image : chapterImageMap[ch.id];
      li.appendChild(meta);
      if (imageName) {
        const img = document.createElement("img");
        img.className = "chapter-list__image";
        const base = isLevel4 ? chapterBannerBase : imageBannerBase;
        const useSrc =
          typeof imageName === "string" && (imageName.startsWith("/") || imageName.startsWith("http"))
            ? resolvePath(imageName)
            : resolvePath(`${base}${imageName}`);
        if (useSrc.startsWith("https://firebasestorage.googleapis.com/")) img.crossOrigin = "anonymous";
        img.src = useSrc;
        img.alt = `${displayTitle} banner`;
        if (ch.noLink) {
          li.appendChild(img);
        } else {
          const imageLink = document.createElement("a");
          imageLink.href = resolvePath(arcHref);
          imageLink.target = "_self";
          imageLink.appendChild(img);
          li.appendChild(imageLink);
        }
      }
      chapterList.appendChild(li);
    });
  };

  const updateLanguageToggle = () => {
    if (!languageState.wrap) return;
    const buttons = languageState.wrap.querySelectorAll("button");
    buttons.forEach((button) => {
      button.dataset.lang = languageState.value;
      button.setAttribute("aria-pressed", "true");
      button.setAttribute("aria-label", languageState.value === "en" ? "目前語言：English" : "目前語言：中文");
      window.RugathaLanguageToggle?.setButtonIcon(button, languageState.value);
    });
  };

  const updateChapterContentLanguage = () => {
    const lang = languageState.value === "en" ? "en" : "zh";
    const articles = document.querySelectorAll(".campaign-detail:not(.arc-detail)");
    articles.forEach((article) => {
      const zhBlocks = article.querySelectorAll(":scope > .campaign-detail__content_zh");
      const enBlocks = article.querySelectorAll(":scope > .campaign-detail__content_en");
      zhBlocks.forEach((block) => {
        block.hidden = lang !== "zh";
      });
      enBlocks.forEach((block) => {
        block.hidden = lang !== "en";
      });
    });
  };

  const getNpcDisplayName = (meta) => {
    if (!meta) return "NPC";
    if (languageState.value === "en") {
      return meta.nameEn || meta.nameZh || meta.name || meta.id || "NPC";
    }
    return meta.nameZh || meta.nameEn || meta.name || meta.id || "NPC";
  };

  const normalizePcKey = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

  const isPcNpcRef = (value) => /^pc:/i.test(String(value || "").trim());
  const pcNameFromNpcRef = (value) => String(value || "").trim().replace(/^pc:/i, "").trim();

  const getPcDisplayName = (meta, fallbackId) => {
    if (languageState.value === "en") {
      return meta?.name_en || meta?.name_zh || fallbackId || "PC";
    }
    return meta?.name_zh || meta?.name_en || fallbackId || "PC";
  };

  const getPcMetaText = (meta) => {
    if (!meta) return "";
    const race = languageState.value === "en"
      ? meta.race_en || meta.race_zh || ""
      : meta.race_zh || meta.race_en || "";
    const role = languageState.value === "en"
      ? meta.class_en || meta.class_zh || ""
      : meta.class_zh || meta.class_en || "";
    if (race && role) return `${race}${i18n.pcMetaSeparator[languageState.value]}${role}`;
    return race || role || "";
  };

  const createPcSection = (title, ids, charById, siteBase, extraClassName) => {
    const section = document.createElement("section");
    section.className = `related-pcs${extraClassName ? ` ${extraClassName}` : ""}`;

    const heading = document.createElement("h2");
    heading.className = "related-pcs__title";
    heading.textContent = title;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "related-pcs__grid";
    section.appendChild(grid);

    const resolvePcImageCandidates = (value) => {
      if (!value) return [];
      const baseName = String(value).trim();
      if (!baseName) return [];
      return /^https?:\/\//.test(baseName) ? [baseName] : [];
    };

    ids.forEach((id) => {
      const meta = charById[normalizePcKey(id)] || null;
      const card = document.createElement("a");
      card.className = "related-pcs__card";
      card.href = new URL(`pc/articles/${slugify(id)}.html`, siteBase).href;
      card.target = "_self";

      const body = document.createElement("div");
      body.className = "related-pcs__body";
      card.appendChild(body);

      const textWrap = document.createElement("div");
      textWrap.className = "related-pcs__text";
      body.appendChild(textWrap);

      const name = document.createElement("div");
      name.className = "related-pcs__name";
      name.textContent = getPcDisplayName(meta, id);
      textWrap.appendChild(name);

      const detailText = getPcMetaText(meta);
      if (detailText) {
        const detail = document.createElement("div");
        detail.className = "related-pcs__meta";
        detail.textContent = detailText;
        textWrap.appendChild(detail);
      }

      const imageWrap = document.createElement("div");
      imageWrap.className = "related-pcs__portrait";
      body.appendChild(imageWrap);

      const imageCandidates = resolvePcImageCandidates(meta?.image || id);
      if (imageCandidates.length) {
        const imgEl = document.createElement("img");
        imgEl.className = "related-pcs__portrait-image";
        imgEl.alt = getPcDisplayName(meta, id);
        imgEl.loading = "lazy";
        imgEl.decoding = "async";
        imgEl.src = imageCandidates[0];
        let candidateIndex = 0;
        imgEl.addEventListener("error", () => {
          candidateIndex += 1;
          if (candidateIndex < imageCandidates.length) {
            imgEl.src = imageCandidates[candidateIndex];
            return;
          }
          imageWrap.classList.add("is-empty");
          imgEl.remove();
        });
        imageWrap.appendChild(imgEl);
      }

      grid.appendChild(card);
    });

    return section;
  };

  const renderRelatedPcSection = () => {
    const container = document.querySelector("#chapter-page") || document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    if (
      !container ||
      !Array.isArray(relatedPcState.pcIds) ||
      !relatedPcState.charById ||
      !relatedPcState.siteBase
    ) return;

    const existing = container.querySelector(".related-pcs--main");
    if (existing) existing.remove();

    const pcIds = relatedPcState.pcIds.filter(Boolean);
    if (!pcIds.length) return;

    const section = createPcSection(
      i18n.relatedPcTitle[languageState.value],
      pcIds,
      relatedPcState.charById,
      relatedPcState.siteBase,
      "related-pcs--main"
    );

    const guestSection = container.querySelector(".related-guests");
    const npcSection = container.querySelector(".related-npcs");
    const anchor = guestSection || npcSection || container.querySelector(".related-locations, .chapter-nav");
    if (anchor && anchor.parentNode === container) {
      container.insertBefore(section, anchor);
      return;
    }
    container.appendChild(section);
  };

  const renderRelatedGuestSection = () => {
    const container = document.querySelector("#chapter-page") || document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    if (
      !container ||
      !Array.isArray(relatedGuestState.pcIds) ||
      !relatedGuestState.charById ||
      !relatedGuestState.siteBase
    ) return;

    const existing = container.querySelector(".related-guests");
    if (existing) existing.remove();

    const guestIds = relatedGuestState.pcIds.filter(Boolean);
    if (!guestIds.length) return;

    const section = createPcSection(
      i18n.relatedGuestTitle[languageState.value],
      guestIds,
      relatedGuestState.charById,
      relatedGuestState.siteBase,
      "related-guests"
    );

    const npcSection = container.querySelector(".related-npcs, .related-locations, .chapter-nav");
    if (npcSection && npcSection.parentNode === container) {
      container.insertBefore(section, npcSection);
      return;
    }
    container.appendChild(section);
  };

  const renderRelatedNpcSection = () => {
    const container = document.querySelector("#chapter-page") || document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    if (!container || !Array.isArray(relatedNpcState.npcIds) || !relatedNpcState.charById || !relatedNpcState.siteBase) return;

    const existing = container.querySelector(".related-npcs");
    if (existing) existing.remove();

    const section = document.createElement("section");
    section.className = "related-npcs";

    const heading = document.createElement("h2");
    heading.className = "related-npcs__title";
    heading.textContent = i18n.relatedTitle[languageState.value];
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "related-npcs__grid";
    section.appendChild(grid);

    const npcBase = new URL("npc/", relatedNpcState.siteBase).href;
    const resolveNpcUrl = (value) => {
      if (!value) return null;
      if (/^(https?:)?\/\//i.test(value)) return value;
      if (value.startsWith("/")) return new URL(value, relatedNpcState.siteBase).href;
      if (value.startsWith("npc/")) return new URL(value, relatedNpcState.siteBase).href;
      return new URL(value, npcBase).href;
    };

    relatedNpcState.npcIds.forEach((id) => {
      const pcNpcName = isPcNpcRef(id) ? pcNameFromNpcRef(id) : "";
      const pcMeta = pcNpcName && relatedNpcState.pcCharById
        ? relatedNpcState.pcCharById[normalizePcKey(pcNpcName)]
        : null;
      const meta = pcNpcName
        ? { id, nameEn: pcMeta?.name_en || pcNpcName, nameZh: pcMeta?.name_zh || pcMeta?.name_en || pcNpcName, name: pcNpcName, url: null, image: null }
        : relatedNpcState.charById[id] || { id, nameEn: "", nameZh: "", name: id, url: null, image: null };
      const displayName = pcNpcName ? getPcDisplayName(pcMeta, pcNpcName) : getNpcDisplayName(meta);
      const npcUrl = pcNpcName
        ? new URL(`pc/articles/${slugify(pcNpcName)}.html`, relatedNpcState.siteBase).href
        : resolveNpcUrl(meta.url || "");
      const card = document.createElement(npcUrl ? "a" : "div");
      card.className = "related-npcs__card";
      if (npcUrl) {
        card.href = npcUrl;
        card.target = "_self";
      }

      if (pcNpcName) {
        const imageCandidates = pcMeta?.image ? [pcMeta.image] : [];
        const imgEl = document.createElement("img");
        imgEl.className = "related-npcs__image";
        imgEl.alt = displayName || "PC portrait";
        imgEl.loading = "lazy";
        imgEl.decoding = "async";
        imgEl.src = imageCandidates[0];
        let candidateIndex = 0;
        imgEl.addEventListener("error", () => {
          candidateIndex += 1;
          if (candidateIndex < imageCandidates.length) {
            imgEl.src = imageCandidates[candidateIndex];
            return;
          }
          imgEl.remove();
        });
        card.appendChild(imgEl);
      } else if (meta.image) {
        const imgEl = document.createElement("img");
        imgEl.className = "related-npcs__image";
        imgEl.crossOrigin = "anonymous";
        imgEl.loading = "lazy";
        imgEl.src = resolveNpcUrl(meta.imageThumb || meta.image);
        imgEl.alt = displayName || "NPC portrait";
        card.appendChild(imgEl);
      }

      const name = document.createElement("div");
      name.className = "related-npcs__name";
      name.textContent = displayName;
      card.appendChild(name);

      grid.appendChild(card);
    });

    container.insertBefore(section, container.querySelector(":scope > .related-locations, :scope > .chapter-nav"));
  };

  const renderRelatedLocationSection = () => {
    const container = document.querySelector("#chapter-page") || document.querySelector(".detail-canvas") || document.querySelector(".page") || document.body;
    container.querySelector(".related-locations")?.remove();
    if (!relatedLocations.length) return;
    const section = window.RugathaLocationCards.createLocationCards(relatedLocations, languageState.value);
    const nav = container.querySelector(".chapter-nav");
    container.appendChild(section);
    if (nav) container.appendChild(nav);
  };

  const loadRelatedLocations = async () => {
    // Standalone stories use the arc ID as their chapter-content ID.
    const chapterId = document.body.dataset.chapterContentId || currentChapterId ||
      (document.querySelector(".campaign-detail:not(.arc-detail)") ? currentArcId : null);
    if (!chapterId) return;
    const siteBase = new URL("../", campaignsBase);
    try {
      window.RugathaLocationCards = await import(new URL("shared/location-cards.js", siteBase).href);
      const response = await fetch(new URL("map/location/assets/location.json", siteBase), { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const matches = [];
      const visit = (node, depth = 0, segments = [], ancestors = []) => {
        if (node.draft === true) return;
        const hasChapter = (entry) => entry.chapters?.some((chapter) => chapter.id === chapterId);
        if (depth >= 3 && (hasChapter(node) || (depth === 3 && node.pois?.some(hasChapter)))) {
          matches.push({ node, depth, ancestors, image: node.image || data.image,
            href: new URL(`map/location/${segments.join("/")}/`, siteBase).href });
        }
        for (const child of node[["realms", "kingdoms", "cities", "pois"][depth]] || []) {
          visit(child, depth + 1, [...segments, child.slug], depth ? [...ancestors, node] : []);
        }
      };
      visit(data);
      relatedLocations = matches;
      renderRelatedLocationSection();
    } catch (error) {
      console.warn("Chapter locations unavailable:", error);
    }
  };

  const applyLanguage = (lang) => {
    const next = lang === "en" ? "en" : "zh";
    languageState.value = next;
    window.__RUGATHA_CHAPTER_LANG = next;
    document.documentElement.setAttribute("data-lang", next);
    updateLanguageToggle();
    updateChapterTitle();
    updateArcTitle();
    setText("tagline", getDisplayTagline(next));
    updateChapterArcTagline();
    updateStoryArcBadge();
    updateArcChaptersHeading();
    updateCampaignStoryArcsHeading();
    updateChapterContentLanguage();
    renderChapterList();
    renderRelatedPcSection();
    renderRelatedGuestSection();
    renderRelatedNpcSection();
    renderRelatedLocationSection();
    window.dispatchEvent(new CustomEvent("rugatha:chapter-language-change", { detail: { lang: next } }));
    try {
      localStorage.setItem("npc-lang", next);
    } catch (_) {
      // ignore storage access errors
    }
  };

  const ensureLanguageToggle = () => {
    if (document.querySelector("[data-chapter-language-toggle]")) return;
    const container = document.querySelector("#chapter-page") || document.querySelector(".detail-canvas") || document.querySelector(".page");
    if (!container) return;

    let bar = container.querySelector(".chapter-language-toggle-bar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "chapter-language-toggle-bar";

      const wrap = document.createElement("div");
      wrap.className = "language-toggle";
      wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-label", "Language");

      const makeButton = () => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.lang = languageState.value;
        button.dataset.langToggle = "";
        button.setAttribute("aria-pressed", "true");
        const icon = document.createElement("img");
        icon.className = "language-toggle__icon";
        icon.width = 44;
        icon.height = 44;
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        button.appendChild(icon);
        button.addEventListener("click", () => applyLanguage(button.dataset.lang === "en" ? "zh" : "en"));
        return button;
      };

      wrap.appendChild(makeButton());
      bar.appendChild(wrap);
      container.insertBefore(bar, container.firstChild);
    }

    languageState.wrap = bar.querySelector(".language-toggle");
    updateLanguageToggle();
  };

  const setText = (role, value) => {
    const el = document.querySelector(`[data-role='${role}']`);
    if (el && value) {
      el.textContent = value;
    }
  };

  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-soft", toRgba(accent, 0.18));

  setText("title", displayName);
  setText("tagline", displayTagline);
  setText("dates", displayDates);

  const normalizeUrl = (value, base) => {
    if (!value) return null;
    try {
      return new URL(value, base || window.location.href).href;
    } catch (err) {
      return value;
    }
  };

  const img = document.querySelector("[data-role='campaign-image']");
  const heroImage = (target && target.image) || (targetCampaign && targetCampaign.image);
  if (img && heroImage) {
    img.src = heroImage;
    img.alt = `${displayName} campaign art`;
  }

  const renderRelatedNpcs = async () => {
    console.log("[NPC] init related NPC render");
    if (!isChapterPage && !arcSegment && !slugSegment) return;
    const chapterId = isChapterPage && arcSegment ? `${arcSegment}-${lastSegment.replace(/\.html?$/i, "").toLowerCase()}` : null;
    const npcKeyCandidates = [];
    if (chapterId) npcKeyCandidates.push(chapterId);
    if (arcSegment) npcKeyCandidates.push(arcSegment);
    if (slugSegment) npcKeyCandidates.push(slugSegment);
    const campaignsPagesBase = campaignsBase ? new URL("pages/", campaignsBase).href : null;
    const npcsUrl = campaignsPagesBase
      ? new URL("npcs.json", campaignsPagesBase).href
      : new URL("../../npcs.json", window.location.href).href;
    console.debug("[NPC] npcKeyCandidates", npcKeyCandidates, "npcsUrl", npcsUrl);
    let mapping;
    try {
      const res = await fetch(npcsUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mapping = data && data.npcs ? data.npcs : {};
    } catch (err) {
      console.error("Related NPC map unavailable:", err && err.message ? err.message : err);
      return;
    }

    const npcKey = npcKeyCandidates.find((key) => Object.prototype.hasOwnProperty.call(mapping, key));
    const npcIds = npcKey ? mapping[npcKey] : null;
    if (!Array.isArray(npcIds) || !npcIds.length) {
      console.debug("[NPC] no npcIds for keys", npcKeyCandidates);
      return;
    }

    const npcDataPath =
      (window.RUGATHA_CONFIG &&
        window.RUGATHA_CONFIG.dataFiles &&
        window.RUGATHA_CONFIG.dataFiles.npcCharacters) ||
      "/npc/data/characters.json";
    const siteBase = campaignsBase ? new URL("../", campaignsBase).href : window.location.href;
    const npcDataUrl = npcDataPath.startsWith("http")
      ? npcDataPath
      : new URL(npcDataPath, siteBase).href;
    console.debug("[NPC] npcDataUrl", npcDataUrl);
    let characters = [];
    try {
      const res = await fetch(npcDataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      characters = Array.isArray(json) ? json : [];
    } catch (err) {
      console.error("NPC data unavailable:", err && err.message ? err.message : err);
      return;
    }

    const charById = characters.reduce((acc, ch) => {
      if (ch && ch.id) acc[ch.id] = ch;
      return acc;
    }, {});

    const needsPcData = npcIds.some((id) => isPcNpcRef(id));
    let pcCharById = null;
    if (needsPcData) {
      const pcDataUrl = new URL("pc/pc_lib", siteBase).href;
      try {
        const res = await fetch(pcDataUrl, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        pcCharById = (Array.isArray(data) ? data : []).reduce((acc, entry) => {
          const key = normalizePcKey(entry && entry.name_en);
          if (key) acc[key] = entry;
          return acc;
        }, {});
      } catch (err) {
        console.error("PC data unavailable for NPC section:", err && err.message ? err.message : err);
      }
    }

    console.log("[NPC] rendering cards for", npcKey, npcIds.length, "NPCs");

    relatedNpcState.npcIds = npcIds;
    relatedNpcState.charById = charById;
    relatedNpcState.pcCharById = pcCharById;
    relatedNpcState.siteBase = siteBase;
    renderRelatedNpcSection();
  };

  const renderRelatedPcs = async () => {
    const chapterId = document.body.dataset.chapterContentId || currentChapterId;
    if (!chapterId) return;
    const campaignsPagesBase = campaignsBase
      ? new URL("pages/", campaignsBase).href
      : new URL("../../npcs.json", window.location.href).href;
    const pcsUrl = new URL("pcs.json", campaignsPagesBase).href;

    let mapping;
    try {
      const res = await fetch(pcsUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mapping = data && data.pcs ? data.pcs : {};
    } catch (err) {
      console.error("Related PC map unavailable:", err && err.message ? err.message : err);
      return;
    }

    const pcIds = Array.isArray(mapping[chapterId]) ? mapping[chapterId] : null;
    if (!pcIds || !pcIds.length) return;

    const siteBase = campaignsBase ? new URL("../", campaignsBase).href : window.location.href;
    const pcDataUrl = new URL("pc/pc_lib", siteBase).href;

    // Show the known party immediately; metadata only enriches their cards.
    relatedPcState.pcIds = pcIds;
    relatedPcState.charById = {};
    relatedPcState.siteBase = siteBase;
    renderRelatedPcSection();

    let charById;
    try {
      const res = await fetch(pcDataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      charById = (Array.isArray(data) ? data : []).reduce((acc, entry) => {
        const key = normalizePcKey(entry && entry.name_en);
        if (key) acc[key] = entry;
        return acc;
      }, {});
    } catch (err) {
      console.error("PC data unavailable:", err && err.message ? err.message : err);
      return;
    }

    relatedPcState.pcIds = pcIds;
    relatedPcState.charById = charById;
    relatedPcState.siteBase = siteBase;
    renderRelatedPcSection();
  };

  const renderRelatedGuests = async () => {
    if (!isChapterPage || !arcSegment) return;
    const chapterId = `${arcSegment}-${lastSegment.replace(/\.html?$/i, "").toLowerCase()}`;
    const campaignsPagesBase = campaignsBase
      ? new URL("pages/", campaignsBase).href
      : new URL("../../guest.json", window.location.href).href;
    const guestUrl = new URL("guest.json", campaignsPagesBase).href;

    let mapping;
    try {
      const res = await fetch(guestUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      mapping = data && data.guest ? data.guest : {};
    } catch (err) {
      console.error("Related guest map unavailable:", err && err.message ? err.message : err);
      return;
    }

    const guestIds = Array.isArray(mapping[chapterId]) ? mapping[chapterId] : null;
    if (!guestIds || !guestIds.length) return;

    const siteBase = campaignsBase ? new URL("../", campaignsBase).href : window.location.href;
    const pcDataUrl = new URL("pc/pc_lib", siteBase).href;

    let charById;
    try {
      const res = await fetch(pcDataUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      charById = (Array.isArray(data) ? data : []).reduce((acc, entry) => {
        const key = normalizePcKey(entry && entry.name_en);
        if (key) acc[key] = entry;
        return acc;
      }, {});
    } catch (err) {
      console.error("Guest PC data unavailable:", err && err.message ? err.message : err);
      return;
    }

    relatedGuestState.pcIds = guestIds;
    relatedGuestState.charById = charById;
    relatedGuestState.siteBase = siteBase;
    renderRelatedGuestSection();
  };

  const findCampaignNode = (slug) =>
    graphData.find((node) => node.level === 2 && slugify(node.label || "") === slug);

  const campaignNode = findCampaignNode(slugParam);
  const chapters = isArcPage && targetArc
    ? graphData.filter((node) => node.level === 4 && node.parent === targetArc.id)
    : campaignNode
      ? graphData.filter((node) => {
          const matchesParent = node.parent === campaignNode.id;
          const matchesExtra = Array.isArray(node.extraParents) && node.extraParents.includes(campaignNode.id);
          return node.level === 3 && (matchesParent || matchesExtra);
        })
      : [];
  const chaptersMissingImages = chapters
    .filter((ch) => (ch.level === 4 ? !ch.image : !chapterImageMap[ch.id]))
    .map((ch) => ch.label || ch.id);
  if (chaptersMissingImages.length) {
    console.warn("No banner match for:", chaptersMissingImages.join(", "));
  }

  chapterListState.chapters = chapters;
  renderChapterList();

  const setupHeroDrift = () => {
    const root = document.documentElement;
    let ticking = false;
    const maxDrift = 48;
    const update = () => {
      const drift = Math.min(maxDrift, window.scrollY * 0.08);
      root.style.setProperty("--hero-drift", `${drift}px`);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
  };

  document.title = `${displayName} | Rugatha Campaign`;
  languageState.value = getPreferredLanguage();
  window.__RUGATHA_CHAPTER_LANG = languageState.value;
  document.documentElement.setAttribute("data-lang", languageState.value);
  setText("tagline", getDisplayTagline(languageState.value));
  ensureLanguageToggle();
  updateChapterContentLanguage();
  setupHeroDrift();
  updateStoryArcBadge();
  updateArcChaptersHeading();
  updateCampaignStoryArcsHeading();
  window.addEventListener("rugatha:chapter-language-change", event => {
    if (!document.querySelector("[data-chapter-language-toggle]")) return;
    languageState.value = event.detail.lang;
    updateChapterTitle();
    updateChapterArcTagline();
    updateStoryArcBadge();
    renderRelatedPcSection();
    renderRelatedGuestSection();
    renderRelatedNpcSection();
    renderRelatedLocationSection();
  });
  renderRelatedPcs();
  renderRelatedGuests();
  renderRelatedNpcs();
  loadRelatedLocations();
  loadChapterTitleMap().then((map) => {
    chapterTitleState.map = map;
    updateChapterTitle();
    renderChapterList();
  });
  loadStoryArcTitleMap().then((map) => {
    arcTitleState.map = map;
    updateArcTitle();
    updateChapterArcTagline();
    renderChapterList();
  });

})();
