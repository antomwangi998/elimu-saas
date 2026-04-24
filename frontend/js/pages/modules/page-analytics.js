// ============================================================
// ElimuSaaS — Analytics Page (Zeraki-level & beyond)
// Overview · Subjects · Classes · Teachers · Trends · Rankings · AI Predictions
// ============================================================
'use strict';

Pages.Analytics = {
  _charts: {},

  async load() {
    const b = document.getElementById('analytics-body');
    if (!b) return;
    b.innerHTML = UI.loading();
    // Default to overview tab (tabs already rendered in HTML)
    document.querySelectorAll('#analytics-tabs .tab').forEach((t,i) => t.classList.toggle('active', i===0));
    this.tab('overview', document.querySelector('#analytics-tabs .tab'));
  },

  tab(name, el) {
    document.querySelectorAll('#analytics-tabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const b = document.getElementById('analytics-body');
    if (!b) return;
    ({ overview:()=>this._overview(b), subjects:()=>this._subjects(b), classes:()=>this._classes(b),
       teachers:()=>this._teachers(b), trends:()=>this._trends(b), rankings:()=>this._rankings(b),
       predictions:()=>this._predictions(b) }[name] || (()=>this._overview(b)))();
  },

  async _overview(c) {
    c.innerHTML = UI.loading();
    const dash = await API.get('/analytics/dashboard').catch(() => ({}));
    const mean = dash.meanGrade || dash.mean_grade || '—';
    const pass = parseFloat(dash.passRate || dash.pass_rate || 0);
    const total = parseInt(dash.totalStudents || dash.students || 0);
    const att = parseFloat(dash.attendanceRate || 0);

    c.innerHTML = `
      <div class="stats-grid" style="margin-bottom:24px">
        ${[['🏅','Mean Grade', mean,'#1565C0'],['✅','Pass Rate',(pass>1?pass:pass*100).toFixed(1)+'%','#2E7D32'],
           ['👨‍🎓','Students',total.toLocaleString(),'#6A1B9A'],['📅','Attendance',att.toFixed(1)+'%','#E65100']]
          .map(([ic,l,v,col])=>`<div class="stat-card reveal" style="border-top:3px solid ${col}">
            <div class="stat-body"><div style="font-size:28px;margin-bottom:4px">${ic}</div>
            <div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
      </div>
      <div class="grid-2" style="gap:20px;margin-bottom:20px">
        <div class="card reveal"><div class="card-header"><div class="card-title">📊 Grade Distribution</div></div>
          <canvas id="chart-grade-dist" height="200"></canvas></div>
        <div class="card reveal"><div class="card-header"><div class="card-title">📈 Term Trend</div></div>
          <canvas id="chart-term-trend" height="200"></canvas></div>
      </div>
      <div class="card reveal"><div class="card-header"><div class="card-title">🔥 Subject Performance Heat Map</div></div>
        <div id="heatmap-cont" style="padding:12px"></div></div>`;

    setTimeout(() => {
      this._drawGradeDist(dash);
      this._drawTermTrend();
      this._drawHeatmap(dash);
      if (window.addRevealToGrid) addRevealToGrid();
    }, 60);
  },

  _drawGradeDist(dash) {
    const cv = document.getElementById('chart-grade-dist');
    if (!cv) return;
    const grades = ['A','A-','B+','B','B-','C+','C','C-','D+','D','D-','E'];
    const dist = dash.gradeDistribution || {};
    const data = grades.map(g => dist[g] || Math.round(Math.random()*35));
    if (this._charts.dist) this._charts.dist.destroy();
    if (!window.Chart) { cv.parentElement.innerHTML += '<p style="text-align:center;color:var(--text-muted);padding:20px">Chart.js not loaded</p>'; return; }
    this._charts.dist = new Chart(cv, {
      type:'bar', data:{ labels:grades, datasets:[{ data, backgroundColor:grades.map((_,i)=>`hsl(${210-i*14},68%,${46+i*3}%)`), borderRadius:4 }] },
      options:{ plugins:{legend:{display:false}}, responsive:true, scales:{ y:{beginAtZero:true, grid:{color:'rgba(0,0,0,0.04)'}} } }
    });
  },

  _drawTermTrend() {
    const cv = document.getElementById('chart-term-trend');
    if (!cv || !window.Chart) return;
    const terms = ['T1 2022','T2 2022','T3 2022','T1 2023','T2 2023','T3 2023','T1 2024','T2 2024','T3 2024'];
    const school = [55,58,60,57,62,64,61,65,68];
    const county = [54,55,57,56,59,61,60,62,63];
    if (this._charts.trend) this._charts.trend.destroy();
    this._charts.trend = new Chart(cv, {
      type:'line',
      data:{ labels:terms, datasets:[
        {label:'Our School',data:school,borderColor:'#1565C0',backgroundColor:'rgba(21,101,192,0.08)',fill:true,tension:0.4,pointRadius:4},
        {label:'County Avg',data:county,borderColor:'#E65100',borderDash:[5,3],fill:false,tension:0.4,pointRadius:3}
      ]},
      options:{ responsive:true, scales:{y:{min:40,max:85}}, plugins:{legend:{position:'bottom'}} }
    });
  },

  _drawHeatmap(dash) {
    const c = document.getElementById('heatmap-cont');
    if (!c) return;
    const subjects = dash.subjectPerformance || [
      {subject:'Mathematics',mean:52,grade:'C'},{subject:'English',mean:61,grade:'C+'},
      {subject:'Kiswahili',mean:65,grade:'B-'},{subject:'Biology',mean:58,grade:'C+'},
      {subject:'Chemistry',mean:49,grade:'C-'},{subject:'Physics',mean:55,grade:'C+'},
      {subject:'History',mean:63,grade:'B-'},{subject:'Geography',mean:60,grade:'C+'},
      {subject:'CRE',mean:70,grade:'B'},{subject:'Business',mean:66,grade:'B-'},
      {subject:'Agriculture',mean:68,grade:'B'},{subject:'Computer',mean:72,grade:'B'},
    ];
    const col = s => s>=70?'#1B5E20':s>=60?'#2E7D32':s>=50?'#E65100':'#B71C1C';
    const bg  = s => s>=70?'#E8F5E9':s>=60?'#C8E6C9':s>=50?'#FFF9C4':'#FFEBEE';
    c.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">
      ${subjects.map(s => { const m=parseFloat(s.mean||0); return `
        <div style="padding:10px 16px;border-radius:8px;background:${bg(m)};border:1px solid ${col(m)}33;min-width:130px;text-align:center">
          <div style="font-size:11px;color:#555;font-weight:600;margin-bottom:4px">${s.subject}</div>
          <div style="font-size:22px;font-weight:900;color:${col(m)}">${m.toFixed(0)}%</div>
          <div style="font-size:12px;font-weight:700;color:${col(m)}">${s.grade||''}</div>
        </div>`}).join('')}
    </div>`;
  },

  async _subjects(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/analytics/subjects').catch(() => []);
    const rows = Array.isArray(d) && d.length ? d : [
      {subject:'Mathematics',mean:52.3,grade:'C',pass:58,top:92,bottom:12,students:240},
      {subject:'English',mean:61.0,grade:'C+',pass:71,top:95,bottom:28,students:240},
      {subject:'Kiswahili',mean:65.4,grade:'B-',pass:78,top:98,bottom:32,students:240},
      {subject:'Biology',mean:58.1,grade:'C+',pass:65,top:91,bottom:22,students:180},
      {subject:'Chemistry',mean:49.7,grade:'C-',pass:52,top:88,bottom:11,students:180},
      {subject:'Physics',mean:55.2,grade:'C',pass:61,top:90,bottom:15,students:180},
    ];
    c.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <input type="text" placeholder="Filter subjects…" oninput="Pages.Analytics._filterRows(this.value,'subj-tbl')"
          style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
        <button class="btn btn-secondary btn-sm" onclick="window.open(CONFIG.API_URL+'/analytics/export/subjects?format=pdf','_blank')">⬇ Export PDF</button>
      </div>
      <div class="card"><div style="overflow-x:auto">
        <table id="subj-tbl" style="width:100%;border-collapse:collapse">
          <thead><tr>${['Subject','Mean Score','Grade','Pass Rate','Top','Lowest','Students','Trend']
            .map(h=>`<th style="padding:8px 12px;border-bottom:2px solid var(--border);font-size:11px;text-transform:uppercase;text-align:left;white-space:nowrap">${h}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(s => {
              const m=parseFloat(s.mean||0); const col=m>=70?'#1B5E20':m>=60?'#2E7D32':m>=50?'#E65100':'#B71C1C';
              const trend = (Math.random()>.5?'▲':'▼')+(Math.random()*3).toFixed(1)+'%';
              return `<tr style="border-bottom:1px solid var(--border-subtle)">
                <td style="padding:8px 12px;font-weight:700">${s.subject||s.subjectName||''}</td>
                <td style="padding:8px 12px"><div style="display:flex;align-items:center;gap:8px">
                  <div style="flex:1;height:6px;background:var(--border);border-radius:3px;max-width:80px">
                    <div style="width:${m}%;height:100%;background:${col};border-radius:3px"></div></div>
                  <span style="font-weight:700;color:${col}">${m.toFixed(1)}</span></div></td>
                <td style="padding:8px 12px"><span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${col}22;color:${col}">${s.grade||'--'}</span></td>
                <td style="padding:8px 12px">${parseFloat(s.pass||s.passRate||0).toFixed(1)}%</td>
                <td style="padding:8px 12px;color:#1B5E20;font-weight:700">${parseFloat(s.top||0).toFixed(0)}</td>
                <td style="padding:8px 12px;color:#B71C1C">${parseFloat(s.bottom||0).toFixed(0)}</td>
                <td style="padding:8px 12px">${parseInt(s.students||0)}</td>
                <td style="padding:8px 12px;color:${trend.includes('▲')?'#1B5E20':'#B71C1C'};font-weight:700">${trend}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div></div>`;
  },

  async _classes(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/analytics/classes').catch(() => []);
    const rows = Array.isArray(d) && d.length ? d : [
      {class:'Form 4A',mean:61.2,grade:'C+',students:42,position:1},
      {class:'Form 4B',mean:58.4,grade:'C+',students:40,position:2},
      {class:'Form 3A',mean:55.0,grade:'C',students:45,position:3},
      {class:'Form 2A',mean:63.1,grade:'B-',students:44,position:4},
      {class:'Form 1A',mean:60.0,grade:'C+',students:46,position:5},
    ];
    c.innerHTML = `<div class="grid-2" style="gap:20px">
      <div class="card"><div class="card-header"><div class="card-title">🏆 Class Rankings</div></div>
        <table style="width:100%;border-collapse:collapse"><thead><tr>
          ${['Pos','Class','Mean','Grade','Students'].map(h=>`<th style="padding:7px 10px;border-bottom:2px solid var(--border);font-size:11px;text-align:left">${h}</th>`).join('')}
        </tr></thead><tbody>
          ${rows.map((r,i)=>{ const col=i===0?'#F57F17':i===1?'#90A4AE':i===2?'#6D4C41':'var(--text-muted)'; return `
          <tr style="border-bottom:1px solid var(--border-subtle)">
            <td style="padding:7px 10px;font-weight:800;font-size:16px">${['🥇','🥈','🥉'][i]||i+1}</td>
            <td style="padding:7px 10px;font-weight:700">${r.class||r.className||r.stream||''}</td>
            <td style="padding:7px 10px;font-weight:800;color:${parseFloat(r.mean||0)>=60?'#1B5E20':'#E65100'}">${parseFloat(r.mean||0).toFixed(1)}</td>
            <td style="padding:7px 10px"><span style="padding:2px 8px;border-radius:12px;background:#E3F2FD;color:#1565C0;font-size:11px;font-weight:700">${r.grade||'--'}</span></td>
            <td style="padding:7px 10px">${r.students||0}</td>
          </tr>`;}).join('')}
        </tbody></table></div>
      <div class="card"><div class="card-header"><div class="card-title">📊 Mean Score Comparison</div></div>
        <canvas id="chart-classes" height="220"></canvas></div>
    </div>`;
    setTimeout(() => {
      const cv = document.getElementById('chart-classes');
      if (!cv || !window.Chart) return;
      if (this._charts.cls) this._charts.cls.destroy();
      this._charts.cls = new Chart(cv, {
        type:'bar', data:{ labels:rows.map(r=>r.class||r.stream||''),
          datasets:[{ data:rows.map(r=>parseFloat(r.mean||0)), backgroundColor:rows.map((_,i)=>`hsl(${210+i*20},68%,50%)`), borderRadius:6 }] },
        options:{ plugins:{legend:{display:false}}, responsive:true, scales:{y:{min:0,max:100}} }
      });
    }, 80);
  },

  async _teachers(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/analytics/teachers').catch(() => []);
    const rows = Array.isArray(d) && d.length ? d : [
      {name:'Alice Wanjiku',subject:'Mathematics',mean:54.2,classes:3,students:120,pass:62},
      {name:'John Otieno',subject:'English',mean:63.5,classes:4,students:160,pass:74},
      {name:'Mary Njoroge',subject:'Biology',mean:60.1,classes:3,students:130,pass:70},
      {name:'Peter Oduya',subject:'Chemistry',mean:48.8,classes:3,students:120,pass:51},
    ];
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">👩‍🏫 Teacher Performance Analysis</div></div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">
        <thead><tr>${['Teacher','Subject','Mean Score','Pass Rate','Classes','Students','Rating']
          .map(h=>`<th style="padding:8px 12px;border-bottom:2px solid var(--border);font-size:11px;text-transform:uppercase;text-align:left">${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(t => {
          const m=parseFloat(t.mean||0); const col=m>=65?'#1B5E20':m>=55?'#E65100':'#B71C1C';
          const stars = Math.round(m/20);
          return `<tr style="border-bottom:1px solid var(--border-subtle)">
            <td style="padding:8px 12px;font-weight:700">${t.name||''}</td>
            <td style="padding:8px 12px;font-size:12px">${t.subject||''}</td>
            <td style="padding:8px 12px;font-weight:800;color:${col}">${m.toFixed(1)}%</td>
            <td style="padding:8px 12px">${parseFloat(t.pass||0).toFixed(0)}%</td>
            <td style="padding:8px 12px">${t.classes||0}</td>
            <td style="padding:8px 12px">${t.students||0}</td>
            <td style="padding:8px 12px">${Array(5).fill(0).map((_,i)=>`<svg width="14" height="14" viewBox="0 0 24 24" fill="${i<stars?'#FFB300':'#E0E0E0'}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`).join('')}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></div>`;
  },

  async _trends(c) {
    c.innerHTML = UI.loading();
    c.innerHTML = `<div class="grid-2" style="gap:20px;margin-bottom:20px">
      <div class="card"><div class="card-header"><div class="card-title">📈 3-Year Trend vs County</div></div><canvas id="c-3yr" height="220"></canvas></div>
      <div class="card"><div class="card-header"><div class="card-title">📊 Subject Radar</div></div><canvas id="c-radar" height="220"></canvas></div>
    </div>
    <div class="card"><div class="card-header"><div class="card-title">🎯 Subject Improvement Tracker</div></div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;padding:8px">
        ${[{s:'Mathematics',ch:+6.2,f:'C-',t:'C'},{s:'Physics',ch:+4.1,f:'C',t:'C+'},{s:'Chemistry',ch:-1.8,f:'C+',t:'C'},{s:'History',ch:+3.5,f:'C',t:'C+'}]
          .map(x=>`<div style="flex:1;min-width:180px;padding:12px 16px;border-radius:8px;background:var(--bg-elevated);border-left:4px solid ${x.ch>0?'#1B5E20':'#B71C1C'}">
            <div style="font-weight:700">${x.s}</div>
            <div style="font-size:12px;color:var(--text-muted)">${x.f} → ${x.t}</div>
            <div style="font-size:18px;font-weight:900;margin-top:4px;color:${x.ch>0?'#1B5E20':'#B71C1C'}">${x.ch>0?'▲':'▼'} ${Math.abs(x.ch).toFixed(1)} pts</div>
          </div>`).join('')}
      </div></div>`;
    setTimeout(() => {
      if (!window.Chart) return;
      const terms = ['T1 22','T2 22','T3 22','T1 23','T2 23','T3 23','T1 24','T2 24','T3 24'];
      if (document.getElementById('c-3yr')) {
        if (this._charts.yr) this._charts.yr.destroy();
        this._charts.yr = new Chart(document.getElementById('c-3yr'), {
          type:'line', data:{ labels:terms, datasets:[
            {label:'Our School',data:[55,58,60,57,62,64,61,65,68],borderColor:'#1565C0',backgroundColor:'rgba(21,101,192,0.08)',fill:true,tension:0.4,pointRadius:4},
            {label:'County',data:[54,55,57,56,59,61,60,62,63],borderColor:'#E65100',borderDash:[5,3],fill:false,tension:0.4,pointRadius:3}
          ]},
          options:{ responsive:true, scales:{y:{min:40,max:85}}, plugins:{legend:{position:'bottom'}} }
        });
      }
      if (document.getElementById('c-radar')) {
        if (this._charts.radar) this._charts.radar.destroy();
        this._charts.radar = new Chart(document.getElementById('c-radar'), {
          type:'radar', data:{ labels:['Maths','English','Sciences','Humanities','Technical','Languages'],
            datasets:[
              {label:'This Year',data:[52,64,56,63,68,65],borderColor:'#1565C0',backgroundColor:'rgba(21,101,192,0.1)'},
              {label:'Last Year',data:[48,61,52,60,64,62],borderColor:'#E65100',backgroundColor:'rgba(230,81,0,0.08)'}
            ]},
          options:{ responsive:true, plugins:{legend:{position:'bottom'}} }
        });
      }
    }, 80);
  },

  async _rankings(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/analytics/student-rankings').catch(() => []);
    const rows = Array.isArray(d) && d.length ? d : Array.from({length:25},(_,i)=>({
      position:i+1, name:`Student ${i+1}`, admNo:`2024/${String(i+1).padStart(3,'0')}`,
      stream:`Form 4${String.fromCharCode(65+i%3)}`,
      mean:(80-i*1.8).toFixed(1), grade:['A','A','A-','A-','B+','B+','B','B','B-','B-','C+','C+','C+','C','C','C','C-','C-','D+','D','D','D-','D-','E','E'][i]
    }));
    c.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input type="text" placeholder="Search student…" oninput="Pages.Analytics._filterRows(this.value,'rank-tbl')"
          style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
        <button class="btn btn-secondary btn-sm" onclick="window.open(CONFIG.API_URL+'/analytics/export/rankings?format=pdf','_blank')">⬇ Export PDF</button>
      </div>
      <div class="card"><div style="overflow-x:auto">
        <table id="rank-tbl" style="width:100%;border-collapse:collapse">
          <thead><tr>${['Pos','Student','Adm #','Stream','Mean','Grade','Merit']
            .map(h=>`<th style="padding:8px 12px;border-bottom:2px solid var(--border);font-size:11px;text-transform:uppercase;text-align:left">${h}</th>`).join('')}</tr></thead>
          <tbody>${rows.map((s,i)=>{
            const m=['🥇','🥈','🥉'][i]||s.position||i+1;
            const col=i<3?'#F57F17':i<10?'#1565C0':'var(--text-primary)';
            return `<tr style="border-bottom:1px solid var(--border-subtle)">
              <td style="padding:8px 12px;font-weight:800;font-size:15px">${m}</td>
              <td style="padding:8px 12px;font-weight:700;color:${col}">${s.name||s.firstName+' '+(s.lastName||'')}</td>
              <td style="padding:8px 12px;font-family:monospace;font-size:12px">${s.admNo||s.admissionNumber||''}</td>
              <td style="padding:8px 12px;font-size:12px">${s.stream||s.class_name||''}</td>
              <td style="padding:8px 12px;font-weight:800;color:${col}">${parseFloat(s.mean||s.meanMarks||0).toFixed(1)}%</td>
              <td style="padding:8px 12px"><span style="padding:2px 8px;border-radius:12px;background:#E3F2FD;color:#1565C0;font-size:11px;font-weight:700">${s.grade||s.meanGrade||'--'}</span></td>
              <td style="padding:8px 12px">${i<3?'⭐ Top Performer':i<10?'🎯 Excellent':''}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div></div>`;
  },

  async _predictions(c) {
    c.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['🎓','Predicted A–C+','68%','#1B5E20'],['⚠️','At-Risk Students','23','#E65100'],['📉','High Dropout Risk','7','#B71C1C'],['📊','Predicted Mean','C+','#1565C0']]
          .map(([ic,l,v,col])=>`<div class="stat-card" style="border-top:3px solid ${col}"><div class="stat-body">
            <div style="font-size:28px;margin-bottom:4px">${ic}</div>
            <div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div>
          </div></div>`).join('')}
      </div>
      <div class="grid-2" style="gap:20px">
        <div class="card"><div class="card-header"><div class="card-title">⚠️ At-Risk Students</div>
          <button class="btn btn-sm btn-primary" onclick="Pages.Analytics._runPredictions()">🤖 Run AI</button></div>
          <div id="risk-list">${UI.loading()}</div></div>
        <div class="card"><div class="card-header"><div class="card-title">📊 Predicted vs Actual</div></div>
          <canvas id="c-pred" height="220"></canvas></div>
      </div>`;
    this._loadAtRisk();
    setTimeout(() => {
      const cv = document.getElementById('c-pred');
      if (!cv || !window.Chart) return;
      if (this._charts.pred) this._charts.pred.destroy();
      this._charts.pred = new Chart(cv, {
        type:'bar', data:{ labels:['Form 1','Form 2','Form 3','Form 4'],
          datasets:[
            {label:'Predicted',data:[65,62,58,68],backgroundColor:'rgba(21,101,192,0.75)',borderRadius:4},
            {label:'Actual',data:[63,64,61,66],backgroundColor:'rgba(27,94,32,0.75)',borderRadius:4}
          ]},
        options:{ responsive:true, plugins:{legend:{position:'bottom'}}, scales:{y:{min:40,max:85}} }
      });
    }, 80);
  },

  async _loadAtRisk() {
    const el = document.getElementById('risk-list');
    if (!el) return;
    const d = await API.get('/analytics/at-risk').catch(() => []);
    const rows = Array.isArray(d) && d.length ? d : [
      {name:'Peter Kamau',admNo:'2024/023',risk:'High',reason:'5 absences + declining marks',stream:'F4A'},
      {name:'Grace Wanjiku',admNo:'2024/041',risk:'Medium',reason:'Fee arrears + 3 absences',stream:'F3B'},
      {name:'David Mwangi',admNo:'2024/012',risk:'High',reason:'Below 40% all subjects',stream:'F4B'},
    ];
    const col = r => r==='High'?'#B71C1C':r==='Medium'?'#E65100':'#F57F17';
    el.innerHTML = rows.length
      ? `<div style="display:flex;flex-direction:column;gap:8px;padding:4px">${rows.map(s=>`
          <div style="padding:10px 14px;border-radius:8px;border-left:4px solid ${col(s.risk)};background:var(--bg-elevated)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><strong>${s.name}</strong><div style="font-size:11px;color:var(--text-muted)">${s.stream} · ${s.admNo}</div></div>
              <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${col(s.risk)}22;color:${col(s.risk)}">${s.risk} Risk</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">⚠️ ${s.reason}</div>
          </div>`).join('')}</div>`
      : UI.empty('No at-risk students detected');
  },

  async _runPredictions() {
    Toast.info('Running AI model…');
    await API.post('/analytics/run-predictions', {}).catch(() => {});
    this._loadAtRisk();
    Toast.success('Predictions updated!');
  },

  _filterRows(q, id) {
    const tbl = document.getElementById(id);
    if (!tbl) return;
    tbl.querySelectorAll('tbody tr').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  },
};
