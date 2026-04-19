
// ── Global Pages Registry ─────────────────────────────────────
// Use var so it goes onto window and is accessible across all scripts
var Pages = {};

// ── Emergency stubs (overwritten below when app fully loads) ──
window.UI = window.UI || { 
  openModal:function(id){var el=document.getElementById(id);if(el)el.classList.add('open');},
  closeModal:function(id){var el=document.getElementById(id);if(el)el.classList.remove('open');},
  setLoading:function(btn,on){if(btn){btn.disabled=on;btn.textContent=on?'Loading...':btn._orig||(btn._orig=btn.textContent);}},
  currency:function(n){return 'KES '+parseFloat(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});},
  date:function(d){return d?new Date(d).toLocaleDateString('en-KE'):'—';},
  initials:function(n){return (n||'?').split(' ').map(function(w){return w[0]||'';}).join('').toUpperCase().slice(0,2);},
  loading:function(){return '<div style="text-align:center;padding:48px"><div class="loading-spinner" style="margin:0 auto 12px"></div></div>';},
  empty:function(m){return '<div class="empty-state"><div class="empty-title">'+(m||'No data')+'</div></div>';},
  error:function(m){return '<div class="alert alert-danger"><span>'+(m||'Error')+'</span></div>';},
  showInfoModal:function(t,h){alert(t+': '+h);},
  pagination:function(){},
  paymentBadge:function(m){return '<span class="badge">'+m+'</span>';}
};
window.Toast = window.Toast || {
  show:function(m,t){console.log(t+':',m);},
  success:function(m){console.log('success:',m);},
  error:function(m){console.error('error:',m);},
  info:function(m){console.log('info:',m);},
  warning:function(m){console.warn('warning:',m);},
  init:function(){}
};
window.Pages   = window.Pages   || {};
window.Router  = window.Router  || {go:function(p){console.log('Router.go:',p);},define:function(){}};
window.Auth    = window.Auth    || {login:async function(){return {error:'App not loaded'};},isLoggedIn:function(){return false;}};
window.API     = window.API     || {get:async function(){return {};},post:async function(){return {};},put:async function(){return {};},delete:async function(){return {};}};
window.AppState= window.AppState|| {user:null,token:null,school:null,save:function(){},load:function(){},clear:function(){}};
window.CONFIG  = window.CONFIG  || {API_URL:'https://elimu-saas.onrender.com/api'};


// ============================================================
// ElimuSaaS -- Core Application (Router, State, API, Auth)
// ============================================================

// ── Configuration ─────────────────────────────────────────────
var CONFIG = {
  API_URL: window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://elimu-saas.onrender.com/api',
  APP_NAME: 'ElimuSaaS',
  VERSION: '1.0.0',
};

// ── Application State ─────────────────────────────────────────
var AppState = {
  user: null,
  school: null,
  token: null,
  refreshToken: null,
  currentPage: null,
  theme: localStorage.getItem('theme') || 'light',
  sidebarCollapsed: localStorage.getItem('sidebar-collapsed') === 'true',
  notifications: [],
  _subscribers: {},

  set(key, value) {
    this[key] = value;
    if (this._subscribers[key]) {
      this._subscribers[key].forEach(fn => fn(value));
    }
  },

  on(key, fn) {
    if (!this._subscribers[key]) this._subscribers[key] = [];
    this._subscribers[key].push(fn);
  },

  save() {
    if (this.token) localStorage.setItem('access_token', this.token);
    if (this.refreshToken) localStorage.setItem('refresh_token', this.refreshToken);
    if (this.user) localStorage.setItem('user_data', JSON.stringify(this.user));
  },

  load() {
    this.token = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
    try {
      const u = localStorage.getItem('user_data');
      if (u) this.user = JSON.parse(u);
    } catch {}
  },

  clear() {
    this.user = null; this.token = null; this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
  },
};

