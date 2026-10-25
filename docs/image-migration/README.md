# 公開圖片遷移紀錄

2026-10-25 NPC 雲端整理：158 位角色主圖與 Dr. Vaxon 仍使用的特殊型態，共 159 張現用圖片，以 [npc-current.json](npc-current.json) 為唯一現用清單。318 個公開 WebP 變體與 159 張私人原圖已逐一讀回核對。角色頁、分享圖、入口頁、神祇頁、團錄選項與特殊型態皆使用雲端來源；地端原圖、歷輪生成候選、審查 HTML 與回報 JSON 已清理。舊版雲端物件於正式站切換後移除，依既有七天軟刪除政策自動到期。以下為其他圖片與先前遷移作業的歷史記錄，不代表舊 NPC 物件仍被保留。

日期：2026-10-21（台北時間）。進度追蹤見 [`../../to-do.md`](../../to-do.md)。本階段只試搬 `rugatha-c01`，其餘圖片保留原來源。

2026-10-22 後續更新：依使用者新指示，[其餘三批圖片已先上傳並驗證](uploaded-2026-10-22/README.md)，包含 584 個公開變體與 292 張私人原圖備份；正式頁面仍只使用既有試搬範圍，尚未切換下一批來源。

## 範圍與證據

- 基準 commit：`76dc518e051d6048d0b375c845f8115e117e9e62`。
- [`inventory.json`](inventory.json)：521 張圖的尺寸、格式、大小、SHA-256、靜態引用位置、重複圖及待確認項目。這是切換前盤點；動態組合路徑仍需瀏覽器驗證，沒有靜態引用不等於可以刪除。
- [`pilot-manifest.json`](pilot-manifest.json)：一張故事弧封面、七張章節圖與十二張相關 NPC 圖；既有 entity ID 保留。每張含 480px 最長邊縮圖（品質 82）與 1600px 最長邊閱讀版（品質 85），不放大小圖。
- [`verification-2026-10-22.json`](verification-history.json)：2026-10-22 的當前盤點摘要、20 張／40 個變體重建比較、40 個公開端點驗證與唯讀 Storage／Monitoring 快照；待辦評估與本次測試結果見 [`to-do.md` 第 13 節](../../to-do.md#13-可執行項目評估與重驗2026-10-22)。不取代搬移前基準或原圖持久備份證據。
- [重複圖與無引用圖片查核](reference-review-2026-10-22.md)：四組重複圖與四張候選圖的使用位置、歷史及十頁 Chrome 請求證據；其後依使用者要求移除五張，將 Lite c12 第四章驛站群像補回中英文正文。追加驗證見 [cleanup-2026-10-22.json](verification-history.json)；清理與補圖已以 `46f445b` 發布並完成正式站驗證。
- [全站團錄文內插圖漏接檢查](chapter-inline-audit-2026-10-22.md)：100 篇團錄及新舊 HTML 比對，未發現尚未修復的漏圖；10 篇含圖團錄的中英文／桌面手機 40 組檢查、90 次圖片顯示通過。附可重跑工具及機器可讀證據。
- [放大畫質驗收與下一批離線準備](quality-and-offline-preparation-2026-10-22.md)：五張信件原尺寸無損閱讀版與本機大圖連結、39 張三視圖比較、292 張／584 個後續變體的分批 dry-run 及驗收；尚未上傳、切換或發布。
- [信件閱讀 PWA／離線驗收與發布](letter-pwa-release-2026-10-22.md)：worker v28、章節 JSON 更新、v27 升級、斷網整頁重載及原圖開啟驗收；閱讀改善的發布進度與後續批次 Storage 搬移分開處理。
- 20 張原始圖共 30,782,719 bytes；閱讀版共 2,999,674 bytes，減少約 90.3%；加上縮圖後共 3,450,410 bytes。
- 抽查章節場景與 NPC 圖像的閱讀版，未見裁切或透明背景處理異常。三視圖、含文字圖片等尚未納入試搬，需另做放大品質驗收。
- 依使用者後續要求，20 張試搬原圖已從 repository 工作樹移除，減少 30,782,719 bytes（29.36 MiB）；其餘圖片不變。完整原圖已存入私人 Storage 備份，詳見下方原圖清理紀錄。

## 雲端與費用

沿用 `rugatha-87e15.firebasestorage.app`，已實際讀取確認為 `US-WEST1`，專案計費啟用。查得同帳單帳戶目前僅連結一個專案；這不代表免費額度永遠不會被其他用量占用。

上傳前 live objects：6 個，共 1,475,242 bytes，不含 soft-deleted／非目前版本物件。既有 bucket default storageClass 回傳 `REGIONAL`；新圖片明確指定 `STANDARD`，不更動既有預設。bucket 有 7 天 soft-delete retention，後續清理與容量預估需一併考慮。

已啟用 Budget API，建立只針對本專案 Cloud Storage 的每月 **NT$30** 通知，實際支出達 50%、90%、100% 時通知預設帳單管理員。金額依既有帳單幣別 TWD 設定；通知不會自動停止服務或限制支出，未啟用 spend cap。

近期唯讀 Monitoring 查詢曾取得近 30 天 504 次 API 請求、145,615,859 bytes 傳出；包含此次搬移與測試，且有資料延遲，不能直接視為訪客下載量或帳單 Class B 次數。最新可重跑快照見 [`storage-status.json`](verification-history.json)。

免費額度判斷：目前儲存量與近期監控用量均有相當餘裕；仍須觀察正式前端切換後一個團務週期及第一個完整計費月，不能以試搬結果保證永久免費。

## 權限與發布

公開物件使用 `public-images/{arcs|chapters|npcs}/{asset-id}/{sha256}/{thumb|reading}.webp`。只開放對應路徑的匿名 get，禁止客戶端 list／write（包含應用程式 admin）。發布使用既有 CLI 登入的 IAM 權限，不開放 bucket 公開 IAM，不建立 download token。

正式原 Rules 已下載備份並逐字確認與本機修改前一致，再新增圖片規則。備份位於 `/private/tmp/rugatha-image-migration/2026-10-21/rollback/`，原 Ruleset：`de330c90-8ea5-40c6-b4ce-d494c2b88a87`。新 Rules 已部署；40 個圖片變體皆已完成正式匿名下載、checksum、Content-Type、Cache-Control 與 CORS 驗證。

發布採用 GCS multipart create，把 bytes 與 metadata 原子寫入，並使用 `ifGenerationMatch=0`。已存在物件只讀回驗證，內容或 metadata 不同則停止。內容更新必須使用新 hash 路徑，不覆寫 immutable URL。

## 前端與 PWA

- NPC 資料使用 `image` 閱讀版與 `imageThumb` 縮圖；NPC 列表、相關角色卡優先讀縮圖，主肖像讀閱讀版。
- 故事弧／章節列表讀縮圖，章節 HTML 與社群預覽讀閱讀版；靜態主圖提供 srcset、尺寸與 CORS 設定。
- NPC 列表使用 lazy loading，避免初次瀏覽下載全部人物圖片。
- `sw.js` v27 僅快取指定 bucket 與公開路徑，拒絕 token URL、其他 bucket、私人照片與完整原圖備份。明確 CORS fetch 後僅保存可讀且成功的 WebP 回應。
- 圖片 cache 採 cache-first，最多 120 筆、32 MiB、30 天；單張超過 1 MiB 不寫入，併發寫入序列化後淘汰最舊項目。
- 已快取圖片可離線顯示，首次未快取且離線時使用預先快取的 192px 網站圖示。
- HTTP 失敗或非 WebP 回應也使用預設圖；預設圖設 `Cache-Control: no-store`，不存入原圖片的 Cache Storage。不做自動重試，下一次載入頁面再取圖；Chrome 同一頁內可能重用已解碼圖片，驗收以重新載入頁面為重試界線。
- 修改頁面已更新共用程式的版本參數；既有頁籤重新整理後再驗收。

## 指令

使用 Node 24；盤點需要 macOS `sips`，圖片輸出需要 `cwebp` 1.6.0（本次版本）。Rules 測試需 Java 21 以上。

```sh
npm run images:status -- /private/tmp/rugatha-image-storage-status.json
npm run images:audit
npm run images:prepare -- /absolute/path/outside/repo/pilot rugatha-c01
```

`prepare` 先核對原圖與 inventory checksum，備份與驗證原圖，再產生圖片。manifest 使用本次已確認的 bucket 與公開 URL；正式 publish 會再次確認 bucket 位於符合資格的美國區域。重新產生輸出前先備份既有 manifest；不可任意覆蓋既有發布紀錄。

`images:audit` 預設把當前盤點寫入 OS temp 的 `rugatha-image-current-inventory.json`，不覆寫已提交的搬移前 `inventory.json`。可用 `npm run images:audit -- /outside/current.json` 指定輸出。後續新批次應採當期清單；本次 frozen inventory 保留作為試搬重建與回退證據。

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

- 前端切換後重新輸出同一批，20 張原圖的 entity ID 與 40 個變體 checksum 均完全一致；再次 dry-run 驗證通過。
- 本機來源切換／回退演練：24 檔恢復後只剩原有 Rules 變更，再重新套用。工具會拒絕覆蓋後續編輯。
- 圖片工具、清理防護與 PWA 單元測試：13 項通過，涵蓋引用解析、slug 碰撞、禁止 repo 內輸出、私有 URL 隔離、快取筆數及容量。
- 圖片 Rules Emulator：3 項通過，包含匿名讀取、禁止列出／寫入／刪除、私人照片／原圖備份隔離與既有法術檔讀取。
- 圖片 Chrome 驗收：3 項通過，桌面／390px 手機驗證故事弧及七章、NPC 主肖像及列表縮圖；真實 Service Worker 驗證暖快取離線與冷圖片預設圖。
- 既有 `npm test` 回歸通過，另已驗證更新後的既有 PWA 四項測試。
- 截圖位於 `test-results/image-browser/image-pilot-{desktop,mobile}.png`，不提交 Git。
- 尚未驗證實際社群平台重新抓取結果、實體 iOS／Android 裝置、完整計費月或長期流量。正式頁面發布狀態與觀察起點另記於下方。

## 清理與回退

依使用者 2026-10-21 後續要求，先清理已搬移及驗證的 20 張原圖；其餘批次仍等待 11/21 用量觀察。本次選擇退役這批舊圖片直連網址，不提供轉址；頁面網址及其新分享圖片來源維持可用。四張未找到靜態引用的圖及四組相同內容圖片均保留，待逐項確認。

盤點另發現四處既有副檔名錯誤，已修正為實際檔名：chapter-content 中的 `plus-c07-chpt01.png`、`plus-c07-chpt02.png`、`plus-c07-chpt04.png`，以及 detail 中的 `brown-c02.jpg`。

未做後續手動編輯的來源切換可用 `npm run images:switch -- /outside/pilot --rollback` 還原。該工具遇到後續變更會停止，避免覆蓋修改。本次已另做快取、縮圖、版本參數與引用修復；發布後應以 Git revert 完整試搬 commit，更新 worker／載入版本後驗證回退。雲端物件先保留；若需回退 Rules，先比對正式差異，不直接覆蓋後續發布。

## 原圖清理與持久備份（2026-10-21）

- 完整原圖物件：`image-originals/{category}/{asset-id}/{original-sha256}/original.{ext}`，同一個 `US-WEST1` bucket，使用 Standard storage、`private, no-store`，不建立下載 token。既有 Rules 的 default deny 已涵蓋此路徑，不必放寬權限。
- [`pilot-manifest.json`](pilot-manifest.json) 記錄每張原圖的物件路徑、checksum 與 generation；[`original-archive-verification.json`](verification-history.json) 保存首次逐張讀回驗證紀錄。
- 清理前重新匿名下載 40 個公開變體，並透過 IAM 逐張讀回 20 個私人原圖；重新掃描全站靜態引用及原始／編碼檔名均為零引用，才刪除 repo 副本。清單與證據見 [`pilot-retirement.json`](pilot-retirement.json)。
- 已將這 20 個舊路徑逐條加入 `.gitignore`，避免原圖誤加回 repo。新盤點為 501 張圖、709,860,303 bytes（約 676.98 MiB），遺失引用候選為零。
- 刪除後，從雲端還原到全新外部目錄，20 張原圖 checksum 均一致；使用還原檔重新產生的 40 個變體與線上版本完全一致。證據見 [`original-restore-verification.json`](verification-history.json)。
- Git 歷史未重寫，歷史 commit 仍保有舊檔；此次只減少當前工作樹與部署圖片負擔，不宣稱完整 clone 同步縮小。

```sh
# 前兩條僅用於尚未清理的批次：預設檢查來源，--archive 才會上傳。
# 已清理的試搬批次請使用 --verify 或 --restore。
npm run images:originals -- docs/image-migration/pilot-manifest.json
npm run images:originals -- docs/image-migration/pilot-manifest.json --archive
npm run images:originals -- docs/image-migration/pilot-manifest.json --verify

# repo 副本移除後，透過 IAM 還原到 repo 外，不會寫回網站目錄。
npm run images:originals -- docs/image-migration/pilot-manifest.json --restore /outside/restored
RUGATHA_IMAGE_ORIGINALS_DIR=/outside/restored npm run images:prepare -- /outside/rebuilt rugatha-c01

# 適用尚未刪除的未來批次；所有雲端驗證成功前不刪任何本機圖片。
npm run images:retire -- /path/to/reviewed-manifest.json
npm run images:retire -- /path/to/reviewed-manifest.json --apply
```

清理工具拒絕有引用、checksum 變動、缺原圖 archive generation、缺任一公開變體、重複來源或非圖片範圍的路徑。刪除操作逐筆寫入清單；已刪除的批次不需再跑清理。需要回退時，先 revert 清理 commit 以恢復原圖及忽略規則，再依需要回退較早的前端切換。也可從雲端還原至外部目錄核對後進行修復，不能只把舊 mapping 切回不存在的檔案。

### 保留與清理政策

完整原圖備份永久保留，除非使用者另行要求刪除。公開變體保留目前及回退所需版本；被新版本取代後至少保留一年（對應 immutable 快取期限），且只有確認沒有前端／manifest 引用、不再需要回退並完成舊直連使用評估後，才人工決定是否刪除。每月複查容量與費用通知，將軟刪除的 7 天容量也列入估算；不設定自動刪除原圖的 lifecycle rule。

### 補充驗收

- 原圖備份 Rules：匿名、一般會員與應用程式 admin 都不可讀、列出、寫入或刪除；IAM 備份工具可逐張讀回。
- HTTP 503：顯示一次預設圖，不污染圖片 cache、不自動重試；下一次頁面載入恢復正常圖。
- 快取到期：30 天後重新取圖；離線時移除過期項目並使用預設圖。
- 冷熱載入測量採隔離瀏覽器中的 20 張閱讀版：冷載 20 次網路請求、熱載 0 次、metadata 請求 0 次。payload 大小來自精確 manifest；耗時僅表示本次受控測量，不是全站前後測速比較。
- 私人照片登出：真實會員頁／Web SDK 搭配 Auth、Firestore、Storage Emulator，完成上傳、登入可讀、登出導回首頁、重開會員頁不顯示、匿名讀取拒絕；登出前後所有 Rugatha Cache Storage 均無私人照片，私人請求未由 Service Worker 回應。只使用 demo 帳號與測試圖片。
- 既有瀏覽器回歸共 36 個案例逐項通過：初跑 35 項通過，1 項因圖片與既有測試同時清理輸出 trace 而失敗；隔離輸出後重跑通過。新增會員照片隱私案例另行通過。測試介面缺少會員頁啟動程式、計數器初始化與登出導頁等待的問題已修正；未因此改動會員頁正式流程。
- 正式站七項圖片案例逐項通過：桌面、手機、真正離線重載、HTTP 失敗後重載恢復、20 圖冷熱載入、十二個 NPC 中英文及分享 metadata，以及 20 個原圖舊網址退役。結果見 [傳輸與正式驗收紀錄](verification-history.json)。
- 更新後的 `npm run test:all` 包含既有功能、圖片 Rules 與圖片瀏覽器驗收。現有 Chrome 可用 `RUGATHA_TEST_BROWSER_CHANNEL=chrome`（既有套件）、`RUGATHA_IMAGE_BROWSER_CHANNEL=chrome`（圖片套件）；兩組測試已使用獨立輸出目錄，避免互相清理 trace。

## 正式發布紀錄

- 前端 commit：`91b9510015805a0fdf9844cb9e2f2c0708752b31`，已推送 main。
- [Deploy Pages 成功](https://github.com/rugatha/web/actions/runs/39594860522)。正式故事弧、七章與 NPC 頁面已通過隔離 Chrome 桌面／手機驗收，確認不請求這批舊圖；正式 Service Worker v26 已驗證暖快取離線顯示與冷圖片預設圖。驗收時間：2026-10-21 晚間（台北）。
- 正式驗收指令：`RUGATHA_IMAGE_TEST_BASE_URL=https://rugatha.com RUGATHA_IMAGE_BROWSER_CHANNEL=chrome npm run test:image-browser`；只允許 GET，阻擋正式 Auth、Firestore 等外部端點。
- 團務週期觀察：依使用者決定，觀察一個月，於 **2026-11-21 後**檢查用量與費用，再決定是否擴大批次；目前保留其他 repo 圖片；試搬原圖以私人 Storage 保存。此處是待辦日期，未建立背景排程。
- 第一個完整計費月：2026 年 11 月，待月結資料可用後核對。
- 原圖清理 commit：`a15e2402ba093da282899d01dff3079bd02a2bcd`。
- [清理版 Deploy Pages 成功](https://github.com/rugatha/web/actions/runs/39600771345)。正式 worker v27 與本機 SHA-256 相同；七項圖片案例已逐項通過，20 個舊圖片網址均回傳 404／410，新公開圖片正常顯示。
- 正式 HTTP 重試案例初次遇到測試用空白頁重載落入 GitHub 404 的路由問題；改由 context 攔截 worker 的測試頁請求後重跑通過。並補強離線驗收，先透過真實 navigation handler 快取測試頁、移除測試路由，再離線整頁重載及顯示原圖片，避免只驗到同一頁的已解碼圖片。正式網站流程未因此變更。

最新用量快照：66 個現存物件、35,708,371 bytes（約 34.1 MiB），包含 20 個私人完整原圖；不含 soft-deleted 物件，仍需依 11/21 觀察計畫核對實際帳單。
