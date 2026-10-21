# 公開圖片遷移紀錄

日期：2026-10-21（台北時間）。進度追蹤見 [`../../to-do.md`](../../to-do.md)。本階段只試搬 `rugatha-c01`，其餘圖片保留原來源。

## 範圍與證據

- 基準 commit：`76dc518e051d6048d0b375c845f8115e117e9e62`。
- [`inventory.json`](inventory.json)：521 張圖的尺寸、格式、大小、SHA-256、靜態引用位置、重複圖及待確認項目。這是切換前盤點；動態組合路徑仍需瀏覽器驗證，沒有靜態引用不等於可以刪除。
- [`pilot-manifest.json`](pilot-manifest.json)：一張故事弧封面、七張章節圖與十二張相關 NPC 圖；既有 entity ID 保留。每張含 480px 最長邊縮圖（品質 82）與 1600px 最長邊閱讀版（品質 85），不放大小圖。
- 20 張原始圖共 30,782,719 bytes；閱讀版共 2,999,674 bytes，減少約 90.3%；加上縮圖後共 3,450,410 bytes。
- 抽查章節場景與 NPC 圖像的閱讀版，未見裁切或透明背景處理異常。三視圖、含文字圖片等尚未納入試搬，需另做放大品質驗收。
- 原始圖片完整留在 repository；試搬原圖 checksum 備份與輸出暫存位於 `/private/tmp/rugatha-image-migration/2026-10-21/pilot/`。暫存不是長期備份，清除 repository 原圖之前必須另準備持久備份。

## 雲端與費用

沿用 `rugatha-87e15.firebasestorage.app`，已實際讀取確認為 `US-WEST1`，專案計費啟用。查得同帳單帳戶目前僅連結一個專案；這不代表免費額度永遠不會被其他用量占用。

上傳前 live objects：6 個，共 1,475,242 bytes，不含 soft-deleted／非目前版本物件。既有 bucket default storageClass 回傳 `REGIONAL`；新圖片明確指定 `STANDARD`，不更動既有預設。bucket 有 7 天 soft-delete retention，後續清理與容量預估需一併考慮。

已啟用 Budget API，建立只針對本專案 Cloud Storage 的每月 **NT$30** 通知，實際支出達 50%、90%、100% 時通知預設帳單管理員。金額依既有帳單幣別 TWD 設定；通知不會自動停止服務或限制支出，未啟用 spend cap。

近期唯讀 Monitoring 查詢曾取得近 30 天 504 次 API 請求、145,615,859 bytes 傳出；包含此次搬移與測試，且有資料延遲，不能直接視為訪客下載量或帳單 Class B 次數。最新可重跑快照見 [`storage-status.json`](storage-status.json)。

免費額度判斷：目前儲存量與近期監控用量均有相當餘裕；仍須觀察正式前端切換後一個團務週期及第一個完整計費月，不能以試搬結果保證永久免費。

## 權限與發布

公開物件使用 `public-images/{arcs|chapters|npcs}/{asset-id}/{sha256}/{thumb|reading}.webp`。只開放對應路徑的匿名 get，禁止客戶端 list／write（包含應用程式 admin）。發布使用既有 CLI 登入的 IAM 權限，不開放 bucket 公開 IAM，不建立 download token。

正式原 Rules 已下載備份並逐字確認與本機修改前一致，再新增圖片規則。備份位於 `/private/tmp/rugatha-image-migration/2026-10-21/rollback/`，原 Ruleset：`de330c90-8ea5-40c6-b4ce-d494c2b88a87`。新 Rules 已部署；40 個圖片變體皆已完成正式匿名下載、checksum、Content-Type、Cache-Control 與 CORS 驗證。

發布採用 GCS multipart create，把 bytes 與 metadata 原子寫入，並使用 `ifGenerationMatch=0`。已存在物件只讀回驗證，內容或 metadata 不同則停止。內容更新必須使用新 hash 路徑，不覆寫 immutable URL。

## 前端與 PWA

- NPC 資料使用 `image` 閱讀版與 `imageThumb` 縮圖；NPC 列表、相關角色卡優先讀縮圖，主肖像讀閱讀版。
- 故事弧／章節列表讀縮圖，章節 HTML 與社群預覽讀閱讀版；靜態主圖提供 srcset、尺寸與 CORS 設定。
- NPC 列表使用 lazy loading，避免初次瀏覽下載全部人物圖片。
- `sw.js` v26 僅快取指定 bucket 與公開路徑，拒絕 token URL、其他 bucket 與私人照片。明確 CORS fetch 後僅保存可讀且成功的 WebP 回應。
- 圖片 cache 採 cache-first，最多 120 筆、32 MiB、30 天；單張超過 1 MiB 不寫入，併發寫入序列化後淘汰最舊項目。
- 已快取圖片可離線顯示，首次未快取且離線時使用預先快取的 192px 網站圖示。
- 修改頁面已更新共用程式的版本參數；既有頁籤重新整理後再驗收。

