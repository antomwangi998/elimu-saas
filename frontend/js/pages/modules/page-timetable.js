'use strict';
/* ============================================================
   Timetable Management — Full Implementation
   View, Generate, Edit, Print class timetables
   ============================================================ */
if (typeof Pages !== 'undefined') {
Pages.Timetable = {
  _timetables: [], _periods: [], _classes: [], _selected: null,
  _viewClass: '', _viewTeacher: '',

  async load() {
    const area = document.getElementById('page-timetable');
    if (!area) return;

    area.innerHTML = `<div style="text-align:center;padding:60px"><div class="loading-spinner" style="margin:auto"></div></div>`;

    const [timetables, periods, classes] = await Promise.all([
      API.get('/timetable').catch(() => []),
      API.get('/timetable/periods').catch(() => []),
      API.get('/academics/classes').then(d => Array.isArray(d) ? d : (d?.data || [])).catch(() => []),
    ]);
    this._timetables = Array.isArray(timetables) ? timetables : [];
    this._periods    = Array.isArray(periods) ? periods : [];
    this._classes    = classes;

    // Auto-seed periods if none exist
    if (!this._periods.length) {
      await API.post('/timetable/periods/seed', {});
      const p2 = await API.get('/timetable/periods').catch(() => []);
      this._periods = Array.isArray(p2) ? p2 : [];
    }

    this.render(area);
  },

  render(area) {
    const hasTimetables = this._timetables.length > 0;
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">📅 Timetable</h2>
          <p class="page-subtitle">Class schedules, periods and teaching assignments</p>
        </div>
        <div class="page-header-actions">
          ${hasTimetables ? `<button class="btn btn-secondary" onclick="Pages.Timetable.printTimetable()">🖨️ Print</button>` : ''}
          <button class="btn btn-primary" onclick="Pages.Timetable.openGenerate()">⚡ Generate Timetable</button>
        </div>
      </div>

      ${!hasTimetables ? `
        <div style="text-align:center;padding:60px 20px;background:white;border-radius:16px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
          <div style="font-size:60px;margin-bottom:16px">📅</div>
          <h3 style="margin:0 0 10px">No Timetable Yet</h3>
          <p style="color:var(--text-muted);margin:0 0 24px">Generate an automated conflict-free timetable for your school</p>
          <button class="btn btn-primary" style="padding:12px 32px" onclick="Pages.Timetable.openGenerate()">⚡ Generate Now</button>
        </div>` : `
        <!-- Timetable Selector + Filters -->
        <div class="card" style="padding:16px;margin-bottom:16px">
          <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
            <div class="form-group" style="flex:1;min-width:180px;margin:0">
              <label class="form-label">Timetable Version</label>
              <select id="tt-select" class="form-control" onchange="Pages.Timetable.selectTimetable(this.value)">
                ${this._timetables.map(t => `<option value="${t.id}" ${this._selected===t.id?'selected':''}>${t.name} ${t.is_published?'(Active)':''}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="flex:1;min-width:160px;margin:0">
              <label class="form-label">View by Class</label>
              <select id="tt-class" class="form-control" onchange="Pages.Timetable._viewClass=this.value;Pages.Timetable.loadGrid()">
                <option value="">All Classes</option>
                ${this._classes.map(cl => `<option value="${cl.id}">${cl.name} ${cl.stream||''}</option>`).join('')}
              </select>
            </div>
            <button class="btn btn-secondary" onclick="Pages.Timetable.loadGrid()">🔄 Load</button>
            <button class="btn btn-secondary" onclick="Pages.Timetable.publishTimetable()">📤 Publish</button>
          </div>
        </div>

        <!-- Grid -->
        <div id="tt-grid-area">
          <div style="text-align:center;padding:40px;color:var(--text-muted)">Select a class and click Load to view the timetable</div>
        </div>`}`;

    if (hasTimetables && !this._selected) {
      this._selected = this._timetables[0]?.id;
      this.loadGrid();
    }
  },

  async loadGrid() {
    const ttId = document.getElementById('tt-select')?.value || this._selected;
    if (!ttId) return;
    this._selected = ttId;
    const classId  = document.getElementById('tt-class')?.value || '';
    const area     = document.getElementById('tt-grid-area');
    if (!area) return;
    area.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;

    const data = await API.get(`/timetable/grid?id=${ttId}${classId?'&classId='+classId:''}`).catch(()=>({}));
    if (data.error || !data.timetable) {
      area.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
        <div style="font-size:40px;margin-bottom:12px">📅</div>
        <p>No timetable data. ${data.error||'Select a class and click Load.'}</p>
      </div>`;
      return;
    }

    const slots   = data.slots || [];
    const periods = this._periods.filter(p => !p.is_break);
    const DAYS    = ['monday','tuesday','wednesday','thursday','friday'];
    const DAY_LABELS = {monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri'};

    // Group slots: slotMap[classId][day][periodId] = slot
    const slotMap = {};
    slots.forEach(s => {
      if (!slotMap[s.class_id]) slotMap[s.class_id] = {};
      if (!slotMap[s.class_id][s.day]) slotMap[s.class_id][s.day] = {};
      slotMap[s.class_id][s.day][s.period_id] = s;
    });

    // Get unique classes in this timetable
    const classIds = [...new Set(slots.map(s => s.class_id))];
    const classMeta = {};
    slots.forEach(s => { classMeta[s.class_id] = {name:s.class_name, level:s.level, stream:s.stream}; });
    const displayClasses = classId ? [classId] : classIds;

    if (!displayClasses.length) {
      area.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">No timetable slots found. Try generating the timetable again.</div>`;
      return;
    }

    const subjectColors = ['#1565C0','#2E7D32','#6A1B9A','#E65100','#B71C1C','#00695C','#37474F','#558B2F','#AD1457','#0277BD'];
    const subjectColorMap = {};
    let colorIdx = 0;

    const getCellColor = (subjectName) => {
      if (!subjectName) return '#F5F5F5';
      if (!subjectColorMap[subjectName]) subjectColorMap[subjectName] = subjectColors[colorIdx++ % subjectColors.length];
      return subjectColorMap[subjectName];
    };

    let html = `<div style="overflow-x:auto">`;

    displayClasses.forEach(cid => {
      const cm = classMeta[cid] || {};
      html += `
        <div style="margin-bottom:24px">
          <div style="font-weight:800;font-size:15px;margin-bottom:8px;padding:8px 12px;background:linear-gradient(135deg,#1565C0,#1976D2);color:white;border-radius:8px">
            📚 ${cm.name||'Class'} ${cm.stream||''} — Timetable
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:600px">
            <thead>
              <tr style="background:#F5F5F5">
                <th style="padding:8px 10px;border:1px solid #E0E0E0;text-align:left;white-space:nowrap;font-size:11px;color:#666;width:80px">Period</th>
                ${DAYS.map(d=>`<th style="padding:8px 10px;border:1px solid #E0E0E0;text-align:center;font-weight:700;color:#1565C0">${DAY_LABELS[d]}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${periods.map(p => {
                const row = `<tr>
                  <td style="padding:6px 10px;border:1px solid #E0E0E0;background:#FAFAFA;white-space:nowrap">
                    <div style="font-weight:700;font-size:11px">${p.name}</div>
                    <div style="font-size:10px;color:#999">${p.start_time}–${p.end_time}</div>
                  </td>
                  ${DAYS.map(day => {
                    const slot = slotMap[cid]?.[day]?.[p.id];
                    if (!slot || slot.is_free_period) {
                      return `<td style="padding:6px;border:1px solid #E0E0E0;text-align:center;color:#ccc;font-size:11px">—</td>`;
                    }
                    const color = getCellColor(slot.subject_name);
                    return `<td style="padding:4px;border:1px solid #E0E0E0">
                      <div style="background:${color}15;border-left:3px solid ${color};border-radius:4px;padding:5px 8px;cursor:pointer" title="${slot.teacher_name||''}">
                        <div style="font-weight:700;font-size:11px;color:${color}">${slot.subject_code||slot.subject_name?.slice(0,6)||'—'}</div>
                        <div style="font-size:10px;color:#666;margin-top:1px">${(slot.teacher_name||'').split(' ').map((n,i)=>i===0?n.charAt(0)+'.':n).join(' ')||'—'}</div>
                        ${slot.room?`<div style="font-size:9px;color:#999">🚪${slot.room}</div>`:''}
                      </div>
                    </td>`;
                  }).join('')}
                </tr>`;
                return row;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    });

    html += `</div>`;

    // Subject legend
    const legendEntries = Object.entries(subjectColorMap);
    if (legendEntries.length) {
      html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding:12px;background:var(--bg-elevated);border-radius:8px">
        <span style="font-size:11px;font-weight:700;color:var(--text-muted);width:100%">SUBJECT LEGEND</span>
        ${legendEntries.map(([name,color])=>`
          <div style="display:flex;align-items:center;gap:4px">
            <div style="width:12px;height:12px;border-radius:3px;background:${color}"></div>
            <span style="font-size:11px">${name}</span>
          </div>`).join('')}
      </div>`;
    }

    area.innerHTML = html;
  },

  openGenerate() {
    const classes = this._classes;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="tt-gen-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:560px">
          <div class="modal-header" style="background:var(--brand);color:white">
            <h3 style="color:white;margin:0">⚡ Generate Timetable</h3>
            <button onclick="document.getElementById('tt-gen-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
            <div class="form-group" style="margin:0"><label class="form-label">Timetable Name *</label>
              <input id="tt-gen-name" class="form-control" value="Term 3 2024 Timetable" placeholder="e.g. Term 1 2025 Timetable"></div>
            <div style="background:var(--bg-elevated);padding:14px;border-radius:10px">
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px">Include Classes</div>
              <label style="display:flex;align-items:center;gap:6px;margin-bottom:8px;cursor:pointer;font-size:13px">
                <input type="checkbox" id="tt-all-classes" checked onchange="document.querySelectorAll('.tt-class-chk').forEach(c=>c.checked=this.checked)"> All Classes (Recommended)
              </label>
              <div style="max-height:160px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:4px">
                ${classes.map(cl=>`<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;padding:4px">
                  <input type="checkbox" class="tt-class-chk" value="${cl.id}" checked> ${cl.name} ${cl.stream||''}
                </label>`).join('')}
              </div>
            </div>
            <div style="background:#FFF9C4;border-radius:8px;padding:12px;font-size:12px;color:#555">
              <strong>⚡ Auto-generate</strong> creates a conflict-free timetable where:<br>
              • No teacher teaches two classes simultaneously<br>
              • Subjects spread across the week (no stacking)<br>
              • Breaks are respected automatically
            </div>
          </div>
          <div class="modal-footer" style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="document.getElementById('tt-gen-modal').remove()">Cancel</button>
            <button class="btn btn-primary" id="tt-gen-btn" onclick="Pages.Timetable.generate()">⚡ Generate Now</button>
          </div>
        </div>
      </div>`);
  },

  async generate() {
    const name = document.getElementById('tt-gen-name')?.value?.trim();
    if (!name) { Toast.error('Enter a timetable name'); return; }
    const classIds = [...document.querySelectorAll('.tt-class-chk:checked')].map(c=>c.value);
    const btn = document.getElementById('tt-gen-btn');
    if (btn) { btn.disabled=true; btn.textContent='Generating...'; }
    Toast.info('Generating conflict-free timetable...');

    const r = await API.post('/timetable/generate', { name, classIds: classIds.length ? classIds : undefined });
    if (r?.timetableId || r?.id || r?.message) {
      Toast.success('✅ Timetable generated successfully!');
      document.getElementById('tt-gen-modal')?.remove();
      await this.load();
    } else {
      Toast.error(r?.error || 'Generation failed. Make sure subjects are assigned to all classes first.');
      if (btn) { btn.disabled=false; btn.textContent='⚡ Generate Now'; }
    }
  },

  async publishTimetable() {
    const ttId = document.getElementById('tt-select')?.value || this._selected;
    if (!ttId) { Toast.error('Select a timetable first'); return; }
    const r = await API.post('/timetable/publish', { timetableId: ttId });
    if (r?.message || !r?.error) Toast.success('Timetable published and active!');
    else Toast.error(r?.error || 'Failed to publish');
  },

  printTimetable() {
    const ttId = document.getElementById('tt-select')?.value || this._selected;
    if (!ttId) { Toast.error('No timetable selected'); return; }
    const classId = document.getElementById('tt-class')?.value;
    const grid = document.getElementById('tt-grid-area');
    if (!grid || !grid.innerHTML.includes('<table')) {
      Toast.error('Load the timetable first'); return;
    }
    const w = window.open('', '_blank');
    if (!w) { Toast.info('Allow popups to print'); return; }
    const school = AppState.school || {};
    w.document.write(`<!DOCTYPE html><html><head><title>Timetable</title>
      <style>
        body{font-family:Arial,sans-serif;padding:16px;color:#111}
        table{border-collapse:collapse;width:100%;font-size:11px}
        th,td{border:1px solid #ddd;padding:5px 8px}
        th{background:#1565C0;color:white}
        h2{text-align:center;margin:0 0 4px}
        .header{text-align:center;margin-bottom:16px}
        @media print{button{display:none}}
      </style></head><body>
      <div class="header">
        <h2>${school.name||'School'}</h2>
        <div style="font-size:12px;color:#666">${school.address||''} | ${school.phone||''}</div>
        <div style="font-weight:700;margin-top:4px">SCHOOL TIMETABLE — ${new Date().getFullYear()}</div>
      </div>
      ${grid.innerHTML}
      <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-top:16px">🖨️ Print</button>
    </body></html>`);
    w.document.close();
  },

  async selectTimetable(id) {
    this._selected = id;
    await this.loadGrid();
  },
};
}
