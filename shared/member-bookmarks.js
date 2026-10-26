// Bookmark records keep the original document title; cards show the page title.
export const bookmarkDisplayTitle = (title, path = '') => {
  const original = String(title || '').trim();
  let display = original.split(/\s*[|｜]\s*/)[0].trim();
  if (/^\/?campaigns\/pages\/.+\/chpt\d+\.html$/i.test(path)) {
    display = display.replace(/^(?:第\s*[零〇一二三四五六七八九十百千兩\d]+\s*章|chapter\s+(?:\d+|[ivxlcdm]+))\s*[:：.．、–—-]?\s*/i, '').trim();
  }
  return display || original || String(path);
};
