// Use global Pages
var Pages = window.Pages = window.Pages || {};
// ============================================================
// ElimuSaaS -- Advanced Pages (Complete)
// Discipline Letters · Fee Clearance · Report Cards · 
// Storekeeper · CBC · Broadsheet · Templates · Syllabus
// ============================================================

// ── Safe helpers ──────────────────────────────────────────────
try { if(typeof UI!=="undefined"){ if(!UI.loading) UI.loading=_loading; if(!UI.empty) UI.empty=_empty; if(!UI.error) UI.error=_err; } } catch(e) {}

var $id = id => document.getElementById(id);
var _b  = (t,c) => `<span class="badge badge-${c||'gray'}">${t}</span>`;
var _gc = g => (['A','A-'].includes(g)?'green':['B+','B','B-'].includes(g)?'blue':['C+','C'].includes(g)?'cyan':['C-','D+','D','D-'].includes(g)?'amber':'red');
var _kv = (k,v,c='') => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-subtle);font-size:13px"><span style="color:var(--text-secondary)">${k}</span><span style="font-weight:600${c?`;color:${c}`:''}">${v}</span></div>`;

function _tbl2(heads, rows, empty='No data') {
  if (!rows.length) return UI.empty(empty);
  return `<div class="table-container"><div style="overflow-x:auto"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

// Attach to UI if not done
if (typeof UI !== "undefined" && !UI.showInfoModal) {
  UI.showInfoModal = function(title, html) {
    let el = $id('_dynamic-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = '_dynamic-modal';
      el.className = 'modal-overlay';
      el.innerHTML = `<div class="modal modal-lg"><div class="modal-header"><h3 class="modal-title" id="_dm-title"></h3><button class="modal-close" onclick="UI.closeModal('_dynamic-modal')">✕</button></div><div class="modal-body" id="_dm-body" style="max-height:72vh;overflow-y:auto"></div><div class="modal-footer"><button class="btn btn-ghost" onclick="UI.closeModal('_dynamic-modal')">Close</button></div></div>`;
      document.body.appendChild(el);
    }
    $id('_dm-title').textContent = title;
    $id('_dm-body').innerHTML = html;
    UI.openModal('_dynamic-modal');
  };
}

// ── Update buildSidebar to include all new sections ───────────
window.buildSidebar = function() {
  if (!AppState.user) return;
  const role = AppState.user.role;
  const isSA = role === 'super_admin';
  const isAdmin = ['super_admin','school_admin','principal','deputy_principal'].includes(role);
  const isFinance = ['bursar','accounts_clerk'].includes(role);
  const isStore = role === 'storekeeper';
  const isTeacher = ['teacher','hod','class_teacher','games_teacher','patron','dean_of_studies','lab_technician','counselor','admission_teacher'].includes(role);
  const isSecretary = ['secretary','school_admin'].includes(role);
  const isDean = ['dean_of_studies','principal','school_admin','super_admin'].includes(role);
  const isParent = role === 'parent';
  const isStudent = role === 'student';

  const sec = (label, items) => ({ label, items });
  const nav = (page, icon, label, badge) => ({ page, icon, label, badge });

  let sections = [];

  if (isSA) {
    sections = [
      sec('Platform', [nav('superadmin-dashboard','🏛️','Platform Dashboard'), nav('superadmin-schools','🏫','All Schools'), nav('superadmin-subscriptions','💳','Subscriptions'), nav('superadmin-analytics','📊','Platform Analytics')]),
      sec('System', [nav('settings','⚙️','Settings')]),
    ];
  } else if (isParent) {
    sections = [
      sec('Overview', [nav('dashboard','📊','Dashboard')]),
      sec('My Family', [nav('parent-portal','👨‍👩‍👧','My Children')]),
      sec('Communication', [nav('threads','💬','Messages')]),
    ];
  } else if (isStudent) {
    sections = [
      sec('Overview', [nav('dashboard','📊','Dashboard')]),
      sec('Academics', [nav('online-exams','💻','My Exams')]),
      sec('Communication', [nav('threads','💬','Messages')]),
    ];
  } else if (isStore) {
    sections = [
      sec('Overview', [nav('dashboard','📊','Dashboard')]),
      sec('Inventory', [nav('storekeeper','📦','Inventory / Stock'), nav('storekeeper','📋','Purchase Orders')]),
      sec('System', [nav('settings','⚙️','Settings')]),
    ];
  } else if (isFinance) {
    sections = [
      sec('Overview', [nav('dashboard','📊','Dashboard')]),
      sec('Finance', [nav('fees','💰','Fee Management'), nav('billing','📄','Invoices & Billing'), nav('fee-clearance','🧾','Fee Clearance Sheets')]),
      sec('Students', [nav('students','👥','Students')]),
      sec('Reports', [nav('reports','📊','Financial Reports')]),
      sec('Communication', [nav('threads','💬','Messages')]),
      sec('System', [nav('settings','⚙️','Settings')]),
    ];
  } else {
    // Full staff sidebar
    sections = [
      sec('Overview', [nav('dashboard','📊','Dashboard')]),
      sec('People', [
        nav('students','👥','Students'),
        ...( isAdmin ? [nav('staff','👔','Staff')] : []),
        ...(isDean ? [nav('tsc-verification','🔐','TSC Verification')] : []),
      ]),
      sec('Academics', [
        nav('academics','📚','Classes & Subjects'),
        nav('exams','📝','Exams & Marks'),
        nav('attendance','✅','Attendance'),
        nav('timetable','📅','Timetable'),
        nav('syllabus','📖','Scheme of Work'),
        nav('report-cards','🗂️','Report Cards'),
        nav('broadsheet','📈','Broadsheets'),
        nav('online-exams','💻','Online Exams'),
      ]),
      sec('CBC (Primary)', [nav('cbc','🌱','CBC Assessment')]),
      sec('Finance', [
        nav('fees','💰','Fee Management'),
        nav('billing','📄','Invoices'),
        nav('fee-clearance','🧾','Fee Clearance'),
      ]),
      ...(isAdmin || isStore ? [sec('Inventory', [nav('storekeeper','📦','Storekeeper')])] : []),
      sec('School Life', [
        nav('clubs','🎭','Clubs & Societies'),
        nav('certificates','🏆','Certificates'),
        nav('leaveout','🚶','Leave-Out Sheets'),
        nav('discipline','⚠️','Discipline'),
        nav('alumni','🎓','Alumni'),
        nav('gamification','🏅','Leaderboard'),
      ]),
      sec('Communication', [
        nav('threads','💬','Messages'),
        nav('communication','📢','Broadcast SMS'),
        nav('newsletters','📰','Newsletters'),
        ...(isAdmin || isSecretary ? [nav('templates','📝','Document Templates')] : []),
      ]),
      sec('Intelligence', [
        nav('ai-insights','🧠','AI Insights'),
        nav('reports','📊','Reports & Analytics'),
      ]),
      ...(isDean || isAdmin ? [sec('Admin Tools', [
        nav('school-profile','🏫','School Profile'),
        nav('settings','⚙️','Settings'),
      ])] : [sec('System', [nav('settings','⚙️','Settings')])]),
    ];
  }

  const navEl = $id('sidebar-nav');
  if (!navEl) return;
  navEl.innerHTML = sections.map(s => `
    <div class="nav-section-label">${s.label}</div>
    ${s.items.map(i => `<a class="nav-item" data-page="${i.page}" href="#${i.page}">
      <span class="nav-icon">${i.icon}</span>
      <span class="nav-label">${i.label}</span>
      ${i.badge ? `<span class="nav-badge">${i.badge}</span>` : ''}
    </a>`).join('')}
  `).join('');

  if (AppState.school) {
    const sn = $id('sidebar-school-name'); if(sn) sn.textContent = AppState.school.name || 'School';
    const sc = $id('sidebar-school-code'); if(sc) sc.textContent = AppState.school.code || '';
  }
  const u = AppState.user;
  const hn = $id('header-user-name'); if(hn) hn.textContent = `${u.firstName} ${u.lastName}`;
  const hr = $id('header-user-role'); if(hr) hr.textContent = (u.role||'').replace(/_/g,' ').toUpperCase();
  const ha = $id('header-user-avatar'); if(ha) ha.textContent = (u.firstName||'?')[0].toUpperCase();
};

// Register routes for new pages
const _newRoutes = {
  'storekeeper':'Inventory Management','cbc':'CBC Assessment','templates':'Document Templates',
  'broadsheet':'Broadsheets & Analytics','syllabus':'Scheme of Work','discipline':'Discipline',
  'fee-clearance':'Fee Clearance Sheets','report-cards':'Report Cards',
};
Object.entries(_newRoutes).forEach(([name, title]) => {
  Router.define?.(name, { title, onEnter: () => {
    const key = name.split('-').map((w,i)=>i?w[0].toUpperCase()+w.slice(1):w).join('');
    const PageKey = key[0].toUpperCase()+key.slice(1);
    if (Pages[PageKey]?.load) Pages[PageKey].load();
  }});
});

// ============================================================
// STOREKEEPER PAGE
// ============================================================
Pages.Storekeeper = {
  _tab:'items', _items:[],

  async load() { this.switchTab('items', document.querySelector('#page-storekeeper .tab')); },

  switchTab(tab, el) {
    document.querySelectorAll('#page-storekeeper .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    this._tab = tab;
    const c = $id('storekeeper-tab-content');
    if(!c) return;
    if(tab==='items')        this._renderItems(c);
    else if(tab==='transactions') this._renderTxns(c);
    else if(tab==='alerts')  this._renderAlerts(c);
    else if(tab==='orders')  this._renderPOs(c);
    else if(tab==='report')  this._renderReport(c);
  },

  async _renderItems(container) {
    container.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:200px;position:relative">
          <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);width:13px;height:13px;color:var(--text-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search items…" oninput="Pages.Storekeeper._search(this.value)" style="width:100%;padding:7px 12px 7px 30px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none">
        </div>
        <select id="store-cat-filter" onchange="Pages.Storekeeper._fetchItems()" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:12px">
          <option value="">All Categories</option>
        </select>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;white-space:nowrap">
          <input type="checkbox" id="store-low-only" onchange="Pages.Storekeeper._fetchItems()"> Low stock only
        </label>
      </div>
      <div id="store-grid">${UI.loading()}</div>`;
    await this._loadCats();
    await this._fetchItems();
  },

  async _loadCats() {
    const d = await API.get('/storekeeper/categories');
    const s = $id('store-cat-filter');
    const s2 = $id('item-category');
    const opts = (d && !d.error) ? d.map(c=>`<option value="${c.id}">${c.name}</option>`).join('') : '';
    if(s) s.innerHTML = '<option value="">All Categories</option>' + opts;
    if(s2) s2.innerHTML = '<option value="">No category</option>' + opts;
  },

  async _fetchItems() {
    const g = $id('store-grid');
    if(!g) return;
    const cat = $id('store-cat-filter')?.value||'';
    const low = $id('store-low-only')?.checked||false;
    let url = '/storekeeper/items?limit=200';
    if(cat) url += `&categoryId=${cat}`;
    if(low) url += '&lowStock=true';
    const data = await API.get(url);
    if(data.error) { g.innerHTML = UI.error(data.error); return; }
    this._items = data.data||[];
    this._renderGrid(g, this._items);
  },

  _renderGrid(g, items) {
    if(!items.length) {
      g.innerHTML = UI.empty('No items in inventory','Add your first stock item.',`<button class="btn btn-primary" onclick="Pages.Storekeeper.openAddItem()">Add Item</button>`);
      return;
    }
    const sc = {ok:'var(--green)',low:'var(--amber)',critical:'var(--red)'};
    g.innerHTML = `<div class="grid-auto">${items.map(i=>`
      <div class="card" style="border-left:3px solid ${sc[i.stock_status]||'var(--border)'}">
        <div class="card-header">
          <div><div class="card-title">${i.name}</div><div class="card-subtitle">${i.code||''} ${i.category_name?'· '+i.category_name:''}</div></div>
          ${_b(i.stock_status,{ok:'green',low:'amber',critical:'red'}[i.stock_status]||'gray')}
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px;background:var(--bg-elevated);border-radius:8px;margin:10px 0">
          <div style="text-align:center">
            <div style="font-size:26px;font-weight:800;color:${sc[i.stock_status]}">${i.current_stock}</div>
            <div style="font-size:10px;color:var(--text-muted)">${i.unit}</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:600">KES ${parseFloat(i.unit_cost||0).toLocaleString()}</div>
            <div style="font-size:10px;color:var(--text-muted)">Unit Cost</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:13px;font-weight:600">KES ${(parseFloat(i.current_stock)*parseFloat(i.unit_cost||0)).toLocaleString()}</div>
            <div style="font-size:10px;color:var(--text-muted)">Stock Value</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Reorder ≤ ${i.reorder_level} · Min ${i.minimum_stock}${i.location?` · 📍${i.location}`:''}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="Pages.Storekeeper._openTxn('${i.id}','${i.name.replace(/'/g,"\\'")}',${i.current_stock},'${i.unit}','issue')">Issue</button>
          <button class="btn btn-sm btn-success" onclick="Pages.Storekeeper._openTxn('${i.id}','${i.name.replace(/'/g,"\\'")}',${i.current_stock},'${i.unit}','receive')">Receive</button>
          <button class="btn btn-sm btn-ghost" onclick="Pages.Storekeeper.viewHistory('${i.id}','${i.name.replace(/'/g,"\\'")}')">History</button>
        </div>
      </div>`).join('')}</div>`;
  },

  _search(q) {
    const g = $id('store-grid');
    if(!g) return;
    const filtered = q.length < 2 ? this._items : this._items.filter(i =>
      i.name.toLowerCase().includes(q.toLowerCase()) || (i.code||'').toLowerCase().includes(q.toLowerCase()));
    this._renderGrid(g, filtered);
  },

  async _renderTxns(container) {
    container.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
        <select id="txn-f-type" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:12px">
          <option value="">All Types</option><option value="issue">Issue</option><option value="receive">Receive</option><option value="return">Return</option><option value="adjust">Adjust</option><option value="write_off">Write Off</option>
        </select>
        <input type="date" id="txn-f-from" value="${new Date(Date.now()-7*864e5).toISOString().split('T')[0]}" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
        <input type="date" id="txn-f-to" value="${new Date().toISOString().split('T')[0]}" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
        <button class="btn btn-primary btn-sm" onclick="Pages.Storekeeper._loadTxns()">Filter</button>
      </div>
      <div id="txn-list">${UI.loading()}</div>`;
    this._loadTxns();
  },

  async _loadTxns() {
    const c = $id('txn-list');
    if(!c) return;
    const type=$id('txn-f-type')?.value, from=$id('txn-f-from')?.value, to=$id('txn-f-to')?.value;
    let url = '/storekeeper/transactions?limit=100';
    if(type) url += `&type=${type}`; if(from) url += `&from=${from}`; if(to) url += `&to=${to}`;
    const data = await API.get(url);
    if(data.error) { c.innerHTML = UI.error(data.error); return; }
    const tc = {issue:'red',receive:'green',return:'blue',adjust:'amber',write_off:'gray'};
    c.innerHTML = _tbl2(['Date','Item','Type','Qty','Issued To/From','Balance','Value','By'],
      (data.data||[]).map(t=>`<tr>
        <td>${new Date(t.transaction_date).toLocaleDateString('en-KE')}</td>
        <td><strong>${t.item_name}</strong></td>
        <td>${_b(t.transaction_type,tc[t.transaction_type]||'gray')}</td>
        <td style="font-weight:700;color:${['issue','write_off'].includes(t.transaction_type)?'var(--red)':'var(--green)'}">${['issue','write_off'].includes(t.transaction_type)?'-':'+'}${t.quantity}</td>
        <td style="font-size:11px">${t.issued_to||t.received_from||'--'}</td>
        <td style="font-weight:600">${t.balance_after} ${t.unit}</td>
        <td>KES ${parseFloat(t.total_value||0).toLocaleString()}</td>
        <td style="font-size:11px">${t.issued_by_name||'--'}</td>
      </tr>`).join(''), 'No transactions for selected period');
  },

  async _renderAlerts(container) {
    container.innerHTML = UI.loading();
    const data = await API.get('/storekeeper/items/alerts');
    if(data.error) { container.innerHTML = UI.error(data.error); return; }
    if(!data.length) { container.innerHTML = UI.empty('All stock levels are healthy ✅'); return; }
    container.innerHTML = `<div class="alert alert-warning" style="margin-bottom:16px">⚠️ ${data.length} item(s) need restocking</div>
      ${_tbl2(['Item','Category','Current Stock','Reorder At','Minimum','Alert Level','Action'],
        data.map(i=>`<tr>
          <td><strong>${i.name}</strong>${i.location?`<div style="font-size:10px;color:var(--text-muted)">📍${i.location}</div>`:''}</td>
          <td>${i.category_name||'--'}</td>
          <td style="font-weight:700;color:${i.alert_level==='critical'?'var(--red)':'var(--amber)'}">${i.current_stock} ${i.unit}</td>
          <td>${i.reorder_level}</td><td>${i.minimum_stock}</td>
          <td>${_b(i.alert_level,{critical:'red',low:'amber'}[i.alert_level]||'gray')}</td>
          <td><button class="btn btn-sm btn-success" onclick="Pages.Storekeeper._openTxn('${i.id}','${i.name.replace(/'/g,"\\'")}',${i.current_stock},'${i.unit}','receive')">Restock</button></td>
        </tr>`).join(''))}`;
  },

  async _renderPOs(container) {
    container.innerHTML = UI.loading();
    const data = await API.get('/storekeeper/purchase-orders');
    if(data.error) { container.innerHTML = UI.error(data.error); return; }
    const stC = {pending:'amber',approved:'blue',ordered:'cyan',received:'green',cancelled:'red'};
    container.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Storekeeper.openPO()">New Purchase Order</button>
    </div>
    ${_tbl2(['PO#','Supplier','Items','Total','Status','Expected','Actions'],
      data.map(p=>`<tr>
        <td class="font-mono text-sm">${p.po_number}</td>
        <td><strong>${p.supplier}</strong></td>
        <td>${(p.items||[]).length}</td>
        <td style="font-weight:600">KES ${parseFloat(p.total_amount||0).toLocaleString()}</td>
        <td>${_b(p.status,stC[p.status]||'gray')}</td>
        <td style="font-size:12px">${p.expected_date?new Date(p.expected_date).toLocaleDateString('en-KE'):'--'}</td>
        <td><div style="display:flex;gap:4px">
          ${p.status==='pending'?`<button class="btn btn-sm btn-success" onclick="Pages.Storekeeper._approvePO('${p.id}')">Approve</button>`:''}
          ${p.status==='approved'?`<button class="btn btn-sm btn-primary" onclick="Pages.Storekeeper._receivePO('${p.id}')">Receive</button>`:''}
        </div></td>
      </tr>`).join(''), 'No purchase orders')}`;
  },

  async _renderReport(container) {
    container.innerHTML = UI.loading();
    const data = await API.get('/storekeeper/items/report');
    if(data.error) { container.innerHTML = UI.error(data.error); return; }
    const s = data.summary||{};
    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Total Items',s.totalItems||0,'var(--accent)'],['Stock Value','KES '+(parseFloat(s.totalValue||0)).toLocaleString(),'var(--green)'],['Low Stock Items',s.lowStockItems||0,'var(--amber)'],['Critical Items',s.criticalItems||0,'var(--red)']].map(([l,v,c])=>`<div class="stat-card" style="--stat-color:${c};--stat-bg:${c}1a"><div class="stat-body"><div class="stat-value" style="font-size:18px">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
      </div>
      ${_tbl2(['Item','Category','Stock','Unit','Unit Cost','Stock Value','Issued/Month','Status'],
        (data.items||[]).map(i=>`<tr>
          <td><strong>${i.name}</strong><div style="font-size:10px;color:var(--text-muted)">${i.code||''}</div></td>
          <td>${i.category_name||'--'}</td>
          <td style="font-weight:700;color:${i.stock_status==='critical'?'var(--red)':i.stock_status==='low'?'var(--amber)':'var(--green)'}">${i.current_stock}</td>
          <td>${i.unit}</td>
          <td>KES ${parseFloat(i.unit_cost||0).toLocaleString()}</td>
          <td style="font-weight:600">KES ${parseFloat(i.stock_value||0).toLocaleString()}</td>
          <td>${i.total_issued_month||0}</td>
          <td>${_b(i.stock_status,{ok:'green',low:'amber',critical:'red'}[i.stock_status]||'gray')}</td>
        </tr>`).join(''), 'No report data')}`;
  },

  openAddItem() {
    this._editId = null;
    $id('item-modal-title').textContent = 'Add Stock Item';
    ['item-name','item-code','item-description','item-location','item-supplier'].forEach(id=>{const e=$id(id);if(e)e.value='';});
    $id('item-cost').value = '0'; $id('item-initial-stock').value = '0';
    $id('item-reorder').value = '10'; $id('item-minimum').value = '5';
    this._loadCats();
    UI.openModal('modal-add-item');
  },

  async saveItem() {
    const payload = {
      name: $id('item-name')?.value?.trim(),
      code: $id('item-code')?.value?.trim()||undefined,
      categoryId: $id('item-category')?.value||null,
      description: $id('item-description')?.value||undefined,
      unit: $id('item-unit')?.value||'pieces',
      unitCost: parseFloat($id('item-cost')?.value||0),
      initialStock: parseInt($id('item-initial-stock')?.value||0),
      reorderLevel: parseInt($id('item-reorder')?.value||10),
      minimumStock: parseInt($id('item-minimum')?.value||5),
      location: $id('item-location')?.value||undefined,
      supplier: $id('item-supplier')?.value||undefined,
    };
    if(!payload.name) { Toast.error('Item name required'); return; }
    const btn = $id('save-item-btn'); UI.setLoading(btn,true);
    const res = await API.post('/storekeeper/items', payload);
    UI.setLoading(btn,false);
    if(res.error) { Toast.error(res.error); return; }
    Toast.success('Item added!'); UI.closeModal('modal-add-item');
    this._renderItems($id('storekeeper-tab-content'));
  },

  _openTxn(id, name, stock, unit, type='issue') {
    $id('txn-item-id').value = id;
    $id('txn-item-info').innerHTML = `<strong>${name}</strong> -- Current: <strong style="color:var(--accent)">${stock} ${unit}</strong>`;
    $id('txn-type').value = type;
    $id('txn-modal-title').textContent = (type==='issue'?'Issue':'Receive')+': '+name;
    $id('txn-date').value = new Date().toISOString().split('T')[0];
    $id('txn-qty').value = ''; $id('txn-purpose').value = '';
    $id('txn-issue-fields').style.display = type==='issue'?'block':'none';
    $id('txn-receive-fields').style.display = type==='receive'?'block':'none';
    UI.openModal('modal-stock-txn');
  },

  toggleTxnFields() {
    const t = $id('txn-type')?.value;
    $id('txn-issue-fields').style.display = ['issue','write_off'].includes(t)?'block':'none';
    $id('txn-receive-fields').style.display = ['receive','return'].includes(t)?'block':'none';
  },

  async saveTransaction() {
    const payload = {
      itemId: $id('txn-item-id')?.value,
      type: $id('txn-type')?.value,
      quantity: parseInt($id('txn-qty')?.value||0),
      unitCost: parseFloat($id('txn-cost')?.value||0)||undefined,
      issuedTo: $id('txn-issued-to')?.value||undefined,
      receivedFrom: $id('txn-received-from')?.value||undefined,
      purpose: $id('txn-purpose')?.value||undefined,
      referenceNumber: $id('txn-ref')?.value||undefined,
      transactionDate: $id('txn-date')?.value,
    };
    if(!payload.quantity||payload.quantity<1) { Toast.error('Quantity must be ≥ 1'); return; }
    const btn=$id('save-txn-btn'); UI.setLoading(btn,true);
    const res = await API.post('/storekeeper/transactions', payload);
    UI.setLoading(btn,false);
    if(res.error) { Toast.error(res.error); return; }
    Toast.success(`✅ Transaction saved! New stock: ${res.newStock} ${payload.unit||''}`);
    UI.closeModal('modal-stock-txn');
    this._fetchItems();
  },

  async viewHistory(id, name) {
    const data = await API.get(`/storekeeper/items/${id}`);
    if(data.error) { Toast.error(data.error); return; }
    const tc = {issue:'red',receive:'green',return:'blue',adjust:'amber',write_off:'gray'};
    UI.showInfoModal(`${name} -- Transaction History`, `
      <div style="display:flex;gap:16px;margin-bottom:12px">
        <div style="background:var(--bg-elevated);padding:12px;border-radius:8px;text-align:center;flex:1">
          <div style="font-size:28px;font-weight:800;color:var(--accent)">${data.current_stock}</div>
          <div style="font-size:11px;color:var(--text-muted)">${data.unit} in stock</div>
        </div>
        <div style="background:var(--bg-elevated);padding:12px;border-radius:8px;text-align:center;flex:1">
          <div style="font-size:18px;font-weight:700">KES ${(data.current_stock*parseFloat(data.unit_cost||0)).toLocaleString()}</div>
          <div style="font-size:11px;color:var(--text-muted)">Stock Value</div>
        </div>
      </div>
      ${_tbl2(['Date','Type','Qty','Balance','By'],
        (data.recentTransactions||[]).map(t=>`<tr>
          <td>${new Date(t.transaction_date).toLocaleDateString('en-KE')}</td>
          <td>${_b(t.transaction_type,tc[t.transaction_type]||'gray')}</td>
          <td style="color:${['issue'].includes(t.transaction_type)?'var(--red)':'var(--green)'}">${['issue'].includes(t.transaction_type)?'-':'+'}${t.quantity}</td>
          <td style="font-weight:600">${t.balance_after}</td>
          <td style="font-size:11px">${t.issued_by_name||'--'}</td>
        </tr>`).join(''), 'No history')}
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-sm btn-primary" onclick="Pages.Storekeeper._openTxn('${id}','${name}',${data.current_stock},'${data.unit}','issue');UI.closeModal('_dynamic-modal')">Issue</button>
        <button class="btn btn-sm btn-success" onclick="Pages.Storekeeper._openTxn('${id}','${name}',${data.current_stock},'${data.unit}','receive');UI.closeModal('_dynamic-modal')">Receive</button>
      </div>`);
  },

  openPO() {
    ['po-supplier','po-contact','po-notes'].forEach(id=>{const e=$id(id);if(e)e.value='';});
    $id('po-expected-date').value = new Date(Date.now()+7*864e5).toISOString().split('T')[0];
    const list = $id('po-items-list');
    if(list) {
      const opts = '<option value="">Select item…</option>'+this._items.map(i=>`<option value="${i.id}">${i.name} (${i.current_stock} ${i.unit})</option>`).join('');
      list.querySelectorAll('.po-item-sel').forEach(s=>s.innerHTML=opts);
    }
    UI.openModal('modal-po');
  },

  addPORow() {
    const list = $id('po-items-list');
    const opts = '<option value="">Select item…</option>'+this._items.map(i=>`<option value="${i.id}">${i.name}</option>`).join('');
    const d = document.createElement('div');
    d.className = 'po-item-row';
    d.style.cssText='display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;align-items:center';
    d.innerHTML = `<select class="po-item-sel" style="padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:12px">${opts}</select>
      <input type="number" class="po-item-qty" placeholder="Qty" min="1" style="padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:12px;text-align:center">
      <input type="number" class="po-item-cost" placeholder="Cost" min="0" style="padding:6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:12px">
      <span class="po-item-total" style="font-size:12px;font-weight:600">KES 0</span>
      <button onclick="this.closest('.po-item-row').remove()" style="width:28px;height:28px;background:var(--red-bg);color:var(--red);border:none;border-radius:6px;cursor:pointer">✕</button>`;
    list.appendChild(d);
  },

  async savePO() {
    const supplier = $id('po-supplier')?.value?.trim();
    if(!supplier) { Toast.error('Supplier required'); return; }
    const rows = document.querySelectorAll('.po-item-row');
    const items = [];
    rows.forEach(r=>{
      const itemId=r.querySelector('.po-item-sel')?.value, qty=parseInt(r.querySelector('.po-item-qty')?.value||0), cost=parseFloat(r.querySelector('.po-item-cost')?.value||0);
      const item = this._items.find(i=>i.id===itemId);
      if(itemId&&qty>0) items.push({item_id:itemId,item_name:item?.name||'',qty,unitCost:cost});
    });
    if(!items.length) { Toast.error('Add at least one item'); return; }
    const res = await API.post('/storekeeper/purchase-orders',{supplier,supplierContact:$id('po-contact')?.value,items,notes:$id('po-notes')?.value,expectedDate:$id('po-expected-date')?.value});
    if(res.error) { Toast.error(res.error); return; }
    Toast.success(`PO ${res.po_number} created!`);
    UI.closeModal('modal-po');
    this._renderPOs($id('storekeeper-tab-content'));
  },

  async _approvePO(id) {
    if(!await UI.confirm('Approve this purchase order?')) return;
    const res = await API.put(`/storekeeper/purchase-orders/${id}/approve`,{});
    if(res.error) { Toast.error(res.error); return; }
    Toast.success('PO approved!'); this._renderPOs($id('storekeeper-tab-content'));
  },

  async _receivePO(id) {
    if(!await UI.confirm('Mark as received? This will update all stock levels.')) return;
    const res = await API.post(`/storekeeper/purchase-orders/${id}/receive`,{});
    if(res.error) { Toast.error(res.error); return; }
    Toast.success('Stock updated from purchase order!');
    this._renderPOs($id('storekeeper-tab-content'));
  },
};

// ============================================================
// CBC PAGE
// ============================================================
Pages.CBC = {
  async load() { this.switchTab('assessments', document.querySelector('#page-cbc .tab')); },

  switchTab(tab, el) {
    document.querySelectorAll('#page-cbc .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = $id('cbc-tab-content');
    if(!c) return;
    if(tab==='assessments') this._renderAssessments(c);
    else if(tab==='areas')  this._renderAreas(c);
    else if(tab==='levels') this._renderLevels(c);
    else if(tab==='reportcards') this._renderRCGen(c);
    else if(tab==='coverage') Pages.Syllabus?.renderCoverage?.(c);
  },

  async _renderAssessments(c) {
    c.innerHTML = UI.loading();
    const data = await API.get('/cbc/assessments');
    if(data.error) { c.innerHTML = UI.error(data.error); return; }
    if(!data.length) { c.innerHTML = `${UI.empty('No CBC assessments','Create assessments for each learning area.',`<button class="btn btn-primary" onclick="Pages.CBC.openCreate()">Create Assessment</button>`)}<div style="text-align:center;margin-top:8px"><button class="btn btn-secondary" onclick="Pages.CBC._seedAreas()">🌱 Seed Learning Areas First</button></div>`; return; }
    c.innerHTML = `<div class="grid-auto">${data.map(a=>`
      <div class="card">
        <div class="card-header"><div><div class="card-title">${a.name}</div><div class="card-subtitle">${a.learning_area_name||''} · ${a.class_name||''}</div></div>${_b(a.assessment_type,{summative:'blue',formative:'green'}[a.assessment_type]||'gray')}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${(a.term||'').replace('_',' ')} · Max: ${a.max_score} · ${a.scores_entered||0} scores</div>
        <div style="display:flex;gap:6px"><button class="btn btn-sm btn-primary" onclick="Pages.CBC.openScores('${a.id}','${a.name.replace(/'/g,"\\'")}')">Enter Scores</button><button class="btn btn-sm btn-secondary" onclick="Pages.CBC.openScores('${a.id}','${a.name.replace(/'/g,"\\'")}')">Results</button></div>
      </div>`).join('')}</div>`;
  },

  async _renderAreas(c) {
    c.innerHTML = UI.loading();
    const data = await API.get('/cbc/learning-areas');
    if(!data.length) { c.innerHTML = `${UI.empty('No learning areas')}<div style="text-align:center">${[1,4,7].map(g=>`<button class="btn btn-secondary btn-sm" style="margin:4px" onclick="Pages.CBC._seedAreas(${g})">Grade ${g}-${g+2}</button>`).join('')}</div>`; return; }
    c.innerHTML = `<div class="grid-auto">${data.map(a=>`<div class="card"><div class="card-header"><div class="card-title">${a.name}</div>${_b(a.code,'cyan')}</div><div style="font-size:12px;color:var(--text-muted)">Grade ${a.grade_level} · ${a.category||'general'}</div>${a.strands?.length?`<div style="font-size:11px;margin-top:6px">${a.strands.length} strands</div>`:''}</div>`).join('')}</div>`;
  },

  async _renderLevels(c) {
    c.innerHTML = UI.loading();
    const data = await API.get('/cbc/performance-levels');
    const lc = {EE:'green',ME:'blue',AE:'amber',BE:'red'};
    c.innerHTML = `<div class="grid-4">${data.map(l=>`<div class="card" style="text-align:center;border-top:4px solid var(--${lc[l.level_code]||'accent'})"><div style="font-size:32px;font-weight:800;color:var(--${lc[l.level_code]||'accent'})">${l.level_code}</div><div style="font-weight:700;font-size:14px;margin:6px 0">${l.level_name}</div><div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${l.description||''}</div><div style="display:flex;gap:4px;justify-content:center">${_b(l.min_score+'-'+l.max_score+'%',lc[l.level_code]||'gray')} ${_b(l.points+' pts','blue')}</div></div>`).join('')}</div>`;
  },

  async _renderRCGen(c) {
    const classes = await API.get('/academics/classes');
    c.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
        <div><label>Grade/Class</label><select id="cbc-rc-class" style="min-width:180px"><option value="">Select…</option>${(classes||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('')}</select></div>
        <div><label>Term</label><select id="cbc-rc-term"><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></div>
        <button class="btn btn-primary" onclick="Pages.CBC._genClassRCs()">Generate Report Cards</button>
      </div>
      <div id="cbc-rc-out">${UI.empty('Select class and term to generate report cards')}</div>`;
  },

  async _genClassRCs() {
    const classId = $id('cbc-rc-class')?.value, term = $id('cbc-rc-term')?.value;
    if(!classId) { Toast.warning('Select a class'); return; }
    const c = $id('cbc-rc-out'); c.innerHTML = UI.loading();
    const students = await API.get(`/students?classId=${classId}&limit=200`);
    const list = students.data||[];
    if(!list.length) { c.innerHTML = UI.empty('No students'); return; }
    c.innerHTML = `<div class="grid-auto">${list.map(s=>`<div class="card" style="cursor:pointer" onclick="Pages.CBC.viewRC('${s.id}','${s.first_name} ${s.last_name}','${term}')"><div style="display:flex;align-items:center;gap:10px"><div class="avatar">${s.first_name[0]}</div><div><div style="font-weight:600">${s.first_name} ${s.last_name}</div><div style="font-size:11px;color:var(--text-muted)">${s.admission_number}</div></div></div><button class="btn btn-sm btn-primary w-full" style="margin-top:10px">View Report Card</button></div>`).join('')}</div>`;
  },

  async viewRC(studentId, name, term) {
    const data = await API.get(`/cbc/report-card/${studentId}/${term}/current`);
    if(data.error) { Toast.error(data.error); return; }
    const {student:s={}, learningAreas:areas=[], attendance:att={}, school:sch={}} = data;
    const lc = {EE:'#16a34a',ME:'#2563eb',AE:'#d97706',BE:'#dc2626'};
    const rcHtml = `<div style="font-family:Georgia,serif;max-width:800px;margin:auto;padding:20px;background:#fff;color:#000">
      <div style="text-align:center;border-bottom:3px double #333;padding-bottom:14px;margin-bottom:14px">
        <div style="font-size:22px;font-weight:700">${sch.name||'School Name'}</div>
        <div style="font-size:12px">${sch.address||''} | ${sch.phone||''}</div>
        <div style="font-size:18px;font-weight:700;margin-top:8px;text-transform:uppercase">Learner Progress Report -- ${term.replace('_',' ')} ${new Date().getFullYear()}</div>
      </div>
      <table style="width:100%;font-size:12px;margin-bottom:14px"><tr>
        <td><b>Name:</b> ${s.first_name} ${s.last_name}</td><td><b>Adm No:</b> ${s.admission_number}</td>
        <td><b>Grade:</b> ${s.class_name}</td><td><b>Gender:</b> ${s.gender||'--'}</td>
      </tr><tr>
        <td><b>Days Present:</b> ${att.present||0}</td><td><b>Days Absent:</b> ${att.absent||0}</td>
        <td><b>Total Days:</b> ${att.total||0}</td><td></td>
      </tr></table>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px">
        <thead><tr style="background:#e8e8e8"><th style="border:1px solid #999;padding:7px;text-align:left">Learning Area</th><th style="border:1px solid #999;padding:7px;text-align:center;width:70px">Score</th><th style="border:1px solid #999;padding:7px;text-align:center;width:50px">Level</th><th style="border:1px solid #999;padding:7px;text-align:left">Teacher Remarks</th></tr></thead>
        <tbody>${areas.map(a=>{const avg=parseFloat(a.avg_score||0).toFixed(1);const lvl=a.dominant_level||'--';const rem=(a.assessments||[]).find(x=>x.remarks)?.remarks||'';return `<tr><td style="border:1px solid #ccc;padding:6px">${a.name}</td><td style="border:1px solid #ccc;padding:6px;text-align:center;font-weight:700">${a.avg_score?avg+'%':'--'}</td><td style="border:1px solid #ccc;padding:6px;text-align:center;font-weight:700;color:${lc[lvl]||'#333'}">${lvl}</td><td style="border:1px solid #ccc;padding:6px;font-style:italic">${rem||'--'}</td></tr>`;}).join('')}</tbody>
      </table>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:14px;font-size:12px">
        <div style="border:1px solid #ccc;padding:12px"><b>Class Teacher:</b><div style="margin:20px 0 8px;border-bottom:1px solid #999"></div>Signature _________________ Date _______</div>
        <div style="border:1px solid #ccc;padding:12px"><b>Principal:</b><div style="margin:20px 0 8px;border-bottom:1px solid #999"></div>Signature _________________ Date _______</div>
      </div>
      <div style="text-align:center;margin-top:14px;font-size:11px;border-top:1px solid #ccc;padding-top:8px"><b>Key:</b> EE = Exceeding Expectations | ME = Meeting Expectations | AE = Approaching Expectations | BE = Below Expectations</div>
    </div>`;
    UI.showInfoModal(`${name} -- CBC Report Card`,rcHtml+`<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px"><button class="btn btn-primary" onclick="window.print()">🖨️ Print</button></div>`);
  },

  openCreate() { UI.openModal('modal-cbc-assessment'); this._fillCreateModal(); },

  async _fillCreateModal() {
    const [classes,areas] = await Promise.all([API.get('/academics/classes'),API.get('/cbc/learning-areas')]);
    const cs=$id('cbc-assess-class'), as=$id('cbc-assess-area');
    if(cs) cs.innerHTML='<option value="">Select class…</option>'+(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    if(as) as.innerHTML='<option value="">Select area…</option>'+(areas||[]).map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
    $id('cbc-assess-date').value = new Date().toISOString().split('T')[0];
  },

  async saveAssessment() {
    const payload = {classId:$id('cbc-assess-class')?.value,learningAreaId:$id('cbc-assess-area')?.value,name:$id('cbc-assess-name')?.value?.trim(),assessmentType:$id('cbc-assess-type')?.value||'summative',maxScore:parseFloat($id('cbc-assess-max')?.value||100),assessmentDate:$id('cbc-assess-date')?.value,term:$id('cbc-assess-term')?.value||'term_1'};
    if(!payload.classId||!payload.learningAreaId||!payload.name){Toast.error('Class, area and name required');return;}
    const res = await API.post('/cbc/assessments',payload);
    if(res.error){Toast.error(res.error);return;}
    Toast.success('Assessment created!'); UI.closeModal('modal-cbc-assessment');
    this._renderAssessments($id('cbc-tab-content'));
  },

  async openScores(assessmentId, name) {
    const data = await API.get(`/cbc/assessments/${assessmentId}/scores`);
    if(data.error){Toast.error(data.error);return;}
    const {assessment:a={},students,levels} = data;
    const lopts = levels.map(l=>`<option value="${l.level_code}">${l.level_code} -- ${l.level_name}</option>`).join('');
    UI.showInfoModal(`Score Entry: ${name}`,`
      <div style="overflow-x:auto"><table><thead><tr><th>#</th><th>Student</th><th>Score (/${a.max_score})</th><th>Level</th><th>Absent</th><th>Remarks</th></tr></thead><tbody>
      ${students.map((s,i)=>`<tr><td>${i+1}</td><td><strong>${s.first_name} ${s.last_name}</strong></td><td><input type="number" id="cs-${s.id}" value="${s.score||''}" min="0" max="${a.max_score}" style="width:70px;padding:4px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)" ${s.is_absent?'disabled':''}></td><td><select id="cl-${s.id}" style="font-size:11px;padding:4px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"><option value="">Auto</option>${lopts}</select></td><td><input type="checkbox" id="ca-${s.id}" ${s.is_absent?'checked':''} onchange="$id('cs-${s.id}').disabled=this.checked"></td><td><input type="text" id="cr-${s.id}" value="${s.teacher_remarks||''}" placeholder="Remarks…" style="width:130px;padding:4px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:11px"></td></tr>`).join('')}
      </tbody></table></div>
      <div style="display:flex;justify-content:flex-end;margin-top:12px"><button class="btn btn-primary" onclick="Pages.CBC._submitScores('${assessmentId}',${JSON.stringify(students.map(s=>s.id))})">Save All Scores</button></div>`);
  },

  async _submitScores(assessmentId, ids) {
    const scores = ids.map(id=>({studentId:id,score:parseFloat($id(`cs-${id}`)?.value)||null,performanceLevel:$id(`cl-${id}`)?.value||null,teacherRemarks:$id(`cr-${id}`)?.value,isAbsent:$id(`ca-${id}`)?.checked||false}));
    const res = await API.post(`/cbc/assessments/${assessmentId}/scores`,{scores});
    if(res.error){Toast.error(res.error);return;}
    Toast.success(`${res.saved} scores saved!`);UI.closeModal('_dynamic-modal');
    this._renderAssessments($id('cbc-tab-content'));
  },

  async _seedAreas(grade=1) {
    const res = await API.post('/cbc/learning-areas/seed',{gradeLevel:grade});
    if(res.error){Toast.error(res.error);return;}
    Toast.success(res.message||'Learning areas seeded!');
    this._renderAreas($id('cbc-tab-content'));
  },
};

