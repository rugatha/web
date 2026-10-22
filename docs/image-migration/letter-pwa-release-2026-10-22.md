# 信件大圖閱讀：PWA／離線驗收與發布

日期：2026-10-22（台北時間）。本文件記錄發布前驗收；正式發布結果以本次 GitHub Pages workflow 與正式複驗紀錄為準。本次只發布閱讀改善及相關工具／紀錄，離線批次的 WebP 不上傳 Storage，不套用圖片來源切換。

## 行為

- Wilds c05 第六章的中英文五張信件提供完整圖片連結，可用滑鼠或鍵盤開啟既有原圖。
- worker 升為 `rugatha-pwa-v28`，註冊 URL 與該章載入的 `shared/pwa.js` 均加上 `20261022-letter-reading` 版本，避免新閱讀流程沿用舊腳本。
- 章節 JSON 改為 network-first：連網時取得當前正文，網路失敗時使用最後成功的快取。連網請求次數不增加，原本 stale-while-revalidate 也會在背景抓取。
- 升級會清除舊 Rugatha cache，保留其他應用程式的 cache。既有開啟頁籤不強制重新整理，以免中斷會員編輯；更新後連網重新開啟／載入章節，建立新版本離線快取，再進行離線閱讀。

## 發布前驗收

本機使用 HTTPS `rugatha.test:8767` 對應 loopback，以真實正式 worker 執行；沒有改寫 worker 程式來避開測試。直接用 localhost 會進入不快取的開發分支，不能代表本次驗收。

- 從 Git 中的 `46f445b` 啟動真正 v27 worker，放入沒有大圖連結的舊 JSON；實際章節載入 `shared/pwa.js` 後升級到 v28，清除 v27 cache，保留無關 cache。
- 另在 v28 runtime 中放入舊 JSON，確認下一次連網載入就顯示新閱讀連結，不須再經一次 stale-while-revalidate 重載。
- 1280px 與 390px 均先看過中英文五張信件，再阻斷網路、整頁重新載入、切換語言，使用鍵盤另開原圖；共十次原圖文件均有正確 JPEG MIME 與原尺寸，並確認回應來自 Service Worker。
- 恢復網路後正常重新載入；沒有水平溢出。測試封鎖外部登入、資料庫、分析等請求，沒有私人帳號或雲端寫入。
- `npm run test:images` 15 項、PWA 單元五項、既有圖片 Chrome 七項、本次 HTTPS Chrome 兩項，共 29 項通過。並未宣稱重跑全部 Emulator／會員瀏覽器測試。

證據見 [本機 PWA 驗收 JSON](letter-pwa-local-2026-10-22.json)。截圖在忽略提交的 `test-results/letter-browser/`。不宣稱實體 iPhone／Android 的手勢驗收，也不保證沒看過、沒快取的圖片能離線開啟。

## 重跑與正式複驗

使用 Node 24、OpenSSL 與 Playwright Chromium／已安裝 Chrome；本機測試需保留 `46f445b` 的 Git 歷史。TLS 憑證只在系統暫存產生，伺服器只綁定 `127.0.0.1`。

```sh
RUGATHA_IMAGE_BROWSER_CHANNEL=chrome npm run test:letter-browser
RUGATHA_IMAGE_BROWSER_CHANNEL=chrome RUGATHA_LETTER_TEST_BASE_URL=https://rugatha.com npm run test:letter-browser
```

正式模式使用原站與實際 v28 worker；在新的隔離瀏覽器 context 放入舊 cache，驗證清除、連網資料更新與離線閱讀，不將舊 worker fixture 發布到網站。真正的 v27→v28 安裝升級由本機 HTTPS 測試覆蓋。正式報告預設輸出至系統暫存 `rugatha-letter-pwa/production-{1280,390}.json`。

發布後另核對正式 JSON、worker 與版本化 PWA 腳本是否與提交相符，並重跑既有公開圖片快取驗收。正式複驗結果保留在系統暫存，避免只為追加驗收結果再觸發一輪網站發布。
