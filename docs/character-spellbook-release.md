# 角色法術書發布與回退

日期：2026-10-19（台北）。狀態：本機完整驗測與最後帳號回歸通過，分階段正式發布中。

使用者已決定：角色書本人可編輯、管理員唯讀；名稱採頁面重名檢查；正式驗收使用兩個專用臨時帳號，驗收後清理；本次不新增 PDF，保留待辦。

## 發布順序

1. 比對正式 Firestore Rules 與發布前 repository 版本，保存 Rules release 與內容。已確認正式 Rules `35ba63d0-a849-4050-b615-a81c6cb01e65` 與開發前 HEAD 相同。
2. 發布相容 Rules：接受 schema 1／2 角色建立與原地升級、禁止 schema 2 降版；先加入角色書父文件與 atomic delete 約束。這個短暫相容版本只把最終 Rules 的「角色 create 必須 schema 2」改為「schema 1 或 2」。角色書入口仍關閉。
3. 發布含固定 ID、版本化資源與 PWA v24 的前端；`characterSpellbooksEnabled: false`。核對 Pages workflow 成功、正式 HTML、設定檔及模組內容。
4. 發布最終 Rules，禁止舊前端新建 schema 1。舊 schema 1 仍可在原 ID 更新或升級；升級後不可降版。
5. 以兩個專用測試 UID 設定 `characterSpellbookMemberUids`，啟用角色書；個人書 `spellbookSyncEnabled` 與既有白名單不變。
6. 正式驗收個人／角色／會員隔離、改名、複製、角色卡／法術頁雙頁同步、離線重試、匯出阻擋、清空重載、管理員唯讀、390px 畫面。
7. 實際部署停用角色入口版本，確認雲端文件保留；恢復後再驗收。全部通過後清空角色書 UID 白名單並正式開放。
8. 僅清理本次專用測試帳號、memberKeys、測試 member 與已知角色／法術書文件；不倒退會員編號計數器，不操作玩家資料。

每次切換旗標都更新法術頁與角色卡的 `firebase.config.js?v=...`，等待 Pages 完成並核對正式內容。設定檔採 network-first，但 CDN 可能保留舊 URL 回應，版本參數不可省略。

## 回退

- 關閉 `characterSpellbooksEnabled`，保留 `spellbookSyncEnabled` 與個人書開放狀態。更新設定檔版本、發布並要求既有頁籤重新整理。
- 保留角色 schema 2、固定 ID、最終 Rules、空角色書文件及所有舊法術欄位；不要回退到以名稱搬移文件的程式。
- 不刪除角色書、不把舊索引或個人書自動覆蓋回角色書。空書代表使用者已清空。
- 已送出的交易仍可能完成於原來的角色路徑。當頁未提交操作保留，切書前提供取消／明確放棄；換帳號後不得提交到新帳號。
- 恢復時重新啟用角色書旗標並更新設定版本；既有角色書直接恢復，不重新匯入。

## 驗測與範圍

- `npm run test:all`：Rules Emulator、個人書與角色卡單元回歸、Chromium 瀏覽器驗收。
- 測試需要 Node 24、Java 21、已下載的版本固定 catalog／Firebase SDK／Chromium。受限環境啟動 loopback Emulator 需允許本機埠號。
- 舊索引僅接受 `2026-10-18-v1` catalog。未知索引、環數不符或來源版本不符會列出原值並阻擋轉移。轉移 transaction 再次確認父文件、預覽來源及目標書仍不存在。
- 備份 v2 的 `data.characterSpellbook` 儲存當前角色書的英文 PHB ID；匯入建立獨立角色。雲端未確認、離線待同步或還原未完成時不允許匯出。
- 本次沒有新增 PDF 產生功能，也不宣稱完成實體 iOS／Android 裝置測試。
- Auth 在初始化時統一 persistence，避免不同頁面先用預設儲存再搬移登入狀態；相關 API 行為見 [Firebase Auth persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence) 與 [Auth 自訂依賴](https://firebase.google.com/docs/auth/web/custom-dependencies)。

## 正式執行紀錄

本機 `npm run test:all` 已通過：Rules 28、個人書單元 25、角色卡／角色資料單元 16、Chromium 34。另補驗舊登入資料相容及角色入口停用／恢復。正式執行結果待填入，不以 Emulator 結果代替正式驗收。


兩個專用測試帳號已建立。設定測試 email 後原匿名登入憑證失效；現有簽章權限回傳 403。使用者明確允許限定 service account 的臨時 Token Creator 授權，僅簽兩個測試 UID 的一小時 custom token。臨時 binding 已移除，原 IAM bindings 前後一致。備份、UID、驗收腳本、瀏覽器登入資料與 token 僅留本機忽略目錄；不提交或公開憑證。


發布前最後角色／帳號補測 13 項通過（含 9 項角色書、舊登入相容、停用恢復及個人書換帳號回歸）。純單元與角色卡回歸重新執行 41 項通過，`git diff --check` 無錯誤。
