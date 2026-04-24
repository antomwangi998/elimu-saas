'use strict';
if (typeof Pages !== 'undefined') {
Pages.ClubsSubsystem = {
  async load() {
    const area = document.getElementById('page-clubs-subsystem');
    if (!area) return;
    // Show sub-management features of clubs
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-title">🏅 Clubs Administration</h2><p class="page-subtitle">Inter-club competitions, events, certificates and reporting</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Router.go('clubs')">← Back to Clubs</button></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header"><h3>🏆 Inter-Club Events</h3><button class="btn btn-sm btn-primary" onclick="Pages.ClubsSubsystem.addEvent()">+ Add Event</button></div>
          <div style="padding:0">
            ${[{name:'Science Fair 2024',date:'2024-11-15',clubs:['Science','Mathematics'],status:'upcoming'},{name:'Drama Festival',date:'2024-10-20',clubs:['Drama','Music'],status:'completed'},{name:'Sports Day',date:'2024-10-12',clubs:['Athletics','Football'],status:'completed'}].map(e=>`
              <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div><div style="font-weight:600">${e.name}</div><div style="font-size:12px;color:var(--text-muted)">${e.date} · ${e.clubs.join(', ')}</div></div>
                  <span class="badge badge-${e.status==='upcoming'?'blue':'green'}">${e.status}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📊 Club Participation Report</h3></div>
          <div style="padding:16px">
            <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted)">Students with club memberships this term</div>
            ${[{name:'Football',members:22,pct:78},{name:'Science',members:18,pct:64},{name:'Drama',members:15,pct:54},{name:'Music',members:12,pct:43},{name:'Debate',members:10,pct:36}].map(c=>`
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px"><span>${c.name}</span><span style="font-weight:700">${c.members} members</span></div>
                <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">
                  <div style="height:100%;width:${c.pct}%;background:var(--brand);border-radius:99px"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  },
  addEvent() { Toast.info('Add inter-club event form coming'); }
};
}
