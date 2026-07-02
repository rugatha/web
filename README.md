# Rugatha Web

Rugatha Web 是 Rugatha 世界觀與跑團內容的靜態網站。網站以原生 `HTML / CSS / JavaScript` 製作，集中整理首頁、團錄、角色資料、世界時間線、地圖、神祇、帝王、咒語、關係圖、角色卡工具與會員登入相關頁面。

正式網域：

- `https://rugatha.com`

## 專案概覽

這個 repo 主要負責四件事：

- 世界觀資料展示
- 團務與章節內容整理
- PC / NPC / 神祇 / 帝王等角色索引
- 社群工具、登入與互動頁面

目前包含的主要頁面與功能：

1. 網站首頁與主要導覽。
2. Campaigns 團務入口、活動分類、章節頁與故事弧頁。
3. 團錄章節頁，支援中英雙語內容、章節導覽、相關 PC / Guest / NPC 顯示。
4. NPC 資料庫與個別 NPC 頁面，支援搜尋、分類、排序、隨機探索與「命運的抉擇」內容。
5. PC 列表、角色文章、圖片、三視圖與角色資料展示。
6. 世界時間線。
7. 德拉尼森地圖與地點資料。
8. 神祇、帝王、角色總覽、關係圖等世界觀頁面。
9. 角色卡產生器、咒語查詢、體驗 / 回饋頁、關於我們頁。
10. 會員 / 登入相關前端流程，使用 Firebase 整合。
11. PWA manifest 與 service worker。

## 技術與部署

本專案是靜態網站，沒有傳統後端與固定 build step。大部分頁面直接由瀏覽器載入 HTML、CSS、JS、JSON、CSV 與圖片資源。

- 前端：原生 HTML / CSS / JavaScript
- 資料：JSON、JS、CSV 與靜態資源
- 登入：Firebase 前端整合
- PWA：`manifest.webmanifest`、`sw.js`、`shared/pwa.js`
- 部署：GitHub Pages
- 自訂網域：`CNAME`

GitHub Pages workflow 位於：

- `.github/workflows/pages.yml`

部署流程：

1. `main` 分支有更新時自動觸發。
2. GitHub Actions 直接把 repo 根目錄作為 Pages artifact 上傳。
3. 不需額外安裝依賴或執行 build 指令。

## 目錄結構

- `index.html`
  網站首頁。

- `assets/`
  全站共用圖片、icon、PWA icon 與首頁視覺素材。

- `styles/`
  首頁與全站層級樣式。

- `shared/`
  全站共用設定、登入、PWA、字典與維護規則。

- `campaigns/`
  團務入口、章節頁、故事弧頁、團錄資料、banner、logo、章節導覽與相關腳本。

- `npc/`
  NPC 資料庫、NPC 主資料、NPC 圖片與個別 NPC 頁面。

- `pc/`
  PC 首頁、角色文章、圖片、三視圖、玩家提供圖片與角色資料來源。

- `characters/`、`character_main_page/`
  角色總覽與相關入口頁。

- `character_card/`
  角色卡產生器工具。

- `timeline/`
  世界時間線頁面、事件資料與渲染腳本。

- `map/`
  地圖頁、地圖圖片與地點資料。

- `deities/`
  神祇列表、神祇資料、個別神祇頁、banner 與腳本。

- `emperors/`
  帝王 / 歷史人物相關頁面、圖片與腳本。

- `relation-graph/`
  角色關係圖頁面、樣式與互動腳本。

- `spells/`
  咒語查詢頁與 `spells-phb.json` 資料。

- `experience/`
  體驗 / 回饋展示頁與公開留言 CSV。

- `about-us/`
  關於我們頁與社群 / 聯絡素材。

- `member/`
  會員頁與成就 CSV。

- `src/`
  Firebase 初始化相關模組。

## 核心資料檔

內容更新時，最常需要同步檢查這些檔案：

1. `shared/rugatha.config.js`
   Campaign 清單、故事弧圖譜、章節節點、URL override、章節圖片對應與全站共用設定。

2. `campaigns/data/campaigns.js`
   Campaign 頁面的活動資料。

3. `campaigns/data/chapter-nav.json`
   章節上一章 / 下一章導覽。

4. `campaigns/data/chapter-titles.json`
   章節中英文標題。

5. `campaigns/data/story-arc-titles.json`
   故事弧中英文標題。

6. `campaigns/pages/pcs.json`
   章節出現的 PC。

7. `campaigns/pages/guest.json`
   章節出現的 Guest。

8. `campaigns/pages/npcs.json`
   章節出現的 NPC。

9. `npc/data/characters.json`
   NPC 主資料來源，包含名稱、介紹、關聯、地點、圖片與「命運的抉擇」。

10. `pc/pc_lib`
    PC 資料來源。

11. `timeline/data/events.js`
    世界時間線事件資料。

12. `deities/data/deities.json`
    神祇資料來源。

13. `map/assets/locations.json`
    地圖地點資料。

14. `member/achievements.csv`
    會員成就資料。

15. `experience/exp_public_comment.csv`
    體驗頁公開留言資料。

## 本機預覽

請使用本機 HTTP server 預覽，不建議直接用 `file://` 開啟，因為部分頁面會透過 `fetch` 載入資料。

