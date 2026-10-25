# 放大畫質驗收與下一批離線準備

日期：2026-10-22（台北時間）。已完成本輪畫質抽查與剩餘三類圖片的離線建置。**沒有上傳 Storage、切換正式圖片來源、清理原圖或部署網站。** 信件的大圖閱讀連結已在本機完成，尚未發布。

後續狀態：信件閱讀改善已發布，中文兩頁的放大連結另依使用者要求移除；原離線批次也已依新指示提前上傳，詳見 [上傳與驗證紀錄](uploaded-2026-10-22/README.md)。下文保留離線準備時的歷史狀態，正式來源尚未切換。

## 畫質結論

比較材料位於 `/private/tmp/rugatha-image-quality-2026-10-22/`，其中 `index.html` 可並排查看原圖、q85、文字無損版及部分 q92 候選；`contact-1.png` 至 `contact-3.png` 為 39 張三視圖的整體比較。原圖與比較材料均在 repo 外。

共建立 49 張來源的比較候選：39 張 PC 三視圖、五張信件、四張含字／細節插圖與一張 CMYK 封面。所有候選可解碼；目視範圍為三視圖整體比較、五張文字圖、代表性細節的原尺寸局部及完整閱讀版，並非每張素材在所有倍率下逐一像素檢驗。

| 類型 | 驗收結果與採用方式 |
| --- | --- |
| 五張莉亞信件 | 原圖中文 595×841、英文 1190×1683。原尺寸可讀，正文縮為約 225px 時文字過小；不以放大補造原圖沒有的細節。五張均採原尺寸 lossless WebP 閱讀版，保留來源圖；縮圖仍為列表用 q82。五張閱讀版共 365,624 bytes，約 357 KiB，僅比一般 q85 版本增加約 31 KiB。 |
| 含字封面／群像 | 抽查 `legends-os08.png` 與驛站群像的 1600px q85 版本，主標題及人名標示仍可辨識，無非預期裁切。一般閱讀可沿用；不能把 480px 縮圖當放大閱讀版。 |
| NPC 細節 | 抽查 Roline 的冠飾、髮絲、飾品與 Vaxon 巫妖的骨骼細節。q85 有細紋平滑，主要輪廓與辨識細節保留，可用於一般閱讀，並不等同無損原稿。 |
| 39 張 PC 三視圖 | 均為 1536×1024，不需為 1600px 上限縮小。整體比較沒有錯圖、缺側面／背面或構圖變動；Midori 義肢、Cecil 等原尺寸局部可見 q85 細紋變平滑，q92 較接近原圖。未來三視圖建議原尺寸 q92，加保留原稿；本次只做比較候選，未納入這三批的上傳 manifest。 |
| CMYK 圖片 | 離線建置發現 `lite-c09.jpg` 及 `wilds-c01-chpt01-4.jpeg` 使用 `Japan Color 2001 Coated`。原工具不能直接編碼，現改為在 repo 外依內嵌 profile 轉 sRGB PNG，再輸出 WebP；兩張原檔保持不變。抽查封面瀏覽器的原圖／sRGB 閱讀版，標題與明暗保留，有輕微色調差異，並非逐像素相同。 |

三視圖 q92 的三個比較候選如下；這是未來規格建議，不代表已生成或搬移全部 39 張 q92：

| 樣本 | q85 | q92 |
| --- | ---: | ---: |
| Al-lon | 309,286 bytes | 511,600 bytes |
| Cecil | 235,692 bytes | 403,736 bytes |
| Midori 義肢 | 288,728 bytes | 487,022 bytes |

## 本機閱讀改善與驗證

在 `campaigns/data/chapter-content.json` 的 Wilds c05 第六章中英文，五張信件加上「查看大圖（可放大閱讀）」／「View full-size image (zoom to read)」。連結開啟既有完整圖檔，保留原圖片網址、窄版排版，提供逐頁 alt、另開分頁說明與 `rel="noopener"`；其他正文不變。

Chrome 1280px／390px × 中英文共四組通過，並用鍵盤實際開啟十次完整圖片文件：中文寬 595px、英文寬 1190px。確認圖檔載入、連結指向原圖、鍵盤可用、語言切換及無水平溢出。目視抽查手機中文截圖，提示文字與圖片正常。瀏覽器僅允許 loopback，沒有正式會員或資料庫操作；不宣稱實體手機的手勢驗收。