// ── API Client ─────────────────────────────────────────────────
var API = {
  async request(method, path, data = null, options = {}) {
    const url = `${CONFIG.API_URL}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(AppState.token ? { Authorization: `Bearer ${AppState.token}` } : {}),
      ...options.headers,
    };

    let body = null;
    if (data && !(data instanceof FormData)) {
      body = JSON.stringify(data);
    } else if (data instanceof FormData) {
      delete headers['Content-Type'];
      body = data;
    }

    try {
      const res = await fetch(url, { method, headers, body });

      // Token expired -- try refresh
      if (res.status === 401 && AppState.refreshToken && !options._isRetry) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          return this.request(method, path, data, { ...options, _isRetry: true });
        } else {
          Auth.logout();
          return { error: 'Session expired. Please log in again.' };
        }
      }

      // Check for subscription warning header
      const subWarning = res.headers.get('X-Subscription-Warning');
      if (subWarning === 'grace-period') {
        const graceEnd = res.headers.get('X-Grace-End');
        AppState.set('subscriptionWarning', { type: 'grace', graceEnd });
      }

      const json = await res.json();

      if (!res.ok) {
        return { error: json.error || `HTTP ${res.status}`, status: res.status, code: json.code };
      }

      return json;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        return { error: 'Cannot connect to server. Check your connection.' };
      }
      return { error: err.message };
    }
  },

  async refreshToken() {
    try {
      const res = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: AppState.refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      AppState.token = data.accessToken;
      AppState.refreshToken = data.refreshToken;
      AppState.save();
      return true;
    } catch { return false; }
  },

  get: (path, params) => {
    const url = params ? `${path}?${new URLSearchParams(params)}` : path;
    return API.request('GET', url);
  },
  post: (path, data) => API.request('POST', path, data),
  put: (path, data) => API.request('PUT', path, data),
  patch: (path, data) => API.request('PATCH', path, data),
  delete: (path) => API.request('DELETE', path),
  upload: (path, formData) => API.request('POST', path, formData),
};

// ── Authentication ─────────────────────────────────────────────
var Auth = {
  async login(email, password, schoolCode) {
    const data = await API.post('/auth/login', { email, password, schoolCode });
    if (data.error) return data;

    AppState.token = data.accessToken;
    AppState.refreshToken = data.refreshToken;
    AppState.user = data.user;
    AppState.school = data.user.schoolId ? {
      id: data.user.schoolId,
      name: data.user.schoolName,
      code: data.user.schoolCode,
      logo: data.user.schoolLogo,
    } : null;
    AppState.save();
    return data;
  },

  logout() {
    API.post('/auth/logout').catch(() => {});
    AppState.clear();
    // Remove suspension overlay if present
    document.getElementById('suspension-overlay')?.remove();
    document.getElementById('sa-return-banner')?.remove();
    Router.go('landing');
    Toast.show('Logged out successfully', 'info');
  },

  isLoggedIn() {
    return !!AppState.token && !!AppState.user;
  },

  hasRole(...roles) {
    if (!AppState.user) return false;
    if (AppState.user.role === 'super_admin') return true;
    return roles.includes(AppState.user.role);
  },

  can(action) {
    const role = AppState.user?.role;
    const permissions = {
      'manage_students': ['school_admin', 'principal', 'deputy_principal', 'teacher'],
      'manage_fees': ['bursar', 'school_admin', 'principal'],
      'enter_marks': ['teacher', 'hod', 'deputy_principal', 'principal', 'school_admin'],
      'approve_marks': ['hod', 'deputy_principal', 'principal', 'school_admin'],
      'manage_staff': ['school_admin', 'principal'],
      'view_analytics': ['school_admin', 'principal', 'deputy_principal', 'bursar'],
      'send_messages': ['school_admin', 'principal', 'deputy_principal', 'teacher', 'bursar'],
    };
    return permissions[action]?.includes(role) || role === 'super_admin';
  },
};

// ── Client-side Router ─────────────────────────────────────────
var Router = {
  routes: {},
  current: null,

  define(name, config) {
    this.routes[name] = config;
  },

  go(name, params = {}) {
    if (name === 'login' && Auth.isLoggedIn()) {
      name = 'dashboard';
    }
    if (name !== 'login' && !Auth.isLoggedIn()) {
      this._showPage('login');
      return;
    }

    const route = this.routes[name];
    if (!route) { console.warn(`Unknown route: ${name}`); return; }

    if (route.requiredRoles && !Auth.hasRole(...route.requiredRoles)) {
      Toast.show('Access denied', 'error');
      return;
    }

    this.current = name;
    AppState.currentPage = name;
    this._showPage(name);

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === name);
    });

    // Update header title
    const titleEl = document.getElementById('header-title');
    if (titleEl && route.title) titleEl.textContent = route.title;

    // Load page data
    if (route.onEnter) route.onEnter(params);

    // Update URL hash
    window.location.hash = `#${name}`;
  },

  _showPage(name) {
    document.querySelectorAll('.page-view').forEach(el => {
      el.classList.remove('active');
    });
    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.add('active');

    // Hide/show app shell based on page
    const noShell = ['landing', 'login'].includes(name);
    const shell   = document.getElementById('app-shell');
    const sidebar  = document.querySelector('.sidebar');
    const header   = document.querySelector('.header');
    const mainWrap = document.querySelector('.main-wrapper, .content-wrapper, #main-content');
    if (shell)    shell.style.display    = noShell ? 'none' : '';
    if (sidebar)  sidebar.style.display  = noShell ? 'none' : '';
    if (header)   header.style.display   = noShell ? 'none' : '';
    if (mainWrap) mainWrap.style.display = noShell ? 'block' : '';
    // Update URL hash
    if (window.location.hash.slice(1) !== name) {
      history.replaceState(null, '', '#' + name);
    }
  },

  init() {
    // Handle hash navigation
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      if (hash && this.routes[hash]) this.go(hash);
    });

    // Handle nav clicks
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('[data-page]');
      if (navItem && navItem.dataset.page) {
        e.preventDefault();
        this.go(navItem.dataset.page);
      }
    });
  },
};

