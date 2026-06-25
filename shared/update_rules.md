# Update Rules

這份文件是每次更新 Rugatha 網站內容時的檢查清單，供 Codex 依照實際變動範圍同步補齊連動檔案。

原則：
1. 不要只改單一頁面，必須一併檢查會被該頁面讀取或引用的資料檔。
2. 若是「純文案微調」，只需處理實際受影響項目；若是「新增章節 / 新增 NPC / 新增故事弧」，要完整檢查下列所有連動。
3. 本文件優先以目前專案內實際存在的檔案路徑為準。

## 1. 團錄 / 章節內容更新

常見位置：
- `/campaigns/pages/**/chpt*.html`
- 少數單章節故事弧會使用 `/campaigns/pages/**/index.html` 承載正文，例如部分 `rugatha-legends`

更新團錄時，請檢查：
1. 若頁面使用雙語章節格式，請確認 `.campaign-detail__content_zh` 與 `.campaign-detail__content_en` 都存在且內容對應；若只有中文，請補上英文翻譯。
2. 請確認章節標題、日期、內文、圖片 alt、頁面 `<title>` 沒有互相矛盾。
3. 請確認前後章與故事弧導覽是否正確，必要時更新 `/campaigns/data/chapter-nav.json`。
4. 請確認章節標題對照是否正確，必要時更新 `/campaigns/data/chapter-titles.json`。
5. 若是新增故事弧或修改故事弧名稱，請同步更新 `/campaigns/data/story-arc-titles.json`。
6. 請從團錄內容整理出本章出現的 PC、Guest、NPC，並同步更新：
   - `/campaigns/pages/pcs.json`
   - `/campaigns/pages/guest.json`
   - `/campaigns/pages/npcs.json`
7. NPC 對照請以 `/npc/data/characters.json` 內實際存在的 `id` 為準；PC 請以 `/pc/pc_lib` 內名稱為準。
8. 請檢查章節首圖與文內附圖是否存在、路徑是否正確。
9. 若新增或更換章節首圖，請同步檢查：
   - `/campaigns/chapter-banners/`
   - `/shared/rugatha.config.js` 內的 chapter image mapping
10. 若該章沒有獨立章節圖，可暫時沿用對應的 `/campaigns/campaign-banners/`，但請優先在 `/campaigns/chapter-banners/` 建立對應檔案，方便後續替換。
11. 請從團錄判斷是否有足夠重要、且適合放入世界時間線的大事件；若有，更新 `/timeline/data/events.js`。
12. 更新 `/timeline/data/events.js` 時，請維持時間排序為升冪，並補齊中英文標題與描述。

## 2. NPC 更新

主要資料位置：
- `/npc/data/characters.json`
- `/npc/npc_page/pages/*.html`

新增或修改 NPC 時，請檢查：
1. `/npc/data/characters.json` 內的 `id`、`url`、`image`、`nameZh`、`nameEn`、`descZh`、`descEn`、`related`、`locationZh`、`locationEn` 是否完整且互相一致。
2. 若有獨立 NPC 頁面，請確認 `/npc/npc_page/pages/*.html` 已建立或同步更新，且頁面能正確讀到該 NPC 的 `id`。
3. 請根據設定與團錄內容更新 `related`，避免只新增 NPC 本人而漏掉相關角色關聯。
4. 若 NPC 已在某些章節中實際登場，請同步更新 `/campaigns/pages/npcs.json`，讓章節頁能顯示相關 NPC。
5. 若 NPC 是從團錄才正式出場，請回頭檢查該章節是否也需要補到 `/campaigns/pages/pcs.json`、`/campaigns/pages/guest.json`、`/campaigns/pages/npcs.json`。
6. 若有「命運的抉擇」內容，請在 `/npc/data/characters.json` 補齊 `qaZh` 與 `qaEn`。
7. 若 NPC 頁面要啟用「命運的抉擇」，請確認該頁有對應的 QA 區塊，且 `data-qa-id` 指向正確 NPC `id`。
8. 若 NPC 的生死、地點、關係、稱號因團錄推進而改變，請同步修正文案，不要只改單一語言版本。

## 3. 新增章節或新增故事弧

這類更新的連動最多，不能只新增 html。

請檢查：
1. 新章節或新故事弧頁面是否已建立在 `/campaigns/pages/` 正確位置。
2. 是否已更新 `/campaigns/data/chapter-nav.json`。
3. 是否已更新 `/campaigns/data/chapter-titles.json`。
4. 若是新增故事弧，是否已更新 `/campaigns/data/story-arc-titles.json`。
5. 是否已更新 `/shared/rugatha.config.js` 內：
   - 故事弧節點
   - 章節節點
   - url override
   - chapter image mapping
6. 若新增的是全新系列 / 新活動卡片，是否已更新 `/shared/rugatha.config.js` 中的 `campaigns` 資料來源所需內容。
7. 是否已補上對應 banner：
   - `/campaigns/campaign-banners/`
   - `/campaigns/chapter-banners/`
   - 必要時 `/campaigns/campaign-logos/`
8. 若新章節已有正文，是否已同步更新 `/campaigns/pages/pcs.json`、`/campaigns/pages/guest.json`、`/campaigns/pages/npcs.json`。
9. 若新章節屬於時間線重要事件，是否已同步更新 `/timeline/data/events.js`。

## 4. 一般內容驗證

不論是哪一種更新，完成後都要再檢查：
1. 連結路徑是否正確，特別是相對路徑的圖片、script、stylesheet。
2. 中英文內容是否有一邊漏改、名稱不一致、或翻譯明顯對不上。
3. 角色 id、章節 id、故事弧 id 是否與既有命名規則一致。
4. JSON / JS / HTML 是否維持合法格式，沒有多餘逗號、缺漏括號、錯字路徑。
5. 若本次更新涉及團錄內容，至少回頭檢查一次：
   - 導覽是否能切到上一章 / 下一章
   - 章節頁是否能顯示相關 PC / Guest / NPC
   - 圖片是否正常載入
   - 時間線與 NPC 資料是否仍與最新劇情一致

## 5. 執行優先順序

若不確定該從哪裡開始檢查，請依照這個順序：
1. 先確認這次更新屬於哪一類：團錄、NPC、章節/故事弧、或純文案修正。
2. 先改正文，再補資料檔：
   - `/campaigns/data/chapter-nav.json`
   - `/campaigns/data/chapter-titles.json`
   - `/campaigns/data/story-arc-titles.json`
   - `/campaigns/pages/pcs.json`
   - `/campaigns/pages/guest.json`
   - `/campaigns/pages/npcs.json`
   - `/npc/data/characters.json`
   - `/timeline/data/events.js`
3. 最後檢查圖片、連結、雙語內容與 id 一致性。

## 6. 特別提醒

1. 並不是每個故事頁都一定是 `chpt*.html`；部分單章節故事會用 `index.html` 呈現正文。
2. 並不是每次更新都一定要改時間線或 NPC，但只要團錄內容已經造成可見設定變動，就要一併檢查。
