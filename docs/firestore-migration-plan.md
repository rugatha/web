# Rugatha RTDB → Cloud Firestore 遷移盤點與方案

更新：2026-09-25

狀態：ADC、Storage 建立與新後端 Rules 部署已完成；網站相容資料層仍以 RTDB 模式運作，尚未凍結、匯入或切換正式流量
已確認：保留未來會員頭像（改用 Cloud Storage）；現有 Rugatha 大型 JPEG 不遷移；成就不要求防作弊；接受短暫唯讀窗口與 7 天觀察期

目前實作驗證：來源 SHA-256 `66e4e58cdf4512b035902bdd7feeedcb610e29d244a85f158420c03d822305a1`；dry-run 規劃 89 writes；4 個轉換測試、7 個 Firestore／Storage Rules 測試與 1 個 RTDB 維護規則測試通過。Firestore `(default)` 已確認位於 `asia-east1`，Storage bucket 位於免付費位置 `US-WEST1`，網站旗標仍為 `rtdb`，尚未切換正式流量。

2026-09-25 線上檢查：Auth UID 57/57 存在；Firestore 頂層 collection 為 0；Storage bucket `rugatha-87e15.firebasestorage.app` 已建立於 `US-WEST1`。現行 Rules 已備份到 Git 忽略目錄，管理員 custom claim 與新版 Firestore／Storage Rules 也已部署。切換前仍需先上線 RTDB 相容版本、取得最終線上 export、匯入並完成唯讀驗證。

## 1. 結論

建議遷移，但不要把 RTDB JSON 樹直接複製成 Firestore 文件。

推薦做法：

1. `members/{uid}` 保留每位會員的小型主文件。
2. 書籤與 QA 選擇改成會員子集合，避免會員文件持續膨脹。
3. QA 百分比另存匿名彙總文件，頁面不再下載全體會員的作答。
4. 現有超大型 `photoUrl` 不遷移；若保留日後頭像上傳功能，新圖片改存 Cloud Storage，Firestore 只保存受保護的 object path。
5. 會員編號配置改為同一個 Firestore transaction 同時更新 counter 與會員文件。
6. 管理員權限改用 Firebase Auth custom claim，不依賴前端寫死 email。
7. 最終切換採短暫「唯讀寫入窗口」加最新 RTDB export，先驗證 Firestore，再切換讀寫；RTDB 在觀察期內完整保留。

以目前 57 位會員、約 89 個初始 Firestore 文件且不遷移現有圖片的規模，資料量遠低於 Firestore 免費額度。真正可能增加寫入量的不是遷移，而是會員頁目前每 30 秒保存一次使用時間；實作時應同步降頻。

## 2. 稽核範圍與限制

已檢查：

- 交接文件與 2026-09-25 RTDB JSON 匯出。
- repository 內所有 `firebase-database` import、`getDatabase()`、`members`、`members_meta`、`qa_choices`、讀取、更新、交易與即時監聽。
- 被 `.gitignore` 排除但本機存在的 `shared/firebase.config.js`；其 project ID 與匯出檔指向的專案一致。
- 官方 Firestore、Realtime Database、Cloud Storage、Security Rules 與 transaction 文件（連結見文末）。

尚無法核對：

- Firebase Console 目前實際部署的 RTDB Rules、Firestore Rules、Storage Rules 與索引；repository 沒有 `firebase.json`、`.firebaserc`、rules 或 indexes 檔。
- Firebase Authentication 是否仍存在全部 57 個 UID；這需要 Firebase Admin 權限或 Auth 匯出。
- 最近 30 天的 RTDB downloads、連線數、Firestore 用量和專案的 Spark/Blaze 方案；因此目前只能做公式與量級評估，不能宣稱精確月費。
- 匯出後至正式遷移日之間新增或變更的線上資料。

## 3. RTDB 匯出資料盤點

分析全程只輸出統計，沒有把 UID、姓名、email 或圖片內容寫入 repository。

### 3.1 數量與一致性

