# Rugatha 體驗團快報：第一版設計

狀態：已實作訂閱／退訂頁、Firebase callable 後端與權限規則，通過本機 Emulator 與瀏覽器驗證；尚未部署正式後端、寄送信件或實作報名歸因。依目前確認的流程，名單存入 Firebase，由主辦方自行從 Gmail 手動寄出 HTML 信件、管理收件者群組。

## 使用體驗

1. 使用者從體驗團介紹頁、報名成功頁或社群的超連結進入 `https://rugatha.com/experience/subscribe/`（已實作，待部署）。
2. 填寫 email 並同意接收體驗團資訊，按下「訂閱快報」。不必登入網站或 Google 帳號。
3. 後端成功寫入 Firebase Firestore 後顯示「訂閱完成」。第一版直接訂閱，不寄送確認信；報名活動也不自動加入訂閱。
4. 每次有新體驗團，主辦方更新 `experience_info.json` 並執行 `npm run newsletter:build` 產生當期 HTML，預覽並測試後，自行從 `rugathadnd@gmail.com` 寄給有效訂閱者。收件者群組由主辦方管理。
5. 信內包含 Rugatha 圖片標誌、當期體驗團 banner、劇本引言、活動資訊及有 UTM 的報名連結。
6. 信件底端提供共用退訂連結。使用者進入退訂頁、填寫訂閱 email，可複選退訂原因或自由填寫意見；原因及意見均為選填，留白也能退訂。按下「確認取消訂閱」後，後端將 Firestore 狀態改為 `unsubscribed` 並儲存本次意見。開啟連結本身不變更資料。

訂閱頁文案：

> **讓下一場冒險，來敲你的信箱。**
>
> 訂閱 Rugatha 體驗團快報。新場次開放報名時，我們會把劇本、時間、地點與報名連結寄給你。
>
> Email：＿＿＿＿＿＿　［訂閱快報］
>
> □ 我同意收到 Rugatha 體驗團資訊，並了解可隨時退訂。
>
> 通知將由 rugathadnd@gmail.com 寄出。訂閱不代表預約名額，報名結果以主辦方通知為準。

退訂頁文案：

> **取消訂閱 Rugatha 體驗團快報**
>
> 請填寫你訂閱時使用的 email。
>
> Email：＿＿＿＿＿＿　［確認取消訂閱］
>
> 完成後，此信箱將不再列入快報的有效訂閱名單。

退訂原因（選填，可複選）：收到快報的頻率太高、快報內容不符合我的需求、已透過其他管道取得最新資訊、不記得曾訂閱這份快報、想減少收到的電子郵件、其他。另提供「其他原因或想告訴我們的話」自由填寫欄位，最多 1,000 字；不需勾選「其他」也可直接作答，內容僅供主辦方參考、不公開。

## 架構

沿用現有 GitHub Pages 與 Firebase Firestore，新增訂閱／退訂頁及受控後端寫入入口。這份設計不建立 Apps Script、Google Sheet、自動寄送、批次佇列或收件者群組同步。

| 部分 | 第一版安排 |
| --- | --- |
| 訂閱入口 | `/experience/subscribe/`，填寫 email 後儲存 |
| 名單儲存 | Firebase Firestore `experienceNewsletterSubscriptions` collection |
| 訂閱／退訂寫入 | Firebase callable Cloud Function `experienceNewsletter`，位於 `asia-east1` |
| 退訂入口 | `/experience/unsubscribe/`，相同 HTML 可共用此連結，不在網址帶 email |
| 名單存取 | 僅管理員可讀取；公開使用者不可列出或讀取任何訂閱資料 |
| 活動資訊 | 依 `experience/register/experience_info.json` 的當期設定製作信件 |
| 寄信 | 主辦方自行從 `rugathadnd@gmail.com` 寄出 HTML |
| 群組管理 | 主辦方另行處理；寄送前依 Firestore 的有效訂閱狀態更新名單 |
| 報名追蹤 | UTM + Firestore 報名來源 + GA4 成功事件，設計見下方 |

Firestore 是訂閱狀態的依據。使用者退訂後，Firestore 立即排除該地址；已另行建立的 Gmail 群組不會自動更新。**主辦方每次寄送前都需同步排除已退訂者**，也要處理匯出名單後新發生的退訂。

公開頁不直接取得整份名單，也不開放任意修改 Firestore 文件。後端只接受 email、訂閱同意與明確的訂閱／退訂操作；做格式及長度檢查，以及每 IP 每 10 分鐘最多 10 次有效操作的頻率限制。App Check 尚未啟用；目前依靠後端驗證與限流，CORS 僅限制瀏覽器來源，不能替代請求驗證。Firebase Admin SDK 的寫入不依賴前端 Rules，因此後端本身也要驗證。部署前需確認目前 Firebase 專案可部署 Cloud Functions 的方案及設定。

## 信件設計

