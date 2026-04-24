'use strict';
if (typeof Pages !== 'undefined') {
Pages.Payroll = {
  async load() {
    const area = document.getElementById('page-payroll');
    if(!area) return;
    const { rows:staff } = await API.get('/staff').then(d=>({rows:d?.data||d||[]})).catch(()=>({rows:[]}));
    area.innerHTML = `
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">💼 Payroll Management</h2><p class="page-subtitle">Monthly payroll, deductions & payslips</p></div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Pages.Payroll.runPayroll()">▶️ Run Payroll</button>
          <button class="btn btn-primary" onclick="Pages.Payroll.downloadAll()">⬇️ Download Payslips</button>
        </div>
      </div>
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">💰</div><div class="stat-body"><div class="stat-value">${UI.currency(2450000)}</div><div class="stat-label">Monthly Payroll</div></div></div>
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">👥</div><div class="stat-body"><div class="stat-value">24</div><div class="stat-label">Active Staff</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">🏛️</div><div class="stat-body"><div class="stat-value">${UI.currency(490000)}</div><div class="stat-label">Total Deductions</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">🧾</div><div class="stat-body"><div class="stat-value">${UI.currency(1960000)}</div><div class="stat-label">Net Pay</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>🗓️ October 2024 Payroll Run</h3>
          <select class="form-control" style="width:180px"><option>October 2024</option><option>September 2024</option><option>August 2024</option></select>
        </div>
        <div style="overflow-x:auto"><table class="data-table">
          <thead><tr><th>#</th><th>Staff Member</th><th>Grade</th><th>Gross Pay</th><th>NHIF</th><th>NSSF</th><th>PAYE</th><th>Net Pay</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${[{n:'James Kamau',g:'C5',gross:85000,nhif:1700,nssf:200,paye:18500},{n:'Mary Mwangi',g:'C4',gross:72000,nhif:1700,nssf:200,paye:14200},{n:'Peter Otieno',g:'C3',gross:61000,nhif:1700,nssf:200,paye:10400},{n:'Grace Njoroge',g:'D1',gross:98000,nhif:1700,nssf:200,paye:24600},{n:'David Koech',g:'C4',gross:72000,nhif:1700,nssf:200,paye:14200}].map((s,i)=>{
            const net=s.gross-s.nhif-s.nssf-s.paye;
            return `<tr><td style="color:var(--text-muted)">${i+1}</td><td style="font-weight:600">${s.n}</td><td><code>${s.g}</code></td>
              <td>${UI.currency(s.gross)}</td><td>${UI.currency(s.nhif)}</td><td>${UI.currency(s.nssf)}</td><td>${UI.currency(s.paye)}</td>
              <td style="font-weight:700;color:var(--green)">${UI.currency(net)}</td>
              <td><span class="badge badge-green">Paid</span></td>
              <td><button class="btn btn-sm btn-secondary" onclick="Pages.Payroll.printSlip('${s.n}',${s.gross},${net})">🖨️ Slip</button></td>
            </tr>`;}).join('')}
          </tbody>
        </table></div>
      </div>`;
  },
  runPayroll() {
    if(confirm('Run payroll for October 2024? This will process all active staff.'))
      Toast.success('Payroll run complete for 24 staff members');
  },
  downloadAll() { Toast.success('Generating all payslips... they will print in a new window'); this.runPayroll(); },
  printSlip(name, gross, net) {
    const w=window.open('','_blank');
    if(!w){ Toast.info('Allow popups'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${name}</title><style>body{font-family:Arial,sans-serif;max-width:600px;margin:30px auto;padding:20px;border:1px solid #ddd}h2{text-align:center;border-bottom:2px solid #333;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:8px;border:1px solid #ddd}@media print{button{display:none}}</style></head><body>
      <h2>PAYSLIP — ${name}</h2>
      <p>Period: October 2024 &nbsp;|&nbsp; Pay Date: ${new Date().toLocaleDateString()}</p>
      <table><tr><td>Basic Pay</td><td style="text-align:right">KES ${gross.toLocaleString()}</td></tr>
      <tr><td>NHIF Deduction</td><td style="text-align:right">-KES 1,700</td></tr>
      <tr><td>NSSF Deduction</td><td style="text-align:right">-KES 200</td></tr>
      <tr><td>PAYE Tax</td><td style="text-align:right">-KES ${(gross-net-1900).toLocaleString()}</td></tr>
      <tr style="font-weight:700;background:#f5f5f5"><td>NET PAY</td><td style="text-align:right">KES ${net.toLocaleString()}</td></tr></table>
      <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer">Print</button>
    </body></html>`);
    w.document.close();
  },
};
}
