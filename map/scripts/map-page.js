const messages = {
  zh: {
    skip: '跳至主要內容', home: '前往 Rugatha 首頁', homeLabel: '首頁', navigation: '主選單',
    breadcrumbs: '麵包屑', title: '卓尼森島地圖', atlas: '地點圖鑑', eyebrow: 'Rugatha 世界',
    description: '拖曳與縮放地圖，點選標記查看地名，或前往地點圖鑑探索各個時空。',
    explore: '探索時空與地點 →', mapHeading: '探索卓尼森島', mapHint: '拖曳移動 · 滾輪或按鈕縮放',
    mapLabel: '卓尼森島互動地圖', returnNavigation: '返回導覽', atlasLink: '↩︎ 前往地點圖鑑', homeLink: '↩︎ 返回首頁',
    reset: '重設地圖視角', zoomIn: '放大地圖', zoomOut: '縮小地圖',
    portalTitle: '地圖與地點', portalDescription: '從島嶼地圖認識世界的輪廓，或走進各個時空，探索城鎮、地點與故事。',
    chooseView: '探索方式', mapCardType: '互動地圖', atlasCardType: '地點與故事',
    mapCardDescription: '查看卓尼森島的地理位置，拖曳、縮放並點選地圖上的標記。',
    atlasCardDescription: '依時空、國家與城鎮探索各地資訊、場景圖片及相關章節。',
    mapCardLink: '開啟地圖 →', atlasCardLink: '探索各地 →',
  },
  en: {
    skip: 'Skip to content', home: 'Go to Rugatha home', homeLabel: 'Home', navigation: 'Main navigation',
    breadcrumbs: 'Breadcrumbs', title: 'Dranison Map', atlas: 'Location Atlas', eyebrow: 'The world of Rugatha',
    description: 'Pan and zoom the map, select a marker to see a place name, or explore the realms in the Location Atlas.',
    explore: 'Explore realms and locations →', mapHeading: 'Explore Dranison', mapHint: 'Drag to pan · Scroll or use the buttons to zoom',
    mapLabel: 'Interactive Dranison map', returnNavigation: 'Return navigation', atlasLink: '↩︎ Visit Location Atlas', homeLink: '↩︎ Back to home',
    reset: 'Reset map view', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    portalTitle: 'Maps & Places', portalDescription: 'Discover the shape of the world on the island map, or explore realms, cities, places and their stories.',
    chooseView: 'Ways to explore', mapCardType: 'Interactive map', atlasCardType: 'Places & stories',
    mapCardDescription: 'Explore the geography of Dranison. Pan, zoom and select markers on the map.',
    atlasCardDescription: 'Browse realms, kingdoms and cities for local information, artwork and related chapters.',
    mapCardLink: 'Open the map →', atlasCardLink: 'Explore places →',
  },
};
let language = 'zh';
try { language = localStorage.getItem('npc-lang') === 'en' ? 'en' : 'zh'; } catch {}
function updateLanguage() {
  const copy = messages[language];
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-Hant';
  const portal = document.body.dataset.mapView === 'portal';
  document.title = `${portal ? copy.portalTitle : copy.title} | Rugatha`;
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = copy[element.dataset.i18n]; });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => { element.setAttribute('aria-label', copy[element.dataset.i18nAria]); });
  for (const [selector, value] of [
    ['meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]', portal ? copy.portalDescription : copy.description],
    ['meta[property="og:title"], meta[name="twitter:title"]', document.title],
    ['meta[property="og:locale"]', language === 'en' ? 'en_US' : 'zh_TW'],
    ['meta[property="og:locale:alternate"]', language === 'en' ? 'zh_TW' : 'en_US'],
  ]) document.querySelectorAll(selector).forEach(meta => { meta.content = value; });
  const button = document.querySelector('[data-lang-toggle]');
  button.dataset.lang = language;
  button.setAttribute('aria-label', language === 'en' ? 'Current language: English, switch to 中文' : '目前語言：中文，切換為 English');
  window.RugathaLanguageToggle?.setButtonIcon(button, language);
  for (const [selector, key] of [['.leaflet-control-home', 'reset'], ['.leaflet-control-zoom-in', 'zoomIn'], ['.leaflet-control-zoom-out', 'zoomOut']]) {
    const control = document.querySelector(selector);
    if (control) { control.title = copy[key]; control.setAttribute('aria-label', copy[key]); }
  }
}
document.querySelector('[data-lang-toggle]').addEventListener('click', () => {
  language = language === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('npc-lang', language); } catch {}
  updateLanguage();
});
updateLanguage();

const mapElement = document.getElementById('leaflet-map');
if (mapElement) {
const map = L.map(mapElement, {
  crs: L.CRS.Simple,
  minZoom: -5,
  maxZoom: 2,
  zoomSnap: 0.25
});

const pinSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="4.5" fill="#7bdcb5" stroke="#183126" stroke-width="2"/>
  </svg>
`);
const pinIcon = L.icon({
  iconUrl: `data:image/svg+xml,${pinSvg}`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -8]
});

const mapImageUrl = '/map/assets/dranison-map.jpg';
const image = new Image();
image.onload = () => {
  const bounds = [[0, 0], [image.naturalHeight, image.naturalWidth]];
  const setMapSize = () => {
    const width = mapElement.getBoundingClientRect().width;
    const height = Math.round(width * (image.naturalHeight / image.naturalWidth));
    mapElement.style.height = `${height}px`;
    map.invalidateSize({ pan: false });
    // Recalculate the fitted minimum after a resize, including narrow phones.
    map.setMinZoom(-5);
    map.fitBounds(bounds, { padding: [0, 0], animate: false });
    map.setMinZoom(map.getZoom());
  };
  setMapSize();
  window.addEventListener('resize', setMapSize);
  L.imageOverlay(mapImageUrl, bounds).addTo(map);
  map.setMaxBounds(bounds);

  const HomeControl = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd() {
      const container = L.DomUtil.create('div', 'leaflet-bar');
      const button = L.DomUtil.create('a', 'leaflet-control-home', container);
      button.href = '#';
        button.title = messages[language].reset;
        button.setAttribute('aria-label', messages[language].reset);
      button.textContent = '⌂';
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, 'click', (event) => {
        L.DomEvent.preventDefault(event);
        map.fitBounds(bounds, { padding: [0, 0] });
      });
      return container;
    }
  });
  map.addControl(new HomeControl());
  updateLanguage();

  fetch('/map/assets/locations.json')
    .then((response) => response.json())
    .then((locations) => {
      locations.forEach((location) => {
        let x = location.x;
        let y = location.y;
        if (x <= 1 && y <= 1) {
          x = x * image.naturalWidth;
          y = y * image.naturalHeight;
        } else if (x <= 100 && y <= 100) {
          x = (x / 100) * image.naturalWidth;
          y = (y / 100) * image.naturalHeight;
        }

        const marker = L.marker([y, x], { title: location.name, icon: pinIcon });
        const label = document.createElement('strong');
        label.textContent = location.name;
        marker.bindPopup(label);
        marker.addTo(map);
      });
    })
    .catch((error) => {
      console.warn('Unable to load map locations.', error);
    });
};
image.src = mapImageUrl;
}