// ── Toast Notifications ────────────────────────────────────────
var Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', title = '', duration = 4000) {
    if (!this.container) this.init();

    const icons = {
      success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`,
      error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>`,
      warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${title}</div>` : ''}
        <div class="toast-msg">${message}</div>
      </div>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success: (msg, title) => Toast.show(msg, 'success', title),
  error: (msg, title) => Toast.show(msg, 'error', title),
  warning: (msg, title) => Toast.show(msg, 'warning', title),
  info: (msg, title) => Toast.show(msg, 'info', title),
};

// ── UI Helpers ─────────────────────────────────────────────────
var UI = {
  // Open/close modals
  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) { modal.classList.add('open'); modal.focus?.(); }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  },

  // Set loading state on button
  setLoading(btn, loading, originalText) {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = `<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;margin:0 auto"></div>`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || originalText || 'Submit';
    }
  },

  // Format currency
  currency(amount, symbol = 'KES') {
    return `${symbol} ${parseFloat(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
  },

  // Format date
  date(dateStr, options = {}) {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric', month: 'short', year: 'numeric', ...options
    });
  },

  // Grade badge
  gradeBadge(grade) {
    if (!grade) return '<span class="text-muted">--</span>';
    const colors = { 'A': 'green', 'A-': 'green', 'B+': 'blue', 'B': 'blue', 'B-': 'blue',
                     'C+': 'cyan', 'C': 'cyan', 'C-': 'amber', 'D+': 'amber', 'D': 'orange',
                     'D-': 'orange', 'E': 'red' };
    const color = colors[grade] || 'gray';
    return `<span class="badge badge-${color}">${grade}</span>`;
  },

  // Payment method badge
  paymentBadge(method) {
    const labels = { 'mpesa_stk': 'M-Pesa STK', 'mpesa_paybill': 'M-Pesa Paybill',
                     'cash': 'Cash', 'bank_transfer': 'Bank', 'stripe': 'Card' };
    const colors = { 'mpesa_stk': 'green', 'mpesa_paybill': 'green', 'cash': 'blue',
                     'bank_transfer': 'purple', 'stripe': 'cyan' };
    return `<span class="badge badge-${colors[method] || 'gray'}">${labels[method] || method}</span>`;
  },

  // Paginator
  pagination(container, data, onPageChange) {
    if (!container || !data?.pagination) return;
    const p = data.pagination;
    container.innerHTML = `
      <span>${p.total} records | Page ${p.page} of ${p.pages}</span>
      <div class="flex gap-2">
        <button class="btn btn-sm btn-secondary" ${!p.hasPrev ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${p.page - 1})">← Prev</button>
        <button class="btn btn-sm btn-secondary" ${!p.hasNext ? 'disabled' : ''} onclick="(${onPageChange.toString()})(${p.page + 1})">Next →</button>
      </div>
    `;
  },

  // Confirm dialog
  async confirm(message, title = 'Confirm Action') {
    return new Promise(resolve => {
      const overlay = document.getElementById('confirm-overlay');
      if (!overlay) { resolve(window.confirm(message)); return; }
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      overlay.classList.add('open');
      const yes = document.getElementById('confirm-yes');
      const no = document.getElementById('confirm-no');
      const handler = (result) => {
        overlay.classList.remove('open');
        yes.removeEventListener('click', yesHandler);
        no.removeEventListener('click', noHandler);
        resolve(result);
      };
      const yesHandler = () => handler(true);
      const noHandler = () => handler(false);
      yes.addEventListener('click', yesHandler);
      no.addEventListener('click', noHandler);
    });
  },

  // Avatar initials
  initials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  },
};


// ── Extra UI Helpers ───────────────────────────────────────────
UI.loading = () => `<div style="text-align:center;padding:48px 20px"><div class="loading-spinner" style="margin:0 auto 12px"></div><div style="color:var(--text-muted);font-size:13px">Loading...</div></div>`;
UI.empty = (msg='Nothing to show') => `<div style="text-align:center;padding:48px 20px;color:var(--text-muted)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="margin:0 auto 12px;display:block;opacity:0.4"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg><div style="font-size:14px">${msg}</div></div>`;
UI.error = (msg='An error occurred') => `<div class="alert alert-danger"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg><span>${msg}</span></div>`;

// ── Theme Manager ──────────────────────────────────────────────
var Theme = {
  init() {
    document.documentElement.setAttribute('data-theme', AppState.theme);
  },
  toggle() {
    AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', AppState.theme);
    document.documentElement.setAttribute('data-theme', AppState.theme);
    // Update toggle icon
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = AppState.theme === 'dark' ? Icons.sun : Icons.moon;
  },
};

// ── SVG Icons ──────────────────────────────────────────────────
const Icons = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  students: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
  staff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  academics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>`,
  exams: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>`,
  fees: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  attendance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>`,
  communication: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
  clubs: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 11v6M20 14h6"/></svg>`,
  reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  leaveout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  certificate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  analytics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  newsletter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  alumni: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  superadmin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
};

