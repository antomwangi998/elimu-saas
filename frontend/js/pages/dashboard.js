// ============================================================
// Dashboard Page — Role-Based, Zeraki-inspired
// ============================================================
var Pages = window.Pages = window.Pages || {};

Pages.Dashboard = {

  async load() {
    const area = document.getElementById('dash-area');
    if (!area) return;

    area.innerHTML = `<div style="text-align:center;padding:60px 20px">
      <div class="loading-spinner" style="margin:0 auto 16px"></div>
      <div style="color:var(--text-muted)">Loading dashboard...</div>
    </div>`;

    const user = AppState.user || {};
    const role = user.role || 'teacher';

    // Admin roles use full analytics; others use role dashboard
    const isAdmin = ['super_admin','school_admin','principal','deputy_principal'].includes(role);
    const endpoint = isAdmin ? '/analytics/dashboard' : '/role-dashboard';
    // Also fetch school profile for type detection
    API.get('/schools/my').then(sc => {
      if (sc?.id) { AppState.school = sc; }
    }).catch(()=>{});

    const data = await API.get(endpoint);

    if (data.error && !data.students && !data.role) {
      area.innerHTML = `<div class="empty-state">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <h3>Could not load dashboard</h3>
        <p style="color:var(--text-muted)">${data.error||'Check your connection'}</p>
        <button class="btn btn-primary" onclick="Pages.Dashboard.load()" style="margin-top:16px">Retry</button>
      </div>`;
      return;
    }

    if (data.role && !isAdmin) {
      this.renderRoleDashboard(area, data, user);
    } else {
      this.renderAdminDashboard(area, data, user);
    }
  },

  renderAdminDashboard(area, data, user) {
    const s     = data.students   || {};
    const fees  = data.fees       || {};
    const att   = data.attendance || {};
    const staff = data.staff      || {};
    const exams = data.exams      || {};
    const sc    = data.school     || {};
    const isPrimary = sc.type === 'primary';
    const isMixed   = sc.type === 'mixed';
    const hour  = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = user.firstName || user.first_name || 'Admin';
    const attPct = att.today_total > 0
      ? Math.round((att.today_present / att.today_total) * 100) : 0;
    const feeRate = fees.total_expected > 0
      ? Math.round((fees.total_collected / fees.total_expected) * 100) : 0;
    // School level banner
    const levelBanner = isPrimary
      ? `<div style="background:linear-gradient(135deg,#2E7D32,#558B2F);color:white;border-radius:10px;padding:10px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
           <span style="font-size:24px">🎒</span>
           <div><div style="font-weight:700">Primary School Dashboard</div><div style="font-size:12px;opacity:0.85">CBC Curriculum · Grades 1-8</div></div>
           <button class="btn btn-sm" style="margin-left:auto;background:rgba(255,255,255,0.2);color:white;border:none" onclick="Router.go('cbc')">CBC Assessments →</button>
         </div>`
      : isMixed
      ? `<div style="background:linear-gradient(135deg,#1565C0,#6A1B9A);color:white;border-radius:10px;padding:10px 16px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
           <span style="font-size:24px">🏫</span>
           <div><div style="font-weight:700">Mixed School Dashboard</div><div style="font-size:12px;opacity:0.85">Primary + Secondary · CBC + 8-4-4</div></div>
         </div>`
      : '';

    area.innerHTML = levelBanner + `
      <!-- Welcome Banner -->
      <div class="welcome-card" style="margin-bottom:24px">
        <div class="welcome-avatar">${UI.initials(firstName)}</div>
        <div>
          <div class="welcome-title">${greeting}, ${firstName} 👋</div>
          <div class="welcome-sub">Here's what's happening at your school today</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:32px">
          <div style="text-align:center;cursor:pointer" onclick="Router.go('students')">
            <div style="font-size:28px;font-weight:800;color:#fff">${s.total||0}</div>
            <div style="font-size:11px;opacity:0.8">Students</div>
          </div>
          <div style="text-align:center;cursor:pointer" onclick="Router.go('staff')">
            <div style="font-size:28px;font-weight:800;color:#fff">${staff.total||0}</div>
            <div style="font-size:11px;opacity:0.8">Staff</div>
          </div>
          <div style="text-align:center;cursor:pointer" onclick="Router.go('fees')">
            <div style="font-size:28px;font-weight:800;color:#fff">${feeRate}%</div>
            <div style="font-size:11px;opacity:0.8">Fee Rate</div>
          </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="stats-grid" style="margin-bottom:24px">
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg);cursor:pointer" onclick="Router.go('fees')">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
          </div>
          <div class="stat-body">
            <div class="stat-value">${UI.currency(fees.total_collected||0)}</div>
            <div class="stat-label">Fees Collected</div>
            <div class="stat-change ${feeRate>=80?'up':'down'}">${feeRate}% collection rate</div>
          </div>
        </div>

        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle);cursor:pointer" onclick="Router.go('attendance')">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 16l2 2 4-4"/>
            </svg>
          </div>
          <div class="stat-body">
            <div class="stat-value">${attPct}%</div>
            <div class="stat-label">Today's Attendance</div>
            <div class="stat-change up">${att.today_present||0} / ${att.today_total||0} present</div>
          </div>
        </div>

        <div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg);cursor:pointer" onclick="Router.go('exams')">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div class="stat-body">
            <div class="stat-value">${exams.total_series||0}</div>
            <div class="stat-label">Exam Series</div>
            <div class="stat-change">${exams.pending_results||0} pending results</div>
          </div>
        </div>

        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg);cursor:pointer" onclick="Router.go('fees')">
          <div class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="stat-body">
            <div class="stat-value">${UI.currency(fees.total_outstanding||fees.total_balance||0)}</div>
            <div class="stat-label">Outstanding Fees</div>
            <div class="stat-change down">${fees.defaulter_count||0} defaulters</div>
          </div>
        </div>
      </div>

      <!-- Two column: Quick Actions + Recent Activity -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <h3>⚡ Quick Actions</h3>
          </div>
          <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:16px">
            ${[
              {icon:'👤',label:'Add Student',page:'students',action:"Pages.Students?.openAddModal?.()"},
              {icon:'👩‍🏫',label:'Add Staff',page:'staff',action:"Pages.Staff?.openAddModal?.()"},
              {icon:'📝',label:'Take Attendance',page:'attendance',action:"Router.go('attendance')"},
              {icon:'💰',label:'Record Payment',page:'fees',action:"Pages.Fees?.openPaymentModal?.()"},
              {icon:'📊',label:'Exam Marks',page:'exams',action:"Router.go('exams')"},
              {icon:'📋',label:'Report Cards',page:'report-cards',action:"Router.go('report-cards')"},
              {icon:'💬',label:'Send SMS',page:'communication',action:"Router.go('communication')"},
              {icon:'📈',label:'Analytics',page:'reports',action:"Router.go('reports')"},
            ].map(a => `
              <button class="btn btn-secondary" onclick="${a.action}" style="display:flex;align-items:center;gap:8px;justify-content:flex-start;padding:10px 12px">
                <span style="font-size:18px">${a.icon}</span>
                <span style="font-size:12px;font-weight:600">${a.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>📊 Student Breakdown</h3>
          </div>
          <div class="card-body" style="padding:16px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
              ${[
                {label:'Total',val:s.total||0,color:'var(--brand)'},
                {label:'Boys',val:s.boys||0,color:'var(--brand)'},
                {label:'Girls',val:s.girls||0,color:'var(--purple)'},
                {label:'Boarders',val:s.boarding||0,color:'var(--green)'},
              ].map(x => `
                <div style="background:var(--bg-elevated);border-radius:10px;padding:12px;text-align:center">
                  <div style="font-size:24px;font-weight:800;color:${x.color}">${x.val}</div>
                  <div style="font-size:11px;color:var(--text-muted);font-weight:600">${x.label}</div>
                </div>
              `).join('')}
            </div>
            <!-- Attendance bar -->
            <div style="margin-top:8px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
                <span style="color:var(--text-secondary);font-weight:600">Today's Attendance</span>
                <span style="font-weight:700;color:${attPct>=80?'var(--green)':'var(--red)'}">${attPct}%</span>
              </div>
              <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">
                <div style="height:100%;width:${attPct}%;background:${attPct>=80?'var(--green)':'var(--red)'};border-radius:99px;transition:width 0.6s ease"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:var(--text-muted)">
                <span>Fee collection: ${feeRate}%</span>
                <span>${fees.total_collected ? UI.currency(fees.total_collected) : 'KES 0'} collected</span>
              </div>
              <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden;margin-top:4px">
                <div style="height:100%;width:${feeRate}%;background:var(--green);border-radius:99px;transition:width 0.6s ease"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Class Performance Table -->
      <div class="card">
        <div class="card-header">
          <h3>🏫 Classes Overview</h3>
          <button class="btn btn-sm btn-secondary" onclick="Router.go('academics')">View All</button>
        </div>
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Class</th><th>Students</th><th>Boys</th><th>Girls</th>
                <th>Boarders</th><th>Class Teacher</th><th>Action</th>
              </tr>
            </thead>
            <tbody id="dash-classes-tbody">
              <tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">Loading classes...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Load classes asynchronously
    this.loadClassesTable();
  },

  async loadClassesTable() {
    const tbody = document.getElementById('dash-classes-tbody');
    if (!tbody) return;
    const data = await API.get('/academics/classes');
    const classes = Array.isArray(data) ? data : (data?.data || []);
    if (!classes.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">No classes found. <a href="#" onclick="Router.go('academics')">Add classes →</a></td></tr>`;
      return;
    }
    tbody.innerHTML = classes.map(cls => `
      <tr onclick="Router.go('students')" style="cursor:pointer">
        <td><strong>${cls.name} ${cls.stream||''}</strong></td>
        <td>${cls.student_count||0}</td>
        <td>${cls.boys_count||0}</td>
        <td>${cls.girls_count||0}</td>
        <td>${cls.boarding_count||0}</td>
        <td>${cls.class_teacher_name||'<span style="color:var(--text-muted)">Unassigned</span>'}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();Router.go('exams')">Marks</button>
          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();Router.go('attendance')">Attendance</button>
        </td>
      </tr>
    `).join('');
  },

  getRoleTagline(role) {
    const map = {
      teacher:'Manage your classes, marks and attendance',
      class_teacher:'Your class register, attendance and student welfare',
      hod:'Department performance and academic oversight',
      dean_of_studies:'Academic oversight and examination management',
      deputy_principal:'School operations and performance monitoring',
      bursar:'Fee collection, payments and financial reports',
      student:'Your grades, timetable and school updates',
      parent:"Monitor your child's progress and fee status",
      librarian:'Library management and book tracking',
    };
    return map[role] || 'School management made easy';
  },

  renderRoleDashboard(area, data, user) {
    const role = data.role || user.role;
    const firstName = user.firstName || user.first_name || 'User';
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    let content = '';
    if (['teacher','class_teacher'].includes(role)) content = this.renderTeacherContent(data);
    else if (role === 'hod') content = this.renderHodContent(data);
    else if (role === 'bursar') content = this.renderBursarContent(data);
    else if (['dean_of_studies','deputy_principal'].includes(role)) content = this.renderDeanContent(data);
    else if (role === 'student') content = this.renderStudentContent(data);
    else if (role === 'parent') content = this.renderParentContent(data);
    else if (role === 'librarian') content = this.renderLibrarianContent(data);

    area.innerHTML = `
      <div class="welcome-card" style="margin-bottom:24px">
        <div class="welcome-avatar">${UI.initials(firstName)}</div>
        <div>
          <div class="welcome-title">${greeting}, ${firstName} 👋</div>
          <div class="welcome-sub">${this.getRoleTagline(role)}</div>
        </div>
      </div>
      ${content}
    `;
  },

  renderTeacherContent(data) {
    const classes = data.myClasses || [];
    const pending = data.pendingMarks || [];
    return `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon">📚</div>
          <div class="stat-body"><div class="stat-value">${classes.length}</div><div class="stat-label">My Subjects</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)">
          <div class="stat-icon">⏳</div>
          <div class="stat-body"><div class="stat-value">${pending.length}</div><div class="stat-label">Pending Submissions</div></div>
        </div>
      </div>
      ${classes.length ? `
        <div class="card" style="margin-bottom:16px">
          <div class="card-header"><h3>📖 My Classes & Subjects</h3></div>
          <div class="card-body" style="padding:0">
            ${classes.map(c => `
              <div class="list-item" onclick="Router.go('exams')" style="cursor:pointer;padding:14px 16px;border-bottom:1px solid var(--border)">
                <div class="list-item-icon" style="background:var(--brand-subtle);color:var(--brand);font-weight:700">${c.level||'?'}</div>
                <div class="list-item-content">
                  <div class="list-item-title">${c.name} ${c.stream||''} — <strong>${c.subject}</strong></div>
                  <div class="list-item-sub">${c.student_count||0} students · ${c.curriculum||''}</div>
                </div>
                <span class="badge badge-blue" style="cursor:pointer">Enter Marks</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `<div class="empty-state"><p>No subjects assigned yet. Contact your HOD.</p></div>`}
      ${pending.length ? `
        <div class="card">
          <div class="card-header"><h3>⚠️ Pending Mark Submissions</h3></div>
          <div class="card-body" style="padding:0">
            ${pending.map(p => `
              <div class="list-item" onclick="Router.go('exams')" style="cursor:pointer;padding:14px 16px;border-bottom:1px solid var(--border)">
                <div class="list-item-content">
                  <div class="list-item-title">${p.class_name} — ${p.subject_name}</div>
                  <div class="list-item-sub">${p.exam_name} · Due: ${UI.date(p.end_date)}</div>
                </div>
                <span class="badge badge-red">Submit Now</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
        <button class="btn btn-primary w-full" onclick="Router.go('exams')">📝 Enter Marks</button>
        <button class="btn btn-secondary w-full" onclick="Router.go('attendance')">✅ Take Attendance</button>
      </div>
    `;
  },

  renderHodContent(data) {
    const dept = data.departmentSummary || {};
    return `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon">👩‍🏫</div>
          <div class="stat-body"><div class="stat-value">${dept.teacherCount||0}</div><div class="stat-label">Dept Teachers</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)">
          <div class="stat-icon">📈</div>
          <div class="stat-body"><div class="stat-value">${dept.avgMean?dept.avgMean.toFixed(1)+'%':'—'}</div><div class="stat-label">Dept Mean</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg)">
          <div class="stat-icon">📚</div>
          <div class="stat-body"><div class="stat-value">${dept.subjectCount||0}</div><div class="stat-label">Subjects</div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <button class="btn btn-primary w-full" onclick="Router.go('exams')">📊 View Broadsheet</button>
        <button class="btn btn-secondary w-full" onclick="Router.go('reports')">📋 Dept Report</button>
      </div>
    `;
  },

  renderBursarContent(data) {
    const fees = data.feeSummary || {};
    const rate = fees.totalExpected > 0 ? Math.round((fees.totalCollected/fees.totalExpected)*100) : 0;
    return `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)">
          <div class="stat-icon">💰</div>
          <div class="stat-body"><div class="stat-value">${UI.currency(fees.totalCollected||0)}</div><div class="stat-label">Collected</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)">
          <div class="stat-icon">⏳</div>
          <div class="stat-body"><div class="stat-value">${UI.currency(fees.totalBalance||0)}</div><div class="stat-label">Outstanding</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon">📈</div>
          <div class="stat-body"><div class="stat-value">${rate}%</div><div class="stat-label">Collection Rate</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)">
          <div class="stat-icon">⚠️</div>
          <div class="stat-body"><div class="stat-value">${fees.defaulterCount||0}</div><div class="stat-label">Defaulters</div></div>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:16px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;font-weight:600">
            <span>Fee Collection Progress</span><span style="color:${rate>=80?'var(--green)':'var(--amber)'}">${rate}%</span>
          </div>
          <div style="height:12px;background:var(--border);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${rate}%;background:${rate>=80?'var(--green)':'var(--amber)'};border-radius:99px"></div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <button class="btn btn-primary w-full" onclick="Router.go('fees')">💰 Fee Records</button>
        <button class="btn btn-secondary w-full" onclick="Router.go('reports')">📊 Finance Report</button>
      </div>
    `;
  },

  renderDeanContent(data) {
    const exams = data.examSummary || {};
    const att = data.attendanceSummary || {};
    return `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon">📝</div>
          <div class="stat-body"><div class="stat-value">${exams.activeSeries||0}</div><div class="stat-label">Active Exams</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)">
          <div class="stat-icon">⏳</div>
          <div class="stat-body"><div class="stat-value">${exams.pendingSubmissions||0}</div><div class="stat-label">Pending Submissions</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)">
          <div class="stat-icon">✅</div>
          <div class="stat-body"><div class="stat-value">${att.todayRate||0}%</div><div class="stat-label">Today Attendance</div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <button class="btn btn-primary w-full" onclick="Router.go('exams')">📊 Manage Exams</button>
        <button class="btn btn-secondary w-full" onclick="Router.go('report-cards')">📋 Report Cards</button>
      </div>
    `;
  },

  renderStudentContent(data) {
    const grades = data.myGrades || {};
    const fees = data.myFees || {};
    return `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon">📊</div>
          <div class="stat-body"><div class="stat-value">${grades.meanGrade||'—'}</div><div class="stat-label">My Grade</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)">
          <div class="stat-icon">📈</div>
          <div class="stat-body"><div class="stat-value">${grades.meanScore?grades.meanScore.toFixed(1)+'%':'—'}</div><div class="stat-label">Mean Score</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg)">
          <div class="stat-icon">🏆</div>
          <div class="stat-body"><div class="stat-value">${grades.position?'#'+grades.position:'—'}</div><div class="stat-label">Position</div></div>
        </div>
        <div class="stat-card" style="--stat-color:${(fees.balance||0)>0?'var(--red)':'var(--green)'};--stat-bg:${(fees.balance||0)>0?'var(--red-bg)':'var(--green-bg)'}">
          <div class="stat-icon">💰</div>
          <div class="stat-body"><div class="stat-value">${UI.currency(fees.balance||0)}</div><div class="stat-label">Fee Balance</div></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <button class="btn btn-primary w-full" onclick="Router.go('exams')">📝 My Grades</button>
        <button class="btn btn-secondary w-full" onclick="Router.go('fees')">💰 Fee Statement</button>
      </div>
    `;
  },

  renderParentContent(data) {
    const children = data.myChildren || [];
    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><h3>👨‍👩‍👧 My Children (${children.length})</h3></div>
        <div class="card-body" style="padding:0">
          ${children.length === 0
            ? `<div style="padding:32px;text-align:center;color:var(--text-muted)">No children linked to this account.<br>Contact the school office.</div>`
            : children.map(child => `
              <div class="list-item" style="padding:16px;border-bottom:1px solid var(--border)">
                <div class="list-item-icon">${UI.initials(child.name||'?')}</div>
                <div class="list-item-content">
                  <div class="list-item-title" style="font-weight:700">${child.name||'—'}</div>
                  <div class="list-item-sub">${child.class_name||''} · Grade: <strong>${child.mean_grade||'—'}</strong></div>
                  <div class="list-item-sub">Fee Balance: <strong style="color:${(child.balance||0)>0?'var(--red)':'var(--green)'}">${UI.currency(child.balance||0)}</strong></div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
      <button class="btn btn-primary w-full" onclick="Router.go('parent-portal')">View Full Details</button>
    `;
  },

  renderLibrarianContent(data) {
    const lib = data.library || {};
    return `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)">
          <div class="stat-icon">📚</div>
          <div class="stat-body"><div class="stat-value">${lib.totalBooks||0}</div><div class="stat-label">Total Books</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)">
          <div class="stat-icon">📤</div>
          <div class="stat-body"><div class="stat-value">${lib.booksOut||0}</div><div class="stat-label">Borrowed</div></div>
        </div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)">
          <div class="stat-icon">⚠️</div>
          <div class="stat-body"><div class="stat-value">${lib.overdueCount||0}</div><div class="stat-label">Overdue</div></div>
        </div>
      </div>
      <button class="btn btn-primary w-full" onclick="Router.go('storekeeper')">📚 Manage Library</button>
    `;
  },
};
