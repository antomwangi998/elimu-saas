// ============================================================
// ElimuSaaS -- Beyond Zeraki Feature Pages (Part 1)
// Hostel · Transport · Canteen · Health · Assets · Visitors
// Notice Board · Bursary · Wellness · Career · Portfolio
// Tutoring · Polls · Branding · AI Predictions
// ============================================================

const _b2  = (t,c) => `<span class="badge badge-${c||'gray'}">${t}</span>`;
const _m   = v => `KES ${parseFloat(v||0).toLocaleString()}`;
const _d   = d => d ? new Date(d).toLocaleDateString('en-KE') : '--';
const _dt2 = d => d ? new Date(d).toLocaleString('en-KE') : '--';
const _tbl = (hs, rows, empty='No data') => {
  if(!rows.length) return UI.empty(empty);
  return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>
    ${hs.map(h=>`<th style="padding:7px 10px;border-bottom:2px solid var(--border);text-align:left;font-size:11px;color:var(--text-secondary);text-transform:uppercase">${h}</th>`).join('')}
  </tr></thead><tbody>${rows}</tbody></table></div>`;
};
const _tr = cells => `<tr style="border-bottom:1px solid var(--border-subtle)">${cells.map(c=>`<td style="padding:6px 10px;font-size:12px">${c}</td>`).join('')}</tr>`;
const _gid = id => document.getElementById(id);

// ============================================================
// HOSTEL / DORMITORY
// ============================================================
Pages.Hostel = {
  async load() { this.switchTab('hostels'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-hostel .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-hostel .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=_gid('hostel-content'); if(!c)return;
    if(tab==='hostels') this._renderHostels(c);
    else if(tab==='allocations') this._renderAllocations(c);
    else if(tab==='rooms') this._renderRooms(c);
    else if(tab==='stats') this._renderStats(c);
  },
  async _renderHostels(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/hostel');
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Hostel.openAdd()">+ Add Hostel</button></div>
    ${!d.length?UI.empty('No hostels configured'):`<div class="grid-auto">${d.map(h=>`
      <div class="card" style="border-top:4px solid var(--brand)">
        <div class="card-header"><div><div class="card-title">${h.name}</div><div class="card-subtitle">${h.gender} · Warden: ${h.warden_name||'--'}</div></div>${_b2(h.gender==='boys'?'Boys':h.gender==='girls'?'Girls':'Mixed','blue')}</div>
        <div style="display:flex;gap:10px;margin:10px 0;padding:10px;background:var(--bg-elevated);border-radius:8px">
          <div style="text-align:center;flex:1"><div style="font-size:28px;font-weight:800;color:var(--brand)">${h.current_occupancy||0}</div><div style="font-size:10px;color:var(--text-muted)">Occupied</div></div>
          <div style="text-align:center;flex:1"><div style="font-size:28px;font-weight:800">${h.capacity}</div><div style="font-size:10px;color:var(--text-muted)">Capacity</div></div>
          <div style="text-align:center;flex:1"><div style="font-size:28px;font-weight:800;color:var(--green)">${h.capacity-(h.current_occupancy||0)}</div><div style="font-size:10px;color:var(--text-muted)">Available</div></div>
        </div>
        <div style="background:var(--border);height:4px;border-radius:2px;overflow:hidden"><div style="width:${h.capacity?(h.current_occupancy/h.capacity*100).toFixed(0):0}%;height:100%;background:var(--${(h.current_occupancy/h.capacity)>0.9?'red':'accent'})"></div></div>
        <div style="display:flex;gap:4px;margin-top:10px"><button class="btn btn-sm btn-secondary" onclick="Pages.Hostel._viewRooms('${h.id}','${h.name.replace(/'/g,"\\'")}')">View Rooms</button><button class="btn btn-sm btn-primary" onclick="Pages.Hostel.openAllocate('${h.id}','${h.name.replace(/'/g,"\\'")}')">Allocate Student</button></div>
      </div>`).join('')}</div>`}`;
  },
  async _renderAllocations(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/hostel/allocations');
    c.innerHTML=_tbl(['Student','Adm #','Class','Hostel','Room','Bed','Action'],
      d.map(a=>_tr([`<strong>${a.first_name} ${a.last_name}</strong>`,a.admission_number,a.class_name||'--',a.hostel_name,a.room_number,a.bed_number||'--',`<button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Hostel.vacate('${a.id}')">Vacate</button>`])).join(''), 'No allocations');
  },
  async _renderRooms(c) { c.innerHTML=`<div class="alert alert-info">Select a hostel from the Hostels tab to view rooms.</div>`; },
  async _renderStats(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/hostel/stats');
    c.innerHTML=`<div class="stats-grid">${d.map(h=>`<div class="stat-card"><div class="stat-body"><div class="stat-value">${h.occupied||0}/${h.capacity}</div><div class="stat-label">${h.name}</div></div></div>`).join('')}</div>`;
  },
  openAdd() { ['h-name','h-warden-id'].forEach(id=>{const e=_gid(id);if(e)e.value='';}); UI.openModal('modal-hostel'); },
  async saveHostel() {
    const r=await API.post('/hostel',{name:_gid('h-name')?.value?.trim(),gender:_gid('h-gender')?.value||'mixed',capacity:+(_gid('h-capacity')?.value||0)});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Hostel added!');UI.closeModal('modal-hostel');this._renderHostels(_gid('hostel-content'));
  },
  async _viewRooms(hostelId, hostelName) {
    const d=await API.get(`/hostel/${hostelId}/rooms`);
    UI.showInfoModal(`${hostelName} -- Rooms`,`
      <div style="display:flex;justify-content:flex-end;margin-bottom:8px"><button class="btn btn-sm btn-primary" onclick="Pages.Hostel.addRoom('${hostelId}')">+ Add Room</button></div>
      <div class="grid-auto">${d.map(r=>`<div class="card"><div style="font-size:20px;font-weight:800;text-align:center">${r.room_number}</div><div style="text-align:center;font-size:12px;color:var(--text-muted)">${r.current_occ||0}/${r.capacity} occupied</div>${_b2(r.room_type,'blue')}</div>`).join('')||UI.empty('No rooms')}</div>`);
  },
  async addRoom(hostelId) { const n=prompt('Room number:'); if(!n)return; const cap=parseInt(prompt('Capacity (beds):')||4); await API.post(`/hostel/${hostelId}/rooms`,{roomNumber:n,capacity:cap}); Toast.success('Room added!'); },
  async openAllocate(hostelId, hostelName) {
    const rooms=await API.get(`/hostel/${hostelId}/rooms`);
    const avail=rooms.filter(r=>parseInt(r.current_occ||0)<r.capacity);
    if(!avail.length){Toast.warning('All rooms in this hostel are full');return;}
    _gid('alloc-hostel-id').value=hostelId;
    const rs=_gid('alloc-room');
    if(rs) rs.innerHTML=avail.map(r=>`<option value="${r.id}">${r.room_number} (${r.current_occ||0}/${r.capacity})</option>`).join('');
    _gid('alloc-student').value=''; _gid('alloc-student-id').value=''; _gid('alloc-results').innerHTML='';
    UI.openModal('modal-allocate');
  },
  async searchStudent(q) {
    const r=_gid('alloc-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="_gid('alloc-student').value='${s.first_name} ${s.last_name}';_gid('alloc-student-id').value='${s.id}';_gid('alloc-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  async saveAllocation() {
    const hostelId=_gid('alloc-hostel-id')?.value,roomId=_gid('alloc-room')?.value,studentId=_gid('alloc-student-id')?.value;
    if(!studentId||!roomId){Toast.error('Select student and room');return;}
    const r=await API.post('/hostel/allocate',{studentId,hostelId,roomId,bedNumber:_gid('alloc-bed')?.value,term:_gid('alloc-term')?.value||'term_1',year:new Date().getFullYear()});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Student allocated!');UI.closeModal('modal-allocate');this._renderAllocations(_gid('hostel-content'));
  },
  async vacate(id) { if(!await UI.confirm('Vacate this student from hostel?'))return; const r=await API.put(`/hostel/${id}/vacate`,{}); if(r.error){Toast.error(r.error);return;} Toast.success('Vacated!');this._renderAllocations(_gid('hostel-content')); },
};

// ============================================================
// TRANSPORT
// ============================================================
Pages.Transport = {
  async load() { this.switchTab('vehicles'); },
  switchTab(tab,el) {
    document.querySelectorAll('#page-transport .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-transport .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=_gid('transport-content'); if(!c)return;
    if(tab==='vehicles') this._renderVehicles(c);
    else if(tab==='routes') this._renderRoutes(c);
    else if(tab==='subscribers') this._renderSubs(c);
  },
  async _renderVehicles(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/transport/vehicles');
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Transport.openAddVehicle()">+ Add Vehicle</button></div>
    ${!d.length?UI.empty('No vehicles registered'):
    `<div class="grid-auto">${d.map(v=>`<div class="card" style="border-left:4px solid ${v.is_active?'var(--green)':'var(--red)'}">
      <div class="card-header"><div><div class="card-title">🚌 ${v.registration}</div><div class="card-subtitle">${v.make||''} ${v.model||''}</div></div>${_b2(v.is_active?'Active':'Inactive',v.is_active?'green':'red')}</div>
      <div style="font-size:12px;margin:6px 0">${[['Driver',v.driver_name||'--'],['Phone',v.driver_phone||'--'],['Capacity',v.capacity+' seats'],['Route',v.route_name||'--'],['Students',v.students||0]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:var(--text-muted)">${k}</span><strong>${v}</strong></div>`).join('')}</div>
      ${v.insurance_expiry&&new Date(v.insurance_expiry)<new Date()?`<div class="alert alert-danger" style="font-size:11px;padding:4px 8px;margin:6px 0">⚠️ Insurance expired ${_d(v.insurance_expiry)}</div>`:''}
      <button class="btn btn-sm btn-secondary w-full" onclick="Pages.Transport.editVehicle('${v.id}')">Edit</button>
    </div>`).join('')}</div>`}`;
  },
  async _renderRoutes(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/transport/routes');
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Transport.openAddRoute()">+ Add Route</button></div>
    ${_tbl(['Route','Vehicle','Morning','Afternoon','Subscribers','Term Fee','Action'],
      d.map(r=>_tr([`<strong>${r.name}</strong>${r.description?`<div style="font-size:10px;color:var(--text-muted)">${r.description}</div>`:''}`,r.registration||'Not assigned',r.morning_departure||'--',r.afternoon_departure||'--',r.subscriber_count||0,_m(r.term_fee),`<button class="btn btn-sm btn-primary" onclick="Pages.Transport.subscribeStudent('${r.id}','${r.name.replace(/'/g,"\\'")}')">+ Student</button>`])).join(''), 'No routes configured')}`;
  },
  async _renderSubs(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/transport/subscriptions');
    c.innerHTML=_tbl(['Student','Class','Route','Pickup Stop','Fee Paid'],
      d.map(s=>_tr([`<strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px">${s.admission_number}</div>`,s.class_name||'--',s.route_name,s.pickup_stop||'--',s.fee_paid?_b2('Paid','green'):_b2('Unpaid','red')])).join(''), 'No subscribers');
  },
  openAddVehicle() { UI.openModal('modal-vehicle'); ['tv-reg','tv-make','tv-model','tv-driver','tv-phone','tv-route'].forEach(id=>{const e=_gid(id);if(e)e.value='';}); _gid('tv-cap').value=30; },
  async saveVehicle() {
    const r=await API.post('/transport/vehicles',{registration:_gid('tv-reg')?.value?.trim(),make:_gid('tv-make')?.value,model:_gid('tv-model')?.value,capacity:+(_gid('tv-cap')?.value||30),driverName:_gid('tv-driver')?.value,driverPhone:_gid('tv-phone')?.value,routeName:_gid('tv-route')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Vehicle added!');UI.closeModal('modal-vehicle');this._renderVehicles(_gid('transport-content'));
  },
  openAddRoute() { UI.openModal('modal-route'); },
  async saveRoute() {
    const r=await API.post('/transport/routes',{name:_gid('tr-name')?.value?.trim(),description:_gid('tr-desc')?.value,morningDeparture:_gid('tr-morning')?.value,afternoonDeparture:_gid('tr-afternoon')?.value,termFee:+(_gid('tr-fee')?.value||0)});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Route added!');UI.closeModal('modal-route');this._renderRoutes(_gid('transport-content'));
  },
  async subscribeStudent(routeId, routeName) {
    const adm=prompt(`Enter student admission number for route: ${routeName}`); if(!adm)return;
    const d=await API.get(`/search/students?q=${adm}&limit=3`);
    if(!d.length){Toast.error('Student not found');return;}
    const s=d[0];
    if(!await UI.confirm(`Add ${s.first_name} ${s.last_name} to route: ${routeName}?`))return;
    const r=await API.post('/transport/subscribe',{studentId:s.id,routeId,term:'term_1',year:new Date().getFullYear()});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`${s.first_name} subscribed to ${routeName}!`);
    this._renderSubs(_gid('transport-content'));
  },
  editVehicle(id) { Toast.info('Edit vehicle coming soon'); },
};

// ============================================================
// CANTEEN / CASHLESS PAYMENTS
// ============================================================
Pages.Canteen = {
  async load() { this.switchTab('pos'); },
  switchTab(tab,el) {
    document.querySelectorAll('#page-canteen .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-canteen .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=_gid('canteen-content'); if(!c)return;
    if(tab==='pos') this._renderPOS(c);
    else if(tab==='topup') this._renderTopup(c);
    else if(tab==='items') this._renderItems(c);
    else if(tab==='sales') this._renderSales(c);
    else if(tab==='transactions') this._renderTransactions(c);
  },
  async _renderPOS(c) {
    const items=await API.get('/canteen/items');
    c.innerHTML=`<div class="grid-2">
      <div>
        <div style="margin-bottom:12px"><input type="text" id="pos-student-adm" placeholder="Student admission number…" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-elevated);color:var(--text-primary)">
          <button class="btn btn-primary btn-sm" style="margin-top:6px;width:100%" onclick="Pages.Canteen.lookupStudent()">Lookup Student</button>
          <div id="pos-student-info" style="margin-top:8px"></div>
        </div>
        <div id="pos-cart" style="background:var(--bg-elevated);border-radius:10px;padding:12px;min-height:120px">
          <div style="font-weight:600;margin-bottom:8px">🛒 Cart</div>
          <div id="pos-cart-items" style="font-size:12px">Empty</div>
          <div style="border-top:1px solid var(--border);margin-top:10px;padding-top:10px;font-weight:700;font-size:16px">Total: <span id="pos-total">KES 0</span></div>
        </div>
        <button class="btn btn-success w-full" style="margin-top:10px" onclick="Pages.Canteen.checkout()">💳 Pay Now</button>
      </div>
      <div>
        <div style="font-weight:600;margin-bottom:8px">Menu Items</div>
        <div class="grid-auto">${items.filter(i=>i.is_available).map(i=>`<div class="card" style="cursor:pointer;text-align:center" onclick="Pages.Canteen.addToCart('${i.id}','${i.name.replace(/'/g,"\\'")}',${i.price})"><div style="font-size:20px">🍽️</div><div style="font-weight:600;font-size:12px">${i.name}</div><div style="color:var(--green);font-weight:700">KES ${parseFloat(i.price).toLocaleString()}</div><div style="font-size:10px;color:var(--text-muted)">${i.category}</div></div>`).join('')||UI.empty('No items in menu')}</div>
      </div>
    </div>`;
    this._cart=[];
    this._currentStudentId=null;
  },
  async lookupStudent() {
    const adm=_gid('pos-student-adm')?.value?.trim(); if(!adm)return;
    const d=await API.get(`/search/students?q=${adm}&limit=1`);
    if(!d.length){_gid('pos-student-info').innerHTML=`<div class="alert alert-danger">Student not found</div>`;return;}
    const s=d[0];
    const w=await API.get(`/canteen/wallet/${s.id}`);
    this._currentStudentId=s.id;
    _gid('pos-student-info').innerHTML=`<div style="background:var(--bg-elevated);border-radius:8px;padding:10px"><div style="font-weight:700">${s.first_name} ${s.last_name}</div><div style="font-size:11px;color:var(--text-muted)">${s.admission_number} · ${s.class_name||''}</div><div style="font-size:20px;font-weight:800;color:var(--${parseFloat(w.balance||0)>0?'green':'red'})">${_m(w.balance)}</div><div style="font-size:10px;color:var(--text-muted)">Wallet Balance</div></div>`;
  },
  addToCart(id,name,price) {
    const existing=this._cart.find(i=>i.id===id);
    if(existing) existing.qty++; else this._cart.push({id,name,price:parseFloat(price),qty:1});
    this._updateCart();
  },
  _updateCart() {
    const total=this._cart.reduce((s,i)=>s+i.price*i.qty,0);
    _gid('pos-cart-items').innerHTML=this._cart.length?this._cart.map(i=>`<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${i.name} x${i.qty}</span><div style="display:flex;align-items:center;gap:8px"><span>${_m(i.price*i.qty)}</span><button onclick="Pages.Canteen.removeFromCart('${i.id}')" style="background:none;border:none;color:var(--red);cursor:pointer">✕</button></div></div>`).join(''):'Empty';
    _gid('pos-total').textContent=_m(total);
  },
  removeFromCart(id) { this._cart=this._cart.filter(i=>i.id!==id); this._updateCart(); },
  async checkout() {
    if(!this._currentStudentId){Toast.error('Select a student first');return;}
    if(!this._cart.length){Toast.error('Cart is empty');return;}
    const r=await API.post('/canteen/purchase',{studentId:this._currentStudentId,items:this._cart});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`✅ Payment of ${_m(this._cart.reduce((s,i)=>s+i.price*i.qty,0))} deducted. New balance: ${_m(r.balance)}`);
    this._cart=[];this._currentStudentId=null;this._renderPOS(_gid('canteen-content'));
  },
  async _renderTopup(c) {
    c.innerHTML=`<div class="card" style="max-width:500px"><div class="card-header"><div class="card-title">💳 Top Up Student Wallet</div></div>
      <div class="form-group"><label>Student</label><input type="text" id="topup-student" placeholder="Search student…" oninput="Pages.Canteen._searchTopupStudent(this.value)"><div id="topup-results"></div><input type="hidden" id="topup-student-id"></div>
      <div id="topup-balance" style="margin-bottom:12px"></div>
      <div class="form-group"><label>Amount (KES)</label><input type="number" id="topup-amount" placeholder="e.g. 500" min="1" step="50"></div>
      <div class="form-group"><label>Reference</label><input type="text" id="topup-ref" placeholder="M-Pesa ref, cash, etc."></div>
      <button class="btn btn-success w-full" onclick="Pages.Canteen.topUp()">Top Up Wallet</button>
    </div>`;
  },
  async _searchTopupStudent(q) {
    const r=_gid('topup-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="Pages.Canteen._setTopupStudent('${s.id}','${s.first_name} ${s.last_name}','${s.admission_number}')"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  async _setTopupStudent(id,name,adm) {
    _gid('topup-student').value=`${name} (${adm})`; _gid('topup-student-id').value=id; _gid('topup-results').innerHTML='';
    const w=await API.get(`/canteen/wallet/${id}`);
    _gid('topup-balance').innerHTML=`<div class="alert alert-info">Current balance: <strong>${_m(w.balance)}</strong></div>`;
  },
  async topUp() {
    const r=await API.post('/canteen/topup',{studentId:_gid('topup-student-id')?.value,amount:+(_gid('topup-amount')?.value||0),reference:_gid('topup-ref')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`✅ Wallet topped up! New balance: ${_m(r.balance)}`);
    _gid('topup-amount').value=''; _gid('topup-balance').innerHTML=`<div class="alert alert-success">New balance: <strong>${_m(r.balance)}</strong></div>`;
  },
  async _renderItems(c) {
    const d=await API.get('/canteen/items');
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Canteen.openAddItem()">+ Add Item</button></div>
    ${_tbl(['Item','Category','Price','Stock','Status'],d.map(i=>_tr([`<strong>${i.name}</strong>`,i.category,_m(i.price),i.stock,i.is_available?_b2('Available','green'):_b2('Unavailable','red')])).join(''), 'No items')}`;
  },
  async openAddItem() { UI.openModal('modal-canteen-item'); },
  async saveItem() {
    const r=await API.post('/canteen/items',{name:_gid('ci-name')?.value?.trim(),category:_gid('ci-cat')?.value||'food',price:+(_gid('ci-price')?.value||0),stock:+(_gid('ci-stock')?.value||0)});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Item added!');UI.closeModal('modal-canteen-item');this._renderItems(_gid('canteen-content'));
  },
  async _renderSales(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/canteen/sales');
    const total=d.daily.reduce((s,r)=>s+parseFloat(r.total||0),0);
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:16px">
      ${[['30-day Revenue',_m(total),'var(--green)'],['Total Transactions',d.daily.reduce((s,r)=>s+parseInt(r.transactions||0),0),'var(--brand)'],['Days Active',d.daily.length,'var(--blue)']].map(([l,v,c])=>`<div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:${c}">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}
    </div>
    ${_tbl(['Date','Revenue','Transactions'],d.daily.map(r=>_tr([_d(r.date),`<strong>${_m(r.total)}</strong>`,r.transactions])).join(''), 'No sales data')}`;
  },
  async _renderTransactions(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/canteen/transactions');
    c.innerHTML=_tbl(['Student','Type','Amount','Balance After','Date'],
      d.map(t=>_tr([`<strong>${t.student_name}</strong><div style="font-size:10px">${t.admission_number}</div>`,_b2(t.transaction_type,t.transaction_type==='purchase'?'red':'green'),`<span style="color:${t.transaction_type==='purchase'?'var(--red)':'var(--green)'};font-weight:700">${t.transaction_type==='purchase'?'-':'+'}${_m(t.amount)}</span>`,_m(t.balance_after),_dt2(t.created_at)])).join(''), 'No transactions');
  },
};

// ============================================================
// HEALTH CLINIC
// ============================================================
Pages.Health = {
  async load() { this.switchTab('records'); },
  switchTab(tab,el) {
    document.querySelectorAll('#page-health .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-health .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=_gid('health-content'); if(!c)return;
    if(tab==='records') this._renderRecords(c);
    else if(tab==='sickbay') this._renderSickBay(c);
    else if(tab==='new') this._renderNewRecord(c);
    else if(tab==='medical-info') this._renderMedInfo(c);
    else if(tab==='stats') this._renderStats(c);
  },
  async _renderRecords(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/health?limit=100');
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Health.switchTab('new')">+ New Visit</button></div>
    ${_tbl(['Date','Student','Complaint','Diagnosis','Treatment','Referred','By'],
      d.map(r=>_tr([_d(r.visit_date),`<strong>${r.first_name} ${r.last_name}</strong><div style="font-size:10px">${r.admission_number}</div>`,(r.complaint||'').substring(0,40),(r.diagnosis||'--').substring(0,40),(r.treatment||'--').substring(0,30),r.referred?_b2('Yes','amber'):'--',r.attended_by_name||'--'])).join(''), 'No health records')}`;
  },
  async _renderSickBay(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/health/sick-bay');
    c.innerHTML=`${d.length?`<div class="alert alert-warning">${d.length} student(s) currently in sick bay</div>`:''}
    ${_tbl(['Student','Class','Complaint','Admitted','Action'],
      d.map(r=>_tr([`<strong>${r.first_name} ${r.last_name}</strong>`,r.class_name||'--',r.complaint,_d(r.admission_date),`<button class="btn btn-sm btn-success" onclick="Pages.Health.discharge('${r.id}')">Discharge</button>`])).join(''), 'Sick bay is empty ✅')}`;
  },
  _renderNewRecord(c) {
    c.innerHTML=`<div class="card" style="max-width:680px"><div class="card-header"><div class="card-title">🏥 New Health Visit</div></div>
      <div class="form-group"><label>Student</label><input type="text" id="hr-student" placeholder="Search student…" oninput="Pages.Health._searchStudent(this.value)"><div id="hr-results"></div><input type="hidden" id="hr-student-id"></div>
      <div class="grid-2">
        <div class="form-group"><label>Visit Date</label><input type="date" id="hr-date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>Temperature (°C)</label><input type="number" id="hr-temp" step="0.1" placeholder="37.0"></div>
      </div>
      <div class="form-group"><label>Complaint *</label><textarea id="hr-complaint" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
      <div class="form-group"><label>Diagnosis</label><textarea id="hr-diagnosis" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
      <div class="form-group"><label>Treatment</label><textarea id="hr-treatment" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
      <div class="form-group"><label>Medication Prescribed</label><input type="text" id="hr-meds" placeholder="Drug names and dosage"></div>
      <div class="grid-2">
        <div class="form-group"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="hr-referred"> Referred to hospital</label></div>
        <div class="form-group"><label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="hr-admitted"> Admitted to sick bay</label></div>
      </div>
      <div id="hr-referral-div" style="display:none" class="form-group"><label>Referral Hospital</label><input type="text" id="hr-hosp"></div>
      <button class="btn btn-primary" onclick="Pages.Health.saveRecord()">Save Record</button>
    </div>`;
    _gid('hr-referred').onchange=()=>{_gid('hr-referral-div').style.display=_gid('hr-referred').checked?'block':'none';};
  },
  async _searchStudent(q) {
    const r=_gid('hr-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="_gid('hr-student').value='${s.first_name} ${s.last_name}';_gid('hr-student-id').value='${s.id}';_gid('hr-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  async saveRecord() {
    const r=await API.post('/health',{studentId:_gid('hr-student-id')?.value,complaint:_gid('hr-complaint')?.value?.trim(),diagnosis:_gid('hr-diagnosis')?.value,treatment:_gid('hr-treatment')?.value,medication:_gid('hr-meds')?.value,temperature:_gid('hr-temp')?.value||null,referred:_gid('hr-referred')?.checked||false,referralHospital:_gid('hr-hosp')?.value,admitted:_gid('hr-admitted')?.checked||false});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Health record saved!');this._renderRecords(_gid('health-content'));
  },
  async _renderMedInfo(c) {
    c.innerHTML=`<div class="form-group"><label>Search Student</label><input type="text" id="med-search" placeholder="Student name or admission…" oninput="Pages.Health._searchMedStudent(this.value)"><div id="med-search-results"></div></div><div id="med-info-content"></div>`;
  },
  async _searchMedStudent(q) {
    const r=_gid('med-search-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="Pages.Health.loadMedInfo('${s.id}','${s.first_name} ${s.last_name}')"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  async loadMedInfo(id, name) {
    _gid('med-search-results').innerHTML='';
    const d=await API.get(`/health/medical/${id}`);
    _gid('med-info-content').innerHTML=`<div class="card"><div class="card-header"><div class="card-title">Medical Info: ${name}</div></div>
      <div class="grid-2">${[['Blood Group','blood_group'],['Allergies','allergies'],['Chronic Conditions','chronic_conditions'],['NHIF Number','nhif_number'],['Doctor','doctor_name'],['Doctor Phone','doctor_phone'],['Special Needs','special_needs'],['Emergency Contact','emergency_contact']].map(([l,k])=>`<div class="form-group"><label>${l}</label><input type="text" id="mi-${k}" value="${d[k]||''}" placeholder="${l}"></div>`).join('')}</div>
      <button class="btn btn-primary" onclick="Pages.Health.saveMedInfo('${id}')">Save Medical Info</button>
    </div>`;
  },
  async saveMedInfo(id) {
    const keys=['blood_group','allergies','chronic_conditions','nhif_number','doctor_name','doctor_phone','special_needs','emergency_contact'];
    const payload={}; keys.forEach(k=>{payload[k.replace(/_([a-z])/g,(_,l)=>l.toUpperCase())]=_gid(`mi-${k}`)?.value;});
    const r=await API.post(`/health/medical/${id}`,payload);
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Medical info saved!');
  },
  async discharge(id) { const r=await API.put(`/health/${id}/discharge`,{}); if(r.error){Toast.error(r.error);return;} Toast.success('Student discharged'); this._renderSickBay(_gid('health-content')); },
  async _renderStats(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/health/stats');
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:16px">
      ${[['Total Visits (30d)',d.total_visits,'var(--brand)'],['Referred',d.referred,'var(--amber)'],['Admitted',d.admitted,'var(--red)'],['In Sick Bay',d.currently_admitted,'var(--orange)']].map(([l,v,col])=>`<div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:${col}">${v||0}</div><div class="stat-label">${l}</div></div></div>`).join('')}
    </div>
    <div class="card"><div class="card-title" style="padding:14px">Top Complaints</div>
      ${_tbl(['Complaint','Count'],(d.commonComplaints||[]).map(c=>_tr([c.complaint,`<strong>${c.count}</strong>`])).join(''), 'No data')}
    </div>`;
  },
};

// ============================================================
// NOTICE BOARD
// ============================================================
Pages.NoticBoard = {
  async load() { this.render(); },
  async render(audience) {
    const c=_gid('noticeboard-content')||_gid('page-noticeboard'); if(!c)return;
    const role=AppState.user?.role;
    const canPost=['super_admin','school_admin','principal','deputy_principal','hod','secretary'].includes(role);
    c.innerHTML=UI.loading();
    const d=await API.get('/notices'+(audience?`?audience=${audience}`:''));
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      ${['all','students','parents','staff','teachers'].map(a=>`<button class="btn btn-sm ${(!audience&&a==='all')||audience===a?'btn-primary':'btn-secondary'}" onclick="Pages.NoticBoard.render('${a==='all'?'':a}')">${a.charAt(0).toUpperCase()+a.slice(1)}</button>`).join('')}
      ${canPost?`<button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="Pages.NoticBoard.openCreate()">+ Post Notice</button>`:''}
    </div>
    ${!d.length?UI.empty('No notices','Check back later for announcements.'):
    `<div style="display:flex;flex-direction:column;gap:12px">${d.map(n=>`
      <div class="card" style="border-left:4px solid ${n.is_pinned?'var(--brand)':n.priority==='urgent'?'var(--red)':n.priority==='high'?'var(--amber)':'var(--border)'}">
        <div class="card-header">
          <div>
            ${n.is_pinned?'📌 ':''}${n.priority==='urgent'?'🚨 ':n.priority==='high'?'⚠️ ':''}
            <div class="card-title" style="display:inline">${n.title}</div>
            <div class="card-subtitle" style="margin-top:4px">${n.posted_by||'Admin'} · ${_dt2(n.publish_date)} · ${n.view_count||0} views</div>
          </div>
          <div style="display:flex;gap:4px">
            ${_b2(n.notice_type,'blue')}
            ${_b2(n.target_audience,'gray')}
            ${n.is_read?'':_b2('New','green')}
          </div>
        </div>
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin:8px 0">${(n.content||'').substring(0,300)}${(n.content||'').length>300?'…':''}</div>
        <div style="display:flex;gap:6px">
          ${!n.is_read?`<button class="btn btn-sm btn-ghost" onclick="Pages.NoticBoard.markRead('${n.id}',this)">Mark Read</button>`:''}
          ${canPost?`<button class="btn btn-sm btn-ghost" onclick="Pages.NoticBoard.pin('${n.id}',this)">${n.is_pinned?'Unpin':'📌 Pin'}</button><button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.NoticBoard.delete('${n.id}')">Delete</button>`:''}
        </div>
      </div>`).join('')}</div>`}`;
  },
  async markRead(id,btn) { await API.put(`/notices/${id}/read`,{}); if(btn)btn.style.display='none'; },
  async pin(id,btn) { const r=await API.put(`/notices/${id}/pin`,{}); if(r.error){Toast.error(r.error);return;} Toast.success(r.isPinned?'Pinned!':'Unpinned'); this.render(); },
  async delete(id) { if(!await UI.confirm('Delete this notice?'))return; await API.delete(`/notices/${id}`); this.render(); },
  openCreate() {
    ['nb-title','nb-content'].forEach(id=>{const e=_gid(id);if(e)e.value='';});
    _gid('nb-expiry').value=''; UI.openModal('modal-notice');
  },
  async saveNotice() {
    const r=await API.post('/notices',{title:_gid('nb-title')?.value?.trim(),content:_gid('nb-content')?.value?.trim(),noticeType:_gid('nb-type')?.value||'general',priority:_gid('nb-priority')?.value||'normal',targetAudience:_gid('nb-audience')?.value||'all',isPinned:_gid('nb-pinned')?.checked||false,expiryDate:_gid('nb-expiry')?.value||null});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Notice posted!');UI.closeModal('modal-notice');this.render();
  },
};

// ============================================================
// BURSARY & SCHOLARSHIPS
// ============================================================
Pages.Bursary = {
  async load() { this.switchTab('schemes'); },
  switchTab(tab,el) {
    document.querySelectorAll('#page-bursary .tab').forEach(t=>t.classList.remove('active'));
    const tEl=el||document.querySelector(`#page-bursary .tab[data-tab="${tab}"]`);
    if(tEl)tEl.classList.add('active');
    const c=_gid('bursary-content'); if(!c)return;
    if(tab==='schemes') this._renderSchemes(c);
    else if(tab==='applications') this._renderApplications(c);
    else if(tab==='apply') this._renderApply(c);
  },
  async _renderSchemes(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/bursary/schemes');
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Bursary.openCreate()">+ New Scheme</button></div>
    ${!d.length?UI.empty('No bursary schemes','Create schemes for NG-CDF, Equity Wings to Fly, etc.'):
    `<div class="grid-auto">${d.map(s=>`<div class="card">
      <div class="card-header"><div><div class="card-title">${s.name}</div><div class="card-subtitle">${s.funder||'--'}</div></div>${_b2(s.funder_type,'blue')}</div>
      ${[['Total Budget',_m(s.total_amount)],['Per Student',s.amount_per_student?_m(s.amount_per_student):'Varies'],['Applications',s.applications||0],['Approved',s.approved||0],['Awarded',_m(s.total_awarded)]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px"><span style="color:var(--text-muted)">${k}</span><strong>${v}</strong></div>`).join('')}
      <div style="margin-top:8px">${_b2(s.status,{open:'green',closed:'red',processing:'amber'}[s.status]||'gray')}</div>
      <button class="btn btn-sm btn-secondary w-full" style="margin-top:8px" onclick="Pages.Bursary.viewApplications('${s.id}','${s.name.replace(/'/g,"\\'")}')">View Applications</button>
    </div>`).join('')}</div>`}`;
  },
  async viewApplications(schemeId, name) {
    const d=await API.get(`/bursary/applications?schemeId=${schemeId}`);
    UI.showInfoModal(`Applications: ${name}`,_tbl(['Student','Class','Requested','Awarded','Status','Action'],
      d.map(a=>_tr([`<strong>${a.first_name} ${a.last_name}</strong><div style="font-size:10px">${a.admission_number}</div>`,a.class_name||'--',_m(a.amount_requested),a.amount_awarded?_m(a.amount_awarded):'--',_b2(a.status,{approved:'green',rejected:'red',pending:'amber'}[a.status]||'gray'),a.status==='pending'?`<div style="display:flex;gap:4px"><button class="btn btn-sm btn-success" onclick="Pages.Bursary.review('${a.id}','approved')">Approve</button><button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Bursary.review('${a.id}','rejected')">Reject</button></div>`:'--'])).join(''), 'No applications'));
  },
  async review(id, status) {
    const amt=status==='approved'?prompt('Amount to award (KES):'):null;
    const r=await API.put(`/bursary/applications/${id}`,{status,amountAwarded:amt?parseFloat(amt):null});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`Application ${status}!`);UI.closeModal('_dynamic-modal');this._renderSchemes(_gid('bursary-content'));
  },
  async _renderApplications(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/bursary/applications');
    c.innerHTML=_tbl(['Student','Scheme','Requested','Awarded','Status'],
      d.map(a=>_tr([`<strong>${a.first_name} ${a.last_name}</strong>`,a.scheme_name,_m(a.amount_requested),a.amount_awarded?_m(a.amount_awarded):'--',_b2(a.status,{approved:'green',rejected:'red',pending:'amber'}[a.status]||'gray')])).join(''), 'No applications');
  },
  _renderApply(c) {
    c.innerHTML=`<div class="card" style="max-width:600px"><div class="card-header"><div class="card-title">Apply for Bursary</div></div>
      <div class="form-group"><label>Scheme</label><select id="bap-scheme" style="width:100%"><option value="">Loading…</option></select></div>
      <div class="form-group"><label>Student</label><input type="text" id="bap-student" placeholder="Search…" oninput="Pages.Bursary._searchStudent(this.value)"><div id="bap-results"></div><input type="hidden" id="bap-student-id"></div>
      <div class="grid-2">
        <div class="form-group"><label>Amount Requested</label><input type="number" id="bap-amount" placeholder="KES"></div>
        <div class="form-group"><label>Household Income</label><input type="number" id="bap-income" placeholder="Annual KES"></div>
      </div>
      <div class="form-group"><label>Justification *</label><textarea id="bap-just" rows="3" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)" placeholder="Why does this student qualify?"></textarea></div>
      <button class="btn btn-primary" onclick="Pages.Bursary.submitApplication()">Submit Application</button>
    </div>`;
    API.get('/bursary/schemes').then(d=>{const s=_gid('bap-scheme');if(s)s.innerHTML=d.map(sc=>`<option value="${sc.id}">${sc.name}</option>`).join('');});
  },
  async _searchStudent(q) {
    const r=_gid('bap-results'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="_gid('bap-student').value='${s.first_name} ${s.last_name}';_gid('bap-student-id').value='${s.id}';_gid('bap-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  async submitApplication() {
    const r=await API.post('/bursary/applications',{schemeId:_gid('bap-scheme')?.value,studentId:_gid('bap-student-id')?.value,amountRequested:+(_gid('bap-amount')?.value||0),justification:_gid('bap-just')?.value?.trim(),householdIncome:+(_gid('bap-income')?.value||0)||null});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Application submitted!');this._renderApplications(_gid('bursary-content'));
  },
  openCreate() { ['bs-name','bs-funder','bs-total','bs-per','bs-criteria'].forEach(id=>{const e=_gid(id);if(e)e.value='';}); UI.openModal('modal-bursary'); },
  async saveScheme() {
    const r=await API.post('/bursary/schemes',{name:_gid('bs-name')?.value?.trim(),funder:_gid('bs-funder')?.value,funderType:_gid('bs-ftype')?.value||'government',totalAmount:+(_gid('bs-total')?.value||0),amountPerStudent:+(_gid('bs-per')?.value||0)||null,academicYear:new Date().getFullYear().toString(),eligibilityCriteria:_gid('bs-criteria')?.value,applicationDeadline:_gid('bs-deadline')?.value||null});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Scheme created!');UI.closeModal('modal-bursary');this._renderSchemes(_gid('bursary-content'));
  },
};

console.log('✅ Beyond-Zeraki Pages Part 1 loaded');