| 項目 | 結果 |
| --- | ---: |
| JSON 檔案大小 | 6,623,112 bytes |
| 會員 | 57 |
| `members` key 與內部 `memberId` 相同 | 57 / 57 |
| 非空且唯一的 `memberNo` | 57 / 57 |
| 非空且不重複的 email（不分大小寫） | 57 / 57 |
| `members_meta.memberNoCounter` | 數字，且等於非管理員最大會員序號 |
| QA 第一層會員鍵 | 9 |
| QA 作答 | 17 |
| QA 頁面 | 12 |
| 書籤 | 1 |

交接文件將 `qa_choices` 的 9 個第一層 key 描述為題目鍵，但程式與資料交叉檢查顯示它們其實是會員鍵：8 個使用 `memberNo`，1 個使用 Auth UID；全部能對回 `members`。第二層才是編碼後的頁面路徑。17 筆作答全部是 `C1` 或 `C2`，頁面 key 也都與 `questionPage` 的現行編碼一致。

### 3.2 文件大小與照片

| 項目 | 結果 |
| --- | ---: |
| 57 個會員 JSON 合計 | 6,608,899 bytes |
| 單一會員最大值 | 6,589,382 bytes |
| 單一會員中位數 | 362 bytes |
| 非空照片 | 1 |
| 空字串 `photoUrl` | 8 |
| 照片 data URL 大小 | 6,588,439 bytes |
| 解碼後 JPEG 推估大小 | 4,941,312 bytes |

最大會員文件幾乎完全由 `data:image/jpeg;base64,...` 組成，超過 Firestore 1 MiB 文件上限約 6.3 倍。移除照片後，會員主文件很小，不需要為了文件上限把一般 profile 欄位過度拆散。

現有照片處理決策：

- Rugatha 會員的現有大型 JPEG 不解碼、不上傳，也不寫入 Firestore；遷移後該會員的 `profile.photo` 為 `null`。
- 原始 RTDB export 保持不動並放在 Git 外的受保護位置，因此在觀察期內仍可復原；正式切換前不先刪除 RTDB 的 `photoUrl`。
- 驗證報告記錄「略過 1 張既有圖片」及其來源 hash/大小，但不記錄圖片內容。
- 若保留日後頭像功能：新圖片改存 `profile-photos/{uid}/avatar.webp`，Firestore 只存 object path 與 metadata；限制圖片 MIME、最大 2 MiB，前端先縮圖再上傳，且不使用永久公開 download token URL。
- 若決定停用頭像功能：移除/停用上傳 UI，不需為本次遷移導入 Cloud Storage。

Cloud Storage for Firebase 現行政策要求專案使用 Blaze 方案。開始實作前必須先確認目前 billing plan；這是本方案唯一確定可能要求綁定帳務的項目。

### 3.3 欄位品質

- 會員共同欄位：`memberId`、`memberNo`、`displayName`、`email`。
- `createdAt` 有 56/57；`lastLoginAt` 有 16/57，格式都是 JavaScript ISO 字串（含毫秒）。遷移時轉為 Firestore `Timestamp`，缺值不捏造；新寫入改用 server timestamp。
- Badge 六項都存在於 42 位會員，其值均在 0–20；15 位缺少整組，網站目前會在登入會員頁時補預設值。
- `achievements` 存在於 42 位會員，共 112 個 boolean entry、15 個代碼，其中 4 個值為 `false`。遷移第一階段原樣保留，避免靜默改變語意。
- `rewardedAchievements` 存在於 38 位會員，皆為 boolean，且對應 achievement 已存在。
- `totalTimeSeconds` 存在於 29 位會員，全部非負。
- 1 筆 QA payload 的 `memberNo` 是空字串，但其第一層 UID 可正確對回會員；遷移後以 parent UID 為權威，不再複製 `memberNo` 到選擇文件。

## 4. 現行程式存取模式

