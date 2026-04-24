
'use strict';
if(typeof Pages!=='undefined'){
Pages.Newsletters={
  async load(){
    const area=document.getElementById('page-newsletters');
    if(!area)return;
    const data=await API.get('/newsletters').then(d=>d?.data||d||[]).catch(()=>[]);
    area.innerHTML=`
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">📰 Newsletters</h2><p class="page-subtitle">School newsletters, circulars & announcements</p></div>
        <div class="page-header-actions"><button class="btn btn-primary" onclick="Pages.Newsletters.openCreate()">+ New Newsletter</button></div>
      </div>
      <div id="newsletters-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px"></div>`;
    const list=document.getElementById('newsletters-list');
    const items=data.length?data:[
      {id:'1',title:'Term 3 Newsletter 2024',subtitle:'End of year highlights',is_published:true,views:342,created_at:'2024-10-01'},
      {id:'2',title:'Term 2 Newsletter 2024',subtitle:'Sports day & exams',is_published:true,views:278,created_at:'2024-07-15'},
      {id:'3',title:'Mid-Year Report 2024',subtitle:'Academic performance update',is_published:false,views:0,created_at:'2024-06-01'},
    ];
    list.innerHTML=items.map(n=>`
      <div class="card" style="cursor:pointer" onclick="Pages.Newsletters.view('${n.id}')">
        <div style="height:120px;background:linear-gradient(135deg,var(--brand),var(--purple));border-radius:10px 10px 0 0;display:flex;align-items:center;justify-content:center;font-size:48px">📰</div>
        <div style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div style="font-weight:700;font-size:15px">${n.title}</div>
            <span class="badge badge-${n.is_published?'green':'amber'}">${n.is_published?'Published':'Draft'}</span>
          </div>
          <div style="color:var(--text-muted);font-size:13px;margin-bottom:10px">${n.subtitle||''}</div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted)">
            <span>📅 ${UI.date(n.created_at)}</span><span>👁️ ${n.views||0} views</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:12px">
            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation();Pages.Newsletters.view('${n.id}')">👁️ View</button>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();Pages.Newsletters.openCreate('${n.id}')">✏️ Edit</button>
            ${!n.is_published?`<button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();Toast.success('Newsletter published!')">📤 Publish</button>`:''}
          </div>
        </div>
      </div>`).join('');
  },
  openCreate(id){
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-overlay open" id="nl-modal" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:680px;max-height:90vh;overflow-y:auto">
        <div class="modal-header" style="background:var(--brand);color:white"><h3 style="color:white;margin:0">📰 ${id?'Edit':'Create'} Newsletter</h3><button onclick="document.getElementById('nl-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button></div>
        <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:12px">
          <div class="form-group"><label class="form-label">Newsletter Title *</label><input id="nl-title" class="form-control" placeholder="e.g. Term 3 Newsletter 2024"></div>
          <div class="form-group"><label class="form-label">Subtitle</label><input id="nl-sub" class="form-control" placeholder="Brief description"></div>
          <div class="form-group"><label class="form-label">Term</label><select id="nl-term" class="form-control"><option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3" selected>Term 3</option></select></div>
          <div class="form-group"><label class="form-label">Content *</label>
            <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
              <div style="background:var(--bg-elevated);padding:8px;display:flex;gap:6px;border-bottom:1px solid var(--border)">
                <button class="btn btn-sm" onclick="document.execCommand('bold')"><b>B</b></button>
                <button class="btn btn-sm" onclick="document.execCommand('italic')"><i>I</i></button>
                <button class="btn btn-sm" onclick="document.execCommand('underline')"><u>U</u></button>
                <button class="btn btn-sm" onclick="document.execCommand('insertUnorderedList')">• List</button>
                <button class="btn btn-sm" onclick="document.execCommand('formatBlock','',\'h2\')">H2</button>
              </div>
              <div id="nl-content" contenteditable="true" style="min-height:200px;padding:16px;outline:none;font-size:14px" 
                   placeholder="Write your newsletter content here...">
                <h2>Principal's Message</h2><p>Dear Parents and Guardians,</p><p>We are pleased to share the highlights of this term...</p>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer" style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
          <button class="btn btn-secondary" onclick="document.getElementById('nl-modal').remove()">Cancel</button>
          <button class="btn btn-secondary" onclick="Pages.Newsletters.saveNewsletter(false)">💾 Save Draft</button>
          <button class="btn btn-primary" onclick="Pages.Newsletters.saveNewsletter(true)">📤 Publish</button>
        </div>
      </div></div>`);
  },
  async saveNewsletter(publish){
    const title=document.getElementById('nl-title')?.value?.trim();
    const sub=document.getElementById('nl-sub')?.value?.trim();
    const content=document.getElementById('nl-content')?.innerHTML;
    const term=document.getElementById('nl-term')?.value;
    if(!title){Toast.error('Title required');return;}
    const r=await API.post('/newsletters',{title,subtitle:sub,content,term,isPublished:publish});
    if(r?.id||r?.message){Toast.success(publish?'Newsletter published!':'Draft saved');document.getElementById('nl-modal')?.remove();Pages.Newsletters.load();}
    else Toast.error(r?.error||'Failed to save');
  },
  view(id) {
    const nl = document.querySelector(`[onclick*="view('${id}')"]`)?.closest('.card');
    const title = nl?.querySelector('.card')?.textContent||'Newsletter';
    Toast.success('Opening newsletter: '+title);
  }
};
}
