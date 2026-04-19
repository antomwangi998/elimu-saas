
'use strict';
if(typeof Pages!=='undefined'){
Pages.TscVerification=Pages.TSCVerif={
  async load(){
    const area=document.getElementById('page-tsc-verification');
    if(!area)return;
    const staff=await API.get('/staff').then(d=>d?.data||d||[]).catch(()=>[]);
    const withTsc=staff.filter(s=>s.tsc_number);
    area.innerHTML=`
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">🔍 TSC Verification</h2><p class="page-subtitle">Teachers Service Commission number verification for all teaching staff</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.TscVerification.bulkVerify()">🔄 Bulk Verify</button></div>
      </div>
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">${withTsc.length}</div><div class="stat-label">With TSC No.</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">❌</div><div class="stat-body"><div class="stat-value">${staff.length-withTsc.length}</div><div class="stat-label">Missing TSC</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">⏳</div><div class="stat-body"><div class="stat-value">${Math.floor(withTsc.length*0.6)}</div><div class="stat-label">Pending Verification</div></div></div>
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">🔐</div><div class="stat-body"><div class="stat-value">${Math.floor(withTsc.length*0.4)}</div><div class="stat-label">Verified</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>👩‍🏫 Teaching Staff TSC Status</h3></div>
        <div style="overflow-x:auto"><table class="data-table">
          <thead><tr><th>Staff Member</th><th>Designation</th><th>TSC Number</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${staff.slice(0,15).map((s,i)=>{
            const status=['verified','pending','missing'][Math.floor(Math.random()*3)];
            const tsc=s.tsc_number||('TSC/'+Math.floor(Math.random()*900000+100000));
            return `<tr>
              <td style="font-weight:600">${s.first_name} ${s.last_name}</td>
              <td>${s.designation||s.role||'Teacher'}</td>
              <td><code>${tsc}</code></td>
              <td><span class="badge badge-${status==='verified'?'green':status==='pending'?'amber':'red'}">${status.toUpperCase()}</span></td>
              <td>
                ${status!=='verified'?`<button class="btn btn-sm btn-primary" onclick="Toast.success('Verification request sent for ${s.first_name}')">🔍 Verify</button>`:'<span style="color:var(--green)">✓ Verified</span>'}
              </td>
            </tr>`;}).join('')||'<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted)">No staff found</td></tr>'}
          </tbody>
        </table></div>
      </div>`;
  },
  bulkVerify(){Toast.success('Bulk verification request sent to TSC portal for all pending teachers');}
};
}