// ── Sidebar Builder ────────────────────────────────────────────
function buildSidebar() {
  const user = AppState.user;
  if (!user) return;

  const role = user.role;
  const isSuperAdmin = role === 'super_admin';

  // Role-based navigation sections
  const isAdmin = ['super_admin','school_admin','principal'].includes(role);
  const isBursar = role === 'bursar';
  const isTeacher = ['teacher','class_teacher','hod','dean_of_studies','deputy_principal'].includes(role);
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isLibrarian = role === 'librarian';
  const isSupport = ['storekeeper','nurse','driver','counselor','support_staff','security'].includes(role);
  const isHOD = role === 'hod';
  const isDean = role === 'dean_of_studies';
  const isDeputy = role === 'deputy_principal';

  const sections = isSuperAdmin ? [
    {
      label: 'Platform',
      items: [
        { page: 'superadmin-dashboard', icon: Icons.dashboard, label: 'Platform Dashboard' },
        { page: 'superadmin-schools', icon: Icons.superadmin, label: 'All Schools' },
        { page: 'superadmin-subscriptions', icon: Icons.fees, label: 'Subscriptions' },
        { page: 'superadmin-analytics', icon: Icons.analytics, label: 'Platform Analytics' },
      ]
    },
    { label: 'System', items: [{ page: 'settings', icon: Icons.settings, label: 'Settings' }] }
  ] : isStudent ? [
    { label: 'Overview', items: [{ page: 'dashboard', icon: Icons.dashboard, label: 'My Dashboard' }] },
    { label: 'Academics', items: [
        { page: 'exams', icon: Icons.exams, label: 'My Grades' },
        { page: 'attendance', icon: Icons.attendance, label: 'My Attendance' },
        { page: 'timetable', icon: '📅', label: 'Timetable' },
    ]},
    { label: 'Finance', items: [{ page: 'fees', icon: Icons.fees, label: 'My Fees' }] },
    { label: 'School Life', items: [
        { page: 'clubs', icon: Icons.clubs, label: 'Clubs' },
        { page: 'leaveout', icon: Icons.leaveout, label: 'Leave-Out' },
    ]},
    { label: 'System', items: [{ page: 'settings', icon: Icons.settings, label: 'Settings' }] },
  ] : isParent ? [
    { label: 'Overview', items: [{ page: 'dashboard', icon: Icons.dashboard, label: 'Dashboard' },
        { page: 'parent-portal', icon: '👨‍👩‍👧', label: 'My Children' }] },
    { label: 'Finance', items: [{ page: 'fees', icon: Icons.fees, label: 'Fee Payments' }] },
    { label: 'System', items: [{ page: 'settings', icon: Icons.settings, label: 'Settings' }] },
  ] : isLibrarian ? [
    { label: 'Overview', items: [{ page: 'dashboard', icon: Icons.dashboard, label: 'Dashboard' }] },
    { label: 'Library', items: [
        { page: 'storekeeper', icon: '📚', label: 'Library Management' },
        { page: 'students', icon: Icons.students, label: 'Students' },
    ]},
    { label: 'Reports', items: [{ page: 'reports', icon: Icons.reports, label: 'Reports' }] },
    { label: 'System', items: [{ page: 'settings', icon: Icons.settings, label: 'Settings' }] },
  ] : isSupport ? [
    { label: 'Overview', items: [{ page: 'dashboard', icon: Icons.dashboard, label: 'My Dashboard' }] },
    { label: role === 'storekeeper' ? 'Inventory' : role === 'nurse' ? 'Health Center' : role === 'counselor' ? 'Welfare' : 'My Work',
      items: [
        { page: 'storekeeper', icon: '📦', label: role === 'nurse' ? 'Medical Records' : role === 'counselor' ? 'Student Welfare' : role === 'driver' ? 'Transport Log' : 'Inventory' },
        { page: 'students', icon: Icons.students, label: 'Students List' },
      ]
    },
    { label: 'Communication', items: [
        { page: 'threads', icon: '💬', label: 'Messages' },
    ]},
    { label: 'System', items: [{ page: 'settings', icon: Icons.settings, label: 'Settings' }] },
  ] : isBursar ? [
    { label: 'Overview', items: [{ page: 'dashboard', icon: Icons.dashboard, label: 'Finance Dashboard' }] },
    { label: 'Finance', items: [
        { page: 'fees', icon: Icons.fees, label: 'Fee Management' },
        { page: 'billing', icon: '📄', label: 'Invoices & Billing' },
        { page: 'fee-clearance', icon: '✅', label: 'Fee Clearance' },
    ]},
    { label: 'People', items: [{ page: 'students', icon: Icons.students, label: 'Students' }] },
    { label: 'Reports', items: [{ page: 'reports', icon: Icons.reports, label: 'Finance Reports' }] },
    { label: 'System', items: [{ page: 'settings', icon: Icons.settings, label: 'Settings' }] },
  ] : isTeacher && !isAdmin ? [
    { label: 'Overview', items: [{ page: 'dashboard', icon: Icons.dashboard, label: 'My Dashboard' }] },
    { label: 'Academics', items: [
        { page: 'exams', icon: Icons.exams, label: 'Marks & Exams' },
        { page: 'attendance', icon: Icons.attendance, label: 'Attendance' },
        { page: 'timetable', icon: '📅', label: 'Timetable' },
        { page: 'syllabus', icon: '📖', label: 'Scheme of Work' },
    ]},
    { label: 'Students', items: [
        { page: 'students', icon: Icons.students, label: 'Students' },
        { page: 'discipline', icon: '⚖', label: 'Discipline' },
    ]},
    { label: 'Communication', items: [
        { page: 'threads', icon: '💬', label: 'Messages' },
        { page: 'communication', icon: Icons.communication, label: 'Broadcast SMS' },
    ]},
    { label: 'System', items: [{ page: 'settings', icon: Icons.settings, label: 'Settings' }] },
  ] : [
    {
      label: 'Overview',
      items: [
        { page: 'dashboard', icon: Icons.dashboard, label: 'Dashboard' },
      ]
    },
    {
      label: 'People',
      items: [
        { page: 'students', icon: Icons.students, label: 'Students' },
        { page: 'staff', icon: Icons.staff, label: 'Staff' },
      ]
    },
    {
      label: 'Academics',
      items: [
        { page: 'academics', icon: Icons.academics, label: 'Classes & Subjects' },
        { page: 'exams', icon: Icons.exams, label: 'Exams & Marks' },
        { page: 'attendance', icon: Icons.attendance, label: 'Attendance' },
        { page: 'timetable', icon: '📅', label: 'Timetable' },
        { page: 'online-exams', icon: '💻', label: 'Online Exams' },
      ]
    },
    {
      label: 'Finance',
      items: [
        { page: 'fees', icon: Icons.fees, label: 'Fee Management' },
        { page: 'billing', icon: '📄', label: 'Invoices & Billing' },
        { page: 'fee-clearance', icon: '✅', label: 'Fee Clearance' },
        { page: 'settings', icon: '💳', label: 'Subscription & Billing', badge: AppState.subscriptionWarning ? '!' : null },
      ]
    },
    {
      label: 'School Life',
      items: [
        { page: 'clubs', icon: Icons.clubs, label: 'Clubs & Societies' },
        { page: 'leaveout', icon: Icons.leaveout, label: 'Leave-Out Sheets' },
        { page: 'certificates', icon: Icons.certificate, label: 'Certificates' },
        { page: 'alumni', icon: Icons.alumni, label: 'Alumni' },
        { page: 'gamification', icon: '🏆', label: 'Leaderboard' },
      ]
    },
    {
      label: 'Communication',
      items: [
        { page: 'threads', icon: '💬', label: 'Messages' },
        { page: 'communication', icon: Icons.communication, label: 'Broadcast SMS' },
        { page: 'newsletters', icon: Icons.newsletter, label: 'Newsletters' },
      ]
    },
    {
      label: 'Intelligence',
      items: [
        { page: 'ai-insights', icon: '🧠', label: 'AI Insights' },
        { page: 'reports', icon: Icons.reports, label: 'Reports & Analytics' },
      ]
    },
    ...(role === 'parent' ? [{ label: 'My Family', items: [{ page: 'parent-portal', icon: '👨‍👩‍👧', label: 'My Children' }] }] : []),
    ...(['dean_of_studies','principal','school_admin','super_admin'].includes(role) ? [{ label: 'Admin', items: [{ page: 'tsc-verification', icon: '🔐', label: 'TSC Verification' }, { page: 'school-profile', icon: '🏫', label: 'School Profile' }] }] : []),
    {
      label: 'System',
      items: [
        { page: 'settings', icon: Icons.settings, label: 'Settings' },
      ]
    },
  ];

  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  nav.innerHTML = sections.map(section => `
    <div class="nav-section-label">${section.label}</div>
    ${section.items.map(item => `
      <a class="nav-item" data-page="${item.page}" href="#${item.page}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
        ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
      </a>
    `).join('')}
  `).join('');

  // Update school info
  if (AppState.school) {
    const nameEl = document.getElementById('sidebar-school-name');
    const codeEl = document.getElementById('sidebar-school-code');
    if (nameEl) nameEl.textContent = AppState.school.name || 'School';
    if (codeEl) codeEl.textContent = AppState.school.code || '';
  }

  // Update user info in header
  const userNameEl = document.getElementById('header-user-name');
  const userRoleEl = document.getElementById('header-user-role');
  const userAvatarEl = document.getElementById('header-user-avatar');
  if (userNameEl) userNameEl.textContent = (user.firstName||user.first_name||'') + ' ' + (user.lastName||user.last_name||'');
  if (userRoleEl) userRoleEl.textContent = user.role.replace(/_/g, ' ').toUpperCase();
  if (userAvatarEl) userAvatarEl.textContent = UI.initials((user.firstName||user.first_name||'U') + ' ' + (user.lastName||user.last_name||''));
}

