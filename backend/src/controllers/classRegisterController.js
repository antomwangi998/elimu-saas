// ============================================================
// Class Register Controller
// Morning/afternoon register by class teachers
// Real-time attendance, absentee alerts, parent notifications
// ============================================================
const { query, withTransaction } = require('../config/database');
const smsService = require('../services/smsService');
const logger = require('../config/logger');

// ── GET /api/register/classes — class teacher's classes ───────
const getMyClasses = async (req, res) => {
  const { rows } = await query(
    `SELECT c.*, COUNT(s.id) FILTER (WHERE s.is_active=true) as student_count
     FROM classes c
     LEFT JOIN students s ON s.current_class_id=c.id AND s.school_id=c.school_id
     WHERE c.school_id=$1 AND c.class_teacher_id=$2 AND c.is_active=true
     GROUP BY c.id ORDER BY c.level, c.stream`,
    [req.schoolId, req.user.id]
  );
  res.json(rows);
};

// ── GET /api/register/:classId/students — class list for register
const getClassStudents = async (req, res) => {
  const { classId } = req.params;
  const { date } = req.query;
  const today = date || new Date().toISOString().split('T')[0];

  // Get students
  const { rows: students } = await query(
    `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
            s.photo_url, s.is_boarding,
            ar.status as today_status, ar.id as attendance_id,
            ar.remarks as today_remarks
     FROM students s
     LEFT JOIN attendance_records ar ON ar.student_id=s.id
       AND ar.date=$1 AND ar.school_id=$2 AND ar.session='morning'
     WHERE s.current_class_id=$3 AND s.is_active=true
     ORDER BY s.first_name, s.last_name`,
    [today, req.schoolId, classId]
  );

  // Check if register is already finalized for today
  const { rows: registerRows } = await query(
    `SELECT * FROM class_register WHERE class_id=$1 AND date=$2 AND period='morning'`,
    [classId, today]
  );

  res.json({
    students,
    date: today,
    register: registerRows[0] || null,
    isMarked: registerRows.length > 0,
    isFinalized: registerRows[0]?.is_finalized || false,
  });
};

// ── POST /api/register/:classId/mark — mark attendance ────────
const markRegister = async (req, res) => {
  const { classId } = req.params;
  const { date, period = 'morning', attendance, remarks } = req.body;
  // attendance: [{studentId, status, remarks}]
  // status: 'present' | 'absent' | 'late' | 'excused' | 'sick'

  if (!attendance?.length) return res.status(400).json({ error: 'attendance array required' });

  const today = date || new Date().toISOString().split('T')[0];

  // Verify class teacher has this class
  const { rows: classRows } = await query(
    'SELECT id, name FROM classes WHERE id=$1 AND school_id=$2 AND class_teacher_id=$3',
    [classId, req.schoolId, req.user.id]
  );
  if (!classRows.length && req.user.role !== 'school_admin' && req.user.role !== 'principal') {
    return res.status(403).json({ error: 'You are not the class teacher for this class' });
  }

  // Check if already finalized
  const { rows: existing } = await query(
    'SELECT is_finalized FROM class_register WHERE class_id=$1 AND date=$2 AND period=$3',
    [classId, today, period]
  );
  if (existing[0]?.is_finalized) {
    return res.status(400).json({ error: 'Register has been finalized and cannot be modified' });
  }

  let markedCount = 0;
  const absentees = [];

  await withTransaction(async (client) => {
    // Create/update register
    const { rows: regRows } = await client.query(
      `INSERT INTO class_register(school_id, class_id, date, period, marked_by, remarks)
       VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(class_id, date, period) DO UPDATE SET marked_by=$5, remarks=$6, marked_at=NOW()
       RETURNING id`,
      [req.schoolId, classId, today, period, req.user.id, remarks]
    );
    const registerId = regRows[0].id;

    for (const entry of attendance) {
      await client.query(
        `INSERT INTO attendance_records(school_id, student_id, class_id, date, status, session, marked_by, remarks, register_id)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(student_id, date, COALESCE(subject_id::text,'daily'), COALESCE(period,'daily'))
         DO UPDATE SET status=$5, session=$6, marked_by=$7, remarks=$8, register_id=$9`,
        [req.schoolId, entry.studentId, classId, today, entry.status, period, req.user.id, entry.remarks || null, registerId]
      );
      markedCount++;

      if (entry.status === 'absent') {
        absentees.push(entry.studentId);
      }
    }
  });

  // Send SMS to parents of absent students
  if (absentees.length > 0) {
    notifyAbsentParents(absentees, today, classRows[0]?.name || 'your child\'s class', req.schoolId)
      .catch(err => logger.error('Absent SMS error:', err));
  }

  res.json({
    message: `Register marked for ${markedCount} students`,
    date: today, period, absentees: absentees.length,
  });
};

// ── POST /api/register/:classId/finalize ──────────────────────
const finalizeRegister = async (req, res) => {
  const { classId } = req.params;
  const { date, period = 'morning' } = req.body;
  const today = date || new Date().toISOString().split('T')[0];

  const { rows } = await query(
    `UPDATE class_register SET is_finalized=true
     WHERE class_id=$1 AND date=$2 AND period=$3 AND school_id=$4
     RETURNING *`,
    [classId, today, period, req.schoolId]
  );
  if (!rows.length) return res.status(404).json({ error: 'Register not found. Mark attendance first.' });
  res.json({ message: 'Register finalized', register: rows[0] });
};

