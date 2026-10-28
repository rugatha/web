# Firebase Storage 圖片路徑（2026-10-28）

網站編輯圖片依用途逐層排列。可從 `public-images/` 進入，依照故事系列、章節、人物或地點尋找：

| 類別 | 路徑示例 | 用途 |
| --- | --- | --- |
| 故事封面 | `public-images/arcs/brown/c01/reading-bdd66fea.webp` | Brown 系列第 1 團封面 |
| 章節圖 | `public-images/chapters/brown/c01/chapter-01/reading-eb2f9c57.webp` | 第 1 章大圖 |
| NPC 肖像 | `public-images/npcs/addie-applewood/reading-eb5e6318.webp` | 人物大圖 |
| 地點圖 | `public-images/locations/material-realm/mattington/.../reading-xxxxxxxx.png` | 依世界、地區、城市、地點逐層查找 |
| NPC 簽名 | `public-images/signatures/addie_applewood/signature-b0df5760.png` | 簽名 PNG |
| 私人原圖 | `image-originals/chapters/brown/c01/chapter-01/original-cfc645eb.png` | 管理端保留的完整原圖 |

檔名末尾的 8 位校驗碼用來區分後續修訂，資料夾名稱則可直接用來瀏覽。`thumb` 是縮圖，`reading` 是網站閱讀版，`original` 是未壓縮的私人備份。使用者自己的 `profile-photos/` 與 `character-portraits/` 仍由帳號權限與其資料記錄管理，本次沒有搬移。

完整的 1,273 個舊／新物件路徑、舊與新 generation、大小和 SHA-256 對照在 [readable-paths-2026-10-28.json](readable-paths-2026-10-28.json)。搬移先建立並驗證新副本，網站引用其後切換。原有路徑需等正式網站更新確認後再清理，以免舊頁籤或快取失效。
