// ============================================================
// Academics Controller — Classes, Subjects, Marks, Broadsheet
// ============================================================
const { query, withTransaction, paginatedQuery } = require('../config/database');
const { cache } = require('../config/redis');

// ── Classes ───────────────────────────────────────────────────
const getClasses = async (req, res) => {
  const schoolId = req.schoolId;
  const { academicYear, includeInactive } = req.query;

  let sql = `
    SELECT c.*, u.first_name || ' ' || u.last_name as class_teacher_name,
           COUNT(s.id) FILTER (WHERE s.is_active = true) as student_count
    FROM classes c
    LEFT JOIN users u ON c.class_teacher_id = u.id
    LEFT JOIN students s ON s.current_class_id = c.id AND s.school_id = c.school_id
    WHERE c.school_id = $1
  `;
  const params = [schoolId];

  if (!includeInactive) { sql += ' AND c.is_active = true'; }
  sql += ' GROUP BY c.id, u.first_name, u.last_name ORDER BY c.level, c.stream';

  const { rows } = await query(sql, params);
  res.json(rows);
};

const createClass = async (req, res) => {
  const schoolId = req.schoolId;
  const { name, level, stream, classTeacherId, capacity } = req.body;

  const { rows } = await query(
    `INSERT INTO classes(school_id, name, level, stream, class_teacher_id, capacity, label)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [schoolId, name, level, stream, classTeacherId, capacity || 40,
     `Form ${level}${stream ? ' ' + stream : ''}`]
  );
  res.status(201).json(rows[0]);
};

const updateClass = async (req, res) => {
  const { id } = req.params;
  const schoolId = req.schoolId;
  const { name, level, stream, classTeacherId, capacity, isActive } = req.body;

  const { rows } = await query(
    `UPDATE classes SET name=$1, level=$2, stream=$3, class_teacher_id=$4,
     capacity=$5, is_active=$6 WHERE id=$7 AND school_id=$8 RETURNING *`,
    [name, level, stream, classTeacherId, capacity, isActive, id, schoolId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Class not found' });
  res.json(rows[0]);
};

// ── Subjects ──────────────────────────────────────────────────
const getSubjects = async (req, res) => {
  const { rows } = await query(
    'SELECT * FROM subjects WHERE school_id=$1 ORDER BY name',
    [req.schoolId]
  );
  res.json(rows);
};

const createSubject = async (req, res) => {
  const { name, code, category, isCompulsory, knecCode } = req.body;
  const { rows } = await query(
    `INSERT INTO subjects(school_id, name, code, category, is_compulsory, knec_code)
     VALUES($1,$2,UPPER($3),$4,$5,$6) RETURNING *`,
    [req.schoolId, name, code, category || 'core', isCompulsory !== false, knecCode]
  );
  res.status(201).json(rows[0]);
};

// ── Exam Series ───────────────────────────────────────────────
const getExamSeries = async (req, res) => {
  const { academicYearId, termId, classId } = req.query;
  let sql = `
    SELECT e.*,
           ay.year as academic_year_label,
           t.term as term_label,
           u.first_name || ' ' || u.last_name as created_by_name,
           (SELECT COUNT(*) FROM exam_papers ep WHERE ep.exam_series_id = e.id) as papers_count,
           (SELECT COUNT(*) FROM exam_papers ep WHERE ep.exam_series_id=e.id AND ep.is_submitted=true) as submitted_count
    FROM exam_series e
    LEFT JOIN academic_years ay ON e.academic_year_id = ay.id
    LEFT JOIN terms_config t ON e.term_id = t.id
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.school_id = $1
  `;
  const params = [req.schoolId];
  let i = 2;
  if (academicYearId) { sql += ` AND e.academic_year_id = $${i++}`; params.push(academicYearId); }
  if (termId) { sql += ` AND e.term_id = $${i++}`; params.push(termId); }
  sql += ' ORDER BY e.created_at DESC';

  const { rows } = await query(sql, params);
  res.json(rows);
};

const createExamSeries = async (req, res) => {
  const { name, type, academicYearId, termId, classes, startDate, endDate, maxMarks } = req.body;
  const { rows } = await query(
    `INSERT INTO exam_series(school_id, name, type, academic_year_id, term_id, classes, start_date, end_date, max_marks, created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.schoolId, name, type, academicYearId, termId, classes || [], startDate, endDate, maxMarks || 100, req.user.id]
  );

  // Auto-create exam papers for each class-subject combination
  const series = rows[0];
  if (classes && classes.length > 0) {
    for (const classId of classes) {
      const { rows: subjects } = await query(
        'SELECT subject_id, teacher_id FROM class_subjects WHERE class_id=$1 AND school_id=$2',
        [classId, req.schoolId]
      );
      for (const cs of subjects) {
        await query(
          `INSERT INTO exam_papers(exam_series_id, school_id, class_id, subject_id, teacher_id, max_marks)
           VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
          [series.id, req.schoolId, classId, cs.subject_id, cs.teacher_id, maxMarks || 100]
        ).catch(() => {});
      }
    }
  }

  res.status(201).json(series);
};

// ── Mark Entry ────────────────────────────────────────────────
const getExamPaper = async (req, res) => {
  const { id } = req.params;
  const { rows: paper } = await query(
    `SELECT ep.*, e.name as exam_name, e.type as exam_type, e.max_marks,
            c.name as class_name, c.level, c.stream,
            s.name as subject_name, s.code as subject_code,
            u.first_name || ' ' || u.last_name as teacher_name
     FROM exam_papers ep
     JOIN exam_series e ON ep.exam_series_id = e.id
     JOIN classes c ON ep.class_id = c.id
     JOIN subjects s ON ep.subject_id = s.id
     LEFT JOIN users u ON ep.teacher_id = u.id
     WHERE ep.id = $1 AND ep.school_id = $2`,
    [id, req.schoolId]
  );
  if (paper.length === 0) return res.status(404).json({ error: 'Exam paper not found' });

  // Get students with their marks
  const { rows: students } = await query(
    `SELECT st.id, st.admission_number,
            st.first_name || ' ' || st.last_name as name,
            st.gender,
            sm.id as mark_id, sm.marks, sm.grade, sm.points, sm.is_absent, sm.remarks
     FROM students st
     LEFT JOIN student_marks sm ON sm.student_id = st.id AND sm.exam_paper_id = $1
     WHERE st.current_class_id = $2 AND st.is_active = true AND st.school_id = $3
     ORDER BY st.first_name, st.last_name`,
    [id, paper[0].class_id, req.schoolId]
  );

  res.json({ paper: paper[0], students });
};

const saveMarks = async (req, res) => {
  const { id: examPaperId } = req.params;
  const { marks } = req.body; // Array: [{studentId, marks, isAbsent, remarks}]

  if (!Array.isArray(marks)) return res.status(400).json({ error: 'marks must be an array' });

  // Verify paper exists and user has access
  const { rows: paper } = await query(
    'SELECT ep.*, e.max_marks FROM exam_papers ep JOIN exam_series e ON ep.exam_series_id=e.id WHERE ep.id=$1 AND ep.school_id=$2',
    [examPaperId, req.schoolId]
  );
  if (paper.length === 0) return res.status(404).json({ error: 'Paper not found' });
  if (paper[0].is_locked) return res.status(403).json({ error: 'This paper is locked and cannot be edited' });

  // Verify teacher has access (unless HOD/admin)
  const isAdmin = ['principal', 'deputy_principal', 'hod', 'school_admin'].includes(req.user.role);
  if (!isAdmin && paper[0].teacher_id !== req.user.id) {
    return res.status(403).json({ error: 'You are not the assigned teacher for this paper' });
  }

  // Get grading scale — school's default first, then built-in hardcoded fallback
  const { rows: scaleRows } = await query(
    `SELECT grades FROM grading_scales WHERE school_id=$1 AND is_default=true LIMIT 1`,
    [req.schoolId]
  );
  const gradeScale = (scaleRows[0]?.grades && scaleRows[0].grades.length)
    ? scaleRows[0].grades
    : [
        { grade:'A',  min_marks:75, max_marks:100, points:12 },
        { grade:'A-', min_marks:70, max_marks:74,  points:11 },
        { grade:'B+', min_marks:65, max_marks:69,  points:10 },
        { grade:'B',  min_marks:60, max_marks:64,  points:9  },
        { grade:'B-', min_marks:55, max_marks:59,  points:8  },
        { grade:'C+', min_marks:50, max_marks:54,  points:7  },
        { grade:'C',  min_marks:45, max_marks:49,  points:6  },
        { grade:'C-', min_marks:40, max_marks:44,  points:5  },
        { grade:'D+', min_marks:35, max_marks:39,  points:4  },
        { grade:'D',  min_marks:30, max_marks:34,  points:3  },
        { grade:'D-', min_marks:25, max_marks:29,  points:2  },
        { grade:'E',  min_marks:0,  max_marks:24,  points:1  },
      ];

  const applyGrade = (score, maxMarks) => {
    const pct = (score / maxMarks) * 100;
    for (const g of gradeScale) {
      if (pct >= parseFloat(g.min_marks) && pct <= parseFloat(g.max_marks))
        return { grade: g.grade, points: g.points };
    }
    return { grade: 'E', points: 1 };
  };

  await withTransaction(async (client) => {
    for (const m of marks) {
      const { studentId, marks: score, isAbsent, remarks } = m;
      let grade = null, points = null;

      if (!isAbsent && score !== null && score !== undefined) {
        const g = applyGrade(parseFloat(score), paper[0].max_marks);
        grade = g.grade;
        points = g.points;
      }

      await client.query(
        `INSERT INTO student_marks(exam_paper_id, student_id, school_id, marks, grade, points, is_absent, remarks, entered_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT(exam_paper_id, student_id) DO UPDATE SET
           marks=$4, grade=$5, points=$6, is_absent=$7, remarks=$8, entered_by=$9, updated_at=NOW()`,
        [examPaperId, studentId, req.schoolId, isAbsent ? null : score, grade, points, isAbsent || false, remarks, req.user.id]
      );
    }
  });

  res.json({ message: `${marks.length} marks saved successfully` });
};

// ── Submit / Approve Marks ────────────────────────────────────
const submitPaper = async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(
    'UPDATE exam_papers SET is_submitted=true, submitted_at=NOW() WHERE id=$1 AND school_id=$2 AND teacher_id=$3 RETURNING *',
    [id, req.schoolId, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Paper not found or access denied' });

  // Notify HOD
  const io = req.app.get('io');
  io?.to(`school-${req.schoolId}`).emit('paper-submitted', { paperId: id });

  res.json({ message: 'Marks submitted for approval', paper: rows[0] });
};

const approvePaper = async (req, res) => {
  const { id } = req.params;
  const { level } = req.body; // 'hod' or 'deputy'
  const role = req.user.role;

  let updateSql = '';
  if (level === 'hod' && ['hod', 'school_admin', 'principal'].includes(role)) {
    updateSql = 'hod_approved=true, hod_approved_at=NOW(), hod_approved_by=$3';
  } else if (level === 'deputy' && ['deputy_principal', 'principal', 'school_admin'].includes(role)) {
    updateSql = 'deputy_approved=true, deputy_approved_at=NOW(), deputy_approved_by=$3';
  } else {
    return res.status(403).json({ error: 'You do not have permission to approve at this level' });
  }

  const { rows } = await query(
    `UPDATE exam_papers SET ${updateSql} WHERE id=$1 AND school_id=$2 RETURNING *`,
    [id, req.schoolId, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Paper not found' });
  res.json({ message: `Marks ${level.toUpperCase()} approved`, paper: rows[0] });
};

const lockPaper = async (req, res) => {
  const { id } = req.params;
  if (!['principal', 'school_admin', 'deputy_principal'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Only principal or admin can lock marks' });
  }
  const { rows } = await query(
    'UPDATE exam_papers SET is_locked=true WHERE id=$1 AND school_id=$2 RETURNING *',
    [id, req.schoolId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Paper not found' });
  res.json({ message: 'Paper locked successfully' });
};

// ── Broadsheet ────────────────────────────────────────────────
const getBroadsheet = async (req, res) => {
  const { examSeriesId, classId } = req.query;

  if (!examSeriesId || !classId) {
    return res.status(400).json({ error: 'examSeriesId and classId are required' });
  }

  const cacheKey = `broadsheet:${examSeriesId}:${classId}`;
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  // Get all students in class
  const { rows: students } = await query(
    `SELECT id, admission_number, first_name || ' ' || last_name as name, gender
     FROM students WHERE current_class_id=$1 AND is_active=true AND school_id=$2
     ORDER BY first_name, last_name`,
    [classId, req.schoolId]
  );

  // Get all subjects and marks
  const { rows: marks } = await query(
    `SELECT sm.student_id, sm.marks, sm.grade, sm.points, sm.is_absent,
            s.id as subject_id, s.name as subject_name, s.code as subject_code,
            ep.max_marks
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id = ep.id
     JOIN subjects s ON ep.subject_id = s.id
     WHERE ep.exam_series_id = $1 AND ep.class_id = $2 AND sm.school_id = $3`,
    [examSeriesId, classId, req.schoolId]
  );

  // Get unique subjects
  const subjectsMap = {};
  marks.forEach(m => { subjectsMap[m.subject_id] = { id: m.subject_id, name: m.subject_name, code: m.subject_code, maxMarks: m.max_marks }; });
  const subjects = Object.values(subjectsMap).sort((a, b) => a.name.localeCompare(b.name));

  // Build broadsheet rows
  const broadsheet = students.map(student => {
    const studentMarks = marks.filter(m => m.student_id === student.id);
    const subjectScores = {};

    let totalMarks = 0, totalPoints = 0, subjectCount = 0;
    for (const m of studentMarks) {
      subjectScores[m.subject_id] = {
        marks: m.marks,
        grade: m.grade,
        points: m.points,
        isAbsent: m.is_absent,
      };
      if (!m.is_absent && m.marks !== null && !isNaN(parseFloat(m.marks))) {
        totalMarks += parseFloat(m.marks);
        totalPoints += parseFloat(m.points || 0);
        subjectCount++;
      }
    }

    const hasMarks = subjectCount > 0;
    const meanPoints = hasMarks ? (totalPoints / subjectCount).toFixed(2) : null;
    const meanGrade = hasMarks ? getMeanGrade(parseFloat(meanPoints)) : '—';

    // Normalised marks array so the frontend can do marks.find(x => x.subject_id === sub.id)
    const marksArray = Object.entries(subjectScores).map(([subjectId, m]) => ({
      subject_id: subjectId,
      marks: m.marks,
      grade: m.grade,
      points: m.points,
      is_absent: m.isAbsent,
    }));

    return {
      ...student,
      subjects: subjectScores,
      marks: marksArray,
      totalMarks: hasMarks ? totalMarks.toFixed(1) : '—',
      totalPoints: hasMarks ? totalPoints.toFixed(1) : '—',
      total_marks: hasMarks ? totalMarks.toFixed(1) : '—',
      meanPoints: meanPoints || '—',
      mean_marks: meanPoints || '—',
      mean_points: meanPoints || '—',
      meanGrade,
      mean_grade: meanGrade,
      subjectCount,
    };
  });

  // Calculate positions
  broadsheet.sort((a, b) => parseFloat(b.totalPoints) - parseFloat(a.totalPoints));
  broadsheet.forEach((s, i) => { s.position = i + 1; });

  // Subject statistics
  const subjectStats = subjects.map(sub => {
    const subMarks = marks.filter(m => m.subject_id === sub.id && !m.is_absent && m.marks !== null);
    const scores = subMarks.map(m => parseFloat(m.marks));
    const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    const max = scores.length > 0 ? Math.max(...scores) : 0;
    const min = scores.length > 0 ? Math.min(...scores) : 0;
    return { ...sub, average: avg, highest: max, lowest: min, candidateCount: scores.length };
  });

  const scoredStudents = broadsheet.filter(s => s.subjectCount > 0);
  const meanMarksVal = scoredStudents.length
    ? (scoredStudents.reduce((sum, s) => sum + parseFloat(s.totalMarks || 0), 0) /
       scoredStudents.reduce((sum, s) => sum + s.subjectCount, 0))
    : 0;
  const passCount = scoredStudents.filter(s => parseFloat(s.meanPoints || 0) >= 5.5).length;
  const highestVal = scoredStudents.length
    ? Math.max(...scoredStudents.map(s => parseFloat(s.totalMarks || 0)))
    : 0;

  const result = {
    examSeries: await query('SELECT name, type FROM exam_series WHERE id=$1', [examSeriesId]).then(r => r.rows[0]),
    class: await query('SELECT name, level, stream FROM classes WHERE id=$1', [classId]).then(r => r.rows[0]),
    subjects,
    broadsheet,
    students: broadsheet, // alias for frontend compatibility
    subjectStats,
    classStats: {
      totalStudents: students.length,
      meanScore: scoredStudents.length > 0
        ? (scoredStudents.reduce((sum, s) => sum + parseFloat(s.meanPoints || 0), 0) / scoredStudents.length).toFixed(2)
        : '0',
    },
    // Flat stats object matching frontend keys: stats.meanMarks / stats.passRate / stats.highest
    stats: {
      total: students.length,
      meanMarks: meanMarksVal.toFixed(1),
      passRate: students.length ? ((passCount / students.length) * 100).toFixed(1) : '0',
      highest: highestVal.toFixed(1),
    },
  };

  await cache.set(cacheKey, result, 300);
  res.json(result);
};

const getMeanGrade = (meanPoints) => {
  if (meanPoints >= 11.5) return 'A';
  if (meanPoints >= 10.5) return 'A-';
  if (meanPoints >= 9.5) return 'B+';
  if (meanPoints >= 8.5) return 'B';
  if (meanPoints >= 7.5) return 'B-';
  if (meanPoints >= 6.5) return 'C+';
  if (meanPoints >= 5.5) return 'C';
  if (meanPoints >= 4.5) return 'C-';
  if (meanPoints >= 3.5) return 'D+';
  if (meanPoints >= 2.5) return 'D';
  if (meanPoints >= 1.5) return 'D-';
  return 'E';
};

// ── Report Cards ──────────────────────────────────────────────
const getReportCard = async (req, res) => {
  const { studentId, examSeriesId } = req.query;

  const { rows: student } = await query(
    `SELECT s.*, c.name as class_name, c.level, c.stream,
            u.first_name || ' ' || u.last_name as class_teacher_name
     FROM students s
     LEFT JOIN classes c ON s.current_class_id = c.id
     LEFT JOIN users u ON c.class_teacher_id = u.id
     WHERE s.id = $1 AND s.school_id = $2`,
    [studentId, req.schoolId]
  );
  if (student.length === 0) return res.status(404).json({ error: 'Student not found' });

  const { rows: markRows } = await query(
    `SELECT sm.marks, sm.grade, sm.points, sm.is_absent, sm.remarks,
            s.name as subject_name, s.code, ep.max_marks,
            ep.is_submitted, ep.hod_approved, ep.deputy_approved
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id = ep.id
     JOIN subjects s ON ep.subject_id = s.id
     WHERE sm.student_id = $1 AND ep.exam_series_id = $2
     ORDER BY s.name`,
    [studentId, examSeriesId]
  );

  // Class position
  const { rows: posRows } = await query(
    `SELECT student_id,
            RANK() OVER (ORDER BY SUM(sm.points) DESC NULLS LAST) as position,
            COUNT(DISTINCT sm.student_id) OVER () as class_size
     FROM student_marks sm
     JOIN exam_papers ep ON sm.exam_paper_id = ep.id
     WHERE ep.exam_series_id = $1 AND ep.class_id = $2
     GROUP BY sm.student_id`,
    [examSeriesId, student[0].current_class_id]
  );

  const studentPos = posRows.find(p => p.student_id === studentId);

  // School info
  const { rows: school } = await query(
    'SELECT name, motto, logo_url, address, phone FROM schools WHERE id=$1',
    [req.schoolId]
  );

  res.json({
    school: school[0],
    student: student[0],
    marks: markRows,
    position: studentPos?.position || '-',
    classSize: studentPos?.class_size || 0,
    examSeries: await query('SELECT * FROM exam_series WHERE id=$1', [examSeriesId]).then(r => r.rows[0]),
  });
};

module.exports = {
  getClasses, createClass, updateClass,
  getSubjects, createSubject,
  getExamSeries, createExamSeries,
  getExamPaper, saveMarks,
  submitPaper, approvePaper, lockPaper,
  getBroadsheet, getReportCard,
};
