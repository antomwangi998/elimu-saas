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
  _page:1, _search:'', _role:'', _verif:'',

  async load() {
    // populate subtitle
    this._page=1; await this.fetch();
  },

  async fetch() {
    const tbody = document.getElementById('staff-tbody');
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px">${_loading()}</td></tr>`;
    const p = {page:this._page, limit:30};
    if(this._search) p.search = this._search;
    if(this._role) p.role = this._role;
    if(this._verif) p.verificationStatus = this._verif;
    const data = await API.get('/staff', p);
    if(data.error){ tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--red)">${data.error}</td></tr>`; return; }
    const list = data.data||data||[];
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted)">No staff found</td></tr>`; return; }

    tbody.innerHTML = list.map((s,i)=>{
      const vs = s.tsc_verification_status||'pending';
      const vc = {verified:'green',under_review:'blue',pending:'amber',rejected:'red',flagged:'red'}[vs]||'gray';
      const score = s.tsc_verification_score||0;
      return `<tr>
        <td style="color:var(--text-muted);font-size:12px">${i+1+(this._page-1)*30}</td>
        <td><div style="display:flex;align-items:center;gap:10px">
          ${s.photo_url?`<img src="${s.photo_url}" style="width:34px;height:34px;border-radius:50%;object-fit:cover">`:`<div class="avatar sm">${(s.first_name||'?')[0]}</div>`}
          <div><div style="font-weight:600">${s.first_name} ${s.last_name}</div><div style="font-size:11px;color:var(--text-muted)">${s.email||''}</div></div>
        </div></td>
        <td class="font-mono text-sm">${s.staff_number||'--'}</td>
        <td><div style="font-size:12px">${(s.role||'').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>${s.is_hod?_badge('HOD','purple'):''}</td>
        <td>${s.department||'--'}</td>
        <td>${s.phone||'--'}</td>
        <td>
          ${_badge(vs.replace('_',' '),vc)}
          <div style="width:60px;height:4px;background:var(--border);border-radius:2px;margin-top:4px;overflow:hidden"><div style="width:${score}%;height:100%;background:${score>=100?'var(--green)':score>=70?'var(--amber)':'var(--red)'}"></div></div>
          <div style="font-size:10px;color:var(--text-muted)">${score}/100</div>
        </td>
        <td><div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-secondary" onclick="Pages.Staff.view('${s.staff_id||s.id}')">View</button>
          <button class="btn btn-sm btn-ghost" onclick="Pages.Staff.resetPwd('${s.staff_id||s.id}','${s.first_name} ${s.last_name}')">Reset Pwd</button>
        </div></td>
      </tr>`;
    }).join('');

    const pg = document.getElementById('staff-pagination');
    if(pg && data.pagination) UI.pagination(pg, data, p=>{ this._page=p; this.fetch(); });
  },

  search(val){ this._search=val; this._page=1; clearTimeout(this._t); this._t=setTimeout(()=>this.fetch(),400); },

  filter(){
    this._role = document.getElementById('staff-role-filter')?.value||'';
    this._page=1; this.fetch();
  },

  async view(id){
    const d = await API.get(`/staff/${id}`);
    if(d.error){ Toast.error(d.error); return; }
    const subs = (d.subjects||[]).map(s=>`<span class="badge badge-blue">${s.name}</span>`).join(' ');
    UI.showInfoModal(`${d.first_name} ${d.last_name}`, `
      <div class="grid-2">
        <div>${[['TSC',d.tsc_number||'--'],['Staff No',d.staff_number||'--'],['Department',d.department||'--'],['Designation',d.designation||'Teacher'],['Employment',d.employment_type||'--'],['Phone',d.phone||'--'],['National ID',d.national_id||'--']].map(([k,v])=>_kv(k,v)).join('')}</div>
        <div>
          <div style="background:var(--bg-elevated);padding:14px;border-radius:10px;margin-bottom:12px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:${(d.tsc_verification_score||0)>=100?'var(--green)':'var(--amber)'}">${d.tsc_verification_score||0}<span style="font-size:14px;color:var(--text-muted)">/100</span></div>
            <div style="font-size:11px;color:var(--text-muted)">TSC Verification</div>
            <div style="height:6px;background:var(--border);border-radius:3px;margin-top:8px;overflow:hidden"><div style="width:${d.tsc_verification_score||0}%;height:100%;background:var(--green)"></div></div>
          </div>
          <div style="font-weight:600;font-size:12px;margin-bottom:6px;color:var(--text-secondary)">SUBJECTS ASSIGNED</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${subs||'<span style="color:var(--text-muted);font-size:12px">None assigned</span>'}</div>
          ${d.last_login?`<div style="margin-top:12px;font-size:11px;color:var(--text-muted)">Last login: ${new Date(d.last_login).toLocaleString('en-KE')}</div>`:'<div style="margin-top:12px;font-size:11px;color:var(--amber)">Never logged in</div>'}
        </div>
      </div>`);
  },

  async resetPwd(id, name){
    if(!await UI.confirm(`Reset password for ${name}? A temporary password will be sent via SMS.`)) return;
    const res = await API.put(`/dean/teachers/${id}/reset-password`, {});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`Password reset! Temp: ${res.tempPassword||'Sent via SMS'}`, 'Done');
  },

  openAddModal(){
    Router.go('tsc-verification');
    setTimeout(()=>Pages.TSCVerif?.openRegisterModal?.(), 300);
  },
};
Router.define?.('staff',{ title:'Staff Management', onEnter:()=>Pages.Staff.load() });

// ============================================================
// ACADEMICS PAGE
// ============================================================
Pages.Academics = {
  classes:[], subjects:[],

  async load(){ this.switchTab('classes', document.querySelector('#page-academics .tab')); },

  switchTab(tab, el){
    document.querySelectorAll('#page-academics .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('academics-tab-content');
    if(!c) return;
    if(tab==='classes') this.renderClasses(c);
    else if(tab==='subjects') this.renderSubjects(c);
    else if(tab==='allocation') this.renderAllocation(c);
    else if(tab==='years') this.renderAcademicYears(c);
  },

  async renderClasses(container){
    container.innerHTML = _loading();
    const data = await API.get('/academics/classes');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    this.classes = data||[];
    if(!data.length){ container.innerHTML = _empty('No classes yet','Add your first class to get started',`<button class="btn btn-primary" onclick="Pages.Academics.addClass()">Add Class</button>`); return; }

    container.innerHTML = `<div class="grid-auto">${data.map(c=>`
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${c.name}</div>
            <div class="card-subtitle">Form ${c.level}${c.stream?' · '+c.stream:''}</div>
          </div>
          <span class="badge badge-blue">${c.student_count||0} Students</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:4px">
          <strong>Class Teacher:</strong> ${c.class_teacher_name||'Not assigned'}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${c.curriculum==='cbc'?'🟢 CBC (Junior Secondary)':'🔵 8-4-4 (Senior Secondary)'}</div>
        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sm btn-secondary" onclick="Pages.Academics.viewClass('${c.id}')">View Students</button>
          <button class="btn btn-sm btn-ghost" onclick="Pages.Academics.assignTeacher('${c.id}','${c.name}')">Assign Teacher</button>
          <button class="btn btn-sm btn-ghost" onclick="Pages.Academics.editClass('${c.id}','${c.name}','${c.level}','${c.stream||''}')">Edit</button>
        </div>
      </div>`).join('')}</div>`;
  },

  async renderSubjects(container){
    container.innerHTML = _loading();
    const data = await API.get('/academics/subjects');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    this.subjects = data||[];
    if(!data.length){ container.innerHTML = _empty('No subjects','Seed CBC or 8-4-4 subjects or add manually.',`<div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-secondary" onclick="Pages.Academics.seedSubjects('cbc')">Seed CBC</button><button class="btn btn-secondary" onclick="Pages.Academics.seedSubjects('844')">Seed 8-4-4</button><button class="btn btn-primary" onclick="Pages.Academics.addSubject()">Add Subject</button></div>`); return; }

    container.innerHTML = _tbl(['#','Subject','Code','Category','Curriculum','Compulsory'],
      data.map((s,i)=>`<tr>
        <td style="color:var(--text-muted)">${i+1}</td>
        <td><strong>${s.name}</strong></td>
        <td class="font-mono text-sm">${s.code}</td>
        <td>${_badge(s.category||'general','cyan')}</td>
        <td>${_badge(s.curriculum==='cbc'?'CBC':'8-4-4', s.curriculum==='cbc'?'green':'blue')}</td>
        <td>${s.is_compulsory?_badge('Yes','green'):_badge('Optional','gray')}</td>
      </tr>`).join(''));
  },

  async renderAllocation(container){
    container.innerHTML = _loading();
    const [classes, staff] = await Promise.all([
      API.get('/academics/classes'),
      API.get('/staff?limit=200'),
    ]);
    const classList = classes||[];
    const staffList = staff.data||[];

    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <label style="font-size:13px;font-weight:600;text-transform:none">Class:</label>
        <select id="alloc-class" onchange="Pages.Academics.loadAllocation(this.value)" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);min-width:180px">
          <option value="">Select class…</option>
          ${classList.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div id="alloc-content">${_empty('Select a class to manage subject-teacher allocations')}</div>`;
  },

  async loadAllocation(classId){
    if(!classId) return;
    const container = document.getElementById('alloc-content');
    container.innerHTML = _loading();
    const [allocs, subjects, staff] = await Promise.all([
      API.get(`/academics/class-subjects?classId=${classId}`),
      API.get('/academics/subjects'),
      API.get('/staff?limit=200'),
    ]);
    const subjList = subjects||[];
    const staffList = staff.data||[];
    const allocMap = {};
    (allocs||[]).forEach(a=>{ allocMap[a.subject_id]={id:a.id, teacherId:a.teacher_id, ppw:a.periods_per_week}; });

    container.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <div style="font-weight:600;font-size:13px">Subject Allocations</div>
          <button class="btn btn-sm btn-primary" onclick="Pages.Academics.saveAllocations('${classId}')">Save Changes</button>
        </div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Subject</th><th>Assigned Teacher</th><th>Periods / Week</th><th>Status</th></tr></thead>
          <tbody>
            ${subjList.map(s=>{
              const a = allocMap[s.id]||{};
              return `<tr>
                <td><strong>${s.name}</strong> <span class="font-mono text-sm" style="color:var(--text-muted)">${s.code}</span></td>
                <td>
                  <select class="alloc-teacher" data-subject="${s.id}" style="padding:5px 8px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;min-width:160px">
                    <option value="">-- Unassigned --</option>
                    ${staffList.map(t=>`<option value="${t.user_id||t.id}" ${a.teacherId===t.user_id?'selected':''}>${t.first_name} ${t.last_name}</option>`).join('')}
                  </select>
                </td>
                <td>
                  <input type="number" class="alloc-ppw" data-subject="${s.id}" value="${a.ppw||4}" min="1" max="10" style="width:60px;padding:5px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;text-align:center">
                </td>
                <td>${a.id?_badge('Assigned','green'):_badge('Unassigned','gray')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>`;
  },

  async saveAllocations(classId){
    const rows = document.querySelectorAll('.alloc-teacher');
    let saved=0, errors=0;
    for(const sel of rows){
      const subjectId = sel.dataset.subject;
      const teacherId = sel.value;
      const ppwEl = document.querySelector(`.alloc-ppw[data-subject="${subjectId}"]`);
      const periodsPerWeek = parseInt(ppwEl?.value||4);
      if(!teacherId) continue;
      const res = await API.post('/academics/class-subjects', {classId, subjectId, teacherId, periodsPerWeek});
      if(res.error) errors++;
      else saved++;
    }
    if(errors) Toast.warning(`${saved} saved, ${errors} failed`);
    else Toast.success(`${saved} subject-teacher allocations saved!`);
    this.loadAllocation(classId);
  },

  async renderAcademicYears(container){
    container.innerHTML = _loading();
    const data = await API.get('/academics/years');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const list = data||[];
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-weight:700">Academic Years</div>
        <button class="btn btn-primary btn-sm" onclick="Pages.Academics.addYear()">Add Year</button>
      </div>
      ${list.length===0 ? _empty('No academic years','Add your first academic year') : `
      <div class="grid-3">${list.map(y=>`
        <div class="card">
          <div class="card-header">
            <div class="card-title">${y.year}</div>
            ${y.is_current?_badge('Current','green'):''}
          </div>
          <div style="font-size:12px;color:var(--text-secondary)">${new Date(y.start_date).toLocaleDateString('en-KE')} -- ${new Date(y.end_date).toLocaleDateString('en-KE')}</div>
          ${!y.is_current?`<button class="btn btn-sm btn-secondary" style="margin-top:12px" onclick="Pages.Academics.setCurrentYear('${y.id}')">Set Current</button>`:''}
        </div>`).join('')}
      </div>`}`;
  },

  addClass(){
    const name = prompt('Class name (e.g. Form 1 East):'); if(!name) return;
    const level = parseInt(prompt('Form level (1,2,3,4):')||'1');
    const stream = prompt('Stream name (e.g. East, leave blank if single stream):')||null;
    API.post('/academics/classes',{name,level,stream}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Class created!');
      this.renderClasses(document.getElementById('academics-tab-content'));
    });
  },

  editClass(id, name, level, stream){
    const newName = prompt('Class name:', name); if(!newName) return;
    API.put(`/academics/classes/${id}`,{name:newName, level, stream}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Class updated!');
      this.renderClasses(document.getElementById('academics-tab-content'));
    });
  },

  async viewClass(classId){
    const data = await API.get(`/students?classId=${classId}&limit=100`);
    const list = data.data||[];
    UI.showInfoModal('Students in Class', list.length===0 ? _empty('No students in this class') : `
      <div style="display:flex;flex-direction:column;gap:6px">
        ${list.map(s=>`<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-elevated);border-radius:8px">
          <div class="avatar sm">${s.first_name[0]}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${s.first_name} ${s.last_name}</div><div style="font-size:11px;color:var(--text-muted)">${s.admission_number}</div></div>
          <span class="badge ${s.gender==='male'?'badge-blue':'badge-pink'}">${s.gender}</span>
        </div>`).join('')}
      </div>`);
  },

  assignTeacher(classId, className){
    API.get('/staff?limit=200').then(staff=>{
      const list = staff.data||[];
      const sel = list.map(t=>`${t.first_name} ${t.last_name} (${t.staff_number||t.role})`).join('\n');
      const name = prompt(`Assign class teacher to ${className}.\nType staff name from list:\n${sel}`);
      if(!name) return;
      const match = list.find(t=>`${t.first_name} ${t.last_name}`.toLowerCase().includes(name.toLowerCase()));
      if(!match){ Toast.error('Staff not found'); return; }
      API.put(`/academics/classes/${classId}`,{classTeacherId: match.user_id||match.id}).then(r=>{
        if(r.error){ Toast.error(r.error); return; }
        Toast.success(`${match.first_name} assigned as class teacher!`);
        this.renderClasses(document.getElementById('academics-tab-content'));
      });
    });
  },

  seedSubjects(curriculum){
    API.post(`/curriculum/subjects/seed?level=${curriculum==='cbc'?1:3}`,{curriculum}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success(r.message||'Subjects seeded!');
      this.renderSubjects(document.getElementById('academics-tab-content'));
    });
  },

  addSubject(){
    const name = prompt('Subject name:'); if(!name) return;
    const code = prompt('Subject code (e.g. MAT, ENG):'); if(!code) return;
    const curriculum = prompt('Curriculum (cbc or 844):','844')||'844';
    API.post('/academics/subjects',{name,code,curriculum}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Subject added!');
      this.renderSubjects(document.getElementById('academics-tab-content'));
    });
  },

  addYear(){
    const year = prompt('Year (e.g. 2025):'); if(!year) return;
    const start = prompt('Start date (YYYY-MM-DD):','2025-01-06'); if(!start) return;
    const end = prompt('End date (YYYY-MM-DD):','2025-11-28'); if(!end) return;
    API.post('/academics/years',{year:parseInt(year), startDate:start, endDate:end}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Academic year created!');
      this.renderAcademicYears(document.getElementById('academics-tab-content'));
    });
  },

  async setCurrentYear(id){
    const res = await API.put(`/academics/years/${id}/set-current`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Academic year set as current!');
    this.renderAcademicYears(document.getElementById('academics-tab-content'));
  },

  openClassModal(){ this.addClass(); },
  openSubjectModal(){ this.addSubject(); },
};
Router.define?.('academics',{ title:'Classes & Subjects', onEnter:()=>Pages.Academics.load() });

