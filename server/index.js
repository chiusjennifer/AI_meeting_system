/**
 * AI 會議記錄系統 - Node.js 後端
 * /api/upload: 音檔上傳 → Whisper 轉譯 → GPT-4o 摘要 → 存入 MySQL
 */
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const FormData = require('form-data');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// 確保有 OpenAI API Key
if (!process.env.OPENAI_API_KEY) {
  console.error('請在 .env 中設定 OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer 設定：暫存上傳檔案
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp3';
    cb(null, `audio_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB (Whisper 上限)
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('僅支援 mp3, mp4, mpeg, mpga, m4a, wav, webm'));
  },
});

// MySQL 連線池
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'ai_meetings',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

// CORS（前端可能在不同 port）
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-User-Id');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// Helpers
const clientRoot = path.join(__dirname, '..');
const normalizeEmail = (email = '') => email.trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const toUserPayload = (row) => ({
  id: Number(row.id),
  name: row.name,
  email: row.email,
});
function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// API 路由必須在 express.static 之前，否則 /api/meetings 會被當成靜態檔案而 404
// 會員註冊
app.post('/api/register', async (req, res) => {
  const name = (req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email || '');
  const password = req.body?.password || '';

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: '請填寫姓名、電子郵件與密碼' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: '請輸入有效的電子郵件' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: '密碼至少 6 碼' });
  }

  try {
    const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length) {
      return res.status(400).json({ success: false, message: '此電子郵件已被註冊' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hash]
    );

    return res.json({
      success: true,
      user: { id: result.insertId, name, email },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: '註冊失敗，請稍後再試' });
  }
});

// 會員登入
app.post('/api/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email || '');
  const password = req.body?.password || '';

  if (!email || !password) {
    return res.status(400).json({ success: false, message: '請輸入電子郵件與密碼' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, password FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (!rows.length) {
      return res.status(400).json({ success: false, message: '電子郵件或密碼錯誤' });
    }

    const userRow = rows[0];
    const match = await bcrypt.compare(password, userRow.password);
    if (!match) {
      return res.status(400).json({ success: false, message: '電子郵件或密碼錯誤' });
    }

    return res.json({ success: true, user: toUserPayload(userRow) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: '登入失敗，請稍後再試' });
  }
});

// 登出（目前僅前端清理 token / localStorage）
app.post('/api/logout', (_req, res) => {
  res.json({ success: true });
});

// 會議紀錄列表與新增（以 X-User-Id 指定使用者）
app.get('/api/meetings', async (req, res) => {
  const userId = parseInt(req.headers['x-user-id'] || '0', 10);
  if (!userId || userId <= 0) {
    return res.status(401).json({ success: false, message: '請先登入' });
  }
  try {
    const [rows] = await pool.execute(
      'SELECT id, title, created_at, transcript, summary FROM meetings WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    const list = (rows || []).map((r) => ({
      id: Number(r.id),
      title: r.title ?? '',
      date: r.created_at != null ? new Date(r.created_at).toLocaleString('zh-TW') : '',
      transcript: r.transcript ?? '',
      summary: r.summary == null ? null : typeof r.summary === 'string' ? safeJsonParse(r.summary) : r.summary,
    }));
    return res.json({ success: true, list });
  } catch (err) {
    console.error('Meetings list error:', err);
    return res.status(500).json({
      success: false,
      message: '系統錯誤',
      error: err.message || String(err),
    });
  }
});

app.post('/api/meetings', async (req, res) => {
  const userId = parseInt(req.headers['x-user-id'] || '0', 10);
  if (!userId || userId <= 0) {
    return res.status(401).json({ success: false, message: '請先登入' });
  }
  const title = (req.body?.title || '會議紀錄').trim();
  const transcript = req.body?.transcript || '';
  const summary = req.body?.summary ?? null;
  try {
    const [result] = await pool.execute(
      'INSERT INTO meetings (user_id, title, transcript, summary) VALUES (?, ?, ?, ?)',
      [userId, title, transcript, summary ? JSON.stringify(summary) : null]
    );
    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Meetings create error:', err);
    return res.status(500).json({
      success: false,
      message: '系統錯誤',
      error: err.message || String(err),
    });
  }
});

/**
 * POST /api/upload
 * Body: multipart/form-data
 *   - file: 音檔（必填）
 *   - user_id: 使用者 ID（必填）
 *   - title: 會議標題（選填，預設為檔名）
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  let filePath = null;

  try {
    console.log('[Upload] 收到請求, file:', req.file ? req.file.originalname : '無');
    if (req.file) {
      console.log('[Upload] 檔案大小:', req.file.size, 'bytes, 路徑:', req.file.path);
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '請上傳音檔' });
    }

    const userId = parseInt(req.body.user_id || req.headers['x-user-id'] || '0', 10);
    if (!userId || userId <= 0) {
      return res.status(400).json({ success: false, message: '請提供有效的 user_id' });
    }

    filePath = req.file.path;
    const title = (req.body.title || '').trim() || path.basename(req.file.originalname, path.extname(req.file.originalname)) || '會議紀錄';

    // 1. Whisper 轉譯
    const transcript = await transcribeWithWhisper(filePath);

    // 2. GPT-4o 生成摘要（符合 mockData 格式）
    const summaryObj = await generateSummaryWithGPT(transcript);

    // 3. 存入 MySQL
    const [result] = await pool.execute(
      'INSERT INTO meetings (user_id, title, transcript, summary) VALUES (?, ?, ?, ?)',
      [userId, title, transcript, JSON.stringify(summaryObj)]
    );

    const meetingId = result.insertId;
    res.json({
      success: true,
      meeting: {
        id: meetingId,
        title,
        transcript,
        summary: summaryObj,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({
      success: false,
      message: err.message || '處理失敗，請稍後再試',
    });
  } finally {
    // 刪除暫存檔
    if (filePath && fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {});
    }
  }
});

/**
 * 使用 OpenAI Whisper 轉譯
 */
async function transcribeWithWhisper(filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('model', 'whisper-1');
  form.append('language', 'zh');
  form.append('response_format', 'text');

  const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      ...form.getHeaders(),
    },
    timeout: 120000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return typeof response.data === 'string' ? response.data : (response.data?.text || '');
}

/**
 * 使用 GPT-4o 根據轉譯文字生成摘要
 * 輸出格式符合 mockData：summary, keyDecisions, actionItems, topics, todos, decisions
 */
async function generateSummaryWithGPT(transcript) {
  const systemPrompt = `你是一位專業的會議紀錄助理。請根據逐字稿內容，產生結構化 JSON 摘要。

必須輸出「純 JSON 物件」，不要有 markdown 或額外文字。格式如下：
{
  "summary": "一段簡短的會議摘要（1-3 句話）",
  "topics": ["會議主題1", "會議主題2"],
  "keyDecisions": ["關鍵決策1", "關鍵決策2"],
  "actionItems": [
    { "assignee": "負責人", "task": "待辦事項", "deadline": "YYYY-MM-DD" }
  ],
  "todos": ["待辦1", "待辦2"],
  "decisions": ["決策1", "決策2"]
}

規則：
- topics: 會議討論的主題或重點
- keyDecisions: 會議中做出的重要決策
- actionItems: 有明確負責人與期限的待辦（assignee, task, deadline 必填）
- todos: 簡短的待辦項目（若無可從 actionItems 的 task 衍生）
- decisions: 與 keyDecisions 相同或簡化版`;

  const userPrompt = `請根據以下會議逐字稿產生摘要：\n\n${transcript.slice(0, 12000)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  });

  const content = response.choices?.[0]?.message?.content?.trim() || '{}';
  try {
    // 移除可能的 markdown 程式碼區塊
    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    return {
      summary: transcript.slice(0, 200) + (transcript.length > 200 ? '…' : ''),
      topics: ['會議內容'],
      keyDecisions: [],
      actionItems: [],
      todos: [],
      decisions: [],
    };
  }
}

// 健康檢查
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-meeting-upload' });
});

// 靜態檔案與首頁（放在 API 之後，避免 /api/meetings 被當成檔案路徑而 404）
app.use(express.static(clientRoot));
app.get('/', (_req, res) => {
  res.sendFile(path.join(clientRoot, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AI 會議記錄伺服器運行於 http://localhost:${PORT}`);
  console.log('  POST /api/upload - 上傳音檔並轉譯摘要');
});
