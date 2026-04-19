// ============================================================
// ElimuSaaS -- Complete Feature Pages
// Payroll · Library · Lab · Alumni · Behaviour · Discipline
// WhatsApp · FCM · Certs · Leave-Out · Parent Portal · Admissions
// ============================================================

const $g = id => document.getElementById(id);
const _badge = (t,c) => `<span class="badge badge-${c||'gray'}">${t}</span>`;
const _money = v => `KES ${parseFloat(v||0).toLocaleString()}`;
const _date  = d => d ? new Date(d).toLocaleDateString('en-KE') : '--';
const _dt    = d => d ? new Date(d).toLocaleString('en-KE') : '--';
const _pct   = (a,b) => b>0 ? ((a/b)*100).toFixed(1)+'%' : '0%';
const _row   = (cells, style='') => `<tr style="${style}">${cells.map(c=>`<td style="padding:6px 10px;border-bottom:1px solid var(--border-subtle);font-size:12px">${c}</td>`).join('')}</tr>`;
const _tblF  = (heads, rows, empty='No data') => {
  if(!rows.trim()) return UI.empty(empty);
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${heads.map(h=>`<th style="padding:8px 10px;border-bottom:2px solid var(--border);text-align:left;font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
};

// ============================================================
// PAYROLL
// ============================================================
Pages.Payroll = {
  _tab: 'overview',
  async load() { this._renderTabs(); this.switchTab('overview'); },

  _renderTabs() {
    const c = $g('page-payroll');
    if(!c||c.querySelector('.tab-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'tab-bar';
    bar.style.cssText = 'display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap';
    [['overview','Overview'],['grades','Pay Grades'],['staff','Staff Payroll'],['runs','Payroll Runs'],['myslip','My Payslips']].forEach(([k,l])=>{
      const b = document.createElement('button');
      b.className = 'tab'; b.dataset.tab = k; b.textContent = l;
      b.onclick = () => this.switchTab(k,b);
      bar.appendChild(b);
    });
    c.insertBefore(bar, c.querySelector('.page-content')||c.firstChild);
  },

  switchTab(tab, el) {
    document.querySelectorAll('#page-payroll .tab').forEach(t=>t.classList.remove('active'));
    if(el) el.classList.add('active'); else {
      const t = document.querySelector(`#page-payroll .tab[data-tab="${tab}"]`);
      if(t) t.classList.add('active');
    }
    const c = $g('payroll-content');
    if(!c) return;
    this._tab = tab;
    if(tab==='overview') this._renderOverview(c);
    else if(tab==='grades') this._renderGrades(c);
    else if(tab==='staff') this._renderStaff(c);
    else if(tab==='runs') this._renderRuns(c);
    else if(tab==='myslip') this._renderMySlips(c);
  },

  async _renderOverview(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/payroll/summary');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        ${[['Staff on Payroll',d.staffOnPayroll||0,'👔','var(--brand)'],['Total Runs (YTD)',d.total_runs||0,'📋','var(--blue)'],['Total Gross (YTD)',_money(d.total_gross_ytd),'💰','var(--green)'],['Total Net (YTD)',_money(d.total_net_ytd),'💵','var(--purple)']].map(([l,v,i,col])=>`
          <div class="stat-card"><div class="stat-body"><div class="stat-icon" style="color:${col}">${i}</div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
      </div>
      <div class="grid-2">
        <div class="card"><div class="card-header"><div class="card-title">Quick Actions</div></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn btn-primary" onclick="Pages.Payroll.openGenerateRun()">🚀 Generate Monthly Payroll</button>
            <button class="btn btn-secondary" onclick="Pages.Payroll.switchTab('staff',null)">👔 Manage Staff Payroll</button>
            <button class="btn btn-ghost" onclick="Pages.Payroll.switchTab('grades',null)">📊 Manage Pay Grades</button>
          </div>
        </div>
        <div class="card"><div class="card-header"><div class="card-title">This Month</div></div>
          <div style="font-size:12px;color:var(--text-muted)">Generate payroll to see this month's summary</div>
        </div>
      </div>`;
  },

  async _renderGrades(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/payroll/grades');
    c.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Payroll.openGradeModal()">+ Add Grade</button>
    </div>
    ${!d.length?UI.empty('No pay grades','Create grades to standardise staff salaries.'):_tblF(['Grade Name','Basic Salary','House','Transport','Medical','Other','Total'],
      d.map(g=>{const total=+g.basic_salary+(+g.house_allowance)+(+g.transport_allowance)+(+g.medical_allowance)+(+g.other_allowances);return _row([`<strong>${g.name}</strong>`,_money(g.basic_salary),_money(g.house_allowance),_money(g.transport_allowance),_money(g.medical_allowance),_money(g.other_allowances),`<strong style="color:var(--green)">${_money(total)}</strong>`]);}).join(''))}`;
  },

  async openGradeModal() {
    ['pg-name','pg-basic','pg-house','pg-transport','pg-medical','pg-other'].forEach(id=>{const e=$g(id);if(e)e.value='';});
    UI.openModal('modal-pay-grade');
  },

  async saveGrade() {
    const p={name:$g('pg-name')?.value?.trim(),basicSalary:+($g('pg-basic')?.value||0),houseAllowance:+($g('pg-house')?.value||0),transportAllowance:+($g('pg-transport')?.value||0),medicalAllowance:+($g('pg-medical')?.value||0),otherAllowances:+($g('pg-other')?.value||0)};
    if(!p.name||!p.basicSalary){Toast.error('Name and basic salary required');return;}
    const r=await API.post('/payroll/grades',p);
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Grade saved!');UI.closeModal('modal-pay-grade');
    this._renderGrades($g('payroll-content'));
  },

  async _renderStaff(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/payroll/staff');
    c.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Payroll.openStaffModal()">+ Setup Staff Payroll</button>
    </div>
    ${!d.length?UI.empty('No staff payroll setups','Add staff to the payroll system.'):_tblF(['Staff','Role','Grade','Basic','Allowances','Deductions','Net','Method'],
      d.map(s=>{const gross=+s.basic_salary+(+s.house_allowance)+(+s.transport_allowance)+(+s.medical_allowance)+(+s.hardship_allowance)+(+s.other_allowances);const ded=+s.nhif_deduction+(+s.nssf_deduction)+(+s.paye_deduction)+(+s.loan_deduction)+(+s.other_deductions);return _row([`<div><strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${s.tsc_number||''}</div></div>`,s.role?.replace(/_/g,' '),s.grade_name||'--',_money(s.basic_salary),_money(gross-+s.basic_salary),`<span style="color:var(--red)">${_money(ded)}</span>`,`<strong style="color:var(--green)">${_money(gross-ded)}</strong>`,_badge(s.payment_method,'blue')]);}).join(''))}`;
  },

  async openStaffModal() {
    const [staff,grades]=await Promise.all([API.get('/staff?limit=200'),API.get('/payroll/grades')]);
    const ss=$g('sp-staff'),gs=$g('sp-grade');
    if(ss)ss.innerHTML='<option value="">Select staff…</option>'+(staff.data||staff||[]).map(s=>`<option value="${s.id}">${s.first_name} ${s.last_name} (${s.role})</option>`).join('');
    if(gs)gs.innerHTML='<option value="">No grade (manual)</option>'+(grades||[]).map(g=>`<option value="${g.id}" data-basic="${g.basic_salary}" data-house="${g.house_allowance}" data-transport="${g.transport_allowance}" data-medical="${g.medical_allowance}">${g.name} -- ${_money(g.basic_salary)}</option>`).join('');
    if(gs)gs.onchange=()=>{const opt=gs.selectedOptions[0];if(opt&&opt.dataset.basic){$g('sp-basic').value=opt.dataset.basic;$g('sp-house').value=opt.dataset.house;$g('sp-transport').value=opt.dataset.transport;$g('sp-medical').value=opt.dataset.medical;}};
    ['sp-basic','sp-house','sp-transport','sp-medical','sp-hardship','sp-other','sp-nhif','sp-nssf','sp-paye','sp-loan','sp-bank','sp-account'].forEach(id=>{const e=$g(id);if(e)e.value='';});
    $g('sp-nhif').value='300';$g('sp-nssf').value='200';
    UI.openModal('modal-staff-payroll');
  },

  _calcNHIF(gross){if(gross<=5999)return 150;if(gross<=7999)return 300;if(gross<=11999)return 400;if(gross<=14999)return 500;if(gross<=19999)return 600;if(gross<=24999)return 750;if(gross<=29999)return 850;if(gross<=34999)return 900;if(gross<=39999)return 950;if(gross<=44999)return 1000;if(gross<=49999)return 1100;if(gross<=59999)return 1200;if(gross<=69999)return 1300;if(gross<=79999)return 1400;if(gross<=89999)return 1500;return 1700;},

  async saveStaffPayroll() {
    const p={staffId:$g('sp-staff')?.value,payrollGradeId:$g('sp-grade')?.value||undefined,basicSalary:+($g('sp-basic')?.value||0),houseAllowance:+($g('sp-house')?.value||0),transportAllowance:+($g('sp-transport')?.value||0),medicalAllowance:+($g('sp-medical')?.value||0),hardshipAllowance:+($g('sp-hardship')?.value||0),otherAllowances:+($g('sp-other')?.value||0),nhifDeduction:+($g('sp-nhif')?.value||0),nssfDeduction:+($g('sp-nssf')?.value||200),payeDeduction:+($g('sp-paye')?.value||0),loanDeduction:+($g('sp-loan')?.value||0),bankName:$g('sp-bank')?.value,bankAccount:$g('sp-account')?.value,paymentMethod:$g('sp-method')?.value||'bank'};
    if(!p.staffId||!p.basicSalary){Toast.error('Staff and basic salary required');return;}
    const r=await API.post('/payroll/staff',p);
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Payroll setup saved!');UI.closeModal('modal-staff-payroll');
    this._renderStaff($g('payroll-content'));
  },

  async _renderRuns(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/payroll/runs');
    const stC={draft:'gray',approved:'blue',paid:'green'};
    c.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Payroll.openGenerateRun()">🚀 Generate Payroll</button>
    </div>
    ${!d.length?UI.empty('No payroll runs','Generate your first payroll run.'):_tblF(['Period','Staff','Gross','Deductions','Net','Status','Actions'],
      d.map(r=>_row([`<strong>${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][r.month]} ${r.year}</strong>`,r.staff_count,_money(r.total_gross),`<span style="color:var(--red)">${_money(r.total_deductions)}</span>`,`<strong style="color:var(--green)">${_money(r.total_net)}</strong>`,_badge(r.status,stC[r.status]||'gray'),`<div style="display:flex;gap:4px"><button class="btn btn-sm btn-secondary" onclick="Pages.Payroll.viewSlips('${r.id}','${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][r.month]} ${r.year}')">View Slips</button>${r.status==='draft'?`<button class="btn btn-sm btn-success" onclick="Pages.Payroll.approveRun('${r.id}')">Approve</button>`:''}</div>`])).join(''))}`;
  },

  openGenerateRun() { $g('pr-month').value=new Date().getMonth()+1; $g('pr-year').value=new Date().getFullYear(); UI.openModal('modal-gen-payroll'); },

  async generateRun() {
    const btn=$g('gen-pr-btn'); UI.setLoading(btn,true);
    const r=await API.post('/payroll/runs/generate',{month:+$g('pr-month').value,year:+$g('pr-year').value,notes:$g('pr-notes')?.value});
    UI.setLoading(btn,false);
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`Payroll generated! ${r.staffCount} staff, Net: ${_money(r.totalNet)}`);
    UI.closeModal('modal-gen-payroll');
    this._renderRuns($g('payroll-content'));
  },

  async approveRun(id) {
    if(!await UI.confirm('Approve this payroll run? This marks it ready for payment.')) return;
    const r=await API.put(`/payroll/runs/${id}/approve`,{});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Payroll approved!'); this._renderRuns($g('payroll-content'));
  },

  async viewSlips(runId, label) {
    const d = await API.get(`/payroll/runs/${runId}/slips`);
    if(d.error){Toast.error(d.error);return;}
    UI.showInfoModal(`Payslips -- ${label}`,`
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:var(--bg-elevated)">${['Staff','Basic','Gross','NHIF','NSSF','PAYE','Other Ded','Net','Print'].map(h=>`<th style="padding:7px;border-bottom:1px solid var(--border)">${h}</th>`).join('')}</tr></thead>
        <tbody>${d.map(s=>`<tr><td style="padding:6px 8px"><strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${s.role||''}</div></td><td>${_money(s.basic_salary)}</td><td style="color:var(--brand)">${_money(s.gross_salary)}</td><td style="color:var(--red)">${_money(s.nhif_deduction)}</td><td style="color:var(--red)">${_money(s.nssf_deduction)}</td><td style="color:var(--red)">${_money(s.paye_deduction)}</td><td style="color:var(--red)">${_money(s.other_deductions)}</td><td style="font-weight:700;color:var(--green)">${_money(s.net_salary)}</td><td><button class="btn btn-sm btn-ghost" onclick="Pages.Payroll.printSlip(${JSON.stringify(s).replace(/"/g,'&quot;')},'${label}')">Print</button></td></tr>`).join('')}</tbody>
      </table></div>
      <div style="text-align:right;margin-top:12px"><button class="btn btn-primary" onclick="Pages.Payroll.printAllSlips('${runId}','${label}')">Print All Slips</button></div>`);
  },

  printSlip(slip, period) {
    const school=AppState.school||{};
    const html=`<div style="font-family:Arial,sans-serif;border:1px solid #ccc;padding:24px;max-width:600px;margin:auto">
      <div style="text-align:center;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:12px">
        <h2 style="margin:0">${school.name||'School'}</h2><p style="margin:4px 0;font-size:12px">SALARY PAYSLIP -- ${period}</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-bottom:16px">
        <div><b>Name:</b> ${slip.first_name} ${slip.last_name}</div>
        <div><b>Role:</b> ${(slip.role||'').replace(/_/g,' ')}</div>
        <div><b>TSC No:</b> ${slip.tsc_number||'--'}</div>
        <div><b>Payment:</b> ${slip.payment_method||'--'}</div>
        ${slip.bank_name?`<div><b>Bank:</b> ${slip.bank_name}</div><div><b>Account:</b> ${slip.bank_account||'--'}</div>`:''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
        <div><h4 style="margin:0 0 8px;color:#166534">EARNINGS</h4><table style="width:100%">${[['Basic Salary',slip.basic_salary],['House Allowance',slip.house_allowance],['Transport Allowance',slip.transport_allowance],['Medical Allowance',slip.medical_allowance],['Hardship Allowance',slip.hardship_allowance],['Other Allowances',slip.other_allowances]].filter(([,v])=>parseFloat(v||0)>0).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right">${_money(v)}</td></tr>`).join('')}<tr style="border-top:1px solid #ccc;font-weight:700"><td>GROSS</td><td style="text-align:right;color:#166534">${_money(slip.gross_salary)}</td></tr></table></div>
        <div><h4 style="margin:0 0 8px;color:#dc2626">DEDUCTIONS</h4><table style="width:100%">${[['NHIF',slip.nhif_deduction],['NSSF',slip.nssf_deduction],['PAYE',slip.paye_deduction],['Loan',slip.loan_deduction],['Other',slip.other_deductions]].filter(([,v])=>parseFloat(v||0)>0).map(([k,v])=>`<tr><td>${k}</td><td style="text-align:right;color:#dc2626">${_money(v)}</td></tr>`).join('')}<tr style="border-top:1px solid #ccc;font-weight:700"><td>TOTAL DED.</td><td style="text-align:right;color:#dc2626">${_money(slip.total_deductions)}</td></tr></table></div>
      </div>
      <div style="background:#166534;color:#fff;padding:12px;margin-top:12px;border-radius:6px;text-align:center;font-size:18px;font-weight:700">NET PAY: ${_money(slip.net_salary)}</div>
      <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:20px;font-size:11px">
        <div><div style="border-top:1px solid #333;margin-top:30px;padding-top:4px">Employer Signature</div></div>
        <div><div style="border-top:1px solid #333;margin-top:30px;padding-top:4px">Employee Signature</div></div>
      </div>
    </div>`;
    const w=window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip</title><style>@media print{body{margin:0}}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),500)<\/script></body></html>`);
    w.document.close();
  },

  async _renderMySlips(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/payroll/my-slips');
    if(!d.length){c.innerHTML=UI.empty('No payslips','Your payslips will appear here.');return;}
    c.innerHTML = _tblF(['Period','Basic','Gross','Deductions','Net','Status',''],
      d.map(s=>_row([`<strong>${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][s.month]} ${s.year}</strong>`,_money(s.basic_salary),_money(s.gross_salary),`<span style="color:var(--red)">${_money(s.total_deductions)}</span>`,`<strong style="color:var(--green)">${_money(s.net_salary)}</strong>`,_badge(s.payment_status||'pending','green'),`<button class="btn btn-sm btn-ghost" onclick="Pages.Payroll.printSlip(${JSON.stringify(s).replace(/"/g,'&quot;')},'${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][s.month]} ${s.year}')">Print</button>`])).join(''));
  },
};

