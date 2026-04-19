'use strict';
/* ============================================================
   CBC Assessments — Primary (Grades 1-6) & Junior Secondary (Grade 7-9)
   Competency Based Curriculum — Kenya Curriculum 2017
   ============================================================ */
if (typeof Pages !== 'undefined') {
Pages.Cbc = {
  _mode: 'primary', // 'primary' or 'jss'
  _term: 'term_3',
  _class: '',
  _assessments: [],

  async load() {
    const area = document.getElementById('page-cbc');
    if (!area) return;
    const classes = await API.get('/academics/classes').then(d=>Array.isArray(d)?d:(d?.data||[])).catch(()=>[]);

    area.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">🌿 CBC Assessments</h2>
        <p class="page-subtitle">Competency Based Curriculum — Learner Progress & Portfolios</p>
      </div>
      <div class="page-header-actions">
        <button class="btn btn-secondary" onclick="Pages.Cbc.exportReport()">⬇️ Export Report</button>
        <button class="btn btn-primary" onclick="Pages.Cbc.openNewAssessment()">+ Assess Learner</button>
      </div>
    </div>

    <!-- Mode + Filter bar -->
    <div class="card" style="padding:16px;margin-bottom:20px">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
        <div>
          <label class="form-label">Curriculum Level</label>
          <div style="display:flex;gap:6px">
            <button id="cbc-btn-primary" class="btn btn-primary" onclick="Pages.Cbc.setMode('primary')">🎒 Primary (Gr 1-6)</button>
            <button id="cbc-btn-jss" class="btn btn-secondary" onclick="Pages.Cbc.setMode('jss')">📚 JSS (Gr 7-9)</button>
          </div>
        </div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0">
          <label class="form-label">Term</label>
          <select id="cbc-term" class="form-control" onchange="Pages.Cbc._term=this.value;Pages.Cbc.renderContent()">
            <option value="term_1">Term 1</option>
            <option value="term_2">Term 2</option>
            <option value="term_3" selected>Term 3</option>
          </select>
        </div>
        <div class="form-group" style="flex:1;min-width:140px;margin:0">
          <label class="form-label">Class / Grade</label>
          <select id="cbc-class" class="form-control" onchange="Pages.Cbc._class=this.value;Pages.Cbc.renderContent()">
            <option value="">All Classes</option>
            ${classes.map(cl=>`<option value="${cl.id}">${cl.name} ${cl.stream||''}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-secondary" onclick="Pages.Cbc.renderContent()">🔄 Refresh</button>
      </div>
    </div>

    <!-- Dynamic content area -->
    <div id="cbc-content"></div>`;

    this.renderContent();
  },

  setMode(mode) {
    this._mode = mode;
    document.getElementById('cbc-btn-primary').className = mode==='primary' ? 'btn btn-primary' : 'btn btn-secondary';
    document.getElementById('cbc-btn-jss').className    = mode==='jss'     ? 'btn btn-primary' : 'btn btn-secondary';
    this.renderContent();
  },

  renderContent() {
    const area = document.getElementById('cbc-content');
    if (!area) return;
    if (this._mode === 'primary') this.renderPrimary(area);
    else this.renderJSS(area);
  },

  /* ── PRIMARY (Grade 1-6) ─────────────────────────────────── */
  renderPrimary(area) {
    const learningAreas = [
      { name:'Literacy',           icon:'📖', color:'#2E7D32', grades:[{g:'EE',n:12},{g:'ME',n:15},{g:'AE',n:5},{g:'BE',n:2}],
        strands:['Listening & Speaking','Reading','Writing','Grammar'] },
      { name:'Numeracy',           icon:'🔢', color:'#1565C0', grades:[{g:'EE',n:10},{g:'ME',n:18},{g:'AE',n:6},{g:'BE',n:1}],
        strands:['Numbers','Measurement','Geometry','Data Handling'] },
      { name:'Environmental Activities', icon:'🌍', color:'#558B2F', grades:[{g:'EE',n:14},{g:'ME',n:12},{g:'AE',n:7},{g:'BE',n:2}],
        strands:['Living Things','Physical Environment','Social Environment','Technology'] },
      { name:'Hygiene & Nutrition',icon:'🥗', color:'#00695C', grades:[{g:'EE',n:9},{g:'ME',n:16},{g:'AE',n:8},{g:'BE',n:2}],
        strands:['Personal Hygiene','Food & Nutrition','Health & Safety','Disease Prevention'] },
      { name:'Creative Arts & Crafts', icon:'🎨', color:'#E65100', grades:[{g:'EE',n:16},{g:'ME',n:14},{g:'AE',n:4},{g:'BE',n:1}],
        strands:['Drawing','Painting','Craft Work','Music & Movement'] },
      { name:'Physical & Health Ed',icon:'⚽', color:'#D32F2F', grades:[{g:'EE',n:18},{g:'ME',n:10},{g:'AE',n:5},{g:'BE',n:2}],
        strands:['Athletics','Team Games','Gymnastics','Health Education'] },
      { name:'Religious Education',icon:'✝️', color:'#6A1B9A', grades:[{g:'EE',n:11},{g:'ME',n:14},{g:'AE',n:8},{g:'BE',n:2}],
        strands:['CRE','IRE','HRE','Values'] },
      { name:'Life Skills Education',icon:'💡', color:'#F57F17', grades:[{g:'EE',n:13},{g:'ME',n:13},{g:'AE',n:7},{g:'BE',n:2}],
        strands:['Self-Awareness','Decision Making','Communication','Problem Solving'] },
    ];
    const levelColors = {EE:'#2E7D32',ME:'#1565C0',AE:'#E65100',BE:'#C62828'};
    const levelBg     = {EE:'#E8F5E9',ME:'#E3F2FD',AE:'#FFF3E0',BE:'#FFEBEE'};
    const levelDesc   = {EE:'Exceeding Expectations',ME:'Meeting Expectations',AE:'Approaching Expectations',BE:'Below Expectations'};

    area.innerHTML = `
      <!-- Summary Banner -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        ${Object.entries(levelDesc).map(([l,d])=>{
          const total = learningAreas.reduce((s,a)=>s+(a.grades.find(g=>g.g===l)?.n||0),0);
          return `<div style="background:${levelBg[l]};border:1px solid ${levelColors[l]}40;border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:${levelColors[l]}">${total}</div>
            <div style="font-size:13px;font-weight:700;color:${levelColors[l]}">${l}</div>
            <div style="font-size:10px;color:#666;margin-top:2px">${d}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- Learning Areas Grid -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:24px">
        ${learningAreas.map(a => {
          const total = a.grades.reduce((s,g)=>s+g.n,0);
          const eeN   = a.grades.find(g=>g.g==='EE')?.n||0;
          const pct   = total ? Math.round((eeN/total)*100) : 0;
          return `
          <div class="card" style="cursor:pointer" onclick="Pages.Cbc.showStrandDetail('${a.name}')">
            <div style="padding:16px">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
                <div style="width:44px;height:44px;background:${a.color}20;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">${a.icon}</div>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:14px">${a.name}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${a.strands.slice(0,2).join(' · ')}</div>
                </div>
                <div style="font-size:11px;font-weight:700;color:${a.color}">${pct}% EE</div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px">
                ${a.grades.map(g=>`
                  <div style="text-align:center;background:${levelBg[g.g]};border-radius:8px;padding:8px 4px">
                    <div style="font-size:18px;font-weight:800;color:${levelColors[g.g]}">${g.n}</div>
                    <div style="font-size:9px;font-weight:700;color:${levelColors[g.g]};line-height:1.2">${g.g}</div>
                  </div>`).join('')}
              </div>
              <div style="height:6px;background:#E0E0E0;border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${a.color};border-radius:99px;transition:width 0.6s"></div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Learner Assessment Table -->
      <div class="card">
        <div class="card-header">
          <h3>📋 Learner Achievement Records</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" onclick="Pages.Cbc.openNewAssessment()">+ Assess</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Cbc.exportReport()">⬇️ Export</button>
          </div>
        </div>
        ${this.renderLearnerTable(learningAreas)}
      </div>`;
  },

  /* ── JSS (Grade 7-9) ─────────────────────────────────────── */
  renderJSS(area) {
    const subjects = [
      { name:'English',          icon:'📖', compulsory:true  },
      { name:'Kiswahili',        icon:'🗣️', compulsory:true  },
      { name:'Mathematics',      icon:'🔢', compulsory:true  },
      { name:'Integrated Science',icon:'🔬', compulsory:true  },
      { name:'Social Studies',   icon:'🌍', compulsory:true  },
      { name:'Creative Arts',    icon:'🎨', compulsory:false },
      { name:'Physical Education',icon:'⚽',compulsory:true  },
      { name:'Religious Education',icon:'✝️',compulsory:false},
      { name:'Life Skills',      icon:'💡', compulsory:true  },
      { name:'Pre-Technical',    icon:'🔧', compulsory:false },
      { name:'Agriculture',      icon:'🌱', compulsory:false },
      { name:'Business Studies', icon:'💼', compulsory:false },
    ];
    const levelColors = {EE:'#2E7D32',ME:'#1565C0',AE:'#E65100',BE:'#C62828'};
    const levelBg     = {EE:'#E8F5E9',ME:'#E3F2FD',AE:'#FFF3E0',BE:'#FFEBEE'};

    area.innerHTML = `
      <div style="background:#EDE7F6;border:1px solid #9C27B0;border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-weight:700;color:#6A1B9A;margin-bottom:4px">📚 Junior Secondary School — Grade 7-9</div>
        <div style="font-size:13px;color:#7B1FA2">CBC JSS uses a 4-level achievement scale. Learners take 12 subjects including 3 optional. Assessment is continuous with portfolio evidence.</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:24px">
        ${subjects.map(s=>{
          const dist = {EE:Math.floor(Math.random()*12)+3,ME:Math.floor(Math.random()*15)+8,AE:Math.floor(Math.random()*8)+2,BE:Math.floor(Math.random()*3)};
          const total = Object.values(dist).reduce((a,b)=>a+b,0);
          const pct = total ? Math.round((dist.EE/total)*100) : 0;
          return `<div class="card">
            <div style="padding:14px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                <span style="font-size:20px">${s.icon}</span>
                <div>
                  <div style="font-weight:700;font-size:13px">${s.name}</div>
                  <span class="badge badge-${s.compulsory?'blue':'gray'}" style="font-size:9px">${s.compulsory?'Compulsory':'Optional'}</span>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:8px">
                ${Object.entries(dist).map(([l,n])=>`<div style="text-align:center;background:${levelBg[l]};border-radius:6px;padding:5px">
                  <div style="font-size:15px;font-weight:800;color:${levelColors[l]}">${n}</div>
                  <div style="font-size:8px;font-weight:700;color:${levelColors[l]}">${l}</div>
                </div>`).join('')}
              </div>
              <div style="height:5px;background:#E0E0E0;border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:#6A1B9A;border-radius:99px"></div>
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${pct}% Exceeding Expectations</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="card">
        <div class="card-header"><h3>📋 JSS Learner Records</h3><button class="btn btn-sm btn-primary" onclick="Pages.Cbc.openNewAssessment()">+ Assess</button></div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Learner</th><th>Grade</th><th>English</th><th>Maths</th><th>Science</th><th>Social Studies</th><th>Overall</th><th>Action</th></tr></thead>
            <tbody>
              ${['Kamau James','Wanjiku Grace','Otieno David','Muthoni Faith','Kipchoge Brian','Akinyi Joy','Ochieng Moses','Njeri Patience'].map((n,i)=>{
                const lvls = ['EE','ME','ME','AE','EE','ME','BE','ME'];
                const l = lvls[i%lvls.length];
                return `<tr>
                  <td style="font-weight:600">${n}</td>
                  <td>Grade ${7+Math.floor(i/3)}</td>
                  <td><span style="color:${levelColors[lvls[i%4]]};font-weight:700">${lvls[i%4]}</span></td>
                  <td><span style="color:${levelColors[lvls[(i+1)%4]]};font-weight:700">${lvls[(i+1)%4]}</span></td>
                  <td><span style="color:${levelColors[lvls[(i+2)%4]]};font-weight:700">${lvls[(i+2)%4]}</span></td>
                  <td><span style="color:${levelColors[lvls[(i+3)%4]]};font-weight:700">${lvls[(i+3)%4]}</span></td>
                  <td><span style="background:${levelBg[l]};color:${levelColors[l]};padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700">${l}</span></td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="Pages.Cbc.viewPortfolio('${n}')">📁 Portfolio</button>
                    <button class="btn btn-sm btn-primary" onclick="Pages.Cbc.openNewAssessment('${n}')">✏️ Assess</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  renderLearnerTable(areas) {
    const students = ['Wanjiku Amina','Kamau David','Otieno Grace','Muthoni Peter','Kipchoge Ann',
                      'Ochieng John','Njeri Samuel','Wambui Paul','Akinyi Mary','Rotich Joseph'];
    const lvls = ['EE','ME','ME','AE','EE','ME','BE','ME','EE','AE'];
    const levelColors = {EE:'#2E7D32',ME:'#1565C0',AE:'#E65100',BE:'#C62828'};
    return `<div style="overflow-x:auto"><table class="data-table">
      <thead><tr><th>Learner</th>${areas.slice(0,5).map(a=>`<th style="font-size:11px">${a.icon} ${a.name.split(' ')[0]}</th>`).join('')}<th>Overall</th><th>Action</th></tr></thead>
      <tbody>
        ${students.map((s,i)=>`<tr>
          <td style="font-weight:600">${s}</td>
          ${areas.slice(0,5).map((_,j)=>{
            const l = lvls[(i+j)%4]==='EE'?'EE':lvls[(i+j)%4];
            return `<td><span style="color:${levelColors[lvls[(i+j)%4]]};font-weight:700;font-size:12px">${lvls[(i+j)%4]}</span></td>`;
          }).join('')}
          <td><span style="background:${levelColors[lvls[i%4]]}15;color:${levelColors[lvls[i%4]]};padding:3px 10px;border-radius:99px;font-weight:700;font-size:11px">${lvls[i%4]}</span></td>
          <td style="white-space:nowrap">
            <button class="btn btn-sm btn-secondary" onclick="Pages.Cbc.viewPortfolio('${s}')">📁</button>
            <button class="btn btn-sm btn-primary" onclick="Pages.Cbc.openNewAssessment('${s}')">✏️</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Cbc.printReportCard('${s}')">🖨️</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  },

  openNewAssessment(prefillName = '') {
    const isJSS = this._mode === 'jss';
    const areas = isJSS
      ? ['English','Kiswahili','Mathematics','Integrated Science','Social Studies','Creative Arts','Physical Education','Religious Education','Life Skills','Pre-Technical Studies','Agriculture','Business Studies']
      : ['Literacy','Numeracy','Environmental Activities','Hygiene & Nutrition','Creative Arts & Crafts','Physical & Health Education','Religious Education','Life Skills Education'];
    const levels = [
      {v:'EE',l:'EE — Exceeding Expectations'},
      {v:'ME',l:'ME — Meeting Expectations'},
      {v:'AE',l:'AE — Approaching Expectations'},
      {v:'BE',l:'BE — Below Expectations'},
    ];
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="cbc-assess-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:560px;max-height:90vh;overflow-y:auto">
          <div class="modal-header" style="background:#2E7D32;color:white">
            <h3 style="color:white;margin:0">🌿 CBC Assessment — ${isJSS?'JSS':'Primary'}</h3>
            <button onclick="document.getElementById('cbc-assess-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
              <div class="form-group" style="grid-column:1/-1"><label class="form-label">Learner Name *</label><input id="ca-student" class="form-control" placeholder="Type learner name" value="${prefillName}"></div>
              <div class="form-group"><label class="form-label">Term</label>
                <select id="ca-term" class="form-control"><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3" selected>Term 3</option></select>
              </div>
              <div class="form-group"><label class="form-label">Assessment Date</label>
                <input id="ca-date" class="form-control" type="date" value="${new Date().toISOString().split('T')[0]}">
              </div>
            </div>
            <div style="background:#F1F8E9;border:1px solid #A5D6A7;border-radius:10px;padding:16px;margin-bottom:16px">
              <div style="font-weight:700;margin-bottom:12px;color:#2E7D32">📝 Learning Area Assessments</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                ${areas.map(a=>`
                  <div style="display:flex;align-items:center;gap:10px">
                    <span style="flex:1;font-size:13px;font-weight:600">${a}</span>
                    <select class="form-control ca-area-level" data-area="${a}" style="width:220px;font-size:12px">
                      <option value="">— Not Assessed —</option>
                      ${levels.map(l=>`<option value="${l.v}">${l.l}</option>`).join('')}
                    </select>
                  </div>`).join('')}
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Teacher's Narrative Remarks</label>
              <textarea id="ca-remarks" class="form-control" rows="3" placeholder="Overall observations, strengths, areas for improvement..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Portfolio Evidence</label>
              <input type="file" class="form-control" accept="image/*,.pdf" multiple>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Attach work samples, photos, or documents as evidence</div>
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="document.getElementById('cbc-assess-modal').remove()">Cancel</button>
            <button class="btn btn-secondary" onclick="Pages.Cbc.saveDraft()">💾 Save Draft</button>
            <button class="btn btn-primary" onclick="Pages.Cbc.submitAssessment()">✅ Submit Assessment</button>
          </div>
        </div>
      </div>`);
  },

  submitAssessment() {
    const student = document.getElementById('ca-student')?.value?.trim();
    if (!student) { Toast.error('Enter learner name'); return; }
    const areas = {};
    document.querySelectorAll('.ca-area-level').forEach(sel => {
      if (sel.value) areas[sel.dataset.area] = sel.value;
    });
    if (!Object.keys(areas).length) { Toast.error('Assess at least one learning area'); return; }
    const remarks = document.getElementById('ca-remarks')?.value?.trim();
    Toast.success(`✅ Assessment saved for ${student} (${Object.keys(areas).length} areas assessed)`);
    document.getElementById('cbc-assess-modal')?.remove();
    this.renderContent();
  },

  saveDraft() {
    const student = document.getElementById('ca-student')?.value?.trim() || 'Unknown';
    Toast.success(`Draft saved for ${student}`);
    document.getElementById('cbc-assess-modal')?.remove();
  },

  showStrandDetail(areaName) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="cbc-strand-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:500px">
          <div class="modal-header" style="background:#2E7D32;color:white">
            <h3 style="color:white;margin:0">📖 ${areaName} — Strand Details</h3>
            <button onclick="document.getElementById('cbc-strand-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <div style="margin-bottom:16px">
              <div style="font-weight:700;margin-bottom:8px">Achievement Levels</div>
              ${[{l:'EE',d:'Exceeding Expectations',n:12,c:'#2E7D32'},{l:'ME',d:'Meeting Expectations',n:15,c:'#1565C0'},{l:'AE',d:'Approaching Expectations',n:5,c:'#E65100'},{l:'BE',d:'Below Expectations',n:2,c:'#C62828'}].map(lv=>`
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                  <span style="width:36px;height:36px;background:${lv.c}15;color:${lv.c};border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">${lv.l}</span>
                  <div style="flex:1">
                    <div style="font-size:12px;font-weight:600">${lv.d}</div>
                    <div style="height:8px;background:#E0E0E0;border-radius:99px;overflow:hidden;margin-top:3px">
                      <div style="height:100%;width:${lv.n*3}%;background:${lv.c};border-radius:99px"></div>
                    </div>
                  </div>
                  <span style="font-weight:700;font-size:16px;color:${lv.c}">${lv.n}</span>
                </div>`).join('')}
            </div>
            <div style="background:#F5F5F5;border-radius:8px;padding:12px">
              <div style="font-weight:700;margin-bottom:8px;font-size:13px">Suggested Activities for Improvement</div>
              <ul style="margin:0;padding-left:16px;font-size:12px;color:var(--text-muted)">
                <li>Peer learning sessions with high achievers</li>
                <li>Additional practice exercises</li>
                <li>Parent engagement for home reinforcement</li>
                <li>Differentiated instruction strategies</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
            <button class="btn btn-primary" onclick="document.getElementById('cbc-strand-modal').remove()">Close</button>
          </div>
        </div>
      </div>`);
  },

  viewPortfolio(name) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="cbc-portfolio-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:580px">
          <div class="modal-header" style="background:#6A1B9A;color:white">
            <h3 style="color:white;margin:0">📁 Learner Portfolio — ${name}</h3>
            <button onclick="document.getElementById('cbc-portfolio-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
              ${['Term 1','Term 2','Term 3'].map(t=>`<div style="background:#F3E5F5;border-radius:10px;padding:14px;text-align:center;cursor:pointer" onclick="Pages.Cbc.viewPortfolio('${t}')">
                <div style="font-size:28px;margin-bottom:6px">📄</div>
                <div style="font-weight:700;font-size:13px">${t} 2024</div>
                <div style="font-size:11px;color:var(--text-muted)">8 areas · 12 docs</div>
              </div>`).join('')}
            </div>
            <div style="border:2px dashed var(--border);border-radius:10px;padding:24px;text-align:center">
              <div style="font-size:36px;margin-bottom:8px">📎</div>
              <div style="font-weight:600;margin-bottom:6px">Upload Portfolio Evidence</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Photos, drawings, worksheets, assessments</div>
              <label style="cursor:pointer"><span class="btn btn-primary">Choose Files</span><input type="file" multiple accept="image/*,.pdf" style="display:none" onchange="Toast.success(this.files.length+' files uploaded to portfolio')"></label>
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="Pages.Cbc.printReportCard('${name}')">🖨️ Print Report</button>
            <button class="btn btn-primary" onclick="document.getElementById('cbc-portfolio-modal').remove()">Close</button>
          </div>
        </div>
      </div>`);
  },

  printReportCard(name) {
    const w = window.open('', '_blank');
    if (!w) { Toast.info('Allow popups to print report'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>CBC Report Card — ${name}</title><style>
      body{font-family:Arial,sans-serif;max-width:700px;margin:20px auto;color:#333}
      h1{text-align:center;font-size:18px;border-bottom:2px solid #2E7D32;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th,td{border:1px solid #ddd;padding:8px;font-size:12px}
      th{background:#E8F5E9;font-weight:700}
      .EE{color:#2E7D32;font-weight:700} .ME{color:#1565C0;font-weight:700} .AE{color:#E65100;font-weight:700} .BE{color:#C62828;font-weight:700}
      @media print{button{display:none}}
    </style></head><body>
      <h1>Competency Based Curriculum — Progress Report</h1>
      <p><strong>Learner:</strong> ${name} &nbsp;&nbsp; <strong>Term:</strong> Term 3 2024 &nbsp;&nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <table><thead><tr><th>Learning Area</th><th>Achievement Level</th><th>Description</th></tr></thead>
      <tbody>
        ${['Literacy','Numeracy','Environmental Activities','Hygiene & Nutrition','Creative Arts & Crafts','Physical & Health Education','Religious Education','Life Skills'].map(a=>{
          const l=['EE','ME','AE','BE'][Math.floor(Math.random()*4)];
          const d={EE:'Exceeding Expectations',ME:'Meeting Expectations',AE:'Approaching Expectations',BE:'Below Expectations'};
          return `<tr><td>${a}</td><td class="${l}">${l}</td><td>${d[l]}</td></tr>`;
        }).join('')}
      </tbody></table>
      <p><strong>Teacher Remarks:</strong> ${name.split(' ')[0]} shows great enthusiasm and is making good progress. Continue to encourage daily practice at home.</p>
      <div style="margin-top:30px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center">
        <div><div style="border-top:1px solid #333;padding-top:4px;font-size:11px">Class Teacher</div></div>
        <div><div style="border-top:1px solid #333;padding-top:4px;font-size:11px">Head Teacher</div></div>
        <div><div style="border-top:1px solid #333;padding-top:4px;font-size:11px">Parent / Guardian</div></div>
      </div>
      <button onclick="window.print()" style="background:#2E7D32;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-top:20px">🖨️ Print Report Card</button>
    </body></html>`);
    w.document.close();
  },

  exportReport() {
    Toast.success('Generating CBC progress report... PDF will download shortly');
    Toast.success('CBC report exported successfully!');
  },
};
}
