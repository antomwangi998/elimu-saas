'use strict';
if (typeof Pages !== 'undefined') {
Pages.Whatsapp = {
  async load() {
    const area = document.getElementById('page-whatsapp');
    if (!area) return;
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-title">💬 WhatsApp Messaging</h2><p class="page-subtitle">Send messages to parents and students via WhatsApp Business API</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.Whatsapp.openCompose()">+ New Message</button></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">284</div><div class="stat-label">Messages Sent</div></div></div>
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">👁️</div><div class="stat-body"><div class="stat-value">201</div><div class="stat-label">Delivered</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">⏳</div><div class="stat-body"><div class="stat-value">83</div><div class="stat-label">Pending</div></div></div>
      </div>
      <div style="background:#E8F5E9;border-radius:12px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
        <div style="font-size:28px">💬</div>
        <div>
          <div style="font-weight:700;margin-bottom:4px">WhatsApp Business Integration</div>
          <div style="font-size:13px;color:#555">Connect your WhatsApp Business API account to send automated fee reminders, report card notifications, and announcements to parents.</div>
        </div>
        <button class="btn btn-primary" style="flex-shrink:0" onclick="Router.go('settings')">Configure →</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>📋 Message History</h3></div>
        <div style="padding:0">
          ${[{msg:'Term 3 fee reminder',recipients:156,sent:'2024-10-10',status:'delivered'},{msg:'Report cards are ready',recipients:234,sent:'2024-10-05',status:'delivered'},{msg:'Parent meeting - Saturday',recipients:298,sent:'2024-09-28',status:'delivered'}].map(m=>`
            <div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
              <div style="width:40px;height:40px;border-radius:50%;background:#E8F5E9;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">💬</div>
              <div style="flex:1"><div style="font-weight:600">${m.msg}</div><div style="font-size:12px;color:var(--text-muted)">${m.recipients} recipients · ${m.sent}</div></div>
              <span class="badge badge-green">${m.status}</span>
            </div>`).join('')}
        </div>
      </div>`;
  },
  openCompose() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay open" id="wa-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:500px"><div class="modal-header" style="background:#25D366;color:white"><h3 style="color:white;margin:0">💬 New WhatsApp Message</h3><button onclick="document.getElementById('wa-modal').remove()" style="background:rgba(0,0,0,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
      <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:12px">
        <div class="form-group" style="margin:0"><label class="form-label">Send To</label>
          <select class="form-control"><option>All Parents</option><option>Form 4 Parents</option><option>Form 3 Parents</option><option>Boarders Parents</option><option>Defaulters Parents</option><option>Individual Parent</option></select></div>
        <div class="form-group" style="margin:0"><label class="form-label">Message Template</label>
          <select class="form-control"><option>Fee Reminder</option><option>Report Card Ready</option><option>Meeting Notice</option><option>Custom Message</option></select></div>
        <div class="form-group" style="margin:0"><label class="form-label">Message *</label>
          <textarea class="form-control" rows="4" placeholder="Type your WhatsApp message...">Dear Parent, this is a reminder that school fees for Term 3 2024 are due. Please pay via Paybill 522522. Thank you.</textarea></div>
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('wa-modal').remove()">Cancel</button>
        <button class="btn" style="background:#25D366;color:white;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;font-weight:700" onclick="Toast.success('WhatsApp messages queued for delivery!');document.getElementById('wa-modal').remove()">💬 Send</button>
      </div></div></div>`);
  }
};
}
