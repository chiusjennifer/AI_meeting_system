/**
 * AI 會議記錄系統 - 前端邏輯
 * 會員登入註冊、音檔上傳、即時轉譯、智能摘要、歷史紀錄
 */

(function () {
  'use strict';

  const API_BASE = 'http://localhost:3000/api';
  const UPLOAD_API = 'http://localhost:3000'; // Node 上傳 API（可改為空字串使用模擬轉譯）
  const STORAGE_USER = 'ai_meeting_user';
  const STORAGE_HISTORY = 'ai_meeting_history';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => el.querySelectorAll(sel);

  const elements = {
    app: () => $('#app'),
    userName: () => $('#userName'),
    logoutBtn: () => $('#logoutBtn'),
    historyList: () => $('#historyList'),
    historyEmpty: () => $('#historyEmpty'),
    uploadZone: () => $('#uploadZone'),
    audioInput: () => $('#audioInput'),
    transcriptContent: () => $('#transcriptContent'),
    transcriptPlaceholder: () => $('#transcriptPlaceholder'),
    transcriptProgress: () => $('#transcriptProgress'),
    transcriptText: () => $('#transcriptText'),
    progressPercent: () => $('#progressPercent'),
    summaryPlaceholder: () => $('#summaryPlaceholder'),
    summaryResult: () => $('#summaryResult'),
    summaryTopics: () => $('#summaryTopics'),
    summaryTodos: () => $('#summaryTodos'),
    summaryDecisions: () => $('#summaryDecisions'),
  };

  let currentUser = null;
  let historyData = [];

  // ---------- 會員登入註冊 ----------
  function loadUser() {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      if (raw) {
        currentUser = JSON.parse(raw);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function saveUser(user) {
    currentUser = user;
    if (user) localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_USER);
  }

  function showApp() {
    const nameEl = elements.userName();
    const logoutBtn = elements.logoutBtn();
    if (nameEl) nameEl.textContent = currentUser ? (currentUser.name || currentUser.email || '會員') : '';
    if (logoutBtn) {
      logoutBtn.title = '登出';
      logoutBtn.setAttribute('aria-label', '登出');
      logoutBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>';
    }
    loadHistory();
  }

  async function handleAuthButtonClick() {
    if (currentUser) {
      saveUser(null);
      try {
        await fetch(`${API_BASE}/logout`, { method: 'POST' });
      } catch (e) {}
    }
    window.location.href = 'login.html';
  }

  // ---------- 歷史紀錄 ----------
  async function loadHistory() {
    if (currentUser && currentUser.fromApi) {
      try {
        const res = await fetch(`${API_BASE}/meetings`, {
          headers: { 'X-User-Id': currentUser.id },
        });
        const data = await res.json().catch(() => ({}));
        if (data.success && Array.isArray(data.list)) {
          renderHistoryList(data.list);
          return;
        }
      } catch (e) {}
    }
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY);
      historyData = raw ? JSON.parse(raw) : [];
    } catch (e) {
      historyData = [];
    }
    const uid = currentUser ? currentUser.id : null;
    const list = historyData.filter((h) => String(h.userId) === String(uid));
    renderHistoryList(list);
  }

  function renderHistoryList(list) {
    const ul = elements.historyList();
    const empty = elements.historyEmpty();
    if (!ul) return;
    ul.innerHTML = '';
    if (empty) empty.classList.toggle('hidden', list.length > 0);
    list.forEach((item, index) => {
      const li = document.createElement('li');
      li.dataset.id = item.id;
      li.innerHTML = `<span class="history-title">${escapeHtml(item.title || '會議紀錄')}</span><div class="history-date">${item.date || ''}</div>`;
      li.addEventListener('click', () => selectHistoryItem(item));
      ul.appendChild(li);
    });
  }

  function selectHistoryItem(item) {
    $$('.history-list li').forEach((el) => el.classList.remove('active'));
    const li = document.querySelector(`.history-list li[data-id="${item.id}"]`);
    if (li) li.classList.add('active');
    if (item.transcript) {
      elements.transcriptPlaceholder()?.classList.add('hidden');
      elements.transcriptProgress()?.classList.add('hidden');
      const transcriptText = elements.transcriptText();
      if (transcriptText) {
        transcriptText.textContent = item.transcript;
        transcriptText.classList.remove('hidden');
      }
    }
    if (item.summary) {
      elements.summaryPlaceholder()?.classList.add('hidden');
      const result = elements.summaryResult();
      if (result) {
        result.classList.remove('hidden');
        const s = item.summary;
        renderSummaryLists(s.topics || [], s.todos || [], s.decisions || []);
      }
    }
  }

  async function addToHistory(record) {
    const user = currentUser || { id: 1 };
    if (user.fromApi) {
      try {
        const res = await fetch(`${API_BASE}/meetings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': user.id },
          body: JSON.stringify({
            title: record.title || '會議紀錄',
            transcript: record.transcript,
            summary: record.summary,
          }),
        });
        if (res.ok) {
          await loadHistory();
          return;
        }
      } catch (e) {}
    }
    const id = 'm' + Date.now();
    const item = {
      id,
      userId: user.id,
      title: record.title || '會議紀錄',
      date: new Date().toLocaleDateString('zh-TW'),
      transcript: record.transcript,
      summary: record.summary,
    };
    historyData.unshift(item);
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(historyData));
    } catch (e) {}
    loadHistory();
  }

  // ---------- 上傳與轉譯 ----------
  function showProgress(show) {
    const ph = elements.transcriptPlaceholder();
    const prog = elements.transcriptProgress();
    const txt = elements.transcriptText();
    if (ph) ph.classList.toggle('hidden', show);
    if (prog) prog.classList.toggle('hidden', !show);
    if (txt) txt.classList.add('hidden');
  }

  function setProgress(percent) {
    const fill = document.getElementById('progressBarFill');
    const span = elements.progressPercent();
    if (fill) fill.style.width = Math.min(100, Math.max(0, percent)) + '%';
    if (span) span.textContent = Math.round(percent) + '%';
  }

  function showTranscript(text) {
    showProgress(false);
    elements.transcriptPlaceholder()?.classList.add('hidden');
    const transcriptText = elements.transcriptText();
    if (transcriptText) {
      transcriptText.textContent = text;
      transcriptText.classList.remove('hidden');
    }
  }

  function renderSummaryLists(topics, todos, decisions) {
    const list = (arr) => (arr || []).map((t) => `<li>${escapeHtml(t)}</li>`).join('');
    const topicsEl = elements.summaryTopics();
    const todosEl = elements.summaryTodos();
    const decisionsEl = elements.summaryDecisions();
    if (topicsEl) topicsEl.innerHTML = list(topics);
    if (todosEl) todosEl.innerHTML = list(todos);
    if (decisionsEl) decisionsEl.innerHTML = list(decisions);
  }

  function generateSummaryFromTranscript(transcript) {
    // 模擬從轉譯文字生成摘要（實際可接後端或 AI API）
    const lines = (transcript || '').split(/\n/).filter(Boolean);
    const topics = lines.length ? [lines[0].slice(0, 80) + (lines[0].length > 80 ? '…' : '')] : ['會議討論內容'];
    const todos = ['追蹤專案進度', '下次會議前完成報告'];
    const decisions = ['確認下週會議時間', '分工與時程已定案'];
    return { topics, todos, decisions };
  }

  function simulateTranscription(file, onProgress, onDone) {
    let p = 0;
    const step = 100 / 30;
    const iv = setInterval(() => {
      p += step;
      if (p >= 100) {
        clearInterval(iv);
        onProgress(100);
        const mockText = '【模擬轉譯】\n此為示範文字。實際部署可串接語音辨識 API（如 Google Speech-to-Text、Azure Speech）取得即時轉譯。\n\n會議討論內容將顯示於此。';
        onDone(mockText);
        return;
      }
      onProgress(p);
    }, 200);
  }

  async function processFileWithNodeAPI(file) {
    if (!UPLOAD_API || !currentUser?.id) return false;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', String(currentUser.id));
    formData.append('title', file.name.replace(/\.[^.]+$/, '') || '會議紀錄');
    try {
      const res = await fetch(`${UPLOAD_API}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.meeting) {
        const m = data.meeting;
        const s = m.summary || {};
        showProgress(false);
        showTranscript(m.transcript);
        elements.summaryPlaceholder()?.classList.add('hidden');
        const result = elements.summaryResult();
        if (result) {
          result.classList.remove('hidden');
          renderSummaryLists(s.topics || [], s.todos || [], s.decisions || s.keyDecisions || []);
        }
        loadHistory();
        return true;
      }
    } catch (e) {}
    return false;
  }

  function processFile(file) {
    if (!file || !file.type.startsWith('audio/')) {
      alert('請選擇音訊檔案（如 mp3、wav、m4a）');
      return;
    }
    showProgress(true);
    setProgress(0);

    const done = (transcript, summary) => {
      showProgress(false);
      showTranscript(transcript);
      elements.summaryPlaceholder()?.classList.add('hidden');
      const result = elements.summaryResult();
      if (result) {
        result.classList.remove('hidden');
        renderSummaryLists(summary.topics || [], summary.todos || [], summary.decisions || []);
      }
      addToHistory({
        title: file.name.replace(/\.[^.]+$/, '') || '會議紀錄',
        transcript,
        summary,
      });
    };

    if (UPLOAD_API && currentUser?.fromApi) {
      processFileWithNodeAPI(file).then((ok) => {
        if (!ok) {
          setProgress(0);
          simulateTranscription(file, (p) => setProgress(p), (transcript) => {
            const summary = generateSummaryFromTranscript(transcript);
            done(transcript, summary);
          });
        } else {
          setProgress(100);
        }
      });
      return;
    }

    simulateTranscription(
      file,
      (p) => setProgress(p),
      (transcript) => {
        const summary = generateSummaryFromTranscript(transcript);
        done(transcript, summary);
      }
    );
  }

  function escapeHtml(str) {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---------- 事件綁定 ----------
  function bindAuth() {
    elements.logoutBtn()?.addEventListener('click', handleAuthButtonClick);
  }

  function bindUpload() {
    const zone = elements.uploadZone();
    const input = elements.audioInput();

    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (file) processFile(file);
      input.value = '';
    });

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    });
  }

  function init() {
    loadUser();
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }
    bindAuth();
    bindUpload();
    showApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
