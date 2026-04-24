'use strict';
if (typeof Pages !== 'undefined') {
Pages.Gamification = {
  async load() {
    const area = document.getElementById('page-gamification');
    if (!area) return;
    area.innerHTML = `<div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>`;

    const [lb, badges] = await Promise.all([
      API.get('/gamification/leaderboard').catch(() => []),
      API.get('/gamification/badges').catch(() => []),
    ]);
    const leaderboard = Array.isArray(lb) ? lb : (lb?.data || lb?.leaderboard || []);
    const badgeList   = Array.isArray(badges) ? badges : (badges?.data || []);

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">🏆 Leaderboard & Gamification</h2>
          <p class="page-subtitle">Student points, badges and school-wide rankings</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Pages.Gamification.openAwardPoints()">⭐ Award Points</button>
        </div>
      </div>

      <!-- Top 3 Podium -->
      ${leaderboard.length >= 3 ? `
      <div style="display:flex;justify-content:center;align-items:flex-end;gap:16px;margin-bottom:28px;padding:20px;background:linear-gradient(135deg,#0D47A1,#1976D2);border-radius:16px">
        <!-- 2nd -->
        <div style="text-align:center;flex:1;max-width:160px">
          <div style="width:60px;height:60px;border-radius:50%;background:silver;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:#333;margin:0 auto 8px">${UI.initials(leaderboard[1]?.student_name||'2')}</div>
          <div style="color:white;font-weight:700;font-size:13px">${leaderboard[1]?.student_name||'—'}</div>
          <div style="color:rgba(255,255,255,0.7);font-size:11px">${leaderboard[1]?.total_points||0} pts</div>
          <div style="background:silver;color:#333;font-weight:900;font-size:18px;padding:16px 0 8px;border-radius:8px 8px 0 0;margin-top:8px">🥈</div>
        </div>
        <!-- 1st -->
        <div style="text-align:center;flex:1;max-width:180px">
          <div style="font-size:28px;margin-bottom:4px">👑</div>
          <div style="width:72px;height:72px;border-radius:50%;background:gold;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900;color:#333;margin:0 auto 8px;box-shadow:0 0 20px rgba(255,215,0,0.6)">${UI.initials(leaderboard[0]?.student_name||'1')}</div>
          <div style="color:white;font-weight:800;font-size:14px">${leaderboard[0]?.student_name||'—'}</div>
          <div style="color:rgba(255,255,255,0.8);font-size:12px">${leaderboard[0]?.total_points||0} pts</div>
          <div style="background:gold;color:#333;font-weight:900;font-size:20px;padding:20px 0 8px;border-radius:8px 8px 0 0;margin-top:8px">🥇</div>
        </div>
        <!-- 3rd -->
        <div style="text-align:center;flex:1;max-width:160px">
          <div style="width:60px;height:60px;border-radius:50%;background:#CD7F32;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;color:white;margin:0 auto 8px">${UI.initials(leaderboard[2]?.student_name||'3')}</div>
          <div style="color:white;font-weight:700;font-size:13px">${leaderboard[2]?.student_name||'—'}</div>
          <div style="color:rgba(255,255,255,0.7);font-size:11px">${leaderboard[2]?.total_points||0} pts</div>
          <div style="background:#CD7F32;color:white;font-weight:900;font-size:18px;padding:12px 0 8px;border-radius:8px 8px 0 0;margin-top:8px">🥉</div>
        </div>
      </div>` : ''}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Full Leaderboard -->
        <div class="card">
          <div class="card-header"><h3>📊 Full Leaderboard</h3></div>
          <div style="padding:0">
            ${leaderboard.length ? leaderboard.slice(0,15).map((s,i) => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)">
                <div style="width:28px;text-align:center;font-weight:800;font-size:14px;color:${i===0?'#DAA520':i===1?'silver':i===2?'#CD7F32':'var(--text-muted)'}">${i+1}</div>
                <div style="width:36px;height:36px;border-radius:50%;background:var(--brand-subtle);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;color:var(--brand);flex-shrink:0">${UI.initials(s.student_name||'S')}</div>
                <div style="flex:1">
                  <div style="font-weight:600;font-size:13px">${s.student_name||'—'}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${s.class_name||''}</div>
                </div>
                <div style="text-align:right">
                  <div style="font-weight:800;color:var(--brand)">${s.total_points||0}</div>
                  <div style="font-size:10px;color:var(--text-muted)">points</div>
                </div>
              </div>`).join('') : `
              <div style="padding:40px;text-align:center;color:var(--text-muted)">
                <div style="font-size:40px;margin-bottom:10px">🏆</div>
                <div>No points awarded yet</div>
                <div style="font-size:12px;margin-top:6px">Click "Award Points" to get started</div>
              </div>`}
          </div>
        </div>

        <!-- Badges -->
        <div class="card">
          <div class="card-header"><h3>🎖️ Available Badges</h3>
            <button class="btn btn-sm btn-secondary" onclick="Pages.Gamification.openCreateBadge()">+ Create Badge</button>
          </div>
          <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px">
            ${badgeList.length ? badgeList.map(b => `
              <div style="text-align:center;padding:14px;background:var(--bg-elevated);border-radius:10px;border:1px solid var(--border)">
                <div style="font-size:28px;margin-bottom:6px">${b.icon||'🎖️'}</div>
                <div style="font-size:12px;font-weight:700">${b.name}</div>
                <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${b.description?.slice(0,30)||''}</div>
              </div>`).join('') : `
              <div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--text-muted)">
                <div style="font-size:36px;margin-bottom:8px">🎖️</div>
                <div>No badges yet</div>
              </div>`}
          </div>
        </div>
      </div>`;
  },

  openAwardPoints() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="award-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:440px">
          <div class="modal-header" style="background:var(--brand);color:white">
            <h3 style="color:white;margin:0">⭐ Award Points</h3>
            <button onclick="document.getElementById('award-modal').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;width:28px;height:28px;border-radius:50%;cursor:pointer">✕</button>
          </div>
          <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:12px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Student *</label>
              <input id="award-student-search" class="form-control" placeholder="Search student name..."
                oninput="clearTimeout(Pages.Gamification._st);Pages.Gamification._st=setTimeout(()=>Pages.Gamification.searchStudent(this.value),300)">
              <div id="award-student-results"></div>
              <input type="hidden" id="award-student-id">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Points *</label>
              <input id="award-points" class="form-control" type="number" placeholder="e.g. 10" min="1" max="100">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Category</label>
              <select id="award-category" class="form-control">
                <option value="academic">📚 Academic</option>
                <option value="sports">⚽ Sports</option>
                <option value="leadership">👑 Leadership</option>
                <option value="arts">🎨 Arts</option>
                <option value="community">🤝 Community Service</option>
                <option value="behaviour">😊 Good Behaviour</option>
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Reason *</label>
              <input id="award-reason" class="form-control" placeholder="e.g. Best performance in Mathematics">
            </div>
          </div>
          <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="document.getElementById('award-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.Gamification.awardPoints()">⭐ Award Points</button>
          </div>
        </div>
      </div>`);
  },

  async searchStudent(q) {
    if (!q || q.length < 2) return;
    const results = document.getElementById('award-student-results');
    const data = await API.get('/students', { search: q, limit: 5 }).then(d => d?.data||[]).catch(()=>[]);
    results.innerHTML = data.length ? `
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;margin-top:4px">
        ${data.map(s=>`<div style="padding:8px 12px;cursor:pointer;font-size:13px" onclick="document.getElementById('award-student-search').value='${s.first_name} ${s.last_name}';document.getElementById('award-student-id').value='${s.id}';document.getElementById('award-student-results').innerHTML=''"><strong>${s.first_name} ${s.last_name}</strong> <span style="color:var(--text-muted)">${s.class_name||''}</span></div>`).join('')}
      </div>` : '';
  },

  async awardPoints() {
    const studentId = document.getElementById('award-student-id')?.value;
    const points    = parseInt(document.getElementById('award-points')?.value);
    const reason    = document.getElementById('award-reason')?.value?.trim();
    const category  = document.getElementById('award-category')?.value;
    if (!studentId) { Toast.error('Select a student'); return; }
    if (!points || points < 1) { Toast.error('Enter points (min 1)'); return; }
    if (!reason) { Toast.error('Enter a reason'); return; }
    const r = await API.post('/gamification/award', { studentId, points, reason, category });
    if (r?.message) {
      Toast.success(`⭐ ${points} points awarded!`);
      document.getElementById('award-modal')?.remove();
      this.load();
    } else Toast.error(r?.error || 'Failed');
  },

  openCreateBadge() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="badge-modal" onclick="if(event.target===this)this.remove()">
        <div class="modal" style="max-width:400px">
          <div class="modal-header"><h3>🎖️ Create Badge</h3><button onclick="document.getElementById('badge-modal').remove()" class="btn btn-sm">✕</button></div>
          <div class="modal-body" style="padding:20px;display:flex;flex-direction:column;gap:12px">
            <div class="form-group" style="margin:0"><label class="form-label">Badge Name *</label><input id="badge-name" class="form-control" placeholder="e.g. Math Champion"></div>
            <div class="form-group" style="margin:0"><label class="form-label">Icon (emoji)</label><input id="badge-icon" class="form-control" placeholder="🏆" maxlength="4"></div>
            <div class="form-group" style="margin:0"><label class="form-label">Description</label><input id="badge-desc" class="form-control" placeholder="Awarded for..."></div>
            <div class="form-group" style="margin:0"><label class="form-label">Category</label>
              <select id="badge-cat" class="form-control"><option value="academic">Academic</option><option value="sports">Sports</option><option value="leadership">Leadership</option><option value="arts">Arts</option></select></div>
          </div>
          <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn-secondary" onclick="document.getElementById('badge-modal').remove()">Cancel</button>
            <button class="btn btn-primary" onclick="Pages.Gamification.saveBadge()">Create Badge</button>
          </div>
        </div>
      </div>`);
  },

  async saveBadge() {
    const name = document.getElementById('badge-name')?.value?.trim();
    if (!name) { Toast.error('Badge name required'); return; }
    const r = await API.post('/gamification/badges', {
      name, icon: document.getElementById('badge-icon')?.value||'🎖️',
      description: document.getElementById('badge-desc')?.value,
      category: document.getElementById('badge-cat')?.value
    });
    if (r?.id || r?.message) {
      Toast.success('Badge created!');
      document.getElementById('badge-modal')?.remove();
      this.load();
    } else Toast.error(r?.error || 'Failed');
  }
};
}