在專案根目錄執行：

```bash
python3 -m http.server 8000
```

開啟：

```text
http://localhost:8000
```

常用入口：

```text
http://localhost:8000/campaigns/
http://localhost:8000/npc/
http://localhost:8000/pc/
http://localhost:8000/timeline/
http://localhost:8000/relation-graph/
http://localhost:8000/spells/
```

其他可用的靜態 server：

```bash
npx serve .
```

```bash
npx http-server .
```

注意事項：

1. 登入功能依賴 Firebase 設定；本機環境若缺少設定或授權網域，登入可能無法完整測試。
2. Service worker 可能快取舊檔，測試 PWA 或靜態資源時可在瀏覽器 DevTools 清除 site data。
3. 本專案沒有固定 build step，修改後主要透過瀏覽器與資料格式檢查驗證。

## 全站 HTML 正規化

專案提供批次整理腳本，用來統一全站 HTML 的：

- `meta description`
- canonical URL
- Open Graph / Twitter meta
- 正式網域 `https://rugatha.com`
- 常見模板殘留，例如多餘的 `</link>`

執行方式：

```bash
python3 shared/scripts/normalize_site_html.py
```

建議在以下情況執行：

1. 新增或大量修改 HTML 頁面後。
2. 批次產生 campaign / NPC / deity 內容頁後。
3. 調整正式網域、分享圖或 SEO 文案規則後。

## 更新流程

每次更新前，先判斷改動類型：

1. 團錄 / 章節內容更新。
2. NPC 更新。
3. 新增章節或新增故事弧。
4. 新增或修改 PC、神祇、帝王、地圖、咒語、時間線資料。
5. 純文案、樣式或資源修正。

基本順序：

1. 先修改實際頁面內容。
2. 再補資料檔與連動設定。
3. 最後檢查圖片、導覽、雙語內容、角色對照與連結是否一致。

完整內容更新規則請參考：

- [shared/update_rules.md](shared/update_rules.md)

## 團錄與章節更新

若更新的是團錄或章節頁，通常要檢查：

1. 頁面位置是否正確：
   - `campaigns/pages/**/chpt*.html`
   - 少數單章節故事可能是 `campaigns/pages/**/index.html`

2. 中英雙語是否完整：
   - `.campaign-detail__content_zh`
   - `.campaign-detail__content_en`

3. 是否需要同步更新：
   - `campaigns/data/chapter-nav.json`
   - `campaigns/data/chapter-titles.json`
   - `campaigns/data/story-arc-titles.json`
   - `campaigns/pages/pcs.json`
   - `campaigns/pages/guest.json`
   - `campaigns/pages/npcs.json`
   - `timeline/data/events.js`

4. 若章節圖有新增或替換，請同步檢查：
   - `campaigns/chapter-banners/`
   - `campaigns/campaign-banners/`
   - `campaigns/campaign-logos/`
   - `shared/rugatha.config.js`

## NPC 更新

若更新的是 NPC，通常要檢查：

1. 主資料是否已更新：
   - `npc/data/characters.json`

2. 個別 NPC 頁面是否已建立或同步修改：
   - `npc/npc_page/pages/*.html`

3. 若該 NPC 已在團錄中登場，是否同步更新：
   - `campaigns/pages/npcs.json`

4. 若有新增「命運的抉擇」，是否補上：
   - `qaZh`
   - `qaEn`

5. 圖片路徑是否對應到：
   - `npc/individual_pics/`

## 其他資料更新

- 更新 PC 時，檢查 `pc/pc_lib`、`pc/articles/`、`pc/pics/`、`pc/three_views/` 與章節 PC 對照。
- 更新時間線時，檢查 `timeline/data/events.js` 的時間排序、中英標題與描述。
- 更新地圖時，檢查 `map/assets/locations.json` 與地圖圖片座標是否一致。
- 更新神祇時，檢查 `deities/data/deities.json`、`deities/pages/` 與 `deities/Banners/`。
- 更新咒語時，檢查 `spells/spells-phb.json` 格式是否可被頁面讀取。
- 更新會員成就時，檢查 `member/achievements.csv` 欄位格式。

## 驗證建議

修改後至少做以下檢查：

1. 用本機 HTTP server 開啟受影響頁面。
2. 確認瀏覽器 console 沒有路徑、JSON parse、module 或 Firebase 初始化錯誤。
3. 確認圖片、CSS、JS、JSON、CSV 都能正常載入。
4. 確認中英文內容一致，沒有只改其中一個語言版本。
5. 若有新增 HTML 或批次修改 HTML，執行正規化腳本。
6. 若有改 JSON / JS / CSV 資料，確認格式合法，避免多餘逗號、缺漏括號或欄位錯位。

## 維護原則

這個專案最重要的維護觀念是：資料一致性比單頁修改更重要。

當你更新：

- 一篇團錄
- 一個 NPC
- 一位 PC
- 一個故事弧
- 一張章節圖
- 一個世界觀事件

都應該同時檢查它對以下資料的影響：

- 導覽
- 標題
- 角色對照
- 全站設定
- 時間線
- 圖片資源
- SEO / share metadata

只改頁面而不補資料檔，通常就是最常見的錯誤來源。