正式信件檔：[experience-notification.html](../experience/subscribe/experience-notification.html)。由 `experience/register/experience_info.json` 自動產生，舊的 docs 預覽網址會轉到這個檔案。更新 JSON 後執行 `npm run newsletter:build`，GitHub Pages 部署也會重建。退訂頁已實作，仍需部署後端與網站後才能正式使用。

- 標頭使用 `assets/banner/rugatha-banner-trademark-transparent.png`，深綠底襯托金色標誌，附上 `alt="Rugatha"`。
- 當期 banner 使用 `campaigns/campaign-banners/exp-e03.jpeg`（《洛林精神》）。目前與報名頁的 `assets/banner/rugatha-experience.jpeg` 圖片內容相同；採劇本固定路徑，避免日後替換通用圖片時舊信圖片跟著改變。
- 每一期依實際劇本替換 banner，以公開 HTTPS 絕對網址載入，保持原始比例，完整顯示，不裁切、不拉伸。重要活動資訊仍保留可閱讀文字。
- banner 下方加入劇本引言，完整沿用 `/experience/`（`experience/index.html`）對應劇本的 `experience-card__description` 文字與換行，放在活動資訊之前，直接以斜體文字呈現，不加獨立底色、側線或標題。每期更換劇本時，banner 與引言一併更新。
- 米白底、深綠標頭、金色細節，呼應現有報名頁。
- 主旨：`【Rugatha 體驗團快報】11/21《洛林精神》開放報名`
- 預覽文字：`台北公館・D&D 5e・新手友善。查看活動資訊與報名方式。`
- 信內包含劇本、日期時間、DM、地點、費用、人數與報名截止日。
- 一個主要報名按鈕，頁尾附聯絡與共用退訂連結。
- 使用 table 排版、inline CSS、系統字型；手動寄出時保留渲染後的 HTML 格式，將 HTML 原始碼貼入一般 Gmail 內文不會自動變成設計好的信件。寄送前要實寄測試。
- 不在靜態信件宣稱即時剩餘名額；報名頁負責查詢 Firestore。

共用退訂連結：`https://rugatha.com/experience/unsubscribe/`（已實作，待部署）。採「填 email＋確認」以配合同一份 HTML 群發；這種流程不驗證信箱所有權，訂閱與退訂都可能由知道該地址的人提交。若日後需要驗證，需另加信箱確認機制。回應統一使用「若此信箱有訂閱，已完成取消訂閱」，不對外揭露名單是否存在。

## 追蹤設計

不要將 Google tag 放進信件；Google tag 放在報名頁，信內連結加 UTM。

```text
https://rugatha.com/experience/register/?event=2026-11-lorin&utm_source=rugatha_newsletter&utm_medium=email&utm_campaign=experience_2026-11-lorin&utm_content=primary_cta
```

| 欄位 | 值 | 用途 |
| --- | --- | --- |
| `event` | `2026-11-lorin` | 與當前場次比對，阻止舊信連到新一期後誤報 |
| `utm_source` | `rugatha_newsletter` | 固定快報來源 |
| `utm_medium` | `email` | GA4 email 管道 |
| `utm_campaign` | `experience_2026-11-lorin` | 每期活動識別 |
| `utm_content` | `primary_cta` | 信內按鈕位置 |

目前報名頁沒有載入 GA4，網站其他頁已有 `G-BZZFKMJ65Y`，實作時可共用該資源並確認擁有管理權。網站目前也不處理上述 `event` 參數；必須先補上場次比對才能正式發送快報。

歸因採「同一分頁、同一場次、最後一次明確標記來源」，以 `sessionStorage` 暫存允許的 UTM 欄位，讓重新整理仍可保留；過期 24 小時、場次變更或送出成功後清除。新的有效 UTM 覆蓋先前值；無 UTM 的重新整理不覆蓋。第一次無追蹤來源則不加歸因。

成功送出時，和報名一起存入 Firestore：

```json
{
  "attribution": {
    "source": "rugatha_newsletter",
    "medium": "email",
    "campaign": "experience_2026-11-lorin",
    "content": "primary_cta"
  }
}
```

只接受受控的來源、媒介及符合該場次的 campaign，不儲存任意 query string 或完整 referrer URL；既有無此欄位的報名維持相容。來源是瀏覽器提供的資訊，代表「使用這個快報連結報名」，不能證明報名者就是原始收件人；轉寄也會歸入同一快報。不做個別收件人追蹤。

目前 Firestore Rules 使用嚴格欄位清單，直接加欄位會使報名失敗；必須同步修改 `config/firebase/firestore.rules`、報名資料組裝、管理頁顯示／匯出及 Emulator 測試。來源與報名使用既有 transaction 一起寫入，避免有報名而沒有來源。

