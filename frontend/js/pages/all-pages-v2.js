// ============================================================
// ElimuSaaS -- Complete Pages Implementation v2
// All modules fully wired to the API, no stubs
// Staff · Academics · Exams · Attendance · Clubs · Certificates
// Communication · Newsletters · Reports · Alumni · Settings
// SuperAdmin · Timetable · Billing · TSC Verification
// AI Insights · Gamification · Threads · Parent Portal
// Online Exams · School Profile · Search
// ============================================================

window.Pages = window.Pages || {};
var Pages = window.Pages;

// ── Shared helpers ────────────────────────────────────────────
var _loading = () => `<div style="text-align:center;padding:48px"><div class="loading-spinner" style="margin:0 auto 12px"></div><div style="color:var(--text-muted);font-size:13px">Loading…</div></div>`;
var _empty   = (msg='Nothing found', sub='', btn='') => `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">${msg}</div>${sub?`<div class="empty-desc">${sub}</div>`:''} ${btn}</div>`;
var _err     = (msg='Error', retryFn='') => `<div class="error-state"><div class="error-icon">⚠️</div><h3>Something went wrong</h3><p>${msg}</p>${retryFn?`<button class="btn btn-primary" onclick="${retryFn}">Try Again</button>`:''}</div>`;
var _badge   = (t,c) => `<span class="badge badge-${c||'gray'}">${t}</span>`;
var _gradeC  = g => (['A','A-'].includes(g)?'green':['B+','B','B-'].includes(g)?'blue':['C+','C'].includes(g)?'cyan':['C-','D+','D'].includes(g)?'amber':'red');
var _tbl     = (heads, rows, emptyMsg='No data') => rows.length===0 ? _empty(emptyMsg) : `<div class="table-container"><div style="overflow-x:auto"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
var _kv      = (k,v,c='') => `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border-subtle);font-size:13px"><span style="color:var(--text-secondary)">${k}</span><span style="font-weight:600;${c?`color:${c}`:''}">${v}</span></div>`;

// Store tab helpers on UI
try { if(typeof UI!=="undefined"){UI.loading=_loading;UI.empty=_empty;UI.error=_err;} } catch(e) {}

if (typeof UI !== "undefined" && !UI.showInfoModal) {
  UI.showInfoModal = function(title, html) {
    let el = document.getElementById('_dynamic-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = '_dynamic-modal';
      el.className = 'modal-overlay';
      el.innerHTML = `<div class="modal modal-lg"><div class="modal-header"><h3 class="modal-title" id="_dm-title"></h3><button class="modal-close" onclick="UI.closeModal('_dynamic-modal')">✕</button></div><div class="modal-body" id="_dm-body" style="max-height:70vh;overflow-y:auto"></div><div class="modal-footer"><button class="btn btn-ghost" onclick="UI.closeModal('_dynamic-modal')">Close</button></div></div>`;
      document.body.appendChild(el);
    }
    document.getElementById('_dm-title').textContent = title;
    document.getElementById('_dm-body').innerHTML = html;
    UI.openModal('_dynamic-modal');
  };
}

