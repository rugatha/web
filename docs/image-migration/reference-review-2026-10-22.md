# 重複圖與無引用圖片查核

日期：2026-10-22（台北時間）。以下先記錄用途調查當時的結果；查核階段沒有刪圖。機器可讀證據見 [reference-review-2026-10-22.json](verification-history.json)。使用者其後指定的清理與補圖另記於文末，前段數量及請求證據保留為修改前基準。

重新執行圖片盤點：501 張圖片、四組 SHA-256 完全相同的重複圖、四張遷移範圍內無靜態引用候選圖、遺失引用候選為零。另搜尋原始／URL 編碼名稱、檢查不含副檔名的 `pc/pc_lib`、PC 與團錄動態組圖程式、Git 歷史，並用本機 Chrome 開啟十個相關頁面。

## 四組重複圖

| 組別／大小（每份） | 使用證據 | 判定 |
| --- | --- | --- |
| `assets/banner/rugatha-experience.jpeg` 與 `campaigns/campaign-banners/exp-e03.jpeg`；1,844,121 bytes | 前者用於 `experience/index.html` 的 OG／Twitter 圖與 `shared/calendar-events.json`；後者用於體驗頁海報，Chrome 實際載入成功。首頁程式依行事曆資料動態建立圖片。 | 兩路徑都有用途。若要去重，須先將引用統一後再清理其中一份；不能直接刪除任一檔。 |
| `assets/logo/rugatha-icon-512.png` 與 `assets/logo/rugatha-icon-maskable-512.png`；162,427 bytes | `manifest.webmanifest` 與 `sw.js` 均列出兩個路徑；目前兩個 manifest 項目都宣告 `purpose: any maskable`。 | 建議保留。屬必要 PWA 圖示，本計畫也已明定留在網站內；若另行精簡，需要同步修改 manifest、預快取清單及驗收安裝／更新。 |
| `npc/individual_pics/Yi.jpg` 與 `pc/pics_by_players/Yi.jpg`；190,380 bytes | NPC 資料及 Yi 頁面的 OG／Twitter 圖使用前者；NPC Chrome 實際載入前者。PC Yi 頁面實際載入的是另一張 `pc/pics/Yi.png`。未發現 `pics_by_players` 的程式引用。 | NPC 原路徑應保留；`pics_by_players/Yi.jpg` 是可整理的重複素材副本，但需先確認是否有玩家原稿保存需求。不可把 PC 現用的 `Yi.png` 當作重複檔清理。 |
| `pc/pics/Cecil.png` 與 `pc/pics_by_players/Cecil Heinrich.png`；2,570,191 bytes | Cecil 頁面的 OG／Twitter 圖使用前者；PC 列表與詳細頁透過角色名嘗試副檔名，Chrome 最後載入前者。未發現後者或 `pics_by_players` 的程式引用。 | `pc/pics/Cecil.png` 應保留；`pics_by_players/Cecil Heinrich.png` 是可整理的重複素材副本，保存需求同上。 |

兩份未接入網站的 `pics_by_players` 重複副本合計 2,760,571 bytes（約 2.63 MiB）。整理它們不需要改變目前 PC／NPC 顯示來源，但本次尚未刪除，也未建立它們的私人 Storage 持久備份。

## 四張無靜態引用候選圖

