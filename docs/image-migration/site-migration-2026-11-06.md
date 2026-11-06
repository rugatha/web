# 其餘網站圖片搬移與發布（2026-11-06）

使用者指定：根目錄 `assets/` 與 `campaigns/campaign-logos/` 保留，其他正式網站圖片搬至雲端；純本機檔案不動，完成驗收的截圖刪除，通過後正式部署。這批與同日先前的 Melvin／Plus c08 及 150 張原圖清理一併發布。

## 範圍與結果

| 類別 | 圖片數 |
| --- | ---: |
| PC 肖像 | 35 |
| PC 三視圖 | 39 |
| 玩家提供圖片 | 28 |
| PC 雙語角色卡 | 32 |
| 神祇 | 12 |
| 帝王 | 8 |
| 關於我們 | 7 |
| 地圖 | 1 |
| 會員頁背景 | 1 |
| NPC 頁面背景 | 1 |
| 合計 | 164 |

共 211,684,369 bytes（211.68 MB／201.88 MiB），公開副本及私人完整原稿各 164 個物件。這批保留**原始格式、解析度及完全相同的 bytes**，沒有縮圖或重新有損壓縮；三視圖、角色卡文字、透明背景與地圖細節保持原樣。

公開物件使用 `public-images/site/{collection}/{asset-id}/image-{hash8}.{ext}`，私人原稿使用 `image-originals/site/{collection}/{asset-id}/original-{hash8}.{ext}`。兩者均指定 STANDARD、無下載 token；公開回應為一年 immutable，私人原稿為 `private, no-store`。客戶端只能 get 允許類別的公開物件，不能 list／write；私人原稿維持 IAM-only。

已完成兩次完整雲端讀回：第一次在發布時逐張核對，第二次在刪除地端前重新核對全部 328 個物件的 generation、checksum、Content-Type、Cache-Control、CORS 與私人匿名拒絕。Pascal 玩家圖的一次上傳發生 headers timeout，已獨立以相同 create-only 路徑重試成功，完成後才切換網站與清理。

完整現用清單、原圖 SHA-256、尺寸、公開 URL、備份及 generation 見 [site-current.json](site-current.json)；逐筆刪除證據見 [site-images-retirement-2026-11-06.json](site-images-retirement-2026-11-06.json)。

## 引用、快取與保留項目

靜態 HTML、分享 metadata、CSS 背景及動態資料已同步。PC `pc_lib` 的 `image` 改用完整雲端 URL；PC 列表／詳頁、角色總覽拼貼、團錄 PC 卡片不再猜測地端副檔名。會員角色卡雙語欄位也直接使用公開 URL。舊 catalog 中指向兩張不存在的 Psyber 卡片之項目已略過，沒有製造替代圖片。

worker 升至 **v56**，只允許已核對類別與 hash 檔名的原格式圖片加入 CORS 快取，依副檔名核對 MIME。此類原尺寸圖片單張上限為 10 MiB，其他既有圖片維持 1 MiB；整體仍為 120 筆／32 MiB／30 天，依容量淘汰，不宣稱所有圖片可同時離線保存。三視圖已完成實際 HTTPS 離線整頁重載。

本輪沒有改動根目錄 assets 的 35 張、campaign-logos 六張、113 張本機工作圖片、一張測試 fixture 與九份本機生成提示檔，前後 checksum 全部相同。剩餘網站圖片清單見 [搬移後清單](local-images-after-migration-2026-11-06.md)。驗收截圖及本輪臨時原圖副本已清理，純本機的 `output/imagegen/` 提示檔保留；清理明細見 [qa-cleanup-2026-11-06.json](qa-cleanup-2026-11-06.json)。

## 驗收

- 圖片工具、清理及 PWA 單元：20 項通過；Storage Rules Emulator：六項通過。
- 管理目錄：10 項通過；101 篇章節檔案與管理目錄生成檢查通過。
- HTTP 圖片瀏覽器套件：19 項全部通過，包含既有九項、上一批四項與本輪六項。
- 本輪六項 HTTPS 案例通過：全部 164 張依原尺寸解碼、桌面／390px 手機完整頁面、地圖縮放、三視圖真正離線整頁重載及雙語卡片清單；PC 跨團重複卡片改以 35 張唯一肖像及 44 張卡片核對，另重驗兩組頁面原尺寸與 `decode()`，避免預設圖或 async decode 誤判。
- 體驗回饋表單使用 demo Firestore Emulator smoke 通過，未寫入正式使用者資料。
- 目視確認 PC 桌面／手機、關於我們與互動地圖；刪除後缺檔候選為零。
- 私人原圖抽樣還原一張三視圖及 SVG 背景，checksum 相同，臨時還原副本驗完移除。
- 發布包只有保留的 41 張網站圖片，與原檔 checksum 相同；本機工作素材與測試檔不在網站發布包中。

Firefox 的獨立 Playwright profile 在本次工作期間無法啟動，因此沿用已確認的 Chrome 測試環境。實體手機與實際社群平台重抓不包含在以上自動化結果中。

## 容量與觀察

本輪完成後 live objects 共 1,620 個，1,704,728,137 bytes（約 1.70 GB），不含七天軟刪除與非目前版本。NT$30 Storage 費用通知保留，並非支出上限；尚未核對實際帳單。11/21 的用量觀察及第一個完整月份帳單核對繼續保留。

## 重跑與還原

```sh
npm run test:images
npm run test:image-rules
RUGATHA_IMAGE_BROWSER_CHANNEL=chrome npm run test:image-browser
RUGATHA_IMAGE_TEST_HTTPS=1 RUGATHA_IMAGE_BROWSER_CHANNEL=chrome \
  npm run test:image-browser -- site-images.spec.mjs

# 還原至 repo 外，不把原稿重新加入網站工作樹。
node scripts/site-image-assets.mjs restore \
  docs/image-migration/site-current.json /private/tmp/site-image-restore
```

原圖永久保存於私人 Storage，除非使用者另行要求刪除。公開版本內容變更時應發布新 hash 路徑，不覆寫既有 immutable URL。若需回退前端，應先恢復所需地端原稿並驗證，不能把頁面單獨切回已退役的檔案路徑。

## 正式發布

本批次已完成發布前驗收，將透過 main 的既有 **Deploy Pages** workflow 發布到 [rugatha.com](https://rugatha.com)。正式部署結果與逐頁複驗將補於本節及 [機器可讀摘要](site-migration-2026-11-06.json)。
