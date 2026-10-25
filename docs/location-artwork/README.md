# 地點插圖發布紀錄

2026-10-25 清理 `output/location-previews/`：移除 13 張 PNG 與預覽頁，包含 5 張未採用版本、8 張已發布版本。正式地點資料維持不變，9 個現用 Firebase URL 全部重新匿名下載並通過 SHA-256 比對。

- `generation-history.json`：保留原始提示詞、修訂、manifest 與 published 清單，以 `source` 記錄清理前路徑。舊本機路徑只作歷史紀錄。
- `cloud-verification-2026-10-25.json`：雲端圖片的匿名下載、SHA-256 及容量驗證。
- 正式圖片引用在 `map/location/assets/location.json`；圖片原始內容由 published URL 下載後核對 hash。

未來請在 repo 外準備 PNG 與 `manifest.json`，再以 `node scripts/publish-location-previews.mjs /absolute/path/outside/repo/batch` dry-run；加上 `--publish` 才會上傳。不要重新建立 repo 內的預覽副本。
