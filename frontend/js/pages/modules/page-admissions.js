
'use strict';
if(typeof Pages!=='undefined'){
Pages.Admissions={
  _stage:'all',
  async load(){
    const area=document.getElementById('page-admissions');
    if(!area)return;
    area.innerHTML=`
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">🏫 Admissions</h2><p class="page-subtitle">Application pipeline, interviews & enrollment</p></div>
        <div class="page-header-actions"><button class="btn btn-secondary" onclick="Pages.Admissions.exportList()">⬇️ Export</button><button class="btn btn-primary" onclick="Pages.Admissions.openNew()">+ New Application</button></div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px;overflow-x:auto;padding-bottom:4px">
        ${['all','applied','interview','accepted','enrolled','rejected'].map(s=>`<button class="btn btn-sm btn-${this._stage===s?'primary':'secondary'}" onclick="Pages.Admissions._stage='${s}';Pages.Admissions.renderTable()">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`).join('')}
      </div>
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">📋</div><div class="stat-body"><div class="stat-value">42</div><div class="stat-label">Applications</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">📅</div><div class="stat-body"><div class="stat-value">12</div><div class="stat-label">Awaiting Interview</div></div></div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">28</div><div class="stat-label">Accepted</div></div></div>
        <div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg)"><div class="stat-icon">🎓</div><div class="stat-body"><div class="stat-value">24</div><div class="stat-label">Enrolled</div></div></div>
      </div>
      <div class="card"><div class="card-header"><h3>📋 Applications Pipeline</h3></div><div id="adm-table"></div></div>`;
    this.renderTable();
  },
  renderTable(){
    const apps=[
      {name:'Kamau Brian',parent:'Mr. Kamau',phone:'+254712345678',form:'Form 1',date:'2024-10-01',stage:'accepted',kcpe:380},
      {name:'Wanjiku Aisha',parent:'Mrs. Wanjiku',phone:'+254723456789',form:'Form 1',date:'2024-10-03',stage:'enrolled',kcpe:402},
      {name:'Otieno Lucas',parent:'Mr. Otieno',phone:'+254734567890',form:'Form 1',date:'2024-10-05',stage:'interview',kcpe:365},
      {name:'Njeri Priscilla',parent:'Mrs. Njeri',phone:'+254745678901',form:'Form 1',date:'2024-10-07',stage:'applied',kcpe:390},
      {name:'Kipchoge Evans',parent:'Mr. Kipchoge',phone:'+254756789012',form:'Form 1',date:'2024-10-09',stage:'rejected',kcpe:280},
    ].filter(a=>this._stage==='all'||a.stage===this._stage);
    const c={applied:'amber',interview:'blue',accepted:'green',enrolled:'purple',rejected:'red'};
    document.getElementById('adm-table').innerHTML=`<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Applicant</th><th>Parent</th><th>Phone</th><th>Form</th><th>KCPE</th><th>Applied</th><th>Stage</th><th>Action</th></tr></thead>
      <tbody>${apps.map(a=>`<tr><td style="font-weight:600">${a.name}</td><td>${a.parent}</td><td>${a.phone}</td><td>${a.form}</td><td style="font-weight:700">${a.kcpe}</td><td style="font-size:12px">${a.date}</td>
        <td><span class="badge badge-${c[a.stage]}">${a.stage.toUpperCase()}</span></td>
        <td style="display:flex;gap:4px">
          ${a.stage==='accepted'?`<button class="btn btn-sm btn-primary" onclick="Toast.success('${a.name} enrolled!')">Enroll</button>`:''}
          ${a.stage==='applied'?`<button class="btn btn-sm btn-primary" onclick="Toast.success('Interview scheduled for ${a.name}')">Interview</button>`:''}
          ${a.stage==='interview'?`<button class="btn btn-sm btn-primary" onclick="Toast.success('${a.name} accepted!')">Accept</button>`:''}
          <button class="btn btn-sm btn-secondary" onclick="Toast.success('Loading application for ${a.name}...')">View</button>
        </td>
      </tr>`).join('')}</tbody></table></div>`;
  },
  openNew(){
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay open" id="adm-new" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:520px"><div class="modal-header" style="background:var(--brand);color:white"><h3 style="color:white;margin:0">🏫 New Application</h3><button onclick="document.getElementById('adm-new').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
      <div class="modal-body" style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">First Name *</label><input class="form-control" placeholder="Applicant first name"></div>
        <div class="form-group"><label class="form-label">Last Name *</label><input class="form-control" placeholder="Last name"></div>
        <div class="form-group"><label class="form-label">KCPE Index No</label><input class="form-control" placeholder="Index number"></div>
        <div class="form-group"><label class="form-label">KCPE Marks</label><input class="form-control" type="number" placeholder="Out of 500" min="0" max="500"></div>
        <div class="form-group"><label class="form-label">Parent/Guardian *</label><input class="form-control" placeholder="Parent full name"></div>
        <div class="form-group"><label class="form-label">Parent Phone *</label><input class="form-control" placeholder="+254 7XX XXX XXX"></div>
        <div class="form-group"><label class="form-label">Applying For</label><select class="form-control"><option>Form 1</option><option>Form 2</option><option>Form 3</option></select></div>
        <div class="form-group"><label class="form-label">Interview Date</label><input class="form-control" type="date"></div>
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('adm-new').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="Toast.success('Application submitted!');document.getElementById('adm-new').remove()">Submit Application</button>
      </div></div></div>`);
  },
  exportList(){Toast.success('Exporting admissions list...');}
};
}
