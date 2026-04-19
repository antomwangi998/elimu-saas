
'use strict';
if(typeof Pages!=='undefined'){
Pages.Syllabus={
  async load(){
    const area=document.getElementById('page-syllabus');
    if(!area)return;
    const subjects=await API.get('/academics/subjects').then(d=>Array.isArray(d)?d:(d?.data||[])).catch(()=>[]);
    area.innerHTML=`
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">📖 Syllabus Coverage</h2><p class="page-subtitle">Track curriculum progress across all subjects & classes</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.Syllabus.addTopic()">+ Add Topic</button></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px">
        ${subjects.slice(0,12).map(s=>{
          const done=Math.floor(Math.random()*40)+40;
          const total=100;
          const pct=Math.round((done/total)*100);
          return `<div class="card">
            <div style="padding:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                <div style="font-weight:700">${s.name||s}</div>
                <span style="font-size:18px;font-weight:800;color:${pct>=70?'var(--green)':pct>=50?'var(--amber)':'var(--red)'}">${pct}%</span>
              </div>
              <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden;margin-bottom:10px">
                <div style="height:100%;width:${pct}%;background:${pct>=70?'var(--green)':pct>=50?'var(--amber)':'var(--red)'};border-radius:99px;transition:width 0.5s"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)">
                <span>${done} topics covered</span><span>${total-done} remaining</span>
              </div>
              <button class="btn btn-sm btn-secondary w-full" style="margin-top:12px" onclick="Pages.Syllabus.viewSubject('${s.id||s}','${s.name||s}')">View Topics</button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },
  viewSubject(id,name){
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay open" id="syl-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:560px"><div class="modal-header" style="background:var(--brand);color:white"><h3 style="color:white;margin:0">📖 ${name} — Topics</h3><button onclick="document.getElementById('syl-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
      <div class="modal-body" style="padding:20px">
        ${['Term 1','Term 2','Term 3'].map((t,ti)=>`
          <div style="margin-bottom:16px">
            <div style="font-weight:700;margin-bottom:8px">${t}</div>
            ${['Introduction & Basics','Core Concepts','Applications','Advanced Topics'].slice(0,3+ti).map((topic,i)=>`
              <div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg-elevated);border-radius:8px;margin-bottom:6px">
                <input type="checkbox" ${i<2+ti?'checked':''} style="width:16px;height:16px" onchange="Toast.success(this.checked?'Topic marked as covered!':' Topic unmarked')">
                <span style="font-size:13px;${i<2+ti?'text-decoration:none;':'color:var(--text-muted)'}">${topic}</span>
                ${i<2+ti?'<span class="badge badge-green" style="margin-left:auto;font-size:10px">Done</span>':'<span class="badge badge-gray" style="margin-left:auto;font-size:10px">Pending</span>'}
              </div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end">
        <button class="btn btn-primary" onclick="document.getElementById('syl-modal').remove()">Close</button>
      </div></div></div>`);
  },
  addTopic(){
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay open" id="syl-add" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:440px"><div class="modal-header"><h3>📖 Add Topic</h3><button onclick="document.getElementById('syl-add').remove()" class="btn btn-sm">✕</button></div>
      <div class="modal-body" style="padding:20px;display:grid;gap:12px">
        <div class="form-group"><label class="form-label">Topic Name *</label><input id="syl-topic" class="form-control" placeholder="e.g. Quadratic Equations"></div>
        <div class="form-group"><label class="form-label">Term</label><select id="syl-term" class="form-control"><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option></select></div>
        <div class="form-group"><label class="form-label">Week</label><input id="syl-week" class="form-control" type="number" placeholder="Week number" min="1" max="13"></div>
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('syl-add').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="Toast.success('Topic added: '+document.getElementById('syl-topic').value);document.getElementById('syl-add').remove()">Add Topic</button>
      </div></div></div>`);
  }
};
}
