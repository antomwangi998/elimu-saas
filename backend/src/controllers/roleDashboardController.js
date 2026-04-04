// ============================================================
// Role-Based Dashboard Controller
// Each role gets tailored stats, actions, and data
// Roles: teacher, class_teacher, hod, dean_of_studies,
//        deputy_principal (academic), principal, bursar,
//        librarian, parent, student
// ============================================================
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { getCurriculumType, getKnecGrade } = require('../services/autoCommentEngine');

// ── Helper: time-limited cache ────────────────────────────────
const withCache = async (key, ttl, fn) => {
  const cached = await cache.get(key).catch(() => null);
  if (cached) return cached;
  const data = await fn();
  await cache.set(key, data, ttl).catch(() => {});
  return data;
};

// ============================================================
// TEACHER DASHBOARD
// My classes, my marks pending, my timetable summary
// ============================================================
const getTeacherDashboard = async (userId, schoolId) => {
  const [classesRes, pendingRes, recentRes] = await Promise.allSettled([
    // My assigned classes/subjects
    query(
      `SELECT DISTINCT c.id, c.name, c.level, c.stream, sub.name as subject, sub.code, sub.curriculum,
              COUNT(s.id) FILTER (WHERE s.is_active=true) as student_count
       FROM class_subjects cs
       JOIN classes c ON cs.class_id=c.id
       JOIN subjects sub ON cs.subject_id=sub.id
       LEFT JOIN students s ON s.current_class_id=c.id
       WHERE cs.teacher_id=$1 AND cs.school_id=$2 AND c.is_active=true
       GROUP BY c.id, sub.name, sub.code, sub.curriculum ORDER BY c.level, sub.name`,
      [userId, schoolId]
    ),
    // Pending marks submissions
    query(
      `SELECT ep.id, c.name as class_name, sub.name as subject_name,
              es.name as exam_name, es.end_date
       FROM exam_papers ep
       JOIN classes c ON ep.class_id=c.id
       JOIN subjects sub ON ep.subject_id=sub.id
       JOIN exam_series es ON ep.exam_series_id=es.id
       WHERE ep.teacher_id=$1 AND ep.school_id=$2 AND ep.is_submitted=false AND es.is_locked=false
       ORDER BY es.end_date ASC LIMIT 10`,
      [userId, schoolId]
    ),
    // Recent notifications
    query(
      `SELECT title, message, created_at FROM notifications
       WHERE school_id=$1 AND (user_id=$2 OR user_id IS NULL) AND is_read=false
       ORDER BY created_at DESC LIMIT 5`,
      [schoolId, userId]
    ),
  ]);

  return {
    role: 'teacher',
    myClasses: classesRes.status === 'fulfilled' ? classesRes.value.rows : [],
    pendingMarks: pendingRes.status === 'fulfilled' ? pendingRes.value.rows : [],
    notifications: recentRes.status === 'fulfilled' ? recentRes.value.rows : [],
  };
};

