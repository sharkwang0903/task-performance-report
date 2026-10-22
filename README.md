# 任務績效線上填寫系統

純 HTML、CSS、JavaScript 靜態網站，介面使用繁體中文，不需登入或資料庫。以既有 `任務績效_公版.md`、`report.css`、公版 PDF 為內容與視覺參考，保留八個員工填寫項目及總經理評定名稱。原始公版檔案不修改。

## 本機開啟

可先雙擊專案中的 `開啟本機預覽.cmd`，保留開啟的終端機視窗，再開啟下方本機網址。也可在本專案資料夾開啟終端機，使用 Node.js 執行：

```powershell
node serve.cjs
```

接著開啟 <http://127.0.0.1:4173/docs/>。結束時在終端機按 Ctrl+C。

也可使用電腦上既有的 Python：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

也可以直接雙擊 `docs/index.html`，PDF 預覽與下載已支援本機檔案模式（Edge 實測）。PDF 字型改為按需載入隨站附上的 `fonts/report-font.js`，不使用會被 `file://` 安全限制阻擋的 fetch 讀取。請保留完整 `docs/` 資料夾。日常測試仍建議使用固定 HTTP 網址，因為檔案模式的 localStorage 行為與路徑有關；移動檔案或換網址可能看到不同草稿。預覽伺服器只監聽這台電腦的 127.0.0.1，沒有接收表單或上傳資料的 API。

## 操作

1. 填寫共用回報者、填寫日期、回報週別。填寫日期預設為本機當天；回報週別預設當週，可選其他週，並顯示週一至週日完整日期範圍（例如 2026/10/19–2026/10/25）。Deadline 仍為各任務的截止日期。
2. 填寫任務名稱及八個項目。評級初始不預選。
3. 使用標籤新增、切換、複製或刪除任務。刪除需確認，至少保留一項。標籤也支援方向鍵、Home、End。
4. 如有需要，填寫共用備註、自我檢討或對公司的建議。
5. 點「預覽 PDF」檢查內容，再用「生成 PDF」直接下載。也可使用「列印／另存 PDF」。

任務標籤中的數字僅供操作辨識，沒有新增制度上的任務編號。欄位允許留白，以便預覽未完成的草稿；使用者仍須依公司的填報規則確認內容完整。

## 主要檔案

| 路徑 | 用途 |
| --- | --- |
| `docs/index.html` | 表單骨架、共用資料、任務頁籤、輸出及預覽視窗 |
| `docs/style.css` | 藍灰色操作介面、桌面及手機排版 |
| `docs/script.js` | 任務增刪複製、單選、localStorage、匯出互動與錯誤回饋 |
| `docs/report-week.js` | ISO 週別換算、週一至週日範圍與跨年處理 |
| `docs/pdf-generator.js` | 字型載入、文字換行、容量檢查、PDF 與列印共用版面 |
| `docs/pdf.css` | A4 頁面、列印隱藏操作介面 |
| `docs/vendor/` | pdf-lib、fontkit 與授權文件，全部由網站自身載入 |
| `docs/fonts/` | Noto Sans TC 標準中文字型與 SIL OFL 授權 |
| `docs/fonts/report-font.js` | 本機檔案模式可載入的 PDF 字型資料；僅在產生 PDF 時讀取 |
| `serve.cjs` | 開發用本機靜態伺服器，部署時不需要 |
| `tests/browser.cjs` | 使用合成資料的瀏覽器回歸測試 |
| `tests/verify-pdf.cjs` | 透過 PDF.js 驗證 PDF 頁數、文字擷取與版面邊界 |
| `tests/edge-cases.cjs` | 瀏覽器重啟恢復、補充長文及儲存異常測試 |
| `tests/verify_pdf.py` | 可選的 pypdf 文字驗證工具 |
| `tests/output/` | 本機測試生成的 PDF、截圖與測試結果，不是網站資料 |

## 資料與隱私

發布前的檔案分類、資料流、瀏覽器限制及實測結果見 [PRIVACY.md](PRIVACY.md)。網站已設定 `connect-src 'none'` 與 `form-action 'none'`，禁止網頁程式資料連線及表單提交；只讀取本站靜態資源與開啟本機 Blob PDF。

資料只保存在目前瀏覽器、目前網站來源的 localStorage，為沿用既有草稿，鍵仍為 `task-performance:v1`，內部資料版本已升為 `version: 2`。資料包含共用 `personal`、有順序的 `tasks`、選取索引 `active`、共用 `supplement`。舊版 `reportDate` 自動換算為所屬 ISO 週別 `reportWeek`（YYYY-Www），既有任務及補充說明保留。每次輸入與任務操作即儲存，重新整理、重開分頁或重開一般瀏覽器可恢復。切換瀏覽器、裝置、來源或清除網站資料後不會自動搬移。

所有函式庫與字型都隨網站提供。表單內容不傳送至外部伺服器，沒有分析追蹤、外部字型服務或雲端同步。下載與預覽以瀏覽器內的 Blob 生成。共用電腦上，其他使用相同瀏覽器的人也可能看到草稿，使用後可按「清除所有資料」。無痕模式或瀏覽器清理工具可能使草稿消失，PDF 是報告輸出，不是可匯入的草稿備份。

