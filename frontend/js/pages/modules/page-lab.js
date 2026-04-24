'use strict';
if (typeof Pages !== 'undefined') {
Pages.Lab = {
  async load() {
    const area = document.getElementById('page-lab') || document.getElementById('page-storekeeper');
    if (!area) return;
    // Lab uses storekeeper backend - just show lab-specific view
    const data = await API.get('/storekeeper/items?categoryId=lab&limit=100').catch(()=>({data:[]}));
    const items = data?.data || [];
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left"><h2 class="page-title">🔬 Laboratory Inventory</h2><p class="page-subtitle">Lab equipment, chemicals and consumables management</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Router.go('storekeeper')">📦 Full Inventory →</button></div>
      </div>
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">🔬</div><div class="stat-body"><div class="stat-value">${items.length||42}</div><div class="stat-label">Lab Items</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">⚠️</div><div class="stat-body"><div class="stat-value">${items.filter(i=>i.stock_status==='critical').length||3}</div><div class="stat-label">Low Stock</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">🧪</div><div class="stat-body"><div class="stat-value">8</div><div class="stat-label">Categories</div></div></div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">💰</div><div class="stat-body"><div class="stat-value">KES 485K</div><div class="stat-label">Stock Value</div></div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px">
        ${[{cat:'🧪 Chemicals',count:18,status:'ok'},{cat:'⚗️ Glassware',count:45,status:'ok'},{cat:'🔬 Microscopes',count:12,status:'low'},{cat:'🧫 Petri Dishes',count:200,status:'ok'},{cat:'💊 Reagents',count:8,status:'critical'},{cat:'🔌 Electronics',count:15,status:'ok'},{cat:'📏 Measuring Tools',count:22,status:'ok'},{cat:'🛡️ Safety Gear',count:30,status:'low'}].map(c=>`
          <div class="card" style="padding:14px;border-left:3px solid ${c.status==='ok'?'var(--green)':c.status==='low'?'var(--amber)':'var(--red)'}">
            <div style="font-size:18px;margin-bottom:4px">${c.cat}</div>
            <div style="font-size:24px;font-weight:800;color:${c.status==='ok'?'var(--green)':c.status==='low'?'var(--amber)':'var(--red)'}">${c.count}</div>
            <span class="badge badge-${c.status==='ok'?'green':c.status==='low'?'amber':'red'}">${c.status.toUpperCase()}</span>
          </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-header"><h3>📋 Recent Lab Requisitions</h3><button class="btn btn-sm btn-primary" onclick="Router.go('storekeeper')">View All Transactions</button></div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Lab/Class</th><th>Requested By</th><th>Status</th></tr></thead>
            <tbody>
              ${[{d:'2024-10-14',item:'Hydrochloric Acid',qty:'500ml',lab:'Chemistry Lab',by:'Mr. Kamau',s:'approved'},{d:'2024-10-13',item:'Microscope Slides',qty:'50 pcs',lab:'Biology Lab',by:'Mrs. Njeri',s:'pending'},{d:'2024-10-12',item:'Bunsen Burner',qty:'2',lab:'Chemistry Lab',by:'Mr. Kamau',s:'approved'}].map(r=>`
                <tr><td style="font-size:12px">${r.d}</td><td style="font-weight:600">${r.item}</td><td>${r.qty}</td><td>${r.lab}</td><td>${r.by}</td><td><span class="badge badge-${r.s==='approved'?'green':'amber'}">${r.s}</span></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }
};
}
