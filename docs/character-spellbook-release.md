# 角色法術書發布與回退

日期：2026-10-19（台北）。狀態：正式發布、恢復驗收與測試帳號清理完成。

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


- 相容 Rules 已發布：`5a226416-3eea-4638-b807-e71d816bb411`。
- 固定 ID 前端 `b16c88b` 已發布，角色入口仍關閉；[Pages workflow](https://github.com/rugatha/web/actions/runs/39147179973) 成功。兩個 HTML、版本化設定與九個共用模組內容比對一致。
- 最終 Rules 已發布：`a6e03b71-f65c-4f9b-8776-b6e64058ee85`；正式內容比對一致。只以兩個專用 UID 開啟角色書驗收。


- 專用 UID 驗收版 `f1fcd91` 已發布：[Pages workflow](https://github.com/rugatha/web/actions/runs/39147391124)。
- 正式驗收於 2026-10-19 01:08（台北）通過：個人／角色／會員隔離、明確複製、固定 ID 改名、角色卡與法術頁雙向即時同步、離線待同步匯出阻擋與重試、清空後重載、管理員唯讀且無個人書權限、390px 角色卡。六個非法操作皆為 permission-denied：schema 1 新建、schema 2 降版、單獨刪父／書、任意 bookId、無父文件建立。
- 管理員驗收僅暫設專用 B 帳號的 admin claim，驗收後已移除並刷新 token。沒有修改玩家權限。
- 手機截圖檢視另發現原有 CSS 會覆寫 hidden 屬性，露出舊法術區新增按鈕；已用法術區限定 CSS 修正，補測後一併發布停用演練版。


- 停用演練版 `d961579` 已部署：[Pages workflow](https://github.com/rugatha/web/actions/runs/39148382013)。2026-10-19 01:16（台北）兩個帳號均確認載入 rollback 設定、角色編輯停用、A 空書與 B 的 Mage Hand 保留；個人書仍正常同步。
- 演練確認既有含角色參數的網址也須重新整理，不能只重新導航到已快取的頁面；重新整理後兩端的設定版本與旗標均確認正確。未重新整理的舊頁籤／已提交交易不會被前端旗標立即撤銷。
- 手機舊按鈕 CSS 修正的角色書同步／匯出／390px 補測 1 項通過。
- 接續清空角色書 UID 白名單並恢復角色書；個人書開放設定保持原值。


- 首次全面開放 `73b1247`：[Pages workflow](https://github.com/rugatha/web/actions/runs/39148877857) 成功，正式設定與模組一致。
- 結案檢查補上舊法術尚未轉移時的備份阻擋：有舊選取或未知原值但角色書不存在時，顯示轉移／明確清空的提示，不輸出假的空角色書；原始欄位保留。沒有舊選取的空白草稿仍可備份。此修正使用 UI 模組版本 2 與 PWA v25；正式設定 URL 再升版 public2。
- 備份保護補測：單元／角色卡 41 項、角色書備份／舊轉移／新草稿 Chromium 3 項通過，空白舊草稿補測 1 項也通過。


- 最終修正版 `e82e21d`（public2、角色 UI v2、PWA v25）：[Pages workflow](https://github.com/rugatha/web/actions/runs/39149251495) 成功，兩個 HTML、設定與共用模組內容一致。
- 2026-10-19 01:24（台北）恢復／公開驗收通過：角色書旗標 true、UID 白名單為空；A 空書與 B 非空書均恢復，個人書保持可用。390px 無水平溢出且舊新增按鈕已隱藏。正式臨時舊角色先驗證未轉移時不能輸出空備份，再確認轉移，Fireball 正常進入角色書並可匯出；該臨時角色以 atomic batch 刪除。
- 2026-10-19 01:25–01:26（台北）清理及唯讀複核完成：兩個專用 Auth 帳號不存在；會員 0000-0066／0000-0067 的 12 個已知會員、映射、角色與法術書文件皆不存在；登入 profiles 與 custom token 檔案移除。會員計數器未修改。指定 service account 的 IAM bindings 再次比對原始備份一致。
- 正式觀察未發現本次受控驗收中的未完成同步；此結論只涵蓋列出的測試帳號與案例，不代表實體手機或所有玩家裝置皆已驗證。PDF 按使用者決策保留待辦。
