'use strict';
// ============================================================
// Online Admissions — Parents apply online, data goes into system
// ============================================================
if (typeof Pages !== 'undefined') {
Pages.Admissions = {
  _stage: 'all',

  async load() {
    const area = document.getElementById('page-admissions');
    if (!area) return;
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">🏫 Admissions</h2>
          <p class="page-subtitle">Application pipeline & enrollment management</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Pages.Admissions.copyAdmissionsLink()">🔗 Copy Public Link</button>
          <button class="btn btn-primary" onclick="Pages.Admissions.openNewModal()">+ New Application</button>
        </div>
      </div>

      <!-- Stage filter tabs -->
      <div style="display:flex;gap:8px;margin-bottom:20px;overflow-x:auto;padding-bottom:4px">
        ${['all','applied','interview','accepted','enrolled','rejected'].map(s =>
          `<button class="btn btn-sm btn-${this._stage === s ? 'primary' : 'secondary'}"
            onclick="Pages.Admissions._stage='${s}';Pages.Admissions.renderTable()"
            id="adm-tab-${s}">${s.charAt(0).toUpperCase() + s.slice(1)}</button>`
        ).join('')}
      </div>

      <!-- Stats row -->
      <div id="adm-stats" class="stats-grid" style="margin-bottom:20px">
        <div class="skeleton-card"><div class="skeleton-line"></div></div>
        <div class="skeleton-card"><div class="skeleton-line"></div></div>
        <div class="skeleton-card"><div class="skeleton-line"></div></div>
        <div class="skeleton-card"><div class="skeleton-line"></div></div>
      </div>

      <!-- Table -->
      <div class="card"><div id="adm-table"></div></div>
    `;
    this.renderStats();
    this.renderTable();
  },

  async renderStats() {
    const data = await API.get('/admissions').catch(() => ({ applications: [] }));
    const apps = Array.isArray(data) ? data : (data.applications || data.data || []);
    const counts = { applied: 0, interview: 0, accepted: 0, enrolled: 0, rejected: 0 };
    apps.forEach(a => { if (counts[a.stage] !== undefined) counts[a.stage]++; });
    const statsEl = document.getElementById('adm-stats');
    if (!statsEl) return;
    statsEl.innerHTML = `
      <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
        <div class="stat-icon">📋</div><div class="stat-body"><div class="stat-value">${apps.length}</div><div class="stat-label">Total Applications</div></div>
      </div>
      <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)">
        <div class="stat-icon">📅</div><div class="stat-body"><div class="stat-value">${counts.interview}</div><div class="stat-label">Awaiting Interview</div></div>
      </div>
      <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)">
        <div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">${counts.accepted}</div><div class="stat-label">Accepted</div></div>
      </div>
      <div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg)">
        <div class="stat-icon">🎓</div><div class="stat-body"><div class="stat-value">${counts.enrolled}</div><div class="stat-label">Enrolled</div></div>
      </div>
    `;
  },

  async renderTable() {
    // Update tab active state
    ['all','applied','interview','accepted','enrolled','rejected'].forEach(s => {
      const t = document.getElementById('adm-tab-' + s);
      if (t) { t.className = 'btn btn-sm btn-' + (this._stage === s ? 'primary' : 'secondary'); }
    });

    const tbl = document.getElementById('adm-table');
    if (!tbl) return;
    tbl.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;

    const data = await API.get('/admissions' + (this._stage !== 'all' ? '?stage=' + this._stage : '')).catch(() => []);
    const apps = Array.isArray(data) ? data : (data.applications || data.data || []);

    if (!apps.length) {
      tbl.innerHTML = `<div class="empty-state" style="padding:40px">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No ${this._stage === 'all' ? '' : this._stage + ' '}applications yet</div>
        <div class="empty-desc">Applications submitted via the public admissions form will appear here</div>
        <button class="btn btn-primary" onclick="Pages.Admissions.openNewModal()">Add Application Manually</button>
      </div>`;
      return;
    }

    tbl.innerHTML = `
      <div class="table-header" style="padding:16px 20px;border-bottom:1px solid var(--border)">
        <strong>${apps.length} application${apps.length !== 1 ? 's' : ''}</strong>
        <button class="btn btn-sm btn-secondary" onclick="Pages.Admissions.exportCSV()">⬇️ Export CSV</button>
      </div>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Applicant</th><th>Parent/Guardian</th><th>Phone</th><th>Form</th><th>KCPE</th><th>Date</th><th>Stage</th><th>Actions</th></tr></thead>
          <tbody>
            ${apps.map(a => `
              <tr>
                <td><strong>${a.student_name || a.name}</strong></td>
                <td>${a.parent_name || '—'}</td>
                <td>${a.phone || '—'}</td>
                <td>Form ${a.form_level || a.form || 1}</td>
                <td>${a.kcpe_score || a.kcpe || '—'}</td>
                <td style="color:var(--text-muted);font-size:12px">${a.created_at ? new Date(a.created_at).toLocaleDateString('en-KE') : '—'}</td>
                <td>
                  <select class="form-control" style="padding:4px 8px;font-size:12px;min-width:110px"
                    onchange="Pages.Admissions.updateStage('${a.id}', this.value)">
                    ${['applied','interview','accepted','enrolled','rejected'].map(s =>
                      `<option value="${s}" ${(a.stage||'applied')===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
                    ).join('')}
                  </select>
                </td>
                <td>
                  <button class="btn btn-sm btn-ghost" onclick="Pages.Admissions.viewApplication('${a.id}')">View</button>
                  ${(a.stage === 'accepted') ? `<button class="btn btn-sm btn-primary" onclick="Pages.Admissions.enrollStudent('${a.id}','${(a.student_name||a.name||'').replace(/'/g,"\\'")}')">Enroll</button>` : ''}
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async updateStage(id, stage) {
    const res = await API.put('/admissions/' + id, { stage });
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Stage updated to ' + stage);
  },

  async enrollStudent(id, name) {
    if (!confirm(`Enroll "${name}" as a student? This will create their student record.`)) return;
    const res = await API.post('/admissions/' + id + '/enroll', {});
    if (res.error) { Toast.error('Enrollment failed: ' + res.error); return; }
    Toast.success(name + ' enrolled successfully! 🎉');
    this.renderTable();
    this.renderStats();
  },

  openNewModal() {
    UI.openModal({
      title: '+ New Application',
      body: `
        <div style="display:grid;gap:14px">
          <div class="form-group"><label class="form-label">Student Name *</label><input class="form-control" id="adm-name" placeholder="Full name"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">Form Level *</label>
              <select class="form-control" id="adm-form">
                <option value="1">Form 1</option><option value="2">Form 2</option>
                <option value="3">Form 3</option><option value="4">Form 4</option>
              </select>
            </div>
            <div class="form-group"><label class="form-label">KCPE Score</label><input class="form-control" id="adm-kcpe" type="number" placeholder="e.g. 380"></div>
          </div>
          <div class="form-group"><label class="form-label">Parent/Guardian Name *</label><input class="form-control" id="adm-parent" placeholder="Parent full name"></div>
          <div class="form-group"><label class="form-label">Parent Phone *</label><input class="form-control" id="adm-phone" placeholder="+254..."></div>
          <div class="form-group"><label class="form-label">Parent Email</label><input class="form-control" id="adm-email" type="email" placeholder="parent@email.com"></div>
        </div>
      `,
      actions: [
        { label: 'Cancel', class: 'btn-secondary', onclick: () => UI.closeModal('_dynamic-modal') },
        { label: 'Submit Application', class: 'btn-primary', onclick: () => Pages.Admissions.submitNewApplication() },
      ]
    });
  },

  async submitNewApplication() {
    const name    = document.getElementById('adm-name')?.value?.trim();
    const form    = document.getElementById('adm-form')?.value;
    const kcpe    = document.getElementById('adm-kcpe')?.value;
    const parent  = document.getElementById('adm-parent')?.value?.trim();
    const phone   = document.getElementById('adm-phone')?.value?.trim();
    const email   = document.getElementById('adm-email')?.value?.trim();
    if (!name || !parent || !phone) { Toast.error('Name, parent name and phone are required'); return; }
    const res = await API.post('/admissions', {
      student_name: name, form_level: parseInt(form), kcpe_score: kcpe ? parseInt(kcpe) : null,
      parent_name: parent, phone, email, stage: 'applied'
    });
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Application submitted!');
    UI.closeModal('_dynamic-modal');
    this.renderTable();
    this.renderStats();
  },

  copyAdmissionsLink() {
    const schoolCode = (window.AppState?.school?.code || '').toLowerCase();
    const link = window.location.origin + '/apply' + (schoolCode ? '?school=' + schoolCode : '');
    navigator.clipboard.writeText(link).then(() => Toast.success('Public admissions link copied! Share with parents.'));
  },

  exportCSV() {
    API.get('/admissions').then(data => {
      const apps = Array.isArray(data) ? data : (data.applications || data.data || []);
      if (!apps.length) { Toast.info('No applications to export'); return; }
      const rows = [['Name','Parent','Phone','Form','KCPE','Stage','Date']].concat(
        apps.map(a => [a.student_name||a.name,a.parent_name,a.phone,a.form_level||a.form,a.kcpe_score||a.kcpe,a.stage,a.created_at?new Date(a.created_at).toLocaleDateString():''])
      );
      const csv = rows.map(r => r.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a'); a.href = url; a.download = 'admissions.csv'; a.click();
      URL.revokeObjectURL(url);
    });
  },
};
Router.define?.('admissions', { title: 'Admissions', onEnter: () => Pages.Admissions.load() });
}
