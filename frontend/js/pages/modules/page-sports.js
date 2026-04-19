'use strict';
if (typeof Pages !== 'undefined') {
Pages.Sports = {
  async load() {
    const area = document.getElementById('page-sports');
    if(!area) return;
    area.innerHTML = `
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">⚽ Sports & Games</h2><p class="page-subtitle">Teams, fixtures, results & athletics tracking</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.Sports.addFixture()">+ Add Fixture</button></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">🏆</div><div class="stat-body"><div class="stat-value">8</div><div class="stat-label">Teams</div></div></div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">15</div><div class="stat-label">Wins</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">❌</div><div class="stat-body"><div class="stat-value">5</div><div class="stat-label">Losses</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">📅</div><div class="stat-body"><div class="stat-value">3</div><div class="stat-label">Upcoming</div></div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header"><h3>🏃 Teams & Squads</h3></div>
          <div style="padding:0">${[{name:'Football (Boys)',sport:'⚽',players:22,coach:'Mr. Ochieng',standing:'County Champions'},{name:'Basketball',sport:'🏀',players:15,coach:'Ms. Wanjiru',standing:'Quarter-Finals'},{name:'Athletics',sport:'🏃',players:30,coach:'Mr. Koech',standing:'National Qualifiers'},{name:'Volleyball (Girls)',sport:'🏐',players:18,coach:'Mrs. Njeri',standing:'Zone Champions'}].map(t=>`
            <div style="padding:14px;border-bottom:1px solid var(--border)">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:24px">${t.sport}</span>
                <div style="flex:1">
                  <div style="font-weight:700">${t.name}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${t.players} players · Coach: ${t.coach}</div>
                </div>
                <span class="badge badge-green" style="font-size:10px">${t.standing}</span>
              </div>
            </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📅 Fixtures & Results</h3></div>
          <div style="padding:0">${[{date:'2024-11-20',home:'Our School',away:'Alliance High',sport:'⚽',result:'2-1',status:'won'},{date:'2024-11-18',home:'Maranda High',away:'Our School',sport:'🏀',result:'45-62',status:'won'},{date:'2024-11-25',home:'Our School',away:'Mangu High',sport:'⚽',result:null,status:'upcoming'},{date:'2024-11-10',home:'Our School',away:'Starehe',sport:'🏐',result:'1-3',status:'lost'}].map(f=>`
            <div style="padding:12px;border-bottom:1px solid var(--border)">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div><div style="font-size:12px;color:var(--text-muted)">${f.date} ${f.sport}</div>
                  <div style="font-weight:600;font-size:13px">${f.home} vs ${f.away}</div></div>
                <div style="text-align:right">
                  ${f.result?`<div style="font-weight:800;font-size:16px">${f.result}</div>`:'<span style="color:var(--text-muted);font-size:12px">TBD</span>'}
                  <span class="badge badge-${f.status==='won'?'green':f.status==='lost'?'red':'blue'}">${f.status.toUpperCase()}</span>
                </div>
              </div>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
  },
  addFixture() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay open" id="sport-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:480px"><div class="modal-header" style="background:var(--red);color:white"><h3 style="color:white;margin:0">⚽ Add Fixture</h3><button onclick="document.getElementById('sport-modal').remove()" style="background:rgba(0,0,0,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
      <div class="modal-body" style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Sport *</label><select class="form-control"><option>Football</option><option>Basketball</option><option>Volleyball</option><option>Athletics</option><option>Rugby</option><option>Handball</option></select></div>
        <div class="form-group"><label class="form-label">Home Team</label><input class="form-control" value="Our School"></div>
        <div class="form-group"><label class="form-label">Away Team *</label><input class="form-control" placeholder="Opponent school"></div>
        <div class="form-group"><label class="form-label">Date *</label><input class="form-control" type="date"></div>
        <div class="form-group"><label class="form-label">Venue</label><input class="form-control" placeholder="Location"></div>
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('sport-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="Toast.success('Fixture added!');document.getElementById('sport-modal').remove()">Save Fixture</button>
      </div></div></div>`);
  },
};
}
