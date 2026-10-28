export function embeddedBrowser(userAgent = '') {
  if (/\bLine\b/i.test(userAgent)) return 'line';
  if (/Threads|Barcelona/i.test(userAgent)) return 'threads';
  if (/(FBAN|FBAV|Instagram|TikTok|Twitter|WeChat|QQ|Weibo|WebView|; wv\))/i.test(userAgent)) return 'other';
  return null;
}

export function externalBrowserUrl(location) {
  const url = new URL(`${location.pathname || '/'}${location.search || ''}${location.hash || ''}`, 'https://rugatha.com');
  url.searchParams.delete('openExternalBrowser');
  return url;
}

export function lineExternalBrowserUrl(location) {
  const url = externalBrowserUrl(location);
  url.searchParams.set('openExternalBrowser', '1');
  return url;
}
