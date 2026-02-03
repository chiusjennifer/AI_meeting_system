# AI 會議記錄系統

前端：HTML、CSS、JavaScript。後端：**Node.js Express**（主要），可選用 PHP + MySQL 作為替代。

## 功能

- **會員登入／註冊**：須登入後才可使用系統；帳密存於 MySQL `users` 表。
- **音檔上傳區**：拖曳或點擊上傳音訊檔，由後端接收並轉譯。
- **即時轉譯視窗**：顯示 Whisper 轉錄內容與處理進度。
- **智能摘要面板**：由 GPT-4o 產出會議主題、待辦、關鍵決策等結構化摘要。
- **歷史紀錄列表**：左側欄顯示該使用者的過往會議紀錄（來自 MySQL `meetings` 表）。

## 使用 Node.js 後端（建議）

1. **建立資料庫**  
   執行 `database/schema.sql` 建立資料庫與資料表（`users`、`meetings`）：
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   或在 phpMyAdmin 匯入 `database/schema.sql`。

2. **安裝與設定後端**  
   ```bash
   cd server
   npm install
   cp .env.example .env
   ```
   編輯 `server/.env`，必填：
   - `OPENAI_API_KEY`：OpenAI API 金鑰（Whisper 轉譯 + GPT-4o 摘要）
   - 資料庫：`DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASS`（可選，有預設值）

3. **啟動伺服器**  
   ```bash
   cd server
   npm start
   ```
   服務運行於 **http://localhost:3000**。

4. **使用方式**  
   - 開啟瀏覽器前往 `http://localhost:3000`（首頁為 `index.html`）。
   - 未登入會導向 `login.html`；註冊／登入後進入主畫面。
   - 上傳音檔後，後端以 Whisper 轉譯、GPT-4o 生成摘要，並寫入 MySQL；左側歷史紀錄由 `GET /api/meetings` 取得並顯示。


## Node 後端 API 一覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/register` | 會員註冊（name, email, password） |
| POST | `/api/login` | 會員登入（email, password） |
| POST | `/api/logout` | 登出（前端清除 localStorage） |
| GET  | `/api/meetings` | 取得當前使用者會議列表（Header: `X-User-Id`） |
| POST | `/api/meetings` | 新增會議紀錄（Header: `X-User-Id`） |
| POST | `/api/upload`   | 上傳音檔 → Whisper 轉譯 → GPT 摘要 → 寫入 MySQL |
| GET  | `/api/health`   | 健康檢查 |

前端 `js/app.js` 的 `API_BASE` 需指向 Node 服務（例如 `http://localhost:3000/api`），若前端與 Node 同源可設為 `'/api'`。

## 使用 PHP + MySQL（選用）

若要以 PHP 取代 Node 作為後端：

1. 建立資料庫（同上），並在 `api/config.php` 設定連線。
2. 將專案放在 Apache 網站根目錄，或使用 `php -S localhost:8080`。
3. 前端需改回呼叫 `api/auth.php`、`api/meetings.php`（或自行設定 API 基底網址）。  
   目前預設前端已改為呼叫 Node API（`http://localhost:3000/api`），使用 PHP 時需調整 `js/app.js`、`js/auth.js` 的 API 路徑。

## 目錄結構

```
├── index.html          # 主畫面（會議記錄）
├── login.html          # 登入／註冊頁
├── meeting.html        # 會議相關頁（若使用）
├── css/
│   └── style.css
├── js/
│   ├── app.js          # 主畫面邏輯、上傳、歷史、API 呼叫
│   ├── auth.js         # 登入／註冊表單與 Node API
│   └── meeting.js
├── api/                # PHP 後端（選用）
│   ├── config.php
│   ├── auth.php
│   └── meetings.php
├── database/
│   └── schema.sql      # 資料庫結構（users, meetings）
├── server/             # Node.js 後端（主要）
│   ├── index.js        # Express 伺服器、API、靜態檔案
│   ├── package.json
│   ├── .env.example
│   └── README.md
└── README.md
```

## 注意

- **OpenAI API 金鑰**僅設定於 `server/.env`，勿寫入前端程式。
- 轉譯與摘要由 **OpenAI Whisper** 與 **GPT-4o** 完成；若連線失敗（如 ECONNRESET），可檢查網路、代理或改用 axios 手動請求（已於 `server/index.js` 實作）。
- 上傳音檔經 Multer 接收後暫存，轉譯與寫入 MySQL 後會刪除暫存檔；會議內容存於 `meetings` 表。
