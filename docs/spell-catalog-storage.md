# 法術資料來源：Firebase Storage

完整法術與職業施法進度 JSON 改存 Firebase Storage，repo 只保留載入設定、checksum 與程式碼。每個版本使用新的物件路徑；不覆寫既有版本，也不改動會員法術書。

## 目前資料

Bucket：`rugatha-87e15.firebasestorage.app`，版本：`2026-10-18-v1`。

| 物件 | 大小 | SHA-256 |
| --- | ---: | --- |
| `catalogs/spells/2026-10-18-v1/spells-phb.json` | 1,155,035 bytes；361 個法術 | `0d1745e0565461a88006fdf68e483c604d471968a051eea61f0ead9a3d0ccd46` |
| `catalogs/spells/2026-10-18-v1/class_spells.json` | 4,975 bytes | `e1440268ea6d4a3c742a6427873ad720b1f502ba2c45d5b3a21d94f67f580538` |

`shared/spell-catalog.js` 提供版本化下載網址，三個使用頁面為 `toolbox/spells/`、`toolbox/character_sheet/`、`toolbox/race_class/`。不需要登入或下載 token。Storage Rules 僅公開上述兩種檔名的 get，禁止所有客戶端 list/create/update/delete；發布使用現有 Firebase CLI 帳號的 Google Cloud IAM 權限，不開放前端寫入。原有 CORS 已允許 GET／HEAD，沒有放寬私人照片權限或 bucket IAM。

本次逐 byte 保留原資料，包含法術順序。角色卡目前仍使用陣列索引當作既有選項 ID，因此更新內容時不能重排或移除既有法術；新增法術需另行處理相容性。Firestore Rules 中的英文名稱白名單屬於權限驗證，仍保留在 repo，沒有完整說明內容。

## 更新與發布

1. 在 repo 外準備 `spells-phb.json`、`class_spells.json`，保留既有法術識別碼與順序。
2. 在 `shared/spell-catalog.js` 設定新的版本、大小與 SHA-256。若法術名稱集合變更，先部署向下相容的 Firestore 白名單與測試；不要移除玩家仍持有的識別碼。
3. 執行 `npm run catalog:publish -- /absolute/source-directory`。工具先驗證兩檔 checksum、基本格式及 Rules 識別碼集合，才使用 CLI 登入上傳。以 `ifGenerationMatch=0` 防止覆寫；再次執行只會讀回並確認既有物件，內容不同就停止。
4. 下載到新暫存目錄並驗證：`RUGATHA_SPELL_CATALOG_TEST_DIR=/path/outside/repo npm run test:catalog:setup`。測試與本機 server 使用相同目錄；正式前端不讀此目錄。
5. 同步更新 service worker 的兩個公開 URL 與 cache 版本，以及三頁載入 `spell-catalog.js` 的版本參數、`shared/pwa.js` 的 worker 版本參數和引用它的頁面。版本參數避免 CDN 舊檔；既有頁籤需重新整理。
6. 執行 `npm run test:all`，先上傳與驗證雲端來源，再發布前端。驗證三個正式頁面、CORS、checksum、搜尋與 PWA 後，才移除 repo 的舊資料檔。

公開物件使用 `Cache-Control: public, max-age=31536000, immutable`，因此內容更新一定要發新版本，不能在 Console 覆寫同一路徑期待即時生效。資料回退只需讓 descriptor 與 worker URL 指向保留的舊版本，並更新程式載入版本參數；不刪除會員資料、不重新匯入、不調整法術索引。

## 離線與測試

PWA v23 只額外攔截兩個完全相符的公開 catalog URL；不攔截 Auth／Firestore／私人 Storage 請求。已讀取過的 catalog 可從 runtime cache 離線讀取，首次未快取且離線時會顯示載入失敗。版本化物件採 stale-while-revalidate；更新 worker 時清理舊 Rugatha cache。

初次測試先執行 `npm run test:browser:setup`，或只執行 `npm run test:catalog:setup` 準備資料。測試使用 OS temp，預設為 `rugatha-spell-catalog/2026-10-18-v1/`；暫存刪除後需重新下載。測試用 HTTP server 把公開 Storage 來源替換成本機 `/__catalog__/`，瀏覽器仍阻擋所有外部主機。

## 轉移驗收紀錄

- Storage Rules 部署前已比對正式版本與原 HEAD 一致並保留備份；新增版本為 `de330c90-8ea5-40c6-b4ce-d494c2b88a87`。
- 兩檔已上傳；從正式 Firebase 下載至全新暫存，SHA-256 與原始來源一致。GET 回傳 `application/json`、跨來源 `Access-Control-Allow-Origin: *`，不使用下載 token。
- 重複發布已讀回兩個物件並驗證一致，未覆寫。
- 本機與正式頁面驗收結果、前端發布及 repo 舊檔移除紀錄於完成驗收後填入。
