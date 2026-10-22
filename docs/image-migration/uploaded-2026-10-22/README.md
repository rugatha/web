# 後續圖片批次：已上傳，尚未切換來源

2026-10-22（台北時間）。依使用者新指示，提前上傳已離線準備的三批圖片，覆蓋先前「11/21 後才上傳」的作業安排；正式來源切換與擴大使用仍待觀察決策。前端基準為 `f7905f09fc382b4e2da7b54157427e09d160b6cf`，本次沒有改動頁面、Service Worker、Rules 或刪除 repository 原圖。

| 類別 | 原圖／私人備份 | 公開 WebP 變體 | 公開容量 |
| --- | ---: | ---: | ---: |
| 封面 | 38 | 76 | 8,291,406 bytes |
| 章節插圖 | 107 | 214 | 22,909,880 bytes |
| NPC | 147 | 294 | 17,136,038 bytes |
| 合計 | 292 | 584 | 48,337,324 bytes（46.10 MiB） |

292 張私人原圖共 477,728,172 bytes（455.60 MiB）。本次新增 876 個物件、526,065,496 bytes（501.70 MiB）；bucket 現存物件從 66 個／35,708,371 bytes 增至 942 個／561,773,867 bytes（535.75 MiB），差額與清單完全一致。容量不含 soft-deleted／非目前版本物件。

## 驗證與持久紀錄

- 三份 manifest：[封面](arcs-manifest.json)、[章節](chapters-manifest.json)、[NPC](npcs-manifest.json)。每個公開變體保存 hash、物件路徑、URL、大小及尺寸；每張原圖保存私人 archive 路徑、checksum、generation、private/no-store metadata。`publication` 記錄本輪上傳驗證，不再將 URL 視為未上傳的候選。
- [完整驗證摘要](verification.json)：584 個公開物件全部經管理端讀回與獨立匿名下載核對 SHA-256、Content-Type、immutable Cache-Control 與 CORS。所有 292 張私人原圖管理端讀回一致，匿名請求均為 401／403，無 download token。使用既有 create-only 發布工具，沒有覆寫不同內容的既有物件。
- [當前 inventory](inventory.json)：重新盤點後確認三類來源數量與全部原圖 hash 一致；引用已反映移除兩張中文信件放大連結的最新正文。來源及工作副本均核對通過。
- [瀏覽器驗證](browser-verification.json)：13 張代表圖片、26 個變體，含五張信件、兩張 CMYK 轉色來源、驛站群像、Roline 與 Vaxon 巫妖圖片；真實正式 v28 worker 下可正常顯示。1280px／390px 斷網整頁重載後各顯示 26 個變體，確認 Service Worker 回應且無水平溢出。這是受控圖片顯示驗證，尚未驗收下一批完整頁面的來源切換或 Vaxon 動態流程。
- [來源切換 dry-run](source-switch-dry-run.json)：封面／章節／NPC 分別預計改動 38／86／152 檔；存在重疊，不可相加，且未套用。
- [上傳前 Storage 快照](storage-before.json)、[上傳後 Storage 快照](storage-after.json)：Monitoring 包含本次上傳、讀回與瀏覽器驗證且有延遲，不能把新增用量當成純訪客流量或實際計費 Class B 次數。

執行紀錄暫存於 `/private/tmp/rugatha-{upload,archive}-{arcs,chapters,npcs}-2026-10-22.log`；摘要保存六份 log 的 SHA-256。已上傳的原圖與變體不依賴這些暫存檔保留。

## 之後直接切換，不必重傳同一批

內容相同的物件可直接沿用既有 hash URL。臨時 WebP／比較頁被系統清除也不影響雲端圖片，來源切換只需要本目錄保存的 manifest 與重新盤點的 inventory。範例為封面 dry-run：

```sh
mkdir -p /private/tmp/rugatha-images-switch/arcs
cp docs/image-migration/uploaded-2026-10-22/arcs-manifest.json /private/tmp/rugatha-images-switch/arcs/manifest.json
npm run images:audit -- /private/tmp/rugatha-images-switch/arcs/inventory.json
npm run images:switch -- /private/tmp/rugatha-images-switch/arcs
```

章節與 NPC 同理。切換前仍需核對原圖是否有新增／修改、目前引用與公開端點狀態，再經頁面與快取驗收後發布；這不需要重新搬移已存在且內容相同的圖片。若圖片內容或輸出規格改變，必須產生新 hash 版本，既有 immutable 物件保留。現階段不清除原圖；PC 三視圖、神祇、地圖未納入本次上傳。
