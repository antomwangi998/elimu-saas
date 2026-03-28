var Pages = window.Pages = window.Pages || {};
// ============================================================
// Dashboard Page
// ============================================================
Pages.Dashboard = {
  charts: {},

  async load() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEl = document.getElementById('dash-greeting');
    if (greetEl) greetEl.textContent = `${greeting}, ${AppState.user?.firstName}! Here's your school overview.`;

    const data = await API.get('/analytics/dashboard');
    if (data.error) { Toast.error(data.error); return; }

    this.renderStats(data);
    this.renderRecentPayments(data.recentPayments);
    this.renderQuickActions();
    this.renderCharts(data.charts);
    this.checkSubscriptionWarning();
  },

  renderStats(data) {
    const s = data.students || {};
    const fees = data.fees || {};
    const att = data.attendance || {};
    const staff = data.staff || {};

    const cards = [
      {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
        value: parseInt(s.total || 0).toLocaleString(),
        label: 'Total Students',
        sub: `${s.boys || 0} Boys · ${s.girls || 0} Girls`,
        color: 'var(--accent)', bg: 'var(--accent-subtle)',
      },
      {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
        value: UI.currency(fees.total_collected || 0),
        label: 'Collected This Month',
        sub: `${parseInt(fees.total_expected || 0) > 0 ? Math.round((fees.total_collected / fees.total_expected) * 100) : 0}% of target`,
        color: 'var(--green)', bg: 'var(--green-bg)',
      },
      {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 16l2 2 4-4"/></svg>`,
        value: `${att.today_total > 0 ? Math.round((att.today_present / att.today_total) * 100) : 0}%`,
        label: "Today's Attendance",
        sub: `${att.today_present || 0} / ${att.today_total || 0} present`,
        color: 'var(--cyan)', bg: 'var(--cyan-bg)',
      },
      {
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        value: parseInt(staff.total || 0).toLocaleString(),
        label: 'Staff Members',
        sub: `Active staff`,
        color: 'var(--purple)', bg: 'var(--purple-bg)',
      },
    ];

    const container = document.getElementById('dash-stats');
    if (!container) return;

    container.innerHTML = cards.map(c => `
      <div class="stat-card" style="--stat-color:${c.color};--stat-bg:${c.bg}">
        <div class="stat-icon">${c.icon}</div>
        <div class="stat-body">
          <div class="stat-value">${c.value}</div>
          <div class="stat-label">${c.label}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${c.sub}</div>
        </div>
      </div>
    `).join('');
  },

  renderRecentPayments(payments = []) {
    const el = document.getElementById('dash-recent-payments');
    if (!el) return;
    if (!payments.length) {
      el.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-desc">No recent payments</div></div>';
      return;
    }
    el.innerHTML = payments.map(p => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-subtle)">
        <div>
          <div style="font-size:13px;font-weight:600">${p.student_name}</div>
          <div style="font-size:11px;color:var(--text-muted)">${p.receipt_number} · ${UI.date(p.payment_date)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700;color:var(--green)">${UI.currency(p.amount)}</div>
          <div>${UI.paymentBadge(p.payment_method)}</div>
        </div>
      </div>
    `).join('');
  },

  renderQuickActions() {
    const el = document.getElementById('dash-quick-actions');
    if (!el) return;
    const actions = [
      { label: 'Add Student', icon: '👤', page: 'students', action: () => Router.go('students') },
      { label: 'Mark Attendance', icon: '✅', page: 'attendance', action: () => Router.go('attendance') },
      { label: 'Record Payment', icon: '💰', page: 'fees', action: () => { Router.go('fees'); setTimeout(() => Pages.Fees?.openPaymentModal?.(), 300); } },
      { label: 'Send SMS', icon: '💬', page: 'communication', action: () => Router.go('communication') },
      { label: 'Enter Marks', icon: '📝', page: 'exams', action: () => Router.go('exams') },
      { label: 'View Reports', icon: '📊', page: 'reports', action: () => Router.go('reports') },
    ];
    el.innerHTML = actions.map(a => `
      <button class="btn btn-secondary" style="flex-direction:column;gap:4px;height:70px;justify-content:center" onclick="Router.go('${a.page}')">
        <span style="font-size:20px">${a.icon}</span>
        <span style="font-size:11px">${a.label}</span>
      </button>
    `).join('');
  },

  renderCharts(charts = {}) {
    // Fee collection chart
    const feesCtx = document.getElementById('chart-fees');
    if (feesCtx && charts.feeTrend) {
      if (this.charts.fees) this.charts.fees.destroy();
      this.charts.fees = new Chart(feesCtx, {
        type: 'bar',
        data: {
          labels: charts.feeTrend.map(d => d.month),
          datasets: [{
            label: 'Collected (KES)',
            data: charts.feeTrend.map(d => parseFloat(d.collected)),
            backgroundColor: 'rgba(43,127,255,0.7)',
            borderColor: '#2b7fff',
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7b9fd4' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7b9fd4', callback: v => `${(v/1000).toFixed(0)}k` } },
          }
        }
      });
    }

    // Attendance chart
    const attCtx = document.getElementById('chart-attendance');
    if (attCtx && charts.attendanceTrend) {
      if (this.charts.attendance) this.charts.attendance.destroy();
      this.charts.attendance = new Chart(attCtx, {
        type: 'line',
        data: {
          labels: charts.attendanceTrend.map(d => new Date(d.date).toLocaleDateString('en-KE', { weekday: 'short' })),
          datasets: [
            {
              label: 'Present',
              data: charts.attendanceTrend.map(d => parseInt(d.present)),
              borderColor: '#0ecb81',
              backgroundColor: 'rgba(14,203,129,0.1)',
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Absent',
              data: charts.attendanceTrend.map(d => parseInt(d.total) - parseInt(d.present)),
              borderColor: '#f03e3e',
              backgroundColor: 'rgba(240,62,62,0.05)',
              fill: true,
              tension: 0.4,
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: '#7b9fd4', boxWidth: 12 } } },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7b9fd4' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#7b9fd4' } },
          }
        }
      });
    }
  },

  checkSubscriptionWarning() {
    const sub = AppState.subscriptionWarning;
    const el = document.getElementById('subscription-warning');
    if (!el) return;
    if (sub?.type === 'grace') {
      el.innerHTML = `
        <div class="subscription-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span><strong>Grace Period:</strong> Your subscription expired. Please renew before ${UI.date(sub.graceEnd)} to avoid service interruption.</span>
          <button class="btn btn-sm btn-warning" onclick="Router.go('settings')" style="margin-left:auto">Renew Now</button>
        </div>
      `;
    } else {
      el.innerHTML = '';
    }
  }
};

// Register route
Router.define?.('dashboard', {
  title: 'Dashboard',
  onEnter: () => Pages.Dashboard.load(),
});
