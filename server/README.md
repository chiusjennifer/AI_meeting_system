# AI 會議記錄 - Node.js 上傳服務

音檔上傳、OpenAI Whisper 轉譯、GPT-4o 摘要、MySQL 儲存。

## 安裝

```bash
cd server
npm install
```

## 設定

複製 `.env.example` 為 `.env` 並填入設定：

```bash
cp .env.example .env
```

必填項目：
- `OPENAI_API_KEY`：OpenAI API 金鑰（Whisper + GPT-4o）

資料庫與 PHP 專案共用，預設與 `api/config.php` 一致。

## 執行

```bash
npm start
```

開發模式（自動重啟）：
```bash
npm run dev
```

服務預設運行於 http://localhost:3000

## API

### POST /api/upload

上傳音檔，自動轉譯並生成摘要，結果存入 MySQL `meetings` 表。

**Request**：`multipart/form-data`
- `file`（必填）：音檔（mp3, mp4, mpeg, mpga, m4a, wav, webm，上限 25MB）
- `user_id`（必填）：使用者 ID
- `title`（選填）：會議標題，預設為檔名

**Response**：
```json
{
  "success": true,
  "meeting": {
    "id": 1,
    "title": "會議紀錄",
    "transcript": "轉譯文字...",
    "summary": {
      "summary": "會議摘要",
      "topics": [],
      "keyDecisions": [],
      "actionItems": [],
      "todos": [],
      "decisions": []
    }
  }
}
```

## 流程

1. Multer 接收音檔
2. OpenAI Whisper 轉譯為文字
3. GPT-4o 根據轉譯生成結構化摘要（符合 mockData 格式）
4. 寫入 MySQL `meetings` 表
