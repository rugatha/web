# Rugatha Web

這是一個以 `HTML / CSS / JavaScript` 為主的靜態網站專案，用來整理與展示 Rugatha 世界觀、角色資料、團錄、時間線與社群工具。

## 專案用途

這個網站的主要目的，是把 Rugatha 相關內容集中在同一個入口，方便玩家、觀眾與管理者查閱與更新。

目前包含的主要功能有：

1. 活動首頁與各系列團務入口。
2. 團錄 / 章節頁面，支援中英雙語內容、章節導覽、相關角色顯示。
3. Campaigns 圖譜與故事弧結構資料。
4. NPC 資料庫與個別 NPC 頁面，支援搜尋、分類、排序、隨機探索與「命運的抉擇」。
5. PC 相關頁面與角色資料展示。
6. 世界時間線頁面。
7. 神祇、帝王、地圖等世界觀頁面。
8. 角色卡產生器等工具頁面。
9. 會員 / 登入相關前端流程，使用 Firebase 做登入整合。

簡單來說，這個專案同時負責：

- 世界觀資料展示
- 團務內容整理
- 角色資料索引
- 社群工具與互動頁面

## 專案架構

這個專案是靜態網站架構，沒有傳統後端伺服器。大部分頁面直接由瀏覽器載入 HTML、CSS、JS 與 JSON / JS 資料檔來組成內容。

### 技術組成

- 前端：原生 HTML / CSS / JavaScript
- 資料載入：前端讀取 JSON、JS、CSV 類型資料
- 登入整合：Firebase
- 部署方式：GitHub Pages

GitHub Pages 部署設定位於：

- `/.github/workflows/pages.yml`

目前流程是：只要 `main` 分支有更新，就會重新部署整個網站。

### 目錄結構

- `/assets`
  共用圖片、icon 等靜態資源。

- `/shared`
  全站共用設定與樣式。
  重要檔案：
  - `/shared/rugatha.config.js`
  - `/shared/auth.js`
  - `/shared/update_rules.md`

- `/campaigns`
  團錄與團務相關頁面、資料、圖片與腳本。
  重要子目錄：
  - `/campaigns/pages`
  - `/campaigns/data`
  - `/campaigns/scripts`
  - `/campaigns/campaign-banners`
  - `/campaigns/chapter-banners`
  - `/campaigns/campaign-logos`

- `/npc`
  NPC 資料庫、NPC 列表頁、個別 NPC 頁面與圖片。
  重要子目錄：
  - `/npc/data`
  - `/npc/npc_page/pages`
  - `/npc/individual_pics`

- `/pc`
  PC 相關頁面、圖片與資料來源。

- `/timeline`
  世界時間線頁面、資料與腳本。

- `/map`
  地圖相關頁面與資產。

- `/deities`
  神祇頁面與資料。

- `/emperors`
  帝王 / 歷史人物相關頁面。

- `/character_card`
  角色卡工具頁面。

- `/member`
  會員相關頁面。

- `/src`
  目前主要是 Firebase 初始化等共用模組程式。

### 核心資料檔

這個專案有幾個特別重要的資料來源：

1. `/shared/rugatha.config.js`
   管理 campaigns 清單、故事弧圖譜、章節節點、部分圖片對應與全站共用設定。

2. `/campaigns/data/chapter-nav.json`
   管理章節前後導覽。

3. `/campaigns/data/chapter-titles.json`
   管理章節中英文標題。

4. `/campaigns/data/story-arc-titles.json`
   管理故事弧中英文標題。

5. `/campaigns/pages/pcs.json`
   管理章節出現的 PC。

6. `/campaigns/pages/guest.json`
   管理章節出現的 Guest。

7. `/campaigns/pages/npcs.json`
   管理章節出現的 NPC。

8. `/npc/data/characters.json`
   NPC 主資料來源，包含名稱、介紹、關聯、地點、命運的抉擇等資料。

9. `/timeline/data/events.js`
   世界時間線事件資料。

因此，這個專案的更新通常不是只改單一頁面，而是會同時改：

- 頁面本身
- 導覽資料
- 角色對照資料
- 標題資料
- 圖片資源
- 全站設定

## 更新流程

更新前請先判斷，這次改動屬於哪一類：

1. 團錄 / 章節內容更新
2. NPC 更新
3. 新增章節或新增故事弧
4. 純文案或樣式修正

