# 個人法術書：驗收、上線與回退

目前程式已支援 Firestore 同步與本機匯入；正式環境的 `spellbookSyncEnabled` 仍為 `false`。本文件是可執行的上線程序，不代表已部署、啟用或完成正式觀察。

## 驗收

```sh
npm ci
npm run test:browser:setup
npm run test:all
```

需要 Node 24、Java 21+、Python 3。瀏覽器驗收方法、涵蓋範圍與限制見 [tests/browser/README.md](../tests/browser/README.md)。先使用測試帳號，保留所有本機來源。自動化資料只位於 `demo-rugatha` Emulator，不能以它替代正式專案權限確認。

## 上線順序

1. 記錄即將部署的 commit，確認包含本次所有新模組。`spellbookSyncEnabled: false`，`spellbookSyncMemberUids: []`，`dataWritesEnabled: true`。
2. 部署新增且向下相容的 Rules：

   ```sh
   npx firebase deploy --project rugatha-87e15 --only firestore:rules
   ```

3. 再經現有 GitHub Pages 流程部署前端。勿先開啟同步；發布後從正式網站確認所有 `shared/spellbook*.js` 與 `shared/spellbooks.js` 能載入，service worker 為 v22，舊本機來源仍在。
4. 小範圍驗收時，在 `shared/firebase.config.js` 將 `spellbookSyncEnabled` 改為 `true`，`spellbookSyncMemberUids` 設為指定測試帳號的 Authentication UID 陣列，部署設定檔。非白名單帳號會看到同步停用提示，且不讀寫其法術書。
5. 用測試帳號在兩個獨立瀏覽器驗證：第一次建立、確認匯入、取消／稍後處理、增刪、清空、重新整理、登出換帳號、離線重試及權限。用不同帳號確認他人文件無法讀寫，管理員也無例外。測試清單與原始來源另備份；不要清空玩家資料。
6. 完成正式冒煙測試後，以 `spellbookSyncEnabled: true`、`spellbookSyncMemberUids: []` 開放所有會員。發布玩家說明：「請使用原本儲存法術的瀏覽器與網站登入，按確認合併匯入；出現已同步後再離開。」頁面內已有中英雙語說明。

`spellbookSyncMemberUids` 僅為前端分階段開關，不是 Security Rules 的權限邊界；Rules 始終限制本人讀寫。設定檔採 network-first，避免上線時在線瀏覽器先拿到一輪舊開關。既有開啟頁籤需要重新整理才會讀到新部署設定。

## 觀察紀錄

至少記錄正式開始／結束時間、前端版本、Rules 版本、測試 UID、兩端結果及復原來源位置。觀察 Firebase Console 的錯誤與讀寫量，以及玩家回報的未完成匯入；不要收集原始本機法術、帳號 token 或其他私密資料到公開 log。

| 日期／時段 | 版本／範圍 | 權限與快取 | 匯入／同步錯誤 | 讀寫量 | 決策 |
| --- | --- | --- | --- | --- | --- |
| 待正式上線填寫 | — | — | — | — | — |

相容期目前沒有截止日期。只有在測試帳號、正式冒煙測試、PWA 更新與復原全部驗收，並確認沒有未完成匯入後，才能另訂來源清理時間與公告；本次沒有任何自動清理舊 key 的程式。

## 暫停與回退

- 暫停寫入：部署 `dataWritesEnabled: false`。會員畫面顯示寫入暫停；已載入清單仍可查看。當頁待同步操作保留於記憶體，重新啟用後可重試，離頁前有確認提示。這也會暫停既有其他共用資料寫入，須依全站維護需求使用。
- 只停用法術書：部署 `spellbookSyncEnabled: false`。會員畫面明示雲端清單不顯示，編輯停用；不會切成訪客備份。已載入頁面若透過 `rugatha:feature-flags-changed` 套用新旗標，待同步佇列仍保留；若重新整理則會失去未提交的記憶體操作。已送出的請求仍可能完成於原帳號文件。
- 復原服務：保留新 Rules、雲端文件、舊 key、訪客 key 與按 UID 的匯入紀錄。恢復開關並重新整理或重試，既有雲端資料會重新載入。
- 前端回退：使用含有上述停用提示的版本，不能直接回到只讀舊 `rugatha.phb.spellbook` 的版本，否則玩家可能誤認本機資料仍與雲端一致。勿刪除空文件或匯入紀錄；勿將舊本機備份自動覆寫雲端。Rules 新增路徑保留，避免已建立的資料變得無法存取。

前端旗標不能撤回已提交的交易，也不會立刻改變尚未重新整理的舊頁籤；如需緊急撤銷伺服器寫入權限，應另行部署暫停寫入 Rules 並在 Emulator 驗證後處理。實際正式部署、開放、觀察與回退演練仍需另行執行並記錄。