// ============================================================
// CLASS TEACHER DASHBOARD
// My class register, attendance, students at risk, fees
// ============================================================
const getClassTeacherDashboard = async (userId, schoolId) => {
  // Get my class
  const { rows: myClass } = await query(
    `SELECT c.*, COUNT(s.id) FILTER (WHERE s.is_active=true) as student_count
     FROM classes c LEFT JOIN students s ON s.current_class_id=c.id
     WHERE c.class_teacher_id=$1 AND c.school_id=$2 AND c.is_active=true
     GROUP BY c.id`,
    [userId, schoolId]
  );
  if (!myClass.length) return { role: 'class_teacher', myClass: null, message: 'No class assigned' };

  const classId = myClass[0].id;
  const today = new Date().toISOString().split('T')[0];

  const [attendanceRes, todayRegRes, atRiskRes, feeRes] = await Promise.allSettled([
    // Attendance rate this week
    query(
      `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status='present') / NULLIF(COUNT(*), 0), 1) as rate,
              COUNT(*) FILTER (WHERE status='absent') as absent_today
       FROM attendance_records
       WHERE class_id=$1 AND school_id=$2 AND date=$3`,
      [classId, schoolId, today]
    ),
    // Today's register status
    query(
      `SELECT is_finalized FROM class_register WHERE class_id=$1 AND date=$2 AND period='morning'`,
      [classId, today]
    ),
    // Students with >3 absences in last 2 weeks
    query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number,
              COUNT(ar.id) FILTER (WHERE ar.status='absent') as absent_count
       FROM students s
       LEFT JOIN attendance_records ar ON ar.student_id=s.id
         AND ar.date >= NOW()-INTERVAL '14 days' AND ar.school_id=s.school_id
       WHERE s.current_class_id=$1 AND s.is_active=true
       GROUP BY s.id HAVING COUNT(ar.id) FILTER (WHERE ar.status='absent') >= 3
       ORDER BY absent_count DESC LIMIT 10`,
      [classId]
    ),
    // Fee defaulters in my class
    query(
      `SELECT COUNT(DISTINCT s.id) as defaulters
       FROM students s
       JOIN student_fee_assignments sfa ON sfa.student_id=s.id
       WHERE s.current_class_id=$1 AND s.is_active=true
         AND sfa.net_fees > COALESCE(
           (SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='completed'), 0
         )`,
      [classId]
    ),
  ]);

  return {
    role: 'class_teacher',
    myClass: myClass[0],
    today,
    attendanceToday: attendanceRes.status === 'fulfilled' ? attendanceRes.value.rows[0] : {},
    registerStatus: {
      isMarked: todayRegRes.status === 'fulfilled' && todayRegRes.value.rows.length > 0,
      isFinalized: todayRegRes.value?.rows[0]?.is_finalized || false,
    },
    atRiskStudents: atRiskRes.status === 'fulfilled' ? atRiskRes.value.rows : [],
    feeDefaulters: feeRes.status === 'fulfilled' ? parseInt(feeRes.value.rows[0]?.defaulters || 0) : 0,
  };
};

// ============================================================
// HOD DASHBOARD
// Department subjects, teachers, marks status, performance
// ============================================================
const getHodDashboard = async (userId, schoolId) => {
  // Get HOD's department
  const { rows: staffRow } = await query(
    'SELECT hod_department, department FROM staff WHERE user_id=$1 AND school_id=$2 AND is_hod=true',
    [userId, schoolId]
  );
  const department = staffRow[0]?.hod_department || staffRow[0]?.department;

  const [teachersRes, subjectsRes, marksRes] = await Promise.allSettled([
    query(
      `SELECT u.first_name, u.last_name, s.staff_number,
              COUNT(cs.id) as subjects_assigned,
              COUNT(ep.id) FILTER (WHERE ep.is_submitted=false AND NOT es.is_locked) as pending_submissions
       FROM staff s
       JOIN users u ON s.user_id=u.id
       LEFT JOIN class_subjects cs ON cs.teacher_id=u.id AND cs.school_id=s.school_id
       LEFT JOIN exam_papers ep ON ep.teacher_id=u.id AND ep.school_id=s.school_id
       LEFT JOIN exam_series es ON ep.exam_series_id=es.id
       WHERE s.school_id=$1 AND s.department=$2 AND s.is_active=true
       GROUP BY u.id, s.staff_number ORDER BY u.first_name`,
      [schoolId, department]
    ),
    query(
      `SELECT sub.name, sub.code, sub.curriculum,
              COUNT(DISTINCT cs.class_id) as classes,
              AVG(sm.marks) FILTER (WHERE sm.marks IS NOT NULL) as avg_marks
       FROM subjects sub
       LEFT JOIN class_subjects cs ON cs.subject_id=sub.id AND cs.school_id=sub.school_id
       LEFT JOIN exam_papers ep ON ep.subject_id=sub.id
       LEFT JOIN student_marks sm ON sm.exam_paper_id=ep.id
       WHERE sub.school_id=$1 AND sub.category=$2
       GROUP BY sub.id ORDER BY sub.name`,
      [schoolId, department?.toLowerCase()]
    ),
    // Pending HOD approvals
    query(
      `SELECT ep.id, c.name as class_name, sub.name as subject_name,
              es.name as exam_name, u.first_name || ' ' || u.last_name as teacher_name
       FROM exam_papers ep
       JOIN classes c ON ep.class_id=c.id
       JOIN subjects sub ON ep.subject_id=sub.id
       JOIN exam_series es ON ep.exam_series_id=es.id
       LEFT JOIN users u ON ep.teacher_id=u.id
       WHERE ep.school_id=$1 AND ep.is_submitted=true AND ep.hod_approved=false
       LIMIT 20`,
      [schoolId]
    ),
  ]);

  return {
    role: 'hod',
    department,
    teachers: teachersRes.status === 'fulfilled' ? teachersRes.value.rows : [],
    subjects: subjectsRes.status === 'fulfilled' ? subjectsRes.value.rows : [],
    pendingApprovals: marksRes.status === 'fulfilled' ? marksRes.value.rows : [],
  };
};

// ============================================================
// DEAN OF STUDIES DASHBOARD
// Discipline, attendance, leave requests, counselling
// ============================================================
const getDeanDashboard = async (userId, schoolId) => {
  const today = new Date().toISOString().split('T')[0];

  const [attendanceRes, leaveRes, absentRes, trendsRes] = await Promise.allSettled([
    // School-wide attendance today
    query(
      `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status='present') / NULLIF(COUNT(*), 0), 1) as rate,
              COUNT(*) FILTER (WHERE status='absent') as absent,
              COUNT(*) FILTER (WHERE status='late') as late
       FROM attendance_records WHERE school_id=$1 AND date=$2`,
      [schoolId, today]
    ),
    // Pending leave requests
    query(
      `SELECT lr.*, s.first_name, s.last_name, c.name as class_name
       FROM leave_requests lr
       JOIN students s ON lr.student_id=s.id
       LEFT JOIN classes c ON s.current_class_id=c.id
       WHERE lr.school_id=$1 AND lr.status IN ('pending','class_teacher_approved')
       ORDER BY lr.departure_datetime ASC LIMIT 20`,
      [schoolId]
    ),
    // Chronic absentees (>5 absences this month)
    query(
      `SELECT s.first_name, s.last_name, s.admission_number, c.name as class_name,
              COUNT(ar.id) as absent_days
       FROM students s
       JOIN attendance_records ar ON ar.student_id=s.id
         AND ar.date >= DATE_TRUNC('month', NOW()) AND ar.school_id=s.school_id AND ar.status='absent'
       LEFT JOIN classes c ON s.current_class_id=c.id
       WHERE s.school_id=$1 AND s.is_active=true
       GROUP BY s.id, c.name HAVING COUNT(ar.id) >= 5
       ORDER BY absent_days DESC LIMIT 15`,
      [schoolId]
    ),
    // Attendance trend (last 7 days)
    query(
      `SELECT date, ROUND(100.0 * COUNT(*) FILTER (WHERE status='present') / NULLIF(COUNT(*), 0), 1) as rate
       FROM attendance_records WHERE school_id=$1 AND date >= NOW()-INTERVAL '7 days'
       GROUP BY date ORDER BY date`,
      [schoolId]
    ),
  ]);

  return {
    role: 'dean_of_studies',
    today,
    attendanceToday: attendanceRes.status === 'fulfilled' ? attendanceRes.value.rows[0] : {},
    pendingLeaveRequests: leaveRes.status === 'fulfilled' ? leaveRes.value.rows : [],
    chronicAbsentees: absentRes.status === 'fulfilled' ? absentRes.value.rows : [],
    attendanceTrend: trendsRes.status === 'fulfilled' ? trendsRes.value.rows : [],
  };
};

// ============================================================
// DEPUTY PRINCIPAL (ACADEMIC) DASHBOARD
// Exam results, broadsheet, subject performance, rankings
// ============================================================
const getDeputyDashboard = async (userId, schoolId) => {
  const [examsRes, classRes, approvalRes, timetableRes] = await Promise.allSettled([
    // Active exams
    query(
      `SELECT es.*, ay.year, tc.term,
              COUNT(ep.id) as total_papers,
              COUNT(ep.id) FILTER (WHERE ep.is_submitted=true) as submitted,
              COUNT(ep.id) FILTER (WHERE ep.hod_approved=true) as hod_approved,
              COUNT(ep.id) FILTER (WHERE ep.deputy_approved=true) as deputy_approved
       FROM exam_series es
       LEFT JOIN academic_years ay ON es.academic_year_id=ay.id
       LEFT JOIN terms_config tc ON es.term_id=tc.id
       LEFT JOIN exam_papers ep ON ep.exam_series_id=es.id
       WHERE es.school_id=$1 AND es.is_locked=false
       GROUP BY es.id, ay.year, tc.term ORDER BY es.created_at DESC LIMIT 5`,
      [schoolId]
    ),
    // Class performance summary (latest exam)
    query(
      `SELECT c.name as class_name, c.level,
              AVG(sm.marks) FILTER (WHERE sm.marks IS NOT NULL) as avg_marks,
              AVG(sm.points) FILTER (WHERE sm.points IS NOT NULL) as avg_points,
              COUNT(DISTINCT sm.student_id) as students_examined
       FROM classes c
       JOIN students s ON s.current_class_id=c.id
       JOIN student_marks sm ON sm.student_id=s.id
       JOIN exam_papers ep ON sm.exam_paper_id=ep.id
       WHERE c.school_id=$1 AND c.is_active=true
       GROUP BY c.id ORDER BY c.level, c.stream`,
      [schoolId]
    ),
    // Papers pending deputy approval
    query(
      `SELECT COUNT(*) as count FROM exam_papers
       WHERE school_id=$1 AND is_submitted=true AND hod_approved=true AND deputy_approved=false`,
      [schoolId]
    ),
    // Subjects with lowest mean marks (needs attention)
    query(
      `SELECT sub.name as subject_name, c.level,
              ROUND(AVG(sm.marks), 1) as mean_marks, COUNT(sm.id) as entries
       FROM student_marks sm
       JOIN exam_papers ep ON sm.exam_paper_id=ep.id
       JOIN subjects sub ON ep.subject_id=sub.id
       JOIN classes c ON ep.class_id=c.id
       WHERE sm.school_id=$1 AND sm.is_absent=false
       GROUP BY sub.id, c.level HAVING COUNT(sm.id) > 5
       ORDER BY mean_marks ASC LIMIT 10`,
      [schoolId]
    ),
  ]);

  return {
    role: 'deputy_principal',
    activeExams: examsRes.status === 'fulfilled' ? examsRes.value.rows : [],
    classPerformance: classRes.status === 'fulfilled' ? classRes.value.rows : [],
    pendingApprovals: approvalRes.status === 'fulfilled' ? parseInt(approvalRes.value.rows[0]?.count || 0) : 0,
    weakSubjects: timetableRes.status === 'fulfilled' ? timetableRes.value.rows : [],
  };
};

// ============================================================
// PRINCIPAL DASHBOARD
// Everything: overview, financials, staff, academics, sports
// ============================================================
const getPrincipalDashboard = async (userId, schoolId) => {
  const today = new Date().toISOString().split('T')[0];

  const [studentsRes, staffRes, feesRes, attendanceRes, examsRes, sportsRes, alertsRes] = await Promise.allSettled([
    query(
      `SELECT COUNT(*) FILTER (WHERE is_active=true) as total,
              COUNT(*) FILTER (WHERE is_active=true AND gender='male') as boys,
              COUNT(*) FILTER (WHERE is_active=true AND gender='female') as girls,
              COUNT(*) FILTER (WHERE is_boarding=true AND is_active=true) as boarders
       FROM students WHERE school_id=$1`,
      [schoolId]
    ),
    query(
      `SELECT COUNT(*) FILTER (WHERE s.is_active=true) as total,
              COUNT(*) FILTER (WHERE s.is_active=true AND u.role='teacher') as teachers,
              COUNT(*) FILTER (WHERE s.is_active=true AND s.is_hod=true) as hods
       FROM staff s JOIN users u ON s.user_id=u.id WHERE s.school_id=$1`,
      [schoolId]
    ),
    query(
      `SELECT COALESCE(SUM(sfa.net_fees), 0) as expected,
              COALESCE((SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.school_id=$1 AND fp.status='completed'), 0) as collected,
              COUNT(DISTINCT CASE WHEN sfa.net_fees > COALESCE(
                (SELECT SUM(fp2.amount) FROM fee_payments fp2 WHERE fp2.student_id=sfa.student_id AND fp2.status='completed'), 0
              ) THEN sfa.student_id END) as defaulters
       FROM student_fee_assignments sfa
       JOIN students s ON sfa.student_id=s.id
       WHERE s.school_id=$1 AND s.is_active=true`,
      [schoolId]
    ),
    query(
      `SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status='present') / NULLIF(COUNT(*), 0), 1) as today_rate
       FROM attendance_records WHERE school_id=$1 AND date=$2`,
      [schoolId, today]
    ),
    query(
      `SELECT es.name, COUNT(ep.id) as papers,
              COUNT(ep.id) FILTER (WHERE ep.is_submitted=true) as submitted,
              ROUND(100.0 * COUNT(ep.id) FILTER (WHERE ep.is_submitted=true) / NULLIF(COUNT(ep.id), 0), 0) as completion_pct
       FROM exam_series es LEFT JOIN exam_papers ep ON ep.exam_series_id=es.id
       WHERE es.school_id=$1 AND es.is_locked=false GROUP BY es.id ORDER BY es.created_at DESC LIMIT 3`,
      [schoolId]
    ),
    query(
      `SELECT COUNT(*) as upcoming_events FROM sports_events
       WHERE school_id=$1 AND event_date >= NOW() AND result='pending'`,
      [schoolId]
    ),
    // Important alerts: unfinalized registers, pending leave, expiring subscription
    query(
      `SELECT COUNT(*) as unfinalized_registers
       FROM classes c
       LEFT JOIN class_register cr ON cr.class_id=c.id AND cr.date=$2 AND cr.period='morning'
       WHERE c.school_id=$1 AND c.is_active=true AND (cr.id IS NULL OR cr.is_finalized=false)`,
      [schoolId, today]
    ),
  ]);

  const fees = feesRes.status === 'fulfilled' ? feesRes.value.rows[0] : {};
  const collectionRate = fees.expected > 0
    ? Math.round((parseFloat(fees.collected) / parseFloat(fees.expected)) * 100) : 0;

  return {
    role: 'principal',
    students: studentsRes.status === 'fulfilled' ? studentsRes.value.rows[0] : {},
    staff: staffRes.status === 'fulfilled' ? staffRes.value.rows[0] : {},
    fees: { ...fees, collectionRate },
    attendance: { today: attendanceRes.status === 'fulfilled' ? attendanceRes.value.rows[0]?.today_rate : 0 },
    exams: examsRes.status === 'fulfilled' ? examsRes.value.rows : [],
    sports: sportsRes.status === 'fulfilled' ? sportsRes.value.rows[0] : {},
    alerts: {
      unfinalizedRegisters: alertsRes.status === 'fulfilled' ? parseInt(alertsRes.value.rows[0]?.unfinalized_registers || 0) : 0,
    },
    today,
  };
};

// ============================================================
// BURSAR DASHBOARD
// Fee collection, defaulters, M-Pesa, daily receipts
// ============================================================
const getBursarDashboard = async (userId, schoolId) => {
  const today = new Date().toISOString().split('T')[0];

  const [todayRes, summaryRes, defaultersRes, methodRes] = await Promise.allSettled([
    query(
      `SELECT COALESCE(SUM(amount), 0) as today_collected, COUNT(*) as transactions
       FROM fee_payments WHERE school_id=$1 AND DATE(paid_at)=$2 AND status='completed'`,
      [schoolId, today]
    ),
    query(
      `SELECT COALESCE(SUM(sfa.net_fees), 0) as total_expected,
              COALESCE(SUM(fp.paid), 0) as total_paid
       FROM student_fee_assignments sfa
       JOIN students s ON sfa.student_id=s.id
       LEFT JOIN (SELECT student_id, SUM(amount) as paid FROM fee_payments
                  WHERE school_id=$1 AND status='completed' GROUP BY student_id) fp ON fp.student_id=s.id
       WHERE s.school_id=$1 AND s.is_active=true`,
      [schoolId]
    ),
    query(
      `SELECT s.first_name, s.last_name, s.admission_number, c.name as class_name,
              sfa.net_fees as expected,
              COALESCE((SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='completed'), 0) as paid
       FROM students s
       JOIN student_fee_assignments sfa ON sfa.student_id=s.id
       LEFT JOIN classes c ON s.current_class_id=c.id
       WHERE s.school_id=$1 AND s.is_active=true
         AND sfa.net_fees > COALESCE(
           (SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='completed'), 0)
       ORDER BY (sfa.net_fees - COALESCE(
         (SELECT SUM(fp.amount) FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='completed'), 0)
       ) DESC LIMIT 20`,
      [schoolId]
    ),
    query(
      `SELECT payment_method, COUNT(*) as count, SUM(amount) as total
       FROM fee_payments WHERE school_id=$1 AND status='completed'
         AND paid_at >= DATE_TRUNC('month', NOW())
       GROUP BY payment_method ORDER BY total DESC`,
      [schoolId]
    ),
  ]);

  const summary = summaryRes.status === 'fulfilled' ? summaryRes.value.rows[0] : {};
  return {
    role: 'bursar',
    today: {
      collected: todayRes.status === 'fulfilled' ? todayRes.value.rows[0] : {},
      date: today,
    },
    summary: {
      ...summary,
      balance: parseFloat(summary.total_expected || 0) - parseFloat(summary.total_paid || 0),
      collectionRate: summary.total_expected > 0
        ? Math.round((parseFloat(summary.total_paid) / parseFloat(summary.total_expected)) * 100) : 0,
    },
    topDefaulters: defaultersRes.status === 'fulfilled' ? defaultersRes.value.rows : [],
    paymentMethods: methodRes.status === 'fulfilled' ? methodRes.value.rows : [],
  };
};

// ============================================================
// MAIN DISPATCHER
// ============================================================
const getRoleDashboard = async (req, res) => {
  const { id: userId, role, schoolId: userSchoolId } = req.user;
  const schoolId = req.schoolId || userSchoolId;

  const cacheKey = `role-dashboard:${schoolId}:${userId}:${role}`;
  const cached = await cache.get(cacheKey).catch(() => null);
  if (cached) return res.json(cached);

  let data;
  try {
    switch (role) {
      case 'teacher':
        data = await getTeacherDashboard(userId, schoolId);
        break;
      case 'teacher': // class_teacher uses same as teacher but with class info
      default:
        // Check if teacher is also a class teacher
        const { rows: ctCheck } = await query(
          'SELECT id FROM classes WHERE class_teacher_id=$1 AND school_id=$2 LIMIT 1',
          [userId, schoolId]
        );
        if (ctCheck.length) {
          data = await getClassTeacherDashboard(userId, schoolId);
        } else {
          data = await getTeacherDashboard(userId, schoolId);
        }
        break;
      case 'hod':
        data = await getHodDashboard(userId, schoolId);
        break;
      case 'principal':
        data = await getPrincipalDashboard(userId, schoolId);
        break;
      case 'deputy_principal':
        data = await getDeputyDashboard(userId, schoolId);
        break;
      case 'bursar':
        data = await getBursarDashboard(userId, schoolId);
        break;
    }

    if (data) {
      await cache.set(cacheKey, data, 60).catch(() => {});
      return res.json(data);
    }
  } catch (err) {}

  // Fallback: basic dashboard for any unhandled role
  res.json({ role, message: 'Dashboard data not yet configured for this role' });
};

// ── Approve exam paper (HOD / Deputy) ────────────────────────
const approveExamPaper = async (req, res) => {
  const { paperId } = req.params;
  const { action } = req.body; // 'hod_approve' | 'deputy_approve'
  const { role } = req.user;

  if (action === 'hod_approve' && !['hod', 'deputy_principal', 'principal', 'school_admin'].includes(role)) {
    return res.status(403).json({ error: 'HOD or above required' });
  }
  if (action === 'deputy_approve' && !['deputy_principal', 'principal', 'school_admin'].includes(role)) {
    return res.status(403).json({ error: 'Deputy Principal or above required' });
  }

  const updates = action === 'hod_approve'
    ? 'hod_approved=true, hod_approved_at=NOW(), hod_approved_by=$1'
    : 'deputy_approved=true, deputy_approved_at=NOW(), deputy_approved_by=$1';

  const { rows } = await query(
    `UPDATE exam_papers SET ${updates} WHERE id=$2 AND school_id=$3 RETURNING *`,
    [req.user.id, paperId, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Exam paper not found' });
  res.json(rows[0]);
};

module.exports = { getRoleDashboard, approveExamPaper };
