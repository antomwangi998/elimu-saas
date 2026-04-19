'use strict';
if (typeof Pages !== 'undefined') {
Pages.Behaviour = {
  async load() {
    const area = document.getElementById('page-behaviour') || document.getElementById('page-discipline');
    if(!area) return;
    area.innerHTML = `
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">🎭 Behaviour & Discipline</h2><p class="page-subtitle">Track student conduct, merit/demerit points, disciplinary actions</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.Behaviour.openRecord()">+ Record Incident</button></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">⭐</div><div class="stat-body"><div class="stat-value">342</div><div class="stat-label">Merit Points</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">⚠️</div><div class="stat-body"><div class="stat-value">87</div><div class="stat-label">Demerit Points</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">📋</div><div class="stat-body"><div class="stat-value">23</div><div class="stat-label">Open Cases</div></div></div>
        <div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">156</div><div class="stat-label">Resolved</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>📋 Recent Incidents</h3></div>
        <div style="overflow-x:auto"><table class="data-table">
          <thead><tr><th>Date</th><th>Student</th><th>Class</th><th>Category</th><th>Description</th><th>Points</th><th>Action Taken</th><th>Status</th></tr></thead>
          <tbody>${[
            {d:'2024-10-14',s:'Kamau James',c:'Form 4A',cat:'Misconduct',desc:'Disruptive in class',pts:-5,action:'Warning letter',status:'resolved'},
            {d:'2024-10-13',s:'Wanjiku Grace',c:'Form 3B',cat:'Excellence',desc:'Top performer Term 3',pts:+10,action:'Certificate awarded',status:'resolved'},
            {d:'2024-10-10',s:'Otieno David',c:'Form 2C',cat:'Absenteeism',desc:'Absent 3 consecutive days',pts:-8,action:'Parent meeting',status:'pending'},
            {d:'2024-10-08',s:'Muthoni Faith',c:'Form 4B',cat:'Excellence',desc:'Won county debate',pts:+15,action:'Principal commendation',status:'resolved'},
            {d:'2024-10-07',s:'Kipchoge Brian',c:'Form 1A',cat:'Misconduct',desc:'Fighting in dormitory',pts:-15,action:'Suspension 2 days',status:'resolved'},
          ].map(r=>`<tr>
            <td style="font-size:12px">${r.d}</td>
            <td style="font-weight:600">${r.s}</td><td>${r.c}</td>
            <td><span class="badge badge-${r.cat==='Excellence'?'green':r.cat==='Misconduct'?'red':'amber'}">${r.cat}</span></td>
            <td style="font-size:12px">${r.desc}</td>
            <td style="font-weight:700;color:${r.pts>0?'var(--green)':'var(--red)'}">${r.pts>0?'+':''}${r.pts}</td>
            <td style="font-size:12px">${r.action}</td>
            <td><span class="badge badge-${r.status==='resolved'?'green':'amber'}">${r.status}</span></td>
          </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
  },
  openRecord() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay open" id="beh-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:500px"><div class="modal-header" style="background:var(--amber);color:white"><h3 style="color:white;margin:0">⚠️ Record Incident</h3><button onclick="document.getElementById('beh-modal').remove()" style="background:rgba(0,0,0,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
      <div class="modal-body" style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Student *</label><input class="form-control" placeholder="Search student name..."></div>
        <div class="form-group"><label class="form-label">Category *</label>
          <select class="form-control"><option>Misconduct</option><option>Absenteeism</option><option>Excellence</option><option>Academic Dishonesty</option><option>Violence</option><option>Drug Abuse</option><option>Bullying</option></select></div>
        <div class="form-group"><label class="form-label">Points</label><input class="form-control" type="number" placeholder="-10 or +10"></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Description *</label><textarea class="form-control" rows="3" placeholder="Describe the incident..."></textarea></div>
        <div class="form-group"><label class="form-label">Action Taken</label><select class="form-control"><option>Verbal Warning</option><option>Written Warning</option><option>Parent Called</option><option>Suspension</option><option>Expulsion</option><option>Commendation</option></select></div>
        <div class="form-group"><label class="form-label">Incident Date</label><input class="form-control" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('beh-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="Toast.success('Incident recorded');document.getElementById('beh-modal').remove()">Save Incident</button>
      </div></div></div>`);
  },
};
}