// ============================================================
// BROADSHEET PAGE
// ============================================================
Pages.Broadsheet = {
  async load() { this.switchTab('class',document.querySelector('#page-broadsheet .tab')); },

  switchTab(tab,el) {
    document.querySelectorAll('#page-broadsheet .tab').forEach(t=>t.classList.remove('active'));
    if(el)el.classList.add('active');
    const c=$id('broadsheet-tab-content');if(!c)return;
    if(tab==='class') this._renderClass(c);
    else if(tab==='stream') this._renderStream(c);
    else if(tab==='master') this._renderMaster(c);
    else if(tab==='subject') this._renderSubject(c);
    else if(tab==='trends') this._renderTrends(c);
  },

  async _getSelectors() {
    const [classes,series] = await Promise.all([API.get('/academics/classes'),API.get('/exams/series')]);
    return {classes:classes||[],series:series.data||series||[]};
  },

  async _renderClass(c) {
    const {classes,series} = await this._getSelectors();
    c.innerHTML = `<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div><label>Exam Series</label><select id="bs-ser" style="min-width:200px"><option value="">Select…</option>${series.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <div><label>Class</label><select id="bs-cls" style="min-width:160px"><option value="">Select…</option>${classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      <button class="btn btn-primary" onclick="Pages.Broadsheet._loadClass()">Load</button>
      <button class="btn btn-secondary" onclick="window.print()">Print PDF</button>
    </div><div id="bs-out">${UI.empty('Select series and class')}</div>`;
  },

  async _loadClass() {
    const sId=$id('bs-ser')?.value, cId=$id('bs-cls')?.value;
    if(!sId||!cId){Toast.warning('Select series and class');return;}
    const c=$id('bs-out'); c.innerHTML=UI.loading();
    const data=await API.get(`/curriculum/broadsheet?examSeriesId=${sId}&classId=${cId}`);
    if(data.error){c.innerHTML=UI.error(data.error);return;}
    this._drawTable(c,data);
  },

  _drawTable(container, data) {
    const {students=[],subjects=[],stats={}} = data;
    if(!students.length){container.innerHTML=UI.empty('No marks found');return;}
    const gradeCount={};
    students.forEach(s=>{if(s.mean_grade)gradeCount[s.mean_grade]=(gradeCount[s.mean_grade]||0)+1;});
    container.innerHTML = `
      <div style="overflow-x:auto">
        <table style="font-size:11px;border-collapse:collapse;min-width:800px">
          <thead><tr style="background:var(--bg-elevated)">
            <th style="padding:8px;border:1px solid var(--border);min-width:35px">Pos</th>
            <th style="padding:8px;border:1px solid var(--border);text-align:left;min-width:150px">Student</th>
            ${subjects.map(s=>`<th style="padding:8px;border:1px solid var(--border);text-align:center" title="${s.name}">${s.code||s.name.slice(0,4)}</th>`).join('')}
            <th style="padding:8px;border:1px solid var(--border);background:rgba(43,127,255,0.1)">Total</th>
            <th style="padding:8px;border:1px solid var(--border);background:rgba(43,127,255,0.1)">Mean%</th>
            <th style="padding:8px;border:1px solid var(--border);background:rgba(43,127,255,0.1)">Grade</th>
            <th style="padding:8px;border:1px solid var(--border);background:rgba(43,127,255,0.1)">Pts</th>
          </tr></thead>
          <tbody>
            ${students.map((s,i)=>`<tr style="${i%2?'background:rgba(255,255,255,0.015)':''}">
              <td style="padding:6px 8px;border:1px solid var(--border-subtle);text-align:center;font-weight:700;color:var(--accent)">${s.position||i+1}</td>
              <td style="padding:6px 8px;border:1px solid var(--border-subtle)"><div style="font-weight:600">${s.first_name} ${s.last_name}</div><div style="font-size:9px;color:var(--text-muted)">${s.admission_number}</div></td>
              ${subjects.map(sub=>{const m=(s.marks||[]).find(x=>x.subject_id===sub.id);if(!m)return `<td style="padding:6px 8px;border:1px solid var(--border-subtle);text-align:center;color:var(--text-muted)">--</td>`;return `<td style="padding:6px 8px;border:1px solid var(--border-subtle);text-align:center">${m.is_absent?`<span style="color:var(--amber)">ABS</span>`:`<strong>${m.marks}</strong>${m.grade?`<div style="font-size:9px;color:var(--${_gc(m.grade)})">${m.grade}</div>`:''}`}</td>`;}).join('')}
              <td style="padding:6px 8px;border:1px solid var(--border-subtle);text-align:center;font-weight:700;background:rgba(43,127,255,0.04)">${s.total_marks||'--'}</td>
              <td style="padding:6px 8px;border:1px solid var(--border-subtle);text-align:center;font-weight:700;color:var(--accent);background:rgba(43,127,255,0.04)">${parseFloat(s.mean_marks||0).toFixed(1)}</td>
              <td style="padding:6px 8px;border:1px solid var(--border-subtle);text-align:center;background:rgba(43,127,255,0.04)">${_b(s.mean_grade||'--',_gc(s.mean_grade||''))}</td>
              <td style="padding:6px 8px;border:1px solid var(--border-subtle);text-align:center;font-weight:700;background:rgba(43,127,255,0.04)">${parseFloat(s.mean_points||0).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody>
          <tfoot><tr style="background:var(--bg-elevated);font-weight:700">
            <td colspan="2" style="padding:8px;border:1px solid var(--border)">CLASS SUMMARY</td>
            ${subjects.map(sub=>{const ms=students.flatMap(s=>(s.marks||[]).filter(m=>m.subject_id===sub.id&&!m.is_absent&&m.marks!=null).map(m=>parseFloat(m.marks)));const avg=ms.length?(ms.reduce((a,b)=>a+b,0)/ms.length).toFixed(1):'--';return `<td style="padding:6px 8px;border:1px solid var(--border);text-align:center;color:var(--accent)">${avg}</td>`;}).join('')}
            <td colspan="4" style="padding:8px;border:1px solid var(--border);font-size:11px">Mean: <strong>${parseFloat(stats.meanMarks||0).toFixed(2)}%</strong> | Pass Rate: <strong>${parseFloat(stats.passRate||0).toFixed(1)}%</strong> | Students: <strong>${students.length}</strong></td>
          </tr></tfoot>
        </table>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;padding:12px;background:var(--bg-elevated);border-radius:10px">
        ${[['Students',students.length,'--'],['Mean',parseFloat(stats.meanMarks||0).toFixed(2)+'%','var(--accent)'],['Pass Rate',parseFloat(stats.passRate||0).toFixed(1)+'%','var(--green)'],['Highest',parseFloat(stats.highest||0).toFixed(1)+'%','var(--purple)'],['Lowest',parseFloat(stats.lowest||0).toFixed(1)+'%','var(--red)']].map(([l,v,clr])=>`<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:8px 16px;text-align:center"><div style="font-size:18px;font-weight:800;color:${clr}">${v}</div><div style="font-size:10px;color:var(--text-muted)">${l}</div></div>`).join('')}
      </div>
      <div style="margin-top:10px"><div style="font-weight:600;font-size:12px;margin-bottom:6px">Grade Distribution</div><div style="display:flex;gap:4px;flex-wrap:wrap">${Object.entries(gradeCount).filter(([,n])=>n>0).map(([g,n])=>`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:6px;padding:5px 10px;text-align:center"><div style="font-weight:700;color:var(--${_gc(g)})">${g}</div><div style="font-size:10px;color:var(--text-muted)">${n}</div></div>`).join('')}</div></div>`;
  },

  async _renderStream(c) {
    const {classes,series} = await this._getSelectors();
    c.innerHTML = `<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div><label>Exam Series</label><select id="str-ser" style="min-width:200px"><option value="">Select…</option>${series.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <button class="btn btn-primary" onclick="Pages.Broadsheet._loadStream()">Compare All Streams</button>
    </div><div id="str-out">${UI.empty('Select series to compare all class streams')}</div>`;
  },

  async _loadStream() {
    const sId=$id('str-ser')?.value; if(!sId){Toast.warning('Select series');return;}
    const c=$id('str-out'); c.innerHTML=UI.loading();
    const classes=await API.get('/academics/classes');
    const allStats=[];
    for(const cl of (classes||[])){
      const d=await API.get(`/curriculum/broadsheet?examSeriesId=${sId}&classId=${cl.id}`).catch(()=>null);
      if(d&&!d.error&&d.stats) allStats.push({...d.stats,name:cl.name,id:cl.id,count:d.students?.length||0});
    }
    if(!allStats.length){c.innerHTML=UI.empty('No data');return;}
    allStats.sort((a,b)=>parseFloat(b.meanMarks||0)-parseFloat(a.meanMarks||0));
    c.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">Stream Performance Ranking</div></div>
        ${_tbl2(['Rank','Class/Stream','Students','Class Mean','Grade','Pass Rate','Highest'],
          allStats.map((s,i)=>`<tr><td style="font-weight:700;color:var(--accent)">#${i+1}</td><td><strong>${s.name}</strong></td><td>${s.count}</td><td style="font-weight:700;color:var(--${parseFloat(s.meanMarks||0)>=50?'green':'red'})">${parseFloat(s.meanMarks||0).toFixed(2)}%</td><td>${_b(s.meanGrade||'--',_gc(s.meanGrade||''))}</td><td>${parseFloat(s.passRate||0).toFixed(1)}%</td><td>${parseFloat(s.highest||0).toFixed(1)}%</td></tr>`).join(''))}
      </div>
      ${allStats.length>1?`<div class="card"><div class="card-header"><div class="card-title">Comparison Chart</div></div><canvas id="str-chart" height="90"></canvas></div>`:''}`;
    if(window.Chart&&allStats.length>1) {
      new Chart($id('str-chart'),{type:'bar',data:{labels:allStats.map(s=>s.name),datasets:[{label:'Mean %',data:allStats.map(s=>parseFloat(s.meanMarks||0).toFixed(1)),backgroundColor:'rgba(43,127,255,0.65)',borderRadius:4},{label:'Pass Rate %',data:allStats.map(s=>parseFloat(s.passRate||0).toFixed(1)),backgroundColor:'rgba(14,203,129,0.5)',borderRadius:4}]},options:{responsive:true,scales:{y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'}},x:{grid:{display:false}}}}});
    }
  },

  async _renderMaster(c) {
    const {series} = await this._getSelectors();
    c.innerHTML = `<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div><label>Exam Series</label><select id="mst-ser" style="min-width:200px"><option value="">Select…</option>${series.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <button class="btn btn-primary" onclick="Pages.Broadsheet._loadMaster()">Generate Master Broadsheet</button>
      <button class="btn btn-secondary" onclick="window.print()">Print</button>
    </div><div id="mst-out">${UI.empty('Generate master broadsheet combining all streams')}</div>`;
  },

  async _loadMaster() {
    const sId=$id('mst-ser')?.value; if(!sId){Toast.warning('Select series');return;}
    const c=$id('mst-out'); c.innerHTML=UI.loading();
    const [classes,allSeries]=await Promise.all([API.get('/academics/classes'),API.get('/exams/series')]);
    const ser=(allSeries.data||allSeries||[]).find(s=>s.id===sId)||{};
    const all=[];
    for(const cl of (classes||[])){
      const d=await API.get(`/curriculum/broadsheet?examSeriesId=${sId}&classId=${cl.id}`).catch(()=>null);
      if(d&&!d.error&&d.students?.length) d.students.forEach(s=>all.push({...s,class_name:cl.name}));
    }
    if(!all.length){c.innerHTML=UI.empty('No data');return;}
    all.sort((a,b)=>parseFloat(b.mean_marks||0)-parseFloat(a.mean_marks||0));
    all.forEach((s,i)=>s.school_pos=i+1);
    const means=all.map(s=>parseFloat(s.mean_marks||0));
    const ov={n:all.length,mean:(means.reduce((a,b)=>a+b,0)/means.length).toFixed(2),high:Math.max(...means).toFixed(1),low:Math.min(...means).toFixed(1)};
    c.innerHTML = `<div style="text-align:center;margin-bottom:14px;padding:14px;background:var(--accent-subtle);border-radius:10px"><div style="font-size:20px;font-weight:800">MASTER BROADSHEET -- ${ser.name||'Exam'}</div><div style="font-size:12px;color:var(--text-secondary)">Combined performance across all streams</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">${[['Students',ov.n,'var(--accent)'],['School Mean',ov.mean+'%','var(--green)'],['Top Score',ov.high+'%','var(--purple)'],['Lowest',ov.low+'%','var(--red)']].map(([l,v,clr])=>`<div style="flex:1;min-width:120px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:${clr}">${v}</div><div style="font-size:11px;color:var(--text-muted)">${l}</div></div>`).join('')}</div>
      ${_tbl2(['School Pos','Student','Class','Mean Mark','Grade','Points','Class Pos'],
        all.map(s=>`<tr><td style="font-weight:700;color:var(--accent);text-align:center">#${s.school_pos}</td><td><strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${s.admission_number}</div></td><td>${s.class_name}</td><td style="font-weight:700;color:var(--${parseFloat(s.mean_marks||0)>=50?'green':'red'})">${parseFloat(s.mean_marks||0).toFixed(2)}%</td><td>${_b(s.mean_grade||'--',_gc(s.mean_grade||''))}</td><td>${parseFloat(s.mean_points||0).toFixed(2)}</td><td style="text-align:center">#${s.position||'--'}</td></tr>`).join(''))}`;
  },

  async _renderSubject(c) {
    const {classes,series} = await this._getSelectors();
    c.innerHTML = `<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div><label>Exam Series</label><select id="sbj-ser" style="min-width:200px"><option value="">Select…</option>${series.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <div><label>Class</label><select id="sbj-cls" style="min-width:160px"><option value="">Select…</option>${classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      <button class="btn btn-primary" onclick="Pages.Broadsheet._loadSubject()">Analyse</button>
    </div><div id="sbj-out">${UI.empty('Load data to see subject performance analysis')}</div>`;
  },

  async _loadSubject() {
    const sId=$id('sbj-ser')?.value, cId=$id('sbj-cls')?.value;
    if(!sId||!cId){Toast.warning('Select series and class');return;}
    const c=$id('sbj-out'); c.innerHTML=UI.loading();
    const data=await API.get(`/curriculum/broadsheet?examSeriesId=${sId}&classId=${cId}`);
    if(data.error){c.innerHTML=UI.error(data.error);return;}
    const {students=[],subjects=[]} = data;
    const analysis = subjects.map(sub=>{
      const marks=students.flatMap(s=>(s.marks||[]).filter(m=>m.subject_id===sub.id&&!m.is_absent&&m.marks!=null).map(m=>parseFloat(m.marks)));
      const avg=marks.length?(marks.reduce((a,b)=>a+b,0)/marks.length):0;
      const pass=marks.filter(m=>m>=50).length;
      return {...sub,avg:avg.toFixed(2),top:marks.length?Math.max(...marks).toFixed(1):'--',passRate:marks.length?(pass/marks.length*100).toFixed(1):0,attempted:marks.length};
    }).sort((a,b)=>parseFloat(b.avg)-parseFloat(a.avg));
    c.innerHTML = `${_tbl2(['Rank','Subject','Avg Mark','Top Mark','Pass Rate','Students','Performance'],
      analysis.map((s,i)=>`<tr><td style="font-weight:700;color:var(--accent)">#${i+1}</td><td><strong>${s.name}</strong></td><td style="font-weight:700;color:var(--${parseFloat(s.avg)>=50?'green':'red'})">${s.avg}%</td><td>${s.top}%</td><td>${s.passRate}%</td><td>${s.attempted}</td><td style="min-width:120px"><div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden"><div style="width:${s.avg}%;height:100%;background:${parseFloat(s.avg)>=70?'var(--green)':parseFloat(s.avg)>=50?'var(--amber)':'var(--red)'}"></div></div></td></tr>`).join(''))}
    <div class="card" style="margin-top:16px"><div class="card-header"><div class="card-title">Subject Averages Chart</div></div><canvas id="subj-chart" height="80"></canvas></div>`;
    if(window.Chart) new Chart($id('subj-chart'),{type:'bar',data:{labels:analysis.map(s=>s.code||s.name.slice(0,5)),datasets:[{label:'Avg %',data:analysis.map(s=>s.avg),backgroundColor:analysis.map(s=>parseFloat(s.avg)>=70?'rgba(14,203,129,0.7)':parseFloat(s.avg)>=50?'rgba(245,166,35,0.7)':'rgba(240,62,62,0.7)'),borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'}},x:{grid:{display:false}}}}});
  },

  async _renderTrends(c) {
    const classes=await API.get('/academics/classes');
    c.innerHTML = `<div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div><label>Class</label><select id="trd-cls" style="min-width:180px"><option value="">Select…</option>${(classes||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('')}</select></div>
      <button class="btn btn-primary" onclick="Pages.Broadsheet._loadTrends()">Load Trends</button>
    </div><div id="trd-out">${UI.empty('Select class to view performance trends')}</div>`;
  },

  async _loadTrends() {
    const cId=$id('trd-cls')?.value; if(!cId)return;
    const c=$id('trd-out'); c.innerHTML=UI.loading();
    const data=await API.get(`/ai/performance-trends/${cId}`);
    if(data.error){c.innerHTML=UI.error(data.error);return;}
    const trends=data.examTrends||[];
    if(!trends.length){c.innerHTML=UI.empty('No exam history for this class');return;}
    c.innerHTML = `<div class="card" style="margin-bottom:16px"><div class="card-header"><div class="card-title">Performance Over Time</div></div><canvas id="trd-chart" height="100"></canvas></div>
      ${_tbl2(['Exam','Avg Marks','Mean Grade','Pass Rate','Students'],
        trends.map(t=>`<tr><td><strong>${t.exam_name}</strong></td><td style="font-weight:700;color:var(--accent)">${parseFloat(t.avg_marks||0).toFixed(2)}%</td><td>${_b(t.mean_grade||'--',_gc(t.mean_grade||''))}</td><td>${t.students>0?((parseInt(t.passes||0)/parseInt(t.students))*100).toFixed(1)+'%':'--'}</td><td>${t.students||0}</td></tr>`).join(''))}`;
    if(window.Chart&&trends.length>1) new Chart($id('trd-chart'),{type:'line',data:{labels:trends.map(t=>(t.exam_name||'').substring(0,20)),datasets:[{label:'Class Average %',data:trends.map(t=>parseFloat(t.avg_marks||0).toFixed(1)),borderColor:'#2b7fff',backgroundColor:'rgba(43,127,255,0.1)',tension:0.4,fill:true,pointRadius:5,pointBackgroundColor:'#2b7fff'}]},options:{responsive:true,scales:{y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'}},x:{grid:{color:'rgba(255,255,255,0.03)'}}}}});
  },

  exportPDF() { window.print(); },
};

// ============================================================
// TEMPLATES PAGE
// ============================================================
Pages.Templates = {
  _tid: null,

  async load() { this.switchTab('all',document.querySelector('#page-templates .tab')); },

  switchTab(tab,el) {
    document.querySelectorAll('#page-templates .tab').forEach(t=>t.classList.remove('active'));
    if(el)el.classList.add('active');
    const c=$id('templates-tab-content'); if(!c)return;
    tab==='instances'?this._renderInstances(c):this._renderList(c,tab==='all'?null:tab);
  },

  async _renderList(c,type) {
    c.innerHTML=UI.loading();
    const data=await API.get('/templates'+(type?`?type=${type}`:''));
    if(data.error){c.innerHTML=UI.error(data.error);return;}
    if(!data.length){c.innerHTML=UI.empty('No templates','Restore defaults or create a new template.',`<div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-secondary" onclick="Pages.Templates.seedDefaults()">Restore Defaults</button><button class="btn btn-primary" onclick="Pages.Templates.openCreate()">New Template</button></div>`);return;}
    const tc={letter:'blue',circular:'cyan',report:'green',announcement:'amber',notice:'purple',certificate:'orange'};
    c.innerHTML=`<div class="grid-auto">${data.map(t=>`<div class="card"><div class="card-header"><div><div class="card-title">${t.name}</div><div class="card-subtitle">${t.category||'general'}</div></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${_b(t.type,tc[t.type]||'gray')}${t.is_system?_b('System','purple'):''}</div></div><div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${(t.placeholders||[]).length} placeholders</div><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="btn btn-sm btn-primary" onclick="Pages.Templates.openUse('${t.id}','${t.name.replace(/'/g,"\\'")}')">Use Template</button>${!t.is_system?`<button class="btn btn-sm btn-secondary" onclick="Pages.Templates.openEdit('${t.id}')">Edit</button>`:''}<button class="btn btn-sm btn-ghost" onclick="Pages.Templates.preview('${t.id}')">Preview</button>${!t.is_system?`<button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Templates.del('${t.id}')">Delete</button>`:''}</div></div>`).join('')}</div>`;
  },

  async _renderInstances(c) {
    c.innerHTML=UI.loading();
    const data=await API.get('/templates/instances');
    if(data.error){c.innerHTML=UI.error(data.error);return;}
    c.innerHTML=_tbl2(['Title','Template','By','Date',''],
      data.map(d=>`<tr><td><strong>${d.title}</strong></td><td>${_b(d.name||'--','blue')}</td><td style="font-size:11px">${d.generated_by_name||'--'}</td><td style="font-size:11px">${new Date(d.created_at).toLocaleDateString('en-KE')}</td><td><button class="btn btn-sm btn-secondary" onclick="Pages.Templates._viewInst('${d.id}','${d.title.replace(/'/g,"\\'")}')">View/Print</button></td></tr>`).join(''), 'No documents generated yet');
  },

  async openUse(tid, name) {
    this._tid=tid;
    const t=await API.get(`/templates/${tid}`);
    const phs=(t.placeholders||[]).filter(p=>!['school_name','date','principal_name','bursar_name','school_address','school_phone','school_email'].includes(p.key));
    $id('gen-doc-title').textContent=`Generate: ${name}`;
    $id('gen-doc-variables').innerHTML=phs.map(p=>`<div class="form-group"><label>${p.label||p.key}</label><input type="text" id="gv-${p.key}" placeholder="${p.label||p.key}…"></div>`).join('');
    $id('gen-doc-student').value=''; $id('gen-doc-student-id').value=''; $id('gen-doc-student-results').innerHTML='';
    UI.openModal('modal-generate-doc');
  },

  async searchStudent(q) {
    const r=$id('gen-doc-student-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const data=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!data.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px;overflow:hidden">${data.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="$id('gen-doc-student').value='${s.first_name} ${s.last_name}';$id('gen-doc-student-id').value='${s.id}';Pages.Templates._sData={class_name:'${s.class_name||''}',admission_number:'${s.admission_number}'};$id('gen-doc-student-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.admission_number}</span></div>`).join('')}</div>`;
  },

  async generateDoc() {
    if(!this._tid)return;
    const t=await API.get(`/templates/${this._tid}`);
    const phs=(t.placeholders||[]).filter(p=>!['school_name','date','principal_name','bursar_name','school_address','school_phone','school_email'].includes(p.key));
    const vars={};
    phs.forEach(p=>{vars[p.key]=$id(`gv-${p.key}`)?.value||'';});
    const studentName=$id('gen-doc-student')?.value;
    if(studentName){vars.student_name=studentName;if(this._sData)Object.assign(vars,this._sData);}
    const res=await API.post('/templates/generate',{templateId:this._tid,variables:vars,recipientId:$id('gen-doc-student-id')?.value||null});
    if(res.error){Toast.error(res.error);return;}
    Toast.success('Document generated!'); UI.closeModal('modal-generate-doc');
    this._openPreview(res.renderedHtml,res.title);
  },

  _openPreview(html,title) {
    const w=window.open('','_blank');
    if(!w){Toast.info('Allow popups to view document');return;}
    w.document.write(`<!DOCTYPE html><html><head><title>${title||'Document'}</title><style>body{font-family:Georgia,serif;margin:0;padding:20px;background:#fff;color:#000}@media print{body{margin:0;padding:10px}}</style></head><body>${html}<script>window.onload=()=>{setTimeout(()=>window.print(),600)}<\/script></body></html>`);
    w.document.close();
  },

  printDoc() { this.generateDoc(); },

  async _viewInst(id) {
    const data=await API.get('/templates/instances');
    const inst=data.find(d=>d.id===id);
    if(inst) this._openPreview(inst.content_html,inst.title);
  },

  openCreate() { this._tid=null; $id('template-editor-title').textContent='New Template'; ['tmpl-name','tmpl-content'].forEach(id=>{const e=$id(id);if(e)e.value='';}); UI.openModal('modal-template-editor'); },

  async openEdit(id) {
    const t=await API.get(`/templates/${id}`); if(t.error){Toast.error(t.error);return;}
    this._tid=id; $id('template-editor-title').textContent='Edit Template';
    $id('tmpl-name').value=t.name||''; $id('tmpl-type').value=t.type||'letter'; $id('tmpl-category').value=t.category||'general'; $id('tmpl-content').value=t.content_html||'';
    UI.openModal('modal-template-editor');
  },

  async save() {
    const payload={name:$id('tmpl-name')?.value?.trim(),type:$id('tmpl-type')?.value||'letter',category:$id('tmpl-category')?.value||'general',contentHtml:$id('tmpl-content')?.value};
    if(!payload.name||!payload.contentHtml){Toast.error('Name and content required');return;}
    const res=this._tid?await API.put(`/templates/${this._tid}`,payload):await API.post('/templates',payload);
    if(res.error){Toast.error(res.error);return;}
    Toast.success(this._tid?'Template updated!':'Template created!'); UI.closeModal('modal-template-editor');
    this._renderList($id('templates-tab-content'),null);
  },

  async preview(id) {
    const t=await API.get(`/templates/${id}`); if(t.error){Toast.error(t.error);return;}
    const ph=t.content_html.replace(/\{\{(\w+)\}\}/g,(_,k)=>`<span style="background:#fffbcc;color:#856404;padding:2px 4px;border-radius:3px">{{${k}}}</span>`);
    UI.showInfoModal(`Preview: ${t.name}`,ph);
  },

  async del(id) {
    if(!await UI.confirm('Delete this template?'))return;
    const r=await API.delete(`/templates/${id}`); if(r.error){Toast.error(r.error);return;}
    Toast.success('Deleted'); this._renderList($id('templates-tab-content'),null);
  },

  async seedDefaults() {
    const r=await API.post('/templates/seed',{});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Default templates restored!'); this._renderList($id('templates-tab-content'),null);
  },
};

// ============================================================
// SYLLABUS / SCHEME OF WORK
// ============================================================
Pages.Syllabus = {
  async load() { this.switchTab('schemes',document.querySelector('#page-syllabus .tab')); },

  switchTab(tab,el) {
    document.querySelectorAll('#page-syllabus .tab').forEach(t=>t.classList.remove('active'));
    if(el)el.classList.add('active');
    const c=$id('syllabus-tab-content'); if(!c)return;
    tab==='schemes'?this._renderSchemes(c):this.renderCoverage(c);
  },

  async _renderSchemes(c) {
    const [classes,subjects]=await Promise.all([API.get('/academics/classes'),API.get('/academics/subjects')]);
    c.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div><label>Class</label><select id="sf-cls" style="min-width:160px" onchange="Pages.Syllabus._load()"><option value="">All</option>${(classes||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('')}</select></div>
      <div><label>Subject</label><select id="sf-sub" style="min-width:160px" onchange="Pages.Syllabus._load()"><option value="">All</option>${(subjects||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
      <div><label>Term</label><select id="sf-term" onchange="Pages.Syllabus._load()"><option value="">All</option><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></div>
    </div><div id="sf-list">${UI.empty('Select filters to load scheme entries')}</div>`;
  },

  async _load() {
    const c=$id('sf-list'); if(!c)return;
    const clsId=$id('sf-cls')?.value, subId=$id('sf-sub')?.value, term=$id('sf-term')?.value;
    if(!clsId&&!subId&&!term){return;}
    c.innerHTML=UI.loading();
    let url='/cbc/schemes?'; if(clsId)url+=`classId=${clsId}&`; if(subId)url+=`subjectId=${subId}&`; if(term)url+=`term=${term}&`;
    const data=await API.get(url);
    if(data.error){c.innerHTML=UI.error(data.error);return;}
    if(!data.length){c.innerHTML=UI.empty('No entries','Add scheme of work entries.',`<button class="btn btn-primary" onclick="Pages.Syllabus.openAddScheme()">Add Entry</button>`);return;}
    const sc={planned:'gray',in_progress:'blue',completed:'green',skipped:'amber'};
    const weeks=[...new Set(data.map(d=>d.week_number))].sort((a,b)=>a-b);
    c.innerHTML=weeks.map(w=>{const we=data.filter(e=>e.week_number===w);return `<div style="margin-bottom:14px"><div style="font-weight:700;color:var(--accent);font-size:12px;margin-bottom:6px;padding:5px 10px;background:var(--accent-subtle);border-radius:6px">Week ${w}</div>${_tbl2(['Ln#','Class','Subject','Topic','Status',''],we.map(e=>`<tr><td style="text-align:center">${e.lesson_number}</td><td>${e.class_name||'--'}</td><td>${e.subject_name||'--'}</td><td><strong>${e.topic}</strong>${e.sub_topic?`<div style="font-size:10px;color:var(--text-muted)">${e.sub_topic}</div>`:''}</td><td>${_b(e.status,sc[e.status]||'gray')}</td><td><div style="display:flex;gap:3px">${e.status!=='completed'?`<button class="btn btn-sm btn-success" onclick="Pages.Syllabus._markDone('${e.id}')">✓</button>`:''}</div></td></tr>`).join(''))}</div>`;}).join('');
  },

  async renderCoverage(c) {
    c.innerHTML=UI.loading();
    const data=await API.get('/cbc/coverage');
    if(data.error){c.innerHTML=UI.error(data.error);return;}
    const {coverages=[],overallCoverage=0}=data;
    c.innerHTML=`<div style="text-align:center;padding:14px;background:var(--accent-subtle);border-radius:10px;margin-bottom:16px"><div style="font-size:32px;font-weight:800;color:var(--accent)">${overallCoverage}%</div><div style="font-size:12px;color:var(--text-muted)">Overall Syllabus Coverage</div><div style="width:280px;height:8px;background:var(--border);border-radius:4px;margin:8px auto;overflow:hidden"><div style="width:${overallCoverage}%;height:100%;background:${parseFloat(overallCoverage)>=80?'var(--green)':parseFloat(overallCoverage)>=60?'var(--amber)':'var(--red)'}"></div></div></div>
      ${coverages.length?_tbl2(['Class','Subject','Teacher','Done','Total','Coverage','Status'],
        coverages.map(c=>`<tr><td>${c.class_name||'--'}</td><td>${c.subject_name||'--'}</td><td>${c.teacher_name||'--'}</td><td>${c.completed_topics}</td><td>${c.total_topics}</td><td><div style="display:flex;align-items:center;gap:6px"><div style="width:60px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${c.coverage_percentage}%;height:100%;background:${parseFloat(c.coverage_percentage)>=80?'var(--green)':parseFloat(c.coverage_percentage)>=60?'var(--amber)':'var(--red)'}"></div></div><span style="font-weight:700;font-size:11px">${parseFloat(c.coverage_percentage).toFixed(1)}%</span></div></td><td>${parseFloat(c.coverage_percentage)>=80?_b('On Track','green'):parseFloat(c.coverage_percentage)>=60?_b('Behind','amber'):_b('Alert','red')}</td></tr>`).join(''))
      :UI.empty('No coverage data')}`;
  },

  async _markDone(id) {
    const r=await API.put(`/cbc/schemes/${id}/status`,{status:'completed',completionDate:new Date().toISOString().split('T')[0]});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Marked complete!'); this._load();
  },

  openAddScheme() { UI.openModal('modal-scheme'); this._fillSchemeModal(); },

  async _fillSchemeModal() {
    const [classes,subjects]=await Promise.all([API.get('/academics/classes'),API.get('/academics/subjects')]);
    const cs=$id('sch-class'), ss=$id('sch-subject');
    if(cs) cs.innerHTML='<option value="">Select class…</option>'+(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    if(ss) ss.innerHTML='<option value="">Select subject…</option>'+(subjects||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  },

  async saveScheme() {
    const payload={classId:$id('sch-class')?.value,subjectId:$id('sch-subject')?.value,term:$id('sch-term')?.value||'term_1',weekNumber:parseInt($id('sch-week')?.value||1),lessonNumber:parseInt($id('sch-lesson')?.value||1),topic:$id('sch-topic')?.value?.trim(),subTopic:$id('sch-subtopic')?.value,objectives:$id('sch-objectives')?.value,teachingActivities:$id('sch-activities')?.value,learningMaterials:$id('sch-materials')?.value,assessmentMethod:$id('sch-assessment')?.value};
    if(!payload.classId||!payload.subjectId||!payload.topic){Toast.error('Class, subject and topic required');return;}
    const r=await API.post('/cbc/schemes',payload);
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Scheme entry saved!'); UI.closeModal('modal-scheme'); this._load();
  },
};

// ============================================================
// DISCIPLINE PAGE
// ============================================================
Pages.Discipline = {
  async load() { this.switchTab('records',document.querySelector('#page-discipline .tab')); },

  switchTab(tab,el) {
    document.querySelectorAll('#page-discipline .tab').forEach(t=>t.classList.remove('active'));
    if(el)el.classList.add('active');
    const c=$id('discipline-tab-content'); if(!c)return;
    if(tab==='records') this._renderRecords(c);
    else if(tab==='behaviour') this._renderBehaviour(c);
    else if(tab==='letters') this._renderLetters(c);
  },

  async _renderRecords(c) {
    c.innerHTML=UI.loading();
    const data=await API.get('/analytics/discipline').catch(()=>[]);
    const list=Array.isArray(data)?data:(data.data||[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Discipline.openIncidentModal()">Record Incident</button></div>
      ${!list.length?UI.empty('No discipline records','Record incidents to track student behaviour.'):_tbl2(['Date','Student','Class','Type','Severity','Action Taken','Description'],
        list.map(i=>`<tr><td>${new Date(i.created_at||i.date||Date.now()).toLocaleDateString('en-KE')}</td><td><strong>${i.first_name||i.student_name||'--'} ${i.last_name||''}</strong></td><td>${i.class_name||'--'}</td><td>${_b((i.type||i.incident_type||'conduct').replace(/_/g,' '),'blue')}</td><td>${_b(i.severity||'minor',{critical:'red',serious:'orange',moderate:'amber',minor:'gray'}[i.severity]||'gray')}</td><td style="font-size:12px">${(i.action||i.action_taken||'--').replace(/_/g,' ')}</td><td style="font-size:11px;color:var(--text-muted)">${(i.description||'').substring(0,60)}</td></tr>`).join(''))}`;
  },

  async _renderBehaviour(c) {
    const classes=await API.get('/academics/classes');
    c.innerHTML=`<div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap">
      <div><label>Class</label><select id="beh-cls" onchange="Pages.Discipline._loadBeh()" style="min-width:160px"><option value="">Select…</option>${(classes||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('')}</select></div>
      <div><label>Term</label><select id="beh-term"><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></div>
    </div><div id="beh-out">${UI.empty('Select a class')}</div>`;
  },

  async _loadBeh() {
    const cId=$id('beh-cls')?.value; if(!cId)return;
    const c=$id('beh-out'); c.innerHTML=UI.loading();
    const students=await API.get(`/students?classId=${cId}&limit=100`);
    const list=students.data||[];
    if(!list.length){c.innerHTML=UI.empty('No students');return;}
    const cats=['conduct','neatness','punctuality','diligence','leadership'];
    const opts='<option value="">--</option><option value="excellent">Excellent</option><option value="good">Good</option><option value="satisfactory">Satisfactory</option><option value="needs_improvement">Needs Improvement</option>';
    c.innerHTML=`<div style="overflow-x:auto"><table><thead><tr><th>Student</th>${cats.map(cat=>`<th style="text-align:center;min-width:120px">${cat.charAt(0).toUpperCase()+cat.slice(1)}</th>`).join('')}<th>Remarks</th><th></th></tr></thead><tbody>
      ${list.map(s=>`<tr><td><strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${s.admission_number}</div></td>${cats.map(cat=>`<td><select data-sid="${s.id}" data-cat="${cat}" class="beh-r" style="padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:11px;width:100%">${opts}</select></td>`).join('')}<td><input type="text" id="beh-rm-${s.id}" placeholder="Remarks…" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:11px;width:140px"></td><td><button class="btn btn-sm btn-primary" onclick="Pages.Discipline._saveBeh('${s.id}')">Save</button></td></tr>`).join('')}
    </tbody></table></div>`;
  },

  async _saveBeh(sid) {
    const ratings=document.querySelectorAll(`.beh-r[data-sid="${sid}"]`);
    const remarks=$id(`beh-rm-${sid}`)?.value, term=$id('beh-term')?.value||'term_1';
    let saved=0;
    for(const sel of ratings){
      if(!sel.value)continue;
      await API.post('/analytics/behaviour',{studentId:sid,category:sel.dataset.cat,rating:sel.value,teacherRemarks:remarks,term});
      saved++;
    }
    Toast.success(`${saved} behaviour ratings saved!`);
  },

  async _renderLetters(c) {
    c.innerHTML=`<div class="alert alert-info" style="margin-bottom:16px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>Generate discipline letters using the Document Templates system. The "Suspension Letter" and "Parent Invitation Letter" templates are available.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="Router.go('templates');setTimeout(()=>Pages.Templates.openUse?Pages.Templates.openUse('','Suspension Letter'):{},300)">📄 Suspension Letter</button>
        <button class="btn btn-secondary" onclick="Router.go('templates')">📂 All Templates</button>
      </div>`;
  },

  openIncidentModal() {
    UI.openModal('modal-incident');
    $id('disc-date').value=new Date().toISOString().split('T')[0];
    $id('disc-student').value=''; $id('disc-student-id').value=''; $id('disc-student-results').innerHTML='';
  },

  async searchStudent(q) {
    const r=$id('disc-student-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const data=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!data.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px;overflow:hidden">${data.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="$id('disc-student').value='${s.first_name} ${s.last_name}';$id('disc-student-id').value='${s.id}';$id('disc-student-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.admission_number} · ${s.class_name||''}</span></div>`).join('')}</div>`;
  },

  async saveIncident() {
    const studentId=$id('disc-student-id')?.value;
    if(!studentId){Toast.error('Select a student');return;}
    const payload={studentId,type:$id('disc-type')?.value||'misconduct',severity:$id('disc-severity')?.value||'minor',date:$id('disc-date')?.value,action:$id('disc-action')?.value||'verbal_warning',description:$id('disc-description')?.value?.trim(),resolution:$id('disc-resolution')?.value};
    if(!payload.description){Toast.error('Description required');return;}
    const r=await API.post('/analytics/discipline',payload);
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Incident recorded!'); UI.closeModal('modal-incident'); this._renderRecords($id('discipline-tab-content'));
  },
};

// ============================================================
// FEE CLEARANCE SHEETS
// ============================================================
Pages.FeeClearance = {
  async load() {
    const c=$id('fee-clearance-content'); if(!c)return;
    c.innerHTML=UI.loading();
    const data=await API.get('/billing?limit=200');
    const list=data.data||[];
    const sc={paid:'green',partial:'amber',unpaid:'red'};
    c.innerHTML=`<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
      <div style="flex:1;min-width:180px;position:relative">
        <svg style="position:absolute;left:9px;top:50%;transform:translateY(-50%);width:13px;height:13px;color:var(--text-muted)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" placeholder="Search student…" style="width:100%;padding:7px 12px 7px 30px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none">
      </div>
      <button class="btn btn-primary btn-sm" onclick="Pages.FeeClearance.openGenerate()">Generate Sheet</button>
      <button class="btn btn-secondary btn-sm" onclick="Pages.FeeClearance.generateAll()">Generate All</button>
    </div>
    ${!list.length?UI.empty('No invoices found'):_tbl2(['Invoice #','Student','Class','Total Fees','Paid','Balance','Status','Clearance'],
      list.map(inv=>{const bal=parseFloat(inv.amount_due)-parseFloat(inv.amount_paid||0);return `<tr><td class="font-mono text-sm">${inv.invoice_number}</td><td><strong>${inv.first_name} ${inv.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${inv.admission_number}</div></td><td>${inv.class_name||'--'}</td><td style="font-weight:600">KES ${parseFloat(inv.amount_due).toLocaleString()}</td><td style="color:var(--green)">KES ${parseFloat(inv.amount_paid||0).toLocaleString()}</td><td style="font-weight:700;color:${bal>0?'var(--red)':'var(--green)'}">KES ${bal.toLocaleString()}</td><td>${_b(inv.status?.toUpperCase()||'UNPAID',sc[inv.status]||'red')}</td><td><button class="btn btn-sm btn-secondary" onclick="Pages.FeeClearance.printSheet('${inv.id}','${inv.first_name} ${inv.last_name}')">Print Sheet</button></td></tr>`;}).join(''))}`;
  },

  async openGenerate() {
    const adm=prompt('Student admission number:'); if(!adm)return;
    const students=await API.get(`/search/students?q=${adm}&limit=3`);
    if(!students.length){Toast.error('Student not found');return;}
    this.printSheet(null,students[0].first_name+' '+students[0].last_name,students[0]);
  },

  async generateAll() {
    Toast.info('Generating fee clearance sheets for all students…');
    const data=await API.get('/billing/summary');
    const byClass=data.byClass||[];
    Toast.success(`Fee clearance summary ready for ${byClass.length} classes`);
  },

  async printSheet(invoiceId, studentName, studentData) {
    let inv={};
    if(invoiceId) {
      const data=await API.get(`/billing`);
      inv=(data.data||[]).find(i=>i.id===invoiceId)||{};
    } else if(studentData) {
      inv={first_name:studentData.first_name,last_name:studentData.last_name,admission_number:studentData.admission_number,class_name:studentData.class_name,amount_due:0,amount_paid:0};
    }
    const balance=parseFloat(inv.amount_due||0)-parseFloat(inv.amount_paid||0);
    const school=AppState.school||{};
    const html=`<div style="font-family:Georgia,serif;max-width:760px;margin:auto;padding:24px;background:#fff;color:#000">
      <div style="text-align:center;border-bottom:3px double #333;padding-bottom:14px;margin-bottom:14px">
        <div style="font-size:22px;font-weight:700">${school.name||'School Name'}</div>
        <div style="font-size:13px;color:#555">P.O Box · Tel: ${school.phone||'--'}</div>
        <div style="font-size:18px;font-weight:700;margin-top:8px;text-transform:uppercase;letter-spacing:1px">Fee Clearance / Leave Sheet</div>
        <div style="font-size:12px">${new Date().toLocaleDateString('en-KE',{dateStyle:'full'})}</div>
      </div>
      <table style="width:100%;font-size:13px;margin-bottom:14px"><tr>
        <td><b>Name:</b> ${inv.first_name||''} ${inv.last_name||''}</td>
        <td><b>Adm No:</b> ${inv.admission_number||'--'}</td>
        <td><b>Class:</b> ${inv.class_name||'--'}</td>
        <td><b>Term:</b> ${new Date().getFullYear()}</td>
      </tr></table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:14px">
        <thead><tr style="background:#e8e8e8"><th style="border:1px solid #999;padding:8px;text-align:left">Fee Item</th><th style="border:1px solid #999;padding:8px;width:120px;text-align:right">Expected (KES)</th><th style="border:1px solid #999;padding:8px;width:120px;text-align:right">Paid (KES)</th><th style="border:1px solid #999;padding:8px;width:120px;text-align:right">Balance (KES)</th></tr></thead>
        <tbody>
          <tr><td style="border:1px solid #ccc;padding:7px">Total School Fees</td><td style="border:1px solid #ccc;padding:7px;text-align:right;font-weight:700">${parseFloat(inv.amount_due||0).toLocaleString()}</td><td style="border:1px solid #ccc;padding:7px;text-align:right;font-weight:700;color:#166534">${parseFloat(inv.amount_paid||0).toLocaleString()}</td><td style="border:1px solid #ccc;padding:7px;text-align:right;font-weight:700;color:${balance>0?'#dc2626':'#166534'}">${balance.toLocaleString()}</td></tr>
        </tbody>
        <tfoot><tr style="background:#f5f5f5"><td style="border:1px solid #999;padding:8px;font-weight:700">TOTAL</td><td style="border:1px solid #999;padding:8px;text-align:right;font-weight:700">${parseFloat(inv.amount_due||0).toLocaleString()}</td><td style="border:1px solid #999;padding:8px;text-align:right;font-weight:700">${parseFloat(inv.amount_paid||0).toLocaleString()}</td><td style="border:1px solid #999;padding:8px;text-align:right;font-weight:700;color:${balance>0?'#dc2626':'#166534'}">${balance.toLocaleString()}</td></tr></tfoot>
      </table>
      <div style="padding:12px;border:1px solid #ccc;margin-bottom:14px;font-size:13px">
        <b>Status:</b> <span style="font-weight:700;color:${balance<=0?'#166534':balance<parseFloat(inv.amount_due||1)*0.5?'#854d0e':'#dc2626'}">${balance<=0?'✅ FULLY CLEARED':balance<parseFloat(inv.amount_due||1)*0.5?'⚠️ PARTIALLY CLEARED':'❌ NOT CLEARED'}</span>
        ${balance>0?`<br><b>Outstanding Balance: KES ${balance.toLocaleString()}</b>`:''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:14px;font-size:12px">
        <div style="border:1px solid #ccc;padding:12px;border-radius:4px"><b>Bursar:</b><div style="margin:20px 0 6px;border-bottom:1px solid #999"></div>Sign: _________________ Date: _______</div>
        <div style="border:1px solid #ccc;padding:12px;border-radius:4px"><b>Class Teacher:</b><div style="margin:20px 0 6px;border-bottom:1px solid #999"></div>Sign: _________________ Date: _______</div>
        <div style="border:1px solid #ccc;padding:12px;border-radius:4px"><b>Principal:</b><div style="margin:20px 0 6px;border-bottom:1px solid #999"></div>Sign: _________________ Date: _______</div>
      </div>
    </div>`;
    const w=window.open('','_blank');
    if(!w){Toast.info('Allow popups');return;}
    w.document.write(`<!DOCTYPE html><html><head><title>Fee Clearance -- ${studentName}</title><style>body{margin:0;background:#fff}@media print{body{margin:0}}</style></head><body>${html}<script>window.onload=()=>{setTimeout(()=>window.print(),600)}<\/script></body></html>`);
    w.document.close();
  },
};

// ============================================================
// REPORT CARDS PAGE (Advanced)
// ============================================================
Pages.ReportCards = {
  async load() { this.switchTab('generate',document.querySelector('#page-report-cards .tab')); },

  switchTab(tab,el) {
    document.querySelectorAll('#page-report-cards .tab').forEach(t=>t.classList.remove('active'));
    if(el)el.classList.add('active');
    const c=$id('report-cards-tab-content'); if(!c)return;
    if(tab==='generate') this._renderGenerate(c);
    else if(tab==='templates') this._renderTemplates(c);
    else if(tab==='history') this._renderHistory(c);
  },

  async _renderGenerate(c) {
    const [classes,series]=await Promise.all([API.get('/academics/classes'),API.get('/exams/series')]);
    c.innerHTML=`<div class="grid-2" style="margin-bottom:20px">
      <div class="card">
        <div class="card-header"><div class="card-title">Individual Report Card</div></div>
        <div class="form-group"><label>Exam Series</label><select id="rc-ser" style="width:100%"><option value="">Select…</option>${(series.data||series||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Student</label><input type="text" id="rc-student" placeholder="Search student…" oninput="Pages.ReportCards._searchStudent(this.value)"><div id="rc-student-results"></div><input type="hidden" id="rc-student-id"></div>
        <button class="btn btn-primary w-full" onclick="Pages.ReportCards.previewSingle()">Preview Report Card</button>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Bulk Class Print</div></div>
        <div class="form-group"><label>Exam Series</label><select id="rc-bulk-ser" style="width:100%"><option value="">Select…</option>${(series.data||series||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Class</label><select id="rc-bulk-class" style="width:100%"><option value="">All Classes</option>${(classes||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('')}</select></div>
        <div class="form-group"><label>Options</label><div style="display:flex;flex-direction:column;gap:6px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="rc-ai-comments" checked> Include AI auto-comments</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="rc-show-position" checked> Show class position</label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="rc-show-attendance" checked> Show attendance summary</label>
        </div></div>
        <button class="btn btn-primary w-full" onclick="Pages.ReportCards.bulkPrint()">Generate & Print All</button>
      </div>
    </div>
    <div class="alert alert-info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>
      Report cards include: student details, all subject marks, grades, points, class/stream position, teacher remarks, principal comment, and attendance summary.
    </div>`;
  },

  async _searchStudent(q) {
    const r=$id('rc-student-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const data=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!data.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px;overflow:hidden">${data.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="$id('rc-student').value='${s.first_name} ${s.last_name}';$id('rc-student-id').value='${s.id}';$id('rc-student-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.admission_number} · ${s.class_name||''}</span></div>`).join('')}</div>`;
  },

  async previewSingle() {
    const seriesId=$id('rc-ser')?.value, studentId=$id('rc-student-id')?.value;
    if(!seriesId||!studentId){Toast.warning('Select exam series and student');return;}
    Toast.info('Loading report card…');
    const data=await API.get(`/curriculum/broadsheet?examSeriesId=${seriesId}&studentId=${studentId}`).catch(()=>null);
    if(!data||data.error){
      // Fallback: use grades endpoint
      const grades=await API.get(`/parent/children/${studentId}/grades`);
      const student=await API.get(`/students/${studentId}`);
      this._printRC(student, grades, {}, seriesId);
      return;
    }
    const student=data.students?.[0];
    if(!student){Toast.error('No data found for student');return;}
    this._printRC(student, data.subjects, data.stats||{}, seriesId, data.students);
  },

  async bulkPrint() {
    const seriesId=$id('rc-bulk-ser')?.value, classId=$id('rc-bulk-class')?.value;
    if(!seriesId){Toast.warning('Select exam series');return;}
    Toast.info('Generating bulk report cards…');
    const res=await API.post('/bulk-export/report-cards',{examSeriesId:seriesId,classId:classId||undefined,includeAiComments:$id('rc-ai-comments')?.checked,showPosition:$id('rc-show-position')?.checked,showAttendance:$id('rc-show-attendance')?.checked});
    if(res.error){Toast.error(res.error);return;}
    Toast.success('Report cards generated! Check bulk exports.');
  },

  _printRC(student, subjects, stats, seriesId, allStudents) {
    const school=AppState.school||{};
    const s=student||{};
    const pos=allStudents?allStudents.findIndex(st=>st.id===s.id)+1:s.position||'--';
    const grade=g=>_b(g,_gc(g));
    const rcHtml=`<div style="font-family:Georgia,serif;max-width:800px;margin:auto;padding:24px;background:#fff;color:#000">
      <div style="display:flex;align-items:center;gap:20px;border-bottom:3px double #333;padding-bottom:14px;margin-bottom:14px">
        <div style="flex:1;text-align:center">
          <div style="font-size:22px;font-weight:700">${school.name||'School Name'}</div>
          <div style="font-size:12px;color:#555">P.O Box · Tel: ${school.phone||'--'}</div>
          <div style="font-size:18px;font-weight:700;margin-top:6px;text-transform:uppercase">Academic Progress Report</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:14px;font-size:12px">
        <table style="width:100%">${[['Name',`${s.first_name||''} ${s.last_name||''}`],['Admission No.',s.admission_number||'--'],['Class',s.class_name||'--'],['Stream Position',`${pos} / ${allStudents?.length||'--'}`],['Mean Grade',s.mean_grade||'--'],['Mean Points',parseFloat(s.mean_points||0).toFixed(2)],['Mean Mark',parseFloat(s.mean_marks||0).toFixed(2)+'%']].map(([k,v])=>`<tr><td style="padding:4px 8px;font-weight:700;background:#f5f5f5;border:1px solid #ddd">${k}</td><td style="padding:4px 8px;border:1px solid #ddd;font-weight:600">${v}</td></tr>`).join('')}</table>
        <div style="border:1px solid #ccc;padding:10px;text-align:center;font-size:13px"><div style="font-size:28px;font-weight:800;color:${_gc(s.mean_grade||'')==='green'?'#166534':_gc(s.mean_grade||'')==='red'?'#dc2626':'#1d4ed8'}">${s.mean_grade||'--'}</div><div>Mean Grade</div><div style="font-size:20px;font-weight:700;margin-top:6px">${parseFloat(s.mean_marks||0).toFixed(2)}%</div><div>Mean Score</div></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px">
        <thead><tr style="background:#1d4ed8;color:#fff"><th style="padding:8px;border:1px solid #1d4ed8;text-align:left">Subject</th><th style="padding:8px;border:1px solid #1d4ed8;text-align:center">Marks</th><th style="padding:8px;border:1px solid #1d4ed8;text-align:center">Grade</th><th style="padding:8px;border:1px solid #1d4ed8;text-align:center">Points</th><th style="padding:8px;border:1px solid #1d4ed8">Remarks</th></tr></thead>
        <tbody>${(subjects||[]).map((sub,i)=>{const m=(s.marks||[]).find(x=>x.subject_id===sub.id)||{};const gr=m.grade||'--';const gc={'A':'#166534','A-':'#166534','B+':'#1d4ed8','B':'#1d4ed8','B-':'#1d4ed8','C+':'#0891b2','C':'#0891b2','C-':'#854d0e','D+':'#854d0e','D':'#c2410c','D-':'#c2410c','E':'#dc2626'}[gr]||'#333';return `<tr style="background:${i%2?'#f9f9f9':'#fff'}"><td style="border:1px solid #ddd;padding:6px;font-weight:600">${sub.name}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:700">${m.is_absent?'ABS':m.marks||'--'}</td><td style="border:1px solid #ddd;padding:6px;text-align:center;font-weight:800;color:${gc}">${gr}</td><td style="border:1px solid #ddd;padding:6px;text-align:center">${m.points||'--'}</td><td style="border:1px solid #ddd;padding:6px;font-style:italic;color:#555">${m.remarks||'--'}</td></tr>`;}).join('')}</tbody>
        <tfoot><tr style="background:#1d4ed8;color:#fff;font-weight:700"><td style="padding:8px;border:1px solid #1d4ed8">TOTALS</td><td style="padding:8px;border:1px solid #1d4ed8;text-align:center">${s.total_marks||'--'}</td><td style="padding:8px;border:1px solid #1d4ed8;text-align:center">${s.mean_grade||'--'}</td><td style="padding:8px;border:1px solid #1d4ed8;text-align:center">${parseFloat(s.mean_points||0).toFixed(2)}</td><td style="padding:8px;border:1px solid #1d4ed8"></td></tr></tfoot>
      </table>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;font-size:12px">
        <div style="border:1px solid #ccc;padding:12px"><div style="font-weight:700;margin-bottom:4px">Class Teacher's Comment</div><div style="min-height:40px;border-bottom:1px solid #ccc;margin-bottom:6px;font-style:italic;color:#555">${s.teacher_comment||'Keep up the good work.'}</div><div>Signed: _________________ Date: _______</div></div>
        <div style="border:1px solid #ccc;padding:12px"><div style="font-weight:700;margin-bottom:4px">Principal's Comment</div><div style="min-height:40px;border-bottom:1px solid #ccc;margin-bottom:6px;font-style:italic;color:#555">${stats.principalComment||'A commendable performance. Continue to work hard.'}</div><div>Signed: _________________ Date: _______</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;border-top:2px solid #333;padding-top:10px">
        <div><b>Next Term Begins:</b> ___________________</div>
        <div><b>Next Term Fee:</b> KES _______________</div>
      </div>
    </div>`;
    const w=window.open('','_blank');
    if(!w){Toast.info('Allow popups');return;}
    w.document.write(`<!DOCTYPE html><html><head><title>Report Card -- ${s.first_name} ${s.last_name}</title><style>body{margin:0;background:#fff}@media print{body{margin:0}}</style></head><body>${rcHtml}<script>window.onload=()=>{setTimeout(()=>window.print(),600)}<\/script></body></html>`);
    w.document.close();
  },

  async openPreview() { this.previewSingle(); },

  _renderTemplates(c) {
    c.innerHTML=`<div class="alert alert-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>Report card templates control the layout, colours, and which sections appear on printed report forms.</div>
      <div class="grid-2">${[{name:'Standard 8-4-4',desc:'Class position, KNEC grades, teacher remarks, principal comment',curr:'844',active:true},{name:'CBC Primary',desc:'Learning areas, performance levels (EE/ME/AE/BE), strand assessments',curr:'cbc',active:false},{name:'Minimal',desc:'Simplified format with just marks and grades',curr:'844',active:false}].map(t=>`<div class="card"><div class="card-header"><div><div class="card-title">${t.name}</div><div class="card-subtitle">${t.curr==='cbc'?'CBC Curriculum':'8-4-4 Curriculum'}</div></div>${t.active?_b('Default','green'):''}</div><div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${t.desc}</div><div style="display:flex;gap:6px">${!t.active?`<button class="btn btn-sm btn-primary" onclick="Toast.info('Set as default template')">Set Default</button>`:''}<button class="btn btn-sm btn-secondary" onclick="Toast.info('Template customisation')">Customize</button></div></div>`).join('')}</div>`;
  },

  async _renderHistory(c) {
    c.innerHTML=UI.loading();
    const data=await API.get('/bulk-export/report-cards').catch(()=>({error:'No history'}));
    if(data.error){c.innerHTML=UI.empty('No report card history','Generated report cards will appear here.');return;}
    c.innerHTML=_tbl2(['Exam','Class','Generated By','Date','Action'],
      (data||[]).map(r=>`<tr><td>${r.exam_name||'--'}</td><td>${r.class_name||'All Classes'}</td><td>${r.generated_by||'--'}</td><td>${new Date(r.generated_at||Date.now()).toLocaleDateString('en-KE')}</td><td><button class="btn btn-sm btn-secondary" onclick="window.open('${CONFIG.API_URL}/bulk-export/report-cards?id=${r.id}','_blank')">Download</button></td></tr>`).join(''), 'No history found');
  },
};

console.log('✅ ElimuSaaS Advanced Pages loaded -- Storekeeper · CBC · Broadsheet · Templates · Syllabus · Discipline · Fee Clearance · Report Cards');
