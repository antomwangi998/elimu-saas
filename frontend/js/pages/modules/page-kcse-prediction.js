'use strict';
// ============================================================
// KCSE Prediction — Based on mock exam trend analysis
// ============================================================
if (typeof Pages !== 'undefined') {
Pages.KCSEPrediction = {
  async load() {
    const area = document.getElementById('page-kcse-prediction');
    if (!area) return;
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">🎯 KCSE Prediction</h2>
          <p class="page-subtitle">Predict final KCSE grades from mock exam trends</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Pages.KCSEPrediction.exportReport()">⬇️ Export Report</button>
        </div>
      </div>

      <!-- Configuration -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>⚙️ Prediction Settings</h3></div>
        <div style="padding:20px;display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:14px;align-items:end">
          <div class="form-group" style="margin:0">
            <label class="form-label">Class</label>
            <select class="form-control" id="kcse-class-select">
              <option value="">Select Form 4 class</option>
            </select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Exam Series (Mock 1)</label>
            <select class="form-control" id="kcse-mock1-select"><option value="">Select</option></select>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Exam Series (Mock 2 / Latest)</label>
            <select class="form-control" id="kcse-mock2-select"><option value="">Select</option></select>
          </div>
          <button class="btn btn-primary" onclick="Pages.KCSEPrediction.runPrediction()">🔮 Predict</button>
        </div>
      </div>

      <div id="kcse-results"></div>
    `;
    this._loadSelectors();
  },

  async _loadSelectors() {
    const [classes, series] = await Promise.all([
      API.get('/academics/classes').catch(()=>[]),
      API.get('/academics/exam-series').catch(()=>[]),
    ]);
    const classList = Array.isArray(classes) ? classes : (classes.data || []);
    const seriesList = Array.isArray(series) ? series : (series.data || []);
    const form4 = classList.filter(c => parseInt(c.level) === 4 || (c.name||'').toLowerCase().includes('form 4'));

    const clSel = document.getElementById('kcse-class-select');
    if (clSel) clSel.innerHTML = '<option value="">All Form 4 classes</option>' +
      form4.map(c => `<option value="${c.id}">${c.name} ${c.stream||''}</option>`).join('');

    const opts = seriesList.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    const m1 = document.getElementById('kcse-mock1-select');
    const m2 = document.getElementById('kcse-mock2-select');
    if (m1) m1.innerHTML = '<option value="">Select series</option>' + opts;
    if (m2) m2.innerHTML = '<option value="">Select series</option>' + opts;
  },

  async runPrediction() {
    const classId = document.getElementById('kcse-class-select')?.value;
    const mock1Id = document.getElementById('kcse-mock1-select')?.value;
    const mock2Id = document.getElementById('kcse-mock2-select')?.value;

    if (!mock1Id || !mock2Id) { Toast.error('Please select at least two exam series to trend.'); return; }

    const res = document.getElementById('kcse-results');
    if (res) res.innerHTML = `<div style="text-align:center;padding:60px"><div class="loading-spinner" style="margin:auto"></div><p style="color:var(--text-muted);margin-top:16px">Analysing trends...</p></div>`;

    const params = `?mock1=${mock1Id}&mock2=${mock2Id}${classId ? '&classId=' + classId : ''}`;
    const data = await API.get('/analytics/kcse-prediction' + params).catch(() => null);

    if (!data || data.error) {
      // Fallback: compute locally from broadsheet data
      this._localPrediction(mock1Id, mock2Id, classId);
      return;
    }
    this._renderResults(data.students || data.predictions || []);
  },

  async _localPrediction(mock1Id, mock2Id, classId) {
    const [r1, r2] = await Promise.all([
      API.get('/exams/broadsheet?seriesId=' + mock1Id + (classId ? '&classId=' + classId : '')).catch(()=>null),
      API.get('/exams/broadsheet?seriesId=' + mock2Id + (classId ? '&classId=' + classId : '')).catch(()=>null),
    ]);

    const res = document.getElementById('kcse-results');
    if (!r1 || !r2 || r1.error || r2.error) {
      if (res) res.innerHTML = `<div class="alert alert-danger">Could not load exam data for prediction. Make sure marks are entered for both series.</div>`;
      return;
    }

    const s1Map = {};
    (r1.students || r1.data || []).forEach(s => { s1Map[s.id || s.student_id] = s.mean || s.average || 0; });

    const students = (r2.students || r2.data || []).map(s => {
      const prev = s1Map[s.id || s.student_id] || (s.mean || s.average || 0);
      const curr = s.mean || s.average || 0;
      const trend = curr - prev;
      const predicted = Math.min(100, Math.max(0, curr + (trend * 0.6))); // 60% weight to trend
      return {
        name: s.name || s.student_name,
        admission_number: s.admission_number,
        class_name: s.class_name || s.class,
        mock1: prev.toFixed(1),
        mock2: curr.toFixed(1),
        trend: trend,
        predicted: predicted.toFixed(1),
        grade: this._gradeFromScore(predicted),
      };
    }).sort((a, b) => parseFloat(b.predicted) - parseFloat(a.predicted));

    this._renderResults(students);
  },

  _gradeFromScore(score) {
    if (score >= 80) return { grade: 'A', color: 'var(--green)' };
    if (score >= 75) return { grade: 'A-', color: 'var(--green)' };
    if (score >= 70) return { grade: 'B+', color: 'var(--cyan)' };
    if (score >= 65) return { grade: 'B', color: 'var(--cyan)' };
    if (score >= 60) return { grade: 'B-', color: 'var(--brand)' };
    if (score >= 55) return { grade: 'C+', color: 'var(--brand)' };
    if (score >= 50) return { grade: 'C', color: 'var(--amber)' };
    if (score >= 45) return { grade: 'C-', color: 'var(--amber)' };
    if (score >= 40) return { grade: 'D+', color: 'var(--orange)' };
    if (score >= 35) return { grade: 'D', color: 'var(--orange)' };
    if (score >= 30) return { grade: 'D-', color: 'var(--red)' };
    return { grade: 'E', color: 'var(--red)' };
  },

  _renderResults(students) {
    const res = document.getElementById('kcse-results');
    if (!res) return;
    if (!students.length) {
      res.innerHTML = `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No data found</div><div class="empty-desc">Make sure marks are entered for both selected exam series.</div></div>`;
      return;
    }

    // Summary stats
    const gradeGroups = {};
    students.forEach(s => {
      const g = (s.grade?.grade || s.grade || '?');
      gradeGroups[g] = (gradeGroups[g] || 0) + 1;
    });
    const improving = students.filter(s => parseFloat(s.trend) > 0).length;
    const declining = students.filter(s => parseFloat(s.trend) < 0).length;

    res.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon">👨‍🎓</div><div class="stat-body"><div class="stat-value">${students.length}</div><div class="stat-label">Students Analysed</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)">
          <div class="stat-icon">📈</div><div class="stat-body"><div class="stat-value">${improving}</div><div class="stat-label">Improving</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)">
          <div class="stat-icon">📉</div><div class="stat-body"><div class="stat-value">${declining}</div><div class="stat-label">Declining</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)">
          <div class="stat-icon">🎯</div><div class="stat-body">
            <div class="stat-value">${(students.reduce((s,x)=>s+parseFloat(x.predicted||x.mock2||0),0)/students.length).toFixed(1)}%</div>
            <div class="stat-label">Avg Predicted Score</div>
          </div>
        </div>
      </div>

      <!-- At-risk students alert -->
      ${students.filter(s => parseFloat(s.trend) < -5).length > 0 ? `
        <div class="alert alert-danger" style="margin-bottom:20px">
          ⚠️ <strong>${students.filter(s => parseFloat(s.trend) < -5).length} students</strong> are showing a significant downward trend (>5 points). Consider targeted intervention.
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <h3>📊 Individual Predictions</h3>
          <div style="display:flex;gap:8px">
            <input type="text" class="form-control" placeholder="Search student..." style="width:200px"
              oninput="Pages.KCSEPrediction._filterTable(this.value)">
          </div>
        </div>
        <div style="overflow-x:auto">
          <table id="kcse-table">
            <thead><tr><th>#</th><th>Student</th><th>Class</th><th>Mock 1</th><th>Mock 2</th><th>Trend</th><th>Predicted</th><th>Predicted Grade</th></tr></thead>
            <tbody>
              ${students.map((s, i) => {
                const gradeObj = s.grade?.grade ? s.grade : this._gradeFromScore(parseFloat(s.predicted||s.mock2||0));
                const trend = parseFloat(s.trend || 0);
                return `<tr>
                  <td style="color:var(--text-muted)">${i+1}</td>
                  <td><strong>${s.name || s.student_name}</strong><br><span style="font-size:11px;color:var(--text-muted)">${s.admission_number||''}</span></td>
                  <td>${s.class_name||'—'}</td>
                  <td>${s.mock1||'—'}</td>
                  <td>${s.mock2||'—'}</td>
                  <td style="color:${trend>0?'var(--green)':trend<0?'var(--red)':'var(--text-muted)'}">
                    ${trend > 0 ? '▲' : trend < 0 ? '▼' : '→'} ${Math.abs(trend).toFixed(1)}
                  </td>
                  <td style="font-weight:700">${s.predicted||'—'}%</td>
                  <td><span style="font-weight:700;color:${gradeObj.color}">${gradeObj.grade}</span></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _filterTable(q) {
    const rows = document.querySelectorAll('#kcse-table tbody tr');
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
    });
  },

  exportReport() {
    const rows = document.querySelectorAll('#kcse-table tbody tr');
    if (!rows.length) { Toast.info('Run a prediction first before exporting.'); return; }
    const csvRows = [['#','Student','Class','Mock 1','Mock 2','Trend','Predicted Score','Predicted Grade']];
    rows.forEach((row, i) => {
      const cells = row.querySelectorAll('td');
      csvRows.push([i+1, cells[1]?.textContent?.trim(), cells[2]?.textContent, cells[3]?.textContent, cells[4]?.textContent, cells[5]?.textContent?.trim(), cells[6]?.textContent, cells[7]?.textContent?.trim()]);
    });
    const csv = csvRows.map(r => r.map(v => `"${(v||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'kcse-prediction.csv'; a.click();
    URL.revokeObjectURL(url);
  },
};
Router.define?.('kcse-prediction', { title: 'KCSE Prediction', onEnter: () => Pages.KCSEPrediction.load() });
}
