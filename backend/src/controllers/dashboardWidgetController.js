// ============================================================
// dashboardWidgetController — Custom dashboard widgets
// ============================================================
const { query } = require('../config/database');

// Default widgets per role
const DEFAULT_WIDGETS = {
  school_admin: ['stats','fee_summary','attendance_chart','top_students','recent_payments','alerts'],
  principal:    ['stats','fee_summary','attendance_chart','top_students','recent_payments','alerts'],
  teacher:      ['my_classes','attendance_today','marks_pending','announcements'],
  bursar:       ['fee_summary','recent_payments','defaulters','monthly_trend'],
  student:      ['my_grades','my_attendance','my_fees','timetable_today'],
  parent:       ['child_grades','child_attendance','fee_balance','announcements'],
};

exports.getAll = async (req, res) => {
  try {
    const role = req.user.role;
    const { rows } = await query(
      `SELECT * FROM school_settings WHERE school_id=$1 AND setting_key=$2`,
      [req.schoolId, `widgets_${req.user.id}`]);
    let widgets = rows[0]?.setting_value
      ? JSON.parse(rows[0].setting_value)
      : (DEFAULT_WIDGETS[role] || DEFAULT_WIDGETS.teacher);
    res.json({ data: widgets, defaults: DEFAULT_WIDGETS[role] || [] });
  } catch (e) {
    const role = req.user?.role || 'teacher';
    res.json({ data: DEFAULT_WIDGETS[role] || [], defaults: DEFAULT_WIDGETS[role] || [] });
  }
};

exports.getOne  = (req, res) => res.json({ widget: req.params.id });
exports.create  = async (req, res) => {
  try {
    const { widgets } = req.body;
    if (!Array.isArray(widgets)) return res.status(400).json({ error: 'widgets must be array' });
    await query(
      `INSERT INTO school_settings(school_id, setting_key, setting_value)
       VALUES($1,$2,$3) ON CONFLICT(school_id,setting_key) DO UPDATE SET setting_value=$3`,
      [req.schoolId, `widgets_${req.user.id}`, JSON.stringify(widgets)]);
    res.json({ message: 'Widget layout saved', widgets });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
exports.update = exports.create;
exports.remove = (req, res) => res.json({ message: 'Widget removed' });
