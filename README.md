# Rugatha Web

Rugatha Web 是 Rugatha 世界觀、團錄與社群工具的官方網站。前端以原生 `HTML / CSS / JavaScript` 製作並由 GitHub Pages 提供；會員登入、個人資料、收藏、QA、角色卡與圖片儲存則整合 Firebase Authentication、Cloud Firestore 與 Cloud Storage。

正式網域：

- `https://rugatha.com`

## 本機預覽

在專案根目錄執行，並保持終端機運作：

```sh
npm run dev
```

報名頁：`http://localhost:8765/experience/register/`。也可使用 `http://127.0.0.1:8765/experience/register/`。請透過此網址開啟，以正常載入 JSON 與 Firebase 模組；不要直接雙擊 HTML。結束預覽時按 `Ctrl+C`。

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
- 資料後端：Cloud Firestore（Realtime Database 已停用）
- Firebase Web SDK：頁面直接載入官方 ESM modules
- PWA：`manifest.webmanifest`、`sw.js`、`shared/pwa.js`
- 工具與測試：Node.js 24、Python 3、Firebase Emulator Suite
- 部署：GitHub Pages
- 自訂網域：`CNAME`

GitHub Pages workflow 位於：

- `.github/workflows/pages.yml`

部署流程：

1. `main` 分支有更新時自動觸發。
2. GitHub Actions 更新管理內容清單與章節獨立資料檔。
3. 打包網站執行檔後，上傳為 Pages artifact 並部署。

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

- `config/firebase/`
  Firestore / Storage Rules、Firestore indexes 與 Storage CORS。

- `config/python/`
  Firebase 管理工具的 Python 依賴清單。

- `scripts/`
  Plus 08 章節角色授權與作答設定的管理工具。

- `tests/`
  Firestore / Storage Rules 測試。

- `docs/`
  Plus 08 測試頁的設定與維護說明。

## 核心資料檔

內容更新時，最常需要同步檢查這些檔案：

1. `shared/rugatha.config.js`
   Campaign 清單、故事弧圖譜、章節節點、URL override、章節圖片對應與全站共用設定。

