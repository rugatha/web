# 體驗團快報：開發與部署

已實作 `/experience/subscribe/` 與 `/experience/unsubscribe/`，名單位於 Firestore `experienceNewsletterSubscriptions`。前端呼叫 `asia-east1` 的 callable Function `experienceNewsletter`，只有伺服器可寫入訂閱資料，管理員可依現有權限讀取名單。

## 本機試用

需要 Node.js 24（網站工具）、Java 21 或更新版本（Firestore Emulator），以及已安裝的 Firebase CLI 與 Google Chrome。正式 Cloud Function runtime 設為 Node.js 22。

```sh
npm ci
npm ci --prefix functions
npm run dev:newsletter
```

開啟 `http://127.0.0.1:8766/experience/subscribe/`；退訂頁為 `http://127.0.0.1:8766/experience/unsubscribe/`。這個預覽伺服器只服務訂閱相關頁面；首頁及體驗團介紹可另用既有 `npm run dev` 檢視。

預覽的 Firebase config 由本機伺服器替換為 `demo-rugatha-newsletter`，所有訂閱操作只進入 Emulator，不使用正式名單。瀏覽器仍須連網載入官方 Firebase SDK。只有 demo 專案的 Functions Emulator 使用固定測試 HMAC key；正式環境必須使用 Secret Manager。

Ctrl+C 停止服務。Emulator 資料未匯出時，停止後不保留。

macOS 若預設 Java 過舊，可先將已安裝的 Java 21 路徑加入 PATH；本次驗證使用：

```sh
PATH=/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/openjdk@21/bin:$PATH npm run dev:newsletter
```

## 驗證

```sh
npm run test:newsletter
```

本次通過十一組 Firestore／後端測試與 Chrome 整合驗證：

- email 正規化、重複與同時訂閱不重複建檔，保留 `+tag`。
- 退訂、重複退訂、不存在地址退訂與重新訂閱。
- 複選原因、純自由文字、留白退訂、意見長度／格式驗證，以及重試不覆寫、重新訂閱保留最近回饋。
- 匿名、會員、工作人員與未驗證管理信箱均無法讀取名單或直接改寫資料。
- 已驗證管理員可讀取訂閱資料，仍不可直接改寫或讀取限流資料。
- 不合法 email、缺少同意、文案版本錯誤及多餘欄位均遭拒絕。
- 後端 IP 限流及時間窗口重設。
- 瀏覽器同意必填、失敗保留輸入後重試、經 callable 實際寫入、GET 不退訂、重新訂閱。
- 375px／1280px 版型無水平溢出，已檢視兩種寬度的截圖。

測試 SDK 快取位於系統暫存目錄 `rugatha-firebase-12.7.0/`。瀏覽器測試使用 Chrome，其他環境可設定 `RUGATHA_TEST_BROWSER_CHANNEL`。

## 正式部署

**GitHub Pages 發布與 Firebase 後端部署是兩件事。** 若頁面正常開啟，但訂閱時失敗，先檢查 `asia-east1` 的 `experienceNewsletter` 是否已部署。2026/11/01 首次正式驗證曾發現頁面 HTTP 200、函式網址 HTTP 404，且 Cloud Functions API 未啟用；單純重推 Pages 無法修正這個問題。

2026/11/01 已補部署正式 `experienceNewsletter` 與 Firestore Rules，啟用所需 API、設定 Secret Manager 密鑰及建置映像 7 天清理政策。已在正式網站用專用測試地址驗證訂閱與退訂，核對 Firestore 狀態後刪除測試資料，未寄送 email。網站本身由既有 GitHub Pages 流程發布。以下保留部署程序：

1. 確認 `rugatha-87e15` 可部署 Cloud Functions，並已啟用所需服務及計費方案。
2. 登入具備部署權限的帳號，在 Secret Manager 建立 `NEWSLETTER_HMAC_KEY`。使用安全亂數產生至少 32 字元的值，透過 CLI 的隱藏輸入提供，不放前端、repository 或指令參數。

   ```sh
   npx firebase functions:secrets:set NEWSLETTER_HMAC_KEY --project rugatha-87e15
   ```

3. 部署訂閱 codebase 與 Firestore Rules：

   ```sh
   npx firebase deploy --only functions:newsletter,firestore:rules --project rugatha-87e15
   ```

4. 透過既有 GitHub Pages 流程發布網站檔案。Pages 部署本身不會部署 Firebase Function 或 Rules；建議後端先發布。
5. 部署後用專用測試 email 走一次訂閱／退訂，核對 Firestore 狀態，最後清理測試資料。2026/11/01 已完成正式 Chrome 瀏覽器驗證。

HMAC key 決定同地址的文件 ID，**不要直接輪替**；若需更換，必須先遷移既有訂閱文件與確認退訂查找仍可用。

## 名單與手動寄送