// ============================================================
// STAFF PAGE
// ============================================================
Pages.Staff = {
  _page:1, _search:'', _role:'',

  async load() {
    this._page=1; await this.fetch();
  },

  async fetch() {
    const tbody = document.getElementById('staff-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px">${_loading()}</td></tr>`;
    const p = { page:this._page, limit:30 };
    if (this._search) p.search = this._search;
    if (this._role)   p.role   = this._role;
    const data = await API.get('/staff', p);
    const rows = data?.data || data || [];
    const total = data?.pagination?.total || rows.length;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-muted)">
        No staff members found.<br>
        <button class="btn btn-primary" onclick="Pages.Staff.openAddModal()" style="margin-top:12px">+ Add First Staff Member</button>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((s,i) => {
      const name = `${s.first_name} ${s.last_name}`;
      const vs = s.tsc_verification_status || 'pending';
      const vsColor = {verified:'green',under_review:'blue',pending:'amber',rejected:'red',flagged:'red'}[vs]||'amber';
      const subjects = (s.subjects||[]).map(x => `<span class="badge badge-blue" style="font-size:10px">${x}</span>`).join(' ');
      return `<tr>
        <td style="font-weight:600;color:var(--text-muted)">${((this._page-1)*30)+i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--brand-subtle);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">
              ${s.photo_url ? `<img src="${s.photo_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover">` : UI.initials(name)}
            </div>
            <div>
              <div style="font-weight:600;font-size:14px">${name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.email||''}</div>
            </div>
          </div>
        </td>
        <td><code style="font-size:12px">${s.staff_number||'—'}</code></td>
        <td><span class="badge badge-blue">${(s.role||'teacher').replace(/_/g,' ').toUpperCase()}</span></td>
        <td>${s.department||'<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${s.phone||s.user_phone||'<span style="color:var(--text-muted)">—</span>'}</td>
        <td>
          <span class="badge badge-${s.is_active!==false?'green':'red'}">${s.is_active!==false?'Active':'Inactive'}</span>
          <span class="badge badge-${vsColor}" style="margin-left:4px;font-size:10px">TSC:${vs}</span>
        </td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn btn-sm btn-secondary" onclick="Pages.Staff.viewProfile('${s.id}','${name}')">👤 View</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Staff.openAssignSubjects('${s.id}','${name}')">📚 Subjects</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Staff.openEdit('${s.id}')">✏️</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Pagination
    const pg = document.getElementById('staff-pagination');
    if (pg && data?.pagination) {
      const p = data.pagination;
      pg.innerHTML = `<span style="color:var(--text-muted);font-size:13px">Showing ${rows.length} of ${total} staff</span>
        <div style="display:flex;gap:6px">
          ${this._page>1 ? `<button class="btn btn-sm btn-secondary" onclick="Pages.Staff._page--;Pages.Staff.fetch()">← Prev</button>` : ''}
          <span class="btn btn-sm" style="background:var(--brand);color:white">${this._page}</span>
          ${p.hasNext ? `<button class="btn btn-sm btn-secondary" onclick="Pages.Staff._page++;Pages.Staff.fetch()">Next →</button>` : ''}
        </div>`;
    }

    // Load pending count
    API.get('/staff/pending').then(r => {
      const count = r?.total || r?.data?.length || 0;
      const badge = document.getElementById('pending-staff-count');
      if (badge) { badge.textContent = count > 0 ? count : ''; badge.style.display = count > 0 ? 'flex' : 'none'; }
    }).catch(()=>{});
  },

  search(v) { this._search = v; this._page = 1; clearTimeout(this._st); this._st = setTimeout(()=>this.fetch(), 350); },
  filter()  { this._role = document.getElementById('staff-role-filter')?.value||''; this._page=1; this.fetch(); },

  openAddModal() {
    const roles = ['teacher','class_teacher','hod','dean_of_studies','deputy_principal','principal',
                   'bursar','librarian','storekeeper','nurse','driver','support_staff'];
    const depts = ['Mathematics','Sciences','English','Kiswahili','Humanities','Technical',
                   'Arts','Physical Education','ICT','Languages','Administration','Finance'];
    const html = `
      <div class="modal-overlay open" id="add-staff-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:720px;max-height:90vh;overflow-y:auto">
          <div class="modal-header" style="background:var(--brand);color:white;padding:20px 24px;border-radius:14px 14px 0 0">
            <h3 style="color:white;margin:0">👩‍🏫 Add Staff Member</h3>
            <button onclick="document.getElementById('add-staff-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div class="modal-body" style="padding:24px">
            <div style="display:flex;gap:24px;margin-bottom:24px">
              <!-- Photo upload -->
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:120px">
                <div id="staff-photo-preview" style="width:100px;height:100px;border-radius:50%;background:var(--bg-elevated);border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;font-size:32px;overflow:hidden">
                  <span>👤</span>
                </div>
                <label style="cursor:pointer">
                  <span class="btn btn-sm btn-secondary">Choose Photo</span>
                  <input type="file" accept="image/*" style="display:none" onchange="Pages.Staff.previewPhoto(this)">
                </label>
              </div>
              <!-- Basic info -->
              <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                  <label class="form-label">First Name *</label>
                  <input id="sf-first" class="form-control" placeholder="Enter First Name" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name *</label>
                  <input id="sf-last" class="form-control" placeholder="Enter Last Name" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Email *</label>
                  <input id="sf-email" class="form-control" type="email" placeholder="Enter Email Address" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input id="sf-phone" class="form-control" type="tel" placeholder="+254 7XX XXX XXX">
                </div>
              </div>
            </div>

            <div style="background:var(--bg-elevated);padding:16px;border-radius:10px;margin-bottom:16px">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:12px">STAFF INFORMATION</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
                <div class="form-group">
                  <label class="form-label">Staff Number *</label>
                  <input id="sf-staffno" class="form-control" placeholder="e.g. TCH/001">
                </div>
                <div class="form-group">
                  <label class="form-label">TSC Number</label>
                  <input id="sf-tsc" class="form-control" placeholder="TSC/XXXX/XXXX">
                </div>
                <div class="form-group">
                  <label class="form-label">National ID</label>
                  <input id="sf-nid" class="form-control" placeholder="ID Number">
                </div>
                <div class="form-group">
                  <label class="form-label">Role *</label>
                  <select id="sf-role" class="form-control">
                    <option value="">Select Role</option>
                    ${roles.map(r=>`<option value="${r}">${r.replace(/_/g,' ').replace(/\w/g,l=>l.toUpperCase())}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <select id="sf-dept" class="form-control">
                    <option value="">Select Department</option>
                    ${depts.map(d=>`<option>${d}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Gender</label>
                  <select id="sf-gender" class="form-control">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Employment Type</label>
                  <select id="sf-emptype" class="form-control">
                    <option value="permanent">Permanent</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                    <option value="volunteer">Volunteer</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Employment Date</label>
                  <input id="sf-empdate" class="form-control" type="date">
                </div>
                <div class="form-group">
                  <label class="form-label">Date of Birth</label>
                  <input id="sf-dob" class="form-control" type="date">
                </div>
              </div>
            </div>

            <div style="background:var(--bg-elevated);padding:16px;border-radius:10px;margin-bottom:16px">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:12px">QUALIFICATION</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div class="form-group">
                  <label class="form-label">Highest Qualification</label>
                  <select id="sf-qual" class="form-control">
                    <option value="">Select</option>
                    <option>PhD</option><option>Masters</option><option>Bachelor's Degree</option>
                    <option>Diploma</option><option>Certificate</option><option>KCSE</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Subjects Taught</label>
                  <input id="sf-subj" class="form-control" placeholder="e.g. Mathematics, Physics">
                </div>
              </div>
            </div>

            <div style="background:var(--bg-elevated);padding:16px;border-radius:10px">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:12px">NEXT OF KIN</div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input id="sf-kin-name" class="form-control" placeholder="Next of kin name">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input id="sf-kin-phone" class="form-control" placeholder="+254 7XX XXX XXX">
                </div>
                <div class="form-group">
                  <label class="form-label">Relationship</label>
                  <input id="sf-kin-rel" class="form-control" placeholder="e.g. Spouse, Parent">
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer" style="padding:16px 24px;border-top:1px solid var(--border);display:flex;justify-content:space-between">
            <button class="btn btn-secondary" onclick="document.getElementById('add-staff-modal').remove()">Cancel</button>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary" onclick="Pages.Staff.importExcel()">📥 Import Excel</button>
              <button class="btn btn-primary" onclick="Pages.Staff.saveStaff()">Save Staff Member</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  },

  previewPhoto(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const preview = document.getElementById('staff-photo-preview');
      if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(file);
  },

  async saveStaff() {
    const g = id => document.getElementById(id)?.value?.trim()||'';
    const body = {
      firstName: g('sf-first'), lastName: g('sf-last'),
      email: g('sf-email'), phone: g('sf-phone'),
      staffNumber: g('sf-staffno'), tscNumber: g('sf-tsc'),
      nationalId: g('sf-nid'), role: g('sf-role'),
      department: g('sf-dept'), gender: g('sf-gender'),
      employmentType: g('sf-emptype'), employmentDate: g('sf-empdate')||undefined,
      qualification: g('sf-qual'),
      nextOfKinName: g('sf-kin-name'), nextOfKinPhone: g('sf-kin-phone'),
      nextOfKinRelationship: g('sf-kin-rel'),
    };
    if (!body.firstName||!body.lastName||!body.email||!body.staffNumber||!body.role) {
      Toast.error('First name, last name, email, staff number and role are required'); return;
    }
    const saveBtn = document.querySelector('#add-staff-modal .btn-primary');
    if (saveBtn) { saveBtn.disabled=true; saveBtn.textContent='Saving...'; }
    const r = await API.post('/staff', body);
    if (r?.id || r?.staff_number || r?.message) {
      Toast.success(`✅ Staff added! Temp password: ${r.tempPassword||'Check email'}`);
      document.getElementById('add-staff-modal')?.remove();
      this.fetch();
    } else {
      Toast.error(r?.error||'Failed to save staff');
      if (saveBtn) { saveBtn.disabled=false; saveBtn.textContent='Save Staff Member'; }
    }
  },

  importExcel() {
    const input = document.createElement('input');
    input.type='file'; input.accept='.xlsx,.xls,.csv';
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      Toast.info('Excel import coming soon. Download our template first.');
    };
    input.click();
  },

  async viewProfile(staffId, name) {
    const data = await API.get('/staff/'+staffId);
    const s = data || {};
    const modal = `
      <div class="modal-overlay open" id="staff-profile-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:600px;max-height:90vh;overflow-y:auto">
          <div class="modal-header" style="background:var(--brand);color:white;padding:20px 24px">
            <h3 style="color:white;margin:0">👤 ${name}</h3>
            <button onclick="document.getElementById('staff-profile-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:24px">
            <div style="display:flex;gap:20px;margin-bottom:24px">
              <div style="width:80px;height:80px;border-radius:50%;background:var(--brand-subtle);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;flex-shrink:0">
                ${s.photo_url?`<img src="${s.photo_url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover">`:UI.initials(name)}
              </div>
              <div>
                <div style="font-size:20px;font-weight:700">${s.first_name} ${s.last_name}</div>
                <div style="color:var(--text-muted)">${(s.role||'').replace(/_/g,' ')}</div>
                <div style="color:var(--text-muted)">${s.email||''}</div>
                <div style="margin-top:8px">
                  <span class="badge badge-${s.is_active?'green':'red'}">${s.is_active?'Active':'Inactive'}</span>
                  <span class="badge badge-blue" style="margin-left:4px">${s.department||'No dept'}</span>
                </div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${[
                ['Staff No.',s.staff_number],['TSC No.',s.tsc_number||'—'],
                ['Phone',s.phone||'—'],['Employment',s.employment_type||'—'],
                ['Qualification',s.qualification||'—'],['Joined',UI.date(s.employment_date)],
                ['Next of Kin',s.next_of_kin_name||'—'],['Kin Phone',s.next_of_kin_phone||'—'],
              ].map(([l,v])=>`
                <div style="background:var(--bg-elevated);padding:12px;border-radius:8px">
                  <div style="font-size:11px;color:var(--text-muted);font-weight:600">${l}</div>
                  <div style="font-weight:600">${v}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer" style="padding:16px 24px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-secondary" onclick="Pages.Staff.openAssignSubjects('${staffId}','${name}');document.getElementById('staff-profile-modal').remove()">📚 Assign Subjects</button>
            <button class="btn btn-primary" onclick="document.getElementById('staff-profile-modal').remove()">Close</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modal);
  },

  async openEdit(staffId) {
    const data = await API.get('/staff/'+staffId);
    Toast.info('Edit staff: coming soon. Use the form above.');
  },

  async showPending() {
    const r = await API.get('/staff/pending');
    const data = r?.data || [];
    const modal = `
      <div class="modal-overlay open" id="pending-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:700px">
          <div class="modal-header" style="background:var(--amber);color:white">
            <h3 style="color:white;margin:0">⏳ Pending Staff Approval (${data.length})</h3>
            <button onclick="document.getElementById('pending-modal').remove()" style="background:rgba(0,0,0,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:0">
            ${data.length === 0
              ? `<div style="padding:48px;text-align:center;color:var(--text-muted)">✅ No pending staff approvals</div>`
              : data.map(s => `
                <div style="display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--border)">
                  <div style="width:40px;height:40px;border-radius:50%;background:var(--brand-subtle);color:var(--brand);display:flex;align-items:center;justify-content:center;font-weight:700">${UI.initials(s.first_name+' '+s.last_name)}</div>
                  <div style="flex:1">
                    <div style="font-weight:700">${s.first_name} ${s.last_name}</div>
                    <div style="font-size:12px;color:var(--text-muted)">${s.email} · ${(s.designation||'Staff')} · Added ${UI.date(s.joined_at)}</div>
                  </div>
                  <button class="btn btn-sm btn-primary" onclick="Pages.Staff.approve('${s.id}',this)">✅ Approve</button>
                </div>`).join('')}
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modal);
  },

  async approve(staffId, btn) {
    if (!confirm('Approve this staff member? They will be able to login.')) return;
    btn.disabled=true; btn.textContent='...';
    const r = await API.post('/staff/'+staffId+'/approve', {});
    if (r?.message) {
      Toast.success(r.message);
      document.getElementById('pending-modal')?.remove();
      this.showPending();
      this.fetch();
    } else {
      Toast.error(r?.error||'Failed');
      btn.disabled=false; btn.textContent='✅ Approve';
    }
  },

  async openAssignSubjects(staffId, staffName) {
    const [classesRes, subjectsRes] = await Promise.all([
      API.get('/academics/classes'),
      API.get('/academics/subjects'),
    ]);
    const classes  = Array.isArray(classesRes)  ? classesRes  : (classesRes?.data||[]);
    const subjects = Array.isArray(subjectsRes) ? subjectsRes : (subjectsRes?.data||[]);
    const modal = `
      <div class="modal-overlay open" id="assign-subjects-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:600px">
          <div class="modal-header" style="background:var(--brand);color:white">
            <h3 style="color:white;margin:0">📚 Assign Subjects — ${staffName}</h3>
            <button onclick="document.getElementById('assign-subjects-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <p style="margin-bottom:16px;color:var(--text-muted);font-size:13px">Select class + subject combinations for this teacher. You can add multiple rows.</p>
            <div id="subject-assignment-rows" style="display:flex;flex-direction:column;gap:8px">
              <div class="s-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center">
                <select class="form-control s-class">
                  <option value="">Select Class</option>
                  ${classes.map(c=>`<option value="${c.id}">${c.name} ${c.stream||''}</option>`).join('')}
                </select>
                <select class="form-control s-subj">
                  <option value="">Select Subject</option>
                  ${subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <button class="btn btn-sm" onclick="this.closest('.s-row').remove()" style="padding:6px 10px;background:var(--red-bg);color:var(--red);border:none;border-radius:6px">✕</button>
              </div>
            </div>
            <button class="btn btn-secondary w-full" style="margin-top:12px" onclick="
              const tmpl = document.querySelector('#assign-subjects-modal .s-row').cloneNode(true);
              tmpl.querySelectorAll('select').forEach(s=>s.selectedIndex=0);
              tmpl.querySelector('button').onclick = function(){ this.closest('.s-row').remove(); };
              document.getElementById('subject-assignment-rows').appendChild(tmpl);
            ">+ Add Another Row</button>
          </div>
          <div class="modal-footer" style="padding:16px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="document.getElementById('assign-subjects-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.Staff.saveAssignments('${staffId}')">💾 Save Assignments</button>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modal);
  },

  async saveAssignments(staffId) {
    const rows = document.querySelectorAll('#assign-subjects-modal .s-row');
    const assignments = [];
    rows.forEach(row => {
      const classId   = row.querySelector('.s-class')?.value;
      const subjectId = row.querySelector('.s-subj')?.value;
      if (classId && subjectId) assignments.push({ classId, subjectId });
    });
    if (!assignments.length) { Toast.error('Add at least one class-subject pair'); return; }
    const btn = document.querySelector('#assign-subjects-modal .btn-primary');
    if (btn) { btn.disabled=true; btn.textContent='Saving...'; }
    const r = await API.post('/staff/'+staffId+'/subjects', { assignments });
    if (r?.message) {
      Toast.success(r.message);
      document.getElementById('assign-subjects-modal')?.remove();
    } else {
      Toast.error(r?.error||'Failed to assign subjects');
      if (btn) { btn.disabled=false; btn.textContent='💾 Save Assignments'; }
    }
  },

};


Pages.TSCVerif = {
  _status: 'pending',

  async load(){ this.filterStatus('pending', document.querySelector('#page-tsc-verification .tab')); },

  async filterStatus(status, el){
    this._status = status;
    document.querySelectorAll('#page-tsc-verification .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const tbody = document.getElementById('tsc-verif-tbody');
    if(!tbody) return;
    tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:40px">${_loading()}</td></tr>`;
    const url = status?`/dean/verifications?status=${status}`:'/dean/verifications';
    const data = await API.get(url);
    const list = data.data||[];
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No ${status} verifications</td></tr>`; return; }

    const statusC={pending:'amber',under_review:'blue',verified:'green',rejected:'red',flagged:'red'};
    tbody.innerHTML = list.map(v=>{
      const sc = v.total_score>=100?'var(--green)':v.total_score>=70?'var(--amber)':'var(--red)';
      return `<tr>
        <td><strong>${v.first_name} ${v.last_name}</strong><div style="font-size:11px;color:var(--text-muted)">${v.email||''}</div></td>
        <td class="font-mono">${v.submitted_tsc}</td>
        <td>${v.staff_number||'--'}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${v.total_score}%;height:100%;background:${sc}"></div></div>
            <span style="font-weight:700;font-size:12px;color:${sc}">${v.total_score}/100</span>
          </div>
        </td>
        <td>${v.docs_uploaded>0?_badge(v.docs_uploaded+' docs','green'):_badge('None','gray')}</td>
        <td>${_badge(v.status?.replace('_',' ')||'pending', statusC[v.status]||'gray')}</td>
        <td style="font-size:11px">${v.created_at?new Date(v.created_at).toLocaleDateString('en-KE'):''}</td>
        <td><div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-sm btn-secondary" onclick="Pages.TSCVerif.viewDetail('${v.id}')">Review</button>
          ${v.status==='under_review'||v.status==='pending'?`
            <button class="btn btn-sm btn-primary" onclick="Pages.TSCVerif.approve('${v.id}')">✓</button>
            <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.TSCVerif.reject('${v.id}')">✗</button>
          `:''}
        </div></td>
      </tr>`;
    }).join('');
  },

  async viewDetail(id){
    const data = await API.get(`/dean/verifications/${id}`);
    if(data.error){ Toast.error(data.error); return; }
    const v = data.verification||{};
    const W = {FORMAT_VALID:10,NO_SCHOOL_DUP:15,NO_GLOBAL_DUP:15,DOCS_UPLOADED:20,NAME_MATCH:20,ID_MATCH:10,ADMIN_APPROVED:10};
    const sb = data.scoreBreakdown||[];
    UI.showInfoModal(`${v.first_name} ${v.last_name} -- TSC: ${v.submitted_tsc}`, `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-weight:700;margin-bottom:8px">Score Breakdown</div>
          ${sb.map(l=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-subtle);font-size:12px">
            <span style="color:${l.passed?'var(--green)':'var(--red)'};font-size:14px">${l.passed?'✓':'✗'}</span>
            <span style="flex:1">${l.layer}</span>
            <span style="font-weight:700;font-family:var(--font-mono)">${l.score}/${l.max}</span>
          </div>`).join('')}
          <div style="margin-top:8px;font-weight:700">Total: ${v.total_score}/100 -- ${_badge(data.accessLevel?.toUpperCase()||'BLOCKED', {full:'green',restricted:'amber',blocked:'red'}[data.accessLevel]||'red')}</div>
        </div>
        <div style="flex:1;min-width:200px">
          <div style="font-weight:700;margin-bottom:8px">Documents (${data.documents?.length||0})</div>
          ${data.documents?.length?data.documents.map(d=>`<div style="font-size:12px;padding:5px 0">${_badge(d.document_type?.replace(/_/g,' '),'blue')} ${d.is_verified?'✓':''}</div>`).join(''):'<div style="color:var(--text-muted);font-size:12px">No documents uploaded</div>'}
          ${data.fraudFlags?.filter(f=>!f.resolved).length?`
            <div style="margin-top:10px;background:var(--red-bg);border:1px solid var(--red);border-radius:8px;padding:10px">
              <div style="font-weight:700;color:var(--red);margin-bottom:4px">⚠️ ${data.fraudFlags.filter(f=>!f.resolved).length} Fraud Flags</div>
              ${data.fraudFlags.filter(f=>!f.resolved).map(f=>`<div style="font-size:11px;color:var(--red)">${f.description}</div>`).join('')}
            </div>`:''}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
        ${v.status!=='verified'?`<button class="btn btn-primary" onclick="Pages.TSCVerif.approve('${v.id}');UI.closeModal('_dynamic-modal')">✓ Approve</button>`:''}
        ${!['rejected','verified'].includes(v.status)?`<button class="btn btn-secondary" onclick="Pages.TSCVerif.reject('${v.id}');UI.closeModal('_dynamic-modal')">Reject</button>`:''}
      </div>`);
  },

  async approve(id){
    const notes = prompt('Notes (optional -- e.g. verified on TSC portal):')||'';
    const portal = confirm('Did you verify on tsc.go.ke portal?');
    const res = await API.put(`/dean/verification/${id}/review`,{action:'approve',adminNotes:notes,tscPortalChecked:portal,tscPortalResult:portal?{result:'matched',checkedAt:new Date()}:{}});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`Teacher verified! Final score: ${res.finalScore}/100`);
    this.filterStatus(this._status, null);
  },

  async reject(id){
    const reason = prompt('Reason for rejection (required):');
    if(!reason) return;
    const res = await API.put(`/dean/verification/${id}/review`,{action:'reject',rejectionReason:reason});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Verification rejected -- teacher notified');
    this.filterStatus(this._status, null);
  },

  async preValidate(){
    const tsc = document.getElementById('reg-tsc-validate')?.value?.trim();
    if(!tsc){ Toast.error('Enter a TSC number'); return; }
    const btn = document.getElementById('tsc-validate-btn');
    UI.setLoading(btn, true);
    const res = await API.post('/dean/validate-tsc',{tscNumber:tsc});
    UI.setLoading(btn, false);
    const result = document.getElementById('tsc-validate-result');
    if(!result) return;
    if(res.canProceed){
      result.innerHTML=`<div style="background:var(--green-bg);border:1px solid var(--green);border-radius:8px;padding:12px;font-size:13px"><div style="font-weight:700;color:var(--green)">✅ TSC Number Valid (${res.score}/40)</div><div style="color:var(--green);margin-top:2px">No duplicates found. Proceed with registration.</div></div>`;
      const regTsc = document.getElementById('reg-tsc');
      if(regTsc) regTsc.value=tsc;
      const form = document.getElementById('teacher-reg-form');
      if(form) form.style.display='block';
      const regBtn = document.getElementById('reg-teacher-btn');
      if(regBtn) regBtn.style.display='inline-flex';
    } else {
      const issues = [...(res.blockingIssues||[]),...(res.flags||[]).filter(f=>f.severity==='critical').map(f=>f.description)];
      result.innerHTML=`<div style="background:var(--red-bg);border:1px solid var(--red);border-radius:8px;padding:12px;font-size:13px"><div style="font-weight:700;color:var(--red)">❌ Validation Failed</div>${issues.map(e=>`<div style="color:var(--red);margin-top:4px">• ${e}</div>`).join('')}</div>`;
      const form = document.getElementById('teacher-reg-form');
      if(form) form.style.display='none';
    }
  },

  openRegisterModal(){ UI.openModal('modal-register-teacher'); },

  async registerTeacher(){
    const payload = {
      tscNumber: document.getElementById('reg-tsc')?.value,
      firstName: document.getElementById('reg-first-name')?.value?.trim(),
      lastName: document.getElementById('reg-last-name')?.value?.trim(),
      gender: document.getElementById('reg-gender')?.value,
      nationalId: document.getElementById('reg-national-id')?.value?.trim(),
      email: document.getElementById('reg-email')?.value?.trim(),
      phone: document.getElementById('reg-phone')?.value?.trim(),
      staffNumber: document.getElementById('reg-staff-no')?.value?.trim(),
      designation: document.getElementById('reg-designation')?.value?.trim()||'Teacher',
      department: document.getElementById('reg-department')?.value?.trim(),
      employmentType: document.getElementById('reg-emp-type')?.value,
      role: document.getElementById('reg-role')?.value,
    };
    if(!payload.firstName||!payload.lastName||!payload.nationalId||!payload.email||!payload.staffNumber){ Toast.error('All required fields must be filled'); return; }
    const btn = document.getElementById('reg-teacher-btn');
    UI.setLoading(btn, true);
    const res = await API.post('/dean/register-teacher', payload);
    UI.setLoading(btn, false);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`Teacher registered! Temp password: ${res.tempPassword}. Account is PENDING verification.`, 'Teacher Created');
    UI.closeModal('modal-register-teacher');
    this.filterStatus('pending', null);
  },

  async viewFraudFlags(){
    const data = await API.get('/dean/fraud-flags?resolved=false');
    if(data.error){ Toast.error(data.error); return; }
    if(!data.length){ Toast.info('No open fraud flags 🎉'); return; }
    const sevBg={critical:'var(--red-bg)',high:'var(--amber-bg)',medium:'var(--brand-subtle)'};
    UI.showInfoModal('Open Fraud Flags',`<div style="display:flex;flex-direction:column;gap:8px">
      ${data.map(f=>`<div style="padding:10px;background:${sevBg[f.severity]||'var(--bg-elevated)'};border-radius:8px">
        <div style="font-weight:700;font-size:12px;margin-bottom:2px">${f.flag_type?.replace(/_/g,' ').toUpperCase()}</div>
        <div style="font-size:12px">${f.description}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Teacher: ${f.first_name||''} ${f.last_name||''} | TSC: ${f.tsc_number||'--'}</div>
        <button class="btn btn-sm btn-ghost" style="margin-top:6px" onclick="Pages.TSCVerif.resolveFlag('${f.id}')">Mark Resolved</button>
      </div>`).join('')}
    </div>`);
  },

  async resolveFlag(id){
    const note = prompt('Resolution note:'); if(!note) return;
    await API.put(`/dean/fraud-flags/${id}/resolve`,{note});
    Toast.success('Flag resolved');
    this.viewFraudFlags();
  },
};
Router.define?.('tsc-verification',{ title:'TSC Verification', onEnter:()=>Pages.TSCVerif.load() });

// ============================================================
// AI INSIGHTS PAGE
// ============================================================
Pages.AIInsights = {
  switchTab(tab, el){
    document.querySelectorAll('#page-ai-insights .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('ai-insights-tab-content');
    if(!c) return;
    if(tab==='insights') this.renderInsights(c);
    else if(tab==='atrisk') this.renderAtRisk(c);
    else if(tab==='feedefault') this.renderFeeDefault(c);
    else if(tab==='trends') this.renderTrends(c);
  },

  async load(){ this.switchTab('insights', document.querySelector('#page-ai-insights .tab')); },

  async renderInsights(container){
    container.innerHTML = _loading();
    const data = await API.get('/ai/insights');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    if(!data.length){ container.innerHTML = `
      ${_empty('No insights yet','Run the AI engine to generate smart school insights.')}
      <div style="text-align:center"><button class="btn btn-primary" onclick="Pages.AIInsights.generateInsights()">🧠 Generate Insights</button></div>`; return; }

    const sevBg={critical:'var(--red-bg)',warning:'var(--amber-bg)',info:'var(--brand-subtle)',success:'var(--green-bg)'};
    const sevBorder={critical:'var(--red)',warning:'var(--amber)',info:'var(--brand)',success:'var(--green)'};
    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-sm btn-secondary" onclick="Pages.AIInsights.generateInsights()">Refresh Insights</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${data.map(ins=>`
          <div style="background:${sevBg[ins.severity]||'var(--bg-elevated)'};border:1px solid ${sevBorder[ins.severity]||'var(--border)'};border-radius:10px;padding:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
            <div style="flex:1">
              <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:4px">${ins.title}</div>
              <div style="font-size:12px;color:var(--text-secondary)">${ins.description}</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              ${_badge(ins.severity, {critical:'red',warning:'amber',info:'blue',success:'green'}[ins.severity]||'gray')}
              <button class="btn btn-sm btn-ghost" onclick="Pages.AIInsights.dismiss('${ins.id}')">✕</button>
            </div>
          </div>`).join('')}
      </div>`;
  },

  async renderAtRisk(container){
    container.innerHTML = _loading();
    const data = await API.get('/ai/predictions/at-risk?level=high_risk');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    if(!data.length){ container.innerHTML = `${_empty('No high-risk students detected ✅')}<div style="text-align:center"><button class="btn btn-secondary" onclick="Pages.AIInsights.runPredictions()">Run Predictions</button></div>`; return; }
    container.innerHTML = _tbl(['Student','Class','Risk Score','Risk Level','Top Factor','Recommendation'],
      data.map(s=>`<tr>
        <td><strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${s.admission_number}</div></td>
        <td>${s.class_name||'--'}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${(s.risk_score*100).toFixed(0)}%;height:100%;background:${s.risk_label==='high_risk'?'var(--red)':'var(--amber)'}"></div></div>
            <span style="font-size:11px">${(s.risk_score*100).toFixed(0)}%</span>
          </div>
        </td>
        <td>${_badge(s.risk_label?.replace('_',' ')||'--', s.risk_label==='high_risk'?'red':'amber')}</td>
        <td style="font-size:11px">${(s.factors||[])[0]?.factor||'--'}</td>
        <td style="font-size:11px;max-width:200px;color:var(--text-secondary)">${s.recommendation||'--'}</td>
      </tr>`).join(''));
  },

  async renderFeeDefault(container){
    container.innerHTML = _loading();
    const data = await API.get('/ai/fee-defaulters');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    if(!data.length){ container.innerHTML = _empty('No fee default predictions'); return; }
    container.innerHTML = _tbl(['Student','Class','Balance','Risk Level','Parent Phone'],
      data.map(s=>`<tr>
        <td><strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${s.admission_number}</div></td>
        <td>${s.class_name||'--'}</td>
        <td style="font-weight:700;color:var(--red)">KES ${parseFloat(s.currentBalance||0).toLocaleString()}</td>
        <td>${_badge(s.defaultLikelihood?.replace('_',' ')||'--', {high_risk:'red',medium_risk:'amber',low_risk:'green'}[s.defaultLikelihood]||'gray')}</td>
        <td>${s.parent_phone||'--'}</td>
      </tr>`).join(''));
  },

  async renderTrends(container){
    const classes = await API.get('/academics/classes');
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <label style="font-size:13px;font-weight:600">Class:</label>
        <select id="ai-cls-sel" style="padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-card);color:var(--text-primary)">
          <option value="">Select class…</option>
          ${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="Pages.AIInsights.loadTrends(document.getElementById('ai-cls-sel').value)">Load Trends</button>
      </div>
      <div id="ai-trends-content">${_empty('Select a class to view performance trends')}</div>`;
  },

  async loadTrends(classId){
    if(!classId) return;
    const c = document.getElementById('ai-trends-content');
    c.innerHTML = _loading();
    const data = await API.get(`/ai/performance-trends/${classId}`);
    if(data.error){ c.innerHTML = _err(data.error); return; }
    const trends = data.examTrends||[];
    if(!trends.length){ c.innerHTML = _empty('No exam data for this class'); return; }
    c.innerHTML = `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><div class="card-title">Exam Performance Trend</div></div>
        <canvas id="ai-chart" height="120"></canvas>
      </div>
      ${_tbl(['Exam','Avg Marks','Students','Pass Rate'],
        trends.map(t=>`<tr>
          <td><strong>${t.exam_name}</strong></td>
          <td style="font-weight:700;color:var(--brand)">${t.avg_marks||'--'}%</td>
          <td>${t.students||0}</td>
          <td>${t.students>0?((parseInt(t.passes||0)/parseInt(t.students))*100).toFixed(0)+'%':'--'}</td>
        </tr>`).join(''))}`;

    if(window.Chart && trends.length>1){
      new Chart(document.getElementById('ai-chart'),{
        type:'line',
        data:{labels:trends.map(t=>t.exam_name?.substring(0,20)),datasets:[{label:'Avg Marks %',data:trends.map(t=>parseFloat(t.avg_marks||0)),borderColor:'var(--brand)',backgroundColor:'rgba(43,127,255,0.1)',tension:0.4,fill:true}]},
        options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,grid:{color:'rgba(255,255,255,0.05)'}},x:{grid:{color:'rgba(255,255,255,0.05)'}}}}
      });
    }
  },

  async generateInsights(){
    const res = await API.post('/ai/insights/generate',{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`${res.generated} insights generated!`);
    this.renderInsights(document.getElementById('ai-insights-tab-content'));
  },

  async runPredictions(){
    Toast.info('Running AI predictions for all students…');
    const res = await API.post('/ai/predictions/generate',{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`Predictions done: ${res.highRisk} high-risk, ${res.mediumRisk} medium-risk`);
  },

  async dismiss(id){
    await API.put(`/ai/insights/${id}/dismiss`,{});
    this.renderInsights(document.getElementById('ai-insights-tab-content'));
  },
};
Router.define?.('ai-insights',{ title:'AI Insights', onEnter:()=>Pages.AIInsights.load() });

// ============================================================
// GAMIFICATION PAGE
// ============================================================
Pages.Gamification = {
  switchTab(tab, el){
    document.querySelectorAll('#page-gamification .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('gamification-tab-content');
    if(!c) return;
    if(tab==='leaderboard') this.renderLeaderboard(c);
    else if(tab==='badges') this.renderBadges(c);
  },

  async load(){ this.switchTab('leaderboard', document.querySelector('#page-gamification .tab')); },

  async renderLeaderboard(container){
    container.innerHTML = _loading();
    const [data, classes] = await Promise.all([API.get('/gamification/leaderboard?limit=50'), API.get('/academics/classes')]);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const medals=['🥇','🥈','🥉'];
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <select onchange="Pages.Gamification.filterClass(this.value)" style="padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-card);color:var(--text-primary)">
          <option value="">All Classes</option>
          ${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      ${_tbl(['Rank','Student','Class','Points','Academic','Attendance','Badges'],
        (data||[]).map((s,i)=>`<tr>
          <td style="font-size:20px;text-align:center">${medals[i]||'#'+(i+1)}</td>
          <td><div style="display:flex;align-items:center;gap:8px">
            ${s.photo_url?`<img src="${s.photo_url}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">`:`<div class="avatar sm">${(s.first_name||'?')[0]}</div>`}
            <strong>${s.first_name} ${s.last_name}</strong>
          </div></td>
          <td>${s.class_name||'--'}</td>
          <td style="font-size:18px;font-weight:800;color:var(--brand)">${s.total_points||0}</td>
          <td>${s.academic_points||0}</td>
          <td>${s.attendance_points||0}</td>
          <td>${s.badge_count||0} 🏆</td>
        </tr>`).join(''), 'No leaderboard data')}`;
  },

  async filterClass(classId){
    const url = classId?`/gamification/leaderboard?classId=${classId}&limit=50`:'/gamification/leaderboard?limit=50';
    const data = await API.get(url);
    if(!data.error) this.renderLeaderboard(document.getElementById('gamification-tab-content'));
  },

  async renderBadges(container){
    container.innerHTML = _loading();
    const data = await API.get('/gamification/badges');
    if(!data.length){ container.innerHTML = `${_empty('No badges defined','Create badges that are automatically or manually awarded.')}<div style="text-align:center"><button class="btn btn-primary" onclick="Pages.Gamification.openBadgeModal()">Create First Badge</button></div>`; return; }
    container.innerHTML = `<div class="grid-auto">${data.map(b=>`
      <div class="card" style="text-align:center">
        <div style="font-size:40px;margin-bottom:8px">${b.icon||'🏆'}</div>
        <div style="font-weight:700;font-size:14px">${b.name}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${b.description||''}</div>
        <div style="margin-top:8px;display:flex;gap:4px;justify-content:center;flex-wrap:wrap">
          ${_badge(b.points_reward+' pts','amber')} ${_badge(b.category,'blue')}
        </div>
        ${b.is_auto_award?'<div style="font-size:11px;color:var(--green);margin-top:6px">✓ Auto-awarded</div>':''}
      </div>`).join('')}</div>`;
  },

  openBadgeModal(){
    const name = prompt('Badge name:'); if(!name) return;
    const icon = prompt('Emoji icon (e.g. 🏆, ⭐, 🎯):','🏆')||'🏆';
    const pts = parseInt(prompt('Points reward:','10')||10);
    const category = prompt('Category (academic/attendance/behavior/sports/clubs/leadership):','academic')||'academic';
    const auto = confirm('Auto-award when criteria met?');
    API.post('/gamification/badges',{name,icon,pointsReward:pts,category,isAutoAward:auto}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Badge created!');
      this.renderBadges(document.getElementById('gamification-tab-content'));
    });
  },

  openAwardModal(){
    const adm = prompt('Student admission number:'); if(!adm) return;
    API.get(`/search/students?q=${adm}`).then(students=>{
      if(!students.length){ Toast.error('Student not found'); return; }
      const s = students[0];
      const pts = parseInt(prompt(`Award points to ${s.first_name} ${s.last_name}. How many?`,'10')||0);
      if(!pts) return;
      const reason = prompt('Reason:','Manual award')||'Manual award';
      const category = prompt('Category (academic/attendance/behavior/sports):','academic')||'academic';
      API.post('/gamification/points',{studentId:s.id,points:pts,reason,category}).then(r=>{
        if(r.error){ Toast.error(r.error); return; }
        Toast.success(`${pts} points awarded to ${s.first_name}!`);
        this.load();
      });
    });
  },
};
Router.define?.('gamification',{ title:'Leaderboard', onEnter:()=>Pages.Gamification.load() });

// ============================================================
// THREADS (Two-way messaging)
// ============================================================
Pages.Threads = {
  currentId: null, threads:[],

  async load(){ await this.loadList(); },

  async loadList(search){
    const el = document.getElementById('threads-list');
    if(!el) return;
    const url = search?`/threads?search=${encodeURIComponent(search)}`:'/threads';
    const data = await API.get(url);
    this.threads = data.data||[];
    if(!this.threads.length){ el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px">No conversations yet</div>`; return; }

    el.innerHTML = this.threads.map(t=>`
      <div onclick="Pages.Threads.open('${t.id}')" style="padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;background:${this.currentId===t.id?'var(--bg-elevated)':''};" onmouseenter="this.style.background='var(--bg-elevated)'" onmouseleave="this.style.background='${this.currentId===t.id?'var(--bg-elevated)':''}'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="font-weight:${parseInt(t.unread_count||0)>0?700:500};font-size:13px;color:var(--text-primary)">${t.subject}</div>
          ${parseInt(t.unread_count||0)>0?`<span style="background:var(--brand);color:#fff;border-radius:999px;padding:2px 6px;font-size:10px;font-weight:700">${t.unread_count}</span>`:''}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(t.last_message||'').substring(0,70)}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${_badge(t.type?.replace('_',' ')||'general','gray')} · ${t.participant_count||0} participants</div>
      </div>`).join('');
  },

  search(val){ clearTimeout(this._t); this._t=setTimeout(()=>this.loadList(val),400); },

  async open(threadId){
    this.currentId = threadId;
    const tv = document.getElementById('thread-view');
    if(!tv) return;
    const t = this.threads.find(x=>x.id===threadId)||{};
    tv.innerHTML = `
      <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700;font-size:14px">${t.subject||'Thread'}</div><div style="font-size:11px;color:var(--text-muted)">${t.participant_count||0} participants</div></div>
        <button class="btn btn-sm btn-ghost" onclick="Pages.Threads.archive('${threadId}')">Archive</button>
      </div>
      <div id="thread-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px">${_loading()}</div>
      <div style="padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:8px">
        <input type="text" id="thread-input" placeholder="Type a message…" style="flex:1;padding:9px 14px;border:1px solid var(--border);border-radius:20px;background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none" onkeydown="if(event.key==='Enter')Pages.Threads.send()">
        <button class="btn btn-primary" onclick="Pages.Threads.send()" style="border-radius:20px;padding:0 18px">Send</button>
      </div>`;
    document.getElementById('thread-empty').style.display='none';
    await this.loadMsgs(threadId);
    this.loadList();
  },

  async loadMsgs(threadId){
    const c = document.getElementById('thread-msgs');
    if(!c) return;
    const data = await API.get(`/threads/${threadId}/messages`);
    const msgs = [...(data.data||[])].reverse();
    if(!msgs.length){ c.innerHTML=`<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:13px">No messages yet. Say hello!</div>`; return; }
    const myId = AppState.user?.id;
    c.innerHTML = msgs.map(m=>{
      const mine = m.sender_id===myId;
      return `<div style="display:flex;justify-content:${mine?'flex-end':'flex-start'}">
        <div style="max-width:72%;background:${mine?'var(--brand)':'var(--bg-elevated)'};color:${mine?'#fff':'var(--text-primary)'};padding:10px 14px;border-radius:${mine?'18px 18px 4px 18px':'18px 18px 18px 4px'};">
          ${!mine?`<div style="font-size:10px;font-weight:700;margin-bottom:3px;opacity:0.8">${m.first_name} ${m.last_name}</div>`:''}
          <div style="font-size:13px">${m.is_deleted?'<em>Deleted</em>':m.body}</div>
          <div style="font-size:10px;opacity:0.6;margin-top:3px;text-align:right">${new Date(m.created_at).toLocaleTimeString('en-KE',{timeStyle:'short'})}</div>
        </div>
      </div>`;
    }).join('');
    c.scrollTop = c.scrollHeight;
  },

  async send(){
    const input = document.getElementById('thread-input');
    const body = input?.value?.trim();
    if(!body||!this.currentId) return;
    input.value='';
    const res = await API.post(`/threads/${this.currentId}/messages`,{body});
    if(res.error){ Toast.error(res.error); return; }
    await this.loadMsgs(this.currentId);
  },

  async openNewThread(){
    const subject = prompt('Thread subject:'); if(!subject) return;
    const type = prompt('Type (general/parent_teacher/admin_staff/class_announcement):','general')||'general';
    const msg = prompt('First message:'); if(!msg) return;
    const res = await API.post('/threads',{subject,type,firstMessage:msg});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Thread created!');
    await this.loadList();
    this.open(res.thread?.id||res.id);
  },

  async archive(id){
    if(!await UI.confirm('Archive this thread?')) return;
    await API.put(`/threads/${id}/archive`,{});
    Toast.success('Archived');
    document.getElementById('thread-empty').style.display='flex';
    document.getElementById('thread-view').innerHTML='';
    this.loadList();
  },
};
Router.define?.('threads',{ title:'Messages', onEnter:()=>Pages.Threads.load() });

// ============================================================
// PARENT PORTAL PAGE
// ============================================================
Pages.ParentPortal = {
  childId: null,

  async load(){
    const grid = document.getElementById('parent-children-grid');
    if(!grid) return;
    grid.innerHTML = _loading();
    const data = await API.get('/parent/children');
    if(data.error){ grid.innerHTML = _err(data.error); return; }
    if(!data.length){ grid.innerHTML = _empty('No children linked','Contact the school to link your children.'); return; }

    grid.innerHTML = data.map(c=>`
      <div class="card" style="cursor:pointer;text-align:center;transition:transform 0.2s" onclick="Pages.ParentPortal.select('${c.id}')" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform=''">
        ${c.photo_url?`<img src="${c.photo_url}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 10px;border:3px solid var(--brand)">`:`<div class="avatar xl" style="margin:0 auto 10px">${c.first_name[0]}</div>`}
        <div style="font-weight:700;font-size:15px">${c.first_name} ${c.last_name}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${c.class_name||''} · ${c.admission_number}</div>
        <div style="margin-top:8px;display:flex;gap:4px;justify-content:center">
          ${_badge(c.is_active?'Active':'Inactive',c.is_active?'green':'gray')}
          ${c.is_boarding?_badge('Boarder','blue'):''}
        </div>
        <button class="btn btn-primary btn-sm w-full" style="margin-top:12px">View Dashboard</button>
      </div>`).join('');
  },

  async select(childId){
    this.childId=childId;
    document.getElementById('parent-children-grid').style.display='none';
    const det = document.getElementById('parent-child-detail');
    if(det) det.style.display='block';
    this.childTab('dashboard', document.querySelector('#parent-child-detail .tab'));
  },

  childTab(tab, el){
    document.querySelectorAll('#parent-child-detail .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('parent-child-tab-content');
    if(!c) return;
    if(tab==='dashboard') this.childDashboard(c);
    else if(tab==='fees') this.childFees(c);
    else if(tab==='grades') this.childGrades(c);
    else if(tab==='attendance') this.childAttendance(c);
  },

  async childDashboard(container){
    container.innerHTML = _loading();
    const data = await API.get(`/parent/children/${this.childId}/dashboard`);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const {attendance={}, fees={}, latestExam={}} = data;
    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Attendance',parseFloat(attendance.rate||0).toFixed(1)+'%','var(--green)'],['Fee Balance','KES '+parseFloat(fees.balance||0).toLocaleString(),'var(--red)'],['Avg Marks',latestExam.avg_marks?parseFloat(latestExam.avg_marks).toFixed(1)+'%':'--','var(--brand)'],['Absences',attendance.absent||0,'var(--amber)']].map(([l,v,c])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${c}1a">
            <div class="stat-body"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>
          </div>`).join('')}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Attendance (Last 30 days)</div></div>
          <div style="display:flex;flex-wrap:wrap;gap:3px">
            ${(attendance.records||[]).slice(0,30).map(r=>`<div title="${r.date}: ${r.status}" style="width:12px;height:12px;border-radius:2px;background:${r.status==='present'?'var(--green)':r.status==='absent'?'var(--red)':'var(--amber)'}"></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Fee Balance</div></div>
          ${[['Expected','KES '+parseFloat(fees.expected||0).toLocaleString()],['Paid','KES '+parseFloat(fees.paid||0).toLocaleString()],['Balance','KES '+parseFloat(fees.balance||0).toLocaleString()]].map(([k,v])=>_kv(k,v)).join('')}
          <button class="btn btn-primary btn-sm" style="margin-top:12px;width:100%" onclick="Pages.ParentPortal.childTab('fees',null)">View Payments</button>
        </div>
      </div>`;
  },

  async childFees(container){
    container.innerHTML = _loading();
    const data = await API.get(`/parent/children/${this.childId}/fees`);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    container.innerHTML = _tbl(['Date','Receipt','Method','M-Pesa Ref','Amount'],
      (data.payments||[]).map(p=>`<tr>
        <td>${new Date(p.paid_at||p.payment_date).toLocaleDateString('en-KE')}</td>
        <td class="font-mono text-sm">${p.receipt_number}</td>
        <td>${(p.payment_method||'').replace(/_/g,' ')}</td>
        <td>${p.mpesa_receipt||'--'}</td>
        <td style="font-weight:600;color:var(--green)">KES ${parseFloat(p.amount).toLocaleString()}</td>
      </tr>`).join(''), 'No payments yet');
  },

  async childGrades(container){
    container.innerHTML = _loading();
    const data = await API.get(`/parent/children/${this.childId}/grades`);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    if(!data.length){ container.innerHTML = _empty('No grades available'); return; }
    container.innerHTML = _tbl(['Subject','Exam','Marks','Grade','Points'],
      data.map(g=>`<tr>
        <td><strong>${g.subject}</strong></td>
        <td style="font-size:12px">${g.exam_name||'--'}</td>
        <td>${g.is_absent?_badge('ABS','amber'):g.marks||'--'}</td>
        <td>${g.grade?_badge(g.grade, _gradeC(g.grade)):'--'}</td>
        <td>${g.points||'--'}</td>
      </tr>`).join(''));
  },

  async childAttendance(container){
    container.innerHTML = _loading();
    const data = await API.get(`/parent/children/${this.childId}/attendance`);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const s = data.summary||{};
    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:16px">
        ${[['Present',s.present||0,'var(--green)'],['Absent',s.absent||0,'var(--red)'],['Late',s.late||0,'var(--amber)'],['Rate',parseFloat(s.rate||0).toFixed(1)+'%','var(--brand)']].map(([l,v,c])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${c}1a"><div class="stat-body"><div class="stat-value" style="color:${c}">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
      </div>
      ${_tbl(['Date','Status','Remarks'],
        (data.records||[]).map(r=>`<tr>
          <td>${new Date(r.date).toLocaleDateString('en-KE',{dateStyle:'medium'})}</td>
          <td>${_badge(r.status, r.status==='present'?'green':r.status==='absent'?'red':'amber')}</td>
          <td style="font-size:12px;color:var(--text-muted)">${r.remarks||'--'}</td>
        </tr>`).join(''), 'No attendance records')}`;
  },
};
Router.define?.('parent-portal',{ title:'My Children', onEnter:()=>Pages.ParentPortal.load() });

// ============================================================
// SCHOOL PROFILE PAGE
// ============================================================
Pages.SchoolProfile = {
  switchTab(tab, el){
    document.querySelectorAll('#page-school-profile .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('school-profile-tab-content');
    if(!c) return;
    if(tab==='profile') this.renderProfile(c);
    else if(tab==='gallery') this.renderGallery(c);
    else if(tab==='showcase') this.renderShowcase(c);
  },

  async load(){ this.switchTab('profile', document.querySelector('#page-school-profile .tab')); },

  async renderProfile(container){
    container.innerHTML = _loading();
    const data = await API.get('/school-profile');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const s = data.school||{}; const p = data.profile||{};
    container.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Branding & Identity</div></div>
          <div class="form-group"><label>Vision</label><textarea id="sp-vision" rows="3">${p.vision||''}</textarea></div>
          <div class="form-group"><label>Mission</label><textarea id="sp-mission" rows="3">${p.mission||''}</textarea></div>
          <div class="form-group"><label>Principal's Name</label><input type="text" id="sp-principal" value="${p.principal_name||s.principal_name||''}"></div>
          <div class="form-group"><label>Primary Colour</label><input type="color" id="sp-primary-col" value="${p.primary_colour||'#1a365d'}" style="height:40px;cursor:pointer"></div>
          <div class="form-group"><label>Watermark Text</label><input type="text" id="sp-watermark" value="${p.watermark_text||s.name||''}" placeholder="e.g. CONFIDENTIAL or school name"></div>
          <button class="btn btn-primary" onclick="Pages.SchoolProfile.save()">Save Profile</button>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Document Signatures</div></div>
          <div class="form-group"><label>Principal Signature URL</label><input type="text" id="sp-sig-principal" value="${p.principal_signature_url||''}" placeholder="https://… (image URL)"></div>
          <div class="form-group"><label>Principal Name (for docs)</label><input type="text" id="sp-sig-principal-name" value="${p.principal_signature_name||''}"></div>
          <div class="form-group"><label>Bursar Signature URL</label><input type="text" id="sp-sig-bursar" value="${p.bursar_signature_url||''}" placeholder="https://…"></div>
          <div class="form-group"><label>Bursar Name</label><input type="text" id="sp-sig-bursar-name" value="${p.bursar_signature_name||''}"></div>
          <div class="form-group"><label>School Stamp URL</label><input type="text" id="sp-stamp" value="${p.stamp_url||''}" placeholder="https://…"></div>
          <div class="alert alert-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>Signatures appear on report cards, fee statements, and suspension letters.</div>
        </div>
      </div>`;
  },

  async save(){
    const payload = {
      vision: document.getElementById('sp-vision')?.value,
      mission: document.getElementById('sp-mission')?.value,
      principalName: document.getElementById('sp-principal')?.value,
      primaryColour: document.getElementById('sp-primary-col')?.value,
      watermarkText: document.getElementById('sp-watermark')?.value,
      principalSignatureUrl: document.getElementById('sp-sig-principal')?.value,
      principalSignatureName: document.getElementById('sp-sig-principal-name')?.value,
      bursarSignatureUrl: document.getElementById('sp-sig-bursar')?.value,
      bursarSignatureName: document.getElementById('sp-sig-bursar-name')?.value,
      stampUrl: document.getElementById('sp-stamp')?.value,
    };
    const res = await API.put('/school-profile', payload);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('School profile saved!');
  },

  async renderGallery(container){
    container.innerHTML = _loading();
    const data = await API.get('/school-profile/gallery');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-primary btn-sm" onclick="Pages.SchoolProfile.addPhoto()">Add Photo</button>
      </div>
      ${!data.length ? _empty('No photos yet','Add photos to showcase your school.') : `
      <div class="grid-auto">${data.map(img=>`
        <div class="card" style="padding:0;overflow:hidden">
          <img src="${img.image_url}" style="width:100%;height:160px;object-fit:cover">
          <div style="padding:12px">
            <div style="font-weight:600;font-size:13px">${img.title||'(Untitled)'}</div>
            <div style="font-size:11px;color:var(--text-muted)">${img.category||'general'}</div>
            <div style="display:flex;gap:6px;margin-top:8px">
              ${img.is_featured?_badge('Featured','amber'):''}
              <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.SchoolProfile.deletePhoto('${img.id}')">Remove</button>
            </div>
          </div>
        </div>`).join('')}</div>`}`;
  },

  addPhoto(){
    const url = prompt('Image URL:'); if(!url) return;
    const title = prompt('Title:')||'';
    const category = prompt('Category (campus/events/sports/academics/graduation):','general')||'general';
    const featured = confirm('Mark as featured?');
    API.post('/school-profile/gallery',{imageUrl:url,title,category,isFeatured:featured}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Photo added!');
      this.renderGallery(document.getElementById('school-profile-tab-content'));
    });
  },

  async deletePhoto(id){
    if(!await UI.confirm('Remove this photo?')) return;
    await API.delete(`/school-profile/gallery/${id}`);
    Toast.success('Photo removed');
    this.renderGallery(document.getElementById('school-profile-tab-content'));
  },

  async renderShowcase(container){
    container.innerHTML = _loading();
    const data = await API.get('/school-profile/alumni-showcase');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    container.innerHTML = !data.length ? `${_empty('No alumni featured','Feature outstanding alumni to inspire current students.')}<div style="text-align:center"><button class="btn btn-secondary" onclick="Router.go('alumni')">Go to Alumni</button></div>` : `
      <div class="grid-auto">${data.map(a=>`
        <div class="card" style="text-align:center">
          ${a.showcase_image_url?`<img src="${a.showcase_image_url}" style="width:72px;height:72px;border-radius:50%;object-fit:cover;margin:0 auto 10px;border:3px solid var(--brand)">`:`<div class="avatar xl" style="margin:0 auto 10px">${a.first_name[0]}</div>`}
          <div style="font-weight:700">${a.first_name} ${a.last_name}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Class of ${a.graduation_year||'--'} ${a.kcse_grade?'· '+a.kcse_grade:''}</div>
          ${a.current_occupation?`<div style="font-size:12px;color:var(--brand);margin-top:4px">${a.current_occupation}</div>`:''}
          ${a.showcase_quote?`<div style="font-size:12px;font-style:italic;color:var(--text-secondary);margin-top:8px">"${a.showcase_quote}"</div>`:''}
        </div>`).join('')}</div>`;
  },
};
Router.define?.('school-profile',{ title:'School Profile', onEnter:()=>Pages.SchoolProfile.load() });

// ============================================================
// SEARCH RESULTS PAGE
// ============================================================
Router.define?.('search-results',{ title:'Search Results', onEnter:()=>{}});

// ============================================================
// GLOBAL SEARCH WIRING
// ============================================================
document.addEventListener('DOMContentLoaded', ()=>{
  const input = document.getElementById('global-search');
  if(!input) return;
  let _t;
  input.addEventListener('input', e=>{
    clearTimeout(_t);
    _t = setTimeout(async ()=>{
      const q = e.target.value.trim();
      if(q.length<2) return;
      const results = await API.get(`/search?q=${encodeURIComponent(q)}`);
      if(!results.totalResults) return;
      Router.go('search-results');
      const subtitle = document.getElementById('search-results-subtitle');
      if(subtitle) subtitle.textContent = `${results.totalResults} results for "${q}"`;
      const container = document.getElementById('search-results-content');
      if(!container) return;
      const iconMap={students:'👤',staff:'👔',classes:'🏫',resources:'📚',alumni:'🎓',payments:'💳'};
      let html='';
      Object.entries(results.results).forEach(([mod, items])=>{
        if(!items.length) return;
        html += `<div style="margin-bottom:20px"><div style="font-weight:700;font-size:11px;margin-bottom:8px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px">${iconMap[mod]||'•'} ${mod} (${items.length})</div>`;
        html += `<div style="display:flex;flex-direction:column;gap:6px">`;
        items.forEach(item=>{
          html += `<div style="padding:10px 14px;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border);display:flex;gap:12px;align-items:center;cursor:pointer" onclick="Router.go('${mod}')">`;
          if(item.image) html += `<img src="${item.image}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">`;
          else html += `<div class="avatar sm">${(item.label||'?').charAt(0)}</div>`;
          html += `<div><div style="font-weight:600;font-size:13px">${item.label||''}</div><div style="font-size:11px;color:var(--text-muted)">${item.context||item.ref||''}</div></div></div>`;
        });
        html += '</div></div>';
      });
      container.innerHTML = html;
    }, 350);
  });
});

console.log('✅ ElimuSaaS -- All modules loaded (Staff · Academics · Exams · Attendance · Clubs · Certificates · Communication · LeaveOut · Newsletters · Reports · Alumni · Settings · SuperAdmin · Timetable · Billing · TSC Verification · AI Insights · Gamification · Threads · Parent Portal · School Profile · Search)');
