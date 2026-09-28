# Rugatha Web

Rugatha Web 是 Rugatha 世界觀、團錄與社群工具的官方網站。前端以原生 `HTML / CSS / JavaScript` 製作並由 GitHub Pages 提供；會員登入、個人資料、收藏、QA、角色卡與圖片儲存則整合 Firebase Authentication、Cloud Firestore 與 Cloud Storage。

正式網域：

- `https://rugatha.com`

## 專案概覽

這個 repository 主要負責：

- 世界觀資料展示
- 團務與章節內容整理
- PC / NPC / 神祇 / 帝王等角色索引
- 角色卡、規則查詢與其他 D&D 工具
- 會員登入、收藏、成就、QA 與角色資料

目前包含的主要頁面與功能：

1. 網站首頁與主要導覽。
2. Campaigns 團務入口、活動分類、章節頁與故事弧頁。
3. 團錄章節頁，支援中英雙語內容、章節導覽、相關 PC / Guest / NPC 顯示。
4. NPC 資料庫、個別 NPC 頁面與登場時間線，支援搜尋、分類、排序、隨機探索與「命運的抉擇」內容。
5. PC 列表、角色文章、圖片、三視圖與角色資料展示。
6. 世界時間線。
7. 德拉尼森地圖與地點資料。
8. 神祇、帝王、角色總覽、關係圖等世界觀頁面。
9. D&D 工具箱，包含角色卡、角色建立 / 升級、法術、武器、護甲、種族、職業、背景、專長、裝備包與擲骰工具。
10. 會員登入、個人資料、收藏、成就與角色卡管理。
11. Firestore / Storage 資料存取、Firebase Security Rules 與 Emulator 測試。
12. PWA manifest、service worker 與離線快取。

## 技術與部署

本專案沒有自建 application server，也沒有前端 build step。頁面直接由瀏覽器載入 HTML、CSS、JavaScript、JSON、CSV 與圖片資源；需要登入或持久化的功能使用 Firebase managed services。

- 前端：原生 HTML / CSS / JavaScript
- 資料：JSON、JS、CSV 與靜態資源
- 身分驗證：Firebase Authentication
- 主要資料庫：Cloud Firestore
- 圖片儲存：Cloud Storage
- 遷移保留：Realtime Database 維持規則與回退支援
- Firebase Web SDK：頁面直接載入官方 ESM modules
- PWA：`manifest.webmanifest`、`sw.js`、`shared/pwa.js`
- 工具與測試：Node.js 24、Python 3、Firebase Emulator Suite
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
  全站共用設定、Firebase data adapter、登入、收藏、角色卡儲存、語言切換、PWA、字典與共用樣式。

- `campaigns/`
  團務入口、章節頁、故事弧頁、團錄資料、banner、logo、章節導覽與相關腳本。

- `npc/`
  NPC 資料庫、NPC 主資料、圖片、個別 NPC 頁面與登場時間線。

- `pc/`
  PC 首頁、角色文章、圖片、三視圖、玩家提供圖片與角色資料來源。

- `characters/`
  角色總覽與相關入口頁。

- `toolbox/`
  工具箱入口，以及角色卡、角色建立 / 升級、法術、武器、護甲、種族、職業、背景、專長、裝備包與擲骰工具。

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

- `experience/`
  體驗 / 回饋展示頁與公開留言 CSV。

- `about-us/`
  關於我們頁與社群 / 聯絡素材。

- `member/`
  會員頁、個人資料、收藏、角色卡清單與成就 CSV。

- `src/`
  舊版 RTDB 初始化模組；目前沒有頁面引用，不是正式前端入口。

- `config/firebase/`
  Firebase Rules、Firestore indexes、Storage CORS 與維護模式設定。

- `config/python/`
  Firestore migration 工具的 Python 依賴清單。

- `scripts/`
  Firebase migration、資料重鍵、角色卡匯入與圖片維護等管理工具。

- `tests/`
  Firestore migration、Firestore / Storage Rules 與 RTDB maintenance Rules 測試。

- `docs/`
  Firestore migration 方案與執行 / 回退手冊。

## 核心資料檔

內容更新時，最常需要同步檢查這些檔案：

1. `shared/rugatha.config.js`
   Campaign 清單、故事弧圖譜、章節節點、URL override、章節圖片對應與全站共用設定。

