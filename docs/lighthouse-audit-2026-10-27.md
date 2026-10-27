# Lighthouse 效能稽核（2026-10-27）

> **歷史量測，非目前版本分數。** 使用者決定將本輪圖片最佳化延後到 Firebase 搬遷時執行，因此已還原圖片檔及圖片引用。以下分數是在還原前量得，不能據此宣稱目前版本各項達 90 分；後續搬遷與重測見 [`../to-do.md`](../to-do.md)。

使用本機 Python HTTP 伺服器與 Chrome 的 Lighthouse 13.5 預設行動裝置設定。以下是完成修正後，各公開頁型的一次代表性冷載入結果；分數依序為效能、無障礙、最佳做法與 SEO。實際分數會隨裝置及 Firebase、Google Analytics 等第三方請求而波動。

| 頁型 | 路徑 | 效能 | 無障礙 | 最佳做法 | SEO |
| --- | --- | ---: | ---: | ---: | ---: |
| 首頁 | `/` | 91 | 100 | 96 | 100 |
| 團錄索引 | `/campaigns/` | 96 | 98 | 100 | 100 |
| 進行中團務 | `/campaigns/active/` | 99 | 98 | 96 | 100 |
| 已結束團務 | `/campaigns/closed/` | 97 | 98 | 100 | 100 |
| 章節詳頁 | `/campaigns/pages/rugatha-wilds/wilds-c04/chpt01.html` | 93 | 94 | 100 | 100 |
| 角色總覽 | `/characters/` | 95 | 100 | 100 | 100 |
| PC 總覽 | `/pc/` | 95 | 100 | 96 | 100 |
| PC 詳頁 | `/pc/articles/paladin.html` | 98 | 100 | 100 | 100 |
| NPC 總覽 | `/npc/` | 98 | 96 | 100 | 100 |
| NPC 出場時間線 | `/npc/appearance-timeline/` | 99 | 96 | 100 | 100 |
| NPC 詳頁：馬法 | `/npc/npc_page/pages/Mafa.html` | 94 | 100 | 92 | 100 |
| NPC 詳頁：瓦克松 | `/npc/npc_page/pages/Dr_Vaxon.html` | 95 | 100 | 100 | 100 |
| NPC 詳頁：弗雷多 | `/npc/npc_page/pages/Fre_Do.html` | 96 | 100 | 100 | 100 |
| 地圖總覽 | `/map/` | 99 | 100 | 100 | 100 |
| 地圖互動頁 | `/map/map/` | 99 | 92 | 100 | 100 |
| 地點詳頁 | `/map/location/material-realm/` | 98 | 100 | 100 | 100 |
| 神祇總覽 | `/deities/` | 91 | 94 | 100 | 100 |
| 神祇詳頁 | `/deities/pages/trinix.html` | 97 | 100 | 100 | 100 |
| 體驗團 | `/experience/` | 96 | 96 | 100 | 100 |
| 體驗團報名 | `/experience/register/` | 98 | 98 | 100 | 100 |
| 工具總覽 | `/toolbox/` | 96 | 100 | 100 | 91 |
| 角色卡工具 | `/toolbox/character_card/` | 93 | 94 | 100 | 100 |
| 法術工具 | `/toolbox/spells/` | 94 | 100 | 100 | 91 |
| 武器工具 | `/toolbox/weapons/` | 98 | 95 | 100 | 91 |
| 護甲工具 | `/toolbox/armor/` | 99 | 100 | 100 | 91 |
| 背包工具 | `/toolbox/packs/` | 98 | 100 | 100 | 91 |
| 種族職業工具 | `/toolbox/race_class/` | 95 | 96 | 100 | 91 |
| 專長工具 | `/toolbox/feats/` | 95 | 96 | 100 | 91 |
| 其他工具 | `/toolbox/tools/` | 98 | 96 | 100 | 91 |
| 背景工具 | `/toolbox/background/` | 97 | 96 | 100 | 91 |
| 骰子工具 | `/toolbox/dice_roll/` | 100 | 100 | 100 | 91 |
| 成員頁 | `/member/` | 97 | 98 | 96 | 100 |
| 關於我們 | `/about-us/` | 95 | 90 | 92 | 100 |
| 關係圖 | `/relation-graph/` | 99 | 90 | 96 | 100 |
| 歷史時間線 | `/timeline/` | 98 | 96 | 100 | 100 |
| 歷任皇帝 | `/emperors/` | 99 | 100 | 100 | 100 |

還原圖片前，抽測的 36 種公開頁型四項均達 90 分。這些結果只供比較；表格代表頁型抽樣量測，並非逐一對每個 URL 執行 Lighthouse。

`/toolbox/character_sheet/` 為不供搜尋引擎索引的個人角色卡，保留 `noindex, nofollow`；其分數為 93/100/96/50，SEO 分數受這項刻意的索引設定影響。`/admin/` 與活動 helper 頁也保留原本的 `noindex`。

## 當時的修正摘要（圖片項目已還原）

- 將首屏圖像與站內圖示縮為 WebP，補上尺寸、載入優先順序，移除首屏圖片的延遲載入。
- 章節正文拆成每頁獨立 JSON；地點與大型列表圖片接近畫面時才載入。
- NPC 列表與詳頁使用 158 張同源公開縮圖，並保留雲端高解析閱讀連結；NPC 介紹先由 HTML 顯示，互動資料在首屏後載入。
- 調整關係圖排版運算、PC 詳頁靜態冒險紀錄、工具頁色票名稱與法術書載入時機。

## 驗證

以下為圖片還原前的驗證紀錄：`npm run locations:check`、`npm run chapters:check`、`npm run test:images`、`node --test tests/location-chapters.test.mjs` 與 `git diff --check` 均通過。

### 圖片還原後驗證

2026-10-27：上述產生器檢查、圖片測試與 `git diff --check` 再次通過。在本機 Chrome 抽查首頁、章節、NPC 列表與詳頁、PC 列表與詳頁、神祇詳頁及地點詳頁，頁面皆回應 200 並顯示主要內容；本機首屏圖片與抽查的雲端 NPC 圖片成功載入。PC 詳頁會依原有副檔名候選順序嘗試圖片，產生數個 404 後成功載入 `pc/pics/Paladin.png`。本次未重測 Lighthouse 分數。
