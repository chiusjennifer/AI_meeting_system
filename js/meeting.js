/**
 * 會議紀錄詳情頁 - Mock Data 與渲染
 * 深藍色系 #0F172A, #1E293B + Tailwind CSS
 */

const STORAGE_USER = 'ai_meeting_user';

function checkAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_USER);
    if (!raw) return false;
    const user = JSON.parse(raw);
    return user && (user.id || user.email);
  } catch (e) {}
  return false;
}

const mockMeetingData = {
  id: 'mtg-001',
  title: 'Q1 產品規劃會議',
  date: '2026-02-02',
  duration: '45:12',
  participants: ['Alex', 'Bella', 'Charlie'],

  // 1. 智能摘要
  summary:
    '本次會議主要討論 Q1 季度的 AI 功能開發優先級。團隊達成共識，將優先處理自動化會議記錄的穩定性，並延後語音翻譯功能的時程。',

  // 2. 關鍵決策
  keyDecisions: [
    '優先開發 React + Tailwind 的前端架構。',
    '確認使用 OpenAI Whisper 模型進行語音轉文字。',
    '下週一進行初步 Demo。',
  ],

  // 3. 待辦事項 (To-do List)
  actionItems: [
    { assignee: 'Alex', task: '設定 MySQL 資料庫架構', deadline: '2026-02-03' },
    { assignee: 'Bella', task: '在 Figma 完成高保真原型設計', deadline: '2026-02-02' },
    { assignee: 'Charlie', task: '串接 Whisper API 進行測試', deadline: '2026-02-04' },
  ],

  // 4. 逐字稿 (Transcript)
  transcript: [
    { speaker: 'Alex', time: '00:05', text: '大家好，今天我們要討論 AI 會議系統的開發進度。' },
    { speaker: 'Bella', time: '00:15', text: '我已經準備好了藍色風格的設計稿，使用了 #0F172A 作為底色。' },
    { speaker: 'Charlie', time: '00:30', text: '後端部分，我建議先用 Mock Data 跑通流程。' },
  ],
};

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderSummaryHeader(data) {
  const el = document.getElementById('summaryHeader');
  if (!el) return;

  el.innerHTML = `
    <div class="max-w-4xl">
      <h1 class="text-xl font-semibold text-white mb-2">${escapeHtml(data.title)}</h1>
      <div class="flex flex-wrap gap-4 text-sm text-slate-400 mb-3">
        <span>${escapeHtml(data.date)}</span>
        <span>${escapeHtml(data.duration)}</span>
        <span>與會：${escapeHtml(data.participants.join('、'))}</span>
      </div>
      <p class="text-slate-300 leading-relaxed">${escapeHtml(data.summary)}</p>
    </div>
  `;
}

function renderTranscript(data) {
  const el = document.getElementById('transcriptArea');
  if (!el) return;

  const items = (data.transcript || []).map(
    (item) => `
    <div class="flex gap-4 py-3 border-b border-slate-800/50 last:border-0">
      <div class="shrink-0 w-20 text-slate-500 text-sm">${escapeHtml(item.time || '')}</div>
      <div class="shrink-0 w-24 font-medium text-slate-300">${escapeHtml(item.speaker || '')}</div>
      <p class="flex-1 text-slate-200 leading-relaxed">${escapeHtml(item.text || '')}</p>
    </div>
  `
  );

  el.innerHTML = `
    <div class="max-w-3xl">
      <h2 class="text-lg font-semibold text-slate-300 mb-4 sticky top-0 bg-[#0F172A] py-2 z-10">逐字稿</h2>
      <div class="space-y-0">${items.join('')}</div>
    </div>
  `;
}

function renderSidePanel(data) {
  const el = document.getElementById('sidePanel');
  if (!el) return;

  const actionItems = (data.actionItems || []).map(
    (item) => `
    <li class="py-2 px-3 rounded-lg bg-[#1E293B]/80 border-l-2 border-cyan-500 mb-2">
      <div class="font-medium text-slate-200">${escapeHtml(item.task)}</div>
      <div class="text-xs text-slate-500 mt-1">${escapeHtml(item.assignee)} · ${escapeHtml(item.deadline)}</div>
    </li>
  `
  );

  const decisions = (data.keyDecisions || []).map(
    (item) => `<li class="py-2 text-slate-300 text-sm">• ${escapeHtml(item)}</li>`
  );

  el.innerHTML = `
    <div class="p-4 space-y-6">
      <section>
        <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">待辦事項</h3>
        <ul class="space-y-0">${actionItems.join('')}</ul>
      </section>
      <section>
        <h3 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">關鍵決策</h3>
        <ul class="space-y-1">${decisions.join('')}</ul>
      </section>
    </div>
  `;
}

function init() {
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  renderSummaryHeader(mockMeetingData);
  renderTranscript(mockMeetingData);
  renderSidePanel(mockMeetingData);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