正式 HTML 信件位於 [`experience/subscribe/experience-notification.html`](../experience/subscribe/experience-notification.html)。在目前的本機伺服器可開啟 `http://localhost:8000/experience/subscribe/experience-notification.html`。它是可直接複製至 email 的靜態 HTML，沒有 JavaScript、外部 CSS 或黃色預覽提示。

每次更新 `experience/register/experience_info.json` 後執行：

```sh
npm run newsletter:build
```

腳本會更新劇本名、英文名、日期時間、DM、地點與補充說明、費用、人數、角色創建教學、截止日，以及報名連結的場次與 UTM。banner 和斜體引言則從 `experience/index.html` 中名稱符合 `scriptName` 的劇本卡片取得。改劇本時，需先在體驗團介紹頁準備好對應卡片；找不到時會停止產生，避免套用錯誤圖片或引言。

GitHub Pages workflow 會在打包前自動重建，不依賴收件者的郵件程式執行腳本。`active: "n"` 時改為「新一期籌備中」，不顯示舊場次資訊或報名按鈕。版型維護於 `scripts/templates/experience-notification.html`；請修改範本後重建，避免直接編輯產生檔後被覆蓋。

```sh
npm run newsletter:check
```

此指令檢查產生檔與來源一致，並測試跨日場次、換劇本、停用場次及動態文字跳脫。寄信仍由主辦方手動執行；產生或發布 HTML 都不會自動寄出。

在管理後台 `/admin/#subscriptions` 檢視訂閱狀態與會員比對，按「複製所有訂閱中的 email」即可取得以逗號分隔的完整有效名單，貼至 Gmail 收件者或密件副本欄位。也可在 Firebase Console 開啟 `experienceNewsletterSubscriptions`，篩選 `status == active`，以 `email` 欄位作為有效名單。退訂保留文件並將狀態改為 `unsubscribed`，供排除與重新訂閱使用；不儲存原始 IP，限流文件只用 HMAC 識別。

退訂原因為選填，位於 `unsubscribeFeedback.reasons`（複選陣列）、`unsubscribeFeedback.note`（最多 1,000 字的自由意見）與 `unsubscribeFeedback.submittedAt`。管理員可在同一文件查看；這些意見不公開。重新訂閱保留最近回饋，下次實際退訂再更新；重複送出同次退訂不覆寫。

每次寄送前同步群組，排除已退訂者；Firestore 狀態不會自動更新 Gmail 群組。系統不發確認信、不自動寄快報。報名 UTM 與 GA4 歸因仍是後續工作，見 [服務設計](experience-newsletter.md)。

共用退訂頁只要求 email，不驗證信箱所有權，符合目前免登入與相同 HTML 群發的流程；知道地址的人也能提交訂閱／退訂。回應不揭露名單是否已有該地址。App Check 尚未設定；已實作輸入驗證、交易內限流與最小存取權限。

參考：[callable Functions](https://firebase.google.com/docs/functions/callable)、[環境與 Secret 設定](https://firebase.google.com/docs/functions/config-env)、[runtime 與部署要求](https://firebase.google.com/docs/functions/manage-functions)。

## 訂閱事件歷程

每次實際狀態變更，同一個 Firestore transaction 會同步更新 `experienceNewsletterSubscriptions`（目前狀態）並新增 `experienceNewsletterEvents`（不可由前端修改的事件）。同一 email 只有一筆目前狀態，但可以有多筆事件；重複提交相同狀態或退訂不存在的地址，不新增事件。

每筆事件包含 `subscriberId`、`email`、`action`（subscribe／unsubscribe）、`sequence`（該訂閱者的事件序號）、`occurredAt`（伺服器時間）、`reasons`、`note`、`source` 與 schema 版本；訂閱事件另附同意文案版本。取消訂閱的原因寫入該次事件，之後再訂閱或退訂不會覆蓋它。

後台「訂閱」頁新增「訂閱歷程」區，預設最新事件在前；可依訂閱者下拉篩選，並使用事件時間欄切換排序、篩選日期，或依事件與原因搜尋。所有名單與歷程只允許管理員讀取。

重置工具 `scripts/reset-newsletter-data.mjs --project rugatha-87e15` 預設只顯示文件數量。`--pause` 暫停寫入、`--apply` 清除訂閱名單／事件歷程／限流三個集合、`--resume` 恢復寫入；清除前必須先部署支援維護開關的後端。其他會員、報名與回饋集合不在工具範圍內。清除是永久操作，僅在使用者明確要求時執行，不會匯出另存私人名單。

2026/11/01 依使用者明確要求完成首次清空切換：刪除原有 2 筆訂閱名單與 2 筆限流資料，原歷程為 0 筆；沒有將舊狀態推算成歷史事件。以維護開關暫停寫入後完成後端部署與清除，再恢復服務。正式瀏覽器驗證四次實際狀態變更可保留四筆事件及兩次不同的退訂意見，重複請求不新增事件；專用測試地址的 5 筆測試文件已全部刪除，未寄信。後台歷程介面已通過本機驗證，正式網站發布仍待使用者確認。
