# AI 會議記錄系統

前端：HTML、CSS、JavaScript。後端（選用）：PHP + MySQL。

## 功能

- **會員登入註冊**：須登入後才可使用系統
- **音檔上傳區**：拖曳或點擊上傳音訊檔
- **即時轉譯視窗**：顯示轉錄內容與處理進度條
- **智能摘要面板**：會議主題、待辦事項 (To-do)、關鍵決策
- **歷史紀錄列表**：左側欄顯示過往會議紀錄

## 僅用前端（無後端）

1. 用瀏覽器直接開啟 `index.html`，或透過本機 HTTP 伺服器（如 VS Code Live Server）開啟。
2. 登入／註冊會以「離線模式」運作（資料存於瀏覽器 localStorage）。
3. 上傳音檔後會以模擬方式顯示轉譯與摘要。

## 使用 PHP + MySQL

1. **建立資料庫**  
   執行 `database/schema.sql` 建立資料庫與資料表：
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   或在 phpMyAdmin 匯入 `database/schema.sql`。

2. **設定資料庫**  
   編輯 `api/config.php`，設定：
   - `DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASS`

3. **以 PHP 執行**  
   將專案放在 Apache/Nginx 的網站根目錄，或使用 PHP 內建伺服器：
   ```bash
   php -S localhost:8080
   ```
   再開啟 `http://localhost:8080`。

4. 使用「註冊」建立帳號後登入，會議紀錄會儲存到 MySQL。

## 目錄結構

```
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── api/
│   ├── config.php
│   ├── auth.php
│   └── meetings.php
├── database/
│   └── schema.sql
└── README.md
```

## 注意

- 轉譯與摘要目前為前端模擬；實際部署可改接語音辨識與摘要 API（如 Google Speech-to-Text、OpenAI 等）。
- 上傳音檔僅用於觸發模擬流程，未傳至伺服器儲存；若要存檔可再擴充 `api/upload.php`。