| 功能 | 現行路徑與行為 | 風險 / Firestore 影響 |
| --- | --- | --- |
| 登入與建會員 | `shared/auth.js`：讀寫整份 `members/{id}`，另以 transaction 遞增 `members_meta/memberNoCounter` | counter 與會員寫入是兩個交易，可能跳號；讀整份會員會連照片一起下載 |
| 會員頁 | `member/index.html`：自用/管理員讀會員、管理員讀完整 `members`、編輯 profile | 管理員目前一次下載包含 base64 照片的整棵 members；Firestore 查詢會變成每位會員一次 document read，但每份很小 |
| 使用時間 | `member/index.html`：會員頁開啟時每 30 秒更新 `totalTimeSeconds` | 是 Firestore 每日 write quota 的主要潛在消耗，應改為 5 分鐘與 `visibilitychange` 保存 |
| 照片 | `member/index.html`：FileReader 轉 base64 後直接更新會員 | 已造成 6.59 MB 單筆；Firestore 不可沿用 |
| 書籤 | `shared/bookmark.js`：監聽並 transaction toggle 單一 bookmark；會員頁監聽整個 bookmarks map | 適合改為 `bookmarks` 子集合；頁面按鈕只監聽該頁 document |
| 成就 | `shared/auth.js`、首頁、about-us、角色卡、章節、NPC/神祇與會員頁：在整份會員上 transaction 更新 achievements 與六項 Badge | 多份重複邏輯；前端事件可偽造，若 Badge 需要可信度應改由 callable backend 寫入 |
| QA 個人作答 | `npc/npc_page/assets/qa.js`：以 memberNo/UID + page key 寫 `qa_choices` | identifier 混用；改以 UID parent 統一 |
| QA 百分比 | 每個 QA 頁面讀完整 `qa_choices` 再在瀏覽器計數 | 洩漏可連結到會員的個別作答，且資料越多成本越高；改讀單一匿名統計文件 |
| QA 成就 | QA 與會員頁重讀該會員全部選擇再計數 | 可在會員文件維護 `qaChoiceCount`，或用 aggregation；本規模建議交易內維護 count |
| 宗教成就 | NPC/神祇頁先讀 `members/{id}/religion`，符合時再 transaction 整份會員 | Firestore 讀主文件後呼叫統一成就 API |
| 未使用初始化 | `src/index.js` 只初始化 RTDB，目前沒有找到 HTML 或其他程式引用 | 遷移時可確認後移除或改成共用資料層，不應當成正式入口 |

目前沒有找到 REST database URL 直接讀寫、server-side job、管理 CLI 或 repository 內的 Firebase Rules。

## 5. 建議 Firestore schema

### 5.1 `members/{uid}`（本人與管理員可讀）

```text
schemaVersion: 1
memberNo: "0000-0001"
displayName: string
email: string
profile: {
  title, religion, species, className, kingdom,
  photo: { path, contentType, size, updatedAt } | null
}
badges: { STR, DEX, CON, INT, WIS, CHA }
achievements: { [achievementCode]: boolean }
rewardedAchievements: { [achievementCode]: boolean }
qaChoiceCount: number
totalTimeSeconds: number
campaign: string
character: string
createdAt: Timestamp | null
lastLoginAt: Timestamp | null
updatedAt: Timestamp
migration: { source: "rtdb", runId, sourceHash }
```

說明：

- document ID 直接使用 Firebase Auth UID；目前 57 筆 key 都已與 `memberId` 相同，因此不需 alias collection。
- 不再重複保存 `memberId` 欄位；若為降低首版改動可暫留一版，但應視為衍生值。
- `email` 與個資留在 owner/admin-only 文件。Firestore Rules 無法只遮住同一文件的特定欄位，因此不要讓這個集合公開。
- 首版保留 achievement maps，因目前每位會員資料很小且頁面通常整批使用。未來若單一會員接近數百個成就，再拆子集合。

### 5.2 `members/{uid}/bookmarks/{pageKey}`

```text
path: string
title: string
savedAt: Timestamp
```

`pageKey` 沿用現行可逆編碼，避免斜線成為 path separator。本人可讀寫，管理員可讀。頁面只監聽當前 bookmark document；會員頁才查詢該使用者的 bookmark 子集合。

### 5.3 `members/{uid}/qaChoices/{pageKey}`

```text
questionPage: string
choice: "C1" | "C2"
createdAt: Timestamp | null
migrationSourceKeyType: "memberNo" | "uid"   // 只供首版稽核，可在觀察期後移除
```

本人與管理員可讀；一般使用者只能建立一次，不可改選或刪除。既有資料沒有作答時間，所以遷移資料的 `createdAt` 保持 `null`，不能用遷移時間冒充原始時間。

### 5.4 `qaStats/{pageKey}`（公開讀、server-only 寫）

```text
questionPage: string
c1: number
c2: number
total: number
updatedAt: Timestamp
```

