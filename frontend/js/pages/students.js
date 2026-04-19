// ============================================================
// Students Page — Full Implementation
// ============================================================
var Pages = window.Pages = window.Pages || {};

Pages.Students = {
  page: 1, search: '', classFilter: '', genderFilter: '',

  async load() {
    this.page = 1;
    await this.loadClasses();
    await this.fetchStudents();
  },

  async loadClasses() {
    const data = await API.get('/academics/classes');
    const classes = Array.isArray(data) ? data : (data?.data || []);
    const sel = document.getElementById('student-class-filter');
    if (sel) {
      sel.innerHTML = '<option value="">All Classes</option>' +
        classes.map(c => `<option value="${c.id}">${c.name} ${c.stream||''}</option>`).join('');
    }
  },

  async fetchStudents() {
    const tbody = document.getElementById('students-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></td></tr>`;

    const params = { page: this.page, limit: 25 };
    if (this.search) params.search = this.search;
    if (this.classFilter) params.classId = this.classFilter;
    if (this.genderFilter) params.gender = this.genderFilter;

    const data = await API.get('/students', params);
    if (data.error) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--red)">${data.error}</td></tr>`;
      return;
    }

    const subtitle = document.getElementById('students-subtitle');
    if (subtitle) subtitle.textContent = `${data.pagination?.total || 0} students enrolled`;

    const rows = data.data || [];
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
        <div style="font-size:48px;margin-bottom:12px">🎓</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:6px">No students found</div>
        <div style="color:var(--text-muted);margin-bottom:16px">Add your first student to get started</div>
        <button class="btn btn-primary" onclick="Pages.Students.openAddModal()">+ Add Student</button>
      </div></td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((s, i) => `
      <tr style="cursor:pointer" onclick="Pages.Students.viewStudent('${s.id}')">
        <td style="color:var(--text-muted);font-size:12px">${(this.page-1)*25+i+1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:36px;height:36px;border-radius:50%;background:${s.gender==='female'?'var(--pink-bg,#fce4ec)':'var(--brand-subtle)'};color:${s.gender==='female'?'#e91e63':'var(--brand)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">
              ${UI.initials(s.first_name+' '+s.last_name)}
            </div>
            <div>
              <div style="font-weight:600">${s.first_name} ${s.last_name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.parent_name||''}</div>
            </div>
          </div>
        </td>
        <td><code style="font-size:11px">${s.admission_number}</code></td>
        <td>${s.class_name||'<span style="color:var(--text-muted)">—</span>'} ${s.stream||''}</td>
        <td><span class="badge badge-${s.gender==='male'?'blue':'pink'}">${s.gender==='male'?'♂ Male':'♀ Female'}</span></td>
        <td>${s.overall_avg ? `<strong>${s.overall_avg}%</strong>` : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>
          ${s.is_boarding ? '<span class="badge badge-purple">Boarder</span>' : '<span class="badge badge-gray">Day</span>'}
          ${parseInt(s.total_absences)>5 ? '<span class="badge badge-red" style="margin-left:4px">⚠️ Absent</span>' : ''}
        </td>
        <td onclick="event.stopPropagation()">
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-primary" onclick="Pages.Students.viewStudent('${s.id}')">👤 View</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Students.editStudent('${s.id}')">✏️</button>
          </div>
        </td>
      </tr>`).join('');

    // Pagination
    const pg = document.getElementById('students-pagination');
    if (pg && data.pagination) {
      const p = data.pagination;
      pg.innerHTML = `
        <span style="color:var(--text-muted);font-size:13px">Showing ${rows.length} of ${p.total}</span>
        <div style="display:flex;gap:6px">
          ${this.page>1?`<button class="btn btn-sm btn-secondary" onclick="Pages.Students.goPage(${this.page-1})">← Prev</button>`:''}
          <span class="btn btn-sm" style="background:var(--brand);color:white;pointer-events:none">${this.page}</span>
          ${p.hasNext?`<button class="btn btn-sm btn-secondary" onclick="Pages.Students.goPage(${this.page+1})">Next →</button>`:''}
        </div>`;
    }
  },

  goPage(p) { this.page = p; this.fetchStudents(); },
  onSearch(val) { this.search = val; this.page = 1; clearTimeout(this._st); this._st = setTimeout(()=>this.fetchStudents(), 350); },
  onFilter() {
    this.classFilter  = document.getElementById('student-class-filter')?.value || '';
    this.genderFilter = document.getElementById('student-gender-filter')?.value || '';
    this.page = 1; this.fetchStudents();
  },

  async viewStudent(id) {
    const data = await API.get('/students/'+id);
    if (!data?.id) { Toast.error('Could not load student'); return; }
    const bal = parseFloat(data.feeBalance?.balance || 0);
    const att = data.attendance || {};
    const attPct = att.total > 0 ? Math.round((att.present/att.total)*100) : 0;
    const p0 = data.parents?.[0] || {};

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="student-view-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:680px;max-height:92vh;overflow-y:auto">
          <div class="modal-header" style="background:var(--brand);color:white">
            <h3 style="color:white;margin:0">🎓 ${data.first_name} ${data.last_name}</h3>
            <button onclick="document.getElementById('student-view-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <!-- Header row -->
            <div style="display:flex;gap:16px;margin-bottom:20px;align-items:center;flex-wrap:wrap">
              <div style="width:72px;height:72px;border-radius:50%;background:var(--brand-subtle);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;flex-shrink:0">${UI.initials(data.first_name+' '+data.last_name)}</div>
              <div style="flex:1">
                <div style="font-size:20px;font-weight:800">${data.first_name} ${data.last_name}</div>
                <div style="color:var(--text-muted);font-size:13px">${data.admission_number} · ${data.class_name||'No class'} ${data.stream||''}</div>
                <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                  <span class="badge badge-${data.gender==='male'?'blue':'pink'}">${data.gender==='male'?'♂ Male':'♀ Female'}</span>
                  ${data.is_boarding?'<span class="badge badge-purple">Boarder</span>':'<span class="badge badge-gray">Day Scholar</span>'}
                  <span class="badge badge-${data.is_active?'green':'red'}">${data.is_active?'Active':'Inactive'}</span>
                </div>
              </div>
              <div style="text-align:right">
                <div style="font-size:26px;font-weight:800;color:${bal>0?'var(--red)':'var(--green)'}">${UI.currency(Math.abs(bal))}</div>
                <div style="font-size:11px;color:var(--text-muted)">${bal>0?'Fee Balance':'Fully Paid'}</div>
                <div style="font-size:13px;font-weight:600;color:${attPct>=80?'var(--green)':attPct>=60?'var(--amber)':'var(--red)'};margin-top:4px">${attPct}% Attendance</div>
              </div>
            </div>

            <!-- Info grid -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">
              ${[
                ['Date of Birth', UI.date(data.date_of_birth)],
                ['Blood Group',   data.blood_group||'—'],
                ['KCPE Index',    data.kcpe_index_number||'—'],
                ['Admitted',      UI.date(data.admission_date)],
                ['Nationality',   data.nationality||'Kenyan'],
                ['County',        data.county||'—'],
                ['Dorm',          data.dorm_name||'—'],
                ['Medical',       data.medical_conditions||'None recorded'],
              ].map(([l,v])=>`<div style="background:var(--bg-elevated);padding:10px;border-radius:8px">
                <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px">${l}</div>
                <div style="font-weight:600;font-size:13px">${v}</div>
              </div>`).join('')}
            </div>

            <!-- Parent info -->
            ${p0.first_name?`<div style="background:var(--bg-elevated);border-radius:10px;padding:14px;margin-bottom:16px">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">👨‍👩‍👧 Parent / Guardian</div>
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <div><div style="font-weight:700">${p0.first_name} ${p0.last_name||''}</div><div style="font-size:12px;color:var(--text-muted)">${p0.relationship||'Parent'}</div></div>
                <div style="text-align:right"><div style="font-weight:600">${p0.phone||'—'}</div><div style="font-size:12px;color:var(--text-muted)">${p0.email||'—'}</div></div>
              </div>
            </div>`:''}

            <!-- Recent marks -->
            ${data.recentMarks?.length?`<div class="card" style="margin-bottom:0">
              <div class="card-header"><h4 style="margin:0">📊 Recent Exam Marks</h4></div>
              <div style="overflow-x:auto"><table class="data-table">
                <thead><tr><th>Exam</th><th>Subject</th><th>Marks</th><th>Grade</th></tr></thead>
                <tbody>${data.recentMarks.slice(0,6).map(m=>`<tr>
                  <td style="font-size:12px">${m.exam_name||'—'}</td>
                  <td>${m.subject_name||'—'}</td>
                  <td>${m.marks??'ABS'}</td>
                  <td style="font-weight:700;color:var(--brand)">${m.grade||'—'}</td>
                </tr>`).join('')}</tbody>
              </table></div>
            </div>`:'<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px">No exam records yet</div>'}
          </div>
          <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:space-between">
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary" onclick="Pages.Students.editStudent('${data.id}');document.getElementById('student-view-modal').remove()">✏️ Edit</button>
              <button class="btn btn-secondary" onclick="Pages.Students.printProfile('${data.id}')">🖨️ Print</button>
            </div>
            <button class="btn btn-primary" onclick="document.getElementById('student-view-modal').remove()">Close</button>
          </div>
        </div>
      </div>`);
  },

  async editStudent(id) {
    const data = await API.get('/students/'+id);
    if (!data?.id) { Toast.error('Could not load student'); return; }
    this.openAddModal();
    setTimeout(() => {
      const set = (elId, val) => { const el = document.getElementById(elId); if (el && val != null) el.value = val; };
      set('s-first-name',  data.first_name);
      set('s-last-name',   data.last_name);
      set('s-other-names', data.other_names);
      set('s-adm-no',      data.admission_number);
      set('s-gender',      data.gender);
      set('s-dob',         data.date_of_birth?.split('T')[0]);
      set('s-class',       data.current_class_id);
      set('s-kcpe',        data.kcpe_index_number);
      set('s-blood',       data.blood_group);
      set('s-boarding',    data.is_boarding ? 'true' : 'false');
      const btn = document.getElementById('save-student-btn');
      if (btn) { btn.textContent = 'Update Student'; btn.onclick = () => Pages.Students.updateStudent(id); }
      const title = document.querySelector('#modal-add-student .modal-title, #modal-add-student h3');
      if (title) title.textContent = 'Edit Student';
    }, 150);
  },

  async updateStudent(id) {
    const g = elId => document.getElementById(elId)?.value?.trim() || '';
    const body = {
      firstName: g('s-first-name'), lastName: g('s-last-name'), otherNames: g('s-other-names'),
      admissionNumber: g('s-adm-no'), gender: g('s-gender'),
      dateOfBirth: g('s-dob'), classId: g('s-class'),
      kcpeIndexNumber: g('s-kcpe'), bloodGroup: g('s-blood'),
      isBoarding: document.getElementById('s-boarding')?.value === 'true',
    };
    if (!body.firstName || !body.lastName) { Toast.error('First and last name required'); return; }
    const r = await API.put('/students/'+id, body);
    if (r?.id || r?.message || r?.admission_number) {
      Toast.success('Student updated!');
      UI.closeModal('modal-add-student');
      this.fetchStudents();
    } else {
      Toast.error(r?.error || 'Update failed');
    }
  },

  openAddModal() {
    const admDate = document.getElementById('s-adm-date');
    if (admDate) admDate.value = new Date().toISOString().split('T')[0];
    ['s-first-name','s-last-name','s-other-names','s-adm-no','s-kcpe','p-first-name','p-last-name','p-phone','p-email','p-occupation'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const btn = document.getElementById('save-student-btn');
    if (btn) { btn.textContent = 'Save Student'; btn.onclick = Pages.Students.saveStudent.bind(Pages.Students); }
    UI.openModal('modal-add-student');
  },

  async saveStudent() {
    const g = elId => document.getElementById(elId)?.value?.trim() || '';
    const payload = {
      firstName: g('s-first-name'), lastName: g('s-last-name'), otherNames: g('s-other-names') || undefined,
      admissionNumber: g('s-adm-no'), gender: g('s-gender'),
      dateOfBirth: g('s-dob') || undefined, classId: g('s-class'),
      admissionDate: g('s-adm-date'),
      isBoarding: document.getElementById('s-boarding')?.value === 'true',
      dormName: g('s-dorm') || undefined,
      kcpeIndexNumber: g('s-kcpe') || undefined, bloodGroup: g('s-blood') || undefined,
      parentFirstName: g('p-first-name') || undefined, parentLastName: g('p-last-name') || undefined,
      parentRelationship: document.getElementById('p-relationship')?.value || 'parent',
      parentPhone: g('p-phone') || undefined, parentEmail: g('p-email') || undefined,
      parentOccupation: g('p-occupation') || undefined,
    };
    if (!payload.firstName || !payload.lastName || !payload.admissionNumber || !payload.gender) {
      Toast.error('First name, last name, admission number and gender are required');
      return;
    }
    const btn = document.getElementById('save-student-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    const r = await API.post('/students', payload);
    if (r?.id || r?.admission_number) {
      Toast.success('Student added successfully!');
      UI.closeModal('modal-add-student');
      this.fetchStudents();
    } else {
      Toast.error(r?.error || 'Failed to add student');
      if (btn) { btn.disabled = false; btn.textContent = 'Save Student'; }
    }
  },

  async exportCSV() {
    Toast.info('Preparing CSV export...');
    const data = await API.get('/students', { limit: 500, page: 1 });
    const list = data?.data || [];
    if (!list.length) { Toast.error('No students to export'); return; }
    const headers = ['#','Admission No','First Name','Last Name','Gender','Class','DOB','Boarding','Active','Parent Phone'];
    const csvRows = [headers.join(',')].concat(
      list.map((s, i) => [
        i+1, s.admission_number, s.first_name, s.last_name, s.gender,
        s.class_name||'', s.date_of_birth?.split('T')[0]||'',
        s.is_boarding?'Yes':'No', s.is_active?'Yes':'No', s.parent_phone||''
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    );
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'students_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    Toast.success(`Exported ${list.length} students`);
  },

  printProfile(id) {
    this.viewStudent(id);
  },
};
