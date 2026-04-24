// ============================================================
// ElimuSaaS -- Route Registration & Bootstrap
// Loaded LAST after all page scripts
// ============================================================

// All routes map  →  { title, Pages.X.load() }
var Pages = window.Pages = window.Pages || {};
var Router = window.Router;
const _routeMap = {
  'landing':              { title: 'ElimuSaaS — School Management', fn: () => {} },
  'dashboard':               { title: 'Dashboard',              fn: () => Pages.Dashboard?.load() },
  'students':                { title: 'Students',               fn: () => Pages.Students?.load() },
  'staff':                   { title: 'Staff',                  fn: () => Pages.Staff?.load() },
  'academics':               { title: 'Classes & Subjects',     fn: () => Pages.Academics?.load() },
  'exams':                   { title: 'Exams & Marks',          fn: () => Pages.Exams?.load() },
  'fees':                    { title: 'Fee Management',         fn: () => Pages.Fees?.load() },
  'attendance':              { title: 'Attendance',             fn: () => Pages.Attendance?.load() },
  'clubs':                   { title: 'Clubs & Societies',      fn: () => Pages.Clubs?.load() },
  'leaveout':                { title: 'Leave-Out Sheets',       fn: () => Pages.LeaveOut?.load() },
  'certificates':            { title: 'Certificates',           fn: () => Pages.Certificates?.load() },
  'communication':           { title: 'Communication',          fn: () => Pages.Communication?.load() },
  'newsletters':             { title: 'Newsletters',            fn: () => Pages.Newsletters?.load() },
  'reports':                 { title: 'Reports & Analytics',    fn: () => Pages.Reports?.load() },
  'alumni':                  { title: 'Alumni Network',         fn: () => Pages.Alumni?.load() },
  'settings':                { title: 'Settings',               fn: () => Pages.Settings?.load() },
  'timetable':               { title: 'Timetable',              fn: () => Pages.Timetable?.load() },
  'billing':                 { title: 'Billing & Invoices',     fn: () => Pages.Billing?.load() },
  'tsc-verification':        { title: 'TSC Verification',       fn: () => Pages.TSCVerif?.load() },
  'ai-insights':             { title: 'AI Insights',            fn: () => Pages.AIInsights?.load() },
  'gamification':            { title: 'Leaderboard',            fn: () => Pages.Gamification?.load() },
  'threads':                 { title: 'Messages',               fn: () => Pages.Threads?.load() },
  'parent-portal':           { title: 'My Children',            fn: () => Pages.ParentPortal?.load() },
  'online-exams':            { title: 'Online Exams',           fn: () => Pages.OnlineExams?.load() },
  'school-profile':          { title: 'School Profile',         fn: () => Pages.SchoolProfile?.load() },
  'search-results':          { title: 'Search Results',         fn: () => Pages.SearchResults?.load() },
  // New advanced pages
  'storekeeper':             { title: 'Inventory Management',   fn: () => Pages.Storekeeper?.load() },
  'cbc':                     { title: 'CBC Assessment',         fn: () => Pages.CBC?.load() },
  'templates':               { title: 'Document Templates',     fn: () => Pages.Templates?.load() },
  'broadsheet':              { title: 'Broadsheets',            fn: () => Pages.Broadsheet?.load() },
  'syllabus':                { title: 'Scheme of Work',         fn: () => Pages.Syllabus?.load() },
  'discipline':              { title: 'Discipline',             fn: () => Pages.Discipline?.load() },
  'fee-clearance':           { title: 'Fee Clearance Sheets',   fn: () => Pages.FeeClearance?.load() },
  'report-cards':            { title: 'Report Cards',           fn: () => Pages.ReportCards?.load() },
  // SuperAdmin sub-pages
  'superadmin-dashboard':    { title: 'Platform Dashboard',     fn: () => Pages.SuperAdmin?.load() },
  'superadmin-schools':      { title: 'All Schools',            fn: () => Pages.SuperAdmin?.loadSchools() },
  'superadmin-subscriptions':{ title: 'Subscriptions',          fn: () => {
    const el = document.getElementById('sa-subscriptions-content');
    if (el) el.innerHTML = '<div id="sa-sub-list" style="padding:20px">Loading…</div>';
    Pages.SuperAdmin?.loadSubscriptions?.();
  }},
  'superadmin-analytics':    { title: 'Platform Analytics',     fn: () => {
    const el = document.getElementById('sa-analytics-content');
    if (el) el.innerHTML = '<div id="sa-analytics-data" style="padding:20px">Loading…</div>';
    Pages.SuperAdmin?.loadAnalytics?.();
  }},
  'class-register':          { title: 'Class Register',         fn: () => Pages.ClassRegister?.load() },
  // ── Extended / Beyond-Zeraki pages ───────────────────────
  'analytics':               { title: 'School Analytics',        fn: () => Pages.Analytics?.load() },
  'learning':                { title: 'Learning Management',      fn: () => Pages.Learning?.load() },
  'hostel':                  { title: 'Hostel Management',        fn: () => Pages.Hostel?.load() },
  'transport':               { title: 'Transport Management',     fn: () => Pages.Transport?.load() },
  'canteen':                 { title: 'Canteen',                  fn: () => Pages.Canteen?.load() },
  'health':                  { title: 'Health & Clinic',          fn: () => Pages.HealthClinic?.load() },
  'visitors':                { title: 'Visitor Management',       fn: () => Pages.Visitors?.load() },
  'assets':                  { title: 'Asset Management',         fn: () => Pages.Assets?.load() },
  'ai-engine':               { title: 'AI Predictions',           fn: () => Pages.AIEngine?.load() },
  'wellness':                { title: 'Student Wellness',         fn: () => Pages.Wellness?.load() },
  'career':                  { title: 'Career Guidance',          fn: () => Pages.Career?.load() },
  'portfolio':               { title: 'Student Portfolios',       fn: () => Pages.Portfolio?.load() },
  'tutoring':                { title: 'Tutoring & Remedial',      fn: () => Pages.Tutoring?.load() },
  'polls':                   { title: 'Polls & Surveys',          fn: () => Pages.Polls?.load() },
  'branding':                { title: 'School Branding',          fn: () => Pages.Branding?.load() },
  'notice-board':            { title: 'Notice Board',             fn: () => Pages.NoticeBoard?.load() },
  'bursary':                 { title: 'Bursary & Scholarships',   fn: () => Pages.Bursary?.load() },
  'behaviour':               { title: 'Behaviour & Rewards',      fn: () => Pages.Behaviour?.load() },
  'bulk-export':             { title: 'Bulk Export',             fn: () => Pages.BulkExport?.load() },
  'online-admissions':       { title: 'Online Admissions',       fn: () => {} },
  'whatsapp':                { title: 'WhatsApp',                fn: () => Pages.Whatsapp?.load() },
  'fcm':                     { title: 'Push Notifications',      fn: () => Pages.Fcm?.load() },
  'messaging-channels':      { title: 'Messaging Channels',      fn: () => Pages.MessagingChannels?.load() },
  'lab':                     { title: 'Lab Inventory',           fn: () => Pages.Lab?.load() },
  'clubs-subsystem':         { title: 'Clubs Admin',             fn: () => Pages.ClubsSubsystem?.load() },
  'login':                   { title: 'Login',                  fn: () => {} },
};

// Register all routes
Object.entries(_routeMap).forEach(([name, cfg]) => {
  if (!Router.routes[name]) {
    Router.define(name, { title: cfg.title, onEnter: cfg.fn });
  }
});

// ── Enter key on login ────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const appShell = document.getElementById('app-shell');
  if (appShell && !appShell.classList.contains('hidden')) return;
  const active = document.activeElement?.id;
  if (['login-email','login-password','login-school-code'].includes(active)) {
    window.handleLogin?.();
  }
});

// ── Global error handler ──────────────────────────────────────
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  if (e.reason?.message !== 'Failed to fetch') {
    Toast?.error?.('An unexpected error occurred');
  }
});

// ── PWA Service Worker ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

console.log('✅ ElimuSaaS -- All routes registered. Pages ready.');
