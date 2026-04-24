'use strict';
if (typeof Pages !== 'undefined') {
Pages.SearchResults = {
  _q: '', _last: '',

  async load() {
    const area = document.getElementById('page-search-results');
    if (!area) return;
    this._q = new URLSearchParams(window.location.hash.split('?')[1]).get('q') || '';
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">🔍 Search Results</h2>
          <p class="page-subtitle" id="search-subtitle">Searching...</p>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:20px">
        <input id="global-search-input" class="form-control" style="max-width:420px"
          placeholder="Search students, staff, classes..."
          value="${this._q}"
          oninput="clearTimeout(Pages.SearchResults._t);Pages.SearchResults._t=setTimeout(()=>Pages.SearchResults.search(this.value),350)">
        <div style="display:flex;gap:6px;flex-wrap:wrap" id="search-filters">
          ${['All','Students','Staff','Classes','Payments'].map((f,i) =>
            `<button class="btn btn-sm btn-${i===0?'primary':'secondary'}" onclick="Pages.SearchResults.filterTab(this,'${f.toLowerCase()}')">${f}</button>`
          ).join('')}
        </div>
      </div>
      <div id="search-results-area">
        <div style="text-align:center;padding:60px;color:var(--text-muted)">
          <div style="font-size:48px;margin-bottom:12px">🔍</div>
          <div>Type at least 2 characters to search</div>
        </div>
      </div>`;
    if (this._q.length >= 2) this.search(this._q);
  },

  _filter: 'all',
  filterTab(btn, filter) {
    document.querySelectorAll('#search-filters .btn').forEach(b => {
      b.className = b.className.replace('btn-primary','btn-secondary');
    });
    btn.className = btn.className.replace('btn-secondary','btn-primary');
    this._filter = filter;
    this.search(this._q);
  },

  async search(q) {
    this._q = q;
    const area   = document.getElementById('search-results-area');
    const sub    = document.getElementById('search-subtitle');
    if (!q || q.length < 2) {
      if (area) area.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">🔍</div><div>Type at least 2 characters to search</div></div>`;
      return;
    }
    if (!area) return;
    area.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    if (sub) sub.textContent = `Searching for "${q}"...`;

    const params = { q, limit: 10 };
    if (this._filter !== 'all') params.modules = this._filter;
    const data = await API.get('/search', params).catch(() => ({}));
    if (data.error) {
      area.innerHTML = `<div class="alert" style="background:var(--red-bg);padding:14px;border-radius:8px;color:var(--red)">${data.error}</div>`;
      return;
    }

    const allResults = [];
    Object.entries(data).forEach(([module, rows]) => {
      if (Array.isArray(rows)) rows.forEach(r => allResults.push({ ...r, _module: module }));
    });

    if (sub) sub.textContent = `${allResults.length} result${allResults.length!==1?'s':''} for "${q}"`;

    if (!allResults.length) {
      area.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)">
        <div style="font-size:48px;margin-bottom:12px">😕</div>
        <div style="font-weight:700;margin-bottom:6px">No results found</div>
        <div>Try different keywords or check spelling</div>
      </div>`;
      return;
    }

    const moduleIcon = { students:'🎓', staff:'👩‍🏫', classes:'📚', resources:'📄', alumni:'🎓', payments:'💰' };
    const moduleColor = { students:'var(--brand)', staff:'var(--green)', classes:'var(--purple)', payments:'var(--amber)' };

    area.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px">
      ${allResults.map(r => `
        <div style="background:white;border:1px solid var(--border);border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:box-shadow 0.15s"
             onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'"
             onmouseout="this.style.boxShadow=''"
             onclick="Pages.SearchResults.openResult('${r.type||r._module}','${r.id}')">
          <div style="width:44px;height:44px;border-radius:10px;background:${moduleColor[r.type||r._module]||'var(--brand)'}20;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
            ${moduleIcon[r.type||r._module]||'📋'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:14px">${r.label||r.name||'—'}</div>
            <div style="font-size:12px;color:var(--text-muted)">${r.context||r.ref||''} ${r.ref?'· '+r.ref:''}</div>
          </div>
          <span class="badge badge-blue" style="font-size:10px;text-transform:capitalize">${r.type||r._module}</span>
          <span style="color:var(--text-muted);font-size:18px">›</span>
        </div>`).join('')}
    </div>`;
  },

  openResult(type, id) {
    const nav = { students: 'students', staff: 'staff', classes: 'academics', payments: 'fees', alumni: 'alumni' };
    if (nav[type]) Router.go(nav[type]);
    else Toast.info(`Opening ${type}: ${id}`);
  }
};
}