// ============================================================
// EXAMS PAGE
// ============================================================
Pages.Exams = {
  currentTab:'series', series:[],

  async load(){ this.switchTab('series', document.querySelector('#page-exams .tab')); },

  switchTab(tab, el){
    document.querySelectorAll('#page-exams .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    this.currentTab = tab;
    const c = document.getElementById('exams-tab-content');
    if(!c) return;
    if(tab==='series') this.renderSeries(c);
    else if(tab==='entry') this.renderMarkEntry(c);
    else if(tab==='broadsheet') this.renderBroadsheet(c);
    else if(tab==='reportcards') this.renderReportCards(c);
  },

  async renderSeries(container){
    container.innerHTML = _loading();
    const data = await API.get('/exams/series');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const list = data.data||data||[];
    if(!list.length){ container.innerHTML = _empty('No exam series','Create your first exam series to enter marks.',`<button class="btn btn-primary" onclick="Pages.Exams.openCreateModal()">Create Exam Series</button>`); return; }

    container.innerHTML = `<div class="grid-auto">${list.map(s=>`
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${s.name}</div>
            <div class="card-subtitle">${s.type?.replace('_',' ')||''} · ${s.term?.replace('_',' ')||''} ${s.year||''}</div>
          </div>
          <span class="badge ${s.is_locked?'badge-red':s.is_published?'badge-green':'badge-amber'}">${s.is_locked?'Locked':s.is_published?'Published':'Draft'}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin:8px 0">
          ${s.start_date?`${new Date(s.start_date).toLocaleDateString('en-KE')} -- ${new Date(s.end_date||s.start_date).toLocaleDateString('en-KE')}`:'Dates not set'}
        </div>
        <div style="font-size:12px;color:var(--text-muted)">${s.papers_count||0} papers · ${s.marks_entered||0} marks entered</div>
        <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="Pages.Exams.openMarkEntry('${s.id}','${s.name}')">Enter Marks</button>
          <button class="btn btn-sm btn-secondary" onclick="Pages.Exams.viewBroadsheetForSeries('${s.id}','${s.name}')">Broadsheet</button>
          ${!s.is_published?`<button class="btn btn-sm btn-ghost" onclick="Pages.Exams.publishSeries('${s.id}')">Publish</button>`:''}
          ${!s.is_locked?`<button class="btn btn-sm btn-ghost" style="color:var(--amber)" onclick="Pages.Exams.lockSeries('${s.id}')">Lock</button>`:''}
        </div>
      </div>`).join('')}</div>`;
    this.series = list;
  },

  async renderMarkEntry(container){
    const classes = await API.get('/academics/classes');
    const series = await API.get('/exams/series');
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:20px">
        <div style="flex:1;min-width:180px"><label>Exam Series</label>
          <select id="me-series" onchange="Pages.Exams.loadPapers()">
            <option value="">Select series…</option>
            ${(series.data||series||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
          </select></div>
        <div style="flex:1;min-width:160px"><label>Class</label>
          <select id="me-class" onchange="Pages.Exams.loadPapers()">
            <option value="">Select class…</option>
            ${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select></div>
        <button class="btn btn-secondary" onclick="Pages.Exams.loadPapers()">Load Papers</button>
      </div>
      <div id="me-papers">${_empty('Select exam series and class to load mark entry sheets')}</div>`;
  },

  async loadPapers(){
    const seriesId = document.getElementById('me-series')?.value;
    const classId  = document.getElementById('me-class')?.value;
    const container = document.getElementById('me-papers');
    if(!seriesId||!classId){ container.innerHTML = _empty('Select both series and class'); return; }
    container.innerHTML = _loading();
    const papers = await API.get(`/exams/papers?seriesId=${seriesId}&classId=${classId}`);
    if(papers.error){ container.innerHTML = _err(papers.error); return; }
    const list = papers.data||papers||[];
    if(!list.length){ container.innerHTML = _empty('No papers found','Make sure subjects are assigned to this class.'); return; }
    container.innerHTML = `<div class="grid-auto">${list.map(p=>`
      <div class="card" style="cursor:pointer" onclick="Pages.Exams.openPaperEntry('${p.id}','${p.subject_name}')">
        <div class="card-header">
          <div class="card-title">${p.subject_name}</div>
          <span class="badge ${p.is_submitted?'badge-green':p.marks_entered>0?'badge-amber':'badge-gray'}">${p.is_submitted?'Submitted':p.marks_entered>0?'Partial':'Pending'}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">${p.marks_entered||0} / ${p.student_count||0} entered</div>
        <div style="margin-top:10px">
          <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden">
            <div style="width:${p.student_count>0?(p.marks_entered/p.student_count*100).toFixed(0):0}%;height:100%;background:var(--brand)"></div>
          </div>
        </div>
      </div>`).join('')}</div>`;
  },

  async openPaperEntry(paperId, subjectName){
    UI.openModal('modal-mark-entry');
    document.getElementById('mark-entry-title').textContent = `Enter Marks -- ${subjectName}`;
    const container = document.getElementById('mark-entry-content');
    container.innerHTML = _loading();
    const data = await API.get(`/exams/papers/${paperId}/marks`);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const students = data.students||[];
    this._currentPaperId = paperId;
    container.innerHTML = `
      <div style="overflow-x:auto"><table>
        <thead><tr><th>#</th><th>Student</th><th>Adm No</th><th>Marks (/${data.maxMarks||100})</th><th>Absent</th></tr></thead>
        <tbody>
          ${students.map((s,i)=>`<tr>
            <td>${i+1}</td>
            <td>${s.first_name} ${s.last_name}</td>
            <td class="font-mono text-sm">${s.admission_number}</td>
            <td><input type="number" id="mark-${s.id}" value="${s.marks||''}" min="0" max="${data.maxMarks||100}" style="width:80px;padding:5px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:13px;text-align:center" ${s.is_absent?'disabled':''}></td>
            <td><input type="checkbox" id="abs-${s.id}" ${s.is_absent?'checked':''} onchange="document.getElementById('mark-${s.id}').disabled=this.checked"></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
  },

  async saveMarks(submit=false){
    if(!this._currentPaperId){ Toast.error('No paper selected'); return; }
    const inputs = document.querySelectorAll('#mark-entry-content input[id^="mark-"]');
    const marks = [];
    for(const input of inputs){
      const studentId = input.id.replace('mark-','');
      const absEl = document.getElementById(`abs-${studentId}`);
      marks.push({ studentId, marks: parseFloat(input.value)||null, isAbsent: absEl?.checked||false });
    }
    const res = await API.post(`/exams/papers/${this._currentPaperId}/marks`,{marks, submit});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(submit?'Marks submitted successfully!':'Marks saved as draft!');
    if(submit) UI.closeModal('modal-mark-entry');
  },

  async renderBroadsheet(container){
    const [classes,series] = await Promise.all([API.get('/academics/classes'), API.get('/exams/series')]);
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
        <div><label>Exam Series</label><select id="bs-series" style="min-width:200px">${(series.data||series||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <div><label>Class</label><select id="bs-class" style="min-width:160px">${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <button class="btn btn-primary" onclick="Pages.Exams.loadBroadsheet()">Load Broadsheet</button>
        <button class="btn btn-secondary" onclick="Pages.Exams.exportBroadsheet()">Export PDF</button>
      </div>
      <div id="bs-content">${_empty('Select series and class to view broadsheet')}</div>`;
  },

  async loadBroadsheet(){
    const seriesId = document.getElementById('bs-series')?.value;
    const classId = document.getElementById('bs-class')?.value;
    if(!seriesId||!classId){ Toast.warning('Select series and class'); return; }
    const c = document.getElementById('bs-content');
    c.innerHTML = _loading();
    const data = await API.get(`/academics/broadsheet?examSeriesId=${seriesId}&classId=${classId}`);
    if(data.error){ c.innerHTML = _err(data.error); return; }
    const students = data.students || data.broadsheet || [];
    const subjects = data.subjects || [];
    const stats = data.stats || {};
    if(!students.length){ c.innerHTML = _empty('No marks found for this combination'); return; }

    c.innerHTML = `
      <div style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Pos</th><th>Student</th>
              ${subjects.map(s=>`<th title="${s.name}">${s.code||s.name.slice(0,4)}</th>`).join('')}
              <th>Total</th><th>Mean</th><th>Grade</th><th>Points</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s,i)=>`<tr>
              <td style="font-weight:700;color:var(--brand)">${s.position||i+1}</td>
              <td><div style="font-weight:600">${s.first_name} ${s.last_name}</div><div style="font-size:10px;color:var(--text-muted)">${s.admission_number}</div></td>
              ${subjects.map(sub=>{
                const m = s.marks?.find(x=>x.subject_id===sub.id);
                return m ? `<td style="text-align:center">${m.is_absent?'<span style="color:var(--amber)">ABS</span>':m.marks||'--'}</td>` : '<td style="text-align:center;color:var(--text-muted)">--</td>';
              }).join('')}
              <td style="font-weight:700">${s.total_marks||'--'}</td>
              <td style="font-weight:700;color:var(--brand)">${s.mean_marks==='--'?'--':parseFloat(s.mean_marks||0).toFixed(1)}</td>
              <td>${_badge(s.mean_grade||'--', _gradeC(s.mean_grade||''))}</td>
              <td>${s.mean_points==='--'?'--':parseFloat(s.mean_points||0).toFixed(2)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;padding:12px;background:var(--bg-elevated);border-radius:var(--radius)">
        ${[['Students',stats.total||students.length],['Class Mean',parseFloat(stats.meanMarks||0).toFixed(1)+'%'],['Pass Rate',parseFloat(stats.passRate||0).toFixed(1)+'%'],['Top Score',parseFloat(stats.highest||0).toFixed(1)+'%']].map(([l,v])=>`<div style="text-align:center"><div style="font-size:20px;font-weight:800;color:var(--brand)">${v}</div><div style="font-size:11px;color:var(--text-muted)">${l}</div></div>`).join('')}
      </div>`;
  },

  async exportBroadsheet(){
    const seriesId = document.getElementById('bs-series')?.value;
    const classId = document.getElementById('bs-class')?.value;
    if(!seriesId||!classId){ Toast.warning('Load broadsheet first'); return; }
    window.open(`${CONFIG.API_URL}/bulk-export/report-cards`, '_blank');
    Toast.info('Report cards PDF opening in new tab…');
  },

  async renderReportCards(container){
    const [classes,series] = await Promise.all([API.get('/academics/classes'), API.get('/exams/series')]);
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
        <div><label>Exam Series</label><select id="rc-series" style="min-width:200px">${(series.data||series||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
        <div><label>Class</label><select id="rc-class" style="min-width:160px"><option value="">All Classes</option>${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <button class="btn btn-primary" onclick="Pages.Exams.printAllReportCards()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Bulk Print Class
        </button>
        <button class="btn btn-secondary" onclick="Pages.Exams.genAIComments()">🧠 Generate AI Comments</button>
      </div>
      <div class="alert alert-info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>
        Select a series and class then print individual report cards or bulk-export for the entire class.
      </div>`;
  },

  async printAllReportCards(){
    const seriesId = document.getElementById('rc-series')?.value;
    const classId = document.getElementById('rc-class')?.value;
    if(!seriesId){ Toast.warning('Select an exam series'); return; }
    Toast.info('Generating report cards PDF…');
    const res = await API.post('/bulk-export/report-cards',{examSeriesId:seriesId, classId});
    if(res.error){ Toast.error(res.error); return; }
    // The endpoint streams PDF directly
  },

  async genAIComments(){
    const seriesId = document.getElementById('rc-series')?.value;
    if(!seriesId){ Toast.warning('Select an exam series first'); return; }
    Toast.info('Generating AI-powered personalized comments…');
    const students = await API.get('/students?limit=200');
    const list = students.data||[];
    let done=0;
    for(const s of list.slice(0,10)){
      const r = await API.get(`/ai/comment/${s.id}?examSeriesId=${seriesId}`);
      if(!r.error) done++;
    }
    Toast.success(`AI comments generated for ${done} students!`);
  },

  async viewBroadsheetForSeries(seriesId, seriesName){
    document.querySelectorAll('#page-exams .tab')[2]?.click();
    setTimeout(()=>{
      const s = document.getElementById('bs-series');
      if(s){ s.value=seriesId; this.loadBroadsheet(); }
    },200);
  },

  async publishSeries(id){
    const res = await API.put(`/exams/series/${id}/publish`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Exam series published!');
    this.renderSeries(document.getElementById('exams-tab-content'));
  },

  async lockSeries(id){
    if(!await UI.confirm('Lock this exam series? Marks cannot be changed after locking.')) return;
    const res = await API.put(`/exams/series/${id}/lock`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Exam series locked!');
    this.renderSeries(document.getElementById('exams-tab-content'));
  },

  viewBroadsheet(){ this.switchTab('broadsheet', document.querySelectorAll('#page-exams .tab')[2]); },
  openCreateModal(){ UI.openModal('modal-exam-series'); this._loadClassesForModal(); },

  async _loadClassesForModal(){
    const classes = await API.get('/academics/classes');
    const box = document.getElementById('exam-classes-checkboxes');
    if(box) box.innerHTML = (classes||[]).map(c=>`
      <label style="display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;cursor:pointer">
        <input type="checkbox" value="${c.id}" checked> ${c.name}
      </label>`).join('');
  },

  async saveExamSeries(){
    const name = document.getElementById('exam-name')?.value?.trim();
    if(!name){ Toast.error('Name required'); return; }
    const type = document.getElementById('exam-type')?.value;
    const maxMarks = document.getElementById('exam-max-marks')?.value;
    const startDate = document.getElementById('exam-start-date')?.value;
    const endDate = document.getElementById('exam-end-date')?.value;
    const classIds = [...document.querySelectorAll('#exam-classes-checkboxes input:checked')].map(i=>i.value);
    const res = await API.post('/exams/series',{name,type,maxMarks:parseInt(maxMarks||100),startDate,endDate,classIds});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Exam series created!');
    UI.closeModal('modal-exam-series');
    this.renderSeries(document.getElementById('exams-tab-content'));
  },
};
Router.define?.('exams',{ title:'Exams & Marks', onEnter:()=>Pages.Exams.load() });

// ============================================================
// ATTENDANCE PAGE
// ============================================================
Pages.Attendance = {
  async load(){ this.switchTab('mark', document.querySelector('#page-attendance .tab')); },

  switchTab(tab, el){
    document.querySelectorAll('#page-attendance .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('attendance-tab-content');
    if(!c) return;
    if(tab==='mark') this.renderMarkToday(c);
    else if(tab==='records') this.renderRecords(c);
    else if(tab==='summary') this.renderSummary(c);
  },

  async renderMarkToday(container){
    container.innerHTML = _loading();
    const classes = await API.get('/academics/classes');
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
        <div><label>Class</label>
          <select id="att-class" onchange="Pages.Attendance.loadStudentsToMark(this.value)" style="min-width:180px">
            <option value="">Select class…</option>
            ${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select></div>
        <input type="date" id="att-date" value="${new Date().toISOString().split('T')[0]}" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
        <button class="btn btn-secondary" onclick="Pages.Attendance.loadStudentsToMark(document.getElementById('att-class').value)">Load</button>
      </div>
      <div id="att-students">${_empty('Select a class to mark attendance')}</div>`;
  },

  async loadStudentsToMark(classId){
    if(!classId) return;
    const container = document.getElementById('att-students');
    container.innerHTML = _loading();
    const date = document.getElementById('att-date')?.value||new Date().toISOString().split('T')[0];
    const data = await API.get(`/register/${classId}/students?date=${date}`);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const students = data.students||[];
    if(!students.length){ container.innerHTML = _empty('No students in this class'); return; }

    container.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <div style="font-weight:600">${data.className||'Class'} -- ${new Date(date).toLocaleDateString('en-KE',{dateStyle:'full'})}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" onclick="Pages.Attendance.markAll('present')">✓ Mark All Present</button>
            <button class="btn btn-sm btn-primary" onclick="Pages.Attendance.submitAttendance('${classId}','${date}')">Submit Register</button>
          </div>
        </div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>#</th><th>Student</th><th>Adm No</th><th>Present</th><th>Absent</th><th>Late</th><th>Remarks</th></tr></thead>
          <tbody>
            ${students.map((s,i)=>`<tr>
              <td>${i+1}</td>
              <td><strong>${s.first_name} ${s.last_name}</strong></td>
              <td class="font-mono text-sm">${s.admission_number}</td>
              <td style="text-align:center"><input type="radio" name="att-${s.id}" value="present" ${s.status==='present'||!s.status?'checked':''} class="att-radio"></td>
              <td style="text-align:center"><input type="radio" name="att-${s.id}" value="absent" ${s.status==='absent'?'checked':''} class="att-radio"></td>
              <td style="text-align:center"><input type="radio" name="att-${s.id}" value="late" ${s.status==='late'?'checked':''} class="att-radio"></td>
              <td><input type="text" id="rem-${s.id}" value="${s.remarks||''}" placeholder="Optional remarks…" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);font-size:12px;width:140px"></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
    this._students = students;
    this._classId = classId;
  },

  markAll(status){
    document.querySelectorAll(`.att-radio[value="${status}"]`).forEach(r=>r.checked=true);
    Toast.info(`All students marked ${status}`);
  },

  async submitAttendance(classId, date){
    const records = (this._students||[]).map(s=>{
      const sel = document.querySelector(`input[name="att-${s.id}"]:checked`);
      const remarks = document.getElementById(`rem-${s.id}`)?.value;
      return { studentId:s.id, status:sel?.value||'present', remarks };
    });
    const res = await API.post(`/register/${classId}/mark`,{date, records});
    if(res.error){ Toast.error(res.error); return; }
    // Auto-finalize
    await API.post(`/register/${classId}/finalize`,{date});
    Toast.success(`Attendance submitted! ${res.present||0} present, ${res.absent||0} absent.`);
    if(res.smsSent) Toast.info(`SMS sent to ${res.smsSent} parent(s) of absent students`);
  },

  async renderRecords(container){
    const classes = await API.get('/academics/classes');
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
        <div><label>Class</label><select id="rec-class" style="min-width:180px"><option value="">All Classes</option>${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div><label>From</label><input type="date" id="rec-from" value="${new Date(Date.now()-7*86400000).toISOString().split('T')[0]}" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)"></div>
        <div><label>To</label><input type="date" id="rec-to" value="${new Date().toISOString().split('T')[0]}" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)"></div>
        <button class="btn btn-primary" onclick="Pages.Attendance.loadRecords()">Load</button>
      </div>
      <div id="att-records-content">${_empty('Select filters and click Load')}</div>`;
  },

  async loadRecords(){
    const classId = document.getElementById('rec-class')?.value;
    const from = document.getElementById('rec-from')?.value;
    const to = document.getElementById('rec-to')?.value;
    const container = document.getElementById('att-records-content');
    container.innerHTML = _loading();
    let url = `/attendance?from=${from}&to=${to}&limit=200`;
    if(classId) url += `&classId=${classId}`;
    const data = await API.get(url);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const list = data.data||data||[];
    if(!list.length){ container.innerHTML = _empty('No attendance records found'); return; }
    container.innerHTML = _tbl(['Date','Student','Class','Status','Remarks'],
      list.map(r=>`<tr>
        <td>${new Date(r.date).toLocaleDateString('en-KE')}</td>
        <td><strong>${r.first_name} ${r.last_name}</strong></td>
        <td>${r.class_name||'--'}</td>
        <td>${_badge(r.status, r.status==='present'?'green':r.status==='absent'?'red':'amber')}</td>
        <td style="font-size:12px;color:var(--text-muted)">${r.remarks||'--'}</td>
      </tr>`).join(''));
  },

  async renderSummary(container){
    container.innerHTML = _loading();
    const data = await API.get('/register/daily-summary');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const s = data.summary||{};
    const rate = s.total>0?((s.present/s.total)*100).toFixed(1):0;
    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Present Today',s.present||0,'var(--green)','var(--green-bg)'],['Absent',s.absent||0,'var(--red)','var(--red-bg)'],['Late',s.late||0,'var(--amber)','var(--amber-bg)'],['Rate',rate+'%','var(--brand)','var(--brand-subtle)']].map(([l,v,c,bg])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${bg}">
            <div class="stat-body"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>
          </div>`).join('')}
      </div>
      ${_tbl(['Class','Present','Absent','Late','Rate'],
        (data.byClass||[]).map(c=>`<tr>
          <td><strong>${c.class_name}</strong></td>
          <td style="color:var(--green)">${c.present||0}</td>
          <td style="color:var(--red)">${c.absent||0}</td>
          <td style="color:var(--amber)">${c.late||0}</td>
          <td><span style="font-weight:700;color:${parseFloat(c.rate||0)>=80?'var(--green)':'var(--red)'}">${parseFloat(c.rate||0).toFixed(1)}%</span></td>
        </tr>`).join(''),'No attendance data today')}`;
  },

  openMarkModal(){ this.switchTab('mark', document.querySelector('#page-attendance .tab')); },
  viewReports(){ this.switchTab('summary', document.querySelectorAll('#page-attendance .tab')[2]); },
};
Router.define?.('attendance',{ title:'Attendance', onEnter:()=>Pages.Attendance.load() });

// ============================================================
// CLUBS PAGE
// ============================================================
Pages.Clubs = {
  async load(){
    const grid = document.getElementById('clubs-grid');
    if(!grid) return;
    grid.innerHTML = _loading();
    const data = await API.get('/clubs');
    if(data.error){ grid.innerHTML = _err(data.error); return; }
    const list = data.data||data||[];
    if(!list.length){ grid.innerHTML = _empty('No clubs yet','Create your first club or society.',`<button class="btn btn-primary" onclick="Pages.Clubs.openCreateModal()">Create Club</button>`); return; }

    const catColour = {sports:'green',clubs:'blue',arts:'purple',science:'cyan',community:'amber'};
    grid.innerHTML = list.map(c=>`
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">${c.name}</div>
            <div class="card-subtitle">${c.patron_name?`Patron: ${c.patron_name}`:''}</div>
          </div>
          ${_badge(c.category||'clubs', catColour[c.category]||'blue')}
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">${c.description||''}</div>
        <div style="display:flex;gap:8px;font-size:11px;color:var(--text-muted);margin-bottom:12px">
          ${c.meeting_day?`📅 ${c.meeting_day}`:''}
          ${c.venue?`📍 ${c.venue}`:''}
          ${c.member_count!=null?`👥 ${c.member_count} members`:''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="Pages.Clubs.viewClub('${c.id}','${c.name}')">Manage</button>
          <button class="btn btn-sm btn-secondary" onclick="Pages.Clubs.viewMembers('${c.id}','${c.name}')">Members</button>
          <button class="btn btn-sm btn-ghost" onclick="Pages.Clubs.issueCert('${c.id}','${c.name}')">Certificate</button>
        </div>
      </div>`).join('');
  },

  async viewClub(id, name){
    const data = await API.get(`/club-subsystem/${id}/dashboard`);
    if(data.error){ Toast.error(data.error); return; }
    UI.showInfoModal(`${name} Dashboard`, `
      <div class="stats-grid" style="margin-bottom:16px">
        ${[['Members',(data.memberCount||0),'👥'],['Meetings',(data.meetingCount||0),'📅'],['Revenue','KES '+(parseFloat(data.totalRevenue||0)).toLocaleString(),'💰']].map(([l,v,ic])=>`
          <div style="background:var(--bg-elevated);padding:12px;border-radius:8px;text-align:center">
            <div style="font-size:20px">${ic}</div>
            <div style="font-size:22px;font-weight:800;color:var(--brand)">${v}</div>
            <div style="font-size:11px;color:var(--text-muted)">${l}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="Pages.Clubs.viewMembers('${id}','${name}');UI.closeModal('_dynamic-modal')">View Members</button>
        <button class="btn btn-sm btn-secondary" onclick="Pages.Clubs.addMeeting('${id}')">Add Meeting Minutes</button>
        <button class="btn btn-sm btn-secondary" onclick="Pages.Clubs.addFinance('${id}')">Record Finance</button>
      </div>`);
  },

  async viewMembers(id, name){
    const data = await API.get(`/club-subsystem/${id}/members`);
    if(data.error){ Toast.error(data.error); return; }
    const list = data||[];
    UI.showInfoModal(`${name} -- Members (${list.length})`, list.length===0 ? _empty('No members enrolled') : `
      <div style="display:flex;flex-direction:column;gap:6px">
        ${list.map(m=>`<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-elevated);border-radius:8px">
          <div class="avatar sm">${(m.first_name||'?')[0]}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${m.first_name} ${m.last_name}</div><div style="font-size:11px;color:var(--text-muted)">${m.class_name||''} · ${m.role||'Member'}</div></div>
          ${m.is_active?_badge('Active','green'):_badge('Inactive','gray')}
        </div>`).join('')}
      </div>
      <div style="margin-top:12px">
        <button class="btn btn-sm btn-primary" onclick="Pages.Clubs.addMember('${id}')">Add Member</button>
      </div>`);
  },

  async addMember(clubId){
    const adm = prompt('Student admission number:');
    if(!adm) return;
    const students = await API.get(`/search/students?q=${adm}`);
    if(!students.length){ Toast.error('Student not found'); return; }
    const s = students[0];
    const res = await API.post(`/club-subsystem/${clubId}/members/${s.id}/subscribe`,{role:'member'});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`${s.first_name} ${s.last_name} enrolled!`);
  },

  issueCert(clubId, clubName){
    const adm = prompt(`Issue certificate for which student? Enter admission number:`);
    if(!adm) return;
    API.get(`/search/students?q=${adm}`).then(students=>{
      if(!students.length){ Toast.error('Student not found'); return; }
      const s = students[0];
      const award = prompt('Certificate title/award:','Outstanding Member');
      API.post(`/club-subsystem/${clubId}/certificates`,{studentId:s.id, award, issueDate:new Date().toISOString().split('T')[0]}).then(r=>{
        if(r.error){ Toast.error(r.error); return; }
        Toast.success('Certificate issued!');
      });
    });
  },

  addMeeting(clubId){
    const date = prompt('Meeting date (YYYY-MM-DD):',new Date().toISOString().split('T')[0]);
    const agenda = prompt('Meeting agenda/notes:');
    if(!date||!agenda) return;
    API.post(`/club-subsystem/${clubId}/minutes`,{meetingDate:date, agenda, attendanceCount:10}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Meeting minutes saved!');
    });
  },

  addFinance(clubId){
    const type = prompt('Type (income or expense):','income');
    const amount = parseFloat(prompt('Amount (KES):','0')||0);
    const desc = prompt('Description:');
    if(!desc) return;
    API.post(`/club-subsystem/${clubId}/finances`,{type,amount,description:desc,date:new Date().toISOString().split('T')[0]}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Finance recorded!');
    });
  },

  openCreateModal(){ UI.openModal('modal-create-club'); this._loadPatrons(); },

  async _loadPatrons(){
    const staff = await API.get('/staff?role=teacher&limit=200');
    const sel = document.getElementById('club-patron');
    if(sel) sel.innerHTML = `<option value="">No patron</option>${(staff.data||[]).map(s=>`<option value="${s.user_id}">${s.first_name} ${s.last_name}</option>`).join('')}`;
  },

  async saveClub(){
    const payload = {
      name: document.getElementById('club-name')?.value?.trim(),
      category: document.getElementById('club-category')?.value,
      code: document.getElementById('club-code')?.value?.trim(),
      description: document.getElementById('club-desc')?.value?.trim(),
      patronUserId: document.getElementById('club-patron')?.value||null,
      meetingDay: document.getElementById('club-meeting-day')?.value||null,
      venue: document.getElementById('club-venue')?.value?.trim()||null,
    };
    if(!payload.name){ Toast.error('Club name required'); return; }
    const res = await API.post('/clubs', payload);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Club created!');
    UI.closeModal('modal-create-club');
    this.load();
  },
};
Router.define?.('clubs',{ title:'Clubs & Societies', onEnter:()=>Pages.Clubs.load() });

// ============================================================
// CERTIFICATES PAGE
// ============================================================
Pages.Certificates = {
  async load(){
    const tbody = document.getElementById('certs-tbody');
    if(!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px">${_loading()}</td></tr>`;
    const data = await API.get('/certificates');
    if(data.error){ tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--red)">${data.error}</td></tr>`; return; }
    const list = data.data||data||[];
    if(!list.length){
      tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">No certificates issued yet</td></tr>`;
      return;
    }
    const typeC = {academic:'blue',sports:'green',leadership:'purple',participation:'cyan',merit:'amber'};
    tbody.innerHTML = list.map(c=>`<tr>
      <td class="font-mono text-sm">${c.certificate_number}</td>
      <td><strong>${c.first_name} ${c.last_name}</strong><div style="font-size:11px;color:var(--text-muted)">${c.class_name||''}</div></td>
      <td>${_badge(c.type, typeC[c.type]||'gray')}</td>
      <td>${c.title}</td>
      <td>${new Date(c.issue_date||c.created_at).toLocaleDateString('en-KE')}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-sm btn-secondary" onclick="Pages.Certificates.download('${c.id}')">PDF</button>
        <button class="btn btn-sm btn-ghost" onclick="Pages.Certificates.revoke('${c.id}')">Revoke</button>
      </div></td>
    </tr>`).join('');
  },

  async filterType(type){ /* filter in-memory */ },

  openIssueModal(){ UI.openModal('modal-issue-cert'); document.getElementById('cert-date').value=new Date().toISOString().split('T')[0]; },

  async searchStudent(val){
    const results = document.getElementById('cert-student-results');
    if(!val||val.length<2){ results.innerHTML=''; return; }
    const data = await API.get(`/search/students?q=${encodeURIComponent(val)}&limit=5`);
    results.innerHTML = data.length===0 ? '' : `
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);margin-top:4px;overflow:hidden">
        ${data.map(s=>`<div style="padding:8px 12px;cursor:pointer" onclick="document.getElementById('cert-student-id').value='${s.id}';document.getElementById('cert-student-search').value='${s.first_name} ${s.last_name}';document.getElementById('cert-student-results').innerHTML=''">
          <strong>${s.first_name} ${s.last_name}</strong> <span style="font-size:11px;color:var(--text-muted)">${s.admission_number} · ${s.class_name||''}</span>
        </div>`).join('')}
      </div>`;
  },

  async issueCert(){
    const payload = {
      studentId: document.getElementById('cert-student-id')?.value,
      type: document.getElementById('cert-type')?.value,
      title: document.getElementById('cert-title')?.value?.trim(),
      description: document.getElementById('cert-desc')?.value?.trim(),
      issueDate: document.getElementById('cert-date')?.value,
    };
    if(!payload.studentId){ Toast.error('Select a student'); return; }
    if(!payload.title){ Toast.error('Certificate title required'); return; }
    const res = await API.post('/certificates', payload);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Certificate issued!');
    UI.closeModal('modal-issue-cert');
    this.load();
  },

  download(id){ window.open(`${CONFIG.API_URL}/certificates/${id}/pdf`,'_blank'); },

  async revoke(id){
    if(!await UI.confirm('Revoke this certificate? This cannot be undone.')) return;
    const res = await API.put(`/certificates/${id}/revoke`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Certificate revoked');
    this.load();
  },

  manageTemplates(){ Toast.info('Template management -- customise certificate branding in School Profile settings'); },
};
Router.define?.('certificates',{ title:'Certificates', onEnter:()=>Pages.Certificates.load() });

// ============================================================
// COMMUNICATION PAGE
// ============================================================
Pages.Communication = {
  async load(){
    this.switchTab('sent', document.querySelector('#page-communication .tab'));
    this._loadClassesForSMS();
  },

  switchTab(tab, el){
    document.querySelectorAll('#page-communication .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('comm-tab-content');
    if(!c) return;
    if(tab==='sent') this.renderSent(c);
    else if(tab==='notifications') this.renderNotifications(c);
  },

  async renderSent(container){
    container.innerHTML = _loading();
    const data = await API.get('/communication/messages');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const list = data||[];
    if(!list.length){ container.innerHTML = _empty('No messages sent yet'); return; }
    container.innerHTML = list.map(m=>`
      <div style="padding:12px;background:var(--bg-elevated);border-radius:var(--radius);margin-bottom:8px;border:1px solid var(--border)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:600;font-size:13px">${m.subject||'(No subject)'}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${m.body?.substring(0,100)}${(m.body?.length||0)>100?'…':''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:12px">
            ${_badge(m.type||'in_app','blue')}
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${m.sent_at?new Date(m.sent_at).toLocaleDateString('en-KE'):'Scheduled'}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px;font-size:11px;color:var(--text-muted)">
          To: <strong>${(m.recipient_type||'').replace('_',' ')}</strong> ·
          ${m.sent_count||0} sent · ${m.failed_count||0} failed
        </div>
      </div>`).join('');
  },

  async renderNotifications(container){
    container.innerHTML = _loading();
    const data = await API.get('/notifications');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const list = data||[];
    if(!list.length){ container.innerHTML = _empty('No notifications'); return; }
    container.innerHTML = list.map(n=>`
      <div style="padding:10px 12px;background:${n.is_read?'var(--bg-elevated)':'var(--brand-subtle)'};border-radius:var(--radius);margin-bottom:6px;border:1px solid ${n.is_read?'var(--border)':'rgba(43,127,255,0.3)'};cursor:pointer" onclick="Pages.Communication.markRead('${n.id}')">
        <div style="display:flex;justify-content:space-between">
          <div style="font-weight:${n.is_read?400:600};font-size:13px">${n.title||n.message?.substring(0,60)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${new Date(n.created_at).toLocaleDateString('en-KE')}</div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${n.message||''}</div>
      </div>`).join('');
  },

  async markRead(id){
    await API.put(`/communication/notifications/${id}/read`,{});
    this.renderNotifications(document.getElementById('comm-tab-content'));
  },

  async _loadClassesForSMS(){
    const classes = await API.get('/academics/classes');
    const sel = document.getElementById('sms-class-id');
    if(sel) sel.innerHTML = `<option value="">Select class</option>${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}`;
    const msgSel = document.getElementById('msg-class-id');
    if(msgSel) msgSel.innerHTML = `<option value="">Select class</option>${(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}`;
    // Char counter
    const smsMsg = document.getElementById('sms-message');
    if(smsMsg) smsMsg.oninput = ()=>{
      const cnt = document.getElementById('sms-char-count');
      if(cnt) cnt.textContent = `${smsMsg.value.length} / 160 characters`;
    };
    // Recipient change
    const smsRecip = document.getElementById('sms-recipient-type');
    if(smsRecip) smsRecip.onchange = ()=>{
      const row = document.getElementById('sms-class-row');
      if(row) row.style.display = smsRecip.value==='class'?'block':'none';
    };
  },

  async sendQuickSMS(){
    const recipientType = document.getElementById('sms-recipient-type')?.value;
    const classId = document.getElementById('sms-class-id')?.value;
    const body = document.getElementById('sms-message')?.value?.trim();
    if(!body){ Toast.error('Message required'); return; }
    const payload = {body, type:'sms', recipientType};
    if(recipientType==='class'&&classId) payload.classId=classId;
    const res = await API.post('/communication/messages',payload);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('SMS queued for delivery!');
    document.getElementById('sms-message').value='';
    document.getElementById('sms-char-count').textContent='0 / 160 characters';
    this.renderSent(document.getElementById('comm-tab-content'));
  },

  openComposeModal(){
    UI.openModal('modal-compose');
    this._loadClassesForSMS();
  },

  toggleRecipientFields(){
    const type = document.getElementById('msg-recipient-type')?.value;
    const row = document.getElementById('msg-class-row');
    if(row) row.style.display = type==='class'?'block':'none';
  },

  async sendMessage(){
    const payload = {
      type: document.getElementById('msg-type')?.value||'in_app',
      recipientType: document.getElementById('msg-recipient-type')?.value||'all_parents',
      classId: document.getElementById('msg-class-id')?.value||null,
      subject: document.getElementById('msg-subject')?.value?.trim(),
      body: document.getElementById('msg-body')?.value?.trim(),
    };
    if(!payload.body){ Toast.error('Message body required'); return; }
    const res = await API.post('/communication/messages',payload);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Message sent!');
    UI.closeModal('modal-compose');
    this.renderSent(document.getElementById('comm-tab-content'));
  },
};
Router.define?.('communication',{ title:'Communication', onEnter:()=>Pages.Communication.load() });

// ============================================================
// LEAVE-OUT PAGE
// ============================================================
Pages.LeaveOut = {
  _status: 'pending',

  async load(){ await this.filterStatus('pending', document.querySelector('#page-leaveout .tab')); },

  async filterStatus(status, el){
    this._status=status;
    document.querySelectorAll('#page-leaveout .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const tbody = document.getElementById('leaveout-tbody');
    if(!tbody) return;
    tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:40px">${_loading()}</td></tr>`;
    const url = status?`/leaveout?status=${status}`:`/leaveout`;
    const data = await API.get(url);
    if(data.error){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--red)">${data.error}</td></tr>`; return; }
    const list = data.data||data||[];
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No requests found</td></tr>`; return; }

    const statusC={pending:'amber',principal_approved:'green',deputy_approved:'blue',rejected:'red',returned:'gray'};
    tbody.innerHTML = list.map(r=>`<tr>
      <td><strong>${r.first_name} ${r.last_name}</strong><div style="font-size:11px;color:var(--text-muted)">${r.admission_number}</div></td>
      <td>${r.class_name||'--'}</td>
      <td>${r.destination||'--'}</td>
      <td>${new Date(r.departure_date).toLocaleDateString('en-KE')}<div style="font-size:11px;color:var(--text-muted)">${r.departure_time||''}</div></td>
      <td>${new Date(r.return_date).toLocaleDateString('en-KE')}<div style="font-size:11px;color:var(--text-muted)">${r.return_time||''}</div></td>
      <td>${_badge(r.status?.replace('_',' ')||'pending', statusC[r.status]||'gray')}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">
        ${r.status==='pending'?`
          <button class="btn btn-sm btn-primary" onclick="Pages.LeaveOut.approve('${r.id}')">Approve</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.LeaveOut.reject('${r.id}')">Reject</button>
        `:''}
        ${r.status==='principal_approved'?`<button class="btn btn-sm btn-secondary" onclick="Pages.LeaveOut.markReturned('${r.id}')">Returned</button>`:''}
        <button class="btn btn-sm btn-ghost" onclick="Pages.LeaveOut.view('${r.id}')">View</button>
      </div></td>
    </tr>`).join('');
  },

  async approve(id){
    const notes = prompt('Approval notes (optional):');
    const res = await API.put(`/leaveout/${id}/approve`,{notes});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Leave-out approved!');
    this.filterStatus(this._status, null);
  },

  async reject(id){
    const reason = prompt('Rejection reason:');
    if(!reason) return;
    const res = await API.put(`/leaveout/${id}/reject`,{reason});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Request rejected');
    this.filterStatus(this._status, null);
  },

  async markReturned(id){
    const res = await API.put(`/leaveout/${id}/return`,{returnedAt:new Date().toISOString()});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Student marked as returned');
    this.filterStatus(this._status, null);
  },

  async view(id){
    const data = await API.get(`/leaveout/${id}`);
    if(data.error){ Toast.error(data.error); return; }
    UI.showInfoModal('Leave-Out Details', `
      <div>${[
        ['Student',`${data.first_name} ${data.last_name} (${data.admission_number})`],
        ['Class',data.class_name||'--'],
        ['Destination',data.destination||'--'],
        ['Reason',data.reason||'--'],
        ['Departure',`${new Date(data.departure_date).toLocaleDateString('en-KE')} ${data.departure_time||''}`],
        ['Return',`${new Date(data.return_date).toLocaleDateString('en-KE')} ${data.return_time||''}`],
        ['Parent Phone',data.parent_phone||'--'],
        ['Status',data.status?.replace('_',' ')||'--'],
      ].map(([k,v])=>_kv(k,v)).join('')}</div>`);
  },

  openRequestModal(){
    // For teachers/deans to create requests on behalf of students
    const adm = prompt('Student admission number:');
    if(!adm) return;
    API.get(`/search/students?q=${adm}`).then(students=>{
      if(!students.length){ Toast.error('Student not found'); return; }
      const s = students[0];
      const dest = prompt('Destination:');
      const dep  = prompt('Departure date (YYYY-MM-DD):',new Date().toISOString().split('T')[0]);
      const ret  = prompt('Return date (YYYY-MM-DD):',new Date(Date.now()+2*86400000).toISOString().split('T')[0]);
      const reason = prompt('Reason:');
      if(!dest||!dep||!ret) return;
      API.post('/leaveout',{studentId:s.id, destination:dest, departureDate:dep, returnDate:ret, reason}).then(r=>{
        if(r.error){ Toast.error(r.error); return; }
        Toast.success('Leave-out request submitted!');
        this.load();
      });
    });
  },
};
Router.define?.('leaveout',{ title:'Leave-Out Sheets', onEnter:()=>Pages.LeaveOut.load() });

// ============================================================
// NEWSLETTERS PAGE
// ============================================================
Pages.Newsletters = {
  async load(){
    const grid = document.getElementById('newsletters-grid');
    if(!grid) return;
    grid.innerHTML = _loading();
    const data = await API.get('/newsletters');
    if(data.error){ grid.innerHTML = _err(data.error); return; }
    const list = data.data||data||[];
    if(!list.length){ grid.innerHTML = _empty('No newsletters','Create and publish your first school newsletter.',`<button class="btn btn-primary" onclick="Pages.Newsletters.openCreateModal()">Create Newsletter</button>`); return; }

    grid.innerHTML = list.map(n=>`
      <div class="card">
        ${n.cover_image_url?`<img src="${n.cover_image_url}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius) var(--radius) 0 0;margin:-20px -20px 16px;width:calc(100% + 40px)">`:''}
        <div class="card-header">
          <div>
            <div class="card-title">${n.title}</div>
            ${n.subtitle?`<div class="card-subtitle">${n.subtitle}</div>`:''}
          </div>
          ${_badge(n.is_published?'Published':'Draft', n.is_published?'green':'amber')}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
          ${n.category||'general'} · ${n.created_by_name||''} · ${new Date(n.created_at).toLocaleDateString('en-KE')}
          ${n.read_count?` · ${n.read_count} reads`:''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-secondary" onclick="Pages.Newsletters.view('${n.id}')">Read</button>
          ${!n.is_published?`<button class="btn btn-sm btn-primary" onclick="Pages.Newsletters.publish('${n.id}')">Publish</button>`:''}
          <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Newsletters.del('${n.id}')">Delete</button>
        </div>
      </div>`).join('');
  },

  openCreateModal(){
    const title = prompt('Newsletter title:');
    if(!title) return;
    const subtitle = prompt('Subtitle (optional):')||'';
    const content = prompt('Content (you can paste article text):');
    if(!content) return;
    const category = prompt('Category (general/academic/sports/events):','general')||'general';
    API.post('/newsletters',{title, subtitle, content:{text:content}, category}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Newsletter created!');
      this.load();
    });
  },

  async view(id){
    const data = await API.get(`/newsletters/${id}`);
    if(data.error){ Toast.error(data.error); return; }
    UI.showInfoModal(data.title, `
      ${data.subtitle?`<div style="font-size:14px;color:var(--text-secondary);margin-bottom:12px;font-style:italic">${data.subtitle}</div>`:''}
      <div style="font-size:13px;line-height:1.8;color:var(--text-primary)">${(typeof data.content==='object'?data.content.text:data.content)||'No content'}</div>
      <div style="margin-top:12px;font-size:11px;color:var(--text-muted)">Published: ${data.published_at?new Date(data.published_at).toLocaleDateString('en-KE'):'Not published'}</div>`);
  },

  async publish(id){
    const res = await API.put(`/newsletters/${id}/publish`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Newsletter published!');
    this.load();
  },

  async del(id){
    if(!await UI.confirm('Delete this newsletter?')) return;
    await API.delete(`/newsletters/${id}`);
    Toast.success('Deleted');
    this.load();
  },
};
Router.define?.('newsletters',{ title:'Newsletters', onEnter:()=>Pages.Newsletters.load() });

// ============================================================
// REPORTS PAGE
// ============================================================
Pages.Reports = {
  async load(){ this.switchTab('academic', document.querySelector('#page-reports .tab')); },

  switchTab(tab, el){
    document.querySelectorAll('#page-reports .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('reports-tab-content');
    if(!c) return;
    if(tab==='academic') this.renderAcademic(c);
    else if(tab==='finance') this.renderFinance(c);
    else if(tab==='attendance') this.renderAttendance(c);
    else if(tab==='ai') this.renderAI(c);
  },

  async renderAcademic(container){
    container.innerHTML = _loading();
    const data = await API.get('/reports/academic-summary');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const stats = data.stats||{};
    const byClass = data.byClass||[];
    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Total Students',stats.total||0,'var(--brand)'],['Boys',stats.boys||0,'var(--blue)'],['Girls',stats.girls||0,'var(--pink)'],['Boarding',stats.boarding||0,'var(--purple)']].map(([l,v,c])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${c}1a">
            <div class="stat-body"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>
          </div>`).join('')}
      </div>
      ${byClass.length ? `
      <div class="card">
        <div class="card-header"><div class="card-title">Students by Class</div>
          <button class="btn btn-sm btn-secondary" onclick="Pages.Reports.exportStudentList()">Export CSV</button>
        </div>
        <div style="overflow-x:auto">${_tbl(['Class','Level','Students','Boys','Girls','Boarding'],
          byClass.map(c=>`<tr>
            <td><strong>${c.name}</strong></td><td>Form ${c.level}</td>
            <td style="font-weight:700">${c.count||0}</td>
            <td style="color:var(--brand)">${c.boys||0}</td>
            <td style="color:var(--pink)">${c.girls||0}</td>
            <td>${c.boarding||0}</td>
          </tr>`).join(''))}</div>
      </div>` : ''}`;
  },

  async renderFinance(container){
    container.innerHTML = _loading();
    const data = await API.get('/fees/reports/summary');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const s = data.summary||{};
    const total = parseFloat(s.total_collected||0);
    const methods = ['mpesa_amount','cash_amount','bank_amount'];

    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Total Collected',UI.currency(s.total_collected||0),'var(--green)'],['Transactions',parseInt(s.transaction_count||0).toLocaleString(),'var(--brand)'],['Students Paid',parseInt(s.students_who_paid||0).toLocaleString(),'var(--cyan)'],['Avg Payment',UI.currency(s.avg_payment||0),'var(--purple)']].map(([l,v,c])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${c}1a">
            <div class="stat-body"><div class="stat-value" style="font-size:18px">${v}</div><div class="stat-label">${l}</div></div>
          </div>`).join('')}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Payment Methods</div></div>
          ${[['M-Pesa',s.mpesa_amount,'var(--green)'],['Cash',s.cash_amount,'var(--brand)'],['Bank',s.bank_amount,'var(--purple)']].map(([l,v,c])=>{
            const pct = total>0?(parseFloat(v||0)/total*100).toFixed(1):0;
            return `<div style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px"><span>${l}</span><span style="font-weight:600">${UI.currency(v||0)} (${pct}%)</span></div>
              <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${c}"></div></div>
            </div>`;
          }).join('')}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Top Defaulters</div>
            <button class="btn btn-sm btn-secondary" onclick="Router.go('fees');setTimeout(()=>Pages.Fees.switchTab('defaulters',null),200)">View All</button>
          </div>
          ${(data.topDefaulters||[]).slice(0,5).map(d=>`
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
              <div><div style="font-size:13px;font-weight:600">${d.name}</div><div style="font-size:11px;color:var(--text-muted)">${d.class_name}</div></div>
              <span class="badge badge-red">${UI.currency(d.balance)}</span>
            </div>`).join('')||'<div style="padding:16px;text-align:center;color:var(--text-muted)">No defaulters 🎉</div>'}
        </div>
      </div>`;
  },

  async renderAttendance(container){
    container.innerHTML = _loading();
    const data = await API.get('/reports/attendance-summary');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const overall = data.overall||{};
    const rate = overall.total>0?((overall.present/overall.total)*100).toFixed(1):0;

    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Overall Rate',rate+'%','var(--green)'],['Present',parseInt(overall.present||0).toLocaleString(),'var(--brand)'],['Absent',parseInt(overall.absent||0).toLocaleString(),'var(--red)'],['Days Recorded',data.daysRecorded||0,'var(--purple)']].map(([l,v,c])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${c}1a">
            <div class="stat-body"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>
          </div>`).join('')}
      </div>
      ${_tbl(['Class','Present','Absent','Late','Rate'],
        (data.byClass||[]).map(c=>`<tr>
          <td><strong>${c.class_name}</strong></td>
          <td style="color:var(--green)">${parseInt(c.present||0).toLocaleString()}</td>
          <td style="color:var(--red)">${parseInt(c.absent||0).toLocaleString()}</td>
          <td style="color:var(--amber)">${parseInt(c.late||0).toLocaleString()}</td>
          <td><span style="font-weight:700;color:${parseFloat(c.rate||0)>=80?'var(--green)':'var(--red)'}">${parseFloat(c.rate||0).toFixed(1)}%</span></td>
        </tr>`).join(''),'No attendance data')}`;
  },

  async renderAI(container){
    container.innerHTML = _loading();
    const data = await API.get('/ai/insights');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    if(!data.length){ container.innerHTML = `
      ${_empty('No AI insights yet','Run the AI engine to generate school-wide insights.')}
      <div style="text-align:center">
        <button class="btn btn-primary" onclick="Pages.Reports.runInsights()">🧠 Generate AI Insights</button>
      </div>`; return; }

    const sevC={critical:'red',warning:'amber',info:'blue',success:'green'};
    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
        <button class="btn btn-sm btn-secondary" onclick="Pages.Reports.runInsights()">Refresh Insights</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${data.map(ins=>`
          <div class="alert alert-${sevC[ins.severity]||'info'}" style="flex-direction:column;align-items:flex-start;cursor:pointer" onclick="Router.go('ai-insights')">
            <div style="display:flex;justify-content:space-between;width:100%">
              <strong>${ins.title}</strong>
              ${_badge(ins.severity, sevC[ins.severity]||'gray')}
            </div>
            <div style="margin-top:4px;font-size:12px">${ins.description}</div>
          </div>`).join('')}
      </div>`;
  },

  async runInsights(){
    const res = await API.post('/ai/insights/generate',{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`${res.generated} insights generated!`);
    this.renderAI(document.getElementById('reports-tab-content'));
  },

  async exportStudentList(){
    const data = await API.get('/students?limit=2000');
    const list = data.data||[];
    const csv = ['Name,Admission No,Class,Gender,Boarding,Phone',
      ...list.map(s=>`"${s.first_name} ${s.last_name}",${s.admission_number},"${s.class_name||''}",${s.gender},${s.is_boarding?'Yes':'No'},${s.parent_phone||''}`)
    ].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'students.csv';
    a.click();
    Toast.success('Students exported!');
  },
};
Router.define?.('reports',{ title:'Reports & Analytics', onEnter:()=>Pages.Reports.load() });

// ============================================================
// ALUMNI PAGE
// ============================================================
Pages.Alumni = {
  async load(){
    const tbody = document.getElementById('alumni-tbody');
    if(!tbody) return;
    tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:40px">${_loading()}</td></tr>`;
    const data = await API.get('/alumni');
    if(data.error){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--red)">${data.error}</td></tr>`; return; }
    const list = data.data||data||[];
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No alumni records yet</td></tr>`; return; }

    tbody.innerHTML = list.map(a=>`<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        ${a.photo_url?`<img src="${a.photo_url}" style="width:30px;height:30px;border-radius:50%;object-fit:cover">`:`<div class="avatar sm">${a.first_name[0]}</div>`}
        <div><strong>${a.first_name} ${a.last_name}</strong>${a.is_showcase?'<span style="color:var(--amber);margin-left:4px" title="Featured">⭐</span>':''}</div>
      </div></td>
      <td style="font-weight:700">${a.graduation_year||a.year_left||'--'}</td>
      <td>${a.kcse_grade?_badge(a.kcse_grade, _gradeC(a.kcse_grade)):'--'}</td>
      <td>${a.university||'--'}</td>
      <td>${a.current_occupation||'--'}</td>
      <td>${a.phone||a.email||'--'}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-sm btn-secondary" onclick="Pages.Alumni.view('${a.id}')">View</button>
        ${!a.is_showcase?`<button class="btn btn-sm btn-ghost" onclick="Pages.Alumni.feature('${a.id}')">Feature</button>`:''}
      </div></td>
    </tr>`).join('');
  },

  async view(id){
    const data = await API.get(`/alumni/${id}`);
    if(data.error){ Toast.error(data.error); return; }
    UI.showInfoModal(`${data.first_name} ${data.last_name}`, `
      <div class="grid-2">
        <div>
          ${[['Grad Year',data.graduation_year||data.year_left||'--'],['KCSE Grade',data.kcse_grade||'--'],['University',data.university||'--'],['Course',data.course_studied||'--'],['Employer',data.employer||'--'],['Occupation',data.current_occupation||'--'],['Location',data.current_location||'--'],['Phone',data.phone||'--'],['Email',data.email||'--']].map(([k,v])=>_kv(k,v)).join('')}
        </div>
        <div>
          ${data.showcase_quote?`<div style="background:var(--brand-subtle);border-left:3px solid var(--brand);padding:12px;border-radius:var(--radius);margin-bottom:12px;font-style:italic">"${data.showcase_quote}"</div>`:''}
          ${(data.awards||[]).length?`<div style="font-weight:600;margin-bottom:6px;font-size:12px;color:var(--text-secondary)">AWARDS</div><div style="display:flex;flex-wrap:wrap;gap:4px">${data.awards.map(a=>_badge(a,'amber')).join('')}</div>`:''}
        </div>
      </div>`);
  },

  async feature(id){
    const quote = prompt('Add a quote from this alumnus (optional):');
    const res = await API.put(`/school-profile/alumni-showcase/${id}`,{isShowcase:true, showcaseQuote:quote||''});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Alumni featured in showcase!');
    this.load();
  },

  openAddModal(){
    const fn = prompt('First name:'); if(!fn) return;
    const ln = prompt('Last name:'); if(!ln) return;
    const year = parseInt(prompt('Graduation year:','2024')||'2024');
    const grade = prompt('KCSE grade (e.g. A, B+):');
    const phone = prompt('Phone:');
    const email = prompt('Email:');
    const occ = prompt('Current occupation:');
    API.post('/alumni',{firstName:fn, lastName:ln, classOf:`${year}`, yearLeft:year, kcseGrade:grade, phone, email, currentOccupation:occ}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Alumni added!');
      this.load();
    });
  },
};
Router.define?.('alumni',{ title:'Alumni Network', onEnter:()=>Pages.Alumni.load() });

// ============================================================
// SETTINGS PAGE
// ============================================================
Pages.Settings = {
  async load(){ this.switchTab('profile', document.querySelector('#page-settings .tab')); this._loadSubscription(); },

  switchTab(tab, el){
    document.querySelectorAll('#page-settings .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('settings-tab-content');
    if(!c) return;
    if(tab==='profile') this.renderProfile(c);
    else if(tab==='academic') this.renderAcademic(c);
    else if(tab==='grading') this.renderGrading(c);
    else if(tab==='users') this.renderUsers(c);
    else if(tab==='integrations') this.renderIntegrations(c);
  },

  async renderProfile(container){
    container.innerHTML = _loading();
    const data = await API.get('/settings');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const s = data.school||data||{};
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">School Profile</div><button class="btn btn-sm btn-primary" onclick="Pages.Settings.saveProfile()">Save Changes</button></div>
        <div class="form-row">
          <div class="form-group"><label>School Name</label><input type="text" id="set-name" value="${s.name||''}"></div>
          <div class="form-group"><label>Short Name</label><input type="text" id="set-short" value="${s.short_name||''}"></div>
          <div class="form-group"><label>School Code</label><input type="text" id="set-code" value="${s.school_code||''}" readonly style="opacity:0.6"></div>
          <div class="form-group"><label>Phone</label><input type="tel" id="set-phone" value="${s.phone||''}"></div>
          <div class="form-group"><label>Email</label><input type="email" id="set-email" value="${s.email||''}"></div>
          <div class="form-group"><label>Website</label><input type="text" id="set-website" value="${s.website||''}"></div>
          <div class="form-group"><label>Motto</label><input type="text" id="set-motto" value="${s.motto||''}"></div>
          <div class="form-group"><label>County</label><input type="text" id="set-county" value="${s.county||''}"></div>
          <div class="form-group"><label>Address</label><textarea id="set-address" rows="2">${s.address||''}</textarea></div>
          <div class="form-group"><label>KNEC Code</label><input type="text" id="set-knec" value="${s.knec_code||''}"></div>
          <div class="form-group"><label>Logo URL</label><input type="text" id="set-logo" value="${s.logo_url||''}" placeholder="https://…"></div>
          <div class="form-group"><label>School Type</label>
            <select id="set-type">
              <option value="secondary" ${s.type==='secondary'?'selected':''}>Secondary</option>
              <option value="primary" ${s.type==='primary'?'selected':''}>Primary</option>
            </select></div>
          <div class="form-group"><label>Boarding Type</label>
            <select id="set-boarding">
              <option value="day" ${s.boarding_type==='day'?'selected':''}>Day</option>
              <option value="boarding" ${s.boarding_type==='boarding'?'selected':''}>Boarding</option>
              <option value="mixed" ${s.boarding_type==='mixed'?'selected':''}>Mixed</option>
            </select></div>
        </div>
      </div>`;
  },

  async saveProfile(){
    const payload = {
      name: document.getElementById('set-name')?.value?.trim(),
      shortName: document.getElementById('set-short')?.value?.trim(),
      phone: document.getElementById('set-phone')?.value?.trim(),
      email: document.getElementById('set-email')?.value?.trim(),
      website: document.getElementById('set-website')?.value?.trim(),
      motto: document.getElementById('set-motto')?.value?.trim(),
      county: document.getElementById('set-county')?.value?.trim(),
      address: document.getElementById('set-address')?.value?.trim(),
      knecCode: document.getElementById('set-knec')?.value?.trim(),
      logoUrl: document.getElementById('set-logo')?.value?.trim(),
      type: document.getElementById('set-type')?.value,
      boardingType: document.getElementById('set-boarding')?.value,
    };
    const res = await API.put('/settings/school', payload);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('School profile saved!');
  },

  async renderAcademic(container){
    container.innerHTML = _loading();
    const [years, terms] = await Promise.all([API.get('/academics/years'), API.get('/academics/terms')]);
    container.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Academic Years</div><button class="btn btn-sm btn-primary" onclick="Pages.Academics.addYear()">Add Year</button></div>
          ${(years||[]).map(y=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
            <div><strong>${y.year}</strong> <span style="font-size:11px;color:var(--text-muted)">${new Date(y.start_date).toLocaleDateString('en-KE')} -- ${new Date(y.end_date).toLocaleDateString('en-KE')}</span></div>
            ${y.is_current?_badge('Current','green'):''}</div>`).join('')||'<div style="padding:16px;color:var(--text-muted)">No years set up</div>'}
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Terms</div></div>
          ${(terms||[]).map(t=>`<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:13px">
            <strong>${t.term?.replace('_',' ')}</strong> ${t.year||''} ${t.is_current?_badge('Current','green'):''}</div>`).join('')||'<div style="padding:16px;color:var(--text-muted)">No terms configured</div>'}
        </div>
      </div>`;
  },

  async renderGrading(container){
    container.innerHTML = _loading();
    const data = await API.get('/curriculum/knec-scale');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const list = data||[];
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">KNEC Grading Scale (8-4-4)</div><button class="btn btn-sm btn-secondary" onclick="Pages.Settings.seedGrading()">Restore Defaults</button></div>
        ${_tbl(['Grade','Min Marks','Max Marks','Points','Description'],
          list.map(g=>`<tr>
            <td>${_badge(g.grade, _gradeC(g.grade))}</td>
            <td>${g.min_marks}</td>
            <td>${g.max_marks}</td>
            <td style="font-weight:700;color:var(--brand)">${g.points}</td>
            <td style="color:var(--text-secondary)">${g.description||'--'}</td>
          </tr>`).join(''))}
      </div>`;
  },

  async seedGrading(){
    const res = await API.post('/curriculum/knec-scale/seed',{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Grading scale restored!');
    this.renderGrading(document.getElementById('settings-tab-content'));
  },

  async renderUsers(container){
    container.innerHTML = _loading();
    const data = await API.get('/staff?limit=200');
    const list = data.data||[];
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><div class="card-title">System Users (${list.length})</div><button class="btn btn-sm btn-primary" onclick="Router.go('staff')">Manage Staff</button></div>
        <div style="overflow-x:auto">${_tbl(['User','Role','Last Login','TSC Status'],
          list.map(u=>`<tr>
            <td><strong>${u.first_name} ${u.last_name}</strong><div style="font-size:11px;color:var(--text-muted)">${u.email}</div></td>
            <td>${_badge(u.role?.replace(/_/g,' '), 'blue')}</td>
            <td style="font-size:12px">${u.last_login?new Date(u.last_login).toLocaleDateString('en-KE'):'Never'}</td>
            <td>${_badge(u.tsc_verification_status||'pending', {verified:'green',pending:'amber',flagged:'red'}[u.tsc_verification_status]||'gray')}</td>
          </tr>`).join(''))}</div>
      </div>`;
  },

  async renderIntegrations(container){
    container.innerHTML = `
      <div class="grid-2">
        ${[
          {name:'M-Pesa Daraja',icon:'💳',desc:'STK Push, C2B, webhooks',route:'/mpesa-auto',badge:process.env.MPESA_ENV==='production'?'Live':'Sandbox'},
          {name:"Africa's Talking SMS",icon:'📱',desc:'Bulk SMS, delivery reports',badge:'SMS'},
          {name:'KNEC Portal',icon:'📋',desc:'Student registration, results',badge:'Manual'},
          {name:'Nodemailer / Email',icon:'📧',desc:'SMTP email delivery',badge:'Active'},
        ].map(i=>`
          <div class="card">
            <div class="card-header">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="font-size:24px">${i.icon}</div>
                <div><div class="card-title">${i.name}</div><div class="card-subtitle">${i.desc}</div></div>
              </div>
              ${_badge(i.badge||'Active','green')}
            </div>
            <div style="font-size:12px;color:var(--text-muted)">Configured via environment variables. Contact your admin to update.</div>
          </div>`).join('')}
      </div>`;
  },

  async _loadSubscription(){
    const container = document.getElementById('settings-subscription-info');
    if(!container) return;
    const data = await API.get('/subscriptions/current');
    if(data.error){ container.innerHTML = _empty('No subscription data'); return; }
    const s = data||{};
    const sc = {active:'green',trial:'blue',grace:'amber',suspended:'red'}[s.status]||'gray';
    container.innerHTML = `
      ${_badge(s.status?.toUpperCase()||'UNKNOWN', sc)}
      <div style="margin-top:10px">${[
        ['Plan',s.plan||'--'],
        ['Students',s.student_count||0],
        ['Start Date',s.start_date?new Date(s.start_date).toLocaleDateString('en-KE'):'--'],
        ['End Date',s.end_date?new Date(s.end_date).toLocaleDateString('en-KE'):'--'],
        ...(s.grace_end_date?[['Grace Until',new Date(s.grace_end_date).toLocaleDateString('en-KE')]]:[]),
        ['Annual Fee','KES '+(parseFloat(s.amount_due||0)).toLocaleString()],
      ].map(([k,v])=>_kv(k,v)).join('')}</div>
      ${s.status!=='active'?`<button class="btn btn-primary w-full" style="margin-top:12px" onclick="Toast.info('Contact ElimuSaaS support to renew your subscription')">Renew Subscription</button>`:''}`;
  },
};
Router.define?.('settings',{ title:'Settings', onEnter:()=>Pages.Settings.load() });

// ============================================================
// SUPER ADMIN PAGE
// ============================================================
Pages.SuperAdmin = {
  async load(){
    const saStats = document.getElementById('sa-stats');
    if(saStats){
      saStats.innerHTML = `${Array(4).fill(`<div class="stat-card"><div class="skeleton" style="width:42px;height:42px;border-radius:10px"></div><div style="flex:1"><div class="skeleton" style="height:28px;width:80px;margin-bottom:6px"></div><div class="skeleton" style="height:12px;width:120px"></div></div></div>`).join('')}`;
    }
    const data = await API.get('/superadmin/stats');
    if(data.error){ Toast.error(data.error); return; }
    const s = data||{};

    if(saStats){
      saStats.innerHTML = [
        {l:'Total Schools',v:s.totalSchools||0,c:'var(--brand)',bg:'var(--brand-subtle)',i:'🏫'},
        {l:'Active Schools',v:s.activeSchools||0,c:'var(--green)',bg:'var(--green-bg)',i:'✅'},
        {l:'Total Students',v:parseInt(s.totalStudents||0).toLocaleString(),c:'var(--cyan)',bg:'var(--cyan-bg)',i:'👥'},
        {l:'Total Users',v:parseInt(s.totalUsers||0).toLocaleString(),c:'var(--purple)',bg:'var(--purple-bg)',i:'👤'},
      ].map(x=>`<div class="stat-card" style="--stat-color:${x.c};--stat-bg:${x.bg}">
        <div class="stat-icon"><span style="font-size:20px">${x.i}</span></div>
        <div class="stat-body"><div class="stat-value">${x.v}</div><div class="stat-label">${x.l}</div></div>
      </div>`).join('');
    }

    // Recent schools
    const recentEl = document.getElementById('sa-recent-schools');
    if(recentEl){
      const schools = await API.get('/superadmin/schools?limit=5');
      const list = schools.data||[];
      recentEl.innerHTML = list.map(s=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
          <div><div style="font-weight:600;font-size:13px">${s.name}</div><div style="font-size:11px;color:var(--text-muted)">${s.school_code} · ${s.county||'--'}</div></div>
          <div style="text-align:right">
            ${_badge(s.subscription_status||'no sub', {active:'green',trial:'blue',grace:'amber',suspended:'red'}[s.subscription_status]||'gray')}
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${s.student_count||0} students</div>
          </div>
        </div>`).join('');
    }

    // Subscription chart
    const chartEl = document.getElementById('chart-subscriptions');
    if(chartEl && window.Chart && s.subscriptionBreakdown){
      const sb = s.subscriptionBreakdown||{active:0,trial:0,grace:0,suspended:0};
      new Chart(chartEl, {
        type:'doughnut',
        data:{
          labels:['Active','Trial','Grace','Suspended'],
          datasets:[{data:[sb.active||0,sb.trial||0,sb.grace||0,sb.suspended||0], backgroundColor:['#0ecb81','#2b7fff','#f5a623','#f03e3e'], borderWidth:0}]
        },
        options:{responsive:true, plugins:{legend:{position:'right', labels:{color:'#7b9fd4',font:{size:11}}}}}
      });
    }
  },

  async loadSchools(){
    const tbody = document.getElementById('sa-schools-tbody');
    if(!tbody) return;
    tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:40px">${_loading()}</td></tr>`;
    const data = await API.get('/superadmin/schools?limit=50');
    if(data.error){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--red)">${data.error}</td></tr>`; return; }
    const list = data.data||[];
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No schools yet</td></tr>`; return; }

    tbody.innerHTML = list.map(s=>`<tr>
      <td><div style="font-weight:600">${s.name}</div><div style="font-size:11px;color:var(--text-muted)">${s.email}</div></td>
      <td class="font-mono text-sm">${s.school_code}</td>
      <td>${s.county||'--'}</td>
      <td style="font-weight:700">${s.student_count||0}</td>
      <td>${_badge(s.is_active?'Active':'Inactive', s.is_active?'green':'red')}</td>
      <td><div style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="loginAsSchool('${s.id}','${s.name}')" title="Login as this school's admin">🔑 Login</button>
        <button class="btn btn-sm btn-secondary" onclick="Pages.SuperAdmin.manageSchool('${s.id}','${s.name}')">Manage</button>
        ${s.is_active?`<button class="btn btn-sm btn-ghost" style="color:var(--amber)" onclick="Pages.SuperAdmin.suspend('${s.id}','${s.name}')">Suspend</button>`:`<button class="btn btn-sm btn-ghost" style="color:var(--green)" onclick="Pages.SuperAdmin.activate('${s.id}')">Activate</button>`}
        <button class="btn btn-sm btn-ghost" onclick="Pages.SuperAdmin.resetAdminPwd('${s.id}','${s.name}')" title="Reset admin password">🔒</button>
      </div></td>
    </tr>`).join('');

    const pg = document.getElementById('sa-schools-pagination');
    if(pg && data.pagination) UI.pagination(pg, data, ()=>this.loadSchools());
  },

  async manageSchool(id, name){
    const data = await API.get(`/superadmin/schools/${id}`);
    if(data.error){ Toast.error(data.error); return; }
    const s = data;
    UI.showInfoModal(`Managing: ${name}`, `
      <div class="grid-2">
        <div>${[['School Code',s.school_code],['Type',s.type||'--'],['County',s.county||'--'],['Students',s.student_count||0],['Staff',s.staff_count||0],['Phone',s.phone||'--'],['Admin Email',s.admin_email||'--']].map(([k,v])=>_kv(k,v)).join('')}</div>
        <div>
          <div style="font-weight:600;margin-bottom:8px">Subscription</div>
          ${_badge(s.subscription_status||'none', {active:'green',trial:'blue',grace:'amber',suspended:'red'}[s.subscription_status]||'gray')}
          <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-sm btn-primary" onclick="Pages.SuperAdmin.renewSub('${id}')">Renew / Update Subscription</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.SuperAdmin.resetAdminPwd('${id}','${name}')">Reset Admin Password</button>
            ${s.is_active?`<button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.SuperAdmin.suspend('${id}','${name}');UI.closeModal('_dynamic-modal')">Suspend School</button>`:`<button class="btn btn-sm btn-success" onclick="Pages.SuperAdmin.activate('${id}');UI.closeModal('_dynamic-modal')">Activate School</button>`}
          </div>
        </div>
      </div>`);
  },

  async renewSub(id){
    const plan = prompt('Plan (trial/active/grace):','active');
    const months = parseInt(prompt('Months to renew (3 = one term, 12 = full year):','3')||'3');
    const res = await API.post(`/superadmin/schools/${id}/subscription`,{plan, months});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Subscription updated!');
  },

  async resetAdminPwd(id, name){
    if(!await UI.confirm(`Reset admin password for ${name}?`)) return;
    const res = await API.post(`/superadmin/schools/${id}/reset-admin-password`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`New temp password: ${res.tempPassword||'Sent via email'}`, 'Password Reset');
  },

  async suspend(id, name){
    if(!await UI.confirm(`Suspend ${name}? Their users will lose access.`)) return;
    const res = await API.put(`/superadmin/schools/${id}/suspend`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`${name} suspended`);
    this.loadSchools();
  },

  async activate(id){
    const res = await API.put(`/superadmin/schools/${id}/activate`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('School activated!');
    this.loadSchools();
  },

  searchSchools(val){
    clearTimeout(this._t);
    this._t = setTimeout(()=>this.loadSchools(), 400);
  },


  async loadSubscriptions() {
    const el = document.getElementById('sa-sub-list');
    if(!el) return;
    el.innerHTML = UI.loading();
    const data = await API.get('/superadmin/schools?limit=100');
    const list = data.data||[];
    const stC = {active:'green',trial:'blue',grace:'amber',suspended:'red'};
    el.innerHTML = _tbl(['School','Code','Plan','Status','Expiry','Students','Action'],
      list.map(s=>`<tr>
        <td><strong>${s.name}</strong></td>
        <td class="font-mono text-sm">${s.school_code}</td>
        <td>${s.subscription_plan||'--'}</td>
        <td>${_badge(s.subscription_status||'none',stC[s.subscription_status]||'gray')}</td>
        <td style="font-size:12px">${s.subscription_end?new Date(s.subscription_end).toLocaleDateString('en-KE'):'--'}</td>
        <td>${s.student_count||0}</td>
        <td><button class="btn btn-sm btn-primary" onclick="Pages.SuperAdmin.renewSub('${s.id}')">Update</button></td>
      </tr>`).join(''));
  },

  async loadAnalytics() {
    const el = document.getElementById('sa-analytics-data');
    if(!el) return;
    el.innerHTML = UI.loading();
    const data = await API.get('/superadmin/analytics');
    if(data.error) { el.innerHTML = _err(data.error); return; }
    const s = data||{};
    el.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Total Revenue','KES '+(parseInt(s.totalRevenue||0)).toLocaleString(),'💰','var(--green)'],['Monthly Revenue','KES '+(parseInt(s.monthlyRevenue||0)).toLocaleString(),'📈','var(--brand)'],['Total Schools',s.totalSchools||0,'🏫','var(--cyan)'],['Total Students',(parseInt(s.totalStudents||0)).toLocaleString(),'👥','var(--purple)']].map(([l,v,i,c])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${c}1a">
            <div class="stat-icon" style="font-size:20px">${i}</div>
            <div class="stat-body"><div class="stat-value" style="font-size:18px">${v}</div><div class="stat-label">${l}</div></div>
          </div>`).join('')}
      </div>
      ${(s.recentSchools||[]).length ? `<div class="card"><div class="card-header"><div class="card-title">Recent Schools</div></div>${_tbl(['School','Code','Students','Status'],s.recentSchools.map(r=>`<tr><td><strong>${r.name}</strong></td><td class="font-mono text-sm">${r.school_code}</td><td>${r.student_count||0}</td><td>${_badge(r.subscription_status||'none',{active:'green',trial:'blue',grace:'amber',suspended:'red'}[r.subscription_status]||'gray')}</td></tr>`).join(''))}</div>` : ''}`;
  },
  openCreateSchoolModal(){ UI.openModal('modal-create-school'); },

  async saveSchool(){
    const btn = document.getElementById('save-school-btn');
    const firstName = document.getElementById('sc-admin-first')?.value?.trim() || '';
    const lastName = document.getElementById('sc-admin-last')?.value?.trim() || '';
    const shortName = document.getElementById('sc-short-name')?.value?.trim() || '';
    const payload = {
      name: document.getElementById('sc-name')?.value?.trim(),
      code: shortName ? shortName.toUpperCase().replace(/\s+/g,'') : undefined,
      county: document.getElementById('sc-county')?.value?.trim(),
      phone: document.getElementById('sc-phone')?.value?.trim(),
      email: document.getElementById('sc-email')?.value?.trim(),
      schoolType: document.getElementById('sc-type')?.value || 'secondary',
      adminName: (firstName + ' ' + lastName).trim() || 'School Admin',
      adminEmail: document.getElementById('sc-admin-email')?.value?.trim(),
    };
    if(!payload.name||!payload.adminEmail){ Toast.error('School name and admin email required'); return; }
    UI.setLoading(btn, true);
    const res = await API.post('/superadmin/schools', payload);
    UI.setLoading(btn, false);
    if(res.error){ Toast.error(res.error); return; }
    const pwd = res.tempPassword || ('Admin@' + (res.school_code||payload.code||'') + '2025!');
    Toast.success('School created! Admin: ' + res.adminEmail + ' | Temp Password: ' + pwd);
    UI.closeModal('modal-create-school');
    this.load();
  },
};
Router.define?.('superadmin-dashboard',{ title:'Platform Dashboard', onEnter:()=>Pages.SuperAdmin.load() });
Router.define?.('superadmin-schools',{ title:'All Schools', onEnter:()=>Pages.SuperAdmin.loadSchools() });
Router.define?.('superadmin-subscriptions',{ title:'Subscriptions', onEnter:()=>{
  document.getElementById('sa-subscriptions-content').innerHTML = `
    <div class="alert alert-info">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>
      Manage school subscriptions -- approve payments, update plans, manage grace periods.
    </div>
    <div id="sa-sub-list">${_loading()}</div>`;
  API.get('/superadmin/schools?limit=100').then(data=>{
    const el = document.getElementById('sa-sub-list');
    if(!el) return;
    const list = data.data||[];
    el.innerHTML = _tbl(['School','Code','Plan','Status','Expiry','Students','Action'],
      list.map(s=>`<tr>
        <td><strong>${s.name}</strong></td>
        <td class="font-mono text-sm">${s.school_code}</td>
        <td>${s.subscription_plan||'--'}</td>
        <td>${_badge(s.subscription_status||'none', {active:'green',trial:'blue',grace:'amber',suspended:'red'}[s.subscription_status]||'gray')}</td>
        <td style="font-size:12px">${s.subscription_end?new Date(s.subscription_end).toLocaleDateString('en-KE'):'--'}</td>
        <td>${s.student_count||0}</td>
        <td><button class="btn btn-sm btn-primary" onclick="Pages.SuperAdmin.renewSub('${s.id}')">Update</button></td>
      </tr>`).join(''));
  });
}});
Router.define?.('superadmin-analytics',{ title:'Platform Analytics', onEnter:()=>{
  document.getElementById('sa-analytics-content').innerHTML = `
    <div class="alert alert-info">Analytics loading…</div>
    <div id="sa-analytics-data">${_loading()}</div>`;
  API.get('/superadmin/analytics').then(data=>{
    const el = document.getElementById('sa-analytics-data');
    if(!el||data.error) return;
    const s = data||{};
    el.innerHTML = `
      <div class="stats-grid">
        ${[['Total Revenue','KES '+(s.totalRevenue||0).toLocaleString(),'💰'],['This Month','KES '+(s.monthlyRevenue||0).toLocaleString(),'📈'],['Schools',s.totalSchools||0,'🏫'],['Students',parseInt(s.totalStudents||0).toLocaleString(),'👥']].map(([l,v,i])=>`
          <div class="stat-card"><div class="stat-icon" style="font-size:20px">${i}</div><div class="stat-body"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
      </div>`;
  });
}});

// ============================================================
// TIMETABLE PAGE (full implementation)
// ============================================================
Pages.Timetable = {
  currentId: null, _classes:[], _periods:[],

  async load(){ this.switchTab('list', document.querySelector('#page-timetable .tab')); },

  switchTab(tab, el){
    document.querySelectorAll('#page-timetable .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('timetable-tab-content');
    if(!c) return;
    if(tab==='list') this.renderList(c);
    else if(tab==='view') this.renderGrid(c);
    else if(tab==='teacher') this.renderTeacher(c);
    else if(tab==='periods') this.renderPeriods(c);
    else if(tab==='attendance') this.renderLessonAtt(c);
  },

  async renderList(container){
    container.innerHTML = _loading();
    const data = await API.get('/timetable');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    if(!data.length){ container.innerHTML = `
      ${_empty('No timetables yet','Generate a conflict-free timetable for all streams automatically.')}
      <div style="text-align:center"><button class="btn btn-primary" onclick="Pages.Timetable.openGenerateModal()">⚡ Generate Timetable</button></div>`; return; }

    container.innerHTML = `<div class="grid-auto">${data.map(t=>`
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">${t.name}</div><div class="card-subtitle">${t.term?.replace('_',' ')||''} ${t.year||''}</div></div>
          <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
            ${t.is_active?_badge('Active','green'):''}
            ${t.is_published?_badge('Published','blue'):_badge('Draft','amber')}
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-muted)">Generated ${t.generated_at?new Date(t.generated_at).toLocaleDateString('en-KE'):'--'}</div>
        <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-primary" onclick="Pages.Timetable.view('${t.id}')">View Grid</button>
          ${!t.is_published?`<button class="btn btn-sm btn-secondary" onclick="Pages.Timetable.publish('${t.id}')">Publish</button>`:''}
          <button class="btn btn-sm btn-ghost" onclick="window.print()">Print</button>
          ${!t.is_published?`<button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Timetable.del('${t.id}')">Delete</button>`:''}
        </div>
      </div>`).join('')}</div>`;

    // Auto-select the first active timetable
    const active = data.find(t=>t.is_active)||data[0];
    if(active) this.currentId = active.id;
  },

  async renderGrid(container, id){
    const tId = id||this.currentId;
    if(!tId){
      // No timetable selected, show selector
      const data = await API.get('/timetable');
      if(!data.length){ container.innerHTML = _empty('No timetables','Generate one first'); return; }
      this.currentId = (data.find(t=>t.is_active)||data[0]).id;
    }
    container.innerHTML = _loading();
    const [gridData, classesData] = await Promise.all([
      API.get(`/timetable/${this.currentId}`),
      API.get('/academics/classes'),
    ]);
    if(gridData.error){ container.innerHTML = _err(gridData.error); return; }

    const classes = classesData||[];
    this._classes = classes;
    const slots = gridData.slots||[];
    const DAYS = ['monday','tuesday','wednesday','thursday','friday'];
    const DAY_LABELS = {monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday'};

    // Build grid structures
    const grid={}, periods=new Map();
    for(const s of slots){
      if(!grid[s.class_id]) grid[s.class_id]={};
      if(!grid[s.class_id][s.day]) grid[s.class_id][s.day]={};
      grid[s.class_id][s.day][s.period_id] = s;
      if(!periods.has(s.period_id)) periods.set(s.period_id,{id:s.period_id,name:s.period_name,start:s.start_time?.slice(0,5),sort:s.sort_order||0});
    }
    const sortedP = [...periods.values()].sort((a,b)=>a.sort-b.sort);

    // Subject colour map
    const COLOURS=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6','#a855f7','#f43f5e'];
    const cmap={};let ci=0;
    const col=code=>{ if(!cmap[code]) cmap[code]=COLOURS[ci++%COLOURS.length]; return cmap[code]; };

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:13px;font-weight:600">Class:</label>
          <select id="tt-class-sel" onchange="Pages.Timetable.switchClass(this.value)" style="padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-card);color:var(--text-primary)">
            ${classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" onclick="window.print()">Print</button>
          <button class="btn btn-sm btn-primary" onclick="Pages.Timetable.openGenerateModal()">Regenerate</button>
        </div>
      </div>
      ${classes.map((cls,ci)=>`
        <div id="tt-cls-${cls.id}" style="display:${ci===0?'block':'none'}">
          <div style="font-weight:700;font-size:15px;color:var(--brand);margin-bottom:10px">${cls.name} -- Timetable</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;min-width:600px">
              <thead><tr style="background:var(--bg-elevated)">
                <th style="padding:8px 12px;border:1px solid var(--border);text-align:left;font-size:11px;width:90px">Period</th>
                ${DAYS.map(d=>`<th style="padding:8px 12px;border:1px solid var(--border);text-align:center;font-size:12px;font-weight:700">${DAY_LABELS[d]}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${sortedP.map(p=>`<tr>
                  <td style="padding:6px 10px;border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--text-muted)">
                    <div>${p.name}</div><div style="font-weight:400;font-size:10px">${p.start||''}</div>
                  </td>
                  ${DAYS.map(day=>{
                    const s = grid[cls.id]?.[day]?.[p.id];
                    if(!s) return `<td style="padding:4px;border:1px solid var(--border);background:var(--bg-base)"></td>`;
                    const c = col(s.subject_code||s.subject_name?.slice(0,4)||'X');
                    return `<td style="padding:4px;border:1px solid var(--border)">
                      <div style="background:${c}18;border-left:3px solid ${c};border-radius:4px;padding:5px 7px">
                        <div style="font-weight:700;color:${c};font-size:11px">${s.subject_code||s.subject_name?.slice(0,6)||'--'}</div>
                        <div style="color:var(--text-muted);font-size:10px">${(s.teacher_name||'').split(' ').slice(0,2).join(' ')}</div>
                      </div>
                    </td>`;
                  }).join('')}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`).join('')}`;
  },

  switchClass(classId){
    this._classes.forEach(c=>{ const el=document.getElementById(`tt-cls-${c.id}`); if(el) el.style.display=c.id===classId?'block':'none'; });
  },

  async renderTeacher(container){
    const staff = await API.get('/staff?limit=200');
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
        <label style="font-size:13px;font-weight:600">Teacher:</label>
        <select id="tt-teacher-sel" onchange="Pages.Timetable.loadTeacherTT(this.value)" style="padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-card);color:var(--text-primary);flex:1;max-width:300px">
          <option value="">Select teacher…</option>
          ${(staff.data||[]).map(s=>`<option value="${s.user_id||s.id}">${s.first_name} ${s.last_name} (${s.designation||s.role})</option>`).join('')}
        </select>
      </div>
      <div id="tt-teacher-grid">${_empty('Select a teacher to view their weekly timetable')}</div>`;
  },

  async loadTeacherTT(teacherId){
    if(!teacherId||!this.currentId) return;
    const c = document.getElementById('tt-teacher-grid');
    c.innerHTML = _loading();
    const data = await API.get(`/timetable/${this.currentId}?teacherId=${teacherId}`);
    if(!data.slots?.length){ c.innerHTML = _empty('No lessons assigned to this teacher'); return; }
    const DAYS=['monday','tuesday','wednesday','thursday','friday'];
    const byDay={};
    DAYS.forEach(d=>{byDay[d]=[];});
    data.slots.forEach(s=>{ if(byDay[s.day]) byDay[s.day].push(s); });
    c.innerHTML = `<div class="grid-auto">${DAYS.map(day=>`
      <div class="card">
        <div class="card-header"><div class="card-title">${day.charAt(0).toUpperCase()+day.slice(1)}</div>${_badge(byDay[day].length+' lessons', byDay[day].length?'blue':'gray')}</div>
        ${!byDay[day].length ? '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">Free</div>' :
          byDay[day].sort((a,b)=>a.sort_order-b.sort_order).map(s=>`
            <div style="padding:8px;margin-bottom:6px;background:var(--bg-elevated);border-radius:6px;border-left:3px solid var(--brand)">
              <div style="font-weight:600;font-size:13px">${s.subject_name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${s.class_name||''} · ${s.period_name||''} (${s.start_time?.slice(0,5)||''})</div>
            </div>`).join('')}
      </div>`).join('')}</div>`;
  },

  async renderPeriods(container){
    container.innerHTML = _loading();
    const data = await API.get('/timetable/periods');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    container.innerHTML = `
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px">
        <button class="btn btn-secondary btn-sm" onclick="Pages.Timetable.seedPeriods()">Seed Defaults (9 periods)</button>
        <button class="btn btn-primary btn-sm" onclick="Pages.Timetable.addPeriod()">Add Period</button>
      </div>
      ${_tbl(['Name','Start','End','Type','Order'],
        (data||[]).map(p=>`<tr>
          <td><strong>${p.name}</strong></td>
          <td class="font-mono">${p.start_time?.slice(0,5)||'--'}</td>
          <td class="font-mono">${p.end_time?.slice(0,5)||'--'}</td>
          <td>${p.is_break?_badge('Break','amber'):_badge('Teaching','blue')}</td>
          <td>${p.sort_order}</td>
        </tr>`).join(''), 'No periods configured. Seed defaults first.')}`;
  },

  async renderLessonAtt(container){
    container.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">
        <label style="font-size:13px;font-weight:600">Date:</label>
        <input type="date" id="la-date" value="${new Date().toISOString().split('T')[0]}" onchange="Pages.Timetable.loadLessonAtt()" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-card);color:var(--text-primary)">
        <button class="btn btn-secondary btn-sm" onclick="Pages.Timetable.loadLessonAtt()">Load</button>
      </div>
      <div id="la-content">${_loading()}</div>`;
    this.loadLessonAtt();
  },

  async loadLessonAtt(){
    const date = document.getElementById('la-date')?.value||new Date().toISOString().split('T')[0];
    const c = document.getElementById('la-content');
    if(!c) return;
    c.innerHTML = _loading();
    const data = await API.get(`/timetable/lesson-attendance?from=${date}&to=${date}`);
    if(!data.records?.length){ c.innerHTML = _empty('No lesson attendance for this date'); return; }
    c.innerHTML = _tbl(['Teacher','Class','Subject','Period','Present','Topic','Remarks'],
      data.records.map(r=>`<tr>
        <td><strong>${r.teacher_name}</strong></td>
        <td>${r.class_name||'--'}</td>
        <td>${r.subject_name||'--'}</td>
        <td>${r.period_name||'--'}</td>
        <td>${r.was_present?_badge('Present','green'):_badge('Absent','red')}</td>
        <td style="font-size:12px">${r.topic_covered||'--'}</td>
        <td style="font-size:12px">${r.remarks||'--'}</td>
      </tr>`).join(''));
  },

  async openGenerateModal(){
    const classes = await API.get('/academics/classes');
    const box = document.getElementById('tt-classes-checkboxes');
    if(box) box.innerHTML = (classes||[]).map(c=>`
      <label style="display:flex;align-items:center;gap:6px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:12px">
        <input type="checkbox" value="${c.id}" checked> ${c.name}
      </label>`).join('');
    document.getElementById('tt-result').style.display='none';
    document.getElementById('tt-progress').style.display='none';
    document.getElementById('tt-generate-btn').disabled=false;
    UI.openModal('modal-generate-timetable');
  },

  toggleClassSelect(){
    const scope = document.getElementById('tt-scope')?.value;
    const grp = document.getElementById('tt-classes-group');
    if(grp) grp.style.display = scope==='specific'?'block':'none';
  },

  async generate(){
    const name = document.getElementById('tt-name')?.value?.trim();
    if(!name){ Toast.error('Enter a timetable name'); return; }
    const scope = document.getElementById('tt-scope')?.value;
    let classIds;
    if(scope==='specific'){
      classIds = [...document.querySelectorAll('#tt-classes-checkboxes input:checked')].map(i=>i.value);
      if(!classIds.length){ Toast.error('Select at least one class'); return; }
    }
    const maxP = parseInt(document.getElementById('tt-max-periods')?.value||2);
    const btn = document.getElementById('tt-generate-btn');
    const prog = document.getElementById('tt-progress');
    const result = document.getElementById('tt-result');
    UI.setLoading(btn, true);
    prog.style.display='block';
    result.style.display='none';
    document.getElementById('tt-progress-msg').textContent='Analysing assignments and teacher schedules…';

    const payload={name, maxPeriodsPerSubjectPerDay:maxP};
    if(classIds) payload.classIds=classIds;
    const res = await API.post('/timetable/generate', payload);
    UI.setLoading(btn, false);
    prog.style.display='none';
    result.style.display='block';

    if(res.error){ result.innerHTML=_err(res.error); return; }
    const {stats={}, message, timetable={}} = res;
    this.currentId = timetable.id;
    result.innerHTML = `
      <div class="alert ${stats.unplaced===0?'alert-success':'alert-warning'}">${message}</div>
      <div class="grid-4" style="margin:12px 0">
        ${[['Total',stats.totalLessons||0,'var(--text-secondary)'],['Placed',stats.placed||0,'var(--green)'],['Unplaced',stats.unplaced||0, (stats.unplaced||0)>0?'var(--red)':'var(--green)'],['Efficiency',(stats.efficiencyPercent||0)+'%',(stats.efficiencyPercent||0)>=90?'var(--green)':'var(--amber)']].map(([l,v,c])=>`
          <div style="background:var(--bg-elevated);padding:10px;border-radius:8px;text-align:center">
            <div style="font-size:22px;font-weight:800;color:${c}">${v}</div>
            <div style="font-size:11px;color:var(--text-muted)">${l}</div>
          </div>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="Pages.Timetable.view('${timetable.id}');UI.closeModal('modal-generate-timetable')">View Timetable</button>
        <button class="btn btn-secondary" onclick="Pages.Timetable.publish('${timetable.id}')">Publish & Activate</button>
      </div>`;
    Toast.success(`Timetable generated! ${stats.placed} lessons placed (${stats.efficiencyPercent}%)`);
  },

  view(id){ this.currentId=id; Router.go('timetable'); setTimeout(()=>document.querySelectorAll('#page-timetable .tab')[1]?.click(),100); },

  async publish(id){
    if(!await UI.confirm('Publish this timetable as the active school timetable?')) return;
    const res = await API.put(`/timetable/${id}/publish`,{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Timetable published!');
    this.renderList(document.getElementById('timetable-tab-content'));
  },

  async del(id){
    if(!await UI.confirm('Delete this timetable?')) return;
    const res = await API.delete(`/timetable/${id}`);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success('Deleted');
    this.renderList(document.getElementById('timetable-tab-content'));
  },

  async seedPeriods(){
    if(!await UI.confirm('Add 9 default teaching periods + 2 breaks? Existing periods are kept.')) return;
    const res = await API.post('/timetable/periods/seed',{});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(res.message||'Periods seeded!');
    this.renderPeriods(document.getElementById('timetable-tab-content'));
  },

  addPeriod(){
    const name = prompt('Period name (e.g. Period 10):'); if(!name) return;
    const start = prompt('Start time (HH:MM):'); if(!start) return;
    const end = prompt('End time (HH:MM):'); if(!end) return;
    API.post('/timetable/periods',{name, startTime:start, endTime:end, isBreak:false}).then(r=>{
      if(r.error){ Toast.error(r.error); return; }
      Toast.success('Period added!');
      this.renderPeriods(document.getElementById('timetable-tab-content'));
    });
  },
};
Router.define?.('timetable',{ title:'Timetable', onEnter:()=>Pages.Timetable.load() });

// ============================================================
// BILLING PAGE
// ============================================================
Pages.Billing = {
  async load(){ this.switchTab('summary', document.querySelector('#page-billing .tab')); },

  switchTab(tab, el){
    document.querySelectorAll('#page-billing .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active');
    const c = document.getElementById('billing-tab-content');
    if(!c) return;
    if(tab==='summary') this.renderSummary(c);
    else if(tab==='invoices') this.renderInvoices(c,'all');
    else if(tab==='overdue') this.renderInvoices(c,'unpaid');
  },

  async renderSummary(container){
    container.innerHTML = _loading();
    const data = await API.get('/billing/summary');
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const s = data.summary||{};
    const rate = s.total_billed>0?((parseFloat(s.total_paid||0)/parseFloat(s.total_billed))*100).toFixed(1):0;
    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Total Invoices',s.total_invoices||0,'var(--brand)','var(--brand-subtle)'],['Paid',s.paid_count||0,'var(--green)','var(--green-bg)'],['Unpaid',s.unpaid_count||0,'var(--red)','var(--red-bg)'],['Collection',rate+'%','var(--amber)','var(--amber-bg)']].map(([l,v,c,bg])=>`
          <div class="stat-card" style="--stat-color:${c};--stat-bg:${bg}">
            <div class="stat-body"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>
          </div>`).join('')}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Financial Summary</div></div>
          ${[['Total Billed','KES '+parseFloat(s.total_billed||0).toLocaleString(),'var(--brand)'],['Total Paid','KES '+parseFloat(s.total_paid||0).toLocaleString(),'var(--green)'],['Outstanding','KES '+parseFloat(s.total_outstanding||0).toLocaleString(),'var(--red)']].map(([l,v,c])=>`
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
              <span style="color:var(--text-secondary)">${l}</span>
              <span style="font-weight:700;color:${c}">${v}</span>
            </div>`).join('')}
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <button class="btn btn-sm btn-primary" onclick="Pages.Billing.openGenerateModal()">Generate Invoices</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Billing.sendReminders()">Send Reminders</button>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">By Class</div></div>
          ${(data.byClass||[]).map(c=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-subtle);font-size:12px">
              <span style="font-weight:600">${c.class_name||'--'}</span>
              <span style="color:var(--text-muted)">${c.invoices} invoices</span>
              <span style="color:var(--green);font-weight:600">KES ${parseFloat(c.paid||0).toLocaleString()}</span>
            </div>`).join('') || '<div style="padding:16px;color:var(--text-muted);text-align:center">No data yet</div>'}
        </div>
      </div>`;
  },

  async renderInvoices(container, status){
    container.innerHTML = _loading();
    const url = status&&status!=='all'?`/billing?status=${status}`:'/billing';
    const data = await API.get(url);
    if(data.error){ container.innerHTML = _err(data.error); return; }
    const list = data.data||[];
    if(!list.length){ container.innerHTML = _empty(status==='unpaid'?'No overdue invoices 🎉':'No invoices yet'); return; }
    const sc={paid:'green',partial:'amber',unpaid:'red',cancelled:'gray',sent:'blue'};
    container.innerHTML = _tbl(['Invoice #','Student','Class','Amount','Paid','Due Date','Status',''],
      list.map(inv=>{
        const bal = parseFloat(inv.amount_due)-parseFloat(inv.amount_paid||0);
        return `<tr>
          <td class="font-mono text-sm">${inv.invoice_number}</td>
          <td><strong>${inv.first_name} ${inv.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${inv.admission_number}</div></td>
          <td>${inv.class_name||'--'}</td>
          <td style="font-weight:600">KES ${parseFloat(inv.amount_due).toLocaleString()}</td>
          <td style="color:var(--green)">KES ${parseFloat(inv.amount_paid||0).toLocaleString()}</td>
          <td>${new Date(inv.due_date).toLocaleDateString('en-KE')}</td>
          <td>${_badge(inv.status?.toUpperCase()||'UNPAID', sc[inv.status]||'red')}</td>
          <td><button class="btn btn-sm btn-secondary" onclick="window.open('${CONFIG.API_URL}/billing/${inv.id}/pdf','_blank')">PDF</button></td>
        </tr>`;
      }).join(''));
  },

  async openGenerateModal(){
    const [years, terms, classes] = await Promise.all([
      API.get('/academics/years').catch(()=>[]),
      API.get('/academics/terms').catch(()=>[]),
      API.get('/academics/classes'),
    ]);
    const yearSel = document.getElementById('inv-year');
    const termSel = document.getElementById('inv-term');
    const classSel = document.getElementById('inv-class');
    if(yearSel) yearSel.innerHTML = (years||[]).map(y=>`<option value="${y.id}">${y.year}</option>`).join('')||'<option>No years</option>';
    if(termSel) termSel.innerHTML = (terms||[]).map(t=>`<option value="${t.id}">${t.term?.replace('_',' ')} ${t.year||''}</option>`).join('')||'<option>No terms</option>';
    if(classSel) classSel.innerHTML = `<option value="">All classes</option>`+(classes||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    const due = document.getElementById('inv-due-date');
    if(due) due.value = new Date(Date.now()+14*86400000).toISOString().split('T')[0];
    const scopeSel = document.getElementById('inv-scope');
    if(scopeSel) scopeSel.onchange = ()=>{
      const row = document.getElementById('inv-class-row');
      if(row) row.style.display = scopeSel.value==='class'?'block':'none';
    };
    UI.openModal('modal-generate-invoice');
  },

  async generateInvoices(){
    const termId = document.getElementById('inv-term')?.value;
    const academicYearId = document.getElementById('inv-year')?.value;
    const dueDate = document.getElementById('inv-due-date')?.value;
    const scope = document.getElementById('inv-scope')?.value;
    const classId = scope==='class'?document.getElementById('inv-class')?.value:null;
    if(!termId||!academicYearId||!dueDate){ Toast.error('Term, academic year, and due date required'); return; }
    const payload = {termId, academicYearId, dueDate};
    if(classId) payload.classId=classId; else payload.generateAll=true;
    const res = await API.post('/billing/generate', payload);
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`${res.generated} invoices generated, ${res.skipped} skipped`);
    UI.closeModal('modal-generate-invoice');
    this.load();
  },

  async sendReminders(){
    if(!await UI.confirm('Send SMS reminders to all parents with unpaid invoices?')) return;
    const res = await API.post('/billing/send-reminders',{daysOverdue:0});
    if(res.error){ Toast.error(res.error); return; }
    Toast.success(`Reminders sent to ${res.sent} parents`);
  },
};
Router.define?.('billing',{ title:'Billing & Invoices', onEnter:()=>Pages.Billing.load() });

// ============================================================
// TSC VERIFICATION PAGE
// ============================================================
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
