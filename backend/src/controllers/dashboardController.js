// ============================================================
// Dashboard Controller
// ============================================================
const { query } = require('../config/database');
const { cache } = require('../config/redis');

const getDashboard = async (req, res) => {
  const cacheKey = `dashboard:${req.schoolId}:${req.user.role}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const [studentsRes, staffRes, feesRes, attendanceRes] = await Promise.allSettled([
    query(`SELECT COUNT(*) FILTER (WHERE is_active=true) as total,
                  COUNT(*) FILTER (WHERE is_active=true AND gender='male') as boys,
                  COUNT(*) FILTER (WHERE is_active=true AND gender='female') as girls
           FROM students WHERE school_id=$1`, [req.schoolId]),
    query(`SELECT COUNT(*) as total FROM staff WHERE school_id=$1 AND is_active=true`, [req.schoolId]),
    query(`SELECT COALESCE(SUM(sfa.net_fees),0) as expected,
                  COALESCE((SELECT SUM(amount) FROM fee_payments fp WHERE fp.school_id=$1 AND fp.status='completed'),0) as collected
           FROM student_fee_assignments sfa JOIN students s ON sfa.student_id=s.id
           WHERE s.school_id=$1`, [req.schoolId]),
    query(`SELECT ROUND(100.0*COUNT(*) FILTER (WHERE status='present')/NULLIF(COUNT(*),0),1) as rate
           FROM attendance_records WHERE school_id=$1 AND date >= NOW()-INTERVAL '7 days'`, [req.schoolId]),
  ]);

  const dashboard = {
    students: studentsRes.status === 'fulfilled' ? studentsRes.value.rows[0] : {},
    staff: staffRes.status === 'fulfilled' ? staffRes.value.rows[0] : {},
    fees: feesRes.status === 'fulfilled' ? feesRes.value.rows[0] : {},
    attendance: attendanceRes.status === 'fulfilled' ? attendanceRes.value.rows[0] : {},
  };

  await cache.set(cacheKey, dashboard, 60);
  res.json(dashboard);
};

module.exports = { getDashboard };