| 檔案 | 查核結果 | 建議 |
| --- | --- | --- |
| `campaigns/campaign-banners/plus1-c01.png`；2,025,955 bytes | 圖上標題為「To the Deep and Back」。commit `19fd8d8`（2025-12-12）移除 Plus 1 節點，改列 Legends 的 `legends-os09`；現用封面為 `legends-os09.png`，Chrome 載入成功。 | 舊系列封面素材，目前未接入網站。可移至素材備份後再考慮清理，不應直接視為沒有保存價值。 |
| `campaigns/chapter-banners/plus1-c01-chpt01.png`；2,342,785 bytes | 同一 commit 明確移除 `plus1-c01-chpt01` 的圖片 mapping，並新增 `legends-os09` 對應來源。目視為獨立殭屍場景插圖，不是上述舊封面的相同檔。 | 舊章節插圖，目前未接入網站。建議與 Plus 1 舊封面一同歸檔。 |
| `campaigns/chapter-banners/lite-c12-chpt04-01.png`；2,393,504 bytes | 目視為標有角色名的長青林驛站群像，與現用章節首圖 `lite-c12-chpt04.jpeg`（黑白雙格插圖）不同。commit `9184320`（2026-07-08）移除中英文 HTML 中的這張文內插圖，改用共用 JSON；該 commit 的新 JSON 及目前 JSON 都未包含它。前後段落仍在，目前 Chrome 只載入首圖。 | **疑似正文遷移漏圖，應保留並優先補回中英文正文。** 原位置在首個日期段落、介紹七名妖精圍桌交談之後。確認前不可當成廢圖清理。 |
| `campaigns/chapter-banners/rugatha-c04-chpt05.jpeg`；1,384,136 bytes | commit `0fe7235`（2026-06-24，Alter AI banner art）明確將頁面與 mapping 由 `.jpeg` 換成 `.png`。Chrome 現在載入 `.png`。目視兩張均為競技場惡魔場景，但構圖不同，不是僅換格式的同圖。 | 已被替換的舊版插圖。可備份後清理；現用 `.png` 應保留。 |

四張共 8,146,380 bytes（約 7.77 MiB），其中驛站群像應排除於清理候選；其餘三張為 5,752,876 bytes（約 5.49 MiB）的舊素材。若連同兩張 PC 重複副本整理，候選總量為五張、8,513,447 bytes（約 8.12 MiB），仍需處理素材備份需求。

## 本機瀏覽器驗證

Chrome 開啟體驗頁、PC 列表、Cecil／Yi 個別 PC 頁、Yi NPC 頁、Lite c12 第四章、Rugatha c04 第五章、Legends os09、Legends 列表及 Plus 列表，共十頁。八個指定現用圖片來源全部載入成功；四張無引用候選與兩張 `pics_by_players` 副本的請求數為零。

測試封鎖外部網路與 Service Worker；圖片測試伺服器不提供無副檔名檔案，因此透過測試 route 原樣提供工作樹的 `pc/pc_lib`，沒有修改正式檔案。這些結果限目前工作樹與上述頁面，不涵蓋所有互動或站外直接連結的使用情況。圖檔內容相同也不代表作者來源或原稿保存需求相同。

## 使用者指定清理與補圖（同日追加）

依使用者後續指示，移除兩份 `pics_by_players` 重複圖、Plus 1 舊封面與章節圖，以及 `rugatha-c04-chpt05.jpeg`，共五張、8,513,447 bytes（約 8.12 MiB）。刪除前逐一核對上方查核的 SHA-256；原圖可由 Git 歷史還原，沒有另建 Storage 備份或轉址，尚未部署正式站。

`campaigns/data/chapter-content.json` 的 Lite c12 第四章中英文首個日期段落，各補回一筆圖片 HTML，位置均在七名妖精圍桌交談之後。保留 `chapter-image--narrow` 窄版置中樣式、原圖尺寸與 lazy loading，分別提供中文與英文 alt；指定高度自動縮放，避免尺寸屬性使圖片變形。其餘既有正文完全未變。

追加驗證：

- 重新盤點 496 張、703,726,292 bytes；無引用候選與遺失引用候選均為零，剩餘兩組重複圖為已決定保留的活動海報及 PWA icon。
- `npm run test:images`：13 項通過。
- 本機五個刪除路徑均回傳 404；Cecil、Yi NPC、Rugatha c04 第五章與 Legends os09 的現用圖片仍能載入。
- Chrome 實際寬度 1280px／390px，中文及切換英文共四組均通過：正文插入位置正確、圖片成功載入、alt 正確、原比例縮放且頁面沒有水平溢出；另目視檢查桌面中文與手機英文截圖。
- 初次測試的語言狀態與 viewport 初始化有誤，修正測試後重跑四組檢查；沒有因此改動網站邏輯。完整說明及結果見 [cleanup-2026-10-22.json](verification-history.json)。截圖位於忽略提交的 `test-results/image-cleanup/`。
