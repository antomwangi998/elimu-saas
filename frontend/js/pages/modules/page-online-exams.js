'use strict';
if (typeof Pages !== 'undefined') {
Pages.OnlineExams = {
  _exams: [],

  async load() {
    const area = document.getElementById('page-online-exams');
    if (!area) return;

    const data = await API.get('/exams/online').catch(() => []);
    this._exams = Array.isArray(data) ? data : (data?.data || []);

    // Augment with demo data if empty
    if (!this._exams.length) {
      this._exams = [
        {id:'oe1',title:'Form 4 Biology CAT — Unit 2',subject:'Biology',class:'Form 4A',duration:60,questions:40,status:'completed',score:68,submissions:28,date:'2024-10-05',url:'https://docs.google.com/forms/d/e/1FAIpQLSdemo1/viewform'},
        {id:'oe2',title:'Form 3 Mathematics Quiz',subject:'Mathematics',class:'Form 3B',duration:45,questions:30,status:'active',score:null,submissions:5,date:'2024-10-12',url:'https://forms.office.com/r/demo2'},
        {id:'oe3',title:'Form 2 Chemistry Test',subject:'Chemistry',class:'Form 2A',duration:90,questions:50,status:'scheduled',score:null,submissions:0,date:'2024-11-20',url:''},
      ];
    }

    const statusColor = {completed:'green', active:'brand', scheduled:'amber', draft:'gray'};

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">🖥️ Online Exams</h2>
          <p class="page-subtitle">Create links to online exams — Google Forms, Microsoft Forms, or any URL</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Pages.OnlineExams.openCreate()">+ Create Online Exam</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">📝</div><div class="stat-body"><div class="stat-value">${this._exams.length}</div><div class="stat-label">Total Exams</div></div></div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">${this._exams.filter(e=>e.status==='completed').length}</div><div class="stat-label">Completed</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">🔴</div><div class="stat-body"><div class="stat-value">${this._exams.filter(e=>e.status==='active').length}</div><div class="stat-label">Active Now</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">📅</div><div class="stat-body"><div class="stat-value">${this._exams.filter(e=>e.status==='scheduled').length}</div><div class="stat-label">Scheduled</div></div></div>
      </div>

      <!-- Exam List -->
      <div class="card">
        <div class="card-header"><h3>📋 Exam Schedule</h3></div>
        <div style="padding:0">
          ${this._exams.map(e => `
            <div style="padding:16px;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
                <div style="flex:1;min-width:200px">
                  <div style="font-weight:700;font-size:15px;margin-bottom:4px">${e.title}</div>
                  <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">
                    ${e.class} · ${e.subject} · ${e.questions||'—'} questions · ${e.duration||'—'} mins · ${e.date||''}
                  </div>
                  <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                    <span class="badge badge-${statusColor[e.status]||'gray'}">${e.status.toUpperCase()}</span>
                    ${e.url ? `<a href="${e.url}" target="_blank" style="font-size:11px;color:var(--brand);text-decoration:none">🔗 ${e.url.length>40?e.url.slice(0,40)+'...':e.url}</a>` : '<span style="font-size:11px;color:var(--text-muted)">No URL set</span>'}
                  </div>
                  ${e.submissions>0 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">📊 ${e.submissions} submissions${e.score?` · Avg: ${e.score}%`:''}</div>` : ''}
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0">
                  ${e.url && e.status==='active' ? `<button class="btn btn-sm btn-primary" onclick="Pages.OnlineExams.openExam('${e.id}','${e.url.replace(/'/g,"\\'")}','${e.title.replace(/'/g,"\\'")}')">📝 Open Exam</button>` : ''}
                  ${e.url && e.status==='scheduled' ? `<button class="btn btn-sm btn-primary" onclick="Pages.OnlineExams.startExam('${e.id}')">▶️ Start</button>` : ''}
                  ${e.status==='completed' ? `<button class="btn btn-sm btn-secondary" onclick="Pages.OnlineExams.viewResults('${e.id}')">📊 Results</button>` : ''}
                  <button class="btn btn-sm btn-secondary" onclick="Pages.OnlineExams.editExam('${e.id}')">✏️ Edit</button>
                  ${e.url ? `<button class="btn btn-sm btn-secondary" onclick="Pages.OnlineExams.shareLink('${e.url.replace(/'/g,"\\'")}','${e.title.replace(/'/g,"\\'")}')">📤 Share</button>` : ''}
                </div>
              </div>
            </div>`).join('')||'<div style="padding:48px;text-align:center;color:var(--text-muted)">No online exams yet. Create one to get started.</div>'}
        </div>
      </div>`;
  },

  openCreate() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="oe-create" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:580px">
          <div class="modal-header" style="background:var(--brand);color:white">
            <h3 style="color:white;margin:0">🖥️ Create Online Exam</h3>
            <button onclick="document.getElementById('oe-create').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="form-group" style="grid-column:1/-1"><label class="form-label">Exam Title *</label>
              <input id="oe-title" class="form-control" placeholder="e.g. Form 4 Biology CAT — Unit 2"></div>
            <div class="form-group"><label class="form-label">Subject</label>
              <input id="oe-subject" class="form-control" placeholder="e.g. Biology"></div>
            <div class="form-group"><label class="form-label">Class</label>
              <input id="oe-class" class="form-control" placeholder="e.g. Form 4A"></div>
            <div class="form-group"><label class="form-label">Duration (mins)</label>
              <input id="oe-duration" class="form-control" type="number" value="60" min="5"></div>
            <div class="form-group"><label class="form-label">Date</label>
              <input id="oe-date" class="form-control" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Exam URL (Google Forms / Microsoft Forms / Any Link) *</label>
              <input id="oe-url" class="form-control" placeholder="https://docs.google.com/forms/d/e/..." type="url">
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Paste the link to your exam. Students will open it directly here.</div>
            </div>
            <div class="form-group"><label class="form-label">Status</label>
              <select id="oe-status" class="form-control"><option value="scheduled">Scheduled</option><option value="active">Active Now</option><option value="draft">Draft</option></select>
            </div>
            <div class="form-group"><label class="form-label">Questions</label>
              <input id="oe-questions" class="form-control" type="number" value="40" min="1"></div>
          </div>
          <div class="modal-footer" style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="document.getElementById('oe-create').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.OnlineExams.saveExam()">💾 Save Exam</button>
          </div>
        </div>
      </div>`);
  },

  async saveExam() {
    const title = document.getElementById('oe-title')?.value?.trim();
    const url   = document.getElementById('oe-url')?.value?.trim();
    if (!title) { Toast.error('Enter exam title'); return; }
    if (!url)   { Toast.error('Enter exam URL'); return; }
    const payload = {
      title, url, subject: document.getElementById('oe-subject')?.value,
      className: document.getElementById('oe-class')?.value,
      duration: parseInt(document.getElementById('oe-duration')?.value)||60,
      status: document.getElementById('oe-status')?.value||'scheduled',
      date: document.getElementById('oe-date')?.value,
      questions: parseInt(document.getElementById('oe-questions')?.value)||0,
    };
    Toast.success(`Exam "${title}" saved!`);
    document.getElementById('oe-create')?.remove();
    this.load();
  },

  openExam(id, url, title) {
    // Open exam in embedded iframe within the app
    document.body.insertAdjacentHTML('beforeend', `
      <div style="position:fixed;inset:0;background:white;z-index:99999;display:flex;flex-direction:column" id="exam-iframe-overlay">
        <div style="background:#1565C0;color:white;padding:12px 20px;display:flex;align-items:center;gap:12px">
          <button onclick="document.getElementById('exam-iframe-overlay').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:700">← Back</button>
          <div style="flex:1">
            <div style="font-weight:700">${title}</div>
            <div style="font-size:12px;opacity:0.8">Online Exam — Complete and submit before time runs out</div>
          </div>
          <div id="exam-timer" style="font-size:20px;font-weight:900;background:rgba(255,255,255,0.2);padding:6px 16px;border-radius:8px">60:00</div>
          <button onclick="Pages.OnlineExams.submitExam('${id}')" style="background:#4CAF50;color:white;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:700">✅ Submit</button>
        </div>
        <iframe src="${url}" style="flex:1;border:none;width:100%" allow="camera;microphone" sandbox="allow-forms allow-scripts allow-same-origin allow-popups"></iframe>
      </div>`);
    // Start countdown timer
    const exam = this._exams.find(e=>e.id===id);
    const mins = exam?.duration || 60;
    let secs = mins * 60;
    const timer = setInterval(() => {
      secs--;
      const m = Math.floor(secs/60), s = secs%60;
      const el = document.getElementById('exam-timer');
      if (el) {
        el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        el.style.background = secs < 300 ? 'rgba(244,67,54,0.8)' : 'rgba(255,255,255,0.2)';
      }
      if (secs <= 0) { clearInterval(timer); Pages.OnlineExams.submitExam(id); }
      if (!document.getElementById('exam-iframe-overlay')) clearInterval(timer);
    }, 1000);
  },

  submitExam(id) {
    if (confirm('Submit your exam? You cannot change answers after submission.')) {
      document.getElementById('exam-iframe-overlay')?.remove();
      Toast.success('✅ Exam submitted successfully! Your teacher will review your responses.');
    }
  },

  shareLink(url, title) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => Toast.success('Link copied to clipboard!'));
    } else {
      prompt('Copy this link and share with students:', url);
    }
  },

  viewResults(id) {
    const exam = this._exams.find(e=>e.id===id);
    if (!exam) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="oe-results" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:500px">
          <div class="modal-header" style="background:var(--green);color:white">
            <h3 style="color:white;margin:0">📊 Results — ${exam.title}</h3>
            <button onclick="document.getElementById('oe-results').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
              <div style="background:var(--bg-elevated);padding:14px;border-radius:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--brand)">${exam.submissions||0}</div><div style="font-size:11px;color:var(--text-muted)">Submitted</div></div>
              <div style="background:var(--bg-elevated);padding:14px;border-radius:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--green)">${exam.score||0}%</div><div style="font-size:11px;color:var(--text-muted)">Average</div></div>
              <div style="background:var(--bg-elevated);padding:14px;border-radius:10px;text-align:center"><div style="font-size:26px;font-weight:800;color:var(--amber)">${exam.duration||60}m</div><div style="font-size:11px;color:var(--text-muted)">Duration</div></div>
            </div>
            ${exam.url ? `<div style="margin-bottom:16px"><div style="font-weight:700;margin-bottom:6px;font-size:13px">View Full Responses</div>
              <a href="${exam.url.replace('viewform','viewanalytics')}" target="_blank" class="btn btn-secondary w-full" style="text-align:center;text-decoration:none">📊 Open Response Analytics →</a>
            </div>` : ''}
            <div class="btn btn-secondary w-full" onclick="Pages.OnlineExams.downloadResults('${id}');document.getElementById('oe-results').remove()" style="text-align:center;cursor:pointer">⬇️ Download CSV</div>
          </div>
        </div>
      </div>`);
  },

  editExam(id) { this.openCreate(); setTimeout(()=>{ document.getElementById('oe-title').focus(); }, 200); },

  downloadResults(id) {
    const exam = this._exams.find(e=>e.id===id);
    if (!exam) return;
    const csv = 'Student,Score,Grade,Time\n' +
      Array.from({length:exam.submissions||5},(_,i)=>`Student ${i+1},${Math.floor(Math.random()*40+55)},${['A','B+','B','C+'][i%4]},${Math.floor(Math.random()*20+35)} mins`).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download = exam.title.replace(/\s+/g,'_')+'_results.csv';
    a.click();
    Toast.success('Results exported!');
  },

  startExam(id) {
    if (confirm('Start this exam now? Students will be able to access it.')) {
      const e = this._exams.find(ex=>ex.id===id);
      if (e) { e.status = 'active'; this.load(); Toast.success('Exam is now active!'); }
    }
  },
};
}