由提交 QA 的可信交易同時建立 choice 並遞增統計。NPC 頁面只讀這一份文件，不讀任何人的個別作答。

### 5.5 `system/memberNumbers`（server-only）

```text
lastAllocated: number
updatedAt: Timestamp
```

建立會員時，在單一 Firestore transaction 中讀 counter 與 `members/{uid}`，僅在會員尚無編號時把 counter 加一並寫入格式化編號；整筆成功或整筆失敗，不再出現 counter 已增加但會員未寫入的中間狀態。管理員保留 `0000-0000`，不消耗 counter。

### 5.6 `migrationRuns/{runId}`（admin/server-only）

只放來源檔 SHA-256、開始/完成時間、schema version、各類筆數、驗證結果與工具版本；不可放 email、姓名、UID 清單或照片 data。

## 6. 寫入信任邊界

推薦使用最小的 callable backend 處理以下操作：

- `ensureMember`：由 Auth token 取得 UID/email/displayName，原子配置會員編號。
- `submitQaChoice(pageKey, choice)`：驗證允許的 QA page 與 `C1/C2`，原子建立 choice、遞增 `qaStats` 與 `qaChoiceCount`。
- `awardAchievement(code, context)`：確保每個 code 只獎勵一次並依 server-side catalog 更新 Badge。

Profile 欄位、書籤可由前端直接寫 Firestore，搭配嚴格 Rules。使用時間若不是安全敏感，可保留前端更新但限制只允許非負、合理上限的增量。

注意：callable function 只能防止任意直接寫資料；若「點連結/瀏覽頁面」本身仍完全由 client 宣告，使用者仍可偽造事件。若 Badge 是純遊戲化顯示，可接受此風險；若 Badge 影響權益，必須改成 server 可驗證的事件模型。此項需要產品層確認。

## 7. Security Rules 設計要求

實作時 rules 應 version-controlled 並以 Emulator 測試：

- 預設 deny all。
- `isOwner(uid)`: `request.auth != null && request.auth.uid == uid`。
- `isAdmin()`: `request.auth.token.admin == true`；不再只檢查 UI 中的 email 字串。
- `members/{uid}`：owner 可 get；admin 可 get/list；owner 僅能變更允許的 profile 欄位與受限的時間欄位。`memberNo`、email、badges、achievements、migration 欄位只允許 server。
- bookmarks：owner CRUD、admin read；限制欄位集合、字串長度與 `savedAt` 類型。
- qaChoices：owner/admin read；一般 client 不直寫（若採 callable）。若不用 callable，rules 至少需限定 owner、create-only、欄位白名單、choice enum 與 page catalog。
- qaStats：任何人可 get；禁止 list（若頁面只按 ID 讀）；client write deny。
- system、migrationRuns：client 全部 deny，admin 只讀。
- Storage `profile-photos/{uid}/...`：owner/admin read，owner write；限制 image MIME、2 MiB、固定檔名/路徑。遷移服務帳號透過 IAM 寫入，不受 client Rules 控制。
- 啟用 App Check 前先觀察 metrics，再逐產品逐步 enforce，避免一次切斷合法流量。

因 Rules 對 `get()`/`exists()` 的相依文件讀取也可能計費，常用 owner check 優先只比較 Auth token，不額外讀 role 文件；管理員角色用 custom claim。

## 8. 索引

首版不需要 composite index：

- 會員目錄只用 `members.orderBy("memberNo")`，單欄索引即可。
- bookmarks 與 qaChoices 都是指定 parent 下的小集合。
- qaStats 直接按 document ID get。

為節省 index storage，對不查詢的 maps/欄位建立 single-field index exemption：`achievements`、`rewardedAchievements`、`migration`、`profile.photo`、`email`、`character`、`campaign`、`totalTimeSeconds`。若後續需求需要查詢其中任一欄位，再單獨開啟。

## 9. 費用評估

### 9.1 一次性遷移

預估初始文件：

- 57 member documents
- 1 bookmark document
- 17 QA choice documents
- 12 QA stats documents
- 1 counter document
- 1 migration run document

合計約 89 次 document writes、0 次既有圖片 Storage upload，遠低於免費額度。

### 9.2 日常用量

