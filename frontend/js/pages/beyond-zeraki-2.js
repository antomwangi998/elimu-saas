// ============================================================
// ElimuSaaS -- Beyond Zeraki Pages (Part 2 -- Complete)
// ============================================================

Pages.Visitors = {
  async load() { this.switchTab('today'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-visitors .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-visitors .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('visitors-content'); if(!c)return;
    if(tab==='today') this._today(c); else if(tab==='checkin') this._checkin(c); else this._history(c);
  },
  async _today(c) {
    c.innerHTML=UI.loading();
    const [d,s]=await Promise.all([API.get(`/visitors?date=${new Date().toISOString().split('T')[0]}`),API.get('/visitors/stats')]);
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:12px"><div class="stat-card"><div class="stat-body"><div class="stat-value">${s.today||0}</div><div class="stat-label">Today's Visitors</div></div></div><div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:var(--amber)">${s.currently_in||0}</div><div class="stat-label">Still Inside</div></div></div></div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn btn-primary btn-sm" onclick="Pages.Visitors.switchTab('checkin')">+ Check In</button></div>
    ${!d.length?UI.empty('No visitors today'):`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${['Name','ID','Purpose','Host','In','Out','Action'].map(h=>`<th style="padding:7px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead><tbody>
    ${d.map(v=>`<tr style="border-bottom:1px solid var(--border-subtle)"><td style="padding:6px 10px"><strong>${v.full_name}</strong>${v.organization?`<div style="font-size:10px;color:var(--text-muted)">${v.organization}</div>`:''}</td><td style="font-size:11px">${v.id_number||'--'}</td><td style="font-size:11px">${(v.purpose||'').substring(0,40)}</td><td style="font-size:11px">${v.host_name||v.visiting_who||'--'}</td><td style="font-size:11px">${new Date(v.check_in_time).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}</td><td style="font-size:11px">${v.check_out_time?new Date(v.check_out_time).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'}):'<span style="color:var(--amber)">Inside</span>'}</td><td>${!v.check_out_time?`<button class="btn btn-sm btn-success" onclick="Pages.Visitors.out('${v.id}')">✓ Out</button>`:''}</td></tr>`).join('')}
    </tbody></table></div>`}`;
  },
  _checkin(c) {
    c.innerHTML=`<div class="card" style="max-width:560px"><div class="card-header"><div class="card-title">👤 Visitor Check-In</div></div>
    <div class="grid-2"><div class="form-group"><label>Full Name *</label><input type="text" id="vi-name"></div><div class="form-group"><label>National ID</label><input type="text" id="vi-id"></div></div>
    <div class="grid-2"><div class="form-group"><label>Phone</label><input type="tel" id="vi-phone"></div><div class="form-group"><label>Organization</label><input type="text" id="vi-org"></div></div>
    <div class="form-group"><label>Purpose *</label><textarea id="vi-purpose" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
    <div class="grid-2"><div class="form-group"><label>Visiting</label><input type="text" id="vi-host" placeholder="Teacher/staff name"></div><div class="form-group"><label>Badge #</label><input type="text" id="vi-badge" placeholder="V-001"></div></div>
    <button class="btn btn-primary w-full" onclick="Pages.Visitors.checkIn()">✅ Check In</button></div>`;
  },
  async checkIn() {
    const r=await API.post('/visitors',{fullName:document.getElementById('vi-name')?.value?.trim(),idNumber:document.getElementById('vi-id')?.value,phone:document.getElementById('vi-phone')?.value,organization:document.getElementById('vi-org')?.value,purpose:document.getElementById('vi-purpose')?.value?.trim(),visitingWho:document.getElementById('vi-host')?.value,badgeNumber:document.getElementById('vi-badge')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`✅ ${r.full_name} checked in!`); this.switchTab('today');
  },
  async out(id) { const r=await API.put(`/visitors/${id}/checkout`,{}); if(r.error){Toast.error(r.error);return;} Toast.success('Visitor checked out'); this._today(document.getElementById('visitors-content')); },
  async _history(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/visitors');
    c.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${['Name','Organization','Purpose','Check In','Check Out'].map(h=>`<th style="padding:7px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead><tbody>
    ${(d||[]).map(v=>`<tr style="border-bottom:1px solid var(--border-subtle)"><td style="padding:6px 10px"><strong>${v.full_name}</strong></td><td style="font-size:11px">${v.organization||'--'}</td><td style="font-size:11px">${(v.purpose||'').substring(0,50)}</td><td style="font-size:11px">${new Date(v.check_in_time).toLocaleString('en-KE')}</td><td style="font-size:11px">${v.check_out_time?new Date(v.check_out_time).toLocaleString('en-KE'):'<span style="color:var(--amber)">Still Inside</span>'}</td></tr>`).join('')}
    </tbody></table></div>`;
  },
};

Pages.Assets = {
  async load() { this.switchTab('list'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-assets .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-assets .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('assets-content'); if(!c)return;
    if(tab==='list') this._list(c); else if(tab==='add') this._add(c); else this._report(c);
  },
  async _list(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/assets');
    const cc={good:'green',fair:'amber',poor:'red',broken:'red'};
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><input type="text" placeholder="Search…" oninput="Pages.Assets._search(this.value)" style="flex:1;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)"><button class="btn btn-primary btn-sm" onclick="Pages.Assets.switchTab('add')">+ Register Asset</button><button class="btn btn-secondary btn-sm" onclick="Pages.Assets.switchTab('report')">📊 Report</button></div>
    <div id="assets-tbl">${this._tbl(d)}</div>`;
    this._all=d;
  },
  _tbl(a) {
    if(!a.length) return UI.empty('No assets registered');
    const cc={good:'green',fair:'amber',poor:'red',broken:'red'};
    return `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${['Asset','#','Category','Location','Condition','Value'].map(h=>`<th style="padding:7px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead><tbody>
    ${a.map(x=>`<tr style="border-bottom:1px solid var(--border-subtle)"><td style="padding:6px 10px"><strong>${x.name}</strong>${x.serial_number?`<div style="font-size:10px;color:var(--text-muted)">S/N: ${x.serial_number}</div>`:''}</td><td style="font-family:monospace;font-size:11px;padding:6px 10px">${x.asset_number||'--'}</td><td style="padding:6px 10px;text-transform:capitalize">${(x.category||'--').replace(/_/g,' ')}</td><td style="padding:6px 10px;font-size:11px">${x.location||'--'}</td><td style="padding:6px 10px"><span class="badge badge-${cc[x.condition]||'gray'}">${x.condition}</span></td><td style="padding:6px 10px">KES ${parseFloat(x.current_value||x.purchase_cost||0).toLocaleString()}</td></tr>`).join('')}
    </tbody></table></div>`;
  },
  _search(q) { const t=document.getElementById('assets-tbl'); if(!t)return; t.innerHTML=this._tbl(q.length<2?this._all:this._all.filter(a=>a.name.toLowerCase().includes(q.toLowerCase())||(a.asset_number||'').includes(q))); },
  _add(c) {
    c.innerHTML=`<div class="card" style="max-width:660px"><div class="card-header"><div class="card-title">Register New Asset</div></div>
    <div class="grid-2"><div class="form-group"><label>Asset Name *</label><input type="text" id="as-name"></div><div class="form-group"><label>Asset Number</label><input type="text" id="as-no" placeholder="AST-001"></div></div>
    <div class="grid-3"><div class="form-group"><label>Category</label><select id="as-cat" style="width:100%">${['','electronics','furniture','laboratory_equipment','sports_equipment','vehicles','books','tools','other'].map(c=>`<option value="${c}">${c.replace(/_/g,' ')||'Select…'}</option>`).join('')}</select></div><div class="form-group"><label>Condition</label><select id="as-cond" style="width:100%"><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option><option value="broken">Broken</option></select></div><div class="form-group"><label>Location</label><input type="text" id="as-loc"></div></div>
    <div class="grid-2"><div class="form-group"><label>Purchase Date</label><input type="date" id="as-date"></div><div class="form-group"><label>Purchase Cost (KES)</label><input type="number" id="as-cost" min="0"></div></div>
    <div class="grid-2"><div class="form-group"><label>Serial Number</label><input type="text" id="as-serial"></div><div class="form-group"><label>Supplier</label><input type="text" id="as-sup"></div></div>
    <button class="btn btn-primary" onclick="Pages.Assets.save()">Register Asset</button></div>`;
  },
  async save() {
    const r=await API.post('/assets',{name:document.getElementById('as-name')?.value?.trim(),assetNumber:document.getElementById('as-no')?.value,category:document.getElementById('as-cat')?.value,condition:document.getElementById('as-cond')?.value||'good',location:document.getElementById('as-loc')?.value,purchaseDate:document.getElementById('as-date')?.value||null,purchaseCost:+document.getElementById('as-cost')?.value||null,serialNumber:document.getElementById('as-serial')?.value,supplier:document.getElementById('as-sup')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Asset registered!'); this.switchTab('list');
  },
  async _report(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/assets/report');
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:16px">${[['Total Assets',d.total||0,'var(--brand)'],['Total Cost','KES '+parseFloat(d.total_cost||0).toLocaleString(),'var(--blue)'],['Current Value','KES '+parseFloat(d.current_value||0).toLocaleString(),'var(--green)']].map(([l,v,col])=>`<div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:${col}">${v}</div><div class="stat-label">${l}</div></div></div>`).join('')}</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${['Category','Count','Total Cost','Needs Attention'].map(h=>`<th style="padding:7px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead><tbody>
    ${(d.byCategory||[]).map(cat=>`<tr style="border-bottom:1px solid var(--border-subtle)"><td style="padding:6px 10px;font-weight:600;text-transform:capitalize">${(cat.category||'Other').replace(/_/g,' ')}</td><td>${cat.count}</td><td>KES ${parseFloat(cat.total_cost||0).toLocaleString()}</td><td>${parseInt(cat.needs_attention||0)>0?`<span style="color:var(--red);font-weight:700">${cat.needs_attention}</span>`:'✅'}</td></tr>`).join('')}
    </tbody></table></div>`;
  },
};

Pages.AIEngine = {
  async load() { this.switchTab('predict'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-ai-engine .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-ai-engine .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('ai-engine-content'); if(!c)return;
    if(tab==='predict') this._predict(c); else if(tab==='dropouts') this._dropouts(c);
    else if(tab==='fees') this._fees(c); else if(tab==='compare') this._compare(c);
    else if(tab==='examgen') this._examgen(c); else if(tab==='usage') this._usage(c);
  },
  async _predict(c) {
    const cls=await API.get('/academics/classes');
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">🎯 AI Grade Predictions</div></div>
    <p style="font-size:13px;color:var(--text-secondary)">AI predicts each student's KCSE grade based on current performance trajectory.</p>
    <div class="form-group" style="max-width:300px"><label>Class</label><select id="pred-cls" style="width:100%"><option value="">Select…</option>${(cls||[]).map(cl=>`<option value="${cl.id}">${cl.name}</option>`).join('')}</select></div>
    <button class="btn btn-primary" onclick="Pages.AIEngine.runPred()">🚀 Run Predictions</button>
    <div id="pred-out" style="margin-top:16px"></div></div>`;
  },
  async runPred() {
    const cId=document.getElementById('pred-cls')?.value; if(!cId){Toast.warning('Select class');return;}
    const c=document.getElementById('pred-out'); c.innerHTML=UI.loading();
    const d=await API.post('/ai-predictions/predict-grades',{classId:cId});
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    const gc={A:'green','A-':'green','B+':'blue',B:'blue','B-':'blue','C+':'cyan',C:'cyan','C-':'amber','D+':'amber',D:'orange','D-':'red',E:'red'};
    c.innerHTML=`<div class="alert alert-success" style="margin-bottom:12px">✅ ${d.count} predictions generated</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${['Student','Avg Marks','Predicted Grade','Confidence','Status'].map(h=>`<th style="padding:7px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead><tbody>
    ${(d.predictions||[]).map(p=>`<tr style="border-bottom:1px solid var(--border-subtle)"><td style="padding:6px 10px"><strong>${p.first_name} ${p.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${p.admission_number}</div></td><td>${parseFloat(p.avg_marks||0).toFixed(1)}%</td><td><span class="badge badge-${gc[p.predictedGrade]||'gray'}" style="font-size:13px;padding:4px 10px">${p.predictedGrade}</span></td><td>${p.confidence}%</td><td>${p.predictedGrade>='C'?'✅ On Track':p.predictedGrade>='D'?'⚠️ Monitor':'🚨 At Risk'}</td></tr>`).join('')}
    </tbody></table></div>`;
  },
  async _dropouts(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/ai-predictions/dropouts');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML=`<div class="alert alert-info" style="margin-bottom:12px">Risk factors: attendance 30% + marks 35% + fees 20% + trend 15%</div>
    ${!d.length?UI.empty('✅ No students at high dropout risk'):`<div style="display:flex;flex-direction:column;gap:10px">${d.map(s=>`<div class="card" style="border-left:4px solid ${s.riskLevel==='high'?'var(--red)':s.riskLevel==='medium'?'var(--amber)':'var(--blue)'}"><div class="card-header"><div><div class="card-title">${s.first_name} ${s.last_name}</div><div class="card-subtitle">${s.class_name||'--'} · ${s.admission_number}</div></div><div style="text-align:right"><div style="font-size:26px;font-weight:800;color:${s.riskLevel==='high'?'var(--red)':'var(--amber)'}">${s.riskScore}%</div><div style="font-size:10px">Risk</div></div></div><div style="display:flex;gap:10px;font-size:12px;flex-wrap:wrap">📅 Attendance: ${s.factors?.attendance}% · 📊 Marks: ${parseFloat(s.factors?.marks||0).toFixed(0)}% · 💰 ${parseFloat(s.factors?.fees||0)>0?'KES '+parseFloat(s.factors.fees).toLocaleString()+' owed':'Fees clear'}</div></div>`).join('')}</div>`}`;
  },
  async _fees(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/ai-predictions/fee-defaults');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    const total=d.reduce((s,r)=>s+parseFloat(r.balance||0),0);
    c.innerHTML=`<div class="alert alert-warning" style="margin-bottom:12px">Total outstanding: <strong>KES ${total.toLocaleString()}</strong> · ${d.length} students</div>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${['Student','Class','Due','Paid','Balance'].map(h=>`<th style="padding:7px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead><tbody>
    ${d.map(s=>`<tr style="border-bottom:1px solid var(--border-subtle)"><td style="padding:6px 10px"><strong>${s.first_name} ${s.last_name}</strong><div style="font-size:10px;color:var(--text-muted)">${s.admission_number}</div></td><td>${s.class_name||'--'}</td><td>KES ${parseFloat(s.total_due||0).toLocaleString()}</td><td style="color:var(--green)">KES ${parseFloat(s.total_paid||0).toLocaleString()}</td><td style="font-weight:700;color:var(--red)">KES ${parseFloat(s.balance||0).toLocaleString()}</td></tr>`).join('')}
    </tbody></table></div>`;
  },
  async _compare(c) {
    const series=await API.get('/exams/series');
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">📊 School vs County vs National</div></div>
    <div class="form-group" style="max-width:300px"><label>Exam Series</label><select id="cmp-s" style="width:100%"><option value="">Select…</option>${(series.data||series||[]).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
    <button class="btn btn-primary" onclick="Pages.AIEngine.doCompare()">Compare</button>
    <div id="cmp-out" style="margin-top:16px"></div></div>`;
  },
  async doCompare() {
    const sId=document.getElementById('cmp-s')?.value; if(!sId){Toast.warning('Select series');return;}
    const c=document.getElementById('cmp-out'); c.innerHTML=UI.loading();
    const d=await API.get(`/ai-predictions/compare?examSeriesId=${sId}`);
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML=`<div class="grid-3">${[['🏫 Your School',d.school,'var(--brand)'],['🏙️ County',d.county,'var(--blue)'],['🌍 National',d.national,'var(--green)']].map(([l,s,col])=>`<div class="stat-card"><div class="stat-body"><div style="font-size:32px;font-weight:800;color:${col}">${parseFloat(s?.avg||0).toFixed(1)}%</div><div class="stat-label">${l}</div><div style="font-size:11px;color:var(--text-muted)">Highest: ${parseFloat(s?.high||0).toFixed(1)}%</div></div></div>`).join('')}</div>
    <div class="alert alert-info" style="margin-top:12px">Rank: <strong>${d.rank?.county||'--'}</strong> in county · <strong>${d.rank?.national||'--'}</strong> nationally</div>`;
  },
  async _examgen(c) {
    const subj=await API.get('/academics/subjects');
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">🤖 AI Exam Question Generator</div></div>
    <p style="font-size:13px;color:var(--text-secondary)">Generate 8-4-4 aligned exam questions instantly using Claude AI.</p>
    <div class="grid-2"><div class="form-group"><label>Subject</label><select id="eg-sub" style="width:100%"><option value="">Select…</option>${(subj||[]).map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}</select></div><div class="form-group"><label>Form</label><select id="eg-form" style="width:100%"><option value="1">Form 1</option><option value="2">Form 2</option><option value="3">Form 3</option><option value="4">Form 4</option></select></div></div>
    <div class="form-group"><label>Topic *</label><input type="text" id="eg-topic" placeholder="e.g. Trigonometry, Cell Division, World War II"></div>
    <div class="grid-3"><div class="form-group"><label>Type</label><select id="eg-type" style="width:100%"><option value="multiple choice">Multiple Choice</option><option value="short answer">Short Answer</option><option value="essay">Essay</option><option value="structured">Structured</option></select></div><div class="form-group"><label>Difficulty</label><select id="eg-diff" style="width:100%"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option><option value="KCSE level">KCSE Level</option></select></div><div class="form-group"><label>Count</label><input type="number" id="eg-cnt" value="5" min="1" max="20"></div></div>
    <button class="btn btn-primary" onclick="Pages.AIEngine.genQ()">🚀 Generate Questions</button>
    <div id="eg-out" style="margin-top:16px"></div></div>`;
  },
  async genQ() {
    const topic=document.getElementById('eg-topic')?.value?.trim(); if(!topic){Toast.warning('Enter a topic');return;}
    const c=document.getElementById('eg-out');
    c.innerHTML=`<div style="text-align:center;padding:24px"><div class="loading-spinner" style="margin:0 auto 12px"></div><div style="color:var(--text-muted);font-size:13px">Generating with AI…</div></div>`;
    const d=await API.post('/ai-predictions/generate-questions',{subject:document.getElementById('eg-sub')?.value,topic,form:document.getElementById('eg-form')?.value,questionType:document.getElementById('eg-type')?.value,difficulty:document.getElementById('eg-diff')?.value,count:+document.getElementById('eg-cnt')?.value||5});
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:12px"><strong>${(d.questions||[]).length} questions -- ${d.subject||''} Form ${d.form||''} · ${d.topic}</strong><button class="btn btn-sm btn-secondary" onclick="window.print()">🖨 Print</button></div>
    <div style="display:flex;flex-direction:column;gap:12px">${(d.questions||[]).map((q,i)=>`<div class="card" style="border-left:3px solid var(--brand)"><div style="font-weight:600;margin-bottom:8px;font-size:13px">${i+1}. ${q.question}</div>
    ${q.options?.length?`<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">${q.options.map((opt,j)=>{const ans=q.answer===j||q.answer===opt||(typeof q.answer==='string'&&q.answer.toLowerCase()===opt.toLowerCase());return `<div style="padding:6px 10px;border-radius:6px;font-size:12px;background:${ans?'rgba(14,203,129,0.12)':'var(--bg-elevated)'};border:1px solid ${ans?'var(--green)':'var(--border)'}">${String.fromCharCode(65+j)}. ${opt}${ans?' <span style="color:var(--green);font-size:10px">✓</span>':''}</div>`;}).join('')}</div>`:''}
    ${q.explanation?`<div style="font-size:11px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:6px">💡 ${q.explanation}</div>`:''}</div>`).join('')}`;
  },
  async _usage(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/ai-predictions/usage');
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML=`<div class="grid-2" style="margin-bottom:16px">
    <div class="card"><div class="card-header"><div class="card-title">🔥 Top Features</div></div>${(d.topEvents||[]).map(e=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-subtle);font-size:12px"><span style="text-transform:capitalize">${(e.event_type||'').replace(/_/g,' ')}</span><strong>${e.count}</strong></div>`).join('')||'<div style="color:var(--text-muted);font-size:12px">No data yet</div>'}</div>
    <div class="card"><div class="card-header"><div class="card-title">👥 Users by Role</div></div>${(d.byRole||[]).map(r=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border-subtle);font-size:12px"><span style="text-transform:capitalize">${(r.role||'').replace(/_/g,' ')}</span><strong>${r.users}</strong></div>`).join('')||'<div style="color:var(--text-muted);font-size:12px">No data yet</div>'}</div></div>
    <div class="card"><div class="card-header"><div class="card-title">📈 Daily Active Users (30d)</div></div><canvas id="ua-chart" height="80"></canvas></div>`;
    if(window.Chart&&(d.dailyActiveUsers||[]).length>1) new Chart(document.getElementById('ua-chart'),{type:'bar',data:{labels:d.dailyActiveUsers.map(r=>r.date),datasets:[{label:'Active Users',data:d.dailyActiveUsers.map(r=>r.active_users),backgroundColor:'rgba(43,127,255,0.6)',borderRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(255,255,255,0.05)'}},x:{grid:{display:false}}}}});
  },
};

Pages.Wellness = {
  _mood:null,
  async load() { this.switchTab('dashboard'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-wellness .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-wellness .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('wellness-content'); if(!c)return;
    if(tab==='dashboard') this._dash(c); else if(tab==='alerts') this._alerts(c); else this._checkins(c);
  },
  async _dash(c) {
    c.innerHTML=UI.loading();
    const s=await API.get('/wellness/summary');
    const avg=parseFloat(s.avg_mood||3).toFixed(1);
    const emj=['😢','😟','😐','🙂','😊'], cols=['var(--red)','var(--orange)','var(--amber)','var(--blue)','var(--green)'];
    const mi=Math.min(4,Math.max(0,Math.round(avg)-1));
    this._mood=null;
    c.innerHTML=`<div class="stats-grid" style="margin-bottom:16px">
    <div class="stat-card"><div class="stat-body"><div style="font-size:40px">${emj[mi]}</div><div class="stat-value" style="color:${cols[mi]}">${avg}/5</div><div class="stat-label">School Mood Today</div></div></div>
    <div class="stat-card"><div class="stat-body"><div class="stat-value">${s.checkins_today||0}</div><div class="stat-label">Check-ins Today</div></div></div>
    <div class="stat-card"><div class="stat-body"><div class="stat-value" style="color:var(--red)">${s.needs_attention||0}</div><div class="stat-label">Need Support</div></div></div></div>
    ${parseInt(s.needs_attention||0)>0?`<div class="alert alert-warning" style="margin-bottom:12px">⚠️ ${s.needs_attention} student(s) need support. <button class="btn btn-sm btn-warning" style="margin-left:8px" onclick="Pages.Wellness.switchTab('alerts')">View</button></div>`:''}
    <div class="card"><div class="card-header"><div class="card-title">How are you feeling today?</div></div>
    <div style="display:flex;gap:12px;justify-content:center;margin:16px 0">${emj.map((e,i)=>`<button class="wm-btn" data-s="${i+1}" onclick="Pages.Wellness.pick(${i+1},this)" style="font-size:36px;background:none;border:3px solid var(--border);border-radius:50%;width:60px;height:60px;cursor:pointer">${e}</button>`).join('')}</div>
    <div id="mood-lbl" style="text-align:center;font-size:13px;color:var(--text-muted);margin-bottom:10px">Tap a mood above</div>
    <textarea id="wc-concerns" rows="2" placeholder="Any concerns? (optional -- counselors only)" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);margin-bottom:10px"></textarea>
    <button class="btn btn-primary w-full" onclick="Pages.Wellness.submit()">Submit Check-In</button></div>`;
  },
  pick(score,btn) { this._mood=score; document.querySelectorAll('.wm-btn').forEach(b=>b.style.borderColor='var(--border)'); btn.style.borderColor='var(--brand)'; document.getElementById('mood-lbl').textContent='You selected: '+['Struggling','Not great','Okay','Good','Great!'][score-1]; },
  async submit() {
    if(!this._mood){Toast.warning('Select a mood first');return;}
    const r=await API.post('/wellness',{moodScore:this._mood,moodLabel:['struggling','not_great','okay','good','great'][this._mood-1],concerns:document.getElementById('wc-concerns')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('✅ Check-in recorded!'); this._dash(document.getElementById('wellness-content'));
  },
  async _alerts(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/wellness?needsSupport=true');
    c.innerHTML=!d.length?UI.empty('No students need attention ✅'):`<div class="alert alert-warning" style="margin-bottom:12px">${d.length} student(s) flagged as needing support:</div>
    <div style="display:flex;flex-direction:column;gap:10px">${d.map(w=>`<div class="card" style="border-left:4px solid var(--red)"><div class="card-header"><div><div class="card-title">${w.first_name} ${w.last_name}</div><div class="card-subtitle">${w.class_name||'--'} · ${new Date(w.created_at).toLocaleDateString('en-KE')}</div></div><div style="font-size:32px">😢</div></div>${w.concerns?`<div style="font-size:13px;color:var(--text-secondary);padding:8px;background:var(--bg-elevated);border-radius:6px;margin:6px 0">"${w.concerns}"</div>`:''}<button class="btn btn-sm btn-primary" onclick="Pages.Wellness.note('${w.id}','${w.first_name} ${w.last_name}')">📝 Counselor Note</button></div>`).join('')}`;
  },
  note(id,name) {
    UI.showInfoModal(`Counselor Note: ${name}`,`<div class="form-group"><label>Session Notes</label><textarea id="cn-notes" rows="4" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div><div class="form-group"><label>Follow-up Date</label><input type="date" id="cn-date"></div><button class="btn btn-primary w-full" onclick="Pages.Wellness.saveNote('${id}')">Save</button>`);
  },
  async saveNote(id) {
    const r=await API.put(`/wellness/${id}/notes`,{sessionNotes:document.getElementById('cn-notes')?.value,followUpDate:document.getElementById('cn-date')?.value||null});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Note saved!');UI.closeModal('_dynamic-modal');this._alerts(document.getElementById('wellness-content'));
  },
  async _checkins(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/wellness?limit=100');
    const emj=['','😢','😟','😐','🙂','😊'];
    c.innerHTML=`<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${['Student','Class','Mood','Concerns','Date','Support'].map(h=>`<th style="padding:7px;border-bottom:2px solid var(--border);font-size:11px">${h}</th>`).join('')}</tr></thead><tbody>
    ${(d||[]).map(w=>`<tr style="border-bottom:1px solid var(--border-subtle)"><td style="padding:6px 10px"><strong>${w.first_name} ${w.last_name}</strong></td><td style="font-size:11px">${w.class_name||'--'}</td><td style="text-align:center;font-size:20px">${emj[w.mood_score||3]}</td><td style="font-size:11px">${(w.concerns||'').substring(0,60)||'--'}</td><td style="font-size:11px">${new Date(w.created_at).toLocaleDateString('en-KE')}</td><td>${w.needs_support?'⚠️ Needs':'--'}</td></tr>`).join('')}
    </tbody></table></div>`;
  },
};

Pages.Branding = {
  async load() {
    const c=document.getElementById('branding-content'); if(!c)return;
    c.innerHTML=UI.loading();
    const d=await API.get('/branding');
    c.innerHTML=`<div class="grid-2">
    <div class="card"><div class="card-header"><div class="card-title">🎨 School Branding</div></div>
    <div class="form-group"><label>Primary Colour</label><div style="display:flex;gap:8px;align-items:center"><input type="color" id="br-p" value="${d.primary_color||'#2b7fff'}" oninput="document.getElementById('br-ph').value=this.value;document.getElementById('br-prev-hdr').style.background=this.value" style="width:48px;height:36px;border:none;border-radius:6px;cursor:pointer"><input type="text" id="br-ph" value="${d.primary_color||'#2b7fff'}" style="flex:1;padding:7px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></div></div>
    <div class="form-group"><label>Accent Colour</label><div style="display:flex;gap:8px;align-items:center"><input type="color" id="br-a" value="${d.accent_color||'#0ecb81'}" oninput="document.getElementById('br-ah').value=this.value" style="width:48px;height:36px;border:none;border-radius:6px;cursor:pointer"><input type="text" id="br-ah" value="${d.accent_color||'#0ecb81'}" style="flex:1;padding:7px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></div></div>
    <div class="form-group"><label>SMS Sender ID (max 11 chars)</label><input type="text" id="br-sms" value="${d.sms_sender_id||'ELIMU'}" maxlength="11" oninput="this.value=this.value.toUpperCase()"></div>
    <div class="form-group"><label>Footer Text</label><input type="text" id="br-foot" value="${d.footer_text||''}"></div>
    <div class="form-group"><label>Custom Domain</label><input type="text" id="br-dom" value="${d.custom_domain||''}" placeholder="portal.myschool.ac.ke"></div>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:14px"><input type="checkbox" id="br-wl" ${d.is_white_labeled?'checked':''}> Enable White Label (removes ElimuSaaS branding)</label>
    <div style="display:flex;gap:8px"><button class="btn btn-secondary" onclick="Pages.Branding.preview()">👁 Preview</button><button class="btn btn-primary" onclick="Pages.Branding.save()">Save Branding</button></div></div>
    <div class="card"><div class="card-header"><div class="card-title">👁 Preview</div></div>
    <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
    <div id="br-prev-hdr" style="background:${d.primary_color||'#2b7fff'};padding:16px 20px;color:#fff"><div style="font-size:18px;font-weight:700">${AppState.school?.name||'Your School'}</div><div style="font-size:12px;opacity:.8">School Management Portal</div></div>
    <div style="padding:14px"><div style="height:8px;background:${d.accent_color||'#0ecb81'};border-radius:4px;margin-bottom:10px;width:55%"></div><div style="font-size:12px;color:var(--text-muted)">Preview of your school portal</div></div>
    <div id="br-prev-foot" style="background:var(--bg-elevated);padding:8px 16px;font-size:11px;color:var(--text-muted);text-align:center">${d.footer_text||'Powered by ElimuSaaS'}</div></div></div></div>`;
  },
  preview() {
    const p=document.getElementById('br-p')?.value, a=document.getElementById('br-a')?.value, f=document.getElementById('br-foot')?.value;
    if(p){document.documentElement.style.setProperty('--accent',p);document.getElementById('br-prev-hdr').style.background=p;}
    if(a) document.documentElement.style.setProperty('--green',a);
    if(f) document.getElementById('br-prev-foot').textContent=f;
    Toast.success('Preview applied! Save to make permanent.');
  },
  async save() {
    const r=await API.post('/branding',{primaryColor:document.getElementById('br-p')?.value,accentColor:document.getElementById('br-a')?.value,footerText:document.getElementById('br-foot')?.value,smsSenderId:document.getElementById('br-sms')?.value,customDomain:document.getElementById('br-dom')?.value||null,isWhiteLabeled:document.getElementById('br-wl')?.checked||false});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('✅ Branding saved!');
  },
};

Pages.Polls = {
  async load() { this.render(); },
  async render() {
    const c=document.getElementById('polls-content'); if(!c)return;
    c.innerHTML=UI.loading();
    const d=await API.get('/polls');
    const admin=['super_admin','school_admin','principal','secretary'].includes(AppState.user?.role);
    c.innerHTML=`${admin?`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Polls.openCreate()">+ Create Poll</button></div>`:''}
    ${!d.length?UI.empty('No active polls','Polls from school admin will appear here.'):`<div style="display:flex;flex-direction:column;gap:14px">${d.map(p=>`<div class="card"><div class="card-header"><div class="card-title">${p.title}</div>${p.is_anonymous?'<span style="font-size:11px;color:var(--text-muted)">Anonymous</span>':''}</div>
    ${p.description?`<div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px">${p.description}</div>`:''}
    <div id="poll-body-${p.id}">${p.has_voted?`<div class="loading-spinner" style="margin:0 auto"></div>`:`<div>${(p.options||[]).map((opt,i)=>`<button class="btn btn-secondary w-full" style="margin-bottom:6px;text-align:left" onclick="Pages.Polls.vote('${p.id}',${i},this.parentElement)">${opt.text||opt}</button>`).join('')}</div>`}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${p.total_votes||0} votes</div></div>`).join('')}</div>`}`;
    d.filter(p=>p.has_voted).forEach(p=>this.loadResults(p.id));
  },
  async loadResults(pollId) {
    const c=document.getElementById(`poll-body-${pollId}`); if(!c)return;
    const d=await API.get(`/polls/${pollId}/results`);
    const total=parseInt(d.totalVotes||0);
    c.innerHTML=`<div>${(d.options||[]).map((opt,i)=>{const res=d.results?.find(r=>parseInt(r.option_index)===i);const cnt=parseInt(res?.count||0);const pct=total>0?((cnt/total)*100).toFixed(0):0;return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span>${opt.text||opt}</span><span>${pct}% (${cnt})</span></div><div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--brand)"></div></div></div>`;}).join('')}<div style="font-size:11px;color:var(--green);margin-top:4px">✅ You voted · ${total} total votes</div></div>`;
  },
  async vote(pollId, idx, container) {
    const r=await API.post(`/polls/${pollId}/vote`,{optionIndex:idx});
    if(r.error){Toast.error(r.error);return;}
    container.id=`poll-body-${pollId}`; this.loadResults(pollId);
  },
  openCreate() {
    document.getElementById('poll-title').value=''; document.getElementById('poll-desc').value='';
    document.getElementById('poll-opts-list').innerHTML=['Option 1…','Option 2…'].map(ph=>`<input type="text" class="poll-opt" placeholder="${ph}" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);margin-bottom:6px">`).join('');
    UI.openModal('modal-poll');
  },
  addOpt() { const l=document.getElementById('poll-opts-list');const n=l.querySelectorAll('.poll-opt').length+1;const i=document.createElement('input');i.type='text';i.className='poll-opt';i.placeholder=`Option ${n}…`;i.style.cssText='width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);margin-bottom:6px';l.appendChild(i); },
  async savePoll() {
    const opts=[...document.querySelectorAll('.poll-opt')].map(i=>i.value.trim()).filter(Boolean);
    if(opts.length<2){Toast.error('Need at least 2 options');return;}
    const r=await API.post('/polls',{title:document.getElementById('poll-title')?.value?.trim(),description:document.getElementById('poll-desc')?.value,options:opts.map(t=>({text:t})),targetRoles:[document.getElementById('poll-aud')?.value||'parent'],isAnonymous:document.getElementById('poll-anon')?.checked!==false,endDate:document.getElementById('poll-end')?.value||null});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Poll created!');UI.closeModal('modal-poll');this.render();
  },
};

Pages.Career = {
  async load() { this.switchTab('resources'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-career .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-career .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('career-content'); if(!c)return;
    if(tab==='resources') this._resources(c); else if(tab==='ai') this._ai(c); else this._profiles(c);
  },
  async _resources(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/career/resources');
    c.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="Pages.Career.addRes()">+ Add Resource</button></div>
    ${!d.length?UI.empty('No career resources yet'):
    `<div class="grid-auto">${d.map(r=>`<div class="card"><div class="card-header"><div class="card-title">${r.title}</div><span class="badge badge-blue">${r.resource_type}</span></div><div style="font-size:12px;color:var(--text-secondary);margin:6px 0">${(r.description||'').substring(0,100)}</div>${r.careers?.length?`<div style="font-size:11px;color:var(--brand);margin-bottom:8px">🎯 ${r.careers.join(', ')}</div>`:''}<div>${r.url?`<a href="${r.url}" target="_blank" class="btn btn-sm btn-primary">View →</a>`:''}</div></div>`).join('')}</div>`}`;
  },
  addRes() { UI.openModal('modal-career-res'); },
  async saveRes() {
    const r=await API.post('/career/resources',{title:document.getElementById('cres-title')?.value?.trim(),description:document.getElementById('cres-desc')?.value,resourceType:document.getElementById('cres-type')?.value||'article',url:document.getElementById('cres-url')?.value,careers:(document.getElementById('cres-careers')?.value||'').split(',').map(s=>s.trim()).filter(Boolean)});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Resource added!');UI.closeModal('modal-career-res');this._resources(document.getElementById('career-content'));
  },
  _ai(c) {
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">🤖 AI Career Advisor</div></div>
    <p style="font-size:13px;color:var(--text-secondary)">Get personalized career advice for any student using Claude AI -- based on their marks, interests and strengths.</p>
    <div class="form-group"><label>Student</label><input type="text" id="ca-s" placeholder="Search student…" oninput="Pages.Career._searchS(this.value)"><div id="ca-res"></div><input type="hidden" id="ca-sid"></div>
    <button class="btn btn-primary" onclick="Pages.Career.getAdvice()">🧠 Get AI Career Advice</button>
    <div id="ca-out" style="margin-top:16px"></div></div>`;
  },
  async _searchS(q) {
    const r=document.getElementById('ca-res'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="document.getElementById('ca-s').value='${s.first_name} ${s.last_name}';document.getElementById('ca-sid').value='${s.id}';document.getElementById('ca-res').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  async getAdvice() {
    const sid=document.getElementById('ca-sid')?.value; if(!sid){Toast.warning('Select a student');return;}
    const c=document.getElementById('ca-out'); c.innerHTML=UI.loading();
    const d=await API.get(`/career/ai-advice/${sid}`);
    if(d.error){c.innerHTML=UI.error(d.error);return;}
    c.innerHTML=`<div class="card" style="border-top:4px solid var(--brand)"><div class="card-header"><div class="card-title">Career Advice</div></div><div style="font-size:13px;line-height:1.8;color:var(--text-secondary);white-space:pre-line">${d.advice}</div>${d.grades?.length?`<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">${d.grades.map(g=>`<div style="background:var(--bg-elevated);border-radius:6px;padding:6px 10px;text-align:center"><div style="font-weight:700;color:var(--brand)">${parseFloat(g.avg||0).toFixed(0)}%</div><div style="font-size:10px;color:var(--text-muted)">${g.subject}</div></div>`).join('')}</div>`:''}</div>`;
  },
  _profiles(c) {
    c.innerHTML=`<div class="form-group"><input type="text" placeholder="Search student…" id="cpf-s" oninput="Pages.Career._searchP(this.value)" style="width:100%;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)"><div id="cpf-res"></div></div><div id="cpf-out"></div>`;
  },
  async _searchP(q) {
    const r=document.getElementById('cpf-res'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="Pages.Career.loadProfile('${s.id}','${s.first_name} ${s.last_name}')"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  async loadProfile(id, name) {
    document.getElementById('cpf-res').innerHTML='';
    const d=await API.get(`/career/${id}`);
    document.getElementById('cpf-out').innerHTML=`<div class="card"><div class="card-header"><div class="card-title">${name} -- Career Profile</div></div>
    ${[['Interests (comma-separated)','cpf-int',(d.interests||[]).join(', ')],['Strengths','cpf-str',(d.strengths||[]).join(', ')],['Career Choices','cpf-cc',(d.career_choices||[]).join(', ')],['Dream Career','cpf-dc',d.dream_career||''],['Dream University','cpf-du',d.dream_university||''],['Dream Course','cpf-dco',d.dream_course||'']].map(([l,id2,v])=>`<div class="form-group"><label>${l}</label><input type="text" id="${id2}" value="${v}"></div>`).join('')}
    <button class="btn btn-primary" onclick="Pages.Career.saveProfile('${id}')">Save Profile</button></div>`;
  },
  async saveProfile(id) {
    const sp=v=>v?v.split(',').map(s=>s.trim()).filter(Boolean):[];
    const r=await API.post(`/career/${id}`,{interests:sp(document.getElementById('cpf-int')?.value),strengths:sp(document.getElementById('cpf-str')?.value),careerChoices:sp(document.getElementById('cpf-cc')?.value),dreamCareer:document.getElementById('cpf-dc')?.value,dreamUniversity:document.getElementById('cpf-du')?.value,dreamCourse:document.getElementById('cpf-dco')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Profile saved!');
  },
};

Pages.Portfolio = {
  async load() { this.render(); },
  async render(studentId) {
    const c=document.getElementById('portfolio-content'); if(!c)return;
    c.innerHTML=UI.loading();
    const d=await API.get(studentId?`/portfolio?studentId=${studentId}`:'/portfolio');
    c.innerHTML=`<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><input type="text" placeholder="Search student portfolio…" id="pf-sq" oninput="Pages.Portfolio._searchS(this.value)" style="flex:1;padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)"><div id="pf-sres" style="position:relative"></div><button class="btn btn-primary btn-sm" onclick="Pages.Portfolio.openAdd()">+ Add Item</button></div>
    ${!d.length?UI.empty('No portfolio items yet'):
    `<div class="grid-auto">${d.map(item=>`<div class="card"><div style="height:100px;background:var(--brand-subtle);border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:42px">${{project:'🚀',essay:'📝',artwork:'🎨',science:'🔬',certificate:'🏆',other:'📁'}[item.item_type]||'📁'}</div><div class="card-header"><div><div class="card-title">${item.title}</div><div class="card-subtitle">${item.first_name||''} ${item.last_name||''} · ${item.subject||item.item_type}</div></div>${item.featured?'⭐':''}</div>${item.description?`<div style="font-size:11px;color:var(--text-secondary);margin:4px 0">${item.description.substring(0,80)}</div>`:''}<div style="display:flex;gap:4px;margin-top:8px">${item.file_url?`<a href="${item.file_url}" target="_blank" class="btn btn-sm btn-primary">View</a>`:''}<button class="btn btn-sm btn-ghost" onclick="Pages.Portfolio.feedback('${item.id}','${item.title.replace(/'/g,"\\'")}')">Feedback</button><button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="Pages.Portfolio.del('${item.id}')">✕</button></div></div>`).join('')}</div>`}`;
  },
  async _searchS(q) {
    const r=document.getElementById('pf-sres'); if(!q||q.length<2){r.innerHTML='';return;}
    const d=await API.get(`/search/students?q=${encodeURIComponent(q)}&limit=5`);
    r.innerHTML=!d.length?'':`<div style="position:absolute;z-index:100;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;min-width:220px">${d.map(s=>`<div style="padding:8px;cursor:pointer;font-size:12px" onclick="Pages.Portfolio.render('${s.id}');document.getElementById('pf-sq').value='${s.first_name} ${s.last_name}';document.getElementById('pf-sres').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> ${s.admission_number}</div>`).join('')}</div>`;
  },
  openAdd() { ['pa-title','pa-desc','pa-sub','pa-url','pa-tags'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';}); UI.openModal('modal-portfolio'); },
  async saveItem() {
    const r=await API.post('/portfolio',{title:document.getElementById('pa-title')?.value?.trim(),description:document.getElementById('pa-desc')?.value,itemType:document.getElementById('pa-type')?.value||'project',subject:document.getElementById('pa-sub')?.value,fileUrl:document.getElementById('pa-url')?.value||null,tags:(document.getElementById('pa-tags')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),isPublic:document.getElementById('pa-public')?.checked||false});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Added to portfolio!');UI.closeModal('modal-portfolio');this.render();
  },
  feedback(id,title) {
    UI.showInfoModal(`Feedback: ${title}`,`<div class="form-group"><label>Teacher Feedback</label><textarea id="pfb-txt" rows="4" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div><button class="btn btn-primary w-full" onclick="Pages.Portfolio.saveFb('${id}')">Save Feedback</button>`);
  },
  async saveFb(id) {
    const r=await API.post(`/portfolio/${id}/feedback`,{feedback:document.getElementById('pfb-txt')?.value});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('Feedback saved!');UI.closeModal('_dynamic-modal');this.render();
  },
  async del(id) { if(!await UI.confirm('Delete this item?'))return; await API.delete(`/portfolio/${id}`); this.render(); },
};

Pages.Tutoring = {
  async load() { this.switchTab('offers'); },
  switchTab(tab, el) {
    document.querySelectorAll('#page-tutoring .tab').forEach(t=>t.classList.remove('active'));
    (el||document.querySelector(`#page-tutoring .tab[data-tab="${tab}"]`))?.classList.add('active');
    const c=document.getElementById('tutoring-content'); if(!c)return;
    if(tab==='offers') this._offers(c); else if(tab==='sessions') this._sessions(c); else this._offerHelp(c);
  },
  async _offers(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/tutoring/offers');
    c.innerHTML=`<div style="margin-bottom:12px"><input type="text" placeholder="Filter by subject…" id="tut-f" oninput="Pages.Tutoring._filter(this.value)" style="padding:7px 12px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-elevated);color:var(--text-primary)"></div>
    ${!d.length?UI.empty('No tutors available','Be the first to offer tutoring!'):
    `<div class="grid-auto" id="tut-grid">${this._tutCards(d)}</div>`}`;
    this._allOffers=d;
  },
  _tutCards(offers) {
    return offers.map(o=>`<div class="card"><div class="card-header"><div class="avatar">${o.first_name?.[0]||'T'}</div><div><div class="card-title">${o.first_name} ${o.last_name}</div><div class="card-subtitle">${o.class_name||''}</div></div><div style="text-align:right">${o.rating?`<div style="color:var(--amber);font-weight:700">⭐${parseFloat(o.rating).toFixed(1)}</div>`:''}<div style="font-size:10px;color:var(--text-muted)">${o.sessions_count||0} sessions</div></div></div>
    <div style="margin:6px 0;display:flex;gap:4px;flex-wrap:wrap">${(o.subjects||[]).map(s=>`<span style="background:var(--brand-subtle);color:var(--brand);padding:2px 8px;border-radius:12px;font-size:11px">${s}</span>`).join('')}</div>
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${o.availability||'Contact to arrange'}</div>
    <div style="display:flex;justify-content:space-between;align-items:center">${o.is_free?'<span style="color:var(--green);font-weight:700">🆓 FREE</span>':`<span style="color:var(--brand);font-weight:700">KES ${o.rate_per_hour}/hr</span>`}
    <button class="btn btn-sm btn-primary" onclick="Pages.Tutoring.request('${o.id}','${o.first_name} ${o.last_name}')">Request</button></div></div>`).join('');
  },
  _filter(q) { const g=document.getElementById('tut-grid'); if(!g)return; g.innerHTML=this._tutCards(q.length<2?this._allOffers:this._allOffers.filter(o=>(o.subjects||[]).some(s=>s.toLowerCase().includes(q.toLowerCase())))); },
  async request(offerId, name) {
    const sub=prompt(`Subject for session with ${name}:`); if(!sub)return;
    const date=prompt('Preferred date (YYYY-MM-DD):'); if(!date)return;
    const r=await API.post('/tutoring/sessions',{offerId,subject:sub,scheduledDate:date,durationMinutes:60,location:'School Library'});
    if(r.error){Toast.error(r.error);return;}
    Toast.success(`Session requested with ${name}!`);
  },
  async _sessions(c) {
    c.innerHTML=UI.loading();
    const d=await API.get('/tutoring/sessions');
    const stC={requested:'amber',confirmed:'blue',completed:'green',cancelled:'red'};
    c.innerHTML=!d.length?UI.empty('No tutoring sessions yet'):`<div style="display:flex;flex-direction:column;gap:8px">${d.map(s=>`<div class="card"><div class="card-header"><div><div class="card-title">${s.subject}</div><div class="card-subtitle">Tutor: ${s.tutor_name} · Student: ${s.student_name}</div></div><span class="badge badge-${stC[s.status]||'gray'}">${s.status}</span></div><div style="font-size:12px;color:var(--text-muted)">${s.scheduled_date?new Date(s.scheduled_date).toLocaleDateString('en-KE'):''} ${s.scheduled_time||''} ${s.location||''}</div>${s.status==='completed'&&!s.rating?`<div style="margin-top:6px">Rate: ${[1,2,3,4,5].map(n=>`<button onclick="Pages.Tutoring.rate('${s.id}',${n})" style="background:none;border:none;cursor:pointer;font-size:18px">⭐</button>`).join('')}</div>`:''}</div>`).join('')}`;
  },
  async rate(id,rating) { const r=await API.put(`/tutoring/sessions/${id}`,{status:'completed',rating}); if(r.error){Toast.error(r.error);return;} Toast.success('Rated!'); this._sessions(document.getElementById('tutoring-content')); },
  _offerHelp(c) {
    c.innerHTML=`<div class="card"><div class="card-header"><div class="card-title">📚 Offer Tutoring Help</div></div>
    <div class="form-group"><label>Subjects (comma-separated)</label><input type="text" id="to-sub" placeholder="Mathematics, Physics, Chemistry"></div>
    <div class="form-group"><label>Availability</label><input type="text" id="to-av" placeholder="Weekdays after 4PM, Saturdays"></div>
    <div class="form-group"><label>Brief experience</label><textarea id="to-exp" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary)"></textarea></div>
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:10px"><input type="checkbox" id="to-free" checked> I will tutor for free</label>
    <button class="btn btn-primary" onclick="Pages.Tutoring.saveOffer()">Start Offering Tutoring</button></div>`;
  },
  async saveOffer() {
    const r=await API.post('/tutoring/offers',{subjects:(document.getElementById('to-sub')?.value||'').split(',').map(s=>s.trim()).filter(Boolean),availability:document.getElementById('to-av')?.value,experience:document.getElementById('to-exp')?.value,isFree:document.getElementById('to-free')?.checked!==false});
    if(r.error){Toast.error(r.error);return;}
    Toast.success('You are now listed as a tutor!');this._offers(document.getElementById('tutoring-content'));
  },
};

console.log('✅ Beyond-Zeraki Part 2 loaded -- Visitors · Assets · AI Engine · Wellness · Branding · Polls · Career · Portfolio · Tutoring');
