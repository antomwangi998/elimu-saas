'use strict';
if (typeof Pages !== 'undefined') {
Pages.ClassRegister = {
  _classId: '', _date: new Date().toISOString().split('T')[0],
  _classes: [], _students: [], _attendance: {},

  async load() {
    const area = document.getElementById('page-class-register');
    if (!area) return;
    const classes = await API.get('/academics/classes').then(d => Array.isArray(d)?d:(d?.data||[])).catch(()=>[]);
    this._classes = classes;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">📋 Class Register</h2>
          <p class="page-subtitle">Daily lesson attendance — mark present, absent or late per lesson</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Pages.ClassRegister.exportRegister()">⬇️ Export</button>
          <button class="btn btn-primary" onclick="Pages.ClassRegister.saveAttendance()">💾 Save Register</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="card" style="padding:16px;margin-bottom:16px">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="form-group" style="flex:1;min-width:160px;margin:0">
            <label class="form-label">Class *</label>
            <select id="reg-class" class="form-control" onchange="Pages.ClassRegister._classId=this.value;Pages.ClassRegister.loadStudents()">
              <option value="">Select class...</option>
              ${classes.map(c => `<option value="${c.id}">${c.name} ${c.stream||''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Date</label>
            <input id="reg-date" class="form-control" type="date" value="${this._date}"
              onchange="Pages.ClassRegister._date=this.value;Pages.ClassRegister.loadStudents()">
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Period / Subject</label>
            <select id="reg-period" class="form-control">
              ${['Morning Assembly','Period 1','Period 2','Period 3','Period 4','Period 5',
                 'Period 6','Period 7','Period 8','Period 9','Afternoon'].map(p=>`<option>${p}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap" id="quick-actions" style="display:none">
        <button class="btn btn-sm btn-secondary" onclick="Pages.ClassRegister.markAll('present')">✅ Mark All Present</button>
        <button class="btn btn-sm btn-secondary" onclick="Pages.ClassRegister.markAll('absent')">❌ Mark All Absent</button>
        <button class="btn btn-sm btn-secondary" onclick="Pages.ClassRegister.resetAll()">↺ Reset</button>
      </div>

      <!-- Register table -->
      <div id="reg-table-area">
        <div style="text-align:center;padding:60px;background:white;border-radius:12px;border:1px solid var(--border);color:var(--text-muted)">
          <div style="font-size:48px;margin-bottom:12px">📋</div>
          <div>Select a class to open the register</div>
        </div>
      </div>`;
  },

  async loadStudents() {
    if (!this._classId) return;
    const area = document.getElementById('reg-table-area');
    if (!area) return;
    area.innerHTML = `<div style="text-align:center;padding:32px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    document.getElementById('quick-actions')?.removeAttribute('style');

    const [students, existing] = await Promise.all([
      API.get('/students', { classId: this._classId, limit: 100 }).then(d => d?.data||[]).catch(()=>[]),
      API.get('/attendance', { classId: this._classId, date: this._date }).then(d => d?.data||d||[]).catch(()=>[]),
    ]);
    this._students = students;
    this._attendance = {};
    (Array.isArray(existing) ? existing : []).forEach(r => { this._attendance[r.student_id] = r.status; });

    if (!students.length) {
      area.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No students in this class</div>`;
      return;
    }

    const present = Object.values(this._attendance).filter(v=>v==='present').length;
    const absent  = Object.values(this._attendance).filter(v=>v==='absent').length;
    const total   = students.length;

    area.innerHTML = `
      <!-- Stats bar -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        <div style="background:var(--green-bg);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:var(--green)">${present}</div>
          <div style="font-size:11px;color:var(--text-muted)">Present</div>
        </div>
        <div style="background:var(--red-bg);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:var(--red)">${absent}</div>
          <div style="font-size:11px;color:var(--text-muted)">Absent</div>
        </div>
        <div style="background:var(--amber-bg);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:var(--amber)" id="reg-late-count">${Object.values(this._attendance).filter(v=>v==='late').length}</div>
          <div style="font-size:11px;color:var(--text-muted)">Late</div>
        </div>
        <div style="background:var(--brand-subtle);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:800;color:var(--brand)">${total}</div>
          <div style="font-size:11px;color:var(--text-muted)">Total</div>
        </div>
      </div>
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:36px">#</th>
                <th>Student</th>
                <th style="width:90px">Adm No</th>
                <th style="width:110px;text-align:center">Present</th>
                <th style="width:110px;text-align:center">Absent</th>
                <th style="width:110px;text-align:center">Late</th>
                <th style="width:110px;text-align:center">Excused</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              ${students.map((s, i) => {
                const status = this._attendance[s.id] || 'present';
                const chk = (val) => status === val ? 'checked' : '';
                return `<tr id="reg-row-${s.id}">
                  <td style="color:var(--text-muted)">${i+1}</td>
                  <td>
                    <div style="font-weight:600">${s.first_name} ${s.last_name}</div>
                    <div style="font-size:10px;color:var(--text-muted)">${s.gender==='male'?'♂':'♀'}</div>
                  </td>
                  <td><code style="font-size:11px">${s.admission_number}</code></td>
                  <td style="text-align:center"><input type="radio" name="att-${s.id}" value="present" ${chk('present')} onchange="Pages.ClassRegister.mark('${s.id}',this.value)" style="width:18px;height:18px;accent-color:var(--green)"></td>
                  <td style="text-align:center"><input type="radio" name="att-${s.id}" value="absent"  ${chk('absent')}  onchange="Pages.ClassRegister.mark('${s.id}',this.value)" style="width:18px;height:18px;accent-color:var(--red)"></td>
                  <td style="text-align:center"><input type="radio" name="att-${s.id}" value="late"    ${chk('late')}    onchange="Pages.ClassRegister.mark('${s.id}',this.value)" style="width:18px;height:18px;accent-color:var(--amber)"></td>
                  <td style="text-align:center"><input type="radio" name="att-${s.id}" value="excused" ${chk('excused')} onchange="Pages.ClassRegister.mark('${s.id}',this.value)" style="width:18px;height:18px;accent-color:var(--purple)"></td>
                  <td><input type="text" id="remark-${s.id}" class="form-control" style="padding:4px 8px;font-size:11px" placeholder="Optional..."></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  mark(studentId, status) {
    this._attendance[studentId] = status;
    const row = document.getElementById(`reg-row-${studentId}`);
    if (row) {
      row.style.background = status === 'absent' ? 'var(--red-bg)' : status === 'late' ? 'var(--amber-bg)' : '';
    }
  },

  markAll(status) {
    this._students.forEach(s => {
      this._attendance[s.id] = status;
      document.querySelector(`input[name="att-${s.id}"][value="${status}"]`).checked = true;
      const row = document.getElementById(`reg-row-${s.id}`);
      if (row) row.style.background = status === 'absent' ? 'var(--red-bg)' : '';
    });
    Toast.info(`All ${this._students.length} students marked as ${status}`);
  },

  resetAll() {
    this._attendance = {};
    this._students.forEach(s => {
      const r = document.querySelector(`input[name="att-${s.id}"][value="present"]`);
      if (r) r.checked = true;
      const row = document.getElementById(`reg-row-${s.id}`);
      if (row) row.style.background = '';
    });
    Toast.info('Register reset');
  },

  async saveAttendance() {
    if (!this._classId) { Toast.error('Select a class first'); return; }
    const records = this._students.map(s => ({
      studentId: s.id,
      status: this._attendance[s.id] || 'present',
      remark: document.getElementById(`remark-${s.id}`)?.value || null
    }));
    const r = await API.post('/attendance/bulk', {
      classId: this._classId, date: this._date, records
    });
    if (r?.message || r?.marked) {
      Toast.success(`✅ Register saved for ${records.length} students!`);
    } else {
      Toast.error(r?.error || 'Failed to save');
    }
  },

  exportRegister() {
    if (!this._students.length) { Toast.error('Load a class first'); return; }
    const cls = this._classes.find(c => c.id === this._classId);
    const headers = ['#','Admission No','Student Name','Status','Remark'];
    const rows = this._students.map((s,i) => [
      i+1, s.admission_number, `${s.first_name} ${s.last_name}`,
      this._attendance[s.id]||'present',
      document.getElementById(`remark-${s.id}`)?.value||''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `register_${cls?.name||'class'}_${this._date}.csv`;
    a.click();
    Toast.success('Register exported!');
  }
};
}
