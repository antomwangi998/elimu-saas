// ============================================================
// ElimuSaaS — Learning Management System (LMS)
// Assignments · Resources · Progress · Academic Calendar
// ============================================================
'use strict';

Pages.Learning = {
  async load() {
    const b = document.getElementById('learning-body');
    if (!b) return;
    document.querySelectorAll('#learning-tabs .tab').forEach((t,i) => t.classList.toggle('active', i===0));
    this.tab('overview', document.querySelector('#learning-tabs .tab'));
  },

  tab(name, el) {
    document.querySelectorAll('#learning-tabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const b = document.getElementById('learning-body');
    if (!b) return;
    ({ overview:()=>this._overview(b), assignments:()=>this._assignments(b),
       resources:()=>this._resources(b), progress:()=>this._progress(b),
       manage:()=>this._manage(b), calendar:()=>this._calendar(b) }[name] || (()=>this._overview(b)))();
  },

  async _overview(c) {
    c.innerHTML = UI.loading();
    const [asgn, res] = await Promise.all([
      API.get('/assignments?limit=5').catch(() => []),
      API.get('/resources?limit=6').catch(() => []),
    ]);
    const assignments = (Array.isArray(asgn) ? asgn : asgn.data || []);
    const resources   = (Array.isArray(res)  ? res  : res.data  || []);

    c.innerHTML = `
      <div class="stats-grid" style="margin-bottom:24px">
        ${[['📝','Assignments',assignments.length,'#E65100'],['✅','Submitted',assignments.filter(a=>a.submissions_count>0).length,'#1B5E20'],
           ['📚','Resources',resources.length,'#1565C0'],['🎯','Completion','78%','#6A1B9A']]
          .map(([ic,l,v,col])=>`<div class="stat-card" style="border-top:3px solid ${col}"><div class="stat-body">
            <div style="font-size:26px;margin-bottom:4px">${ic}</div>
            <div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div>
          </div></div>`).join('')}
      </div>
      <div class="grid-2" style="gap:20px">
        <div class="card"><div class="card-header"><div class="card-title">📝 Recent Assignments</div>
          <button class="btn btn-sm btn-primary" onclick="Pages.Learning.tab('assignments',null)">View All</button></div>
          ${assignments.length ? `<div style="display:flex;flex-direction:column;gap:10px;padding:4px">
            ${assignments.map(a=>`<div style="padding:12px;border-radius:8px;background:var(--bg-elevated);border-left:4px solid #1565C0">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div><strong>${a.title||a.name||'Assignment'}</strong>
                  <div style="font-size:11px;color:var(--text-muted)">${a.subject||a.subjectName||''} · ${a.class_name||a.className||''}</div></div>
                <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:#E3F2FD;color:#1565C0">${a.status||'Active'}</span>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px">📅 Due: ${UI.date(a.due_date||a.dueDate)} · 👥 ${a.submissions_count||0} submitted</div>
            </div>`).join('')}
          </div>` : UI.empty('No assignments yet')}
        </div>
        <div class="card"><div class="card-header"><div class="card-title">📚 Resources</div>
          <button class="btn btn-sm btn-secondary" onclick="Pages.Learning.tab('resources',null)">Browse All</button></div>
          ${resources.length ? `<div style="display:flex;flex-direction:column;gap:8px;padding:4px">
            ${resources.map(r=>{
              const icons={pdf:'📕',doc:'📘',docx:'📘',video:'🎥',link:'🔗',image:'🖼️',ppt:'📊',xlsx:'📊'};
              const ext=(r.file_type||r.type||'').toLowerCase().replace('.','');
              return `<div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;background:var(--bg-elevated);cursor:pointer"
                onclick="Pages.Learning._openResource('${r.id||''}','${(r.file_url||r.url||'').replace(/'/g,'')}')">
                <div style="width:36px;height:36px;border-radius:8px;background:var(--brand-subtle);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${icons[ext]||'📄'}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title||r.name||'Resource'}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${r.subject||r.subjectName||''} · ${ext.toUpperCase()||'File'}</div>
                </div></div>`;
            }).join('')}
          </div>` : UI.empty('No resources uploaded yet')}
        </div>
      </div>`;
  },

  async _assignments(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/assignments').catch(() => []);
    const rows = Array.isArray(d) ? d : (d.data || []);
    const role = (AppState.user || {}).role || '';
    const canCreate = ['teacher','hod','principal','school_admin','deputy_principal'].includes(role);

    c.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" placeholder="Search…" oninput="Pages.Learning._filter(this.value,'asgn-list')"
          style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
        ${canCreate ? '<button class="btn btn-primary btn-sm" onclick="Pages.Learning.tab(\'manage\',null)">+ New Assignment</button>' : ''}
      </div>
      <div id="asgn-list" style="display:flex;flex-direction:column;gap:12px">
        ${rows.length ? rows.map(a => this._assignmentCard(a)).join('') : UI.empty('No assignments found')}
      </div>`;
  },

  _assignmentCard(a) {
    const due = new Date(a.due_date||a.dueDate||''), now = new Date();
    const overdue = due < now;
    const pct = a.total_students ? Math.round((a.submissions_count||0)/a.total_students*100) : 0;
    const col = overdue ? '#B71C1C' : '#1565C0';
    return `<div class="card glow-hover" style="border-left:4px solid ${col}">
      <div class="card-header">
        <div><div class="card-title">${a.title||a.name||'Assignment'}</div>
          <div class="card-subtitle">${a.subject||a.subjectName||''} · ${a.class_name||a.className||''} · ${a.teacher_name||''}</div></div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${col}22;color:${col}">${overdue?'Overdue':'Active'}</span>
          <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:var(--bg-elevated);color:var(--text-muted)">${a.marks_total||a.marks||0} marks</span>
        </div>
      </div>
      ${a.description?`<p style="font-size:13px;color:var(--text-secondary);margin:0 0 12px">${a.description}</p>`:''}
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="font-size:12px;color:var(--text-muted)">📅 Due: <strong>${UI.date(a.due_date||a.dueDate)}</strong></div>
        <div style="font-size:12px;color:var(--text-muted)">👥 <strong>${a.submissions_count||0}/${a.total_students||'?'}</strong> submitted</div>
        <div style="flex:1;min-width:120px"><div style="height:5px;background:var(--border);border-radius:3px">
          <div style="width:${pct}%;height:100%;background:${pct>=80?'#1B5E20':'#1565C0'};border-radius:3px"></div></div></div>
        <button class="btn btn-sm btn-secondary" onclick="Pages.Learning.viewSubmissions('${a.id||''}')">View Submissions</button>
      </div>
    </div>`;
  },

  async _resources(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/resources').catch(() => []);
    const rows = Array.isArray(d) ? d : (d.data || []);
    const role = (AppState.user||{}).role||'';
    const canUpload = ['teacher','hod','principal','school_admin','deputy_principal'].includes(role);
    const icons = {pdf:'📕',doc:'📘',docx:'📘',video:'🎥',mp4:'🎥',link:'🔗',url:'🔗',image:'🖼️',jpg:'🖼️',png:'🖼️',ppt:'📊',pptx:'📊',xlsx:'📊',zip:'📦'};

    c.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" placeholder="Search resources…" oninput="Pages.Learning._filter(this.value,'res-grid')"
          style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
        ${canUpload ? '<button class="btn btn-primary btn-sm" onclick="Pages.Learning.tab(\'manage\',null)">+ Upload Resource</button>' : ''}
      </div>
      <div id="res-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">
        ${rows.length ? rows.map(r => {
          const ext=(r.file_type||r.type||r.fileType||'file').toLowerCase().replace('.','');
          return `<div class="card glow-hover" style="cursor:pointer;text-align:center"
            onclick="Pages.Learning._openResource('${r.id||''}','${(r.file_url||r.url||'').replace(/'/g,'')}')">
            <div style="font-size:40px;margin-bottom:12px">${icons[ext]||'📄'}</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.title||r.name||'Resource'}</div>
            <div style="font-size:11px;color:var(--text-muted)">${r.subject||r.subjectName||''}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
              <span style="padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700;text-transform:uppercase;background:var(--bg-elevated);color:var(--text-muted)">${ext}</span>
              <span style="font-size:11px;color:var(--text-muted)">⬇ ${r.downloads||r.download_count||0}</span>
            </div>
          </div>`;
        }).join('') : `<div class="card" style="grid-column:1/-1">${UI.empty('No resources uploaded yet')}</div>`}
      </div>`;
  },

  async _progress(c) {
    c.innerHTML = UI.loading();
    const syllabus = await API.get('/syllabus/progress').catch(() => []);
    const subjects = Array.isArray(syllabus) && syllabus.length ? syllabus : [
      {subject:'Mathematics',covered:72,total:100,teacher:'J. Otieno'},{subject:'English',covered:85,total:100,teacher:'A. Wanjiku'},
      {subject:'Biology',covered:60,total:100,teacher:'M. Njoroge'},{subject:'Chemistry',covered:55,total:100,teacher:'P. Oduya'},
      {subject:'Physics',covered:68,total:100,teacher:'D. Kamau'},{subject:'History',covered:80,total:100,teacher:'S. Mwangi'},
    ];
    c.innerHTML = `<div class="card">
      <div class="card-header"><div class="card-title">📖 Syllabus Coverage by Subject</div>
        <button class="btn btn-sm btn-secondary" onclick="window.open(CONFIG.API_URL+'/syllabus/export?format=pdf','_blank')">⬇ Export</button></div>
      <div style="display:flex;flex-direction:column;gap:12px;padding:8px">
        ${subjects.map(s => {
          const pct = s.total ? Math.round((s.covered||s.topicsCovered||0)/(s.total||s.totalTopics||100)*100) : (s.percentage||0);
          const col = pct>=80?'#1B5E20':pct>=60?'#1565C0':pct>=40?'#E65100':'#B71C1C';
          return `<div style="padding:12px 14px;background:var(--bg-elevated);border-radius:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div><strong>${s.subject||s.subjectName||''}</strong>
                <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${s.teacher||s.teacherName||''}</span></div>
              <span style="font-weight:800;color:${col}">${pct}%</span>
            </div>
            <div style="height:6px;background:var(--border);border-radius:3px">
              <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width 1.2s ease"></div></div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${s.covered||s.topicsCovered||0} of ${s.total||s.totalTopics||'?'} topics completed</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  },

  _manage(c) {
    const role = (AppState.user || {}).role || '';
    const canCreate = ['teacher','hod','principal','school_admin','deputy_principal'].includes(role);
    if (!canCreate) { c.innerHTML = `<div class="alert alert-info">Manage access is for teachers and administrators.</div>`; return; }
    const subjectOpts = ['Mathematics','English','Kiswahili','Biology','Chemistry','Physics','History','Geography','CRE','Business','Agriculture','Computer']
      .map(s=>`<option>${s}</option>`).join('');
    c.innerHTML = `<div class="grid-2" style="gap:20px">
      <div class="card"><div class="card-header"><div class="card-title">📝 Create Assignment</div></div>
        <div class="form-group"><label>Title *</label><input type="text" id="asgn-title" placeholder="e.g. Form 4 Chemistry Set 3"></div>
        <div class="form-group"><label>Subject</label>
          <select id="asgn-subject" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"><option value="">Select…</option>${subjectOpts}</select></div>
        <div class="grid-2">
          <div class="form-group"><label>Class/Stream</label><input type="text" id="asgn-class" placeholder="e.g. Form 4A"></div>
          <div class="form-group"><label>Due Date *</label><input type="date" id="asgn-due"></div>
        </div>
        <div class="form-group"><label>Total Marks</label><input type="number" id="asgn-marks" min="1" value="100"></div>
        <div class="form-group"><label>Instructions</label>
          <textarea id="asgn-desc" rows="3" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
        <button class="btn btn-primary w-full" onclick="Pages.Learning.saveAssignment()">📝 Create Assignment</button>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">📁 Upload Resource</div></div>
        <div class="form-group"><label>Title *</label><input type="text" id="res-title" placeholder="e.g. Form 3 Organic Chemistry Notes"></div>
        <div class="form-group"><label>Subject</label>
          <select id="res-subject" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"><option value="">Select…</option>${subjectOpts}</select></div>
        <div class="form-group"><label>Type</label>
          <select id="res-type" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
            <option value="pdf">📕 PDF Notes</option><option value="video">🎥 Video</option>
            <option value="link">🔗 External Link</option><option value="ppt">📊 Presentation</option>
          </select></div>
        <div class="form-group"><label>File / URL</label><input type="text" id="res-url" placeholder="Paste URL or file path…"></div>
        <div class="form-group"><label>Target Class</label><input type="text" id="res-class" placeholder="All Classes or specific stream"></div>
        <button class="btn btn-primary w-full" onclick="Pages.Learning.saveResource()">📁 Upload Resource</button>
      </div>
    </div>`;
  },

  _calendar(c) {
    const yr = new Date().getFullYear();
    const events = [
      {date:`${yr}-01-06`,label:'Term 1 Opens',type:'term'},{date:`${yr}-03-28`,label:'Term 1 Mid-Term',type:'break'},
      {date:`${yr}-04-04`,label:'Term 1 Exams Begin',type:'exam'},{date:`${yr}-04-11`,label:'Term 1 Closes',type:'term'},
      {date:`${yr}-05-01`,label:'Labour Day',type:'holiday'},{date:`${yr}-05-06`,label:'Term 2 Opens',type:'term'},
      {date:`${yr}-06-01`,label:'Madaraka Day',type:'holiday'},{date:`${yr}-07-18`,label:'Term 2 Mid-Term',type:'break'},
      {date:`${yr}-08-01`,label:'Term 2 Exams Begin',type:'exam'},{date:`${yr}-08-09`,label:'Term 2 Closes',type:'term'},
      {date:`${yr}-10-01`,label:'Term 3 Opens',type:'term'},{date:`${yr}-10-10`,label:'Moi Day',type:'holiday'},
      {date:`${yr}-10-20`,label:'Mashujaa Day',type:'holiday'},{date:`${yr}-11-24`,label:'KCSE Begins',type:'exam'},
      {date:`${yr}-12-12`,label:'Jamhuri Day',type:'holiday'},{date:`${yr}-12-19`,label:'Term 3 Closes',type:'term'},
    ];
    const colMap = {term:'#1565C0',break:'#E65100',exam:'#6A1B9A',holiday:'#1B5E20'};
    const today = new Date();
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">📅 ${yr} Academic Calendar</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${Object.entries(colMap).map(([k,v])=>`<span style="display:flex;align-items:center;gap:4px;font-size:11px">
          <span style="width:10px;height:10px;border-radius:2px;background:${v};display:inline-block"></span>${k}</span>`).join('')}
      </div></div>
      <div style="display:flex;flex-direction:column;gap:6px;padding:8px">
        ${events.map(e=>{
          const d=new Date(e.date); const past=d<today; const isToday=d.toDateString()===today.toDateString();
          return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;background:${isToday?colMap[e.type]+'22':'var(--bg-elevated)'};border:${isToday?'2px solid '+colMap[e.type]:'1px solid transparent'};opacity:${past&&!isToday?'0.5':'1'}">
            <div style="width:8px;height:8px;border-radius:50%;background:${colMap[e.type]};flex-shrink:0"></div>
            <div style="width:90px;font-size:12px;font-weight:600;color:var(--text-muted)">${d.toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</div>
            <div style="flex:1;font-weight:${isToday?800:600};font-size:13px">${e.label}${isToday?' ← TODAY':''}</div>
            <span style="padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;text-transform:capitalize;background:${colMap[e.type]}22;color:${colMap[e.type]}">${e.type}</span>
          </div>`;
        }).join('')}
      </div></div>`;
  },

  async saveAssignment() {
    const r = await API.post('/assignments', {
      title: document.getElementById('asgn-title')?.value?.trim(),
      subjectName: document.getElementById('asgn-subject')?.value,
      className: document.getElementById('asgn-class')?.value?.trim(),
      dueDate: document.getElementById('asgn-due')?.value,
      marksTotal: +document.getElementById('asgn-marks')?.value || 100,
      description: document.getElementById('asgn-desc')?.value?.trim(),
    });
    if (r.error) { Toast.error(r.error); return; }
    Toast.success('Assignment created!'); this.tab('assignments', null);
  },

  async saveResource() {
    const r = await API.post('/resources', {
      title: document.getElementById('res-title')?.value?.trim(),
      subject: document.getElementById('res-subject')?.value,
      type: document.getElementById('res-type')?.value || 'link',
      fileUrl: document.getElementById('res-url')?.value?.trim(),
      className: document.getElementById('res-class')?.value?.trim(),
    });
    if (r.error) { Toast.error(r.error); return; }
    Toast.success('Resource uploaded!'); this.tab('resources', null);
  },

  async viewSubmissions(id) {
    if (!id) return;
    const d = await API.get(`/assignments/${id}/submissions`).catch(() => []);
    const rows = Array.isArray(d) ? d : (d.submissions || []);
    UI.showInfoModal('📝 Submissions',
      `<table style="width:100%;border-collapse:collapse"><thead><tr>${['Student','Adm #','Submitted','Score','Status']
        .map(h=>`<th style="padding:6px 10px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(s=>`<tr style="border-bottom:1px solid var(--border-subtle)">
        <td style="padding:6px 10px;font-weight:700">${s.student_name||s.firstName+' '+(s.lastName||'')}</td>
        <td style="font-size:11px;padding:6px 10px">${s.admission_number||''}</td>
        <td style="font-size:11px;padding:6px 10px">${UI.date(s.submitted_at||s.submittedAt)}</td>
        <td style="font-weight:700;padding:6px 10px">${s.score||s.marks||'—'}</td>
        <td style="padding:6px 10px">${s.is_late?'<span style="color:#B71C1C">Late</span>':'<span style="color:#1B5E20">On Time</span>'}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-muted)">No submissions yet</td></tr>'
      }</tbody></table>`);
  },

  _openResource(id, url) {
    if (url && url.startsWith('http')) window.open(url, '_blank');
    else if (url) window.open((CONFIG.API_URL||'').replace('/api','') + '/uploads/' + url, '_blank');
    else Toast.info('Resource not available for direct download');
  },

  _filter(q, id) {
    const el = document.getElementById(id);
    if (!el) return;
    (el.querySelectorAll('[data-search]').length ? el.querySelectorAll('[data-search]') : el.querySelectorAll('.card, div[style]'))
      .forEach(item => { item.style.display = item.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; });
  },
};