2. `campaigns/data/chapter-content.json`
   團錄章節正文資料來源。章節頁 HTML 只保留頁面骨架，實際中英內文、日期段落、引用與少數文內 HTML 都由這個 JSON 提供。

3. `campaigns/data/campaigns.js`
   Campaign 頁面的活動資料。

4. `campaigns/data/chapter-nav.json`
   章節上一章 / 下一章導覽。

5. `campaigns/data/chapter-titles.json`
   章節中英文標題。

6. `campaigns/data/story-arc-titles.json`
   故事弧中英文標題。

7. `campaigns/pages/pcs.json`
   章節出現的 PC。

8. `campaigns/pages/guest.json`
   章節出現的 Guest。

9. `campaigns/pages/npcs.json`
   章節出現的 NPC。

10. `npc/data/characters.json`
   NPC 主資料來源，包含名稱、介紹、關聯、地點、圖片與「命運的抉擇」。

11. `pc/pc_lib`
    PC 資料來源。

12. `timeline/data/events.json`
    世界時間線事件資料。

13. `deities/data/deities.json`
    神祇資料來源。

14. `map/assets/locations.json`
    地圖地點資料。

15. `member/achievements.csv`
    會員成就資料。

16. `experience/exp_public_comment.csv`
    體驗頁公開留言資料。

17. `shared/calendar-events.json`
    首頁行事曆事件資料。

18. `shared/firebase.config.js`
    Firebase 前端設定與功能旗標。目前正式資料後端為 `firestore`，寫入功能開啟。

角色收藏、會員資料、QA 統計與已儲存的角色卡不是 repository 內的靜態資料，實際存放於 Firestore；會員與角色圖片存放於 Cloud Storage。

## 本機預覽

請使用本機 HTTP server 預覽，不建議直接用 `file://` 開啟，因為部分頁面會透過 `fetch` 載入資料。

單純預覽靜態網站不需要安裝 npm dependencies。在專案根目錄執行：

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
http://localhost:8000/toolbox/spells/
http://localhost:8000/toolbox/character_sheet/
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

## 開發環境與測試

執行 Firebase Rules 測試或管理工具時，請使用：

- Node.js 24（版本記錄於 `.nvmrc` 與 `package.json`）
- Python 3
- 可執行 Firebase Emulator Suite 的 Java runtime

安裝 Node.js dependencies：

```bash
npm ci
```

測試指令：

```bash
npm run test:migration
npm run test:rules
npm run test:maintenance-rules
npm test
```

- `test:migration`：測試 RTDB → Firestore 轉換、資料驗證與 rollback shape。
- `test:rules`：測試正式 Firestore / Storage Rules，包括會員資料、member key、收藏、QA、角色卡與圖片權限。
- `test:maintenance-rules`：測試 RTDB maintenance Rules 保持可讀且封鎖寫入。
- `npm test`：依序執行以上全部測試。

Rules 測試會啟動本機 Firebase emulators；若 Java 無法執行，migration tests 仍可獨立運行，但 Rules 測試不算完成。

## Firebase 設定

- `.firebaserc`：預設 Firebase project alias。
- `firebase.json`：正式 rules、indexes 與 emulator ports 的入口設定。
- `config/firebase/firestore.rules`：Firestore Security Rules。
- `config/firebase/firestore.indexes.json`：Firestore indexes。
- `config/firebase/storage.rules`：Cloud Storage Security Rules。
- `config/firebase/database.rules.json`：Realtime Database Rules。
- `config/firebase/firebase.maintenance.json` 與 `config/firebase/database.maintenance.rules.json`：RTDB 唯讀維護模式。
- `config/firebase/storage.cors.json`：Storage CORS 設定。

前端功能旗標集中在 `shared/firebase.config.js`。目前設定為：

```text
firebaseEnabled: true
qaFateEnabled: true
dataBackend: firestore
dataWritesEnabled: true
```

Service account、RTDB export、migration report 與 rollback 檔案屬於私密資料，已由 `.gitignore` 排除，不可提交到 repository。

## Firebase 管理工具

需要 Firebase Admin SDK 的工具可安裝獨立依賴：

```bash
python3 -m venv .venv
.venv/bin/pip install -r config/python/requirements-migration.txt
```

主要工具：

