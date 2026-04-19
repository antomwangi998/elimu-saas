// ============================================================
// Full Billing & Subscription Page — All Payment Methods
// ============================================================
'use strict';
if (typeof Pages !== 'undefined') {
Pages.Billing = {
  _sub: null, _plans: [],

  async load() {
    const area = document.getElementById('page-billing');
    if (!area) return;
    area.innerHTML = `<div style="text-align:center;padding:48px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    const [subData, plansData] = await Promise.all([
      API.get('/subscriptions/my').catch(()=>({})),
      API.get('/subscriptions/plans').catch(()=>({plans:[]})),
    ]);
    this._sub = subData || {};
    this._plans = plansData?.plans || this._defaultPlans();
    this._render(area);
  },

  _defaultPlans() {
    return [
      { key:'starter', name:'Starter', price:4999, maxStudents:200, sms:500, storage:5, api:false, whatsapp:false, support:'Email' },
      { key:'standard', name:'Standard', price:9999, maxStudents:500, sms:2000, storage:20, api:false, whatsapp:true, support:'Priority' },
      { key:'professional', name:'Professional', price:19999, maxStudents:2000, sms:10000, storage:50, api:true, whatsapp:true, support:'Phone' },
      { key:'enterprise', name:'Enterprise', price:0, maxStudents:99999, sms:99999, storage:200, api:true, whatsapp:true, support:'Dedicated' },
    ];
  },

  _render(area) {
    const s = this._sub;
    const statusColor = {active:'var(--green)',trial:'var(--brand)',grace:'var(--amber)',suspended:'var(--red)',cancelled:'#999'};
    const statusBg = {active:'var(--green-bg)',trial:'var(--brand-subtle)',grace:'#FFF3E0',suspended:'#FFEBEE',cancelled:'#F5F5F5'};
    const color = statusColor[s.status] || '#999';
    const bg = statusBg[s.status] || '#F5F5F5';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">💳 Subscription &amp; Billing</h2>
          <p class="page-subtitle">Manage your school's subscription and payment history</p>
        </div>
      </div>

      <!-- Current Status Banner -->
      <div style="background:${bg};border:2px solid ${color};border-radius:14px;padding:20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:52px;height:52px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">
            ${s.status==='active'?'✅':s.status==='trial'?'🔵':s.status==='grace'?'⚠️':'🔒'}
          </div>
          <div>
            <div style="font-weight:800;font-size:18px">${s.planDetails?.name||'Trial'} Plan</div>
            <div style="font-size:13px;color:var(--text-secondary)">
              Status: <strong style="color:${color}">${(s.status||'trial').toUpperCase()}</strong>
              ${s.daysLeft>0 ? ` · ${s.daysLeft} days remaining` : ' · <span style="color:var(--red)">Expired</span>'}
              ${s.expiresAt ? ` · Expires ${new Date(s.expiresAt).toLocaleDateString('en-KE')}` : ''}
            </div>
            ${s.studentCount ? `<div style="font-size:12px;color:var(--text-muted)">👥 ${s.studentCount} / ${s.planDetails?.maxStudents||'∞'} students</div>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:26px;font-weight:800">${s.totalAmount ? 'KES '+parseInt(s.totalAmount).toLocaleString() : '—'}</div>
          <div style="font-size:11px;color:var(--text-muted)">per term</div>
        </div>
      </div>

      ${s.status!=='active' ? `
      <div style="background:#FFEBEE;border:1px solid var(--red);border-radius:10px;padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">⚠️</span>
        <div><strong>Action Required:</strong> Renew your subscription to continue full access. Contact us at <a href="mailto:mwangiantony57@gmail.com">mwangiantony57@gmail.com</a> or call/WhatsApp <a href="tel:+254759437104">0759 437 104</a></div>
      </div>` : ''}

      <!-- Plans Grid -->
      <div style="margin-bottom:8px;font-weight:700;font-size:16px">📋 Choose a Plan</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:28px">
        ${this._plans.map(p => this._planCard(p)).join('')}
      </div>

      <!-- How to Pay -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-header"><h3>💰 How to Pay</h3></div>
        <div style="padding:20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">
          ${[
            {icon:'📱',title:'M-Pesa STK Push',desc:'We send a prompt to your phone. Enter your PIN to pay instantly.',action:'stk'},
            {icon:'🏦',title:'M-Pesa Paybill',desc:'Paybill: <strong>522522</strong><br>Account: Your school code',action:'paybill'},
            {icon:'💳',title:'Bank Transfer',desc:'Equity Bank<br>A/C: 0180293648191<br>Ref: ELIMU-[School Code]',action:'bank'},
            {icon:'📧',title:'Invoice / Manual',desc:'Request a formal invoice sent to your email for offline payment.',action:'invoice'},
          ].map(m=>`<div style="border:1px solid var(--border);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:28px;margin-bottom:8px">${m.icon}</div>
            <div style="font-weight:700;font-size:13px;margin-bottom:6px">${m.title}</div>
            <div style="font-size:11px;color:var(--text-muted);line-height:1.6;margin-bottom:10px">${m.desc}</div>
            <button class="btn btn-sm btn-primary w-full" onclick="Pages.Billing.openPayment('${m.action}')">Pay Now</button>
          </div>`).join('')}
        </div>
      </div>

      <!-- Payment History -->
      <div class="card">
        <div class="card-header"><h3>📜 Payment History</h3><button class="btn btn-sm btn-secondary" onclick="Pages.Billing.loadHistory()">Refresh</button></div>
        <div id="billing-history-list" style="padding:16px">
          <div style="text-align:center;padding:20px;color:var(--text-muted)">Loading payment history...</div>
        </div>
      </div>`;

    this.loadHistory();
  },

  _planCard(p) {
    const isCurrent = this._sub?.plan === p.key && this._sub?.status === 'active';
    const COLORS = {starter:'#1565C0',standard:'#2E7D32',professional:'#6A1B9A',enterprise:'#E65100'};
    const c = COLORS[p.key] || '#1565C0';
    return `<div style="border:2px solid ${isCurrent?c:'var(--border)'};border-radius:14px;padding:20px;position:relative;${isCurrent?'box-shadow:0 0 0 3px '+c+'20':''}">
      ${isCurrent?`<div style="position:absolute;top:-10px;right:12px;background:${c};color:white;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px">CURRENT</div>`:''}
      <div style="font-weight:800;font-size:16px;margin-bottom:4px">${p.name}</div>
      <div style="font-size:24px;font-weight:900;color:${c};margin-bottom:2px">${p.price>0?'KES '+p.price.toLocaleString():'Custom'}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px">per term · up to ${p.maxStudents>=99999?'unlimited':p.maxStudents} students</div>
      <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;display:flex;flex-direction:column;gap:4px">
        <div>📱 ${p.sms>=99999?'Unlimited':p.sms} SMS/term</div>
        <div>💾 ${p.storage}GB Storage</div>
        <div>${p.api?'✅':'❌'} API Access</div>
        <div>${p.whatsapp?'✅':'❌'} WhatsApp</div>
        <div>🛎️ ${p.support} support</div>
      </div>
      <button class="btn btn-${isCurrent?'secondary':'primary'} w-full" style="font-size:13px" onclick="Pages.Billing.selectPlan('${p.key}',${p.price})">
        ${isCurrent?'✅ Current Plan':'Select '+p.name}
      </button>
    </div>`;
  },

  async loadHistory() {
    const el = document.getElementById('billing-history-list');
    if (!el) return;
    const r = await API.get('/subscriptions/payments').catch(()=>({}));
    const payments = r?.data || [];
    if (!payments.length) {
      el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">No payment records yet</div>';
      return;
    }
    el.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
      <th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th><th>Receipt</th>
    </tr></thead><tbody>
      ${payments.map(p=>`<tr>
        <td>${p.paid_at?new Date(p.paid_at).toLocaleDateString('en-KE'):'—'}</td>
        <td style="font-weight:700">KES ${parseInt(p.amount||0).toLocaleString()}</td>
        <td>${(p.payment_method||'').replace(/_/g,' ').toUpperCase()}</td>
        <td><code style="font-size:11px">${p.reference||p.mpesa_receipt||'—'}</code></td>
        <td><span class="badge badge-green">PAID</span></td>
        <td><button class="btn btn-sm btn-ghost" onclick="Pages.Billing.printReceipt(${JSON.stringify(p).replace(/'/g,"&#39;")})">🖨️</button></td>
      </tr>`).join('')}
    </tbody></table></div>`;
  },

  selectPlan(planKey, price) {
    if (price === 0) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay open" id="billing-contact-modal" onclick="if(event.target===this)this.remove()">
          <div class="modal" style="max-width:420px">
            <div class="modal-header"><h3>🏆 Enterprise Plan</h3><button onclick="document.getElementById('billing-contact-modal').remove()" class="modal-close">✕</button></div>
            <div style="padding:24px;text-align:center">
              <p style="color:var(--text-secondary);margin-bottom:20px">Enterprise pricing is custom. Contact us to get a quote tailored to your school's needs.</p>
              <a href="mailto:mwangiantony57@gmail.com?subject=Enterprise Plan Enquiry" style="display:block;padding:12px;background:var(--brand);color:white;border-radius:10px;text-decoration:none;font-weight:700;margin-bottom:10px">📧 Email Us</a>
              <a href="https://wa.me/254759437104?text=Hi, I'm interested in the Enterprise plan for ElimuSaaS" target="_blank" style="display:block;padding:12px;background:#25D366;color:white;border-radius:10px;text-decoration:none;font-weight:700">💬 WhatsApp Us</a>
            </div>
          </div>
        </div>`);
      return;
    }
    this.openPayment('paybill', planKey, price);
  },

  openPayment(method, planKey, price) {
    const plan = planKey || this._sub?.plan || 'standard';
    const amount = price || (this._plans.find(p=>p.key===plan)?.price) || 9999;
    const schoolCode = AppState.school?.code || AppState.user?.schoolCode || 'SCH001';

    const methods = {
      stk: `
        <div style="background:#E8F5E9;border-radius:10px;padding:16px;margin-bottom:16px">
          <div style="font-weight:700;margin-bottom:6px">📱 M-Pesa STK Push</div>
          <div style="font-size:13px;color:var(--text-secondary)">A payment prompt will be sent to your phone. Enter your M-Pesa PIN to complete.</div>
        </div>
        <div class="form-group"><label>M-Pesa Phone Number *</label><input id="pay-phone" class="form-control" placeholder="07XX XXX XXX" type="tel"></div>`,
      paybill: `
        <div style="background:#E8F5E9;border-radius:10px;padding:16px;margin-bottom:16px">
          <div style="font-weight:700;margin-bottom:8px">🏦 M-Pesa Paybill Details</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
            <div><span style="color:var(--text-muted)">Paybill No:</span><div style="font-weight:800;font-size:18px;color:var(--green)">522522</div></div>
            <div><span style="color:var(--text-muted)">Account No:</span><div style="font-weight:800;font-size:18px;color:var(--green)">${schoolCode}</div></div>
            <div><span style="color:var(--text-muted)">Amount:</span><div style="font-weight:800;font-size:18px;color:var(--brand)">KES ${amount.toLocaleString()}</div></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Pay via M-Pesa → Lipa na M-Pesa → Pay Bill → Enter details above</div>
        </div>
        <div class="form-group"><label>M-Pesa Receipt Number *</label><input id="pay-receipt" class="form-control" placeholder="e.g. QHJ1234567"></div>
        <div class="form-group"><label>Phone Number Used</label><input id="pay-phone" class="form-control" placeholder="07XX XXX XXX" type="tel"></div>`,
      bank: `
        <div style="background:#E3F2FD;border-radius:10px;padding:16px;margin-bottom:16px">
          <div style="font-weight:700;margin-bottom:8px">🏦 Bank Transfer Details</div>
          <div style="font-size:13px;line-height:1.8">
            Bank: <strong>Equity Bank</strong><br>
            Account Name: <strong>ElimuSaaS Ltd</strong><br>
            Account No: <strong>0180293648191</strong><br>
            Reference: <strong>ELIMU-${schoolCode}</strong><br>
            Amount: <strong>KES ${amount.toLocaleString()}</strong>
          </div>
        </div>
        <div class="form-group"><label>Bank Transaction Reference *</label><input id="pay-receipt" class="form-control" placeholder="Bank transaction reference"></div>`,
      invoice: `
        <div style="background:var(--brand-subtle);border-radius:10px;padding:16px;margin-bottom:16px">
          <div style="font-weight:700;margin-bottom:6px">📧 Request Invoice</div>
          <div style="font-size:13px;color:var(--text-secondary)">We'll send a formal invoice to your email for offline or cheque payment.</div>
        </div>
        <div class="form-group"><label>Email to send invoice to *</label><input id="pay-email" class="form-control" type="email" placeholder="admin@school.ac.ke" value="${AppState.user?.email||''}"></div>
        <div class="form-group"><label>Notes (optional)</label><textarea id="pay-notes" class="form-control" rows="2" placeholder="Any special instructions..."></textarea></div>`,
    };

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="payment-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:480px">
          <div class="modal-header" style="background:var(--green);color:white">
            <h3 style="color:white;margin:0">💳 Pay for ${this._plans.find(p=>p.key===plan)?.name||'Subscription'} — KES ${amount.toLocaleString()}</h3>
            <button onclick="document.getElementById('payment-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px">✕</button>
          </div>
          <div style="padding:20px">
            <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap">
              ${['stk','paybill','bank','invoice'].map(m=>`<button class="btn btn-sm ${m===method?'btn-primary':'btn-secondary'}" onclick="Pages.Billing._switchPayMethod('${m}')">${{stk:'📱 STK',paybill:'🏦 Paybill',bank:'💳 Bank',invoice:'📧 Invoice'}[m]}</button>`).join('')}
            </div>
            <div id="pay-method-content">${methods[method]||methods.paybill}</div>
          </div>
          <div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-secondary" onclick="document.getElementById('payment-modal').remove()">Cancel</button>
            <button class="btn btn-primary" id="pay-submit-btn" onclick="Pages.Billing.submitPayment('${plan}',${amount},'${method}')">✅ Confirm Payment</button>
          </div>
        </div>
      </div>`);
    this._currentMethod = method;
    this._currentPlan = plan;
    this._currentAmount = amount;
  },

  _switchPayMethod(method) {
    const methods = {
      stk: `<div style="background:#E8F5E9;border-radius:10px;padding:16px;margin-bottom:16px"><div style="font-weight:700;margin-bottom:6px">📱 M-Pesa STK Push</div><div style="font-size:13px;color:var(--text-secondary)">A payment prompt will be sent to your phone.</div></div><div class="form-group"><label>M-Pesa Phone Number *</label><input id="pay-phone" class="form-control" placeholder="07XX XXX XXX" type="tel"></div>`,
      paybill: `<div style="background:#E8F5E9;border-radius:10px;padding:16px;margin-bottom:16px"><div style="font-weight:700;margin-bottom:8px">🏦 M-Pesa Paybill</div><div style="font-size:14px">Paybill: <strong>522522</strong> | Account: <strong>${AppState.school?.code||'SCH'}</strong> | Amount: <strong>KES ${(this._currentAmount||9999).toLocaleString()}</strong></div></div><div class="form-group"><label>M-Pesa Receipt *</label><input id="pay-receipt" class="form-control" placeholder="e.g. QHJ1234567"></div><div class="form-group"><label>Phone Number</label><input id="pay-phone" class="form-control" placeholder="07XX XXX XXX"></div>`,
      bank: `<div style="background:#E3F2FD;border-radius:10px;padding:16px;margin-bottom:16px"><div style="font-weight:700;margin-bottom:8px">🏦 Bank Transfer</div><div style="font-size:13px">Equity Bank | A/C: 0180293648191 | Ref: ELIMU-${AppState.school?.code||'SCH'}</div></div><div class="form-group"><label>Bank Reference *</label><input id="pay-receipt" class="form-control" placeholder="Transaction reference"></div>`,
      invoice: `<div style="background:var(--brand-subtle);border-radius:10px;padding:16px;margin-bottom:16px"><div style="font-weight:700;margin-bottom:6px">📧 Request Invoice</div></div><div class="form-group"><label>Email *</label><input id="pay-email" class="form-control" type="email" value="${AppState.user?.email||''}"></div>`,
    };
    const el = document.getElementById('pay-method-content');
    if (el) el.innerHTML = methods[method]||methods.paybill;
    this._currentMethod = method;
    document.querySelectorAll('#payment-modal .btn-sm').forEach(b=>{
      b.className = b.onclick?.toString().includes(`'${method}'`) ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    });
    const btn = document.getElementById('pay-submit-btn');
    if (btn) btn.setAttribute('onclick', `Pages.Billing.submitPayment('${this._currentPlan}',${this._currentAmount},'${method}')`);
  },

  async submitPayment(plan, amount, method) {
    const phone = document.getElementById('pay-phone')?.value?.trim();
    const receipt = document.getElementById('pay-receipt')?.value?.trim();
    const email = document.getElementById('pay-email')?.value?.trim();
    const notes = document.getElementById('pay-notes')?.value?.trim();

    if (method==='stk' && !phone) { Toast.error('Enter your M-Pesa phone number'); return; }
    if (method==='paybill' && !receipt) { Toast.error('Enter the M-Pesa receipt number'); return; }
    if (method==='bank' && !receipt) { Toast.error('Enter the bank transaction reference'); return; }
    if (method==='invoice' && !email) { Toast.error('Enter your email address'); return; }

    const btn = document.getElementById('pay-submit-btn');
    if (btn) { btn.disabled=true; btn.textContent='Processing...'; }

    const payload = { plan, amount, paymentMethod:method, mpesaPhone:phone, mpesaReceipt:receipt, bankRef:receipt, email, notes };
    const r = await API.post('/subscriptions/choose', payload).catch(()=>({error:'Connection error'}));

    if (r?.error) {
      Toast.error(r.error);
      if (btn) { btn.disabled=false; btn.textContent='✅ Confirm Payment'; }
      return;
    }
    Toast.success('🎉 Payment recorded! Your subscription will be activated shortly.');
    document.getElementById('payment-modal')?.remove();
    this.load();
  },

  printReceipt(payment) {
    const w = window.open('','_blank','width=600,height=500');
    if (!w) { Toast.info('Allow popups to print receipt'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>body{font-family:Arial,sans-serif;padding:24px;max-width:500px;margin:0 auto}h2{color:#1565C0}.row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #eee}.label{color:#666;font-size:13px}.val{font-weight:700}@media print{button{display:none}}</style></head><body>
      <div style="text-align:center;margin-bottom:20px"><div style="width:48px;height:48px;background:#1565C0;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:20px">E</div><h2 style="margin:8px 0">ElimuSaaS</h2><div style="font-size:12px;color:#666">Payment Receipt</div></div>
      <div class="row"><span class="label">Date</span><span class="val">${payment.paid_at?new Date(payment.paid_at).toLocaleDateString('en-KE'):'—'}</span></div>
      <div class="row"><span class="label">Amount</span><span class="val" style="color:#1565C0">KES ${parseInt(payment.amount||0).toLocaleString()}</span></div>
      <div class="row"><span class="label">Method</span><span class="val">${(payment.payment_method||'').replace(/_/g,' ').toUpperCase()}</span></div>
      <div class="row"><span class="label">Reference</span><span class="val">${payment.reference||payment.mpesa_receipt||'—'}</span></div>
      <div class="row"><span class="label">School</span><span class="val">${AppState.school?.name||'—'}</span></div>
      <div style="margin-top:20px;text-align:center;font-size:11px;color:#999">This is an official ElimuSaaS payment receipt.<br>Contact: mwangiantony57@gmail.com | 0759 437 104</div>
      <div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="background:#1565C0;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer">🖨️ Print</button></div>
    </body></html>`);
    w.document.close();
  },
};
Router.define?.('billing', { title: 'Subscription & Billing', onEnter: () => Pages.Billing.load() });
}