// ── GET /api/register/:classId/history ────────────────────────
const getRegisterHistory = async (req, res) => {
  const { classId } = req.params;
  const { from, to, studentId } = req.query;

  const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const toDate = to || new Date().toISOString().split('T')[0];

  const { rows } = await query(
    `SELECT ar.date, ar.student_id, ar.status, ar.session, ar.remarks,
            s.first_name, s.last_name, s.admission_number,
            cr.is_finalized
     FROM attendance_records ar
     JOIN students s ON ar.student_id=s.id
     LEFT JOIN class_register cr ON ar.register_id=cr.id
     WHERE ar.class_id=$1 AND ar.school_id=$2
       AND ar.date BETWEEN $3 AND $4
       ${studentId ? 'AND ar.student_id=$5' : ''}
     ORDER BY ar.date DESC, s.first_name`,
    [classId, req.schoolId, fromDate, toDate, ...(studentId ? [studentId] : [])]
  );

  // Summary per student
  const studentSummary = {};
  for (const row of rows) {
    if (!studentSummary[row.student_id]) {
      studentSummary[row.student_id] = {
        studentId: row.student_id,
        name: `${row.first_name} ${row.last_name}`,
        admissionNumber: row.admission_number,
        present: 0, absent: 0, late: 0, excused: 0, total: 0,
      };
    }
    studentSummary[row.student_id].total++;
    studentSummary[row.student_id][row.status] = (studentSummary[row.student_id][row.status] || 0) + 1;
  }

  const summaries = Object.values(studentSummary).map(s => ({
    ...s,
    attendanceRate: s.total ? Math.round((s.present / s.total) * 100) : 0,
  }));

  res.json({ records: rows, summary: summaries, from: fromDate, to: toDate });
};

// ── GET /api/register/daily-summary — school-wide daily ───────
const getDailySummary = async (req, res) => {
  const { date } = req.query;
  const today = date || new Date().toISOString().split('T')[0];

  const { rows } = await query(
    `SELECT c.name as class_name, c.level, c.stream,
            COUNT(s.id) as total_students,
            COUNT(ar.id) FILTER (WHERE ar.status='present') as present,
            COUNT(ar.id) FILTER (WHERE ar.status='absent') as absent,
            COUNT(ar.id) FILTER (WHERE ar.status='late') as late,
            cr.is_finalized,
            u.first_name || ' ' || u.last_name as class_teacher_name
     FROM classes c
     LEFT JOIN students s ON s.current_class_id=c.id AND s.is_active=true
     LEFT JOIN attendance_records ar ON ar.student_id=s.id AND ar.date=$1 AND ar.session='morning'
     LEFT JOIN class_register cr ON cr.class_id=c.id AND cr.date=$1 AND cr.period='morning'
     LEFT JOIN users u ON c.class_teacher_id=u.id
     WHERE c.school_id=$2 AND c.is_active=true
     GROUP BY c.id, cr.is_finalized, u.first_name, u.last_name
     ORDER BY c.level, c.stream`,
    [today, req.schoolId]
  );

  const totalStudents = rows.reduce((s, r) => s + parseInt(r.total_students), 0);
  const totalPresent = rows.reduce((s, r) => s + parseInt(r.present), 0);
  const notMarked = rows.filter(r => !r.is_finalized).map(r => r.class_name);

  res.json({
    date: today,
    classes: rows,
    schoolSummary: {
      totalStudents, totalPresent,
      totalAbsent: totalStudents - totalPresent,
      attendanceRate: totalStudents ? Math.round((totalPresent / totalStudents) * 100) : 0,
      classesNotMarked: notMarked,
    },
  });
};

// ── GET /api/register/absentees — today's absentees ───────────
const getTodayAbsentees = async (req, res) => {
  const { date, classId } = req.query;
  const today = date || new Date().toISOString().split('T')[0];

  const { rows } = await query(
    `SELECT s.id, s.admission_number, s.first_name, s.last_name,
            s.is_boarding, c.name as class_name,
            sp.phone as parent_phone, sp.first_name as parent_name,
            ar.remarks, ar.parent_notified
     FROM attendance_records ar
     JOIN students s ON ar.student_id=s.id
     JOIN classes c ON ar.class_id=c.id
     LEFT JOIN student_parents sp ON sp.student_id=s.id AND sp.is_primary=true
     WHERE ar.school_id=$1 AND ar.date=$2 AND ar.status='absent'
       ${classId ? 'AND ar.class_id=$3' : ''}
     ORDER BY c.level, s.first_name`,
    [req.schoolId, today, ...(classId ? [classId] : [])]
  );

  res.json(rows);
};

// ── Helper: Notify parents of absent students ─────────────────
const notifyAbsentParents = async (studentIds, date, className, schoolId) => {
  for (const studentId of studentIds) {
    const { rows } = await query(
      `SELECT sp.phone, s.first_name, s.last_name, sch.name as school_name
       FROM student_parents sp
       JOIN students s ON sp.student_id=s.id
       JOIN schools sch ON s.school_id=sch.id
       WHERE sp.student_id=$1 AND sp.is_primary=true AND sp.phone IS NOT NULL`,
      [studentId]
    );
    if (rows.length) {
      const { phone, first_name, last_name, school_name } = rows[0];
      const message = `Dear Parent, ${first_name} ${last_name} was ABSENT from ${className} on ${date}. Please contact ${school_name} if you need to report a reason. Thank you.`;
      await smsService.send(phone, message).catch(() => {});
      await query(
        'UPDATE attendance_records SET parent_notified=true, notification_sent_at=NOW() WHERE student_id=$1 AND date=$2',
        [studentId, date]
      );
    }
  }
};

module.exports = {
  getMyClasses, getClassStudents, markRegister,
  finalizeRegister, getRegisterHistory, getDailySummary, getTodayAbsentees,
};
