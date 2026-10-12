# Plus 08 temp 頁

頁面：`/campaigns/pages/rugatha-plus/plus-c08/temp.html`。
正文由 `campaigns/data/chapter-content.json` 的 `plus-c08-temp` 控制。
章節只使用 `lock` 控制流程：
- `lock: 1`：需要角色密碼才能檢視正文與「冒險者的抉擇？」作答區，不公布其他角色答案。
- `lock: 0`：直接顯示正文與「冒險者的抉擇。」答案區，不顯示任何密碼欄位、登入提示或作答表單，也不啟動匿名登入。
玩家在 `lock: 1` 登入角色後，可反覆確認並更新自己的答案。Firestore 不因公布而禁止持有有效角色授權的玩家更新答案，避免已開啟的作答頁因公布而儲存失敗。

修改 `lock` 後執行 `.venv/bin/python scripts/setup_adventurer_choices.py --apply`，同步 Firestore 的答案讀寫權限；密碼及答案會保留。
題目指定組別中尚未作答的角色，預設計入選項 1，並在該選項顯示角色 icon；實際送出後改用 Firestore 儲存的答案。
預設票由組別名單與現有答案計算，不建立假提交紀錄；每個角色僅計一票。
答案區沒有公布說明文字；無人選擇自行輸入時不顯示第五項。
題目由 `campaigns/data/plus-08-multiple-choices.json` 控制。
每題恰有四個固定選項，第五項自行輸入（最多 4000 字，保留換行、空白，使用純文字顯示）。

## Firestore

章節邏輯 key：`plus-c08/temp`（Firestore doc ID 不能含 `/`，因此採階層路徑）。
管理文件：`chapterAccess/plus-c08/pages/temp`，包含 `chapterKey`、`lock`、六個 `passwordHashes`、`questions`。
`passwordHashes` 使用 SHA-256，輸入完整角色密碼（例如 `Midori_1234`）後交由 rules 核對。
管理文件只有管理員可讀寫；一般玩家不取得密碼或密碼雜湊清單。

驗證授權：`chapterAccess/plus-c08/pages/temp/grants/{Firebase匿名uid}`。
答案：`chapterAccess/plus-c08/pages/temp/questions/{questionId}/answers/{characterId}`。
登入角色由 grant 指定，不能提交別人的答案。相同角色再次確認會更新答案，保留最初建立時間。
知道同一角色密碼的其他瀏覽器亦可使用該角色；角色密碼就是此測試頁的角色授權。
更改角色密碼會使先前該角色的授權失效。

## 啟用及調整

使用已具權限的 Firebase / Google Cloud 環境：

```sh
firebase deploy --only firestore:rules --project rugatha-87e15
python3 scripts/setup_adventurer_choices.py --password-suffix 1234 --apply
```

Python 套件見 `config/python/requirements-admin.txt`；採 Application Default Credentials。
初始角色密碼：`Midori_1234`、`Samael_1234`、`Siri_1234`、`YHWH_1234`、`Beau_1234`、`Ron_1234`。
之後換共同尾碼：`python3 scripts/setup_adventurer_choices.py --password-suffix MMDD --apply`（將 MMDD 換成實際數字）。

每題 `group` 設為 `ron`（龍恩）或 `party`（其餘五人）。
修改 JSON 的角色組別或章節 `lock` 後，執行 `.venv/bin/python scripts/setup_adventurer_choices.py --apply` 同步規則使用的設定；不給尾碼會保留密碼。
每個獨立題目使用不同 `id`，避免新題目沿用舊題答案。

## 範圍

temp 頁不加入正式章節導覽、sitemap 或時間線；沿用現有章節圖作為示意圖。
背景自動使用 Firebase 匿名登入取得 uid，畫面只有角色密碼，沒有 Google 登入需求或按鈕。Firebase Authentication 必須啟用 Anonymous provider。
密碼與答案由 Firestore 規則保護；正文仍是公開靜態 JSON，畫面解鎖不等於保護原始劇情檔案。
若正文需要保密，須將正文搬至受同樣授權規則保護的 Firestore 文件或後端服務。
