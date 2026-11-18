# 塔爾莫 Tar'Mo

新增頁面：`npc/npc_page/pages/Tar_Mo.html`。資料整理自 plus c08 第 1～4 章，姓名與拉索斯信仰由作者確認。武僧／聖騎士、左臂肘下截肢與造型依作者附圖及第 4 章插圖。角色過去的經歷保留「本人所述」語氣。

## 出場與關係

- c08 第 1 章：龍恩回想童年由塔爾莫帶領，兩人曾利用繩梯偷溜進寺。
- c08 第 2 章：15051.05.16 在尖頂寺與龍恩重逢。
- c08 第 3 章：15051.05.16～05.18 交代手臂、灰祠、妖精荒野與協助龍恩的決定。
- c08 第 4 章：15051.05.19～05.20 尋找眼睛、操縱僧人與威脅蒂雅菈長老。
- appearance timeline：15051.5.16～15051.5.20 為目前已知持續出場區間，結束日期只表示最新已知登場，沒有宣告離寺或死亡。童年與妖精荒野事件缺明確日期，不臆造時間點。
- 核心關係是 PC 龍恩，已在雙語介紹中交代；現有 `related` 僅接受 NPC 角色庫 ID，故不填不存在的 Ron NPC ID。蒂雅菈長老尚無 NPC 頁與正式 ID，暫不建立無效卡片。未因同門身分擅自推定與尚恩有直接往來。

## 待作者補充（不阻擋頁面）

- 年齡／生日；如不公開可保持未提供。
- 聖騎士誓言、武僧流派；目前只確認職業與拉索斯信仰。
- 灰祠確切位置、得罪的派系，以及離寺／進出妖精荒野的年份。
- 與蒂雅菈長老的合作起點、真實目的、失落記憶：屬未揭露劇情，可先保留。
- 「命運的抉擇」已依作者授權設計草案；是互動假設情境，不是既有團錄事件。可在 `npc/data/characters.json` 的 Tar_Mo `qaZh`／`qaEn` 修改。

## 圖像來源與保存

使用內建 imagegen 工具，肖像依作者附圖及 `campaigns/chapter-banners/plus-c08-chpt04.webp` 製作，簽名另行生成為透明 PNG。兩張均已目視檢查；肖像保留左臂截肢、完整髮髻與服裝識別，簽名保留透明 alpha。

肖像閱讀版／縮圖與私人原圖 archive generation：`docs/image-migration/tar-mo-2026-11-18.json`；同步加入 `npc-current.json`。簽名公開 URL、checksum：`docs/signature-migration/published.json`，提示詞：`generation-manifest.json`。均使用新 hash 路徑，驗證匿名讀取、checksum、快取；肖像原圖也確認拒絕匿名存取。原圖與輸出暫存不納入 repository。

## Final portrait prompt

Use case: stylized-concept. Asset: one square standalone NPC portrait of Tar’Mo for a dark fantasy encyclopedia. Use the attached character sheet and the chapter confrontation illustration as identity references; isolate only the adult male half-elf Tar’Mo, no other people. Exact identity: lean weathered handsome face, pointed ears, dark brown-black messy topknot with loose strands, light mustache and stubble, narrow thoughtful eyes, subtle unsettling confident smile. Charcoal brown worn layered monk/paladin robes, faded ivory stole with dark sun insignia, muted burgundy scarf and robe panel, bronze sun-wheel brooch. LEFT arm amputated below elbow with wrapped stump visible, sole RIGHT hand relaxed. Three-quarter waist-up portrait, full topknot uncut, head centered with comfortable margin, both shoulders and stump in frame. Dim stone monastery background softly blurred, warm amber side light, deep neutral shadows, meticulous painterly realism matching chapter04. No blade, no other characters, no text, labels, border, watermark, panels or extra limbs. Keep recognizable face and costume from the references.

## Final signature prompt

Use case: logo-brand. Asset: transparent PNG fantasy character handwritten signature, only exact text "Tar’Mo" (T a r apostrophe M o), legible in an elegant yet sharp, confident personal cursive hand. One single signature centered with generous clear margins, horizontal composition. Warm pale ivory ink, long angular T crossbar, tightly linked lowercase ar, prominent pointed M, a restrained sweeping underline tapering like a curved blade. Slight natural ink variation, no typeset font appearance. Character is a cunning half-elf monk/paladin. Only this signature and its underline. Actual transparent background, no paper, no checkerboard, no shadows, no scene, no extra symbols or text.

## 驗收

NPC 圖片一致性測試 3 項、104 章衍生 JSON 一致性檢查、雙語與 QA 欄位／四章清單／CSV 檢查均通過。Chrome 實測桌面 1440px 與手機 390px：肖像、簽名載入、四章連結、英文切換、無橫向溢出，無頁面 JavaScript 錯誤。QA 依既有行為要求會員登入，未提交正式投票。簽名在 Chrome 容器內出現透明圖片繪製裁切，頁面內以 translateZ(0) 建立獨立繪製圖層修正，重新截圖確認筆畫完整。

已執行 HTML 正規化，保留受影響 NPC 與 c08 章節 meta 更新，撤回其他原先乾淨頁面的非本次相關格式變動。未修改 `.gitignore` 與打包白名單；在 repo 外新目錄打包並確認 NPC 頁、角色資料存在，原圖與維護備註不公開。網站未部署。

## 作者回饋修正

中英文簡介已移除日期，出場時間線與章節關聯維持原紀錄。簽名直接寫入 NPC HTML，更新頁面腳本與簽名清單的版本，且動態 renderer 在清單沒有對應資料時保留頁面既有簽名，避免舊快取造成簽名消失。

依作者後續指示，登場地點由「妖精荒野／Feywild」改為既有城鎮層級的「巨大帳篷／The Great Tent」，連到 `/map/location/feywild/the-court-of-fey/the-great-tent/`。簡介中的妖精荒野經歷維持不變。
