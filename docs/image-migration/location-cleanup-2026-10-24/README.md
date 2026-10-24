# 地點圖清理精簡紀錄

使用中的 188 個地點節點均從 Firebase Storage 讀取圖片。依使用者要求，三個 `docs/location*` 資料夾及其本機原圖副本、審閱圖片、中間版本、重複歷史資料已刪除，過時的審閱重建及套用工具一併移除。本次未刪改任何 Firebase 物件。

僅保留以下非圖片紀錄：

- `firebase-cleanup-plan.json`：先前 Firebase 舊圖清理計畫，含當時受保護引用與物件版本。
- `firebase-deletions.json`：先前已刪除 133 個未使用雲端版本的逐張紀錄；保留 186 個使用中圖片物件，供 188 個節點共用。
- `retired-route-aliases.json`：已移除的 28 筆舊路徑對照，只作歷史核對及測試，網站不會讀取或轉址。
- `local-review-removal.json`：本次本機資料夾清理的檔案數、容量及正式資料 SHA-256。

正式資料在 `map/location/assets/location.json`，正式地點頁面由 `npm run locations:build` 生成。`scripts/cleanup-location-images.mjs` 與地點路徑測試已改用本目錄。

歷史雲端清理計畫中的來源檔案路徑與引用雜湊反映當時狀態，部分本機歷史路徑已刪除，不能視為現用清單。後續再次執行雲端清理前應保留本次紀錄並重新產生計畫。
