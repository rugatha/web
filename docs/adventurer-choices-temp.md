# Plus 08 冒險者抉擇

正式頁面：`/campaigns/pages/rugatha-plus/plus-c08/chpt01.html`。
舊 `temp.html` 會轉到正式頁面。
正文由 `campaigns/data/chapter-content.json` 的 `plus-c08-chpt01` 控制。
正文採與其他章節相同的 `source`、`title`、`tagline`、`date`、`image`、`content.zh` 與 `content.en` 結構，只多一個 `lock`。中文與英文各有 27 個段落項目。
頁面左上角的語言按鈕沿用全站 `npc-lang` 偏好，切換正文、標題、抉擇與鎖定表單，不重建作答表單或丟棄未送出的內容。
題目與角色組別統一由 `campaigns/data/plus-08-multiple-choices.json` 控制。
正式頁的腳本帶版本參數；Service Worker 對題目、章節 JSON 與抉擇腳本優先讀取網路，避免沿用舊測試內容。

## 公布與作答

章節使用 `lock` 控制流程：
- `lock: 1`：需要選擇角色並輸入角色密碼，才能檢視正文與作答區；不公布其他角色答案。
- `lock: 0`：直接顯示正文與答案區，不顯示密碼欄位或作答表單，也不啟動匿名登入。

目前第一章為 `lock: 1`。題目組別中尚未作答的角色預設計入選項 1，並在該選項顯示角色圖示；實際送出後改用 Firestore 儲存的答案。
預設結果由組別名單與現有答案計算，不建立假的提交紀錄，每個角色僅計一次。
本題顯示四個固定選項與第五項「自行填答」。自訂答案最多 4000 字，保留換行與空白，以純文字顯示。
龍恩屬於獨立的 `ron` 組，其餘五人屬於 `party` 組。

## Firebase

管理文件：`chapterAccess/plus-c08/pages/chpt01`，包含 `chapterKey`、`lock`、六個 `passwordHashes`、`questions`。
管理文件僅管理員可讀寫，前端不取得密碼或雜湊清單。

角色登入採 `credentialMode: "character-password"`：先選擇冒險者，再輸入該角色的密碼，無須角色名前綴。
密碼只儲存 SHA-256 雜湊至 Firebase，不將明文或雜湊寫入 git。

授權：`chapterAccess/plus-c08/pages/chpt01/grants/{Firebase匿名uid}`。
答案：`chapterAccess/plus-c08/pages/chpt01/questions/{questionId}/answers/{characterId}`。
第一章題目 ID 是 `midori-and-koyuki`，不沿用測試題 `crossroads` 的答案。
有效授權的角色只能修改自己的答案；再次確認會更新答案並保留最初建立時間。更改密碼會使先前該角色的授權失效。

## 管理工具

`python3 scripts/setup_adventurer_choices.py` 預設只預覽目標，`--apply` 才會寫入 Firebase。
需使用已具權限的 Application Default Credentials，Python 套件見 `config/python/requirements-admin.txt`。

修改角色組別或 `lock` 後，執行工具加上 `--apply` 同步權限設定；不提供密碼參數時會保留原有密碼。
`--passwords-stdin` 可從 stdin 接收六個角色 ID 對應的完整密碼，只在記憶體中計算雜湊，不輸出密碼。請使用隱藏輸入，勿將密碼放在命令參數、shell 歷史、文件或版本控制內。

正文仍是公開靜態 JSON，畫面解鎖不會限制原始劇情檔案的讀取。

## 管理檢視

保持冒險者選單在空白預設選項，輸入管理檢視密碼後即可載入章節全文及所有題目的作答結果。此模式顯示已提交人數、每名角色是否已提交，以及完整自訂答案；未提交者仍顯示預設第一項，並明確標記。

管理授權使用本章 `passwordHashes.admin`，僅可讀取本章答案，不具其他管理後台權限，也不能新增、修改或刪除角色答案。密碼明文與實際雜湊不存入 git；更新可執行 `scripts/setup_adventurer_choices.py --apply --review-password`，工具會隱藏輸入。角色密碼、既有答案及其他管理密碼在一般設定同步時保留。
