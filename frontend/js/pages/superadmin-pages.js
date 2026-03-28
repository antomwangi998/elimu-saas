// ============================================================
// ElimuSaaS -- Super Admin Pages (Full Platform Management)
// ============================================================

Pages.SuperAdmin = {
  async load() {
    const c = document.getElementById('page-superadmin');
    if (!c) return;
    this.switchTab('overview');
  },

  switchTab(tab) {
    document.querySelectorAll('#page-superadmin .sa-tab').forEach(t => t.classList.remove('active'));
    const el = document.querySelector(`#page-superadmin .sa-tab[data-tab="${tab}"]`);
    if (el) el.classList.add('active');
    const c = document.getElementById('sa-content');
    if (!c) return;
    if (tab === 'overview')  this._renderOverview(c);
    else if (tab === 'schools')   this._renderSchools(c);
    else if (tab === 'new')       this._renderNewSchool(c);
    else if (tab === 'broadcast') this._renderBroadcast(c);
  },

  async _renderOverview(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/superadmin/stats');
    if (d.error) { c.innerHTML = UI.error(d.error); return; }

    const stC = { active: 'green', trial: 'blue', grace: 'amber', suspended: 'red', cancelled: 'gray' };
    c.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[
          ['Total Schools', d.total_schools, '🏫', 'var(--accent)'],
          ['Active', d.active_schools, '✅', 'var(--green)'],
          ['On Trial', d.trial_schools, '🔵', 'var(--blue)'],
          ['Grace Period', d.grace_schools, '⚠️', 'var(--amber)'],
          ['Suspended', d.suspended_schools, '🔒', 'var(--red)'],
          ['Total Students', parseInt(d.total_students||0).toLocaleString(), '👥', 'var(--purple)'],
          ['Total Staff', parseInt(d.total_staff||0).toLocaleString(), '👔', 'var(--cyan)'],
          ['Platform Revenue', 'KES '+parseFloat(d.total_revenue||0).toLocaleString(), '💰', 'var(--green)'],
        ].map(([l,v,i,col]) => `
          <div class="stat-card">
            <div class="stat-body">
              <div style="font-size:24px">${i}</div>
              <div class="stat-value" style="color:${col}">${v}</div>
              <div class="stat-label">${l}</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">⚠️ Expiring Soon (7 days)</div></div>
          ${(d.expiringSoon||[]).length ? `
            <div style="display:flex;flex-direction:column;gap:6px">
              ${(d.expiringSoon||[]).map(s => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--bg-elevated);border-radius:8px">
                  <div><div style="font-weight:600;font-size:13px">${s.name}</div>
                  <div style="font-size:11px;color:var(--amber)">Expires: ${new Date(s.subscription_expires_at).toLocaleDateString('en-KE')}</div></div>
                  <button class="btn btn-sm btn-success" onclick="Pages.SuperAdmin.quickExtend('${s.id}','${s.name.replace(/'/g,"\\'")}')">Extend</button>
                </div>`).join('')}
            </div>` : `<div style="color:var(--green);font-size:13px">✅ No schools expiring soon</div>`}
          <div style="margin-top:10px">
            <button class="btn btn-warning btn-sm w-full" onclick="Pages.SuperAdmin.autoLock()">🔒 Auto-Lock All Expired</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">🕐 Recently Added Schools</div></div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${(d.recentSchools||[]).map(s => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:var(--bg-elevated);border-radius:8px">
                <div><div style="font-weight:600;font-size:13px">${s.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${s.code} · ${new Date(s.created_at).toLocaleDateString('en-KE')}</div></div>
                <span class="badge badge-${stC[s.subscription_status]||'gray'}">${s.subscription_status}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  },

  async _renderSchools(c) {
    c.innerHTML = UI.loading();
    const [all, active, trial, grace, suspended] = await Promise.all([
      API.get('/superadmin/schools?limit=200'),
      API.get('/superadmin/schools?status=active'),
      API.get('/superadmin/schools?status=trial'),
      API.get('/superadmin/schools?status=grace'),
      API.get('/superadmin/schools?status=suspended'),
    ]);
    const schools = all.data || [];
    const stC = { active: 'green', trial: 'blue', grace: 'amber', suspended: 'red', cancelled: 'gray' };

    c.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${[['all','All',schools.length],['active','Active',(active.data||[]).length],
             ['trial','Trial',(trial.data||[]).length],['grace','Grace',(grace.data||[]).length],
             ['suspended','Suspended',(suspended.data||[]).length]
          ].map(([v,l,n]) => `<button class="btn btn-sm ${v==='all'?'btn-primary':'btn-secondary'}"
            onclick="Pages.SuperAdmin._filterSchools('${v}',this)">${l} (${n})</button>`).join('')}
        </div>
        <div style="flex:1;min-width:200px">
          <input type="text" id="school-search" placeholder="Search schools…"
            oninput="Pages.SuperAdmin._searchSchools(this.value)"
            style="width:100%;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
        </div>
        <button class="btn btn-primary btn-sm" onclick="Pages.SuperAdmin.switchTab('new')">+ Add School</button>
      </div>
      <div id="schools-list">${this._schoolsTable(schools)}</div>`;
    this._allSchools = schools;
  },

  _schoolsTable(schools) {
    if (!schools.length) return UI.empty('No schools found');
    const stC = { active: 'green', trial: 'blue', grace: 'amber', suspended: 'red', cancelled: 'gray' };
    return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="background:var(--bg-elevated)">
        ${['School','Code','Status','Plan','Students','Staff','Expires','Actions'].map(h =>
          `<th style="padding:8px 10px;border-bottom:2px solid var(--border);text-align:left">${h}</th>`).join('')}
      </tr></thead>
      <tbody>
        ${schools.map(s => `<tr style="border-bottom:1px solid var(--border-subtle)">
          <td style="padding:8px 10px">
            <div style="font-weight:600">${s.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${s.county||''} ${s.school_type||''}</div>
          </td>
          <td style="padding:8px 10px;font-family:monospace;color:var(--accent)">${s.code}</td>
          <td style="padding:8px 10px">
            <span class="badge badge-${stC[s.subscription_status]||'gray'}">${s.subscription_status||'--'}</span>
            ${s.settings?.locked ? '<div style="font-size:10px;color:var(--red)">🔒 LOCKED</div>' : ''}
          </td>
          <td style="padding:8px 10px">${s.subscription_plan||'basic'}</td>
          <td style="padding:8px 10px;text-align:center">${s.student_count||0}</td>
          <td style="padding:8px 10px;text-align:center">${s.staff_count||0}</td>
          <td style="padding:8px 10px;font-size:11px">
            ${s.subscription_expires_at ? new Date(s.subscription_expires_at).toLocaleDateString('en-KE') : '--'}
          </td>
          <td style="padding:8px 10px">
            <div style="display:flex;gap:3px;flex-wrap:wrap">
              <button class="btn btn-sm btn-secondary" onclick="Pages.SuperAdmin.manageSchool('${s.id}','${s.name.replace(/'/g,"\\'")}','${s.subscription_status}')">Manage</button>
              ${s.subscription_status !== 'suspended' ?
                `<button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.SuperAdmin.lockSchool('${s.id}','${s.name.replace(/'/g,"\\'")}')">🔒 Lock</button>` :
                `<button class="btn btn-sm btn-success" onclick="Pages.SuperAdmin.unlockSchool('${s.id}','${s.name.replace(/'/g,"\\'")}')">🔓 Unlock</button>`}
              <button class="btn btn-sm btn-ghost" onclick="Pages.SuperAdmin.impersonate('${s.id}','${s.name.replace(/'/g,"\\'")}')">👤 Login</button>
            </div>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  },

  async _filterSchools(status, btn) {
    document.querySelectorAll('#sa-content .btn-primary, #sa-content .btn-secondary').forEach(b => {
      if (b.onclick?.toString().includes('_filterSchools')) b.className = 'btn btn-sm btn-secondary';
    });
    if (btn) btn.className = 'btn btn-sm btn-primary';
    const list = document.getElementById('schools-list');
    if (!list) return;
    if (status === 'all') { list.innerHTML = this._schoolsTable(this._allSchools); return; }
    list.innerHTML = this._schoolsTable(this._allSchools.filter(s => s.subscription_status === status));
  },

  _searchSchools(q) {
    const list = document.getElementById('schools-list');
    if (!list) return;
    const filtered = q.length < 2 ? this._allSchools :
      this._allSchools.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) || s.code.toLowerCase().includes(q.toLowerCase()));
    list.innerHTML = this._schoolsTable(filtered);
  },

  manageSchool(id, name, status) {
    UI.showInfoModal(`Manage: ${name}`, `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div class="alert alert-info" style="font-size:12px">Current status: <strong>${status}</strong></div>
        <div style="font-weight:600;margin-bottom:4px">Subscription Actions</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-success" onclick="Pages.SuperAdmin.setSubscription('${id}','activate','basic',1)">✅ Activate (1 month)</button>
          <button class="btn btn-primary" onclick="Pages.SuperAdmin.setSubscription('${id}','activate','basic',3)">✅ Activate (3 months)</button>
          <button class="btn btn-secondary" onclick="Pages.SuperAdmin.setSubscription('${id}','extend','basic',1)">➕ Extend 1 Month</button>
          <button class="btn btn-secondary" onclick="Pages.SuperAdmin.setSubscription('${id}','extend','basic',3)">➕ Extend 3 Months</button>
          <button class="btn btn-warning" onclick="Pages.SuperAdmin.setSubscription('${id}','grace')">⚠️ Set Grace Period (7d)</button>
          <button class="btn btn-ghost" onclick="Pages.SuperAdmin.setSubscription('${id}','trial')">🔵 Reset Trial (30d)</button>
        </div>
        <div style="font-weight:600;margin:8px 0 4px">Subscription Plans</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
          ${['basic','standard','premium','enterprise'].map(p =>
            `<button class="btn btn-sm btn-secondary" onclick="Pages.SuperAdmin.setSubscription('${id}','activate','${p}',1)">${p.charAt(0).toUpperCase()+p.slice(1)}</button>`
          ).join('')}
        </div>
        <div style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px">
          <div style="font-weight:600;margin-bottom:8px;color:var(--red)">Danger Zone</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-ghost" style="color:var(--red)" onclick="Pages.SuperAdmin.lockSchool('${id}','${name}');UI.closeModal('_dynamic-modal')">🔒 Lock School</button>
            <button class="btn btn-ghost" style="color:var(--red)" onclick="Pages.SuperAdmin.deleteSchool('${id}','${name}')">🗑️ Delete School</button>
          </div>
        </div>
      </div>`);
  },

  async setSubscription(id, action, plan, months) {
    const r = await API.post(`/superadmin/schools/${id}/subscription`, { action, plan, months });
    if (r.error) { Toast.error(r.error); return; }
    Toast.success(`✅ School ${action}d -- ${r.subscription_status}`);
    UI.closeModal('_dynamic-modal');
    this._renderSchools(document.getElementById('sa-content'));
  },

  async lockSchool(id, name) {
    if (!await UI.confirm(`Lock "${name}"? They will be unable to access the system until unlocked.`)) return;
    const reason = prompt('Lock reason (shown to school admin):') || 'Subscription expired';
    const r = await API.post(`/superadmin/schools/${id}/lock`, { reason });
    if (r.error) { Toast.error(r.error); return; }
    Toast.success(`🔒 ${name} locked`);
    this._renderSchools(document.getElementById('sa-content'));
  },

  async unlockSchool(id, name) {
    if (!await UI.confirm(`Unlock "${name}"? They will regain full access.`)) return;
    const r = await API.post(`/superadmin/schools/${id}/unlock`, {});
    if (r.error) { Toast.error(r.error); return; }
    Toast.success(`🔓 ${name} unlocked`);
    this._renderSchools(document.getElementById('sa-content'));
  },

  async quickExtend(id, name) {
    const r = await API.post(`/superadmin/schools/${id}/subscription`, { action: 'extend', months: 1 });
    if (r.error) { Toast.error(r.error); return; }
    Toast.success(`✅ ${name} extended by 1 month`);
    this.switchTab('overview');
  },

  async autoLock() {
    if (!await UI.confirm('Auto-lock ALL schools with expired subscriptions?')) return;
    const r = await API.post('/superadmin/auto-lock-expired', {});
    if (r.error) { Toast.error(r.error); return; }
    Toast.success(`🔒 ${r.locked} schools locked`);
    this.switchTab('overview');
  },

  async impersonate(id, name) {
    if (!await UI.confirm(`Login as admin of "${name}"? This gives you full access to their portal.`)) return;
    const r = await API.post(`/superadmin/schools/${id}/impersonate`, {});
    if (r.error) { Toast.error(r.error); return; }
    // Store impersonation token and reload
    const orig = localStorage.getItem('elimu_token');
    localStorage.setItem('elimu_token_super_backup', orig);
    localStorage.setItem('elimu_token', r.token);
    localStorage.setItem('elimu_impersonating', name);
    Toast.success(`Logged in as ${name} admin. Reload to enter their portal.`);
    setTimeout(() => window.location.reload(), 1500);
  },

  async deleteSchool(id, name) {
    if (!await UI.confirm(`⚠️ PERMANENTLY delete "${name}"? This CANNOT be undone!`)) return;
    if (!await UI.confirm(`Final confirmation: Delete "${name}" and ALL its data?`)) return;
    const r = await API.delete(`/superadmin/schools/${id}`, { confirm: 'DELETE' });
    if (r.error) { Toast.error(r.error); return; }
    Toast.success(`${name} deleted`);
    UI.closeModal('_dynamic-modal');
    this._renderSchools(document.getElementById('sa-content'));
  },

  _renderNewSchool(c) {
    c.innerHTML = `
      <div class="card" style="max-width:680px">
        <div class="card-header"><div class="card-title">➕ Add New School</div></div>
        <div class="grid-2">
          <div class="form-group"><label>School Name *</label><input type="text" id="ns-name" placeholder="e.g. Nairobi High School"></div>
          <div class="form-group"><label>School Code *</label><input type="text" id="ns-code" placeholder="e.g. NHS001" style="text-transform:uppercase" oninput="this.value=this.value.toUpperCase()"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label>Email</label><input type="email" id="ns-email" placeholder="admin@school.ac.ke"></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="ns-phone" placeholder="+254712345678"></div>
        </div>
        <div class="form-group"><label>Address</label><input type="text" id="ns-address" placeholder="Physical address"></div>
        <div class="grid-3">
          <div class="form-group"><label>County</label><select id="ns-county" style="width:100%">
            <option value="">Select…</option>
            ${['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Nyeri','Meru','Kakamega','Machakos','Garissa','Kisii','Kericho','Nyamira','Embu','Kitui','Makueni','Muranga','Kiambu','Kajiado','Narok','Bomet','Nandi','Trans Nzoia','Uasin Gishu','Elgeyo Marakwet','West Pokot','Turkana','Samburu','Laikipia','Isiolo','Marsabit','Mandera','Wajir','Tana River','Kwale','Kilifi','Taita Taveta','Lamu','Bungoma','Busia','Siaya','Homa Bay','Migori','Vihiga','Nyandarua','Kirinyaga','Tharaka Nithi'].map(c => `<option value="${c}">${c}</option>`).join('')}
          </select></div>
          <div class="form-group"><label>School Type</label><select id="ns-type" style="width:100%">
            <option value="secondary">Secondary</option>
            <option value="primary">Primary</option>
            <option value="both">Both</option>
          </select></div>
          <div class="form-group"><label>Curriculum</label><select id="ns-curriculum" style="width:100%">
            <option value="844">8-4-4</option>
            <option value="cbc">CBC</option>
            <option value="both">Both</option>
          </select></div>
        </div>
        <div style="background:var(--bg-elevated);border-radius:10px;padding:14px;margin-bottom:14px">
          <div style="font-weight:600;margin-bottom:10px">Admin Account</div>
          <div class="grid-2">
            <div class="form-group"><label>Admin Name</label><input type="text" id="ns-admin-name" placeholder="John Kamau"></div>
            <div class="form-group"><label>Admin Email *</label><input type="email" id="ns-admin-email" placeholder="principal@school.ac.ke"></div>
          </div>
          <div class="form-group"><label>Password (leave blank to auto-generate)</label><input type="password" id="ns-admin-pwd" placeholder="Leave blank to auto-generate"></div>
        </div>
        <div class="grid-2">
          <div class="form-group"><label>Subscription Plan</label><select id="ns-plan" style="width:100%">
            <option value="trial">Trial (30 days free)</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="Pages.SuperAdmin.createSchool()">Create School</button>
          <button class="btn btn-ghost" onclick="Pages.SuperAdmin.switchTab('schools')">Cancel</button>
        </div>
        <div id="create-result" style="margin-top:12px"></div>
      </div>`;
  },

  async createSchool() {
    const payload = {
      name: document.getElementById('ns-name')?.value?.trim(),
      code: document.getElementById('ns-code')?.value?.trim(),
      email: document.getElementById('ns-email')?.value,
      phone: document.getElementById('ns-phone')?.value,
      address: document.getElementById('ns-address')?.value,
      county: document.getElementById('ns-county')?.value,
      schoolType: document.getElementById('ns-type')?.value || 'secondary',
      curriculumType: document.getElementById('ns-curriculum')?.value || '844',
      adminName: document.getElementById('ns-admin-name')?.value,
      adminEmail: document.getElementById('ns-admin-email')?.value,
      adminPassword: document.getElementById('ns-admin-pwd')?.value || undefined,
      subscriptionPlan: document.getElementById('ns-plan')?.value || 'trial',
    };
    if (!payload.name || !payload.code || !payload.adminEmail) {
      Toast.error('Name, code and admin email are required'); return;
    }
    const r = await API.post('/superadmin/schools', payload);
    const el = document.getElementById('create-result');
    if (r.error) { if(el) el.innerHTML = `<div class="alert alert-danger">${r.error}</div>`; Toast.error(r.error); return; }
    if(el) el.innerHTML = `<div class="alert alert-success">
      ✅ <strong>${r.name}</strong> created!<br>
      Admin login: <strong>${payload.adminEmail}</strong><br>
      ${r.tempPassword ? `Temporary password: <strong class="font-mono">${r.tempPassword}</strong>` : ''}
    </div>`;
    Toast.success(`${r.name} created!`);
  },

  _renderBroadcast(c) {
    c.innerHTML = `
      <div class="card" style="max-width:600px">
        <div class="card-header"><div class="card-title">📢 Broadcast Message to Schools</div></div>
        <div class="form-group"><label>Target Audience</label>
          <select id="bc-target" style="width:100%">
            <option value="">All Schools</option>
            <option value="active">Active Schools Only</option>
            <option value="trial">Trial Schools Only</option>
            <option value="grace">Grace Period Schools</option>
            <option value="suspended">Suspended Schools</option>
          </select>
        </div>
        <div class="form-group"><label>Subject</label><input type="text" id="bc-subject" placeholder="e.g. Platform Update -- New Features Available"></div>
        <div class="form-group"><label>Message</label>
          <textarea id="bc-msg" rows="6" placeholder="Type your message to all school admins…"
            style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"></textarea>
        </div>
        <div class="alert alert-info" style="font-size:12px">This will send an email to all school admins with a registered email address.</div>
        <button class="btn btn-primary" onclick="Pages.SuperAdmin.sendBroadcast()">Send Broadcast</button>
      </div>`;
  },

  async sendBroadcast() {
    const r = await API.post('/superadmin/broadcast', {
      subject: document.getElementById('bc-subject')?.value,
      message: document.getElementById('bc-msg')?.value,
      targetStatus: document.getElementById('bc-target')?.value || undefined,
    });
    if (r.error) { Toast.error(r.error); return; }
    Toast.success(`✅ Broadcast queued for ${r.recipients} schools`);
  },
};

// Add install button to header if not already there
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header-actions') || document.querySelector('.topbar');
  if (header && !document.getElementById('pwa-install-btn')) {
    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.className = 'btn btn-sm btn-secondary';
    btn.style.cssText = 'display:none;align-items:center;gap:6px';
    btn.innerHTML = '📱 Install App';
    btn.onclick = () => window.installPWA?.();
    header.prepend(btn);
  }
});

console.log('✅ SuperAdmin + PWA pages loaded');
