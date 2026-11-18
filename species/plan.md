# Rugatha Species 網頁規劃

## 目前呈現

`/species/index.html` 是種族圖鑑的唯一呈現頁。讀者可搜尋中英文名稱，並依生物類型複選篩選。每個母種以牌卡顯示名稱、類型、中英文完整介紹及肖像；有亞種時，點擊亞種名稱會在牌卡下方展開其介紹。同一時間只展開一個亞種。

牌卡不連往獨立介紹頁。PC／NPC 登場角色將來另行設計，目前不在種族資料或牌卡呈現。

## 資料

[`data/species.json`](data/species.json) 的第一層是母種 ID。每筆包含 `name: {zh,en}`、`desc: {zh,en}`、`portrait`、`creature-type: string[]`，以及 `subspecies: { [id]: species }`。亞種完整資料放在母種的 `subspecies` 下，不在第一層重複記錄。`creature-type` 使用正式類型 ID，另有 Rugatha 自訂的 `magical-creature` 導覽分類；多值依據見[對照備註](creature-type-notes.md)。

簡介只採用現有世界觀支持的共通特徵，不把單一角色的外貌或能力泛化到整個種族。未確認的名稱與分類以[種族盤點](race-inventory.md)為準，不自行合併或補造設定。

## 圖像

索引使用 [`assets/portrait/`](assets/portrait/) 的去背半身像；桌面版肖像在牌卡右側浮貼，手機版限制在牌卡內。亞種展開區若有肖像，顯示其肖像與完整介紹。既有三視圖仍保留在圖庫供檢視，可透過 [`review.html`](review.html) 查看原圖；三視圖不由 `species.json` 接入索引。
