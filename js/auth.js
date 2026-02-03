/**
 * AI 會議記錄系統 - 登入/註冊頁面邏輯
 */

(function () {
  'use strict';

  const API_BASE = 'api';
  const STORAGE_USER = 'ai_meeting_user';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => el.querySelectorAll(sel);

  function saveUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_USER);
    }
  }

  function showAuthMessage(msg, isError = true) {
    const el = $('#authMessage');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'auth-message' + (isError && msg ? '' : ' success');
  }

  function switchAuthTab(tabName) {
    $$('.auth-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabName));
    const loginForm = $('#loginForm');
    const registerForm = $('#registerForm');
    if (!loginForm || !registerForm) return;
    loginForm.classList.toggle('hidden', tabName !== 'login');
    registerForm.classList.toggle('hidden', tabName !== 'register');
    showAuthMessage('');
  }

  function redirectToApp() {
    window.location.href = 'index.html';
  }

  async function doLogin(email, password) {
    showAuthMessage('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.user) {
        data.user.fromApi = true;
        saveUser(data.user);
        redirectToApp();
        return;
      }
      showAuthMessage(data.message || '登入失敗，請檢查帳密');
    } catch (e) {
      showAuthMessage('連線失敗，請確認後端服務已啟動');
    }
  }

  async function doRegister(name, email, password) {
    showAuthMessage('');
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const text = await res.text();
      let data = {};
      try {
        data = JSON.parse(text);
      } catch (_) {
        showAuthMessage('無法解析回應：' + (text.slice(0, 80) || res.status));
        return;
      }
      if (data.success && data.user) {
        data.user.fromApi = true;
        saveUser(data.user);
        redirectToApp();
        return;
      }
      showAuthMessage(data.message || '註冊失敗');
    } catch (e) {
      showAuthMessage('連線失敗，請確認後端服務已啟動');
    }
  }

  function bindAuth() {
    $$('.auth-tab').forEach((t) => {
      t.addEventListener('click', () => switchAuthTab(t.dataset.tab));
    });

    $('#loginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      doLogin(fd.get('email'), fd.get('password'));
    });

    $('#registerForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      doRegister(fd.get('name'), fd.get('email'), fd.get('password'));
    });
  }

  function init() {
    const raw = localStorage.getItem(STORAGE_USER);
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && (user.id || user.email)) {
          redirectToApp();
          return;
        }
      } catch (e) {}
    }
    bindAuth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
