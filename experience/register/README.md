# 體驗團報名頁

入口：`/experience/register/`；題目依 `template.md`。設定來源為 `experience_info.json`，每一期須使用不同 `eventId`。

體驗團介紹頁 `/experience/` 會讀取同一份設定，顯示本期劇本、台灣時間的跑團起訖時間與報名入口。開放報名時即時監聽 Firebase 名額，區分尚有名額、額滿與截止；停止收件時顯示「報名已截止」；名額讀取失敗時不宣稱仍有空位。

## 可調整參數

| 欄位 | 用途 |
| --- | --- |
| `active` | `"y"` 顯示團務與表單；`"n"` 隱藏並顯示未開放訊息 |
| `eventId` | 場次唯一識別碼，歷期請勿重複使用 |
| `scriptName` / `scriptEnglishName` | 中英文劇本名稱 |
| `dm` | DM 名稱 |
| `startDate` / `startTime` | 開始日期 `YYYY-MM-DD` 與時間 `HH:mm` |
| `endDate` / `endTime` | 結束日期與時間，格式同上 |
| `deadline` | 只填 `YYYY-MM-DD`；台灣時間當日 23:59 結束（包含該分鐘） |
| `location` / `locationNote` | 地點與補充說明 |
| `minPlayers` / `maxPlayers` | 成團最低人數與最多玩家數 |
| `fee` | 每人費用（台幣） |
| `characterCreation` | `true` 包含創角教學；`false` 不包含；`null` 待公告 |

所有日期時間以台灣時區解讀。`active: "y"` 不會跳過截止、額滿與伺服器收件狀態。缺少必要資料或讀取失敗時不開放送出。

## 固定資訊

- 海報：`assets/banner/rugatha-experience.*`，依序尋找 `.png`、`.jpg`、`.jpeg`，顯示完整且擺正。若同時有多個版本，優先採用 PNG。
- 聯絡信箱：`rugathadnd@gmail.com`。
- 系統：龍與地下城第五版（D&D 5e）。
- 世界觀：Rugatha（原創）。

以上不放入 JSON。固定資訊與日期解析共用於 `settings.js`。

## Firebase 自動名額

使用既有 `shared/firebase.config.js`，專案為 `rugatha-87e15`。

- `experienceEvents/{eventId}`：收件開關、截止日、`maxPlayers`、已報名玩家總數 `registeredPlayers`。
- `experienceRegistrations/{20字元ID}`：九題填答、`eventId`、`schemaVersion`、伺服器時間 `createdAt`。複選答案儲存為陣列。
- 剩餘名額 = `maxPlayers - registeredPlayers`，依每筆 `partySize` 加總，並非報名文件數；不再有人工輸入的 `remainingSeats`。
- 前端即時監聽場次文件並調整人數選項。報名資料與總人數以同一筆交易寫入，規則驗證不可超收、不可單獨竄改人數、不可新增報名卻漏計人數。
- 訪客無法讀取、列出、修改或刪除填答，僅既有管理員可讀取。公開場次文件只包含團務與人數統計。
- 資料成功寫入才顯示感謝頁與報名摘要（不顯示內部報名編號）。送出失敗會保留頁面填答。尚未啟用寄信或付款功能；管理員可於 `/admin/#experience` 取消報名，交易會保留回覆並同步釋出整筆同行名額。重複取消不重複減少人數。

## 更新與發布

編輯 JSON 後發布頁面與 JSON，並同步伺服器收件設定：

```sh
node scripts/publish-experience-event.mjs          # 預覽，不寫入
node scripts/publish-experience-event.mjs --apply  # 同步收件設定與重新加總已報名人數
```

同步指令會在交易中加總該 `eventId` 的既有有效報名（不含 `status: cancelled`）的 `partySize`，不輸出個資，不會覆寫或刪除報名內容；若調整後的人數上限低於已報名人數會拒絕執行。`active: "n"` 同步後也會關閉 Firebase 收件。

只有規則有變更時才需要重新部署 Rules。首次切換至自動名額時，先發布新規則，再同步場次，最後發布新版網頁，避免新舊寫入流程混用：

```sh
npx firebase deploy --only firestore:rules --project rugatha-87e15
node scripts/publish-experience-event.mjs --apply
```

開放狀態與截止日以 `experience_info.json` 為準，調整後需同步 Firebase。自動化測試使用 Emulator 或測試替身，自行設定測試場次開放，不修改實際場次設定。

## 驗證與本機預覽

```sh
node --test tests/experience-settings.test.mjs
firebase emulators:exec --project demo-rugatha-registration --only firestore 'node --test tests/experience-registration-rules.test.mjs'
npm run dev
```

Emulator 需要 Java 21 以上。瀏覽 `http://localhost:8765/experience/register/`；使用 `file://` 無法讀取 JSON 與載入 Firebase 模組。選項直接保留在 HTML 中，確認開放狀態後顯示。

預覽時請保持 `npm run dev` 的終端機運作；停止服務後 localhost 將無法連線。也可使用 `http://127.0.0.1:8765/experience/register/`。

## 後台報名管理

`/admin/#experience` 沿用既有管理員身分驗證，支援歷期場次篩選、完整表單回覆、搜尋、欄位篩選、排序與分頁。本期五個方塊各代表一個玩家名額，同行多人會佔用相同數量的方塊。按「重新整理報名資料」讀取最新狀態，取消後會自動重新讀取；交易以伺服器最新人數為準。

取消功能需先部署新版 Firestore Rules，再發布網頁。此次修改僅完成程式與本機驗證，沒有部署正式規則或匯入歷史資料。2026-10-25 後續依使用者明確指示，已刪除正式環境全部 3 筆報名紀錄，驗證剩餘 0 筆、`2026-10-lorin` 已報名人數 0 / 5；場次設定保留。

聯絡欄位預設驗證 Email；無法使用 Email 時，可勾選改填其他方式。目前不提供自動寄信；歷史報名匯入暫緩。

新增驗證：

```sh
node --test tests/experience-settings.test.mjs tests/admin-dashboard.test.mjs
firebase emulators:exec --project demo-rugatha-registration --only firestore 'node --test tests/experience-registration-rules.test.mjs'
# 先在 8790 埠啟動本機伺服器，再跑 UI 測試（只使用測試替身）
python3 -m http.server 8790 --bind 127.0.0.1
node tests/browser/experience-admin-smoke.mjs
node tests/browser/experience-current-event-smoke.mjs
```