// ── App Initialization ─────────────────────────────────────────
async function initApp() {
  // Apply theme
  Theme.init();
  Toast.init();

  // Load persisted state
  AppState.load();

  // Sidebar toggle
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
      localStorage.setItem('sidebar-collapsed', AppState.sidebarCollapsed);
      sidebar?.classList.toggle('collapsed', AppState.sidebarCollapsed);
    });
  }

  // Mobile sidebar
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('mobile-open');
    });
  }

  // Theme toggle
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.innerHTML = AppState.theme === 'dark' ? Icons.sun : Icons.moon;
    themeToggle.addEventListener('click', () => {
      Theme.toggle();
      themeToggle.innerHTML = AppState.theme === 'dark' ? Icons.sun : Icons.moon;
    });
  }

  // Modal close on overlay click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('open');
    }
    if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
      e.target.closest('.modal-overlay')?.classList.remove('open');
    }
  });

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    Auth.logout();
  });

  // Apply sidebar collapsed state
  if (AppState.sidebarCollapsed) {
    document.getElementById('sidebar')?.classList.add('collapsed');
  }

  // Initialize Router
  if (Router.init) Router.init();

  // Always register landing + login routes first
  Router.define('landing', { title: 'ElimuSaaS — School Management Platform', onEnter: () => {} });
  Router.define('login',   { title: 'Login — ElimuSaaS', onEnter: () => {} });

  // Check authentication and navigate
  if (Auth.isLoggedIn()) {
    buildSidebar();
    const hash = window.location.hash.slice(1);
    const startPage = hash && Router.routes[hash] && hash !== 'login' && hash !== 'landing' ? hash
      : AppState.user?.role === 'super_admin' ? 'superadmin-dashboard'
      : 'dashboard';
    Router.go(startPage);
    loadNotificationCount();
  } else {
    // Show landing page for unauthenticated users
    Router.go('landing');
  }
}

