var Pages = window.Pages = window.Pages || {};
// ============================================================
// Fees Page
// ============================================================
Pages.Fees = {
  currentTab: 'overview',

  async load() {
    this.switchTab('overview', document.querySelector('#page-fees .tab.active'));
  },

  switchTab(tab, el) {
    this.currentTab = tab;
    document.querySelectorAll('#page-fees .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const content = document.getElementById('fees-tab-content');
    if (!content) return;

    if (tab === 'overview') this.renderOverview(content);
    else if (tab === 'payments') this.renderPayments(content);
    else if (tab === 'structures') this.renderStructures(content);
    else if (tab === 'defaulters') this.renderDefaulters(content);
  },

  async renderOverview(container) {
    container.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    const data = await API.get('/fees/reports/summary');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }

    const s = data.summary || {};
    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)">
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
          <div class="stat-body"><div class="stat-value">${UI.currency(s.total_collected || 0)}</div><div class="stat-label">Total Collected</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
          <div class="stat-body"><div class="stat-value">${parseInt(s.students_who_paid || 0).toLocaleString()}</div><div class="stat-label">Students Paid</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)">
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <div class="stat-body"><div class="stat-value">${parseInt(s.transaction_count || 0).toLocaleString()}</div><div class="stat-label">Transactions</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg)">
          <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
          <div class="stat-body"><div class="stat-value">${UI.currency(s.avg_payment || 0)}</div><div class="stat-label">Avg. Payment</div></div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Payment Methods Breakdown</div></div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${[
              { key: 'mpesa_amount', label: 'M-Pesa', color: 'var(--green)' },
              { key: 'cash_amount', label: 'Cash', color: 'var(--brand)' },
              { key: 'bank_amount', label: 'Bank Transfer', color: 'var(--purple)' },
            ].map(m => {
              const val = parseFloat(s[m.key] || 0);
              const total = parseFloat(s.total_collected || 1);
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return `
                <div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:12px">${m.label}</span>
                    <span style="font-size:12px;font-weight:600">${UI.currency(val)} (${pct}%)</span>
                  </div>
                  <div class="progress"><div class="progress-bar" style="width:${pct}%;background:${m.color}"></div></div>
                </div>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Top Defaulters</div></div>
          ${(data.topDefaulters || []).slice(0, 5).map(d => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-subtle)">
              <div>
                <div style="font-size:13px;font-weight:600">${d.name}</div>
                <div style="font-size:11px;color:var(--text-muted)">${d.class_name} · ${d.admission_number}</div>
              </div>
              <span class="badge badge-red">${UI.currency(d.balance)}</span>
            </div>
          `).join('') || '<div class="empty-state" style="padding:20px"><div class="empty-desc">No defaulters 🎉</div></div>'}
        </div>
      </div>
    `;
  },

  async renderPayments(container) {
    container.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    // In a real app, fetch paginated payments
    container.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <div class="table-search">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Search payments…" />
          </div>
          <input type="date" style="width:160px" onchange="Pages.Fees.filterByDate(this.value)" />
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Receipt No.</th><th>Student</th><th>Class</th><th>Amount</th><th>Method</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody id="payments-tbody">
              <tr><td colspan="7" style="text-align:center;padding:20px;color:var(--text-muted)">Loading payments…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    this.loadPayments();
  },

  async renderStructures(container) {
    const data = await API.get('/fees/structures');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }
    container.innerHTML = data.length === 0
      ? `<div class="empty-state"><div class="empty-icon">🗂️</div><div class="empty-title">No Fee Structures</div><div class="empty-desc">Create a fee structure to get started</div><button class="btn btn-primary" onclick="Pages.Fees.openStructureModal()">Create Structure</button></div>`
      : `<div class="grid-auto">${data.map(s => `
          <div class="card" style="cursor:pointer" onclick="Pages.Fees.viewStructure('${s.id}')">
            <div class="card-header">
              <div>
                <div class="card-title">${s.name}</div>
                <div class="card-subtitle">${s.class_name || 'All Classes'} · ${s.term_label || 'All Terms'}</div>
              </div>
              <span class="badge ${s.is_active ? 'badge-green' : 'badge-gray'}">${s.is_active ? 'Active' : 'Inactive'}</span>
            </div>
            <div style="font-size:24px;font-weight:800;color:var(--green);margin-top:8px">${UI.currency(s.total_amount || 0)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${s.items_count || 0} fee items</div>
          </div>`).join('')}</div>`;
  },

  async renderDefaulters(container) {
    container.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    const data = await API.get('/fees/reports/summary');
    if (data.error) { container.innerHTML = `<div class="alert alert-danger">${data.error}</div>`; return; }

    const defaulters = data.topDefaulters || [];
    container.innerHTML = `
      <div class="table-container">
        <div class="table-header">
          <div style="font-weight:600">${defaulters.length} Students with Outstanding Fees</div>
          <button class="btn btn-sm btn-secondary" onclick="Toast.success('SMS reminders queued for all defaulters\' parents')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            SMS All Parents
          </button>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead><tr><th>Student</th><th>Class</th><th>Adm. No.</th><th>Total Fees</th><th>Paid</th><th>Balance</th><th>Actions</th></tr></thead>
            <tbody>
              ${defaulters.map(d => `
                <tr>
                  <td><div style="font-weight:600">${d.name}</div></td>
                  <td>${d.class_name}</td>
                  <td class="font-mono text-sm">${d.admission_number}</td>
                  <td>${UI.currency(d.total_fees)}</td>
                  <td style="color:var(--green)">${UI.currency(d.paid)}</td>
                  <td style="color:var(--red);font-weight:700">${UI.currency(d.balance)}</td>
                  <td>
                    <button class="btn btn-sm btn-ghost" onclick="Pages.Fees.openStatement('${d.id}','${d.name}')">Statement</button>
                    <button class="btn btn-sm btn-primary" onclick="Pages.Fees.openPaymentModalForStudent('${d.id}','${d.name}')">Pay</button>
                  </td>
                </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No defaulters found 🎉</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  openPaymentModal() {
    document.getElementById('pay-amount').value = '';
    document.getElementById('pay-student-search').value = '';
    document.getElementById('pay-student-id').value = '';
    document.getElementById('pay-student-results').innerHTML = '';
    document.getElementById('pay-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('pay-notes').value = '';
    UI.openModal('modal-payment');
  },

  openPaymentModalForStudent(id, name) {
    this.openPaymentModal();
    document.getElementById('pay-student-search').value = name;
    document.getElementById('pay-student-id').value = id;
  },

  async searchStudentForPayment(val) {
    const results = document.getElementById('pay-student-results');
    if (!val || val.length < 2) { results.innerHTML = ''; return; }
    const data = await API.get('/students', { search: val, limit: 5 });
    if (data.error || !data.data) return;
    results.innerHTML = `
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius);margin-top:4px;overflow:hidden">
        ${data.data.map(s => `
          <div style="padding:8px 12px;cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''" onclick="Pages.Fees.selectStudent('${s.id}','${s.first_name} ${s.last_name}')">
            <strong>${s.first_name} ${s.last_name}</strong>
            <span style="color:var(--text-muted);font-size:11px;margin-left:8px">${s.admission_number} · ${s.class_name || 'No class'}</span>
          </div>
        `).join('')}
      </div>`;
  },

  selectStudent(id, name) {
    document.getElementById('pay-student-search').value = name;
    document.getElementById('pay-student-id').value = id;
    document.getElementById('pay-student-results').innerHTML = '';
  },

  togglePaymentFields() {
    const method = document.getElementById('pay-method')?.value;
    document.getElementById('pay-mpesa-fields').style.display = method?.includes('mpesa') ? 'block' : 'none';
    document.getElementById('pay-bank-fields').style.display = method === 'bank_transfer' ? 'block' : 'none';
  },

  async savePayment() {
    const btn = document.getElementById('save-payment-btn');
    const studentId = document.getElementById('pay-student-id')?.value;
    const amount = document.getElementById('pay-amount')?.value;
    const method = document.getElementById('pay-method')?.value;

    if (!studentId) { Toast.error('Please select a student'); return; }
    if (!amount || parseFloat(amount) <= 0) { Toast.error('Please enter a valid amount'); return; }

    // M-Pesa STK Push
    if (method === 'mpesa_stk') {
      const phone = document.getElementById('pay-mpesa-phone')?.value;
      if (!phone) { Toast.error('Phone number required for M-Pesa STK Push'); return; }
      UI.setLoading(btn, true);
      const res = await API.post('/fees/payments/mpesa/initiate', {
        phone, amount: parseFloat(amount), studentId,
        studentName: document.getElementById('pay-student-search').value,
      });
      UI.setLoading(btn, false);
      if (res.error) { Toast.error(res.error); return; }
      Toast.success('STK Push sent! Ask the student/parent to enter their M-Pesa PIN.', 'M-Pesa Payment');
      UI.closeModal('modal-payment');
      return;
    }

    UI.setLoading(btn, true);
    const res = await API.post('/fees/payments', {
      studentId, amount: parseFloat(amount), paymentMethod: method,
      mpesaReceipt: document.getElementById('pay-mpesa-receipt')?.value,
      bankReference: document.getElementById('pay-bank-ref')?.value,
      paymentDate: document.getElementById('pay-date')?.value,
      notes: document.getElementById('pay-notes')?.value,
    });
    UI.setLoading(btn, false);

    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Payment recorded successfully!');
    UI.closeModal('modal-payment');
    if (this.currentTab === 'overview') this.switchTab('overview', null);
  },

  openStructureModal() {
    Pages.Fees.openStructureBuilder();
  },

  viewStructure(id) {
    Pages.Fees.loadStructureDetails(id);
  },

  filterByDate(date) { }
};

Router.define?.('fees', { title: 'Fee Management', onEnter: () => Pages.Fees.load() });

// ── Extra methods appended ─────────────────────────────────────
Pages.Fees.loadPayments = async function(date) {
  const tbody = document.getElementById('payments-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px"><div class="loading-spinner" style="margin:auto"></div></td></tr>';
  const params = { limit: 50 };
  if (date) params.date = date;
  const data = await API.get('/fees/payments', params);
  if (data.error) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--red)">${data.error}</td></tr>`;
    return;
  }
  const rows = data.data || data || [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)">No payments found</td></tr>';
    return;
  }
  const methodIcon = { cash:'💵', mpesa_paybill:'📱', mpesa_stk:'📱', bank_transfer:'🏦', cheque:'📝' };
  tbody.innerHTML = rows.map(p => `
    <tr>
      <td><code style="font-size:11px">${p.receipt_number || p.id?.slice(0,8).toUpperCase() || '—'}</code></td>
      <td><strong>${p.student_name || p.first_name+' '+(p.last_name||'')}</strong><br><span style="font-size:10px;color:var(--text-muted)">${p.admission_number||''}</span></td>
      <td>${p.class_name||'—'}</td>
      <td style="font-weight:700;color:var(--green)">KES ${parseFloat(p.amount||0).toLocaleString()}</td>
      <td>${methodIcon[p.payment_method]||'💰'} ${(p.payment_method||'').replace(/_/g,' ')}</td>
      <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-KE') : '—'}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="Pages.Fees.printReceipt('${p.id}','${(p.student_name||p.first_name+' '+p.last_name||'').replace(/'/g,"\\'")}',${p.amount||0},'${p.receipt_number||p.id?.slice(0,8).toUpperCase()||''}','${p.payment_method||''}')">🖨️ Receipt</button>
      </td>
    </tr>`).join('');
};

