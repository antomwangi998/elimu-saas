'use strict';
if (typeof Pages !== 'undefined') {
Pages.MessagingChannels = Pages.Messaging = {
  async load() {
    const area = document.getElementById('page-messaging-channels');
    if (!area) return;
    const channels = [
      {icon:'📱',name:"Africa's Talking SMS",desc:'Bulk SMS to parents and students. Requires AT API key.',status:'configured'},
      {icon:'💬',name:'WhatsApp Business',desc:'WhatsApp messages via Meta Business API.',status:'not_configured'},
      {icon:'📧',name:'SMTP Email',desc:'Email notifications, newsletters and statements.',status:'not_configured'},
      {icon:'🔔',name:'Firebase Push (FCM)',desc:'Push notifications to Android app users.',status:'not_configured'},
    ];
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">📡 Messaging Channels</h2>
          <p class="page-subtitle">Configure SMS, WhatsApp, Email and Push notification channels</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px">
        ${channels.map(ch => `
          <div class="card">
            <div style="padding:20px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                <div style="font-size:32px">${ch.icon}</div>
                <span class="badge badge-${ch.status==='configured'?'green':'gray'}">${ch.status==='configured'?'✅ Active':'Not Configured'}</span>
              </div>
              <div style="font-weight:700;margin-bottom:6px">${ch.name}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">${ch.desc}</div>
              <button class="btn btn-${ch.status==='configured'?'secondary':'primary'} w-full" onclick="Router.go('settings')">
                ${ch.status==='configured'?'⚙️ Manage':'🔧 Configure'}
              </button>
            </div>
          </div>`).join('')}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header"><h3>📊 Message Volume This Month</h3></div>
        <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px">
          ${[['SMS Sent','1,284','📱'],['WhatsApp','0','💬'],['Emails','0','📧'],['Push Notifs','342','🔔']].map(([l,v,i]) => `
            <div style="text-align:center;padding:16px;background:var(--bg-elevated);border-radius:10px">
              <div style="font-size:22px;margin-bottom:4px">${i}</div>
              <div style="font-size:22px;font-weight:800;color:var(--brand)">${v}</div>
              <div style="font-size:11px;color:var(--text-muted)">${l}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }
};
}
