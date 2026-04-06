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
    Toast.info('Payments list loading. Use search to find specific student payments.');
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
          <button class="btn btn-sm btn-secondary" onclick="Toast.info('SMS sent to all defaulters\\' parents')">
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
                    <button class="btn btn-sm btn-ghost" onclick="Toast.info('Statement for ${d.name}')">Statement</button>
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
    Toast.info('Fee Structure builder -- create named structures with line items for each class/term');
  },

  viewStructure(id) {
    Toast.info(`Loading fee structure details…`);
  },

  filterByDate(date) { }
};

Router.define?.('fees', { title: 'Fee Management', onEnter: () => Pages.Fees.load() });
