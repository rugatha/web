import { createLocationRenderer } from './location-render.js?v=20261025-site-update-1';

// Recover from transient remote-image failures rather than leaving a broken
// image until the reader reloads the entire page.
function retryLocationArt(image) {
  if (!(image instanceof HTMLImageElement) || !image.matches('[data-location-art]')) return;
  const source = image.src;
  const url = new URL(source, window.location.href);
  if (url.hostname !== 'firebasestorage.googleapis.com') return;
  const attempt = Number(image.dataset.artRetry || 0) + 1;
  if (attempt > 2) return;
  image.dataset.artRetry = String(attempt);
  setTimeout(() => {
    if (!image.isConnected || image.src !== source) return;
    url.searchParams.set('rugatha_retry', String(attempt));
    image.src = url.href;
  }, attempt * 1000);
}
document.addEventListener('error', event => retryLocationArt(event.target), true);
document.querySelectorAll('img[data-location-art]').forEach(image => {
  if (image.complete && !image.naturalWidth) retryLocationArt(image);
});

// Read the latest content on every visit, just like NPC and deity pages.
const base = '/map/location/';
const route = window.location.pathname.replace(/index\.html$/, '');
const segments = route.slice(base.length).split('/').filter(Boolean);
let loading = false;
let previousHtml = '';
let data = null;
let chapterCatalog = {};
let language = 'zh';
try { language = localStorage.getItem('npc-lang') === 'en' ? 'en' : 'zh'; }
catch { /* Use Chinese when browser storage is unavailable. */ }

function renderCurrent() {
  if (!data) return;
  const { render, children, url } = createLocationRenderer(data, language, chapterCatalog);
  let node = data;
  const ancestors = [];
  for (const [depth, slug] of segments.entries()) {
    ancestors.push({ node, href: url(segments.slice(0, depth)) });
    node = children(node, depth).find(child => child.slug === slug);
    if (!node) throw new Error(`Unknown location: ${route}`);
  }
  const html = render(node, segments.length, segments, ancestors);
  if (html === previousHtml) return;
  const updated = new DOMParser().parseFromString(html, 'text/html');
  const main = document.getElementById('main');
  const expanded = new Map([...main.querySelectorAll('details[data-chapter-group]')].map(details => [details.dataset.chapterGroup, details.open]));
  main.replaceChildren(...updated.getElementById('main').childNodes);
  main.querySelectorAll('details[data-chapter-group]').forEach(details => {
    if (expanded.has(details.dataset.chapterGroup)) details.open = expanded.get(details.dataset.chapterGroup);
  });
  document.documentElement.lang = updated.documentElement.lang;
  document.title = updated.title;
  for (const selector of ['.atlas-navigation', '.atlas-footer', '.skip-link', '.banner-link']) {
    const current = document.querySelector(selector);
    const next = updated.querySelector(selector);
    current.replaceChildren(...next.childNodes);
    if (next.hasAttribute('aria-label')) current.setAttribute('aria-label', next.getAttribute('aria-label'));
  }
  const button = document.querySelector('[data-lang-toggle]');
  const nextButton = updated.querySelector('[data-lang-toggle]');
  button.dataset.lang = language;
  button.setAttribute('aria-label', nextButton.getAttribute('aria-label'));
  window.RugathaLanguageToggle?.setButtonIcon(button, language);
  for (const selector of ['meta[name="description"]', 'meta[property^="og:"]']) {
    for (const meta of updated.querySelectorAll(selector)) {
      const key = meta.hasAttribute('property') ? 'property' : 'name';
      document.querySelector(`meta[${key}="${meta.getAttribute(key)}"]`)
        ?.setAttribute('content', meta.content);
    }
  }
  previousHtml = html;
}

async function refresh() {
  if (loading || document.hidden || !route.startsWith(base)) return;
  loading = true;
  try {
    const [response, catalogResponse] = await Promise.all([
      fetch('/map/location/assets/location.json', { cache: 'no-store' }),
      fetch('/map/location/assets/chapter-catalog.json', { cache: 'no-store' }),
    ]);
    if (!response.ok || !catalogResponse.ok) throw new Error(`Unable to load locations or chapters (${response.status}, ${catalogResponse.status})`);
    [data, chapterCatalog] = await Promise.all([response.json(), catalogResponse.json()]);
    renderCurrent();
  } catch (error) {
    // Retain the generated content when the data source is unavailable.
    console.warn('Unable to refresh location content', error);
  } finally {
    loading = false;
  }
}

document.querySelector('[data-lang-toggle]').addEventListener('click', () => {
  language = language === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('npc-lang', language); }
  catch { /* Switching languages also works without browser storage. */ }
  renderCurrent();
});
refresh();
// Preserve the existing automatic refresh while descriptions and art are reviewed.
setInterval(refresh, 15000);
document.addEventListener('visibilitychange', refresh);
