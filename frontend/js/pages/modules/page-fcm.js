'use strict';
if (typeof Pages !== 'undefined') {
Pages.Fcm = {
  async load() {
    const area = document.getElementById('page-fcm');
    if (!area) return;
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-title">🔔 Push Notifications</h2><p class="page-subtitle">Firebase Cloud Messaging — send push notifications to the ElimuSaaS Android app</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.Fcm.sendNotification()">📤 Send Notification</button></div>
      </div>
      <div style="background:#FFF9C4;border-radius:12px;padding:16px;margin-bottom:20px;display:flex;gap:12px;align-items:center">
        <span style="font-size:24px">📱</span>
        <div><strong>Firebase Cloud Messaging</strong> delivers push notifications to all devices with the ElimuSaaS app installed. Configure FCM Server Key in Settings → Integrations.</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <div class="card-header"><h3>📊 Notification Stats</h3></div>
          <div style="padding:16px;display:flex;flex-direction:column;gap:10px">
            ${[["Total Sent","1,284","📤"],["Delivered","1,201","✅"],["Failed","83","❌"],["Active Devices","342","📱"]].map(([l,v,i])=>`
              <div style="display:flex;justify-content:space-between;padding:10px;background:var(--bg-elevated);border-radius:8px">
                <span style="font-size:13px">${i} ${l}</span><span style="font-weight:700">${v}</span>
              </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📋 Recent Notifications</h3></div>
          <div style="padding:0">
            ${[{title:'Report Cards Ready',body:'Term 3 2024 report cards are now available',sent:'2024-10-05',devices:298},{title:'Fee Reminder',body:'School fees due 15th October 2024',sent:'2024-10-01',devices:156},{title:'Meeting Notice',body:'Parent meeting this Saturday 9 AM',sent:'2024-09-28',devices:312}].map(n=>`
              <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
                <div style="font-weight:600;font-size:13px">${n.title}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${n.body.slice(0,50)}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">📱 ${n.devices} devices · ${n.sent}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>`;
  },
  sendNotification() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay open" id="fcm-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:460px"><div class="modal-header" style="background:var(--brand);color:white"><h3 style="color:white;margin:0">🔔 Send Push Notification</h3><button onclick="document.getElementById('fcm-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
      <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:12px">
        <div class="form-group" style="margin:0"><label class="form-label">Target Audience</label>
          <select class="form-control"><option>All App Users</option><option>Principals Only</option><option>Teachers Only</option><option>Parents Only</option><option>Students Only</option></select></div>
        <div class="form-group" style="margin:0"><label class="form-label">Title *</label><input class="form-control" placeholder="Notification title"></div>
        <div class="form-group" style="margin:0"><label class="form-label">Message *</label><textarea class="form-control" rows="3" placeholder="Push notification message..."></textarea></div>
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('fcm-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="Toast.success('Push notification sent!');document.getElementById('fcm-modal').remove()">📤 Send</button>
      </div></div></div>`);
  }
};
}
