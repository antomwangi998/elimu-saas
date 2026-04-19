// ============================================================
// Reset Passwords — for School Admin (staff) & Super Admin (school admins)
// ============================================================
'use strict';
if (typeof Pages !== 'undefined') {
Pages.ResetPasswords = {
  _staff: [],

  async load() {
    const area = document.getElementById('page-reset-passwords');
    if (!area) return;
    const role = AppState.user?.role;
    const isSuperAdmin = role === 'super_admin';

    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">🔑 Reset Passwords</h2>
          <p class="page-subtitle">${isSuperAdmin ? 'Reset school admin passwords across all schools' : 'Reset passwords for your school staff and students'}</p>
        </div>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div style="padding:16px;background:var(--amber-bg);border-radius:10px;margin-bottom:0;font-size:13px;display:flex;gap:10px;align-items:flex-start">
          <span style="font-size:20px;flex-shrink:0">⚠️</span>
          <div>The user will receive a temporary password. <strong>They must change it on their next login.</strong> Share the temporary password securely — do not send via unsecured channels.</div>
        </div>
      </div>
      <div class="card">
        <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <input type="text" id="rp-search" class="form-control" placeholder="Search by name or email…" style="max-width:300px" oninput="Pages.ResetPasswords.search(this.value)">
          ${!isSuperAdmin ? `<select id="rp-role" class="form-control" style="width:160px" onchange="Pages.ResetPasswords.filterRole(this.value)">
            <option value="">All Roles</option>
            <option value="teacher">Teachers</option>
            <option value="hod">HOD</option>
            <option value="deputy_principal">Deputy Principal</option>
            <option value="bursar">Bursar</option>
            <option value="librarian">Librarian</option>
            <option value="storekeeper">Storekeeper</option>
            <option value="nurse">Nurse</option>
            <option value="counselor">Counselor</option>
            <option value="secretary">Secretary</option>
            <option value="student">Students</option>
          </select>` : ''}
        </div>
        <div id="rp-list">
          <div style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></div>
        </div>
      </div>`;

    await this.fetchUsers();
  },

  async fetchUsers(q='', role='') {
    const isSuperAdmin = AppState.user?.role === 'super_admin';
    const list = document.getElementById('rp-list');
    if (!list) return;

    let data;
    if (isSuperAdmin) {
      // Super admin sees school admins across all schools
      data = await API.get('/superadmin/schools', { limit: 100 }).catch(()=>({data:[]}));
      const schools = data?.data || [];
      this._staff = schools.map(s=>({ id:s.id, name:s.name, email:s.email||s.admin_email||'—', role:'school_admin', isSchool:true, code:s.school_code }));
    } else {
      // School admin sees their own staff
      const params = { limit: 100 };
      if (q) params.search = q;
      if (role) params.role = role;
      data = await API.get('/staff', params).catch(()=>({data:[]}));
      const staff = data?.data || (Array.isArray(data) ? data : []);
      // Also get students if requested
      const studentsData = (!role || role==='student') ? await API.get('/students', { limit: 100, ...params }).catch(()=>({data:[]})) : {data:[]};
      const students = (studentsData?.data || []).map(s=>({...s, displayRole:'student', name:`${s.first_name||''} ${s.last_name||''}`.trim()}));
      this._staff = [...staff, ...students];
    }

    this._render();
  },

  _render() {
    const list = document.getElementById('rp-list');
    if (!list) return;
    const isSuperAdmin = AppState.user?.role === 'super_admin';

    if (!this._staff.length) {
      list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-muted)">No users found</div>';
      return;
    }

    list.innerHTML = `<div style="overflow-x:auto"><table class="data-table">
      <thead><tr><th>${isSuperAdmin?'School':'Name'}</th><th>Email</th><th>Role</th><th style="width:140px">Action</th></tr></thead>
      <tbody>
        ${this._staff.map(u => {
          const name = u.name || `${u.first_name||''} ${u.last_name||''}`.trim() || u.school_name || '—';
          const roleLabel = isSuperAdmin ? 'School Admin' : (u.displayRole||u.role||'—').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
          const uid = u.user_id || u.id;
          const isSchool = u.isSchool;
          return `<tr>
            <td><strong>${name}</strong>${u.code?` <span style="font-size:10px;color:var(--text-muted)">(${u.code})</span>`:''}</td>
            <td style="font-size:12px">${u.email||'—'}</td>
            <td><span class="badge badge-blue">${roleLabel}</span></td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="Pages.ResetPasswords.resetPassword('${uid}','${name.replace(/'/g,"\\'")}','${u.email||''}',${isSchool?'true':'false'})">
                🔑 Reset Password
              </button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>`;
  },

  search(val) {
    if (!val) { this._render(); return; }
    const q = val.toLowerCase();
    const filtered = this._staff.filter(u => {
      const name = (u.name || `${u.first_name||''} ${u.last_name||''}`.trim()).toLowerCase();
      return name.includes(q) || (u.email||'').toLowerCase().includes(q);
    });
    const list = document.getElementById('rp-list');
    if (!list) return;
    const orig = this._staff;
    this._staff = filtered;
    this._render();
    this._staff = orig;
  },

  filterRole(role) {
    this.fetchUsers('', role);
  },

  async resetPassword(userId, name, email, isSchool) {
    const confirmed = await UI.confirm(`Reset password for ${name}?`, 'Confirm Password Reset');
    if (!confirmed) return;

    const tempPwd = 'Temp@' + Math.floor(1000 + Math.random()*9000) + '!';
    let r;

    if (isSchool || AppState.user?.role === 'super_admin') {
      r = await API.post(`/superadmin/schools/${userId}/reset-admin-password`, {}).catch(()=>({error:'Failed'}));
    } else {
      r = await API.post('/auth/admin-reset-password', { userId, newPassword: tempPwd }).catch(()=>({error:'Failed'}));
    }

    if (r?.error) { Toast.error(r.error); return; }

    const displayPwd = r.tempPassword || tempPwd;

    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay open" id="pwd-done-modal" onclick="if(event.target===this)this.remove()" style="z-index:9999">
        <div class="modal" style="max-width:400px">
          <div class="modal-header" style="background:var(--green);color:white"><h3 style="color:white;margin:0">✅ Password Reset Successfully</h3></div>
          <div style="padding:24px">
            <div style="margin-bottom:12px;font-size:14px"><strong>${name}</strong>${email?` (${email})`:''}.</div>
            <div style="background:#E8F5E9;border:2px solid var(--green);border-radius:10px;padding:16px;margin-bottom:16px;text-align:center">
              <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Temporary Password</div>
              <div style="font-family:monospace;font-size:22px;font-weight:800;letter-spacing:3px;color:#1A1A2E">${displayPwd}</div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);line-height:1.6">⚠️ Share this securely. The user must change it on their next login.</div>
          </div>
          <div style="padding:12px 24px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-secondary" onclick="navigator.clipboard?.writeText('${displayPwd}').then(()=>Toast.success('Copied to clipboard!'))">📋 Copy</button>
            <button class="btn btn-primary" onclick="document.getElementById('pwd-done-modal').remove()">Done</button>
          </div>
        </div>
      </div>`);
  },
};

Router.define?.('reset-passwords', { title: 'Reset Passwords', onEnter: () => Pages.ResetPasswords.load() });
}
