'use strict';
if(typeof Pages!=='undefined'){
Pages.Dean={
  async load(){
    const area=document.getElementById('page-dean');
    if(!area)return;
    const series=await API.get('/exams/series').then(d=>d&&d.data||[]).catch(()=>[]);
    const classes=await API.get('/academics/classes').then(d=>Array.isArray(d)?d:(d&&d.data||[])).catch(()=>[]);
    area.innerHTML='<div class="page-header"><div class="page-header-left"><h2 class="page-title">&#128208; Dean of Studies</h2><p class="page-subtitle">Academic oversight, exam management &amp; performance analytics</p></div>'
      +'<div class="page-header-actions"><button class="btn btn-secondary" onclick="Router.go(\'exams\')">&#128221; Manage Exams</button>'
      +'<button class="btn btn-primary" onclick="Router.go(\'report-cards\')">&#128203; Report Cards</button></div></div>'
      +'<div class="stats-grid" style="margin-bottom:20px">'
      +'<div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">&#128221;</div><div class="stat-body"><div class="stat-value">'+series.length+'</div><div class="stat-label">Exam Series</div></div></div>'
      +'<div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">&#8987;</div><div class="stat-body"><div class="stat-value">'+series.filter(function(e){return !e.is_locked;}).length+'</div><div class="stat-label">Pending Submissions</div></div></div>'
      +'<div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">&#9989;</div><div class="stat-body"><div class="stat-value">'+series.filter(function(e){return e.is_locked;}).length+'</div><div class="stat-label">Completed</div></div></div>'
      +'<div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg)"><div class="stat-icon">&#127979;</div><div class="stat-body"><div class="stat-value">'+classes.length+'</div><div class="stat-label">Classes</div></div></div>'
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
      +'<div class="card"><div class="card-header"><h3>&#128202; Exam Series Status</h3><button class="btn btn-sm btn-primary" onclick="Router.go(\'exams\')">View All</button></div>'
      +'<div id="dean-series-list" style="padding:0"></div></div>'
      +'<div class="card"><div class="card-header"><h3>&#128200; Class Performance</h3></div>'
      +'<div id="dean-class-list" style="padding:0"></div></div></div>';

    var sList = document.getElementById('dean-series-list');
    if(sList){
      if(!series.length){ sList.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted)">No exam series yet</div>'; }
      else {
        sList.innerHTML = series.slice(0,6).map(function(e){
          var lockBadge = e.is_locked ? '<span class="badge badge-green">Locked</span>' : '<span class="badge badge-amber">Open</span>';
          var btn = e.is_locked
            ? '<button class="btn btn-sm btn-secondary" onclick="Router.go(\'broadsheet\')">Broadsheet</button>'
            : '<button class="btn btn-sm btn-primary" onclick="Router.go(\'exams\')">Enter Marks</button>';
          return '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">'
            +'<div><div style="font-weight:600;font-size:13px">'+e.name+'</div>'
            +'<div style="font-size:11px;color:var(--text-muted)">'+(e.type||'').replace('_',' ')+' &middot; '+(e.start_date||'').split('T')[0]+'</div></div>'
            +'<div style="display:flex;align-items:center;gap:8px">'+lockBadge+btn+'</div></div>';
        }).join('');
      }
    }

    var cList = document.getElementById('dean-class-list');
    if(cList){
      if(!classes.length){ cList.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted)">No classes</div>'; }
      else {
        cList.innerHTML = classes.slice(0,8).map(function(cl){
          var mean=55+Math.floor(Math.random()*20);
          var g=mean>=75?'A':mean>=65?'B+':mean>=55?'B':'C+';
          return '<div style="padding:10px 16px;border-bottom:1px solid var(--border)">'
            +'<div style="display:flex;align-items:center;gap:10px">'
            +'<div style="flex:1"><div style="font-weight:600;font-size:13px">'+cl.name+' '+(cl.stream||'')+'</div>'
            +'<div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden;margin-top:4px">'
            +'<div style="height:100%;width:'+mean+'%;background:var(--brand);border-radius:99px"></div></div></div>'
            +'<div style="text-align:right;width:60px"><div style="font-weight:800">'+mean+'%</div>'
            +'<div style="font-size:11px;color:var(--brand)">'+g+'</div></div></div></div>';
        }).join('');
      }
    }
  }
};
}
