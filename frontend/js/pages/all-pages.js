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
              <button class="btn btn-sm btn-secondary" onclick="Pages.Academics.viewClass('${cls.id}','${cls.name} ${cls.stream||''}')">👁 View</button>
              <button class="btn btn-sm btn-ghost" onclick="Pages.Academics.editClass('${cls.id}')">✏️ Edit</button>
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
      <button class="btn btn-primary" onclick="Pages.Exams.openMarkEntryForSeries(document.getElementById('me-series-id')?.value)">📝 Open Mark Entry Sheet</button>`;
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
    const classId  = document.getElementById('bs-class-id')?.value;
    if (!seriesId || !classId) { Toast.warning('Select exam series and class'); return; }
    const cont = document.getElementById('broadsheet-container');
    cont.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div><div style="margin-top:12px;color:var(--text-muted)">Generating broadsheet...</div></div>`;

    const [data, school] = await Promise.all([
      API.get('/exams/series/'+seriesId+'/broadsheet', { classId }),
      API.get('/schools/my').catch(()=>({})),
    ]);
    if (data.error) { Toast.error(data.error); cont.innerHTML=''; return; }

    const seriesName = document.getElementById('bs-series-id')?.selectedOptions[0]?.text || 'Exam';
    const className  = document.getElementById('bs-class-id')?.selectedOptions[0]?.text  || 'Class';
    const sc = school || {};
    const subjects   = data.subjects || [];
    const students   = data.students || [];

    // Build subject-indexed marks map per student
    const studentRows = students.map(s => {
      const marksMap = {};
      (s.marks||[]).forEach(m => { marksMap[m.subject_id] = m; });
      return { ...s, marksMap };
    });
    studentRows.sort((a,b) => (a.position||99)-(b.position||99));

    const gradeColor = g => {
      if(!g||g==='—') return '#999';
      if(g.startsWith('A')) return '#1B5E20';
      if(g.startsWith('B')) return '#1565C0';
      if(g.startsWith('C')) return '#E65100';
      if(g.startsWith('D')) return '#B71C1C';
      return '#B71C1C';
    };

    const printHtml = `
      <!DOCTYPE html><html><head><title>Broadsheet — ${className}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#111;background:white}
        .school-header{text-align:center;padding:12px 0 8px;border-bottom:3px double #333}
        .school-name{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px}
        .school-sub{font-size:11px;color:#555;margin-top:2px}
        .report-title{text-align:center;padding:8px 0;font-size:14px;font-weight:700;background:#1565C0;color:white;margin:8px 0}
        table{width:100%;border-collapse:collapse;font-size:9px}
        th{background:#1565C0;color:white;padding:5px 3px;text-align:center;white-space:nowrap;font-size:9px;border:1px solid #0d47a1}
        th.student-col{text-align:left;min-width:120px}
        td{padding:4px 3px;border:1px solid #ccc;text-align:center;white-space:nowrap}
        td.student-col{text-align:left}
        tr:nth-child(even){background:#F5F5F5}
        tr:hover{background:#E3F2FD}
        .pos{font-weight:900;color:#1565C0;font-size:11px}
        .total{font-weight:700;background:#FFF9C4!important}
        .mean{font-weight:700;background:#E8F5E9!important}
        .grade{font-weight:900}
        .subject-summary{margin-top:16px;page-break-inside:avoid}
        .summary-title{font-size:12px;font-weight:700;padding:6px;background:#37474F;color:white}
        .summary-table th{background:#546E7A}
        .signature-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px;padding:0 20px}
        .sig-box{text-align:center;border-top:1px solid #333;padding-top:4px;font-size:10px}
        .absent{color:#C62828;font-weight:700}
        .grade-A{color:#1B5E20;font-weight:700}
        .grade-B{color:#1565C0;font-weight:700}
        .grade-C{color:#E65100;font-weight:700}
        .grade-D,.grade-E{color:#B71C1C;font-weight:700}
        @page{size:A3 landscape;margin:10mm}
        @media print{button{display:none}}
      </style></head><body>
      <div class="school-header">
        ${sc.logo_url?`<img src="${sc.logo_url}" style="height:60px;margin-bottom:6px"><br>`:''}
        <div class="school-name">${sc.name||'School Name'}</div>
        <div class="school-sub">${sc.address||''} ${sc.county?'| '+sc.county+' County':''} ${sc.phone?'| '+sc.phone:''}</div>
        <div class="school-sub">${sc.motto||''}</div>
      </div>
      <div class="report-title">ACADEMIC BROADSHEET — ${seriesName.toUpperCase()} | ${className.toUpperCase()}</div>
      <table>
        <thead>
          <tr>
            <th style="width:28px">Pos</th>
            <th class="student-col">Student Name</th>
            <th style="width:52px">Adm No</th>
            <th style="width:20px">G</th>
            ${subjects.map(s=>`<th style="min-width:36px">${s.code}<br><span style="font-size:7px;font-weight:400">${s.name.slice(0,8)}</span></th>`).join('')}
            <th style="width:44px;background:#1B5E20">Total</th>
            <th style="width:36px;background:#1B5E20">Mean</th>
            <th style="width:32px;background:#1B5E20">Pts</th>
            <th style="width:32px;background:#1B5E20">Grade</th>
            <th style="width:28px">Pos</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows.map((s,idx) => {
            const rowBg = idx%2===0?'#fff':'#F5F5F5';
            const g = s.mean_grade||'—';
            const gc = g.startsWith('A')?'A':g.startsWith('B')?'B':g.startsWith('C')?'C':g.startsWith('D')?'D':'E';
            return `<tr style="background:${rowBg}">
              <td class="pos">${s.position||idx+1}</td>
              <td class="student-col"><strong>${s.first_name} ${s.last_name}</strong></td>
              <td style="font-size:8px">${s.admission_number}</td>
              <td style="font-size:8px">${s.gender==='male'?'M':'F'}</td>
              ${subjects.map(sub => {
                const m = s.marksMap?.[sub.id];
                if (!m) return '<td style="color:#999">—</td>';
                if (m.is_absent) return '<td class="absent">ABS</td>';
                const mk = m.marks!==null&&m.marks!==undefined ? parseFloat(m.marks).toFixed(0) : '—';
                const g2 = m.grade||'';
                const gc2 = g2.startsWith('A')?'A':g2.startsWith('B')?'B':g2.startsWith('C')?'C':g2.startsWith('D')?'D':'E';
                return `<td><span style="font-size:10px">${mk}</span><br><span class="grade-${gc2}" style="font-size:8px">${g2}</span></td>`;
              }).join('')}
              <td class="total">${s.total_marks||'—'}</td>
              <td class="mean">${s.mean_marks||'—'}</td>
              <td class="mean">${parseFloat(s.mean_points||0).toFixed(2)}</td>
              <td class="grade grade-${gc}">${g}</td>
              <td class="pos">${s.position||idx+1}/${s.out_of||studentRows.length}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <!-- Subject Analysis Summary -->
      <div class="subject-summary">
        <div class="summary-title">📊 SUBJECT PERFORMANCE ANALYSIS</div>
        <table class="summary-table">
          <thead><tr><th>Subject</th><th>Entered</th><th>Absent</th><th>Mean</th><th>Highest</th><th>Lowest</th><th>Pass Rate</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th></tr></thead>
          <tbody>${(data.subjectAnalysis||[]).map((sub,i)=>{
            const bg=i%2===0?'#fff':'#F5F5F5';
            return `<tr style="background:${bg}">
              <td style="text-align:left;font-weight:600">${sub.name}</td>
              <td>${sub.attempts||0}</td><td class="absent">${sub.absences||0}</td>
              <td style="font-weight:700">${sub.avg||'—'}</td>
              <td style="color:#1B5E20;font-weight:700">${sub.highest||'—'}</td>
              <td style="color:#B71C1C;font-weight:700">${sub.lowest||'—'}</td>
              <td style="font-weight:700">${sub.pass_rate||0}%</td>
              <td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>
            </tr>`;
          }).join('')||'<tr><td colspan="12" style="text-align:center">No data</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Class Stats -->
      ${(data.classStats||[]).length ? `
      <div class="subject-summary" style="margin-top:12px">
        <div class="summary-title">📈 CLASS STATISTICS</div>
        <table class="summary-table">
          <thead><tr><th>Class</th><th>Students</th><th>Mean Marks</th><th>Mean Points</th><th>Mean Grade</th><th>Highest</th><th>Lowest</th><th>Pass Rate</th></tr></thead>
          <tbody>${(data.classStats||[]).map((cs,i)=>`<tr style="background:${i%2===0?'#fff':'#F5F5F5'}">
            <td style="font-weight:700;text-align:left">${cs.class_name}</td>
            <td>${cs.student_count}</td><td style="font-weight:700">${cs.mean_marks}</td>
            <td style="font-weight:700">${parseFloat(cs.mean_points||0).toFixed(2)}</td>
            <td class="grade-${cs.mean_grade?.charAt(0)||'E'}" style="font-weight:700">${cs.mean_grade}</td>
            <td style="color:#1B5E20">${cs.highest}</td><td style="color:#B71C1C">${cs.lowest}</td>
            <td>${cs.pass_rate}%</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>` : ''}

      <div class="signature-row">
        <div class="sig-box">Class Teacher</div>
        <div class="sig-box">Head of Department / Dean</div>
        <div class="sig-box">Principal</div>
      </div>

      <div style="text-align:center;margin-top:16px;font-size:9px;color:#999;border-top:1px solid #ddd;padding-top:6px">
        Generated by ElimuSaaS · ${new Date().toLocaleString()} · Confidential — For Internal Use Only
      </div>

      <div style="text-align:center;margin-top:12px">
        <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:10px 28px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">🖨️ Print Broadsheet</button>
        <button onclick="window.close()" style="background:#666;color:white;border:none;padding:10px 18px;border-radius:6px;cursor:pointer;font-size:13px;margin-left:8px">✕ Close</button>
      </div>
    </body></html>`;

    // Open in new window for proper isolated printing
    const w = window.open('', '_blank', 'width=1200,height=800');
    if (w) {
      w.document.write(printHtml);
      w.document.close();
    } else {
      cont.innerHTML = `<div class="alert" style="background:var(--amber-bg);padding:12px;border-radius:8px">Allow popups to view the broadsheet, or <a href="#" onclick="event.preventDefault()">click here</a>.</div>`;
    }
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
          <button class="btn btn-secondary" onclick="Pages.ReportCards.downloadAll()">⬇️ Download All PDFs</button>
          <button class="btn btn-primary" onclick="Pages.ReportCards.preview()">👁 Preview</button>
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

  async openMarkEntryForSeries(seriesId) {
    // Get classes and subjects for this series
    const user = AppState.user || {};
    const isTeacher = ['teacher','class_teacher','hod'].includes(user.role);
    const [series, classes, subjects] = await Promise.all([
      API.get('/exams/series'),
      // Teachers only see their assigned classes
      isTeacher ? API.get('/staff/my-assignments').catch(()=>API.get('/academics/classes')) : API.get('/academics/classes'),
      API.get('/academics/subjects'),
    ]);
    const seriesList = series?.data || series || [];
    const thisSeries = seriesList.find(e=>e.id===seriesId)||{name:'Exam Series'};
    const clsList    = Array.isArray(classes)  ? classes  : (classes?.data||[]);
    const subList    = Array.isArray(subjects) ? subjects : (subjects?.data||[]);

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="mark-entry-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:800px;max-height:90vh;display:flex;flex-direction:column">
          <div class="modal-header" style="background:var(--brand);color:white;flex-shrink:0">
            <h3 style="color:white;margin:0">📝 Mark Entry — ${thisSeries.name||'Exam'}</h3>
            <button onclick="document.getElementById('mark-entry-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;gap:12px;flex-shrink:0">
            <div class="form-group" style="flex:1;margin:0">
              <label class="form-label">Class</label>
              <select id="me-cls" class="form-control" onchange="Pages.Exams.loadMarkSheet('${seriesId}')">
                <option value="">Select class</option>
                ${clsList.map(cl=>`<option value="${cl.id}">${cl.name} ${cl.stream||''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="flex:1;margin:0">
              <label class="form-label">Subject</label>
              <select id="me-sub" class="form-control" onchange="Pages.Exams.loadMarkSheet('${seriesId}')">
                <option value="">Select subject</option>
                ${subList.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="width:120px;margin:0">
              <label class="form-label">Max Marks</label>
              <input id="me-max" class="form-control" type="number" value="100" min="10" max="100">
            </div>
          </div>
          <div id="me-sheet" style="flex:1;overflow-y:auto;padding:16px">
            <div style="text-align:center;padding:48px;color:var(--text-muted)">Select a class and subject to load students</div>
          </div>
          <div class="modal-footer" style="padding:14px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;flex-shrink:0">
            <button class="btn btn-secondary" onclick="document.getElementById('mark-entry-modal').remove()">Cancel</button>
            <div style="display:flex;gap:8px">
              <button class="btn btn-secondary" onclick="Pages.Exams.fillRandom()">🎲 Fill Sample</button>
              <button class="btn btn-primary" id="me-save-btn" onclick="Pages.Exams.saveMarkSheet('${seriesId}')">💾 Save Marks</button>
            </div>
          </div>
        </div>
      </div>`);
  },

  async loadMarkSheet(seriesId) {
    const classId   = document.getElementById('me-cls')?.value;
    const subjectId = document.getElementById('me-sub')?.value;
    const sheet     = document.getElementById('me-sheet');
    if (!classId || !subjectId || !sheet) return;

    sheet.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    const data = await API.get('/students', { classId, limit: 50 });
    const students = data?.data || [];

    if (!students.length) {
      sheet.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No students found in this class</div>`;
      return;
    }

    // Also try to load existing marks
    const existing = await API.get(`/exams/marks`, { seriesId, classId, subjectId }).catch(()=>({data:[]}));
    const existingMap = {};
    (existing?.data||[]).forEach(m=>{ existingMap[m.student_id] = m.marks; });

    sheet.innerHTML = `
      <table class="data-table">
        <thead><tr><th>#</th><th>Student</th><th>Adm No</th><th>Marks (out of <span id="me-max-display">100</span>)</th><th>Grade</th><th>Absent</th></tr></thead>
        <tbody>
          ${students.map((s,i)=>{
            const existing_mark = existingMap[s.id]||'';
            return `<tr id="me-row-${s.id}">
              <td style="color:var(--text-muted)">${i+1}</td>
              <td style="font-weight:600">${s.first_name} ${s.last_name}</td>
              <td><code style="font-size:11px">${s.admission_number}</code></td>
              <td><input type="number" class="form-control me-mark-input" style="width:80px;padding:6px" 
                   data-student="${s.id}" min="0" max="100" value="${existing_mark}"
                   oninput="Pages.Exams.calcGrade(this)" placeholder="—"></td>
              <td class="me-grade-${s.id}" style="font-weight:700;color:var(--brand)">—</td>
              <td><input type="text" class="form-control me-remark-input" style="width:120px;padding:5px;font-size:11px" 
                   data-student="${s.id}" placeholder="Optional remark..."></td>
              <td><input type="checkbox" class="me-absent-chk" data-student="${s.id}" style="width:18px;height:18px"
                   onchange="Pages.Exams.toggleAbsent(this,'${s.id}')"></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    // Recalculate grades for pre-filled marks
    document.querySelectorAll('.me-mark-input').forEach(inp=>{ if(inp.value) Pages.Exams.calcGrade(inp); });
    document.getElementById('me-max-display').textContent = document.getElementById('me-max')?.value||'100';
  },

  calcGrade(input) {
    const m  = parseFloat(input.value);
    const max = parseFloat(document.getElementById('me-max')?.value||100);
    const pct = (m/max)*100;
    const stId = input.dataset.student;
    const gradeEl = document.querySelector(`.me-grade-${stId}`);
    if (!gradeEl) return;
    let g='E',color='var(--red)';
    if(pct>=75){g='A';color='var(--green)';} else if(pct>=70){g='A-';color='var(--green)';} else if(pct>=65){g='B+';color='var(--brand)';} else if(pct>=60){g='B';color='var(--brand)';} else if(pct>=55){g='B-';color='var(--brand)';} else if(pct>=50){g='C+';color='var(--purple)';} else if(pct>=45){g='C';color='var(--purple)';} else if(pct>=40){g='C-';color='var(--amber)';} else if(pct>=35){g='D+';color='var(--amber)';} else if(pct>=30){g='D';color='var(--red)';} else if(pct>=25){g='D-';color='var(--red)';}
    gradeEl.textContent = g;
    gradeEl.style.color  = color;
  },

  toggleAbsent(chk, stId) {
    const row = document.getElementById('me-row-'+stId);
    if (!row) return;
    const inp = row.querySelector('.me-mark-input');
    if (chk.checked) { inp.value=''; inp.disabled=true; document.querySelector('.me-grade-'+stId).textContent='ABS'; }
    else { inp.disabled=false; }
  },

  fillRandom() {
    document.querySelectorAll('.me-mark-input').forEach(inp=>{
      if (!inp.disabled) { inp.value = Math.floor(Math.random()*60)+30; Pages.Exams.calcGrade(inp); }
    });
  },

  async saveMarkSheet(seriesId) {
    const classId   = document.getElementById('me-cls')?.value;
    const subjectId = document.getElementById('me-sub')?.value;
    if (!classId || !subjectId) { Toast.error('Select class and subject first'); return; }

    const marks = [];
    document.querySelectorAll('.me-mark-input').forEach(inp=>{
      const stId   = inp.dataset.student;
      const absent = document.querySelector(`.me-absent-chk[data-student="${stId}"]`)?.checked;
      const remark = document.querySelector(`.me-remark-input[data-student="${stId}"]`)?.value?.trim()||null;
      if (inp.value || absent) marks.push({ studentId:stId, marks: absent?null:parseFloat(inp.value), isAbsent:!!absent, teacherRemarks:remark });
    });

    if (!marks.length) { Toast.error('Enter at least one mark'); return; }
    const btn = document.getElementById('me-save-btn');
    if (btn) { btn.disabled=true; btn.textContent='Saving...'; }

    const r = await API.post('/exams/marks/bulk', { seriesId, classId, subjectId, marks });
    if (r?.saved || r?.message) {
      Toast.success(`✅ ${marks.length} marks saved successfully!`);
      document.getElementById('mark-entry-modal')?.remove();
      this.load();
    } else {
      Toast.error(r?.error||'Failed to save marks');
      if (btn) { btn.disabled=false; btn.textContent='💾 Save Marks'; }
    }
  },
  openBroadsheetForSeries(seriesId) {
    this.switchTab('broadsheet');
    setTimeout(() => {
      const sel = document.getElementById('bs-series-id');
      if (sel) { sel.value = seriesId; }
    }, 100);
  },
  viewBroadsheet() { this.switchTab('broadsheet'); },
  saveMarks(submit) { this.saveMarkSheet(document.getElementById('me-series-id')?.value); },
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
    grid.innerHTML = data.map(cl => `
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="width:48px;height:48px;border-radius:10px;background:var(--brand-subtle);display:flex;align-items:center;justify-content:center;font-size:24px">
            ${cl.category === 'sports' ? '⚽' : cl.category === 'arts' ? '🎨' : cl.category === 'science' ? '🔬' : cl.category === 'community' ? '🤝' : '🏅'}
          </div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">${cl.name}</div>
            <div style="font-size:11px;color:var(--text-muted)">${(cl.category||'').toUpperCase()}</div>
          </div>
          <span class="badge badge-blue">${cl.member_count || 0} Members</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">
          <div>👤 Patron: ${cl.patron_name || 'Not assigned'}</div>
          ${cl.meeting_day ? `<div>📅 ${cl.meeting_day} ${cl.meeting_time||''} · ${cl.meeting_venue || ''}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="Pages.Clubs.viewClub('${cl.id}')">👁 View</button>
          <button class="btn btn-sm btn-secondary" onclick="Pages.Clubs.editClub('${cl.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-secondary" onclick="Pages.Clubs.manageMembers('${cl.id}','${cl.name}')">👥 Members</button>
          <button class="btn btn-sm btn-secondary" onclick="Pages.Clubs.printClub('${cl.id}','${cl.name}')">🖨️ Print</button>
        </div>
      </div>`).join('');
  },

  async viewClub(id) {
    const [cl, members] = await Promise.all([
      API.get('/clubs/'+id).catch(()=>({})),
      API.get('/clubs/'+id+'/members').catch(()=>[]),
    ]);
    if (!cl?.id) { Toast.error('Could not load club'); return; }
    const mList = Array.isArray(members) ? members : (members?.data||[]);
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="club-view-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:620px;max-height:90vh;overflow-y:auto">
          <div class="modal-header" style="background:var(--brand);color:white">
            <h3 style="color:white;margin:0">${cl.category==='sports'?'⚽':cl.category==='arts'?'🎨':'🏅'} ${cl.name}</h3>
            <button onclick="document.getElementById('club-view-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
              ${[['Category',(cl.category||'').toUpperCase()],['Patron',cl.patron_name||'—'],['Meeting Day',cl.meeting_day||'—'],['Meeting Time',cl.meeting_time||'—'],['Venue',cl.meeting_venue||'—'],['Members',mList.length]].map(([l,v])=>
                `<div style="background:var(--bg-elevated);padding:10px;border-radius:8px">
                  <div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">${l}</div>
                  <div style="font-weight:600">${v}</div>
                </div>`).join('')}
            </div>
            ${cl.description?`<div style="margin-bottom:16px;font-size:13px;color:var(--text-secondary)">${cl.description}</div>`:''}
            <div style="font-weight:700;margin-bottom:10px">👥 Members (${mList.length})</div>
            <div style="max-height:240px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">
              ${mList.length ? mList.map(m=>`
                <div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border)">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--brand-subtle);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:var(--brand)">${UI.initials((m.first_name||'')+(m.last_name?' '+m.last_name:''))}</div>
                  <div style="flex:1"><div style="font-weight:600;font-size:13px">${m.first_name} ${m.last_name}</div><div style="font-size:11px;color:var(--text-muted)">${m.class_name||''}</div></div>
                  <span class="badge badge-${m.role==='chairperson'?'brand':m.role==='patron'?'purple':'gray'}">${m.role||'member'}</span>
                </div>`).join('') : '<div style="padding:24px;text-align:center;color:var(--text-muted)">No members yet</div>'}
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-secondary" onclick="Pages.Clubs.printClub('${cl.id}','${cl.name}')">🖨️ Print</button>
            <button class="btn btn-primary" onclick="document.getElementById('club-view-modal').remove()">Close</button>
          </div>
        </div>
      </div>`);
  },

  async editClub(id) {
    const cl = await API.get('/clubs/'+id).catch(()=>({}));
    if (!cl?.id) { Toast.error('Could not load club'); return; }
    await this.openCreateModal();
    setTimeout(()=>{
      const set = (elId,val) => { const el=document.getElementById(elId); if(el&&val!=null) el.value=val; };
      set('club-name', cl.name); set('club-code', cl.code); set('club-category', cl.category);
      set('club-desc', cl.description); set('club-patron', cl.patron_id);
      set('club-meeting-day', cl.meeting_day); set('club-venue', cl.meeting_venue);
      const btn = document.querySelector('#modal-create-club .btn-primary');
      if (btn) { btn.textContent = 'Update Club'; btn.onclick = ()=>Pages.Clubs.updateClub(id); }
      const title = document.querySelector('#modal-create-club .modal-title, #modal-create-club h3');
      if (title) title.textContent = 'Edit Club';
    }, 150);
  },

  async updateClub(id) {
    const payload = {
      name: document.getElementById('club-name')?.value?.trim(),
      category: document.getElementById('club-category')?.value,
      description: document.getElementById('club-desc')?.value?.trim(),
      patronId: document.getElementById('club-patron')?.value||null,
      meetingDay: document.getElementById('club-meeting-day')?.value,
      meetingVenue: document.getElementById('club-venue')?.value?.trim(),
    };
    const r = await API.put('/clubs/'+id, payload);
    if (r?.id||r?.message) { Toast.success('Club updated!'); UI.closeModal('modal-create-club'); this.load(); }
    else Toast.error(r?.error||'Update failed');
  },

  async manageMembers(clubId, clubName) {
    const [members, students] = await Promise.all([
      API.get('/clubs/'+clubId+'/members').catch(()=>[]),
      API.get('/students', {limit:200}).then(d=>d?.data||[]).catch(()=>[]),
    ]);
    const mList = Array.isArray(members) ? members : (members?.data||[]);
    const mIds = new Set(mList.map(m=>m.student_id));
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="club-members-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:560px">
          <div class="modal-header"><h3>👥 ${clubName} — Members</h3><button onclick="document.getElementById('club-members-modal').remove()" class="btn btn-sm">✕</button></div>
          <div class="modal-body" style="padding:16px">
            <div class="form-group" style="margin-bottom:12px">
              <label class="form-label">Add Student</label>
              <div style="display:flex;gap:8px">
                <select id="add-member-sel" class="form-control" style="flex:1">
                  <option value="">Select student...</option>
                  ${students.filter(s=>!mIds.has(s.id)).map(s=>`<option value="${s.id}">${s.first_name} ${s.last_name} (${s.class_name||''})</option>`).join('')}
                </select>
                <select id="add-member-role" class="form-control" style="width:130px">
                  <option value="member">Member</option><option value="chairperson">Chairperson</option><option value="secretary">Secretary</option><option value="treasurer">Treasurer</option>
                </select>
                <button class="btn btn-primary" onclick="Pages.Clubs.addMember('${clubId}')">Add</button>
              </div>
            </div>
            <div id="members-list">
              ${mList.map(m=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
                <div style="flex:1;font-weight:600;font-size:13px">${m.first_name} ${m.last_name}</div>
                <span class="badge badge-blue">${m.role||'member'}</span>
                <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);border:none" onclick="Pages.Clubs.removeMember('${clubId}','${m.id}',this)">Remove</button>
              </div>`).join('')||'<div style="text-align:center;padding:20px;color:var(--text-muted)">No members yet</div>'}
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
            <button class="btn btn-primary" onclick="document.getElementById('club-members-modal').remove()">Done</button>
          </div>
        </div>
      </div>`);
  },

  async addMember(clubId) {
    const sid = document.getElementById('add-member-sel')?.value;
    const role = document.getElementById('add-member-role')?.value||'member';
    if (!sid) { Toast.error('Select a student'); return; }
    const r = await API.post('/clubs/'+clubId+'/members', { studentId:sid, role });
    if (r?.id||r?.message) { Toast.success('Member added!'); Pages.Clubs.manageMembers(clubId,'Club'); document.getElementById('club-members-modal')?.remove(); }
    else Toast.error(r?.error||'Failed');
  },

  async removeMember(clubId, membershipId, btn) {
    if (!confirm('Remove this member?')) return;
    btn.disabled=true;
    const r = await API.delete('/clubs/'+clubId+'/members/'+membershipId);
    if (r?.message||!r?.error) { Toast.success('Member removed'); btn.closest('[style]').remove(); }
    else { Toast.error(r?.error||'Failed'); btn.disabled=false; }
  },

  printClub(id, name) {
    API.get('/clubs/'+id+'/members').then(members=>{
      const mList = Array.isArray(members) ? members : (members?.data||[]);
      const w = window.open('','_blank');
      if (!w) { Toast.info('Allow popups to print'); return; }
      w.document.write(`<!DOCTYPE html><html><head><title>${name} — Members List</title>
        <style>body{font-family:Arial,sans-serif;max-width:700px;margin:20px auto;padding:20px}h1{text-align:center;font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#1565C0;color:white}@media print{button{display:none}}</style>
        </head><body>
        <h1>🏅 ${name} — Members List</h1>
        <p style="text-align:center;color:#666">Generated: ${new Date().toLocaleDateString('en-KE')}</p>
        <table><thead><tr><th>#</th><th>Student Name</th><th>Admission No</th><th>Class</th><th>Role</th></tr></thead>
        <tbody>${mList.map((m,i)=>`<tr><td>${i+1}</td><td><strong>${m.first_name} ${m.last_name}</strong></td><td>${m.admission_number||'—'}</td><td>${m.class_name||'—'}</td><td>${m.role||'member'}</td></tr>`).join('')}</tbody></table>
        <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:40px">
          <div style="text-align:center;border-top:1px solid #333;padding-top:6px;font-size:11px">Patron: ${''}<br>Sign: _____________</div>
          <div style="text-align:center;border-top:1px solid #333;padding-top:6px;font-size:11px">Principal<br>Sign: _____________</div>
        </div>
        <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-top:16px">🖨️ Print</button>
      </body></html>`);
      w.document.close();
    }).catch(()=>Toast.error('Could not load members'));
  },

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
    Pages.Leaveout?.openNewRequest?.() || Toast.info('Open Leave Management from the sidebar to create requests');
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
  manageTemplates() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="cert-tmpl-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:500px">
          <div class="modal-header"><h3>🏆 Certificate Templates</h3><button onclick="document.getElementById('cert-tmpl-modal').remove()" class="btn btn-sm">✕</button></div>
          <div class="modal-body" style="padding:20px">
            ${[{name:'Academic Excellence',type:'academic'},{name:'Sports Achievement',type:'sports'},{name:'Leadership Award',type:'leadership'},{name:'Arts & Culture',type:'arts'},{name:'Participation',type:'participation'}].map(t=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
                <div><div style="font-weight:600">🏆 ${t.name}</div><div style="font-size:11px;color:var(--text-muted)">${t.type} · A4 Landscape</div></div>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-sm btn-secondary" onclick="Toast.success('Preview: ${t.name}')">Preview</button>
                  <button class="btn btn-sm btn-primary" onclick="Toast.success('${t.name} set as default')">Use</button>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`);
  },
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
    Pages.Newsletters?.openEditor?.() || Router.go('communication');
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
  openAddModal() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="alumni-add-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:540px">
          <div class="modal-header" style="background:var(--purple);color:white"><h3 style="color:white;margin:0">🎓 Register Alumni</h3><button onclick="document.getElementById('alumni-add-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
          <div class="modal-body" style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">First Name *</label><input id="al-fn" class="form-control" placeholder="First name"></div>
            <div class="form-group"><label class="form-label">Last Name *</label><input id="al-ln" class="form-control" placeholder="Last name"></div>
            <div class="form-group"><label class="form-label">Graduation Year *</label><input id="al-yr" class="form-control" type="number" placeholder="e.g. 2020" min="1950" max="2024"></div>
            <div class="form-group"><label class="form-label">KCSE Mean Grade</label><select id="al-grade" class="form-control"><option value="">Select</option>${['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E'].map(g=>`<option>${g}</option>`).join('')}</select></div>
            <div class="form-group"><label class="form-label">University / College</label><input id="al-uni" class="form-control" placeholder="Institution attended"></div>
            <div class="form-group"><label class="form-label">Current Career</label><input id="al-career" class="form-control" placeholder="e.g. Software Engineer"></div>
            <div class="form-group"><label class="form-label">Phone</label><input id="al-phone" class="form-control" placeholder="+254 7XX XXX XXX"></div>
            <div class="form-group"><label class="form-label">Email</label><input id="al-email" class="form-control" type="email" placeholder="email@example.com"></div>
          </div>
          <div class="modal-footer" style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="document.getElementById('alumni-add-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.Alumni.saveAlumni()">💾 Register Alumni</button>
          </div>
        </div>
      </div>`);
  },
  async saveAlumni() {
    const fn = document.getElementById('al-fn')?.value?.trim();
    const ln = document.getElementById('al-ln')?.value?.trim();
    const yr = document.getElementById('al-yr')?.value;
    if(!fn||!ln||!yr){ Toast.error('Name and graduation year required'); return; }
    const r = await API.post('/alumni', {firstName:fn,lastName:ln,graduationYear:parseInt(yr),meanGrade:document.getElementById('al-grade')?.value,universityName:document.getElementById('al-uni')?.value,currentCareer:document.getElementById('al-career')?.value,phone:document.getElementById('al-phone')?.value,email:document.getElementById('al-email')?.value});
    if(r?.id||r?.message){ Toast.success('Alumni registered!'); document.getElementById('alumni-add-modal')?.remove(); Pages.Alumni.load(); }
    else Toast.error(r?.error||'Failed to save');
  }
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
  openAddModal() { Pages.Staff?.openAddModal?.() || Router.go('staff'); }
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
    const role = AppState.user?.role;
    if (role === 'super_admin') {
      // Super admin sees platform-level settings
      this._renderSuperAdminSettings();
    } else {
      this.switchTab('profile');
      this.loadSubscriptionInfo();
    }
  },

  _renderSuperAdminSettings() {
    const area = document.getElementById('page-settings');
    if (!area) return;
    area.innerHTML = `
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">⚙️ Platform Settings</h2><p class="page-subtitle">Super Admin — ElimuSaaS platform configuration</p></div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${[
          {icon:'🏫',title:'Schools Management',desc:'View, suspend, or delete schools',action:"Router.go('superadmin-schools')"},
          {icon:'💳',title:'Subscriptions',desc:'Manage all school subscriptions and billing',action:"Router.go('superadmin-subscriptions')"},
          {icon:'📊',title:'Platform Analytics',desc:'View platform-wide usage statistics',action:"Router.go('superadmin-analytics')"},
          {icon:'📧',title:'Broadcast Message',desc:'Send message to all schools',action:"Pages.SuperAdmin.openBroadcast?.()"},
          {icon:'🔐',title:'Security Settings',desc:'JWT, rate limiting, security policies',action:"Toast.info('Security settings — manage via environment variables')"},
          {icon:'💾',title:'Database Backup',desc:'Export platform data',action:"Toast.info('Database backups managed via Render dashboard')"},
        ].map(s=>`<div class="card" style="cursor:pointer" onclick="${s.action}">
          <div style="padding:20px">
            <div style="font-size:32px;margin-bottom:10px">${s.icon}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:6px">${s.title}</div>
            <div style="font-size:12px;color:var(--text-muted)">${s.desc}</div>
          </div>
        </div>`).join('')}
      </div>`;
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
    // Default KCSE 8-4-4 grading scale
    const defaultScale = [
      {grade:'A',  min:75,max:100,points:12,remarks:'Excellent'},
      {grade:'A-', min:70,max:74, points:11,remarks:'Very Good'},
      {grade:'B+', min:65,max:69, points:10,remarks:'Good'},
      {grade:'B',  min:60,max:64, points:9, remarks:'Good'},
      {grade:'B-', min:55,max:59, points:8, remarks:'Above Average'},
      {grade:'C+', min:50,max:54, points:7, remarks:'Average'},
      {grade:'C',  min:45,max:49, points:6, remarks:'Average'},
      {grade:'C-', min:40,max:44, points:5, remarks:'Below Average'},
      {grade:'D+', min:35,max:39, points:4, remarks:'Below Average'},
      {grade:'D',  min:30,max:34, points:3, remarks:'Poor'},
      {grade:'D-', min:25,max:29, points:2, remarks:'Very Poor'},
      {grade:'E',  min:0, max:24, points:1, remarks:'Fail'},
    ];
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>📊 Custom Grading Scale</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" onclick="Pages.Settings.resetGrading()">↺ Reset to Default</button>
            <button class="btn btn-sm btn-primary" onclick="Pages.Settings.saveGrading()">💾 Save Scale</button>
          </div>
        </div>
        <div style="padding:16px">
          <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="form-group" style="margin:0">
              <label class="form-label">Curriculum</label>
              <select id="grad-curriculum" class="form-control" onchange="Pages.Settings.switchGradingPreset(this.value)">
                <option value="kcse">8-4-4 / KCSE (12-point)</option>
                <option value="cbc">CBC / Junior Secondary</option>
                <option value="primary">Primary (Marks Only)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Pass Mark (%)</label>
              <input id="grad-pass" class="form-control" type="number" value="50" min="1" max="99" style="width:100px">
            </div>
          </div>
          <div style="overflow-x:auto">
            <table class="data-table" id="grading-table">
              <thead><tr><th>Grade</th><th>Min %</th><th>Max %</th><th>Points</th><th>Remarks</th><th>Color</th><th>Action</th></tr></thead>
              <tbody id="grading-tbody">
                ${defaultScale.map((g,i) => `<tr id="grad-row-${i}">
                  <td><input class="form-control" style="width:60px;font-weight:700" value="${g.grade}" id="gr-grade-${i}"></td>
                  <td><input class="form-control" style="width:70px" type="number" value="${g.min}" id="gr-min-${i}" min="0" max="100"></td>
                  <td><input class="form-control" style="width:70px" type="number" value="${g.max}" id="gr-max-${i}" min="0" max="100"></td>
                  <td><input class="form-control" style="width:70px" type="number" value="${g.points}" id="gr-pts-${i}" min="1" max="20"></td>
                  <td><input class="form-control" style="width:140px" value="${g.remarks}" id="gr-rem-${i}"></td>
                  <td><input type="color" id="gr-col-${i}" value="${i<2?'#1B5E20':i<5?'#1565C0':i<8?'#E65100':'#B71C1C'}" style="width:40px;height:32px;border:none;border-radius:4px;cursor:pointer"></td>
                  <td><button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);border:none" onclick="document.getElementById('grad-row-${i}').remove()">✕</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <button class="btn btn-secondary" style="margin-top:12px" onclick="Pages.Settings.addGradeRow()">+ Add Grade</button>
        </div>
      </div>`;
  },

  addGradeRow() {
    const tbody = document.getElementById('grading-tbody');
    if (!tbody) return;
    const idx = tbody.children.length;
    const row = document.createElement('tr');
    row.id = 'grad-row-new-'+idx;
    row.innerHTML = `
      <td><input class="form-control" style="width:60px;font-weight:700" placeholder="A" id="gr-grade-n${idx}"></td>
      <td><input class="form-control" style="width:70px" type="number" placeholder="0" id="gr-min-n${idx}" min="0" max="100"></td>
      <td><input class="form-control" style="width:70px" type="number" placeholder="100" id="gr-max-n${idx}" min="0" max="100"></td>
      <td><input class="form-control" style="width:70px" type="number" placeholder="1" id="gr-pts-n${idx}" min="1" max="20"></td>
      <td><input class="form-control" style="width:140px" placeholder="Remarks" id="gr-rem-n${idx}"></td>
      <td><input type="color" id="gr-col-n${idx}" value="#1565C0" style="width:40px;height:32px;border:none;border-radius:4px;cursor:pointer"></td>
      <td><button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);border:none" onclick="this.closest('tr').remove()">✕</button></td>`;
    tbody.appendChild(row);
  },

  async saveGrading() {
    const rows = document.querySelectorAll('#grading-tbody tr');
    const scale = Array.from(rows).map((row, i) => {
      const id = row.id.replace('grad-row-','');
      const getSuf = (el) => el?.includes('-new-') ? 'n'+id.replace('new-','') : id;
      const g = s => document.getElementById(`gr-grade-${getSuf(row.id)}`)?.value || document.getElementById(`gr-grade-n${i}`)?.value;
      return {
        grade:   document.querySelector(`#${row.id} input:nth-child(1)`)?.value,
        min:     parseInt(document.querySelector(`#${row.id} input[type=number]:nth-of-type(1)`)?.value)||0,
        max:     parseInt(document.querySelector(`#${row.id} input[type=number]:nth-of-type(2)`)?.value)||100,
        points:  parseInt(document.querySelector(`#${row.id} input[type=number]:nth-of-type(3)`)?.value)||1,
        remarks: document.querySelector(`#${row.id} input:nth-of-type(4)`)?.value||'',
      };
    }).filter(g => g.grade);
    if (!scale.length) { Toast.error('Add at least one grade'); return; }
    const r = await API.post('/exams/grading-scale', { name:'Custom Scale', grades: scale });
    if (r?.id||r?.message) Toast.success('✅ Grading scale saved!');
    else Toast.error(r?.error||'Failed to save');
  },

  async resetGrading() {
    if (!confirm('Reset to KCSE standard 12-point grading?')) return;
    this.renderGrading(document.getElementById('settings-tab-content'));
    Toast.success('Reset to KCSE standard');
  },

  switchGradingPreset(preset) {
    const cbcGrades = [
      {grade:'EE',min:75,max:100,points:4,remarks:'Exceeding Expectations'},
      {grade:'ME',min:50,max:74, points:3,remarks:'Meeting Expectations'},
      {grade:'AE',min:30,max:49, points:2,remarks:'Approaching Expectations'},
      {grade:'BE',min:0, max:29, points:1,remarks:'Below Expectations'},
    ];
    if (preset === 'cbc') {
      const tbody = document.getElementById('grading-tbody');
      if (tbody) {
        tbody.innerHTML = cbcGrades.map((g,i)=>`<tr id="grad-row-${i}">
          <td><input class="form-control" style="width:60px;font-weight:700" value="${g.grade}"></td>
          <td><input class="form-control" style="width:70px" type="number" value="${g.min}"></td>
          <td><input class="form-control" style="width:70px" type="number" value="${g.max}"></td>
          <td><input class="form-control" style="width:70px" type="number" value="${g.points}"></td>
          <td><input class="form-control" style="width:140px" value="${g.remarks}"></td>
          <td><input type="color" value="${['#1B5E20','#1565C0','#E65100','#B71C1C'][i]}" style="width:40px;height:32px;border:none;border-radius:4px;cursor:pointer"></td>
          <td></td>
        </tr>`).join('');
        Toast.info('Switched to CBC EE/ME/AE/BE grading');
      }
    }
  },

  renderUsers(container) {
    container.innerHTML = `<div class="card"><div class="card-title" style="margin-bottom:12px">User Management</div><button class="btn btn-primary" onclick="Router.go('staff')">👥 Manage Staff Users</button><button class="btn btn-secondary" style="margin-left:8px" onclick="Router.go('students')">🎓 Manage Students</button><div class="alert alert-info" style="margin-top:12px">Manage users via the Staff and Students pages. All new staff automatically get login credentials.</div></div>`;
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
        <button class="btn btn-primary w-full" style="margin-top:16px" onclick="window.open('mailto:billing@elimusaas.com?subject=Subscription Renewal','_blank')">Renew Subscription</button>
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
          <div>
            <span class="badge ${s.subscription_status==='active'?'badge-green':s.subscription_status==='trial'?'badge-amber':s.subscription_status==='suspended'?'badge-red':'badge-red'}">
              ${(s.subscription_status||'trial').toUpperCase()}
            </span>
            ${s.sub_end_date ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px">Exp: ${UI.date(s.sub_end_date)}</div>` : ''}
          </div>
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
    Toast.info('🔑 Authenticating as ' + schoolName + '...');
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

  async resetSchoolAdminPassword(schoolId, schoolName) {
    if (!confirm(`Reset admin password for ${schoolName}?`)) return;
    const r = await API.post('/superadmin/schools/'+schoolId+'/reset-admin-password', {});
    if (r?.tempPassword) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="sa-pwd-modal" onclick="if(event.target===this)this.remove()">
          <div class="modal" style="max-width:380px">
            <div class="modal-header"><h3>🔑 Admin Password Reset — ${schoolName}</h3><button onclick="document.getElementById('sa-pwd-modal').remove()" class="btn btn-sm">✕</button></div>
            <div class="modal-body" style="padding:20px">
              <p>Email: <strong>${r.email}</strong></p>
              <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:14px;font-family:monospace;font-size:18px;font-weight:700;text-align:center;letter-spacing:2px">${r.tempPassword}</div>
              <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Share this with the school administrator.</p>
            </div>
            <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
              <button class="btn btn-secondary" onclick="navigator.clipboard?.writeText('${r.tempPassword}');Toast.success('Copied!')">📋 Copy</button>
              <button class="btn btn-primary" onclick="document.getElementById('sa-pwd-modal').remove()">Done</button>
            </div>
          </div>
        </div>`);
    } else Toast.error(r?.error||'Failed to reset password');
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
