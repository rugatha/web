# Firestore 遷移結案評估

評估日：2026-10-10（Asia/Taipei）。專案：`rugatha-87e15`。

## 結論

Firestore 已承接正式資料，資料一致性與現行權限測試通過；依使用者授權，已停用 Realtime Database。原定觀察期為 2026-09-25 至 2026-10-02，本次另檢查截至 2026-10-10 的線上資料與可取得指標。

## 線上核對

| 項目 | 結果 |
| --- | --- |
| 原始會員 | 57 / 57 仍存在 |
| 現行會員 / memberKeys / Auth | 各 60，映射一致 |
| 會員編號 | 唯一，counter 63 與最大已配置序號一致 |
| QA 作答 | 17，原始作答內容均保留 |
| QA 統計 | 12，各題 C1 / C2 / total 與作答一致 |
| 個人 QA 計數 | 與各會員 qaChoices 文件數一致 |
| 書籤 | 原始 1 筆目前為 0；使用者於本次評估確認曾主動取消 |
| 角色卡 | 4 份 |
| 會員更新 | 10 份會員文件於切換後更新 |
| RTDB 凍結資料 | 停用前與最終遷移來源完全相同 |
| Firestore / Storage Rules | 線上部署內容與 repository 相同 |
| 正式網站 | 設定及資料層與修改前的本機一致，backend 為 Firestore |
| Firestore | `(default)`、`asia-east1`、Native / Standard；backup schedules enabled |

資料核對使用 Firebase Admin / REST API，只保存摘要，不記錄會員 UID、姓名、email 或照片。最終來源 SHA-256：`cc2a88b37dfc1297f8171b6a59b0bb7b713ef7dc00f9c3ff8eea5cf9c4871ff3`。

## 用量與限制

Cloud Monitoring 查詢區間自 `2026-09-25T10:15:00Z` 至本次檢查時間，以 86400 秒對齊。此為用量指標而非帳單，資料亦有回報延遲；包含管理操作，不能完全視為一般訪客流量。

- Firestore 累計 reads 10,366、writes 728、deletes 97。讀取最多的對齊區間共 4,396，寫入最多共 209；未發現高用量情況。
- Firestore API 指標有 16 次 `FAILED_PRECONDITION` 與 6 次 `PERMISSION_DENIED`；雙重 resource 指標已去重。近期仍有少量事件，不能宣稱完全零錯誤，也不能只憑總量認定為功能故障。權限測試均通過。
- Firestore Data Access 稽核查詢未取得紀錄，無法重建每一次錯誤的使用者操作或書籤刪除過程。
- RTDB 在最後一週仍有連線，最多 2 個；在 UTC 2026-10-03 至 2026-10-04 的對齊區間有 8 次 realtime get、5 次 listen、8 次 set、1 次 update，以及 5 次遭拒寫入。停用前原始資料未改變。
- 前端仍保留 RTDB SDK 與預設回退，PWA 使用快取後更新策略，因此舊頁面或快取可能導致舊連線；這是合理推測，無法由彙總指標確認每一條連線來源。
- 沒有可靠的遷移前後延遲或帳單對照，故不宣稱精確效能提升百分比或費用節省。

## 已完成處理

- 以 Realtime Database Management API 停用 `rugatha-87e15-default-rtdb`，再次 GET 驗證狀態 `DISABLED`。此為停用 instance，沒有刪除雲端原始資料。
- 前端移除 RTDB SDK、databaseURL 與資料層回退；Auth、QA、會員照片均使用 Firestore / Storage 路徑。
- 移除無頁面使用的 `src/index.js`、RTDB deploy / emulator 設定、RTDB 規則、維護模式、遷移工具及其專用測試。
- 刪除本機 `migration-private/` 內來源、rollback 與 Rules 備份；不改動 `.venv`、`node_modules` 或正式角色卡資料。
- 保留現行 Firestore / Storage 權限與角色卡測試。管理工具的依賴清單改名為 `config/python/requirements-admin.txt`。
- PWA 快取版本由 v20 更新為 v21，於網站發布後清理舊快取。

停用 API 語意見 [Firebase 官方文件](https://firebase.google.com/docs/reference/rest/database/database-management/rest/v1beta/projects.locations.instances/disable)：停用後拒絕全部讀寫，包含 Firebase Console 資料瀏覽，之後仍可重新啟用。

## 驗證與發布狀態

- 清理前：5 項遷移測試、12 項 Rules 測試、11 項角色卡測試通過。
- 清理後：`npm test` 通過（12 項 Rules、11 項角色卡）；最後前端清理後重新執行角色卡測試，11 項通過。
- 修改的 JS 與會員頁內嵌腳本均通過 Node 語法檢查；`git diff --check` 通過。
- 線上 RTDB 停用已生效。本次 repository 修改未提交、未推送，網站尚未發布本次程式清理與 PWA v21。已部署網站設定原本即使用 Firestore。

## 2026-10-10 後續：清空 RTDB 舊資料

使用者另行明確要求清空 RTDB 舊資料。清除前再次確認 Firestore 仍有 60 位會員與 12 份 QA 統計。

因 DISABLED 狀態禁止資料操作，短暫重新啟用 RTDB，將 Rules 設為根節點 `.read: false`、`.write: false`，驗證 Rules 後刪除 RTDB 根節點。DELETE 成功回傳 JSON `null`，再 GET 驗證根節點為 `null`，最後恢復停用並重新 GET 確認狀態 `DISABLED`。

因此，前述初次結案時保留的雲端 RTDB 舊資料現已清空。預設 RTDB instance 保留且停用；本次未修改 Firestore、Auth 或 Storage 資料。
