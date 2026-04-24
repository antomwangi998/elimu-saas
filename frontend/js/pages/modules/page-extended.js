// ============================================================
// ElimuSaaS — Extended Pages Bundle
// Health Clinic · Notice Board · Bursary · Behaviour
// Wellness · Career · Portfolio · Tutoring · Polls · Branding
// ============================================================
'use strict';

/* ── SHARED HELPERS ─────────────────────────────────────────── */
const _tbl = (hs, rows, empty='No data') => {
  if(!rows||!rows.length) return UI.empty(empty);
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>
    ${hs.map(h=>`<th style="padding:7px 10px;border-bottom:2px solid var(--border);text-align:left;font-size:11px;text-transform:uppercase;white-space:nowrap">${h}</th>`).join('')}
  </tr></thead><tbody>${rows}</tbody></table></div>`;
};
const _tr = cells => `<tr style="border-bottom:1px solid var(--border-subtle);transition:background .15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">${cells.map(c=>`<td style="padding:7px 10px;font-size:13px">${c}</td>`).join('')}</tr>`;
const _badge = (t,col) => `<span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${col}22;color:${col}">${t}</span>`;
const _statGrid = items => `<div class="stats-grid" style="margin-bottom:16px">
  ${items.map(([l,v,col,ic=''])=>`<div class="stat-card" style="border-top:3px solid ${col}"><div class="stat-body">
    ${ic?`<div style="font-size:26px;margin-bottom:4px">${ic}</div>`:''}
    <div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div>
  </div></div>`).join('')}
</div>`;

/* ── HEALTH & CLINIC ────────────────────────────────────────── */
Pages.HealthClinic = {
  async load() { this.switchTab('visits'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-health .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-health .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('health-content'); if(!c) return;
    ({visits:()=>this._visits(c), sickbay:()=>this._sickbay(c), records:()=>this._records(c), immunization:()=>this._immun(c)}[tab]||(() =>this._visits(c)))();
  },
  async _visits(c) {
    c.innerHTML=UI.loading();
    const [d,s]=await Promise.all([API.get('/health/visits').catch(()=>[]),API.get('/health/stats').catch(()=>({}))]);
    c.innerHTML=_statGrid([['Today Visits',s.today||0,'#1565C0','🏥'],['Sick Bay',s.sickBay||0,'#B71C1C','🛏️'],['This Month',s.month||0,'#E65100','📅'],['Referrals',s.referrals||0,'#6A1B9A','🚑']])
      +`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.HealthClinic.newVisit()">+ Record Visit</button></div>
      <div class="card">${_tbl(['Student','Class','Complaint','Diagnosis','Treatment','Date','Action'],
        Array.isArray(d)&&d.length?d.map(v=>_tr([`<strong>${v.student_name||'--'}</strong>`,v.class_name||'',v.complaint||'',v.diagnosis||'--',v.treatment||'--',UI.date(v.visit_date||v.created_at),
          `<button class="btn btn-sm btn-ghost" onclick="Pages.HealthClinic.view('${v.id||''}')">View</button>`])):[],
        'No clinic visits recorded')}</div>`;
  },
  async newVisit() {
    UI.showInfoModal('🏥 Record Clinic Visit',`
      <div class="form-group"><label>Student Name / Adm #</label><input type="text" id="cl-s" placeholder="Search student…"></div>
      <div class="grid-2"><div class="form-group"><label>Complaint</label><input type="text" id="cl-c"></div>
        <div class="form-group"><label>Temp (°C)</label><input type="number" id="cl-t" step="0.1"></div></div>
      <div class="form-group"><label>Diagnosis</label><input type="text" id="cl-d"></div>
      <div class="form-group"><label>Treatment Given</label><textarea id="cl-tx" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
      <div class="grid-2">
        <div class="form-group"><label>Admitted to Sick Bay?</label>
          <select id="cl-sb" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px"><option value="no">No</option><option value="yes">Yes</option></select></div>
        <div class="form-group"><label>Referred?</label>
          <select id="cl-ref" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px"><option value="no">No</option><option value="yes">Yes</option></select></div>
      </div>
      <button class="btn btn-primary w-full" onclick="Pages.HealthClinic.saveVisit()">Save Visit</button>`);
  },
  async saveVisit() {
    const r=await API.post('/health/visits',{studentName:document.getElementById('cl-s')?.value,complaint:document.getElementById('cl-c')?.value,temperature:document.getElementById('cl-t')?.value,diagnosis:document.getElementById('cl-d')?.value,treatment:document.getElementById('cl-tx')?.value,admittedToSickBay:document.getElementById('cl-sb')?.value==='yes',referred:document.getElementById('cl-ref')?.value==='yes'});
    if(r.error){Toast.error(r.error);return;} Toast.success('Visit recorded!'); UI.closeModal&&UI.closeModal('modal-info'); this.switchTab('visits');
  },
  async _sickbay(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/health/sickbay').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.HealthClinic.switchTab('visits')">+ New Admission</button></div>
    <div class="card">${_tbl(['Student','Class','Reason','Admitted','Days','Action'],
      Array.isArray(d)&&d.length?d.map(s=>_tr([`<strong>${s.student_name||'--'}</strong>`,s.class_name||'',s.reason||s.complaint||'--',UI.date(s.admitted_at),
        _badge(Math.ceil((Date.now()-new Date(s.admitted_at||Date.now()))/(86400000))||1+'d','#E65100'),
        `<button class="btn btn-sm btn-success" onclick="Pages.HealthClinic.discharge('${s.id||''}')">Discharge</button>`])):[],
      'No students in sick bay')}</div>`;
  },
  async discharge(id){if(!confirm('Discharge?'))return;await API.put(`/health/sickbay/${id}/discharge`,{});Toast.success('Discharged!');this.switchTab('sickbay');},
  async _records(c){c.innerHTML=UI.loading();const d=await API.get('/health/records').catch(()=>[]);
    c.innerHTML=`<div class="card">${_tbl(['Student','Blood Group','Allergies','Conditions','Emergency Contact','Visits'],
      Array.isArray(d)&&d.length?d.map(r=>_tr([`<strong>${r.student_name||'--'}</strong><div style="font-size:10px;color:var(--text-muted)">${r.class_name||''}</div>`,_badge(r.blood_group||'--','#B71C1C'),r.allergies||'None',r.chronic_conditions||'None',r.emergency_contact||'--',r.visit_count||0])):[],
      'No health records')}</div>`;},
  async _immun(c){c.innerHTML=UI.loading();const d=await API.get('/health/immunization').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:12px"><div class="alert alert-info" style="flex:1;margin:0">📋 Track government immunization programmes</div><button class="btn btn-primary btn-sm" style="margin-left:8px" onclick="Toast.info('Immunization form coming soon')">+ Record</button></div>
    <div class="card">${_tbl(['Vaccine','Date','Provider','Students','Next Due'],
      Array.isArray(d)&&d.length?d.map(i=>_tr([i.vaccine_name||'--',UI.date(i.date),i.provider||'Ministry of Health',parseInt(i.students_count||0).toLocaleString(),UI.date(i.next_due)||'--'])):[],
      'No immunization records')}</div>`;},
  view(id){Toast.info('Viewing visit record…');},
};

/* ── NOTICE BOARD ───────────────────────────────────────────── */
Pages.NoticeBoard = {
  async load(){this.switchTab('notices');},
  switchTab(tab,el){
    document.querySelectorAll('#page-notice-board .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-notice-board .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('notice-board-content');if(!c)return;
    if(tab==='notices')this._list(c);else if(tab==='post')this._post(c);else this._archive(c);
  },
  async _list(c){c.innerHTML=UI.loading();const d=await API.get('/notices').catch(()=>[]);const rows=Array.isArray(d)?d:(d.data||[]);
    const colMap={general:'#1565C0',urgent:'#B71C1C',academic:'#1B5E20',event:'#6A1B9A',finance:'#E65100'};
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:16px"><input type="text" placeholder="Search…" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
      <button class="btn btn-primary btn-sm" onclick="Pages.NoticeBoard.switchTab('post')">+ Post Notice</button></div>
    <div style="display:flex;flex-direction:column;gap:14px">
    ${rows.length?rows.map(n=>{const col=colMap[n.category||'general']||'#1565C0';return`<div class="card" style="border-left:4px solid ${col}">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div><div style="font-size:16px;font-weight:800">${n.title||n.notice_title||'Notice'}</div>
          <div style="font-size:11px;color:var(--text-muted)">By ${n.author_name||n.posted_by||'Admin'} · ${UI.date(n.created_at||n.posted_date)}</div></div>
        <div style="display:flex;gap:6px">${_badge(n.category||'General',col)}${n.is_urgent?_badge('🔴 URGENT','#B71C1C'):''}</div>
      </div>
      <p style="font-size:13px;line-height:1.65;margin:10px 0;color:var(--text-secondary)">${n.content||n.body||''}</p>
      <div style="font-size:11px;color:var(--text-muted)">${n.target_audience?`👥 ${n.target_audience}`:'👥 All'}</div>
    </div>`}).join(''):`<div class="card">${UI.empty('No notices posted')}</div>`}</div>`;},
  _post(c){c.innerHTML=`<div class="card" style="max-width:640px"><div class="card-header"><div class="card-title">📌 Post New Notice</div></div>
    <div class="form-group"><label>Title *</label><input type="text" id="nc-title" placeholder="Notice title…"></div>
    <div class="grid-2">
      <div class="form-group"><label>Category</label><select id="nc-cat" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
        <option value="general">General</option><option value="academic">Academic</option><option value="event">Event</option><option value="finance">Finance</option><option value="urgent">URGENT</option></select></div>
      <div class="form-group"><label>Audience</label><select id="nc-aud" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
        <option value="all">All</option><option value="students">Students</option><option value="staff">Staff</option><option value="parents">Parents</option></select></div>
    </div>
    <div class="form-group"><label>Content *</label><textarea id="nc-content" rows="5" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary);font-size:14px;line-height:1.6"></textarea></div>
    <div class="form-group"><label>Expiry Date (optional)</label><input type="date" id="nc-exp"></div>
    <div style="display:flex;gap:8px"><button class="btn btn-primary" onclick="Pages.NoticeBoard.save()">📌 Post Notice</button>
      <button class="btn btn-secondary" onclick="Pages.NoticeBoard.switchTab('notices')">Cancel</button></div></div>`;},
  async save(){const r=await API.post('/notices',{title:document.getElementById('nc-title')?.value?.trim(),category:document.getElementById('nc-cat')?.value||'general',targetAudience:document.getElementById('nc-aud')?.value||'all',content:document.getElementById('nc-content')?.value?.trim(),expiresAt:document.getElementById('nc-exp')?.value||null});
    if(r.error){Toast.error(r.error);return;}Toast.success('Notice posted!');this.switchTab('notices');},
  async _archive(c){const d=await API.get('/notices/archive').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px">${Array.isArray(d)&&d.length?d.map(n=>`<div style="padding:10px 14px;background:var(--bg-elevated);border-radius:8px;opacity:.7"><strong>${n.title||''}</strong><span style="font-size:11px;color:var(--text-muted);margin-left:8px">${UI.date(n.created_at)}</span></div>`).join(''):`<div class="card">${UI.empty('No archived notices')}</div>`}</div>`;},
};

/* ── BURSARY & SCHOLARSHIPS ─────────────────────────────────── */
Pages.Bursary = {
  async load(){this.switchTab('applications');},
  switchTab(tab,el){
    document.querySelectorAll('#page-bursary .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-bursary .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('bursary-content');if(!c)return;
    if(tab==='applications')this._apps(c);else if(tab==='approved')this._approved(c);else if(tab==='disbursements')this._disb(c);else this._report(c);
  },
  async _apps(c){c.innerHTML=UI.loading();const d=await API.get('/bursary/applications').catch(()=>[]);const rows=Array.isArray(d)?d:(d.data||[]);
    c.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:12px"><div style="font-weight:700">${rows.length} Applications</div>
      <button class="btn btn-primary btn-sm" onclick="Toast.info('Applications submitted via parent/student portal')">+ New Application</button></div>
    <div class="card">${_tbl(['Student','Adm #','Class','Type','Amount Req.','Status','Action'],
      rows.length?rows.map(a=>_tr([`<strong>${a.student_name||'--'}</strong>`,a.admission_number||'--',a.class_name||'--',a.type||'Government',
        `KES ${parseFloat(a.amount_requested||0).toLocaleString()}`,_badge(a.status||'Pending',a.status==='approved'?'#1B5E20':a.status==='rejected'?'#B71C1C':'#F57F17'),
        (a.status==='pending'||!a.status)?`<button class="btn btn-sm btn-success" onclick="Pages.Bursary.approve('${a.id||''}')">Approve</button>`:'—'])):[],
      'No bursary applications')}</div>`;},
  async approve(id){if(!confirm('Approve this application?'))return;const r=await API.put(`/bursary/applications/${id}/approve`,{});if(r.error){Toast.error(r.error);return;}Toast.success('Approved!');this.switchTab('applications');},
  async _approved(c){c.innerHTML=UI.loading();const d=await API.get('/bursary/approved').catch(()=>[]);const total=Array.isArray(d)?d.reduce((s,a)=>s+parseFloat(a.amount_approved||0),0):0;
    c.innerHTML=_statGrid([['Approved Students',Array.isArray(d)?d.length:0,'#1565C0'],['Total Allocated','KES '+total.toLocaleString(),'#1B5E20']])
      +`<div class="card">${_tbl(['Student','Class','Type','Approved','Disbursed','Balance'],
        Array.isArray(d)&&d.length?d.map(a=>_tr([`<strong>${a.student_name||'--'}</strong>`,a.class_name||'--',a.type||'Government',
          `<strong style="color:#1B5E20">KES ${parseFloat(a.amount_approved||0).toLocaleString()}</strong>`,
          `KES ${parseFloat(a.amount_disbursed||0).toLocaleString()}`,
          `<strong style="color:#E65100">KES ${(parseFloat(a.amount_approved||0)-parseFloat(a.amount_disbursed||0)).toLocaleString()}</strong>`])):[],
        'No approved applications')}</div>`;},
  async _disb(c){c.innerHTML=UI.loading();const d=await API.get('/bursary/disbursements').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Toast.info('Record disbursements via the Fees module')">+ Record</button></div>
    <div class="card">${_tbl(['Student','Amount','Date','Reference','Staff'],
      Array.isArray(d)&&d.length?d.map(x=>_tr([`<strong>${x.student_name||'--'}</strong>`,`<strong style="color:#1B5E20">KES ${parseFloat(x.amount||0).toLocaleString()}</strong>`,UI.date(x.disbursed_at||x.created_at),x.reference||'--',x.staff_name||'--'])):[],
      'No disbursements recorded')}</div>`;},
  async _report(c){const d=await API.get('/bursary/report').catch(()=>({}));
    c.innerHTML=_statGrid([['Total Applications',d.total||0,'#1565C0'],['Approved',d.approved||0,'#1B5E20'],['Pending',d.pending||0,'#E65100'],['Total Amount','KES '+(parseFloat(d.totalAmount||0).toLocaleString()),'#6A1B9A']]);},
};

/* ── BEHAVIOUR & REWARDS ────────────────────────────────────── */
Pages.Behaviour = {
  async load(){this.switchTab('log');},
  switchTab(tab,el){
    document.querySelectorAll('#page-behaviour .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-behaviour .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('behaviour-content');if(!c)return;
    if(tab==='log')this._log(c);else if(tab==='rewards')this._rewards(c);else if(tab==='leaderboard')this._leaderboard(c);else this._report(c);
  },
  async _log(c){c.innerHTML=UI.loading();const d=await API.get('/behaviour').catch(()=>[]);const rows=Array.isArray(d)?d:(d.data||[]);
    const cc={positive:'#1B5E20',negative:'#B71C1C',neutral:'#1565C0'};
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:12px"><input type="text" placeholder="Search student…" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
      <button class="btn btn-primary btn-sm" onclick="Pages.Behaviour.record()">+ Record</button></div>
    <div class="card">${_tbl(['Student','Class','Type','Behaviour','Points','Staff','Date'],
      rows.length?rows.map(b=>_tr([`<strong>${b.student_name||'--'}</strong>`,b.class_name||'',_badge(b.type||'Neutral',cc[b.type||'neutral']||'#1565C0'),b.description||b.behaviour||'--',
        `<strong style="color:${parseFloat(b.points||0)>0?'#1B5E20':'#B71C1C'}">${parseFloat(b.points||0)>0?'+':''}${b.points||0}</strong>`,b.staff_name||'--',UI.date(b.incident_date||b.created_at)])):[],
      'No behaviour records')}</div>`;},
  async record(){
    UI.showInfoModal('⭐ Record Behaviour',`
      <div class="form-group"><label>Student *</label><input type="text" id="bh-s" placeholder="Name or admission number"></div>
      <div class="grid-2">
        <div class="form-group"><label>Type</label><select id="bh-t" style="width:100%;padding:7px;border:1px solid var(--border);border-radius:6px"><option value="positive">✅ Positive</option><option value="negative">❌ Negative</option></select></div>
        <div class="form-group"><label>Points</label><input type="number" id="bh-p" value="5" min="-50" max="50"></div>
      </div>
      <div class="form-group"><label>Description *</label><input type="text" id="bh-d" placeholder="e.g. Helped clean classroom without being asked"></div>
      <button class="btn btn-primary w-full" onclick="Pages.Behaviour.save()">Record</button>`);},
  async save(){const r=await API.post('/behaviour',{studentIdentifier:document.getElementById('bh-s')?.value,type:document.getElementById('bh-t')?.value,points:+document.getElementById('bh-p')?.value||0,description:document.getElementById('bh-d')?.value});
    if(r.error){Toast.error(r.error);return;}Toast.success('Behaviour recorded!');this.switchTab('log');},
  async _rewards(c){const d=await API.get('/behaviour/rewards').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Toast.info('Rewards configuration coming soon')">+ Add Reward</button></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px">
    ${Array.isArray(d)&&d.length?d.map(r=>`<div class="card" style="text-align:center;border-top:3px solid #F57F17"><div style="font-size:36px;margin-bottom:8px">${r.icon||'🏆'}</div>
      <div style="font-weight:800;font-size:15px">${r.name||'Reward'}</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px">${r.description||''}</div>
      <div style="margin-top:10px">${_badge(r.points_required||0+' pts','#F57F17')}</div></div>`).join('')
      :`<div class="card" style="grid-column:1/-1">${UI.empty('No rewards configured — add rewards to motivate students')}</div>`}
    </div>`;},
  async _leaderboard(c){c.innerHTML=UI.loading();const d=await API.get('/behaviour/leaderboard').catch(()=>[]);const rows=Array.isArray(d)?d:[];
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">🏆 Behaviour Points Leaderboard</div></div>
    <div style="display:flex;flex-direction:column;gap:8px;padding:4px">
    ${rows.length?rows.slice(0,20).map((s,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:${i<3?'var(--brand-subtle)':'var(--bg-elevated)'};border-radius:8px;border:${i===0?'2px solid var(--brand)':'1px solid transparent'}">
      <div style="width:32px;text-align:center;font-size:${i<3?22:14}px;font-weight:800">${['🥇','🥈','🥉'][i]||i+1}</div>
      <div style="flex:1"><strong>${s.student_name||'--'}</strong><div style="font-size:11px;color:var(--text-muted)">${s.class_name||'--'}</div></div>
      <div style="font-weight:900;font-size:18px;color:${s.total_points>0?'var(--green)':'var(--red)'}">${s.total_points>0?'+':''}${s.total_points||0}</div>
    </div>`).join(''):`<div style="text-align:center;padding:32px;color:var(--text-muted)">No behaviour points recorded yet</div>`}
    </div></div>`;},
  async _report(c){const d=await API.get('/behaviour/report').catch(()=>({}));
    c.innerHTML=_statGrid([['Total Records',d.total||0,'#1565C0'],['Positive',d.positive||0,'#1B5E20'],['Negative',d.negative||0,'#B71C1C'],['Net Points',d.netPoints||0,'#6A1B9A']]);},
};

/* ── WELLNESS ───────────────────────────────────────────────── */
Pages.Wellness = {
  async load(){this.switchTab('sessions');},
  switchTab(tab,el){
    document.querySelectorAll('#page-wellness .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-wellness .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('wellness-content');if(!c)return;
    if(tab==='sessions')this._sessions(c);else if(tab==='mood')this._mood(c);else if(tab==='resources')this._resources(c);else this._report(c);
  },
  async _sessions(c){c.innerHTML=UI.loading();const d=await API.get('/wellness/sessions').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Toast.info('Ensure privacy guidelines are followed when recording sessions')">+ Record Session</button></div>
    <div class="card">${_tbl(['Student','Counsellor','Issue Type','Date','Follow Up','Status'],
      Array.isArray(d)&&d.length?d.map(s=>_tr([`<strong>${s.student_name||'--'}</strong>`,s.counsellor_name||'--',s.issue_type||'General',UI.date(s.session_date||s.created_at),UI.date(s.follow_up_date)||'--',_badge(s.status||'Open',s.status==='closed'?'#1B5E20':'#1565C0')])):[],
      'No counselling sessions recorded')}</div>`;},
  async _mood(c){
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">😊 Today's Mood Check-In</div></div>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px">How is your class feeling today?</p>
      <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:24px">
        ${[['😊','Happy',5],['😐','Okay',3],['😔','Sad',2],['😰','Anxious',1],['😤','Frustrated',2]].map(([e,l,v])=>`
        <button style="padding:16px 20px;border:2px solid var(--border);border-radius:14px;background:var(--bg-elevated);cursor:pointer;text-align:center;min-width:80px;transition:all .2s"
          onclick="Pages.Wellness.recordMood('${l}',${v},this)"><div style="font-size:36px">${e}</div><div style="font-size:11px;font-weight:700;margin-top:4px">${l}</div></button>`).join('')}
      </div>
      <div id="mood-fb" style="display:none;text-align:center;padding:16px;background:var(--bg-elevated);border-radius:10px;font-weight:700;color:#1B5E20;margin-bottom:16px">✅ Mood recorded — thank you!</div>
      <div class="card"><div class="card-header"><div class="card-title">📊 Class Mood This Week</div></div><canvas id="c-mood" height="140"></canvas></div></div>`;
    setTimeout(()=>{const cv=document.getElementById('c-mood');if(!cv||!window.Chart)return;
      new Chart(cv,{type:'bar',data:{labels:['Mon','Tue','Wed','Thu','Fri'],datasets:[{label:'Happy',data:[18,22,19,25,20],backgroundColor:'#1B5E20aa'},{label:'Okay',data:[12,10,14,8,15],backgroundColor:'#1565C0aa'},{label:'Sad/Anxious',data:[5,3,7,2,4],backgroundColor:'#B71C1Caa'}]},options:{responsive:true,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true}}}});},80);},
  async recordMood(label,value,btn){document.querySelectorAll('#wellness-content button').forEach(b=>b.style.borderColor='var(--border)');btn.style.borderColor='var(--brand)';btn.style.background='var(--brand-subtle)';await API.post('/wellness/mood',{mood:label,score:value}).catch(()=>{});const fb=document.getElementById('mood-fb');if(fb)fb.style.display='block';},
  async _resources(c){c.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">
    ${[['🧘','Stress Management','Tips for managing exam stress & pressure'],['💬','Peer Counselling','How to support a struggling friend'],['📞','Crisis Helpline','Befrienders Kenya: 0722 178 177'],['🛌','Sleep Hygiene','Why good sleep improves grades'],['🏃','Physical Wellness','Exercise and mental health connection'],['📖','Growth Mindset','Believing in your ability to improve']].map(([ic,t,d])=>`
    <div class="card glow-hover" style="cursor:pointer"><div style="font-size:40px;margin-bottom:10px">${ic}</div><div style="font-weight:800;font-size:14px;margin-bottom:6px">${t}</div><div style="font-size:12px;color:var(--text-muted);line-height:1.5">${d}</div></div>`).join('')}</div>`;},
  async _report(c){const d=await API.get('/wellness/report').catch(()=>({}));c.innerHTML=_statGrid([['Sessions This Month',d.sessions||0,'#1565C0','💬'],['Students Supported',d.students||0,'#1B5E20','💚'],['Follow-Ups Pending',d.followUps||0,'#E65100','⏰'],['Crisis Referrals',d.crisisReferrals||0,'#B71C1C','🚨']]);},
};

/* ── CAREER GUIDANCE ────────────────────────────────────────── */
Pages.Career = {
  async load(){this.switchTab('profiles');},
  switchTab(tab,el){
    document.querySelectorAll('#page-career .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-career .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('career-content');if(!c)return;
    if(tab==='profiles')this._profiles(c);else if(tab==='matches')this._matches(c);else if(tab==='universities')this._unis(c);else this._sessions(c);
  },
  async _profiles(c){c.innerHTML=UI.loading();const d=await API.get('/career/profiles').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:12px"><input type="text" placeholder="Search student…" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"></div>
    <div class="card">${_tbl(['Student','Class','Mean','Interests','Top Choice','Cluster','Status'],
      Array.isArray(d)&&d.length?d.map(s=>_tr([`<strong>${s.student_name||'--'}</strong>`,s.class_name||'--',`<strong style="color:var(--brand)">${s.mean_grade||s.meanGrade||'--'}</strong>`,(s.interests||[]).slice(0,2).join(', ')||'--',s.top_choice||'--',s.cluster||'--',_badge(s.profile_complete?'Complete':'Pending',s.profile_complete?'#1B5E20':'#F57F17')])):[],
      'No career profiles. Students complete profiles via the student portal.')}</div>`;},
  async _matches(c){c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">🎯 AI Course Matching</div><button class="btn btn-sm btn-primary" onclick="Pages.Career.runMatch()">🤖 Run AI Match</button></div>
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">Based on each student's grades, subjects & interests, the AI recommends best-fit university courses.</p>
    <div class="alert alert-info">Select a student or click "Run AI Match" to generate matches for all Form 4 students.</div></div>`;},
  async runMatch(){Toast.info('Running AI course matching…');await API.post('/career/run-match',{}).catch(()=>{});Toast.success('Matches generated!');this.switchTab('matches');},
  async _unis(c){c.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">
    ${[['University of Nairobi','Nairobi · Public · All clusters'],['Kenyatta University','Nairobi · Public · Education focus'],['Moi University','Eldoret · Public · Sciences & Tech'],['JKUAT','Juja · Public · Engineering & IT'],['Strathmore University','Nairobi · Private · Business & IT'],['Egerton University','Njoro · Public · Agriculture focus']].map(([n,m])=>`<div class="card glow-hover"><div style="font-size:32px;margin-bottom:8px">🎓</div><div style="font-weight:800;font-size:14px">${n}</div><div style="font-size:11px;color:var(--text-muted);margin-top:4px">${m}</div></div>`).join('')}</div>`;},
  async _sessions(c){c.innerHTML=UI.loading();const d=await API.get('/career/sessions').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Toast.info('Career guidance sessions — contact the career counsellor')">+ Schedule</button></div>
    <div class="card">${_tbl(['Student','Counsellor','Topic','Date','Outcome'],
      Array.isArray(d)&&d.length?d.map(s=>_tr([`<strong>${s.student_name||'--'}</strong>`,s.counsellor||'--',s.topic||'--',UI.date(s.session_date),s.outcome||'--'])):[],
      'No sessions scheduled')}</div>`;},
};

/* ── PORTFOLIO ──────────────────────────────────────────────── */
Pages.Portfolio = {
  async load(){this.switchTab('list');},
  switchTab(tab,el){
    document.querySelectorAll('#page-portfolio .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-portfolio .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('portfolio-content');if(!c)return;
    if(tab==='list')this._list(c);else if(tab==='achievements')this._achievements(c);else this._upload(c);
  },
  async _list(c){c.innerHTML=UI.loading();const d=await API.get('/portfolio').catch(()=>[]);const rows=Array.isArray(d)?d:[];
    c.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px">
    ${rows.length?rows.map(p=>`<div class="card glow-hover" style="cursor:pointer" onclick="Toast.info('Portfolio: ${(p.student_name||'').replace(/'/g,'')}')">
      <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#1565C0,#42A5F5);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:20px;margin-bottom:12px">${UI.initials(p.student_name||'')}</div>
      <div style="font-weight:800;font-size:15px">${p.student_name||'--'}</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${p.class_name||''}</div>
      <div style="display:flex;gap:8px;margin-top:10px">${_badge(p.achievements_count||0+' Achievements','#1565C0')}${_badge(p.documents_count||0+' Docs','#6A1B9A')}</div>
    </div>`).join(''):`<div class="card" style="grid-column:1/-1">${UI.empty('No portfolios yet — students add achievements via the portal')}</div>`}</div>`;},
  async _achievements(c){c.innerHTML=UI.loading();const d=await API.get('/portfolio/achievements').catch(()=>[]);
    const icons={academic:'🎓',sports:'⚽',art:'🎨',leadership:'🏅',community:'🤝',other:'⭐'};
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Toast.info('Achievement entry via student portal or class teacher')">+ Add Achievement</button></div>
    <div style="display:flex;flex-direction:column;gap:10px">
    ${Array.isArray(d)&&d.length?d.map(a=>`<div class="card" style="border-left:4px solid #1565C0">
      <div style="display:flex;align-items:center;gap:12px"><div style="font-size:32px">${icons[a.type||'other']||'⭐'}</div>
        <div style="flex:1"><div style="font-weight:700">${a.title||'Achievement'}</div><div style="font-size:12px;color:var(--text-muted)">${a.student_name||''} · ${a.class_name||''} · ${UI.date(a.date)}</div></div>
        ${_badge(a.type||'other','#F57F17')}</div></div>`).join(''):`<div class="card">${UI.empty('No achievements recorded')}</div>`}</div>`;},
  _upload(c){c.innerHTML=`<div class="card" style="max-width:520px"><div class="card-header"><div class="card-title">📤 Upload Portfolio Evidence</div></div>
    <div class="form-group"><label>Student *</label><input type="text" id="pf-s" placeholder="Name or admission number"></div>
    <div class="grid-2"><div class="form-group"><label>Type</label><select id="pf-t" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"><option value="certificate">Certificate</option><option value="photo">Photo</option><option value="award">Award Letter</option><option value="report">Report</option></select></div>
      <div class="form-group"><label>Date</label><input type="date" id="pf-d"></div></div>
    <div class="form-group"><label>Description</label><input type="text" id="pf-desc" placeholder="Brief description…"></div>
    <div class="form-group"><label>File URL</label><input type="text" id="pf-url" placeholder="Paste file URL…"></div>
    <button class="btn btn-primary" onclick="Pages.Portfolio.save()">📤 Upload</button></div>`;},
  async save(){const r=await API.post('/portfolio/documents',{studentIdentifier:document.getElementById('pf-s')?.value,type:document.getElementById('pf-t')?.value,date:document.getElementById('pf-d')?.value,description:document.getElementById('pf-desc')?.value,fileUrl:document.getElementById('pf-url')?.value});if(r.error){Toast.error(r.error);return;}Toast.success('Document uploaded!');this.switchTab('list');},
};

/* ── TUTORING ───────────────────────────────────────────────── */
Pages.Tutoring = {
  async load(){this.switchTab('sessions');},
  switchTab(tab,el){
    document.querySelectorAll('#page-tutoring .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-tutoring .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('tutoring-content');if(!c)return;
    if(tab==='sessions')this._sessions(c);else if(tab==='schedule')this._schedule(c);else if(tab==='students')this._students(c);else this._progress(c);
  },
  async _sessions(c){c.innerHTML=UI.loading();const d=await API.get('/tutoring/sessions').catch(()=>[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Tutoring.addSession()">+ Schedule Tutoring</button></div>
    <div class="card">${_tbl(['Subject','Class','Tutor','Date & Time','Students','Status'],
      Array.isArray(d)&&d.length?d.map(s=>_tr([`<strong>${s.subject||'--'}</strong>`,s.class_name||'--',s.tutor_name||'--',UI.date(s.session_date)+' '+s.start_time||'',s.enrolled_count||0,_badge(s.status||'Scheduled',s.status==='completed'?'#1B5E20':'#1565C0')])):[],
      'No tutoring sessions scheduled')}</div>`;},
  async addSession(){Toast.info('Contact the relevant teacher to schedule a tutoring session');},
  _schedule(c){c.innerHTML=`<div class="alert alert-info">Weekly tutoring schedule — sessions are configured in the Sessions tab.</div>`;},
  async _students(c){c.innerHTML=UI.loading();const d=await API.get('/tutoring/enrolled').catch(()=>[]);
    c.innerHTML=`<div class="card">${_tbl(['Student','Class','Subject','Attended','Progress'],
      Array.isArray(d)&&d.length?d.map(s=>_tr([`<strong>${s.student_name||'--'}</strong>`,s.class_name||'',s.subject||'',`${s.sessions_attended||0}/${s.total_sessions||0}`,_badge(s.improved?'Improving':'Ongoing',s.improved?'#1B5E20':'#F57F17')])):[],
      'No students enrolled in tutoring')}</div>`;},
  async _progress(c){const d=await API.get('/tutoring/progress').catch(()=>({}));c.innerHTML=_statGrid([['Sessions This Term',d.sessions||0,'#1565C0'],['Students Enrolled',d.students||0,'#1B5E20'],['Showing Improvement',d.improved||0,'#E65100'],['Avg Improvement','+'+(d.avgImprovement||0)+'%','#6A1B9A']]);},
};

/* ── POLLS & SURVEYS ────────────────────────────────────────── */
Pages.Polls = {
  async load(){this.switchTab('active');},
  switchTab(tab,el){
    document.querySelectorAll('#page-polls .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-polls .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('polls-content');if(!c)return;
    if(tab==='active')this._active(c);else if(tab==='create')this._create(c);else this._results(c);
  },
  async _active(c){c.innerHTML=UI.loading();const d=await API.get('/polls').catch(()=>[]);const rows=Array.isArray(d)?d:(d.data||[]);
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Polls.switchTab('create')">+ Create Poll</button></div>
    <div style="display:flex;flex-direction:column;gap:14px">
    ${rows.length?rows.map(p=>`<div class="card glow-hover"><div class="card-header"><div><div class="card-title">${p.question||p.title||'Poll'}</div>
      <div class="card-subtitle">${p.target_audience||'All'} · ${p.response_count||0} responses · Expires ${UI.date(p.expires_at)}</div></div>
      ${_badge(p.status||'Active',p.status==='active'?'#1B5E20':'#9E9E9E')}</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      ${(p.options||['Option A','Option B','Option C']).map((opt,i)=>{const votes=p.votes?p.votes[i]||0:Math.floor(Math.random()*20);const pct=p.response_count?Math.round(votes/p.response_count*100):0;return`<div>
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:12px">${opt}</span><span style="font-size:11px;font-weight:700">${votes} (${pct}%)</span></div>
        <div style="height:5px;background:var(--border);border-radius:3px"><div style="width:${pct}%;height:100%;background:var(--brand);border-radius:3px;transition:width 1s ease"></div></div>
      </div>`}).join('')}
      </div></div>`).join(''):`<div class="card">${UI.empty('No active polls — create one to gather feedback')}</div>`}</div>`;},
  _create(c){c.innerHTML=`<div class="card" style="max-width:600px"><div class="card-header"><div class="card-title">📋 Create New Poll</div></div>
    <div class="form-group"><label>Question *</label><input type="text" id="po-q" placeholder="e.g. How would you rate our school facilities?"></div>
    <div class="grid-2">
      <div class="form-group"><label>Audience</label><select id="po-aud" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"><option value="all">All</option><option value="students">Students</option><option value="staff">Staff</option><option value="parents">Parents</option></select></div>
      <div class="form-group"><label>Expires After</label><select id="po-exp" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"><option value="3">3 days</option><option value="7">7 days</option><option value="14">2 weeks</option><option value="30">1 month</option></select></div>
    </div>
    <div class="form-group"><label>Options (one per line) *</label><textarea id="po-opts" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)" placeholder="Excellent&#10;Good&#10;Fair&#10;Poor"></textarea></div>
    <div style="display:flex;gap:8px"><button class="btn btn-primary" onclick="Pages.Polls.save()">📋 Publish Poll</button><button class="btn btn-secondary" onclick="Pages.Polls.switchTab('active')">Cancel</button></div></div>`;},
  async save(){const opts=(document.getElementById('po-opts')?.value||'').split('\n').map(o=>o.trim()).filter(Boolean);if(opts.length<2){Toast.error('Add at least 2 options');return;}
    const r=await API.post('/polls',{question:document.getElementById('po-q')?.value?.trim(),targetAudience:document.getElementById('po-aud')?.value,expiresInDays:+document.getElementById('po-exp')?.value||7,options:opts});
    if(r.error){Toast.error(r.error);return;}Toast.success('Poll published!');this.switchTab('active');},
  async _results(c){const d=await API.get('/polls/results').catch(()=>[]);
    c.innerHTML=Array.isArray(d)&&d.length?`<div style="display:flex;flex-direction:column;gap:14px">${d.map(p=>`<div class="card"><div class="card-header"><div class="card-title">${p.question||p.title||'Poll'}</div><div class="card-subtitle">${p.response_count||0} total responses</div></div></div>`).join('')}</div>`:UI.empty('No poll results yet');},
};

/* ── BRANDING ───────────────────────────────────────────────── */
Pages.Branding = {
  async load(){
    const c=document.getElementById('branding-content');if(!c)return;c.innerHTML=UI.loading();
    const d=await API.get('/branding').catch(()=>({}));
    c.innerHTML=`<div class="grid-2" style="gap:20px">
      <div class="card"><div class="card-header"><div class="card-title">🎨 School Identity</div></div>
        <div class="form-group"><label>School Name</label><input type="text" id="br-name" value="${d.schoolName||d.name||''}"></div>
        <div class="form-group"><label>Short Name / Abbreviation</label><input type="text" id="br-short" value="${d.shortName||d.short_name||''}"></div>
        <div class="form-group"><label>School Motto</label><input type="text" id="br-motto" value="${d.motto||''}" placeholder="e.g. Excellence in All"></div>
        <div class="form-group"><label>Mission Statement</label><textarea id="br-mission" rows="3" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">${d.mission||''}</textarea></div>
        <div class="form-group"><label>Vision</label><textarea id="br-vision" rows="2" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">${d.vision||''}</textarea></div>
        <button class="btn btn-primary w-full" onclick="Pages.Branding.save()">💾 Save Identity</button>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">🖼️ Logo & Colors</div></div>
        <div style="text-align:center;margin-bottom:16px">
          ${d.logoUrl?`<img src="${d.logoUrl}" style="width:120px;height:120px;object-fit:contain;border-radius:12px;border:2px solid var(--border)" alt="Logo">`
            :`<div style="width:120px;height:120px;border-radius:12px;border:2px dashed var(--border);display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:36px;color:var(--text-muted)">🏫</div>`}
          <div style="margin-top:10px"><button class="btn btn-secondary btn-sm" onclick="Toast.info('Logo upload via Settings > School Profile')">Upload Logo</button></div>
        </div>
        <div class="form-group"><label>Primary Color</label><div style="display:flex;gap:8px;align-items:center">
          <input type="color" id="br-primary" value="${d.primaryColor||'#1565C0'}" style="width:48px;height:40px;border:none;border-radius:6px;cursor:pointer" oninput="document.getElementById('br-primary-hex').value=this.value">
          <input type="text" id="br-primary-hex" value="${d.primaryColor||'#1565C0'}" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"></div></div>
        <div class="form-group"><label>Accent Color</label><div style="display:flex;gap:8px;align-items:center">
          <input type="color" id="br-accent" value="${d.accentColor||'#42A5F5'}" style="width:48px;height:40px;border:none;border-radius:6px;cursor:pointer" oninput="document.getElementById('br-accent-hex').value=this.value">
          <input type="text" id="br-accent-hex" value="${d.accentColor||'#42A5F5'}" style="flex:1;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)"></div></div>
        <div id="brand-preview" style="padding:16px;border-radius:10px;background:${d.primaryColor||'#1565C0'};color:white;text-align:center;font-weight:700;margin-top:8px">${d.schoolName||'Your School Name'}</div>
      </div>
    </div>
    <div class="card" style="margin-top:20px"><div class="card-header"><div class="card-title">📞 Contact & Social Media</div></div>
      <div class="grid-3">
        <div class="form-group"><label>Phone</label><input type="tel" id="br-phone" value="${d.phone||''}" placeholder="+254…"></div>
        <div class="form-group"><label>Email</label><input type="email" id="br-email" value="${d.email||''}" placeholder="info@school.ac.ke"></div>
        <div class="form-group"><label>Website</label><input type="url" id="br-website" value="${d.website||''}" placeholder="https://school.ac.ke"></div>
        <div class="form-group"><label>Address</label><input type="text" id="br-address" value="${d.address||''}" placeholder="P.O. Box, Location, County"></div>
        <div class="form-group"><label>Twitter/X Handle</label><input type="text" id="br-twitter" value="${d.twitter||''}" placeholder="@schoolhandle"></div>
        <div class="form-group"><label>Facebook Page</label><input type="text" id="br-facebook" value="${d.facebook||''}" placeholder="facebook.com/schoolname"></div>
      </div>
      <button class="btn btn-primary" onclick="Pages.Branding.save()">💾 Save All Changes</button>
    </div>`;
  },
  async save(){
    const r=await API.put('/branding',{schoolName:document.getElementById('br-name')?.value?.trim(),shortName:document.getElementById('br-short')?.value?.trim(),motto:document.getElementById('br-motto')?.value?.trim(),mission:document.getElementById('br-mission')?.value?.trim(),vision:document.getElementById('br-vision')?.value?.trim(),primaryColor:document.getElementById('br-primary')?.value,accentColor:document.getElementById('br-accent')?.value,phone:document.getElementById('br-phone')?.value,email:document.getElementById('br-email')?.value,website:document.getElementById('br-website')?.value,address:document.getElementById('br-address')?.value,twitter:document.getElementById('br-twitter')?.value,facebook:document.getElementById('br-facebook')?.value});
    if(r.error){Toast.error(r.error);return;}Toast.success('Branding saved successfully!');
  },
};
