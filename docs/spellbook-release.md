# 個人法術書：驗收、上線與回退

2026-10-18 已完成正式分階段上線與回退演練；`spellbookSyncEnabled: true`、`spellbookSyncMemberUids: []`，所有會員可用。相容期持續保留，沒有刪除玩家本機來源。

## 驗收

```sh
npm ci
npm run test:browser:setup
npm run test:all
```

需要 Node 24、Java 21+、Python 3。瀏覽器驗收方法、涵蓋範圍與限制見 [tests/browser/README.md](../tests/browser/README.md)。先使用測試帳號，保留所有本機來源。正式站只有匿名／Google 登入，匿名 token 缺少既有會員規則必填的 email；本次為兩個專用 UID 補上不可投遞的 `example.test` email，經明確授權以短效 custom token 驗收，未開啟 Email/Password 供應商。簽發所需臨時 IAM 綁定已移除，所有原有 bindings 與備份一致。本機自動化資料位於 `demo-rugatha` Emulator；另執行的正式冒煙測試僅使用上述兩個測試帳號。

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

`spellbookSyncMemberUids` 僅為前端分階段開關，不是 Security Rules 的權限邊界；Rules 始終限制本人讀寫。設定檔採 network-first；正式驗收發現 Cloudflare 對 JavaScript 回傳 `max-age=14400`，因此法術頁的設定檔 URL 另外帶發布版本（`?v=spellbook-…`）。每次改變 rollout／回退開關，必須同時更新法術頁的版本參數，再部署並核對正式 HTML 與該設定檔內容。network-first 無法單獨繞過 CDN 的舊回應。既有開啟頁籤需要重新整理才會讀到新部署設定；必要時清除 CDN 快取。

## 觀察紀錄

至少記錄正式開始／結束時間、前端版本、Rules 版本、測試 UID、兩端結果及復原來源位置。觀察 Firebase Console 的錯誤與讀寫量，以及玩家回報的未完成匯入；不要收集原始本機法術、帳號 token 或其他私密資料到公開 log。

