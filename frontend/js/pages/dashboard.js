// ============================================================
// Dashboard Page -- Zeraki-inspired Design
// ============================================================
var Pages = window.Pages = window.Pages || {};

Pages.Dashboard = {
  charts: {},

  async load() {
    const area = document.getElementById('dash-area');
    if (!area) return;

    area.innerHTML = '<div style="text-align:center;padding:60px 20px"><div class="loading-spinner" style="margin:0 auto 16px"></div><div style="color:var(--text-muted)">Loading dashboard...</div></div>';

    const data = await API.get('/analytics/dashboard');
    if (data.error && !data.students) {
      area.innerHTML = '<div class="error-state"><div class="error-icon">⚠️</div><h3>Could not load dashboard</h3><p>' + data.error + '</p><button class="btn btn-primary" onclick="Pages.Dashboard.load()">Retry</button></div>';
      return;
    }

    const user = AppState.user || {};
    const firstName = user.firstName || user.first_name || 'User';
    const lastName = user.lastName || user.last_name || '';
    const s = data.students || {};
    const fees = data.fees || {};
    const att = data.attendance || {};
    const staff = data.staff || {};
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const attPct = att.today_total > 0 ? Math.round((att.today_present / att.today_total) * 100) : 0;

    area.innerHTML =
      // Welcome Card
      '<div class="welcome-card" style="margin-bottom:20px">' +
        '<div class="welcome-avatar">' + UI.initials(firstName + ' ' + lastName) + '</div>' +
        '<div class="welcome-title">' + greeting + ', ' + firstName + ' 👋</div>' +
        '<div class="welcome-sub">Manage your school from the comfort of your phone</div>' +
        '<div class="welcome-stats-row">' +
          '<div class="welcome-stat" onclick="Router.go(\'staff\')">' +
            '<div class="welcome-stat-val">' + (staff.total || 0) + '</div>' +
            '<div class="welcome-stat-lbl">Teachers</div>' +
          '</div>' +
          '<div class="welcome-stat" onclick="Router.go(\'students\')">' +
            '<div class="welcome-stat-val">' + (s.total || 0) + '</div>' +
            '<div class="welcome-stat-lbl">Students</div>' +
          '</div>' +
          '<div class="welcome-stat" onclick="Router.go(\'students\')">' +
            '<div class="welcome-stat-val">' + (s.boys || 0) + '</div>' +
            '<div class="welcome-stat-lbl">Boys</div>' +
          '</div>' +
          '<div class="welcome-stat" onclick="Router.go(\'students\')">' +
            '<div class="welcome-stat-val">' + (s.girls || 0) + '</div>' +
            '<div class="welcome-stat-lbl">Girls</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Stats Grid
      '<div class="stats-grid" style="margin-bottom:20px">' +
        '<div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle);cursor:pointer" onclick="Router.go(\'fees\')">' +
          '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>' +
          '<div class="stat-body"><div class="stat-value">' + UI.currency(fees.total_collected || 0) + '</div><div class="stat-label">Fees This Month</div></div>' +
        '</div>' +
        '<div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg);cursor:pointer" onclick="Router.go(\'attendance\')">' +
          '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 16l2 2 4-4"/></svg></div>' +
          '<div class="stat-body"><div class="stat-value">' + attPct + '%</div><div class="stat-label">Today\'s Attendance</div><div class="stat-change up">↑ ' + (att.today_present||0) + '/' + (att.today_total||0) + ' present</div></div>' +
        '</div>' +
        '<div class="stat-card" style="--stat-color:var(--purple);--stat-bg:var(--purple-bg);cursor:pointer" onclick="Router.go(\'students\')">' +
          '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>' +
          '<div class="stat-body"><div class="stat-value">' + (s.boarding || 0) + '</div><div class="stat-label">Boarders</div></div>' +
        '</div>' +
        '<div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg);cursor:pointer" onclick="Router.go(\'exams\')">' +
          '<div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>' +
          '<div class="stat-body"><div class="stat-value">' + (data.exams?.total_series || 0) + '</div><div class="stat-label">Exam Series</div></div>' +
        '</div>' +
      '</div>' +

      // Quick Actions + Recent Payments
      '<div class="grid-2" style="margin-bottom:20px">' +
        '<div class="card">' +
          '<div class="card-header"><div class="card-title">Quick Actions</div></div>' +
          '<div class="card-body" style="padding:12px">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
              _quickBtn('👤', 'Add Student', 'Pages.Students?.openAddModal()') +
              _quickBtn('✅', 'Attendance', 'Router.go("attendance")') +
              _quickBtn('💰', 'Record Fee', 'Pages.Fees?.openPaymentModal()') +
              _quickBtn('💬', 'Send SMS', 'Router.go("communication")') +
              _quickBtn('📝', 'Enter Marks', 'Router.go("exams")') +
              _quickBtn('📊', 'Reports', 'Router.go("reports")') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="card">' +
          '<div class="card-header"><div class="card-title">Recent Payments</div><button class="btn btn-sm btn-ghost" onclick="Router.go(\'fees\')">View All →</button></div>' +
          _recentPayments(data.recentPayments || []) +
        '</div>' +
      '</div>' +

      // Chart
      '<div class="card" style="margin-bottom:20px">' +
        '<div class="card-header"><div class="card-title">📈 Fee Collection Trend</div></div>' +
        '<div class="card-body"><canvas id="chart-fees" height="140"></canvas></div>' +
      '</div>';

    // Render chart after DOM update
    setTimeout(() => this.renderChart(data.charts || {}), 50);
  },

  renderChart(charts) {
    const ctx = document.getElementById('chart-fees');
    if (!ctx || !charts.feeTrend || !window.Chart) return;
    if (this.charts.fees) this.charts.fees.destroy();
    this.charts.fees = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: charts.feeTrend.map(d => d.month),
        datasets: [{
          label: 'Collected (KES)',
          data: charts.feeTrend.map(d => parseFloat(d.collected || 0)),
          backgroundColor: 'rgba(21,101,192,0.75)',
          borderColor: '#1565C0',
          borderWidth: 1,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#6B7280', font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#6B7280', callback: v => (v/1000).toFixed(0) + 'k' } },
        }
      }
    });
  },

  checkSubscriptionWarning() {}
};

function _quickBtn(icon, label, fn) {
  return '<button class="btn btn-secondary" style="flex-direction:column;gap:4px;height:64px;border-radius:12px;font-size:11px" onclick="' + fn + '">' +
    '<span style="font-size:20px">' + icon + '</span><span>' + label + '</span></button>';
}

function _recentPayments(payments) {
  if (!payments.length) return '<div class="empty-state" style="padding:24px"><div class="empty-icon">💳</div><div class="empty-desc">No recent payments</div></div>';
  return '<div>' + payments.slice(0,5).map(function(p) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border-subtle)">' +
      '<div><div style="font-size:13px;font-weight:600">' + p.student_name + '</div><div style="font-size:11px;color:var(--text-muted)">' + UI.date(p.payment_date) + '</div></div>' +
      '<div style="font-weight:700;color:var(--green);font-size:14px">' + UI.currency(p.amount) + '</div></div>';
  }).join('') + '</div>';
}

Router.define?.('dashboard', { title: 'Dashboard', onEnter: () => Pages.Dashboard.load() });
