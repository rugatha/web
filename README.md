# Rugatha 網站工具箱

整合 Rugatha 的戰役關係圖、戰役卡片、NPC 導覽、角色卡產生器與時間軸的靜態套件。戰役相關設定集中在同一份檔案，更新後各小工具都會同步；所有資源皆為本地檔案，不依賴原本的 GitHub 儲存庫。

全域的樣式變數與字體放在 `shared/styles/theme.css`，每個頁面都會引用，確保色彩、間距與首頁圖示一致。

## 專案結構
- `index.html`：首頁，連到各個工具。
- `shared/rugatha.config.js`：共用設定來源（戰役列表與關係圖連結）。
- `shared/styles/theme.css`：跨頁面的調色盤、字體與 hero 預設樣式。
- `campaign_graph/`：D3 折疊式關係圖，資料來自共用設定。
- `campaigns/`：戰役卡片列表，資料同樣來自共用設定。
- `npc/`：NPC 圖鑑（資料在 `npc/data/characters.json`）。
- `npc/npc_page/`：單一 NPC 頁面的共用模板；所有頁面檔案都以 `?npc=<id>` 方式導向模板。
- `character_card/`：角色卡 PNG 產生器（點擊預覽即可開啟／存檔）。
- `timeline/`：靜態時間軸檢視。

## 戰役關係圖（campaign_graph/）
- 互動式 D3 階層圖（root → 類別 → 戰役），支援縮放、平移、聚焦、回首頁，展開／收合有平滑動畫。
- WordPress 安全模式：若腳本被阻擋則改為外連。
- 結構：`index.html`、`css/style.css`（使用共用變數）、`js/graph-*.js`、`assets/`。
- 資料來源：`shared/rugatha.config.js` 的圖形區塊，圖形會讀取 `CAMPAIGN_GRAPH_DATA`。

## 戰役卡片（campaigns/）
- 以 `shared/rugatha.config.js` 驅動的卡片網格（不需額外資料檔），樣式沿用共用色票與 hero 設定。
- 入口：`campaigns/index.html`；樣式在 `styles/campaigns.css`；邏輯在 `scripts/app.js`。

## 角色卡產生器（character_card/）
- Canvas 產生 PNG，點擊／點按預覽即可開啟下載；行動版內嵌瀏覽器會顯示長按提示避免下載失敗。
- 使用共用戰役的重點色建立色票，若共用設定缺失則使用預設值。
- 入口：`character_card/index.html`；樣式在 `styles/style.css`；邏輯在 `scripts/app.js`。

## NPC 導覽（npc/）
- 頁面：`index.html`（主頁）、`npc.html`（精簡版）。
- 功能：搜尋、A↔Z 排序、依字母或種族分組（多種族會出現在各自族群）、延遲載入圖片、無障礙即時狀態。
- 資料：`npc/data/characters.json`（結構 `{ id, name, image, url, race, descZh, descEn, related: [] }`），`id` 應與檔名 slug 一致（例：`Ada` → `_template.html?npc=Ada`）。
- `npc/npc_page/pages/` 底下的檔案為輕量轉址頁，導向 `_template.html?npc=<slug>`；模板會從 `characters.json` 拉資料，因此不需維護個別頁面內容。
- 無需建置，直接開啟瀏覽器或以靜態伺服器提供即可。

## 共用樣式
- 基礎變數、字體匯入與 hero 預設都在 `shared/styles/theme.css`，所有頂層頁面皆引用。
- 單頁覆寫則放在各自資料夾（如 `styles/home.css`、`character_main_page/styles.css`、`npc/styles.css`），盡量沿用共用變數。

## NPC 模板（npc/npc_page/）
- 模板：`npc/npc_page/pages/_template.html` 包含共用版面與腳本；其他檔案僅為帶 slug 的轉址頁。
- 資料契約：`scripts.js` 讀取 `npc` query 參數，找到 `npc/data/characters.json` 對應資料後渲染頭像、姓名、描述與相關角色，描述請維護在 JSON，而非 HTML 轉址頁。

## 更新內容
1. 在 `shared/rugatha.config.js` 編輯戰役或關係圖節點（名稱、連結、強調色、節點關係），卡片與關係圖都會同步。
2. NPC 資料維持在 `npc/data/characters.json`（結構不同，因此獨立管理）。
3. 若之後新增時間軸類工具，可放在同層資料夾並視需要連到共用設定。

## 本地執行
本專案為靜態網站，啟動任何簡易伺服器即可，例如：
```sh
python -m http.server 8000
```
然後開啟 `http://localhost:8000/`，從 `index.html` 進入各工具。