// ============================================================
// LIBRARY -- Full Circulation
// ============================================================
Pages.Library = {
  async load() { this.switchTab('books'); },

  switchTab(tab, el) {
    document.querySelectorAll('#page-library .tab').forEach(t=>t.classList.remove('active'));
    const tEl = el || document.querySelector(`#page-library .tab[data-tab="${tab}"]`);
    if(tEl) tEl.classList.add('active');
    const c=$g('library-content'); if(!c)return;
    if(tab==='books') this._renderBooks(c);
    else if(tab==='borrowings') this._renderBorrowings(c);
    else if(tab==='members') this._renderMembers(c);
    else if(tab==='fines') this._renderFines(c);
    else if(tab==='stats') this._renderStats(c);
  },

  async _renderBooks(c) {
    c.innerHTML = UI.loading();
    const data = await API.get('/library/books?limit=100');
    const books = data.data||data||[];
    c.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <input type="text" placeholder="Search title, author, ISBN…" id="lib-search" oninput="Pages.Library._searchBooks(this.value)" style="flex:1;min-width:200px;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
      <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer"><input type="checkbox" id="lib-avail" onchange="Pages.Library._filterAvail(this.checked)"> Available only</label>
      <button class="btn btn-primary btn-sm" onclick="Pages.Library.openAddBook()">+ Add Book</button>
    </div>
    <div id="lib-books-grid">${this._booksGrid(books)}</div>`;
    this._allBooks = books;
  },

  _booksGrid(books) {
    if(!books.length) return UI.empty('No books','Add your first book to the library.');
    return `<div class="grid-auto">${books.map(b=>`
      <div class="card" style="border-left:3px solid ${+b.available_copies>0?'var(--green)':'var(--amber)'}">
        <div class="card-header"><div><div class="card-title">${b.title}</div><div class="card-subtitle">${b.author}${b.isbn?' · '+b.isbn:''}</div></div>
          <div style="text-align:right"><div style="font-size:22px;font-weight:800;color:${+b.available_copies>0?'var(--green)':'var(--red)'}">${b.available_copies}</div><div style="font-size:9px;color:var(--text-muted)">of ${b.total_copies}</div></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${b.category||'General'}${b.location_shelf?' · 📍'+b.location_shelf:''}</div>
        <div style="display:flex;gap:4px">
          ${+b.available_copies>0?`<button class="btn btn-sm btn-primary" onclick="Pages.Library.openIssueModal('${b.id}','${b.title.replace(/'/g,"\\'")}')">Issue</button>`:'<button class="btn btn-sm btn-ghost" disabled>No copies</button>'}
          <button class="btn btn-sm btn-ghost" onclick="Pages.Library.viewBook('${b.id}')">Details</button>
        </div>
      </div>`).join('')}</div>`;
  },

  _searchBooks(q) { const g=$g('lib-books-grid'); if(!g)return; const f=q.length<2?this._allBooks:this._allBooks.filter(b=>b.title.toLowerCase().includes(q.toLowerCase())||b.author.toLowerCase().includes(q.toLowerCase())||(b.isbn||'').includes(q)); g.innerHTML=this._booksGrid(f); },
  _filterAvail(v) { const g=$g('lib-books-grid'); if(!g)return; g.innerHTML=this._booksGrid(v?this._allBooks.filter(b=>+b.available_copies>0):this._allBooks); },

  async viewBook(id) {
    const d = await API.get(`/library/books/${id}`);
    if(d.error){Toast.error(d.error);return;}
    UI.showInfoModal(`📖 ${d.title}`,`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;margin-bottom:16px">
        ${[['Author',d.author],['ISBN',d.isbn||'--'],['Publisher',d.publisher||'--'],['Category',d.category||'--'],['Total Copies',d.total_copies],['Available',d.available_copies],['Shelf',d.location_shelf||'--'],['Edition',d.edition||'--']].map(([k,v])=>`<div><span style="color:var(--text-secondary)">${k}:</span> <strong>${v}</strong></div>`).join('')}
      </div>
      ${d.summary?`<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">${d.summary}</div>`:''}
      ${d.currentBorrowings?.length?`<div style="font-weight:600;margin-bottom:6px">Currently borrowed by:</div>${_tblF(['Borrower','Due Date','Status'],d.currentBorrowings.map(b=>_row([`${b.borrower_name}<div style="font-size:10px">${b.admission_number}</div>`,_date(b.due_date),new Date(b.due_date)<new Date()?_badge('OVERDUE','red'):_badge('On Time','green')])).join(''))}`:UI.empty('No active borrowings')}
      <div style="display:flex;gap:8px;margin-top:12px">
        ${+d.available_copies>0?`<button class="btn btn-primary btn-sm" onclick="Pages.Library.openIssueModal('${d.id}','${d.title.replace(/'/g,"\\'")}');UI.closeModal('_dynamic-modal')">Issue Book</button>`:''}
      </div>`);
  },

  async openAddBook() {
    ['lb-title','lb-author','lb-isbn','lb-publisher','lb-category','lb-shelf','lb-summary'].forEach(id=>{const e=$g(id);if(e)e.value='';});
    $g('lb-copies').value='1';
    UI.openModal('modal-add-book');
  },

  async saveBook() {
    const p={title:$g('lb-title')?.value?.trim(),author:$g('lb-author')?.value?.trim(),isbn:$g('lb-isbn')?.value,publisher:$g('lb-publisher')?.value,category:$g('lb-category')?.value,totalCopies:+($g('lb-copies')?.value||1),locationShelf:$g('lb-shelf')?.value,summary:$g('lb-summary')?.value};
    if(!p.title||!p.author){Toast.error('Title and author required');return;}
    const r=await API.post('/library/books',p);
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Book added!');UI.closeModal('modal-add-book');
    this._renderBooks($g('library-content'));
  },

  async _renderBorrowings(c) {
    c.innerHTML = UI.loading();
    const [all,overdue] = await Promise.all([API.get('/library/borrowings?status=borrowed&limit=100'),API.get('/library/borrowings?overdue=true&limit=100')]);
    const list = all||[];
    c.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="Pages.Library.openReturnModal()">📥 Return Book</button>
      <button class="btn btn-secondary btn-sm" onclick="Pages.Library.openRenewModal()">🔄 Renew</button>
      ${(overdue||[]).length?`<div class="alert alert-warning" style="margin:0;flex:1">⚠️ ${(overdue||[]).length} overdue borrowings</div>`:''}
    </div>
    ${_tblF(['Book','Borrower','Issued','Due Date','Status','Action'],
      list.map(b=>{const od=new Date(b.due_date)<new Date();return _row([`<strong>${b.title}</strong><div style="font-size:10px">${b.author}</div>`,`${b.borrower_name}<div style="font-size:10px">${b.admission_number}</div>`,_date(b.issue_date),`<span style="color:${od?'var(--red)':'inherit'}">${_date(b.due_date)}</span>`,od?_badge('OVERDUE','red'):_badge('Active','green'),`<button class="btn btn-sm btn-secondary" onclick="Pages.Library._quickReturn('${b.id}')">Return</button>`]);}).join(''), 'No active borrowings')}`;
  },

  async _quickReturn(id) {
    if(!await UI.confirm('Mark book as returned?')) return;
    const r=await API.post('/library/borrowings/return',{borrowingId:id,conditionOnReturn:'good'});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(r.message||'Book returned!');
    this._renderBorrowings($g('library-content'));
  },

  async openIssueModal(bookId, bookTitle) {
    $g('iss-book-id').value=bookId; $g('iss-book-name').textContent=bookTitle;
    $g('iss-borrower').value=''; $g('iss-borrower-id').value=''; $g('iss-results').innerHTML='';
    $g('iss-due').value=new Date(Date.now()+14*864e5).toISOString().split('T')[0];
    UI.openModal('modal-issue-book');
  },

  async searchBorrower(q) {
    const r=$g('iss-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get('/students',{search:q,limit:5}).then(r=>r?.data||r||[]).catch(()=>[]);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="$g('iss-borrower').value='${s.first_name} ${s.last_name}';$g('iss-borrower-id').value='${s.id}';$g('iss-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.admission_number}</span></div>`).join('')}</div>`;
  },

  async issueBook() {
    const r=await API.post('/library/borrowings/issue',{bookId:$g('iss-book-id')?.value,borrowerId:$g('iss-borrower-id')?.value,dueDate:$g('iss-due')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Book issued successfully!');UI.closeModal('modal-issue-book');
    this._renderBorrowings($g('library-content'));
  },

  async openReturnModal() { UI.openModal('modal-return-book'); $g('ret-id').value=''; },

  async openRenewModal() { UI.openModal('modal-renew-book'); $g('ren-id').value=''; },

  async _renderMembers(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/library/members');
    c.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Library.openRegisterModal()">+ Register Member</button>
    </div>
    ${_tblF(['Member','Type','Books Out','Outstanding Fines','Active'],
      (d||[]).map(m=>_row([`<strong>${m.first_name} ${m.last_name}</strong><div style="font-size:10px">${m.membership_number}</div>`,m.member_type,m.books_out||0,m.outstanding_fines>0?`<span style="color:var(--red)">${_money(m.outstanding_fines)}</span>`:'--',m.is_active?_badge('Active','green'):_badge('Inactive','red')])).join(''), 'No registered library members')}`;
  },

  async openRegisterModal() { $g('mem-user').value=''; $g('mem-user-id').value=''; $g('mem-results').innerHTML=''; UI.openModal('modal-reg-member'); },

  async searchMemberUser(q) {
    const r=$g('mem-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get('/students',{search:q,limit:5}).then(r=>r?.data||r||[]).catch(()=>[]);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="$g('mem-user').value='${s.first_name} ${s.last_name}';$g('mem-user-id').value='${s.id}';$g('mem-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.admission_number}</span></div>`).join('')}</div>`;
  },

  async registerMember() {
    const r=await API.post('/library/members',{userId:$g('mem-user-id')?.value,memberType:$g('mem-type')?.value||'student',maxBooks:+($g('mem-max')?.value||3)});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Member registered!');UI.closeModal('modal-reg-member');
    this._renderMembers($g('library-content'));
  },

  async _renderFines(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/library/fines');
    c.innerHTML = `<div class="alert alert-info" style="margin-bottom:12px">Fine rate: KES 5 per day overdue</div>
    ${_tblF(['Student','Book','Days Overdue','Fine','Paid','Actions'],
      (d||[]).map(f=>_row([`<strong>${f.student_name}</strong><div style="font-size:10px">${f.admission_number}</div>`,f.book_title,f.days_overdue+'d',`<strong style="color:${f.is_paid||f.waived?'var(--green)':'var(--red)'}">${_money(f.amount)}</strong>`,f.waived?_badge('Waived','amber'):f.is_paid?_badge('Paid','green'):_badge('Unpaid','red'),`<div style="display:flex;gap:4px">${!f.is_paid&&!f.waived?`<button class="btn btn-sm btn-success" onclick="Pages.Library.payFine('${f.id}')">Mark Paid</button><button class="btn btn-sm btn-ghost" onclick="Pages.Library.waiveFine('${f.id}')">Waive</button>`:''}</div>`])).join(''), 'No fines recorded')}`;
  },

  async payFine(id) { const r=await API.post('/library/fines/pay',{fineId:id}); if(r.error){Toast.error(r.error);return;} Toast.success('Fine marked paid!'); this._renderFines($g('library-content')); },
  async waiveFine(id) { const reason=prompt('Reason for waiving fine:'); if(!reason)return; const r=await API.post('/library/fines/waive',{fineId:id,reason}); if(r.error){Toast.error(r.error);return;} Toast.success('Fine waived.'); this._renderFines($g('library-content')); },

  async _renderStats(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/library/stats');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML = `<div class="stats-grid" style="margin-bottom:20px">
      ${[['Total Books',d.total_books,'📚','var(--brand)'],['Total Copies',d.total_copies,'📖','var(--blue)'],['Currently Borrowed',d.currently_borrowed,'📤','var(--amber)'],['Overdue',d.overdue,'⚠️','var(--red)'],['Active Members',d.active_members,'👥','var(--green)'],['Outstanding Fines',_money(d.outstanding_fines),'💰','var(--orange)']].map(([l,v,i,col])=>`<div class="stat-card"><div class="stat-body"><div class="stat-icon" style="color:${col}">${i}</div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
    </div>
    <div class="card"><div class="card-header"><div class="card-title">📊 Most Borrowed Books</div></div>
      ${_tblF(['Rank','Title','Author','Times Borrowed'],
        (d.topBooks||[]).map((b,i)=>_row([`#${i+1}`,`<strong>${b.title}</strong>`,b.author,b.times_borrowed])).join(''), 'No borrowing data')}
    </div>`;
  },
};

// ============================================================
// LAB INVENTORY
// ============================================================
Pages.Lab = {
  async load() { this.switchTab('items'); },

  switchTab(tab, el) {
    document.querySelectorAll('#page-lab .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-lab .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=$g('lab-content'); if(!c)return;
    if(tab==='items') this._renderItems(c);
    else if(tab==='issue') this._renderIssue(c);
    else if(tab==='experiments') this._renderExperiments(c);
    else if(tab==='alerts') this._renderAlerts(c);
    else if(tab==='report') this._renderReport(c);
  },

  async _renderItems(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/lab/items');
    const condC={good:'green',fair:'amber',poor:'red',broken:'red'};
    c.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <input type="text" placeholder="Search items…" oninput="Pages.Lab._search(this.value,${JSON.stringify(d).replace(/"/g,'&quot;')})" style="flex:1;min-width:180px;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
      <button class="btn btn-primary btn-sm" onclick="Pages.Lab.openAddItem()">+ Add Equipment</button>
    </div>
    <div id="lab-grid">${this._itemsGrid(d)}</div>`;
  },

  _itemsGrid(items) {
    if(!items.length) return UI.empty('No lab equipment','Add equipment and chemicals to track.');
    const condC={good:'green',fair:'amber',poor:'orange',broken:'red'};
    return `<div class="grid-auto">${items.map(i=>`
      <div class="card" style="border-left:3px solid var(--${condC[i.condition]||'accent'})">
        <div class="card-header"><div><div class="card-title">${i.name}</div><div class="card-subtitle">${i.code||''} ${i.category_name?'· '+i.category_name:''}</div></div>${_badge(i.condition,condC[i.condition])}</div>
        <div style="display:flex;justify-content:space-between;margin:8px 0;padding:8px;background:var(--bg-elevated);border-radius:8px">
          <div style="text-align:center"><div style="font-size:24px;font-weight:800">${i.quantity}</div><div style="font-size:10px;color:var(--text-muted)">${i.unit}</div></div>
          <div style="text-align:center;font-size:11px;color:var(--text-muted)">${i.item_type}<br>${i.location||'--'}</div>
          ${i.is_hazardous?'<div style="color:var(--red)">⚠️ Hazardous</div>':''}
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-primary" onclick="Pages.Lab.openIssueModal('${i.id}','${i.name.replace(/'/g,"\\'")}',${i.quantity})">Issue</button>
          <button class="btn btn-sm btn-ghost" onclick="Pages.Lab.viewHistory('${i.id}','${i.name.replace(/'/g,"\\'")}')">History</button>
        </div>
      </div>`).join('')}</div>`;
  },

  _search(q,items) { const g=$g('lab-grid'); if(!g)return; g.innerHTML=this._itemsGrid(q.length<2?items:items.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())||(i.code||'').toLowerCase().includes(q.toLowerCase()))); },

  async openAddItem() { UI.openModal('modal-lab-item'); const cats=await API.get('/lab/categories'); const s=$g('lab-item-cat'); if(s)s.innerHTML='<option value="">No category</option>'+(cats||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); },

  async saveItem() {
    const p={name:$g('li-name')?.value?.trim(),code:$g('li-code')?.value,categoryId:$g('lab-item-cat')?.value||null,itemType:$g('li-type')?.value||'equipment',quantity:+($g('li-qty')?.value||0),unit:$g('li-unit')?.value||'pieces',condition:$g('li-cond')?.value||'good',location:$g('li-loc')?.value,isHazardous:$g('li-hazard')?.checked||false,safetyNotes:$g('li-safety')?.value,purchaseCost:+($g('li-cost')?.value||0)||undefined};
    if(!p.name){Toast.error('Item name required');return;}
    const r=await API.post('/lab/items',p); if(r.error){Toast.error(r.error);return;}
    Toast.success('Equipment added!');UI.closeModal('modal-lab-item');this._renderItems($g('lab-content'));
  },

  async openIssueModal(id,name,qty) { $g('li-iss-id').value=id; $g('li-iss-info').innerHTML=`<strong>${name}</strong> -- Available: <strong>${qty}</strong>`; $g('li-iss-to').value='';$g('li-iss-qty').value='';$g('li-iss-exp').value=''; UI.openModal('modal-lab-issue'); },

  async issueItem() {
    const r=await API.post('/lab/transactions/issue',{itemId:$g('li-iss-id')?.value,quantity:+($g('li-iss-qty')?.value||0),issuedTo:$g('li-iss-to')?.value,purpose:$g('li-iss-purpose')?.value,experimentName:$g('li-iss-exp')?.value,returnDate:$g('li-iss-return')?.value||undefined});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`Issued! New stock: ${r.newQuantity}`);UI.closeModal('modal-lab-issue');this._renderItems($g('lab-content'));
  },

  async viewHistory(id,name) {
    const d=await API.get(`/lab/items/${id}`); if(d.error){Toast.error(d.error);return;}
    UI.showInfoModal(`${name} -- History`,`<div style="font-size:24px;font-weight:800;text-align:center;margin-bottom:12px;color:var(--brand)">${d.quantity} ${d.unit}</div>
      ${_tblF(['Date','Type','Qty','Issued To','Handled By'],
        (d.transactions||[]).map(t=>_row([_dt(t.transaction_date),_badge(t.transaction_type,'blue'),t.quantity,t.issued_to||'--',t.handled_by_name||'--'])).join(''), 'No transactions')}`);
  },

  async _renderIssue(c) { c.innerHTML='<div class="alert alert-info">Use the Items tab to issue equipment to students or teachers.</div>'; this._renderItems(c); },

  async _renderExperiments(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/lab/experiments');
    const stC={planned:'gray',in_progress:'blue',completed:'green',cancelled:'red'};
    c.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Lab.openExpModal()">+ Plan Experiment</button>
    </div>
    ${!d.length?UI.empty('No experiments planned'):_tblF(['Experiment','Status','Scheduled','Class','Teacher'],
      d.map(e=>_row([`<strong>${e.name}</strong>${e.description?`<div style="font-size:10px;color:var(--text-muted)">${e.description.substring(0,50)}…</div>`:''}`,_badge(e.status,stC[e.status]||'gray'),_date(e.scheduled_date),e.class_id||'--',e.conducted_by_name||'--'])).join(''), 'No experiments')}`;
  },

  async openExpModal() { UI.openModal('modal-lab-exp'); },

  async saveExperiment() {
    const p={name:$g('le-name')?.value?.trim(),description:$g('le-desc')?.value,objectives:$g('le-obj')?.value,scheduledDate:$g('le-date')?.value||undefined};
    if(!p.name){Toast.error('Experiment name required');return;}
    const r=await API.post('/lab/experiments',p); if(r.error){Toast.error(r.error);return;}
    Toast.success('Experiment planned!');UI.closeModal('modal-lab-exp');this._renderExperiments($g('lab-content'));
  },

  async _renderAlerts(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/lab/items/alerts');
    c.innerHTML = d.length?`<div class="alert alert-warning" style="margin-bottom:12px">⚠️ ${d.length} items need attention</div>
      ${_tblF(['Item','Category','Qty','Condition','Location','Hazardous'],
        d.map(i=>_row([`<strong>${i.name}</strong>`,i.category_name||'--',`<strong style="color:var(--${i.quantity<3?'red':'amber'})">${i.quantity} ${i.unit}</strong>`,_badge(i.condition,{good:'green',fair:'amber',poor:'red',broken:'red'}[i.condition]||'gray'),i.location||'--',i.is_hazardous?'⚠️ Yes':'No'])).join(''))}`:UI.empty('All equipment in good condition ✅');
  },

  async _renderReport(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/lab/items/report');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    const s=d.summary||{};
    c.innerHTML = `<div class="stats-grid" style="margin-bottom:20px">
      ${[['Total Items',s.total_items||0,'var(--brand)'],['Good Condition',s.good_condition||0,'var(--green)'],['Needs Attention',s.needs_attention||0,'var(--red)'],['Hazardous Items',s.hazardous_items||0,'var(--orange)'],['Total Value',_money(s.total_value),'var(--purple)']].map(([l,v,col])=>`<div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
    </div>
    ${_tblF(['Item','Type','Qty','Condition','Value','Issued/Month'],
      (d.items||[]).map(i=>_row([`<strong>${i.name}</strong>${i.code?`<div style="font-size:10px">${i.code}</div>`:''}`,i.item_type,i.quantity+' '+i.unit,_badge(i.condition,{good:'green',fair:'amber',poor:'red',broken:'red'}[i.condition]||'gray'),_money((i.quantity||0)*(i.purchase_cost||0)),i.issued_month||0])).join(''))}`;
  },
};

// ============================================================
// ALUMNI
// ============================================================
Pages.Alumni = {
  async load() { this.switchTab('profiles'); },

  switchTab(tab, el) {
    document.querySelectorAll('#page-alumni .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-alumni .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=$g('alumni-content'); if(!c)return;
    if(tab==='profiles') this._renderProfiles(c);
    else if(tab==='stats') this._renderStats(c);
    else if(tab==='events') this._renderEvents(c);
    else if(tab==='import') this._renderImport(c);
  },

  async _renderProfiles(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/alumni?limit=100');
    const list = d.data||d||[];
    c.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <input type="text" placeholder="Search name, university, employer…" id="alum-q" oninput="Pages.Alumni._search(this.value)" style="flex:1;min-width:200px;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
      <input type="number" id="alum-year" placeholder="Year…" min="1970" max="2030" style="width:100px;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)">
      <button class="btn btn-secondary btn-sm" onclick="Pages.Alumni._filterYear()">Filter</button>
      <button class="btn btn-primary btn-sm" onclick="Pages.Alumni.openAdd()">+ Add Alumni</button>
    </div>
    <div id="alumni-grid">${this._grid(list)}</div>`;
    this._all = list;
  },

  _grid(list) {
    if(!list.length) return UI.empty('No alumni','Add alumni or import in bulk.');
    return `<div class="grid-auto">${list.map(a=>`
      <div class="card">${a.is_featured?'<div style="background:var(--brand);color:#fff;font-size:9px;padding:2px 8px;border-radius:4px;margin-bottom:6px;display:inline-block">⭐ FEATURED</div>':''}
        <div class="card-header"><div class="avatar">${a.first_name[0]}</div><div><div class="card-title">${a.first_name} ${a.last_name}</div><div class="card-subtitle">Class of ${a.year_completed}${a.kcse_grade?' · '+a.kcse_grade:''}</div></div></div>
        ${a.university?`<div style="font-size:12px;margin:4px 0">🎓 ${a.university}${a.course?' -- '+a.course:''}</div>`:''}
        ${a.current_employer?`<div style="font-size:12px;margin:4px 0">💼 ${a.current_employer}${a.current_position?' · '+a.current_position:''}</div>`:''}
        ${a.industry?`<div style="font-size:11px;color:var(--text-muted)">${a.industry}</div>`:''}
        <div style="display:flex;gap:4px;margin-top:8px">
          <button class="btn btn-sm btn-secondary" onclick="Pages.Alumni.viewEdit('${a.id}')">Edit</button>
          ${a.linkedin_url?`<a href="${a.linkedin_url}" target="_blank" class="btn btn-sm btn-ghost">LinkedIn</a>`:''}
        </div>
      </div>`).join('')}</div>`;
  },

  async _search(q) { const g=$g('alumni-grid'); if(!g)return; if(q.length<2){g.innerHTML=this._grid(this._all);return;} const d=await API.get(`/alumni?q=${encodeURIComponent(q)}&limit=100`); g.innerHTML=this._grid(d.data||d||[]); },
  async _filterYear() { const y=$g('alum-year')?.value; if(!y)return; const d=await API.get(`/alumni?year=${y}&limit=200`); $g('alumni-grid').innerHTML=this._grid(d.data||d||[]); },

  openAdd() { ['an-first','an-last','an-adm','an-yr','an-grade','an-uni','an-course','an-emp','an-pos','an-ind','an-phone','an-email','an-linkedin','an-bio'].forEach(id=>{const e=$g(id);if(e)e.value='';}); this._editId=null; UI.openModal('modal-alumni'); },

  async viewEdit(id) {
    const d=await API.get(`/alumni/${id}`); if(d.error){Toast.error(d.error);return;}
    this._editId=id;
    Object.entries({'an-first':d.first_name,'an-last':d.last_name,'an-adm':d.admission_number,'an-yr':d.year_completed,'an-grade':d.kcse_grade,'an-uni':d.university,'an-course':d.course,'an-emp':d.current_employer,'an-pos':d.current_position,'an-ind':d.industry,'an-phone':d.phone,'an-email':d.email,'an-linkedin':d.linkedin_url,'an-bio':d.bio}).forEach(([k,v])=>{const e=$g(k);if(e)e.value=v||'';});
    UI.openModal('modal-alumni');
  },

  async saveAlumni() {
    const p={firstName:$g('an-first')?.value?.trim(),lastName:$g('an-last')?.value?.trim(),admissionNumber:$g('an-adm')?.value,yearCompleted:+($g('an-yr')?.value||0),kcseGrade:$g('an-grade')?.value,university:$g('an-uni')?.value,course:$g('an-course')?.value,currentEmployer:$g('an-emp')?.value,currentPosition:$g('an-pos')?.value,industry:$g('an-ind')?.value,phone:$g('an-phone')?.value,email:$g('an-email')?.value,linkedinUrl:$g('an-linkedin')?.value,bio:$g('an-bio')?.value};
    if(!p.firstName||!p.lastName||!p.yearCompleted){Toast.error('Name and year required');return;}
    const r=this._editId?await API.put(`/alumni/${this._editId}`,p):await API.post('/alumni',p);
    if(r.error){Toast.error(r.error);return;}
    Toast.success(this._editId?'Updated!':'Alumni added!');UI.closeModal('modal-alumni');this._renderProfiles($g('alumni-content'));
  },

  async _renderStats(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/alumni/stats');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML = `<div class="stats-grid" style="margin-bottom:20px">
      ${[['Total Alumni',d.total,'🎓','var(--brand)'],['Years Represented',d.years,'📅','var(--blue)'],['In University',d.in_university,'🏫','var(--green)'],['Employed',d.employed,'💼','var(--purple)'],['Avg KCSE Points',parseFloat(d.avg_kcse||0).toFixed(2),'📊','var(--cyan)']].map(([l,v,i,col])=>`<div class="stat-card"><div class="stat-body"><div class="stat-icon" style="color:${col}">${i}</div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
    </div>
    <div class="grid-2">
      <div class="card"><div class="card-header"><div class="card-title">Top Industries</div></div>
        ${(d.industries||[]).map((ind,i)=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:12px"><span>#${i+1} ${ind.industry}</span><strong>${ind.count}</strong></div>`).join('')||'<div style="color:var(--text-muted);font-size:12px">No data</div>'}
      </div>
      <div class="card"><div class="card-header"><div class="card-title">By Graduation Year</div></div>
        ${(d.byYear||[]).map(y=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:12px"><span>Class of ${y.year_completed}</span><strong>${y.count}</strong></div>`).join('')||'<div style="color:var(--text-muted);font-size:12px">No data</div>'}
      </div>
    </div>`;
  },

  async _renderEvents(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/alumni/events');
    c.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Alumni.openEvent()">+ Create Event</button>
    </div>
    ${!d.length?UI.empty('No alumni events','Plan a reunion or networking event.'):_tblF(['Event','Date','Type','RSVPs','Organizer'],
      d.map(e=>_row([`<strong>${e.title}</strong>${e.location?`<div style="font-size:10px">${e.location}</div>`:''}`,_date(e.event_date),_badge(e.event_type,'blue'),e.rsvp_count||0,e.organizer_name||'--'])).join(''))}`;
  },

  async openEvent() { ['ae-title','ae-desc','ae-date','ae-loc'].forEach(id=>{const e=$g(id);if(e)e.value='';}); UI.openModal('modal-alumni-event'); },

  async saveEvent() {
    const p={title:$g('ae-title')?.value?.trim(),description:$g('ae-desc')?.value,eventDate:$g('ae-date')?.value,location:$g('ae-loc')?.value,eventType:$g('ae-type')?.value||'reunion'};
    if(!p.title||!p.eventDate){Toast.error('Title and date required');return;}
    const r=await API.post('/alumni/events',p); if(r.error){Toast.error(r.error);return;}
    Toast.success('Event created!');UI.closeModal('modal-alumni-event');this._renderEvents($g('alumni-content'));
  },

  _renderImport(c) {
    c.innerHTML = `<div class="card"><div class="card-header"><div class="card-title">Bulk Import Alumni</div></div>
      <p style="font-size:13px;color:var(--text-secondary)">Paste JSON array of alumni records. Each record must have: firstName, lastName, yearCompleted. Optional: admissionNumber, kcseGrade, university, currentEmployer, industry.</p>
      <textarea id="import-json" style="width:100%;height:200px;padding:10px;font-family:monospace;font-size:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary);margin:10px 0" placeholder='[{"firstName":"John","lastName":"Doe","yearCompleted":2018,"kcseGrade":"A","university":"University of Nairobi"}]'></textarea>
      <div id="import-result"></div>
      <button class="btn btn-primary" onclick="Pages.Alumni.doImport()">Import Alumni</button>
    </div>`;
  },

  async doImport() {
    try {
      const raw=$g('import-json')?.value?.trim(); if(!raw)return;
      const alumni=JSON.parse(raw);
      const r=await API.post('/alumni/bulk-import',{alumni});
      if(r.error){Toast.error(r.error);return;}
      $g('import-result').innerHTML=`<div class="alert alert-success">✅ Imported ${r.imported} records. Skipped ${r.skipped}.</div>`;
      Toast.success(`Imported ${r.imported} alumni!`);
    } catch(e){Toast.error('Invalid JSON: '+e.message);}
  },
};

// ============================================================
// WHATSAPP & FCM / PUSH NOTIFICATIONS
// ============================================================
Pages.Messaging = {
  async load() { this.switchTab('whatsapp'); },

  switchTab(tab, el) {
    document.querySelectorAll('#page-messaging .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-messaging .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=$g('messaging-content'); if(!c)return;
    if(tab==='whatsapp') this._renderWhatsapp(c);
    else if(tab==='push') this._renderPush(c);
    else if(tab==='history') this._renderHistory(c);
    else if(tab==='config') this._renderConfig(c);
  },

  async _renderWhatsapp(c) {
    const cfg = await API.get('/channels/whatsapp/config');
    c.innerHTML = `
      ${!cfg.is_active?`<div class="alert alert-warning">WhatsApp not configured. <a href="#" onclick="Pages.Messaging.switchTab('config')">Configure now →</a></div>`:''}
      <div class="grid-2" style="margin-bottom:16px">
        <div class="card"><div class="card-header"><div class="card-title">💬 Send WhatsApp Message</div></div>
          <div class="form-group"><label>Recipient Phone</label><input type="tel" id="wa-phone" placeholder="+254712345678"></div>
          <div class="form-group"><label>Recipient Name (optional)</label><input type="text" id="wa-name"></div>
          <div class="form-group"><label>Message</label><textarea id="wa-msg" rows="4" placeholder="Type your message…" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
          <button class="btn btn-primary w-full" onclick="Pages.Messaging.sendWA()">Send WhatsApp</button>
        </div>
        <div class="card"><div class="card-header"><div class="card-title">📣 Bulk WhatsApp</div></div>
          <div class="form-group"><label>Target Group</label><select id="wa-bulk-target" style="width:100%"><option value="parents">All Parents</option><option value="staff">All Staff</option></select></div>
          <div class="form-group"><label>Message</label><textarea id="wa-bulk-msg" rows="4" placeholder="Broadcast message…" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
          <div class="alert alert-info" style="font-size:12px">This will send to all registered phone numbers for the selected group.</div>
          <button class="btn btn-warning w-full" onclick="Pages.Messaging.sendBulkWA()">Send Bulk WhatsApp</button>
        </div>
      </div>
      <div id="wa-result"></div>`;
  },

  async sendWA() {
    const r=await API.post('/channels/whatsapp/send',{recipientPhone:$g('wa-phone')?.value,recipientName:$g('wa-name')?.value,message:$g('wa-msg')?.value});
    const d=$g('wa-result');
    if(r.error){d.innerHTML=`<div class="alert alert-danger">${r.error}</div>`;return;}
    d.innerHTML=`<div class="alert alert-success">✅ Message ${r.status}!</div>`;
    $g('wa-phone').value='';$g('wa-msg').value='';
  },

  async sendBulkWA() {
    if(!await UI.confirm(`Send WhatsApp to all ${$g('wa-bulk-target')?.value}?`))return;
    const r=await API.post('/channels/whatsapp/bulk',{targetType:$g('wa-bulk-target')?.value,message:$g('wa-bulk-msg')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`Sent: ${r.sent} · Failed: ${r.failed} of ${r.total}`);
  },

  async _renderPush(c) {
    c.innerHTML = `<div class="grid-2">
      <div class="card"><div class="card-header"><div class="card-title">🔔 Send Push Notification</div></div>
        <div class="form-group"><label>Title</label><input type="text" id="pn-title" placeholder="Notification title…"></div>
        <div class="form-group"><label>Body</label><textarea id="pn-body" rows="3" placeholder="Notification message…" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
        <div class="form-group"><label>Target</label><select id="pn-target" style="width:100%"><option value="all">Everyone</option><option value="role">By Role</option></select></div>
        <button class="btn btn-primary w-full" onclick="Pages.Messaging.sendPush()">Send Push Notification</button>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">ℹ️ About Push Notifications</div></div>
        <p style="font-size:13px;color:var(--text-secondary)">Push notifications are sent via Firebase Cloud Messaging (FCM) to users who have enabled notifications in their browser or app.</p>
        <p style="font-size:13px;color:var(--text-secondary)">To enable, configure your FCM Server Key in the Config tab, then users will be prompted to allow notifications when they log in.</p>
        <button class="btn btn-secondary w-full" onclick="Pages.Messaging.switchTab('config')">Configure FCM →</button>
      </div>
    </div>
    <div id="pn-history-preview" style="margin-top:16px">${UI.loading()}</div>`;
    const d = await API.get('/channels/fcm/history');
    $g('pn-history-preview').innerHTML = _tblF(['Title','Body','Sent','Failed','Date'],
      (d||[]).slice(0,10).map(n=>_row([`<strong>${n.title}</strong>`,n.body?.substring(0,50)+'…',n.sent_count,n.failed_count,_date(n.sent_at||n.created_at)])).join(''), 'No push notification history');
  },

  async sendPush() {
    const r=await API.post('/channels/fcm/send',{title:$g('pn-title')?.value,body:$g('pn-body')?.value,targetType:$g('pn-target')?.value||'all'});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`Push sent! ${r.sentCount} delivered, ${r.failedCount} failed. ${r.totalTokens} total devices.`);
  },

  async _renderHistory(c) {
    c.innerHTML = UI.loading();
    const d = await API.get('/channels/whatsapp/messages');
    const stC={sent:'green',failed:'red',queued:'amber',received:'blue'};
    c.innerHTML = _tblF(['To','Message','Status','Direction','Date'],
      (d||[]).map(m=>_row([`<strong>${m.recipient_name||m.recipient_phone}</strong><div style="font-size:10px">${m.recipient_phone}</div>`,`<span style="font-size:12px">${(m.message||'').substring(0,60)}${m.message?.length>60?'…':''}</span>`,_badge(m.status,stC[m.status]||'gray'),_badge(m.direction,'cyan'),_date(m.created_at)])).join(''), 'No messages sent yet');
  },

  async _renderConfig(c) {
    const cfg=await API.get('/channels/whatsapp/config');
    c.innerHTML = `<div class="grid-2">
      <div class="card"><div class="card-header"><div class="card-title">📱 WhatsApp (Twilio)</div></div>
        <div class="alert alert-info" style="font-size:12px">Requires a Twilio account with WhatsApp sandbox or approved sender. <a href="https://console.twilio.com" target="_blank">Get credentials →</a></div>
        <div class="form-group"><label>Provider</label><select id="wa-provider" style="width:100%"><option value="twilio">Twilio</option></select></div>
        <div class="form-group"><label>Account SID</label><input type="text" id="wa-sid" value="${cfg.account_sid||''}" placeholder="ACxxxxxxxxxxxxxxxxx"></div>
        <div class="form-group"><label>Auth Token</label><input type="password" id="wa-token" placeholder="••••••••••••••••"></div>
        <div class="form-group"><label>WhatsApp Number</label><input type="text" id="wa-num" value="${cfg.whatsapp_number||''}" placeholder="+14155238886"></div>
        <button class="btn btn-primary w-full" onclick="Pages.Messaging.saveWAConfig()">Save WhatsApp Config</button>
      </div>
      <div class="card"><div class="card-header"><div class="card-title">🔔 Firebase FCM</div></div>
        <div class="alert alert-info" style="font-size:12px">Get your FCM Server Key from <a href="https://console.firebase.google.com" target="_blank">Firebase Console</a> → Project Settings → Cloud Messaging.</div>
        <div class="form-group"><label>FCM Server Key</label><input type="password" id="fcm-key" placeholder="AAAA…" style="font-size:12px"></div>
        <div class="form-group"><label>VAPID Public Key</label><input type="text" id="fcm-vapid" placeholder="BNn…" style="font-size:12px"></div>
        <button class="btn btn-primary w-full" onclick="Pages.Messaging.saveFCMConfig()">Save FCM Config</button>
      </div>
    </div>`;
  },

  async saveWAConfig() {
    const r=await API.post('/channels/whatsapp/config',{provider:'twilio',accountSid:$g('wa-sid')?.value,authToken:$g('wa-token')?.value,whatsappNumber:$g('wa-num')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('WhatsApp configured!');
  },

  async saveFCMConfig() {
    const r=await API.post('/channels/fcm/config',{fcmServerKey:$g('fcm-key')?.value,vapidPublicKey:$g('fcm-vapid')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('FCM configured!');
  },
};

// ============================================================
// CERTIFICATES -- Full
// ============================================================
Pages.Certificates = {
  async load() { this.switchTab('list'); },

  switchTab(tab,el) {
    document.querySelectorAll('#page-certificates .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-certificates .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=$g('certs-content'); if(!c)return;
    if(tab==='list') this._renderList(c);
    else if(tab==='issue') this._renderIssue(c);
    else if(tab==='bulk') this._renderBulk(c);
    else if(tab==='stats') this._renderStats(c);
  },

  async _renderList(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/certificates?limit=200');
    const tyC={academic:'blue',sports:'green',leadership:'purple',participation:'cyan',behaviour:'amber',other:'gray'};
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <select id="cert-f-type" onchange="Pages.Certificates._filter()" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary);font-size:12px"><option value="">All Types</option><option value="academic">Academic</option><option value="sports">Sports</option><option value="leadership">Leadership</option><option value="participation">Participation</option><option value="behaviour">Behaviour</option></select>
      <button class="btn btn-primary btn-sm" onclick="Pages.Certificates.switchTab('issue')">+ Issue Certificate</button>
      <button class="btn btn-secondary btn-sm" onclick="Pages.Certificates.switchTab('bulk')">Bulk Issue</button>
    </div>
    <div id="certs-grid">${this._certsGrid(d)}</div>`;
    this._all=d;
  },

  _certsGrid(list) {
    if(!list.length) return UI.empty('No certificates issued','Issue your first certificate.');
    return `<div class="grid-auto">${list.map(cert=>`
      <div class="card">
        <div class="card-header"><div><div class="card-title">${cert.title}</div><div class="card-subtitle">${cert.student_name} · ${cert.admission_number}</div></div>${_badge(cert.type,'blue')}</div>
        <div style="font-size:11px;color:var(--text-muted);margin:6px 0">No: ${cert.certificate_number||'--'} · ${_date(cert.issued_date)}</div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-primary" onclick="Pages.Certificates.viewCert('${cert.id}')">🖨 Print</button>
          <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Certificates.revoke('${cert.id}')">Revoke</button>
        </div>
      </div>`).join('')}</div>`;
  },

  async _filter() { const t=$g('cert-f-type')?.value; $g('certs-grid').innerHTML=this._certsGrid(t?this._all.filter(c=>c.type===t):this._all); },

  async _renderIssue(c) {
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">Issue Certificate</div></div>
      <div class="form-group"><label>Student</label><input type="text" id="ci-student" placeholder="Search student…" oninput="Pages.Certificates._searchStudent(this.value)"><div id="ci-results"></div><input type="hidden" id="ci-student-id"></div>
      <div class="grid-2">
        <div class="form-group"><label>Type</label><select id="ci-type" style="width:100%"><option value="academic">Academic</option><option value="sports">Sports</option><option value="leadership">Leadership</option><option value="participation">Participation</option><option value="behaviour">Behaviour</option></select></div>
        <div class="form-group"><label>Template</label><select id="ci-template" style="width:100%"><option value="standard">Standard (Gold)</option><option value="modern">Modern (Dark)</option></select></div>
      </div>
      <div class="form-group"><label>Title</label><input type="text" id="ci-title" placeholder="e.g. Best Student in Mathematics"></div>
      <div class="form-group"><label>Description (optional)</label><textarea id="ci-desc" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
      <div class="grid-2">
        <div class="form-group"><label>Position (optional)</label><input type="text" id="ci-pos" placeholder="e.g. 1st Place"></div>
        <div class="form-group"><label>Signed By</label><input type="text" id="ci-signed" placeholder="Principal's name"></div>
      </div>
      <div class="form-group"><label>Issued Date</label><input type="date" id="ci-date" value="${new Date().toISOString().split('T')[0]}"></div>
      <button class="btn btn-primary" onclick="Pages.Certificates.issueCert()">Issue & Preview</button>
    </div>`;
  },

  async _searchStudent(q) {
    const r=$g('ci-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get('/students',{search:q,limit:5}).then(r=>r?.data||r||[]).catch(()=>[]);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="$g('ci-student').value='${s.first_name} ${s.last_name}';$g('ci-student-id').value='${s.id}';$g('ci-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.admission_number}</span></div>`).join('')}</div>`;
  },

  async issueCert() {
    const sid=$g('ci-student-id')?.value; if(!sid){Toast.error('Select a student');return;}
    const r=await API.post('/certificates',{studentId:sid,type:$g('ci-type')?.value,title:$g('ci-title')?.value,description:$g('ci-desc')?.value,position:$g('ci-pos')?.value,signedBy:$g('ci-signed')?.value,issuedDate:$g('ci-date')?.value,templateId:$g('ci-template')?.value||'standard'});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Certificate issued!');
    const w=window.open('','_blank'); w.document.write(`<!DOCTYPE html><html><head><title>Certificate</title><style>body{margin:0;padding:20px;background:#fff}@media print{body{padding:0;margin:0}}</style></head><body>${r.html}<script>window.onload=()=>setTimeout(()=>window.print(),600)<\/script></body></html>`); w.document.close();
  },

  async viewCert(id) {
    const d=await API.get(`/certificates/${id}`); if(d.error){Toast.error(d.error);return;}
    const html=d.html_content||'<p>No preview available</p>';
    const w=window.open('','_blank'); w.document.write(`<!DOCTYPE html><html><head><title>${d.title}</title><style>body{margin:0;padding:20px;background:#fff}@media print{body{padding:0;margin:0}}</style></head><body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),600)<\/script></body></html>`); w.document.close();
  },

  async revoke(id) {
    const r=prompt('Reason for revoking this certificate:'); if(!r)return;
    const res=await API.put(`/certificates/${id}/revoke`,{reason:r}); if(res.error){Toast.error(res.error);return;}
    Toast.success('Certificate revoked.'); this._renderList($g('certs-content'));
  },

  async _renderBulk(c) {
    const classes=await API.get('/academics/classes');
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">Bulk Issue Certificates</div></div>
      <div class="form-group"><label>Class</label><select id="cb-class" onchange="Pages.Certificates._loadClassStudents(this.value)" style="width:100%"><option value="">Select class…</option>${(classes||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('')}</select></div>
      <div class="form-group"><label>Type</label><select id="cb-type" style="width:100%"><option value="academic">Academic</option><option value="participation">Participation</option><option value="sports">Sports</option><option value="leadership">Leadership</option></select></div>
      <div class="form-group"><label>Title</label><input type="text" id="cb-title" placeholder="e.g. Certificate of Participation -- Term 1 2025"></div>
      <div class="form-group"><label>Signed By</label><input type="text" id="cb-signed"></div>
      <div id="cb-students"></div>
      <button class="btn btn-primary" onclick="Pages.Certificates.issueBulk()" style="margin-top:12px">Issue to All Selected</button>
    </div>`;
  },

  async _loadClassStudents(classId) {
    const c=$g('cb-students'); if(!c)return;
    const d=await API.get(`/students?classId=${classId}&limit=200`);
    const list=d.data||[];
    c.innerHTML=`<div style="margin:10px 0"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;margin-bottom:8px"><input type="checkbox" id="cb-all" onchange="document.querySelectorAll('.cb-student').forEach(x=>x.checked=this.checked)"> Select All (${list.length} students)</label>
      <div style="max-height:280px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:8px">${list.map(s=>`<label style="display:flex;align-items:center;gap:6px;padding:4px;cursor:pointer;font-size:12px"><input type="checkbox" class="cb-student" value="${s.id}" checked> ${s.first_name} ${s.last_name} <span style="color:var(--text-muted)">${s.admission_number}</span></label>`).join('')}</div></div>`;
    this._bulkStudents=list;
  },

  async issueBulk() {
    const ids=[...document.querySelectorAll('.cb-student:checked')].map(x=>x.value);
    if(!ids.length){Toast.error('Select at least one student');return;}
    const r=await API.post('/certificates/batch',{studentIds:ids,type:$g('cb-type')?.value,title:$g('cb-title')?.value,signedBy:$g('cb-signed')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`✅ Issued ${r.issued} certificates! Skipped ${r.skipped}.`);
  },

  async _renderStats(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/certificates/stats');
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card"><div class="stat-body"><div class="stat-value">${d.total||0}</div><div class="stat-label">Total Issued</div></div></div>
      ${(d.byType||[]).map(t=>`<div class="stat-card"><div class="stat-body"><div class="stat-value">${t.count}</div><div class="stat-label">${t.type} certs</div></div></div>`).join('')}
    </div>`;
  },
};

// ============================================================
// LEAVE-OUT -- Full Workflow
// ============================================================
Pages.Leaveout = {
  async load() { this.switchTab('requests'); },

  switchTab(tab,el) {
    document.querySelectorAll('#page-leaveout .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-leaveout .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=$g('leaveout-content'); if(!c)return;
    if(tab==='requests') this._renderRequests(c);
    else if(tab==='pending') this._renderPending(c);
    else if(tab==='new') this._renderNew(c);
  },

  async _renderRequests(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/leaveout?limit=100');
    const stC={pending:'amber',class_teacher_approved:'blue',dean_approved:'cyan',approved:'green',rejected:'red',departed:'purple',returned:'gray',returned_late:'orange'};
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="btn btn-primary btn-sm" onclick="Pages.Leaveout.switchTab('new')">+ New Request</button>
    </div>
    ${_tblF(['Student','Class','Destination','Departure','Return','Escort','Status','Actions'],
      d.map(lr=>_row([`<strong>${lr.student_name}</strong><div style="font-size:10px">${lr.admission_number}</div>`,lr.class_name||'--',lr.destination,_dt(lr.departure_datetime),_dt(lr.expected_return_datetime),lr.escort_name||'--',_badge((lr.status||'').replace(/_/g,' '),stC[lr.status]||'gray'),
      `<div style="display:flex;gap:3px">
        ${lr.status==='pending'?`<button class="btn btn-sm btn-success" onclick="Pages.Leaveout.approve('${lr.id}')">Approve</button>`:''} 
        ${lr.status==='approved'?`<button class="btn btn-sm btn-primary" onclick="Pages.Leaveout.gatePass('${lr.id}')">Gate Pass</button>`:''}
        ${lr.status==='departed'?`<button class="btn btn-sm btn-secondary" onclick="Pages.Leaveout.recordReturn('${lr.id}')">Return</button>`:''}
        <button class="btn btn-sm btn-ghost" onclick="Pages.Leaveout.printSheet('${lr.id}')">Print</button>
      </div>`])).join(''), 'No leave requests')}`;
  },

  async _renderPending(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/leaveout?pending=true');
    c.innerHTML=`${d.length?`<div class="alert alert-warning">${d.length} requests pending your approval</div>`:UI.empty('No pending requests ✅')}
    ${d.length?_tblF(['Student','Destination','Reason','Escort','Departure','Action'],
      d.map(lr=>_row([`<strong>${lr.student_name}</strong>`,lr.destination,lr.reason||'--',`${lr.escort_name||'--'} ${lr.escort_phone?'('+lr.escort_phone+')':''}`,_dt(lr.departure_datetime),`<div style="display:flex;gap:4px"><button class="btn btn-sm btn-success" onclick="Pages.Leaveout.approve('${lr.id}')">Approve</button><button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Leaveout.reject('${lr.id}')">Reject</button></div>`])).join('')):''}`;
  },

  _renderNew(c) {
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">New Leave-Out Request</div></div>
      <div class="form-group"><label>Student</label><input type="text" id="lo-student" placeholder="Search student…" oninput="Pages.Leaveout._searchStudent(this.value)"><div id="lo-s-results"></div><input type="hidden" id="lo-student-id"></div>
      <div class="grid-2">
        <div class="form-group"><label>Departure</label><input type="datetime-local" id="lo-departure"></div>
        <div class="form-group"><label>Expected Return</label><input type="datetime-local" id="lo-return"></div>
      </div>
      <div class="form-group"><label>Destination</label><input type="text" id="lo-destination" placeholder="Where is the student going?"></div>
      <div class="form-group"><label>Reason</label><input type="text" id="lo-reason" placeholder="Reason for leave-out"></div>
      <div class="grid-3">
        <div class="form-group"><label>Escort Name</label><input type="text" id="lo-escort"></div>
        <div class="form-group"><label>Escort Phone</label><input type="tel" id="lo-escort-phone"></div>
        <div class="form-group"><label>Relationship</label><input type="text" id="lo-escort-rel" placeholder="e.g. Father"></div>
      </div>
      <div class="form-group"><label>Emergency Contact</label><input type="tel" id="lo-emergency"></div>
      <button class="btn btn-primary" onclick="Pages.Leaveout.saveRequest()">Submit Request</button>
    </div>`;
    const now=new Date(); now.setHours(now.getHours()+1);
    $g('lo-departure').value=now.toISOString().slice(0,16);
    now.setHours(now.getHours()+5);
    $g('lo-return').value=now.toISOString().slice(0,16);
  },

  async _searchStudent(q) {
    const r=$g('lo-s-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get('/students',{search:q,limit:5}).then(r=>r?.data||r||[]).catch(()=>[]);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="$g('lo-student').value='${s.first_name} ${s.last_name}';$g('lo-student-id').value='${s.id}';$g('lo-s-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.admission_number} · ${s.class_name||''}</span></div>`).join('')}</div>`;
  },

  async saveRequest() {
    const r=await API.post('/leaveout',{studentId:$g('lo-student-id')?.value,departureDatetime:$g('lo-departure')?.value,expectedReturnDatetime:$g('lo-return')?.value,destination:$g('lo-destination')?.value,reason:$g('lo-reason')?.value,escortName:$g('lo-escort')?.value,escortPhone:$g('lo-escort-phone')?.value,escortRelationship:$g('lo-escort-rel')?.value,emergencyContact:$g('lo-emergency')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Leave request submitted!');this._renderRequests($g('leaveout-content'));
  },

  async approve(id) { const r=await API.put(`/leaveout/${id}/approve`,{action:'approve'}); if(r.error){Toast.error(r.error);return;} Toast.success('Approved!'); this._renderRequests($g('leaveout-content')); },
  async reject(id) { const reason=prompt('Reason for rejection:'); if(!reason)return; const r=await API.put(`/leaveout/${id}/approve`,{action:'reject',remarks:reason}); if(r.error){Toast.error(r.error);return;} Toast.success('Rejected.'); this._renderPending($g('leaveout-content')); },
  async gatePass(id) { const r=await API.put(`/leaveout/${id}/gate`,{}); if(r.error){Toast.error(r.error);return;} Toast.success('Gate cleared -- student departed.'); this._renderRequests($g('leaveout-content')); },
  async recordReturn(id) { const r=await API.put(`/leaveout/${id}/return`,{}); if(r.error){Toast.error(r.error);return;} Toast.success(r.message||'Return recorded!'); this._renderRequests($g('leaveout-content')); },

  async printSheet(id) {
    const d=await API.get(`/leaveout/${id}/print`); if(d.error){Toast.error(d.error);return;}
    if(d.printHtml){const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><title>Leave Sheet</title><style>body{margin:0;padding:20px;background:#fff}@media print{body{padding:0;margin:0}}</style></head><body>${d.printHtml}<script>window.onload=()=>setTimeout(()=>window.print(),600)<\/script></body></html>`);w.document.close();}
  },
};

// ============================================================
// PARENT PORTAL -- Full
// ============================================================
Pages.ParentPortal = {
  _selectedChild: null,

  async load() {
    const c=$g('parent-content'); if(!c)return;
    c.innerHTML=UI.loading();
    const d=await API.get('/parent/dashboard');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    const {children=[],alerts=[]}=d;
    if(!children.length){
      c.innerHTML=UI.empty('No children linked','Your children will appear here once the school links your account.');
      return;
    }
    this._selectedChild=children[0].id;
    c.innerHTML=`
      ${alerts.length?`<div class="alert alert-warning">⚠️ ${alerts.length} alert(s) require your attention: ${alerts.map(a=>`<div>${a.studentName}: ${a.message}</div>`).join('')}</div>`:''}
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        ${children.map(ch=>`<button class="btn ${this._selectedChild===ch.id?'btn-primary':'btn-secondary'}" onclick="Pages.ParentPortal.selectChild('${ch.id}',this)">${ch.first_name} ${ch.last_name}<div style="font-size:9px;opacity:.7">${ch.class_name||'--'}</div></button>`).join('')}
      </div>
      <div id="child-tabs" style="display:flex;gap:4px;margin-bottom:14px;flex-wrap:wrap">
        ${[['overview','Overview'],['grades','Grades'],['attendance','Attendance'],['fees','Fees'],['timetable','Timetable'],['discipline','Conduct']].map(([t,l])=>`<button class="tab" data-tab="${t}" onclick="Pages.ParentPortal.loadTab('${t}',this)">${l}</button>`).join('')}
      </div>
      <div id="child-tab-content">${UI.loading()}</div>`;
    this.loadTab('overview',document.querySelector('#child-tabs .tab'));
  },

  selectChild(id,btn) {
    this._selectedChild=id;
    document.querySelectorAll('#parent-content>div:nth-child(2) button').forEach(b=>b.className=b===btn?'btn btn-primary':'btn btn-secondary');
    this.loadTab(document.querySelector('#child-tabs .tab.active')?.dataset?.tab||'overview',document.querySelector('#child-tabs .tab.active'));
  },

  async loadTab(tab,el) {
    document.querySelectorAll('#child-tabs .tab').forEach(t=>t.classList.remove('active'));
    if(el)el.classList.add('active');
    const c=$g('child-tab-content'); if(!c)return;
    const id=this._selectedChild; if(!id){c.innerHTML=UI.empty('Select a child');return;}
    c.innerHTML=UI.loading();
    if(tab==='overview') await this._loadOverview(c,id);
    else if(tab==='grades') await this._loadGrades(c,id);
    else if(tab==='attendance') await this._loadAttendance(c,id);
    else if(tab==='fees') await this._loadFees(c,id);
    else if(tab==='timetable') await this._loadTimetable(c,id);
    else if(tab==='discipline') await this._loadDiscipline(c,id);
  },

  async _loadOverview(c,id) {
    const [grades,att,fees]=await Promise.all([API.get(`/parent/children/${id}/grades`),API.get(`/parent/children/${id}/attendance`),API.get(`/parent/children/${id}/fees`)]);
    const avgMark=grades.length?(grades.reduce((a,g)=>a+(parseFloat(g.marks)||0),0)/grades.length).toFixed(1):0;
    const balance=parseFloat(fees.balance||0);
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:16px">
      ${[['Average Marks',avgMark+'%','📊','var(--brand)'],['Attendance Rate',att.summary?.rate+'%' ||'--','✅','var(--green)'],['Fee Balance',_money(balance),'💰',balance>0?'var(--red)':'var(--green)'],['Days Present',att.summary?.present||0,'📅','var(--blue)']].map(([l,v,i,col])=>`<div class="stat-card"><div class="stat-body"><div style="font-size:20px">${i}</div><div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary btn-sm" onclick="Pages.ParentPortal.openMeetingModal()">📅 Request Meeting</button>
    </div>`;
  },

  async _loadGrades(c,id) {
    const d=await API.get(`/parent/children/${id}/grades`);
    c.innerHTML=_tblF(['Subject','Exam','Marks','Grade','Term','Year'],
      d.map(g=>_row([g.subject_name,g.exam_name,g.marks,g.grade||'--',g.term,g.year])).join(''), 'No grades available');
  },

  async _loadAttendance(c,id) {
    const d=await API.get(`/parent/children/${id}/attendance`);
    const {records=[],summary={}}=d;
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:12px">
      ${[['Total Days',summary.total||0,'var(--brand)'],['Present',summary.present||0,'var(--green)'],['Absent',summary.absent||0,'var(--red)'],['Rate',summary.rate+'%','var(--blue)']].map(([l,v,col])=>`<div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
    </div>
    ${_tblF(['Date','Status','Marked By'],
      records.map(r=>_row([_date(r.date),_badge(r.status,r.status==='present'?'green':'red'),r.marked_by_name||'--'])).join(''), 'No attendance records')}`;
  },

  async _loadFees(c,id) {
    const d=await API.get(`/parent/children/${id}/fees`);
    const balance=parseFloat(d.balance||0);
    c.innerHTML=`<div style="padding:16px;background:var(--${balance>0?'red':'green'}-subtle||var(--brand-subtle));border-radius:10px;text-align:center;margin-bottom:16px">
      <div style="font-size:28px;font-weight:800;color:var(--${balance>0?'red':'green'})">${_money(balance)}</div>
      <div style="font-size:13px;color:var(--text-secondary)">${balance>0?'Outstanding Balance':'Fully Paid ✅'}</div>
    </div>
    ${_tblF(['Invoice','Amount Due','Paid','Balance','Status'],
      (d.invoices||[]).map(inv=>{const bal=parseFloat(inv.amount_due)-parseFloat(inv.amount_paid||0);return _row([inv.invoice_number,_money(inv.amount_due),_money(inv.amount_paid||0),`<strong style="color:${bal>0?'var(--red)':'var(--green)'}">${_money(bal)}</strong>`,_badge(inv.status||'unpaid',{paid:'green',partial:'amber',unpaid:'red'}[inv.status]||'red')]);}).join(''), 'No invoices')}`;
  },

  async _loadTimetable(c,id) {
    const d=await API.get(`/parent/children/${id}/timetable`);
    const days=['Monday','Tuesday','Wednesday','Thursday','Friday'];
    c.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:var(--bg-elevated)"><th style="padding:8px">Period</th>${days.map(d=>`<th style="padding:8px">${d}</th>`).join('')}</tr></thead><tbody>
      ${[1,2,3,4,5,6,7,8,9].map(p=>`<tr><td style="padding:6px 8px;font-weight:600;border-bottom:1px solid var(--border-subtle)">${p}</td>${days.map((_,di)=>{const slot=d.find(s=>s.period_number===p&&s.day_of_week===di+1);return `<td style="padding:6px 8px;border-bottom:1px solid var(--border-subtle)">${slot?`<div style="font-size:11px"><strong>${slot.subject_name}</strong><div style="color:var(--text-muted)">${slot.teacher_name||''}</div></div>`:''}</td>`;}).join('')}</tr>`).join('')}
    </tbody></table></div>`;
  },

  async _loadDiscipline(c,id) {
    const d=await API.get(`/parent/children/${id}/discipline`);
    c.innerHTML=!d.length?UI.empty('No discipline incidents ✅','Your child has a clean record.'):
      `<div class="alert alert-warning" style="margin-bottom:12px">${d.length} incident(s) on record</div>
      ${_tblF(['Date','Type','Severity','Action Taken','Resolved'],
        d.map(i=>_row([_date(i.incident_date),i.incident_type,_badge(i.severity,{critical:'red',serious:'orange',moderate:'amber',minor:'gray'}[i.severity]||'gray'),i.action_taken||'--',i.resolved?_badge('Yes','green'):_badge('Pending','amber')])).join(''))}`;
  },

  openMeetingModal() { UI.openModal('modal-meeting-request'); },

  async saveMeeting() {
    const r=await API.post('/parent/meeting-requests',{studentId:this._selectedChild,subject:$g('mr-subject')?.value,message:$g('mr-message')?.value,preferredDate:$g('mr-date')?.value,preferredTime:$g('mr-time')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Meeting request sent!');UI.closeModal('modal-meeting-request');
  },
};

console.log('✅ ElimuSaaS Complete Feature Pages loaded -- 12 modules ready');