async function loadNotificationCount() {
  const data = await API.get('/notifications');
  if (!data.error) {
    const items = Array.isArray(data) ? data : (data.data || []);
    const unread = items.filter(n => !n.is_read).length;
    const badge = document.getElementById('notif-count');
    if (badge) badge.textContent = unread > 0 ? unread : '';
    const dot = document.querySelector('.notif-dot');
    if (dot) dot.style.display = unread > 0 ? 'block' : 'none';
  }
}

// Start the app
document.addEventListener('DOMContentLoaded', initApp);

// ── Global Search ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const q = e.target.value.trim();
        if (q.length < 2) return;
        const results = await API.get('/search?q=' + encodeURIComponent(q));
        if (results.totalResults > 0) {
          Router.go('search-results');
          const subtitle = document.getElementById('search-results-subtitle');
          if (subtitle) subtitle.textContent = results.totalResults + ' results for "' + q + '"';
          const container = document.getElementById('search-results-content');
          if (!container) return;
          let html = '';
          const icons = { students:'👤', staff:'👔', classes:'🏫', resources:'📚', alumni:'🎓', payments:'💳' };
          Object.entries(results.results).forEach(([mod, items]) => {
            if (!items.length) return;
            html += '<div style="margin-bottom:20px"><div style="font-weight:700;font-size:13px;margin-bottom:8px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px">' + icons[mod] + ' ' + mod + ' (' + items.length + ')</div>';
            html += '<div style="display:flex;flex-direction:column;gap:6px">';
            items.forEach(item => {
              html += '<div style="padding:10px 14px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border);display:flex;gap:12px;align-items:center;cursor:pointer" onclick="Router.go(\"' + mod + '\")">'; 
              if (item.image) html += '<img src="' + item.image + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover">';
              else html += '<div style="width:36px;height:36px;border-radius:50%;background:var(--brand);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px">' + (item.label||'?').charAt(0) + '</div>';
              html += '<div><div style="font-weight:600;font-size:13px">' + (item.label||'') + '</div><div style="font-size:11px;color:var(--text-muted)">' + (item.context||item.ref||'') + '</div></div></div>';
            });
            html += '</div></div>';
          });
          container.innerHTML = html;
        }
      }, 350);
    });
  }
});

