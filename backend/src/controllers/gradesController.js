// ============================================================
// Grades Controller — Grades, Report Cards / Transcripts
// ============================================================
const { query, withTransaction } = require('../config/database');
const { cache } = require('../config/redis');

// ── GET /api/grades/scales ────────────────────────────────────
const getGradingScales = async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM grading_scales WHERE school_id=$1 ORDER BY min_marks DESC',
    [req.schoolId]
  );
  res.json(rows);
};

// ── PUT /api/grades/scales ────────────────────────────────────
const upsertGradingScales = async (req, res) => {
  const { scales } = req.body; // [{grade, minMarks, maxMarks, points, remarks}]
  if (!Array.isArray(scales)) return res.status(400).json({ error: 'scales array required' });

  await withTransaction(async (client) => {
    await client.query('DELETE FROM grading_scales WHERE school_id=$1', [req.schoolId]);
    for (const s of scales) {
      await client.query(
        `INSERT INTO grading_scales(school_id, grade, min_marks, max_marks, points, remarks)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [req.schoolId, s.grade, s.minMarks, s.maxMarks, s.points, s.remarks]
      );
    }
  });
  res.json({ message: 'Grading scales updated' });
};

// ── GET /api/grades/student/:studentId ───────────────────────
const getStudentGrades = async (req, res) => {
  const { examSeriesId, academicYearId } = req.query;

  let sql = `
    SELECT sm.marks, sm.grade, sm.points, sm.is_absent,
           sub.name as subject, sub.code,
           es.name as exam_name, es.type as exam_type,
           tc.term, ay.year,
           ep.max_marks
    FROM student_marks sm
    JOIN exam_papers ep ON sm.exam_paper_id = ep.id
    JOIN exam_series es ON ep.exam_series_id = es.id
    JOIN subjects sub ON ep.subject_id = sub.id
    LEFT JOIN terms_config tc ON es.term_id = tc.id
    LEFT JOIN academic_years ay ON es.academic_year_id = ay.id
    WHERE sm.student_id=$1 AND sm.school_id=$2
  `;
  const params = [req.params.studentId, req.schoolId];
  let i = 3;

  if (examSeriesId) { sql += ` AND es.id=$${i++}`; params.push(examSeriesId); }
  if (academicYearId) { sql += ` AND ay.id=$${i++}`; params.push(academicYearId); }
  sql += ' ORDER BY ay.year DESC, tc.term, sub.name';

  const { rows } = await query(sql, params);
  res.json(rows);
};

// ── GET /api/grades/report-card/:studentId ────────────────────
const getReportCard = async (req, res) => {
  const { examSeriesId } = req.query;
  if (!examSeriesId) return res.status(400).json({ error: 'examSeriesId is required' });

  // Student info
  const { rows: studentRows } = await query(
    `SELECT s.*,
            c.name as class_name, c.level, c.stream,
            u.first_name || ' ' || u.last_name as class_teacher_name,
            ay.year, tc.term,
            sch.name as school_name, sch.logo_url, sch.address, sch.phone as school_phone,
            sch.motto
     FROM students s
     LEFT JOIN classes c ON s.current_class_id = c.id
     LEFT JOIN users u ON c.class_teacher_id = u.id
     CROSS JOIN exam_series es
     LEFT JOIN academic_years ay ON es.academic_year_id = ay.id
     LEFT JOIN terms_config tc ON es.term_id = tc.id
     JOIN schools sch ON sch.id = s.school_id
     WHERE s.id=$1 AND s.school_id=$2 AND es.id=$3`,
    [req.params.studentId, req.schoolId, examSeriesId]
  );
  if (!studentRows.length) return res.status(404).json({ error: 'Student not found' });
  const student = studentRows[0];

  // Subject marks
  const { rows: marks } = await query(
    `SELECT sub.name as subject, sub.code, sub.category,
            sm.marks, sm.grade, sm.points, sm.is_absent, sm.remarks,
            ep.max_marks
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id = ep.id
     JOIN subjects sub ON ep.subject_id = sub.id
     WHERE sm.student_id=$1 AND ep.exam_series_id=$2 AND sm.school_id=$3
     ORDER BY sub.category, sub.name`,
    [req.params.studentId, examSeriesId, req.schoolId]
  );

  // Compute totals
  const totalMarks = marks.reduce((s, m) => s + (m.is_absent ? 0 : parseFloat(m.marks || 0)), 0);
  const totalPoints = marks.reduce((s, m) => s + (m.is_absent ? 0 : parseFloat(m.points || 0)), 0);
  const subjectCount = marks.filter(m => !m.is_absent && m.marks !== null).length;
  const meanMarks = subjectCount ? (totalMarks / subjectCount).toFixed(1) : 0;
  const meanPoints = subjectCount ? (totalPoints / subjectCount).toFixed(2) : 0;

  // Get mean grade from scale
  const { rows: scaleRows } = await query(
    'SELECT grade, remarks FROM grading_scales WHERE school_id=$1 AND $2 >= min_marks AND $2 <= max_marks LIMIT 1',
    [req.schoolId, meanMarks]
  );
  const meanGrade = scaleRows[0] || { grade: '-', remarks: '' };

  // Class rank
  const { rows: rankRows } = await query(
    `SELECT student_id, AVG(sm.marks) as avg_marks
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id=ep.id
     WHERE ep.exam_series_id=$1 AND ep.class_id=$2 AND sm.school_id=$3 AND sm.is_absent=false
     GROUP BY student_id
     ORDER BY avg_marks DESC`,
    [examSeriesId, student.current_class_id, req.schoolId]
  );
  const rank = rankRows.findIndex(r => r.student_id === req.params.studentId) + 1;

  // Attendance summary
  const { rows: attRows } = await query(
    `SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status='present') as present,
            COUNT(*) FILTER (WHERE status='absent') as absent
     FROM attendance_records
     WHERE student_id=$1 AND school_id=$2`,
    [req.params.studentId, req.schoolId]
  );

  res.json({
    school: {
      name: student.school_name,
      logo: student.logo_url,
      address: student.address,
      phone: student.school_phone,
      motto: student.motto,
    },
    student: {
      id: student.id,
      admissionNumber: student.admission_number,
      name: `${student.first_name} ${student.last_name}`,
      gender: student.gender,
      dateOfBirth: student.date_of_birth,
      className: student.class_name,
      stream: student.stream,
      classTeacher: student.class_teacher_name,
    },
    exam: {
      name: student.exam_name,
      year: student.year,
      term: student.term,
    },
    subjects: marks,
    summary: {
      totalMarks,
      meanMarks,
      totalPoints,
      meanPoints,
      meanGrade: meanGrade.grade,
      meanRemarks: meanGrade.remarks,
      classRank: rank,
      classSize: rankRows.length,
      subjectCount,
    },
    attendance: attRows[0],
  });
};

// ── GET /api/grades/class-report ──────────────────────────────
const getClassReport = async (req, res) => {
  const { examSeriesId, classId } = req.query;
  if (!examSeriesId || !classId) {
    return res.status(400).json({ error: 'examSeriesId and classId are required' });
  }

  const { rows } = await query(
    `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
            sub.code as subject_code,
            sm.marks, sm.grade, sm.points, sm.is_absent
     FROM students s
     JOIN student_marks sm ON sm.student_id = s.id
     JOIN exam_papers ep ON sm.exam_paper_id = ep.id
     JOIN subjects sub ON ep.subject_id = sub.id
     WHERE ep.exam_series_id=$1 AND ep.class_id=$2 AND s.school_id=$3
     ORDER BY s.first_name, sub.name`,
    [examSeriesId, classId, req.schoolId]
  );

  // Pivot marks by student
  const students = {};
  const subjectCodes = new Set();

  for (const row of rows) {
    subjectCodes.add(row.subject_code);
    if (!students[row.id]) {
      students[row.id] = {
        admissionNumber: row.admission_number,
        name: `${row.first_name} ${row.last_name}`,
        gender: row.gender,
        subjects: {},
        totalMarks: 0,
        subjectCount: 0,
      };
    }
    students[row.id].subjects[row.subject_code] = {
      marks: row.marks, grade: row.grade, points: row.points, absent: row.is_absent,
    };
    if (!row.is_absent && row.marks !== null) {
      students[row.id].totalMarks += parseFloat(row.marks);
      students[row.id].subjectCount++;
    }
  }

  const result = Object.values(students)
    .map(s => ({ ...s, average: s.subjectCount ? (s.totalMarks / s.subjectCount).toFixed(1) : 0 }))
    .sort((a, b) => b.average - a.average)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  res.json({ subjects: [...subjectCodes], students: result });
};

module.exports = {
  getGradingScales, upsertGradingScales, getStudentGrades, getReportCard, getClassReport,
};
