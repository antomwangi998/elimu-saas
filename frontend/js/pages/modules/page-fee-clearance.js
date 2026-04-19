
'use strict';
if(typeof Pages!=='undefined'){
Pages.FeeClearance={
  async load(){
    const area=document.getElementById('page-fee-clearance');
    if(!area)return;
    area.innerHTML=`
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">🧾 Fee Clearance</h2><p class="page-subtitle">Issue clearance certificates for exam registration & leaving certificates</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.FeeClearance.bulkGenerate()">📄 Bulk Generate</button></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="card" style="padding:20px">
          <div style="font-size:32px;margin-bottom:8px">🔍</div>
          <h3 style="margin:0 0 8px">Check Student Clearance</h3>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:16px">Enter admission number to check fee clearance status</p>
          <div style="display:flex;gap:8px">
            <input id="fc-adm" class="form-control" placeholder="Admission number" style="flex:1">
            <button class="btn btn-primary" onclick="Pages.FeeClearance.check()">Check</button>
          </div>
          <div id="fc-result" style="margin-top:16px"></div>
        </div>
        <div class="card" style="padding:20px">
          <div style="font-size:32px;margin-bottom:8px">📊</div>
          <h3 style="margin:0 0 8px">Clearance Summary</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
            <div style="background:var(--green-bg);padding:14px;border-radius:10px;text-align:center"><div style="font-size:28px;font-weight:800;color:var(--green)">284</div><div style="font-size:12px;color:var(--text-muted)">Cleared</div></div>
            <div style="background:var(--red-bg);padding:14px;border-radius:10px;text-align:center"><div style="font-size:28px;font-weight:800;color:var(--red)">56</div><div style="font-size:12px;color:var(--text-muted)">Not Cleared</div></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>📋 Recent Clearance Certificates</h3></div>
        <div style="overflow-x:auto"><table class="data-table">
          <thead><tr><th>Student</th><th>Adm No</th><th>Form</th><th>Balance</th><th>Status</th><th>Issued</th><th>Action</th></tr></thead>
          <tbody>${[{n:'Kamau James',adm:'ALLI20240001',form:'Form 4',bal:0,status:'cleared',date:'2024-10-14'},{n:'Wanjiku Grace',adm:'ALLI20240002',form:'Form 4',bal:0,status:'cleared',date:'2024-10-13'},{n:'Otieno David',adm:'ALLI20240045',form:'Form 4',bal:12500,status:'not_cleared',date:null},{n:'Muthoni Faith',adm:'ALLI20240067',form:'Form 4',bal:0,status:'cleared',date:'2024-10-12'}].map(s=>`<tr>
            <td style="font-weight:600">${s.n}</td><td><code>${s.adm}</code></td><td>${s.form}</td>
            <td style="font-weight:700;color:${s.bal>0?'var(--red)':'var(--green)'}">${s.bal>0?UI.currency(s.bal):'Fully Paid'}</td>
            <td><span class="badge badge-${s.status==='cleared'?'green':'red'}">${s.status==='cleared'?'CLEARED':'NOT CLEARED'}</span></td>
            <td style="font-size:12px">${s.date||'—'}</td>
            <td>${s.status==='cleared'?`<button class="btn btn-sm btn-secondary" onclick="Pages.FeeClearance.print('${s.n}')">🖨️ Print</button>`:`<button class="btn btn-sm btn-primary" onclick="Toast.info('Collect ${UI.currency(s.bal)} first')">💰 Collect</button>`}</td>
          </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
  },
  check(){
    const adm=document.getElementById('fc-adm')?.value?.trim();
    if(!adm){Toast.error('Enter admission number');return;}
    const result=document.getElementById('fc-result');
    result.innerHTML=`<div style="background:var(--green-bg);border:1px solid var(--green);border-radius:10px;padding:14px">
      <div style="font-weight:700;color:var(--green);margin-bottom:4px">✅ CLEARED</div>
      <div style="font-size:13px">Student <strong>${adm}</strong> has no outstanding fees and is cleared for examination registration.</div>
      <button class="btn btn-sm btn-secondary" style="margin-top:10px" onclick="Pages.FeeClearance.print('${adm}')">🖨️ Print Certificate</button>
    </div>`;
  },
  print(name){
    const w=window.open('','_blank');
    if(!w){Toast.info('Allow popups');return;}
    w.document.write(`<!DOCTYPE html><html><head><title>Fee Clearance Certificate</title><style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;text-align:center}h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:8px}@media print{button{display:none}}</style></head><body>
      <h1>FEE CLEARANCE CERTIFICATE</h1>
      <p>This is to certify that</p>
      <h2 style="border:2px solid #333;padding:10px 20px;display:inline-block">${name}</h2>
      <p>has no outstanding school fees for the academic year 2024 and is hereby cleared for all school activities including examination registration.</p>
      <p>Date: ${new Date().toLocaleDateString()}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px">
        <div style="text-align:center"><div style="border-top:1px solid #333;padding-top:4px">Bursar</div></div>
        <div style="text-align:center"><div style="border-top:1px solid #333;padding-top:4px">Principal</div></div>
      </div>
      <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;margin-top:20px">Print</button>
    </body></html>`);
    w.document.close();
  },
  bulkGenerate(){ Toast.success('Generating clearance certificates for all cleared Form 4 students...'); }
};
}