// ── Expose all globals to window explicitly ──────────────────
window.Pages     = Pages;
window.AppState  = AppState;
window.CONFIG    = CONFIG;
window.API       = API;
window.Auth      = Auth;
window.Router    = Router;
window.Toast     = Toast;
window.UI        = UI;
// ── Print Utility ─────────────────────────────────────────────
window._beforePrint = function() {};
window._afterPrint  = function() {
  var pr = document.getElementById('print-root');
  if (pr) pr.innerHTML = '';
};
window.PrintUtil = {
  print: function(htmlContent, title) {
    var pr = document.getElementById('print-root');
    if (!pr) {
      // Fallback: open new window
      var w = window.open('', '_blank');
      if (w) { w.document.write('<!DOCTYPE html><html><head><title>'+(title||'Print')+'</title><style>body{font-family:Arial,sans-serif;margin:20px}@media print{button{display:none}}</style></head><body>' + htmlContent + '</body></html>'); w.document.close(); setTimeout(function(){w.print();}, 500); }
      return;
    }
    pr.innerHTML = htmlContent;
    setTimeout(function() { window.print(); }, 300);
  }
};

// ── School Suspension Handler ─────────────────────────────────
window.App = window.App || {};
App.showSuspendedPage = function(msg) {
  // Hide all pages, show suspension overlay
  let overlay = document.getElementById('suspension-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'suspension-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#F5F7FA;z-index:99998;display:flex;align-items:center;justify-content:center;padding:24px';
    overlay.innerHTML = `
      <div style="max-width:480px;text-align:center;padding:40px;background:white;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,0.12)">
        <div style="width:80px;height:80px;background:#FFEBEE;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:40px;margin:0 auto 24px">🔒</div>
        <h2 style="font-size:24px;font-weight:800;color:#C62828;margin:0 0 12px">School Account Suspended</h2>
        <p style="color:#555;line-height:1.6;margin:0 0 24px">${msg || 'Your school subscription has expired or been suspended. Please renew your subscription to restore access.'}</p>
        <div style="background:#FFF9C4;border-radius:12px;padding:16px;margin-bottom:24px;text-align:left">
          <div style="font-weight:700;margin-bottom:6px;color:#F57F17">📋 What you need to do:</div>
          <ol style="margin:0;padding-left:18px;font-size:13px;color:#555;line-height:1.8">
            <li>Contact ElimuSaaS support or your school administrator</li>
            <li>Renew your subscription plan</li>
            <li>Your data is safe and will be restored immediately after renewal</li>
          </ol>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <a href="mailto:billing@elimusaas.com?subject=Account Renewal - ${AppState.user?.school_name||'School'}" 
             style="background:#1565C0;color:white;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
            📧 Contact Billing
          </a>
          <button onclick="Auth.logout()" 
             style="background:#F5F5F5;color:#333;padding:12px 24px;border-radius:10px;border:none;cursor:pointer;font-weight:700;font-size:14px">
            🔓 Log Out
          </button>
        </div>
        <div style="margin-top:20px;font-size:12px;color:#999">
          Support: billing@elimusaas.com | Tel: +254 700 000 000
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
};