- `scripts/firebase_preflight.py`：唯讀檢查正式 Firebase migration 前置條件。
- `scripts/firestore_migration.py`：分析、dry-run、匯入、驗證、管理員 claim 與 rollback export。
- `scripts/migrate_member_keys.py`：將會員文件與子集合改以會員編號作為路徑。
- `scripts/import_character_cards.py`：匯入角色卡與角色圖片。
- `scripts/replace_character_portraits.py`：替換並驗證角色圖片。
- `scripts/member_paths.py`：管理工具共用的會員路徑解析。

這些工具可能讀寫正式資料。執行前應先確認 project、備份、dry-run 與工具要求的 `--confirm-project` / `--apply` 參數。

目前 RTDB → Firestore migration 已完成匯入與切換，觀察期為 2026-09-25 至 2026-10-02。觀察期結束前保留 migration、rollback 與 RTDB maintenance 相關檔案；詳細流程見：

- `docs/firestore-migration-plan.md`
- `docs/firestore-migration-runbook.md`

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

1. 先修改實際內容資料或頁面。團錄正文請優先改 `campaigns/data/chapter-content.json`，不要直接寫進章節 HTML。
2. 再補資料檔與連動設定。
3. 最後檢查圖片、導覽、雙語內容、角色對照與連結是否一致。

完整內容更新規則請參考：

- [shared/update_rules.md](shared/update_rules.md)

## 團錄與章節更新

若更新的是團錄或章節頁，通常要檢查：

1. 團錄正文是否更新在資料檔，而不是直接寫進 HTML：
   - `campaigns/data/chapter-content.json`

2. 頁面骨架位置是否正確：
   - `campaigns/pages/**/chpt*.html`
   - 少數單章節故事可能是 `campaigns/pages/**/index.html`
   - 頁面應保留 `data-role="chapter-content"` 容器並載入 `campaigns/scripts/chapter-content.js`

3. `chapter-content.json` 的內容格式是否清楚且可維護：
   - `content.zh` / `content.en` / `content.default` 使用 section 陣列
   - 每個 section 可有 `date`
   - 一般段落放在 `paragraphs` 字串陣列
   - 引言使用 `{ "quote": "...", "cite": "..." }`
   - 圖片或特殊 HTML 才使用 `{ "html": "..." }`

4. 中英雙語是否完整：
   - `content.zh`
   - `content.en`
   - 單語章節可使用 `content.default`

5. 是否需要同步更新：
   - `campaigns/data/chapter-nav.json`
   - `campaigns/data/chapter-titles.json`
   - `campaigns/data/story-arc-titles.json`
   - `campaigns/pages/pcs.json`
   - `campaigns/pages/guest.json`
   - `campaigns/pages/npcs.json`
   - `timeline/data/events.json`

6. 若章節圖有新增或替換，請同步檢查：
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
- 更新時間線時，檢查 `timeline/data/events.json` 的時間排序、中英標題與描述。
- 更新地圖時，檢查 `map/assets/locations.json` 與地圖圖片座標是否一致。
- 更新神祇時，檢查 `deities/data/deities.json`、`deities/pages/` 與 `deities/images/`。
- 更新咒語時，檢查 `toolbox/spells/spells-phb.json` 格式是否可被頁面讀取。
- 更新會員成就時，檢查 `member/achievements.csv` 欄位格式。
- 更新首頁行事曆時，檢查 `shared/calendar-events.json`。
- 更新 NPC 登場資料時，同步檢查 `npc/appearance-timeline/` 所使用的團錄與 NPC 對照資料。
- 更新角色卡儲存、收藏、QA 或會員資料結構時，同步檢查 `shared/firebase-data.js`、Firestore / Storage Rules 與 Rules tests。

## 驗證建議

修改後至少做以下檢查：

1. 用本機 HTTP server 開啟受影響頁面。
2. 確認瀏覽器 console 沒有路徑、JSON parse、module 或 Firebase 初始化錯誤。
3. 確認圖片、CSS、JS、JSON、CSV 都能正常載入。
4. 確認中英文內容一致，沒有只改其中一個語言版本。
5. 若有新增 HTML 或批次修改 HTML，執行正規化腳本。
6. 若有改 JSON / JS / CSV 資料，確認格式合法，避免多餘逗號、缺漏括號或欄位錯位。
7. 若有改 Firebase data access、rules、indexes 或會員功能，執行對應的 npm tests。
8. 確認 `manifest.webmanifest`、`sw.js` 與 `shared/pwa.js` 的 PWA 路徑仍從網站根目錄載入。

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