### 基本流程

建議依照下面順序進行：

1. 先修改實際頁面內容。
2. 再補資料檔與連動設定。
3. 最後檢查圖片、導覽、雙語內容與角色對照是否一致。

### 團錄與章節更新

若你更新的是團錄或章節頁，通常要檢查：

1. 頁面位置是否正確：
   - `/campaigns/pages/**/chpt*.html`
   - 少數單章節故事可能是 `/campaigns/pages/**/index.html`

2. 中英雙語是否完整：
   - `.campaign-detail__content_zh`
   - `.campaign-detail__content_en`

3. 是否需要同步更新：
   - `/campaigns/data/chapter-nav.json`
   - `/campaigns/data/chapter-titles.json`
   - `/campaigns/data/story-arc-titles.json`
   - `/campaigns/pages/pcs.json`
   - `/campaigns/pages/guest.json`
   - `/campaigns/pages/npcs.json`
   - `/timeline/data/events.js`

4. 若章節圖有新增或替換，請同步檢查：
   - `/campaigns/chapter-banners`
   - `/campaigns/campaign-banners`
   - `/shared/rugatha.config.js`

### NPC 更新

若你更新的是 NPC，通常要檢查：

1. 主資料是否已更新：
   - `/npc/data/characters.json`

2. 個別 NPC 頁面是否已建立或同步修改：
   - `/npc/npc_page/pages/*.html`

3. 若該 NPC 已在團錄中登場，是否同步更新：
   - `/campaigns/pages/npcs.json`

4. 若有新增命運的抉擇，是否補上：
   - `qaZh`
   - `qaEn`

### 新增章節與故事弧

這是最容易漏檔的更新類型。

請至少檢查：

1. 新頁面是否建立在正確位置：
   - `/campaigns/pages/`

2. 是否同步更新：
   - `/campaigns/data/chapter-nav.json`
   - `/campaigns/data/chapter-titles.json`
   - `/campaigns/data/story-arc-titles.json`
   - `/shared/rugatha.config.js`
   - `/campaigns/pages/pcs.json`
   - `/campaigns/pages/guest.json`
   - `/campaigns/pages/npcs.json`

3. 是否補齊圖片資源：
   - `/campaigns/campaign-banners`
   - `/campaigns/chapter-banners`
   - `/campaigns/campaign-logos`

4. 若劇情已造成世界觀重大推進，是否更新：
   - `/timeline/data/events.js`

## 更新檢查清單

若你是要做內容更新，請直接參考：

- [shared/update_rules.md](/Users/chernalbert/Documents/GitHub/web/shared/update_rules.md)

這份文件是針對這個 repo 已整理好的更新檢查清單，適合在每次改團錄、NPC、章節或故事弧時一起檢查。

## 本機預覽

這個專案本質上是靜態網站，所以本機預覽方式很單純，只要能提供靜態檔案伺服器即可。

最簡單的方式，是在專案根目錄啟動一個本機靜態 server，然後用瀏覽器開啟 localhost。

### 使用 Python 啟動

在專案根目錄執行：

```bash
python3 -m http.server 8000
```

啟動後，用瀏覽器開啟：

```text
http://localhost:8000
```

如果要直接打開 campaigns 頁面，可用：

```text
http://localhost:8000/campaigns/
```

如果要直接打開 NPC 頁面，可用：

```text
http://localhost:8000/npc/
```

要停止 server 時，在終端機按 `Ctrl + C` 即可。

### 其他方式

如果本機有其他靜態 server 工具，也可以使用，例如：

```bash
npx serve .
```

或：

```bash
npx http-server .
```

注意事項：

1. 某些資料是透過 `fetch` 載入，本機請不要直接用 `file://` 開頁，應使用本機 HTTP server。
2. 登入功能依賴 Firebase 設定；若本機缺少對應設定，登入功能可能無法正常測試。
3. 本專案沒有固定 build step，主要是直接部署靜態檔。

## 維護原則

這個專案最重要的維護觀念是：資料一致性比單頁修改更重要。

也就是說，當你更新：

- 一篇團錄
- 一個 NPC
- 一個故事弧
- 一張章節圖

都應該同時檢查它對以下資料的影響：

- 導覽
- 標題
- 角色對照
- 全站設定
- 時間線
- 圖片資源

只改頁面而不補資料檔，通常就是最常見的錯誤來源。
