'use strict';
if (typeof Pages !== 'undefined') {

Pages.Settings = Pages.Settings || {};

// Override/extend the existing settings with billing tab
const _origLoad = Pages.Settings.load;

Pages.Settings.loadBilling = async function() {
  const area = document.getElementById('settings-billing-area');
  if (!area) return;
  area.innerHTML = `<div style="text-align:center;padding:24px"><div class="loading-spinner" style="margin:auto"></div></div>`;

  const [subData, plansData] = await Promise.all([
    API.get('/subscriptions/my').catch(()=>({})),
    API.get('/subscriptions/plans').catch(()=>({plans:[]})),
  ]);
  const sub   = subData || {};
  const plans = plansData?.plans || [];

  const COLORS = { starter:'var(--brand)', standard:'var(--green)', professional:'var(--purple)', enterprise:'var(--amber)' };
  const ICONS  = { starter:'🌱', standard:'🚀', professional:'⭐', enterprise:'🏆' };

  area.innerHTML = `
    <!-- Current plan banner -->
    <div style="background:${sub.status==='active'?'var(--green-bg)':sub.status==='trial'?'var(--amber-bg)':'var(--red-bg)'};border:1px solid ${sub.status==='active'?'var(--green)':sub.status==='trial'?'var(--amber)':'var(--red)'};border-radius:12px;padding:16px;margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <div style="font-size:18px;font-weight:800">${ICONS[sub.plan]||'📋'} ${sub.planDetails?.name||'Trial'} Plan</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px">
            ${sub.status==='active'?'✅ Active':'⏳ '+sub.status?.toUpperCase()} · ${sub.daysLeft>0?sub.daysLeft+' days remaining':'Expired'}
          </div>
          ${sub.student_count?`<div style="font-size:12px;color:var(--text-muted);margin-top:2px">👥 ${sub.student_count} students enrolled</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="font-size:28px;font-weight:800">${UI.currency(sub.total_amount||0)}</div>
          <div style="font-size:11px;color:var(--text-muted)">per term</div>
        </div>
      </div>
      ${sub.status!=='active'?`<div style="margin-top:12px;padding:10px;background:rgba(0,0,0,0.05);border-radius:8px;font-size:13px">
        <strong>⚠️ Action Required:</strong> Renew your subscription to continue accessing all features.
      </div>`:''}
    </div>

    <!-- Plans grid -->
    <div style="margin-bottom:8px;font-weight:700;font-size:15px">Choose a Plan</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:24px">
      ${plans.map(p => {
        const isCurrent = sub.plan === p.key && sub.status === 'active';
        const color = COLORS[p.key]||'var(--brand)';
        return `
        <div style="border:2px solid ${isCurrent?color:'var(--border)'};border-radius:14px;padding:20px;position:relative;${isCurrent?'box-shadow:0 0 0 3px '+color+'30':''}" onclick="Pages.Settings.selectPlan('${p.key}')">
          ${isCurrent?`<div style="position:absolute;top:-10px;right:12px;background:${color};color:white;font-size:10px;font-weight:700;padding:2px 10px;border-radius:99px">CURRENT</div>`:''}
          <div style="font-size:28px;margin-bottom:8px">${ICONS[p.key]||'📋'}</div>
          <div style="font-weight:800;font-size:17px;margin-bottom:4px">${p.name}</div>
          <div style="font-size:26px;font-weight:800;color:${color};margin-bottom:4px">KES ${p.price.toLocaleString()}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">per term · up to ${p.maxStudents>=99999?'unlimited':p.maxStudents} students</div>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;margin-bottom:16px">
            <div>📱 ${p.features.sms} SMS/term</div>
            <div>💾 ${p.features.storage}GB Storage</div>
            <div>${p.features.api?'✅':'❌'} API Access</div>
            <div>${p.features.whatsapp?'✅':'❌'} WhatsApp</div>
            <div>🛎️ ${p.features.support} support</div>
          </div>
          <button class="btn w-full btn-${isCurrent?'secondary':'primary'}" style="font-size:13px" onclick="Pages.Settings.choosePlan('${p.key}',${p.price})">
            ${isCurrent?'✅ Current Plan':'Choose '+p.name}
          </button>
        </div>`;
      }).join('')}
    </div>

    <!-- Payment history -->
    <div class="card">
      <div class="card-header"><h3>💳 Payment History</h3></div>
      <div id="billing-history"><div style="text-align:center;padding:24px"><div class="loading-spinner" style="margin:auto"></div></div></div>
    </div>`;

  // Load payment history
  API.get('/subscriptions/payments').then(r => {
    const payments = r?.data || [];
    document.getElementById('billing-history').innerHTML = payments.length
      ? `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead>
         <tbody>${payments.map(p=>`<tr>
           <td>${UI.date(p.paid_at)}</td>
           <td style="font-weight:700">${UI.currency(p.amount)}</td>
           <td>${(p.payment_method||'').replace(/_/g,' ').toUpperCase()}</td>
           <td><code style="font-size:11px">${p.reference||p.mpesa_receipt||'—'}</code></td>
           <td><span class="badge badge-green">PAID</span></td>
         </tr>`).join('')}</tbody></table></div>`
      : `<div style="text-align:center;padding:32px;color:var(--text-muted)">No payment records yet</div>`;
  }).catch(()=>{});
};

Pages.Settings.selectPlan = function(planKey) {
  // Highlight selected
  document.querySelectorAll('#settings-billing-area [onclick*="selectPlan"]').forEach(el=>{ el.style.borderColor='var(--border)'; });
};

Pages.Settings.choosePlan = function(planKey, price) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay open" id="billing-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:500px">
        <div class="modal-header" style="background:var(--green);color:white">
          <h3 style="color:white;margin:0">💳 Subscribe — ${planKey.charAt(0).toUpperCase()+planKey.slice(1)}</h3>
          <button onclick="document.getElementById('billing-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
        </div>
        <div class="modal-body" style="padding:24px">
          <div style="background:var(--green-bg);border-radius:10px;padding:16px;margin-bottom:20px;text-align:center">
            <div style="font-size:28px;font-weight:800;color:var(--green)">KES ${price.toLocaleString()}</div>
            <div style="font-size:13px;color:var(--text-muted)">per term · ${planKey} plan</div>
          </div>
          <div class="form-group" style="margin-bottom:14px">
            <label class="form-label">Payment Method</label>
            <select id="bm-method" class="form-control" onchange="Pages.Settings.togglePayFields()">
              <option value="mpesa_paybill">M-Pesa Paybill</option>
              <option value="mpesa_stk">M-Pesa STK Push</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div id="mpesa-fields">
            <div style="background:#E8F5E9;border-radius:10px;padding:16px;margin-bottom:14px">
              <div style="font-weight:700;margin-bottom:6px">📱 M-Pesa Paybill</div>
              <div style="font-size:13px">Business No: <strong>522522</strong></div>
              <div style="font-size:13px">Account No: <strong>ELIMU-${Math.floor(Math.random()*9000)+1000}</strong></div>
              <div style="font-size:13px;color:var(--text-muted);margin-top:6px">Pay KES ${price.toLocaleString()}, then enter receipt below</div>
            </div>
            <div class="form-group" style="margin-bottom:14px">
              <label class="form-label">M-Pesa Receipt *</label>
              <input id="bm-receipt" class="form-control" placeholder="e.g. QHJ1234567">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input id="bm-phone" class="form-control" placeholder="+254 7XX XXX XXX">
            </div>
          </div>
          <div id="bank-fields" style="display:none">
            <div style="background:#E3F2FD;border-radius:10px;padding:16px;margin-bottom:14px">
              <div style="font-weight:700;margin-bottom:6px">🏦 Bank Transfer</div>
              <div style="font-size:13px">Bank: <strong>Equity Bank</strong></div>
              <div style="font-size:13px">Account: <strong>0180293648191</strong></div>
              <div style="font-size:13px">Reference: <strong>ELIMU-SUB-${new Date().getFullYear()}</strong></div>
            </div>
            <div class="form-group">
              <label class="form-label">Bank Reference</label>
              <input id="bm-bankref" class="form-control" placeholder="Transaction reference">
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding:14px 24px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-secondary" onclick="document.getElementById('billing-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="Pages.Settings.submitPlanChoice('${planKey}')">✅ Confirm Subscription</button>
        </div>
      </div>
    </div>`);
};