另重新執行團錄圖片稽核：100 篇、45 處文內圖引用，沒有新增漏圖或缺檔。

## 已備妥的離線批次

實際 WebP、原圖工作副本、各批 inventory、manifest 與驗證結果位於 `/private/tmp/rugatha-image-next-batches-2026-10-22/`。此為可重建的暫存材料，不是私人 Storage 的持久原圖備份；網站原檔均保留。

| 順序／目錄 | 原圖 | 變體 | 原圖大小 | 縮圖＋閱讀版 |
| --- | ---: | ---: | ---: | ---: |
| `arcs/` 其餘封面 | 38 | 76 | 93,422,153 bytes | 8,291,406 bytes |
| `chapters/` 其餘章節插圖 | 107 | 214 | 202,332,344 bytes | 22,909,880 bytes |
| `npcs/` 其餘 NPC | 147 | 294 | 181,973,675 bytes | 17,136,038 bytes |
| 合計 | 292 | 584 | 約 455.60 MiB | 約 46.10 MiB |

已排除 20 張已發布試搬原圖，也未加入 PC、神祇或地圖。一般縮圖最長邊 480px／q82；一般閱讀版最長邊 1600px／q85，不放大來源。五張信件在各自 `readingPolicy` 明確覆寫為原尺寸無損，manifest 頂層的 q85 僅代表預設值。

保留的審閱紀錄（2026-10-25 已移除重複的 prepared 批次，改引用含正式發布資訊的 uploaded 批次）：

- [封面 manifest](uploaded-2026-10-22/arcs-manifest.json)、[章節 manifest](uploaded-2026-10-22/chapters-manifest.json)、[NPC manifest](uploaded-2026-10-22/npcs-manifest.json)：來源、尺寸、大小、SHA-256、物件路徑及 URL 與原 prepared 批次相同，另有正式上傳驗證及私人原圖備份資訊。
- [當期盤點](uploaded-2026-10-22/inventory.json)：包含新增大圖連結後的引用；不覆寫歷史基準 `inventory.json`。
- [驗收證據](verification-history.json)：各批摘要、584 個變體解碼／checksum／尺寸、原圖核對、發布與來源切換 dry-run、49 張品質候選、信件瀏覽器檢查及 15 項圖片測試結果。

三批發布 dry-run 全部通過；584 個變體逐一解碼並核對尺寸與 checksum，292 張當前來源及工作副本 checksum 也一致。來源切換 dry-run 分別預計涉及 38／86／152 個檔案，檔案有重疊，不能直接相加；dry-run 前後工作樹差異一致，未套用切換。

`npc/individual_pics/Dr. Vaxon Lich.png` 是 `npc/npc_page/assets/scripts.js` 的動態覆寫圖，沒有一般角色 entity ID，但有實際引用；保留於 NPC 批次，未來需另驗該狀態的圖片顯示。切換工具現在優先讀取批次附帶的最新 `inventory.json`，避免漏掉在舊基準後補回的驛站圖與新大圖連結；既有試搬資料夾仍使用原基準作 fallback。對兩種情況都新增了 dry-run 回歸驗證。

## 重建與後續

使用 Node 24、macOS `sips`／ColorSync 及 `cwebp` 1.6.0。先重新盤點，再使用新的 repo 外輸出目錄；工具會拒絕覆寫既有分類資料夾。

```sh
npm run images:audit -- /private/tmp/rugatha-current-images.json
node scripts/prepare-image-batches.mjs /private/tmp/rugatha-current-images.json /private/tmp/rugatha-next-images-new
npm run test:images

# 預設均為離線 dry-run，以下不帶 --publish 或 --apply
npm run images:publish -- /private/tmp/rugatha-next-images-new/arcs
npm run images:switch -- /private/tmp/rugatha-next-images-new/arcs
```

`chapters`、`npcs` 依相同方式驗證。工具會保留來源工作副本，將五張信件套用特殊閱讀規格，並分批驗證。輸出目錄被系統清除時，可從 repo 保留的原圖與工具重建。

正式上傳、私人原圖持久備份、匿名端點驗證、前端來源切換、PWA／分享 metadata 更新、正式驗收與舊檔清理仍待 2026-11-21 後觀察決策。屆時須重新盤點並確認本次之後的內容變動，不能直接把暫存 manifest 當成發布完成。
