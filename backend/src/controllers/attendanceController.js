// ============================================================
// Attendance Controller
// ============================================================
const { query, withTransaction } = require('../config/database');
const smsService = require('../services/smsService');
const logger = require('../config/logger');

const markAttendance = async (req, res) => {
  const { classId, date, records } = req.body;
  // records: [{studentId, status, period, subjectId}]
  if (!classId || !records?.length) return res.status(400).json({ error: 'classId and records required' });

  const attendanceDate = date || new Date().toISOString().split('T')[0];
  let saved = 0;
  const absentStudents = [];

  await withTransaction(async (client) => {
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance_records(school_id,student_id,class_id,date,status,subject_id,period,marked_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT(student_id,date,COALESCE(subject_id::text,'daily'),COALESCE(period,'daily'))
         DO UPDATE SET status=$5, marked_by=$8`,
        [req.schoolId, r.studentId, classId, attendanceDate,
         r.status || 'present', r.subjectId || null, r.period || null, req.user.id]
      );
      if (r.status === 'absent') absentStudents.push(r.studentId);
      saved++;
    }
  });

  // Notify parents of absent students
  if (absentStudents.length > 0) {
    try {
      const { rows: parents } = await query(
        `SELECT sp.phone, s.first_name||' '||s.last_name as student_name, c.name as class_name
         FROM student_parents sp
         JOIN students s ON sp.student_id=s.id
         JOIN classes c ON s.current_class_id=c.id
         WHERE s.id=ANY($1) AND sp.is_primary=true AND sp.phone IS NOT NULL`,
        [absentStudents]
      );
      for (const p of parents) {
        await smsService.sendSms({
          to: p.phone,
          message: `Dear Parent, ${p.student_name} of ${p.class_name} was marked ABSENT on ${attendanceDate}. Please contact the school for clarification. - ElimuSaaS`,
        }).catch(() => {});
      }
    } catch (err) { logger.warn('Attendance SMS error:', err.message); }
  }

  res.json({ message: `${saved} attendance records saved`, absentNotified: absentStudents.length });
};

const getClassAttendance = async (req, res) => {
  const { classId, date, startDate, endDate } = req.query;
  const start = startDate || date || new Date().toISOString().split('T')[0];
  const end = endDate || start;

  const { rows } = await query(
    `SELECT ar.date::text, ar.status, ar.period,
            s.id as student_id, s.first_name||' '||s.last_name as name,
            s.admission_number
     FROM attendance_records ar
     JOIN students s ON ar.student_id=s.id
     WHERE ar.school_id=$1 AND ar.class_id=$2
     AND ar.date BETWEEN $3 AND $4
     ORDER BY ar.date, s.first_name`,
    [req.schoolId, classId, start, end]
  );
  res.json(rows);
};

const getAttendanceSummary = async (req, res) => {
  const { classId, month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  const { rows } = await query(
    `SELECT s.id, s.admission_number, s.first_name||' '||s.last_name as name,
             COUNT(*) as total_days,
             COUNT(*) FILTER (WHERE ar.status='present') as present,
             COUNT(*) FILTER (WHERE ar.status='absent') as absent,
             COUNT(*) FILTER (WHERE ar.status='late') as late,
             ROUND(COUNT(*) FILTER (WHERE ar.status='present')*100.0/NULLIF(COUNT(*),0),1) as attendance_rate
     FROM students s
     LEFT JOIN attendance_records ar ON ar.student_id=s.id AND ar.school_id=s.school_id
       AND EXTRACT(MONTH FROM ar.date)=$3 AND EXTRACT(YEAR FROM ar.date)=$4
     WHERE s.school_id=$1 ${classId ? 'AND s.current_class_id=$2' : ''}
     AND s.is_active=true
     GROUP BY s.id,s.admission_number,s.first_name,s.last_name
     ORDER BY attendance_rate`,
    classId ? [req.schoolId, classId, m, y] : [req.schoolId, null, m, y]
  );
  res.json(rows);
};

module.exports = { markAttendance, getClassAttendance, getAttendanceSummary };
