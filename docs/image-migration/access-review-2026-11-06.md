# Firebase 圖片存取與擴大搬移評估（2026-11-06）

結論：既定封面與章節批次可進入來源切換及逐頁驗收；尚不能把所有網站圖片視為已可直接搬移。此次僅查核，沒有上傳、切換正式來源、刪圖或部署。原訂 11/21 的觀察期及第一個完整月份帳單驗收仍未完成。

## 最新用量

2026-11-06 14:51 台北時間的唯讀 Storage／Monitoring／Billing 設定快照：

| 項目 | 結果 |
| --- | ---: |
| 區域 | US-WEST1 |
| 現存物件 | 1,280 |
| 現存容量 | 1,272,529,598 bytes（1.27 GB） |
| 近 30 天 API 請求 | 23,786 |
| 近 30 天傳出 | 8,103,612,099 bytes（8.10 GB） |
| 計費啟用 | 是 |
| 同帳單帳戶專案數 | 1 |
| Storage 費用通知 | 每月 NT$30；50%、90%、100% 通知 |

現存容量不含軟刪除與非目前版本；bucket 軟刪除保留七天。通知不是費用上限。已讀取計費啟用狀態與預算設定，沒有取得實際費用明細，不能宣稱零支出。

依 [Cloud Storage 官方價格](https://cloud.google.com/storage/pricing)，符合資格的美國區域每月免費額度為 Standard 5 GB-months、Class A 5,000 次、Class B 50,000 次，以及符合目的地條件的傳出 100 GB。Monitoring 的總 API 次數不是 Class A／B 帳單，30 天滾動觀察也不是曆月帳期。

### 存取分類與時間

30 天請求中，ReadObject 成功 11,910 次、取消 73 次、前置條件失敗兩次；GetObjectMetadata 的 NOT_FOUND 為 2,850 次。其餘包括上傳、複製、更名、刪除、列出及 metadata 查詢，不能將總數視為訪客圖片下載量，也不能把 metadata NOT_FOUND 當作網站破圖次數。

大量操作集中於 10/22–10/28 的作業期間。10/30–11/05 七個完整 UTC 日合計 968 次 API 請求、744,663,432 bytes 傳出（約 0.745 GB）；其中有八次取消讀取、兩次 metadata NOT_FOUND 與三次列出權限／登入拒絕。這些是 bucket 彙總資料，沒有依網站頁面、物件及訪客區分，不能單獨證明所有實際使用情境皆無錯誤。

## 目前來源與準備程度

- NPC 已有獨立現用清單，後續另有地點、簽名及可讀路徑搬移，不能沿用 to-do 第 11 節「只發布試搬」作為全站現況。
- 本次重新盤點 355 張地端圖片，共 530,078,637 bytes；沒有靜態引用缺檔候選或無引用候選。動態路徑仍需實際頁面驗收。
- 38 張預先上傳封面與 107 張章節圖：目前地端原圖 checksum 全部符合持久 manifest，沒有內容變更，直接沿用已發布雲端版本即可。兩類公開縮圖＋閱讀版合計 31,201,286 bytes，不需重複上傳。
- 新增三張未列入上述 manifest：`campaigns/campaign-banners/plus-c08.png`、`campaigns/chapter-banners/plus-c08-chpt01.png`、`campaigns/chapter-banners/plus-c08-chpt02.png`，合計 7,836,248 bytes。需要準備變體、私人備份及公開驗證。
- 使用最新 inventory 的來源切換 dry-run 通過：封面預計改 70 檔、章節 335 檔；有重疊，不可相加。此次沒有 apply，dry-run 不等同切換後的逐頁驗收。
- 其他 207 張、226,487,892 bytes 包括 PC 三視圖 39 張、PC 肖像 35 張、玩家提供圖片 28 張，以及 PC 素材、神祇、地圖、網站標誌與圖示等。需確認用途、公開權限及品質規格；啟動／離線所需圖示應保留本機來源。

## 正式站驗收

本次匿名逐一下載網站靜態公開引用及預備切換批次，共 960 個唯一端點、677,370,848 bytes。全部 HTTP 200、圖片 Content-Type 與 `Access-Control-Allow-Origin: *` 正常；957 個符合已記錄 checksum，一個活動圖片沒有納入舊 manifest 的 checksum 基準，其餘兩個為下述 Melvin 例外。958 個回應為一年 immutable，兩個 Melvin 回應為 `public, max-age=0, no-cache`。這次約 0.677 GB 的查核流量發生在前述 Monitoring 快照之後，後續監控會包含此次測試。

**待整理例外：Melvin 兩張公開變體。** `public-images/npcs/melvin/thumb-9a73a493.webp` 與 `reading-1e359f72.webp` 均可下載，但大小分別由 manifest 的 17,816／26,442 bytes 變成 23,798／30,040 bytes，checksum 已不一致。commit `3820c579` 與 worker 的 `REPLACED_MELVIN_IMAGES` 顯示已有針對肖像替換的快取處理，因此不判為未知破圖；不過現況違反原本以內容 checksum 命名的版本假設。建議建立符合新內容的新 hash URL、同步現用 manifest 與來源後，再依回退政策處理舊物件。此次未修正或覆寫物件，也未重新驗證私人原圖備份內容。

既有圖片瀏覽器案例共九項，首次七項通過：140 張簽名解碼及代表 NPC 頁面、出場時間表縮圖、桌面／手機試搬頁面、503 後重新載入恢復、試搬 NPC 中英文與分享 metadata、舊原圖網址退役。

另外兩項原先失敗於測試寫死 `rugatha-pwa-v52`，正式站與 repository 的 worker 實為 v54，兩份 worker SHA-256 相同。只在暫存案例中修正快取名稱後，離線整頁重載及 20 張閱讀圖冷熱載入兩項均通過；熱載入零新增網路請求、零 metadata 請求。暫存案例已移除，既有測試檔未改；應另修正寫死版本的測試，避免之後重跑誤報。

既有自動驗收使用 Chrome；收到使用者偏好後，另以 Firefox 開啟正式 NPC 頁面，但原生 UI 的畫面擷取未能取得可驗收的網站內容，故不宣稱完成 Firefox 圖片／離線驗收。社群平台實際重抓及實體 iOS／Android 仍未驗收。

## 建議執行順序

1. 先整理 Melvin 版本／manifest 例外，再將既定封面／章節切換一類，驗收列表縮圖、正文、含字圖片放大、中英文、分享 metadata 及離線快取，發布後驗證正式來源。
2. 將新增三張 Plus c08 圖納入同一流程，保留完整私人原圖。
3. PC 三視圖等另訂畫質規格。現行 worker 公開圖片離線規則只涵蓋 arcs／chapters／npcs 的 WebP；地點、簽名或新增類別不能直接視為已有相同離線保障。
4. 本次資料支持技術上的擴大，未完成原訂 11/21 一個月觀察，也未完成 11 月完整帳單核對；不因此勾選這兩個待辦。正式來源切換及原圖清理仍是後續作業。

## 證據位置

本次詳細資料保存在 repo 外暫存：`/private/tmp/rugatha-image-status-2026-11-06.json`、`/private/tmp/rugatha-usage-detail-2026-11-06.json`、`/private/tmp/rugatha-images-inventory-2026-11-06.json`、`/private/tmp/rugatha-switch-review-2026-11-06/`、`/private/tmp/rugatha-image-browser-2026-11-06.log`、`/private/tmp/rugatha-image-cache-recheck-2026-11-06.log`。重要摘要以上述本檔及後續 JSON 為持久紀錄，不依賴暫存檔永久存在。