## 指令

使用 Node 24；盤點需要 macOS `sips`，圖片輸出需要 `cwebp` 1.6.0（本次版本）。Rules 測試需 Java 21 以上。

```sh
npm run images:status -- docs/image-migration/storage-status.json
npm run images:audit
npm run images:prepare -- /absolute/path/outside/repo/pilot rugatha-c01
```

`prepare` 先核對原圖與 inventory checksum，備份與驗證原圖，再產生圖片。manifest 使用本次已確認的 bucket 與公開 URL；正式 publish 會再次確認 bucket 位於符合資格的美國區域。重新產生輸出前先備份既有 manifest；不可任意覆蓋既有發布紀錄。

```sh
npm run images:publish -- /absolute/path/outside/repo/pilot
npm run images:publish -- /absolute/path/outside/repo/pilot --publish
npm run images:switch -- /absolute/path/outside/repo/pilot
npm run images:switch -- /absolute/path/outside/repo/pilot --apply
```

第一條 publish 僅驗證本機檔案。正式 publish 需先部署並驗證 Rules；雲端驗證成功後才 apply 前端。switch 工具使用切換前 inventory，保留 JSON 既有格式及非圖片文字，並將改動來源備份至輸出目錄。未指定批次時 prepare 預設試搬；`all` 僅表示準備第一階段三類圖片，不代表可以跳過分批觀察。

```sh
npm run test:images
npm run test:image-rules
npm run test:image-browser
```

瀏覽器測試預設使用 Playwright Chromium（首次 `npx playwright install chromium`）；可用 `RUGATHA_IMAGE_BROWSER_CHANNEL=chrome` 改用已安裝 Chrome。測試只允許 loopback 與無 token 的公開圖片端點，阻擋正式 Auth、Firestore、分析等請求，不使用玩家登入。

## 已完成驗證與限制

- 本機來源切換／回退演練：24 檔恢復後只剩原有 Rules 變更，再重新套用。工具會拒絕覆蓋後續編輯。
- 圖片工具與 PWA 單元測試：6 項通過，涵蓋引用解析、slug 碰撞、禁止 repo 內輸出、私有 URL 隔離、快取筆數及容量。
- 圖片 Rules Emulator：2 項通過，包含匿名讀取、禁止列出／寫入／刪除、私人照片隔離與既有法術檔讀取。
- 圖片 Chrome 驗收：3 項通過，桌面／390px 手機驗證故事弧及七章、NPC 主肖像及列表縮圖；真實 Service Worker 驗證暖快取離線與冷圖片預設圖。
- 既有 `npm test` 回歸通過，另已驗證更新後的既有 PWA 四項測試。
- 截圖位於 `test-results/image-pilot-{desktop,mobile}.png`，不提交 Git。
- 尚未驗證實際社群平台重新抓取結果、實體 iOS／Android 裝置、完整計費月或長期流量。正式頁面發布狀態與觀察起點另記於下方。

## 清理與回退

本階段不移除任何原始圖片，因此舊外部網址仍可用。四張未找到靜態引用的圖及四組相同內容圖片均保留，待逐項確認。

盤點另發現四處既有副檔名錯誤，已修正為實際檔名：chapter-content 中的 `plus-c07-chpt01.png`、`plus-c07-chpt02.png`、`plus-c07-chpt04.png`，以及 detail 中的 `brown-c02.jpg`。

未做後續手動編輯的來源切換可用 `npm run images:switch -- /outside/pilot --rollback` 還原。該工具遇到後續變更會停止，避免覆蓋修改。本次已另做快取、縮圖、版本參數與引用修復；發布後應以 Git revert 完整試搬 commit，更新 worker／載入版本後驗證回退。雲端物件先保留；若需回退 Rules，先比對正式差異，不直接覆蓋後續發布。

## 正式發布紀錄

- 前端：待發布與正式網址驗證。
- 團務週期觀察：待正式發布後開始；觀察完成前不擴大批次。
- 第一個完整計費月：待核對。
