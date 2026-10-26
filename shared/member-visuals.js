const siteRoot = new URL('../', import.meta.url);
export const MEMBER_FALLBACK_IMAGE = new URL('assets/logo/rugatha-icon.png', siteRoot).href;
const visualCache = new Map();

export const selectPageVisual = (page, pageUrl) => {
  const selectors = ['#npc-portrait[src]', '.location-hero__image img[src]', '.deity-portrait[src]', '.chapter-hero img[src]', '.hero img[src]', 'meta[property="og:image"]', 'main img[src]'];
  for (const selector of selectors) {
    const node = page.querySelector(selector);
    const value = node?.getAttribute('src') || node?.getAttribute('content');
    if (!value) continue;
    const image = new URL(value, pageUrl);
    if (!['https:', 'http:'].includes(image.protocol)) continue;
    if (/\/assets\/(banner|logo)\//.test(image.pathname)) continue;
    return image.href;
  }
  return MEMBER_FALLBACK_IMAGE;
};

export const getBookmarkVisual = (pageUrl) => {
  const url = new URL(pageUrl, siteRoot);
  if (url.origin !== siteRoot.origin) return Promise.resolve(MEMBER_FALLBACK_IMAGE);
  if (!visualCache.has(url.href)) {
    visualCache.set(url.href, (async () => {
      // The map landing page's main visual is the map itself.
      if (/\/map\/(index\.html)?$/.test(url.pathname)) return new URL('map/assets/dranison-map.jpg', siteRoot).href;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to load saved-page visual');
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      return selectPageVisual(page, url);
    })().catch(() => MEMBER_FALLBACK_IMAGE));
  }
  return visualCache.get(url.href);
};