| 日期／時段 | 版本／範圍 | 權限與快取 | 匯入／同步錯誤 | 讀寫量 | 決策 |
| --- | --- | --- | --- | --- | --- |
| 2026-10-18 19:39–19:42（台北） | Rules `35ba63d0-a849-4050-b615-a81c6cb01e65`；前端 `5b61c53` | 與原 Rules 比對一致後新增路徑；Pages 成功；正式模組 SHA-256 一致 | 同步停用，已建立兩個專用匿名測試帳號 | Monitoring 尚未回傳此時段樣本，不能視為零 | 以 `75ac8ac` 限定測試 UID，進行正式驗收 |
| 2026-10-18 19:54–19:59（台北） | 白名單 `75ac8ac`；CDN 修正 `d450336` | 匯入／稍後／未知來源保留、雙 context 即時增刪、換帳號、拒絕他人讀寫／list／非法法術、離線重試及 PWA v22 全部通過 | 測試來源 3 筆，已知 2 筆匯入；完成紀錄阻止重新匯入。A 清空後仍為空文件，B 保留 Mage Hand | 已讀取 Monitoring，樣本有延遲；分開記錄 lookup/query/not-found 及 noop，避免重複加總 | 可進行正式停用／恢復演練；保留相容期 |
| 2026-10-18 20:01–20:02（台北） | 停用演練 `1e9b37a` | Pages 成功、HTML 與版本化設定比對一致；兩帳號顯示停用、編輯鎖定、隱藏雲端清單 | A 的空文件及 B 的 Mage Hand 原封保留；沒有切回訪客資料冒充雲端 | 僅讀取測試文件，無清除雲端資料 | 正式停用策略通過，接續恢復並全面開放 |
| 2026-10-18 20:04–20:05（台北） | 全面開放 `c10dab3` | [Pages 成功](https://github.com/rugatha/web/actions/runs/39125670071)，HTML 與 `?v=spellbook-20261018-public` 設定一致；白名單空、同步 true | A 空書及 B 非空書均恢復；訪客維持本機，390 × 844 無水平溢出 | 監控查詢 19:39–20:05，最新樣本到 20:03，詳見下文 | 正式開放；兩個測試帳號及其文件已清理，會員計數器未倒退 |

相容期目前沒有截止日期；本次觀察決策為繼續相容，保留所有本機原始來源與按帳號的匯入紀錄。只有在測試帳號、正式冒煙測試、PWA 更新與復原全部驗收，並確認沒有未完成匯入後，才能另訂來源清理時間與公告；本次沒有任何自動清理舊 key 的程式。


本次初期觀察查詢時間為 2026-10-18 19:39–20:05（台北），最後可見樣本到 20:03，包含全站其他功能與測試流量，不能當成法術書專屬用量或完整帳單：

- `document/read_ops_count`：LOOKUP 217、QUERY 220、NOT_FOUND 23。
- `document/write_ops_count`：CREATE 6、UPDATE 47、UPDATE_NOOP 41；分別記錄，不將 noop 當作新增文件。
- `api/request_count` 僅選 `database_id=(default)` 的 resource，避免與舊 resource 重複計數：BatchGetDocuments OK 115、Commit OK 90、GetDocument OK 4、Commit PERMISSION_DENIED 7。可見樣本沒有其他 response code；測試過程包含匿名會員初始化拒絕與刻意越權案例，聚合數據無法逐一歸因為玩家錯誤。
- 受控測試帳號的匯入均已完成；刪除來源中的法術後不會被 receipt 再次匯入。沒有全體玩家的本機匯入完成率，不能由測試成功推定所有玩家已匯入。
- 決策：繼續相容期，不訂來源清理日期；保留舊 key、訪客 key、雲端文件及按 UID 的匯入紀錄。後續觀察玩家回報及 Monitoring，另行決定何時結束相容期。本項完成的是初期觀察與保留相容的決策。

專用測試 UID 與 IAM 前後備份、原始驗收結果、截圖及監控樣本保存在本機忽略目錄 `migration-private/spellbook-release-20261018/`，不含 token 或瀏覽器登入資料。已確認臨時 IAM 綁定移除、原有 bindings 一致；兩個測試 Auth 帳號與其 Firestore 文件已刪除，沒有操作玩家帳號資料。會員編號 64／65 不回收，避免與其他註冊競態。

## 暫停與回退

- 暫停寫入：部署 `dataWritesEnabled: false`。會員畫面顯示寫入暫停；已載入清單仍可查看。當頁待同步操作保留於記憶體，重新啟用後可重試，離頁前有確認提示。這也會暫停既有其他共用資料寫入，須依全站維護需求使用。
- 只停用法術書：部署 `spellbookSyncEnabled: false`。會員畫面明示雲端清單不顯示，編輯停用；不會切成訪客備份。已載入頁面若透過 `rugatha:feature-flags-changed` 套用新旗標，待同步佇列仍保留；若重新整理則會失去未提交的記憶體操作。已送出的請求仍可能完成於原帳號文件。
- 復原服務：保留新 Rules、雲端文件、舊 key、訪客 key 與按 UID 的匯入紀錄。恢復開關並重新整理或重試，既有雲端資料會重新載入。
- 前端回退：使用含有上述停用提示的版本，不能直接回到只讀舊 `rugatha.phb.spellbook` 的版本，否則玩家可能誤認本機資料仍與雲端一致。勿刪除空文件或匯入紀錄；勿將舊本機備份自動覆寫雲端。Rules 新增路徑保留，避免已建立的資料變得無法存取。

本次已實際部署停用版本並驗證資料保留；恢復結果見上表。前端旗標不能撤回已提交的交易，也不會立刻改變尚未重新整理的舊頁籤；如需緊急撤銷伺服器寫入權限，應另行部署暫停寫入 Rules 並在 Emulator 驗證後處理。日後回退仍須更新設定版本參數並等待正式部署生效；不能只修改本機設定。

## 本機歷史產物整理（2026-10-25）

舊測試腳本、截圖、監控樣本與失敗紀錄已清理；原始規則、IAM、正式發布與回退資訊仍保存在忽略提交的 `migration-private/`。本文中的驗收結果與復原程序保留，歷史產物路徑不代表檔案目前仍存在。未刪除玩家資料或瀏覽器 localStorage。