Pages.Settings.togglePayFields = function() {
  const method = document.getElementById('bm-method')?.value;
  const mpesa = document.getElementById('mpesa-fields');
  const bank  = document.getElementById('bank-fields');
  if (mpesa) mpesa.style.display = method.includes('mpesa') ? '' : 'none';
  if (bank)  bank.style.display  = method === 'bank_transfer' ? '' : 'none';
};

Pages.Settings.submitPlanChoice = async function(planKey) {
  const method  = document.getElementById('bm-method')?.value;
  const receipt = document.getElementById('bm-receipt')?.value?.trim();
  const phone   = document.getElementById('bm-phone')?.value?.trim();
  const bankRef = document.getElementById('bm-bankref')?.value?.trim();
  if (method.includes('mpesa') && !receipt) { Toast.error('Enter M-Pesa receipt number'); return; }
  if (method === 'bank_transfer' && !bankRef) { Toast.error('Enter bank reference number'); return; }
  const btn = document.querySelector('#billing-modal .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }
  const r = await API.post('/subscriptions/choose', { plan:planKey, paymentMethod:method, mpesaReceipt:receipt, mpesaPhone:phone, bankRef });
  if (r?.message) {
    Toast.success('🎉 Subscription activated! ' + r.message);
    document.getElementById('billing-modal')?.remove();
    Pages.Settings.loadBilling();
  } else {
    Toast.error(r?.error || 'Failed to activate subscription');
    if (btn) { btn.disabled = false; btn.textContent = '✅ Confirm Subscription'; }
  }
};

}
