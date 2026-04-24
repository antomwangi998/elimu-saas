'use strict';
if (typeof Pages !== 'undefined') {
Pages.BulkExport = {
  async load() {
    const area = document.getElementById('page-bulk-export');
    if (!area) return;
    const classes = await API.get('/academics/classes').then(d=>Array.isArray(d)?d:(d?.data||[])).catch(()=>[]);
    const series  = await API.get('/exams/series').then(d=>d?.data||d||[]).catch(()=>[]);

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">⬇️ Bulk Export</h2>
          <p class="page-subtitle">Download school data as CSV — students, fees, marks, staff</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">

        <!-- Students -->
        <div class="card">
          <div style="padding:20px">
            <div style="font-size:32px;margin-bottom:10px">🎓</div>
            <h3 style="margin:0 0 6px">Students List</h3>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">All enrolled students with class, gender, boarding status, contacts</p>
            <div class="form-group" style="margin-bottom:12px">
              <label class="form-label">Filter by Class (optional)</label>
              <select id="exp-students-class" class="form-control">
                <option value="">All Classes</option>
                ${classes.map(c=>`<option value="${c.id}">${c.name} ${c.stream||''}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-primary w-full" onclick="Pages.BulkExport.downloadStudents()">⬇️ Download Students CSV</button>
          </div>
        </div>

        <!-- Fees -->
        <div class="card">
          <div style="padding:20px">
            <div style="font-size:32px;margin-bottom:10px">💰</div>
            <h3 style="margin:0 0 6px">Fee Report</h3>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">All students with total billed, paid and outstanding balance</p>
            <div style="height:44px"></div>
            <button class="btn btn-primary w-full" onclick="Pages.BulkExport.downloadFees()">⬇️ Download Fee Report CSV</button>
          </div>
        </div>

        <!-- Marks -->
        <div class="card">
          <div style="padding:20px">
            <div style="font-size:32px;margin-bottom:10px">📊</div>
            <h3 style="margin:0 0 6px">Exam Marks</h3>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">All student marks per subject and exam series</p>
            <div class="form-group" style="margin-bottom:12px">
              <label class="form-label">Exam Series *</label>
              <select id="exp-marks-series" class="form-control">
                <option value="">Select series...</option>
                ${series.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-primary w-full" onclick="Pages.BulkExport.downloadMarks()">⬇️ Download Marks CSV</button>
          </div>
        </div>

        <!-- Staff -->
        <div class="card">
          <div style="padding:20px">
            <div style="font-size:32px;margin-bottom:10px">👩‍🏫</div>
            <h3 style="margin:0 0 6px">Staff List</h3>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">All staff with roles, TSC numbers, designations</p>
            <div style="height:44px"></div>
            <button class="btn btn-primary w-full" onclick="Pages.BulkExport.downloadStaff()">⬇️ Download Staff CSV</button>
          </div>
        </div>

        <!-- Attendance -->
        <div class="card">
          <div style="padding:20px">
            <div style="font-size:32px;margin-bottom:10px">✅</div>
            <h3 style="margin:0 0 6px">Attendance Report</h3>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">Monthly attendance summary per student</p>
            <div class="form-group" style="margin-bottom:12px">
              <label class="form-label">Month</label>
              <input id="exp-att-month" class="form-control" type="month" value="${new Date().toISOString().slice(0,7)}">
            </div>
            <button class="btn btn-primary w-full" onclick="Pages.BulkExport.downloadAttendance()">⬇️ Download Attendance CSV</button>
          </div>
        </div>

        <!-- Bulk Promote -->
        <div class="card" style="border:2px solid var(--amber)">
          <div style="padding:20px">
            <div style="font-size:32px;margin-bottom:10px">⬆️</div>
            <h3 style="margin:0 0 6px;color:var(--amber)">Bulk Promote Students</h3>
            <p style="font-size:13px;color:var(--text-muted);margin:0 0 16px">Move all students from one class to the next</p>
            <div class="form-group" style="margin-bottom:8px">
              <label class="form-label">From Class</label>
              <select id="promote-from" class="form-control">
                <option value="">Select...</option>
                ${classes.map(c=>`<option value="${c.id}">${c.name} ${c.stream||''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-bottom:12px">
              <label class="form-label">To Class</label>
              <select id="promote-to" class="form-control">
                <option value="">Select...</option>
                ${classes.map(c=>`<option value="${c.id}">${c.name} ${c.stream||''}</option>`).join('')}
              </select>
            </div>
            <button class="btn w-full" style="background:var(--amber);color:white;border:none;border-radius:8px;padding:10px;cursor:pointer;font-weight:700" onclick="Pages.BulkExport.promoteStudents()">⬆️ Promote Students</button>
          </div>
        </div>

      </div>`;
  },

  async downloadStudents() {
    const classId = document.getElementById('exp-students-class')?.value;
    Toast.info('Preparing students export...');
    const url = '/bulk-export/students' + (classId ? '?classId='+classId : '');
    await this._download(url, 'students.csv');
  },

  async downloadFees() {
    Toast.info('Preparing fee report...');
    await this._download('/bulk-export/fees', 'fee_report.csv');
  },

  async downloadMarks() {
    const seriesId = document.getElementById('exp-marks-series')?.value;
    if (!seriesId) { Toast.error('Select an exam series'); return; }
    Toast.info('Preparing marks export...');
    await this._download('/bulk-export/marks?seriesId='+seriesId, 'marks.csv');
  },

  async downloadStaff() {
    Toast.info('Preparing staff export...');
    await this._download('/bulk-export/staff', 'staff.csv');
  },

  async downloadAttendance() {
    const month = document.getElementById('exp-att-month')?.value;
    Toast.info('Preparing attendance export...');
    const data = await API.get('/attendance/summary').catch(()=>({}));
    const rows = data?.data || data?.records || [];
    if (!rows.length) { Toast.error('No attendance data found'); return; }
    const csv = 'Student,Class,Days Present,Days Absent,Days Late,Total Days,Rate%\n' +
      rows.map(r => `"${r.student_name||''}","${r.class_name||''}",${r.present||0},${r.absent||0},${r.late||0},${r.total||0},${r.rate||0}`).join('\n');
    this._saveCSV(csv, `attendance_${month||'export'}.csv`);
    Toast.success('Attendance exported!');
  },

  async promoteStudents() {
    const from = document.getElementById('promote-from')?.value;
    const to   = document.getElementById('promote-to')?.value;
    if (!from || !to) { Toast.error('Select both From and To class'); return; }
    if (from === to)  { Toast.error('From and To class must be different'); return; }
    if (!confirm('Promote ALL students from selected class? This cannot be undone.')) return;
    const r = await API.post('/bulk-ops/promote', { fromClassId: from, toClassId: to });
    if (r?.promoted !== undefined) {
      Toast.success(`✅ ${r.promoted} students promoted!`);
    } else Toast.error(r?.error || 'Promotion failed');
  },

  async _download(path, filename) {
    try {
      const token = AppState.token;
      const res = await fetch((window.API_BASE||'https://elimu-saas.onrender.com') + '/api' + path, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'text/csv' }
      });
      if (!res.ok) { Toast.error('Export failed: ' + res.statusText); return; }
      const text = await res.text();
      this._saveCSV(text, filename);
      Toast.success(`✅ ${filename} downloaded!`);
    } catch (e) { Toast.error('Download failed: ' + e.message); }
  },

  _saveCSV(csv, filename) {
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = filename;
    a.click();
  }
};
}