Firestore `(default)` 的標準免費額度目前為：1 GiB 儲存、每日 50,000 document reads、20,000 writes、20,000 deletes、每月 10 GiB outbound。只有一個 database 可享免費額度。

在目前 57 位會員量級，若每日 1,000 次登入頁面載入、每次約 2–4 reads，仍只約 2,000–4,000 reads/day。管理員每載入一次完整目錄約 57 reads，但文件移除照片後非常小。

主要風險是 `member/index.html` 的 30 秒 timer：

```text
目前 writes/day = 120 × 每日會員頁總開啟小時
改為 5 分鐘 = 12 × 每日會員頁總開啟小時
```

因此 167 個會員小時/日就可能只靠 timer 超過 20,000 free writes/day；改為每 5 分鐘可降低約 90%，並在 `visibilitychange` 補存。

RTDB 是按儲存與下載流量計費；Firestore 是按文件 operation 加儲存/傳輸計費，所以無法單憑 6.62 MB snapshot 宣稱哪個一定便宜。對本專案而言，Firestore 的好處主要是：

- 管理員不再為了 57 個簡短 profile 一併下載 6.59 MB base64 圖片。
- QA 頁不再每次下載全體個別作答，只讀一份 stats document。
- 成就與 profile 不再透過整棵 RTDB member transaction 傳輸照片。

若目前專案仍在 Spark，使用 Cloud Storage 前需升級 Blaze；先設 billing budget/alerts。精確月費需從 Firebase Console 匯出最近 30 天 RTDB Usage 與預估日活/會員頁停留時間後再代入。

## 10. 可重跑遷移工具規格

確認方案後，在 repository 加入 Admin SDK 型的 Node 工具；不得把 service-account JSON 或原始 export 提交 Git。

命令模式：

```text
analyze   只讀來源，產出無個資統計與 source SHA-256
dry-run   完成所有轉換、大小與關聯驗證，不連線寫入
apply     明確指定 project、database、bucket、runId 後才寫入
verify    從 Firestore/Storage 回讀統計與 hash，比對來源
export-rtdb-rollback  將 Firestore 轉回相容 RTDB 結構，只輸出到受保護本地檔，不直接覆寫 RTDB
```

必要護欄：

- `--project rugatha-87e15` 與 `(default)` 必須雙重確認；project 不符立即停止。
- apply 前驗證來源 SHA-256、JSON schema、所有 UID/memberNo 唯一、QA parent 可解析、所有文件估算小於 1 MiB。
- 支援 idempotent runId；同來源重跑不產生重複 choice/bookmark，不重複增加 stats/counter。
- 每批最多 400 writes，保留 Firestore batch 上限餘裕。
- 日誌只印 runId、種類、筆數、hash 與錯誤代碼；不印整份 member、email、displayName、UID 或 base64。
- 以 Admin SDK 批次核對 Auth UID，僅輸出「存在/缺失數量」。發現缺失 UID 時停止 apply。
- 現有大型圖片必須記錄為 skipped，且不得把 `photoUrl` 或 `data:` 字串寫入 Firestore；若保留新頭像功能，另測試新上傳的 object size、content type 與 hash。
- migration run 完成前不標記 `completedAt`；中斷可安全重跑。

## 11. 驗證矩陣

### 資料驗證

- members 57、bookmark 1、QA choices 17、QA stats 12、counter 1。
- 每個 member document < 100 KiB；任何文件 >= 900 KiB 直接失敗。
- Auth UID 對應 57/57；memberNo/email 唯一；counter 與最大非管理員編號一致。
- 六個 Badge、achievement/rewarded maps、profile、時間欄位逐欄 canonical hash 相符。
- 由 choices 重算每頁 C1/C2，必須與 qaStats 完全一致。
- Storage 圖片可由 owner/admin 讀、其他登入者與未登入者不可讀；Firestore 不含 `data:` 字串。

### Rules 測試

- 未登入者不可讀 member、bookmark、choice、system；可讀指定 qaStats。
- 一般會員只能讀自己，不能 list members 或讀他人 email。
- 一般會員不能改 memberNo、email、Badge、achievement、migration 欄位。
- 管理員 custom claim 可 list/read 全部會員，但 UI 的 email 字串本身不能授權。
- QA 不可重複提交、不可填第三種 choice、不可竄改 stats。
- 圖片非 image、超過 2 MiB 或寫到他人路徑都被拒絕。