2. `campaigns/data/chapter-content.json`
   團錄章節正文資料來源。章節頁 HTML 只保留頁面骨架，實際中英內文、日期段落、引用與少數文內 HTML 都由這個 JSON 提供。修改後執行 `npm run chapters:build`，產生供各章節單獨載入的 `campaigns/data/chapters/`；部署流程也會自動重建。

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
npm run test:catalog:setup # 首次／新版本：下載 checksum 驗證過的公開 catalog 到系統暫存
npm run test:rules
npm run test:spellbooks
npm test
# 首次瀏覽器驗收先準備 SDK 與 Chromium
npm run test:browser:setup
npm run test:all
```

- `test:rules`：測試正式 Firestore / Storage Rules，包括會員資料、member key、收藏、QA、角色卡、法術書與圖片權限。
- `test:spellbooks`：法術書狀態、帳號隔離、本機資料解析、匯入與頁面控制邏輯測試。
- `test:browser`：以 Chromium 與 Auth／Firestore／Storage Emulator 執行實際頁面驗收。
- `npm test`：執行 Firestore / Storage Rules、法術書、PWA 與角色卡功能測試。
- `test:all`：執行以上全部測試；詳見 [瀏覽器驗收說明](tests/browser/README.md)。

Rules 測試會啟動本機 Firebase emulators，需要 Java 21 以上。

## Firebase 設定

- `.firebaserc`：預設 Firebase project alias。
- `firebase.json`：正式 rules、indexes 與 emulator ports 的入口設定。
- `config/firebase/firestore.rules`：Firestore Security Rules。
- `config/firebase/firestore.indexes.json`：Firestore indexes。
- `config/firebase/storage.rules`：Cloud Storage Security Rules。
- `config/firebase/storage.cors.json`：Storage CORS 設定。

前端功能旗標集中在 `shared/firebase.config.js`。目前設定為：

```text
firebaseEnabled: true
qaFateEnabled: true
dataBackend: firestore
spellbookSyncEnabled: true
spellbookSyncMemberUids: []
dataWritesEnabled: true
```

Service account、RTDB export、migration report 與 rollback 檔案屬於私密資料，已由 `.gitignore` 排除，不可提交到 repository。

## 個人法術書同步

法術頁 `toolbox/spells/index.html` 使用 `shared/spellbooks.js`，每個會員一本法術書，路徑為 `members/{memberNo}/spellbooks/default`。會員編號沿用 `shared/member-path.js` 的 UID 對照。文件欄位固定為 `schemaVersion: 1`、`spellIds`、`createdAt` 與 `updatedAt`，時間由伺服器產生；只允許本人 get/create/update，不允許管理員讀取、列出或刪除文件。清空保留空文件。

第一版識別碼固定為 PHB 英文名稱，完整內容改由 Firebase Storage 的版本化公開 JSON 提供，repo 不保存完整來源。Rules 驗證清單最多 500 筆、不重複，且全部位於 PHB 白名單；新增來源或改名時，先擴充 Rules 與識別碼對照，再部署新資料。既有識別碼不可直接刪除或改名；移除顯示資料時仍需保留 Rules 白名單，待明確資料遷移後才能清理。新增法術時需通過 catalog／Rules 一致性測試。

即時訂閱只讀取指定文件，不需要新增索引。先等待共用會員初始化完成，再解析會員編號，避免新會員 UID fallback 的競態。第一次寫入使用 transaction 判斷文件是否存在；後續新增／移除使用 transaction 搭配 `arrayUnion`／`arrayRemove`，避免覆寫其他裝置清單。對同一法術的增刪依伺服器提交順序收斂；清空會清除在它提交之前的所有新增，之後的新增保留。讀取失敗不會初始化文件。

未登入使用 `rugatha.phb.spellbook.guest.v1`。首次開啟訪客頁面時可讀取舊 `rugatha.phb.spellbook`，但後續訪客編輯只寫新 key，舊 key 保留作為復原來源。登入後會提示本機可匯入數量與目前帳號；玩家確認才合併，稍後處理不會刪除來源。未知名稱與損壞資料會提示，原始資料保留，僅可識別名稱送到雲端。損壞的訪客來源在修復前暫停編輯，避免覆蓋復原資料。

匯入紀錄儲存在 `rugatha.phb.spellbook.import.v1.{uid}`，值為舊資料與訪客資料的完整來源指紋。伺服器確認成功才記錄；相同來源之後不再提示或自動匯入，避免刪除的法術復活。另一台裝置有自己的來源與紀錄；舊頁面或訪客資料改變後會再次提示，仍須玩家確認。原始 key 在相容期內不刪除；結束相容期須先完成跨裝置、舊版 PWA 與復原驗收，再另訂清理流程。

離線版僅保留頁面內的待同步操作與 Firebase 記憶體快取，不啟用跨重新啟動的持久化佇列。畫面區分載入、快取、尚未同步、已同步與錯誤；失敗後可手動重試，恢復連線時也會重試。離開有待同步操作的頁面會要求確認；關閉／重新整理後未提交操作可能遺失。登出／切換帳號會解除訂閱並取消舊佇列；已送出的交易可能仍完成於原帳號文件，不會改寫新帳號。

`spellbookSyncEnabled` 已在正式環境開啟，白名單為空代表所有會員可用；若改為 `false`，會員畫面會明確顯示同步停用且不展示訪客備份為雲端資料。已依序部署 Rules／前端，完成專用帳號跨瀏覽器驗收及正式停用演練。`dataWritesEnabled: false` 會暫停所有法術書寫入並保留當頁待同步操作；重新啟用後可按重試。停用同步時保留雲端與本機來源；回退應保留此停用提示，不應直接回退到僅使用舊 key 的前端。PWA cache 版本已升級，但既有開啟頁籤仍需重新整理；已完成本機 Chromium／手機模擬與 worker 驗收；正式網域已驗證 PWA v22 與版本化設定載入；資料來源轉移後 worker 升為 v23，僅額外快取兩個公開 catalog URL，不快取私人 Firebase 請求。Cloudflare 對 JavaScript 的快取可達 4 小時，因此每次變更開關都必須同步更新法術頁 `firebase.config.js?v=…` 的版本參數。

玩家匯入方式：請使用原本儲存法術的瀏覽器與網站登入，按「確認合併匯入」，看到「已同步」後再離開。本機原始來源持續保留，相容期沒有截止日期。正式版本、驗收、觀察及復原程序統一見 [法術書上線與回退](docs/spellbook-release.md)，法術來源維護見 [法術資料來源](docs/spell-catalog-storage.md)。

## 法術參考資料來源

法術主檔 `spells-phb.json` 與職業施法進度 `class_spells.json` 存放於 Firebase Storage 的 `catalogs/spells/2026-10-18-v1/`。`shared/spell-catalog.js` 只保留網址、版本及 checksum，法術頁、角色卡和種族／職業頁共用同一設定。公開訪客可 get 這兩個檔案；所有客戶端（含 app 管理員）不能 list／修改／刪除，發布透過具 IAM 權限的管理工具。既有私人圖片權限不變。

測試前執行 `npm run test:catalog:setup`；來源下載到系統暫存並驗證 SHA-256，可用 `RUGATHA_SPELL_CATALOG_TEST_DIR` 指定 repo 外目錄。瀏覽器測試只讀暫存資料並連本機 Emulator。完整資料維護與回退程序見 [法術資料來源](docs/spell-catalog-storage.md)。

## Firebase 管理工具

需要 Firebase Admin SDK 的工具可安裝獨立依賴：

```bash
python3 -m venv .venv
.venv/bin/pip install -r config/python/requirements-admin.txt
```

目前保留 `scripts/setup_adventurer_choices.py`，用於同步 Plus 08 章節角色密碼、題目組別與 `lock` 設定。操作方式見 `docs/adventurer-choices-temp.md`。

此工具可能讀寫正式資料。執行前應先確認 project，先以 dry-run 檢查，再使用 `--apply` 寫入。

RTDB → Firestore 遷移已於 2026-10-10 完成結案；前端僅使用 Firestore。已移除一次性會員重鍵、角色卡匯入與圖片替換工具，以及歷史結案與問題紀錄；需要查閱時可從 Git 歷史取得。現行 Firestore / Storage 權限與角色卡回歸測試仍保留。

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
   - NPC 圖片只使用 `npc/data/characters.json` 的雲端網址；現用資產清單見 `docs/image-migration/npc-current.json`。

## 其他資料更新

- 更新 PC 時，檢查 `pc/pc_lib`、`pc/articles/`、`pc/pics/`、`pc/three_views/` 與章節 PC 對照。
- 更新時間線時，檢查 `timeline/data/events.json` 的時間排序、中英標題與描述。
- 更新地圖時，檢查 `map/assets/locations.json` 與地圖圖片座標是否一致。
- 更新神祇時，檢查 `deities/data/deities.json`、`deities/pages/` 與 `deities/images/`。
- 更新法術來源時，在 repo 外準備 JSON，發布新的 Firebase Storage 版本；維護方式與識別碼／順序限制見 [法術資料來源](docs/spell-catalog-storage.md)。
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

法術書本次開發與測試結果見 [2026-10-18 驗收紀錄](docs/spellbook-acceptance-2026-10-18.md)。

## 公開內容圖片遷移

圖片搬移計畫與 checkbox 進度見 [to-do.md](to-do.md)，試搬範圍、發布工具、驗收及回退紀錄見 [圖片遷移文件](docs/image-migration/README.md)。`rugatha-c01` 的 20 張試搬原圖已備份至私人 Storage 並移除 repo 副本；其餘圖片保留，於 11/21 後檢查用量再決定是否擴大。