儲存資料含版本號；無法辨識的版本或結構不會自動覆寫，畫面會說明暫停自動儲存。未來改版需在讀取流程加入明確的遷移規則。儲存空間不足時會提示，頁面中的內容暫時保留。請避免同時在多個分頁編輯，相同網站來源共用同一份儲存資料；另一個分頁變更時會顯示提醒。

## PDF 技術

使用 [pdf-lib 1.17.1](https://pdf-lib.js.org/) 與 [@pdf-lib/fontkit 1.1.1](https://github.com/Hopding/fontkit) 在瀏覽器繪製真正的文字、表格線與向量方框。不是網頁截圖。PDF 內嵌 Noto Sans TC 字型，文字可選取、搜尋及複製。字型來自 [Google Fonts Noto Sans TC](https://github.com/google/fonts/tree/main/ofl/notosanstc)，以 FontTools 將可變字型固定為 Regular 400 的標準 TrueType 後隨站附上；執行網站不需要 FontTools 或 Python。為避免字形子集化缺字，採完整內嵌，整份 PDF 共用同一份字型，固定負擔約 4.4 MB；關閉非必要的字形替換，確保文字實際寬度與容量檢查一致。

版面沿用原公版的藍灰配色、A4 直式、約 15 mm 左右邊界、基本資料表、8% / 25% / 67% 的三欄任務表，以及獨立總經理評定區。為讓資料欄位完整換行，基本資料欄寬調整為 15% / 38% / 15% / 32%。文字固定為 10.5 pt，選項 9.5 pt，標題 20 pt；不隨內容無限制縮小。每一項任務獨立一頁，總經理完成評級及完成時限的選項全部保留空框。

補充說明為共用欄位，只出現一次，接在最後一項任務的總經理評定之後；當頁有空間就不另起頁，只輸出有填內容的項目。空間不足時才換頁。內容很長時會自動延續到後續補充頁，標示「續」，不裁切文字。任務頁不得延續；容量不足則指出任務，整份報告停止預覽、下載及列印，請先縮短該任務內容。

容量以內嵌字型的實際字寬、換行、欄高和評定區總高度計算，並檢查任務名稱與回報者造成的基本資料表增高。缺少字形的字元（例如某些 emoji）會明確提示替換，避免默默輸出空白。核取方框以向量繪製，不依賴方框字形；員工選中的選項畫勾，總經理選項保持空白。

PDF 預覽顯示實際生成的 PDF；列印備用使用同一份版面座標的 SVG 文字與線條。請使用網站的「列印／另存 PDF」按鈕，並選 A4、100% 比例、關閉瀏覽器頁首／頁尾。直接 Ctrl+P 若未經網站容量檢查，只會顯示操作提示。瀏覽器 PDF 檢視器不支援嵌入預覽時，可使用預覽視窗中的「另開 PDF」或直接下載。

## GitHub Pages 部署（本階段未執行）

確認本機版面後，由使用者決定將專案提交並推送到 GitHub。網站內容全部在 `docs/`，沒有打包步驟。

1. 在 GitHub 儲存庫進入 **Settings → Pages**。
2. **Build and deployment → Source** 選 **Deploy from a branch**。
3. 分支選 **main**，資料夾選 **/docs**，儲存設定。
4. 等待 Pages 部署完成，開啟儲存庫顯示的網址。

所有 CSS、JavaScript、字型均使用相對路徑，適用 `https://帳號.github.io/儲存庫名稱/` 的專案子路徑。部署不需要 `serve.cjs` 或 `tests/`，不需要金鑰、登入或伺服器。正式網址與本機網址的 localStorage 來源不同，本機草稿不會自動出現在正式網站。

## 驗證與限制

測試使用隔離的瀏覽器資料，不會將測試內容寫死在網站或污染使用者的草稿。瀏覽器測試需開發環境提供 Playwright、pdf-lib 與已安裝的 Edge；可設 `TEST_BROWSER=chrome` 改用 Chrome。先啟動預覽伺服器，再執行 `node tests/browser.cjs` 及 `node tests/edge-cases.cjs`。PDF 驗證另需 PDF.js，執行 `node tests/verify-pdf.cjs`。套件不在標準搜尋路徑時，`TEST_NODE_MODULES` 可指定其 node_modules 目錄。可選的 Python 驗證需 pypdf，執行 `python tests/verify_pdf.py`，但完整中文字型使其解析較慢。詳見 `tests/TEST-REPORT.md`。

- 目前不提供草稿匯入／匯出或跨裝置同步。
- 任務數沒有設定固定上限；已測試至少十項，極大量內容仍受裝置記憶體與瀏覽器儲存容量限制。
- 日期選擇器外觀由瀏覽器與作業系統決定。桌面 Edge 完成自動化實測；其他瀏覽器、實體手機與真實印表機仍應由使用者驗收。
- PDF 的中文字型初次載入需要下載網站內附的字型，首次產生可能稍慢。字型與函式庫全部是本網站的靜態資源。

若更新 `NotoSansTC-Regular.ttf`，請執行 `node tests/build-font.cjs` 同步重建 PDF 字型資料。`node tests/local-file.cjs` 驗證直接開啟 HTML 與 HTTP 兩種模式下的預覽和實際下載，並驗證字型檔載入失敗的提示與重試。
- 公開部署的是填寫工具。草稿不在 GitHub 儲存庫或伺服器中，但使用者主動下載、列印或傳送 PDF 後的資料由使用者自行管理。

本階段沒有 git commit、git push 或公開部署。