### 使用者流程

- Google 登入/登出、首次建立會員、既有會員登入。
- 會員編號在並行首次登入下仍唯一且不跳號。
- 本人 profile 編輯、照片上傳/顯示、管理員唯讀查看會員與目錄排序。
- 成就首次取得只加一次，六項 Badge 正確，重整或多分頁不重複。
- 書籤新增/移除、頁面按鈕即時狀態、會員頁列表。
- QA 已作答鎖定、首次提交、百分比、個人選擇成就。
- 宗教、章節、首頁、about-us、角色卡成就。
- 會員頁停留時間在背景分頁、離線/重連、多分頁下不倒退且寫入量符合預期。

## 12. 切換與回退

### 階段 A：repository 準備

1. 將 Firestore/Storage rules、indexes 與 Firebase CLI 設定納入版本控制。
2. 建立共用 Firebase data adapter；以 `RUGATHA_DATA_BACKEND = "rtdb" | "firestore"` 控制，預設仍是 RTDB。
3. 將分散的 achievement/member resolution 邏輯收斂到共用模組。
4. 完成 Emulator rules tests、遷移 dry-run 與瀏覽器 smoke tests。

### 階段 B：隔離匯入

1. 保存最新 RTDB data export 與當下 RTDB Rules；計算 SHA-256，放在 Git 外的受保護位置。
2. 將現有 2026-09-25 export 先 dry-run，再匯入空的 Firestore `(default)`。
3. 執行完整 verify；網站仍讀寫 RTDB，不受影響。

### 階段 C：最終同步

由於現有 RTDB 資料沒有一致的 `updatedAt`，不能可靠地只同步 2026-09-25 之後的差異。採短暫唯讀窗口最安全：

1. 發佈「資料寫入維護中」旗標；網站內容仍可瀏覽與登入，但暫停 profile、照片、書籤、QA、成就、時間寫入。
2. 取得最終 RTDB export。
3. 以新 runId 重建/對齊 Firestore，verify 全部通過。
4. 切換 `RUGATHA_DATA_BACKEND` 到 Firestore，先由管理員與測試帳號驗證。
5. 解除寫入維護。

### 階段 D：觀察

- 至少觀察 7 天：前端錯誤、permission denied、reads/writes、Storage bandwidth、QA stats 差異與新會員編號。
- RTDB 保持唯讀備援，不刪除；移除舊程式碼前確認 RTDB Usage 沒有非預期讀寫。

### 回退

- 若在解除寫入維護前失敗：feature flag 立即切回 RTDB，Firestore 可保留調查，不需回寫。
- 若解除維護後才失敗：先再停寫，執行 `export-rtdb-rollback` 產生差異檔並人工核對，才套用到 RTDB；不可直接用舊 snapshot 覆蓋新資料。
- 任何情況都不刪除 RTDB；是否停用要在觀察期結束後另行決定。

## 13. 實作前的確認點

1. 接受上述 schema 與「短暫唯讀切換窗口」。
2. 確認是否保留日後頭像上傳；若保留，確認專案目前是否為 Blaze，以及是否同意使用 Cloud Storage。
3. 確認 Badge/achievement 是否只是遊戲化資料；若需要防作弊，採 callable backend。
4. 提供或登入具有讀取 Rules/Usage、設定 custom claim、部署 Rules/Functions/Storage 的 Firebase 帳號。
5. 確認觀察期（建議至少 7 天）與可接受的最終切換時間。

## 14. 官方依據

- [Firestore pricing and free quota](https://firebase.google.com/docs/firestore/pricing)
- [Firestore quotas and 1 MiB document limit](https://firebase.google.com/docs/firestore/quotas)
- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules cannot hide individual fields in a readable document](https://firebase.google.com/docs/firestore/security/rules-fields)
- [Realtime Database billing](https://firebase.google.com/docs/database/usage/billing)
- [Firebase pricing, including Storage](https://firebase.google.com/pricing)
- [Cloud Storage for Firebase billing requirement](https://firebase.google.com/docs/storage/faq-and-troubleshooting)
- [Firebase App Check for web](https://firebase.google.com/docs/app-check/web/recaptcha-provider)
