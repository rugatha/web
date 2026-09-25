# Rugatha Firestore 遷移執行手冊

更新：2026-09-25

## 已確認的固定值

- Firebase project：`rugatha-87e15`
- Firestore database：`(default)`
- Firestore location：`asia-east1`
- Storage bucket：`rugatha-87e15.firebasestorage.app`
- 初始來源 SHA-256：`66e4e58cdf4512b035902bdd7feeedcb610e29d244a85f158420c03d822305a1`
- 現行網站 backend flag：`rtdb`
- 預計觀察期：7 天

## 匯入前

1. 執行 `npm test`；所有 migration 與 Rules 測試必須通過。
2. 用最新 RTDB export 再執行一次 `dry-run`，不可沿用較早 export 當最終切換來源。
3. 保存 RTDB export、RTDB Rules 與來源 hash；不可提交 Git。
4. 將 `dataWritesEnabled` 暫時設為 `false` 並部署網站，停止會員資料寫入。
5. 再取一次最終 RTDB export；確認筆數、關聯、文件大小與 Auth UID。
6. 確認 Firestore 沒有不屬於同一次 migration run 的 `members` 資料。

## 匯入與驗證

```sh
.venv/bin/python scripts/firestore_migration.py dry-run /path/to/final-rtdb-export.json \
  --run-id rtdb-YYYY-MM-DD

.venv/bin/python scripts/firestore_migration.py apply /path/to/final-rtdb-export.json \
  --run-id rtdb-YYYY-MM-DD \
  --project rugatha-87e15 \
  --confirm-project rugatha-87e15

.venv/bin/python scripts/firestore_migration.py verify /path/to/final-rtdb-export.json \
  --run-id rtdb-YYYY-MM-DD \
  --project rugatha-87e15
```

預期最少核對：57 members、1 bookmark、17 QA choices、12 QA stats、1 counter，並確認略過 1 張現有大型 data URL 圖片。若最終 export 已變動，以上數字可以增加，但驗證必須以該最終 export 為準。

## 切換

1. 部署 `firestore.rules`、`firestore.indexes.json` 與 `storage.rules`。
2. 設定管理員 Auth custom claim，重新登入後確認會員目錄可讀。
3. 將 `shared/firebase.config.js` 的 `dataBackend` 改為 `firestore`；先維持 `dataWritesEnabled: false` 做唯讀 smoke test。
4. 驗證登入、會員資料、管理員目錄、成就、書籤、QA 統計與頭像權限。
5. 將 `dataWritesEnabled` 改回 `true`，再測一次所有寫入流程。
6. RTDB 保留完整且不刪除，開始 7 天觀察期。

## 回退

若出現資料錯誤或權限異常：先停止寫入並保留兩邊資料。若 Firestore 已接受新寫入，不能只切回舊 RTDB，否則會遺失切換後的會員變更；先用下列唯讀指令匯出 Firestore 的 RTDB 相容快照，再核對與回補。工具會把觀察期內上傳到 Storage 的新頭像嵌入私有 rollback JSON，但不會修改線上 RTDB。

```sh
.venv/bin/python scripts/firestore_migration.py export-rollback \
  migration-private/rollback-rtdb.json \
  --project rugatha-87e15 \
  --confirm-project rugatha-87e15
```

僅在確認 Firestore 沒有新增寫入時，才可直接切回凍結前 RTDB。若已有新寫入，需先檢查 rollback export 的計數與 hash，再把資料回補到 RTDB；不可直接覆蓋。

新 run ID 的 apply 目前要求 members 集合為空；並不支援用新 run ID 覆蓋既有匯入。初次匯入應使用唯讀窗口內的最終來源，不先做 production 預匯入。前端維護旗標不能阻止已開啟的舊頁面，最終凍結還需 RTDB Rules 配合，並備妥可還原的原始 Rules。
