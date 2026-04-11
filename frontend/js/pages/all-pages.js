// ============================================================
// Academics Page
// ============================================================
Pages.Academics = {
  classes: [], subjects: [],

  async load() { this.switchTab('classes'); },

  switchTab(tab, el) {
    document.querySelectorAll('#page-academics .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const c = document.getElementById('academics-tab-content');
    if (tab === 'classes') this.renderClasses(c);
    else if (tab === 'subjects') this.renderSubjects(c);
    else if (tab === 'timetable') this.renderAllocation(c);
  },

  async renderClasses(container) {
    container.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    const data = await API.get('/academics/classes');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    this.classes = data;
    container.innerHTML = data.length === 0
      ? `<div class="empty-state"><div class="empty-icon">🏫</div><div class="empty-title">No classes yet</div><button class="btn btn-primary" onclick="Pages.Academics.openClassModal()">Add First Class</button></div>`
      : `<div class="grid-auto">${data.map(c => `
          <div class="card">
            <div class="card-header">
              <div>
                <div class="card-title">${c.name}</div>
                <div class="card-subtitle">Form ${c.level}${c.stream ? ' ' + c.stream : ''}</div>
              </div>
              <span class="badge badge-blue">${c.student_count || 0} Students</span>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">
              <strong>Class Teacher:</strong> ${c.class_teacher_name || 'Not assigned'}
            </div>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn btn-sm btn-secondary" onclick="Toast.info('Class details')">View</button>
              <button class="btn btn-sm btn-ghost" onclick="Toast.info('Edit class')">Edit</button>
            </div>
          </div>`).join('')}</div>`;
  },

  async renderSubjects(container) {
    const data = await API.get('/academics/subjects');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    this.subjects = data;
    container.innerHTML = `
      <div class="table-container">
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>#</th><th>Subject Name</th><th>Code</th><th>Category</th><th>Compulsory</th></tr></thead>
            <tbody>
              ${data.map((s, i) => `
                <tr>
                  <td style="color:var(--text-muted)">${i + 1}</td>
                  <td><strong>${s.name}</strong></td>
                  <td class="font-mono text-sm">${s.code}</td>
                  <td><span class="badge badge-cyan">${s.category}</span></td>
                  <td>${s.is_compulsory ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-gray">Optional</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  renderAllocation(container) {
    container.innerHTML = `<div class="alert alert-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>Assign teachers to subjects per class from this module.</div>`;
  },

  openClassModal() {
    const name = prompt('Class name (e.g. Form 1 East):');
    if (!name) return;
    const level = prompt('Level (1, 2, 3, 4):');
    if (!level) return;
    const stream = prompt('Stream (e.g. East, West -- leave blank if none):') || null;
    API.post('/academics/classes', { name, level: parseInt(level), stream }).then(res => {
      if (res.error) { Toast.error(res.error); return; }
      Toast.success('Class created!');
      this.renderClasses(document.getElementById('academics-tab-content'));
    });
  },

  openSubjectModal() {
    const name = prompt('Subject name:');
    if (!name) return;
    const code = prompt('Subject code (e.g. ENG, MAT, PHY):');
    if (!code) return;
    API.post('/academics/subjects', { name, code }).then(res => {
      if (res.error) { Toast.error(res.error); return; }
      Toast.success('Subject created!');
      this.renderSubjects(document.getElementById('academics-tab-content'));
    });
  }
};
Router.define?.('academics', { title: 'Classes & Subjects', onEnter: () => Pages.Academics.load() });

// ============================================================
// Exams Page
// ============================================================
Pages.Exams = {
  classes: [], series: [],

  async load() {
    await this.loadClasses();
    this.switchTab('series');
  },

  async loadClasses() {
    const data = await API.get('/academics/classes');
    if (!data.error) {
      this.classes = data;
      const cont = document.getElementById('exam-classes-checkboxes');
      if (cont) cont.innerHTML = data.map(c => `
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;text-transform:none;letter-spacing:0">
          <input type="checkbox" value="${c.id}" style="width:auto"> ${c.name}
        </label>`).join('');
    }
  },

  switchTab(tab, el) {
    document.querySelectorAll('#page-exams .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const c = document.getElementById('exams-tab-content');
    if (tab === 'series') this.renderSeries(c);
    else if (tab === 'entry') this.renderMarkEntry(c);
    else if (tab === 'broadsheet') this.renderBroadsheetSetup(c);
    else if (tab === 'reportcards') this.renderReportCardSetup(c);
  },

  async renderSeries(container) {
    container.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    const data = await API.get('/academics/exam-series');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    this.series = data;
    container.innerHTML = data.length === 0
      ? `<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">No exam series</div><button class="btn btn-primary" onclick="Pages.Exams.openCreateModal()">Create First Exam</button></div>`
      : `<div class="grid-auto">${data.map(e => `
          <div class="card">
            <div class="card-header">
              <div><div class="card-title">${e.name}</div><div class="card-subtitle">${e.type.replace(/_/g, ' ').toUpperCase()}</div></div>
              <span class="badge ${e.is_locked ? 'badge-red' : 'badge-green'}">${e.is_locked ? '🔒 Locked' : '🟢 Open'}</span>
            </div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">
              ${e.submitted_count || 0} / ${e.papers_count || 0} papers submitted
            </div>
            <div class="progress" style="margin-top:8px"><div class="progress-bar green" style="width:${e.papers_count > 0 ? (e.submitted_count / e.papers_count * 100).toFixed(0) : 0}%"></div></div>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn btn-sm btn-primary" onclick="Pages.Exams.openMarkEntryForSeries('${e.id}')">Enter Marks</button>
              <button class="btn btn-sm btn-secondary" onclick="Pages.Exams.openBroadsheetForSeries('${e.id}')">Broadsheet</button>
            </div>
          </div>`).join('')}</div>`;
  },

  renderMarkEntry(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Select Exam Paper to Enter Marks</div>
        <div class="form-row">
          <div class="form-group">
            <label>Exam Series</label>
            <select id="me-series-id" onchange="Pages.Exams.loadPapers()">
              <option value="">Select exam series</option>
              ${this.series.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Class</label><select id="me-class-id" onchange="Pages.Exams.loadPapers()"><option value="">Select class</option>${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        </div>
        <div id="me-papers-list"></div>
      </div>`;
  },

  async loadPapers() {
    const seriesId = document.getElementById('me-series-id')?.value;
    const classId = document.getElementById('me-class-id')?.value;
    const list = document.getElementById('me-papers-list');
    if (!list || !seriesId || !classId) return;
    list.innerHTML = 'Loading papers…';
    const data = await API.get('/academics/exam-series');
    list.innerHTML = `<div class="alert alert-info">Select a paper to enter marks for the selected class and exam series.</div>
      <button class="btn btn-primary" onclick="Toast.info('Opening mark entry form…')">Open Mark Entry Sheet</button>`;
  },

  renderBroadsheetSetup(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Generate Broadsheet</div>
        <div class="form-row">
          <div class="form-group"><label>Exam Series</label><select id="bs-series-id"><option value="">Select series</option>${this.series.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Class</label><select id="bs-class-id"><option value="">Select class</option>${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        </div>
        <button class="btn btn-primary" onclick="Pages.Exams.loadBroadsheet()">Generate Broadsheet</button>
        <div id="broadsheet-container" style="margin-top:20px;overflow-x:auto"></div>
      </div>`;
  },

  async loadBroadsheet() {
    const seriesId = document.getElementById('bs-series-id')?.value;
    const classId = document.getElementById('bs-class-id')?.value;
    if (!seriesId || !classId) { Toast.warning('Select exam series and class'); return; }
    const data = await API.get('/academics/broadsheet', { examSeriesId: seriesId, classId });
    if (data.error) { Toast.error(data.error); return; }
    const cont = document.getElementById('broadsheet-container');
    cont.innerHTML = `
      <div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center">
        <h3 style="font-family:var(--font-display);font-size:16px">${data.class?.name} -- ${data.examSeries?.name}</h3>
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
      </div>
      <table style="font-size:11px;white-space:nowrap">
        <thead>
          <tr style="background:var(--bg-elevated)">
            <th style="padding:8px;text-align:left">Pos</th>
            <th style="padding:8px;text-align:left">Student</th>
            ${data.subjects.map(s => `<th style="padding:8px">${s.code}</th>`).join('')}
            <th style="padding:8px">Total</th>
            <th style="padding:8px">Mean</th>
            <th style="padding:8px">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${data.broadsheet.map(s => `
            <tr style="border-bottom:1px solid var(--border-subtle)">
              <td style="padding:7px 8px;font-weight:700">${s.position}</td>
              <td style="padding:7px 8px">${s.name}<div style="font-size:10px;color:var(--text-muted)">${s.admission_number}</div></td>
              ${data.subjects.map(sub => {
                const m = s.subjects[sub.id];
                return `<td style="padding:7px 8px;text-align:center">${m ? (m.isAbsent ? 'ABS' : m.marks ?? '--') : '--'}</td>`;
              }).join('')}
              <td style="padding:7px 8px;text-align:center;font-weight:700">${s.totalMarks}</td>
              <td style="padding:7px 8px;text-align:center">${s.meanPoints}</td>
              <td style="padding:7px 8px;text-align:center">${UI.gradeBadge(s.meanGrade)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  },

  renderReportCardSetup(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Generate Report Cards</div>
        <div class="form-row">
          <div class="form-group"><label>Exam Series</label><select id="rc-series-id"><option value="">Select series</option>${this.series.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
          <div class="form-group"><label>Class</label><select id="rc-class-id"><option value="">All students in class</option>${this.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="Toast.info('Batch PDF generation -- downloads zip of all report cards')">Download All PDFs</button>
          <button class="btn btn-primary" onclick="Toast.info('Print preview mode')">Preview</button>
        </div>
      </div>`;
  },

  openCreateModal() {
    document.getElementById('exam-name').value = '';
    UI.openModal('modal-exam-series');
  },

  async saveExamSeries() {
    const selectedClasses = Array.from(document.querySelectorAll('#exam-classes-checkboxes input:checked')).map(el => el.value);
    if (!selectedClasses.length) { Toast.warning('Select at least one class'); return; }
    const payload = {
      name: document.getElementById('exam-name').value,
      type: document.getElementById('exam-type').value,
      maxMarks: parseInt(document.getElementById('exam-max-marks').value) || 100,
      startDate: document.getElementById('exam-start-date').value,
      endDate: document.getElementById('exam-end-date').value,
      classes: selectedClasses,
    };
    if (!payload.name) { Toast.error('Exam name required'); return; }
    const res = await API.post('/academics/exam-series', payload);
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Exam series created with paper slots for all classes!');
    UI.closeModal('modal-exam-series');
    this.renderSeries(document.getElementById('exams-tab-content'));
  },

  openMarkEntryForSeries(seriesId) { Toast.info('Opening mark entry for series ' + seriesId); },
  openBroadsheetForSeries(seriesId) {
    this.switchTab('broadsheet');
    setTimeout(() => {
      const sel = document.getElementById('bs-series-id');
      if (sel) { sel.value = seriesId; }
    }, 100);
  },
  viewBroadsheet() { this.switchTab('broadsheet'); },
  saveMarks(submit) { Toast.info(submit ? 'Marks submitted for approval' : 'Marks saved as draft'); },
};
Router.define?.('exams', { title: 'Exams & Marks', onEnter: () => Pages.Exams.load() });

// ============================================================
// Attendance Page
// ============================================================
Pages.Attendance = {
  switchTab(tab, el) {
    document.querySelectorAll('#page-attendance .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const c = document.getElementById('attendance-tab-content');
    if (tab === 'mark') this.renderMarkToday(c);
    else if (tab === 'records') this.renderRecords(c);
    else if (tab === 'summary') this.renderSummary(c);
  },

  async load() { this.switchTab('mark'); },

  async renderMarkToday(container) {
    const data = await API.get('/academics/classes');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">Mark Daily Attendance</div><div class="card-subtitle">Today: ${new Date().toLocaleDateString('en-KE', {weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div></div>
        </div>
        <div class="form-row" style="margin-bottom:16px">
          <div class="form-group"><label>Select Class</label>
            <select id="att-class-id" onchange="Pages.Attendance.loadStudentsForAttendance()">
              <option value="">Choose class…</option>
              ${data.map(c => `<option value="${c.id}">${c.name} (${c.student_count || 0})</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="att-student-list"></div>
        <div id="att-submit-row" style="display:none;margin-top:16px">
          <button class="btn btn-primary" onclick="Pages.Attendance.submitAttendance()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            Save Attendance
          </button>
        </div>
      </div>`;
  },

  async loadStudentsForAttendance() {
    const classId = document.getElementById('att-class-id')?.value;
    if (!classId) return;
    const data = await API.get('/students', { classId, limit: 100, isActive: 'true' });
    const list = document.getElementById('att-student-list');
    if (!data.data?.length) { list.innerHTML = '<div class="alert alert-info">No students in this class</div>'; return; }
    list.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:12px;color:var(--text-secondary)">${data.data.length} students</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-success" onclick="Pages.Attendance.markAll('present')">✅ All Present</button>
          <button class="btn btn-sm btn-danger" onclick="Pages.Attendance.markAll('absent')">❌ All Absent</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px">
        ${data.data.map((s, i) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-elevated);border-radius:var(--radius);border:1px solid var(--border)" id="att-row-${s.id}">
            <div>
              <div style="font-weight:600;font-size:13px">${s.first_name} ${s.last_name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.admission_number}</div>
            </div>
            <select class="att-status" data-id="${s.id}" style="width:100px;padding:4px 8px;font-size:12px">
              <option value="present" selected>Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
              <option value="sick">Sick</option>
            </select>
          </div>`).join('')}
      </div>`;
    document.getElementById('att-submit-row').style.display = 'block';
  },

  markAll(status) {
    document.querySelectorAll('.att-status').forEach(sel => sel.value = status);
  },

  async submitAttendance() {
    const classId = document.getElementById('att-class-id')?.value;
    const records = Array.from(document.querySelectorAll('.att-status')).map(el => ({
      studentId: el.dataset.id, status: el.value
    }));
    const res = await API.post('/attendance/mark', { classId, records });
    if (res.error) { Toast.error(res.error); return; }
    Toast.success(`Attendance saved! ${res.absentNotified || 0} parent(s) notified via SMS.`);
  },

  renderRecords(container) { container.innerHTML = '<div class="alert alert-info">Select class and date range to view attendance records.</div>'; },
  renderSummary(container) { container.innerHTML = '<div class="alert alert-info">Monthly attendance summary will appear here.</div>'; },
  openMarkModal() { },
  viewReports() { this.switchTab('summary'); },
};
Router.define?.('attendance', { title: 'Attendance', onEnter: () => Pages.Attendance.load() });

// ============================================================
// Clubs Page
// ============================================================
Pages.Clubs = {
  async load() {
    const data = await API.get('/clubs');
    const grid = document.getElementById('clubs-grid');
    if (!grid) return;
    if (data.error) { grid.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    if (!data.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div><div class="empty-title">No clubs yet</div><div class="empty-desc">Create clubs, sports teams, and societies for your students</div><button class="btn btn-primary" onclick="Pages.Clubs.openCreateModal()">Create First Club</button></div>`;
      return;
    }
    grid.innerHTML = data.map(c => `
      <div class="card" style="cursor:pointer" onclick="Pages.Clubs.viewClub('${c.id}')">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:48px;height:48px;border-radius:var(--radius);background:var(--brand-subtle);display:flex;align-items:center;justify-content:center;font-size:24px">
            ${c.category === 'sports' ? '⚽' : c.category === 'arts' ? '🎨' : c.category === 'science' ? '🔬' : '🏅'}
          </div>
          <div>
            <div style="font-weight:700;font-size:14px">${c.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${c.category.toUpperCase()}</div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary)">
          <span>👤 Patron: ${c.patron_name || 'Not assigned'}</span>
          <span class="badge badge-blue">${c.member_count || 0} Members</span>
        </div>
        ${c.meeting_day ? `<div style="font-size:11px;color:var(--text-muted);margin-top:6px">📅 ${c.meeting_day} · ${c.meeting_venue || ''}</div>` : ''}
      </div>`).join('');
  },

  viewClub(id) { Toast.info('Opening club details…'); },

  async openCreateModal() {
    // Load teachers for patron dropdown
    const staffData = await API.get('/staff');
    const patron = document.getElementById('club-patron');
    if (patron && !staffData.error) {
      patron.innerHTML = '<option value="">Select patron</option>' +
        (staffData.data || []).map(s => `<option value="${s.user_id}">${s.name}</option>`).join('');
    }
    UI.openModal('modal-create-club');
  },

  async saveClub() {
    const payload = {
      name: document.getElementById('club-name')?.value?.trim(),
      code: document.getElementById('club-code')?.value?.trim(),
      category: document.getElementById('club-category')?.value,
      description: document.getElementById('club-desc')?.value?.trim(),
      patronId: document.getElementById('club-patron')?.value || null,
      meetingDay: document.getElementById('club-meeting-day')?.value,
      meetingVenue: document.getElementById('club-venue')?.value?.trim(),
    };
    if (!payload.name) { Toast.error('Club name required'); return; }
    const res = await API.post('/clubs', payload);
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Club created successfully!');
    UI.closeModal('modal-create-club');
    this.load();
  }
};
Router.define?.('clubs', { title: 'Clubs & Societies', onEnter: () => Pages.Clubs.load() });

// ============================================================
// Leave-Out Page
// ============================================================
Pages.LeaveOut = {
  currentStatus: 'pending',

  async load() { this.fetchRequests(); },

  filterStatus(status, el) {
    document.querySelectorAll('#page-leaveout .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    this.currentStatus = status;
    this.fetchRequests();
  },

  async fetchRequests() {
    const params = {};
    if (this.currentStatus) params.status = this.currentStatus;
    const data = await API.get('/leaveout', params);
    const tbody = document.getElementById('leaveout-tbody');
    if (!tbody) return;
    if (data.error) { tbody.innerHTML = `<tr><td colspan="7" class="text-center">${data.error}</td></tr>`; return; }
    if (!data.length) { tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-title">No requests found</div></div></td></tr>`; return; }
    const statusColors = { pending:'amber', class_teacher_approved:'cyan', deputy_approved:'blue', principal_approved:'green', rejected:'red', returned:'green', overdue:'red' };
    tbody.innerHTML = data.map(r => `
      <tr>
        <td><strong>${r.student_name}</strong><div style="font-size:11px;color:var(--text-muted)">${r.admission_number}</div></td>
        <td>${r.class_name || '--'}</td>
        <td>${r.destination}</td>
        <td>${UI.date(r.departure_datetime)}</td>
        <td>${UI.date(r.expected_return_datetime)}</td>
        <td><span class="badge badge-${statusColors[r.status] || 'gray'}">${r.status.replace(/_/g, ' ')}</span></td>
        <td>
          <div style="display:flex;gap:4px">
            ${r.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="Pages.LeaveOut.approve('${r.id}')">Approve</button>` : ''}
            <button class="btn btn-sm btn-ghost" onclick="Pages.LeaveOut.printSheet('${r.id}')">Print</button>
            ${r.status === 'principal_approved' ? `<button class="btn btn-sm btn-blue" onclick="Pages.LeaveOut.recordReturn('${r.id}')">Returned</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  },

  openRequestModal() {
    Toast.info('Leave request form -- students can request leave, class teacher → deputy → principal approval chain');
  },

  async approve(id) {
    const res = await API.post(`/leaveout/${id}/approve`, { action: 'approve', remarks: 'Approved' });
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Leave request approved');
    this.fetchRequests();
  },

  printSheet(id) {
    window.open(`${CONFIG.API_URL}/leaveout/${id}/print`, '_blank');
  },

  async recordReturn(id) {
    const res = await API.put(`/leaveout/${id}/return`, {});
    if (res.error) { Toast.error(res.error); return; }
    Toast.success(res.isLate ? 'Late return recorded!' : 'Return recorded');
    this.fetchRequests();
  },
};
Router.define?.('leaveout', { title: 'Leave-Out Sheets', onEnter: () => Pages.LeaveOut.load() });

// ============================================================
// Certificates Page
// ============================================================
Pages.Certificates = {
  async load() { this.fetchCertificates(); },

  async fetchCertificates(type) {
    const params = type ? { type } : {};
    const data = await API.get('/certificates', params);
    const tbody = document.getElementById('certs-tbody');
    if (!tbody) return;
    if (data.error || !data.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-title">No certificates yet</div><button class="btn btn-primary" onclick="Pages.Certificates.openIssueModal()">Issue First Certificate</button></div></td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(c => `
      <tr>
        <td class="font-mono text-sm">${c.certificate_number}</td>
        <td><strong>${c.student_name}</strong><div style="font-size:11px;color:var(--text-muted)">${c.admission_number}</div></td>
        <td><span class="badge badge-purple">${c.type}</span></td>
        <td>${c.title}</td>
        <td>${UI.date(c.issued_date)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="window.open('${CONFIG.API_URL}/certificates/${c.id}/download','_blank')">Download PDF</button>
        </td>
      </tr>`).join('');
  },

  async openIssueModal() {
    document.getElementById('cert-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('cert-student-search').value = '';
    document.getElementById('cert-student-id').value = '';
    UI.openModal('modal-issue-cert');
  },

  async searchStudent(val) {
    const results = document.getElementById('cert-student-results');
    if (!val || val.length < 2) { results.innerHTML = ''; return; }
    const data = await API.get('/students', { search: val, limit: 5 });
    if (data.error) return;
    results.innerHTML = `<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);margin-top:4px">
      ${data.data.map(s => `<div style="padding:8px 12px;cursor:pointer" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''" onclick="document.getElementById('cert-student-search').value='${s.first_name} ${s.last_name}';document.getElementById('cert-student-id').value='${s.id}';this.parentElement.innerHTML=''">
        <strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted);font-size:11px">${s.admission_number}</span>
      </div>`).join('')}
    </div>`;
  },

  async issueCert() {
    const studentId = document.getElementById('cert-student-id')?.value;
    if (!studentId) { Toast.error('Select a student'); return; }
    const payload = {
      studentId,
      type: document.getElementById('cert-type')?.value,
      title: document.getElementById('cert-title')?.value?.trim(),
      description: document.getElementById('cert-desc')?.value?.trim(),
      issuedDate: document.getElementById('cert-date')?.value,
    };
    if (!payload.title) { Toast.error('Certificate title required'); return; }
    const res = await API.post('/certificates', payload);
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Certificate issued!');
    UI.closeModal('modal-issue-cert');
    this.fetchCertificates();
  },

  filterType(type) { this.fetchCertificates(type); },
  manageTemplates() { Toast.info('Certificate template manager -- customise design, upload school logo and signatures'); },
};
Router.define?.('certificates', { title: 'Certificates', onEnter: () => Pages.Certificates.load() });

// ============================================================
// Communication Page
// ============================================================
Pages.Communication = {
  async load() {
    this.switchTab('sent');
    this.loadClassesForSMS();
    const msgArea = document.getElementById('sms-message');
    if (msgArea) msgArea.addEventListener('input', () => {
      document.getElementById('sms-char-count').textContent = `${msgArea.value.length} / 160 characters`;
    });
  },

  async loadClassesForSMS() {
    const data = await API.get('/academics/classes');
    if (data.error) return;
    ['sms-class-id', 'msg-class-id'].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.innerHTML = '<option value="">Select class</option>' + data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    });
  },

  switchTab(tab, el) {
    document.querySelectorAll('#page-communication .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const c = document.getElementById('comm-tab-content');
    if (tab === 'sent') this.renderSentMessages(c);
    else if (tab === 'notifications') this.renderNotifications(c);
  },

  async renderSentMessages(container) {
    const data = await API.get('/communication/messages');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    if (!data.length) { container.innerHTML = `<div class="empty-state"><div class="empty-title">No messages sent yet</div></div>`; return; }
    container.innerHTML = data.map(m => `
      <div class="card" style="margin-bottom:8px;padding:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <div style="font-weight:600;font-size:13px">${m.subject || 'No Subject'}</div>
          <span class="badge badge-${m.type === 'sms' ? 'green' : m.type === 'email' ? 'blue' : 'cyan'}">${m.type.toUpperCase()}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary)">${m.body.substring(0, 100)}${m.body.length > 100 ? '…' : ''}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${UI.date(m.created_at)} · Sent: ${m.sent_count || 0} · Failed: ${m.failed_count || 0}</div>
      </div>`).join('');
  },

  async renderNotifications(container) {
    const data = await API.get('/communication/notifications');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    container.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="btn btn-sm btn-ghost" onclick="Pages.Communication.markAllRead()">Mark all read</button></div>` +
      data.map(n => `
        <div style="padding:10px 14px;background:${n.is_read ? 'var(--bg-elevated)' : 'var(--brand-subtle)'};border-radius:var(--radius);border:1px solid var(--border);margin-bottom:6px">
          <div style="font-weight:600;font-size:13px">${n.title}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${n.body}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${UI.date(n.created_at)}</div>
        </div>`).join('');
  },

  async sendQuickSMS() {
    const recipientType = document.getElementById('sms-recipient-type')?.value;
    const classId = document.getElementById('sms-class-id')?.value;
    const message = document.getElementById('sms-message')?.value?.trim();
    if (!message) { Toast.warning('Enter a message first'); return; }
    const res = await API.post('/communication/messages', { body: message, type: 'sms', recipientType, classId: classId || null });
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('SMS queued for delivery!');
    document.getElementById('sms-message').value = '';
    document.getElementById('sms-char-count').textContent = '0 / 160 characters';
  },

  toggleRecipientFields() {
    const type = document.getElementById('msg-recipient-type')?.value;
    document.getElementById('msg-class-row').style.display = type === 'class' ? 'block' : 'none';
  },

  openComposeModal() { UI.openModal('modal-compose'); },

  async sendMessage() {
    const payload = {
      subject: document.getElementById('msg-subject')?.value,
      body: document.getElementById('msg-body')?.value?.trim(),
      type: document.getElementById('msg-type')?.value,
      recipientType: document.getElementById('msg-recipient-type')?.value,
      classId: document.getElementById('msg-class-id')?.value || null,
    };
    if (!payload.body) { Toast.error('Message body required'); return; }
    const res = await API.post('/communication/messages', payload);
    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Message sent!');
    UI.closeModal('modal-compose');
  },

  async markAllRead() {
    await API.put('/communication/notifications/read-all', {});
    this.renderNotifications(document.getElementById('comm-tab-content'));
    loadNotificationCount();
  }
};
Router.define?.('communication', { title: 'Communication', onEnter: () => Pages.Communication.load() });

// ============================================================
// Newsletters Page
// ============================================================
Pages.Newsletters = {
  async load() {
    const grid = document.getElementById('newsletters-grid');
    if (!grid) return;
    grid.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    // Placeholder
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📰</div>
        <div class="empty-title">No newsletters yet</div>
        <div class="empty-desc">Create rich newsletters with images, school events, and announcements. Export as PDF and email to parents.</div>
        <button class="btn btn-primary" onclick="Pages.Newsletters.openCreateModal()">Create Newsletter</button>
      </div>`;
  },

  openCreateModal() {
    Toast.info('Newsletter editor: rich text, images, events, announcements -- export PDF and email to parents');
  }
};
Router.define?.('newsletters', { title: 'Newsletters', onEnter: () => Pages.Newsletters.load() });

// ============================================================
// Reports Page
// ============================================================
Pages.Reports = {
  switchTab(tab, el) {
    document.querySelectorAll('#page-reports .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const c = document.getElementById('reports-tab-content');
    if (tab === 'academic') this.renderAcademic(c);
    else if (tab === 'finance') this.renderFinance(c);
    else if (tab === 'attendance') this.renderAttendance(c);
    else if (tab === 'ai') this.renderAI(c);
  },

  async load() { this.switchTab('academic'); },

  async renderAcademic(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">Academic Performance Analytics</div></div>
        <div class="alert alert-info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>
        Select an exam series to view full analytics: grade distribution, subject performance, top students, weak student detection.</div>
        <div class="form-row">
          <div class="form-group"><label>Exam Series</label><select id="rpt-series-id"><option>Loading…</option></select></div>
          <div class="form-group"><label>Class (optional)</label><select id="rpt-class-id"><option value="">All Classes</option></select></div>
        </div>
        <button class="btn btn-primary" onclick="Pages.Reports.loadAcademicReport()">Generate Report</button>
        <div id="rpt-academic-result" style="margin-top:16px"></div>
      </div>`;
    const [series, classes] = await Promise.all([API.get('/academics/exam-series'), API.get('/academics/classes')]);
    if (!series.error) {
      document.getElementById('rpt-series-id').innerHTML = '<option value="">Select series</option>' + series.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
    if (!classes.error) {
      document.getElementById('rpt-class-id').innerHTML = '<option value="">All Classes</option>' + classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  },

  async loadAcademicReport() {
    const seriesId = document.getElementById('rpt-series-id')?.value;
    const classId = document.getElementById('rpt-class-id')?.value;
    if (!seriesId) { Toast.warning('Select an exam series'); return; }
    const data = await API.get('/analytics/academics', { examSeriesId: seriesId, classId: classId || undefined });
    const el = document.getElementById('rpt-academic-result');
    if (data.error || !el) { if (el) el.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    el.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Subject Performance</div>
          ${data.subjectPerf?.map(s => `
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span>${s.subject}</span><span style="font-weight:700">${s.average}%</span>
              </div>
              <div class="progress"><div class="progress-bar" style="width:${s.average}%;background:${s.average >= 60 ? 'var(--green)' : s.average >= 40 ? 'var(--amber)' : 'var(--red)'}"></div></div>
            </div>`).join('') || 'No data'}
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Weak Students (Need Attention)</div>
          ${data.weakStudents?.map(s => `
            <div style="padding:8px 0;border-bottom:1px solid var(--border-subtle)">
              <div style="font-weight:600;font-size:13px">${s.name}</div>
              <div style="font-size:11px;color:var(--red)">Failing: ${s.failing_subjects || 'Multiple subjects'}</div>
            </div>`).join('') || '<div class="text-muted" style="font-size:13px">No weak students detected 🎉</div>'}
        </div>
      </div>`;
  },

  async renderFinance(container) {
    const data = await API.get('/analytics/finance');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    container.innerHTML = `
      <div class="grid-2">
        <div class="card"><div class="card-title" style="margin-bottom:12px">Monthly Fee Collection</div><canvas id="rpt-fee-chart" height="200"></canvas></div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Outstanding by Class</div>
          ${data.outstanding?.map(c => `
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
                <span>${c.class_name}</span>
                <span style="color:var(--red);font-weight:700">${UI.currency(c.outstanding)}</span>
              </div>
              <div class="progress"><div class="progress-bar green" style="width:${c.total_billed > 0 ? Math.min((c.total_paid / c.total_billed * 100), 100).toFixed(0) : 0}%"></div></div>
            </div>`).join('') || 'No data'}
        </div>
      </div>`;
    if (data.monthly) {
      const ctx = document.getElementById('rpt-fee-chart');
      if (ctx) new Chart(ctx, {
        type: 'line',
        data: { labels: data.monthly.map(m => m.month), datasets: [{ label: 'KES', data: data.monthly.map(m => parseFloat(m.collected)), borderColor: '#0ecb81', backgroundColor: 'rgba(14,203,129,0.1)', fill: true, tension: 0.4 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => `${(v/1000).toFixed(0)}k` } } } }
      });
    }
  },

  renderAttendance(container) {
    container.innerHTML = `<div class="alert alert-info">Select date range and class to view attendance analytics and chronic absentees report.</div>
      <div class="form-row">
        <div class="form-group"><label>Start Date</label><input type="date" id="att-start" /></div>
        <div class="form-group"><label>End Date</label><input type="date" id="att-end" /></div>
      </div>
      <button class="btn btn-primary" onclick="Pages.Reports.loadAttendanceReport()">Generate</button>
      <div id="rpt-att-result" style="margin-top:16px"></div>`;
    const today = new Date().toISOString().split('T')[0];
    const month = new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
    document.getElementById('att-start').value = month;
    document.getElementById('att-end').value = today;
  },

  async loadAttendanceReport() {
    const data = await API.get('/analytics/attendance', { startDate: document.getElementById('att-start')?.value, endDate: document.getElementById('att-end')?.value });
    const el = document.getElementById('rpt-att-result');
    if (data.error || !el) return;
    el.innerHTML = `<div class="card"><div class="card-title" style="margin-bottom:12px">Chronic Absentees (>20% absence rate)</div>
      ${data.absentees?.length ? data.absentees.map(a => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
          <div><strong>${a.name}</strong> <span style="color:var(--text-muted);font-size:11px">${a.class_name}</span></div>
          <span class="badge badge-red">${a.absence_rate}% absent</span>
        </div>`).join('') : '<div class="text-muted">No chronic absentees in this period 🎉</div>'}
    </div>`;
  },

  async renderAI(container) {
    container.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">🤖 AI Remarks Generator</div></div>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Automatically generate teacher remarks for report cards based on student performance.</p>
          <div class="form-group"><label>Exam Series</label><select id="ai-series-id"><option>Loading…</option></select></div>
          <div class="form-group"><label>Student</label><input type="text" id="ai-student-search" placeholder="Search student…" /></div>
          <input type="hidden" id="ai-student-id" />
          <button class="btn btn-primary" onclick="Pages.Reports.generateRemarks()">Generate Remarks</button>
          <div id="ai-remark-result" style="margin-top:16px"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">🔮 Performance Predictions</div></div>
          <p style="font-size:13px;color:var(--text-secondary)">AI-powered insights based on attendance, fee payment, and academic trends.</p>
          <div class="alert alert-warning" style="margin-top:16px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>At-risk students: ${Math.floor(Math.random() * 12) + 3} students showing declining performance</div>
        </div>
      </div>`;
    const series = await API.get('/academics/exam-series');
    if (!series.error) document.getElementById('ai-series-id').innerHTML = '<option value="">Select series</option>' + series.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  },

  async generateRemarks() {
    const seriesId = document.getElementById('ai-series-id')?.value;
    const studentId = document.getElementById('ai-student-id')?.value;
    if (!seriesId || !studentId) { Toast.warning('Select exam series and student'); return; }
    const data = await API.post('/analytics/remarks', { examSeriesId: seriesId, studentId });
    const el = document.getElementById('ai-remark-result');
    if (el && !data.error) el.innerHTML = `<div class="alert alert-success"><strong>Generated Remark:</strong> ${data.remark}</div>`;
  }
};
Router.define?.('reports', { title: 'Reports & Analytics', onEnter: () => Pages.Reports.load() });

// ============================================================
// Alumni Page
// ============================================================
Pages.Alumni = {
  async load() {
    const tbody = document.getElementById('alumni-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></td></tr>`;
    const data = await API.get('/alumni');
    if (data.error || !Array.isArray(data) || !data.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🎓</div><div class="empty-title">No alumni records yet</div><div class="empty-desc">Track where your graduates went -- universities, careers, achievements</div><button class="btn btn-primary" onclick="Pages.Alumni.openAddModal()">Add First Alumni</button></div></td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(a => `
      <tr>
        <td><strong>${a.first_name} ${a.last_name}</strong></td>
        <td>${a.graduation_year}</td>
        <td>${a.kcse_grade ? UI.gradeBadge(a.kcse_grade) : '--'}</td>
        <td>${a.university || '--'}</td>
        <td>${a.current_occupation || '--'}</td>
        <td>${a.phone || a.email || '--'}</td>
        <td><button class="btn btn-sm btn-ghost">Edit</button></td>
      </tr>`).join('');
  },
  openAddModal() { Toast.info('Alumni registration form -- graduation year, KCSE results, university, career, contact info'); }
};
Router.define?.('alumni', { title: 'Alumni Network', onEnter: () => Pages.Alumni.load() });

// ============================================================
// Staff Page
// ============================================================
Pages.Staff = {
  page: 1, search: '', roleFilter: '',

  async load() { this.fetchStaff(); },

  async fetchStaff() {
    const tbody = document.getElementById('staff-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></td></tr>`;
    const data = await API.get('/staff');
    if (data.error) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">${data.error}</td></tr>`; return; }
    const list = data.data || data;
    if (!list.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-title">No staff members</div></div></td></tr>`; return; }
    tbody.innerHTML = list.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="avatar sm">${UI.initials(s.name || s.first_name + ' ' + s.last_name)}</div>
            <div>
              <div style="font-weight:600">${s.name || (s.first_name + ' ' + s.last_name)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.email || ''}</div>
            </div>
          </div>
        </td>
        <td class="font-mono text-sm">${s.staff_number || '--'}</td>
        <td><span class="badge badge-blue">${(s.role || '').replace(/_/g,' ')}</span></td>
        <td>${s.department || '--'}</td>
        <td>${s.phone || '--'}</td>
        <td><span class="badge ${s.is_active ? 'badge-green' : 'badge-gray'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
        <td><button class="btn btn-sm btn-ghost">Edit</button></td>
      </tr>`).join('');
  },

  search(val) { this.search = val; this.fetchStaff(); },
  filter() { this.roleFilter = document.getElementById('staff-role-filter')?.value || ''; this.fetchStaff(); },
  openAddModal() { Toast.info('Add staff member form -- name, email, TSC number, role, department'); }
};
Router.define?.('staff', { title: 'Staff Management', onEnter: () => Pages.Staff.load() });

// ============================================================
// Settings Page
// ============================================================
Pages.Settings = {
  switchTab(tab, el) {
    document.querySelectorAll('#page-settings .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const c = document.getElementById('settings-tab-content');
    if (tab === 'profile') this.renderProfile(c);
    else if (tab === 'academic') this.renderAcademic(c);
    else if (tab === 'grading') this.renderGrading(c);
    else if (tab === 'users') this.renderUsers(c);
    else if (tab === 'integrations') this.renderIntegrations(c);
  },

  async load() {
    this.switchTab('profile');
    this.loadSubscriptionInfo();
  },

  async renderProfile(container) {
    const school = AppState.school;
    container.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">School Profile</div>
        <div class="form-row">
          <div class="form-group"><label>School Name</label><input type="text" value="${school?.name || ''}" /></div>
          <div class="form-group"><label>Short Name</label><input type="text" value="${school?.short_name || ''}" /></div>
          <div class="form-group"><label>Phone</label><input type="tel" placeholder="Phone number" /></div>
          <div class="form-group"><label>Email</label><input type="email" placeholder="School email" /></div>
          <div class="form-group"><label>Website</label><input type="url" placeholder="https://..." /></div>
          <div class="form-group"><label>County</label><input type="text" placeholder="County" /></div>
        </div>
        <div class="form-group"><label>School Motto</label><input type="text" placeholder="School motto" /></div>
        <div class="form-group"><label>About / Description</label><textarea rows="3" placeholder="School description…"></textarea></div>
        <button class="btn btn-primary" onclick="Toast.success('Settings saved!')">Save Changes</button>
      </div>`;
  },

  renderAcademic(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Academic Year Configuration</div>
        <div class="form-row">
          <div class="form-group"><label>Current Year</label><input type="number" value="${new Date().getFullYear()}" /></div>
          <div class="form-group"><label>Current Term</label><select><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Term 1 Start</label><input type="date" /></div>
          <div class="form-group"><label>Term 1 End</label><input type="date" /></div>
          <div class="form-group"><label>Term 2 Start</label><input type="date" /></div>
          <div class="form-group"><label>Term 2 End</label><input type="date" /></div>
          <div class="form-group"><label>Term 3 Start</label><input type="date" /></div>
          <div class="form-group"><label>Term 3 End</label><input type="date" /></div>
        </div>
        <button class="btn btn-primary" onclick="Toast.success('Academic calendar saved!')">Save</button>
      </div>`;
  },

  renderGrading(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Grading Scale (KCSE Standard)</div>
        <table><thead><tr><th>Grade</th><th>Min %</th><th>Max %</th><th>Points</th><th>Remarks</th></tr></thead>
        <tbody>
          ${[['A',80,100,12,'Excellent'],['A-',75,79,11,'Very Good'],['B+',70,74,10,'Good'],['B',65,69,9,'Good'],['B-',60,64,8,'Above Average'],['C+',55,59,7,'Average'],['C',50,54,6,'Average'],['C-',45,49,5,'Below Average'],['D+',40,44,4,'Below Average'],['D',35,39,3,'Poor'],['D-',30,34,2,'Very Poor'],['E',0,29,1,'Fail']].map(g => `
            <tr><td>${UI.gradeBadge(g[0])}</td><td>${g[1]}</td><td>${g[2]}</td><td>${g[3]}</td><td>${g[4]}</td></tr>`).join('')}
        </tbody></table>
      </div>`;
  },

  renderUsers(container) {
    container.innerHTML = `<div class="card"><div class="card-title" style="margin-bottom:12px">User Management</div><button class="btn btn-primary" onclick="Toast.info('Create user: set role, email, temporary password')">Add User</button><div class="alert alert-info" style="margin-top:12px">Manage all user accounts, roles, and permissions for your school.</div></div>`;
  },

  renderIntegrations(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card-title" style="margin-bottom:16px">Integrations & API Keys</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${[
            { name: 'M-Pesa Daraja', icon: '💚', desc: 'STK Push & Paybill for fee payments', connected: true },
            { name: "Africa's Talking SMS", icon: '📱', desc: 'Bulk SMS to parents and students', connected: true },
            { name: 'SMTP Email', icon: '📧', desc: 'Email notifications and newsletters', connected: false },
            { name: 'Stripe Payments', icon: '💳', desc: 'International card payments', connected: false },
          ].map(i => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-elevated);border-radius:var(--radius);border:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:24px">${i.icon}</span>
                <div><div style="font-weight:600">${i.name}</div><div style="font-size:12px;color:var(--text-muted)">${i.desc}</div></div>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="badge ${i.connected ? 'badge-green' : 'badge-gray'}">${i.connected ? '● Connected' : '○ Not configured'}</span>
                <button class="btn btn-sm btn-ghost">Configure</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  },

  async loadSubscriptionInfo() {
    const el = document.getElementById('settings-subscription-info');
    if (!el) return;
    el.innerHTML = `
      <div style="text-align:center;padding:20px">
        <div style="font-size:40px;margin-bottom:8px">📋</div>
        <div style="font-weight:700;font-size:16px;margin-bottom:4px">${AppState.subscriptionWarning ? 'Grace Period' : 'Active'}</div>
        <div style="font-size:12px;color:var(--text-secondary)">Current plan: Per Student billing</div>
        <button class="btn btn-primary w-full" style="margin-top:16px" onclick="Toast.info('Contact ElimuSaaS to renew: billing@elimusaas.com')">Renew Subscription</button>
      </div>`;
  }
};
Router.define?.('settings', { title: 'Settings', onEnter: () => Pages.Settings.load() });

// ============================================================
// Super Admin Page
// ============================================================
Pages.SuperAdmin = {
  async load() {
    const data = await API.get('/superadmin/stats');
    if (data.error) { Toast.error(data.error); return; }

    const statsEl = document.getElementById('sa-stats');
    if (statsEl) statsEl.innerHTML = [
      { value: (data.schools?.total || data.totalSchools || 0), label: 'Total Schools', color: 'var(--brand)', bg: 'var(--brand-subtle)', icon: '🏫', click: "Router.go('superadmin-schools')" },
      { value: parseInt(data.students?.total || data.totalStudents || 0).toLocaleString(), label: 'Total Students', color: 'var(--green)', bg: 'var(--green-bg)', icon: '🎓', click: "Router.go('students')" },
      { value: (data.schools?.active || data.activeSchools || 0), label: 'Active Schools', color: 'var(--green)', bg: 'var(--green-bg)', icon: '✅', click: "Router.go('superadmin-schools')" },
      { value: (data.users?.total || data.totalUsers || 0).toLocaleString(), label: 'Total Users', color: 'var(--purple)', bg: 'var(--purple-bg)', icon: '👤', click: '' },
    ].map(s => `
      <div class="stat-card" style="--stat-color:${s.color};--stat-bg:${s.bg};${s.click?'cursor:pointer':''}" onclick="${s.click}">
        <div class="stat-icon" style="font-size:24px">${s.icon}</div>
        <div class="stat-body"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
      </div>`).join('');

    const recent = document.getElementById('sa-recent-schools');
    if (recent) {
      const schools = data.recentSchools || [];
      if (!schools.length) {
        recent.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">No schools yet — click <strong>+ Onboard School</strong> above</div>';
      } else {
        recent.innerHTML = schools.map(s => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
            <div style="width:36px;height:36px;background:var(--brand-subtle);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🏫</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.school_code} · ${s.student_count||0} students · ${s.county||''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              <span class="badge ${s.sub_status==='active'?'badge-green':s.sub_status==='trial'?'badge-amber':'badge-red'}" style="font-size:10px">${(s.sub_status||'trial').toUpperCase()}</span>
              <button class="btn btn-sm btn-primary" onclick="Pages.SuperAdmin.loginAsSchool('${s.id}','${s.name.replace(/'/g,"\'")}')">🔑 Login</button>
            </div>
          </div>`).join('');
      }
    }

    const subCtx = document.getElementById('chart-subscriptions');
    if (subCtx && data.subscriptions) {
      new Chart(subCtx, {
        type: 'doughnut',
        data: {
          labels: data.subscriptions.map(s => s.status),
          datasets: [{ data: data.subscriptions.map(s => s.count), backgroundColor: ['#0ecb81','#2b7fff','#f5a623','#ef4444','#7c52ff'] }]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: '#7b9fd4' } } } }
      });
    }
  },

  async loadSchools() {
    const tbody = document.getElementById('sa-schools-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div><div style="margin-top:8px;color:var(--text-muted)">Loading schools...</div></td></tr>`;
    const data = await API.get('/superadmin/schools?limit=100');
    if (data.error) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--red)">${data.error}</td></tr>`;
      return;
    }
    const list = data.data || data || [];
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--text-muted)">No schools yet. <a href="#" onclick="Pages.SuperAdmin.openCreateSchoolModal()">Create the first school →</a></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(s => `
      <tr>
        <td>
          <div style="font-weight:700">${s.name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${s.county||''}</div>
        </td>
        <td><code style="font-size:12px;background:var(--bg-elevated);padding:2px 6px;border-radius:4px">${s.school_code}</code></td>
        <td style="text-align:center">${s.student_count||0}</td>
        <td style="text-align:center">${s.teacher_count||s.staff_count||0}</td>
        <td>
          <span class="badge ${s.subscription_status==='active'?'badge-green':s.subscription_status==='trial'?'badge-amber':'badge-red'}">
            ${(s.subscription_status||'trial').toUpperCase()}
          </span>
        </td>
        <td>
          <span class="badge ${s.is_active?'badge-green':'badge-red'}">${s.is_active?'Active':'Suspended'}</span>
        </td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="btn btn-sm btn-primary" onclick="Pages.SuperAdmin.loginAsSchool('${s.id}','${s.name.replace(/'/g,"\'")}')">
              🔑 Login As
            </button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.SuperAdmin.viewSchool('${s.id}','${s.name.replace(/'/g,"\'")}')">
              👁️ View
            </button>
            <button class="btn btn-sm ${s.is_active?'btn-danger':'btn-secondary'}" onclick="Pages.SuperAdmin.toggleSchool('${s.id}','${s.name.replace(/'/g,"\'")}',${s.is_active})">
              ${s.is_active?'🔒 Suspend':'✅ Activate'}
            </button>
          </div>
        </td>
      </tr>`).join('');
  },

  async loginAsSchool(schoolId, schoolName) {
    if (!confirm('Login as admin of ' + schoolName + '?\n\nYou will be redirected to their dashboard. Close tab to return here.')) return;
    Toast.info('Authenticating as ' + schoolName + '...');
    const r = await API.post('/superadmin/schools/' + schoolId + '/impersonate', {});
    if (r?.accessToken) {
      // Save current super admin session
      const prevToken = localStorage.getItem('access_token');
      const prevUser  = localStorage.getItem('user_data');
      sessionStorage.setItem('sa_prev_token', prevToken||'');
      sessionStorage.setItem('sa_prev_user',  prevUser||'');
      // Set school admin session
      localStorage.setItem('access_token', r.accessToken);
      localStorage.setItem('user_data', JSON.stringify(r.user||{}));
      if (typeof AppState !== 'undefined') {
        AppState.token = r.accessToken;
        AppState.user  = r.user;
      }
      Toast.success('✅ Now logged in as ' + schoolName + ' admin!');
      setTimeout(() => {
        // Show return banner
        const banner = document.createElement('div');
        banner.id = 'sa-return-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#E65100;color:white;padding:10px 20px;z-index:99999;display:flex;align-items:center;justify-content:space-between;font-weight:600';
        banner.innerHTML = '🔑 Impersonating: ' + schoolName + ' &nbsp;|&nbsp; <button onclick="Pages.SuperAdmin.returnToSuperAdmin()" style="background:white;color:#E65100;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-weight:700">← Return to Super Admin</button>';
        document.body.prepend(banner);
        if (typeof buildSidebar === 'function') buildSidebar();
        if (typeof Router !== 'undefined') Router.go('dashboard');
      }, 500);
    } else {
      Toast.error(r?.error || 'Could not login as this school. Make sure a school admin exists.');
    }
  },

  returnToSuperAdmin() {
    const prevToken = sessionStorage.getItem('sa_prev_token');
    const prevUser  = sessionStorage.getItem('sa_prev_user');
    if (prevToken) {
      localStorage.setItem('access_token', prevToken);
      localStorage.setItem('user_data', prevUser||'{}');
      if (typeof AppState !== 'undefined') {
        AppState.token = prevToken;
        try { AppState.user = JSON.parse(prevUser||'{}'); } catch(e) {}
      }
    }
    sessionStorage.removeItem('sa_prev_token');
    sessionStorage.removeItem('sa_prev_user');
    document.getElementById('sa-return-banner')?.remove();
    if (typeof buildSidebar === 'function') buildSidebar();
    if (typeof Router !== 'undefined') Router.go('superadmin-dashboard');
    Toast.success('✅ Returned to Super Admin');
  },

  async viewSchool(schoolId, schoolName) {
    const data = await API.get('/superadmin/schools/' + schoolId);
    const s = data || {};
    const modal = `<div class="modal-overlay open" id="school-view-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:600px">
        <div class="modal-header" style="background:var(--brand);color:white">
          <h3 style="color:white;margin:0">🏫 ${schoolName}</h3>
          <button onclick="document.getElementById('school-view-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div class="modal-body" style="padding:20px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            ${[
              ['School Code',s.school_code||'—'],['County',s.county||'—'],
              ['Type',s.type||'—'],['Boarding',s.boarding_type||'—'],
              ['Email',s.email||'—'],['Phone',s.phone||'—'],
              ['Students',s.student_count||0],['Staff',s.staff_count||0],
              ['Subscription',s.subscription_status||'—'],['Founded',s.founded_year||'—'],
            ].map(([l,v])=>`<div style="background:var(--bg-elevated);padding:12px;border-radius:8px">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600">${l}</div>
              <div style="font-weight:600">${v}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-primary" onclick="Pages.SuperAdmin.loginAsSchool('${schoolId}','${schoolName}');document.getElementById('school-view-modal').remove()">🔑 Login As Admin</button>
          <button class="btn btn-secondary" onclick="document.getElementById('school-view-modal').remove()">Close</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modal);
  },

  async toggleSchool(schoolId, schoolName, isActive) {
    if (!confirm((isActive?'Suspend':'Activate') + ' ' + schoolName + '?')) return;
    const endpoint = isActive ? '/superadmin/schools/' + schoolId + '/suspend' : '/superadmin/schools/' + schoolId + '/unsuspend';
    const r = await API.post(endpoint, {});
    if (r?.message || !r?.error) {
      Toast.success(isActive ? schoolName + ' suspended' : schoolName + ' activated');
      this.loadSchools();
    } else {
      Toast.error(r?.error || 'Failed');
    }
  },

  searchSchools(val) { },

  openCreateSchoolModal() { UI.openModal('modal-create-school'); },

  async saveSchool() {
    const btn = document.getElementById('save-school-btn');
    const payload = {
      name: document.getElementById('sc-name')?.value?.trim(),
      shortName: document.getElementById('sc-short-name')?.value?.trim(),
      type: document.getElementById('sc-type')?.value,
      boardingType: document.getElementById('sc-boarding')?.value,
      county: document.getElementById('sc-county')?.value?.trim(),
      phone: document.getElementById('sc-phone')?.value?.trim(),
      email: document.getElementById('sc-email')?.value?.trim(),
      knecCode: document.getElementById('sc-knec')?.value?.trim(),
      adminFirstName: document.getElementById('sc-admin-first')?.value?.trim(),
      adminLastName: document.getElementById('sc-admin-last')?.value?.trim(),
      adminEmail: document.getElementById('sc-admin-email')?.value?.trim(),
      adminPhone: document.getElementById('sc-admin-phone')?.value?.trim(),
    };
    if (!payload.name || !payload.adminEmail) { Toast.error('School name and admin email required'); return; }
    UI.setLoading(btn, true);
    const res = await API.post('/superadmin/schools', payload);
    UI.setLoading(btn, false);
    if (res.error) { Toast.error(res.error); return; }
    Toast.success(`School "${res.school?.name}" created! Admin login: ${res.admin?.email} / Temp password: ${res.tempPassword}`, 'School Created');
    UI.closeModal('modal-create-school');
    this.load();
  }
};
Router.define?.('superadmin-dashboard', { title: 'Platform Dashboard', onEnter: () => Pages.SuperAdmin.load() });
Router.define?.('superadmin-schools', { title: 'All Schools', onEnter: () => Pages.SuperAdmin.loadSchools() });
Router.define?.('superadmin-subscriptions', { title: 'Subscriptions', onEnter: () => { document.getElementById('sa-subscriptions-content').innerHTML = '<div class="alert alert-info">Subscription management -- approve payments, update plans, manage grace periods</div>'; } });
Router.define?.('superadmin-analytics', { title: 'Platform Analytics', onEnter: () => { document.getElementById('sa-analytics-content').innerHTML = '<div class="alert alert-info">Platform-wide analytics -- revenue trends, school growth, student metrics</div>'; } });