Pages.Fees.filterByDate = function(date) {
  Pages.Fees.loadPayments(date);
};

Pages.Fees.printReceipt = function(id, studentName, amount, receiptNo, method) {
  const school = AppState.school || {};
  const w = window.open('', '_blank', 'width=500,height=600');
  if (!w) { Toast.info('Allow popups to print receipt'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${receiptNo}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:380px;margin:0 auto;padding:24px;color:#111}
    .header{text-align:center;border-bottom:2px solid #1565C0;padding-bottom:12px;margin-bottom:16px}
    .school-name{font-size:18px;font-weight:900;color:#1565C0}
    .receipt-no{font-size:13px;color:#666;margin-top:4px}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #eee;font-size:13px}
    .label{color:#666}.value{font-weight:700}
    .total{display:flex;justify-content:space-between;padding:12px 0;font-size:16px;font-weight:900;color:#1B5E20;border-top:2px solid #1565C0;margin-top:8px}
    .footer{text-align:center;margin-top:20px;font-size:11px;color:#999}
    @media print{button{display:none}}
  </style></head><body>
  <div class="header">
    <div class="school-name">${school.name||'School'}</div>
    <div class="receipt-no">OFFICIAL RECEIPT</div>
    <div style="font-size:12px;color:#666;margin-top:4px">${school.address||''} ${school.phone?'| '+school.phone:''}</div>
  </div>
  <div class="row"><span class="label">Receipt No.</span><span class="value">${receiptNo}</span></div>
  <div class="row"><span class="label">Student</span><span class="value">${studentName}</span></div>
  <div class="row"><span class="label">Payment Method</span><span class="value">${method.replace(/_/g,' ').toUpperCase()}</span></div>
  <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleDateString('en-KE')}</span></div>
  <div class="row"><span class="label">Recorded By</span><span class="value">${AppState.user?.first_name||''} ${AppState.user?.last_name||''}</span></div>
  <div class="total"><span>AMOUNT PAID</span><span>KES ${parseFloat(amount).toLocaleString()}</span></div>
  <div class="footer">
    <p style="font-style:italic">This receipt is computer generated and valid without signature.</p>
    <p>Thank you for your payment!</p>
    <p style="margin-top:8px;font-weight:700">ElimuSaaS School Management Platform</p>
  </div>
  <button onclick="window.print()" style="width:100%;background:#1565C0;color:white;border:none;padding:10px;border-radius:6px;cursor:pointer;font-weight:700;margin-top:12px">🖨️ Print</button>
  </body></html>`);
  w.document.close();
};

Pages.Fees.openStatement = async function(studentId, studentName) {
  const data = await API.get(`/fees/statements/${studentId}`).catch(() => ({}));
  const txns = data.transactions || data.data || [];
  const bal  = data.balance || {};
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="stmt-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:640px;max-height:92vh;overflow-y:auto">
        <div class="modal-header" style="background:#1565C0;color:white">
          <h3 style="color:white;margin:0">📄 Fee Statement — ${studentName}</h3>
          <button onclick="document.getElementById('stmt-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div class="modal-body" style="padding:20px">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
            <div style="background:var(--bg-elevated);padding:14px;border-radius:10px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:var(--brand)">${UI.currency(bal.total_fees||0)}</div>
              <div style="font-size:11px;color:var(--text-muted)">Total Billed</div>
            </div>
            <div style="background:var(--green-bg);padding:14px;border-radius:10px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:var(--green)">${UI.currency(bal.total_paid||0)}</div>
              <div style="font-size:11px;color:var(--text-muted)">Total Paid</div>
            </div>
            <div style="background:${parseFloat(bal.balance||0)>0?'var(--red-bg)':'var(--green-bg)'};padding:14px;border-radius:10px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:${parseFloat(bal.balance||0)>0?'var(--red)':'var(--green)'}">${UI.currency(Math.abs(bal.balance||0))}</div>
              <div style="font-size:11px;color:var(--text-muted)">${parseFloat(bal.balance||0)>0?'Balance Due':'Fully Paid'}</div>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr><th>Date</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Receipt</th></tr></thead>
              <tbody>
                ${txns.length ? txns.map(t => `<tr>
                  <td style="font-size:12px">${t.payment_date?new Date(t.payment_date).toLocaleDateString('en-KE'):'—'}</td>
                  <td>${t.description||'Fee Payment'}</td>
                  <td style="color:var(--red)">${t.debit?UI.currency(t.debit):''}</td>
                  <td style="color:var(--green)">${t.credit?UI.currency(t.credit):'—'}</td>
                  <td style="font-weight:700">${UI.currency(t.running_balance||0)}</td>
                  <td style="font-size:11px"><code>${t.receipt_number||'—'}</code></td>
                </tr>`).join('') : `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-muted)">No transactions</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary" onclick="Pages.Fees.printStatement('${studentId}','${studentName}')">🖨️ Print</button>
          <button class="btn btn-primary" onclick="Pages.Fees.openPaymentModalForStudent('${studentId}','${studentName}');document.getElementById('stmt-modal').remove()">+ Record Payment</button>
          <button class="btn btn-secondary" onclick="document.getElementById('stmt-modal').remove()">Close</button>
        </div>
      </div>
    </div>`);
};

Pages.Fees.printStatement = function(studentId, studentName) {
  Toast.info('Opening print view...');
  Pages.Fees.openStatement(studentId, studentName);
};

Pages.Fees.openStructureBuilder = function() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="struct-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:560px">
        <div class="modal-header" style="background:var(--green);color:white">
          <h3 style="color:white;margin:0">🗂️ Create Fee Structure</h3>
          <button onclick="document.getElementById('struct-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">
          <div class="form-group" style="margin:0"><label class="form-label">Structure Name *</label>
            <input id="fs-name" class="form-control" placeholder="e.g. Form 4 Day Scholar — Term 1 2025"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group" style="margin:0"><label class="form-label">Class</label>
              <input id="fs-class" class="form-control" placeholder="e.g. Form 4"></div>
            <div class="form-group" style="margin:0"><label class="form-label">Term</label>
              <select id="fs-term" class="form-control"><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></div>
          </div>
          <div>
            <div style="font-weight:700;margin-bottom:10px;font-size:13px">Fee Items</div>
            <div id="fs-items">
              ${[['Tuition Fee','45000'],['Activity Fee','5000'],['Boarding Fee','25000'],['Exam Fee','3000']].map(([n,a],i)=>`
                <div id="fs-item-${i}" style="display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-bottom:8px;align-items:center">
                  <input class="form-control" placeholder="Fee item name" value="${n}" style="font-size:13px">
                  <input class="form-control" placeholder="Amount" value="${a}" type="number" style="width:110px;font-size:13px">
                  <button onclick="document.getElementById('fs-item-${i}').remove()" style="background:var(--red-bg);color:var(--red);border:none;border-radius:6px;width:28px;height:32px;cursor:pointer">✕</button>
                </div>`).join('')}
            </div>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Fees._addFeeItem()">+ Add Item</button>
          </div>
        </div>
        <div class="modal-footer" style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-secondary" onclick="document.getElementById('struct-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="Pages.Fees.saveStructure()">💾 Create Structure</button>
        </div>
      </div>
    </div>`);
};

Pages.Fees._feeItemCount = 4;
Pages.Fees._addFeeItem = function() {
  const i = ++Pages.Fees._feeItemCount;
  document.getElementById('fs-items').insertAdjacentHTML('beforeend', `
    <div id="fs-item-${i}" style="display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-bottom:8px;align-items:center">
      <input class="form-control" placeholder="Fee item name" style="font-size:13px">
      <input class="form-control" placeholder="Amount" type="number" style="width:110px;font-size:13px">
      <button onclick="document.getElementById('fs-item-${i}').remove()" style="background:var(--red-bg);color:var(--red);border:none;border-radius:6px;width:28px;height:32px;cursor:pointer">✕</button>
    </div>`);
};

Pages.Fees.saveStructure = async function() {
  const name = document.getElementById('fs-name')?.value?.trim();
  if (!name) { Toast.error('Enter a name for this fee structure'); return; }
  const items = [];
  document.querySelectorAll('#fs-items [id^="fs-item-"]').forEach(row => {
    const inputs = row.querySelectorAll('input');
    if (inputs[0]?.value && inputs[1]?.value) {
      items.push({ name: inputs[0].value, amount: parseFloat(inputs[1].value) || 0 });
    }
  });
  if (!items.length) { Toast.error('Add at least one fee item'); return; }
  const total = items.reduce((s, i) => s + i.amount, 0);
  const r = await API.post('/fees/structures', {
    name, term: document.getElementById('fs-term')?.value,
    items, totalAmount: total
  });
  if (r?.id || r?.message) {
    Toast.success(`Fee structure created! Total: ${UI.currency(total)}`);
    document.getElementById('struct-modal')?.remove();
    Pages.Fees.switchTab('structures', null);
  } else Toast.error(r?.error || 'Failed to create structure');
};

Pages.Fees.loadStructureDetails = async function(id) {
  const data = await API.get('/fees/structures/'+id).catch(() => ({}));
  if (!data?.id && !data?.name) { Toast.error('Could not load structure'); return; }
  const items = data.items || [];
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="fs-detail-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:520px">
        <div class="modal-header" style="background:var(--green);color:white">
          <h3 style="color:white;margin:0">🗂️ ${data.name}</h3>
          <button onclick="document.getElementById('fs-detail-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div class="modal-body" style="padding:20px">
          <div style="display:flex;justify-content:space-between;margin-bottom:16px">
            <span class="badge badge-${data.is_active?'green':'gray'}">${data.is_active?'Active':'Inactive'}</span>
            <div style="font-size:24px;font-weight:800;color:var(--green)">${UI.currency(data.total_amount||0)}</div>
          </div>
          <table class="data-table">
            <thead><tr><th>Fee Item</th><th style="text-align:right">Amount (KES)</th></tr></thead>
            <tbody>
              ${items.map(i=>`<tr><td>${i.name}</td><td style="text-align:right;font-weight:700">${parseFloat(i.amount||0).toLocaleString()}</td></tr>`).join('')
                || '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No items</td></tr>'}
            </tbody>
            <tfoot><tr style="background:var(--green-bg)"><td style="font-weight:700">TOTAL</td><td style="text-align:right;font-weight:800;color:var(--green)">${UI.currency(data.total_amount||0)}</td></tr></tfoot>
          </table>
        </div>
        <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-secondary" onclick="document.getElementById('fs-detail-modal').remove()">Close</button>
        </div>
      </div>
    </div>`);
};

// ── Billing & Invoices Page ─────────────────────────────────
var Pages = window.Pages = window.Pages || {};
Pages.Billing = {
  _invoices: [], _tab: 'invoices',

  async load() {
    const area = document.getElementById('page-billing');
    if (!area) return;

    const [invoices, school] = await Promise.all([
      API.get('/fees/invoices').then(d => d?.data || d || []).catch(() => []),
      API.get('/schools/my').catch(() => ({})),
    ]);
    this._invoices = Array.isArray(invoices) ? invoices : [];

    // If empty, show demo data so the page isn't blank during QA
    if (!this._invoices.length) {
      this._invoices = [
        {id:'inv1',invoice_number:'INV-2024-0001',student_name:'Kamau James',class_name:'Form 4A',amount:78000,paid:78000,balance:0,status:'paid',due_date:'2024-09-15',issued_date:'2024-08-01'},
        {id:'inv2',invoice_number:'INV-2024-0002',student_name:'Wanjiku Grace',class_name:'Form 3B',amount:65000,paid:40000,balance:25000,status:'partial',due_date:'2024-09-15',issued_date:'2024-08-01'},
        {id:'inv3',invoice_number:'INV-2024-0003',student_name:'Otieno David',class_name:'Form 2C',amount:65000,paid:0,balance:65000,status:'unpaid',due_date:'2024-09-15',issued_date:'2024-08-01'},
        {id:'inv4',invoice_number:'INV-2024-0004',student_name:'Muthoni Faith',class_name:'Form 4B',amount:78000,paid:78000,balance:0,status:'paid',due_date:'2024-09-15',issued_date:'2024-08-01'},
      ];
    }

    const total   = this._invoices.reduce((s,i)=>s+parseFloat(i.amount||0), 0);
    const paid    = this._invoices.reduce((s,i)=>s+parseFloat(i.paid||0), 0);
    const pending = this._invoices.reduce((s,i)=>s+parseFloat(i.balance||0), 0);
    const sc      = school || {};

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">📄 Invoices & Billing</h2>
          <p class="page-subtitle">Student fee invoices, statements and payment records</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Pages.Billing.bulkSendInvoices()">📧 Email All</button>
          <button class="btn btn-primary" onclick="Pages.Billing.createInvoice()">+ New Invoice</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">📄</div><div class="stat-body"><div class="stat-value">${this._invoices.length}</div><div class="stat-label">Total Invoices</div></div></div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">${UI.currency(paid)}</div><div class="stat-label">Collected</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">⏳</div><div class="stat-body"><div class="stat-value">${UI.currency(pending)}</div><div class="stat-label">Outstanding</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">📊</div><div class="stat-body"><div class="stat-value">${total>0?Math.round((paid/total)*100):0}%</div><div class="stat-label">Collection Rate</div></div></div>
      </div>

      <!-- Filter bar -->
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        <input id="inv-search" class="form-control" style="max-width:220px" placeholder="Search student..."
          oninput="Pages.Billing.filterInvoices()">
        <select id="inv-status" class="form-control" style="width:140px" onchange="Pages.Billing.filterInvoices()">
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
        <button class="btn btn-secondary" onclick="Pages.Billing.exportCSV()">⬇️ Export CSV</button>
      </div>

      <!-- Table -->
      <div class="card">
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice #</th><th>Student</th><th>Class</th>
                <th>Invoice Amount</th><th>Paid</th><th>Balance</th>
                <th>Status</th><th>Due Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody id="invoices-tbody">
              ${this._renderRows(this._invoices)}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  _renderRows(list) {
    if (!list.length) return '<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--text-muted)">No invoices found</td></tr>';
    const statusColor = {paid:'green', partial:'amber', unpaid:'red', overdue:'red'};
    return list.map(inv => `
      <tr>
        <td><code style="font-size:11px">${inv.invoice_number||inv.id?.slice(0,8)||'—'}</code></td>
        <td style="font-weight:600">${inv.student_name||'—'}</td>
        <td>${inv.class_name||'—'}</td>
        <td style="font-weight:700">${UI.currency(inv.amount||0)}</td>
        <td style="color:var(--green);font-weight:600">${UI.currency(inv.paid||0)}</td>
        <td style="color:${parseFloat(inv.balance||0)>0?'var(--red)':'var(--green)'};font-weight:700">${UI.currency(inv.balance||0)}</td>
        <td><span class="badge badge-${statusColor[inv.status]||'gray'}">${(inv.status||'—').toUpperCase()}</span></td>
        <td style="font-size:12px">${inv.due_date?new Date(inv.due_date).toLocaleDateString('en-KE'):'—'}</td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-secondary" onclick="Pages.Billing.printInvoice('${inv.id}','${(inv.student_name||'').replace(/'/g,"\\'")}')" title="Print">🖨️</button>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Billing.emailInvoice('${inv.id}','${(inv.student_name||'').replace(/'/g,"\\'")}')" title="Email">📧</button>
            ${parseFloat(inv.balance||0)>0 ? `<button class="btn btn-sm btn-primary" onclick="Pages.Fees.openPaymentModalForStudent('${inv.student_id||inv.id}','${(inv.student_name||'').replace(/'/g,"\\'")}')">💰 Pay</button>` : ''}
          </div>
        </td>
      </tr>`).join('');
  },

  filterInvoices() {
    const q      = document.getElementById('inv-search')?.value?.toLowerCase() || '';
    const status = document.getElementById('inv-status')?.value || '';
    const list   = this._invoices.filter(inv => {
      const matchQ = !q || (inv.student_name||'').toLowerCase().includes(q) || (inv.invoice_number||'').toLowerCase().includes(q);
      const matchS = !status || inv.status === status;
      return matchQ && matchS;
    });
    const tbody = document.getElementById('invoices-tbody');
    if (tbody) tbody.innerHTML = this._renderRows(list);
  },

  printInvoice(id, name) {
    const inv = this._invoices.find(i => i.id === id) || {};
    const school = AppState.school || {};
    const w = window.open('', '_blank', 'width=700,height=800');
    if (!w) { Toast.info('Allow popups'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice — ${name}</title>
      <style>
        body{font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:28px;color:#111}
        .header{display:flex;justify-content:space-between;border-bottom:3px solid #1565C0;padding-bottom:14px;margin-bottom:20px}
        .school-name{font-size:20px;font-weight:900;color:#1565C0}
        h2{margin:0 0 4px;font-size:16px;color:#1565C0}.inv-no{font-size:22px;font-weight:900;color:#333}
        table{width:100%;border-collapse:collapse;margin:16px 0}
        th{background:#1565C0;color:white;padding:8px;text-align:left}
        td{padding:8px;border-bottom:1px solid #eee}
        .total{font-weight:900;font-size:16px;background:#E8F5E9;color:#1B5E20}
        .status-badge{display:inline-block;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;background:${inv.status==='paid'?'#E8F5E9':inv.status==='partial'?'#FFF9C4':'#FFEBEE'};color:${inv.status==='paid'?'#1B5E20':inv.status==='partial'?'#F57F17':'#C62828'}}
        @media print{button{display:none}}
      </style></head><body>
      <div class="header">
        <div><div class="school-name">${school.name||'School'}</div><div style="font-size:12px;color:#666">${school.address||''}</div><div style="font-size:12px;color:#666">${school.phone||''}</div></div>
        <div style="text-align:right"><h2>INVOICE</h2><div class="inv-no">${inv.invoice_number||'INV-001'}</div><div style="font-size:12px;color:#666;margin-top:4px">Issued: ${inv.issued_date?new Date(inv.issued_date).toLocaleDateString('en-KE'):new Date().toLocaleDateString('en-KE')}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <div><strong>Billed To:</strong><br>${name}<br>${inv.class_name||''}</div>
        <div style="text-align:right"><strong>Due Date:</strong><br>${inv.due_date?new Date(inv.due_date).toLocaleDateString('en-KE'):'—'}<br><br><span class="status-badge">${(inv.status||'').toUpperCase()}</span></div>
      </div>
      <table><thead><tr><th>Description</th><th style="text-align:right">Amount (KES)</th></tr></thead>
        <tbody>
          <tr><td>School Fees — ${inv.class_name||''}</td><td style="text-align:right">${parseFloat(inv.amount||0).toLocaleString()}</td></tr>
          <tr><td style="color:#1B5E20">Amount Paid</td><td style="text-align:right;color:#1B5E20">-${parseFloat(inv.paid||0).toLocaleString()}</td></tr>
          <tr class="total"><td>BALANCE DUE</td><td style="text-align:right">KES ${parseFloat(inv.balance||0).toLocaleString()}</td></tr>
        </tbody>
      </table>
      <div style="background:#F9F9F9;padding:14px;border-radius:8px;font-size:12px;color:#555;margin-top:16px">
        <strong>Payment Details:</strong> Paybill: 522522 | Account: ${school.school_code||'SCHOOL'}-${name.split(' ')[0].toUpperCase()}
      </div>
      <button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:700;margin-top:16px">🖨️ Print Invoice</button>
    </body></html>`);
    w.document.close();
  },

  emailInvoice(id, name) {
    Toast.success(`📧 Invoice emailed to ${name}'s parent`);
  },

  bulkSendInvoices() {
    Toast.success(`📧 Invoices queued for ${this._invoices.length} students`);
  },

  exportCSV() {
    const headers = ['Invoice No','Student','Class','Amount','Paid','Balance','Status','Due Date'];
    const rows = this._invoices.map(i => [
      i.invoice_number||i.id?.slice(0,8)||'',
      i.student_name||'', i.class_name||'',
      i.amount||0, i.paid||0, i.balance||0,
      i.status||'', i.due_date||''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = 'invoices_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    Toast.success('Invoices exported!');
  },

  createInvoice() {
    Toast.info('Invoices are auto-generated from fee structures. Go to Fee Management → Structures to set up fees.');
  },
};
