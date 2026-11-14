# 神祇入口頁縮圖（2026-11-15）

`/deities/index.html` 原本在 160px 圓形卡片中，以 CSS 背景同時載入 12 張原尺寸 PNG（共 26,537,206 bytes）。新增 480 × 320 WebP 品質 82 衍生圖後，這 12 張合計 248,850 bytes，減少 99.06%。完整來源、雜湊及位元組數見 [deity-thumbnails.json](deity-thumbnails.json)。另外 4 張 NPC 卡片改用 `npc-current.json` 既有的 `thumb`。

縮圖使用同一 Firebase bucket，公開路徑沿用 `public-images/site/deities/<id>/image-<hash>.webp`，與現有 service worker 離線快取規則相容。新增物件皆採 STANDARD、immutable 一年快取，已逐張驗證匿名下載 SHA-256、Content-Type、Cache-Control 及 CORS。

`deities.json` 新增 `thumbnail`；原本 `image` 和私人原圖保留，詳細頁仍使用原尺寸圖片。卡片改為固定 160 × 160 的 `<img loading="lazy" decoding="async">`，保留置中裁切、圓形與裝飾疊層。頁首橫幅優先載入。

重新製作及驗證（需要 cwebp 與既有 Firebase CLI 登入）：

```sh
node scripts/prepare-deity-thumbnails.mjs
npm run test:images
RUGATHA_IMAGE_BROWSER_CHANNEL=chrome npx playwright test --config playwright.images.config.mjs tests/image-browser/deities.spec.mjs
```

製作工具只新增衍生圖，所有縮圖通過公開端點驗證後才更新資料引用。圖片已上傳；HTML、CSS、JS 與 JSON 為本機變更，需隨網站正常部署流程發布。

目前牌卡改為滿寬 1:1 方形圖像，沿用上述 WebP 衍生圖並置中裁切；已移除詳情連結與 `deities/pages/*.html`。每張圖下緣中央預留圓形宗教 Logo 欄位，在 `deities.json` 的神祇物件加入 `logo` 圖片 URL 即可顯示，未提供時顯示 Rugatha Logo（`assets/logo/rugatha-icon.png`）。
