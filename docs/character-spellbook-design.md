# 角色法術書設計

日期：2026-10-19。狀態：實作與本機驗測通過；正式驗收與停用演練通過，正在全面發布。

已確認決策：角色書本人可編輯、管理員唯讀；名稱採頁面重名檢查，不新增名稱索引交易；本機驗測完成後安排正式測試帳號驗收與發布。

建議每位會員保留一本個人法術書，每張已儲存角色卡再各自擁有一本獨立法術書。角色卡與法術頁開啟同一個 Firestore 文件，使用相同的同步元件。Google UID 繼續負責登入授權；資料歸屬由 memberNo 與固定角色 ID 決定。

## 現況與必要調整

- 個人書固定讀寫 `members/{memberNo}/spellbooks/default`，只允許本人存取。
- `shared/character-sheets.js` 目前用編碼後的角色名稱作為 document ID；改名時先寫新文件，再刪舊文件。這個流程必須先改掉，否則子集合中的角色法術書會留在舊路徑。
- 角色卡目前把 `spellName1`、`spellLevel1`、`spellRowCount` 等表單欄位放進角色文件的 `data`；法術選項值是 catalog 的陣列索引，而個人書已使用 PHB 英文名稱。
- `member/index.html` 也能刪除角色，必須一起改造；只更新角色卡頁面不足以保護子集合。

## 建議儲存結構

```text
members/{memberNo}
  spellbooks/default                            個人收藏／法術書
  characters/{characterId}                      角色卡
    spellbooks/default                          此角色專用法術書
```

每本書先沿用現有格式：

