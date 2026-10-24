# 地圖與地點

- `/map/`：探索總覽，以兩張卡片分流至互動地圖與地點圖鑑，不顯示標籤導覽。
- `/map/map/`：卓尼森島互動地圖，保留 Leaflet 標記、拖曳、縮放與重設視角。
- `/map/location/`：各時空、國家、城鎮與地點資訊，內容來源及產生方式見 `location/README.md`。

互動地圖與地點圖鑑只顯示「卓尼森島地圖、地點圖鑑」兩個標籤。三個畫面共用 `styles/locations.css` 的版寬、字體、頁首、麵包屑與卡片樣式；`styles/map.css` 僅補充地圖控制與入口雙卡片排版。

入口及互動地圖由 `scripts/map-page.js` 處理語言與地圖互動，沿用地點圖鑑的 `npc-lang` 語言偏好。`assets/locations.json` 是地圖標記座標；`location/assets/location.json` 是地點圖鑑正式資料，兩者用途不同。

地圖靜態檔位於 `assets/dranison-map.jpg`，各地點場景圖使用 Firebase Storage。所有導覽直接指向正式路徑，不使用轉址頁。