`saveRegistration()` 確認成功後才送 GA4 `generate_lead`，參數使用 `event_id`、`lead_source`、`lead_medium`、`lead_campaign`，不在開啟表單或預覽報名資料時送出。依既有隱私與同意設定載入 GA，追蹤被阻擋不可影響報名成功。只在本次成功流程送一次，重新整理不再送。後台將此事件設為關鍵事件，必要時建立對應自訂維度。

GA4 用來看流量與整體轉換；Firestore 的實際報名及 attribution 用來查「該筆報名」與統計報名筆數／參加人數。兩者數字可能因追蹤阻擋、同意設定或工作階段差異而不同。姓名、email 與聯繫方式都不送 GA4；訂閱及退訂頁不載入 GA，避免 email 或其他敏感資訊出現在 Analytics 網址紀錄。

## Firebase 訂閱資料

已實作 collection：`experienceNewsletterSubscriptions`。由後端以正規化 email 的 HMAC 產生穩定文件 ID，密鑰僅存在後端；不以明文 email 作為文件 ID。email 仍作為私密欄位供主辦方寄信使用。

| 欄位 | 說明 |
| --- | --- |
| `email` | 去除前後空白、正規化後的 email |
| `status` | `active` 或 `unsubscribed` |
| `consentVersion` | 同意文案版本 |
| `createdAt` | 首次訂閱時間，伺服器時間 |
| `updatedAt` | 最近一次操作時間，伺服器時間 |
| `subscribedAt` | 最近一次有效訂閱時間 |
| `unsubscribedAt` | 取消訂閱時間；有效訂閱時為 null |
| `unsubscribeFeedback` | 最近一次實際退訂的原因陣列 `reasons`、自由意見 `note` 與伺服器時間 `submittedAt`；未退訂過的舊文件可無此欄位 |

同地址重複訂閱不產生多筆資料；保留 Gmail 的點與 `+tag`，不自行合併不同地址。已取消者再次主動同意並訂閱，可恢復 `active`。取消不存在的地址不新增訂閱資料；重複退訂維持成功且不反覆修改退訂時間。只有 `status == active` 的地址列入寄送名單。

退訂原因由後端檢查允許選項、不可重複、文字型別及長度。第一次實際退訂會寫入 `unsubscribeFeedback`，重試不覆寫；重新訂閱保留先前回饋，下一次實際退訂時才更新。沒有原因時記錄空陣列與空字串。這是最近一次回饋，不是歷史紀錄清單，僅管理員可隨訂閱資料讀取。

Firestore Rules 預設禁止匿名及一般會員讀取／列出名單或直接更新資料；管理員讀取沿用既有管理權限。公開訂閱與退訂透過後端處理，驗證同意及資料格式後才寫入。名單及匯出資料不提交 repository。

## 實作與驗收清單

- [x] 建立 Firebase 訂閱資料結構與管理員讀取權限（本機驗證）。
- [x] 實作訂閱／退訂後端、重複地址處理及頻率限制。
- [ ] 視公開使用情況另行設定 App Check。
- [x] 新增訂閱頁、退訂頁、體驗頁及報名成功頁的訂閱連結。
- [x] 驗證成功寫入才顯示完成；失敗時保留輸入並可重試。
- [x] 驗證匿名使用者無法讀取名單、任意改寫狀態或取得 email 是否存在。
- [x] 驗證重複訂閱、重複退訂、重新訂閱及不同大小寫地址處理。
- [ ] 確認當期 HTML 的 logo、banner、劇本引言、活動資訊、報名網址及退訂網址；引言與體驗團介紹頁一致。
- [ ] 報名頁實作場次參數比對、來源保存、GA4 成功事件與管理頁來源欄位。
- [ ] 修改及測試報名 Firestore Rules，保留既有無歸因欄位的報名相容性。
- [ ] 實寄自己信箱，於 Gmail 桌面／手機檢查 logo、banner、版型與連結。
- [ ] 測試退訂後 Firestore 狀態更新，寄送名單同步排除該地址。
- [ ] 用測試名單完成訂閱 → 手動寄信 → 點擊報名 → 來源核對 → 退訂。

## 本次樣稿驗證

本版已使用 Chrome 檢查 375px 與 900px 寬度，均無水平溢出；以 repository 內原圖攔截對應 HTTPS 圖片請求，確認 logo 與當期 banner 載入且維持比例，並檢視手機截圖。已核對報名連結的場次、UTM campaign 與共用退訂網址。這些是本機視覺與連結驗證，尚未驗證正式圖片網址與 Gmail 實寄。訂閱／退訂已另外以真實 Firebase Emulator callable 路徑驗證。

## 官方參考

- [Firebase callable Cloud Functions](https://firebase.google.com/docs/functions/callable)
- [Firestore Security Rules 與伺服器端存取](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [GA4 UTM 活動連結](https://support.google.com/analytics/answer/10917952)
- [GA4 建議事件 generate_lead](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#generate_lead)
- [避免將個人識別資訊送至 Analytics](https://support.google.com/analytics/answer/6366371)