```js
{
  schemaVersion: 1,
  spellIds: ["Fireball", "Mage Hand"],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

法術名稱、說明與職業資料繼續讀 Firebase Storage catalog，不複製到每一本書。角色書不需要另存 UID、角色名稱或整份角色卡；歸屬由文件路徑決定。

第一版將 `spellIds` 定義為此角色選定的法術集合。每日準備、已知／法術書、種族贈予法術是不同概念；若需要每日準備狀態，後續升版加入 `preparedSpellIds`，並驗證它是 `spellIds` 的子集合，不能直接把所有收藏視為已準備。第一版不自動改變角色的職業、種族或施法資格，也不因職業／等級改變就刪掉已保存法術。

## 固定角色 ID，兼容既有角色

新建角色用 Firestore 自動 ID；角色名稱只作為可修改的欄位。

既有角色可以保留目前的 document ID，包括已編碼的名稱，將它視為不透明且固定的 `characterId`。不需要先搬動所有舊文件，也不會讓舊的 `?character=...` 連結失效。

儲存時已有 `currentKey` 就更新該文件；只有明確新建角色才產生新 ID。改名更新 `characterName`，不建立另一份角色、不刪原文件，也不移動角色書。已有角色被另一端刪除後，舊頁面儲存應回報角色不存在，不能把它當新角色重建。

目前的重名提示需改成比較正規化後的 `characterName`，不能再比較 `characterKeyForName()`。名稱唯一性是產品規則，不是識別或授權依據；不同 ID 即使同名也不能互相覆寫。若要保證跨裝置同時建立也嚴格不重名，另加 transaction 管理名稱索引，不能只依賴頁面上的角色列表。

## 使用流程

1. 法術頁的書本選擇器提供「我的個人法術書」與自己的已儲存角色；選到誰就直接讀寫那一本，標頭持續顯示角色名稱。
2. 角色卡法術區直接載入目前 `characterId` 的角色書，並提供「開啟此角色的完整法術書」，導向 `/toolbox/spells/?character={characterId}`。用 URL API 編碼參數；舊 ID 本身可能已含 `%`，不能自行重複 decode。
3. 尚未儲存的新角色先顯示「儲存角色後啟用法術書」，避免書本掛到暫時名稱或上一個角色。
4. 從個人書加入角色時明確選擇目標，執行一次性的合併複製。兩本獨立，之後不自動互相同步或覆寫。
5. 清空角色書保留 `spellIds: []` 的文件。讀取空書或缺少文件不等於需要複製個人書。
6. 切角色、換帳號或登出時解除原訂閱。存在未提交操作時先提供保持原頁重試或明確放棄，不能把佇列帶到下一本。

角色卡法術區與法術頁共用角色書這一個資料來源。角色卡整份 autosave 不再把畫面上的法術清單重複寫回 `data.spellName*`。PDF／匯出從已載入的角色書產生法術表；載入失敗或尚未同步必須顯示狀態，不能默默輸出空清單或假裝全部儲存成功。

## 共用同步介面

將 `subscribeSpellbook` 擴充為有明確 scope，預設仍為 personal：

```js
subscribeSpellbook({
  app, auth, user,
  scope: { type: "character", characterId },
  onChange
});
```

由資料層將 scope 解析為固定路徑，不接收任意文件路徑或信任 URL 傳入的 memberNo。一般使用者的 memberNo 必須透過目前 Auth UID 與 memberKeys 解析。

沿用現有交易、arrayUnion／arrayRemove、server timestamp、待同步與重試狀態。session 的識別必須包含 UID、memberNo、scope 和 characterId；同一會員從 A 切到 B 時也要關閉舊 session，不能只檢查 Auth UID。每次寫入還要確認捕捉的 scope 仍有效；角色文件存在且有權限時才能建立或更新角色書。

## 權限與刪除

| 資料 | 建議讀取 | 建議修改 |
| --- | --- | --- |
| 個人法術書 | 僅本人，維持現況 | 僅本人 |
| 角色法術書 | 本人；既有可唯讀角色卡的管理員可唯讀此角色書 | 僅角色擁有者 |

角色書的管理員唯讀是本提案建議，沿用角色卡既有檢視用途；它需要獨立 Rules 明確授權，不能讓管理員取得個人書。若採本人限定角色書，管理員檢視角色卡時應顯示存取限制，不因 403 讓整張角色卡失敗。

Rules 對 `characters/{characterId}/spellbooks/default` 明確設定 get/create/update；不允許任意 bookId、collection list 或其他會員存取。沿用 500 筆上限、去重、PHB ID 白名單、欄位與時間驗證，並要求角色父文件存在。不要假設角色卡的父層 Rules 會自動涵蓋子集合。

清空維持 update。真正刪除角色時，用一個 atomic batch 刪除已知的 `spellbooks/default` 與角色父文件。Rules 使用 `existsAfter()`／`getAfter()` 約束這兩筆刪除：父文件不能在書仍存在時被刪，書不能在角色仍存在時被單獨刪除。刪除權限只給本人，管理員仍唯讀。

Firestore 透過 SDK 刪除父文件不會自動刪子集合，所以不能沿用目前單獨 `deleteDoc(character)` 的方式。[Firebase 刪除文件說明](https://firebase.google.com/docs/firestore/manage-data/delete-data#delete_documents)、[交易後狀態 Rules API](https://firebase.google.com/docs/reference/rules/rules.firestore)

此設計第一版只允許一個已知角色書文件，才能精準 batch 清理；未來增加更多子資料時需重新設計刪除流程。既有立繪仍在 Firestore 刪除確認後清理，Storage 失敗不應重新建立角色或角色書。

## 舊角色卡法術轉移

1. 載入舊角色及角色書。只有伺服器確認角色書不存在，且舊表單有選取法術時，才提示預覽／確認轉移。
2. 用與舊角色資料匹配的 catalog 把索引轉為英文名稱；目前原始資料對應已保留的 `2026-10-18-v1`。不可使用日後任意排序的新 catalog 猜測舊索引。索引、環級不一致或來源無法確認時保留原值並提示。
3. 確認後以 transaction 讀取角色與書，確認角色仍存在、舊來源仍等於使用者看到的預覽，再建立角色書。若另一頁已建立書或角色資料已改變，重新載入／預覽，不能覆寫新資料。
4. 書存在即以它為準，即使內容為空也不再自動從舊欄位重建。保留舊欄位作相容備份，避免清空後舊法術復活；角色卡新 autosave 不再把它當主資料。
5. 個人書的舊瀏覽器來源與按 UID 的匯入 receipt 維持 personal scope，不套用到所有角色。每個角色的轉移判斷與確認必須獨立。

## 舊頁面相容與發布順序

舊角色卡仍可能以名稱搬移文件。只讓新前端採固定 ID，不能阻止已開啟的舊頁籤，因此需搭配角色文件 schema 升級與伺服器限制。

- 讀取支援既有 schema 1，新前端寫入 schema 2；允許既有角色在原 ID 原地升級。
- schema 2 不得降版；新建角色切換為 schema 2，舊版建立／改名另建 schema 1 的操作需拒絕並提示重新整理。先發布新角色儲存流程及版本化資源，再切換建立限制。
- schema 1 的相容更新只在角色尚未升級時允許；不要讓舊客戶端覆寫升級後的格式。
- 建立角色書前先確認角色已升級且 parent 存在；角色刪除的雙文件約束需先於功能啟用部署。
- 先完成 Emulator 與角色回歸，再以測試帳號驗收，最後開啟角色書。個人書保持原路徑；復原採停用角色入口並保留雲端文件與舊欄位。

## 實作與驗收清單

- [x] 將角色 ID 固定化，新建／改名／重名提示／角色 URL／會員頁入口一併處理。
- [x] 角色 schema 1→2 相容升級，測試舊前端不能搬移或降版已升級角色。
- [x] 加入角色書 Rules、父文件檢查與角色刪除的 atomic batch 約束。
- [x] 同步層接受 personal／character scope，切角色隔離 listener、佇列與晚到回應。
- [x] 法術頁書本選擇器、角色卡共用清單與雙向入口。
- [x] 明確複製個人書、舊角色索引轉移、未知項目、確認及安全重試。
- [x] 角色卡 autosave、設定匯出／匯入皆讀取正確角色書，避免雙重主資料。
- [ ] PDF 從角色書產生法術表與同步狀態保護（依使用者決策，本次不新增 PDF，留待後續）。
- [x] 同帳號 A/B 角色隔離，個人／角色書隔離，雙頁同一角色即時同步。
- [x] 改名後仍是同一本，另存／複製角色建立獨立書，清空後不復活。
- [x] 刪除與跨頁寫入併發、未存草稿、切帳號／角色、離線及重試。
- [x] 跨會員與管理員讀寫權限、父文件不存在、任意 bookId 與非法欄位拒絕。
- [x] 完整回歸、測試帳號正式驗收、快取版本更新及回退程序。


## 開發驗測紀錄

- 固定 ID：`tests/character-sheets.test.mjs` 驗證同名不同 ID、舊編碼 ID 改名不搬移、遠端刪除不重建、成對 batch 刪除；會員入口沿用不透明 key。
- Schema／Rules：Emulator 28 項通過，包含 schema 1 原地更新／升級、禁止新建 schema 1 與降版、角色書管理員唯讀、跨會員拒絕、父文件／bookId／非法欄位及 atomic delete。
- 既有角色卡與個人書回歸：41 項通過。
- 決策補充：本次不新增 PDF 功能；PDF 子項維持未完成，不以備份匯出替代驗收。

- 角色書 Chromium 7 項已通過：個人／A／B 隔離、角色頁／法術頁同步、改名、明確複製、舊索引轉移與清空不復活、離線切書明確放棄、遠端刪除不重建、未存草稿、備份建立獨立書、來源變更／既有空書拒絕覆寫。完整個人書瀏覽器回歸已通過（共 34 項）；另補驗舊登入相容與停用／恢復。
- 發布、回退與正式驗收程序另見 [角色法術書發布與回退](./character-spellbook-release.md)。

- `npm run test:all` 完整通過：Rules 28、單元／角色卡 41、瀏覽器 34。補驗角色書 9 項也通過，包含舊 IndexedDB 登入相容與角色入口停用／恢復。另補上晚到儲存／匯入回應的帳號與角色隔離防護。
- 正式驗收已建立兩個專用帳號。經使用者明確允許，暫時在指定 service account 加上 Token Creator，僅簽兩個測試 UID 的一小時 token；已立即移除臨時 binding，IAM 前後全部原始 bindings 比對一致。私人憑證不進 Git。

- 正式雙帳號驗收與部署停用／資料保留演練均通過；手機版隱藏舊法術新增入口的補測通過。全面開放後將再確認恢復與清理兩個專用測試帳號；PDF 仍依決策延後。
