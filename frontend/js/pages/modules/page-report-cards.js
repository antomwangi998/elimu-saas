'use strict';
if (typeof Pages !== 'undefined') {
Pages.ReportCards = {
  _series: [], _classes: [],

  async load() {
    const area = document.getElementById('page-report-cards');
    if (!area) return;
    const [seriesData, classData] = await Promise.all([
      API.get('/exams/series').then(d => d?.data||d||[]).catch(()=>[]),
      API.get('/academics/classes').then(d => Array.isArray(d)?d:(d?.data||[])).catch(()=>[]),
    ]);
    this._series  = seriesData;
    this._classes = classData;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">📋 Report Cards</h2>
          <p class="page-subtitle">Generate, preview and print student report cards</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Pages.ReportCards.bulkPrint()">🖨️ Bulk Print</button>
        </div>
      </div>

      <!-- Generator Card -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>⚙️ Generate Report Card</h3></div>
        <div style="padding:20px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Exam Series *</label>
              <select id="rc-series" class="form-control">
                <option value="">Select series</option>
                ${seriesData.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Class *</label>
              <select id="rc-class" class="form-control">
                <option value="">Select class</option>
                ${classData.map(cl=>`<option value="${cl.id}">${cl.name} ${cl.stream||''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Student (optional)</label>
              <select id="rc-student" class="form-control">
                <option value="">All students in class</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="Pages.ReportCards.generate()">📋 Generate & Preview</button>
            <button class="btn btn-secondary" onclick="Pages.ReportCards.bulkPrint()">🖨️ Print All for Class</button>
          </div>
        </div>
      </div>

      <!-- Recent report cards -->
      <div class="card">
        <div class="card-header"><h3>📂 Generated Report Cards</h3></div>
        <div style="padding:20px;color:var(--text-muted);text-align:center">
          Select an exam series and class above to generate report cards.
        </div>
      </div>`;

    // Load students when class changes
    document.getElementById('rc-class')?.addEventListener('change', async function() {
      const sel = document.getElementById('rc-student');
      if (!this.value || !sel) return;
      const students = await API.get('/students', { classId: this.value, limit: 100 });
      const list = students?.data || [];
      sel.innerHTML = '<option value="">All students in class</option>' +
        list.map(s=>`<option value="${s.id}">${s.first_name} ${s.last_name} (${s.admission_number})</option>`).join('');
    });
  },

  async generate() {
    const seriesId = document.getElementById('rc-series')?.value;
    const classId  = document.getElementById('rc-class')?.value;
    const studentId= document.getElementById('rc-student')?.value;
    if (!seriesId) { Toast.error('Select an exam series'); return; }
    if (!classId && !studentId) { Toast.error('Select a class or student'); return; }

    if (studentId) {
      await this.printOne(seriesId, studentId);
    } else {
      // Get all students in class
      const data = await API.get('/students', { classId, limit: 100 });
      const students = data?.data || [];
      if (!students.length) { Toast.error('No students found in this class'); return; }
      Toast.info(`Generating ${students.length} report cards...`);
      // Print first student as preview
      await this.printOne(seriesId, students[0].id);
    }
  },

  async printOne(seriesId, studentId) {
    const [rc, school] = await Promise.all([
      API.get(`/exams/report-card/${studentId}`, { id: seriesId }),
      API.get('/schools/my').catch(()=>({})),
    ]);
    if (rc?.error) { Toast.error(rc.error); return; }
    const html = this.buildReportCardHTML(rc, school||{});
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); }
    else Toast.info('Allow popups to view report card');
  },

  async bulkPrint() {
    const seriesId = document.getElementById('rc-series')?.value;
    const classId  = document.getElementById('rc-class')?.value;
    if (!seriesId || !classId) { Toast.error('Select series and class first'); return; }
    const data = await API.get('/students', { classId, limit: 100 });
    const students = data?.data || [];
    if (!students.length) { Toast.error('No students in class'); return; }
    Toast.info(`Opening ${students.length} report cards for printing...`);
    const school = await API.get('/schools/my').catch(()=>({}));
    const allRC = await Promise.all(students.map(s => API.get(`/exams/report-card/${s.id}`, { id: seriesId }).catch(()=>null)));
    const allHTML = allRC.filter(Boolean).map(rc => this.buildReportCardHTML(rc, school||{})).join('<div style="page-break-after:always"></div>');
    const w = window.open('', '_blank');
    if (w) {
      w.document.write('<!DOCTYPE html><html><head><title>Report Cards</title><style>@media print{.no-print{display:none}}</style></head><body>' + allHTML + '</body></html>');
      w.document.close();
      setTimeout(()=>w.print(), 800);
    }
  },

  buildReportCardHTML(rc, school) {
    const s  = rc.student || {};
    const marks = rc.marks || [];
    const att = rc.attendance || {};
    const trends = rc.trends || [];
    const sc = school || {};
    const attPct = att.total>0 ? Math.round((att.present/att.total)*100) : 0;

    const gradeColor = g => {
      if(!g||g==='—') return '#666';
      if(g.startsWith('A')) return '#1B5E20';
      if(g.startsWith('B')) return '#1565C0';
      if(g.startsWith('C')) return '#E65100';
      return '#B71C1C';
    };

    // Grade bar chart for trends
    const trendBars = trends.length > 1 ? trends.map(t => {
      const pts = parseFloat(t.meanPoints||0);
      const pct = Math.min(100, (pts/12)*100);
      return `<div style="flex:1;text-align:center">
        <div style="height:60px;display:flex;align-items:flex-end;justify-content:center">
          <div style="width:24px;background:${gradeColor(t.grade)};height:${pct}%"></div>
        </div>
        <div style="font-size:8px;color:#666">${t.name?.split(' ')[0]||''}</div>
        <div style="font-size:9px;font-weight:700;color:${gradeColor(t.grade)}">${t.grade}</div>
      </div>`;
    }).join('') : '';

    return `<!DOCTYPE html>
<html><head><title>Report Card — ${s.first_name} ${s.last_name}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;background:white;padding:12px}
  .header{display:grid;grid-template-columns:70px 1fr 70px;gap:10px;align-items:center;padding-bottom:8px;border-bottom:3px double #1565C0;margin-bottom:8px}
  .school-name{text-align:center;font-size:18px;font-weight:900;text-transform:uppercase;color:#1565C0}
  .school-sub{text-align:center;font-size:10px;color:#555;margin-top:2px}
  .report-title{text-align:center;padding:6px;background:#1565C0;color:white;font-size:13px;font-weight:700;margin-bottom:10px;letter-spacing:0.5px}
  .student-section{display:grid;grid-template-columns:1fr auto;gap:12px;margin-bottom:10px;padding:10px;background:#F5F5F5;border-radius:6px;border-left:4px solid #1565C0}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px}
  .info-item{font-size:10px}.info-label{color:#777;font-weight:600}.info-val{font-weight:700}
  .student-photo{width:70px;height:80px;background:#E3F2FD;border:2px solid #1565C0;display:flex;align-items:center;justify-content:center;border-radius:4px;font-size:24px;font-weight:700;color:#1565C0}
  table{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:10px}
  th{background:#1565C0;color:white;padding:5px;text-align:center;border:1px solid #0d47a1;font-size:10px}
  th.left{text-align:left}
  td{padding:4px 5px;border:1px solid #ddd;text-align:center}
  td.left{text-align:left}
  tr:nth-child(even){background:#F8F8F8}
  .grade-A{color:#1B5E20;font-weight:900}
  .grade-B{color:#1565C0;font-weight:900}
  .grade-C{color:#E65100;font-weight:900}
  .grade-D,.grade-E{color:#B71C1C;font-weight:900}
  .summary-box{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}
  .sum-card{text-align:center;padding:8px;border:1px solid #ddd;border-radius:6px;background:#F9F9F9}
  .sum-val{font-size:20px;font-weight:900;color:#1565C0}
  .sum-lbl{font-size:9px;color:#777;margin-top:2px}
  .section-title{font-weight:700;font-size:12px;padding:5px;background:#37474F;color:white;margin-bottom:6px}
  .remarks-box{padding:10px;background:#F9F9F9;border:1px solid #ddd;border-radius:6px;font-size:10px;min-height:50px;margin-bottom:10px}
  .sig-row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:16px}
  .sig{border-top:1px solid #333;padding-top:4px;text-align:center;font-size:9px;color:#555}
  .trend-bar{display:flex;gap:4px;height:80px;align-items:flex-end;padding:4px;background:#F5F5F5;border-radius:4px}
  .att-bar{height:10px;border-radius:99px;background:#1B5E20;transition:width 0.4s}
  @page{size:A4 portrait;margin:8mm}
  @media print{button{display:none}}
</style></head><body>

<!-- Header -->
<div class="header">
  <div style="text-align:center">
    ${sc.logo_url ? `<img src="${sc.logo_url}" style="height:60px;object-fit:contain">` : `<div style="width:60px;height:60px;background:#1565C0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:18px">${(sc.name||'S').charAt(0)}</div>`}
  </div>
  <div>
    <div class="school-name">${sc.name||'School Name'}</div>
    <div class="school-sub">${sc.address||''} ${sc.county?'| '+sc.county+' County':''}</div>
    <div class="school-sub">${sc.motto||''}${sc.phone?' | Tel: '+sc.phone:''}</div>
  </div>
  <div style="text-align:center;padding:8px;background:#1565C0;border-radius:6px;color:white">
    <div style="font-size:9px">POSITION</div>
    <div style="font-size:22px;font-weight:900">${rc.position||'—'}</div>
    <div style="font-size:9px">of ${rc.out_of||'—'}</div>
  </div>
</div>

<div class="report-title">STUDENT ACADEMIC PROGRESS REPORT — ${rc.exam_name||''}</div>

<!-- Student Info -->
<div class="student-section">
  <div class="info-grid">
    ${[
      ['Name', `${s.first_name} ${s.last_name}`],
      ['Admission No.', s.admission_number],
      ['Class', s.class_name+' '+(s.stream||'')+' | Form '+s.level],
      ['Year/Term', '2024 Term 3'],
      ['Gender', s.gender==='male'?'Male':'Female'],
      ['Class Teacher', s.class_teacher_name||'—'],
    ].map(([l,v]) => `<div class="info-item"><span class="info-label">${l}: </span><span class="info-val">${v}</span></div>`).join('')}
  </div>
  <div class="student-photo">
    ${s.photo_url ? `<img src="${s.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">` : (s.first_name||'S').charAt(0)+(s.last_name||'T').charAt(0)}
  </div>
</div>

<!-- Summary Stats -->
<div class="summary-box">
  <div class="sum-card">
    <div class="sum-val grade-${(rc.mean_grade||'E').charAt(0)}">${rc.mean_grade||'—'}</div>
    <div class="sum-lbl">Mean Grade</div>
  </div>
  <div class="sum-card">
    <div class="sum-val" style="font-size:16px">${parseFloat(rc.mean_points||0).toFixed(2)}</div>
    <div class="sum-lbl">Mean Points</div>
  </div>
  <div class="sum-card">
    <div class="sum-val" style="font-size:16px">${rc.mean_marks||'—'}</div>
    <div class="sum-lbl">Mean Marks %</div>
  </div>
  <div class="sum-card">
    <div class="sum-val" style="font-size:16px">${attPct}%</div>
    <div class="sum-lbl">Attendance</div>
  </div>
</div>

<!-- Marks Table -->
<div class="section-title">📊 SUBJECT PERFORMANCE</div>
<table>
  <thead>
    <tr>
      <th class="left" style="width:35%">Subject</th>
      <th>CAT</th>
      <th>Exam</th>
      <th>Total</th>
      <th>Grade</th>
      <th>Points</th>
      <th style="width:20%">Remarks</th>
    </tr>
  </thead>
  <tbody>
    ${marks.map((m,i) => {
      const g = m.grade||'—';
      const gc = g.startsWith('A')?'A':g.startsWith('B')?'B':g.startsWith('C')?'C':g.startsWith('D')?'D':'E';
      const mk = m.is_absent ? 'ABS' : (m.marks!==null?parseFloat(m.marks).toFixed(0):'—');
      return `<tr style="background:${i%2===0?'#fff':'#F8F8F8'}">
        <td class="left"><strong>${m.subject_name}</strong></td>
        <td>—</td>
        <td style="font-weight:700">${mk}</td>
        <td style="font-weight:700">${mk}</td>
        <td class="grade-${gc}">${g}</td>
        <td>${m.points||'—'}</td>
        <td style="font-size:9px;text-align:left;color:#555">${m.teacher_remarks||''}</td>
      </tr>`;
    }).join('')}
    <tr style="background:#E8F5E9;font-weight:700">
      <td class="left"><strong>AGGREGATE / MEAN</strong></td>
      <td>—</td>
      <td><strong>${rc.mean_marks||'—'}</strong></td>
      <td><strong>${rc.total_marks||'—'}</strong></td>
      <td class="grade-${(rc.mean_grade||'E').charAt(0)}" style="font-size:13px"><strong>${rc.mean_grade||'—'}</strong></td>
      <td><strong>${parseFloat(rc.mean_points||0).toFixed(2)}</strong></td>
      <td></td>
    </tr>
  </tbody>
</table>

<!-- Trend + Attendance side by side -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
  <div>
    <div class="section-title">📈 PERFORMANCE TREND</div>
    ${trends.length > 1 ?
      `<div style="display:flex;gap:6px;height:80px;padding:6px;background:#F5F5F5;border-radius:4px;align-items:flex-end">
        ${trends.map(t => {
          const pts = parseFloat(t.meanPoints||0);
          const pct = Math.min(100,(pts/12)*100);
          return `<div style="flex:1;text-align:center">
            <div style="height:${pct}%;background:${gradeColor(t.grade)};border-radius:2px 2px 0 0;min-height:4px"></div>
            <div style="font-size:7px;color:#666;margin-top:2px">${(t.name||'—').split(' ')[0]}</div>
            <div style="font-size:8px;font-weight:700;color:${gradeColor(t.grade)}">${t.grade||'—'}</div>
          </div>`;
        }).join('')}
      </div>` :
      `<div style="padding:12px;background:#F5F5F5;border-radius:4px;color:#777;font-size:10px">No trend data available</div>`
    }
  </div>
  <div>
    <div class="section-title">✅ ATTENDANCE RECORD</div>
    <div style="padding:10px;background:#F5F5F5;border-radius:4px">
      ${[['Days Present',att.present||0,'#1B5E20'],['Days Absent',att.absent||0,'#C62828'],['Days Late',att.late||0,'#E65100'],['Total Days',att.total||0,'#1565C0']].map(([l,v,col])=>`
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:10px">${l}</span>
          <span style="font-weight:700;color:${col}">${v}</span>
        </div>`).join('')}
      <div style="margin-top:8px">
        <div style="font-size:9px;margin-bottom:3px">Attendance Rate: <strong>${attPct}%</strong></div>
        <div style="height:10px;background:#ddd;border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${attPct}%;background:${attPct>=80?'#1B5E20':attPct>=60?'#E65100':'#C62828'};border-radius:99px"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Remarks -->
<div class="section-title">💬 TEACHER'S REMARKS</div>
<div class="remarks-box">
  <div style="margin-bottom:10px">
    <strong>Class Teacher's Remarks:</strong>
    <div style="margin-top:4px;border-bottom:1px solid #ccc;padding-bottom:4px">${s.class_teacher_name||'_______'} has ${rc.mean_grade?.startsWith('A')?'performed excellently':rc.mean_grade?.startsWith('B')?'performed well':'shown improvement'} this term. ${attPct<80?'Attendance needs improvement. ':''}<span style="color:#999;font-style:italic">Continue working hard.</span></div>
  </div>
  <div style="margin-bottom:10px">
    <strong>Principal's Comment:</strong>
    <div style="margin-top:4px;border-bottom:1px solid #ccc;min-height:20px;padding-bottom:4px"></div>
  </div>
  <div>
    <strong>Parent/Guardian's Comment:</strong>
    <div style="margin-top:4px;border-bottom:1px solid #ccc;min-height:20px;padding-bottom:4px"></div>
  </div>
</div>

<!-- Signatures -->
<div class="sig-row">
  <div class="sig">Class Teacher<br>${s.class_teacher_name||'_______________'}<br>Sign: _______________</div>
  <div class="sig">Principal: _______________<br>Sign: _______________&nbsp;&nbsp;Date: _______________</div>
  <div class="sig">Parent/Guardian<br>Sign: _______________&nbsp;&nbsp;Date: _______________</div>
</div>

<div style="text-align:center;margin-top:10px;font-size:8px;color:#999;border-top:1px solid #eee;padding-top:6px">
  Generated by ElimuSaaS · ${new Date().toLocaleDateString()} · CONFIDENTIAL
</div>

<div style="text-align:center;margin-top:8px" class="no-print">
  <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:8px 24px;border-radius:6px;cursor:pointer;font-weight:700">🖨️ Print Report Card</button>
  <button onclick="window.close()" style="background:#666;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;margin-left:8px">✕ Close</button>
</div>

</body></html>`;
  },

  downloadAll() { this.bulkPrint(); },
  preview()     { this.generate(); },
};
}
